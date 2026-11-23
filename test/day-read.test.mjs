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
const TS_TOLERANCE = line('const TS_TOLERANCE =');
const TS_OF = block('const tsOf = async n =>', '\n})).timestamp));\n');
const DAY_FLOOR = block('async function dayFloor(hi, floor) {');
const READ_FLOOR = block('async function readFloor(d, hi) {');
const PRESS = line('const press = () =>');
const MORE_LINE = line('const moreLine = () =>');
const PARTIAL_LINE = block('function partialLine() {');
const HIST_FILL = block('function histFill(id, items, empty) {');

/** A synthetic chain: block `n` has timestamp `n * sec`, and every header read is counted. */
function chain({ sec, head, floor = 0 }) {
  const reads = [];
  const src = `
    const P = {
      request: async ({ method, params }) => {
        if (method !== 'eth_getBlockByNumber') throw new Error('unexpected ' + method);
        const n = parseInt(params[0], 16);
        READS.push(n);
        return { timestamp: '0x' + Math.round(n * SEC).toString(16) };
      },
    };
    ${DAY_SECONDS}
    ${TS_TOLERANCE}
    ${TS_OF}
    ${DAY_FLOOR}
    const FIRST = new Map();
    const CFG = { factoryBlock: String(FLOOR) };
    let WALLET = WALLET_IN;
    ${READ_FLOOR}
    return { dayFloor, readFloor, reads: () => READS };
  `;
  return { ...new Function('READS', 'SEC', 'FLOOR', 'WALLET_IN', src)(reads, sec, floor, false), reads };
}

test('a day is found from timestamps, on a 12-second chain and a 0.2-second one alike', async () => {
  /* The same code, two chains five hundred blocks a day apart. A constant cannot pass both. */
  for (const [name, sec, head, want] of [
    ['Ethereum-like', 12, 20_000_000, 20_000_000 - 7_200],
    ['Base-like', 0.2, 60_000_000, 60_000_000 - 432_000],
    ['Sepolia-like', 12.48, 12_000_000, 12_000_000 - Math.round(86_400 / 12.48)],
  ]) {
    const c = chain({ sec, head });
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
  const c = chain({ sec: 0.2, head });
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
  const c = chain({ sec: 12, head, floor: own });
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

test('the section heads say what was read, and only without a wallet', () => {
  /* Lifted as text because the heads are built inline in `paintDetail`'s template. */
  const heads = SHIPPED.slice(SHIPPED.indexOf('<div class="sechead"><b>changes</b>'));
  const changes = heads.slice(0, heads.indexOf('</div><div id="h-changes">'));
  const activity = heads.slice(heads.indexOf('<div class="sechead"><b>activity</b>'));
  for (const [name, text] of [['changes', changes], ['activity', activity.slice(0, activity.indexOf('</div><div id="h-funds">'))]]) {
    assert.match(text, /last 24 hours/, `the ${name} head must say what a no-wallet read covers`);
    assert.match(text, /WALLET \?/, `and must say it only when there is no wallet (${name})`);
  }
});
