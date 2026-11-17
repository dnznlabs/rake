# Known answer — rake, `94d028c`

What this project knew before the audit ran, found by hand, with file, line and mechanism. The
legs are **not** told any of it: `scripts/audit.sh` appends this file to the rollup prompt only, so
the rollup can record, per leg, what was found and what was missed (`README.md` § Known limits).

Line numbers are from `src/Distribution.sol` and `src/App.sol` at `94d028c`, verified 2026-11-02
(sha256 `ef5f089f…` and `0d34f21a…` respectively). **`src/Distribution.sol` is no longer the file
the 2026-10-31 run read**: [m03-t08](../docs/milestones/m03/tasks/m03-t08/TASK.md) merged as
`679d1b8` and changed it, so every `Distribution` line number below was re-derived against this head
and none of them carries over from the previous revision of this file. `src/App.sol` is byte-identical
to the previous revision — this PR froze it at `94d028c` — so its numbers are unchanged.
**Trust the function names over the numbers**: the mechanism is what the grading is on, and a leg
that reports the same gap under another name found it. The 2026-10-30 run's leg 2 cited lines about
+3 off throughout while naming functions correctly, so this matters in practice.

This is the third audit of these contracts. The first read `ede55c3`, the second `b0fb4e3`; this one
reads a head that carries two changes at once — this PR closes the second run's only `src/App.sol`
finding, and t08 closed three `Distribution` shapes the earlier runs raised. § Closed before this
audit is therefore longer again, and is the half of this file that carries the most information about
whether a leg read the code it was given.

**Six shapes are still in the code and ten are closed — sixteen entries, and § 4 of the rollup
grades both legs against all sixteen.**

## Still in the code at `94d028c`

These six are shapes a leg reading the scope can find, which is the only kind of entry this method
can grade. Each is a ruled, documented acceptance rather than an oversight — but the legs do not know
that, and whether they find them is the measurement.

- **[#19](https://github.com/dnznlabs/rake/issues/19) — `reserved[token]` above the balance reverts
  `distribute` and every `release`.** `distribute`, `src/Distribution.sol:154`, at the **checked**
  subtraction on `:155`: `uint256 amount = _balance(token) - reserved[token];`. A token whose
  balance can fall after an escrow — a rebasing or fee-on-transfer token, or any token that can
  claw back — leaves `reserved[token] > _balance(token)`, and solc's checked arithmetic reverts on
  the underflow, so `distribute` reverts for that token from then on. `release` is reachable, but
  `reserved[token] -= amount` on `:182` keeps the same arithmetic, and so does the new `claim` on
  `:204`. (Corrected per [#118](https://github.com/dnznlabs/rake/issues/118): an earlier revision of
  this file described the subtraction as being outside solc's default arithmetic checks. **The file
  has no such block anywhere** — the contract carries no arithmetic escape hatch at all — and
  arithmetic outside those checks would wrap instead of reverting, so the old wording contradicted
  its own conclusion. The 2026-10-30 run's leg 2 got this right independently.)

- **[#54](https://github.com/dnznlabs/rake/issues/54) — `propose` queues an action `applyQueued`
  will always revert.** `propose`, `src/Distribution.sol:220`. `propose` validates nothing about
  `action`: it hashes the calldata with the nonce, stores the eta and pushes onto `_pending`. An
  action whose `onlySelf` target will revert — an invalid table, say — therefore sits in `queued`
  and in the pending list until it is dropped. Nothing is lost; the pending list is simply wrong in
  the meantime. Decision 25 documents it. (Corrected per #118: an earlier revision said the owner's
  remedy was a `cancel` that had itself to sit through the timelock. `cancel` (`:260`) is
  owner-only and **immediate** for an unexpired entry — its own NatSpec says "the delay guards
  applying, not cancelling" — so the owner can drop such an action at once, which is why #54 is a
  wrong pending list and not a stuck one. The 2026-10-30 rollup caught this.) **Missed by both legs
  on both earlier runs.**

- **[#18](https://github.com/dnznlabs/rake/issues/18) — `receive()` exceeds a 2,300-gas stipend when
  the implementation is cold.** `receive()`, `src/Distribution.sol:147`. The guard reads the
  `self` immutable and the body emits `Received`; the comment on `:146` asserts it "must run under a
  2,300-gas `transfer` stipend". It does while the clone's implementation is warm — measured at
  **1,662 gas** on the clone's frame in m03-t05 — but a clone is a minimal proxy and the
  `DELEGATECALL` into a cold implementation costs 2,600 on its own, so a contract paying in with
  `transfer` or `send` can fail on the first touch of a given block.

- **[#22](https://github.com/dnznlabs/rake/issues/22) — a CREATE2 collision in `create` burns the
  forwarded gas before `DeploymentFailed`.** `DistributionFactory.create`,
  `src/Distribution.sol:457`, at the `create2` on `:474`. A `create2` to an address that already
  holds code returns zero having consumed every unit of gas forwarded to it; the `iszero` check on
  `:475` then reverts with `DeploymentFailed()`, which is accurate and arrives after the gas is gone.
  The caller's remedy is off-chain: read `predict(salt)` (`:487`) with `eth_getCode` and refuse a
  non-empty answer. The doc comment on `:451-453` says so. **Missed by all four legs across both
  earlier runs** — the method has not found this shape once, so a find here is new information.

- **F8 (2026-10-30, [#123](https://github.com/dnznlabs/rake/issues/123)) — the ERC-20 push passes no
  gas, so a hook token's recipient can starve the rows after it.** The ERC-20 branch of `_push`,
  `src/Distribution.sol:417`, reached from the `distribute` loop (`:166`). Unlike the ETH branch on
  `:406-415` it carries no `gas:` argument, so the whole remaining frame reaches `token.transfer`,
  and a token that calls its recipient hands that recipient 63/64 of it. The 1/64 left has to pay
  every row after it. **Re-measured on this head** (`test_hookRecipientStarvesLaterRows`): over a
  cap-length table whose first row burns what it is given, a `distribute` under a 30,000,000-gas
  limit reverts, and the first round thousand at which it completes is **95,226,000**
  (`test/Distribution.t.sol`, `F8_SUCCEEDS_AT`) — more than three 30M blocks, so that `distribute(token)` cannot be
  mined at all. That figure was 95,049,000 at `b0fb4e3`; t08's `claim` and expiry code moved it to
  95,237,000, the solc 0.8.34 → 0.8.38 pin of 2026-11-16 moved it again with no `src/` change, and
  the shape is unchanged. The shape needs an ERC-777-style `transfer` callback *and* an owner-chosen
  hostile row; the owner's remedy is a re-table through the delay. Decision 36 / #123 holds the
  ruling on whether to cap the call, with *document* as the default; it is unruled as this head
  freezes, so the code here carries no cap and this entry is a live shape a leg can find.

- **F12 (2026-10-31, [#127](https://github.com/dnznlabs/rake/issues/127)) — a second token address
  for the native balance pays escrowed ETH out again.** `distribute`,
  `src/Distribution.sol:154-159`. `reserved` is keyed by token address (`:95`), so
  `distribute(address(0))` escrows a row's share in `reserved[address(0)]`, and `distribute(alias)`
  — any ERC-20 whose balance *is* the native balance — then reads that same balance, subtracts
  `reserved[alias]`, which is zero, and pays the escrowed amount to the table a second time;
  `release(address(0), …)` afterwards fails because the balance is short. Any caller can call
  `distribute`, so **where it applies the impact looks High**, but it needs a chain carrying a
  native-balance or double-entry-point token (leg 2 named Celo's GoldToken) and
  `scripts/forge/Deploy.s.sol:7` deploys to `$RPC` and names no chain, so High is not established
  for this code as given. Accepted and carried as #127 with m03-t06's per-chain runbook
  precondition; **no code change here**, so it is a live shape. Note that t08's `claim` (`:199`)
  gives the escrowed account a second exit but does **not** close this: `claim` also decrements
  `reserved[token]` on `:204` under the same per-token key, so the alias still reads a `reserved`
  of zero. Recorded so a leg is not graded against a fiction: leg 2's own proposed fix referred to a
  `NATIVE_ALIAS` constant that **does not exist** in this code.

## Closed before this audit

**A leg that reports one of these as open is either reading code it was not given or has found the
fix wanting. The rollup is asked to say which, against the code**, rather than scoring it as a
re-find.

Three were fixed in the merge of [#103](https://github.com/dnznlabs/rake/pull/103), which is
`ede55c3`, the commit the 2026-10-30 run read:

- **[#20](https://github.com/dnznlabs/rake/issues/20)** — `release` returning an opaque failure
  without a reason. Decision 24: `revert ReleaseFailed(token)` for revert data of 32 bytes or fewer,
  bubbling anything longer. Present at `src/Distribution.sol:188`, and t08's `claim` follows the same
  path at `:211`.
- **[#61](https://github.com/dnznlabs/rake/issues/61)** — `_push`'s comment overstating what it
  accepts from an ERC-20. Decision 26: the comment now says the code requires a return word equal
  to one (`:418`).
- **[#74](https://github.com/dnznlabs/rake/issues/74)** — single-step `transferOwnership`.
  Decision 21: two-step, with `pendingOwner()` and `acceptOwnership()` (`:304`); renounce stays
  one-step because nothing can accept for `address(0)`.

Three more were closed by the merge of the 2026-10-31 run's fixes, which is `b0fb4e3`, each named
by the 2026-10-30 run and each with the mechanism that is no longer in the code:

- **F1 — a reentrant `applyQueued` or `propose` swapping the table mid-`distribute`.** Closed by the
  check-only `notLocked` modifier (`src/Distribution.sol:118`) on `propose` (`:220`) and
  `applyQueued` (`:242`). **The mechanism that is gone:** a hook token's `transfer` could re-enter
  either function while `distribute` held the `nonReentrant` lock, land a matured
  `setBeneficiaries`, and leave the loop reading rows from a table that was not in force when the
  payout began. Both now revert `Locked()` on entry while a money path runs. The check does not
  *take* the lock, deliberately: `applyQueued`'s self-call may be any `onlySelf` setter and an owner
  may queue `distribute` or `release`, which a full `nonReentrant` would make unappliable. `cancel`
  (`:260`) is deliberately **not** guarded — it is owner-only for an unexpired entry and drops
  nothing the loop reads. Pinned by `test_applyQueuedRefusedDuringDistribute` and
  `test_proposeRefusedDuringDistribute`.

- **F2 — queued actions outliving an ownership handover or a renounce.** Closed by `_clearQueue`
  (`src/Distribution.sol:350`), called at the end of `acceptOwnership` (`:304`) and in the renounce
  branch of `transferOwnership` (`:296`). **The mechanism that is gone:** the queue hash is
  `keccak256(action, nonce)` with no owner in it and neither handover nor renounce touched `queued`
  or `_pending`, so an action the outgoing owner queued — `transferOwnership(B)` included — stayed
  applicable by anyone afterwards, and after a renounce nobody could `cancel` it. Both paths now
  drop every entry newest-first, emitting `Cancelled` for each. `nonce` is **not** reset, so applied
  and cancelled hashes stay unreplayable; this is not a replay hole. Pinned by
  `test_acceptOwnershipClearsQueue`, `test_renounceClearsQueue` and
  `test_renounceFromApplyClearsTheRest`.

- **F6 — the ETH push copying unbounded return data on every failure.** Closed by `_push`'s fourth
  parameter, `keepData` (`src/Distribution.sol:402`): `distribute` passes `false` and the call is
  made in assembly with a zero-length output area (`:412`), `release` and `claim` pass `true`
  (`:408`). **The mechanism that is gone:** `to.call{value, gas}("")` copied whatever the recipient
  returned into a fresh `bytes memory` on every row of the loop, so hostile rows grew the caller's
  memory quadratically — 34,082,275 gas over twenty rows each reverting with 0x31000 bytes, measured
  on `ede55c3`, against 2,580,004 at `b0fb4e3`. That broke the "a worst-case `distribute` stays
  under half a 30M block" property decision 27 rests on at about eleven such rows. The ERC-20 branch
  (`:417-418`) still copies, by design: it needs the return word, and the token is the one the
  caller named. Pinned by `test_distributeDiscardsEthReturnData`, with
  `test_releaseStillBubblesEthReason` holding decision 24 on the other side of the flag.

Three were closed by the merge of [m03-t08](https://github.com/dnznlabs/rake/pull/143), which is
`679d1b8`, the commit this branch is rebased onto. Each was raised by an earlier run of this method
and each is named here with the mechanism that is no longer in the code:

- **F9 / F13 (2026-10-30 as a lead, 2026-10-31 at Low, and a source analysis at Medium) —
  `applyQueued` ordered nothing and expired nothing.** Closed by `GRACE`
  (`src/Distribution.sol:65`, `14 days`, a public constant) and the new `Expired(uint256 eta)` error
  (`:54`): `applyQueued` (`:242`) now reverts `Expired(eta)` once `block.timestamp > eta + GRACE`
  (`:249`), and `cancel` (`:260`) lets **anyone** drop an entry past that window — the condition on
  `:266` refuses a non-owner only while `eta == 0 || block.timestamp <= eta + GRACE`, with the check
  ordered before `NothingToDo` so a non-owner still sees `NotOwner` for an entry that does not exist.
  **The mechanism that is gone:** the only gate was `eta == 0 || block.timestamp < eta`, so a matured
  action was applicable by anyone, in any order, forever, unless the owner cancelled it; a
  beneficiary removed by a newer table could apply the older `setBeneficiaries` it was still listed
  in and then `distribute`, in one transaction, and a renounced owner left a queue nobody could
  clean. The same shape had been raised by three independent reads, which is why it was fixed rather
  than carried a third time; F13's earlier disposition of "none needed" is superseded. Pinned by
  `test_applyQueuedExpires`, `test_staleActionExpires`, `test_strangerCancelsExpired` and
  `test_strangerCannotCancelUnexpired`.

- **F5 / [#95](https://github.com/dnznlabs/rake/issues/95) — an escrow to a recipient that burned the
  push could never be released.** Closed by `claim(address token, address to)`
  (`src/Distribution.sol:199-215`), `nonReentrant` and self-only: it moves
  `escrowed[token][msg.sender]` and nothing else, to an address the beneficiary names, **with no
  `PUSH_GAS` cap** — the ETH branch on `:207` is a bare `to.call{value: amount}("")` carrying the
  caller's whole frame, because the beneficiary is paying for its own receive. **The mechanism that
  is gone:** `release` (`:177`) re-pushed through `_push` under the same `PUSH_GAS` cap (`:59`,
  `100_000`) that had already failed, so the retry was the identical call with the identical cap and
  a recipient consuming more than `PUSH_GAS`, or reverting unconditionally, failed it every time;
  `release` reverted and restored nothing, leaving the amount escrowed with a re-table (decision 6)
  as the owner's only remedy. `release` is unchanged and still capped — `claim` is a second exit, not
  a replacement — and it emits `Claimed` (`:36`). Note that neither the owner nor anyone else gains a
  path to funds: only `msg.sender`'s own escrow moves. Pinned by `test_claimErc20`,
  `test_claimEthToOtherAddress`, `test_claimEthToSelfUncapped` and `test_claimReentrancyLocked`.

- **[#111](https://github.com/dnznlabs/rake/issues/111)'s code half — a renounce left no trace in the
  logs.** Closed by `emit OwnershipTransferred(owner, address(0))` in the renounce branch of
  `transferOwnership` (`src/Distribution.sol:293`), with the event's own `@dev` (`:38-44`) now saying
  a renounce is the other emitter and that it carries `newOwner == address(0)`. **The mechanism that
  is gone:** `OwnershipTransferred` was emitted on acceptance only (`:307`), so a log reader watching
  an owner give up the contract entirely saw the `Queued` calldata for `transferOwnership(0)` and
  then nothing — the one state change with no trace of its own, on the path that cannot be undone.
  Pinned by `test_renounceEmitsOwnershipTransferred`.

One is closed by the PR at this head — the 2026-10-31 run's only finding in `src/App.sol`, and the
first finding this method has ever raised in that file:

- **F11 (2026-10-31's F4, leg 2 only, confidence 80 — its highest) — `App.lock` accepted a code
  pointer whose code can change after the lock.** Closed by `_requireChunk`
  (`src/App.sol:198-209`), which every pointer from calldata or storage now passes through: it
  reads `extcodesize`, copies byte 0 with `extcodecopy`, reverts `CodelessChunk(ptr)` when the size
  is zero and the new `ForeignChunk(ptr)` (`src/App.sol:46`) when byte 0 is not `0x00` — the `STOP`
  `SSTORE2.write` prefixes to its payload (`lib/solady/src/utils/SSTORE2.sol:52`). **The four call
  sites:** `setChunks` (`src/App.sol:125`), `setWidgetChunks` (`:147`) and `lock` twice, once per
  list (`:172` for `chunks`, `:176` for `widgetChunks`). **The mechanism that is gone:** the four
  checks were `code.length == 0`, and an EIP-7702 delegation designator — `0xef0100‖address`, 23
  bytes — has non-zero code, so it passed. Its key holder could then re-delegate, changing what
  `html()` serves after a one-way lock, or clear the delegation, which leaves
  `SSTORE2.read`'s `and(0xffffffffff, sub(extcodesize, 1))` (`SSTORE2.sol:213`) at `0xffffffffff`
  and `html()` out of gas for every caller. Measured on this branch before the fix: a delegated
  account's code is 23 bytes with first byte `0xef`, `setChunks` then `lock` **both succeeded**, and
  an `SSTORE2.write` pointer is 5 bytes with first byte `0x00`. `addChunk` (`:111`) and
  `addWidgetChunk` (`:133`) are deliberately unchecked — the pointer is the library's own. Pinned by
  five tests: `test_setChunksRejectsDelegationDesignator`,
  `test_setWidgetChunksRejectsDelegationDesignator`, `test_lockRejectsDelegationDesignator`,
  `test_lockRejectsRealDelegation` (a signed authorization rather than an etched designator) and
  `test_setChunksRejectsNonChunkContract`. `CodelessChunk` keeps its meaning and all five of its
  existing tests. **The one ABI change in this PR is the added `ForeignChunk` error.**

F3 (`DeployApp`'s `OWNER` default), F4, F7 and F10 of the 2026-10-30 run are not listed above as
closed: F3 is m03-t06's and is a deploy script rather than a contract — t06 merged into `679d1b8`'s
ancestry and `scripts/forge/DeployApp.s.sol` at this head is t06's — F4 and F7 are the carried
issues #19 and #18 already in § Still in the code, and F10 is intended design
(`PROJECT_OVERVIEW` § 5). F5 and F9 **have** moved: both are in § Closed before this audit above,
closed by t08. A leg raising F3, F4, F7 or F10 is finding a live shape, not contradicting this file.
