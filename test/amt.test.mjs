/* `amt`, the dapp's one number formatter, against the token decimals it now takes (#43).

   `amt` lives in `app/src/index.html` rather than in `app/src/model.js`, so there is no module to
   import: like `widget.test.mjs` lifts the widget's `decode` out of its IIFE, this lifts the one
   declaration out of the page and evaluates it. The declaration depends on nothing but `BigInt`, so
   what runs here is the page's own text — a reformat fails with a sentence rather than passing
   against a copy that has drifted. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(root, 'app/src/index.html'), 'utf8');

const OPEN = 'const amt = (w, dec = 18) => {';
function lift() {
  const from = SRC.indexOf(OPEN);
  assert.ok(from >= 0, `app/src/index.html no longer declares \`${OPEN}\` — this test lifts that declaration`);
  const to = SRC.indexOf('\n};', from);
  assert.ok(to > from, 'the amt declaration no longer closes on a line of its own');

  return new Function(`${SRC.slice(from, to + 3)}\nreturn amt;`)();
}
const amt = lift();

test('18 decimals truncate to four places, as the ETH paths have always read', () => {
  const got = [
    amt(10n ** 18n),
    amt(1500000000000000000n),
    amt(1999999999999999999n),
    amt(10n ** 13n),
    amt(0n),
  ];

  assert.deepEqual(got, ['1.0000', '1.5000', '1.9999', '0.0000', '0.0000']);
});

test('18 is the default, so every ETH call site formats as before', () => {
  const got = ['0xde0b6b3a7640000', 1500000000000000000n, 0n].map(w => [amt(w), amt(w, 18)]);

  for (const [bare, explicit] of got) assert.equal(bare, explicit);
  assert.deepEqual(got.map(p => p[0]), ['1.0000', '1.5000', '0.0000']);
});

test('6 decimals read in the token\'s units, not in wei', () => {
  const got = [
    amt(1500000n, 6),
    amt(1000000n, 6),
    amt(1n, 6),
    amt(123456789n, 6),
  ];

  /* 1500000 of a 6-decimal token is 1.5 of it; through the old formatter it read `0.0000`, which is
     the wrong number #43 is about. */
  assert.deepEqual(got, ['1.5000', '1.0000', '0.0000', '123.4567']);
});

test('under four decimals the value scales up, so nothing is truncated away', () => {
  const got = [
    amt(1500n, 0),
    amt(1n, 0),
    amt(0n, 0),
    amt(1500n, 2),
    amt(15000n, 4),
  ];

  /* A 0-decimal token has no fractional part to lose: 1500 units are 1500, and the four places are
     the column's, not the token's. */
  assert.deepEqual(got, ['1500.0000', '1.0000', '0.0000', '15.0000', '1.5000']);
});

test('a token whose decimals() could not be read prints raw units, never a scaled guess', () => {
  const got = [
    amt(1500000n, null),
    amt(0n, null),
    amt('0x5b8d80', null),
  ];

  assert.deepEqual(got, ['1500000 raw', '0 raw', '6000000 raw']);
});

test('every amt() call that formats a token passes that token\'s decimals', () => {
  /* The other half of the fix: a call site that formats a token amount without its decimals prints a
     wrong number again, and the two that may stand bare are ETH's — the `Received` row and the meta
     strip's "waiting to distribute". */
  const bare = [...SRC.matchAll(/\bamt\(([^)]*)\)/g)].map(m => m[1]).filter(a => !a.includes(','));

  assert.deepEqual(bare.sort(), ['d.waiting', 'log.data']);
});

test('the decimals cache is seeded with ETH, so the funds block never calls the zero address', () => {
  const got = SRC.includes('const DECIMALS = new Map([[ZERO, 18]]);');

  assert.ok(got, 'DECIMALS is no longer seeded with [ZERO, 18] — an eth_call to 0x0 answers nothing');
});
