/* Where a walk's first window starts (#391, step 5 amended).
 *
 * `logs()` starts at `WINDOW_START` 10,000 and only ever shrinks. So an endpoint that answers 50,000
 * blocks a query was read 10,000 at a time — five requests for blocks it would have served in one —
 * and chain 1's endpoint, whose 10,000-block span is an *archive* refusal, began every walk with four
 * refusals before it found the width it serves.
 *
 * The figure is a property of the **transport**, not of the chain: the page's own read provider knows
 * what it was measured at, and a wallet's provider does not, because the cap belongs to whichever
 * endpoint the wallet picked. So the assertion here goes through the real `readProvider` and the real
 * `rpcProvider` rather than setting a width by hand — the seam is the point, and a test that bypassed
 * it would pass with the figure wired to nothing.
 *
 * Only `fetch`, `head` and `CFG` are stubbed. Everything else is lifted out of the shipped page.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Model from '../app/src/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

const block = (anchor, end = '\n}\n', from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  const to = from.indexOf(end, at);
  assert.ok(to > at, `\`${anchor}\` is no longer closed by ${JSON.stringify(end)}`);
  return from.slice(at, to + end.length);
};
const line = (anchor, from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer has \`${anchor}\``);
  return from.slice(at, from.indexOf('\n', at));
};

const PUBLIC_RPC = line('const PUBLIC_RPC = {');
const PUBLIC_WINDOW = line('const PUBLIC_WINDOW = {');
const FROM_QUERY = line('let WINDOW_FROM_QUERY =');
const RPC_PROVIDER = block('const rpcProvider = (url, logWindow) => ({', '\n});\n');
const READ_PROVIDER = line('const readProvider = injected =>');
const WIN_START = line('let WINDOW_START =');
const WIN_INFLIGHT = line('const WINDOW_INFLIGHT =');
const MAX_WINDOWS = line('let MAX_WINDOWS =');
const RANGEY = line('const RANGEY =');
const ERRTEXT = block('const errText = e =>', ".join(' · ');\n");
const STATED_FLOOR = block('const statedFloor = text =>', '\n};\n');
const WINDOW1 = block('function window1(address, topics, a, b) {');
const LOGS = block('async function logs(address, topics, fromBlock, toBlock) {');

/* The table's own figures, read out of the page rather than repeated here: a test that hard-coded
   them would still pass if the page and the measurement disagreed, which is the one thing worth
   catching. */
const TABLE = new Function(`${PUBLIC_WINDOW}\nreturn PUBLIC_WINDOW;`)();

const HEAD = 20_000_000;

/** One walk, with every span it asked for recorded in order.
 *
 *  `wallet` supplies an injected EIP-1193 provider, which is what a connected visitor has. `refuse`
 *  is a sentence the endpoint answers with instead of logs, so the shrink can be watched; it fires
 *  on the first `nth` requests and then the endpoint behaves.
 */
function walk({ chainId, wallet = null, refuse = '', refuseFor = 0, fromQuery = false } = {}) {
  const spans = [];
  const src = `
    const CFG = { chainId: CHAIN_ID };
    ${PUBLIC_RPC}
    ${PUBLIC_WINDOW}
    ${FROM_QUERY}
    WINDOW_FROM_QUERY = FROM_QUERY;
    /* Stands in for the browser's own fetch, recording the width asked for and answering the way a
       real endpoint does: a JSON-RPC error body for a refusal, an empty log array otherwise. */
    let asks = 0;
    const fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      const p = body.params[0];
      const a = parseInt(p.fromBlock, 16), b = parseInt(p.toBlock, 16);
      SPANS.push(b - a + 1);
      asks++;
      if (REFUSE && asks <= REFUSE_FOR) {
        return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32614, message: REFUSE } }) };
      }
      return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1, result: [] }) };
    };
    ${RPC_PROVIDER}
    ${READ_PROVIDER}
    /* A wallet's injected EIP-1193 provider, which readProvider returns untouched. It records the
       same way the fetch stub does, because for a connected visitor the width the page chose arrives
       here and never at the browser's own fetch - the first version of this test recorded nothing
       and read as a page defect. No backticks in here: this comment is inside a template literal. */
    const walletProvider = {
      request: async ({ params }) => {
        const p = params[0];
        SPANS.push(parseInt(p.toBlock, 16) - parseInt(p.fromBlock, 16) + 1);
        return [];
      },
    };
    const P = readProvider(WALLET ? walletProvider : null);
    ${WIN_START}
    ${WIN_INFLIGHT}
    ${MAX_WINDOWS}
    ${RANGEY}
    ${ERRTEXT}
    ${STATED_FLOOR}
    const head = async () => HEAD;
    ${WINDOW1}
    ${LOGS}
    return { logs, provider: P };
  `;
  const made = new Function('Model', 'CHAIN_ID', 'SPANS', 'WALLET', 'REFUSE', 'REFUSE_FOR', 'HEAD',
    'FROM_QUERY', src)(Model, chainId, spans, wallet, refuse, refuseFor, HEAD, fromQuery);
  return { ...made, spans };
}

test('the first window of a walk is the span the page measured for that chain', async () => {
  for (const [chainId, want] of Object.entries(TABLE)) {
    const w = walk({ chainId: Number(chainId) });
    await w.logs(null, [[]], 0, HEAD);
    assert.equal(w.spans[0], want,
      `chain ${chainId} should open its walk at ${want} blocks, the span rpc-depth.md found reliable`);
  }
});

test('every chain in the table is one the page actually reads from', () => {
  const rpc = new Function(`${PUBLIC_RPC}\nreturn PUBLIC_RPC;`)();
  for (const chainId of Object.keys(TABLE)) {
    assert.ok(rpc[chainId], `chain ${chainId} has a start window but no PUBLIC_RPC entry to use it`);
  }
});

test('a chain with no measured figure still starts at 10,000', async () => {
  const w = walk({ chainId: 10 });                // Optimism: an endpoint, no reading of it
  await w.logs(null, [[]], 0, HEAD);
  assert.equal(w.spans[0], 10_000);
});

test("a wallet's provider starts at 10,000, because its cap is not ours to know", async () => {
  const w = walk({ chainId: 1, wallet: true });
  await w.logs(null, [[]], 0, HEAD);
  assert.equal(w.spans[0], 10_000,
    'an injected provider must not inherit the page endpoint\'s figure');
  assert.equal(w.provider.logWindow, undefined, 'readProvider returns a wallet provider untouched');
});

test('a wallet on a chain the page measured narrower still starts at 10,000', async () => {
  const w = walk({ chainId: 1, wallet: true });   // chain 1's own endpoint is 1,000
  await w.logs(null, [[]], 0, HEAD);
  assert.equal(w.spans[0], 10_000);
});

test('the window still shrinks on a refusal, from the chain\'s figure', async () => {
  const w = walk({ chainId: 8453, refuse: 'query returned too many results', refuseFor: 1 });
  await w.logs(null, [[]], 0, HEAD);
  assert.equal(w.spans[0], 50_000, 'it opens at the measured span');
  const narrower = w.spans.find(s => s < 50_000);
  assert.ok(narrower, `no window narrower than the opening one was ever asked for: ${w.spans.slice(0, 8)}`);
  assert.equal(narrower, 25_000, 'a refusal that names no cap halves the window');
});

test('a refusal that names a cap is taken at its word from the chain\'s figure', async () => {
  const w = walk({ chainId: 8453, refuse: 'exceed maximum block range: 1000', refuseFor: 1 });
  await w.logs(null, [[]], 0, HEAD);
  assert.equal(w.spans[0], 50_000);
  assert.ok(w.spans.includes(1_000), `the named cap was never used: ${w.spans.slice(0, 8)}`);
});

test('the dev ?win= override beats the table, or the windowing affordance cannot narrow', async () => {
  const w = walk({ chainId: 84532, fromQuery: true });
  await w.logs(null, [[]], 0, HEAD);
  assert.equal(w.spans[0], 10_000,
    'with WINDOW_FROM_QUERY set, readProvider must hand the provider no figure of its own');
});

test('the figures are the reliable column of the committed reading, not the ever column', () => {
  const md = readFileSync(join(root, 'docs/milestones/m05/tasks/m05-t01d/rpc-depth.md'), 'utf8');
  const rpc = new Function(`${PUBLIC_RPC}\nreturn PUBLIC_RPC;`)();
  for (const [chainId, want] of Object.entries(TABLE)) {
    const host = rpc[chainId].replace(/^https?:\/\//, '');
    const row = md.split('\n').find(l => l.startsWith(`| ${chainId} |`) && l.includes(host));
    assert.ok(row, `rpc-depth.md has no row for chain ${chainId} and ${host}`);
    /* The `reliable / ever` cell. The reliable figure is the bold one; `ever` sits after the slash
       and is never what the page may count on. */
    const cell = row.split('|')[4];
    const bold = /\*\*([\d,]+)\*\*/.exec(cell);
    assert.ok(bold, `chain ${chainId}'s span cell names no reliable figure: ${cell.trim()}`);
    assert.equal(Number(bold[1].replace(/,/g, '')), want,
      `chain ${chainId}: the page starts at ${want}, the reading says ${bold[1]} is reliable`);
  }
});
