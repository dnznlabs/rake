/* Which chains the shipped document links with no read (`ENABLED`), and which it shows as pending.

   The Product Owner ruled on 2026-11-22 that Base and Ethereum are linked **before** either has a
   document, so the list is no longer "the chains known live" and the next person to read it should
   not reintroduce that meaning by tidying it. This file pins the ruling where a reader of the diff
   will see it: four links, four pending, and a label for every one of them.

   Lifted from the page's own text after the DEV strip, as `nowallet.test.mjs` does, so what is
   asserted is what ships rather than a copy of it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

const lift = (anchor) => {
  const at = SHIPPED.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  return SHIPPED.slice(at, SHIPPED.indexOf('\n', at));
};

const { CHAINS, NETWORKS, ENABLED } = new Function(
  `${lift('const CHAINS =')}\n${lift('const NETWORKS =')}\n${lift('const ENABLED =')}\nreturn { CHAINS, NETWORKS, ENABLED };`,
)();

test('Ethereum and Base are linked with no read, beside the two testnets', () => {
  assert.deepEqual(
    ENABLED,
    [1, 8453, 11155111, 84532],
    'the Product Owner\'s 2026-11-22 ruling: both mainnets are linked before either has a document',
  );
});

test('every linked chain is one the document knows and can name', () => {
  for (const id of ENABLED) {
    assert.ok(NETWORKS.includes(id), `${id} is linked but not in NETWORKS, so no menu row would show it`);
    assert.ok(CHAINS[id], `${id} is linked with no name, so its row would read "chain ${id}"`);
  }
  assert.equal(CHAINS[1], 'mainnet');
  assert.equal(CHAINS[8453], 'base');
});

test('the other four chains stay pending deployment', () => {
  const pending = NETWORKS.filter((id) => !ENABLED.includes(id));

  assert.deepEqual(
    pending.map((id) => CHAINS[id]),
    ['arbitrum', 'op mainnet', 'megaeth', 'robinhood'],
    'M05 is Base and Ethereum only (decision 70); the rest are listed, not linked',
  );
});

test('no testnet is dropped from the links', () => {
  /* The pair this document is actually uploaded to. A ruling about mainnets must not quietly remove
     the chains the thing already runs on. */
  for (const id of [11155111, 84532]) assert.ok(ENABLED.includes(id), `${id} must stay linked`);
});
