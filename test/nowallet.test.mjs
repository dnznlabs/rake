/* The read path for a visitor with no wallet (#273).

   Like `ext.test.mjs` and `widget.test.mjs`, this reads the page rather than building anything. What
   it guards is really a *build* property: `rpcProvider` has to survive `make dapp-nodev`, because
   with no wallet it is the only transport the shipped bundle has. That declaration sat inside a
   DEV-fenced block until this task moved it out, and nothing in the page's own text says which side
   of a fence a line falls on — only `app/build.mjs`'s strip does.

   So the strip is lifted out of `app/build.mjs` and applied here, and every assertion below runs
   against the stripped text. The first test pins the lifted expression to the build's own, so a
   changed strip fails loudly rather than letting this file quietly diverge from what ships. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const BUILD = readFileSync(join(root, 'app/build.mjs'), 'utf8');

/* The expression `app/build.mjs` strips the DEV-fenced blocks with, as a raw string so the pattern
   reads exactly as it does there. */
const STRIP = String.raw`html.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '')`;

/* The same regex, for use here. Written out rather than built from STRIP: a test that `eval`s the
   build's text would pass on a strip that no longer does anything. */
const FENCES = /\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g;

const SHIPPED = PAGE.replace(FENCES, '');
const count = (hay, needle) => hay.split(needle).length - 1;

test('the strip applied here is the one app/build.mjs applies', () => {
  assert.ok(
    BUILD.includes(STRIP),
    `app/build.mjs no longer strips with \`${STRIP}\` — this test lifts it, and the assertions below are only about the shipped bundle while it matches`,
  );
});

test('the shipped bundle has no phone switch', () => {
  /* `?phone=1` / `?phone=0` exist for the preview sitting of m05-t01c step 7a, where a desktop has to
     be shown the phone path and a phone the desktop one. A document on chain is permanent, and a
     query parameter that changes which wallet links a page offers is not something to make permanent,
     so it lives inside the fence. */
  assert.equal(count(SHIPPED, "phone="), 0, 'the phone switch survived the strip and would ship on chain');
  assert.equal(count(SHIPPED, "Q.get('phone')"), 0);
  assert.equal(count(PAGE, "Q.get('phone')"), 2, 'the switch is gone from the source, so the preview cannot show both looks');
});

test('the shipped bundle keeps rpcProvider and drops capped', () => {
  assert.equal(
    count(SHIPPED, 'const rpcProvider ='),
    1,
    'rpcProvider must survive the strip: with no wallet it is the page\'s only read path (#273)',
  );
  assert.equal(count(SHIPPED, 'const capped'), 0, 'capped answers dev-only refusals and must not ship');
});

test('readProvider ships and falls back to the public endpoint', () => {
  assert.equal(count(SHIPPED, 'const readProvider ='), 1);
  const at = SHIPPED.indexOf('const readProvider =');
  const decl = SHIPPED.slice(at, SHIPPED.indexOf(';\n', at));
  assert.ok(
    decl.includes('rpcProvider('),
    `readProvider no longer reaches rpcProvider, so a visitor with no wallet has no transport: ${decl}`,
  );
});

/* `rpcProvider` as shipped, run against a stubbed `fetch`: the declaration is lifted out of the page
   so what is exercised is the page's own text. */
const provider = response => {
  const at = SHIPPED.indexOf('const rpcProvider =');
  const decl = SHIPPED.slice(at, SHIPPED.indexOf('\n});', at) + 4);
  return new Function('fetch', `${decl}; return rpcProvider('http://x');`)(async () => response);
};
const ask = p => p.request({ method: 'eth_blockNumber', params: [] });

test('rpcProvider turns a non-JSON HTTP failure into a sentence carrying the status', async () => {
  const p = provider({ ok: false, status: 429, json: async () => { throw new SyntaxError('Unexpected token <'); } });

  const err = await ask(p).then(() => null, e => e);

  assert.deepEqual(err, { message: 'the RPC endpoint answered HTTP 429', data: { httpStatus: 429 } });
});

test('rpcProvider throws the JSON-RPC error even under an HTTP error status', async () => {
  const refusal = { code: -32614, message: 'eth_getLogs is limited to a 200 range' };
  const p = provider({ ok: false, status: 400, json: async () => ({ error: refusal }) });

  const err = await ask(p).then(() => null, e => e);

  assert.equal(err, refusal);
});

test('rpcProvider refuses a body with no result and keeps a null one', async () => {
  const empty = provider({ ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1 }) });
  const nul = provider({ ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1, result: null }) });

  const err = await ask(empty).then(() => null, e => e);
  const res = await ask(nul);

  assert.equal(err.message, 'the RPC endpoint sent no result');
  assert.equal(res, null);
});

test('the network menu offers a switch and names an endpoint only where there is one', () => {
  const from = SHIPPED.indexOf('function who()');
  const body = SHIPPED.slice(from, SHIPPED.indexOf('\n}\n', from));

  // The wallet section is one chain of ternaries, no wallet first: everything after that branch,
  // the switch and every line naming `CHAIN` as the wallet's, is reached only with a wallet.
  // Every position is required to be found before it is compared: a missing guard is -1, and
  // anything is greater than that.
  const none = body.indexOf('(!WALLET ? \'<div class="k">none found');
  const right = body.indexOf('!wrong ?', none), sw = body.indexOf('data-a="switch"'), named = body.indexOf('on ${cname(CHAIN)}');
  assert.ok(none > 0, 'the wallet section opens on the no-wallet branch');
  assert.ok(right > none, 'a wallet on this chain has its own branch');
  assert.ok(sw > right, 'no wallet, so nothing to switch; a wallet on this chain, neither');
  assert.equal(body.indexOf('data-a="switch"', sw + 1), -1, 'and the switch is offered nowhere else');
  assert.ok(named > none, 'the endpoint\'s chain is not a wallet\'s');
  assert.ok(!body.includes('new URL(PUBLIC_RPC['), 'an unlisted chain has no endpoint, and new URL(undefined) throws');
});

test('the menu names the dev override ahead of the public endpoint', () => {
  const from = SHIPPED.indexOf('function who()');
  const body = SHIPPED.slice(from, SHIPPED.indexOf('\n}\n', from));

  assert.ok(body.includes('WRPC || pub'), 'the dev `?rpc=` endpoint is what reads happen through when it is set');
  assert.ok(body.includes('new URL(read).host'), 'the row names whichever endpoint is actually read');
});

test('discover routes whatever it found through readProvider', () => {
  const from = SHIPPED.indexOf('async function discover');
  const to = SHIPPED.indexOf('async function connect');
  assert.ok(from >= 0 && to > from, 'discover and connect are no longer both in the shipped page');
  assert.ok(
    SHIPPED.slice(from, to).includes('readProvider(P)'),
    'discover no longer passes its provider through readProvider, so no-wallet reads fall back to nothing',
  );
});
