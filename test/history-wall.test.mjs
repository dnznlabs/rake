/* What the page says when it could not read all the history (#382, step 5).

   Three outcomes have to be told apart, and before this they were two:

     out of budget   everything above the boundary is read, the rest is one `load older` away
     a wall          the endpoint refused older blocks; it will not serve them, so there is no
                     `load older` to offer, and the line says where it stopped and why
     nothing at all  no window was answered — the only case `history unavailable` is for

   The defect was that a refusal nobody recognised threw, and a throw painted `history unavailable`
   over all three sections and the funds block with them. On Base Sepolia the shape that did it was a
   **rate limit**: a 200-block cap forces thousands of windows, four in flight trip the endpoint's
   25-a-second limit, and its `HTTP 429` body is a bare `{code, message}` rather than a JSON-RPC
   `{"error":{…}}` — so `rpcProvider` raises its own sentence, which matches none of the four
   recognisers (`isWrappedRefusal` reads 413 alone).

   The walk is the page's own `logs`, driven through the page's own `capped` provider — the DEV helper
   written for exactly this, which refuses the way `sepolia.base.org` does. `partialLine` is lifted
   too, so what is asserted is the sentence a reader would have seen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Model from '../app/src/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

/* `from` says which text to lift out of: the shipped page for everything that ships, and the whole
   file for `capped`, which is a DEV affordance and is the instrument here rather than the subject. */
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

const LOGS = block('async function logs(address, topics, fromBlock, toBlock, prov) {');
const PARTIAL_LINE = block('function partialLine() {');
const PRESS = line('const press = () =>');
const MORE_LINE = line('const moreLine = () =>');
const STATED_FLOOR = block('const statedFloor = text =>', '\n};\n');
const CAPPED = block('const capped = (p, cap, prune, wrap) => ({', '\n});\n', PAGE);
const RANGEY = line('const RANGEY =');
const ERRTEXT = block('const errText = e =>', ".join(' · ');\n");
const HIST_OF = block('function histOf(raw) {');
const JOIN_LINE = line('  const join = (older_, newer_) =>').replace(/^\s*const join = /, '').replace(/;\s*$/, '');

/* `histOf` with only what it touches stubbed: it maps logs to rows through `entry`, which this test
   does not exercise, so the rows are empty and what is asserted is the boundary and the wall. */
const histOf = new Function('Model', 'ZERO', 'entry', 'tokenIn', 'newest', `${HIST_OF}\nreturn histOf;`)(
  Model, '0x0000000000000000000000000000000000000000', () => ({}), () => ({}), () => 0);

const EVENT = { blockNumber: '0x1', logIndex: '0x0', topics: ['0xaa'], data: '0x' };

/** The page's walk over a provider that refuses the way a real endpoint does.
 *
 *  `cap` and `prune` are the `capped` helper's own arguments. `rate` is the one shape `capped` does
 *  not model, because it is not about the range at all: a bare HTTP refusal with no JSON-RPC error
 *  body, which is what a 429 arrives as — it fires once the given number of requests have been made.
 */
const NO_CAP = 1_000_000_000;   // `capped` refuses anything wider than `cap`, so "no cap" is a large one, never 0
function walk({ cap = NO_CAP, prune = 0, rate = 0, head = 1_000_000, events = true, pruneSays = '',
                refuseAllSaying = '', refuseAfter = 0 } = {}) {
  const src = `
    const WINDOW_START = 10000, WINDOW_INFLIGHT = 4;
    let MAX_WINDOWS = 40;
    let asks = 0, served = 0;
    const base = {
      request: async ({ params }) => {
        asks++;
        if (RATE && asks > RATE) {
          // What \`rpcProvider\` raises for a status it cannot read a JSON-RPC error out of.
          throw { message: 'the RPC endpoint answered HTTP 429', data: { httpStatus: 429 } };
        }
        served++;
        return EVENTS ? [EVENT] : [];
      },
    };
    ${CAPPED}
    /* The capped helper's own prune refusal says only "pruned history unavailable". A real one often
       names the first block it keeps - "4444 pruned history unavailable: requested 360085, earliest
       available 1000000", measured on publicnode - and that number is better evidence than any
       boundary a walk arrives at. PRUNE_SAYS is that wording, applied in front of capped so that
       everything else about the provider is identical. No backticks in here: this comment lives
       inside a template literal, and the first one ended it. */
    const speaking = {
      request: async ({ method, params }) => {
        if (PRUNE_SAYS && method === 'eth_getLogs' && parseInt(params[0].fromBlock, 16) < PRUNE) {
          throw { code: 4444, message: PRUNE_SAYS };
        }
        return base.request({ method, params });
      },
    };
    /* An endpoint that refuses every window with a sentence of its own choosing, optionally after
       answering a few. This is where a cap that is zero, negative or not a number comes from: the
       page reads the digits out of whatever it was told. */
    const nonsense = {
      request: async ({ method, params }) => {
        asks++;
        if (method === 'eth_getLogs' && asks > REFUSE_AFTER) throw { code: -32614, message: REFUSE_ALL_SAYING };
        served++;
        return EVENTS ? [EVENT] : [];
      },
    };
    const P = REFUSE_ALL_SAYING ? nonsense : capped(PRUNE_SAYS ? speaking : base, CAP, PRUNE_SAYS ? 0 : PRUNE, 0);
    ${RANGEY}
    ${ERRTEXT}
    ${STATED_FLOOR}
    const head = async () => HEAD;
    function window1(address, topics, a, b) {
      return P.request({ method: 'eth_getLogs', params: [{ topics, fromBlock: '0x' + a.toString(16), toBlock: '0x' + b.toString(16) }] });
    }
    ${LOGS}
    return { logs, asks: () => asks, served: () => served };
  `;
  return new Function('Model', 'EVENT', 'CAP', 'PRUNE', 'RATE', 'HEAD', 'EVENTS', 'PRUNE_SAYS',
    'REFUSE_ALL_SAYING', 'REFUSE_AFTER', src)(
    Model, EVENT, cap, prune, rate, head, events, pruneSays, refuseAllSaying, refuseAfter);
}

/** `partialLine` over a given history result, so the assertion is the sentence, not a flag.
 *
 *  `wallet` defaults to **true**, which is the case these tests were written for: the four outcomes
 *  and their presses. The no-wallet page is a day deep by design and offers no press at all, which is
 *  `test/day-read.test.mjs`'s subject.
 */
function lineFor(h, wallet = true) {
  const src = `${PRESS}\n${MORE_LINE}\n${PARTIAL_LINE}\nreturn partialLine;`;
  return new Function('DS', 'WALLET', src)({ h }, wallet)();
}

test('a 200-block cap alone is the budget, not a wall: the line offers load older', async () => {
  const w = walk({ cap: 200, head: 1_000_000 });

  const r = await w.logs('0xabc', [['0xaa']], 0);

  assert.equal(r.wall, null, 'a range cap says nothing about what the endpoint keeps');
  assert.ok(r.partial > 0, 'the walk stopped on its budget and said where');
  const out = lineFor(r);
  assert.match(out, /load older/, 'out of budget is one press away, so the press must be offered');
  assert.match(out, new RegExp(`history before block ${r.partial} not loaded`));
});

test('a prune floor is a wall: it names the block, and offers no load older', async () => {
  const w = walk({ prune: 900_000, head: 1_000_000 });

  const r = await w.logs('0xabc', [['0xaa']], 0);

  assert.ok(r.wall, 'a refusal of old blocks is a wall');
  assert.equal(r.wall.kind, 'prune');
  const out = lineFor(r);
  assert.doesNotMatch(out, /load older/, 'the endpoint will not serve below it, so the button cannot work');
  assert.match(out, /A connected wallet reads through its own endpoint/);
});

test('where the refusal names the earliest block it keeps, that block is the boundary', async () => {
  // `capped`'s prune refusal carries the floor in the way a real one does.
  const w = walk({ prune: 900_000, head: 1_000_000 });

  const r = await w.logs('0xabc', [['0xaa']], 0);

  // `capped`'s prune refusal says only `pruned history unavailable`, naming no block — so the line
  // must not claim one, and the walk's own boundary stands as "not loaded below here".
  assert.equal(r.wall.stated, null);
  assert.match(lineFor(r), /may not serve history that far back/);

  // And where a refusal *does* name the block it keeps, that number wins over the walk's boundary.
  const named = walk({ prune: 900_000, head: 1_000_000, pruneSays: 'pruned history unavailable: requested 1, earliest available 900000' });
  const r2 = await named.logs('0xabc', [['0xaa']], 0);
  assert.equal(r2.wall.stated, 900_000, 'the endpoint describing itself beats a boundary a walk arrived at');
  assert.equal(r2.wall.block, 900_000);
  assert.match(lineFor(r2), /serves no history before block 900000/);
});

test('#382 end to end: the shape that killed the history read now keeps it', async () => {
  /* The exact refusal measured on `sepolia.base.org`: a 200-block cap forces thousands of windows,
     four in flight trip its 25-a-second limit, and the body is a bare `{code, message}` so
     `rpcProvider` raises its own `HTTP 429`. Measured 2026-11-23: 102 and 112 of 120 windows answered
     before it bit. Under the old code this threw and all three sections read `history unavailable`.

     It is classified a **throttle**, not a depth wall: a rate limit can be passed by asking again,
     which is why the press stays. That is a ruling of the architect's, 2026-11-23, and it is the
     difference between this test and the one it replaced. */
  const w = walk({ cap: 200, rate: 8, head: 1_000_000 });

  const r = await w.logs('0xabc', [['0xaa']], 0);

  assert.ok(r.logs.length > 0, 'what was read before the refusal is kept — this is the whole fix');
  assert.ok(r.wall, 'the walk stops and says so');
  assert.equal(r.wall.kind, 'throttle');
  const out = lineFor(r);
  assert.match(out, /limiting requests/);
  assert.match(out, /load older/, 'a rate limit can be waited out, so the press stays');
});

test('a refusal on the very first window, with nothing read, still fails — that is history unavailable', async () => {
  const w = walk({ cap: 200, rate: 0, head: 1_000_000, events: false });
  // `rate: 1` would answer one window; 0 here means the first request already refuses.
  const nothing = walk({ rate: -1, head: 1_000_000 });

  await assert.rejects(() => nothing.logs('0xabc', [['0xaa']], 0),
    'an endpoint that answered nothing at all is the one case `history unavailable` is for');
  // The control: the same walk with windows answered does not reject.
  const ok = await w.logs('0xabc', [['0xaa']], 0);
  assert.ok(ok.partial != null || ok.logs.length === 0);
});

test('forty answered windows holding no events is a read history, not an unavailable one', async () => {
  const w = walk({ head: 1_000_000, events: false });

  const r = await w.logs('0xabc', [['0xaa']], 0);

  assert.deepEqual(r.logs, [], 'nothing was found');
  assert.equal(r.wall, null, 'nothing refused anything');
  assert.ok(w.served() > 0, 'windows were answered');
  // This is the distinction `answered` exists for: no events is not no answer.
});

/* The fourth outcome. A depth wall cannot be passed by asking again; a rate limit can, so it keeps
   the press and says what actually happened. Every text driven here was measured against a real
   endpoint in step 1 — none is invented, which is the point: the shapes are outside our control. */
const THROTTLE_TEXTS = [
  'the RPC endpoint answered HTTP 429',                      // what rpcProvider raises for Base's body
  '25/second request limit reached',                         // sepolia.base.org
  '-32011 request limit reached',                            // mainnet.base.org
  '-32005 rate limit exceeded',                              // tenderly
  '-32016 over rate limit',                                  // flashbots
  '15 You reached Public endpoint rate limit, please upgrade to paid plan',   // drpc
];

test('a throttle after some answered windows keeps the press and names the limit', async () => {
  for (const says of THROTTLE_TEXTS) {
    const w = walk({ refuseAllSaying: says, refuseAfter: 8, head: 1_000_000 });

    const r = await w.logs('0xabc', [['0xaa']], 0);

    assert.ok(r.wall, `"${says}" should stop the walk`);
    assert.equal(r.wall.kind, 'throttle', `"${says}" is a rate limit, not a depth wall`);
    assert.ok(r.logs.length > 0, 'what was read before the limit is kept');
    const out = lineFor(r);
    assert.match(out, /limiting requests/, `"${says}" should say the endpoint is limiting requests`);
    assert.match(out, /load older/, 'asking again later can succeed, so the press stays');
    assert.doesNotMatch(out, /may not serve history that far back/,
      'a throttle says nothing about how much history the endpoint has');
  }
});

/* The negative case for the recogniser, because the digits in a refusal are not ours to control and
   `CAPS` reads numbers out of the same sentences. A width complaint that happens to carry 429 as a
   *figure* must stay a width complaint: classified as a throttle it would keep a press that cannot
   help and stop halving, which is the one move that does. */
test('429 as a figure in a width complaint is still a width complaint', async () => {
  for (const says of [
    '-32614 eth_getLogs is limited to a 429 range',
    'more than 429 results, use a narrower range',
    '-32701 exceed maximum block range: 42900',
  ]) {
    assert.equal(Model.isThrottle(says, {}), false, `"${says}" is about width, not rate`);

    // And through the walk: it halves and ends on the budget, with the press that a budget earns.
    const w = walk({ refuseAllSaying: says, refuseAfter: 8, head: 1_000_000 });
    const r = await w.logs('0xabc', [['0xaa']], 0);
    assert.notEqual(r.wall && r.wall.kind, 'throttle', `"${says}" must not be read as a rate limit`);
  }

  // The status code, where it is unambiguous, is still a throttle whatever the text says.
  assert.equal(Model.isThrottle('eth_getLogs is limited to a 429 range', { data: { httpStatus: 429 } }), true);
});

test('a throttle on every window is still nothing answered', async () => {
  for (const says of THROTTLE_TEXTS) {
    const w = walk({ refuseAllSaying: says, refuseAfter: 0, head: 1_000_000 });
    await assert.rejects(() => w.logs('0xabc', [['0xaa']], 0),
      `"${says}" with nothing answered is the history unavailable case`);
  }
});

test('a throttle is told apart from a depth wall, and the press is the difference', async () => {
  const throttled = walk({ refuseAllSaying: '-32005 rate limit exceeded', refuseAfter: 8, head: 1_000_000 });
  const pruned = walk({ prune: 900_000, head: 1_000_000 });

  const a = await throttled.logs('0xabc', [['0xaa']], 0);
  const b = await pruned.logs('0xabc', [['0xaa']], 0);

  assert.equal(a.wall.kind, 'throttle');
  assert.equal(b.wall.kind, 'prune');
  assert.match(lineFor(a), /load older/);
  assert.doesNotMatch(lineFor(b), /load older/);
});

test('a depth wall on one query outranks a throttle on the other', () => {
  // The group shares one press, so the half that cannot be passed decides: offering it because the
  // other query merely hit a rate limit would offer a press that cannot finish.
  const h = histOf({
    changes: { logs: [], partial: 500, wall: { block: 500, kind: 'prune', why: 'pruned history unavailable', stated: null } },
    funds: { logs: [], partial: 900, wall: { block: 900, kind: 'throttle', why: 'rate limit exceeded', stated: null } },
    ins: null,
  });

  assert.equal(h.wall.kind, 'prune', 'the wall that cannot be passed decides for the group');
  assert.doesNotMatch(lineFor(h), /load older/);
});

test('load older carries the wall, so a boundary does not become a budget on the next paint', () => {
  const join = new Function('older_', 'newer_', `return (${JOIN_LINE})(older_, newer_);`);
  const older_ = { logs: [1], partial: 400, wall: { block: 400, kind: 'prune', why: 'pruned', stated: null } };
  const newer_ = { logs: [2], partial: 900, wall: null };

  const joined = join(older_, newer_);

  assert.equal(joined.partial, 400, "the older half's boundary is the one that remains");
  assert.ok(joined.wall, 'and its wall with it — otherwise the next paint offers a press that cannot work');
  assert.equal(joined.wall.kind, 'prune');
});

test('the budget is unchanged: 40 windows per kind, 4 in flight (#165)', () => {
  assert.match(line('let MAX_WINDOWS ='), /=\s*40\b/, '#165 is out of scope for this task');
  assert.match(line('const WINDOW_INFLIGHT ='), /=\s*4\b/);
});

/* A cap arrives as whatever digits an endpoint chose to put in a sentence, and `CAPS`' regexes will
   match them. None of that is in our control, so none of it may reach `size` unchecked: a window of
   zero or fewer yields no windows at all, and the walk then read `batch[-1][0]` and threw a
   `TypeError` out of itself — the one failure the page cannot describe. Found by passing `cap: 0` to
   the `capped` helper by mistake, which is exactly how a real endpoint would do it. */
test('a cap of zero, negative, or no number at all halves instead of crashing', async () => {
  for (const says of [
    'eth_getLogs is limited to a 0 range',
    'eth_getLogs is limited to a -5 range',
    'eth_getLogs is limited to a lot range',
    'eth_getLogs is limited to a 00000 range',
  ]) {
    const w = walk({ refuseAllSaying: says, head: 1_000_000 });
    /* Nothing is ever answered here, so the walk must end in the one honest way: a thrown error that
       paints `history unavailable`. What it must never do is throw a `TypeError` from inside itself. */
    await assert.rejects(
      () => w.logs('0xabc', [['0xaa']], 0),
      e => {
        assert.ok(!(e instanceof TypeError), `"${says}" crashed the walk: ${e && e.message}`);
        return true;
      },
      `"${says}" must end the walk, not break it`,
    );
  }
});

test('a cap of zero does not stop a walk that had already read something', async () => {
  // The same nonsense cap, but after eight windows have been answered: what was read is kept and the
  // stop is described, rather than the whole read dying on an endpoint's bad arithmetic.
  const w = walk({ refuseAllSaying: 'eth_getLogs is limited to a 0 range', refuseAfter: 8, head: 1_000_000 });

  const r = await w.logs('0xabc', [['0xaa']], 0);

  assert.ok(r.logs.length > 0, 'what was read before the nonsense is kept');
  assert.ok(r.partial != null, 'and the boundary is still a number');
});

test('statedFloor reads the block an endpoint names, and nothing else', () => {
  const f = new Function(`${STATED_FLOOR}\nreturn statedFloor;`)();
  assert.equal(f('4444 pruned history unavailable: requested 360085, earliest available 1000000'), 1_000_000);
  assert.equal(f('pruned history unavailable'), null);
  assert.equal(f('exceed maximum block range: 50000'), null, 'a range cap is not a floor');
  assert.equal(f(''), null);
  assert.equal(f(null), null);
});
