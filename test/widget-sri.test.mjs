/* The `#/docs` snippet points at the gateway and pins the bytes it will run (step 7, from m05-t04b).

   A pasted `script` tag goes on somebody else's page. Pointing it at a relative `widget.js` resolved
   against *that* page, or at a `w3link.io` gateway the host did not choose, were both wrong for the
   same reason: the host cannot tell what their visitors will execute. So the snippet names one host,
   `rake.dnzn.dev`, and carries an `integrity` attribute computed at build from the built widget — a
   browser then runs the file only if its bytes hash to the value this document was built from.

   What is asserted: the hash in the built page **is** the sha384 of the built widget, computed here
   rather than copied from anywhere; `crossorigin` is present, without which a browser refuses a
   cross-origin script carrying `integrity` instead of checking it; and the snippet's host is the
   gateway. The last one is also asserted by `tools/uat/` row (l) against the live page. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, cpSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(root, 'app/src/index.html'), 'utf8');

/* **These tests build what they assert on, into a directory of their own.**

   They used to skip when `app/dist` was missing, and that skip was a race rather than a property of
   the tree: `test/build.test.mjs` runs a real build as a side effect, node runs test files as
   concurrent processes, and this file decided at **module load** whether the artefacts existed. So
   whether the integrity hash was ever checked depended on which process got there first — CI won
   that race, this machine lost it three runs of three, and a flip either way was invisible because a
   skip is not a failure (measured 2026-11-23). For a check whose whole subject is the integrity
   hash, a skip is a silent pass.

   **And it must not build into `app/dist`.** The obvious fix did, and it turned the silent race into a
   red one: `build.test.mjs:370` asserts that a *refused* build leaves `app/dist` untouched, so a
   second writer appearing concurrently made that test fail. `app/dist` is shared mutable state
   between test files. So `app/` is copied to a temp directory and the copy's own `build.mjs` is run
   there — `build.mjs` writes `dist/` beside itself (`:24`, `:184`), so the copy writes the copy's
   dist and nothing here contends with anything.

   `FEATURED_SALT` is the one value the recipe passes that the build needs, read from `mk/15-seed.mk`
   rather than retyped, so there is still one source of truth. The chain does not matter to anything
   asserted here — the widget is identical on every chain, and the page's `widgetSri` is the hash of
   the widget built beside it — so Sepolia is used and named. */
const salt = (() => {
  const mk = readFileSync(join(root, 'mk/15-seed.mk'), 'utf8');
  const m = /FEATURED_SALT_DNZN\s*=\s*(0x[0-9a-fA-F]+)/.exec(mk);
  assert.ok(m, 'mk/15-seed.mk no longer declares FEATURED_SALT_DNZN — this test reads it from there');
  return m[1];
})();

const out = mkdtempSync(join(tmpdir(), 'widget-sri-'));
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
rmSync(join(out, 'app/dist'), { recursive: true, force: true });
/* `build.mjs` reads one thing outside `app/`: the broadcast logs it takes the deployed addresses and
   `__VERSION__` from (`:25`, `:40`). Symlinked rather than copied — it only reads them, and 23 files
   of JSON per test run is waste. Without it the build refuses with "nothing to substitute for
   __VERSION__", which is the build doing its job and was the first thing this fix hit. */
symlinkSync(join(root, 'broadcast'), join(out, 'broadcast'));
{
  const r = spawnSync(process.execPath,
    [join(out, 'app/build.mjs'), '--chain', '11155111', '--set', `FEATURED_SALT=${salt}`],
    { cwd: out, encoding: 'utf8' });
  assert.equal(r.status, 0,
    `these tests build what they assert on, and the build failed: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' | ')}`);
}
const dist = f => join(out, 'app/dist', f);
for (const f of ['index.html', 'widget.js']) {
  assert.ok(existsSync(dist(f)), `the build reported success but did not write ${f}`);
}

test('the page carries the sha384 of the widget the same build produced', () => {
  const page = readFileSync(dist('index.html'), 'utf8');
  const widget = readFileSync(dist('widget.js'));

  const want = 'sha384-' + createHash('sha384').update(widget).digest('base64');
  const got = /widgetSri: '([^']*)'/.exec(page);

  assert.ok(got, 'the built page carries no widgetSri — the build did not substitute it');
  assert.equal(got[1], want,
    'the integrity in the page is not the hash of the widget beside it: one of the two was built separately');
  assert.match(got[1], /^sha384-[A-Za-z0-9+/]+=*$/, 'and it must be a sha384 in base64, as SRI requires');
});

test('the widget hash is computed, never typed', () => {
  // A literal sha384 in either source would be a hash of whatever was true once.
  for (const [what, text] of [['app/src/index.html', SRC], ['app/build.mjs', readFileSync(join(root, 'app/build.mjs'), 'utf8')]]) {
    const literals = text.match(/sha384-[A-Za-z0-9+/]{20,}/g) || [];
    assert.deepEqual(literals, [], `${what} carries a hard-coded SRI hash: ${literals[0]}`);
  }
  assert.match(SRC, /integrity="\$\{esc\(CFG\.widgetSri\)\}"/, 'the attribute must come from CFG');
  assert.match(readFileSync(join(root, 'app/build.mjs'), 'utf8'), /createHash\('sha384'\)/,
    'and CFG.widgetSri must come from the build hashing the widget it just wrote');
});

test('the snippet names the gateway, and carries crossorigin with the integrity', () => {
  assert.match(SRC, /https:\/\/rake\.dnzn\.dev\/\$\{id\}\/widget\.js/,
    'the snippet must name one host for every chain, not resolve against the page it was pasted into');
  assert.match(SRC, /crossorigin="anonymous"/,
    'a cross-origin script with integrity and no crossorigin is refused by the browser, not checked');
  // Order matters only to a reader, but both attributes must be inside the same tag as the src.
  const tag = /const tag = rpc => `([^`]*)`/.exec(SRC);
  assert.ok(tag, 'the snippet tag is no longer one template literal — this test reads it');
  for (const needle of ['src=', 'integrity=', 'crossorigin=']) {
    assert.ok(tag[1].includes(needle), `the snippet tag is missing ${needle}`);
  }
});

test('the widget the build hashed is the one the document serves', () => {
  /* The hash would be worthless if the page served one widget and the snippet pinned another. The
     build writes both from the same minified text; this pins that they stay the same bytes. */
  const widget = readFileSync(dist('widget.js'), 'utf8');
  const page = readFileSync(dist('index.html'), 'utf8');
  // The widget is inlined into the page for its own preview; its first line should appear in both.
  const firstReal = widget.split('\n').find(l => l.trim().length > 20);
  assert.ok(firstReal, 'the built widget is empty');
  assert.ok(page.includes(firstReal),
    'the built page does not contain the widget it hashed — the inline and the file have diverged');
});
