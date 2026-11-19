# m05-t01 — Re-mine, amend, redeploy

Milestone: [M05](../../MILESTONE.md) · Phase: 1 — Same bytes everywhere

When this is done, `RUNBOOK.md` § 0 carries two salts mined against the init-code hashes `main`
builds today, every deviation M04 met is folded into the runbook as procedure rather than as a note
([#207](https://github.com/dnznlabs/rake/issues/207),
[#251](https://github.com/dnznlabs/rake/issues/251),
[#188](https://github.com/dnznlabs/rake/issues/188),
[#197](https://github.com/dnznlabs/rake/issues/197), criterion 6's stop rule, step 6's values), and
Sepolia (11155111) and Base Sepolia (84532) carry `DistributionFactory`, its implementation, `App`
and DNZN's fund distribution at the four addresses the four mainnets will carry — the M04 set stays
live and is marked superseded. It runs in two halves with two PRs: the mining and the runbook
amendment are docs-and-scripts work that needs no chain and may start when this plan merges; the
redeploy is Run A, Run B and step 6 again on both testnets and waits for M04's close-out. Nothing
under `src/`, `test/*.t.sol`, `.gas-snapshot` or `foundry.toml`'s compiler pin moves; if a step here
needs one of those bytes, stop — that reopens M03.

**The premise, measured at `78b5eb7` on 2026-11-19 (forge `1.7.1-dev`, solc `0.8.38`), by step 1f's
own commands.** The factory's init-code hash is
`0x9778c35879aa3214905a41c9519ae6c704dc5d00333806ac56ed6e7fbd2d8945` and `App`'s (with `OWNER` the
Ops vault and `APP_VERSION` `v0.1`) is `0xa8bbb83700d29d4b2e4b871c680f31165f42c0eb9234071a7948ce79f9fe33a3`;
`RUNBOOK.md:109-110` records `0xd8a1208a…bc31cc5` and `0x0b2894a3…f7b9864a`. Through the § 0 salts at
`main`'s hashes `cast create2` gives `0x27Bdf2fF14506a89eeE064c9EB4E10d1ee186Eb8` and
`0xb4aE538d9d8390577D2C823c9cfA85D51f7fF8a7` — neither carries its prefix, which is what
`RUNBOOK.md:116` predicted. M05-D1 is not ruled as an issue (no `decision` issue carries it); the
milestone's default, option (1), applies and this plan runs on it.

## Gate

**M04's close-out must merge before any transaction in Part B is sent.** M05's milestone gate
(`MILESTONE.md:16-26`): m04-t05's figures, #227's ship-or-close ruling, the post-UAT `app/` task
and `docs/milestones/m04/CLOSEOUT.md` all land first, because the bundle Part B uploads is the one
the mainnets get. **Part A has no chain in it and starts on this plan's merge** — mining, the runbook
amendment, the tool change and the anvil rehearsal read nothing that M04's remaining tasks can
change. Part B also waits for Part A's PR to merge: Part B deploys from the salts Part A commits.

**Step 14 has its own gate inside Part B: m04-t15's, m04-t16's and m04-t17's task PRs merged to
`main`.** The post-UAT `app/` bundle (#243, #241, R9, R19, R18, then #273 and #274, then the
settings page of decision 61) takes no Run C on the M04 `App`; it rides this task's Run B on the
redeployed testnets ([m04-t15 TASK.md](../../../m04/tasks/m04-t15/TASK.md) § The upload, its
criterion 12; [m04-t16 TASK.md](../../../m04/tasks/m04-t16/TASK.md) § The upload, its criterion 9;
m04-t17's TASK.md, scoped separately). So the bundle step 14 builds is the one m04-t17 shipped on
top of m04-t16 and m04-t15, and the hashes it uploads are the ones m04-t17's handoff § For the next
upload records. Run A (step 13) does not wait on any of the three — nothing in Run A reads `app/`.
If any is not merged when steps 12–13 are done, step 14 waits; the handoff says so, and nothing is
built or proposed from an older `app/` in the meantime.

Measured 2026-11-19 at `78b5eb7`; re-run rather than quote: `forge test` **107 passed**;
`node --test test/*.test.mjs` **167 pass**; `grep -c '' .gas-snapshot` **107**; `git status
--porcelain` empty after `forge build`.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, node `v24.12.0`
from `devbox.lock`), in bash. Branch `m05/t01-remine` from `origin/main` at or after `78b5eb7` for
Part A; Part B branches again from `main` after Part A merges. Check hooks with `ls .git/hooks |
grep -v sample` → `pre-commit`, `post-commit`. Multi-command checks go in a script file outside the
repo and run as `devbox run -- bash <file>`; never `devbox run -- bash -c` with a pipe. **Line
numbers below are `main` at `78b5eb7`**; trust names over numbers. Every chain read carries an
explicit `--rpc-url "$RPC"` and begins with `cast chain-id` (`RUNBOOK.md:393-397`). Scratch stays
outside the repo.

### Part A — the salts and the runbook, no chain

0. **Baselines, before any edit.** Recompute the two init-code hashes exactly as `RUNBOOK.md:340-343`
   does, with `OWNER` and `APP_VERSION` from § 0, and record them with the commit; expect the two
   hashes above or stop — a different pair means the bytes moved again after this plan was written,
   and the plan is stale before step 1. Record `forge test`, `node --test`, `grep -c '' .gas-snapshot`
   and `forge build --force` with 0 `warning[` and 0 `Warning (` lines (`RUNBOOK.md:261-265`).

   Check: four figures and two hashes in the handoff, with the commit they were read at.

1. **Mine the two salts, each once** — decision 37's run with its 2026-11-07 prefixes, the
   m03-t10 commands (`docs/milestones/m03/tasks/m03-t10/TASK.md:91-95`) against step 0's hashes:

   ```sh
   PROXY=0x4e59b44847b379578588920cA78FbF26c0B4956C
   cast create2 --deployer $PROXY --init-code-hash <factory hash> --starts-with 00d1
   cast create2 --deployer $PROXY --init-code-hash <App hash>     --starts-with 00a9
   ```

   m03-t10's handoff reports its two runs took 1.608 ms and 3.459 ms; a run that takes minutes is
   mining against the wrong input. Put the salts on `RUNBOOK.md:69-70`, replace the two hashes on
   `:109-110` with step 0's, amend `:107-108` ("mined once, in m03-t10") to say mined again here
   against the 0.8.38 bytes with this task named, and **delete the stale block at `:116`** — the
   record of why lives in `ROADMAP.md` decision M05-D1 and #202, linked from the salts paragraph,
   not restated. Rewrite `:118-126` so DNZN's predicted address is the one `predict($DNZN_SALT)`
   answers on step 5's anvil (below), not `0x6aC98EDA…`, and so its sentence names decision 54.

   Check: both salts read back out of § 0 (not from the mining output) recompute through
   `cast create2 --deployer $PROXY --salt $FACTORY_SALT --init-code-hash <factory hash> | tail -1`
   to `0x00d1…` and the `App` equivalent to `0x00a9…`; `grep -ci 'stale since' RUNBOOK.md` → 0
   (today 1); `grep -c 0x6aC98EDA RUNBOOK.md` → 0 (today 4 — every hit is the old prediction, and
   `:1562` and the two § Record rows become the superseded record Part B rewrites; strike them with
   the date rather than deleting).

2. **#251 — § 0's `SIGNER` becomes two forms.** On the pinned toolchain `cast send --help` and
   `forge create --help` contain `--sender` **0** times and `forge script --help` **2** times
   (measured 2026-11-19); `cast send` takes `--from`. Replace `RUNBOOK.md:66` with two exported
   variables and one sentence saying which commands take which:

   ```sh
   export SIGNER="--account <keystore> --password-file <file> --sender <address>"   # forge script only
   export SENDER="--account <keystore> --password-file <file> --from <address>"     # cast send, forge create
   ```

   Steps 2 and 3 keep `$SIGNER` (`:402`, `:441`); step 6's `cast send` (`:1028-1031`) takes
   `$SENDER` and its paragraph at `:1037-1040`, which already explains the trap, shrinks to a
   pointer at § 0. `--unlocked` stays an anvil-only comment. Nothing else in the file spells signer
   flags out: `grep -n -- '--account' RUNBOOK.md` lists every site to check.

   Check: `grep -c '^export SENDER=' RUNBOOK.md` → 1 (today 0); `grep -c 'unexpected argument' RUNBOOK.md`
   → 1 (today 1, the explanatory paragraph, kept once).

3. **#207 — the Sourcify read-back asserts.** Replace the loop at `RUNBOOK.md:983-985` with one
   that exits non-zero on any address whose `match` is not `exact_match`:

   ```sh
   for a in $FACTORY $IMPL $APP; do
     m=$(curl -s "https://sourcify.dev/server/v2/contract/$CHAIN_ID/$a" | jq -r .match)
     printf '%s %s\n' "$a" "$m"
     [ "$m" = exact_match ] || { echo "sourcify: $a is $m, not exact_match"; exit 1; }
   done
   ```

   Rehearse it **before** it is written in, per the handbook's `docs/contract-verification.md`
   § Sourcify: run the loop against one address that is not verified on Sourcify (the predicted
   `FACTORY` of step 1, which has no code yet, answers `null`) and quote the non-zero exit; then
   against the three M04 Sepolia addresses (`exact_match` ×3, exit 0). State in the step that the
   loop is the gate and the operator's eye is not, and that `env -u ETHERSCAN_API_KEY` stays on the
   three verify commands for the reason `:968-970` gives.

   Check: `grep -c 'not exact_match' RUNBOOK.md` → 1 (today 0); the two rehearsal outputs in the
   handoff with their exit codes.

4. **#188 — the per-chain chunk gas term, read keylessly.** Two readings per chain of § 1, no key,
   no wei, as step 1e already takes the first:

   ```sh
   INIT=$(forge inspect DistributionFactory bytecode)
   cast estimate --rpc-url "$RPC" --create "$INIT"                       # the factory, step 1e
   # a full-size SSTORE2 chunk: 0x00 + 24,000 data bytes behind solady's 10-byte creation prefix
   DATA=$(cast calldata-decode 'addChunk(bytes)' "$(cat calldata/11155111/1-addChunk-0.hex)")
   BODY="00${DATA#0x}"; SZ=$(printf '%04x' $(( ${#BODY} / 2 )))
   cast estimate --rpc-url "$RPC" --create "0x61${SZ}80600a3d393df3${BODY}"
   cast block latest --rpc-url "$RPC" --field gasLimit
   ```

   The second instrument needs no `App` on the chain, which is what lets it run on the four
   mainnets before step 2; it reproduces the live `addChunk` figure to under 1% — measured
   2026-11-19 against § Uploads row 3's 37,760,229 on Sepolia: **37,435,995**. Read 2026-11-19, to
   be re-run and recorded in the table, labelled estimates:

   | chain | factory `--create` | 24,000-byte chunk `--create` | block `gasLimit` | chunk ÷ limit |
   |:--|--:|--:|--:|--:|
   | Ethereum (1) | 2,396,446 | 5,286,009 | 60,000,000 | 8.8% |
   | OP Mainnet (10) | 2,396,446 | 5,286,009 | 40,000,000 | 13.2% |
   | Base (8453) | 2,396,446 | 5,286,009 | 40,000,000 | 13.2% |
   | Arbitrum One (42161) | 2,408,065 | 5,331,725 | 1,125,899,906,842,624 (a placeholder field; the chain's documented per-transaction cap is what to record, read from its docs and cited) | — |
   | Sepolia (11155111) | 16,738,648 | 37,435,995 | 200,000,000 | 18.7% |
   | Base Sepolia (84532) | 2,396,446 | 5,286,009 | 120,000,000 | 4.4% |

   So Ethereum prices code deposit as Base Sepolia does, not as Sepolia does — the question
   `MILESTONE.md:231-233` left open is answered by this reading, and the 0.03 ETH ask there is
   generous rather than tight at today's base fee (0.12 gwei on 2026-11-19). Write the table beside
   § 1 (MegaETH and Robinhood Chain rows read the same way, or marked `no answer` with the error if
   the RPC refuses).

   **The condition the table holds under, written beside it, not only the date.** Each row holds
   while that chain prices code deposit at the rate measured on the date stated. The two estimates
   put Sepolia near 1,560 gas per byte and Ethereum, OP Mainnet, Base and Base Sepolia near 220
   (Elanik's derivation on #267, 2026-11-19: 37,435,995 ÷ 24,000 and 5,286,009 ÷ 24,000). The
   repricing is [EIP-8037, State Creation Gas Cost Increase](https://eips.ethereum.org/EIPS/eip-8037)
   (Standards Track Core, status **Last Call** on 2026-11-19): code deposit moves from 200 gas per
   byte to a state-gas price of 1,530 per byte, metered in its own dimension. Sepolia carries it and
   Ethereum does not yet, and Elanik's three-point slope measurement on #267 (2026-11-19 at
   `78b5eb7`, bodies of 6,001 / 18,001 / 24,001 bytes, two independent marginal slopes per chain)
   reads **218.0 gas per byte on Ethereum and 1,558.7 on Sepolia**, 7.15×, each the EIP's rate plus
   calldata and initcode-word cost — a per-byte price, not a fixed overhead. So the Sepolia
   row is read as the figure every other chain would show at Sepolia's rate: on Ethereum the same
   chunk would be 37,435,995 ÷ 60,000,000 = **62.4%** of the block, over the rule's half, and the
   rule would cut at **19,000 bytes** (29,640,000 gas, 49.4%), which changes the piece count, the
   committed `calldata/` and the proposal split. For proportion, the money holds either way: Run B
   measured 85,666,566 gas on Sepolia (§ Uploads row 3) and at 0.12 gwei that is ≈ 0.0103 ETH, and
   three full 24,000-byte pieces at Sepolia's rate, 112,307,985 gas, ≈ 0.0135 ETH — both inside the
   0.03 ETH ask; what moves is the block share and the chunk size, not the budget.

   State the rule once, in § Gas beside `:910-920`: **a chain's chunk size is 24,000 bytes while a
   full chunk estimates at or under both ceilings — half its block limit, and the per-transaction
   gas cap where the chain applies one; otherwise it is the largest multiple of 1,000 whose
   estimate does, and that chain's size is a column of this table. The rule is re-evaluated
   immediately before any mainnet cut, in the task that cuts it, against whichever ceiling binds
   that day: the chunk estimate is re-read on that chain on that day, and if the size it gives
   differs from the committed default, `--max-chunk` moves and the calldata and the proposal split
   are regenerated in that task before anything is proposed.** The second ceiling is
   [EIP-7825](https://eips.ethereum.org/EIPS/eip-7825)'s `TX_MAX_GAS_LIMIT` of 16,777,216 on a
   chain that carries 7825 without 8037's carve-out — 8037 applies that cap to execution gas only,
   so deposit metered as state gas sits outside it. That carve-out is why the six `executeQueued`
   of 2026-11-18 on Sepolia, at up to 37,493,327 gas each, were valid at all; on a chain with 7825
   and not 8037 they would have been invalid, not merely expensive. Today's mainnet chunk,
   5,286,009, is under both ceilings, so nothing in Part A moves on this. A re-run that records a
   new figure and leaves `--max-chunk` where Part A
   set it regenerates nothing; the rule changing its answer invalidates the committed calldata, and
   Part A's artifacts are fixed at Part A's merge while the mainnet cut is a later task.
   Today every chain passes at 24,000, so the per-chain size is 24,000 everywhere and the mechanism
   is what this step adds: `tools/step4-calldata.mjs` takes `--max-chunk <bytes>` defaulting to
   24,000 (`:54` becomes the default, and the usage line at `:64` names the flag), and
   `scripts/forge/Chunks.s.sol:13` reads `vm.envOr("MAX_CHUNK", uint256(24_000))` so the dev chain
   and the tool cut at the same number. Add a case to `test/step4-calldata.test.mjs` that a small
   `--max-chunk` changes the piece count (the tool prints it; `--app-nonce 1` and a fixture payload
   keep it off the chain), red with the flag ignored. The proposal cap of 32,768 bytes (`:915-918`)
   bounds the size from above whatever the table says; say so in the same sentence.

   Check: the table in `RUNBOOK.md` with eight rows, each figure dated, and the condition paragraph
   beside it; `grep -ci 'before any mainnet cut' RUNBOOK.md` → 1 (today 0), inside § Gas's rule;
   `grep -c -- '--max-chunk' tools/step4-calldata.mjs` ≥ 2 (today 0); `grep -c 'envOr("MAX_CHUNK"' scripts/forge/Chunks.s.sol`
   → 1 (today 0); `node tools/step4-calldata.mjs --chain 11155111 --app-nonce 7 --out <tmp>` with
   no flag regenerates `calldata/11155111/` byte-identical (`git status --porcelain` empty after
   copying over) — the default must not move a committed upload.

5. **Criterion 6 — the base-fee stop rule is in § 0, and the citation at `:1685` points at it.**
   `grep -n gwei RUNBOOK.md` hits `:1677`, `:1678` and `:1685` today; the last cites "the 20 gwei
   stop of step 0", which was m04-t03's plan (`docs/milestones/m04/tasks/m04-t03/TASK.md:56-57`)
   and is in no step of this file. Add to § 0, under the variables, one paragraph: before every
   send on a chain where ETH costs money, `cast base-fee --rpc-url "$RPC"`; **on Ethereum the stop
   is 1 gwei** (`MILESTONE.md:239-248`: 0.03 ETH covers Run A, Run B and step 6 to about that price
   at Sepolia's pricing, and the reading in step 4 says Ethereum prices under it); on the L2s the
   stop is the figure the deploy task's gate records, since their fees are three orders below. A
   fee above the stop for days is a top-up and a raised rule by the Product Owner's word, not a
   buffer in a hot key. Correct `:1685` to cite § 0's rule and say the testnets have no stop.

   Check: `grep -ci '20 gwei stop of step 0' RUNBOOK.md` → 0 (today 1); `grep -ci '1 gwei' RUNBOOK.md`
   ≥ 1 (today 0).

6. **§ 0's step-6 block, filled.** `RUNBOOK.md:1019-1021` says the M05 values "are M05's to fill".
   Fill them as § 0 exports, read from the Sepolia distribution and the decisions rather than typed
   from memory — `cast call 0x71a4221974Fc2E95081AE513248918dF27CF7a4A "snapshot()" --rpc-url
   <Sepolia>` for the table's names and notes (decision 50 records them: `treasury` "long-term
   growth, future projects", `ops` "infrastructure, services, tokens", `creator` "founding engineer,
   product vision"), `description()` for the string (**`DNZN // FUND DISTRIBUTION`**, decision 51;
   read 2026-11-19 — `:1714` still says `FEE`, which is the M04 record and stays struck, not
   edited):

   ```sh
   export DNZN_DESCRIPTION="DNZN // FUND DISTRIBUTION"
   export DNZN_TABLE='[(0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9,2000,"treasury","long-term growth, future projects"),(0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790,4000,"ops","infrastructure, services, tokens"),(0x357836fFcB45307FA7ff2A574F505753c961902B,4000,"creator","founding engineer, product vision")]'
   export DNZN_DELAY=604800        # mainnets, decision 50; 86400 on the two testnets, decision 42
   ```

   `OWNER` is already the Ops vault and is what step 6 passes (decision 50); the sender is the
   Creator key on every chain, testnets included (decision 54), with `$SENDER` from step 2. Add two
   read-backs after `:1033-1034`: `description()(string)` equal to `DNZN_DESCRIPTION` and
   `snapshot()` showing the three rows in ascending address order — `MILESTONE.md:91-92` names the
   first as missing. Rewrite `:1708-1717` (§ Step 6 is Denizen's) as the M04 record it is, struck
   with the date, with one sentence pointing at Part B's record below it.

   Check: `grep -c 'DNZN // FUND DISTRIBUTION' RUNBOOK.md` → 1 or more (today 0); the table string
   parses on step 8's anvil (`BadTable()` is `0x40da0647`, `:1042-1046`).

7. **The featured salt follows the Creator key.** `mk/15-seed.mk:10` sets `FEATURED_SALT_DNZN` to
   Denizen's EOA salt; decision 54 makes it the Creator salt
   `0x68e0741d8d693e14bf56914567eaddc130b186ee000000000000000000000001` (lowercase, as the file
   writes it), and the comment on `:6-8` says "created by `0x3578…902B`" — fix it to the Creator
   key. `test/build.test.mjs:284` and `:358` and `test/ext.test.mjs:219` carry the old salt as the
   build's value; move them to the Creator salt, and `ext.test.mjs`'s `predictLocal` expectation
   (`:221-227`) to the address step 8's anvil lands — it is a function of the new factory address,
   the implementation and the salt, all fixed by Part A. `build.test.mjs:282-285`'s
   `DISTRIBUTIONFACTORY` and `DISTRIBUTIONFACTORY_BLOCK` are Sepolia's deploy record and move in
   Part B, not here.

   Check: `grep -ci '0x357836ff' mk/15-seed.mk test/build.test.mjs test/ext.test.mjs` → 0 (today
   1, 2 and 1); `node --test test/*.test.mjs` all pass.

8. **One anvil lands them, with the real table.** `RUNBOOK.md` steps 1 through 3 and 6 on one anvil
   (`--chain-id 31337`, a port nobody holds — check `ss -ltn` first; kill by PID from `ss`, never by
   pattern), with § 0's values, the mined salts and step 6's exports, as m03-t10 step 4 did: the
   offline prediction of 1f before any transaction, `Deploy.s.sol`, `DeployApp.s.sol`, then the
   `create` from an anvil account standing in for the Creator key with a salt whose top 20 bytes
   are that account's (the real `DNZN_SALT` reverts `SaltDoesNotStartWith` from any other sender —
   say so). The landed `FACTORY` and `APP` equal the predictions and carry the prefixes; `owner()`
   on `App` and on the distribution is the Ops vault; `delay()`, `description()` and `snapshot()`
   read back the exports. Then compute DNZN's real address offline — `cast call $FACTORY
   "predict(bytes32)(address)" $DNZN_SALT` on this anvil, where the factory is at its real address
   — and write it where step 1 left the placeholder: § 0, `README.md` § Contracts (Part B fills the
   status rows), and the handoff § For close-out.

   Check: the four addresses (predicted and landed, factory and `App`), the distribution's address
   and `predict($DNZN_SALT)`, with transaction hashes, in the handoff; `cast estimate --create` of
   the factory on the anvil beside the table's cancun figure.

9. **#197 — `make setup` and the `libs` guard.** Port drop's `d50dbc9` into `mk/10-forge.mk`:
   `LIBS := lib/forge-std lib/solady`; a `setup` target running `git submodule update --init
   --recursive`; a `libs` target that checks each path non-empty and exits 1 with "Run 'make setup'
   first"; `serve`, `build`, `test` and `deploy` take `libs` as a prerequisite. Names and comments as
   drop has them. `AGENTS.md:48` and `README.md:91` say `make setup` in place of the bare submodule
   command. Verify both directions in a fresh worktree: empty `lib/` → `make build` exits non-zero
   and `lib/` stays empty; after `make setup`, `git submodule status` shows the pinned tags and
   `make build` passes. `.github/workflows/ci.yml` checks out with `submodules: recursive` and runs
   forge directly, so it is unaffected; say so in the handoff rather than editing it.

   Check: `grep -c '^setup:' mk/10-forge.mk` → 1 and `grep -c '^libs:' mk/10-forge.mk` → 1 (today
   0 and 0); `grep -c 'make setup' AGENTS.md README.md` → 1 each (today 0).

10. **The signing route's chain support, read and recorded.** The coordination service keeps one
    `wallets` row per chain per vault (`RUNBOOK.md:590-597`); read which of the six mainnets carry
    one for the Ops vault, address lowercased:
    `curl -s 'https://multisig-postgrest.onrender.com/wallets?address=eq.0x00c0e88778e3e3d17acaabc7550dec7ab61f3790&select=chain_id,owner_count'`.
    Record the chain ids beside the step-4 table of § 1. Whether the Product Owner's signing app
    lists each of the four mainnets is his reading, asked in the handoff's § For Denizen (below)
    and recorded there when answered; a chain without a row or without the app is a runbook change
    first — the on-chain `approve(digest, true)` route the handbook names
    (`docs/multisig-transactions.md:181`), which is unverified in source and is not improvised on
    deploy day (`MILESTONE.md:391-395`).

    Check: the `chain_id` list in the handoff with the date; the question to the Product Owner
    written in § For Denizen.

11. **Part A's PR.** `HANDOFF.md` beside this file: the AC table with every Part A row measured at
    the branch head, § For close-out with the two salts, the two hashes, the four addresses and
    DNZN's address, § For Denizen with step 10's question and nothing else yet. The PR body says
    `Closes #207, #188, #197, #251` — each fold is complete in this PR and the closing comment on
    each issue quotes the step's check — and **does not close this task's issue**: Part B does. It
    carries the `Merge:` line the review sets.

    Check: `gh pr view <n> --json closingIssuesReferences` lists exactly those four.

### Part B — the two testnets, after M04's close-out and Part A merge

Branch `m05/t01-redeploy` from `main`. **These transactions are public and permanent at the
addresses M05 uses on the mainnets**: a mistake at step 2 or 3 is a collision for ever on that chain
(#22), so the runbook predicts before it sends and reads `cast code` at every address first. Read
`RUNBOOK.md` § Not in this runbook and § 2 whole before the first command. Sepolia first, then Base
Sepolia; **every `record:` line is committed before the next transaction** (`:227-243`).

12. **Gates, per chain, before any transaction.** `cast chain-id` equals `$CHAIN_ID`; `cast code` at
    the new `FACTORY`, `APP` and `DISTRO` prints `0x` (code at any of them is the #22 branch of
    `:351-391`, identify before anything else); funding — read 2026-11-19: the engineer's key holds
    **0.2020 ETH** on Sepolia and **0.0348 ETH** on Base Sepolia, the Creator key **0.0100** on each,
    against Run A's measured 28,296,098 and 4,035,842 gas and Run B's 85,666,566 and 12,206,026
    (`RUNBOOK.md:1680`, § Uploads rows 3–4) at base fees of 15 wei and 0.005 gwei — ample, and
    re-read with the base fee in the handoff; `ETHERSCAN_API_KEY` present (never echoed; last four
    characters only); `isOwner($ENGINEER)` `true`, `threshold()` 2, and **`delay()` read, not
    assumed** — on 2026-11-19 the Ops vault answers **900** on both testnets, not the 3,600 the
    runbook's prose carries (`:475`, `:643-645`), while decision 58 records 3,600 on the mainnets;
    every "one hour" in Step 4 becomes "`delay()` seconds, read in 4c", and the testnet reading is
    recorded as a deviation for the Product Owner to confirm, not a stop.

    Check: the readings per chain in `HANDOFF.md` § Gates, dated, before the first send.

13. **Run A, steps 1 through 3 and 5, Sepolia then Base Sepolia.** Exactly as `RUNBOOK.md` § 2 at
    Part A's merge: 1a–1g in order, 1e's two estimates and the block limit recorded, 1f's
    prediction equal to Part A's addresses; step 2 with `FACTORY_SALT` and the immutable-span
    comparison (`:421-435`); step 3 with the three read-backs; step 5 with the asserting loop of
    step 3 and OpenChain's `Duplicated:` count. Hashes and `gasUsed` from `cast receipt <hash>
    gasUsed` (positional, `:1512-1514`), never from a broadcast log (#140). The broadcast logs under
    `broadcast/*/11155111/` and `broadcast/*/84532/` are committed with each step; `make dapp-nodev`
    reads the factory's block from them, so `test/build.test.mjs:282-285`'s Sepolia fixture moves
    to the new factory and block here.

    Check: on each chain `cast code $FACTORY` equals the artifact outside the three
    `immutableReferences` spans; `cmp` of `App`'s code against `forge inspect App deployedBytecode`
    equal; `owner()` the Ops vault, `version()` `v0.1`, `locked()` `false`; the Sourcify loop exits
    0 with three `exact_match`; `getsourcecode` names the three contracts.

14. **Run B 4a on both chains, then stop — gated on m04-t15's, m04-t16's and m04-t17's task PRs
    being on `main`.** Before the first `make`, `git merge-base --is-ancestor <m04-t17's merge
    commit> HEAD` exits 0 (m04-t17 branches after m04-t16's merge, which branches after m04-t15's,
    so one check covers all three) and the branch is cut from `main` at or after it; if any is not
    merged, this step waits, the handoff says so under § Gates with the date, and no bundle is built
    from an older `app/` — there is no fallback bundle (§ Gate). Then `make dapp-nodev
    CHAIN_ID=$CHAIN_ID`, and the `sha256` of `app/dist/index.html` and `app/dist/widget.js` per
    chain equal the figures in m04-t17's `HANDOFF.md` § For the next upload before anything else
    runs (a mismatch is a stop: either `app/` moved after m04-t17 or the build is not reproducible,
    and both are findings, not something to re-hash past). Then
    `tools/step4-calldata.mjs --chain $CHAIN_ID --rpc "$RPC" --out calldata` (`App` is fresh, so the
    tool reads nonce 1); every file under 65,536 characters; the fork estimate of § Gas
    (`:884-897`) with `chain-doc`'s `inflated sha256` equal to the build **before any signature**;
    three proposals per chain at the vault's live `nonce()`, one signature each, `p_threshold`
    included, read back through `tx_summary` (`:574-581`). Record the nonces, digests and the
    generating commit, then write the 4b checklist per chain in `HANDOFF.md` § For Denizen and
    stop. Commit and push before messaging.

    Check: m04-t15's, m04-t16's and m04-t17's merge commits named in § Gates and ancestors of the
    branch; the two `sha256` per chain equal m04-t17's handoff § For the next upload, quoted beside
    them; six rows read back,
    each with exactly one `ecdsa` signature from `$ENGINEER`; the commit of the calldata named in
    § Uploads' new rows (filled as "proposed" until 4c).

15. **Step 6's command, prepared beside the proposals.** For each chain, one complete `cast send`
    in § For Denizen, in the shape m04-t03's handoff § For Denizen — step 6 used: `$SENDER` spelled
    out for the Creator keystore, `$OWNER` the Ops vault, `DNZN_DELAY` **86400** on both testnets
    (decision 42, `MILESTONE.md:94-97`), the description and table of Part A step 6 verbatim, and
    the precheck `cast code $DISTRO --rpc-url "$RPC"` that must print `0x` first. It needs only the
    factory (step 2), so it can be signed in the same sitting as 4b. Nothing in this step is sent by
    the engineer.

    Check: two commands in § For Denizen that differ only in `RPC` and `CHAIN_ID`; `DISTRO` in
    each equals Part A's prediction.

16. **4c and 4d, after the Product Owner's sitting.** After the three co-signs and submits per
    chain and `delay()` seconds from the third submit: `executeQueued` 1 → 2 → batch, the content
    gate of `:701-706` read between pieces, estimate + 30% per send; then `chain-doc` and
    `gateway-check` against `https://<app, lowercase>.<chainId>.w3link.io` (`:770-780`) — a gateway
    mismatch is recorded and carried, never re-uploaded (`:782-789`). After the `create` lands:
    `cast call $DISTRO` `owner()`, `delay()`, `description()`, `snapshot()` and `cast codesize
    $DISTRO` → 45.

    Check: `inflated sha256` and `widget sha256` equal the build on both chains; `cast nonce $APP`
    → 4; the four distribution read-backs equal the exports; six `executeQueued` and two `create`
    receipts `status 1` with `gasUsed`, read from the chain.

17. **The records.** `RUNBOOK.md` § Executed on testnets gains a dated paragraph and two new
    § Record tables for this deploy (the M04 tables stay, headed superseded with the date and
    #202); § Uploads rows 5 and 6; § 0's four addresses and DNZN's confirmed against the chain.
    `README.md`: `:27` ("They have changed") rewritten as a one-sentence pointer at the superseded
    rows; § Contracts' three addresses become Part A's; § Deployment Status carries one live row per
    testnet with the new explorer and Sourcify links and one row per testnet marked
    **superseded, pre-#201 bytes** keeping the old links, as `RUNBOOK.md:44` requires; `:17`'s "No
    mainnet deployment exists" stays — that is m05-t02's line. A comment on
    [state-collection#74](https://github.com/dnznlabs/state-collection/issues/74) with the new
    predicted address, the chains where `cast codesize` is 45 today, and the sentence that its body's
    `0x6aC98EDA…` is superseded. Every deviation Part B met is a `RUNBOOK.md` change in this PR or
    a one-line reason it is not (M05 criterion 6).

    Check: `grep -ci 'superseded' README.md` ≥ 2 (today 0); `grep -c 0x00D18B5b README.md` → the
    superseded rows only (today 3); the comment URL in the handoff.

18. **Part B's PR.** `HANDOFF.md` completed: every Part B row, § Gates, § What it cost per key per
    chain (the Product Owner's submits and `create`s included, as § Uploads does), § For Denizen
    with what he signed and when, § Discoveries. The PR says `Closes #<this task's issue>`.

## For Denizen — one sitting per chain

Everything the Product Owner does in this task, so the handoff can ask for it in one message per
chain. Nothing here starts before step 14's proposals are read back and step 15's commands are in
the handoff.

- **Sepolia, one sitting:** sign the three proposals against the 4b checklist (`RUNBOOK.md:602-632`;
  proposal 3 is a vault self-call, confirmed outside the chat that asked), submit all three in nonce
  order (4c.1), then run step 15's `create` from the Creator keystore. Four signatures.
- **Base Sepolia, the same sitting or the next:** the same four.
- **Confirm or correct the Ops vault's testnet `delay()` of 900 s** (step 12) — a reading, not a
  decision; the deploy proceeds on whatever the chain answers.
- **Answer step 10:** which of Ethereum, OP Mainnet, Base and Arbitrum One the signing app lists
  for the Ops vault. Recorded in § 1's table; no transaction depends on it in this task.
- **Funding:** none asked. The engineer's key and the Creator key hold enough for both testnets at
  the base fees read 2026-11-19 (step 12); the handoff says so again with the day's reading, and
  asks only if a balance is under twice the figure.

## One-way doors

1. **The testnet address set moves.** Step 13 on Sepolia fixes `FACTORY`, `IMPL` and `APP` for every
   chain of § 1 — the same four the mainnets get (decision 5, M05-D1). The M04 set at `0x00D18B5b…`,
   `0x31dd18b4…`, `0x00A90943…` stays live, unowned on the factory's side and vault-owned on `App`'s,
   and is marked superseded; nothing here touches it.
2. **The Sepolia DNZN distribution's address changes, and the key behind it.** Decision 50's
   `0x71a4…7a4A` (Denizen's EOA, salt `0x3578…902B‖…0001`, read 2026-11-19: `owner()` that EOA,
   `delay()` 3,600) is superseded by decision 54: the new one is created by the Creator key at
   `CREATOR‖…0001` with the Ops vault as owner. The old stays live under the old factory; the dapp's
   featured panel (step 7) points at the new one from Part A's merge, so on the M04 `App` it reads
   empty until step 16 lands and on the new `App` from the first upload.
3. **`create` runs once per chain and never again on it** (#22, decision 10): the Creator key is the
   only sender that can reproduce the address on the next chain, so step 15's two sends are the
   first two of the six-plus that fix it everywhere.

## Acceptance criteria

Every figure is read at the review head through `devbox run --`; greps are `-i` unless the pattern is
an address. Baselines are `main` at `78b5eb7`, 2026-11-19.

1. **The salts are `main`'s.** `grep -ci 'stale since' RUNBOOK.md` → 0 (baseline 1). With § 0's two
   salts and step 1f's commands at the review head, `FACTORY` starts `0x00d1` and `APP` starts
   `0x00a9`, and the two init-code hashes § 0 quotes equal the ones 1f computes.
2. **Rehearsed.** The handoff's anvil table (step 8) shows predicted equal to landed for both
   contracts and `predict($DNZN_SALT)` equal to the landed distribution, with `owner()` the Ops vault
   on both and `description()` `DNZN // FUND DISTRIBUTION`.
3. **#251 folded.** `grep -c '^export SENDER=' RUNBOOK.md` → 1 (baseline 0); `grep -c '^export SIGNER='
   RUNBOOK.md` → 1; step 6's send carries `$SENDER`; the `forge script` sites carry `$SIGNER`.
4. **#207 folded.** `grep -c 'not exact_match' RUNBOOK.md` → 1 (baseline 0); the handoff shows the
   loop exiting non-zero on a `null` address and 0 on three `exact_match`.
5. **#188 folded by measurement.** The § 1 table has a row per chain of § 1 with both estimates and
   the block limit, dated, and the paragraph beside it stating the rate each row holds under and
   the Sepolia row's reading as the other chains' figure at that rate; `grep -ci 'before any
   mainnet cut' RUNBOOK.md` → 1 (baseline 0), in § Gas's sizing rule, with the regeneration of the
   calldata and the proposal split named in the same sentence; `grep -c -- '--max-chunk'
   tools/step4-calldata.mjs` ≥ 2 (baseline 0);
   `grep -c 'envOr("MAX_CHUNK"' scripts/forge/Chunks.s.sol` → 1 (baseline 0); the new test reds with
   the flag ignored (plant it, quote the red, revert); `--app-nonce 7` regenerates
   `calldata/11155111/` byte-identical with no flag.
6. **Criterion 6's rule.** `grep -ci '20 gwei stop of step 0' RUNBOOK.md` → 0 (baseline 1);
   `grep -ci '1 gwei' RUNBOOK.md` ≥ 1 (baseline 0), inside § 0.
7. **Step 6's values.** `grep -c 'DNZN // FUND DISTRIBUTION' RUNBOOK.md` ≥ 1 (baseline 0); § 0
   exports `DNZN_DESCRIPTION`, `DNZN_TABLE` and `DNZN_DELAY`; step 6 reads back `description()` and
   `snapshot()`.
8. **The featured salt.** `grep -ci 0x357836ff mk/15-seed.mk test/build.test.mjs test/ext.test.mjs`
   → 0 (baseline 1, 2, 1); `make dapp-nodev CHAIN_ID=11155111` then
   `grep -o '0x68e0741d[0-9a-f]*' app/dist/index.html | head -1` prints the Creator salt.
9. **#197 folded.** `grep -c '^setup:' mk/10-forge.mk` and `grep -c '^libs:' mk/10-forge.mk` → 1
   each (baseline 0); in a fresh worktree `make build` with empty `lib/` exits non-zero and leaves
   `lib/` empty, and passes after `make setup`; `grep -c 'make setup' AGENTS.md README.md` → 1 each.
10. **The signing route read.** The handoff lists the `chain_id`s the service holds for the Ops
    vault, dated, and § 1 carries them.
11. **Nothing reopened.** `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot foundry.toml`
    prints nothing; `forge test` 107 passed; `forge snapshot --check` exit 0; `node --test
    test/*.test.mjs` all pass (167 plus the new cases); `forge fmt --check` and `forge lint` clean;
    CI green on both PR heads.
12. **Part A's PR closes #207, #188, #197, #251 and not this task's issue** —
    `gh pr view <n> --json closingIssuesReferences` lists exactly those four; the task issue is
    open after its merge.
13. **M05 criterion 1 on both testnets** (`MILESTONE.md:56-65`): `cast code $FACTORY` equals the
    artifact outside the three spans; `implementation()` one address on both; `cmp` of `App`'s code
    equal; `owner()` the Ops vault, `locked()` `false`; every hash and `gasUsed` in the handoff from
    `cast receipt`.
14. **M05 criterion 2 on both testnets**: the asserting loop exits 0 with `exact_match` ×3 per chain;
    `getsourcecode` names the three contracts; OpenChain all `Duplicated:`.
15. **M05 criterion 3's chain half on both testnets**: `chain-doc`'s `inflated sha256` and `widget
    sha256` equal the build; `gateway-check` outcome recorded per chain; § Uploads rows 5 and 6.
16. **M05 criterion 4 on both testnets, with the testnet delay**: `cast codesize $DISTRO` → 45;
    `owner()` `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`; `delay()` 86400; `description()`
    `DNZN // FUND DISTRIBUTION`; `snapshot()` the three rows ascending, 2,000 / 4,000 / 4,000;
    `DISTRO` one address on both chains.
17. **The public record.** `grep -ci superseded README.md` ≥ 2 (baseline 0); § Contracts carries the
    new three addresses; `grep -ci 'No mainnet deployment' README.md` → 1 (unchanged);
    state-collection#74 carries the engineer's comment with the new address.
18. **The bundle is m04-t17's, on top of m04-t16's and m04-t15's.** The handoff § Gates names the
    three task PRs and their merge commits, and `git merge-base --is-ancestor <m04-t17's commit>
    <Part B's head>` exits 0; the `sha256` of `app/dist/index.html` and `app/dist/widget.js` per
    chain in the handoff equal the figures in m04-t17's handoff § For the next upload, and § Uploads
    rows 5 and 6 carry those hashes. No proposal of step 14 is dated before the last merge. If any
    was not merged when steps 12–13 were done, the handoff records the wait and its dates; a bundle
    built from an older `app/` fails this criterion whatever its hashes.
19. **Part B's PR closes this task's issue**, and `HANDOFF.md` has one row per criterion above —
    nineteen rows.

## Out of scope

- **Any byte under `src/`, `test/*.t.sol`, `.gas-snapshot`, or the compiler pin.** A finding that
  needs one stops the task and reopens M03 (`MILESTONE.md:126-131`).
- **The mainnets.** Nothing here sends to a chain where ETH costs money; the six-mainnet readings of
  step 4 are keyless `eth_estimateGas` calls.
- **A deploy to the M04 addresses, or any transaction to them.** They stay as they are.
- **`App.lock()`**, ownership changes, the old distribution's owner or table (§ Not in this runbook).
- **The threat model, coverage floor and mutation run** (decision 56): m05-t01b. **The bytecode
  attestation** `deployments/<chainId>.json`: m05-t02, by the same decision.
- **The mirror** (decision 59) and the `#/docs` chain list: m05-t04.
- **#127's per-chain alias re-run** on the testnets: both rows read `none` on 2026-11-08 and
  `MILESTONE.md:352` assigns the re-run to t02 and t03 on the mainnets; re-read here only if a
  testnet upgrade is announced between now and step 13, and say which.
- **Pruning the two unsigned Sepolia proposals** (`RUNBOOK.md:1473-1477`): the Product Owner's
  housekeeping, unchanged by this task.
- **`forge verify-contract` on the stretch chains**: m05-t05.

## Open questions

- **M05-D1, the stale salts and the testnet redeploy — running on the default.** *Question:* with
  `main`'s bytes no longer the bytes the salts were mined against, do the mainnets deploy at
  re-mined addresses with the two testnets redeployed to match? *Options, recommendation and
  record* as `MILESTONE.md:158-177` states them. *Default and deadline:* option (1) at the
  milestone's merge, which has passed; this plan runs on it, Part A under any option and Part B
  under (1). The `decision` issue the milestone promised for it has not been opened; the ruling, when
  given, is recorded in `ROADMAP.md` § Decisions amending decisions 32, 37 and 50's literals, and
  a ruling for option (2) before Part B starts retires steps 12–18 and leaves Part A as it stands.

## Context

- `MILESTONE.md` § Needs from the Product Owner (M05-D1 default, M05-D2 ruled as decision 54, the
  mainnet-ETH item), § One-way doors, § Risks 1 and 2; the m05-t01 row.
- `ROADMAP.md` decisions 32 (the Creator key), 37 (mined salts and their prefixes), 42 (the testnet
  table and delay), 50 (the mainnet distribution), 54 (the Creator key everywhere), 55 (no paid
  review), 58 (the Ops owner set).
- `RUNBOOK.md` whole, as `main` carries it at `78b5eb7`; § 0, step 1e–1g, Step 4, § Gas, Step 5,
  Step 6, § Executed on testnets.
- [#207](https://github.com/dnznlabs/rake/issues/207), [#251](https://github.com/dnznlabs/rake/issues/251),
  [#188](https://github.com/dnznlabs/rake/issues/188) (and its three comments),
  [#197](https://github.com/dnznlabs/rake/issues/197), [#202](https://github.com/dnznlabs/rake/pull/202),
  [#201](https://github.com/dnznlabs/rake/pull/201).
- [m03-t10 TASK.md](../../../m03/tasks/m03-t10/TASK.md) and [HANDOFF.md](../../../m03/tasks/m03-t10/HANDOFF.md):
  the mining run, its timings, the anvil that landed the salts.
- [m04-t03 TASK.md](../../../m04/tasks/m04-t03/TASK.md) and [HANDOFF.md](../../../m04/tasks/m04-t03/HANDOFF.md):
  Run A on the two testnets, § Gates, § For Denizen — step 6.
- [m04-t10 TASK.md](../../../m04/tasks/m04-t10/TASK.md) and [HANDOFF.md](../../../m04/tasks/m04-t10/HANDOFF.md):
  a routine Run B end to end, § What it cost.
- [m04-t15 TASK.md](../../../m04/tasks/m04-t15/TASK.md) § The upload and criterion 12
  ([#266](https://github.com/dnznlabs/rake/pull/266) scopes it): the post-UAT bundle rides step 14,
  and its handoff § For the next upload carries the hashes step 14 and criterion 18 check against.
- drop `d50dbc9` (`mk/10-forge.mk`, `AGENTS.md`, `README.md`): the `setup`/`libs` shape #197 names.
- handbook `docs/contract-verification.md` § Sourcify; `docs/multisig-transactions.md` § The DNZN
  Creator key, § Setting the key up for `cast`.
- [state-collection#74](https://github.com/dnznlabs/state-collection/issues/74).
