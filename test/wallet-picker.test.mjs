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

/* A provider that records what was asked of it, answers per method, and can emit the two events the
   page listens for. `unsupported` is the lever the fifth case needs: a wallet with no
   `wallet_revokePermissions` that still reports an account. */
const prov = (rdns, { accounts = [ACCOUNT], unsupported = [], chainId = '0xaa36a7' } = {}) => ({
  rdns,
  calls: [],
  handlers: [],
  on(ev, fn) { this.handlers.push([ev, fn]); },
  emit(ev, arg) { for (const [e, fn] of this.handlers) if (e === ev) fn(arg); },
  async request({ method }) {
    this.calls.push(method);
    if (unsupported.includes(method)) {
      const e = new Error('Method not supported');
      e.code = -32601;
      throw e;
    }
    if (method === 'eth_chainId') return chainId;
    return accounts;
  },
});

const announced = p => ({ info: { rdns: p.rdns, name: p.rdns, uuid: `uuid-${p.rdns}` }, provider: p });

/* The page's wallet path as shipped. The page's own `WALLETS`, `PICK`, `WALLET_KEY` and `OFF_KEY`
   declarations come along, so the keys a choice and a disconnect are stored under are the page's
   strings and not this file's guess. `kv` can be handed back in to stand for a reload: the store
   survives, everything else is built again. */
function load({ announce = [], stored = {}, injected = null, kv = null }) {
  const listeners = [];
  const addEventListener = (type, fn) => { if (type === 'eip6963:announceProvider') listeners.push(fn); };
  /* The request event is what makes an extension announce; the stub answers it the way the browser
     does, by calling back synchronously, once per wallet. */
  const dispatchEvent = () => { for (const d of announce) for (const fn of listeners) fn({ detail: d }); };

  kv = kv || new Map(Object.entries(stored));
  const store = { get: k => (kv.has(k) ? kv.get(k) : null), set: (k, v) => kv.set(k, String(v)) };
  const reloads = [];

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
    line('const OFF_KEY ='),
    line('const WIRED ='),
    block('async function discover'),
    block('function wire'),
    block('async function pickWallet'),
    block('function chainChanged'),
    block('async function connect'),
    block('async function disconnect'),
    'return { discover, connect, disconnect, chainChanged, pickWallet, state: () => ({ P, ACC, CHAIN, WALLET, WALLETS, PICK }) };',
  ].join('\n');

  const made = new Function(
    'addEventListener', 'dispatchEvent', 'Event', 'setTimeout', 'store', 'window', 'readProvider',
    'who', 'route', 'location', body,
  )(
    addEventListener, dispatchEvent, class Event {}, fn => fn(), store,
    { ethereum: injected }, readProvider, () => {}, () => {}, { reload: () => reloads.push(1) },
  );
  return { ...made, given, stored: kv, reloads };
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

/* ---- reloading only on a real chain change (#341) -------------------------------------------- */

/* Phantom's in-app browser reloads the dapp without stopping, through two different gateways. The
   page reloaded on every `chainChanged`, and a wallet that emits one on load makes that a loop. The
   cause is still a hypothesis until the preview is opened in Phantom; what is settled here is that an
   event naming the chain the page is already reading does not reload it. */

const chainOnly = chain => {
  const reloads = [];
  const body = [
    `let CHAIN = ${JSON.stringify(chain)};`,
    block('function chainChanged'),
    'return { chainChanged, read: () => CHAIN };',
  ].join('\n');
  return { ...new Function('location', body)({ reload: () => reloads.push(1) }), reloads };
};

test('an unchanged chain does not reload, whichever way the id is written', () => {
  for (const [held, event] of [[11155111, '0xaa36a7'], ['11155111', '0xaa36a7'], [84532, '0x14a34'], [11155111, 11155111]]) {
    const page = chainOnly(held);
    page.chainChanged(event);
    assert.deepEqual(page.reloads, [], `held ${JSON.stringify(held)}, event ${JSON.stringify(event)} reloaded`);
  }
});

test('a changed chain still reloads', () => {
  const page = chainOnly(11155111);

  page.chainChanged('0x14a34');

  assert.deepEqual(page.reloads, [1], 'a real chain change no longer reloads, so the page reads the wrong chain');
});

test('an event before any chain has been read records it instead of reloading', () => {
  const page = chainOnly(null);

  page.chainChanged('0xaa36a7');

  assert.deepEqual(page.reloads, [], 'nothing had been read yet, so there was nothing to re-read');
  assert.equal(page.read(), '11155111');
});

test('a wallet that emits chainChanged on load does not start a reload loop', async () => {
  const p = prov('app.phantom');
  const page = load({ announce: [announced(p)] });

  await page.discover();
  /* The page has read the chain by the time a wallet's load-time event arrives: `load()` sets CHAIN
     from `eth_chainId` right after `discover`. */
  page.chainChanged('0xaa36a7');
  p.emit('chainChanged', '0xaa36a7');
  p.emit('chainChanged', '0xaa36a7');

  assert.deepEqual(page.reloads, [], 'the page reloaded on an event naming the chain it already reads (#341)');
});

/* ---- disconnect holds across a reload --------------------------------------------------------- */

test('a wallet with no revoke still ends up disconnected after a reload', async () => {
  const p = prov('io.metamask', { unsupported: ['wallet_revokePermissions'] });
  const first = load({ announce: [announced(p)] });

  await first.discover();
  assert.equal(first.state().ACC, ACCOUNT, 'the fixture never connected, so the test proves nothing');

  await first.disconnect();
  assert.equal(first.state().ACC, null);
  assert.equal(first.stored.get('rake.off'), '1', 'nothing marks the page as disconnected');

  /* The reload: same wallet, same storage, everything else built again. The wallet still reports the
     account because the revoke it does not support never took anything away. */
  p.calls.length = 0;
  const second = load({ announce: [announced(p)], kv: first.stored });
  await second.discover();

  assert.equal(second.state().ACC, null, 'the wallet handed the account back and the page took it');
  assert.ok(
    !p.calls.includes('eth_accounts'),
    `the page asked the wallet for accounts while disconnected: ${p.calls.join(', ')}`,
  );
});

test('accountsChanged is ignored while disconnected', async () => {
  const p = prov('io.metamask', { unsupported: ['wallet_revokePermissions'] });
  const page = load({ announce: [announced(p)] });

  await page.discover();
  await page.disconnect();
  p.emit('accountsChanged', [ACCOUNT]);

  assert.equal(page.state().ACC, null, 'a wallet re-announcing its account reconnected the page by itself');
});

test('connect clears the mark and asks for the permission again', async () => {
  const p = prov('io.metamask', { unsupported: ['wallet_revokePermissions'] });
  const page = load({ announce: [announced(p)] });

  await page.discover();
  await page.disconnect();
  p.calls.length = 0;
  await page.connect();

  assert.equal(page.state().ACC, ACCOUNT);
  assert.equal(page.stored.get('rake.off'), '', 'the disconnect mark outlived the reconnect');
  assert.ok(
    p.calls.includes('wallet_requestPermissions'),
    `connect did not ask for the permission, so a wallet that supports it shows no prompt: ${p.calls.join(', ')}`,
  );
});

test('connect falls back where the permission request is unsupported', async () => {
  const p = prov('io.unsupported', { unsupported: ['wallet_revokePermissions', 'wallet_requestPermissions'] });
  const page = load({ announce: [announced(p)] });

  await page.discover();
  await page.disconnect();
  p.calls.length = 0;
  await page.connect();

  assert.equal(page.state().ACC, ACCOUNT, 'a wallet without wallet_requestPermissions can no longer connect');
  assert.ok(p.calls.includes('eth_requestAccounts'), p.calls.join(', '));
});

test('a refused permission request does not prompt a second time', async () => {
  const refusing = {
    rdns: 'io.refusing', calls: [], handlers: [],
    on(ev, fn) { this.handlers.push([ev, fn]); },
    async request({ method }) {
      this.calls.push(method);
      if (method === 'eth_accounts') return [ACCOUNT];
      const e = new Error('User rejected the request.');
      e.code = 4001;
      throw e;
    },
  };
  const page = load({ announce: [announced(refusing)] });

  await page.discover();
  await page.disconnect();
  refusing.calls.length = 0;
  await page.connect();

  assert.equal(page.state().ACC, null);
  assert.ok(
    !refusing.calls.includes('eth_requestAccounts'),
    `a refusal was followed by a second prompt: ${refusing.calls.join(', ')}`,
  );
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

/* ---- the phone links (#334) ------------------------------------------------------------------- */

/* A phone browser has no extension to announce, so the page is read-only there with nothing to say
   but a sentence. These links open the same page inside a wallet's own browser, where there is a
   wallet to connect. Only the two formats that were tapped on a real device are listed. */

const links = ({ ua = '', mobile = undefined, touch = 0, wallet = false, wallets = 0, url = 'https://rake.dnzn.dev/8453/#/docs' } = {}) => {
  const u = new URL(url);
  const navigator = { userAgent: ua, maxTouchPoints: touch };
  if (mobile !== undefined) navigator.userAgentData = { mobile };
  const body = [
    `const WALLET = ${wallet};`,
    `const WALLETS = new Array(${wallets});`,
    block('function isPhone'),
    block('function phoneLinks'),
    'return phoneLinks();',
  ].join('\n');
  return new Function('navigator', 'location', body)(navigator, {
    protocol: u.protocol, host: u.host, pathname: u.pathname, hash: u.hash,
  });
};

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

test('each link is built from this page\'s own host, path and fragment', () => {
  assert.deepEqual(links({ ua: IPHONE }), [
    ['MetaMask', 'https://metamask.app.link/dapp/rake.dnzn.dev/8453/#/docs'],
    ['Coinbase Wallet', 'https://go.cb-w.com/dapp?cb_url=https%3A%2F%2Frake.dnzn.dev%2F8453%2F%23%2Fdocs'],
  ]);
});

test('the list is empty on a desktop', () => {
  assert.deepEqual(links({ ua: DESKTOP }), [], 'a desktop with no wallet reads the sentence, unchanged');
  assert.deepEqual(links({ ua: IPHONE, mobile: false }), [], 'the browser\'s own hint outranks the user-agent string');
});

test('the list is empty when a wallet is found, phone or not', () => {
  assert.deepEqual(links({ ua: IPHONE, wallet: true }), []);
  assert.deepEqual(links({ ua: IPHONE, wallets: 2 }), [], 'a visitor with two wallets needs the picker, not an app store');
});

test('an iPad is a phone for this purpose, and a Mac is not', () => {
  assert.equal(links({ ua: IPAD, touch: 5 }).length, 2, 'an iPad reports a Mac user-agent and is told apart by its touch points');
  assert.deepEqual(links({ ua: IPAD, touch: 0 }), []);
});

test('a browser that says it is mobile is believed without a user-agent', () => {
  assert.equal(links({ ua: '', mobile: true }).length, 2);
});

test('the list is offered only over https', () => {
  assert.deepEqual(links({ ua: IPHONE, url: 'http://rake.dnzn.dev/8453/' }), [], 'a link built from an http: page hands the wallet an http: url');
});

test('a wallet that failed on the device is not listed', () => {
  const got = links({ ua: IPHONE }).map(([n]) => n);

  assert.deepEqual(got, ['MetaMask', 'Coinbase Wallet']);
  for (const off of ['Trust', 'Rainbow', 'Phantom']) {
    assert.ok(!got.some(n => n.includes(off)), `${off} is on the list; it was read as failing or is unproven (#334, #342)`);
  }
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

/* ---- the chain's name with no wallet --------------------------------------------------------- */

/* The criterion #328 raised, which the page already met: the header names the chain for a visitor
   with no wallet, from `CFG.chainId` rather than from a wallet's `CHAIN`. The search that reported it
   missing was case-sensitive and `CHAINS` spells the names in lower case, so this pins the name the
   page actually prints — a sentinel against the next search for `Sepolia`. */
test('the header names the chain with no wallet, in CHAINS lower case', () => {
  const paint = chain => {
    const el = { textContent: '' };
    const body = [
      line('const CHAINS ='),
      `const CFG = { chainId: '84532' };`,
      line('const cname ='),
      `const CHAIN = ${JSON.stringify(chain)};`,
      line('  document.getElementById(\'netname\')'),
      'return el;',
    ].join('\n');
    return new Function('document', 'el', body)({ getElementById: () => el }, el).textContent;
  };

  assert.equal(paint(null), 'base sepolia', 'a visitor with no wallet is not told which chain they are on');
  assert.equal(paint('11155111'), 'sepolia', 'a connected wallet\'s chain is not named');
  assert.ok(!paint(null).startsWith('chain '), 'the configured chain fell through to the numeric fallback');
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

/* ---- a wallet that is no longer in use (review of #347 at cff988b) ---------------------------- */

/* `wire` attaches `accountsChanged` and `chainChanged` to whatever provider is in use, and an
   extension cannot be reliably un-subscribed from: EIP-1193's `removeListener` is optional. So after
   picking wallet A and then wallet B, A is still talking. The page would show A's account while
   sending through B — one wallet's address with another's transactions — and A's `chainChanged`
   would reload a page reading through B. */

const OTHER_ACCOUNT = '0x00000000219ab540356cBB839Cbe05303d7705Fa';

test('a wallet that was picked and then replaced cannot set the account', async () => {
  const a = prov('io.metamask', { accounts: [ACCOUNT] });
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  assert.equal(page.state().PICK, '', 'two wallets and none remembered should hold no wallet');

  await page.pickWallet('io.metamask');
  assert.equal(page.state().ACC, ACCOUNT, 'picking A did not connect A, so the test proves nothing');

  await page.disconnect();
  await page.pickWallet('com.rainbow');
  assert.equal(page.state().ACC, OTHER_ACCOUNT, 'picking B did not connect B');

  /* A is still subscribed, and now reports an account change of its own. */
  a.emit('accountsChanged', [ACCOUNT]);

  assert.equal(
    page.state().ACC,
    OTHER_ACCOUNT,
    'a wallet that is no longer in use set the account: the page would show its address and send through the other',
  );
});

test('a replaced wallet cannot reload the page either', async () => {
  const a = prov('io.metamask', { accounts: [ACCOUNT] });
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  await page.pickWallet('io.metamask');
  await page.disconnect();
  await page.pickWallet('com.rainbow');
  page.reloads.length = 0;

  a.emit('chainChanged', '0x1');

  assert.deepEqual(page.reloads, [], 'a wallet that is no longer in use reloaded the page');
});

test('the wallet in use still reaches the page', async () => {
  /* The control: the same mechanism must not ignore events from the provider that *is* in use, or
     the guard above would pass by breaking the feature. */
  const a = prov('io.metamask', { accounts: [ACCOUNT] });
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  await page.pickWallet('com.rainbow');

  b.emit('accountsChanged', [ACCOUNT]);
  assert.equal(page.state().ACC, ACCOUNT, 'the wallet in use can no longer report an account change');

  page.reloads.length = 0;
  b.emit('chainChanged', '0x1');
  assert.deepEqual(page.reloads, [1], 'the wallet in use can no longer move the page to another chain');
});

test('picking the same wallet twice does not double its handlers', async () => {
  const a = prov('io.metamask', { accounts: [ACCOUNT] });
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  await page.pickWallet('io.metamask');
  await page.pickWallet('io.metamask');

  assert.deepEqual(
    a.handlers.map(([e]) => e).sort(),
    ['accountsChanged', 'chainChanged'],
    `one pair per provider, got ${a.handlers.length} handlers`,
  );
});

/* ---- a pick the wallet never answers ----------------------------------------------------------
   Found by hand by the Product Owner on 2026-11-21, dev build, MetaMask and Trust Wallet both
   installed: picking a wallet wrote `rake.wallet` before the wallet had said anything, so rejecting
   or closing its prompt left the choice remembered. Every later Connect went straight back to that
   wallet, and the only control that forgets a pick is Disconnect, which the page shows only once an
   account is connected — so the way out was editing localStorage by hand. The pick is now written
   after the account comes back, and these cases are the three ways it can fail to. */

// Rejects everything it is asked, the way a wallet reports a dismissed prompt (EIP-1193, 4001).
const refuser = (rdns, { chainId = '0xaa36a7' } = {}) => ({
  rdns,
  calls: [],
  handlers: [],
  on(ev, fn) { this.handlers.push([ev, fn]); },
  emit(ev, arg) { for (const [e, fn] of this.handlers) if (e === ev) fn(arg); },
  async request({ method }) {
    this.calls.push(method);
    if (method === 'eth_chainId') return chainId;
    const e = new Error('User rejected the request.');
    e.code = 4001;
    throw e;
  },
});

test('a rejected prompt leaves nothing remembered and the menu on offer', async () => {
  const a = refuser('io.metamask');
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  const read = page.state().P;

  await page.pickWallet('io.metamask');

  const s = page.state();
  assert.equal(s.ACC, null, 'the refusing fixture connected, so the test proves nothing');
  assert.equal(page.stored.get('rake.wallet'), undefined, 'the refused pick was remembered');
  assert.equal(s.PICK, '', 'the refused pick is still the page\'s choice');
  assert.equal(s.WALLET, false, 'the page still holds the refusing wallet as the one in use');
  assert.equal(s.P, read, 'reads did not go back to the public endpoint');
  /* What the visitor sees next: `who()` offers the menu on exactly this state — no account, no
     wallet in use, more than one announced. */
  assert.ok(s.WALLETS.length > 1 && !s.ACC && !s.WALLET, 'the next Connect would not offer the menu');
});

test('a reload after a rejected prompt still offers the menu', async () => {
  const a = refuser('io.metamask');
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const first = load({ announce: [announced(a), announced(b)] });

  await first.discover();
  await first.pickWallet('io.metamask');

  // The storage is the only thing that crosses a reload, which is the whole of the defect.
  const second = load({ announce: [announced(a), announced(b)], kv: first.stored });
  await second.discover();

  assert.equal(second.state().PICK, '', 'the reload picked up the wallet whose prompt was refused');
  assert.equal(second.state().ACC, null);
  assert.ok(!a.calls.includes('eth_accounts'), `the refused wallet was asked for accounts: ${a.calls.join(', ')}`);
});

test('a prompt that never answers stores nothing while it hangs', async () => {
  /* Closing the window on a prompt is not a rejection: the promise simply never settles. Nothing
     may be written before it does. */
  const hanging = {
    rdns: 'io.metamask',
    handlers: [],
    on(ev, fn) { this.handlers.push([ev, fn]); },
    async request({ method }) {
      if (method === 'eth_chainId') return '0xaa36a7';
      return new Promise(() => {});
    },
  };
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(hanging), announced(b)] });

  await page.discover();
  const pick = page.pickWallet('io.metamask');
  // Several turns of the microtask queue: enough for anything that was going to be written.
  for (let i = 0; i < 10; i++) await Promise.resolve();

  assert.equal(page.stored.get('rake.wallet'), undefined, 'the pick was remembered before the wallet answered');
  assert.equal(page.state().ACC, null);
  void pick;
});

test('a wallet that throws on connect leaves nothing remembered either', async () => {
  /* The fallback path: `wallet_requestPermissions` unsupported, then `eth_requestAccounts` fails
     with something that is not a refusal, so the error leaves `connect` and `pickWallet`. The pick
     must be forgotten on the way out, and the error must still reach the caller. */
  const a = {
    rdns: 'io.metamask',
    handlers: [],
    on(ev, fn) { this.handlers.push([ev, fn]); },
    async request({ method }) {
      if (method === 'eth_chainId') return '0xaa36a7';
      if (method === 'wallet_requestPermissions') {
        const e = new Error('Method not supported');
        e.code = -32601;
        throw e;
      }
      const e = new Error('Already processing eth_requestAccounts.');
      e.code = -32002;
      throw e;
    },
  };
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  await assert.rejects(() => page.pickWallet('io.metamask'), /Already processing/, 'the error was swallowed');

  assert.equal(page.stored.get('rake.wallet'), undefined, 'the failed pick was remembered');
  assert.equal(page.state().PICK, '');
  assert.equal(page.state().WALLET, false);
});

test('a pick the wallet answers is remembered', async () => {
  // The control: the three cases above must not pass by never storing a choice at all.
  const a = prov('io.metamask', { accounts: [ACCOUNT] });
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const page = load({ announce: [announced(a), announced(b)] });

  await page.discover();
  await page.pickWallet('io.metamask');

  assert.equal(page.state().ACC, ACCOUNT);
  assert.equal(page.state().PICK, 'io.metamask');
  assert.equal(page.stored.get('rake.wallet'), 'io.metamask', 'a wallet that connected was not remembered');
});

test('Disconnect after a pick offers the menu again, and a reload does not reconnect', async () => {
  /* The half of the Product Owner's report that was reasoned from the code and not run: the control
     that forgets a pick is there once an account is connected, and it reaches the store. */
  const a = prov('io.metamask', { accounts: [ACCOUNT] });
  const b = prov('com.rainbow', { accounts: [OTHER_ACCOUNT] });
  const first = load({ announce: [announced(a), announced(b)] });

  await first.discover();
  await first.pickWallet('io.metamask');
  assert.equal(first.state().ACC, ACCOUNT, 'the pick never connected, so the test proves nothing');

  await first.disconnect();

  const s = first.state();
  assert.equal(s.PICK, '', 'Disconnect kept the pick');
  assert.equal(first.stored.get('rake.wallet'), '', 'Disconnect left the pick in the store');
  assert.equal(s.WALLET, false);
  assert.equal(s.ACC, null);

  const second = load({ announce: [announced(a), announced(b)], kv: first.stored });
  await second.discover();
  assert.equal(second.state().PICK, '', 'the reload reconnected the wallet that was disconnected');
  assert.equal(second.state().ACC, null);
});
