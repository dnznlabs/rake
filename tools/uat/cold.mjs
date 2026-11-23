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

/* The two log kinds a distribution's history is built from, as the page declares them
   (`app/src/index.html`, `CHANGE_EVENTS` and `FUND_EVENTS`). They are listed here so this file can
   ask the chain the **same question by another route** and catch the one failure a classifier cannot
   see: a section that says "nothing has arrived at this address yet" about an address that has.
   A throttle is a bad read honestly reported; an empty history stated as fact is a wrong answer. */
const CHANGE_EVENTS = ['Queued(bytes32,uint32,uint256,bytes)', 'Applied(bytes32)', 'Cancelled(bytes32)',
  'OwnershipTransferred(address,address)'];
const FUND_EVENTS = ['Received(address,uint256)', 'Distributed(address,uint256)', 'Escrowed(address,address,uint256)',
  'Released(address,address,uint256)', 'Claimed(address,address,address,uint256)'];

const castOut = (args) => {
  const r = spawnSync('cast', args, { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout || '').trim() : null;
};
const topic0 = sig => castOut(['keccak', sig]);

/** What the chain holds for this address, counted with `cast` rather than the browser.
 *
 *  Deliberately a different client: `cast` builds its own JSON, opens its own connection and parses
 *  its own answer, so agreement between it and the page is evidence rather than a tautology. Windowed
 *  at the same span the page starts from, because these endpoints refuse wider.
 *
 *  Returns counts per kind plus how many windows were refused, because a refused window makes the
 *  count a floor and not a total — and a floor is still enough to catch "empty" stated as fact.
 */
function chainTruth(endpoint, address, from, to, span, kinds) {
  const counts = {}, refused = {};
  for (const [name, sigs] of Object.entries(kinds)) {
    const topics = sigs.map(topic0).filter(Boolean);
    if (topics.length !== sigs.length) return null;        // no cast, no claim
    let n = 0, bad = 0;
    for (let hi = to; hi >= from; hi -= span) {
      const lo = Math.max(from, hi - span + 1);
      const filter = JSON.stringify({ address, topics: [topics],
        fromBlock: '0x' + lo.toString(16), toBlock: '0x' + hi.toString(16) });
      const out = castOut(['rpc', '--rpc-url', endpoint, 'eth_getLogs', filter]);
      if (out == null) { bad++; continue; }
      try { n += (JSON.parse(out) || []).length; } catch { bad++; }
    }
    counts[name] = n; refused[name] = bad;
  }
  return { counts, refused };
}

/* Which section each kind backs, and the page's own sentence for "I read it and it was empty". The
   assertion is one-directional on purpose: a page may show fewer rows than exist (it read less), but
   it may never say a history is empty when the chain has one in the range it read. */
const EMPTY_CLAIM = {
  'h-changes': { kind: 'changes', says: /no change has been queued yet/i },
  'h-funds': { kind: 'funds', says: /nothing has arrived at this address yet/i },
  funds: { kind: 'funds', says: /nothing has arrived at this address yet/i },
};

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
  /* Every `eth_getLogs` the browser actually sent, with what came back. Recorded on every load
     because an outcome is only known afterwards, and the one load worth explaining is the one that
     answered nothing — a single unexplained "nothing" on Sepolia is why this is here. The body is
     kept short: what matters is the refusal's sentence, not its payload. */
  const rpc = [];
  /* Which route the request belongs to. Without this the landing page's own featured read and the
     distribution page's three walks arrive in one undifferentiated list, and a successful window
     cannot be attributed to the section that should have painted it — which is exactly the question
     a `nothing` load raises. */
  let phase = 'boot';
  page.on('response', async r => {
    try {
      const req = r.request();
      if (req.method() !== 'POST') return;
      const post = req.postData() || '';
      if (!post.includes('eth_getLogs')) return;
      const b = JSON.parse(post);
      const f = (b.params && b.params[0]) || {};
      const body = await r.text().catch(() => '');
      rpc.push({
        phase,
        from: f.fromBlock ? parseInt(f.fromBlock, 16) : null,
        to: f.toBlock ? parseInt(f.toBlock, 16) : null,
        span: f.fromBlock && f.toBlock ? parseInt(f.toBlock, 16) - parseInt(f.fromBlock, 16) + 1 : null,
        topics: (f.topics && f.topics[0] || []).length,
        status: r.status(),
        answer: body.slice(0, 160),
      });
    } catch { /* a response that cannot be read is not worth failing a load over */ }
  });
  const out = { featured: false, featuredMs: null, sections: {}, errors, rpc };
  try {
    const t0 = Date.now();
    phase = 'landing';
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: patience });
    out.featured = await waitFor(async () => {
      const t = await textOf(page, '#featured');
      return t.length > 0 && !new RegExp(PATTERNS.loadingNotice, 'i').test(t);
    }, patience);
    out.featuredMs = out.featured ? Date.now() - t0 : null;
    out.featuredText = (await textOf(page, '#featured')).slice(0, 80);

    phase = 'distribution';
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
        /* A load that answered nothing is the one that needs evidence, and it is rare enough that
           nobody will be there to catch it by hand. Saved automatically, named for the chain and the
           load, with every window the browser asked for and what came back. */
        if (Object.values(r.sections).some(sx => sx.outcome === 'nothing')) {
          const f = join(shots, `nothing-${chain}-load${i}.json`);
          writeFileSync(f, JSON.stringify({ chain, load: i, endpoint, sections: r.sections, requests: r.rpc }, null, 2));
          process.stderr.write(`  ! nothing answered — the browser's own ${r.rpc.length} getLogs requests saved to ${f}\n`);
        }
        process.stderr.write(`  load ${String(i).padStart(2)}: featured ${r.featured ? `yes (${r.featuredMs} ms)` : 'NO'}`
          + ` · sections ${Object.values(r.sections).map(s => s.outcome).join('/') || '—'}${bad ? ' ← bad' : ''}${r.threw ? ` ← ${r.threw}` : ''}\n`);
      }
      await new Promise(r => srv.close(r));
      /* The independent count, once per chain and after the loads, over the whole history the
         distribution can have: the factory's own block is the floor, since nothing it made can
         predate it. Windowed at this chain's start window, which is the width the endpoint said it
         serves. */
      /* **Hex.** The build substitutes `factoryBlock: '0x3a5cbe0'`, and a decimal-only pattern took the
         leading `0` and silently skipped this whole check on all four chains. Both forms are read. */
      const fbRaw = (doc.match(/factoryBlock: *'?(0x[0-9a-fA-F]+|\d+)/) || [])[1];
      const fb = fbRaw ? Number(BigInt(fbRaw)) : 0;
      const heads = runs.map(r => r.head).filter(Boolean);
      const hi = heads.length ? Math.max(...heads) : 0;
      const span = Number((doc.match(new RegExp(`const PUBLIC_WINDOW = \\{[^}]*\\b${chain}: *(\\d[\\d_]*)`)) || [])[1]?.replace(/_/g, '') || 10000);
      let truth = null;
      if (fb && hi) {
        process.stderr.write(`  asking the chain with cast: blocks ${fb}..${hi} in windows of ${span}\n`);
        truth = chainTruth(endpoint, DNZN, fb, hi, span, { changes: CHANGE_EVENTS, funds: FUND_EVENTS });
        if (truth) process.stderr.write(`  cast says: ${Object.entries(truth.counts).map(([k, n]) => `${k} ${n}`).join(', ')}`
          + `${Object.values(truth.refused).some(Boolean) ? ` (refused windows: ${Object.entries(truth.refused).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}\n`);
      }
      /* The one assertion that can fail on a *correct-looking* run: a section claiming an empty
         history for a kind the chain has events of, in a load that painted no boundary at all. */
      const lies = [];
      for (const [i, r] of runs.entries()) {
        for (const [id, sx] of Object.entries(r.sections)) {
          const claim = EMPTY_CLAIM[id];
          if (!claim || !truth || r.stopped != null) continue;      // a truncated read claims nothing
          if (claim.says.test(sx.text) && truth.counts[claim.kind] > 0) {
            lies.push(`load ${i + 1} · #${id} said the history is empty · cast counts `
              + `${truth.counts[claim.kind]} ${claim.kind} event(s) over ${fb}..${hi}`);
          }
        }
      }
      rows.push({ chain, built: true, endpoint, runs, truth, lies, fb, hi });
    }
  } finally {
    await browser.close();
  }

  console.log(`\nRead ${when} by \`tools/uat/cold.mjs\`: ${loads} cold loads per chain, no wallet, the browser's own fetch.`);
  console.log(`Distribution page: \`${DNZN}\`. Screenshots: ${shots}\n`);
  console.log('| chain | endpoint | featured panel filled | median fill | three sections, worst outcome per load | blocks in the first pass | that in time | the chain, by `cast` | page errors |');
  console.log('|:--|:--|--:|--:|:--|--:|--:|:--|--:|');
  let bad = 0;
  for (const r of rows) {
    if (!r.built) { console.log(`| ${r.chain} | — | **build failed** | — | ${r.why} | — | — | — | — |`); bad++; continue; }
    const filled = r.runs.filter(x => x.featured).length;
    const ms = r.runs.filter(x => x.featuredMs).map(x => x.featuredMs).sort((a, b) => a - b);
    const median = ms.length ? ms[Math.floor(ms.length / 2)] : null;
    const worst = r.runs.map(x => {
      const o = Object.values(x.sections).map(s => s.outcome);
      if (!o.length) return x.threw ? 'threw' : 'none';
      /* Worst **read quality**, which is not the same as fewest rows. An earlier ranking put
         `read, empty` above `rows`, so a load where `changes` was legitimately empty and the other
         two sections were full reported as "read, empty" — and read as though the page had found
         nothing. A section that read its whole range is a good outcome whether or not that range
         held events, and the `cast` column beside this one says which. */
      for (const k of ['nothing', 'loading', 'empty', 'other', 'throttle', 'boundary']) if (o.includes(k)) return k;
      return 'read in full';
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
    /* What the chain holds, so a reader can tell "read, empty" that is true from "read, empty" that
       is a wrong answer. A refused window makes it a floor, and the cell says so. */
    const t = r.truth;
    const truthCell = !t ? '(not read)'
      : Object.entries(t.counts).map(([k, n]) => `${k} ${n}${t.refused[k] ? `+ (${t.refused[k]} windows refused)` : ''}`).join(', ');
    const ok = filled === r.runs.length && !worst.some(k => k === 'nothing' || k === 'loading' || k === 'none' || k === 'threw')
      && !(r.lies || []).length;
    if (!ok) bad++;
    console.log(`| ${r.chain} | \`${r.endpoint}\` | ${ok || filled === r.runs.length ? '' : '**'}${filled}/${r.runs.length}${ok || filled === r.runs.length ? '' : '**'} | ${median == null ? '—' : median + ' ms'} | ${Object.entries(tally).map(([k, n]) => `${n}× ${k}`).join(', ')} | ${reachCell} | ${timeCell} | ${truthCell} | ${errs} |`);
  }
  /* An empty history stated as fact is the one failure that looks like success in every other
     column, so it is named in full rather than counted. */
  for (const r of rows) for (const l of (r.lies || [])) console.error(`\nWRONG ANSWER · chain ${r.chain} · ${l}`);
  /* The endpoint's own words for its limit, taken from the traffic rather than from its docs: the
     figure for any shared in-flight cap has to come from what it actually said to this page. */
  const said = {};
  for (const r of rows) {
    if (!r.built) continue;
    const seen = new Map();
    for (const run of r.runs) for (const q of (run.rpc || [])) {
      const body = q.answer || '';
      if (q.status === 200 && !/"error"/.test(body)) continue;     // a plain result is not a refusal
      const m = /"message" *: *"([^"]{3,})/.exec(body);
      /* Self-diagnosing on purpose: an unmatched refusal shows its own first characters rather than
         collapsing into a bare status, which is how a first run reported `40× HTTP 200` for chains
         that had refused nothing at all. */
      const key = m ? m[1].replace(/\\?"$/, '').slice(0, 90) : (body ? `[unparsed ${q.status}] ${body.slice(0, 60)}` : `HTTP ${q.status}, empty body`);
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    if (seen.size) said[r.chain] = [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }
  if (Object.keys(said).length) {
    console.log('\nWhat the endpoints said when they refused, counted over every load — their own words:\n');
    for (const [chain, list] of Object.entries(said)) {
      console.log(`- **${chain}**: ${list.map(([m, n]) => `${n}× \`${m}\``).join(' · ')}`);
    }
  }
  for (const r of rows) {
    if (!r.built || !r.truth) continue;
    console.log(`\n- chain ${r.chain}: \`cast\` counted ${Object.entries(r.truth.counts).map(([k, n]) => `${n} ${k}`).join(' and ')}`
      + ` for \`${DNZN}\` over blocks ${r.fb}..${r.hi}`
      + `${Object.values(r.truth.refused).some(Boolean) ? `, with ${Object.entries(r.truth.refused).filter(([, n]) => n).map(([k, n]) => `${n} refused window(s) on ${k}`).join(' and ')}, so those are floors` : ', every window answered'}.`);
  }
  if (bad) console.error(`\n${bad} chain(s) did not paint on every load, or stated an empty history the chain contradicts.`);
  process.exit(bad ? 1 : 0);
})();
