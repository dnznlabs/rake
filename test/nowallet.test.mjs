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

test('discover routes whatever it found through readProvider', () => {
  const from = SHIPPED.indexOf('async function discover');
  const to = SHIPPED.indexOf('async function connect');
  assert.ok(from >= 0 && to > from, 'discover and connect are no longer both in the shipped page');
  assert.ok(
    SHIPPED.slice(from, to).includes('readProvider(P)'),
    'discover no longer passes its provider through readProvider, so no-wallet reads fall back to nothing',
  );
});
