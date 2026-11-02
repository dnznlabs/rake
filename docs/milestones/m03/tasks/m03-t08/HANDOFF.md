# m03-t08 — handoff

PR: #143 · Branch: `m03/t08-expiry` · 2026-11-01

`src/Distribution.sol` carries the two changes decisions 39 and 40 ruled from [#133](https://github.com/dnznlabs/rake/issues/133) — a matured action is applicable only for `GRACE = 14 days` after its eta, and anyone may drop it once that window has passed (F9/F13); and the escrowed account can take its own escrow to an address it names, with its own gas (F5, [#95](https://github.com/dnznlabs/rake/issues/95)) — plus the two one-line changes [#136](https://github.com/dnznlabs/rake/issues/136) folds in, the corrected escrow-remedy sentence, and the research PoCs as tests. Fourteen tests were added (72 → 86) and `test_createForwardsValue` flipped; `F8_SUCCEEDS_AT` was re-bisected because the figure moves with the bytecode. No review ran. `src/App.sol` is byte-identical to `b0fb4e3`, and no dapp or widget logic changed — only `#/docs` prose.

**Every figure below is my own measurement at this branch's head, re-run rather than inherited.** Where the architect's spike figures and mine differ, both are stated.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — only `Distribution` moves; ABI gains exactly four names | pass | `git diff --stat b0fb4e3 HEAD -- src/App.sol` → **0 lines**. Non-zero denominator: the same command over `src/` gives 2 lines, ` src/Distribution.sol \| 70 ++++---`, 59 insertions and 11 deletions, and `git ls-tree HEAD src/` is a population of 2 files. ABI via `forge inspect Distribution abi --json \| jq -r '.[]\|select(.type!="constructor")\|.name' \| sort`: **39 → 43**. `comm -13` added exactly `claim`, `Claimed`, `Expired`, `GRACE` (**4**); `comm -23` removed **0**. |
| 2 — `forge test` green, and the seven named tests fail on `71c9f92` | pass | `forge test` → **86 passed, 0 failed, 0 skipped** in 5 suites. The seven failing assertions on `71c9f92` are quoted in *Evidence that each change fails on `71c9f92`* below. `test_renounceFreezes` is **unchanged**: of the 8 removed lines in `git diff origin/main -- test/Distribution.t.sol`, none is inside it (they are the `Test` import, the import-list tail, the `F8_SUCCEEDS_AT` constant, two docstring lines, two assertion messages, and one `_deploy` body line). It passes. |
| 3 — the gate sequence | pass | In order, after `forge build --force`: build **0** `warning[` and **0** `Warning (` (5-line log); `forge test` **86 passed**; `forge snapshot --check` **exit 0**; `forge lint` **0** `warning[`; `forge fmt --check` **exit 0** (last); `devbox run -- node --test test/*.test.mjs` → **62 tests, 62 pass, 0 fail** (62 as the plan expected, none added). The clean `forge lint` is not vacuous: deleting the `cancel` lint comment alone produces exactly **1** `warning[block-timestamp]`, so the two disable comments are load-bearing as the plan says. |
| 4 — sizes stated | pass | `Distribution` deployed bytecode **9,271** bytes (18,542 hex chars halved), **+542** against 8,729. `DistributionFactory` **1,320** bytes, **byte-identical**. Both from `forge inspect <c> deployedBytecode`. |
| 5 — reference and fixtures | pass | `docs/REFERENCE.md` carries a `claim` function row, a `GRACE()` view row, a `Claimed` event row and an `Expired(uint256 eta)` error row (`grep -c`: claim **5**, GRACE **3**, Claimed **1**, Expired **1**). `test/fixtures/abi/selectors.txt` 20 → **22** rows with `claim(address,address) 0x21c0b342` and `GRACE() 0x137d29d9`, written by `devbox run -- tools/abi-vectors.sh`. `test/docs.test.mjs` passes **8/8** and has teeth: dropping the `claim` row alone fails it with `the function table is missing claim`. |
| 6 — `SECURITY.md` rows | pass | F5, F9 and F13 all read **fixed in this PR** and name their tests; `grep -c 'fixed in this PR'` **4 → 7**; `grep -c '^\| F'` **13**, unchanged. F8's two figures are **95,236,000 / 95,237,000** and match `F8_SUCCEEDS_AT = 95_237_000`. The escrow-remedy sentence no longer says a re-table recovers anything. **§ Prior reviews and § The reviewed commit are untouched:** all **14** hunks of `git diff -U0 origin/main -- SECURITY.md` start between lines 61 and 236 (§ Findings, § Carried issues, § Invariants); 0 start in 7–60, 0 at ≥237. |
| 7 — `app/` prose only, and the dev stack still deploys | pass | `git diff --stat origin/main -- app/` touches **only `app/src/index.html`**, 5 insertions and 4 deletions in **3 hunks**, all inside `docs()`; the hunks are quoted below. `git diff --stat origin/main -- app/src/model.js app/src/eth.js app/src/widget.js` → **0 lines** (control: the `app/` form gives 2). `make deploy` against a dev anvil completed `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`, and the new ABI is live on it: `cast call <impl> "GRACE()(uint256)"` → **1209600** (14 days to the second), and the `claim` selector `21c0b342` is present in `cast code`. `node --test` green, as above. |
| 8 — #136 closes on merge | pass | The PR body carries `Closes #136` and `Audit scope touched: src/Distribution.sol`; verified twice through independent paths (REST and GraphQL) — see *Closing-reference verification*. |
| 9 — clean tree | pass | `git status --porcelain` → **0 lines** after the full gate sequence, and again after the dev-chain deploy (`broadcast/*/31337/`, `app/dist/` and `app/chain/` are gitignored). |

## Evidence that each change fails on `71c9f92`

The method is not `git stash` and did **not** revert this worktree. A scratch worktree was detached at `71c9f92` with `lib/` symlinked to this one, and two things were measured in it; it has since been removed.

**1. The branch's tests do not compile against the old ABI.** Copying this branch's `test/Distribution.t.sol`, `test/mocks/Mocks.sol` and `test/DistributionFactory.t.sol` into that tree and running `forge build --force` gives:

```
Error (9582): Member "claim" not found or not visible after argument-dependent lookup in contract Distribution.
   --> test/mocks/Mocks.sol:442:9
```

That is the direct result for the four tests that name `GRACE`, `claim`, `Claimed` or `Expired` — on `71c9f92` those names do not exist, so there is nothing for the assertion to reach. solc stops at the first error, so only the first missing member is reported.

**2. The behaviour itself.** Eight self-contained probes (`test/OldProof.t.sol`, written for this purpose, referencing only the old ABI) assert what `71c9f92` does. **All eight pass there.** Each one passing is the proof that the matching new test fails:

| New test | Fails on `71c9f92` because | Proved by, and its passing assertion |
|:--|:--|:--|
| `test_applyQueuedExpires` | no revert at all past the window | `test_old_applyQueuedNeverExpires` — `d.applyQueued(action, 1)` succeeds at `eta + 14 days + 1` and `assertEq(d.description(), "outside", "the expired action applied anyway")` holds |
| `test_strangerCancelsExpired` | the cancel reverts `NotOwner` instead of succeeding | `test_old_strangerCannotCancelExpired` — `vm.expectRevert(Distribution.NotOwner.selector)` is satisfied, and `assertEq(d.queued(hash), eta, "and the entry is still there, forever")` |
| `test_staleActionExpires` | the older action applies and restores the older table | `test_old_staleMaturedActionResurrects` — at `eta + 180 days` a stranger's `applyQueued(x, 1)` succeeds and `assertEq(d.beneficiaries()[0].account, C, "the stale action resurrected the older table")` |
| `test_claimEthToSelfUncapped` | there is no `claim`; the escrow cannot be moved at all | `test_old_escrowNeverReleasableForHungryRecipient` — `release{gas: 10_000_000}` reverts `ReleaseFailed(address(0))`, `assertEq(d.reserved(address(0)), 0.5 ether, "and it is stuck, with no claim to take it")`, `assertEq(address(h).balance, 0)` |
| `test_claimErc20` | same, on the ERC-20 path | `test_old_blockedErc20EscrowNeverReleasable` — `release` reverts `Blocked(A)` and `assertEq(d.escrowed(address(tk), A), 6000, "with no way for A to redirect it")` |
| `test_renounceEmitsOwnershipTransferred` | an applied renounce emits nothing | `test_old_renounceEmitsNoOwnershipTransferred` — over a non-empty log set, `assertTrue(logs[i].topics[0] != Distribution.OwnershipTransferred.selector, "no OwnershipTransferred log on a renounce")` for every log |
| `test_createForwardsValue` (flipped) | there is one log, not two | `test_old_createForwardsValueLogsNoReceived` — `assertEq(logs.length, 1, "one log only")` and `assertEq(logs[0].topics[0], DistributionFactory.Created.selector)` |
| `test_prefundedAddressLogsReceivedAtInit` | the pre-funded balance is never logged | `test_old_prefundedAddressLogsNothingAtInit` — 3 ether sent to `predict(salt)` before deployment, then `assertEq(logs.length, 1, "one log only")`, `Created` |

## Figures, mine against the spike's

| Figure | Mine | The architect's spike | Reconciliation |
|:--|:--|:--|:--|
| `Distribution` deployed bytecode | 9,271 bytes, +542 | 9,271, +542 | identical |
| `DistributionFactory` | 1,320, byte-identical | 1,320 | identical |
| ABI names | 39 → 43, exactly 4 added | +4 names exactly | identical |
| `forge test` | **86** passed, 0 failed | 70/72 passing with the two planned flips | not comparable: the spike measured a tree with the code but not the tests. 72 baseline + 14 added = 86, all passing. |
| `.gas-snapshot` rows moved | **48** of 72 moved, 24 unchanged, 14 new, 0 removed | 46 of 72 | **mine is 48, the spike said 46.** Both stated; I did not reconcile it away. The shape agrees — see below. |
| `claim` gas, hungry recipient to itself | **122,472** in the clone's frame (123,079 for the whole `take`) | 123,585 | agree within 0.4% on a different harness |
| `F8_SUCCEEDS_AT` | **95,237,000**, reverts at 95,236,000 | the spike only observed the old figure failing | mine is the re-bisection the plan asked for |

On the snapshot: the two groups the plan predicted are both there. The five `DistributionFactoryTest` rows that construct a factory move by **+108,958 to +112,385** each and `test_create2AddressStableAcrossChains` by **+218,129** (two factories — the spike's figure for this row exactly), because every `new DistributionFactory()` constructs 542 more bytes of implementation; the four renounce tests move by **+1,732 to +4,243** (the spike said +1,667 to +4,023). `test_hookRecipientStarvesLaterRows` moves **+370,585**, which is the re-bisected constant itself and not a per-row cost. The plan's "everything else by under 700" is **not quite right in my run**: three rows exceed it — `test_tableValidation` +818, `test_cancelQueuedTransferLeavesPendingOwner` +753, `test_releaseFailedNamesBareWord` +738. Every moved row with both figures is in the PR's snapshot commit message and in the diff of `.gas-snapshot` itself.

## The F8 re-bisection

`F8_SUCCEEDS_AT` is bytecode-dependent, and 542 more bytes of implementation moved it. Bisected **one gas limit per transaction** — one `test_bisect_*` function per candidate in a throwaway `test/Bisect.t.sol`, since `call{gas: n}` forwards only 63/64 of the frame and several ~95M attempts in one transaction starve each other. Sequence: 95,049,000 fails and 96M/100M/110M/130M/160M pass; then 100k steps (95,200,000 fails, 95,300,000 passes); then 10k steps (95,230,000 fails, 95,240,000 passes); then 1k steps (95,236,000 fails, **95,237,000 passes**).

**Old: 95,048,000 / 95,049,000. New: 95,236,000 / 95,237,000. Delta +188,000.** The harness file was deleted before the gate sequence; `ls test/*.t.sol` is the five tracked suites. The one-limit-per-transaction figure also holds in `test_hookRecipientStarvesLaterRows`'s three-sub-calls-in-one-transaction form, which is what asserts it in the suite — two arrangements, same threshold.

## The `#/docs` hunks

Three hunks in `app/src/index.html`, all inside `docs()`, prose only:

- `:1501` — "Once that time has passed, anyone may apply it. Until it is applied, the owner may cancel it." gains "for a window of fourteen days (`GRACE`)" and "once the window has closed the change has expired, can no longer be applied, and anyone may cancel it."
- `:1519` — a new paragraph for `claim` ("A beneficiary can also take what is held for it itself…"), and the gas-allowance sentence gains why `release` cannot pay such a beneficiary at any gas limit and that `claim` does.
- `:1531` — the renounce paragraph drops "or cancelled" (which the expiry rule makes false) and gains "A renounce emits `OwnershipTransferred(previousOwner, 0x0)`…".

No dapp logic: the `ERRORS` map, the pending view, the escrow view and the cancel/claim controls are m03-t09's.

## Deviations from the plan

1. **I worked from `TASK.md` on the unmerged branch, and #141 has not merged.** The plan was read from `origin/docs/m03-t08-plan` (blob `5ef09e8`, 322 lines, one commit `df8917e`), as the architect sanctioned. **At the time of writing, PR #141 is still `OPEN`, `mergedAt` is null, and `docs/milestones/m03/tasks/m03-t08/TASK.md` is absent from `origin/main`** — so the merged text does not yet exist and **the reconciliation the architect asked for cannot be completed here.** The branch blob was re-read at the end of the work and is unchanged from what I started with. **Whoever reviews this must diff the merged `TASK.md` against this handoff**; if the merged wording differs, the merged text wins and this handoff is what needs amending. `main` was `71c9f92` at the start and is still `71c9f92`.
2. **Branch name.** The plan's § Plan says to branch `m03/t08-expiry-claim`; the branch is **`m03/t08-expiry`**, which is the name I was given in writing and the one t07's coordination refers to. The content is unaffected.
3. **The "fails on `71c9f92`" method.** The plan says to check `71c9f92`'s `src/Distribution.sol` into the worktree, run, and restore. I used a **separate detached worktree** instead, for a reason the plan did not anticipate: four of the seven tests name ABI members that do not exist at `71c9f92`, and `test/mocks/Mocks.sol` references `claim`, so **the whole test tree fails to compile** against the old source and no test can run at all. Swapping the file in place would therefore have produced a compile error rather than seven failing assertions, and would have left this worktree in a broken state mid-measurement. Both halves are evidenced above. The scratch worktree is removed.
4. **`test_claimReentrancyLocked` asserts the opposite of the plan's parenthetical, because the plan's is wrong.** The plan says the re-entry is refused `Locked` and "the outer `claim` bubbles that reason (it is longer than a word)". `Locked()` is an **argument-less custom error, four bytes**, so by decision 24's rule the outer `claim` *names* the failure `ReleaseFailed(token)` rather than bubbling it — the same sort `release` applies. No arrangement of re-entry produces a reason over a word: re-entering `distribute` instead also reverts `Locked()`. The test therefore proves both halves and measures the length: a `CallbackToken` hook records the refusal and `assertEq(tk.hookData().length, 4, "which is four bytes, at or under the word decision 24 sorts by")`, and a `ReentrantClaimer` then shows the outer `claim` reverting `ReleaseFailed(address(0))` with the escrow intact. **Nothing in the contract changed for this** — it is the plan's description of existing behaviour that was inaccurate.
5. **The `GRACE` and `OwnershipTransferred` grep counts exceed the plan's.** The plan expects `grep -c 'GRACE' src/Distribution.sol` → 4 "(the constant, two comparisons, one NatSpec mention at least)" and `OwnershipTransferred` → 3. Mine are **5** and **4**, because the plan also instructs that the `@notice` lines on `applyQueued` *and* `cancel` say both things, and that `transferOwnership`'s `@notice` be updated — which is two `GRACE` mentions and one extra `OwnershipTransferred`. The plan's own "at least" covers it.
6. **The plan's test-count instrument is wrong, and `SECURITY.md` now names the right one.** `forge test --list | wc -l` is **not** the test count: the plain listing prints file and suite headers, so it reads **88** for the 72 baseline tests and **102** for these 86. The count comes from `forge test --list --json`. The § Invariants reconciliation was done with a two-way `comm` on that: **86 names on each side, 0 on either side alone.**
7. **One stale comment in the contract was corrected, beyond the lines the plan names.** The `OwnershipTransferred` event's `@dev` said "Emitted on acceptance **only**", which step 3 makes false. It now says "on acceptance and on a renounce". Leaving it would have shipped a comment the same commit disproves.
8. **A `_deploy` overload was added to the suite.** `test_delayZeroOwnerSweepsAtomically` needs a `SweepingOwner` contract as the owner, and the existing `_deploy(uint32, Beneficiary[])` hard-codes `OWNER`. It now delegates to a new `_deploy(address owner_, uint32, Beneficiary[])`, following the file's existing `_escrowFailingToken` overload idiom. This is the one `-` line in the test diff that is a behavioural refactor rather than a figure.

## Decisions

None. The plan's § Open questions is "None", and the three choices it fixed — `GRACE = 14 days` as a constant, a new `Claimed(token, account, to, amount)` rather than reusing `Released`, and `address(0)` as the `Received` sentinel at `init` — were implemented as written. Deviation 4 is a correction of a factual claim, not a design choice.

## Discoveries

- **`SECURITY.md` now names `b0fb4e3` as the reviewed commit while `src/Distribution.sol` has moved**, which milestone criterion 4 does not allow at close-out. This is the state the plan says t07's step 7 restores; it is expected, not a defect of this PR, and § The reviewed commit was deliberately left untouched.
- **The `Received(address(0), …)` sentinel is indistinguishable from a real send by `address(0)`**, which cannot happen on-chain, so the encoding is sound — but an indexer that groups `Received` by `from` will now show an `address(0)` bucket for every clone created with value. `docs/REFERENCE.md` states the sentinel; the dapp's funds view is t09's.
- **`claim` gives an issuer-frozen account a path the freeze did not reach**: it moves tokens the Distribution holds to an address the issuer did not block. Stated in F5's row rather than hidden, because it is the same mechanism that rescues an honest blocked recipient. Worth a reviewer's eye on whether that trade is acceptable for the compliance story.
- **`forge test --list | wc -l` appears in the plan as the test count and is wrong by the number of file and suite headers.** Any future task using it will miscount; `--list --json` is the instrument. Deviation 6.
- **The `GRACE` boundary is inclusive on both sides by construction** — `block.timestamp == eta + GRACE` both applies *and* refuses a stranger's cancel — so there is no instant at which an action is neither applicable nor droppable by anyone but the owner. `test_strangerCannotCancelUnexpired` pins the boundary instant explicitly.

## For t07

Three things t07's third two-leg review reads as **closed** rather than still in the code:

1. **F9/F13** — queued actions expire after `GRACE = 14 days`, and anyone may cancel an expired one.
2. **F5 / #95** — the escrowed account has a second exit, `claim(token, to)`, uncapped and self-only.
3. **#111's code half** — a renounce emits `OwnershipTransferred(owner, address(0))`.

`src/App.sol` is **byte-identical to `b0fb4e3`** (`git diff --stat b0fb4e3 HEAD -- src/App.sol` is empty), so t07's work is untouched and this PR's line numbers for `App.sol` are still t07's.

The `src/Distribution.sol` t07's blinded tree must carry. The file is unchanged from `fb82136`, the first commit on this branch, through every commit after it, so these identify it at any head of this branch:

- git blob: **`224167d72a40807545d1e148acbea8f6d7ae51ce`**
- sha256: **`ef5f089fca97e07f83a01f040676a2d60ba9ad7c384f3ba9eca82588e3b45be0`**
- deployed bytecode: **9,271** bytes

t07's baseline moves with this PR: the five factory-constructing gas rows by about +109,000 each and `test_create2AddressStableAcrossChains` by +218,129, the four renounce rows by +1,732 to +4,243, and `F8_SUCCEEDS_AT` from 95,049,000 to 95,237,000. Re-measure after the merge rather than carrying any figure from here.

## For t09

Every `app/` surface the ABI made stale. **No dapp logic changed in this PR**; all of this is t09's:

- The `ERRORS` map in `app/src/model.js` needs `Expired(uint256)` — selector for the error is new, and an expired action currently renders as an unknown four bytes.
- The pending view needs a **deadline** beside its countdown: an action is applicable only between `eta` and `eta + GRACE`, and after that the row should read expired rather than ready.
- A **cancel-expired** control, available to anyone and not only the owner, on an expired row.
- The escrow view needs a **`claim`** control for the connected account, defaulting `to` to the account itself, as the plan's `to`-is-not-validated note assumes.
- `GRACE()` is a new view the page can read rather than hard-coding fourteen days; `app/src/index.html`'s prose currently spells the number out.
- [#137](https://github.com/dnznlabs/rake/issues/137)'s items — the pending-queue fallback to logs, and the un-highlighted `setDelay` that lowers the delay.
- The `Received(address(0), …)` log at `init` is a new shape for the funds block's token-in scan: it has no real sender.

## Closing-reference verification

`Closes #136` verified through **two independent paths**, not the same query twice, because a closing keyword fires from inside backticks and from inside a negation and this PR's body names seven other issues.

1. **GraphQL, from the PR** — `repository.pullRequest(number:143).closingIssuesReferences`: `totalCount=1`, the single node being `#136 [OPEN] Distribution leftovers from #133: …`. One issue closes, and it is the intended one.
2. **REST, from the stored body** — `gh api repos/dnznlabs/rake/pulls/143 --jq .body`, then a keyword scan of what the server actually stored rather than of what I sent: the only match for `\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b\s*#[0-9]+` is **`Closes #136`** at line 11. The body's other references — `#95`, `#111`, `#133`, `#141` — carry no keyword and close nothing.

The two paths run in opposite directions (GitHub's resolved intent versus the raw stored text) and agree.

## The PR

PR [#143](https://github.com/dnznlabs/rake/pull/143), `m03/t08-expiry` → `main`, open, not a draft, `lakkoss` requested as reviewer. `Audit scope touched: src/Distribution.sol` and `Closes #136` are in the body; `Carries forward:` is left to be filled after the review, before the merge.

Commits, smallest first:

| Commit | What |
|:--|:--|
| `fb82136` | `feat(distribution)` — `GRACE`/`Expired`/cancel-when-expired, `claim`, the renounce event, the `init` log |
| `30340a4` | `test(distribution)` — the fourteen tests, the six new mocks, the `F8_SUCCEEDS_AT` re-bisection |
| `50dbe8d` | `test(distribution)` — `.gas-snapshot` regenerated, 72 → 86 rows |
| `2b5f99c` | `docs(reference)` — `REFERENCE.md`, the selector fixture, the `#/docs` prose |
| `f9af0e1` | `docs(security)` — F5/F9/F13 fixed, F8 re-bisected, § Invariants recounted |

## Open questions

None.
