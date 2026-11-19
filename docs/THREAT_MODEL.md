# Threat model

What the review of record assumed. Decision 55 made rake's self-review the review of record with no
paid independent leg; decision 56 is the ruling that the review has to be checkable by a reader of
the public repo rather than taken on trust. This file is the first of its three parts: it names every
actor, token class and chain the review had in mind, and beside each assumption it names **the test
that holds it** — a name `forge test --list` returns. The other two parts are `SECURITY.md`
§ Coverage (what the tests reach) and § Mutation (whether the assertions bite).

The shape is the one Pashov's solo reports open with — a § Threat Model carrying § Privileged Roles &
Actors, read in `solo/md/MoleculeVesting-security-review.md` — widened to the three axes decision 55
named, and closed with a diff against two public checklists so that what rake has *not* considered is
as readable as what it has.

**How to check it.** Every backticked test name below is in `forge test --list`:

```
grep -oE '(test_|testFuzz_|invariant_)[A-Za-z0-9_]+' docs/THREAT_MODEL.md | sort -u > /tmp/named
forge test --list | grep -oE '(test_|testFuzz_|invariant_)[A-Za-z0-9_]+' | sort -u > /tmp/have
comm -23 /tmp/named /tmp/have      # prints nothing
```

A row with no test says `none —` and why, and every such row is repeated in § Open list at the end.
That list, not this sentence, is the honest summary of what is assumed and unasserted.

## Actors

Six actors. "What it can lose" is the value at risk to that actor's own mistake or a third party's,
not to a chain-level failure — those are in § Chains.

| Actor | Can | Cannot | Can lose | Says so | Test |
|:--|:--|:--|:--|:--|:--|
| **Owner** — an EOA on the testnets, the Ops vault (2-of-3, 3,600 s timelock) on every mainnet | `propose` any self-call, `applyQueued` it after `delay`, `cancel` it, hand ownership over in two steps, renounce it outright | move the balance: there is no owner withdrawal and no pause. Every owner power is a `onlySelf` setter reached only through the queue — `setBeneficiaries`, `setDescription`, `setDelay`, `transferOwnership` | nothing of its own; it can misdirect *future* distributions by setting a bad table, which `delay` is the window to catch | decisions 50, 51; `src/Distribution.sol:274-291` | `test_onlyOwner`, `invariant_ownerOrNobody`, `test_settersOnlySelf` |
| **Owner, renouncing** | set the owner to `address(0)` immediately, clearing the queue with it | undo it, or leave a queued action alive across it | every future owner power, permanently; `distribute`, `release` and `claim` keep working | #111; `SECURITY.md` § Invariants | `test_renounceFreezes`, `test_renounceClearsQueue`, `test_renounceEmitsOwnershipTransferred` |
| **Table row (`Beneficiary`)** — including a contract that reverts on receive, one that burns the whole stipend, one that re-enters, and the distribution itself | receive its `bps` share of every `distribute`, and `claim` what was escrowed for it | block another row's payment, or take more than its share. A failed ETH push is escrowed against the row, not retried in-frame | its share only if it can neither receive within `PUSH_GAS` nor ever call `claim` | F7, F8, decision 36 | `test_escrowRevertingEthRecipientOthersPaid`, `test_reentrantRecipientIsEscrowed`, `test_selfRowRecycles`, `test_claimEthToOtherAddress` |
| **Payer** — a wallet sending with `call`, or a contract sending with `transfer`/`send` under a 2,300-gas stipend | fund the distribution at any time, before or after `init` | direct where its ETH goes; the table decides. A `transfer` from a contract succeeds only while the distribution's `receive` fits the stipend | its send reverts (not its funds) if it pays with `transfer` into a cold distribution | F7, #18; `SECURITY.md` § Findings | `test_coldReceiveFitsTheMeasuredFrame`, `test_coldReceiveFailsOneGasUnderTheMeasuredFrame`, `test_receiveUnderStipendRevertsWhenImplementationIsCold`, `test_prefundedAddressLogsReceivedAtInit` |
| **Stranger** — anyone calling `distribute`, `release`, `claim` or `cancel` | call `distribute` and `release` for anyone, freely and permissionlessly; `claim` only its own escrow; `cancel` only an action already past its grace window | `propose`, `applyQueued`, claim another account's escrow, or cancel a live queued action | gas only | decision 5's permissionless push; F5 | `test_strangerCannotCancelUnexpired`, `test_strangerCancelsExpired`, `test_nonOwnerCannotProposeOrCancel`, `test_staleActionExpires` |
| **Factory and its `create` sender** — the org-wide cold Creator key | place a distribution at a salt whose top 20 bytes are its own address, with value, at an address `predict` gives in advance | place one at another sender's salt, re-use a taken salt, or re-`init` a placed distribution | the gas of a collided `create`, which is why `create` refuses a salt already carrying code | decisions 10, 32; #22 | `test_saltFrontRunningRejected`, `testFuzz_saltPrefixMustBeSender`, `test_create2AddressStableAcrossChains`, `test_initOnlyFactoryAndOnce` |
| **`App`'s owner and `lock()`** | add and set chunk pointers and a version string while unlocked; `lock()` once, irreversibly | change a byte after `lock()`, or point a chunk at an address with no code or at a delegation designator | the dapp's mutability, by design, at the moment it locks | decision 31; F4 | `test_lock`, `test_lockCoversWidget`, `test_lockRejectsCodelessPointer`, `test_lockRejectsRealDelegation`, `test_setChunksRejectsDelegationDesignator` |

## Token classes

What `distribute(token)` is promised to do, per class of asset. `reserved[token]` is keyed by token
address, so each class is accounted separately and a bad class cannot corrupt another's books.

| Class | Promise | Assumption | Test |
|:--|:--|:--|:--|
| **ETH** (`token == address(0)`) | pushed to each row under a `PUSH_GAS` cap of 100,000; a failed push is escrowed and claimable | the cap is 23× the larger of the two reference wallets' measured need (a Safe v1.4.1 proxy at 4,029 gas, a multisig.software vault clone at 404) | `test_receiveMinimaAreUnderPushGas`, `test_realPathPaysASafeAndAVaultClone`, `test_vaultCloneDelegateCallIsReal` |
| **Plain ERC-20** | `transfer` per row, the whole remainder to the last row so nothing is stranded by rounding | a `true`-returning, non-reverting `transfer` that moves exactly the amount asked | `test_claimErc20`, `testFuzz_roundingNeverExceedsAmount`, `test_rounding_3333_3333_3334` |
| **`false`-returning and no-return (USDT-style)** | a `false` return reverts the distribution; a missing return value is accepted | return data of zero length is success, anything else must decode to `true` | `test_usdtStyleNoReturnToken` |
| **Hook tokens (ERC-777 and kin)** | the push keeps all its gas, so a hook can starve later rows in the same frame; the transient lock stops the hook re-entering `distribute`, `release` or `claim` | **documented, not capped** — decision 36 ruled F8 is a disclosure, not a gas cap | `test_hookRecipientStarvesLaterRows`, `test_hookTokenDistributeIsLocked`, `test_hookTokenReleaseIsLocked` |
| **Fee-on-transfer and rebasing** | **excluded by decision 23.** `reserved[token]` is not saturated against the balance, so a balance that falls below `reserved` reverts `distribute` for that token until it is topped up | the exclusion is what makes the invariant below hold: the property is asserted *because* the class is out of scope, not in spite of it (#19) | `invariant_balanceCoversReserved`, `invariant_reservedEqualsEscrowSum` |
| **NFTs (ERC-721/1155)** | not distributable. An ERC-721 at `token` reverts on the `transfer` selector; one moved in with `transferFrom` is accounted as a phantom escrow and cannot be split | no row can be paid an NFT, and no NFT sent in can corrupt a fungible token's books | `test_nftTransferReverts`, `test_nftViaTransferFromPhantomEscrow` |
| **ERC-1363** | out of the review's scope by decision 28 | none — nothing is asserted about it | none — decision 28 put the class outside the review, so the suite holds no property over it |

## Chains

The six chains `RUNBOOK.md` § 1 targets and its two stretch rows. Each row is a chain-level
assumption and what would falsify it on a new chain.

| Assumption | Why it matters | Falsified on a new chain by | Test |
|:--|:--|:--|:--|
| **`TSTORE`/`TLOAD` (Cancun)** — the reentrancy lock is `bool private transient locked` (`src/Distribution.sol:99`), and `foundry.toml` builds `evm_version = "cancun"` | without it the contract does not deploy, let alone lock | a chain below Cancun: the lock is a compile-time construct, so there is no runtime fallback | `invariant_lockNeverHeld`, `test_claimReentrancyLocked`, `test_applyQueuedRefusedDuringDistribute` |
| **`PUSH0` in the clone runtime** — solady's minimal proxy (`docs/REFERENCE.md:110-116`), 69 proxy bytes, keccak `0x2fa86add…f7e4989`, read identical on all eight chains | a chain that cannot execute `PUSH0` cannot run a clone at all | a pre-Shanghai chain, or one that disables `PUSH0`; `RUNBOOK.md` § 1 proves it per chain with `cast call --create` rather than reading a claimed hard-fork list | `test_vaultCloneDelegateCallIsReal` |
| **The deterministic deployer at `0x4e59b448…`** | the factory's address, and so every `predict()`, is the same on every chain only if the deployer is | a chain where that address holds no code, or refuses pre-EIP-155 transactions (decision 33's fallback) | `test_create2AddressStableAcrossChains` |
| **`block.timestamp` advances, and ~200 ms blocks on the OP Stack chains** | `delay`, `eta` and the grace window are `block.timestamp` arithmetic, not block counts, so fast blocks shorten nothing | a chain with a timestamp that can move backwards, or a sequencer that batches timestamps coarsely enough to jump a grace window | `invariant_noActionOutsideWindow`, `testFuzz_applyWindow`, `test_applyQueuedExpires` |
| **No native-balance alias token** — on OP the `LegacyERC20ETH` predeploy is such an alias (#127) | `reserved` is keyed by token address, so an ERC-20 whose `balanceOf` *is* the native balance would double-count the same value under two keys | any chain carrying a movable double-entry-point token; `RUNBOOK.md` § 1 re-runs a `transfer` assertion against it per chain **before each deploy** | none — the check is a `RUNBOOK.md` per-chain procedure against a live node, not a property a local test can hold |
| **The gas costs behind `PUSH_GAS = 100_000`** (`src/Distribution.sol:59`) | a row that cannot receive within the cap is escrowed rather than paid; repricing the cost of a `call` into a cold account moves that line | a chain with a gas schedule that makes either reference wallet's receive exceed 100,000 — or an L2 that charges differently for cold access | `test_receiveMinimaAreUnderPushGas`, `test_realPathPaysASafeAndAVaultClone`, `test_coldReceiveFitsTheMeasuredFrame` |
| **A block gas limit large enough for a full table** | `distribute` pays every row in one frame, so the table cap is what keeps a distribution executable | a chain whose block gas limit is under the measured cost of a capped table | `test_capRowsStayUnderHalfABlock`, `test_capBloatingRowsStayUnderHalfABlock`, `test_tableCapBoundary` |

## Checklist diff

Two public inputs, both pinned by commit:

- **Solodit checklist** — `Cyfrin/audit-checklist`, `checklist.json` on `main` at
  [`008855f`](https://github.com/Cyfrin/audit-checklist/commit/008855fe1798bbe75d86e6bf5f5e284b91bb2de6)
  (2025-05-05): **370 items under 62 category labels**, counted at that commit.
- **Pashov corpus** — `pashov/audits` at `master`
  [`5550be9`](https://github.com/pashov/audits/commit/5550be96af284b3cf67b9d7dbbdbeb95c2502fe8)
  (2026-11-10), two reports: `solo/md/TokenDistributor-security-review.md` (ETH in, tokens out to a
  table of recipients under an owner Safe — the nearest shape in the corpus) and
  `solo/md/MoleculeVesting-security-review.md` (owner-revocable schedules under a timelock-like
  cliff; it is also where the § Threat Model shape above comes from).

**The corpus holds no fee-splitter report.** A search of all 613 paths on 2026-11-19 for *split*,
*fee*, *distribut*, *royalt*, *revenue*, *payout*, *vest*, *stream*, *treasur*, *dividend*,
*payment*, *escrow*, *timelock*, *claim* and *airdrop* returned four: the two used here, plus
`solo/md/yHairVesting-security-review.md` and `team/md/LayerZeroZROClaim-security-review.md` (a
Merkle claim, a different shape). No closer pair was found, so the two above stand.

One row per checklist item or report finding that applies to a contract pushing ETH and ERC-20 to an
owner-set table through a timelock. Disposition is one of `held by test <name>`,
`design — decision <n>`, `F<n>`, `not applicable — <why>`, or **`open`**.

| Item | Question | Disposition |
|:--|:--|:--|
| SOL-Basics-AC-1 | Are all actors and their allowed interactions clarified? | held by this file — § Actors |
| SOL-Basics-AC-2 | Are there functions lacking proper access controls? | held by test `test_settersOnlySelf` |
| SOL-Basics-AC-3 | Do certain addresses require whitelisting? | not applicable — no allowlist; `distribute` and `release` are permissionless by design |
| SOL-Basics-AC-4 | Does the protocol allow transfer of privileges? | held by test `test_transferOwnershipIsPending` |
| SOL-Basics-AC-5 | What happens during the transfer of privileges? | held by test `test_acceptOwnershipClearsQueue` |
| SOL-Basics-AC-6 | Does the contract inherit others? | held by test `test_onlyOwner` — `App` inherits solady `Ownable`; `Distribution` implements its own two-step owner |
| SOL-Basics-AC-7 | Does the contract use `tx.origin` in validation? | not applicable — `tx.origin` appears nowhere in `src/` |
| SOL-CR-1 | What happens to user accounting in special conditions? | held by test `invariant_reservedEqualsEscrowSum` |
| SOL-CR-2 | Is there a pause mechanism? | design — decision 5: the push is permissionless and unpausable; there is no pause to abuse |
| SOL-CR-3 | Can the admin withdraw from the protocol? | design — no owner withdrawal exists; the only exit is the table |
| SOL-CR-4 | Can the admin change a critical property immediately? | held by test `test_delayZeroAppliesInline` — only when `delay` is 0, which the mainnet deploy sets to 604,800 s (decision 50) |
| SOL-CR-5 | Is any privileged setter missing events? | held by test `test_renounceEmitsOwnershipTransferred` — #111 was exactly this |
| SOL-CR-6 | How is ownership transferred? | held by test `test_acceptOwnershipByPendingOwner` |
| SOL-CR-7 | Is there proper validation in privileged setter functions? | design — decision 25. `propose` (`src/Distribution.sol:220`) validates nothing about the action it queues and a malformed action is caught only at `applyQueued`, a full `delay` later. That is the ruled behaviour and not a gap: [#54](https://github.com/dnznlabs/rake/issues/54) is **closed** (2026-10-31), decision 25 documents the shape rather than validating in `propose` or letting anyone cancel, and `SECURITY.md:446` records it as documented and not changed |
| SOL-AM-DOSA-1 | Is the withdrawal pattern followed to prevent DoS? | held by test `test_escrowRevertingEthRecipientOthersPaid` — a failed push escrows and the rest are paid |
| SOL-AM-DOSA-2 | Is a minimum transaction amount enforced? | not applicable — a zero-value `distribute` is a no-op, not a failure |
| SOL-AM-DOSA-3 | How are tokens with blacklisting handled? | design — decision 23's neighbour: a blocked row's ERC-20 `transfer` reverts the whole `distribute` for that token. Unlike ETH there is no escrow fallback for ERC-20 |
| SOL-AM-DOSA-4 | Can forcing the protocol to process a queue lead to DoS? | held by test `test_capRowsStayUnderHalfABlock` |
| SOL-AM-DOSA-5 | What happens with low-decimal tokens? | held by test `test_rounding_3333_3333_3334` — the last row takes the remainder |
| SOL-AM-DOSA-6 | Does the protocol handle external contract interactions safely? | held by test `invariant_lockNeverHeld` |
| SOL-Token-FE-1 | Are safe transfer functions used throughout? | held by test `test_usdtStyleNoReturnToken` |
| SOL-Token-FE-2 | Is there a race condition for approvals? | not applicable — the contract never calls `approve` and holds no allowances |
| SOL-Token-FE-3 | Could differing decimals cause issues? | not applicable — shares are bps of a balance, never cross-token arithmetic |
| SOL-Token-FE-4 | Whitelisting, blacklisting, or checks in the token? | see SOL-AM-DOSA-3 — same disposition |
| SOL-Token-FE-5 | Could multiple addresses for one token cause complications? | open — the OP `LegacyERC20ETH` alias case; checked per chain by `RUNBOOK.md` § 1 and not by a test. [#127](https://github.com/dnznlabs/rake/issues/127) |
| SOL-Token-FE-6 | Does the token charge a fee on transfer? | design — decision 23, excluded; `invariant_balanceCoversReserved` holds because it is excluded |
| SOL-Token-FE-7 | Can the token be ERC-777? | F8, design — decision 36: documented, not capped. Held by test `test_hookRecipientStarvesLaterRows` |
| SOL-Token-FE-8 | Does the protocol use Solmate's `safeTransferLib`? | not applicable — solady's `SafeTransferLib`, whose no-return handling is pinned by `test_usdtStyleNoReturnToken` |
| SOL-Token-FE-9 | Is there flash-mint functionality? | not applicable — no minting, no flash accounting |
| SOL-Token-FE-10 | What happens on a zero-amount transfer? | held by test `testFuzz_roundingNeverExceedsAmount` |
| SOL-Token-FE-11 | Is the token an ERC-2612 implementation? | not applicable — no permit path; the contract never spends an allowance |
| SOL-Token-FE-12 | Can the token be sent to any address? | held by test `test_tableValidation` |
| SOL-Token-FE-13 | Is there a direct approval to a non-zero value? | not applicable — no `approve` call in `src/` |
| SOL-Token-FE-14 | Is max approval used? | not applicable — same |
| SOL-Token-FE-15 | Can the token be paused? | see SOL-AM-DOSA-3 — a paused token reverts `distribute` for that token only |
| SOL-Token-FE-16 | Is `decreaseAllowance`/`transferFrom` handled correctly for the caller? | not applicable — the contract never calls `transferFrom` |
| SOL-AM-GA-1 | Is there an external function relying on state others can change? | held by test `test_distributeReleaseDistributeKeepsReserved` |
| SOL-AM-GA-2 | Can operations be manipulated with precise gas limits? | F7, held by test `test_coldReceiveFailsOneGasUnderTheMeasuredFrame` — the 2,300-gas stipend boundary, asserted on both sides |
| SOL-Basics-Initialization-1 | Are important state variables initialized properly? | held by test `test_createEmitsAndInits` |
| SOL-Basics-Initialization-2 | Has the contract inherited OpenZeppelin's `Initializable`? | not applicable — a one-shot `init` guarded by the factory, not `Initializable` |
| SOL-Basics-Initialization-3 | Is there a separate initializer other than a constructor? | held by test `test_initOnlyFactoryAndOnce` — clones need one, and it is callable once, by the factory |
| SOL-LL-1 | Is there validation on the size of input data? | held by test `test_tableCapBoundary` |
| SOL-LL-2 | What happens with no matching function signature? | held by test `test_factoryRejectsEth` |
| SOL-LL-3 | Is the target address of a call checked for code? | held by test `test_lockRejectsCodelessPointer` — asserted in `App`; in `Distribution` a codeless row simply receives |
| SOL-LL-4 | Is return-data size checked when calling precompiled code? | held by test `test_distributeDiscardsEthReturnData` |
| SOL-LL-5 | Is there a non-zero check for the denominator? | not applicable — `BPS_TOTAL` is a non-zero constant, and the table must sum to it (`invariant_tableSumsToBps`) |
| SOL-Basics-Payment-1 | Is it possible for the receiver to revert? | held by test `test_escrowRevertingEthRecipientOthersPaid` |
| SOL-Basics-Payment-2 | Does the function take the payment amount as a parameter? | held by test `invariant_conservation` — amounts come from the balance, never from a caller parameter |
| SOL-Basics-Payment-3 | Are there force-feeding vulnerabilities? | held by test `test_prefundedAddressLogsReceivedAtInit` — a pre-funded address is expected, not a surprise |
| SOL-Basics-Payment-4 | What is the minimum deposit/withdrawal amount? | not applicable — none; see SOL-AM-DOSA-2 |
| SOL-Basics-Payment-5 | How is withdrawal handled? | held by test `test_claimEthToOtherAddress` |
| SOL-Basics-Payment-6 | Is `transfer()` or `send()` used for sending ETH? | held by test `test_receiveMinimaAreUnderPushGas` — neither: a `call` under an explicit `PUSH_GAS` cap |
| SOL-Basics-Payment-7 | Can native ETH be locked in the contract? | held by test `test_selfRowRecycles` — the distribution as its own row recycles rather than stranding |
| SOL-AM-ReentrancyAttack-1 | Can a view function return a stale value during interaction? | open — `snapshot()` and `beneficiaries()` are readable mid-`distribute` by a hook token's callback, and no test asserts what they return in that frame. [#293](https://github.com/dnznlabs/rake/issues/293) |
| SOL-AM-ReentrancyAttack-2 | Is there a state change after an external interaction? | held by test `test_reentrantRecipientIsEscrowed` |
| SOL-Timelock-1 | Are timelocks implemented for important changes? | held by test `testFuzz_applyWindow` |
| MoleculeVesting [M-01] | `revoke` incompatible with block-list tokens | see SOL-AM-DOSA-3 — rake has no `revoke`, and the block-list consequence is the same |
| MoleculeVesting [M-02] | Insufficient input validation in `createVestingSchedule` | design — decision 25, for `propose`: the same shape as SOL-CR-7, and [#54](https://github.com/dnznlabs/rake/issues/54) is closed by that ruling. Held by test `test_tableValidation` for `create`, which is the validated half |
| MoleculeVesting [M-03] | Contract can receive ETH but has no withdraw function | held by test `test_claimEthToSelfUncapped` — ETH arriving outside a table share is distributable, not stuck |
| MoleculeVesting [M-04] | Users cannot claim while the contract is paused | not applicable — no pause exists (SOL-CR-2) |
| MoleculeVesting [L-01] | Limit the max size of the schedule array | held by test `test_tableCapBoundary` |
| MoleculeVesting [L-02] | Modifier does not revert for a non-existent id | held by test `test_cancelThenApplyReverts` |
| TokenDistributor [L-01] | Insufficient input validation | design — decision 25. The same finding as SOL-CR-7 and MoleculeVesting [M-02], reached from the corpus report nearest rake's shape; [#54](https://github.com/dnznlabs/rake/issues/54) is closed by that ruling |

## Open list

Everything above that is assumed and not asserted. **Two rows** of § Checklist diff are
dispositioned open and they name **two distinct findings**, each with an issue carried against it.
**Two further rows** are dispositioned with no test, one in § Token classes and one in § Chains;
neither is a § Actors row, so every actor above carries a test. Nothing here is a `src/` change,
per decision 56.

**What left this list at review.** The `propose` validation gap — reached three times over, once
from the Solodit checklist (SOL-CR-7) and once from each Pashov report ([M-02], [L-01]) — was
dispositioned `open` against [#54](https://github.com/dnznlabs/rake/issues/54). That issue is
**closed** (2026-10-31) by **decision 25**, which ruled the shape documented rather than validated
in `propose` or cancellable (`docs/ROADMAP.md:316-320`, and `SECURITY.md:446` records it as
documented and not changed). Behaviour a ruling put outside the code is `design`, not `open`, so all
three rows now read `design — decision 25` and the finding is not carried.

| What | Where | Why it is open | Carried |
|:--|:--|:--|:--|
| A token whose `balanceOf` is the native balance | SOL-Token-FE-5 | Checked per chain against a live node by `RUNBOOK.md` § 1, which no local test can stand in for | [#127](https://github.com/dnznlabs/rake/issues/127) |
| Views readable mid-`distribute` | SOL-AM-ReentrancyAttack-1 | The transient lock stops re-entry into the state-changing functions, but `snapshot()` and `beneficiaries()` are `view` and unguarded; no test pins what a hook sees | [#293](https://github.com/dnznlabs/rake/issues/293) |

The two rows that carry no test are reasons rather than gaps, and neither needs an issue:

| What | Where | Disposition |
|:--|:--|:--|
| ERC-1363 | § Token classes | `none — decision 28` put the class outside the review, so the suite holds no property over it. The reason is the ruling |
| No native-balance alias on a new chain | § Chains | `none —` a `RUNBOOK.md` per-chain procedure against a live node, not a local property. Same finding as SOL-Token-FE-5 above, so it is carried by [#127](https://github.com/dnznlabs/rake/issues/127) |
