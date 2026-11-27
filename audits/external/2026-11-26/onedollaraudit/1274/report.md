# Security Audit — vRake DNZN Distribution (LeftClaw job 1274)

**Target (on-chain source, Base, chain id 8453):**

- Clone: `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199` — 45-byte PUSH0 minimal proxy, runtime `5f5f365f5f37365f73c4ed7ea21b8cc334f08945b4d0c182e0aff8cb0a5af43d5f5f3e6029573d5ffd5b3d5ff3` (read with `eth_getCode`; not separately verified on Sourcify, and it needs no source)
- Implementation (the logic audited): `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` — Sourcify **exact match**, single file `src/Distribution.sol` (501 lines, 322 nSLOC), contracts `Distribution` and `DistributionFactory`, solc 0.8.38, viaIR, optimizer 1000 runs, evmVersion cancun

Fetch what was read: `https://sourcify.dev/server/v2/contract/8453/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A?fields=sources`. There is no git repository in scope; every `Distribution.sol:N` citation below is a line of that verified file.

**Live state read during the audit (Base block ≈ 62,748,775):** `owner()` = `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` (PUSH0 clone of `0xD54cb65224410F3Ff97a8E72f363f224419f4FB0`; `threshold()` = 2, four owners) · `delay()` = 604800 · `nonce()` = 0 · `pendingOwner()` = 0 · `pendingCount()` = 0 · balance 0 · table = treasury 2000 bps (`0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9`, vault clone), ops 4000 bps (`0x00c0e887…3790`, the owner itself), creator 4000 bps (`0x357836fFcB45307FA7ff2A574F505753c961902B`, no code, last row).

**Severity counts:** 0 Critical · 0 High · 3 Medium · 13 Low · 7 Informational

**Reconciliation summary:** Overlap: 12 · Phase-1-only: 11 · Phase-2-only: 0 · Re-examined leads kept: 11, demoted: 1 · Coverage holes closed: 0 · Invariants: 20 answered (13 hold, 7 violated, 0 unverified). Reporting floor: Low severity and above are findings; anything with confidence below 50 is listed under Leads.

`Coverage: 14 entrypoints in inventory, 14 addressed. 18 threat rows, 18 answered. 20 inferred invariants, 20 answered. Holes closed this pass: 0.`

---

## 1. Verdict

No path was found that lets a third party take funds from the clone, redirect another party's share, or reach an owner-only setter. The split arithmetic is exact per call, the escrow accounting is consistent, the reentrancy lock covers every money path, and all four setters are reachable only through the owner's timelock.

The three Medium findings are about things working differently from what the contract's own comments promise:

1. **ETH sent with `transfer`/`send` (2,300 gas) cannot reach the clone** — measured on Base: 4,159 gas cold. Check every payer.
2. **An ownership nomination, once applied, cannot be withdrawn before the nominee can accept.**
3. **Matured timelock actions can be applied by anyone, in any order** — a "set final table, then renounce" pair can be applied renounce-first, freezing the old table forever.

Nothing is queued today (nonce 0), so findings 2 and 3 are about how the owner operates the contract from here on.

## 2. Answers to the client's stated concerns

| Concern | Answer |
|---|---|
| Share-math rounding and dust | Sound. Shares always sum to the amount; no dust is ever stranded. The last row (creator, highest address) gains at most 1.4 base units per `distribute` on the 20/40/40 table, zero when `amount % 5 == 0`. Only matters for 0–2-decimal tokens or dust spam — see L-10. |
| Reentrancy on payout to a contract recipient | Not exploitable. `distribute`/`release`/`claim` share one transient lock; `propose`/`applyQueued` refuse to run under it; escrow is zeroed before the external call. `cancel` and `acceptOwnership` can run inside a callback but touch only the queue and the owner — I-05. |
| Griefing on payout | ETH path: bounded (100,000 gas cap, no return data copied, failed row only escrows itself). A caller cannot choose a gas limit that forces a healthy recipient into escrow — the arithmetic is in §6. ERC-20 path: not bounded — L-02. |
| Differences between the ETH and ERC-20 paths | Four real ones: no gas cap on the ERC-20 push (L-02); `balance − reserved` can underflow only for tokens (L-03); success is inferred from the return word only (L-09); a code-less token counts as paid in `release`/`claim` (L-09). |
| Access control on the owner-only setters | Sound. All four are `onlySelf`; the only producer of `msg.sender == address(this)` is `_selfCall`, reached from `propose` (owner) or `applyQueued` (owner-queued, matured). Caveats: the self-call accepts any calldata (L-07), `setDelay` has no bounds (L-01). |
| Anything that can strand funds | (a) 2,300-gas payers — funds stay with the payer (M-01); (b) a row that cannot receive in 100k gas and cannot call `claim` (L-04); (c) rebasing/clawback tokens (L-03); (d) anything sent to the implementation address (L-08); (e) a frozen table after renounce or a bad `setDelay` (M-03, L-01). |

---

## 3. Findings

Each finding carries an explicit severity (impact) and a separate confidence (how sure we are it is real). Origin tags: `[both]` = raised independently by the breadth and the blind depth phase; `[phase1: …]` / `[phase2: …]` = one phase only, then re-read during reconciliation.

### M-01 — ETH sent with a 2,300-gas stipend cannot reach the clone

**Severity:** Medium · **Confidence:** 95 · **Origin:** `[both]` — phase 1 proxies / assembly / dos / general; phase 2 agents 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12 (11 of 12 lenses)
**Location:** `Distribution.receive` — `Distribution.sol:146-150`; clone runtime built at `Distribution.sol:473-476`

```solidity
146    /// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
147    receive() external payable {
148        if (address(this) == self) revert Unauthorized();
149        emit Received(msg.sender, msg.value);
150    }
```

**Description.** The body fits 2,300 gas; the path to it does not. Every call to the clone first runs the proxy's `DELEGATECALL` to the implementation. In an ordinary payer transaction the implementation address is cold, so that opcode costs 2,600 gas (EIP-2929) — more than the whole stipend — after 22 gas of proxy preamble. The frame runs out of gas before any `Distribution` code executes.

**Proof (measured on Base, `eth_call` against the live clone, value 1 wei, empty calldata):**

| Case | Minimum transaction gas | Execution gas | Fits 2,300? |
|---|---|---|---|
| Implementation cold (normal payer) | 25,159 | **4,159** | No |
| Implementation pre-warmed by an EIP-2930 access list | 25,059 (incl. 2,400 access-list charge) | **1,659** | Yes |

With a 23,300 gas limit (21,000 intrinsic + 2,300) the call fails with `out of gas`.

**Impact.** A payer contract that uses Solidity `transfer` reverts every time it pays the clone. A payer that uses `send`, or a 2,300-gas call with an unchecked result, silently keeps the ETH while the beneficiaries receive nothing and no `Received` log exists. WETH9-style `withdraw()` to the clone fails the same way. The clone is not upgradeable, so this cannot be fixed for `0xB611…5199`. The same applies to every clone the factory makes. Funds are not lost inside the clone; they never arrive.

**Recommendation.**

Option A — document (the only option for the deployed clone; this is the phase-2 fix, verbatim):

```diff
-    /// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
+    /// @dev Through a clone this does NOT fit a 2,300-gas stipend: the proxy's cold DELEGATECALL
+    /// alone costs 2,600 gas. Payers must use `call`, or list the implementation in an access list.
     receive() external payable {
```

Audit every contract that will pay the clone for `transfer`/`send`. Payers must use `call{value: …}("")` with at least ~5,000 gas, or include `0xc4eD…cB0A` in an access list.

Option B — future clones only: use a clone runtime that handles empty-calldata ETH in the proxy itself (log and stop when `calldatasize() == 0`, delegate otherwise). This changes the clone bytes and the `predict` hash. Add a fork test that sends exactly 2,300 gas to a fresh clone with a cold implementation.

---

### M-02 — An applied nomination cannot be withdrawn before the nominee can accept, and acceptance deletes the withdrawal

**Severity:** Medium · **Confidence:** 80 · **Origin:** `[both]` — phase 1 governance / general / access-control; phase 2 agent 11 (finding), agents 2 and 4 (leads)
**Location:** `Distribution.transferOwnership` — `Distribution.sol:291-300`; `Distribution.acceptOwnership` — `Distribution.sol:304-311`

```solidity
299        pendingOwner = owner_ == owner ? address(0) : owner_;
...
305        if (msg.sender != pendingOwner) revert Unauthorized();
306
307        emit OwnershipTransferred(owner, msg.sender);
308        owner = msg.sender;
309        pendingOwner = address(0);
310        _clearQueue();
```

**Description.** Withdrawing a nomination ("Naming the current owner withdraws a pending transfer", L290) is itself an `onlySelf` action, so it waits the full `delay` (7 days here) and is announced in a public `Queued` event. Acceptance is immediate, has no deadline, and calls `_clearQueue()`, which deletes the queued withdrawal along with everything else. `cancel` removes queue entries only; it cannot clear `pendingOwner`. The nomination never expires, and `snapshot()` (L313-318, "Everything a reader needs in one call") does not return `pendingOwner`, so a dormant nominee is easy to forget. This differs from OpenZeppelin `Ownable2Step`, where the owner overwrites a nomination instantly, and it contradicts L286-287 ("until then the current owner keeps every power").

**Proof of concept.**
1. `transferOwnership(B)` is proposed and applied after 7 days: `pendingOwner = B`. B does not accept.
2. Later B's key leaks (or B was the wrong address). The owner proposes `transferOwnership(owner)`; eta = now + 604800.
3. Whoever holds B's key sees the `Queued` log and calls `acceptOwnership()` in the next block. `owner = B`; `_clearQueue()` cancels the withdrawal.
4. B proposes `setBeneficiaries([{B, 10000}])`. Only B can cancel it. After 7 days every future inflow goes to B. The previous owner has no on-chain countermeasure at any step; the other beneficiaries can only call `distribute` on what has already arrived.

This needs a nomination to exist and the nominee to be hostile or compromised; it is not a third-party attack on today's state (`pendingOwner` is zero).

**Recommendation.** Give the owner an immediate revocation and bound the nomination:

```solidity
function revokeNomination() external {
    if (msg.sender != owner) revert NotOwner();
    pendingOwner = address(0);
}
// transferOwnership: pendingOwnerDeadline = block.timestamp + GRACE;
// acceptOwnership:   if (block.timestamp > pendingOwnerDeadline) revert Expired(pendingOwnerDeadline);
```

Add `pendingOwner` to `Snapshot`. Operationally, for the deployed clone: nominate only an address whose control has been proven beforehand, and have it accept immediately.

---

### M-03 — Matured actions can be applied by anyone in any order; a renounce or handover applied first erases its siblings

**Severity:** Medium · **Confidence:** 85 · **Origin:** `[both]` — phase 1 governance / general / access-control; phase 2 agents 4 and 11 (leads)
**Location:** `Distribution.applyQueued` — `Distribution.sol:242-255`; `transferOwnership` renounce branch — `Distribution.sol:292-297`

```solidity
247        if (eta == 0 || block.timestamp < eta) revert NotReady(eta);
249        if (block.timestamp > eta + GRACE) revert Expired(eta);
250
251        delete queued[hash];
252        _remove(hash);
253        _selfCall(action);
```

**Description.** `applyQueued` has no caller check and no ordering between entries. The nonce only makes hashes unique; nothing requires nonce k before k+1, and a newer entry does not supersede an older one. Every matured entry is therefore an option held by the public for 14 days. Three consequences:

- **Renounce-first.** `transferOwnership(address(0))` runs `_clearQueue()` (L296). If a table change and a renounce are both matured, applying the renounce first deletes the table change permanently.
- **Last writer wins.** With two queued `setBeneficiaries` (or `setDelay`, or `transferOwnership`) entries, whoever applies last decides the outcome; a superseded entry stays applicable until `eta + 14 days`.
- **No owner hold-back after eta.** Once matured, any `applyQueued` beats the owner's `cancel`.

**Proof of concept (renounce-first).**
1. At t0 the owner proposes nonce 1 = `setBeneficiaries([treasury 50%, ops 50%])` and nonce 2 = `transferOwnership(address(0))` — a natural "finalise, then renounce" pair. Both get eta = t0 + 7 days.
2. At t0 + 7 days the creator row (or anyone) calls `applyQueued(abi.encodeCall(transferOwnership, (address(0))), 2)`.
3. L294-296 run: `owner = 0`, `_clearQueue()` cancels nonce 1.
4. `propose` is unreachable forever (L221). The old table, creator at 40%, is frozen permanently.

**Proof of concept (stale entry).** Day 0: nonce 1 = `setBeneficiaries(T1)`. Day 5: the owner corrects with nonce 2 = `setBeneficiaries(T2)` and does not cancel nonce 1. Day 12: T2 is applied. Until day 21 anyone favoured by T1 can call `applyQueued(T1, 1)`; undoing it costs the owner another 7 days.

Both need the owner to leave conflicting entries queued — which nothing in the code prevents or signals.

**Recommendation.**

Option A — enforce order:

```solidity
uint32 public applied; // last applied or cancelled nonce
// applyQueued:
if (nonce_ != applied + 1) revert OutOfOrder();
applied = nonce_;
```

(`cancel` and expiry must advance `applied` too.)

Option B — add a batch action (`bytes[]` executed atomically) so "set table, then renounce" is one entry, and make `transferOwnership(address(0))` revert while `_pending.length != 0` instead of silently clearing.

Operationally, for the deployed clone: never have two entries pending that write the same field; cancel a superseded entry before proposing its replacement; propose a renounce only after everything else has been applied.

---

### L-01 — `setDelay` and `init` accept any `uint32`: delay 0 removes the timelock, a large value freezes configuration

**Severity:** Low · **Confidence:** 90 · **Origin:** `[phase1: access-control, governance, precision-math]` (invariant I-8)
**Location:** `Distribution.setDelay` — `Distribution.sol:282-284`; `init` — `Distribution.sol:140`; `propose` — `Distribution.sol:225-231`

```solidity
282    function setDelay(uint32 delay_) external onlySelf {
283        delay = delay_;
284    }
```

**Description.** No minimum, no maximum. `delay == 0` switches `propose` to same-transaction execution (L226-229): from then on the owner can swap the table and call `distribute` atomically, and the other rows get no notice. At the other end, `type(uint32).max` is ~136 years; a unit slip such as `604_800_000` (milliseconds for 7 days) fits in `uint32` and is 19.2 years. Every later proposal — including the `setDelay` that would undo it — then waits that long, so the table, the owner and the delay are frozen with a live-looking `owner` and no renounce event. The change itself waits the current 7 days and is cancellable in that window; after eta anyone can apply it (M-03).

**Recommendation.**

```solidity
uint32 public constant MIN_DELAY = 1 days;
uint32 public constant MAX_DELAY = 30 days;
function setDelay(uint32 delay_) external onlySelf {
    if (delay_ < MIN_DELAY || delay_ > MAX_DELAY) revert BadDelay();
    delay = delay_;
}
```

Apply the same check in `init`.

### L-02 — The ERC-20 push has no gas cap or return-data bound; a recipient hook can burn the distribution

**Severity:** Low · **Confidence:** 70 · **Origin:** `[both]` — phase 1 erc20 (rated Medium there) / assembly / dos / general; phase 2 agents 3 and 12 (leads) (invariant I-11)
**Location:** `Distribution._push` — `Distribution.sol:417-418`

```solidity
417        (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
418        ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
```

**Description.** The ETH push is capped at `PUSH_GAS` and copies no return data inside the loop (L410-413). The token push forwards 63/64 of all gas and copies all return data. The comment at L390-391 ("an ERC-20 push is bounded by the token") holds for plain tokens but not for a token that calls the recipient during `transfer` (ERC-777 `tokensReceived`, hook tokens). There a table row controls the gas: a hook that burns everything leaves 1/64 for that row's escrow writes (~46k) and all later rows. With one hostile row on the 3-row table `distribute(token)` still completes but needs roughly 7–10M gas; with two hostile rows, or a hostile row early in a long table, it cannot complete at any practical limit until the table is replaced through the timelock.

Severity is Low, not Medium, because it needs both a callback token and a beneficiary willing to grief, plain tokens (USDC, WETH, DAI) are unaffected, and no funds are lost.

**Recommendation.** Cap the token call in `distribute` and fail to escrow, as the ETH path does; leave `claim` uncapped:

```solidity
uint256 private constant TOKEN_PUSH_GAS = 300_000;
(ok, data) = token.call{gas: keepData ? gasleft() : TOKEN_PUSH_GAS}(abi.encodeWithSelector(TRANSFER, to, amount));
```

Or document that tokens with recipient callbacks are unsupported.

### L-03 — A token balance below `reserved` makes `distribute` panic and leaves the last escrow unpayable

**Severity:** Low · **Confidence:** 85 · **Origin:** `[both]` — phase 1 precision-math / erc20 / dos / general; phase 2 agents 3, 5, 6, 7, 9, 10, 12 (invariants I-4, E-1)
**Location:** `Distribution.distribute` — `Distribution.sol:155`

```solidity
155        uint256 amount = _balance(token) - reserved[token];
156        if (amount == 0) revert NothingToDo();
```

**Description.** `reserved[token]` is a nominal counter; `_balance(token)` is whatever the token reports. For ETH `balance ≥ reserved` always holds (ETH leaves only at L207, L408 and L412, each bounded by an escrow or by `amount`, all under the lock). For a token whose balance can fall without a transfer from the clone — negative rebase, issuer clawback, a fee charged on top of the sender's debit — the checked subtraction reverts with `Panic(0x11)`. `distribute(token)` is then dead for that token until someone tops the balance up; escrows are paid first-come in full and the last claimant's `release`/`claim` reverts; the next inflow silently refills the hole. A positive rebase on escrowed balances goes to the table, not to the escrowed account. An escrow must already exist for the token, and the effect is confined to that token.

**Proof of concept.** Token T, clone balance 100; rows 1 and 2 fail their push, so `reserved[T] = 60`, balance 60. T rebases −10% → balance 54. `distribute(T)` computes `54 − 60` and panics. Ops claims 40; treasury's `release` of 20 fails with 14 left.

**Recommendation (phase-2 fix, verbatim):**

```diff
-        uint256 amount = _balance(token) - reserved[token];
-        if (amount == 0) revert NothingToDo();
+        uint256 bal = _balance(token);
+        uint256 res = reserved[token];
+        if (bal <= res) revert NothingToDo();
+        uint256 amount = bal - res;
```

Optionally let `release`/`claim` pay `min(escrow, balance)` and keep the rest escrowed. State that rebasing and clawback tokens are unsupported.

### L-04 — An escrow has no exit for a row that cannot receive within 100k gas and cannot call `claim`

**Severity:** Low · **Confidence:** 80 · **Origin:** `[both]` — phase 1 dos (rated Medium there) / general / access-control; phase 2 agent 8 (lead)
**Location:** `Distribution._set` — `Distribution.sol:339`; `release` — `Distribution.sol:177-192`; `claim` — `Distribution.sol:199-215`

```solidity
339            if (b.bps == 0 || b.account <= prev) revert BadTable();
```

**Description.** `_set` checks only ordering, non-zero bps and the sum. A failed push is escrowed under the account; the only exits are `release` (the same capped push; reverts if it fails, L187-190) and `claim`, keyed on `escrowed[token][msg.sender]` (L200). A row that is a contract with no payable receive (or one that needs more than 100k gas) and no way to issue an arbitrary call accumulates escrow forever; neither the owner nor anyone else can redirect it. Replacing the table (7 days) stops further accrual but never frees the past amount; after a renounce the row's share of every future inflow is stranded. The same applies to a token-blocklisted contract that cannot call `claim`.

On the audited clone the rows are two vault clones and a code-less account, so this is latent. It depends on the vaults being able to send an arbitrary call (`claim`) — their source is out of scope and was not reviewed.

**Recommendation.** Before any `setBeneficiaries` or renounce, confirm each row can receive ETH within the cap or can call `claim` (a 0-value 100k-gas probe call from the dapp is enough). Consider a long-timelocked `onlySelf` `redirectEscrow(token, from, to)` usable only after an escrow has sat for months, if the trust model allows it.

### L-05 — The pending queue is unbounded and stores full action bytes; `_clearQueue` can make `acceptOwnership` or a renounce exceed the gas limit

**Severity:** Low · **Confidence:** 80 · **Origin:** `[both]` — phase 1 governance / general / access-control / dos; phase 2 agent 2 (lead)
**Location:** `Distribution.propose` — `Distribution.sol:232-234`; `_clearQueue` — `Distribution.sol:350-359`; `_remove` — `Distribution.sol:362-374`

```solidity
234            _pending.push(Pending({hash: hash, eta: eta, action: action}));
```

**Description.** `propose` appends with no cap on count or action length and writes the whole calldata to storage (~22,100 gas per 32-byte word). `_clearQueue` then deletes every entry in one call inside `acceptOwnership` (L310) and the renounce (L296). Queueing is the one owner power that takes effect immediately, and a nominee cannot cancel unexpired entries (L266), so an outgoing owner key can block an already-applied handover for as long as it keeps proposing. Two side effects of storing the bytes: `_remove`'s swap-and-pop copies the last entry's bytes (an earlier entry can become unappliable until a very large last entry is removed first), and a `setBeneficiaries` proposal for a full 107-row table costs on the order of 16–17M gas to queue, so `MAX_BENEFICIARIES` may not be reachable through the timelock under a per-transaction gas cap (Base's cap was not verified). `snapshot()` returns the whole queue and degrades with it. Recoverable while the owner cooperates; no funds at risk.

**Recommendation.** Store only `hash` and `eta` (the action is in the `Queued` event and is re-supplied to `applyQueued`), cap `_pending.length` (e.g. 16), or invalidate in O(1) with an epoch folded into the hash that increments on handover and renounce.

### L-06 — A table change applies to the whole undistributed balance, and transaction order at the eta decides who gets it

**Severity:** Low · **Confidence:** 85 · **Origin:** `[both]` — phase 1 governance / general; phase 2 agents 11 and 12 (leads)
**Location:** `Distribution.setBeneficiaries` / `_set` — `Distribution.sol:274-276`, `330-345`; `distribute` — `Distribution.sol:155-163`

**Description.** `distribute` splits `balance − reserved` by whatever table is current. `setBeneficiaries` does not settle balances first (it cannot, for arbitrary tokens), and both `applyQueued` and `distribute` are permissionless. At the eta, an incoming beneficiary can bundle `applyQueued(setBeneficiaries(new))` with `distribute(t)` and take a share of income earned under the old table; outgoing beneficiaries are protected only if someone calls `distribute` for every token just before the eta. Income in a token nobody has distributed is silently reassigned. Escrowed amounts are unaffected (keyed by account).

**Proof of concept.** 10 ETH accrues during the delay under 20/40/40. A queued table reduces creator to 10%. At the eta a favoured party applies and distributes in one bundle: creator receives 1 ETH on that balance instead of 4.

**Recommendation.** Document that outgoing beneficiaries must call `distribute` for every token before the eta (the 7-day `Queued` notice makes this practical). Alternatively let the action carry a token list that is distributed under the old table before the swap.

### L-07 — `_selfCall` forwards any calldata; the contract can become its own owner and freeze governance

**Severity:** Low · **Confidence:** 90 · **Origin:** `[phase1: governance, access-control, general]` (invariant I-14)
**Location:** `Distribution._selfCall` — `Distribution.sol:376-379`; `transferOwnership` — `Distribution.sol:299`

```solidity
377        (bool ok, bytes memory data) = address(this).call(action);
```

**Description.** L219 documents the action as "Calldata for one of this contract's `onlySelf` functions", but nothing filters the selector, so any external function can run with `msg.sender == address(this)` and the lock free. Every such target was traced: `init` reverts; `propose`/`cancel` need `owner == clone`; `distribute`/`release` are permissionless anyway; a nested `applyQueued` re-checks its own window; an empty action lands in `receive`; `claim` moves only `escrowed[token][clone]`, which exists only if the owner put the clone in its own table. No path gives the owner power beyond the four setters, and no path bypasses the delay. The one harmful sequence: `transferOwnership` does not reject `address(this)`, so `propose(transferOwnership(clone))` followed by `propose(acceptOwnership())` sets `owner = clone` and clears the queue. `propose` then needs a self-call, which needs a queued entry, and there are none — an irreversible freeze logged as `OwnershipTransferred(old, clone)` with a non-zero owner. Owner-authored, two proposals, hence Low.

**Recommendation.**

```solidity
bytes4 s = bytes4(action); // require action.length >= 4
if (s != this.setBeneficiaries.selector && s != this.setDescription.selector
 && s != this.setDelay.selector && s != this.transferOwnership.selector) revert Unauthorized();
// transferOwnership:
if (owner_ == address(this)) revert Unauthorized();
```

### L-08 — Assets that reach the implementation are permanently stuck, and its `distribute` emits `Distributed` while paying nobody

**Severity:** Low · **Confidence:** 95 · **Origin:** `[phase1: proxies, general, dos, erc20, precision-math, access-control]`
**Location:** `Distribution.distribute` — `Distribution.sol:155-173`; `init` — `Distribution.sol:138`

```solidity
158        uint256 n = _table.length;
...
173        emit Distributed(token, amount);
```

**Description.** The implementation `0xc4eD…cB0A` has `owner == 0` and an empty table (confirmed on-chain: `beneficiaries()` returns `[]`) and can never be initialised: `init` requires `msg.sender == factory`, and the factory only calls `init` on a fresh clone. That is good for takeover resistance, and `receive` rejects plain ETH (L148), but nothing stops ERC-20 transfers or forced ETH. For such a balance `distribute(token)` passes the `amount == 0` check, runs a zero-iteration loop and emits `Distributed(token, amount)` — repeatably, with nothing moved and no function able to move it. The implementation address is visible in the clone's bytecode and on explorers ("proxy → implementation"), so mis-sends are plausible. No clone is affected.

**Recommendation.** `if (n == 0) revert Unauthorized();` after L158 (or reuse the `address(this) == self` guard) in future builds. For the deployed implementation: label the address "do not send" on explorers and in documentation.

### L-09 — The outcome of a token push is inferred from the return word alone

**Severity:** Low · **Confidence:** 60 · **Origin:** `[both]` — phase 1 erc20 / assembly; phase 2 agent 8 (lead)
**Location:** `Distribution._push` — `Distribution.sol:417-418`; `release` — `Distribution.sol:181-190`; `claim` — `Distribution.sol:203-213`

**Description.** L418 treats empty return data as success and anything but a word equal to 1 as failure; no balance is re-read and no code check is made. (a) A token that moves funds but returns `false` or a non-canonical true has every row both paid and escrowed; `reserved` then exceeds the balance (L-03) and the phantom escrow can never be released. (b) A token that returns success as a silent no-op is counted as paid; the share stays in the balance and is re-split over the whole table. (c) A call to an address without code returns success with empty data: `distribute` is protected only indirectly (`_balance` fails to decode, L387), but `release` and `claim` never call `_balance`, so they would zero the escrow and emit `Released`/`Claimed` with nothing sent. After Cancun (EIP-6780) code can disappear only in the transaction that created it, so (c) is reachable only with a throwaway token. No widely used Base token behaves like (a) or (b); this is a robustness gap.

**Recommendation.** `if (token.code.length == 0) return (false, data);` before L417, and/or measure the balance delta across the loop in `distribute`. State the supported token model in user-facing docs.

### L-10 — Per-call flooring sends dust to the last row; zero shares are still pushed

**Severity:** Low · **Confidence:** 90 · **Origin:** `[both]` — phase 1 precision-math / erc20 / general; phase 2 agent 10 (lead), agents 1, 3, 11 (examined)
**Location:** `Distribution.distribute` — `Distribution.sol:163-171`

```solidity
163            uint256 share = i + 1 == n ? amount - paid : (uint256(b.bps) * amount) / BPS_TOTAL;
```

**Description.** Shares always sum to `amount` (verified; `amount − paid` cannot underflow), so nothing is stranded. But every non-last row is floored and the last, highest-address row takes the remainder — on the live table the creator row. Per call the creator gains 0, 0.6, 1.2, 0.8 or 1.4 base units for `amount % 5` = 0…4; treasury and ops each lose at most 0.8. There is no minimum amount and `distribute` is permissionless, so the error accrues per call, not per unit of value:

| amount | treasury (20%) | ops (40%) | creator (40%, last) |
|---|---|---|---|
| 1 | 0 | 0 | 1 |
| 3 | 0 | 1 | 2 |
| 4 | 0 | 1 | 3 |
| 5 | 1 | 2 | 2 (exact) |

For ETH and 6-/18-decimal tokens this is far below the gas cost of the call and cannot be farmed (donating to steer the residue costs as much as it gains). It is material only for 0–2-decimal tokens. Separately, a zero share is still pushed (L166): on ETH a 1-wei `distribute` makes a zero-value call into each contract row; on a token that reverts on zero-amount transfers it emits `Escrowed(token, account, 0)` with no bookkeeping change, which an indexer shows as an escrow that `release`/`claim` reject.

**Recommendation.** `if (share == 0) continue;` after `paid += share`. Optionally require `amount >= BPS_TOTAL`, or track cumulative entitlement per row for exact long-run fairness.

### L-11 — The clone address commits to the factory and the salt only, not to the owner or table

**Severity:** Low · **Confidence:** 85 · **Origin:** `[phase1: proxies (rated Medium there), access-control]`
**Location:** `DistributionFactory.create` — `Distribution.sol:466-483`

```solidity
468        if (prefix != uint256(uint160(msg.sender))) revert SaltDoesNotStartWith();
```

**Description.** `owner_`, `delay_` and `table_` are not part of the CREATE2 input. The Base clone is already deployed, so Base is unaffected. On every other chain where `predict(salt)` has no code, the holder of the salt-prefix key alone can deploy at `0xB611…5199` with any owner and any table — "same address on every chain" does not mean "same owner or table". ETH or tokens sent to that address on another chain belong to whoever wins the `create` there; if the deploying key was discarded (as L450 invites), they are unrecoverable. If `create` is ever routed through a shared contract (Multicall3, a relayer), that contract is the salt prefix and anyone can deploy first.

**Recommendation.** For future clones, fold the configuration into the salt (`keccak256(abi.encode(msg.sender, owner_, delay_, keccak256(abi.encode(table_)), salt))`). For this deployment: keep the deployer key secured, deploy the clone on every chain where a mis-send is plausible before publishing the address, and never call `create` through a shared intermediary.

### L-12 — Actions are not validated at `propose`; a malformed one is discovered only at the eta

**Severity:** Low · **Confidence:** 90 · **Origin:** `[phase1: governance]`
**Location:** `Distribution.propose` — `Distribution.sol:230-236`; `_set` — `Distribution.sol:332-344`

**Description.** On the delayed path `propose` stores the bytes unchecked. A `setBeneficiaries` whose rows are not strictly ascending, contain a zero bps or do not sum to 10,000 — or any action with a wrong selector — reverts only when someone calls `applyQueued` at least 7 days later, and the entry then "stays queued for a retry" that can never succeed. The fix costs a second full delay. There is also no pause or fast path: rotating out a compromised beneficiary key takes at least 7 days, or 14 after one encoding mistake, while that row keeps collecting.

**Recommendation.** Validate at propose time (decode the selector and dry-run the `_set` checks), and simulate every proposal off-chain with `eth_call` from the clone to itself before submitting it.

### L-13 — Anyone can write escrow entries and events that name real beneficiaries, using a fake token

**Severity:** Low · **Confidence:** 90 · **Origin:** `[phase1: dos, erc20]`; phase 2 agents 7 and 11 (examined)
**Location:** `Distribution.distribute` — `Distribution.sol:154-173`

**Description.** `token` is caller-supplied and unrestricted. A fake token whose `balanceOf` returns any X and whose `transfer` returns `false` makes every row fail; L168-170 then writes `escrowed[fake][row]` and `reserved[fake]` and emits `Escrowed(fake, row, share)` and `Distributed(fake, X)` from the genuine clone, for about 150k gas per token on Base. Real funds are untouched (accounting is per token and the lock blocks re-entry). The risk is off-chain: a dapp or indexer that lists escrows from logs shows fabricated claimable balances, and a beneficiary lured into `claim(fake, …)` or `release` runs attacker code with the clone as caller.

**Recommendation.** Off-chain consumers must allow-list tokens and not trust `Escrowed`/`Distributed` for unknown ones. On-chain, an owner-set token allow-list is the only complete fix.

---

### Informational

**I-01 — Deployments on other chains need Cancun and standard CREATE2.** **Severity:** Informational · **Confidence:** 80 · `[phase1: proxies, general]` · `Distribution.sol:99`, `109-121`, `428-431`. On a chain with PUSH0 but without EIP-1153, `create`, `init` and `receive` succeed (none touches `locked`) but `distribute`, `release`, `claim`, `propose` and `applyQueued` begin with a `TLOAD` and revert: the clone accepts ETH it can never pay out. Base supports both; the audited deployment is unaffected. Run a `distribute` round-trip on any new chain before publishing the address. The pragma (`^0.8.28`, L2) floats; the deployed build is pinned by its metadata to 0.8.38.

**I-02 — The 107-row cap is justified against "half a 30M block", which is not Base's binding limit.** **Severity:** Informational · **Confidence:** 70 · `[phase1: dos]` · `Distribution.sol:67-72`. The stated worst case (107 × 138,917 + 32,206 = 14,896,325 gas) is internally consistent but was measured on another tree, covers the ETH path only (L-02), and omits the extra cold access of an EIP-7702 delegate. No present impact: the live table has 3 rows (~0.45M worst case). Re-measure against Base's actual per-transaction limit before growing the table.

**I-03 — NatSpec contradicts the code in several places.** **Severity:** Informational · **Confidence:** 95 · `[both]` — phase 1 proxies / general; phase 2 agent 8. (a) `Distribution.sol:442-443` says a deposit riding `create` "lands in the clone without a `Received` log"; `init` emits `Received(address(0), address(this).balance)` at L143. (b) L217-218 and L241 say `propose`/`applyQueued` are refused "while `distribute` or `release` is running"; the lock is also held by `claim` (L199). (c) L313 says `snapshot()` returns "Everything a reader needs in one call"; it omits `pendingOwner` (see M-02). (d) L488 says the dapp "predicts before it knows who will send", but the salt already fixes the sender (L468). (e) L146 — see M-01.

**I-04 — `release`/`claim` re-throw recipient- or token-controlled data as their own revert.** **Severity:** Informational · **Confidence:** 85 · `[phase1: assembly, erc20, dos]` · `Distribution.sol:187-190`, `210-213`, `421-425`. Anything longer than 32 bytes is bubbled raw, so a recipient can make the clone revert with a forged `Expired(123)`, `NotReady(…)` or `Error("…")`; a non-reverting token that returns more than 32 bytes with a first word ≠ 1 has its return data re-thrown as if it were a revert reason. State always rolls back; only tooling that decodes errors is affected. The copy in `release` is bounded by what a callee can build in ~102k gas (~120k extra gas for the caller); in `claim`, `_balance` and the token push it is paid by whoever chose the target. Consider `revert ReleaseFailedWith(token, data)`.

**I-05 — `cancel` and `acceptOwnership` can run while a payout holds the lock.** **Severity:** Informational · **Confidence:** 90 · `[both]` — phase 2 agents 6 and 8 (leads); phase 1 access-control / governance / erc20 (examined). `Distribution.sol:260`, `304`. Neither carries a lock modifier, so an owner or pending owner that is also a payee (the owner is the ops row here) can cancel entries, or accept ownership and clear the queue, from inside its push callback. Neither touches `_table`, `reserved` or `escrowed`, and `propose`/`applyQueued` stay blocked, so no fund or share effect was found. Adding `notLocked` to both would make the property explicit.

**I-06 — Factory assembly is annotated `memory-safe` while it temporarily overwrites the free-memory-pointer word.** **Severity:** Informational · **Confidence:** 90 · `[phase1: assembly]` · `Distribution.sol:472-482`, `492-498`. `mstore(0x24, …)` writes into 0x40–0x43 and `mstore(0x24, 0)` restores it; no allocation happens in between, and the init code is byte-identical to solady's `initCode_PUSH0` and to the deployed runtime. Sound today; a maintenance hazard only if code is inserted inside the block.

**I-07 — Trust model as deployed.** **Severity:** Informational · **Confidence:** 90 · `[phase1: governance]`. The sole proposer is a 2-of-4 vault that is also the 40% ops beneficiary, and one of its four signers is the 40% creator account. The treasury row gets 7 days' notice of any table change and no veto; its only defence is to call `distribute` on what has accrued. There is no pause and no rescue path — by design the owner cannot touch escrow — and renounce is one-way. The vault's own code (`0xD54cb652…4FB0`) is out of scope and was not reviewed.

---

## 4. Leads (plausible, not confirmed on this deployment — confidence below 50)

- **A second address for one asset bypasses `reserved`** — `Distribution.distribute`, `Distribution.sol:155` · `[both]` — phase 1 erc20; phase 2 agents 1, 4, 5, 7 · would be **Medium** where reachable. `reserved`/`escrowed` are keyed by token address, so for a token with two entry points over one ledger, or an ERC-20 that mirrors the native balance (Celo's CELO token), `distribute(B)` treats escrow recorded under key A as fresh revenue and pays it to the table. No such token was identified on Base. Relevant if the same address is ever used on a chain with a native-mirror token.
- **`LegacyERC20ETH` alias — rejected for Base.** Phase 1 (erc20) suspected the OP-stack predeploy `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` reports the native balance. Checked on-chain: `eth_getCode` at that address on Base returns `0x`, so `distribute` on it reverts in `_balance`. Not applicable.

## 5. Examined, no issue

- **Caller-chosen gas cannot force a healthy recipient into escrow.** `call(gasCap, …)` at L412 forwards less than 100,000 only when under ~101,588 gas remains, which leaves the frame at most ~1,587 gas after a callee that runs out — below the ~9,500–46,000 the escrow branch needs (two SSTOREs, a LOG3, the final LOG2). The transaction reverts whole and nothing is escrowed. The ERC-20 equivalent needs a `transfer` costing ~0.6–2.9M gas. Reached independently by phase 1 (assembly, dos, general, proxies, erc20) and by 9 of 12 phase-2 agents. The safety is incidental; a `gasleft()` floor before the push would make it explicit.
- **Reentrancy.** One transient lock on `distribute`/`release`/`claim`; `propose`/`applyQueued` refuse under it; escrow zeroed before the call (L181-183, L203-208); `amount` and `n` fixed before the loop; the lock rolls back on revert and cannot stick.
- **Escrow accounting.** `reserved[t] == Σ escrowed[t][·]`: writes are paired at L168-169, L181-182, L203-204 and nowhere else. `release` pays only `account`; `claim` reads only `msg.sender`'s escrow.
- **Setters.** `setBeneficiaries`, `setDescription`, `setDelay`, `transferOwnership` are `onlySelf` (L125). A push or claim to the clone itself carries empty calldata and lands in `receive`; the proxy preserves `msg.sender`; no non-owner path produces a self-call.
- **`init` / factory.** Factory-only and one-shot (`_table.length != 0`, with `_set` requiring `n ≥ 1`); atomic inside `create`, so no front-run window; salt prefix binds the deployer; `predict` hashes the same 54 bytes `create` deploys.
- **Timelock edges.** Apply is allowed for `eta ≤ t ≤ eta + GRACE`; public cancel only for `t > eta + GRACE` — no overlap, no gap. The entry is deleted before the self-call; a failing action rolls the deletion back. `abi.encode(action, nonce)` with a checked, never-reset nonce gives unique hashes. `_remove`'s swap-and-pop keeps the three queue structures in sync.
- **Arithmetic.** `bps * amount` overflows only above ~1.16e73 (a hostile token's own business); `uint96 bps`, `uint32 delay`/`nonce` and `eta + GRACE` cannot wrap or truncate; no `unchecked` blocks.
- **Return-data bombs.** None in the `distribute` ETH loop (zero-length output area).
- **`setDescription`, views.** Owner-only string write; views only read.

## 6. Access-Control Inventory

| Function | Guard | Who can call | State written | Moves value |
|---|---|---|---|---|
| `Distribution.init` (L134) | L138 `msg.sender != factory \|\| _table.length != 0` | Factory, once per clone, inside `create` | `owner`, `delay`, `description`, `_table` | no (logs balance) |
| `Distribution.receive` (L147) | L148 reverts on the implementation | Anyone, on a clone | none | ETH in |
| `Distribution.distribute` (L154) | `nonReentrant`; L156 amount ≠ 0 | Anyone | `escrowed`, `reserved` on failed push | out to table rows |
| `Distribution.release` (L177) | `nonReentrant`; L179 escrow ≠ 0 | Anyone, for any account | escrow zeroed, `reserved` −= | out to `account` (ETH capped 100k) |
| `Distribution.claim` (L199) | `nonReentrant`; keyed on `msg.sender` (L200) | The escrowed account | own escrow zeroed, `reserved` −= | out to caller-named `to` (uncapped) |
| `Distribution.propose` (L220) | `notLocked`; L221 owner | Owner | `nonce`, queue (or the action's writes when delay = 0) | no |
| `Distribution.applyQueued` (L242) | `notLocked`; L247/L249 window; no caller check | Anyone, `eta ≤ now ≤ eta + 14d` | queue entry removed + the action's writes | no |
| `Distribution.cancel` (L260) | L266 owner, or anyone after `eta + GRACE` | Owner / anyone (expired) | queue entry removed | no |
| `Distribution.setBeneficiaries` (L274) | `onlySelf` | Timelock self-call | `_table` | no |
| `Distribution.setDescription` (L278) | `onlySelf` | Timelock self-call | `description` | no |
| `Distribution.setDelay` (L282) | `onlySelf` | Timelock self-call | `delay` (any uint32) | no |
| `Distribution.transferOwnership` (L291) | `onlySelf` | Timelock self-call | `pendingOwner`; or `owner = 0` + queue cleared | no |
| `Distribution.acceptOwnership` (L304) | L305 `pendingOwner` | Nominee | `owner`, `pendingOwner`, queue cleared | no |
| `DistributionFactory.create` (L459) | L468 salt prefix = sender | The salt's sender | new clone + its storage | `msg.value` → clone |

Views (no guard, no state): `snapshot`, `beneficiaries`, `pendingCount`, auto-getters, factory `implementation`, `predict`. `Distribution` has no `fallback`.

**Roles.** `owner` — set at `init`, changed only by `acceptOwnership` or the timelocked renounce; unlocks `propose` and instant `cancel`. `pendingOwner` — set only through the timelock, no expiry, accepts instantly. Self/timelock — the only caller of the four setters; delay read at propose time, 14-day apply window. `factory` — immutable, one-shot `init`. Claimant — any account with escrow, for its own escrow only.

**Unguarded (reachable by an arbitrary caller):** `receive` (clones), `distribute`, `release`, `claim` (own escrow), `applyQueued` (in window), `cancel` (expired entries), `create` (own salt).

## 7. Threat Model

| # | Actor → reach | Invariant that must hold | Result |
|---|---|---|---|
| T1 | Anyone → `distribute(token)` | Shares go only to table rows and sum to `amount`; `reserved == Σ escrowed` | Invariant holds — L163-164 remainder rule, paired writes |
| T2 | Hostile beneficiary → push callback | A failing row only escrows itself, at bounded cost | Holds on ETH (100k cap); addressed by **L-02** for hook tokens |
| T3 | Hostile token → `balanceOf`/`transfer` answers | Per-token isolation | Invariant holds — keys are per token; see Lead (two-address token) and **L-13** |
| T4 | Caller → gas limit | A push fails only because of the recipient | Invariant holds — gas arithmetic, §5 |
| T5 | Anyone → `release` | Escrow leaves only to its account, all-or-nothing | Invariant holds — L183, L187-190 |
| T6 | Escrowed account → `claim` | No double-claim, `reserved` decremented once | Invariant holds — zero-before-call + lock |
| T7 | Anyone → `applyQueued` timing and order | Outcome is what the owner intended | Addressed by **M-03**, **L-06** |
| T8 | Anyone → `cancel` expired | Public cancel strictly after `eta + GRACE` | Invariant holds — L249 vs L266 |
| T9 | Owner → arbitrary self-calldata | No power beyond the setters, no delay bypass | Holds for power and delay; addressed by **L-07** (self-ownership freeze) |
| T10 | Owner → `setDelay` extremes | Delay stays meaningful | Addressed by **L-01** |
| T11 | Pending owner → `acceptOwnership` | Only a current, intended nominee accepts | Addressed by **M-02**, **L-05** |
| T12 | Owner-as-beneficiary → callback | No config write under the lock | Invariant holds — **I-05** |
| T13 | Salt holder / front-runner → `create` | Only the salt's sender deploys; `init` once | Holds on Base; addressed by **L-11** for other chains |
| T14 | Anyone → implementation directly | Implementation isolated from clones | Holds for clones; addressed by **L-08** |
| T15 | 2,300-gas payer → `receive` | `receive` fits the documented stipend | Addressed by **M-01** |
| T16 | Non-standard token | `balance ≥ reserved`; every escrow has an exit | Addressed by **L-03**, **L-09** |
| T17 | Anyone → dust distributions | Rounding drift negligible | Addressed by **L-10** |
| T18 | Row that cannot receive or claim | Every row has a working exit | Addressed by **L-04** |

## 8. Invariant Verification

Inferred invariants from the mechanical pre-scan (phase 0a), each answered by the hunting phases or a targeted re-read.

| ID | Property | On-chain | Verdict |
|---|---|---|---|
| I-1 | `reserved[t] == Σ escrowed[t][·]` | Yes | holds — paired writes at L168-169, L181-182, L203-204 |
| I-2 | Shares of one `distribute` sum exactly to `amount` | Yes | holds — last-row remainder, L163-164 |
| I-3 | Table: 1..107 rows, ascending non-zero accounts, bps > 0, Σ bps = 10,000 | Yes | holds — `_set` is the only writer |
| I-4 | `_balance(token) >= reserved[token]` | No | holds for ETH; violated for rebasing/clawback tokens → **L-03** |
| I-5 | `init` runs at most once per clone | Yes | holds — L138 with `_set` requiring n ≥ 1 |
| I-6 | `queued`, `_pendingIndex`, `_pending` stay in sync | Yes | holds — incl. nested apply and `_clearQueue` inside a self-call |
| I-7 | An action applies only in `[eta, eta + GRACE]` | Yes | holds — L247, L249 |
| I-8 | `delay` is a meaningful, sane duration | No | violated → **L-01** (holds today: 604,800 s) |
| I-9 | `receive()` completes within 2,300 gas | No | violated → **M-01** (measured 4,159 cold) |
| I-10 | An ETH `distribute` row has bounded gas cost | Yes | holds — 100k cap, zero-length output |
| I-11 | An ERC-20 `distribute` row has bounded gas cost | No | violated → **L-02** |
| I-12 | `owner` changes only by nominee acceptance or timelocked renounce | Yes | holds (the nomination itself is the subject of **M-02**) |
| I-13 | Every configuration mutator is reachable only via a self-call | Yes | holds — `onlySelf` on L274, L278, L282, L291 |
| I-14 | A queued action is calldata for an `onlySelf` function | No | violated → **L-07** |
| I-15 | `claim` moves only `msg.sender`'s escrow | Yes | holds — L200, L203 |
| I-16 | Every owner change empties the queue | Yes | holds — L296, L310 (and is what makes **M-02**/**M-03** bite) |
| X-1 | A clone's `factory` is the `DistributionFactory`; `init` only inside `create` | Yes | holds by source (L105, L439, L483); the factory address was not independently located on-chain |
| X-2 | `predict(salt)` equals the `create` address | Yes | holds — identical init code, L473-476 vs L493-496 |
| E-1 | Every unit held is reserved for a named escrow or distributable in full | No | violated for non-standard tokens and unreachable rows → **L-03**, **L-04** |
| E-2 | No configuration change lands sooner than the announced delay | No | holds today; violated once `delay == 0` is set → **L-01** |

20 answered: 13 hold, 7 violated (each mapped to a finding), 0 could not verify.

---

## 9. Method and limits

**Pipeline (LeftClaw deep-audit v3, all phases run fresh for this job):** phase 0a x-ray pre-scan (entry-point grep, 19 guards, 20 inferred invariants) → phase 0 context (3 agents: access-control inventory, protocol map, external surface; 14/14 entry points reconciled) → phase 1 breadth (8 checklist agents, Fable 5.2: general, precision-math, erc20, proxies, governance, assembly, dos, access-control; 51 raw findings → 26 unique) → phase 2 depth (12 attack agents, Opus 5.5, blind to phase 1, waves of 3; **12 of 12 returned**; 3 findings + 13 leads after dedup and gate) → reconciliation with coverage gate. The chain-specific checklist was not spawned as its own agent (routing cap of 8); its Base/OP-stack items were assigned to the assembly, proxies and erc20 agents.

**Severity changes at reconciliation.** Four phase-1 Mediums were lowered to Low after the re-read, each for a stated reason: unbounded `setDelay` (owner-only, announced 7 days ahead, cancellable — L-01), uncapped ERC-20 push (needs a callback token and a griefing beneficiary — L-02), unreachable escrow (no such row on the live table — L-04), salt/config binding (no effect on Base — L-11). One phase-1 Low was rejected by an on-chain check (`LegacyERC20ETH`).

**What was and was not executed.** The target's code was not compiled or run (audit policy). On-chain reads and two `eth_call` gas simulations against the live clone were performed with `cast` on Base (M-01, live state, `LegacyERC20ETH`, the implementation's empty table). All other findings are reasoned from the verified source; gas figures other than M-01's are derived from the EVM schedule, not measured.

**Out of scope / not verified.** The multisig vault implementation `0xD54cb652…4FB0` (owner and two of the three rows) — in particular whether it can send an arbitrary call such as `claim`. The project's tests, `docs/REFERENCE.md`, `RUNBOOK.md` and the design decisions the comments cite are not part of the verified source. The factory's address and Base's per-transaction gas cap were not established.

> This review was performed by an AI pipeline. It cannot prove the absence of vulnerabilities and is not a guarantee of security. Independent human review, a bug bounty and on-chain monitoring are recommended.
