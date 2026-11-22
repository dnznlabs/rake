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
  const api = new Function('window', 'document', `${body}\nreturn { decode, SNAP, SETBEN, etaText, GRACE, SKEW, esc, fmtDelay };`)(win, doc);
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
  const { decode, etaText, GRACE, SKEW } = widget();
  const snap = decode(fixture('snapshot.return'));
  const now = Math.floor(Date.now() / 1000);

  /* Without this the assertion below would pass on an eta that merely matured, which is the bug. */
  assert.ok(snap.pending[0].eta + GRACE + SKEW < now, 'the fixture\'s eta is no longer an hour past the window');
  assert.equal(etaText(snap.pending[0].eta), 'expired');
  // The two phases it must not swallow: still waiting, and matured but inside the window.
  assert.equal(etaText(now + 3 * 86400 + 14 * 3600), 'lands in 3d 14h');
  assert.equal(etaText(now - 86400), 'ready to apply');
});

/* #149: the widget judges against `Date.now()` and nothing else, so a device whose clock is fast
   decides the far end of the window on its own. An hour of slack buys back the boundary: inside it
   the row still offers the action the contract still accepts, and past it the sentence is `expired`
   as before. The hour is this task's constant, pinned here so it cannot drift unremarked. */
test('the widget gives a skewed device an hour before it calls a change dead', () => {
  const { etaText, GRACE, SKEW } = widget();
  const now = Math.floor(Date.now() / 1000);
  // Each eta is placed so that `now` sits the stated distance past `eta + GRACE`.
  const past = secs => now - GRACE - secs;

  assert.equal(SKEW, 3600, 'the tolerance is one hour');
  const got = [
    etaText(past(30 * 60)),      // 30 minutes past the window — inside the hour
    etaText(past(SKEW - 60)),     // a minute short of the hour
    etaText(past(SKEW + 60)),     // a minute past it
    etaText(past(3 * 86400)),     // three days past: no clock skew explains this
  ];

  assert.deepEqual(got, ['ready to apply', 'ready to apply', 'expired', 'expired']);
});

/* The clock the two sentences above are judged by, named on the row that prints them. One
   occurrence: the AC greps for exactly this phrase, and a second copy would be a second place to
   keep true. */
test('the queued line says whose clock judged it', () => {
  const hits = SRC.match(/device's clock/g) || [];

  /* Exactly one, unescaped: the AC greps the source for this phrase, and a `\'` would pass a test
     written against the parsed string while failing that grep. */
  assert.equal(hits.length, 1);
  assert.match(SRC, /var CLOCKNOTE="judged by this device's clock"/);
  // And it reaches the queued row's title, which is the only place it is meant to show up.
  assert.match(SRC, /<div class="rk-q" title="'\+CLOCKNOTE\+'"/);
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

/* R15, the widget's half (`audits/2026-11-17/frontend/AUDIT.md:358-365`). The controls are written
   as escapes here for the same reason the dapp's rows are: a literal control is invisible to the
   next reader and to every grep. */
const BIDI = ['\u202A', '\u202B', '\u202C', '\u202D', '\u202E', '\u2066', '\u2067', '\u2068', '\u2069'];

test('the widget\'s esc drops a bidi override rather than escaping it', () => {
  assert.equal(widget().esc('a\u202Eb'), 'ab');
});

test('the widget\'s esc drops each of the nine bidi control characters', () => {
  const { esc } = widget();

  assert.equal(BIDI.length, 9, 'the range is U+202A-U+202E and U+2066-U+2069 — nine code points');
  for (const c of BIDI) {
    const out = esc(`a${c}b`);

    assert.equal(out, 'ab', `esc kept U+${c.codePointAt(0).toString(16).toUpperCase()}: ${JSON.stringify(out)}`);
  }
  assert.equal(esc(`${BIDI.join('')}<b>`), '&lt;b&gt;');
});

/* R12 and R14 (`audits/2026-11-17/frontend/AUDIT.md:322-334` and `:345-356`), the decoder's two
   inputs from a host-chosen endpoint. `arr` looped the length word's many times against no bound,
   and `reader` sliced whatever it was handed without asking whether it was hex. */

/* The table's length word, found the way `decode` finds it: the head word holds the struct's
   offset, and the fifth member's offset is at `b + 128`. Returned as a byte offset into the body so
   the rewrite below lands on the same word the decoder will read. */
function tableLenAt(hex) {
  const H = hex.slice(2);
  const u = p => parseInt(H.substr(p * 2, 64), 16);
  const b = u(0);
  return b + u(b + 128);
}
function rewriteWord(hex, at, value) {
  const H = hex.slice(2);
  const word = BigInt(value).toString(16).padStart(64, '0');
  const out = '0x' + H.slice(0, at * 2) + word + H.slice(at * 2 + 64);
  assert.equal(out.length, hex.length, 'the rewrite changed the body length');
  assert.notEqual(out, hex, 'the rewrite changed nothing');
  return out;
}

test('a table length larger than the body has words decodes to null', () => {
  /* 100,000 and not 2^32: without the bound this returns a 100,000-row table in a few hundred
     milliseconds rather than hanging, so the assertion below is what fails, not the test run. */
  const hostile = rewriteWord(fixture('snapshot.return'), tableLenAt(fixture('snapshot.return')), 100000);

  assert.equal(widget().decode(hostile), null);
});

test('a non-hex answer decodes to null before reader slices it', () => {
  const hex = fixture('snapshot.return');
  const bad = '0xzz' + hex.slice(4);

  assert.equal(bad.length, hex.length, 'the fixture changed length');
  assert.equal(widget().decode(bad), null);
});

test('the real fixture still decodes through both new checks', () => {
  /* (a) above already reads this fixture; this row is here so the run proves the two refusals let
     the real shape through rather than only that they refuse. */
  const snap = widget().decode(fixture('snapshot.return'));

  assert.ok(snap, 'the fixture decoded to null');
  assert.equal(snap.owner, OWNER);
  assert.equal(snap.table.length, 2);
  assert.equal(snap.pending.length, 1);
});

/* `fmtDelay` — the footer's delay, after step 4c. The page's `delayText` rounded a sub-hour delay to
   `0h` and this had the same shape, so a widget embedded beside a ten-minute distribution announced
   that there was effectively no notice period (#345). The widget takes no input, so the requirement
   here is only that the text is exact; `test/delay.test.mjs` holds the page's round trip. */
test('the widget shows a sub-hour delay in minutes or seconds, never `0h`', () => {
  const { fmtDelay } = widget();
  const got = [1, 59, 600, 3599, 3600, 5400, 86399, 86400, 90061, 604800].map(fmtDelay);

  assert.deepEqual(got, ['1s', '59s', '10m', '3599s', '1h', '90m', '86399s', '1d', '90061s', '7d']);
  assert.equal(fmtDelay(600), '10m');
  assert.ok(!got.includes('0h'), 'a delay still renders as 0h');
});

test('the widget still says `no delay` for zero, which is its own sentence', () => {
  assert.equal(widget().fmtDelay(0), 'no delay');
});

test('the widget and the page agree, unit for unit', () => {
  /* Two formatters on two surfaces for one number: a divergence here is a distribution that reads
     one delay in the dapp and another in an embedded widget. The page's own declaration is lifted,
     not copied. */
  const OPEN = 'const delayText = d =>', CLOSE = ": Number(d) + 's';";
  const page = read('app/src/index.html');
  const from = page.indexOf(OPEN), at = page.indexOf(CLOSE, from);
  assert.ok(from >= 0 && at > from, 'app/src/index.html no longer declares delayText as this test lifts it');
  const delayText = new Function(`${page.slice(from, at + CLOSE.length)}\nreturn delayText;`)();

  const { fmtDelay } = widget();
  for (const x of [1, 59, 600, 3599, 3600, 5400, 86399, 86400, 90061, 604800]) {
    assert.equal(fmtDelay(x), delayText(x), `${x} s reads differently in the widget and on the page`);
  }
});
