#!/usr/bin/env node
/* Emit step 4's five calldatas, in execution order, for the Ops vault, and the batch that carries them.

   node tools/step4-calldata.mjs --chain 11155111 --app "$APP" --rpc "$RPC" --out calldata
   node tools/step4-calldata.mjs --chain 31337 --app "$APP" --app-nonce 1 --out /tmp/rehearsal  # offline

   `--app` is required, and one of `--rpc` or `--app-nonce` with it: the pointers are `App`'s CREATE
   addresses, so a wrong nonce yields calldata that is reproducible and points at the wrong
   contracts, and a retired address yields an upload that is correct and lands where nothing serves
   it ([#311](https://github.com/dnznlabs/rake/issues/311)).

   Step 4 is an Ops-vault action (decision 44, #178): `App`'s chunk setters are `onlyOwner` and the
   owner is the vault, so the engineer proposes the bytes and the product owner signs them. These files
   are what is signed and what the reviewer re-derives, so they are committed, and the tool is deterministic —
   running it twice at one commit gives byte-identical output.

   The split is `scripts/forge/Chunks.s.sol:_upload`'s, re-implemented rather than reused because the
   forge script broadcasts from one key and cannot run on a chain the engineer does not own:
   `--max-chunk`, 24,000 bytes by default, the payload cut from the front, the remainder in the last piece. That
   constant is a *byte* budget — it keeps a chunk under the 24,576-byte code limit with SSTORE2's
   1-byte prefix — and carries no gas term, so the per-chunk gas is a measurement (§ 4 of the task),
   never an assumption.

   The call order is the task's: both document chunks, then the widget chunk, then the two setters.
   `App._requireChunk` reverts `CodelessChunk` on a pointer with no code (`src/App.sol:119-120`), so
   every `add*Chunk` must land before the setter that names its pointer.

   **Three proposals carry step 4, not one** (decision 47, ruled 2026-11-16): call 1 plain, call 2
   plain, then one batch over everything after them — `batch345.hex` for a two-chunk document.

   **A document of more than two chunks keeps that count** (amended step 6, 2026-11-21): document
   chunks 0 and 1 stay proposals 1 and 2, and every later document chunk is an `addChunk` *inside*
   the batch, ahead of `addWidgetChunk`. So the batch is `addChunk`…, `addWidgetChunk`, `setChunks`,
   `setWidgetChunks`, the file is named for the call numbers it carries (`batch3456.hex` for three
   document chunks), and an upload of any size is three signatures per chain rather than one per
   chunk. The alternative — a fourth proposal — buys nothing while the batch is far under the cap.

   A single `batch` over all five calls was the route
   until it turned out to be unproposable — the coordination API caps a proposal's calldata at 65,536
   characters and that batch was 109,962 — so the upload is split at the boundary where splitting
   costs least. The batch file targets the vault, not `App`, because `batch` is `onlySelf`; it runs
   its calls sequentially and atomically, which is what keeps the widget chunk and the two setters
   that name its pointer in one transaction. Calls 1 and 2 are proposed as plain calls to `App`.

   **The ordering is now the operator's, and it protects correctness and not merely liveness.** The
   three execute at the vault's nonces N, N+1 and N+2 and must be `executeQueued` in that order. The
   contract will not enforce it: `Multisig.executeQueued` takes the nonce as an argument and checks
   only the timelock, and `App._requireChunk` checks that a pointer has code and begins `0x00` —
   nothing about its contents. So running call 2 before call 1 puts valid chunks at both predicted
   addresses with the document's two halves **swapped**, `setChunks` passes both guards, and `App`
   serves a broken document with no revert anywhere. The single batch made that unreachable; this
   shape makes it a procedure. RUNBOOK § Step 4 names the hazard and the repair.

   The numbered files stay as the review copy: files 1 and 2 are proposals in their own right, and
   every file after them is an element of the `bytes[]` a reviewer gets back from
   `cast decode-calldata` on the batch file, in that order.

   ABI encoding comes from `cast calldata` rather than from a hand-rolled encoder here, the same way
   `tools/abi-vectors.sh` generates the codec's fixtures: the oracle is never the thing under test. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const chain = arg('chain');
if (!chain) {
  console.error('usage: node tools/step4-calldata.mjs --chain <id> --app 0x… (--rpc <url> | --app-nonce <n>) [--vault 0x…] [--out <dir>] [--max-chunk <bytes>]');
  process.exit(2);
}
/* **No default for `--app`** ([#311](https://github.com/dnznlabs/rake/issues/311)). It used to
   default to `0x00A90943…5BaE`, the `App` that m05-t01's redeploy retired, and `App` being one
   address on every chain (decision 35) made that look safe — but a *retired* address is as silent as
   a wrong nonce and worse: every check in RUNBOOK § 4a compares the calldata to the build, and none
   compares the target to the deployed `App`, so the whole upload is well-formed, reproducible and
   aimed at a contract nothing serves. It was caught in review on m05-t01c after the calldata had
   been generated and committed against the old address. So it is required, like the nonce, and with
   `--rpc` the code at it is read below. */
const app = arg('app');
const vault = arg('vault', '0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790'); // RUNBOOK § 0 OWNER, one value on every chain
/* `calldata/<chain>` at the repository root, which RUNBOOK § The five calls calls the live path for
   every routine upload. It used to default into m04-t08's own directory — a finished task's record,
   which a later upload would have quietly rewritten (#311). */
const outDir = join(arg('out', 'calldata'), chain);

/* Every argument is validated here, before the first file or chain read, so that a refusal is the
   same in a clean checkout as in a built one. Validating after the reads below makes a missing
   `app/dist/` the error the operator sees — an ENOENT stack trace and exit 1 — in place of the
   instruction they need, which is the opposite of the point: the reason this tool refuses at all is
   that a wrong nonce is silent. The nonce's own rationale is at `appNonce` below, where it is used. */
const rpc = arg('rpc');
const nonceFlag = arg('app-nonce');
if (app === undefined) {
  console.error(
    'step4-calldata: refusing to guess which `App` this upload targets — pass --app 0x…\n' +
    '  the address is per deployment, not per chain: `deploy/gw44.json` names the one the gateway\n' +
    '  reads, and a retired `App` produces a well-formed upload that nothing serves (#311).',
  );
  process.exit(2);
}
if (!/^0x[0-9a-fA-F]{40}$/.test(String(app))) {
  console.error(`step4-calldata: --app must be a 20-byte hex address, got ${JSON.stringify(app)}`);
  process.exit(2);
}
if (nonceFlag === undefined && rpc === undefined) {
  console.error(
    'step4-calldata: refusing to guess `App`\'s nonce — the pointers are its CREATE addresses.\n' +
    '  pass --rpc <url> to read `cast nonce <app>` from the chain, or\n' +
    '  pass --app-nonce <n> for an offline run (the anvil rehearsal).',
  );
  process.exit(2);
}
/* `Number('')` is 0, not NaN, so a blank `--app-nonce` would pass an `isInteger && >= 0` check and
   silently become nonce 0 — the same silently-wrong-nonce failure this whole change exists to stop,
   one layer in. Match the digits before converting. */
const digits = (s) => /^[0-9]+$/.test(String(s).trim());
if (nonceFlag !== undefined && !digits(nonceFlag)) {
  console.error(`step4-calldata: --app-nonce must be a non-negative integer, got ${JSON.stringify(nonceFlag)}`);
  process.exit(2);
}

/* The chunk size, one number shared with `Chunks.s.sol:13`'s `vm.envOr("MAX_CHUNK", …)` so the dev
   chain and this tool cut identically. It is a flag and not a constant because RUNBOOK § Gas's
   sizing rule can lower it on a chain whose gas price for code deposit makes a full chunk too large
   a share of a block, and the rule is re-evaluated on the day of a cut rather than at this commit.
   The default is the committed one: a run with no flag must regenerate a committed upload byte for
   byte, so moving the default is moving the artifacts. */
const MAX_CHUNK = Number(arg('max-chunk', 24_000));
if (!Number.isInteger(MAX_CHUNK) || MAX_CHUNK < 1 || MAX_CHUNK > 24_575) {
  /* 24,575 is the 24,576-byte code limit less SSTORE2's 1-byte prefix. Validated here with the rest
     of the arguments, before the first file read, for the reason given above. */
  console.error(`step4-calldata: --max-chunk must be an integer in 1..24575, got ${JSON.stringify(arg('max-chunk'))}`);
  process.exit(2);
}

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
  /* A second widget chunk would need a second `addWidgetChunk` call and another `App` pointer — a
     plan change, not a loop iteration. */
  console.error(`widget needs ${widgetParts.length} chunks; the plan's call shape assumes 1`);
  process.exit(1);
}
if (docParts.length < 2) {
  /* One chunk would make the widget chunk proposal 2 and change what a reviewer re-derives. The
     shape starts at two because the committed upload has two; a smaller document is a plan change. */
  console.error(`document needs ${docParts.length} chunk(s); the proposal shape assumes 2 or more`);
  process.exit(1);
}
if (docParts.length > 3) {
  /* The plan's own stop, made mechanical: three chunks were ruled on with the batch's size measured
     against the cap (amended step 6). A fourth changes that arithmetic, so it is a question for the
     plan and not a number this tool may raise on its own. */
  console.error(
    `document needs ${docParts.length} chunks; stop and report — the third chunk was ruled on at ${payload.length} bytes\n` +
    '  a fourth is a plan question (proposal count, batch size against the 65,536-character cap, gas per chunk)',
  );
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
   `cast nonce $APP`, in the order the `add*Chunk` calls above execute. `cast nonce` is the right
   instrument for `App` and the wrong one for the vault, whose digests use its internal `nonce()`.

   This used to default to 1, which was right for the first upload on a fresh `App` and silently
   wrong for every upload after it: the pointers would be computed for CREATEs that had already
   happened, `setChunks` would be handed addresses that already hold code, and the calldata would
   look reproducible while pointing at the wrong three contracts. So there is no default. Pass
   `--rpc` and the nonce is read from the chain, or pass `--app-nonce` for an offline run such as
   the anvil rehearsal; with neither, this exits non-zero rather than guessing — refused above,
   before any read, so the refusal does not depend on a build being present. */
/* With a chain to ask, the target is checked for code before anything is built. An `App` that is not
   deployed — a typo, a chain where the redeploy has not happened, a mainnet address that is not ours
   — would otherwise yield calldata whose `setChunks` names CREATE addresses of an account that will
   never make them (#311). Code alone does not prove it is `App`; it proves the target is not empty,
   which is the failure that has actually happened. */
if (rpc !== undefined) {
  const code = cast('code', app, '--rpc-url', rpc);
  if (!code || code === '0x') {
    console.error(`step4-calldata: no code at ${app} on the chain behind --rpc — refusing to build an upload for an undeployed App (#311)`);
    process.exit(2);
  }
}
const appNonce = nonceFlag !== undefined
  ? Number(String(nonceFlag).trim())
  : Number(String(cast('nonce', app, '--rpc-url', rpc)).trim());
if (!Number.isInteger(appNonce) || appNonce < 0) {
  console.error(`step4-calldata: App nonce is not a non-negative integer: ${JSON.stringify(appNonce)}`);
  process.exit(2);
}
if (nonceFlag !== undefined && rpc !== undefined) {
  /* Both given and disagreeing is the stale-calldata bug this change exists to stop, so it is a
     stop rather than a precedence rule. */
  const live = Number(cast('nonce', app, '--rpc-url', rpc));
  if (live !== appNonce) {
    console.error(`step4-calldata: --app-nonce ${appNonce} disagrees with the chain's ${live} for ${app}`);
    process.exit(2);
  }
}
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

/* Everything after the first two document chunks — any further document chunk, then the widget chunk
   and the two setters — in one vault self-call. Sliced after the numbered calls are built, so the
   files and this wrapper cannot disagree about what is in it. The name carries the call numbers it
   holds, so a two-chunk document still writes `batch345.hex` byte for byte. */
const batched = calls.slice(2);
const batchFile = `batch${batched.map((_, i) => i + 3).join('')}.hex`;
calls.push({
  file: batchFile,
  data: cast(
    'calldata',
    'batch(address[],uint256[],bytes[])',
    `[${batched.map(() => app).join(',')}]`,
    `[${batched.map(() => '0').join(',')}]`,
    `[${batched.map((c) => c.data).join(',')}]`,
  ),
});

mkdirSync(outDir, { recursive: true });
console.log(`chain ${chain} · App ${app} · App nonce ${appNonce} · batch target (vault) ${vault}`);
console.log(`payload ${payload.length} bytes → ${docParts.length} chunks (${docParts.map((p) => p.length).join(' + ')})`);
console.log(`widget  ${widget.length} bytes → ${widgetParts.length} chunk`);
/* The pointer list, said out loud with the call each belongs to: `setChunks` names them by position
   and a reviewer has to be able to check that mapping without re-deriving it. */
console.log(`pointers (App CREATE from nonce ${appNonce}):`);
pointers.forEach((p, i) => console.log(`  ${p}  ${calls[i].file}`));
console.log(`batch ${batchFile} carries ${batched.length} calls: ${batched.map((c) => c.file).join(', ')}`);
for (const c of calls) {
  /* No trailing newline: the file is the hex string and nothing else, so `cat` of it drops straight
     into `cast estimate` and `getTransactionHash`. */
  writeFileSync(join(outDir, c.file), c.data);
  const argSha = c.bytes ? ` · bytes arg sha256 ${sha(c.bytes)}` : '';
  console.log(`${c.file}  ${(c.data.length - 2) / 2} bytes  sha256 ${sha(c.data)}${argSha}`);
}

/* The three files that are actually proposed, against the cap that decided this shape: the
   coordination API refuses `p_call_data` over 65,536 characters (measured on the live service, with
   a control), and the dapp enforces the same limit client-side. A file over it is not a slow
   proposal, it is an impossible one, so this refuses here rather than at the POST. */
const CAP = 65_536;
const proposals = [calls[0].file, calls[1].file, batchFile];
let over = 0;
console.log(`proposal sizes against the ${CAP}-character cap:`);
for (const file of proposals) {
  const n = calls.find((c) => c.file === file).data.length;
  const verdict = n <= CAP ? `fits, ${CAP - n} spare` : `OVER by ${n - CAP}`;
  if (n > CAP) over++;
  console.log(`  ${file.padEnd(20)} ${String(n).padStart(7)} chars  ${verdict}`);
}
if (over) {
  console.error(`${over} proposal file(s) exceed the ${CAP}-character cap and cannot be proposed`);
  process.exit(1);
}
