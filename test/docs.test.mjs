/* The contract reference against the contract it describes, and the docs page's rail against its
   headings.

   Like `inline-scripts.test.mjs`, this reads sources rather than building anything: what is asserted
   is that `docs/REFERENCE.md` and `src/Distribution.sol` agree, and that `app/src/index.html`'s rail
   names the sections the article paints. The full ABI diff is M02 criterion 6's script; this file pins
   the struct byte for byte and spot-checks the tables against the `cast`-generated selector fixture. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const REF = read('docs/REFERENCE.md');
const PAGE = read('app/src/index.html');

/* A markdown table under `heading`: the rows after the `|:--` rule, up to the first blank line, each
   split on its pipes with the backticks taken off. The same shape the acceptance script reads. */
function table(heading) {
  const at = REF.indexOf(`\n${heading}\n`);
  assert.ok(at >= 0, `${heading} is not a heading in docs/REFERENCE.md`);
  const body = REF.slice(at + heading.length + 2).replace(/^\n+/, '').split('\n\n')[0];
  const lines = body.split('\n').filter(l => l.startsWith('|'));
  assert.ok(lines.length > 2 && /^\|:--/.test(lines[1]), `${heading} has no table under it`);
  return lines.slice(2).map(l => l.split('|').slice(1, -1).map(c => c.trim().replace(/^`|`$/g, '')));
}
const nameOf = sig => sig.replace(/\(.*/, '');

test('the snapshot struct in the reference is the contract\'s three declarations, verbatim', () => {
  const sol = read('src/Distribution.sol').split('\n');
  const first = sol.findIndex(l => l.trim() === 'struct Beneficiary {');
  const snapshot = sol.findIndex(l => l.trim() === 'struct Snapshot {');
  const close = sol.findIndex((l, i) => i > snapshot && l.trim() === '}');
  assert.ok(first >= 0 && snapshot > first && close > snapshot, 'the three structs are not where expected');
  /* The contract's declarations sit one level inside the contract body; the reference shows them at
     the margin. Dedented by the first line's indent, not trimmed, so the inner indents still count. */
  const declared = sol.slice(first, close + 1);
  const indent = declared[0].match(/^\s*/)[0];
  const m = REF.match(/```solidity\n([\s\S]*?)\n```/);
  assert.ok(m, 'docs/REFERENCE.md has no solidity block');

  const shown = m[1];

  assert.equal(shown, declared.map(l => l.startsWith(indent) ? l.slice(indent.length) : l).join('\n'));
});

test('every Distribution signature the selector fixture carries is in the function table', () => {
  /* The fixture is `cast`'s, so it is the oracle; it holds the factory's three and the owning-vault
     probe as well, and none of the public getters. */
  const FACTORY = ['create', 'predict', 'implementation'];
  const NOT_RAKE = ['isOwner'];
  const fixture = read('test/fixtures/abi/selectors.txt').trim().split('\n')
    .map(l => nameOf(l.split(' ')[0]))
    .filter(n => !FACTORY.includes(n) && !NOT_RAKE.includes(n));

  const shown = table('### Functions').map(r => nameOf(r[0]));

  assert.ok(fixture.length > 0, 'the selector fixture named no Distribution function');
  for (const fn of fixture) assert.ok(shown.includes(fn), `the function table is missing ${fn}`);
});

test('the factory table carries the factory signatures the fixture names', () => {
  const fixture = ['create', 'predict', 'implementation'];

  const shown = table('## DistributionFactory').map(r => nameOf(r[0]));

  for (const fn of fixture) assert.ok(shown.includes(fn), `the factory table is missing ${fn}`);
});

for (const heading of ['### Functions', '### Events', '### Errors', '## DistributionFactory']) {
  test(`${heading} is three non-empty cells per row, one row per name`, () => {
    const rows = table(heading);

    const names = rows.map(r => nameOf(r[0]));

    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.equal(r.length, 3, `${heading}: ${r[0]} does not carry exactly name, caller and effect`);
      for (const cell of r) assert.ok(cell, `${heading}: ${r[0]} has an empty cell`);
    }
    assert.deepEqual(names, [...new Set(names)], `${heading} names something twice`);
  });
}

test('the rail and the headings are the same thirteen sections, in one order', () => {
  const m = PAGE.match(/const SECTIONS\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(m, 'SECTIONS is not an array literal in app/src/index.html');
  const sections = new Function(`return ${m[1]}`)();

  const ids = [...PAGE.matchAll(/id="s-([a-z]+)"/g)].map(m => m[1]);

  assert.equal(sections.length, 13);
  assert.deepEqual(ids, sections.map(s => s[0]));
  assert.ok(ids.includes('widget'), 'the owner bar\'s widget link points at #/docs#widget');
});
