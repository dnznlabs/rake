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
import { PAGE_SCRIPT, makeRpc, castCall } from './provider.mjs';
import * as R from './rows.mjs';
const COUNT_JS = fs.readFileSync(new URL('../../docs/milestones/m04/tasks/m04-t05/count.js', import.meta.url), 'utf8');

/* `rpc` is the page's own `PUBLIC_RPC` entry for that chain (`app/src/index.html:112`), not a
   favourite of mine: the injected provider has to read what the page reads, or the run measures the
   endpoint rather than the document. */
const CHAINS = {
  11155111: { name: 'sepolia', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', receiver: '0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95' },
  84532: { name: 'base sepolia', rpc: 'https://sepolia.base.org', receiver: '0x869DFe837B8dB2819027E53d75C20bE31f13acD2' },
};
const EXEC = process.env.RAKE_UAT_CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`;
const CODELESS = '0x00000000000000000000000000000000000000f1';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes(`--${k}`);

const chainId = Number(arg('chain'));
const chain = CHAINS[chainId];
if (!chain) { console.error(`run.mjs: --chain must be one of ${Object.keys(CHAINS).join(', ')}`); process.exit(2); }
const base = (arg('base', 'https://rake.dnzn.dev')).replace(/\/$/, '') + `/${chainId}/`;
const control = flag('control');
const shotsDir = arg('shots', path.resolve('../../docs/milestones/m04/tasks/m04-t05/shots', control ? 'control' : String(chainId)));

const results = [];
let failed = null;

/* The plan caps a screenshot at 300 KB. A full-page capture of `#/docs` is 1.3 MB, so the rule is:
   take the whole page, and if it will not fit, take the viewport instead and say so in the record
   rather than ship a PNG that breaks the cap or silently crop every row. */
const shot = async (page, name) => {
  if (control) return null;
  fs.mkdirSync(shotsDir, { recursive: true });
  const file = path.join(shotsDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  let bytes = fs.statSync(file).size;
  let clipped = false;
  if (bytes > 300 * 1024) {
    await page.screenshot({ path: file, fullPage: false });
    bytes = fs.statSync(file).size;
    clipped = true;
  }
  if (bytes > 300 * 1024) throw new Error(`${name}.png is ${bytes} bytes even clipped to the viewport, over the 300 KB the plan sets`);
  return { file: path.relative(process.cwd(), file), bytes, clipped };
};

const row = async (id, fn, page, shotName) => {
  process.stdout.write(`row ${id} … `);
  let facts;
  try { facts = await fn(); } catch (e) { e.row = e.row || id; throw e; }
  const png = shotName ? await shot(page, shotName) : null;
  results.push({ row: id, facts, png });
  console.log(`ok${png ? ` · ${png.bytes} B${png.clipped ? ' (viewport, full page over the cap)' : ''}` : ''}`);
  return facts;
};

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
try {
  /* ---- the wallet pass ---------------------------------------------------------------------- */
  const methods = [];
  const { rpc } = makeRpc({ chainId, rpcUrl: chain.rpc, sender: R.ENGINEER, log: m => methods.push(m) });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
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
  await R.countOn(page, COUNT_JS);
  /* The control's patience is short on purpose: it is proving the driver fails, not waiting out a
     page that cannot paint. The real run keeps `count.js`'s own 120 s. */
  const relation = control ? null : await R.ownerRelation({ addr: R.DNZN, connected: R.ENGINEER, rpcUrl: chain.rpc, castCall });
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
  await row('l', () => R.rowL(page, { base }), page, 'l-docs');

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

const summary = { chainId, base, control, rows: results.length, shots: control ? null : shotsDir, failed: failed ? String(failed.message || failed) : null, failedRow: failed?.row ?? null };
console.log(JSON.stringify(summary, null, 1));

if (control) {
  /* Failing is not enough: it has to fail on the row the control moved. A control that trips on the
     probe or on row (a) has proved the harness broken, not the assertions live. */
  if (failed && failed.row === 'c') { console.log('\ncontrol: the run failed on row (c) as it must — the driver can fail.'); process.exit(0); }
  if (failed) { console.error(`\ncontrol: the run failed on row ${failed.row}, not on (c) — the harness is broken, not proven.`); process.exit(4); }
  console.error('\ncontrol: the run PASSED at an address with no code, so the assertions prove nothing.');
  process.exit(3);
}
if (failed) { console.error(`\n${failed.stack || failed}`); process.exit(1); }
console.log('\nevery row asserted and every screenshot written.');
