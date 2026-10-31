# Run 1 — solidity-auditor

<!--RUN pass=1 of=1 stamp=20261031-121753 sha=b2ed060 agents=12/12-->

Pass 1 of 1 · 2026-10-31 · `b2ed060` · 12/12 agents returned.

## Findings

<!--F key=app|lock|mutable-code-pointer conf=80 kind=FINDING agents=5-->

[80] **The lock accepts a pointer whose code can change after the lock**

`App.lock` · Confidence: 80

**Description**
The owner can set an EIP-7702 delegated EOA as a chunk, so after `lock` the key holder can change the served page or make `html` fail for every caller.

**Location** `src/App.sol:158-170` (check at `:162` and `:166`); the same check admits the pointer at `src/App.sol:118` (`setChunks`) and `src/App.sol:140` (`setWidgetChunks`). The out-of-gas path is `lib/solady/src/utils/SSTORE2.sol:213`, where `extcodesize` 0 gives `n = 0xffffffffff`.

**Fix (Option A — ban-path: reject a 7702 delegation designator)**:

```diff
-            if (chunks[i].code.length == 0) revert CodelessChunk(chunks[i]);
+            bytes memory c = chunks[i].code;
+            if (c.length == 0 || (c.length == 23 && bytes3(c) == 0xef0100)) revert CodelessChunk(chunks[i]);
```

**Fix (Option B — restrict: accept only SSTORE2 pointers, whose code starts with the 0x00 STOP prefix)**:

```diff
-            if (ptrs[i].code.length == 0) revert CodelessChunk(ptrs[i]);
+            bytes memory c = ptrs[i].code;
+            if (c.length == 0 || c[0] != 0x00) revert CodelessChunk(ptrs[i]);
```

Apply the chosen check at all four sites: `setChunks`, `setWidgetChunks` and both loops in `lock`.

<!--/F-->

<!--F key=distribution|distribute|shared-balance-reserve-bypass conf=75 kind=FINDING agents=5-->

[75] **A second address for one balance pays out escrowed coins again**

`Distribution.distribute` · Confidence: 75

**Description**
Any caller can name the ERC-20 alias of the native coin, so `distribute` ignores `reserved[address(0)]` and pays escrowed coins to the other rows.

**Location** `src/Distribution.sol:142` (`_balance(token) - reserved[token]`, with `reserved` keyed by address at `:87`). Concrete chain: Celo, where GoldToken `0x471EcE3750Da237f93B8E339c536989b8978a438` reads and moves the native balance. A double-entry-point ERC-20 has the same path.

Trace (agent 4): table A 5000 / B 5000, B rejects the native coin, balance 100. `distribute(address(0))` pays A 50 and escrows 50 for B (`reserved[0] = 50`). `distribute(GoldToken)` reads 50, subtracts `reserved[GoldToken] = 0`, and pays A 25 and B 25. `release(address(0), B)` now reverts `ReleaseFailed` for lack of balance. Each repeat gives A half of B's escrow.

**Fix**

```diff
     function distribute(address token) external nonReentrant {
+        // An alias of the native coin shares the native balance, so it must not have its own reserve.
+        if (token != address(0) && token == NATIVE_ALIAS) revert Unauthorized();
         uint256 amount = _balance(token) - reserved[token];
```

<!--/F-->

<!--F key=distribution|distribute|unbounded-erc20-push-gas conf=75 kind=FINDING agents=7-->

[75] **The token push forwards all gas to a recipient hook**

`Distribution.distribute` · Confidence: 75

**Description**
A beneficiary with an ERC-777 receive hook uses the gas that `_push` forwards, so `distribute` of that token fails for every caller until the owner changes the table.

**Location** `src/Distribution.sol:369` (`token.call(...)` with no gas argument), reached from the loop at `src/Distribution.sol:147-159`. The ETH branch at `:360` and `:362-366` is capped; this branch is not.

Arithmetic (agents 6 and 3): with 30M gas, the hook keeps 63/64 and about 469k returns. The escrow for that row needs about 47k and each later token row about 35k, so 12 or more rows after the hostile row cannot finish. A low vanity address puts the hostile row first. The ETH path cannot be starved this way, because 1/64 of a capped 100k call cannot pay for the escrow writes.

**Fix**

```diff
-        (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
+        (ok, data) = token.call{gas: PUSH_GAS}(abi.encodeWithSelector(TRANSFER, to, amount));
```

<!--/F-->

<!--F key=distribution|distribute|reserved-exceeds-balance-underflow conf=75 kind=FINDING agents=8-->

[75] **A balance below the reserve makes distribute revert**

`Distribution.distribute` · Confidence: 75

**Description**
A negative rebase or slashing of a held token drops the balance below `reserved`, so `distribute` reverts for every caller and the last `release` cannot pay.

**Location** `src/Distribution.sol:142` (checked subtraction). The first-come `release` at `src/Distribution.sol:164-179` pays escrows from the same short balance.

Example (agent 1): `reserved[stETH] = 10e18`, balance 11e18. A 10% slashing sets the balance to 9.9e18, so line 142 panics with 0x11 until new tokens arrive. The escrowed accounts hold claims of 10e18 against 9.9e18, so the last one to call `release` cannot be paid.

**Fix**

```diff
-        uint256 amount = _balance(token) - reserved[token];
+        uint256 bal = _balance(token);
+        uint256 amount = bal > reserved[token] ? bal - reserved[token] : 0;
```

<!--/F-->

<!--F key=distribution|distribute|remainder-to-last-row-rounding conf=75 kind=FINDING agents=2-->

[75] **The last row takes the rounding of every small distribution**

`Distribution.distribute` · Confidence: 75

**Description**
The highest-address beneficiary can call `distribute` after each small deposit, so rows with low bps get zero and the last row gets their share.

**Location** `src/Distribution.sol:150` (`i + 1 == n ? amount - paid : bps * amount / BPS_TOTAL`). The table is sorted by ascending address (`src/Distribution.sol:291`), so the last row is fixed.

Example (agent 10): A 100 bps, B 9900 bps, 2-decimal token, deposits of 50 units. Each call gives A `100 * 50 / 10000 = 0` and gives B all 50. A row with `bps = b` gets nothing on any call where `amount < 10000 / b`. The gain per call is at most n-1 units, so the attacker profits only on low-decimal tokens where gas is cheap.

**Fix**

```diff
-            uint256 share = i + 1 == n ? amount - paid : (uint256(b.bps) * amount) / BPS_TOTAL;
+            uint256 share = (uint256(b.bps) * amount) / BPS_TOTAL;
```

The remainder stays in the contract, and the next `distribute` splits it.

<!--/F-->

<!--F key=distribution|release|escrow-no-redirect conf=75 kind=FINDING agents=9-->

[75] **An escrow for an account that cannot receive is locked forever**

`Distribution.release` · Confidence: 75

**Description**
`release` pays only the escrowed account under the same 100,000-gas cap, so a blacklisted account or a wallet that needs more gas never gets its share.

**Location** `src/Distribution.sol:164-179`. The ETH retry runs at `src/Distribution.sol:360` with `gas: PUSH_GAS`. No function moves `escrowed[token][account]` to another address, and `distribute` excludes `reserved[token]` at `:142`.

This covers two mechanisms. (1) A `receive` that writes 5 cold slots costs 110,500 gas, so every ETH retry fails at the 100,000 cap. The cap protects the `distribute` loop and has no purpose in a single-recipient `release` (agent 8). (2) A USDC or USDT blacklist on the account makes every token retry revert (agents 3, 6 and 12).

**Fix (Option A — allow-and-handle: forward all gas on the single-recipient retry)**:

```diff
             if (keepData) {
-                (ok, data) = to.call{value: amount, gas: PUSH_GAS}("");
+                (ok, data) = to.call{value: amount}("");
             } else {
```

**Fix (Option B — validate: let the escrowed account claim to an address it names)**:

```diff
+    function claim(address token, address to) external nonReentrant {
+        uint256 amount = escrowed[token][msg.sender];
+        if (amount == 0) revert NothingToDo();
+        escrowed[token][msg.sender] = 0;
+        reserved[token] -= amount;
+        (bool ok, bytes memory data) = _push(token, to, amount, true);
+        if (!ok) _bubble(data);
+        emit Released(token, msg.sender, amount);
+    }
```

<!--/F-->

<!--F key=distribution|applyqueued|queued-action-order conf=75 kind=FINDING agents=5-->

[75] **Any caller can apply an old queued action after a newer one**

`Distribution.applyQueued` · Confidence: 75

**Description**
Queued actions never expire and have no order, so a beneficiary can apply an older `setBeneficiaries` after a newer one and get the share it lost.

**Location** `src/Distribution.sol:205-216`. The only check is `eta == 0 || block.timestamp < eta` at `:210`. The caller check is absent by design, and no grace period or nonce order exists.

Trace (agent 11): the owner queues `setBeneficiaries(T1)` (nonce 1). Then the owner queues and applies `setBeneficiaries(T2)` (nonce 2), which removes X. T1 stays in `queued`. X calls `applyQueued(T1, 1)` and then `distribute`, in one transaction, and takes its old 10%. A queued nomination followed by a queued withdrawal through `transferOwnership(owner)` has the same problem: whoever applies them chooses the order.

**Fix (Option A — restrict: a grace period after eta)**:

```diff
-        if (eta == 0 || block.timestamp < eta) revert NotReady(eta);
+        if (eta == 0 || block.timestamp < eta || block.timestamp > eta + GRACE) revert NotReady(eta);
```

**Fix (Option B — validate: apply actions only in nonce order)**:

```diff
         if (eta == 0 || block.timestamp < eta) revert NotReady(eta);
+        if (nonce_ <= lastApplied) revert NotReady(eta);
+        lastApplied = nonce_;
```

<!--/F-->

<!--F key=distribution|receive|stipend-cold-delegatecall conf=70 kind=FINDING agents=1-->

[70] **A clone cannot receive ETH under the 2,300-gas stipend**

`Distribution.receive` · Confidence: 70

**Description**
A payer that uses `transfer` or `send` cannot pay a clone, because the proxy spends 2,600 gas on a cold `DELEGATECALL` before `receive` runs.

**Location** `src/Distribution.sol:133-137`. The `@dev` on `:133` says "Must run under a 2,300-gas `transfer` stipend". The proxy runtime is written at `src/Distribution.sol:423-426` (`…5af4…`, a DELEGATECALL to `implementation`). Under EIP-2929, a cold account access costs 2,600 gas, which is more than the 2,300 stipend. `transfer` reverts the payer's call, and `send` returns false, so the payer keeps the ETH. This holds unless the payer's transaction has already warmed the implementation address. The finding is a hand trace and was not run.

<!--/F-->

## Leads

<!--F key=distribution|_push|callback-token-gas-grief kind=LEAD agents=1-->

- **The token branch of `_push` copies all return data and forwards all gas** — `Distribution._push` — Code smells: `token.call` with no gas cap and an unbounded return-data copy at `src/Distribution.sol:369`; for an ERC-777 token the recipient hook, not the token, controls both. — This is the helper-level view of the `distribute` gas finding. We did not measure the return-data copy cost separately from the gas burn.

<!--/F-->

<!--F key=distribution|acceptownership|nomination-withdrawal-timelocked kind=LEAD agents=2-->

- **A nominee accepts before the owner can take the nomination back** — `Distribution.acceptOwnership` — Code smells: `acceptOwnership` at `src/Distribution.sol:256-263` runs at once and calls `_clearQueue`, which deletes a queued `transferOwnership(owner)` withdrawal; the withdrawal must wait `delay`. — The owner cannot react to a nominee it no longer trusts. The owner chose the nominee, so we did not find an unprivileged path.

<!--/F-->

<!--F key=distribution|transferownership|nomination-withdrawal-timelocked kind=LEAD agents=1-->

- **Taking a nomination back waits for the delay, and acceptance does not** — `Distribution.transferOwnership` — Code smells: `transferOwnership` at `src/Distribution.sol:244-252` is `onlySelf`, so the overwrite goes through `propose` and waits `delay`, unlike Ownable2Step where the overwrite is immediate. — The owner causes the precondition. We report this as owner trust only.

<!--/F-->

<!--F key=app|setwidgetchunks|over-restrictive-empty-check kind=LEAD agents=1-->

- **The owner cannot remove a widget after it adds one** — `App.setWidgetChunks` — Code smells: `if (ptrs.length == 0) revert EmptyDocument();` at `src/App.sol:137` is copied from `setChunks`, but an empty widget list is a valid state for `request` (`src/App.sol:95`) and for `lock`. — The effect is on function only, and no funds are lost.

<!--/F-->
