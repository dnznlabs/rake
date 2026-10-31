# Leg prompt

The prompt one independent adversarial review receives. `scripts/audit.sh` passes this file to each
harness with one substitution: the marker line in § What to run becomes the contents of
`audits/SCOPE`, one path per line. Nothing else is substituted, so what you read here, plus that
list, is what the model read. It lives in prose, outside the runner, because it *is* the method — a
heredoc inside a shell script is not something a human can disagree with.

The method, the scope and the reasoning behind both are in [`../README.md`](../README.md).

---

You are running one leg of a two-leg security audit. Another model, in another harness, is reviewing
the same code independently; a third pass reconciles the two. Do not soften a finding because it
might be wrong — a false positive costs a paragraph in the rollup, a miss costs the project.

## What to run

Use the `solidity-auditor` skill. Scan **exactly these files, named explicitly**, and
**pass `--loop 1`**:

```
<!-- SCOPE -->
```

Both of those are requirements, not preferences:

- **Named files, never the skill's own discovery.** Its exclude pattern carries
  `-not -path '*/lib/*'`, aimed at Foundry's dependency directory, and `src/lib/` matches it too:
  running the skill's `find` verbatim returns zero files under `src/lib/`, so anything there would be
  invisible. The skill documents the escape and it is the one being used here: a file named
  explicitly is always scanned, wherever it lives, and the exclude pattern does not apply to it.
  Files a default scan *would* pick up but that are not listed are out of scope on purpose
  (`../README.md` § Scope); do not add them back.
- **`--loop 1` is mandatory.** Without it the skill's pass-count question stops and waits for a
  human, and there is no human in this run. Its model question self-skips on a runtime without
  `AskUserQuestion`; the pass question explicitly does not.

Do not pass `--file-output`. Every scan assembles its report under `.solidity-auditor/runs/` whether
that flag is passed or not; the flag only copies it into the working directory, which would dirty
the repo the runner then has to check is clean.

## Where to leave it

The scan writes `.solidity-auditor/runs/<stamp>/` inside the repo — `full-report.md`, `run-1.md`,
`scope.tsv`. Leave them there. The runner harvests that directory into
`audits/<date>/pashov/solidity-auditor/<model>/` and asserts it is non-empty; you do not need to
move or copy anything.

**Skip the skill's upstream version check.** The pin is deliberate, this leg has no network to run
the check, and the runner reads upstream's version itself and records it beside the pin.

If your harness cannot run some part of the skill's orchestration — it has no sub-agent tool,
whatever it is — **do the review anyway and still write
those three files**, and say plainly at the top of `full-report.md` what you could not run. A leg
that degrades and says so is evidence. A leg that produces nothing is a failed audit, and the runner
will treat it as one.

## What a finding must carry

The skill's own report format governs. On top of it, two things this project needs:

- **A file and line for every finding.** The rollup deduplicates across two legs that share no
  vocabulary; a location is what makes two descriptions of one bug recognisable as one bug.
- **Severity you would defend.** The other leg's severity for the same finding is going to be put
  beside yours, and a disagreement is reported rather than averaged.

## What this leg is not

It does not fix anything. No edit to a contract, no edit to a test, no `forge fmt`. Triage and
repair are a separate task, and a finding is worth more untouched than it is worth quietly fixed.
