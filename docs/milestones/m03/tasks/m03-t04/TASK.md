# m03-t04 — The review

Milestone: [M03](../../MILESTONE.md) · Phase: 3 — The review

When this is done, two models from two labs have read the final `src/` and the two deploy scripts
blind, their findings are reconciled in `audits/<date>/AUDIT.md` with a provenance block, and
`SECURITY.md` at the repo root dispositions every finding and every carried issue, names the
reviewed commit, states the invariants the suite holds and what the review did not cover. The
overview's stipend claim is qualified and `README.md`'s `AUDIT` cell stops saying `none yet`. No
contract changes here: a finding that needs one is accepted or rejected in `SECURITY.md` and the
accepted ones are t05's.

**The reviewed commit is `ede55c3`**, the merge of [#103](https://github.com/dnznlabs/rake/pull/103)
(m03-t02), confirmed 2026-10-30: `git log -1 ede55c3` is `Merge pull request #103 from
dnznlabs/m03/t02-primitive` and `git diff --stat ede55c3 origin/main -- src/` is empty. t03 runs
beside this task and touches only `app/`; `src/` and `scripts/forge/` do not move (milestone
§ Phases). If step 0's diff is ever non-empty, stop and say so — the review commit has moved and
this plan is stale.

## Plan

Every command runs from the repo root through `devbox run --` unless it says otherwise (forge
`1.7.1-dev`; `claude` and `codex` are host binaries, not devbox packages — observed on this VM on
2026-10-30: `claude` 2.1.310, `codex-cli` 0.158.0, `codex login status` → `Logged in using
ChatGPT`, meeting the method's minimums of 2.1.268 and 0.158.0). Branch `m03/t04-review` from
`origin/main` at or after `ede55c3`. Check hooks with `ls .git/hooks | grep -v sample` (expect
`pre-commit` and `post-commit`); do not run `make init`.

0. **The commit is the one the plan names.** `git diff --stat ede55c3 origin/main -- src/ scripts/forge/Deploy.s.sol scripts/forge/DeployApp.s.sol`
   prints nothing. Record the four sha256s (`sha256sum src/Distribution.sol src/App.sol scripts/forge/Deploy.s.sol scripts/forge/DeployApp.s.sol`);
   on `ede55c3` they begin `57b69fa6`, `a64f592b`, `8eb47f84`, `672408a1` — re-run rather than
   quote, and if any differs, stop.

1. **Install the method.** `bash ../shared/scripts/add.sh forge-audit` (or `make add F=forge-audit`)
   from the repo root. It lands `scripts/audit.sh`, `audits/README.md`, `audits/prompts/leg.md`
   and `rollup.md`, `audits/SKILL_PIN` (`pashov/skills` at `f6c7f0de`, `solidity-auditor`
   VERSION 4), `audits/SCOPE.example`, `mk/20-audit.mk` (`make audit`, `CLAUDE_MODEL ?= opus`,
   `CODEX_MODEL ?= gpt-5.6-sol`), and appends a `fragment: forge-audit` block to `AGENTS.md`
   (§ Audits) and to `.gitignore` (`.solidity-auditor/`, `audits/.skills/`, `.audit-*/`). Its
   `requires` is `forge-anvil`, which this repo already carries, so nothing else is copied. Read
   `audits/README.md` whole before step 4. Commit the fragment on its own.

   Check: `git status --porcelain` lists exactly those paths; `make help` lists `audit`;
   `grep -c 'fragment: forge-audit' AGENTS.md .gitignore` → 1 each.

2. **`audits/SCOPE` as decision 29 rules.** Four lines, in this order:
   `src/Distribution.sol`, `src/App.sol`, `scripts/forge/Deploy.s.sol`, `scripts/forge/DeployApp.s.sol`.
   Above them, a comment block with every exclusion and its reason, each a reason the method accepts
   (`audits/README.md` § Scope): `scripts/forge/Chunks.s.sol`, `Fixtures.s.sol`, `Seed.s.sol` —
   owner-run on a dev chain, never shipped (decision 29); `test/` — not shipped; `lib/forge-std`,
   `lib/solady` — dependencies we did not write, pinned by tag; `app/` — not Solidity; the dapp was
   signed off in M02 Phase 5 and a UI change after this review is a second review (decision 14);
   `tools/`, `mk/`, `app/build.mjs` — build tooling, no authority on chain. Delete
   `SCOPE.example` only if `add.sh` left it beside `SCOPE`; keep it otherwise, as the template does.

   Check: `grep -vE '^\s*(#|$)' audits/SCOPE | wc -l` → 4; every named file exists.

3. **`audits/KNOWN_ANSWER.md`: what the legs are not told.** Appended to the rollup prompt only
   (`scripts/audit.sh` § rollup), never to the leg prompt, so the rollup records per leg whether
   each was found. **It lives in this checkout and never enters the blinded tree** (ruled
   2026-10-30, after the engineer found that the runner reads it from the tree the legs run in,
   `audit.sh:302-305`, where a prompt cannot keep a leg from reading it, `audits/README.md:218-219`;
   step 5 says how the rollup reaches it). Two sections.
   - **Still in the code at `ede55c3`**, each with file, line and mechanism, which is what the
     rollup grades on: [#19](https://github.com/dnznlabs/rake/issues/19) `reserved[token]` above
     the balance (`distribute`, `:134`, the unchecked `balance − reserved`; decision 23 documents
     it); [#54](https://github.com/dnznlabs/rake/issues/54) `propose` queues an action
     `applyQueued` will always revert (`:176`; decision 25 documents it);
     [#95](https://github.com/dnznlabs/rake/issues/95) an escrow to a recipient that burns the
     push every time can never be released (`release` `:157` re-pushing under `PUSH_GAS` `:56`);
     [#18](https://github.com/dnznlabs/rake/issues/18) `receive()` (`:127`) over the 2,300-gas
     stipend when the implementation is cold; [#22](https://github.com/dnznlabs/rake/issues/22)
     a CREATE2 collision in `create` (`:364`) burns the forwarded gas before `DeploymentFailed`.
     The milestone's row names #19, #20, #54, #61, #74; #18, #22 and #95 are added here because
     they are shapes in the code a leg can find, which is the only kind of entry the method can
     grade (`audits/README.md` § Known limits).
   - **Closed before this audit**, one line each naming #103: [#20](https://github.com/dnznlabs/rake/issues/20)
     (`ReleaseFailed`, decision 24), [#61](https://github.com/dnznlabs/rake/issues/61) (`_push`'s
     comment, decision 26), [#74](https://github.com/dnznlabs/rake/issues/74) (two-step ownership,
     decision 21). A leg that reports one of these as open is reporting the code it did not read,
     and the rollup should say so.
   Line numbers from `ede55c3` (`grep -n 'function distribute\|function propose\|function release\|receive() \|function create' src/Distribution.sol`
   → 134, 176, 157, 127, 364 on 2026-10-30); re-verify, trust names over numbers.

   Check: `grep -c 'rake/issues/' audits/KNOWN_ANSWER.md` → 8.

4. **The blinded tree.** The method's 2026-09-30 lesson (`audits/README.md` § Re-running one leg
   after a fix): a leg started inside this checkout reads this checkout — ten markdown files that
   name every carried weakness, this plan included — and then reports what it read. So the legs
   run in a directory that holds nothing but the code. Under `~/src/` (never `/tmp`, which is
   shared), e.g. `~/src/rake-blind-<date>/`:
   - `foundry.toml` copied as is (its `fs_permissions` name directories that do not exist there;
     forge does not mind); `src/Distribution.sol`, `src/App.sol`;
     `scripts/forge/Deploy.s.sol`, `scripts/forge/DeployApp.s.sol` (their imports are
     `forge-std/Script.sol` and `../../src/…`, nothing else); `lib` as a symlink to this repo's
     `lib/`; `Makefile`, `mk/20-audit.mk`, `scripts/audit.sh` (as amended in step 5, so both
     trees hold the same script), `audits/SCOPE`, `audits/SKILL_PIN`, `audits/prompts/`,
     `.gitignore` (the audit block only). **Not `audits/KNOWN_ANSWER.md`**: the tree the legs run
     in holds nothing a leg could read as the answer.
   - `git init`, one commit whose message names `ede55c3` and the four sha256s (`codex exec`
     refuses a non-repo, and the provenance block needs a `HEAD` with `dirty: no`).
   - `forge build` succeeds there (same `solc 0.8.34`, `via_ir`, `cancun`), so a leg that compiles
     can; `sha256sum` of the four files matches step 0 byte for byte.
   - `ls -A` of the tree is recorded for the handoff: nothing under `docs/`, `test/`, `app/`, no
     `README.md`, no `SECURITY.md`, no `audits/KNOWN_ANSWER.md`, no `.solidity-auditor/` from an
     earlier run.

   Check: `diff <(cd <blind> && sha256sum src/*.sol scripts/forge/*.sol | sort) <(sha256sum src/Distribution.sol src/App.sol scripts/forge/Deploy.s.sol scripts/forge/DeployApp.s.sol | sort)`
   is empty (sorted on both sides: glob order and the plan's order differ, and an unsorted `diff`
   reports a difference that is not one); `git -C <blind> status --porcelain` is empty;
   `test ! -e <blind>/audits/KNOWN_ANSWER.md`.

5. **`make audit`, in the blinded tree, not here.** First, one change to this repo's installed
   `scripts/audit.sh` § rollup, committed on the branch before step 4 copies the script: the
   known answer is read from `${KNOWN_ANSWER_FILE:-$REPO_ROOT/audits/KNOWN_ANSWER.md}` instead of
   the hardcoded `$REPO_ROOT/audits/KNOWN_ANSWER.md` (`:302-305` on the fragment's copy), with the
   default unchanged so a tree that holds the file behaves as before. That is the whole change;
   nothing else in the runner moves (ruled 2026-10-30: the plan's step 4 put the file in the
   blinded tree and its § Out of scope forbade the runner change, and the two cannot both hold
   — the override is the one reading that keeps the legs blind *and* grades both of them. The
   alternative, running without a known answer and recording "not graded", loses the grading
   criterion below; measuring reads after the fact was rejected because the Claude leg's reads
   are unrecoverable from anything the runner keeps, so it would grade one leg and assume the
   other). Then `cd <blind> && KNOWN_ANSWER_FILE=<this checkout>/audits/KNOWN_ANSWER.md make audit`
   with the defaults (`CLAUDE_MODEL=opus`, `CODEX_MODEL=gpt-5.6-sol`); it runs the Codex leg, the
   Claude leg, then the rollup, each at `--loop 1`, and refuses to start if `audits/<date>/`
   already exists there. `state-collection`'s legs took 696 s and 1,084 s on 2026-09-28 (its
   `AUDIT.md` § Provenance); expect an hour, labelled an estimate, and `LEG_TIMEOUT` is 5,400 s
   per leg. The runner re-points `~/.claude/skills/solidity-auditor` and
   `~/.codex/skills/solidity-auditor` at the pinned clone with `ln -sfn` on every run
   (`audit.sh:155`); both directories are shared with the other agent on this VM, and the runner
   dies only if a path is occupied by something that is not a symlink (`:152-153`). Record where
   both links pointed before and after. Do not read the leg reports before the rollup finishes,
   and do not edit anything in the blinded tree while a leg runs. If a leg fails, the run is void
   (`audits/README.md` § Running it): fix the cause, move `audits/<date>/` aside, re-run; never
   hand-assemble a rollup.

   Check: the runner prints `audit complete: audits/<date>/AUDIT.md`; its provenance block has
   `dirty: no` and both leg directories under `audits/<date>/pashov/solidity-auditor/` are
   non-empty (milestone criterion 4's definition of complete); `test ! -e <blind>/audits/KNOWN_ANSWER.md`
   still holds after the run; `AUDIT.md`'s grading section names both legs;
   `sha256sum scripts/audit.sh <blind>/scripts/audit.sh` prints one hash twice.

6. **Harvest into this repo, with the mapping.** `cp -a <blind>/audits/<date> audits/<date>` here.
   `AUDIT.md` is not edited: its `code commit` is the blinded tree's `HEAD`, and that is correct —
   it is what the legs read. Beside it write `audits/<date>/BLIND.md`: the reviewed commit
   `ede55c3`, the blinded tree's commit, the four sha256s as measured in **both** trees, the `ls -A`
   of the tree, and the one-paragraph reason (§ Re-running one leg after a fix). `SECURITY.md`
   points at it. The method's prose about running outside the repo is for the single-leg re-check;
   this is the first full two-leg run on a blinded tree, so the handoff says whether the shape held
   and what it cost, which is what the method needs before the fragment can carry it.

   Check: `git status --porcelain` lists `audits/<date>/` and nothing under `.solidity-auditor/`
   or `audits/.skills/`; `grep -c 'ede55c3' audits/<date>/BLIND.md` ≥ 1.

7. **`SECURITY.md`, in multisig.software's shape.** Sections in this order, after that file's
   (`~/src/multisig/SECURITY.md` on this VM; its § Prior Audits and § Findings — Disposition are the
   template, the rest is that project's history):
   - **Prior reviews.** One entry: date, method (`two-model agent review`, the method's own name:
     `audits/README.md` § What an audit here is, and not — quote it, because milestone criterion 4
     requires `SECURITY.md` to call it what the README calls it "until D1(b) happens"), scope
     commit `ede55c3` (and the blinded commit, linking `BLIND.md`), scope (the four files),
     result (counts by severity as `AUDIT.md` adopts them), full report (`audits/<date>/AUDIT.md`).
     Then one sentence from decision 20: the paid review is an M05 go/no-go input, not a gate here.
   - **Findings — disposition.** One row per distinct finding in `AUDIT.md`, in its order:
     `ID | Severity | Contract change | Mitigation`. `Contract change` is `accepted → m03-t05`,
     `rejected` with the reason, or `none needed` with where the property is already held (a test
     name, a decision number). **No code moves in this task**: an accepted change is a row here and
     t05's work; if no finding is accepted, say so in one line, which retires t05.
   - **Carried issues — disposition.** One row per issue, each saying what was decided and where
     the ruling is: [#18](https://github.com/dnznlabs/rake/issues/18) (m01-t01's figures: 1,662
     gas warm with the event, 250 without, about 2,750 cold; documented, criterion 5's qualifier),
     [#19](https://github.com/dnznlabs/rake/issues/19) (decision 23: documented, one line of owner
     guidance), [#20](https://github.com/dnznlabs/rake/issues/20) (decision 24, closed by #103),
     [#22](https://github.com/dnznlabs/rake/issues/22) (m01-t02's measurement, about 1.04 billion
     gas in the harness; the dapp's `eth_getCode` refusal, M02 criterion 4; t06's per-chain
     `cast code` step), [#23](https://github.com/dnznlabs/rake/issues/23) (decision 10 and 32: the
     creator key is the address; t06's sentence), [#54](https://github.com/dnznlabs/rake/issues/54)
     (decision 25: documented), [#61](https://github.com/dnznlabs/rake/issues/61) (decision 26,
     closed by #103), [#74](https://github.com/dnznlabs/rake/issues/74) (decision 21, closed by
     #103), [#95](https://github.com/dnznlabs/rake/issues/95) (a known shape beside decision 25's:
     an escrow is recoverable only if the recipient becomes payable; the owner's remedy is a
     re-table, decision 6). Where the legs found one, the row says which leg (from `AUDIT.md`'s
     grading section).
   - **Invariants the suite holds.** From `forge test --list` on `ede55c3` (63 tests), grouped, with
     the test names: the table (sums to 10,000, ascending, no zero share, at most 107 rows), the
     owner (setters `onlySelf`, two-step transfer, renounce immediate, cap of one pending owner),
     the delay (`NotReady` until eta, cancel before apply), the money paths (`nonReentrant`,
     `PUSH_GAS` per push, escrow on failure, `reserved` never paid twice), the factory (sender-bound
     salts, same address across chains, `init` once). Count them; do not quote this list.
   - **What the review did not cover.** `app/` and the widget; `Chunks.s.sol`, `Fixtures.s.sol`,
     `Seed.s.sol`; `lib/`; the gateway and name resolution (M04); ERC-1363 (decision 28); and the
     method's own limit, quoted: two legs from two labs is the whole independence claim.
   - **The reviewed commit**, stated once more at the end with the rule from criterion 4: the
     commit `main` carries when M03 closes, or an ancestor whose diff to it touches nothing under
     `src/`.

   Check: for every `n` in `18 19 20 22 23 54 61 74 95`, `grep -c "rake/issues/$n\b\|#$n\b" SECURITY.md`
   ≥ 1 (criterion 4 names eight; #23 is the carried table's addition); `grep -c 'two-model agent review' SECURITY.md`
   ≥ 1; `grep -c 'ede55c3' SECURITY.md` ≥ 1; `grep -ci 'independent audit' SECURITY.md` hits only
   in the sentence saying it is not one.

8. **The overview's stipend claim (criterion 5, #18).** `docs/brainstorming/PROJECT_OVERVIEW.md:61`
   says `receive()` "stays under a 2,300-gas stipend". Append one sentence to that bullet: it holds
   while the implementation is warm; a cold `DELEGATECALL` adds 2,600, so a contract paying in
   with `transfer`/`send` can fail — see `SECURITY.md`. Nothing else in `docs/brainstorming/` moves;
   the folder is frozen. `#/docs`'s paying-in line already says it (`grep -c 'cold' app/src/index.html`
   → 3 on `ede55c3`) and is not touched here — it is t03's file.

   Check: `grep -n '2,300' docs/brainstorming/PROJECT_OVERVIEW.md` finds line 61 and the appended
   sentence names `SECURITY.md`; `git diff --stat origin/main -- docs/brainstorming/` is that one file.

9. **`README.md`'s `AUDIT` cell** (`:13-14`): `none yet (M03)` becomes
   `two-model agent review, <date> ([SECURITY.md](SECURITY.md))`. Not "audited".

   Check: `grep -c 'none yet' README.md` → 0.

10. **Hygiene, handoff, PR.** `forge build --force`, `forge test`, `forge snapshot --check` (no
    `src/` or test change, so the committed snapshot checks), `forge lint`, `forge fmt --check`
    last; `git diff --stat ede55c3 -- src/ test/ .gas-snapshot` empty. `HANDOFF.md` beside this
    file: the provenance block verbatim, wall-clock and tokens per leg, the known-answer grading
    per leg, the finding count by severity, the blinded-tree listing and what the shape cost,
    and the disposition of every finding in one line each. PR titled
    `docs(m03): the two-model review and SECURITY.md`, in the PR template's form, closing
    [#18](https://github.com/dnznlabs/rake/issues/18), [#19](https://github.com/dnznlabs/rake/issues/19),
    [#54](https://github.com/dnznlabs/rake/issues/54) and [#95](https://github.com/dnznlabs/rake/issues/95)
    — the rows are what those decisions said would close them. #22 and #23 stay open for t06.
    Review: architect first against this file, Product Owner second. **If any finding is accepted
    as a contract change**, t05 follows and its re-check obeys the milestone's constraint, quoted:
    "the leg from the other lab than the engineer who wrote the fix, a narrowed prompt committed
    beside it, run on a blinded tree".

## Acceptance criteria

- `git log -1 --format=%s ede55c3` → `Merge pull request #103 from dnznlabs/m03/t02-primitive`;
  `git diff --stat ede55c3 origin/main -- src/` and `git diff --stat ede55c3 -- src/ test/ .gas-snapshot`
  on the branch both print nothing (the reviewed commit is final; no contract change here).
- `audits/<date>/AUDIT.md` exists; its provenance block reads `dirty: no`; both directories under
  `audits/<date>/pashov/solidity-auditor/` are non-empty; `audits/<date>/BLIND.md` carries the
  four sha256s in both trees and `ede55c3` (milestone criterion 4, "complete in the method's own
  sense").
- `grep -vE '^\s*(#|$)' audits/SCOPE | wc -l` → 4, the four files decision 29 names;
  `grep -c '#' audits/SCOPE` ≥ 6 (an exclusion block with reasons).
- `grep -c 'rake/issues/' audits/KNOWN_ANSWER.md` → 8, and `AUDIT.md`'s grading section says per
  leg which of the in-code five it found.
- The legs could not have read the answer: `BLIND.md`'s `ls -A` shows no `audits/KNOWN_ANSWER.md`,
  and `grep -c 'KNOWN_ANSWER_FILE' scripts/audit.sh` ≥ 1 with `git diff --stat origin/main -- scripts/audit.sh`
  listing that one file and the diff touching only the § rollup read (the one runner change
  step 5 allows).
- For every `n` in `18 19 20 22 23 54 61 74 95`, `grep -c "rake/issues/$n\b\|#$n\b" SECURITY.md` ≥ 1
  (criterion 4's eight plus #23); every finding in `AUDIT.md` has a row in `SECURITY.md`
  § Findings — disposition (count both, state both); `grep -c 'two-model agent review' SECURITY.md`
  ≥ 1; `grep -c 'ede55c3' SECURITY.md` ≥ 1.
- `grep -n '2,300' docs/brainstorming/PROJECT_OVERVIEW.md` finds the § 5 line followed by a
  sentence naming `SECURITY.md`; `git diff --stat origin/main -- docs/brainstorming/` lists only
  `PROJECT_OVERVIEW.md` (criterion 5); `grep -c 'cold' app/src/index.html` ≥ 1.
- `grep -c 'none yet' README.md` → 0 and the `AUDIT` cell links `SECURITY.md`.
- `git status --porcelain` is empty after `forge build --force`, `forge test`, `forge snapshot --check`,
  `forge lint`, `forge fmt --check`; `grep -c 'fragment: forge-audit' AGENTS.md .gitignore` → 1 each.
- `HANDOFF.md` has the provenance block, per-leg wall clock and tokens, the known-answer grading,
  and one line per finding with its disposition.

## Out of scope

- Any change under `src/`, `test/*.t.sol` or `.gas-snapshot`. A finding that wants one is a row
  with `accepted → m03-t05`; the change, its test and the single-leg re-check are t05's.
- Editing `AUDIT.md` or anything under the leg directories. Audits are append-only; a wrong
  finding is dispositioned in `SECURITY.md`, not corrected in the artifact.
- A second full audit, or a re-run because the findings disappoint. One run; if a leg fails the
  run is void and is re-run as step 5 says.
- Generalising the blinded tree into `scripts/audit.sh` or the shared fragment. The method moves
  prose into the runner after it has run twice; this is the first full run. The one exception is
  step 5's `KNOWN_ANSWER_FILE` read, in this repo's copy only; the shared fragment is Denizen's
  and is not edited from here. Say in the handoff what the fragment would need, which already
  includes three things found before the run: the same override upstream; `codex.log` lives in
  `$SCRATCH`, which `cleanup()` removes on exit 0, so the Codex leg's transcript survives a
  successful run only if `TMPDIR` points somewhere kept; and the Claude leg runs
  `--output-format json`, so it leaves no tool-call transcript at all and its reads cannot be
  measured after the fact.
- `RUNBOOK.md` and the runbook's `cast code` steps (#22, #23) — t06. `#/docs` — t03.
- The paid external review (decision 20): a spend, M05's go/no-go input, not started here.

## Open questions

None for the Product Owner. Choices this plan makes, each the architect's and recorded here: the
known answer carries #18, #22 and #95 beyond the milestone row's five, and lists the three #103
closed as closed (step 3); `AUDIT.md`'s provenance names the blinded commit and `BLIND.md` carries
the mapping to `ede55c3`, rather than the artifact being edited after the run (step 6);
`SECURITY.md` has a #23 row the criterion does not require, because the carried table says it does
(step 7); the PR closes #18, #19, #54 and #95 and leaves #22 and #23 to t06 (step 10).

**Amended 2026-10-30, before any leg ran**, on the engineer's stop (relayed by Elanik): the plan
as merged in #105 put `audits/KNOWN_ANSWER.md` inside the blinded tree (step 4) while requiring
the legs to be unable to read it (step 4's reason) and forbidding any runner change (§ Out of
scope), and the runner reads the file from the tree it runs in. Ruled: the file stays out of the
tree and the rollup reads it through `KNOWN_ANSWER_FILE`, one line in this repo's `scripts/audit.sh`.
Steps 3, 4 and 5, one acceptance criterion and the out-of-scope clause changed; nothing else.

## Context

- [`MILESTONE.md`](../../MILESTONE.md) § Acceptance criteria 4 and 5; § Phases (Phase 3, and the
  2026-10-30 deviation that starts it beside t03); § Carried issues at close-out (which row lands
  where); § Human-in-the-loop requirements D1 and D10.
- `docs/ROADMAP.md` § Decisions 20 (D1: the method now, a paid review later), 29 (D10: the scope),
  and the ones the rows cite: 6, 10, 21, 23, 24, 25, 26, 28, 32; § Findings carried forward for
  #18, #19, #22, #23, #95's measurements and wording.
- The method: `audits/README.md` once installed (the shared fragment's
  `templates/forge-audit/files/audits/README.md`), § Scope, § Running it, § Provenance,
  § Re-running one leg after a fix (the blinded tree), § Known limits; `scripts/audit.sh` for what
  the runner records and where the known answer is appended.
- The worked example: `state-collection`'s `audits/2026-09-28/AUDIT.md` (shape, provenance, leg
  timings) and `audits/2026-09-30/` (the re-check and the contamination it records).
- The shape of `SECURITY.md`: multisig.software's, `~/src/multisig/SECURITY.md` on this VM.
- [m03-t02 `HANDOFF.md`](../m03-t02/HANDOFF.md) § Bytecode sizes (what the review reads is 8,469
  deployed bytes of `Distribution`, 1,320 of the factory, 7,118 of `App` on `ede55c3`);
  [m03-t01 `HANDOFF.md`](../m03-t01/HANDOFF.md) for #18's and the cap's figures.
- Issues this closes: [#18](https://github.com/dnznlabs/rake/issues/18),
  [#19](https://github.com/dnznlabs/rake/issues/19), [#54](https://github.com/dnznlabs/rake/issues/54),
  [#95](https://github.com/dnznlabs/rake/issues/95).
