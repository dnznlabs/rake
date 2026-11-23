/* The page's own chain answers the questions that are about the page (#375).

   Three reads are questions about the chain the document was built for, not about wherever the
   wallet is pointed: whether a salt is already taken, whether the call about to be sent would
   revert, and what name an address has. They went through `P`, which is the wallet when there is
   one. Measured on 2026-11-22, MetaMask mobile **ignores the `chainId` field in the call object**, so
   a page cannot tag a read with the chain it means — it has to choose the transport.

   The cost was not a wrong message but a wrong answer: with a wallet on Ethereum and a page built
   for Sepolia, `createPredict` asked Ethereum whether the salt was free, found it free, and enabled
   **Deploy** for an address already taken on Sepolia. The name half is in `chain-type.test.mjs`;
   here are the two that need the page's own functions driven: the salt and the preflight.

   Both harnesses lift from the DEV-stripped page, so a fix that only works behind `?rpc=` fails. */
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

const TX = block('async function tx(to, sig, args, opts) {');
const CREATE_PREDICT = block('async function createPredict() {');

const ACC = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const PREDICTED = '0x7acCc483b159929c97670E6Dbc796316f53b31dE';
const SOME_CODE = '0x5f5f365f5f37365f73c4ed7ea2';

/* A fake element good enough for the two lines these functions write, recording what was set so an
   assertion can read the sentence a person would have seen. */
const el = () => ({ innerHTML: '', textContent: '', className: '', classList: { add() {}, remove() {} }, disabled: false });

/** `tx()` with the wallet and the page on different chains. Each provider records what it was asked,
 *  which is the whole point: the mismatch must be found before anything is simulated anywhere. */
function txHarness({ pageChain = '11155111', walletChain = '0x1' } = {}) {
  const els = { txs: el() };
  const src = `
    const ACC = ACCOUNT;
    const CFG = { chainId: PAGE_CHAIN };
    const CHAINS = { 1: 'Ethereum', 11155111: 'Sepolia', 8453: 'Base', 84532: 'Base Sepolia' };
    const cname = id => CHAINS[id] || 'chain ' + id;
    const asChain = id => { if (id == null) return null; const n = Number(id); return Number.isFinite(n) ? n : null; };
    const Eth = { enc: () => '0xdeadbeef' };
    const walletAsked = [], pageAsked = [];
    const P = { request: async ({ method }) => { walletAsked.push(method); return method === 'eth_chainId' ? WALLET_CHAIN : '0x'; } };
    const pageRead = () => ({ request: async ({ method }) => { pageAsked.push(method); return '0x'; } });
    const document = { getElementById: id => ELS[id === 'txs' ? 'txs' : 'txs'] };
    const txSay = (label, text, cls) => { ELS.txs.textContent = label + ' · ' + text; };
    const txError = e => 'reverted';
    const POLL_MS = 1;
    const ext = (k, v, t) => t;
    const short = h => h;
    const waitReceipt = async () => ({ status: '0x1', blockNumber: '0x1' });
    ${TX}
    return { tx, walletAsked: () => walletAsked.slice(), pageAsked: () => pageAsked.slice() };
  `;
  const made = new Function('ACCOUNT', 'PAGE_CHAIN', 'WALLET_CHAIN', 'ELS', src)(ACC, pageChain, walletChain, els);
  return { ...made, els };
}

test('a wallet on another chain is told it is a mismatch, and nothing is simulated first', async () => {
  const h = txHarness({ pageChain: '11155111', walletChain: '0x1' });

  const r = await h.tx('0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E', 'create(...)', [], { label: 'create' });

  assert.equal(r.ok, false);
  assert.equal(r.stage, 'chain', 'a chain mismatch must be reported as a mismatch, not as a revert');
  assert.match(r.text, /on Ethereum/);
  assert.match(r.text, /lives on Sepolia/);
  assert.match(h.els.txs.textContent, /create · your wallet is on Ethereum/);
  // The order is the fix: the chain is read before anything is simulated, so a mismatch never
  // produces a true sentence about the wrong chain.
  assert.deepEqual(h.pageAsked(), [], 'nothing should be simulated while the chains disagree');
  assert.deepEqual(h.walletAsked(), ['eth_chainId'], 'the wallet should be asked only which chain it is on');
});

test('when the chains agree, the preflight goes through the page and the send through the wallet', async () => {
  const h = txHarness({ pageChain: '11155111', walletChain: '0xaa36a7' });

  const r = await h.tx('0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E', 'create(...)', [], { label: 'create' });

  assert.equal(r.ok, true);
  assert.deepEqual(h.pageAsked(), ['eth_call'], 'the preflight belongs to the page’s own chain');
  assert.deepEqual(h.walletAsked(), ['eth_chainId', 'eth_sendTransaction'],
    'the wallet is asked for its chain and for the signature, and simulates nothing');
});

/** `createPredict` with the two chains disagreeing about whether the salt is taken: free on the
 *  wallet's chain, taken on the page's. The page's answer must win. */
function predictHarness({ walletCode = '0x', pageCode = SOME_CODE } = {}) {
  const els = { 'c-predict': el(), 'c-deploy': el(), 'c-why': el() };
  const src = `
    const ACC = ACCOUNT;
    const CFG = { chainId: '11155111', factory: '0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E' };
    const DRAFT = { n: '1', rows: [], deposit: '' };
    const TOKEN = 1;
    const stale = () => false;
    const Model = { salt: () => '0x' + '11'.repeat(32), wei: () => 0n };
    const esc = s => String(s);
    const ext = (k, v, t) => t;
    const notice = (t) => '<notice>' + t + '</notice>';
    const editorState = () => ({ ok: true, why: '' });
    const walletAsked = [], pageAsked = [];
    // The wallet says the salt is free; the page's chain says it is taken.
    const P = { request: async ({ method }) => { walletAsked.push(method); return WALLET_CODE; } };
    const pageRead = () => ({ request: async ({ method }) => { pageAsked.push(method); return PAGE_CODE; } });
    const pcall = async () => [PREDICTED_AT];
    const nameSweep = () => {};
    let paints = 0;
    const paintCreate = () => { paints++; };
    const document = { getElementById: id => ELS[id] || null };
    ${CREATE_PREDICT}
    return { createPredict, draft: () => DRAFT, paints: () => paints, walletAsked: () => walletAsked.slice(), pageAsked: () => pageAsked.slice() };
  `;
  const made = new Function('ACCOUNT', 'WALLET_CODE', 'PAGE_CODE', 'PREDICTED_AT', 'ELS', src)(
    ACC, walletCode, pageCode, PREDICTED, els);
  return { ...made, els };
}

test('a salt taken on the page’s chain reads as taken, though the wallet’s chain says it is free', async () => {
  const h = predictHarness({ walletCode: '0x', pageCode: SOME_CODE });

  await h.createPredict();

  assert.equal(h.draft().taken, true,
    'the document’s chain decides whether the salt is taken — this is how Deploy came to be enabled for a taken address');
  assert.match(h.els['c-predict'].innerHTML, /already exists/);
  assert.deepEqual(h.pageAsked(), ['eth_getCode'], 'the code read belongs to the page’s chain');
  assert.deepEqual(h.walletAsked(), [], 'the wallet must not be asked whether the salt is free');
});

/* The control. If the harness reported "taken" whatever it was told, the test above would pass
   against a page that ignored both chains. */
test('a salt free on the page’s chain reads as free, though the wallet’s chain says it is taken', async () => {
  const h = predictHarness({ walletCode: SOME_CODE, pageCode: '0x' });

  await h.createPredict();

  assert.equal(h.draft().taken, false);
  assert.match(h.els['c-predict'].innerHTML, /will deploy to/);
  assert.deepEqual(h.walletAsked(), []);
});
