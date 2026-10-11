# m01-t03 — handoff

PR: #14 · Branch: `m01/t03-definition-of-done` · 2026-10-11

`.gas-snapshot` is tracked at 36 rows, one per test, taken through devbox on the merged `main`; CI runs
`forge snapshot --check` as its own step between `test` and `working tree clean`, and that step has been
watched to fail and go green again on the branch; criterion 7 is demonstrated on a clone whose `lib/`
started empty, through all four commands, with its `foundry.lock` and its regenerated `.gas-snapshot`
both byte-identical to the tracked ones; and `AGENTS.md` § Contracts and the dev chain now names both
contracts, the factory-only address list, the snapshot rule and both compiler-warning formats. Both open
questions took their documented defaults. One thing turned up that the plan could not have known and
that bears directly on this check — `forge lint` leaves the build cache claiming a file is compiled
without its artifact, and the next `forge snapshot --check` then passes without running the suite it
belongs to; it is in § Discoveries, unfixed, and it cannot reach CI.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — snapshot tracked, `--check` exits 0, rows equal the test count | pass | `git ls-files .gas-snapshot` → `.gas-snapshot`. `devbox run -- forge snapshot --check` → exit `0`, and `grep -c 'Diff in'` on its output → `0`. `grep -c 'gas:' .gas-snapshot` → **36**; `wc -l < .gas-snapshot` → **35**, one short because the file has no trailing newline (`tail -c 1 \| xxd` → `00000000: 29 )`). `forge test --list` → **36** test names (13 `AppTest`, 18 `DistributionTest`, 5 `DistributionFactoryTest`), so rows equal tests. Determinism checked rather than assumed: two consecutive `forge snapshot` runs `cmp`ed → `IDENTICAL`, and `grep -rl 'testFuzz\|invariant_' test/` → empty. |
| 2 — CI has the step, green with it, plus a red run and its revert | pass | `.github/workflows/ci.yml` gained a `gas snapshot` step running `devbox run -- forge snapshot --check`, after `test` and before `working tree clean`. **Green**, step listed and successful: [run 38121965549](https://github.com/dnznlabs/rake/actions/runs/38121965549) (`9202e35`) and [run 38122168806](https://github.com/dnznlabs/rake/actions/runs/38122168806) (`204a6ba`, the current head). **Red**: [run 38122048155](https://github.com/dnznlabs/rake/actions/runs/38122048155) on `f165ff5`, which added one storage write to `AppTest::test_onlyOwner`. That run's `gas snapshot` step printed `Ran 3 test suites …: 36 tests passed, 0 failed, 0 skipped` and then `Diff in "AppTest::test_onlyOwner()": consumed "(gas: 33168)" gas, expected "(gas: 11062)" gas`, exited 1, and `working tree clean` was skipped — the failure reads as a gas move, not a test failure, which is the reason step 2 gave for a separate step. Reverted by `495274d`, and `test/App.t.sol` does not appear in `git diff --stat origin/main`. |
| 2 — added CI time | pass | On the PR's first run, [38122337657](https://github.com/dnznlabs/rake/actions/runs/38122337657), the step ran `07:44:32Z → 07:44:33Z` — **1 s**, which is the floor of the API's one-second step resolution, so read it as ≤1 s. The same on the two branch runs (`07:37:41Z → 07:37:42Z`; `07:41:22Z → 07:41:23Z`), and the PR's second run resolved it to **0 s** (`07:44:45Z → 07:44:45Z`). As the plan predicted, it is seconds and not minutes: the step re-runs the suite but the compile is already cached from `build`. Whole-run totals are dominated by noise and cannot show the step at all: `main` without it ran 48 s, 57 s and 51 s (runs `38121959748`, `38121392014`, `38120109540`), the branch and PR with it 41 s, 45 s, 61 s and 53 s. |
| 3 — the four commands on a clone whose `lib/` started empty | pass | `git clone --branch m01/t03-definition-of-done /home/openclaw/src/rake /tmp/rake-clean`, then `ls lib/forge-std \| wc -l` → `0` and `ls lib/solady \| wc -l` → `0`. `devbox run -- forge build --force` opened with `Missing dependencies found. Installing now...`, `Submodule 'lib/forge-std' … registered`, `Submodule 'lib/solady' … registered`, `Cloning into '/tmp/rake-clean/lib/forge-std'...`, `Cloning into '/tmp/rake-clean/lib/solady'...`, `Updating dependencies in /tmp/rake-clean/lib`, then `Compiling 35 files with Solc 0.8.34` / `Compiler run successful!` — that is the proof the clone started empty. `git status --porcelain \| cat -A` → empty after **each** of `forge build --force`, `forge test` (`36 tests passed, 0 failed`), `forge snapshot` (`36 tests passed, 0 failed`) and `make deploy` (exit 0). `diff foundry.lock <checkout>/foundry.lock` → `LOCK IDENTICAL`. The clone was deleted afterwards. |
| 4 — `make addresses` lists `App` and `DistributionFactory` and nothing else | pass | On that clone's deploy, against a throwaway `anvil --port 8599` started and killed by the script, `make addresses` printed exactly two lines: `App 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` and `DistributionFactory 0x5FbDB2315678afecb367f032d93F642f64180aa3`. No `Counter`, no `(no code …)` note. `cast call <factory> "implementation()(address)"` → `0x8684eB16Dc607a8Dc3b4bade166A568A2EAd47c8`, whose `cast code` is 16,615 characters of hex, so non-empty. |
| 5 — `AGENTS.md` § Contracts, diff confined to it | pass | The section gained four bullets and amended one: `src/Distribution.sol` holding both contracts with the ABI fixed by `ROADMAP.md` decisions 3 and 9; `make addresses` listing `App` and `DistributionFactory` with `cast call <factory> "implementation()(address)"` as the way to read the implementation; the `app/` placeholder page reading `implementation()` until M02; `.gas-snapshot` tracked with `forge snapshot --check` at no tolerance, regenerated through devbox only, `--diff`/`--snap` to look without writing; and the `forge script` `Warning:` bullet. The amended line now reads "must print no `warning[` and no `Warning (` line". `git diff origin/main -- AGENTS.md` is one hunk, `@@ -18,15 +18,29 @@`, entirely between the `## Contracts and the dev chain` heading and the `<!-- fragment: dapp -->` marker. Both new factual claims were checked against the repo rather than copied: `docs/ROADMAP.md` has decisions 3 (name) and 9 (two ABI names), and `app/src/index.html:115` calls `implementation()`. |
| 6 — build clean of both formats, lint and fmt silent, tree as step 5 lists | pass | `devbox run -- forge build --force` → exit 0, `grep -c 'Compiler run successful'` → `1`, `grep -c 'Warning ('` → `0`, `grep -c 'warning\['` → `0`. `devbox run -- forge lint` → exit 0, no finding. `devbox run -- forge fmt --check` → exit 0. `git status --porcelain` → empty. `git diff --stat origin/main` → `.gas-snapshot \| 36 +`, `.github/workflows/ci.yml \| 3 +`, `AGENTS.md \| 16 +-` plus this handoff — nothing under `src/`, `test/`, `scripts/`, `app/`, `mk/`, `procs/`, and no `Makefile`, `foundry.toml` or `README.md`. |

Every forge, cast, anvil and make command above ran through `devbox run --` on forge `1.7.1-dev` (the
nixpkgs build of 1.7.1), never the host's 1.8.1, which measures the same source differently and would
have committed a snapshot that fails CI on its first run.

## Deviations from the plan

1. **The diff is taken against `origin/main`, not the local `main` ref, and `origin/main` was merged
   into the branch mid-task.** PR #12 merged at `07:36:49Z`, about a minute after this branch's first
   push, moving `main` from `0bb0403` to `5e3d566`. The local `main` ref could not be fast-forwarded
   from here — it is checked out in another worktree — and left alone it made `git diff --stat main`
   name twenty files, all of them other people's merged work. Merged rather than rebased: the red
   demonstration's commit `f165ff5` is the thing two of this handoff's links point at, and a rebase
   would have moved it off the branch while the CI run kept naming the old SHA. The merge commit is
   `204a6ba`; it carries no changes of mine.
2. **Step 1's "33 rows (13 `AppTest`, 2 `CounterTest`, 18 `DistributionTest`)" is not what was
   committed.** Not a deviation in substance — the plan says to re-run every measurement on the merged
   `main` and let `forge test --list` set the count — but the recorded number is 36, and #12's refresh
   note predicted exactly that. Also measured: `wc -l` is 35, not 32.
3. **The `forge script` bullet was taken from the brief while #12 was still open**
   (`gh pr view 12 --json state` → `OPEN` when step 4 was reached). #12 then merged, and the bullet it
   added to `TASK.md` step 4 is byte-identical to the one in `AGENTS.md`, so the two paths converged
   and nothing needs re-doing.

## Decisions

Both of the plan's open questions reached the point of mattering without an answer, so both took the
documented default.

1. **Where the gas-snapshot step sits in CI** — default taken: its own `gas snapshot` step, after
   `test`, before `working tree clean`. The red run is the argument for it rather than a preference:
   its `gas snapshot` step shows `36 tests passed, 0 failed` immediately above the `Diff in …` line, so
   the check list says "gas snapshot", not "test".
2. **Whether `forge snapshot` also goes into a pre-commit hook** — default taken: no. Unchanged from
   the plan's reasoning, and § Discoveries below adds one more reason: a hook that ran `forge snapshot`
   after a `forge lint` in the same session could rewrite the tracked file from a suite forge never ran.

## Discoveries

- **`forge lint` leaves the build cache claiming an edited file is compiled while writing no artifact
  for it, and the next `forge test`/`forge snapshot` silently drops that file's whole suite.** Measured
  both ways on this branch, from a `forge build --force` baseline of 36 tests: edit `test/App.t.sol`,
  run `forge lint` (`Compiling 1 files with Solc 0.8.34` / `Compiler run successful!`), then
  `forge test --list` → `23` tests and `0` lines matching `AppTest`; `forge snapshot --check` then
  prints `No files changed, compilation skipped` and **exits 0** on code it never ran. Without the
  intervening `forge lint`, the same edit gives 36 tests and `forge snapshot --check` exits 1 with the
  row named. One `forge build --force` clears it. This is the one local path that makes the new check
  vacuous, and it is invisible: the exit code is 0 and the only hint is the `Ran 2 test suites` line.
  CI cannot reach it — it checks out fresh and its first step is `forge build --force` — and the fix is
  out of this task's scope (`mk/`), so it is left for a ruling.
- **The snapshot is reproducible across checkouts, not just across runs in one.** `forge snapshot` on
  the clean clone wrote a file that `diff`s identical to the committed one, on a toolchain installed
  from `devbox.lock` into a fresh directory. That is a stronger claim than the plan's two-consecutive-
  runs check and it is the one CI actually depends on.
- **t01's committed `foundry.lock` still matches what forge writes on a fresh install today.** The
  clean clone's lock, written by forge itself while installing the submodules, `diff`ed identical to
  the tracked one — so the lock is not drifting against the pinned revs.
- `forge build --force` on the clean clone compiled **35** files against 31 in this checkout, because
  the checkout's `out/` still held artifacts and the clone's did not. Neither number is a property of
  the source.
- Nothing outside the task's scope needed attention. No defect surfaced in `src/`, `test/`, `scripts/`
  or `app/` from either the snapshot or the clean clone.

## Open questions

None that need a human. The `forge lint` cache finding above wants a decision from the architect about
whether it earns a task, but it is a finding, not a question — nothing in M01 depends on it.
