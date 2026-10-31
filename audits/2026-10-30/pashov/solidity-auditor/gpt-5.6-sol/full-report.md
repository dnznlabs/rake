> **Degraded orchestration:** This runtime provided only three audit-worker slots, so three independent workers each reviewed four of the twelve specialist bundles. The required twelve simultaneous agents could not run. The upstream skill-version check also could not reach the network.

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

[90] **1. [MEDIUM] The script assigns ownership to the wrong account**

`scripts/forge/DeployApp.s.sol:11 (DeployApp.run)` · Confidence: 90

**Description**
An operator who omits `OWNER` gives `App` ownership to Foundry's default caller instead of the wallet that broadcasts the deployment.

**Fix**

```diff
- address owner = vm.envOr("OWNER", msg.sender);
+ address owner = vm.envAddress("OWNER");
```

---

[90] **2. [HIGH] Ownership acceptance leaves the former owner's queue active**

`src/Distribution.sol:245 (Distribution.acceptOwnership)` · Confidence: 90

**Description**
A former owner can execute a queued transfer after handover, so its nominee takes ownership from the new owner in one transaction.

**Fix**

```diff
+ uint256 public ownerEpoch;
- hash = keccak256(abi.encode(action, n));
+ hash = keccak256(abi.encode(action, n, ownerEpoch));
- bytes32 hash = keccak256(abi.encode(action, nonce_));
+ bytes32 hash = keccak256(abi.encode(action, nonce_, ownerEpoch));
  owner = msg.sender;
+ ++ownerEpoch;
```

---

[90] **3. [MEDIUM] Queue execution accepts actions from a former owner**

`src/Distribution.sol:196 (Distribution.applyQueued)` · Confidence: 90

**Description**
Any caller can execute a former owner's queued beneficiary change after handover, so it can redirect deposits before the new owner cancels.

**Fix**

```diff
+ uint256 public ownerEpoch;
- hash = keccak256(abi.encode(action, n));
+ hash = keccak256(abi.encode(action, n, ownerEpoch));
- bytes32 hash = keccak256(abi.encode(action, nonce_));
+ bytes32 hash = keccak256(abi.encode(action, nonce_, ownerEpoch));
  owner = msg.sender;
+ ++ownerEpoch;
```

---

[90] **4. [MEDIUM] A token callback mixes two beneficiary tables**

`src/Distribution.sol:146 (Distribution.distribute)` · Confidence: 90

**Description**
A callback beneficiary can apply a ready table change during distribution, so one payout uses two tables and can pay that beneficiary twice.

**Fix**

```diff
- function propose(bytes calldata action) external returns (bytes32 hash) {
+ function propose(bytes calldata action) external nonReentrant returns (bytes32 hash) {
- function applyQueued(bytes calldata action, uint32 nonce_) external {
+ function applyQueued(bytes calldata action, uint32 nonce_) external nonReentrant {
```

---

[90] **5. [MEDIUM] Sender-paid fees consume escrow reserves**

`src/Distribution.sol:135 (Distribution.distribute)` · Confidence: 90

**Description**
A sender-fee token charges distribution costs to reserved balances, so an escrowed beneficiary cannot recover its recorded amount.

**Fix**

```diff
+ error ReserveDeficit(address token);
  (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
  ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
+ if (ok && _balance(token) < reserved[token]) revert ReserveDeficit(token);
```

---

Findings List

| # | Confidence | Title |
|---|---|---|
| 1 | [90] | [MEDIUM] The script assigns ownership to the wrong account |
| 2 | [90] | [HIGH] Ownership acceptance leaves the former owner's queue active |
| 3 | [90] | [MEDIUM] Queue execution accepts actions from a former owner |
| 4 | [90] | [MEDIUM] A token callback mixes two beneficiary tables |
| 5 | [90] | [MEDIUM] Sender-paid fees consume escrow reserves |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

- **[MEDIUM] Negative rebases can make token escrow insolvent** — `src/Distribution.sol:135 (Distribution.distribute)` — Code smells: fixed nominal reserves, unchecked external balance changes — A negative rebase can put the token balance below reserved claims. We did not prove that an unprivileged actor can trigger the rebase profitably.

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
