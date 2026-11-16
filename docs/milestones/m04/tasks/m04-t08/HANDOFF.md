# m04-t08 — handoff

PR: #<n> · Branch: `m04/t08-step4-vault` · 2026-11-12

Step 4's bytes are prepared, verified and committed for both chains, and `RUNBOOK.md` § Step 4 is
now the Ops-vault procedure instead of a `forge script` no engineer can run. `tools/step4-calldata.mjs`
splits each chain's `app/dist/index.html.gz` at `MAX_CHUNK = 24_000` exactly as `Chunks.s.sol:_upload`
does and emits the five calldatas in execution order; they are committed per chain, regenerate
byte-identical at the PR head, and their `bytes` arguments `cmp`-equal the payload and the widget.
The three SSTORE2 pointers are `App`'s CREATE addresses at account nonces 1–3, identical on both
chains, and all three are codeless today. The five digests per chain are computed on-chain through
`getTransactionHash` at the vault's internal `nonce()`, re-read as **2** on both chains at 14:23 CST
on the day of this handoff. **Nothing was broadcast**: the engineer holds no Ops key and asked for
none, so § For Denizen is where this stops. One thing the plan could not have: calls 4 and 5 cannot
be estimated on a chain where calls 1–3 have not landed — they revert `CodelessChunk` — so their
figures come from a forked-chain rehearsal, which is § Deviations 1 and the only red in the table.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| M04 criterion 3's chain half, both chains | **blocked** — not claimable before the forwards land | TASK.md step 7 ends in "then stop and wait", so step 8 is after Denizen's signatures. Proven *in advance* on a fork of each chain, where the five calldatas produce exactly the built bundle: Sepolia `inflated sha256 cb2e8301…99363` = `sha256sum app/dist/index.html`, `widget sha256 21dd3d13…ea24a` = `sha256sum app/dist/widget.js`, inflated 142,949 = `wc -c index.html`, widget 8,144; Base Sepolia `inflated sha256 8c235917…76ea3`, same widget hash, inflated 142,947. `cast nonce $APP` → **4** on both forks, `chunks(0|1)` and `widgetChunks(0)` equal the committed predictions. § The fork rehearsal. The live readings are step 8's. |
| The five committed calldata files per chain regenerate byte-identical (`sha256sum -c`) | pass | At head `ad7371d`, per chain: `diff -r <committed> <regenerated>` exit 0, and `sha256sum -c` prints `OK` for all five. § The five calls, per chain. |
| Files 1–3's `bytes` concatenate to the payload and the widget (`cmp` exit 0) | pass | Reading each file's ABI length word and taking exactly that many bytes from offset 68 — no signature of mine in the path: `cmp doc.bin app/dist/index.html.gz` and `cmp 3-addWidgetChunk.bin app/dist/widget.js` both exit 0, both chains. Length words read 24,000 / 21,358 / 8,144. |
| Files 4–5 decode to the pointers | pass | `cast calldata-decode 'setChunks(address[],bool)'` → `[0x0f8132D4…35D0D, 0xAf5f9504…730a0] true`; `'setWidgetChunks(address[])'` → `[0xc39C7643…aC8e]`. Identical on both chains. |
| Every upload transaction hash and `gasUsed` from `cast receipt`; step 4's `record:` rows filled; route stated | **blocked** | Nothing was broadcast. § Executed on testnets now records *why* the rows are blank and what they wait for; the route chosen is (a), stated in § Step 4 with its reason. |
| The five node estimates and block gas limit per chain recorded | **partial — 3 of 5 live per chain** | Calls 1–3 from `cast estimate --from $OWNER`: Sepolia 37,859,277 / 33,740,257 / 13,140,215; Base Sepolia 5,343,761 / 4,767,004 / 1,883,560. Calls 4–5 revert `CodelessChunk` pre-upload on the prescribed command, left red; fork figures 71,317 / 42,719. Block gas limits 199,609,569 (Sepolia, 200,000,000 earlier the same hour) and 120,000,000. Every figure is under its limit. § Gas and § Deviations 1. |
| RUNBOOK § Step 4 carries both routes in order, the `CodelessChunk` constraint, no `forge script … $SIGNER` for a public chain; `Chunks.s.sol` labelled dev-chain only | pass | `RUNBOOK.md:417-517`. Route (a) unanimous/immediate first, (b) threshold/queued second with `delay()` = 3,600 s read live; the ordering constraint stated as a measurement; `grep -c "forge script"` over `RUNBOOK.md:417-517` prints `0`; "**`scripts/forge/Chunks.s.sol` is dev-chain only**" is its own paragraph. Also names the chain-identical pointers and the calldata tool. |
| `git diff --stat origin/main -- src/ test/ .gas-snapshot` empty; `forge test` and `node --test` counts unchanged and stated; `git status --porcelain` empty | pass | The diff is empty (so `test/` is byte-identical to `main` and the counts cannot have moved). After `forge build --force`: **107** forge tests pass in 7 suites; `make test` → **102** node tests pass, 0 fail. `git status --porcelain` prints exactly one line, `?? .pr-body.md` — the PR body, written to that path on instruction and deliberately not committed, since the PR is opened by hand after review of this branch. Nothing else is untracked or modified. |
| PR closes this task's issue; § Deviations empty or each item names its runbook hunk | **see § Open questions 1** | The PR body says `Refs #185`, not `Closes #185`, because step 8 is still owed — closing it on merge would close a task with three blocked criteria. That is the reviewer's call to make, not mine, and it is one word in `.pr-body.md`. § Deviations each name their hunk. (Both appearances of the keyword in this file are inside backticks and in a file, not a PR body or a commit message, so neither can fire.) |

## Gates

Step 0's readings, both chains, taken **2026-11-12 14:12 CST** and re-read at **14:23 CST** with every
value unchanged. Each command carried an explicit `--rpc-url` and the run began with `cast chain-id`.

| reading | Sepolia (11155111) | Base Sepolia (84532) | gate |
|:--|:--|:--|:--|
| `cast chain-id` | `11155111` | `84532` | matches `$CHAIN_ID` |
| `OWNER ownerCount()` | **3** | **3** | = 3 ✓ |
| `OWNER threshold()` | **2** | **2** | = 2 ✓ |
| `OWNER nonce()` — internal | **2** | **2** | the digests' N ✓ |
| `OWNER delay()` | **3600** | **3600** | decision 44's 3,600 s ✓ |
| `forwardEnabled(OWNER)` on `0x00000000a72A…973F` | **true** | **true** | route (a) available ✓ |
| `cast nonce $APP` | **1** | **1** | = 1, so the pointers hold ✓ |
| `App.html()` | `""` | `""` | empty ✓ |
| `App.locked()` | `false` | `false` | false ✓ |
| `App.owner()` | `0x00c0e887…3790` | `0x00c0e887…3790` | the Ops vault, = `RUNBOOK.md:45` ✓ |
| `App.version()` | `"v0.1"` | `"v0.1"` | `$APP_VERSION` ✓ |
| `cast codesize $APP` | 7,155 | 7,155 | same deployment ✓ |
| block `gasLimit` | 200,000,000 → 199,609,569 | 120,000,000 | both above every estimate ✓ |

**`cast nonce $OWNER` reads 1 on both chains** and is recorded here only to show it was not used: it
is the vault's *account* nonce and would put all five digests one off. The digests use the vault's
internal `nonce()`, which is 2.

**The nonce is live and it moves if anyone transacts through the vault.** It read 2 at 14:12 and 2
again at 14:23, immediately before the digests below were finalised. If it has moved when Denizen
signs, every digest is recomputed — one re-run of the command in § For Denizen.

## The bundle, per chain

`make dapp-nodev CHAIN_ID=<id>` at `ad7371d`, the last commit on this branch that touches anything a
measurement reads — `git diff --stat ad7371d..HEAD -- tools/ app/ RUNBOOK.md docs/…/calldata/` is
empty, so every figure in this file is the head's, whatever the head is by the time it is read. That
check is the citation; a handoff cannot name its own commit. Through the devbox-pinned toolchain
(forge/cast/anvil `1.7.1-dev`, node `v24.21.0`). `app/` is unchanged since `ed0aa00`
(`git diff --stat ed0aa00..HEAD -- app/` is empty), so these are m04-t09's figures re-measured, not
quoted — and they match that handoff's § For t08 byte for byte, on both chains.

**Sepolia (11155111)** — `dapp: raw 142949 bytes · gzip 45358 bytes`

| artifact | sha256 | bytes |
|:---|:---|:---|
| `app/dist/index.html` | `cb2e83012c9d716217dcd321e3b45b7e1ce39afce93dd1bdbf95b2fb70b99363` | 142,949 |
| `app/dist/index.html.gz` | `0023521faf2ed5a61079277d8ff222b71689688a4fd162e998f41caff9428097` | 45,358 |
| `app/dist/widget.js` | `21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a` | 8,144 |

**Base Sepolia (84532)** — `dapp: raw 142947 bytes · gzip 45358 bytes`

| artifact | sha256 | bytes |
|:---|:---|:---|
| `app/dist/index.html` | `8c235917fd1f7a26ce61f07d4a41ef13450bf82b17c463910514425f12576ea3` | 142,947 |
| `app/dist/index.html.gz` | `bce7a41b4d70cccc4adaecab78ea0fa0d9e0462f7718a380435f8d60519b1a8e` | 45,358 |
| `app/dist/widget.js` | `21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a` | 8,144 |

**The chunk count, derived and not assumed:** 45,358 ÷ 24,000 = 1.8899, rounded up = **2** document
chunks of 24,000 + 21,358 bytes, and 8,144 ÷ 24,000 = 0.339 → **1** widget chunk. The gzipped size
is identical on both chains at 45,358 bytes while the raw sizes differ by two, so the split is the
same on both and only the chunk *contents* differ.

## The pointers

SSTORE2 pointers are `App`'s own CREATE addresses, so with `App` at account nonce 1 they are
`cast compute-address $APP --nonce 1|2|3`, in the order the `add*Chunk` calls execute:

| # | for | address | `cast codesize` today |
|--:|:--|:--|--:|
| 1 | document chunk 0 | `0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D` | 0 |
| 2 | document chunk 1 | `0xAf5f9504714D4D441E836ef626633553ccF730a0` | 0 |
| 3 | widget chunk | `0xc39C7643cbfFE57114A1851Af499f1781c0daC8e` | 0 |

**They are identical on both chains**, because `App` is at one address everywhere (decision 35) and
at the same nonce on both. The first matches the plan's `0x0f8132D4…35D0D` read on 2026-11-08. All
three hold no code today, which is both the gate and the reason calls 4–5 cannot be estimated yet.

The fork rehearsal confirmed them from the other direction: after the five calls, `codesize` at the
three is **24,001 / 21,359 / 8,145** — each chunk plus SSTORE2's one leading `0x00` byte, summing to
the 45,358-byte payload plus two, and the 8,144-byte widget plus one.

## The five calls, per chain

Generated by `node tools/step4-calldata.mjs --chain <id>`; regenerated at head `ad7371d` into a
scratch directory and `diff -r` byte-identical, with `sha256sum -c` `OK` on all five.

**Sepolia (11155111)**

| # | call | file sha256 | calldata bytes | `bytes` arg sha256 |
|--:|:--|:--|--:|:--|
| 1 | `addChunk(bytes)` | `3b5891a8df6660f77c81c2d6ec29f566a3cd3cf1c67236ba32fb48381bd40ba4` | 24,068 | `4d44a089…15647e` |
| 2 | `addChunk(bytes)` | `cdb5fe891727c7cb98e26d84e3e0f79acb91b95694fd90da94069da66ca06357` | 21,444 | `91def729…263535` |
| 3 | `addWidgetChunk(bytes)` | `9cf2a0c7531c705061e688dfaa53323ba97b09747f856052e54f9ccb4b6c11b3` | 8,228 | `21dd3d13…ea24a` |
| 4 | `setChunks(address[],bool)` | `0471e942f639abb9e0f9b7e85819749f7db84e274145e7a2afbb58cc6ab1cf27` | 164 | — |
| 5 | `setWidgetChunks(address[])` | `4dc7751ae41b4f3dd91a10a9a608b6fc4db2412a67637c3317870e4497f7fd03` | 100 | — |

**Base Sepolia (84532)**

| # | call | file sha256 | calldata bytes | `bytes` arg sha256 |
|--:|:--|:--|--:|:--|
| 1 | `addChunk(bytes)` | `8cee870c7c4c346744955a351927aea14c060d82ee92d0257d8522bba955691a` | 24,068 | `7394b835…a97943` |
| 2 | `addChunk(bytes)` | `1747296346efde55327ad84abb1294a7e4b3a9311f157713b35e0792eaa8fea3` | 21,444 | `b66cad3b…7df43a` |
| 3 | `addWidgetChunk(bytes)` | `9cf2a0c7531c705061e688dfaa53323ba97b09747f856052e54f9ccb4b6c11b3` | 8,228 | `21dd3d13…ea24a` |
| 4 | `setChunks(address[],bool)` | `0471e942f639abb9e0f9b7e85819749f7db84e274145e7a2afbb58cc6ab1cf27` | 164 | — |
| 5 | `setWidgetChunks(address[])` | `4dc7751ae41b4f3dd91a10a9a608b6fc4db2412a67637c3317870e4497f7fd03` | 100 | — |

**Files 3, 4 and 5 are byte-identical across the two chains** — same sha256 — because the widget
carries no chain-dependent token and the pointers are chain-identical. Only calls 1 and 2 differ.
Call 3's `bytes` argument hashes to `21dd3d13…ea24a`, which *is* `sha256sum app/dist/widget.js`:
the widget fits in one chunk, so its chunk and the file are the same bytes. Selectors, read from
the files and resolved with `cast sig` against the local ABI rather than a public registry:
`0x32ee2d4e` `addChunk(bytes)`, `0xa1b43c92` `addWidgetChunk(bytes)`, `0x10b744bf`
`setChunks(address[],bool)`, `0x66b9eeef` `setWidgetChunks(address[])`.

## Gas

From the node, with the vault as sender — `cast estimate --from $OWNER $APP $(cat <file>)`, which
`eth_estimateGas` does not sign-check. Not from a broadcast log, which files hashes under the wrong
transaction, and nothing here is inherited from an earlier run's receipt.

| # | call | Sepolia estimate | Base Sepolia estimate | fork `gasUsed` |
|--:|:--|--:|--:|--:|
| 1 | `addChunk` (24,000 B) | **37,859,277** | **5,343,761** | 5,300,538 / 5,300,526 |
| 2 | `addChunk` (21,358 B) | **33,740,257** | **4,767,004** | 4,711,210 |
| 3 | `addWidgetChunk` (8,144 B) | **13,140,215** | **1,883,560** | 1,867,571 |
| 4 | `setChunks` | *reverts pre-upload* | *reverts pre-upload* | 62,917 (est. 71,317) |
| 5 | `setWidgetChunks` | *reverts pre-upload* | *reverts pre-upload* | 36,000 (est. 42,719) |
| | block `gasLimit` | 199,609,569 | 120,000,000 | |

Every figure is comfortably under its chain's block gas limit. **`forward()`'s own overhead is
unmeasured**, as the plan requires it be stated: it cannot be estimated without valid signatures, and
it is bounded by its signature loop — three ECDSA recoveries at 3-of-3 — not by a number quoted here.

**Sepolia's 7× is real and its mechanism was measured, not assumed.** The live estimates work out to
1,558.9 gas per created code byte — solving across calls 1 and 2, then predicting call 3 at
13,141,322 against a measured 13,140,215, an error of 0.008% — while anvil and Base Sepolia both
price it at ~223 per byte. 1,558.9 ÷ 223.06 = **6.99×**, which is RUNBOOK § 1e's measured ~7×
arrived at independently. The difference is exactly proportional to created bytes, which is why it
does **not** touch calls 4 and 5: they create no code.

**`MAX_CHUNK = 24_000` is a byte budget with no gas term, and on Sepolia it is close to being a
problem.** The constant was chosen against the 24,576-byte code limit. At Sepolia's pricing one
24,000-byte chunk costs 37.9M gas — **19% of a 200M block** for a single call. It fits today, and I
checked that it is landable rather than merely estimable: scanning 25 recent Sepolia blocks, block
**12121145** carried a transaction declaring **81,965,912** gas, over twice the largest estimate
here, so there is no per-transaction cap below 82M on that chain. But if Sepolia's block gas limit
ever drops below ~38M, step 4's first call stops fitting and the chunk size has to change, not the
runbook. Stated in § Step 4 and flagged as discovery 2.

## The digests

`cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' $APP 0 $(cat <file>) <nonce>`,
with `N` = the vault's internal `nonce()` = **2**, re-read on both chains at **14:23 CST 2026-11-12**
immediately before these were finalised. Call *k* signs at nonce `N + k − 1`.

**Sepolia (11155111)**

| # | call | nonce | digest |
|--:|:--|--:|:--|
| 1 | `addChunk` 0 | 2 | `0x26b24998a6a4050a3d8c8808341bca726d4b5719348fd8126c4be341feaa188b` |
| 2 | `addChunk` 1 | 3 | `0x0352509696db461b36d73eaeee3493e3da0ef55f8d7e862119dac0d375275026` |
| 3 | `addWidgetChunk` | 4 | `0xaf293f83a61e0a7ed24850d806ba49e03f3cae9f6f7321b3f64ebf1cb7bc3c7b` |
| 4 | `setChunks` | 5 | `0xc0a7d9e892abd4047ab2c77c26eea487fedaabbff53190ee6689010c2d1a0b40` |
| 5 | `setWidgetChunks` | 6 | `0xd1efd5e4d0b83411c9332bed6d9523055e4a4a9b5e9596d3e6793279d6f75a92` |

**Base Sepolia (84532)**

| # | call | nonce | digest |
|--:|:--|--:|:--|
| 1 | `addChunk` 0 | 2 | `0x2bb9bd1c943aea5247624a86631f31aee585c992b58ee791d5e825f63676f85d` |
| 2 | `addChunk` 1 | 3 | `0x027a0bf9067e7e5f5662ccd6de4490c220c526dd44ba304ff6b42cf7e1091ac8` |
| 3 | `addWidgetChunk` | 4 | `0x38f3cbb16bcb3b864b133f357a048a6270188f2331c9f7a23c1e1954523abbf2` |
| 4 | `setChunks` | 5 | `0xd5fc399631f3e88c1cf83609da9dc481ef8e4c9df92a331289447fec2cedd78b` |
| 5 | `setWidgetChunks` | 6 | `0x99deb75bd883f29d7b9e79214017f03b5280858539ff306648ca85f6e2589578` |

**The digests differ across chains even where the calldata is byte-identical.** Calls 3, 4 and 5 have
the same bytes and the same nonce on both chains, the vault is at one address on both, and yet the
digests differ — so `getTransactionHash` binds the chain, and a Sepolia signature cannot be replayed
on Base Sepolia. Worth knowing before signing ten things that look like six.

## The fork rehearsal

Calls 4 and 5 revert `CodelessChunk` until 1–3 land, so the prescribed `cast estimate` cannot reach
them pre-upload. They were measured instead on `anvil --fork-url <RPC>` per chain, with the vault
impersonated — which also let the whole five-call sequence be proven end to end before anyone signs:

- All five succeed in the plan's order, `status 0x1`.
- `cast nonce $APP` → **4**; `chunks(0|1)` and `widgetChunks(0)` equal the three committed pointers;
  `gzipped()` → `true`; `locked()` → `false`.
- `node tools/chain-doc.mjs` against the fork: Sepolia `inflated sha256
  cb2e83012c9d716217dcd321e3b45b7e1ce39afce93dd1bdbf95b2fb70b99363`, inflated 142,949 bytes,
  `widget sha256 21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a`, 8,144 bytes —
  equal to `sha256sum`/`wc -c` of the local bundle both ways. Base Sepolia the same with
  `8c235917fd1f7a26ce61f07d4a41ef13450bf82b17c463910514425f12576ea3` and 142,947.
- Calls 4 and 5 estimated **before** 1–3 land: `0xef9230eb` — `cast sig "CodelessChunk(address)"` —
  naming `0x0f8132d4…35d0d` and `0xc39c7643…ac8e`, my own predicted pointers echoed back by the EVM.

**What this does not prove.** The fork collapses signer and owner: it impersonates the vault instead
of forwarding signatures, so it establishes *encoding and gas* and says nothing whatever about
authority. The real route needs three owner signatures through `TimelockExecutor.forward()`, and the
authority reading that matters is the live one in § Gates — `ownerCount()` 3, `forwardEnabled` true,
`App.owner()` the vault. This is the same collapse that let step 4 look rehearsed on 31337 while
being impossible on every public chain (decision 44), so it is named rather than relied on.

Its gas also needs a caveat in one direction: anvil prices code deposit at ~223 gas/byte, which
matches Base Sepolia live (fork 5,300,526 against live estimate 5,343,761, 0.8% apart) and
**under-prices Sepolia by 7×**. Calls 4 and 5 create no code, so the figure carries across; calls
1–3's authoritative numbers are the live estimates in § Gas, and the fork column is there only to
show the two instruments agreeing where they should and disagreeing where § 1e says they must.

## For Denizen — step 4

**What you sign, and nothing else.** Two blocks, Sepolia first. Each is five plain calls to `App` at
`0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` with `value = 0`, signed by **all three** Ops owners and
routed by the dapp to `TimelockExecutor.forward()` — route (a), immediate, no queue. No `batch`, no
vault self-call, nothing under `src/`, no `lock()`, no `setVersion`.

Before the first signature, re-read the nonce — if it is not 2, stop and tell me, and every digest
below is recomputed by one command:

```sh
export RPC=<chain's url>; cast chain-id --rpc-url "$RPC"
cast call 0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790 "nonce()(uint32)" --rpc-url "$RPC"   # expect 2
```

Not `cast nonce` on the vault — that reads 1, and signing against it makes all five digests wrong.

The five must execute **in this order**, and **no other vault transaction may land between them**:
each signature covers the vault's *current* nonce, and `setChunks`/`setWidgetChunks` revert
`CodelessChunk` if their chunks are not on chain yet.

### Sepolia (11155111) · vault nonce 2

| # | call | nonce | calldata file (under `docs/milestones/m04/tasks/m04-t08/calldata/11155111/`) | digest to sign |
|--:|:--|--:|:--|:--|
| 1 | `addChunk(bytes)` doc 0 | 2 | `1-addChunk-0.hex` | `0x26b24998a6a4050a3d8c8808341bca726d4b5719348fd8126c4be341feaa188b` |
| 2 | `addChunk(bytes)` doc 1 | 3 | `2-addChunk-1.hex` | `0x0352509696db461b36d73eaeee3493e3da0ef55f8d7e862119dac0d375275026` |
| 3 | `addWidgetChunk(bytes)` | 4 | `3-addWidgetChunk.hex` | `0xaf293f83a61e0a7ed24850d806ba49e03f3cae9f6f7321b3f64ebf1cb7bc3c7b` |
| 4 | `setChunks(address[],bool)` | 5 | `4-setChunks.hex` | `0xc0a7d9e892abd4047ab2c77c26eea487fedaabbff53190ee6689010c2d1a0b40` |
| 5 | `setWidgetChunks(address[])` | 6 | `5-setWidgetChunks.hex` | `0xd1efd5e4d0b83411c9332bed6d9523055e4a4a9b5e9596d3e6793279d6f75a92` |

Gas to allow: **37.9M**, **33.7M**, **13.1M**, ~**0.07M**, ~**0.04M**, plus `forward()`'s overhead.
Sepolia's block limit is ~200M, so each fits, but call 1 is a fifth of a block — expect it to be
slow to include rather than to fail.

### Base Sepolia (84532) · vault nonce 2

| # | call | nonce | calldata file (under `…/calldata/84532/`) | digest to sign |
|--:|:--|--:|:--|:--|
| 1 | `addChunk(bytes)` doc 0 | 2 | `1-addChunk-0.hex` | `0x2bb9bd1c943aea5247624a86631f31aee585c992b58ee791d5e825f63676f85d` |
| 2 | `addChunk(bytes)` doc 1 | 3 | `2-addChunk-1.hex` | `0x027a0bf9067e7e5f5662ccd6de4490c220c526dd44ba304ff6b42cf7e1091ac8` |
| 3 | `addWidgetChunk(bytes)` | 4 | `3-addWidgetChunk.hex` | `0x38f3cbb16bcb3b864b133f357a048a6270188f2331c9f7a23c1e1954523abbf2` |
| 4 | `setChunks(address[],bool)` | 5 | `4-setChunks.hex` | `0xd5fc399631f3e88c1cf83609da9dc481ef8e4c9df92a331289447fec2cedd78b` |
| 5 | `setWidgetChunks(address[])` | 6 | `5-setWidgetChunks.hex` | `0x99deb75bd883f29d7b9e79214017f03b5280858539ff306648ca85f6e2589578` |

Gas to allow: **5.3M**, **4.8M**, **1.9M**, ~**0.07M**, ~**0.04M**, against a 120M limit.

### What to check in the dapp before each signature

- **Calls 4 and 5** — read the *decoded* call. Call 4 must show `setChunks` with exactly
  `[0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D, 0xAf5f9504714D4D441E836ef626633553ccF730a0]` and
  `true`; call 5 `setWidgetChunks` with exactly `[0xc39C7643cbfFE57114A1851Af499f1781c0daC8e]`.
  The same three addresses on both chains — that is expected, not a mix-up.
- **Calls 1–3** — the `bytes` argument is too long to read, so hash it instead. The whole calldata's
  sha256 is in § The five calls, per chain; the file in the repo is the same bytes, so
  `sha256sum docs/milestones/m04/tasks/m04-t08/calldata/<chain>/<file>` must equal the row.
  `3-addWidgetChunk.hex` is the one you can check end to end: its `bytes` argument hashes to
  `21dd3d13…ea24a`, which is `sha256sum app/dist/widget.js`.
- **The target** is `App` on every one of the ten, never the vault and never the executor.
- **Sepolia's digests are not Base Sepolia's**, even for calls 3–5 whose calldata is identical. Sign
  each chain's own.

**Then stop — the rest is mine.** When the forwards have landed, tell me and I run step 8: `cast nonce
$APP` → 4, `chain-doc` hashes and byte counts against § The bundle, the three pointers from
`chunks()`/`widgetChunks()`, and five `cast receipt` hashes and `gasUsed` into step 4's `record:`
rows. That closes M04 criterion 3's chain half, which this PR deliberately does not claim.

## Deviations from the plan

1. **Step 4's "five estimates per chain" is three live and two from a fork.** The plan prescribes
   `cast estimate --from $OWNER $APP $(cat <file>)` for each of the five. For calls 4 and 5 that
   command **reverts** before the upload — `CodelessChunk(ptr)`, `0xef9230eb`, naming the first
   predicted pointer — because the setters validate pointers that do not hold code yet. It is not a
   fixable invocation: the state the estimate needs is the state calls 1–3 create. Left red in the AC
   table rather than rewritten, per the plan's own "or a stop and a message to the architect", and
   supplemented with a forked-chain measurement (71,317 and 42,719) that is labelled as such
   everywhere it appears. The runbook hunk is § Step 4 → *Gas*, which states the estimate command,
   the unmeasured `forward()` overhead and the pricing caveat.
2. **Step 4's call order differs from `Chunks.s.sol`'s, as the plan specifies.** The script uploads
   the document chunks, calls `setChunks`, then the widget chunk and `setWidgetChunks`; the plan's
   order is both document chunks, the widget chunk, then both setters. The plan's order is what is
   committed and what the pointers assume — `App` nonces 1, 2, 3 are doc 0, doc 1, widget. Both
   orders satisfy `_requireChunk`; noted only because the dev-chain gas table in § Step 4, rehearsed
   on 31337 lists the script's order and a reviewer comparing the two tables will see five calls in
   two sequences. Runbook hunk: § Step 4 → *The five calls, and their order*.
3. **Step 8 is not in this PR.** The plan's step 7 ends "**Then stop and wait**", so steps 8 and the
   `record:` rows are after Denizen's signatures and cannot be in the same branch state. Recorded in
   § Executed on testnets as a paragraph saying what the blank rows wait for, so the runbook does not
   read as though step 4 silently never happened. Runbook hunk: § Executed on testnets, the
   "prepared and not yet executed" paragraph.

## Decisions

- **`cast calldata` encodes, not a hand-rolled encoder**, the same way `tools/abi-vectors.sh`
  generates the ABI codec's fixtures: the oracle is never the thing under test. The tool shells out
  to `cast` and is therefore only reproducible through `devbox run --`, which every command in this
  task used anyway.
- **The `cmp` check reads each file's ABI length word directly** rather than trusting
  `cast calldata-decode` under a signature I supplied. A decode under my own signature proves the
  round trip, not the encoding; taking the length word at offset 36 and the payload at offset 68
  tests the bytes a contract would see. Both were run; the offset arithmetic is the one quoted.
- **The fork rehearsal is reported with what it cannot show.** A dev-chain rehearsal is what hid this
  task's existence for a milestone, so the rehearsal section leads with the collapse of signer and
  owner and keeps the authority readings separate and live.
- **`FEATURED_SALT` was left at the prescribed default** — see § Open questions 2. The plan
  prescribes `make dapp-nodev CHAIN_ID=$CHAIN_ID` and nothing else, which takes `mk/15-seed.mk`'s
  default, so that is what was built, measured and encoded. Choosing a different one is a bundle
  change, which is this task's § Out of scope.

## Discoveries

1. **`getTransactionHash` binds the chain.** Calls 3–5 are byte-identical on both chains at the same
   nonce against a vault at one address, and their digests still differ — so there is no cross-chain
   replay of an Ops signature, and the two signing blocks are genuinely ten signatures and not six.
   Worth a line in the handbook's multisig doc if it does not already say so.
2. **`MAX_CHUNK = 24_000` has no gas term, and Sepolia charges ~7× for code deposit.** One chunk
   costs 37.9M gas there, 19% of a 200M block. It fits, and nothing on that chain caps a transaction
   below 82M (block 12121145 carries an 81,965,912-gas transaction), so this is a headroom
   observation and not a blocker — but the constant is sized against a *byte* limit and a block-limit
   reduction on Sepolia would break step 4 without touching a line of code. Not fixed here.
3. **anvil under-prices Sepolia code deposit by 7× while matching Base Sepolia to 0.8%.** Any gas
   figure for Sepolia taken from a fork or a dev chain is wrong by that factor, which is a trap for
   future work that rehearses before measuring. The ratio was derived from live readings alone
   (1,558.9 against 223.06 gas per created byte) and predicts the third live estimate to 0.008%.
4. **`cast estimate` has no state-override flag in forge 1.7.1-dev**, so there is no way to estimate
   a call whose precondition is another call's effect without a fork. Relevant to any future task
   that wants a pre-upload gas figure for a dependent call.
5. **The dev-chain gas table in § Step 4, rehearsed on 31337 is in `Chunks.s.sol`'s call order**, not
   the vault procedure's. Harmless, but the two orders sit three screens apart in one document.

## Open questions

1. **Should this PR carry a closing keyword for issue #185, when step 8 is still owed?**
   (Deliberately not written as the keyword itself anywhere in this file.)
   - *Close it.* The task's AC says the PR closes its issue, and the preparation is complete; step 8
     lands as a follow-up commit or a second PR. Cost: an issue marked done with three blocked
     criteria, and M04 criterion 3 tracked nowhere.
   - *Refs only, close after step 8.* The issue stays open across Denizen's signing, and whoever runs
     step 8 pushes to the same branch or a second PR that closes it. Cost: a merged PR with an open
     issue, which the handbook's loop does not otherwise produce.
   - **Recommendation: refs only.** Step 8 is the half that closes M04 criterion 3, and an issue is
     the only thing tracking it.
   - Default if nobody rules: `.pr-body.md` says `Refs #185`, so merging closes nothing. One word
     changes it.
   - Blocks: nothing in this PR. Recorded wherever the architect rules it.
2. **Which `FEATURED_SALT` should a public testnet bundle feature?** m04-t09 raised this and called
   it not its call; this task's plan does not rule it either, and its § Out of scope forbids changing
   the bundle, so the prescribed default was built.
   - *Keep the default* (`0xf39fd6e5…0001`, the anvil dev seed). Cost: on Sepolia and Base Sepolia
     `predict(salt)` is an address with no distribution, so the landing page's featured panel has
     nothing to mount. Cosmetic, and the page reads it once at boot (`app/src/index.html:498-513`).
   - *Mine or pick a real testnet distribution and rebuild.* Cost: new `index.html` hashes, so
     m04-t09's § For t08 table and these ten calldatas are all regenerated — and if it is decided
     after the upload, it is a second upload through this same vault procedure.
   - **Recommendation: keep the default for this upload** and raise the featured panel as its own
     issue against t05's UAT, which is where an empty panel will actually be seen.
   - Default if nobody rules: the default salt, already built and encoded here.
   - Blocks: nothing before signing — but it is **much** cheaper to rule before Denizen signs than
     after, since a bundle change invalidates all ten digests.

## For t04

Both gateway URLs and the hashes t04 measures against are unchanged from m04-t03's handoff; what
t08 adds is that the chain will serve these exact bytes once the forwards land:

- **Sepolia (11155111)**: `inflated sha256` will be
  `cb2e83012c9d716217dcd321e3b45b7e1ce39afce93dd1bdbf95b2fb70b99363` (142,949 bytes),
  `widget sha256` `21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a` (8,144).
- **Base Sepolia (84532)**: `inflated sha256`
  `8c235917fd1f7a26ce61f07d4a41ef13450bf82b17c463910514425f12576ea3` (142,947 bytes), same widget.

**t04 must not measure before step 8 reports.** `App.html()` is `""` on both chains today, so a
gateway check run now reads an empty document and is not evidence of anything. Both are the chain's
own `dapp-nodev` build, so they differ by `__CHAIN_ID__` and must not be compared to each other.
