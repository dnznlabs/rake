# Audit — 2026-11-06

Rollup of two independent `solidity-auditor` legs over the same scope. This document reconciles the
two reports; it does not re-audit the code and proposes no patch.

## 1. Provenance

```
audit date        2026-11-06
code commit       d07483a8b9f6bcfe6200688bcb2d242450b9d464  (dirty: no)
scope             src/Distribution.sol
                  src/App.sol
                  scripts/forge/Deploy.s.sol
                  scripts/forge/DeployApp.s.sol
skill             https://github.com/pashov/skills @ f6c7f0de9cce16f6aa9c57aaac104f0dee90582e  · solidity-auditor VERSION 4 · upstream 4.1
leg 1             codex codex-cli 0.158.0 · requested gpt-5.6-sol → observed gpt-5.6-sol · effort high · 1 pass · 593s wall
leg 2             claude 2.1.310 (Claude Code) · requested opus → observed claude-opus-5-5 · 1 pass · 568s wall
tokens            leg 1 112,063 · leg 2 1191782
transcripts       kept in history only, out of the tree since 2026-11-27 — read them with
                  `git show 8bfb807:audits/2026-11-06/transcripts/leg-1-codex.log` and the same for
                  `leg-2-claude.jsonl`
```

The code commit `d07483a` is the blind-review snapshot of `src/` and the deploy scripts at `94d028c`.
At rollup time `sha256(src/Distribution.sol)` = `ef5f089f…` and `sha256(src/App.sol)` = `0d34f21a…`,
the hashes the known answer's line numbers were verified against.

**Input counts, before deduplication.** Leg 1 (`gpt-5.6-sol`): **4 findings, 1 lead**. Leg 2
(`opus`): **8 findings, 7 leads**. After deduplication: **8 distinct issues** (below). Leads are
unscored by the skill and are carried in § 3, not as findings.

## 2. Findings

Ordered most severe first. Line numbers are from `src/Distribution.sol` at `d07483a` unless stated.
"L1" is leg 1 (codex), "L2" is leg 2 (claude); `L1#n` / `L2#n` are the legs' own finding numbers.

### F1. A second token address for the native balance pays escrowed ETH out again — Medium

- **Where:** `distribute`, `:155` (`_balance(token) - reserved[token]`); `reserved` keyed by token.
- **Found by:** L2 only (`L2#3`, Medium, confidence 80).
- **Severity:** Medium, as L2 gave it. Any caller can trigger it, but only on a chain carrying a
  native-balance ERC-20 (L2 names CELO's GoldToken); the deploy script names no chain.
- **What:** `distribute(address(0))` escrows a failed row's share in `reserved[address(0)]`;
  `distribute(alias)` reads the same native balance, subtracts `reserved[alias] == 0`, and splits the
  escrowed amount to the table again. The escrowed account's `claim`/`release` then fails for want of
  balance, and `distribute(address(0))` underflows until new deposits cover it. L2 gives a 50/50
  trace over 100 CELO.

### F2. Under a balance shortfall, the first `release`/`claim` takes the whole remaining backing — Medium

- **Where:** `release`, `:177-182`; `claim`, `:199-204`. Both pay the nominal
  `escrowed[token][account]` regardless of whether `_balance(token) >= reserved[token]`.
- **Found by:** L1 as two findings (`L1#1` claim, `L1#3` release, both Medium, confidence 90). L2
  states the same consequence in one clause of `L2#5` ("the claims that come first take all of the
  shortfall's cover", "the last escrowed account to claim fails") but rates and titles that finding
  as the `distribute` revert (F6 below).
- **Severity:** L1 Medium; L2 did not rate this consequence separately (its `L2#5` is Low and is about
  the revert). This document adopts **Medium**: it is an actual transfer of value from later
  escrowed accounts to earlier ones, not an availability failure, and its precondition — a token
  whose balance can fall after an escrow (rebasing, slashing, clawback) — is a token the contract
  accepts without restriction. It is not raised to High because the trigger is a property of the
  token, not something an attacker can force on a standard ERC-20.
- **What:** after a negative rebase leaves `balance < reserved`, the first escrowed account to exit
  is paid in full and the shortfall lands wholly on the last one, whose exit then reverts.
- **Same root as F6**; kept separate because the mechanism and the cost differ (loss allocation in
  `release`/`claim` vs. a revert in `distribute`).

### F3. The ERC-20 push forwards all gas, so a hook token's recipient can starve later rows — Medium

- **Where:** `_push` ERC-20 branch, `:417` (no `gas:` argument), reached from the `distribute` loop
  (`:166`). The ETH branch on `:406-415` is capped at `PUSH_GAS`.
- **Found by:** both. L1 `L1#4` (Medium, 85). L2 twice: `L2#6` (Medium, 75) and `L2#8` (Medium, 75).
- **Severity:** Medium; both legs agree.
- **What:** with an ERC-777-style hook token, the recipient receives 63/64 of the frame and can burn
  it, leaving 1/64 for every later row; `distribute(token)` then fails for every caller until the
  owner re-tables through the delay. L2 reports a scratch PoC: 17 rows revert at 16M gas, 527,095 gas
  without the hook. L2 also notes the NatSpec at `:390-401` ("one hostile recipient cannot burn the
  whole distribution") holds only for ETH. `L2#6` adds a second mechanism: a hook revert with large
  return data is copied by `(ok, data) = token.call(...)` with the 1/64 left. The comment at
  `:398-401` justifies the ERC-20 copy on the ground that the token is caller-chosen; L2's point is
  that with a hook token the *recipient* controls what the token returns, which that comment does not
  address.

### F4. A clone's `receive` does not fit a 2,300-gas stipend when the implementation is cold — Medium

- **Where:** `receive()`, `:146-150` (the comment on `:146` promises the stipend); the proxy runtime
  written by `DistributionFactory.create`, `:471-474` (and `predict`, `:490-494`).
- **Found by:** L2 only, as two findings with one root cause: `L2#1` (factory, Medium, 85) and `L2#2`
  (`receive`, Medium, 85). L2 itself says they share a root cause.
- **Severity:** Medium, as L2 gave both. The code's own comment states a property the code does not
  keep, and a `send` payer that ignores the result keeps ETH the table was owed.
- **What:** the PUSH0 proxy `DELEGATECALL`s on empty calldata; a cold `DELEGATECALL` costs 2,600 gas
  alone, above the 2,300 stipend, so `transfer`/`send` into a clone fails. L2 reports
  `[2300] clone::receive{value: 1 ether}() ← [OutOfGas]`.
- **Inconsistency inside L2, recorded rather than resolved:** `L2#1` says a scratch PoC *passes* once
  a warm-up call touches `implementation`; `L2#2` says the clone needs "about 4,170 gas even when the
  implementation is warm", i.e. fails warm too. The project measured 1,662 gas on the clone's frame
  warm (m03-t05, per the known answer). The cold-path failure is the checkable claim; the warm figure
  in `L2#2` is unsupported by L2's own `L2#1` and should not be relied on.

### F5. The clone address does not commit to its owner or table — Low

- **Where:** `DistributionFactory.create`, `:465-474`; `predict`, `:487-498`; NatSpec `:445-450` (L2 cites `:448-453`).
- **Found by:** L2 only (`L2#7`, Medium, 75 — L2 notes its gate demoted it and three-agent agreement
  promoted it back).
- **Severity:** L2 Medium; this document adopts **Low**. The address depends on factory, salt and
  init code only, *by documented design* (`:445-450`), and the exploit needs the salt-prefix holder —
  the deploying key, a trusted role — to act maliciously or be leaked, plus ETH sent to the address
  on a chain where the clone is not yet deployed. L2's premise that the factory sits at one address on
  every chain is supported by `scripts/forge/Deploy.s.sol` (Arachnid CREATE2 deployer, decision 33),
  though the factory's own NatSpec point 3 (`:454-456`) still calls the factory nonce-addressed — a
  doc/script disagreement L2 did not raise.
- **What:** the salt holder can deploy on an un-deployed chain with its own owner and table, and
  `init` accepts the pre-sent balance (`:143`), so funds paid in advance to the predicted address go
  to that table. L2 notes this contradicts "the deploying key never needs to own anything".

### F6. `reserved[token]` above the balance reverts `distribute` for every caller — Low

- **Where:** `distribute`, checked subtraction on `:155`.
- **Found by:** L2 (`L2#5`, Low, 75 — promoted from a lead raised by five agents). L1 did **not**
  report the revert; its `L1#1`/`L1#3` share the precondition but report a different consequence
  (F2).
- **Severity:** Low, as L2 gave it: availability for one non-standard token, recoverable by deposits
  that cover the shortfall.
- **What:** a negative rebase or issuer seizure leaves `_balance(token) < reserved[token]`; solc's
  checked arithmetic panics `0x11`, so every `distribute(token)` reverts. L2's example: `reserved[stETH]`
  1000, balance 990. L2 notes its own fix only replaces the panic with a named revert and does not
  share the loss.

### F7. Within the grace window, any caller chooses when and in what order matured actions apply — Low

- **Where:** `applyQueued`, `:242`. No caller check; the gates are `block.timestamp < eta` (`:247`)
  and `block.timestamp > eta + GRACE` (`:249`).
- **Found by:** L2 only (`L2#4`, Low, 75 — promoted from a lead raised by two agents).
- **Severity:** Low, as L2 gave it.
- **What:** a payee in a new table can apply a matured `setBeneficiaries` and `distribute` in one
  transaction, taking balance that arrived under the old table; with two conflicting matured table
  changes, the caller picks the order. L2 notes the old payees can pre-empt by calling `distribute`
  before the eta. See § 4 on how this relates to the closed F9/F13: `GRACE` bounds the window to
  14 days but does not remove it, which matches the code.

### F8. The last row's remainder collects every other row's rounding — Low

- **Where:** `distribute`, `:163` (`i + 1 == n ? amount - paid : bps * amount / BPS_TOTAL`).
- **Found by:** L1 as a finding (`L1#2`, Medium, 90). L2 as an unscored lead ("We did not find a
  token where the gain covers the gas").
- **Severity:** L1 Medium; L2 did not score it. This document adopts **Low**: the gain per call is
  below `n − 1` base units (`n ≤ MAX_BENEFICIARIES`), the code states the remainder rule as intended
  on `:162`, and L1 gives no token or deposit pattern where the extraction exceeds the caller's gas —
  L2 looked for one and did not find it. L1's confidence of 90 is not evidence of impact.
- **What:** every row but the last rounds down; the last (highest-address) row takes `amount - paid`,
  so a last beneficiary calling after each small deposit of a low-decimal token accumulates the
  rounding of all other rows.

## 3. Agreement and disagreement

**Overlap.** Of 8 distinct issues, **one** was reported as a finding by both legs: F3 (ERC-20 push
gas), at the same line and the same severity. Two more were seen by both but scored by only one: F2
(L1 finding; L2 states it in passing inside its F6 finding) and F8 (L1 finding; L2 lead). Five are
single-leg: F1, F4, F5, F6, F7 — all L2. L1 has no finding L2 entirely failed to see.

**Volume.** L2 produced twice the findings and seven times the leads, on ~10× the tokens
(1,191,782 vs 112,063) and 9 of 12 agents against L1's 3 reviewers covering 12 specialties.

**Single-leg findings, judged from the reports and the code:**

- **F1, F4, F6 (L2 only)** — genuine misses by L1. Each is a shape this project already carries as a
  known, live issue (§ 4), and each is at a cited line that is in L1's scope.
- **F7 (L2 only)** — genuine against the current code: `applyQueued` has no caller check. Its weight
  depends on whether an un-owner-ordered application inside `GRACE` is accepted design; the reports
  cannot settle that.
- **F5 (L2 only)** — not a false positive (the mechanism is real and the NatSpec at `:445-450` does
  overstate), but it rests on a trusted role misbehaving; hence Low.
- **F2 and F8 (L1-led)** — F2 is real and L2 half-saw it; L2's specialist agents for math/precision,
  invariants and economic security all died (§ 5), which is the most plausible reason it was not
  scored separately there. F8 is real arithmetic with doubtful economic impact; the severity
  disagreement (Medium vs unscored lead) is resolved to Low above.

**Severity disagreements:** F2 (L1 Medium, L2 folded into Low → Medium adopted), F5 (L2 Medium →
Low adopted), F8 (L1 Medium, L2 lead → Low adopted). Reasons are given on each entry.

**Leads not promoted to findings** (carried for triage, unscored):

- L1: a self-beneficiary leaves its share in the contract, so later calls pay it again (`:166`;
  `_set` at `:330-345` does not refuse `address(this)`).
- L2: `acceptOwnership` (`:304`) runs during `distribute` without `notLocked`; L2 found no path to a
  table or payout change.
- L2: a full queue can make `acceptOwnership` / `_clearQueue` (`:350`) run out of gas — owner-key
  precondition (two leads on the same loop).
- L2: last-row rounding (= F8).
- L2: a shared forwarder (e.g. Multicall3) as `msg.sender` lets anyone use its salt prefix in
  `create` (`:465`).
- L2: ETH escrowed for a contract that needs > `PUSH_GAS` to receive and cannot originate a `claim`
  stays locked (`release` `:177`, `:408`).
- L2: a nominee can `acceptOwnership` before the owner's timelocked `transferOwnership(owner)` undo
  runs, and `_clearQueue` deletes the undo (`:291`, `:304`).

**Coverage gap shared by both legs:** neither leg raised anything in `src/App.sol`,
`scripts/forge/Deploy.s.sol` or `scripts/forge/DeployApp.s.sol`.

## 4. Grading against the known answer

Sixteen entries: six live, ten closed. Graded on code location and mechanism.

### Still in the code

| Known shape | Leg 1 (codex) | Leg 2 (claude) |
|---|---|---|
| **#19** `reserved > balance` reverts `distribute` (`:155`) | **Missed.** `L1#1`/`L1#3` hinge on the same state but report loss allocation in `claim`/`release`, never the revert. | **Found**, Low (`L2#5`, `:155`). |
| **#54** `propose` queues an action `applyQueued` will always revert (`:220`) | **Missed.** | **Missed.** |
| **#18** `receive()` over a 2,300 stipend when the implementation is cold (`:147`) | **Missed.** | **Found**, Medium (`L2#1` + `L2#2`). Its warm-path figure (~4,170) conflicts with its own `L2#1` and with the project's 1,662 measurement. |
| **#22** CREATE2 collision in `create` burns forwarded gas (`:474-475`) | **Missed.** | **Missed.** `L2#7` and a lead are on `create`/`predict` but about address commitment and salt prefixes, not the collision. |
| **F8 / #123** ERC-20 push passes no gas (`:417`, via `:166`) | **Found**, Medium (`L1#4`). | **Found**, Medium (`L2#6`, `L2#8`). |
| **F12 / #127** native-balance alias pays escrowed ETH out again (`:154-159`) | **Missed.** | **Found**, Medium (`L2#3`). Its fix proposes a *new* `nativeAlias` immutable; it does not claim one exists. |

**Score on live shapes:** leg 1 **1 of 6**; leg 2 **4 of 6**.

**#54 has now been missed by both legs on all three runs. #22 has now been missed by all six legs
across three runs.** The method has not found either shape once.

### Closed before this audit

No leg reported any of the ten closed shapes as open in its original mechanism. Item by item:

- **#20** (`release` opaque failure), **#61** (`_push` comment), **#74** (single-step ownership),
  **#111** (silent renounce), **F6** (ETH push copying return data), **F11** (`App.lock` accepting a
  7702 designator): neither leg raises them. L2's `L2#6` second mechanism concerns the **ERC-20**
  branch's copy (`:417-418`), which the known answer says still copies by design; it is a variant of
  F8, not F6 reopened.
- **F1** (reentrant `propose`/`applyQueued` mid-`distribute`): neither reports it open. L2's lead
  that `acceptOwnership` lacks `notLocked` is about the guard's boundary, not the closed mechanism,
  and L2 itself found no path to a table change.
- **F2** (queue outliving a handover): neither reports it open. Two L2 leads (unbounded `_clearQueue`;
  a nominee's `acceptOwnership` deleting the owner's queued undo) are consequences *of* the fix,
  i.e. reading the code as it now is.
- **F9 / F13** (`applyQueued` ordered nothing and expired nothing): **L2's `L2#4` (F7 here) is the
  closest re-raise.** Against the code it is **the fix found partial, not code L2 was not given**:
  `GRACE` (`:65`, `:249`) removed "forever", but `applyQueued` (`:242`) still has no caller check, so
  "applicable by anyone, in any order" holds for 14 days after each eta. L2 cites the current line and
  makes no "forever" claim; it does not mention `GRACE`, so the report does not show whether L2 weighed
  the window. Leg 1 does not raise it.
- **F5 / #95** (unreleasable escrow): neither reports it open. L2's lead on a contract payee that
  cannot originate a `claim` names `claim` correctly and argues the second exit does not cover that
  payee — the fix found wanting at an edge, unscored.

F3, F4, F7, F10 of the 2026-10-30 run are not closed; L2's `L2#5` is F4 (#19) and its `L2#1`/`L2#2`
are F7 (#18), both credited above as live finds. Whether L1's `L1#2` (F8 here) is the 2026-10-30
run's F10 cannot be confirmed from the material this rollup has; it is not graded either way.

## 5. Legs

**Leg 1 — codex, `gpt-5.6-sol`** ([`pashov/solidity-auditor/gpt-5.6-sol/`](pashov/solidity-auditor/gpt-5.6-sol/)).
One pass, 593 s, 112,063 tokens. **4 findings, 1 lead.** It reports, verbatim: "this harness exposed
only four total agent slots, so the skill's 12 simultaneous agents could not run. Three reviewers
covered all 12 specialties in four-specialty groups." (`scope.tsv`: `pass_1_agents 3/12`.) Found 1 of
the 6 live known shapes.

**Leg 2 — claude, `claude-opus-5-5`** ([`pashov/solidity-auditor/opus/`](pashov/solidity-auditor/opus/)).
One pass, 568 s, 1,191,782 tokens. **8 findings, 7 leads.** It reports, verbatim: "This 1-pass scan
ran **9 of 12 agents**. The math-precision agent (1) and the invariant agent (5) died on an API
safeguard error (`reasoning_extraction`). The economic-security agent (3) read its bundle, but a
safety classifier stopped its output, so it returned nothing. Per the skill, no agent was respawned.
Nothing covers math/precision, invariant or economic-security as a specialty in this leg … Also not
run: the upstream VERSION check (skipped by the leg prompt), and the model picker (this runtime has
no `AskUserQuestion`, so agents ran on the orchestrator's own model, Opus)." It also states that the
**File** and **Severity** lines in its finding bodies were added for this rollup. (`scope.tsv`:
`pass_1_agents 9/12`.) Found 4 of the 6 live known shapes.
