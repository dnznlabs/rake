# m04-t06 — Slither as the third leg, before the first public byte

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships (a gate on Phase 2)

When this is done, `make slither` runs Slither 0.11.5 over `src/` and the two shipped deploy
scripts in under two seconds, every one of its results has a disposition in `SECURITY.md`, a
tracked triage database makes the run exit 0, CI runs it on every push, and m04-t03 may send its
first testnet transaction. The architect ran it on 2026-11-07 against `main` at `9eed049`:
**23 results** with informational and optimization detectors excluded (2 High, 8 Medium,
13 Low by Slither's impact), **32** with everything on. At first reading all 23 are shapes the three
two-model reviews already dispositioned or rake's documented design — nothing looked new — but
"looked" is not a disposition, and the point of a mechanical third leg is that it does not share the
first two's blind spots. If one result is a real defect, **stop**: a `src/` byte is M03 reopened and
Denizen's decision, and it is cheaper to learn before the addresses exist on a public chain than
after, which is why this task gates t03.

## Plan

Every command runs from the repo root through `devbox run --`. Branch `m04/t06-slither` from
`origin/main` at or after `9eed049`. Check hooks with `ls .git/hooks | grep -v sample`. Rehearsed
figures below are from the architect's scratch run on 2026-11-07; re-run rather than quote.

0. **Baseline.** `forge test` 91, `node --test` 90, `git status --porcelain` empty. Record the commit.

1. **Slither in the toolchain.** `devbox add slither-analyzer@0.11.5` (nixpkgs has it; the
   `devbox.lock` entry pins it). **Slither's nix wrapper does not see a `forge` that is merely on
   `PATH`**: run from a devbox that lacks foundry it fails with ``Cannot execute `forge` `` even
   when `which forge` succeeds — measured; it works when forge is in the same devbox profile, which
   rake's is. Verify: `devbox run -- slither --version` prints `0.11.5`.

   Check: `devbox.json` and `devbox.lock` changed and nothing else.

2. **One configuration, tracked.** `slither.config.json` at the repo root:

   ```json
   {
     "filter_paths": "lib/|test/|scripts/forge/(Chunks|Fixtures|Seed)",
     "exclude_informational": true,
     "exclude_optimization": true,
     "fail_on": "pedantic"
   }
   ```

   Scope matches `audits/SCOPE`: `src/` and the two shipped scripts, the dev-only scripts and
   `lib/` out (the architect's rehearsal filtered all of `scripts/`; the config above keeps
   `Deploy.s.sol` and `DeployApp.s.sol` in, which the audit scope does too — expect a few more
   results than 23, and record the number). Informational and optimization detectors are excluded
   from the gate but **run once with them on** (step 3) so the 9 informational results are read and
   dismissed in the handoff with one line each.

   Check: `devbox run -- slither .` from a clean tree runs in about **1.5 s** (`forge clean`, then
   `forge build --build-info --skip ./test/** --force` — note it leaves `out/` rebuilt without the
   test artifacts; a following `forge test` rebuilds them, so this is not a gate ordering problem,
   but say so in `AGENTS.md`) and exits non-zero on the untriaged results.

3. **Disposition, one row per result.** `SECURITY.md` gains § Static analysis after § Findings —
   disposition: the tool and version, the config, the commit, the counts by impact, then a table
   with one row per result — detector, location, Slither's impact, **our** disposition (`design`,
   `covered by F<n>`, `covered by test <name>`, `fix`, or `false positive`) and one sentence why.
   The ones the architect expects to map, for the engineer to confirm or refute from the code, not
   from this list:
   - `arbitrary-send-eth` on `_push` (High): by design — `to` is a table row the owner set through
     the timelock; the ETH branch is capped at `PUSH_GAS`. Row names decision 6 and F4.
   - `reentrancy-eth` in `distribute` (High): `escrowed`/`reserved` written after the push, inside
     the transient lock; F1 (`notLocked` on `propose`/`applyQueued`) and `test_applyQueuedRefusedDuringDistribute`
     cover the cross-function path. **Read it twice**: this is the one High that could hide
     something, and the row must name the lock and the test, not just "known".
   - `incorrect-equality` ×4 (`amount == 0`, `data.length` tests): design; the comparisons are
     against zero and exact lengths, not balances.
   - `locked-ether` on `DistributionFactory.create` (Medium): `msg.value` rides the CREATE2 into
     the clone; the factory never holds it. Confirm with the existing value-forwarding test.
   - `uninitialized-local` ×3, `events-maths` on `setDelay` (the `Applied` event is the record;
     say so or add nothing), `missing-zero-check` on `init`'s `owner_` — **this one deserves a
     real answer**: an `owner_` of zero at `create` makes an ownerless distribution from block
     one; decide whether that is a documented shape (the renounce branch already produces one
     deliberately) or a one-line `src/` check, and if the latter, stop and escalate rather than
     fix. `missing-zero-check` on `claim`'s `to`: the account's own choice; design.
   - `calls-loop` ×2 (F8 / decision 36, documented), `reentrancy-events` ×3 (events after
     self-calls; benign, say why), `return-bomb` (F6: the ETH branch discards return data by
     design), `timestamp` ×4 (the timelock is time; design).

   Check: the table's row count equals Slither's result count for the gated config, stated in the
   section's first line as the denominator; every row has a disposition from the five words above.

4. **Triage database, so the gate is green.** `devbox run -- slither . --triage-mode` once, marking
   every dispositioned result; commit the resulting `slither.db.json`. From then on `slither .`
   exits 0, and any **new** result (a changed line, a new detector in a bumped version) fails the
   gate until it has a row and a triage entry. The database is the code's; the table is the
   reasoning's; they move together in the same PR, and `AGENTS.md` § Contracts says so.

   Check: `devbox run -- slither .` exits 0 on the branch; delete one entry from `slither.db.json`
   in a scratch copy and it exits non-zero — print both.

5. **`make slither` and CI.** `mk/10-forge.mk` gains `slither: ## Static analysis gate — every
   result triaged in SECURITY.md` running `slither .`; `.github/workflows/ci.yml` gains a step after
   `test` and before `gas snapshot`: `devbox run -- make slither`. Because Slither's compile forces
   a rebuild without test artifacts, place it **after** `forge snapshot --check` if the snapshot
   step reads `out/` (check; if it does, order it last and say why in the workflow comment).

   Check: CI green on the branch; the step's log shows the result count and exit 0.

6. **The Phase 2 gate.** m04-t03's step 0 reads this task's status; the handoff's last line says in
   one sentence whether any result was a `fix` — if none, t03 may start on this PR's merge; if one,
   the handoff names it and the architect takes it to Denizen before anything else moves.

7. **`HANDOFF.md`** from the template: the AC table, the counts (gated and full), the 9
   informational results dismissed in one line each, § Deviations, and the one-sentence gate.

## Acceptance criteria

- `devbox run -- slither --version` → `0.11.5`; `slither.config.json` and `slither.db.json`
  tracked; `devbox run -- make slither` exits 0 on the branch and non-zero with one triage entry
  removed (both shown).
- `SECURITY.md` § Static analysis: tool, version, config, commit, counts; one row per gated
  result with a five-word disposition and a sentence; the two High rows name the lock and the test.
- `git diff --stat origin/main -- src/` empty — or, if a result is a real defect, the PR stops at
  the handoff with the finding and no `src/` change, and says so in its title.
- CI has the `slither` step and is green; `forge test` 91, `node --test` 90, `forge snapshot
  --check` 0, porcelain empty after `make slither && forge test`.
- `AGENTS.md` § Contracts gains the two facts: the triage database and the table move together;
  Slither's compile rebuilds `out/` without tests.
- PR closes this task's issue. Expected to carry forward nothing; a `fix` row carries an issue.

## Out of scope

- Any `src/` byte. A real finding stops the task.
- Aderyn, Halmos, Echidna, Medusa: not in nixpkgs, and the invariant task (m04-t07) covers the
  fuzzing class with forge's own runner.
- Running Slither over `app/` (not Solidity) or `test/`.
- Changing the two-model review method or re-running it.

## Open questions

None. The one judgement call — the `owner_` zero-check — is written as a stop-and-escalate, not a
decision the engineer takes.

## Context

- The architect's rehearsal, 2026-11-07: Slither 0.11.5 from nixpkgs, forge 1.7.1 in the same
  devbox profile, `main` at `9eed049`, 1.46 s, 23 gated results / 32 total; detector counts:
  `incorrect-equality` 4, `timestamp` 4, `reentrancy-events` 3, `uninitialized-local` 3,
  `calls-loop` 2, `missing-zero-check` 2, and one each of `arbitrary-send-eth`, `reentrancy-eth`,
  `locked-ether`, `events-maths`, `return-bomb`.
- `SECURITY.md` § Findings — disposition (F1, F4, F6, F8), decisions 6, 36.
- `audits/SCOPE` for the file list and the reasons.
