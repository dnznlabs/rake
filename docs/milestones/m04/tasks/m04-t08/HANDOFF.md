# m04-t08 — handoff

PR: #<n> · Branch: `m04/t08-step4-vault` · 2026-11-12 · **revised for the batch route 2026-11-16 on
`m04/t08-step7-propose`**

> **Revision, 2026-11-16.** The route changed under this task and the vault moved with it, so three
> sections carry live readings that supersede the ones below them: § Gates gains *Step 7's gates*
> (`ownerCount` 4, the engineer an Ops owner, internal `nonce()` 3), § The digests gains *The batch
> digest* (the ten five-call digests are dead — `addOwner` consumed nonce 2), and § For Denizen is
> rewritten as the co-signing checklist and the two hand-set `executeQueued` limits, with the
> 2026-11-12 signing tables kept below it as the record. Everything measured about the *bytes* —
> § The bundle, § The pointers, § The five calls, § Gas, § The fork rehearsal — is unchanged and
> re-verified at this head: both chains' calldata regenerates byte-identical, `batch.hex` included.

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
| M04 criterion 3's chain half, both chains | **pass** — claimed 2026-11-16 after the upload executed on both chains | ~~Blocked before the forwards landed; proven in advance on a fork of each chain (§ The fork rehearsal).~~ **Read live from both chains at 22:4xZ** after the six `executeQueued` calls: `cast nonce $APP` → **4** on both; `chunks(0)` `0x0f8132D4…5D0D`, `chunks(1)` `0xAf5f9504…30a0`, `widgetChunks(0)` `0xc39C7643…aC8e`, equal to the committed predictions and in the right slots on both; Sepolia `inflated sha256 cb2e8301…99363` = `sha256sum app/dist/index.html` with 142,949 bytes both ways, `widget sha256 21dd3d13…ea24a` = `sha256sum app/dist/widget.js` with 8,144 both ways; Base Sepolia `inflated sha256 8c235917…76ea3` with 142,947 bytes both ways, same widget hash and byte count. **Every live figure equals the fork rehearsal's prediction.** § Step 8's `record:`. |
| The five committed calldata files per chain regenerate byte-identical (`sha256sum -c`) | pass | At head `ad7371d`, per chain: `diff -r <committed> <regenerated>` exit 0, and `sha256sum -c` prints `OK` for all five. § The five calls, per chain. **Re-run at this head after the upload**, `make dapp-nodev` + `tools/step4-calldata.mjs` on both chains: `git status --porcelain` clean over `calldata/`. Only inside `devbox run` — the VM's `/usr/bin/node` deflates the same `index.html` to 45,624 bytes instead of 45,358 and rewrites two of the four files; § Step 8's verification, note 2. |
| Files 1–3's `bytes` concatenate to the payload and the widget (`cmp` exit 0) | pass | Reading each file's ABI length word and taking exactly that many bytes from offset 68 — no signature of mine in the path: `cmp doc.bin app/dist/index.html.gz` and `cmp 3-addWidgetChunk.bin app/dist/widget.js` both exit 0, both chains. Length words read 24,000 / 21,358 / 8,144. |
| Files 4–5 decode to the pointers | pass | `cast calldata-decode 'setChunks(address[],bool)'` → `[0x0f8132D4…35D0D, 0xAf5f9504…730a0] true`; `'setWidgetChunks(address[])'` → `[0xc39C7643…aC8e]`. Identical on both chains. |
| Every upload transaction hash and `gasUsed` from `cast receipt`; step 4's `record:` rows filled; route stated | **pass** | ~~Nothing was broadcast.~~ Twelve transactions now: six submits (three per chain, the product owner's) and six `executeQueued` (the engineer's), every one `status true`, with block and `gasUsed` from `cast receipt <hash> gasUsed`. RUNBOOK § Executed on testnets carries three 4c `record:` blocks and both § Record tables' step-4 rows are filled; the route is the three-proposal threshold one, stated there. |
| The five node estimates and block gas limit per chain recorded | **partial — 3 of 5 live per chain** | Calls 1–3 from `cast estimate --from $OWNER`: Sepolia 37,859,277 / 33,740,257 / 13,140,215; Base Sepolia 5,343,761 / 4,767,004 / 1,883,560. Calls 4–5 revert `CodelessChunk` pre-upload on the prescribed command, left red; fork figures 71,317 / 42,719. Block gas limits 199,609,569 (Sepolia, 200,000,000 earlier the same hour) and 120,000,000. Every figure is under its limit. § Gas and § Deviations 1. |
| RUNBOOK § Step 4 carries both routes in order, the `CodelessChunk` constraint, no `forge script … $SIGNER` for a public chain; `Chunks.s.sol` labelled dev-chain only | pass | `RUNBOOK.md:417-517`. Route (a) unanimous/immediate first, (b) threshold/queued second with `delay()` = 3,600 s read live; the ordering constraint stated as a measurement; `grep -c "forge script"` over `RUNBOOK.md:417-517` prints `0`; "**`scripts/forge/Chunks.s.sol` is dev-chain only**" is its own paragraph. Also names the chain-identical pointers and the calldata tool. |
| `git diff --stat origin/main -- src/ test/ .gas-snapshot` empty; `forge test` and `node --test` counts unchanged and stated; `git status --porcelain` empty | pass | The diff is empty (so `test/` is byte-identical to `main` and the counts cannot have moved). After `forge build --force`: **107** forge tests pass in 7 suites; `make test` → **102** node tests pass, 0 fail. `git status --porcelain` prints exactly one line, `?? .pr-body.md` — the PR body, written to that path on instruction and deliberately not committed, since the PR is opened by hand after review of this branch. Nothing else is untracked or modified. |
| PR closes this task's issue; § Deviations empty or each item names its runbook hunk | **see § Open questions 1** | The PR body says `Refs #185`, not `Closes #185`, because step 8 was still owed when it was written — closing it on merge would have closed a task with three blocked criteria. **That reason expired on 2026-11-16**: step 8 ran on this branch and no criterion is blocked now, so the keyword is the right one. Still the reviewer's call and still one word in `.pr-body.md`; § Open questions 1. § Deviations each name their hunk. (Both appearances of the keyword in this file are inside backticks and in a file, not a PR body or a commit message, so neither can fire.) |

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

### Step 7's gates, re-read 2026-11-16 (the batch route)

The vault moved between the two plans, which is why this task was replanned: an `addOwner` executed
at internal nonce 2 on both chains at **14:34Z 2026-11-16**, so `ownerCount()` is 4, the engineer's
key is an Ops owner, and the ten digests above are dead. These are the readings step 7 runs on, taken
at **15:17Z 2026-11-16** and identical on both chains, each chain's run opened with `cast chain-id`
and every command carrying an explicit `--rpc-url`:

| reading | Sepolia (11155111) | Base Sepolia (84532) | gate |
|:--|:--|:--|:--|
| `cast chain-id` | `11155111` | `84532` | matches `$CHAIN_ID` ✓ |
| `isOwner(0x5A158aF8…C50d)` | **true** | **true** | the engineer can sign ✓ |
| `ownerCount()` | **4** | **4** | was 3 ✓ |
| `threshold()` | **2** | **2** | one co-signature is the quorum ✓ |
| `delay()` | **3600** | **3600** | decision 44's 3,600 s ✓ |
| `nonce()` — internal | **3** | **3** | the batch proposal's *N* ✓ |
| `cast nonce $APP` | **1** | **1** | = 1, so the pointers still hold ✓ |
| `App.locked()` | **false** | **false** | false ✓ |
| `App.html()` | `""` | `""` | empty — nothing is uploaded yet ✓ |

Re-read at **15:19Z** in the same run: the whole batch estimates **84,773,222** on Sepolia against a
200,000,000 block limit and **12,188,581** on Base Sepolia against 120,000,000
(`cast estimate --from $OWNER $OWNER $(cat batch.hex)`). § For Denizen turns those into the two
hand-set `executeQueued` limits.

**`cast nonce $OWNER` still reads 1 on both chains** and is recorded, again, only to show it was not
used: it is the account nonce, and the digest takes the internal `nonce()`.

**The featured-distribution gate is satisfied and its follow-up carried.**
[#190](https://github.com/dnznlabs/rake/issues/190) is ruled and closed 2026-11-16: this upload ships
the committed bundle with the dev-seed featured salt, so the featured panel is empty on both testnets
until [#193](https://github.com/dnznlabs/rake/issues/193) sets the featured distribution and
re-uploads. The ruling is in #190's closing comment and in `ROADMAP.md` § Decisions; #193 is carried
in M04 and is not this task's.

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

**The ten digests below are dead, and kept as the record.** They sign five plain calls to `App` at
nonces 2–6, the route this task was first planned for. `addOwner` consumed nonce 2 on both chains on
2026-11-16, so every nonce in these two tables is wrong by one and every digest with it; the route is
now one `batch` proposal per chain, whose live digest is in § The batch digest below.

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

### The batch digest — one per chain, the live route

The proposal is the vault calling itself: target `$OWNER`, value `0`, data `batch.hex`, nonce the
live internal `nonce()`. So the digest's first argument is the **vault**, not `App` — the one
difference from the command above, and the thing that makes a proposal targeting `App` not this one:

```sh
cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' \
  $OWNER 0 "$(cat docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/batch.hex)" 3 --rpc-url "$RPC"
```

Read at **15:18Z 2026-11-16** at `nonce() = 3` on both chains, from `batch.hex` as committed at
`a1c1896` and regenerated byte-identical at this branch's head:

| chain | nonce | `sha256sum batch.hex` | digest |
|:--|--:|:--|:--|
| Sepolia (11155111) | 3 | `d9cc558b95f3f0b9c4ed4498f83446e674cf22f8d4d31447cb8fd3190409f237` | `0xc65454f8a8109bf6d337fa7b9eaa40d6f7bd8cc14b658434ae8deba6b1eabbcf` |
| Base Sepolia (84532) | 3 | `9b16ccc66a589c381f9542e04b9652005eaeb8a023270738eacddbb62ca0fd6e` | `0x9d83f01fa5f2112252749d6a6bc62b4e6d8ec63d941f0d4624b26a63e7378302` |

Both files are 109,962 characters, `0x` included. The two digests differ for the same reason the ten
above do: `getTransactionHash` binds the chain, so neither signature is replayable on the other.

**If `nonce()` is not 3 when the proposal is opened, both digests are wrong** and are recomputed by
one run of the command above. Only the nonce changes; `batch.hex` does not.

## Step 7's `record:` — Base Sepolia proposed, Sepolia stopped

Run 2026-11-16. Gates on both chains at **16:54Z**: `isOwner($ENGINEER)` `true`, `threshold()` `2`,
`nonce()` `3`, `cast nonce $APP` `1` — all four as the plan requires. `make dapp-nodev
CHAIN_ID=$CHAIN_ID` then `node tools/step4-calldata.mjs --chain $CHAIN_ID` left
`git status --porcelain` empty on both chains, so no committed file is stale.

**Base Sepolia (84532) — three proposals, one signature each (the engineer's), generated at `9fa393f`:**

| proposal | file | target | nonce | digest | proposal id |
|--:|:--|:--|--:|:--|:--|
| 1 | `1-addChunk-0.hex` | `$APP` | 3 | `0xf9996757df4ac60bbf8fad2b779c39ef7c82215390a8a12dc7bf17284706d702` | `59c0deed-a379-4663-90cf-539fa4f34e09` |
| 2 | `2-addChunk-1.hex` | `$APP` | 4 | `0xa2f30eebdcdc15eaa2ee322bf050796e72a12707b72eb4a38232fb10fa70f9a1` | `461b6148-2114-4f4c-b480-8da6f36a437b` |
| 3 | `batch345.hex` | `$OWNER` | 5 | `0xc691bc7e6ca4098f7b37ec1207fc0a7389ccead111ad762296d8758ff320f521` | `46dc9e52-67de-4796-be02-117b0f680bbd` |

Each digest equals the `cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)'`
reading for its own target and nonce, and all three match the values TASK.md recorded at `N = 3`.
Read back from the coordination service: `status proposed`, `value 0`, `threshold 2`,
`proposed_by 0x5a158af8…bc50d`, and calldata of 48,138 / 42,890 / 18,314 characters whose sha256s are
`8cee870c…5691a`, `1747296…8fea3` and `7946270a…1438f` — the committed files.

**`POST /proposals` needs `p_threshold`**, which neither the handbook's agent recipe nor § Step 4
mentions: without it the service answers `400 Invalid proposal threshold`. It must be at least the
vault's on-chain `threshold()` and at most `ownerCount()`; `2` was sent. Nothing is stored on a 400,
so the retry is the same POST with the field added.

**The signature count could not be read, and the control says so rather than the proposals.** A
reader token minted through `POST /session` returns `[]` from `signatures` for all four Base Sepolia
proposals — *including the executed nonce-2 `addOwner`, which has two by definition*. So this is read
visibility, not a missing signature: the service's cached `owners` for that vault still lists only
the three owners of its deployment block and not `$ENGINEER`, and its cached `nonce` is `2` where the
chain says `3`. The chain is what the vault enforces, and the service read it — it accepted all three
proposals, which it does only after `isOwner` at the current block.

**Sepolia (11155111) — not proposed; step 7 stopped there.** Nonces 3 and 4 already carry live
proposals from `0x357836ff…902b` (the product owner's smart account), opened 2026-11-16 00:21Z and
00:26Z, before the three-proposal route was ruled:

| nonce | target | what it is | status |
|--:|:--|:--|:--|
| 3 | `$APP` | calldata byte-identical to `2-addChunk-1.hex` — sha256 `cdb5fe89…06357`, 42,890 chars, digest `0x03525096…275026` | proposed |
| 4 | `$OWNER` | `addOwner($ENGINEER)` — a second one; nonce 2 already executed it on both chains | proposed |

The nonce-3 proposal is **document chunk 1 at the nonce chunk 0 must occupy**. That is the misorder
4c calls silent: `_requireChunk` checks code and a `0x00` first byte and nothing about contents, so
nothing reverts and `App` serves the two gzip halves swapped. Proposing call 1 at nonce 3 as the plan
prescribes would leave two `addChunk` proposals at one nonce and make which bytes land a property of
which one gets the second signature first. Not the engineer's call to cancel: the proposer is the
product owner. Escalated; Sepolia's row above waited on the answer.

### Amended 2026-11-16 — the stop's premise was wrong, twice over

**Both corrections are mine, and both were measurement, not argument.**

**1. `cancelQueued` was the wrong instrument.** It applies to *queued* transactions. Neither hidden
row is queued: `queued(0x03525096…275026)` and `queued(0x80aaf81a…3342a)` both return `0` on the
vault. They exist only in the coordination service, so removing them is a service-side prune, not an
on-chain cancel — no gas, no threshold, no co-signer.

**2. They carry no signature, which is why they are invisible.** First reported here as the
signatures-not-public read limit; that was wrong. The embed *is* readable to anon and is genuinely
empty on Sepolia. Using the dapp's own query (`tx_summary` with `signatures(signer,sig_type)`, anon)
as a paired control:

| chain | nonce | `sig_count` | embedded `signatures` | shown in dapp |
|:--|--:|--:|:--|:--|
| Base Sepolia 84532 | 3, 4, 5 | 0 | one `ecdsa` row each, signer `0x5a158af8…bc50d` | yes, three rows |
| Sepolia 11155111 | 3, 4 | 0 | `[]` | **no — zero rows** |

The dapp hides any proposal with no valid owner signature that the chain does not hold queued, with
only a `console.warn`; its user-facing notice is gated on the signatures being *unreadable*, which is
not this case, so the rows disappear with no explanation. `sig_count` reads `0` on every `proposed`
row on both chains, so that column discriminates nothing — **the embedded rows are the signal, and a
column that reads the same for a signed and an unsigned proposal is the trap this walked into.** A
duplicate-nonce rendering theory was raised and rejected: one mainnet vault carries four
duplicate-nonce rows and renders.

**Consequence: the hidden pair never contested nonce 3.** Unsigned, not queued, and unsignable
through the dapp because it is not displayed. Sepolia is proposable.

**The residual hazard is nonce-bounded and self-closing.** `execute()` requires every signature slot
— ECDSA-recovered or the `v == 0` approval form — to resolve to an address in the vault's own owner
mapping, so a signature gathered from a non-owner is worthless at execution. And the digest is
nonce-bound: `getTransactionHash` puts `nonce` inside the EIP-712 `Execute` struct hash and
`execute()` hashes against the live counter it increments, never a caller-supplied nonce
(`Multisig.sol` at `e767b88`, lines 85 and 136–137). So the hidden nonce-3 row is executable **only
while Sepolia's `nonce()` is exactly 3**: proposal 1 executing there kills its digest permanently,
and proposal 2 at nonce 4 does the same to the duplicate `addOwner`. Real inside that window, not an
open door, and an argument for proposing sooner rather than pruning first.

**Pruning the pair is a follow-on, not a gate**, and it needs the proposer's own address. It is
housekeeping rather than safety — after the nonces move it protects nothing — and it stays on the
list for the reason that outlives the nonce: a phantom row an owner can neither see nor act on is a
trust cost in the dapp every time a key is used on that chain.

### Sepolia's three, proposed 2026-11-16 21:10Z

On the product owner's go. Gates re-read immediately before proposing, not inherited from the
16:54Z reading: `isOwner($ENGINEER)` `true`, `threshold()` `2`, `nonce()` **`3`**, `delay()` `3600`,
`cast nonce $APP` `1`. `nonce()` unmoved is what lets TASK.md's *N* = 3 digests stand; had it moved,
all three would have been recomputed. `make dapp-nodev CHAIN_ID=11155111` then
`node tools/step4-calldata.mjs --chain 11155111` left `git status --porcelain` empty — every
committed file regenerated byte-identical, pointers `0x0f8132D4…5D0D`, `0xAf5f9504…30a0`,
`0xc39C7643…aC8e`, payload 45,358 bytes → 24,000 + 21,358, widget 8,144 bytes under its 10,240 gate.

Each digest was recomputed from the chain with
`getTransactionHash(<target>, 0, <file>, <nonce>)` and compared to TASK.md **before** signing; all
three matched. Signatures are `cast wallet sign --no-hash`, verified back to
`0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d` with `cast wallet verify --no-hash` — note that form is
**positional** on the pinned `cast 1.8.1`, not `--signature <sig>`.

| proposal | file | target | nonce | digest | proposal id |
|--:|:--|:--|--:|:--|:--|
| 1 | `1-addChunk-0.hex` | `$APP` | 3 | `0xe73c3f13c1b2f66f1d15e53a1cc2cefcd6da67b41599f1273d31e359caca326d` | `62b53064-2768-4da3-adf0-0df130d02b17` |
| 2 | `2-addChunk-1.hex` | `$APP` | 4 | `0xc1e9b846b07a3c73ad80c4f168c7972b78e0d239342dc530ebe4668fa2d4bc47` | `3ad0d25f-a8d5-477f-9b7e-c01e5eae50b7` |
| 3 | `batch345.hex` | `$OWNER` | 5 | `0x7d2d3128a3e3ee78c30a10c2e7e2834c9031d57c1c466c9900c91fa8e256c0f5` | `6760a9a5-df96-47b8-a659-5cbe2f45d664` |

**Verified by read-back through the dapp's own query**, not by the POST's 200: each row carries
exactly one `ecdsa` signature from `0x5a158af8…bc50d`, `value 0`, `threshold 2`, calldata
byte-identical to the committed file (sha256 `3b5891a8…`, `cdb5fe89…`, `7946270a…`) and a
`tx_hash` equal to TASK.md's digest. The same read returns five rows for that vault; the two
unsigned ones are still the only hidden pair, so the product owner sees exactly three signable rows.
`p_threshold` was sent as `2` — without it the service answers `400 Invalid proposal threshold`.

### The submits — Base Sepolia is queued, nothing has executed (superseded the same day)

**Superseded 2026-11-16 22:23Z**, when all six `executeQueued` calls landed: § Step 8's `record:`.
The submit rows below are kept as the queue's record.

Submitted by the product owner 2026-11-16 (before Sepolia was proposed). Vault `nonce()` moved
`3 → 6` and `queued()` is nonzero for all three digests; `cast nonce $APP` is still `1`, so nothing
has reached `App`.

| proposal | nonce | submit tx | block | `gasUsed` | ETA |
|--:|--:|:--|--:|--:|:--|
| 1 | 3 | `0x2425762d26dafd86d303beea53e4bd4e64391f88ed5b96d84901702e30630e2f` | 59706961 | 1,984,890 | `1794866861` · 22:07:41Z |
| 2 | 4 | `0x913236ed909b8ca76df1ff2d082f714c1a15f00aaddc96864826a418e2f64feb` | 59707098 | 1,773,830 | `1794866888` · 22:08:08Z |
| 3 | 5 | `0x24b889609e17fc7ad11c8a09afee1d7036848ba9c1c19d5c7745bdc71b983b8a` | 59707756 | 748,940 | `1794867020` · 22:10:20Z |

**The submits were relayed, which the `record:` rows would otherwise misattribute.** Each `from` is a
different EOA — `0xB42F812A…EAD6`, `0xB01caEa8…9C2E`, `0xC066ac5D…8B8c` — and each `to` is
`0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`, neither the vault nor the product owner's account.
With both signature slots ECDSA the vault never reads `msg.sender`, so a relayer is immaterial to
validity; it is only material to anyone reading the `from` as the signer. The three queued digests
were confirmed against `queued()` on the vault, so the outcome is established on chain independently
of who sent it.

**Deviation from the plan's measurement command:** TASK.md prescribes
`cast receipt <hash> --field gasUsed`, which errors on the pinned `cast 1.8.1` — the field is
positional (`cast receipt <hash> gasUsed`). Every figure above is the positional form's output.

~~`executeQueued` has not run on either chain and must go in nonce order: 1, then 2, then the batch
(4c). Step 8's verification — `chain-doc` hashes and the three pointers read from the chain — waits
on it.~~ All six ran the same day, in that order; § Step 8's `record:` below.

### Sepolia's three submits, read from the chain

Not recorded when they were sent. Recovered afterwards from the vault's own
`Queued(bytes32,uint256,uint256)` logs — `cast logs --address $OWNER <topic0> <digest>` for each of
the three digests, topic0 `0x51c73878…6fdcf39` — which is a stronger source than the service: the
event is emitted by `execute()` on the vault itself.

| proposal | nonce | submit tx | block | `gasUsed` | ETA |
|--:|--:|:--|--:|--:|:--|
| 1 | 3 | `0xfa83fb4c8bccf54aaaa640f7aa80afeb739369102cef85c4aa1c1a2f1d1df627` | 12149932 | 1,651,608 | `1794867504` · 22:18:24Z |
| 2 | 4 | `0xec93f725db2d8d362ab0d61ad21597f7d3bd581fc71a2358cf2d40a7a1400924` | 12149934 | 1,483,672 | `1794867528` · 22:18:48Z |
| 3 | 5 | `0x9005224aa5bcf9af5f0e6d2882d1268f7c6dcf100b6155a59b33d6912fffed8d` | 12149936 | 697,240 | `1794867552` · 22:19:12Z |

All three `status true`. **Sepolia's submits were not relayed the way Base Sepolia's were:** each
`from` is the product owner's own account `0x357836fFcB45307FA7ff2A574F505753c961902B`, with the same
`to` of `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`. So the relay contract is constant across both
chains and the sending EOA is not — which is the point the Base Sepolia note makes in reverse, and
the reason `from` is not a signer attribution on either.

## Step 8's `record:` — the six `executeQueued` calls, both chains

Sent by the engineer 2026-11-16, Base Sepolia **22:21:22–22:21:41Z** and Sepolia
**22:22:12–22:23:24Z** by block timestamp, on the product owner's explicit go of 21:35Z, after every
ETA had passed. **Pre-send gates, re-read on both chains at 22:20Z:** all six
digests recomputed from the chain with `getTransactionHash` and matched TASK.md's table exactly,
`queued()` nonzero for all six, every ETA in the past, vault `nonce()` `6`, and `cast nonce $APP`
**`1`** on both — so nothing had run and the whole upload was still ahead.

| chain | order | nonce | file | target | `executeQueued` tx | block | `gasUsed` | estimate |
|:--|--:|--:|:--|:--|:--|--:|--:|--:|
| Base Sepolia | 1 | 3 | `1-addChunk-0.hex` | `$APP` | `0x542f24c8bff7a15c91f3b9a067472bd5c8a60a5e0f37cf6c9f01d0417e0a0154` | 59729067 | 5,330,923 | 5,555,812 |
| Base Sepolia | 2 | 4 | `2-addChunk-1.hex` | `$APP` | `0xaaaa14162deb7d56a8cdbc50a71a03366d4f4d62d22004e783fe1738ae7c12bf` | 59729117 | 4,739,420 | 4,961,962 |
| Base Sepolia | 3 | 5 | `batch345.hex` | `$OWNER` | `0x6fba77ffcc25d2d7a37180b5e19ce40d99436afa4eff96f797ac69281caee533` | 59729165 | 1,939,537 | 2,085,800 |
| Sepolia | 1 | 3 | `1-addChunk-0.hex` | `$APP` | `0x7d902b542d993503245d4156847f2dc3f27c0f55d23f33a3d03848f3992e44fb` | 12150245 | 37,591,595 | 38,202,423 |
| Sepolia | 2 | 4 | `2-addChunk-1.hex` | `$APP` | `0xeff1ea245e51e77ce07f51953615412517dd47e9612caff43aa9d3e921555d20` | 12150247 | 33,404,902 | 34,214,503 |
| Sepolia | 3 | 5 | `batch345.hex` | `$OWNER` | `0x08a15c2649adc1c4051d6e4ff4f9a27233c6227d69831941b6d86cc5ef78805a` | 12150251 | 13,197,961 | 14,043,126 |

All six `status true`. Every figure is `cast receipt <hash> gasUsed` in the positional form (the
`--field` spelling errors on `cast 1.8.1`, as the submit note above says).

**The order gate was read between every send, not assumed.** `cast nonce $APP` returned `1` before
order 1, `2` before order 2, `3` before order 3, and `4` after the batch, on each chain separately —
the table of 4c, walked. The silent misorder 4c names (piece 2 before piece 1, which does not revert)
was therefore never possible, and the `inflated sha256` equality below closes it independently.

**The hand-set gas limits were not used, and the plan's reason for them did not hold.** TASK.md
prescribes three figures per chain because a wallet's estimate through a public RPC may report a
false `DeploymentFailed()`. `cast estimate --from` the signer against the same public RPCs returned a
clean figure for every one of the six, within 2% of the gas actually used in all six cases; the
limits sent were those estimates with 30% headroom (`--gas-limit`, 1.3×, and 8,400,000 / 7,500,000 /
3,200,000 on Base Sepolia). The batch could not be estimated before its chunks landed, exactly as the
plan says — it was estimated after order 2 each time. **So the plan's figures were a correct
precaution and not a necessity on these two RPCs**, and the estimate-then-send route is the cheaper
one to recommend for M05's mirror; the false-`DeploymentFailed()` hazard is a wallet-path
observation, not an `eth_estimateGas` one.

**Base Sepolia costs about 7× less gas for the identical calldata**, which is worth stating because
it inverts the usual direction: 12,009,880 gas across the three against Sepolia's 84,194,458, for
byte-identical inputs. Same pattern as m04-t03's step 2/3 figures (§ Executed on testnets, *Base fees
and what the chains charged*) — Sepolia prices contract creation far above the cancun schedule and
Base Sepolia at roughly 1.05× — and the three `addChunk`/`addWidgetChunk` CREATEs are what this
upload is. **M05 must re-read it per mainnet.**

### Step 8's verification, per chain

`make dapp-nodev CHAIN_ID=$CHAIN_ID` then `make chain-doc CHAIN_ID=$CHAIN_ID RPC="$RPC"`, against
`sha256sum app/dist/index.html app/dist/widget.js`, at commit `f08f2bc`, **all of it inside `devbox
run`** — see the note below, which is not optional advice.

| | Sepolia (11155111) | Base Sepolia (84532) |
|:--|:--|:--|
| `cast nonce $APP` | `4` | `4` |
| `chunks(0)` | `0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D` | same |
| `chunks(1)` | `0xAf5f9504714D4D441E836ef626633553ccF730a0` | same |
| `widgetChunks(0)` | `0xc39C7643cbfFE57114A1851Af499f1781c0daC8e` | same |
| `html()` bytes · sha256 | 61,157 · `d5ec53f13207805b034058032091a190fda9e8c15a23c5ebffafe7c92933a4fc` | 61,157 · `141bf19df9ba7db0c12c28d2359021958ec725da3baf3cc7b3a92e45b65952d0` |
| payload bytes | 45,358 | 45,358 |
| `inflated bytes` | 142,949 | 142,947 |
| `inflated sha256` | `cb2e83012c9d716217dcd321e3b45b7e1ce39afce93dd1bdbf95b2fb70b99363` | `8c235917fd1f7a26ce61f07d4a41ef13450bf82b17c463910514425f12576ea3` |
| `sha256sum app/dist/index.html` | **equal** · 142,949 bytes | **equal** · 142,947 bytes |
| `widget` status · bytes · sha256 | 200 · 8,144 · `21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a` | 200 · 8,144 · same |
| `sha256sum app/dist/widget.js` | **equal** · 8,144 bytes | **equal** · 8,144 bytes |

All three pointers equal the predictions of § The pointers, **in the right slots**, on both chains.
The `inflated sha256` equality is the check that proves the halves are not swapped: a swap leaves
both pointers holding valid SSTORE2 chunks and `_requireChunk` passing, and shows up only here.

**The two chains' `html()` hashes differ and must.** `index.html` carries `__CHAIN_ID__`, so the
Sepolia bundle is 2 bytes longer than Base Sepolia's (142,949 against 142,947) and every hash down
the column differs. The widget carries no chain id and hashes identically on both — which is the
control that the difference is the chain id and nothing else. The compressed `bytes` and `payload
bytes` coincide at 61,157 / 45,358 on both chains; gzip absorbed the two bytes.

**Run every step-8 command inside `devbox run`, which is where the trap is.** Outside the project
environment two things break, and the second one is the one that would mislead a reader:

1. `make chain-doc` fails `eth_call html() on --rpc: Invalid params`. The recipe resolves `--app`
   through `DEPLOYED`, which pipes through `jq`; `jq` is in `devbox.json` but not on the VM's PATH,
   so `--app` comes out empty and the next argument shifts into its place. Not a verification gap —
   § 4d's `node tools/chain-doc.mjs --app $APP` form is the documented equivalent and was what the
   figures above were first read with — but `make chain-doc` is what the acceptance criterion names,
   and it was re-run inside `devbox` on both chains to claim it, returning the same figures.
2. **`app/dist/index.html.gz` compresses to a different byte count**, and with it two of the four
   calldata files. The VM's `/usr/bin/node` and devbox's nix `node` are both `v24.21.0` and produce
   **byte-identical `index.html`** — same 142,949/142,947 bytes, same sha256 — but different deflate
   output: 45,624 bytes against devbox's **45,358**. So outside devbox,
   `tools/step4-calldata.mjs` rewrites `1-addChunk-0.hex` and `2-addChunk-1.hex` (the latter also
   changing length, 42,890 → 43,402 chars) and the "regenerates byte-identical" criterion appears to
   fail. Inside devbox the gzip is 45,358, which is exactly the payload `chain-doc` reads back off
   both chains, and `git status --porcelain` is clean over `calldata/`. `3-addWidgetChunk.hex` and
   `batch345.hex` are unaffected: the widget is stored uncompressed and the batch carries only the
   widget chunk and the two setters.

**The lesson is about which check is load-bearing.** A gzip byte count is a property of the
compressor, not of the document, so `sha256sum` of the *committed calldata* is only meaningful under
the pinned toolchain — whereas `inflated sha256` compares what the chain actually serves against the
source bundle and holds under any zlib. Both chains pass both, so nothing here is in doubt; a future
upload that regenerates calldata on a stray `node` would produce a pointless re-upload with an
identical document, and the version pin is the only thing stopping it. **Worth stating in RUNBOOK
§ Step 4** and left out of this task's diff as out of scope.

### What it cost, and the reconciliation

| | Sepolia | Base Sepolia |
|:--|:--|:--|
| gas across the three | 84,194,458 | 12,009,880 |
| `effectiveGasPrice` | 10,000,018 / 10,000,016 / 5,000,506 wei | 5,010,000 wei all three |
| block gas limit at send | 199,609,378 | 120,000,000 |
| L2 fee | 775,962,664,295,408 wei | 60,169,498,800,000 wei |
| L1 data fee | n/a | 38,764 wei (18,494 / 16,475 / 3,795) |
| signer balance before · after | 0.204863387533085144 → 0.204087424868789736 ETH | 0.034975784947982522 → 0.034915615449143758 ETH |

**Both reconcile to the wei.** Sepolia: `gasUsed × effectiveGasPrice` summed is exactly the balance
delta. Base Sepolia needs the OP Stack L1 data fee added — `gasUsed × effectiveGasPrice` leaves
38,764 wei unexplained, which is precisely the three receipts' `l1Fee` fields summed. That field is
not a `cast receipt` field on `cast 1.8.1` (`Error: invalid receipt field: l1Fee`); it comes from
`eth_getTransactionReceipt` over raw JSON-RPC. **m04-t03's reconciliation did not need it** because
it compared Base Sepolia totals loosely; anyone balancing an OP Stack chain to the wei does.

**Largest single transaction either chain has seen in this project: 37,591,595 gas**, 19% of
Sepolia's 199,609,378 block limit. The 50,000,000 limit sent had ample room and the plan's
110,000,000 single-`batch` figure, had the cap not forced the split, would have fitted too.

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

**One proposal per chain, and your signature is the second of two.** Each is the Ops vault calling
**itself**: target `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, `value = 0`, data the committed
`batch.hex`, at the vault's live internal `nonce()`. `batch` runs the five `App` calls in array order
in one transaction and reverts all five if any one fails, so the `CodelessChunk` ordering constraint
is satisfied inside the transaction and a partial upload cannot exist. The engineer's signature is
already on it; yours takes it to the 2-of-4 threshold, which **queues** it for 3,600 s rather than
executing it. Nothing under `src/`, no `lock()`, no `setVersion`, no other vault action of any kind.

### The checklist, per chain, before you sign

Against a checkout of the commit the proposal's description names — not against the dapp's own
decoding alone, which is the thing being checked. § The batch digest carries that commit's file
hashes and the digest read at it. Five checks; any one failing is a stop and a message to me:

1. **Target is the vault and value is 0.** `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, **not**
   `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`. A proposal whose target is `App` is one of
   the old five-call rows, not this one.
2. **The data is the committed file.** `sha256sum` of the proposal's data equals
   `sha256sum docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/batch.hex` — Sepolia
   `d9cc558b…409f237`, Base Sepolia `9b16ccc6…ca0fd6e`, 109,962 characters each including `0x`.
3. **It decodes to the five calls.**
   `cast decode-calldata "batch(address[],uint256[],bytes[])" "$(cat …/batch.hex)"` gives five
   targets, every one `App`; five values, every one `0`; and five `bytes` equal to
   `1-addChunk-0.hex` … `5-setWidgetChunks.hex` in that order.
4. **The nonce is live and the digest matches it.** `cast call $OWNER "nonce()(uint32)"` → **3** at
   15:17Z 2026-11-16, and the digest equals § The batch digest's row for that chain — Sepolia
   `0xc65454f8…eabbcf`, Base Sepolia `0x9d83f01f…378302`. If the nonce has moved, both digests are
   recomputed by the one command in that section and the proposals are reopened; nothing else changes.
5. **It is a vault self-call, so confirm it outside the chat that asked for it** before signing — the
   review rule for self-calls, and this is one.

Then sign, submit, wait the 3,600 s, and send `executeQueued()`.

### The gas budget for `executeQueued`, set by hand

A wallet's own estimate through a public RPC can report a false `DeploymentFailed()` on a batch this
size, so set the limit rather than accept one. Running out of gas reverts the whole batch and leaves
it queued, so it can simply be sent again with more — an under-estimate costs gas, not the upload.

| chain | live batch estimate (15:19Z) | block limit | **set the limit to** |
|:--|--:|--:|--:|
| Sepolia (11155111) | 84,773,222 | 200,000,000 | **110,000,000** |
| Base Sepolia (84532) | 12,188,581 | 120,000,000 | **16,000,000** |

Both come from `cast estimate --from $OWNER $OWNER $(cat batch.hex)` — the vault as sender, which
`eth_estimateGas` does not sign-check — and both carry roughly a 1.3× margin over it for
`executeQueued`'s own queue bookkeeping, which is unmeasured on a real-priced chain. Sepolia's
110,000,000 is RUNBOOK § Gas's figure, unchanged; Base Sepolia's is set here, because § Gas names only
Sepolia's.

### Then stop — step 8 is mine

~~Send me both transaction hashes per chain, the `execute()` submit and the `executeQueued()`, and I run
step 8.~~ **Done 2026-11-16.** You submitted and queued all six; I sent the six `executeQueued` calls
myself on your go of 21:35Z, recovered the Sepolia submit hashes from the vault's `Queued` logs
rather than asking for them, and ran step 8 on both chains. Criterion 3's chain half is claimed above
and § Step 8's `record:` carries the figures. Nothing is outstanding on your side for this task.

---

### Superseded — the 2026-11-12 route, kept as the record

~~Everything from here to the end of this section is the five-call `forward()` route this task was
first planned for: five plain calls to `App` at `value = 0`, signed by all three Ops owners,
immediate, no queue.~~ It is dead twice over — `addOwner` consumed nonce 2 on both chains on
2026-11-16, so all ten nonces and digests are wrong by one, and `forward()` needs every owner's
signature, which is now four. The tables are kept whole rather than struck cell by cell, so that the
digests remain readable as the record of what was prepared; nothing below is to be signed.

~~Before the first signature, re-read the nonce — if it is not 2, stop and tell me, and every digest
below is recomputed by one command:~~

```sh
export RPC=<chain's url>; cast chain-id --rpc-url "$RPC"
cast call 0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790 "nonce()(uint32)" --rpc-url "$RPC"   # expect 2
```

~~Not `cast nonce` on the vault — that reads 1, and signing against it makes all five digests wrong.~~

~~The five must execute **in this order**, and **no other vault transaction may land between them**:
each signature covers the vault's *current* nonce, and `setChunks`/`setWidgetChunks` revert
`CodelessChunk` if their chunks are not on chain yet.~~ Inside `batch` this holds by construction,
which is the live route's one real advantage over this one.

#### Sepolia (11155111) · vault nonce 2 — superseded

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

#### Base Sepolia (84532) · vault nonce 2 — superseded

| # | call | nonce | calldata file (under `…/calldata/84532/`) | digest to sign |
|--:|:--|--:|:--|:--|
| 1 | `addChunk(bytes)` doc 0 | 2 | `1-addChunk-0.hex` | `0x2bb9bd1c943aea5247624a86631f31aee585c992b58ee791d5e825f63676f85d` |
| 2 | `addChunk(bytes)` doc 1 | 3 | `2-addChunk-1.hex` | `0x027a0bf9067e7e5f5662ccd6de4490c220c526dd44ba304ff6b42cf7e1091ac8` |
| 3 | `addWidgetChunk(bytes)` | 4 | `3-addWidgetChunk.hex` | `0x38f3cbb16bcb3b864b133f357a048a6270188f2331c9f7a23c1e1954523abbf2` |
| 4 | `setChunks(address[],bool)` | 5 | `4-setChunks.hex` | `0xd5fc399631f3e88c1cf83609da9dc481ef8e4c9df92a331289447fec2cedd78b` |
| 5 | `setWidgetChunks(address[])` | 6 | `5-setWidgetChunks.hex` | `0x99deb75bd883f29d7b9e79214017f03b5280858539ff306648ca85f6e2589578` |

Gas to allow: **5.3M**, **4.8M**, **1.9M**, ~**0.07M**, ~**0.04M**, against a 120M limit.

#### What to check in the dapp before each signature — superseded

The live route's equivalent is § The checklist, per chain, above. Two of these four checks survive it
unchanged, and are worth reading there: the pointer check is now check 3's decode, and the chain
binding is check 4's. The rest applied to ten separate proposals that are no longer made.

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

~~**Then stop — the rest is mine.** When the forwards have landed, tell me and I run step 8: `cast nonce
$APP` → 4, `chain-doc` hashes and byte counts against § The bundle, the three pointers from
`chunks()`/`widgetChunks()`, and five `cast receipt` hashes and `gasUsed` into step 4's `record:`
rows. That closes M04 criterion 3's chain half, which this PR deliberately does not claim.~~
Step 8 is unchanged in substance and is stated live under § Then stop — step 8 is mine; only the
transaction count changed, from five `Forwarded` receipts to two.

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
3. ~~**Step 8 is not in this PR.** The plan's step 7 ends "**Then stop and wait**", so steps 8 and the
   `record:` rows are after Denizen's signatures and cannot be in the same branch state.~~
   **Reversed on 2026-11-16: step 8 is in this PR.** The product owner submitted and queued all six
   proposals the same day and gave an explicit go at 21:35Z for the engineer to send the
   `executeQueued` calls as each ETA passed, which collapsed the branch boundary the deviation was
   describing — the wait that step 7 ends in turned out to be hours, not a release. So this branch
   carries 4c's and step 8's `record:` blocks and claims criterion 3's chain half. Runbook hunks:
   § Step 4 4c's two `record:` blocks, § Executed on testnets' superseded "prepared and not yet
   executed" paragraph, and both § Record tables' step-4 rows.
4. **Two things the plan prescribed turned out not to be needed, and both are written down rather
   than silently skipped.** The hand-set gas limits of § Gas (`cast estimate` returned clean figures
   for all six, no false `DeploymentFailed()`) and `cast receipt --field` (positional on `cast
   1.8.1`). Neither changes what was sent; both change what M05's mirror should be told to do.
   Runbook hunk: the note under 4c's `executeQueued` `record:`.
5. **The superseded signing tables are kept whole under a labelled heading, not struck cell by cell.**
   The revised plan's step 9 says to keep them struck. Ten rows of four cells wrapped in `~~` renders
   as a wall of literal tildes in some viewers and makes the digests — the only reason to keep the
   tables at all — unreadable. The struck text is the prose that told anyone to *act* on them, and
   every heading over them says `— superseded`, so nothing in that block reads as live. Runbook hunk:
   none; this is a handoff-formatting deviation only.
6. **`executeQueued`'s gas is quoted from a live estimate, which RUNBOOK § Gas calls unmeasured.**
   § Gas says a public RPC fails the simulation at any requested limit, and that is true of `eth_call`
   with an explicit gas figure; `eth_estimateGas` on the same endpoint answers, and did — 84,773,222
   on Sepolia, 12,188,581 on Base Sepolia, both at 15:19Z 2026-11-16. So the budgets in § For Denizen
   rest on a measurement of the batch's *execution*, plus a margin for the queue bookkeeping that is
   still unmeasured. § Gas's wording is narrower than it reads and names only Sepolia's figure;
   Base Sepolia's **16,000,000** is set in the handoff, where the revised plan's step 9 puts it, and a
   § Gas edit is not this step's. Runbook hunk: § Step 4 → *Gas*, unchanged by this PR.
   **Settled by the upload:** the three calls actually used **84,194,458** gas on Sepolia and
   **12,009,880** on Base Sepolia, against those pre-upload whole-batch estimates of 84,773,222 and
   12,188,581 — 0.7% and 1.5% high. The estimate was sound and the margin for unmeasured queue
   bookkeeping was never needed.

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
   Worth a line in the org's multisig doc if it does not already say so.
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
   **The premise expired on 2026-11-16**: step 8 ran on this branch the same day, so no criterion is
   blocked any more and the "issue marked done with three blocked criteria" cost is gone. The
   recommendation below is therefore withdrawn — on the facts as they now stand the closing keyword is
   the right one, and it is still one word in the PR body and still the architect's call, not mine.
   - *Close it.* The task's AC says the PR closes its issue, and the preparation is complete; step 8
     lands as a follow-up commit or a second PR. Cost: an issue marked done with three blocked
     criteria, and M04 criterion 3 tracked nowhere.
   - *Refs only, close after step 8.* The issue stays open across Denizen's signing, and whoever runs
     step 8 pushes to the same branch or a second PR that closes it. Cost: a merged PR with an open
     issue, which the loop does not otherwise produce.
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
   - **Ruled 2026-11-16, before signing** (Denizen, Telegram 08:46 CST, quoted in
     [#190](https://github.com/dnznlabs/rake/issues/190)'s closing comment): keep the dev-seed salt for
     this upload; the featured panel is empty on both testnets until
     [#193](https://github.com/dnznlabs/rake/issues/193) (carried, m04: set the featured distribution
     and re-upload) lands. Carried: #193.

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
