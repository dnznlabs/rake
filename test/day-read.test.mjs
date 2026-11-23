/* The last 24 hours, for a visitor with no wallet (step 5, amended 2026-11-23).
 *
 * Three claims, each of which was a defect waiting to happen:
 *
 *   the floor is a day of **time**, found from timestamps and never from an assumed block time.
 *     Ethereum spends ~12 s a block and Base ~0.2, so one constant cannot serve both: a day on
 *     Ethereum is 7,200 blocks and on Base 432,000. A page that assumed 12 s would show Base five
 *     minutes of history and call it a day.
 *   the heads say "last 24 hours" and a line offers the way to more.
 *   **no press without a wallet** — a day is the limit by design, so a button that walks past it
 *     would contradict the head above it.
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

const DAY_SECONDS = line('const DAY_SECONDS =');
const SEED_FLOOR = line('const seedFloor = hi =>');
const DAY_STEPS = line('const DAY_STEPS =');
const NOMINAL_SEC = line('const NOMINAL_SEC =');
const TS_TOLERANCE = line('const TS_TOLERANCE =');
const TS_OF = block('const tsOf = async n => {', '\n};\n');
const DAY_FLOOR = block('async function dayFloor(hi, floor) {');
const READ_FLOOR = block('async function readFloor(d, hi) {');
const PRESS = line('const press = () =>');
const MORE_LINE = line('const moreLine = () =>');
const PARTIAL_LINE = block('function partialLine() {');
const HIST_FILL = block('function histFill(id, items, empty) {');
const DAY_HEAD = block('const dayHead = full =>', "'about the last 24 hours';\n");

/** A synthetic chain: block `n` has timestamp `n * sec`, and every header read is counted. */
function chain({ sec, head, floor = 0, chainId = 1, nominal = null, missing = null }) {
  const reads = [];
  const src = `
    const P = {
      request: async ({ method, params }) => {
        if (method !== 'eth_getBlockByNumber') throw new Error('unexpected ' + method);
        const n = parseInt(params[0], 16);
        READS.push(n);
        /* A pooled backend that does not have the block answers null - the shape that took the whole
           history down on Sepolia on 2026-11-23 until tsOf stopped dereferencing it. No backticks in
           here: this comment lives inside a template literal. */
        if (MISSING && MISSING(n)) return null;
        return { timestamp: '0x' + Math.round(n * SEC).toString(16) };
      },
    };
    ${DAY_SECONDS}
    ${TS_TOLERANCE}
    ${DAY_STEPS}
    ${NOMINAL_SEC}
    const CFG = { factoryBlock: String(FLOOR), chainId: CHAIN_ID };
    /* A deliberately wrong seed when a test asks for one: the architect's bound has to hold when the
       nominal figure is out by a factor of ten, which is exactly what a stale Base entry would be. */
    if (NOMINAL_IN != null) NOMINAL_SEC[CHAIN_ID] = NOMINAL_IN;
    ${TS_OF}
    ${SEED_FLOOR}
    ${DAY_FLOOR}
    let DAYFLOOR = null;
    const FIRST = new Map();
    let WALLET = WALLET_IN;
    ${READ_FLOOR}
    return { dayFloor, readFloor, reads: () => READS, exact: () => DAY_EXACT };
  `;
  return { ...new Function('READS', 'SEC', 'FLOOR', 'WALLET_IN', 'CHAIN_ID', 'NOMINAL_IN', 'MISSING', src)(
    reads, sec, floor, false, chainId, nominal, missing), reads };
}

test('a day is found from timestamps, on a 12-second chain and a 0.2-second one alike', async () => {
  /* The same code, two chains five hundred blocks a day apart. A constant cannot pass both. */
  for (const [name, sec, head, want, chainId] of [
    ['Ethereum', 12, 20_000_000, 20_000_000 - 7_200, 1],
    ['Base', 0.2, 60_000_000, 60_000_000 - 432_000, 8453],
    ['Sepolia', 12.48, 12_000_000, 12_000_000 - Math.round(86_400 / 12.48), 11155111],
    ['Base Sepolia', 0.2, 62_000_000, 62_000_000 - 432_000, 84532],
  ]) {
    const c = chain({ sec, head, chainId });
    const got = await c.dayFloor(head, 0);
    /* Within the documented minute of tolerance, expressed in that chain's own blocks. */
    const slack = Math.ceil(60 / sec) + 1;
    assert.ok(Math.abs(got - want) <= slack,
      `${name}: a day before ${head} is about block ${want}, got ${got} (slack ${slack})`);
  }
});

test('finding it costs a handful of reads, not a bisection', async () => {
  /* A plain bisection over this range is ~26 reads, which is more than the history read it precedes.
     The secant steps measure the rate from real headers instead, so the cost is small — and the
     measuring is the reason it works on both chains above. */
  const head = 60_000_000;
  const c = chain({ sec: 0.2, head, chainId: 8453 });
  await c.dayFloor(head, 0);
  assert.ok(c.reads.length <= 8,
    `finding the day floor took ${c.reads.length} header reads: ${c.reads.join(', ')}`);
});

test('a history younger than a day is read whole, and costs two reads', async () => {
  const head = 1_000_000;
  const c = chain({ sec: 12, head, floor: head - 100 });   // 100 blocks = 20 minutes
  const got = await c.dayFloor(head, head - 100);
  assert.equal(got, head - 100, 'there is nothing to cut, so the floor is the distribution itself');
  assert.equal(c.reads.length, 2, 'the head and the floor, and no search at all');
});

test('the floor never goes below the distribution own first block', async () => {
  const head = 20_000_000;
  const own = head - 100;                                   // younger than a day
  const c = chain({ sec: 12, head, floor: own, chainId: 1 });
  const got = await c.readFloor({ addr: '0xabc' }, head);
  assert.equal(got, own);
});

test('a wallet is not held to a day: it reads from the distribution first block', async () => {
  const head = 20_000_000, own = 1_000;
  const src = `
    const FIRST = new Map();
    const CFG = { factoryBlock: String(OWN) };
    let WALLET = true;
    const dayFloor = async () => { throw new Error('a wallet must not pay for the day search'); };
    let DAYFLOOR = null;
    let DAY_EXACT = true;
    ${DAY_SECONDS}
    ${NOMINAL_SEC}
    ${SEED_FLOOR}
    ${READ_FLOOR}
    return readFloor;
  `;
  const readFloor = new Function('OWN', src)(own);
  assert.equal(await readFloor({ addr: '0xabc' }, head), own);
});

/** `histFill` over a history, in either wallet state, returning what it wrote. */
function fillFor({ h, items = [], wallet }) {
  const written = {};
  const src = `
    const HIST_SHOW = 10;
    const fill = (id, html) => { WRITTEN[id] = html; };
    const notice = (t, k) => '<div class="notice">' + t + '</div>';
    const histRows = xs => xs.map(() => '<div class="hrow">a row</div>').join('');
    const bindOlder = () => {};
    const document = { getElementById: () => null };
    ${PRESS}
    ${MORE_LINE}
    ${PARTIAL_LINE}
    ${HIST_FILL}
    return histFill;
  `;
  new Function('DS', 'Model', 'WRITTEN', 'WALLET', src)({ h }, Model, written, wallet)(
    'h-funds', items, 'nothing has arrived at this address yet.');
  return written['h-funds'];
}

test('with no wallet there is no press, whatever stopped the read', () => {
  for (const h of [
    { partial: 500, wall: null },                                        // out of budget
    { partial: 500, wall: { kind: 'throttle', block: 500 } },            // throttled
    { partial: 500, wall: { kind: 'depth', block: 500, stated: 400 } },  // a named wall
    { partial: null, wall: null },                                       // read it all
  ]) {
    const said = fillFor({ h, items: [{}], wallet: false });
    assert.doesNotMatch(said, /load older/,
      `a no-wallet section must offer no press; it said ${JSON.stringify(said)}`);
    assert.match(said, /connect a wallet to load more/,
      'and it must always offer the one route onward');
  }
});

test('with a wallet the press is back where it was, and the wallet line is gone', () => {
  const said = fillFor({ h: { partial: 500, wall: null }, items: [{}], wallet: true });
  assert.match(said, /load older/);
  assert.doesNotMatch(said, /connect a wallet to load more/);
});

test('a no-wallet read that fell short of its day says so, without promising more', () => {
  const said = fillFor({ h: { partial: 500, wall: null }, items: [{}], wallet: false });
  assert.match(said, /stopped at block 500, short of a full day/);
  assert.doesNotMatch(said, /load older/);
});

test('the four outcomes still speak for themselves without a wallet', () => {
  const throttled = fillFor({ h: { partial: 500, wall: { kind: 'throttle', block: 500 } }, items: [{}], wallet: false });
  assert.match(throttled, /limiting requests/, 'a throttle still says it is a throttle');
  const walled = fillFor({ h: { partial: 500, wall: { kind: 'depth', block: 500, stated: 400 } }, items: [{}], wallet: false });
  assert.match(walled, /serves no history before block 400/, 'a named wall still names its block');
});

/** `dayHead` in a given state, which is the one place a head's claim is decided. */
const headFor = ({ wallet, h, exact = true }) =>
  new Function('WALLET', 'DS', 'DAY_EXACT', `${DAY_HEAD}\nreturn dayHead;`)(wallet, { h }, exact)('every change this contract has seen');

test('both heads go through dayHead, so one place decides what they claim', () => {
  const heads = SHIPPED.slice(SHIPPED.indexOf('<div class="sechead"><b>changes</b>'));
  const changes = heads.slice(0, heads.indexOf('</div><div id="h-changes">'));
  const activity = heads.slice(heads.indexOf('<div class="sechead"><b>activity</b>'));
  for (const [name, text] of [['changes', changes], ['activity', activity.slice(0, activity.indexOf('</div><div id="h-funds">'))]]) {
    assert.match(text, /dayHead\(/, `the ${name} head must take its claim from dayHead`);
  }
});

test('with a wallet the head keeps its descriptive text', () => {
  assert.equal(headFor({ wallet: true, h: { partial: 500 } }), 'every change this contract has seen');
});

test('without a wallet a complete read says last 24 hours', () => {
  assert.equal(headFor({ wallet: false, h: { partial: null } }), 'last 24 hours');
});

test('a wall inside the 24-hour range changes the heading, because it would not be true', () => {
  /* The architect's ruling: the heading must be true when painted. Ethereum makes this the ordinary
     case — its endpoint serves about 10,000 blocks and a day is about 7,171, so a tightening of nine
     hours would stop every read short of its day. */
  const walled = headFor({ wallet: false, h: { partial: 9_000, wall: { kind: 'depth', block: 9_000 } } });
  assert.notEqual(walled, 'last 24 hours', 'a read that stopped short may not claim the day');
  assert.match(walled, /as far back as this endpoint served/);
});

test('a throttle or a budget stop changes it too, not only a named wall', () => {
  for (const h of [{ partial: 9_000, wall: null }, { partial: 9_000, wall: { kind: 'throttle', block: 9_000 } }]) {
    assert.notEqual(headFor({ wallet: false, h }), 'last 24 hours');
  }
});

test('while the read is still in flight the head states its intent, and the sections say loading', () => {
  /* `DS.h` is null before the first history pass lands. The sections read `loading…` at that point, so
     the head naming the window being read is the intent and not yet a claim; the repaint after
     `absorb` corrects it if the read fell short. */
  assert.equal(headFor({ wallet: false, h: null }), 'last 24 hours');
});

test('a seed wrong by ten times still lands on the right block inside the bound', async () => {
  /* The Base case, which is the reason the ruling says seed-then-confirm rather than seed: a nominal
     of 2 s against a chain that mints every 0.2 s puts the first guess 390,000 blocks off. The secant
     steps use the rate between two real headers, so the error is corrected rather than carried. */
  const head = 62_000_000, sec = 0.2, want = head - 432_000;
  const c = chain({ sec, head, chainId: 84532, nominal: 2 });     // ten times too slow
  const got = await c.dayFloor(head, 0);
  assert.ok(Math.abs(got - want) <= Math.ceil(60 / sec) + 1,
    `a tenfold-wrong seed must still land on about ${want}; got ${got}`);
  assert.ok(c.reads.length <= 2 + 4 + 2,
    `and inside the bound: ${c.reads.length} reads — ${c.reads.join(', ')}`);
});

test('a seed wrong the other way is corrected too', async () => {
  const head = 20_000_000, sec = 12, want = head - 7_200;
  const c = chain({ sec, head, chainId: 1, nominal: 1.2 });       // ten times too fast
  const got = await c.dayFloor(head, 0);
  assert.ok(Math.abs(got - want) <= Math.ceil(60 / sec) + 1, `expected about ${want}, got ${got}`);
});

test('a chain that stalls the secant falls back to bisection and still converges', async () => {
  /* The guarantee behind the bound: four secant tries, then a method that cannot fail. A
     piecewise-linear chain does **not** test this — the secant solves those in three reads, so an
     earlier version of this test passed with the fallback deleted.

     This one is convex where it matters: the last ten blocks each advance the clock 10,000 s while
     everything below advances it 1 s. So a day spans about **nine blocks**, the seed lands 7,200
     blocks away, and every secant step approaches from below and undershoots — the classic stall.
     Bisection is what finishes it. */
  const head = 1_000_000, KNEE = head - 10;
  const tOf = n => n <= KNEE ? n : KNEE + (n - KNEE) * 10_000;
  const reads = [];
  const src = `
    const P = { request: async ({ params }) => {
      const n = parseInt(params[0], 16);
      READS.push(n);
      return { timestamp: '0x' + TOF(n).toString(16) };
    } };
    ${DAY_SECONDS}
    ${TS_TOLERANCE}
    ${DAY_STEPS}
    ${NOMINAL_SEC}
    const CFG = { factoryBlock: '0', chainId: 1 };
    ${TS_OF}
    ${DAY_FLOOR}
    return dayFloor;
  `;
  const dayFloor = new Function('READS', 'TOF', src)(reads, tOf);
  const got = await dayFloor(head, 0);
  const target = tOf(head) - 86_400;
  let want = head;
  while (want > 1 && tOf(want - 1) >= target) want--;
  assert.equal(got, want,
    `it must converge on the first block at or after the target (${want}), not stop where the secant `
    + `left off; got ${got} after ${reads.length} reads`);
  assert.ok(reads.length < 40, `and terminate: ${reads.length} reads`);
});

test('the floor is searched once a page load and shared by the three log kinds', async () => {
  /* Three kinds read one history, and the floor is a property of the head they share. Searching it
     per kind would triple the cheapest part of the load for no new information. */
  const head = 20_000_000;
  const c = chain({ sec: 12, head, chainId: 1 });
  const a = await c.readFloor({ addr: '0xabc' }, head);
  const before = c.reads.length;
  const b = await c.readFloor({ addr: '0xabc' }, head);
  assert.equal(a, b);
  assert.equal(c.reads.length, before, 'the second call must read nothing at all');
});

test('and it is cleared wherever the head is, or a route entry serves a stale day', () => {
  /* A structural check, because `route` is the page's own entry point and not liftable here: the
     floor is a block measured against one head, so any place that invalidates `HEAD` must invalidate
     `DAYFLOOR` with it. */
  /* Assignments only. `let HEAD = null;` is the declaration and needs nothing beside it; the first
     version of this test matched it and failed on the page's own correct code. */
  for (const m of SHIPPED.matchAll(/(?<!let )\bHEAD = null;/g)) {
    const after = SHIPPED.slice(m.index, m.index + 220);
    assert.match(after, /DAYFLOOR = null;/,
      `a \`HEAD = null\` with no \`DAYFLOOR = null\` beside it: ${JSON.stringify(after.slice(0, 120))}`);
  }
});

test('a block one backend does not have is stepped around, not fatal', async () => {
  /* Measured, not imagined: on 2026-11-23 a Sepolia cold load read three headers, got
     `{"result":null}` on the third, and painted `history unavailable` across all three sections and
     the funds block — the outcome reserved for an endpoint that answered nothing at all, caused by
     one missing block. Here two thirds of all blocks are missing and the day is still found. */
  const head = 20_000_000, sec = 12, want = head - 7_200;
  const c = chain({ sec, head, chainId: 1, missing: n => n % 3 !== 0 });
  const got = await c.dayFloor(head, 0);
  assert.ok(Math.abs(got - want) <= Math.ceil(60 / sec) + 4,
    `the day must still be found around ${want}; got ${got}`);
});

test('when no header is readable at all, the read still happens — floored at the seed', async () => {
  /* Two rules at once. The floor search may never cost the page its history, which is what it did
     before: one rejection and `paintFailed` wrote `history unavailable`. **And the fallback is the
     seed, not the distribution's own block** — this test asserted the latter until the architect
     pointed out that with no wallet it is the deep walk the amendment exists to replace. A test that
     encodes the mistake is worse than no test. Here the distribution is younger than the seed, so the
     floor is the distribution and the day is not claimed exactly. */
  const head = 20_000_000, own = head - 1_000;
  const c = chain({ sec: 12, head, floor: own, chainId: 1, missing: () => true });
  assert.equal(await c.readFloor({ addr: '0xabc' }, head), own,
    'the floor never goes below the distribution itself');
});

test('an outright throw in the search is caught, and the read still happens at the seed', async () => {
  const own = 19_000_000;
  const src = `
    const FIRST = new Map();
    const CFG = { factoryBlock: String(OWN), chainId: 1 };
    let WALLET = false;
    let DAYFLOOR = null;
    let DAY_EXACT = true;
    ${DAY_SECONDS}
    ${NOMINAL_SEC}
    ${SEED_FLOOR}
    const dayFloor = async () => { throw new Error('the endpoint hung up'); };
    ${READ_FLOOR}
    return readFloor;
  `;
  const readFloor = new Function('OWN', src)(own);
  const head = 20_000_000, seed = head - Math.round(86_400 / 12);
  assert.equal(await readFloor({ addr: '0xabc' }, head), seed,
    'the seed bounds the walk; the distribution block, 19 million blocks down, would not');
});

test('the empty sentence names its window when there is no wallet', () => {
  /* Base Sepolia, all ten loads of the 08:50Z run: the page said "nothing has arrived at this
     address yet" about an address with four funds events 1.1 million blocks back. The head said
     "last 24 hours" and the line below offered a wallet, but the sentence between them was false. */
  const EMPTY_LINE = line('const emptyLine = (all, day) =>');
  const pick = wallet => new Function('WALLET', `${EMPTY_LINE}\nreturn emptyLine;`)(wallet);
  assert.equal(pick(false)('nothing has arrived at this address yet.', 'nothing has arrived in the last 24 hours.'),
    'nothing has arrived in the last 24 hours.');
  assert.equal(pick(true)('nothing has arrived at this address yet.', 'nothing has arrived in the last 24 hours.'),
    'nothing has arrived at this address yet.');
  /* And both sections go through it, rather than one being fixed and the other forgotten. */
  assert.match(SHIPPED, /histFill\('h-changes', DS\.h\.changes,\s*\n?\s*emptyLine\(/);
  assert.match(SHIPPED, /histFill\('h-funds', DS\.h\.funds,\s*\n?\s*emptyLine\(/);
});

test('a floor that could not be confirmed says "about", and never claims the day exactly', () => {
  /* The architect's ruling: an unconfirmed floor is a day's estimate, so the heading must not assert
     the day. The three states are distinct and the order matters — a read that stopped short says so
     whatever the floor was. */
  assert.equal(headFor({ wallet: false, h: { partial: null }, exact: true }), 'last 24 hours');
  assert.equal(headFor({ wallet: false, h: { partial: null }, exact: false }), 'about the last 24 hours');
  assert.equal(headFor({ wallet: false, h: { partial: 9_000 }, exact: false }), 'as far back as this endpoint served');
});

test('a search that fails entirely floors the walk at the seed, not at the distribution', async () => {
  /* The ruling this replaced a mistake of mine with: falling back to the distribution's own block is
     the deep walk the amendment exists to avoid — on Base, 40 windows a kind against a day's nine,
     reading far past what was ruled. The seed still bounds it. */
  const head = 20_000_000, own = 1_000;        // a distribution 20 million blocks old
  const src = `
    const FIRST = new Map();
    const CFG = { factoryBlock: String(OWN), chainId: 1 };
    let WALLET = false;
    let DAYFLOOR = null;
    let DAY_EXACT = true;
    ${DAY_SECONDS}
    ${NOMINAL_SEC}
    ${SEED_FLOOR}
    const dayFloor = async () => { throw new Error('the endpoint hung up'); };
    ${READ_FLOOR}
    return { readFloor, exact: () => DAY_EXACT };
  `;
  const m = new Function('OWN', src)(own);
  const got = await m.readFloor({ addr: '0xabc' }, head);
  const seed = head - Math.round(86_400 / 12);
  assert.equal(got, seed, `the floor must be the seed (${seed}), not the distribution (${own})`);
  assert.ok(got > own, 'and nothing below it is ever asked for, because the walk starts here');
  assert.equal(m.exact(), false, 'and the heading must say "about"');
});

test('the same when no header is readable, rather than a throw — and the claim is downgraded', async () => {
  const head = 20_000_000, own = 1_000;
  const c = chain({ sec: 12, head, floor: own, chainId: 1, missing: () => true });
  const got = await c.readFloor({ addr: '0xabc' }, head);
  const seed = head - Math.round(86_400 / 12);
  assert.equal(got, seed, `expected the seed ${seed}, got ${got}`);
  /* **Both halves, or the mutation passes.** Returning the seed without marking it unconfirmed leaves
     the heading claiming a day it never measured — which is the whole point of the flag, and what
     survived a mutation until this line existed. */
  assert.equal(c.exact(), false, 'an unmeasured floor must not be claimed as the exact day');
});

test("near()'s cost is the figure the comment states: 5 clamped, 9 free, 10 for the two anchors", async () => {
  /* The worst case is documented beside `DAY_STEPS`, so it is asserted rather than asserted-by-comment
     — and the first version of this test asserted **nine**, which the comment also said, and both were
     wrong. `near()` is clamped by the bracket it is given: the `hi` anchor can only walk *down* and the
     `floor` anchor only *up*, so each costs 5 and the pair costs 10, not 9. Nine is the free-space
     figure, which a mid-bracket step pays. A figure in a comment is worth exactly as much as the
     assertion under it. */
  const head = 20_000_000;
  const c = chain({ sec: 12, head, floor: 0, chainId: 1, missing: () => true });
  await c.dayFloor(head, 0);
  assert.equal(c.reads.length, 10,
    `the two clamped anchors should cost 5 each; they cost ${c.reads.length}: ${c.reads.join(', ')}`);
  assert.equal(new Set(c.reads).size, 10, 'all distinct — no block asked twice');
  assert.deepEqual(c.reads.slice(0, 5), [head, head - 1, head - 2, head - 3, head - 4],
    'the hi anchor walks downward only, because up is clamped to hi');
  assert.deepEqual(c.reads.slice(5), [0, 1, 2, 3, 4],
    'and the floor anchor upward only');
});

test('a mid-bracket step pays the free-space figure of nine', async () => {
  /* Anchors readable, everything in the middle missing: the first secant guess then walks ±4 and
     finds nothing, which is the 9 the comment claims for free space. */
  const head = 20_000_000, floor = 1_000_000;
  const c = chain({ sec: 12, head, floor, chainId: 1,
    missing: n => n !== head && n !== floor });
  await c.dayFloor(head, floor);
  const mid = c.reads.slice(2);                    // after the two anchors, which answer
  /* **Two groups of nine, not one.** The seeded secant step pays 9 and finds nothing, which breaks the
     step loop; bisection then takes its one probe and pays 9 for the same reason. So the free-space
     figure is confirmed at 9 *per attempt* — which is what the comment claims — and the total here is
     18 because two attempts are made. Asserting 9 was my own misreading of the control flow. */
  const seed = head - Math.round(86_400 / 12);
  assert.deepEqual(mid.slice(0, 9),
    [seed, seed - 1, seed + 1, seed - 2, seed + 2, seed - 3, seed + 3, seed - 4, seed + 4],
    'the secant step walks outward from the seed, nine blocks in free space');
  assert.equal(mid.length, 18, `one secant attempt and one bisection probe, nine each: ${mid.length}`);
  assert.equal(new Set(mid.slice(9)).size, 9, 'and the bisection probe pays the same nine');
});
