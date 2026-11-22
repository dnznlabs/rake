/* The wallet picker, and one recent-address list per chain (decision 67, #336).

   Two extensions announce themselves and the page used to keep whichever spoke first, with no way to
   reach the other. What is guarded here is the selection itself: which provider the page ends up
   holding, what it remembers, and the one case where it deliberately holds nothing and reads through
   the public endpoint instead — a choice offered rather than a guess made silently.

   Like `nowallet.test.mjs`, this strips the DEV fences first and lifts out of the *shipped* text, so a
   selection that only works behind `?rpc=` fails here. Like `who.test.mjs`, the declarations are the
   page's own: `discover`, `walletMenu`, `recents` and `addRecent` are evaluated, not reimplemented, so
   a reimplementation that agrees with a bug cannot pass. The stubs are the browser's side alone —
   announcements, `localStorage`, `document`, `window.ethereum`. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const FENCES = /\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g;
const SHIPPED = PAGE.replace(FENCES, '');

/* A whole declaration, by its first line and the line that closes it at column 0. `who.test.mjs`
   slices to the next newline because what it lifts is one line; these span several. */
const block = (anchor, end = '\n}\n') => {
  const at = SHIPPED.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  const to = SHIPPED.indexOf(end, at);
  assert.ok(to > at, `\`${anchor}\` is no longer closed by ${JSON.stringify(end)}`);
  return SHIPPED.slice(at, to + end.length);
};
const line = anchor => {
  const at = SHIPPED.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  return SHIPPED.slice(at, SHIPPED.indexOf('\n', at));
};

const ACCOUNT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

/* An announced wallet. The provider is identifiable so a test can say *which* one was chosen rather
   than only that something was. */
const wallet = (rdns, name = rdns) => ({
  info: { rdns, name, uuid: `uuid-${rdns}`, icon: 'data:image/svg+xml,<svg/>' },
  provider: { rdns, request: async () => [ACCOUNT] },
});

/* `discover` as shipped. The page's own `WALLETS`, `PICK` and `WALLET_KEY` declarations come along,
   so the key a choice is stored under is the page's string and not this file's guess. */
function load({ announce = [], stored = {}, injected = null }) {
  const listeners = [];
  const addEventListener = (type, fn) => { if (type === 'eip6963:announceProvider') listeners.push(fn); };
  /* The request event is what makes an extension announce; the stub answers it the way the browser
     does, by calling back synchronously, once per wallet. */
  const dispatchEvent = () => { for (const d of announce) for (const fn of listeners) fn({ detail: d }); };

  const kv = new Map(Object.entries(stored));
  const store = { get: k => (kv.has(k) ? kv.get(k) : null), set: (k, v) => kv.set(k, String(v)) };

  /* `readProvider` wraps a wallet for writes and falls back to the public endpoint for reads, which is
     a transport concern `nowallet.test.mjs` already covers. Here it only has to report what selection
     handed it: `null` is the no-wallet read path. */
  const given = [];
  const readProvider = p => { given.push(p); return p || { read: true }; };

  const body = [
    'let P = null, ACC = null, CHAIN = null;',
    'let WALLET = false;',
    line('let WALLETS = [], PICK'),
    line('const WALLET_KEY ='),
    block('async function discover'),
    'return { discover, state: () => ({ P, ACC, WALLET, WALLETS, PICK }) };',
  ].join('\n');

  const made = new Function(
    'addEventListener', 'dispatchEvent', 'Event', 'setTimeout', 'store', 'window', 'readProvider',
    'who', 'route', 'location', body,
  )(
    addEventListener, dispatchEvent, class Event {}, fn => fn(), store,
    { ethereum: injected }, readProvider, () => {}, () => {}, { reload: () => {} },
  );
  return { ...made, given, stored: kv };
}

test('both extensions are kept, in announcement order, and a repeat is not', async () => {
  const page = load({ announce: [wallet('io.metamask'), wallet('com.rainbow'), wallet('io.metamask')] });

  await page.discover();

  assert.deepEqual(page.state().WALLETS.map(w => w.info.rdns), ['io.metamask', 'com.rainbow']);
});

test('an announcement missing a provider or an rdns is not offered', async () => {
  const page = load({
    announce: [
      { info: { rdns: 'io.metamask', name: 'MetaMask' } },
      { provider: { request: async () => [] } },
      { info: { name: 'No rdns' }, provider: { request: async () => [] } },
      wallet('com.rainbow'),
    ],
  });

  await page.discover();

  assert.deepEqual(
    page.state().WALLETS.map(w => w.info.rdns),
    ['com.rainbow'],
    'a malformed announcement reached the menu, where picking it would throw',
  );
});

/* The four selection cases of decision 67. Each asserts the provider the page actually holds, because
   `PICK` agreeing while `P` is someone else is exactly the bug. */

test('a remembered wallet is used, even with another announced', async () => {
  const page = load({
    announce: [wallet('io.metamask'), wallet('com.rainbow')],
    stored: { 'rake.wallet': 'com.rainbow' },
  });

  await page.discover();
  const { PICK, WALLET } = page.state();

  assert.equal(PICK, 'com.rainbow');
  assert.equal(page.given[0].rdns, 'com.rainbow', 'the remembered wallet is not the one in use');
  assert.equal(WALLET, true);
});

test('a single announced wallet is used with nothing remembered', async () => {
  const page = load({ announce: [wallet('io.metamask')] });

  await page.discover();
  const { PICK, WALLET } = page.state();

  assert.equal(PICK, 'io.metamask');
  assert.equal(page.given[0].rdns, 'io.metamask');
  assert.equal(WALLET, true);
});

test('several announced and none remembered holds no wallet and reads publicly', async () => {
  const page = load({ announce: [wallet('io.metamask'), wallet('com.rainbow')] });

  await page.discover();
  const { PICK, WALLET, ACC } = page.state();

  assert.equal(PICK, '', 'a wallet was chosen for the visitor instead of offering the menu');
  assert.equal(page.given[0], null, 'selection guessed a provider rather than falling back to the endpoint');
  assert.equal(WALLET, false);
  assert.equal(ACC, null, 'an account was reported for a wallet the visitor never picked');
});

test('the injected global is used only when nothing announced', async () => {
  const injected = { rdns: 'window.ethereum', request: async () => [ACCOUNT] };

  const alone = load({ announce: [], injected });
  await alone.discover();
  assert.equal(alone.given[0], injected, 'with no announcement the global is the only wallet there is');
  assert.equal(alone.state().WALLET, true);

  const both = load({ announce: [wallet('io.metamask'), wallet('com.rainbow')], injected });
  await both.discover();
  assert.equal(both.given[0], null, 'the global is whichever extension won the race, so it is not a choice');
});

test('a remembered wallet that no longer announces is forgotten, not guessed past', async () => {
  const page = load({
    announce: [wallet('io.metamask'), wallet('com.rainbow')],
    stored: { 'rake.wallet': 'com.uninstalled' },
  });

  await page.discover();

  assert.equal(page.state().PICK, '');
  assert.equal(page.stored.get('rake.wallet'), '', 'the stale choice is still stored');
  assert.equal(page.given[0], null);
});

test('a load where nothing announces at all keeps the remembered choice', async () => {
  /* A disabled or slow extension is not a choice withdrawn. Wiping the key here would cost a visitor
     the wallet they picked, on a load that tells us nothing about it. */
  const page = load({ announce: [], stored: { 'rake.wallet': 'com.rainbow' } });

  await page.discover();

  assert.equal(page.stored.get('rake.wallet'), 'com.rainbow');
});

/* ---- the menu's rows ------------------------------------------------------------------------- */

const element = () => ({
  dataset: {}, children: [], textContent: '',
  appendChild(c) { this.children.push(c); },
});

function menu(wallets) {
  const km = element();
  const document = { createElement: () => element() };
  const made = new Function('WALLETS', 'km', 'document', `${block('function walletMenu')}\nreturn walletMenu;`);
  made(wallets, km, document)();
  return km;
}

test('a wallet name carrying markup is written as text and never as markup', async () => {
  const nasty = '<img src=x onerror="alert(1)">';
  const km = menu([wallet('io.evil', nasty)]);

  assert.equal(km.children.length, 1);
  assert.equal(km.children[0].textContent, nasty, 'the name is not the wallet\'s own string');
  assert.equal(km.children[0].innerHTML, undefined, 'a wallet\'s name was assigned as markup');
  assert.ok(
    !block('function walletMenu').includes('innerHTML'),
    'walletMenu builds markup, so a wallet name is a script injection (the name is a third party\'s string)',
  );
});

test('a row carries the rdns to pick by, and no icon is requested', async () => {
  const km = menu([wallet('io.metamask', 'MetaMask'), wallet('com.rainbow', 'Rainbow')]);

  assert.deepEqual(km.children.map(c => c.dataset.rdns), ['io.metamask', 'com.rainbow']);
  assert.deepEqual(km.children.map(c => c.dataset.a), ['pick', 'pick']);
  assert.deepEqual(km.children.map(c => c.textContent), ['MetaMask', 'Rainbow']);
  assert.ok(
    !block('function walletMenu').includes('icon'),
    'the menu renders a wallet-supplied icon url, which is a request this page does not need to make',
  );
});

test('a wallet with no name falls back to its rdns rather than an empty row', async () => {
  const w = wallet('io.metamask');
  w.info.name = '';
  const km = menu([w]);

  assert.equal(km.children[0].textContent, 'io.metamask');
});

/* ---- one recent list per chain --------------------------------------------------------------- */

/* Through the gateway a project's chains share an origin, so a single `rake.recent` was one list for
   every chain: an address visited on Sepolia was offered on Base Sepolia, where it may be a different
   contract or none at all. */
function history(chainId, kv) {
  const store = { get: k => (kv.has(k) ? kv.get(k) : null), set: (k, v) => kv.set(k, String(v)) };
  const body = [
    line('const isAddr ='),
    `const CFG = { chainId: '${chainId}' };`,
    line('const RECENT ='),
    block('const recents = ', '\n};\n'),
    line('const addRecent ='),
    'return { recents, addRecent, RECENT };',
  ].join('\n');
  return new Function('store', body)(store);
}

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';

test('the key carries the chain id', () => {
  const kv = new Map();
  assert.equal(history('11155111', kv).RECENT, 'rake.recent.11155111');
  assert.equal(history('84532', kv).RECENT, 'rake.recent.84532');
});

test('an address saved under one chain is not listed under another', () => {
  const kv = new Map();
  const sepolia = history('11155111', kv);
  const base = history('84532', kv);

  sepolia.addRecent(A);
  base.addRecent(B);

  assert.deepEqual(sepolia.recents(), [A]);
  assert.deepEqual(base.recents(), [B], 'one chain\'s addresses are offered on another (#328)');
});

test('the list a visitor already had is adopted by the chain they return on', () => {
  /* The unkeyed value predates the per-chain keys, so it is nobody's chain in particular and would
     otherwise simply vanish. It is copied into this chain's key on first read; a later visit to
     another chain adopts it too, which is the cost of not throwing away a list that was built before
     the keys existed. Addresses saved *after* the change are per chain, as the test above shows. */
  const kv = new Map([['rake.recent', JSON.stringify([A])]]);
  const sepolia = history('11155111', kv);

  assert.deepEqual(sepolia.recents(), [A]);
  assert.equal(kv.get('rake.recent.11155111'), JSON.stringify([A]), 'the legacy list was read but not adopted');

  sepolia.addRecent(B);

  assert.deepEqual(sepolia.recents(), [B, A]);
  assert.deepEqual(history('84532', kv).recents(), [A], 'an address added after the migration crossed chains');
});

test('a junk or hostile stored value yields an empty list rather than throwing', () => {
  for (const raw of ['', 'not json', '{}', '[1,2,3]', JSON.stringify(['0xnope', A])]) {
    const kv = new Map([['rake.recent.11155111', raw]]);
    const got = history('11155111', kv).recents();
    assert.ok(Array.isArray(got), `a stored ${JSON.stringify(raw)} did not yield a list`);
    assert.ok(got.every(v => /^0x[0-9a-fA-F]{40}$/.test(v)), `a non-address survived: ${JSON.stringify(got)}`);
  }
});

test('the list is capped at eight and the newest address leads', () => {
  const kv = new Map();
  const h = history('11155111', kv);
  const addrs = Array.from({ length: 10 }, (_, i) => `0x${String(i).repeat(40)}`.slice(0, 42));

  for (const a of addrs) h.addRecent(a);

  const got = h.recents();
  assert.equal(got.length, 8);
  assert.equal(got[0], addrs[9]);
});
