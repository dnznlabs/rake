# m05-t01c — handoff

PR: #386 · Branch: `m05/t01c-step9b-shots` · 2026-11-22

Connect now offers every wallet the browser announces, remembers the pick, holds a disconnect across
a reload, and on a phone with no wallet offers the two links that were tapped on a real device. The
page reloads only on a real chain change, keeps its recent list per chain, shows a delay exactly
rather than rounded, and links both mainnets before either has a document. The code landed in four
merged PRs — [#347](https://github.com/dnznlabs/rake/pull/347) (steps 2–6),
[#367](https://github.com/dnznlabs/rake/pull/367) (4b), [#370](https://github.com/dnznlabs/rake/pull/370)
(4c) and [#384](https://github.com/dnznlabs/rake/pull/384) (9a's driver) — the calldata in
[#376](https://github.com/dnznlabs/rake/pull/376), and the document was uploaded to both testnets and
read back through the gateway before either half of the acceptance run. This branch carries what step
9b and step 10 add: the Product Owner's thirteen screenshots, row (f)'s transaction in `UAT.md`, and
this file.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 · no delay rounded, and an unedited queue field proposes the delay the distribution has | **pass** | `test/delay.test.mjs` 8 cases, `test/widget.test.mjs` 3 more, all in AC 2's run. Live on the uploaded document rather than in tests alone: the distribution row (f) created on 84532 has `cast call 0x85db20197c2da8F569A72B200943202F75692698 "delay()(uint256)"` → **60**, and the page prints **`1m`** (`shots/84532/f-created.png`). Before #370 that read `0h`. |
| 2 · `devbox run -- make test` passes, with the new tests of steps 2 to 5 | **pass** | Run at this branch's head: **exit 0**, forge **125** tests in 7 suites, node **256** tests, 0 failed, 0 skipped. Of those, `test/wallet-picker.test.mjs` is **43** and `test/networks.test.mjs` **4**. |
| 3 · two extensions list both and connect the one picked; one behaves as `main` | **pass** | `test/wallet-picker.test.mjs`: *several announced and none remembered holds no wallet and reads publicly*, *a pick the wallet answers is remembered*, *a single announced wallet is used with nothing remembered*, *a wallet that was picked and then replaced cannot set the account*. Driven: row (w1) on both chains with MetaMask and Trust announcing — the menu names both and no account is requested before a pick (`shots/11155111/w1-menu.png`, `shots/84532/w1-menu.png`). |
| 4 · a desktop with no wallet shows today's sentence and no link | **pass** | `test/wallet-picker.test.mjs`: *the list is empty on a desktop*, *the list is empty when a wallet is found, phone or not*, *the list is offered only over https*, *an iPad is a phone for this purpose, and a Mac is not*. |
| 5 · a phone with no wallet shows a link per wallet that was seen to work and no other, each opening the same page where Connect works | **pass, with one bypass** | Row (w5) on both chains: `no wallet found` with exactly `open in MetaMask` and `open in Coinbase Wallet` (`shots/*/w5-links.png`). Row (w6): MetaMask's browser at `https://rake.dnzn.dev/11155111/` connected as `0x3578…902b`; Coinbase Wallet connected on both chains, reading block 12,192,892 on Sepolia and 62,404,499 on Base Sepolia from inside the shot. **(w6) on 84532 in MetaMask is bypassed** — see § Deviations 3. |
| 6 · a test holds the header's network name with no wallet, and an address saved under one chain id is not listed under another | **pass** | `test/wallet-picker.test.mjs`: *the header names the chain with no wallet, in CHAINS lower case*, *the key carries the chain id*, *an address saved under one chain is not listed under another*, *the list a visitor already had is adopted by the chain they return on*. |
| 7 · `chain-doc`'s `inflated sha256` equals the build on both testnets; two chunks, or three with the third inside the batch; three proposals per chain; a two-chunk payload still byte-identical to `main`'s tool | **pass** | Reconstructed here from the **committed calldata** rather than quoted: the three `addChunk` arguments of each chain are 24,000 + 24,000 + **2,366** bytes, concatenate to **50,366** compressed, and inflate to **159,430** bytes `sha256 190897f5ccc5633bf350cc059de4574af1a09d429cda5c104d45b4c1cf91c10e` on 11155111 and **159,428** bytes `fc61121887df42cca7166e5bc3e31448841f14bf4528b318124af78710cd83e6` on 84532 — the two hashes `chain-doc` read on-chain after the upload ([#377](https://github.com/dnznlabs/rake/issues/377#issuecomment-7085626959)). `4-addWidgetChunk.hex` carries `widget.js` uncompressed, **8,525** bytes, `sha256 044139b7…1b37f1`, identical on both chains. Three proposals per chain, the third chunk inside the batch: § The upload. The two-chunk equivalence is #347's, proven against `main`'s tool. |
| 8 · M04 criterion 6's signoff in the handoff, dated, in the Product Owner's words, naming the rows he drove and the rows he read | **pass** | § The signoff, quoted verbatim from [#302](https://github.com/dnznlabs/rake/issues/302#issuecomment-7090598901). |
| 9 · the driver exits 0 on Sepolia against `https://rake.dnzn.dev`, non-zero on step 9a's control, every 9a screenshot written by that run; on 84532 the amended set | **pass, with (k) pending** | [#384](https://github.com/dnznlabs/rake/pull/384): on Sepolia **fourteen** rows ran and exit 0 — `probe`, (a), (c), (c)'s first-load console figure, (e), (d), (l), (f), (g), (h), (i), (j), (a) with no wallet, (w3) — and **(k) reported itself pending rather than running** (§ Deviations 5), which the driver keeps in `rowsPending` so that `rowsRun` cannot absorb it (`tools/uat/run.mjs:112-115`, `:155`). Both chains' control exits **1** and fails on row (c) as it must. Base Sepolia's amended set — `probe`, (a) both passes, (l), (w3) — exits 0, with (k) in `rowsSkipped` as Sepolia's row by the script's own wording. **15** PNGs in `docs/milestones/m04/tasks/m04-t05/shots/11155111/` against those fourteen rows, because (l) writes two (`l-docs` from inside the row, `l-docs-widget` after it) and (k) writes none; **6** in `…/84532/`. Each was written only after its row's assertions passed. Rows (c), (e) and (g) to (i) on 84532 are **not met, cause [#382](https://github.com/dnznlabs/rake/issues/382)**. |
| 10 · the Product Owner's word on the step 7a preview is on its action issue, dated before the first proposal of step 8, and `grep -c 'phone=' app/dist/index.html` prints 0 for the document uploaded | **pass** | His word was given in chat at **12:48 CST (18:48Z)** on 2026-11-22 and recorded on [#345](https://github.com/dnznlabs/rake/issues/345), which was closed at 19:23Z; the bytes that were proposed were cut from `main` and merged in #376 at **19:36:50Z**, after it. `grep -c 'phone=' app/dist/index.html` → **0**. |
| 11 · `git diff --stat main` touches only the paths the task lists | **pass** | This branch, excluding this file: `git diff --name-only main -- . ':!docs/milestones/m05/tasks/m05-t01c/HANDOFF.md'` → **14** paths, 13 PNGs under `docs/milestones/m04/tasks/m04-t05/shots/` (6 on 11155111, 7 on 84532) and `docs/milestones/m04/tasks/m04-t05/UAT.md`. The task's code and calldata are in the four merged PRs named above; a handoff cannot count itself, so it is named rather than counted. |

## The upload

Executed 2026-11-22 from the Ops vault, one wait per chain (`delay()` 900 s on both), `executeQueued`
in the order 1 → 2 → batch with each receipt read before the next was sent. Full readings on
[#377](https://github.com/dnznlabs/rake/issues/377#issuecomment-7085626959).

**Sepolia** — vault `nonce()` 19, `App` account nonce 4 → 8:

| piece | gas used | tx |
|--:|--:|:--|
| 1 · `addChunk` chunk 0 | 37,493,396 | `0xd6e8c0dc424676796491d65df68237b85bdc889b8dc794ad6d7f0849289dfb6d` |
| 2 · `addChunk` chunk 1 | 37,493,636 | `0xec754783e71533e2ebdf0b1c5c365dc0a4d368d669e9eae7a041ef5f71cfce32` |
| 3 · the batch (`addChunk` 2, `addWidgetChunk`, `setChunks`, `setWidgetChunks`) | 17,387,627 | `0xb4bd33e5b33695a22fa809a98a0232d8964a118cd0ae9779897f4e3c64f9dddf` |

**Base Sepolia** — vault `nonce()` 21, `App` account nonce 4 → 8:

| piece | gas used | tx |
|--:|--:|:--|
| 1 · `addChunk` chunk 0 | 5,313,508 | `0xb9bd50601c28f46274c8b1acad5a41e8b5290a71d7cdc62affd0a4417e98d2ad` |
| 2 · `addChunk` chunk 1 | 5,313,784 | `0xd6f9e8425eaa0fd33332046c78abd82202596124eac3ad27f3817a29ef7585d6` |
| 3 · the batch | 2,538,035 | `0xdaa700db06a43688b323dc4859abb0b19536538aaf04bb695f6ea5867690ee7c` |

**What `make verify` proved, and what it did not.** The four lines quoted on #377 are its `config`
lines — `11155111 config root ok`, `11155111 config widget ok`, and the same pair on 84532 — and that
stage resolves `https://pinned.invalid/` and `/widget.js` through a **locally built, configured
gateway** and compares the result with the bytes `cast` read from the chain (`tools/verify.sh:205-243`
in gw44). It is a statement about the chain's bytes and the gateway build in that checkout. The stage
that reads a deployed host is a different one, `site`, and it runs only when `VERIFY_SITE` is set
(`:168-193`); no `site` line is in the record, so **nothing in that run was a measurement of
`https://rake.dnzn.dev`**. One further stage did not run at all: the browser stage builds with
`esbuild`, whose postinstall is held back by the gw44 checkout's `allowScripts` policy, so it exited
before opening a browser.

**And the deployed gateway does not serve the `widget.js` that was uploaded** — found by the architect
at review and measured again here on 2026-11-22:

| | bytes | sha256 |
|:--|--:|:--|
| on chain, both chains (`4-addWidgetChunk.hex`, and `chain-doc`) | 8,525 | `044139b751a901df06e106d3b8a4c307c745427c3e210ea8f8467f28961b37f1` |
| served at `https://rake.dnzn.dev/11155111/widget.js` and `/84532/widget.js` | **8,509** | **`8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368`** |

Identical on both chains and 16 bytes short of the uploaded file, so what is served is the deployed
gateway's own older copy rather than the chain's. **The redeploy belongs to m05-t04b**, not to this
task, and nothing in this task's criteria depends on it: the rows the Product Owner and the driver
drove are the document's, and the document is current. One caution for whoever measures next: a plain
`curl` of `https://rake.dnzn.dev/<chain>/` returns **9,299 bytes**, byte-identical on both chains —
the bootstrap, not the document, which the service worker resolves — so the root cannot be checked
that way, and only `widget.js` answers a flat fetch with the asset itself.

## Size

Under the pinned toolchain only (`devbox run`, node v24.12.0, zlib 1.3.1); a size read outside the
pin is not a size of the upload, and the same bytes compress about 260 apart under two zlib builds.

| | compressed | chunks |
|:--|--:|--:|
| `main` before this task, 11155111 / 84532 ([#347](https://github.com/dnznlabs/rake/pull/347)'s corrected figures) | 47,659 / 47,657 | 2 |
| this document, both chains, measured from the committed calldata | **50,366** | **3** |

The third chunk is 2,366 bytes and rides inside the batch, so the upload is still three proposals per
chain. A fourth chunk needs more than 72,000 compressed bytes; the stop was not reached.

## The wallets

| wallet | device tried on | listed | why |
|:--|:--|:--|:--|
| MetaMask | the Product Owner's iPhone, Chrome (#334) | **yes** | opens the page in its browser and Connect works |
| Coinbase Wallet | the same iPhone | **yes** | the same |
| Rainbow | the same iPhone | no | opens and connects, then the page cannot read the chain through it — [#342](https://github.com/dnznlabs/rake/issues/342) |
| Trust | the same iPhone | no | does not open the page, and its link host publishes no app-association file |
| Phantom | the same iPhone | no | listed only if step 4a's fix had been shown to stop its reload loop; it was not shown, so it stays off |
| any wallet on **Android** | **no device** | — | the plan's default: the list ships on the iOS readings alone and Android is untried. Decision 67 carries the line. |

## The signoff

Quoted verbatim from [#302](https://github.com/dnznlabs/rake/issues/302#issuecomment-7090598901). He
approved this wording in chat on 2026-11-22 at 21:15 CST and instructed the engineer to post it under
his name; it is his word, posted by another hand, and the issue says so.

> **M04 criterion 6 — signoff. 2026-11-22, Denizen, Product Owner. Document: m05-t01c's, uploaded to both testnets and served from `https://rake.dnzn.dev`.**
>
> I drove rows (w1), (w2), (w4) and (w5) on both chains, (w6) on Sepolia in MetaMask and in Coinbase Wallet and on Base Sepolia in Coinbase Wallet, and row (f) on Base Sepolia from my own wallet — the editor took the table, the wallet estimated and signed `create`, and the page routed to the new distribution and showed its delay as `1m`.
>
> Two rows I bypass by my own word rather than by evidence: **(b)**, whose connected header is visible in the (w2) and (w6) screenshots but which has no shot of its own, and **(w6) on Base Sepolia in MetaMask**, where that phone's MetaMask has no Base Sepolia network and the page's `add it there first` was the correct answer to a `4902`. Neither is a defect and neither is filed.
>
> I read the engineer's 9a screenshots: fifteen rows on Sepolia, six on Base Sepolia. On **84532 rows (c), (e) and (g) to (i) are not met, cause [#382](https://github.com/dnznlabs/rake/issues/382)** — the uploaded document cannot read any distribution's history on that chain. I accept this document with that defect recorded, and **no mainnet document is uploaded before #382 is fixed and the same walk is measured on every chain it ships to.**

## Deviations from the plan

1. **Row (f) was driven with the Product Owner's own addresses, not the script's.** The plan names
   the UAT wallet as owner and the UAT wallet, the engineer's wallet and the `RevertingReceiver` as
   the three beneficiaries. He drove it from his own wallet with `0x5e21…6aCD` "Self" 33%,
   `0xADb3…3Bb9` "Wallet 1" 33% and `0xf39F…2266` "Anvil Burner" 34%, ascending by address, delay 60.
   What the row asserts — the editor accepts the table, `create` lands, the page routes to the new
   address — is what was shown; the addresses are not part of the assertion. Read from the chain:
   `Created` in block 62,405,346, tx
   `0xbe8a7bbf034adba0ed1e1e3332d6a9a2f97f6f3bcd5eaa09439eabf4600ba510`, status 1, distribution
   `0x85db20197c2da8F569A72B200943202F75692698`, `owner()` `0x5e21aC17394c4D22A82acB3168682198B9176aCD`.
2. **Row (b) was bypassed on both chains by the Product Owner**, approved with no screenshot of its
   own (his word in chat, 2026-11-22 21:09 CST, recorded on
   [#302](https://github.com/dnznlabs/rake/issues/302#issuecomment-7090518012)). The connected header
   it asserts is visible in `84532/w2-remembered.png` (`0x3578…902b`) and in
   `11155111/w6-metamask.png`. Recorded as bypassed, not as passed and not as skipped.
3. **Row (w6) on 84532 in MetaMask was bypassed** by the same word. The link opened
   `https://rake.dnzn.dev/84532/` inside MetaMask's browser; the page then answered a `4902` from
   `wallet_switchEthereumChain` with its designed sentence, `your wallet doesn't know base sepolia —
   add it there first` (`app/src/index.html:306-310`), because that phone's MetaMask has no Base
   Sepolia network. The wallet's state, not the page's behaviour; no issue filed. The row stands on
   Sepolia for MetaMask and on 84532 for Coinbase Wallet.
4. **`make verify`'s browser stage did not run** at step 8, and its `site` stage did not run either,
   so the command proved the chain's bytes against a local configured build and said nothing about
   the deployed host — § The upload, where the served `widget.js` is recorded as 16 bytes and one
   hash away from the uploaded one.
5. **Row (k) was not driven; it reports itself pending.** The plan's step 9a lists (k) among the
   driver's rows. There is no published URL for m04-t04's host page — its publication is
   [#303](https://github.com/dnznlabs/rake/issues/303) — and the committed file names **84532's**
   w3link base rather than a `dnzn.dev` one, so even published it would not be the page the row
   describes. The driver asserts what the committed file does carry (two mounts, one with its own
   endpoint, a `widget.js` from a gateway) and returns `pending: true` with the reason, which keeps
   it out of `rowsRun` instead of letting it read as a pass (`tools/uat/run.mjs:112-115`). On 84532
   it is skipped outright as Sepolia's row. **It is run when #303 publishes the page**, and this is
   the only row of step 9a's list that no run has covered.

## Decisions

1. **The signoff's wording was drafted by the engineer and adopted by the Product Owner**, rather
   than written by him from scratch. He read it, approved it verbatim and told the engineer to post
   it; the comment states that on its face. Recorded because "in the Product Owner's words" is a
   criterion and this is how those words came to exist.
2. **The two bypasses above are his rulings, not engineering judgement.** Either could have been
   closed by one more screenshot or one network added to a phone; he chose the cost of recording the
   gap over the cost of re-sitting, and the handoff names each gap rather than rounding it to a pass.

## Discoveries

- **`base-sepolia-rpc.publicnode.com` is capped too**, at 50,000 blocks — `-32701 exceed maximum
  block range: 50000`, measured 2026-11-23. `CAPS` (`app/src/model.js:216`) already matches that
  shape, so #382's endpoint swap gives a **24-window** walk against `MAX_WINDOWS` 40 today, growing
  about 0.86 windows a day: roughly two and a half weeks of headroom, not a fix. Posted on
  [#382](https://github.com/dnznlabs/rake/issues/382#issuecomment-7090024624).
- **Base Sepolia does not prune its logs**, which was the first hypothesis for #382 and is wrong:
  `sepolia.base.org` itself returns the factory's `Created` log at block 61,393,462, about 1.0 M
  blocks and 23 days deep, byte-identical to publicnode's answer. The 200-block cap is the whole
  cause.
- **A queued change's action hash reads like an address** in the history row — the Product Owner
  asked who `0x6688…5e5e` was, and it is `keccak256(abi.encode(action, nonce))`
  (`src/Distribution.sol:224`), printed unlabelled in the same shortened shape as the beneficiary
  addresses beside it. Filed as [#385](https://github.com/dnznlabs/rake/issues/385), rides the next
  upload.
- **The one real-wallet write arrived through an EIP-7702 delegated account.** `0x5e21…6aCD` carries
  23 bytes of code, the delegation marker, so row (f)'s `create` was signed in the wallet and
  submitted by a relayer rather than sent as a plain EOA transaction. The page's `tx()` path is
  unchanged by that, but "a real wallet signed it" means this on his setup, and the next task that
  reasons about `eth_sendTransaction` from his wallet should know.
- **The page never offers `wallet_addEthereumChain`.** A visitor whose wallet lacks the chain is told
  to add it themselves (deviation 3). Not filed; it is a product question, not a defect.

## Open questions

None.
