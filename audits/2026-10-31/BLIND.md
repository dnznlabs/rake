# What the legs read, and why it was not this repo

`AUDIT.md`'s provenance block names a `code commit` of
`b2ed0609293efb997771d80ee320a63d2921fd6f`, which is not a commit in this repository. That is
correct and deliberate: it is the commit of the **blinded tree** the legs actually ran in. This file
maps it back to the reviewed commit.

## The mapping

| | |
|:--|:--|
| Reviewed commit (this repo) | **`b0fb4e3`** — `chore(gas): re-snapshot after the three fixes`, the head m03-t05 froze at step 9 |
| Blinded tree commit | **`b2ed0609293efb997771d80ee320a63d2921fd6f`** — `rake src/ and deploy scripts at b0fb4e3, for a blind two-model review` |
| Blinded tree path | a blinded tree beside this checkout, never `/tmp`, which is shared |
| Provenance dirty flag | `dirty: no`, captured at preflight before any leg wrote a byte |

The two commits differ because the blinded tree is a separate one-commit repository — `codex exec`
refuses to start outside a git repo — so **the file hashes, not the commit, tie the two runs to the
same source.** Measured in both trees after the run:

```
100f1b6f0e9f9689b8b6848ba05668c36eea1a386814550fb1ec5062ca581b79  src/Distribution.sol
672408a1b010eebcf64611cd4b6f856685d0bd39b29faee8d37f84fc0a619122  scripts/forge/DeployApp.s.sol
8eb47f843277c4b94ba69487ed2c598a7706633b345ebc31d2aa34351634be40  scripts/forge/Deploy.s.sol
a64f592bcf24cc6e315c4a41c62676cd07f54806cc39d387b8db386f0bf95f16  src/App.sol
```

Identical in this checkout at `b0fb4e3` and in the blinded tree at `b2ed060`, compared with a
**sorted** diff on both sides — glob order and the plan's order differ, and an unsorted comparison
reports a difference that is not one (m03-t04 `HANDOFF.md`, deviation 6). The rollup made the same
check independently from inside the run: `AUDIT.md` § 1 records that `sha256(src/Distribution.sol)`
at `b2ed060` matches the `100f1b6f…` the known answer records for `b0fb4e3`, which is how it
concluded its line numbers match the known answer's.

**Only `src/Distribution.sol` moved since the 2026-10-30 run**, which read
`57b69fa612b341e778057cb49a6b8647f5e082c7a18e7565fc2ccee7be8dab46`. `src/App.sol` and both deploy
scripts are byte-identical to what that run saw, which is why a finding this run raises in one of
those three is a finding the previous run had the same bytes to find. **F4 is exactly that case:**
it is in `src/App.sol`, whose bytes neither leg raised anything about on 2026-10-30.

The tree was built with `git show b0fb4e3:<path>` rather than by copying the working tree, so no
uncommitted byte could reach it even if the checkout had held one.

## The tree, as the legs found it

`ls -A` immediately before `make audit` started:

```
audits  foundry.toml  .git  .gitignore  lib  Makefile  mk  scripts  src
```

Nothing under `docs/`, `test/` or `app/`; no `README.md`, no `SECURITY.md`, no
`audits/KNOWN_ANSWER.md`, no `.solidity-auditor/` from an earlier run. `lib` is a symlink to this
repo's `lib/`. `audits/` held only `SCOPE`, `SKILL_PIN` and `prompts/`. The listing is t04's
exactly, which is the point: the shape is the one that has been shown to work, not a new one.

`forge build` succeeded there before the run — 22 files, solc 0.8.34 — on the devbox-pinned forge
`1.7.1-dev` invoked by absolute path, because the blinded tree deliberately has no `devbox.json` and
`devbox run` would run from the wrong root. `out/` and `cache/` were removed immediately afterwards:
neither is in the blinded tree's cut-down `.gitignore`, so a build left in place would have made the
runner's own preflight record `dirty: yes`.

The run then added **two** entries, not the three the 2026-10-30 run added: `.solidity-auditor/`
(the skill's own scratch, gitignored) and `audits/2026-10-31/` (this directory). **`audits/.skills/`
was never created** — the runner at `c12e188` clones the pinned skill to
`~/.cache/forge-audit/pashov-skills@f6c7f0de…/` instead of into the project tree, and this run was
the first to exercise that path. Both additions came *after* the preflight that recorded
`dirty: no`, so a listing taken now is larger than the one above; the one above is the one that
evidences the blinding.

One consequence is worth stating plainly rather than smoothing over, because the plan asked for a
check that cannot hold. m03-t05 `TASK.md` step 10 § Check asks for `git status --porcelain` in the
blinded tree to be **empty** after the run. Run as written it is not:

```
?? audits/2026-10-31/
```

That is the run's own output. The blinded `.gitignore` carries only the forge-audit fragment's three
entries — `.solidity-auditor/`, `audits/.skills/`, `.audit-*/` — and the run's output directory is
none of them; in this checkout the same directory is *committed* rather than ignored, which is why
the check reads as reasonable until it is run. So the criterion can only pass in a tree where the
output is either committed or ignored, and the blinded tree is deliberately neither. **What the
check was reaching for does hold:** nothing outside `audits/2026-10-31/` and the gitignored scratch
was touched, and the `dirty: no` in the provenance block was captured before any leg wrote a byte.
The literal output is recorded here and in the handoff rather than replaced with a check that
passes.

## Why the legs did not run in this checkout

The method's 2026-09-30 lesson, in its own words: **"A prompt cannot make a leg blind to the
filesystem it is pointed at"** (`../README.md` § Re-running one leg after a fix). A leg started
inside this checkout reads this checkout — and this checkout contains the task plan, the previous
`AUDIT.md`, `SECURITY.md` and the known answer, every one of which names the weaknesses the leg is
being asked to find. So the legs run in a directory holding nothing but the code, and the known
answer stays in this checkout, reaching the rollup through `KNOWN_ANSWER_FILE` as shell-read prompt
text rather than as a file any leg could open.

### The 2026-10-30 breach is closed, and this is the first run that could prove it

That run's leg 2 grepped the tree and surfaced lines of **leg 1's report**, because `audit.sh`
harvested leg 1 into `audits/<date>/` inside the tree leg 2 then ran in. Two changes in the runner
at `c12e188` fixed it, and they only pay off together:

- **Staging** — each leg's harvest is held in the scratch outside `$REPO_ROOT` and moved into place
  only after both legs have run, so the second leg has nothing of the first to find.
- **`--output-format stream-json`** — leg 2's transcript now records its tool calls. On 2026-10-30
  leg 2 ran under `--output-format json`, which persists the final result only, so **what that leg
  read was unrecoverable**: the breach was found in leg 2's own prose, and the absence of any
  *other* read could not be checked at all.

Measured on `transcripts/leg-2-claude.jsonl` (2,254 KB), this run:

| grep | count |
|:--|--:|
| `audits/2026-10-31/pashov` | **0** |
| `pashov/solidity-auditor` | **0** |
| `audits/2026-10-31` | **0** |
| `gpt-5.6-sol` | **0** |

At 2,254 KB this transcript exceeded `check-added-large-files`' 500 KB default, so that one hook was
narrowed with `exclude: ^audits/.*/transcripts/` in this PR — the limit still covers every other
path, and `betterleaks` still scans the transcripts.

Leg 2 never referred to leg 1's harvest, to leg 1's model, or to the output directory at all — it
had no indication that a leg 1 existed. Every `solidity-auditor` path in its transcript is either
its own scratch (`.solidity-auditor/runs/20261031-121753/`) or the skill it was running
(`~/.claude/skills/solidity-auditor/references/…`). **This is the first time the independence claim
has been measured rather than asserted**; the staging prevented the leak and the transcript is what
makes its absence provable.

### Positive evidence that the blinding held

An absence of findings proves nothing on its own — a leg that read `SECURITY.md` and agreed with it
would also report nothing. These are properties of the code at `b0fb4e3` that a leg could only have
from the source:

- **Neither leg reports #20, #61, #74, or the three findings this PR fixed (F1, F2, F6 of
  2026-10-30) as open.** The rollup checked each against the code rather than inferring it from
  silence (`AUDIT.md` § 4).
- **Leg 2's second lead depends on the F2 fix being present.** It complains that `_clearQueue`
  drops the owner's *own* queued `transferOwnership(owner)` withdrawal — a consequence of the fix,
  not a gap in it. A leg reading the pre-fix code could not have raised it.
- **Leg 2's third lead names the return-data copy on the ERC-20 branch only, and explicitly calls
  the ETH branch capped.** That is precisely the F6 design: the ETH copy is gone, the ERC-20 copy
  is kept by decision.
- Leg 2 cites `:423-426` for the proxy runtime. That block begins at `:420` in this head and at
  `:375` in `ede55c3` — a 45-line shift — so the citation is to the reviewed bytes, not to a
  remembered or a previously published line number.

## The launcher, and why a person ran it

the launch script beside the blinded tree, staged under the blinded tree's parent and outside both
repositories. It re-checks twelve preconditions and refuses rather than start a run that would have
to be thrown away: both trees present, the known answer present in the checkout and **absent from
the blinded tree**, the runner honouring `KNOWN_ANSWER_FILE`, the four scoped hashes matching, the
checkout's `src/` still being the frozen head, `forge build` succeeding, the tree clean so the
provenance can record `dirty: no`, `audits/2026-10-31` free, `TMPDIR` unset so the scratch lands
outside both trees, `make`/`git`/`node`/`claude`/`codex` on `PATH`, and `codex` logged in.

Four of those refusals were proved to fire rather than merely to pass — an answer key planted in the
tree, a stray file that breaks the build, a stray that does not and so is caught by the dirty check
instead, and a pre-existing `audits/2026-10-31` — because a check that can only ever pass is the
shape this repo has been burned by before. The tree was returned to clean after each.

It was launched from a terminal rather than by an agent, as t04's was (its handoff, deviation 8): a
foreground tool call caps at ten minutes while `LEG_TIMEOUT` is 5,400 s per leg, and backgrounding
is denied to agents on this host. Nothing in either tree was edited while a leg ran.
`audits/KNOWN_ANSWER.md` was verified absent from the blinded tree **before and after** the run.
