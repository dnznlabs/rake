# m05-t03 — The document on Base, then on Ethereum

Milestone: [M05](../../MILESTONE.md) · Phase: 3 — The documents

`App` on Base and on Ethereum serves the dapp m05-t01d put on the two testnets, uploaded through the
Ops vault and read back byte for byte, and `rake.dnzn.dev` serves both with `/` landing on Ethereum.
On Base the first real deposit has been distributed, and the Product Owner has signed Phase 3 off.

## Plan

Every command runs from the repo root through `devbox run --`, in a worktree of its own, with
`RUNBOOK.md` § 0's Run B list set per chain. **Base (8453) is taken end to end first, steps 2 to 8,
and Ethereum (1) starts only after step 8's stop has cleared.** Before anything outward on this
task, read the chain or the Actions run list, never the session's memory of it.

Read on 2026-11-26 at `main` `f34bd95`, to be re-read and not quoted: on both chains `App`
`0x00a9F390A6010d045e0d34856048DdD6910d25BA` has account nonce **1**, `chunkCount()` 0 and
`locked()` false; the Ops vault is 2 of 4 with `delay()` **3600**, `nonce()` **3**, the engineer an
owner; the coordination service has a `wallets` row for each. `make dapp-nodev` builds a
three-chunk document for each (53,805 and 53,806 bytes of gzip), so each upload is three proposals,
`batch3456.hex`, four pointers at `App`'s CREATEs 1 to 4, and the nonce moves 1 → 5. One
`addChunk` of 24,000 bytes estimates **5,343,383** gas from the vault on both chains.

1. **Preconditions, both chains, nothing sent.** `git fetch`; `git diff --quiet 4fb6296 origin/main
   -- app/` must be silent, or stop: the document is the one m05-t01d accepted and nothing else
   (§ Open questions). § Step 4's four precondition reads per chain. `node tools/rpc-depth.mjs
   --chain 1` (§ The gateway). Per chain, the engineer key's balance against the three
   `executeQueued`: `cast estimate` each committed piece from the vault once step 2 has cut them,
   sum, multiply by the chain's base fee with step 1e's multiplier, and on Base add the L1 data fee
   read from the `GasPriceOracle` predeploy for each piece's calldata. Check: balance is at least
   twice the need on that chain, or stop and say what is short.
2. **Cut Base's calldata**, § 4a in full: `make dapp-nodev CHAIN_ID=8453`, `step4-calldata.mjs
   --chain 8453 --app $APP --rpc "$RPC" --out calldata`, the target check, and § 4a's five
   address-set readings. Check: `APP_IN` equals `$APP`; factory, `App` and implementation hold
   1,319 / 7,154 / 9,277 bytes; the featured distribution computed from the document is
   `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199` with `codesize` 45 and equals `predict`.
3. **Rehearse on a fork of Base** before signing: the three pieces from the impersonated vault in
   order, then `make chain-doc` against the fork. Check: three `status 1`, `App` nonce 1 → 5,
   `inflated sha256` equal to the build.
4. **One PR, calldata only**, `calldata/8453/`, with the fork rehearsal and the readings in its
   body. Propose the three digests at the vault's live `nonce()` and read them back from
   `tx_summary` (§ 4a). The digests go to the architect on the PR. From the cut, nothing under
   `app/` or `broadcast/` merges until this chain's last `executeQueued` (decision 71).
5. **The Product Owner co-signs and submits** (§ 4b, § 4c.1): an `action` issue opened by the
   architect once the digests read clean. The batch is a vault self-call and is confirmed outside
   the chat that asked.
6. **Execute** (§ 4c.2–3): read `delay()`, wait it once from the third submit, then `executeQueued`
   three times in the order 1 → 2 → batch, each gate read as chunk contents before the next is
   sent. Check: § 4d, `chain-doc`'s `inflated sha256` and widget hash equal to the build.
7. **The gateway, § The gateway steps 1 to 5 for 8453**: `deploy/gw44.json` gains the chain and
   `default` stays `11155111` (decision 70: Base never takes `/`); `deploy/chains.json` gains two
   keyless endpoints, each asked `eth_chainId`; local build; `expect`; verify-only, then deploy.
   Then `make check-site` in three engines and `make verify` with `VERIFY_CHAINS="11155111 84532
   8453"`. Check: nine cases per engine; `site` lines `ok` for root and widget on all three chains,
   the run timed after the deploy. Then `make gateway-check` against
   `https://<App>.8453.w3link.io/`; a failure there is classed by § 4d's rule and recorded, not
   re-uploaded.
8. **Base's first deposit and `distribute`, and the stop.** An `action` issue for the Product
   Owner: open DNZN's distribution at `https://rake.dnzn.dev/8453/` from his wallet, deposit, press
   `distribute`, and say what he saw. The engineer reads the two receipts and the three balances
   that moved. **Stop here.** Ethereum starts on the architect's word after reading Base's record;
   any deviation on Base is a `RUNBOOK.md` change first.
9. **Ethereum, steps 2 to 7 again with `CHAIN_ID=1`**, and these differences. Read the base fee
   against § 0's stop rule before every send, the three `executeQueued` included. In step 7
   **`default` becomes `"1"`** (decision 70), `VERIFY_CHAINS` carries all four, and `check-site`
   confirms `/` ends on Ethereum. No deposit is asked for on Ethereum.
10. **Records, in the PR that carries the handoff:** § Uploads, one row per chain in rows 7 and 8's
    form with all twelve hashes; § Executed on mainnets, the upload per chain; `README.md`
    § Deployment Status and § Opening the App for both chains, the latter correcting the retired
    address ([#411](https://github.com/dnznlabs/rake/issues/411)); the open-browser reading
    gw44#85 waits for, taken across one of the two deploys. `HANDOFF.md` with the Product Owner's
    word from step 8.

## Acceptance criteria

- On Base and on Ethereum, `make chain-doc`'s `inflated sha256` equals `sha256sum
  app/dist/index.html` for that chain's `make dapp-nodev` build and its widget hash equals
  `sha256sum app/dist/widget.js`; `chunkCount()` is 3, `widgetChunkCount()` 1, `locked()` false
  (milestone criterion 3).
- `git diff 4fb6296 <each chain's generating commit> -- app/` is empty.
- gw44's `make verify` with `VERIFY_SITE=https://rake.dnzn.dev` prints `ok` on the `site` lines for
  root and `widget.js` on 1, 8453, 11155111 and 84532, from a run timed after the last deploy;
  `make check-site` passes nine cases in Chromium, Firefox and WebKit; `/` ends on chain 1
  (criterion 5, first clause).
- `make gateway-check` against w3link passes on each mainnet, or the failure is shown to be the
  gateway's by the same three readings m05-t01d used (our gw44 build 200, `request()` 200 through
  our endpoints, the other chain 200 on the same host).
- One `distribute` has run on Base from a deposit the Product Owner made, both hashes read with
  `cast receipt` (criterion 4, last clause), and Phase 3's signoff line carries his dated word.
- § Uploads has a row per chain with twelve hashes read from the vault's logs; § Executed on
  mainnets records each upload; README § Deployment Status shows the document live on both
  (criteria 6 and 7).
- `git diff --stat main` touches only `calldata/1/`, `calldata/8453/`, `deploy/`,
  `.github/workflows/deploy-gateway.yml`, `RUNBOOK.md`, `README.md`, `docs/ROADMAP.md` § Decisions
  and this directory.

## Out of scope

- Anything under `app/`, `src/`, `test/` or `tools/`. A defect found on a mainnet page is an issue
  and a stop, not a fix here: a fix is a new document, a new preview and a new upload on four
  chains.
- [#412](https://github.com/dnznlabs/rake/issues/412), [#420](https://github.com/dnznlabs/rake/issues/420),
  [#421](https://github.com/dnznlabs/rake/issues/421), [#417](https://github.com/dnznlabs/rake/issues/417):
  post-mainnet.
- `lock()`. `App` stays unlocked; the lock is the close-out's decision issue.
- The embed, the host page and README § Release Info (m05-t04b).
- OP Mainnet, Arbitrum One, MegaETH and Robinhood Chain (decision 70).
- The acceptance driver on a mainnet. It sends five writes a run; mainnet's writes are the Product
  Owner's own in step 8.

## Open questions

- **Does a mainnet upload need its own preview and word, or is m05-t01d's word enough?** ([#425](https://github.com/dnznlabs/rake/issues/425))
  *Options:* (1) **no new preview** while `app/` is byte-identical to `4fb6296`: the mainnet
  documents differ from the previewed ones only in the chain id, `factoryBlock` and the chain's
  endpoints, his § 4b co-signature is the acceptance, and decision 71's freeze runs from each cut;
  costs nothing. (2) **a preview per mainnet build** before the cut; costs a sitting each and shows
  him a page that reads mainnet state for the first time, which is the one thing the testnet
  preview could not.
  *Recommendation:* (1). Step 8 puts him on the Base page with his own wallet before Ethereum is
  cut, which is the look option (2) buys, taken on the uploaded bytes.
  *Default, if nothing is said:* (1); gates step 2.
  *Record:* `ROADMAP.md` § Decisions, as an amendment to decision 71.

## Context

- [`RUNBOOK.md`](../../../../../RUNBOOK.md) § 0, § Step 4 (4a to 4f), § The gateway, § Uploads,
  § Executed on mainnets.
- [m05-t01d `HANDOFF.md`](../m05-t01d/HANDOFF.md): the document, and the two-session lesson in its
  record.
- [m05-t02 `HANDOFF.md`](../m05-t02/HANDOFF.md): the mainnet contracts and both `create`s.
- Decisions 44, 47 (three proposals through the vault), 58 (the mainnet delay), 70 (two mainnets,
  `/` to Ethereum), 71 (the freeze).
- One-way doors: none in this task. An upload to an unlocked `App` is replaced by another upload;
  what it costs is gas and a signing round.
