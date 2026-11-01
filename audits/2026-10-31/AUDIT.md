# Audit — rake, 2026-10-31

## 1. Provenance

```
audit date        2026-10-31
code commit       b2ed0609293efb997771d80ee320a63d2921fd6f  (dirty: no)
scope             src/Distribution.sol
                  src/App.sol
                  scripts/forge/Deploy.s.sol
                  scripts/forge/DeployApp.s.sol
skill             https://github.com/pashov/skills @ f6c7f0de9cce16f6aa9c57aaac104f0dee90582e  · solidity-auditor VERSION 4 · upstream 4.1
leg 1             codex codex-cli 0.158.0 · requested gpt-5.6-sol → observed gpt-5.6-sol · effort high · 1 pass · 340s wall
leg 2             claude 2.1.310 (Claude Code) · requested opus → observed claude-opus-5-5 · 1 pass · 440s wall
tokens            leg 1 116,064 · leg 2 1148597
```

`b2ed060` is the blind review repository's own commit. Its message says it is "rake src/ and deploy
scripts at b0fb4e3". The rollup checked that claim against the known answer: `sha256(src/Distribution.sol)`
at this commit is `100f1b6f0e9f…`, which matches the `100f1b6f…` the known answer records for
`b0fb4e3`. The line numbers below therefore match the known answer's.

**Inputs read, before deduplication:** leg 1 had **3 findings** and 0 leads. Leg 2 had **8 findings**
(7 at or above its confidence threshold of 75 and 1 below it, at 70) and **4 leads**. After
deduplication there are **8 distinct findings**: 3 from both legs, 5 from leg 2 only and 0 from leg 1
only. Leg 2's 4 leads are listed separately at the end of § 2.

**Severity:** leg 1 gave every finding a severity, and all three are Medium. Leg 2's report has no
severity field. It gives only a confidence score. So wherever "leg 2: —" appears below, leg 2 gave
no severity, and the adopted severity is this rollup's own judgement, with the reason stated.

## 2. Findings

### F1. ERC-20 push forwards all gas, so a hook recipient starves the rows after it — Medium

`src/Distribution.sol:369` (`_push`, ERC-20 branch), reached from the `distribute` loop at `:147-159`.

- **Found by:** both. Leg 1 #1 ("ERC-20 callback exhausts gas and blocks every payout"). Leg 2 #6 ("The token push forwards all gas to a recipient hook"). Leg 2's lead 3 is the helper-level view of the same issue.
- **Severity:** leg 1 Medium · leg 2 — (confidence 75). **Adopted: Medium.** Two conditions must hold together: a token whose `transfer` calls its recipient, and an owner-chosen hostile row. When they do, `distribute(token)` cannot complete, and the remedy is a re-table that waits out the delay. No funds are taken.
- **What:** the ETH branch caps the call at `PUSH_GAS` (`:360`, `:362-366`). The ERC-20 branch calls `token.call(...)` with no `gas:`, so a recipient hook gets 63/64 of the remaining frame. The 1/64 left over must pay for the escrow write and every later row. Leg 1 says this blocks "every payout", which overstates it. Leg 2 is more precise: about 469k gas is left at a 30M limit, which leaves 12 or more later rows unable to finish. A low vanity address puts the hostile row first.

### F2. `reserved[token]` above the balance makes `distribute` revert and short-pays the last `release` — Medium

`src/Distribution.sol:142` (`distribute`, checked `_balance(token) - reserved[token]`). `release` is at `:164-179`, with `reserved -= amount` on `:169`.

- **Found by:** both. Leg 1 #3 ("Balance decreases strand escrow and block distributions"). Leg 2 #4 ("A balance below the reserve makes distribute revert").
- **Severity:** leg 1 Medium · leg 2 — (confidence 75). **Adopted: Medium.** It needs a token whose balance can fall after an escrow (negative rebase, slashing, sender fee, clawback). When that happens, every caller's `distribute` for that token reverts with panic 0x11 until the balance is topped up. The escrowed accounts also hold claims larger than the balance, so the last account to call `release` is short.
- **What:** both legs describe the same checked underflow. Leg 2 adds a worked example: stETH, reserved 10e18, balance 11e18, then a 10% slash.

### F3. A second token address for the native balance pays escrowed ETH out again — Medium (chain-dependent)

`src/Distribution.sol:142`, with `reserved` keyed by token address at `:87`.

- **Found by:** leg 2 only (#5, "A second address for one balance pays out escrowed coins again"). Confidence 75.
- **Severity:** leg 1 — · leg 2 —. **Adopted: Medium.** On a chain where it applies, the impact looks High: any caller can repeatedly hand one row's escrow to the other rows. It only applies on a chain where an ERC-20 moves the native balance (leg 2 names Celo's GoldToken) or with a double-entry-point token. The scope deploys to `$RPC` (`scripts/forge/Deploy.s.sol:7`) and names no chain, so High is not established for this code as given. If the project deploys to such a chain, treat this as High.
- **What:** `distribute(address(0))` escrows B's share in `reserved[address(0)]`. `distribute(alias)` then reads the same native balance, subtracts `reserved[alias] = 0`, and pays the escrowed amount to the table again. After that, `release(address(0), B)` fails because the balance is short. Leg 2's fix refers to a `NATIVE_ALIAS` constant that does not exist in the code. That is part of its proposal, not part of the mechanism.

### F4. `App.lock` accepts a code pointer whose code can change after the lock — Medium

`src/App.sol:158-170` (checks at `:162`, `:166`). The same `code.length == 0` check admits the pointer in `setChunks` (`:118`) and `setWidgetChunks` (`:140`).

- **Found by:** leg 2 only (#1, "The lock accepts a pointer whose code can change after the lock"). Confidence 80, leg 2's highest.
- **Severity:** leg 1 — · leg 2 —. **Adopted: Medium.** Only the owner can install such a pointer, so this is not an unprivileged attack. But `lock` exists to bind the owner: it is the one-way promise that the served document is frozen, and its NatSpec says it re-checks readability rather than trusting `setChunks`. An EIP-7702-delegated EOA passes that check, and its key holder can then change or clear the code. That breaks the promise without anyone seeing it. Low would understate that, and High would ignore that the owner is the precondition.
- **What:** a 7702 delegation designator (`0xef0100‖addr`, 23 bytes) has non-zero `code.length`. Once the lock is set, the key holder can re-delegate, which changes what `html` serves. Or they can clear the delegation. Leg 2 traces clearing to `lib/solady/src/utils/SSTORE2.sol:213`, where `extcodesize` 0 gives `n = 0xffffffffff`, so `html` runs out of gas for every caller.

### F5. Any caller can apply a superseded queued action after the newer one — Low

`src/Distribution.sol:205-216` (`applyQueued`; the only gate is `eta == 0 || block.timestamp < eta` at `:210`).

- **Found by:** leg 2 only (#2, "Any caller can apply an old queued action after a newer one"). Confidence 75.
- **Severity:** leg 1 — · leg 2 —. **Adopted: Low.** The rollup checked the mechanism against the code and it holds. However, it needs the owner to leave a superseded action queued, and the owner can drop it at once with `cancel` (`:219`, owner-only, no delay). The action is also visible in the pending list. The cost is real when the owner makes that mistake: a removed beneficiary applies the old `setBeneficiaries` and then `distribute`, in one transaction. That is why this is Low rather than informational.
- **What:** queued actions never expire and are not ordered by nonce. Whoever calls `applyQueued` picks the order. Leg 2 adds that a queued nomination and a later queued withdrawal (`transferOwnership(owner)`) have the same ordering exposure. This is **not** the closed F1 or F2 (§ 4). It needs no reentrancy and no ownership change.

### F6. An escrow for an account that cannot receive can never be released — Low

`src/Distribution.sol:164-179` (`release`). The retry goes through `_push` with `gas: PUSH_GAS` at `:360`, and `PUSH_GAS = 100_000` at `:56`.

- **Found by:** leg 2 only (#7, "An escrow for an account that cannot receive is locked forever"). Confidence 75.
- **Severity:** leg 1 — · leg 2 —. **Adopted: Low.** The loss is limited to the share of the account that cannot receive, and nobody else's funds are affected. No function moves `escrowed[token][account]` anywhere else, so that share stays stuck. Re-tabling only changes future distributions.
- **What:** leg 2 gives two mechanisms. (1) A recipient that needs more than 100k gas, for example a `receive` that writes 5 cold slots at about 110,500 gas, fails every retry, because the retry is the same capped call. (2) A token blacklist (USDC, USDT) on the account makes every token retry revert.

### F7. The last table row collects every per-call rounding remainder — Low

`src/Distribution.sol:150` (`i + 1 == n ? amount - paid : bps * amount / BPS_TOTAL`). The table is sorted by ascending address (`:291`), so the last row is always the same account.

- **Found by:** both. Leg 1 #2 ("Last beneficiary captures every per-call remainder"). Leg 2 #3 ("The last row takes the rounding of every small distribution").
- **Severity:** leg 1 Medium · leg 2 — (confidence 75). **Adopted: Low, not leg 1's Medium.** Leg 2's own arithmetic bounds the gain at n−1 base units per call. A row with `bps = b` gets zero only when `amount < 10000 / b`. So the last row profits only on low-decimal tokens with small, frequent deposits, and even then it pays gas on every call. Leg 1 gives no figure that would support Medium.
- **What:** the last row can call `distribute` after every small deposit, so rows with low bps round to zero and the last row takes their share. The behaviour is intended: the comment on `:149` says the remainder goes to the last row so the shares sum to `amount`. The finding is about an attacker exploiting it through timing.

### F8. A clone's `receive` can exceed the 2,300-gas stipend when the implementation is cold — Low

`src/Distribution.sol:133-137` (`receive`, `@dev` on `:133`). The proxy runtime is at `:423-426`.

- **Found by:** leg 2 only (#8, "A clone cannot receive ETH under the 2,300-gas stipend"). Confidence 70, **below leg 2's threshold of 75**, but listed in its Findings table under "Below Confidence Threshold". Leg 2 says it was "a hand trace and was not run".
- **Severity:** leg 1 — · leg 2 —. **Adopted: Low.** The payer is the one who fails: `transfer` reverts, or `send` returns false and the payer keeps the ETH. Nothing is lost, and the failure only happens when the implementation is cold in that transaction.
- **What:** the clone's `DELEGATECALL` into a cold implementation costs 2,600 gas under EIP-2929, which already exceeds the 2,300 stipend. The `@dev` on `:133` says the function "Must run under a 2,300-gas `transfer` stipend". Leg 2 words it as "cannot receive", which is too broad: when the implementation is warm, the body fits.

### Leads (leg 2 only, not scored)

Leg 2 listed these as leads, below the level of a finding, and this rollup carries them unchanged:

- **The owner cannot remove a widget once one is added.** `App.setWidgetChunks` (`src/App.sol:137`) rejects an empty list, although `lock` treats "no widget" as valid. This affects function only, not funds.
- **A nominee accepts before the owner can withdraw the nomination.** `acceptOwnership` (`src/Distribution.sol:256-263`) takes effect at once and calls `_clearQueue`, which drops a queued `transferOwnership(owner)` withdrawal. The withdrawal itself must wait out `delay`. Leg 2 classed this as owner trust.
- **The ERC-20 branch of `_push` copies all return data and forwards all gas** (`:369`). Leg 2 calls this the helper-level view of F1. It did not measure the return-data cost separately.
- **Withdrawing a nomination waits for the delay, but accepting does not** (`transferOwnership`, `:244-252`, `onlySelf`). This is the same asymmetry as the second lead, seen from the other side. Leg 2 reports it as owner trust only.

## 3. Agreement and disagreement

**Overlap: 3 of 8 distinct findings.** That is all of leg 1's findings and 3 of leg 2's 8. Both legs
found F1 (uncapped ERC-20 push), F2 (reserve above balance) and F7 (last-row rounding), at the same
lines (`:369`, `:142`, `:150`). They agreed on location and mechanism. They disagreed on severity
only for F7, as described above.

**Leg 1 only: none.**

**Leg 2 only: 5 (F3, F4, F5, F6, F8).** From the reports and the code, all five look like real misses
by leg 1, not false positives:

- F6 and F8 are the known-answer issues #95 and #18 (§ 4), so they are confirmed true positives.
- F5 holds against `:205-216`. The only thing in question is its severity.
- F4 is a sound mechanism, and its precondition is controlled by the owner.
- F3 is sound where it applies, and whether it applies depends on the chain.

The likely reason for the gap is how much each leg ran. Leg 1 ran 3 of the skill's 12 agents, with
each worker covering four specialty bundles. Leg 2 ran all 12, and its finding tags record 5–9
agents agreeing on several findings. Leg 1 lists no leads at all, which is consistent with less
coverage rather than a stricter filter.

**What this measures:** both legs, from different labs, agree on every finding leg 1 made. So each
of those three has two independent reads. The five leg-2-only findings have one read each. Of those
five, two (F6, F8) are separately confirmed by the known answer.

## 4. Grading against the known answer

The known answer lists six issues still present at `b0fb4e3`. The code given to the legs is
byte-identical in `src/Distribution.sol` (hash check in § 1).

| Known issue | Location / mechanism | Leg 1 (gpt-5.6-sol) | Leg 2 (claude-opus-5-5) |
| --- | --- | --- | --- |
| **#19** reserved > balance reverts `distribute` | `distribute`, checked subtraction `:142` | **Found** (#3, Medium, `:142`) | **Found** (#4, confidence 75, `:142`; correctly calls it a checked subtraction) |
| **#54** `propose` queues an action `applyQueued` will always revert | `propose` `:184`, no validation of `action` | **Missed** | **Missed** (its #2 is about `applyQueued` too, but the mechanism differs: a *valid*, superseded action applied out of order, not an invalid one left in the pending list) |
| **#95** escrow to a recipient that burns the push can never be released | `release` `:164`, same `PUSH_GAS` cap | **Missed** | **Found** (#7, confidence 75; mechanism (1) is exactly this one, and adds a blacklist variant) |
| **#18** `receive()` exceeds 2,300 stipend when implementation is cold | `receive` `:134`, cold `DELEGATECALL` 2,600 | **Missed** | **Found** (#8, confidence 70, **below its own reporting threshold**, hand trace not run) |
| **#22** CREATE2 collision in `create` burns forwarded gas before `DeploymentFailed` | `DistributionFactory.create` `:409`, `create2` `:426` | **Missed** | **Missed** |
| **F8 / #123** ERC-20 push passes no gas; hook recipient starves later rows | `_push` ERC-20 branch `:369` | **Found** (#1, Medium; overstated as blocking "every payout") | **Found** (#6, confidence 75; gives an arithmetic bound for the rows starved) |

**Score: leg 1 found 2 of 6. Leg 2 found 4 of 6** (one of the four below its own threshold). **Both
legs missed #54 and #22.** Leg 2 cited `:423-426` for the proxy runtime in F8, which is next to the
`create2` at `:426`, but it raised nothing about collisions there.

**Closed before this audit.** Neither leg reports any of #20, #61, #74, F1, F2 or F6 as still open.
Checked against the code:

- **F1 (reentrant `propose`/`applyQueued` mid-`distribute`):** neither leg raises it. Both functions carry `notLocked` (`:184`, `:205`). Leg 2's F5 is not a re-find of F1, because it needs no reentrancy.
- **F2 (queue outliving a handover/renounce):** neither leg raises it as open. `_clearQueue` (`:302`) is called from `acceptOwnership` (`:262`) and from the renounce branch (`:248`). Leg 2's second lead actually depends on the fix being present: it complains that `_clearQueue` drops the owner's own queued withdrawal. That is a consequence of the F2 fix, not evidence that the fix falls short.
- **F6 (unbounded ETH return-data copy):** neither leg raises it. Leg 2's third lead mentions the return-data copy on the **ERC-20** branch only, and explicitly calls the ETH branch capped. The known answer says the ERC-20 copy is kept by design, so this lead does not contradict the fix.
- **#20, #61, #74:** not raised by either leg.

## 5. Legs

**Leg 1: codex / gpt-5.6-sol** — [`pashov/solidity-auditor/gpt-5.6-sol/`](pashov/solidity-auditor/gpt-5.6-sol/).
This leg ran one pass, and `scope.tsv` records `pass_1_agents 3/12`. It produced **3 findings**, all
Medium at confidence 90, and no leads. It reported an orchestration limitation, quoted here verbatim
from `full-report.md`: *"This harness exposed only three worker slots, so it could not run the
skill's 12 audit agents simultaneously. Three independent workers covered all 12 specialty bundles
in groups of four."* `run-1.md` adds: "3/12 agents returned — this harness exposed three worker
slots, so each worker covered four specialty bundles."

**Leg 2: claude / claude-opus-5-5** — [`pashov/solidity-auditor/opus/`](pashov/solidity-auditor/opus/).
This leg ran one pass with all 12 agents (`pass_1_agents 12/12`). It produced **8 findings**: 7 at
confidence 75–80 and 1 at 70, below its threshold. It also produced **4 leads**. It reported no
orchestration limitation. It gave no severities, only confidence scores. It marked F8 as a hand trace
that was not run.
