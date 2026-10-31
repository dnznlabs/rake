# Audit — rake, 2026-10-30

Two independent single-pass runs of `pashov/skills` `solidity-auditor`, reconciled. This document
does not fix anything; every finding is carried on untouched for triage.

## 1. Provenance

```
audit date        2026-10-30
code commit       37eccc212fdb91b6a6db0900eef104130b0c8d42  (dirty: no)
scope             src/Distribution.sol
                  src/App.sol
                  scripts/forge/Deploy.s.sol
                  scripts/forge/DeployApp.s.sol
skill             https://github.com/pashov/skills @ f6c7f0de9cce16f6aa9c57aaac104f0dee90582e  · solidity-auditor VERSION 4
leg 1             codex codex-cli 0.158.0 · requested gpt-5.6-sol → observed gpt-5.6-sol · effort high · 1 pass · 333s wall
leg 2             claude 2.1.310 (Claude Code) · requested opus → observed claude-opus-5-5 · 1 pass · 435s wall
tokens            leg 1 118,751 · leg 2 1347399
```

`37eccc2` is the blind snapshot commit ("rake src/ and deploy scripts at `ede55c3`"). The
`src/Distribution.sol` in it has sha256 `57b69fa612b3…`, which matches the file the known answer
was written against, so the known answer's line numbers apply here.

## Input counts (before deduplication)

| Leg | Scored findings | Leads | Items read |
|---|---|---|---|
| leg 1 — codex / gpt-5.6-sol | 5 | 1 | **6** |
| leg 2 — claude / opus | 5 (4 at or above threshold, 1 below at 70) | 8 | **13** |

These 19 items reduce to **10 distinct issues**. Leg 1 lists one bug twice (#2 and #3). Leg 2 lists
two bugs twice each (#1 and #2; #3 and the return-data lead) and says so itself. Its two ERC-20
gas-cap leads describe one mechanism too.

Line numbers below are from the audited source. Leg 1's citations match it. **Leg 2's citations are
offset by about +3 lines throughout**: for example, it puts the `reserved` subtraction at `:138`
(actual `:135`), `applyQueued` at `:199-210` (actual `:196`), and `receive` at `:129-133` (actual
`:127`). Its function names are correct, and this document matches leg 2's findings to the code by
function name.

## 2. Findings

### F1. Reentrant `applyQueued` swaps the beneficiary table mid-`distribute` — Medium

`src/Distribution.sol:196` (`applyQueued`, no `nonReentrant`), exploited from `distribute`
`:134`. The loop reads `_table[i]` on each pass against a length cached up front, and the last row
takes `amount - paid`.

- **Found by:** both legs. Leg 1 #4. Leg 2 #1 + #2 (the same bug listed under two functions).
- **Severity:** Medium in both legs, and adopted as Medium.
- **What it costs:** A beneficiary whose token calls it on transfer (an ERC-777-style hook) can call
  a matured, unapplied `setBeneficiaries` from inside the payout. The remaining rows are then paid
  from the new table. Leg 2 ran a PoC: old table [A 5000, B 5000], new table [C 5000, A 5000]. A
  receives the whole 100e18, and B and C receive nothing. A new table shorter than the cached
  length makes `distribute` revert out of bounds while the change stays ready. Leg 2 measured a
  cold `applyQueued` at 86.6k–141.7k gas, above `PUSH_GAS` (100,000), so the ETH path generally
  cannot carry the attack. Both legs say a hook token is needed. Leg 1 also names `propose` as a
  re-entry point, which only the owner can call.

### F2. Queued actions outlive an ownership handover or a renounce — Medium

`src/Distribution.sol:245` (`acceptOwnership`), `:235` (`transferOwnership` renounce branch) and
`:196` (`applyQueued`). The queue hash is `keccak256(action, nonce)`, with no owner epoch. Neither
the handover nor the renounce clears `queued` or `_pending`, and anyone can call `applyQueued`.

- **Found by:** both legs. Leg 1 #2 (handover, at `acceptOwnership`) and #3 (the same mechanism,
  at `applyQueued`). Leg 2 #5 (renounce first, handover noted in the same entry).
- **Severities:** leg 1 gave **High** (#2) and **Medium** (#3). Leg 2 gave **Low**, at confidence
  70, below its threshold.
- **Adopted: Medium.** Both legs agree that the outgoing owner must queue the action before giving
  up control, which is a privileged precondition. That rules out High. Low understates the result.
  After a handover, `cancel` (`:210`) is immediate, but the new owner can call it only after
  `acceptOwnership`. Anyone can apply an already-matured action in the same block, so the new owner
  cannot reliably win that race. After a renounce, nobody can ever call `cancel`. So the defeated
  guarantee is the handover itself. The `transferOwnership` NatSpec says a renounce means "nothing
  can be proposed or cancelled again", yet a queued `transferOwnership(B)` can still give B
  ownership. Leg 2's PoC showed exactly that.
- **What it costs:** A former owner (or its nominee) can retake ownership, or redirect the table,
  after a handover or a renounce.

### F3. `DeployApp` owner defaults to Foundry's default sender — Medium

`scripts/forge/DeployApp.s.sol:11`: `vm.envOr("OWNER", msg.sender)` is evaluated before
`vm.startBroadcast()`.

- **Found by:** both legs, but see below. Leg 1 #1 (finding). Leg 2 lead (unscored).
- **Severities:** leg 1 gave Medium at confidence 90. Leg 2's lead carries no severity.
- **Adopted: Medium**, the only severity either leg gave. The cost is concrete: an `App` owned by an
  address with no known key, which nobody can update or `lock`. But it appears at deploy time and a
  redeploy fixes it, which argues against anything higher.
- **What it costs:** If the operator leaves out `OWNER` and runs the documented command at `:7`
  (which passes no `--sender`), `msg.sender` is Foundry's `DEFAULT_SENDER`. The comment on `:8`
  ("defaults to the broadcaster") is wrong in that case.
- **Independence caveat:** leg 2 reports that its agent 2 ran a `grep` that matched leg 1's output
  under `audits/2026-10-30/` and showed lines about this exact issue. Leg 2 says agents 9 and 7
  raised it without seeing those lines. This is the one finding where the cross-leg agreement is
  not clean.

### F4. `reserved[token]` above the balance blocks `distribute` and `release` — Medium

`src/Distribution.sol:135`: `uint256 amount = _balance(token) - reserved[token];`. Also `:162`,
`reserved[token] -= amount`, in `release`.

- **Found by:** both legs. Leg 1 #5 (finding, sender-paid fee tokens) and leg 1 lead (negative
  rebase), both at `:135`. Leg 2 lead (rebase or sender fee, `distribute` and `release` both
  failing).
- **Severities:** leg 1 gave Medium to both its finding and its lead. Leg 2's lead carries no
  severity.
- **Adopted: Medium**, the only severity given. Both legs leave it there, and neither leg proved an
  unprivileged actor can trigger the shortfall.
- **What it costs:** A fee-on-transfer, rebasing or clawback token can push the balance below
  `reserved`. The checked subtraction then reverts `distribute` for that token until inflows cover
  the gap, and recorded escrows cannot be fully released. Leg 1 frames the cost as escrow
  insolvency, and leg 2 as a `distribute` DoS. It is the same line and the same condition.

### F5. An escrow whose recipient cannot take the push can never be released — Low (lead)

`src/Distribution.sol:157` (`release`). It retries through `_push` (`:319`) under the same
`PUSH_GAS` (`:56`), with no alternate destination and no higher gas limit.

- **Found by:** leg 2 only (lead, unscored).
- **Adopted: Low.** Neither leg scored it. Leg 2 did not establish whether the design accepts it,
  and a re-table is a remedy for future pushes.
- **What it costs:** A recipient that always needs more than 100,000 gas, or that the token
  blacklists (USDC or USDT), never receives its escrow, and that value stays counted in `reserved`.

### F6. ETH push copies unbounded return data on every failure — Low

`src/Distribution.sol:321`: `(ok, data) = to.call{value: amount, gas: PUSH_GAS}("")` copies all
return data, called from the `distribute` loop.

- **Found by:** leg 2 only. Finding #3 at confidence 75, plus a lead listing the same bug under
  `distribute`.
- **Severity:** leg 2 gave Low, adopted as Low. It needs many hostile rows in a table the owner
  chose.
- **What it costs:** Leg 2 measured it. With k reverting rows each returning 0x31000 bytes, gas
  climbs to 10.6M at k=10 and 35.3M at k=20. The `MAX_BENEFICIARIES` "under half a 30M block" bound
  fails at about k=11, and a 30M block fails at about k=18. ETH distribution then stops until a
  timelocked re-table, and never resumes if ownership was renounced.

### F7. `receive()` cannot run under a 2,300-gas stipend when the implementation is cold — Low

`src/Distribution.sol:127`, against the comment on `:126` ("Must run under a 2,300-gas `transfer`
stipend").

- **Found by:** leg 2 only. Finding #4 at confidence 75.
- **Severity:** leg 2 gave Low, adopted as Low. No funds are lost: `transfer` reverts, and with
  `send` the ETH stays with the payer.
- **What it costs:** A clone's `DELEGATECALL` into a cold implementation costs 2,600 gas on its own.
  Leg 2's PoC shows `payable(clone).transfer(1 ether)` reverting when the implementation is cold. A
  second agent measured about 4,200 gas even when warm. That would mean the stipend fails warm
  too, which is stronger than the code comment's claim and should be confirmed at triage.

### F8. Uncapped gas on the ERC-20 push lets a hook token grief `distribute` — Low (lead)

`src/Distribution.sol:325` (the ERC-20 branch of `_push`, no gas argument), reached from the
`distribute` loop.

- **Found by:** leg 2 only, as two leads (under `distribute` and `_push`) describing one mechanism.
- **Adopted: Low.** It is unscored, and leg 2 found no hook token that would reach the contract.
- **What it costs:** A hook beneficiary can use 63/64 of the remaining gas. The 1/64 left cannot pay
  the escrow writes for later rows (about 40k each), so `distribute(token)` reverts at any block gas
  limit.

### F9. Queued actions never expire, and any caller chooses the order — Low (lead)

`src/Distribution.sol:196` (`applyQueued`): `queued[hash]` has no expiry or grace window.

- **Found by:** leg 2 only (lead, unscored).
- **Adopted: Low.** Leg 2 did not show an owner flow that leaves two `setBeneficiaries` queued.
- **What it costs:** If two `setBeneficiaries` are both matured, any caller can apply the older one
  last, so the older table wins.

### F10. The last row collects every row's rounding remainder — Informational (lead)

`src/Distribution.sol` `distribute` share computation: `(bps * amount) / BPS_TOTAL`, with the last
row taking `amount - paid`.

- **Found by:** leg 2 only. One agent raised it as a finding, and leg 2 demoted it to a lead.
- **Adopted: Informational.** Leg 2's own bound is at most `n-1` base units per call, which matters
  only for tokens with 0 to 2 decimals or very small inflows.

## 3. Agreement and disagreement

**Both legs found 4 of the 10 issues: F1, F2, F3 and F4.** F3's agreement is weakened by leg 2's
reported partial look at leg 1's output (§ F3). That leaves three clean two-lab agreements: F1, F2
and F4.

- **F1:** they agreed on mechanism and severity. Leg 2 added a PoC and the gas measurement that
  rules out the ETH path.
- **F2:** they agreed on mechanism and disagreed most on severity (High against Low). Leg 1 led with
  the handover, and leg 2 led with the renounce and scored it below its own threshold. A reader of
  leg 2's findings table would see it only under "Below Confidence Threshold".
- **F4:** leg 1 promoted it to a finding. Leg 2 kept it as a lead.

**Only leg 2 found 6 issues: F5–F10.** None was found by leg 1 alone.

- **F6 and F7** carry measured PoCs in leg 2 and an exact mechanism (EIP-2929 cold-access cost, and
  return-data memory growth). They look like real misses by leg 1, not false positives.
- **F5** is a genuine shape in the code: `release` re-runs the identical `_push`. It also matches
  the known answer (§ 4), so leg 1 missed it.
- **F8, F9 and F10** are unproven leads, and leg 2 says so. F10 is dust by leg 2's own bound.
  Whether leg 1 missed these or rightly ignored them cannot be settled from the reports.

Leg 1 ran with 3 of 12 specialist agents (§ 5), and leg 2 with 12 of 12. Leg 2's extra coverage
lines up with its larger single-leg set. The two legs also differ about 11× in tokens.

## 4. Grading against the known answer

The known answer lists five open shapes and three items closed before the audit. A shape counts as
found when a leg reports the same mechanism at the same function, whatever the wording.

| Known issue | Location | Leg 1 (codex / gpt-5.6-sol) | Leg 2 (claude / opus) |
|---|---|---|---|
| **#19** `reserved` above balance reverts `distribute` / `release` | `distribute` `:135`, `release` `:162` | **Found**, as finding #5 (Medium) plus a lead (Medium). It names the fee and rebase cause at `:135`. It frames the cost as unrecoverable escrow, not as `distribute` reverting. | **Found**, as a lead (unscored). The mechanism is exact: the checked subtraction reverts `distribute`, and `release` fails too. |
| **#54** `propose` queues an action that `applyQueued` will always revert | `propose` `:176` | **Missed.** | **Missed.** Its "queued actions never expire" lead (F9) is about the same queue but a different mechanism (expiry and ordering, not unvalidated actions). |
| **#95** escrow to a push-burning recipient can never be released | `release` `:157`, `PUSH_GAS` `:56` | **Missed.** | **Found**, as a lead (unscored), F5. It names the same `_push` retry under the same `PUSH_GAS`, and adds the token-blacklist case. |
| **#18** `receive()` over the 2,300 stipend when the implementation is cold | `receive` `:127` | **Missed.** | **Found**, as finding #4 (Low, confidence 75), F7, with a PoC. |
| **#22** CREATE2 collision in `create` burns the forwarded gas before `DeploymentFailed` | `DistributionFactory.create` `:364` / `:381` | **Missed.** | **Missed.** |

**Leg 1 found 1 of 5. Leg 2 found 3 of 5 (one as a scored finding, two as leads).** Both legs
missed #54 and #22. Neither leg raised anything in `DistributionFactory`, so the factory got no
finding from either lab.

**Closed before this audit (#20, #61, #74):** neither leg reported any of them as open. No leg
raised an opaque `release` failure, the `_push` comment, or single-step `transferOwnership`. Leg 1's
F2 entry sits on `acceptOwnership` and assumes the two-step flow, so it read the fixed code. Leg 1
quotes `_push`'s return-word check as it stands at `:326`.

The known answer's #54 entry says the owner's remedy is "a `cancel`, which must itself wait out the
delay". In the audited code, `cancel` (`:210`) is owner-only and immediate (its NatSpec: "the delay
guards applying, not cancelling"). This does not change any grading. It is recorded so the next
audit can correct the known-answer text.

## 5. Legs

**Leg 1 — codex `gpt-5.6-sol`, effort high, 1 pass**
([`pashov/solidity-auditor/gpt-5.6-sol/`](pashov/solidity-auditor/gpt-5.6-sol/)). It produced 5
findings and 1 lead. Its orchestration was degraded, which it states in its own words: *"This
runtime provided only three audit-worker slots, so three independent workers each reviewed four of
the twelve specialist bundles. The required twelve simultaneous agents could not run. The upstream
skill-version check also could not reach the network."* `scope.tsv` records `pass_1_agents 3/12`.
It reported no PoCs. Its line citations match the audited source.

**Leg 2 — claude `claude-opus-5-5`, 1 pass**
([`pashov/solidity-auditor/opus/`](pashov/solidity-auditor/opus/)). It produced 5 findings (one
below the threshold, at 70) and 8 leads. `scope.tsv` records `pass_1_agents 12/12`. Its own notes
on what it could not do:

- The model picker did not run (*"This runtime has no `AskUserQuestion`"*), so all 12 agents ran on
  Opus 5.5.
- The pinned skill is VERSION 4 while upstream is 4.1. The run used 4.
- A **blindness breach**: *"Agent 2 (access-control) ran a `grep` over the repository that matched
  files under `audits/2026-10-30/` and showed a few lines of the other leg's report. Those lines
  were about the `DeployApp` `OWNER` default."* (see F3).
- One agent-7 command was blocked by the safety classifier and not retried.
- PoCs ran in scratch Foundry projects under `/tmp`. It reports the audited tree unchanged.

Its line citations are offset by about +3 from the audited source (§ Input counts).

**Known answer:** this run had one (`audits/KNOWN_ANSWER.md`), graded in § 4.
