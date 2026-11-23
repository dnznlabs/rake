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
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = f => join(root, 'app/dist', f);
const SRC = readFileSync(join(root, 'app/src/index.html'), 'utf8');

/* The build's own output. `make dapp-nodev` writes it; when it has not run, these three skip rather
   than pass, because a test that silently passes on a missing artefact is worse than no test. */
const built = existsSync(dist('index.html')) && existsSync(dist('widget.js'));
const skip = built ? false : 'app/dist is not built — run `make dapp-nodev CHAIN_ID=<id>` first';

test('the page carries the sha384 of the widget the same build produced', { skip }, () => {
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

test('the widget the build hashed is the one the document serves', { skip }, () => {
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
