# m04-t10 — handoff

PR: #214 · Branch: `m04/t10-reupload` · 2026-11-17

`App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` now serves the #203 bundle on Sepolia and Base
Sepolia: the FUND distribution featured, the hero without the alpha line, the editor and list fixes.
The upload was the three-proposal Run B of decision 47 — `addChunk` doc 0, `addChunk` doc 1, then one
`batch` over `addWidgetChunk` + `setChunks` + `setWidgetChunks` — proposed at vault nonces 6, 7 and 8
on each chain, signed by the Product Owner, and run by the engineer with `executeQueued` in strict
nonce order after the 3,600 s delay. `chain-doc`'s `inflated sha256` equals the build on both chains
and `cast nonce $APP` is 7. Alongside it, `tools/step4-calldata.mjs` no longer defaults `App`'s nonce
to 1 — it reads the chain or takes `--app-nonce`, and refuses rather than guessing — with the first
child-process test in `test/`, routine calldata moved to `calldata/<CHAIN_ID>/` at the root, and
`RUNBOOK.md` gained § Which run is this, a Run-B-self-contained Step 4, and § Uploads as the record
this upload filled in as it ran.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| M04 criterion 3's chain half, both chains | pass | `node tools/chain-doc.mjs` after 4c. **Sepolia:** `inflated sha256` `2d27b603b657391a24bd882598ef61d32e3bb635c2e918b414af04683f9a9d4a`, inflated 142,989 bytes, payload 45,377; `widget sha256` `07e808ed9e5f0a08786715a0cbc0458dfb5905b41150999b8c2bf6e67d51b8ca`, 8,132 bytes, status 200. **Base Sepolia:** `1111b791bd9d30963d5a359c8e1db8d85b562e1a82c1118fedfc8650b0920e17`, 142,987 bytes, payload 45,374; same widget hash and 8,132 bytes. `sha256sum` of each chain's `make dapp-nodev CHAIN_ID=$CHAIN_ID` build returns the same two hashes and `wc -c` the same two counts, so the equality holds both ways. `cast nonce $APP` → **7** on both |
| the chunk pointers equal the committed predictions | pass | both chains: `chunks(0)` `0x831f740Feda030bbF8E58C590657679F05f31268`, `chunks(1)` `0x02d5AcDAa324E6FeDEE9bad54ad18aFa9cAeA0C3`, `widgetChunks(0)` `0x80bDDA62C39BfA8e31FEC60fF3B7A1283f40FC38` — the three `App` CREATEs at nonces 4, 5, 6 the calldata was generated for |
| the bundle is #203's | pass | per chain, on the `dapp-nodev` build: `grep -c alpha app/dist/widget.js` → **0**; `grep -o '__FEATURED_SALT__\|0x357836ff[0-9a-f]*' app/dist/index.html \| head -1` → `0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001`, the DNZN salt; `grep -ci 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 app/dist/index.html` → **0**. Widget 8,132 bytes, under the 10,240 limit |
| regeneration reproducible under the pin — **(a)** pre-execution at App nonce 4 | pass | run before 4c, when it was still possible: `make dapp-nodev CHAIN_ID=$CHAIN_ID && node tools/step4-calldata.mjs --chain $CHAIN_ID --rpc "$RPC" --out calldata` inside `devbox run --`, both chains. The tool read `App` nonce **4** from each chain and `git status --porcelain` was **empty**. Recorded with the nonce it read, at ~15:30Z, in the engineer's daily note `~/.openclaw/workspace/memory/2026-11-17.md` § m04-t10 — the perishable half |
| regeneration reproducible under the pin — **(b)** `--app-nonce 4` at the review head | pass | re-run at this PR's head, **after** 4c, both chains: the same command with `--app-nonce 4` in place of `--rpc` leaves `git status --porcelain` **empty**. `4` is the nonce RUNBOOK § Uploads names for rows 1 and 2 |
| every `calldata/$CHAIN_ID/*.hex` under 65,536 characters; no `batch.hex` | pass | `wc -c` largest is `1-addChunk-0.hex` at **48,138** chars (17,398 spare); then 42,954 / 42,890, `batch345.hex` 18,314, `3-addWidgetChunk.hex` 16,458, `4-setChunks.hex` 330, `5-setWidgetChunks.hex` 202. `ls calldata/*/batch.hex` → `No such file or directory` |
| the tool refuses a defaulted nonce | pass | `node tools/step4-calldata.mjs --chain 11155111 --out /tmp/x` with neither flag exits **2**, prints `refusing to guess \`App\`'s nonce` and names both `--rpc` and `--app-nonce`; `/tmp/x` is not created. Measured twice: with `app/dist/` present, and with it **absent**, which is CI's condition and the one that found the ordering defect in § Discoveries |
| the test reds when the default is restored | pass | planted the pre-change behaviour (default 1 when neither flag is given) and `node --test test/step4-calldata.test.mjs` failed at `test/step4-calldata.test.mjs:42` — `AssertionError: expected a deliberate exit 2, got 0: 0 !== 2`. Reverted; 3/3 pass |
| six transactions recorded and reconciled | pass | the twelve hashes, `gasUsed`, `effectiveGasPrice` and the Base Sepolia `l1Fee`s are in § What it cost below and in RUNBOOK § Uploads. Balance delta equals the receipt sum **to the wei** on both chains: Sepolia **1,257,406,800**, Base Sepolia **66,991,833,699,460** |
| the runbook has two entry points | pass, with one noted exception | `RUNBOOK.md:36` is `## Which run is this`, before `## 0 — variables` at `:58`, carrying the two-row Run A / Run B table; `## Uploads` at `:1021` with rows 1 and 2 filled; Step 4 lists its own five Run-B variables. **`grep -n "must be 1" RUNBOOK.md` prints one hit** — see § Deviations |
| `forge test` | pass | 7 suites, **107 tests passed, 0 failed, 0 skipped**, 12.04s |
| `node --test test/*.test.mjs` | pass | **105 pass, 0 fail**, 190ms |
| `make fmt` | pass | `forge fmt --check`, no output, exit 0 |
| `forge lint` | pass | `Compiling 6 files with Solc 0.8.38` … `Compiler run successful!`, no findings |
| `src/` diff empty | pass | `git diff c0ea940 -- src/` writes **0 bytes** |
| CI at the head | see PR | the run on this head is the record; nothing here can stand in for it |

## What it cost

Both chains, all twelve transactions `status true`. The three submits per chain are the Product
Owner's proposals (which queue); the three `executeQueued` are the engineer's (which run and pay for
the call). `gasUsed` and `effectiveGasPrice` read positionally from `cast receipt` — `--field` is not
accepted by the pinned `cast 1.7.1` — and the Base Sepolia `l1Fee` from raw
`eth_getTransactionReceipt`, which `cast receipt` does not surface.

**Sepolia**, `executeQueued`, `effectiveGasPrice` **15 wei** on all three:

| vault nonce | call | tx | block | `gasUsed` | estimate | limit sent | cost (wei) |
|--:|:--|:--|--:|--:|--:|--:|--:|
| 6 | `addChunk` doc 0 | `0x9559ca95b77595cf54980b9668b08f5760adb2c4715565ac0abb88e11cda59a2` | 12155608 | 37,493,831 | 38,474,885 | 50,017,350 | 562,407,465 |
| 7 | `addChunk` doc 1 | `0xf5d6dcf20fa0dcfa1e9bab8cdcb62f8e1a85478436b568bda4d8aa0d77a2965e` | 12155609 | 33,434,368 | 34,479,858 | 44,823,815 | 501,515,520 |
| 8 | `batch345` | `0xe1f955983bbef0aa908968abda15762cadbe1ae90f5747c0dc50abb259855005` | 12155610 | 12,898,921 | 13,881,217 | 18,045,582 | 193,483,815 |

Sum **83,827,120** gas, **1,257,406,800 wei**. Submits: `0x9629018a…5b1c88fa` 1,651,608 gas,
`0x7df581c0…aea22f083` 1,485,720, `0x9ec56529…98d4395d` 697,240, all at `effectiveGasPrice`
1,500,000,015 — **5,751,852,057,518,520 wei**, paid by the Product Owner, not the engineer.

**Base Sepolia**, `executeQueued`:

| vault nonce | call | tx | block | `gasUsed` | estimate | limit sent | `effectiveGasPrice` | `l1Fee` | cost (wei) |
|--:|:--|:--|--:|--:|--:|--:|--:|--:|--:|
| 6 | `addChunk` doc 0 | `0x1109d70289ae81f0138a148eb9ca870b94a88d3256deb13546cd27c9586b81b1` | 60056890 | 5,313,847 | 5,538,669 | 7,200,269 | 6,000,000 | 18,860 | 31,883,082,018,860 |
| 7 | `addChunk` doc 1 | `0x51ebc2842191f3804fbea1bf1cf8f54a57e48f39d3e3c904a6874a33fe640206` | 60056912 | 4,742,766 | 4,965,321 | 6,454,917 | 5,010,000 | 16,811 | 23,761,257,676,811 |
| 8 | `batch345` | `0x3b3c01042a857123233c8396ae967201ca5011c78965b913b56bf1510bb15714` | 60056932 | 1,891,249 | 2,016,300 | 2,621,190 | 6,000,000 | 3,789 | 11,347,494,003,789 |

Sum **11,947,862** gas, **66,991,833,699,460 wei**. Submits: `0xb9c0e46e…42012bff` 1,984,950 gas /
`l1Fee` 39,029, `0x13d73ce6…3865d253` 1,774,580 / 34,846, `0xc5b7abb9…0ae72e41` 748,130 / 8,292 —
**27,064,019,211,117 wei**.

**The reconciliation, both chains, to the wei.** Sepolia: `204087424868789736` before the first send,
`204087423611382936` after the third, delta **1,257,406,800** = the receipt sum above. Base Sepolia:
`34915615449143758` → `34848623615444298`, delta **66,991,833,699,460** = its receipt sum. Nothing
unaccounted on either chain.

## Deviations from the plan

**`grep -n "must be 1" RUNBOOK.md` prints one hit, and the precondition is still gone.** The hit is
`RUNBOOK.md:284`, `cast code $PROXY --rpc-url "$RPC" | wc -c  # must be 141 chars = 69 bytes` — a
substring collision inside "must be 141" on an unrelated Run A line about the deterministic-deployment
proxy. The criterion's subject, Step 4's `cast nonce $APP` precondition, now reads "must equal the
`--app-nonce` the calldata was generated with". Line 284 is outside this task's scope and was left
alone rather than reworded to satisfy a grep; the alternative — editing a Run A gas-free byte check to
make a string search come up empty — makes the document worse to make the check pass.

**Step 4's gas limits came from live estimates, not from § Gas's hand table.** The plan's step 4 said
to set the `executeQueued` limits from the fork figures as t08 did. The fork was run and its figures
recorded (see § Discoveries), but `cast estimate --from $ENGINEER` returned a clean figure for all six
against the same public RPCs, so each send used **estimate + 30%** and the hand limits were kept only
as a fallback. This reproduces t08's finding rather than discovering it; § Uploads now says so beside
the table, and § Gas keeps its table for an RPC that refuses to estimate.

**The branch was rebased onto `main` at `6394f16`** so the review head carries #213's amended
regeneration criterion. No `TASK.md` byte differs from `main`.

## Decisions

**§ Uploads carries the six hashes in two per-chain sub-tables under the main table, not inside one
cell.** The plan's column list names "six tx hashes" as a column; six 66-character hashes in one
Markdown cell is unreadable at any width, and the row would be the only one in the document that
cannot be scanned. The main table's cell reads "in full below" and the sub-tables carry hash, block,
`gasUsed` and estimate per transaction. The record is complete in § Uploads either way, which is what
the criterion asks for.

**Sepolia first, both phases.** The plan says Sepolia first; it is also the chain whose ~7× code
deposit makes it the one that can run out of gas, so it is the one worth learning from before Base
Sepolia is touched.

## Discoveries

- **`Number('')` is `0`, not `NaN`**, so a blank `--app-nonce` would have passed an
  `Number.isInteger(n) && n >= 0` check and silently become nonce **0** — the same
  silently-wrong-nonce failure the whole change exists to stop, one layer in. The tool now matches
  `/^[0-9]+$/` before converting (`tools/step4-calldata.mjs:129-135`). An empty string arriving as a
  valid non-negative integer is worth knowing anywhere a flag is validated this way.
- **The plan's test-pattern citation was wrong, and is corrected on `main`.** Step 2 cited
  `test/abi.test.mjs` as "the existing test pattern for a tool, which runs `tools/` scripts as child
  processes". It does not: it asserts a codec against committed fixtures and only mentions
  `tools/abi-vectors.sh` in a comment. **No test in `test/` spawned a child process before this
  task**, so `test/step4-calldata.test.mjs` introduces the pattern rather than following one. Verified
  and amended in the task text before any code was written.
- **Headroom to a third document chunk is 2,623 bytes**, measured on this build. `index.html` gzips
  to 45,377 bytes (Sepolia) against `MAX_CHUNK = 24_000`, so two chunks hold 48,000 and the margin is
  what is left. This is the figure #188 wants beside its 65,536-character proposal cap: the cap binds
  the *proposal* (largest file here 48,138 chars, 17,398 spare), while 2,623 bytes is what binds the
  *document*. The page can grow by about 2.6 KB compressed — roughly 5.8% — before the payload splits
  in three, the proposal count changes from three, and Run B's shape changes with it. **Whichever of
  the two is hit first changes the procedure, and the document limit is now the nearer one.**
- **The wall-clock and wei cost of a routine upload — one measurement, not a rate.** For #193: a
  routine two-chain upload, from the first proposal submitted to the last `executeQueued` mined, took
  **1 h 07 m 00 s** on Sepolia (15:27:00Z → 16:34:00Z) and **1 h 04 m 43 s** on Base Sepolia
  (15:29:32Z → 16:34:15Z). The vault's 3,600 s delay is 90% of both; the engineer's execution window
  was **24 s** on Sepolia (three consecutive blocks) and **9 s** on Base Sepolia, and the Product
  Owner's three signatures per chain took the rest. Cost, all six transactions:
  **5,751,853,314,925,320 wei** (≈ 0.00575 ETH) on Sepolia and **94,055,852,910,577 wei**
  (≈ 0.0000941 ETH) on Base Sepolia. **The Sepolia wei figure is not a budget.** Its
  `effectiveGasPrice` was **15 wei** on all three `executeQueued` — a near-empty public testnet — so
  the whole 83,827,120 gas cost less than the 1,651,608-gas submit beside it. The transferable half of
  the measurement is the gas: **83,827,120** on Sepolia and **11,947,862** on Base Sepolia, which at
  1 gwei would be ≈ 0.0838 ETH and ≈ 0.0119 ETH. Plan a mainnet upload from the gas, and from the hour.
- **The fork under-prices Sepolia's code deposit by ~7×, and the live batch confirms it.** On
  `anvil --fork-url`, `batch345` estimated 1,938,757 and used 1,877,648, identical on both chains;
  live it estimated 13,881,217 and used **12,898,921** on Sepolia and 1,891,249 on Base Sepolia. Base
  Sepolia's live figure matches its fork figure to within 1%, and Sepolia's is 6.9× it — the gap is
  Sepolia's code-deposit term on the 8,132-byte widget chunk, not a Sepolia-wide multiplier. **A fork
  estimate is a floor on a chain with a real code-deposit price**, and the one number it cannot give
  you is the one you are setting a gas limit from.
- **Live `cast estimate` beat every fork and hand figure, including the batch.** All six estimates
  came back clean from the public RPCs and sat **2.3%–7.6% above** actual `gasUsed`. The batch is
  still unestimable before its chunks land (`CodelessChunk`), but estimating it *between* order 2 and
  order 3 works and is strictly better than deriving it. Run B should say estimate-then-send first and
  keep § Gas as the fallback; § Uploads now does.
- **The Ops vault's `delay()` is 3,600 s, not 1,800.** The 1,800 s figure in the engineer's own notes
  is the *other* multisig's. Worth stating because the ETA arithmetic that locates a submit
  transaction from a queue entry — `submit ts = eta − delay()` — is how both chains' submit hashes
  were recovered here, and it is silently wrong with the wrong delay. Read `delay()` per vault.
- **A refusal that runs after a file read is not a refusal, and a built worktree cannot see it.** The
  first head of this PR validated `--rpc` / `--app-nonce` *after* `readFileSync('app/dist/index.html.gz')`,
  so in a clean checkout the tool died `ENOENT` at exit **1** with a stack trace instead of exiting 2
  with the instruction. Every local run passed, because an engineer running this tool has just built
  the bundle — the artifact is always there. CI, which does not build before `make test`, failed both
  refusal tests on the first push and is the only reason this was found. Argument validation now
  precedes the first file or chain read (`tools/step4-calldata.mjs:73-95`), verified by moving
  `app/dist/` aside and re-running: 3/3 pass. **The general shape is worth carrying: a guard whose
  purpose is to replace a confusing failure with a clear one has to run before the confusing failure
  can happen, and a test for it passes locally for the wrong reason.**
- **Base Sepolia's public RPC caps `eth_getLogs` at a 200-block range**, and the chain produces ~5
  blocks per second, so a `Queued` log 3,600 s back is ~18,000 blocks and 90 windows away. Locate the
  block by interpolating timestamps first, then scan one window. The same scan on Sepolia needs no
  windowing at all. Anything that searches Base Sepolia logs by time needs this.

## Open questions

None.

## For Denizen

**The upload is live and verified on both chains; nothing is outstanding on it.** The three proposals
per chain were signed and submitted at 09:27–09:30 CST, and the engineer ran all six `executeQueued`
after the ETAs passed, in strict nonce order, with the `cast nonce $APP` gate read between every send
(`4`, `5`, `6` before orders 1, 2, 3 and `7` after the batch, per chain). `App` serves the #203 bundle
at `w3link`'s source of truth now.

**The 4b checklist as it stood when the proposals were handed over**, recorded because it is what the
signatures were checked against — three items per proposal, all passed before signing:

| chain | vault nonce | target | value | data `sha256sum` | digest |
|:--|--:|:--|--:|:--|:--|
| Sepolia | 6 | `$APP` | 0 | `b2f2b91390957a523979db4bd94140157cf84035c023b23c10a7a62fe2475a27` | `0x396fa3e615cb9f7bf6a83224b3eb546502c915b2150f65742ad17e205df87755` |
| Sepolia | 7 | `$APP` | 0 | `89704fa00c41a5063328afeaf3d4b09d241584694fc4e7eafed21dea1efa7060` | `0x97c4dda009ff1b57b120baac0b3e0bbdd8ed5e65492656350f5b43b625ea9222` |
| Sepolia | 8 | `$OWNER` | 0 | `66609f1ce89903dc8380c7a1b32830ac44f4ab7c6edb4af02179d28b413ed62f` | `0xf2d1eb23349269f030ead8e0c57104546646e09efdfb6d76825b54d022f12d68` |
| Base Sepolia | 6 | `$APP` | 0 | `e003c9aef9f63ac3cc50886925ab4432b8cbb0a69e230686a7bd5ec5db0c5cdd` | `0x47a5c688c0822fc61adf33ad575a801baca9133f051045daae20cb89e98b6aeb` |
| Base Sepolia | 7 | `$APP` | 0 | `6601c031b1d0643ffb5d9db9c6c4dcbf5dab8c8e8e5b5a663f4fb5b68c25383b` | `0xb95f651673179404920cba8ac4f4bc24f1c71045995341129cfd41a56eee4597` |
| Base Sepolia | 8 | `$OWNER` | 0 | `66609f1ce89903dc8380c7a1b32830ac44f4ab7c6edb4af02179d28b413ed62f` | `0x2bf6dcf9d3de26a0227938a6e642bb8bab20350ec19ca7c62e4387e2cc57f627` |

All six digests were recomputed from each chain with `getTransactionHash` immediately before the first
send and equalled the table above; `queued()` was non-zero for all six and every ETA had passed.
`batch345.hex` is byte-identical across the two chains — one `sha256sum` for both rows — while the
digests are not, because `getTransactionHash` binds the chain id.

**Two things that are yours, both independent of this PR.** #209, the testnet `setDescription` to
FUND from your EOA — the page reads `description()` live, so it needs no re-upload. And the merge
line on this PR, if the review does not clear it for the architect.

**One figure to keep for M05.** A routine upload is an hour of wall clock, 83.8M gas on an
Ethereum-priced chain and 11.9M on an L2, and the page is 2,623 compressed bytes from needing a third
chunk and a fourth proposal. The hour is the vault's delay and will not shrink; the gas will not
either. See § Discoveries.
