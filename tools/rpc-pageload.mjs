#!/usr/bin/env node
/* m05-t01d — what one distribution page's worth of `eth_getLogs` does to an endpoint.
 *
 * `rpc-depth.mjs` answers "how wide and how deep", with 40 requests of pressure. A distribution page
 * issues more than that and in a particular shape: **three log kinds**, each walking back from the
 * head in up to `MAX_WINDOWS` windows, `WINDOW_INFLIGHT` at a time (`app/src/index.html:500-502`).
 * So the question this answers is the one that decides whether a chosen endpoint survives a single
 * page load: 3 × 40 = 120 requests, four in flight, at the endpoint's own reliable span.
 *
 * Every window is inside the depth the endpoint was measured to serve, so a refusal here is about
 * being asked this much this quickly — not about depth. That distinction cost a wrong reading once
 * already: a rate column that walked deeper each request reported a prune refusal as throttling.
 *
 * Usage: node tools/rpc-pageload.mjs --endpoint <url> --span <blocks> [--runs 3] [--kinds 3]
 *                                    [--windows 40] [--inflight 4]
 *
 * Exit status: 0 when every run answered every request; 1 when any request was refused, since a
 * page that cannot finish its own first load is the finding.
 */

const FACTORY = '0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E';
const TIMEOUT_MS = 20_000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const hex = n => '0x' + BigInt(n).toString(16);
const one = s => String(s).replace(/\s+/g, ' ').trim().slice(0, 110);

async function rpc(url, method, params) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ac.signal,
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* the status line is the answer */ }
    if (body && body.error) return { ok: false, why: one(`${body.error.code ?? ''} ${body.error.message ?? ''}`) };
    if (!res.ok) return { ok: false, why: one(`HTTP ${res.status} ${text}`) };
    if (!body || !('result' in body)) return { ok: false, why: one(`no result: ${text}`) };
    return { ok: true, result: body.result };
  } catch (e) {
    return { ok: false, why: one(e.name === 'AbortError' ? `no answer in ${TIMEOUT_MS / 1000}s` : (e.message || String(e))) };
  } finally { clearTimeout(timer); }
}

const getLogs = (url, from, to) =>
  rpc(url, 'eth_getLogs', [{ address: FACTORY, fromBlock: hex(from), toBlock: hex(to) }]);

/** One kind's walk: `windows` windows of `span`, `inflight` at a time, newest first — the page's own
 *  shape, including that it does not pause between batches. */
async function walk(url, head, { span, windows, inflight }) {
  let hi = head, ok = 0, refused = 0;
  const whys = new Set();
  for (let done = 0; done < windows; done += inflight) {
    const batch = [];
    for (let k = 0; k < inflight && done + k < windows; k++) {
      const top = hi - k * span;
      batch.push(getLogs(url, Math.max(0, top - span + 1), top));
    }
    for (const r of await Promise.all(batch)) {
      if (r.ok) ok++; else { refused++; whys.add(r.why); }
    }
    hi -= inflight * span;
  }
  return { ok, refused, whys: [...whys], reached: hi };
}

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };

(async () => {
  const url = arg('endpoint');
  const span = Number(arg('span', 0));
  const runs = Number(arg('runs', 3));
  const kinds = Number(arg('kinds', 3));
  const windows = Number(arg('windows', 40));
  const inflight = Number(arg('inflight', 4));
  if (!url || !span) { console.error('usage: --endpoint <url> --span <blocks> [--runs 3]'); process.exit(2); }

  const when = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const rows = [];
  for (let run = 1; run <= runs; run++) {
    const bn = await rpc(url, 'eth_blockNumber', []);
    if (!bn.ok) { rows.push({ run, head: null, why: bn.why, ok: 0, refused: kinds * windows }); continue; }
    const head = parseInt(bn.result, 16);
    const started = Date.now();
    let ok = 0, refused = 0; const whys = new Set(); let deepest = head;
    // The three kinds run one after another, as the page's `history()` does.
    for (let kind = 0; kind < kinds; kind++) {
      const w = await walk(url, head, { span, windows, inflight });
      ok += w.ok; refused += w.refused; w.whys.forEach(x => whys.add(x));
      deepest = Math.min(deepest, w.reached);
    }
    rows.push({ run, head, ok, refused, whys: [...whys], ms: Date.now() - started, blocks: head - deepest });
    process.stderr.write(`· run ${run}: ${ok}/${ok + refused} answered in ${((Date.now() - started) / 1000).toFixed(1)}s${refused ? ` — ${[...whys][0]}` : ''}\n`);
    if (run < runs) await sleep(2_000);
  }

  console.log(`\nRead ${when} by \`tools/rpc-pageload.mjs\`: ${kinds} log kinds × ${windows} windows of ${span.toLocaleString('en-US')} blocks, ${inflight} in flight.`);
  console.log(`Endpoint: \`${url}\`\n`);
  console.log('| run | answered | refused | seconds | blocks reached in one pass | first refusal |');
  console.log('|--:|--:|--:|--:|--:|:--|');
  for (const r of rows) {
    console.log(`| ${r.run} | ${r.ok} | ${r.refused} | ${r.ms == null ? '—' : (r.ms / 1000).toFixed(1)} | ${r.blocks == null ? '—' : r.blocks.toLocaleString('en-US')} | ${r.refused ? (r.whys && r.whys[0]) || r.why : '—'} |`);
  }
  const bad = rows.filter(r => r.refused > 0);
  if (bad.length) console.error(`\n${bad.length} of ${rows.length} page loads were not answered in full.`);
  process.exit(bad.length ? 1 : 0);
})();
