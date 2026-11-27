# m03-t05 — handoff

PR: #124 · Branch: `m03/t05-findings` · 2026-10-31

The review's three accepted contract findings are fixed in `src/Distribution.sol` and pinned by nine
new tests: F1 with a check-only `notLocked` modifier on `propose` and `applyQueued`, F2 by clearing
the queue from `acceptOwnership` and the renounce branch, F6 by keeping the push's return data only
where decision 24 needs it. The cap was re-derived rather than re-asserted and stays at 107; F7's
disputed warm `receive()` figure was settled at 1,662 gas; F8 was sized at 95,049,000 gas and then
ruled documented rather than capped as decision 36. The code was frozen at `b0fb4e3`, reviewed once
by the architect and once by a blind two-model run of the refreshed audit runner, and no `src/`,
`test/*.t.sol` or `.gas-snapshot` byte moved after the freeze. **The second run raised two new
Mediums and one Low; none is acted on here, per § Out of scope, and all three are in § Open
questions.** Every acceptance criterion passes. One line outside the plan's files was needed — the
large-file guard narrowed so the leg 2 transcript could be committed at all — raised rather than
assumed, ruled by the architect, and recorded in § Decisions 5 with both of the ruling's claims
verified.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — ABI gains and loses nothing; struct unchanged | **pass**, measured two ways | **The criterion as written, run through the pinned toolchain** (`devbox run --`, jq 1.8.2 from `devbox.json`): **39 lines on the branch, 39 on `origin/main`, `diff` empty**. Confirmed independently with `node`, which agrees name for name. Struct `["owner","delay","nonce","description","table","pending"]` on both sides. `origin/main`'s side was built in a throwaway worktree at `c0fb2e2`, removed after; the frozen checkout was never touched. Two caveats worth recording: one of the 39 lines is `null`, the nameless `receive` function, so the figure is 38 names plus `receive` rather than 39 names; and run **outside** `devbox` the command silently reports "identical" for any tree, because `jq` is not on the bare PATH. See § Discoveries 1. |
| 2 — the seven names exist, each quoted failing on `ede55c3` | **pass**, and the plan is wrong by one | All seven in `forge test --list --match-contract Distribution` (44 rows: Distribution 39 + Factory 5). **Six of the seven fail on `ede55c3`'s `src/`**, each with its finding's assertion (table below). The seventh, `test_releaseStillBubblesEthReason`, **cannot fail there by construction** — see § Discoveries 2. |
| 3 — cap figures for both row kinds, both under 15,000,000 | **pass** | `forge test --mc TableCapTest -vv`: `gas at CAP` **14,889,178** for gas-burner rows, **14,181,801** for bloating rows, both under 15,000,000. The burner is still the worst case, so `MAX_BENEFICIARIES` **stays 107** and its three `@dev` figures stay as they are — they are burner figures, correctly self-attributed to t01's tree at `b055bc3`, and the `@dev` already says to re-measure rather than quote them. |
| 4 — `test_hookRecipientStarvesLaterRows` passes, gas stated | **pass** | `[PASS] test_hookRecipientStarvesLaterRows() (gas: 240808854)`, logging `F8 distribute completes at : 95049000`. D14 ruled *document*, so the ERC-20 push carries no `gas:` argument and the cap branch of this criterion does not apply. |
| 5 — `app/` claim gone, `REFERENCE.md` rows, `node --test` | **pass** | `grep -c 'can still be applied' app/src/index.html` → **0**. Rows 22 and 23 carry "refused while", 28 and 29 carry "drops every queued". `node --test test/*.test.mjs` → **62 pass, 0 fail**. ABI gains no name, so `tools/abi-vectors.sh` was not re-run. |
| 6 — the seven fragment files byte-identical to `../shared` | **pass** | All seven `diff -q` clean against `<the shared tooling checkout>/templates/forge-audit/files/`: `audits/README.md`, `audits/SCOPE.example`, `audits/SKILL_PIN`, `audits/prompts/leg.md`, `audits/prompts/rollup.md`, `mk/20-audit.mk`, `scripts/audit.sh`. |
| 7 — milestone criterion 4 on the branch | **pass** | `audits/2026-10-31/AUDIT.md` provenance reads `dirty: no`; both leg directories hold 3 files each; `transcripts/` holds **both** legs — `leg-1-codex.log` (278 KB) and `leg-2-claude.jsonl` (2,254 KB); `BLIND.md` maps `b2ed060` to `b0fb4e3` with the four hashes measured in both trees; `SECURITY.md` names `b0fb4e3` (5 occurrences); every finding of both runs is dispositioned (13 rows); `README.md`'s AUDIT cell reads 2026-10-31. `git diff --stat b0fb4e3 HEAD -- src/ test/ .gas-snapshot` is **empty**. The leg 2 transcript needed the large-file guard narrowed for that one path — § Decisions 5. |
| 8 — `KNOWN_ANSWER.md` names the head, F1/F2/F6 closed | **pass** | Names `b0fb4e3` (3 occurrences), titled with the short sha; six shapes still in the code and six closed before this audit, each closed one with its function and the one-line mechanism that is gone. `grep -ci 'unchecked\|wait out the delay'` → **0**, which is #118's two defects fixed. `grep -c unchecked src/Distribution.sol` → **0**, proving #118's point. |
| 9 — build/lint/fmt/snapshot clean, tree clean | **pass** | `forge build --force` → **0** `warning[` / `Warning (` lines. `forge test` → **72 passed, 0 failed**. `forge snapshot --check` → **exit 0** with all 72 run. `forge lint` → exit 0, silent. `forge fmt --check` → exit 0, silent. `node --test test/*.test.mjs` → **62 pass**. `git status --porcelain` → **empty**. Gates run in the plan's order, lint and fmt last, `build --force` before every count. |
| 10 — the handoff carries step 12's list | **pass** | This file: the AC table, the six failing assertions, the moved snapshot rows, the bytecode sizes, the F7 and F8 figures, the provenance block verbatim, per-leg grading, the runner observations, § Deviations, § Discoveries, § Open questions. |

### The six failing assertions on `ede55c3`'s `src/`

Mechanism: `git checkout ede55c3 -- src/` by path only, proven with `git diff ede55c3 -- src/`
empty, then `forge build --force`, then restored with `git checkout HEAD -- src/` and
`git diff HEAD -- src/` proven empty.

| test | failing assertion on `ede55c3` |
|:--|:--|
| `test_applyQueuedRefusedDuringDistribute` | `the reentrant applyQueued failed` |
| `test_proposeRefusedDuringDistribute` | `the reentrant propose failed` |
| `test_acceptOwnershipClearsQueue` | `OwnershipTransferred != expected Cancelled` |
| `test_renounceClearsQueue` | `and carries no queue into that state: 1 != 0` |
| `test_renounceFromApplyClearsTheRest` | `the executing action and both others are gone: 2 != 0` |
| `test_distributeDiscardsEthReturnData` | `the return data of a failed ETH push costs distribute nothing: 34082275 >= 3000000` |
| `test_releaseStillBubblesEthReason` | **passes on `ede55c3`** — the decision-24 guard; see § Discoveries 2 |

The last row is the F6 cross-check as well: 20 bloating rows cost **34,082,275** gas on `ede55c3`
against **2,580,004** on the branch, a **13.2×** reduction, which corroborates leg 2's 35.3M at
k=20 within 3.5% on a different harness.

## The measurements

**Bytecode, deployed.** `Distribution` 8,469 → **8,729** bytes (**+260**); `DistributionFactory`
1,320 → **1,320** (unchanged).

**F7 — the warm `receive()` figure, settled.** **1,662 gas**, read off the `receive()` frame of
`test_receiveUnderStipend`'s trace (`forge test --mt test_receiveUnderStipend -vvvv`, devbox-pinned
forge 1.7.1-dev); the inner delegatecall frame is 1,513. `init` has already delegatecalled into the
implementation earlier in the same transaction, so the frame is warm. **It agrees with m01-t01's
1,662 exactly — difference 0 gas**, inside the plan's hundred-gas tolerance, so no stop. `AUDIT.md`
F7 reported about 4,200 warm; the likely cause is in that report itself, which says a clone's
`DELEGATECALL` into a *cold* implementation costs 2,600 on its own, and 1,662 + 2,600 = 4,262 ≈
"about 4,200" — the cold figure labelled warm. The cold case is unchanged and is the one that
actually fails the stipend, which criterion 5's qualifier already covers.

**F8 — the grief, sized.** `distribute` **reverts at 95,048,000** gas and **first succeeds at
95,049,000**. That is **3.17 × a 30M block**; the test reports it as 4 whole blocks, because whole
blocks round up — both statements describe the same figure and neither contradicts decision 36's
"over three 30M blocks". Bisected **by hand, one gas limit per transaction**: several ~95M attempts
in one transaction starve each other through EIP-150's 63/64 rule and report a position artefact,
and the first bracket taken that way was wrong and discarded. So the grief is real and unminable —
a `distribute(token)` for a hook token with an owner-chosen burner row cannot be mined at all until
the owner re-tables through the delay. The gas a real ERC-20 `transfer` needs against a cap is
**unmeasured here and not claimed**: `MockERC20` is not evidence.

**The cap, re-derived.** Burner rows 138,850 gas each, 14,889,178 at the cap of 107. Bloating rows
132,540 each, 14,181,801 at the cap. Per-row and fixed cost on this tree: n=1 168,578 · n=8
1,140,525 · n=64 8,916,125 · per-row 138,850 · fixed 29,725. This tree's burner figures drift 67 and
7,147 gas from the ones quoted at `b055bc3` — noted, not changed.

### Snapshot rows that moved: 39 of 63

`.gas-snapshot` now carries **72** rows (`grep -c ''`). The eleven that moved by more than a few
hundred gas, with a sentence each:

| row | before | after | delta | why |
|:--|--:|--:|--:|:--|
| `DistributionFactoryTest::test_create2AddressStableAcrossChains` | 4,584,690 | 4,689,257 | +104,567 | implementation bytecode +260 B, deployed in the factory constructor, twice |
| `DistributionFactoryTest::test_factoryRejectsEth` | 2,049,332 | 2,101,584 | +52,252 | the same, once |
| `DistributionFactoryTest::test_createEmitsAndInits` | 2,315,709 | 2,367,961 | +52,252 | the same |
| `DistributionFactoryTest::test_createForwardsValue` | 2,299,235 | 2,351,487 | +52,252 | the same |
| `DistributionTest::test_tableCapBoundary` | 9,135,511 | 9,163,203 | +27,692 | **not the contract** — § Discoveries 3 |
| `DistributionTest::test_acceptOwnershipByPendingOwner` | 300,976 | 303,611 | +2,635 | `_clearQueue` over a non-empty queue (F2) |
| `DistributionTest::test_renounceStillImmediateAndClearsPending` | 296,175 | 298,733 | +2,558 | `_clearQueue` (F2) |
| `DistributionTest::test_renounceFreezes` | 374,992 | 377,397 | +2,405 | `_clearQueue` (F2) |
| `TableCapTest::test_capRowsStayUnderHalfABlock` | 15,095,841 | 15,093,128 | −2,713 | F6: no `bytes memory` per row |
| `TableCapTest::test_perRowAndFixedCost` | 10,400,581 | 10,398,784 | −1,797 | F6 |
| `DistributionFactoryTest::test_saltFrontRunningRejected` | 1,040,505,393 | 1,040,507,013 | +1,620 | a CREATE2 collision burns what is forwarded; implementation size |

The remaining 28 move by ≤906 gas each, `test_tableValidation`'s +906 the largest.

## The second review

### Provenance block, verbatim from `audits/2026-10-31/AUDIT.md`

```
audit date        2026-10-31
code commit       b2ed0609293efb997771d80ee320a63d2921fd6f  (dirty: no)
scope             src/Distribution.sol
                  src/App.sol
                  scripts/forge/Deploy.s.sol
                  scripts/forge/DeployApp.s.sol
skill             https://github.com/pashov/skills @ f6c7f0de9cce16f6aa9c57aaac104f0dee90582e  · solidity-auditor VERSION 4 · upstream 4.1
leg 1             codex codex-cli 0.158.0 · requested gpt-5.6-sol → observed gpt-5.6-sol · effort high · 1 pass · 340s wall
leg 2             claude 2.1.310 (Claude Code) · requested opus → observed claude-opus-5-5 · 1 pass · 440s wall
tokens            leg 1 116,064 · leg 2 1148597
```

Rollup 134s. Result: **4 Medium, 4 Low** — eight distinct findings from eleven raised across the two
legs, plus four leads from leg 2 carried unchanged.

### Grading, per leg

**Leg 1 found 2 of 6. Leg 2 found 4 of 6**, one of the four below its own confidence threshold.

| Known issue | Leg 1 (gpt-5.6-sol) | Leg 2 (claude-opus-5-5) |
|:--|:--|:--|
| #19 reserved > balance reverts `distribute` | **Found** (#3, Medium) | **Found** (#4, conf 75; correctly calls it a checked subtraction) |
| #54 `propose` queues an action `applyQueued` always reverts | **Missed** | **Missed** |
| #95 escrow to a recipient that burns the push | **Missed** | **Found** (#7, conf 75; adds a blacklist variant) |
| #18 `receive()` over the stipend when cold | **Missed** | **Found** (#8, conf 70, **below its own threshold**, hand trace not run) |
| #22 CREATE2 collision burns forwarded gas | **Missed** | **Missed** |
| F8 / #123 ERC-20 push passes no gas | **Found** (#1, Medium; overstated as blocking "every payout") | **Found** (#6, conf 75; gives an arithmetic bound) |

**Both legs missed #54 and #22 — the same two the 2026-10-30 run missed.** #22 has now been missed
by **four legs, across two labs and two runs**. Stated straight rather than rounded up: the method
has not found it once.

**The most plausible explanation for the 2-vs-4 split is the harness, not the model.** Leg 1's
`scope.tsv` records `pass_1_agents 3/12` against leg 2's `12/12`, and leg 1 reported the limit
itself, quoted verbatim from its `full-report.md`: *"This harness exposed only three worker slots,
so it could not run the skill's 12 audit agents simultaneously. Three independent workers covered
all 12 specialty bundles in groups of four."* Its `run-1.md` adds: *"3/12 agents returned — this
harness exposed three worker slots, so each worker covered four specialty bundles."* Leg 1 also
listed no leads at all, consistent with less coverage rather than a stricter filter.

### The fixes held, checked against the code rather than inferred from silence

Neither leg reports #20, #61, #74, or 2026-10-30's F1, F2 or F6 as open. An absence is weak
evidence on its own, so two stronger signals are worth naming:

- **Leg 2's second lead depends on the F2 fix being present.** It complains that `_clearQueue`
  drops the owner's *own* queued `transferOwnership(owner)` withdrawal — a consequence of the fix,
  not a gap in it. A leg reading pre-fix code could not raise it.
- **Leg 2's third lead names the return-data copy on the ERC-20 branch only, and explicitly calls
  the ETH branch capped** — which is exactly the F6 design, where the ERC-20 copy is kept by
  decision.

### The runner at `c12e188`: did its six changes hold?

| change | held? | evidence |
|:--|:--|:--|
| 1 — harvests staged outside `$REPO_ROOT` | **yes** | leg 2's transcript contains no reference to leg 1's harvest; see the four observations below |
| 2 — transcripts under `audits/<date>/transcripts/` | **yes** | `leg-1-codex.log` (278 KB) and `leg-2-claude.jsonl` (2,254 KB), named exactly as prescribed |
| 3 — the Claude leg runs `--output-format stream-json` | **yes** | 2,254 KB of newline-delimited JSON with tool calls visible, where 2026-10-30's `json` left only a final result |
| 4 — the skill clones to `~/.cache/forge-audit/` | **yes** | `audits/.skills/` was **never created** in the blinded tree; this run was the first to exercise the cache path |
| 5 — upstream `VERSION` read and recorded beside the pin | **yes** | the provenance block reads `VERSION 4 · upstream 4.1` |
| 6 — `KNOWN_ANSWER_FILE` override | **yes** | the rollup graded against all six known-answer entries including the three closed ones, while the file stayed absent from the blinded tree **before and after** the run |

The `TMPDIR`-inside-repo refusal was left to its default path: `TMPDIR` was unset, the scratch landed
in `/tmp`, outside both trees.

### The four observations step 10 asks for

1. **Leg 2 read nothing of leg 1.** On `leg-2-claude.jsonl`: `audits/2026-10-31/pashov` → **0**,
   `pashov/solidity-auditor` → **0**, `audits/2026-10-31` → **0**, `gpt-5.6-sol` → **0**. Leg 2 had
   no indication that a leg 1 existed. Every `solidity-auditor` path in its transcript is its own
   scratch (`.solidity-auditor/runs/20261031-121753/`) or the skill it was running. **This is the
   first run on which the independence claim could be *measured* rather than asserted** — on
   2026-10-30 leg 2 ran under `--output-format json`, which persists the final result only, so what
   that leg read was unrecoverable and the breach was found only in its own prose. Both fragment
   changes paid off together: staging prevented the leak, `stream-json` made its absence provable.
2. **Both skill symlinks now point outside any project tree**, to
   `~/.cache/forge-audit/pashov-skills@f6c7f0de9cce16f6aa9c57aaac104f0dee90582e/solidity-auditor`,
   no longer into the 2026-10-30 blinded tree. **That tree is therefore now removable** — not
   removed here, which § Out of scope reserves for whoever reads this line.
3. **`upstream` is 4.1 against the pinned `VERSION 4`.** The runner reads upstream now, so the gap
   is visible: the pin is one minor version behind, deliberately, and a bump is its own commit.
4. **Sub-agent tool calls do appear in the Claude transcript** — **12** `"name":"Agent"` entries,
   which answers the fragment's open question affirmatively.

## Deviations from the plan

1. **Step 1's fragment refresh re-created two deleted files.** `add.sh forge-audit --force` also ran
   the required `forge-anvil` fragment's copy-if-absent step, which re-created `src/Counter.sol` and
   `test/Counter.t.sol` — files rake deliberately deleted in `8d03b81`. Neither is in the plan's
   seven-file list and `src/Counter.sol` is a `src/` byte. Both removed by exact path before
   staging; `devbox.json`, `.gitignore`, `AGENTS.md` and `.gitmodules` md5-identical before and
   after.
2. **Step 7 used `git checkout ede55c3 -- src/`, not `git stash push -- src/`.** The plan's command
   presumes uncommitted `src/` changes; the fixes were committed first so the work would survive a
   task that died mid-run twice. Same tree content either way, and `git diff ede55c3 -- src/` empty
   proves it, as does `git diff HEAD -- src/` empty after restoring.
3. **`test_releaseStillBubblesEthReason` passes on `ede55c3`.** Step 7 says each of the seven must
   fail there; this one cannot. See § Discoveries 2 — it is a plan defect, not a weak test.
4. **One line was changed in `.pre-commit-config.yaml`, which no step authorises.** The leg 2
   transcript could not otherwise be committed, and the method requires it. Raised rather than
   assumed, ruled by the architect, and recorded in § Decisions 5 with both of the ruling's claims
   verified. It is the only change outside the files the plan names.
5. **Step 11's "the new tests join the owner, delay and money-path groups" is right for eight of
   nine.** The ninth, `test_capBloatingRowsStayUnderHalfABlock`, is a cap measurement and joins the
   table group, which now reads "and the cap holds for the worst-case row kind rather than for one
   measured kind".

## Decisions

1. **F1 is a check-only `notLocked` modifier, not `nonReentrant`** — the plan's choice, recorded
   here because it is visible in the gas: a status-word write on every `propose` and `applyQueued`
   would cost more than a read, and the lock `distribute` already sets is sufficient.
2. **F2 clears the queue rather than epoching the hash** — the plan's choice. `_clearQueue` emits
   `Cancelled` per dropped action, so the drop is observable to indexers.
3. **`MAX_BENEFICIARIES` stays 107 and its `@dev` figures stay as written.** They are burner
   figures correctly attributed to t01's tree at `b055bc3`, and the `@dev` already instructs a
   re-measure rather than a re-quote. Re-deriving confirmed the burner is still the worst case, so
   the plan's re-derivation branch did not fire.
4. **F13 was given its own `SECURITY.md` row rather than folded into F9.** The mechanism is F9's,
   but the severity and the stated cost are new, and the rollup did not treat it as a duplicate.
   Folding it in would have hidden a severity change; the row states the overlap instead.
5. **The large-file guard was narrowed, not raised, so the leg 2 transcript could be committed.**
   `check-added-large-files` refused `leg-2-claude.jsonl` at 2,254 KB against the plugin's 500 KB
   default. Ruled by the architect: add `exclude: ^audits/.*/transcripts/` to that **one** hook
   entry, merged into the existing `stages: [pre-commit]` rather than replacing it, leaving
   `check-yaml` and the `betterleaks` block untouched. The ruling rests on two claims, and both
   were verified rather than assumed:
   - **The guard still covers everything else.** A 600 KB throwaway at `docs/large-file-probe.tmp`
     was staged and the commit **refused** — `docs/large-file-probe.tmp (600 KB) exceeds 500 KB` —
     with `HEAD` unchanged and the probe absent from it. Removed by exact path afterwards.
   - **`betterleaks` still scans the transcripts.** It reports
     `scanned ~2307510 bytes (2.31 MB) in 288ms · no leaks found`, and 2,307,510 bytes is the
     file's exact size. **The first attempt at this check scanned `~0 bytes` and still printed
     "no leaks found"** — because `betterleaks` reads the git index, so `pre-commit run --files` on
     an **unstaged** path gives it nothing to scan while still reporting success. The file had to
     be staged for the check to mean anything. A second false pass of exactly the shape in
     § Discoveries 1, found only because the ruling asked for the justification to be proved.

## Discoveries

1. **A measurement hazard, not a plan defect: a check run outside the pinned toolchain can report
   a confident false pass.** The ABI criterion **stands as written** — `jq@latest` is in
   `devbox.json:8`, resolves through `devbox run --` to jq 1.8.2, and the plan's exact command
   returns 39 on both sides. But `jq` is **not on the bare PATH**, so the same command run outside
   `devbox` captures nothing, compares two empty lists, and reports "identical" for any tree
   including one whose ABI changed. That is how it was first measured here and wrongly written up
   as a vacuous criterion; the misreading was the reviewer's, who read `scripts/audit.sh`'s
   *"jq is not in devbox.json"* as a fact about rake when it is a statement about what the
   **shared fragment** may assume across projects, and then confirmed it with a bare run. The
   general lesson is the one worth keeping: **a comparison that cannot distinguish "equal" from
   "empty" is not a check.** Both of this task's false passes were that shape — this one, and
   `betterleaks` reporting "no leaks found" after scanning 0 bytes of an unstaged file
   (§ Decisions 5). A count assertion beside each `diff` would catch both.
2. **Step 7's "each must fail on `ede55c3`" should read six of seven.**
   `test_releaseStillBubblesEthReason` pins behaviour the F6 fix deliberately *keeps* — decision 24
   still bubbles a real reason from an ETH recipient — so "fails on `ede55c3`" is not a property it
   can have. It is the guard on the other side of `keepData`, and correct behaviour rather than a
   weak test.
3. **A gas row in this repo can move purely from the size of its own test contract, with `src/`
   untouched.** `test_tableCapBoundary` moved +27,692 gas. Branch `src/` with the *original* test
   files reproduces the baseline 9,135,511 to the gas, so the contract change is not the cause:
   `via_ir` re-decides inlining for the helpers that build the 215 rows, at about 129 gas a row. The
   obvious cause was ruled out first — `forge inspect DistributionTest storageLayout` shows `salts`
   still at slot 33 offset 20, so the new `starveRanges` did not repack it. This is why step 4 said
   "re-derive from the larger figure" rather than "assert the old number".
4. **`SECURITY.md` § Carried issues and § What the review did not cover are now stale, and step 11
   does not authorise editing them.** The "Found by" column records the 2026-10-30 grading only, so
   #22's "missed by both legs" understates a shape now missed by four legs; and "Leg independence on
   this run was not clean" reads ambiguously once a second review sits above it, since the breach it
   describes is closed. Surfaced, not fixed: both are outside the edits step 11 lists.
5. **`SECURITY.md`'s F3 row still reads `accepted → m03-t05`** while the work is t06's. The plan
   says to leave the race alone, so it is left; it will read wrongly until t06 updates it.
6. **The audit transcripts are 31× the rest of the harvest.** `audits/2026-10-30` is 80 KB total;
   this run's transcripts alone are 2.5 MB, and each future run adds about as much to a repository
   whose `.git` is 204 MB. Worth a line upstream in the fragment about retention or compression,
   independent of the guard narrowed in § Decisions 5 — that admitted the file, it did not make it
   smaller. **This is also the first run to produce a transcript at all**, which is why no earlier
   audit hit the guard: the 2026-10-30 run wrote none, so the collision between the method's commit
   rule and the template's size limit could not surface until now.
7. **Findings the second run raised that this PR did not act on:** the two new Mediums and one Low
   now carried as `SECURITY.md` **F11** (`App.lock` accepts a 7702 code pointer), **F12** (a second
   token address for the native balance pays escrowed ETH again, chain-dependent) and **F13** (a
   superseded queued action applied out of order). F11 is the first finding in `src/App.sol`, whose
   bytes were byte-identical in the 2026-10-30 run and raised by neither leg then. Per § Out of
   scope each is recorded and stopped at; § Open questions 1 puts them to the architect.

## For the fragment

**The large-file guard and the transcript commit rule come from two different templates, neither
aware of the other, and the fix belongs upstream rather than here.**
`check-added-large-files` arrives with the shared **project template** — it has been in
`.pre-commit-config.yaml` since `6cc72a6 feat: initial create`, at the plugin's 500 KB default with
no `args`, and nothing about it is rake's choice. The rule that transcripts are committed with the
findings arrives with the **forge-audit fragment**: *"The transcripts are the only evidence of what
a leg read, so they are committed with the findings"* (`audits/README.md`). The fragment also chose
`--output-format stream-json`, which is what makes a transcript large enough to trip the guard. So
the collision is structural and every project taking both templates will hit it on its first
two-model run.

The `exclude: ^audits/.*/transcripts/` line added here is the local patch. Upstream it belongs in
one of the two templates — in the project template's hook config, or as compression in the
fragment's `audit.sh` before the `mv` into `transcripts/` — and the two owners should decide which,
since fixing it in both would be redundant and fixing it in neither leaves the next project to
rediscover it. That repository is Denizen's; the architect has raised it with him.

Two smaller notes for the same file:

- **`scripts/audit.sh:285`'s comment is misleading read locally.** *"node, not jq: jq is not in
  devbox.json, so it is not a dependency this repo may assume"* is correct as a statement about what
  the shared fragment may assume across projects, but in rake `jq@latest` **is** in `devbox.json`
  and has been since the first commit. Anyone reading the comment inside this repo will take it as
  a fact about this repo. A clause naming it as a cross-project constraint would prevent that.
- **Transcript retention is now the fragment's largest artifact by far** — 2.5 MB a run against
  80 KB for everything else the 2026-10-30 run produced. Worth a line about retention or
  compression independently of the guard.

## Open questions

### 1. Three findings accepted for a task that does not exist

**Question.** Does a t07 open for `SECURITY.md`'s F11, F12 and F13, or are they documented and
carried?

**Options.**
1. **A t07 for F11 alone** — it is the only one whose precondition is reachable without a hostile
   chain or an owner mistake, it is in `src/App.sol` which no review had raised before, and `lock`'s
   whole purpose is to bind the owner, so a lock that a key holder can walk back is the finding that
   most contradicts a documented promise. F12 and F13 then get carried issues.
2. **A t07 for all three** — one task, three small changes; costs the most and bundles a
   chain-dependent issue whose severity is not established for this code.
3. **Carry all three as issues and document them** — nothing is built in M03; F11's broken promise
   ships into M04 with the dapp's document already signed off.

**Recommendation.** Option 1. F11 is the one where the code contradicts its own NatSpec. F12's
severity depends on a chain rake has not chosen — the scope deploys to `$RPC` and names none — and
F13 is F9's mechanism with a severity change, which is a disposition question rather than a build.

**Default and deadline.** Default: option 3, all three carried, because this PR cannot open a task
and the milestone's § Out of scope already says a finding wanting a contract change stops here. It
blocks nothing in t05; it blocks M03's close-out, which must say what happened to each.

**Record.** `ROADMAP.md` § Decisions, and the `SECURITY.md` rows updated from "a task that does not
exist yet" to the ruling.

### 2. Does F13's severity change F9's disposition?

**Question.** 2026-10-30's F9 (queued actions never expire, any caller chooses the order) was
dispositioned "none needed", on the reasoning that the owner controls what is queued and `cancel` is
owner-only and immediate. The 2026-10-31 run raised the same mechanism as F5, at Low rather than as
a lead, with a concrete cost: a removed beneficiary applies the older `setBeneficiaries` it was
still listed in and then `distribute`, in one transaction. Does "none needed" still hold?

**Options.**
1. **Keep "none needed"** — the mitigation is unchanged and genuinely immediate; costs nothing, and
   accepts that two independent reviews have now flagged the shape.
2. **Rule it a change** — ordering or expiry on the queue; a real contract change, and it is F13's
   row either way, so it belongs to whatever task option 2 of § Open questions 1 settles.

**Recommendation.** Option 1, but say so explicitly in F9's row rather than leaving two rows that
disagree about the same mechanism.

**Default and deadline.** Default: option 1, the existing disposition. Blocks nothing; it should be
settled before M03 closes so the table is not self-contradictory.

**Record.** `SECURITY.md` F9 and F13.
