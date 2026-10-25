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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from './src/eth.js';
import { assertInlineScripts } from './inline-scripts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const dev = argv.includes('--dev');
const chain = flag('chain', '31337');

/* A contract's address, and the block it was created in as `<NAME>_BLOCK`: a log scan needs a
   `fromBlock`, and genesis is not one on a chain with a history. */
function deployed() {
  const out = {}, dir = join(root, 'broadcast');
  if (!existsSync(dir)) return out;
  for (const script of readdirSync(dir).sort()) {
    const file = join(dir, script, chain, 'run-latest.json');
    if (!existsSync(file)) continue;
    const log = JSON.parse(readFileSync(file, 'utf8'));
    /* Matched by hash rather than by index: the receipt order is forge's, not this file's contract. */
    const blocks = new Map((log.receipts || []).map(r => [r.transactionHash, r.blockNumber]));
    for (const t of log.transactions) {
      if (t.transactionType !== 'CREATE' || !t.contractName) continue;
      const name = t.contractName.toUpperCase();
      /* Checksummed: the log is lowercase, and the same address two ways gzips to two sizes. */
      out[name] = Eth.checksum(t.contractAddress);
      const block = blocks.get(t.hash);
      if (block != null) out[`${name}_BLOCK`] = '0x' + BigInt(block).toString(16);
    }
  }
  return out;
}

const values = { VERSION: 'v0.1', ...deployed(), CHAIN_ID: chain };
argv.forEach((a, i) => {
  if (a !== '--set') return;
  const [k, ...v] = (argv[i + 1] || '').split('=');
  values[k] = v.join('=');
});

/* Refuse rather than emit: a bundle holding a literal __NAME__ looks fine and fails at its first read. */
function substitute(text, label) {
  const missing = new Set();
  const out = text.replace(/__([A-Z][A-Z0-9_]*)__/g, (m, k) => { if (k in values) return values[k]; missing.add(k); return m; });
  if (!missing.size) return out;
  console.error(`build: nothing to substitute for ${[...missing].map(k => `__${k}__`).join(', ')} in ${label} on chain ${chain}`);
  console.error("       'make deploy' writes the broadcast logs these come from, or pass --set NAME=value");
  process.exit(1);
}

/* Conservative minify: block comments, whole-line comments, leading whitespace, blank lines.
   Leading whitespace goes everywhere, <pre> and template literals included. */
const minify = text => text.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/^\s+/, '')).filter(l => l && !l.startsWith('//')).join('\n');

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
console.log(`widget: raw ${widgetBytes} bytes · budget ${WIDGET_MAX} · ${WIDGET_MAX - widgetBytes} left`);
