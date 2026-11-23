#!/usr/bin/env node
/* m05-t01d step 1 — what a public endpoint will actually serve to a browser.
 *
 * The page walks `eth_getLogs` backwards from the head to build a distribution's history, and #382
 * showed that walk hitting a wall on Base Sepolia. The wall is not one chain's: a walk meets a
 * narrow window, a refusal of old blocks, or a rate limit, and which one it meets decides what
 * step 5's boundary line can honestly say. So this measures, per endpoint, four things:
 *
 *   span   the widest `eth_getLogs` range answered at the head
 *   depth  the oldest `fromBlock` answered at that span, by bisection, and the text refused past it
 *   rate   40 requests four at a time: how many were answered, and the first refusal
 *   cors   the `access-control-allow-origin` handed to `https://rake.dnzn.dev`
 *
 * Every figure is read here, now. Nothing is carried from a previous run or from the plan's table.
 *
 * Usage: node tools/rpc-depth.mjs [--chain <id>]... [--endpoint <url>]... [--json <path>]
 *        [--md <path>] [--spans a,b,c] [--probes N]
 *
 * Exit status: 0 when every endpoint answered something and every cell is filled; 1 when any
 * endpoint answered nothing at all, which is the condition the task asks this script to fail on.
 * A refusal with a reason is a reading, not a failure: an endpoint that says "50,000 is too wide"
 * has told us something, and only silence has not.
 */

const FACTORY = '0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E';
const ORIGIN = 'https://rake.dnzn.dev';

/* Three candidates per chain, as step 1 requires: the document's `PUBLIC_RPC` entry, what
 * `deploy/chains.json` holds for that chain, and one more that is not run by the same operator as
 * the first — otherwise "three endpoints" is one endpoint measured three times. `doc` and `deploy`
 * mark which is which so the handoff's table can say so without a second lookup. */
const CANDIDATES = {
  1: [
    { url: 'https://ethereum-rpc.publicnode.com', role: 'doc' },
    { url: 'https://0xrpc.io/eth', role: 'other' },
    { url: 'https://rpc.flashbots.net', role: 'other' },
    { url: 'https://eth.drpc.org', role: 'other' },
  ],
  8453: [
    { url: 'https://mainnet.base.org', role: 'doc' },
    { url: 'https://base-rpc.publicnode.com', role: 'other' },
    { url: 'https://base.drpc.org', role: 'other' },
  ],
  11155111: [
    { url: 'https://ethereum-sepolia-rpc.publicnode.com', role: 'doc+deploy' },
    { url: 'https://sepolia.gateway.tenderly.co', role: 'other' },
    { url: 'https://1rpc.io/sepolia', role: 'deploy' },
    { url: 'https://sepolia.rpc.thirdweb.com', role: 'other' },
  ],
  84532: [
    { url: 'https://sepolia.base.org', role: 'doc+deploy' },
    { url: 'https://base-sepolia-rpc.publicnode.com', role: 'deploy' },
    { url: 'https://base-sepolia.drpc.org', role: 'other' },
  ],
};

/* From 50, not 200. The first run called `1rpc.io` and `drpc.org` "nothing" because its narrowest
 * probe was 200 and they refuse anything over 50 or 100 blocks — they do serve logs, uselessly
 * narrowly, and a table that says "nothing" about them is wrong in a way that flatters them. */
const SPANS = [50, 100, 200, 1_000, 10_000, 50_000, 100_000];
/* How far back to sample, in blocks from the head. Fixed depths sampled repeatedly, not a
 * bisection: see `depthProfile`. */
const DEPTHS = [10_000, 50_000, 200_000, 1_000_000, 5_000_000];
const ATTEMPTS = 3;
const RATE_REQUESTS = 40;
const RATE_CONCURRENCY = 4;
const TIMEOUT_MS = 20_000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const hex = n => '0x' + BigInt(n).toString(16);

/** One JSON-RPC call. Returns `{ ok, result }` or `{ ok: false, why }` — `why` is the sentence the
 *  endpoint gave, trimmed to one line, because that text is the finding in most of these cells. */
async function rpc(url, method, params, { origin = null } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const headers = { 'content-type': 'application/json' };
    if (origin) headers['origin'] = origin;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ac.signal,
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON: the status line is the answer */ }
    if (body && body.error) {
      const code = body.error.code == null ? '' : `${body.error.code} `;
      return { ok: false, why: one(`${code}${body.error.message || ''}`), http: res.status, headers: res.headers };
    }
    if (!res.ok) return { ok: false, why: one(`HTTP ${res.status} ${text}`), http: res.status, headers: res.headers };
    if (!body || !('result' in body)) return { ok: false, why: one(`no result: ${text}`), http: res.status, headers: res.headers };
    return { ok: true, result: body.result, http: res.status, headers: res.headers };
  } catch (e) {
    return { ok: false, why: one(e.name === 'AbortError' ? `no answer in ${TIMEOUT_MS / 1000}s` : (e.message || String(e))) };
  } finally {
    clearTimeout(timer);
  }
}

const one = s => String(s).replace(/\s+/g, ' ').trim().slice(0, 120);

const getLogs = (url, from, to) =>
  rpc(url, 'eth_getLogs', [{ address: FACTORY, fromBlock: hex(from), toBlock: hex(to) }]);

/** The span profile at the head: every candidate span attempted `ATTEMPTS` times.
 *
 *  **Why a profile and not one number.** Three runs against
 *  `ethereum-sepolia-rpc.publicnode.com` minutes apart answered 10,000 / 50,000 / 50,000 as the
 *  widest span, and refused with two different sentences — `4444 pruned history unavailable` near
 *  the head, where nothing is pruned, and `-32701 exceed maximum block range: 50000`. A public
 *  hostname like this is a **pool**, and the backends in it do not share one span cap or one prune
 *  depth. So a single sample is not a property of the endpoint, and a retry only hides that. What
 *  is true of the endpoint is the fraction: `reliable` is the widest span answered on every
 *  attempt, which is the only width a page may count on. */
async function spanProfile(url, head, spans) {
  const per = [];
  for (const span of spans) {
    const from = Math.max(0, head - span);
    let ok = 0; const whys = new Set();
    for (let i = 0; i < ATTEMPTS; i++) {
      const r = await getLogs(url, from, head);
      if (r.ok) ok++; else whys.add(r.why);
      await sleep(250);
    }
    per.push({ span, ok, of: ATTEMPTS, whys: [...whys] });
  }
  const reliable = per.filter(p => p.ok === p.of).map(p => p.span).pop() ?? null;
  const everAnswered = per.filter(p => p.ok > 0).map(p => p.span).pop() ?? null;
  const firstRefused = per.find(p => p.ok < p.of) || null;
  return { per, reliable, everAnswered, firstRefused };
}

/** The depth profile: fixed depths back from the head, each attempted `ATTEMPTS` times.
 *
 *  **Bisection was the wrong instrument and this replaced it.** Bisection assumes one monotone
 *  boundary; against a pool there is none, and successive bisections on the same URL "found"
 *  boundaries 400,000 blocks apart. Fixed depths sampled repeatedly can be compared between runs
 *  and between endpoints, and they report what a page would actually experience: at this depth,
 *  this fraction of attempts are answered.
 *
 *  **An answer is also not proof that history is served there.** A probe of `[0, span]` was
 *  answered while the same endpoint refused a mid-range window saying `earliest available
 *  1000000` — a node can answer from an index that knows this address has no logs in a range
 *  without reading pruned bodies, so an empty `[]` means "nothing found", not "history available".
 *  So any floor the endpoint **states about itself** is kept separately and preferred: it is better
 *  evidence than anything inferred from an empty array, and it is what step 5's line can name. */
async function depthProfile(url, head, span, depths) {
  const per = [];
  let stated = null;
  for (const depth of depths) {
    if (depth >= head) { per.push({ depth, ok: 0, of: 0, skipped: 'deeper than the chain' }); continue; }
    const from = head - depth;
    let ok = 0; const whys = new Set();
    for (let i = 0; i < ATTEMPTS; i++) {
      const r = await getLogs(url, from, from + span);
      if (r.ok) ok++;
      else {
        whys.add(r.why);
        const m = /earliest available (\d+)/i.exec(r.why || '');
        if (m) stated = Math.max(stated ?? 0, Number(m[1]));
      }
      await sleep(250);
    }
    per.push({ depth, ok, of: ATTEMPTS, whys: [...whys] });
  }
  const answered = per.filter(p => p.of > 0 && p.ok === p.of).map(p => p.depth);
  const partial = per.filter(p => p.of > 0 && p.ok > 0 && p.ok < p.of).map(p => p.depth);
  return {
    per,
    reliableDepth: answered.length ? Math.max(...answered) : null,
    partialDepths: partial,
    deepestEver: per.filter(p => p.ok > 0).map(p => p.depth).pop() ?? null,
    stated,
  };
}

/** 40 requests, four at a time. Counts answers rather than timing them: the question step 5 needs
 *  answered is whether a page's own walk gets throttled, not how fast one call is.
 *
 *  **Every window is inside the depth already proven answerable**, spread evenly between `oldest`
 *  and the head and each one distinct. The first draft walked backwards instead, one span deeper per
 *  request, and on Sepolia it reported 13 of 40 with a first refusal of `4444 pruned history
 *  unavailable` — a depth refusal counted as throttling. A rate measurement that can fail for a
 *  reason other than rate measures nothing, so the depth is held constant-ish by construction and a
 *  refusal here is about being asked too often. Distinct windows also stop a cache answering for
 *  the endpoint. */
async function ratePressure(url, head, span, oldest) {
  const lo = Math.min(oldest + span, head - span);
  const hi = Math.max(lo, head - span);
  const step = Math.max(1, Math.floor((hi - lo) / Math.max(1, RATE_REQUESTS - 1)));
  let answered = 0, refused = 0, first = null;
  for (let i = 0; i < RATE_REQUESTS; i += RATE_CONCURRENCY) {
    const batch = [];
    for (let k = 0; k < RATE_CONCURRENCY && i + k < RATE_REQUESTS; k++) {
      const from = Math.min(hi, lo + (i + k) * step);
      batch.push(getLogs(url, from, from + span));
    }
    for (const r of await Promise.all(batch)) {
      if (r.ok) answered++;
      else { refused++; if (!first) first = r.why; }
    }
  }
  return { answered, refused, first, band: [lo, hi + span] };
}

/** What the browser is told. A page on `rake.dnzn.dev` can only use an endpoint that allows that
 *  origin, so this is as load-bearing as the depth: an endpoint with deep history and no CORS
 *  header is useless to the document, and the table has to show both. */
async function corsFor(url) {
  const r = await rpc(url, 'eth_blockNumber', [], { origin: ORIGIN });
  const h = r.headers;
  const allow = h ? (h.get('access-control-allow-origin') || '') : '';
  return { allow: allow || '(none)', ok: allow === '*' || allow === ORIGIN, why: r.ok ? null : r.why };
}

function parseArgs(argv) {
  const out = { chains: [], endpoints: [], json: null, md: null, spans: SPANS, depths: DEPTHS };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--chain') out.chains.push(String(Number(argv[++i])));
    else if (a === '--endpoint') out.endpoints.push(argv[++i]);
    else if (a === '--json') out.json = argv[++i];
    else if (a === '--md') out.md = argv[++i];
    else if (a === '--spans') out.spans = argv[++i].split(',').map(s => Number(s.trim())).filter(Boolean);
    else if (a === '--depths') out.depths = argv[++i].split(',').map(s => Number(s.trim())).filter(Boolean);
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  if (!out.chains.length) out.chains = Object.keys(CANDIDATES);
  return out;
}

async function measure(chain, cand, spans, depths) {
  const row = { chain, url: cand.url, role: cand.role };
  const bn = await rpc(cand.url, 'eth_blockNumber', []);
  if (!bn.ok) {
    // Silence, not a reason: this is the one outcome the task wants a non-zero exit for.
    row.head = null; row.answersNothing = true; row.why = bn.why;
    return row;
  }
  const reported = await rpc(cand.url, 'eth_chainId', []);
  row.head = parseInt(bn.result, 16);
  row.chainIdReported = reported.ok ? String(parseInt(reported.result, 16)) : `unreadable (${reported.why})`;
  const s = await spanProfile(cand.url, row.head, spans);
  row.spans = s.per;
  row.span = s.reliable;                 // the width a page may count on
  row.spanEver = s.everAnswered;         // the width that sometimes works
  row.spanRefusedAt = s.firstRefused ? s.firstRefused.span : null;
  row.spanRefusedWhy = s.firstRefused ? s.firstRefused.whys.join(' / ') : null;
  if (row.spanEver == null) {
    // Every span refused on every attempt: it answers `eth_blockNumber` but serves this page no
    // logs at all. That is the silence the task wants a non-zero exit for.
    row.answersNothing = true;
    row.why = row.spanRefusedWhy;
    return row;
  }
  // Depth is sampled at the reliable width when there is one, else at the widest that ever worked,
  // and the row says which, so a depth figure is never read as firmer than the width under it.
  row.depthAtSpan = row.span ?? row.spanEver;
  row.depthSpanReliable = row.span != null;
  const d = await depthProfile(cand.url, row.head, row.depthAtSpan, depths);
  row.depths = d.per;
  row.depth = d.reliableDepth;           // blocks back, answered on every attempt
  row.depthEver = d.deepestEver;
  row.depthPartial = d.partialDepths;
  row.statedFloor = d.stated;
  row.oldest = row.depth == null ? null : row.head - row.depth;
  const r = await ratePressure(cand.url, row.head, row.depthAtSpan, row.head - (row.depth ?? row.depthAtSpan * 2));
  row.rateAnswered = r.answered; row.rateRefused = r.refused; row.rateFirst = r.first; row.rateBand = r.band;
  const c = await corsFor(cand.url);
  row.cors = c.allow; row.corsUsable = c.ok;
  row.answersNothing = false;
  return row;
}

const n = x => (x == null ? '—' : Number(x).toLocaleString('en-US'));

function markdown(rows, when) {
  const lines = [];
  lines.push(`Read ${when}, by \`tools/rpc-depth.mjs\` on the factory \`${FACTORY}\`.`);
  lines.push('');
  lines.push(`Each span and each depth was attempted **${ATTEMPTS} times**; a figure in bold is the`
    + ' one answered on *every* attempt, which is the only one a page may count on. A fraction means'
    + ' the endpoint is a pool whose backends disagree.');
  lines.push('');
  lines.push('| chain | endpoint | role | span, reliable / ever | refused past it | depth reliable (blocks back) | deeper, sometimes | states about itself | 40 reqs, 4 at a time | CORS to rake.dnzn.dev |');
  lines.push('|:--|:--|:--|--:|:--|--:|:--|:--|:--|:--|');
  for (const r of rows) {
    if (r.answersNothing) {
      lines.push(`| ${r.chain} | \`${r.url}\` | ${r.role} | **nothing** | ${r.why || r.spanRefusedWhy || '—'} | — | — | — | — | ${r.cors || '—'} |`);
      continue;
    }
    const refused = r.spanRefusedAt == null ? 'nothing wider tried' : `${n(r.spanRefusedAt)}: ${r.spanRefusedWhy}`;
    const span = `${r.span == null ? 'none' : '**' + n(r.span) + '**'} / ${n(r.spanEver)}`;
    const depth = r.depth == null ? 'none' : `**${n(r.depth)}**`;
    const partial = r.depthPartial && r.depthPartial.length
      ? r.depthPartial.map(d => n(d)).join(', ')
      : (r.depthEver != null && r.depthEver !== r.depth ? n(r.depthEver) : '—');
    const stated = r.statedFloor != null ? `\`earliest available ${n(r.statedFloor)}\`` : '—';
    lines.push(`| ${r.chain} | \`${r.url}\` | ${r.role} | ${span} | ${refused} | ${depth}${r.depthSpanReliable ? '' : ' (at an unreliable width)'} | ${partial} | ${stated} | ${r.rateAnswered}/${r.rateAnswered + r.rateRefused} answered${r.rateRefused ? ` · ${r.rateFirst}` : ''} | ${r.cors}${r.corsUsable ? '' : ' **unusable**'} |`);
  }
  return lines.join('\n');
}

(async () => {
  const args = parseArgs(process.argv);
  const when = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const rows = [];
  for (const chain of args.chains) {
    const cands = args.endpoints.length
      ? args.endpoints.map(url => ({ url, role: 'given' }))
      : (CANDIDATES[chain] || []);
    if (!cands.length) { console.error(`no candidates for chain ${chain}`); process.exit(2); }
    for (const cand of cands) {
      process.stderr.write(`· chain ${chain} ${cand.url} …\n`);
      const row = await measure(chain, cand, args.spans, args.depths);
      rows.push(row);
      process.stderr.write(`  ${row.answersNothing ? `NOTHING (${row.why})` : `span ${n(row.span)}/${n(row.spanEver)}, depth ${n(row.depth)}, rate ${row.rateAnswered}/${row.rateAnswered + row.rateRefused}, cors ${row.cors}`}\n`);
      await sleep(500);
    }
  }

  const md = markdown(rows, when);
  console.log(md);

  if (args.md) { await (await import('node:fs/promises')).writeFile(args.md, md + '\n'); }
  if (args.json) {
    await (await import('node:fs/promises')).writeFile(args.json, JSON.stringify({ when, factory: FACTORY, origin: ORIGIN, rows }, null, 2) + '\n');
  }

  // The two conditions the task names, checked separately so the message says which one failed.
  const silent = rows.filter(r => r.answersNothing);
  // An empty cell, not a `none`: a measured "no reliable span" is a reading and the table shows it.
  const holes = rows.filter(r => !r.answersNothing && (r.spans == null || r.depths == null || r.rateAnswered == null || !r.cors));
  if (silent.length) {
    console.error(`\n${silent.length} endpoint(s) answered nothing: ${silent.map(r => `${r.chain} ${r.url} (${r.why})`).join('; ')}`);
  }
  if (holes.length) {
    console.error(`\n${holes.length} row(s) have an empty cell: ${holes.map(r => `${r.chain} ${r.url}`).join('; ')}`);
  }
  process.exit(silent.length || holes.length ? 1 : 0);
})();
