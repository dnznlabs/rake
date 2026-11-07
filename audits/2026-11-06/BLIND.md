# What the legs read, and why it was not this repo

`AUDIT.md`'s provenance block names a `code commit` of
`d07483a8b9f6bcfe6200688bcb2d242450b9d464`, which is not a commit in this repository. That is
correct and deliberate: it is the commit of the **blinded tree** the legs actually ran in. This file
maps it back to the reviewed commit.

## The mapping

Two shas in this repository matter, and they are different things. Naming only one is what prompted
a correction while this review was being written, so both are given here and in `SECURITY.md`
§ The reviewed commit.

| | |
|:--|:--|
| Reviewed commit — **frozen head** (this repo) | **`94d028c`** — `chore(gas): re-snapshot for the ForeignChunk check`, the last commit touching `src/`, `test/*.t.sol` or `.gas-snapshot`; the sha the blinded tree is cut at |
| **Branch head** at the review (this repo) | **`0819552`** — `docs(audit): known answer for 94d028c — 6 present, 10 closed`, the commit after the freeze, which step 5 permits because it touches none of those three paths |
| Blinded tree commit | **`d07483a8b9f6bcfe6200688bcb2d242450b9d464`** — `rake src/ and deploy scripts at 94d028c, for a blind two-model review` |
| Blinded tree path | `~/src/rake-blind-2026-11-02` (under `~/src/`, never `/tmp`, which is shared) |
| Provenance dirty flag | `dirty: no`, captured at preflight before any leg wrote a byte |

**Both shas are still the live ones, and keeping them that way meant undoing a rebase.** The blinded
tree's own commit message says "at `94d028c`" and `audits/KNOWN_ANSWER.md` is titled for `94d028c`;
neither can be re-cut without re-cutting the review. Step 8 first brought `origin/main` at `7ff3be4`
(the merge of #146) in by **rebasing**, which replayed all four of the branch's commits under new
shas and left `94d028c` unreachable from the branch. That is not a cosmetic difference: after a
rebase-then-merge, `git show 94d028c` in a fresh clone of `main` answers with an unknown object, and
the third review's provenance survives only in GitHub's PR refs. The rebase was therefore discarded
and `main` was brought in as a **merge commit, `cb2e2a9`** — which is also rake's merge policy. The
frozen head and the branch head are the two shas above, unchanged since the run, and
`git merge-base --is-ancestor 94d028c HEAD` exits 0.

**No reviewed byte moved, and that is measured rather than argued.** The git tree object for `src/`
is `8ddcc99648627682d764f2d0b49345e801a248f5` at `94d028c`, at `0819552` and at this PR's head alike,
and `git diff --stat 94d028c HEAD -- src/ 'test/*.t.sol' .gas-snapshot` prints nothing. #146 moved
`app/` and the two node test files only; `git diff --name-only 679d1b8 7ff3be4 -- src/ 'test/*.t.sol'`
is empty, and `forge snapshot --check` exits 0 on the snapshot committed at the freeze. The four file
hashes below are the cross-check on the reviewed *bytes*; the commit shas are its identity, and
after the merge both are intact.

The two repositories' commits differ for the reason they always have — the blinded tree is a
separate one-commit repository, because `codex exec` refuses to start outside a git repo — so **the
file hashes, not the commit, tie the two runs to the same source.** Measured in both trees after the
run:

```
0d34f21a4a493c5c581bcfd173f63b573054a6da9aa0d3ef5d8f9e72c2e09776  src/App.sol
7d26e447f41a893793283efad28c8a7107d400fa977bc17b881d0cbda6c814ac  scripts/forge/Deploy.s.sol
ef5f089fca97e07f83a01f040676a2d60ba9ad7c384f3ba9eca82588e3b45be0  src/Distribution.sol
fecbff608909333aa0b29de3137e937c7c0dab4c8d79233276aef57afb7daf8e  scripts/forge/DeployApp.s.sol
```

Identical in this checkout at the frozen head and in the blinded tree at `d07483a8`, compared with a
**sorted** diff on both sides — glob order and the plan's order differ, and an unsorted comparison
reports a difference that is not one (m03-t04 `HANDOFF.md`, deviation 6). The rollup made the same
check independently from inside the run: `AUDIT.md` § 1 records `sha256(src/Distribution.sol)` =
`ef5f089f…` and `sha256(src/App.sol)` = `0d34f21a…`, the two hashes the known answer's line numbers
were verified against.

**All four scoped files moved since the 2026-10-31 run**, which is new: that run read
`100f1b6f…` for `src/Distribution.sol`, `a64f592b…` for `src/App.sol`, `8eb47f84…` for
`Deploy.s.sol` and `672408a1…` for `DeployApp.s.sol`, and none of those four hashes appears above.
Each change is attributable to one merged task:

| Scoped file | Moved by |
|:--|:--|
| `src/Distribution.sol` | `fb82136` — m03-t08, matured actions expire and the escrowed account can `claim` |
| `src/App.sol` | `a708b90` — **this task**, the `ForeignChunk` check |
| `scripts/forge/Deploy.s.sol` | `0a826dc` — m03-t06, the factory and `App` through the keyless proxy |
| `scripts/forge/DeployApp.s.sol` | `0a826dc` — m03-t06, the same commit |

So unlike the previous two runs, there is no scoped file whose bytes a prior run had the same
opportunity to read. The corollary the 2026-10-31 file drew — that a finding in an unmoved file is
one the previous run had the same bytes to find — has no instances here.

The tree was built with `git show 94d028c:<path>` rather than by copying the working tree, so no
uncommitted byte could reach it even if the checkout had held one.

## The tree, as the legs found it

`ls -A` in the blinded tree, with the two paths the run itself added removed:

```
audits  foundry.toml  .git  .gitignore  lib  Makefile  mk  scripts  src
```

Nothing under `docs/`, `test/` or `app/`; no `README.md`, no `SECURITY.md`, no
`audits/KNOWN_ANSWER.md`. `lib` is a symlink to this repo's `lib/`. `audits/` held only `SCOPE`,
`SKILL_PIN` and `prompts/`. The listing is t04's and t05's exactly, which is the point: the shape is
the one that has been shown to work, not a new one.

`forge build` succeeded there before the run on the devbox-pinned forge `1.7.1-dev` invoked by
absolute path, because the blinded tree deliberately has no `devbox.json` and `devbox run` would run
from the wrong root. `out/` and `cache/` are absent now and were removed after that build: neither
is in the blinded tree's cut-down `.gitignore`, so a build left in place would have made the
runner's own preflight record `dirty: yes`.

The run added **two** entries: `.solidity-auditor/` (the skill's own scratch, gitignored) and
`audits/2026-11-06/` (this directory). `audits/.skills/` was never created — the runner clones the
pinned skill to `~/.cache/forge-audit/pashov-skills@f6c7f0de…/` instead of into the project tree.
Both additions came *after* the preflight that recorded `dirty: no`, so a listing taken now is
larger than the one above; the one above is the one that evidences the blinding.

The same consequence the 2026-10-31 file recorded holds again, and is recorded rather than smoothed
over, because the plan asks for a check that cannot hold. `TASK.md` step 6 § Check asks for the
blinded tree's `git status --porcelain` to be **empty** after the run. Run as written it is not:

```
?? audits/2026-11-06/
```

That is the run's own output, and it is the whole of the output: the blinded `.gitignore` carries
only the forge-audit fragment's three entries — `.solidity-auditor/`, `audits/.skills/`,
`.audit-*/` — and the run's output directory is none of them, while in this checkout the same
directory is *committed* rather than ignored, which is why the check reads as reasonable until it is
run. The criterion can only pass in a tree where the output is either committed or ignored, and the
blinded tree is deliberately neither. **What the check was reaching for does hold:** nothing beyond
`audits/2026-11-06/` and the gitignored scratch was touched, no tracked file is modified, and the
`dirty: no` in the provenance block was captured before any leg wrote a byte. The literal output is
recorded here and in the handoff rather than replaced with a check that passes. Nothing was deleted
from the blinded tree to make it read clean.

## Why the legs did not run in this checkout

The method's 2026-09-30 lesson, in its own words: **"A prompt cannot make a leg blind to the
filesystem it is pointed at"** (`../README.md` § Re-running one leg after a fix). A leg started
inside this checkout reads this checkout — and this checkout contains the task plan, two previous
`AUDIT.md`s, `SECURITY.md` and the known answer, every one of which names the weaknesses the leg is
being asked to find, including the fix this very task makes. So the legs run in a directory holding
nothing but the code, and the known answer stays in this checkout, reaching the rollup through
`KNOWN_ANSWER_FILE` as shell-read prompt text rather than as a file any leg could open.

`audits/KNOWN_ANSWER.md` was verified absent from the blinded tree **before and after** the run, and
re-asserted after the harvest copy: `test ! -e ~/src/rake-blind-2026-11-02/audits/KNOWN_ANSWER.md`
passes, and a `find` for `KNOWN_ANSWER*` anywhere in that tree returns nothing.

### Leg independence, measured again

Measured on `transcripts/leg-2-claude.jsonl` (2,412 KB), this run:

| grep | count |
|:--|--:|
| `audits/2026-11-06/pashov` | **0** |
| `pashov/solidity-auditor` | **0** |
| `audits/2026-11-06` | **0** |
| `gpt-5.6-sol` | **0** |
| `codex` | **0** |
| `leg-1` | **0** |
| `KNOWN_ANSWER` | **0** |

Leg 2 never referred to leg 1's harvest, to leg 1's model or harness, to the output directory, or to
the answer key — it had no indication that a leg 1 existed. Every `solidity-auditor` path in its
transcript is either its own scratch (`.solidity-auditor/runs/…`) or the skill it was running. This
is the second run on which the independence claim has been measured rather than asserted: the
runner's staging holds each leg's harvest outside `$REPO_ROOT` until both legs have finished, so the
second leg has nothing of the first to find, and `--output-format stream-json` is what makes leg 2's
reads recoverable at all.

Only one of the eight distinct issues was reported by both legs (F3, the ERC-20 push gas), so the
weight this independence carries is smaller on this run than on the last: there is one two-lab
agreement to discount or trust, not three.

### Positive evidence that the blinding held

An absence of findings proves nothing on its own — a leg that read `SECURITY.md` and agreed with it
would also report nothing. These are properties of the code at the frozen head that a leg could only
have from the source.

- **Neither leg reports F11 open, and the fix is in the bytes they read.** This is the strongest
  evidence this run produces, and it runs the opposite way to the usual argument. `src/App.sol` in
  the blinded tree carries `error ForeignChunk(address ptr)` at `:46`, the `_requireChunk` definition
  at `:198` and its four call sites at `:125`, `:147`, `:172` and `:176`; in that tree
  `grep -v '^\s*//' src/App.sol | grep -c 'code.length'` is **0**. On 2026-10-31 leg 2 raised this
  exact shape at confidence 80 — its highest of that run — against the unfixed file. A leg handed the
  unfixed file again would have the same opportunity; a leg reading `SECURITY.md` would be told the
  shape exists. Neither leg raised it, which is what reading the fixed code looks like.
- **Leg 2 cites t08's lines, which existed nowhere before `fb82136`.** Its `L2#4` (F7 in the rollup)
  cites `applyQueued` at `:242`; in the blinded tree `function applyQueued` is at `:242` exactly, and
  `GRACE` is declared at `:65` and tested at `:249` and `:266`. A lead of leg 2's turns on
  `claim(address,address)`, which is at `:199` there and did not exist at all in the code the
  previous two runs read.
- **Leg 2's F5 rests on a disagreement only the current scripts show.** It argues the factory sits at
  one address on every chain from `scripts/forge/Deploy.s.sol`, whose `:11-12` name Arachnid's keyless
  proxy — t06's `0a826dc`, not in either previous run's scope bytes — while the factory's own NatSpec
  at `:454-456` still calls the factory "nonce-addressed". Both halves are in the tree; the
  contradiction between them is not in any document the legs were given.
- **Leg 1's and leg 2's line numbers track this head, not a remembered one.** `:155` for the
  `_balance(token) - reserved[token]` subtraction and `:417` for the uncapped ERC-20 push are the
  lines those expressions occupy at `d07483a8`, and both shifted with t08's insertions.

## The launcher, and why a person ran it

`~/src/rake-blind-2026-11-02-launch.sh`, staged under the blinded tree's parent and outside both
repositories. It re-checks the preconditions of `TASK.md` step 6 and refuses — **22 distinct
refusals** — rather than start a run that would have to be thrown away: both trees present, the
blinded tree still at the staged commit and not the superseded `2026-11-01` tree, the known answer
present in the checkout and **absent from the blinded tree**, the known answer naming this head and
carrying sixteen entries, the runner honouring `KNOWN_ANSWER_FILE`, the four scoped hashes matching
sorted on both sides, the checkout's `src/` and `test/*.t.sol`/`.gas-snapshot` still at the frozen
head, `src/Distribution.sol` unmoved since t08's merge, `forge build` succeeding on the pinned
binary, the tree clean so the provenance can record `dirty: no`, the dated output directory free in
**both** trees, `TMPDIR` unset so the scratch lands outside both trees, the five tools on `PATH`,
and `codex` logged in.

It was launched from a terminal rather than by an agent, as both earlier runs were: a foreground tool
call caps at ten minutes while `LEG_TIMEOUT` is 5,400 s per leg, and backgrounding is denied to
agents on this host. Nothing in either tree was edited while a leg ran.

**The directory is dated for the run, not for the tree.** The launcher takes
`AUDIT_DATE="${AUDIT_DATE:-$(date +%Y-%m-%d)}"`, so the output landed in `audits/2026-11-06/` while
the blinded tree it ran in is `~/src/rake-blind-2026-11-02`, cut on 11-02 and staged then. The two
dates are four days apart because the tree waited for a terminal, not because anything in it changed;
its commit `d07483a8` is dated 2026-11-02 08:47:13 -0600 and its scoped hashes are the ones above.
`SKILL_PIN` is unchanged at `f6c7f0de…`, solidity-auditor VERSION 4.

Neither leg ran the full twelve agents: leg 1's harness exposed four agent slots and covered the
twelve specialties with three reviewers (`scope.tsv`: `pass_1_agents 3/12`), and leg 2 lost three
agents — math/precision, invariants and economic security — to an API safeguard error and a safety
classifier (`pass_1_agents 9/12`). `AUDIT.md` § 5 records both in the legs' own words. The
math/precision and invariant gap is the most plausible reason leg 2 did not score F2 separately, and
it is worth carrying into M04's go/no-go rather than treating the two legs as equally staffed.
