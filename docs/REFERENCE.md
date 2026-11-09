# Contract reference

Every external function, event and error of `Distribution` and `DistributionFactory`, and the
`Snapshot` struct the widget reads. The dapp's `#/docs` page is written for the owner of a
distribution and points here; this file is for the developer who wants the whole surface.

The tables are data as much as prose: `test/docs.test.mjs` fails when the struct below differs from
`src/Distribution.sol` by one character or when a function the selector fixture names is missing
from the table, and M02 criterion 6's script diffs the three `Distribution` tables against
`forge inspect Distribution abi`. A row is added when the ABI gains a member, never the other way
round. `self` means the function is reachable only as a queued action, the contract calling itself;
`factory` that only the factory may call it.

## Distribution

### Functions

| function | caller | effect |
|:--|:--|:--|
| `distribute(address token)` | anyone | splits the balance that is not escrowed across the table, in table order; a push that fails is escrowed instead |
| `release(address token, address account)` | anyone | retries one escrowed share under the same push gas cap; a retry that fails reverts and the share stays escrowed |
| `claim(address token, address to)` | the escrowed account | sends the caller's own escrow to an address it names, with the caller's gas and no push cap; only `msg.sender`'s escrow moves, and `to` is not validated |
| `propose(bytes action)` | owner | queues a self-call at now + delay, or runs it inline when the delay is zero; refused while `distribute` or `release` is running |
| `applyQueued(bytes action, uint32 nonce)` | anyone | runs a queued action once its eta has passed and until `GRACE` after it; past that it has expired and this reverts; an action that reverts stays queued; refused while `distribute` or `release` is running |
| `cancel(bytes32 hash)` | owner; anyone once the action has expired | drops a queued action, immediately — the delay guards applying, not cancelling |
| `setBeneficiaries(Beneficiary[] table)` | self | replaces the table; reachable only as a queued action |
| `setDescription(string description)` | self | replaces the label; reachable only as a queued action |
| `setDelay(uint32 delay)` | self | changes the delay, through the delay in force |
| `transferOwnership(address owner)` | self | names the next owner, who must call acceptOwnership() before anything changes; the zero address renounces at once, clears any pending transfer and drops every queued action; naming the current owner withdraws one |
| `acceptOwnership()` | pending owner | takes ownership after transferOwnership named the caller, clears the pending transfer, and drops every queued action |
| `init(address owner, uint32 delay, string description, Beneficiary[] table)` | factory | initialises a clone, once, as part of the create transaction; any balance present at that point is logged as `Received(address(0), balance)` |
| `snapshot()` | view | owner, delay, nonce, description, table and pending in one call |
| `beneficiaries()` | view | the table as stored, which is ascending by account |
| `pendingCount()` | view | how many actions are queued |
| `queued(bytes32 hash)` | view | the eta of a queued action; zero means no such action |
| `escrowed(address token, address account)` | view | what is held for one account after a push failed |
| `reserved(address token)` | view | everything escrowed for a token, which the next split leaves alone |
| `owner()` | view | who may propose and cancel; the zero address means renounced, and `create` accepts a zero `owner` rather than refusing it, so a clone can be born renounced — permanently configured from its first block, still distributing, releasing and claiming, with nothing left to propose |
| `pendingOwner()` | view | who has been named as the next owner; the zero address means no transfer is pending |
| `delay()` | view | seconds every proposal waits before it can be applied |
| `nonce()` | view | proposals made so far; it is hashed into every queued action |
| `description()` | view | the label the distribution carries for itself |
| `MAX_BENEFICIARIES()` | view | the most rows a table may carry — measured so that a worst-case split stays under half a block |
| `GRACE()` | view | how long after its eta a matured action stays applicable; past it the action has expired and anyone may cancel it |

### Events

| event | emitted by | when |
|:--|:--|:--|
| `Received(address indexed from, uint256 amount)` | receive, init | ETH arrived; the ERC-20 path has no hook and emits nothing. From `init`, `from` is `address(0)` — the sentinel for "present at init, sender unknown" — which covers value that rode the create and value sent to the counterfactual address before any code existed there. A forced send after deployment stays unlogged |
| `Distributed(address indexed token, uint256 amount)` | distribute | a split completed, for the amount it moved |
| `Escrowed(address indexed token, address indexed account, uint256 amount)` | distribute | a push failed, so that share is held for its account |
| `Released(address indexed token, address indexed account, uint256 amount)` | release | an escrowed share was retried and paid |
| `Claimed(address indexed token, address indexed account, address to, uint256 amount)` | claim | an escrowed account took its own escrow; `to` is where it sent it, which is why this is not a `Released` |
| `Queued(bytes32 indexed hash, uint32 nonce, uint256 eta, bytes action)` | propose | an action was staged, with its calldata in the log |
| `Applied(bytes32 indexed hash)` | applyQueued, propose | the action ran — from propose when the delay is zero |
| `Cancelled(bytes32 indexed hash)` | cancel | a queued action was withdrawn — by the owner, or by anyone once it had expired |
| `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)` | acceptOwnership, transferOwnership | the named owner took it, or the owner renounced and `newOwner` is the zero address. Either way it is the only trace of the change, since the nomination rides in Queued's calldata |

### Errors

| error | thrown by | when |
|:--|:--|:--|
| `NotOwner()` | propose, cancel | the caller is not the owner — from `cancel`, for any action that has not expired, including one that does not exist |
| `BadTable()` | init, setBeneficiaries | empty or more than 107 rows, not ascending by account, a zero share, or shares that do not sum to 10,000 |
| `NotReady(uint256 eta)` | applyQueued | nothing is queued under that hash, or its eta has not passed |
| `Expired(uint256 eta)` | applyQueued | the action matured more than `GRACE` ago, so it can no longer be applied and anyone may cancel it |
| `NothingToDo()` | distribute, release, claim, cancel | there is nothing to split, retry, claim or withdraw |
| `Locked()` | distribute, release, claim | re-entered while a push was still in flight |
| `ReleaseFailed(address token)` | release, claim | the push failed with no reason of its own — a bare false, empty revert data, or an argument-less custom error |
| `Unauthorized()` | init, the setters, acceptOwnership, receive | not the factory, not a self-call, not the pending owner, or ETH sent to the implementation itself |

### The snapshot struct

Verbatim from `src/Distribution.sol`, and what `snapshot()` returns: the widget's entire read surface.

```solidity
struct Beneficiary {
    address account;
    uint96 bps;
    string name;
    string note;
}

struct Pending {
    bytes32 hash;
    uint256 eta;
    bytes action;
}

struct Snapshot {
    address owner;
    uint32 delay;
    uint32 nonce;
    string description;
    Beneficiary[] table;
    Pending[] pending;
}
```

## DistributionFactory

| member | caller | effect |
|:--|:--|:--|
| `create(address owner, uint32 delay, string description, Beneficiary[] table, bytes32 salt)` | anyone | deploys and initialises a clone at predict(salt); payable, and the value rides the CREATE2 |
| `predict(bytes32 salt)` | view | the address create would reach, before it is deployed |
| `implementation()` | view | the Distribution every clone delegates to |
| `Created(address indexed distribution, address indexed owner)` | event | a clone was deployed |
| `DeploymentFailed()` | error | the CREATE2 found code at that address — after burning the gas |
| `SaltDoesNotStartWith()` | error | the salt's top 20 bytes are not the sender |

## Verifying a deployment

The first call is the factory's own implementation; the second is a clone's runtime code, which is
solady's PUSH0 minimal proxy with that implementation's address inside it.

```
cast call <factory> "implementation()(address)" --rpc-url $RPC
cast code <clone> --rpc-url $RPC
# 0x5f5f365f5f37365f73<implementation>5af43d5f5f3e6029573d5ffd5b3d5ff3
```
