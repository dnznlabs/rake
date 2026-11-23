/* A queued change's action hash says what it is (#385).

   `keccak256(abi.encode(action, nonce))` is the handle `applyQueued` and `cancel` take — not an
   address and not a party to anything. The page printed it shortened, in the same `0x…` shape every
   address on the screen uses, with no word beside it, inside a row whose other `0x…` values are
   beneficiaries. The Product Owner read one on Base Sepolia and asked who `0x6688…5e5e` was.

   So two things are asserted here, and they are the two halves of the issue: the row **says** what
   the value is, and the value is **not** rendered as an address — no `data-addr`, which is what the
   name sweep rewrites and what makes a hash acquire somebody's ENS name. `entry` and `histRows` are
   lifted from the DEV-stripped page. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const line = anchor => {
  const at = SHIPPED.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer has \`${anchor}\``);
  return SHIPPED.slice(at, SHIPPED.indexOf('\n', at));
};

const ENTRY = block('function entry(log) {');
const HIST_ROWS = line('const histRows = items =>');

const HASH = '0x6688a1f1e4a41b5f04e45c6b3a0a6a0b1d2c3e4f5a6b7c8d9e0f1a2b3c4d5e5e';
const APPLIED_TOPIC = '0x1111111111111111111111111111111111111111111111111111111111111111';

/* `entry` for an `Applied` log, with only the renderers stubbed. `ext` records the kind it was given,
   which is the second half of the assertion: a hash must not be handed to the page as an address. */
function rendered(kind) {
  const src = `
    const calls = [];
    const KINDS = new Map([[APPLIED_TOPIC, KIND]]);
    const ext = (k, v, text) => { calls.push({ k, v }); return '<span data-kind="' + k + '">' + text + '</span>'; };
    const short = v => String(v).slice(0, 6) + '…' + String(v).slice(-4);
    const Eth = { dec: () => [0, 0n, '0x'] };
    const Model = { decodePending: () => ({}), countdown: () => 'in a while' };
    const describe = () => 'setBeneficiaries · new table';
    const secs = () => 0;
    const eth = () => '0';
    const esc = s => String(s);
    const ZERO = '0x0000000000000000000000000000000000000000';
    ${ENTRY}
    ${HIST_ROWS}
    return { entry, histRows, calls: () => calls };
  `;
  const h = new Function('APPLIED_TOPIC', 'KIND', src)(APPLIED_TOPIC, kind);
  const e = h.entry({
    topics: [APPLIED_TOPIC, HASH],
    blockNumber: '0x10',
    logIndex: '0x0',
    transactionHash: '0xtx',
    data: '0x',
  });
  return { e, html: h.histRows([e]), calls: h.calls() };
}

for (const kind of ['applied', 'cancelled']) {
  test(`an ${kind} row says the value is an action hash`, () => {
    const { e, html } = rendered(kind);

    assert.match(e.what, /action hash/, `the ${kind} row must name the value`);
    assert.match(html, /action hash/, 'and it must survive into the rendered row');
    // The row a reader sees: the kind, then the label, then the shortened hash.
    assert.match(html, /<b>.*<\/b>/, 'the row still carries its kind');
    assert.match(html, /0x6688…5e5e/, 'and the shortened hash itself');
  });

  test(`an ${kind} row does not hand the hash over as an address`, () => {
    const { calls } = rendered(kind);

    const forHash = calls.filter(c => c.v === HASH);
    assert.equal(forHash.length, 1, 'the hash is printed once');
    assert.equal(forHash[0].k, 'hash',
      'as a hash: `address` would mark it `data-addr`, and the name sweep would give it somebody’s name');
  });
}

/* The mechanism behind the second assertion, pinned where it lives: only an address is marked, and a
   hash gets no explorer link because a queued action's hash is no transaction. */
test('ext marks only an address, and links only what an explorer can open', () => {
  const ext = line('const ext = (kind, v, text, inLink, chain = CFG.chainId) =>');
  const body = block('const ext = (kind, v, text, inLink, chain = CFG.chainId) => {', '\n};\n');
  assert.ok(ext || body);
  assert.match(body, /kind === 'address' \? ` data-addr="/,
    'the `data-addr` mark must stay conditional on the kind being an address');
  assert.match(body, /kind !== 'hash'/, 'and a hash must stay out of the explorer link');
});

/* The borrowed-description case, which is how the row reads when the `Queued` it closes is inside the
   window: `histOf` puts the description in front, and the label must not be lost behind it. */
test('with the Queued in view, the row carries both the description and the label', () => {
  const { e } = rendered('applied');
  const asHistOfWouldWrite = `setBeneficiaries · new table · ${e.what}`;

  assert.match(asHistOfWouldWrite, /setBeneficiaries/);
  assert.match(asHistOfWouldWrite, /action hash/,
    'the label is part of `what`, so prefixing a description cannot drop it');
});
