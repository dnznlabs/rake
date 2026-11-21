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
const LAYOUT = read('app/src/layout.html');

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

test('the rail and the headings are the same fifteen sections, in one order', () => {
  const m = PAGE.match(/const SECTIONS\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(m, 'SECTIONS is not an array literal in app/src/index.html');
  const sections = new Function(`return ${m[1]}`)();

  const ids = [...PAGE.matchAll(/id="s-([a-z]+)"/g)].map(m => m[1]);

  assert.equal(sections.length, 15);
  assert.deepEqual(ids, sections.map(s => s[0]));
  assert.ok(ids.includes('widget'), 'the owner bar\'s widget link points at #/docs#widget');
  /* ROADMAP decision 45: the Disclaimer is the *first* section, in the rail and in the article, so a
     visitor who reads one section reads that the software is alpha. Both ends are pinned because
     either alone would pass while the page disagreed with its own rail. */
  assert.equal(sections[0][0], 'disclaimer', 'the rail does not open with the Disclaimer');
  assert.equal(ids[0], 'disclaimer', 'the article does not open with the Disclaimer');
});

/* Decision 45: the four things the Disclaimer has to say, and the removal rule that makes the day the
   marker comes off a reading rather than a feeling. Asserted against the Disclaimer section rather
   than the whole page, so a sentence cannot drift into Limits — which says its own neighbouring
   things about upgrades and audits — and still pass. */
test('the Disclaimer says the four things decision 45 names, and when the marks come off', () => {
  const at = PAGE.indexOf('<h2 id="s-disclaimer">');
  assert.ok(at >= 0, 'the docs page has no Disclaimer heading');
  const dis = PAGE.slice(at, PAGE.indexOf('<h2 id="s-what">', at));

  // (1) alpha, (2) reviewed by the two methods and not audited, (3) no warranty, (4) immutable.
  assert.match(dis, /Alpha software\./);
  assert.match(dis, /two-model agent method/);
  assert.match(dis, /Slither/);
  assert.match(dis, /not audited/);
  assert.match(dis, /no warranty/);
  assert.match(dis, /immutable/);
  assert.match(dis, /not patched/, 'the Disclaimer does not say a found bug is not patched');
  assert.match(dis, /new address/, 'the Disclaimer does not say the remedy is a new address');
  // The one link the section carries, which is the repo's own copy and not the README's relative one.
  assert.ok(dis.includes('${REPO}/blob/main/SECURITY.md'), 'the Disclaimer does not link SECURITY.md');

  /* The removal rule, as three readings: the closeout plus ninety days, the `bug` issue search, and
     SECURITY.md's dispositions. Each is pinned, because a rule missing one of its three conditions
     reads as satisfiable earlier than it is. */
  assert.match(dis, /ninety days/);
  assert.match(dis, /closeout is merged/);
  assert.match(dis, /--label bug --state all/);
  assert.match(dis, /<code>fix<\/code> or <code>accepted<\/code>/);
  assert.match(dis, /no redeploy/, 'the removal rule does not say the marks come off without a redeploy');
});

/* Decision 23, reaffirmed 2026-11-07, and `SECURITY.md` F4: the token class the contract excludes,
   said on the page that lists what it does not do. Asserted against the Limits section rather than
   the whole document, so the sentence cannot drift into some other heading and still pass. */
test('the Limits section names the balance-falling tokens decision 23 excludes', () => {
  const at = PAGE.indexOf('<h2 id="s-limits">');
  assert.ok(at >= 0, 'the docs page has no Limits heading');
  const limits = PAGE.slice(at, PAGE.indexOf('<h2 id="s-developers">', at));

  assert.ok(limits.includes('rebasing or slashable'), 'the Limits section does not name rebasing or slashable tokens');
  assert.ok(
    limits.includes('under a shortfall the first account to take its escrow is paid in full and the last bears the loss'),
    'the Limits section names the token class but not what happens under a shortfall',
  );
  // One occurrence on the page, which is what the AC greps for.
  assert.equal((PAGE.match(/rebasing or slashable/g) || []).length, 1);
});

/* The version string's one source and its two readers, which is what AC 1's third clause reaches for.
   That clause counted `0.1alpha` in the built bundle and expected two, naming the footer and the docs
   eyebrow; but the source carries a single `__VERSION__`, substituted once into `CFG`, and the two
   "sites" are two runtime paints of `CFG.version`. The bundle therefore holds the literal once — it
   held `v0.1` once on `main` by the same arithmetic — so the grep could never read 2 without a second
   substitution site, which is the second source of the string step 1 exists to delete. This pins the
   shape the grep was trying to describe: one substitution, two readers. A paint site that stopped
   reading `CFG.version` and hardcoded a version would pass that grep and fail here, which is the
   whole point. */
test('the page has one version substitution and both paint sites read it', () => {
  // (a) Exactly one `__VERSION__`, and it is `CFG`'s `version:` rather than some other key.
  assert.equal((PAGE.match(/__VERSION__/g) || []).length, 1, 'the page does not carry exactly one __VERSION__');
  assert.ok(PAGE.includes("version: '__VERSION__'"), "__VERSION__ is not CFG's version value");

  // (b) Two readers of it, and no third: the footer line and the docs eyebrow.
  assert.equal(
    (PAGE.match(/\$\{CFG\.version\}/g) || []).length,
    2,
    'the page does not read CFG.version at exactly the two paint sites',
  );
  assert.ok(
    PAGE.includes("document.getElementById('ver').textContent = `dnzn labs · ${CFG.version}`"),
    'the footer does not paint CFG.version into #ver',
  );
  assert.ok(PAGE.includes('eyebrow(`docs · ${CFG.version}`)'), 'the docs eyebrow does not paint CFG.version');

  /* The footer node the first site writes into lives in the layout, not the page, so a layout edit
     that dropped the span would leave the paint site reading correctly into nothing. */
  assert.ok(LAYOUT.includes('id="ver"'), 'the layout carries no #ver span for the footer paint to write into');
});
