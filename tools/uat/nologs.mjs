#!/usr/bin/env node
/* What the page does when the log read fails outright, on both of its paths.
 *
 * The Product Owner found this at the #397 preview: Base Sepolia, wallet connected, every section
 * reading `history unavailable` — and the `distribute` control gone with them, on a page whose header
 * said `waiting to distribute Ξ0.0100`. The ETH row and that control are read from **state**
 * (`eth_getBalance`, `reserved(address)`) and `distribute` is permissionless, so neither owes the logs
 * anything; `paintFailed` was replacing the whole block.
 *
 * Here every `eth_getLogs` is refused with a shape the page cannot classify, so the history has no
 * choice but to fail. Everything else is answered by a real endpoint, so the state reads are real.
 *
 * **Two paths, because the page has two.** With a wallet it reads through the injected provider; with
 * none it reads through the page's own `PUBLIC_RPC` entry and is a day deep by design. Both must keep
 * the funds block, and only the wallet path was checked when this file was written.
 *
 * Usage:
 *   node tools/uat/nologs.mjs <dir-with-index.html> <rpc-url> [--no-wallet]
 *
 * Exit: 0 when a `distribute` control is present, 1 when it is not, 2 on a usage error.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const noWallet = args.includes('--no-wallet');
const [dir, RPC] = args.filter(a => !a.startsWith('--'));

if (!dir || !RPC) {
  console.error('usage: node tools/uat/nologs.mjs <dir-with-index.html> <rpc-url> [--no-wallet]');
  console.error('  <dir>  a directory holding a built index.html, e.g. one copied out of app/dist');
  console.error('  <rpc>  an endpoint that answers everything except eth_getLogs, which this refuses');
  console.error('  RAKE_UAT_CHROME overrides the browser binary.');
  process.exit(2);
}
if (!existsSync(join(dir, 'index.html'))) {
  console.error(`nologs: ${join(dir, 'index.html')} does not exist`);
  process.exit(2);
}

const EXEC = process.env.RAKE_UAT_CHROME
  || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const DNZN = '0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199';

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
page.on('pageerror', e => errors.push(String(e && e.message || e).slice(0, 160)));

let refused = 0;
if (noWallet) {
  /* No wallet: the page reads through its own `PUBLIC_RPC` entry with the browser's own fetch, so the
     refusal is applied at the network rather than at an injected provider. */
  await page.route('**/*', async route => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();
    const body = req.postData() || '';
    if (!body.includes('eth_getLogs')) return route.continue();
    refused++;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'this endpoint does not serve eth_getLogs' } }),
    });
  });
} else {
  await page.exposeFunction('__rpc', async (method, params) => {
    if (method === 'eth_getLogs') {
      refused++;
      throw { code: -32000, message: 'this endpoint does not serve eth_getLogs' };
    }
    const r = await fetch(RPC, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const j = await r.json().catch(() => null);
    if (j && j.error) throw j.error;
    if (!r.ok || !j || j.result === undefined) throw { message: `HTTP ${r.status}`, data: { httpStatus: r.status } };
    return j.result;
  });
  await page.addInitScript(() => {
    window.ethereum = { isMetaMask: true, request: ({ method, params }) => window.__rpc(method, params || []) };
  });
}

await page.goto(`http://127.0.0.1:${port}/index.html#/distros/${DNZN}`, { waitUntil: 'load' });
await page.waitForTimeout(30_000);

const out = await page.evaluate(() => ({
  funds: (document.getElementById('funds')?.innerText || '').replace(/\s+/g, ' ').trim(),
  changes: (document.getElementById('h-changes')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  activity: (document.getElementById('h-funds')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  distribute: [...document.querySelectorAll('button')].filter(x => /^distribute$/i.test(x.textContent.trim())).length,
}));

console.log(`\n  path                 : ${noWallet ? 'no wallet (the page own endpoint)' : 'wallet (injected provider)'}`);
console.log(`  eth_getLogs refused  : ${refused}`);
console.log(`  changes              : ${out.changes}`);
console.log(`  activity             : ${out.activity}`);
console.log(`  DISTRIBUTE buttons   : ${out.distribute}`);
console.log(`  funds block          : ${out.funds.slice(0, 240)}`);
/* The sentence must not appear here: nothing was read, so the list covers no window at all. */
console.log(`  claims a 24h window  : ${/covers the last 24 hours/.test(out.funds)}`);
if (errors.length) console.log(`  page errors          : ${errors.join(' | ')}`);

await ctx.close();
await browser.close();
srv.close();
process.exit(out.distribute > 0 ? 0 : 1);
