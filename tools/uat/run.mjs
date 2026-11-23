#!/usr/bin/env node
/* m05-t01c step 9a: the UAT rows that are about the page, as assertions.

   Usage: node run.mjs --chain 11155111 [--control] [--base https://rake.dnzn.dev] [--shots <dir>]
   Exits non-zero on the first missed assertion or any page error. A row's screenshot is written
   only after its assertions have passed, so a PNG under `shots/` is a claim the row made good.
   `--control` drives row (c) at an address with no code and requires the run to FAIL: a driver that
   cannot fail has shown nothing. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PAGE_SCRIPT, makeRpc, castCall, castSend, payIn, CAST } from './provider.mjs';
import * as W from './writes.mjs';
import { check } from './selftest.mjs';
import * as R from './rows.mjs';
const COUNT_JS = fs.readFileSync(new URL('../../docs/milestones/m04/tasks/m04-t05/count.js', import.meta.url), 'utf8');

/* `rpc` is the page's own `PUBLIC_RPC` entry for that chain, not a favourite of mine: the injected
   provider has to read what the page reads, or the run measures the endpoint rather than the
   document. **Both changed in m05-t01d step 5**, measured rather than chosen — 84532 from
   `sepolia.base.org`, whose 200-block window is #382, and 11155111 from publicnode, which serves
   10,000 blocks of depth against Tenderly's 5,000,000. If `PUBLIC_RPC` moves again, these move with
   it; a mismatch here makes every history row a measurement of the wrong endpoint. */
const CHAINS = {
  11155111: { name: 'sepolia', rpc: 'https://sepolia.gateway.tenderly.co', receiver: '0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95' },
  84532: { name: 'base sepolia', rpc: 'https://base-sepolia-rpc.publicnode.com', receiver: '0x869DFe837B8dB2819027E53d75C20bE31f13acD2' },
};
const EXEC = process.env.RAKE_UAT_CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`;
/* `cast` is the caller's to provide now that it comes from `PATH`, so say so once here rather than
   let a row fail with `spawn cast ENOENT` two minutes in. */
{
  const { status } = spawnSync(CAST, ['--version'], { stdio: 'ignore' });
  if (status !== 0) {
    console.error(`run.mjs: no working "${CAST}" on PATH — put foundry's bin on PATH, or set RAKE_UAT_CAST to the binary.`);
    process.exit(2);
  }
}

if (!fs.existsSync(EXEC)) {
  console.error(`run.mjs: no browser at ${EXEC} — install the one this playwright-core expects with "npx playwright install chromium", or set RAKE_UAT_CHROME to its path.`);
  process.exit(2);
}
const CODELESS = '0x00000000000000000000000000000000000000f1';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes(`--${k}`);

/* The patterns the page compiles are checked before anything is driven: one of them once shipped
   matching a literal backslash, which left a row unable to fail. */
{
  const { bad, total } = check({ quiet: true });
  if (bad) { console.error(`run.mjs: ${bad} of ${total} patterns do not do their job — run node selftest.mjs`); process.exit(2); }
  console.log(`patterns: ${total} checked, all live`);
}

const chainId = Number(arg('chain'));
const chain = CHAINS[chainId];
if (!chain) { console.error(`run.mjs: --chain must be one of ${Object.keys(CHAINS).join(', ')}`); process.exit(2); }
const base = (arg('base', 'https://rake.dnzn.dev')).replace(/\/$/, '') + `/${chainId}/`;
const control = flag('control');
const shotsDir = arg('shots', path.resolve('../../docs/milestones/m04/tasks/m04-t05/shots', control ? 'control' : String(chainId)));

/* `--rows` runs a named subset. It existed because **84532's history rows could not pass while #382
   stood** — rake#383 amended step 9a to run (a), (l), (w3) and the probe there and record the rest as
   not met with that cause. **m05-t01d removes that reason**: 84532 reads through
   `base-sepolia-rpc.publicnode.com` at 50,000-block windows, and a refusal that does arrive is a
   boundary line rather than a dead section, so `--chain 84532` runs the full list like any other
   chain. The flag stays for driving one row while working on it. A subset invocation names itself in
   the summary, so a reader can see which rows ran rather than inferring it from a count. */
const ROWS = ['probe', 'a', 'c', 'c-console-first', 'e', 'd', 'k', 'l', 'f', 'g', 'h', 'i', 'j', 'a-nowallet', 'w3'];
const only = (arg('rows', '') || '').split(',').map(s => s.trim()).filter(Boolean);
for (const id of only) if (!ROWS.includes(id)) { console.error(`run.mjs: --rows names ${id}, which is not a row (${ROWS.join(', ')})`); process.exit(2); }
const want = id => only.length === 0 || only.includes(id);
const skipped = [];
const pending = [];

const results = [];
let failed = null;

/* Viewport captures, neither scaled nor split (the architect's ruling, 2026-11-22, in rake#381): the
   assertion is the evidence and the screenshot is illustration. A full-page `#/docs` is 1.3 MB, well
   over the plan's 300 KB; a viewport shot is under it on every row. */
/* The figures a reader of the run should not have to take on trust — row (e)'s boundaries above all,
   which is the row whose assertion was dead until the architect caught it. */
const brief = (id, f) => {
  if (!f) return '';
  if (id === 'e') return f.shown
    ? ` · boundary ${f.boundaryBefore} → ${f.boundaryAfter}, eth_getLogs ${f.logsBefore} → ${f.logsAfter} (+${f.delta}), older controls ${f.olderControlsBefore} → ${f.olderControlsAfter}`
    : ` · ${f.note}`;
  if (id === 'c') return ` · painted in ${f.msToPainted} ms, owner bar: the ${f.relation ? f.relation.expect : '?'} branch`;
  if (id === 'c-console-first' || id === 'd') return ` · chainId ${f.chainId}, head ${f.head}, eth_getLogs ${f.eth_getLogs}, ${f.msToPainted} ms, firstLoad ${f.firstLoad}`;
  if (id === 'f') return ` · ${f.addr} at salt #${f.salt}${f.reused ? ' (reused)' : ''}`;
  if (id === 'g') return ` · pay-in ${f.payInTx?.slice(0, 12)}…, distribute in block ${f.distributeBlock}${f.receiverResetTx ? ', receiver put back to refusing' : ''}`;
  if (id === 'h') return ` · setAccepting ${f.setAcceptingTx?.slice(0, 12)}…, release in block ${f.releaseBlock}`;
  if (id === 'i') return ` · ${f.applyState}`;
  if (id === 'j') return ` · ${f.addr} at salt #${f.salt}, ${f.branch} branch, ${f.calldataBytes} bytes, selector ${f.selector}`;
  if (id === 'l') return ` · ${f.ids?.length} sections, rail ${f.rail?.length}`;
  return '';
};

const shot = async (page, name) => {
  if (control) return null;
  fs.mkdirSync(shotsDir, { recursive: true });
  const file = path.join(shotsDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const bytes = fs.statSync(file).size;
  if (bytes > 300 * 1024) throw new Error(`${name}.png is ${bytes} bytes, over the 300 KB the plan sets`);
  return { file: path.relative(process.cwd(), file), bytes };
};

const row = async (id, fn, page, shotName) => {
  if (!want(id)) { skipped.push(id); console.log(`row ${id} … skipped (not in --rows)`); return null; }
  process.stdout.write(`row ${id} … `);
  let facts;
  try { facts = await fn(); } catch (e) { e.row = e.row || id; throw e; }
  const png = shotName ? await shot(page, shotName) : null;
  /* A row that reports itself pending has not run: it goes in its own list, so `rowsRun` cannot be
     read as "these rows were driven" when one of them was only inspected (the architect's finding
     on rake#384, row (k)). */
  if (facts && facts.pending) { pending.push(id); console.log(`pending — ${facts.why}`); return facts; }
  results.push({ row: id, facts, png });
  console.log(`ok${png ? ` · ${png.bytes} B` : ''}${brief(id, facts)}`);
  return facts;
};

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
try {
  /* ---- the wallet pass ---------------------------------------------------------------------- */
  const methods = [];
  const { rpc, sent } = makeRpc({ chainId, rpcUrl: chain.rpc, sender: R.ENGINEER, log: m => methods.push(m) });
  /* Clipboard permission so row (j) exercises the branch a reader on an https origin takes, rather
     than only the textarea fallback (`app/src/index.html:402`). Both branches are accepted. */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.exposeFunction('__uatRpc', (method, params) => rpc(method, params));
  await ctx.addInitScript(PAGE_SCRIPT);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message || e)));
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(5000);

  await row('probe', () => R.probe(page, { base }), page, 'probe');
  await row('a', () => R.rowA(page, { chainName: chain.name, wallet: true }), page, 'a-landing');
  /* The instrument goes on before the route is opened, which is where `count.js` says it belongs. */
  if (want('c') || want('c-console-first') || want('d') || want('e')) await R.countOn(page, COUNT_JS);
  /* The control's patience is short on purpose: it is proving the driver fails, not waiting out a
     page that cannot paint. The real run keeps `count.js`'s own 120 s. */
  const relation = (control || !want('c')) ? null : await R.ownerRelation({ addr: R.DNZN, connected: R.ENGINEER, rpcUrl: chain.rpc, castCall });
  if (relation) console.log(`   (c)'s owner relation from the chain: owner ${relation.owner}, contract ${relation.isContract}, signer ${relation.signer} → expect the ${relation.expect} bar)`);
  await row('c', () => R.rowC(page, { base, addr: control ? CODELESS : R.DNZN, patience: control ? 20000 : 120000, relation }), page, 'c-distro');
  await row('c-console-first', async () => {
    const fig = R.truthy('c', 'count.js reported a figure', await R.uatFigure(page));
    R.eq('c', 'the chain count.js saw', fig.chainId, chainId);
    R.eq('c', 'firstLoad on the first load', fig.firstLoad, true);
    return fig;
  }, page, 'c-console-first');
  await row('e', () => R.rowE(page), page, 'e-older');
  await row('d', () => R.rowD(page, { base, src: COUNT_JS }), page, 'd-console-second');
  /* Row (k) is Sepolia's by the script's own wording, and it is pending rather than driveable. */
  if (chainId === 11155111) await row('k', () => R.rowK({ readFile: f => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8') }), null, null);
  else skipped.push('k (Sepolia only by the script)');
  await row('l', async () => {
    const facts = await R.rowL(page, { base, chainId, shot: async name => { await shot(page, name); } });
    return facts;
  }, page, 'l-docs-widget');

  /* ---- the writes --------------------------------------------------------------------------- */
  /* Ascending by address on both chains, which `BadTable` requires: the UAT wallet, the engineer,
     then the chain's receiver. The receiver refuses ETH until row (h) tells it not to, which is what
     makes row (g)'s third share escrow. */
  const table = pct => [
    { name: 'uat', note: 'the product owner', addr: R.UAT_WALLET, pct: pct[0] },
    { name: 'engineer', note: 'the engineer', addr: R.ENGINEER, pct: pct[1] },
    { name: 'receiver', note: 'refuses until told not to', addr: chain.receiver, pct: pct[2] },
  ];
  let made = null;
  if (flag('reads-only') || !(want('f') || want('g') || want('h') || want('i') || want('j'))) {
    for (const id of ['f', 'g', 'h', 'i', 'j']) if (!skipped.includes(id)) skipped.push(id);
  } else {
    /* `--reuse <addr>` drives (g) to (i) against a distribution an earlier run created, so iterating
       on those rows costs no gas and no new contract. The committed run takes (f) for real. */
    const reuse = arg('reuse', null);
    if (reuse) {
      made = { addr: reuse, salt: null, reused: true };
      await page.evaluate(a => { location.hash = '#/distros/' + a; }, reuse);
      await R.waitPainted(page, 180000);
      console.log(`row f … reused ${reuse}`);
    } else made = await row('f', () => W.rowF(page, { base, owner: R.ENGINEER, delay: '60', desc: 'm05-t01c driver UAT', rows: table([40, 30, 30]) }), page, 'f-created');
    await row('g', () => W.rowG(page, { addr: made.addr, payIn, rpcUrl: chain.rpc, receiver: chain.receiver, castCall, castSend, sender: R.ENGINEER }), page, 'g-distributed');
    await row('h', () => W.rowH(page, { receiver: chain.receiver, castSend, castCall, rpcUrl: chain.rpc, sender: R.ENGINEER }), page, 'h-released');
    await row('i', () => W.rowI(page, { rows: table([41, 29, 30]) }), page, 'i-applied');
    await row('j', () => W.rowJ(page, { base, vault: R.VAULT, rows: table([50, 50, 0]).slice(0, 2).map((r, i) => ({ ...r, pct: 50 })), sent }), page, 'j-calldata');
  }

  /* ---- the no-wallet pass ------------------------------------------------------------------- */
  const bare = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const bp = await bare.newPage();
  bp.on('pageerror', e => pageErrors.push(String(e.message || e)));
  await bp.goto(base, { waitUntil: 'load', timeout: 90000 });
  await bp.waitForTimeout(5000);
  await row('a-nowallet', () => R.rowA(bp, { chainName: chain.name, wallet: false }), bp, 'a-landing-nowallet');
  await row('w3', () => R.rowW3(bp, { chainName: chain.name }), bp, 'w3-netname');

  if (pageErrors.length) throw new Error(`page errors: ${JSON.stringify(pageErrors)}`);
  console.log(`\nmethods seen through the injected provider: ${[...new Set(methods)].sort().join(', ')}`);
} catch (e) {
  failed = e;
} finally {
  await browser.close();
}

const summary = { chainId, base, control, rowsRun: results.map(r => r.row), rowsPending: pending, rowsSkipped: skipped, rows: results.length, writes: results.filter(r => 'fghij'.includes(r.row)).length, shots: control ? null : shotsDir, failed: failed ? String(failed.message || failed) : null, failedRow: failed?.row ?? null };
console.log(JSON.stringify(summary, null, 1));

if (control) {
  /* The criterion is that the control run **exits non-zero** (m05-t01c step 9a), so every control
     outcome is a failure exit and the message is what distinguishes them:
       1 — failed on row (c), which is the control behaving: the assertions are live.
       3 — passed at an address with no code, which means they prove nothing. The alarming one.
       4 — failed on some other row, so the harness is broken rather than proven.
     Failing is not enough on its own: it has to fail on the row the control moved. */
  if (failed && failed.row === 'c') {
    console.error(`\ncontrol: failed on row (c) as it must — the driver can fail. ${failed.message || failed}`);
    process.exit(1);
  }
  if (failed) { console.error(`\ncontrol: failed on row ${failed.row}, not on (c) — the harness is broken, not proven. ${failed.message || failed}`); process.exit(4); }
  console.error('\ncontrol: PASSED at an address with no code, so the assertions prove nothing.');
  process.exit(3);
}
if (failed) { console.error(`\n${failed.stack || failed}`); process.exit(1); }
console.log('\nevery row asserted and every screenshot written.');
