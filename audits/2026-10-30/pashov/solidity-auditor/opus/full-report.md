> **Leg notes (what this run could and could not do).**
> - **The model question was not asked.** This runtime has no `AskUserQuestion`, so the skill's model picker skipped itself. All 12 agents ran on the orchestrator's model, Claude Opus 5.5, with no `model` override. `--loop 1` set the pass count, so the pass question was not asked either.
> - **Skill version.** The pinned skill (`audits/.skills/pashov/solidity-auditor`, which `~/.claude/skills/solidity-auditor` links to) is VERSION 4. The upstream VERSION is 4.1, so the skill printed its upgrade warning. This run used the pinned version 4.
> - **Blindness: one partial breach.** Agent 2 (access-control) ran a `grep` over the repository that matched files under `audits/2026-10-30/` and showed a few lines of the other leg's report. Those lines were about the `DeployApp` `OWNER` default. The agent then stopped reading that directory. The `DeployApp.run` lead was also raised by agents 9 and 7, who did not touch that directory. No other finding is affected.
> - **PoCs ran outside the repository.** Agents 1, 2, 3, 6, 8, 11 and 12 built scratch Foundry projects under `/tmp`. The audited tree was not modified: `git status` showed only the pre-existing `audits/2026-10-30/` before and after the scan. The safety classifier blocked one command of agent 7 (a test-directory listing), and agent 7 did not run it again.
> - **Two extra lines in each finding body:** `Where` (file:line) and `Severity`, plus a short `Proof`. The leg prompt requires them for cross-leg dedup, and the skill's format has no field for them. Leads carry file:line in their code smells. `Distribution.distribute` / `Distribution.applyQueued` and `Distribution._push` / `Distribution.distribute` are one bug each, listed under two functions, because the skill's function-isolation rule forbids a merge across functions. Each entry says so.
> - **Coverage:** 1 pass, 12/12 agents returned. Completeness: 7 unique (Contract, function) in raw agent output, 7 covered here. No finding was raised in `src/App.sol` or `scripts/forge/Deploy.s.sol`. A file with no finding is not a file that was cleared.

# 🔐 Security Review — rake-blind-2026-10-30

---

## Scope

|  |  |
| --- | --- |
| **Mode** | filename |
| **Files reviewed** | `src/Distribution.sol` · `src/App.sol` · `scripts/forge/Deploy.s.sol`<br>`scripts/forge/DeployApp.s.sol` |
| **Confidence threshold (1-100)** | 75 |

---

## Findings

[85] **1. `applyQueued` takes no lock while `distribute` pays out**

`Distribution.applyQueued` · Confidence: 85

**Description**
`applyQueued` does not check the `locked` flag, so a payee that re-enters from a token hook replaces `_table` while `distribute` is still in its loop.

**Where:** `src/Distribution.sol:199-210`. This is the entry point of the `Distribution.distribute` finding (same confidence). Agents 9, 2 and 8 put the location here, and function isolation keeps it as its own entry. **Severity:** Medium (the same bug as the `Distribution.distribute` finding, so do not count it twice).

**Proof:** `distribute` and `release` share the transient `locked` flag (`src/Distribution.sol:104-109`), but `applyQueued` has no modifier. A scratch test by agent 8 gave the same result as the `Distribution.distribute` finding: old [A 5000, B 5000], new [C 5000, A 5000], so A gets 100e18 and B and C get 0. A cold `applyQueued` in that test cost 134,054 gas, more than `PUSH_GAS`, so the attack needs a hook token.

**Fix**

```diff
-    function applyQueued(bytes calldata action, uint32 nonce_) external {
+    function applyQueued(bytes calldata action, uint32 nonce_) external nonReentrant {
```

---

[85] **2. A beneficiary changes the table in the middle of `distribute`**

`Distribution.distribute` · Confidence: 85

**Description**
A beneficiary with a token transfer hook calls `applyQueued` during `distribute`, so later rows use the new table and the last row takes other shares.

**Where:** `src/Distribution.sol:141` (`n` read once), `src/Distribution.sol:144` (`_table[i]` read again on each pass), `src/Distribution.sol:146` (last row takes `amount - paid`), `src/Distribution.sol:199` (`applyQueued` takes no lock). **Severity:** Medium.

**Proof:** Six agents ran Foundry PoCs outside the repo, and all passed. Example: the old table is [A 5000, B 5000], and a ready queued table is [C 5000, A 5000] with C < A < B. The token is ERC-777-style, and the contract holds 100e18. Row 0 pays A 50e18, and A's hook calls `applyQueued`. Row 1 is still the last row (cached `n` = 2), so it reads the new `_table[1]` = A and pays the remainder, 50e18. Result: A gets 100e18, B gets 0 (the old table owes it 50e18), and C gets 0 (the new table owes it 50e18). If the new table is shorter than `n`, `_table[i]` goes out of bounds and `distribute` reverts for every caller while the change is ready. The plain ETH path ran out of gas in every measured case: a reentrant `applyQueued` cost 86.6k–141.7k against `PUSH_GAS` = 100,000, so that share went to escrow. The ETH path is open only if a queued action is small enough to fit. Preconditions: a queued `setBeneficiaries` is past its eta and nobody has applied it yet, and the token calls the recipient on transfer. Anyone can call both `distribute` and `applyQueued`.

**Fix (Option A — restrict: lock `applyQueued`)**:

```diff
-    function applyQueued(bytes calldata action, uint32 nonce_) external {
+    function applyQueued(bytes calldata action, uint32 nonce_) external nonReentrant {
```

**Fix (Option B — ban-path: refuse a table write under the lock)**:

```diff
     function _set(Beneficiary[] calldata table_) private {
+        if (locked) revert Locked();
         uint256 n = table_.length;
```

---

[75] **3. `distribute` copies all return data from each ETH push**

`Distribution._push` · Confidence: 75

**Description**
Hostile ETH beneficiaries revert with large return data, and `distribute` keeps every copy in memory, so about eighteen such rows make it cost more than a block.

**Where:** `src/Distribution.sol:324` (`(ok, data) = to.call{value: amount, gas: PUSH_GAS}("")`), called in the loop at `src/Distribution.sol:149`. **Severity:** Low. This needs many hostile rows in a table that the owner chose. Two agents raised it as a FINDING and two as a LEAD, so it was promoted at 75 by multi-agent convergence.

**Proof:** Agent 1 ran a PoC with 107 rows, where k rows revert with 0x31000 bytes. Gas: k=1 1.58M, k=5 4.06M, k=10 10.6M, k=15 21.0M, k=20 35.3M. Agent 8 got 20 rows → 33,967,809 gas, against 2,828,463 for 20 rows that only burn gas. The gas bound for `MAX_BENEFICIARIES` (`src/Distribution.sol:62-67`, "under half a 30M block") fails at about k=11. The 30M block fails at about k=18. After that, nobody can distribute ETH until a timelocked table change, and if ownership was renounced, nobody ever can.

**Fix**

```diff
         if (token == address(0)) {
-            (ok, data) = to.call{value: amount, gas: PUSH_GAS}("");
-            return (ok, data);
+            assembly ("memory-safe") {
+                ok := call(PUSH_GAS, to, amount, 0, 0, 0, 0)
+            }
+            return (ok, data);
         }
```

---

[75] **4. A clone cannot receive ETH from `transfer` or `send`**

`Distribution.receive` · Confidence: 75

**Description**
A payer that uses `transfer` or `send` gives the clone 2,300 gas, but the clone's cold delegatecall costs 2,600, so the payment fails.

**Where:** `src/Distribution.sol:129-133`. The NatSpec says "Must run under a 2,300-gas `transfer` stipend". The PUSH0 clone runtime is built at `src/Distribution.sol:380-384`. **Severity:** Low. No funds are lost: `transfer` reverts, and with `send` the ETH stays with the payer. But every contract payer that uses `transfer` or `send` (older marketplaces, royalty payers, escrows) cannot pay a Distribution clone, against the contract's own stated guarantee.

**Proof:** Under EIP-2929 a DELEGATECALL to a cold address costs 2,600 gas, which is more than the 2,300 stipend before `receive` runs. Agent 12 measured it in a scratch test: `Payer.pay` → `payable(clone).transfer(1 ether)` reverts with `isolate = true` and passes only when the implementation is already warm. Agent 6 measured that the clone needs about 4,200 gas even when the implementation is warm.

**Fix (Option A — validate: state the real limit)**:

```diff
-    /// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
+    /// @dev A clone CANNOT receive under a 2,300-gas `transfer`/`send` stipend: its DELEGATECALL to the
+    /// cold implementation alone costs 2,600. Payers must forward more gas (a plain `call`).
```

**Fix (Option B — allow-and-handle: smaller `receive`; this is not enough alone in the cold case)**:

```diff
     receive() external payable {
         if (address(this) == self) revert Unauthorized();
-        emit Received(msg.sender, msg.value);
     }
```

---

[70] **5. A renounce leaves queued actions that anyone can still apply**

`Distribution.transferOwnership` · Confidence: 70

**Description**
The owner queues `transferOwnership(B)` before the renounce, so after it any caller applies that action and B takes ownership again, and nobody can cancel it.

**Where:** `src/Distribution.sol:234-245` (the renounce clears `owner` and `pendingOwner` but not `_pending` or `queued`; line 244 does not check for `owner == address(0)`), `src/Distribution.sol:213-214` (`cancel` needs `owner`), `src/Distribution.sol:199-210` (`applyQueued` has no owner check and no expiry). **Severity:** Low. The NatSpec promises "nothing can be proposed or cancelled again". Beneficiaries who read `owner == 0` as "the table is frozen" are wrong. A queued `setBeneficiaries` also still applies after the renounce, and nobody can cancel it. After a normal handover, the old owner's queued actions also stay applicable unless the new owner cancels each one. The confidence is below the threshold because the owner must queue the action before the renounce (judging.md: admin action). The unprivileged amplifier is that any caller applies it and nobody can cancel it.

**Proof:** Agents 2 and 11 ran PoCs, and both passed. With delay = 1 day: propose `transferOwnership(B)` (nonce 1), then propose `transferOwnership(0)` (nonce 2). Anyone applies nonce 2, so `owner == 0` and `cancel` reverts `NotOwner` for every caller. Then anyone applies nonce 1, so `pendingOwner = B`. B calls `acceptOwnership`, so `owner == B`, and B can `propose` again.

---

Findings List

| # | Confidence | Title |
|---|---|---|
| 1 | [85] | `applyQueued` takes no lock while `distribute` pays out |
| 2 | [85] | A beneficiary changes the table in the middle of `distribute` |
| 3 | [75] | `distribute` copies all return data from each ETH push |
| 4 | [75] | A clone cannot receive ETH from `transfer` or `send` |
| | | **Below Confidence Threshold** |
| 5 | [70] | A renounce leaves queued actions that anyone can still apply |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

- **`DeployApp` can make Foundry's default sender the `App` owner** — `DeployApp.run` — Code smells: `vm.envOr("OWNER", msg.sender)` at `scripts/forge/DeployApp.s.sol:11` runs before `vm.startBroadcast()`. Without `--sender`, or a single signer that Foundry detects, `msg.sender` is Foundry's DEFAULT_SENDER, which has no known key. The documented command at line 7 passes neither. Agents 9 and 7 raised this on their own. Agent 2 raised it after a `grep` showed it lines of the other leg's report. — An operator who leaves out `OWNER` deploys an `App` that nobody can update or `lock`. We did not test which signer flags avoid this.
- **Queued actions never expire, and any caller picks the order** — `Distribution.applyQueued` — Code smells: `queued[hash]` at `src/Distribution.sol:199-210` has no expiry or grace period. Any caller applies matured actions in any order, and a newer `setBeneficiaries` does not replace an older one. — Any caller can apply an older queued `setBeneficiaries` after a newer one, so the older table wins. We did not prove an owner flow that leaves both queued.
- **A balance below `reserved` blocks `distribute` for a token** — `Distribution.distribute` — Code smells: `_balance(token) - reserved[token]` at `src/Distribution.sol:138` is a checked subtraction with no guard. A negative rebase (stETH after slashing) or a fee charged to the sender (a 1% fee on a push of 50 takes 50.5, so the next push fails into escrow while the balance is short) can leave `reserved` above the balance. `release` at `src/Distribution.sol:165-166` then fails too. — A token whose balance falls below `reserved` makes `distribute` revert for every caller until new inflows cover the gap. We did not test a real token.
- **`distribute` pays for the return data of every failed ETH push** — `Distribution.distribute` — Code smells: the loop at `src/Distribution.sol:143-155` keeps each `data` copy from `_push`, and memory is never freed across rows. This is the same mechanism as the `Distribution._push` finding. Agent 8 put the location here, and function isolation keeps it as its own entry. — Hostile ETH beneficiaries make one `distribute` call cost more gas with each hostile row. See the `_push` finding for the measured numbers.
- **The last row takes every row's rounding remainder** — `Distribution.distribute` — Code smells: `(uint256(b.bps) * amount) / BPS_TOTAL` at `src/Distribution.sol:146` rounds to 0 when `bps * amount < 10_000`, and the last row (the highest address) gets `amount - paid`. Agent 10 raised it as a FINDING, and it was demoted because the gain is dust: at most `n-1` base units per call. — The last beneficiary can call `distribute` after each small inflow, so it gets up to `n-1` base units of the other rows' shares each time. This matters only for tokens with 0 to 2 decimals or very small inflows.
- **A token push gives the recipient hook all the gas** — `Distribution.distribute` — Code smells: the ERC-20 branch of `_push` (`src/Distribution.sol:327`) has no gas cap, but the ETH branch is capped at `PUSH_GAS`. — A beneficiary with a hook token can use 63/64 of the gas in its hook, so `distribute(token)` cannot pay the later rows. We did not confirm that such a token reaches this contract.
- **The gas cap in `_push` covers ETH only** — `Distribution._push` — Code smells: `token.call(abi.encodeWithSelector(TRANSFER, to, amount))` at `src/Distribution.sol:327` sends all remaining gas. The `MAX_BENEFICIARIES = 107` bound assumes each row costs at most 138,917 gas. After a hook uses 63/64 of the gas, the 1/64 left cannot pay the escrow writes for the remaining rows (about 40k each). — A beneficiary with a hook token can make `distribute(token)` revert for every caller at any block gas limit. We did not find a hook token in use.
- **An escrow that cannot be delivered stays locked forever** — `Distribution.release` — Code smells: `release` at `src/Distribution.sol:160-175` retries through the same `_push`, with the same 100,000 `PUSH_GAS` for ETH. No function sends `escrowed[token][account]` to another address or with more gas, and a table change does not move it. A token blacklist (USDC or USDT) does the same to ERC-20 escrow. — A payee that always needs more than 100,000 gas, or that the token blacklists, never gets its escrow, and that value stays in `reserved`. We did not confirm whether the design accepts this.

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
