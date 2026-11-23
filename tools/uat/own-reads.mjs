#!/usr/bin/env node
/* Does the page read its own chain through its own provider, whatever the wallet is doing? (#403)
 *
 * The rule: every read of the chain the document was built for goes through the page's read provider,
 * and the wallet's provider is asked for the accounts, the chain it is on, a send, the `load older`
 * press and the "mine" scan — nothing else. `test/wallet-allowlist.test.mjs` reads that off the source;
 * this measures it in a browser, where the three sites that broke it were each found by a real wallet
 * and by none of the drivers.
 *
 * Four cases, chosen because each is a wallet state that used to change what the page could do:
 *
 *   hostile      a wallet that answers `eth_accounts` and `eth_chainId` and **refuses every other
 *                method**. Every screen must still paint in full. This is the Product Owner's Base
 *                Sepolia failure taken to its limit, and before #403 it took the funds block, the
 *                clock and the docs demo with it.
 *   wrongchain   a wallet **installed, not connected, on another chain** — his second finding. The
 *                docs demo must show the distribution's table, not `wallet is on …`.
 *   present      the same wallet, on this chain, answering normally. Here the figure matters rather
 *                than the paint: how many requests reach **our** endpoint per first paint, which is
 *                what moving eighteen `call()` sites onto it changes.
 *   nowallet     no `window.ethereum` at all — the control. Anything the three cases above paint
 *                differently from this one is a wallet changing a read, which is the thing #403 says
 *                cannot happen.
 *
 * Usage:
 *   node tools/uat/own-reads.mjs [--chain 84532] [--case all|hostile|wrongchain|present|nowallet]
 *                               [--addr <distribution>] [--patience 35000] [--keep]
 *
 * Exit: 0 when every case painted what it must and the wallet was asked only what it may,
 *       1 on any failure, 2 on a usage or build error.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join, extname } from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EXEC = process.env.RAKE_UAT_CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`;
const DNZN = '0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes(`--${k}`);

const chain = Number(arg('chain', 84532));
const addr = arg('addr', DNZN);
const patience = Number(arg('patience', 35_000));
const only = arg('case', 'all');
const CASES = ['hostile', 'wrongchain', 'present', 'nowallet'];
const cases = only === 'all' ? CASES : [only];
for (const c of cases) if (!CASES.includes(c)) { console.error(`own-reads: --case must be all or one of ${CASES.join(', ')}`); process.exit(2); }
if (!existsSync(EXEC)) { console.error(`own-reads: no browser at ${EXEC}`); process.exit(2); }

/* ── build, and prove the artefact is the chain that was asked for ─────────────────────────────── */

process.stderr.write(`· chain ${chain}: building the document from this branch\n`);
const built = spawnSync('make', ['dapp-nodev', `CHAIN_ID=${chain}`], { cwd: ROOT, encoding: 'utf8' });
if (built.status !== 0) {
  console.error(`own-reads: build failed — ${(built.stderr || built.stdout || '').trim().split('\n').pop()}`);
  process.exit(2);
}
const dir = mkdtempSync(join(os.tmpdir(), 'rake-own-reads-'));
const doc = readFileSync(join(ROOT, 'app/dist/index.html'), 'utf8');
const idIn = (/chainId: *'?(\d+)'?/.exec(doc) || [])[1];
if (Number(idIn) !== chain) {
  console.error(`own-reads: the build says chainId ${idIn}, not ${chain} — something rebuilt app/dist underneath this run`);
  process.exit(2);
}
writeFileSync(join(dir, 'index.html'), doc);
const widget = join(ROOT, 'app/dist/widget.js');
if (existsSync(widget)) writeFileSync(join(dir, 'widget.js'), readFileSync(widget));
const pageRpc = ((doc.match(/const PUBLIC_RPC = \{[^}]*\}/) || [])[0] || '').match(new RegExp(`\\b${chain}: '(https?://[^']+)'`));
const OUR = pageRpc ? pageRpc[1] : null;
if (!OUR) { console.error(`own-reads: no PUBLIC_RPC entry for chain ${chain} in the build`); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const srv = createServer((q, res) => {
  const p = (q.url || '/').split('?')[0].split('#')[0];
  const f = join(dir, p === '/' ? 'index.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const browser = await chromium.launch({ executablePath: EXEC, headless: true });

/* ── one case ─────────────────────────────────────────────────────────────────────────────────── */

/** `kind` decides what the injected provider does. `null` means no provider at all. */
async function run(kind) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const describeErr = e => {
    if (e instanceof Error || (e && e.stack)) return String(e.message || e).slice(0, 200);
    try { return JSON.stringify(e).slice(0, 200); } catch { return Object.prototype.toString.call(e); }
  };
  page.on('pageerror', e => errors.push('pageerror: ' + describeErr(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.exposeFunction('__unhandled', w => errors.push('unhandledrejection: ' + w));
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', ev => { try { window.__unhandled(String((ev.reason && ev.reason.message) || JSON.stringify(ev.reason))); } catch (e) {} });
  });

  let ours = 0;
  page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).host === new URL(OUR).host) ours++; });

  const asked = [];
  if (kind) {
    const walletChain = kind === 'wrongchain' ? (chain === 84532 ? '0xaa36a7' : '0x14a34') : '0x' + chain.toString(16);
    await page.exposeFunction('__w', async (method, params) => {
      asked.push(method);
      if (method === 'eth_chainId') return walletChain;
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [];   // never connected
      /* `hostile` is the limit case: a wallet that serves its own two answers and nothing else, which
         is what a rate-limited endpoint amounts to from the page's side. `present` relays to our own
         endpoint so the figure below is about volume rather than about a second endpoint's quirks. */
      if (kind === 'hostile' || kind === 'wrongchain') throw { code: 4100, message: 'this wallet serves only accounts and chainId' };
      const res = await fetch(OUR, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const body = await res.json().catch(() => null);
      if (body && body.error) { const e = new Error(body.error.message); e.code = body.error.code; throw e; }
      if (!res.ok || !body || body.result === undefined) throw { message: `HTTP ${res.status}` };
      return body.result;
    });
    await page.addInitScript(() => {
      window.ethereum = { isMetaMask: true, request: a => window.__w(a && a.method, (a && a.params) || []), on: () => {}, removeListener: () => {} };
    });
  }

  const base = `http://127.0.0.1:${port}/index.html`;
  // The landing first, then a distribution, then the docs: the three screens the clause names.
  await page.goto(base + '#/', { waitUntil: 'load' });
  await page.waitForTimeout(Math.round(patience * 0.4));
  const landing = await page.evaluate(() => ({
    featured: !!document.querySelector('#featured .rw, #featured .wbar, #wdg'),
    text: (document.getElementById('view')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    bar: (document.getElementById('chainbar')?.innerText || '').replace(/\s+/g, ' ').trim(),
  }));
  const firstPaint = ours;

  await page.goto(`${base}#/distros/${addr}`, { waitUntil: 'load' });
  await page.waitForTimeout(patience);
  const distro = await page.evaluate(() => {
    const t = id => (document.getElementById(id)?.innerText || '').replace(/\s+/g, ' ').trim();
    return { funds: t('funds'), changes: t('h-changes').slice(0, 70), activity: t('h-funds').slice(0, 70),
             rows: document.querySelectorAll('#view .row').length,   // `row()` in the page builds every table line as .row
             distribute: [...document.querySelectorAll('button')].filter(x => /^distribute$/i.test(x.textContent.trim())).length };
  });

  await page.goto(base + '#/docs#widget', { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  await page.fill('#wd-in', addr).catch(() => {});
  await page.click('#wd-go').catch(() => {});
  await page.waitForTimeout(12000);
  const docs = await page.evaluate(() => {
    const t = id => (document.getElementById(id)?.innerText || '').replace(/\s+/g, ' ').trim();
    return { full: t('wd-full'), compact: t('wd-compact'), res: t('wd-res') };
  });

  await ctx.close();
  return { kind: kind || 'nowallet', asked, ours, firstPaint, landing, distro, docs, errors };
}

/* ── report ───────────────────────────────────────────────────────────────────────────────────── */

const WALLET_MAY = new Set(['eth_accounts', 'eth_requestAccounts', 'eth_chainId']);
const results = [];
for (const c of cases) {
  process.stderr.write(`· case ${c}\n`);
  results.push(await run(c === 'nowallet' ? null : c));
}
await browser.close();
srv.close();

let bad = 0;
console.log(`\n  chain ${chain} · our endpoint ${OUR}\n`);
for (const r of results) {
  const extra = r.asked.filter(m => !WALLET_MAY.has(m));
  const fails = [];
  /* On first paint the wallet may be asked for its accounts and its chain and nothing else — the
     clause's own words. Any other method is a read that belongs to our endpoint. */
  if (extra.length) fails.push(`the wallet was asked ${[...new Set(extra)].join(', ')}`);
  if (!r.landing.featured) fails.push('the landing painted no featured widget');
  if (/history unavailable/.test(r.distro.changes + r.distro.activity)) fails.push('a history section read `history unavailable`');
  if (!/distribute/.test(r.distro.funds)) fails.push('the funds block offered no distribute');
  if (!r.distro.rows) fails.push('the distribution painted no table rows');
  if (!/%/.test(r.docs.full)) fails.push(`the docs demo did not show a table: ${r.docs.full.slice(0, 60)}`);
  if (/wallet is on/.test(r.docs.full + r.docs.compact)) fails.push('the docs demo blamed the wallet');
  if (r.errors.length) fails.push(`page errors: ${r.errors.join(' | ')}`);

  console.log(`  ${r.kind.padEnd(11)} wallet asked: ${[...new Set(r.asked)].join(', ') || 'nothing'}`);
  console.log(`              our endpoint: ${r.ours} requests (${r.firstPaint} by the landing's first paint)`);
  console.log(`              table rows ${r.distro.rows} · distribute ${r.distro.distribute} · docs demo ${r.docs.full.slice(0, 54) || '(empty)'}`);
  if (r.landing.bar) console.log(`              chain bar: ${r.landing.bar.slice(0, 100)}`);
  console.log(`              ${fails.length ? 'FAIL — ' + fails.join('; ') : 'ok'}\n`);
  if (fails.length) bad++;
}
if (flag('keep')) console.log(`  served from ${dir}`);
console.log(`  verdict: ${bad ? `${bad} of ${results.length} cases failed` : `all ${results.length} cases read their own chain through their own provider`}`);
process.exit(bad ? 1 : 0);
