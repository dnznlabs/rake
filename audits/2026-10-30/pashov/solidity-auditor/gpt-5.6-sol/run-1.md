# Run 1 — solidity-auditor

<!--RUN pass=1 of=1 stamp=20261030-222000 sha=37eccc2 agents=3/12-->

Pass 1 of 1 · 2026-10-30 · `37eccc2` · 3/12 audit workers returned — the runtime limited concurrency, so each worker covered four specialist bundles.

## Findings

<!--F key=distribution|acceptownership|stale-queued-authority conf=90 kind=FINDING agents=3-->

[90] **[HIGH] Ownership acceptance leaves the former owner's queue active**

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

<!--/F-->

<!--F key=distribution|applyqueued|stale-queued-authority conf=90 kind=FINDING agents=3-->

[90] **[MEDIUM] Queue execution accepts actions from a former owner**

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

<!--/F-->

<!--F key=distribution|distribute|callback-table-mutation conf=90 kind=FINDING agents=7-->

[90] **[MEDIUM] A token callback mixes two beneficiary tables**

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

<!--/F-->

<!--F key=distribution|distribute|sender-fee-consumes-reserves conf=90 kind=FINDING agents=4-->

[90] **[MEDIUM] Sender-paid fees consume escrow reserves**

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

<!--/F-->

<!--F key=deployapp|run|wrong-default-owner conf=90 kind=FINDING agents=6-->

[90] **[MEDIUM] The script assigns ownership to the wrong account**

`scripts/forge/DeployApp.s.sol:11 (DeployApp.run)` · Confidence: 90

**Description**
An operator who omits `OWNER` gives `App` ownership to Foundry's default caller instead of the wallet that broadcasts the deployment.

**Fix**

```diff
- address owner = vm.envOr("OWNER", msg.sender);
+ address owner = vm.envAddress("OWNER");
```

<!--/F-->

## Leads

<!--F key=distribution|distribute|reserved-balance-underflow kind=LEAD agents=3-->

- **[MEDIUM] Negative rebases can make token escrow insolvent** — `src/Distribution.sol:135 (Distribution.distribute)` — Code smells: fixed nominal reserves, unchecked external balance changes — A negative rebase can put the token balance below reserved claims. We did not prove that an unprivileged actor can trigger the rebase profitably.

<!--/F-->
