#!/usr/bin/env node
/* Extract the document the chain serves: App.html(), decoded and hashed.

   node tools/chain-doc.mjs [--app 0x…] [--rpc http://…] [--chain 31337] [--out out/chain/index.html]

   eth_call over fetch rather than `cast call`: cast prints a Solidity string literal with escapes, and
   the document has to come back byte-exact. */
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const HTML_SELECTOR = '0x33c34ac3'; // cast sig "html()"

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const root = join(import.meta.dirname, '..');
const rpc = arg('rpc', 'http://127.0.0.1:8545');
const chain = arg('chain', '31337');
const out = join(root, arg('out', 'out/chain/index.html'));

function deployed(name) {
  const file = join(root, `broadcast/DeployApp.s.sol/${chain}/run-latest.json`);
  const { transactions } = JSON.parse(readFileSync(file, 'utf8'));
  const tx = transactions.find(t => t.transactionType === 'CREATE' && t.contractName === name);
  if (!tx) throw new Error(`${name} not found in ${file}`);
  return tx.contractAddress;
}

/* Removed first, so a run that fails cannot leave the previous document standing in for this one. */
rmSync(out, { force: true });

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

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, doc);
console.log(`app      ${app} on chain ${chain} via ${rpc}`);
console.log(`document ${out}`);
console.log(`bytes    ${doc.length}`);
console.log(`sha256   ${createHash('sha256').update(doc).digest('hex')}`);
