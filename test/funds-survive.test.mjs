/* A failed log read may not take the funds block with it.
 *
 * Found by the Product Owner on Base Sepolia, 2026-11-23: his wallet's default endpoint
 * (`sepolia.base.org`) caps `eth_getLogs` at 200 blocks and rate-limits the walk, so the history read
 * threw — and `paintFailed` replaced the **whole funds block** with one error line. The page showed
 * `waiting to distribute Ξ0.0100` in its header and offered no way to do it.
 *
 * The ETH row and its `distribute` control owe nothing to the logs: the token list always begins with
 * ETH unconditionally, its balance comes from `eth_getBalance` and its reserved amount from
 * `reserved(address)`. And `distribute` is permissionless (decision 11, #26) — it is the one control
 * every visitor can use, on the page whose purpose is distributing funds.
 *
 * Measured either side of the fix, same page, same refusal, every `eth_getLogs` rejected:
 * **0 distribute buttons before, 1 after**, with the two history sections still saying
 * `history unavailable`, which is correct because the logs genuinely did fail.
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

const PAINT_FAILED = block('function paintFailed() {');
const PAINT_FUNDS = block('function paintFunds() {');

test('paintFailed does not touch the funds block', () => {
  /* The defect in one line: it used to `fill('funds', …)` with a notice, destroying the ETH row and
     its control along with the token list the notice was actually about. */
  assert.doesNotMatch(PAINT_FAILED, /fill\('funds'/,
    'paintFailed writes to the funds block again — the ETH row and `distribute` come from state and '
    + 'must survive a log failure');
  // It should still say the two history sections are unavailable, which is true of them.
  assert.match(PAINT_FAILED, /h-changes/);
  assert.match(PAINT_FAILED, /history unavailable/);
});

test('the failure path re-reads the funds with no logs at all', () => {
  /* `readFunds(d, [])` is what makes the ETH row appear without a history: an empty log list gives
     `tokens = [ZERO]`, and the `reserved` comparison then states any escrow it cannot attribute
     rather than hiding it. */
  const at = SHIPPED.indexOf('DS.failed = true;');
  assert.ok(at > 0, 'the history failure path has moved — this test anchors on it');
  const after = SHIPPED.slice(at, at + 1400);
  /* **Matched on the call, not the name.** The first version of this asserted `readFunds(d, [])`,
     which also appears in the comment four lines above it — so deleting the call left the test green.
     An assertion that can be satisfied by prose is not an assertion. */
  assert.match(after, /readFunds\(d, \[\]\)\.then\(/,
    'the failure path no longer *calls* readFunds(d, []), so a log failure hides the balance again');
  assert.match(after, /paintFunds\(\)/, 'and it must paint what it read');
});

/** `paintFunds` with everything it touches stubbed, so the subject is what it does with `DS.h`. */
function paintFundsWith(h) {
  const written = {};
  const seen = {};
  const src = `
    const fill = (id, html) => { WRITTEN[id] = html; };
    const fundsHTML = (d, f, other) => { SEEN.other = other; return 'FUNDS(' + (f && f.rows ? f.rows.length : 0) + ')'; };
    const partialLine = () => '';
    const moreLine = () => '';
    const bindOthers = (d, other) => { SEEN.bound = other; };
    const bindClaims = () => {};
    const bindOlder = () => {};
    const TOKEN = 1;
    ${PAINT_FUNDS}
    return paintFunds;
  `;
  new Function('DS', 'WRITTEN', 'SEEN', src)({ d: { addr: '0xabc' }, f: { rows: [{}] }, h }, written, seen)();
  return { written, seen };
}

test('paintFunds paints when the history never landed, rather than throwing on it', () => {
  /* `DS.h` is null on the state-only repaint. Reading `DS.h.other` unguarded threw here and left the
     block empty, which is the second half of the same defect. */
  const { written, seen } = paintFundsWith(null);
  assert.equal(written.funds, 'FUNDS(1)', 'the funds block must be written from what state gave');
  assert.equal(seen.other, null, 'and the incoming-token list is null, which fundsHTML describes');
  assert.equal(seen.bound, null, 'the binder gets the same null rather than a thrown read');
});

test('and it still passes the real token list through when the history did land', () => {
  const other = [{ token: '0xdead' }];
  const { written, seen } = paintFundsWith({ partial: null, other });
  assert.equal(written.funds, 'FUNDS(1)');
  assert.equal(seen.other, other, 'a successful history must still reach fundsHTML unchanged');
});

/* The sentence the funds block prints about its own token list, lifted whole — to its `;`, not to
   its first newline, because since #400 it spans three lines. The surrounding `fundsHTML` reaches
   for a dozen helpers this test has no business stubbing, which is why only this declaration is
   taken. `readWhole` comes with it: the sentence is keyed on what was read. */
const WINDOWED = (() => {
  const at = SHIPPED.indexOf('const windowed = ');
  assert.ok(at >= 0, 'app/src/index.html no longer declares `windowed` — this test lifts it');
  const end = SHIPPED.indexOf(';\n', at);
  assert.ok(end > at, '`windowed` is no longer a single declaration');
  return SHIPPED.slice(at, end + 1);
})();
const READ_WHOLE = (() => {
  const at = SHIPPED.indexOf('const readWhole = () =>');
  assert.ok(at >= 0, 'app/src/index.html no longer declares `readWhole` — this test lifts it');
  return SHIPPED.slice(at, SHIPPED.indexOf('\n', at));
})();
const windowedIn = (wallet, h) =>
  new Function('WALLET', 'DS', `${READ_WHOLE}\n${WINDOWED}\nreturn windowed;`)(wallet, { h });

test('with no wallet and no history, the list claims no window at all', () => {
  /* The architect's finding on the first head: the state-only repaint still said "this list covers
     the last 24 hours", and in that path **no log was read** — a claim about a read that never
     happened, which is the same fault as a heading claiming a day it did not reach. */
  assert.equal(windowedIn(false, null), '',
    'a funds block painted from state alone must not claim a 24-hour window');
});

test('with no wallet and a history that landed, it still says what the list covers', () => {
  assert.match(windowedIn(false, { partial: null }), /covers the last 24 hours/,
    'the honest case must keep its sentence, or the fix has removed a true statement');
});

test('a wallet gets the same window, and a way onward it actually has (#400)', () => {
  /* It used to say nothing to a wallet, because a wallet's first read went to the factory block. Now
     every first read is a day deep, so the sentence is the same for everyone — only the instruction
     at the end of it differs, because “connect a wallet” is not a control a connected wallet has. */
  const said = windowedIn(true, { partial: null });
  assert.match(said, /covers the last 24 hours/, 'a wallet page reads the same day and must say so');
  assert.match(said, /load older/, 'and must point at the control it has');
  assert.doesNotMatch(said, /Connect a wallet/);
  assert.doesNotMatch(windowedIn(false, { partial: null }), /load older/,
    'while a page with no wallet keeps the sentence it had');

  // A state-only repaint still claims no window, wallet or not: no log was read in that path.
  assert.equal(windowedIn(true, null), '');
  // And a press that reached the first block has no window left to name.
  assert.equal(windowedIn(true, { pressed: true, partial: null }), '');
});
