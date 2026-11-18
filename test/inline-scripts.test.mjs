import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertInlineScripts, scriptTags } from '../app/inline-scripts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLEAN = '<head><script>var a=1;</script></head><body><script>\nvar b=2;\n</script></body>';

test('a bundle whose scripts are all inline and attribute-free passes', () => {
  const html = CLEAN;

  const run = () => assertInlineScripts(html);

  assert.doesNotThrow(run);
});

test('app/src/index.html passes, and has scripts to check', () => {
  const html = readFileSync(join(root, 'app/src/index.html'), 'utf8');

  const run = () => assertInlineScripts(html);

  assert.doesNotThrow(run);
  assert.ok(scriptTags(html).length > 0);
});

for (const [name, tag] of [
  ['src', '<script src="app.js"></script>'],
  ['type=module', '<script type="module">var a=1;</script>'],
  ['defer', '<script defer>var a=1;</script>'],
  ['async', '<script async>var a=1;</script>'],
  /* R11 (`audits/2026-11-17/frontend/AUDIT.md:305-320`): the scan matched the opening tag
     case-sensitively, so these two — a real external script and a real deferred one — passed the
     build and shipped a bundle that renders and never runs. One row per case the legs named. */
  ['SRC, upper-cased tag', '<SCRIPT src="app.js"></SCRIPT>'],
  ['defer, mixed case', '<Script defer>var a=1;</Script>'],
]) {
  test(`a bundle with a ${name} script fails the build`, () => {
    const html = CLEAN + tag;

    const run = () => assertInlineScripts(html, 'fixture');

    assert.throws(run, (e) => e.message.startsWith('fixture: 1 of 3 <script> tags carry attributes'));
  });
}

test('an attribute value holding > does not truncate the scan', () => {
  const html = '<script onload="if(a>b)c()"></script>';

  const run = () => assertInlineScripts(html);

  assert.throws(run, /onload="if\(a>b\)c\(\)"/);
});

test('a tag whose name merely starts with script is not one', () => {
  const html = '<scriptable data-x="1"></scriptable>';

  const tags = scriptTags(html);

  assert.deepEqual(tags, []);
});
