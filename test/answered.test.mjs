/* "The endpoint answered nothing" must mean the endpoint, not the bookkeeping (#382, step 5).
 *
 * `logs()` keeps logs only from an unbroken run at the top of a batch: a success below a refusal is
 * discarded, because keeping it would leave a hole that no single boundary block could describe. That
 * is right. What was wrong is that the same loop counted `answered`, so a window the endpoint had
 * answered went uncounted — and a walk whose only successes sat below a refusal reached the end with
 * `answered === 0` and threw, which paints `history unavailable` across all three sections and the
 * funds block.
 *
 * Measured, not imagined. One Sepolia cold load in twenty did exactly this, and the browser's own
 * eight requests are kept beside this test at
 * `docs/milestones/m05/tasks/m05-t01d/evidence/nothing-11155111-load7.json`: the `changes` walk was
 * refused `4444 pruned history unavailable` on its newer window and answered `[]` on its older one,
 * the `funds` walk returned a real log array and was then rate-limited, and the page said the history
 * was unavailable. The endpoint had answered three times.
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

const LOGS = block('async function logs(address, topics, fromBlock, toBlock) {');
const PARTIAL_LINE = block('function partialLine() {');
const STATED_FLOOR = block('const statedFloor = text =>', '\n};\n');
const RANGEY = line('const RANGEY =');
const ERRTEXT = block('const errText = e =>', ".join(' · ');\n");

const EVENT = { blockNumber: '0x1', logIndex: '0x0', topics: ['0xaa'], data: '0x' };

/** A walk over an endpoint that refuses by **position** rather than by width.
 *
 *  `refuseAbove` is a block: any window reaching at or above it is refused with `saying`, and
 *  anything strictly below it is answered. That is the shape the batch rule discards — the newest
 *  window of a batch fails, the older ones in the same batch succeed and are dropped.
 */
function walk({ refuseAbove, saying = 'pruned history unavailable', code = 4444, head = 1_000_000,
                from = 0, events = true } = {}) {
  const asked = [];
  const src = `
    const WINDOW_START = 10000, WINDOW_INFLIGHT = 4;
    let MAX_WINDOWS = 40;
    const P = {
      request: async ({ params }) => {
        const a = parseInt(params[0].fromBlock, 16), b = parseInt(params[0].toBlock, 16);
        ASKED.push([a, b]);
        if (b >= REFUSE_ABOVE) throw { code: CODE, message: SAYING };
        /* Each event carries the block of the window it came from, so a log kept from below the
           boundary is identifiable. An earlier version returned the same event for every window,
           which made the hole invisible and the contiguity assertion worthless - a mutation that
           kept logs from under a refusal passed it. */
        return EVENTS ? [{ ...EVENT, blockNumber: '0x' + a.toString(16) }] : [];
      },
    };
    ${RANGEY}
    ${ERRTEXT}
    ${STATED_FLOOR}
    const head = async () => HEAD;
    function window1(address, topics, a, b) {
      return P.request({ method: 'eth_getLogs', params: [{ topics, fromBlock: '0x' + a.toString(16), toBlock: '0x' + b.toString(16) }] });
    }
    ${LOGS}
    return logs;
  `;
  const logs = new Function('Model', 'EVENT', 'ASKED', 'REFUSE_ABOVE', 'SAYING', 'CODE', 'HEAD', 'EVENTS', src)(
    Model, EVENT, asked, refuseAbove, saying, code, head, events);
  return { logs, asked, from, head };
}

const lineFor = h => new Function('DS', 'Model', `${PARTIAL_LINE}\nreturn partialLine;`)({ h }, Model)();

test('a window answered below a refusal counts as answered, though its logs are dropped', async () => {
  /* The newest window of the first batch is refused and the three below it succeed. Before the fix
     this threw, because the only successes were the dropped ones. */
  const w = walk({ refuseAbove: 995_000, head: 1_000_000 });
  const h = await w.logs('0xabc', [['0xaa']], 0, 1_000_000);
  assert.ok(h, 'the walk must not throw when the endpoint answered any window');
  assert.notEqual(h.partial, null, 'it stopped short, so it reports a boundary');
});

test('the logs kept are still only the contiguous run from the top', async () => {
  /* The behaviour that must NOT change: a success below a refusal is still discarded, or a hole sits
     below the boundary the line prints. The first batch's newest window is refused, so nothing from
     that batch is kept — and the boundary is the top of the range, not the bottom of the batch. */
  const w = walk({ refuseAbove: 995_000, head: 1_000_000 });
  const h = await w.logs('0xabc', [['0xaa']], 0, 1_000_000);
  const below = h.logs.map(l => Number(BigInt(l.blockNumber))).filter(b => b < h.partial);
  assert.deepEqual(below, [],
    `no log may be kept from below the boundary the line prints (${h.partial}), or a hole sits under `
    + `a number that claims everything above it was read; got ${JSON.stringify(below)}`);
  assert.ok(h.logs.length === 0 || Math.min(...h.logs.map(l => Number(BigInt(l.blockNumber)))) >= h.partial);
});

test('a walk refused at every window still reports nothing answered', async () => {
  /* The case `history unavailable` is actually for: `refuseAbove` of 0 refuses everything, so no
     window is answered anywhere and the throw is correct. */
  const w = walk({ refuseAbove: 0, head: 1_000_000 });
  await assert.rejects(() => w.logs('0xabc', [['0xaa']], 0, 1_000_000), /pruned history unavailable/);
});

test('a throttle below a refusal does not become "nothing answered" either', async () => {
  const w = walk({ refuseAbove: 995_000, saying: 'Rate limit exceeded. To obtain higher limits', code: -32005 });
  const h = await w.logs('0xabc', [['0xaa']], 0, 1_000_000);
  assert.ok(h, 'the endpoint answered three windows before the limit; that is not "nothing"');
  assert.equal(h.wall && h.wall.kind, 'throttle');
  assert.match(lineFor(h), /limiting requests/);
  assert.match(lineFor(h), /load older/, 'a throttle keeps the press');
});

test("the sentence for a real wall still names the block and offers no press", async () => {
  const w = walk({ refuseAbove: 995_000, saying: 'pruned history unavailable: requested 1, earliest available 996000' });
  const h = await w.logs('0xabc', [['0xaa']], 0, 1_000_000);
  const said = lineFor(h);
  assert.match(said, /serves no history before block 996000/);
  assert.doesNotMatch(said, /load older/, 'a named wall offers no press');
});
