/* `delayText` and the queue field it prefills, against `Model.parseDelay` — the function that reads
   the string back.

   The pair has to agree or the page shows one delay and proposes another. Found at the preview
   sitting of step 7a (#345): the hours-only formatter rounded a 600-second delay to `0h`, the delay
   field is prefilled from the same function, and `parseDelay('0h')` is 0, so pressing queue without
   editing the field proposed `setDelay(0)` — the delay removed, on a page whose whole subject is
   that changes are announced in advance. 5,400 seconds read `2h` and would have proposed 7,200.

   Like `amt.test.mjs`, this lifts the page's own declaration rather than copying it: `delayText`
   lives in `app/src/index.html`, so there is no module to import, and the prefill is read out of the
   `qrow('delay', …)` call itself. A reformat fails here with a sentence instead of passing against a
   copy that has drifted. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';
import Model from '../app/src/model.js';

globalThis.Eth = Eth;
const { parseDelay } = Model;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');

const OPEN = 'const delayText = d =>';
const CLOSE = ": Number(d) + 's';";
function liftDelayText() {
  const from = PAGE.indexOf(OPEN);
  assert.ok(from >= 0, `app/src/index.html no longer declares \`${OPEN}\` — this test lifts that declaration`);
  const at = PAGE.indexOf(CLOSE, from);
  assert.ok(at > from, 'delayText no longer ends on the seconds branch — a rounding branch would pass this file silently');
  return new Function(`${PAGE.slice(from, at + CLOSE.length)}\nreturn delayText;`)();
}
const delayText = liftDelayText();

/* The prefill, read out of the page: the whole point is that the value in the field is the value the
   button would send, so the test evaluates the page's own template expression. */
function liftPrefill() {
  const m = /id="q-delay" aria-label="delay" value="\$\{([^}]+)\}"/.exec(PAGE);
  assert.ok(m, 'app/src/index.html no longer prefills #q-delay with a template expression — this test reads that expression');
  return new Function('d', 'esc', 'delayText', `return ${m[1]};`);
}
const prefill = liftPrefill();

/* Every delay step 4c names, and the two boundaries either side of an hour. */
const DELAYS = [1, 59, 600, 3599, 3600, 5400, 86399, 86400, 90061, 604800];

test('a delay survives the round trip through the field: parseDelay(delayText(x)) is x', () => {
  const got = DELAYS.map(x => [x, delayText(x), parseDelay(delayText(x))]);

  for (const [x, text, back] of got) assert.equal(back, x, `${x} s renders ${text}, which reads back as ${back}`);
});

test('one number and one unit, the largest that divides the delay exactly — nothing rounded', () => {
  assert.deepEqual(DELAYS.map(delayText), [
    '1s', '59s', '10m', '3599s', '1h', '90m', '86399s', '1d', '90061s', '7d',
  ]);
});

test('the delay that was misread on Sepolia is minutes, not `0h`', () => {
  /* 0x7acCc483b159929c97670E6Dbc796316f53b31dE had delay() == 600 and the page said `0h`. */
  assert.equal(delayText(600), '10m');
  assert.notEqual(delayText(600), '0h');
  /* And the other direction of the same rounding: 5,400 s was `2h`, which proposes 7,200. */
  assert.equal(delayText(5400), '90m');
  assert.equal(parseDelay(delayText(5400)), 5400);
});

test('zero keeps its sentence rather than a number', () => {
  assert.equal(delayText(0), 'none — changes apply instantly');
  /* The sentence is not a delay anyone can type, which is why the prefill does not use it. */
  assert.equal(parseDelay(delayText(0)), null);
});

test('the queue field prefilled for a 600-second distribution parses back to 600', () => {
  const value = prefill({ delay: 600 }, s => s, delayText);

  assert.equal(value, '10m');
  assert.equal(parseDelay(value), 600);
});

test('an unedited field proposes the delay the distribution already has, for every delay', () => {
  const got = DELAYS.map(x => parseDelay(prefill({ delay: x }, s => s, delayText)));

  assert.deepEqual(got, DELAYS);
});

test('a distribution with no delay prefills a parseable zero, not the sentence', () => {
  const value = prefill({ delay: 0 }, s => s, delayText);

  assert.equal(value, '0');
  assert.equal(parseDelay(value), 0);
});

test('the field\'s hint names all four units it accepts', () => {
  const m = /id="q-delay"[\s\S]{0,200}?<div class="res">([^<]+)<\/div>/.exec(PAGE);
  assert.ok(m, 'the delay field no longer carries a `res` hint beside it');

  const hint = m[1];
  for (const unit of ['d', 'h', 'm', 's']) {
    assert.match(hint, new RegExp(`\\d${unit}\\b`), `the hint does not name the ${unit} unit: ${hint}`);
  }
  /* Each example in the hint is one `parseDelay` takes, so the hint cannot teach a form the field
     refuses. */
  for (const example of hint.split(/,|\bor\b/).map(s => s.trim()).filter(Boolean)) {
    assert.notEqual(parseDelay(example), null, `the hint offers \`${example}\`, which parseDelay refuses`);
  }
});
