#!/usr/bin/env node
/* Emit step 4's five calldatas, in execution order, for the Ops vault to forward.

   node tools/step4-calldata.mjs --chain 11155111 [--app 0x…] [--out docs/…/calldata]

   Step 4 is an Ops-vault action (decision 44, #178): `App`'s chunk setters are `onlyOwner` and the
   owner is the vault, so the engineer prepares bytes and Denizen signs them. These files are what he
   signs and what the reviewer re-derives, so they are committed, and the tool is deterministic —
   running it twice at one commit gives byte-identical output.

   The split is `scripts/forge/Chunks.s.sol:_upload`'s, re-implemented rather than reused because the
   forge script broadcasts from one key and cannot run on a chain the engineer does not own:
   MAX_CHUNK = 24_000 bytes, the payload cut from the front, the remainder in the last piece. That
   constant is a *byte* budget — it keeps a chunk under the 24,576-byte code limit with SSTORE2's
   1-byte prefix — and carries no gas term, so the per-chunk gas is a measurement (§ 4 of the task),
   never an assumption.

   The call order is the task's: both document chunks, then the widget chunk, then the two setters.
   `App._requireChunk` reverts `CodelessChunk` on a pointer with no code (`src/App.sol:119-120`), so
   every `add*Chunk` must land before the setter that names its pointer.

   ABI encoding comes from `cast calldata` rather than from a hand-rolled encoder here, the same way
   `tools/abi-vectors.sh` generates the codec's fixtures: the oracle is never the thing under test. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const MAX_CHUNK = 24_000; // Chunks.s.sol:13, byte for byte

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const chain = arg('chain');
if (!chain) {
  console.error('usage: node tools/step4-calldata.mjs --chain <id> [--app 0x…] [--out <dir>]');
  process.exit(2);
}
/* `App` is the same address on every chain of RUNBOOK § 1 (decision 35), so this is a default and
   not a per-chain table. */
const app = arg('app', '0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE');
const outDir = join(arg('out', 'docs/milestones/m04/tasks/m04-t08/calldata'), chain);

const payload = readFileSync('app/dist/index.html.gz'); // Chunks.s.sol's GZIP default is true
const widget = readFileSync('app/dist/widget.js');

const cut = (data) => {
  const n = Math.ceil(data.length / MAX_CHUNK);
  const parts = [];
  for (let i = 0; i < n; ++i) {
    parts.push(data.subarray(i * MAX_CHUNK, Math.min((i + 1) * MAX_CHUNK, data.length)));
  }
  return parts;
};

const cast = (...args) => execFileSync('cast', args, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const hex = (buf) => `0x${buf.toString('hex')}`;
const sha = (s) => createHash('sha256').update(s).digest('hex');

const docParts = cut(payload);
const widgetParts = cut(widget);
if (widgetParts.length !== 1) {
  /* A second widget chunk would need a second `addWidgetChunk` call, a fourth `App` nonce and a
     sixth vault nonce — a plan change, not a loop iteration. */
  console.error(`widget needs ${widgetParts.length} chunks; the plan's five calls assume 1`);
  process.exit(1);
}

const calls = [];
docParts.forEach((part, i) => {
  calls.push({ file: `${i + 1}-addChunk-${i}.hex`, data: cast('calldata', 'addChunk(bytes)', hex(part)), bytes: part });
});
const widgetIndex = docParts.length + 1;
calls.push({
  file: `${widgetIndex}-addWidgetChunk.hex`,
  data: cast('calldata', 'addWidgetChunk(bytes)', hex(widgetParts[0])),
  bytes: widgetParts[0],
});

/* SSTORE2 pointers are `App`'s own CREATE addresses, so they are the account-nonce sequence from
   `cast nonce $APP` — 1 here, read in step 0 — in the order the `add*Chunk` calls above execute.
   `cast nonce` is the right instrument for `App` and the wrong one for the vault, whose digests use
   its internal `nonce()`. */
const appNonce = Number(arg('app-nonce', '1'));
const pointers = [];
for (let i = 0; i < calls.length; ++i) {
  pointers.push(cast('compute-address', app, '--nonce', String(appNonce + i)).split(/\s+/).pop());
}
const docPointers = pointers.slice(0, docParts.length);
const widgetPointers = pointers.slice(docParts.length);

calls.push({
  file: `${widgetIndex + 1}-setChunks.hex`,
  data: cast('calldata', 'setChunks(address[],bool)', `[${docPointers.join(',')}]`, 'true'),
});
calls.push({
  file: `${widgetIndex + 2}-setWidgetChunks.hex`,
  data: cast('calldata', 'setWidgetChunks(address[])', `[${widgetPointers.join(',')}]`),
});

mkdirSync(outDir, { recursive: true });
console.log(`chain ${chain} · App ${app} · App nonce ${appNonce}`);
console.log(`payload ${payload.length} bytes → ${docParts.length} chunks (${docParts.map((p) => p.length).join(' + ')})`);
console.log(`widget  ${widget.length} bytes → ${widgetParts.length} chunk`);
console.log(`pointers ${pointers.join(' ')}`);
for (const c of calls) {
  /* No trailing newline: the file is the hex string and nothing else, so `cat` of it drops straight
     into `cast estimate` and `getTransactionHash`. */
  writeFileSync(join(outDir, c.file), c.data);
  const argSha = c.bytes ? ` · bytes arg sha256 ${sha(c.bytes)}` : '';
  console.log(`${c.file}  ${(c.data.length - 2) / 2} bytes  sha256 ${sha(c.data)}${argSha}`);
}
