# Run 1 — solidity-auditor

<!--RUN pass=1 of=1 stamp=20261106-194914 sha=d07483a agents=3/12-->

Pass 1 of 1 · 2026-11-06 · `d07483a` · 3/12 agents returned — this harness allowed only four total agent slots, so three reviewers each covered four specialties.

## Findings

<!--F key=distribution|distribute|fixed-last-remainder conf=90 kind=FINDING agents=2-->

[90] **Fixed remainder lets the last beneficiary take rounded shares**

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

<!--/F-->

<!--F key=distribution|release|nominal-escrow-insolvency conf=90 kind=FINDING agents=2-->

[90] **First release drains rebased escrow backing**

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

<!--/F-->

<!--F key=distribution|claim|nominal-escrow-insolvency conf=90 kind=FINDING agents=1-->

[90] **First claim drains rebased escrow backing**

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

<!--/F-->

<!--F key=distribution|push|uncapped-token-callback-gas conf=85 kind=FINDING agents=1-->

[85] **ERC-20 callbacks exhaust gas before later payouts**

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

<!--/F-->

## Leads

<!--F key=distribution|distribute|self-beneficiary-balance-reuse kind=LEAD agents=1-->

- **A self-beneficiary keeps its transferred balance** — `src/Distribution.sol:166 · Distribution.distribute` — Code smells: self-transfer, unchanged balance, fixed-share accounting — A self-beneficiary leaves its share in the contract, so later calls pay it again. We did not verify that supported tables use the clone.

<!--/F-->
