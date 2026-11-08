# m04-t06 — handoff

PR: #170 · Branch: `m04/t06-slither` · 2026-11-07

Slither 0.11.5 is pinned in `devbox.lock`, configured by one tracked
`slither.config.json`, gated by a tracked `slither.db.json`, wired to
`make slither` and run by CI on every push. **Its 23 gated results all have a
disposition in `SECURITY.md` § Static analysis, and none of them is a `fix`: no
`src/` byte moves in this PR, and `git diff --stat origin/main -- src/` prints
nothing.** The counts reproduce the architect's rehearsal exactly — 23 gated
(2 High, 8 Medium, 13 Low), 32 with every detector on, 1.5 s from a clean tree,
and the same eleven detectors at the same eleven counts — but the dispositions
do not: every row was confirmed against the source rather than against the
plan's expected mapping, and **four of those expectations did not survive it**,
which is recorded in the rows that refute them and in § Discoveries. Two
assumptions the plan made about the tool were also false and are in § Deviations:
`filter_paths` never put the two shipped deploy scripts in scope (they are clean
anyway, measured both ways), and the result count is 23 rather than the "a few
more than 23" the plan expected for that reason. The `owner_` zero check is
answered as `design` on named evidence and escalated in § Open questions rather
than fixed.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — `slither --version` → `0.11.5`; `slither.config.json` and `slither.db.json` tracked | pass | `devbox run -- slither --version` → `0.11.5`, with `devbox run -- forge --version` → `forge Version: 1.7.1-dev` in the same profile and both resolving to `.devbox/nix/profile/default/bin/`. `git ls-files slither.config.json slither.db.json` → both listed (commits `0284277`, `72090f2`). |
| 2 — `make slither` exits 0 on the branch | pass | `devbox run -- make slither` → `INFO:Slither:. analyzed (6 contracts with 75 detectors), 0 result(s) found`, `rc=0`, `wall_ms=1533`. |
| 3 — and non-zero with one triage entry removed, both shown | pass | `reentrancy-eth` dropped from `slither.db.json` (23 → 22 entries): `make slither` → `rc=2` (slither's own exit is 255), `1 result(s) found`, `Reentrancy in Distribution.distribute(address) (src/Distribution.sol#154-174):`. Database restored byte-identically — it does not appear in `git status --porcelain` afterwards. |
| 4 — under two seconds | pass | From `forge clean`, so including Slither's own `forge build --build-info --skip ./test/** ./scripts/forge/** --force`: `wall_ms=1602` on the first timed run and `1533` for `make slither` on a warm tree. The architect rehearsed 1.46 s. |
| 5 — § Static analysis names tool, version, config, commit, counts | pass | `SECURITY.md:184-196`. Counts: **23** gated (2 High, 8 Medium, 13 Low), **32** full. Commit: this branch, whose `src/` is byte-identical to `main` at `a90fa61`. |
| 6 — one row per gated result, each with a five-word disposition and a sentence | pass | 23 rows for 23 results: `awk '/^## Static analysis — disposition/,/^### The 9 results/' SECURITY.md \| grep -c '^\| [0-9]'` → `23`, and the disposition column tallies `design` 13, `false positive` 7, `covered by F1` 1, `covered by F6` 1, `covered by F8` 1 — **no `fix`**. |
| 7 — the two High rows name the lock and the test | pass | Row 1 (`arbitrary-send-eth`) names `PUSH_GAS` at `:59`, `onlySelf` at `:274`/`:330` and decision 6. Row 2 (`reentrancy-eth`) names `nonReentrant` (`:109-114`) and the transient `locked` (`:99`) for the money paths, `notLocked` (`:118-121`) and **`test_applyQueuedRefusedDuringDistribute`** for the table, and `test_hookTokenDistributeIsLocked`, `test_hookTokenReleaseIsLocked`, `test_claimReentrancyLocked`, `test_proposeRefusedDuringDistribute` for the rest. |
| 8 — `git diff --stat origin/main -- src/` empty | pass | `devbox run -- git diff --stat origin/main -- src/` prints nothing. No result was a `fix`, so the PR does not stop and its title does not need to say so. |
| 9 — CI has the `slither` step and is green | pass | `.github/workflows/ci.yml:54-65`, ordered last. Run `42422165489` on `17f13c5`: see § CI below for the conclusion and the step's logged count. |
| 10 — `forge test` 91, `node --test` 90, `forge snapshot --check` 0 | pass | After `forge build --force` (required: Slither's compile leaves `out/` with six artifacts and none of the suites'): `forge test` → `Ran 5 test suites … 91 tests passed, 0 failed, 0 skipped (91 total tests)`; `node --test test/*.test.mjs` → `ℹ tests 90 / ℹ pass 90 / ℹ fail 0`; `forge snapshot --check` → `rc=0`; `make fmt` → `rc=0`. Baseline before any change, at `a90fa61`: the same 91 / 90 / 0. |
| 11 — porcelain empty after `make slither && forge test` | pass | `git status --porcelain` → empty (one run showed only the then-untracked `slither.db.json`, which this PR tracks; it is empty with the file committed). |
| 12 — `AGENTS.md` § Contracts gains the two facts | pass | `AGENTS.md:62-81`, three bullets: the triage database and the table move together; Slither's compile rebuilds `out/` without the tests; and the third fact this task discovered — `filter_paths` filters results, not the compilation unit. |
| 13 — PR closes this task's issue | pending | Issue **#168** ("m04-t06 — Slither as the third leg, before the first public byte"), verified OPEN at the time of writing. Denizen opens the PR; the body from `templates/PR.md` carries the closing keyword. |

## CI

Run [`42422165489`](https://github.com/dnznlabs/rake/actions/runs/42422165489) on `17f13c5`:
`success`, all eleven steps green in order — `build`, `fmt`, `test`, `gas snapshot`, **`slither`**,
`working tree clean`. The `slither` step's own log line:

```
ci	slither	2026-11-07T22:48:23.6915268Z INFO:Slither:. analyzed (6 contracts with 75 detectors), 0 result(s) found
```

Which is also the independent proof of deviation 4: CI checks out to
`/home/runner/work/rake/rake`, not to the path `slither.db.json` records, and the gate is still
green there.

**On the branch head.** Run
[`42422383022`](https://github.com/dnznlabs/rake/actions/runs/42422383022) on `8b7b4a2`, the commit
that added this file: `success`, the same nine steps green, the `slither` step again logging
`INFO:Slither:. analyzed (6 contracts with 75 detectors), 0 result(s) found`. The head commit
changes documentation only, so the two runs measure the same tree for every step that reads code.

## Deviations from the plan

1. **`filter_paths` does not put the two shipped deploy scripts in scope, so the count is 23 and not
   "a few more".** The plan's step 2 says "the config above keeps `Deploy.s.sol` and
   `DeployApp.s.sol` in, which the audit scope does too — expect a few more results than 23". It
   does not. `filter_paths` filters *results*; the compilation unit is crytic-compile's, and it
   builds Slither's `--skip` list from `forge config --json`, so Slither's own invocation on this
   repo is `forge build --build-info --skip ./test/** ./scripts/forge/** --force` — the `script`
   directory is skipped whatever `filter_paths` says, and the shipped scripts are never analysed.
   **Measured both other ways rather than left as an argument:** `--foundry-compile-all` analyses 71
   contracts in 46.6 s, and a `--skip ./test/**` pre-build with `--foundry-ignore-compile` analyses
   54 in 12.6 s. Both give **the same 23 gated and 32 full results, and zero results naming
   `scripts/forge`** under either detector set. So the deploy scripts are clean, the gate's
   population of 23 is complete either way, and the fast configuration is the one that meets the
   two-second budget — which is why the plan's config block ships verbatim rather than being
   widened. Recorded in `AGENTS.md` § Contracts so the next reader does not re-derive it. **If the
   architect wants the scripts genuinely compiled in, that is a second target and a new wall-time
   budget, not an edit to this one.**
2. **The CI step is ordered last, after `gas snapshot`, not between `test` and it.** The plan made
   this conditional — "place it after `forge snapshot --check` if the snapshot step reads `out/`
   (check; if it does, order it last and say why in the workflow comment)" — and the check says it
   does: Slither's compile leaves `out/` holding six artifacts and none of the suites', so
   `forge snapshot --check` behind Slither pays a full recompile, **13.4 s measured against 0.3 s
   behind `test`**. Correctness is unaffected either way, because forge rebuilds what is missing and
   `--check` exits 0 straight after a Slither run; the ordering buys wall time only. The workflow
   comment at `ci.yml:54-61` says so.
3. **`ls .git/hooks | grep -v sample` cannot run as the plan writes it.** This is a worktree, so
   `.git` is a file and the path is not a directory. Checked through
   `ls "$(git rev-parse --git-common-dir)/hooks"` instead → `post-commit`, `pre-commit`, with
   `core.hooksPath` unset. The hooks did run on every commit: each shows
   `Custom Pre Commit Script … Passed` / `Custom Post Commit Script … Passed`, and all five commits
   are GPG-signed, `%G?` → `G`, `Elanik. <elanik@dnzn.dev>`.
4. **`slither.db.json` is committed with this worktree's absolute paths in it**, 148 of them, as
   `--triage-mode` wrote it — the plan says "commit the resulting `slither.db.json`". They are dead
   weight, not a dependency: matching is by result `id` (a sha3 over source mappings that stringify
   *relative*) and by `description`, never by `filename_absolute`
   (`slither/core/slither_core.py:511,517`). Proved rather than reasoned: analysing a copy of this
   tree at `/tmp/t06/port/rake` with the database unchanged gives 0 results and exit 0, so CI's
   checkout path does not matter. Left unedited because a regeneration rewrites them either way and
   hand-normalising a generated artifact buys no durable stability; the churn is noted in
   `AGENTS.md`.
5. **The 9 excluded results are written up in `SECURITY.md` as well as here.** The plan put them in
   the handoff (steps 2 and 7); they are in both, because § Static analysis is where a future reader
   looks for "what did the tool say and what did we think", and a handoff is not a place a reader
   finds two years later.

## Decisions

1. **`AGENTS.md` § Contracts gained three bullets, not two.** The two the AC names, plus the
   `filter_paths` scope fact from deviation 1 — a reader who does not know it will conclude the gate
   covers the deploy scripts, which is exactly the misreading this task had to measure its way out
   of. The section carries the `<!-- fragment: forge-anvil -->` marker; rake-specific bullets already
   live inside it (#22, #35, #41, the t03 `forge lint` bullet), so a local addition follows the
   established convention. **Two of the three are generic enough to be an upstream item for
   `shared`'s `forge-anvil` fragment** — the triage-database rule and the `out/` rebuild — on the
   precedent SECURITY.md records for the large-file guard. Not done here: `~/src/shared` is not this
   task's to edit.
2. **`slither` is a single-colon target and not a recipe on `test::`.** Chaining it into `test`
   would make every `make test` pay Slither's rebuild of `out/`, and then the next `forge snapshot`
   another. The gate is its own target and its own CI step.
3. **Row 14's disposition is `design`, not an empty cell.** The AC requires every row to carry one
   of five words, and `fix` is a stop. The plan asks the engineer to decide between "documented
   shape" and "a one-line `src/` check, and if the latter, stop and escalate". The code says
   documented shape — reasoning in `SECURITY.md` § Static analysis — the `owner_` zero check — so
   the row says `design` and the *judgement* is escalated in § Open questions rather than the task
   being stopped.

## Discoveries

1. **Two of the four `timestamp` results are not timestamp comparisons.** `_clearQueue:352`
   (`n > 0`) and `_remove:367` (`i != last`) are array bounds. Slither's taint analysis is
   field-insensitive over the `Pending` struct, so the `eta` field (`:19`) taints `_pending` and
   therefore `_pending.length`. The plan expected all four to map to "the timelock is time; design";
   two are `false positive`.
2. **One of the two `calls-loop` results is on a statement no loop reaches.** The plan mapped both
   to F8 / decision 36. Only `:417`, the ERC-20 branch, is reached from `distribute`'s loop; `:408`
   is the ETH call with `keepData`, and `distribute` passes `keepData = false` (`:166`) so the ETH
   path takes the assembly `call` at `:411-414`. `:408` is reachable from `release` (`:183`) alone,
   which has no loop.
3. **The `return-bomb` is on the branch F6 deliberately kept, not the one it removed.** The plan's
   sentence — "F6: the ETH branch discards return data by design" — describes `:411-414`. Slither
   flags `:408`, which is the branch that *keeps* the data because decision 24 cannot bubble a
   reason it did not copy (`:184-190`, `test_releaseStillBubblesEthReason`).
4. **Two of the four `incorrect-equality` results are in `cancel`, not on `data.length` tests.** The
   plan described them as "`amount == 0`, `data.length` tests". `:266` and `:267` are the `eta == 0`
   absence sentinel for `queued[hash]`. The disposition (`design`, comparisons against zero rather
   than balances) survives; the description did not.
5. **`reentrancy-events` on `propose` and `applyQueued` is not the benign self-call the plan
   assumed** — it is design for a different reason. `_selfCall` is `address(this).call(action)` with
   arbitrary calldata, and a proposed `distribute(token)` is not `onlySelf`, so foreign code *can*
   run inside the self-call. What makes it design is that the inner `distribute` takes the transient
   lock, so a reentrant `propose`/`applyQueued` is refused by `notLocked`, `Queued` is already
   emitted before the call, and the only visible effect is that an inner `Distributed`/`Escrowed`
   log precedes `Applied(hash)` — which is the true order. The third `reentrancy-events`, on
   `DistributionFactory.create`, *is* a false positive: `init` on a just-placed clone runs only the
   implementation the factory deployed and makes no external call.
6. **`create` accepts a zero `owner_` and nothing documents that it does.** `docs/REFERENCE.md:38`
   documents `owner() == address(0)` as "renounced", but nothing says a clone can be *born* that
   way, and no test asserts it — the renounced state is covered only through
   `transferOwnership(address(0))` (`test_renounceClearsQueue`,
   `test_renounceEmitsOwnershipTransferred`). Not fixed here; see § Open questions.
7. **`forge snapshot --check` after a Slither run costs 13.4 s and still passes.** Worth knowing
   because the `forge lint` hazard `AGENTS.md` already records has the same shape and a *different*
   consequence: lint makes `--check` exit 0 on code it never ran, where Slither only makes it slow.
   Conflating the two would over-guard the gate.
8. **The 9 results the gate excludes, one line each** (`assembly` ×5, `low-level-calls` ×4; the full
   list with locations is `SECURITY.md` § The 9 results the gate excludes): the memory-safe `call`
   at `_push:411-414` **is** F6's fix; `_bubble:421-425` is the only way to re-raise another frame's
   revert data, which decision 24 needs; `create:472-482` is solady's `LibClone.initCode_PUSH0`
   byte for byte; `predict:492-498` is that init code hashed instead of deployed, so the two cannot
   drift; `App._requireChunk:202-206` is F11's fix and Solidity exposes no first-byte read;
   `_push:408,417` raw calls are the point, since a push must not revert the distribution;
   `_selfCall:377` is the timelock reaching its own setters; `claim:207` is the uncapped exit F5's
   fix added; `_balance:385` is a `staticcall` so a codeless token fails the decode. None carries a
   claim, and none is a finding.

## Open questions

### Does `create` refuse a zero `owner_`, or is a distribution born renounced a documented shape?

**Question.** `init` (`src/Distribution.sol:134`, written at `:139`) and
`DistributionFactory.create` (`:459`) accept `owner_ == address(0)`, so a clone can exist with no
owner from its first block. Slither's `missing-zero-check` is row 14. The plan named this the one
result that deserves a real answer and wrote it as a stop-and-escalate.

**Options and costs.**
(a) **Documented shape, no code.** Zero cost in `src/`; `owner() == address(0)` is already a
reachable, fully supported, documented state (`docs/REFERENCE.md:38`: "the zero address means
renounced"), the renounce branch produces it deliberately (`:291-298`), and an ownerless clone still
distributes, releases and claims forever — nothing is stuck, only `propose` closes. The zero owner is
on chain in `Created(distribution, owner_)` (`:484`), and no stranger can impose it, because the
salt's top 20 bytes must equal `msg.sender` (`:468`). Cost: a deploying key that leaves the field
empty gets an immutable splitter it cannot undo, and it learns that from the log rather than from a
revert. Two non-`src/` follow-ups would close that gap — one sentence in `docs/REFERENCE.md` saying
`create` accepts a zero owner, and a test asserting the shape.
(b) **A one-line check in `src/`.** `if (owner_ == address(0)) revert …` in `init` or `create`.
Costs: it is M03 reopened after the `src/` freeze, a new `.gas-snapshot`, a bytecode and address
change for the factory and the implementation, and a fourth review of a tree three reviews have
already read — and it removes a shape the renounce branch keeps, so the contract would refuse at
`create` what it permits two transactions later.

**Recommendation.** (a). The state is documented, reachable by design, and harmless to everyone but
the key that chooses it, and that key is the only one who can choose it.

**Default and what it blocks.** If no ruling comes, (a) stands: `SECURITY.md` row 14 says `design`
and no `src/` byte moves, so this task does not block and m04-t03 may start on this PR's merge. A
ruling for (b) stops t03 as well, since it changes the addresses t03 would send to.

**Where the ruling is recorded.** `docs/ROADMAP.md` § Decisions, as the next decision number, with
the issue titled `decision: does create refuse a zero owner_, or is a born-renounced distribution
documented?`.

---

**The gate.** No Slither result is a `fix` — the 23 gated results are 13 `design`, 7
`false positive`, and 3 covered by F1, F6 and F8 — so on this PR's merge **m04-t03 may send its
first testnet transaction**, subject only to the `owner_` ruling above, whose default is to change
nothing.
