# m05-t03 — handoff

PR: #437 · Branch: `chore/m05-t03-records` · 2026-11-26

Run B went to Base and then, on the architect's word after Base's record was read, to Ethereum: each chain cut from the tip of `main` at `App` nonce 1, three proposals at the vault's live nonce, co-signed and submitted by the Product Owner, and three `executeQueued` sent one at a time after the hour's timelock with each pointer's **contents** read against the committed calldata before the next piece went out. Both documents read back equal to their own builds. `rake.dnzn.dev` now serves four chains and `/` lands on Ethereum (decision 70). The Product Owner's first deposit and `distribute` ran on Base and are Phase 3's signoff. Nothing reverted, nothing was retried, and no piece went out of order.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — the document equals the build on both chains | pass | `node tools/chain-doc.mjs` against each chain after its upload: Ethereum `inflated sha256` `52a8602ca99c66de627d1e9eed34c5b256d10db6c37736f7fb7e29234b1bb89e` at 170,381 B and widget `044139b751a901df06e106d3b8a4c307c745427c3e210ea8f8467f28961b37f1` at 8,525 B, both equal to `make dapp-nodev CHAIN_ID=1`'s `sha256sum app/dist/{index.html,widget.js}`; Base `e9af3eaaebf0c3b30458ba913b6f0429f03ac1d6d787915d8751b9b8c4c4f556` at 170,384 B against `CHAIN_ID=8453`'s build, re-read 22:12Z. `chunkCount()` **3**, `widgetChunkCount()` **1**, `locked()` **false** on both |
| 2 — `app/` unchanged from the previewed commit | pass | `git diff --quiet 4fb6296 80124f6 -- app/` and `git diff --quiet 4fb6296 d3000c2 -- app/` both exit 0 (empty), which is decision 71 as amended |
| 3 — `make verify` `site` lines, `check-site`, `/` on chain 1 | pass | `make verify` 22:00:23 → 22:00:47Z, after the 21:56:41Z deploy: first line `address 0x00a9F390…25BA on chains [11155111 84532 8453 1]`, then **eight `site` lines `ok`** — root and `widget.js` on each of the four, chain 1's root 72,417 B and the other three 72,421. `make check-site` **27 of 27**, nine cases in chromium, firefox and webkit, each engine reporting `default 1` and a first case of `root ends on the default chain …: path /1/, title "RAKE"` |
| 4 — `gateway-check` on each mainnet | pass | Ethereum: 80,289 served − 7,872 injected = **72,417** = `html()`, `/widget.js` 8,525 B byte-identical, `/nope` 404, `gateway-check: all assertions passed`. Base: 80,293 − 7,872 = **72,421**, same verdict. Neither mainnet needed § 4d's failure route |
| 5 — one `distribute` from his deposit, and the signoff | pass | `cast receipt` on Base: deposit `0xee99eb54a345781729e647ed95d7d79ddb386e584d460ea2fd2ccf8a58ecfdd5`, block 62,651,967, `status 1`; `distribute(0x0)` `0x6564ba6e70e4e6ae42b916f6f67fe6302d3a72590eb7c1a1e32b9e0630f06b83`, block 62,652,371, `status 1`. The distribution went 0.001 → **0** and treasury **+0.0002** / ops **+0.0004** / creator **+0.0004** summed to the deposit exactly. `MILESTONE.md` Phase 3 § Signoff now carries his dated word from [#433](https://github.com/dnznlabs/rake/issues/433) |
| 6 — § Uploads, § Executed on mainnets, README | pass | `RUNBOOK.md` § Uploads rows **9** (Base) and **10** (Ethereum) plus a detail table carrying all **twelve** transactions — the six submits from the vault's `Queued` events on Ethereum and from `queue_tx` verified by `cast receipt` on Base, the six executions from its `ExecutionSuccess` logs with the nonce taken from the event's own argument. § Executed on mainnets' opening paragraph no longer says step 4 has not run, and both § Record tables carry steps 4, 4d and 7 (and Base's step 8). README § Deployment Status shows **live** with each chain's own document hash on both mainnets |
| 7 — only the listed paths change | pass, with one declared addition | `git diff --name-only origin/main` on this branch: `README.md`, `RUNBOOK.md`, `docs/milestones/m05/MILESTONE.md`, plus this file in the task directory. `calldata/1/`, `calldata/8453/`, `deploy/` and the workflow were merged earlier in the task by #434 and #436. **`MILESTONE.md` is not in the criterion's list** — see Deviations |

## Deviations from the plan

- **Base's three `executeQueued` were sent at the bare estimate, not estimate + 30%.** § Step 4 asks for `estimate * 13 / 10`; Ethereum's three limits invert cleanly to their logged estimates through `cast tx <hash> gas` (7,222,082 is the only integer-×1.3 image of 5,555,448), while Base's three limits **are** the estimates — 5,555,376 / 5,538,569 / 3,580,191, which is 4.22% / 4.23% / 6.87% above the gas each call used. All three landed on that margin; had any call needed more than its estimate it would have reverted out of gas and stayed queued, so the cost of the slip was a thin margin rather than a loss. Recorded in § Uploads beside the figures.
- **`MILESTONE.md` is edited, and AC 7's path list does not name it.** The same plan's signoff criterion requires Phase 3's line to carry his dated word, and that line lives in `MILESTONE.md`; the two criteria cannot both be satisfied. The architect asked for the line explicitly on 2026-11-26. Flagged rather than resolved — if the path list is the binding one, the signoff needs a different home.
- **The gw44#85 reading was taken across Ethereum's deploy, not Base's.** The plan allows either ("one of the two deploys"); Ethereum's was the one whose worker bytes differed, which is the condition that issue needs.

## Decisions

- **Ethereum's two endpoints were chosen on what they return, not on the chain id.** `ethereum-rpc.publicnode.com` and `eth.drpc.org` each return the whole `html()` (72,424 characters, same hash). `rpc.flashbots.net` was rejected for refusing `eth_call` (`rpc method is not whitelisted`), and `1rpc.io/eth` for answering short once — see Discoveries for the correction to how I first described that.
- **Nothing was added to `ROADMAP.md` § Decisions.** The only open question, [#425](https://github.com/dnznlabs/rake/issues/425), took its default, and decision 71's amendment recording it is already on `main`.

## Discoveries

- **The README's testnet rows are stale**: both still read `uploaded 2026-11-20 · 554b8b1` where m05-t01d re-uploaded on 2026-11-26 (§ Uploads rows 7 and 8). Not fixed — outside this task.
- **§ Executed on mainnets and the README disagree about explorer verification.** The runbook records both mainnets as `queued, not verified` with GUIDs; the README's mainnet rows link explorer pages and say `verified 2026-11-22`. One of the two is stale; I did not re-read the explorers and changed neither column.
- **An endpoint's answer can be short once without being short.** `1rpc.io/eth` returned 422 characters at ~21:46Z and the full 72,424 on four spaced readings an hour later. I had reported the 422 as what that endpoint does, including in #436's body, and corrected it there (`issuecomment-7204881434`). The underlying slip is worth more than the fact: **I recorded the length of a body I never looked at**, and 422 characters is as consistent with an error page as with a truncated document.
- **A service worker answers requests for its own script.** An in-page `fetch('/gw44-sw.js')` returns **46 bytes** where `curl` of the same URL returns 8,048, so one of the two routes gw44#85 proposed for itself — reading the served worker's hash — cannot work from inside a controlled page.
- **w3link's Sepolia 400 is not a size or chunk-count ceiling.** Chain 1 serves a three-chunk, 80,289-byte document there, as Base does; that refutes the hypothesis I had been carrying on [#411](https://github.com/dnznlabs/rake/issues/411) and is corrected on it.
- **The coordination service's cached owner set lagged chain 1**, which made `tx_summary.sig_count` read `0 of 2` and `ready` false on rows carrying a valid signature; the embedded `signatures` relation is the record, and a connected-owner page load repairs the cache. Detail on #434.
- **Base's submit gas matches Ethereum's to within 0.1%** (987,080 / 988,010 / 621,530 against 987,290 / 987,890 / 621,410), as does the estimate-to-used margin to two decimals. One calldata set, two chains: the margins are properties of the call, and only the prices differ — 0.000084533 ETH against 0.000803690 for the same 1.00× gas.

## Open questions

None.
