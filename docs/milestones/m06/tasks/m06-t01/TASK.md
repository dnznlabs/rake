# m06-t01 — The exposure pass

Milestone: M06 — Going public (not scoped yet; this task informs its scoping) · Phase: before the freeze

A list of everything that would become readable by anyone if this repository were made public as
it stands, with counts, so the Product Owner can rule on each item. Nothing is fixed, deleted,
rotated or published by this task: it reads and reports.

## Plan

The procedure is the going-public procedure's exposure review, as the organisation's handbook has
it since 2026-11-26; read it first, in full. This task runs that step early, before any freeze, so
the ruling is made on a real list. It is re-checked at freeze time for whatever changed since.

**The report does not live in this repository**, in its tree, its issues or its pull requests:
anything written here is published by the same flip the report is about. It goes where the
handbook says internal records go, as an issue there assigned to the Product Owner. This file, the
handoff and the PR say how much was found and where the report is, and quote none of it.

1. **A mirror, so every ref is on disk.** `git clone --mirror` into a directory of its own, outside
   every working checkout. Record the denominators: commits reachable from all refs, branches,
   tags, `refs/pull/*` heads, and how many of those heads are reachable from no branch. From the
   API, into local files outside any repository: every issue and pull request with its comments,
   reviews and review comments; workflow runs with whether logs and artifacts are still held;
   releases, environments and deployment records; whether wiki, discussions and Pages are on.
   Check: each count is written beside the command that produced it.
2. **Secrets, over the full history.** The project's secret scanner over every ref in the mirror,
   not the tree. Check: its own report of what it scanned agrees with step 1's commit count; and a
   control, a throwaway clone with one planted fake credential in an old commit, makes it fire. A
   scanner that has not been seen to find something has shown nothing.
   **If a finding looks live, stop and tell the Product Owner privately at once**, before anything
   else in this task. Do not rotate it, test it or use it.
3. **The list of names that are not public yet**, built from the organisation's repository list
   and not from memory: every repository that is still private, every unreleased product or
   codename, every organisation, vendor or tool the team has not said it uses. Kept outside this
   repository. Check: the list says where each name came from.
4. **The five classes across the eight surfaces.** Secrets; names not public yet; people outside
   the Development Team table and personal details of anyone in it; internals (machine paths, host
   names, endpoints with a key, chat identifiers, the handbook's own paths and wording); anything
   said in confidence about a third party. Against: the tree at `main`; every version of every
   file in the history; commit messages on every ref; branch and tag names; issues and pull
   requests with all their comments; pull request heads no branch reaches; Actions logs and
   artifacts; anything else switched on. Search by pattern, then read the hits. Check: every
   pattern is run once against text that must match, so a zero is known to be a zero.
5. **The branches.** One table of every remote branch: merged into `main` or not, its last commit
   date, and whether it holds a commit that exists nowhere else. A proposal of which to delete
   before a flip. **No branch is deleted in this task.**
6. **The report**, as the handbook's exposure review describes it: one row per item, the surfaces
   that carry it and how many times, one example with its location, and whether it can be fixed
   going forward. Above the table: the denominators of step 1 and what was not read, if anything.
7. **`HANDOFF.md`**, with the denominators, the number of rows per class, the controls and their
   results, and where the report is. No quoted finding.

## Acceptance criteria

- Every figure in the report has a denominator from step 1, and each of the eight surfaces has
  either a count of what was read or a line saying why it could not be read.
- The secret scanner's control fires, and its scanned-commit figure matches the mirror's.
- Every search pattern has a recorded must-match control.
- The report is posted outside this repository and assigned to the Product Owner; `HANDOFF.md`
  points at it and quotes nothing from it.
- `git ls-remote origin` prints the same refs before and after the task except this task's own
  branch; no issue, pull request, comment, branch, tag, workflow run or setting was edited or
  deleted.
- `git diff --stat main` touches only this directory.

## Out of scope

- Fixing anything the list contains. Fix-forward changes follow the Product Owner's ruling.
- Deleting or renaming branches, editing or deleting issues and comments, deleting workflow runs.
- Rotating a credential. That is the Product Owner's, told privately.
- Rewriting history, by any tool, for any reason.
- The ruling, the freeze, and everything after them.
- Any other repository's exposure. Their names are inputs here, not subjects.

## Open questions

None. The report's home is the handbook's rule for internal records; if the Product Owner wants it
elsewhere, it moves before step 6.

## Context

- The going-public procedure, exposure review and ruling steps (the handbook, 2026-11-26).
- Read on 2026-11-26, to re-measure and not quote: 1,049 commits on `main`, 216 remote branches,
  443 issues and pull requests.
- One-way doors: none in this task. It reads.
