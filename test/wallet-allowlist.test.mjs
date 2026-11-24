/* What the wallet's provider may be asked, and nothing else (#403).

   The rule on `main`: **every read of the chain the document was built for goes through the page's
   read provider**, with a wallet or without — state, balances, code, block headers, the head, names,
   the preflight, the history's first read. The wallet's provider is for **four** things: the accounts,
   the chain it is on, sending a transaction, and the `load older` press (with the "mine" scan, which
   is the same kind of deep read). The architect added a fifth kind at review — `wallet_*` calls, which
   are wallet *actions* rather than reads — and one named exception, the receipt ask at the deadline.

   Three sites had to be found by a real wallet before this rule existed: the `#/docs` demo picking its
   reader on `window.ethereum` merely existing, every state read through `call()`, and `readClock()`
   stopping the boot on an endpoint that will not serve block headers. A behavioural test catches the
   one it is written for; this one catches the next one, because it reads **every** `P.request` in the
   shipped page and fails on any method outside the list.

   It is deliberately a source test. The alternative — a provider that throws on anything unexpected —
   only covers paths a test actually walks, and the three sites above were each on a path no test
   walked.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

/** The page with every comment blanked and offsets preserved, so a line number still reads true and
 *  prose about `P.request` is not mistaken for a call to it. */
function blankComments(text) {
  const out = text.split('');
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], d = text[i + 1];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '\\') { i++; continue; }
    if (c === '/' && d === '/') { while (i < text.length && text[i] !== '\n') out[i++] = ' '; continue; }
    if (c === '/' && d === '*') {
      const end = text.indexOf('*/', i + 2);
      const to = end < 0 ? text.length : end + 2;
      for (; i < to; i++) if (out[i] !== '\n') out[i] = ' ';
      i--;
      continue;
    }
  }
  return out.join('');
}
const CODE = blankComments(SHIPPED);
assert.equal(CODE.length, SHIPPED.length, 'blanking comments must not move any offset');

/* The accounts, the chain, the send. `wallet_*` is the fifth kind: asking a wallet to do something is
   not reading the chain, and there is no page provider that could answer it. */
const ALLOWED = new Set(['eth_accounts', 'eth_requestAccounts', 'eth_chainId', 'eth_sendTransaction']);
const ALLOWED_PREFIX = 'wallet_';
/* The one named exception, and it is named here rather than pattern-matched: at the 120-second
   deadline `waitReceipt` asks the wallet once for the receipt, because the receipt is the only read
   whose subject the wallet created, and printing "timed out" for a transaction that landed is the
   worst wording the page has. The marker is on that line in the page. */
const EXCEPTION = 'allow: the deadline ask (#403)';

/** Every `P.request({ method: … })` in the shipped page, with its line and its method. */
function walletCalls() {
  const out = [];
  const re = /(^|[^\w.$])P\.request\(\s*\{\s*method:\s*'([^']+)'/g;
  for (let m; (m = re.exec(CODE));) {
    const at = m.index + m[0].length - m[2].length - 10;
    const line = CODE.slice(0, m.index).split('\n').length;
    out.push({ line, method: m[2], text: SHIPPED.split('\n')[line - 1] });
  }
  return out;
}

test('the wallet is asked only for the accounts, its chain, a send, and wallet actions', () => {
  const calls = walletCalls();
  assert.ok(calls.length >= 8, `only ${calls.length} wallet calls found — this test is reading the wrong shape`);

  const bad = calls.filter(c => !ALLOWED.has(c.method) && !c.method.startsWith(ALLOWED_PREFIX)
    && !(c.text || '').includes(EXCEPTION));

  assert.deepEqual(bad.map(c => `app/src/index.html:${c.line} ${c.method}`), [],
    'these read the document\'s chain through whichever endpoint a wallet picked; they belong to the '
    + 'page\'s own provider (#403). If one of them is a new allowed kind, it is a ruling, not an edit.');
});

test('the deadline exception is exactly one line, and it is the receipt', () => {
  /* A marker comment is only as good as its scarcity: an exception that can be pasted is not an
     exception. So the count is asserted, and so is what it is for. */
  const marked = walletCalls().filter(c => (c.text || '').includes(EXCEPTION));
  assert.equal(marked.length, 1, `the exception marker appears ${marked.length} times; it is for one line`);
  assert.equal(marked[0].method, 'eth_getTransactionReceipt');
  /* And it must sit inside `waitReceipt`, after the loop rather than in it: the whole point is that
     our own endpoint is polled for the full deadline first. Read out of `SHIPPED` and not `CODE`,
     because the marker is a comment and `CODE` has had its comments blanked. */
  const at = SHIPPED.indexOf('async function waitReceipt(');
  const fn = SHIPPED.slice(at, SHIPPED.indexOf('\n}\n', at));
  assert.ok(fn.includes(EXCEPTION), 'the exception belongs to waitReceipt and nothing else');
  const loopEnd = fn.indexOf('while (Date.now() < end)');
  assert.ok(loopEnd >= 0 && fn.indexOf(EXCEPTION) > loopEnd,
    'the wallet is asked after the deadline, not during the poll');
  assert.match(fn, /pageRead\(\)\.request\(\{ method: 'eth_getTransactionReceipt'/,
    'and the poll itself is ours for the whole deadline');
});

test('every state and header read names the page\'s provider', () => {
  /* The positive half. The list is the reads the rule enumerates, each of which was a `P.request`
     before #403, so a revert would show up here as well as in the allow-list above. */
  for (const [what, needle] of [
    ['eth_call, all eighteen call sites', "const call = async (to, sig, args, types) => Eth.dec(types, await pageRead().request({ method: 'eth_call'"],
    ['the chain clock', "const b = await pageRead().request({ method: 'eth_getBlockByNumber', params: ['latest', false] })"],
    ['the chain head', "HEAD = pageRead().request({ method: 'eth_blockNumber' })"],
    ['the day floor', "await pageRead().request({ method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), false] })"],
    ['a distribution\'s code', "const code = await pageRead().request({ method: 'eth_getCode', params: [addr, 'latest'] })"],
    ['the one-call snapshot', "await pageRead().request({ method: 'eth_call', params: [{ to: addr, data: Eth.enc('snapshot()', []) }, 'latest'] })"],
    ['a token\'s decimals', "await pageRead().request({ method: 'eth_call', params: [{ to: tk, data: Eth.enc('decimals()', []) }, 'latest'] })"],
    ['a token\'s symbol', "await pageRead().request({ method: 'eth_call', params: [{ to: tk, data: Eth.enc('symbol()', []) }, 'latest'] })"],
    ['the receipt poll', "await pageRead().request({ method: 'eth_getTransactionReceipt', params: [hash] })"],
  ]) {
    assert.ok(SHIPPED.includes(needle), `${what} must read through the page's own provider (#403)`);
  }
});

test('the docs demo reads the page\'s endpoint, whatever a wallet is doing', () => {
  /* The Product Owner's finding: this chose its reader on `window.ethereum` *existing*, so a wallet
     merely installed and on another network turned the documentation's live example into a failure
     state. The dev override still wins, which is what `WRPC` is. */
  const at = CODE.indexOf('function widgetDemo()');
  assert.ok(at > 0, 'app/src/index.html no longer declares `widgetDemo` — this test reads it');
  const fn = CODE.slice(at, CODE.indexOf('\n}\n', at));
  assert.match(fn, /const rpc = WRPC \|\| PUBLIC_RPC\[CFG\.chainId\] \|\| ''/,
    'the demo picks the page\'s endpoint, with the dev override ahead of it');
  assert.doesNotMatch(fn, /window\.ethereum/,
    'a wallet being installed may not decide what the documentation shows');
  /* The one place the demo may still reach for a wallet is a chain with no endpoint of ours, and even
     there it is gated on a wallet being **connected and on this chain** — never on one existing. */
  assert.match(fn, /if \(!rpc && \(!ACC \|\| wrongChain\(\)\)\)/,
    'with no page endpoint the demo asks for a connected wallet on this chain rather than mounting through any wallet');
});

test('the landing\'s featured widget reads the page\'s endpoint too', () => {
  /* The same defect as the docs demo, one screen earlier and not in the ruling's list of three: this
     handed the widget nothing whenever a wallet was present, so the featured widget read through
     whichever endpoint the wallet had picked. Found by `tools/uat/own-reads.mjs`'s hostile case as an
     `eth_call` reaching a wallet that refuses everything, not by reading the page. */
  const at = CODE.indexOf('if (!S.featured) return;');
  assert.ok(at > 0, 'app/src/index.html no longer paints a featured widget — this test reads that path');
  const fn = CODE.slice(at, CODE.indexOf('RakeWidget.mount', at));
  assert.match(fn, /const rpc = WRPC \|\| PUBLIC_RPC\[CFG\.chainId\] \|\| ''/,
    'the featured widget takes the page\'s endpoint, with the dev override ahead of it');
  assert.doesNotMatch(fn, /WALLET \? ''/, 'a wallet being present may not decide what the landing reads through');
  assert.match(fn, /ACC && !wrongChain\(\)/,
    'and where there is no endpoint of ours, only a connected wallet on this chain may stand in');
});

test('the boot has no chain gate: a wallet elsewhere does not stop the page reading', () => {
  /* **The second gate.** Removing `route()`'s was not enough: `load()` returned early on a wrong
     chain, so the boot made two requests and the page painted nothing — measured, not reasoned. Its
     premise ("the same address on another network is another contract") was true only while these
     reads went through the wallet. */
  const at = CODE.indexOf('async function load() {');
  assert.ok(at > 0, 'app/src/index.html no longer declares `load` — this test reads it');
  const fn = CODE.slice(at, CODE.indexOf('\n}\n', at));
  assert.doesNotMatch(fn, /wrongChain\(\)/,
    'the boot reads the document\'s chain through the document\'s provider, whatever the wallet is on');
  assert.match(fn, /CHAIN = asChain\(await P\.request\(\{ method: 'eth_chainId' \}\)\)/,
    'it still records which chain the wallet is on — that is what the write refusal and the bar need');
});

test('a wallet that cannot say which chain it is on does not stop the boot', async () => {
  /* The last place a wallet could still take the page down (the architect's review of #403). `load()`
     awaited this one call unguarded, so a wallet that answers `eth_chainId` with an error rejected the
     boot, the route set `S.error`, and the page painted `could not read the factory at …` and nothing
     else — blaming the factory for the wallet, on a page that reads nothing through it. `pickWallet`
     has guarded the same call all along.

     The line is lifted and run rather than matched, so what is asserted is that the rejection is
     swallowed and `CHAIN` is left `null` — which every reader of it treats as "not read yet" and not as
     a mismatch, so the bar stays hidden and `tx()` re-reads the chain before any write. */
  /* **Scoped to `load()`.** `pickWallet` guards the same call with a line that differs only in its
     catch body, and the first version of this test matched *that* one — it read `catch (e) {}`, found
     `CHAIN` untouched, and failed against page code that was correct. A lift has to be anchored to the
     function it is about, not to the shape of the statement. */
  const LINE = (() => {
    const fn = SHIPPED.indexOf('async function load() {');
    assert.ok(fn > 0, 'app/src/index.html no longer declares `load` — this test reads it');
    const at = SHIPPED.indexOf("try { CHAIN = asChain(await P.request({ method: 'eth_chainId' })); }", fn);
    assert.ok(at > fn && at < SHIPPED.indexOf('\n}\n', fn),
      'load() must guard the wallet\'s eth_chainId, as pickWallet does');
    return SHIPPED.slice(at, SHIPPED.indexOf('\n', at));
  })();
  const run = async provider => new Function('P', 'asChain', `
    let CHAIN = 'untouched';
    return (async () => { ${LINE} return CHAIN; })();
  `)(provider, id => (id == null ? null : Number(id)));

  const threw = await run({ request: async () => { throw { code: -32603, message: 'internal error' }; } });
  assert.equal(threw, null, 'a wallet that cannot answer leaves CHAIN null, and the boot carries on');

  const answered = await run({ request: async () => '0x14a34' });
  assert.equal(answered, 84532, 'and a wallet that can answer is still recorded — the write path needs it');
});

test('the press and the mine scan are the wallet\'s, and say so where they are written', () => {
  /* The two deep reads the rule keeps on the wallet. Asserted so that a later sweep of `P` out of the
     page does not take them with it: they are the exception that #400 and #391 are built on. */
  assert.ok(SHIPPED.includes('histLogs(d.addr, from, to, WALLET ? P : pageRead())'),
    'the load-older press reads through the wallet, where it may reach further back');
  assert.ok(SHIPPED.includes("CFG.factoryBlock, null, P)"),
    'the Created scan behind the mine tab stays on the wallet, where the depth is');
});
