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
two labs reading the same code, plus Slither and the invariant suite, and it is the review of
record: no paid review is planned, and mainnet does not wait on one ([decision 55](docs/ROADMAP.md#decisions),
2026-11-18, superseding decision 20 on that point). A commissioned human review or a bug bounty
may come later as its own decision. Everything the review reads is public, so a reader can re-run it.

---

## Threat model

What the review assumed is written down, not implied: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)
names every actor, token class and chain the self-review had in mind, and beside each assumption the
test that holds it — 63 distinct names, every one a name `forge test --list` returns, which is the
file's own stated check. It closes with a diff against two inputs pinned by commit, the Solodit
checklist (370 items under 62 labels) and the two `pashov/audits` reports nearest rake's shape, and
with an **open list**: five rows of that diff are dispositioned `open`, naming three distinct
findings — the `propose` validation gap of [#54](https://github.com/dnznlabs/rake/issues/54), the
native-balance alias token of [#127](https://github.com/dnznlabs/rake/issues/127), and views that
stay readable mid-`distribute` and that no test pins. Two further rows carry no test at all. That
list, not the table above, is what the review still owes a reader. First of decision 56's three
additions; § Coverage and § Mutation are the other two.

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
| F7 — `receive()` cannot run under a 2,300-gas stipend when the implementation is cold | Low | none needed — [#18](https://github.com/dnznlabs/rake/issues/18), criterion 5 | Carried #18, documented: the stipend holds while the implementation is warm, and a cold `DELEGATECALL` adds 2,600 — now qualified in `docs/brainstorming/PROJECT_OVERVIEW.md`. No funds are lost; `transfer` reverts and `send` leaves the ETH with the payer. **The open measurement is settled: 1,662 gas, warm**, read off the `receive()` frame of `test_receiveUnderStipend`'s trace (`forge test --mt test_receiveUnderStipend -vvvv`, devbox-pinned forge 1.7.1-dev) — the clone frame the 2,300 stipend must cover, with the inner delegatecall frame at 1,513. That **agrees with m01-t01's 1,662 to the gas**, so leg 2's "about 4,200 even warm" is not adopted. The likely cause of leg 2's figure is in its own report: it states that a clone's `DELEGATECALL` into a *cold* implementation costs 2,600 on its own, and 1,662 + 2,600 = 4,262 ≈ "about 4,200", so the cold figure appears to have been labelled warm. The cold case is unchanged and is the one that actually fails the stipend — the case criterion 5's qualifier already covers. **Re-found by leg 2 on 2026-10-31 as that run's F8**, at confidence 70, below its own reporting threshold and marked a hand trace that was not run. **The cold figure is now measured as well ([#174](https://github.com/dnznlabs/rake/issues/174)): 4,162 gas**, bisected on the devbox-pinned forge one transaction per probe — 4,161 fails, 4,162 passes — and pinned from both sides by `test_coldReceiveFitsTheMeasuredFrame` and `test_coldReceiveFailsOneGasUnderTheMeasuredFrame` in `test/ColdStipend.t.sol`, whose clone is created in `setUp` so that a test's first touch of it is its transaction's first touch. That is 1,662 plus the **2,500** a cold account access *adds* to the clone's `DELEGATECALL` (2,600 cold against 100 warm), not the 4,262 of leg 2's arithmetic, which counts the warm access twice — so leg 2's figure was both mislabelled warm and 100 gas high. **Pay a distribution with `call` and forward the gas, not with `transfer` or `send`:** under the stipend the deposit simply reverts and the ETH stays with the payer, which is the sentence the dapp's `#/docs` § Limits now carries. `test_receiveUnderStipend` remains the warm case, and the stipend comment on `receive()` in `src/Distribution.sol` still describes the warm frame only; correcting it is a `src/` byte and waits for the milestone that reopens `src/` (#174's third item). **Re-measured 2026-11-16 under solc 0.8.38** (the 0.8.34 → 0.8.38 pin, no `src/` change): warm **1,659** (inner delegatecall frame 1,510), cold **4,159** — 4,158 fails, 4,159 passes — still warm + 2,500; the constant and both pins in `test/ColdStipend.t.sol` carry the new figure. |
| F8 — uncapped gas on the ERC-20 push lets a hook token grief `distribute` | Medium (2026-10-31) · Low (lead) as first raised | **documented, not capped — decision 36** ([#123](https://github.com/dnznlabs/rake/issues/123)) | The ERC-20 branch of `_push` (`:369`) passes no gas argument while the ETH branch is capped by `PUSH_GAS`, so a hook beneficiary consumes 63/64 of the remaining frame and leaves too little for later rows' escrow writes. **The shape needs two things together: a hook token** (ERC-777-style `transfer` callbacks, a non-goal in the overview, and neither leg found one reaching the contract) **and an owner-chosen hostile row.** Its effect is that `distribute(token)` for that token cannot be mined at all; **the owner's remedy is a re-table through the delay, and nothing is lost.** **Sized in m03-t05, and re-bisected in m03-t08 because the figure is bytecode-dependent: `distribute` reverts at 95,236,000 gas and first succeeds at 95,237,000** (m03-t05 measured 95,048,000 / 95,049,000 on a `Distribution` 542 bytes smaller; the delta is **+188,000**); **re-bisected 2026-11-16 under solc 0.8.38 to 95,225,000 / 95,226,000** (−11,000, no `src/` change) — over 3× a 30M block either way — asserted by `test_hookRecipientStarvesLaterRows`. Bisected one gas limit per transaction, because several near-95M attempts in one transaction starve each other through EIP-150's 63/64 rule and report a position artefact. Ruled option 1 by Denizen on 2026-10-31 as **decision 36**; a `gas: PUSH_GAS` cap was rejected because an honest token whose `transfer` needs more — a proxied token with pause and blocklist checks on cold slots, a rebasing or reward-bearing token — would be escrowed on every push and never releasable under the same cap, which is the #95 shape made permanent for a compliant token. **The gas a real ERC-20 `transfer` needs against the cap is unmeasured here** and is not claimed: `MockERC20` is not evidence. **Re-found by both legs on 2026-10-31 as that run's F1**, which is consistent with documenting rather than capping it. |
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

## Front end — disposition

The document's own surface, which no review before this one had read. `app/` is outside
[`audits/SCOPE`](audits/SCOPE) by design — that file is the contracts' — and it is the surface a
stranger loads, so m04-t04 step 6 ran the two-leg method over it once with a web-security prompt.
This is not the Solidity audit above: no finding here is in `src/`, and **no row's disposition is a
`src/` change.**

**Date:** 2026-11-17
**Method:** the same two-leg method as § Prior reviews — two harnesses, two labs, one pass each,
reconciled by a third pass — run as a sibling of `make audit` rather than through it, with **no
skill** and a web-security prompt: [`audits/prompts/frontend-leg.md`](audits/prompts/frontend-leg.md),
naming the gateway-injected script, every `innerHTML` sink, the clipboard controls, the widget on a
host page we do not control, the query parameters the shipped build still reads, and `app/build.mjs`
as a build-time injection point. Leg 1 codex `gpt-5.6-sol` (effort high, 433s, exit 0); leg 2 claude
`claude-opus-5-5` (415s, exit 0); the rollup is
[`audits/2026-11-17/frontend/AUDIT.md`](audits/2026-11-17/frontend/AUDIT.md), whose provenance block
§ 1 is the runner's, copied byte for byte. Neither leg reproduced a finding in a browser — leg 1's
Chromium launchers died under its harness, leg 2 did not try — so every finding is argued from the
source, apart from leg 1's Node check of the script-tag guard and leg 2's `Eth.checksum` call and
build run. That limit is the pass's, and it is why R2's row carries a test rather than a screenshot.

**Scope:** the nine files of [`audits/SCOPE.frontend`](audits/SCOPE.frontend) — `app/src/index.html`,
`app/src/model.js`, `app/src/eth.js`, `app/src/widget.js`, `app/src/layout.html`, `app/build.mjs`,
`app/inline-scripts.mjs`, `app/broadcast.mjs`, `app/version.mjs`. The list reverses `audits/SCOPE`'s
exclusion of build tooling deliberately for the front end: two of the values `build.mjs` substitutes
into the document are computed in `version.mjs` and `broadcast.mjs`, and `inline-scripts.mjs` is the
guard that keeps the DOMParser swap executing our scripts at all, so auditing the injection point
without its inputs reviews the pipe and not the water (TASK.md step 6, amended 2026-11-17).

**Scope commit:** the legs ran at **`b04af65`**, the branch head when step 6 started, and that commit
is kept as the tag **`audit/2026-11-17-frontend-scope`**. **The rebase onto `3d4f4cf` rewrote it out
of the branch's history** (`git merge-base --is-ancestor b04af65 HEAD` → not an ancestor), so the sha
the rollup records cannot be read off this branch's log; the tag is what makes it fetchable, and
without it the check below could only be run in the clone that did the rebase. The bytes the legs
read are the bytes the branch carried, because **the nine scoped files are byte-identical between the
tag and `08fee62`**, the head the rollup was committed at:

```
git fetch origin tag audit/2026-11-17-frontend-scope
git diff audit/2026-11-17-frontend-scope 08fee62 -- \
  app/src/index.html app/src/model.js app/src/eth.js \
  app/src/widget.js app/src/layout.html app/build.mjs app/inline-scripts.mjs \
  app/broadcast.mjs app/version.mjs
```

→ no output. **The audit did not run at any later head**, and this section does not substitute a
newer sha for the tag: five scoped files have moved since — `app/src/index.html` in m04-t04 and
again in m04-t13, and `app/src/model.js`, `app/src/eth.js`, `app/src/widget.js` and
`app/inline-scripts.mjs` in m04-t13 — and every one of those moves is a `fix` row below.

**Line numbers in the Finding and File columns are the scope commit's**, not any later head, because
that is the tree the legs read and the rollup checked its citations against. **m04-t13 ends the
offset table that stood here.** Where m04-t04 moved one scoped file in two hunks, so that three
ranges and two numbers covered it, m04-t13 moves five:

```
git diff audit/2026-11-17-frontend-scope HEAD -- \
  app/src/index.html app/src/model.js app/src/eth.js \
  app/src/widget.js app/src/layout.html app/build.mjs app/inline-scripts.mjs \
  app/broadcast.mjs app/version.mjs
```

→ `app/inline-scripts.mjs`, `app/src/eth.js`, `app/src/index.html`, `app/src/model.js` and
`app/src/widget.js`, 201 insertions and 41 deletions, with **20 hunks in `app/src/index.html`
alone**. A column of offsets for that is a table a reader would have to trust rather than check, so
there is none: **resolve a scope-commit citation against the tag**, which is why the tag is pushed.
Each `fix` row below carries its own head line numbers beside its commit, and those are the ones to
read for the change itself.

**Results:** leg 1 reported **9** findings (F-01 to F-09; its scale has no Info level), leg 2 **21**
(F1 to F21: 15 rated Low or above, 6 Info) — **30 read in total**, of which **6 were reported by
both legs**, leaving **24 distinct findings**: 1 Critical, 2 High, 7 Medium, 8 Low, 6 Info. The two
legs agreed on severity exactly once (R2, High/High) and differed by one step on the other five
shared findings; the rollup followed the precondition rather than the outcome each time and gives its
reason per entry.

**The finding count `AUDIT.md` states is 24 (§ Counts, "The finding count is 24"), and the table
below has 24 rows, R1 to R24 with no number skipped.** Both figures are stated because a finding
missing from a register reads as a pass. **No row is a `false positive`:** the rollup checked every
cited line and found no finding contradicted by the code, so that kind is empty here rather than
unconsidered, and the one factual defect it did find was leg 2's line numbering in R4, corrected in
that entry. **Eighteen rows are a `fix`** — R2 in m04-t04; R3, R5, R6, R7, R10, R11, R12, R14, R15,
R16, R17 and R21 in m04-t13; R4, R8 and R18 in m04-t14; and R9 and R19 in m04-t15 — and each names
its hunk and the test or the browser step that is red without it. Two of the eighteen are fixed in one
half and accepted in the other, and their rows say which: R3's dapp half is fixed and its widget half
accepted, R14's hex half is fixed and its chain half accepted. **Three are `design`** (R13, R20, R22)
and **three are `accepted`**, of which two (R1, R23) are accepted on the trust boundary (decision 53),
where no `app/` change can move them, and one (R24) is **carried for the `mount` signature**: the
remedy passes the page's provider to the inlined widget, which changes the widget's public surface and
is no wording ruling's to make. The two that left this count are R9 and R19, which decision 57 ruled
on 2026-11-19 and m04-t15 shipped. **18 + 3 + 3 = 24**, which
is the row count and the finding count `AUDIT.md` states. No row is a `fix` whose hunk is not in this
repository's history.

Every `file:line` in the Finding and File columns is the audit's, read at the scope commit, and is
resolved against the tag rather than against a head — see the paragraph above on why no offset table
replaces it. Head line numbers appear only inside a `fix` row, beside the commit that put them
there.

| # | Finding | File | Severity | Disposition | Why |
|---|---|---|---|---|---|
| R1 | The gateway's injected script runs first in the dapp's origin and can change what is shown, copied or sent | `app/src/index.html:13` (`<body>`, the injection point, ahead of every application script at `:16-25`); sinks `:373-382` and `:941-964` | Critical | `accepted` | **Decision 53 (ruled by Denizen 2026-11-18 on [#232](https://github.com/dnznlabs/rake/issues/232)): the trust boundary is the gateway the visitor chose, and no byte of `app/` moves it — "web3:// direct is preferred, gateways are for convenience."** The precondition is a hostile or compromised gateway operator, and an operator who can inject script into our document can equally serve a different document — so the on-chain bytes do not authenticate what a gateway visitor runs, injection or no injection. `esc()`, the preflights and `holdToFire` do not constrain earlier capturing listeners, a rewritten `data-copy`/`data-send`, or a wrapped `window.ethereum.request`, and nothing in the scoped files can. Leg 1 reaches the same conclusion in its last paragraph; leg 2 stated it did not read `cmd/server/html.patch` and made no claim. Not a `fix` because there is no change to make, not `design` because the property is the gateway's and not ours: it is accepted, and decision 53 in `docs/ROADMAP.md` § Decisions records the ruling; the `#/docs` wording that states it is Denizen's under decision 17 and rides the post-UAT `app/` task. |
| R2 | Provider-supplied hashes and addresses are interpolated unescaped into attributes and `href`s by `ext()` / `xlink()` | `app/src/index.html:363-370` | High | `fix` | **Fixed in this PR, `app/src/index.html` `af4396c`:** `isWord` and `shaped(kind, v)` beside `isAddr` (now `:352` and `:360`), the refusal at the top of `ext` (now `:376`) and the same check in `xlink`'s condition (now `:384`) — 20 hex bytes for an address, 32 for a hash, an unnamed kind failing closed, and a value that fails printed escaped and alone with no copy icon and no explorer link. Both legs rated it High and gave the same reproduction: a provider that returns `"><img src=x onerror=…>` as a transaction hash got script in the dapp's origin, and script there rewrites every later transaction and every clipboard value. `Eth.checksum` (`app/src/eth.js:183-186`) was not the filter it looks like — leg 2 ran `0x'+alert(1)+…` through it and got the payload back, which `test/ext.test.mjs` now pins so the reason for checking at the sink cannot rot. The sources were the `eth_sendTransaction` hash at `:159`, `log.transactionHash` through `histRows` at `:757`, `log.topics[1]` for `Applied`/`Cancelled`, the "queued in" hash on the pending block, `log.address` from the address-less `Transfer` query, and leg 2's latent `ACC` from `eth_accounts`, stopped today only because `word(ACC)` throws first. Evidence: `test/ext.test.mjs`, 9 tests — **4 fail without the hunk** (the payload verbatim in `title`, `aria-label`, `data-copy` and the explorer `href`) and **9 pass with it**, with three of them pinning that a well-formed address, a well-formed tx and a queued hash still render exactly as before. The bundle changes, so the testnets carry it at the next Run B. |
| R3 | The detail page and the widget paint any contract as a Rake distribution | `app/src/index.html:539-541` (`loadDistro` checks only that the code is not `0x`, at `:540`), with `:2032-2033`, `:1160`, `:1162-1163`; the same gap in `app/src/widget.js:151-163` | High | `fix` | Real, and the highest-severity finding either leg made alone (leg 2). Nothing compares the code with the PUSH0 clone of `implementation()`, or the address against the factory's `Created` logs or `predict()`, so a contract that answers `snapshot()`, `reserved` and `pendingOwner` is painted with the page's full trust surface — table, delay, timelock phases, "anyone can apply", the `distribute` buttons — and saved to `rake.recent`. A fake claiming a seven-day delay while forwarding on `receive()` is a phishing page carrying the dapp's own trust signals, and its large `nonce` with one pending entry makes `Model.nonceOf` (`index.html:826`, `model.js:275-281`) run up to 2³² keccaks per paint. **Fixed in m04-t13, `app/src/index.html` `05a9613`:** `CLONE(impl)` and `isClone(code, impl)` beside `isAddr` (`:386-387`), with a comment naming `src/Distribution.sol:473-476` as the source of the 45 bytes; `loadDistro` (`:603`) returns `{ addr, foreign: true }` for code that is not the PUSH0 clone of the `implementation()` the page already reads at boot, and `detail` paints the refusal at `:831` — `has code, but it is not a distribution of this app's factory — this page will not read it` — and **does not call `addRecent`**, so a hostile address never enters `rake.recent`; `recents().map(loadDistro)` filters `foreign` as it filters `missing`. The fake never reaches the paint, and `nonceOf`'s 2³² keccaks go with it. Evidence: `test/ext.test.mjs` pins `isClone` with five rows (the 45-byte clone → `true`, one hex digit changed → `false`, the implementation's own longer code → `false`, `0x` → `false`, an upper-cased answer → `true`), and the red planted by writing `isClone` with `===` against a mixed-case `impl` fails the upper-cased row. Step 0's `cast code`, re-run on this task's dev chain, measured the clone at exactly 45 bytes, byte-equal to `0x5f5f365f5f37365f73` + `implementation()` lower-cased + `5af43d5f5f3e6029573d5ffd5b3d5ff3`. In the browser (m04-t13 HANDOFF § AC 3) the implementation and factory addresses both paint the notice with no `.distro` and no table and `rake.recent` gains neither; before the fix the implementation painted a full detail view with a `100%` table and an owner cell reading `renounced`, and `rake.recent` gained it. **The widget half stays `accepted`:** the host names the address in `data-rake`, and a host that names a fake can print any table it likes without the widget, so the check would cost a second request against the one-`eth_call` contract (`app/src/widget.js:3`, decision 12). Not a `src/` change: the factory already constrains who can reach an address (`create`'s salt carries `msg.sender`); what was missing is the dapp checking it. |
| R4 | The build substitutes unvalidated values raw into JavaScript string literals and into markup | `app/build.mjs:73-78` (`--set`), `:81-83` (`substitute`), `:37-59` (`deployed`); sinks `app/src/index.html:34` (`CFG`) and `:1878` (`CFG.version` as markup) | Medium | `fix` | Both legs (leg 1 High, leg 2 Medium; the rollup adopts Medium because every path needs write access to a build input — the command line, or a tracked `broadcast/*/run-latest.json` — which is the same authority as editing `index.html`). What the finding adds past that precondition is real and is why it is not dismissed: `--set VERSION=<img … onerror=…>` silently discards the validation `version.mjs` applies and a quote in any value breaks out of the `CFG` object literal; a tracked broadcast log's `contractAddress` passes through `Eth.checksum` unchecked against `^0x[0-9a-fA-F]{40}$`; a *valid* replacement address silently re-points the bundle at another factory even though the factory's CREATE2 address could be computed and asserted; and in `deployed()`'s name-ordered loop the last `contractName` wins, so a same-named contract in a later script directory overrides the address with no notice. **Fixed in m04-t14, closing [#235](https://github.com/dnznlabs/rake/issues/235), in two commits.** `app/values.mjs` (new) and `app/build.mjs` `f208401`: `SHAPES` (`values.mjs:39`) declares one allow-list per token with the reason it is no wider, `shapeOf` (`:56`) applies the `*_BLOCK` row to every block token, and `check(values, sources)` (`:67`) throws one error naming every failing token, where it came from and the shape it failed — called once over the merged values (`build.mjs:117`) rather than at each source, which is what covers `--set`, a log and the one default with the same table; the `--set` loop refuses a key outside `SET_KEY` (`:96`) or an empty value, and announces an override of a log value on stderr (`:108`); `deployed()` refuses a name two logs both create, naming both files (`:50-59`). `app/broadcast.mjs` `d59a418`: `isAddr` (`:41`) refuses a `contractAddress` that is not 20 hex bytes before `Eth.checksum` re-cases it (`creations`, `:140`), and `create2` (`:32`) recomputes every creation routed through `PROXY` (`:27`) from the salt and init code the log itself carries and refuses a mismatch (`:145`) — which is the sentence about a *valid* replacement address. Every shape is an allow-list, so no sink changed and no escaping function was added: none of the five admits `'`, `\`, `<`, `&` or a newline. Evidence: `test/build.test.mjs` gains 14 of its 20 new rows for this one (the other six are R8 below) — the six Sepolia values pass; eight bad values are each refused by name (`CHAIN_ID` `0x1`, `VERSION` `0.1alpha'` and `<img src=x onerror=alert(1)>`, a lowercase address and `0x` + `g`×40, a leading-zero block and a decimal one, a 63-digit salt); `{ FOO: 'x' }` throws `/no shape declared for __FOO__/`; both tracked `Deploy.s.sol` logs recompute to `0x00D18B5b…` and `0x31dd18b4…`; and three `spawnSync` runs of the real build pin `--set VERSION=0.1alpha'` → exit `1` on stderr `/VERSION/` with `app/dist` untouched, `--set lowercase=1` → exit `1`, and `--set DISTRIBUTIONFACTORY=<the log's own>` → exit `0` printing `--set DISTRIBUTIONFACTORY overrides the log's 0x00D18B5b…`. Four reds were planted one at a time: widening `VERSION` to `/.*/` fails `VERSION=0.1alpha' was not refused`; dropping the checksum equality fails `DISTRIBUTIONFACTORY=0x00d18b5b…de71b was not refused`; replacing the no-shape throw with `return` fails `expected: /no shape declared for __FOO__/`; and **removing the `check` call makes the quoted build exit `0`** — `dapp: raw 146564 bytes · gzip 46449 bytes · chain 11155111`, with `version: '0.1alpha'',` in `app/dist/index.html`, the quote out of the `CFG` literal. Greps: `grep -ic -F '4e59b448' app/broadcast.mjs` → `1` (baseline `0`), `app/build.mjs` → `0` unchanged. Leg 2's cited lines for this finding do not exist (`build.mjs` has 141 lines, `broadcast.mjs` 71); the rollup maps them to the real ones under R4 and confirms the mechanism at those lines, which is the pass's one factual defect. No shipped byte moves for this row, so it is live on merge and starts no upload. |
| R5 | Beneficiary rows skip the EIP-55 refusal every other address field enforces | `app/src/index.html:870` (`editorState` tests `isAddr` only), `:899-905` (`oninput` stores the raw value; `onchange` runs `addrField`, which leaves the bad value in `rows[i]` and repaints the table as valid), `app/src/model.js:171-173` | Medium | `fix` | Both legs (leg 1 High, leg 2 Medium; the rollup adopts Medium because no attacker is involved — the loss needs the owner's own typo past an on-screen warning that names it). The owner field and the claim field refuse an address whose mixed-case checksum is wrong; the beneficiary editor shows "checksum does not match" and leaves Deploy and Queue enabled, then encodes the 20 bytes of the mistyped address. The loss is irreversible once the table is in force, because `distribute` is permissionless — recorded, not treated as enough to override the precondition. **Fixed in m04-t13, `app/src/index.html` `425cd51`:** the beneficiary row in `editorState` (`:940`) is now `isAddr(r.addr) && checksumOk(r.addr)` (`:959`), with `BAD_SUM`'s own sentence as the reason when `isAddr` passes and `checksumOk` fails, so the editor says what the owner field says — `grep -ic checksumOk app/src/index.html` → `9`, from a baseline of `8`. `addrField` is unchanged: it already showed the warning, and what moves is that Deploy and Queue now follow it. Evidence: `test/editor.test.mjs` lifts the region from `EMPTY_ROW` through `editorState` the way `ext.test.mjs` lifts `ext`, and its flipped-case row asserts `why === BAD_SUM` while the all-lowercase form of the same address stays `ok` (one case carries no checksum); the red planted by removing the `checksumOk` refusal fails that row with `a beneficiary address with a flipped case says what the owner field says`. In the browser (HANDOFF § AC 4) a flipped-case row shows the submit `disabled` with `checksum does not match — a character is likely wrong`, and the lowercase form enables it; before the fix the same case showed the submit **enabled**. |
| R6 | The widget turns host-supplied `data-*` attributes into live markup, including a `javascript:` link | `app/src/widget.js:198` (`data-link` into `href`, HTML-escaped but its scheme unchecked), with `:197` (`short(addr)` from `data-rake` concatenated unescaped) and `:218` (`mountAll` mounts every `[data-rake]`) | Medium | `fix` | Both legs (leg 1 Low, leg 2 Medium; the rollup adopts Medium because leg 1's ground — whoever supplies the attribute controls the page — does not hold on a host that renders sanitised user HTML and keeps `data-*`, which is a default sanitiser configuration rather than control of the host; there a commenter's `<div data-rake=… data-link="javascript:…//">` becomes a link that runs script in the host's origin on click). **This did not fall out of R2's fix and was not fixed with it:** R2's check is at `index.html`'s `ext`/`xlink`, and `widget.js` is a separate file with its own `esc` and `short`, minified separately into `app/dist/widget.js`; its `data-link` value is host-supplied rather than provider-supplied and wants a scheme allow-list, not a hex shape. **Fixed in m04-t13, `app/src/widget.js` `418ba57`:** `render` checks `data-rake` against `/^0x[0-9a-fA-F]{40}$/` before anything is written (`:189`) and a failing value paints `data-rake is not an address` with **no `short(addr)` in it**, returning before `fetchSnapshot` — which closes the `short(addr)` in the footer and the `addr` in the `href` together; the `href` is then built from `new URL(link || <default>, location.href)` inside a `try` and emitted only for `protocol === 'http:' || 'https:'` (`:229`), an allow-list rather than a denylist, so `grep -ic 'javascript:' app/src/widget.js` stays `0`. Evidence is the browser, because the IIFE's `render` is not reachable from node without a DOM (HANDOFF § AC 5): across four mounts on a scratch host page, `img` elements `0` and `a[href^="javascript:"]` `0`, the bare `data-link` resolving to the host page's own URL plus `#/distros/<seed>` and the `https:` mount to `https://example.com/app/#/distros/<seed>`, with no dialog fired. Before the fix the same page gave mount 1 an error line carrying the raw `short()` of the payload — `could not read distribution <img s…(1)> on anvil` — and mount 2 a live `href="javascript:alert(1)//#/distros/<seed>"`. |
| R7 | The percentage check and the basis-point encoding disagree, so the UI can queue a table the contract will refuse | `app/src/index.html:867-868` (the decimal total checked within `0.005`), `app/src/model.js:171-173` (`tableFrom` rounds each row to integer bps on its own), senders at `app/src/index.html:1322-1326` | Medium | `fix` | Leg 1 alone, and a genuine miss by leg 2, which read both functions but did not compare the two roundings. Three rows at `33.334%` total `100.002%`, which the check accepts, and encode as `3333 × 3 = 9999` bps; the sum of the rounded values is never checked. Behind a non-zero delay `propose` queues the action and it fails only at `applyQueued` — cancellable, but the change the owner meant cannot land. Leg 1 also notes that negative percentages are not rejected and that the zero address passes `isAddr`. **Fixed in m04-t13, `app/src/index.html` `425cd51`:** `editorState` (`:940`) now sums the rounded basis points — `bps = rows.map(r => Math.round((parseFloat(r.pct) || 0) * 100))` — and refuses `sum(bps) !== 10000` (`:951`), which is the arithmetic `Model.tableFrom` already applies, so the two cannot disagree again; the wording is unchanged (`total must equal 100% — X% unassigned/over`). Leg 1's two neighbours are closed in the same hunk: a negative share (`:953`) and the zero address (`:962`), both of which `isAddr` admits and the contract refuses (`src/Distribution.sol:332-344`). Evidence: `test/editor.test.mjs` — three rows at `33.334` → `ok: false` with `unassigned` in `why`, `33.33/33.33/33.34` → `ok: true`, a `-10` row → `negative`, the zero address → `zero address`; three separately planted reds (the decimal tolerance restored, the negative check removed, the zero check removed) fail exactly those three rows and nothing else. In the browser (HANDOFF § AC 4) the `33.334` case reads `bad` with the submit `disabled` and `total must equal 100% — 0.01% unassigned`; before the fix it read `ok` with the submit **enabled**. **Not a `src/` change:** the contract-side neighbour is the known-answer entry #54 (`propose` validating nothing at `src/Distribution.sol:220`), which is a different location and mechanism and is M03's, not this task's; R7 is the dapp's rounding and is fixable in `app/` alone. |
| R8 | `pairable()` does not verify the hash join it exists to protect | `app/broadcast.mjs:44-47` (`pairable` checks only one creation and equal receipt and transaction counts), `:63-68` (`creations()` trusts `blocks.get(t.hash)`), substitution at `app/build.mjs:48` | Medium | `fix` | Leg 1 alone, and a genuine miss by leg 2. The check requires neither unique hashes nor a receipt per hash: a log with two transactions under one hash and an equal number of receipts passes, and the creation takes the other transaction's block. The comment at `build.mjs:31-36` says the guard exists for m03-t06's mis-filed hash, and in the one-creation case that mis-filing is exactly what it lets through — a creation block that is too late becomes `__DISTRIBUTIONFACTORY_BLOCK__`, and every `Created` and history scan then silently starts after real events. No attacker: the input is forge's own log, and the defect is a guard passing the case it was written to catch. **Fixed in m04-t14, `app/broadcast.mjs` `d59a418`, closing [#235](https://github.com/dnznlabs/rake/issues/235):** `pairable` (`:113`) is now `joinFault(log) === null`, and `joinFault` (`:75`) applies the join's own three tests — hashes unique on both lists (`:80`), the two sets equal (`:88`), and the creation's receipt agreeing with it in `contractAddress` where it carries one and in `status` where it carries one (`:97`) — returning the clause that `assertPairable` names in its refusal (`:59`), so a reader learns what is wrong with the log and not only that something is. The file's own header claim is corrected with it: one creation per script *bounds the damage*; the join checks are what make it safe. Evidence: `test/build.test.mjs` gains six rows, each on a one-creation log — two transactions under `0xaa` with receipts `0xaa`/`0xbb` → `pairable` `false` and `/share hash 0xaa/`; the same shared hash with **both** receipts `0xaa`, which every other test passes because the two hash sets are both `{0xaa}` → `false`, `/share hash 0xaa/`, and `creations(...)[0].block` `null`; transactions `0xaa`/`0xbb` with receipts `0xaa`/`0xaa` → `false`, `/0xbb has no receipt/`; a receipt naming `0x3…3` against a transaction at `0x1…1` → `false`, `/names/` with both addresses; `status: '0x0'` → `false`, `/status 0x0/`; and the one-creation log every deploy script writes → `true` with `block` `0x7b` as the control. Three reds were planted one at a time: removing uniqueness leaves the matching-receipt row **`true !== false`** — `pairable` accepting the log whose creation takes the other transaction's block, which is leg 1's reproduction exactly — and makes the first row name `receipt 0xbb has no transaction` instead; removing the set equality makes the missing-receipt row name `two receipts share hash 0xaa`; removing the receipt agreement leaves both the `names` and the `status` rows `true !== false`. The Fixtures row and the working-tree row stay green, which is the check that the four tracked logs pass every new test. Grep: `grep -ic -F 'new Set' app/broadcast.mjs` → `2` (baseline `0`). No shipped byte moves for this row, so it is live on merge and starts no upload. |
| R9 | Anyone can make a token "recognised" for the cost of one `distribute` | `app/src/index.html:616` (`known` built from `Distributed`/`Escrowed` logs), with `:683`, `:1197`, `:1471` | Medium | `fix` | Leg 2 alone. `distribute(address)` is permissionless, so a spammer can send one unit of a token whose `symbol()` is `USDC`, distribute it, and from then on the token leaves the collapsed "unverified" list and is listed in the main ledger by its symbol with a live `distribute` button. The page's own advice at `:1582` ("once distributed it is listed above") and the docs' claim at `:1921` read as verification the set does not carry, and the 12-character symbol cap still admits `USDC` or a short URL. **Ruled 2026-11-19 ([#258](https://github.com/dnznlabs/rake/issues/258)), decision 57, option 1(a):** the recognised set stays anyone's and the page says what membership in it means — wording, not a product change. **Fixed in m04-t15, `app/src/index.html` `b31be0a`:** the ledger's warning under *other tokens received* (`:1769`, in `fundsHTML`) and `#/docs` § Receiving funds (`:2116`, in `docs`) each gain one sentence — `listed means distributed here at least once — not checked, not endorsed.` in the chrome's lowercase, `Listed means distributed here at least once — not checked, not endorsed.` in the docs' prose, after the sentence each already carried. **Not a `src/` change:** permissionless `distribute` is decision 6's design and is what makes the contract usable without the owner, and option 1(b) — the recognised set as the owner's — is what the ruling rejected. Evidence: `grep -ic -F 'distributed here at least once' app/src/index.html` → `2`, from a baseline of `0`; `test/docs.test.mjs` passes with the fourteen sections it pins, so no section was added for this; and m04-t15 HANDOFF § AC 6 records step 9 (e), which reads the lowercase sentence out of the ledger's `.status.warn` and the capitalised one out of `#/docs` on the built page. **This row moves a shipped byte**, so the sentence is live where the bundle is: it rides the upload m05-t01's Run B makes on the redeployed testnets (M05-D1, decision 54), and m04-t15 starts none. |
| R10 | Reverse names replace addresses without normalisation or a lookalike check | `app/src/index.html:450-455` (`nameSweep`), `:411-427` (`ensName`/`regName`), `:463-465` (forward lookup), `app/src/model.js:285-288` (`namehash`, no ENSIP-15) | Medium | `fix` | Leg 2 alone. A forward-confirmed name proves only that its holder set it. A mixed-script name — a Cyrillic `і`, a zero-width or bidi control — is printed verbatim in place of the address in the owner cell, in "transfer pending to …" and in every beneficiary row, with no length cap, and the address then survives only in `title` and the copy icon. **Fixed in m04-t13, `app/src/model.js` and `app/src/index.html` `a2378fe`:** `Model.plainName(name)` beside `namehash` (`:295`, exported at `:307`) returns `true` only for at most 64 characters matching `/^[a-z0-9-]+(\.[a-z0-9-]+)+$/` after `String(name)` — lowercase ASCII, digits, hyphens, at least one dot, nothing else, no normalisation attempted — and `nameSweep` writes the name only when it passes (`index.html:515`), so the gate sits at the one place a name replaces an address rather than at each of the three resolvers, which are unchanged. **ENSIP-15 in the page was considered and rejected:** it is a table of tens of kilobytes against a bundle this milestone is about to upload, and plain names are the ones this page's visitors read; a name that fails the gate keeps its address, which is the safe direction. Evidence: `test/model.test.mjs` — `vitalik.eth` and `a.b.c.eth` → `true`; a Cyrillic `і` (U+0456), a U+200B, `Vitalik.eth` and `eth` (no dot) → `false`; 64 characters → `true` and 65 → `false`. Two reds were planted and both failed as predicted: dropping the `^`/`$` anchors passes the Cyrillic name on its ASCII tail, and `< 64` for `<= 64` rejects the 64-character name. Two further candidate plants were measured and declared **not** usable because they do not red — `\w` for `[a-z0-9-]` (`\w` is ASCII-only in JavaScript) and `> 64` for `>= 65` — which is why neither is quoted as evidence. Decision 13 fixed the resolution order, not the rendering, so this was not a settled design point. |
| R11 | The inline-script guard matches `<script` case-sensitively | `app/inline-scripts.mjs:11` (`indexOf('<script')`) | Low | `fix` | Both legs (leg 1 Medium, leg 2 Low; the rollup adopts Low because the guard's stated job at `:1-6` is to stop our own bundle shipping in a form that silently does not run, its inputs are tracked source files, and leg 1's Medium rested on combining this with build-time injection, which is R4's precondition and rated there). `<SCRIPT src=…>` and `<Script defer>` are real external or deferred scripts the guard does not see; leg 1 confirmed this under Node. **Fixed in m04-t13, `app/inline-scripts.mjs` `2006896`:** `scriptTags` scans with a `RegExp` exec loop, `const open = /<script(?=[\s/>])/gi` (`:17`), which replaces both `indexOf` calls and the name check while keeping the quote-aware attribute scan and the lookahead that stops `<scriptable>` counting as a tag — `grep -ic -F "indexOf('<script'" app/inline-scripts.mjs` → `0`, from a baseline of `1`. Evidence: `test/inline-scripts.test.mjs` gains `['SRC, upper-cased tag', '<SCRIPT src="app.js"></SCRIPT>']` and `['defer, mixed case', '<Script defer>var a=1;</Script>']`; the red planted by dropping the `i` flag fails both rows with `assert.throws` finding no throw, which is exactly the shape of the defect — a real external and a real deferred script the guard did not see. |
| R12 | Decoded array lengths are unbounded, so a hostile response freezes the host tab | `app/src/widget.js:129` (`arr()` loops `u(p)` times, unbounded and unchecked against `hex.length`), with `app/src/eth.js:145-146` (`decOne` calls `new Array(len)` with a response-supplied length) and `nonceOf` from R3 | Low | `fix` | Both legs (leg 1 Medium, leg 2 Low; the rollup adopts Low because the result is availability only and the endpoint that would send the hostile length is the one the host chose in `data-rpc` — an endpoint that can already show any table it likes, per R14, and a frozen tab is less harm than a believed lie). **Fixed in m04-t13, `app/src/widget.js` and `app/src/eth.js` `418ba57`:** `arr` refuses a length word larger than the number of words the body has — `if (n > H.length / 64) throw 0` (`widget.js:137`) — and the throw lands in `decode`'s own `catch`, which returns `null`; `decOne` does the same before `new Array(len)`, with a named error, `array length ' + len + ' exceeds the data` (`eth.js:150`). Evidence: `test/widget.test.mjs` decodes the fixture with its table-length word rewritten to 100,000 and asserts `null`, and `test/abi.test.mjs` asserts `Eth.dec(['uint256[]'], …)` throws `/exceeds/`. **Both planted reds exceeded the plan's prediction rather than matching it**, and the measurement is the reason this row is worth reading: the plan expected the unbounded decoder to return a 100,000-row object in a few hundred milliseconds, so that an assertion of `null` would fail on a non-null value. Without the `arr` bound the node run instead died `FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out of memory` after 20.7s at about 4 GB, and the same mount in a browser killed the renderer outright (`page.evaluate: Target crashed`) on the first evaluate. So the availability harm this row is rated for is a crash rather than a freeze, at a length word four orders of magnitude below the 2³² the finding cites, and `100000` was chosen precisely because it was believed to be the gentle case. |
| R13 | Every address meant for verification is shown as 6 + 4 characters | `app/src/index.html:288` (`short`, used through `ext` everywhere), `app/src/widget.js:197` | Low | `design` | Leg 2 alone, and the mechanism is right: the visible form carries 32 bits, and a vanity address matching a trusted row's first and last four hex digits is cheap to grind, which is how address-poisoning campaigns work. It is `design` rather than deferred because `short()` is the dapp's deliberate display form and the full value is adjacent at every use — the complete address is in `title`, in `data-addr` and in `data-copy`, and `copyClick` copies all of it (`:373-382`) — so nothing is hidden from a reader who checks. How much of an address a row should show is a product decision about the table's width, not a defect to repair in `app/`; it is raised with this rollup rather than changed here. The related repair that *is* a defect is R10's, where a name replaces the address entirely. |
| R14 | The widget's `data-rpc` path does not check the chain, and does not check that the response is hex | `app/src/widget.js:153-156` (no `eth_chainId` on the RPC path, although the wallet path at `:159-161` makes the call), `:118-120` (`reader` does no hex check), `:197` (`short(snap.owner)` written unescaped) | Low | `fix` | Leg 2 alone. An RPC for chain X mounted under `data-chain="Y"` shows X's table labelled Y, and a non-hex response places four plus four raw characters into the footer. **This did not fall out of R2's fix and was not fixed with it:** the third sub-point is the same class of defect — a provider value reaching a markup sink without a shape check — but the sink is `widget.js`'s own `foot` string, not `index.html`'s `ext`/`xlink`, and the widget is a separate IIFE with its own `esc` and `short`, minified separately; `git diff --stat 08fee62 af4396c -- app/src/widget.js` prints nothing and `app/dist/widget.js` builds to 8,132 bytes, its baseline figure, which is the measurement that says so. **The hex half is fixed in m04-t13, `app/src/widget.js` `418ba57`:** `decode` refuses a non-hex answer before `reader` slices it — `if (!hex || !/^0x[0-9a-fA-F]+$/.test(hex) || hex.length < 642) return null;` (`:148`), the hex test deliberately ahead of the length test — so a non-hex response lands in the existing error state instead of the footer. Evidence: `test/widget.test.mjs` asserts `decode('0xzz' + fixture.slice(4))` → `null`, and the red planted by removing the hex test returns an object whose `owner` is `0xzzzz…zzzz`. In the browser (HANDOFF § AC 5) a stub endpoint answering 802 non-hex characters leaves the mount in `could not read distribution … · retry` with no `rk-f` footer, while the paired control mount — the same stub answering the real fixture — does paint a footer, so the error state is the code's and not a broken stub; before the fix that mount painted a footer reading `owner 0xzzzz…zzzz`. **The chain half stays `accepted`:** the host supplies both `data-rpc` and `data-chain`, so a mismatch is the host's own configuration, and an `eth_chainId` on the RPC path is a second request against the one-`eth_call` contract — `grep -ic eth_chainId app/src/widget.js` is unchanged at `2`. A JSON-RPC batch would keep one round trip, but which public endpoints accept a batch is unmeasured, and m04-t13 does not add an unrehearsed mechanism to a bundle about to be uploaded. (The 8,132-byte figure above is m04-t04's measurement at `af4396c`; m04-t13's widget builds to 8,509 bytes.) |
| R15 | Bidi control characters in chain strings are rendered without isolation | `app/src/widget.js:201`, `:207`; `app/src/index.html:734`, `:1802` | Low | `fix` | Leg 2 alone. `esc()` escapes `&`, `<`, `>` and `"` and keeps U+202E and U+2066–2069, and there is no `<bdi>` and no `unicode-bidi: isolate`, so one row's name can visually reverse the rest of the compact widget's line. **Fixed in m04-t13, `app/src/index.html` and `app/src/widget.js` `e5259e5`:** `esc` in both files now removes `/[‪-‮⁦-⁩]/g` before escaping the four characters it already escaped (`index.html:307`, `widget.js:82`) — one `replace` added in front of the same function, so **every site that already called `esc` is covered at once**, including the `title` attributes no `<bdi>` can reach. `grep -ic 'u202E'` → `1` in each file, from `0`. **`<bdi>` and a `unicode-bidi` rule were considered and rejected:** isolation would leave the `title` sites uncovered and cost a class per site, where dropping the controls covers every sink in one line and costs a name nothing a reader would miss, since a plain RTL name renders correctly without explicit controls. Evidence: `test/ext.test.mjs` and `test/widget.test.mjs` each gain two rows — `esc('a‫b')` → `'ab'` and a row carrying all nine code points — and the red planted by removing the `replace` in each file fails both of that file's rows with the control present in the actual value. The controls are written as `\u` escape text in the source and in the tests, so the acceptance grep and the next reader can both see them. |
| R16 | The recent list crashes on a distribution read through the fallback | `app/src/index.html:1803` (reads `d.pending.length`), `:577` (the fallback returns `pending: null`) | Low | `fix` | Leg 2 alone, and the plainest bug in the pass: the `TypeError` is thrown outside the `try`, so `#/distros` stays on "reading…" for good, and with R3's `addRecent` a single visit to a hostile link is enough to cause it. **Fixed in m04-t13, `app/src/index.html` `05a9613`:** the recent-list row reads `(d.pending && d.pending.length)` (`:1903`), which is the shape the fallback returns (`pending: null`). It was sequenced with R3 in the same commit, because R3's `addRecent` is how the bad entry got into `rake.recent` in the first place. Evidence is the browser (HANDOFF § AC 7), because the crash is in the list paint: with `nosnapshot=1` forcing the fallback, the row paints with no queue dot and `page errors: none`; before the fix `#/distros` stayed on `reading…` with `Cannot read properties of null (reading 'length')` in `page errors`, thrown outside the `try` and so permanent. **One acceptance grep for this row cannot be satisfied as written and is not:** m04-t13 § AC 7 asks for `grep -ic -F 'd.pending.length' app/src/index.html` → `0`, but the replacement text the plan prescribes *contains* that substring, so the count is `1` at the head and would be `1` for any correct fix of this shape. What the grep was written to catch — an unguarded read — is measured instead by `grep -c 'd\.pending && d\.pending\.length'` → `1` with the only occurrence of `d.pending.length` inside it, i.e. zero unguarded reads. |
| R17 | `tx()` does not re-check the chain before sending | `app/src/index.html:147-158` (no `eth_chainId` re-read and no `chainId` field), `:109` (the `chainChanged` reload exists only if `P.on` does) | Low | `fix` | Leg 2 alone. With a provider that has no event emitter, a mid-session chain switch sends the write to the same address on the other chain. **Fixed in m04-t13, `app/src/index.html` `89a84c3`:** `tx` re-reads `eth_chainId` between the preflight and the send (`:163`) and refuses anything other than `CFG.chainId`, saying `your wallet is on <chain> — this app lives on <chain>` (`:165`) and returning `{ ok: false, stage: 'chain' }`; the transaction also carries `chainId`. `grep -ic eth_chainId app/src/index.html` → `2`, from a baseline of `1`. `wrongChain()` at boot stays — this is the same test at the moment it matters. Evidence is the browser, since the defect is a wire-level one (HANDOFF § AC 6): with `page.route` answering `eth_chainId` as `0x1` and passing every other method through, a pressed write produced **zero** `eth_sendTransaction` bodies on the wire and a status line reaching `your wallet is on mainnet — this app lives on anvil`; with the route restored, exactly **one** send and a receipt status of `0x1`. Before the fix the same flip produced **one** `eth_sendTransaction`, and `eth_chainId` never appeared among the methods the route observed at all — the page did not ask. **The `chainId` field's effect in MetaMask is unmeasured here:** anvil accepts a matching `chainId`, and the re-read is the measured check; a wallet that validates the field enforces it on its own side. |
| R18 | The featured address, and so the support payment, is taken from the provider instead of being computed | `app/src/index.html:515-517` (`predict(featuredSalt)` read through `P`), `:1973` (`giveBind` sends to `S.featured`) | Low | `fix` | Leg 2 alone. The page already has keccak, the factory address and the salt, so the CREATE2 address could be computed locally; as written, a lying provider names the recipient of the docs' "support its authors" payment. **Fixed in m04-t14, `app/src/index.html` `c8fe478`, closing [#235](https://github.com/dnznlabs/rake/issues/235):** `CFG` gains `impl: '__DISTRIBUTION__'` (`:34`), resolved by the build from the factory's own creation log — the implementation is created inside the factory's constructor under salt zero, so it is an `additionalContracts` entry that `app/broadcast.mjs` now yields and recomputes; `predictLocal` beside `CLONE` (`:399`) hashes the 54 bytes `predict` hashes (`src/Distribution.sol:489-499`), the 9-byte init prefix in front of the 45 runtime bytes `CLONE` already carries; `load()` keeps both provider reads and takes the provider's featured address only where it equals the computed one, otherwise setting `S.featured` `null` and `S.featuredLie = { said, computed }` (`:610-612`); `#/docs` § Economics paints, in place of the support form, `this page computes the featured distribution at <computed>; your wallet's provider answered <said> instead — the support form is not shown.` (`:2016`), and the landing returns before `loadDistro` when there is no featured address (`:1137`). **`CFG.impl` and never `S.impl`**, which is why this could not share R3's inputs: a provider that lies about `predict()` lies about `implementation()` too. Evidence: `test/ext.test.mjs` lifts `predictLocal` with the deployed factory and implementation and pins three rows — the DNZN salt → `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`, decision 50's address on both testnets; the same salt with its last byte `02` → a different address of the same shape; a lowercase `CFG.impl` → the same answer. The red planted by dropping the 9-byte init prefix and hashing the 45 runtime bytes alone fails the first row with `0x2319b9ebC0f2110f80bA0e6DD3975e2106CEbd81`. In the browser (m04-t14 HANDOFF § AC 7), on the dev chain through `?rpc=&from=`: with the provider answering truthfully, `#/docs` paints the form at `0x9b40…1e37`, which is also what anvil's own `predict()` returns for a factory and implementation nobody computed by hand; with `page.route` answering `predict(bytes32)` with a `0x…dead`-ending word and passing the other five calls through, `#give-go` is absent, the only `.notice.err` reads `this page computes the featured distribution at 0x9b40…1e37; your wallet's provider answered 0x0000…DEaD instead — the support form is not shown.`, the landing's `#featured` slot is empty and `page errors: none`. Before the fix the same route left `#give-go` **present** with the form naming `0x00000000000000000000000000000000dEadDEaD` — the payment recipient a hostile provider chose. **Nothing else reads the computed address:** `S.impl` keeps the provider's value for `isClone`, `MAX_BENEFICIARIES()` and `GRACE()`, and the create screen's `predict` keeps the provider's; replacing either is a runtime change beyond this row and is raised in the handoff rather than made. Greps: `grep -ic -F '602d5f8160095f39f35f5f365f5f37365f73' app/src/index.html` → `1` (baseline `0`), `grep -ic -F '__DISTRIBUTION__'` → `1` (baseline `0`), `grep -ic -F 'predict(bytes32)'` → `2` unchanged — no provider read is removed, one comparison is added. **This row is the one of the three that moves a shipped byte** (`gzip 46189 → 46448`), so it rides the next upload rather than being live on merge; m04-t14 starts none. |
| R19 | Vault calldata is copied with no target, chain or value shown beside it | `app/src/index.html:931`, `:956-964`, `:186-187` | Info | `fix` | Leg 2 alone, Info by its rating. Copying calldata for a vault to submit is decision 7's design; what the finding names is that the three things a signer needs to check it against — the target address, the chain and the value — are not printed with it. **Ruled 2026-11-19 ([#258](https://github.com/dnznlabs/rake/issues/258)), decision 57 § 2:** a plain-labelled target, chain and value line beside the copied calldata. **Fixed in m04-t15, `app/src/index.html` `ae4787d`:** the copy handler passes the write through (`:1114`, in `bindWrites`), and both branches of `copyCalldata` (`:205`) — the `copied · N bytes` status and the textarea fallback — carry one `.cdmeta` line built by `cdCheck` (`:204`): `for <target> on <chain> · value <v> — check these three in your vault before signing.` The target prints through `ext`, the sink every address the page prints goes through (R2), so nothing here is escaped by hand; `<v>` is the page's own ETH formatter (`:336`), and no `wctl` write carries a value today (`:1482`, `:1496`, `:965`), so the line reads `value Ξ0.0000` until one does. Evidence: `grep -ic -F cdmeta app/src/index.html` → `2`, one per branch, from a baseline of `0`, with `grep -ic -F 'copied ·'` → `1` and `grep -ic -F 'copy calldata for your vault'` → `1` unchanged — one line is added and no control moves. In the browser (m04-t15 HANDOFF § AC 7), on the dev chain through `?rpc=&from=<the vault's signer>`: pressing a `copy calldata for your vault` control puts the line in `#txs`, naming the distribution's address through `ext` (so `data-addr` carries it), `anvil`, and `value Ξ0.0000`; with `navigator.clipboard.writeText` replaced by a function that throws, `copyCalldata` takes its `catch` and the same line sits under the textarea. **This row moves a shipped byte**, so it rides m05-t01's Run B on the redeployed testnets (M05-D1, decision 54); m04-t15 starts none. |
| R20 | `signsFor` believes any owner contract's `isOwner` answer | `app/src/index.html:1130-1136`, `:1145` | Info | `design` | Leg 2 alone, Info by its rating, and the rollup states the answer in the entry: this affects the UI only, because the copied calldata still needs the real vault to execute it. `signsFor` decides whether to offer the signer-oriented wording and the calldata control, not whether anything can be submitted; a contract that lies about `isOwner` buys a wrong sentence and a calldata blob its own vault will refuse. The authority is the vault, where it belongs, so there is nothing to repair in `app/`. |
| R21 | `target="_blank"` links carry `noopener` but not `noreferrer` | `app/src/index.html:54`, `:370`, `:1881`, `:1897-1898`, `:1955`, `:1958`; `app/src/widget.js:198` | Info | `fix` | Leg 2 alone, Info by its rating. The security half is already closed — `noopener` is present at every site, so there is no reverse-tabnabbing — and what is left is a referrer leak: the `Referer` header still goes out, so the widget's link tells the gateway the URL of the host page that embedded it. That is a real leak on a page we do not control and it is not design, because `app/src/widget.js`'s own header promises "no analytics". **Fixed in m04-t13, `app/src/index.html` and `app/src/widget.js` `e5259e5`:** `rel="noopener"` becomes `rel="noopener noreferrer"` at every `target="_blank"` site — seven in `index.html` (`:54`, `:420`, `:1981`, `:1997`, `:1998`, `:2055`, `:2058`) and one in `widget.js` (`:231`), eight in all. Measured by grep rather than by counting the diff: `grep -ic noreferrer` → `7` in `index.html` and `1` in `widget.js`, from `0` and `0`, with `grep -ic noopener` **unchanged** at `7` and `1` — the second half of that pair is what shows the token was added rather than substituted, which a `noreferrer` count alone cannot distinguish. The leak this closes is the widget's: its own header promises "no analytics", and a `Referer` to the gateway is one. |
| R22 | The widget's stylesheet is global, and the host can suppress it | `app/src/widget.js:166-168`, `:50-76` | Info | `design` | Leg 2 alone, Info by its rating, and it describes the widget's stated design rather than a departure from it: one stylesheet injected once under `#rk-css` instead of a `style=` string per element, which the file's own header argues is smaller than repeating the declarations and "the one thing a host cannot override by accident" (`app/src/widget.js:41-43`). The widget deliberately inherits the host — font from the host, ink from `currentColor` — so a host that embeds it can always restyle or suppress it, and a host that wanted to could simply not include the script. Nothing the widget renders is a security claim that styling could falsify; the figures are in the text, not in the bars. |
| R23 | The dapp can be framed | `app/src/index.html:972-983` (`holdToFire`) | Info | `accepted` | Leg 2 alone, Info by its rating. A meta CSP cannot set `frame-ancestors`, so framing can only be refused by a response header, and **`app/` has no byte that can set one** — which is what makes this row not a `fix`. **The honest half: `src/` is not obviously powerless here.** `App.request` (`src/App.sol:90-107`) is the ERC-5219 entry point and it does return `KeyValue[] memory headers`, today one `Content-Type` per route, so a contract-supplied `Content-Security-Policy` is at least expressible. **It is `accepted`, not a `fix`, for three reasons and the first alone is sufficient:** no `src/` byte moves in this task (TASK.md § Out of scope, "Any `src/` byte"); whether a given gateway forwards a contract-supplied header other than `Content-Type` is **unmeasured** — step 0 read the served headers and saw the gateway set its own `web3-*` and `access-control-allow-origin: *`, which is not the same question; and a header a gateway drops is a refusal the visitor never receives, so the boundary is still the gateway the visitor chose, as in R1 (decision 53). A "hold for 3 seconds" control is a classic clickjacking target and the wallet's confirmation is the only real gate, which is outside our code too; what `app/` already does is make the control deliberate rather than a single click. Recorded so that Phase 4 reads it as a property of the hosted path, and so that the `src/` question is on the record as open rather than answered here. |
| R24 | The landing widget may read through a different wallet from the page | `app/src/index.html:106`, `:1024`; `app/src/widget.js:157` | Info | `accepted` | Leg 2 alone, Info by its rating. The page uses the first EIP-6963 announcer while the inlined widget reads `window.ethereum`, so with two extensions installed the landing widget can read through one wallet and the rest of the page through another, and the figures on one screen then come from two chains' worth of provider state. For the standalone widget on a host page `window.ethereum` is the only thing available and is correct; the inconsistency is in the inlined copy. **Accepted for this release only, and carried past m04-t13**; the remedy — pass the page's provider to the inlined mount — changes the widget's public `mount` signature, and m04-t13 would not spend that on an inconsistency with no silent wrong read: the widget checks `eth_chainId` against `data-chain` and fails loudly on a mismatch. |

---

## Carried issues — disposition

Every issue carried into this milestone, what was decided, and where the ruling is. The "found by"
column records which leg reported it, from `AUDIT.md`'s grading section.

| Issue | Decided | Where the ruling is | Found by |
|---|---|---|---|
| [#18](https://github.com/dnznlabs/rake/issues/18) — `receive()` over the 2,300-gas stipend | Documented, not changed. It holds while the implementation is warm: 1,662 gas warm with the event, 250 without; cold it is **4,162**, measured for [#174](https://github.com/dnznlabs/rake/issues/174) and pinned in `test/ColdStipend.t.sol`, which supersedes the "about 2,750" this row carried from m01-t01. A contract paying in with `transfer`/`send` therefore fails, and should pay with `call`. | m01-t01's measurements; criterion 5's qualifier, now in [`docs/brainstorming/PROJECT_OVERVIEW.md`](docs/brainstorming/PROJECT_OVERVIEW.md) | **leg 2 only**, with a PoC — F7; 2026-10-31: leg 2 only again, below its own threshold |
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

From `forge test --list --json`: **107 tests** in seven suites — `DistributionTest` 57, `AppTest` 27,
`DistributionInvariantsTest` 7, `DistributionFactoryTest` 6, `ColdStipendTest` 4, `PushGasTest` 3,
`TableCapTest` 3. The groups below account for **102** of those; the five outside every group are
`ColdStipendTest`'s four and `DistributionTest`'s 57th, all added after this section was last
reconciled. Grouped by the property each group holds. A property asserted by a test is stronger than a finding: a
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
m03-t08 from 95,049,000 because the figure moves with the bytecode; 95,226,000 since the solc 0.8.38
pin of 2026-11-16),
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

8 + 15 + 11 + 20 + 4 + 7 + 21 + 5 + 11 = **102**, of the suite's 107. The five not in any group
above are `ColdStipendTest`'s four and `DistributionTest`'s 57th; § Coverage lists two of the four
among the tests the coverage binary cannot run, which is where they are accounted for instead.

---

## Coverage

What the tests reach, as a figure a reader can re-run — the second of decision 56's three
additions. `make coverage` is the gate; `scripts/coverage-floor.sh` is the script it runs, and it
carries the exclusion list with a reason beside each name.

```
forge coverage --ir-minimum --report summary --no-match-test "$SKIP" --no-match-path 'test/TableCap.t.sol'
```

Measured on 2026-11-19 on this branch through the devbox pin, forge `1.7.1-dev`, after § Mutation's
17 new tests: exit 0, 37 s, **100 tests passed, 0 failed** over six suites — 100 = 124 − 21 − 3.

| file | lines | branches | floor (lines / branches) |
|:--|:--|:--|:--|
| `src/App.sol` | **96.20 % (76/79)** | **100.00 % (13/13)** | 95 / 99 |
| `src/Distribution.sol` | **90.16 % (165/183)** | **92.11 % (35/38)** | 89 / 91 |

Functions are 100 % on both files (16/16 and 29/29). Statements and functions are printed, not
gated. The `Total` row the command prints counts `test/` and `lib/` and is **not** the figure; the
two `src/` rows are. The floors are the measured figures rounded down and one point under, so
ordinary drift is not a red build and a real regression is.

**The floors moved with the figures, deliberately.** At `e770054` they were 91/91 and 88/88, set
from what this branch inherited; § Mutation's tests took `App` from 92.41 %/92.31 % to
96.20 %/100.00 % and `Distribution`'s branches from 89.47 % to 92.11 %, and a floor five points
under the figure printed above is a gate that does not hold the number the reader is being shown.
On `App.sol`'s 13 branches one branch is 7.7 points, so the 99 floor means all 13 — at that
denominator there is no sub-point drift to absorb.

**Two things about re-running it.** The gate reports only on a fresh compile: run immediately after
another `forge coverage`, it prints `Nothing to compile`, emits no summary, and the script then
fails with `no 'Ran N test suites' line` rather than a floor verdict — failing safe, but it is not a
floor result and must not be read as one. And a scratch copy of the script run from outside the
repository returns that same empty result, so the raised-floor proof below is produced by copying
the script to a dotted name inside `scripts/` and deleting it afterwards.

`--ir-minimum`'s source map is "relatively accurate" by forge's own help text, so these numbers are
approximate to the line — in particular the assembly blocks below are reported uncovered while
being plainly exercised by passing tests.

**The script gates the row count too.** It asserts that the number of `src/` rows it parsed equals
`ls src/*.sol | wc -l` (2 here) and that every row has a floor, and exits non-zero naming the file
otherwise. A third contract added with no floor is a red run that names it, not a green one that
gates two files and ignores the third.

### Why 22 of the 124 tests are excluded

`forge coverage` does not run clean on `main`, and the reason is the instrument, not the suite. The
paired control is `forge test` on the same tree: exit 0, 124 passed. `--ir-minimum` recompiles at
minimal optimisation and coverage inserts per-line counters, so **gas changes by construction** —
and this suite asserts measured gas frames on purpose, the 2,300-gas stipend behaviour among them.
`--optimize true --optimizer-runs 1000` is accepted and ignored by 1.7.1 (same exit, counts and
rows).

**The membership test is not coverage.** `FOUNDRY_OPTIMIZER=false forge test`, with no coverage
involved at all, fails the same 22 — exit 1, **100 passed / 22 failed, 122 enumerated**, the same
totals the coverage run reports. A test that passes with the optimizer off is **not** excluded
whatever else it does.

**The cross-check is forge's own per-suite totals, not a name list.** It prints
`Encountered 2 failing tests in …ColdStipendTest`, `18 …DistributionTest`, `1 …PushGasTest` and
`1 …TableCapTest` — 22, and the same 2 / 18 / 1 split as before this branch, so none of
§ Mutation's 17 new tests fails with the optimizer off and the list below is still 21 names.
Reaching for those totals rather than parsing names is deliberate: a `\[FAIL[^]]*\]`-style class
**stops at a fuzz counterexample's embedded `]`** and silently drops `testFuzz_` names, and a `]`
anchor without the `[FAIL` prefix matches `[PASS]` lines too and returns the whole suite. Both were
measured here while re-checking this list; forge's own arithmetic is the figure that cannot be
mis-parsed.

Twenty-one go by name, in `ColdStipendTest` (2), `DistributionTest` (18) and `PushGasTest` (1):

`test_claimEthToOtherAddress`, `test_claimEthToSelfUncapped`, `test_claimReentrancyLocked`,
`test_coldReceiveFitsTheMeasuredFrame`, `test_createAcceptsZeroOwnerBornRenounced`,
`test_delayZeroOwnerSweepsAtomically`, `test_distributeDiscardsEthReturnData`,
`test_distributeReleaseDistributeKeepsReserved`, `test_escrowRevertingEthRecipientOthersPaid`,
`testFuzz_claimMovesExactlyEscrow`, `testFuzz_roundingNeverExceedsAmount`,
`test_hookRecipientStarvesLaterRows`, `test_realPathPaysASafeAndAVaultClone`,
`test_receiveUnderStipend`, `test_receiveUnderStipendPassesOnceImplementationIsWarm`,
`test_reentrantRecipientIsEscrowed`, `test_releaseFailedEthRecipient`,
`test_releaseStillBubblesEthReason`, `test_renounceFreezes`, `test_rounding_3333_3333_3334`,
`test_selfRowRecycles`.

`TableCapTest` is excluded **by path**, not by name: what reverts there is its `setUp`, so the suite
contributes one failure line and no per-test rows. That is also why coverage enumerates **122**
where `forge test` enumerates **124**, and why **no figure in this gate is a test count** — a count
would compare two different populations. 100 = 124 − 21 − 3.

The regex the script builds is `^(name|name|…)\(`, and the trailing `\(` is load-bearing:
`--no-match-test` matches the signature, so `^(…)$` matches nothing — and a pattern that matches
nothing floors the whole suite and reads as a pass. Without the `\(` a listed name excludes every
test it prefixes, and the collision is inside this list: `test_receiveUnderStipend` prefixes
`test_receiveUnderStipendPassesOnceImplementationIsWarm`.

**The cost of the exclusion, stated.** The lines those 21 tests alone reach are reported uncovered.
Against the same run without exclusions on this branch (exit 1, 100 passed / 22 failed, 122
enumerated, `src/Distribution.sol` 90.71 % lines and 94.74 % branches, `src/App.sol` unchanged at
96.20 %/100.00 %), the difference is exactly **one line and one branch** of `Distribution` and
**nothing at all** of `App` — the same one-line, one-branch gap the figures showed at `e770054`.
The standing consequence: a new `test/` assertion that pins gas joins the list in the same PR, or
`make coverage` goes red. **§ Mutation's `test_claimBubblesLongReason` was caught by exactly that
rule while this task was being built**, and rewritten rather than excluded: it funded a distribution
through `PlainSender.transfer`, under the 2,300-gas stipend, which made the whole case a measured
gas frame that fails with the optimizer off. It funds with `vm.deal` instead.
`test_claimNamesFailureAtThirtyTwoBytes` reaches the same line from the other side of the boundary
and was written with `vm.deal` from the start, on the strength of that recorded lesson rather than
by repeating it. Between them, 17 new tests left the list at 21 and not 23.

This measurement is Elanik's finding on
[#262](https://github.com/dnznlabs/rake/issues/262#issuecomment-7002043948), reproduced by the
architect on the same commit, and the row-count assertion is their second review on
[#268](https://github.com/dnznlabs/rake/pull/268#issuecomment-7002429826).

### The uncovered lines

**3 in `App` and 18 in `Distribution`**, from the lcov report of the excluded run on this branch —
down from 6 and 19, and the three that closed are the three § Mutation sent tests at. The lcov
reconciles with the summary exactly: `App` 79 instrumented and 3 uncovered is 76/79, `Distribution`
183 and 18 is 165/183.

| file:line | what it is |
|:--|:--|
| `App.sol:203-205` | the `extcodesize`/`extcodecopy` assembly of `_requireChunk` — exercised, unattributed by the `--ir-minimum` source map |
| `Distribution.sol:110` | the transient lock's revert arm |
| `Distribution.sol:296, 310` | `_clearQueue` from the renounce and accept paths — **reported uncovered and demonstrably executed**: `test_renounceLeavesNoPendingOwner` runs `:296` and asserts the state it leaves. The same source-map approximation as the assembly rows, on a line that is not assembly |
| `Distribution.sol:412` | the capped `call` of `_push`, in assembly |
| `Distribution.sol:423` | `_bubble`'s `revert` with returned data, in assembly |
| `Distribution.sol:473-479, 481` | the clone's `create2` and its `DeploymentFailed` arm, in assembly — exercised by every `create` test, unattributed |
| `Distribution.sol:493-497` | `predict`'s init-code hash, in assembly — same |

**Closed by this branch:** `App.sol:121` (the lock check on `setChunks`, now
`test_setChunksRevertsWhenLocked`), `App.sol:155-156` (`setVersion`'s assignment and its event, now
`test_setVersionSetsAndEmits`) and `Distribution.sol:212` (`claim`'s long-reason bubble, now
`test_claimBubblesLongReason` and `test_claimNamesFailureAtThirtyTwoBytes`). All three were
survivors in the campaign below, which is the plan's expectation holding: the uncovered list and the
survivor list pointed at the same lines.

---

## Mutation

Whether the assertions bite — the third of decision 56's additions, and the one the other two
cannot answer. Coverage says a line ran; a mutation campaign says that changing it makes a test go
red. `make mutate` is the campaign, `audits/mutation/e770054/` is the record, and every mutant the
suite did not catch has a row below: **92 rows for 92 survivors**, out of **847 compiling mutants**.

**Score, per contract and overall**, in the tool's own `N caught of M`:

| contract | caught of compiling | uncaught | compile failures | attempted |
|:--|:--|:--|:--|:--|
| `Distribution` | 529 of 584 | 55 | 277 | 861 |
| `App` | 186 of 223 | 37 | 155 | 378 |
| `DistributionFactory` | 40 of 40 | **0** | 40 | 80 |
| **overall** | **755 of 847** | **92** | **472** | **1,319** |

**There are two logs, because the tool drops a contract silently.** `slither-mutate` mutates one
contract per `Mutating contract` section and takes that contract's own line range, so the second
contract declared in a shared file is never reached. `DistributionFactory` lives in
`src/Distribution.sol:432`, and the first run named all three contracts, listed all three under
`Preparing to mutate contracts`, and emitted sections for two: its mutated lines stop at `:423`,
with zero mutants at or after `:432`. `campaign-factory.log` beside it is the second invocation,
naming the factory alone. `audits/README.md` § Provenance carries the commit, versions, host, wall
times and the reason the first run is not the whole story.

**No survivor is a real defect, so there is no § Stop.** Every `test` cell below is the suite having
been silent about behaviour `src/` already gets right; no mutant exposes a promise the code fails to
keep, and no `src/` byte moved in this task. The two shapes the plan flagged to read first
(`TASK.md:224`) both came back clean: **#54's did not survive at all** — `propose` has no survivor
on its validation — and **#22's is caught**, every compiling mutant across the factory's
salt-prefix region (`:460`-`:489`) among the 40.

**What the rows cost.** 29 survivors needed a test and got one, from **15 new tests**; 2 are
`unreachable`; 61 are `equivalent`, of which **5 are pinned** by a test that passes on both the
original and the mutant, because an equivalence argued from control flow is an opinion the campaign
cannot check. 17 new tests in total, 124 in the suite against 107 at `e770054`.

Four themes carry 24 of the 29: **`setVersion` was untested end to end** (3 rows), **`claim`'s
decision-24 failure split was unpinned while `release`'s was pinned** (4), **`GRACE`'s length was
pinned by nothing** (4 — the window could be rewritten to 14 seconds or 14 weeks and the suite
stayed green), and **nine event emissions were never asserted** (9). The two worth reading on their
own are `sum != BPS_TOTAL` relaxed to `sum <` — which would accept a beneficiary table summing above
10,000 and leave `distribute` reverting for the clone's whole life — and `setChunks` after `lock()`,
where three of the five one-way doors were pinned and two were not.

**How to re-run one row.** Copy the survivor's file over its source and run the named test: it
passes on the branch and fails on the mutant. All 29 were proved that way, and the 5 pinned
equivalences the other way round — passing on both. `audits/mutation/e770054/patches_files.txt` is
the same 92 changes as one unified diff if a hunk is easier to read than a whole file.

A note for anyone matching a row against a survivor file: for a handful of `ROR` survivors the file
the tool writes **duplicates the sub-expression it rewrote** — `:332` becomes
`n < 0 || n > MAX_BENEFICIARIES || n > MAX_BENEFICIARIES`, where the log prints only
`n == 0 || n > MAX_BENEFICIARIES ==> n < 0 || n > MAX_BENEFICIARIES`. The duplicate is idempotent
inside an `||`, so the file and the log agree on behaviour; the rows below quote the log, as the
plan asks.

| mutator | file:line | mutation (as the log prints it) | test or reason |
|:--|:--|:--|:--|
| RR | `src/Distribution.sol:212` | `'_bubble(data)' ==> 'revert()'` | `test test_claimBubblesLongReason` |
| RR | `src/Distribution.sol:386` | `'_bubble(data)' ==> 'revert()'` | `test test_distributeBubblesBalanceOfReason` |
| RR | `src/App.sol:155` | `'version = v' ==> 'revert()'` | `test test_setVersionSetsAndEmits` |
| RR | `src/App.sol:156` | `'emit VersionSet(v)' ==> 'revert()'` | `test test_setVersionSetsAndEmits` |
| CR | `src/Distribution.sol:235` | `'emit Queued(hash, n, eta, action)' ==> '//emit Queued(hash, n, eta, action)'` | `test test_proposeEmitsQueued` |
| CR | `src/Distribution.sol:254` | `'emit Applied(hash)' ==> '//emit Applied(hash)'` | `test test_applyQueuedEmitsApplied` |
| CR | `src/Distribution.sol:297` | `'return;' ==> '//return;'` | `equivalent (pinned: test_renounceLeavesNoPendingOwner)` — without the `return`, `:299` re-assigns the `pendingOwner = address(0)` that `:295` wrote, because `owner` was zeroed at `:294` and `owner_` is itself zero |
| CR | `src/Distribution.sol:355` | `'delete _pendingIndex[hash]' ==> '//delete _pendingIndex[hash]'` | `equivalent` — the orphaned entry is unreadable: both readers revert on `eta == 0` first, the caller deletes `queued[hash]` before `_remove`, and a hash never recurs because the nonce is in its preimage (`:224`) |
| CR | `src/Distribution.sol:373` | `'delete _pendingIndex[hash]' ==> '//delete _pendingIndex[hash]'` | `equivalent` — the orphaned entry is unreadable: both readers revert on `eta == 0` first, the caller deletes `queued[hash]` before `_remove`, and a hash never recurs because the nonce is in its preimage (`:224`) |
| CR | `src/App.sol:115` | `'emit ChunksSet(chunks.length, gzipped)' ==> '//emit ChunksSet(chunks.length, gzipped)'` | `test test_documentMutatorsEmitTheirCounts` |
| CR | `src/App.sol:129` | `'emit ChunksSet(ptrs.length, gzipped_)' ==> '//emit ChunksSet(ptrs.length, gzipped_)'` | `test test_documentMutatorsEmitTheirCounts` |
| CR | `src/App.sol:137` | `'emit WidgetChunksSet(widgetChunks.length)' ==> '//emit WidgetChunksSet(widgetChunks.length)'` | `test test_documentMutatorsEmitTheirCounts` |
| CR | `src/App.sol:150` | `'emit WidgetChunksSet(ptrs.length)' ==> '//emit WidgetChunksSet(ptrs.length)'` | `test test_documentMutatorsEmitTheirCounts` |
| CR | `src/App.sol:179` | `'emit AppLocked()' ==> '//emit AppLocked()'` | `test test_documentMutatorsEmitTheirCounts` |
| SBR | `src/Distribution.sol:59` | `'uint256 private constant PUSH_GAS = 100_000' ==> 'uint256 private immutable PUSH_GAS = 100_000'` | `equivalent` — an inline-initialised `immutable` holds what the `constant` held; it changes deployed bytecode, which is m05-t02's attestation, not behaviour |
| SBR | `src/Distribution.sol:59` | `'uint256 private constant PUSH_GAS = 100_000' ==> 'uint128 private constant PUSH_GAS = 100_000'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/Distribution.sol:60` | `'uint256 private constant BPS_TOTAL = 10_000' ==> 'uint128 private constant BPS_TOTAL = 10_000'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/Distribution.sol:65` | `'uint256 public constant GRACE = 14 days' ==> 'uint256 public constant GRACE = 14 seconds'` | `test test_graceWindowIsFourteenDays` |
| SBR | `src/Distribution.sol:65` | `'uint256 public constant GRACE = 14 days' ==> 'uint256 public constant GRACE = 14 minutes'` | `test test_graceWindowIsFourteenDays` |
| SBR | `src/Distribution.sol:65` | `'uint256 public constant GRACE = 14 days' ==> 'uint256 public constant GRACE = 14 hours'` | `test test_graceWindowIsFourteenDays` |
| SBR | `src/Distribution.sol:65` | `'uint256 public constant GRACE = 14 days' ==> 'uint256 public constant GRACE = 14 weeks'` | `test test_graceWindowIsFourteenDays` |
| SBR | `src/Distribution.sol:65` | `'uint256 public constant GRACE = 14 days' ==> 'uint256 public immutable GRACE = 14 days'` | `equivalent` — an inline-initialised `immutable` holds what the `constant` held; it changes deployed bytecode, which is m05-t02's attestation, not behaviour |
| SBR | `src/Distribution.sol:65` | `'uint256 public constant GRACE = 14 days' ==> 'uint128 public constant GRACE = 14 days'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/Distribution.sol:72` | `'uint256 public constant MAX_BENEFICIARIES = 107' ==> 'uint128 public constant MAX_BENEFICIARIES = 107'` | `equivalent` — 107 fits, and mixed arithmetic promotes; the `public` getter's ABI return type narrows, which no caller in `test/` or `app/` reads as a width |
| SBR | `src/Distribution.sol:72` | `'uint256 public constant MAX_BENEFICIARIES = 107' ==> 'uint256 public immutable MAX_BENEFICIARIES = 107'` | `equivalent` — an inline-initialised `immutable` holds what the `constant` held; it changes deployed bytecode, which is m05-t02's attestation, not behaviour |
| SBR | `src/Distribution.sol:74` | `'bytes4 private constant BALANCE_OF = 0x70a08231' ==> 'bytes4 private immutable BALANCE_OF = 0x70a08231'` | `equivalent` — an inline-initialised `immutable` holds what the `constant` held; it changes deployed bytecode, which is m05-t02's attestation, not behaviour |
| MIA | `src/Distribution.sol:143` | `'address(this).balance != 0' ==> 'true'` | `test test_unfundedCreateLogsNoReceived` |
| ROR | `src/Distribution.sol:143` | `'address(this).balance != 0' ==> 'address(this).balance > 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/Distribution.sol:143` | `'address(this).balance != 0' ==> 'address(this).balance >= 0'` | `test test_unfundedCreateLogsNoReceived` |
| ROR | `src/Distribution.sol:156` | `'amount == 0' ==> 'amount <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| UOR | `src/Distribution.sol:160` | `'++i' ==> 'i++'` | `equivalent` — the result is discarded in a `for` increment, so the two forms differ in neither value nor control flow |
| MIA | `src/Distribution.sol:179` | `'amount == 0' ==> 'false'` | `test test_releaseWithNoEscrowIsNothingToDo` |
| ROR | `src/Distribution.sol:179` | `'amount == 0' ==> 'amount < 0'` | `test test_releaseWithNoEscrowIsNothingToDo` |
| ROR | `src/Distribution.sol:179` | `'amount == 0' ==> 'amount <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/Distribution.sol:201` | `'amount == 0' ==> 'amount <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| MIA | `src/Distribution.sol:211` | `'data.length <= 32' ==> 'true'` | `test test_claimBubblesLongReason` |
| ROR | `src/Distribution.sol:211` | `'data.length <= 32' ==> 'data.length < 32'` | `test test_claimNamesFailureAtThirtyTwoBytes` |
| ROR | `src/Distribution.sol:211` | `'data.length <= 32' ==> 'data.length != 32'` | `test test_claimNamesFailureAtThirtyTwoBytes` |
| ROR | `src/Distribution.sol:226` | `'d == 0' ==> 'd <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| SBR | `src/Distribution.sol:227` | `'emit Queued(hash, n, block.timestamp, action)' ==> 'emit Queued(hash, n, 0, action)'` | `test test_proposeImmediateEmitsQueuedWithTimestamp` |
| ROR | `src/Distribution.sol:247` | `'eta == 0 \|\| block.timestamp < eta' ==> 'eta <= 0 \|\| block.timestamp < eta'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/Distribution.sol:266` | `'msg.sender != owner && (eta == 0 \|\| block.timestamp <= eta + GRACE)' ==> 'msg.sender != owner && (eta <= 0 \|\| block.timestamp <= eta + GRACE)'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| MIA | `src/Distribution.sol:267` | `'eta == 0' ==> 'false'` | `test test_ownerCancelOfUnknownHashIsNothingToDo` |
| ROR | `src/Distribution.sol:267` | `'eta == 0' ==> 'eta < 0'` | `test test_ownerCancelOfUnknownHashIsNothingToDo` |
| ROR | `src/Distribution.sol:267` | `'eta == 0' ==> 'eta <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/Distribution.sol:332` | `'n == 0 \|\| n > MAX_BENEFICIARIES' ==> 'n < 0 \|\| n > MAX_BENEFICIARIES'` | `equivalent (pinned: test_tableValidation)` — with the `n == 0` arm gone an empty table runs the loop zero times, leaves `sum == 0` and reverts the same `BadTable()` at `:344` |
| ROR | `src/Distribution.sol:332` | `'n == 0 \|\| n > MAX_BENEFICIARIES' ==> 'n <= 0 \|\| n > MAX_BENEFICIARIES'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| SBR | `src/Distribution.sol:335` | `'uint256 sum' ==> 'uint128 sum'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| ROR | `src/Distribution.sol:337` | `'i < n' ==> 'i != n'` | `equivalent` — the counter starts at 0 and rises by exactly 1, so it meets the bound rather than passing it |
| SBR | `src/Distribution.sol:337` | `'for (uint256 i; i < n; ++i) { Beneficiary calldata b = table_[i]; if (b.bps == 0 \|\| b.account <= prev) revert BadTable(); prev = b.account; sum …` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/Distribution.sol:337` | `'uint256 i' ==> 'uint128 i'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| UOR | `src/Distribution.sol:337` | `'++i' ==> 'i++'` | `equivalent` — the result is discarded in a `for` increment, so the two forms differ in neither value nor control flow |
| ROR | `src/Distribution.sol:339` | `'b.bps == 0 \|\| b.account <= prev' ==> 'b.bps <= 0 \|\| b.account <= prev'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/Distribution.sol:344` | `'sum != BPS_TOTAL' ==> 'sum < BPS_TOTAL'` | `test test_tableSummingAboveBpsTotalReverts` |
| ROR | `src/Distribution.sol:352` | `'n > 0' ==> 'n != 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| MIA | `src/Distribution.sol:364` | `'i == 0' ==> 'false'` | `unreachable` — both callers require `queued[hash] != 0`, and `propose` writes `queued[hash]` and `_pendingIndex[hash]` together (`:232`-`:233`), so `i` is never 0 here |
| ROR | `src/Distribution.sol:364` | `'i == 0' ==> 'i < 0'` | `unreachable` — both callers require `queued[hash] != 0`, and `propose` writes `queued[hash]` and `_pendingIndex[hash]` together (`:232`-`:233`), so `i` is never 0 here |
| ROR | `src/Distribution.sol:364` | `'i == 0' ==> 'i <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| MIA | `src/Distribution.sol:367` | `'i != last' ==> 'true'` | `equivalent (pinned: test_removingTheLastPendingEntryKeepsTheQueue)` — `i` is a 1-based index so `i <= last` always holds, and at `i == last` the row the swap moves is the row being removed, so it is a self-assignment whose index write is deleted on the next line |
| ROR | `src/Distribution.sol:367` | `'i != last' ==> 'i < last'` | `equivalent (pinned: test_removingTheLastPendingEntryKeepsTheQueue)` — `i` is a 1-based index so `i <= last` always holds, and at `i == last` the row the swap moves is the row being removed, so it is a self-assignment whose index write is deleted on the next line |
| ROR | `src/Distribution.sol:367` | `'i != last' ==> 'i <= last'` | `equivalent (pinned: test_removingTheLastPendingEntryKeepsTheQueue)` — `i` is a 1-based index so `i <= last` always holds, and at `i == last` the row the swap moves is the row being removed, so it is a self-assignment whose index write is deleted on the next line |
| SBR | `src/Distribution.sol:368` | `'Pending storage moved = _pending[last - 1]' ==> 'Pending memory moved = _pending[last - 1]'` | `equivalent` — `moved` is only read after the assignment and the `i != last` guard rules out aliasing, so the copy costs gas and nothing else |
| ROR | `src/App.sol:102` | `'resource.length == 1 && _eq(resource[0], "widget.js") && widgetChunks.length != 0' ==> 'resource.length <= 1 && _eq(resource[0], "widget.js") && w…` | `equivalent` — `:95` has already returned for `length == 0`, so `<= 1` collapses to `== 1` on every reachable call |
| ROR | `src/App.sol:102` | `'resource.length == 1 && _eq(resource[0], "widget.js") && widgetChunks.length != 0' ==> 'resource.length >= 1 && _eq(resource[0], "widget.js") && w…` | `test test_multiSegmentWidgetPathIs404` |
| ROR | `src/App.sol:102` | `'resource.length == 1 && _eq(resource[0], "widget.js") && widgetChunks.length != 0' ==> 'resource.length == 1 && _eq(resource[0], "widget.js") && w…` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| MIA | `src/App.sol:121` | `'locked' ==> 'false'` | `test test_setChunksRevertsWhenLocked` |
| ROR | `src/App.sol:122` | `'ptrs.length == 0' ==> 'ptrs.length <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/App.sol:124` | `'i < ptrs.length' ==> 'i != ptrs.length'` | `equivalent` — the counter starts at 0 and rises by exactly 1, so it meets the bound rather than passing it |
| SBR | `src/App.sol:124` | `'for (uint256 i; i < ptrs.length; ++i) { _requireChunk(ptrs[i]); chunks.push(ptrs[i]); }' ==> 'for (uint128 i; i < ptrs.length; ++i) { _requireChun…` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/App.sol:124` | `'uint256 i' ==> 'uint128 i'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| UOR | `src/App.sol:124` | `'++i' ==> 'i++'` | `equivalent` — the result is discarded in a `for` increment, so the two forms differ in neither value nor control flow |
| ROR | `src/App.sol:144` | `'ptrs.length == 0' ==> 'ptrs.length <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/App.sol:146` | `'i < ptrs.length' ==> 'i != ptrs.length'` | `equivalent` — the counter starts at 0 and rises by exactly 1, so it meets the bound rather than passing it |
| SBR | `src/App.sol:146` | `'for (uint256 i; i < ptrs.length; ++i) { _requireChunk(ptrs[i]); widgetChunks.push(ptrs[i]); }' ==> 'for (uint128 i; i < ptrs.length; ++i) { _requi…` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/App.sol:146` | `'uint256 i' ==> 'uint128 i'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| UOR | `src/App.sol:146` | `'++i' ==> 'i++'` | `equivalent` — the result is discarded in a `for` increment, so the two forms differ in neither value nor control flow |
| MIA | `src/App.sol:154` | `'locked' ==> 'true'` | `test test_setVersionSetsAndEmits` |
| ROR | `src/App.sol:170` | `'n == 0' ==> 'n <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/App.sol:171` | `'i < n' ==> 'i != n'` | `equivalent` — the counter starts at 0 and rises by exactly 1, so it meets the bound rather than passing it |
| SBR | `src/App.sol:171` | `'for (uint256 i; i < n; ++i) { _requireChunk(chunks[i]); }' ==> 'for (uint128 i; i < n; ++i) { _requireChunk(chunks[i]); }'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/App.sol:171` | `'uint256 i' ==> 'uint128 i'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| UOR | `src/App.sol:171` | `'++i' ==> 'i++'` | `equivalent` — the result is discarded in a `for` increment, so the two forms differ in neither value nor control flow |
| ROR | `src/App.sol:175` | `'i < w' ==> 'i != w'` | `equivalent` — the counter starts at 0 and rises by exactly 1, so it meets the bound rather than passing it |
| SBR | `src/App.sol:175` | `'for (uint256 i; i < w; ++i) { _requireChunk(widgetChunks[i]); }' ==> 'for (uint128 i; i < w; ++i) { _requireChunk(widgetChunks[i]); }'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/App.sol:175` | `'uint256 i' ==> 'uint128 i'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| ROR | `src/App.sol:192` | `'i < n' ==> 'i != n'` | `equivalent` — the counter starts at 0 and rises by exactly 1, so it meets the bound rather than passing it |
| SBR | `src/App.sol:192` | `'for (uint256 i; i < n; ++i) { out = bytes.concat(out, SSTORE2.read(list[i])); }' ==> 'for (uint128 i; i < n; ++i) { out = bytes.concat(out, SSTORE…` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| SBR | `src/App.sol:192` | `'uint256 i' ==> 'uint128 i'` | `equivalent` — the value and every bound on it are orders of magnitude below 2¹²⁸, and mixed arithmetic promotes |
| UOR | `src/App.sol:192` | `'++i' ==> 'i++'` | `equivalent` — the result is discarded in a `for` increment, so the two forms differ in neither value nor control flow |
| SBR | `src/App.sol:199` | `'uint256 n' ==> 'uint128 n'` | `equivalent` — `n` receives `extcodesize`, at most 24,576 |
| ROR | `src/App.sol:207` | `'n == 0' ==> 'n <= 0'` | `equivalent` — on an unsigned operand this is the same predicate: `x <= 0`, `x < 1` and `x == 0` agree, as do `x != 0` and `x > 0` |
| ROR | `src/App.sol:208` | `'first[0] != 0x00' ==> 'first[0] > 0x00'` | `equivalent` — a `bytes1` is compared as an unsigned byte, so `> 0x00` is `!= 0x00` |


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
