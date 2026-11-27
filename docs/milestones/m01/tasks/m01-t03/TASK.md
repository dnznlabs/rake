# m01-t03 — Definition of done

Milestone: [M01](../../MILESTONE.md) · Phase: 3 — Definition of done

`.gas-snapshot` is tracked and CI fails when the measured gas of any test moves away from it; the
clean-tree criterion is demonstrated on a clone that never had its submodules initialised, not only on
a long-lived checkout; and `AGENTS.md` § Contracts and the dev chain describes the repo as it is after
t02 — two contracts, a factory-only address list, and the snapshot rule. M01 criteria 5 and 7, and the
last task of the milestone.

Written while t02 builds, against `main` at `8cb5dc4` on 2026-10-11, through `devbox run --` (forge
`1.7.1-dev`, the nixpkgs build of 1.7.1). **Gate: t02 merged** — it is: #11 merged 2026-10-11, `main`
at `0bb0403`. Re-run every measurement below on that `main` before trusting it.

> **Refreshed 2026-10-11 on `0bb0403`, after t02 merged.** The t03 acceptance criteria still fail there
> — `git ls-files .gas-snapshot` prints nothing and `ci.yml` has no snapshot step — so the task stands.
> The suite is now 36 tests (13 `AppTest`, 18 `DistributionTest`, 5 `DistributionFactoryTest`;
> `CounterTest` went with `Counter`), and `forge snapshot --snap /tmp/x` writes 36 rows. Step 1's
> "33 rows" and "32 lines" below are the pre-t02 figures and are kept as the record of what was measured;
> expect 36 and 35. Step 4 gained one bullet from the t02 handoff (the `forge script` `Warning:` line).
> No step changed otherwise.

**Setup.** Branch `m01/t03-definition-of-done` off `main` after t02 merges. Hooks only, no `make init`
(t02's setup step says why); verify `ls .git/hooks | grep -v sample` prints `pre-commit` and
`post-commit`.

## Plan

### Step 1 — `.gas-snapshot`

```bash
devbox run -- forge snapshot
git add .gas-snapshot
```

That is the whole step. Measured on `main` today: `forge snapshot` writes 33 rows, one per test
(13 `AppTest`, 2 `CounterTest`, 18 `DistributionTest`) with no trailing newline — so `wc -l` says 32
and `grep -c 'gas:'` says 33; count rows, not lines — and two consecutive runs are byte-identical — the suite has
no fuzz or invariant tests (`grep -rl 'testFuzz\|invariant_' test/` is empty), `via_ir` is on, and the
compiler is pinned, so the numbers are a function of the source alone. After t02 expect the
`CounterTest` lines gone and `DistributionFactoryTest` lines added; the count is whatever
`forge test --list` says, and the handoff records it.

Two things that make the file lie if ignored:

- **It is a function of the forge build.** The host's forge 1.8.1 produces different numbers for the
  same source. Take the snapshot through devbox, as every other command here, or CI (same pin) will
  fail the file you just committed.
- **`forge snapshot` with no flags writes `.gas-snapshot` in place.** Running it to *look* at gas on a
  branch dirties the tree; use `--snap /tmp/x` or `--diff` to compare without writing.

Rejected: `--tolerance <pct>`. The suite is deterministic, so any drift is a real change in the code
under test and should be looked at, not absorbed. If a future fuzz test makes exact matching noisy,
that test's row is the thing to fix (fixed seed, or exclude it), not the threshold.

**Check.** `git ls-files .gas-snapshot` prints the path; `devbox run -- forge snapshot --check` exits 0
and prints no diff. Then change one test's gas on purpose — add a storage write to any one test —
and `forge snapshot --check` exits 1 with that row in the diff; revert before committing. The red
demonstration goes in the handoff: a check that has never failed has not been shown to check anything.

### Step 2 — CI runs the check

`.github/workflows/ci.yml` runs `build`, `fmt`, `test`, then `working tree clean`. After `test`, add:

```yaml
      - name: gas snapshot
        run: devbox run -- forge snapshot --check
```

`--check` compares against `.gas-snapshot` by default and exits 1 on any mismatch, printing the diff
(`forge snapshot --help`, pinned forge). It re-runs the suite; the added CI time is an estimate of
seconds, not minutes — `forge test` on `main` today runs 33 tests in 8 ms wall and the compile is
cached from `build`. Measure it on the PR's first run and put the number in the handoff. A direct `forge` invocation, like the `build` step, rather than a new make target: the
double-colon `test::` would run it twice locally for no gain, and a `snapshot` target is a one-liner
nobody needs wrapped.

Why not fold it into the existing `test` step: a snapshot failure should read as "gas moved", not
"tests failed", in the CI log and in the PR check list.

**Check.** The PR's CI is green with the new step listed. Then the red demonstration in CI: push one
commit that perturbs one test as in step 1 and watch the `gas snapshot` step fail with the row named,
then revert it. The two run URLs go in the handoff.

### Step 3 — criterion 7 on a clean clone

The long-lived checkouts have had their submodules since day one, so they never exercise the path CI
cannot see either: `actions/checkout` with `submodules: recursive` initialises them before forge
runs. The path that bit the scaffold — forge installing the submodules itself and writing
`foundry.lock` — is only reachable from a clone that has none. Measured today on `main`:

```bash
git clone <your own clone of this repository> /tmp/rake-clean && cd /tmp/rake-clean     # your own clone path
ls lib/forge-std | wc -l                                              # 0 — submodules not initialised
devbox run -- forge build --force                                     # "Missing dependencies found. Installing now..." then Compiler run successful!
git status --porcelain                                                # empty
diff foundry.lock <your checkout>/foundry.lock && echo LOCK IDENTICAL # identical
```

`forge` fetched `forge-std` and `solady` from GitHub at the revs in the tracked `foundry.lock`, so
this step needs network; `devbox.lock` is tracked, so the toolchain inside the clone is the same pin.
On the clean clone, run the four commands criterion 7 names in order and show the tree empty after
each: `forge build --force`, `forge test`, `forge snapshot`, and `make deploy` against a throwaway
anvil (t02's step 5 script, which also covers criterion 6 one more time on the final tree). The
broadcast logs for chain 31337 are gitignored, and `forge snapshot` rewrites `.gas-snapshot` with the
same bytes, so all four leave `git status --porcelain` empty — that is the claim; the handoff carries
the four outputs. Then delete the clone.

**Check.** The handoff shows `git status --porcelain` empty after each of the four commands on a clone
whose `lib/` started empty, with the `Installing now` line as proof it started empty.

### Step 4 — `AGENTS.md` § Contracts and the dev chain

The section is the scaffold's and still describes a repo with one placeholder contract. Edit that
section only (`AGENTS.md:18–30` on today's `main`); the dapp and design sections are M02's. Bullets to
add or amend, in the section's existing voice — one line each, no prose:

- `src/Distribution.sol` holds both contracts: `Distribution`, the primitive, and `DistributionFactory`,
  which deploys the implementation in its constructor and creates PUSH0 clones through CREATE2. The
  ABI is fixed by `docs/ROADMAP.md` decisions 3 and 9; a rename is a roadmap change, not an edit.
- `make addresses` lists `App` and `DistributionFactory`. The implementation is created inside the
  factory's constructor and is not a `CREATE` transaction in the broadcast log; read it with
  `cast call <factory> "implementation()(address)"`.
- `.gas-snapshot` is tracked and CI runs `forge snapshot --check` with no tolerance. Regenerate with
  `devbox run -- forge snapshot` after any change to `src/` or `test/`, through devbox only — the
  host's forge gives different numbers. To look without writing, `--diff` or `--snap /tmp/x`.
- The existing line "`forge build` must print no `warning[` line" becomes "no `warning[` and no
  `Warning (` line" — the second is solc's format and CI greps for both since t01.
- The placeholder page under `app/` reads the factory's `implementation()` until M02 replaces it.
- `forge script` prints `Warning: Detected artifacts built from source files that no longer exist`
  when `out/` still holds artifacts for a deleted source (t02 handoff, after `Counter` went). It is
  `Warning:`, not solc's `Warning (` or lint's `warning[`, so neither CI grep sees it, and it clears
  with one `forge build --force`. Not a build warning; do not widen the CI assertion for it.

Rejected: a new section. The scaffold's § Contracts is where an agent looks; a second section about
the same contracts is the kind of duplication the file warns against.

**Check.** `git diff main -- AGENTS.md` touches only lines inside § Contracts and the dev chain; the
file still reads top to bottom as one voice.

### Step 5 — the tree

`git diff --stat main` names exactly `.gas-snapshot`, `.github/workflows/ci.yml`, `AGENTS.md`, and
your `HANDOFF.md`. No change under `src/`, `test/`, `scripts/`, `app/`, `mk/`, `procs/`, `Makefile`,
`foundry.toml`, `README.md`.

## Acceptance criteria

M01 criteria 5 and 7, and the task's own, in the order to run them, all on `main` after t02:

- `git ls-files .gas-snapshot` prints the path; `devbox run -- forge snapshot --check` exits 0 with
  no diff; `grep -c 'gas:' .gas-snapshot` equals the number of tests `forge test --list` prints.
- `.github/workflows/ci.yml` has a step running `forge snapshot --check`; the PR's CI is green with
  it; the handoff links one CI run where the step failed on a deliberately perturbed test, and the
  commit that reverted it.
- On a clone whose `lib/` started empty (the `Installing now` line in the handoff), `git status
  --porcelain` is empty after each of `forge build --force`, `forge test`, `forge snapshot` and
  `make deploy` against anvil, and its `foundry.lock` is identical to the tracked one.
- `make addresses` on that deploy lists `App` and `DistributionFactory` and nothing else (criterion 6,
  re-shown on the final tree).
- `AGENTS.md` § Contracts and the dev chain names both contracts, the factory-only address list and
  how to read the implementation, the snapshot rule with the devbox-only caveat, and both warning
  formats; `git diff main -- AGENTS.md` is confined to that section.
- `devbox run -- forge build --force` clean of both warning formats; `forge lint` and
  `forge fmt --check` print no finding; `git diff --stat main` names only the files step 5 lists.

When these pass, every M01 criterion is met: 1 (t01), 2 and 3 (t01 + t02), 4 (t01), 5 and 7 (this
task), 6 (t02, re-shown here). The architect then closes M01 in `MILESTONE.md` and `ROADMAP.md`.

## Out of scope

Any change to `src/`, `test/` or `scripts/` — if the snapshot or the clean clone exposes a defect
there, it is a finding in `HANDOFF.md` and a task, not a fix here. `README.md`, the dapp sections of
`AGENTS.md`, anything under `app/` (M02). A `make snapshot` target or any `mk/` change. A tolerance on
the check. Branch protection or required status checks (not available on this plan; `ROADMAP.md`
§ Not on the roadmap). The `PUSH_GAS` measurement and `SECURITY.md` (M03).

## Open questions

Each with the default you take if no answer arrives before it matters.

1. **Where the gas-snapshot step sits in CI.** Default: after `test`, before `working tree clean`,
   as its own step. Alternative: inside the `test` step. Rejected because a gas move should be named
   as one in the check list.
2. **Whether `forge snapshot` also goes into a pre-commit hook.** Default: no. `scripts/pre-commit.sh`
   is the org's, the snapshot takes a full test run, and CI is the gate that matters; a hook that
   rewrites a tracked file during commit is the kind of surprise t01's handoff already had to rule out
   for `foundry.lock`.

## Context

- [`MILESTONE.md`](../../MILESTONE.md) criteria 5, 6 and 7; the phase-3 row.
- [t02 `TASK.md`](../m01-t02/TASK.md) step 5 (the throwaway-anvil script this task reuses) and its
  setup step (hooks only); [t01 `TASK.md`](../m01-t01/TASK.md) step 3 and
  [`HANDOFF.md`](../m01-t01/HANDOFF.md) § Discoveries on when `foundry.lock` is written.
- `.github/workflows/ci.yml` as of `8cb5dc4` — four steps plus the clean-tree check; the `build` step's
  two warning greps are the pattern for a step that proves it ran before asserting what it did not
  print.
- `AGENTS.md:18–30` on `8cb5dc4` — the section step 4 edits.
- Pinned forge: `forge snapshot --help` — `--check [<FILE>]` "exiting with code 1 if they do not
  match … outputs a diff", `--tolerance <pct>`, `--snap <FILE>`, `--diff`.
