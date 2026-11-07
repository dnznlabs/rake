> ⚠️ Orchestration limitation: this harness exposed only four total agent slots, so the skill's 12 simultaneous agents could not run. Three reviewers covered all 12 specialties in four-specialty groups.

# 🔐 Security Review — rake-blind-2026-11-02

---

## Scope

|  |  |
| --- | --- |
| **Mode** | filename |
| **Files reviewed** | `src/Distribution.sol` · `src/App.sol` · `scripts/forge/Deploy.s.sol`<br>`scripts/forge/DeployApp.s.sol` |
| **Confidence threshold (1-100)** | 75 |

---

## Findings

[90] **1. First claim drains rebased escrow backing**

`src/Distribution.sol:200 · Distribution.claim` · Confidence: 90

**Severity**
Medium

**Description**
The first beneficiary can claim its nominal escrow after a negative rebase, so it takes backing owed to later beneficiaries.

**Fix**

```diff
- uint256 amount = escrowed[token][msg.sender];
- if (amount == 0) revert NothingToDo();
+ uint256 nominal = escrowed[token][msg.sender];
+ if (nominal == 0) revert NothingToDo();
+ uint256 totalReserved = reserved[token];
+ uint256 backing = _balance(token);
+ uint256 amount = backing < totalReserved
+     ? _mulDiv(nominal, backing, totalReserved)
+     : nominal;

  escrowed[token][msg.sender] = 0;
- reserved[token] -= amount;
+ reserved[token] = totalReserved - nominal;
```

---

[90] **2. Fixed remainder lets the last beneficiary take rounded shares**

`src/Distribution.sol:163 · Distribution.distribute` · Confidence: 90

**Severity**
Medium

**Description**
The last beneficiary can call after each small deposit, so it takes units that the basis-point table assigns to earlier beneficiaries.

**Fix**

```diff
+ uint256 private distributionQuantum;

- uint256 amount = _balance(token) - reserved[token];
+ uint256 available = _balance(token) - reserved[token];
+ uint256 amount = available - (available % distributionQuantum);
  if (amount == 0) revert NothingToDo();

- uint256 share = i + 1 == n ? amount - paid : (uint256(b.bps) * amount) / BPS_TOTAL;
+ uint256 share = (uint256(b.bps) * amount) / BPS_TOTAL;

+ // In _set, store the LCM of 10_000 / gcd(10_000, b.bps) for all rows.
+ // This makes every share exact and retains sub-quantum units for a later call.
```

---

[90] **3. First release drains rebased escrow backing**

`src/Distribution.sol:178 · Distribution.release` · Confidence: 90

**Severity**
Medium

**Description**
The first beneficiary can release its nominal escrow after a negative rebase, so it takes backing owed to later beneficiaries.

**Fix**

```diff
- uint256 amount = escrowed[token][account];
- if (amount == 0) revert NothingToDo();
+ uint256 nominal = escrowed[token][account];
+ if (nominal == 0) revert NothingToDo();
+ uint256 totalReserved = reserved[token];
+ uint256 backing = _balance(token);
+ uint256 amount = backing < totalReserved
+     ? _mulDiv(nominal, backing, totalReserved)
+     : nominal;

  escrowed[token][account] = 0;
- reserved[token] -= amount;
+ reserved[token] = totalReserved - nominal;
```

---

[85] **4. ERC-20 callbacks exhaust gas before later payouts**

`src/Distribution.sol:417 · Distribution._push` · Confidence: 85

**Severity**
Medium

**Description**
A hook beneficiary can consume the uncapped ERC-20 call gas, so the transaction reverts before later beneficiaries receive tokens.

**Fix**

```diff
- (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
+ bytes memory payload = abi.encodeWithSelector(TRANSFER, to, amount);
+ if (keepData) (ok, data) = token.call(payload);
+ else (ok, data) = token.call{gas: PUSH_GAS}(payload);
  ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
```

---

Findings List

| # | Confidence | Title |
|---|---|---|
| 1 | [90] | First claim drains rebased escrow backing |
| 2 | [90] | Fixed remainder lets the last beneficiary take rounded shares |
| 3 | [90] | First release drains rebased escrow backing |
| 4 | [85] | ERC-20 callbacks exhaust gas before later payouts |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

- **A self-beneficiary keeps its transferred balance** — `src/Distribution.sol:166 · Distribution.distribute` — Code smells: self-transfer, unchanged balance, fixed-share accounting — A self-beneficiary leaves its share in the contract, so later calls pay it again. We did not verify that supported tables use the clone.

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
