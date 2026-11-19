# m05-t01b — handoff

PR: #292 · Branch: `m05/t01b-self-review` · 2026-11-19

Decision 56's three additions are in: `docs/THREAT_MODEL.md` names every actor, token class and
chain with the test that holds each assumption; `make coverage` prints the `src/` figures and fails
one point under them; and a `slither-mutate` campaign over `src/` is committed under
`audits/mutation/e770054/` with a row for each of its 92 survivors. The campaign is the part that
did not go to plan — the tool mutates one contract per section and **silently dropped
`DistributionFactory`**, the second contract declared in `src/Distribution.sol`, so the record is
two logs and the scope question went back to the architect before any test was written
([#272](https://github.com/dnznlabs/rake/issues/272#issuecomment-7021222156), ruled). 29 survivors
got a test, from 15 new tests; 2 are `unreachable`; 61 are `equivalent`, 5 of them pinned by a test
that passes on both the original and the mutant. No survivor is a real defect, so there is no
§ Stop, and no `src/` byte moved.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | `grep -oE '(test_\|testFuzz_\|invariant_)[A-Za-z0-9_]+' docs/THREAT_MODEL.md \| sort -u` → **63** names (≥ 20 required); `comm -23 /tmp/named /tmp/have` against `forge test --list` prints **nothing**. Baseline: `test -e docs/THREAT_MODEL.md` → 1 on `main` |
| 2 | pass | `grep -c -i '^## ' docs/THREAT_MODEL.md` → **5** (≥ 4); `grep -c -i 'SOL-'` → **64** (≥ 10); § Checklist diff names `Cyfrin/audit-checklist` `008855f` and `pashov/audits` `5550be9`; `grep -c -i '| open'` → **2** after the review re-dispositioned the `propose` rows (see row 11), and **two** rows carry `none —` — one in § Token classes, one in § Chains, **neither in § Actors**, so every actor row names a test |
| 3 | pass | `make coverage` → **exit 0**, `Ran 6 test suites … 100 tests passed, 0 failed`, both `src/` rows printed, `100 = 124 − 21 − 3`. Floors `App 95/99`, `Distribution 89/91` against measured `96.20 %/100.00 %` and `90.16 %/92.11 %`. **It bites:** one floor raised to 99 in a scratch copy → **exit 1**, `coverage-floor: src/Distribution.sol lines 90.16% is under its floor of 99%`. **Row count gated:** with a scratch `src/Foo.sol` → **exit 2**, `parsed 2 src/ rows, but src/ holds 3 file(s): src/Foo.sol`, deleted after, `ls src/*.sol \| wc -l` → **2**. Baseline: `No rule to make target 'coverage'` on `main` |
| 4 | pass | `SKIP_NAMES` is **21**, exactly the optimizer-off failures: `comm` both ways against the extraction differs only by `setUp`, which `TableCapTest` contributes and the script excludes **by path**. All 21 appear in `forge test --list`, **0** absent; `forge test --list --match-path test/TableCap.t.sol` → **3**. `FOUNDRY_OPTIMIZER=false forge test` → exit 1, **100 passed / 22 failed, 122 enumerated** — the coverage run's own totals. The prescribed extraction (`grep -E '^\[FAIL'` then `grep -oE '\] name\('`) → **22 unique names from 44 `[FAIL` lines**, and that equals forge's own `Encountered N failing tests` sum: ColdStipend 2 + Distribution 18 + PushGas 1 + TableCap 1 = **22**. Per name, **42 runs, 21 behaving as the list claims, 0 mismatches** |
| 5 | pass | `.github/workflows/ci.yml`: `coverage` step runs `devbox run -- make coverage`, placed after `gas snapshot` and before `slither`, for the rebuild-cost reason the step's own comment records |
| 6 | pass | `ls audits/mutation/*/campaign*.log` → `campaign.log` and `campaign-factory.log`. Headers carry commit `e770054`, `slither 0.11.5`, `forge 1.7.1-dev`, host, wall times **11,644 s** and **522 s**, `exit: 0`, and the score **per contract and overall** — `Distribution 529 of 584`, `App 186 of 223`, `DistributionFactory 40 of 40`, `overall 755 caught of 847 compiling, 92 uncaught`. Baseline: `ls audits/mutation` → no such directory on `main` |
| 7 | pass | `awk '/^## Mutation/,/^## What the review did not cover/' SECURITY.md \| grep -cE '^\| [A-Z]{2,4} \|'` → **92**, equal to the uncaught count, which § Mutation's first line states against the 847 denominator |
| 8 | pass | **29 of 29 kill proofs pass** — each named test passes on pristine source and fails with the survivor's file copied over it (10 App pairs, 19 Distribution pairs, `pristine=0 mutant=1` throughout). The **5 pinned equivalences pass the other way round** (`pristine=0 mutant=0`); a pin that killed its mutant would mean the row was misclassified. `git diff --name-only origin/main -- src/` prints **nothing** |
| 9 | pass | `forge test` → exit 0, **124 passed, 0 failed** (107 at `e770054` plus 17 new). `forge snapshot --check` → **exit 0** after `forge build --force`; `.gas-snapshot` is **124 rows**. `node --test test/*.test.mjs` → exit 0, **175 tests, 175 pass, 0 fail**. `forge build --force` → `Compiler run successful!` with **0** `Warning` lines; `make fmt` exit 0; `make slither` exit 0, `0 result(s) found` |
| 10 | pass | `grep -c -i 'coverage floor' audits/README.md scripts/audit.sh` → **1** each. The provenance field computes `755 of 847 caught (compiling mutants, from 2 log(s) in audits/mutation/e770054/)`, and the floors field `App 95/99 · Distribution 89/91`, both read from the tree |
| 11 | pass | The PR closes [#272](https://github.com/dnznlabs/rake/issues/272). **Corrected at review:** this row read "there is no `open` row" while row 2 counted five, which was a contradiction inside this file. `docs/THREAT_MODEL.md` § Open list now carries **two** `open` rows naming two findings, each with an issue — [#127](https://github.com/dnznlabs/rake/issues/127) (`carried`, `m04`, open) for the native-balance alias and [#293](https://github.com/dnznlabs/rake/issues/293) (`carried`, `m05`, opened at review) for views readable mid-`distribute` — and **two** `none —` rows whose reason the criterion accepts: ERC-1363 is `none — decision 28`, and the § Chains alias row is the same finding as SOL-Token-FE-5 so #127 carries it. The three `propose`-validation rows (`:110`, `:154`, `:159`) now read `design — decision 25`: [#54](https://github.com/dnznlabs/rake/issues/54) is **closed** (2026-10-31, completed), decision 25 ruled the shape documented rather than validated in `propose` or cancellable (`docs/ROADMAP.md:316-320`), and `SECURITY.md:446` already recorded it as documented and not changed. So `Carries forward: #127, #293` |

## Deviations from the plan

- **The campaign is two invocations, not one.** The plan's command names
  `Distribution,DistributionFactory,App` in a single run. That run sections only `Distribution` and
  `App`: its mutated lines stop at `:423` and the factory starts at `src/Distribution.sol:432`,
  zero mutants at or after it. A second run naming the factory alone produces
  `campaign-factory.log`. Reported before writing any test and **ruled by the architect** on
  [#272](https://github.com/dnznlabs/rake/issues/272#issuecomment-7021222156): the factory's
  survivors join § Mutation as one record, the score is stated per contract for all three, and
  § Provenance says why there are two logs. `make mutate` now runs both; the first invocation is
  left naming all three so it still reproduces the committed log, and the gap stays visible in it.
  The campaign-of-record scope and the one-PR split were ruled in the same thread
  ([7021073832](https://github.com/dnznlabs/rake/issues/272#issuecomment-7021073832),
  [7021378804](https://github.com/dnznlabs/rake/issues/272#issuecomment-7021378804)); the
  classification table they rest on is
  [7021368184](https://github.com/dnznlabs/rake/issues/272#issuecomment-7021368184) and the finished
  factory figures are
  [7021439731](https://github.com/dnznlabs/rake/issues/272#issuecomment-7021439731).
- **The coverage floors were raised, not inherited.** `e770054`'s floors were 91/91 and 88/88; the
  new tests moved `App` to 96.20 %/100.00 % and `Distribution`'s branches to 92.11 %, and the plan's
  own rule is "the measured figures rounded down and one point under". Left alone they would sit
  five points under the figures `SECURITY.md` prints, which is a gate that does not hold the number
  the reader is shown. Now 95/99 and 89/91; `App.sol`'s 13 branches make one branch 7.7 points, so
  99 means all 13.
- **`scripts/audit.sh`'s mutation-score field now sums every `campaign*.log` in the newest campaign
  directory, and picks that directory by each log's own `started:` header.** It globbed one
  `campaign.log` and would have reported `715 of 807` — short by a whole contract, and a score
  missing a contract reads exactly like a complete one. **Amended at review:** the first fix still
  chose the directory with `ls | tail -1`, which is lexicographic and wrong twice over, both
  measured: with the `<sha>-factory` sibling present — which `mk/10-forge.mk` must create, because
  `slither-mutate` `rmtree`s its own `--output-dir`
  (`slither/tools/mutator/__main__.py:244-245`) and would otherwise delete the first run's
  survivors — the field read `not recorded`; and with a later campaign whose short sha sorts
  earlier it kept reporting the older directory's figure. Selecting on the header fixes both and
  leaves the committed figure unchanged at `755 of 847`. A short sha has no order, so no
  name-based rule can work.
- **`.pre-commit-config.yaml`'s large-file exclusion was extended to `audits/mutation/`.** The
  620 KB `campaign.log` exceeds the 500 KB default. This follows the exclusion the file already
  carries for a leg's transcripts, for the same reason: the log is tool output committed as the
  record, and trimming it would make the record unreproducible.
- **Both campaign headers were completed by hand after the runs**, adding the per-contract and
  overall score lines AC 6 asks the header to carry. The plan says that block is written by hand, so
  this is its form rather than a new mechanism; the lines are computed from each file's own class
  summaries and the tool output below them is byte-for-byte as emitted.
- **The branch was renamed.** The tree was prepared as `m05/t01b-selfreview`; the plan's § Plan says
  `m05/t01b-self-review`, which is what it is now. Both campaign logs were written before the rename
  and record the old name — stated in each header rather than edited, because a provenance record
  should say what the run said.
- **`coverage:` and `mutate:` gained the `libs` prerequisite** that `main` introduced for every
  other forge target while this branch was open (`db28848`). The branch was rebased onto
  `origin/main` (39 commits) and the only conflicts were in `mk/10-forge.mk`, both from that change.

## Decisions

- **Forge's own per-suite failure totals are the cross-check, not a parsed name list.** Two
  extraction forms were measured here and both were wrong in the same direction: a
  `\[FAIL[^]]*\]`-style class stops at a fuzz counterexample's embedded `]` and dropped two
  `testFuzz_` names, and a `]` anchor without the `[FAIL` prefix matches `[PASS]` lines too and
  returned all 122. `Encountered N failing tests in <suite>` cannot be mis-parsed and is what AC 4
  rests on. Recorded in `SECURITY.md` § Why 22 of the 124 tests are excluded.
- **A survivor whose equivalence is a control-flow argument gets a pinning test.** Four were argued
  rather than derived from an arithmetic identity; the architect ruled each should be pinned, so
  `test_renounceLeavesNoPendingOwner` and `test_removingTheLastPendingEntryKeepsTheQueue` assert that
  the original and mutated paths reach the same observable state, and `test_tableValidation` already
  did for the third. Their cells read `equivalent (pinned: test …)`. The other 56 `equivalent` cells
  cite the identity they rest on.
- **The 92 survivor sources are committed alongside the unified diff.** `patches_files.txt` is the
  same 92 changes in 40 KB, but AC 8's re-run form is "copy the survivor's file over its source", so
  the files are the record and the patch is the convenience. The directory adds 2.5 MB.

## Discoveries

- **`slither-mutate` drops the second contract declared in a shared file, silently.** It lists it
  under `Preparing to mutate contracts` and then emits no section for it. Any campaign on a repo
  where two contracts share a file is short by one unless each is named in its own invocation. This
  is the finding behind the deviation above and it is not rake-specific.
- **A `--test-cmd 'true'` probe undercounts generation by a lot.** It predicted 26 factory mutants;
  the real oracle attempted 80 and compiled 40. Useful to answer "does a section appear at all",
  useless as a count.
- **A contended campaign reads as a better one.** Campaign 1 at the same commit returned 905
  compilation failures against campaign 2's 432, and 2 uncaught against 92 — `334 of 336`, a 99.4 %
  score produced by discarding three quarters of the population. A compile-failure count far above a
  comparable run is the signal.
- **`make coverage` reports only on a fresh compile.** Run straight after another `forge coverage`
  it prints `Nothing to compile`, emits no summary, and the script stops at `no 'Ran N test suites'
  line` — failing safe, but it is not a floor result. A scratch copy run from **outside** the
  repository returns the same empty result, which is why AC 3's red proof copies the script to a
  dotted name inside `scripts/`.
- **Growing a test contract moves every gas row in it.** 83 of 100 pre-existing `.gas-snapshot`
  figures moved, all upward, median +452 and max +36,482 on `test_tableCapBoundary`. The control:
  `ColdStipendTest`, `PushGasTest` and `TableCapTest` — the three suites not edited — moved **0**
  rows, and `src/` is byte-identical to `origin/main`. It is test-contract dispatch, not behaviour,
  but a reviewer reading the diff should know which it is.
- **`at` is a future keyword in solc 0.8.38.** `uint256 at` compiles with `Warning (6335)`, which CI
  fails on. Renamed to `moment`.
- **lcov reports `Distribution.sol:296` and `:310` uncovered while they execute.**
  `test_renounceLeavesNoPendingOwner` runs `:296` and asserts the state it leaves. Same
  `--ir-minimum` source-map approximation as the assembly rows, on lines that are not assembly.
- **The uncovered list and the survivor list pointed at the same three lines.** `App.sol:121`,
  `App.sol:155-156` and `Distribution.sol:212` were uncovered *and* survivors, and closing them as
  survivors closed them as uncovered lines. The plan predicted this ("where § Mutation's survivors
  are expected first") and it held.

## Open questions

None.
