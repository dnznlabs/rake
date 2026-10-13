#!/usr/bin/env node
/* Extract the document the chain serves: App.html(), decoded and hashed.

   node tools/chain-doc.mjs [--app 0x…] [--rpc http://…] [--chain 31337] [--out out/chain/index.html]

   eth_call over fetch rather than `cast call`: cast prints a Solidity string literal with escapes, and
   the document has to come back byte-exact.

   On a gzipped App, `html()` is the bootstrap wrapper rather than the page, so hashing what the chain
   returns compares a loader with a document and never matches `app/dist/index.html`. The payload is
   therefore inflated as well, written beside the wrapper and hashed: `inflated sha256` is the hash
   that answers "is the page on chain the page we built". An uncompressed App prints neither. */
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const HTML_SELECTOR = '0x33c34ac3'; // cast sig "html()"
/* src/App.sol:51, byte for byte: what `html()` puts in front of the base64 when `gzipped` is set. */
const BOOTSTRAP = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>app</title>';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const root = join(import.meta.dirname, '..');
const rpc = arg('rpc', 'http://127.0.0.1:8545');
const chain = arg('chain', '31337');
const out = join(root, arg('out', 'out/chain/index.html'));
const inflatedOut = out.replace(/(\.html)?$/, '.inflated.html');

function deployed(name) {
  const file = join(root, `broadcast/DeployApp.s.sol/${chain}/run-latest.json`);
  const { transactions } = JSON.parse(readFileSync(file, 'utf8'));
  const tx = transactions.find(t => t.transactionType === 'CREATE' && t.contractName === name);
  if (!tx) throw new Error(`${name} not found in ${file}`);
  return tx.contractAddress;
}

/* Removed first, so a run that fails cannot leave the previous document standing in for this one.
   The inflated copy goes too: an App that stops being gzipped would otherwise leave one behind. */
rmSync(out, { force: true });
rmSync(inflatedOut, { force: true });

const app = arg('app') || deployed('App');
const rpcRes = await fetch(rpc, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'eth_call',
    params: [{ to: app, data: HTML_SELECTOR }, 'latest'],
  }),
}).catch((e) => { throw new Error(`no RPC at ${rpc} (${e.message}); 'make serve' starts one`); });
const { result, error } = await rpcRes.json();
if (error) throw new Error(`eth_call html() on ${app}: ${error.message}`);

/* ABI head/tail for a single returned string: a 32-byte offset, then a 32-byte length at that offset,
   then the bytes, right-padded to a word. An address with no code returns 0x, which is not that. */
const raw = Buffer.from(result.slice(2), 'hex');
if (raw.length < 64) throw new Error(`html() on ${app} returned ${raw.length} bytes — no App at that address on this chain`);
const offset = Number(raw.readBigUInt64BE(24));
const length = Number(raw.readBigUInt64BE(offset + 24));
const doc = raw.subarray(offset + 32, offset + 32 + length);
if (doc.length !== length) throw new Error(`truncated return: ${doc.length} of ${length} bytes`);
if (!length) throw new Error(`html() on ${app} is empty — 'make chunks' uploads the document`);

const sha256 = b => createHash('sha256').update(b).digest('hex');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, doc);
console.log(`app      ${app} on chain ${chain} via ${rpc}`);
console.log(`document ${out}`);
console.log(`bytes    ${doc.length}`);
console.log(`sha256   ${sha256(doc)}`);

if (doc.subarray(0, BOOTSTRAP.length).toString('latin1') === BOOTSTRAP) {
  /* latin1, not utf8: the wrapper is ASCII either way, and a lossy decode of the one string this
     has to read back exactly is not worth the convenience. */
  const payload = doc.toString('latin1').match(/atob\("([^"]*)"\)/);
  if (!payload) throw new Error(`${out} starts with App's bootstrap but carries no atob() payload`);
  const gz = Buffer.from(payload[1], 'base64');
  const inflated = gunzipSync(gz);
  writeFileSync(inflatedOut, inflated);
  console.log(`payload bytes    ${gz.length}`);
  console.log(`inflated         ${inflatedOut}`);
  console.log(`inflated bytes   ${inflated.length}`);
  console.log(`inflated sha256  ${sha256(inflated)}`);
}
