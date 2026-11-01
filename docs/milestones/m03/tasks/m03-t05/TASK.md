# m03-t05 — The findings the review accepted

Milestone: [M03](../../MILESTONE.md) · Phase: 3 — The review

When this is done, the three contract findings t04 accepted are closed in `src/Distribution.sol`
with a test each that fails on `ede55c3` and passes on the branch: no configuration change can land
while a money path is running (F1), a handover or a renounce clears the queue it inherits (F2), and
`distribute` copies no return data from a failed ETH push (F6). The fourth, F8, is sized by a test
and ruled rather than built. The review then reads the final code again — both legs, on a blinded
tree, graded against a known answer that now carries the fixes — and `SECURITY.md` names *this*
PR's merge as the reviewed commit. t06's rehearsal addresses move with the bytecode, by design.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`). Branch
`m03/t05-findings` from `origin/main` at or after the merge of the PR that carries this file. Check
hooks with `ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`); do not run
`make init`. If the worktree is fresh, `git submodule update --init --recursive` first (#41). Line
numbers below are `src/Distribution.sol` at `ede55c3`, which is what `main` still carries under
`src/` — step 0 proves it.

0. **The code is where the review left it.** `git diff --stat ede55c3 origin/main -- src/` prints
   nothing. If it does not, stop: something under `src/` moved after the review and this plan is
   stale. Also record the three baselines the handoff compares against: `forge build --force` then
   the implementation's deployed bytecode (8,469 bytes at `ede55c3`, the factory 1,320), `forge
   test` (63 passed), `grep -c '' .gas-snapshot` (63).

1. **Refresh the audit runner to the fragment at `c12e188`.** The shared `forge-audit` fragment
   now carries what the 2026-10-30 run learned
   ([#119](https://github.com/dnznlabs/rake/issues/119)): staged harvests so leg 2 cannot read
   leg 1, transcripts kept under `audits/<date>/transcripts/`, the Claude leg in `stream-json`, the
   skill cloned to `~/.cache/forge-audit/` instead of linked into a project tree, the upstream
   version read by the runner, and `KNOWN_ANSWER_FILE` upstream. Run
   `bash ../shared/scripts/add.sh forge-audit --force` — `--force` is required: `add.sh` is
   copy-if-absent by default and every file this needs already exists. It overwrites
   `scripts/audit.sh`, `audits/README.md`, `audits/prompts/leg.md`, `audits/prompts/rollup.md`,
   `audits/SKILL_PIN`, `audits/SCOPE.example` and `mk/20-audit.mk`; it does not touch
   `audits/SCOPE` or `audits/KNOWN_ANSWER.md` (neither is in the fragment's `files/`), and its
   `append/` step adds nothing a second time. rake's one local change to `audit.sh`, the
   `KNOWN_ANSWER_FILE` override, is upstream now, so nothing is lost by the overwrite. Commit this
   on its own, before any `src/` change.

   Check: for each of the seven files, `diff ../shared/templates/forge-audit/files/<path> <path>`
   is empty; `git diff --stat -- audits/SCOPE audits/KNOWN_ANSWER.md` is empty;
   `grep -c 'fragment: forge-audit' AGENTS.md .gitignore` still prints 1 for each;
   `grep -c 'KNOWN_ANSWER_FILE' scripts/audit.sh` ≥ 1.

2. **F1 — no configuration change lands while a money path runs.** `applyQueued` (`:196`) and
   `propose` (`:176`) can be entered from inside `distribute` or `release` by a hook token's
   `transfer`; the loop in `distribute` reads `_table[i]` from storage on each pass against a length
   cached at `:138`, so a matured `setBeneficiaries` applied mid-payout pays the remaining rows from
   the new table, or reverts out of bounds if the new table is shorter. Add a check-only modifier:

   ```solidity
   /// @dev Refuses entry while a money path holds the lock; does not take it. A configuration change
   /// landing between two rows of `distribute` would pay the rest from a table nobody has seen.
   modifier notLocked() {
       if (locked) revert Locked();
       _;
   }
   ```

   and put it on `applyQueued` and `propose`. Check-only, **not** `nonReentrant`: `applyQueued`'s
   self-call may legitimately be any `onlySelf` setter, and an owner may also queue `distribute` or
   `release` — under a full lock those actions would revert `Locked` from inside their own apply and
   sit in the queue until cancelled. The check costs one `TLOAD`. `cancel` stays as it is: owner-only,
   and a cancel from inside a payout changes nothing the loop reads. `propose` is guarded for the same
   invariant although its caller is the owner — a zero-delay `propose(setBeneficiaries)` from a hook
   is the same swap by a privileged hand, and the one word of guard is cheaper than the paragraph
   explaining why it is absent.

   Check: `grep -c 'notLocked' src/Distribution.sol` → 3 (the definition and two uses).

3. **F2 — a handover or a renounce clears the queue.** The queue hash is `keccak256(action, nonce)`
   (`:180`, `:197`) with no owner in it, and neither `acceptOwnership` (`:245`) nor the renounce
   branch of `transferOwnership` (`:236`) touches `queued` or `_pending`, so an action the old owner
   queued — `transferOwnership(B)` included — can be applied by anyone after the new owner takes
   over, and after a renounce nobody can `cancel` it. Add:

   ```solidity
   /// @dev Drops every queued action, newest first, emitting `Cancelled` for each so a log reader's
   /// pending list empties the way it would have by hand. Runs on a handover and on a renounce:
   /// what the previous owner queued was queued under an authority that no longer exists.
   function _clearQueue() private {
       uint256 n = _pending.length;
       while (n > 0) {
           bytes32 hash = _pending[--n].hash;
           delete queued[hash];
           delete _pendingIndex[hash];
           _pending.pop();
           emit Cancelled(hash);
       }
   }
   ```

   Call it at the end of `acceptOwnership` and inside the renounce branch of `transferOwnership`,
   after the owner fields are written. Order matters in `applyQueued`: it deletes its own entry and
   calls `_remove` (`:203-204`) **before** `_selfCall`, so a queued renounce is already out of
   `_pending` when `_clearQueue` runs and the loop never pops the action that is executing. `nonce`
   is not reset: hashes already applied or cancelled stay unreplayable. The loop is bounded by the
   outgoing owner's own queue, and the party paying for it on a handover is the new owner; an
   outgoing owner who wanted to make acceptance expensive could more simply not nominate anyone, so
   this is not a griefing vector worth a bound. Rejected: an owner epoch in the hash — the stale
   entries would stay in `snapshot().pending` forever, visible to every reader and uncancellable
   after a renounce, which is the dapp showing ghosts.

   Both NatSpec comments move with the code: `transferOwnership`'s `@notice` (`:231-234`) gains
   "and drops every queued action", and `acceptOwnership`'s (`:244`) "and drops every action the
   previous owner queued".

   Check: `grep -c '_clearQueue()' src/Distribution.sol` → 3.

4. **F6 — `distribute` copies no return data from a failed ETH push.** `_push`'s ETH branch
   (`:321`) copies whatever the recipient returns, inside the `distribute` loop; leg 2 measured
   10.6M gas at ten rows each returning 0x31000 bytes and 35.3M at twenty, which breaks the
   half-block property decision 27 rests on at about eleven hostile rows. `distribute` discards
   `data` already (`:146`); `release` needs it for decision 24. So `_push` takes a fourth argument:

   ```solidity
   function _push(address token, address to, uint256 amount, bool keepData)
       private
       returns (bool ok, bytes memory data)
   ```

   In the ETH branch, when `keepData` is false the call is made in assembly with a zero-length
   output area — `ok := call(PUSH_GAS, to, amount, 0, 0, 0, 0)` — and `data` stays empty; when true
   the branch is as today. `distribute` passes `false`, `release` passes `true`. The ERC-20 branch
   ignores the flag: it needs the return word (`:325`), and the token is the one `distribute(token)`
   was called with, so a hostile token's return data costs only the caller who named it. Say that
   in the `@dev`. Rejected: discarding in `release` too — four fewer lines, and it would turn
   decision 24's "bubble a real reason" into "always name" for ETH recipients, re-opening a ruling
   for no finding.

   **Re-measure the cap.** In `test/mocks/Mocks.sol` add `BloatingReceiver`: a `receive()` that
   reverts with 0x31000 bytes of return data in assembly (`revert(0, 0x31000)` after touching that
   memory; the expansion costs about 95,600 gas, inside `PUSH_GAS`, which is why leg 2 chose the
   figure). In `test/TableCap.t.sol`, beside `test_capRowsStayUnderHalfABlock`, add
   `test_capBloatingRowsStayUnderHalfABlock`: `MAX_BENEFICIARIES` rows of `BloatingReceiver`
   (etched the way `_prepare` etches `GasBurner`), every row escrowed, gas under `HALF_BLOCK`, and
   log the figure and the per-row cost beside the burner's 138,917. If a bloating row costs more
   than a burner row, the cap is re-derived from the larger figure and `MAX_BENEFICIARIES` changes
   with the three figures in its `@dev` (`:59-63`); the handoff says which row is the worst case now.
   Expected, labelled an estimate: the bloater costs no more than the burner once the copy is gone,
   and the cap stays 107.

   Check: `forge test --mc TableCapTest -vv` prints both `gas at CAP` figures under 15,000,000.

5. **F8 — size it; build the cap only if decision D14 rules one.** The ERC-20 branch of `_push`
   passes no gas, so a beneficiary that a hook token calls on `transfer` can burn 63/64 of what is
   left and starve the rows after it. The milestone's § Human-in-the-loop requirements D14 holds the
   ruling; the recommendation and the default are *document*. This task measures either way:

   - `HookToken` (`test/mocks/Mocks.sol:65`) gains a `Hook.Recipient` arm whose `transfer` calls
     `to` with all remaining gas before moving the balance, and `GasBurner` gains a `fallback()`
     that burns like its `receive()` (or add `GasBurnerAny`; whichever `forge lint` accepts).
   - `test_hookRecipientStarvesLaterRows` in `test/Distribution.t.sol`: a table of a `GasBurner`
     first and `MAX_BENEFICIARIES - 1` plain rows after it, funded with the hook token;
     `distribute(token)` under a 30,000,000 gas limit (`{gas: 30_000_000}` on the call) and record
     the outcome: the later rows' escrow writes need about 40,000 gas each after the burner has
     taken 63/64 of the frame, so the call either reverts out of gas or escrows the burner and pays
     the rest. Measure, do not predict; the handoff records the gas at which it first succeeds
     (bisect the limit by hand to a round thousand).
   - If D14 is ruled *document* or passes its deadline: the test asserts what was measured, and
     `SECURITY.md`'s F8 row (step 10) says the owner's remedy is a re-table and the shape needs a
     hook token and an owner-chosen hostile row.
   - If D14 is ruled *cap*: the ERC-20 call gets `gas: PUSH_GAS` as well, `release` inherits it,
     the test flips to asserting the burner row is escrowed and every later row paid, and the
     handoff says the gas a real `transfer` needs against the cap is **unmeasured here**
     (`MockERC20` is not evidence, and `test/fixtures/bytecode/` holds a Safe and a vault clone, no
     token) and names it as M04's first testnet measurement.

   Check: `forge test --mt test_hookRecipientStarvesLaterRows -vv` passes and prints the figure.

6. **F7 — settle the warm `receive()` figure, no code.** `AUDIT.md` F7 reports about 4,200 gas
   warm; m01-t01 measured 1,662 with the event. Run
   `forge test --mt test_receiveUnderStipend -vvvv` and read the gas on the `receive()` frame in the
   trace (the clone's `init` has already warmed the implementation in the same transaction, so the
   frame is the warm figure). Record it in the handoff beside both earlier numbers and say which one
   it agrees with; `SECURITY.md`'s F7 row (step 10) then quotes one figure with its instrument. If
   the trace does not agree with 1,662 within a hundred gas, stop and say so before step 10 — the
   overview's qualifier (criterion 5) was written to depend on neither figure, but the row should.

7. **Tests for the three fixes, in `test/Distribution.t.sol`,** named so `forge test --list` reads
   as this list. Each must **fail on `ede55c3`'s `src/`** before it passes on the branch: write
   them first, run `git stash push -- src/` then `forge build --force && forge test --mt <name>`,
   watch each fail for the finding's reason, then `git stash pop`. The handoff quotes the failing
   assertion of each. *Amended 2026-11-01 at close-out: six of the seven fail on `ede55c3`;
   `test_releaseStillBubblesEthReason` passes on both trees by design — it is the decision-24
   regression guard that F6's change must not break, not a test of F6 — so "each must fail" was
   wrong by one. The handoff's § The six failing assertions is the record.*
   - `test_applyQueuedRefusedDuringDistribute` (F1): leg 2's PoC. Table `[A 5000, B 5000]`, a
     matured `setBeneficiaries([C 5000, A 5000])` in the queue, A a `HookToken` recipient whose
     hook calls `applyQueued(action, nonce)` (a third `Hook` arm, `ApplyQueued`, carrying the
     action and nonce; or a dedicated mock). After `distribute(token)`: the hook's call reverted
     `Locked`, B holds 5000, the queue still holds the action, and `applyQueued` from outside
     succeeds afterwards. On `ede55c3` the hook's call succeeds and B holds 0.
   - `test_proposeRefusedDuringDistribute` (F1): the same shape with the hook recipient as owner
     calling `propose(setBeneficiaries(...))` on a zero-delay distribution; the hook's call
     reverts `Locked` and the table after `distribute` is the table before it.
   - `test_acceptOwnershipClearsQueue` (F2): the owner queues `transferOwnership(B)` and
     `setDelay(1)`, applies the first, B accepts; `pendingCount()` is 0, `queued(hash)` is 0 for
     the second, `applyQueued` of it reverts `NotReady(0)`, and `Cancelled` was emitted once with
     its hash (`vm.expectEmit`). On `ede55c3`, `applyQueued` succeeds after the handover.
   - `test_renounceClearsQueue` (F2): the owner queues `transferOwnership(C)` then applies a
     queued `transferOwnership(address(0))`; `pendingCount()` is 0 and the first action cannot be
     applied. This is leg 2's PoC: on `ede55c3`, C becomes pending owner of a renounced contract
     and `acceptOwnership()` makes C the owner.
   - `test_renounceFromApplyClearsTheRest` (F2): the renounce is itself applied from a queue
     holding two other actions, proving the pop loop and the executing action's prior `_remove`
     do not collide.
   - `test_distributeDiscardsEthReturnData` (F6): twenty `BloatingReceiver` rows (the table is
     built the way `TableCapTest._prepare` builds one); `distribute(address(0))` escrows all
     twenty and the `gasleft()` delta is under 3,000,000. On `ede55c3` it is above 30,000,000.
   - `test_releaseStillBubblesEthReason` (F6): a receiver that reverts with a 33-byte raw payload
     (reuse `RevertingToken.Fail.WithRawBytes`' shape in a receiver, or add one); after the escrow,
     `release` bubbles the 33 bytes, not `ReleaseFailed` — decision 24 still holds on the ETH path.
   - Existing tests that must not change their assertions: `test_hookTokenDistributeIsLocked`,
     `test_hookTokenReleaseIsLocked`, `test_cancelThenApplyReverts`, `test_applyFailureKeepsQueued`,
     `test_renounceFreezes`, `test_releaseFailedEthRecipient`.

   Check: `forge test` passes; `forge test --list --match-contract Distribution` shows the seven
   names above and every name in `SECURITY.md` § Invariants.

8. **Docs that now claim something false.** Three places, nothing else:
   - `app/src/index.html:1534`: "A change queued before the renunciation can still be applied by
     anyone, and once none remains the configuration is permanent." becomes one sentence saying a
     renounce drops every queued change and the configuration is permanent from that transaction;
     and the paragraph at `:1531` gains that acceptance drops the previous owner's queued changes.
     This is the milestone's allowance for `app/` — a docs claim the contract change touches — and
     it makes the deployed document stale until M04's upload, which is already the case for every
     `app/` byte since the last `make chunks`. No other `app/` line moves; `node --test
     test/*.test.mjs` still passes.
   - `docs/REFERENCE.md`: `applyQueued`'s row (`:23`) gains "refused while `distribute` or
     `release` is running"; `propose`'s (`:22`) the same; `transferOwnership`'s (`:28`) and
     `acceptOwnership`'s (`:29`) gain "and drops every queued action". The struct block and the
     selector fixture do not change — the ABI gains no name — so `tools/abi-vectors.sh` is not
     re-run; `node --test test/*.test.mjs` proves the tables still match.
   - `audits/KNOWN_ANSWER.md`, rewritten for the new commit (step 9 names it), and
     [#118](https://github.com/dnznlabs/rake/issues/118) fixed in the rewrite: `:135` is a
     **checked** subtraction (there is no `unchecked` block in the file), and `cancel` is owner-only
     and **immediate**.

   Check: `grep -c 'can still be applied' app/src/index.html` → 0;
   `grep -ci 'unchecked\|wait out the delay' audits/KNOWN_ANSWER.md` → 0.

9. **Freeze the code, then review it once.** `forge build --force`, `forge test`,
   `forge snapshot` (not `--check`; rows for `distribute`, `release`, `propose`, `applyQueued`,
   `acceptOwnership` and the renounce tests will move — record every moved row with before and
   after in the handoff, and a sentence for any that moves by more than a few hundred gas), then
   `forge lint` and `forge fmt --check` last (`AGENTS.md` § Contracts: lint poisons the cache).
   Bytecode sizes against step 0's. Push, open the PR as a draft with the body's paragraph and
   `Audit scope touched: src/Distribution.sol`, and message the architect with the head commit.
   **No commit under `src/`, `test/*.t.sol` or `.gas-snapshot` after this point** unless the
   architect sends the diff back; the audit in step 10 reads the head the architect names, and a
   `src/` byte after it is a second audit. Then write `audits/KNOWN_ANSWER.md` for that head —
   title it with the short sha — in two sections as today: *still in the code* (#19, #54, #95, #18,
   #22, and F8 if D14 ruled *document*) and *closed before this audit* (#20, #61, #74 from #103;
   F1, F2, F6 from this PR, each with the function and the one-line mechanism that is no longer
   there). A leg that reports F1, F2 or F6 as open is either reading code it was not given or has
   found the fix wanting; the rollup is told to say which, against the code.

10. **The review of the final code: both legs, blinded, graded.** The milestone's text said a
    single-leg re-check by the other lab; this plan runs the full method instead, and the
    milestone row records why: the single-leg shape is not in the runner and would be its second
    run ever, the Codex leg alone found one known shape in five on 2026-10-30, a full run costs
    fifteen minutes end to end on this scope (t04 handoff § Cost), and `SECURITY.md` can then name
    the shipping commit as *reviewed* rather than as *re-checked*. It is also the first real two-CLI
    run of the runner at `c12e188`, which Denizen tested with stand-in CLIs only — the handoff
    reports whether each of its six changes held.

    - **The blinded tree**, exactly as t04's step 4 built it, at the head from step 9: under
      `~/src/rake-blind-<date>/`, `foundry.toml`, `src/Distribution.sol`, `src/App.sol`,
      `scripts/forge/Deploy.s.sol`, `scripts/forge/DeployApp.s.sol`, `lib` as a symlink, `Makefile`,
      `mk/20-audit.mk`, `scripts/audit.sh`, `audits/SCOPE`, `audits/SKILL_PIN`, `audits/prompts/`,
      `.gitignore`'s audit block; one commit naming the head sha and the four sha256s; **not**
      `audits/KNOWN_ANSWER.md`. `forge build` succeeds there. Sorted `sha256sum` of the four files
      identical in both trees. `audits/SCOPE` is unchanged from t04 (decision 29); if t06 has
      merged first, the scoped scripts are t06's and the hashes say so.
    - **The run is launched by Denizen from a terminal**, as t04's was (its handoff, deviation 8):
      a foreground tool call caps at ten minutes, `LEG_TIMEOUT` is 5,400 s per leg, and
      backgrounding is denied to agents on this host. Stage a launcher script under the blinded
      tree's parent that re-checks every precondition above, then runs
      `cd <blind> && KNOWN_ANSWER_FILE=<this checkout>/audits/KNOWN_ANSWER.md make audit` with
      the default models; hand Denizen its path and the three things to verify when it ends:
      `audit complete: audits/<date>/AUDIT.md` printed, both leg directories non-empty,
      `audits/<date>/transcripts/` holding `leg-1-codex.log` and `leg-2-claude.jsonl`. The runner
      refuses a `TMPDIR` inside the repo; leave `TMPDIR` unset. Nothing in either tree is edited
      while a leg runs.
    - **What to record about the runner**, one line each in the handoff: whether leg 2's
      transcript shows any read of a `audits/<date>/pashov/` path (it must not — the harvests are
      staged outside the tree now); where `~/.claude/skills/solidity-auditor` and
      `~/.codex/skills/solidity-auditor` point after the run (expected
      `~/.cache/forge-audit/pashov-skills@f6c7f0de…/…`, no longer into
      `~/src/rake-blind-2026-10-30`, which may then be removed — say so, do not remove it in this
      task); the `upstream` field of the provenance block; whether sub-agent tool calls appear in
      the Claude transcript (the fragment's open question).
    - **Harvest**: `cp -a <blind>/audits/<date> audits/<date>` here, `BLIND.md` beside it in the
      2026-10-30 shape mapping the tree's commit to the head sha with the four hashes measured in
      both trees. `AUDIT.md` is not edited.

    Check: `AUDIT.md`'s provenance block has `dirty: no`, both leg directories and `transcripts/`
    non-empty, § 4 grades both legs against every entry of the known answer including the three
    *closed* findings; `test ! -e <blind>/audits/KNOWN_ANSWER.md` before and after;
    `git status --porcelain` in the blinded tree empty after the run.

11. **`SECURITY.md` names this code.** Edits, and only these:
    - § Prior reviews: a second entry above the first, same fields, scope commit *this PR's head
      from step 9* (the merge commit is its descendant with no `src/` diff, which is criterion 4's
      allowance; the handoff names both), result counts from the new `AUDIT.md`, grading per leg.
      The 2026-10-30 entry stays.
    - § Findings — disposition: F1, F2 and F6 rows become **fixed in this PR** naming the test
      that pins each; F8's row per D14; F7's row quotes step 6's figure and its instrument. **F3's
      row is t06's** (`accepted → m03-t06`): if t06 merged first the row already says so, and if
      not, leave it for t06 — do not resolve the race in this PR. Any new finding the second run
      raises gets a row with its disposition, and a contract change among them is a stop, not a
      commit: this PR does not re-open itself.
    - § Invariants: the count and the groups follow `forge test --list` — a two-way `comm` as t04
      did; the new tests join the owner, delay and money-path groups.
    - § The reviewed commit: the new sha and the `git diff --stat <sha> origin/main -- src/`
      sentence.
    - `README.md`'s `AUDIT` cell: the new date, same wording.

    Check: `grep -c '^| F' SECURITY.md` equals the row count of both `AUDIT.md`s combined minus
    duplicates the new rollup says it re-found (state the arithmetic in the handoff);
    `grep -c '<new sha>' SECURITY.md` ≥ 3; `grep -c 'two-model agent review' SECURITY.md` ≥ 1;
    `grep -c 'independent audit' SECURITY.md` hits only the sentence denying it.

12. **Hygiene, handoff, PR.** `forge build --force`, `forge test`, `forge snapshot --check` (exit 0
    on the snapshot committed in step 9 — if it does not, a `src/` or test byte moved after the
    freeze and step 10 is void), `forge lint`, `forge fmt --check` last; `node --test
    test/*.test.mjs`; `git status --porcelain` empty. `HANDOFF.md` from the template: the AC table
    with evidence, the three failing assertions from step 7, the snapshot rows that moved, the
    bytecode sizes, the F7 and F8 figures, the provenance block verbatim, per-leg grading, the
    six runner observations, § Deviations, § Discoveries. PR title
    `fix(m03): the review's three contract findings, re-reviewed`, from draft to ready, closing
    [#118](https://github.com/dnznlabs/rake/issues/118). `Carries forward:` filled at review.
    Review: architect first against this file and the step 9 head, Product Owner second.

## Acceptance criteria

- Milestone criterion 2's struct check still prints `["owner","delay","nonce","description","table","pending"]`,
  and `forge inspect Distribution abi --json | jq -r '.[]|select(.type!="constructor")|.name' | sort`
  is identical on the branch and on `origin/main` — the ABI gains and loses nothing.
- `forge test --list --match-contract Distribution` shows the seven step 7 names, and the handoff
  quotes each failing on `ede55c3`'s `src/` (the `git stash` run) with the assertion that failed.
- `forge test --mc TableCapTest -vv` prints `gas at CAP` for burners and for bloaters, both under
  15,000,000; `MAX_BENEFICIARIES` and its `@dev` agree with whichever row is the worst case.
- `test_hookRecipientStarvesLaterRows` passes and the handoff states the measured gas; if D14 ruled
  *cap*, the ERC-20 push carries `gas: PUSH_GAS` and the test asserts the later rows are paid.
- `grep -c 'can still be applied' app/src/index.html` → 0; `docs/REFERENCE.md` rows 22, 23, 28
  and 29 carry the new clauses; `node --test test/*.test.mjs` passes.
- Step 1: the seven fragment files are byte-identical to `../shared/templates/forge-audit/files/`.
- Milestone criterion 4 on the branch: `audits/<date>/AUDIT.md` with `dirty: no`, both leg
  directories and `transcripts/` non-empty, `BLIND.md` mapping its commit to the step 9 head,
  `SECURITY.md` naming that head, every finding of both runs dispositioned, `README.md`'s `AUDIT`
  cell dated to the new run. `git diff --stat <head> HEAD -- src/` empty at the PR's final commit.
- `audits/KNOWN_ANSWER.md` names the step 9 head, lists F1, F2 and F6 as closed with their
  mechanisms, and `grep -ci 'unchecked\|wait out the delay'` on it prints 0 (#118).
- `forge build --force` prints zero `warning[` / `Warning (` lines; `forge lint` and
  `forge fmt --check` silent; `forge snapshot --check` exit 0; `git status --porcelain` empty.
- `HANDOFF.md` carries everything step 12 lists, and § Discoveries names any finding the second
  run raised that this PR did not act on.

## Out of scope

- A second round of fixes. If the second run raises a finding that wants a contract change, it is
  recorded in `SECURITY.md` as accepted for a task that does not exist yet, named in the handoff
  § Open questions, and this PR stops there; the architect decides whether a t07 opens or the
  finding is documented.
- F3. It is t06's (`DeployApp` requires `OWNER`); only the `SECURITY.md` row's owner is t06's too.
- F4, F5, F7, F9, F10 as code. Ruled, documented, or rejected by t04; F7 gets a figure here, not a
  change.
- `pendingOwner` in `Snapshot`, any struct change, any ABI name. The ABI diff is empty by
  acceptance criterion.
- `app/` beyond the two sentences in step 8. The `#/docs` page is signed off; the pending-list
  rendering already handles an empty list.
- [#110](https://github.com/dnznlabs/rake/issues/110) (the chromium note): no `app/` tooling runs
  in this task. Close-out relabels it `m04`.
- Removing `~/src/rake-blind-2026-10-30`. Step 10 records where the skill links point afterwards;
  the removal is a one-liner for whoever reads that line, outside the PR.
- `RUNBOOK.md` and the rehearsal addresses — t06 and close-out (criterion 6 is re-run on the final
  bytecode at Phase 5).

## Open questions

1. **Question.** F8: does the ERC-20 push get a gas cap, or is the hook-recipient grief documented?
   **Options.** (a) Document: no code; the shape needs a hook token (ERC-777-style `transfer`
   callbacks, which neither leg found reaching the contract) *and* an owner-chosen hostile row;
   the effect is a `distribute(token)` that cannot be mined for that token until a re-table through
   the delay; nothing is lost. (b) Cap the ERC-20 call at `PUSH_GAS`: a token whose `transfer`
   legitimately needs more than the cap — a proxied token with pausable and blocklist checks on
   cold slots sits at 60–80k today, and a rebasing or reward-bearing token can exceed 100k — is
   escrowed on every push, and `release` under the same cap can never pay it: the #95 shape, for
   an honest token, on every distribution, forever. (c) A larger cap, 500k: bounds nothing the
   half-block rule cares about (107 × 540k is 58M) and still carries (b)'s failure for a token
   above it.
   **Recommendation.** (a). The cap trades a rare, owner-caused, recoverable stall for a
   permanent loss of a compliant token's funds, and the overview's non-goals already exclude the
   token class that makes the grief possible.
   **Default and deadline.** (a). Deadline: the day the t05 PR opens as a draft (step 9); step 5
   builds the measurement first either way and the ruling decides only whether a cap step follows.
   **Record.** `ROADMAP.md` § Decisions, as decision 36; issue to be opened as `decision: F8 — cap
   the ERC-20 push, or document the hook-recipient grief?`, labelled `decision` and `m03`, when
   this file merges.

Three choices this plan makes rather than asks, each the architect's and recorded here: F1 is a
check-only `notLocked`, not `nonReentrant` (step 2); F2 clears the queue rather than epoching the
hash (step 3); the second review is the full two-leg method rather than the single-leg re-check the
milestone text named (step 10, and the milestone row says so).

## Context

- [`MILESTONE.md`](../../MILESTONE.md) § Acceptance criteria 2, 3, 4 and 8; § Phases, Phase 3;
  § Human-in-the-loop requirements D14.
- [m03-t04 `HANDOFF.md`](../m03-t04/HANDOFF.md) § Findings, § Decisions, § Discoveries (F6 bounds
  the table tighter; the F7 conflict; leg 2's +3 line drift), § For the fragment;
  [`audits/2026-10-30/AUDIT.md`](../../../../../audits/2026-10-30/AUDIT.md) F1, F2, F6, F8 with
  their PoCs and measurements; [`SECURITY.md`](../../../../../SECURITY.md) § Findings.
- `docs/ROADMAP.md` § Decisions 20 (the method), 24 (`release` bubbles a real reason), 25 (a
  queued action that cannot apply), 27 (the cap and when to re-measure it), 30 (`PUSH_GAS`).
- [#119](https://github.com/dnznlabs/rake/issues/119) and Denizen's comment on it, 2026-10-31:
  the fragment at `c12e188` and its two open items. `audits/README.md` § Running it, § Running
  blind, § Re-running one leg after a fix (the shape this plan departs from, and why).
- [m03-t06 `TASK.md`](../m03-t06/TASK.md) § Sequencing (why the rehearsal does not wait for this)
  and step 2 (F3, and `HANDOFF.md` § For t05).
- Issues this closes: [#118](https://github.com/dnznlabs/rake/issues/118).
