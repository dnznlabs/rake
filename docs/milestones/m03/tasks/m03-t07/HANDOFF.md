# m03-t07 — handoff

PR: #139 · Branch: `m03/t07-applock` · 2026-11-06

`App.lock()` promises that a locked `App` serves the bytes it was locked with, and before this PR it
did not keep that promise: all four pointer checks in `setChunks`, `setWidgetChunks` and `lock`
tested `code.length == 0`, and an EIP-7702 delegation designator has code, so it passed every one of
them. Every pointer now passes through one private `_requireChunk`, which additionally requires byte
0 to be the `STOP` that `SSTORE2.write` prefixes — the tighter test, and the one `SSTORE2.read`
already assumes, so a pointer it rejects could never have been served correctly. Five tests pin the
three doors, one of them signing a real EIP-7702 authorization rather than etching a designator. The
code was then frozen at `94d028c` and read a third time by two blinded legs; `SECURITY.md` carries
that run as its third entry, marks F11 **fixed**, and adds one new row, F14, from the run's own F5.
The only contract this task moves is `App`.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — `Distribution` untouched | pass | `git diff --stat 679d1b8 HEAD -- src/Distribution.sol` prints nothing. `forge inspect Distribution abi --json` is **15,164 bytes on both** branch and `origin/main`, and `cmp` of the two exits 0 — byte-identical. The baseline was built in a throwaway worktree with the **absolute** pinned binary, not `devbox run`, which runs from the project root and would have measured the branch twice (see § Discoveries). |
| 2 — one ABI addition | pass | `origin/main`'s `App` ABI has **38** names, the branch's **39** — both counts non-zero and stated, because a diff of two empty lists is not a check. `diff` of the two sorted lists is exactly `5a6 > ForeignChunk`: one added line, nothing removed. |
| 3 — the `code.length` criterion | pass | `grep -v '^\s*//' src/App.sol \| grep -c 'code.length'` → **0**; `grep -c 'code.length' src/App.sol` → **1**, the `ForeignChunk` doc comment at `src/App.sol:42`; `grep -c '_requireChunk' src/App.sol` → **5**, the definition plus four uses. This is the criterion as the architect amended it on #132 (2026-11-03) and as #147 then landed it in the plan. |
| 4 — 27 `AppTest` names, five failing before | pass | `forge test --list --match-contract AppTest` → **27**. Each of the five fails on the pre-fix `src/App.sol` with `next call did not revert as expected`; all five quoted in § The five tests, failing first. The seven existing names keep their assertions: `git diff origin/main -- test/App.t.sol` is **77 added, 1 removed**, and the one removed line is `import {Test}` → `import {Test, Vm}`, not an assertion. |
| 5 — the upload path still works | pass | On a fresh anvil: `forge script scripts/forge/Chunks.s.sol --broadcast` printed `chunk 0`, `chunk 1`, `widget chunk 0` and `html() bytes 54541`; `cast call $APP "chunkCount()"` returns `0x…02` = **2**, equal to the two chunks the script printed, and `widgetChunkCount()` = 1. `html()`'s raw return is 54,624 bytes carrying offset `0x20` and length `0xd50d` = **54,541**, whose payload begins `<!DOCTYPE html><html><head><meta charset="utf-8"><title>app<`. Read off the raw ABI return rather than a decode under a signature I supplied. |
| 6 — milestone criterion 4 | pass | `audits/2026-11-06/AUDIT.md` provenance says `dirty: no`; both leg directories hold 3 files each and `transcripts/` holds `leg-1-codex.log` (375,701 B) and `leg-2-claude.jsonl` (2,469,493 B); `audits/2026-11-06/BLIND.md` maps the blinded tree's `d07483a8` to the frozen head; `SECURITY.md` names the frozen head `94d028c` **9** times, F11 reads **fixed in this PR**, and all three runs' findings are dispositioned across 14 rows; `README.md:15` reads `two-model agent review, 2026-11-06`. `git diff --stat 94d028c HEAD -- src/` prints nothing at the PR's final commit, and `git merge-base --is-ancestor 94d028c HEAD` exits 0 — the reviewed commit is an ancestor of what `main` will carry, not an orphaned rewrite (§ Deviations 4). |
| 7 — the known answer | pass | `audits/KNOWN_ANSWER.md` names `94d028c` **4** times (the frozen head as it was when the tree was cut — see § Deviations 4), carries `ForeignChunk` twice and `#127` twice, lists F11 among the closed with its mechanism, and holds **16** top-level entries (`grep -c '^- \*\*'`). `AUDIT.md` § 4 opens "Sixteen entries: six live, ten closed" and grades both legs against every one. |
| 8 — the gates | pass, with one measured correction | `forge build --force` → `Compiler run successful!` and **zero** `warning[` / `Warning (` lines; `forge test` → **91 passed, 0 failed**; `forge snapshot --check` → **exit 0**; `forge lint` → silent, exit 0; `forge fmt --check` → silent, exit 0, run last; `git status --porcelain` → empty. `node --test test/*.test.mjs` → **67 pass, 0 fail**, not the 62 the plan names (§ Deviations 3). |
| 9 — this file | pass | § For M04 names `App`'s init-code hash and the command that produced it; § Discoveries names the two findings the third run raised that this PR did not act on. |

## Step 1 — the mechanism, re-measured on the branch

Re-run rather than copied from `TASK.md`, in a throwaway worktree holding the pre-fix `src/App.sol`
(blob `6350eafb`, identical at `67146a7` and `origin/main`), on the devbox-pinned forge `1.7.1-dev`
invoked by absolute path. All three figures reproduce:

| Figure | Plan | Measured |
|:---|:--|:--|
| Delegated account `code.length` | 23 | **23** |
| Delegated account first byte | `0xef` | **`0xef`** |
| `SSTORE2.write(hex"deadbeef")` pointer `code.length` | 5 | **5** |
| That pointer's first byte | `0x00` | **`0x00`** |

And F11 itself, on the pre-fix code: `setChunks([acct], false)` **and** `lock()` both succeeded,
`locked()` became true and `chunkCount()` was 1 — a document locked over a pointer whose key holder
can still change it. That is the finding, reproduced rather than taken on trust.

## The five tests, failing first

Run against the pre-fix `src/App.sol` with the branch's `test/App.t.sol`: **22 passed, 5 failed** of
27. Every one of the five fails with the same assertion, which is the finding's own reason — the
pre-fix code accepts the pointer, so the expected revert never happens:

```
[FAIL: next call did not revert as expected] test_setChunksRejectsDelegationDesignator()      (gas: 66176)
[FAIL: next call did not revert as expected] test_setWidgetChunksRejectsDelegationDesignator() (gas: 65913)
[FAIL: next call did not revert as expected] test_lockRejectsDelegationDesignator()            (gas: 122732)
[FAIL: next call did not revert as expected] test_lockRejectsRealDelegation()                  (gas: 68062)
[FAIL: next call did not revert as expected] test_setChunksRejectsNonChunkContract()           (gas: 64175)
```

The 22 that pass are the pre-existing `AppTest` tests, which is the other half of AC 4: the new
check does not change what the old tests assert.

## The snapshot rows that moved

19 rows moved against `origin/main`, **all of them `AppTest`**, plus the 5 new rows added and **none
removed**. No `Distribution`, factory, `PushGas` or `TableCap` row moved. 86 rows on `main`, 91 on
the branch.

| Row | Before | After | Δ |
|:---|---:|---:|---:|
| `test_lockCoversWidget` | 208,757 | 209,201 | **+444** |
| `test_widgetIsNeverWrapped` | 250,611 | 251,001 | +390 |
| `test_setWidgetChunksAcceptsValidPointers` | 183,072 | 183,431 | +359 |
| `test_setChunksAcceptsValidPointers` | 185,270 | 185,628 | +358 |
| `test_lockAcceptsDappWithoutWidget` | 129,468 | 129,816 | +348 |
| `test_setChunksRejectsCodelessPointerAmongValidOnes` | 115,717 | 115,990 | +273 |
| `test_lock` | 128,418 | 128,688 | +270 |
| `test_lockAcceptsReadableDocument` | 131,250 | 131,519 | +269 |
| `test_gzipBootstrap` | 182,211 | 182,442 | +231 |
| `test_requestRoot` | 118,568 | 118,773 | +205 |
| `test_requestWidget` | 256,042 | 256,235 | +193 |
| `test_requestWidgetAbsent` | 113,115 | 113,274 | +159 |
| `test_setChunksRejectsCodelessPointer` | 23,316 | 23,368 | +52 |
| `test_setWidgetChunksRejectsCodelessPointer` | 23,529 | 23,581 | +52 |
| `test_uncompressedBranchEmitsNoBootstrap` | 104,381 | 104,406 | +25 |
| `test_lockRejectsCodelessWidgetPointer` | 185,417 | 185,438 | +21 |
| `test_rawChunksConcat` | 163,254 | 163,274 | +20 |
| `test_onlyOwner` | 11,145 | 11,162 | +17 |
| `test_lockRejectsCodelessPointer` | 101,805 | 101,736 | **−69** |

**The six rows over a few hundred gas** — `+444` down to `+205` — are the ones that admit several
pointers and then lock, so they pay one `extcodecopy` per pointer per door; `test_lockCoversWidget`
pays the most because it is the only test that admits both a document and a widget and then locks
over both, i.e. the most pointer-door pairs in the suite. +444 is 1.5 parts in 2,000 and nothing is
near a limit.

**One row fell, which is worth a sentence because a new check should not make anything cheaper.**
`test_lockRejectsCodelessPointer` lost 69 gas. Its assertion is unchanged and still passes: it
reverts `CodelessChunk` exactly as before. The fall is the optimizer's, not a behaviour change —
four inlined `code.length` tests collapsed into one shared private function, so `via_ir` lays the
revert path out differently. The direction is safe and the magnitude is noise; it is recorded rather
than smoothed over because the row moved against the grain of every other row.

## Bytecode

| Contract | Before | After |
|:---|---:|---:|
| `App` deployed | 7,118 | **7,155** (+37) |
| `Distribution` deployed | 9,271 | 9,271 (unchanged) |
| `DistributionFactory` deployed | 1,320 | 1,320 (unchanged) |

`App`'s 7,118 was re-measured on `origin/main` in the throwaway worktree rather than carried from
`TASK.md` step 0, and it agrees with the plan's figure. The +37 bytes are wholly this check.

## The third review

`audits/2026-11-06/AUDIT.md` § 1, verbatim:

```
audit date        2026-11-06
code commit       d07483a8b9f6bcfe6200688bcb2d242450b9d464  (dirty: no)
scope             src/Distribution.sol
                  src/App.sol
                  scripts/forge/Deploy.s.sol
                  scripts/forge/DeployApp.s.sol
skill             https://github.com/pashov/skills @ f6c7f0de9cce16f6aa9c57aaac104f0dee90582e  · solidity-auditor VERSION 4 · upstream 4.1
leg 1             codex codex-cli 0.158.0 · requested gpt-5.6-sol → observed gpt-5.6-sol · effort high · 1 pass · 593s wall
leg 2             claude 2.1.310 (Claude Code) · requested opus → observed claude-opus-5-5 · 1 pass · 568s wall
tokens            leg 1 112,063 · leg 2 1191782
```

**Two shas, and they are the run's own.** The blinded tree is cut at the **frozen head**, `94d028c`;
the **branch head** at the review was `0819552`. Both are still ancestors of this PR's head, because
`main` was brought in as the merge commit `cb2e2a9` rather than by a rebase — see § Deviations 4,
which is why. `src/`'s git tree object is `8ddcc99` at `94d028c`, at `0819552` and at this PR's head
alike, and `git diff --stat 94d028c HEAD -- src/ 'test/*.t.sol' .gas-snapshot` prints nothing, so no
reviewed byte moved; `forge snapshot --check` exits 0 on the snapshot committed at the freeze, which
is the plan's own test for step 6 being void and it is not. `audits/2026-11-06/BLIND.md`
§ The mapping proves this by tree object, and the blinded tree's commit message and
`audits/KNOWN_ANSWER.md` name `94d028c` — which, after the merge, is still a commit a fresh clone of
`main` can resolve.

### Per-leg grading, against all sixteen entries

Six shapes still in the code:

| Known shape | Leg 1 (codex `gpt-5.6-sol`) | Leg 2 (claude `claude-opus-5-5`) |
|:---|:---|:---|
| **#19** `reserved > balance` reverts `distribute` | **Missed** — `L1#1`/`L1#3` hinge on the same state but report loss allocation, never the revert | **Found**, Low (`L2#5`) |
| **#54** `propose` queues an action `applyQueued` will always revert | **Missed** | **Missed** |
| **#18** `receive()` over a 2,300 stipend when the implementation is cold | **Missed** | **Found**, Medium (`L2#1`+`L2#2`) |
| **#22** CREATE2 collision in `create` burns forwarded gas | **Missed** | **Missed** |
| **F8 / #123** ERC-20 push passes no gas | **Found**, Medium (`L1#4`) | **Found**, Medium (`L2#6`, `L2#8`) |
| **F12 / #127** native-balance alias pays escrowed ETH out again | **Missed** | **Found**, Medium (`L2#3`) |

**Leg 1: 1 of 6. Leg 2: 4 of 6.** Input counts before deduplication: leg 1 **4 findings, 1 lead**;
leg 2 **8 findings, 7 leads**; **8 distinct** after dedup.

Ten shapes closed before this audit — **#20, #61, #74, #111, F1, F2, F6, F11, F9/F13, F5/#95** —
and **no leg reported any of them as open in its original mechanism**. Item by item in `AUDIT.md`
§ 4. Two carry a note:

- **F11 is among the closed and neither leg raised it**, which the plan requires this handoff to
  state explicitly. The fix was in the bytes they read — the blinded tree's `src/App.sol` carries
  `ForeignChunk` at `:46`, `_requireChunk` at `:198` and its four call sites, and
  `grep -v '^\s*//' … | grep -c 'code.length'` is 0 there. On 2026-10-31 leg 2 raised this shape at
  confidence 80, its highest of that run, against the unfixed file. So no leg is reading code it was
  not given, and none has found the fix wanting.
- **F9/F13's closest re-raise is leg 2's `L2#4`** (the rollup's F7): `applyQueued` still has no
  caller check, so a matured action is applicable by any caller in any order. That is the standing
  disposition's own wording — `GRACE` bounds the window to 14 days rather than removing it — so
  neither row moves. The leg cites the current line and makes no "forever" claim, but **it never
  mentions `GRACE`, so the report does not show that it weighed the window.**

### Disposition of the run's eight findings

**13 + 1 = 14 rows.** `git show origin/main:SECURITY.md | grep -c '^| F'` → **13** before this PR;
`grep -c '^| F' SECURITY.md` → **14** after. Seven of the eight are re-finds of rows already
carried; one is new.

| Rollup finding | Disposition |
|:---|:---|
| F1 — native-balance alias | F12's row, unchanged (carried as #127) |
| F2 — first `release`/`claim` takes the remaining backing | **F4's row gains the sharper consequence**: the loss lands on whoever exits last rather than spreading, with the rollup's **Medium** noted beside decision 23's "none needed". No row, no contract change — its precondition is a token whose balance falls on its own, already out of scope per decision 23 and `PROJECT_OVERVIEW.md` § Known limitations |
| F3 — ERC-20 push gas | F8's row, unchanged (decision 36) |
| F4 — clone `receive` under a cold stipend | F7's row, unchanged (#18) |
| F5 — clone address does not commit to owner or table | **New row F14**, Low, *documented, not changed*, carried as **#150** |
| F6 — `reserved > balance` reverts `distribute` | F4's row, same root as the run's F2 and the rollup says so |
| F7 — any caller, any order, inside the window | F9/F13's rows do not move; § Prior reviews material |
| F8 — last row's rounding remainder | **F10's row gains a "re-found" sentence** — its third re-find (L1 Medium again, rollup Low again on the same arithmetic). No new row |

**F14's row text**, as committed:

> **F14 — a clone's address does not commit to its owner or its table** · Low · **documented, not
> changed** — carried as #150 · New on 2026-11-06 (that run's **F5**, leg 2 only, which rated it
> Medium at confidence 75; the rollup adopted **Low** and this row keeps Low). `DistributionFactory.create`
> (`:465-474`) and `predict` (`:487-498`) derive the address from the factory, the salt and the init
> code alone, so neither the owner nor the beneficiary table is committed to by the address a payer
> reads. **This is by design, and the design is what bounds it:** the salt is sender-bound, so the
> only party who can deploy a *different* table at the predicted address on another chain is the
> deploying key itself — not a stranger, and not a front-runner (`test_saltFrontRunningRejected`,
> `test_create2AddressStableAcrossChains`). What follows is therefore a statement about that key's
> discretion, not an unprivileged attack: funds sent to a predicted address on a chain where the
> clone is **not yet deployed** are at the deploying key's discretion, because `init` accepts a
> pre-sent balance (`:143`) and the table is whatever that deploy passes
> (`test_prefundedAddressLogsReceivedAtInit` pins the mechanism). No contract change: per § Out of
> scope a finding wanting one is a stop, and nothing here is reachable without the deploying key.
> **Two follow-ups are carried on #150**, neither of them t07's: (a) the factory's own NatSpec point
> 3 (`src/Distribution.sol:454-456`) still calls the factory "nonce-addressed", stale since decision
> 33 and m03-t06's `0a826dc` routed it through Arachnid's keyless CREATE2 proxy — a `src/` byte, so a
> stop here rather than a drive-by comment fix; and (b) one sentence of payer guidance in the dapp or
> `README.md`: do not pre-fund a predicted address on a chain the clone is not on yet. The review
> reached (a) from the opposite side — leg 2 argued the one-address-per-chain premise *from*
> `Deploy.s.sol:11-12` while the NatSpec three lines above `create` says the reverse, and the rollup
> recorded that leg 2 did not raise the disagreement itself.

## Carries forward

**#150** — the one issue this task filed, covering both of F14's follow-up actions. Named in F14's
row. Everything else in `Carries forward:` is the reviewer's to fill.

## For M04 — `App`'s init-code hash

`APP_SALT` is mined against this, per decision 37, and `94d028c` is the commit it must be mined
against because it is the one M04 deploys — the frozen head, which the merge of `main` left intact
as an ancestor rather than rewriting (§ Deviations 4).

**`cast keccak $(forge inspect App bytecode)` is not the init-code hash.** `App`'s constructor takes
`(address owner_, string memory version_)`, and `CREATE2` hashes the creation code **with the
ABI-encoded constructor arguments appended**, so hashing the creation code alone gives an address
nothing will ever be deployed at. For the record, that wrong hash is
`0xa460e0789221694e2ff0d7f457d1f1af0f8845d5d2daf53a40e9ef084c8e6a2e`; do not use it.

The command `RUNBOOK.md` § 1f actually uses:

```sh
AINIT=$(forge inspect App bytecode)$(cast abi-encode 'c(address,string)' $OWNER $APP_VERSION | cut -c3-)
cast keccak $AINIT
```

Measured on this branch with the runbook's own `OWNER` (the Ops vault,
`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, `RUNBOOK.md:45`) and `APP_VERSION=v0.1`
(`RUNBOOK.md:46`):

```
App creation code      7,782 bytes
constructor arguments    128 bytes, four words:
                         00000000000000000000000000c0e88778e3e3d17acaabc7550dec7ab61f3790  owner
                         0000000000000000000000000000000000000000000000000000000000000040  string offset
                         0000000000000000000000000000000000000000000000000000000000000004  length 4
                         76302e3100000000000000000000000000000000000000000000000000000000  "v0.1"
init code              7,910 bytes
init-code hash         0x0b2894a38c541f156e2be856b7469993004331006a2ba9c66fa4d040f7b9864a
```

**That hash is a function of all three inputs, not of the bytecode alone.** `OWNER` and
`APP_VERSION` are constructor arguments and `APP_SALT` is the salt, so changing any one of them
moves `App`; the same-address-on-every-chain property holds only while all three are identical
everywhere (`RUNBOOK.md` § 0). M04 should re-run the two lines above rather than quote the hash from
here, for the same reason the runbook refuses to copy its own figures: **both figures move with the
bytecode**, and this one is per-revision.

## Deviations from the plan

1. **The dated directory is `audits/2026-11-06`, not `2026-11-02`.** The blinded tree is
   `~/src/rake-blind-2026-11-02`, cut and staged on 11-02; the run happened on 11-06 because it
   waited for a terminal. The launcher dates the output by run date —
   `AUDIT_DATE="${AUDIT_DATE:-$(date +%Y-%m-%d)}"` — so the directory, `AUDIT.md`'s `audit date` and
   `README.md`'s cell all read 2026-11-06 while the tree's name and its commit date read 11-02.
   Nothing in the tree changed in between; its commit `d07483a8` is dated 2026-11-02 08:47:13 -0600
   and its four scoped hashes are the ones `BLIND.md` records. Accepted by the architect.
2. **Step 6's "the blinded tree's `git status --porcelain` empty after the run" cannot hold
   literally.** The run writes `audits/<date>/` *inside* that tree and the harvest copies rather than
   moves, and the blinded `.gitignore` carries only the forge-audit fragment's three entries, so the
   output directory is neither committed nor ignored there. Measured after the run, the status is
   exactly `?? audits/2026-11-06/` and nothing else: no modified tracked file, no `out/`, no
   `cache/`, and the gitignored `.solidity-auditor/` scratch. Read as "nothing beyond the run's own
   output", which is what holds. **Nothing was deleted from the blinded tree to make the check
   read clean** — the architect will amend that `TASK.md` line after the merge. Accepted.
3. **Step 8's `node --test test/*.test.mjs` figure of "62 pass, unchanged" is stale, and the
   measured count is 67.** #146 (m03-t09) changed `test/model.test.mjs` and `test/widget.test.mjs`
   and took the node suite 62 → 67, which t09's handoff records. Step 8's *reasoning* holds exactly
   as written — this task moves no `app/` byte, so it changes nothing about the dapp — but the
   absolute number is per-revision and is quoted here as measured rather than asserted from the
   plan. **67 pass, 0 fail**, over six files. **The five extra tests arrive with the merge**
   (§ Deviations 4): they are t09's change entering this branch at `cb2e2a9`, not a t07 regression,
   and this task still moves no `app/` byte of its own — `git diff --name-only origin/main HEAD --
   app/` is empty. A count other than 67 here would be the thing to stop on.
4. **`main` was brought in with a merge commit, not with the rebase step 8 first used.**
   `origin/main` moved to `7ff3be4` (the merge of #146) after the review. Step 8 rebased onto it,
   which replayed all four branch commits under new shas and left the frozen head `94d028c`
   unreachable from the branch — measured, not assumed: `git merge-base --is-ancestor 94d028c
   <rebased head>` was **false**. The architect ruled that out, and the reason is provenance rather
   than taste: after a rebase-then-merge, `git show 94d028c` in a fresh clone of `main` answers with
   an unknown object, so the third review's reviewed commit would survive only in GitHub's PR refs.
   The four sha256s in `BLIND.md` are the cross-check on the reviewed *bytes*; they are not the
   identity of the reviewed commit. So the rebase was discarded, the branch was reset to the
   pre-merge head `0819552`, `main` was merged in as **`cb2e2a9`**, and the four documentation
   commits were replayed on top — after which `git merge-base --is-ancestor 94d028c HEAD` **exits
   0** and the replayed tree is byte-identical to the rebased one it replaced. The shas that matter
   are therefore **frozen head `94d028c`**, **branch head at the review `0819552`** and the merge
   **`cb2e2a9`**. The post-rebase pair is gone from the write-up entirely: naming an orphaned
   rewrite would preserve exactly the confusion this removes. The merge was conflict-free, measured
   from the true merge base `679d1b8` rather than from the branch tip — `comm -12` over the two
   sorted change lists is empty, `main` having touched `AGENTS.md`, `RUNBOOK.md`,
   `app/src/{index.html,model.js,widget.js}`, `test/{model,widget}.test.mjs`,
   `scripts/forge/Fixtures.s.sol` and two docs files, none of them this task's. Precedent: m02-t02's
   handoff refused a rebase for this same reason ("bringing `main` in is the merge"). `#146` moved no
   `src/` and no forge test — `git diff --name-only 679d1b8 7ff3be4 -- src/ 'test/*.t.sol'` is empty
   — and `forge snapshot --check` exits 0 after the merge, so step 6 is not void.
5. **Step 3's prescribed rehearsal cannot compile as written.** The plan says to `git stash push --
   src/` and watch the five tests fail on the pre-fix code, but the tests name
   `App.ForeignChunk.selector` and only the fix declares that error, so the pre-fix tree fails to
   *build* rather than failing the tests — and a build error is not evidence that today's code
   accepts the pointer. The rehearsal was run with one line added to the pre-fix file, the error
   declaration alone, with `grep -c 'code.length'` still 4 and `grep -c '_requireChunk'` still 0 to
   show no behaviour came with it. All five then fail behaviourally, for the finding's reason. Run in
   a throwaway `/tmp` worktree, never in this checkout, so the freeze was never at risk.
6. **One `SECURITY.md` edit beyond the five step 7 enumerates.** Step 7 says "Edits, and only
   these", but marking F11's row **fixed** contradicted a sentence in the § Findings framing that
   still called F11 "D15 (#126, open, recommendation a t07 before M04)". Leaving it would have made
   the document disagree with itself about the one finding this PR fixes. That paragraph was
   corrected minimally — it now says which PR fixed each row, since "fixed in this PR" appears in
   rows fixed by t05, t08 and this task, and names F14's issue. No row's disposition changed beyond
   the ones step 7 asks for; F3, F12 and F13 are byte-identical to `main`, which is verified
   row-by-row in § Discoveries.
7. **Step 6's `audit complete` end condition was observed by the operator, and it reproduces.**
   Denizen pasted the launcher's tail from his terminal: `audit complete:
   audits/2026-11-06/AUDIT.md`, preceded by its check block — `AUDIT.md` 264 lines, leg 1 3 files,
   leg 2 3 files, rollup 172 s wall, `transcripts/` 2.8M. Four of those five figures were then
   re-measured directly against the blinded tree and every one reproduces: `grep -c '' AUDIT.md` →
   **264**, `ls -1 pashov/solidity-auditor/gpt-5.6-sol | wc -l` → **3**, the same for `opus` → **3**,
   `du -sh transcripts` → **2.8M**. The end condition therefore rests on the operator's own output
   *and* on an independent measurement that agrees with it, which is stronger than either alone. The
   172 s rollup wall is the operator's figure to cite: it is not in `AUDIT.md`'s provenance block,
   which carries the per-leg walls instead (593 s and 568 s, `AUDIT.md:16-17`). The three substantive
   checks step 6 names are AC 6's evidence: `dirty: no`, both leg directories non-empty,
   `transcripts/` holding both legs. **This is not a deviation** — it keeps its number because an
   earlier draft of this file recorded it as one, before the operator's output was available.

## Decisions

None this task made that the plan left open. Both choices the plan pre-empted — a second error
rather than widening `CodelessChunk`, and "first byte is `0x00`" rather than "not `0xef`" — were the
architect's and are recorded in `TASK.md` § Open questions; both are implemented as written.

## Discoveries

- **The third run rated decision 23's consequence Medium.** The rollup's F2 is #19's shape with a
  sharper consequence than either earlier run stated — under a shortfall the loss lands wholly on
  whoever exits last rather than spreading — and it rated that **Medium** against F4's standing
  "none needed". Recorded in F4's row, not acted on: the precondition is a token whose balance falls
  on its own, which decision 23 and `PROJECT_OVERVIEW.md` § Known limitations place out of scope.
  Whether a third raising at Medium reopens decision 23 is the Product Owner's call.
- **#54 has now been missed by both legs on all three runs.** The method has never found it once.
- **#22 has now been missed by all six legs across three runs.** Neither is a finding about the
  contracts; both are findings about the audit method, and they belong to M04's go/no-go rather than
  to this task.
- **`devbox run --` ignores the working directory**, so a baseline measured in a `/tmp` worktree is
  silently measured in `~/src/rake-m03-t07` instead — the branch, compared against itself, reporting
  "byte-identical" for free. Every baseline figure here (`App` 7,118, main's 38 ABI names,
  `Distribution`'s ABI) was taken with the pinned binary at its absolute path,
  `/nix/store/aw77rd6y914cdvfgzlklbynzzgcdgz1x-foundry-1.7.1/bin/forge`, with the worktree as cwd.
  Same family as the two vacuous-pass traps in t05 § Discoveries 1 and the `jq`/`tail -1` pair
  recorded on #132.
- **A `git worktree` of this repo has empty submodule directories, and `[ -d lib/forge-std ]` passes
  on them.** The first baseline attempt failed to compile with "Source solady/auth/Ownable.sol not
  found" because `lib/forge-std` and `lib/solady` existed as empty directories, so the guard that was
  supposed to notice and symlink them did not fire. Test for a file inside the submodule, not for the
  directory.
- **The two-way `comm` over test names needs one collation on both sides.** The § Invariants
  reconciliation first reported a spurious difference (`test_settersOnlySelf`) and then
  `comm: file 2 is not in sorted order`, because one list came from `sort` under the ambient locale
  and the other from Python's byte ordering. Both are now sorted under `LC_ALL=C`. This is the same
  trap `audits/2026-10-31/BLIND.md` § The mapping records for the sorted hash comparison, hitting a
  different pair of lists.
- **`SECURITY.md`'s F-numbering now collides three ways.** All three runs numbered their own findings
  from F1, and all three have an F4: this table's F4 is `reserved > balance`, 2026-10-31's F4 is this
  table's F11, and 2026-11-06's F4 is this table's F7. Stated once in the § Findings preamble. If a
  fourth run lands, the numbering scheme is worth a decision rather than another paragraph.
- **The dapp decodes neither error** — re-checked on this branch, as § Out of scope anticipated:
  `grep -rn 'CodelessChunk\|ForeignChunk' app/ test/*.mjs` is empty. No `app/` edit, and nothing
  owed.
- **§ Out of scope's parenthetical grep no longer returns none, though its conclusion still holds.**
  It says "`grep -n 'lock' app/src/index.html` at scoping showed none"; on this branch that grep
  returns **50** substring hits and **7** word hits, because m03-t09 (#146) rewrote that page.
  Every one of them is `Distribution`'s **time lock** — the queue and its eta, `:839`, `:859`,
  `:890` — or a UI `w.locked` flag disabling a button, `:774`, `:775`, `:1159`, `:1207`. **None is
  about `App.lock()` or what it checks**, so the ruling that there is nothing to edit stands; only
  the evidence for it has gone stale. Worth re-wording in the plan if a later task reuses that
  sentence as a check.

## Open questions

None for the Product Owner from this task's own work. The one question the review raises —
whether decision 23 reopens on the strength of a third raising at Medium — is recorded in
§ Discoveries and in F4's row, and is a ruling rather than a blocker: nothing in M03 waits on it,
and F4's disposition stands until it is made.
