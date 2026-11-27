# M05 close-out — criteria 1–8 re-run on `main`

Run by the architect on 2026-11-26 (18:08–18:20 CST; 00:08–00:20Z on the 27th) against `main` at
**`9bacc30`** (the merge of [#439](https://github.com/dnznlabs/rake/pull/439), decision 73), forge
`1.7.1-dev`, node `v24.12.0`, solc `0.8.38`, every command through `devbox run --` in a worktree at
that commit. Public endpoints: `ethereum-rpc.publicnode.com` (block 26,502,861 at the read),
`base-rpc.publicnode.com` (62,738,798), `ethereum-sepolia-rpc.publicnode.com` (12,219,856) and
`base-sepolia-rpc.publicnode.com` (64,081,389). Every figure below is from this run unless its row
says whose reading it is. Where `MILESTONE.md` and this file disagree, `MILESTONE.md` wins.

**M05 closes on this file's merge.** Every criterion is met as re-scoped by decision 70: the
mainnets are Base and Ethereum, and "all six" reads as those two and the two testnets. Three
readings are the engineer's and were not re-run here; they are named in their rows.

## Results

| # | Criterion | Result | Evidence |
|:--|:----------|:-------|:---------|
| 1 | The addresses carry code on every chain, and they are the same | **pass** | `make attest` exit 0, "every recorded address holds the bytes this tree builds": on 1, 8453, 11155111 and 84532 the factory matches this tree outside 3 immutables, `Distribution` outside 2, and `App` byte for byte. `cast codesize` **1,319 / 9,277 / 7,154** at `0x00D19609…7f8E`, `0xc4eD7EA2…cB0A`, `0x00a9F390…25BA` on all four; `implementation()` is `0xc4eD7EA2…cB0A` on all four; `App.owner()` is the Ops vault, `locked()` `false`, `version()` `v0.1` on all four |
| 2 | Verified on the explorer and on Sourcify | **pass** | Sourcify v2, twelve of twelve `match: exact_match` with `runtimeMatch: exact_match`; `creationMatch` is `exact_match` for eleven and `null` for Base's implementation, as m05-t02 recorded. **Explorer half is the engineer's reading** (m05-t03, 2026-11-26): `getsourcecode` on chain 1 and 8453 returns all six with source at `v0.8.38+commit.1835d247`. The architect holds no explorer key |
| 3 | The document on chain is the bundle, and a gateway serves it | **pass** | Per chain, `make dapp-nodev` then `chain-doc`: `inflated sha256` equals the build on all four — **`52a8602c…4b1bb89e`** (1, 170,381 B), **`e9af3eaa…c4c4f556`** (8453, 170,384), **`fbd05198…49043549`** (11155111, 170,387), **`525f4e3f…e2011d08`** (84532, 170,385) — and the widget is **`044139b7…961b37f1`** everywhere; `chunkCount()` 3, `widgetChunkCount()` 1. `RUNBOOK.md` § Uploads has twelve rows, 1 to 10 with 6a and 6b. **`gateway-check` against w3link is the engineer's reading** (m05-t03): passes on Ethereum, Base and Base Sepolia; Sepolia answers 400, shown to be that host's ([#411](https://github.com/dnznlabs/rake/issues/411)) |
| 4 | DNZN's distribution is live under the Ops vault | **pass** | On all four chains `predict($DNZN_SALT)` is `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199` with 45 bytes of code; `owner()` the Ops vault; `description()` `DNZN // FUND DISTRIBUTION`; `beneficiaries()` treasury `0x00b6E7D1…` 2,000, ops `0x00c0e887…` 4,000, creator `0x357836fF…` 4,000, ascending. `delay()` **604800** on 1 and 8453, **86400** on the testnets (decision 42). One `distribute` ran on Base from the Product Owner's 0.001 ETH deposit on 2026-11-26: `0xee99eb54…8ecfdd5` then `0x6564ba6e…30f06b83`, read by the architect that day |
| 5 | Served under dnzn.dev and embedded | **pass** | `https://rake.dnzn.dev/<chain>/widget.js` answers 200 with 8,525 bytes at `044139b7…` on all four chains; the worker's `default` is `"1"`, so `/` ends on Ethereum. **`make verify`'s eight `site` lines and `check-site` 27 of 27 are the engineer's readings** (m05-t03, after the 21:56Z deploy). The embed is decision 73's: `https://research.dnzn.dev/tmp/rake-widget-test.html` answers 200 and is byte-identical to `tasks/m05-t04b/host/index.html`; rendered with no wallet it shows DNZN's table from Ethereum ([screenshot](tasks/m05-t04b/embed-ethereum.png)) |
| 6 | The runbook is amended by what happened | **pass** | `RUNBOOK.md` carries § Executed on mainnets with both chains' records through steps 4, 4d, 7 and 8; § Uploads rows 9 and 10; § 0's 1 gwei stop on Ethereum (`:125`); § 4c's gas-limit read-back, added for Base's missed margin (m05-t03 Deviation 1); § The gateway's second endpoint question |
| 7 | Public records say so | **pass** | `grep -c -i 'No mainnet deployment' README.md` → **0**; § Deployment Status has a live row for Ethereum and Base with document hashes; § Release Info says the document is on all four. The sibling project's payee issue carries the architect's comment naming the four chains and `0xB611…5199` (posted 2026-11-27 UTC, on that project's own issue) |
| 8 | Carried out and clean | **pass** | `gh issue list --label carried --label m05 --state open` prints nothing, after the sort the Product Owner approved on 2026-11-26 (§ Carried issues). `forge build --force` exit 0, no warning; `forge test` **125 passed**, 0 failed, 0 skipped; `forge snapshot --check` exit 0; `forge fmt --check` exit 0; `make test` exit 0 with 419 node tests; `make deploy` and `make chain-doc` on a fresh anvil exit 0 with `inflated sha256` equal to the nodev build; `git status --porcelain` empty after all of it. CI is green on `9bacc30`. `ROADMAP.md` carries M05-D1 to M05-D4 as decisions; M05-D3 was ruled 2026-11-18, eight days before Phase 3's first mainnet transaction |

## What a reader should know that the table does not say

- **The mainnets are two, not four.** Decision 70 re-scoped the milestone on 2026-11-22. OP Mainnet,
  Arbitrum One, MegaETH and Robinhood Chain hold none of these contracts, and nothing in this file
  is a claim about them. An address there can only ever hold these bytes, so nothing is lost by
  waiting.
- **`App` is unlocked on all four chains.** The Ops vault, 2 of 4 behind a one-hour delay on the
  mainnets, can replace the document. There is no plan to lock it and no item tracks one
  (decision 74, [#441](https://github.com/dnznlabs/rake/issues/441)).
- **Base's three document executes went out without the 30% gas margin** and landed with 4% to 7% to
  spare. Nothing was lost; § 4c now reads the limit back after the first send.
- **The widget asks `window.ethereum` when a mount has no `data-rpc`**, and can report the chain of
  a wallet the visitor is not using ([#289](https://github.com/dnznlabs/rake/issues/289), met by the
  Product Owner on the first version of the embed page). The snippet `#/docs` prints carries
  `data-rpc` and is unaffected.

## Carried issues

Sorted by the architect and approved by the Product Owner on 2026-11-26 (Telegram, 18:07 CST).

| Issue | Where it went |
|:------|:--------------|
| [#241](https://github.com/dnznlabs/rake/issues/241), [#243](https://github.com/dnznlabs/rake/issues/243) | Closed: fixed in m04-t15, and that bundle is the document on all four chains |
| [#287](https://github.com/dnznlabs/rake/issues/287) | Closed: the redeploy gave every chain a featured distribution |
| [#410](https://github.com/dnznlabs/rake/issues/410) | Closed as a duplicate of #411; the README is corrected |
| [#127](https://github.com/dnznlabs/rake/issues/127) | Open, off M05: clean on Base and Ethereum, re-run by whichever task deploys to another chain |
| [#75](https://github.com/dnznlabs/rake/issues/75) | Open, off M05: needs a new contract version (decision 5) |
| [#281](https://github.com/dnznlabs/rake/issues/281), [#282](https://github.com/dnznlabs/rake/issues/282) | Open, off M05: dev tooling and harness notes |
| [#289](https://github.com/dnznlabs/rake/issues/289), [#280](https://github.com/dnznlabs/rake/issues/280), [#341](https://github.com/dnznlabs/rake/issues/341), [#342](https://github.com/dnznlabs/rake/issues/342), [#412](https://github.com/dnznlabs/rake/issues/412) | Open, off M05: one post-mainnet app update, since each is a change under `app/` and so one upload on four chains |
| [#411](https://github.com/dnznlabs/rake/issues/411), [#413](https://github.com/dnznlabs/rake/issues/413), [#417](https://github.com/dnznlabs/rake/issues/417), [#420](https://github.com/dnznlabs/rake/issues/420), [#421](https://github.com/dnznlabs/rake/issues/421), [#432](https://github.com/dnznlabs/rake/issues/432), [#393](https://github.com/dnznlabs/rake/issues/393), [#348](https://github.com/dnznlabs/rake/issues/348), [#221](https://github.com/dnznlabs/rake/issues/221), [#174](https://github.com/dnznlabs/rake/issues/174), [#165](https://github.com/dnznlabs/rake/issues/165) | Open and `carried`, never M05's: post-mainnet, each with its own reason on the issue |

## Dates that start here

- **Decision 45's 90-day clock starts on the day this file merges.** The alpha marks come off 90
  days later if no `bug` issue is filed and no security finding is accepted in that time. One `bug`
  issue is open today, [#412](https://github.com/dnznlabs/rake/issues/412), filed before the close;
  whether it holds the clock is the Product Owner's to say when the 90 days are up.
- **`lock()` has no date.** Ruled on [#441](https://github.com/dnznlabs/rake/issues/441) the day of
  this run: no plan to lock, and it is off the roadmap (decision 74).

## Handed on

Nothing M06 or M07 needs from this milestone is missing. The other four chains are scoped as their
own work on the Product Owner's word (decision 70). The post-mainnet app update named above has no
milestone yet.
