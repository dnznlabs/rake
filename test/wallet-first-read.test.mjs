/* Which provider reads the history, and why a wallet may not make the page worse (#400).

   The Product Owner connected a wallet on Base Sepolia and all three sections read `history
   unavailable`; the same page with no wallet read its day cleanly. The wallet's default endpoint
   there serves 200 blocks a query at 25 a second, so the walk met a cap and a rate limit at once,
   while the page's own endpoint would have answered the day in a handful of windows. Connecting a
   wallet had taken the history away.

   So the provider is an argument now, and the rule has two halves, each asserted here:

     the first read   goes through the page's own read provider, wallet or not
     `load older`     goes through the wallet's, where it may reach further back than ours

   The two call sites are **lifted**, not retyped: `expr()` requires the exact text to be in the
   shipped page, so a change that routes the first read back through `P` fails the lift rather than
   passing a test about something that is no longer there.

   The second test is the Product Owner's report, reproduced: a wallet endpoint that refuses every
   log query, and a page that must still show its day. It also runs the **pre-#400 routing** against
   the same stubs and requires it to fail — an assertion about a refusal that cannot distinguish the
   fix from its absence is worth nothing, and this is that check made explicit.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Model from '../app/src/model.js';

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
/** A call expression, required verbatim in the shipped page. The requirement *is* the assertion. */
const expr = (text, from = SHIPPED) => {
  assert.ok(from.includes(text),
    `app/src/index.html no longer contains \`${text}\` — #400 routes that read through a different provider now`);
  return text;
};

const PUBLIC_RPC = line('const PUBLIC_RPC = {');
const PUBLIC_WINDOW = line('const PUBLIC_WINDOW = {');
const FROM_QUERY = line('let WINDOW_FROM_QUERY =');
const RPC_PROVIDER = block('const rpcProvider = (url, logWindow) => ({', '\n});\n');
const READ_PROVIDER = line('const readProvider = injected =>');
const PAGEP = line('let PAGEP = null;');
const PAGE_READ = line('const pageRead = () =>');
const WIN_START = line('let WINDOW_START =');
const WIN_INFLIGHT = line('const WINDOW_INFLIGHT =');
const MAX_WINDOWS = line('let MAX_WINDOWS =');
const RANGEY = line('const RANGEY =');
const ERRTEXT = block('const errText = e =>', ".join(' · ');\n");
const STATED_FLOOR = block('const statedFloor = text =>', '\n};\n');
const WINDOW1 = block('function window1(address, topics, a, b, prov) {');
const LOGS = block('async function logs(address, topics, fromBlock, toBlock, prov) {');
const HIST_LOGS = block('async function histLogs(addr, from, to, prov) {');
const CHANGE_EVENTS = block('const CHANGE_EVENTS = [', '];\n');
const FUND_EVENTS = block('const FUND_EVENTS = [', '];\n');
const TRANSFER = line('const TRANSFER = topic(');

/* The page's two history reads, as the page spells them. */
const FIRST_READ = expr('history(addr, from, hi, pageRead())');
const PRESS_READ = expr('histLogs(d.addr, from, to, WALLET ? P : pageRead())');
/* The whole first-read expression, including what it records about itself. */
const FIRST_READ_FULL = expr('history(addr, from, hi, pageRead()).then(h => ({ ...h, from, whole: from <= ownFloor(d) }))');
/* The `Created` scan behind the “mine” tab, which is the one log read that stays on the wallet. */
const MINE_READ = expr("logs(CFG.factory, [topic('Created(address,address)'), null, word(ACC)], CFG.factoryBlock, null, P)");
/* The two block-header reads the day floor is built from. Both belong to the document's chain. */
const HEAD_READ = expr("pageRead().request({ method: 'eth_blockNumber' })");
const TS_READ = expr("pageRead().request({ method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), false] })");

const ADDR = '0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE';
/* The per-chain start windows, read out of the page. A walk that took its width from `P` instead of
   from the provider it was handed would read every chain 10,000 at a time and still finish against a
   stub that answers everything — so the width asked for is asserted, not just the outcome. */
const TABLE = new Function(`${PUBLIC_WINDOW}\nreturn PUBLIC_WINDOW;`)();
const winOf = chainId => TABLE[chainId] || 10_000;

/* ── the two call sites, with the reads themselves recorded ────────────────────────────────────── */

/** Evaluates a lifted call expression with `history`/`histLogs` replaced by a recorder, and returns
 *  the provider the page handed it. Everything the expression names is supplied here, so an
 *  expression that starts reading some *other* provider cannot quietly keep passing. */
const providerFor = (text, { wallet }) => {
  const readP = { tag: 'page read provider' };
  const walletP = { tag: "the wallet's own provider" };
  let got;
  const rec = (...args) => { got = args[args.length - 1]; };
  new Function('history', 'histLogs', 'pageRead', 'WALLET', 'P', 'addr', 'd', 'from', 'to', 'hi',
    `return ${text};`)(rec, rec, () => readP, wallet, wallet ? walletP : readP, ADDR, { addr: ADDR }, 0, 500, 1_000);
  assert.ok(got, `\`${text}\` passed no provider at all`);
  return { got, readP, walletP };
};

test("a wallet page's first read goes through the page's own provider", () => {
  const { got, readP, walletP } = providerFor(FIRST_READ, { wallet: true });
  assert.notEqual(got, walletP,
    'a connected wallet must not take the history away: #400 is this one line');
  assert.equal(got, readP);
});

test('without a wallet the first read goes through the same provider as before', () => {
  const { got, readP } = providerFor(FIRST_READ, { wallet: false });
  assert.equal(got, readP, 'the no-wallet page is unchanged by #400');
});

test("the press is the only read that goes through the wallet's provider", () => {
  const { got, walletP } = providerFor(PRESS_READ, { wallet: true });
  assert.equal(got, walletP,
    "load older is where a wallet can do better than us, so it is the wallet's endpoint that answers");
});

test('with no wallet to press through, the press reads the page\'s provider', () => {
  const { got, readP } = providerFor(PRESS_READ, { wallet: false });
  assert.equal(got, readP);
});

/* ── the report itself: a wallet endpoint that refuses every log query ─────────────────────────── */

test('the “mine” tab keeps reading through the wallet, where the depth is (review of #400)', () => {
  /* **Not the page's provider**, which is where I had wrongly put it. The scan starts at the factory
     block and no 24-hour floor bounds it, while our own mainnet endpoint serves about 10,000 blocks —
     so through the page this list would hold only what an account created in the last day and a half
     and still call itself “mine”. #400 is about the first screen never being worse with a wallet; a
     tab that exists because an account is connected is not the first screen. */
  const readP = { tag: 'page read provider' };
  const walletP = { tag: "the wallet's own provider" };
  let got;
  new Function('logs', 'pageRead', 'P', 'CFG', 'topic', 'word', 'ACC',
    `return ${MINE_READ};`)((...a) => { got = a[a.length - 1]; }, () => readP, walletP,
    { factory: '0xf', factoryBlock: 0 }, () => '0x0', () => '0x0', ADDR);

  assert.equal(got, walletP, 'the Created scan is the wallet’s read, and its reach is the point of it');
  assert.notEqual(got, readP);
});

test('the day floor is read through the page, both of its block reads (review of #400)', () => {
  /* Asserted as the lifts above: five `eth_getBlockByNumber` a page load went to the wallet before
     this, and `head()`’s `eth_blockNumber` is the first read of the walk — one without the other
     leaves the day search depending on the wallet for a block number. `test/day-read.test.mjs` has
     the behavioural half: a wallet refusing headers still gets its day, exactly. */
  assert.ok(HEAD_READ && TS_READ, 'both header reads name the page’s provider');
  /* And neither of them goes through `P` any more. The whole declaration is checked, not the file: a
     `P.request` somewhere else in the page is nothing to do with the floor. */
  const headDecl = SHIPPED.slice(SHIPPED.indexOf('const head = () =>'), SHIPPED.indexOf('\n', SHIPPED.indexOf('const head = () =>')));
  const tsDecl = SHIPPED.slice(SHIPPED.indexOf('const tsOf = async n => {'), SHIPPED.indexOf('\n};', SHIPPED.indexOf('const tsOf = async n => {')));
  for (const [what, text] of [['head()', headDecl], ['tsOf', tsDecl]]) {
    assert.doesNotMatch(text, /\bP\.request\b/, `${what} must not read through the wallet's provider`);
  }
});

test('the first read records which floor it asked for, not that it read everything', async () => {
  /* A finished span is not a finished history since #400 — a day read finishes its span every time.
     So the read records the floor it asked for against the oldest block this distribution can hold
     anything in, and the heads, the empty sentences and the press all hang off that. With `whole`
     hard-coded true the page claims all time on a day's read, which no later state can correct. */
  const read = (from, own) => new Function('history', 'pageRead', 'ownFloor', 'addr', 'd', 'from', 'hi',
    `return ${FIRST_READ_FULL};`)(async () => ({ logs: [] }), () => ({}), () => own, ADDR, { addr: ADDR }, from, 1_000_000);

  assert.equal((await read(9_000, 1_000)).whole, false,
    "a floor above the distribution's first block leaves history below it");
  assert.equal((await read(1_000, 1_000)).whole, true, 'a read from the first block has nothing below it');
  assert.equal((await read(900, 1_000)).whole, true, 'nor has one that started below it');
  assert.equal((await read(9_000, 1_000)).from, 9_000,
    'and the floor travels with the result, because the press continues from it');
});

const EVENT = { blockNumber: '0x1', logIndex: '0x0', topics: ['0xaa'], data: '0x' };

/** One history read on a given chain, with the page's own endpoint answering through a stubbed
 *  `fetch` and the wallet's refusing every `eth_getLogs` the way `sepolia.base.org` does.
 *
 *  `route` chooses which provider the read goes through: `page` is #400's rule, `wallet` is what the
 *  page did before it. Nothing else differs between the two runs.
 */
function read({ chainId, route }) {
  const src = `
    const CFG = { chainId: CHAIN_ID };
    ${PUBLIC_RPC}
    ${PUBLIC_WINDOW}
    ${FROM_QUERY}
    let pageAsks = 0, walletAsks = 0;
    /* The page's own endpoint, answering every window it is asked for. Reached through the real
       rpcProvider, so the per-chain start window and the HTTP handling are the shipped ones. */
    const fetch = async (url, init) => {
      pageAsks++;
      const p = JSON.parse(init.body).params[0];
      SPANS.push(parseInt(p.toBlock, 16) - parseInt(p.fromBlock, 16) + 1);
      return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1, result: [EVENT] }) };
    };
    ${RPC_PROVIDER}
    ${READ_PROVIDER}
    /* The wallet's default endpoint on Base Sepolia, as measured: a 200-block cap, and a rate limit
       whose body carries no JSON-RPC error at all. Here it simply refuses everything, which is the
       worst case and the one the Product Owner saw. */
    const walletProvider = {
      request: async ({ method }) => {
        walletAsks++;
        if (method !== 'eth_getLogs') return '0x0';
        throw { code: -32614, message: 'exceed maximum block range: 200' };
      },
    };
    const P = readProvider(walletProvider);
    ${PAGEP}
    ${PAGE_READ}
    ${WIN_START}
    ${WIN_INFLIGHT}
    ${MAX_WINDOWS}
    ${RANGEY}
    ${ERRTEXT}
    ${STATED_FLOOR}
    const topic = sig => '0x' + sig.length.toString(16).padStart(64, '0');
    const word = a => '0x' + a.slice(2).toLowerCase().padStart(64, '0');
    ${CHANGE_EVENTS}
    ${FUND_EVENTS}
    ${TRANSFER}
    const head = async () => HEAD;
    ${WINDOW1}
    ${LOGS}
    ${HIST_LOGS}
    const prov = ROUTE === 'page' ? pageRead() : P;
    return { run: (addr, from, to) => histLogs(addr, from, to, prov),
             pageAsks: () => pageAsks, walletAsks: () => walletAsks };
  `;
  const spans = [];
  return { ...new Function('Model', 'EVENT', 'CHAIN_ID', 'HEAD', 'ROUTE', 'SPANS', src)(
    Model, EVENT, chainId, 1_000_000, route, spans), spans };
}

/* Both testnets the document is live on, and both mainnets it is meant for. The chain is what
   decides the start window, so a rule that held on one and not another would be no rule. */
for (const chainId of [1, 8453, 11155111, 84532]) {
  test(`chain ${chainId}: a wallet endpoint refusing every log query still leaves the day readable`, async () => {
    const w = read({ chainId, route: 'page' });
    /* Three windows at this chain's own width: wide enough that the width is visible in what was
       asked for, narrow enough that the walk finishes inside its budget on every chain. */
    const win = winOf(chainId);

    const h = await w.run(ADDR, 1_000_000 - 3 * win + 1, 1_000_000);

    for (const [name, part] of [['changes', h.changes], ['funds', h.funds]]) {
      assert.ok(part.logs.length > 0, `${name} read nothing — this is the sections' "history unavailable"`);
      assert.equal(part.partial, null, `${name} did not finish the span it was given`);
      assert.equal(part.wall, null, `${name} met a wall on an endpoint that answers everything`);
    }
    assert.ok(w.pageAsks() > 0, "the page's own endpoint is the one that answered");
    assert.equal(w.walletAsks(), 0, 'the first read must not touch the wallet at all');
    assert.equal(w.spans[0], win,
      `the walk must take its width from the provider it was handed, not from \`P\`: chain ${chainId} serves ${win} a query`);
  });
}

test('the pre-#400 routing fails these same stubs, so the assertion above can fail', async () => {
  /* The mutation, run rather than imagined: the only change is which provider the read goes
     through. On Base Sepolia this is exactly what the Product Owner's page did. */
  const w = read({ chainId: 84532, route: 'wallet' });

  /* It does not come back empty: nothing was answered, so `logs` rejects, and in the page that
     rejection is what reached `paintFailed` and wrote `history unavailable` over all three sections
     — and, before #398, over the funds block and its `distribute` with them. */
  await assert.rejects(() => w.run(ADDR, 999_000, 1_000_000), /exceed maximum block range: 200/,
    'the wallet refused every window, so the read fails — this is the report');
  assert.equal(w.pageAsks(), 0, "and the page's own endpoint, which would have answered, was never asked");
  assert.ok(w.walletAsks() > 0);
});

/* ── the call sites, counted ───────────────────────────────────────────────────────────────────── */

/** The page with every comment blanked out, offsets and line breaks preserved, so a call site's line
 *  number still reads true. Written as a scan rather than a regexp because the page is full of both
 *  `//` inside strings (every RPC URL) and `\/\/` inside regexps, and either one eats the rest of a
 *  line if it is mistaken for a comment. A backslash escapes the next character everywhere outside a
 *  string, which is what keeps a regexp's escaped delimiters from reading as a comment. */
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
    if (c === '/' && d === '/') {
      while (i < text.length && text[i] !== '\n') out[i++] = ' ';
      continue;
    }
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

/** Top-level argument count of a call at `at`, counting commas outside nested brackets and strings. */
function arity(text, at) {
  const open = text.indexOf('(', at);
  let depth = 0, n = 1, quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { depth--; if (depth === 0) return n; }
    else if (c === ',' && depth === 1) n++;
  }
  assert.fail(`unterminated call at ${at}`);
}

/* `logs` takes five arguments and `histLogs` four, and the provider is the last of each. A call that
   stops short does not fail: the provider is `undefined`, `logs` falls back to `WINDOW_START` and
   reads through nothing in particular — and a call that passes the provider one slot early puts an
   object where `toBlock` belongs, where `Number()` makes it `NaN` and the walk never runs. Both are
   silent, and one of them shipped in this branch before this test. */
test('every history read in the page passes a provider in the right slot', () => {
  for (const [name, want] of [['logs', 5], ['histLogs', 4]]) {
    const re = new RegExp(`(^|[^\\w.$])${name}\\(`, 'g');
    const sites = [];
    for (let m; (m = re.exec(CODE));) {
      const at = m.index + m[0].length - name.length - 1;
      // The declaration itself is not a call site.
      if (/function\s+$/.test(CODE.slice(Math.max(0, at - 20), at))) continue;
      sites.push(at);
    }
    assert.ok(sites.length > 0, `no call to ${name} found — this test is reading the wrong name`);
    for (const at of sites) {
      const where = CODE.slice(0, at).split('\n').length;
      assert.equal(arity(CODE, at), want,
        `app/src/index.html:${where} calls ${name} with the wrong number of arguments; the provider is the last one`);
    }
  }
});
