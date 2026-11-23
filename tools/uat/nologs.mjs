/* The deterministic version of the Product Owner's Base Sepolia case: a wallet whose endpoint
   refuses **every** `eth_getLogs`, so the history read cannot help but fail. The question under test
   is the one his screenshot raised — with no history at all, is the `distribute` control still there?
   It is read from state, so it must be. */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const EXEC = `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const DNZN = '0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199';
const dir = process.argv[2];
const RPC = process.argv[3];

const srv = createServer((q, res) => {
  const p = (q.url || '/').split('?')[0].split('#')[0];
  const f = join(dir, p === '/' ? 'index.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;

const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e && e.message || e).slice(0, 160)));

let logCalls = 0;
await page.exposeFunction('__rpc', async (method, params) => {
  if (method === 'eth_getLogs') {
    logCalls++;
    // A refusal shape the page cannot classify, so the walk has no choice but to fail outright.
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

await page.goto(`http://127.0.0.1:${port}/index.html#/distros/${DNZN}`, { waitUntil: 'load' });
await page.waitForTimeout(30_000);

const out = await page.evaluate(() => ({
  funds: (document.getElementById('funds')?.innerText || '').replace(/\s+/g, ' ').trim(),
  changes: (document.getElementById('h-changes')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  activity: (document.getElementById('h-funds')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  distribute: [...document.querySelectorAll('button')].filter(x => /^distribute$/i.test(x.textContent.trim())).length,
}));

console.log(`\n  eth_getLogs calls, all refused : ${logCalls}`);
console.log(`  changes                       : ${out.changes}`);
console.log(`  activity                      : ${out.activity}`);
console.log(`  DISTRIBUTE buttons            : ${out.distribute}`);
console.log(`  funds block                   : ${out.funds.slice(0, 220)}`);
if (errors.length) console.log(`  page errors                   : ${errors.join(' | ')}`);

await ctx.close(); await b.close(); srv.close();
process.exit(out.distribute > 0 ? 0 : 1);
