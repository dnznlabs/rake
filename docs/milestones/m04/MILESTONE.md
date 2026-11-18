# M04 — Testnets

Status: in progress · scoped 2026-11-07 · updated 2026-11-17 (t04 scoped; t11 from #215 and t12 added; t08 2026-11-08, t09 2026-11-12, t10 2026-11-17; t10 done, t11 approved, t12 issue opened, #209 closed, all 2026-11-17; t12 held out of Run B, 2026-11-18; t13 scoped from t04's front-end rollup, 2026-11-17; t05 and t14 scoped 2026-11-18)

`RUNBOOK.md` executed for real, twice — Sepolia (11155111) and Base Sepolia (84532) — so that the
factory, the implementation, `App` and DNZN's own distribution sit at the addresses M03 predicted
(`0x00D18B5b…`, `0x31dd18b4…`, `0x00A90943…`, `0x6aC98EDA…`) on two public chains; the dapp served
from `App` through a `web3://` gateway with nothing of ours in the path; the widget embedded on a
page we do not control the origin of; and Denizen accepting all of it from a browser wallet. It comes
now because M03 made `src/` final and mined the salts against it, so the addresses are fixed and a
testnet deploy is the first thing that can go wrong in public without costing anything but testnet
ETH. It comes before M05 because every deviation the runbook meets here is folded back into it before
it runs on Ethereum, where a surprise costs real money and, for `App`'s address, is permanent.

**The dapp is finished before anything is uploaded.** Phase 1 lands the five `app/` items carried
out of M03 and the one provider limit that is known to bite on a real chain (#76), and only then does
Phase 2 build the bundle step 4 uploads. A dapp change after the upload is not a door — `setChunks`
re-points — but it is another 10.8 M gas per chain and another `chain-doc` hash to record, so the
order is cheaper than the alternative. Nothing under `src/` moves in this milestone: a `src/` byte is
a new factory address and a new mining run (decision 5), which is M03 reopened, not M04.

## Acceptance criteria

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, node from
`devbox.lock`), with `RPC` and `CHAIN_ID` set per chain as `RUNBOOK.md` § 0 does and the § 0
constants unchanged: `OWNER` the Ops vault, `APP_VERSION` `v0.1`, the two mined salts, `CREATOR`
`0x68e0741D…`, `DNZN_SALT` `…0001`. Measured 2026-11-07 against both chains: `cast code` at all four
predicted addresses prints `0x` on both, which is what makes criteria 1–4 criteria. Re-run rather
than quote. "Both chains" means Sepolia and Base Sepolia, every time.

1. **The four addresses carry code, and they are M03's.** On both chains, `cast code` at
   `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` is the factory's 1,320-byte runtime (equal to
   `forge inspect DistributionFactory deployedBytecode` outside the three `immutableReferences`
   spans), `cast call <factory> "implementation()(address)"` prints
   `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0`, `cast code` at
   `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` is `App`'s 7,155-byte runtime byte-for-byte, and
   `cast call <factory> "predict(bytes32)(address)" $DNZN_SALT` prints
   `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f` with 45 bytes of code at it. `App`'s `owner()` and
   the distribution's `owner()` are both the Ops vault; `App.locked()` is `false`; the distribution's
   `delay()` and `snapshot().table` are what decision M04-D2 ruled. Every transaction hash and
   `gasUsed` is in the deploy task's handoff, read from the chain, not from the broadcast log (#140).
2. **Verified on the explorer.** For each of the three contracts on each chain, the explorer's
   `getsourcecode` answer names the contract (`DistributionFactory`, `Distribution`, `App`) and the
   six links are in the handoff; `forge verify-contract … --watch` exited 0 for all six, with `App`'s
   constructor arguments as `RUNBOOK.md` step 5 encodes them. Same compiler settings as
   `foundry.toml`, so the explorer's bytecode match is the proof that the deployed bytes are the
   reviewed bytes.
3. **The document on chain is the bundle, and the gateway serves it.** Per chain, after
   `make dapp-nodev` for that chain: `make chain-doc` reports `inflated sha256` equal to
   `sha256sum app/dist/index.html` and `widget sha256` equal to `sha256sum app/dist/widget.js`;
   `curl -s https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.<chainId>.w3link.io/` is the string
   `cast call <App> "html()(string)"` returns **plus the one `<script>` block the gateway injects
   after `<body>`** (`cmd/server/html.patch`; 7,871 bytes at commit `c582671`, measured on anvil
   2026-11-07 — `make gateway-check` from m04-t02 is the comparison, pointed at the hosted URL),
   with the response headers `Web3-Resolve-Mode: resourceRequest` and `Web3-Mode-Auto-Method:
   request`; and `curl -sI …/widget.js` carries `content-type: application/javascript` with a body
   equal to `app/dist/widget.js`. *Amended 2026-11-07 at t02's rehearsal: the first wording asked
   for byte equality of `/` with `html()`, which no gateway built from that code can give.* The gateway host form is decision 19's; if the hosted gateway's chain list
   differs from its README (both testnets are listed there, read 2026-11-07), the task says which
   gateway it used and why, and criterion 5's snippet names that one.
4. **The history survives a capped provider.** `test/model.test.mjs` holds tests that the log
   reader splits a range into windows, reads a provider's cap out of its error text (measured
   2026-11-07: `exceed maximum block range: 50000` on publicnode's Sepolia, `eth_getLogs is
   limited to a 200 range` on `sepolia.base.org`, `pruned history unavailable` behind publicnode's
   horizon) and retries; the page stops after a bounded number of requests and says `history before
   block N not loaded` with a working `load older`, rather than `history unavailable`. On both
   chains through MetaMask's default RPC, the DNZN distribution's page shows its `Created` row
   under changes and its `create` deposit under activity. This is
   [#76](https://github.com/dnznlabs/rake/issues/76) closed; m04-t01 carries the measurements and
   the constants.
5. **The widget is embedded on a host we do not serve.** A page at a URL the handoff records, on
   the host decision M04-D1 names, contains the two-line snippet `#/docs` § the widget gives for
   Sepolia (`src="https://0x00a90943….11155111.w3link.io/widget.js"`, `data-rake` the DNZN
   distribution) and nothing else of ours; `curl -s <url> | grep -c 'w3link.io/widget.js'` → 1, and
   a browser screenshot in the handoff shows the DNZN table rendered from it, both with `data-rpc`
   and, with a wallet on Sepolia, without.
6. **Denizen has used it from a wallet and signed off, in writing.** From a browser wallet on each
   chain, in a session driven by the UAT script (m04-t05): the dapp loaded through the gateway URL
   of criterion 3 — not `localhost`, not `?rpc=` — connects the wallet (the delivered document has a
   real origin: `window.top === window` and `window.ethereum` present, the probe state-collection
   named and never ran); he creates a distribution with his EOA as owner, pays ETH in, calls
   `distribute`, queues a table change, applies it after the delay, cancels one, and exercises
   `release` or `claim` on an escrowed row; and reads DNZN's distribution, whose owner is the vault,
   with the propose control showing calldata (decision 7). Every transaction hash is in the UAT
   handoff. The signoff is a dated line under § Phases 4 in this file, written by Denizen; the
   milestone is not done while it is absent.
7. **The runbook is amended by what happened, not annotated.** Every deviation the deploy task's
   handoff lists is either a change to `RUNBOOK.md` in that PR or a one-line reason it is not;
   `git log --oneline -- RUNBOOK.md` since this milestone's first commit shows the amendments, and
   § Rehearsed on anvil gains a sibling § Executed on testnets with the two chains' addresses,
   hashes and gas, so M05 reads a record and not a rehearsal.
8. **Carried out and clean.** `gh issue list -R dnznlabs/rake --label carried --label m04
   --state open` prints nothing; `git status --porcelain` is empty after `forge build --force`,
   `forge test`, `forge snapshot`, `make deploy` and `make chain-doc` on a fresh anvil; CI is green
   on the merge commit; [state-collection#74](https://github.com/dnznlabs/state-collection/issues/74)
   carries a comment naming the chains where `cast code` at `0x6aC98EDA…` is non-empty.

## Out of scope

- **Any mainnet.** Ethereum, Base, Arbitrum, OP Mainnet and the stretch row are M05's; this
  milestone sends nothing to a chain where ETH costs money.
- **Any byte under `src/`, `test/*.t.sol` or `.gas-snapshot`.** A finding here that needs a
  contract change reopens M03 (a new review, a new factory address, a new mining run) and is a
  decision for Denizen, not a task here. The two stale contract comments the third review noted
  (`receive`'s stipend line, `_push`'s "bounded by the token") stay for the next version.
- **`App.lock()`, renounce, and any owner change** on `App` or on DNZN's distribution. The runbook's
  § Not in this runbook holds; `lock()` is M05's, after mainnet has been watched.
- **The paid, independent review.** Decision 20 places it at M05's go/no-go; nothing here commits
  the spend. What this milestone adds to that decision is a list of what the two-model method
  missed on three runs (#22, #54, nothing in `App.sol` or the scripts).
- **The dnzn.dev mirror and IPFS** (decision 12's "mirrors of it") — M05. The test host of
  criterion 5 is a host page embedding the widget, not a mirror of the dapp.
- **Owner-kind submit routes** (M06). The vault-owned distribution shows calldata, as shipped.
- **Freedom or any other native `web3://` client** as a criterion. Criterion 3 is the HTTPS
  gateway, decision 19's reason; if a native client is tried, it is recorded, not required.

## Needs from the Product Owner

- **M04-D1, the test host.** *Question:* where does the widget's host page live for criterion 5?
  *Options:* (1) a static page on a host Denizen already runs under dnzn.dev — costs one file on his
  side and nothing public that is new; (2) GitHub Pages from a new public repository holding one
  HTML file — costs a public repo whose only content is the snippet (rake itself is private, so its
  Pages cannot be used); (3) a page served from this VM over a tunnel — rejected: the origin is
  ours and the CSP and mixed-content behaviour of a real host is what the criterion exists to meet.
  *Recommendation:* (1), if a static path under dnzn.dev exists today; it is also where M05's mirror
  will live. *Default and deadline:* (2), opened by the architect, if no answer by the day m04-t04
  is scoped; blocks m04-t04. *Record:* `ROADMAP.md` § Decisions.
  Issue: [#156](https://github.com/dnznlabs/rake/issues/156). **Ruled 2026-11-07: option 1
  (decision 41).** m04-t04 writes the page; Denizen publishes it under dnzn.dev.
- **M04-D2, DNZN's testnet table and delay.** *Question:* what table and delay does step 6 pass on
  the testnets, given the distribution it creates is DNZN's address on those chains for good?
  *Options:* (1) the M05 shape with testnet-safe rows — the roster's three EOAs at 60/20/20 (or the
  60/40 pair if M05's two recipients are already known), `DNZN_DELAY` 3600 to match the Ops vault's
  own timelock; costs nothing and reads as DNZN's on an explorer; (2) the anvil rehearsal's
  placeholders (`rehearsal placeholder`, two anvil accounts) — costs a nonsense table under DNZN's
  name on two public chains; (3) skip step 6 on testnets — rejected, criterion 1 and the
  state-collection gate both need code at the address. *Recommendation:* (1). *Default and
  deadline:* (1) with the roster EOAs and 3600, if no answer by m04-t03's scoping; blocks step 6 of
  m04-t03. *Record:* `ROADMAP.md` § Decisions; the values go into `RUNBOOK.md` § Executed on
  testnets, not § 0 (M05's are different).
  Issue: [#157](https://github.com/dnznlabs/rake/issues/157). **Ruled 2026-11-07 (decision 42):**
  `DNZN // FEE DISTRIBUTION`, delay 86,400 s, 60/30/10 to `0x3578…902B` (Denizen's address, the row
  the ruling calls "Creator" — not the Creator key), Ops and Treasury; written in `_set`'s ascending
  address order in the record. Owner stays the Ops vault.
- **Testnet ETH, two keys.** Steps 1–5 are signed by Elanik's agent wallet
  (`0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`), which needs about **0.1 Sepolia ETH** and **0.02 Base Sepolia ETH**: the anvil
  rehearsal totals 14.7 M gas per chain (factory 2,262,485 + `App` 1,648,295 + chunks 10,820,875),
  and the base fee read on 2026-11-07 was 15 wei on Sepolia and 0.005 gwei on Base Sepolia, so the
  figures are a margin against a busier hour (14.7 M gas at 5 gwei is 0.07 ETH), not a forecast.
  Step 6 is signed by the **Creator key on Denizen's machine**, which needs about **0.005 ETH on
  each** for one `create` (280,281 gas on anvil). Funding is Denizen's; the amounts are estimates
  and the handoff records what was spent.
- **An Etherscan API key** (v2 keys cover Basescan), handed to the engineer's session as
  `ETHERSCAN_API_KEY` for step 5 and never committed; the handoff names the key's last four
  characters and nothing else.
- **Step 6 on both chains, by hand**, from the runbook's § Step 6 with the M04-D2 values, after the
  engineer's handoff for steps 1–5 is reviewed — the only step the Creator key signs (decision 32).
- **Quotes for the paid independent review, now rather than at M05's scoping** — decision 20's
  lead time. Five-line form on [#167](https://github.com/dnznlabs/rake/issues/167): request two or
  three quotes while `src/` is frozen and t07 hardens it, spend nothing until a quote is accepted
  (a second decision); default if unanswered by M04's close-out: request at M05's scoping and let
  M05's estimate absorb the weeks. Blocks nothing in M04.
- **The UAT session and the signoff line** (criterion 6), with a wallet that holds a little testnet
  ETH on both chains and is not the Creator key.

## Phases

In order. Phase 1 must merge before Phase 2 builds the bundle — and t02 must have **passed**, not
merely merged, because a failure there is a contract question and Phase 2 spends gas on an address
that cannot move; Phase 2 before Phase 3 has anything to serve; Phase 3 before Phase 4 has a URL to
accept from. Phase 2's step 6 is Denizen's and can land any time after steps 1–5 are reviewed,
before Phase 4. t01 and t02 are independent and run in parallel. **Added 2026-11-07:** t06
(Slither) is the one more thing Phase 2 waits on — an hour of work, and the last lens that could
still move a `src/` byte before an address exists on a public chain; t07 (invariants) runs beside
Phase 2 and gates nothing in M04, because its finding, if any, is cheaper to act on after a testnet
redeploy than it would be to wait a week for.

### Phase 1 — The dapp that ships

Everything `app/` owes before the bundle is uploaded to a public chain, with nothing under `src/`.

| Task | Goal | Status |
|:-----|:-----|:-------|
| m04-t01 | Log reading in provider-sized windows with a retry on the range error, sized against publicnode and Infura (#76); a `Received` whose `S.grace` is read before `txError` can need it (#148); the widget's expiry judged against the block timestamp it already decodes, or labelled as local time (#149); one sentence under `#/docs` § Limits naming tokens whose balance falls on its own beside the fee-on-transfer one (decision 23, reaffirmed 2026-11-07); `AGENTS.md`'s chromium paragraph re-tested and rewritten (#110); `app/build.mjs` asserting one creation per script before it reads a block from `run-latest.json` (#140). Closes #76, #110, #140, #148, #149 | scoped 2026-11-07 ([TASK.md](tasks/m04-t01/TASK.md)); the provider caps measured at scoping — **200 blocks on `sepolia.base.org`**, 50,000 on publicnode's Sepolia — which turned #76 from a nicety into the item that decides whether the page works on Base Sepolia at all; **done 2026-11-07** ([#164](https://github.com/dnznlabs/rake/pull/164), merge `9eed049`; closed #76, #110, #140, #148, #149, #162): bounded windows that read the cap out of the provider's text, a whole-group partial boundary and `load older`, node tests 67 → 90, widget 8,132 bytes; two plan corrections taken at review — #140's assertion withholds a block rather than killing `make fixtures`, and a pruned refusal bisects rather than stops; the window budget's consequence carried as [#165](https://github.com/dnznlabs/rake/issues/165); MetaMask's own caps moved to t05 |
| m04-t02 | **The gateway in the dev stack, before a single testnet transaction.** [ethstorage/web3url-gateway](https://github.com/ethstorage/web3url-gateway) — the software behind w3link.io — as a third process `make serve` brings up beside anvil and the dapp: `go@1.27` added to `devbox.json` (nixpkgs has 1.27.1; the gateway's `go.mod` asks 1.27.3, so the first build fetches that toolchain the way Go does, or the task pins a commit that does not); a `tools/gateway.sh` that clones the repo at a pinned commit (`c5826718`, 2026-10-23, is `main` at scoping) into gitignored `cache/`, builds `./cmd/server`, and writes its `config.toml` from a tracked template — `RunAsHttp = true`, `ServerPort = $GATEWAY_PORT`, `CORS = "*"`, `pageCache.enabled = false` (a cache hides a re-upload), `defaultChain = 31337`, `[chainConfigs.31337]` at `http://127.0.0.1:$ANVIL_PORT`; a `procs/30-gateway.yml` that depends on `deploy` and probes readiness with a `curl` of the root. The URL form is four labels, `http://0x<App>.31337.w3.localhost:$GATEWAY_PORT/`, because `handleSubdomain` takes the last two labels as the gateway's own host and needs `<address>.<chain>` in front of them (`protocol.go:416-498`); Chrome resolves any `*.localhost` to loopback, `curl` needs `--resolve`. `AGENTS.md` § The dapp and the `#/docs` host page gain the local form. Measure the two things no client has measured yet: the ERC-5219 surface as a real gateway consumes it — `/` is `html()`'s bytes with `text/html`, `/widget.js` is `app/dist/widget.js` with `application/javascript` (Freedom reads `html()` for every path by design, decision 19, so it cannot test this); and wallet reach — the gateway URL opened in Chrome with MetaMask has `window.top === window`, `window.ethereum` present, and one transaction sent from it. Evidence: the `eth_call`s the gateway made, read from anvil's log, and the response headers. **If the 5219 shape fails here, stop:** the fix is a `src/App.sol` byte, which is M03 reopened and Denizen's decision, and it is the reason this task runs before t03 spends gas on an address that cannot move. Pass or fail, the handoff rewrites risks 1 and 2 below with what was measured | scoped 2026-11-07 ([TASK.md](tasks/m04-t02/TASK.md)) — **and rehearsed by the architect the same day on a scratch build: the 5219 surface passes.** Go 1.27.1 from nixpkgs built `c582671` in 13 s; against a dev anvil, `/` answered 200 `text/html` with `Web3-Resolve-Mode: resourceRequest`, `/widget.js` 200 `application/javascript` byte-identical to `app/dist/widget.js`, `/nope` 404; the one surprise is a 7,871-byte script block the gateway injects after `<body>` (criterion 3 amended). **done 2026-11-07** ([#163](https://github.com/dnznlabs/rake/pull/163), merge of `0a1d80e`; closed #161): `go@1.27` in devbox, `tools/gateway.sh` at pin `c582671`, `procs/30-gateway.yml`, `make gateway-check` green with every assertion printed; one correction to the architect's rehearsal — the build needs the 1.27.3 toolchain, which Go fetches; the headless origin probe passed (real four-label origin, `window.top === window`). **Open: the wallet half**, Denizen's three console lines and one transaction from the gateway-served page in Chrome, recorded in the handoff when done; it does not gate Phase 2 and is risk 2's last measurement before t04 |
| m04-t06 | **Slither as the third leg, gating Phase 2** (added 2026-11-07 on Denizen's question whether to review again before the testnets: the two-model method would re-read identical opcodes; a mechanical analyser is a different lens). `slither-analyzer@0.11.5` in devbox, `slither.config.json` scoped as `audits/SCOPE`, every result dispositioned in a new `SECURITY.md` § Static analysis, a tracked triage database so `make slither` exits 0, a CI step. Rehearsed by the architect at `9eed049`: 1.5 s, 23 gated results (2 High, 8 Medium, 13 Low), all apparently known shapes — "apparently" is what the task turns into rows. A `fix` row is a stop: a `src/` byte is M03 reopened, and the point of running it now is to learn that before an address exists on a public chain | scoped 2026-11-07 ([TASK.md](tasks/m04-t06/TASK.md)); **done 2026-11-08** ([#170](https://github.com/dnznlabs/rake/pull/170), merge `a8e9169`; closed #168): Slither 0.11.5 in devbox, 23 gated results dispositioned in `SECURITY.md` § Static analysis — 13 `design`, 7 `false positive`, 3 `covered by F1/F6/F8`, **no `fix`**, `src/` diff empty — plus the 9 the gate excludes; `make slither` exits 0 and runs in CI; row 14 (`owner_` zero check) escalated as [#173](https://github.com/dnznlabs/rake/issues/173) and ruled decision 43, its doc sentence and test carried as [#172](https://github.com/dnznlabs/rake/issues/172). t03 unblocked |
| m04-t07 | **Invariant and fuzz tests on `Distribution`** (same conversation; the highest-value gap: zero `invariant_` tests, zero fuzz signatures today). A handler over the real factory and clone with ghost accounting; seven invariants — table sums to 10,000 and ascends, `reserved` equals the escrow sum, balance covers `reserved` for the admitted token class, conservation of ETH and tokens, no apply outside `[eta, eta + GRACE]` and never twice, renounce is final, the lock is never held at rest — plus four fuzzed unit tests; `[fuzz]`/`[invariant]` in `foundry.toml` under a 60 s CI budget; `SECURITY.md` § Invariants names them. **Not a gate on t03**: a failing property is a stop and Denizen's decision; if it lands after the testnet deploy, the testnets are redeployed at the new address, which is what they are for, still before mainnet | scoped 2026-11-07 ([TASK.md](tasks/m04-t07/TASK.md)); **done 2026-11-08** ([#171](https://github.com/dnznlabs/rake/pull/171), merge `4b6f95b`; closed #169): `test/invariant/` handler over the real factory and clone, seven `invariant_` properties and four `testFuzz` tests, `forge test` 91 → 102 in 13 s (`runs = 256, depth = 200`, all 14 entry points reached, 0 bubbled reverts), no invariant failed, `src/` diff empty; the handler's first campaign queued one action in 51,200 calls and was rebalanced before the properties meant anything (handoff § Discoveries 1); the cold-implementation stipend (4,162 gas vs 2,300) carried as [#174](https://github.com/dnznlabs/rake/issues/174) |
| m04-t09 | **The alpha marker (decision 45), `app/` and README only:** the page version string becomes `0.1alpha` read from `App.version` plus the marker, replacing `build.mjs`'s hardcoded `v0.1`; a Disclaimer section first in `#/docs`; the tag line "alpha software is alpha, act accordingly." in the header and on the landing, every view, linking to it; the word `alpha` in the widget under its byte gate; then the chunks re-uploaded on Sepolia and Base Sepolia so Phase 4 reads the marked page. Nothing under `src/` | proposed 2026-11-12 ([TASK.md](tasks/m04-t09/TASK.md)); baselines on `main` at `8d0e4ab`: no `alpha`, no tag line, no Disclaimer in `app/src/`, `build.mjs:55` the second `v0.1`, widget 8,132 bytes; the README half already on `main` (#181). Version source is the `App` constructor argument in the broadcast log, not a runtime read (no provider without a wallet). Rehearsed the widget edit: 8,144 bytes, 2,096 of headroom under the 10,240 gate. **Must merge before m04-t08's step 1 builds the bundle**, or the testnets take a second upload; the upload itself stays t08's (decision 44) |
| m04-t11 | **History read robustness ([#215](https://github.com/dnznlabs/rake/issues/215)), `app/src/index.html`, `app/src/model.js`, `test/model.test.mjs` only:** a range refusal whose text names no range but whose shape does — the object MetaMask substitutes for a provider answer under an HTTP 413 (`code -32080`, `data.httpStatus 413`), which is how `sepolia.base.org`'s 200-block cap reaches the page on Base Sepolia — is classified by `Model.isWrappedRefusal` and halves like any other refusal instead of ending the history read at its first window; the dev `capped` provider gains `&wrap=1` answering that object verbatim; and the apply control is gated on `snapshot()` alone — the nonce `applyQueued` takes is recovered from the entry's hash by `Model.nonceOf` (`hash = keccak256(abi.encode(action, nonce))`, `src/Distribution.sol:224`), so a ripened action stays applicable while the history sections report their own failure. `MAX_WINDOWS` untouched (#165); the page-chosen read RPC struck on #215. Closes #215 | scoped 2026-11-17 ([TASK.md](tasks/m04-t11/TASK.md)); baselines on `main` at `6394f16`: 102 node tests, widget 8,132 bytes, dapp gzip 45,377, and in the browser through the wrapped shape one request per kind then `history unavailable` with both apply buttons disabled. Rehearsed the same day on a prototype: 106 tests, widget unchanged, gzip +172; `&cap=200&wrap=1` 16 requests per kind with the three sections painted; with every `eth_getLogs` failing, `applyQueued` landed from the page and `pendingCount()` read 2 → 1 → 0. **Ordering:** t11 → t12 → the next Run B, so one signing round carries both; #214's upload had already executed when this was scoped, so the testnets serve the #203 bundle until then and the Base Sepolia workaround is the wallet's RPC on publicnode; task issue [#220](https://github.com/dnznlabs/rake/issues/220) opened 2026-11-17; **in review as [#222](https://github.com/dnznlabs/rake/pull/222), approved 2026-11-17 at `b810fb7`**, Merge: Product Owner; four plan amendments taken at that review are in TASK.md, dated |
| m04-t12 | **The finalized-log cache (decision 52), `app/` and `test/*.mjs` only:** the three raw `eth_getLogs` results a distribution's history is built from kept in one IndexedDB store per chain and distribution, complete to the `finalized` block of the last visit; each load reads `finalized` once, serves the record and scans only the tail above it live, so a second load is one window per kind instead of the 40-per-kind ceiling; eviction by last visit (30 days, 50 records); storage unavailable is today's page; a Cache section on `#/docs` with count, bytes, the rule and a `clear cache` control, its wording a draft under decision 17. Closes #165 against the measured per-load count | **Held (Denizen, 2026-11-18 00:05 CST; decision 52 addendum).** Built as [#227](https://github.com/dnznlabs/rake/pull/227), approved by the architect at `c830f5d`, amended to `ad556ff` for the Product Owner's seven items, then halted before merge: out of the next Run B, which carries t11, t04 and t13; branch kept, labelled do-not-merge; the ship decision follows t05's MetaMask per-load figures and precedes the M05 mainnet document. Scoped 2026-11-17 ([TASK.md](tasks/m04-t12/TASK.md)); task issue [#221](https://github.com/dnznlabs/rake/issues/221) stays open on the branch. The ordering set on #215 (t11 → t12 → upload) is superseded for t12 by the hold; t11 merged 2026-11-17 (`1a5a211`). |
| m04-t13 | **Front-end audit remediation, `app/` and `test/*.mjs` only:** the findings of t04's front-end pass ([`audits/2026-11-17/frontend/AUDIT.md`](../../../audits/2026-11-17/frontend/AUDIT.md), 24 findings, `SECURITY.md` § Front end) whose remedy is a byte in the shipped bundle, fixed at the sink or input with a test red without each — the clone-code check that stops any contract painting as a distribution (R3) and the recent-list crash it feeds (R16); the editor's checksum and basis-point refusals (R5, R7); the widget's `data-rake` shape, `data-link` scheme allow-list, hex check and array bounds (R6, R12, R14); plain-ASCII reverse names (R10); the case-insensitive script guard (R11); bidi controls dropped in `esc` (R15); `tx` re-reading the chain before it sends (R17); and `noreferrer` (R21). Accepted for this release with the reason in the task and in `SECURITY.md`: R4, R8, R18 (build-input validation and the computed featured address, one build-hardening task before M05's mainnet document), R9 and R19 (wording under decision 17), R24 (the widget's public `mount` signature), and the widget halves of R3 and R14 (the one-`eth_call` contract) | scoped 2026-11-17 ([TASK.md](tasks/m04-t13/TASK.md)) under the architect's #225 ruling of the same day (R1 accepted with a decision issue, R2 fixed in [#230](https://github.com/dnznlabs/rake/pull/230), the rest here). Baselines on `main` at `3d4f4cf`, re-run at the branch point: 109 node tests, widget 8,132 bytes, dapp gzip 45,535; the clone's 45 runtime bytes measured on anvil `1.7.1` against `src/Distribution.sol:473-476`. **Ordering:** starts after #230 merges and rebases onto it (R2's `shaped()` is the pattern); merges before the next Run B, so one upload carries t11, t04 and this (t12, #227, is held out of that upload by Denizen's ruling of 2026-11-18) — a second upload is a second signing round and tens of millions of gas on Sepolia. The widget will grow for the first time since M02 (criterion 8: within 10,240, delta recorded). Task issue not yet opened — it opens when #230 merges |
| m04-t14 | **Build hardening ([#235](https://github.com/dnznlabs/rake/issues/235); front-end audit R4, R8, R18), `app/build.mjs`, `app/broadcast.mjs`, a new `app/values.mjs`, `app/src/index.html` for R18 only, `test/*.mjs` and the three `SECURITY.md` rows:** every value the build substitutes has a declared shape checked whatever its source (`--set`, a broadcast log, a default), so no quote or markup reaches the `CFG` literal; every creation through the keyless proxy is recomputed from the log's own init code and salt and the implementation from the factory's `additionalContracts`, a `--set` that overrides a log value says so, and a contract name seen in two script directories is refused instead of the last winning (R4); `pairable()` checks the hash join — unique hashes, one receipt per hash, the creation's block from its own receipt (R8); and the docs page computes the featured address from keccak, the factory address, the implementation as a build constant and the salt, refusing the support form when the provider's `predict()` differs (R18). A test red without each rule, planted once and quoted | scoped 2026-11-18 ([TASK.md](tasks/m04-t14/TASK.md)); live on merge, no upload for R4/R8; must merge before M05's mainnet document; task issue #235 is the carried issue and the task issue opens when this merges |

### Phase 2 — The runbook, for real

`RUNBOOK.md` steps 1–5 on Sepolia, then Base Sepolia, by the engineer; step 6 by Denizen.

| Task | Goal | Status |
|:-----|:-----|:-------|
| m04-t03 | Steps 1–5 on both chains in the runbook's order, each `record:` line filled from the chain: the offline prediction before any transaction, the proxy-sender check, `cast call --create` as the EVM proof, the collision check, the factory, `App`, `make dapp-nodev` for that chain then `Chunks.s.sol` and `make chain-doc` with the hashes equal, explorer verification of all six. Every deviation is a `RUNBOOK.md` change in the same PR (criterion 7) and § Executed on testnets is written. Then the handoff hands step 6 to Denizen with the exact command, the M04-D2 values and the `cast code` check that must print `0x` first | scoped 2026-11-07 ([TASK.md](tasks/m04-t03/TASK.md)), t01 and t02 both merged with t02 passing; **step 0 refuses to start until Denizen funds Elanik's wallet** (`0x5A158aF8…`: read 2026-11-07 at 0.0049 Sepolia ETH and 0 on Base Sepolia; the ask is 0.1 and 0.02) **and the Creator key** (0.005 each, 0 today) **and hands the engineer's session an Etherscan API key** (both done 2026-11-07: 0.1049 / 0.0100 Sepolia / Base Sepolia on Elanik's wallet, 0.01 / 0.01 on the Creator key; the key in `../shared/.envrc.local`); **and waits on m04-t06's merge** — Slither over `src/` before the first public byte, with no `fix` row (merged 2026-11-08, no `fix` row); **task issue [#175](https://github.com/dnznlabs/rake/issues/175) opened 2026-11-08** from `main` at `4b6f95b`; **in review as [#179](https://github.com/dnznlabs/rake/pull/179)** — steps 1, 2, 3 and 5 done on both chains (Sepolia's 2–3 by a run killed before recording, recorded not repeated); **step 4 not run: unrunnable by the engineer**, M04-D4 → decision 44 → m04-t08 below; criterion 3's chain half moves there |
| m04-t08 | **Step 4 via the Ops vault** (decision 44, [#178](https://github.com/dnznlabs/rake/issues/178)): the engineer builds each chain's `dapp-nodev` bundle, predicts the three SSTORE2 pointers from `App`'s nonce, commits the five calldatas in execution order with a tool that regenerates them, estimates each from the node with the vault as sender, computes the five digests per nonce, rewrites RUNBOOK § Step 4 as the two-route procedure, and hands Denizen one signing block per chain; Denizen signs all three Ops owners and the dapp forwards; the engineer verifies `chain-doc` hashes and pointers from the chain and fills step 4's `record:` rows. No `src/`, no signing by the engineer | scoped 2026-11-08 ([TASK.md](tasks/m04-t08/TASK.md)); task issue opens when this merges and #179 has merged. **Route changed 2026-11-15 ([#191](https://github.com/dnznlabs/rake/pull/191)): one `batch` proposal per chain, proposed with the engineer's signature, co-signed by the Product Owner, queued then `executeQueued` — RUNBOOK § Step 4 (4a–4d); the goal text above is the superseded plan, and TASK.md was revised 2026-11-16 to match.** **Route changed again 2026-11-16 (decision 47): three proposals per chain — calls 1 and 2 plain, calls 3–5 as `batch345.hex` — because the one `batch.hex` exceeds the coordination service's 65,536-character proposal cap; [#188](https://github.com/dnznlabs/rake/issues/188) widened with the cap** |
| m04-t10 | **The document re-upload, and the runbook's two entry points** ([#193](https://github.com/dnznlabs/rake/issues/193); Denizen 2026-11-17 08:29 CST): the #203 bundle uploaded to the existing `App` on both chains through the Ops vault — three proposals per chain at App nonce 4, decision 47's route — with the calldata tool taking the nonce from the chain (#199, #189, #196 folded in), `calldata/<CHAIN_ID>/` at the root as the routine home, and `RUNBOOK.md` gaining § Which run is this (Run A, the contracts, steps 1–7; Run B, the document, Step 4 alone) and § Uploads. The first routine upload writes the runbook's routine-upload text | scoped 2026-11-17 ([TASK.md](tasks/m04-t10/TASK.md)); task issue [#212](https://github.com/dnznlabs/rake/issues/212) opened the same day; AC amended at the engineer's finding ([#213](https://github.com/dnznlabs/rake/pull/213)); in review as [#214](https://github.com/dnznlabs/rake/pull/214) — the upload executed on both chains (App nonce 7), the runbook's two entry points written; **done 2026-11-17** (#214 merged, head `12d03ca`, merge `dfa9d0d`; closed #212): the upload executed on both chains at App nonce 7; the criteria, as #213 amended them, met at `12d03ca` after the review's six findings F1–F6 were taken on the second head |

### Phase 3 — Served from nowhere we run

The gateway serves the dapp and the widget from `App`; the widget sits on a host page.

| Task | Goal | Status |
|:-----|:-----|:-------|
| m04-t04 | Criterion 3 measured on both chains through w3link.io (or the gateway the task names, with why); the origin probe (`window.top === window`, `window.ethereum` present) run in headless chromium against the gateway URL and its result recorded, so Phase 4 knows before Denizen opens it whether a wallet can reach the document; the host page of M04-D1 published with the snippet and the screenshots of criterion 5; `#/docs` § the widget re-read against what actually worked, amended if the host form differs. **Plus a front-end review pass** (added 2026-11-07): `app/` is outside `audits/SCOPE` by design, and it is the surface strangers load — the dapp through a gateway that injects script, the widget on third-party pages, chain data rendered into HTML, calldata copied to clipboards; run the two-leg harness once over `app/src` with a web-security prompt against the gateway-served document, dispositions into `SECURITY.md` § Front end, no `src/` consequence possible | scoped 2026-11-17 ([TASK.md](tasks/m04-t04/TASK.md)); **the hosted gateway answers for both chains** — measured the same day: `https://0x00a9…5bae.<chainId>.w3link.io/` 200 `text/html` on 11155111 (69,053 bytes) and 84532 (69,049), each equal to that chain's `html()` once the gateway's 7,872-byte block (byte-identical to the pinned `html.patch`) is removed; `/widget.js` 200 `application/javascript`, 8,132 bytes, sha256 `07e808ed…d51b8ca` = t10's on both; `/nope` 404; `web3gateway.dev` serves the same bytes, `w3eth.io`'s certificate does not cover the host form. Headless chromium on both gateway URLs: `window.top === window` `true`, `location.origin` the real `https:` origin, `typeof window.ethereum` `"undefined"` (no wallet in headless — Denizen's half stays pending from t02). Baselines on `main` at `025b132`: 105 node tests, `GATEWAY_BASE` absent from `tools/gateway-check.sh`, no `## Front end` in `SECURITY.md`, no `audits/*/frontend/`. The DNZN distribution criterion 5 names is `0x71a4…7a4A` (decisions 50, 51; `description()` reads `FUND` on both chains, #209 done). The document measured is #214's bundle (`cast nonce $APP` 7); the measurement is re-run once, one command, after the next Run B |

### Phase 4 — Accepted from a wallet

Denizen's session, scripted so the evidence is a list of hashes and not a feeling.

| Task | Goal | Status |
|:-----|:-----|:-------|
| m04-t05 | The UAT script for criterion 6 — one ordered list per chain with the expected state after each step, the gateway URL to open, the wallet to use and what to screenshot; run first by the engineer in headless chromium with an injected provider against Sepolia so the script is known to be executable; then Denizen's run, its hashes and screenshots filed in the handoff by whoever holds them, and the signoff line below. Anything he finds is an issue, scoped per item: `app/` fixes land as m04-t09 if they change what criterion 3 hashes, and are re-uploaded once through m04-t08's vault procedure | scoped 2026-11-18 ([TASK.md](tasks/m04-t05/TASK.md)); gated on the next Run B executing on both chains; task issue opens when this merges |

**Signoff:** _not yet — a dated line by Denizen goes here._

### Phase 5 — Close-out

The architect re-runs criteria 1–8, records them in `CLOSEOUT.md` beside this file, fills
§ Carried issues at close-out, comments on state-collection#74 with the chains that now carry
code at DNZN's address, and hands M05 the list of what the runbook changed. No task.

**Estimate, labelled as one:** seven tasks and possibly an eighth; three to four weeks of calendar
time, most of it waiting on the explorer, Denizen's session and t07's handler work; t06 moves t03's
start by about a day, t07 moves nothing. Re-estimate when t03 reports.

## Carried issues at close-out

Filled at close-out. The queue today, 2026-11-07, every item labelled `m04`:

| Issue | Where it lands |
|:------|:---------------|
| [#76](https://github.com/dnznlabs/rake/issues/76) log paging | t01; criterion 4. |
| [#193](https://github.com/dnznlabs/rake/issues/193) re-upload | t10. |
| [#199](https://github.com/dnznlabs/rake/issues/199) node zlib pin, [#196](https://github.com/dnznlabs/rake/issues/196) `p_threshold`, [#189](https://github.com/dnznlabs/rake/issues/189) dependent-call estimate | t10's Run B text. |
| [#209](https://github.com/dnznlabs/rake/issues/209) FUND rename on the testnets | Denizen's `apply` from his EOA; closed on a `description()` read, any time before close-out. **Closed 2026-11-17** on the `description()` read: both chains `DNZN // FUND DISTRIBUTION`, `pendingCount()` 0; the Base Sepolia `apply` was sent outside the dapp, which gated it on the history read (#215, m04-t11). |
| [#207](https://github.com/dnznlabs/rake/issues/207) Step 5 read-back gate | M05. |
| [#110](https://github.com/dnznlabs/rake/issues/110) the chromium note | t01. |
| [#127](https://github.com/dnznlabs/rake/issues/127) native-balance alias (F12) | t03's per-chain check before the first deploy, as the runbook already requires; neither testnet is known to carry such a token, and the task records the check's answer. Stays open into M05 for the mainnets unless the task closes it with a per-chain table for all eight. |
| [#140](https://github.com/dnznlabs/rake/issues/140) `run-latest.json` pairing | t01 (the assertion); t03 reads every figure from the chain. |
| [#148](https://github.com/dnznlabs/rake/issues/148), [#149](https://github.com/dnznlabs/rake/issues/149) t09's dapp nits | t01. |
| [#137](https://github.com/dnznlabs/rake/issues/137) | Closed by t09; listed because it was labelled `m04` before that. Nothing to do. |
| [#165](https://github.com/dnznlabs/rake/issues/165) window budget | ~~t05's UAT script states the load-older cost on Base Sepolia; stays open into M05 if the figure is acceptable as documented.~~ ~~Decision 52 (2026-11-17): t12 closes it against the measured second-load count, or re-scopes it in one line.~~ Held 2026-11-18 with #227: open against t05, whose UAT records the per-load count through MetaMask's RPC; the ship-or-close decision on t12 closes it either way. |
| [#172](https://github.com/dnznlabs/rake/issues/172) born-renounced sentence, test, create-screen owner guard | Decision 43 opened it; widened 2026-11-08 with the dapp guard (owner field ≠ connected wallet → say what it is, acknowledge before step 2). No `src/`. **It changes the bundle, so it lands before t03's step 4 (`make dapp-nodev` / `make chunks`) or it is a re-upload** — the engineer does it first. Merged as #177 before any upload, so no re-upload. |
| [#174](https://github.com/dnznlabs/rake/issues/174) cold-implementation stipend | Docs and a test in M04 (t03's runbook or #172's PR, whichever is open); the `src/` comment waits for `src/` to reopen. |

## One-way doors

Testnet transactions are public and permanent, and unlike state-collection's M3 these contracts are
**not throwaway**: they are the same-address deploy at the addresses M05 will use.

1. **`App` at `0x00A90943…` on two public chains.** After this, a `src/App.sol` byte means a new
   `App` address on the mainnets while the testnets keep the old one — same-address broken across
   the set, which is the property decision 5 exists to protect. The door is already shut by M03's
   mining; this milestone is where it becomes visible on a block explorer.
2. **DNZN's distribution at `0x6aC98EDA…` with the M04-D2 table.** Its table and delay are changeable
   by the Ops vault through the timelock, and its ownership is per chain, so the contents are not a
   door; the address and the fact that it exists on these chains are. Step 6 runs once per chain,
   by the Creator key, and never again on that chain (#22).
3. **The explorer verification is additive**, not a door: a verified source can be re-verified, not
   un-verified. Named because it publishes the source under DNZN's addresses for the first time.

## Risks

Things that would cost a redeploy or a re-upload to learn late. Each says what settles it and when.

1. **The hosted gateway is not its README.** w3link.io's README lists both testnets; the running
   service's chain list is a config file we cannot read. The *software* is settled by t02 on anvil
   (same code, our config); the *hosted service* by t04's first `curl` — before that, t03 records
   the gateway URL as "to be measured" and nothing in Phase 2 depends on it.
2. **A gateway-delivered document may not reach a wallet.** state-collection filed this risk on
   2026-09-26 and never ran M3 to measure it: an HTTPS gateway could wrap the document (sandboxed
   frame, `data:` URI) into an opaque origin where no extension injects `window.ethereum`. Criterion
   3 would pass and criterion 6 could not. Settled twice: by t02's probe against the gateway
   software on anvil, before any gas, and by t04's probe against the hosted service, before
   Denizen's session. If the hosted one fails where anvil passed, the difference is the host's
   configuration and the fallback for Phase 4 is Freedom (a native client measured to inject a
   wallet); criterion 6 is then reworded by that finding, not quietly passed on `localhost`.
3. **Provider log caps bite the DNZN page on day one.** Measured 2026-11-07: `sepolia.base.org`
   caps `eth_getLogs` at **200 blocks** (and Base Sepolia mints 43,200 a day), publicnode's Sepolia
   at 50,000 with pruned history behind its horizon; MetaMask's own endpoints are t01's to measure
   in the browser. Settled by t01 landing before t03 uploads, which is why Phase 1 is first; the
   residual risk is a wallet RPC stricter than 200, which the bounded-requests-plus-`load older`
   shape degrades under rather than fails.
4. **Sepolia gas.** The chunk upload is 10.8 M gas, and a testnet base fee is not a forecast: it
   read 15 wei on 2026-11-07 and the same chain has priced in whole gwei on other days, at which
   the upload alone is tenths of an ETH. Settled by t03 reading `cast base-fee` before step 4 and
   waiting for a quiet hour rather than paying a spike; the handoff records the price paid.
5. **Base Sepolia verification.** Etherscan's v2 API covers Basescan, but a verification that fails
   for a reason the task cannot fix (an explorer-side compiler build) is recorded as such and does
   not block criterion 2's other five; the criterion is then amended by the finding, in this file,
   with the date.
