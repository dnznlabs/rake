/* `CHAIN` is one type, and name resolution survives every way it is set (#379).

   The defect was not a wrong value but a wrong *type*. `CHAIN` was a number from `load()` and a
   string from `pickWallet` and `chainChanged`, while the three name gates compare it strictly
   against numbers — so after a wallet was picked from the menu, or after the same-chain
   `chainChanged` that Phantom emits on load, `resolveName` returned `null` before asking any
   registry and the forward field printed "names resolve on mainnet and Sepolia" *while on* Sepolia.
   Nothing restored the number for the life of the page.

   So a test on the value alone would have passed throughout. What is asserted here is the type after
   each of the three assignments, that the page's own lines are the ones doing the assigning, and —
   the part that would actually have caught it — that a registry is *reached* after each transition.
   Like `wallet-picker.test.mjs` and `who.test.mjs`, the declarations are lifted from the DEV-stripped
   page rather than reimplemented, so a reimplementation that agrees with the bug cannot pass. */
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
  assert.ok(at >= 0, `app/src/index.html no longer has the line \`${anchor}\` — this test lifts it`);
  return SHIPPED.slice(at, SHIPPED.indexOf('\n', at));
};

const AS_CHAIN = block('const asChain = id => {', '\n};\n');
const CHAIN_CHANGED = block('function chainChanged(id) {');
const RESOLVE_NAME = block('async function resolveName(acc) {');
const NAME_CHAINS = line('const NAME_CHAINS =');
const NAMES_HERE = line('const namesHere =');
/* The two assignment lines themselves, not a copy of them: `pickWallet`'s and `load()`'s.

   **Anchored on `CHAIN =`, deliberately not on `asChain(`.** Anchoring on the fixed right-hand side
   made the mutation test fail for the wrong reason: putting the `String(Number(…))` back stopped the
   anchor matching, so the file failed at the lift and every behavioural assertion was skipped — a
   failure that cannot tell a renamed line from a reintroduced bug. Lifting whatever the line now
   assigns means the bug comes back *into the harness*, and the type and name assertions below are
   what fail.

   **And each is anchored inside its own function** (#403). `load()`'s call used to be the unguarded
   one, which made `  CHAIN = ` unique to it; now both are guarded and the two lines differ only in
   their catch bodies, so shape cannot tell them apart. A lift that distinguishes two sites by their
   spelling breaks the moment they come to agree — this file broke exactly that way, and a test
   written an hour later in `wallet-allowlist.test.mjs` broke the same way against correct code. */
const assignIn = fn => {
  const at = SHIPPED.indexOf(fn);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${fn}\` — this test lifts its CHAIN assignment`);
  const end = SHIPPED.indexOf('\n}\n', at);
  const hit = SHIPPED.indexOf('CHAIN = ', at);
  assert.ok(hit > at && hit < end, `\`${fn}\` no longer assigns CHAIN`);
  const bol = SHIPPED.lastIndexOf('\n', hit) + 1;
  return SHIPPED.slice(bol, SHIPPED.indexOf('\n', hit));
};
const PICK_ASSIGN = assignIn('async function pickWallet(');
const LOAD_ASSIGN = assignIn('async function load() {');

const ACC = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const SEPOLIA_HEX = '0xaa36a7';

/* The page's own code, with only the browser's side stubbed: a provider that answers `eth_chainId`,
   a `location` whose reload is counted rather than performed, and three registries that record
   being asked. `asked` is the observation that matters — a gate that returns early never appears
   in it. */
function harness({ chainId = SEPOLIA_HEX, pageChain = '11155111', ensAnswer = 'denizen.eth' } = {}) {
  const src = `
    let CHAIN = null;
    let reloads = 0;
    const location = { reload: () => { reloads++; } };
    const P = { request: async ({ method }) => (method === 'eth_chainId' ? CHAIN_ID : null) };
    const CFG = { chainId: PAGE_CHAIN };
    const asked = [];
    const NAMES = [{ id: 'ens' }, { id: 'wns' }, { id: 'gns' }];
    async function ensName(a) { asked.push('ens'); return ENS_ANSWER; }
    async function regName(reg, a) { asked.push(reg.id); return null; }
    ${AS_CHAIN}
    ${NAME_CHAINS}
    ${NAMES_HERE}
    ${CHAIN_CHANGED}
    ${RESOLVE_NAME}
    const viaLoad = async () => { ${LOAD_ASSIGN} };
    const viaPick = async () => { ${PICK_ASSIGN} };
    return {
      chain: () => CHAIN,
      setChain: v => { CHAIN = v; },
      reloads: () => reloads,
      asked: () => asked.slice(),
      clear: () => { asked.length = 0; },
      asChain, chainChanged, resolveName, viaLoad, viaPick, namesHere,
    };
  `;
  return new Function('CHAIN_ID', 'ENS_ANSWER', 'PAGE_CHAIN', src)(chainId, ensAnswer, pageChain);
}

test('asChain answers a number for every shape a provider returns, and null for nothing', () => {
  const h = harness();
  assert.equal(h.asChain('0xaa36a7'), 11155111);
  assert.equal(h.asChain('0x1'), 1);
  assert.equal(h.asChain('0x14a34'), 84532);
  assert.equal(h.asChain(11155111), 11155111);
  assert.equal(h.asChain('11155111'), 11155111);
  for (const v of ['0xaa36a7', '0x1', 11155111, '11155111']) assert.equal(typeof h.asChain(v), 'number');
  // Not read yet stays one value, and garbage does not become NaN — `CHAIN === null` is the test
  // the rest of the page makes.
  assert.equal(h.asChain(null), null);
  assert.equal(h.asChain(undefined), null);
  assert.equal(h.asChain('not a chain'), null);
});

test('assignment 1 of 3 — load() leaves CHAIN a number', async () => {
  const h = harness({ chainId: SEPOLIA_HEX });
  await h.viaLoad();
  assert.equal(typeof h.chain(), 'number', 'load() must leave CHAIN a number');
  assert.equal(h.chain(), 11155111);
});

test('assignment 2 of 3 — pickWallet leaves CHAIN a number', async () => {
  const h = harness({ chainId: SEPOLIA_HEX });
  await h.viaPick();
  assert.equal(typeof h.chain(), 'number', 'picking a wallet must leave CHAIN a number, not a string');
  assert.equal(h.chain(), 11155111);
});

test('assignment 3 of 3 — a same-chain chainChanged leaves CHAIN a number and does not reload', () => {
  const h = harness();
  h.setChain(11155111);
  h.chainChanged(SEPOLIA_HEX);
  assert.equal(typeof h.chain(), 'number', 'chainChanged must leave CHAIN a number');
  assert.equal(h.chain(), 11155111);
  assert.equal(h.reloads(), 0, '#341: the same chain is not a change, so the page must not reload');
});

test('the first chainChanged records the chain without reloading, still as a number', () => {
  const h = harness();
  assert.equal(h.chain(), null);
  h.chainChanged(SEPOLIA_HEX);
  assert.equal(h.chain(), 11155111);
  assert.equal(typeof h.chain(), 'number');
  assert.equal(h.reloads(), 0);
});

test('a real change still reloads', () => {
  const h = harness();
  h.setChain(11155111);
  h.chainChanged('0x1');
  assert.equal(h.reloads(), 1, 'a different chain must still reload the page');
});

/* The four that would have caught #379: not the type, but a registry being reached. */
test('a name resolves after a wallet is picked from the menu', async () => {
  const h = harness({ chainId: SEPOLIA_HEX, pageChain: '11155111' });
  await h.viaPick();
  const n = await h.resolveName(ACC);
  assert.deepEqual(h.asked(), ['ens'], 'resolveName must ask a registry after a wallet is picked');
  assert.equal(n, 'denizen.eth');
});

/* #375 in the same place: the gate is the **document's** chain, so a wallet somewhere else neither
   unlocks nor blocks resolution. Before, the wallet's chain decided — which is how a page built for
   Sepolia came to read a mainnet name, and how a wallet on a chain with no registry silenced one. */
test('the page decides whether names resolve, not the wallet', async () => {
  // Page on Sepolia, wallet on Base: the page has a registry, so it is asked.
  const onBase = harness({ chainId: '0x2105', pageChain: '11155111' });
  await onBase.viaPick();
  assert.equal(onBase.chain(), 8453, 'the wallet is still recorded as being on Base');
  assert.equal(await onBase.resolveName(ACC), 'denizen.eth');
  assert.deepEqual(onBase.asked(), ['ens'], "the page's own chain can answer, so it is asked");

  // Page on Base, wallet on mainnet: the page has no registry, so nothing is asked and no mainnet
  // name can reach a page that is not showing mainnet.
  const pageBase = harness({ chainId: '0x1', pageChain: '8453' });
  await pageBase.viaPick();
  assert.equal(pageBase.chain(), 1);
  assert.equal(await pageBase.resolveName(ACC), null);
  assert.deepEqual(pageBase.asked(), [], 'a page built for Base must not read a name off mainnet');
});

test('a name resolves after a same-chain chainChanged', async () => {
  const h = harness();
  h.setChain(11155111);
  h.chainChanged(SEPOLIA_HEX);
  const n = await h.resolveName(ACC);
  assert.deepEqual(h.asked(), ['ens'], 'resolveName must ask a registry after a same-chain event');
  assert.equal(n, 'denizen.eth');
});

test('a name resolves after load(), on mainnet as well as Sepolia', async () => {
  for (const [hexId, id] of [[SEPOLIA_HEX, 11155111], ['0x1', 1]]) {
    const h = harness({ chainId: hexId, pageChain: String(id) });
    await h.viaLoad();
    assert.equal(h.chain(), id);
    assert.equal(await h.resolveName(ACC), 'denizen.eth');
    assert.deepEqual(h.asked(), ['ens']);
  }
});

/* The control. A gate that cannot refuse is not a gate, so the chains that have no registry must
   still return before asking — otherwise the two tests above would pass on a page with no gate. */
test('on a chain with no registry, resolveName refuses without asking', async () => {
  for (const id of ['8453', '84532']) {          // Base, Base Sepolia
    const h = harness({ chainId: '0x' + Number(id).toString(16), pageChain: id });
    await h.viaLoad();
    assert.equal(await h.resolveName(ACC), null);
    assert.deepEqual(h.asked(), [], `a page on ${id} has no registry, so nothing should be asked`);
  }
});

/* The guard that keeps "one type" true as the file changes: every assignment to `CHAIN` in the
   shipped page is the declaration, an `asChain(…)`, or the restore of a saved value. A fourth
   assignment written any other way fails here rather than in a browser six weeks later. */
test('every CHAIN assignment in the shipped page goes through asChain', () => {
  // `=(?!=)` so a comparison is not read as an assignment: the first draft of this guard failed on
  // the sentence `CHAIN === null` inside the comment that explains the rule.
  const assigns = [...SHIPPED.matchAll(/(?<!\w)CHAIN\s*=(?!=)\s*([^;\n]+)/g)]
    .map(m => m[1].trim())
    .filter(v => !v.startsWith('null')          // the declaration
      && !v.startsWith('was.CHAIN')             // pickWallet's revert of its own change
      && !v.startsWith('n;') && v !== 'n');     // chainChanged, which took `n` from asChain
  assert.ok(assigns.length > 0, 'no CHAIN assignments found — this guard has stopped looking at anything');
  for (const v of assigns) {
    assert.ok(v.startsWith('asChain('), `CHAIN is assigned \`${v}\` — every assignment must go through asChain (#379)`);
  }
});
