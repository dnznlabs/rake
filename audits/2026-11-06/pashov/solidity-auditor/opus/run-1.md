# Run 1 — solidity-auditor

<!--RUN pass=1 of=1 stamp=20261106-195825 sha=d07483a agents=9/12-->

Pass 1 of 1 · 2026-11-06 · `d07483a` · 9/12 agents returned — the math-precision agent (1) and the invariant agent (5) died on an API safeguard error, and the economic-security agent (3) read its bundle but a safety classifier stopped its output, so it returned no findings.

## Findings

<!--F key=distribution|receive|stipend-receive-oog conf=85 kind=FINDING agents=2-->

[85] **A clone cannot receive ETH from a payer that uses `transfer` or `send`**

`Distribution.receive` · Confidence: 85

**File:** `src/Distribution.sol:146-150` (the promise is at line 146; the clone runtime is written at `src/Distribution.sol:471-474`) · **Severity:** Medium

**Description**
The clone spends 2,600 gas on a cold DELEGATECALL before `receive` runs, so every `transfer` or `send` payment to a clone fails. Two agents reproduced it in scratch Foundry tests: `[2300] clone::receive{value: 1 ether}() ← [OutOfGas]`, and the clone needs about 4,170 gas even when the implementation is warm. A `transfer` payer reverts. A `send` payer that ignores the result keeps the ETH, and no beneficiary is paid.

**Fix**

```diff
-    /// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
+    /// @dev Does NOT fit a 2,300-gas `transfer`/`send` stipend: the clone's DELEGATECALL alone costs
+    /// 2,600 gas cold. Payers must use `call`, or the clone runtime must log and STOP on empty calldata
+    /// before it delegates (see DistributionFactory.create).
```

<!--/F-->

<!--F key=distributionfactory|create|stipend-receive-oog conf=85 kind=FINDING agents=1-->

[85] **The clone code from `create` delegates plain ETH transfers past the stipend**

`DistributionFactory.create` · Confidence: 85

**File:** `src/Distribution.sol:471-474` (also `predict`, `src/Distribution.sol:490-494`) · **Severity:** Medium

**Description**
`create` deploys a PUSH0 proxy that runs DELEGATECALL for empty calldata, so the 2,300-gas stipend from `transfer` or `send` runs out before `Received` is logged. This is the same root cause as the `Distribution.receive` finding. A scratch PoC passes once a warm-up call touches `implementation` first, so the DELEGATECALL is the cause.

**Fix**

```diff
-            mstore(0x24, 0x5af43d5f5f3e6029573d5ffd5b3d5ff3)
-            mstore(0x14, impl)
-            mstore(0x00, 0x602d5f8160095f39f35f5f365f5f37365f73)
-            distribution := create2(callvalue(), 0x0e, 0x36, salt)
+            // Init code for a runtime that, when CALLDATASIZE == 0, emits Received(CALLER, CALLVALUE)
+            // with LOG2 and STOPs before any DELEGATECALL, and otherwise runs the PUSH0 proxy body
+            // unchanged. `predict` must hash the same bytes. This changes every clone address.
+            distribution := create2(callvalue(), initCodeOffset, initCodeLength, salt)
```

<!--/F-->

<!--F key=distribution|distribute|double-entry-token-reserve conf=80 kind=FINDING agents=4-->

[80] **`distribute` pays out escrow through a second address of the same token**

`Distribution.distribute` · Confidence: 80

**File:** `src/Distribution.sol:155` · **Severity:** Medium

**Description**
Any caller can call `distribute` with the other address of a two-address token, such as CELO's ERC-20, and the table takes the shares escrowed under the first address. Trace on Celo, table A 50% and B 50%, 100 CELO held: `distribute(address(0))` escrows 50 for A, so `reserved[0]` is 50. Then `distribute(CELO)` reads `reserved[CELO] == 0` and splits that 50 again. A's `claim` reverts `ReleaseFailed`, and `distribute(address(0))` underflows until new deposits arrive to cover A's escrow.

**Fix**

```diff
+    /// @dev The ERC-20 form of the native coin on this chain (CELO's GoldToken), or address(0).
+    address private immutable nativeAlias;
@@ function distribute(address token) external nonReentrant {
-        uint256 amount = _balance(token) - reserved[token];
+        uint256 held = reserved[token];
+        if (nativeAlias != address(0) && (token == address(0) || token == nativeAlias)) {
+            held = reserved[address(0)] + reserved[nativeAlias];
+        }
+        uint256 amount = _balance(token) - held;
```

<!--/F-->

<!--F key=distribution|distribute|uncapped-token-push-gas conf=75 kind=FINDING agents=3-->

[75] **A beneficiary with a token hook makes `distribute` fail for every caller**

`Distribution.distribute` · Confidence: 75

**File:** `src/Distribution.sol:166`, push at `src/Distribution.sol:417` · **Severity:** Medium

**Description**
A beneficiary with an ERC-777 `tokensReceived` hook uses up the gas that the ERC-20 push forwards, so `distribute(token)` fails for every caller until the owner changes the table through the timelock. There are two mechanisms. (1) The hook burns all its gas, so the loop keeps only 1/64 of the gas. A scratch PoC with 17 rows reverts at 16M gas, and the same table without the hook needs 527,095 gas. (2) The hook reverts with large return data, and `(ok, data) = token.call(...)` copies all of it into memory with the 1/64 of the gas that is left.

**Fix**

```diff
-        (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
-        ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
+        bytes memory cd = abi.encodeWithSelector(TRANSFER, to, amount);
+        uint256 gasCap = TOKEN_PUSH_GAS;
+        assembly ("memory-safe") {
+            mstore(0x00, 0)
+            ok := call(gasCap, token, 0, add(cd, 0x20), mload(cd), 0x00, 0x20)
+            ok := and(ok, or(iszero(returndatasize()), and(gt(returndatasize(), 0x1f), eq(mload(0x00), 1))))
+        }
```

<!--/F-->

<!--F key=distribution|_push|uncapped-token-push-gas conf=75 kind=FINDING agents=3-->

[75] **The ERC-20 branch of `_push` forwards all gas to the token**

`Distribution._push` · Confidence: 75

**File:** `src/Distribution.sol:417` · **Severity:** Medium

**Description**
The ETH branch caps the push at `PUSH_GAS`, but the ERC-20 branch has no cap. A hook token therefore gives the recipient all forwarded gas, and one hostile row can stop `distribute` for that token. The NatSpec at lines 390-401 says "one hostile recipient cannot burn the whole distribution", and the code enforces that only for ETH.

**Fix**

```diff
+    uint256 private constant TOKEN_PUSH_GAS = 100_000;
@@ function _push(address token, address to, uint256 amount, bool keepData)
-        (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
+        // distribute passes keepData == false: cap it so a failed row escrows; release/claim keep full gas.
+        if (keepData) (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
+        else (ok, data) = token.call{gas: TOKEN_PUSH_GAS}(abi.encodeWithSelector(TRANSFER, to, amount));
```

<!--/F-->

<!--F key=distributionfactory|create|unbound-clone-config conf=75 kind=FINDING agents=3-->

[75] **The clone address does not commit to its owner or table**

`DistributionFactory.create` · Confidence: 75

**File:** `src/Distribution.sol:465-474`, `predict` at `src/Distribution.sol:487-498` · **Severity:** Medium

**Description**
The salt holder can deploy the clone on a chain where it is not yet deployed, with the holder's own owner and table, and take the ETH that payers already sent to that address. The address hashes only `0xff‖factory‖salt‖initCodeHash`. `init` accepts funds that arrived before deployment, and the factory is at the same address on every chain through Arachnid CREATE2. The NatSpec at lines 448-453 says "the deploying key never needs to own anything", but the key keeps this power, and anyone who later gets a leaked key gets it too. The gate demoted this finding because only the salt holder can trigger it, and three agents agreeing promoted it back.

**Fix**

```diff
         if (prefix != uint256(uint160(msg.sender))) revert SaltDoesNotStartWith();
+        bytes32 committed = keccak256(abi.encode(salt, owner_, delay_, description_, table_));
@@
-            distribution := create2(callvalue(), 0x0e, 0x36, salt)
+            distribution := create2(callvalue(), 0x0e, 0x36, committed)
@@ predict must take owner_, delay_, description_ and table_ and hash `committed` the same way
```

<!--/F-->

<!--F key=distribution|distribute|reserved-exceeds-balance-underflow conf=75 kind=FINDING agents=5-->

[75] **A balance below `reserved` makes `distribute` revert for every caller**

`Distribution.distribute` · Confidence: 75

**File:** `src/Distribution.sol:155` · **Severity:** Low

**Description**
A negative rebase or an issuer seizure moves the token balance below `reserved[token]`, so `_balance(token) - reserved[token]` panics and the claims that come first take all of the shortfall's cover. Example: `reserved[stETH]` is 1000, a slashing event drops the balance to 990, every `distribute(stETH)` panics 0x11, and the last escrowed account to claim fails. Five agents raised this as a lead, so it is promoted. The fix below only replaces the panic with a clear revert. It does not share the loss between the escrowed accounts.

**Fix**

```diff
-        uint256 amount = _balance(token) - reserved[token];
-        if (amount == 0) revert NothingToDo();
+        uint256 balance = _balance(token);
+        uint256 held = reserved[token];
+        if (balance <= held) revert NothingToDo();
+        uint256 amount = balance - held;
```

<!--/F-->

<!--F key=distribution|applyqueued|permissionless-execution-order conf=75 kind=FINDING agents=2-->

[75] **Any caller chooses when and in what order matured actions apply**

`Distribution.applyQueued` · Confidence: 75

**File:** `src/Distribution.sol:242` · **Severity:** Low

**Description**
`applyQueued` has no caller check, so a new-table payee can apply a matured `setBeneficiaries` and call `distribute` in one transaction. The new table then takes the balance that came in under the old table. If two conflicting table changes are queued, the caller also picks which one applies last. Compound's Timelock lets only the admin execute. Two agents raised this as a lead, so it is promoted. Old payees can call `distribute` themselves before the eta.

**Fix**

```diff
     function applyQueued(bytes calldata action, uint32 nonce_) external notLocked {
+        if (msg.sender != owner) revert NotOwner();
         bytes32 hash = keccak256(abi.encode(action, nonce_));
```

<!--/F-->

## Leads

<!--F key=distribution|distribute|remainder-to-last-row kind=LEAD agents=1-->

- **The last row collects the rounding loss of every other row** — `Distribution.distribute` — `src/Distribution.sol:163` · Code smells: every share except the last rounds down, and the last row (the highest address) takes `amount - paid`. The last beneficiary can call `distribute` after each small deposit of a low-decimal token. We did not find a token where the gain covers the gas.

<!--/F-->

<!--F key=distribution|acceptownership|missing-notlocked-guard kind=LEAD agents=1-->

- **`acceptOwnership` runs during `distribute` without the `notLocked` guard** — `Distribution.acceptOwnership` — `src/Distribution.sol:304` · Code smells: `propose` and `applyQueued` carry `notLocked`, and `acceptOwnership` and `cancel` do not. A pending owner who is also a beneficiary can take ownership and clear the queue from its ETH push. We found no path from this to a change in the table or the payouts.

<!--/F-->

<!--F key=distribution|acceptownership|unbounded-queue-clear kind=LEAD agents=1-->

- **A full queue can make `acceptOwnership` run out of gas** — `Distribution.acceptOwnership` — `src/Distribution.sol:304`, `src/Distribution.sol:350` · Code smells: `propose` stores `action` bytes of any length, and `_clearQueue` deletes every slot of every entry in one loop. An attacker with the owner key can fill `_pending` until the handover costs more than the gas cap for one transaction. We did not measure the gas for each slot, and the honest holder of the same key can `cancel` entries.

<!--/F-->

<!--F key=distribution|_clearqueue|unbounded-queue-clear kind=LEAD agents=1-->

- **`_clearQueue` loops over a queue with no size limit** — `Distribution._clearQueue` — `src/Distribution.sol:350` · Code smells: the loop pops every `_pending` entry and its `bytes action` storage, with no cap on how many entries `propose` can add. Only the owner can grow the queue, and `cancel` can shrink it, so the renounce and handover paths fail only if the owner lets the queue grow.

<!--/F-->

<!--F key=distribution|release|escrow-unrecoverable-gas-cap kind=LEAD agents=1-->

- **ETH escrowed for a contract that cannot call `claim` stays locked** — `Distribution.release` — `src/Distribution.sol:177`, `src/Distribution.sol:408` · Code smells: `release` always pushes ETH with `gas: PUSH_GAS`, and only `msg.sender == account` can call `claim`. Take a payee contract that needs more than 100,000 gas to receive and has no general call function. Its `escrowed[0][account]` cannot be paid, and no sweep frees `reserved[address(0)]`. We did not find such a payee in the deploy scripts.

<!--/F-->

<!--F key=distribution|transferownership|nomination-not-revocable kind=LEAD agents=1-->

- **A nominee can accept before the owner's timelocked withdrawal runs** — `Distribution.transferOwnership` — `src/Distribution.sol:291` · Code smells: the withdrawal, `transferOwnership(owner)`, is `onlySelf`, so it waits for `delay`. `acceptOwnership` has no delay and calls `_clearQueue`, which deletes the queued withdrawal. The path needs an owner mistake first: a nomination of the wrong address.

<!--/F-->

<!--F key=distributionfactory|create|shared-sender-salt-squat kind=LEAD agents=1-->

- **A shared forwarder as the sender lets anyone use its salt prefix** — `DistributionFactory.create` — `src/Distribution.sol:465` · Code smells: the prefix check ties `salt` only to `msg.sender`. When the sender is a public forwarder, such as Multicall3 at the same address on every chain, any caller can front-run `create` with that prefix and their own table. We did not check whether the dapp ever sends `create` through a forwarder.

<!--/F-->
