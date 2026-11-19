/* `loadHeir` and `heirRow`, the successor read and the one row it costs the page (#241).

   The finding: a one-row table at 100 % is a forward (decision 6), so `detail` reads the target it
   forwards to. That read went through `loadDistro`, which answers `missing` for an address with no
   code and `foreign` for code that is not a clone — but it has no answer at all for a target that
   *rejects*: an `eth_call` that reverts, or an `eth_getCode` a provider refuses. The rejection
   propagated out of the `Promise.all` in `detail`, past the paint, and the whole page stayed on
   `reading 0x…` for a successor that was never more than one line of it. #241's own finding is that
   the trigger set is unreachable through `isClone` alone, which answers first — "has code" is not a
   proxy for "answers", least of all since EIP-7702 puts code on an account that is no contract.

   Like `ext.test.mjs`, this reads the page rather than building anything: the two declarations are
   lifted out of `app/src/index.html` and evaluated, so what runs here is the page's own text. Their
   five free names — `loadDistro`, `errText`, `ext`, `esc` and `short` — are passed in as stubs, which
   is what lets the rejection be served without a chain. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');

const NEXT = '0x71a4221974Fc2E95081AE513248918dF27CF7a4A';

/* One declaration at a time, the way `ext.test.mjs` lifts `esc` and `short`: both of these are
   single statements, and lifting each on its own keeps the test honest about which one it is reading.
   `heirRow` spans the lines of its three branches, so it is taken to the first line that closes the
   template rather than to the first newline. */
function lift(loadDistro) {
  const one = anchor => {
    const at = PAGE.indexOf(anchor);
    assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
    return PAGE.slice(at, PAGE.indexOf('\n', at));
  };
  const rowAt = PAGE.indexOf('const heirRow =');
  assert.ok(rowAt >= 0, 'app/src/index.html no longer declares `const heirRow =` — this test lifts it');
  const rowEnd = PAGE.indexOf('</div>`;', rowAt);
  assert.ok(rowEnd > rowAt, 'the heirRow declaration no longer ends on its closing div');

  const body = `${one('const loadHeir =')}\n${PAGE.slice(rowAt, PAGE.indexOf('\n', rowEnd))}\n`
    + 'return { loadHeir, heirRow };';

  return new Function('loadDistro', 'errText', 'ext', 'esc', 'short', body)(
    loadDistro,
    e => String((e && e.message) || e),
    (kind, v, text) => `<span data-addr="${v}">${text}</span>`,
    s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
    a => a.slice(0, 6) + '…' + a.slice(-4));
}

/* The one shape `loadDistro` has no answer for. `execution reverted` is what the dev `rpcProvider`
   throws for a revert and what a wallet's wrapper carries in `message`. */
const rejects = () => lift(() => Promise.reject(new Error('execution reverted')));
const resolves = d => lift(() => Promise.resolve(d));

test('loadHeir answers a rejected read instead of rejecting with it', async () => {
  const { loadHeir } = rejects();

  /* `doesNotReject` is the defect, stated: before the `.catch` this promise rejected, and the
     `Promise.all` in `detail` carried the rejection past the paint. */
  await assert.doesNotReject(() => loadHeir(NEXT));
  assert.deepEqual(await loadHeir(NEXT), { addr: NEXT, rejected: true, why: 'execution reverted' });
});

test('loadHeir passes a readable distribution straight through', async () => {
  const d = { addr: NEXT, description: 'x' };
  const { loadHeir } = resolves(d);

  assert.equal(await loadHeir(NEXT), d, 'the readable answer is the object loadDistro returned, untouched');
});

test('heirRow links a readable heir by its description', () => {
  const { heirRow } = resolves();
  const out = heirRow(NEXT, { description: 'DNZN fees' });

  assert.ok(out.includes(`href="#/distros/${NEXT}"`), out);
  assert.ok(out.includes('forwards everything it receives.'), out);
  assert.ok(out.includes('DNZN fees'), out);
});

/* The three unreadable shapes, one row each: a reader is told the same thing by all three — there is
   nothing at the other end of this forward that this page can show — and none of them is a link. */
test('heirRow names a missing heir and links nowhere', () => {
  const { heirRow } = resolves();
  const out = heirRow(NEXT, { missing: true });

  assert.ok(out.includes("not a distribution of this app's factory"), out);
  assert.ok(!out.includes('href="#/distros/'), `a target with no code is still offered as a link:\n${out}`);
});

test('heirRow names a foreign heir and links nowhere', () => {
  const { heirRow } = resolves();
  const out = heirRow(NEXT, { foreign: true });

  assert.ok(out.includes("not a distribution of this app's factory"), out);
  assert.ok(!out.includes('href="#/distros/'), `a contract that is not a clone is still offered as a link:\n${out}`);
});

test('heirRow names a heir whose read rejected and links nowhere', () => {
  const { heirRow } = resolves();
  const out = heirRow(NEXT, { addr: NEXT, rejected: true, why: 'execution reverted' });

  assert.ok(out.includes("not a distribution of this app's factory"), out);
  /* The red this row plants, as measured: with `|| heir.rejected` dropped from the condition the link
     branch runs and the row offers `#/distros/<target>` for a target this page has just failed to
     read — and because `esc` maps a null description to `''` rather than to the string `undefined`,
     the anchor is empty, so the row is a link with no label on it. */
  assert.ok(!out.includes('href="#/distros/'), `a read that rejected is still offered as a link:\n${out}`);
  assert.ok(out.includes(`data-addr="${NEXT}"`), `the address is not printed through ext:\n${out}`);
});

/* The fourth shape, which is not a target's at all: `detail`'s first paint of a superseded table has
   the successor's address out of the table and no read of it yet, so the row exists before the answer
   does. Without this branch that paint reads `heir.missing` off `null` and throws. */
test('heirRow draws the row from the address alone before the read lands', () => {
  const { heirRow } = resolves();
  const out = heirRow(NEXT, null);

  assert.ok(out.includes('reading that distribution…'), out);
  assert.ok(out.includes(`data-addr="${NEXT}"`), `the address is not printed through ext:\n${out}`);
  assert.ok(!out.includes('href="#/distros/'), out);
});
