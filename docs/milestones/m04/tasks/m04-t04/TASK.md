# m04-t04 — Served from nowhere we run

Milestone: [M04](../../MILESTONE.md) · Phase: 3 — Served from nowhere we run

When this is done, M04 criterion 3 is measured on both testnets through the hosted gateway at
w3link.io and recorded with the date, by a `make gateway-check` that can be pointed at a hosted URL;
the origin probe (`window.top === window`, `typeof window.ethereum`, `location.origin`) has run in
headless chromium against both gateway URLs and its result is in the handoff, so Phase 4 knows before
Denizen opens the page whether a wallet can reach the document; the host page of M04-D1 (decision 41)
exists as one tracked HTML file carrying the `#/docs` § the widget snippet for Sepolia and nothing else
of ours, handed to Denizen to publish under dnzn.dev, with the URL and the screenshots criterion 5 asks
for in the handoff; and `app/src` has had the two-leg review once, with a web-security prompt against
the gateway-served document, every finding dispositioned in a new `SECURITY.md` § Front end. Nothing
under `src/`; nothing is sent to any chain by this task.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`,
forge `1.7.1-dev`, `cast` from the same pin). Branch `m04/t04-gateway` from `origin/main` at or after
`025b132`. Check hooks with `ls .git/hooks | grep -v sample` → `pre-commit`, `post-commit`. Never
`devbox run -- bash -c` with a pipe; write a script. A fresh worktree has no `lib/`: run `git
submodule update --init` before the first forge command, never let `forge build` do it (#197). Set
per chain, as `RUNBOOK.md` § 0 does:

```
APP=0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE
# Sepolia:      CHAIN_ID=11155111 RPC=https://ethereum-sepolia-rpc.publicnode.com
# Base Sepolia: CHAIN_ID=84532    RPC=https://base-sepolia-rpc.publicnode.com
GATEWAY_BASE=https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.$CHAIN_ID.w3link.io
```

The browser steps run as m04-t02 and m04-t11 ran theirs (`AGENTS.md` § The dapp): `playwright-core`
from a directory outside the repo driving the cached chromium at
`~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome` (chromium `153.0.8010.12`, launched
by the architect on 2026-11-17 for every figure below). Every figure in this plan is the architect's,
measured 2026-11-17 between 18:58 and 19:01 UTC unless another time is given; re-run rather than quote.

0. **Preflight and baselines, re-run and dated.** The hosted gateway answered on 2026-11-17 for
   both chains, which is what makes criterion 3 measurable today — risk 1's "the hosted gateway is
   not its README" is settled on the pass side and this step re-reads it:

   | URL | HTTP | `content-type` | bytes | sha256 |
   |:--|--:|:--|--:|:--|
   | `https://0x00a9…5bae.11155111.w3link.io/` | 200 | `text/html; charset=utf-8` | 69,053 | `bc2dd55967beeed1fb6b2bcccbf82197c44e81fb0637481e00604860492ca1b8` |
   | `…11155111.w3link.io/widget.js` | 200 | `application/javascript; charset=utf-8` | 8,132 | `07e808ed9e5f0a08786715a0cbc0458dfb5905b41150999b8c2bf6e67d51b8ca` |
   | `…11155111.w3link.io/nope` | 404 | — | 0 | — |
   | `https://0x00a9…5bae.84532.w3link.io/` | 200 | `text/html; charset=utf-8` | 69,049 | `21e9349422027dbb6027f55d5317a8960e161a82ae2c5e189aff7058272e1b39` |
   | `…84532.w3link.io/widget.js` | 200 | `application/javascript; charset=utf-8` | 8,132 | `07e808ed…d51b8ca`, equal to Sepolia's |
   | `…84532.w3link.io/nope` | 404 | — | 0 | — |
   | `…sep.w3link.io/`, `…basesep.w3link.io/` | 200 | `text/html` | 69,053 / 69,049 | equal to the numeric forms above |
   | `https://0x00a9…5bae.11155111.web3gateway.dev/` | 200 | `text/html; charset=utf-8` | 69,053 | `bc2dd559…92ca1b8`, equal to w3link.io's; same `Web3-*` headers — a second instance of the same software, not probed for 84532 |
   | `https://0x00a9…5bae.11155111.w3eth.io/` | — | — | — | `curl: (60) SSL: no alternative certificate subject name matches target hostname`; `https://w3eth.io/` itself answers 302. Not usable for a testnet in this host form |

   The widget sha256 is the `widget sha256` m04-t10's handoff recorded from both chains
   ([HANDOFF.md](../m04-t10/HANDOFF.md) § Acceptance criteria, row 1) — the hosted gateway serves
   the bytes on chain. The `/` body is not `html()` verbatim, as criterion 3 (amended 2026-11-07)
   says: with the block the gateway injects after `<body>` removed — **7,872 bytes**, `cmp`-identical
   to `cmd/server/html.patch` at the pin `c582671` the dev stack builds — it is byte-equal to
   `cast call $APP "html()"` decoded from the raw ABI return: **61,181** bytes on Sepolia (sha256
   `7b3bbb1f96d2c51882c550153af90638caa6783e3d29e34e8828d52ebd4391c8`), **61,177** on Base Sepolia
   (`4d355ce47f78f2b85419dbd00504cf33ae1a87a24af1fd6a31deca25a34f0462`). So the hosted service runs
   the same patch as the software t02 pinned. Response headers on `/`: `web3-resolve-mode:
   resourceRequest`, `web3-mode-auto-method: request`, `web3-contract-return-processing:
   decodeErc5219Request`, `access-control-allow-origin: *`, `web3urlgateway-cache-status: miss` on
   each of three fetches a second apart, **no `ETag`, no `Age`, no `cache-control`**. At the pin a
   200 is cached only when the response carries an `ETag` or the URL matches
   `pageCache.immutableUrlRegexps` (`cmd/server/protocol.go:267-280`), and ours does neither, so a
   re-upload should be visible on the next fetch; step 7 confirms rather than assumes.

   Chain state the same minute, both chains: `cast nonce $APP` → **7** (the #214 upload's); the
   DNZN distribution of decisions 50 and 51, `cast call 0x00D18B5b… "predict(bytes32)(address)"
   0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001` →
   **`0x71a4221974Fc2E95081AE513248918dF27CF7a4A`**, 45 bytes of code, `description()` →
   `DNZN // FUND DISTRIBUTION` (#209 is done on both chains), `owner()` → `0x357836fF…902B`. The
   address decision 42 predicted for the Creator key's salt, `0x6aC98EDA…3F9f`, has **no code** on
   either chain. Criterion 5's "the DNZN distribution" is `0x71a4…7a4A`, the one the dapp features
   and decision 50 names for the mainnets.

   Baselines on `main` at `025b132`: `node --test test/*.test.mjs` → `ℹ tests 105 · ℹ pass 105`;
   `forge test` → 107 (m04-t10's handoff; not re-run by the architect, see the `lib/` note above);
   `grep -ci 'w3link.io' app/src/index.html` → **1**; `grep -c '^## Front end' SECURITY.md` → **0**;
   `grep -ci 'GATEWAY_BASE' tools/gateway-check.sh` → **0**; `grep -ci 'w3link.io/widget.js'
   app/src/host.html` → **0** (the dev foil loads `widget.js` relatively); `ls audits/` → three
   dated directories, none carrying `frontend/`.

   Check: your table of the nine URLs above, dated, in the handoff; every `w3link.io` row with the
   same status and content-type, and the two `/` bodies minus the block equal to `html()` on their
   chain. A different byte count on `/` is the next Run B having landed (step 7), not a fault —
   read `cast nonce $APP` and say which.

1. **`tools/gateway-check.sh` learns a hosted base.** One new variable, `GATEWAY_BASE` (a full
   origin such as `https://0x00a9…5bae.11155111.w3link.io`, no trailing slash). When set:
   - `fetch()` (`:55-58`) requests `"$GATEWAY_BASE$2"` with no `--resolve`; the failure line names
     the base rather than `127.0.0.1:$GATEWAY_PORT`.
   - `RPC` must be given explicitly — refuse with exit 1 if `GATEWAY_BASE` is set and `RPC` is
     unset or still the loopback default (`:29`), because `html()` read from anvil and compared to
     a testnet gateway is the silent wrong-chain comparison the whole check exists to catch.
   - The three-label assertion (`:114-118`) is skipped with a printed `skipped: three-label form is
     the dev gateway's`; on the hosted service that form resolves against its default chain.
   - `note` the `web3urlgateway-cache-status` and `age` headers of `/` and `/widget.js` (`:60`'s
     `header` already reads any header). Measured, never asserted: a `hit` with a stale body after
     a Run B is a finding for step 7, not a gate.
   - Unset, the script behaves exactly as today; `make gateway-check` against the dev stack still
     prints the same lines. `mk/25-gateway.mk` gains one comment line naming the hosted form:
     `APP=… RPC=… GATEWAY_BASE=… make gateway-check`.
   Rejected: a second script for the hosted case (two copies of the strip-and-compare logic would
   drift; the equality is the thing that must not fork); `CHAIN_ID` composing the base (the base is
   a URL the task names explicitly, per criterion 3's "the gateway the task names").

   Check: `APP=$APP RPC=<chain RPC> GATEWAY_BASE=<chain base> devbox run -- make gateway-check`
   exits 0 for each chain after step 2's build, printing `ok body minus block vs html(): equal`,
   `ok cmp vs app/dist/widget.js: identical`, `ok status: 404`, and the measured block size (7,872
   today). Predicted red, rehearsed on the saved bodies: the Base Sepolia base with the Sepolia `RPC`
   → `FAIL body minus block vs html(): differs` (the two chains' documents differ at byte 150 and
   by four bytes in length: 61,177 against 61,181); the widget cannot red that way (identical on both
   chains), so plant it by comparing against `app/dist/widget.js` truncated by one byte (`head -c
   8131`) → `FAIL cmp vs app/dist/widget.js: differs`. With `GATEWAY_BASE` set and `RPC` unset the
   script exits 1 before any `curl`.

2. **Criterion 3, per chain, in the order the criterion names.** For each chain: `make dapp-nodev
   CHAIN_ID=$CHAIN_ID`; `APP_ADDR=$APP RPC=$RPC CHAIN_ID=$CHAIN_ID make chain-doc` → `inflated sha256`
   equal to `sha256sum app/dist/index.html` and `widget sha256` equal to `sha256sum
   app/dist/widget.js` (expected today, from m04-t10: `2d27b603…3f9a9d4a` / 142,989 bytes on
   Sepolia, `1111b791…0920e17` / 142,987 on Base Sepolia, `07e808ed…d51b8ca` / 8,132 on both — if
   the next Run B has landed, the figures are its, and the handoff says so against `cast nonce
   $APP`); then step 1's hosted `gateway-check`; then `curl -sI "$GATEWAY_BASE/widget.js"` for the
   `content-type` line. Record every figure with the UTC time it was read.

   Check: the handoff's criterion-3 table, one row per chain, every cell a value you read today.

3. **The origin probe, headless, both chains.** `docs/milestones/m04/tasks/m04-t04/origin-probe.mjs`,
   tracked beside this file (it is evidence of this task, not a tool of the repo), taking the URL as
   its argument and the `playwright-core` directory from `PLAYWRIGHT_CORE` (the architect used
   `/home/openclaw/src/deadletter/node_modules/playwright-core`, 1.63.0, read-only): launch the
   cached chromium headless, `goto` the URL with `waitUntil: 'load'`, wait a few seconds for the
   dapp to paint, then evaluate and print `window.top === window`, `typeof window.ethereum`,
   `location.origin`, `document.title`, the first 160 characters of `document.body.innerText`, and
   every `pageerror`. Run it against both `GATEWAY_BASE`s. Measured 2026-11-17 19:01 UTC:

   | Expression | Sepolia | Base Sepolia |
   |:--|:--|:--|
   | `window.top === window` | `true` | `true` |
   | `typeof window.ethereum` | `"undefined"` | `"undefined"` |
   | `location.origin` | `https://0x00a9…5bae.11155111.w3link.io` | `https://0x00a9…5bae.84532.w3link.io` |
   | painted | title `RAKE`; `… sepolia connect alpha software is alpha, act accordingly. No wallet found. Open this page in a browser with a wallet.`; 0 page errors | the same with `base sepolia` |

   A real `https:` origin, top-level, no frame, no `data:` wrapper — the hosted service does what
   t02 measured of the software. What headless cannot answer is whether an extension injects
   `window.ethereum` into that origin; that is Denizen's half (step 6) and it is still the pending
   row of m04-t02's handoff too.

   Check: both rows in the handoff. Predicted reds, each rehearsed on 2026-11-17: the same script
   against `data:text/html,<title>plant</title><body>x</body>` prints `location.origin` `"null"`
   (the opaque-origin state risk 2 feared); the same document loaded inside an `<iframe>` prints
   `window.top === window` `false`.

4. **The host page of M04-D1.** `docs/milestones/m04/tasks/m04-t04/host/index.html`, one file, no
   assets, written for a host that is not ours: its own `<style>` of a few lines (a font, a
   background, a column), a heading naming it a test page for the rake widget, and the `#/docs` § the
   widget snippet for Sepolia exactly as the gateway-served page prints it (read 2026-11-17 at
   `$GATEWAY_BASE/#/docs` on Sepolia — the page prints `data-rake="0x…"` without a wallet, and the
   file fills `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`):

   ```html
   <script src="https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3link.io/widget.js"></script>
   <div
     data-rake="0x71a4221974Fc2E95081AE513248918dF27CF7a4A"
     data-chain="11155111"
     data-link
     data-rpc="https://ethereum-sepolia-rpc.publicnode.com"
   ></div>
   <div
     data-rake="0x71a4221974Fc2E95081AE513248918dF27CF7a4A"
     data-chain="11155111"
     data-link
   ></div>
   ```

   The `<script>` once, two mounts: criterion 5 wants the table "both with `data-rpc` and, with a
   wallet on Sepolia, without", and the widget's `DOMContentLoaded` sweep mounts every `[data-rake]`
   (`app/src/widget.js:179-180`). Nothing else of ours — no `theme.css`, no copy from the dapp, no
   link but the widget's own `data-link`. Rejected: a second page for the wallet-less mount (two
   URLs to publish for one criterion); the dev foil `app/src/host.html` (it is a page of ours, reads
   `?rpc=`, and loads `widget.js` relatively).

   Then the browser half you can do: serve the file from a scratch directory outside the repo on a
   spare port (`npx serve` or `python3 -m http.server`, your choice, named) so its origin is not the
   gateway's, open it in the headless chromium of step 3, wait for the first mount to paint, and
   screenshot the page: the `data-rpc` mount shows the DNZN table (three rows, `DNZN // FUND
   DISTRIBUTION`), the mount without `data-rpc` shows the widget's failure state (`no wallet and no
   data-rpc — nothing to read …`, `widget.js:158`), and the `data-link` href resolves to
   `https://0x00a9…5bae.11155111.w3link.io/#/distros/0x71a4…7a4A` (`SRC`, `widget.js:38`). Commit the
   screenshot as `docs/milestones/m04/tasks/m04-t04/shots/host-headless.png` (under 300 KB; the repo
   has committed no image before, so say so in the handoff).

   Re-read `#/docs` § the widget against what worked: the host form it prints,
   `https://<App>.<chainId>.w3link.io/widget.js` (`app/src/index.html:1827`, decision 19), is the
   form that answered on both chains today, so no amendment is expected; if your step 0 finds the
   numeric form failing where another worked, amend `widgetDocs()` and `test/docs.test.mjs`
   together and name it in the handoff.

   Check: `grep -ci 'w3link.io/widget.js' docs/milestones/m04/tasks/m04-t04/host/index.html` → 1;
   `grep -c 'data-rake=' …/host/index.html` → 2; `grep -ci 'theme.css\|rake\.css\|index.html'
   …/host/index.html` → 0; the screenshot committed. Predicted red: the dev foil
   `app/src/host.html` scores 0 on the first grep (baseline above).

5. **Hand the page to Denizen, and record what comes back.** The handoff § For the Product Owner
   names the file, says it is one static file to place under dnzn.dev at a path of his choosing
   (decision 41), and asks for three things back: the URL; a screenshot of the page in Chrome with
   MetaMask on Sepolia showing the second mount rendered through the wallet; and, from the same
   session, the three expressions of step 3 typed into DevTools on `$GATEWAY_BASE` (Sepolia) plus
   one transaction sent from the gateway-served page — m04-t02's pending row, which this is the
   first real-origin chance to fill. When the URL arrives: `curl -s <url> | grep -ci
   'w3link.io/widget.js'` → 1, `curl -sI <url>` recorded (status, `content-type`,
   `content-security-policy` if any — a CSP that blocks `w3link.io` or `publicnode.com` is the
   finding criterion 5 exists to meet, and goes to the handoff as such, not around it), the
   wallet screenshot committed as `shots/host-wallet.png`, and the DevTools answers in the handoff
   table beside step 3's, dated and attributed. Until it arrives, the row reads `Denizen: pending`,
   which the plan permits as it did for t02; **criterion 5 is not met while it does.**

   Check: the handoff has the URL row filled, or the labelled pending row and nothing invented.

6. **The front-end review pass.** `app/` is outside `audits/SCOPE` by design and is the surface
   strangers load. Run the two-leg method once over it, with a web-security prompt, as a sibling of
   `make audit` rather than through it — `scripts/audit.sh` is shaped around the `solidity-auditor`
   skill (its harvest reads `.solidity-auditor/runs/`, `:192-222`) and the Solidity prompt, and
   adding a second mode to a 350-line runner for one run is more branch than value. Rejected for the
   record: extending `audit.sh` with `AUDIT_KIND=frontend`; running one model only (two labs is the
   whole independence claim, `audits/README.md` § Known limits).
   - `audits/SCOPE.frontend`: `app/src/index.html`, `app/src/model.js`, `app/src/eth.js`,
     `app/src/widget.js`, `app/src/layout.html`, `app/build.mjs`, and the three modules `build.mjs`
     imports (`app/build.mjs:18-20`): `app/inline-scripts.mjs`, `app/broadcast.mjs`,
     `app/version.mjs` — nine files — with a comment block giving each exclusion its reason
     (`app/src/host.html` dev foil, never uploaded; `app/src/theme.css` no script; `test/` not
     shipped). *Amended 2026-11-17 at the engineer's question before step 6 ran: the list as scoped
     named six files and stopped at `build.mjs`; two of the values `build.mjs` substitutes into the
     document are computed in `version.mjs` and `broadcast.mjs`, and `inline-scripts.mjs` is the
     guard that keeps the DOMParser swap executing our scripts at all, so auditing the injection
     point without its inputs reviews the pipe and not the water. `audits/SCOPE` excludes `build.mjs`
     as build tooling; this task's list reverses that for the front end deliberately, and the three
     helpers go with it.*
   - `audits/prompts/frontend-leg.md`: the same frame as `leg.md` (two legs, a third reconciles,
     do not soften), the `<!-- SCOPE -->` marker, no skill, and the surfaces named: the document is
     served by a third party's gateway that injects its own script before ours
     (`html.patch` — a `fetch` wrapper, a click handler, a `MutationObserver` on `body`) and sets
     `access-control-allow-origin: *`; chain data rendered into HTML — `description()`, row labels
     and URIs from `snapshot()`, ENS/WNS/GNS names, log data — every `innerHTML` sink and whether
     `esc()` guards it; calldata and addresses copied to the clipboard and shown for the propose
     control (decision 7); the widget on pages we do not control — `data-rpc` as an attacker-chosen
     endpoint, `data-link` as an href built from `currentScript.src`, the `<style id="rk-css">`
     injection, DOM isolation on a hostile host page; `?rpc=` / `&from=` and every other query
     parameter the shipped (`dapp-nodev`) build still reads; `target="_blank"` links and `rel`;
     `window.ethereum` responses treated as trusted; and `app/build.mjs`'s substitutions as a build-time
     injection point. Ask for `file:line`, a severity, and a one-line reproduction per finding, and
     for each leg to write `full-report.md` into the directory the prompt names.
   - Run leg 1 and leg 2 with the two CLI invocations `scripts/audit.sh` uses, verbatim
     (`:236-241` codex, `:265-270` claude), the prompt read from `frontend-leg.md` with the scope
     substituted the way `:226-227` does, each leg's output directory
     `audits/<date>/frontend/<model>/`, leg 2 started only after leg 1's report is on disk outside
     the tree (§ Running it: leg 2 never sees leg 1). Then the rollup with `audits/prompts/rollup.md`
     plus the two report paths, written to `audits/<date>/frontend/AUDIT.md`, with a provenance block
     carrying the fields of `audits/README.md` § Provenance filled by hand from the two logs (date,
     code commit and dirty flag, scope, leg 1 and leg 2 requested → observed models, wall seconds,
     tokens). The code commit is the branch head at which the legs ran, named in the handoff; if
     m04-t12 (`#221`) has not merged when you reach this step, run it anyway and say so — t12's
     store then gets its own pass over its diff when it lands, as its milestone row provides.
   - `SECURITY.md` gains `## Front end` after § Static analysis, in that section's register: method,
     scope commit, scope, result counts, then one row per finding with `fix` / `design` / `false
     positive` / `accepted` and the evidence. A `fix` row is an `app/` change in this PR and nothing
     else; it changes the bundle, so the handoff says the testnets carry it at the next Run B
     (step 7) and names the row. **No `src/` consequence is possible here**; a finding that seems to
     want one is `accepted` with the reason and a decision issue, not a change.

   Check: `ls audits/<date>/frontend/` → two model directories each with a non-empty
   `full-report.md`, and `AUDIT.md`; `grep -c '^## Front end' SECURITY.md` → 1; the row count in that
   section equals the finding count `AUDIT.md` states (count both, write both). Predicted red: a leg
   directory empty or missing is a failed pass, as `audits/README.md` § Running it says — do not
   roll up two reports when you have one.

7. **The re-run after the next Run B.** The document on both chains today is #214's bundle (`cast
   nonce $APP` → 7). m04-t11 and m04-t12 re-upload it together in the next Run B, and any `fix` row
   from step 6 rides the same round. After that upload executes, one command per chain re-runs the
   measurement of step 2 and nothing else:

   ```
   make dapp-nodev CHAIN_ID=$CHAIN_ID && APP=$APP RPC=$RPC GATEWAY_BASE=$GATEWAY_BASE make gateway-check
   ```

   Its output — the equality line, the served byte count and the two cache headers — goes as a dated
   comment on the Run B PR and as a dated line under this task's handoff § After the next Run B. If
   `web3urlgateway-cache-status` reads `hit` with a body that is the old document, that is risk 1's
   residual (a hosted cache we cannot flush) and is recorded, with the `Age`, as a finding for
   Phase 4's timing, not fixed.

   Check: the handoff carries the section with the command and either the dated result or `not yet
   — Run B pending`.

8. **`HANDOFF.md`** beside this file, from the handbook template: the AC table with every figure
   measured, the step 0 gateway table, the step 3 probe table with Denizen's column (filled or
   pending), § Deviations, § For the Product Owner (step 5's three asks, the host file's path, the
   `fix` rows if any), § For M04 risks 1 and 2 — one sentence each on what the hosted service
   settled — and § After the next Run B.

## Acceptance criteria

Each row names its command and the baseline on `main` at `025b132` (2026-11-17) or the architect's
measurement of the same date that it is checked against.

- (a) **Criterion 3, both chains, through w3link.io.** Per chain, after `make dapp-nodev
  CHAIN_ID=$CHAIN_ID`: `make chain-doc` reports `inflated sha256` = `sha256sum app/dist/index.html`
  and `widget sha256` = `sha256sum app/dist/widget.js`; `APP=$APP RPC=$RPC GATEWAY_BASE=$GATEWAY_BASE
  make gateway-check` exits 0 with `ok body minus block vs html(): equal`, `ok content-type:
  text/html…`, the three `ok web3-*` lines, `ok cmp vs app/dist/widget.js: identical`, `ok
  content-type: application/javascript…`, `ok status: 404`; `curl -sI "$GATEWAY_BASE/widget.js" |
  grep -ic 'content-type: application/javascript'` → 1. Baseline: `GATEWAY_BASE` does not exist in
  the script (grep → 0) and the dev target cannot reach a hosted URL. Predicted red: the Base Sepolia
  base with the Sepolia `RPC` → `FAIL body minus block vs html(): differs` (rehearsed: 61,177 vs
  61,181 bytes).
- (b) **The hosted mode is a mode, not a fork.** `GATEWAY_BASE= make gateway-check` against the dev
  stack prints the same assertion lines as `main`'s script (diff the two outputs; the three-label
  line present); with `GATEWAY_BASE` set and `RPC` unset the script exits 1 before its first `curl`
  (`grep -c curl` on its output → 0). `grep -ci 'GATEWAY_BASE' tools/gateway-check.sh` ≥ 3
  (baseline 0).
- (c) **The origin probe is recorded for both chains.** The handoff's table has `window.top ===
  window` `true`, `typeof window.ethereum` `"undefined"`, `location.origin` the `https:` four-label
  origin, zero page errors, for `11155111` and `84532`, dated; `origin-probe.mjs` tracked. Predicted
  reds, both rehearsed: a `data:` URL → `"null"`; the document in an `<iframe>` → `false`.
- (d) **The host page exists and is only the snippet.** `grep -ci 'w3link.io/widget.js'
  docs/milestones/m04/tasks/m04-t04/host/index.html` → 1; `grep -c 'data-rake=' …` → 2, both
  `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`; `grep -ci 'theme.css\|index.html\|localhost'
  …/host/index.html` → 0; `shots/host-headless.png` committed and the handoff says what it shows.
  Baseline: the directory does not exist; `app/src/host.html` scores 0 on the first grep.
- (e) **Criterion 5's live half — or the pending row.** Either the handoff has the dnzn.dev URL with
  `curl -s <url> | grep -ci 'w3link.io/widget.js'` → 1 and `shots/host-wallet.png`, plus Denizen's
  three DevTools answers and a transaction hash from the Sepolia gateway URL; or a row `Denizen:
  pending` with nothing filled in. The reviewer reads criterion 5 as **not met** on the pending row
  and the PR may still merge — the page is Denizen's to publish and the row is his to fill, which the
  architect does at review or after.
- (f) **The front-end pass ran twice and is dispositioned.** `ls audits/<date>/frontend/` → two
  model directories with non-empty `full-report.md` and an `AUDIT.md` carrying the provenance block;
  `grep -c '^## Front end' SECURITY.md` → 1 (baseline 0); the section's row count equals `AUDIT.md`'s
  finding count, both stated; every `fix` row names its `app/` hunk in this PR; no row's disposition
  is a `src/` change. Predicted red: one leg directory missing → the pass is not done.
- (g) **Nothing else moved.** `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot
  RUNBOOK.md` prints nothing; `forge test` 107 (m04-t10's figure; re-run); `node --test
  test/*.test.mjs` 105 unless step 4 amended `docs.test.mjs` or step 6's `fix` rows added tests, each
  named; `grep -ci 'w3link.io' app/src/index.html` → 1 unless step 4 amended the host form, named.
  `make dapp-nodev CHAIN_ID=11155111` → `wc -c app/dist/widget.js` ≤ 10,240, figure recorded beside
  8,132.
- (h) **The re-run is booked.** The handoff has § After the next Run B with step 7's one command and
  either a dated result or `not yet — Run B pending`.
- PR closes the task issue, opened by the architect when this plan merges.

## Out of scope

- The document's content: any `app/` change that is not a `fix` row of step 6 — t11 (#222) and t12
  (#221) are the open `app/` tasks and this task rebases onto them, never the reverse.
- The next Run B itself: the signing round and `executeQueued` are the Product Owner's and the
  engineer's under `RUNBOOK.md` § Step 4; this task re-runs one measurement after it (step 7).
- Denizen's UAT (m04-t05) and the signoff line; this task hands Phase 4 a URL and a probe result.
- Any `src/` byte, `RUNBOOK.md`, the gateway pin (`c582671`) or `procs/gateway.toml.tmpl`; the
  gateway's injected block (it is the gateway's; the equality strips it).
- A native `web3://` client, IPFS or the dnzn.dev mirror of the dapp (M05, decision 12); a `web3://`
  src in the host page.
- `#/docs` prose beyond the host form, if it even moves (decision 17).
- The `0x6aC98EDA…` address: codeless on both chains and not this task's to create or explain;
  decision 50 made `0x71a4…7a4A` the DNZN distribution.

## One-way doors

- **Publishing the host page is external and public.** The file is written here; the publishing is
  Denizen's step under dnzn.dev (decision 41), at a path he names, and it needs his OK — the task
  asks, it does not post. Once published the URL is in the handoff and criterion 5 reads it; a later
  move is a new URL and a one-line amendment, not a door, but the first publication puts the DNZN
  distribution's address and the gateway URL on a public page for the first time.
- **`audits/<date>/frontend/` is append-only** like every `audits/<date>/` (`audits/README.md`
  § Layout): once committed it is cited by the next rollup and is not rewritten.
- Nothing on chain. No transaction is sent by this task on any chain; the one Denizen sends in step 5
  is his, from his wallet, and is evidence, not a deliverable.

## Human-in-the-loop requirements

1. **Denizen publishes `host/index.html` under dnzn.dev** and sends the URL (step 5). Gates
   criterion 5's live half; nothing else in this task waits on it.
2. **Denizen's Chrome + MetaMask session on Sepolia**: a screenshot of the published page with the
   wallet-read mount rendered, and the three DevTools expressions plus one transaction from
   `https://0x00a9…5bae.11155111.w3link.io/` — m04-t02's pending row, the second measurement of
   risk 2. Gates criterion 6's premise, not this PR.
3. **The Product Owner merges** — a new `SECURITY.md` section and a criterion-5 artefact are on his
   list — and, if step 6 produced a `fix` row, signs the next Run B that carries it with t11 and t12.

## Open questions

None. The host page's path under dnzn.dev is Denizen's to choose and is recorded, not decided here.

## Context

- M04 [MILESTONE.md](../../MILESTONE.md) criteria 3 and 5, risks 1 and 2, § Needs M04-D1.
- m04-t02 [TASK.md](../m04-t02/TASK.md) and [HANDOFF.md](../m04-t02/HANDOFF.md) — the software
  half: `tools/gateway-check.sh`, the injected block, the headless origin table and the pending
  wallet row this task carries forward.
- m04-t03 [HANDOFF.md](../m04-t03/HANDOFF.md) § For t04 — the two gateway URLs; m04-t10
  [HANDOFF.md](../m04-t10/HANDOFF.md) — the document sha256s and `cast nonce $APP` 7;
  `RUNBOOK.md` § Uploads rows 1 and 2.
- `docs/ROADMAP.md` decisions 12, 17, 19, 41, 50, 51.
- `audits/README.md` § Running it, § Provenance, § Adding a review; `scripts/audit.sh:226-270`.
- [#209](https://github.com/dnznlabs/rake/issues/209) (done on chain: `description()` reads
  `FUND` on both, 2026-11-17), [#221](https://github.com/dnznlabs/rake/issues/221),
  [#222](https://github.com/dnznlabs/rake/pull/222), [#214](https://github.com/dnznlabs/rake/pull/214).
