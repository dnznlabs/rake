# m05-t02 — handoff

PR: #365 · Branch: `m05/t02-preflight` · 2026-11-22

**Part A only. Nothing was sent to any chain, and no mainnet was touched.** Every reading below comes
from the two testnets or from a local build, through the devbox pin (node v24.12.0, forge 1.7.1,
solc 0.8.38). Part B starts when this is on `main` and the balance gate reads true.

What landed: the test [#293](https://github.com/dnznlabs/rake/issues/293) asked for, the gas-limit
rule in `RUNBOOK.md` step 1e ([#308](https://github.com/dnznlabs/rake/issues/308)), § 4a's address
comparison turned from a warning into a stop ([#359](https://github.com/dnznlabs/rake/issues/359)),
and the bytecode attestation — `deployments/`, `make attest` and a weekly workflow — which has
already failed once on purpose in each direction it is meant to fail.

## Acceptance criteria

| Criterion | Reading |
|:--|:--|
| `forge test` prints 125 passed, 0 failed | **125 passed, 0 failed, 0 skipped**, 7 suites. Baseline at the branch point was **124 passed**, as the plan states |
| `forge test --list` names the #293 test | `grep -c test_viewsMidDistributeAreTheFrameAndNotTheTable` over `forge test --list` prints **1** |
| `forge snapshot --check` exits 0 | **exit 0** after `forge clean` and `forge snapshot` |
| `git diff --stat origin/main -- src/ foundry.toml` is empty | **empty** — zero lines. No contract byte changed |
| THREAT_MODEL SOL-AM-ReentrancyAttack-1 reads `held by test`, and § Open list no longer carries it | both done; § Open list's count also moved from "**Two rows**… two distinct findings" to one, with a sentence saying which row left and when |
| `RUNBOOK.md` step 1e states the rule | `grep -c 'P ÷ 1.3' RUNBOOK.md` prints **2** (both in step 1e); `grep -c 'raised explicitly'` prints **0** |
| § 4a's comparison exits 1 on a mismatch | both runs quoted in § The two runbook changes below: differing → prints and **exit 1**; equal → **exit 0** |
| `make attest` exits 0 for the two testnets | **exit 0**, six contract readings across the two chains, quoted in § The attestation |
| …and non-zero in both tampered cases | **exit 1** both times, each naming the chain and the contract; quoted in full below |
| the workflow has one green dispatched run | **not yet — deferred with cause.** `gh workflow run attest.yml --ref m05/t02-preflight` answers `HTTP 404: workflow attest.yml not found on the default branch`. A `workflow_dispatch` workflow is dispatchable only once it is on the default branch, so this is the one Part A check that cannot be met before the merge. See § Deviations |
| `make test` and CI are green | `make test` green locally; CI at this head is on the PR |

## The #293 test, and what it found

`test_viewsMidDistributeAreTheFrameAndNotTheTable` in `test/Distribution.t.sol`, with a new
`ViewReadingToken` in `test/mocks/Mocks.sol`. The vehicle is an ERC-20 whose `transfer` reads the
distributor's own views from inside the `distribute` frame and records what it saw, one entry per row.
It works because the ERC-20 push carries **no** `PUSH_GAS` cap (`src/Distribution.sol:417`) while the
ETH one does, so the callback can afford to copy a whole `snapshot()` into memory.

**The answer has two halves, and the row was open because neither had been written down.**

1. **Neither view is partially written, because `distribute` does not touch what they read.** It
   writes `escrowed`, `reserved` and token balances; `Snapshot` carries owner, delay, nonce,
   description, table and queue. So a hook sees the whole current table — no half-table, no row
   twice. Asserted by comparing `keccak256(abi.encode(...))` of both `beneficiaries()` and
   `snapshot().table` mid-frame against the same values read before the call, and again after it.
2. **The figures that *are* partially written are readable, and they are the ones that move.** Row 3
   sees `reserved(token)` already carrying row 2's escrow — **2,500** of a 10,000 distribution — and
   the contract's token balance already drained to **5,000** by row 1 alone. That is a state no
   completed call leaves behind.

**A refusing row's own observation is rolled back with its revert**, so a three-row table leaves two
observations, not three: `seen()` is **2**. That is asserted rather than remarked.

**No document is contradicted, so the step's stop condition did not fire.** `SECURITY.md` F8 now
states what is readable in that frame and why it is accepted: the values are correct for the frame,
and nothing readable there lets a row take another row's share or change what it is owed. Nothing
under `src/` was touched.

**Both load-bearing assertions were checked against a wrong expectation**, because a test that passes
the first time has not yet been shown to discriminate:

| Flipped to | Result |
|:--|:--|
| `assertEq(tk.seen(), 3)` | `FAIL: a reverting hook's own reads are rolled back with it: 2 != 3` |
| `assertEq(tk.reservedSeen(1), 0)` | `FAIL: row 3 sees row 2's escrow already reserved: 2500 != 0` |

Each was run on its own, because forge stops a test at its first failing assertion and the second
would otherwise never have been reached.

### The gas snapshot moved more than one row

The plan allows only the new test's row to differ. **It is 63 rows, and the cause is mechanical:**
adding one function to `DistributionTest` grows that contract's selector dispatch, so every function
in it pays a few more gas on entry.

- 113 fixed-gas rows compared: **63 moved**, by **17 to 94 gas** (45 of them by exactly 22, 9 by 17,
  6 by 18, one each by 19, 28 and 94).
- Exactly **one row added**: `DistributionTest:test_viewsMidDistributeAreTheFrameAndNotTheTable()`.
- **No other suite moved at all** — the diff touches `DistributionTest` rows and nothing else, which
  is what points at that contract's dispatch rather than at the measurement or the toolchain.

Recorded as a deviation rather than suppressed: the alternative would be a snapshot that no longer
matches `forge snapshot`, which `forge snapshot --check` would then fail in CI.

## The two runbook changes

**Step 1e** replaces "the broadcast needs the limit raised explicitly" — which left the operator to
judge it — with the rule, each figure carried from m05-t01's handoff § Step 13: `E` is the node's
`cast estimate --create` read on the day, `P` is the dry run's `Estimated total gas used for script`,
`-g` multiplies **`P ÷ 1.3`** rather than `P` (3,482,636 ÷ 1.3 = 2,678,951 and 2,286,547 ÷ 1.3 =
1,758,883), the limit to send is **2 × `E`** and never below **1.3 × `E`** (the node's estimate was
exceeded by the transaction itself on both Sepolia sends, by 58,514 and 99,321 gas), it must be under
half the chain's block gas limit or **stop**, and a `-32003` refusal costs nothing and may be
resubmitted **once** at 1.5 × `E`.

**§ 4a** now stops instead of warning, in step 5's Sourcify shape. Both runs, as the plan asks:

```
# APP_IN and APP differing
the document names another App than the one being uploaded to
exit=1

# the same addresses in different case
exit=0
```

The equal case deliberately uses one address in two cases, because the comparison lower-cases both
and a stop that fired on case alone would be worse than the warning it replaces.

## The attestation

`deployments/11155111.json` and `deployments/84532.json`, `tools/attest.mjs`, `make attest`
(`mk/35-attest.mk`) and `.github/workflows/attest.yml` — weekly on Mondays at 07:00 UTC and on
dispatch, `contents: read` only, no key and no secret, every read over the public endpoints in
`deploy/chains.json`.

It answers two questions that fail in opposite directions: whether the chain still holds what the
record names (`cast code`, hashed, against `codeKeccak`), and whether those bytes are what this tree
builds (`cast code` against the build artifact).

Read live on 2026-11-22; the three addresses and all three code hashes are **identical on both
chains**, which is decision 35's one-address-per-chain property showing up in the bytes:

| Contract | Address | `keccak(cast code)` |
|:--|:--|:--|
| `DistributionFactory` | `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` | `0x66d10374c73ab5c6d5046225f1612465bc64620c91d717d74788c627edc8b6c2` |
| `Distribution` (the implementation, from `implementation()`) | `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` | `0xd3399543d74c606df25df4c7501a27042c23f4f30f9b7e57311be5cb1d8caa8c` |
| `App` | `0x00a9F390A6010d045e0d34856048DdD6910d25BA` | `0x691c7120121434dadde0fb5f271aa5213f98feb90de5baacb773b9c42ee88a75` |

`commit` in both files is **`9fac8364ee2a02df783a17d0268a85e68166a144`**, the last commit on `main`
to touch `src/` or `foundry.toml`: every commit after it builds the same bytes, so that is the
earliest commit the deployed bytes are reproducible from rather than a guess at which run deployed
them.

### The implementation does not compare outright, and that is a finding

The plan has `App` and the implementation compared outright and only the factory treated specially.
**The implementation carries two immutables of its own** — `factory` and `self`,
`src/Distribution.sol:101-102` — so a flat comparison fails on a healthy deployment. The first run of
`make attest` said so:

```
attest: FAIL chain 11155111 · Distribution: the chain's code is not what this tree builds (9277 bytes against 9277)
```

Equal length, different bytes, which is the signature of an immutable rather than a different
contract. Measured: the build's `immutableReferences` are two spans, at byte **33** and byte
**4998**, 32 bytes each; on chain they hold `0x…c4ed7ea2…cb0a` (its own address) and
`0x…00d19609…7f8e` (the factory). So the comparison is now **general**: every contract is compared
outside its own spans, and each span's **value** is then checked against an address the record itself
names — three times the implementation for the factory, and the pair {implementation, factory} for
the implementation. `App` is asserted to have **zero** spans, so an immutable added to it later
cannot pass unchecked.

Checked **by value as a set rather than by position**, because a span's offset and its AST id both
move between solc builds while the two addresses do not.

### Both tampered directions

```
# an address holding no code, in a scratch copy of deployments/
attest: FAIL chain 11155111 · App: no code at 0x000000000000000000000000000000000000dEaD
attest: 1 failure(s)
exit=1

# one hex character of the saved App artifact changed
attest: FAIL chain 84532 · App: bytes 0..end: 1 byte(s) differ from what this tree builds, first at 3576
attest: 1 failure(s)
exit=1
```

The second message names the first differing byte and how many differ because the first draft said
only `bytes 0..end differ`, which reads as "everything" when it was one character — a failed
attestation has to tell its reader whether this is one immutable or a different contract.

## Deviations from the plan

1. **The gas snapshot moved 63 rows, not one.** Cause measured, not assumed: the suite's selector
   dispatch. § The #293 test has the figures.
2. **The implementation is not compared outright**, because it has two immutables. The comparison was
   generalised rather than special-cased a second time; § The attestation has the measurement.
3. **The workflow has no dispatched run yet.** `workflow_dispatch` is only dispatchable from the
   default branch — `HTTP 404: workflow attest.yml not found on the default branch` — so the green
   run follows the merge rather than preceding it. The workflow's own content is exercised by
   `make attest` passing locally under the same devbox pin, and its YAML by the `check yaml` hook.
   **This is the one acceptance criterion of Part A not met at this head, and it is met by dispatching
   immediately after the merge.**

## Discoveries

- **An ERC-20 push has no gas cap and an ETH push does** (`src/Distribution.sol:406-418`). That
  asymmetry is F8's subject, and it is also what makes #293 answerable at all: a capped callback
  could not afford to read `snapshot()`.
- **A reverting hook's reads are rolled back with it.** Obvious once stated, and it changes what a
  test can observe: the failing row's own view of the frame does not survive to be asserted.
- **Adding one test function shifts every gas row in its suite.** Worth knowing before the next task
  reads a snapshot diff and looks for a cause in the contract under test.

## Open questions

None. Part B's first gate is the balance read of step 6, and nothing in Part A is waiting on anyone.

## Part B — the gates, read before the first send

Read **2026-11-22 08:35–08:42Z** at `1d26c2d` (`main` with Part A merged), through the devbox pin, on
the § 1 endpoints: Base `https://mainnet.base.org`, Ethereum `https://ethereum-rpc.publicnode.com`.
Every gate re-read rather than carried from the 05:56Z column in the plan.

| gate | must read | Base (8453) | Ethereum (1) |
|:--|:--|:--|:--|
| `cast chain-id` | the chain's id | **8453** | **1** |
| step 1f's prediction | `FACTORY` `0x00D19609…6d7f8E`, `APP` `0x00a9F390…0d25BA` | **equal** | **equal** (one prediction, both chains) |
| `cast code` at `FACTORY`, `APP`, implementation `0xc4eD7EA2…F8cB0A`, `DISTRO` `0xB611Ff19…0F4D5199` | `0x` at all four | **`0x` at all four** | **`0x` at all four** |
| step 1c, the proxy | § 1's keccak | **69 bytes**, keccak `0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989` | **identical** |
| the native-balance check of § 1 | § 1's rows reproduced | **reproduced** — both named aliases `0x` | **not literally reproduced; see below** |
| `cast estimate --create`, factory / `App` | recorded; it is `E` | **2,396,446 / 1,666,007** | **2,396,446 / 1,666,007** |
| block `gasLimit` | recorded | **40,000,000** | **60,000,000** |
| `cast base-fee` against the stop | under the stop | **5,000,000 wei = 0.005 gwei** against 0.05 → **10× under** | **153,595,171 wei ≈ 0.154 gwei** against 1 → **6.5× under** |
| `cast balance $ENGINEER` | ≥ the two limits × twice the base fee | **0.005 ETH** against 0.000081249 needed → **61.5×** | **0.025093601 ETH** against 0.002495893 needed → **10.1×** |
| `ETHERSCAN_API_KEY` answers for the chain | `getsourcecode` `status` 1 | **1** (`WETH9` at `0x4200…0006`) | **1** (`WETH9` at `0xC02aaA39…756Cc2`) |

**The balance arithmetic, in full**, because "at least the two limits times twice the base fee" is
three multiplications and a reader should not have to redo them: the limits are 2 × `E` each, so
4,792,892 + 3,332,014 = **8,124,906 gas**; at twice Base's base fee that is 81,249,060,000,000 wei
(0.000081249 ETH) and at twice Ethereum's, 2,495,892,652,857,852 wei (0.002495893 ETH).

**No re-size is needed on [#362](https://github.com/dnznlabs/rake/issues/362).** The ask was 0.002 ETH
on Base and 0.01 ETH more on Ethereum; each chain's requirement is under **half** its ask — 0.0000812
against 0.001, and 0.0024959 against 0.005 — which is the condition the plan sets for saying so.

### One gate does not reproduce: Ethereum's native-balance row

§ 1 records Ethereum as "none — no alias has code … measured, all four aliases `0x`". Today **one of
the two addresses that section names has code on Ethereum**:
`0x471EcE3750Da237f93B8E339c536989b8978a438` (Celo's `GoldToken` address) holds **1,582 bytes**,
keccak `0x80bfbeda8c9e4f750701d422e5e03fd6ed6d94bd093a2bdb2cda22e2e1cbfa44`.

**The precondition still holds, and this is why.** Every call the check cares about reverts, on two
different arguments:

```
name()        -> execution reverted      totalSupply()           -> execution reverted
symbol()      -> execution reverted      balanceOf(engineer)     -> execution reverted
decimals()    -> execution reverted      balanceOf(0x0)          -> execution reverted
                                         transfer(engineer, 1)   -> execution reverted
```

So whatever sits there is not an ERC-20 on Ethereum: it cannot **read** the native balance, let alone
move value through it, which is the requirement F12 and the #127 ruling actually state. The probe
address carried a non-zero balance (0.025093601 ETH), so "equal" was distinguishable from "empty" —
the section's own caution.

**What is wrong is the record, not the chain.** "All four aliases `0x`" is no longer a true sentence
for Ethereum, and the section does not enumerate which four, so I checked the two it names and say so
rather than claiming a set I could not read. Reported to the architect before any Ethereum send;
Ethereum is behind step 8's stop in any case. **Base's row reproduced exactly**, so this does not gate
Base.

## Part B — Base (8453), step 2: the factory

Sent 2026-11-22 08:5xZ from the engineer's key `0x5A158aF8…bBC50d`, at `1d26c2d`'s build.

**Step 1e's rule, applied rather than quoted:** `E` = **2,396,446** (`cast estimate --create`, read on
the day), `P` = **3,482,636** (the dry run's own line), so forge's per-transaction estimate is
`P ÷ 1.3` = 2,678,951 and `G = ceil(100 × 2 × E ÷ (P ÷ 1.3))` = **179**. The limit sent was
**4,795,322** gas — above 2 × `E` (4,792,892), above 1.3 × `E` (3,115,380), and under half Base's
40,000,000 block (the three bounds the rule sets). The base fee was re-read **immediately before the
send** at **5,299,967 wei** against the 0.05 gwei stop, by a script that exits rather than sends if
the stop is reached, so the stop is mechanical and not a judgement.

| reading | value |
|:--|:--|
| transaction | **`0x07b81dcabe7b1041e800831ad460b27dfd5e589c2ba254ee71cef9b54f9d7377`** |
| status | **1** |
| block | **60,730,845** |
| `gasUsed` | **2,381,290** of the 4,795,322 limit (49.7%) |
| effective gas price | 6,333,075 wei |
| `DistributionFactory` | **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** — equal to step 1f's prediction |
| `implementation()` | **`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`** — the same implementation address as both testnets, which is what a CREATE2 from the same factory means |
| `cast code` at the factory | **1,319 bytes** |

The hash, status and `gasUsed` are `cast receipt`'s, not `run-latest.json`'s (#140); the broadcast log
was read only for the hash to ask the receipt about.

**The runtime against the artifact**, the comparison § 2 writes out: both sides **1,319 bytes**;
**60 differing bytes**; **none outside a declared span**; and each of the three spans — at bytes 274,
864 and 939 — holds `IMPL` left-padded to 32 bytes. Sixty is three times twenty, which is the
address itself: the twelve pad bytes of each span match the artifact's zeros, so only the twenty
address bytes differ per span.

## Part B — Base (8453), step 3: `App`

`E` = **1,666,007**, `P` = **2,286,547** (so `P ÷ 1.3` = 1,758,882), `G` = **190**, limit sent
**3,341,876** gas — again above 2 × `E`, above 1.3 × `E`, and under half a block. Base fee re-read
before the send at **5,758,940 wei**, under the 0.05 gwei stop.

| reading | value | required |
|:--|:--|:--|
| transaction | **`0x96a64bcb5a59f1812efd68fb952fe97f6b013876b7f5e103ba3789b82fd58b19`** | — |
| status | **1** | — |
| block | **60,731,271** | — |
| `gasUsed` | **1,655,420** of 3,341,876 (49.5%) | — |
| effective gas price | 6,746,681 wei | — |
| `App` | **`0x00a9F390A6010d045e0d34856048DdD6910d25BA`** | equal to step 1f's prediction ✓ |
| `owner()` | **`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`** | the Ops vault ✓ |
| `version()` | **`v0.1`** | `APP_VERSION` ✓ |
| `locked()` | **false** | false, and stays false ✓ |
| `chunkCount()` | **0** | 0 — step 4 is not run on any mainnet ✓ |
| `cmp` of `cast code` against `forge inspect App deployedBytecode` | **equal**, 7,154 bytes | equal outright, since `App` takes no immutables ✓ |

**Both sends landed first time: no failure, no `-32003` refusal, no retry.** Together they used
**4,036,710** gas of the 8,137,198 limits asked for, and the engineer's key went from
0.005000000 ETH to **0.004973603667288535 ETH** — **26,396,332,711,465 wei, about 0.0000264 ETH**, for
the pair. The 0.002 ETH Base ask was therefore about **76×** what the chain charged.

## Part B — Base (8453), step 5 and the record

**Sourcify — the gate — passes.** Run with `env -u ETHERSCAN_API_KEY`, for the reason § 5 gives: with
the key set, forge ignores `--verifier sourcify`, goes to Etherscan, reports `already verified` and
exits 0, so a Sourcify verification that never ran looks done.

| address | what happened | `match` read back |
|:--|:--|:--|
| `DistributionFactory` `0x00D19609…6d7f8E` | **already verified** — not this run's submission | `exact_match` |
| `Distribution` `0xc4eD7EA2…F8cB0A` | **verified by this run**, `Status: exact_match` after one pending poll | `exact_match` |
| `App` `0x00a9F390…0d25BA` | **already verified** — not this run's submission | `exact_match` |

The asserting loop printed **three `exact_match` lines and exited 0**. Which of the two each address
was is recorded above because § 5 says to: `getsourcecode` carries no verification timestamp, so a
re-run cannot tell a verification this run submitted from one that already existed.

**"Already verified" here means minutes after its own deploy, not on an earlier day**, and Sourcify's
own `verifiedAt` says so. The timeline, all 2026-11-22 UTC, each figure read rather than recalled —
block times from `cast block --field timestamp`, verification times from Sourcify's
`/v2/contract/8453/<address>`:

| | deployed | verified on Sourcify | by |
|:--|:--|:--|:--|
| `DistributionFactory` | **08:35:44Z** (block 60,730,845) | **08:38:35Z** — 2m51s later | not this run's loop |
| `App` | **08:37:09Z** (block 60,731,271) | **08:40:25Z** — 3m16s later | not this run's loop |
| `Distribution` (implementation) | inside the factory's constructor, so no transaction of its own | **08:47:37Z** | **this run**, which is also what forge reported |

So two of the three were picked up within about three minutes of their deploys by something other
than my loop — consistent with Sourcify already holding these exact bytes and metadata from the
testnets — and only the implementation was submitted here. `creationMatch` is `exact_match` for the
factory and `App` and absent for the implementation, which is what a constructor-created contract
with no creation transaction of its own should look like.

**The loop was also run against an address Sourcify cannot hold**
(`0x0000…dEaD`), which answered `null`, the reading that would exit 1. The gate therefore
discriminates rather than merely passing — which is the whole point of #207 making the shell the
judge instead of the operator's eye.

**OpenChain signatures: 82 `Duplicated:`, 0 `Imported:`** — the 82 this ABI has, all of them already
held, which is what an unchanged ABI on a new chain should print. Uploaded 2026-11-22 from the
artifacts this deployment was built from.

**`make attest` exits 0 across all three records** — nine contract readings over Sepolia, Base
Sepolia and Base. Base's code hashes are **identical to both testnets'**: factory
`0x66d10374…8b6c2`, implementation `0xd3399543…caa8c`, `App` `0x691c7120…88a75`, which is what one
CREATE2 input set means in practice.

`deployments/8453.json` carries its **own `rpc`**, and `tools/attest.mjs` now prefers that over
`deploy/chains.json`. The reason is a side effect worth avoiding: `deploy/chains.json` is the
**gateway's** chain list, so adding a mainnet to it in order to attest would change what the gateway
serves. A deployment record should carry everything needed to check it.

**The field is a convenience and not evidence, and that is enforced rather than asserted.** The chain
is asked who it is before anything is read from it, so pointing a record at the wrong endpoint fails
instead of attesting the wrong chain's bytes. Measured, with Base's record pointed at Ethereum's
endpoint in a scratch copy:

```
attest: FAIL chain 8453 · -: https://ethereum-rpc.publicnode.com answered chain id 1
attest: 1 failure(s)
exit=1
```

The workflow passes no key and reads nothing but these endpoints, mainnet and testnet alike.

`cast call $APP "chunkCount()(uint256)"` prints **0** on Base. **Step 4 was not run** and no mainnet
document exists.

### The explorer verification is submitted and queued, not done

This is the one part of step 5 still open, and the cause is on Basescan's side:

- `forge verify-contract --watch` twice returned `Error: Checking verification result failed` with
  `Verification is still pending...`.
- Submitting without `--watch` gave `Response: OK` and GUID
  **`6xw4xwzxi2dcmrtkvyxchcehcansymkj6jrvgkzd8gqxqviaiq`**, issued at about **08:44Z**, and
  `checkverifystatus` answered **`Pending in queue`** on every poll from then to **08:52Z** —
  **about eight minutes**, not the "~20 minutes" first written here. The figure is the poll loop's own
  elapsed runtime against the clock, not an impression of how long it felt; the first draft of this
  line was the impression, which is exactly the kind of number that should never be written down.
- `getsourcecode` for all three addresses still returns an **empty `ContractName`**.

So nothing is claimed as verified on the explorer. I stopped re-submitting once the API told me the
first submission was queued: a second submission only lengthens the queue, and asking the API what
became of the first is the cheaper question — which I should have asked before submitting twice.

## For the Product Owner — Base's `create`

Handed to him on [#363](https://github.com/dnznlabs/rake/issues/363) and assigned, as step 10 asks,
once step 5's Sourcify half was green. **The `create` needs only the factory**, which is deployed and
matches its prediction; the explorer row is about publishing source, not about whether the factory is
safe to call (the architect's ruling, 2026-11-22).

**The four prechecks, on Base, before the command was written:**

| check | reading |
|:--|:--|
| `predict($DNZN_SALT)` | **`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`** — the same address as both testnets |
| `cast code $DISTRO` | **`0x`** |
| simulation from `$CREATOR` | returns that address |
| simulation from any other address | reverts **`0x0c4549ef`** — the salt-prefix guard, so the Creator key is necessary and not merely conventional |
| estimate from `$CREATOR` | **480,533** gas, against the Creator's **0.001 ETH** on Base — about 350× the cost at today's base fee |

**Three forms, and which one actually works today.** He has no `cast` installed, so form 1 is
reference only. **Form 2, Basescan's Write Contract, is unavailable while the verification sits in
the queue** — there is no decoded `create` to fill in until Basescan answers — and that is said in
the issue rather than left for him to discover. **Form 3, the raw calldata, is therefore the one that
works now**: selector `0xf0f469ff`, 1,188 bytes, `0xf0f469ff00000000…0000000000000000`, to the factory with value 0.

The `table_` warning is carried over from m05-t01 and not softened: two of the three notes contain
commas, Etherscan's tuple parser has split on commas inside quoted strings before, and he is told to
**stop and say so** if the preview mangles it or the table reads as four or more rows.

**Ethereum's `create` is explicitly not in that issue** — it follows its own deploy.

## Part B — the amended native-balance gate on Ethereum

Taken 2026-11-22 09:3xZ, after #368 put the amended gate on `main`. **The control first**, as the
amendment orders, because a probe that cannot see the case it is looking for proves nothing by
missing it.

### The control: Celo mainnet, where the alias is real

| reading | value |
|:--|:--|
| `cast chain-id` | **42220** |
| `cast codesize` of `GoldToken` `0x471EcE3750Da237f93B8E339c536989b8978a438` | **2,585 bytes** |
| probe — **`0x471EcE3750Da237f93B8E339c536989b8978a438`, the token's own address**, named because the architect's control used three other funded accounts | native balance **457,156,951,045,076,936,137** wei |
| `balanceOf(probe)` | **457,156,951,045,076,936,137** — **equal to the native balance** |

So the probe fires on the case § 1 records. A clean Ethereum row below therefore means the check ran
and missed, not that it failed to run.

### Ethereum (chain 1), probe `0x5A158aF8…bBC50d` holding 25,093,601,299,726,950 wei

| alias § 1 names | address | `cast codesize` | calls |
|:--|:--|--:|:--|
| OP `LegacyERC20ETH` | `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` | **0** | none to make |
| Celo `GoldToken` | `0x471EcE3750Da237f93B8E339c536989b8978a438` | **1,582** | `name()`, `symbol()`, `decimals()`, `totalSupply()`, `balanceOf(probe)` and `transfer(probe,1)` **all revert with empty data** |
| Polygon's `0x…1010` | `0x0000000000000000000000000000000000001010` | **0** | none to make |
| `0x…0001` | `0x0000000000000000000000000000000000000001` | **0** | none to make |

**The gate holds, by the amendment's own test:** no alias address on chain 1 is a token whose
`balanceOf` answers an account's native balance, and none whose `transfer` moves it. The one that
holds code answers nothing at all — and it is **not** Celo's `GoldToken`, which is 2,585 bytes on
Celo against 1,582 here.

**The two abbreviated addresses are confirmed** by the architect on 2026-11-22 as exactly the two
read here, and § 1 now writes all four out in full so nobody has to infer them again. What follows is
kept because it records why the question arose:

**Two of the four addresses were inferred when first read, and that was flagged rather than hidden.** § 1 writes
`LegacyERC20ETH` and `GoldToken` in full but gives the other two as `0x…1010` and `0x…0001`
(`RUNBOOK.md:323`), and no full form appears anywhere in the repository. The two above are the
conventional readings of those abbreviations — Polygon's native-asset predeploy and the first
precompile slot — and both read **codesize 0**, so the gate's conclusion does not depend on which of
the plausible full forms was meant. **The architect is asked to confirm them** before this is treated
as the complete four.

## Part B — Ethereum (1), step 2: the factory

Every gate re-read on chain 1 immediately before this send, not carried from the 08:3xZ column:
chain id **1**; both predictions equal § 0's; `0x` at `FACTORY`, `IMPL`, `APP` and `DISTRO`; the proxy
**69 bytes** with § 1's keccak; block `gasLimit` **60,000,000**; `E` **2,396,446 / 1,666,007**;
balance **0.025093601 ETH** against **0.002171** needed, **11.6×**; and the alias gate re-read as § 1
now requires — `0`, **1,582**, `0`, `0`, with `balanceOf` still reverting.

`G` = **179** from the same arithmetic as Base (`P` = 3,482,636, `P ÷ 1.3` = 2,678,951, limit
**4,795,322** — above 2 × `E`, above 1.3 × `E`, under half of a 60,000,000 block). **Base fee read
immediately before the send: 126,882,335 wei ≈ 0.127 gwei**, against the **1 gwei** stop, by the same
script that exits rather than sends.

| reading | value |
|:--|:--|
| transaction | **`0x5cfd85b738dad390dfc0b43f7aa29e8883265d9b58cb3db87f14ad19dd4a8f50`** |
| status | **1** |
| block | **26,469,801** |
| `gasUsed` | **2,381,290** of 4,795,322 (49.7%) — the same figure as Base, to the gas |
| effective gas price | 118,800,946 wei |
| `DistributionFactory` | **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** — equal to step 1f's prediction |
| `implementation()` | **`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`** — the same on all four chains now |
| runtime against the artifact | **1,319 bytes** each side, **60 differing bytes**, **none outside a span**, each of the three holding `IMPL` |

The engineer's key went from 0.025093601 to **0.024810701795026610 ETH** — **282,899,700,340 wei**,
about **0.000283 ETH**, for this send.

## Part B — Ethereum (1), step 3: `App`

`P` = **2,286,547** from its own dry run, `G` = **190**, limit **3,341,876**. Base fee read
immediately before the send: **117,397,085 wei ≈ 0.117 gwei**, against the 1 gwei stop.

| reading | value | required |
|:--|:--|:--|
| transaction | **`0x37d157cc643bb26358d59e6de43bc967b5bcffd72e57d26a2ec57bdd5f8d3295`** | — |
| status | **1** | — |
| block | **26,469,806** | — |
| `gasUsed` | **1,655,420** of 3,341,876 (49.5%) | — |
| effective gas price | 123,794,910 wei | — |
| `App` | **`0x00a9F390A6010d045e0d34856048DdD6910d25BA`** | equal to step 1f's prediction ✓ |
| `owner()` | **`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`** | the Ops vault ✓ |
| `version()` | **`v0.1`** | ✓ |
| `locked()` | **false** | false, and stays false ✓ |
| `chunkCount()` | **0** | 0 — no mainnet document in this task ✓ |
| `cmp` against the artifact | **equal**, 7,154 bytes | equal outright ✓ |

**Four sends across two mainnets, every one landing first time, no refusal and no retry.** The gas is
identical per step across the two chains — 2,381,290 for each factory and 1,655,420 for each `App` —
which is what the same init code at the same optimiser settings should cost, and is worth stating
because it is also a check: a different figure would have meant different bytes.

**What the two chains cost, from the balances rather than the estimates:**

| chain | spent | at |
|:--|--:|:--|
| Base | **0.0000264 ETH** | ~0.006 gwei |
| Ethereum | **0.00048783 ETH** | ~0.12 gwei |

The engineer's key holds **0.024605769225114410 ETH** on Ethereum and **0.004973603667288535 ETH** on
Base afterwards. Ethereum's ask was 0.01 ETH, so the deploy used **under 5%** of it.

## Part B — Ethereum (1), step 5 and the record

**Sourcify — the gate — passes.** Three `exact_match`, loop exit **0**, with the key unset for the
verifies.

| address | what happened | `verifiedAt` | deployed |
|:--|:--|:--|:--|
| `DistributionFactory` | already verified | **09:38:02Z** | 09:36:59Z — **63s earlier** |
| `App` | already verified | **09:39:02Z** | 09:37:59Z — **63s earlier** |
| `Distribution` | **verified by this run**, `Status: exact_match` | **09:40:43Z** | no transaction of its own |

Same pattern as Base and recorded the same way: "already verified" means **about a minute after its
own deploy**, by something other than my loop, not on an earlier day. One difference worth noting
rather than explaining away: on chain 1 all three carry `creationMatch: exact_match`, where Base's
implementation carried none. I have not established why, and do not need to for the gate — the
`match` each returns is what the loop asserts.

**OpenChain: 82 `Duplicated:`, 0 `Imported:`** — the same unchanged ABI.

**`make attest` exits 0 across all four records** — twelve contract readings over Ethereum, Sepolia,
Base and Base Sepolia. **The three code hashes are identical on all four chains**: factory
`0x66d10374…8b6c2`, implementation `0xd3399543…caa8c`, `App` `0x691c7120…88a75`. That is the strongest
single statement in this handoff: one init-code set, four chains, same bytes everywhere, each checked
against a build of this tree rather than against each other.

### The explorer verifications are submitted and queued on both mainnets

Etherscan's v2 API serves both chains from one queue, and it is backed up:

| chain | contract | GUID | status |
|:--|:--|:--|:--|
| 8453 | factory | `6xw4xwzxi2dcmrtkvyxchcehcansymkj6jrvgkzd8gqxqviaiq` | `Pending in queue` |
| 1 | factory | `vyqncc7ethysu5igia38zpmlv2lpdiaxsqtt8gsjtpny5qrqg9` | `Pending in queue` |
| 1 | implementation | `4qe7mxxtx6lybemkrh6gz4tyyzfxl28nhxmmj86s8ce8j1jg1h` | `Pending in queue` |
| 1 | `App` | `hfnhk7c5sarhs9821ecqy3iifb2ng6anz5cw9awlh4phtbwer3` | `Pending in queue` |

Nothing is claimed verified on either explorer. **M05 criterion 2 therefore reads NOT MET at this
head**, with the GUIDs above, and it is not softened: the criterion asks for `getsourcecode` to name
the three contracts, and it does not yet. Not re-submitted — the API says the submissions are queued,
and a second one only lengthens the queue.

**One instrument note, because it nearly went into the record wrong.** My first GUID extraction took
"the last long alphanumeric run" from forge's output, which matched the **address** in the URL line
below the GUID, and `checkverifystatus` answered `Invalid GUID length`. The GUID now comes off its
own labelled line. A character-class guess is not a parser.

## For the Product Owner — Ethereum's `create`

Posted to [#363](https://github.com/dnznlabs/rake/issues/363) after Ethereum's step 5, as step 10
orders. Prechecks on chain 1: `predict` returns **`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`**, the
same address as Base and both testnets; `cast code` there is **`0x`**; the Creator's simulation returns
that address and another address reverts **`0x0c4549ef`**; the estimate is **480,533** — identical to
Base — against the Creator's **0.01 ETH**, about **170×** the cost at 0.12 gwei.

**One thing worth stating because it shortens his work: the calldata is byte-identical on both
chains.** The arguments carry no chain id, so the same 1,188-byte blob to the same factory address
creates the same distribution address on whichever network it is sent to. I compared the two strings
rather than their lengths — a `diff -q` first said they differed, which turned out to be a trailing
newline in one of the files and not a difference in the data.

Etherscan's Write Contract form is unavailable for chain 1 as well, for the same queued-verification
reason, and the `table_` comma warning is repeated with it.
