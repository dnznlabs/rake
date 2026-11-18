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
   own text. `NAMED`, `EXPLORER`, `CFG` and `Eth` are the only globals the lifted region touches, and
   they are passed in — `Eth` because `predictLocal` hashes with it, and `CFG` because it is where
   `predictLocal` reads the factory and the implementation rather than asking the provider (R18). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');

/* The region from the shape predicates through `xlink`, lifted whole rather than declaration by
   declaration: the check and the sink it guards have to come out of the file together, or the test
   passes against a check the page no longer applies. */
const OPEN = 'const isAddr = v =>';
const CLOSE = 'title="open in explorer"';
/* The deployed factory and the implementation it clones, read from both tracked `Deploy.s.sol` logs
   and recomputed from their own init code (m04-t14 TASK.md step 0, re-run 2026-11-18). These are the
   two values the build substitutes into `CFG`, which is what makes the featured address computable
   on the page at all. */
const DEPLOYED = {
  chainId: 11155111,
  factory: '0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B',
  impl: '0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0',
};
function lift(cfg = DEPLOYED) {
  const one = anchor => {
    const at = PAGE.indexOf(anchor);
    assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
    return PAGE.slice(at, PAGE.indexOf('\n', at));
  };
  const from = PAGE.indexOf(OPEN);
  assert.ok(from >= 0, `app/src/index.html no longer declares \`${OPEN}\` — this test lifts from there`);
  const to = PAGE.indexOf('\n', PAGE.indexOf(CLOSE, from));
  assert.ok(to > from, 'the xlink declaration no longer ends on the explorer title');

  const body = `${one('const esc = s =>')}\n${one('const short = a =>')}\n${PAGE.slice(from, to)}\nreturn { ext, xlink, esc, isClone, CLONE, predictLocal };`;

  return new Function('NAMED', 'EXPLORER', 'CFG', 'Eth', body)(
    new Map(), { 11155111: 'https://sepolia.etherscan.io' }, cfg, Eth);
}
const { ext, xlink, esc, isClone, CLONE, predictLocal } = lift();

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

/* R15 (`audits/2026-11-17/frontend/AUDIT.md:358-365`): `esc` kept U+202E and U+2066–2069, and with
   no `<bdi>` and no `unicode-bidi` rule one row's name could visually reverse the rest of a line.
   The controls are written here as escapes, not as the characters themselves: a literal control in
   a test file is invisible to the next reader and to every grep. */
const BIDI = ['\u202A', '\u202B', '\u202C', '\u202D', '\u202E', '\u2066', '\u2067', '\u2068', '\u2069'];

test('esc drops a bidi override rather than escaping it', () => {
  assert.equal(esc('a\u202Eb'), 'ab');
});

test('esc drops each of the nine bidi control characters', () => {
  assert.equal(BIDI.length, 9, 'the range is U+202A-U+202E and U+2066-U+2069 — nine code points');
  for (const c of BIDI) {
    const out = esc(`a${c}b`);

    assert.equal(out, 'ab', `esc kept U+${c.codePointAt(0).toString(16).toUpperCase()}: ${JSON.stringify(out)}`);
  }
  /* All nine at once, and the four escapes still happen: dropping is a step in front of escaping,
     not a replacement for it. */
  assert.equal(esc(`${BIDI.join('')}<b>`), '&lt;b&gt;');
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

/* R3 (`audits/2026-11-17/frontend/AUDIT.md:117-144`), the check half. `loadDistro` asked only that
   the code was not `0x`, so any contract answering `snapshot()` was painted with the page's whole
   trust surface and saved to `rake.recent`. `isClone` is the refusal; step 9 (a) of the task is the
   same refusal in a browser. The 45 bytes are `create`'s own
   (`src/Distribution.sol:473-476`), measured on the dev chain with `cast code` — see HANDOFF.md. */
const IMPL = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

test('isClone accepts exactly the 45-byte PUSH0 clone of the implementation', () => {
  const code = CLONE(IMPL);

  assert.equal((code.length - 2) / 2, 45, `the clone's runtime code is ${(code.length - 2) / 2} bytes, not 45`);
  assert.equal(isClone(code, IMPL), true);
});

test('isClone refuses a clone with one hex digit changed', () => {
  const code = CLONE(IMPL);
  /* The last byte of the trailing `5af4…5ff3` run, so the forgery differs outside the address. */
  const bent = code.slice(0, -1) + (code.slice(-1) === '3' ? '4' : '3');
  assert.notEqual(bent, code, 'the fixture did not change a digit');

  assert.equal(isClone(bent, IMPL), false);
});

test('isClone refuses the implementation\'s own code, which answers snapshot()', () => {
  /* Leg 2's fake is any contract with the right ABI, and the implementation behind the factory is
     one: it answers `snapshot()` and is not a clone. Any longer string stands for it here. */
  assert.equal(isClone('0x60806040523480156100' + 'ab'.repeat(200), IMPL), false);
});

test('isClone refuses an address with no code at all', () => {
  assert.equal(isClone('0x', IMPL), false);
});

test('isClone reads an upper-cased answer as the same code', () => {
  /* `eth_getCode` answers in whatever case the node likes, and `implementation()` arrives
     checksummed, so both sides are lower-cased before they are compared. */
  const shouted = '0X' + CLONE(IMPL).slice(2).toUpperCase();

  assert.equal(isClone(shouted, IMPL), true);
});

/* ---- the featured address computed rather than asked for (R18) ------------------------------ */

/* The DNZN salt `mk/15-seed.mk:10` passes on every chain that is not the dev one: the creator's
   address in the top 20 bytes and the index in the bottom 12 (decision 10). */
const DNZN_SALT = '0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001';

test('predictLocal computes decision 50\'s address from the build alone', () => {
  /* The address ROADMAP decision 50 states, read from both testnets 2026-11-17 and reproduced from
     the two tracked `Deploy.s.sol` logs by m04-t14 step 0's rehearsal. Nothing on the wire takes
     part: the factory and the implementation are `CFG`'s, and the salt is the build's. */
  assert.equal(predictLocal(DNZN_SALT), '0x71a4221974Fc2E95081AE513248918dF27CF7a4A');
});

test('a different salt gives a different address of the same shape', () => {
  /* The second index the same creator can place, which the page's create screen predicts: a salt is
     not a label, so one byte of it is a different contract. */
  const second = DNZN_SALT.slice(0, -2) + '02';
  const got = predictLocal(second);

  assert.match(got, /^0x[0-9a-fA-F]{40}$/);
  assert.notEqual(got.toLowerCase(), '0x71a4221974fc2e95081ae513248918df27cf7a4a');
});

test('the implementation\'s case does not move the address', () => {
  /* The hash takes bytes, not characters: `__DISTRIBUTION__` arrives checksummed from the build and
     the same address lower-cased has to give the same answer, or the computation would depend on how
     a value was printed. */
  const lower = lift({ ...DEPLOYED, impl: DEPLOYED.impl.toLowerCase() });

  assert.equal(lower.predictLocal(DNZN_SALT), '0x71a4221974Fc2E95081AE513248918dF27CF7a4A');
});
