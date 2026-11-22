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
