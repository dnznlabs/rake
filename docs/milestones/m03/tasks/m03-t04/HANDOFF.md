# m03-t04 — handoff

PR: #117 · Branch: `m03/t04-review` · 2026-10-30

Two models from two labs read `src/Distribution.sol`, `src/App.sol` and the two deploy scripts at `ede55c3` in a blinded tree holding nothing but the code, their reports were reconciled into `audits/2026-10-30/AUDIT.md` with a provenance block, and `SECURITY.md` now dispositions all ten findings and all ten carried issues, states the invariants the suite holds, and says what the review did not cover. The plan was amended twice mid-task, both times on a stop I raised: the known answer could not be both inside the blinded tree (where the runner read it) and unreadable by the legs, so it stays in this checkout and reaches the rollup through a one-line `KNOWN_ANSWER_FILE` override (#112 later made that the prescribed form); and #111 arrived as an issue rather than as a plan, which I declined to act on until #112 put it in `TASK.md`. No contract changed. Five findings are accepted as changes for m03-t05, so t05 stands.

## Provenance, verbatim from `AUDIT.md`

```
audit date        2026-10-30
code commit       37eccc212fdb91b6a6db0900eef104130b0c8d42  (dirty: no)
scope             src/Distribution.sol
                  src/App.sol
                  scripts/forge/Deploy.s.sol
                  scripts/forge/DeployApp.s.sol
skill             https://github.com/pashov/skills @ f6c7f0de9cce16f6aa9c57aaac104f0dee90582e  · solidity-auditor VERSION 4
leg 1             codex codex-cli 0.158.0 · requested gpt-5.6-sol → observed gpt-5.6-sol · effort high · 1 pass · 333s wall
leg 2             claude 2.1.310 (Claude Code) · requested opus → observed claude-opus-5-5 · 1 pass · 435s wall
tokens            leg 1 118,751 · leg 2 1347399
```

`code commit` is the blinded tree's, not this repo's. `audits/2026-10-30/BLIND.md` maps it to `ede55c3`; the four sha256s are identical in both trees, which is what ties the runs to one source across two repositories.

### Cost, per leg and end to end

| | wall | tokens | agents | PoCs |
|:--|:--|:--|:--|:--|
| leg 1 — codex `gpt-5.6-sol`, effort high | 333 s | 118,751 | **3/12** | none |
| leg 2 — claude `claude-opus-5-5` | 435 s | 1347399 | 12/12 | several |
| rollup — claude `claude-opus-5-5` | 130 s | not reported | — | — |

**End to end: 899 s, about 15 minutes** — launched 22:19:46 CDT, last log write 22:34:45 CDT, and the three stages sum to 898 s, so nothing material is unaccounted. The plan budgeted an hour on `state-collection`'s 696 s and 1,084 s legs; this run came in well under it. Scope was 4 files, 635 lines. Token formatting differs between the legs (`118,751` against `1347399`) because each harness reports its own; the artifact reproduces both as given.

## Findings — ten, by severity

**4 Medium, 5 Low, 1 Informational**, reduced by the rollup from nineteen items across the two legs. One line each, with its disposition:

| | Finding | Severity | Disposition |
|:--|:--|:--|:--|
| F1 | reentrant `applyQueued` swaps the table mid-`distribute` | Medium | **accepted → m03-t05** |
| F2 | queued actions outlive an ownership handover or a renounce | Medium | **accepted → m03-t05** |
| F3 | `DeployApp` owner defaults to Foundry's default sender | Medium | **accepted → m03-t05** (deploy script, not a contract) |
| F4 | `reserved[token]` above the balance blocks `distribute` and `release` | Medium | none needed — carried #19, decision 23 |
| F5 | an escrow whose recipient cannot take the push can never be released | Low (lead) | none needed — carried #95, decisions 25 and 6 |
| F6 | the ETH push copies unbounded return data on every failure | Low | **accepted → m03-t05** |
| F7 | `receive()` cannot run under a 2,300-gas stipend when cold | Low | none needed — carried #18, criterion 5 |
| F8 | uncapped gas on the ERC-20 push lets a hook token grief `distribute` | Low (lead) | **accepted → m03-t05** |
| F9 | queued actions never expire, and any caller chooses the order | Low (lead) | none needed — `test_cancelThenApplyReverts`; residual is F2's |
| F10 | the last row collects every row's rounding remainder | Informational (lead) | **rejected** — intended design, `PROJECT_OVERVIEW` § 5 and `test_rounding_3333_3333_3334` |

The reasoning for each is in `SECURITY.md` § Findings — disposition. **F3 is the one finding no carried issue anticipated**, and it lands in a scope file; I verified it in source rather than taking the report's word (`DeployApp.s.sol:11` evaluates `vm.envOr("OWNER", msg.sender)` before `vm.startBroadcast()` at `:14`, and `:8` claims "defaults to the broadcaster"). `Deploy.s.sol` does not share the shape.

## Known-answer grading, per leg

| Known issue | Leg 1 (codex) | Leg 2 (opus) |
|:--|:--|:--|
| #19 `reserved` above balance | **found** (scored, Medium) | **found** (lead) |
| #54 `propose` queues an always-reverting action | missed | missed |
| #95 escrow to a push-burning recipient | missed | **found** (lead) |
| #18 `receive()` over the stipend when cold | missed | **found** (scored, Low, with a PoC) |
| #22 CREATE2 collision burns forwarded gas | missed | missed |

**Leg 1 found 1 of 5. Leg 2 found 3 of 5** (one scored, two as leads). Both missed #54 and #22, and **neither leg raised anything at all in `DistributionFactory`** — the factory got no finding from either lab. Not rounded up: this is the only evidence about the method that is not an assertion, and two of five known shapes went unfound by both legs.

**Blinding held, with positive evidence rather than only an absence.** Neither leg reported #20, #61 or #74 — all closed in `ede55c3` — as open. No leg raised an opaque `release` failure, `_push`'s overstated comment, or single-step `transferOwnership`. Leg 1's F2 sits on `acceptOwnership` and assumes the two-step flow, and leg 1 quotes `_push`'s return-word check as it stands at `:326`. Those are properties of the code at `ede55c3`, not of any description of it.

## The blinded tree, and what the shape cost

`ls -A` immediately before `make audit`:

```
audits  foundry.toml  .git  .gitignore  lib  Makefile  mk  scripts  src
```

No `docs/`, `test/` or `app/`; no `README.md`, no `SECURITY.md`, no `audits/KNOWN_ANSWER.md`, no `.solidity-auditor/`. `lib` is a symlink to this repo's `lib/`; `audits/` held only `SCOPE`, `SKILL_PIN` and `prompts/`. `forge build` succeeded there on the pinned forge `1.7.1-dev` (22 files, solc 0.8.34, `via_ir`, `cancun`).

**What it cost:** building and committing the tree, one line in `scripts/audit.sh`, and the loss of `devbox run --` inside it. Everything `audit.sh` needs is on the bare PATH, and the string `forge` appears in it zero times, so the runner cannot invoke forge even by accident. The shape held: see the grading above. **This is the first full two-leg run on a blinded tree**, so § For the fragment below is what the method needs before the fragment carries it.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — reviewed commit final | **pass, with a deviation** | `git log -1 --format=%s ede55c3` → `Merge pull request #103 from dnznlabs/m03/t02-primitive`. `git diff --stat ede55c3 origin/main -- src/` empty. The second command, `git diff --stat ede55c3 -- src/ test/ .gas-snapshot`, is **not** empty — see deviation 7; the intent passes. |
| 2 — audit complete in the method's sense | pass | `audit complete: audits/2026-10-30/AUDIT.md` (log line 6031). Provenance `code commit 37eccc2… (dirty: no)`. Both leg dirs 3 files each. `grep -c 'ede55c3' audits/2026-10-30/BLIND.md` → 5, and it carries the four sha256s as measured in both trees. |
| 3 — scope | pass | `grep -vE '^\s*(#\|$)' audits/SCOPE \| wc -l` → `4`; `grep -c '#' audits/SCOPE` → `23`. |
| 4 — known answer written and graded | pass | `grep -c 'rake/issues/' audits/KNOWN_ANSWER.md` → `8`. `AUDIT.md` § 4 states per leg which of the in-code five each found. |
| 5 — the legs could not have read the answer | pass | `BLIND.md`'s `ls -A` shows no `audits/KNOWN_ANSWER.md`; `test ! -e <blind>/audits/KNOWN_ANSWER.md` held before **and** after the run. `grep -c 'KNOWN_ANSWER_FILE' scripts/audit.sh` → `1`. `diff ../shared/templates/forge-audit/files/scripts/audit.sh scripts/audit.sh` → two hunks, the `if` test and the `cat`, plus the comment. |
| 6 — `SECURITY.md` dispositions everything | pass | All ten of `18 19 20 22 23 54 61 74 95 111` ≥ 1. `AUDIT.md` carries **10** findings (`grep -c '^### F[0-9]'`) and `SECURITY.md` carries **10** rows — counted both. `two-model agent review` → 1; `ede55c3` → 4; `independent audit` hits only the sentence denying it. |
| 7 — the stipend claim is qualified | pass | `grep -n '2,300' docs/brainstorming/PROJECT_OVERVIEW.md` → line 61, which now names `SECURITY.md`. `git diff --stat origin/main -- docs/brainstorming/` → only `PROJECT_OVERVIEW.md`. `grep -c 'cold' app/src/index.html` → 3, untouched. |
| 8 — the `AUDIT` cell | pass | `grep -c 'none yet' README.md` → `0`; the cell reads `two-model agent review, 2026-10-30 ([SECURITY.md](SECURITY.md))`, not "audited". |
| 9 — hygiene | pass | In the plan's order on pinned forge `1.7.1-dev`: `build --force` successful; `test` **63 passed, 0 failed**; `snapshot --check` exit 0 with all 63 run; `lint` exit 0; `fmt --check` exit 0 last. `git status --porcelain` empty after all five. `grep -c 'fragment: forge-audit' AGENTS.md .gitignore` → 1 each. |
| 10 — this file | pass | Provenance verbatim above, per-leg wall and tokens, the grading, the severity counts, the tree listing and its cost, and one line per finding with its disposition. |

## Deviations from the plan

1. **The `scripts/audit.sh` diff criterion** (raised against `a1f45f1`, prescribed by `7be99fa`). The plan as merged in #108 asked for `git diff --stat origin/main -- scripts/audit.sh` showing only the § rollup read. That cannot hold: step 1 installs `audit.sh` on this branch, so `main` has no copy and the diff is the whole file — **348 insertions**, re-measured after each rebase. I ran the faithful substitute against the fragment's pristine copy, which yields exactly two hunks. #112 then made that the prescribed form, and its own words ask for both; both are shown in AC 5 and here.
2. **A sixth invariant group.** `App`'s 21 document/widget tests fall outside step 7's five named properties but are 21 of the 63 and belong to `src/App.sol`, which is in scope. Grouped rather than dropped. Verified with a **two-way** `comm` between the names cited in `SECURITY.md` and `forge test --list`: nothing cited that the suite lacks, nothing in the suite omitted. 5 + 11 + 4 + 16 + 6 + 21 = 63.
3. **`git submodule update --init` on the worktree.** `lib/forge-std` and `lib/solady` were uninitialised in the fresh worktree, and `forge test --list` plus every step 10 gate need them. Not `make init`, which the plan forbids.
4. **Provenance records host `node v24.21.0`, not devbox's `v24.12.0`.** `devbox run --` cannot work inside the blinded tree, which has no `devbox.json` by design. `node` is used only to `JSON.parse` `claude.json` (`audit.sh:256-263`), so there is no behavioural difference — recorded as what ran rather than inherited from the plan's preamble.
5. **`devbox run --` does not apply to step 5.** Adding a `devbox.json` would put a non-code file in a tree whose purpose is holding nothing but the code, and it is not in step 4's file list. The bare PATH carries everything the runner needs.
6. **Step 4's sha256 check was order-sensitive** — glob order against the plan's order, so an unsorted `diff` reported a difference that was not one. Raised, and #108 adopted the sorted form. Resolved, not outstanding.
7. **AC 1's second command cannot pass, and not because of this branch.** `git diff --stat ede55c3 -- src/ test/ .gas-snapshot` lists `test/model.test.mjs` (44 insertions). That file was changed by t03's `a05a66b` and `1df33bb`, merged into `main` via #109 — authored under the same git identity as my commits, which is why I measured it rather than assuming: `git log origin/main..HEAD -- test/model.test.mjs` is **empty**, and `git diff --stat origin/main -- src/ test/ .gas-snapshot` is **empty**, so this branch introduces nothing in the gated paths. The criterion's `test/` is broader than § Out of scope's own `test/*.t.sol`; measured that way, `git diff --stat ede55c3 -- src/ .gas-snapshot 'test/*.t.sol'` is empty. Suggest the criterion adopt § Out of scope's wording.
8. **The run was launched from a terminal, not by this agent.** Foreground `Bash` here caps at 600,000 ms while `LEG_TIMEOUT` is 5,400 s per leg, and `run_in_background` was denied environment-wide — to the parent session as well as to me, on different commands. Denizen opened a Control UI terminal and authorised the parent to drive it, and step 5 ran detached with `setsid` after a staged launcher re-checked every precondition. **This is a separate authorisation, not the refused one retried under another name**; nobody routed around the denial with `nohup`/`setsid` under agent control, and the runner was never split to fit the cap.

## Decisions

- **The accept/reject split is mine and wants the architect's confirmation.** Five accepted (F1, F2, F3, F6, F8), four `none needed`, one rejected. F8 is accepted as a lead for t05 to *size*, not as settled work: capping gas on an ERC-20 `transfer` can break compliant tokens that legitimately need more, so the fix may be worse than the finding. F9 is `none needed` because `cancel` (`:210`) is owner-only and immediate, so a stale queued action is droppable — its renounce residual is F2's row, and folding it in would duplicate F2 in t05.
- **F4, F5 and F7 are `none needed` rather than `rejected`.** Each is real and each is a ruled, documented acceptance (decisions 23, 25/6, and #18's qualifier). The plan's three options do not name "real but accepted by decision", so I used `none needed` with the decision number and cross-referenced § Carried issues rather than calling a true finding rejected.
- **`README.md`'s prose still says the contracts are unaudited.** Step 9 changes only the `AUDIT` cell, and the sentence remains true: `audits/README.md` and `SECURITY.md` both say this method is not an audit and not a guarantee. Left deliberately.

## Discoveries

- **The blinded tree does not blind leg 2 to leg 1.** `audit.sh` harvests leg 1 into `audits/<date>/pashov/solidity-auditor/<model>/` *inside* `$REPO_ROOT` before leg 2 starts, and leg 2 runs with that directory as its cwd. Leg 2 reports that its agent 2 grepped the tree and surfaced lines of leg 1's report about the `DeployApp` `OWNER` default (`AUDIT.md` § F3, § 5). The rollup caught it and discounted F3's cross-leg agreement, which is why § 3 counts three clean two-lab agreements rather than four. Independence is the only claim the two-leg method makes, so this is the most important thing this run learned.
- **Leg-width degradation is the runtime, not the tree size.** `state-collection`'s 2026-09-30 note observed a codex leg returning 12/12 agents in a small blinded directory against 3/12 in the full repo, wondered whether tree size moved it, and asked for a reproduction. This run is that reproduction and it contradicts the hypothesis: a blinded tree of four source files and a symlink, and leg 1 still returned **3/12**, saying so itself — *"This runtime provided only three audit-worker slots."* Tree size is not the cause.
- **Two defects in `audits/KNOWN_ANSWER.md`, neither affecting the grading.** The rollup caught the first: the #54 entry says the owner's remedy is "a `cancel`, which must itself wait out the delay", but `cancel` (`:210`) is owner-only and **immediate**, and its NatSpec says so ("the delay guards applying, not cancelling"). The second is mine and `TASK.md`'s together: the #19 entry calls `:135` "the unchecked subtraction", which `TASK.md:66` also says — but **there is no `unchecked` block anywhere in `src/Distribution.sol`**, so it is a checked subtraction. My own sentence was self-contradictory, since an unchecked subtraction would wrap rather than revert, and I asserted it reverts. Leg 2 got it right independently (`AUDIT.md` F4: "the **checked** subtraction then reverts"). Both are recorded rather than corrected in the artifact; the next audit's known answer should fix them, and `TASK.md`'s wording too.
- **F6 bounds the beneficiary table tighter than m03-t01 measured.** Unbounded return-data copying in the `distribute` loop breaks the "at most 107 rows, under half a 30M block" property at about eleven hostile rows. `test_capRowsStayUnderHalfABlock` still passes because it does not model hostile return data. t05 should re-measure the cap after discarding the data.
- **One measurement is in conflict and should not be re-quoted until settled.** Leg 2's second agent reports about 4,200 gas for `receive()` **even warm**, against m01-t01's 1,662 warm with the event and 250 without. `AUDIT.md` asks for confirmation at triage. The `PROJECT_OVERVIEW` sentence added here claims only what is agreed — that the stipend holds warm and a cold `DELEGATECALL` adds 2,600 — so it does not depend on which figure is right.
- **Leg 2's line citations run about +3 lines off** throughout, while its function names are correct; `AUDIT.md` says so and matches findings to code by function name. Trust names over numbers, as the known answer already advised.

## § For the fragment

What the method needs before the shared fragment carries the blinded tree. The fragment under `shared/` is Denizen's and was not edited from here.

1. **The `KNOWN_ANSWER_FILE` override, upstream.** Without it a blinded tree must either hold the answer key — and grade legs that could read it — or omit it and not grade at all. rake's installed copy carries the one-line override; the fragment does not.
2. **Leg 1's output must not be inside the tree leg 2 runs in.** The breach above is structural and will recur on every run. Harvest leg 1 outside `$REPO_ROOT`, or defer both harvests until after leg 2.
3. **`codex.log` dies with the scratch on success.** `cleanup()` (`:33-39`) removes `$SCRATCH` on exit 0, so the Codex leg's transcript — the only artifact that can evidence what a leg read — survives a successful run only if `TMPDIR` (`:26`) points somewhere kept. **That somewhere must be outside any blinded tree**: `cat` inlines the known answer into `$SCRATCH/rollup-prompt.md`, and `.gitignore`'s `.audit-*/` does not match `mktemp`'s `audit-XXXXXX`, so relocating it into the tree would write the answer back into the tree the design exists to keep it out of. A fix for one gap reintroducing the leak it closed.
4. **The Claude leg leaves no tool-call transcript.** It runs `--output-format json`, which the CLI documents at 2.1.310 as a single result; per-message streaming, where tool calls appear, needs `--output-format stream-json`. `codex exec` prints its tool calls to stdout. So read-measurement across the two legs is **asymmetric** — one measurable, one not — which is why "include the key and measure whether it was read" was rejected as a way to keep grading.
5. **The links point into the blinded tree after a run.** `ln -sfn` (`:155`) re-points `~/.claude/skills/solidity-auditor` and `~/.codex/skills/solidity-auditor` at `<blind>/audits/.skills/pashov/solidity-auditor` on every run. Deleting the blinded tree therefore breaks `solidity-auditor` for every agent on the machine until the next run re-points them. Before: both → `state-collection-t09a/audits/.skills/pashov/solidity-auditor`. After: both → `rake-blind-2026-10-30/audits/.skills/pashov/solidity-auditor`, `f6c7f0d`, VERSION 4, so the skill the legs read is identical to the pin. The blinded tree is being kept in place for that reason.
6. **The upstream version check needs network and did not get it.** Leg 1: *"The upstream skill-version check also could not reach the network."* Leg 2 reports the pin is VERSION 4 while upstream is 4.1, and ran 4. The pin behaved correctly; the warning fires against upstream `main` rather than `SKILL_PIN`, as § Known limits predicts.

## Open questions

None for the Product Owner. The accept/reject split in § Decisions is the architect's to confirm at review, and the two measurement questions (F6's cap, F7's warm figure) are t05's to settle with code and a test rather than rulings.
