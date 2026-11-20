# Audits

How this project audits its contracts. The method lives here, in prose, deliberately — it uses skills
underneath, but a reader must be able to see what was run and why without opening one.

Nothing here is a skill, and nothing here should become one until it has run twice. What is
specific to this project — the scope, the reasons for every exclusion, a known answer — lives in
`SCOPE`, `KNOWN_ANSWER.md` and the project's `AGENTS.md`, never in this file or the prompts.

## What an audit here is, and is not

An audit is **several independent adversarial reviews of the same code, captured separately, then
reconciled into one document**. Independence is the point: two harnesses, two labs, two sets of blind
spots. A single review that agrees with itself tells you nothing.

It is **not** a guarantee, and it does not replace the tests. Where a property can be asserted, a test
beats a finding — a finding gets fixed once, a test refuses to let it come back.

### What "reproducible" means here

**The inputs are recorded; the output is not deterministic.** Re-running an audit does not reproduce
it — these are language models, and two runs of the same prompt over the same code return different
prose and sometimes different findings. Saying otherwise would be the most expensive lie in this
directory.

What is reproducible is the *setup*: anyone can re-run the same models over the same commit with the
same scope and the same skill version, because every audit records all four. A later disagreement is
then about findings, not about what was run.

## Layout

```
audits/
  README.md                          this file — the method
  SCOPE                              the files audited, one per line — this project's own
  KNOWN_ANSWER.md                    optional — a finding known before the audit, to grade the legs
  SKILL_PIN                          the audit skill source, pinned to a commit
  prompts/
    leg.md                           the prompt each independent review receives
    rollup.md                        the prompt that reconciles the legs
  <YYYY-MM-DD>/
    AUDIT.md                         the rollup — findings, severities, provenance
    pashov/
      solidity-auditor/
        gpt-5.6-sol/                 leg 1 — full-report.md, run-1.md, scope.tsv
        opus/                        leg 2 — same shape
    transcripts/
      leg-1-codex.log                everything leg 1 printed, tool calls included
      leg-2-claude.jsonl             leg 2's stream-json, tool calls included
```

The transcripts are the only evidence of what a leg read, so they are committed with the findings.
They land last, after the rollup, and never while a leg or the rollup could read them.

One directory per audit date. **Audits are append-only: a past audit is never edited**, because the
rollup of a later audit cites it. A finding that turns out to be wrong is corrected in the *next*
audit's `AUDIT.md`, marked as superseding, the same way decisions are.

`make audit` enforces that rather than trusting it: preflight refuses to start if `audits/<date>/`
already exists. A second run on the same date would otherwise merge into the first — the harvest
copies over a populated leg directory, so files only the earlier run wrote survive into the new
audit, and the rollup overwrites `AUDIT.md`. To re-run on a date that already has an audit, move the
existing directory aside, or pass `AUDIT_DATE`.

`<review-vendor>/<review-name>/<model>/` is the shape for every review, not just this one. A future
`slither/` or `pashov/x-ray/` slots in beside it without moving anything.

## Prerequisites

| | required | checked by |
|:--|:--|:--|
| `claude` | 2.1.268 or later | `claude --version` |
| `codex` | 0.158.0 or later, authenticated | `codex --version`, `codex login status` |
| audit skill | the commit in `SKILL_PIN` | `git -C ~/.cache/forge-audit/pashov-skills@<commit> rev-parse HEAD` |

Where both CLIs are subscription-authenticated, an audit costs rate limits and wall
clock, not money. Neither credential is pinned by the repo — `~/.codex` and `~/.claude` are the
user's. That is why the provenance block records the **observed** versions rather than asserting the
required ones.

The skill is cloned at the pinned commit rather than vendored: it is someone else's prose,
MIT-licensed, and 40-odd files of it in a repo that may go public is a footprint with no upside.
Pinning gets the reproducibility; vendoring only adds bulk. The clone lives in a machine cache,
`${XDG_CACHE_HOME:-~/.cache}/forge-audit/<owner>-<repo>@<commit>/` (`FORGE_AUDIT_CACHE` overrides the
root), one directory per pin and never inside a project.

### How each CLI finds the skill

**A symlink from the user skills directory to the pinned checkout. Measured 2026-09-28, on both
harnesses, before anything was built on top of it:**

```
~/.claude/skills/solidity-auditor -> ~/.cache/forge-audit/pashov-skills@<commit>/solidity-auditor
~/.codex/skills/solidity-auditor  -> ~/.cache/forge-audit/pashov-skills@<commit>/solidity-auditor
```

Each CLI, invoked non-interactively with no tools, was asked whether the skill was available and to
quote its description. Both answered `SKILL_PRESENT=yes` followed by the description's opening words
from the pinned `SKILL.md`, which is a stronger answer than "yes" — a name alone could be a guess,
the description could only have been read. Neither CLI has a flag for this and neither has a skills
subcommand; `$CODEX_HOME/skills/<name>` is the documented install path for Codex, and
`~/.claude/skills/<name>` the equivalent for Claude. `scripts/audit.sh` re-points both links on every
run, so a fresh clone needs no setup step.

Two consequences worth knowing before they bite:

- **The link follows the last run's pin.** It used to point into the project that ran last, so
  deleting that tree — a worktree, a blinded copy — broke the skill for every agent on the machine
  (2026-10-30). It now points into the cache, which no project owns. A project on a different pin
  still re-points it, always at a checkout that exists. The runner asserts the link resolves to a
  `SKILL.md` rather than assuming it does.
- **`~/.claude` and `~/.codex` belong to the OS user**, and on a machine with other agents they are
  shared. The runner adds one entry to each directory and never replaces either, and it refuses
  outright if `solidity-auditor` is already there as something other than a symlink.

## Scope

**The scope is `audits/SCOPE`: one repo-relative path per line, `#` comments and blank lines
ignored.** The runner reads it, names it to each leg, and records it in the provenance block as the
file list actually passed. It refuses to start without one, or with one that names a missing file.

**Scope is named file by file, never left to the skill's own file discovery.** Two reasons, both
measured on 2026-09-28:

**The skill's exclude pattern silently drops `src/lib/`.** It carries `-not -path '*/lib/*'`, aimed at
Foundry's dependency directory, and `src/lib/` matches it too. Running the skill's own `find` verbatim
returns **zero** files under `src/lib/`, so a library of packing or math code is invisible to a default
scan. The skill documents the escape: a file named explicitly is always scanned, wherever it lives,
and the exclude pattern does not apply to it.

**A file with a differential test does not need this kind of review.** Code that is pure
transformation — no auth, no value, no external calls — and is checked byte for byte against an
independent implementation in CI has a stronger guarantee than an adversarial read would give it, and
can be most of a default scan's lines. Leaving it out spends the legs on what holds authority and
value.

So the scope is everything with authority, value, packing or deploy arguments — deploy scripts
included, because they set constructor arguments, hand over ownership and seed state.

**Every exclusion is written down with its reason**, in a comment block in `audits/SCOPE` or in the
project's `AGENTS.md`, so the next reader does not have to re-derive it. "Covered by a parity test",
"declarations only", "not shipped" and "dependencies we did not write" are reasons; "not important" is
not.

## Running it

```
make audit
```

One pass per leg. `--loop 1` is passed explicitly and is not optional: the skill's pass-count question
otherwise stops and waits for a human, and `make audit` has no human in it. The model question
self-skips on a runtime without `AskUserQuestion`; the pass question does not.

Overridable, so a model choice is never relitigated in prose:

```
make audit CLAUDE_MODEL=opus CODEX_MODEL=gpt-5.6-sol
```

`opus` is an alias for the latest Opus rather than a pinned version string — the provenance block
records what it resolved to. The Codex leg runs at `model_reasoning_effort=high`; that is a `-c`
override, not a flag, and it is confirmed accepted rather than merely ignored.

`AUDIT_DATE` overrides the output directory the same way, and defaults to today. It is the escape
hatch for the append-only refusal above, not a routine setting: the date in the directory name is
the date the audit ran.

Order: **Codex leg, then Claude leg, then the rollup under `CLAUDE_MODEL`.** The rollup is a synthesis
— dedup across legs, severity reconciliation, deciding what agrees — so a model writes it, not the
shell. The shell's job is to run the legs, put the bytes in the right directory, and record what
happened.

**Leg 2 never sees leg 1.** Each leg's harvest is staged in the runner's scratch, outside the tree,
and both move into `audits/<date>/` only after leg 2 has finished. On 2026-10-30 leg 1 was harvested
into the tree before leg 2 ran there, and leg 2 grepped it; the rollup had to discount one cross-leg
agreement. The scratch is `mktemp -d` under `TMPDIR`, and the runner refuses a `TMPDIR` inside the
repo: the scratch holds the staged legs, both transcripts and the known answer.

`make audit` is complete when `audits/<date>/AUDIT.md` exists and every leg directory under it is
non-empty. **An empty leg directory is a failed audit, not a clean one** — a rollup assembled over
nothing would otherwise read as "no findings".

## Provenance

Every `AUDIT.md` opens with a block recording what ran. Observed values, captured at run time, never
copied from this file:

```
audit date        2026-09-28
code commit       <git rev-parse HEAD>  (dirty: yes/no)
scope             <the file list actually passed, one per line>
skill             pashov/skills @ <SKILL_PIN>  · solidity-auditor VERSION <n> · upstream <n|unreachable>
leg 1             codex <version> · <model as the session header reported it> · effort high · 1 pass
leg 2             claude <version> · <model> · 1 pass
tokens            <per leg, if the harness reports them>
coverage floor    <App lines/branches · Distribution lines/branches, from scripts/coverage-floor.sh>
mutation score    <caught of compiling, from audits/mutation/<sha>/campaign.log>
```

`upstream` is the VERSION on the skill repo's default branch, read by the runner, which has network
the legs do not. The legs are told to skip the skill's own upstream check.

The last two fields are decision 56's, and like every other field they are **read from the tree at
the run's commit, never typed**: the floors come out of `scripts/coverage-floor.sh`, where the gate
keeps them, and the score is the sum of the per-class summaries across **every `campaign*.log` in
the newest campaign directory**, in `slither-mutate`'s own words. A non-compiling mutant is on
neither side of that ratio. If either source is missing from the tree the field says so — a missing
figure and a zero figure must not read alike. `scripts/audit.sh` is the only writer, so the next
`make audit` picks them up; the run that added the fields did not itself run one. At `e770054` the
field reads `755 of 847 caught (compiling mutants, from 2 log(s) in audits/mutation/e770054/)`.

`code commit` carries a dirty flag because an audit of an uncommitted tree cannot be re-run by anyone
else, and that fact belongs in the artifact rather than in someone's memory.

### Why one campaign is more than one log

`slither-mutate` mutates **one contract per `Mutating contract` section**, taking that contract's
own line range, so the second contract declared in a shared file is never reached — listed under
`Preparing to mutate contracts` and then skipped without a word. `DistributionFactory` is declared
at `src/Distribution.sol:432`, and the run naming all three contracts sections only `Distribution`
and `App`: its mutated lines stop at `:423`, with zero mutants at or after `:432`. So a campaign
over `src/` is that invocation **plus** one naming the factory alone, and the score is the sum.
`make mutate` runs both. Reading only `campaign.log` understates the campaign by a whole contract
while looking complete — which is how the figure was wrong before it was right.

### Which campaign is the record, and why

Two full campaigns ran at `e770054` on 2026-11-19. **The second is the record** — 11,644 s,
`715 caught of 807` over `Distribution` and `App` — and the reason is not that it came second.

The first reported **905 compilation failures against the second's 432** from the same command on
the same commit, and 2 uncaught against 92. A mutant that fails to compile leaves the denominator
entirely, so inflating that count flatters the suite: the first campaign reads `334 of 336`, a
99.4 % score produced by discarding three quarters of the population. A compile-failure count far
above a comparable run is a contended box, not good news.

**On running alone, the measured statement rather than the claim.** The recorded campaign overlapped
other work on this tree until 12:21, so it did not run alone. What holds its figure up is the
failures themselves: all 432 are mutation-induced solc errors — `7576` (undeclared identifier),
`2314` (unexpected token), `9182` and `6933` (expected primary expression) dominating — and none is
environmental. That is the thing worth asserting. "The box was idle" is not, and here it was false.

## Re-running one leg after a fix

A triage that changes a contract has audited bytecode that no longer ships, so the leg is re-run
against the final source. That is **not** an audit and it does not become one: one leg, over the
files that changed, with its own prompt recorded beside it.

```
audits/<YYYY-MM-DD>/
  AUDIT.md                 what this run was, and what it found — labelled a re-check, not a rollup
  leg-recheck-prompt.md    the prompt, verbatim, because it differs from prompts/leg.md
  pashov/solidity-auditor/<model>/
```

First done 2026-09-30, in the project this method came from; `scripts/audit.sh` does not do it,
and it should not be generalised into the runner until it has run twice. Four things it
has to get right, each learned from the run that established the shape:

- **Which leg.** The one from the *other lab than the engineer who wrote the change*. Independence is
  the only thing the two-leg method claims, and a re-check by the same family that authored the fix
  spends the cost without buying the claim.
- **A narrower prompt, recorded.** `prompts/leg.md` names the whole scope and describes a two-leg audit;
  using it for a one-file re-check would state three things that are not true of the run. Copy it,
  narrow it, and commit the copy — a prompt that is not on disk cannot be re-run.
- **Do not name the finding.** The leg is told a change was made and not what it closed. A leg told
  where to look measures nothing.
- **Check the tree after the run.** The leg runs with write access and is told not to fix anything;
  `git status --porcelain` is what turns that instruction into a fact.

- **Run it outside the repo** — § Running blind. This is the one that cost a whole run to learn. A leg started inside
  the checkout reads the checkout: on 2026-09-30 the first attempt grepped the task file 62 times, the
  previous `AUDIT.md` 60 times, and — because the engineer was writing the triage into the same tree
  while the leg was running — the triage itself. It then reported no findings, which is the result a
  leg that had simply agreed with a document it read would also report. **A prompt cannot make a leg
  blind to the filesystem it is pointed at.**

  What worked: a directory holding `foundry.toml`, `src/` and a symlink to `lib/`, `git init`-ed
  because `codex exec` refuses a non-repo, with the file's `sha256` recorded in both trees so the
  provenance survives the different commit. That re-check's `AUDIT.md` carries both runs — the
  unblinded one is kept, labelled, because the contamination is itself the finding.

A re-check does **not** replace the next full audit, and its AUDIT.md says so in its first line. Two
legs from two labs over the whole scope is the method; this is a spot check on a diff.

## Running blind

A full audit can run blind too, and the first did on 2026-10-30: the legs ran in a separate tree
holding only `foundry.toml`, `src/`, the deploy scripts, a `lib` symlink and `audits/` (`SCOPE`,
`SKILL_PIN`, `prompts/`), committed as one commit so `codex exec` would start. `make audit` runs
there unchanged. Three things make it hold:

- **The known answer stays out of that tree.** `KNOWN_ANSWER_FILE=<path>` points the runner at it
  instead of `audits/KNOWN_ANSWER.md`; the shell reads it into the rollup prompt, so no leg can open it.
- **The tree's commit is not the project's.** Record the `sha256` of every scoped file in both trees,
  sorted, beside the `AUDIT.md` — the hashes, not the commit, tie the run to the reviewed source.
- **Copy `audits/<date>/` back** into the project. The transcripts come with it.

## Adding a review

A new review type is a new directory under `audits/<date>/` and a new leg in the runner. It does not
need a new document. It needs: a name, what it reads, what it writes, and a line in the next
`AUDIT.md` rollup. If it cannot state those four, it is not ready to be a leg.

## Known limits

- **Two legs from two labs is the whole independence claim.** Both are language models trained on
  overlapping public Solidity; correlated blind spots are likely and unmeasured. The mitigation is
  method diversity — property tests, a static analyser, a human reading the diff — not more models.
- **A leg can still read outside its tree.** Both run with write access and no sandbox on reads, so
  a leg that went looking in `TMPDIR` could find the other's staged output. Nothing has done it; the
  transcripts are what would show it.
- **A leg is only graded against a known answer.** Write one to `KNOWN_ANSWER.md` — a finding
  found by hand before the audit, with file, line and mechanism — and the rollup records, per leg,
  whether it was found. Whether a leg finds a bug that was already known is the only evidence about
  this method that isn't an assertion. Without one, the rollup says the run was not graded.
- **The skill self-reports a version and warns when it is behind.** That warning fires against
  upstream `main`, not against `SKILL_PIN`, so it will eventually tell you to upgrade a deliberate pin.
  The provenance block's `upstream` field is where that shows. Upgrading is a decision, not a chore: bump `SKILL_PIN` in its own commit so an audit's findings can
  be attributed to a skill version.
