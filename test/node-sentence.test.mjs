/* A failure with no revert bytes keeps the node's own sentence (#373).

   The page read `e.data` for revert bytes and `e.message` for nothing except code 4001, so every
   failure that carried no bytes printed the bare word `reverted`. That names the wrong culprit — the
   node refused, not the contract — and throws away the one sentence that says what to do about it:
   out of funds, a nonce already used, a fee under the floor, a rate limit.

   Found in m05-t01c's acceptance run, where **Deploy** answered `create · reverted` and nothing
   reached the wallet. Note what the five rows below show and the issue's first diagnosis did not:
   both selectors the create path can revert with were *already* decoded by `revertMessage`, so a
   bare `reverted` could only ever have meant empty data. That is what is fixed here.

   `txError` is lifted from the DEV-stripped page; `nodeSentence` is the model's, imported. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Model from '../app/src/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

const block = (anchor, end = '\n}\n') => {
  const at = SHIPPED.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  const to = SHIPPED.indexOf(end, at);
  assert.ok(to > at, `\`${anchor}\` is no longer closed by ${JSON.stringify(end)}`);
  return SHIPPED.slice(at, to + end.length);
};

/* The page's own `txError`, with the three things it reaches for stubbed: the model, `esc`, and the
   two values `revertMessage` takes for a deadline. */
const txError = new Function('Model', 'esc', 'secs', 'S', `${block('function txError(e) {')}\nreturn txError;`)(
  Model, s => s, () => 1_700_000_000, { grace: null });

test('a refusal with a message and no data keeps the message', () => {
  assert.equal(txError({ code: -32000, message: 'insufficient funds for gas * price + value' }),
    'insufficient funds for gas * price + value');
});

test('a revert with data still decodes, and the message does not displace it', () => {
  // SaltDoesNotStartWith() — the create path's own guard, which has a sentence of its own.
  assert.equal(txError({ code: 3, message: 'execution reverted', data: '0x0c4549ef' }),
    'that salt belongs to another wallet');
  // DeploymentFailed() — what a second attempt at a spent salt answers.
  assert.equal(txError({ code: 3, message: 'execution reverted', data: '0x30116425' }),
    'a distribution already exists at that address');
});

test('the wallet-wrapped shape is read too, at either depth', () => {
  assert.equal(txError({ code: -32603, data: { code: 3, data: '0x0c4549ef' } }),
    'that salt belongs to another wallet');
  assert.equal(txError({ code: -32603, message: 'Internal JSON-RPC error.', data: { message: 'nonce too low' } }),
    'nonce too low', 'the inner message is the one worth printing when there are no bytes');
});

test('a user rejection is still the user, not the node', () => {
  assert.equal(txError({ code: 4001, message: 'User denied transaction signature.' }), 'rejected in wallet');
});

test('with neither bytes nor anything worth saying, the bare word stands', () => {
  assert.equal(txError({ code: -32603, message: 'Internal JSON-RPC error.' }), 'reverted');
  assert.equal(txError({}), 'reverted');
  assert.equal(txError({ message: '   ' }), 'reverted');
  assert.equal(txError({ message: 'execution reverted' }), 'reverted',
    'a message that only repeats the bare word adds nothing');
});

/* `nodeSentence` on its own: what it keeps, and what it refuses to put in a status line. */
test('nodeSentence keeps the useful clause', () => {
  assert.equal(Model.nodeSentence('execution reverted: not enough ETH'), 'not enough ETH');
  assert.equal(Model.nodeSentence('  max fee per gas less than block base fee  '),
    'max fee per gas less than block base fee');
  assert.equal(Model.nodeSentence('{"code":-32007,"message":"25/second request limit reached"}'),
    '25/second request limit reached', 'a JSON body is unwrapped rather than printed at a reader');
});

test('nodeSentence drops what a status line cannot use', () => {
  assert.equal(Model.nodeSentence('Rate limit exceeded. Upgrade your plan at https://thirdweb.com/pricing'),
    'Rate limit exceeded. Upgrade your plan at', 'the URL goes; this is an upsell, not an instruction');
  assert.equal(Model.nodeSentence('Internal JSON-RPC error.'), null);
  assert.equal(Model.nodeSentence(''), null);
  assert.equal(Model.nodeSentence(null), null);
  assert.equal(Model.nodeSentence('reverted'), null);
});

test('nodeSentence is one line and bounded, cut at a clause', () => {
  const long = 'the node refused this call for a reason it explains at great length, '
    + 'repeating itself and then continuing well past anything a status line can hold, '
    + 'with more words after that';
  const out = Model.nodeSentence(long);
  assert.ok(out.length <= 101, `a status line cannot hold ${out.length} characters`);
  assert.ok(out.endsWith('…'), 'a cut sentence says it was cut');
  assert.ok(!/\s\S{0,3}…$/.test(out) || out.includes(','), 'the cut should land at a clause, not mid-word');
  assert.equal(Model.nodeSentence('one\ntwo\tthree'), 'one two three');
});
