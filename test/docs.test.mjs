/* The docs page's reference section against the contract it describes.

   Like `inline-scripts.test.mjs`, this reads `app/src/index.html` as source rather than building it:
   what is asserted is that the page's data and the contract agree, and the build does not touch
   either. The full ABI diff is M02 criterion 6's script; this file pins the struct byte for byte and
   spot-checks the function list against the `cast`-generated selector fixture. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const PAGE = read('app/src/index.html');

/* The page holds its reference lists as plain array literals so this test and the acceptance script
   can both read them out of the source. Non-greedy to the first `];`, which is the array's own close. */
function arrayConst(name) {
  const m = PAGE.match(new RegExp(`const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  assert.ok(m, `${name} is not an array literal in app/src/index.html`);
  return new Function(`return ${m[1]}`)();
}
const nameOf = sig => sig.replace(/\(.*/, '');
const trimmed = s => s.split('\n').map(l => l.trim()).join('\n');

test('the snapshot struct on the page is the contract\'s three declarations, verbatim', () => {
  const sol = read('src/Distribution.sol').split('\n');
  const first = sol.findIndex(l => l.trim() === 'struct Beneficiary {');
  const snapshot = sol.findIndex(l => l.trim() === 'struct Snapshot {');
  const close = sol.findIndex((l, i) => i > snapshot && l.trim() === '}');
  assert.ok(first >= 0 && snapshot > first && close > snapshot, 'the three structs are not where expected');
  const declared = sol.slice(first, close + 1).join('\n');
  const m = PAGE.match(/const DOCS_STRUCT\s*=\s*('(?:[^'\\]|\\.)*');/);
  assert.ok(m, 'DOCS_STRUCT is not a single-quoted string in app/src/index.html');

  const shown = new Function(`return ${m[1]}`)();

  assert.equal(trimmed(shown), trimmed(declared));
});

test('every Distribution signature the selector fixture carries is in the function table', () => {
  /* The fixture is `cast`'s, so it is the oracle; it holds the factory's three and the owning-vault
     probe as well, and none of the public getters. */
  const FACTORY = ['create', 'predict', 'implementation'];
  const NOT_RAKE = ['isOwner'];
  const fixture = read('test/fixtures/abi/selectors.txt').trim().split('\n')
    .map(l => nameOf(l.split(' ')[0]))
    .filter(n => !FACTORY.includes(n) && !NOT_RAKE.includes(n));

  const shown = arrayConst('DOCS_FNS').map(r => nameOf(r[0]));

  assert.ok(fixture.length > 0, 'the selector fixture named no Distribution function');
  for (const fn of fixture) assert.ok(shown.includes(fn), `the function table is missing ${fn}`);
});

test('the factory table carries the factory signatures the fixture names', () => {
  const fixture = ['create', 'predict', 'implementation'];

  const shown = arrayConst('DOCS_FACTORY').map(r => nameOf(r[0]));

  for (const fn of fixture) assert.ok(shown.includes(fn), `the factory table is missing ${fn}`);
});

for (const name of ['DOCS_FNS', 'DOCS_EVENTS', 'DOCS_ERRORS', 'DOCS_FACTORY']) {
  test(`${name} is three non-empty cells per row, one row per name`, () => {
    const rows = arrayConst(name);

    const names = rows.map(r => nameOf(r[0]));

    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.equal(r.length, 3, `${name}: ${r[0]} does not carry exactly name, caller and effect`);
      for (const cell of r) assert.ok(cell && cell.trim(), `${name}: ${r[0]} has an empty cell`);
    }
    assert.deepEqual(names, [...new Set(names)], `${name} names something twice`);
  });
}

test('the rail and the headings are the same twelve sections, in one order', () => {
  const sections = arrayConst('SECTIONS');

  const ids = [...PAGE.matchAll(/id="s-([a-z]+)"/g)].map(m => m[1]);

  assert.equal(sections.length, 12);
  assert.deepEqual(ids, sections.map(s => s[0]));
});
