#!/usr/bin/env node
/* Build the three artifacts app/dist holds: the single-file dapp (app/src/index.html →
   app/dist/index.html and index.html.gz), the widget (app/src/widget.js → app/dist/widget.js, raw
   and never gzipped — `App` serves it as a classic script, which a gzip bootstrap cannot be), and
   the dev host page (app/src/host.html → app/dist/host.html, substituted but not minified: a foil
   that `serve` reads beside the other two and `Chunks.s.sol` never uploads).

   node app/build.mjs [--chain 31337] [--dev] [--set NAME=value]...

   Every __NAME__ token in the source resolves from --set, then from the chain's broadcast logs (a
   deployed contract's name, uppercased, gives its checksummed address), then from the defaults below.
   --dev keeps the DEV-fenced blocks, which hold the ?rpc=&from= overrides. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from './src/eth.js';
import { assertInlineScripts } from './inline-scripts.mjs';
import { assertPairable, creations } from './broadcast.mjs';
import { check } from './values.mjs';
import { marked } from './version.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const dev = argv.includes('--dev');
const chain = flag('chain', '31337');

/* A contract's address, and the block it was created in as `<NAME>_BLOCK`: a log scan needs a
   `fromBlock`, and genesis is not one on a chain with a history. */
/* A creation block is only as good as the receipt it was joined to, and that join is by transaction
   hash — m03-t06 found `run-latest.json` filing a hash under the wrong transaction object. A
   `fromBlock` off a mispaired receipt looks fine and silently starts a log scan in the wrong place,
   so a log that cannot be paired yields its addresses (which come off the transactions, not the
   join) and no block at all. `withheld` remembers which, so a bundle that turns out to need one of
   them is refused with the reason rather than with "nothing to substitute" — see rake#140. */
function deployed() {
  const out = {}, withheld = new Map(), from = {}, dir = join(root, 'broadcast');
  if (!existsSync(dir)) return { out, withheld, from };
  for (const script of readdirSync(dir).sort()) {
    const file = join(dir, script, chain, 'run-latest.json');
    if (!existsSync(file)) continue;
    /* Repo-relative in every message this log appears in: an absolute path under whoever ran the
       build is not the string a reader greps the tree for. */
    const rel = ['broadcast', script, chain, 'run-latest.json'].join('/');
    const log = JSON.parse(readFileSync(file, 'utf8'));
    for (const c of creations(log, rel)) {
      const name = c.name.toUpperCase();
      /* This loop is directory-ordered, so a contract of the same name in a later script directory
         used to replace the earlier address with no notice and point the bundle at whichever
         `broadcast/` sorted last. Which of two is meant is not a build's choice to make. */
      if (name in out) {
        throw new Error(
          `build: ${c.name} is created by ${from[name]} and ${rel}, so which address __${name}__\n`
          + `       takes is not this build's to pick. Deploy it in one script, or pass\n`
          + `       --set ${name}=0x… for the one this bundle means.`,
        );
      }
      /* Checksummed: the log is lowercase, and the same address two ways gzips to two sizes. */
      out[name] = Eth.checksum(c.address);
      from[name] = rel;
      if (c.block != null) {
        out[`${name}_BLOCK`] = '0x' + BigInt(c.block).toString(16);
        from[`${name}_BLOCK`] = rel;
      } else withheld.set(`${name}_BLOCK`, { file, log });
      /* `__VERSION__` is `App`'s own second constructor argument plus the marker, read from the log
         that deployed it rather than hardcoded beside it: one source, and the marker comes off in a
         chunk re-upload instead of a redeploy (ROADMAP decision 45). */
      if (name === 'APP' && c.args && c.args.length > 1) {
        const version = marked(c.args[1]);
        if (version != null) { out.VERSION = version; from.VERSION = rel; }
      }
    }
  }
  return { out, withheld, from };
}

/* A log whose `App` carries a version nobody recognises is a refusal with a reason, not a stack
   trace: the same shape every other stop in this file takes. */
let onchain, withheld, from;
try {
  ({ out: onchain, withheld, from } = deployed());
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
/* No `VERSION` default: it is `onchain`'s, derived from the `App` creation above, and a chain whose
   log offers none leaves `__VERSION__` to the refusal below unless `--set VERSION=` supplies it. */
const values = { ...onchain, CHAIN_ID: chain };
/* Where each value came from, for the one message `check` throws: a value with a bad shape is a
   question about the command line, or about a log, or about this file's one default. */
const sources = { ...from, CHAIN_ID: 'the default' };
/* The token grammar `substitute` matches below: a `--set` key outside it can never be substituted,
   so the flag would silently do nothing and the document would keep its literal `__NAME__`. */
const SET_KEY = /^[A-Z][A-Z0-9_]*$/;
argv.forEach((a, i) => {
  if (a !== '--set') return;
  const arg = argv[i + 1] || '';
  const [k, ...v] = arg.split('=');
  const value = v.join('=');
  if (!SET_KEY.test(k) || value === '') {
    console.error(`build: --set ${arg} is not NAME=value with NAME matching ${SET_KEY} and a non-empty value`);
    process.exit(1);
  }
  /* Overriding a log's value is this flag's documented purpose (`:10`, `:72`); what R4 named is that
     it was silent, so a bundle could be re-pointed at another factory leaving no trace of it. */
  if (k in onchain) console.error(`build: --set ${k} overrides the log's ${onchain[k]} with ${value}`);
  values[k] = value;
  sources[k] = '--set';
});

/* One table for every source, checked once before anything is substituted: the log's addresses,
   `marked()`'s output and the chain default alike. Checking at each source instead is what let
   `--set VERSION=<img…>` past the validation `version.mjs` applies to the same token. */
try {
  check(values, sources);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

/* Refuse rather than emit: a bundle holding a literal __NAME__ looks fine and fails at its first read. */
function substitute(text, label) {
  const missing = new Set();
  const out = text.replace(/__([A-Z][A-Z0-9_]*)__/g, (m, k) => { if (k in values) return values[k]; missing.add(k); return m; });
  if (!missing.size) return out;
  /* A block this build deliberately withheld is a different failure with a different fix, so it gets
     its own message: the log is there, it just cannot say which receipt belongs to which contract. */
  for (const k of missing) if (withheld.has(k)) assertPairable(withheld.get(k).file, withheld.get(k).log);
  console.error(`build: nothing to substitute for ${[...missing].map(k => `__${k}__`).join(', ')} in ${label} on chain ${chain}`);
  console.error("       'make deploy' writes the broadcast logs these come from, or pass --set NAME=value");
  process.exit(1);
}

/* Conservative minify: block comments, whole-line comments, leading whitespace, blank lines.
   Leading whitespace goes everywhere, <pre> and template literals included. */
const minify = text => text.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/^\s+/, '')).filter(l => l && !l.startsWith('//')).join('\n');

/* The widget is built **before** the page, so the page can carry the widget's own hash. The
   `#/docs` snippet offers a cross-origin `script` tag, and an `integrity` attribute is the only thing
   that makes that safe to paste: it pins the bytes a host page will execute to the bytes this build
   produced. Computed here and substituted, never typed — a hand-written SRI is a hash of whatever was
   true once. The order matters and is the whole reason this block moved above the page. */
/* The widget's budget (M02 criterion 7, DESIGN_HANDOFF § 1) is a gate on every build rather than a
   figure in a handoff: one SSTORE2 chunk holds 24,000 bytes, so the limit that bites is the design's,
   and a widget that has quietly grown past it should stop the build that would upload it. */
const WIDGET_MAX = 10240;
const widget = minify(substitute(readFileSync(join(here, 'src/widget.js'), 'utf8'), 'app/src/widget.js'));
const widgetBytes = Buffer.byteLength(widget);
if (widgetBytes > WIDGET_MAX) {
  console.error(`build: the widget is ${widgetBytes} bytes, ${widgetBytes - WIDGET_MAX} over the ${WIDGET_MAX}-byte budget`);
  console.error('       the budget is the design\'s, not the chunk\'s — cut the widget, or re-argue the budget');
  process.exit(1);
}
const widgetSri = 'sha384-' + createHash('sha384').update(widget).digest('base64');
values.WIDGET_SRI = widgetSri;
sources.WIDGET_SRI = 'the built widget';

let html = readFileSync(join(here, 'src/index.html'), 'utf8');
/* An inlined file is a module for node and a plain script for the page, so its export goes. */
html = html.replace(/\/\*@inline ([\w./-]+)@\*\//g, (_, f) =>
  readFileSync(join(here, 'src', f), 'utf8').replace(/export default \w+;\s*$/, ''));
if (!dev) html = html.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

html = minify(substitute(html, 'app/src/index.html'));

try {
  assertInlineScripts(html, 'app/dist/index.html');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

/* The host page is a foil: substituted so its inline script can reach the factory and the chain, and
   otherwise copied byte for byte — its four panels are deliberately unlike the dapp, and nothing
   reads it but a developer's browser. */
const host = substitute(readFileSync(join(here, 'src/host.html'), 'utf8'), 'app/src/host.html');

/* Every refusal above this line leaves app/dist as it was: a half-written dist is a bundle whose
   three files disagree, and `make chunks` would upload two of them. */
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/index.html'), html);
/* Deterministic per zlib build, not across them: build through the pinned toolchain. */
const gz = gzipSync(Buffer.from(html), { level: 9 });
writeFileSync(join(here, 'dist/index.html.gz'), gz);
writeFileSync(join(here, 'dist/widget.js'), widget);
writeFileSync(join(here, 'dist/host.html'), host);

/* byteLength, not length: the document may carry multi-byte characters. */
console.log(`dapp: raw ${Buffer.byteLength(html)} bytes · gzip ${gz.length} bytes · chain ${chain}${dev ? ' · dev overrides kept' : ''}`);
console.log(`widget: raw ${widgetBytes} bytes · budget ${WIDGET_MAX} · ${WIDGET_MAX - widgetBytes} left · ${widgetSri}`);
