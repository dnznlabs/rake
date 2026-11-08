# Security

> **Purpose:** Security posture for rake's contracts. It records what was reviewed and by what
> method, dispositions every finding and every carried issue, states the invariants the test suite
> holds, and says plainly what the review did not cover.

## Prior reviews

**Date:** 2026-11-06
**Method:** two-model agent review — in the method's own words, "several independent adversarial
reviews of the same code, captured separately, then reconciled"
([`audits/README.md`](audits/README.md) § What an audit here is, and is not). Two harnesses, two
labs, one pass each, reconciled by a third pass.
**Scope commit:** **frozen head `94d028c`** (`chore(gas): re-snapshot for the ForeignChunk check`,
the last commit touching `src/`, `test/*.t.sol` or `.gas-snapshot`) with **branch head `0819552`**
(the known-answer rewrite, which step 5 permits because it touches none of those three paths) — read
by the legs in a blinded tree at commit `d07483a8b9f6bcfe6200688bcb2d242450b9d464`, mapped in
[`audits/2026-11-06/BLIND.md`](audits/2026-11-06/BLIND.md). Both are the shas the blinded tree's
commit message and `audits/KNOWN_ANSWER.md` record, and both are still ancestors of this PR's head:
`main` came in after the review as the merge commit `cb2e2a9`, and `src/`'s tree object is `8ddcc99`
at the frozen head and at this PR's head alike (§ The reviewed commit)
**Scope:** `src/Distribution.sol`, `src/App.sol`, `scripts/forge/Deploy.s.sol`,
`scripts/forge/DeployApp.s.sol` ([`audits/SCOPE`](audits/SCOPE), with every exclusion and its
reason) — unchanged from the two earlier runs per decision 29, though **all four files' bytes moved
since 2026-10-31**: `src/Distribution.sol` by m03-t08, both deploy scripts by m03-t06, and
`src/App.sol` by this PR
**Result:** **4 Medium, 4 Low** — eight distinct issues, reduced by the rollup from twelve findings
raised across the two legs, with leg 1's one lead and leg 2's seven carried separately. Leg 1
(`codex`, `gpt-5.6-sol`) produced **4 findings and 1 lead** on three reviewers covering twelve
specialties; leg 2 (`claude`, requested `opus`, observed `claude-opus-5-5`) produced **8 findings and
7 leads** on nine of twelve agents, having lost math/precision, invariants and economic security to
an API safeguard error and a safety classifier. Graded against a known answer written before the
run: **leg 1 found 1 of 6 live shapes, leg 2 found 4 of 6**, and **both missed
[#54](https://github.com/dnznlabs/rake/issues/54) and
[#22](https://github.com/dnznlabs/rake/issues/22)** — #54 has now been missed by both legs on all
three runs and #22 by all six legs across three runs, so the method has never found either shape
once ([`AUDIT.md`](audits/2026-11-06/AUDIT.md) § 4)
**Full report:** [`audits/2026-11-06/AUDIT.md`](audits/2026-11-06/AUDIT.md)

**Neither leg reported F11 as open, and the fix was in the bytes they read.** The plan requires this
entry to say so either way. `src/App.sol` in the blinded tree carries `error ForeignChunk(address
ptr)` at `:46`, `_requireChunk` at `:198` and its four call sites at `:125`, `:147`, `:172` and
`:176`, and `grep -v '^\s*//' src/App.sol | grep -c 'code.length'` is 0 there. So no leg is reading
code it was not given, and no leg has found the fix wanting: on 2026-10-31 leg 2 raised this shape at
confidence 80 — its highest of that run — against the unfixed file, and against the fixed file
neither leg raised it. **That absence is the expected outcome against a tree carrying the fix, not
independent validation of `_requireChunk`:** it cannot distinguish a leg that read the check and
found it sound from one that never reached it. The 2026-10-31 contrast is the most it supports — the
same method, at its highest confidence of that run, raised the shape while the unfixed file was in
scope and did not raise it here. **F11's disposition rests on this PR's five tests, not on the legs.**

**One re-raise is recorded rather than treated as new.** Leg 2's `L2#4` (the rollup's F7) is the
closest thing either leg brought to the closed F9/F13: `applyQueued` (`:242`) still has no caller
check, so a matured action is applicable by any caller in any order. That is not a reopening —
"applicable by anyone, in any order, inside the 14-day window" is the standing disposition's own
wording, and `GRACE` bounds the window rather than removing it. What the report does not show is
whether the leg weighed the window: it cites the current line, makes no "forever" claim, and never
mentions `GRACE`. F9's and F13's rows do not move.

**Leg independence was measured again, and the agreement it underwrites is thinner this run.** Seven
greps over leg 2's `stream-json` transcript for leg 1's harvest, leg 1's model and harness, the
output directory and the answer key all return **0**
(`audits/2026-11-06/BLIND.md` § Leg independence, measured again). But only **one** of the eight
distinct issues was reported by both legs (F3, the ERC-20 push gas), so this run carries one
two-lab agreement, not three.

---

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

**Three runs now feed this table, and each numbered its own findings from F1.** To keep one stable
identifier per issue, the rows keep the 2026-10-30 numbering (**F1–F10**, that run's `AUDIT.md`
order), the three issues the 2026-10-31 run added are appended as **F11–F13**, and the one the
2026-11-06 run added is appended as **F14**. Each row says which run or runs raised it; each run's
own F-numbers are named in the cells that refer to it, so no numbering has to be guessed at. The
collision is worth stating once because all three runs have an F4 and they are three different
things: this table's F4 is `reserved > balance`, 2026-10-31's F4 was F11 here, and 2026-11-06's F4
was F7 here.

**The arithmetic.** The two reports carry 10 + 8 = **18** findings. The 2026-10-31 rollup re-found
five of the 2026-10-30 issues — its F1 is this table's F8, its F2 is F4, its F6 is F5, its F7 is
F10, its F8 is F7 — leaving 18 − 5 = **13 rows**, which is what this table carries. One caveat is
recorded rather than folded in: the new run's F5 is, on the mechanism, this table's **F9** re-found
at a higher severity, which the rollup did not deduplicate because F9 was not in the known answer it
graded against. Under that reading the table would carry twelve rows. It is kept as its own row
(F13) with the overlap stated, because the severity change is a disposition question for the
architect rather than a bookkeeping one.

**The third run adds one row: 13 + 1 = 14**, which is what this table now carries
(`git show origin/main:SECURITY.md | grep -c '^| F'` → 13 before this PR;
`grep -c '^| F' SECURITY.md` → 14 after it). Of the 2026-11-06 rollup's eight findings, **seven are
re-finds** of rows this table already carried — its F1 is this table's F12, its F2 **and** its F6
are both F4, its F3 is F8, its F4 is F7, its F7 is F9/F13, its F8 is F10 — and **one is new**, its
F5, appended as **F14**. Three of those re-finds are third raisings of the same shape (F4, F8, F10),
which is recorded in their rows rather than used to change a disposition: F8 was already ruled
documented by decision 36, and F4's and F10's dispositions stand for reasons their rows give. No
`src/` byte moved after the freeze, and no finding of this run was answered with code — F11, the one
contract change in this PR, was dispositioned for code at t05's close-out and fixed before the run
read it.

**A row's "fixed in this PR" names the PR that carried the fix, which is not always the PR carrying
this file.** F1, F2 and F6 were fixed by m03-t05, F5, F9 and F13 by m03-t08, and **F11 by this PR**;
each cell's parenthetical says which. F8 is ruled documented by decision 36, F7's open measurement is
settled, F3 remains `m03-t06`'s, and the rest are unchanged. **The three rows the 2026-10-31 run
added were dispositioned at t05's close-out (2026-11-01)**, and two have moved since: F11 was D15
([#126](https://github.com/dnznlabs/rake/issues/126)) recommending a t07 before M04 — that t07 is
this PR, and F11 is now **fixed** — F12 is carried as
[#127](https://github.com/dnznlabs/rake/issues/127) with a precondition for t06's runbook, and F13
is F9's mechanism, where "none needed" stands. The row the 2026-11-06 run added, F14, is documented
and carried as [#150](https://github.com/dnznlabs/rake/issues/150). No `src/` byte moved after the
freeze.

| ID | Severity | Contract change | Mitigation |
|---|---|---|---|
| F1 — reentrant `applyQueued` swaps the table mid-`distribute` | Medium | **fixed in this PR** (2026-10-30 run) | Was: `applyQueued` carried no guard while `distribute` did, so a hook-token beneficiary could apply a matured `setBeneficiaries` from inside the payout and the remaining rows paid from the new table. Both legs; leg 2 had a PoC. **Fixed** with a check-only `notLocked` modifier (`:110`) on `propose` (`:184`) and `applyQueued` (`:205`) — not `nonReentrant`, which would have cost a slot write on every call. Pinned by `test_applyQueuedRefusedDuringDistribute` and `test_proposeRefusedDuringDistribute`; both fail on `ede55c3` with "the reentrant applyQueued failed" / "the reentrant propose failed". The 2026-10-31 run raised nothing here, and the rollup checked that against the code rather than inferring it from silence (`audits/2026-10-31/AUDIT.md` § 4). |
| F2 — queued actions outlive a handover or a renounce | Medium | **fixed in this PR** (2026-10-30 run) | Was: the queue hash is `keccak256(action, nonce)` with no owner epoch, and neither `acceptOwnership` nor the renounce branch cleared `queued` or `_pending`, so a queued `transferOwnership` survived a handover and anyone could apply it — contradicting `transferOwnership`'s own NatSpec — and after a renounce nobody could `cancel` at all. Adopted Medium, not leg 1's High: the outgoing owner must have queued the action, a privileged precondition. **Fixed** by clearing the queue rather than epoching the hash: `_clearQueue()` (`:302`) from `acceptOwnership` (`:256`) and from the renounce branch (`:248`), emitting `Cancelled` per dropped action. Pinned by `test_acceptOwnershipClearsQueue`, `test_renounceClearsQueue` and `test_renounceFromApplyClearsTheRest` (the last proving the pop loop and the executing action's prior `_remove` do not collide); all three fail on `ede55c3`. **Positive evidence the 2026-10-31 legs read the fixed code:** leg 2's second lead depends on the fix being present — it complains that `_clearQueue` drops the owner's *own* queued `transferOwnership(owner)` withdrawal, a consequence of the fix rather than a gap in it. |
| F3 — `DeployApp` owner defaults to Foundry's default sender | Medium | **accepted → m03-t06** (deploy script, not a contract; the row said t05 until the 2026-11-01 close-out — t05 touched `src/` only) | Verified in source: `scripts/forge/DeployApp.s.sol:11` evaluates `vm.envOr("OWNER", msg.sender)` before `vm.startBroadcast()` at `:14`, so with no `OWNER` the owner is Foundry's `DEFAULT_SENDER` rather than the broadcaster — and the comment at `:8` asserts "defaults to the broadcaster". The documented command at `:7` passes no `--sender`. `Deploy.s.sol` does not share the shape. Nothing under `src/` changes and no bytecode re-check is implied; a redeploy fixes an affected `App`. |
| F4 — `reserved[token]` above the balance blocks `distribute` and `release` | Medium | none needed — decision 23 | Carried [#19](https://github.com/dnznlabs/rake/issues/19). `:135` is a **checked** subtraction — there is no `unchecked` block in the file — so a balance that falls below `reserved` reverts `distribute` for that token and blocks full `release`. Decision 23 rules this documented with one line of owner guidance rather than saturated; see § Carried issues. **Re-found by both legs on 2026-10-31 as that run's F2**, at the same line, leg 2 correctly calling it a checked subtraction and adding a worked example (stETH, reserved 10e18, balance 11e18, then a 10% slash). **Re-found a third time on 2026-11-06, as that run's F2 and F6 together, with a sharper consequence than either earlier run stated: under a shortfall the loss does not spread across the escrowed accounts — the first `release`/`claim` is paid in full and the whole shortfall lands on whoever exits last, whose exit then reverts** (`release` `:177-182`, `claim` `:199-204`, both paying the nominal `escrowed[token][account]` without comparing `_balance(token)` to `reserved[token]`). **That rollup rated the consequence Medium** against this row's "none needed". The disposition is unchanged here and the precondition is why: it needs a token whose balance falls on its own, which decision 23 and `docs/brainstorming/PROJECT_OVERVIEW.md` § Known limitations already place out of scope. Whether decision 23 reopens on the strength of a third raising at Medium is the Product Owner's call, not this PR's. |
| F5 — an escrow whose recipient cannot take the push can never be released | Low (lead) · Low (2026-10-31) | **fixed in this PR** (decision 40, [#135](https://github.com/dnznlabs/rake/issues/135)) | Carried [#95](https://github.com/dnznlabs/rake/issues/95). Was: `release` retried through the same `_push` under the same `PUSH_GAS` (`:56`), so a recipient that always burns the push never received its escrow and the value stayed counted in `reserved` — and at **any** outer gas limit, because the cap is on the gas forwarded rather than on the limit the caller sets. **Re-found by leg 2 on 2026-10-31 as that run's F6**, promoted there from a lead to a Low finding, with two mechanisms: a recipient whose `receive` writes five cold slots (about 110,500 gas) exceeds `PUSH_GAS` on every retry, and a token blacklist (USDC, USDT) on the account makes every token retry revert. **Fixed** with a second exit: `claim(address token, address to)`, which moves only `msg.sender`'s escrow, to an address it names, with the caller's gas and no cap, emitting `Claimed(token, account, to, amount)`. **The remedy sentence this row carried was wrong and is corrected:** an escrow is recoverable by `claim`, or by `release` once the recipient can take the push; a re-table stops further escrow and **recovers nothing already held** (#136 item 3). Two shapes `claim` does not rescue, stated rather than hidden: a contract recipient with no ability to make an outgoing call still cannot use it; and for an issuer-frozen account, `claim` moves tokens the Distribution holds to another address, which the issuer's freeze on the beneficiary did not reach. Pinned by `test_claimEthToSelfUncapped` (a recipient over the cap is paid in full where `release{gas: 10_000_000}` reverts; the `claim` costs 122,472 gas in the clone's frame), `test_claimEthToOtherAddress`, `test_claimErc20` (the blocklist mechanism) and `test_claimReentrancyLocked`. All four fail on `71c9f92`, where the ABI carries no `claim` at all; the behavioural half is `test_old_escrowNeverReleasableForHungryRecipient` and `test_old_blockedErc20EscrowNeverReleasable`, which pass there. |
| F6 — the ETH push copies unbounded return data on every failure | Low | **fixed in this PR** (2026-10-30 run) | Was: the ETH branch's `(ok, data) = to.call{value: amount, gas: PUSH_GAS}("")` copied all return data inside the `distribute` loop, so hostile rows grew memory without bound — leg 2 measured 10.6M gas at k=10 reverting rows and 35.3M at k=20, which bounded the table tighter than m03-t01 had measured. **Fixed** by keeping the return data only where decision 24 needs it: `_push` takes a `keepData` flag, true on the `release` retry and false in the `distribute` loop (`:359-366`). **Measured on this branch: 20 bloating rows cost 2,580,004 gas against 34,082,275 on `ede55c3` — a 13.2× reduction**, which independently corroborates leg 2's 35.3M at k=20 within 3.5% on a different harness. The cap was re-derived rather than re-asserted and **stays at 107**: at the cap, burner rows cost 14,889,178 gas and bloating rows 14,181,801, both under half a 30M block, so the burner is still the worst case. Pinned by `test_distributeDiscardsEthReturnData` (under 3,000,000 gas for 20 rows; fails on `ede55c3` at 34,082,275) and `test_releaseStillBubblesEthReason`, which guards the other side — decision 24 still bubbles a real reason from an ETH recipient. The ERC-20 branch's copy is kept by design. The 2026-10-31 run's leg 2 names the return-data copy on the **ERC-20** branch only and explicitly calls the ETH branch capped, which is this fix as designed. |
| F7 — `receive()` cannot run under a 2,300-gas stipend when the implementation is cold | Low | none needed — [#18](https://github.com/dnznlabs/rake/issues/18), criterion 5 | Carried #18, documented: the stipend holds while the implementation is warm, and a cold `DELEGATECALL` adds 2,600 — now qualified in `docs/brainstorming/PROJECT_OVERVIEW.md`. No funds are lost; `transfer` reverts and `send` leaves the ETH with the payer. **The open measurement is settled: 1,662 gas, warm**, read off the `receive()` frame of `test_receiveUnderStipend`'s trace (`forge test --mt test_receiveUnderStipend -vvvv`, devbox-pinned forge 1.7.1-dev) — the clone frame the 2,300 stipend must cover, with the inner delegatecall frame at 1,513. That **agrees with m01-t01's 1,662 to the gas**, so leg 2's "about 4,200 even warm" is not adopted. The likely cause of leg 2's figure is in its own report: it states that a clone's `DELEGATECALL` into a *cold* implementation costs 2,600 on its own, and 1,662 + 2,600 = 4,262 ≈ "about 4,200", so the cold figure appears to have been labelled warm. The cold case is unchanged and is the one that actually fails the stipend — the case criterion 5's qualifier already covers. **Re-found by leg 2 on 2026-10-31 as that run's F8**, at confidence 70, below its own reporting threshold and marked a hand trace that was not run. |
| F8 — uncapped gas on the ERC-20 push lets a hook token grief `distribute` | Medium (2026-10-31) · Low (lead) as first raised | **documented, not capped — decision 36** ([#123](https://github.com/dnznlabs/rake/issues/123)) | The ERC-20 branch of `_push` (`:369`) passes no gas argument while the ETH branch is capped by `PUSH_GAS`, so a hook beneficiary consumes 63/64 of the remaining frame and leaves too little for later rows' escrow writes. **The shape needs two things together: a hook token** (ERC-777-style `transfer` callbacks, a non-goal in the overview, and neither leg found one reaching the contract) **and an owner-chosen hostile row.** Its effect is that `distribute(token)` for that token cannot be mined at all; **the owner's remedy is a re-table through the delay, and nothing is lost.** **Sized in m03-t05, and re-bisected in m03-t08 because the figure is bytecode-dependent: `distribute` reverts at 95,236,000 gas and first succeeds at 95,237,000** (m03-t05 measured 95,048,000 / 95,049,000 on a `Distribution` 542 bytes smaller; the delta is **+188,000**) — over 3× a 30M block either way — asserted by `test_hookRecipientStarvesLaterRows`. Bisected one gas limit per transaction, because several near-95M attempts in one transaction starve each other through EIP-150's 63/64 rule and report a position artefact. Ruled option 1 by Denizen on 2026-10-31 as **decision 36**; a `gas: PUSH_GAS` cap was rejected because an honest token whose `transfer` needs more — a proxied token with pause and blocklist checks on cold slots, a rebasing or reward-bearing token — would be escrowed on every push and never releasable under the same cap, which is the #95 shape made permanent for a compliant token. **The gas a real ERC-20 `transfer` needs against the cap is unmeasured here** and is not claimed: `MockERC20` is not evidence. **Re-found by both legs on 2026-10-31 as that run's F1**, which is consistent with documenting rather than capping it. |
| F9 — queued actions never expire, and any caller chooses the order | Low (lead) · Low (2026-10-31) | **fixed in this PR** (decision 39, [#134](https://github.com/dnznlabs/rake/issues/134)) | Was: `queued[hash]` carried no expiry, so if two `setBeneficiaries` were both matured any caller could apply the older one last; the only mitigation was that `cancel` is owner-only and **immediate**, so a stale action could be dropped before it mattered — which left a renounced or inattentive owner's queue permanently applicable by the public. **Raised again by leg 2 on 2026-10-31, as that run's F5, at Low rather than as a lead** — see F13, which carries that row. Reconciled 2026-11-01 at t05's close-out as "none needed", then **reopened by the #133 triage and ruled for code: three raisings of one shape is the signal.** **Fixed** with `GRACE = 14 days`: `applyQueued` reverts `Expired(eta)` more than `GRACE` after an action's eta, and `cancel` lets **anyone** drop an entry once it has expired, so the queue is always cleanable. `GRACE` is a constant, not a per-instance variable — one number for the dapp to read, and not one more thing an owner could set to a year. Decision 25 is not reopened: it rejected cancel-by-anyone on a *revert* test, which is not always decidable, where an expiry is a timestamp comparison. Pinned by `test_applyQueuedExpires`, `test_strangerCancelsExpired` and `test_strangerCannotCancelUnexpired`; the first two fail on `71c9f92` (`test_old_applyQueuedNeverExpires` and `test_old_strangerCannotCancelExpired` pass there), and the third is the regression guard for the order of `cancel`'s two checks and passes on both. |
| F10 — the last row collects every row's rounding remainder | Informational (lead) | **rejected** — intended design | Not a defect: `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 decides "Basis points, sum = 10,000, last recipient takes the remainder. No dust", and `test_rounding_3333_3333_3334` asserts it. Leg 2's own bound is at most n−1 base units per call, and leg 2 demoted the item to a lead itself. **Re-found by both legs on 2026-10-31 as that run's F7**, where leg 1 called it Medium and the rollup adopted Low instead, on leg 2's own arithmetic: a row with `bps = b` gets zero only when `amount < 10000 / b`, so the last row profits only on low-decimal tokens with small, frequent deposits and pays gas on every call. The rejection stands — the behaviour is the overview's decision, and the table is sorted ascending so the last row is a known, fixed account. **Re-found a third time on 2026-11-06, as that run's F8** — leg 1 Medium at confidence 90 again, leg 2 an unscored lead again, and the rollup adopted Low again on the same arithmetic, noting that leg 2 looked for a token where the gain covers the gas and did not find one. Three runs have now raised it and none has produced an impact; the rejection is not revisited. |
| F11 — `App.lock` accepts a code pointer whose code can change after the lock | Medium | **fixed in this PR** (D15 ruled option 1 on [#126](https://github.com/dnznlabs/rake/issues/126), 2026-11-01, decision 38: a first-code-byte `0x00` check wherever a pointer is admitted, then a third two-leg review) | New on 2026-10-31 (that run's **F4**, leg 2 only, confidence 80 — its highest). `lock` (`src/App.sol:158-170`, checks at `:162` and `:166`) admits a pointer on the same `code.length` test `setChunks` (`:118`) and `setWidgetChunks` (`:140`) use. **An EIP-7702 delegation designator (`0xef0100‖addr`, 23 bytes) has non-zero `code.length`, so it passes**, and its key holder can then re-delegate — changing what `html` serves after the lock — or clear the delegation, which leg 2 traces to `lib/solady/src/utils/SSTORE2.sol:213`, where an `extcodesize` of 0 yields `n = 0xffffffffff` and `html` runs out of gas for every caller. Only the owner can install such a pointer, so this is not an unprivileged attack; but `lock` exists precisely to bind the owner, and its NatSpec says it re-checks readability rather than trusting `setChunks`. Adopted Medium on that reasoning. **This is in `src/App.sol`, whose bytes were byte-identical in the 2026-10-30 run and raised by neither leg then** (`audits/2026-10-31/BLIND.md` § The mapping). **Fixed** by `_requireChunk(address)` (`src/App.sol:198`), one private view that reads `extcodesize` and byte 0 through `extcodecopy` and reverts `CodelessChunk(ptr)` on empty code or the new `ForeignChunk(ptr)` (`:46`) on any first byte but `0x00`. It replaced all four `code.length == 0` tests, so every door a pointer enters by now passes through it: `setChunks` (`:125`), `setWidgetChunks` (`:147`) and both of `lock`'s re-checks (`:172`, `:176`). `addChunk`/`addWidgetChunk` need no check — the pointer is `SSTORE2.write`'s own. The check is "first byte is `0x00`" rather than "not `0xef`" because that is also what `SSTORE2.read` assumes, so a pointer it rejects could never have been served correctly. Pinned by five tests, each of which fails on `67146a7`'s `src/App.sol`: `test_setChunksRejectsDelegationDesignator`, `test_setWidgetChunksRejectsDelegationDesignator`, `test_lockRejectsDelegationDesignator` (an etched `0xef0100‖impl`, and `locked()` stays false), `test_lockRejectsRealDelegation` (the chain's own designator via `vm.signDelegation`/`vm.attachDelegation`, which is leg 2's F11 as it stated it) and `test_setChunksRejectsNonChunkContract` (a deployed contract is not a chunk either). `CodelessChunk` keeps its meaning and all seven of its existing tests keep their assertions. **The third review read the fixed bytes and neither leg raised it** — see § Prior reviews, 2026-11-06. |
| F12 — a second token address for the native balance pays escrowed ETH out again | Medium (chain-dependent) | **accepted → carried as [#127](https://github.com/dnznlabs/rake/issues/127)**; m03-t06's runbook checks each target chain for a native-balance or double-entry-point token before the first deploy | New on 2026-10-31 (that run's **F3**, leg 2 only, confidence 75). `reserved` is keyed by token address (`:87`), so `distribute(address(0))` escrows a row's share in `reserved[address(0)]`, and `distribute(alias)` then reads the same native balance, subtracts `reserved[alias] = 0`, and pays the escrowed amount to the table a second time; `release(address(0), …)` afterwards fails because the balance is short. Any caller can do it, so **where it applies the impact looks High** — but it needs a chain where an ERC-20 moves the native balance (leg 2 names Celo's GoldToken) or a double-entry-point token, and the scope deploys to `$RPC` (`scripts/forge/Deploy.s.sol:7`) and names no chain, so High is not established for this code as given. **If rake deploys to such a chain, treat it as High.** Recorded for completeness: leg 2's proposed fix refers to a `NATIVE_ALIAS` constant that **does not exist** in the code — that is its proposal, not the mechanism. |
| F13 — any caller can apply a superseded queued action after the newer one | Low | **fixed in this PR** — with F9, under decision 39 | Raised on 2026-10-31 as that run's **F5** (leg 2 only, confidence 75). Was: queued actions never expired and were not ordered by nonce; the only gate in `applyQueued` was `eta == 0 || block.timestamp < eta`, so whoever called it picked the order, and a beneficiary removed by a newer table could apply the older `setBeneficiaries` it was still listed in and then `distribute`, in one transaction. The rollup checked the mechanism against the code and it holds, and confirmed it is **not** a re-find of the fixed F1 or F2: it needs no reentrancy and no ownership change. **On the mechanism this is F9 re-found** — same no-expiry, no-ordering property — which the rollup did not deduplicate because F9 was not among the six issues in the known answer it graded against. What was new was the severity and a concrete cost. **The open question — whether F9's disposition changes — was answered for code** by the #133 triage and decision 39. **Fixed** by the same `GRACE` window: the ordering game is now **bounded to the window**, so a superseded action is a standing option for at most fourteen days after it matures rather than forever, and once expired anyone may drop it. Nonce ordering was rejected as the alternative: a never-applicable entry, decision 25's shape, would block everything queued behind it. Pinned by `test_staleActionExpires`, which is the triage's `test_staleMaturedActionResurrects` inverted — the older action is refused at `eta + 180 days` and the table stays the newer one. It fails on `71c9f92`, where `test_old_staleMaturedActionResurrects` passes and the older table is restored. |
| F14 — a clone's address does not commit to its owner or its table | Low | **documented, not changed** — carried as [#150](https://github.com/dnznlabs/rake/issues/150) | New on 2026-11-06 (that run's **F5**, leg 2 only, which rated it Medium at confidence 75; the rollup adopted **Low** and this row keeps Low). `DistributionFactory.create` (`:465-474`) and `predict` (`:487-498`) derive the address from the factory, the salt and the init code alone, so neither the owner nor the beneficiary table is committed to by the address a payer reads. **This is by design, and the design is what bounds it:** the salt is sender-bound, so the only party who can deploy a *different* table at the predicted address on another chain is the deploying key itself — not a stranger, and not a front-runner (`test_saltFrontRunningRejected`, `test_create2AddressStableAcrossChains`). What follows is therefore a statement about that key's discretion, not an unprivileged attack: funds sent to a predicted address on a chain where the clone is **not yet deployed** are at the deploying key's discretion, because `init` accepts a pre-sent balance (`:143`) and the table is whatever that deploy passes (`test_prefundedAddressLogsReceivedAtInit` pins the mechanism). No contract change: per § Out of scope a finding wanting one is a stop, and nothing here is reachable without the deploying key. **Two follow-ups are carried on #150**, neither of them t07's: (a) the factory's own NatSpec point 3 (`src/Distribution.sol:454-456`) still calls the factory "nonce-addressed", stale since decision 33 and m03-t06's `0a826dc` routed it through Arachnid's keyless CREATE2 proxy — a `src/` byte, so a stop here rather than a drive-by comment fix; and (b) one sentence of payer guidance in the dapp or `README.md`: do not pre-fund a predicted address on a chain the clone is not on yet. The review reached (a) from the opposite side — leg 2 argued the one-address-per-chain premise *from* `Deploy.s.sol:11-12` while the NatSpec three lines above `create` says the reverse, and the rollup recorded that leg 2 did not raise the disagreement itself. |

---

## Static analysis — disposition

**Slither 0.11.5** (nixpkgs, pinned in `devbox.lock`; `devbox run -- slither --version` → `0.11.5`),
configured by `slither.config.json` at the repo root, run against this branch, whose `src/` is
byte-identical to `main` at [`a90fa61`](https://github.com/dnznlabs/rake/commit/a90fa61)
(`git diff --stat origin/main -- src/` prints nothing). **23 results** with informational and
optimization detectors excluded — **2 High, 8 Medium, 13 Low** by Slither's own impact — and
**32** with every detector on; the 9 that the gate excludes are dismissed one line each below.
`fail_on: pedantic`, so an untriaged result is a non-zero exit; `slither.db.json` carries one triage
entry per row of this table, and the two move together in the same PR (`AGENTS.md` § Contracts).

**23 rows for 23 results, and 23 is the whole population.** `filter_paths` filters results, not the
compilation unit: crytic-compile builds Slither's own `--skip` list from `forge config --json`, so
the `script` directory is skipped whatever `filter_paths` says. Compiling the two shipped deploy
scripts in — `--foundry-compile-all` (71 contracts) or a `--skip ./test/**` pre-build with
`--foundry-ignore-compile` (54 contracts) — gives the same 23 gated and 32 full results and **zero
results naming `scripts/forge`** under either detector set, so `Deploy.s.sol` and `DeployApp.s.sol`
are clean and the gate's fast configuration loses nothing. The deviation is recorded in
`docs/milestones/m04/tasks/m04-t06/HANDOFF.md` § Deviations.

**This is the third review leg, and it is a mechanical one, so each row below was confirmed against
the source rather than against the expectation the plan recorded.** Four of those expectations did
not survive that reading and are refuted in their rows: two of the four `timestamp` results are not
timestamp comparisons, one of the two `calls-loop` results is on a statement no loop reaches, the
`return-bomb` is on the branch F6 deliberately kept rather than the one it removed, and two of the
four `incorrect-equality` results are in `cancel` rather than on a `data.length` test. **No result is
a `fix`:** no `src/` byte moves in this PR.

| # | Detector | Location | Impact | Disposition | Why |
|---|---|---|---|---|---|
| 1 | `arbitrary-send-eth` | `_push` `src/Distribution.sol:402-419`, call at `:408` | High | `design` | `to` is never caller-chosen on the flagged statement. `:408` runs only when `keepData` is true **and** the token is ETH, which is reachable from one call site only — `release` (`:183`); `claim`'s caller-named `to` (`:198`) reaches ETH at `:207`, a different statement Slither did not flag, and a token at `:417`. `release`'s `account` is an `escrowed` key, and only `distribute` (`:168`) creates one, from `_table[i].account`. The table is written by `_set` under `onlySelf` (`:274`, `:330`), reachable only through `propose`/`applyQueued` — the owner plus the delay (decision 6; F4's row for the table's authority). The call is capped at `PUSH_GAS` = 100,000 (`:59`), so a hostile row cannot burn the frame either. |
| 2 | `reentrancy-eth` | `distribute` `src/Distribution.sol:154-174` | High | `covered by F1` | Slither names the surface exactly: `escrowed` (`:97`) and `reserved` (`:95`) are written at `:168-169`, after the ETH send inside `_push`. **Read twice, and the answer is the completeness of two locks, not "known".** (a) The cross-function surface Slither warns about is closed: `escrowed` and `reserved` are touched in three functions and no others — `distribute` (`:155`, `:168-169`), `release` (`:178`, `:181-182`), `claim` (`:200`, `:203-204`) — and all three carry `nonReentrant` (`:109-114`), so the transient `locked` (`:99`), set before the loop, reverts `Locked()` on any reentry into any of them. `test_hookTokenDistributeIsLocked`, `test_hookTokenReleaseIsLocked` and `test_claimReentrancyLocked` read the four bytes of `Locked()` back out of the hook, so the refusal is asserted rather than assumed. (b) The write that mattered is the table, not the money: a reentrant `applyQueued` could once swap `_table` between two rows of the loop, which is **F1**, fixed with the check-only `notLocked` (`:118-121`) on `propose` (`:220`) and `applyQueued` (`:242`) and pinned by **`test_applyQueuedRefusedDuringDistribute`** and `test_proposeRefusedDuringDistribute`. (c) What is left unguarded during the lock was enumerated rather than assumed: of the contract's external functions, the only ones that neither revert nor are views are `cancel` (`:260`), `acceptOwnership` (`:304`), `receive` (`:147`) and `init` (`:134`, which reverts `Unauthorized` on any initialised clone). None of them writes `escrowed`, `reserved` or `_table` — they reach `queued`, `_pending`, `_pendingIndex`, `owner` and `pendingOwner` only — so nothing reachable from inside the push can change a value the remaining rows read. |
| 3 | `incorrect-equality` | `distribute` `:156` (`amount == 0`) | Medium | `design` | A comparison against zero, not against a balance: `amount` is the computed distributable and zero means `NothingToDo`. |
| 4 | `incorrect-equality` | `_push` `:418` (`data.length == 0`, `data.length >= 32`, `abi.decode(data) == 1`) | Medium | `design` | Exact return-data lengths and the ERC-20 success word, which is what the standard specifies; a no-return token (mainnet USDT) is the `length == 0` branch (`:390-392`). |
| 5 | `incorrect-equality` | `cancel` `:267` (`eta == 0`) | Medium | `design` | **Refutes the plan's expectation**, which named a `data.length` test here: `eta == 0` is the absence sentinel for `queued[hash]` (`:93`), a mapping's own default, not a balance. |
| 6 | `incorrect-equality` | `cancel` `:266` (the `eta == 0` disjunct of the non-owner guard) | Medium | `design` | Same sentinel, in the compound guard whose check order F9's `test_strangerCannotCancelUnexpired` pins. |
| 7 | `locked-ether` | `DistributionFactory` `:432-501`, `create` `:459-485` | Medium | `false positive` | The factory never holds the value: `create2(callvalue(), 0x0e, 0x36, salt)` (`:476`) forwards all of it into the clone, which is why `create` is `payable` and why there is no withdraw. `test_createForwardsValue` asserts `d.balance == 1 ether` after `create{value: 1 ether}` and that the clone logs `Received` first; `test/DistributionFactory.t.sol:103` asserts a plain send to the factory reverts, since it has neither `receive` nor `fallback` (`:429-430`). |
| 8 | `uninitialized-local` | `distribute` `:159` (`paid`) | Medium | `false positive` | Solidity zero-initialises it, and zero is the correct running total before the first row; `:163` reads it as the remainder base only on the last row. |
| 9 | `uninitialized-local` | `_set` `:335` (`sum`) | Medium | `false positive` | An accumulator whose zero start is its definition; `:344` compares the total to `BPS_TOTAL`. |
| 10 | `uninitialized-local` | `_set` `:336` (`prev`) | Medium | `design` | Here the zero is load-bearing and documented: `:329` says ascending accounts "keep the first row above `address(0)`", so `prev == address(0)` is the guard that rejects a zero-address beneficiary, not an oversight. |
| 11 | `calls-loop` | `_push` `:417` (the ERC-20 `transfer`) | Low | `covered by F8` | This is the one the loop actually reaches: `distribute` (`:166`) calls `_push` for every row and the ERC-20 branch passes no gas argument. Ruled documented rather than capped by **decision 36** ([#123](https://github.com/dnznlabs/rake/issues/123)); `test_hookRecipientStarvesLaterRows` sizes it at over 95M gas, more than 3× a 30M block. |
| 12 | `calls-loop` | `_push` `:408` (the ETH call with `keepData`) | Low | `false positive` | **Refutes the plan's expectation**, which mapped both `calls-loop` results to F8. No loop reaches `:408`: `distribute`'s call site passes `keepData = false` (`:166`), and the ETH path then takes the assembly `call` at `:411-414` with a zero-length output area. `:408` is reached only from `release` (`:183`), which has no loop. |
| 13 | `events-maths` | `setDelay` `:282-284` | Low | `design` | The record is the timelock's own log, not a per-setter event: `propose` emits `Queued(hash, nonce, eta, action)` with the new delay inside `action` (`:227`, `:235`) and `Applied(hash)` when it lands (`:229`, `:254`), so every delay change is on chain twice, with its calldata. Adding nothing. |
| 14 | `missing-zero-check` | `init` `:134` (`owner_`), written at `:139` | Low | `design` | **The one row the plan asked for a real answer on; see § Static analysis — the `owner_` zero check below, which is the reasoning and the escalation.** `owner() == address(0)` is already a documented, fully supported state — `docs/REFERENCE.md:38` defines it as "renounced" — and `create(address(0), …)` lands a clone in exactly that state rather than in a new one. Nothing is stuck there: `distribute`, `release` and `claim` are permissionless and keep working forever; only `propose` (`:221`) closes, which is what renouncing means. No stranger can impose it, because `create`'s salt must carry `msg.sender` in its top 20 bytes (`:468`). Disposition `design`, confirmed by Denizen 2026-11-08 (ROADMAP decision 43, #173); no `src/` check added; the doc sentence and test are #172. |
| 15 | `missing-zero-check` | `claim` `:199` (`to`), used at `:207` | Low | `design` | The beneficiary's own money going where the beneficiary says: `:198` states "Not validated: it is the beneficiary's own money", and `:200` reads `escrowed[token][msg.sender]`, so no one else's balance can move. |
| 16 | `reentrancy-events` | `propose` `:220-237`, `Applied` at `:229` after `_selfCall` `:228` | Low | `design` | Foreign code **can** run inside the self-call — `address(this).call(action)` (`:377`) takes arbitrary calldata, and a proposed `distribute(token)` is not `onlySelf` — so the detector's premise is not simply false, which is why "benign self-call" would be the wrong row. What makes it design is that no state the two events describe can change across the call: `distribute` takes the transient lock, so a reentrant `propose` or `applyQueued` is refused by `notLocked` (F1), and `Queued` is already emitted at `:227` before the call. The remaining effect is that an inner `Distributed`/`Escrowed` log precedes `Applied(hash)`, which is the true order of events. |
| 17 | `reentrancy-events` | `applyQueued` `:242-255`, `Applied` at `:254` after `_selfCall` `:253` | Low | `design` | The same self-call and the same answer; here `queued[hash]` is deleted and `_remove(hash)` run at `:251-252`, before the call, so a reentrant caller cannot apply the action twice. |
| 18 | `reentrancy-events` | `DistributionFactory.create` `:459-485`, `Created` at `:484` after `init` `:483` | Low | `false positive` | No foreign code runs: the callee is the clone the factory placed two statements earlier, and a clone delegatecalls the implementation the factory itself deployed (`:439`). `init` makes no external call — `_set` (`:330`) only writes storage — so there is nothing to reorder. |
| 19 | `return-bomb` | `_push` `:408` | Low | `covered by F6` | **Refutes the plan's expectation**, which described this row as the ETH branch discarding return data: the flagged statement is the branch F6's fix deliberately *kept*. F6 removed the copy from the loop by adding `keepData` (`:393-401`), false at `:166`; `:408` is the true branch, reached only from `release` (`:183`), because decision 24 bubbles a reason longer than a word and cannot name one it did not copy (`:184-190`). It is outside any loop, the callee's gas is capped at `PUSH_GAS`, and the memory cost is paid by whoever chose to call `release`. `test_releaseStillBubblesEthReason` is the test that requires the data to stay. |
| 20 | `timestamp` | `applyQueued` `:247`, `:249` | Low | `design` | A timelock is a timestamp comparison; `:245` says a validator's few seconds of drift is not the threat, and `:246`/`:248` already carry `forge-lint: disable-next-line(block-timestamp)` for the same reason. |
| 21 | `timestamp` | `cancel` `:266`, `:267` | Low | `design` | The same comparison against `eta + GRACE` (`:65`), suppressed for the same reason at `:265`. |
| 22 | `timestamp` | `_clearQueue` `:352` (`n > 0`) | Low | `false positive` | **Refutes the plan's expectation**, which mapped all four `timestamp` results to "the timelock is time". This one is not a timestamp comparison at all: `n` is `_pending.length` (`:351`), a loop bound. Slither's taint is field-insensitive over the `Pending` struct, so the `eta` field (`:19`) taints the array and therefore its length. |
| 23 | `timestamp` | `_remove` `:367` (`i != last`) | Low | `false positive` | The same artefact: `last` is `_pending.length` (`:366`) and `i` is `_pendingIndex[hash]` (`:363`), an array index comparison in the swap-and-pop. No timestamp is read in the function. |

### The 9 results the gate excludes

Read once with every detector on (32 results), and dismissed here rather than left unread. Both
detectors are notices that a pattern is present, with no claim attached.

1. `assembly` — `_push` `:411-414`: the memory-safe `call` with a zero-length output area that **is** F6's fix; removing it reinstates the return-data copy inside the loop.
2. `assembly` — `_bubble` `:421-425`: `revert(add(data, 0x20), mload(data))` is the only way to re-raise another frame's revert data verbatim, which decision 24 requires.
3. `assembly` — `DistributionFactory.create` `:472-482`: the PUSH0 minimal-proxy init code, byte for byte as solady's `LibClone.initCode_PUSH0` writes it; `test_create2AddressStableAcrossChains` pins the address it produces.
4. `assembly` — `DistributionFactory.predict` `:492-498`: the same init code hashed instead of deployed, so `predict` and `create` cannot drift.
5. `assembly` — `App._requireChunk` `:202-206`: `extcodesize` plus a one-byte `extcodecopy`, which is F11's fix; Solidity exposes no first-byte read.
6. `low-level-calls` — `_push` `:408`, `:417`: a raw `call` is the point — a push must not revert the distribution, which a typed call would.
7. `low-level-calls` — `_selfCall` `:377`: the timelock reaches its own `onlySelf` setters by calling itself with the queued calldata; that is the design (`:123`).
8. `low-level-calls` — `claim` `:207`: the uncapped ETH exit F5's fix added, deliberately not routed through `_push`'s cap.
9. `low-level-calls` — `_balance` `:385`: a `staticcall` to `balanceOf` so a token with no code fails the decode rather than reverting the frame (`:381`).

### Static analysis — the `owner_` zero check

`init` (`:134`) writes `owner = owner_` with no zero check, and `DistributionFactory.create` (`:459`)
does not check it either, so `create(address(0), …)` produces a distribution with no owner from its
first block. The plan singled this out as the one Slither result that deserves a real answer rather
than a disposition. **The answer reached from the code is that it is a documented shape, and the
reasoning is recorded here because the ruling is Denizen's, not this PR's.**

What an ownerless clone does, read off the source rather than assumed:

- `propose` (`:221`) reverts `NotOwner` for every caller, since no transaction has `msg.sender == address(0)`. So the table, the delay, the description and the ownership are frozen permanently.
- `acceptOwnership` (`:305`) reverts `Unauthorized` for the same reason, and `pendingOwner` is zero at `init`; `transferOwnership` is `onlySelf` and only `propose`/`applyQueued` reach it. There is no path back.
- `distribute`, `release` and `claim` are permissionless and unaffected: the money keeps flowing to the table, and an escrowed account can always take its own escrow. **Nothing is stuck.**
- `cancel` has nothing to cancel: the queue is empty at `init` and nothing can be queued.

That is exactly the state the renounce branch produces deliberately (`:291-298`), and
`docs/REFERENCE.md:38` already tells a reader what it means: "`owner()` … the zero address means
renounced". `create(address(0), …)` is therefore not a new state, it is the documented terminal one
entered at block one instead of later. Two further bounds: the zero owner is on chain in the clone's
own creation log, `Created(distribution, owner_)` (`:484`), so an indexer and the dapp both see it
immediately; and no stranger can impose it on anyone, because `create` requires the salt's top 20
bytes to equal `msg.sender` (`:468`), so only the deploying key can reach the address at all — the
same bound F14's row rests on.

**Disposition `design`. What is genuinely missing is not a check but two non-`src/` things, neither
of them this task's:** `docs/REFERENCE.md` documents the zero owner under `owner()` but nowhere says
`create` accepts one — that a distribution can be born renounced; and no test asserts it, where the
renounced state is otherwise covered by `test_renounceClearsQueue` and
`test_renounceEmitsOwnershipTransferred` through `transferOwnership(address(0))`. **If Denizen rules
the other way, the remedy is a one-line check in `src/`, which is M03 reopened and a new task — not
a byte in this PR.**

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
| [#95](https://github.com/dnznlabs/rake/issues/95) — an escrow to a recipient that burns the push can never be released | **Fixed by this PR.** The escrowed account takes its own escrow with `claim(token, to)`, to an address it names, with its own gas and no push cap. The old remedy sentence — a re-table — was wrong and is corrected in the F5 row: a re-table stops further escrow and recovers nothing already held. | decision 40 ([#135](https://github.com/dnznlabs/rake/issues/135)); F5's row for the mechanism and the two shapes `claim` does not rescue | **leg 2 only**, as a lead — F5; 2026-10-31: leg 2 only again, scored |
| [#111](https://github.com/dnznlabs/rake/issues/111) — the handover's two halves leave different traces | **Code half fixed by this PR.** Was: `acceptOwnership` emitted `OwnershipTransferred` and the renounce branch did not, so a renounce was invisible to indexers and to the dapp's event-derived history, and observable only through `snapshot()`. The renounce branch of `transferOwnership` now emits `OwnershipTransferred(owner, address(0))` before clearing the owner — the Ownable2Step shape — so a renounce leaves the same trace a handover does. **Now an invariant**, asserted rather than documented: `test_renounceEmitsOwnershipTransferred`, which fails on `71c9f92`. | decision 21 and m03-t02's deviation 11; added as a tenth row at t03's review by [#112](https://github.com/dnznlabs/rake/pull/112); the code half folded in by [#136](https://github.com/dnznlabs/rake/issues/136) item 4 | not raised by either leg; it was not in the known answer, so it is not graded |

---

## Invariants the suite holds

From `forge test --list --json`: **102 tests** in six suites — `DistributionTest` 56, `AppTest` 27,
`DistributionInvariantsTest` 7, `DistributionFactoryTest` 6, `PushGasTest` 3, `TableCapTest` 3.
Grouped by the property each group holds. A property asserted by a test is stronger than a finding: a
finding gets fixed once, a test refuses to let it come back. The last eleven are m04-t07's — the whole
of `DistributionInvariantsTest` and four of `DistributionTest`'s — and are the group at the end; the
count read **91** in five suites before them, which is the figure the reconciliation in the next
paragraph was done against.

Three generations of additions are marked. The nine m03-t05 added are marked **new**; the fourteen
m03-t08 added are marked **t08**; the five **this** PR adds are marked **t07** and are the whole of
the new `App` group at the end. All three were reconciled against `forge test --list` with a two-way
`comm` in both directions, and the counts are stated because a diff of two empty lists is not a
check (t05 handoff § Discoveries 1): this section named **86** tests before this PR, the suite holds
**91**, `comm -13` returns exactly the **five** `t07` names below, and `comm -23` returns **nothing**
— every name this section already carried still exists. Both sides were sorted under `LC_ALL=C`;
sorted under two different collations the same two lists report a difference that is not one, which
is the trap `audits/2026-10-31/BLIND.md` § The mapping records for file hashes and which bit here on
the first attempt. The count comes from `forge test --list --json`, not from
`forge test --list | wc -l` — the plain listing prints file and suite headers too, and reads 107
lines for these 91 tests.

**The table** — shares sum to 10,000, strictly ascending, no zero share, at most 107 rows, and the
cap holds for the worst-case row kind rather than for one measured kind.

`test_tableValidation`, `test_rounding_3333_3333_3334`, `test_tableCapBoundary`,
`test_capRowsStayUnderHalfABlock`, `test_perRowAndFixedCost`,
`test_capBloatingRowsStayUnderHalfABlock` (**new** — re-derives the cap for return-data bloating
rows, the kind F6 made cheaper, and confirms the gas burner is still the worst case at 107),
`test_hugeBalanceOverflowsShareMath` (**t08** — a balance above 2²⁵⁶ ÷ `bps` panics on checked
arithmetic rather than wrapping; an accepted edge, pinned),
`test_selfRowRecycles` (**t08** — the contract listed as its own row keeps that share, which then
re-enters the next split; `_set` rejecting `address(this)` is declined, with reasons, by #136) —
8 tests.

**The owner** — configuration setters are `onlySelf`; transfer is two-step (propose, then accept by
the pending owner alone); renounce is immediate and clears any pending owner; at most one pending
owner at a time; **a handover or a renounce carries no queued action into the new state**; **and a
renounce leaves the same trace in the log that an acceptance does.**

`test_settersOnlySelf`, `test_transferOwnershipIsPending`, `test_acceptOwnershipByPendingOwner`,
`test_acceptOwnershipByOtherReverts`, `test_renounceFreezes`,
`test_renounceStillImmediateAndClearsPending`, `test_transferToCurrentOwnerWithdrawsPending`,
`test_cancelQueuedTransferLeavesPendingOwner`, `test_pendingIterable`,
`test_nonOwnerCannotProposeOrCancel`, and `test_onlyOwner` on `App`,
`test_acceptOwnershipClearsQueue` (**new**), `test_renounceClearsQueue` (**new**),
`test_renounceFromApplyClearsTheRest` (**new**),
`test_renounceEmitsOwnershipTransferred` (**t08** — #111's code half: the renounce branch emits
`OwnershipTransferred(owner, address(0))`) — 15 tests.

**The delay** — a queued action is not applicable until its eta; it can be cancelled before it is
applied; a zero delay applies inline; shortening the delay does not shortcut something already
queued; a failed apply leaves the action queued; the queue cannot be read or written while a
payout is running; **a matured action is applicable only until `GRACE` after its eta, and after
that anyone may drop it.**

`test_cancelThenApplyReverts`, `test_delayZeroAppliesInline`,
`test_setDelayZeroDoesNotShortcutQueued`, `test_applyFailureKeepsQueued`,
`test_applyQueuedRefusedDuringDistribute` (**new**), `test_proposeRefusedDuringDistribute`
(**new**), `test_applyQueuedExpires` (**t08** — `eta + GRACE` still applies, one second past it
reverts `Expired(eta)`), `test_strangerCancelsExpired` (**t08**),
`test_strangerCannotCancelUnexpired` (**t08** — the regression guard for the order of `cancel`'s
two checks, at three instants, each proved both ways), `test_staleActionExpires` (**t08** — F13's
concrete cost, refused at `eta + 180 days`),
`test_delayZeroOwnerSweepsAtomically` (**t08** — what a zero delay permits an owner contract to do
in one transaction; allowed by the overview § 5 and flagged by the UI, pinned here) — 11 tests.

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
`test_hookRecipientStarvesLaterRows` (**new** — sizes F8's grief at 95,237,000 gas, re-bisected in
m03-t08 from 95,049,000 because the figure moves with the bytecode),
`test_nftViaTransferFromPhantomEscrow` (**t08** — an ERC-721 has no `transfer`, so a *count* of
NFTs is escrowed as a phantom amount and no NFT moves; accepted under F4's decision 23) — 20 tests.

**The escrow** — only the escrowed account can redirect its escrow, with its own gas; `claim` moves
nobody else's, is bounded by no push cap, and takes the same transient lock the other money paths do.

`test_claimEthToSelfUncapped` (**t08** — paid in full where `release` at ten million gas cannot),
`test_claimEthToOtherAddress` (**t08**), `test_claimErc20` (**t08** — the issuer-blocklist
mechanism, claimed to an address the token does not refuse), `test_claimReentrancyLocked` (**t08**)
— 4 tests.

**The factory** — salts are sender-bound, so an address cannot be front-run; the same salt yields
the same address on every chain; `init` succeeds once and only from the factory.

`test_saltFrontRunningRejected`, `test_create2AddressStableAcrossChains`, `test_createEmitsAndInits`,
`test_createForwardsValue` (**flipped in t08** — it now asserts the clone's `Received(address(0), …)`
log before the factory's `Created`, where it used to assert no `Received` log at all),
`test_factoryRejectsEth`, `test_initOnlyFactoryAndOnce`,
`test_prefundedAddressLogsReceivedAtInit` (**t08** — value sent to the counterfactual address before
any code existed there reaches the log too) — 7 tests.

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

**The locked document binds its bytes** — a locked `App` serves only SSTORE2 chunks, and only the
ones it was locked with. This group is new in this PR, which is why § Invariants had no `App` group
before it: the previous `App` tests assert what the document *is*, and these assert what `lock`
will refuse to bind. The property is the one F11 broke — a pointer that holds code is not the same
thing as a pointer that holds a readable chunk, and only the second can still be serving the same
bytes after the lock.

`test_setChunksRejectsDelegationDesignator` (**t07** — an etched EIP-7702 designator
`0xef0100‖impl` has non-zero code and is refused `ForeignChunk` at the first door),
`test_setWidgetChunksRejectsDelegationDesignator` (**t07** — the same at the widget door),
`test_lockRejectsDelegationDesignator` (**t07** — a real chunk added, then etched to a designator;
`lock()` reverts and `locked()` stays false, so the lock cannot be closed over bytes that can
change), `test_lockRejectsRealDelegation` (**t07** — the chain's own designator through
`vm.signDelegation`/`vm.attachDelegation` rather than an etched one, which is leg 2's F11 as it
stated it), `test_setChunksRejectsNonChunkContract` (**t07** — a deployed contract is not a chunk
either: its first byte is not `0x00`, and `SSTORE2.read` would have mis-read it) — 5 tests.

**The random sequence nobody wrote down** — seven properties asserted after *every call* of every
sequence a handler drives, and four unit tests run over a bounded input space instead of over one
input. New in m04-t07, and a different class of check from the rest of this section: the groups above
pin sequences someone thought of, and these look for the one nobody did. The handler
(`test/invariant/DistributionHandler.sol`) owns one clone created through the real factory and wraps
every state-changing entry point the contract has, one handler function each — `receive`,
`distribute`, `release`, `claim`, `propose` in its four action shapes and once more from a stranger,
`applyQueued`, `cancel`, `acceptOwnership` — plus a bounded `warp` and a token mint, so forge's own
call summary is the evidence that each was reached. `init` is reached once per run, in the handler's
constructor, through `create`. Six actors (the owner, four payees including one that refuses ETH and
one that burns the whole push cap, two strangers) and three tokens (ETH, a plain ERC-20, and one that
reports failure without moving a balance) bound every address and every amount, which is what makes
the conservation check exact. A fee-on-transfer or rebasing token is **not** among them: decision 23
excludes the class and F4's row documents the consequence.

- `invariant_tableSumsToBps` — one to 107 rows, no zero share, strictly ascending accounts, and shares summing to exactly 10,000 bps, after every call (overview § 5; `_set`).
- `invariant_reservedEqualsEscrowSum` — `reserved[token]` is the sum of `escrowed[token][account]` and nothing else, for every token (the escrow accounting; F4's row).
- `invariant_balanceCoversReserved` — the contract always holds at least what it has promised, so an escrow is always payable; this is the property decision 23 rests on, and the excluded token class is what would break it.
- `invariant_conservation` — every wei and every token unit that went in is either still in the contract or in an actor, exactly: nothing is minted or lost by `distribute`, `release` or `claim`.
- `invariant_noActionOutsideWindow` — an action applies only at a time in `[eta, eta + GRACE]`, only once, and never after it was cancelled or carried off by an ownership move (decisions 25 and 39; F9/F13).
- `invariant_ownerOrNobody` — a non-owner never queues an action, and a renounce is final: `owner()` stays zero, nobody is left nominated, and `propose` is refused (F2's queue clear, decision 21; `test_renounceClearsQueue` is the unit version).
- `invariant_lockNeverHeld` — the transient lock is never held between calls, read through the `notLocked` surface that refuses while a money path is running.

The one property deliberately **not** asserted is "`distribute` leaves zero balance". It does not,
under escrow, and F10's remainder-to-the-last-row is design — so conservation is asserted instead.

`fail_on_revert = false`, so the handler catches the refusals it legitimately expects and counts them
per entry point rather than letting them bubble: a bubbled revert would be discarded and that call of
the sequence would do nothing, which is how a suite that has stopped exercising the contract still
reports green. Both numbers are in the t07 handoff, and `AGENTS.md` § Contracts says how to read them.

`testFuzz_roundingNeverExceedsAmount` (every three-row table, not the one hand-picked in
`test_rounding_3333_3333_3334`), `testFuzz_saltPrefixMustBeSender` (every salt tail under the right
prefix and a wrong one), `testFuzz_applyWindow` (every offset from the proposal to a month past the
lapse), `testFuzz_claimMovesExactlyEscrow` (every amount an unpushable row can be owed) — 11 tests.

8 + 15 + 11 + 20 + 4 + 7 + 21 + 5 + 11 = **102**, the whole suite.

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

The current review reads **`94d028c`**, this PR's **frozen head** — the last commit touching `src/`,
`test/*.t.sol` or `.gas-snapshot`, frozen at step 5 before the review ran and unchanged under `src/`
since: `git diff --stat 94d028c 0819552 -- src/` prints nothing. **One comment moved after that.**
m03-t10 ([#153](https://github.com/dnznlabs/rake/pull/153)) rewrote the three `///` lines of the
factory's NatSpec point 3 and nothing else under `src/`, so the diff criterion 4 reads is no longer
empty and what it reports is that comment: every contract's **opcode bytes** are still equal to
`94d028c`'s — `forge inspect <C> deployedBytecode` with the 53-byte CBOR tail stripped is
`cmp`-silent for `Distribution` and `DistributionFactory`, and `App`'s whole string is byte-identical
— only the metadata block moved, and the review is **not** re-opened. The **branch head** at the
review was **`0819552`**, one commit later, which step 5 permits because it rewrote
`audits/KNOWN_ANSWER.md` only. Both are named because the blinded tree is cut at the frozen head
while the PR is reviewed at the branch head, and naming one without the other has already caused one
correction.

**`main` was brought in after the review by a merge commit, `cb2e2a9`.** That is what keeps the two
shas above reachable: `git merge-base --is-ancestor 94d028c HEAD` exits 0, so once this PR merges a
fresh clone of `main` still resolves the commit the legs actually read. The four sha256s in
`audits/2026-11-06/BLIND.md` § The mapping are the cross-check on the reviewed *bytes*, which is a
different thing from the identity of the reviewed commit; m03-t07's `HANDOFF.md` § Deviations 4
records how the branch came to carry that merge.

`git diff --stat 94d028c origin/main -- src/` is **not** empty today, and should not be: it reports
`src/App.sol | 32 ++---`, the `ForeignChunk` fix, because this PR has not merged yet and `main` does
not carry it. That is the opposite direction from the two earlier entries, which were written after
their fixes were on `main`. Per milestone criterion 4, what `SECURITY.md` names must be the commit
`main` carries when M03 closes, or an ancestor whose diff to it touches nothing under `src/`. When
this PR merges, the merge commit becomes a descendant of `94d028c` whose diff to it touches nothing
under `src/` — nothing after the freeze touches `src/` — and that diff becomes empty; the handoff
names both commits and criterion 4 is re-checked on the merged `main` at close-out.

The 2026-10-31 review read `b0fb4e3` and the 2026-10-30 review read `ede55c3`; both remain true of
their entries. `94d028c` supersedes them as the reviewed commit, because it is the one carrying the
`App.lock` fix, and it is the commit M04 deploys — which is why its `App` init-code hash, not a
later one, is what `APP_SALT` is mined against (decision 37, m03-t07 `HANDOFF.md` § For M04).
