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
