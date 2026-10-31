# What the legs read, and why it was not this repo

`AUDIT.md`'s provenance block names a `code commit` of
`37eccc212fdb91b6a6db0900eef104130b0c8d42`, which is not a commit in this repository. That is
correct and deliberate: it is the commit of the **blinded tree** the legs actually ran in. This file
maps it back to the reviewed commit.

## The mapping

| | |
|:--|:--|
| Reviewed commit (this repo) | **`ede55c3`** — `Merge pull request #103 from dnznlabs/m03/t02-primitive` |
| Blinded tree commit | **`37eccc212fdb91b6a6db0900eef104130b0c8d42`** — `rake src/ and deploy scripts at ede55c3, for a blind two-model review` |
| Blinded tree path | `~/src/rake-blind-2026-10-30` (under `~/src/`, never `/tmp`, which is shared) |
| Provenance dirty flag | `dirty: no`, captured at preflight before any leg wrote a byte |

The two commits differ because the blinded tree is a separate one-commit repository — `codex exec`
refuses to start outside a git repo — so **the file hashes, not the commit, tie the two runs to the
same source.** Measured in both trees after the run:

```
57b69fa612b341e778057cb49a6b8647f5e082c7a18e7565fc2ccee7be8dab46  src/Distribution.sol
a64f592bcf24cc6e315c4a41c62676cd07f54806cc39d387b8db386f0bf95f16  src/App.sol
8eb47f843277c4b94ba69487ed2c598a7706633b345ebc31d2aa34351634be40  scripts/forge/Deploy.s.sol
672408a1b010eebcf64611cd4b6f856685d0bd39b29faee8d37f84fc0a619122  scripts/forge/DeployApp.s.sol
```

Identical in this checkout at `ede55c3` and in the blinded tree at `37eccc2`, compared with a
**sorted** diff on both sides — glob order and the plan's order differ, and an unsorted comparison
reports a difference that is not one.

## The tree, as the legs found it

`ls -A` immediately before `make audit` started:

```
audits  foundry.toml  .git  .gitignore  lib  Makefile  mk  scripts  src
```

Nothing under `docs/`, `test/` or `app/`; no `README.md`, no `SECURITY.md`, no
`audits/KNOWN_ANSWER.md`, no `.solidity-auditor/` from an earlier run. `lib` is a symlink to this
repo's `lib/`. `audits/` held only `SCOPE`, `SKILL_PIN` and `prompts/`.

The run itself then added `.solidity-auditor/` (the skill's own scratch), `audits/.skills/` (the
pinned clone) and `audits/2026-10-30/` — all three gitignored, and all three created *after* the
preflight that recorded `dirty: no`. A listing taken now is therefore larger than the one above;
the one above is the one that evidences the blinding.

## Why the legs did not run in this checkout

The method's 2026-09-30 lesson, in its own words: **"A prompt cannot make a leg blind to the
filesystem it is pointed at"** (`../README.md` § Re-running one leg after a fix). A leg started
inside this checkout reads this checkout — and this checkout contains ten markdown files that name
every carried weakness, the task plan among them. On 2026-09-30, in the project this method came
from, the first attempt grepped `TASK.md` 62 times and the previous `AUDIT.md` 60 times, then
reported no findings: the result a leg that had simply agreed with a document it read would also
produce. So the legs run in a directory holding nothing but the code, and the known answer stays in
this checkout, reaching the rollup through `KNOWN_ANSWER_FILE` as shell-read prompt text rather than
as a file any leg could open.

**It worked, and there is positive evidence rather than only an absence.** Neither leg reported
#20, #61 or #74 — closed in `ede55c3` — as open. No leg raised an opaque `release` failure, `_push`'s
overstated comment, or single-step `transferOwnership`. Leg 1's F2 sits on `acceptOwnership` and
assumes the two-step flow, and leg 1 quotes `_push`'s return-word check as it stands at `:326`. Those
are properties of the code at `ede55c3`, not of any description of it, so the legs read the source.

## The one breach, recorded rather than smoothed over

Leg 2 reports that its agent 2 ran a `grep` over the tree that matched files under
`audits/2026-10-30/` and surfaced a few lines of **leg 1's report** — specifically about the
`DeployApp` `OWNER` default (`AUDIT.md` § F3, § 5).

This is structural, not bad luck. `scripts/audit.sh` harvests leg 1 into
`audits/<date>/pashov/solidity-auditor/<model>/` *inside* `$REPO_ROOT` before leg 2 starts, and leg 2
runs with that same directory as its working directory. **So the blinded tree blinds each leg to
this repository's documents, but not the second leg to the first leg's output.** The rollup caught
it and discounted F3's cross-leg agreement accordingly, which is why § 3 counts three clean
two-lab agreements rather than four. Independence is the only claim the two-leg method makes, so
this belongs upstream in the fragment, not just here.
