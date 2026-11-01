# Run 1 — solidity-auditor

<!--RUN pass=1 of=1 stamp=20261031-121217 sha=b2ed060 agents=3/12-->

Pass 1 of 1 · 2026-10-31 · `b2ed060` · 3/12 agents returned — this harness exposed three worker slots, so each worker covered four specialty bundles.

## Findings

<!--F key=distribution|distribute|per-call-remainder-bias conf=90 kind=FINDING agents=1-->

[90] **Last beneficiary captures every per-call remainder**

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

<!--/F-->

<!--F key=distribution|-push|uncapped-erc20-callback-gas conf=90 kind=FINDING agents=1-->

[90] **ERC-20 callback exhausts gas and blocks every payout**

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

<!--/F-->

<!--F key=distribution|distribute|reserved-balance-underflow conf=90 kind=FINDING agents=1-->

[90] **Balance decreases strand escrow and block distributions**

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

<!--/F-->

## Leads
