/* The widget against its sources of truth: `cast`'s snapshot fixture for the decoder, `cast`'s
   selector fixture for the two literals, and `app/src/theme.css` for every colour.

   Like `docs.test.mjs`, this reads sources rather than building anything. The decoder is checked
   against the values `cast` encoded into `test/fixtures/abi/snapshot.return.hex` — never against
   `Eth.dec`, which reads the same fixture in `test/abi.test.mjs:63–90`: two decoders agreeing proves
   they share a bug, and the fixture is the oracle for both. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const SRC = read('app/src/widget.js');
const HOST = read('app/src/host.html');
const THEME = read('app/src/theme.css');

const fixture = name => {
  const hex = readFileSync(join(root, 'test/fixtures/abi', `${name}.hex`), 'utf8').trim();
  assert.match(hex, /^0x[0-9a-f]+$/, `${name}.hex is not lowercase hex — regenerate it`);
  return hex;
};

/* The widget exposes only `window.RakeWidget = {mount, refresh}`; the decoder is an internal
   binding, and a test hook in the payload would spend bytes the 10,240 budget cannot spare. So the
   IIFE's body is evaluated in a stub `window`/`document` and the binding is read out of that scope.
   Both ends of the wrapper are asserted: a reformat then fails here with a sentence rather than
   silently evaluating an empty body and passing. */
function widget() {
  const open = '(function () {', close = '})();';
  const from = SRC.indexOf(open), to = SRC.lastIndexOf(close);
  assert.ok(from >= 0, `widget.js no longer opens with ${open} — this test unwraps that IIFE`);
  assert.ok(to > from, `widget.js no longer ends with ${close}`);
  const body = SRC.slice(from + open.length, to);
  assert.ok(body.includes('function decode('), 'widget.js has no decode() to extract');

  /* Enough of a DOM for load time: the widget injects nothing until a mount renders, and
     `readyState: complete` sends it straight to the sweep, which finds no mounts. */
  const doc = {
    readyState: 'complete',
    head: { appendChild() {} },
    getElementById: () => null,
    createElement: () => ({}),
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const win = {};
  const api = new Function('window', 'document', `${body}\nreturn { decode, SNAP, SETBEN, etaText, GRACE };`)(win, doc);
  assert.deepEqual(Object.keys(win.RakeWidget), ['mount', 'refresh'], 'the widget\'s public surface changed');
  return api;
}

const OWNER = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const OPS = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
const TREASURY = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';
const row = (account, bps, name, note) => ({ account, bps, name, note });

/* (a) */
test('the decoder reads cast\'s snapshot() return', () => {
  const snap = widget().decode(fixture('snapshot.return'));

  assert.ok(snap, 'the fixture decoded to null');
  /* Lowercase: the widget carries no keccak, so it cannot checksum what it reads. */
  assert.equal(snap.owner, OWNER);
  assert.equal(snap.delay, 604800);
  assert.equal(snap.nonce, 1);
  assert.equal(snap.description, 'DNZN fees');
  assert.deepEqual(snap.table, [row(OPS, 6000, 'ops', 'operations'), row(TREASURY, 4000, 'treasury', '')]);

  assert.equal(snap.pending.length, 1);
  assert.equal(snap.pending[0].eta, 1760000000);
  /* The queued action is a setBeneficiaries, so it previews as a table — the swapped shares. */
  assert.deepEqual(snap.pending[0].table, [row(OPS, 7000, 'ops', 'operations'), row(TREASURY, 3000, 'treasury', '')]);
});

/* (a), the other branch: only a setBeneficiaries action has a table to preview, and the three other
   setters have to arrive as an eta and nothing else. There is no cast fixture for a snapshot
   carrying one, so the return is encoded with `Eth` — which `test/abi.test.mjs` proves byte-equal to
   cast on this exact layout, including the `bytes` member this case varies. */
test('a queued action that is not setBeneficiaries decodes without a table', () => {
  const BEN = '(address,uint96,string,string)';
  const SNAPSHOT = `(address,uint32,uint32,string,${BEN}[],(bytes32,uint256,bytes)[])`;
  const hex = '0x' + Eth.enc(`s(${SNAPSHOT})`, [[
    OWNER, 0, 4, 'DNZN fees', [[OPS, 10000, 'ops', 'operations']],
    [['0x' + '22'.repeat(32), 1760000000, fixture('setDelay.calldata')]],
  ]]).slice(10);

  const snap = widget().decode(hex);

  assert.equal(snap.delay, 0);
  assert.equal(snap.pending.length, 1);
  assert.equal(snap.pending[0].eta, 1760000000);
  assert.equal(snap.pending[0].table, null);
});

/* (a), the byte the EVM allows and UTF-8 does not: `string` is bytes on chain, so an owner can set a
   name `decodeURIComponent` throws on. Before #67's fix that threw inside `decode`, which caught it
   and returned null, and the whole mount rendered as a failure — one bad row taking out five good
   ones. The fallback reads those bytes as latin1 instead. */
test('a name that is not valid UTF-8 renders rather than failing the mount', () => {
  const hex = fixture('snapshot.return');
  /* `ops`, 0x6f7073, with 0xff in the middle: never a valid UTF-8 sequence. The live table's copy is
     the first in the return; the queued table keeps its own, so both branches are exercised. */
  assert.ok(hex.includes('6f7073'), 'the fixture no longer carries the name this case corrupts');
  const snap = widget().decode(hex.replace('6f7073', '6fff73'));

  assert.ok(snap, 'one invalid byte in one name returned null for the whole snapshot (#67)');
  assert.equal(snap.table[0].name, 'oÿs');
  /* The rest of the answer is untouched: the fallback is per field, not per snapshot. */
  assert.equal(snap.table[0].note, 'operations');
  assert.equal(snap.table[1].name, 'treasury');
  assert.equal(snap.description, 'DNZN fees');
  assert.equal(snap.delay, 604800);
});

test('the decoder refuses an answer too short to be a snapshot', () => {
  const { decode } = widget();

  /* What a codeless address returns from eth_call, which is the failure state's whole trigger. */
  assert.equal(decode('0x'), null);
  assert.equal(decode(''), null);
  assert.equal(decode(undefined), null);
});

/* (b) */
test('the two selector literals are the ones cast recorded', () => {
  const { SNAP, SETBEN } = widget();
  const lines = read('test/fixtures/abi/selectors.txt').trim().split('\n');
  const byName = new Map(lines.map(l => { const i = l.lastIndexOf(' '); return [l.slice(0, i), l.slice(i + 1)]; }));

  const snapshot = byName.get('snapshot()');
  const setBeneficiaries = byName.get('setBeneficiaries((address,uint96,string,string)[])');

  /* Without these two the comparisons below would pass against undefined on both sides. */
  assert.match(snapshot ?? '', /^0x[0-9a-f]{8}$/, 'selectors.txt carries no snapshot() — regenerate it');
  assert.match(setBeneficiaries ?? '', /^0x[0-9a-f]{8}$/, 'selectors.txt carries no setBeneficiaries(…)');
  assert.equal(SNAP, snapshot);
  assert.equal(SETBEN, setBeneficiaries);
});

/* The queued line's far end. Before t08 a matured entry read `ready to apply` for ever, which the
   contract stops being true fourteen days after the eta (`src/Distribution.sol:249`). The fixture's
   own eta is years past, so this is a decoded pending entry rather than a bare number. */
test('a decoded pending entry past the window renders expired', () => {
  const { decode, etaText } = widget();
  const snap = decode(fixture('snapshot.return'));
  const now = Math.floor(Date.now() / 1000);

  /* Without this the assertion below would pass on an eta that merely matured, which is the bug. */
  assert.ok(snap.pending[0].eta + 14 * 86400 < now, 'the fixture\'s eta is no longer past the window');
  assert.equal(etaText(snap.pending[0].eta), 'expired');
  // The two phases it must not swallow: still waiting, and matured but inside the window.
  assert.equal(etaText(now + 3 * 86400 + 14 * 3600), 'lands in 3d 14h');
  assert.equal(etaText(now - 86400), 'ready to apply');
});

/* The one contract constant the widget copies rather than reads, because reading it would cost the
   second `eth_call` the design forbids. Pinned here so moving `GRACE` fails a test rather than
   shipping a widget that disagrees with the chain. */
test('the widget\'s GRACE literal is the contract\'s fourteen days', () => {
  assert.equal(widget().GRACE, 14 * 86400);
  assert.equal(widget().GRACE, 1209600);
  // And it is named in the source beside its home, so the next reader knows where to re-check it.
  assert.match(SRC, /GRACE` in `src\/Distribution\.sol`/);
});

/* (c) */
test('every colour literal in the widget is one theme.css carries', () => {
  const found = SRC.match(/#[0-9a-fA-F]{6}|oklch\([^)]*\)/g) || [];
  const literals = [...new Set(found)].sort();

  /* The accent in both themes, and amber and err in both — theme.css:6-7. The bar's three tints are
     the accent through color-mix, so they add no literal of their own, and nothing else in the file
     names a colour: a seventh entry here is a drift from the base's palette. */
  assert.deepEqual(literals, [
    '#B23A2E', '#B8741A', '#CE9640', '#D06456', 'oklch(.47 .09 230)', 'oklch(.58 .09 230)',
  ]);
  for (const c of literals) assert.ok(THEME.includes(c), `${c} is not in app/src/theme.css`);
});

/* (d) */
test('the widget and the host page carry none of the retired vocabulary', () => {
  assert.equal(SRC.match(/style="/g), null, 'the widget sets a style attribute: the stylesheet is #rk-css');
  assert.equal(SRC.match(/RAKE_DEMO/g), null, 'the demo hook is the harness\'s, not the widget\'s');
  assert.equal(HOST.match(/theme\.css/g), null, 'the host page is a foil: it must not load the base');

  /* The acceptance criterion greps app/src as a whole, the host page included. */
  for (const [name, text] of [['widget.js', SRC], ['host.html', HOST]]) {
    for (const word of [/\btip\b/, /govUrl/, /about:/, /ownerKind/, /rake\.distro/]) {
      assert.equal(text.match(word), null, `${name} still says ${word}`);
    }
  }
});

test('the widget is one classic script with no module surface', () => {
  assert.match(SRC, /^\/\* ═══ rake widget · __VERSION__/, 'the version token is the banner\'s');
  assert.ok(SRC.includes("'use strict';"), 'the IIFE is not strict');
  assert.equal(SRC.match(/^\s*export\b/m), null, 'App serves this as a classic script, not a module');
  assert.equal(SRC.match(/@inline/g), null, 'the widget is a second bundle, not an inlined file');
});
