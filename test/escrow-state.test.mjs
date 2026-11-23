/* Hidden escrow, detected exactly from state (step 5, amended 2026-11-23).
 *
 * The escrow rows are found from `Escrowed` logs and their amounts read from state, so a no-wallet
 * page — which now reads one day of logs — would simply not show an older escrow, and with it no
 * `release` and no `claim`. `_set` never clears `escrowed`, so an escrow also outlives its account's
 * removal from the table, which no amount of reading the table can find.
 *
 * `reserved[token]` closes it: three writers in `Distribution.sol`, each in lockstep with `escrowed`,
 * and the contract fuzz-tests the equality (`invariant_reservedEqualsEscrowSum`). So the difference
 * between `reserved` and the rows found is exactly what the read is missing, and the page already
 * reads `reserved` for every token it shows. Hence: equal costs nothing, larger asks the table's
 * accounts (paced), and any remainder is stated with its amount.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const POOL = block('async function pool(items, n, fn) {');
const INFLIGHT = line('const ESCROW_INFLIGHT =');
const READ_FUNDS = block('async function readFunds(d, funds) {');

const ZERO = '0x' + '0'.repeat(40);
const addr = n => '0x' + String(n).padStart(40, '0');

/** `readFunds` over a chain whose escrow state we choose, counting calls and peak concurrency.
 *
 *  `logs` are the `Escrowed` entries a history pass found — empty models the case that matters, a
 *  read whose logs do not reach the escrow. `state` is the real `escrowed` mapping. `reserved` is
 *  what the contract accounts for, which is the sum of `state` unless a test deliberately skews it.
 */
function run({ table = [], logs = [], state = {}, reserved = null, balance = 10n ** 18n }) {
  const calls = [];
  let live = 0, peak = 0;
  const src = `
    const ACC = null;
    const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const signsFor = async () => false;
    const decimalsOf = async () => 18;
    /* #403: the ETH balance is a read of the document's chain, so it comes from the page's provider.
       The wallet provider is left answering nothing, which is what the rule means: if readFunds ever
       reaches for it again these tests throw rather than quietly reading zero. No backticks in this
       comment - it lives inside a template literal, and one ended it. */
    const pageRead = () => ({ request: async () => '0x' + BALANCE.toString(16) });
    const P = { request: async () => { throw new Error('readFunds must not read state through the wallet (#403)'); } };
    const call = async (to, sig, args) => {
      CALLS.push(sig + ' ' + args.join(','));
      LIVE.n++; if (LIVE.n > LIVE.peak) LIVE.peak = LIVE.n;
      await new Promise(r => setTimeout(r, 1));
      LIVE.n--;
      if (sig === 'reserved(address)') return [RESERVED[args[0].toLowerCase()] ?? 0n];
      if (sig === 'escrowed(address,address)') return [STATE[args[0].toLowerCase() + ' ' + args[1].toLowerCase()] ?? 0n];
      if (sig === 'balanceOf(address)') return [BALANCE];
      throw new Error('unexpected ' + sig);
    };
    ${POOL}
    ${INFLIGHT}
    ${READ_FUNDS}
    return readFunds;
  `;
  const liveBox = { n: 0, peak: 0 };
  const st = {};
  for (const [k, v] of Object.entries(state)) st[k.toLowerCase()] = v;
  const res = {};
  const sums = {};
  for (const [k, v] of Object.entries(st)) {
    const tk = k.split(' ')[0];
    sums[tk] = (sums[tk] || 0n) + v;
  }
  for (const [tk, v] of Object.entries(reserved || sums)) res[tk.toLowerCase()] = v;
  const readFunds = new Function('CALLS', 'LIVE', 'STATE', 'RESERVED', 'BALANCE', 'ZERO', src)(
    calls, liveBox, st, res, balance, ZERO);
  return readFunds({ addr: addr(1), table }, logs).then(out => ({ ...out, calls, peak: () => liveBox.peak }));
}

const escrowLog = (token, account) => ({ kind: 'escrowed', token, account });

test('equal totals make no extra call: the common case costs nothing', async () => {
  /* One escrow, found from the logs, and `reserved` agrees. Nothing is hidden, so the table is never
     asked — which is the whole point of comparing before fanning out. */
  const ac = addr(7);
  const out = await run({
    table: [[addr(7), 5000], [addr(8), 5000]],
    logs: [escrowLog(ZERO, ac)],
    state: { [`${ZERO} ${ac}`]: 100n },
  });
  assert.equal(out.escrows.length, 1);
  assert.deepEqual(out.hidden, [], 'nothing is outstanding');
  const asks = out.calls.filter(c => c.startsWith('escrowed('));
  assert.equal(asks.length, 1,
    `only the log's own pair should be read; it also asked: ${asks.slice(1).join(' | ')}`);
});

test("a table account's escrow is painted with its controls when the log read missed it", async () => {
  /* The case a 24-hour read creates: the escrow exists, its account is still in the table, and no
     `Escrowed` log was in reach. `reserved` is larger than nothing, so the table is asked. */
  const ac = addr(7);
  const out = await run({
    table: [[addr(7), 5000], [addr(8), 5000]],
    logs: [],
    state: { [`${ZERO} ${ac}`]: 250n },
  });
  assert.equal(out.escrows.length, 1, 'the row is recovered from state');
  assert.equal(out.escrows[0].ac, ac);
  assert.equal(out.escrows[0].held, 250n);
  assert.deepEqual(out.hidden, [], 'and nothing is left unaccounted for');
});

test("a removed account's escrow is stated by amount, because nothing can name it", async () => {
  /* The case state cannot reach: the account was removed from the table, so it is in neither the
     logs nor the table, and only `reserved` knows it is there. */
  const gone = addr(99);
  const out = await run({
    table: [[addr(7), 5000], [addr(8), 5000]],
    logs: [],
    state: { [`${ZERO} ${gone}`]: 400n },
  });
  assert.equal(out.escrows.length, 0, 'it cannot be attributed to anyone');
  assert.equal(out.hidden.length, 1, 'but it is never silent');
  assert.equal(out.hidden[0].amount, 400n, 'and the amount is exact, from reserved');
  assert.equal(out.hidden[0].tk, ZERO);
});

test('a removed account and a table account at once: one row, one stated remainder', async () => {
  const here = addr(7), gone = addr(99);
  const out = await run({
    table: [[addr(7), 5000], [addr(8), 5000]],
    logs: [],
    state: { [`${ZERO} ${here}`]: 60n, [`${ZERO} ${gone}`]: 40n },
  });
  assert.deepEqual(out.escrows.map(e => [e.ac, e.held]), [[here, 60n]]);
  assert.equal(out.hidden.length, 1);
  assert.equal(out.hidden[0].amount, 40n, 'exactly the part no row could carry');
});

test('no more than four calls in flight on a 107-row table', async () => {
  /* `Distribution.MAX_BENEFICIARIES` is 107. An unpaced `Promise.all` here is 107 concurrent
     `eth_call`s — nine times the boot burst that already draws a rate limit out of these endpoints. */
  const table = Array.from({ length: 107 }, (_, i) => [addr(1000 + i), 93]);
  const gone = addr(99);
  const out = await run({ table, logs: [], state: { [`${ZERO} ${gone}`]: 1n } });
  assert.equal(out.peak(), 4, `peak concurrency was ${out.peak()}, not 4`);
  const asks = out.calls.filter(c => c.startsWith('escrowed('));
  assert.equal(asks.length, 107, 'every table account is asked exactly once');
  assert.equal(out.hidden[0].amount, 1n);
});

test('the fan-out does not run at all when nothing is hidden, even on a 107-row table', async () => {
  const table = Array.from({ length: 107 }, (_, i) => [addr(1000 + i), 93]);
  const out = await run({ table, logs: [], state: {} });
  const asks = out.calls.filter(c => c.startsWith('escrowed('));
  assert.equal(asks.length, 0, `it asked ${asks.length} accounts about an escrow that does not exist`);
  assert.deepEqual(out.hidden, []);
});

test('an account already found in the logs is not asked again', async () => {
  const seen = addr(7), gone = addr(99);
  const out = await run({
    table: [[addr(7), 5000], [addr(8), 5000]],
    logs: [escrowLog(ZERO, seen)],
    state: { [`${ZERO} ${seen}`]: 10n, [`${ZERO} ${gone}`]: 5n },
  });
  const asks = out.calls.filter(c => c.startsWith('escrowed('));
  const forSeen = asks.filter(c => c.toLowerCase().endsWith(seen.toLowerCase()));
  assert.equal(forSeen.length, 1,
    `once, for its own log row — not twice. All escrow reads were: ${asks.join(' | ')}`);
  assert.equal(out.hidden[0].amount, 5n);
});

test('the remainder line says what `reserved` accounts for, never what the contract holds', () => {
  /* The distinction is not pedantry. `reserved` is exact **accounting** — `invariant_reservedEqualsEscrowSum`
     — but whether the contract **holds** it is the separate `invariant_balanceCoversReserved`, which
     its own comment says is true only "because the excluded token class is excluded: a fee-on-transfer
     or rebasing balance is what would break it". So for a token arm "held" is a promise the page
     cannot make. For native ETH either word is true, and one word is used everywhere so no arm can
     drift. Asserted over the shipped source because it is a wording rule, and wording rules decay. */
  const line = block('const unlisted = (f.hidden || [])', ".join('');\n");
  assert.match(line, /accounted for in escrow/, 'the remainder must be stated as accounted for');
  assert.doesNotMatch(line, /\bis held in escrow\b/,
    'and never as held, which for a fee-on-transfer token would be a promise about the balance');
});
