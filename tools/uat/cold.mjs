#!/usr/bin/env node
/* Does the document this branch builds actually paint, on each chain's chosen endpoint?
 *
 * `rpc-depth.mjs` measures log queries and `rpc-pageload.mjs` measures a walk's worth of them. The
 * boot is neither: it is a burst of parallel `eth_call`s, and an endpoint can serve 5,000,000 blocks
 * of history and still fail it. `sepolia.gateway.tenderly.co` does exactly that, which is how this
 * file came to exist.
 *
 * It is also browser-native, which the UAT driver is not. The driver injects a provider that relays
 * to node, so what it proves about an endpoint is bounded: the burst is the page's, the transport is
 * node's. Here there is **no wallet at all**, so the page uses its own `PUBLIC_RPC` entry through the
 * browser's own fetch, with that origin's CORS answer and the browser's per-host connection limits.
 * That is the load a visitor with no wallet actually puts on it.
 *
 * Per chain: build the document from this branch, serve it locally, and load it cold `--loads` times
 * with a fresh context each time. Two pages are read — the landing panel, and a distribution page's
 * three log-built sections, which are classified into the four outcomes step 5 distinguishes.
 *
 * Usage: node tools/uat/cold.mjs [--chain 1,8453,11155111,84532] [--loads 10] [--shots <dir>]
 *                               [--patience 60000] [--keep] [--rpc <url>]
 *
 * `--rpc` compares a candidate against the committed one for a single chain. It rewrites only the
 * `PUBLIC_RPC` entry, and restores the file afterwards. Scoped to that table on purpose: a
 * document-wide replace also hits the explorer table twelve lines up, which made two candidates
 * produce byte-identical results once.
 *
 * Exit status: 0 when every chain filled its panel and reached something other than "nothing" on
 * every load; 1 otherwise, naming the chain. An endpoint that fails this is replaced before any
 * calldata is cut, which is the whole point of running it now.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { PATTERNS } from './rows.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EXEC = process.env.RAKE_UAT_CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`;
/* The DNZN distribution, which exists at the same address on all four chains — so a distribution
   page is a real read everywhere, mainnets included, rather than a 404 that paints nothing. */
const DNZN = '0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199';
const CHAINS = [1, 8453, 11155111, 84532];

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes(`--${k}`);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.gz': 'application/gzip' };

/** The built document, served from disk on an ephemeral port. Nothing clever: one directory, no
 *  caching headers, so every load is genuinely cold. */
function serve(dir) {
  return new Promise(resolve => {
    const srv = createServer((req, res) => {
      const path = (req.url || '/').split('?')[0].split('#')[0];
      const file = join(dir, path === '/' ? 'index.html' : path);
      if (!existsSync(file)) { res.writeHead(404); res.end('no'); return; }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(readFileSync(file));
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/** One section's text, as one of the outcomes step 5 distinguishes. The names are the page's own. */
function classify(text) {
  const t = String(text || '');
  if (!t.trim()) return 'empty';
  if (new RegExp(PATTERNS.unavailable, 'i').test(t)) return 'nothing';
  if (/limiting requests/i.test(t)) return 'throttle';
  if (new RegExp(PATTERNS.boundaryLine, 'i').test(t)) return 'boundary';
  if (new RegExp(PATTERNS.activityRow, 'i').test(t)) return 'rows';
  if (/no change has been queued yet|nothing has arrived at this address yet/i.test(t)) return 'read, empty';
  if (new RegExp(PATTERNS.loadingNotice, 'i').test(t.trim())) return 'loading';
  return 'other';
}

const textOf = (page, sel) =>
  page.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);

const waitFor = async (fn, ms, every = 500) => {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return true;
    if (Date.now() - t0 > ms) return false;
    await new Promise(r => setTimeout(r, every));
  }
};

async function oneLoad(browser, port, { patience, shotTo }) {
  /* A fresh context per load: no service worker, no storage, no connection reuse. “Cold” has to mean
     cold, or the second load measures the first one's cache. */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  const out = { featured: false, featuredMs: null, sections: {}, errors };
  try {
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: patience });
    out.featured = await waitFor(async () => {
      const t = await textOf(page, '#featured');
      return t.length > 0 && !new RegExp(PATTERNS.loadingNotice, 'i').test(t);
    }, patience);
    out.featuredMs = out.featured ? Date.now() - t0 : null;
    out.featuredText = (await textOf(page, '#featured')).slice(0, 80);

    await page.goto(`http://127.0.0.1:${port}/#/distros/${DNZN}`, { waitUntil: 'load', timeout: patience });
    /* Wait for the three log-built sections to stop saying "loading", then classify whatever they
       settled on. A section still loading at the end is its own outcome and is not counted as good. */
    await waitFor(async () => {
      for (const id of ['funds', 'h-changes', 'h-funds']) {
        const t = await textOf(page, `#${id}`);
        if (!t || new RegExp(PATTERNS.loadingNotice, 'i').test(t)) return false;
      }
      return true;
    }, patience);
    const fullText = {};
    for (const id of ['funds', 'h-changes', 'h-funds']) {
      const t = await textOf(page, `#${id}`);
      fullText[id] = t;
      out.sections[id] = { outcome: classify(t), text: t.slice(0, 120) };
    }
    /* How far back the first pass actually got, in the page's own numbers: `#asof` is the block the
       route's reads were made at, and every wording of the partial line names the block it stopped
       above — "history before block N". The lowest N across the three sections is the floor of the
       pass. No line at all means nothing was truncated, so the pass covered the whole history the
       distribution has. */
    const asof = /block (\d+)/.exec(await textOf(page, '#asof'));
    out.head = asof ? Number(asof[1]) : null;
    /* Scanned over the **full** section text. `out.sections[].text` is cut to 120 characters for the
       log, and a boundary line sits at the end of a section that has rows above it, so reading the
       excerpt would have missed exactly the loads that read the most. */
    const floors = Object.values(fullText)
      .map(t => /history before block (\d+)/.exec(t))
      .filter(Boolean).map(m => Number(m[1]));
    out.stopped = floors.length ? Math.min(...floors) : null;
    out.reach = out.head != null && out.stopped != null ? out.head - out.stopped : null;
    if (shotTo) await page.screenshot({ path: shotTo, fullPage: false });
  } catch (e) {
    out.threw = String(e && e.message || e).split('\n')[0].slice(0, 120);
  } finally {
    await ctx.close();
  }
  return out;
}

/** What a span of blocks is in wall-clock time, read from the chain rather than assumed.
 *
 *  A per-chain block time would be a guess; two `eth_getBlockByNumber` timestamps are a measurement,
 *  and on an L2 with variable batching they are not the same thing. Returns null rather than a figure
 *  it could not read: an endpoint that refuses the older block is exactly the case this reports on,
 *  so a fabricated duration would be the worst possible answer.
 */
async function spanInTime(endpoint, lo, hi) {
  const at = async n => {
    const r = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), false] }),
    });
    const j = await r.json().catch(() => null);
    return j && j.result && j.result.timestamp ? parseInt(j.result.timestamp, 16) : null;
  };
  try {
    const [a, b] = await Promise.all([at(lo), at(hi)]);
    return a && b && b > a ? b - a : null;
  } catch { return null; }
}

/** Seconds as the coarsest unit that is still honest, which is what a handoff row wants. */
const asTime = sec => sec == null ? '—'
  : sec >= 86400 ? `${(sec / 86400).toFixed(1)} days`
  : sec >= 3600 ? `${(sec / 3600).toFixed(1)} h`
  : `${Math.round(sec / 60)} min`;

(async () => {
  const chains = (arg('chain', CHAINS.join(',')) || '').split(',').map(s => Number(s.trim())).filter(Boolean);
  const loads = Number(arg('loads', 10));
  const patience = Number(arg('patience', 60000));
  const shots = arg('shots', join(os.tmpdir(), `rake-cold-${process.pid}`));
  const rpcOverride = arg('rpc', '');
  mkdirSync(shots, { recursive: true });

  const when = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const rows = [];
  try {
    for (const chain of chains) {
      process.stderr.write(`\n· chain ${chain}: building the document from this branch${rpcOverride ? ` with ${rpcOverride}` : ''}\n`);
      /* `--rpc` swaps this chain's `PUBLIC_RPC` entry for the build and puts the file back afterwards.
         It is how a candidate endpoint is compared without committing it: the entry is not a build
         token, so there is nothing to `--set`. The restore is in a `finally` — a crash here would
         otherwise leave an endpoint in the source that nobody chose. */
      const pageFile = join(ROOT, 'app/src/index.html');
      const before = rpcOverride ? readFileSync(pageFile, 'utf8') : null;
      if (rpcOverride) {
        /* Scoped to the `PUBLIC_RPC` object, not the file. A first draft replaced the first
           `<chain>: '…'` anywhere and quietly rewrote the **explorer** table instead — `EXPLORER`
           comes first in the source — so two candidate endpoints produced byte-identical results and
           both looked like the incumbent. The same mistake as reading the endpoint out of the whole
           document: a URL of the right shape attached to the wrong question. */
        const table = (before.match(/const PUBLIC_RPC = \{[^}]*\};/) || [])[0];
        if (!table) { console.error('cold: cannot find the PUBLIC_RPC table in app/src/index.html'); process.exit(2); }
        const patched = table.replace(new RegExp(`(\\b${chain}: ')https?://[^']+(')`), `$1${rpcOverride}$2`);
        if (patched === table) { console.error(`cold: no PUBLIC_RPC entry for chain ${chain} to override`); process.exit(2); }
        writeFileSync(pageFile, before.replace(table, patched));
      }
      const built = spawnSync('make', ['dapp-nodev', `CHAIN_ID=${chain}`], { cwd: ROOT, encoding: 'utf8' });
      if (before != null) writeFileSync(pageFile, before);
      if (built.status !== 0) {
        rows.push({ chain, built: false, why: (built.stderr || built.stdout || '').trim().split('\n').pop() });
        process.stderr.write(`  build failed: ${rows[rows.length - 1].why}\n`);
        continue;
      }
      /* The endpoint read **out of the `PUBLIC_RPC` object**, not out of the document at large. A
         first draft matched the first `<chain>: '…'` anywhere in the file and reported
         `https://sepolia.etherscan.io`, which is the explorer table — a plausible URL in the right
         shape, attached to the wrong question. The table in the handoff is read from this. */
      const doc = readFileSync(join(ROOT, 'app/dist/index.html'), 'utf8');
      const rpcTable = (doc.match(/const PUBLIC_RPC = \{[^}]*\}/) || [])[0] || '';
      const endpoint = (rpcTable.match(new RegExp(`\\b${chain}: '(https?://[^']+)'`)) || [])[1] || '(unread)';
      const { srv, port } = await serve(join(ROOT, 'app/dist'));
      const runs = [];
      for (let i = 1; i <= loads; i++) {
        const r = await oneLoad(browser, port, { patience, shotTo: i === 1 ? join(shots, `cold-${chain}.png`) : null });
        runs.push(r);
        const bad = Object.values(r.sections).filter(s => s.outcome === 'nothing' || s.outcome === 'loading').length;
        process.stderr.write(`  load ${String(i).padStart(2)}: featured ${r.featured ? `yes (${r.featuredMs} ms)` : 'NO'}`
          + ` · sections ${Object.values(r.sections).map(s => s.outcome).join('/') || '—'}${bad ? ' ← bad' : ''}${r.threw ? ` ← ${r.threw}` : ''}\n`);
      }
      await new Promise(r => srv.close(r));
      rows.push({ chain, built: true, endpoint, runs });
    }
  } finally {
    await browser.close();
  }

  console.log(`\nRead ${when} by \`tools/uat/cold.mjs\`: ${loads} cold loads per chain, no wallet, the browser's own fetch.`);
  console.log(`Distribution page: \`${DNZN}\`. Screenshots: ${shots}\n`);
  console.log('| chain | endpoint | featured panel filled | median fill | three sections, worst outcome per load | blocks in the first pass | that in time | page errors |');
  console.log('|:--|:--|--:|--:|:--|--:|--:|--:|');
  let bad = 0;
  for (const r of rows) {
    if (!r.built) { console.log(`| ${r.chain} | — | **build failed** | — | ${r.why} | — | — | — |`); bad++; continue; }
    const filled = r.runs.filter(x => x.featured).length;
    const ms = r.runs.filter(x => x.featuredMs).map(x => x.featuredMs).sort((a, b) => a - b);
    const median = ms.length ? ms[Math.floor(ms.length / 2)] : null;
    const worst = r.runs.map(x => {
      const o = Object.values(x.sections).map(s => s.outcome);
      if (!o.length) return x.threw ? 'threw' : 'none';
      for (const k of ['nothing', 'loading', 'empty', 'other', 'throttle', 'boundary', 'read, empty', 'rows']) if (o.includes(k)) return k;
      return o[0];
    });
    const tally = worst.reduce((a, k) => ({ ...a, [k]: (a[k] || 0) + 1 }), {});
    const errs = r.runs.reduce((a, x) => a + x.errors.length, 0);
    /* How far back a pass got. A load that painted no boundary line read the whole history the
       distribution has, which is a different statement from a number and is printed as one. */
    const reaches = r.runs.map(x => x.reach).filter(n => n != null).sort((a, b) => a - b);
    const whole = r.runs.filter(x => x.head != null && x.stopped == null).length;
    const reach = reaches.length ? reaches[Math.floor(reaches.length / 2)] : null;
    let reachCell = '—', timeCell = '—';
    if (reach != null) {
      const rep = r.runs.find(x => x.reach === reach) || {};
      reachCell = reach.toLocaleString('en-US') + (whole ? ` (${whole}/${r.runs.length} read it all)` : '');
      timeCell = asTime(await spanInTime(r.endpoint, Math.max(1, rep.stopped || 0), rep.head || 0));
    } else if (whole) {
      reachCell = `all of it, ${whole}/${r.runs.length}`;
      timeCell = 'whole history';
    }
    const ok = filled === r.runs.length && !worst.some(k => k === 'nothing' || k === 'loading' || k === 'none' || k === 'threw');
    if (!ok) bad++;
    console.log(`| ${r.chain} | \`${r.endpoint}\` | ${ok || filled === r.runs.length ? '' : '**'}${filled}/${r.runs.length}${ok || filled === r.runs.length ? '' : '**'} | ${median == null ? '—' : median + ' ms'} | ${Object.entries(tally).map(([k, n]) => `${n}× ${k}`).join(', ')} | ${reachCell} | ${timeCell} | ${errs} |`);
  }
  if (bad) console.error(`\n${bad} chain(s) did not paint on every load.`);
  process.exit(bad ? 1 : 0);
})();
