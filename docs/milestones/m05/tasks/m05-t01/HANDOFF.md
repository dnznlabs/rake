# m05-t01 — handoff (Part A)

PR: #<n> · Branch: `m05/t01-remine` · 2026-11-19

Part A only: the salts, the runbook amendment, the tool change, step 6's values, the featured salt
and the anvil rehearsal. **No transaction was sent to any public chain**, nothing was proposed to a
vault and `app/` was not touched. Decision 37's mining run was repeated against the init-code hashes
`main` builds today, both salts carry their prefixes, and one anvil landed both contracts at the
predicted addresses with step 6's real table. The four folds (#207, #251, #188, #197) are in, each
with the step's own check run rather than asserted. Every figure below was read through
`devbox run --` on the pinned toolchain (forge `1.7.1-dev`, solc `0.8.38`, node `v24.21.0`) at
`732c24f`, the last commit that touches anything but this file;
`git diff --stat 732c24f -- . ':!docs/milestones/m05/tasks/m05-t01/HANDOFF.md'` is empty at the
branch head. Part B is not started and is gated as § Gate says.

## Acceptance criteria

Criteria 13–18 are Part B's and are listed so that none reads as silently passed. Criterion 19 is
Part B's too: this table is Part A's half.

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | `grep -ci 'stale since' RUNBOOK.md` → **0** (baseline 1). Salts read back **out of § 0** (not the mining output) and recomputed: `FACTORY_SALT` `0xf83d35ce…ce6e4193` → `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`, `APP_SALT` `0x87cdf85b…20ead3f2` → `0x00a9F390A6010d045e0d34856048DdD6910d25BA`; prefixes `0x00d1` and `0x00a9` both present. Step 1f's own commands at the head compute `0x9778c35879aa3214905a41c9519ae6c704dc5d00333806ac56ed6e7fbd2d8945` and `0xa8bbb83700d29d4b2e4b871c680f31165f42c0eb9234071a7948ce79f9fe33a3`, equal to the two § 0 quotes. `grep -c 0x6aC98EDA RUNBOOK.md` → **0** (baseline 4) — see Deviation 3 |
| 2 | pass | § For close-out's anvil table: predicted equal to landed for both contracts, `predict($DNZN_SALT)` = `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`, `owner()` the Ops vault on `App` **and** on the distribution, `description()` `DNZN // FUND DISTRIBUTION`. Three transaction hashes and `gasUsed` from `cast receipt` |
| 3 | pass | `grep -c '^export SENDER=' RUNBOOK.md` → **1** (baseline 0); `grep -c '^export SIGNER=' RUNBOOK.md` → **1**; step 6's `cast send` carries `$SENDER` (`RUNBOOK.md:1048`); both `forge script` sites carry `$SIGNER` (`:419`, `:458`). Measured on the pinned toolchain: `cast send --help` and `forge create --help` contain `--sender` **0** times and `--from` 2; `forge script --help` **2** and 0. Both reject it: `error: unexpected argument '--sender' found`. `grep -c 'unexpected argument' RUNBOOK.md` → **1** |
| 4 | pass | `grep -c 'not exact_match' RUNBOOK.md` → **1** (baseline 0). Rehearsed both directions before it was written in — against the newly mined factory, which has no code on Sepolia: `0x00D19609… null` / `sourcify: … is null, not exact_match`, **exit 1**; against the three M04 Sepolia addresses: `exact_match` ×3, **exit 0** |
| 5 | pass, one clause not met | § 1's table has **eight rows**, one per chain it lists, every figure dated 2026-11-19, with the rate condition beside it and the Sepolia row read as the other chains' figure at that rate (62.4% of a 60M block, cutting at 19,000 bytes). `grep -ci 'before any mainnet cut' RUNBOOK.md` → **1** (baseline 0), at `RUNBOOK.md:1034` inside § Gas's rule, naming the calldata and the proposal split in the same sentence. `grep -c -- '--max-chunk' tools/step4-calldata.mjs` → **3** (baseline 0); `grep -c 'envOr("MAX_CHUNK"' scripts/forge/Chunks.s.sol` → **1** (baseline 0). New test red with the flag ignored: `AssertionError [ERR_ASSERTION]: --max-chunk 10000 did not reach the cut — the flag parses but is ignored`, 3 pass / 1 fail; reverted, 4 pass. **The last clause — `--app-nonce 7` regenerating `calldata/11155111/` byte-identical — does not hold, and does not hold on `origin/main` either: see Deviation 8 and Discovery 1.** What the clause protects is proved instead by isolating the variable: old tool and new tool, no flag, one bundle, **all six files byte-identical** |
| 6 | pass | `grep -ci '20 gwei stop of step 0' RUNBOOK.md` → **0** (baseline 1); `grep -ci '1 gwei' RUNBOOK.md` → **2** (baseline 0), at `:113` and `:115`, inside § 0 (§ 1 begins at `:167`) |
| 7 | pass | `grep -c 'DNZN // FUND DISTRIBUTION' RUNBOOK.md` → **2** (baseline 0). § 0 exports `DNZN_DESCRIPTION`, `DNZN_TABLE` and `DNZN_DELAY` (`:76-78`) — see Deviation 4. Step 6 reads back `description()` and `snapshot()` (`:1053-1055`). The table string parsed on the anvil: the clone landed at **45 bytes** with the three rows ascending, 2,000 / 4,000 / 4,000 |
| 8 | pass | `grep -ci 0x357836ff mk/15-seed.mk test/build.test.mjs test/ext.test.mjs` → **0, 0, 0** (baselines 1, 2, 1). `make dapp-nodev CHAIN_ID=11155111` then `grep -o '0x68e0741d[0-9a-f]*' app/dist/index.html \| head -1` → `0x68e0741d8d693e14bf56914567eaddc130b186ee000000000000000000000001` |
| 9 | pass | `grep -c '^setup:' mk/10-forge.mk` → **1** and `grep -c '^libs:' mk/10-forge.mk` → **1** (baselines 0, 0); `grep -c 'make setup' AGENTS.md README.md` → **1** each. Both directions in a throwaway worktree at this head: empty `lib/` → `make build` **exit 2**, `lib/forge-std is empty — the pinned submodules are not checked out. Run 'make setup' first.`, and `lib/forge-std` and `lib/solady` both still **0 entries** (forge never ran); after `make setup` (exit 0) `git submodule status` shows `bf647bd6… lib/forge-std (v1.16.2)` and `acd959aa… lib/solady (v0.1.26)` and `make build` exits **0**, `Compiler run successful!`. `.github/workflows/ci.yml` is unaffected and unedited: it checks out with `submodules: recursive` and runs forge directly, never through `make` |
| 10 | pass | The coordination service holds a `wallets` row for the Ops vault on **all eight** chain ids — 1, 10, 8453, 42161, 4326, 4663, 11155111, 84532 — read 2026-11-19, recorded in § 1's table as its `signing row` column. The question that is the Product Owner's is in § For Denizen. See Discovery 4 on `owner_count` |
| 11 | pass, less CI | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot foundry.toml` prints **nothing**; the `*.t.sol` population it covers was enumerated first — `App.t.sol`, `ColdStipend.t.sol`, `DistributionFactory.t.sol`, `Distribution.t.sol`, `PushGas.t.sol`, `TableCap.t.sol`. After `forge build --force` (exit 0, 0 `warning[`, 0 `Warning (`): `forge test` **107 passed, 0 failed**; `forge snapshot --check` **exit 0**; `grep -c '' .gas-snapshot` **107**; `node --test test/*.test.mjs` **168 pass, 0 fail, 0 skipped** (167 plus the one new case); `forge fmt --check` exit 0; `forge lint` exit 0. `git status --porcelain` empty. **CI is not green yet because no PR is open** — see Deviation 11 |
| 12 | not verifiable here | **No PR was opened**: the brief reserves that. The closing line to use is `Closes #207, #188, #197, #251`, and the four folds are complete in this branch with each step's check quoted above — AC 4 for #207, AC 5 for #188, AC 9 for #197, AC 3 for #251. Each issue was read and says what the plan claims it says (§ Discoveries has nothing against them). `gh pr view <n> --json closingIssuesReferences` is the reviewer's to run, and the task's own issue (#271) must **not** be in it |
| 13–18 | Part B | Not started. The two testnets, gated on M04's close-out and on this PR's merge; step 14 additionally on m04-t15's merge |
| 19 | Part B | Part B's PR closes #271 and its handoff carries all nineteen rows |

## Deviations from the plan

1. **Branch name.** The tree was prepared as `m05/t01-part-a`; `TASK.md:53` names `m05/t01-remine`
   for Part A. Renamed to the plan's name before the first commit. TASK.md wins over the brief.
2. **Baseline commit.** TASK.md's line numbers are `main` at `78b5eb7`; this branch is cut at
   `e770054` = `origin/main`, which `TASK.md:53` allows ("at or after `78b5eb7`"). Every line number
   the plan cites was checked and still resolved to the named text at `e770054` — `:66`, `:69-70`,
   `:107-110`, `:116`, `:118-126`, `:983-985`, `:1019-1021`, `:1562`, `:1685`. Note that local
   `main` is 23 commits behind `origin/main` in this checkout, so every gate above names
   `origin/main` explicitly and not `main`.
3. **Step 1's two instructions conflict, and the numeric check was taken as binding.** The step asks
   for `grep -c 0x6aC98EDA RUNBOOK.md` → 0 *and* for the three pre-#201 prediction sites to be
   "struck with the date rather than deleting". Both cannot hold if the literal stays. Resolved by
   keeping all three rows, striking them with `~~…~~` and dating them **superseded 2026-11-19
   (m05-t01, M05-D1)**, and replacing the literal address inside them with that dated note. The rows
   survive as record for Part B to rewrite; the old address remains in git history and on
   state-collection#74, which Part B comments on.
4. **Step 6's exports went into § 0's fence, not step 6's block.** Criterion 7 requires "§ 0 exports
   `DNZN_DESCRIPTION`, `DNZN_TABLE` and `DNZN_DELAY`", and § 0 states that "nothing below hard-codes
   a value that belongs here". Both point the same way, so the three live at `RUNBOOK.md:76-78` and
   step 6 references them rather than redeclaring them.
5. **The new test asserts the printed piece count, not the narrow run's exit code.** The tool's five
   numbered files and its proposal list name two document chunks by position (`tools/step4-calldata.mjs:224`),
   so a cut into three stops it *after* the count is printed. The count is what the plan points at
   ("the tool prints it"), and asserting it keeps the case true if that shape is later generalised.
   Stated in the test's own comment.
6. **Step 4's money paragraph was recomputed, because its base fee did not reproduce.** The plan
   quotes 0.12 gwei on 2026-11-19; Ethereum read **570,774,697 wei (0.5708 gwei)** through
   `cast base-fee` on 2026-11-19, 4.8× higher. At the measured fee the plan's conclusion that both
   figures sit "inside the 0.03 ETH ask" does not survive its own arithmetic: 85,666,566 gas is
   0.04890 ETH and 112,307,985 gas is 0.06410 ETH. The runbook now says what does hold — the ask is
   comfortable at Ethereum's deposit rate (0.00905 ETH for three pieces, 0.00274 for Run A) and
   fails at Sepolia's, so it is generous only while Ethereum stays off EIP-8037.
7. **Arbitrum One's two estimates moved.** The plan's table has 2,408,065 and 5,331,725; re-read
   2026-11-19 they are **2,489,291** and **5,651,278**, which is what is recorded. An Arbitrum
   estimate carries an L1 data component, so it tracks L1's base fee rather than being a property of
   the chunk — a figure to re-read on the day, not a correction to the plan's arithmetic.
8. **Step 4's byte-identical regeneration check cannot pass at this head, and does not pass at
   `origin/main` either.** Run as prescribed it reports `1-addChunk-0.hex` and `2-addChunk-1.hex`
   differing. Two controls locate the cause away from this task: the tool's default is unchanged
   (old tool vs new tool, no flag, one bundle → all six files identical), and `origin/main` at
   `e770054` in a clean throwaway worktree does not reproduce its own committed calldata either
   (same two files differ, with nothing of this branch present). Discovery 1.
9. **Drop `d50dbc9` is in the `drop` repository, not in `~/src/shared`.** The first port was taken
   from the shared template's `forge-anvil` fragment (`1b10501`), whose comments are shorter. The
   commit named by `TASK.md` and by #197 was then read at `~/src/drop` `d50dbc9` and the fragment
   aligned to it verbatim — `LIBS`' three-line comment, the `setup` help text, the eight-line `libs`
   comment and `.PHONY`'s ordering. `LIBS := lib/forge-std lib/solady` is drop's own line, not an
   addition.
10. **Robinhood Chain's per-transaction ceiling is recorded as unread.** Its RPC answers the same
    2⁵⁰ placeholder as Arbitrum One's, and it is built on Arbitrum Dedicated Blockchains per its own
    docs, but no documented block or per-transaction gas figure for it could be found on 2026-11-19.
    Arbitrum One's **32,000,000** is cited from Arbitrum's chain-parameters page; Robinhood's row
    carries the estimate and says the ceiling is unread rather than borrowing Arbitrum One's. It is
    a stretch row, not an M05 acceptance chain, and the sizing rule's re-evaluation before a cut
    covers it.
11. **No PR was opened and criterion 12 is therefore unverified.** The brief reserves opening it.
    Criterion 11's "CI green on both PR heads" is unmet for the same reason. Everything CI runs was
    run locally through the pinned toolchain and is quoted in AC 11.
12. **The new test carries a precondition rather than a hard dependency.** It needs `cast`, for the
    ABI encoding the tool deliberately does not hand-roll, and `make test` does not build the dapp,
    so the case supplies its own fixture tree as the tool's cwd and skips with a stated reason if
    `cast` is absent. Under `devbox run -- make test` it runs: 168 pass, **0 skipped**.

## Decisions

1. **The anvil rehearsal used the real `OWNER`, delay and table, and an anvil account's salt for the
   `create`.** § 0's real `DNZN_SALT` reverts `SaltDoesNotStartWith` from any other sender, which the
   rehearsal exercised directly (`0x0c4549ef`). So the landed distribution is at the rehearsal salt's
   address and `predict($DNZN_SALT)` is read separately, offline, with the factory at its real
   address. **What the rehearsal cannot prove:** an anvil collapses signer and owner, so passing
   `OWNER` the Ops vault proves the constructor stores it, not that the vault can sign anything. Every
   authority reading is Part B's, live, on each chain.
2. **`ext.test.mjs`'s `DEPLOYED` moved to Part A's factory and implementation.** Step 7 requires the
   `predictLocal` expectation to be "the address step 8's anvil lands … a function of the new factory
   address, the implementation and the salt, all fixed by Part A", which is only true if the pair
   moves with it. Its comment no longer claims the pair was read from the tracked broadcast logs,
   because it was not: these are predictions, and Part B puts them on the testnets. The test reads no
   chain. `build.test.mjs`'s `DISTRIBUTIONFACTORY` and `DISTRIBUTIONFACTORY_BLOCK` are Sepolia's
   deploy record and were left for Part B, as the step says.
3. **`README.md`'s "They have changed" paragraph was corrected, not rewritten.** Part A's own merge
   falsifies its clause "until that mining run is repeated". It now says the run has been repeated,
   that § 0 carries new salts and addresses, and that the deployments below are still the 0.8.34
   ones. The § Deployment Status rows, the superseded links and `:27`'s full rewrite stay Part B's
   (step 17). `grep -ci 'No mainnet deployment' README.md` is still **1** and
   `grep -c 0x00D18B5b README.md` still **3**, so criterion 17's baselines are untouched.

## Discoveries

1. **`origin/main` does not regenerate its own committed `calldata/11155111/`.** At `e770054`, in a
   throwaway worktree with nothing of this branch in it, `node tools/step4-calldata.mjs --chain
   11155111 --app-nonce 7` reproduces `3-addWidgetChunk.hex`, `4-setChunks.hex`,
   `5-setWidgetChunks.hex` and `batch345.hex` byte for byte and **differs on both `addChunk` files**.
   The build is not at fault: two consecutive `make dapp-nodev CHAIN_ID=11155111` runs give an
   identical `index.html.gz` (`70c243e9…f16cfd`) and `widget.js` (`8b6bbc88…0bc368`), so the bundle is
   deterministic and the committed calldata simply predates `app/` changes that reached `main` after
   the M04 upload. Part B step 14 regenerates it, so nothing is broken by it — but criterion 5's
   last clause is written as though it held today, and it did not hold before this task either.
2. **MegaETH prices code deposit at a third rate.** Its 24,000-byte chunk estimates **253,077,911**
   gas and its factory **111,772,970** — about **10,545 gas per byte**, neither EIP-8037's ≈1,530 nor
   the legacy 200. Its block limit is 10,000,000,000, so the chunk is 2.5% of a block and the rule
   passes at 24,000, but no budget figure for that chain should be derived from the Ethereum row.
3. **`RUNBOOK.md`'s anvil figures are from `d75b664` and the bytes have moved.** On this task's anvil
   the factory's runtime is **1,319** bytes and `App`'s **7,154**, against the 1,320 and 7,118
   § Rehearsed on anvil records. Expected from 0.8.34 → 0.8.38; noted because § Rehearsed on anvil
   still presents its numbers without a solc version beside them, and nothing in Part A's scope
   touches that section.
4. **The coordination service's `owner_count` disagrees with the chain, in the direction of being
   stale.** It answers **3** for the Ops vault on all four mainnets and **4** on the testnets and
   MegaETH; the live testnet reading is 4 and a fourth owner joined in November. The field is the
   service's cache, so § 1's new column records only *that a row exists* per chain and says the chain
   is what to believe.
5. **`forge create` rejects `--sender` exactly as `cast send` does.** #251's title names both; this
   is the measurement for the record — `--sender` 0 occurrences in each `--help`, `--from` 2 in each,
   and the same `error: unexpected argument '--sender' found` from both.
6. **The Sepolia distribution of decision 50 is owned by an EOA, not the vault.** Read 2026-11-19:
   `owner()` `0x357836fFcB45307FA7ff2A574F505753c961902B`, `delay()` **3600**, `nonce` 2. That is the
   state § One-way doors 2 describes and nothing here touches it; recorded because step 6's values
   were read *from* it while the thing being built uses the Ops vault as owner and 604800/86400.

## For close-out

| | value |
|:--|:--|
| `FACTORY_SALT` | `0xf83d35cef117466f8f7d514b6413fda46f290e45d72f4d985312f746ce6e4193` |
| `APP_SALT` | `0x87cdf85b31cb82e688a11bbb8cf4c0249648f7dc2e5bec932424960920ead3f2` |
| factory init-code hash | `0x9778c35879aa3214905a41c9519ae6c704dc5d00333806ac56ed6e7fbd2d8945` |
| `App` init-code hash | `0xa8bbb83700d29d4b2e4b871c680f31165f42c0eb9234071a7948ce79f9fe33a3` |
| `FACTORY` | `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` |
| `IMPL` | `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` |
| `APP` | `0x00a9F390A6010d045e0d34856048DdD6910d25BA` |
| `DISTRO` — `predict($DNZN_SALT)` | `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199` |

**The anvil, `--chain-id 31337` on port 8557, 2026-11-19.** Port chosen after reading `ss -ltn`;
another session held 8599 and was left alone. The proxy was in genesis at 69 bytes with keccak
`0x2fa86add…f7e4989`, equal to § 1, so no `anvil_setCode` was needed.

| | predicted | landed |
|:--|:--|:--|
| `FACTORY` | `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` | equal · 1,319 bytes |
| `APP` | `0x00a9F390A6010d045e0d34856048DdD6910d25BA` | equal · 7,154 bytes |
| `IMPL` | `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` | equal — `implementation()` and `cast create2 --deployer <factory> --salt 0` agree |
| `DISTRO` at the rehearsal salt | `0x0cEf4AbF76628c799CdFECbfA5fef878dc30B2F2` | equal · 45 bytes |

Before any send, `cast code` at the predicted `FACTORY` and `APP` printed `0x`. Hashes and `gasUsed`
from `cast receipt`, never from a broadcast log: factory
`0x77e4105bf6d50915e53d339633376c2f4525d73710127ab9c47231bfde3b1b31` · **2,381,290**; `App`
`0x5dfd30fe041256b0d81d700f2c90ff7ea95ff463fdd75a1a21d9c2ffb6e1adf9` · **1,655,420**; `create`
`0x56339319b19aa2a56c08524c6c19c279851078e495aac07c5d72429b714a8518` · **463,727**. Read-backs:
`App` `owner()` the Ops vault, `version()` `v0.1`, `locked()` **false**; the distribution `owner()`
the Ops vault, `delay()` **604800**, `description()` `DNZN // FUND DISTRIBUTION`, `snapshot()` the
three rows ascending at 2,000 / 4,000 / 4,000 with decision 50's names and notes. `cast estimate
--create` of the factory on the anvil read **2,376,418**, against § 1's cancun mainnet figure of
**2,396,446**.

## For Denizen

**One question, and nothing else yet. No transaction, no signature and no funding are asked for in
Part A.**

- **Step 10 — which mainnets does the signing app list for the Ops vault?** The coordination service
  holds a `wallets` row for all four (1, 10, 8453, 42161) and for the stretch pair, read 2026-11-19.
  Whether the app you sign in lists each of Ethereum, OP Mainnet, Base and Arbitrum One is your
  reading, not one that can be taken from the service. **No transaction in this task depends on the
  answer**; it is recorded in § 1's table when given. A chain with a row but without the app is a
  runbook change before deploy day, not an improvised on-chain `approve(digest, true)`.

## Open questions

None. M05-D1 runs on the milestone's default, option (1), as `TASK.md` § Open questions states;
Part A stands under either option, so nothing here blocks on the ruling.
