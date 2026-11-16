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

When this is done, `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` serves the shipping bundle on
Sepolia (11155111) and Base Sepolia (84532): `html()` is that chain's `dapp-nodev` build and
`widget()` is `app/dist/widget.js`, hash-equal both ways, uploaded by the Ops vault — the owner — ~~through
`TimelockExecutor.forward()` on signatures Denizen produces~~ through one `batch` proposal per chain that the
engineer proposes and the Product Owner co-signs, queued for the vault's 3,600 s and then executed
(RUNBOOK § Step 4, 4a–4d, since #191), and `RUNBOOK.md` § Step 4 describes that
procedure instead of a `forge script` the engineer cannot run (decision 44, [#178](https://github.com/dnznlabs/rake/issues/178)).
~~The engineer prepares and verifies; Denizen signs; nothing here needs a key the engineer does not hold.~~
The engineer prepares, proposes with one signature and verifies; the Product Owner reviews, adds the second
signature and submits; the engineer's key is an Ops owner on both testnets since 2026-11-16 and signs the
proposal only.

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

~~9. **`HANDOFF.md`** from the handbook template: AC table, § Gates (step 0), the hashes, the pointers,~~
   ~~the estimates, § For Denizen — step 4, § Deviations (each naming its runbook hunk), § For t04 with~~
   ~~both gateway URLs and the hashes t04 measures against.~~

**Steps 6a–9 since 2026-11-16, against RUNBOOK § Step 4 (4a–4d) at `a1c1896`.** Steps 1–6 are merged
(#187, #191). Variables as RUNBOOK § 0; `$ENGINEER` = `0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`
(handbook README roster). Every command through `devbox run --`, every chain read with an explicit
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
   2 and 3 and a duplicate `addOwner` at 4. He clears them in the dapp so the live `batch` proposal is
   the only open row at its nonce and 4b cannot pick up the wrong one. Check: his message saying the
   rows are gone, quoted in the handoff § Gates with its date; nothing for the engineer to run.

7. **= RUNBOOK 4a — gates, regenerate, propose with one signature, record, stop.** Per chain:
   - Gates, read and recorded with the time: `cast call $OWNER "isOwner(address)(bool)" $ENGINEER` →
     `true`; `"threshold()(uint16)"` → `2`; `"nonce()(uint32)"` → the live vault nonce *N* (3 on both
     chains at 2026-11-16 14:39Z; it moves if anything lands); `cast nonce $APP` → `1`. Any other value
     is a stop and a message to the architect.
   - `make dapp-nodev CHAIN_ID=$CHAIN_ID`, then `node tools/step4-calldata.mjs --chain $CHAIN_ID`;
     `git diff --stat -- docs/milestones/m04/tasks/m04-t08/calldata/` must be **empty**, or the committed
     `batch.hex` is stale and this stops.
   - Propose `calldata/$CHAIN_ID/batch.hex` to the vault — target `$OWNER`, value `0`, nonce *N* — with
     **her signature and no other**, by handbook `docs/multisig-transactions.md` § Doing it as an agent,
     steps 1–3: digest = `cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' $OWNER 0 $(cat batch.hex) N`;
     `cast wallet sign --no-hash --account <keystore> <digest>`, verified with `cast wallet verify --no-hash`;
     `POST /proposals` with a description naming this step, the chain and the commit `batch.hex` was
     generated at. The description is unsigned and 4b does not read it.
   - `record:` in the handoff and RUNBOOK § Step 4's `record:` line: the nonce, the digest, the commit.
   - **Then stop.** Steps 4b (review, second signature) and 4c (submit, wait, `executeQueued`) are the
     Product Owner's. The engineer adds no second signature, submits nothing, and does not
     `executeQueued` on her own initiative.
   Check: on each chain the dapp shows **one** proposal at nonce *N*, target `$OWNER`, value 0, data
   `batch.hex`, with exactly one signature (`$ENGINEER`'s), and its digest equals the `cast call` above.

8. **= RUNBOOK 4d — after `executeQueued` lands, verify from the chain.** Per chain, once the Product
   Owner reports both transaction hashes: `cast nonce $APP` → **4**; `make dapp-nodev CHAIN_ID=$CHAIN_ID`
   then `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID` — `inflated sha256` equals
   `sha256sum app/dist/index.html`, `widget sha256` equals `sha256sum app/dist/widget.js`, byte counts
   equal both ways (the handoff's § The bundle figures, re-measured not quoted); `cast call $APP
   "chunks(uint256)(address)" 0|1` and `"widgetChunks(uint256)(address)" 0` equal § The pointers;
   `cast receipt <hash> --field gasUsed` for **both** the submit (`execute()`) and the `executeQueued()`
   transaction. Fill step 4's `record:` rows in RUNBOOK § Executed on testnets: pointers, both hashes,
   both `gasUsed`, the two sha256s and byte counts. Check: M04 criterion 3's chain half, per chain, in
   the handoff AC table with the commands and figures.

9. **`HANDOFF.md` § For Denizen rewritten as the 4b checklist and the gas budget**, one block per chain,
   replacing the five-row signing tables (keep them struck as the record). The block is what he runs
   against a checkout of the commit step 7 recorded, before his signature:
   1. target is `$OWNER` (`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`), **not** `$APP`; value `0`;
   2. `sha256sum` of the proposal's data equals `sha256sum docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/batch.hex`
      (Sepolia `d9cc558b…409f237`, Base Sepolia `9b16ccc6…ca0fd6e` at `a1c1896`, 109,962 hex chars each);
   3. `cast decode-calldata "batch(address[],uint256[],bytes[])" $(cat batch.hex)` → five targets all
      `$APP`, five values all `0`, five `bytes` equal to `1-addChunk-0.hex` … `5-setWidgetChunks.hex`
      in order;
   4. the nonce is the live `nonce()` and the digest equals `getTransactionHash($OWNER, 0, batch.hex, nonce)`
      (at nonce 3: Sepolia `0xc65454f8…abbcf`, Base Sepolia `0x9d83f01f…78302`, read 2026-11-16 — recompute
      if the nonce moved);
   5. `batch` is a vault self-call: confirm it outside the chat that requested it (handbook § Review
      checklist), then sign, submit, wait 3,600 s, `executeQueued()`.
   And the **gas budget for `executeQueued`**, set by hand because a wallet's estimate through a public
   RPC may report a false `DeploymentFailed()`: **Sepolia 110,000,000** (RUNBOOK § Gas; the three live call
   estimates in the handoff § Gas, 37,859,277 + 33,740,257 + 13,140,215 = 84,739,749, plus the setters
   and the batch loop — publicnode estimated the whole batch at 84,773,222 on 2026-11-16 — under the
   200,000,000 block limit); **Base Sepolia: the handoff's three estimates 5,343,761 + 4,767,004 +
   1,883,560 = 11,994,325 plus the setters (71,317 + 42,719 on the fork) plus the same margin, stated as a
   figure under the 120,000,000 block limit** — re-estimate with `cast estimate --from $OWNER $OWNER $(cat batch.hex)`
   on the day and write the number. Running out of gas reverts the whole batch and leaves it queued, so it
   can be re-sent with more. Check: the block is complete enough that he types nothing but the checklist
   commands and his wallet's confirmations.

## Acceptance criteria

Amended 2026-11-16 for the batch route. Struck criteria are the 2026-11-08 text; the one that follows
each replaces it. Every figure is read at the review head, not quoted from here.

- M04 criterion 3's chain half, both chains: `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID`
  `inflated sha256` = `sha256sum app/dist/index.html` of that chain's `dapp-nodev` build at the PR head,
  `widget sha256` = `sha256sum app/dist/widget.js`, byte counts both ways; `cast nonce $APP --rpc-url "$RPC"`
  → `4`; `cast call $APP "chunks(uint256)(address)" 0|1` and `"widgetChunks(uint256)(address)" 0` equal
  the committed predictions. (Unchanged in substance; claimable only after 4c lands.)
- The five committed calldata files **and `batch.hex`** per chain regenerate byte-identical from the tool
  at the PR head (`sha256sum -c`, and `git diff --stat -- docs/milestones/m04/tasks/m04-t08/calldata/` empty
  after `node tools/step4-calldata.mjs --chain $CHAIN_ID`); files 1–3's `bytes` concatenate to the payload
  and the widget (`cmp` exit 0); files 4–5 decode to the pointers; `cast decode-calldata
  "batch(address[],uint256[],bytes[])" $(cat batch.hex)` gives five `$APP` targets, five `0` values and the
  five files' bytes in order.
- ~~Every upload transaction hash and `gasUsed` from `cast receipt`; the five node estimates and block gas
  limit per chain recorded beside them; step 4's `record:` rows filled in RUNBOOK § Executed on testnets,
  which route was used stated.~~
  **The engineer's step-7 criterion, per chain:** a proposal exists in the dapp at the vault's live
  `nonce()` (`cast call $OWNER "nonce()(uint32)" --rpc-url "$RPC"`, 3 on both chains at 2026-11-16 14:39Z)
  with target `$OWNER`, value `0`, data byte-equal to the committed `batch.hex`, **exactly one signature,
  `0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`'s**, and a digest equal to
  `cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' $OWNER 0 $(cat docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/batch.hex) <nonce> --rpc-url "$RPC"`
  (at nonce 3: Sepolia `0xc65454f8a8109bf6d337fa7b9eaa40d6f7bd8cc14b658434ae8deba6b1eabbcf`, Base Sepolia
  `0x9d83f01fa5f2112252749d6a6bc62b4e6d8ec63d941f0d4624b26a63e7378302`); the nonce, digest and generating
  commit in the handoff and in RUNBOOK § Step 4's `record:`. **After 4c:** the submit and `executeQueued`
  transaction hashes and `cast receipt <hash> --field gasUsed` for both, per chain, in step 4's `record:`
  rows in RUNBOOK § Executed on testnets, with the route stated as 4a–4d.
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
route is now a `batch` self-call with the engineer's signature on it.

- Any `src/` byte, `lock()`, `setVersion`, any ownership change~~, any vault self-call (`batch`
  included — five plain calls, by ruling)~~. **The one vault self-call in scope is `batch` over the five
  step-4 calls, as committed in `calldata/$CHAIN_ID/batch.hex`; no other vault action of any kind —
  no `addOwner`, `removeOwner`, `setThreshold`, `setDelay`, `setExecutor`, `delegateCall`, `enableForward`,
  no `cancelQueued`, no proposal with any other target or data.**
- Step 6 (Denizen's, the Creator key); the gateway and host page (t04); the UAT (t05).
- ~~Signing anything: the engineer holds no Ops key and asks for none. Submitting `forward()` itself is
  also not the engineer's unless Denizen hands over the three signatures and says so explicitly.~~
  **The engineer's signature is on the `batch` proposal only (RUNBOOK 4a), one per chain.** Never a
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

Since 2026-11-16: the route is settled (RUNBOOK 4a–4d, #191), and the one ruling upstream of step 7
closed the same day. None open.

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
- Since 2026-11-16: `RUNBOOK.md` § Step 4 (4a–4d, § Gas) at `a1c1896`; [#191](https://github.com/dnznlabs/rake/pull/191)
  and its review (live reads 2026-11-16 01:53Z); [#190](https://github.com/dnznlabs/rake/issues/190) (ruled
  and closed 2026-11-16) and its follow-up [#193](https://github.com/dnznlabs/rake/issues/193) (carried, m04);
  this task's `HANDOFF.md` (steps 1–7 of the 2026-11-08 plan, the gas table, the pointers); handbook
  `docs/multisig-transactions.md` § Doing it as an agent, § Review checklist.
