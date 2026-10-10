#!/usr/bin/env node
/* Build the single-file dapp: app/src/index.html → app/dist/index.html and index.html.gz.

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

function deployed() {
  const out = {}, dir = join(root, 'broadcast');
  if (!existsSync(dir)) return out;
  for (const script of readdirSync(dir).sort()) {
    const file = join(dir, script, chain, 'run-latest.json');
    if (!existsSync(file)) continue;
    for (const t of JSON.parse(readFileSync(file, 'utf8')).transactions) {
      /* Checksummed: the log is lowercase, and the same address two ways gzips to two sizes. */
      if (t.transactionType === 'CREATE' && t.contractName) out[t.contractName.toUpperCase()] = Eth.checksum(t.contractAddress);
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

let html = readFileSync(join(here, 'src/index.html'), 'utf8');
/* An inlined file is a module for node and a plain script for the page, so its export goes. */
html = html.replace(/\/\*@inline ([\w./-]+)@\*\//g, (_, f) =>
  readFileSync(join(here, 'src', f), 'utf8').replace(/export default \w+;\s*$/, ''));
if (!dev) html = html.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

/* Refuse rather than emit: a bundle holding a literal __NAME__ looks fine and fails at its first read. */
const missing = new Set();
html = html.replace(/__([A-Z][A-Z0-9_]*)__/g, (m, k) => { if (k in values) return values[k]; missing.add(k); return m; });
if (missing.size) {
  console.error(`build: nothing to substitute for ${[...missing].map(k => `__${k}__`).join(', ')} on chain ${chain}`);
  console.error("       'make deploy' writes the broadcast logs these come from, or pass --set NAME=value");
  process.exit(1);
}

/* Conservative minify: block comments, whole-line comments, leading whitespace, blank lines.
   Leading whitespace goes everywhere, <pre> and template literals included. */
html = html.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/^\s+/, '')).filter(l => l && !l.startsWith('//')).join('\n');

try {
  assertInlineScripts(html, 'app/dist/index.html');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/index.html'), html);
/* Deterministic per zlib build, not across them: build through the pinned toolchain. */
const gz = gzipSync(Buffer.from(html), { level: 9 });
writeFileSync(join(here, 'dist/index.html.gz'), gz);
/* byteLength, not length: the document may carry multi-byte characters. */
console.log(`dapp: raw ${Buffer.byteLength(html)} bytes · gzip ${gz.length} bytes · chain ${chain}${dev ? ' · dev overrides kept' : ''}`);
