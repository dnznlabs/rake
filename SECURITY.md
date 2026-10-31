# Security

> **Purpose:** Security posture for rake's contracts. It records what was reviewed and by what
> method, dispositions every finding and every carried issue, states the invariants the test suite
> holds, and says plainly what the review did not cover.

## Prior reviews

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

`AUDIT.md` carries **ten** findings; this table carries **ten** rows, in `AUDIT.md`'s order. No code
moves in this task. **Five are accepted as changes for `m03-t05`, so t05 stands** — F1, F2, F3, F6
and F8; four need no change and one is rejected.

| ID | Severity | Contract change | Mitigation |
|---|---|---|---|
| F1 — reentrant `applyQueued` swaps the table mid-`distribute` | Medium | **accepted → m03-t05** | `applyQueued` (`:196`) carries no `nonReentrant` while `distribute` (`:134`) does, so a hook-token beneficiary can apply a matured `setBeneficiaries` from inside the payout and the remaining rows pay from the new table. Both legs; leg 2 has a PoC. t05 adds the guard or snapshots the table, with a test. Leg 2 measured `applyQueued` at 86.6k–141.7k gas, above `PUSH_GAS` (100,000), so the ETH path generally cannot carry it — the ERC-20 hook path can. |
| F2 — queued actions outlive a handover or a renounce | Medium | **accepted → m03-t05** | The queue hash is `keccak256(action, nonce)` with no owner epoch, and neither `acceptOwnership` (`:245`) nor the renounce branch (`:235`) clears `queued` or `_pending`, so a queued `transferOwnership` survives and anyone may apply it — contradicting `transferOwnership`'s own NatSpec. After a renounce nobody can `cancel` at all. Adopted Medium, not leg 1's High: the outgoing owner must have queued the action, which is a privileged precondition. |
| F3 — `DeployApp` owner defaults to Foundry's default sender | Medium | **accepted → m03-t05** (deploy script, not a contract) | Verified in source: `scripts/forge/DeployApp.s.sol:11` evaluates `vm.envOr("OWNER", msg.sender)` before `vm.startBroadcast()` at `:14`, so with no `OWNER` the owner is Foundry's `DEFAULT_SENDER` rather than the broadcaster — and the comment at `:8` asserts "defaults to the broadcaster". The documented command at `:7` passes no `--sender`. `Deploy.s.sol` does not share the shape. Nothing under `src/` changes and no bytecode re-check is implied; a redeploy fixes an affected `App`. |
| F4 — `reserved[token]` above the balance blocks `distribute` and `release` | Medium | none needed — decision 23 | Carried [#19](https://github.com/dnznlabs/rake/issues/19). `:135` is a **checked** subtraction — there is no `unchecked` block in the file — so a balance that falls below `reserved` reverts `distribute` for that token and blocks full `release`. Decision 23 rules this documented with one line of owner guidance rather than saturated; see § Carried issues. |
| F5 — an escrow whose recipient cannot take the push can never be released | Low (lead) | none needed — decisions 25 and 6 | Carried [#95](https://github.com/dnznlabs/rake/issues/95). `release` (`:157`) retries through the same `_push` under the same `PUSH_GAS` (`:56`), so a recipient that always burns the push never receives its escrow and the value stays counted in `reserved`. The owner's remedy is a re-table (decision 6). |
| F6 — the ETH push copies unbounded return data on every failure | Low | **accepted → m03-t05** | `:321`'s `(ok, data) = to.call{value: amount, gas: PUSH_GAS}("")` copies all return data inside the `distribute` loop, so hostile rows grow memory without bound: leg 2 measured 10.6M gas at k=10 reverting rows and 35.3M at k=20. **This bounds the table tighter than m03-t01 measured**: the "at most 107 rows, under half a 30M block" property fails at about k=11, and a full 30M block at about k=18. t05 discards the return data and re-measures the cap. |
| F7 — `receive()` cannot run under a 2,300-gas stipend when the implementation is cold | Low | none needed — [#18](https://github.com/dnznlabs/rake/issues/18), criterion 5 | Carried #18, documented: the stipend holds while the implementation is warm, and a cold `DELEGATECALL` adds 2,600 — now qualified in `docs/brainstorming/PROJECT_OVERVIEW.md`. No funds are lost; `transfer` reverts and `send` leaves the ETH with the payer. **One measurement is open**: leg 2's second agent reports about 4,200 gas even warm, against m01-t01's 1,662 warm with the event and 250 without. `AUDIT.md` asks for confirmation at triage, and the figure should not be re-quoted until one instrument is settled. |
| F8 — uncapped gas on the ERC-20 push lets a hook token grief `distribute` | Low (lead) | **accepted → m03-t05** | The ERC-20 branch of `_push` (`:325`) passes no gas argument while the ETH branch is capped by `PUSH_GAS`, so a hook beneficiary can consume 63/64 of the remaining gas and leave too little for later rows' escrow writes. Unproven: leg 2 found no such token reaching the contract. t05 sizes it and weighs the tradeoff — a gas cap on ERC-20 `transfer` can break compliant tokens that legitimately need more. |
| F9 — queued actions never expire, and any caller chooses the order | Low (lead) | none needed — `test_cancelThenApplyReverts` | `queued[hash]` carries no expiry, so if two `setBeneficiaries` are both matured any caller can apply the older one last. The owner controls what is queued, and `cancel` (`:210`) is owner-only and **immediate** — its NatSpec: "the delay guards applying, not cancelling" — so a stale action can be dropped before it matters. The residual, that nobody can cancel after a renounce, is F2's row rather than a second change. |
| F10 — the last row collects every row's rounding remainder | Informational (lead) | **rejected** — intended design | Not a defect: `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 decides "Basis points, sum = 10,000, last recipient takes the remainder. No dust", and `test_rounding_3333_3333_3334` asserts it. Leg 2's own bound is at most n−1 base units per call, and leg 2 demoted the item to a lead itself. |

---

## Carried issues — disposition

Every issue carried into this milestone, what was decided, and where the ruling is. The "found by"
column records which leg reported it, from `AUDIT.md`'s grading section.

| Issue | Decided | Where the ruling is | Found by |
|---|---|---|---|
| [#18](https://github.com/dnznlabs/rake/issues/18) — `receive()` over the 2,300-gas stipend | Documented, not changed. It holds while the implementation is warm: 1,662 gas warm with the event, 250 without, about 2,750 cold. A contract paying in with `transfer`/`send` can therefore fail. | m01-t01's measurements; criterion 5's qualifier, now in [`docs/brainstorming/PROJECT_OVERVIEW.md`](docs/brainstorming/PROJECT_OVERVIEW.md) | **leg 2 only**, with a PoC — F7 |
| [#19](https://github.com/dnznlabs/rake/issues/19) — `reserved[token]` can exceed the balance | Documented, with one line of owner guidance. | decision 23 | **both legs** (leg 1 scored, leg 2 as a lead) — F4 |
| [#20](https://github.com/dnznlabs/rake/issues/20) — `ReleaseFailed` | Closed by [#103](https://github.com/dnznlabs/rake/pull/103). | decision 24 | neither leg reported it as open, which is correct — it is closed |
| [#22](https://github.com/dnznlabs/rake/issues/22) — CREATE2 collision in `create` burns forwarded gas | Documented. About 1.04 billion gas in the harness; the dapp refuses via `eth_getCode` (M02 criterion 4), and t06 adds the per-chain `cast code` step. Stays open for t06. | m01-t02's measurement; M02 criterion 4 | **missed by both legs** |
| [#23](https://github.com/dnznlabs/rake/issues/23) — the creator key is the address | Documented; t06 carries the sentence. Stays open for t06. | decisions 10 and 32 | n/a |
| [#54](https://github.com/dnznlabs/rake/issues/54) — `propose` queues an action `applyQueued` always reverts | Documented, not changed. | decision 25 | **missed by both legs** |
| [#61](https://github.com/dnznlabs/rake/issues/61) — `_push`'s comment | Closed by [#103](https://github.com/dnznlabs/rake/pull/103). | decision 26 | neither leg reported it as open, which is correct — it is closed |
| [#74](https://github.com/dnznlabs/rake/issues/74) — two-step ownership | Closed by [#103](https://github.com/dnznlabs/rake/pull/103). | decision 21 | neither leg reported it as open, which is correct — it is closed |
| [#95](https://github.com/dnznlabs/rake/issues/95) — an escrow to a recipient that burns the push can never be released | Documented. A known shape beside decision 25's: an escrow is recoverable only if the recipient becomes payable; the owner's remedy is a re-table. | decision 25, with decision 6 for the re-table | **leg 2 only**, as a lead — F5 |
| [#111](https://github.com/dnznlabs/rake/issues/111) — the handover's two halves leave different traces | Documented. `acceptOwnership` emits `OwnershipTransferred`; `renounceOwnership` does not, so a renounce is invisible to indexers and to the dapp's event-derived history, and is observable only through `snapshot()`. **Not an invariant**, since no test asserts the absence of an event. | decision 21 and m03-t02's deviation 11; added as a tenth row at t03's review by [#112](https://github.com/dnznlabs/rake/pull/112) | not raised by either leg; it was not in the known answer, so it is not graded |

---

## Invariants the suite holds

From `forge test --list` on `ede55c3`: **63 tests** in five suites — `DistributionTest` 31,
`AppTest` 22, `DistributionFactoryTest` 5, `PushGasTest` 3, `TableCapTest` 2. Grouped by the
property each group holds. A property asserted by a test is stronger than a finding: a finding gets
fixed once, a test refuses to let it come back.

**The table** — shares sum to 10,000, strictly ascending, no zero share, at most 107 rows.

`test_tableValidation`, `test_rounding_3333_3333_3334`, `test_tableCapBoundary`,
`test_capRowsStayUnderHalfABlock`, `test_perRowAndFixedCost` — 5 tests.

**The owner** — configuration setters are `onlySelf`; transfer is two-step (propose, then accept by
the pending owner alone); renounce is immediate and clears any pending owner; at most one pending
owner at a time.

`test_settersOnlySelf`, `test_transferOwnershipIsPending`, `test_acceptOwnershipByPendingOwner`,
`test_acceptOwnershipByOtherReverts`, `test_renounceFreezes`,
`test_renounceStillImmediateAndClearsPending`, `test_transferToCurrentOwnerWithdrawsPending`,
`test_cancelQueuedTransferLeavesPendingOwner`, `test_pendingIterable`,
`test_nonOwnerCannotProposeOrCancel`, and `test_onlyOwner` on `App` — 11 tests.

**The delay** — a queued action is not applicable until its eta; it can be cancelled before it is
applied; a zero delay applies inline; shortening the delay does not shortcut something already
queued; a failed apply leaves the action queued.

`test_cancelThenApplyReverts`, `test_delayZeroAppliesInline`,
`test_setDelayZeroDoesNotShortcutQueued`, `test_applyFailureKeepsQueued` — 4 tests.

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
`test_implementationRejectsEth` — 16 tests.

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

5 + 11 + 4 + 16 + 6 + 21 = **63**, the whole suite.

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
- **Leg independence on this run was not clean.** Leg 2's second agent read part of leg 1's
  harvested report inside the tree it ran in
  ([`audits/2026-10-30/BLIND.md`](audits/2026-10-30/BLIND.md) § The one breach), so F3's two-lab
  agreement is discounted and the run counts three clean agreements, not four; the harvest order
  that allows it is carried as [#119](https://github.com/dnznlabs/rake/issues/119).

---

## The reviewed commit

The review reads `ede55c3`. Per milestone criterion 4, what `SECURITY.md` names must be the commit
`main` carries when M03 closes, or an ancestor whose diff to it touches nothing under `src/`.
`ede55c3` is that ancestor: `git diff --stat ede55c3 origin/main -- src/` prints nothing.
