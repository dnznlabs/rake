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
| 6 | pass | `grep -ci '20 gwei stop of step 0' RUNBOOK.md` → **0** (baseline 1); `grep -ci '1 gwei' RUNBOOK.md` → **3** (baseline 0): `:125` and `:127` inside § 0, and `:127`'s figure restated at `:256` in § 1's base-fee reading. The criterion is that § 0 states the stop, which `:125` and `:127` do; the third hit is § 1 quoting it, not a second stop |
| 7 | pass | `grep -c 'DNZN // FUND DISTRIBUTION' RUNBOOK.md` → **2** (baseline 0). § 0 exports `DNZN_DESCRIPTION`, `DNZN_TABLE` and `DNZN_DELAY` (`:76-78`) — see Deviation 4. Step 6 reads back `description()` and `snapshot()` (`:1053-1055`). The table string parsed on the anvil: the clone landed at **45 bytes** with the three rows ascending, 2,000 / 4,000 / 4,000 |
| 8 | pass | `grep -ci 0x357836ff mk/15-seed.mk test/build.test.mjs test/ext.test.mjs` → **0, 0, 0** (baselines 1, 2, 1). `make dapp-nodev CHAIN_ID=11155111` then `grep -o '0x68e0741d[0-9a-f]*' app/dist/index.html \| head -1` → `0x68e0741d8d693e14bf56914567eaddc130b186ee000000000000000000000001` |
| 9 | pass | `grep -c '^setup:' mk/10-forge.mk` → **1** and `grep -c '^libs:' mk/10-forge.mk` → **1** (baselines 0, 0); `grep -c 'make setup' AGENTS.md README.md` → **1** each. Both directions in a throwaway worktree at this head: empty `lib/` → `make build` **exit 2**, `lib/forge-std is empty — the pinned submodules are not checked out. Run 'make setup' first.`, and `lib/forge-std` and `lib/solady` both still **0 entries** (forge never ran); after `make setup` (exit 0) `git submodule status` shows `bf647bd6… lib/forge-std (v1.16.2)` and `acd959aa… lib/solady (v0.1.26)` and `make build` exits **0**, `Compiler run successful!`. `.github/workflows/ci.yml` is unaffected and unedited: it checks out with `submodules: recursive` and runs forge directly, never through `make` |
| 10 | pass | The coordination service holds a `wallets` row for the Ops vault on **all eight** chain ids — 1, 10, 8453, 42161, 4326, 4663, 11155111, 84532 — read 2026-11-19, recorded in § 1's table as its `signing row` column. The question that is the Product Owner's is in § For Denizen. See Discovery 4 on `owner_count` |
| 11 | pass, less CI | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot foundry.toml` prints **nothing**; the `*.t.sol` population it covers was enumerated first — `App.t.sol`, `ColdStipend.t.sol`, `DistributionFactory.t.sol`, `Distribution.t.sol`, `PushGas.t.sol`, `TableCap.t.sol`. After `forge build --force` (exit 0, 0 `warning[`, 0 `Warning (`): `forge test` **107 passed, 0 failed**; `forge snapshot --check` **exit 0**; `grep -c '' .gas-snapshot` **107**; `node --test test/*.test.mjs` **168 pass, 0 fail, 0 skipped** (167 plus the one new case); `forge fmt --check` exit 0; `forge lint` exit 0. `git status --porcelain` empty. **CI is not green yet because no PR is open** — see Deviation 11 |
| 12 | not verifiable here | **No PR was opened**: the brief reserves that. The closing line to use is `Closes #207, #188, #197, #251`, and the four folds are complete in this branch with each step's check quoted above — AC 4 for #207, AC 5 for #188, AC 9 for #197, AC 3 for #251. Each issue was read and says what the plan claims it says (§ Discoveries has nothing against them). `gh pr view <n> --json closingIssuesReferences` is the reviewer's to run, and the task's own issue (#271) must **not** be in it |
| 13–18, 18b–18f | Part B | Not started. The two testnets, gated on M04's close-out and on this PR's merge; step 14 additionally on m04-t15's merge. **Amended 2026-11-19:** M04's close-out merged ([#296](https://github.com/dnznlabs/rake/pull/296)) and decision 64 added criteria 18c–18f — M04 criteria 1, 3 and 5's transferred clauses — beside 18b. **Criterion 17's last clause is recorded as the architect's, not the engineer's, pending the Product Owner's ruling** — Discovery 7 and § For Denizen; it is the one row in Part B whose author this table does not yet settle |
| 19 | Part B | Part B's PR closes #271 and its handoff carries all **twenty-three** rows (1–18, 18b–18f). Amended 2026-11-19: nineteen as written, plus decision 64's four |

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
7. **Criterion 17's last clause names the wrong author, and three sources had to be read to see it.**
   The clause is "state-collection#74 carries **the engineer's** comment with the new address"
   (`TASK.md:556`). Two other sources say the architect: the m04 draft's preamble ("this is the text
   for the Product Owner to approve, then the architect posts it") and — decisive, because it is the
   commitment made to the other team — #74's own **Done when**, read 2026-11-19 and quoted verbatim:
   "Owner: Denizen, at M4's gate; **rake's architect updates this issue when the first public deploy
   lands**." The issue is OPEN with **0 comments**. So the criterion is wrong as written and the fix
   is an amendment, not a clause the engineer reinterprets; it is drafted for the Product Owner
   alongside the architect's m05-t01b item, and nothing needs it before the comment posts, which is
   after step 13 regardless. **Ruled 2026-11-20: the amendment landed at `aecedbe`
   ([#299](https://github.com/dnznlabs/rake/pull/299)) before this run's first send, and it carries
   all three defects named here — author, trigger and closure shape. Criterion 17 is now met by this
   handoff carrying the landed address, never by `state-collection` accepting a comment, and the
   comment itself is the architect's.**
   **The finding behind the contradiction is the dependency shape, not the author:** a criterion in
   this repo cannot be satisfied by an artefact in another repo's issue tracker, because closure
   then waits on a team that never agreed to the clause and on an author this repo cannot assign.
   Worth carrying into how the remaining cross-repo gates are written.
   **The trigger was a second defect and is resolved: #74 takes two updates, not one at a disputed
   time** (architect's ruling 2026-11-19). Textually the testnets are public — #74's "What it is not
   yet" opens "A contract on any public chain. rake M04 executes the runbook on Sepolia and Base
   Sepolia; the mainnets are rake M05", drawing its contrast against the "two anvils" it measured on.
   But the gate the issue serves consumes a **mainnet** address: `state-collection`'s
   `docs/milestones/m4/MILESTONE.md` at `eec081a` is titled "M4 — Mainnet", its criterion 1 is a
   go/no-go that "names the **mainnet** `payee`", and its § Needs the human adds "its readiness
   blocks mainnet" — so #74's "at M4's gate" is a mainnet gate by their own title, and a testnet
   address cannot answer what they are holding open. Hence the split, which is also what
   `docs/milestones/m05/MILESTONE.md:317` already says this task owes — #74 "told the new
   **prediction**", not a landed address:
   1. **This task, after step 13:** the correction. Their recorded `0x6aC98EDA…` is wrong, the new
      prediction is `0xB611Ff19…`, and #74's own invariant — the address "does not move between now
      and then unless rake changes a `src/` byte" — broke with **no `src/` change**, because #201's
      solc pin moved every init-code hash. Owed independently of any deploy, since their record is
      wrong today; the landed testnet address is corroboration that the new prediction is real,
      which is why it posts after step 13 and not before.
   2. **m05-t02/t03, at the mainnet deploy:** the update their gate actually consumes — a mainnet
      address with non-empty `cast code` and `owner()` the Ops vault. Not this task's to deliver, and
      a later reader should not come back to t01 for it.

## Gates — plan step 12, per chain, before the first send

Read 2026-11-19 22:10–22:25 CST on branch `m05/t01-redeploy` at `7404007`, through the devbox pin.
Plan step 12's check is that these are here, dated, before any transaction. **No transaction has
been sent: Part B stops here, before plan step 13.**

**Why the stop is here.** Step 13 is § One-way doors #1 — the testnet address set moves — and its
own 1f check is `prediction equal to Part A's addresses`. A mismatch mid-run leaves a half-deployed
set on one chain, which is a state to discover with attention available rather than unattended. That
is the reason of record and it holds whatever the clock says. A second reason applied only to the
evening of 2026-11-19 and is secondary: steps 14 and 15 are a build, six proposals, signatures and
read-backs that would not have fitted the time left, so deploying then would have advanced step 13
and nothing else, with a stop as the next thing regardless. Kept in that order deliberately — the
architect's point, taken 2026-11-19 — because a reason that is only true of one evening should not be
the recorded rationale for where an irreversible step stops.

Branch pushed at `e271c62` before any send, so the step-14 ancestry and criterion 18's branch point
are checkable by someone other than the engineer: `02d456a`, `3849cb2` and `7404007` are all
ancestors of it, verified on both sides.

| | Sepolia `11155111` | Base Sepolia `84532` |
|:--|:--|:--|
| `cast chain-id` | **11155111** = `$CHAIN_ID` | **84532** = `$CHAIN_ID` |
| `cast code $FACTORY` `0x00D19609…6d7f8E` | **`0x`** | **`0x`** |
| `cast code $APP` `0x00a9F390…0d25BA` | **`0x`** | **`0x`** |
| `cast code $DISTRO` `0xB611Ff19…0F4D5199` | **`0x`** | **`0x`** |
| `cast code $IMPL` `0xc4eD7EA2…fF8cB0A` | **`0x`** | **`0x`** |
| `cast balance $ENGINEER` | **0.201987421704518312 ETH** | **0.034781705778474950 ETH** |
| `cast balance $CREATOR` | **0.0100 ETH** | **0.0100 ETH** |
| `cast base-fee` | **14 wei** | **5,000,000 wei** (0.005 gwei) |
| `isOwner($ENGINEER)` | **true** | **true** |
| `threshold()` | **2** | **2** |
| `delay()` — read, not assumed | **900** | **900** |
| `ownerCount()` | **4** | **4** |

**Step 14's own gate is two PRs, and both are ancestors of this branch.** `TASK.md:45` and `:372`
read "m04-t15's **and m04-t16's** task PRs merged to `main`"; [#271](https://github.com/dnznlabs/rake/issues/271)'s
issue text names only m04-t15, so the issue undercounts it and the authority is the task file.
Checked rather than assumed, with step 14's own form:

| gate PR | merge commit | `git merge-base --is-ancestor <sha> HEAD` |
|:--|:--|:--|
| m04-t15 [#277](https://github.com/dnznlabs/rake/pull/277) | `02d456a` | **0** |
| m04-t16 [#286](https://github.com/dnznlabs/rake/pull/286) | `3849cb2` | **0** |

Criterion 18 wants both merge commits named, which is why they are here and not only in step 14's
own row later. `main` is `7404007` with **zero open PRs**, so no M04 record amendment is in flight
behind this branch.

**[#288](https://github.com/dnznlabs/rake/issues/288) closes on step 13, and the two fixtures
disagree until it does.** `test/ext.test.mjs:41` already pins `factory:
'0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E'` — Part A's *prediction* — while
`test/build.test.mjs:283-284` still pins the deployed `DISTRIBUTIONFACTORY:
'0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B'` at `DISTRIBUTIONFACTORY_BLOCK: '0xb88091'`, the M04
factory. Step 13 moves the build fixture to the **landed** factory, and the two sites agree only if
landed equals predicted — which is step 13's own 1f check, not an assumption. The equality is stated
in step 13's row with both `file:line` sites when it is measured, and #288 closes on it; #271's
closes-list omits #288, so the PR's closing line carries it explicitly.

**No code at any of the four predicted addresses on either chain**, so the `#22` branch of
`RUNBOOK.md:351-391` is not taken and nothing needs identifying before the deploys.

**Funding is ample, with the arithmetic rather than the adjective.** Run A's measured gas is
28,296,098 on Sepolia and 4,035,842 on Base Sepolia, Run B's 85,666,566 and 12,206,026
(`RUNBOOK.md:1680`, § Uploads rows 3–4). At the base fees above that is **about 0.0000000016 ETH**
on Sepolia against 0.2020 held, and **about 0.0000812 ETH** on Base Sepolia against 0.0348 — four
and nearly three orders of magnitude of headroom. Nothing is under twice its figure, so § For
Denizen's funding ask stays "none asked".

**`delay()` is 900 s on both testnets, not the 3,600 the runbook's prose carries** (`:475`,
`:643-645`), matching step 12's own 2026-11-19 reading; decision 58 records 3,600 on the mainnets.
Recorded as a deviation, not a stop: every "one hour" in Step 4 is "`delay()` seconds, read in 4c".
Put to the Product Owner and answered on 2026-11-19 — he recalls one hour — so § For Denizen records
the disagreement and the reading it leaves standing, rather than an open ask.

**One gate item was not met at the 22:10–22:25 reading: `ETHERSCAN_API_KEY` was not set in this
session**, and it was not on the box by design — M04's `MILESTONE.md:195-196` makes it the Product
Owner's to hand to the engineer's session, "never committed", with the handoff naming only its last
four characters. **Supplied and proved at 22:57 CST the same evening, key `…9SKI`**, so the item is
met and criterion 14 needs no amendment; the reading below is left as it stood rather than rewritten.
It is a v2 key, which is what `:1101` calls: the unified endpoint answered `status` **1**, `message`
**OK**, `ContractName` **App** for `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` on `chainid`
**11155111** *and* **84532** — one key across both chains. Attributable to the key, because the
paired control is the same URL and address with the parameter dropped: `{"status":"0","message":
"NOTOK","result":"Missing/Invalid API Key"}` on both. What it affects is narrow, and reading § Step 5
rather than assuming is what establishes that:

- § Step 5 is titled **"explorer verification, named and not run"** and says "M04 executes these and
  records the explorer links; **no key is needed to write them down**". The `forge verify-contract
  --etherscan-api-key` block at `:1065-1074` is named, not run.
- The one place a key is actually read is the Etherscan API `ContractName` read-back at `:1101`.
- The Sourcify verifications at `:1112-1118` require it **unset**, and `:1107` says why: while it is
  set, forge ignores `--verifier sourcify` and goes to Etherscan, which answers `already verified`
  and exits 0 — so the Sourcify verification looks done when it never ran. M04's close-out records
  that its step 5 verified on Sourcify with the key unset (`CLOSEOUT.md:91`).

So it blocks neither plan step 13's deploys nor the Sourcify half of step 5; it is wanted for one
read-back line, and the asking is in § For Denizen below rather than assumed from M04.

## Step 13 — Run A on the testnets

**Authority and base.** The Product Owner lifted the step-13 stop in the FOCUS topic on 2026-11-20
at 01:36 CST ("yes - go on 13"), answering the go/no-go question this handoff's § Deviations records
the stop against. Before the first command the branch was rebased from `7404007` onto **`aecedbe`**,
so `TASK.md` here is byte-identical to `main`: head **`b77827f`**, 8 ahead, 0 behind, tree clean.
The only amendment in that base is criterion 17 (#299), and its effect on this run is subtractive —
it removes the cross-repo comment from the engineer's scope; nothing in Part B's steps or the other
criteria moved, checked by diffing `TASK.md` across `7404007..aecedbe`.

**Every command in this step ran inside `devbox run --`, and that is load-bearing rather than
habit.** 1a asserts forge `1.7.1-dev`; the host's forge is **1.8.1**, whose `cast create2` prints
`address↹salt` instead of the address alone, so 1f's documented `| tail -1` would have silently
yielded a two-field string and poisoned every address derived from it. The runbook's form is correct
for the pinned toolchain and wrong for the host one.

### Sepolia (11155111) — step 1, preflight, nothing broadcast

| 1 | reading | required |
|:--|:--|:--|
| `cast chain-id` | **11155111** | `= $CHAIN_ID` ✓ |
| 1a `forge --version` | **forge Version: 1.7.1-dev** | pinned ✓ |
| 1a `node --version` | **v24.12.0** | recorded |
| 1a `git status --porcelain \| wc -l` | **0** | 0 ✓ |
| 1a `git rev-parse HEAD` | **`b77827f271736258bcaa584051ea3e680de6785d`** | recorded |
| 1b `forge build --force` | **exit 0**, `Compiling 42 files with Solc 0.8.38` | 0, non-empty ✓ |
| 1b `grep -c 'warning\['` / `'Warning ('` | **0** / **0** | 0 ✓ |
| 1b `forge test` | **124 passed, 0 failed, 0 skipped**, exit 0 | all pass ✓ |
| 1b `forge snapshot --check` | **exit 0** | 0 ✓ |
| 1c proxy code | **69 bytes** | 69 ✓ |
| 1c proxy keccak | **`0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989`** | § 1's value ✓ |
| 1d `tx.origin` in `src/` | **nothing** | empty ✓ |
| 1d `msg.sender` in `App.sol` | **nothing** | empty ✓ |
| 1e `cast call --create` runtime | **1,319 bytes** | 1,319 ✓ |
| 1e `cast estimate` factory | **16,738,648** | recorded |
| 1e `cast estimate` `App` | **11,405,803** | recorded |
| 1e `cast block latest --field gasLimit` | **200,000,000** | estimates fit ✓ |
| 1e `cast base-fee` | **16 wei** | re-read ✓ |
| 1g `cast code $FACTORY` | **`0x`** | `0x` ✓ |
| 1g `cast code $APP` | **`0x`** | `0x` ✓ |

**1f, the check the whole step exists for — prediction equals Part A on both addresses:**

| 1f | predicted here, 2026-11-20 | Part A / § Gates |
|:--|:--|:--|
| `FACTORY` | **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** | equal ✓ |
| `APP` | **`0x00a9F390A6010d045e0d34856048DdD6910d25BA`** | equal ✓ |
| factory init-code hash | **`0x9778c35879aa3214905a41c9519ae6c704dc5d00333806ac56ed6e7fbd2d8945`** | `TASK.md:20-22` ✓ |
| `App` init-code hash | **`0xa8bbb83700d29d4b2e4b871c680f31165f42c0eb9234071a7948ce79f9fe33a3`** | `TASK.md:20-22` ✓ |

So step 13's stop rule — "1f's prediction equal to Part A's addresses", else send nothing — is met on
Sepolia, and step 2 is cleared on this chain.

**One measurement-form note, so a later reader does not read a passing gate as a failed one.**
`RUNBOOK.md:365` gives 1c as `cast code $PROXY \| wc -c` “must be 141 chars”; that 141 counts the
trailing newline `wc` sees. Measured with `printf '%s'` the same code is **140** characters, which is
`0x` plus 138 hex digits = **69 bytes**, the figure the gate is actually about, and the keccak matches
§ 1 exactly. The byte count is right; only the character convention differs.

**1e against the prior reading.** The factory estimate is **16,738,648** against 16,730,843 on
2026-11-08 (`RUNBOOK.md:1e`), a drift of 7,805 gas on a chain whose pricing moved under #201; the
`App` estimate of **11,405,803** and the sum of **28,144,451** sit against § Gates' recorded Run A
total of 28,296,098, so the funding arithmetic there holds unchanged with 0.2020 ETH at a 16 wei base
fee. Both estimates are far inside the 200,000,000 block limit, and the node's figures — not
`forge script`'s own cancun-priced simulation — are the ones this chain will charge.

### Sepolia (11155111) — step 2, the factory

**Sent.** `forge script scripts/forge/Deploy.s.sol --rpc-url "$RPC" --broadcast -g 650 $SIGNER`,
`ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`, forge exit 0.

| step 2 | reading | required |
|:--|:--|:--|
| tx hash | **`0xf9da99cd04279a55a58c7be1431b3877d4547c6f5e7451f675f32922be4109bc`** | `cast receipt` ✓ |
| `status` | **true** | success ✓ |
| `gasUsed` | **16,797,162** | `cast receipt`, not `run-latest.json` (#140) ✓ |
| `blockNumber` | **12,173,938** | recorded |
| `effectiveGasPrice` | **6,250,004 wei** | recorded |
| logged `DistributionFactory` | **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** | **= 1f's prediction** ✓ |
| `implementation` logged, and `implementation()` read back | **`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`** | agree ✓ |
| runtime length | **1,319 bytes** (2,640 chars), artifact **equal** | same length ✓ |
| differing bytes | **60** | — |
| differing bytes **outside** the declared spans | **0** | none ✓ |
| spans | `{"48267":[{274,32},{864,32},{939,32}]}`, each holding `IMPL` left-padded to 32 | all three ✓ |

**The gas limit had to be raised explicitly, and the figure the runbook tells you to raise it to is
itself short.** Step 1e's rule is to compare the node's estimate with the dry run's and raise the
limit when the node's is larger. On Sepolia at this base: the dry run printed **3,482,636** (not
m04-t03's 3,482,636-era 3,287,625 — the bytes moved under #201) and the node's `cast estimate` read
**16,738,648**, a factor of 4.81, so the broadcast carried `-g 650`, giving a limit of about
22,637,134. **The transaction then used 16,797,162 — 58,514 gas *more* than the node's own
estimate.** A limit set exactly at the node's figure, which is the literal reading of step 1e, would
have failed for gas and burned most of it: a gas failure creates nothing and is not a #22 collision,
but it is not free. So the rule wants a margin over the node's estimate rather than equality with
it, and `-g` is the flag that applies it (`forge script` on 1.7.1-dev offers `-g/--gas-estimate-multiplier`
as a percentage; it has no `--gas-limit`). Recommend amending step 1e to say so.

### Sepolia (11155111) — step 3, `App`: one failed attempt, then the deploy

**The first attempt failed for gas and created nothing.** Recorded before the retry was sent, per
§ 2's rule, because a transaction that sent something must be written down before the next one.

| failed attempt | reading |
|:--|:--|
| tx hash | **`0x2be31dbb7a2d5f0a6a6e141c8842548b4eddf0fe66362411068cc049b3c86639`** |
| `status` | **false** |
| `gasUsed` | **11,075,750** burned |
| gas **limit as sent** | **11,432,739** |
| `blockNumber` / `effectiveGasPrice` | 12,173,945 / **50,000,017 wei** |
| `nonce` | 27, consumed |
| `cast code $APP` after it | **`0x`** — nothing created, not a #22 collision |

**The defect is in how `-g` is sized, and step 1e as written does not prevent it.** `forge script`
applies `--gas-estimate-multiplier` to **its own per-transaction estimate**, not to the
`Estimated total gas used for script` line the dry run prints. Those are different numbers: the dry
run printed **2,286,547** for `DeployApp.s.sol`, while the per-transaction estimate was
**1,758,883** — and 1,758,883 × 6.5 = **11,432,739**, the limit as sent, to the gas. The multiplier
was chosen against the printed script total, so the limit landed ~23% below where it was aimed and
**under the node's `cast estimate` of 11,405,803 once the 63/64 forwarding rule takes its share**.
The inner `CREATE2` was handed about 11.23M against ~11.41M needed, burned all of it, and the outer
frame kept the 1/64 that makes `gasUsed` read just under the limit rather than equal to it — which
is why this looks like a revert-with-gas-to-spare and is not one.

**Step 2 survived the same mistake by luck of proportion**, not by being sized correctly: its
per-transaction estimate happened to sit high enough relative to its need that ×6.5 cleared the
node's figure.

**`cast run` on the failed hash is actively misleading here and should not be used as the
post-mortem.** Replayed locally it prints `Transaction successfully executed. Gas used: 1655420`
and a clean trace returning 7,154 bytes of code — because the replay prices creation under
`foundry.toml`'s cancun rules, roughly 7× cheaper than Sepolia charges post-#201. The trace proves
the constructor is correct and proves nothing about the gas. § Gates' standing caveat — a local
rehearsal must never be the instrument for a publish estimate — extends to post-mortems of a failed
publish.

**What the retry uses.** The requirement is that the create *receive* ≥ 11,405,803, so the tx limit
must clear `11,405,803 × 64/63 + intrinsic` ≈ 11.61M, plus a margin for the
**step-2 lesson that actual can exceed the node's estimate** (there, by 58,514). `-g 900` gives
1,758,883 × 9 = **15,829,947**, about 36% over the node's figure and far inside the 200,000,000
block limit. Recommend step 1e be amended to name the per-transaction estimate as the multiplicand
and to require a margin over the node's estimate rather than equality with it.

**The retry succeeded.** `-g 900`, forge exit 0, `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`.

| step 3 | reading | required |
|:--|:--|:--|
| tx hash | **`0xa3748d963f39e1a7c6747d832103ec8f7b1d22613f6a8fa6e5da0783f7bb3261`** | `cast receipt` ✓ |
| `status` | **true** | success ✓ |
| `gasUsed` | **11,505,124** | `cast receipt`, not `run-latest.json` (#140) ✓ |
| `blockNumber` / `effectiveGasPrice` | **12,173,956** / 50,000,017 wei | recorded |
| logged `App` | **`0x00a9F390A6010d045e0d34856048DdD6910d25BA`** | **= 1f's prediction** ✓ |
| `owner()` | **`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`** | `= $OWNER`, the Ops vault ✓ |
| `version()` | **`"v0.1"`** | `= $APP_VERSION` ✓ |
| `locked()` | **false** | false, and never sent ✓ |
| runtime vs `forge inspect App deployedBytecode` | **`cmp` EQUAL**, 14,310 chars = **7,154 bytes** | equal outright ✓ |

**The margin was load-bearing, measured twice now.** `gasUsed` of **11,505,124** is **99,321 above**
the node's `cast estimate` of 11,405,803 — so a limit set at the node's figure would have failed a
second time. With step 2's +58,514 that is two for two on the same side, which makes "the node's
estimate is a floor, not a target" a measured rule on this chain rather than a precaution.

### Sepolia (11155111) — step 5, explorer verification

**Etherscan, run one at a time per `:1086`.** All three exit **0** with `Response: OK` /
`Details: Pass - Verified` / `Contract successfully verified`. **All three were verified by this
run**, not already verified — the runbook asks which of the two each address was, and none reported
`is already verified. Skipping verification.`, which is what a pre-existing verification prints.

One reading that looks like a failure and is not: each log also contains `Response: NOTOK` with
`Details: Pending in queue`. That is the intermediate poll of `--watch`, not an outcome; the final
response in every log is `OK`. Worth naming because grepping a verify log for `NOTOK` — which is how
the rate-limit failure at `:1086` is detected — matches the queue message too.

| `getsourcecode` `ContractName` | address |
|:--|:--|
| **`DistributionFactory`** | `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` |
| **`Distribution`** | `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` |
| **`App`** | `0x00a9F390A6010d045e0d34856048DdD6910d25BA` |

`#code` URLs: `https://sepolia.etherscan.io/address/<address>#code` for each of the three.

**Sourcify, with `ETHERSCAN_API_KEY` unset for all three verifies per `:1107`.** Each exits 0, and
the gate — the asserting loop, not the operator's eye (#207) — prints **three `exact_match` lines**
and **exits 0**:

| address | `match` |
|:--|:--|
| `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` | **`exact_match`** |
| `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` | **`exact_match`** |
| `0x00a9F390A6010d045e0d34856048DdD6910d25BA` | **`exact_match`** |

**OpenChain signatures, 2026-11-20:** `cast upload-signature` over
`Distribution.json`, `DistributionFactory.json` and `App.json` returns **82 `Duplicated:`** and
**0 `Imported:`** — all 82 of this ABI's signatures were already present, which is the expected
reading for an unchanged ABI on a new deployment and confirms no ABI moved under #201's re-pin.

### Base Sepolia (84532) — step 1, preflight

Same branch, same toolchain, same commands. Differences from Sepolia only:

| 1 | reading | required |
|:--|:--|:--|
| `cast chain-id` | **84532** | `= $CHAIN_ID` ✓ |
| 1c proxy | **69 bytes**, keccak `0x2fa86add…f7e4989` | § 1's value ✓ |
| 1e runtime | **1,319 bytes** | 1,319 ✓ |
| 1e `cast estimate` factory | **2,396,446** | recorded |
| 1e `cast estimate` `App` | **1,666,007** | recorded |
| 1e block `gasLimit` | **120,000,000** | estimates fit ✓ |
| 1e `cast base-fee` | **5,000,000 wei** (0.005 gwei) | re-read ✓ |
| 1g `cast code` at `FACTORY` / `APP` | **`0x`** / **`0x`** | `0x` ✓ |

**1f predicts the same two addresses as Sepolia** — `FACTORY
0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`, `APP 0x00a9F390A6010d045e0d34856048DdD6910d25BA`, both
init-code hashes identical — which is what CREATE2 through the same proxy at the same salts is for,
and both equal Part A. **The repricing is the whole difference between the chains:** the factory
estimate is 2,396,446 here against Sepolia's 16,738,648, a factor of **6.98**, which is #201's
code-deposit repricing measured a third time on this task's own bytes.

### Base Sepolia (84532) — step 2, the factory, after one submission the node refused

**The first submission was rejected by the node and never broadcast.** `-g 900` — the multiplier
Sepolia's step 3 needed — asked for a limit of **24,110,559** here (forge's per-transaction estimate
on this chain is 2,678,951), and the RPC answered
`error code -32003: gas limit too high` after 4 attempts. **Nothing was sent:** no transaction hash,
no nonce consumed, no gas burned, `cast code` still `0x` at both addresses. This is a cheaper failure
than Sepolia's step 3 and a different one — refused at submission rather than reverted on chain.

**So the multiplier is per chain, and the two chains want opposite corrections.** Sepolia needs a
large multiplier because the node charges ~7× forge's cancun pricing for a code deposit; Base
Sepolia *refuses* that same multiplier because it enforces a per-transaction gas cap well below its
120,000,000 block limit, and its node estimate (2,396,446) is already **below** forge's own
(2,678,951). A single `-g` for a run that spans both chains cannot be correct. `-g 200` here gives
5,357,902 — 2.2× the node's figure and comfortably under the cap.

| step 2 | reading | required |
|:--|:--|:--|
| tx hash | **`0x73e4e918a1420edfa63adcf2ba1435474aef43da98423635d9360652cc61a0ca`** | `cast receipt` ✓ |
| `status` | **true** | success ✓ |
| `gasUsed` | **2,381,290** | `cast receipt` (#140) ✓ |
| gas limit as sent | **5,357,902** | fits the cap ✓ |
| `blockNumber` / `effectiveGasPrice` | **61,197,280** / 6,000,000 wei | recorded |
| logged `DistributionFactory` | **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** | **= 1f's prediction** ✓ |
| `implementation` logged and read back | **`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`** | agree, and **equal to Sepolia's** ✓ |
| runtime length | **1,319 bytes**, artifact equal | same length ✓ |
| differing bytes / outside the spans | **60** / **0** | none outside ✓ |
| spans | all three hold `IMPL` left-padded to 32 | ✓ |

**Here the node's estimate was not a floor.** `gasUsed` of **2,381,290** came in **15,156 below**
the estimate of 2,396,446 — the opposite sign to both Sepolia sends. So "the estimate under-reports"
is a property of the repriced chain, not of `cast estimate`, and the safe rule is a margin in both
directions rather than a correction factor.

### Base Sepolia (84532) — step 3, `App`

**Sent first time with `-g 200`**, forge exit 0, `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`.

| step 3 | reading | required |
|:--|:--|:--|
| tx hash | **`0xe8f0c7066102ea9e27ee89b52b442faa9cd704deec453b40a74af4e85c47f414`** | `cast receipt` ✓ |
| `status` | **true** | success ✓ |
| `gasUsed` | **1,655,420** | `cast receipt` (#140) ✓ |
| `blockNumber` / `effectiveGasPrice` | **61,197,481** / 6,000,000 wei | recorded |
| logged `App` | **`0x00a9F390A6010d045e0d34856048DdD6910d25BA`** | **= 1f's prediction**, and equal to Sepolia's ✓ |
| `owner()` | **`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`** | the Ops vault ✓ |
| `version()` | **`"v0.1"`** | `= $APP_VERSION` ✓ |
| `locked()` | **false** | false, and never sent ✓ |
| runtime vs artifact | **`cmp` EQUAL**, 7,154 bytes | equal outright ✓ |

**This number closes the argument about local rehearsals, by coincidence worth keeping.** Base
Sepolia charged **1,655,420** gas — *exactly* the `Gas used: 1655420` that `cast run` printed when it
replayed Sepolia's **failed** step 3 locally. The replay was right about the gas and wrong about the
chain: it priced the deposit under `foundry.toml`'s cancun rules, which is what Base Sepolia applies
and what Sepolia no longer does. So the same bytes cost 1,655,420 here and 11,505,124 there, a factor
of **6.95**, and a local figure is a correct prediction for an un-repriced chain and a 7×
under-estimate for a repriced one. That is the sharpest form of § Gates' caveat this task has
measured.

### Base Sepolia (84532) — step 5, explorer verification

**No `--verifier-url` was needed**, as `:1090` predicts: forge 1.7.1-dev resolves 84532 to Basescan
through the same Etherscan v2 key.

**Which of the two each address was — and here they differ, which is why `:1093` asks.** The factory
and the implementation returned `Pass - Verified`, so this run verified them. `App` returned
`Contract [src/App.sol:App] "0x00a9F390A6010d045e0d34856048DdD6910d25BA" is already verified.
Skipping verification.` and exit 0 — a pass for the criterion, but **this run cannot claim it**, and
`getsourcecode` carries no timestamp to settle who did. The likely cause is benign and worth naming:
the address and bytecode are identical to Sepolia's, which Etherscan v2 serves under one key across
chains. Recorded rather than smoothed over, because "verified" and "verified by this run" are
different facts and only one of them is evidence about this deploy.

| `getsourcecode` `ContractName` | address | Etherscan |
|:--|:--|:--|
| **`DistributionFactory`** | `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` | `Pass - Verified` (this run) |
| **`Distribution`** | `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` | `Pass - Verified` (this run) |
| **`App`** | `0x00a9F390A6010d045e0d34856048DdD6910d25BA` | **already verified** (not this run) |

`#code` URLs: `https://sepolia.basescan.org/address/<address>#code` for each of the three.

**Sourcify, key unset, all three exit 0, and the gate passes:** three **`exact_match`** lines, loop
exit **0**, at the same three addresses.

**OpenChain** is keyed by selector rather than by chain, so the upload recorded under Sepolia covers
this chain too: **82 `Duplicated:`, 0 `Imported:`**, 2026-11-20.

### Step 13 closes #288, and the two fixtures now agree

§ Gates recorded that [#288](https://github.com/dnznlabs/rake/issues/288) closes on step 13 and that
the two suites disagreed until it did: `test/ext.test.mjs:41` pinned Part A's **prediction** while
`test/build.test.mjs:282-283` pinned the M04 **deployed** factory. They agree now because **landed
equals predicted** — step 13's own 1f check, measured on both chains, not assumed.

The fixture move this step owes (`TASK.md` step 13: "`test/build.test.mjs:282-285`'s Sepolia fixture
moves to the new factory and block here"):

| `test/build.test.mjs` | was | now |
|:--|:--|:--|
| `SEPOLIA.DISTRIBUTIONFACTORY` | `0x00D18B5b…71B` | **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** |
| `SEPOLIA.DISTRIBUTIONFACTORY_BLOCK` | `0xb88091` | **`0xb9c272`** (12,173,938) |
| `SEPOLIA.APP` | `0x00A90943…5BaE` | **`0x00a9F390A6010d045e0d34856048DdD6910d25BA`** |
| `DEPLOYED.factory` / `.impl` (`:402-405`) | `0x00D18B5b…71B` / `0x31dd18b4…a4b0` | **the landed pair** |

**Two further sites had to move, and neither is in the lines the plan names** — worth stating because
a reader following `:282-285` alone would leave the suite red:

1. **`:402-405`'s `DEPLOYED`** is a second constant in the same file, used by the negative test at
   `:449` that bends one hex digit of the factory address and requires the error to quote both the
   bent value and the computed one. Left at the M04 pair it fails against the real broadcast log,
   whose input now computes the new factory.
2. **`:387`'s pinned prefix** in "a `--set` over a value the log already gave says so on stderr".
   That test passes the log's own value deliberately, so only the address prefix in the expected
   stderr moved, `0x00D18B5b` → `0x00D19609`; its intent is untouched.

`node --test test/*.test.mjs`: **188 passed, 0 failed**.

## Step 14 — its gate is met, and its first check cannot pass as written

**The gate is satisfied, verified independently against `origin/main` at `aecedbe` rather than from
§ Gates' earlier table:** m04-t15 [#277](https://github.com/dnznlabs/rake/pull/277) `02d456a` and
m04-t16 [#286](https://github.com/dnznlabs/rake/pull/286) `3849cb2` are both **MERGED**, and
`git merge-base --is-ancestor` exits **0** for each against this branch's head. So step 14 is not
waiting on either PR.

**It is blocked on its own first check, which step 13 made unsatisfiable by construction.** Step 14
requires the `sha256` of `app/dist/index.html` and `app/dist/widget.js` per chain to **equal**
m04-t16's § For the next upload figures "before anything else runs", and calls a mismatch a stop.
Measured at `c7cfe5c`:

| chain | file | m04-t16 § For the next upload | built here, 2026-11-20 | |
|:--|:--|:--|:--|:--|
| 11155111 | `widget.js` | `8b6bbc88…bc368` | **`8b6bbc88…bc368`** | **equal** ✓ |
| 84532 | `widget.js` | `8b6bbc88…bc368` | **`8b6bbc88…bc368`** | **equal** ✓ |
| 11155111 | `index.html` | `5b298120…40832` | **`4279a0c9cf9de57e284ebddf0ad5bb8e546a14e384f79fb5bc78ae467b2cd0fc`** | **differs** |
| 84532 | `index.html` | `b081be52…३290e` | **`1e5dbb710b397dbe7d2613deaad6b5849a802b385d20566c737342a4e611a05a`** | **differs** |

**Neither cause the plan names applies, and both were tested rather than assumed.** Step 14 says a
mismatch means "either `app/` moved after m04-t16 or the build is not reproducible, and both are
findings, not something to re-hash past":

- **`app/` has not moved.** `git diff --stat 3849cb2..HEAD -- app/` is **empty**.
- **The build is reproducible.** `make dapp-nodev CHAIN_ID=11155111` run twice in succession gives
  the identical `index.html` sha256 `4279a0c9…cd0fc` both times.

**The actual cause is a third one the plan does not enumerate: step 13 changes an input the bundle
embeds.** `make dapp-nodev` reads the factory and its block from the committed broadcast logs — the
same dependency step 13's own row relies on — so re-pointing the factory necessarily re-writes
`index.html`. The built bundle contains **`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`** and the M04
factory `0x00D18B5b…71B` appears nowhere in it, which is the intended outcome of the redeploy and
the reason the hash moved.

**The corroboration that this is an address substitution and not a content change:** the raw sizes
are unchanged, because an address is a fixed-length string. `dapp: raw 150842 · gzip 47659` on
11155111 is byte-for-byte m04-t16's figure, and `widget: raw 8509 · budget 10240 · 1731 left` is
unmoved on both chains. Only 84532's gzip differs, by **one byte** (47658 against 47657) — a
compression artefact of different address bytes at the same length, not a payload change.

**So the check is right about `widget.js` and wrong about `index.html`,** and it is wrong in a way
that makes step 14 unrunnable on any chain where step 13 has executed — which is every chain step 14
serves. It needs an amendment from the architect: either the equality is restricted to `widget.js`
and the figures that are genuinely invariant, or `index.html`'s expected hash is re-baselined from a
post-step-13 build and recorded here as the new reference. **The engineer does not pick between
those** — it changes what a criterion asserts.

**Nothing of step 14 was sent.** No bundle was uploaded, `tools/step4-calldata.mjs` was not run, and
**no proposal exists on either chain** — deliberately, since the vault already carries two inert
proposal rows from m04-t08's step 7 and adding six more ahead of a ruling would repeat that cost.
The build artefacts are untracked (`app/dist` is not in the index), so the tree is clean at the
recorded head.

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

**Part A asked one question and nothing else; Part B's step 12 added the three below, and all three
were put to the Product Owner on 2026-11-19 and answered that evening.** They stand mostly as the
record of what was asked and what came back: the key is in and proved (`…9SKI`),
state-collection#74's comment is cleared, and `delay()` came back as one hour against the chain's
900. Two live items remain, both
small — the 4b checklist reads "`delay()` seconds" and neither figure, and the #74 bullet now asks
for a ruling it did not ask for before. The sittings still come later, when step 14's proposals are
read back and step 15's commands are in this handoff.

- **`ETHERSCAN_API_KEY` for plan step 13's step-5 read-back.** Not set in the engineer's session and
  not on the box, by design: M04's `MILESTONE.md:195-196` makes it yours to hand over, never
  committed, with only the last four characters named here. It is wanted for exactly one line — the
  Etherscan API `ContractName` read-back at `RUNBOOK.md:1101` — because § Step 5 is "named and not
  run" for the `verify-contract` block and the Sourcify verifications need the key **unset**
  (`:1107`: while it is set, forge ignores `--verifier sourcify`, Etherscan answers `already
  verified` and exits 0, so Sourcify looks done when it never ran). **It blocks nothing else:** the
  deploys of step 13 and the Sourcify half of step 5 proceed without it. **But declining is not a
  row that gets softened — it is a criterion amendment.** Criterion 14 names the read-back in terms:
  "the asserting loop exits 0 with `exact_match` ×3 per chain; **`getsourcecode` names the three
  contracts**; OpenChain all `Duplicated:`". Measured here keyless against the M04 factory, which is
  verified: `{"status":"0","message":"NOTOK","result":"Missing/Invalid API Key"}`. So without a key
  criterion 14 cannot pass as written, and the engineer does not get to annotate it — the architect
  amends the criterion by a decision record first, and the table is filled against the amended
  wording. Architect's correction, 2026-11-19, and it is right: an earlier draft of this section said
  the row would read `not run — no key supplied`, which would have let a named criterion quietly
  become a note. **Supplied 2026-11-19 and proved against the live endpoint — key `…9SKI` — so
  criterion 14 stands as written and nothing is amended.** It is a v2 key, one across both chains;
  the two readings and the keyless control are in § Gates. It sits as a mode-600 file outside the
  repo and is read without being echoed, so no transcript carries the value; the protected secret
  store is not the route, because it was measured that day not to reach the shell the commands run
  in. Still unset for the Sourcify block per `:1107`.
- **Asked, answered, disagreed, and now settled in the chain's favour: the Ops vault's testnet
  `delay()`.** **Resolved 2026-11-20, and it is no longer a deviation.** `TASK.md` § For Denizen at
  `aecedbe` (#299) records the Product Owner's confirmation: he set the testnet vaults to **15
  minutes** on both chains, and 3,600 s stays the mainnet figure. So the four readings of 900 were
  the intended setting rather than a discrepancy to carry, and nothing is recorded against him here.
  The history below is kept because it is why the 4b checklist hard-codes no number.
  The Product Owner's word on 2026-11-19 was that the testnet vault is one hour; the vault answers
  **900** on both chains. Four readings now, same vault `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`,
  all **900** — step 12's and the architect's the same day beside `threshold()` 2 and `ownerCount()`
  4, then two through endpoints neither of us had used, `1rpc.io/sepolia` and
  `base-sepolia-rpc.publicnode.com`. That closes the common-mode caveat on the axis that could
  misreport state; strictly it is still one `cast`, so the toolchain is uncorroborated, and a fifth
  reading is not worth holding step 13 for. Two probes refused outright and are worth knowing for
  any plan that names a fallback RPC: `sepolia.drpc.org` answers `chain is not available on free
  plan` even for `chain-id`, and `base-sepolia.drpc.org` 408s on the `eth_call` while answering
  `chain-id` fine.
  The 3,600 is the mainnet figure (decision 58) and what the runbook's prose carries at `:475` and
  `:643-645`, the likeliest source of the recollection. **So the 4b checklist hard-codes neither
  number:** per step 12's instruction it reads "`delay()` seconds, read in 4c", with 900 given as a
  dated reading and this disagreement named on its face, so it is seen before the sitting rather
  than discovered at 4c. A recollection does not overturn a reading, and the engineer does not
  resolve it either way; an override is a ruling and the architect records it. Waiting on the wrong
  clock is the failure mode.
- **The state-collection#74 comment: ruled, and it is not the engineer's to post.** **Settled
  2026-11-20 — the amendment landed at `aecedbe` ([#299](https://github.com/dnznlabs/rake/pull/299))
  before this run's first send**, and it carries all three defects Discovery 7 named: criterion 17
  now reads "state-collection#74 carries the new prediction, posted by the architect", gives the
  engineer's part as "the landed `$DISTRO` in this handoff", and states that the clause "is met by
  the handoff carrying the address, **never** by another repository accepting a comment". So the
  engineer posts nothing to another repo in this task, and criterion 17's closure does not wait on
  `state-collection` at all. Nothing below is an open ask; it is kept as the reasoning the amendment
  ratified. Criterion 17's last clause read "state-collection#74 carries the engineer's comment with
  the new address", and your OK landed 2026-11-19. It is **not posted** and cannot be until the redeploy, because the
  address it must carry is the one step 13 lands: the m04 draft at `docs/milestones/m04/CLOSEOUT.md`
  § For state-collection#74 names the pre-redeploy `0x6aC98EDA…` and the then-predicted
  `0xB611Ff19…`, so the posted text is that draft with the landed address substituted. The
  substitution happens at posting — m04's close-out is merged and out of scope, so it is not edited.
  **The architect posts it, not the engineer, which makes criterion 17's last clause wrong as
  written and an amendment yours to rule on.** #74's own "Done when" gives the job to the architect
  in terms, and it is the commitment made to that team; the full reading and the two sources that
  agree with it are Discovery 7, along with the thing worth more than the authorship question — a
  criterion here cannot be closed by an artefact in another repo's tracker. So the engineer's part
  is to put the landed distribution address in this handoff at step 13 and nothing further. Pending
  your ruling the clause is recorded as the architect's; the amendment reaches you with his m05-t01b
  item, and nothing waits on it, since the comment cannot post before step 13 anyway. **It is one
  amendment covering three defects in the one clause**, each found by reading a source rather than
  by argument: its **author** (the architect, by #74's "Done when"), its **trigger** (two updates —
  the prediction correction here, the landed mainnet address at t02/t03 — because their M4 is the
  mainnet gate), and its **closure shape** (the clause is met by this handoff carrying the address,
  never by another repo accepting a comment). Discovery 7 has the citations for all three.

- **Step 10 — which mainnets does the signing app list for the Ops vault?** The coordination service
  holds a `wallets` row for all four (1, 10, 8453, 42161) and for the stretch pair, read 2026-11-19.
  Whether the app you sign in lists each of Ethereum, OP Mainnet, Base and Arbitrum One is your
  reading, not one that can be taken from the service. **No transaction in this task depends on the
  answer**; it is recorded in § 1's table when given. A chain with a row but without the app is a
  runbook change before deploy day, not an improvised on-chain `approve(digest, true)`.

## Open questions

None. M05-D1 runs on the milestone's default, option (1), as `TASK.md` § Open questions states;
Part A stands under either option, so nothing here blocks on the ruling.
