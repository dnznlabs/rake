/* The name on the wallet button (#274).

   The button is the one address the page prints that does not go through `ext`, so it does not get a
   name from `nameSweep`'s pass over `[data-addr]`. `nameWho` gives it one, and has to do it under the
   same three rules as every other printed name: decision 13's resolver order, R10's gate on what a
   reader can tell apart, and the winner-alone rule that a resolve which lost a race must not paint.

   Like `ext.test.mjs`, this lifts the declaration out of `app/src/index.html` and evaluates it, so
   what runs here is the page's own text. `same` is lifted too rather than stubbed — it is the page's
   comparison and a looser one would hide the fourth row below. `Model` is the real module, so the
   third row exercises the actual gate rather than a fake that agrees with it. `resolveName`, `ACC`
   and `document` are the stubs: one resolver answer, one account, one element with a `textContent`. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';
import Model from '../app/src/model.js';

globalThis.Eth = Eth;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');

const one = anchor => {
  const at = PAGE.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  return PAGE.slice(at, PAGE.indexOf('\n', at));
};

const ACCOUNT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const OTHER = '0x00000000219ab540356cBB839Cbe05303d7705Fa';

/* One lift per row: `ACC` is a module-level binding in the page and a parameter here, so each row
   gets the account it means to test rather than mutating a shared one. Returns the element the stub
   hands out, which is the only thing `nameWho` can write to. */
function lift({ name, acc }) {
  const who = { textContent: 'initial' };
  const document = { getElementById: id => (assert.equal(id, 'who'), who) };
  const resolveName = async () => name;
  const body = `${one('const same =')}\n${one('async function nameWho')}\nreturn nameWho;`;
  const nameWho = new Function('resolveName', 'Model', 'ACC', 'document', body)(
    resolveName, Model, acc, document);
  return { nameWho, who };
}

test('a plain name for the connected account paints the button', async () => {
  const { nameWho, who } = lift({ name: 'vitalik.eth', acc: ACCOUNT });
  await nameWho(ACCOUNT);
  assert.equal(who.textContent, 'vitalik.eth');
});

test('no reverse record leaves the short address alone', async () => {
  const { nameWho, who } = lift({ name: null, acc: ACCOUNT });
  await nameWho(ACCOUNT);
  assert.equal(who.textContent, 'initial');
});

test('a name the gate refuses never reaches the button', async () => {
  /* U+0456, Cyrillic small letter byelorussian-ukrainian i — a name that reads as `vitalik.eth`,
     as `test/model.test.mjs` uses it. */
  const mixed = 'vіtalik.eth';
  assert.equal(Model.plainName(mixed), false, 'the fixture is no longer a name the gate refuses');
  const { nameWho, who } = lift({ name: mixed, acc: ACCOUNT });
  await nameWho(ACCOUNT);
  assert.equal(who.textContent, 'initial', 'a mixed-script name painted the wallet button');
});

test('a resolve for an account that is no longer connected does not paint', async () => {
  const { nameWho, who } = lift({ name: 'vitalik.eth', acc: OTHER });
  await nameWho(ACCOUNT);
  assert.equal(
    who.textContent,
    'initial',
    'a name resolved for a switched-away account overwrote the newer account\'s text',
  );
});
