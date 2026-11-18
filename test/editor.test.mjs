/* `editorState`, the one validator both write paths use, against the two findings of the
   2026-11-17 front-end audit that reach it.

   R7 (`audits/2026-11-17/frontend/AUDIT.md:233-250`, leg 1's only solo Medium): the editor checked
   the decimal total within 0.005 while `Model.tableFrom` rounds each row to integer basis points on
   its own, so the sum the chain receives was never the sum that was checked. Three rows at 33.334%
   total 100.002%, which the tolerance accepted, and encode as 9999 bps. Behind a non-zero delay
   `propose` queues that table and only `applyQueued` refuses it, after the whole delay.

   R5 (`AUDIT.md:193-212`, both legs): every other address field on the page refuses an address whose
   mixed-case checksum is wrong. This editor showed the same warning and left Deploy and Queue
   enabled, so it encoded the 20 bytes of a mistyped address — and `distribute` is permissionless,
   so a payout to the mistyped row can happen as soon as the table is in force.

   Like `ext.test.mjs` and `amt.test.mjs`, this reads the page rather than building anything: the
   region from `EMPTY_ROW` through the end of `editorState` is lifted out of `app/src/index.html` and
   evaluated, so what runs here is the page's own text. `S`, `isAddr`, `checksumOk`, `BAD_SUM`, `ZERO`
   and `Eth` are the only globals the lifted region touches, and they are passed in. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');

/* The editor block, lifted whole: the sum check and the refusals it guards have to come out of the
   file together, or this passes against a validator the page no longer applies. */
const OPEN = 'const EMPTY_ROW = () =>';
const CLOSE = "return { ok: true, total, why: 'sent ascending by address";
function lift() {
  const from = PAGE.indexOf(OPEN);
  assert.ok(from >= 0, `app/src/index.html no longer declares \`${OPEN}\` — this test lifts from there`);
  const at = PAGE.indexOf(CLOSE, from);
  assert.ok(at > from, 'editorState no longer ends on the ascending-order sentence');
  /* Past the closing brace of `editorState` itself: the sentence is its last statement, and a lift
     that stopped at the end of that line would evaluate an unterminated function. */
  const to = PAGE.indexOf('\n}', at) + 2;
  assert.ok(to > at, 'editorState no longer closes on a line of its own');

  const body = `${PAGE.slice(from, to)}\nreturn { editorState, pctTotal, barRows };`;

  return new Function('S', 'isAddr', 'checksumOk', 'BAD_SUM', 'ZERO', 'Eth', body)(
    { maxRows: 50 },
    v => /^0x[0-9a-fA-F]{40}$/.test(v),
    v => { const h = v.slice(2); return h === h.toLowerCase() || h === h.toUpperCase() || Eth.checksum(v) === v; },
    'checksum does not match — a character is likely wrong',
    '0x' + '0'.repeat(40),
    Eth,
  );
}
const { editorState } = lift();

/* The three globals above are the page's own declarations, so they are pinned against it: a page
   that changes `checksumOk` or `BAD_SUM` and leaves this test's copy behind would pass here and
   refuse something else on screen. */
test('the lifted globals are still the page\'s own', () => {
  for (const decl of ['const isAddr = v => /^0x[0-9a-fA-F]{40}$/.test(v);', 'const BAD_SUM = \'checksum does not match — a character is likely wrong\';']) {
    assert.ok(PAGE.includes(decl), `app/src/index.html no longer declares:\n${decl}`);
  }
  assert.ok(PAGE.includes('const checksumOk = v => { const h = v.slice(2); return h === h.toLowerCase() || h === h.toUpperCase() || Eth.checksum(v) === v; };'),
    'app/src/index.html no longer declares checksumOk as this test copies it');
});

const BAD_SUM = 'checksum does not match — a character is likely wrong';
const ZERO = '0x' + '0'.repeat(40);
/* Three distinct, well-formed, checksummed addresses, in the ascending order the contract wants. */
const A = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const B = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const C = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const row = (addr, pct, name = 'ops') => ({ name, note: '', addr, pct: String(pct) });

test('a table that rounds to 9999 bps is refused, with the shortfall the contract would read', () => {
  /* Leg 1's reproduction. The decimals total 100.002%, which the old tolerance accepted. */
  const st = editorState([row(A, 33.334), row(B, 33.334), row(C, 33.334)]);

  assert.equal(st.ok, false);
  assert.match(st.why, /unassigned/, st.why);
  /* The sentence names the basis-point shortfall, not the decimal overage: 10000 − 9999 = 1 bps. */
  assert.match(st.why, /0\.01%/, st.why);
});

test('the three shares that do encode to 10000 bps pass', () => {
  const st = editorState([row(A, 33.33), row(B, 33.33), row(C, 33.34)]);

  assert.equal(st.ok, true, st.why);
});

test('a negative share is refused even when the rounded sum is exactly 10000', () => {
  /* −10 and 110 sum to 100, so this reaches the negative check only because that check exists. */
  const st = editorState([row(A, -10), row(B, 110)]);

  assert.equal(st.ok, false);
  assert.match(st.why, /negative/, st.why);
});

test('a beneficiary address with a flipped case says what the owner field says', () => {
  const flipped = A.slice(0, 2) + (A[2] === 'c' ? 'C' : 'c') + A.slice(3);
  assert.notEqual(flipped, A, 'the fixture did not flip a letter');

  const st = editorState([row(flipped, 50), row(B, 50)]);

  assert.equal(st.ok, false);
  assert.equal(st.why, BAD_SUM);
});

test('the all-lowercase form of the same address is accepted, as checksumOk says', () => {
  /* One case throughout carries no checksum, so it cannot be wrong. */
  const st = editorState([row(A.toLowerCase(), 50), row(B, 50)]);

  assert.equal(st.ok, true, st.why);
});

test('the zero address is refused, which isAddr alone does not do', () => {
  const st = editorState([row(ZERO, 50), row(B, 50)]);

  assert.equal(st.ok, false);
  assert.match(st.why, /zero address/, st.why);
});

/* The refusals that were already there, so a reordering of the checks above cannot silently drop
   one of them. */
test('the duplicate, zero-share and row-cap refusals still answer', () => {
  assert.match(editorState([row(A, 50), row(A, 50)]).why, /share an address/);
  assert.match(editorState([row(A, 0), row(B, 100)]).why, /above zero/);
  assert.match(editorState(Array.from({ length: 51 }, (_, i) => row(A, i === 0 ? 50 : 1))).why, /share an address|at most 50/);
  assert.match(editorState([row(A, 50), row(B, 50, '')]).why, /needs a name and address/);
});
