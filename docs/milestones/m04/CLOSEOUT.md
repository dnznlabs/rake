# M04 close-out — criteria 1–8 re-run on `main`

Run by the architect on 2026-11-19 (20:48–20:55 CST; 02:48–02:55Z on the 20th) against `main` at
**`2f93d26`** (the merge of [#295](https://github.com/dnznlabs/rake/pull/295), decision 63), forge
`1.7.1-dev`, node `v24.12.0`, solc `0.8.38` as `foundry.toml` pins it, every command through
`devbox run --` from the repo root of a worktree at that commit. The script is the architect's own
(`tmp/m04-closeout-lakos.sh` and three addenda in their workspace, not tracked here); every figure
below is from that run's log, not quoted from a handoff. Public RPCs:
`ethereum-sepolia-rpc.publicnode.com` for Sepolia (block 12,172,560 at the read) and
`sepolia.base.org` for Base Sepolia (block 61,105,545). Where `MILESTONE.md` and this file disagree,
`MILESTONE.md` wins.

**M04 does not close on this run.** Four criteria have a clause that fails or was never met, and
none of the four is softened below: criterion 1's artifact comparison and its DNZN address, criterion
3's hosted gateway on Sepolia, criterion 5's published URL, and criterion 8's comment on
state-collection#74. Each is either a consequence of a ruling already on record (decision 54,
M05-D1, decision 63) or waits on one action of the Product Owner's; § Open at close-out names them.

## Results

| # | Criterion | Result | Evidence |
|:--|:----------|:-------|:---------|
| 1 | The four addresses carry code, and they are M03's | **fail on two clauses**, pass on the rest | *Code at the three contracts, both chains:* `cast codesize` **1320** at `0x00D18B5b…`, **9271** at `0x31dd18b4…`, **7155** at `0x00A90943…`; `implementation()` → `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0`; `App.owner()` the Ops vault, `locked()` `false`, `version()` `v0.1`. *Against the artifact — fail as written:* `forge inspect … deployedBytecode` on `main` (`0.8.38`, since [#201](https://github.com/dnznlabs/rake/pull/201)) differs from the chain by **1,088** of 1,320 factory bytes and **6,475** of 7,155 `App` bytes, on both chains; the same comparison against a build of `08b3304` (the m04-t03 merge, solc `0.8.34`) in a second worktree gives **60** differing factory bytes, **0 of the 60 outside** the three `immutableReferences` spans (`275+32`, `865+32`, `940+32`), and **0** differing `App` bytes. The chain carries M03's bytes; `main` no longer compiles to them, which is M05-D1's premise. *DNZN — fail:* `predict(DNZN_SALT)` on the deployed factory → `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f` on both chains, and `cast codesize` there is **0** on both: step 6 never ran on the M04 factory (decision 54 gives the `create` to the Creator key in m05-t01 Part B, at the re-mined factory, where the prediction is `0xB611Ff19…`). No distribution exists at the address, so its `owner()`, `delay()` and table cannot be read; the only DNZN distribution on either chain is decision 50/51's `0x71a4…7a4A` (45 bytes, `owner()` `0x357836fF…902B`, `delay()` 3600, `description()` `DNZN // FUND DISTRIBUTION`, both chains), whose values are decisions 50 and 51's, not M04-D2's. *Receipts re-read from the chain:* factory `gasUsed` **16,789,404** (Sepolia, block 12,091,537) and **2,380,182** (Base Sepolia, 56,161,390); `App` **11,506,694** (12,091,543) and **1,655,660** (56,161,508), all `status true`, all equal to `RUNBOOK.md` § Record. |
| 2 | Verified on the explorer | **pass** | Etherscan v2 `getsourcecode`, six of six: `ContractName` `DistributionFactory` / `Distribution` / `App`, `CompilerVersion` `v0.8.34+commit.80d5c536`, on 11155111 and 84532. Sourcify v2, six of six `match=exact_match`, `creationMatch` and `runtimeMatch` both `exact_match`, `verifiedAt` 2026-11-17 05:56–05:59Z. `forge verify-contract --watch` was not re-run: a re-submission answers `is already verified`, and the explorer's own answer is the proof the criterion names. |
| 3 | The document on chain is the bundle, and the gateway serves it | **chain half pass; hosted gateway fails on Sepolia** | *Chain half, per chain:* `chain-doc` `inflated sha256` **`b1fc3b96…e5ef1e86`** (Sepolia, 145,765 bytes) and **`6f0225bb…ff45336f`** (Base Sepolia, 145,763), `widget sha256` **`8b6bbc88…108bc368`** 8,509 bytes status 200 on both — equal to `sha256sum app/dist/index.html` and `widget.js` of `make dapp-nodev` for that chain at **`3751211`**, the commit § Uploads rows 3–4 name. Against `main`'s own bundle the document differs (`5b298120…` / `b081be52…`, 150,842 / 150,840 bytes; widget equal): `main` carries m04-t14's R18, m04-t15 and m04-t16, none uploaded, by design — m05-t01 step 14 is the upload (decision 63). *Hosted gateway:* `/` **200** `text/html` with `web3-resolve-mode: resourceRequest` and `web3-mode-auto-method: request`, `/widget.js` **200** `application/javascript`, `/nope` **404**, `cache-status: miss`, on both chains. **Base Sepolia: `make gateway-check` against `https://0x00a9…5bae.84532.w3link.io` with the `3751211` bundle, all assertions passed** (body 70,133 bytes; widget 8,509 = chain). **Sepolia: 2 assertions failed** — the gateway serves **69,053** bytes against `html()`'s 62,265 after the 7,872-byte block is removed, and a **8,132**-byte widget (`07e808ed…`) against the chain's 8,509: the 2026-11-17 document, stale since the 2026-11-18 upload, [#242](https://github.com/dnznlabs/rake/issues/242)'s third-party condition, unchanged since decision 63 recorded it. |
| 4 | The history survives a capped provider | **code half pass; browser half not re-run** | `node --test test/model.test.mjs` **46 passed**, of which **10** are the `windows`, `rangeCap` and `isPruned` tests (`:399–461`); the three provider strings (`exceed maximum block range`, `limited to a`, `pruned history unavailable`) appear **9** times in that file and **2** in `app/src/index.html`; `MAX_WINDOWS = 40` at `:252`; `history before block` **1** and `load older` **6** occurrences in `index.html`. The MetaMask reading on both chains (the `Created` row and the `create` deposit through the wallet's default RPC) is a browser observation this host cannot make; it is not re-run here. [#76](https://github.com/dnznlabs/rake/issues/76) is closed. |
| 5 | The widget is embedded on a host we do not serve | **fail — no published URL** | The tracked page `tasks/m04-t04/host/index.html` is right: `grep -ci 'w3link.io/widget.js'` → **1**, `data-rake=` → **2** (one distinct value, `0x71a4…7a4A`), `theme.css\|index.html\|localhost` → **0**; `shots/host-headless.png` 66,380 bytes. But `curl -s <url>` cannot be run: the repo records **0** published host-page URLs (m04-t04 AC (e) `not met — Denizen: pending`; m04-t05 row (k) `pending on t04 (e)`), and no screenshot with a wallet exists. Decision 41 makes publishing Denizen's step; it has not happened. § Open at close-out. |
| 6 | Denizen has used it from a wallet and signed off | **transferred** (decision 63) — not a pass | `ROADMAP.md` carries decision 63 once (`:994`); `UAT.md` exists (63 lines); steps 0–2 merged as [#252](https://github.com/dnznlabs/rake/pull/252) (`66fe915`, 2026-11-18); [#273](https://github.com/dnznlabs/rake/issues/273) and [#274](https://github.com/dnznlabs/rake/issues/274) closed 2026-11-19 by m04-t16 ([#286](https://github.com/dnznlabs/rake/pull/286), `3849cb2`); the wallet run is m05-t01 step 18b and the signoff line is that handoff's (`MILESTONE.md` § Phase 4 Signoff). What M04 proves on this criterion is the script and the headless run, nothing from a wallet. |
| 7 | The runbook is amended by what happened, not annotated | **pass** | `git log 7b7aa30..2f93d26 -- RUNBOOK.md` → **42** commits, `1 file changed, 1376 insertions(+), 48 deletions(-)`; **16** headings added (§ Which run is this, § Step 4 — the document, via the Ops vault with 4a–4d, § Uploads, § Executed on testnets with two § Record tables, the runtime comparison, base fees, explorer verification, step 6) and **1** removed (the pre-vault § Step 4); `record:` **25** occurrences. m04-t03's four deviations each name their hunk (§ Deviations 1–4); t08's two route changes and t10's two entry points are § Step 4 and § Uploads. § What the runbook changed lists them for M05. |
| 8 | Carried out and clean | **pass on three clauses; the fourth not met** | `gh issue list --label carried --label m04 --state open` printed **`243 241 174 165 127`** at the start of the run and **nothing** at 02:53Z after the five relabels of § Carried issues (14 `carried` issues open in all, 11 labelled `m05`, 3 with no milestone). `git status --porcelain` **empty** after `forge build --force` (0 warning lines), `forge test` (**124 passed**), `forge snapshot` (`.gas-snapshot` unchanged, 123 rows), and `make deploy` then `make dapp-nodev` and `make chain-doc` on a fresh anvil on port 8573 (`inflated sha256 f804d92a…`, widget `8b6bbc88…` 8,509 bytes, status 200). CI on `2f93d26`: `ci completed success`. **state-collection#74 carries 0 comments** — the comment is drafted in § For state-collection#74 and is not posted; and what it would say is that *no* chain carries code at `0x6aC98EDA…`. |

Gates at `2f93d26`, for the record: `forge test` 124 passed (`forge test --list` 124), node 188
passed across `test/*.test.mjs`, `.gas-snapshot` 123 rows of which 4 `testFuzz_`, `forge snapshot
--check` exit 0 both plain (124) and with `--no-match-test 'testFuzz_'` (120) — the fuzz rows did not
move on this host, so no row was filtered to get the green; `forge fmt --check` exit 0; `forge lint`
after `forge build --force` prints one line, `No files changed, compilation skipped`, no finding;
`make slither` `0 result(s)`. Deployed bytes on `main` (solc `0.8.38`): `Distribution` **9,277**,
`DistributionFactory` **1,319**, `App` **7,154**; on both chains (solc `0.8.34`): **9,271** /
**1,320** / **7,155**.

## Two things a reader of criterion 1 will trip on

**The artifact comparison must be made against a `0.8.34` build.** `main` has compiled with solc
`0.8.38` since #201 (2026-11-17), with no `src/` change, and the two testnets carry the `0.8.34`
bytes m04-t03 deployed. A `forge inspect` on `main` therefore differs from the chain in most bytes
and proves nothing either way; the 60-byte / 0-byte result above comes from a worktree at `08b3304`.
M05-D1 redeploys both testnets from the `0.8.38` bytes, after which the comparison is against
`main` again.

**`0x6aC98EDA…` is the right prediction for the M04 factory and the wrong address for M05.** The
deployed factory answers it for `predict($DNZN_SALT)` on both chains, so M03's prediction held; it
is codeless because the `create` was never sent there (decision 54, m05-t01 Part B), and the re-mine
moved the factory, so the address M05 creates at is `0xB611Ff19…` (`RUNBOOK.md` § 0). Nothing will
ever be created at `0x6aC98EDA…`; state-collection's gate has to move with the factory.

## What the runbook changed — handed to M05

`RUNBOOK.md` at `7b7aa30` (the M04 milestone merge) to `2f93d26`: 42 commits, grouped by what they
did. Seven of them (2026-11-19, [#278](https://github.com/dnznlabs/rake/pull/278), m05-t01 Part A)
are M05's own and are listed because they sit in the same range.

1. **Two entry points.** § Which run is this: Run A (the contracts, steps 1–7) and Run B (the
   document, step 4 alone), with Run B's five-variable § 0 list and `APP` read from README rather
   than predicted (`0adba37`, `12d03ca`, m04-t10).
2. **Step 4 is an Ops vault action, permanently** (decision 44), rewritten as 4a–4d: the engineer
   proposes, the Product Owner signs, submit-wait-execute through the threshold route behind the
   vault's one-hour delay, the engineer verifies by byte comparison of each pointer's code against
   the committed calldata (`ad7371d`, `80eb60e`, m04-t08). **Three proposals per chain, not one
   `batch`** — the coordination service caps a proposal at 65,536 hex characters (decision 47,
   `d8ae357`, [#188](https://github.com/dnznlabs/rake/issues/188)). `executeQueued` enforces no
   order; the swap gate is content equality, not code presence (`f7e92dd`, `a0a0f0c`, `32ccc12`).
   § Gas keeps the hand-set table as a fallback and prefers estimate-then-send (+30%), since every
   live estimate ran within 2.42–8.32% of `gasUsed` across twelve calls. The `ENGINEER` variable in
   § 0 fills step 4's `isOwner` check (`4da921f`).
3. **§ Uploads**, one row per chain per upload with the generating commit, `App` nonce, pointers,
   vault nonces, both hashes, the six transactions and the gas; four rows filled from the chain
   (`0adba37`, `3a70711`, `700ae00`, `13998f9`, `3beba5d`). Reproduce any past upload with
   `--app-nonce`.
4. **§ Executed on testnets**, with § Record per chain, the runtime-versus-artifact comparison, the
   base-fee table (Sepolia charged about 7× cancun for the same init code; Base Sepolia 1.05×), the
   explorer table, and the step-6 block now marked superseded (`e61d4b4` … `3002ba7`, m04-t03).
   Two rules it earned: each step's `record:` line is committed before the next send (§ 2 preamble),
   and step 1g knows two branches — "already deployed by us, record and skip" beside "stop,
   collision" — plus the `ETH_RPC_URL` warning (`325a788`, `02e77f7`, `ec398be`).
5. **Step 5 verifies on Sourcify with `ETHERSCAN_API_KEY` unset**, uploads the OpenChain signatures
   as a step the run performs, and § Record gains both rows (`2abc312`, `cc36435`, `ca043cb`); the
   read-back loop became an assertion (`c3993e0`, [#207](https://github.com/dnznlabs/rake/issues/207),
   M05 Part A).
6. **§ 0.** The salts marked stale after #201 (`72a66a1`) and then re-mined against the `0.8.38`
   bytes with the new addresses (`7c7ace2`, M05-D1); `SIGNER` split into `SIGNER` (`forge script`)
   and `SENDER` (`cast send`, `forge create`), because each command rejects the other's flag
   (`aea59cd`, [#251](https://github.com/dnznlabs/rake/issues/251)); the base-fee stop rule placed
   in § 0 with Ethereum's 1 gwei and no stop on the testnets (`28bd2a1`); step 6's description,
   table and delay read from the live Sepolia distribution and decisions 50, 51 and 54 (`707cbc3`,
   `0e32292`).
7. **§ 1.** The per-chain chunk gas term read keylessly, and step 1e's factory size and the step-6
   signer spelling (`866de50`, `a10ab0a`, M05 Part A).

What M05 inherits from these: Run A and Run B are separate runs with separate variable lists; step 4
costs a vault proposal, a co-signature and an hour per chain, times three proposals; the per-chain
creation pricing is read from the node and the anvil figures are a floor; and the record is written
before the next send, or it is lost — Sepolia's missing step-0 and step-1g readings are the lesson.

## Carried issues

The architect's rule: a milestone is not closed while a `carried` issue labelled with it is open.
Five were, at the start of the run; the dispositions below were applied with one comment each
(2026-11-19, 20:53 CST) and the query printed nothing afterwards. No issue was closed.

| Issue | Disposition | Reason |
|:------|:------------|:-------|
| [#243](https://github.com/dnznlabs/rake/issues/243) first paint and refresh | `m04` → `m05` | Fixed in m04-t15 ([#277](https://github.com/dnznlabs/rake/pull/277), merged 2026-11-19 at `02d456a`); not uploaded — the bundle rides m05-t01's Run B (step 14), and the issue closes on that upload's 4d read. |
| [#241](https://github.com/dnznlabs/rake/issues/241) the rejecting heir read | `m04` → `m05` | Same PR and same upload. |
| [#174](https://github.com/dnznlabs/rake/issues/174) cold-implementation stipend | `m04` removed, no milestone label | Items 1 and 2 landed in M04: the `#/docs` § Limits and `SECURITY.md` F7 sentences and `test/ColdStipend.t.sol`, in [#177](https://github.com/dnznlabs/rake/pull/177) (`7681d35`, 2026-11-08), re-measured at 4,159 under `0.8.38` in #201. Item 3 is a `src/` byte; M05 moves nothing under `src/`, and no scheduled milestone reopens it, so the issue stays `carried` with no milestone until one does. |
| [#165](https://github.com/dnznlabs/rake/issues/165) window budget | `m04` removed, no milestone label | Decision 62: carried post-mainnet with [#221](https://github.com/dnznlabs/rake/issues/221), reassessed after M05's mainnet upload with a per-load figure from a chain that costs something. |
| [#127](https://github.com/dnznlabs/rake/issues/127) native-balance alias (F12) | `m04` → `m05` | Both testnets passed the check in m04-t03 (§ Record, `none` on each); the six mainnet readings are M05's — m05-t02 and m05-t03 re-run the `transfer` assertion per chain and t03 closes it with the six-row table, as M05's own § Carried issues already says. |

## For state-collection#74

Not posted. The issue has 0 comments; this is the text for the Product Owner to approve, then the
architect posts it:

> M04 close-out on rake (2026-11-19): **no chain carries code at `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`.** `cast codesize` reads `0` on Sepolia (11155111) and Base Sepolia (84532), the two chains M04 deployed to. The deployed factory still answers that address for `predict(DNZN_SALT)`, so the M03 prediction held; the `create` was never sent there, because rake's decision 54 gives it to the Creator key in M05, and M05-D1 then re-mined the salts against the bytes `main` compiles today (solc 0.8.38, rake#201), which moved the factory and with it the prediction. **The address to gate on is now `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`**, the same on every chain where the new factory sits (rake `RUNBOOK.md` § 0). rake's m05-t01 Part B sends the first two `create`s on the redeployed testnets and will comment here with the chains and the `cast code` readings once they exist; the mainnets follow in m05-t02 and m05-t03. Until then the answer to this gate is: none.

## Open at close-out

**Criterion 5's URL.** *Question:* does criterion 5 close on the tracked host page plus a URL
published after M05-D1's redeploy, or must the URL exist before M04 closes? *Options:* (1) transfer
to M05 beside criterion 6 — the page's snippet names the M04 `App` address and the `0x71a4…`
distribution, both of which the redeploy retires, so m05-t01 regenerates the file against the new
addresses and Denizen publishes it once; costs one more M04 criterion met by transfer rather than by
measurement. (2) Denizen publishes the current file now; costs a page that goes stale within days
and a second publication after the redeploy. *Recommendation:* (1). *Default and deadline:* (1) if
unanswered when this close-out PR merges; blocks nothing in M05, since the URL is read at m05-t01's
wallet run. *Record:* `ROADMAP.md` § Decisions.

**Criterion 1's DNZN address and criterion 3's Sepolia gateway** are consequences of rulings on
record (decision 54 and M05-D1; #242's third-party condition) and are met, if at all, by m05-t01
Part B on the redeployed testnets. **Criterion 8's state-collection comment** waits on the OK above.

## Handed to M05

- **`src/` is unchanged since `3ad48ec`; the bytes are not.** #201's `0.8.38` pin moved every
  init-code hash, so the three testnet contracts are `0.8.34` deployments that M05-D1 replaces; the
  comparison in criterion 1 is the one to repeat against `main` after the redeploy.
- **DNZN's address is `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`** at the new factory, never
  `0x6aC98EDA…`; state-collection#74 is told so once the comment above is approved.
- **The document on both chains is `3751211`'s** (§ Uploads rows 3–4); `main` is three tasks ahead
  of it (t14's R18, t15, t16), and m05-t01 step 14 is the upload that catches up. Sepolia's w3link
  endpoint serves the 2026-11-17 document regardless (#242); Base Sepolia's is current.
- **The host page is unpublished** (criterion 5); its disposition is the question above.
- **Carried, labelled `m05`:** #243, #241, #127, beside the eight M05 already carried (#279–#282,
  #287–#289, #293). Carried with no milestone: #174, #165, #221.
- **Not re-audited:** `src/App.sol`, `scripts/forge/Deploy.s.sol`, `DeployApp.s.sol` — as M03's
  close-out said; M04 added Slither (0 results at `2f93d26`), seven invariants, the front-end review
  (`SECURITY.md` § Front end) and, in M05 Part A, the threat model, coverage floor and mutation
  campaign. Decision 55 makes the self-review the review of record.
