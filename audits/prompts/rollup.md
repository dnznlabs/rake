# Rollup prompt

The prompt that reconciles the legs into `audits/<date>/AUDIT.md`. `scripts/audit.sh` passes this
file verbatim and then appends a short `## This run` block naming the four paths the run produced —
the two leg directories, the provenance file and the output file — followed, when the project has
written one, by `audits/KNOWN_ANSWER.md` under `## Known answer`. Those are the only run-specific
values; everything above them is the method, and the method is the same every time. The scope is
not substituted here: it is in the provenance block, which is the record of what the legs read.

The rollup is a synthesis — deduplication across two vocabularies, severity reconciliation, deciding
what the legs actually agreed on — so a model writes it, not the shell. The shell's job is to run
the legs, put the bytes in the right directory, and record what happened.

The layout, the scope and the provenance spec are in [`../README.md`](../README.md).

---

Two independent adversarial reviews of the same files have finished. Reconcile them into one
document. You are not re-auditing the code; you are reading two reports and producing the artifact a
human will act on.

## Before anything else: check the legs are real

Read both leg directories. **An empty leg directory is a failed audit, not a clean one.** A rollup
assembled over nothing reads as "no findings", which is the most expensive lie this directory could
tell. So:

- If either leg directory is empty, or its `full-report.md` is missing or empty, **stop**. Write
  `AUDIT.md` containing the provenance block and a single line saying which leg produced nothing and
  that this audit is void. Do not summarise the surviving leg as if it were the audit.
- If a leg reports that part of the skill's orchestration could not run, that leg still counts —
  carry its own statement of what it could not run into § Legs below, verbatim enough to be checked.

Say in the document how many findings you read from each leg, before deduplication. A count is what
proves you read a non-empty input; "both legs reported findings" is not.

## The document

`AUDIT.md`, in this order.

**1. Provenance.** The block from the provenance file named in `## This run`, reproduced
**verbatim**. It was captured at run time by the runner. Do not retype it, do not reformat it, and
do not fill a field from your own knowledge — a value you supply is not an observed value. Its
fields, which are the ones `../README.md` § Provenance specifies and the complete list:

```
audit date        <YYYY-MM-DD>
code commit       <git rev-parse HEAD>  (dirty: yes/no)
scope             <the file list actually passed, one per line>
skill             pashov/skills @ <SKILL_PIN>  · solidity-auditor VERSION <n>
leg 1             codex <version> · <model as the session header reported it> · effort high · 1 pass
leg 2             claude <version> · <model> · 1 pass
tokens            <per leg, if the harness reports them>
```

If a field is absent from the provenance file, say `not reported` — never guess one.

**2. Findings.** One entry per distinct issue, most severe first. A finding is one issue even when
the two legs describe it in different words; a file and a line is what makes that recognisable. Each
entry carries:

- a title, the file and line, and the severity
- **which legs found it** — both, or which one alone
- **the severities each leg gave it**, where they differ, and which one this document adopts, with
  the reason. Do not average two severities. Do not quietly take the higher one either; say why.
- what it is and what it costs, in the shortest form that is still checkable against the code

**3. Agreement and disagreement.** What both legs found, what only one found, and — where you can
tell from the reports — whether the single-leg findings look like a genuine miss by the other leg or
like a false positive. Two legs from two labs is the whole independence claim this method makes, so
the overlap is a measurement worth recording rather than a preamble.

**4. Grading against the known answer.** Only when `## This run` is followed by a `## Known answer`
section: that is a finding the project knew before any audit ran, found by hand. Otherwise leave
this section out and say in § Legs that the run had no known answer to grade against.

State, **per leg**, whether that leg found it, and at what severity. Judge it on the code location
and the mechanism, not on wording — a leg that reports the same gap under another name found it.

**A miss is a publishable result, not something to hide.** Whether a leg finds a bug that was
already known is evidence about the method that is not an assertion, and it costs nothing to record.
If both legs missed it, say so plainly in this section and do not offset it with what they did find.

**5. Legs.** One short paragraph per leg: what it ran, how many findings it produced, anything it
said it could not do. Link the leg directory.

## What this is not

This document does not fix anything and does not propose a patch. Triage and repair are a separate
task; every finding is carried on untouched. Do not edit a contract, a test, or any file other
than `AUDIT.md`.

A past audit is never edited — this file's findings will be cited by the next one. A finding that
turns out to be wrong is corrected in the *next* audit's `AUDIT.md`, marked as superseding.
