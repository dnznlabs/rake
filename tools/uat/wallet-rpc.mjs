#!/usr/bin/env node
/* The run that would have caught #400: a wallet whose endpoint is **worse than the page's**.
 *
 * Every driver here has so far pointed its injected provider at the chain's *good* endpoint — the
 * same `PUBLIC_RPC` entry the page reads — so a wallet could never make the page worse, and the one
 * failure that mattered was invisible to all of them. The Product Owner found it by connecting a real
 * wallet on Base Sepolia: its default endpoint is `sepolia.base.org`, which serves 200 blocks a log
 * query at 25 requests a second, and all three sections read `history unavailable` while the header
 * said `waiting to distribute`.
 *
 * So this driver injects a provider that relays to the **wallet's** default endpoint while the page
 * keeps its own, which is the asymmetry the real report had and no test fixture can measure.
 *
 * `--pre-400` serves the same build with one substitution — the first history read routed back
 * through the wallet, as the page did before #400 — so the two runs differ in exactly that line and
 * nothing else. A fix measured only in its fixed state is a claim; the pair is a measurement.
 *
 * Usage:
 *   node tools/uat/wallet-rpc.mjs [--chain 84532] [--wallet-rpc <url>] [--pre-400]
 *                                 [--patience 45000] [--addr <distribution>] [--keep]
 *
 * Exit: 0 when no section reads `history unavailable` and a `distribute` control is present,
 *       1 when either fails, 2 on a usage or build error. With `--pre-400`, 1 is the expected
 *       outcome and is reported as such — the driver says which result it was asked for.
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
/* The DNZN distribution, at the same address on every chain. */
const DNZN = '0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199';
/* What a wallet actually uses on each chain, which is not what the page uses.
   84532 is the measured one and the reason this file exists: `sepolia.base.org` is the endpoint in
   Base's own network entry, the one a wallet adds for you, and `docs/.../rpc-depth.md` has its
   200-block cap. The others are each chain's published endpoint; a wallet pointed somewhere else is
   `--wallet-rpc`'s business, and chain 1 has no public default worth naming, so it has none here. */
const WALLET_RPC = {
  84532: 'https://sepolia.base.org',
  8453: 'https://mainnet.base.org',
  /* Not `rpc.sepolia.org`, which answers a 404 HTML page to `eth_blockNumber` and is no endpoint at
     all — it produced a page that painted nothing and a verdict of "the wallet made the page worse",
     which was a statement about my table. `1rpc.io/sepolia` is real, narrow in the way a wallet's
     default is narrow (50 blocks a query, see `rpc-depth.md`), and answers. */
  11155111: 'https://1rpc.io/sepolia',
};
/* The page's first history read, before and after #400. `--pre-400` applies the reverse substitution
   to the built artefact, so the comparison is one line of the shipped document and nothing else. */
const FIRST_READ = 'history(addr, from, hi, pageRead())';
const FIRST_READ_PRE = 'history(addr, from, hi, P)';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes(`--${k}`);

const chain = Number(arg('chain', 84532));
const walletRpc = arg('wallet-rpc', WALLET_RPC[chain]);
const patience = Number(arg('patience', 45_000));
const addr = arg('addr', DNZN);
const pre400 = flag('pre-400');

if (!walletRpc) {
  console.error(`wallet-rpc: no wallet-default endpoint known for chain ${chain} — pass --wallet-rpc <url>`);
  process.exit(2);
}
if (!existsSync(EXEC)) {
  console.error(`wallet-rpc: no browser at ${EXEC} — "npx playwright install chromium", or set RAKE_UAT_CHROME.`);
  process.exit(2);
}

/* **The endpoint is probed before anything is driven.** A URL that is not an endpoint produces a page
   that paints nothing, and a run that then reports "the wallet made the page worse" — a verdict about
   the document, from a dead instrument. `rpc.sepolia.org` did exactly this: it answers a 404 HTML
   page. The probe is `eth_blockNumber`, which every endpoint serves. */
{
  let head = null, why = '';
  try {
    const res = await fetch(walletRpc, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    try { head = JSON.parse(body).result; } catch { why = `not JSON: ${body.slice(0, 80).replace(/\s+/g, ' ')}`; }
    if (!head && !why) why = `HTTP ${res.status}: ${body.slice(0, 120)}`;
  } catch (e) { why = String((e && e.message) || e); }
  if (!head) {
    console.error(`wallet-rpc: ${walletRpc} does not answer eth_blockNumber — ${why}`);
    console.error('  nothing read through it would mean anything, so this run makes no claim.');
    process.exit(2);
  }
  process.stderr.write(`· wallet endpoint ${walletRpc} is at block ${Number(head).toLocaleString('en-US')}\n`);
}

/* ── build, and prove the artefact is the chain that was asked for ─────────────────────────────── */

process.stderr.write(`· chain ${chain}: building the document from this branch\n`);
const built = spawnSync('make', ['dapp-nodev', `CHAIN_ID=${chain}`], { cwd: ROOT, encoding: 'utf8' });
if (built.status !== 0) {
  console.error(`wallet-rpc: build failed — ${(built.stderr || built.stdout || '').trim().split('\n').pop()}`);
  process.exit(2);
}
const dir = mkdtempSync(join(os.tmpdir(), 'rake-wallet-rpc-'));
let doc = readFileSync(join(ROOT, 'app/dist/index.html'), 'utf8');

/* **The copy is checked, not the build.** Another test file rebuilding `app/dist` for a different
   chain as a side effect once had me serve a Sepolia document behind a Base Sepolia provider and read
   the result as a regression. The chain id is asserted in the bytes about to be served. */
const idIn = (/chainId: *'?(\d+)'?/.exec(doc) || [])[1];
if (Number(idIn) !== chain) {
  console.error(`wallet-rpc: the build says chainId ${idIn}, not ${chain} — something rebuilt app/dist underneath this run`);
  process.exit(2);
}
if (pre400) {
  if (!doc.includes(FIRST_READ)) {
    console.error(`wallet-rpc: --pre-400 cannot find \`${FIRST_READ}\` in the build; the page has moved on and this driver must move with it`);
    process.exit(2);
  }
  doc = doc.replace(FIRST_READ, FIRST_READ_PRE);
  process.stderr.write('  --pre-400: the first history read routed back through the wallet\n');
}
writeFileSync(join(dir, 'index.html'), doc);
const widget = join(ROOT, 'app/dist/widget.js');
if (existsSync(widget)) writeFileSync(join(dir, 'widget.js'), readFileSync(widget));

const rpcTable = (doc.match(/const PUBLIC_RPC = \{[^}]*\}/) || [])[0] || '';
const pageRpc = (rpcTable.match(new RegExp(`\\b${chain}: '(https?://[^']+)'`)) || [])[1] || '(unread)';

/* ── serve it, and relay the wallet's reads to the wallet's endpoint ───────────────────────────── */

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
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String((e && e.message) || e).slice(0, 160)));

/* The page's own traffic, counted at the browser: whatever it sends to its own endpoint is a request
   the wallet did not serve, which is the whole point of #400. */
let pageReqs = 0;
page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).host === new URL(pageRpc).host) pageReqs++; });

const wallet = { total: 0, byMethod: new Map(), logs: 0, refused: 0, first: null, widest: 0 };
await page.exposeFunction('__walletRpc', async (method, params) => {
  wallet.total++;
  wallet.byMethod.set(method, (wallet.byMethod.get(method) || 0) + 1);
  if (method === 'eth_chainId') return '0x' + chain.toString(16);
  /* No account: the read path is what #400 is about, and a connected account would add writes this
     run has no business making. `window.ethereum` existing is what makes the page's `WALLET` true,
     and `P` the injected provider — which is the condition under test. */
  if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [];
  if (method === 'eth_getLogs') {
    wallet.logs++;
    const f = params[0] || {};
    const span = parseInt(f.toBlock, 16) - parseInt(f.fromBlock, 16) + 1;
    if (Number.isFinite(span)) wallet.widest = Math.max(wallet.widest, span);
  }
  const res = await fetch(walletRpc, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await res.json().catch(() => null);
  if (body && body.error) {
    if (method === 'eth_getLogs') { wallet.refused++; wallet.first ||= `${body.error.code}: ${String(body.error.message).slice(0, 120)}`; }
    const e = new Error(body.error.message); e.code = body.error.code; e.data = body.error.data;
    throw e;
  }
  if (!res.ok || !body || body.result === undefined) {
    if (method === 'eth_getLogs') { wallet.refused++; wallet.first ||= `HTTP ${res.status}`; }
    throw { message: `HTTP ${res.status}`, data: { httpStatus: res.status } };
  }
  return body.result;
});
await page.addInitScript(() => {
  window.ethereum = { isMetaMask: true, _uat: true, request: args => window.__walletRpc(args && args.method, (args && args.params) || []), on: () => {}, removeListener: () => {} };
});

await page.goto(`http://127.0.0.1:${port}/index.html#/distros/${addr}`, { waitUntil: 'load' });
await page.waitForTimeout(patience);

const out = await page.evaluate(() => {
  const txt = id => (document.getElementById(id)?.innerText || '').replace(/\s+/g, ' ').trim();
  return {
    changes: txt('h-changes'),
    activity: txt('h-funds'),
    funds: txt('funds'),
    heads: [...document.querySelectorAll('.sechead span')].map(s => s.innerText.trim()),
    distribute: [...document.querySelectorAll('button')].filter(x => /^distribute$/i.test(x.textContent.trim())).length,
    older: [...document.querySelectorAll('button.older')].length,
  };
});

/* ── report ────────────────────────────────────────────────────────────────────────────────────── */

/* A page that painted no section at all has not failed the history read — it has not got as far as
   one, and reading that as a verdict would be reading a dead instrument. The boot burst goes through
   the injected provider, so an endpoint too slow or too strict for it stops the page before anything
   #400 is about. Reported as a usage failure, not as a result. */
if (out.heads.length === 0 && !out.changes && !out.activity && !out.funds) {
  console.error(`\nwallet-rpc: the page painted nothing at all through ${walletRpc} in ${patience} ms`);
  console.error(`  requests it served: ${wallet.total} (${[...wallet.byMethod].map(([m, n]) => `${m} ${n}`).join(', ') || 'none'})`);
  console.error(`  page errors: ${errors.join(' | ') || 'none'}`);
  console.error('  the boot reads go through the wallet too, so this says the endpoint could not boot');
  console.error('  the document — not that the history read failed. No verdict. Try --patience, or another endpoint.');
  await ctx.close(); await browser.close(); srv.close();
  process.exit(2);
}

const unavailable = ['changes', 'activity'].filter(k => /history unavailable/.test(out[k]));
const byMethod = [...wallet.byMethod].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${n}`).join(', ');
const ok = unavailable.length === 0 && out.distribute > 0;

console.log(`\n  chain                : ${chain}${pre400 ? '   (--pre-400: the first read routed through the wallet)' : ''}`);
console.log(`  page endpoint        : ${pageRpc}`);
console.log(`  wallet endpoint      : ${walletRpc}`);
console.log(`  requests to the page : ${pageReqs}`);
console.log(`  requests to the walletendpoint : ${wallet.total}${byMethod ? ` (${byMethod})` : ''}`);
console.log(`  eth_getLogs at it    : ${wallet.logs}, refused ${wallet.refused}${wallet.first ? ` — first: ${wallet.first}` : ''}`);
if (wallet.widest) console.log(`  widest span asked of it: ${wallet.widest.toLocaleString('en-US')} blocks`);
console.log(`  section heads        : ${out.heads.join(' | ') || '(none)'}`);
console.log(`  changes              : ${out.changes.slice(0, 90)}`);
console.log(`  activity             : ${out.activity.slice(0, 90)}`);
console.log(`  history unavailable  : ${unavailable.length ? unavailable.join(', ') : 'none'}`);
console.log(`  DISTRIBUTE buttons   : ${out.distribute}`);
console.log(`  load older presses   : ${out.older}`);
console.log(`  claims a 24h window  : ${/covers the last 24 hours/.test(out.funds)}`);
console.log(`  funds block          : ${out.funds.slice(0, 200)}`);
if (errors.length) console.log(`  page errors          : ${errors.join(' | ')}`);
console.log(`\n  verdict              : ${ok ? 'the wallet did not make the page worse' : 'the wallet made the page worse'}`
  + `${pre400 ? ` — and with --pre-400 that is the expected result` : ''}`);
if (flag('keep')) console.log(`  served from          : ${dir}`);

await ctx.close();
await browser.close();
srv.close();
process.exit(ok ? 0 : 1);
