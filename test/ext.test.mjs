/* `ext` and `xlink`, the one sink every address and hash the dapp prints goes through, against a
   provider that answers with markup instead of hex.

   This is the front-end pass's R2 (`audits/2026-11-17/frontend/AUDIT.md`): `ext` wrote its `v` raw
   into `title`, `data-addr`, `aria-label`, `data-copy` and, through `xlink`, into `href`, and
   nothing between the `eth_call` and the sink checked its shape — `Eth.checksum`
   (`app/src/eth.js:183-186`) re-cases its input and passes every other character through, so it is
   not a filter. A provider that answers `"><img src=x onerror=…>` for a transaction hash therefore
   got script in the dapp's own origin, and script there can rewrite every later transaction and
   every clipboard value.

   Like `amt.test.mjs` and `widget.test.mjs`, this reads the page rather than building anything: the
   declarations are lifted out of `app/src/index.html` and evaluated, so what runs here is the page's
   own text. `NAMED`, `EXPLORER` and `CFG` are the only globals the lifted region touches, and they
   are passed in. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');

/* The region from the shape predicates through `xlink`, lifted whole rather than declaration by
   declaration: the check and the sink it guards have to come out of the file together, or the test
   passes against a check the page no longer applies. */
const OPEN = 'const isAddr = v =>';
const CLOSE = 'title="open in explorer"';
function lift() {
  const one = anchor => {
    const at = PAGE.indexOf(anchor);
    assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
    return PAGE.slice(at, PAGE.indexOf('\n', at));
  };
  const from = PAGE.indexOf(OPEN);
  assert.ok(from >= 0, `app/src/index.html no longer declares \`${OPEN}\` — this test lifts from there`);
  const to = PAGE.indexOf('\n', PAGE.indexOf(CLOSE, from));
  assert.ok(to > from, 'the xlink declaration no longer ends on the explorer title');

  const body = `${one('const esc = s =>')}\n${one('const short = a =>')}\n${PAGE.slice(from, to)}\nreturn { ext, xlink };`;

  return new Function('NAMED', 'EXPLORER', 'CFG', body)(
    new Map(), { 11155111: 'https://sepolia.etherscan.io' }, { chainId: 11155111 });
}
const { ext, xlink } = lift();

const ADDR = '0x71a4221974Fc2E95081AE513248918dF27CF7a4A';
const HASH = '0x' + 'ab'.repeat(32);
/* Both legs' reproduction, in the two shapes a provider can return it: a value that is not hex at
   all, and one that opens with `0x` and so survives every "looks like a hash" eyeball. */
const PAYLOAD = '"><img src=x onerror=alert(1)>';
const BAITED = '0x' + PAYLOAD + 'ff';

test('a provider hash carrying markup reaches no attribute and no body', () => {
  for (const v of [PAYLOAD, BAITED]) {
    const out = ext('tx', v, 'sent');

    /* `esc` escapes `& < > "` and nothing else, so `onerror=alert(1)` survives as text — inert, and
       not what is asserted. What is asserted is that no character of the value is still markup:
       the payload is nowhere verbatim, there is no tag, and the value is shown escaped. */
    assert.ok(!out.includes(v), `the payload survived verbatim for ${JSON.stringify(v)}:\n${out}`);
    assert.ok(!out.includes('<img'), `a raw <img survived ext() for ${JSON.stringify(v)}:\n${out}`);
    assert.ok(out.includes('&lt;img'), `the value is not shown escaped either:\n${out}`);
  }
});

test('a malformed value gets no copy control and no explorer link', () => {
  /* There is nothing to copy and nothing an explorer could open, so the affordances go with the
     shape: a value that is not a hash reads as the malformed answer it is. */
  for (const kind of ['tx', 'hash', 'address']) {
    const out = ext(kind, BAITED, 'sent');

    assert.ok(!out.includes('data-copy='), `${kind} still offers a copy of a malformed value:\n${out}`);
    assert.ok(!out.includes('data-addr='), `${kind} still marks a malformed value as an address:\n${out}`);
    assert.ok(!out.includes('<a '), `${kind} still links a malformed value:\n${out}`);
  }
});

test('xlink refuses a malformed value on its own, not only through ext', () => {
  assert.equal(xlink('address', BAITED, '↗'), '');
  assert.equal(xlink('tx', PAYLOAD, '↗'), '');
  assert.ok(xlink('address', ADDR, '↗').includes(`/address/${ADDR}`));
});

test('an unknown kind fails closed', () => {
  /* `shaped` answers for the three kinds the page uses and refuses the rest, so a new call site
     added with a fourth kind is visibly inert rather than invisibly raw. */
  const out = ext('token', ADDR, 'x');

  assert.ok(!out.includes('data-copy='), `an unknown kind still wrote a copy value:\n${out}`);
  assert.ok(out.includes(ADDR), `an unknown kind dropped the value entirely:\n${out}`);
});

test('the page calls ext with only the kinds shaped() answers for', () => {
  /* The other half of failing closed: if a column's kind is not one of these, that column renders
     escaped text and no link, and this test is what says so before a release does. */
  const kinds = [...new Set([...PAGE.matchAll(/\bext\('([a-z]+)'/g)].map(m => m[1]))].sort();

  assert.deepEqual(kinds, ['address', 'hash', 'tx']);
});

test('a well-formed address still renders every attribute and the explorer link', () => {
  const out = ext('address', ADDR, 'short');

  assert.ok(out.includes(`<span title="${ADDR}" data-addr="${ADDR}">short</span>`), out);
  assert.ok(out.includes(`aria-label="copy ${ADDR}" data-copy="${ADDR}"`), out);
  assert.ok(out.includes(`href="https://sepolia.etherscan.io/address/${ADDR}"`), out);
});

test('a well-formed tx links and a queued hash does not, as before', () => {
  const tx = ext('tx', HASH, 'short'), hash = ext('hash', HASH, 'short');

  assert.ok(tx.includes(`href="https://sepolia.etherscan.io/tx/${HASH}"`), tx);
  assert.ok(tx.includes(`data-copy="${HASH}"`), tx);
  assert.ok(!hash.includes('<a '), `a queued action's hash is no transaction and links nowhere:\n${hash}`);
  assert.ok(hash.includes(`data-copy="${HASH}"`), hash);
});

test('an address in a list row keeps its inLink suppression', () => {
  const out = ext('address', ADDR, 'short', true);

  assert.ok(!out.includes('<a '), `a nested <a> closes the row's own anchor early:\n${out}`);
  assert.ok(out.includes(`data-addr="${ADDR}"`), out);
});

test('Eth.checksum is still not a filter, which is why the check is at the sink', () => {
  /* Leg 2 ran the payload through `Eth.checksum` and got it back. This pins the reason the shape is
     checked in `ext` and not left to the re-casing every address already passes through. */
  const src = readFileSync(join(root, 'app/src/eth.js'), 'utf8');
  const at = src.indexOf('function checksum(a)');
  assert.ok(at >= 0, 'app/src/eth.js no longer declares checksum()');

  const checksum = new Function('keccak', 'utf8', `${src.slice(at, src.indexOf('\n  }', at) + 4)}\nreturn checksum;`)(
    () => 'f'.repeat(64), s => s);

  /* Case-insensitively: re-casing is all `checksum` does, so the payload comes back shouting. */
  assert.match(checksum(BAITED), /<img src=x onerror=alert\(1\)>/i, 'checksum() now filters, and this test is stale');
});
