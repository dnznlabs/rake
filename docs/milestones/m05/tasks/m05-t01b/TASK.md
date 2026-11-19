# m05-t01b — Reader-verifiable self-review additions: threat model, coverage floor, mutation

Milestone: [M05](../../MILESTONE.md) · Phase: 1 — Same bytes everywhere (beside m05-t01; a gate on
m05-t02)

When this is done, a reader of the public repo can check three things about the review of record
(decision 55) that today they have to take on trust: **what the review assumed** —
`docs/THREAT_MODEL.md` names every actor, token class and chain, and every assumption names the
test that holds it, a name `forge test --list` returns; **what the tests reach** — the
`forge coverage --ir-minimum` summary for `src/` is in `SECURITY.md` and CI fails one point under
it; and **whether the assertions bite** — a `slither-mutate` campaign over `src/` with `forge test`
as the oracle is committed under `audits/mutation/`, and every mutant the suite did not catch has
either a new test or a one-line reason. These are (a), (b) and (c) of option 2 on
[#262](https://github.com/dnznlabs/rake/issues/262), ruled 2026-11-19 — decision 56. The bytecode
attestation, (d), is m05-t02's; SMTChecker, (e), is dropped. Nothing under `src/` moves: a survivor
that turns out to be a real defect is an issue and a stop, not a fix.

**Gate — a plan choice for Denizen, accepted by merging this file.** M05's gate is M04's close-out
(`MILESTONE.md` § Gate), and that gate exists because Phase 2 spends ETH at a permanent address.
This task touches no chain, no `src/` byte and no `app/`, and everything it produces is read by
m05-t02 before Base's first transaction. **Recommended:** it starts on this file's merge, beside
m05-t01 and before M04 closes, so its day-and-a-half of calendar is not added to the mainnet path.
**Alternative, rejected:** hold it behind M04's close-out as every other M05 task is — costs that
calendar for no safety, since the one way it could affect M04 is a `fix`-grade finding, which stops
M04 the same way whether found now or later. If the recommended order is not wanted, the issue's
gate line says so and nothing else changes.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, Slither `0.11.5`,
both already in `devbox.json` — **no new package**; `slither-mutate` ships inside
`slither-analyzer@0.11.5`, measured). Branch `m05/t01b-self-review` from `origin/main` at or after
`78b5eb7`. Check hooks: `ls .git/hooks | grep -v sample` prints `pre-commit` and `post-commit`.
**Measured baseline** — Elanik (engineer), 2026-11-19, `78b5eb7`, through the devbox pin, posted on
[#262](https://github.com/dnznlabs/rake/issues/262#issuecomment-7002043948): `forge test` exit 0,
107 passed, 32 s; `forge coverage --ir-minimum` exit 1, 83 passed / 22 failed, 105 enumerated, 4 of
7 suites failed, 47 s. The architect reproduced both the same day on the same commit (exit 0 / 107 /
12 s; exit 1 / 83 + 22 / 105 / 46 s) and measured the rest of the figures below on this host.
**Re-run rather than quote**, and record what the re-run returns beside each.

0. **Baseline.** `forge test` → 107 passed (`SECURITY.md:438` still says 102; the five are
   `test/ColdStipend.t.sol`'s four and `DistributionTest`'s 57th, and that sentence is amended in
   step 4). `node --test test/*.test.mjs` count recorded. `git status --porcelain` empty.
   `grep -rli 'slither-mutate' SECURITY.md README.md AGENTS.md audits/README.md` → nothing;
   `test -e docs/THREAT_MODEL.md` → 1. Record the commit.

1. **The threat model — `docs/THREAT_MODEL.md`, new.** No template exists for it in the handbook;
   the shape is the one Pashov's solo reports open with (a § Threat Model with § Privileged Roles &
   Actors, read in `solo/md/MoleculeVesting-security-review.md`), widened to the three axes
   decision 55 named. Four sections:

   - **§ Actors.** One row each: the owner (an EOA or a vault — decisions 50, 51); a table row
     (`Beneficiary`, including a contract that reverts, one that burns the stipend, one that
     re-enters, one that is the distribution itself); a payer (wallet `call`, contract `transfer`
     cold and warm — F7, #18); a stranger calling `distribute`, `release`, `claim` or `cancel`;
     the factory and its `create` sender (decision 10's salt prefix, decision 32's Creator key);
     `App`'s owner and `lock()`. Columns: what the actor can do, what it cannot, what it can
     lose, the document that says so (decision, F-row, overview section), and **the test** —
     one name per row from `forge test --list`, e.g. `test_nonOwnerCannotProposeOrCancel`,
     `test_strangerCannotCancelUnexpired`, `test_reentrantRecipientIsEscrowed`,
     `test_selfRowRecycles`, `test_saltFrontRunningRejected`, `test_onlyOwner`,
     `invariant_ownerOrNobody`. A row with no test is written with `none —` and the reason, and
     is the open list at the end of the file.
   - **§ Token classes.** ETH; plain ERC-20; `false`-returning and no-return (USDT-style,
     `test_usdtStyleNoReturnToken`); hook tokens (F8, decision 36,
     `test_hookRecipientStarvesLaterRows`, `test_hookTokenDistributeIsLocked`); fee-on-transfer and
     rebasing — **excluded by decision 23**, with #19's consequence (`reserved` above balance
     reverts `distribute`) stated as the assumption and `invariant_balanceCoversReserved` named as
     the property that holds *because* the class is excluded; NFTs (`test_nftTransferReverts`,
     `test_nftViaTransferFromPhantomEscrow`); ERC-1363 (decision 28, out).
   - **§ Chains.** The six of `RUNBOOK.md` § 1 and the stretch two, with the chain-level
     assumptions the contract makes: `TSTORE` for the transient lock (Cancun, `foundry.toml`
     `evm_version`), the deterministic deployer at `0x4e59b448…`, 200 ms blocks on the OP Stack
     chains (the timelock is `block.timestamp`, `invariant_noActionOutsideWindow`), the OP
     `LegacyERC20ETH` alias (#127), and the gas-cost assumptions behind `PUSH_GAS`
     (`src/Distribution.sol:59`; `test_receiveMinimaAreUnderPushGas`,
     `test_realPathPaysASafeAndAVaultClone`). Each row names what would falsify it on a new chain.
   - **§ Checklist diff.** Two inputs, both public and both pinned by commit in the section's
     first lines: the Solodit checklist (`Cyfrin/audit-checklist`, `checklist.json` on `main`,
     370 items under 62 category labels, fetched 2026-11-19), and two Pashov reports from
     `pashov/audits` at `master`. **The corpus holds no fee-splitter report**: a search of all
     613 paths on 2026-11-19 for split, fee, distribut, royalt, revenue, payout, vest, stream,
     treasur, dividend, payment, escrow, timelock, claim and airdrop returned four —
     `solo/md/TokenDistributor-security-review.md` (ETH in, tokens out to a table of
     recipients, an owner Safe; the nearest shape), `solo/md/MoleculeVesting-security-review.md`
     (owner-revocable schedules under a timelock-like cliff; carries the § Threat Model shape),
     `solo/md/yHairVesting-security-review.md` and `team/md/LayerZeroZROClaim-security-review.md`
     (Merkle claim). Use the first two; if the engineer finds a closer pair, name it and say why.
     The diff is a table: one row per checklist category or report finding that applies to a
     contract that pushes ETH and ERC-20 to an owner-set table through a timelock — at least
     Payment, Timelock, Reentrancy Attack, Denial-Of-Service, Griefing Attack, Fungible : ERC20,
     Access Control, Centralization Risk, Low Level, Initialization — with the item id
     (`SOL-…`) or report finding id, rake's disposition (`held by test <name>`, `design —
     decision <n>`, `F<n>`, `not applicable —` with why, or **`open`**), and nothing else. An
     `open` row is a finding of this task and goes to the handoff's § Discoveries, not to `src/`.

   Check: every backticked `test_`, `testFuzz_` or `invariant_` name in the file is one
   `forge test --list` prints (the script in criterion 1); the open list and the `open` rows are
   counted in the handoff.

2. **The coverage floor — `make coverage`, a floor script, a CI step.**

   **The measurement that shapes this step (Elanik's finding on #262, reproduced):** `forge
   coverage` does not run clean on `main`. The paired control is `forge test` at the same commit,
   exit 0 with 107 passed, so the instrumentation is the variable: `--ir-minimum` recompiles at
   minimal optimisation and coverage inserts counters, so gas changes by construction, and this
   suite asserts measured gas frames on purpose (the 2,300-gas stipend behaviour the dapp warns
   about). `--optimize true --optimizer-runs 1000` is accepted and ignored by 1.7.1 (measured: the
   same exit, counts and rows). **22 of the 107 tests fail under that binary**:
   `test_hookRecipientStarvesLaterRows`'s 95,226,000 bisect, `ColdStipendTest`'s two measured
   frames (`test_coldReceiveFitsTheMeasuredFrame`,
   `test_receiveUnderStipendPassesOnceImplementationIsWarm`), `PushGasTest`'s
   `test_realPathPaysASafeAndAVaultClone`, all three of `TableCapTest` — its `setUp` reverts, so
   coverage prints one failure line for the suite and **enumerates 105 tests, not 107** — and
   eighteen `DistributionTest` cases, sixteen `test_` and two `testFuzz_`
   (`testFuzz_claimMovesExactlyEscrow`, `testFuzz_roundingNeverExceedsAmount`), every one a bare
   `EvmError: Revert` (the per-test cause is not diagnosed here; membership is decided by the
   reproduction, not by an explanation). The same 22, by name, fail under
   `FOUNDRY_OPTIMIZER=false forge test` with no coverage involved (exit 1, 83 + 22, 105
   enumerated; name sets diffed, identical) — **that is the test for membership of the exclusion
   list**, and a test that passes with the optimizer off is not excluded whatever else it does.
   `forge coverage --ir-minimum --report summary` as it stands: exit 1, 46 s, and — because the
   failing tests still ran their lines up to the revert — `src/App.sol` 92.41 % lines / 92.31 %
   branches, `src/Distribution.sol` 90.16 % / 92.11 %.

   **Recommendation: exclude the gas-frame tests from the coverage run by a named pattern and
   floor the measured subset.** The floor measures line and branch coverage of `src/` over the
   named subset; **a floor expressed as a test count is out** — coverage and `forge test`
   enumerate different populations (105 vs 107 above), so a count compares two things. Measured
   with the 21 names and the one path excluded: exit 0, 44 s, **83 tests run (107 − 21 − 3)**,
   `src/App.sol` **92.41 % lines (73/79), 92.31 % branches (12/13)**, `src/Distribution.sol`
   **89.62 % lines (164/183), 89.47 % branches (34/38)**, funcs 100 % on both. The `Total` row
   (68.85 %) counts `test/` and `lib/` and is not the figure; the two `src/` rows are. The cost of
   this choice is stated in `SECURITY.md`: the lines those 21 tests alone reach are reported
   uncovered (one line and one branch of `Distribution` at `78b5eb7`, by the two runs' difference),
   and a new gas-pinning test joins the list in its own PR or the gate goes red.
   **Alternative, rejected: accept the failing run and read the report.** The rows print
   either way and are a point higher, but a gate that passes on exit 1 cannot distinguish "22
   gas-frame failures" from "22 failures of any kind", so it would have to parse the failure list
   for the expected names — the same list, maintained in a worse place — and CI would carry a
   step that is always red. If Denizen prefers it, the script changes shape and the floors are the
   unexcluded rows; nothing else in the task moves.

   - `mk/10-forge.mk` gains, after `slither:` (`:42`), a `coverage:` target (add it to `.PHONY`,
     `:19`) that runs `bash scripts/coverage-floor.sh`. The script: `forge coverage --ir-minimum
     --report summary --no-match-test "$SKIP" --no-match-path 'test/TableCap.t.sol'`, tees the
     output, parses the two `src/` rows, and exits non-zero when any of the four figures (lines
     and branches, per file) is under its floor. `SKIP` is the 21 test names as one regex of the
     form `^(name|name|…)\(` — **the `\(` is load-bearing**: `--no-match-test` matches the
     signature, and `^(…)$` matched nothing (measured: 104 ran, 21 failed, exit 1) — built in the
     script from a list with the one-word reason beside each name (`gas-pin`), so the list is read
     where it bites; `TableCapTest` is excluded by path because its `setUp` is what reverts.
     **Floors, from the measured figures rounded down and one point under:** `App` lines **91**,
     branches **91**; `Distribution` lines **88**, branches **88**. Re-measure first; if the re-run
     differs, the floors follow it and the handoff says so. Statements and funcs are printed, not
     gated.
   - `.github/workflows/ci.yml` gains a `coverage` step **after `gas snapshot` (`:73`) and before
     `slither` (`:83`)**: coverage compiles with its own settings into `out/`, so anything that
     reads `out/` after it pays a rebuild — the same reason Slither is ordered last, and Slither
     rebuilds anyway. Measured wall here 42–49 s; CI's figure goes in the handoff.
   - `SECURITY.md` gains **§ Coverage** after § Invariants the suite holds (`:436`) and before
     § What the review did not cover (`:612`): the command, the commit, the two `src/` rows as
     measured, the floors, the sentence that `--ir-minimum`'s source map is "relatively accurate"
     by forge's own help and the numbers are approximate to the line, the 21 excluded tests and
     the one excluded suite with the reason and the `FOUNDRY_OPTIMIZER=false` reproduction, and
     Elanik's finding credited by name with the #262 comment link. The uncovered lines (19 in
     `Distribution`, 6 in `App` at `78b5eb7`, in the excluded run) are listed by line with one phrase each — these are
     where step 3's survivors are expected first.

   Check: `devbox run -- make coverage` exits 0 on the branch and prints the table; with `App`'s
   line floor set to 99 in a scratch copy of the script it exits non-zero naming the row — print
   both. Every name in `SKIP` fails under `FOUNDRY_OPTIMIZER=false forge test --match-test <name>`
   and the count equals the measured count.

3. **The mutation campaign — `make mutate`, results committed, survivors triaged.**

   `slither-mutate` is in the pinned Slither and works on this tree: a bounded run (`src/App.sol`,
   `--contract-names App --target-functions 'chunkCount()' --mutators-to-run CR`, test command
   `forge test --match-path test/App.t.sol`) finished in 4 s with one mutant, caught. **Two things
   it taught:** the tool reports counts on stdout and writes a mutated source file only for an
   *uncaught* mutant into `--output-dir` (the all-caught run wrote nothing), so the stdout log is
   the record and the directory is the survivor list; and its `--timeout` defaults to 30 s per
   test run while `forge test` takes 14–27 s wall here with the invariant suite dominating, so
   the timeout is set explicitly or a slow mutant is scored as a timeout rather than caught.

   - `mk/10-forge.mk` gains a `mutate:` target: `slither-mutate src --test-cmd 'forge test'
     --contract-names Distribution,DistributionFactory,App --timeout 300 --output-dir
     audits/mutation/$(git rev-parse --short HEAD) -v 2>&1 | tee
     audits/mutation/$(git rev-parse --short HEAD)/campaign.log` — one directory per commit,
     log and survivors together. Not a CI step: the oracle is the whole suite at 14–27 s and the
     tool runs it once per compiling mutant, so the campaign is **estimated at hours** (the
     count of mutants is unmeasured until the first run; record it). **Rejected:** a narrower
     oracle (`--no-match-path 'test/invariant/*'`) to make it CI-sized — it would score the
     invariants as absent, and the invariants are the check whose strength this task is
     measuring. A nightly workflow is a later decision if the number says the run is short
     enough; say what the number was.
   - Run it once on the branch with `src/` byte-identical to `main`. The log's first lines are
     written by hand before the run: commit, command, Slither and forge versions, host, and
     afterwards the wall time and the **mutation score** — caught over compiling, per contract
     and overall, in the tool's own words (`N caught of M`), with the uncaught count beside it.
   - **Every uncaught mutant gets one of two things**, recorded in `SECURITY.md` **§ Mutation**
     (after § Coverage), one row per survivor — mutator, file:line, the mutation as the log
     prints it, and either `test <name>` (a new test in `test/` that fails on the mutant and
     passes on `main`'s source, proved by re-running that mutant file through the new test) or a
     one-line reason from a fixed set: `equivalent` (the mutant computes the same thing),
     `unreachable` (the line cannot execute under the constructor or `init` invariants, named),
     `gas-only` (the mutation changes gas and nothing observable — only for lines whose gas is
     pinned by one of the 22 tests, which the campaign's oracle does include, so expect few),
     `design` (the behaviour the mutant removes is not promised — name the document). The row
     count equals the uncaught count, stated as the denominator in the section's first line. The
     survivors on the lines of #54 and #22 — `propose` validating nothing (`:220`) and the
     factory's collision refusal — are the ones to read first; if either survives, say so in the
     handoff's first paragraph.
   - **A survivor that is a real defect** — the suite was silent and the behaviour it hides is
     one a document promises — is not fixed. Write the mutant and the promise in the handoff
     under § Stop, open an issue labelled `decision`, and the PR ships the campaign with that row
     marked `open — #<n>`. A `src/` byte reopens M03 and is Denizen's (MILESTONE § Out of scope).
   - New tests change `.gas-snapshot`: regenerate with `forge snapshot` after `forge clean`, in
     this PR, and state the new row count. Fuzz rows are not pinned by the snapshot; if a new
     test is a `testFuzz_`, say so.

   Check: `ls audits/mutation/<short-sha>/campaign.log` exists and its header names the commit;
   `grep -c '^|' <§ Mutation table>` equals the log's uncaught count; each new test's name is in
   the log's row and in `forge test --list`.

4. **The records that carry the figures.**
   - `audits/README.md` § Provenance (`:184-196`): the block template gains two lines,
     `coverage floor    <App lines/branches · Distribution lines/branches, from scripts/coverage-floor.sh>`
     and `mutation score    <caught of compiling, from audits/mutation/<sha>/campaign.log>`, with
     the sentence that both are read from the tree at the run's commit, never typed. The block is
     generated by `scripts/audit.sh:306-321`; the two `printf` lines are added there so the next
     `make audit` writes them (that is #262's Record line, and the script is the only writer).
     Verify by running the provenance section alone if the script allows it, else by reading the
     diff; a full `make audit` is **not** run in this task.
   - `SECURITY.md`: a one-paragraph **§ Threat model** pointer before § Findings — disposition
     (`:123`) naming the file and its open list; § Coverage and § Mutation as above; `:438`'s
     "102 tests in six suites" amended to the baseline count and seven suites.
   - `AGENTS.md` § Contracts and the dev chain: three facts — `make coverage` and why 22 tests are
     excluded (with the `FOUNDRY_OPTIMIZER=false` membership test); `make mutate`, that it is not
     CI, that the directory is the survivor list; and that a new `test/` assertion pinning gas
     joins the exclusion list in the same PR or `make coverage` goes red.
   - `README.md` is unchanged: its `AUDIT` cell already points at `SECURITY.md`, which now carries
     the figures.

5. **`HANDOFF.md`** from the template beside this file: one AC row per criterion below with the
   measured figure beside the plan's; § Deviations; § Discoveries carrying every `open` row of the
   checklist diff and every `none —` actor row; § Stop if it applies, else the line "no survivor
   is a defect".

## Acceptance criteria

Every command from the repo root through `devbox run --`; greps are case-insensitive and each
states its `main` baseline at `78b5eb7`.

1. **Every assumption names a test that exists.**
   `grep -oE '(test_|testFuzz_|invariant_)[A-Za-z0-9_]+' docs/THREAT_MODEL.md | sort -u > /tmp/named; forge test --list | grep -oE '(test_|testFuzz_|invariant_)[A-Za-z0-9_]+' | sort -u > /tmp/have; comm -23 /tmp/named /tmp/have`
   prints nothing, and `wc -l < /tmp/named` is at least 20. Baseline: the file does not exist on
   `main` (`test -e docs/THREAT_MODEL.md` → 1). The same pipeline run over this `TASK.md` prints
   nothing for its twenty names (checked 2026-11-19).
2. **The four sections and the checklist diff are there.** `grep -c -i '^## ' docs/THREAT_MODEL.md`
   → 4 or more; `grep -c -i 'SOL-' docs/THREAT_MODEL.md` → 10 or more; the file's § Checklist diff
   names the `Cyfrin/audit-checklist` commit and the two `pashov/audits` report paths with the
   corpus commit; `grep -c -i '| open' docs/THREAT_MODEL.md` is stated in the handoff (0 is a
   result, not a requirement).
3. **The floor holds and bites.** `devbox run -- make coverage` → exit 0, its `Ran N test suites`
   line reports **0 failed** and a total equal to `forge test --list`'s count minus the exclusions
   (83 at `78b5eb7`: 107 − 21 − 3), and the two `src/` rows are printed; with one floor raised
   above its measured figure in a scratch copy of `scripts/coverage-floor.sh`, the same command
   exits non-zero naming the row — both runs in the handoff. The floors are line and branch
   percentages of the two `src/` rows; no criterion in this task gates on a test count. Baseline:
   `make coverage` → `No rule to make target 'coverage'` on `main`.
4. **The exclusion list is exactly the optimizer-off failures, with its denominator.** The
   pattern matches only the gas-frame tests:
   `forge test --list | grep -E '^\s+(test|invariant)' | sed -E 's/^\s+//' | grep -cE "^(<the SKIP names>)$"`
   → the list's length (21 at `78b5eb7`; `--list` prints bare names, so the script's trailing `\(`
   is dropped here), `forge test --list --match-path test/TableCap.t.sol` → 3 names, and both
   figures are stated beside the 83 of criterion 3. For every name in `SKIP`,
   `FOUNDRY_OPTIMIZER=false forge test --match-test <name>` fails and `forge test --match-test
   <name>` passes;
   `FOUNDRY_OPTIMIZER=false forge test 2>&1 | grep -E '^\[FAIL' | sed -E 's/^\[FAIL.*\] ([A-Za-z0-9_]+)\(.*/\1/' | sort -u`
   (unique names — forge prints each failure twice, per suite and in the summary, so a bare
   `grep -c` double-counts: 48 lines for 22 failures at `78b5eb7`) equals the `SKIP` names plus
   `setUp`, and is identical to the same pipeline over `forge coverage --ir-minimum` with no
   exclusions. Measured at `78b5eb7`: 22 failing, 83 passing, 105 enumerated, under both.
5. **CI runs it in the right place.** `.github/workflows/ci.yml` has a `coverage` step after
   `gas snapshot` and before `slither`, with the ordering reason in a comment; the run on the
   branch head is green and the step's log prints the two `src/` rows. Baseline:
   `grep -c -i 'coverage' .github/workflows/ci.yml` → 0 on `main`.
6. **The campaign is committed and its header is complete.** `ls audits/mutation/*/campaign.log`
   lists one file whose first ten lines name the commit (`git rev-parse --short HEAD` of the
   branch with `src/` unchanged), the command, `slither --version` → `0.11.5`,
   `forge --version` → `1.7.1-dev`, the wall time and the mutation score `N caught of M`
   per contract and overall. Baseline: `ls audits/mutation` → no such directory on `main`.
7. **Every survivor has a row.** `awk '/^## Mutation/,/^## What the review did not cover/' SECURITY.md | grep -cE '^\| [A-Z]{2,4} \|'`
   (the mutator code opens each row; the header does not match) equals the log's uncaught total; every row's last cell is `test <name>` or one of
   `equivalent`, `unreachable`, `gas-only`, `design`, `open — #<n>`; `grep -c -i 'open — #' SECURITY.md`
   is stated. Baseline: `grep -c -i 'slither-mutate' SECURITY.md` → 0 on `main`.
8. **Each new test kills its mutant and nothing else changed under `src/`.** For every `test <name>`
   row: the test passes on the branch, and fails with the survivor's mutated file copied over the
   source in a scratch worktree (both shown for at least one, named for all).
   `git diff --stat origin/main -- src/` prints nothing; if a row is `open — #<n>`, the issue
   exists, is labelled `decision`, and the handoff's § Stop names it.
9. **The suite and the snapshot.** `forge test` passes with the new count stated (107 plus the new
   tests at `78b5eb7`); `forge snapshot --check` → 0 after regeneration with the new row count
   stated; `node --test test/*.test.mjs` unchanged from step 0; `make fmt` → 0; `make slither` → 0;
   `git status --porcelain` empty after `make coverage && make slither && forge test`.
10. **The records.** `grep -c -i 'coverage floor' audits/README.md scripts/audit.sh` → at least 1
    each (baseline 0 and 0); `grep -c -i '^## Threat model\|^## Coverage\|^## Mutation' SECURITY.md`
    → 3 (baseline 0); `grep -c -i 'make coverage\|make mutate' AGENTS.md` → at least 2 (baseline
    0); `grep -c '102 tests' SECURITY.md` → 0 (baseline 1, `:438`).
11. **The PR.** Closes this task's issue; `Carries forward:` lists an issue for every `open`
    checklist row and every `none —` actor row the handoff carries, or `none` with the reason; no
    file outside the scope list below changed.

## Out of scope

- **Any `src/` byte.** A survivor or an `open` row that is a defect is a `decision` issue and a
  stop. The compiler pin, `.gas-snapshot` rows other than the new tests', and `foundry.toml`'s
  profile are M05 § Out of scope.
- **(d), the deployed-bytecode attestation** (`deployments/<chainId>.json` and a scheduled compare)
  — m05-t02's, after the salts are re-mined, so the first attestation is of the real bytes.
- **(e), SMTChecker** — dropped by decision 56.
- **`forge test --mutate`** (Foundry ≥ 1.8, no fail threshold) — the successor when devbox moves
  off `foundry@1.7.1`; the pinned binary has no such flag.
- **Echidna, Medusa, a third agent leg, a planted-bug grading** — on the shelf until the mutation
  score says the invariants are the weak point; the handoff's figure is the input to that decision.
- **A `SECURITY.md` § Reporting or bounty paragraph.** There is no such section today and no payout
  to describe; a policy paragraph is its own small PR when Denizen wants one.
- **Coverage of `app/`** (`node --test`), and any `app/` change.
- **Re-running `make audit`.** The provenance block gains two fields for the *next* run; this task
  does not run one.
- **Widening `slither.config.json`** or re-triaging Slither — m04-t06's gate stands as is.

## Open questions

None. The one plan choice — starting before M04 closes — is stated under Gate with its alternative,
and is accepted or declined by the merge of this file and the issue's gate line.

## Context

- Decision 56 (ruled on [#262](https://github.com/dnznlabs/rake/issues/262), option 2) and decision
  55 (`ROADMAP.md` § Decisions) — the review of record and what it rests on.
- `SECURITY.md` § Static analysis — disposition (`:186`), § Invariants the suite holds (`:436`),
  § What the review did not cover (`:612`); `audits/README.md` § Provenance (`:184`);
  `audits/KNOWN_ANSWER.md` for #54 and #22, the two shapes six legs missed and the survivors to read
  first.
- m04-t06 (`docs/milestones/m04/tasks/m04-t06/`) and m04-t07 (`…/m04-t07/`) — the shape of a
  tooling task here: measure, gate, disposition every result, no `src/` byte.
- Solodit checklist: `https://github.com/Cyfrin/audit-checklist` (`checklist.json`); Pashov corpus:
  `https://github.com/pashov/audits` (`solo/md/`, `team/md/`). Both reachable 2026-11-19 (HTTP 200).
- `slither-mutate --help` and `--list-mutators` (15 mutators) on the pinned 0.11.5; forge
  `coverage --help` for `--ir-minimum`, `--no-match-test`, `--no-match-path`.
