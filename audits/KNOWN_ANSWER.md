# Known answer — rake, `ede55c3`

What this project knew before the audit ran, found by hand, with file, line and mechanism. The
legs are **not** told any of it: `scripts/audit.sh` appends this file to the rollup prompt only, so
the rollup can record, per leg, what was found and what was missed (`README.md` § Known limits).

Line numbers are from `src/Distribution.sol` at `ede55c3` (sha256 `57b69fa6…`), verified
2026-10-30. **Trust the function names over the numbers**: the mechanism is what the grading is on,
and a leg that reports the same gap under another name found it.

## Still in the code at `ede55c3`

These five are shapes a leg reading the scope can find, which is the only kind of entry this method
can grade. Each is a ruled, documented acceptance rather than an oversight — but the legs do not
know that, and whether they find them is the measurement.

- **[#19](https://github.com/dnznlabs/rake/issues/19) — `reserved[token]` above the balance reverts
  `distribute` and every `release`.** `distribute`, `src/Distribution.sol:134`, at the unchecked
  subtraction on `:135`: `uint256 amount = _balance(token) - reserved[token];`. A token whose
  balance can fall after an escrow — a rebasing or fee-on-transfer token, or any token that can
  claw back — leaves `reserved[token] > _balance(token)`, and the subtraction underflows, so
  `distribute` reverts for that token from then on. `release` is reachable, but `reserved -= amount`
  on `:162` keeps the same arithmetic. Decision 23 documents this rather than saturating it.

- **[#54](https://github.com/dnznlabs/rake/issues/54) — `propose` queues an action `applyQueued`
  will always revert.** `propose`, `src/Distribution.sol:176`. `propose` validates nothing about
  `action`: it hashes the calldata with the nonce, stores the eta and pushes onto `_pending`. An
  action whose `onlySelf` target will revert — an invalid table, say — therefore sits in `queued`
  and in the pending list until the delay has passed and the owner proposes a `cancel`, which must
  itself wait out the delay. Nothing is lost; the pending list is simply wrong in the meantime.
  Decision 25 documents it.

- **[#95](https://github.com/dnznlabs/rake/issues/95) — an escrow to a recipient that burns the push
  can never be released.** `release`, `src/Distribution.sol:157`, re-pushing through `_push` under
  the same `PUSH_GAS` cap (`:56`, `100_000`). The escrow was created because the push failed; the
  retry is the identical call with the identical gas cap, so a recipient that consumes more than
  `PUSH_GAS` or reverts unconditionally fails the retry every time. `release` reverts and restores
  nothing, leaving the amount escrowed. The owner's only remedy is a re-table (decision 6) to a
  recipient that can receive.

- **[#18](https://github.com/dnznlabs/rake/issues/18) — `receive()` exceeds a 2,300-gas stipend when
  the implementation is cold.** `receive()`, `src/Distribution.sol:127`. The guard reads the
  `self` immutable and the body emits `Received`; the comment on `:126` asserts it "must run under a
  2,300-gas `transfer` stipend". It does while the clone's implementation is warm, but a clone is a
  minimal proxy and the `DELEGATECALL` into a cold implementation costs 2,600 on its own, so a
  contract paying in with `transfer` or `send` can fail on the first touch of a given block.

- **[#22](https://github.com/dnznlabs/rake/issues/22) — a CREATE2 collision in `create` burns the
  forwarded gas before `DeploymentFailed`.** `DistributionFactory.create`,
  `src/Distribution.sol:364`, at the `create2` on `:381`. A `create2` to an address that already
  holds code returns zero having consumed every unit of gas forwarded to it; the `iszero` check
  then reverts with `DeploymentFailed()`, which is accurate and arrives after the gas is gone. The
  caller's remedy is off-chain: read `predict(salt)` with `eth_getCode` and refuse a non-empty
  answer. The doc comment on `:358` says so.

## Closed before this audit

Fixed in the merge of [#103](https://github.com/dnznlabs/rake/pull/103), which is `ede55c3` — the
commit the legs read. **A leg that reports one of these as open is reporting code it did not read**,
and the rollup should say so.

- **[#20](https://github.com/dnznlabs/rake/issues/20)** — `release` returning an opaque failure
  without a reason. Decision 24: `revert ReleaseFailed(token)` for revert data of 32 bytes or fewer,
  bubbling anything longer. Present at `src/Distribution.sol:167-170`.
- **[#61](https://github.com/dnznlabs/rake/issues/61)** — `_push`'s comment overstating what it
  accepts from an ERC-20. Decision 26: the comment now says the code requires a return word equal
  to one.
- **[#74](https://github.com/dnznlabs/rake/issues/74)** — single-step `transferOwnership`.
  Decision 21: two-step, with `pendingOwner()` and `acceptOwnership()`; renounce stays one-step
  because nothing can accept for `address(0)`.
