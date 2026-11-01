> **Orchestration limitation:** This harness exposed only three worker slots, so it could not run the skill's 12 audit agents simultaneously. Three independent workers covered all 12 specialty bundles in groups of four.

# 🔐 Security Review — rake-blind-2026-10-31

---

## Scope

|  |  |
| --- | --- |
| **Mode** | filename |
| **Files reviewed** | `src/Distribution.sol` · `src/App.sol` · `scripts/forge/Deploy.s.sol`<br>`scripts/forge/DeployApp.s.sol` |
| **Confidence threshold (1-100)** | 75 |

---

## Findings

[90] **1. ERC-20 callback exhausts gas and blocks every payout**

`src/Distribution.sol:369 · Distribution._push` · Confidence: 90

**Severity**
Medium

**Description**
A callback-enabled token lets one beneficiary exhaust transfer gas, so every distribution reverts before the other beneficiaries receive their tokens.

**Fix**

```diff
- (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
+ (ok, data) = token.call{gas: PUSH_GAS}(abi.encodeWithSelector(TRANSFER, to, amount));
```

---

[90] **2. Last beneficiary captures every per-call remainder**

`src/Distribution.sol:150 · Distribution.distribute` · Confidence: 90

**Severity**
Medium

**Description**
The last beneficiary can call `distribute` after each indivisible deposit, so repeated rounding gives that beneficiary every discarded share.

**Fix**

```diff
- uint256 share = i + 1 == n ? amount - paid : (uint256(b.bps) * amount) / BPS_TOTAL;
+ uint256 share = _shareWithPersistentRemainder(token, account, b.bps, amount);
```

---

[90] **3. Balance decreases strand escrow and block distributions**

`src/Distribution.sol:142 · Distribution.distribute` · Confidence: 90

**Severity**
Medium

**Description**
A negative rebase or sender fee can lower the balance below `reserved`, so distributions revert and escrow claims lack tokens.

**Fix**

```diff
- uint256 amount = _balance(token) - reserved[token];
+ uint256 balance = _balance(token);
+ uint256 amount = balance > reserved[token] ? balance - reserved[token] : 0;
```

Also settle an underfunded escrow claim pro rata in `release`, and reduce `reserved` by the full nominal claim after settlement.

---

Findings List

| # | Confidence | Title |
|---|---|---|
| 1 | [90] | ERC-20 callback exhausts gas and blocks every payout |
| 2 | [90] | Last beneficiary captures every per-call remainder |
| 3 | [90] | Balance decreases strand escrow and block distributions |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

_None._

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
