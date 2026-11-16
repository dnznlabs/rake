# m04-t08 — Step 4 via the Ops vault: the document upload on Sepolia and Base Sepolia

Milestone: [M04](../../MILESTONE.md) · Phase: 2 — The runbook, for real

> **Revision 2026-11-16 — the batch route, after [#191](https://github.com/dnznlabs/rake/pull/191) (merged `a1c1896`, 2026-11-15).**
> `RUNBOOK.md` § Step 4 now prescribes one `batch` proposal per chain, **proposed by the engineer with her
> own signature (4a), reviewed and co-signed by the Product Owner (4b), submitted and executed through the
> queue (4c), verified by the engineer (4d)**. This plan was written for route (a) — five plain `forward()`
> calls, all three signatures Denizen's — and forbade both the self-call and any engineer signature, so an
> engineer following it could not act on the runbook. The reason the route moved is in #191's body: the
> Product Owner's signing app does not support Sepolia, so a 3-of-3 `forward()` cannot be signed there;
> Elanik was added as an Ops owner instead (`addOwner` queued at vault nonce 2 on both chains, 2026-11-16).
> Steps 1–6 are done and merged (#187, #191; `HANDOFF.md` records them). This revision changes **steps
> 7–9, two gates, § Acceptance criteria, § Out of scope and § Open questions** to the route the runbook
> now describes; the superseded text is struck (~~like this~~) and kept. The mechanism is unchanged:
> decision 44 still rules that step 4 is an Ops vault action.

> **Revision 2026-11-16, second — three proposals per chain (decision 47, [#188](https://github.com/dnznlabs/rake/issues/188)).**
> Step 7 stopped on the day it went live: the multisig coordination service caps a proposal's calldata
> at **65,536 hex characters** (32,768 bytes) and the request body at 72 KiB, enforced identically by the
> dapp, and `batch.hex` is 109,962 characters — measured live with a paired control, recorded on #188. Ruled
> the same day: **three proposals per chain, in nonce order** — call 1 (`1-addChunk-0.hex`, 48,138 chars)
> and call 2 (`2-addChunk-1.hex`, 42,890) as plain calls to `App`, then `batch345.hex` (the vault's `batch`
> over calls 3, 4, 5; 18,314 chars) so the setters stay atomic with the widget chunk. Each has its own digest
> at *N*, *N* + 1, *N* + 2; each gets the engineer's signature then the Product Owner's; `executeQueued`
> runs 1 → 2 → batch. RUNBOOK § Step 4 (4a–4c, § The five calls, § Gas) is amended in the same PR. This
> revision changes **step 3's tool note, steps 7–9, § Acceptance criteria and § Out of scope**; the
> 2026-11-16 batch-route text it replaces is struck and kept. Rejected: five plain proposals (setters not
> atomic with their chunk, five signing rounds); on-chain `approve()` from both owners with one packed
> `execute` (the Product Owner would have to send raw transactions on Sepolia, the limitation that moved
> the route off `forward()`; the approve path is unverified in source); shrinking `MAX_CHUNK` (a contract
> constant, and a change to the chunking of every later upload — #188's question, not this task's).

When this is done, `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` serves the shipping bundle on
Sepolia (11155111) and Base Sepolia (84532): `html()` is that chain's `dapp-nodev` build and
`widget()` is `app/dist/widget.js`, hash-equal both ways, uploaded by the Ops vault — the owner — ~~through
`TimelockExecutor.forward()` on signatures Denizen produces~~ through ~~one `batch` proposal per chain~~
**three proposals per chain** (two plain `addChunk` calls, then a `batch` of calls 3–5; since 2026-11-16) that the
engineer proposes and the Product Owner co-signs, queued for the vault's 3,600 s and then executed in nonce order
(RUNBOOK § Step 4, 4a–4d, since #191), and `RUNBOOK.md` § Step 4 describes that
procedure instead of a `forge script` the engineer cannot run (decision 44, [#178](https://github.com/dnznlabs/rake/issues/178)).
~~The engineer prepares and verifies; Denizen signs; nothing here needs a key the engineer does not hold.~~
The engineer prepares, proposes with one signature per proposal and verifies; the Product Owner reviews, adds the second
signature to each and submits; the engineer's key is an Ops owner on both testnets since 2026-11-16 and signs the
three proposals only.

## Plan

Both chains, Sepolia first. Branch `m04/t08-step4-vault` from `origin/main` at or after the merge of
[#179](https://github.com/dnznlabs/rake/pull/179) (m04-t03, which this task continues) — and at or after
`7681d35` (#177), so the bundle carries the create-screen owner guard. Every chain read carries an
explicit `--rpc-url "$RPC"` and begins with `cast chain-id` (RUNBOOK § 1g's `ETH_RPC_URL` warning).
Everything through `devbox run --`.

0. **Gates.** Vault state as the mechanism needs it, read and recorded per chain:
   `cast call $OWNER "ownerCount()(uint256)"` → ~~3~~ **4 since 2026-11-16** (Elanik added; read 4 on both chains at 14:39Z that day), `"threshold()(uint256)"` → 2, `"nonce()(uint32)"`
   (**2** on both chains at scoping, 2026-11-08 22:40 CST; the digests below depend on it — **this is the vault's internal `nonce()`, not its account nonce**: `cast nonce $OWNER` reads 1 on both chains and would make every digest wrong by one; `cast nonce` is right only for `App` in step 2, where the SSTORE2 pointers really are account-nonce CREATEs),
   `cast call 0x00000000a72A30AdBf38e14d36BCE2610ec3973F "forwardEnabled(address)(bool)" $OWNER` → `true` (recorded; no longer a gate since the 2026-11-16 revision — `forward()` is not the route);
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
   **Amended 2026-11-16 (second revision):** the tool also writes `batch345.hex` — the vault's
   `batch(address[],uint256[],bytes[])` over entries 3, 4 and 5, in the same `cast calldata batch(...)` form
   that #191 used for the five — and **no longer writes `batch.hex`**, which is deleted from both chain
   directories in the same commit (RUNBOOK § The five calls says why: one fewer file to mistake for the live
   one). Three `App` targets, three `0` values, three `bytes`. Check: after `make dapp-nodev CHAIN_ID=$CHAIN_ID`
   and `node tools/step4-calldata.mjs --chain $CHAIN_ID` on each chain, `git status --porcelain` is empty
   (the committed `batch345.hex` regenerates byte-identical and no `batch.hex` reappears);
   `wc -c docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/batch345.hex` prints a figure **under
   65,536** (18,314 when derived by hand at `61322ca`, identical on both chains; measure, do not quote);
   `cast decode-calldata "batch(address[],uint256[],bytes[])" $(cat batch345.hex)` gives the three files'
   bytes in order.

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

**Steps 7–9 as scoped 2026-11-08 (superseded 2026-11-16, kept for the record):**

~~7. **§ For Denizen — step 4 in the handoff**, one block per chain: the vault, `App`, the five calls in~~
   ~~order with their calldata file, `sha256`, nonce and digest, and what to check in the dapp before~~
   ~~signing (the decoded selector and pointers for calls 4–5; the `sha256` of the `bytes` argument for~~
   ~~calls 1–3 against the committed hash). **Then stop and wait**: Denizen signs and the dapp forwards.~~
   ~~Check: the block is complete enough that Denizen types nothing but his wallets' confirmations.~~

~~8. **After the forwards land, verify from the chain**, per chain: `cast nonce $APP` → 4;~~
   ~~`node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID` — `inflated sha256` equals~~
   ~~step 1's `index.html` hash, `widget sha256` equals `widget.js`'s, byte counts both ways;~~
   ~~`cast call $APP "chunks(uint256)(address)" 0|1` and `"widgetChunks(uint256)(address)" 0` equal~~
   ~~step 2's pointers; five `Forwarded` (or `Queued`/executed) transaction hashes and `gasUsed` from~~
   ~~`cast receipt`. Fill step 4's `record:` rows in RUNBOOK § Executed on testnets. Check: M04~~
   ~~criterion 3's chain half, per chain, in the handoff AC table.~~

~~9. **`HANDOFF.md`**: AC table, § Gates (step 0), the hashes, the pointers,~~
   ~~the estimates, § For Denizen — step 4, § Deviations (each naming its runbook hunk), § For t04 with~~
   ~~both gateway URLs and the hashes t04 measures against.~~

**Steps 6a–9 since 2026-11-16, against RUNBOOK § Step 4 (4a–4d) at `a1c1896`.** Steps 1–6 are merged
(#187, #191). Variables as RUNBOOK § 0; `$ENGINEER` = `0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`.
Every command through `devbox run --`, every chain read with an explicit
`--rpc-url "$RPC"`, each chain's run opened with `cast chain-id`.

6a. **Gate, satisfied — ruled 2026-11-16 ([#190](https://github.com/dnznlabs/rake/issues/190)): the dev-seed
   salt ships in this upload; the featured panel is empty on both testnets until
   [#193](https://github.com/dnznlabs/rake/issues/193) lands.** Denizen, Telegram 08:46 CST, verbatim in
   #190's closing comment: *"that's fine - re-running the uploads ... it's really only this first ... in the
   future will be regular updates... but we'll need a followup task created so that we set the featured
   distro and re-upload chunks"*. #193 is carried (m04): set the featured distribution and re-upload.
   Check: nothing to run; the handoff § Gates cites #190's closing comment.

6b. **Gate: the Sepolia queue is clean — the Product Owner's action; the engineer waits for his word.**
   The dapp lists stale 0/2 rows on Sepolia from the earlier plan: bare `addChunk` proposals at nonces
   2 and 3 and a duplicate `addOwner` at 4. He clears them in the dapp so the live proposals (three since
   the second revision, at *N*, *N* + 1, *N* + 2) are the only open rows at their nonces and 4b cannot pick
   up the wrong one — the stale `addChunk` rows are the same calldata as proposals 1 and 2 at a dead nonce,
   so the row to sign is told apart by nonce and signature count, not by data. Check: his message saying the
   rows are gone, quoted in the handoff § Gates with its date; nothing for the engineer to run.

**Steps 7–9 as revised the first time on 2026-11-16 (the one-batch route; superseded the same day by the
second revision, kept for the record):**

~~7. **= RUNBOOK 4a — gates, regenerate, propose with one signature, record, stop.** Per chain: gates~~
   ~~(`isOwner($ENGINEER)` true, `threshold()` 2, live `nonce()` *N*, `cast nonce $APP` 1); regenerate with an~~
   ~~empty `git diff`; propose `calldata/$CHAIN_ID/batch.hex` — target `$OWNER`, value `0`, nonce *N* — with~~
   ~~her signature and no other, digest = `getTransactionHash($OWNER, 0, batch.hex, N)`; record; stop.~~
   ~~Check: one proposal per chain at nonce *N*, data `batch.hex`, exactly one signature.~~

~~8. **= RUNBOOK 4d — after `executeQueued` lands, verify from the chain**, with both transaction hashes.~~

~~9. **`HANDOFF.md` § For Denizen as the 4b checklist and the gas budget**: target `$OWNER`; `sha256sum` equals~~
   ~~`batch.hex` (Sepolia `d9cc558b…409f237`, Base Sepolia `9b16ccc6…ca0fd6e` at `a1c1896`, 109,962 hex chars~~
   ~~each); decode to five calls; nonce live, digest `getTransactionHash($OWNER, 0, batch.hex, nonce)` (at nonce~~
   ~~3: Sepolia `0xc65454f8…abbcf`, Base Sepolia `0x9d83f01f…78302`); confirm the self-call out of band; gas~~
   ~~110,000,000 on Sepolia, a figure under 120,000,000 on Base Sepolia.~~

**Steps 7–9 since the second revision of 2026-11-16, against RUNBOOK § Step 4 (4a–4d) as amended with it.**

7. **= RUNBOOK 4a — gates, regenerate, propose three times with one signature each, record, stop.** Per
   chain:
   - Gates, read and recorded with the time: `cast call $OWNER "isOwner(address)(bool)" $ENGINEER` →
     `true`; `"threshold()(uint16)"` → `2`; `"nonce()(uint32)"` → the live vault nonce *N* (3 on both
     chains at 2026-11-16 16:04Z; it moves if anything lands); `cast nonce $APP` → `1`. Any other value
     is a stop and a message to the architect.
   - `make dapp-nodev CHAIN_ID=$CHAIN_ID`, then `node tools/step4-calldata.mjs --chain $CHAIN_ID`;
     `git status --porcelain` must be **empty**, or a committed file is stale and this stops.
   - Propose **three** times, in nonce order, each with **her signature and no other**, by handbook
     `docs/multisig-transactions.md` § Doing it as an agent, steps 1–3 — digest from
     `cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' <target> 0 $(cat <file>) <nonce> --rpc-url "$RPC"`,
     `cast wallet sign --no-hash --account <keystore> <digest>`, verified with `cast wallet verify --no-hash`,
     `POST /proposals`:

     | proposal | file | `<target>` | `<nonce>` |
     |--:|:--|:--|:--|
     | 1 | `calldata/$CHAIN_ID/1-addChunk-0.hex` | `$APP` | *N* |
     | 2 | `calldata/$CHAIN_ID/2-addChunk-1.hex` | `$APP` | *N* + 1 |
     | 3 | `calldata/$CHAIN_ID/batch345.hex` | `$OWNER` | *N* + 2 |

     The target is the digest's first argument and differs between the plain calls and the batch; a
     plain call signed against `$OWNER`, or the batch against `$APP`, is a digest the vault will never
     accept. Each description names this step, the chain, "proposal *k* of 3" and the commit the files
     were generated at; it is unsigned and 4b does not read it.
   - `record:` in the handoff and RUNBOOK § Step 4's `record:` line: the three nonces, the three digests,
     the commit.
   - **Then stop.** Steps 4b (review, second signatures) and 4c (submit, wait, `executeQueued` ×3) are
     the Product Owner's. The engineer adds no second signature, submits nothing, and does not
     `executeQueued` on her own initiative.
   Check: on each chain the dapp shows **three** proposals at nonces *N*, *N* + 1, *N* + 2 — targets `$APP`,
   `$APP`, `$OWNER`; value 0; data `1-addChunk-0.hex`, `2-addChunk-1.hex`, `batch345.hex` — each with exactly
   one signature (`$ENGINEER`'s), and each digest equals its `cast call` above.

8. **= RUNBOOK 4d — after the third `executeQueued` lands, verify from the chain.** Per chain, once the
   Product Owner reports all six transaction hashes (three `execute()` submits, three `executeQueued()`):
   `cast nonce $APP` → **4**; `make dapp-nodev CHAIN_ID=$CHAIN_ID` then
   `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID` — `inflated sha256` equals
   `sha256sum app/dist/index.html`, `widget sha256` equals `sha256sum app/dist/widget.js`, byte counts
   equal both ways (the handoff's § The bundle figures, re-measured not quoted); `cast call $APP
   "chunks(uint256)(address)" 0|1` and `"widgetChunks(uint256)(address)" 0` equal § The pointers;
   `cast receipt <hash> --field gasUsed` for **all six** transactions. Fill step 4's `record:` rows in
   RUNBOOK § Executed on testnets: pointers, six hashes, six `gasUsed`, the two sha256s and byte counts.
   **Gates between pieces, RUNBOOK 4c's table, read by whoever sends the `executeQueued` calls and
   recorded in the handoff with the time:** before piece 2, `cast nonce $APP` → `2` **and** `cast code
   0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D` (predicted doc 0) non-empty; before the batch,
   `cast nonce $APP` → `3` **and** both document pointers (`…35D0D`, `0xAf5f9504…730a0`) have code;
   after the batch, `cast nonce $APP` → `4` and the widget pointer `0xc39C7643…aC8e` has code. The
   nonce reads `2` and the doc-0 pointer holds code after *either* order, so neither is the gate against
   the swap; the gate is content equality — `cast code` at the doc-0 pointer equals `0x00` followed by
   the `bytes` argument decoded from `1-addChunk-0.hex` (`cast calldata-decode "addChunk(bytes)"`),
   and likewise doc 1 against `2-addChunk-1.hex` before the batch (RUNBOOK 4c has the one-liner). Any
   other reading stops and messages the architect. `html()` is empty until the batch lands. **The
   hazard these guard** (RUNBOOK 4c, the engineer's source read of 2026-11-16): pointers are `App`'s
   CREATE addresses by nonce, so piece 2 before piece 1 puts doc 1 at the predicted doc-0 address,
   `_requireChunk` (`src/App.sol:198-209`) checks code and a `0x00` first byte and nothing about
   contents, `setChunks` passes, and `App` silently serves the two gzip chunks swapped — the one
   out-of-order permutation that does not revert `CodelessChunk` — measured on a Sepolia fork
   2026-11-16: three `0x1` receipts, chunk sizes 21,359 / 24,001 the wrong way round, `chain-doc`
   throws `Z_DATA_ERROR` on inflate. If `chain-doc` fails to inflate or `inflated sha256` differs with
   all six landed, that is the first suspect, `cast code` at the two pointers tells which chunk sits
   where, and the fix is one corrective `setChunks` proposal with the pointers in order, scoped then;
   no re-upload. Check: M04 criterion 3's chain half, per chain, in the handoff AC table with the
   commands and figures, and the three gate readings dated.

9. **`HANDOFF.md` § For Denizen rewritten as three 4b checklists and three gas limits**, one block per
   chain, replacing the one-batch checklist (keep it struck as the record, as the five-row signing tables
   already are). The block is what he runs against a checkout of the commit step 7 recorded, before each
   signature:
   - **Proposals 1 and 2** (`1-addChunk-0.hex`, `2-addChunk-1.hex`): target is `$APP`
     (`0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`), **not** the vault; value `0`; `sha256sum` of the
     proposal's data equals `sha256sum docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/<file>` (at
     `61322ca`: Sepolia `3b5891a8…40ba4` and `cdb5fe89…06357`, Base Sepolia `8cee870c…5691a` and
     `1747296…8fea3`; 48,138 and 42,890 hex chars on both); `cast decode-calldata "addChunk(bytes)"
     $(cat <file>)` gives one `bytes` whose `sha256` is the handoff § The five calls' figure for that chunk;
     the nonce is *N* for 1 and *N* + 1 for 2, and the digest equals `getTransactionHash($APP, 0, <file>, <nonce>)`
     (at *N* = 3, read 2026-11-16 16:04Z: Sepolia `0xe73c3f13…a326d` and `0xc1e9b846…4bc47`, Base Sepolia
     `0xf9996757…6d702` and `0xa2f30eeb…0f9a1` — recompute if the nonce moved).
   - **Proposal 3** (`batch345.hex`): target is `$OWNER` (`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`),
     **not** `$APP`; value `0`; `sha256sum` equals `sha256sum …/calldata/$CHAIN_ID/batch345.hex`
     (`7946270a…1438f` on both chains at `61322ca`, 18,314 hex chars / 9,156 bytes — the real `cast
     calldata` encoding, identical on both chains; proposals 1 and 2 are 24,068 and 21,444 bytes; the
     deleted `batch.hex` was 109,962 chars, 44,426 over the cap); `cast decode-calldata
     "batch(address[],uint256[],bytes[])" $(cat batch345.hex)` → three targets all `$APP`, three values all
     `0`, three `bytes` equal to `3-addWidgetChunk.hex`, `4-setChunks.hex`, `5-setWidgetChunks.hex` in
     order; the nonce is *N* + 2 and the digest equals `getTransactionHash($OWNER, 0, batch345.hex, N + 2)`
     (at *N* = 3: Sepolia `0x7d2d3128…6c0f5`, Base Sepolia `0xc691bc7e…0f521`); `batch` is a vault
     self-call: confirm it outside the chat that requested it (handbook § Review checklist).
   - Then sign all three, submit all three back to back in nonce order (the vault refuses 2 before 1:
     `execute` hashes against `nonce++`), **wait one hour once, not three** — each submit queues its
     own digest at `block.timestamp + 3,600 s` and the three windows run concurrently — then
     `executeQueued()` **1 → 2 → batch**, each after the one before it has a receipt. The block says
     in so many words that **the vault does not enforce this order at execution**: `queued` is keyed
     by digest and `executeQueued` checks only `eta != 0 && block.timestamp >= eta`
     (`src-company/multisig` `src/Multisig.sol:29,187-192` at `62eb905`), so whoever sends the three
     calls sends them 1, then 2, then the batch. It names both misorders from RUNBOOK 4c: the batch
     before 1 or 2 reverts the whole piece with `CodelessChunk(ptr)` and leaves it queued; 2 before 1
     succeeds and serves the page with its halves swapped, repaired only by a further `setChunks`
     proposal. `cast nonce $APP` reads 2, 3, 4 after each; he checks it before sending the next.
   And the **three gas limits for `executeQueued`**, set by hand because a wallet's estimate through a
   public RPC may report a false `DeploymentFailed()`, copied from RUNBOOK § Gas's table and labelled
   estimates — they replace the single 110,000,000 of the one-`batch` route, and with them the question
   of its headroom under the block limit: **Sepolia 50,000,000 / 44,000,000 / 18,000,000** (calls 1 and 2 estimated 37,859,277 and
   33,740,257 live; the batch 13,140,215 + 71,317 + 42,719 plus the loop, under the 200,000,000 block
   limit); **Base Sepolia 7,000,000 / 6,200,000 / 2,800,000** (5,343,761 and 4,767,004 live; the batch
   derived from the handoff's whole-batch 12,188,581 less calls 1 and 2, under 120,000,000). The batch
   cannot be estimated from the node before proposals 1 and 2 execute (`CodelessChunk`); after the second
   `executeQueued` he may re-estimate it with `cast estimate --from $OWNER $OWNER $(cat batch345.hex)` and
   the handoff says so. Running out of gas reverts that one call and leaves it queued, so it can be
   re-sent with more. Check: the block is complete enough that he types nothing but the checklist
   commands and his wallet's confirmations.

## Acceptance criteria

Amended 2026-11-16 for the batch route, and again the same day for three proposals (decision 47). Struck
criteria are the superseded text; the one that follows each replaces it. Every figure is read at the review
head, not quoted from here.

- M04 criterion 3's chain half, both chains: `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID`
  `inflated sha256` = `sha256sum app/dist/index.html` of that chain's `dapp-nodev` build at the PR head,
  `widget sha256` = `sha256sum app/dist/widget.js`, byte counts both ways; `cast nonce $APP --rpc-url "$RPC"`
  → `4`; `cast call $APP "chunks(uint256)(address)" 0|1` and `"widgetChunks(uint256)(address)" 0` equal
  the committed predictions. (Unchanged in substance; claimable only after 4c lands.)
- The five committed calldata files **and ~~`batch.hex`~~ `batch345.hex`** per chain regenerate byte-identical
  from the tool at the PR head (`sha256sum -c`, and `git status --porcelain` empty after
  `make dapp-nodev CHAIN_ID=$CHAIN_ID` and `node tools/step4-calldata.mjs --chain $CHAIN_ID` on each chain);
  **no `batch.hex` exists under `calldata/` and the tool does not write one** (`ls calldata/*/batch.hex`
  prints nothing); `wc -c calldata/$CHAIN_ID/batch345.hex` is **under 65,536** on both chains, the figure
  stated; files 1–3's `bytes` concatenate to the payload and the widget (`cmp` exit 0); files 4–5 decode to
  the pointers; `cast decode-calldata "batch(address[],uint256[],bytes[])" $(cat batch345.hex)` gives three
  `$APP` targets, three `0` values and files 3, 4, 5's bytes in order.
- ~~Every upload transaction hash and `gasUsed` from `cast receipt`; the five node estimates and block gas
  limit per chain recorded beside them; step 4's `record:` rows filled in RUNBOOK § Executed on testnets,
  which route was used stated.~~
  ~~**The engineer's step-7 criterion, per chain:** a proposal exists in the dapp at the vault's live
  `nonce()` with target `$OWNER`, value `0`, data byte-equal to the committed `batch.hex`, exactly one
  signature, and a digest equal to `getTransactionHash($OWNER, 0, batch.hex, <nonce>)` (at nonce 3: Sepolia
  `0xc65454f8…eabbcf`, Base Sepolia `0x9d83f01f…378302`).~~
  **The engineer's step-7 criterion, per chain (since the second revision of 2026-11-16): exactly three
  proposals** exist in the dapp at the vault's live `nonce()` *N* and the two after it
  (`cast call $OWNER "nonce()(uint32)" --rpc-url "$RPC"`, 3 on both chains at 2026-11-16 16:04Z), each with
  value `0` and **exactly one signature at proposal time, `0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`'s**:
  proposal *k* = 1, 2, 3 has data byte-equal to the committed `1-addChunk-0.hex`, `2-addChunk-1.hex`,
  `batch345.hex`, target `$APP`, `$APP`, `$OWNER`, and a digest equal to
  `cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' <target> 0 $(cat docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/<file>) $((N + k - 1)) --rpc-url "$RPC"`
  (at *N* = 3, read 2026-11-16 16:04Z — Sepolia
  `0xe73c3f13c1b2f66f1d15e53a1cc2cefcd6da67b41599f1273d31e359caca326d`,
  `0xc1e9b846b07a3c73ad80c4f168c7972b78e0d239342dc530ebe4668fa2d4bc47`,
  `0x7d2d3128a3e3ee78c30a10c2e7e2834c9031d57c1c466c9900c91fa8e256c0f5`; Base Sepolia
  `0xf9996757df4ac60bbf8fad2b779c39ef7c82215390a8a12dc7bf17284706d702`,
  `0xa2f30eebdcdc15eaa2ee322bf050796e72a12707b72eb4a38232fb10fa70f9a1`,
  `0xc691bc7e6ca4098f7b37ec1207fc0a7389ccead111ad762296d8758ff320f521`); no other open proposal of the
  engineer's on either chain; the three nonces, three digests and generating commit in the handoff and in
  RUNBOOK § Step 4's `record:`. **After 4c:** the three submit and three `executeQueued` transaction hashes
  and `cast receipt <hash> --field gasUsed` for all six, per chain, in step 4's `record:` rows in RUNBOOK
  § Executed on testnets, with the route stated as 4a–4d, three proposals.
- ~~RUNBOOK § Step 4 carries both routes in the order above, the `CodelessChunk` ordering constraint, and
  no `forge script … $SIGNER` for a public chain; `Chunks.s.sol` labelled dev-chain only.~~ Met by #187 and
  #191; RUNBOOK § Step 4 at the PR head is still 4a–4d with the `CodelessChunk` constraint,
  `grep -c "forge script" RUNBOOK.md` over § Step 4 prints `0`, and `Chunks.s.sol` is still labelled
  dev-chain only.
- `git diff --stat origin/main -- src/ test/ .gas-snapshot` empty; `forge test` and `node --test` counts
  unchanged from `main` and stated; `git status --porcelain` empty.
- **Gates recorded:** the handoff § Gates carries, per chain and dated, `isOwner($ENGINEER)` `true`,
  `ownerCount()` `4`, `threshold()` `2`, `delay()` `3600`, `nonce()` *N*, `cast nonce $APP` `1`; § Gates
  cites #190's closing comment (ruled 2026-11-16) and names #193 as the carried follow-up, and quotes the
  Product Owner's word that the Sepolia queue is clean, dated.
- ~~PR closes this task's issue.~~ The PR that carries step 8 closes [#185](https://github.com/dnznlabs/rake/issues/185);
  a PR that stops at step 7 says `Refs #185`. Handoff § Deviations empty or each item names its runbook hunk.

## Out of scope

Amended 2026-11-16. The first and third bullets of 2026-11-08 are struck and replaced, because the runbook's
route is now a `batch` self-call with the engineer's signature on it; amended again the same day for the
three-proposal shape (decision 47).

- Any `src/` byte, `lock()`, `setVersion`, any ownership change~~, any vault self-call (`batch`
  included — five plain calls, by ruling)~~. **The one vault self-call in scope is `batch` over ~~the five
  step-4 calls, as committed in `calldata/$CHAIN_ID/batch.hex`~~ step-4 calls 3, 4 and 5, as committed in
  `calldata/$CHAIN_ID/batch345.hex`; the only plain calls in scope are calls 1 and 2 to `$APP`, as committed;
  no other vault action of any kind — no `addOwner`, `removeOwner`, `setThreshold`, `setDelay`,
  `setExecutor`, `delegateCall`, `enableForward`, no `cancelQueued`, no on-chain `approve()`, no proposal
  with any other target or data.**
- `MAX_CHUNK` and the chunking: the constant stays `24_000` in `Chunks.s.sol` and the tool; its sizing
  against code limit, gas and the proposal cap together is [#188](https://github.com/dnznlabs/rake/issues/188)'s,
  widened 2026-11-16 and carried to the milestone that next touches the upload.
- Step 6 (Denizen's, the Creator key); the gateway and host page (t04); the UAT (t05).
- ~~Signing anything: the engineer holds no Ops key and asks for none. Submitting `forward()` itself is
  also not the engineer's unless Denizen hands over the three signatures and says so explicitly.~~
  **The engineer's signature is ~~on the `batch` proposal only (RUNBOOK 4a), one per chain~~ one per
  proposal, three per chain (RUNBOOK 4a) — on proposals 1, 2 and 3 of step 7 and on nothing else.** Never a
  second signature on anything; never `POST /signature` onto a proposal; never submit (`execute()`) of a
  proposal she did not verify against the committed files herself at the recorded commit; never
  `executeQueued()` with a hand-set gas limit unless the runbook's § Gas numbers for that chain are in
  the handoff § For Denizen and he has said to send it. 4b and 4c are the Product Owner's.
- **No mainnet.** Ops is one address on every chain; nothing in this task is proposed, signed or sent on
  chain 1 or any chain other than 11155111 and 84532.
- Fixing the dapp bundle. If step 1's build is wrong, stop; a bundle change is a new upload. ~~Ruling #190
  before upload is the exception, and it is the Product Owner's, not the engineer's (step 6a).~~ #190 is
  ruled (2026-11-16): this upload keeps the committed bundle; the featured distribution is
  [#193](https://github.com/dnznlabs/rake/issues/193)'s upload, not this one's.

## Open questions

~~None. Decision 44 rules the mechanism; the route is (a) because Denizen has stated he holds all
three Ops signers ([#178](https://github.com/dnznlabs/rake/issues/178), 2026-11-08). If a signer is
unreachable on the day, route (b) is already in the runbook and the engineer waits the hour.~~

Since 2026-11-16: the route is settled (RUNBOOK 4a–4d, #191, reshaped into three proposals by decision 47
the same day), and the one ruling upstream of step 7 closed the same day. None open.

1. ~~**Which `FEATURED_SALT` does the public testnet bundle feature?**~~ **Ruled 2026-11-16**
   ([#190](https://github.com/dnznlabs/rake/issues/190), closed): the dev-seed salt ships in this upload; the
   featured panel is empty on both testnets until [#193](https://github.com/dnznlabs/rake/issues/193)
   (carried, m04: set the featured distribution and re-upload) lands. Denizen, Telegram 08:46 CST, verbatim
   in #190's closing comment. The question, its two options and the recommendation stand in #190 and in
   this task's `HANDOFF.md` § Open questions 2; the ruling took the recommendation.
   - **Record:** #190's closing comment (2026-11-16) and `ROADMAP.md` § Decisions; the follow-up is #193.

## Context

- Decision 44 and M04-D4: `ROADMAP.md` § Decisions, [#178](https://github.com/dnznlabs/rake/issues/178).
- `RUNBOOK.md` § Step 4, § Executed on testnets (m04-t03), § 1e (Sepolia's gas), § 1g (`ETH_RPC_URL`).
- m04-t03 `HANDOFF.md` § For t04 (the empty `html()` reading) and § Gates.
- `src/App.sol:111-168` (the `onlyOwner` setters, `_requireChunk`); `scripts/forge/Chunks.s.sol`.
- Handbook `docs/multisig-transactions.md` § How a transaction moves, § Doing it as a human, § Review
  checklist; `src-company/multisig` `src/mods/TimelockExecutor.sol:35-46` and `src/Multisig.sol:85-100,134-160` at `62eb905`.
- Since the second revision of 2026-11-16: decision 47 (`ROADMAP.md` § Decisions); [#188](https://github.com/dnznlabs/rake/issues/188)
  (carried, widened 2026-11-16 with the proposal-size cap and its measurement); `RUNBOOK.md` § Step 4 as
  amended with this revision (4a's three-proposal table, 4b's two checklists, 4c's order, § The five calls'
  `batch345.hex` and the deletion of `batch.hex`, § Gas's three limits per chain).
- Since 2026-11-16: `RUNBOOK.md` § Step 4 (4a–4d, § Gas) at `a1c1896`; [#191](https://github.com/dnznlabs/rake/pull/191)
  and its review (live reads 2026-11-16 01:53Z); [#190](https://github.com/dnznlabs/rake/issues/190) (ruled
  and closed 2026-11-16) and its follow-up [#193](https://github.com/dnznlabs/rake/issues/193) (carried, m04);
  this task's `HANDOFF.md` (steps 1–7 of the 2026-11-08 plan, the gas table, the pointers); handbook
  `docs/multisig-transactions.md` § Doing it as an agent, § Review checklist.
