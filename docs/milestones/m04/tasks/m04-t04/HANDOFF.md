# m04-t04 — handoff

PR: [#230](https://github.com/dnznlabs/rake/pull/230) · Branch: `m04/t04-gateway` · 2026-11-17

`tools/gateway-check.sh` learned a hosted base as a mode rather than a fork, and criterion 3 was measured through `w3link.io` on both testnets with it. The origin probe ran headless against both gateway URLs and is recorded below with both of its predicted reds. The host page of M04-D1 exists as one tracked file carrying the `#/docs` widget snippet for Sepolia and nothing else of ours, with a headless screenshot of it rendering. `app/src` had the two-leg front-end review once, nine files under a web-security prompt, and all 24 findings are dispositioned in a new `SECURITY.md` § Front end — one of them fixed here, the rest carried. Nothing under `src/` moved and no transaction was sent on any chain.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| (a) | pass | **Chain-against-chain, at the final head, per chain.** `APP=… RPC=… GATEWAY_BASE=… make gateway-check` → exit **0**, `gateway-check: all assertions passed`, both chains, exit status captured as `$?` rather than read off the output. Sepolia: served **69,053** bytes, injected block **7,872**, body minus block **61,181** = `html()` **61,181**. Base Sepolia: **69,049** / **7,872** / **61,177** = **61,177**. `cmp vs app/dist/widget.js: identical` at **8,132** bytes on both; `/widget.js` `content-type: application/javascript; charset=utf-8`; `/nope` **404**; three-label assertion printed `skipped: three-label form is the dev gateway's`, as the hosted mode intends. **Local-build clauses, at the branch point `fa97644`** per the ruling on #225, because the branch now carries m04-t11 while the testnets still serve the #214 bundle: Sepolia `inflated sha256` `2d27b603b657391a24bd882598ef61d32e3bb635c2e918b414af04683f9a9d4a` = `sha256sum app/dist/index.html`, **142,989** bytes both sides; Base Sepolia `1111b791bd9d30963d5a359c8e1db8d85b562e1a82c1118fedfc8650b0920e17`, **142,987** both sides; `widget sha256` `07e808ed9e5f0a08786715a0cbc0458dfb5905b41150999b8c2bf6e67d51b8ca` = local, **8,132** both sides, both chains. All four pairs equal. Re-measured at step 7. |
| (b) | pass | **The hosted mode is a mode, not a fork**, in the three parts the amended plan asks for. *Mechanism:* the #228 strip failure is intermittent and instrument-dependent — `rc=$( set -o pipefail; tail -c +N file \| grep -abo -m1 '</script>' \| head -1 \| cut -d: -f1 )` gives **0 failures in 40 trials** on the real 69,053-byte body, while the script's own construction `bash -c 'set -euo pipefail; rel=$(tail -c +N "$f" \| grep -abo -m1 "</script>" \| head -1 \| cut -d: -f1)'` fails most of the time, every failure exit **141** — **14 in 20 on this host, 19 in 20 on the reviewer's**, so the rate is host-dependent and only the direction is portable. `<body>` at offset 74 leaves `tail` 68,979 bytes to write into a 65,536-byte pipe buffer against a `grep -m1` that exits 7,868 bytes in; the race is the remaining 3,443 bytes, which is why the rate moves with the machine while the failure does not. A 10,000-byte prefix never fails in either instrument on either host. *Guards:* `git diff origin/main...HEAD -- tools/gateway-check.sh` is **7** hunks — 1 comment-only, 2/3/7 inside `[ -n "$GATEWAY_BASE" ]`, 4 and 6 calls to `cache_note()` which returns early without the variable, and **5 is the #228 fix**, the only hunk touching the unset path. *Dev stack, variable unset:* `make gateway-check` on a local stack → exit **0**, `all assertions passed`, and `GET /widget.js on the three-label host 0x62cdd…865a.31337.localhost` followed by `ok status: 200` — the dev branch, not the hosted skip, corroborated against the gateway's own request log so the request is known to have reached the wire. *Refusal:* with `GATEWAY_BASE` set and `RPC` unset, `bash tools/gateway-check.sh` exits **1** with **0** curl invocations in its output; through `make` the same run surfaces as `Error 2`, so a reviewer running the acceptance line verbatim sees exit 2 and the script's 1 only in make's message. `grep -ci 'GATEWAY_BASE' tools/gateway-check.sh` → **12**, baseline 0. |
| (c) | pass | **Origin probe, both chains**, `node docs/milestones/m04/tasks/m04-t04/origin-probe.mjs <base>`, chromium 153.0.8010.12 / playwright-core 1.63.0, 2026-11-17 21:44Z. Both chains: `window.top === window` **true**, `typeof window.ethereum` **"undefined"**, `location.origin` the four-label `https:` origin, `document.title` **"RAKE"**, **0** page errors; body text carries `sepolia` on 11155111 and `base sepolia` on 84532. Both predicted reds produced: a `data:text/html,…` URL prints `location.origin` **null**, and the same document inside an `<iframe>` prints `window.top === window` **false** in frame 1 while a real top-level load prints **true**. Probe script tracked. |
| (d) | pass | **Host page is only the snippet.** `grep -ci 'w3link.io/widget.js' …/host/index.html` → **1**; `grep -c 'data-rake=' …` → **2**, both `0x71a4221974Fc2E95081AE513248918dF27CF7a4A` (one distinct value); `grep -ci 'theme.css\|index.html\|localhost' …` → **0**. `shots/host-headless.png` committed at **66,380** bytes against the 300 KB ceiling — the first image this repo has tracked. |
| (e) | **not met — `Denizen: pending`** | The page is written and handed over (§ For the Product Owner); the URL, the MetaMask screenshot and the DevTools answers are his to return and nothing is invented in their place. The plan permits the PR to merge on this row pending, as it did for m04-t02. |
| (f) | pass | **Front-end pass ran twice and is dispositioned.** `ls audits/2026-11-17/frontend/` → `gpt-5.6-sol/full-report.md` (**12,504** bytes), `opus/full-report.md` (**23,101** bytes), `AUDIT.md` (**28,728** bytes, 570 lines) with its provenance block. Leg 1 codex `gpt-5.6-sol` effort high: **9** findings; leg 2 claude `opus`: **21**; **30** read, **6** reported by both legs, **24** distinct after deduplication — 1 Critical, 2 High, 7 Medium, 8 Low, 6 Info. `grep -c '^## Front end' SECURITY.md` → **1**, baseline 0; **24** `R`-rows against `AUDIT.md`'s stated finding count of **24**; dispositions **20 `accepted` · 3 `design` · 1 `fix`**. The one `fix` row is R2 and names its hunk, `app/src/index.html` at `af4396c`. No row's disposition is a `src/` change. § Front end states the scope commit and makes it reproducible: the legs ran at `b04af65`, which the rebase rewrote out of the branch's history, so it is pushed as the tag `audit/2026-11-17-frontend-scope` — `git fetch origin tag audit/2026-11-17-frontend-scope` then `git diff audit/2026-11-17-frontend-scope 08fee62 -- <the nine files>` → no output, runnable by anyone rather than only in the clone that did the rebase. § Front end's line numbers are the tag's, and it carries the offset table: R2's fix lands in `app/src/index.html` in **two** hunks (`@@ -349,6 +349,15 @@` and `@@ -361,12 +370,18 @@`, 16 added / 1 removed), so rows up to `:354` are unmoved, `:355`–`:360` are **+9** and `:361` and below are **+15** — not one offset, and resolving against the tag is the reliable move. |
| (g) | pass | **Nothing else moved.** `git diff --stat origin/main...HEAD -- src/ 'test/*.t.sol' .gas-snapshot RUNBOOK.md` prints nothing. `devbox run -- forge test` → **107** passed, 0 failed, exit 0, equal to `main`. `devbox run -- node --test test/*.test.mjs` → **118**, 0 failed, exit 0, against **109** measured on `main` at `3d4f4cf` today: the **+9** is `test/ext.test.mjs` alone, per-file, and the plan's baseline of 105 predates m04-t11, whose merge accounts for the other **+4**. `grep -ci 'w3link.io' app/src/index.html` → **1**, unchanged, so `widgetDocs()` needed no amendment. `make dapp-nodev CHAIN_ID=11155111` → `wc -c app/dist/widget.js` **8,132** against the 10,240 budget, beside the plan's 8,132; `git status --porcelain` empty after it. |
| (h) | pass | **The re-run is booked** — § After the next Run B carries step 7's one command per chain and reads `not yet — Run B pending`. |

## The hosted gateway, step 0's table

Read 2026-11-17 21:36Z, `curl -sS -o <body> -D <hdr> -w '%{http_code}'` per URL. `A` = `0x00a90943f58b6ab7fde05aae01c13a80e6995bae`. **All nine rows reproduce the plan's figures exactly** — every status, content-type, byte count and sha256 — and `cast nonce $APP` → **7** on both chains confirms the #214 upload is still the latest, so no row differs for want of a new Run B.

| URL | HTTP | `content-type` | bytes | sha256 |
|:--|--:|:--|--:|:--|
| `https://$A.11155111.w3link.io/` | 200 | `text/html; charset=utf-8` | 69,053 | `bc2dd559…92ca1b8` |
| `…11155111.w3link.io/widget.js` | 200 | `application/javascript; charset=utf-8` | 8,132 | `07e808ed…d51b8ca` |
| `…11155111.w3link.io/nope` | 404 | none sent | 0 | empty |
| `https://$A.84532.w3link.io/` | 200 | `text/html; charset=utf-8` | 69,049 | `21e93494…272e1b39` |
| `…84532.w3link.io/widget.js` | 200 | `application/javascript; charset=utf-8` | 8,132 | `07e808ed…d51b8ca`, equal to Sepolia's |
| `…84532.w3link.io/nope` | 404 | none sent | 0 | empty |
| `https://$A.sep.w3link.io/` | 200 | `text/html; charset=utf-8` | 69,053 | byte-equal to the numeric 11155111 form |
| `https://$A.basesep.w3link.io/` | 200 | `text/html; charset=utf-8` | 69,049 | byte-equal to the numeric 84532 form |
| `https://$A.11155111.web3gateway.dev/` | 200 | `text/html; charset=utf-8` | 69,053 | equal to `w3link.io`'s |
| `https://$A.11155111.w3eth.io/` | — | — | — | `curl: (60) SSL: no alternative certificate subject name matches target hostname`; `https://w3eth.io/` itself answers **302** |

Chain state the same minute, both chains: the DNZN distribution of decisions 50 and 51 at `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`, `cast codesize` **45**, `description()` `"DNZN // FUND DISTRIBUTION"`, `owner()` `0x357836fFcB45307FA7ff2A574F505753c961902B`; `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f` codesize **0**, so decision 42's predicted Creator-key address is still codeless and is not this task's to explain.

`/` response headers confirm the plan's cache reading: `web3-resolve-mode: resourceRequest`, `web3-mode-auto-method: request`, `web3-contract-return-processing: decodeErc5219Request`, `access-control-allow-origin: *`, `web3urlgateway-cache-status: miss`, and no `ETag`, no `Age`, no `cache-control`.

## The origin probe, with Denizen's column

| Expression | Sepolia | Base Sepolia | Denizen, in Chrome with MetaMask |
|:--|:--|:--|:--|
| `window.top === window` | `true` | `true` | pending |
| `typeof window.ethereum` | `"undefined"` | `"undefined"` | pending |
| `location.origin` | the four-label `https:` origin | the four-label `https:` origin | pending |
| painted | title `RAKE`, `sepolia` label, 0 page errors | the same with `base sepolia` | pending |
| a transaction sent from the gateway-served page | n/a — no extension injects into a headless origin | n/a | pending |

The figures are AC (c)'s. Headless cannot answer whether an extension injects `window.ethereum` into that origin; that is the pending row m04-t02 opened and this task hands forward, not a gap in the measurement.

## Deviations from the plan

1. **`tools/gateway-check.sh`'s strip was repaired, which the plan did not scope** (`42c937a`, now `5cf9fc6` after the rebase). Step 1's gate cannot pass without it: the pre-existing `tail` into `grep -m1` dies under `pipefail` on a 69 KB document. Accepted as a deviation inside the task on #225, and the defect on `main` is filed as **#228**, which this PR closes. The mechanism, both trial counts and the pipe-buffer arithmetic are in AC (b) and were posted as a correction on #228, because the issue's first description read as deterministic and the obvious reproduction shows nothing.

Both earlier departures are no longer deviations: #226 merged, so the nine-file audit scope and criterion (a)'s split are the plan on `main`, and this handoff is written against that copy.

## Decisions

- **The front-end pass runs as a sibling of `make audit`, not through it.** `scripts/audit.sh` is shaped around the Solidity skill and its harvest of `.solidity-auditor/runs/`; a second mode for one run is more branch than value, as the plan reasoned. The two CLI invocations are the runner's, verbatim, and `audits/prompts/frontend-leg.md` takes a second substitution beside `<!-- SCOPE -->` — `<!-- OUTDIR -->` — because each leg must write outside the tree so leg 2 cannot read leg 1.
- **The rollup's prompt goes in on stdin.** `--add-dir` is variadic and eats a positional prompt; the runner records that costing 43 minutes of leg time once already, so the driver was written that way from the start and the legs, which pass no `--add-dir`, keep their positional prompt.

## Discoveries

- **`web3gateway.dev` matches `w3link.io` on every `Web3-*` header except `web3-cname`**, which carries its own host. A refinement of the plan's "same `Web3-*` headers", not a contradiction — the one header that differs is the one that names the hostname.
- **The isolated pipeline is the wrong instrument for #228**, and it is the obvious one to reach for: two runs of it agreed there was no defect before the script's own construction showed 14 failures in 20. Agreement between two runs of one instrument is not corroboration.
- **R1 is not a defect in our code** and no change under `app/` moves it: a gateway that can inject script can equally serve a different document, so the on-chain bytes never authenticated what a gateway visitor runs. Dispositioned `accepted`; the decision issue is the architect's to file against this PR.
- **R6 and R14 did not fall out of R2's sink check**, and the reason is structural rather than a judgement call: the check sits on `index.html`'s `ext`/`xlink`, while `app/src/widget.js` is a separate IIFE with its own `esc` and `short`, minified separately, and nothing in it calls `ext`. Both are carried.
- The repo had tracked no image before `shots/host-headless.png` (AC (d)).

## For the Product Owner

**The host page to publish:** `docs/milestones/m04/tasks/m04-t04/host/index.html`. One static file, no assets, its own few lines of CSS, and the `#/docs` widget snippet for Sepolia exactly as the gateway-served page prints it — two mounts, one with `data-rpc` and one without. Decision 41 makes the path under dnzn.dev yours to choose.

Three things come back, and they are AC (e):

1. **The URL.** It then gets `curl -s <url> | grep -ci 'w3link.io/widget.js'` → 1 and its headers recorded — a CSP that blocks `w3link.io` or `publicnode.com` is the finding criterion 5 exists to surface, and goes in the handoff as one rather than around it.
2. **A screenshot in Chrome with MetaMask on Sepolia**, showing the mount *without* `data-rpc` rendering through the wallet, committed as `shots/host-wallet.png`.
3. **From the same session, on the Sepolia gateway URL:** the three expressions of the probe table typed into DevTools, plus one transaction sent from the gateway-served page. That last is m04-t02's pending row and this is the first real-origin chance to fill it.

**Publishing is the one-way door in this task.** It puts the DNZN distribution's address and the gateway URL on a public page for the first time. The task asks; it does not post.

**One `fix` row rides the next Run B:** R2's sink check changes `app/src/index.html`, so the document the testnets serve does not carry it until that upload.

## For M04's risks

- **Risk 1 — "the hosted gateway is not its README."** Settled on the pass side: the hosted service runs the same patch the dev stack pins, and the served document minus its injected block is byte-equal to `html()` read from the chain, on both testnets (AC (a)). Its residual is a cache we cannot flush, measured and never asserted (AC (b)), and step 7 is what would catch it.
- **Risk 2 — the opaque origin.** Settled on the pass side for the document: a real four-label `https:` origin, top-level, no frame, no `data:` wrapper (AC (c)). What remains is the wallet half, which only a browser with an extension can answer, and it is AC (e)'s pending row rather than an open risk in the code.

## After the next Run B

The document on both chains is #214's bundle, `cast nonce $APP` → 7 (step 0's table). m04-t11 and m04-t12 re-upload it together in the next Run B, and R2's `fix` rides the same round. After that upload executes, one command per chain re-runs step 2's measurement and nothing else:

```
make dapp-nodev CHAIN_ID=$CHAIN_ID && APP=$APP RPC=$RPC GATEWAY_BASE=$GATEWAY_BASE make gateway-check
```

**not yet — Run B pending.** Its output — the equality line, the served byte count and the two cache headers — goes as a dated comment on the Run B PR and as a dated line here. A `web3urlgateway-cache-status: hit` carrying the old document is risk 1's residual and is recorded with its `Age`, not fixed.

## Open questions

None.
