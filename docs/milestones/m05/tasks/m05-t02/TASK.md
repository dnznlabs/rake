# m05-t02 — The contracts on Base and Ethereum

Milestone: [M05](../../MILESTONE.md) · Phase: 2 — The contracts, on Base and Ethereum

`DistributionFactory`, its implementation and `App` at the § 0 addresses on Base and on Ethereum,
verified, attested, and DNZN's distribution created on each. No document is uploaded and nothing is
proposed to the vault: on both, `App` ends this task deployed and empty (decision 70).

**These transactions are public, permanent and paid for.** Order, fixed: **Base (8453), then
Ethereum (1)**. Base first because it is the cheap one and the sibling of the testnet the runbook
was rehearsed on; Ethereum second because it is the dearest place to meet a deviation and the chain
DNZN's own products are built on. No other chain is touched.

## Plan

Two parts and two PRs. Part A touches no chain where ETH costs money and merges before Part B sends
anything. Every command runs from the repository root through `devbox run --`, with an explicit
`--rpc-url "$RPC"` on every `cast` and `forge` call (`RUNBOOK.md` step 1g's last paragraph says
why).

### Part A — before any send

Branch `m05/t02-preflight` from `origin/main`. Baseline, measured on `1ad6caa` on 2026-11-22:
`forge test` prints **124 tests passed, 0 failed**.

1. **The gas-limit rule, as procedure, in `RUNBOOK.md` step 1e** (closes
   [#308](https://github.com/dnznlabs/rake/issues/308)). Replace "the broadcast needs the limit
   raised explicitly" with the rule below, each figure carrying its source from the m05-t01 handoff
   (§ Step 13, both chains):

   - `E` is the node's `cast estimate --rpc-url "$RPC" --create` for the init code being sent
     (`$INIT` for step 2, `$AINIT` for step 3), read on the day.
   - `P` is the `Estimated total gas used for script` line of a dry run, the same `forge script`
     command without `--broadcast`. `forge script -g` multiplies forge's own per-transaction
     estimate, which is `P ÷ 1.3`, not `P` (two pairs measured: 3,482,636 ÷ 1.3 = 2,678,951 and
     2,286,547 ÷ 1.3 = 1,758,883).
   - The limit to send is **2 × `E`**. So `G = ceil(100 × 2 × E ÷ (P ÷ 1.3))`, and the send is
     `forge script … --broadcast -g $G $SIGNER`. Never below 1.3 × `E`: the node's estimate was
     exceeded by the transaction on both Sepolia sends (by 58,514 and 99,321 gas).
   - The limit must be under half the chain's block `gasLimit` (§ 1's table; Arbitrum One's
     documented 32,000,000). If it is not, stop.
   - A submission the node refuses (`-32003: gas limit too high`, as on Base Sepolia) sends
     nothing and burns nothing. Recompute `G` for 1.5 × `E`, record the refusal, resubmit once. A
     second refusal is a stop.
   - `cast run` on a failed hash is not a post-mortem instrument for gas (handoff, Sepolia step 3).

   Check: `grep -n 'P ÷ 1.3' RUNBOOK.md` hits step 1e; the words "raised explicitly" are gone from
   it.

2. **`RUNBOOK.md` § 4a's address-set comparison stops** (closes
   [#359](https://github.com/dnznlabs/rake/issues/359)). Line 672 today ends in `|| echo …`. Give it
   the shape of step 5's Sourcify loop: print the message and `exit 1`. Check: in a subshell with
   `APP_IN` and `APP` set to two different addresses the line exits 1; set equal, it exits 0. Quote
   both runs in the handoff.

3. **The test [#293](https://github.com/dnznlabs/rake/issues/293) asks for.** One test in
   `test/Distribution.t.sol`: a hook token whose callback calls `snapshot()` and `beneficiaries()`
   during `distribute`, asserting what each returns in that frame. Then
   `docs/THREAT_MODEL.md:150` and `:180` read `held by test <name>` and the row leaves § Open list;
   if the values are the partially written ones, `SECURITY.md` says so beside F8. Regenerate
   `.gas-snapshot` as m05-t01b did (`forge clean`, then `forge snapshot`); only the new test's row
   may differ.

   **This is the one step that can stop the deploy.** If the test shows a document promising
   something the contract does not do, or anything whose remedy is under `src/`, stop, write the
   reading in the handoff and message the architect. Do not send anything in Part B.

   Check: `forge test --list` names the test; `forge test` prints 125 passed, 0 failed;
   `forge snapshot --check` exits 0; `git diff --stat origin/main -- src/ foundry.toml` prints
   nothing.

4. **The bytecode attestation** (decision 56 d), built against the two testnets so that it exists
   and has failed once before a mainnet needs it.

   - `deployments/<chainId>.json`, one per chain: the chain id, the commit the bytes were built
     from, and for the factory, the implementation and `App` their address and the keccak of
     `cast code` as read from the chain. Write `11155111.json` and `84532.json` now.
   - `make attest`: for every file in `deployments/`, read `cast code` at each address over that
     chain's § 1 RPC and compare it with `forge inspect <Contract> deployedBytecode`. `App` and the
     implementation are compared outright; the factory outside its three `immutableReferences`
     spans, each of which must hold the implementation's address (the comparison `RUNBOOK.md`
     step 2 writes out). Any difference, an address with no code, or an RPC that does not answer
     the expected chain id exits non-zero and names the chain and the contract.
   - `.github/workflows/attest.yml`: `make attest` weekly on a schedule and on
     `workflow_dispatch`, with the toolchain set up as `ci.yml` sets it up. Public RPCs only, no
     key, no secret.

   Check, both directions, quoted in the handoff: `make attest` exits 0 on the two testnet files;
   with one address in a scratch copy of a file replaced by an address holding no code it exits
   non-zero and names it; with the build at a commit whose `App` bytes differ (or one hex character
   of a saved artifact changed) it exits non-zero. One dispatched run of the workflow is green.

5. **PR 1**, from the template, `Refs` this task's issue, `Closes #308`, `Closes #359`,
   `Closes #293`. Handoff section "Part A" in `HANDOFF.md` beside this file. Request the
   architect's review. **Part B does not start until PR 1 is on `main`.**

### Part B — the two chains

Branch `m05/t02-mainnet-contracts` from `origin/main` after PR 1 merges. § 0's variables as written
there, `DNZN_DELAY=604800`. `RPC` per chain from `RUNBOOK.md` § 1's table.

6. **Gates, read and committed before the first send, dated, one table for the two chains.**
   Readings taken on 2026-11-22 (05:56Z) are beside each so a difference is visible; re-read every
   one.

   | gate | must read | read 2026-11-22, Base; Ethereum |
   |:--|:--|:--|
   | `cast chain-id` | the chain's id | 8453; 1 |
   | step 1f's prediction | `FACTORY` `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`, `APP` `0x00a9F390A6010d045e0d34856048DdD6910d25BA`, equal to § 0 | equal, at `1ad6caa` |
   | `cast code` at `FACTORY`, `APP`, the implementation `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` and `DISTRO` `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199` | `0x` at all four addresses, on both chains | `0x` at `FACTORY`, `APP`, `DISTRO` on both; the implementation not read |
   | step 1c, the proxy | 141 characters and § 1's keccak | 141 on both; keccak not re-read |
   | the native-balance check of § 1 | § 1's rows for Base and Ethereum reproduced | not re-read |
   | `cast estimate --create`, factory / `App` | recorded; it is `E` of step 1e | 2,396,446 / 1,666,007 on both |
   | block `gasLimit` | recorded | 40,000,000; 59,999,943 |
   | `cast base-fee` against the stop | under the stop below | 0.005 gwei; 0.117 gwei |
   | `cast balance $ENGINEER` | at least the two limits of step 1e times twice the base fee read | 0; 0.0051 ETH |
   | `ETHERSCAN_API_KEY` answers for the chain | the `getsourcecode` read of step 5 against any verified contract on that `chainid` answers `status` 1 | not read |

   **Stops, base fee, before every send:** Ethereum **1 gwei** (§ 0); Base **0.05 gwei**, this
   plan's figure, ten times the reading above. A stop defers a send; it does not widen a budget.

   **Funding** is the Product Owner's, asked in the action issue this task's issue links, and
   sized there as an estimate: 0.002 ETH on Base and 0.01 ETH more on Ethereum for the engineer's
   key. Re-size it from this table's readings before he is asked to send
   ([#279](https://github.com/dnznlabs/rake/issues/279)): if a chain's two limits at twice its base
   fee come to more than half the ask, say so on the action issue with the figure. A chain is not
   started until its balance gate reads true.

7. **Run A on Base**, `RUNBOOK.md` steps 1, 2, 3 and 5, in that order, with step 1e's rule from
   Part A. § 2's rule holds without exception: **each step's `record:` line is committed and pushed
   before the next transaction is sent**, broadcast logs included. Every hash and `gasUsed` is read
   with `cast receipt`. A failed or refused send is recorded by hash, or as refused, before any
   retry. Then:

   - the factory comparison outside its spans and `App`'s `cmp` (step 2), `owner()`, `version()`,
     `locked()` (step 3);
   - step 5 in full: three explorer verifications one at a time, three on Sourcify with the key
     unset, the asserting loop, and the OpenChain upload (expected all `Duplicated:`);
   - `deployments/8453.json` written from the chain, and `make attest` exiting 0 across every file;
   - `cast call $APP "chunkCount()(uint256)"` prints 0. Step 4 is not run.

8. **The stop before Ethereum.** Go on to Ethereum only if, on Base: no send failed or was
   refused; the logged `DistributionFactory` and `App` equalled step 1f's prediction; every
   read-back in steps 2 and 3 equalled its required value; the Sourcify loop exited 0. Anything
   else: commit the record, stop, and message the architect with the reading. Ethereum
   starts on the architect's reply.

9. **Ethereum**, as step 7 with `deployments/1.json`. `cast base-fee` under 1 gwei immediately
   before each of the two sends. Above it, wait; do not raise it.

10. **DNZN's `create`, prepared per chain, sent by the Product Owner** (step 6; the Creator key
    signs it and nobody else can, `src/Distribution.sol:459-467`). As each chain's step 5
    completes, write that chain's command into the handoff under "For the Product Owner" in the
    three forms the m05-t01 handoff used (§ For Denizen — step 15): the `cast send`, the explorer's
    Write Contract fields one by one with the warning about commas in `table_`, and the raw
    calldata last. Before writing it, on that chain: `predict($DNZN_SALT)` returns `DISTRO`;
    `cast code $DISTRO` is `0x`; a simulation from `$CREATOR` returns `DISTRO` and one from any
    other address reverts `0x0c4549ef`; the estimate from `$CREATOR` is recorded. Comment on the
    action issue for the creates when a chain is ready. After he sends one, read back `owner()`,
    `delay()` (604800), `description()` and `snapshot()` as step 6 lists them, and the code length
    (45 bytes), with the hash from `cast receipt`.

11. **The records.** `RUNBOOK.md` gains § Executed on mainnets beside § Executed on testnets: one
    § Record table per chain, the base fee paid at each send, what each key spent per chain, and
    every failed or refused attempt. Every deviation is a `RUNBOOK.md` change in this PR or one
    line in the handoff saying why not (M05 criterion 6). `README.md`: a row for Base and a row for Ethereum in
    § Contracts with explorer and Sourcify links, and the sentence at `:17` rewritten so that
    `grep -c -i 'No mainnet deployment' README.md` prints 0 and it says what is true: the
    contracts are on Base and Ethereum and the dapp's document is not yet uploaded to either.
    § 1's native-balance table carries this plan's step 6 readings for the two chains with their date.

12. **PR 2**, from the template, `Closes` this task's issue and
    `Refs #127`, which stays open for the chains not yet deployed. It opens when steps 7 to 9 and 11 are done on both chains. A `create` the
    Product Owner has not yet sent does not hold it: the handoff names each such chain as pending
    under the action issue, and its read-backs are added as a later commit. `HANDOFF.md` section
    "Part B". Request the architect's review and message the architect's session.

## Acceptance criteria

Part A, at PR 1's head:

- `forge test` prints 125 passed, 0 failed, and `forge test --list` names the #293 test;
  `forge snapshot --check` exits 0; `git diff --stat origin/main -- src/ foundry.toml` is empty.
- `docs/THREAT_MODEL.md`'s SOL-AM-ReentrancyAttack-1 row reads `held by test`, and § Open list no
  longer carries it.
- `RUNBOOK.md` step 1e states the rule of step 1; § 4a's comparison exits 1 on a mismatch.
- `make attest` exits 0 for the two testnets and non-zero in both tampered cases; the workflow has
  one green dispatched run. `make test` and CI are green.

Part B, at PR 2's head, on each of 8453 and 1:

- **M05 criterion 1.** `cast code $FACTORY` equals the artifact outside the three spans;
  `implementation()` is `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`; `App`'s `cmp` reports equal;
  `owner()` is the Ops vault, `version()` `v0.1`, `locked()` `false`.
- **M05 criterion 2.** The `getsourcecode` read names the three contracts; the Sourcify loop exits
  0 with three `exact_match` lines.
- **M05 criterion 4, without its `distribute`.** Where the `create` has landed: 45 bytes at
  `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`, `owner()` the Ops vault, `delay()` 604800,
  `description()` `DNZN // FUND DISTRIBUTION`, the three rows of decision 50. Where it has not,
  the handoff says so.
- **No document.** `cast call $APP "chunkCount()(uint256)"` prints 0, and no proposal was posted
  to the coordination service for either chain.
- **Attested.** `deployments/` holds four files, the two testnets and the two mainnets, and
  `make attest` exits 0.
- **Recorded.** § Executed on mainnets carries each chain's table with no blank hash in steps 2
  and 3; every hash in it answers `cast receipt` with the `gasUsed` written beside it; the handoff
  lists every failed or refused send and what each key spent per chain;
  `grep -c -i 'No mainnet deployment' README.md` prints 0.
- `make test` is green, `git status --porcelain` is empty after `forge build --force` and
  `forge test`, CI is green, and `git diff --stat origin/main -- src/ app/ foundry.toml` is empty.

## Out of scope

- **`RUNBOOK.md` Step 4, on any mainnet.** No `make dapp-nodev` for a mainnet, no calldata cut, no
  proposal, no signature asked of anyone. The documents are m05-t03's.
- **The gateway.** No chain is added to `deploy/gw44.json` here: `make get` answers 404 for an
  `App` with no document, and decision 69 treats a chain as live from its document.
- **`app/`**, including `ENABLED` and `NETWORKS`. It is frozen on `main` while the testnet upload
  is in flight (decision 71), and nothing here needs it.
- **Any byte under `src/` or `foundry.toml`'s compiler pin.** A finding that needs one stops the
  task (step 3).
- **`App.lock()`, any ownership change, the first deposit and `distribute` on Base.** The last is
  m05-t03's, with the Product Owner's signoff.
- **Any other chain.** OP Mainnet, Arbitrum One, Robinhood Chain and MegaETH are not deployed to
  in M05 (decision 70). No reading, estimate or funding for them belongs in this task.
- **A retry of a collision.** Code at a predicted address that is not ours is `RUNBOOK.md` step
  1g's stop, never a new salt.

## Open questions

None. The Product Owner's go for these sends is decision 70; his steps are the two action issues
this task's issue links (funding the two keys, and the two `create`s).

## Context

- `RUNBOOK.md` § 0, § 1, steps 1 to 3, 5 and 6, § Record.
- `docs/ROADMAP.md` decisions 5, 10, 32, 33, 37, 50, 54, 55, 56, 69, 70, 71.
- [`m05-t01/HANDOFF.md`](../m05-t01/HANDOFF.md) § Step 13 (both testnets' sends, the failed and
  the refused one), § For Denizen — step 15, and deviations 6 and 7.
- [#127](https://github.com/dnznlabs/rake/issues/127), [#279](https://github.com/dnznlabs/rake/issues/279),
  [#293](https://github.com/dnznlabs/rake/issues/293), [#308](https://github.com/dnznlabs/rake/issues/308),
  [#359](https://github.com/dnznlabs/rake/issues/359).
