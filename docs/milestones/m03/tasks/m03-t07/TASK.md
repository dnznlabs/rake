# m03-t07 — `App.lock` binds the document it locks

Milestone: [M03](../../MILESTONE.md) · Phase: 3 — The review

When this is done, `App` refuses any chunk pointer whose code does not begin with the `STOP` byte
`SSTORE2.write` prefixes, in `setChunks`, `setWidgetChunks` and `lock` alike, so a locked `App`
serves the bytes it served when it was locked and no key can change that afterwards (`SECURITY.md`
F11, decision 38). The review then reads the final code a third time — both legs, blinded, graded —
and `SECURITY.md` names this PR's head as the reviewed commit, which is the commit M04 deploys.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`). Branch
`m03/t07-lock` from `origin/main` at or after the merge of the PR that carries this file. Check hooks
with `ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`); do not run `make
init`. If the worktree is fresh, `git submodule update --init --recursive` first (#41). Line numbers
below are `src/App.sol` at `67146a7`, which `main` carries under `src/` today; step 0 proves it.
This task runs beside t06 (see § Sequencing at the end of the plan).

0. **The code is where the second review left it.** `git diff --stat b0fb4e3 origin/main -- src/`
   prints nothing. If it does not, stop: something under `src/` moved after the 2026-10-31 review and
   this plan is stale. *Amended 2026-11-01 (decisions 39–40):* once [m03-t08](../m03-t08/TASK.md)
   has merged, that diff prints **`src/Distribution.sol` and nothing else**, and this plan is not
   stale — t08's change is the one this task's review is meant to read alongside its own. Rebase
   onto that `main` before step 5; `App.sol` is untouched by t08, so every line number here holds. Record the baselines the handoff compares against: `forge build --force`, then
   `App`'s deployed bytecode (**7,118 bytes** at `67146a7`, from `forge inspect App deployedBytecode`
   with the hex length halved; `Distribution` 8,729, the factory 1,320), `forge test` (72 passed, 22
   of them `AppTest`), `grep -c '' .gas-snapshot` (72).

1. **The mechanism, rehearsed before any `src/` change.** This was run at scoping on 2026-11-01 in
   a throwaway worktree at `67146a7` and the plan rests on it; re-run it so the handoff carries the
   figures from the branch, not from this file. A throwaway test (not committed) with
   `vm.signDelegation(impl, pk)` and `vm.attachDelegation(d)` (`lib/forge-std/src/Vm.sol:1281`,
   `:1239`) on a fresh key, then `extcodesize` and the first byte of that account's code via
   `extcodecopy(acct, m, 0, 1)`:
   - the delegated account has `code.length` **23** and first byte **`0xef`** — the EIP-7702
     designator `0xef0100‖implementation`;
   - `App.setChunks([acct], false)` then `App.lock()` **both succeed today**, which is F11;
   - an `SSTORE2.write(hex"deadbeef")` pointer has `code.length` **5** and first byte **`0x00`**,
     the `STOP` the library prefixes "to ensure it cannot be called"
     (`lib/solady/src/utils/SSTORE2.sol:52`, written by the `mstore` at `:56`);
   - `SSTORE2.read` (`SSTORE2.sol:208-216`) copies from offset 1 and reports `extcodesize - 1`, so
     a pointer whose byte 0 is anything but the prefix is being read wrong whatever it is.
   The cheatcodes work under `foundry.toml`'s `evm_version = "cancun"`; on a public chain the
   designator exists after Pectra regardless of what the contract was compiled for.

   Check: the three figures above reproduce; the handoff quotes them.

2. **The check.** Add beside `CodelessChunk` (`:35-40`):

   ```solidity
   /// @dev A pointer that holds code but is not an SSTORE2 chunk: its first byte is not the `STOP`
   ///      `SSTORE2.write` prefixes (`lib/solady/src/utils/SSTORE2.sol:52`). The case that matters is
   ///      an EIP-7702 delegation designator, `0xef0100‖address`: it has code, so `code.length` admits
   ///      it, and its key holder can re-point or clear it after `lock()`, changing or breaking what
   ///      `html()` serves. EIP-3541 means no deployed contract begins with `0xef`, and `SSTORE2.read`
   ///      discards byte 0, so a pointer that fails this check could never have been read correctly.
   error ForeignChunk(address ptr);
   ```

   and one private view that every pointer passes through:

   ```solidity
   /// @dev Reverts unless `ptr` is a readable SSTORE2 chunk: non-empty code whose first byte is 0x00.
   function _requireChunk(address ptr) private view {
       uint256 n;
       bytes32 first;
       /// @solidity memory-safe-assembly
       assembly {
           n := extcodesize(ptr)
           extcodecopy(ptr, 0x00, 0x00, 0x01)
           first := mload(0x00)
       }
       if (n == 0) revert CodelessChunk(ptr);
       if (first[0] != 0x00) revert ForeignChunk(ptr);
   }
   ```

   Replace the four `code.length == 0` checks — `setChunks` `:118`, `setWidgetChunks` `:140`,
   `lock` `:162` and `:166` — with `_requireChunk(ptrs[i])` / `_requireChunk(chunks[i])` /
   `_requireChunk(widgetChunks[i])`. `addChunk` and `addWidgetChunk` keep writing through
   `SSTORE2.write` and need no check: the pointer is the library's. `lock`'s `@dev` (`:152-157`)
   gains one sentence: the re-check is for a readable *chunk*, not merely for code, because a pointer
   with code that is not a chunk is the thing the lock must refuse. `CodelessChunk` keeps its meaning
   and its tests; the two errors name two different failures and the dapp decodes neither
   (`grep -rn 'CodelessChunk' app/ test/*.mjs` is empty today).

   Check: `grep -c '_requireChunk' src/App.sol` → 5 (the definition and four uses);
   `grep -c 'code.length' src/App.sol` → 0.

3. **Tests, in `test/App.t.sol`,** named so `forge test --list --match-contract AppTest` reads as
   this list. Each must **fail on `67146a7`'s `src/App.sol`** before it passes on the branch: write
   them first, `git stash push -- src/`, `forge build --force && forge test --mc AppTest`, watch each
   fail for the finding's reason (today's code accepts the pointer, so the failure is a missing
   revert or a lock that succeeded), then `git stash pop`. The handoff quotes the failing assertion
   of each.
   - `test_setChunksRejectsDelegationDesignator`: `vm.etch(p, abi.encodePacked(hex"ef0100", impl))`,
     `setChunks([p], false)` reverts `ForeignChunk(p)`.
   - `test_setWidgetChunksRejectsDelegationDesignator`: the same through `setWidgetChunks`.
   - `test_lockRejectsDelegationDesignator`: the shape of `test_lockRejectsCodelessPointer`
     (`:172-184`) — `addChunk` a real chunk, then `vm.etch` that pointer to a designator, `lock()`
     reverts `ForeignChunk(ptr)` and `locked()` stays false.
   - `test_lockRejectsRealDelegation`: step 1's shape as a test — `makeAddrAndKey`, `signDelegation`
     to any contract address, `attachDelegation`, `setChunks([acct], false)` reverts `ForeignChunk`.
     This is leg 2's F11 as it stated it, with the chain's own designator rather than an etched one.
   - `test_setChunksRejectsNonChunkContract`: `setChunks([address(app)], false)` reverts
     `ForeignChunk` — a deployed contract whose first byte is not `0x00` is not a chunk either, and
     today it is accepted and would be mis-read.
   - Existing tests that must not change their assertions: `test_setChunksRejectsCodelessPointer`,
     `test_setChunksRejectsCodelessPointerAmongValidOnes`, `test_lockRejectsCodelessPointer`,
     `test_lockRejectsCodelessWidgetPointer`, `test_setWidgetChunksRejectsCodelessPointer`,
     `test_setChunksAcceptsValidPointers`, `test_lockAcceptsReadableDocument` — an empty pointer is
     still `CodelessChunk`, and real chunks still pass.

   Check: `forge test` passes; `forge test --list --match-contract AppTest` shows 27 names — the 22
   of today plus the five above.

4. **The upload path still works.** `scripts/forge/Chunks.s.sol:24-27` uploads through `addChunk`
   and then calls `setChunks` with the same pointers, so every pointer it hands back is the
   library's and passes. Prove it on an anvil rather than reading it: `make serve`'s chunk step, or
   `forge script scripts/forge/Chunks.s.sol` against a fresh anvil with the documented variables, ends
   with `chunkCount()` equal to the number of chunks the script printed and `html()` returning the
   document (`make chain-doc` equality is t06's and close-out's; here one `cast call` suffices).

   Check: the handoff quotes the count and the `cast call app "chunkCount()"` result.

5. **Freeze, then review.** `forge build --force`, `forge test`, `forge snapshot` (not `--check`;
   `AppTest` rows will move by the cost of one `extcodecopy` per pointer — record every moved row
   with before and after in the handoff, and a sentence for any that moves by more than a few hundred
   gas), then `forge lint` and `forge fmt --check` last (`AGENTS.md` § Contracts: lint poisons the
   cache). `App`'s deployed bytecode against step 0's 7,118; `Distribution` and the factory
   byte-identical **to t08's merge commit** (`git diff --stat <t08 merge> HEAD -- src/Distribution.sol`
   empty — amended 2026-11-01; it was `b0fb4e3`). Push, open the PR as a
   draft with `Audit scope touched: src/App.sol`, and message the architect with the head commit.
   **No commit under `src/`, `test/*.t.sol` or `.gas-snapshot` after this point** unless the
   architect sends the diff back. Then rewrite `audits/KNOWN_ANSWER.md` for that head, titled with
   the short sha, in its two sections: *still in the code* keeps #19, #54, #95, #18, #22 and F8
   (#123) and **adds one** — F12 ([#127](https://github.com/dnznlabs/rake/issues/127), `reserved`
   keyed by token so a native-balance alias double-pays, `distribute` `:141-146`), ruled and
   documented, gradable — **and drops #95** (*amended 2026-11-01*: decisions 39–40 moved it); *closed
   before this audit* keeps #20, #61, #74, F1, F2, F6 and **adds four** — F11 (the mechanism that is
   no longer there, with `_requireChunk` and the four call sites named), and t08's three: F9/F13
   (`GRACE`, `Expired`, cancel-by-anyone once expired), F5/#95 (`claim`) and #111's renounce event.
   The known answer now grades six shapes still present and ten closed; t08's handoff § For t07
   names the `src/Distribution.sol` hash the blinded tree must carry.

   Check: `grep -c '<head sha>' audits/KNOWN_ANSWER.md` ≥ 2; `grep -c '#127' audits/KNOWN_ANSWER.md`
   ≥ 1; `grep -c 'ForeignChunk' audits/KNOWN_ANSWER.md` ≥ 1.

6. **The third review: both legs, blinded, graded.** Exactly t05's step 10, and its handoff § The
   second review is the worked example:
   - **The blinded tree** at the step 5 head, under `~/src/rake-blind-<date>/`: `foundry.toml`,
     `src/Distribution.sol`, `src/App.sol`, `scripts/forge/Deploy.s.sol`,
     `scripts/forge/DeployApp.s.sol`, `lib` as a symlink, `Makefile`, `mk/20-audit.mk`,
     `scripts/audit.sh`, `audits/SCOPE`, `audits/SKILL_PIN`, `audits/prompts/`, `.gitignore`'s audit
     block; one commit naming the head sha and the four sha256s; **not** `audits/KNOWN_ANSWER.md`.
     `forge build` succeeds there. Sorted `sha256sum` of the four scoped files identical in both
     trees. `audits/SCOPE` is unchanged (decision 29; `src/App.sol` is already in it). **If t06 has
     merged first, `DeployApp.s.sol` is t06's and the hashes say so; if not, it is `main`'s** — either
     way the tree holds what `main` holds at the head, and the handoff says which.
   - **The run is launched by Denizen from a terminal**, as both earlier runs were: stage a launcher
     under the blinded tree's parent that re-checks every precondition above and then runs
     `cd <blind> && KNOWN_ANSWER_FILE=<this checkout>/audits/KNOWN_ANSWER.md make audit`; hand him
     its path and the three things to verify when it ends (`audit complete` printed, both leg
     directories non-empty, `transcripts/` holding both legs). `TMPDIR` unset. Nothing in either
     tree is edited while a leg runs. The runner is the fragment at `c12e188` already (t05 step 1);
     do not run `add.sh` again unless `audits/README.md` § upstream names a newer commit, and say so
     if it does.
   - **Harvest**: `cp -a <blind>/audits/<date> audits/<date>`, `BLIND.md` beside it in the
     2026-10-31 shape. `AUDIT.md` is not edited. The transcript directory is admitted by the
     narrowed large-file hook (t05 handoff § Decisions 5); if a transcript exceeds what that admits,
     stop and say so rather than widening the hook.

   Check: `AUDIT.md`'s provenance block has `dirty: no`; both leg directories and `transcripts/`
   non-empty; § 4 grades both legs against all fifteen known-answer entries, F11 among the closed;
   `test ! -e <blind>/audits/KNOWN_ANSWER.md` before and after; the blinded tree's
   `git status --porcelain` empty after the run.

7. **`SECURITY.md` names this code.** Edits, and only these:
   - § Prior reviews: a third entry above the second, same fields, scope commit *this PR's head from
     step 5*, result counts and per-leg grading from the new `AUDIT.md`, including whether F11 was
     reported as open by either leg (it must not be; the rollup is told to say, against the code,
     whether a leg that does so is reading code it was not given or has found the fix wanting).
   - § Findings — disposition: F11's row becomes **fixed in this PR** naming `_requireChunk` and the
     tests that pin it; the row keeps its 2026-10-31 provenance text. **F12's and F13's rows do not
     change**: F12 is carried as #127 and F13 is F9's standing disposition, both ruled at t05's
     close-out. Any new finding the third run raises gets a row with its disposition; **a contract
     change among them is a stop, not a commit** — this PR does not re-open itself. **F3's row is
     t06's**: if t06 merged first it already reads fixed, and if not, leave it.
   - § Invariants: the count follows `forge test --list` (a two-way `comm` as before); the five new
     tests join a group for `App` — "a locked `App` serves only SSTORE2 chunks, and only the ones
     it was locked with" — which this task adds, since today's § Invariants has no `App` group.
   - § The reviewed commit: the new sha and the `git diff --stat <sha> origin/main -- src/`
     sentence.
   - `README.md`'s `AUDIT` cell (`README.md:15`, "two-model agent review, 2026-10-31"): the new
     date, same wording.

   Check: `grep -c '<new sha>' SECURITY.md` ≥ 3; `grep -c 'ForeignChunk' SECURITY.md` ≥ 1;
   `grep -c '^| F' SECURITY.md` equals 13 plus any rows the third run adds (state the arithmetic);
   `grep -c 'two-model agent review' SECURITY.md` ≥ 1.

8. **Hygiene, handoff, PR.** `forge build --force`, `forge test`, `forge snapshot --check` (exit 0
   on the snapshot committed in step 5 — if not, a `src/` or test byte moved after the freeze and
   step 6 is void), `forge lint`, `forge fmt --check` last; `node --test test/*.test.mjs` (62 pass,
   unchanged — no `app/` byte moves in this task); `git status --porcelain` empty. `HANDOFF.md` from
   the template: the AC table with evidence, step 1's three figures, the five failing assertions
   from step 3, step 4's count, the snapshot rows that moved, the bytecode sizes, the provenance
   block verbatim, per-leg grading against all fifteen entries, § Deviations, § Discoveries, and a
   § For M04 naming the final `App` init-code hash (`cast keccak $(forge inspect App bytecode)` is
   not it — the constructor arguments are appended; say so and give the command t06's runbook uses)
   so `APP_SALT` can be mined against it (decision 37). PR title
   `fix(m03): App.lock refuses a pointer whose code can change`, from draft to ready, closing the
   t07 task issue. `Carries forward:` filled at review. Review: architect first against this file
   and the step 5 head, Product Owner second.

**Amended 2026-11-01 — the freeze waits.** Decisions 39 and 40 ([#134](https://github.com/dnznlabs/rake/issues/134),
[#135](https://github.com/dnznlabs/rake/issues/135)) opened [m03-t08](../m03-t08/TASK.md), which
changes `src/Distribution.sol`. Steps 1–4 proceed; **step 5 does not run until t08 has merged and
this branch is rebased onto it**, so the third review reads `App.lock`'s fix and t08's changes in
one run instead of two. t06 (#131) merged 2026-11-01 and its salted deploy scripts are on `main`;
the blinded tree carries them. t08 touches `test/`, `.gas-snapshot` and `SECURITY.md` rows, so the
rebase re-runs `forge snapshot` for this task's own `App` rows (its `Distribution` rows are t08's)
and takes `main`'s `SECURITY.md` before step 7 edits it.

**Sequencing, as first written.** t06 runs beside this task and neither waits for the other. This task changes `App`'s
bytecode, so t06's rehearsal addresses for `App` move with it — by design (t06 TASK.md § Sequencing;
criterion 6 is re-run at close-out on the final `main`). Files both touch: `SECURITY.md` (t06 edits
F3's row, this task F11's and § Prior reviews) and possibly `.gas-snapshot` if t06 adds a test;
whichever merges second rebases and re-runs `forge snapshot --check`. The blinded tree holds whatever
`main` holds at the head (step 6). `APP_SALT` is mined at M04 against the hash this PR's merge
produces, which is why the hash is in the handoff.

## Acceptance criteria

- `git diff --stat <t08 merge commit> HEAD -- src/Distribution.sol` is empty at the PR's final
  commit (`src/` holds two files, `App.sol` and `Distribution.sol`, the factory inside the latter) —
  the only contract **this task** moves is `App`; `Distribution.sol` is t08's, already on `main`
  (*amended 2026-11-01: this read `b0fb4e3` before decisions 39–40*). `forge inspect Distribution
  abi --json` is byte-identical to `origin/main`'s.
- `forge inspect App abi --json | jq -r '.[]|select(.type!="constructor")|.name' | sort` on the branch,
  diffed against `origin/main`'s, shows **exactly one added line, `ForeignChunk`, and nothing
  removed**; both lists have a non-zero count stated in the handoff (a diff of two empty lists is
  not a check — t05 handoff § Discoveries 1).
- `grep -c 'code.length' src/App.sol` → 0; `grep -c '_requireChunk' src/App.sol` → 5.
- `forge test --list --match-contract AppTest` shows 27 names including the five of step 3, and the
  handoff quotes each of the five failing on `67146a7`'s `src/App.sol` with the assertion that failed;
  the seven existing names step 3 lists keep their assertions (`git diff origin/main -- test/App.t.sol`
  shows them unchanged).
- Step 4's anvil upload: `chunkCount()` equals the chunks uploaded and `html()` returns the document.
- Milestone criterion 4 on the branch: `audits/<date>/AUDIT.md` with `dirty: no`, both leg
  directories and `transcripts/` non-empty, `BLIND.md` mapping its commit to the step 5 head,
  `SECURITY.md` naming that head, F11 **fixed** and every finding of all three runs dispositioned,
  `README.md`'s `AUDIT` cell dated to the new run; `git diff --stat <head> HEAD -- src/` empty at the
  PR's final commit.
- `audits/KNOWN_ANSWER.md` names the step 5 head, lists F11 as closed with its mechanism, and carries
  #127 and F13/F9 as still present; `AUDIT.md` § 4 grades all fifteen entries.
- `forge build --force` prints zero `warning[` / `Warning (` lines; `forge lint` and
  `forge fmt --check` silent; `forge snapshot --check` exit 0; `node --test test/*.test.mjs` 62 pass;
  `git status --porcelain` empty.
- `HANDOFF.md` carries everything step 8 lists, § For M04 names `App`'s init-code hash and the command
  that produced it, and § Discoveries names any finding the third run raised that this PR did not
  act on.

## Out of scope

- F12 and F13 as code. Ruled at t05's close-out: F12 is carried as #127 with t06's per-chain
  precondition, F13 is F9's "none needed". Neither row in `SECURITY.md` moves here.
- Any byte of `src/Distribution.sol`. It is final at `b0fb4e3` and two reviews have read it; the
  third review reads it again only because the method reads the whole scope.
- Mining `APP_SALT` or `FACTORY_SALT` — M04's, against the hash this PR's handoff names (decision 37).
- `RUNBOOK.md`, the rehearsal, `DeployApp.s.sol` and F3 — t06's, running beside this.
- `app/`. The dapp decodes neither error; the `#/docs` page makes no claim about what `lock` checks
  (`grep -n 'lock' app/src/index.html` at scoping showed none). If the engineer finds one, it is a
  handoff § Discoveries line, not an edit.
- A second round of fixes. If the third run raises a finding that wants a contract change, it is
  recorded in `SECURITY.md` as accepted for a task that does not exist yet, named in the handoff
  § Open questions, and this PR stops there.
- Rejecting pointers by *content* beyond byte 0 (a gzip magic check, an HTML sniff). The lock binds
  bytes, not meaning; what the bytes say is the owner's.

## Open questions

None. Two choices this plan makes rather than asks, each the architect's and recorded here: a second
error `ForeignChunk` rather than widening `CodelessChunk` (two causes, two names, and the existing
tests keep their meaning; the one ABI addition is the acceptance criterion); and the check is
"first byte is `0x00`" rather than "first byte is not `0xef`" — the tighter test is also the one that
matches what `SSTORE2.read` assumes, so a pointer it rejects could never have been served correctly.

## Context

- [`MILESTONE.md`](../../MILESTONE.md) § Acceptance criteria 4; § Phases, Phase 3; § Human-in-the-loop
  requirements D15.
- `docs/ROADMAP.md` § Decisions 38 (this task's ruling, [#126](https://github.com/dnznlabs/rake/issues/126)),
  37 (`APP_SALT` waits on this), 29 (the scope), 20 (the method).
- [`SECURITY.md`](../../../../../SECURITY.md) F11, and [`audits/2026-10-31/AUDIT.md`](../../../../../audits/2026-10-31/AUDIT.md)
  § F4 — leg 2's statement of the finding, its trace to `SSTORE2.sol:213` for the cleared-delegation
  case, and its confidence 80.
- [m03-t05 `TASK.md`](../m03-t05/TASK.md) steps 9–12 and [`HANDOFF.md`](../m03-t05/HANDOFF.md) § The
  second review, § Decisions 5, § Discoveries 1 — the freeze, the blinded tree, the launcher, the
  harvest, and the two vacuous-pass traps.
- [m03-t06 `TASK.md`](../m03-t06/TASK.md) § Sequencing — why neither task waits for the other.
- EIP-7702 (the designator `0xef0100‖address`, `EXTCODESIZE` 23, `EXTCODECOPY` returns the designator),
  EIP-3541 (no deployed code begins with `0xef`), `lib/solady/src/utils/SSTORE2.sol` `write` (`:40-60`)
  and `read` (`:208-216`).
