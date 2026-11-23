/* What a wallet on another network is told, now that it no longer stops the page (#403).

   The refusal used to be the whole view: "Your wallet is on X. This app lives on Y", and nothing else
   painted. Since every read is the document's chain through the document's provider, that was hiding a
   page that works — so the refusal moved to the write, where `tx()` has had it since #375, and what
   stays here is a **visible, non-blocking** notice. The architect's reason for keeping one at all: the
   network pill is too quiet for a state in which every write control on the page will refuse.

   Both halves matter and each is a defect on its own. Silent, and a reader presses `distribute` and
   `apply` and `release` and gets nothing but refusals with no explanation. Blocking, and we are back to
   blanking a page that reads perfectly well.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

const block = (anchor, end = '\n}\n', from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  const to = from.indexOf(end, at);
  assert.ok(to > at, `\`${anchor}\` is no longer closed by ${JSON.stringify(end)}`);
  return from.slice(at, to + end.length);
};
const line = (anchor, from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer has \`${anchor}\``);
  return from.slice(at, from.indexOf('\n', at));
};

const WRONG_CHAIN = line('const wrongChain = () =>');
const CHAIN_BAR = block('function chainBar() {');

/** `chainBar()` with the page on one chain and the wallet on another, returning what it wrote and
 *  whether it hid itself. The element is a stand-in good enough for the two things the function sets. */
function bar({ pageChain = 11155111, walletChain = 84532, enabled = [11155111, 84532] } = {}) {
  const el = { hidden: false, innerHTML: '' };
  const src = `
    const CFG = { chainId: PAGE_CHAIN };
    const CHAIN = WALLET_CHAIN;
    const CHAINS = { 1: 'mainnet', 8453: 'base', 11155111: 'sepolia', 84532: 'base sepolia' };
    const cname = id => CHAINS[id] || 'chain ' + id;
    const enabled = id => ENABLED.includes(Number(id));
    const chainHref = id => '#/' + id;
    const esc = s => String(s);
    const switchChain = () => { SWITCHED.n++; };
    const document = { getElementById: id => (id === 'chainbar' ? EL : { onclick: null }) };
    ${WRONG_CHAIN}
    ${CHAIN_BAR}
    return chainBar;
  `;
  const switched = { n: 0 };
  new Function('PAGE_CHAIN', 'WALLET_CHAIN', 'ENABLED', 'EL', 'SWITCHED', src)(
    pageChain, walletChain, enabled, el, switched)();
  return { el, switched };
}

test('a wallet on another network is told, and told what it costs', () => {
  const { el } = bar({ pageChain: 11155111, walletChain: 84532 });

  assert.equal(el.hidden, false, 'the one state this notice exists for must not be hidden');
  assert.match(el.innerHTML, /on base sepolia/, 'it names where the wallet is');
  assert.match(el.innerHTML, /this page is sepolia/, 'and where the page is');
  /* The sentence a reader acts on: the page works, the writes do not. Without this half they meet the
     refusal one control at a time. */
  assert.match(el.innerHTML, /Reading works/);
  assert.match(el.innerHTML, /every control that writes will refuse/);
  assert.match(el.innerHTML, /Switch network/, 'and the control that fixes it, which the old refusal carried');
});

test('it is a notice and not a view: nothing about it replaces the page', () => {
  /* The guard against going back. `chainBar` writes to its own element and the route paints the view
     regardless — asserted by reading the route rather than the bar, because that is where the old
     refusal lived. */
  const at = SHIPPED.indexOf('  chainBar();\n  if (S.error)');
  assert.ok(at > 0, 'route() must call chainBar and carry on to the view');
  const route = SHIPPED.slice(SHIPPED.indexOf('function route() {'), SHIPPED.indexOf('\n}\n', SHIPPED.indexOf('function route() {')));
  assert.doesNotMatch(route, /if \(wrongChain\(\)\) \{ V\.innerHTML/,
    'a wrong chain may not replace the view: the page reads its own chain (#403)');
  assert.match(route, /chainBar\(\);/, 'and must paint the notice instead');
});

test('on the right chain it says nothing at all', () => {
  const { el } = bar({ pageChain: 11155111, walletChain: 11155111 });

  assert.equal(el.hidden, true);
  assert.equal(el.innerHTML, '', 'an empty bar still occupying the document is a gap in the layout');
});

test('with no wallet read yet it says nothing — null is not another chain', () => {
  /* `CHAIN` is `null` until something has answered, and `wrongChain()` is written to treat that as "not
     read" rather than as a mismatch. A bar that flashed on every load before the wallet answered would
     be the pill's own `null` bug one layer up. */
  const { el } = bar({ pageChain: 11155111, walletChain: null });

  assert.equal(el.hidden, true);
});

test('where the wallet\'s chain is one rake is on, it offers that door too', () => {
  const on = bar({ pageChain: 11155111, walletChain: 84532, enabled: [11155111, 84532] });
  assert.match(on.el.innerHTML, /open rake on base sepolia/);

  /* And where it is not, there is nothing to link: a link to a chain this app does not serve is a
     dead end dressed as a way out. */
  const off = bar({ pageChain: 11155111, walletChain: 8453, enabled: [11155111, 84532] });
  assert.doesNotMatch(off.el.innerHTML, /open rake on/);
  assert.match(off.el.innerHTML, /on base/, 'it still names where the wallet is');
});
