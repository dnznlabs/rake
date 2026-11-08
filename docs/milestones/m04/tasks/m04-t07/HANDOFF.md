# m04-t07 — handoff

PR: #171 · Branch: `m04/t07-invariants` · 2026-11-07

`test/invariant/` now holds a stateful suite: one handler owning a single `Distribution` clone created
through the real factory, and seven `invariant_` properties asserted after every call of every random
sequence. Each state-changing entry point the contract has is wrapped by exactly one handler function,
so forge's own call summary is the evidence each was reached; six actors and three tokens bound every
address and amount, which is what makes the conservation check exact; and `fail_on_revert = false`, so
the handler catches the refusals it legitimately expects and counts them per entry point rather than
letting a bubbled revert spend a step of the depth on nothing. Four fuzzed unit tests sit beside their
hand-picked siblings in `test/Distribution.t.sol`. **No invariant failed** — but the suite that passes
now is not the one that passed first: see § Discoveries 1, where a 51,200-call sequence was found to
have queued exactly one action in total with all seven properties green.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `grep -c 'function invariant_' test/invariant/*.t.sol` → 7 | pass | `7` |
| `grep -c 'function testFuzz' test/Distribution.t.sol` → 4 | pass | `4` |
| `forge test` passes at 91 → 102 | pass | `Ran 6 test suites in 12.16s: 102 tests passed, 0 failed, 0 skipped (102 total tests)`. `forge test --list --json`: `DistributionTest` 56, `AppTest` 27, `DistributionInvariantsTest` 7, `DistributionFactoryTest` 6, `PushGasTest` 3, `TableCapTest` 3 = 102. Baseline on `a90fa61` was 91 in five suites, `grep -c 'function invariant_' test/*.t.sol` → 0, `grep -c 'function testFuzz'` → 0 |
| wall time recorded and ≤ 60 s | pass | **13 s** for the whole `forge test` after `forge build --force`, of which the invariant suite alone is 13 s (`--match-path 'test/invariant/*'`, 12.2 s reported by forge). 47 s of margin. No nightly split needed, so none was added |
| final runs/depth recorded with the reason | pass | `[invariant] runs = 256, depth = 200`; `[fuzz] runs = 512`. Measured on this host, invariant suite alone at `runs = 256`: depth 50 → 3 s, 100 → 8 s, 200 → 11 s, 500 → 26 s, all seven passing at every depth. See § Decisions 1 |
| call summary shows every `Distribution` entry point reached | pass | All 14 handler selectors, one per entry point, over one committed campaign (`runs = 256, depth = 200` = 51,200 calls) — `acceptOwnership` 3,726, `applyQueued` 3,608, `cancel` 3,674, `claim` 3,752, `deposit` 3,681, `distribute` 3,660, `mint` 3,635, `proposeFromStranger` 3,582, `proposeSetDelay` 3,546, `proposeSetDescription` 3,706, `proposeSetTable` 3,683, `proposeTransferOwnership` 3,671, `release` 3,674, `warp` 3,602. `init` is reached once per run, in the handler's constructor, through `create` |
| revert counts reported, not silently absorbed | pass | Bubbled reverts: **0** on every selector, 0 discards, in the table above and in each `[PASS] invariant_… (runs: 256, calls: 51200, reverts: 0)` line. Caught-and-counted refusals: the table in § Discoveries 2 |
| `git diff --stat origin/main -- src/` empty | pass | empty — no output |
| no invariant failed | pass | all seven `[PASS]`; § Stop does not apply |
| `forge snapshot --check` exit 0, new row count stated | pass | exit 0 on three consecutive runs. **102 rows** (91 → 102, not the plan's 95 — § Deviations 2) |
| `node --test` 90 unchanged | pass | `tests 90 / pass 90 / fail 0` |
| `git status --porcelain` empty | pass | empty at `9f39f15` |
| CI green | pass | see the run on `9f39f157c7224a8f159143c366efaad29193f51c` |
| `SECURITY.md` names the seven invariants | pass | `grep -c 'invariant_' SECURITY.md` → **7**, one line per property in the new § Invariants group |
| `AGENTS.md` says how to run them | pass | § Contracts, three new bullets: running the suite alone and reading its call summary, what `fail_on_revert = false` costs a handler function added later, and the snapshot gotcha of § Discoveries 4 |
| PR closes this task's issue | pending | the task issue is [#169](https://github.com/dnznlabs/rake/issues/169), open; the PR body has to carry `Closes #169`. Not opened here, per instruction |

Every figure above was measured on the branch head `9f39f15` through `devbox run --` (forge `1.7.1-dev`),
with `forge build --force` immediately before each count.

## Deviations from the plan

1. **`[invariant] depth` is 200, not 50.** The plan fixes `runs = 256, depth = 50` and says to *lower*
   depth if 60 s is exceeded; it was not exceeded — depth 50 cost 3 s of a 60 s budget. TASK.md
   § Open questions leaves runs and depth to the engineer within that budget, so the headroom was
   spent on sequence length rather than left idle. Reasoning and the measurement table: § Decisions 1.
   The plan's own check — all seven passing at `runs = 256, depth = 50` — was run and passes.
2. **`.gas-snapshot` is 102 rows, not the expected 95.** The plan's step 4 says "invariant tests are
   excluded from snapshots by forge". They are not: each `invariant_` function gets a row of its own,
   carrying `(runs, calls, reverts)` in place of a gas figure. So the seven land in the file beside the
   four fuzz rows, 91 + 7 + 4 = 102. The rows are deterministic — `--check` is exit 0 on three
   consecutive whole-suite runs — but see § Discoveries 4 for the condition on that.
3. **`invariant_balanceCoversReserved` asserts all three tokens, not the plan's "ETH and the plain
   token".** `reserved` for the plain mock is always zero, because `MockERC20.transfer` has no
   recipient hook, so a plain-token push never fails and never escrows; that arm alone is vacuous. The
   `false`-returning token is the one that carries an escrow balance to cover, so it is asserted too.
   Strictly stronger than the plan asked for.
4. **`invariant_noActionOutsideWindow` asserts three counters rather than walking the recorded
   actions.** The plan says "every `Applied` the ghost recorded happened at a time `t` with
   `eta ≤ t ≤ eta + GRACE`". The same property, evaluated the instant `applyQueued` returns and kept as
   `outsideWindowApplies`, `doubleApplies` and `appliesAfterCancel`. An invariant runs after *every*
   call, so a walk over a list that grows with depth would make the campaign quadratic in `depth` and
   put the deeper settings out of budget. The ghost's `eta` comes from the delay in force at propose
   time and is never read back out of `queued`, so the check does not ask the contract to confirm its
   own answer.
5. **`AGENTS.md` gained three bullets where the plan asked for two things.** The third is § Discoveries
   4, a measured way to turn CI red that the file's existing `forge lint` bullet is the sibling of.
6. **The handler's `deposit` offers both deposit shapes, not only the stipend.** The plan does not say
   which; the stipend shape alone turned out to fail on every call (§ Discoveries 3), which would have
   left the ETH paths fed only by the 1 ether that rides the `create`.
7. **No nightly deeper workflow.** The plan makes it conditional on the 60 s budget not being met
   otherwise. It is met with 47 s to spare, so nothing was added.

## Decisions

1. **`runs = 256, depth = 200`.** Measured on this host, invariant suite alone, all seven passing at
   every point: depth 50 → 3 s, 100 → 8 s, 200 → 11 s, 500 → 26 s. `runs` stays at 256, the figure the
   plan's step-1 check names ("a 256-run session"). Depth 200 is the chosen point for two reasons. One
   sequence then has about fourteen calls of each of the fourteen entry points, which is enough to
   chain propose → warp → `applyQueued` → cancel → distribute → release → claim rather than brush past
   each entry point three times; at depth 50 it is three or four. And 13 s leaves a fivefold margin
   under the 60 s budget, which is the room a CI runner slower than this host needs — the measurement
   above is the thing to re-run if that margin ever matters. Lower `depth` before `runs`, as the plan
   says. Recorded in the `[invariant]` comment in `foundry.toml`.
2. **`claim`'s destination excludes the gas burner.** `claim`'s ETH branch is uncapped by design
   (decision 40), so a burner as the destination would spin until the frame ran out of gas — wall time
   the campaign cannot afford, proving nothing the escrow side does not already prove. The burner is
   still a beneficiary and still the *caller* of `claim`, which is F5's path, so the property is intact.
3. **The renounce is held back until the sequence has exercised the timelock and the money paths**
   (`applyQueued ≥ 8 && distribute ≥ 8 && cancel ≥ 4`), then fires one call in four. A renounce is
   terminal, so its rate decides how much of the suite runs at all; both flat rates tried were wrong in
   opposite directions, measured. § Discoveries 1 has the numbers. Measured result of the gate: the
   renounce is reached in **3 of 60** single sequences of depth 200, so of the order of a dozen of the
   256 runs of each property, each then asserting the post-renounce half on every remaining call of
   that run. Reached, at the cost of 5% of sequences rather than all of them.
4. **Seeds that choose a branch are hashed, not taken modulo.** The fuzzer's dictionary is full of
   round numbers, so `seed % 64 == 0` fires far more often than one call in 64. `keccak256` of the seed
   restores the intended rate. Same for `proposeSetDelay`'s zero.

## Discoveries

1. **A handler can stop reaching the contract while every property still passes, and only the call
   summary shows it.** The first version of this handler renounced ownership on one
   `proposeTransferOwnership` call in seven. Over a 51,200-call diagnostic sequence that left
   `propose:setBeneficiaries` 3,595 calls / 3,595 refused, `propose:setDescription` 3,683 / 3,683,
   `applyQueued` 3,697 / 3,697, `cancel` 3,761 / 3,761, `acceptOwnership` 3,610 / 3,610 — **one** action
   queued in the whole sequence, because the owner was gone inside the first thirty calls. All seven
   invariants were green throughout, and `forge test` reported nothing. The opposite rate failed the
   other way: at one call in 64, **no** sequence of 200 calls reached a renounce at all in 25 tries, so
   `invariant_ownerOrNobody`'s post-renounce half never ran. This is the failure mode
   `fail_on_revert = false` is best at hiding, and the lesson is now a bullet in `AGENTS.md`
   § Contracts: read the call summary, not the exit code.
2. **Where the depth actually goes**, aggregated over 25 sequences of depth 200 — the committed shape —
   = 5,000 handler calls, with the handler's own count of the refusals it caught:

   | entry point | calls | refused | succeeded |
   |:---|---:|---:|---:|
   | `receive` | 375 | 191 | 184 |
   | `distribute` | 358 | 161 | 197 |
   | `release` | 361 | 355 | 6 |
   | `claim` | 389 | 347 | 42 |
   | `propose(setBeneficiaries)` | 349 | 7 | 342 |
   | `propose(setDescription)` | 380 | 0 | 380 |
   | `propose(setDelay)` | 312 | 0 | 312 |
   | `propose(transferOwnership)` | 358 | 0 | 358 |
   | `propose` from a stranger | 373 | 373 | 0 |
   | `applyQueued` | 390 | 334 | 56 |
   | `cancel` | 328 | 233 | 95 |
   | `acceptOwnership` | 339 | 305 | 34 |
   | `warp` | 332 | 0 | 332 |
   | `mint` | 356 | 0 | 356 |

   1,392 actions queued or applied inline across the 5,000 calls. Two rows are worth reading twice.
   `propose` from a stranger is 373 refused of 373, which is the property, not a gap — a success there
   is counted and `invariant_ownerOrNobody` asserts the count is zero. And `release` succeeds 6 times
   in 361: of the escrows the sequence creates, only ETH owed to the receiver that can be told to
   accept is ever releasable — the gas burner's escrow fails every retry by construction and the
   `false`-returning token's `transfer` never succeeds, so `claim` (42 successes) is their only exit.
   That is F5 and decision 40 restated as a measurement, and it is why `release`'s row looks thin.
3. **`address(clone).transfer(v)` reverts `OutOfGas` on the first touch of a transaction.** A clone's
   `receive()` is a DELEGATECALL into the implementation, and a cold account costs 2,600 gas, which does
   not fit in the 2,300-gas stipend. Measured in the handler's own trace: the whole frame costs **4,162
   gas** cold (of which 1,513 is the delegated `receive()` body), against 2,300 forwarded —
   `[2300] 0xD0BC…0cE3::fallback{value: 2403}() → [OutOfGas]`. `test_receiveUnderStipend` passes because
   it deploys the clone in the same test, leaving the implementation warm; the stipend reading in
   `src/Distribution.sol`'s comment on `receive()` is therefore true of a warm implementation only. Not
   a loss of funds — the deposit reverts — but a beneficiary contract or vault that pays a distribution
   with `transfer`/`send` will fail, and the dapp's funds page may want to say so. Nothing under `src/`
   or in the existing tests was touched for this. The handler now deposits both ways and counts the
   stipend refusals (the 191 in the table above).
4. **A fuzz test's gas mean depends on which tests the run selected.** On this tree
   `testFuzz_applyWindow` reads `μ: 456764` under `--match-test testFuzz` and `μ: 456944` over the whole
   suite; the medians are identical, so it is the drawn inputs that differ, not the code. CI checks the
   whole suite, so `.gas-snapshot` has to be regenerated with an unfiltered `forge snapshot` or
   `--check` fails for a reason that has nothing to do with gas. Added to `AGENTS.md` § Contracts beside
   the `forge lint` bullet it rhymes with.
5. **A bad table proposed under a non-zero delay queues fine and fails on apply.** `propose` does not
   validate the action, only `_set` does, so the handler's deliberately-malformed tables show up as
   `applyQueued` refusals rather than `propose` refusals — which is why `propose(setBeneficiaries)`
   refuses only 7 of 349 while `applyQueued` refuses 334 of 390. Correct behaviour
   (`test_applyFailureKeepsQueued`), and the reason `invariant_tableSumsToBps` survives it: a failed
   apply leaves the table alone.

## Stop

Not applicable. No invariant failed on `main`'s code: all seven are `[PASS]` at `runs = 256,
depth = 200`, and all seven also pass at depth 50, 100 and 500. Nothing under `src/` was touched, no
`// skip:` marker was added, and no `decision` issue was opened.

## Open questions

None. The two items a reviewer may want to carry are § Discoveries 3 (the cold-implementation stipend
reading, which touches a comment in `src/` and the premise of `test_receiveUnderStipend`) and
§ Decisions 1 (depth 200 against the plan's 50) — neither blocks this PR.
