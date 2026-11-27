# Rake Distribution factory and implementation — One Dollar Audit, engagement 1272

> **A commissioned external review, filed here verbatim.** It was produced by One Dollar Audit
> (LeftClaw Services) against the **deployed, Sourcify-verified source** — not against this
> repository, and not by rake's own two-leg method.
>
> | | |
> |:--|:--|
> | Hosted report (HTML) | <https://leftclaw.services/result/1272.html> |
> | Delivered markdown, on IPFS | `bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly` — <https://bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly.ipfs.community.bgipfs.com/> |
> | Engagement record | <https://www.onedollaraudit.com/audit/1272> · job detail <https://leftclaw.services/jobs/1272> |
> | Target | `DistributionFactory` [`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`](https://basescan.org/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) and the `Distribution` implementation [`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`](https://basescan.org/address/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A), Base (8453) |
> | Commissioned | 2026-11-26 18:05:25 CST; report dated 2026-11-27 UTC, pulled 2026-11-27T01:29Z |
> | Severity counts, as filed | 0 Critical · 0 High · 6 Medium · 12 Low · 8 Informational |
>
> **Everything below the marker is the delivered file, byte for byte.** The IPFS CID above is of
> those bytes, so the copy is checkable without trusting this repository:
>
> ```sh
> awk 'f{print} /^<!-- DELIVERED REPORT BEGINS -->$/{f=1}' report.md > /tmp/1272.md
> # CIDv1, raw codec, sha2-256 of /tmp/1272.md == bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly
> curl -sS -L "https://bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly.ipfs.community.bgipfs.com/" | cmp - /tmp/1272.md && echo identical
> ```
>
> Dispositions are **not** in this file and are not the auditor's to make: the index for this date is
> [`AUDIT.md`](../../AUDIT.md), the method and what an external review is here are in
> [`audits/README.md`](../../../README.md) § External commissioned reviews, and the project's
> security posture is [`SECURITY.md`](../../../../SECURITY.md).

<!-- DELIVERED REPORT BEGINS -->
# Security Audit — Rake Distribution Factory (`Distribution` / `DistributionFactory`)

**LeftClaw job:** 1272 · **Date:** 2026-11-27 · **Method:** deep-audit v3 (x-ray pre-scan → context map → 8 checklist agents → 12 blind attack agents → reconciliation + coverage gate)

## Audit target

| | |
|---|---|
| **On-chain source** | `DistributionFactory` — `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`, Base, chain id 8453 |
| **Same address, same source** | Ethereum (chain id 1) and Base Sepolia (chain id 84532) — Sourcify `exact_match` on all three, sources byte-identical |
| **Implementation (`Distribution`)** | `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` (read from `implementation()` on Base and Base Sepolia) |
| **Source file** | `src/Distribution.sol`, 501 lines, 322 nSLOC, no imports — sha256 `8e16a6ad082fba7a91cef8d394d20d9fafddb0d9646b479f4ec54c067f739127` |
| **Compiler** | solc 0.8.38+commit.1835d247, optimizer on (1000 runs), evmVersion `cancun` |
| **Fetch it yourself** | `https://sourcify.dev/server/v2/contract/8453/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E?fields=sources` |

Notes on scope:

- The job description names the factory address and no chain. The address is verified with identical source on three chains. Base is used as the pin; every finding applies to all three.
- Both contracts in the file are in scope: `DistributionFactory` and the `Distribution` implementation it deploys and clones.
- No repository was submitted. The tests, `docs/REFERENCE.md`, `RUNBOOK.md`, `scripts/forge/Deploy.s.sol` and the "decisions" that the NatSpec cites were not available, so statements that rest on them could not be checked.
- The target code was not compiled or executed (audit policy). One behaviour was measured on-chain with `eth_call` and state overrides; it is marked where used.

**Severity counts:** 0 Critical · 0 High · 6 Medium · 12 Low · 8 Informational

**Reconciliation summary:** Overlap: 15 · Phase-1-only: 10 · Phase-2-only: 1 · Re-examined leads kept: 11, demoted: 0 · Coverage holes closed: 0 · Invariants: 24 answered (16 hold, 8 violated, 0 unverified) · Reporting floor: Informational and above; confidence below 50 would be listed as a lead (none).

Phase 2 ran 12 of 12 attack lenses (math-precision, access-control, economic-security, execution-trace, invariant, periphery, first-principles, asymmetry, boundary, numerical-gap, trust-gap, flow-gap). No lens was lost.

## Summary

`Distribution` is a payment splitter. Anyone calls `distribute(token)` and the balance above `reserved[token]` is split by basis points across a fixed table of 1–107 beneficiaries. A failed push becomes escrow. All configuration changes go through an owner-driven timelock whose matured actions anyone can apply. `DistributionFactory` deploys CREATE2 minimal-proxy clones.

The accounting core is sound. No path was found that lets an outsider, a beneficiary or the owner take escrowed funds, re-enter a money path, initialise a clone twice, or take over the implementation. `reserved[token] == Σ escrowed[token][*]` holds on every path.

The findings cluster in four places:

1. **The timelock queue is public and unordered.** Anyone can choose which matured action runs first. A queued renounce can be run ahead of the changes it was meant to follow and deletes them for good (M-1); an older queued change can be run after a newer one (M-4).
2. **Clones cannot be paid by `transfer`/`send`.** The NatSpec promises a 2,300-gas receive path; through the proxy it costs more than that (M-2, confirmed by on-chain simulation).
3. **The ERC-20 push has none of the protections of the ETH push.** One beneficiary with a token receive hook can make `distribute` impossible for that token (M-3).
4. **Edges of the escrow and deployment design.** Some contract recipients have no exit from escrow (M-6), and the clone address does not commit to its configuration (M-5).

## Findings

| ID | Severity | Title | Confidence | Origin |
|---|---|---|---|---|
| M-1 | Medium | Anyone can apply a queued renounce or handover first and wipe the other queued changes | 90 | both |
| M-2 | Medium | A clone cannot receive ETH from a 2,300-gas `transfer` / `send` | 95 | both |
| M-3 | Medium | A beneficiary with a token receive hook can block `distribute` for that token | 80 | both |
| M-4 | Medium | Matured actions can be applied in any order; a superseded entry can win | 80 | both |
| M-5 | Medium | The clone address does not commit to owner, delay or table | 70 | both |
| M-6 | Medium | Escrow has no exit for a contract that cannot receive in 100k gas and cannot call `claim` | 75 | both |
| L-1 | Low | An applied nomination cannot be withdrawn in practice and never expires | 85 | both |
| L-2 | Low | A table change does not settle the balance that arrived under the old table | 85 | both |
| L-3 | Low | Unbounded queue: `_clearQueue` can make handover and renounce exceed a transaction's gas | 75 | both |
| L-4 | Low | `_remove` copies the tail entry's `action`; a large tail blocks apply/cancel of earlier entries | 60 | phase 1 |
| L-5 | Low | Table writes are not sized to the gas cap; unbounded strings | 60 | phase 1 |
| L-6 | Low | `delay` has no bounds at `init` or `setDelay` | 90 | phase 1 |
| L-7 | Low | The self-call accepts any selector; the clone can become its own owner | 85 | phase 1 |
| L-8 | Low | A token balance below `reserved` makes `distribute` revert; escrow exits become first-come | 80 | both |
| L-9 | Low | Double-entry-point tokens bypass `reserved` | 55 | both |
| L-10 | Low | A token that returns `false` on a successful transfer creates phantom escrow | 50 | phase 1 |
| L-11 | Low | Rounding remainder always goes to the last row; zero shares are still pushed | 85 | both |
| L-12 | Low | No gas floor before the capped ETH push | 50 | phase 1 |
| I-1 | Informational | Comments disagree with the code | 95 | both |
| I-2 | Informational | Uninitialised instances accept value they can never pay out | 85 | phase 1 |
| I-3 | Informational | `cancel` and `acceptOwnership` carry no lock modifier | 90 | both |
| I-4 | Informational | `release` copies and re-throws recipient-chosen revert data | 80 | phase 1 |
| I-5 | Informational | Caller-named `token` is not validated: fake-token events and state | 80 | both |
| I-6 | Informational | Gas-schedule constants and chain assumptions | 70 | phase 1 |
| I-7 | Informational | No emergency path; token blocklist and pause behaviour | 80 | phase 1 |
| I-8 | Informational | A queued entry keeps its `eta` when the delay is raised | 90 | phase 2 |

---

### M-1 — Anyone can apply a queued renounce or handover first and wipe the other queued changes

**Severity:** Medium
**Confidence:** 90 · **Origin:** [both] — phase 1: governance; phase 2: execution-trace, flow-gap
**Location:** `Distribution.applyQueued` (`Distribution.sol:242`), `Distribution.transferOwnership` (`Distribution.sol:291`), `Distribution._clearQueue` (`Distribution.sol:350`)

**Description.** `applyQueued` has no caller check and no ordering rule. Every matured entry is open to anyone for 14 days:

```solidity
// Distribution.sol:242
function applyQueued(bytes calldata action, uint32 nonce_) external notLocked {
    bytes32 hash = keccak256(abi.encode(action, nonce_));
    uint256 eta = queued[hash];
    ...
    if (eta == 0 || block.timestamp < eta) revert NotReady(eta);
```

A renounce clears the whole queue:

```solidity
// Distribution.sol:292
if (owner_ == address(0)) {
    emit OwnershipTransferred(owner, address(0));
    owner = address(0);
    pendingOwner = address(0);
    _clearQueue();
```

An owner who wants to "set the final table, then renounce" naturally queues both together, because queuing them one after the other costs two full delays. Whoever applies the renounce first deletes the table change. After that `owner == address(0)`, `propose` has no passing caller, and the old table is permanent.

**Proof of concept.**

1. Clone has `delay = 2 days`, table `[A 5000, B 5000]`.
2. At `t0` the owner (for example a Safe batch) calls `propose(setBeneficiaries([A 1000, C 9000]))` → nonce 1, and `propose(transferOwnership(address(0)))` → nonce 2. Both have `eta = t0 + 2 days`.
3. At `eta`, B — whose row is being removed — calls `applyQueued(abi.encodeCall(transferOwnership, (address(0))), 2)`. The window checks pass, the entry is removed, and the self-call sets `owner = 0` and runs `_clearQueue()`, which deletes `queued[hash1]` and emits `Cancelled(hash1)`.
4. `applyQueued(setBeneficiaries(...), 1)` now reverts `NotReady(0)`. `propose` reverts `NotOwner` for everyone.
5. Every future `distribute` pays B 50% and C nothing, forever.

The same works whenever entry 1 is still unapplied when entry 2 matures. The owner cannot reliably win the race: both entries mature in the same second and the owner's own `applyQueued` is a public transaction.

**Handover variant.** `setBeneficiaries(X)` and `transferOwnership(N)` are queued together. N applies the nomination and calls `acceptOwnership()` in one transaction; `_clearQueue()` (`Distribution.sol:310`) drops X. This one is recoverable only if N chooses to re-propose.

**Why Medium and not High.** The NatSpec does state that a renounce "drops every queued action" (`Distribution.sol:288`), so the outcome is documented for the owner's own call. What is not documented, and not enforced, is that a third party chooses the order. The result is irreversible, but it needs the owner to leave another entry pending when the renounce matures.

**Recommendation.** Do not let a queue-clearing action jump the queue:

```diff
     function transferOwnership(address owner_) external onlySelf {
         if (owner_ == address(0)) {
+            // The entry that carries this renounce is already removed by `applyQueued`.
+            // Any entry still pending must be applied or cancelled first.
+            if (_pending.length != 0) revert QueueNotEmpty();
             emit OwnershipTransferred(owner, address(0));
             owner = address(0);
             pendingOwner = address(0);
-            _clearQueue();
             return;
         }
```

Alternatively enforce nonce order in `applyQueued` (see M-4), which closes both findings.

---

### M-2 — A clone cannot receive ETH from a 2,300-gas `transfer` / `send`

**Severity:** Medium
**Confidence:** 95 · **Origin:** [both] — phase 1: general, precision-math, assembly, proxies, dos; phase 2: 7 of 12 lenses
**Location:** `Distribution.receive` (`Distribution.sol:147`); clone runtime written in `DistributionFactory.create` (`Distribution.sol:473`)

**Description.** The NatSpec sets a budget:

```solidity
// Distribution.sol:146
/// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
receive() external payable {
    if (address(this) == self) revert Unauthorized();
    emit Received(msg.sender, msg.value);
}
```

ETH only ever reaches `receive` on a clone, because the implementation rejects it. A clone is the 45-byte PUSH0 minimal proxy, and its runtime (`5f5f365f5f37365f73<impl>5af4…`) executes a `DELEGATECALL` to the implementation before any Solidity code runs. Under EIP-2929 that call costs 2,600 gas when the implementation address is cold — more than the whole stipend.

| Step | Implementation cold | Implementation warm |
|---|---|---|
| Stipend | 2,300 | 2,300 |
| Proxy opcodes before the call | ~22 | ~22 |
| `DELEGATECALL` account access | 2,600 → out of gas | 100 |
| `receive` body (dispatch, `self` compare, LOG2 ≈ 1,381) | — | ~1,500–1,700, fits |

**Measured on-chain.** An `eth_call` on Base with state overrides placed the exact clone runtime (pointing at the live implementation `0xc4eD…cB0A`) at a test address and a caller that performs `CALL(gas = 0, clone, value = 1)` — the callee gets exactly the 2,300 stipend:

- implementation cold → the call returns `0` (failure);
- same call after the caller first touches the implementation (`BALANCE(impl)`) → returns `1` (success).

A plain value transfer to the clone estimates at 25,500 gas, i.e. about 4,500 of execution on top of the 21,000 base.

**Impact.** A payer contract that uses `transfer` reverts when it pays a clone; if the clone is hard-coded as its payout address, that payout path is blocked. A payer that uses `send` and ignores the result silently keeps the ETH. The payers are third parties whose send style the owner does not control, and this is a payment sink. No funds already in a clone are at risk. The behaviour also depends on transaction context: the same payment succeeds if anything touched the implementation earlier in the transaction.

The comment suggests the property was tested; a Foundry test that creates the clone and sends to it in the same test function sees a warm implementation and passes.

**Recommendation.** The deployed clone shape cannot be changed. Correct the statement and tell integrators:

```diff
-    /// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
+    /// @dev Reached through the clone's DELEGATECALL. A 2,300-gas `transfer`/`send` to a clone fails
+    /// unless the implementation is already warm in the transaction (EIP-2930 access list or an
+    /// earlier touch): the cold hop alone costs 2,600. Payers must use `call{value: x}("")`.
     receive() external payable {
```

For a future version, use a clone runtime that handles empty calldata without a `DELEGATECALL` (log and return in the proxy itself). That changes the init-code hash and so every clone address. Add a fork test that sends with exactly 2,300 gas in a fresh transaction.

---

### M-3 — A beneficiary with a token receive hook can block `distribute` for that token

**Severity:** Medium
**Confidence:** 80 · **Origin:** [both] — phase 1: erc20, assembly, dos, general; phase 2: economic-security, boundary (+ 6 lenses as leads)
**Location:** `Distribution._push` (`Distribution.sol:417`), called from `Distribution.distribute` (`Distribution.sol:166`)

**Description.** The ETH push is capped at `PUSH_GAS` and, inside `distribute`, copies no return data. The ERC-20 push has neither protection:

```solidity
// Distribution.sol:417
(ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
```

The comment justifies this as "an ERC-20 push is bounded by the token" (`Distribution.sol:390`). That holds only when the token never hands control to the recipient. For an honest token with receiver hooks (ERC-777 `tokensReceived`, ERC-677/1363-style callbacks, or an upgradeable token that later adds one), the recipient row runs code with 63/64 of all remaining gas. It can burn all of it, or revert with a large payload that the token bubbles and line 417 copies.

**Proof of concept.**

1. The table has 20 rows. Row 3 is Mallory's contract, registered in ERC-1820 as an ERC-777 recipient; its hook executes `INVALID`.
2. Token `T` (ERC-777) is paid to the clone. Anyone calls `distribute(T)` with gas `G`.
3. At row 3 the token forwards about 63/64 of the gas to the hook, which consumes it. The push fails; Mallory's own share is escrowed, so she loses nothing.
4. About 3% of `G` remains for 17 more transfers. Under a per-transaction cap of 16,777,216 gas (EIP-7825 on Ethereum) that is about 0.5M — enough for the escrow writes plus roughly 8 more hook-token transfers. With more rows behind the hostile one the transaction runs out of gas and reverts, at any gas limit the caller can choose.
5. Two hostile rows leave about 0.1% and block any table.

Mallory can grind a low address so that her row sorts first (`_set` forces ascending order).

**Impact.** All of that token's unreserved balance is undistributable for every other beneficiary while the row is in the table. The owner can remove the row after `delay`; if the owner has renounced, the block is permanent for hook tokens. ETH and tokens without recipient callbacks are unaffected (a reverting or blocklisted recipient simply falls into escrow). This also means the "worst-case `distribute` stays under half a block" rule behind `MAX_BENEFICIARIES` covers ETH only.

**Recommendation.** Cap the token push made from `distribute`, as the ETH push is capped. `claim` keeps the uncapped exit.

```diff
+    uint256 private constant TOKEN_PUSH_GAS = 300_000;
@@
-        (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
+        // `distribute` (keepData == false) caps the push; `release` and `claim` keep all gas.
+        (ok, data) = token.call{gas: keepData ? gasleft() : TOKEN_PUSH_GAS}(
+            abi.encodeWithSelector(TRANSFER, to, amount)
+        );
         ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
```

A stricter variant also bounds the copy: perform the call in assembly with a 32-byte output area and read `returndatasize()` and the first word, so a bubbled revert payload is never copied inside the loop. A paginated `distribute(token, from, count)` is a further option. At minimum, document hook tokens as unsupported.

---

### M-4 — Matured actions can be applied in any order; a superseded entry can win

**Severity:** Medium
**Confidence:** 80 · **Origin:** [both] — phase 1: governance, access-control, general; phase 2: trust-gap (+ 5 lenses as leads)
**Location:** `Distribution.applyQueued` (`Distribution.sol:242`), `Distribution.propose` (`Distribution.sol:220`)

**Description.** Each proposal is an independent `(action, nonce)` hash:

```solidity
// Distribution.sol:223
uint32 n = ++nonce;
hash = keccak256(abi.encode(action, n));
```

A later proposal on the same field does not invalidate an earlier one, and all four mutators are absolute overwrites. The result is "last applied wins", not "last proposed wins", and any caller chooses what is applied last, for up to `GRACE = 14 days` after each `eta`. The owner's only defence is to `cancel` every superseded hash by hand; nothing enforces or signals this.

**Proof of concept — table rollback.**

1. `delay = 7 days`. Day 0: the owner proposes `setBeneficiaries(T1)` (nonce 1, eta day 7).
2. Day 3: the owner corrects it with `setBeneficiaries(T2)` (nonce 2, eta day 10) and does not cancel nonce 1.
3. Day 10: a beneficiary favoured by T1 sends one transaction: `applyQueued(T2, 2)` then `applyQueued(T1, 1)`.
4. The table is T1. Both entries are consumed, so the owner's instant `cancel` has nothing left to act on. Restoring T2 costs another 7 days, and every `distribute` in between pays T1.

**Proof of concept — nomination hijack (irreversible).** The owner queues `transferOwnership(B)`, changes their mind and queues `transferOwnership(C)`. Once both mature, B applies C's entry, then its own, then calls `acceptOwnership()` in the same transaction. B is owner and the queue is cleared.

**Recommendation.** Make an applied entry close everything queued before it:

```diff
+    /// @notice Entries with a nonce below this value can no longer be applied.
+    uint32 public minNonce;
+
     function applyQueued(bytes calldata action, uint32 nonce_) external notLocked {
+        if (nonce_ < minNonce) revert Superseded();
         bytes32 hash = keccak256(abi.encode(action, nonce_));
         uint256 eta = queued[hash];
@@
         delete queued[hash];
         _remove(hash);
+        // An applied entry closes every entry queued before it.
+        minNonce = nonce_ + 1;
         _selfCall(action);
```

This forces in-order application: an older entry must be applied (or deliberately skipped) before a newer one. It also closes M-1, because a renounce queued last can then only be applied last. A lighter alternative is to supersede per selector. At minimum, document that every superseded proposal must be cancelled.

---

### M-5 — The clone address does not commit to owner, delay or table

**Severity:** Medium
**Confidence:** 70 · **Origin:** [both] — phase 1: access-control, proxies/chain, assembly, general; phase 2: 7 lenses as leads
**Location:** `DistributionFactory.create` (`Distribution.sol:459`), `DistributionFactory.predict` (`Distribution.sol:489`)

**Description.** The only binding on a clone address is the caller:

```solidity
// Distribution.sol:467
uint256 prefix = uint256(salt) >> 96;
if (prefix != uint256(uint160(msg.sender))) revert SaltDoesNotStartWith();
...
// Distribution.sol:476
distribution := create2(callvalue(), 0x0e, 0x36, salt)
```

The init code embeds only `implementation`; `owner_`, `delay_`, `description_` and `table_` do not enter the address. The NatSpec presents the address as a cross-chain identity and says "the deploying key never needs to own anything" (`Distribution.sol:450`), and `init` explicitly supports value "sent to the counterfactual address before any code existed there" (`Distribution.sol:131`).

In fact, whoever can make `msg.sender` equal the salt prefix on a chain where the salt is unused has sole and permanent authority over who receives everything sent to that address there. The clone's owner on the first chain has no say.

- **EOA deployer.** The "throwaway" deploy key stays a live privilege on every chain where the clone is not yet deployed. A later compromise of a key that was assumed powerless captures funds sent there.
- **Contract deployer (Safe, smart account).** The same address on another chain may be controlled by a different party (the replayed-deployment pattern). The salt check proves "an account at this address called", not "the same principal".
- **Shared sender contract.** If `create` is routed through a permissionless contract that calls rather than delegatecalls (a public multicall, batch executor or relayer), the prefix is that contract's address and anyone satisfies it — on another chain, or on the same chain by front-running the pending `create`. The honest `create` then hits the CREATE2 collision and burns its gas (`Distribution.sol:451`).

**Proof of concept.**

1. On Base, deployer `D` calls `create(vault, 7 days, "royalties", [A 6000, B 4000], salt = D ‖ …01)`. Clone `X` is published as the payment address.
2. On Ethereum `X` has no code. A payer sends 50 ETH to `X`, relying on the same-address statement.
3. Whoever controls `D` on Ethereum calls `create(attacker, 0, "", [attacker 10000], salt)`. The prefix check passes, CREATE2 lands on `X`, and `init` logs `Received(address(0), 50 ether)`.
4. Anyone calls `distribute(address(0))`; all 50 ETH goes to the attacker. The vault's signers and the 7-day delay never applied.

Preconditions: value reaches `X` on a chain (or at a time) where it is not deployed, and the controller of the prefix address there is hostile, compromised or simply a different party. An already deployed clone is not affected.

**Recommendation.** Make the address commit to the configuration, so the same address implies the same initial owner and table everywhere:

```solidity
bytes32 cfg = keccak256(abi.encode(owner_, delay_, description_, table_));
bytes32 finalSalt = keccak256(abi.encode(msg.sender, salt, cfg));
// create2(callvalue(), 0x0e, 0x36, finalSalt); predict() takes the same inputs
```

If the current scheme is kept, the NatSpec must say that the deploying address is a permanent privileged role on every chain where the salt is unused, that it must be a single-controller account that never relays arbitrary calls, and that nothing should be sent to a predicted address before `eth_getCode` is non-empty and `snapshot()` matches. Emitting the deployer in `Created` would also make the role visible.

---

### M-6 — Escrow has no exit for a contract that cannot receive in 100k gas and cannot call `claim`

**Severity:** Medium
**Confidence:** 75 · **Origin:** [both] — phase 1: dos, general; phase 2: 4 lenses as leads
**Location:** `Distribution.release` (`Distribution.sol:177`), `Distribution._push` (`Distribution.sol:408`), `Distribution.claim` (`Distribution.sol:199`)

**Description.** The retry path uses the same cap that caused the escrow:

```solidity
// Distribution.sol:408
(ok, data) = to.call{value: amount, gas: PUSH_GAS}("");
```

The only uncapped exit is `claim`, which the escrowed account itself must call:

```solidity
// Distribution.sol:200
uint256 amount = escrowed[token][msg.sender];
```

A contract beneficiary that can neither receive ETH within 100,000 gas nor originate a call to `claim` has no exit, and by design neither does the owner. Examples: a contract with no payable `receive`, an immutable forwarder or vault whose `receive` does more than 100k gas of work, a token contract. The same applies to an ERC-20 share when the token refuses the recipient (blocklist, transfer to the token's own address) and the recipient cannot call `claim`.

**Proof of concept.**

1. Row R is a contract whose `receive()` forwards into a deposit that needs about 150k gas. R has no generic `execute`.
2. `distribute(address(0))`: R gets 100,000 gas plus the stipend, runs out of gas, and the share is escrowed.
3. `release(address(0), R)` gives the same 100,000 and reverts `ReleaseFailed`, whatever gas the caller supplies.
4. `claim` from anyone else reads `escrowed[0][caller] == 0` and reverts `NothingToDo`.

Nobody is attacking. The loss is R's share only, it is permanent, and it grows with every distribution until the owner removes R through the timelock. Amounts already escrowed stay stuck after removal.

The cap in `release` protects nothing: the caller pays for its own gas, one account is paid, and the lock is held.

**Recommendation.** Forward all gas in `release` and keep the cap only inside the `distribute` loop:

```solidity
if (keepData) (ok, data) = to.call{value: amount}("");   // release: the caller pays
```

For recipients that can never receive ETH, let the table carry an optional per-row `claimTo`/recovery address, or add a wrap-to-WETH fallback. Document that a contract beneficiary must be able to call `claim`.

---

### L-1 — An applied nomination cannot be withdrawn in practice and never expires

**Severity:** Low
**Confidence:** 85 · **Origin:** [both] — phase 1: governance, access-control, general; phase 2: access-control, trust-gap (+ 3 lenses as leads)
**Location:** `Distribution.acceptOwnership` (`Distribution.sol:304`), `Distribution.transferOwnership` (`Distribution.sol:299`)

**Description.** Withdrawing a nomination is a self-call (`transferOwnership(owner)`), so it waits the full `delay`. Acceptance has no delay and clears the queue:

```solidity
// Distribution.sol:305
if (msg.sender != pendingOwner) revert Unauthorized();

emit OwnershipTransferred(owner, msg.sender);
owner = msg.sender;
pendingOwner = address(0);
_clearQueue();
```

A nominee can always accept before a queued withdrawal matures, and acceptance deletes that withdrawal. The NatSpec line "Naming the current owner withdraws a pending transfer" describes a power that works only against a nominee who does not act. `pendingOwner` also has no expiry, and it is missing from `Snapshot`, so the one-call reader does not see a dangling nomination.

**Proof of concept.** `delay = 7 days`. The nomination of B is applied. Months later B's key leaks; the owner proposes `transferOwnership(owner)`. The attacker calls `acceptOwnership()` in the next block, becomes owner, and the withdrawal is `Cancelled`. The attacker then queues a table of their choosing; the old owner has no cancel right left.

**Recommendation.** Removing a power needs no delay — this matches the contract's own rule that "the delay guards applying, not cancelling":

```diff
+    /// @notice Drop a pending nomination at once. This removes a power, so it needs no delay.
+    function cancelNomination() external {
+        if (msg.sender != owner) revert NotOwner();
+        pendingOwner = address(0);
+    }
+
     function acceptOwnership() external {
         if (msg.sender != pendingOwner) revert Unauthorized();
```

Also add `pendingOwner` to `Snapshot`, and consider an acceptance deadline.

---

### L-2 — A table change does not settle the balance that arrived under the old table

**Severity:** Low
**Confidence:** 85 · **Origin:** [both] — phase 1: governance, access-control, general; phase 2: asymmetry, trust-gap, execution-trace (leads)
**Location:** `Distribution.setBeneficiaries` (`Distribution.sol:274`), `Distribution._set` (`Distribution.sol:334`), `Distribution.distribute` (`Distribution.sol:155`)

**Description.** `_set` deletes and rebuilds `_table` without first distributing `balance − reserved`. Income that arrived under the old table is paid under whichever table is live when someone calls `distribute`. It cannot be settled inside `_set` in general, because the set of tokens is open-ended.

- With `delay > 0`, old-table beneficiaries are protected only if someone calls `distribute` for every token before `eta`. At `eta` a new-table beneficiary can bundle `applyQueued` + `distribute` in one transaction.
- With `delay == 0` (allowed at `init` and through `setDelay`), `propose` applies in the same call (`Distribution.sol:226`), so the owner can re-route the whole unreserved balance atomically: `propose(setBeneficiaries([owner 100%]))`, `distribute`, `propose(setBeneficiaries(old))`. This is owner power by design, but it contradicts the header claim that the contract "puts every change to itself behind one timelock" (`Distribution.sol:5`).

**Recommendation.** Document that accrued balances follow the table at distribution time. Optionally distribute ETH inside the change, or let `setBeneficiaries` take a list of tokens to settle under the old table first. See L-6 for a minimum delay.

---

### L-3 — Unbounded queue: `_clearQueue` can make handover and renounce exceed a transaction's gas

**Severity:** Low
**Confidence:** 75 · **Origin:** [both] — phase 1: dos, governance, access-control, general, proxies/chain; phase 2: 4 lenses as leads
**Location:** `Distribution.propose` (`Distribution.sol:234`), `Distribution._clearQueue` (`Distribution.sol:350`)

**Description.** `_pending.push(...)` has no cap on the number of entries or on `action` length. Both ownership exits run an all-or-nothing loop over every entry:

```solidity
// Distribution.sol:352
while (n > 0) {
    bytes32 hash = _pending[--n].hash;
    delete queued[hash];
    delete _pendingIndex[hash];
    _pending.pop();
    emit Cancelled(hash);
}
```

Estimated cost (not measured): about 26k gas per entry plus about 5k per 32-byte word of `action`.

- **Accidental.** A queued `setBeneficiaries` for a large table is hundreds of words, so a few million gas to clear. A handful of such entries put `acceptOwnership()` and a renounce above a 16,777,216-gas transaction cap.
- **Hostile outgoing owner.** After nominating B, the owner queues about 600 small entries (cheap on Base) or a few very large ones. B's `acceptOwnership()` always runs out of gas. B cannot cancel: the entries are not expired and B is not the owner.

Only the owner can grow the queue. Recovery exists: the owner can `cancel` entries one at a time, and anyone can after `eta + GRACE` — which, with a large `delay`, is effectively never.

**Recommendation.** Cap the queue and the action size, or clear in O(1) with an epoch:

```solidity
uint256 private constant MAX_PENDING = 16;
if (_pending.length >= MAX_PENDING) revert QueueFull();
// O(1) alternative: hash = keccak256(abi.encode(action, n, epoch)); ++epoch on accept / renounce
```

---

### L-4 — `_remove` copies the tail entry's `action`; a large tail blocks apply/cancel of earlier entries

**Severity:** Low
**Confidence:** 60 · **Origin:** [phase 1: dos] — re-examined against the source, kept
**Location:** `Distribution._remove` (`Distribution.sol:362`)

**Description.** Removing a non-tail entry copies the whole tail struct, including its `bytes action`, storage to storage:

```solidity
// Distribution.sol:367
if (i != last) {
    Pending storage moved = _pending[last - 1];
    _pending[i - 1] = moved;
    _pendingIndex[moved.hash] = i;
}
```

Per word that is roughly a cold read, a zero-to-non-zero write and a later clear — about 27k gas (estimate). If the owner queues a small action A and then a large table change Z (about 600+ words), `applyQueued(A)` and `cancel(hashA)` need more than 16.7M gas and fail under a per-transaction cap, for the owner and the public alike. A can only be handled after Z is removed; Z is the tail, so cancelling it is cheap. The owner can always recover by cancelling and re-proposing Z, so this is never permanent.

**Recommendation.** Cap `action.length`, or stop storing `action` in `_pending`: keep only `hash` and `eta`. `Queued` already logs the bytes and `applyQueued` takes them as calldata. That also removes most of L-3's per-entry cost.

---

### L-5 — Table writes are not sized to the gas cap; unbounded strings

**Severity:** Low
**Confidence:** 60 · **Origin:** [phase 1: dos] — re-examined, kept (gas figures are estimates)
**Location:** `Distribution.MAX_BENEFICIARIES` (`Distribution.sol:72`), `Distribution.propose` (`Distribution.sol:234`), `Distribution._set` (`Distribution.sol:334`)

**Description.** `MAX_BENEFICIARIES = 107` is derived from the cost of `distribute` only. Nothing bounds `name`, `note`, `description`, or the cost of writing a table.

- **Proposing a full table under a delay may not fit.** With `delay > 0` the whole `action` is stored in `_pending`. A 107-row table encodes to at least 7 words per row with empty strings and about 9 with short ones — roughly 750–960 words at about 22k gas each, i.e. 16.6M–21M gas. That is at or above Ethereum's 16,777,216 per-transaction cap. The same table passes `init`, so a clone can be created with a table it cannot replace by one of equal size.
- **`delete _table` scales with the old strings.** It costs about 5k gas per stored word. An owner who grows string storage across replacements can reach a point where the delete alone exceeds the cap, after which no `setBeneficiaries` can succeed. `distribute` keeps working because it reads only the first slot of each row.

Both are owner-side. The first reverts cleanly; the second is a self-inflicted freeze.

**Recommendation.** Bound string lengths in `_set` (for example 64 bytes for `name`, 128 for `note`) and bound `description`. Re-derive `MAX_BENEFICIARIES` from the worst-case `propose` + `applyQueued` cost on the tightest target chain, not only from `distribute`.

---

### L-6 — `delay` has no bounds at `init` or `setDelay`

**Severity:** Low
**Confidence:** 90 · **Origin:** [phase 1: governance, access-control, general, precision-math] — re-examined, kept
**Location:** `Distribution.setDelay` (`Distribution.sol:282`), `Distribution.init` (`Distribution.sol:140`)

**Description.**

```solidity
// Distribution.sol:282
function setDelay(uint32 delay_) external onlySelf {
    delay = delay_;
}
```

- **Zero.** `delay` may be 0 at `init`, or be set to 0 after one wait under the old delay. From then on `propose` executes in the same transaction and beneficiaries get no notice of table or ownership changes.
- **Maximum.** `setDelay(type(uint32).max)` (about 136 years), or a unit mistake such as milliseconds for seconds, makes every later change unreachable — including the `setDelay` that would undo it. This is an irreversible freeze with no `OwnershipTransferred(…, 0)` trace. At `init` the same mistake lands at an address whose salt is spent.

A reduction is itself queued under the old delay and existing entries keep their `eta`, so there is no retroactive bypass.

**Recommendation.**

```solidity
uint32 public constant MAX_DELAY = 30 days;
if (delay_ > MAX_DELAY) revert BadDelay();   // in setDelay and init
```

Add a minimum if zero-delay clones are not intended; if they are, say so explicitly in the header comment.

---

### L-7 — The self-call accepts any selector; the clone can become its own owner

**Severity:** Low
**Confidence:** 85 · **Origin:** [phase 1: governance, access-control, general] — re-examined, kept
**Location:** `Distribution._selfCall` (`Distribution.sol:376`), `Distribution.propose` (`Distribution.sol:220`), `Distribution.init` (`Distribution.sol:139`), `Distribution._set` (`Distribution.sol:339`)

**Description.** The `@param` on `propose` says `action` is "Calldata for one of this contract's `onlySelf` functions", but nothing checks the selector:

```solidity
// Distribution.sol:376
function _selfCall(bytes calldata action) private {
    (bool ok, bytes memory data) = address(this).call(action);
    if (!ok) _bubble(data);
}
```

Every external function is reachable with `msg.sender == address(this)`. Most gain nothing (`init` reverts, `distribute`/`release`/`applyQueued` behave as for anyone, `cancel` acts as a non-owner). Three corner states follow:

1. **Self-ownership is a silent, permanent lock.** Apply `transferOwnership(address(this))`, then apply `acceptOwnership()` as an action. `owner == address(this)` and the queue is cleared. `propose` then needs a self-call, and self-calls only start from `propose` or from a queue that is now empty. This equals a renounce but is logged as `OwnershipTransferred(old, clone)`, and `owner()` returns a non-zero address. `init` with `owner_ == predict(salt)` has the same effect from block one; `owner_ == address(0)` is also accepted without an event.
2. **The clone as a table row.** `_set` does not exclude `address(this)`. An ETH share pushed to self lands in `receive` and is re-split later. For a token that rejects self-transfers the share is escrowed under `address(this)`, and the owner can extract it with `propose(claim(token, to))` — the one case where the owner reaches escrow, contrary to the comment on `claim`. Only the share the visible table assigned to the clone is affected.
3. **Unusable actions queue successfully.** With `delay > 0` a malformed or unknown-selector action emits `Queued` and can never apply. Empty calldata reaches `receive` and "applies" as a no-op.

None of these gives access to other parties' funds.

**Recommendation.** Restrict the selector to the four mutators and reject the clone as owner, nominee and row:

```solidity
bytes4 s = bytes4(action[:4]);
if (s != this.setBeneficiaries.selector && s != this.setDescription.selector
    && s != this.setDelay.selector && s != this.transferOwnership.selector) revert Unauthorized();
```

Emit `OwnershipTransferred(address(0), owner_)` in `init` so a zero or self owner is visible.

---

### L-8 — A token balance below `reserved` makes `distribute` revert; escrow exits become first-come

**Severity:** Low
**Confidence:** 80 · **Origin:** [both] — phase 1: erc20, precision-math, dos, general; phase 2: 7 lenses as leads
**Location:** `Distribution.distribute` (`Distribution.sol:155`), `Distribution.release` (`Distribution.sol:181`), `Distribution.claim` (`Distribution.sol:203`)

**Description.**

```solidity
// Distribution.sol:155
uint256 amount = _balance(token) - reserved[token];
if (amount == 0) revert NothingToDo();
```

`reserved` and `escrowed` are fixed nominal amounts, and nothing ties them to the live balance. For a token whose balance can fall without a transfer from the clone — negative rebase, slashing, sender-side fee or rounding against the sender, seizure — the checked subtraction panics (`0x11`) instead of reverting `NothingToDo`. `distribute(token)` stays blocked until the balance exceeds `reserved` again, so new income first refills the hole instead of reaching the table. Escrow exits pay in arrival order and the last one fails. In the other direction, a positive rebase on escrowed balance is paid to the table, not to the escrowed accounts.

ETH and standard ERC-20s are unaffected. Recipient-side fee-on-transfer tokens are handled correctly, because income is measured by `balanceOf`.

**Example.** `reserved[T] = 100`; T rebases the clone to 90. `distribute(T)` panics. A claims 50; B's claim of 50 fails with 40 left. The next 30 T of income makes `distribute` see 20, so 10 units of table income now back B's escrow.

**Recommendation.** Saturate, and state that rebasing and sender-fee tokens are unsupported:

```solidity
uint256 bal = _balance(token);
uint256 res = reserved[token];
if (bal <= res) revert NothingToDo();
uint256 amount = bal - res;
```

---

### L-9 — Double-entry-point tokens bypass `reserved`

**Severity:** Low
**Confidence:** 55 · **Origin:** [both] — phase 1: erc20, general; phase 2: economic-security (lead)
**Location:** `Distribution.distribute` (`Distribution.sol:155`)

**Description.** Escrow is fenced only by address-keyed accounting. For a token reachable at two addresses A1 and A2 that share one ledger, `reserved[A1]` does not protect the balance when it is read through A2: `reserved[A2]` is 0, so the whole balance — including other parties' escrow — is treated as fresh income. `distribute` is permissionless and the caller names the token, so any table beneficiary can do this to take a pro-rata slice of someone else's escrow. Afterwards `reserved[A1] > balance`, with the effects of L-8.

The same class covers chains that expose an ERC-20 representation of the native coin: there `distribute(nativeErc20)` would spend `reserved[address(0)]`. None of the three deployed chains has such a token, but the factory is designed to sit at the same address "on every chain it reaches".

Rated Low because such tokens are rare today; the mechanism itself is unguarded.

**Recommendation.** Document double-entry and native-representation tokens as unsupported. For stronger protection, add an owner-set (timelocked) token allowlist, or refuse deployment on chains with a native-coin ERC-20.

---

### L-10 — A token that returns `false` on a successful transfer creates phantom escrow

**Severity:** Low
**Confidence:** 50 · **Origin:** [phase 1: erc20] — re-examined against `_push`, kept
**Location:** `Distribution._push` (`Distribution.sol:418`), `Distribution.distribute` (`Distribution.sol:167`)

**Description.** A non-reverting call that returns a word other than 1 is treated as "push failed":

```solidity
// Distribution.sol:418
ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
```

For a token that returns `false` (or a non-1 truthy word) even when the transfer happened, the tokens move and the contract also books the share as escrow. `reserved[token]` grows by the full distributed amount while the balance falls. The phantom reserve can never be cleared — `release` and `claim` transfer again, read `false` again and revert — and later income of that token is swallowed up to the phantom amount (L-8 effects). There is no rescue path.

This token class is exotic, hence Low.

**Recommendation.** Document it as unsupported, or decide success by balance delta on the ambiguous path: if the call succeeded but returned a non-1 word, treat the push as paid when `balanceOf(this)` fell by at least `amount`.

---

### L-11 — Rounding remainder always goes to the last row; zero shares are still pushed

**Severity:** Low
**Confidence:** 85 · **Origin:** [both] — phase 1: precision-math, erc20, general; phase 2: numerical-gap (lead)
**Location:** `Distribution.distribute` (`Distribution.sol:163`)

**Description.**

```solidity
// Distribution.sol:163
uint256 share = i + 1 == n ? amount - paid : (uint256(b.bps) * amount) / BPS_TOTAL;
paid += share;
```

Every row except the last is floored and the last row gets the remainder. The last row is always the numerically highest address, so the bias is deterministic and an address can be ground to capture it. The loss is per call, not per amount: up to `n − 1` base units move to the last row on every call, and `distribute` is permissionless with no minimum, so calling it after each small inflow maximises the skew. A row gets zero whenever `bps × amount < 10,000`, and nothing carries over.

For 18- and 6-decimal assets this is dust. For 0–2 decimal tokens or small recurring payments it is material: with a 2-decimal token, 100 rows of 1% and payments of 99 units, the last row takes every payment whole.

Zero shares are still pushed (a 100k-gas-capped call with value 0, or `transfer(account, 0)`). On tokens that revert on zero transfers this emits `Escrowed(token, account, 0)`.

`Σ shares == amount` always holds, and `amount − paid` cannot underflow.

**Recommendation.** `if (share == 0) continue;` before the push, and either carry remainders per row or require a minimum amount (for example `amount >= BPS_TOTAL`). At minimum, document that the highest-address row receives the remainder.

---

### L-12 — No gas floor before the capped ETH push

**Severity:** Low
**Confidence:** 50 · **Origin:** [phase 1: assembly, dos] — re-examined; phase 2 lenses independently ruled out the general case
**Location:** `Distribution._push` (`Distribution.sol:410`)

**Description.**

```solidity
// Distribution.sol:410
uint256 gasCap = PUSH_GAS;
assembly ("memory-safe") {
    ok := call(gasCap, to, amount, 0, 0, 0, 0)
}
```

Under EIP-150 the callee gets `min(100000, 63/64 of remaining gas)`. Nothing checks `gasleft()`, so the caller of `distribute` picks the real amount through the gas limit.

In the general case this is **not exploitable**: to starve a row, remaining gas must be below about 101.6k, and if the callee then runs out of gas, `distribute` keeps under 1.6k — too little for the escrow writes — so the whole transaction reverts and nothing is mis-escrowed. Five phase-2 lenses reached the same conclusion independently.

The narrow exception is a recipient that fails *cheaply* under low gas (for example a `receive` that checks `gasleft()` and reverts early, or a deep chain of clean reverts). A caller can then force that row's share into escrow. The share is recoverable through `release` or `claim`. The safety of the common case rests on arithmetic, not on a check.

**Recommendation.** Make the property explicit:

```solidity
if (gasleft() < PUSH_GAS + PUSH_GAS / 63 + 50_000) revert InsufficientGas();
```

---

### I-1 — Comments disagree with the code

**Severity:** Informational
**Confidence:** 95 · **Origin:** [both] — phase 1: general, proxies/chain, assembly, precision-math; phase 2: asymmetry (leads)

- **`create` vs `init` on the deposit log.** `Distribution.sol:442` says value riding the CREATE2 "lands in the clone without a `Received` log". `init` emits exactly that log (`Distribution.sol:143`: `if (address(this).balance != 0) emit Received(address(0), address(this).balance);`), together with any pre-funded balance. An integrator who follows the first comment double-counts the deposit.
- **"Every mutator is `onlySelf`"** (`Distribution.sol:123`). `cancel` and `acceptOwnership` mutate queue and owner state without it.
- **Lock holders.** The comments on `propose` and `applyQueued` (`Distribution.sol:217`, `Distribution.sol:241`) name `distribute` and `release`; `claim` holds the same lock.
- **"23x the larger need"** (`Distribution.sol:57`). 100,000 / 4,029 ≈ 24.8.
- **`snapshot` — "Everything a reader needs in one call"** (`Distribution.sol:313`). The `Snapshot` struct has no `pendingOwner`, the one role that can change `owner` with no delay.
- **Stipend statement** — see M-2.

---

### I-2 — Uninitialised instances accept value they can never pay out

**Severity:** Informational
**Confidence:** 85 · **Origin:** [phase 1: access-control, proxies/chain, general] — re-examined, kept
**Location:** `Distribution.distribute` (`Distribution.sol:158`)

The implementation cannot be taken over: `init` is factory-only and the factory only initialises fresh clones; `owner` is 0; there is no `selfdestruct` or `delegatecall`. Two residual behaviours:

- **Stranded value.** The `self` guard exists only in `receive`. ERC-20 tokens sent to the implementation, or ETH forced in, are stuck: `_table.length == 0` and nothing can set a table. The factory has no rescue either.
- **Phantom `Distributed`.** With a non-zero balance, `distribute(token)` on the implementation runs a zero-row loop and emits `Distributed(token, amount)` while moving nothing, repeatably and by anyone. The same is true of a byte-identical proxy deployed outside the factory, which also accepts ETH (`address(this) != self`) and can never be initialised.

**Recommendation.** `if (n == 0) revert BadTable();` in `distribute`. Tell indexers to trust only addresses from the factory's `Created` events.

---

### I-3 — `cancel` and `acceptOwnership` carry no lock modifier

**Severity:** Informational
**Confidence:** 90 · **Origin:** [both] — phase 1: access-control, governance; phase 2: access-control (lead)
**Location:** `Distribution.cancel` (`Distribution.sol:260`), `Distribution.acceptOwnership` (`Distribution.sol:304`)

A callee — a table row with 100k gas, a token with all gas, a `claim` recipient — can enter both functions during `distribute`, `release` or `claim`. Neither writes `_table`, `reserved` or `escrowed`, so they cannot alter the distribution in progress or reach funds, and `propose`/`applyQueued` stay blocked by `notLocked`. No harmful effect was found. Adding `notLocked` to both would make the lock coverage uniform.

---

### I-4 — `release` copies and re-throws recipient-chosen revert data

**Severity:** Informational
**Confidence:** 80 · **Origin:** [phase 1: assembly, dos] — re-examined, kept
**Location:** `Distribution.release` (`Distribution.sol:187`), `Distribution._bubble` (`Distribution.sol:421`)

On the `keepData` branch the capped ETH call copies all return data, and a failure longer than one word is re-thrown verbatim. With 102,300 gas a recipient can return about 208 KB, which costs the `release` caller roughly 120k extra gas in a transaction that reverts anyway. The recipient also chooses the bytes, so `release` can appear to revert with any error longer than a word (`NotReady(uint256)`, `Error(string)`), which can mislead off-chain decoders. On the ERC-20 branch, a *successful* call that returns more than 32 bytes with a first word other than 1 has its return data re-thrown as if it were a revert reason. No state effect; `distribute` is immune.

**Recommendation.** Cap the copy (for example 256 bytes) or always revert `ReleaseFailed(token)` on the ETH branch; bubble only when the low-level call itself failed.

---

### I-5 — Caller-named `token` is not validated: fake-token events and state

**Severity:** Informational
**Confidence:** 80 · **Origin:** [both] — phase 1: erc20, assembly, general; phase 2: boundary (lead)
**Location:** `Distribution._balance` (`Distribution.sol:385`), `Distribution._push` (`Distribution.sol:417`)

A codeless address is rejected in `distribute` (empty return data fails `abi.decode`). Precompiles are not: `distribute(address(4))` (identity) echoes the calldata as a huge "balance", every `transfer` returns a non-1 word, and with a one-row table the call succeeds and writes `escrowed[0x04][…]`, `reserved[0x04]` and `Escrowed`/`Distributed` events. A purpose-built token can do the same with any numbers. All of it is keyed by the fake token address and the lock is global, so no real asset is affected. In `release`/`claim`, `_push` treats an empty return from a codeless address as success; this matters only for a token that had code when the escrow was created and none later.

**Recommendation.** Optionally require `token.code.length != 0`. Tell indexers to ignore events for tokens outside their own allowlist.

---

### I-6 — Gas-schedule constants and chain assumptions

**Severity:** Informational
**Confidence:** 70 · **Origin:** [phase 1: proxies/chain, dos, general, precision-math] — re-examined, kept

- **`MAX_BENEFICIARIES` reference limit.** The comment (`Distribution.sol:67`) sizes the table to "half a 30M block". On Ethereum the binding constraint is the 16,777,216 per-transaction cap (EIP-7825). The quoted worst case of 14,896,325 fits with about 1.88M of headroom — about 17.7k gas per row. The row figure was re-derived by hand and matches (2,100 + 2,600 + 9,000 + 100,000 + 22,100 + ~200 + 1,756 ≈ 138k). Any repricing that adds more than that headroom per row would make a fully hostile 107-row table undistributable for ETH, and the constant cannot be lowered.
- **EIP-7702 recipients.** A row that is a delegated EOA costs the caller an extra cold access for the delegation target. If the measurement used a plain contract recipient, 107 rows come to about 15.17M — over the stated 15M rule, still under the cap. Re-measure.
- **The bound covers ETH only** — see M-3.
- **Cancun dependency.** The clone needs PUSH0; the logic needs TLOAD/TSTORE. On a chain with Shanghai but not Cancun, deployment, `create`, `init` and `receive` all succeed, and every exit (`distribute`, `release`, `claim`, `propose`, `applyQueued`) hits an invalid opcode — funds go in and cannot come out. Ethereum, Base and Base Sepolia are fine; the factory is placed through a permissionless keyless proxy, so anyone can deploy it elsewhere. A constructor probe (`pop(tload(0))`) would fail the deployment instead, but changes the canonical addresses.
- **Floating pragma.** `pragma solidity ^0.8.28;` (`Distribution.sol:2`) while the deployment is pinned to 0.8.38.
- **Unbounded views.** `snapshot()` returns the whole table and every pending `action`.
- **Assembly.** The factory's `mstore(0x24, …)` overwrites the top four bytes of the free-memory pointer and restores them with `mstore(0x24, 0)`. This is identical to solady's `LibClone` and safe in practice, but strictly outside Solidity's definition of memory-safe. The init code, the 45-byte runtime, the jump target and the `DeploymentFailed()` selector (`0x30116425`, recomputed) are correct, and `predict` matches `create`.

---

### I-7 — No emergency path; token blocklist and pause behaviour

**Severity:** Informational
**Confidence:** 80 · **Origin:** [phase 1: governance, erc20] — re-examined, kept

- **No pause and no fast path.** If a beneficiary key is compromised, anyone can keep calling `distribute` and pay that row until a replacement table matures. This is the inverse of L-6 and a design trade-off worth stating to integrators.
- **Blocklisted beneficiary.** The push fails and the share is escrowed; other rows are unaffected. `claim(token, to)` lets the blocked account redirect to another address, because the token only checks the clone as sender. Integrators with compliance requirements should know this.
- **Paused token.** Every push fails, so a `distribute` during a pause converts the whole unreserved balance into escrow for the current table — which pins that income to the current table ahead of a queued change.
- **Clone itself blocklisted.** All balance and escrow of that token is stuck with no rescue; inherent to holding the asset.

---

### I-8 — A queued entry keeps its `eta` when the delay is raised

**Severity:** Informational
**Confidence:** 90 · **Origin:** [phase 2: trust-gap] — re-examined against `propose`, kept
**Location:** `Distribution.propose` (`Distribution.sol:231`)

```solidity
// Distribution.sol:231
uint256 eta = block.timestamp + d;
queued[hash] = eta;
```

`eta` is fixed at propose time and `setDelay` does not rewrite existing entries. An owner can queue a change under a 1-day delay and then raise the delay to 30 days; a reader who checks only `delay` expects 30 days of notice, while the old entry stays applicable from its original `eta`. The entry is visible in `snapshot().pending`. Readers should rely on the pending list, not on `delay`.

---

## Examined and not reported as findings

- **Reentrancy.** One transient lock covers `distribute`, `release` and `claim`; `propose` and `applyQueued` refuse entry while it is held; escrow is zeroed before the external call in both exits. No cross-function path changes `_table`, `reserved` or `escrowed` mid-call.
- **Initialisation.** `init` is factory-only with a `_table.length` latch; `_set` never leaves the table empty, so `init` cannot run twice. Create and init are atomic.
- **Escrow accounting.** `reserved[t] == Σ escrowed[t][*]` on all three write sites; `claim` moves only the caller's entry; `release` pays only the account.
- **Timelock windows.** The apply window (`eta ≤ now ≤ eta + GRACE`) and the public-cancel window (`now > eta + GRACE`) are exact complements. Nonces make hashes unique; a failing action reverts whole and stays queued; a delay reduction waits the old delay.
- **Queue bookkeeping.** `_remove` swap-and-pop updates the moved entry's index; `queued`, `_pending` and `_pendingIndex` stay consistent.
- **`uint256(b.bps) * amount` overflow.** Only above about 1.16e73 units, i.e. only for a hostile `balanceOf`, and only that token is affected. Rejected as implausible.
- **Salt squatting on the same chain by a third party.** Prevented by the sender prefix (the shared-sender exception is in M-5).

## Access-Control Inventory

| Function | Line | Guard | Who can call | Moves value |
|---|---|---|---|---|
| `Distribution.init` | 134 | `msg.sender == factory && _table.length == 0` | Factory, once per clone | Accepts value |
| `Distribution.receive` | 147 | reverts on the implementation | Anyone (clone only) | ETH in |
| `Distribution.distribute` | 154 | `nonReentrant` | Anyone | ETH / token out to rows |
| `Distribution.release` | 177 | `nonReentrant` | Anyone, for any escrowed account | Escrow → account |
| `Distribution.claim` | 199 | `nonReentrant`; keyed by `msg.sender` | The escrowed account | Escrow → `to` |
| `Distribution.propose` | 220 | `notLocked`; `msg.sender == owner` | Owner | No |
| `Distribution.applyQueued` | 242 | `notLocked`; `eta ≤ now ≤ eta + GRACE` | Anyone | No |
| `Distribution.cancel` | 260 | owner, or anyone after `eta + GRACE` | Owner / anyone (expired) | No |
| `Distribution.setBeneficiaries` | 274 | `onlySelf` | Timelock self-call | No |
| `Distribution.setDescription` | 278 | `onlySelf` | Timelock self-call | No |
| `Distribution.setDelay` | 282 | `onlySelf` | Timelock self-call | No |
| `Distribution.transferOwnership` | 291 | `onlySelf` | Timelock self-call | No |
| `Distribution.acceptOwnership` | 304 | `msg.sender == pendingOwner` | Pending owner | No |
| `DistributionFactory.create` | 459 | salt top 20 bytes == `msg.sender` | Anyone, for their own salt | `msg.value` → clone |

Views (`snapshot`, `beneficiaries`, `pendingCount`, public getters, `predict`) are unguarded and write nothing.

**Roles**

| Role | Granted | Removed / transferred | Unlocks |
|---|---|---|---|
| `owner` | `init` (unvalidated); `acceptOwnership` | Two-step handover; renounce by `transferOwnership(0)` (terminal, clears the queue) | `propose`; `cancel` of any entry |
| `pendingOwner` | `transferOwnership(x)` through the timelock | Withdrawn only through the timelock; no expiry | `acceptOwnership` (no delay, clears the queue) |
| self (timelock) | Only during `_selfCall` from `propose` (delay 0) or `applyQueued` | — | The four `onlySelf` mutators, and any other function as `address(this)` |
| `factory` | Implementation immutable | Immutable | `init` |
| Escrowed account | A failed push in `distribute` | `release` / `claim` | `claim` of its own entry |
| Deployer (salt holder) | Per call, by salt prefix | Not stored | `create` for that salt: chooses owner, delay, table — per chain |

**Unguarded state-changing entry points:** `create`, `receive`, `distribute`, `release`, `claim` (caller-scoped), `applyQueued`, `cancel` (expired entries).

Entrypoints: 14 state-changing in source, 14 in inventory.

## Threat Model

| # | Actor | What they can reach | Verdict |
|---|---|---|---|
| T1 | Hostile ETH beneficiary | 100k gas inside `distribute` / `release`; `cancel`, `acceptOwnership`, `receive` under the lock | Invariant holds — a failing row is escrowed and the loop continues; nothing the callee can enter writes the table or escrow (I-3) |
| T2 | Caller choosing the gas limit | `min(PUSH_GAS, 63/64)` at the push | Holds in the general case; narrow exception in L-12 |
| T3 | Caller ordering `distribute` vs `applyQueued(setBeneficiaries)` | Balance that arrived under the old table | Addressed by L-2 |
| T4 | Caller choosing apply order | Any matured entry for 14 days | Addressed by M-1, M-4 |
| T5 | Hostile token named by the caller | Return values, return data, callbacks | Invariant holds for honest assets — accounting is keyed per token and the lock is global; noise in I-5 |
| T6 | Non-standard honest token | Fee, rebase, blocklist, hooks, return word | Addressed by M-3, L-8, L-9, L-10, I-7 |
| T7 | Malicious or compromised owner | `propose`, `delay == 0`, `setDelay`, `cancel` | No path to escrow (holds). Redirecting income: L-2, L-6 |
| T8 | Owner through the self-call target set | Non-`onlySelf` functions as `address(this)` | Addressed by L-7 |
| T9 | Pending owner | Instant `acceptOwnership`, clears the queue | Addressed by L-1 (and the M-1 handover variant) |
| T10 | Outgoing owner growing `_pending` | `_clearQueue` loop | Addressed by L-3, L-4 |
| T11 | Deployer / salt-prefix holder on another chain | `create` with another table at the same address | Addressed by M-5 |
| T12 | Payer that forwards only the stipend | `receive` through the proxy | Addressed by M-2 |
| T13 | Contract beneficiary that cannot receive or claim | `release`, `claim` | Addressed by M-6 |
| T14 | Anyone sending value to the implementation / factory | Stranded value | Addressed by I-2 |
| T15 | Caller making many small `distribute` calls | Floor rounding, zero pushes | Addressed by L-11 |
| T16 | Caller using `release` / expired `cancel` | Timing of a payment; removing dead entries | Invariant holds — `release` pays only `account`; non-owner cancel only after expiry |
| T17 | Integrator reading views mid-call | `reserved`, `escrowed` during a push | Invariant holds for the contract; integrators must not read these inside a callback (noted in I-6) |
| T18 | Anyone before deployment | Pre-funding the predicted address; salt reuse | Pre-funding does not block `create` (holds); who receives it is M-5 |

## Invariant Verification

Inferred invariants from the mechanical pre-scan, each answered by this audit.

| ID | Property | On-chain | Verdict |
|---|---|---|---|
| I-1 | `reserved[t] == Σ escrowed[t][*]` | Yes | holds — paired writes at all three sites |
| I-2 | Shares of one `distribute` sum to `amount` | Yes | holds — last row takes the remainder |
| I-3 | Initialised table: 1–107 rows, `bps > 0`, sum 10,000, strictly ascending non-zero accounts | Yes | holds — `_set` is the only writer |
| I-4 | `_balance(token) >= reserved[token]` | No | violated → L-8 (also L-9, L-10) |
| I-5 | `init` runs at most once per clone | Yes | holds |
| I-6 | `queued`, `_pendingIndex`, `_pending` agree | Yes | holds |
| I-7 | Apply only in `[eta, eta + GRACE]`; public cancel only after | Yes | holds — exact complements |
| I-8 | Configuration changes only by self-call from `propose` / `applyQueued` | Yes | holds — but the self-call reaches more than the four mutators (L-7) |
| I-9 | Every change waits a timelock | No | violated → L-6, L-2 (`delay == 0`), L-1 (instant acceptance) |
| I-10 | Each proposal hash is unique | Yes | holds |
| I-11 | A clone's `receive` completes inside 2,300 gas | No | violated → M-2 (measured) |
| I-12 | `claim` moves only the caller's escrow | Yes | holds |
| I-13 | ETH push from `distribute` / `release` forwards at most 100,000 gas | Yes | holds — it is a ceiling, not a floor (L-12) |
| I-14 | Worst-case `distribute` stays under half a block | No | violated → M-3 (ERC-20 branch); ETH branch holds (I-6) |
| I-15 | `owner == address(0)` is terminal | Yes | holds |
| I-16 | `_pending.length` is bounded | No | violated → L-3, L-4 |
| I-17 | Escrow outlives a table change | Yes | holds |
| X-1 | Only the factory initialises a clone, in the deploying transaction | Yes | holds |
| X-2 | `predict(salt)` equals the `create` address | Yes | holds — byte layout checked |
| X-3 | Same clone address ⇒ same owner / delay / table across chains | No | violated → M-5 |
| X-4 | ETH cannot be sent to the factory or implementation by a plain call | Yes | holds — forced ETH and tokens can still strand (I-2) |
| E-1 | Every held unit backs an escrow or is distributable | No | violated → L-8 |
| E-2 | Only a push to the account or its own `claim` moves an escrow; the owner has no path | Yes | holds — one exception when the clone itself is a table row (L-7) |
| E-3 | A beneficiary keeps its share until a change the public could see for `delay` | No | violated → L-2, L-6, M-4 |

Coverage: 14 entrypoints in inventory, 14 addressed. 18 threat rows, 18 answered. 24 inferred invariants, 24 answered (16 hold, 8 violated, 0 could not verify). Holes closed this pass: 0.

## Method and limits

- **Phase 0a — x-ray pre-scan:** mechanical enumeration, grep-verified entry points, invariant synthesis. No git history exists for an on-chain target; coverage metrics unavailable — target-code execution disabled by audit policy.
- **Phase 0 — context:** three agents built the access-control inventory, protocol map and external-surface map; no findings in this phase.
- **Phase 1 — breadth:** eight checklist agents (general, precision-math, ERC-20, governance/timelock, assembly/CREATE2, DoS, access-control, proxies + chain-specific) produced 67 raw findings.
- **Phase 2 — depth:** twelve attack agents, blind to phase 1, produced 14 findings and 48 leads raw; 6 findings and 14 leads after dedup and gating.
- **Reconciliation:** cross-phase dedup by root cause, targeted re-read of every single-phase finding, severity assigned here, every citation checked against the source file.

Severity changes made during reconciliation: the renounce-ordering issue was raised as High by one phase-1 agent and is reported as Medium (reasoning in M-1). Three phase-1 Medium ratings were lowered to Low (double-entry tokens, false-on-success tokens, unbounded queue) because they need rare tokens or owner action. The escrow-exit issue was a phase-2 lead and is reported as Medium because the loss is permanent.

Limits: gas figures are schedule arithmetic unless marked "measured". Per-transaction gas caps on Base were not confirmed. Tests, deployment scripts and the referenced design documents were not available. Mainnet `implementation()` was not read directly (the source and factory address are verified identical there).

> This review was performed by an AI system. It cannot prove the absence of vulnerabilities and gives no guarantee of security. An independent human review, a bug bounty and on-chain monitoring are recommended before significant value depends on this code.
