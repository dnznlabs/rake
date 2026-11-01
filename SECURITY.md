# Security

> **Purpose:** Security posture for rake's contracts. It records what was reviewed and by what
> method, dispositions every finding and every carried issue, states the invariants the test suite
> holds, and says plainly what the review did not cover.

## Prior reviews

**Date:** 2026-10-31
**Method:** two-model agent review — in the method's own words, "several independent adversarial
reviews of the same code, captured separately, then reconciled"
([`audits/README.md`](audits/README.md) § What an audit here is, and is not). Two harnesses, two
labs, one pass each, reconciled by a third pass.
**Scope commit:** `b0fb4e3` (this PR's head, frozen before the review) — read by the legs in a
blinded tree at commit `b2ed0609293efb997771d80ee320a63d2921fd6f`, mapped in
[`audits/2026-10-31/BLIND.md`](audits/2026-10-31/BLIND.md)
**Scope:** `src/Distribution.sol`, `src/App.sol`, `scripts/forge/Deploy.s.sol`,
`scripts/forge/DeployApp.s.sol` ([`audits/SCOPE`](audits/SCOPE), with every exclusion and its
reason) — unchanged from the 2026-10-30 run per decision 29
**Result:** **4 Medium, 4 Low** — eight distinct issues, reduced by the rollup from eleven findings
raised across the two legs, with leg 2's four leads carried separately. Graded against a known
answer written before the run: leg 1 found 2 of 6, leg 2 found 4 of 6 (one of the four below its
own confidence threshold), and **both missed [#54](https://github.com/dnznlabs/rake/issues/54) and
[#22](https://github.com/dnznlabs/rake/issues/22)** — the same two the 2026-10-30 run missed, so
#22 has now been missed by four legs across two labs and two runs
([`AUDIT.md`](audits/2026-10-31/AUDIT.md) § 4).
**Full report:** [`audits/2026-10-31/AUDIT.md`](audits/2026-10-31/AUDIT.md)

**Leg independence was measured on this run, not assumed.** The 2026-10-30 breach — leg 2 reading
part of leg 1's harvested report — is closed: the runner stages each leg's harvest outside the tree,
and `--output-format stream-json` makes leg 2's reads recoverable for the first time. Leg 2's
transcript contains no reference to leg 1's harvest, leg 1's model, or the output directory
(`audits/2026-10-31/BLIND.md` § The 2026-10-30 breach is closed). The three findings both legs made
therefore have two genuinely independent reads each.

---

**Date:** 2026-10-30
**Method:** two-model agent review — in the method's own words, "several independent adversarial
reviews of the same code, captured separately, then reconciled"
([`audits/README.md`](audits/README.md) § What an audit here is, and is not). Two harnesses, two
labs, one pass each, reconciled by a third pass.
**Scope commit:** `ede55c3` (the merge of [#103](https://github.com/dnznlabs/rake/pull/103)) — read
by the legs in a blinded tree at commit `37eccc212fdb91b6a6db0900eef104130b0c8d42`, mapped in
[`audits/2026-10-30/BLIND.md`](audits/2026-10-30/BLIND.md)
**Scope:** `src/Distribution.sol`, `src/App.sol`, `scripts/forge/Deploy.s.sol`,
`scripts/forge/DeployApp.s.sol` ([`audits/SCOPE`](audits/SCOPE), with every exclusion and its
reason)
**Result:** **4 Medium, 5 Low, 1 Informational** — ten distinct issues, reduced by the rollup from
nineteen items raised across the two legs. Graded against a known answer written before the run:
leg 1 found 1 of 5, leg 2 found 3 of 5, both missed two, and neither raised anything in
`DistributionFactory` ([`AUDIT.md`](audits/2026-10-30/AUDIT.md) § 4).
**Full report:** [`audits/2026-10-30/AUDIT.md`](audits/2026-10-30/AUDIT.md)

**This is not an independent audit** and does not claim to be one. It is two language models from
two labs reading the same code; a commissioned human review is a separate, paid exercise. Per
decision 20, that paid review is an input to M05's go/no-go, not a gate on this milestone.

---

## Findings — disposition

**Two runs now feed this table, and each numbered its own findings from F1.** To keep one stable
identifier per issue, the rows keep the 2026-10-30 numbering (**F1–F10**, that run's `AUDIT.md`
order) and the three issues the 2026-10-31 run added are appended as **F11–F13**. Each row says
which run or runs raised it; the 2026-10-31 `AUDIT.md`'s own F-numbers are named in the cells that
refer to it, so neither numbering has to be guessed at.

**The arithmetic.** The two reports carry 10 + 8 = **18** findings. The 2026-10-31 rollup re-found
five of the 2026-10-30 issues — its F1 is this table's F8, its F2 is F4, its F6 is F5, its F7 is
F10, its F8 is F7 — leaving 18 − 5 = **13 rows**, which is what this table carries. One caveat is
recorded rather than folded in: the new run's F5 is, on the mechanism, this table's **F9** re-found
at a higher severity, which the rollup did not deduplicate because F9 was not in the known answer it
graded against. Under that reading the table would carry twelve rows. It is kept as its own row
(F13) with the overlap stated, because the severity change is a disposition question for the
architect rather than a bookkeeping one.

**Of the 2026-10-30 rows, three are fixed in this PR** — F1, F2 and F6, each with a test that pins
it — F8 is now ruled documented by decision 36, F7's open measurement is settled, F3 remains
`m03-t06`'s, and the rest are unchanged. **The three new rows were dispositioned at t05's close-out
(2026-11-01)**: F11 is D15 ([#126](https://github.com/dnznlabs/rake/issues/126), open, recommendation
a t07 before M04), F12 is carried as [#127](https://github.com/dnznlabs/rake/issues/127) with a
precondition for t06's runbook, and F13 is F9's mechanism, where "none needed" stands. No `src/`
byte moved after the freeze.

| ID | Severity | Contract change | Mitigation |
|---|---|---|---|
| F1 — reentrant `applyQueued` swaps the table mid-`distribute` | Medium | **fixed in this PR** (2026-10-30 run) | Was: `applyQueued` carried no guard while `distribute` did, so a hook-token beneficiary could apply a matured `setBeneficiaries` from inside the payout and the remaining rows paid from the new table. Both legs; leg 2 had a PoC. **Fixed** with a check-only `notLocked` modifier (`:110`) on `propose` (`:184`) and `applyQueued` (`:205`) — not `nonReentrant`, which would have cost a slot write on every call. Pinned by `test_applyQueuedRefusedDuringDistribute` and `test_proposeRefusedDuringDistribute`; both fail on `ede55c3` with "the reentrant applyQueued failed" / "the reentrant propose failed". The 2026-10-31 run raised nothing here, and the rollup checked that against the code rather than inferring it from silence (`audits/2026-10-31/AUDIT.md` § 4). |
| F2 — queued actions outlive a handover or a renounce | Medium | **fixed in this PR** (2026-10-30 run) | Was: the queue hash is `keccak256(action, nonce)` with no owner epoch, and neither `acceptOwnership` nor the renounce branch cleared `queued` or `_pending`, so a queued `transferOwnership` survived a handover and anyone could apply it — contradicting `transferOwnership`'s own NatSpec — and after a renounce nobody could `cancel` at all. Adopted Medium, not leg 1's High: the outgoing owner must have queued the action, a privileged precondition. **Fixed** by clearing the queue rather than epoching the hash: `_clearQueue()` (`:302`) from `acceptOwnership` (`:256`) and from the renounce branch (`:248`), emitting `Cancelled` per dropped action. Pinned by `test_acceptOwnershipClearsQueue`, `test_renounceClearsQueue` and `test_renounceFromApplyClearsTheRest` (the last proving the pop loop and the executing action's prior `_remove` do not collide); all three fail on `ede55c3`. **Positive evidence the 2026-10-31 legs read the fixed code:** leg 2's second lead depends on the fix being present — it complains that `_clearQueue` drops the owner's *own* queued `transferOwnership(owner)` withdrawal, a consequence of the fix rather than a gap in it. |
| F3 — `DeployApp` owner defaults to Foundry's default sender | Medium | **accepted → m03-t06** (deploy script, not a contract; the row said t05 until the 2026-11-01 close-out — t05 touched `src/` only) | Verified in source: `scripts/forge/DeployApp.s.sol:11` evaluates `vm.envOr("OWNER", msg.sender)` before `vm.startBroadcast()` at `:14`, so with no `OWNER` the owner is Foundry's `DEFAULT_SENDER` rather than the broadcaster — and the comment at `:8` asserts "defaults to the broadcaster". The documented command at `:7` passes no `--sender`. `Deploy.s.sol` does not share the shape. Nothing under `src/` changes and no bytecode re-check is implied; a redeploy fixes an affected `App`. |
| F4 — `reserved[token]` above the balance blocks `distribute` and `release` | Medium | none needed — decision 23 | Carried [#19](https://github.com/dnznlabs/rake/issues/19). `:135` is a **checked** subtraction — there is no `unchecked` block in the file — so a balance that falls below `reserved` reverts `distribute` for that token and blocks full `release`. Decision 23 rules this documented with one line of owner guidance rather than saturated; see § Carried issues. **Re-found by both legs on 2026-10-31 as that run's F2**, at the same line, leg 2 correctly calling it a checked subtraction and adding a worked example (stETH, reserved 10e18, balance 11e18, then a 10% slash). The disposition is unchanged. |
| F5 — an escrow whose recipient cannot take the push can never be released | Low (lead) | none needed — decisions 25 and 6 | Carried [#95](https://github.com/dnznlabs/rake/issues/95). `release` (`:157`) retries through the same `_push` under the same `PUSH_GAS` (`:56`), so a recipient that always burns the push never receives its escrow and the value stays counted in `reserved`. The owner's remedy is a re-table (decision 6). **Re-found by leg 2 on 2026-10-31 as that run's F6**, promoted there from a lead to a Low finding, with two mechanisms: a recipient whose `receive` writes five cold slots (about 110,500 gas) exceeds `PUSH_GAS` on every retry, and a token blacklist (USDC, USDT) on the account makes every token retry revert. The second is new detail on a known shape; the disposition is unchanged. |
| F6 — the ETH push copies unbounded return data on every failure | Low | **fixed in this PR** (2026-10-30 run) | Was: the ETH branch's `(ok, data) = to.call{value: amount, gas: PUSH_GAS}("")` copied all return data inside the `distribute` loop, so hostile rows grew memory without bound — leg 2 measured 10.6M gas at k=10 reverting rows and 35.3M at k=20, which bounded the table tighter than m03-t01 had measured. **Fixed** by keeping the return data only where decision 24 needs it: `_push` takes a `keepData` flag, true on the `release` retry and false in the `distribute` loop (`:359-366`). **Measured on this branch: 20 bloating rows cost 2,580,004 gas against 34,082,275 on `ede55c3` — a 13.2× reduction**, which independently corroborates leg 2's 35.3M at k=20 within 3.5% on a different harness. The cap was re-derived rather than re-asserted and **stays at 107**: at the cap, burner rows cost 14,889,178 gas and bloating rows 14,181,801, both under half a 30M block, so the burner is still the worst case. Pinned by `test_distributeDiscardsEthReturnData` (under 3,000,000 gas for 20 rows; fails on `ede55c3` at 34,082,275) and `test_releaseStillBubblesEthReason`, which guards the other side — decision 24 still bubbles a real reason from an ETH recipient. The ERC-20 branch's copy is kept by design. The 2026-10-31 run's leg 2 names the return-data copy on the **ERC-20** branch only and explicitly calls the ETH branch capped, which is this fix as designed. |
| F7 — `receive()` cannot run under a 2,300-gas stipend when the implementation is cold | Low | none needed — [#18](https://github.com/dnznlabs/rake/issues/18), criterion 5 | Carried #18, documented: the stipend holds while the implementation is warm, and a cold `DELEGATECALL` adds 2,600 — now qualified in `docs/brainstorming/PROJECT_OVERVIEW.md`. No funds are lost; `transfer` reverts and `send` leaves the ETH with the payer. **The open measurement is settled: 1,662 gas, warm**, read off the `receive()` frame of `test_receiveUnderStipend`'s trace (`forge test --mt test_receiveUnderStipend -vvvv`, devbox-pinned forge 1.7.1-dev) — the clone frame the 2,300 stipend must cover, with the inner delegatecall frame at 1,513. That **agrees with m01-t01's 1,662 to the gas**, so leg 2's "about 4,200 even warm" is not adopted. The likely cause of leg 2's figure is in its own report: it states that a clone's `DELEGATECALL` into a *cold* implementation costs 2,600 on its own, and 1,662 + 2,600 = 4,262 ≈ "about 4,200", so the cold figure appears to have been labelled warm. The cold case is unchanged and is the one that actually fails the stipend — the case criterion 5's qualifier already covers. **Re-found by leg 2 on 2026-10-31 as that run's F8**, at confidence 70, below its own reporting threshold and marked a hand trace that was not run. |
| F8 — uncapped gas on the ERC-20 push lets a hook token grief `distribute` | Medium (2026-10-31) · Low (lead) as first raised | **documented, not capped — decision 36** ([#123](https://github.com/dnznlabs/rake/issues/123)) | The ERC-20 branch of `_push` (`:369`) passes no gas argument while the ETH branch is capped by `PUSH_GAS`, so a hook beneficiary consumes 63/64 of the remaining frame and leaves too little for later rows' escrow writes. **The shape needs two things together: a hook token** (ERC-777-style `transfer` callbacks, a non-goal in the overview, and neither leg found one reaching the contract) **and an owner-chosen hostile row.** Its effect is that `distribute(token)` for that token cannot be mined at all; **the owner's remedy is a re-table through the delay, and nothing is lost.** **Sized in this task: `distribute` reverts at 95,048,000 gas and first succeeds at 95,049,000** — over 3× a 30M block — asserted by `test_hookRecipientStarvesLaterRows`. Bisected one gas limit per transaction, because several near-95M attempts in one transaction starve each other through EIP-150's 63/64 rule and report a position artefact. Ruled option 1 by Denizen on 2026-10-31 as **decision 36**; a `gas: PUSH_GAS` cap was rejected because an honest token whose `transfer` needs more — a proxied token with pause and blocklist checks on cold slots, a rebasing or reward-bearing token — would be escrowed on every push and never releasable under the same cap, which is the #95 shape made permanent for a compliant token. **The gas a real ERC-20 `transfer` needs against the cap is unmeasured here** and is not claimed: `MockERC20` is not evidence. **Re-found by both legs on 2026-10-31 as that run's F1**, which is consistent with documenting rather than capping it. |
| F9 — queued actions never expire, and any caller chooses the order | Low (lead) | none needed — `test_cancelThenApplyReverts` | `queued[hash]` carries no expiry, so if two `setBeneficiaries` are both matured any caller can apply the older one last. The owner controls what is queued, and `cancel` (`:210`) is owner-only and **immediate** — its NatSpec: "the delay guards applying, not cancelling" — so a stale action can be dropped before it matters. The residual, that nobody can cancel after a renounce, is F2's row rather than a second change. **Raised again by leg 2 on 2026-10-31, as that run's F5, at Low rather than as a lead** — see F13, which carries that row. **Reconciled 2026-11-01 at t05's close-out: "none needed" stands at Low.** The cost F13 names — a removed beneficiary applies the older table it was still in, then `distribute` — needs two matured `setBeneficiaries` in the queue at once, which only the owner can put there and which `cancel` drops immediately; the mitigation is unchanged, and two reviews flagging the shape is recorded here rather than answered with an expiry or a nonce order. |
| F10 — the last row collects every row's rounding remainder | Informational (lead) | **rejected** — intended design | Not a defect: `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 decides "Basis points, sum = 10,000, last recipient takes the remainder. No dust", and `test_rounding_3333_3333_3334` asserts it. Leg 2's own bound is at most n−1 base units per call, and leg 2 demoted the item to a lead itself. **Re-found by both legs on 2026-10-31 as that run's F7**, where leg 1 called it Medium and the rollup adopted Low instead, on leg 2's own arithmetic: a row with `bps = b` gets zero only when `amount < 10000 / b`, so the last row profits only on low-decimal tokens with small, frequent deposits and pays gas on every call. The rejection stands — the behaviour is the overview's decision, and the table is sorted ascending so the last row is a known, fixed account. |
| F11 — `App.lock` accepts a code pointer whose code can change after the lock | Medium | **accepted → D15, [#126](https://github.com/dnznlabs/rake/issues/126)** (open; recommendation: a t07 before M04, a first-code-byte `0x00` check in `lock`) | New on 2026-10-31 (that run's **F4**, leg 2 only, confidence 80 — its highest). `lock` (`src/App.sol:158-170`, checks at `:162` and `:166`) admits a pointer on the same `code.length` test `setChunks` (`:118`) and `setWidgetChunks` (`:140`) use. **An EIP-7702 delegation designator (`0xef0100‖addr`, 23 bytes) has non-zero `code.length`, so it passes**, and its key holder can then re-delegate — changing what `html` serves after the lock — or clear the delegation, which leg 2 traces to `lib/solady/src/utils/SSTORE2.sol:213`, where an `extcodesize` of 0 yields `n = 0xffffffffff` and `html` runs out of gas for every caller. Only the owner can install such a pointer, so this is not an unprivileged attack; but `lock` exists precisely to bind the owner, and its NatSpec says it re-checks readability rather than trusting `setChunks`. Adopted Medium on that reasoning. **This is in `src/App.sol`, whose bytes were byte-identical in the 2026-10-30 run and raised by neither leg then** (`audits/2026-10-31/BLIND.md` § The mapping). No change in this PR: per § Out of scope a finding wanting a contract change is a stop, and the architect decides whether a t07 opens. |
| F12 — a second token address for the native balance pays escrowed ETH out again | Medium (chain-dependent) | **accepted → carried as [#127](https://github.com/dnznlabs/rake/issues/127)**; m03-t06's runbook checks each target chain for a native-balance or double-entry-point token before the first deploy | New on 2026-10-31 (that run's **F3**, leg 2 only, confidence 75). `reserved` is keyed by token address (`:87`), so `distribute(address(0))` escrows a row's share in `reserved[address(0)]`, and `distribute(alias)` then reads the same native balance, subtracts `reserved[alias] = 0`, and pays the escrowed amount to the table a second time; `release(address(0), …)` afterwards fails because the balance is short. Any caller can do it, so **where it applies the impact looks High** — but it needs a chain where an ERC-20 moves the native balance (leg 2 names Celo's GoldToken) or a double-entry-point token, and the scope deploys to `$RPC` (`scripts/forge/Deploy.s.sol:7`) and names no chain, so High is not established for this code as given. **If rake deploys to such a chain, treat it as High.** Recorded for completeness: leg 2's proposed fix refers to a `NATIVE_ALIAS` constant that **does not exist** in the code — that is its proposal, not the mechanism. |
| F13 — any caller can apply a superseded queued action after the newer one | Low | **none needed — F9's disposition, reconciled 2026-11-01** (`test_cancelThenApplyReverts`) | Raised on 2026-10-31 as that run's **F5** (leg 2 only, confidence 75). Queued actions never expire and are not ordered by nonce; the only gate in `applyQueued` (`:205-216`) is `eta == 0 || block.timestamp < eta` (`:210`), so whoever calls it picks the order. A beneficiary removed by a newer table can apply the older `setBeneficiaries` it was still listed in and then `distribute`, in one transaction. The rollup checked the mechanism against the code and it holds, and confirmed it is **not** a re-find of the fixed F1 or F2: it needs no reentrancy and no ownership change. **On the mechanism this is F9 re-found** — same no-expiry, no-ordering property, same mitigation that `cancel` (`:219`) is owner-only and immediate — which the rollup did not deduplicate because F9 was not among the six issues in the known answer it graded against. What is new is the severity and a concrete cost, where F9 was dispositioned "none needed". **The open question is therefore whether F9's disposition changes, not whether the mechanism is real**; that is the architect's call, and nothing here is changed in this PR. |

---

## Carried issues — disposition

Every issue carried into this milestone, what was decided, and where the ruling is. The "found by"
column records which leg reported it, from `AUDIT.md`'s grading section.

| Issue | Decided | Where the ruling is | Found by |
|---|---|---|---|
| [#18](https://github.com/dnznlabs/rake/issues/18) — `receive()` over the 2,300-gas stipend | Documented, not changed. It holds while the implementation is warm: 1,662 gas warm with the event, 250 without, about 2,750 cold. A contract paying in with `transfer`/`send` can therefore fail. | m01-t01's measurements; criterion 5's qualifier, now in [`docs/brainstorming/PROJECT_OVERVIEW.md`](docs/brainstorming/PROJECT_OVERVIEW.md) | **leg 2 only**, with a PoC — F7; 2026-10-31: leg 2 only again, below its own threshold |
| [#19](https://github.com/dnznlabs/rake/issues/19) — `reserved[token]` can exceed the balance | Documented, with one line of owner guidance. | decision 23 | **both legs** (leg 1 scored, leg 2 as a lead) — F4; 2026-10-31: both legs again |
| [#20](https://github.com/dnznlabs/rake/issues/20) — `ReleaseFailed` | Closed by [#103](https://github.com/dnznlabs/rake/pull/103). | decision 24 | neither leg reported it as open, which is correct — it is closed |
| [#22](https://github.com/dnznlabs/rake/issues/22) — CREATE2 collision in `create` burns forwarded gas | Documented. About 1.04 billion gas in the harness; the dapp refuses via `eth_getCode` (M02 criterion 4), and t06 adds the per-chain `cast code` step. Stays open for t06. | m01-t02's measurement; M02 criterion 4 | **missed by both legs**, on both runs — four legs, zero finds |
| [#23](https://github.com/dnznlabs/rake/issues/23) — the creator key is the address | Documented; t06 carries the sentence. Stays open for t06. | decisions 10 and 32 | n/a |
| [#54](https://github.com/dnznlabs/rake/issues/54) — `propose` queues an action `applyQueued` always reverts | Documented, not changed. | decision 25 | **missed by both legs**, on both runs — four legs, zero finds |
| [#61](https://github.com/dnznlabs/rake/issues/61) — `_push`'s comment | Closed by [#103](https://github.com/dnznlabs/rake/pull/103). | decision 26 | neither leg reported it as open, which is correct — it is closed |
| [#74](https://github.com/dnznlabs/rake/issues/74) — two-step ownership | Closed by [#103](https://github.com/dnznlabs/rake/pull/103). | decision 21 | neither leg reported it as open, which is correct — it is closed |
| [#95](https://github.com/dnznlabs/rake/issues/95) — an escrow to a recipient that burns the push can never be released | Documented. A known shape beside decision 25's: an escrow is recoverable only if the recipient becomes payable; the owner's remedy is a re-table. | decision 25, with decision 6 for the re-table | **leg 2 only**, as a lead — F5; 2026-10-31: leg 2 only again, scored |
| [#111](https://github.com/dnznlabs/rake/issues/111) — the handover's two halves leave different traces | Documented. `acceptOwnership` emits `OwnershipTransferred`; `renounceOwnership` does not, so a renounce is invisible to indexers and to the dapp's event-derived history, and is observable only through `snapshot()`. **Not an invariant**, since no test asserts the absence of an event. | decision 21 and m03-t02's deviation 11; added as a tenth row at t03's review by [#112](https://github.com/dnznlabs/rake/pull/112) | not raised by either leg; it was not in the known answer, so it is not graded |

---

## Invariants the suite holds

From `forge test --list` on `b0fb4e3`: **72 tests** in five suites — `DistributionTest` 39,
`AppTest` 22, `DistributionFactoryTest` 5, `PushGasTest` 3, `TableCapTest` 3. Grouped by the
property each group holds. A property asserted by a test is stronger than a finding: a finding gets
fixed once, a test refuses to let it come back.

The nine tests this PR adds are marked **new**. They were reconciled against `forge test --list`
with a two-way `comm` in both directions: the nine below are the only names the suite has that this
section did not, and **every name this section already carried still exists**.

**The table** — shares sum to 10,000, strictly ascending, no zero share, at most 107 rows, and the
cap holds for the worst-case row kind rather than for one measured kind.

`test_tableValidation`, `test_rounding_3333_3333_3334`, `test_tableCapBoundary`,
`test_capRowsStayUnderHalfABlock`, `test_perRowAndFixedCost`,
`test_capBloatingRowsStayUnderHalfABlock` (**new** — re-derives the cap for return-data bloating
rows, the kind F6 made cheaper, and confirms the gas burner is still the worst case at 107) —
6 tests.

**The owner** — configuration setters are `onlySelf`; transfer is two-step (propose, then accept by
the pending owner alone); renounce is immediate and clears any pending owner; at most one pending
owner at a time; **and a handover or a renounce carries no queued action into the new state.**

`test_settersOnlySelf`, `test_transferOwnershipIsPending`, `test_acceptOwnershipByPendingOwner`,
`test_acceptOwnershipByOtherReverts`, `test_renounceFreezes`,
`test_renounceStillImmediateAndClearsPending`, `test_transferToCurrentOwnerWithdrawsPending`,
`test_cancelQueuedTransferLeavesPendingOwner`, `test_pendingIterable`,
`test_nonOwnerCannotProposeOrCancel`, and `test_onlyOwner` on `App`,
`test_acceptOwnershipClearsQueue` (**new**), `test_renounceClearsQueue` (**new**),
`test_renounceFromApplyClearsTheRest` (**new**) — 14 tests.

**The delay** — a queued action is not applicable until its eta; it can be cancelled before it is
applied; a zero delay applies inline; shortening the delay does not shortcut something already
queued; a failed apply leaves the action queued; **and the queue cannot be read or written while a
payout is running.**

`test_cancelThenApplyReverts`, `test_delayZeroAppliesInline`,
`test_setDelayZeroDoesNotShortcutQueued`, `test_applyFailureKeepsQueued`,
`test_applyQueuedRefusedDuringDistribute` (**new**), `test_proposeRefusedDuringDistribute`
(**new**) — 6 tests.

**The money paths** — distribution and release are `nonReentrant`; each push is bounded by
`PUSH_GAS`; a push that fails escrows rather than reverting the whole distribution; `reserved` is
never paid twice; odd-but-real tokens behave.

`test_reentrantRecipientIsEscrowed`, `test_escrowRevertingEthRecipientOthersPaid`,
`test_releaseFailedEthRecipient`, `test_releaseBubblesJustOverThreshold`,
`test_releaseBubblesLongReason`, `test_releaseFailedNamesBareWord`,
`test_distributeReleaseDistributeKeepsReserved`, `test_receiveUnderStipend`,
`test_receiveMinimaAreUnderPushGas`, `test_realPathPaysASafeAndAVaultClone`,
`test_vaultCloneDelegateCallIsReal`, `test_usdtStyleNoReturnToken`, `test_nftTransferReverts`,
`test_hookTokenDistributeIsLocked`, `test_hookTokenReleaseIsLocked`,
`test_implementationRejectsEth`, `test_distributeDiscardsEthReturnData` (**new** — a failed ETH
push costs the distribution nothing in return data), `test_releaseStillBubblesEthReason` (**new** —
and `release` still bubbles the recipient's real reason, decision 24),
`test_hookRecipientStarvesLaterRows` (**new** — sizes F8's grief at 95,049,000 gas) — 19 tests.

**The factory** — salts are sender-bound, so an address cannot be front-run; the same salt yields
the same address on every chain; `init` succeeds once and only from the factory.

`test_saltFrontRunningRejected`, `test_create2AddressStableAcrossChains`, `test_createEmitsAndInits`,
`test_createForwardsValue`, `test_factoryRejectsEth`, `test_initOnlyFactoryAndOnce` — 6 tests.

**The published document** — `App`'s chunk pointers must hold code, the document and widget are
locked together, and a locked document is immutable.

The remaining 21 `AppTest` tests: `test_gzipBootstrap`, `test_lock`,
`test_lockAcceptsDappWithoutWidget`, `test_lockAcceptsReadableDocument`, `test_lockCoversWidget`,
`test_lockRejectsCodelessPointer`, `test_lockRejectsCodelessWidgetPointer`,
`test_lockRejectsEmptyDocument`, `test_rawChunksConcat`, `test_requestRoot`, `test_requestWidget`,
`test_requestWidgetAbsent`, `test_setChunksAcceptsValidPointers`,
`test_setChunksRejectsCodelessPointer`, `test_setChunksRejectsCodelessPointerAmongValidOnes`,
`test_setChunksRejectsEmptyList`, `test_setWidgetChunksAcceptsValidPointers`,
`test_setWidgetChunksRejectsCodelessPointer`, `test_setWidgetChunksRejectsEmptyList`,
`test_uncompressedBranchEmitsNoBootstrap`, `test_widgetIsNeverWrapped` — 21 tests.

6 + 14 + 6 + 19 + 6 + 21 = **72**, the whole suite.

---

## What the review did not cover

- **`app/` and the widget.** Not Solidity; the dapp was signed off in M02 Phase 5, and a UI change
  after this review is a second review (decision 14). `src/App.sol` — the on-chain contract — *was*
  in scope; the front end was not.
- **`scripts/forge/Chunks.s.sol`, `Fixtures.s.sol`, `Seed.s.sol`.** Owner-run on a dev chain, never
  shipped (decision 29).
- **`lib/`.** `forge-std` and `solady` are dependencies we did not write, pinned by tag.
- **The gateway and name resolution.** M04's work, not yet written.
- **ERC-1363.** Out of scope by decision 28.
- **The method's own limit, quoted from [`audits/README.md`](audits/README.md) § Known limits:**
  "Two legs from two labs is the whole independence claim. Both are language models trained on
  overlapping public Solidity; correlated blind spots are likely and unmeasured. The mitigation is
  method diversity — property tests, a static analyser, a human reading the diff — not more models."
- **Leg independence on the 2026-10-30 run was not clean; on the 2026-10-31 run it was.** In the
  first run leg 2's second agent read part of leg 1's harvested report inside the tree it ran in
  ([`audits/2026-10-30/BLIND.md`](audits/2026-10-30/BLIND.md) § The one breach), so F3's two-lab
  agreement is discounted and that run counts three clean agreements, not four. The harvest order
  that allowed it was fixed upstream in the fragment (shared `c12e188`), the second run was the
  fix's first real run and measured clean from leg 2's `stream-json` transcript, and
  [#119](https://github.com/dnznlabs/rake/issues/119) was dropped at t05's close-out.

---

## The reviewed commit

The current review reads **`b0fb4e3`**, this PR's head, frozen at step 9 before the review ran and
unchanged under `src/` since. Per milestone criterion 4, what `SECURITY.md` names must be the commit
`main` carries when M03 closes, or an ancestor whose diff to it touches nothing under `src/`. When
this PR merges, the merge commit is a descendant of `b0fb4e3` whose diff to it touches nothing under
`src/`, which is the allowance criterion 4 makes; the handoff names both commits.

The 2026-10-30 review read `ede55c3`, and that remains true of that entry: `git diff --stat ede55c3
origin/main -- src/` printed nothing at the time it was written. `b0fb4e3` supersedes it as the
reviewed commit, because it is the one carrying the three fixes.
