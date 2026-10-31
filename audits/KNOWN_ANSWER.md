# Known answer — rake, `b0fb4e3`

What this project knew before the audit ran, found by hand, with file, line and mechanism. The
legs are **not** told any of it: `scripts/audit.sh` appends this file to the rollup prompt only, so
the rollup can record, per leg, what was found and what was missed (`README.md` § Known limits).

Line numbers are from `src/Distribution.sol` at `b0fb4e3` (sha256 `100f1b6f…`), verified
2026-10-31. **Trust the function names over the numbers**: the mechanism is what the grading is on,
and a leg that reports the same gap under another name found it. The 2026-10-30 run's leg 2 cited
lines about +3 off throughout while naming functions correctly, so this matters in practice.

This is the second audit of this contract. The first read `ede55c3`; this one reads the head of the
PR that closes three of its findings, so § Closed before this audit is longer than it was and is
the half of this file that carries the most information about whether a leg read the code it was
given.

## Still in the code at `b0fb4e3`

These six are shapes a leg reading the scope can find, which is the only kind of entry this method
can grade. Each is a ruled, documented acceptance rather than an oversight — but the legs do not
know that, and whether they find them is the measurement.

- **[#19](https://github.com/dnznlabs/rake/issues/19) — `reserved[token]` above the balance reverts
  `distribute` and every `release`.** `distribute`, `src/Distribution.sol:141`, at the **checked**
  subtraction on `:142`: `uint256 amount = _balance(token) - reserved[token];`. A token whose
  balance can fall after an escrow — a rebasing or fee-on-transfer token, or any token that can
  claw back — leaves `reserved[token] > _balance(token)`, and solc's checked arithmetic reverts on
  the underflow, so `distribute` reverts for that token from then on. `release` is reachable, but
  `reserved -= amount` on `:169` keeps the same arithmetic. Decision 23 documents this rather than
  saturating it. (Corrected per [#118](https://github.com/dnznlabs/rake/issues/118): the previous
  revision of this file described `:135` as being outside solc's default arithmetic checks. **The
  file has no such block anywhere** — the contract carries no arithmetic escape hatch at all — and
  arithmetic outside those checks would wrap instead of reverting, so the old wording contradicted
  its own conclusion. The 2026-10-30 run's leg 2 got this right independently.)

- **[#54](https://github.com/dnznlabs/rake/issues/54) — `propose` queues an action `applyQueued`
  will always revert.** `propose`, `src/Distribution.sol:184`. `propose` validates nothing about
  `action`: it hashes the calldata with the nonce, stores the eta and pushes onto `_pending`. An
  action whose `onlySelf` target will revert — an invalid table, say — therefore sits in `queued`
  and in the pending list until it is dropped. Nothing is lost; the pending list is simply wrong in
  the meantime. Decision 25 documents it. (Corrected per #118: the previous revision said the
  owner's remedy was a `cancel` that had itself to sit through the timelock. `cancel` (`:219`) is
  owner-only and **immediate** — its own NatSpec says "the delay guards applying, not cancelling" —
  so the owner can drop such an action at once, which is why #54 is a wrong pending list and not a
  stuck one. The 2026-10-30 rollup caught this.)

- **[#95](https://github.com/dnznlabs/rake/issues/95) — an escrow to a recipient that burns the push
  can never be released.** `release`, `src/Distribution.sol:164`, re-pushing through `_push` under
  the same `PUSH_GAS` cap (`:56`, `100_000`). The escrow was created because the push failed; the
  retry is the identical call with the identical gas cap, so a recipient that consumes more than
  `PUSH_GAS` or reverts unconditionally fails the retry every time. `release` reverts and restores
  nothing, leaving the amount escrowed. The owner's only remedy is a re-table (decision 6) to a
  recipient that can receive.

- **[#18](https://github.com/dnznlabs/rake/issues/18) — `receive()` exceeds a 2,300-gas stipend when
  the implementation is cold.** `receive()`, `src/Distribution.sol:134`. The guard reads the
  `self` immutable and the body emits `Received`; the comment on `:133` asserts it "must run under a
  2,300-gas `transfer` stipend". It does while the clone's implementation is warm — measured at
  **1,662 gas** on the clone's frame in m03-t05 — but a clone is a minimal proxy and the
  `DELEGATECALL` into a cold implementation costs 2,600 on its own, so a contract paying in with
  `transfer` or `send` can fail on the first touch of a given block.

- **[#22](https://github.com/dnznlabs/rake/issues/22) — a CREATE2 collision in `create` burns the
  forwarded gas before `DeploymentFailed`.** `DistributionFactory.create`,
  `src/Distribution.sol:409`, at the `create2` on `:426`. A `create2` to an address that already
  holds code returns zero having consumed every unit of gas forwarded to it; the `iszero` check
  then reverts with `DeploymentFailed()`, which is accurate and arrives after the gas is gone. The
  caller's remedy is off-chain: read `predict(salt)` with `eth_getCode` and refuse a non-empty
  answer. The doc comment on `:405` says so.

- **F8 (2026-10-30, [#123](https://github.com/dnznlabs/rake/issues/123)) — the ERC-20 push passes no
  gas, so a hook token's recipient can starve the rows after it.** The ERC-20 branch of `_push`,
  `src/Distribution.sol:369`, reached from the `distribute` loop. Unlike the ETH branch on `:359-366`
  it carries no `gas:` argument, so the whole remaining frame reaches `token.transfer`, and a token
  that calls its recipient hands that recipient 63/64 of it. The 1/64 left has to pay every row
  after it. **Measured in m03-t05** (`test_hookRecipientStarvesLaterRows`): over a cap-length table
  whose first row burns what it is given, a `distribute` under a 30,000,000-gas limit reverts, and
  the first round thousand at which it completes is **95,049,000** — more than three 30M blocks, so
  that `distribute(token)` cannot be mined at all. The shape needs an ERC-777-style `transfer`
  callback *and* an owner-chosen hostile row; the owner's remedy is a re-table through the delay.
  Decision 36 / #123 holds the ruling on whether to cap the call, with *document* as the default;
  it is unruled as this head freezes, so the code here carries no cap and this entry is a live
  shape a leg can find.

## Closed before this audit

**A leg that reports one of these as open is either reading code it was not given or has found the
fix wanting. The rollup is asked to say which, against the code**, rather than scoring it as a
re-find.

Three were fixed in the merge of [#103](https://github.com/dnznlabs/rake/pull/103), which is
`ede55c3`, the commit the 2026-10-30 run read:

- **[#20](https://github.com/dnznlabs/rake/issues/20)** — `release` returning an opaque failure
  without a reason. Decision 24: `revert ReleaseFailed(token)` for revert data of 32 bytes or fewer,
  bubbling anything longer. Present at `src/Distribution.sol:175-176`.
- **[#61](https://github.com/dnznlabs/rake/issues/61)** — `_push`'s comment overstating what it
  accepts from an ERC-20. Decision 26: the comment now says the code requires a return word equal
  to one.
- **[#74](https://github.com/dnznlabs/rake/issues/74)** — single-step `transferOwnership`.
  Decision 21: two-step, with `pendingOwner()` and `acceptOwnership()`; renounce stays one-step
  because nothing can accept for `address(0)`.

Three more are the findings the PR at this head closes, each named by the 2026-10-30 run and each
with the mechanism that is no longer in the code:

- **F1 — a reentrant `applyQueued` or `propose` swapping the table mid-`distribute`.** Closed by the
  check-only `notLocked` modifier (`src/Distribution.sol:110`) on `propose` (`:184`) and
  `applyQueued` (`:205`). **The mechanism that is gone:** a hook token's `transfer` could re-enter
  either function while `distribute` held the `nonReentrant` lock, land a matured
  `setBeneficiaries`, and leave the loop reading rows from a table that was not in force when the
  payout began. Both now revert `Locked()` on entry while a money path runs. The check does not
  *take* the lock, deliberately: `applyQueued`'s self-call may be any `onlySelf` setter and an owner
  may queue `distribute` or `release`, which a full `nonReentrant` would make unappliable. `cancel`
  (`:219`) is deliberately **not** guarded — it is owner-only and drops nothing the loop reads.
  Pinned by `test_applyQueuedRefusedDuringDistribute` and `test_proposeRefusedDuringDistribute`.

- **F2 — queued actions outliving an ownership handover or a renounce.** Closed by `_clearQueue`
  (`src/Distribution.sol:302`), called at the end of `acceptOwnership` (`:256`) and in the renounce
  branch of `transferOwnership` (`:244`). **The mechanism that is gone:** the queue hash is
  `keccak256(action, nonce)` with no owner in it and neither handover nor renounce touched `queued`
  or `_pending`, so an action the outgoing owner queued — `transferOwnership(B)` included — stayed
  applicable by anyone afterwards, and after a renounce nobody could `cancel` it. Both paths now
  drop every entry newest-first, emitting `Cancelled` for each. `nonce` is **not** reset, so applied
  and cancelled hashes stay unreplayable; this is not a replay hole. Pinned by
  `test_acceptOwnershipClearsQueue`, `test_renounceClearsQueue` and
  `test_renounceFromApplyClearsTheRest`.

- **F6 — the ETH push copying unbounded return data on every failure.** Closed by `_push`'s fourth
  parameter, `keepData` (`src/Distribution.sol:354`): `distribute` passes `false` and the call is
  made in assembly with a zero-length output area (`:364`), `release` passes `true` (`:359`).
  **The mechanism that is gone:** `to.call{value, gas}("")` copied whatever the recipient returned
  into a fresh `bytes memory` on every row of the loop, so hostile rows grew the caller's memory
  quadratically — 34,082,275 gas over twenty rows each reverting with 0x31000 bytes, measured on
  `ede55c3`, against 2,580,004 at this head. That broke the "a worst-case `distribute` stays under
  half a 30M block" property decision 27 rests on at about eleven such rows. The ERC-20 branch
  (`:369-370`) still copies, by design: it needs the return word, and the token is the one the
  caller named. Pinned by `test_distributeDiscardsEthReturnData`, with
  `test_releaseStillBubblesEthReason` holding decision 24 on the other side of the flag.

F3 (`DeployApp`'s `OWNER` default), F4, F5, F7, F9 and F10 of the 2026-10-30 run are not listed
above as closed: F3 is m03-t06's and is a deploy script rather than a contract, F4/F5/F7 are the
carried issues #19/#95/#18 already in § Still in the code, F9's residual was F2's, and F10 is
intended design (`PROJECT_OVERVIEW` § 5). A leg raising any of them is finding a live shape, not
contradicting this file.
