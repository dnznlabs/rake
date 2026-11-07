# m04-t07 — Invariant and fuzz tests on `Distribution`

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships (runs beside Phase 2)

When this is done, `forge test` holds a stateful invariant suite over `Distribution` and a handful
of fuzzed unit tests: a handler drives random sequences of `propose`, `applyQueued`, `cancel`,
`distribute`, `release`, `claim`, deposits in ETH and two token shapes, ownership moves and time
warps, and after every sequence a set of properties still holds. Today there are **zero**
`invariant_` tests and zero fuzz signatures in `test/` (measured 2026-11-07). This is a different
class of check from the three readings the code has had: it finds the sequence nobody wrote down,
and it runs in CI for every future byte. It is **not a gate on the testnet deploy** (m04-t03): a
property that fails here is a `src/` question for Denizen, and if it comes after t03 has deployed,
the testnets are redeployed at the new address — that is what testnets are for — still before
mainnet, which is the gate that matters. Nothing under `src/` moves in this task; a failing
invariant is a stop, a report and a decision, not a fix.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`). Branch
`m04/t07-invariants` from `origin/main` at or after `9eed049`. Check hooks. Read
`test/Distribution.t.sol` first: its `setUp` (factory, a funded sender, three-row tables through
`_asc`) is the fixture to reuse, not re-invent. `foundry.toml` has no `[invariant]` or `[fuzz]`
section today; this task adds both with the numbers below and the handoff records the measured
run time, because CI's budget is the constraint.

0. **Baselines.** `forge test` 91 passed in ~0.3 s; `grep -c 'function invariant_' test/*.t.sol`
   → 0; `grep -c 'function testFuzz' test/*.t.sol` → 0. Record.

1. **The handler.** `test/invariant/DistributionHandler.sol`: owns one `Distribution` created
   through the real factory (so `init`, the clone and the sender-bound salt are exercised), a set
   of actor addresses (the owner, three beneficiaries including one contract that reverts on
   receive and one that burns the stipend, two strangers), and two ERC-20s (a plain mock and a
   `false`-returning one — both exist under `test/` already; a fee-on-transfer or rebasing token is
   **out**, decision 23 excludes the class). Each handler function wraps one entry point with
   bounded inputs and `vm.prank` of a chosen actor, and *ghost variables* track what the contract
   should owe: ETH and token in, paid out per account, escrowed per account, applied actions. Time
   moves only through a `warp(uint32)` handler bounded to `[0, 2 × GRACE]`. Every handler call
   that is expected to revert for a legitimate reason (a stranger proposing, an eta not reached)
   uses `try` and counts it, so the fuzzer does not spend its depth on reverts.

   Check: `forge test --match-path 'test/invariant/*'` compiles and the handler's call summary
   (`forge test -vv` prints call counts per selector with `targetSelector` set) shows every entry
   point reached at least once in a 256-run session.

2. **The invariants**, each its own `invariant_` function in `test/invariant/Distribution.inv.t.sol`,
   each with one sentence saying which document promises it:
   - `invariant_tableSumsToBps`: `snapshot().table` bps sum to 10,000 and addresses are strictly
     ascending, after every sequence (overview § 5; `_set`).
   - `invariant_reservedEqualsEscrowSum`: for each token, `reserved[token]` equals the sum of
     `escrowed[token][a]` over all actors (the escrow accounting; F4's row).
   - `invariant_balanceCoversReserved`: for ETH and the plain token, `balance ≥ reserved[token]`
     (holds because the excluded token class is excluded; this is the invariant decision 23 rests on).
   - `invariant_conservation`: ETH in − ETH paid out − ETH escrowed-then-released/claimed equals the
     contract's ETH balance, exactly; same per token (nothing is minted or lost by `distribute`,
     `release`, `claim`).
   - `invariant_noActionOutsideWindow`: every `Applied` the ghost recorded happened at a time
     `t` with `eta ≤ t ≤ eta + GRACE`; nothing applied twice; nothing applied after `cancel`
     (decisions 39, 25; F9/F13).
   - `invariant_ownerOrNobody`: after a renounce, `owner()` stays zero and `propose` always reverts
     (F2's queue clear; `test_renounceClearsQueue` is the unit version).
   - `invariant_lockNeverHeld`: the transient lock is never set between calls — read via the
     `notLocked` surface, or by asserting `propose` from the owner never reverts with the lock's
     error at rest.
   The one property deliberately **not** asserted: `distribute` leaves zero balance — it does not
   under escrow, and F10 (remainder to the last row) is design, so assert conservation instead.

   Check: each invariant passes at `runs = 256, depth = 50`; the handoff records calls per
   selector and the wall time.

3. **Fuzzed unit tests**, four, in `test/Distribution.t.sol` beside their unit siblings:
   `testFuzz_roundingNeverExceedsAmount(uint96 amount, uint16[3] bps)` (bounded to a valid table),
   `testFuzz_saltPrefixMustBeSender(bytes32 salt)`, `testFuzz_applyWindow(uint32 delay, uint64 dt)`
   (applies iff `eta ≤ now ≤ eta + GRACE`), `testFuzz_claimMovesExactlyEscrow(uint128 amount)`.

   Check: `forge test --match-test testFuzz` passes at the `[fuzz]` runs set below.

4. **Configuration and CI budget.** `foundry.toml` gains `[fuzz] runs = 512` and `[invariant]
   runs = 256, depth = 50, fail_on_revert = false`. Measure `forge test` wall time with the suite;
   if it exceeds **60 s** on this host, lower `depth` before `runs` and record both. CI keeps one
   `forge test`; a nightly deeper run (`runs = 2048`) is a separate workflow only if the 60 s is
   not met otherwise — say which in the handoff. `.gas-snapshot`: invariant tests are excluded
   from snapshots by forge; the four fuzz tests add rows — regenerate with `forge snapshot` and
   state the new count (91 → 95 expected).

   Check: `forge snapshot --check` exit 0 after regeneration; CI green; wall time recorded.

5. **`SECURITY.md` § Invariants the suite holds** gains a paragraph naming the seven invariants and
   the handler's reach, in the register the section already uses (a property asserted by a test is
   stronger than a finding). `AGENTS.md` § Contracts gains one line on how to run the invariant
   suite alone and what `fail_on_revert = false` means for a new handler function.

   Check: `grep -c 'invariant_' SECURITY.md` → 7.

6. **If an invariant fails on `main`'s code:** do not fix `src/`. Minimise the failing sequence
   (`forge test --match-test <name> -vvvv` prints the shrunk call sequence), write it as a plain
   unit test that fails, put both in the handoff under § Stop, and message the architect. The PR
   then ships the suite with that one invariant marked `// skip: <issue>` and an issue labelled
   `decision`, because a suite that found something is more valuable merged than held.

7. **`HANDOFF.md`** from the template: AC table with the measured counts and times, § Deviations,
   and § Stop if it applies (else the line "no invariant failed").

## Acceptance criteria

- `grep -c 'function invariant_' test/invariant/*.t.sol` → 7, `grep -c 'function testFuzz'
  test/Distribution.t.sol` → 4; `forge test` passes with the counts stated (expected 91 → 102:
  seven invariants and four fuzz tests), wall time recorded and ≤ 60 s on this host, or the
  nightly split documented.
- The handler's call summary shows every `Distribution` entry point reached; `fail_on_revert =
  false` with the revert counts reported, not silently absorbed.
- `git diff --stat origin/main -- src/` empty. If an invariant failed: the shrunk sequence as a
  unit test, the `decision` issue, and the skip marker, all named in the handoff.
- `forge snapshot --check` exit 0, new row count stated; CI green; `node --test` 90 unchanged;
  porcelain empty.
- `SECURITY.md` names the seven invariants; `AGENTS.md` says how to run them.
- PR closes this task's issue.

## Out of scope

- Any `src/` byte. Echidna, Medusa, Halmos (not in nixpkgs; forge's runner is the tool here).
- Fee-on-transfer and rebasing tokens as handler actors (decision 23 excludes the class; F4's row
  documents the consequence).
- `App` invariants: its state is two pointer lists and a lock; `test/App.t.sol`'s 27 tests pin
  them, and `lock()` is M05's.

## Open questions

None. Runs and depth are the engineer's within the 60 s budget.

## Context

- `test/Distribution.t.sol` (fixture, mocks, `_asc`), `test/TableCap.t.sol`, `test/PushGas.t.sol`.
- `SECURITY.md` § Invariants the suite holds (the register and the existing groups); F1, F2, F4,
  F9/F13, F10 rows; decisions 23, 25, 39, 40.
- Foundry book, invariant testing: `targetContract`, `targetSelector`, handler-based testing,
  `fail_on_revert`.
