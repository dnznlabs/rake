# m04-t08 — Step 4 via the Ops vault: the document upload on Sepolia and Base Sepolia

Milestone: [M04](../../MILESTONE.md) · Phase: 2 — The runbook, for real

When this is done, `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` serves the shipping bundle on
Sepolia (11155111) and Base Sepolia (84532): `html()` is that chain's `dapp-nodev` build and
`widget()` is `app/dist/widget.js`, hash-equal both ways, uploaded by the Ops vault — the owner — through
`TimelockExecutor.forward()` on signatures Denizen produces, and `RUNBOOK.md` § Step 4 describes that
procedure instead of a `forge script` the engineer cannot run (decision 44, [#178](https://github.com/dnznlabs/rake/issues/178)).
The engineer prepares and verifies; Denizen signs; nothing here needs a key the engineer does not hold.

## Plan

Both chains, Sepolia first. Branch `m04/t08-step4-vault` from `origin/main` at or after the merge of
[#179](https://github.com/dnznlabs/rake/pull/179) (m04-t03, which this task continues) — and at or after
`7681d35` (#177), so the bundle carries the create-screen owner guard. Every chain read carries an
explicit `--rpc-url "$RPC"` and begins with `cast chain-id` (RUNBOOK § 1g's `ETH_RPC_URL` warning).
Everything through `devbox run --`.

0. **Gates.** Vault state as the mechanism needs it, read and recorded per chain:
   `cast call $OWNER "ownerCount()(uint256)"` → 3, `"threshold()(uint256)"` → 2, `"nonce()(uint32)"`
   (**2** on both chains at scoping, 2026-11-08 22:40 CST; the digests below depend on it),
   `cast call 0x00000000a72A30AdBf38e14d36BCE2610ec3973F "forwardEnabled(address)(bool)" $OWNER` → `true`;
   `cast nonce $APP` → **1** (the pointers below depend on it; anything else is a stop — someone has
   written to `App`); `cast call $APP "html()(string)"` → `""` and `"locked()(bool)"` → `false`.
   Check: six readings per chain in the handoff § Gates, dated.

1. **The bundle, per chain, and its hashes.** `make dapp-nodev CHAIN_ID=$CHAIN_ID`, then
   `sha256sum app/dist/index.html app/dist/index.html.gz app/dist/widget.js` and `wc -c` of each.
   `index.html.gz` is the payload (`Chunks.s.sol:13`, `GZIP` default true); at scoping the shipping
   bundle was 141,126 raw / 44,614 gzipped and the widget 8,132 bytes (#177), so **two** document
   chunks of `MAX_CHUNK = 24_000` and **one** widget chunk — re-measure, do not quote.
   Check: three hashes and three byte counts per chain in the handoff; the gzipped size divided by
   24,000, rounded up, is the document chunk count.

2. **The pointers, before any calldata.** SSTORE2 pointers are `App`'s CREATE addresses, so with
   `App` at nonce 1 they are `cast compute-address $APP --nonce 1`, `--nonce 2`, `--nonce 3` — in the
   order the calls will execute: document chunk 0, document chunk 1, widget chunk. The `App` address
   and nonce are identical on both chains, so the pointers are chain-identical; the first is
   `0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D` (read 2026-11-08). Check: three addresses, and the
   statement that they match across chains.

3. **The five calldatas, in execution order, reproducibly.** Write `tools/step4-calldata.mjs` (or a
   shell script under `tools/`) that reads `app/dist/index.html.gz` and `app/dist/widget.js`, splits
   the document at 24,000 bytes exactly as `Chunks.s.sol:_upload` does, and emits five hex files to
   `docs/milestones/m04/tasks/m04-t08/calldata/<CHAIN_ID>/`:
   `1-addChunk-0.hex`, `2-addChunk-1.hex`, `3-addWidgetChunk.hex`, `4-setChunks.hex`
   (`setChunks(address[],bool)` with the two pointers and `true`), `5-setWidgetChunks.hex` (the third
   pointer) — `cast calldata` is enough. **Commit the files**: they are what Denizen signs and what the
   reviewer re-derives. Check: running the tool twice at the same commit gives byte-identical files;
   `sha256sum` of each is in the handoff; `cast calldata-decode` of files 4 and 5 shows the pointers
   from step 2; the `bytes` argument of files 1–3, concatenated in order, is byte-equal to the payload
   and the widget (`cmp`).

4. **Gas, per call, per chain, from the node.** `cast estimate --from $OWNER $APP $(cat <file>)` for
   each of the five — the vault as sender, which `eth_estimateGas` does not sign-check — plus
   `cast block latest --field gasLimit`. Sepolia prices creation roughly 7× (RUNBOOK § 1e, measured in
   m04-t03), so a 24,000-byte chunk may read ~35M there against ~5M on Base Sepolia; a `forward()`
   wraps each call in roughly a constant overhead (record it once by estimating one `forward()` with
   `--from` an owner and three dummy… **no**: a `forward()` cannot be estimated without valid
   signatures, so state the overhead as unmeasured and bounded by the signature loop, not as a number).
   Check: five estimates per chain and the block gas limit in the handoff; every estimate under the
   limit, or a stop and a message to the architect.

5. **The digests, per nonce.** For call *k* (1–5), nonce is `N + k − 1` where `N` is the vault's
   `nonce()` read in step 0: `cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' $APP 0 $(cat <file>) <nonce>`.
   `forward()` verifies signatures over `getTransactionHash(target, value, data, nonce())` at the
   vault's *current* nonce and `execute()` increments it, so the five must execute in order and no
   other vault transaction may land between them; if the nonce has moved when Denizen signs, every
   digest is recomputed. Check: five digests per chain in the handoff, each beside its nonce.

6. **§ Step 4 in `RUNBOOK.md`, rewritten as procedure.** Keep the `dapp-nodev` → chunks → `chain-doc` →
   `sha256sum` shape and the `make deploy` warning; replace the `forge script … $SIGNER` line with
   two routes, in this order: **(a) unanimous, immediate** — the five calls proposed in the multisig
   dapp (handbook `docs/multisig-transactions.md` § Doing it as a human), each signed by all three Ops
   owners, which the dapp routes to `TimelockExecutor.forward()`; **(b) threshold, queued** — the same
   five signed by two owners, which `Multisig.execute()` queues for `delay()` = 3,600 s, then
   `executeQueued()` by anyone after the eta, **`add*Chunk` before the setters** because
   `App._requireChunk` reverts `CodelessChunk` on a pointer without code. Say which route was used and
   why; cite #178 for the mechanics and `TimelockExecutor.sol:35-46` for the counts. `Chunks.s.sol`
   stays, labelled dev-chain only (where signer and owner are one account). Check: the section names
   both routes, the order constraint, the per-chain-identical pointers, and the calldata tool.

7. **§ For Denizen — step 4 in the handoff**, one block per chain: the vault, `App`, the five calls in
   order with their calldata file, `sha256`, nonce and digest, and what to check in the dapp before
   signing (the decoded selector and pointers for calls 4–5; the `sha256` of the `bytes` argument for
   calls 1–3 against the committed hash). **Then stop and wait**: Denizen signs and the dapp forwards.
   Check: the block is complete enough that Denizen types nothing but his wallets' confirmations.

8. **After the forwards land, verify from the chain**, per chain: `cast nonce $APP` → 4;
   `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID` — `inflated sha256` equals
   step 1's `index.html` hash, `widget sha256` equals `widget.js`'s, byte counts both ways;
   `cast call $APP "chunks(uint256)(address)" 0|1` and `"widgetChunks(uint256)(address)" 0` equal
   step 2's pointers; five `Forwarded` (or `Queued`/executed) transaction hashes and `gasUsed` from
   `cast receipt`. Fill step 4's `record:` rows in RUNBOOK § Executed on testnets. Check: M04
   criterion 3's chain half, per chain, in the handoff AC table.

9. **`HANDOFF.md`** from the handbook template: AC table, § Gates (step 0), the hashes, the pointers,
   the estimates, § For Denizen — step 4, § Deviations (each naming its runbook hunk), § For t04 with
   both gateway URLs and the hashes t04 measures against.

## Acceptance criteria

- M04 criterion 3's chain half, both chains: `make chain-doc` `inflated sha256` = `sha256sum
  app/dist/index.html` of that chain's `dapp-nodev` build at the PR head, `widget sha256` =
  `sha256sum app/dist/widget.js`, byte counts both ways; `cast nonce $APP` → 4; the two `chunks()`
  and one `widgetChunks()` pointers equal the committed predictions.
- The five committed calldata files per chain regenerate byte-identical from the tool at the PR head
  (`sha256sum -c`); files 1–3's `bytes` concatenate to the payload and the widget (`cmp` exit 0);
  files 4–5 decode to the pointers.
- Every upload transaction hash and `gasUsed` from `cast receipt`; the five node estimates and block
  gas limit per chain recorded beside them; step 4's `record:` rows filled in RUNBOOK § Executed on
  testnets, which route was used stated.
- RUNBOOK § Step 4 carries both routes in the order above, the `CodelessChunk` ordering constraint,
  and no `forge script … $SIGNER` for a public chain; `Chunks.s.sol` labelled dev-chain only.
- `git diff --stat origin/main -- src/ test/ .gas-snapshot` empty; `forge test` and `node --test`
  counts unchanged from `main` and stated; `git status --porcelain` empty.
- PR closes this task's issue. Handoff § Deviations empty or each item names its runbook hunk.

## Out of scope

- Any `src/` byte, `lock()`, `setVersion`, any ownership change, any vault self-call (`batch`
  included — five plain calls, by ruling).
- Step 6 (Denizen's, the Creator key); the gateway and host page (t04); the UAT (t05).
- Signing anything: the engineer holds no Ops key and asks for none. Submitting `forward()` itself is
  also not the engineer's unless Denizen hands over the three signatures and says so explicitly.
- Fixing the dapp bundle. If step 1's build is wrong, stop; a bundle change is a new upload.

## Open questions

None. Decision 44 rules the mechanism; the route is (a) because Denizen has stated he holds all
three Ops signers ([#178](https://github.com/dnznlabs/rake/issues/178), 2026-11-08). If a signer is
unreachable on the day, route (b) is already in the runbook and the engineer waits the hour.

## Context

- Decision 44 and M04-D4: `ROADMAP.md` § Decisions, [#178](https://github.com/dnznlabs/rake/issues/178).
- `RUNBOOK.md` § Step 4, § Executed on testnets (m04-t03), § 1e (Sepolia's gas), § 1g (`ETH_RPC_URL`).
- m04-t03 `HANDOFF.md` § For t04 (the empty `html()` reading) and § Gates.
- `src/App.sol:111-168` (the `onlyOwner` setters, `_requireChunk`); `scripts/forge/Chunks.s.sol`.
- Handbook `docs/multisig-transactions.md` § How a transaction moves, § Doing it as a human, § Review
  checklist; `src-company/multisig` `src/mods/TimelockExecutor.sol:35-46` and `src/Multisig.sol:85-100,134-160` at `62eb905`.
