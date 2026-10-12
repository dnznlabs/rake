# m02-t02 — handoff

PR: #40 · Branch: `m02/t02-reading` · 2026-10-11

The scaffold's placeholder page became Rake. `app/src/model.js` holds everything that needs neither the DOM nor a provider — `pct`, `countdown`, `decodePending`, `supersededBy`, `salt` and the `snapshot()` type string `SNAPSHOT_T` — inlined into the bundle the way `eth.js` is and tested under node against t01's cast-written fixtures. `layout.html` carries the R with the split stem, `RAKE / DNZN LABS`, `distros · docs` and decision 8's footer less its `docs` link (§ Deviations); the same R is the favicon, as a `data:` URI in `<head>`. `theme.css` moves the accent hue to baize 230 and makes the segmented bar the signature element, with the two derived tints produced by the base's own mix formula (`color-mix(in oklab, var(--accent), var(--paper) 25%/50%)`) so one hue declaration drives all three in both themes — and the landing's fee-path diagram takes the same three tints, so it is the bar in another form rather than a second palette. Everything the page reads as data shares one measure, the frame's: a bar, its ticks, a ledger, a meta strip, a history and a list row line up on both edges, and only prose keeps a measure of its own. In `index.html` the scaffold's provider, wallet, network and theme code is untouched; everything below it is new. One function, `loadDistro(addr)`, is the whole read path — `eth_getCode` first so an address with nothing on it is a "could not read" state rather than a decode error, then one `snapshot()` call, then `reserved(address(0))` and `eth_getBalance` in parallel — and `#/`, `#/distros/<addr>` and `#/distros` all render from it, which is why the landing shows the bar, ledger, pending change, owner, delay and waiting balance that M02 criterion 3 asks of it. The two histories are two `eth_getLogs` calls with their topic0s OR'd, fired after the table is in the document, and `app/build.mjs` now substitutes `__<NAME>_BLOCK__` from the broadcast receipts so the `Created` scan has a `fromBlock` that is not genesis. Every measurement below was taken through `devbox run --` (forge/cast `1.7.1-dev`, node v24.12.0) from the repo root.

**The chain state every figure was read on.** Addresses are a reading of one chain, not a property of the build (#35), so there are exactly three states here and each figure names its own:

- **State A** — anvil 31337 restarted empty, then one `make deploy`. Factory `0x5FbDB2315678afecb367f032d93F642f64180aa3`, `App` `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`, implementation created inside the factory's constructor, featured distribution `predict($FEATURED_SALT)` → `0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc`, `__DISTRIBUTIONFACTORY_BLOCK__` → `0x1`. Everything but the supersession row below.
- **State B** — State A plus three transactions sent by hand with `cast`, because the seed carries no case for them: `create(…, salt …0002)` → `0xd1FD542A56bD18Cd1692829D8162a791B0832AFb` ("rake v2 fees", 60/40), `create(…, salt …0003)` → `0xfd083dB38F5f8391c5400912D31b340edcdE1920` ("rake v1 fees (retired)", one row at 100% pointing at the first), and 1 ETH transferred to the second so it has a `Received` log. Used only for the supersession and `in 1 ETH` rows.
- **State C** — a second anvil, `--port 8546 --chain-id 31338`, restarted empty, then `make deploy ANVIL_PORT=8546 CHAIN_ID=31338`. The drift row only.

## Re-measured baseline

`TASK.md`'s opening paragraph quotes figures taken on `main` at `aa38c7b`. Re-measured on the branch point, `1a642f4` (`git show origin/main:app/src/index.html`), they are **unchanged from the plan's figures**:

```
lines: 173
grep -c distros: 0      exit=1
grep -c snapshot: 0     exit=1
grep -c implementation: 5          <- the same grep over the same file matches, so the input was not empty
routes: h === '#/'  ·  h === '#/docs'
```

On the branch head the same two greps read `distros: 7` and `snapshot: 3`.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| **M02 criterion 3** — `#/` shows the featured distribution's bar, ledger, delay, owner and pending change | pass | State A, dev build at `:3002`, driven with Playwright (see § Browser verification). `#/` renders `live example · DNZN fees`, a `bar sm` with segments `60%` / `40%`, the ledger rows `ops — operations / 0x3C44…93BC / 60%` and `treasury / 0x7099…79C8 / 40%`, `CHANGE QUEUED · 6D 23H` with `setBeneficiaries · new table · 40% / 60%` and an amber `bar pending` at `40%` / `60%`, then `OWNER 0xf39F…2266 · you` / `DELAY 7d` / `WAITING TO DISTRIBUTE 1.0000 ETH`. Zero `console` messages and zero failed requests on the load. |
| **criterion 3** — `#/distros/<addr>` shows the same for any distribution | pass | `#/distros/0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc` renders the eyebrow `0xe73C…74Bc · anvil · explorer`, the description as `<h1>`, the same bar/ledger/pending/meta, plus the two histories. State B's two hand-made distributions render the same way at their own addresses. |
| **criterion 3** — every displayed value equals `cast call <addr> "snapshot()"` | pass | Both outputs pasted in § The page against cast. |
| **criterion 3** — the pending block names the decoded setter | pass | Page: `setBeneficiaries · new table · 40% / 60%` plus the second bar. cast: `cast sig 'setBeneficiaries((address,uint96,string,string)[])'` → `0x8868f490`, which is the action's first four bytes, and `cast calldata-decode` of it → `[(0x3C44…93BC, 4000, "ops", "operations"), (0x7099…79C8, 6000, "treasury", "")]`. The other three setters and an unknown selector are covered by `test/model.test.mjs`. |
| **criterion 3** — `#/distros` lists `recent` and `mine` | pass | State A. `mine` for anvil key 0 → exactly one row, `#/distros/0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc | DNZN fees / anvil · 0xe73C…74Bc | dot=true`. `mine` for anvil key 1 → no rows and the copy `nothing on anvil is owned by 0x7099…79C8.`, not a spinner. `recent`: a detail visit leaves `localStorage['rake.recent']` = `["0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc"]` and the list reads it back as the same row. Disconnected: tabs are `recent(on)` and `mine(disabled)`, with `mine needs a connected wallet.` |
| **criterion 3** — a one-row table at 100% renders as "superseded by" (decision 6) | pass | State B. `cast call 0xfd08…1920 'beneficiaries()'` → `[(0xd1FD542A56bD18Cd1692829D8162a791B0832AFb, 10000, "rake v2 fees", "everything forwards here")]`; the page prints `superseded by rake v2 fees — this table forwards everything it receives.` above the bar, linked to `#/distros/0xd1FD…2AFb`. |
| **M02 criterion 5, display half** — drift shown, not hidden | pass | Both `beneficiaries()` outputs and both eyebrow texts in § Drift. |
| **criterion 9's greps** | pass | `grep -c 'onclick="return false"' app/src/index.html` → `0`, exit 1. `grep -rniE '\btip\b|govUrl|about:|ownerKind' app/src` → no output, exit 1. Both are empty over a tree the same tools do match: `grep -c distros app/src/index.html` → 7. |
| **criterion 9** — clean tree | pass | `git status --porcelain` → empty (exit 0) after `forge build --force`, `forge test`, `forge snapshot --check`, `forge lint`, `forge fmt --check`, `node --test`, `make deploy` (State A) and `make deploy ANVIL_PORT=8546 CHAIN_ID=31338` (State C). |
| `node --test test/*.test.mjs` passes with `test/model.test.mjs` present | pass | exit 0, `tests 28 / pass 28 / fail 0`. `origin/main` is 17, so the rise is exactly the 11 cases added. |
| `forge test` 36 passed | pass | exit 0 after `forge build --force`: `Ran 3 test suites: 36 tests passed, 0 failed, 0 skipped (36 total tests)`. |
| `forge snapshot --check` exit 0 with no `Diff in` | pass | exit 0; `grep -c 'Diff in'` → 0 over a log that reports `36 tests passed` across 3 suites, so the check ran against a suite that executed. Run immediately after `forge build --force`, never after `forge lint`. `.gas-snapshot` is not in `git diff --name-only origin/main`. |
| build free of `Warning (` and `warning[` | pass | `forge build --force` exit 0, `Compiling 36 files with Solc 0.8.34` then `Compiler run successful!`; `grep -c 'Warning ('` → 0 and `grep -c 'warning\['` → 0 over that same log. |
| lint and fmt silent | pass | `forge lint` exit 0, output `No files changed, compilation skipped` and nothing else; `forge fmt --check` exit 0, no output. Non-emptiness: the same binary on the same tree with `--severity high med low info gas` prints `note[screaming-snake-case-immutable]` findings in `test/mocks/Mocks.sol`, so lint is parsing these sources and is silent because the configured severities hold nothing — not because it saw no files. |
| `#/create` shows its one-line notice | pass | `#/create` renders exactly `the create flow arrives in the next task`. |
| the load field's name path shows its one-line notice | pass | Typing `ops.eth` and pressing `view` leaves `#/` and sets the result line to `name resolution arrives with t03`; typing the featured address instead moves the hash to `#/distros/0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc`. |
| `#/docs` is the scaffold's page, untouched | pass | `git diff origin/main -- app/src/index.html` contains no `+` or `-` line inside `docs()`; the rendered page is still `How it works` / `Contracts` / `Verify it yourself` with the factory row. |
| the page issues no request before `discover()` resolves | pass | Every request a page load makes, in order: `document`, then `eth_chainId`, `eth_call` (`predict`), `eth_getCode`, `eth_call` (`snapshot`), `eth_call` (`reserved`), `eth_getBalance`. Seven in total — no font, no CDN, nothing before `eth_chainId`, which is the first line of `load()`. Structurally it cannot be otherwise: every call goes through `P`, and `P` is `null` until `discover()` assigns it. |
| the page paints the table before any logs call returns | pass | § Browser verification, step 7's check: with `eth_getLogs` held for 2,500 ms, the bar and ledger were in the document at **58 ms** and the logs answers were released at **2,558 ms**. |
| `git diff --stat origin/main` names only the files in scope | pass, measured against the branch point | `AGENTS.md`, `app/build.mjs`, `app/src/index.html`, `app/src/layout.html`, `app/src/model.js`, `app/src/theme.css`, `test/model.test.mjs` — plus this handoff. Eight, nothing else. The literal command now names ten, because `main` has moved on since the branch point: `origin/main` carries `e7cfd0b`, `0bf0fef`, `b18d3a5`, `25baad7` (and upstream is further still, at `545fa5b`), which add `docs/milestones/m02/tasks/m02-t03/TASK.md` and edit `docs/milestones/m02/MILESTONE.md`. Neither is a change this branch makes; they are changes it does not yet have. `git diff --name-only $(git merge-base origin/main HEAD)` — i.e. against `1a642f4` — is the eight. The branch is deliberately **not** rebased or merged: bringing main in is the merge, and the merge is the product owner's. |
| step 1's check — `grep -c 'function '` equals the names the test imports | pass, with one note | `grep -c 'function ' app/src/model.js` → **5**, one line each: `pct`, `countdown`, `decodePending`, `supersededBy`, `salt`. `test/model.test.mjs` destructures **six** names: those five functions and `SNAPSHOT_T`, which is a string constant, so no `function ` declares it. The enumeration is also made in code rather than by eye: the test asserts `Object.keys(Model).filter(k => typeof Model[k] === 'function').sort()` equals exactly that list of five. |
| step 2's checks | pass | `grep -c 'oklch(.47 .09 230)\|oklch(.58 .09 230)' app/src/theme.css` → `2`; `grep -c 'a public work' app/src/layout.html` → `0`, exit 1 (the same file matches `grep -c work` → 2, one of them the footer's `work no. 001`); `node --test` still passes, and `inline-scripts.test.mjs`, which reads the source, is among the 28. |
| step 3's check — `[3333, 3333, 3334]` | pass | Driven through the page's own `bar()` and `ticks()` in the loaded document: 3 segments, `flex-basis` `33.33%` / `33.33%` / `33.34%` summing to **100**, classes `seg s0` / `seg s1` / `seg s2`, rendered widths 303.969 / 303.969 / 304.047 px in a 912 px bar, labels `33.33% a` / `33.33% b` / `33.34% c`, computed transition `flex-basis 0.25s`. |
| step 7's check — one `queued` entry | pass | `#/distros/0xe73C…74Bc` activity/changes: `queued | setBeneficiaries · new table · 40% / 60% · nonce 1 · 6d 23h | block 4`. The `in 1 ETH` half of that check could not come from the seed — see § Deviations. |
| step 7's check — a dead RPC paints the error state rather than hanging | pass | `?rpc=http://127.0.0.1:9` (nothing listening): the view reads `could not read the factory at 0x5FbD…0aa3: Failed to fetch` within 3 s of `goto`, with no hang. |
| step 7 — a failed logs call shows `history unavailable` and nothing else changes | pass | With `eth_getLogs` aborted at the route: both history slots read `history unavailable` (class `notice err`) while the table is intact — 4 segments and 2 ledger rows. |
| step 8 — chains and explorers | pass | `CHAINS` carries 1, 10, 8453, 42161, 11155111, 84532, 31337, 31338; `EXPLORER` carries the first six (etherscan.io, optimistic.etherscan.io, basescan.org, arbiscan.io, sepolia.etherscan.io, sepolia.basescan.org). On anvil, `ext()` printed `0xe73C…74Bc` as a `<span>` with the full address in `title`, and the eyebrow named the chain `anvil` / `anvil-b`. |
| step 10 — size and chunk count | pass | § Size. |
| the reduced-motion and dark-theme floor | pass | § Themes. |

### The review round

The product owner requested changes on PR #40 — six items, five of them changes. They are five commits on top of `3e846f5`, which a reviewer had already approved; nothing was force-pushed over it.

| # | The review | What changed | Evidence |
|:--|:-----------|:-------------|:---------|
| 1 | no favicon; wants the R | `index.html` `<head>` carries `<link rel="icon">` with a `data:image/svg+xml,` URI of the nav lockup's R, split stem and all | Chromium resolves the link from `<head>`, decodes that exact href to a 150×150 intrinsic SVG, and rasterises it legibly at 16 / 32 / 64 px on white and on `#111` — screenshot `05-favicon-raster.png`. Colour: `#317E9F` = `oklch(.56 .09 230)` — see § Decisions |
| 2 | remove `docs` from the footer | footer right side is the `id="ver"` span alone | `document.querySelectorAll('footer a')` → **0** on every route; the footer reads `work no. 001 \| dnzn labs · v0.1` |
| 3 | `distros`/`docs` vanish at mobile scale | `.navr a{display:none}` deleted; the row pays for the links in gap and type size, and below 460 px in the lockup's sub-label | Swept 320 / 360 / 375 / 390 / 414 / 459 / 461 / 600 / 720 / 721 / 960 / 1280 px: `nav.scrollWidth − nav.clientWidth` = **0** and `documentElement.scrollWidth` = `clientWidth` at every one; `distros`, `docs`, the theme pill, the network pill and the connect pill all computed-visible at every one. `.netname{display:none}` and `#net{padding:6px 8px}` are byte-identical to before |
| 4 | sub-heading widths are odd; the 60/40 lines stop short | one measure for the data column — see the `fix(app): one measure` commit and § Decisions | At 1280 px, `.bar`, `.ticks`, `.ledger`, `.row`, `.meta`, `.sechead`, `.hist`, `.hrow`, `.list-row`, `.load` and `.res` all measure **184 → 1096** px, which is `main`'s own box; at 390 px all of them measure **16 → 374**. Checked on `#/`, `#/distros`, `#/distros/<addr>`, `#/create` and `#/docs` |
| 5 | the hero diagram is gone | restored as a two-column hero — see § Deviations | Light and dark at 1280 px and at 390 px, four screenshots. `aria-hidden="true"`; no `<text>` escapes the 0 0 400 356 viewBox; the three swatches compute to `oklch(.47 .09 230)` / the 25 % mix / the 50 % mix in light and to `oklch(.58 .09 230)` and its mixes in dark |
| 6 | "how it works" is good apart from item 4 | unchanged but for item 4's width | The `.verbs` grid already spanned the measure; the `.sechead` above it now does too |

Zero `console` messages, zero page errors and zero failed requests across all eleven page loads of the round.

### The page against cast

State A, featured `0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc` on `http://127.0.0.1:8545`.

```
$ cast call 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc "snapshot()" --rpc-url http://127.0.0.1:8545   # 3394 chars
$ cast abi-decode "snapshot()((address,uint32,uint32,string,(address,uint96,string,string)[],(bytes32,uint256,bytes)[]))" <that>
(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 604800 [6.048e5], 1, "DNZN fees",
 [(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 6000, "ops", "operations"),
  (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 4000, "treasury", "")],
 [(0xb0d3eaa3efaed98bd18f058376bb221b0aa6b8e3ac19aac3fe2dcf2bc092331d, 1792350105 [1.792e9], 0x8868f490…)])

$ cast call … 'reserved(address)(uint256)' 0x0000000000000000000000000000000000000000   -> 0
$ cast balance …                                                                       -> 1000000000000000000
$ cast calldata-decode "setBeneficiaries((address,uint96,string,string)[])" 0x8868f490…
[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 4000, "ops", "operations"),
 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 6000, "treasury", "")]
```

The same page, read out of the DOM:

```
0xe73C…74Bc · anvil · explorer          <- eyebrow
DNZN fees                               <- <h1>, = description
60% ops | 40% treasury                  <- bar ticks, = table bps 6000 / 4000
ops — operations / 0x3C44…93BC / 60%    <- ledger, = row 0 name, note, account, bps
treasury / 0x7099…79C8 / 40%            <- ledger, = row 1
CHANGE QUEUED · 6D 23H                  <- = pending[0].eta 1792350105, 7 days out
setBeneficiaries · new table · 40% / 60%   <- = the action's selector and its decoded bps
40% ops | 60% treasury                  <- the amber pending bar, flex-basis 40% / 60%
OWNER  0xf39F…2266 · you                <- = owner
DELAY  7d                               <- = delay 604800
WAITING TO DISTRIBUTE  1.0000 ETH       <- = eth_getBalance 1e18 − reserved(0) 0
```

`nonce` (1) is read and carried into the `queued` history line (`nonce 1`) rather than printed in the meta strip; the plan's meta strip is owner, delay and waiting.

### Drift (M02 criterion 5, display half)

Same factory `0x5FbDB2315678afecb367f032d93F642f64180aa3` and same featured address `0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc` on both chains.

```
$ cast call 0xe73C…74Bc 'beneficiaries()((address,uint96,string,string)[])' --rpc-url http://127.0.0.1:8545   # State A, 31337
[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 6000, "ops", "operations"), (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 4000, "treasury", "")]

$ cast call 0xe73C…74Bc 'beneficiaries()((address,uint96,string,string)[])' --rpc-url http://127.0.0.1:8546   # State C, 31338
[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 7000, "ops", "operations"), (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 3000, "treasury", "")]
```

Eyebrow texts, read from `#/distros/0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc` on each build:

```
31337 : eyebrow "0xe73C…74Bc · anvil · explorer"     bar segments 60%, 40%   pending bar 40%, 60%   ticks "60% ops | 40% treasury"
31338 : eyebrow "0xe73C…74Bc · anvil-b · explorer"   bar segments 70%, 30%   pending bar 30%, 70%   ticks "70% ops | 30% treasury"
```

Neither build presents the two as one distribution: the chain is in the eyebrow and in the pill, and the page reads only the chain its bundle was built for (`wrongChain()` refuses to read any other).

### Size

Measured after the review round, on the tree at `m02/t02-reading` head:

```
$ make dapp-nodev   ->  dapp: raw 44355 bytes · gzip 14254 bytes · chain 31337
$ make dapp         ->  dapp: raw 44803 bytes · gzip 14440 bytes · chain 31337 · dev overrides kept
chunks = ceil(14254 / 24000) = 1
```

The first revision measured 40,327 raw / 13,338 gzipped, so the review round cost **+4,028 raw / +916 gzipped**: the hero diagram is most of it, the favicon's data URI 393 bytes of it, and the rest is CSS.

Against M02 criterion 8's starting points: the prototype was 75,876 raw / 74,252 stripped / 20,680 gzipped and state-collection ships 56,773 raw / 19,672 gzipped in one chunk. The criterion expected "two chunks at most" for the real dapp; the reading half of it fits in **one**, with **9,746** gzipped bytes of head-room before a second chunk is needed (24,000 − 14,254; it was 10,662). t03's writes, t04's docs page and t05's widget all still have to land, so that head-room is where they go — t04 re-measures the figure.

### Browser verification

The OpenClaw browser tool cannot reach this box's own dev server (`browser.ssrfPolicy` blocks loopback, and `doctor` finds no Chromium), so every page claim above was taken with Playwright 1.63.0 driven from `/tmp/rake-t02-pw`, outside the repo, against the chromium already on disk at `~/.cache/ms-playwright/chromium-1243` — the same route state-collection's t07 used. Nothing it wrote is in the tree. The dev bundle was served from `app/dist` by the project's own `serve` on `:3002` (`:3000` was already taken by another worktree's server); the page was loaded as `http://localhost:3002/?rpc=http://127.0.0.1:8545&from=<anvil key>`. Five scripts: a page-by-page smoke (console messages, failed requests, `#view` text, every `.bar` segment's `flex-basis`, the eyebrows and the footer), the list/field/error checks, the paint-ordering check, the failed-logs check, and the theme/motion check. The paint-ordering check intercepts the RPC URL, reads each POST's JSON-RPC `method`, and delays only `eth_getLogs`, because the dev provider sends every method to one URL; "painted" is a `waitForFunction` on `.bar .seg` and `.ledger .row` being in the document, not a guess.

Nothing in this task rests on served markup alone.

The review round used the same route, for the same reason and one more: the OpenClaw browser tool's `doctor` still reports `No supported browser found (Chrome/Brave/Edge/Chromium on macOS, Linux, or Windows)` and `browser start` fails on it, and both `browser.executablePath` and `browser.ssrfPolicy` are listed in `docs/gateway/configuration/hot-reload.md` as **not** hot-reloadable — pointing it at the Playwright chromium already on disk would need a Gateway restart, which is not mine to do. Three scripts this round: a page-by-page check of the favicon, the footer, every element's left and right edge and the diagram's computed fills (`review.mjs`), a width sweep of the nav from 320 px to 1280 px (`nav.mjs`), and a favicon rasteriser that renders the live `link[rel=icon]` href at 16 / 32 / 64 px on white and on `#111` (`favicon.mjs`). Screenshots are in `/tmp/rake-t02-shots/`. One thing headless Chromium cannot show is its own tab strip, so "the favicon renders in the tab" is evidenced as far as it can be — the link resolves from `<head>`, the browser decodes that exact href to a 150×150 intrinsic SVG, and it rasterises legibly with the split stem still readable at 16 px — but not photographed in a tab.

### Themes

`#/` loaded four times — light and dark, each with and without `prefers-reduced-motion: reduce`:

```
light : paper rgb(252,252,250)  seg s0 oklch(0.47 0.09 230)  s1 oklab(0.600127 …)  amber rgb(184,116,26)
dark  : paper rgb(17,19,17)     seg s0 oklch(0.58 0.09 230)  s1 oklab(0.480918 …)  amber rgb(206,150,64)
transition: flex-basis 0.25s    (no-preference)   ->   none 0s   (reduce)
```

The derived tint moves the right way in each theme (lighter than t1 on paper, darker on ink), which is what `color-mix` against `var(--paper)` buys over two hard-coded hexes.

## Deviations from the plan

- **Step 6's topic is the whole keccak of the event signature, not `sel()` padded.** The plan writes `topics [sel('Created(address,address)') padded, null, pad(ACC)]`. A log topic is the full 32-byte keccak of the signature; the four-byte selector left-padded into a word matches nothing, and `mine` would have been permanently empty. `index.html` therefore carries `const topic = sig => '0x' + Eth.keccak(Eth.utf8(sig))` and uses it for all eight event signatures. The acceptance check is what caught it and what proves the fix: `mine` for anvil key 0 lists the featured distribution.
- **Step 7's "one `in 1 ETH` entry" cannot come from the seeded chain.** The seed deposits through `create{value: 1 ether}`, and `msg.value` rides the CREATE2 — the clone's `receive()` never runs, so no `Received` log exists. `cast balance` of the featured distribution is `1000000000000000000` and the page shows `WAITING TO DISTRIBUTE 1.0000 ETH` from `eth_getBalance − reserved(0)`, but its activity list correctly reads `nothing has arrived at this address yet.` Rather than leave the renderer unproven, State B sends 1 ETH to a hand-made distribution with a plain transfer, and the page prints `in | 1.0000 ETH from 0xf39F…2266 | block 7`. Nothing was changed to make this pass; the plan's expectation of the seed is what is wrong, and `Seed.s.sol` is out of this task's write scope. Worth a `carried` issue if the architect wants the seed to produce a `Received` log for t03's and t05's benefit.
- **The landing's hero diagram is in, by the product owner's ruling in review.** The prototype's `vLanding` pairs the headline with a `0 0 400 382` inline SVG of the fee path; what ships here is `0 0 400 356`, 26 units shorter because the three address lines came out (below). The plan's step 5 enumerates the headline, two sentences, two CTAs, the load field and the four verb blocks and does not name the diagram, so the first revision left it out and said it would go in on the word. The word came in review ("it added visual clarity … the page is pretty boring and noisy honestly"), and it is now `FEEPATH` in `index.html` with `.hero`/`.herograph` in `theme.css`. Two departures from the prototype's SVG, both deliberate: it hardcodes `var(--t1)/--t2/--t3` for the three beneficiary swatches and those variables do not exist in `theme.css`, so they became the `.t0/.t1/.t2` classes the verb icons already use (accent, accent mixed 25 % into paper, 50 %) and one hue declaration still drives every tint in both themes; and the three addresses under the beneficiary boxes are dropped, because at 340 px they were three lines of hex nobody can check and the live example twenty pixels below prints the real ones. Against that the distribution box gained an amber third line, `changes wait the delay`, so the picture now carries all three of the contract's promises — one address in, a published table out, a delay on configuration — rather than the prototype's two. Cost: +4,028 raw / +916 gzipped, § Size.
- **The footer's `docs` link is gone, by the product owner's ruling in review.** `TASK.md` step 2 asks for "footer exactly as state-collection's", which is `work no. 001` on the left and `docs · dnzn labs · v0.1` on the right. The review ruled the `docs` link redundant with the header nav two rows up, so the right side is now the `id="ver"` span alone. Nothing was added in its place: ROADMAP decision 1 wants a link to the DNZN distribution's own page there, and that address does not exist until M03 — it is pending, not forgotten.
- **The featured block on `#/` is the same block as `#/distros/<addr>`, not a reduced one.** Step 5 asks for "its bar and ledger"; M02 criterion 3 asks `#/` for the delay, owner and pending change as well. One `distroBody()` renders bar, ticks, ledger, pending and meta for both routes, so the criterion is met and the two screens cannot drift apart. The detail page adds the eyebrow, the `<h1>`, the supersession line and the two histories.
- **`ticks()` shows the share and the name only; notes and addresses are the ledger's.** The prototype has both a `ticksFull` (notes and addresses, on the landing, no ledger) and a plain `ticksHTML` (shares and names, on the detail page, with a ledger). Since the landing now carries a ledger too, keeping `ticksFull` would have printed every note and address twice on one screen. One `ticks()` remains, and the ledger is the only place a beneficiary's note and address appear.

## Decisions

- **One measure, and it is the frame's.** The page carried four content widths: `.frame` gives 912 px of content at the 960 px cap, `.bar`/`.ticks`/`.verbs`/`.list-row` took all of it, `.sechead`/`.ledger`/`.meta`/`.hist` stopped at 640 and the load field at 460. Every section-head rule and every ledger row therefore ended 272 px short of the bar immediately above it — which is both halves of review item 4, the odd sub-heading widths and the 60/40 lines that stop short. The fix is to say which things are data: a bar, its ticks, a ledger, a meta strip, a history and a list row are all readings of one table, so they share the table's measure and their edges agree down the page. Prose keeps its own — `p.prose` 720, `.notice` 60ch, `.doc` 760 — because a paragraph has a measure for a different reason. The ledger row survives the widening because its grid is `1fr auto`: the name stays at the left rule and the percentage at the right, which is how a ledger is read, and the bar directly above now ends on the same pixel. The load field is the one judgement call — it is a control rather than a rule — but an address is 42 characters and a field that can show one whole is better than a field that cannot, so it takes the measure too.
- **The favicon's accent is a frozen hex, and `#317E9F` is the one.** The Brand Sheet says the mark is `currentColor` only, and in the page it is. A `data:` URI in `<head>` has no page to inherit from, so the favicon needs a literal, and the browser chrome it sits on is not the page's paper — it is whatever the OS and browser theme are. `#317E9F` is `oklch(.56 .09 230)`: the same hue and chroma as both themes' `--accent`, at the lightness that maximises the *worst* case against the two extremes — 4.55:1 on white, 4.62:1 on black, both over 4.5. The light accent (`.47`) is 6.71:1 on white but only 3.13:1 on black; the dark accent (`.58`) is the mirror. An SVG favicon can instead carry its own `prefers-color-scheme` block and track the theme properly, which would be truer to "currentColor only" — it is more bytes, Safari's support for it is not something this tree can test, and the product owner's ruling asked for one explicit fill. Worth revisiting in t04 if the docs page wants a larger mark.
- **Per-segment widths are the only inline styles in the page.** `AGENTS.md` says state is a class and never an inline style, and that holds: `warn`, `err`, `amber`, `on`, `pending`, `s0`/`s1`/`s2` are all classes. A segment's `flex-basis:33.34%` is a value read from the chain, not a state, and it has to reach the element somehow; the alternative is a stylesheet written at runtime, which is worse. Every colour, size and border still lives in `theme.css`, including the icons' tints (`.verbs .t0/.t1/.t2`) and the check mark (`.verbs .chk`), which is why the SVGs in `index.html` carry `currentColor` and class names rather than hexes.
- **The two derived tints are `color-mix`, not the design handoff's hexes.** `design/HANDOFF.md` § Tokens lists t2 `#618999` / `#6AA0B6` and t3 `#95B0BA` / `#95B9C6`; DNZN Base `v1/README.md` and `GUIDELINES.md` both state them as a formula over the accent and paper. The formula is one declaration per tint, follows the hue automatically, and cannot fall out of step with `--accent` — the hexes were the sRGB reading of it. Measured values are in § Themes.
- **`model.js` reads an ambient `Eth` rather than importing one.** The build strips only a trailing `export default X;`, so an `import` line would survive into the bundle and break the page; the plan's "inlined the way `eth.js` is" fixes that shape. Nothing at module scope touches `Eth`, so the test sets `globalThis.Eth` after importing and every call is in time. The contract is stated in `model.js`'s header and in `AGENTS.md`.
- **`countdown` answers `under a minute` below 60 s.** The prototype's `fmtEta` would print `0m` there, which reads as a bug rather than as a minute's wait. The two shapes the plan names (`3d 14h`, `ready to apply`) are unchanged.
- **`amt()` truncates at four decimals** rather than rounding, and lives in `index.html` rather than `model.js` — the plan enumerates `model.js`'s contents, and a display formatter for a balance is not among them. It is a balance to read, not an amount to settle against.
- **Pending-bar gaps are paid for by `flex-shrink`, not by `calc()`.** The prototype computes `calc(bps% − gapShare)` per segment in JS. Letting the three-pixel-gapped segments shrink distributes the overflow in proportion to `flex-basis`, which is the same result with the arithmetic left to the layout engine and the widths still declarative.
- **`send`, `waitReceipt`, `POLL_MS` and `POLL_ERR` were left in place** although this task calls none of them. They are the scaffold's provider code, which the plan says to keep, and t03 is the task that uses them; deleting and restoring them would churn the diff the architect reads twice.
- **Addresses in the hash are checksummed before use.** `#/distros/<addr>` accepts any case and routes through `Eth.checksum`, so `rake.recent` holds one spelling of an address and the list cannot show the same distribution twice.

## Discoveries

- **The rule that hid the nav at mobile scale is the scaffold's, not the base's — so the fix belongs upstream too.** Review item 3 is `@media (max-width:720px){… .navr a{display:none} …}`. It is not this task's, and I measured rather than took that on faith:

```
$ git log --oneline --reverse -S '.navr a{display:none}' -- app/src/theme.css
6cc72a6 feat: initial create          <- the scaffold commit (the repo's second, after 41983be)
32d1902 fix(app): keep distros and docs at small widths   <- this round, removing it

$ grep -n 'navr a{display:none}' ~/src/state-collection/app/src/index.html
64:@media (max-width:720px){.two{grid-template-columns:1fr}.frame{padding:0 16px}.navr{gap:8px}.navr a{display:none}.netname{display:none}#net{padding:6px 8px}}

$ git -C ~/src/design-base show origin/main:v1/dapp/files/app/src/theme.css | grep -n 'navr a{display:none}'
51:@media (max-width:720px){.frame{padding:0 16px}.navr{gap:8px}.navr a{display:none}.netname{display:none}#net{padding:6px 8px}}

$ git -C ~/src/design-base log -1 --format='%h %ad %s' --date=short origin/main -- v1/dapp/files/app/src/theme.css
4d1a272 2026-10-04 feat: ship DNZN Base v1 as a dapp template fragment
```

**Corrected after the architect's re-review.** This bullet first claimed that `design-base` v1 carried no nav responsive rule and that the fix therefore belonged in three places. That was wrong, and the error is worth more than the finding: the measurement was a `grep -rn '@media' ~/src/design-base/v1/` run against a local checkout two commits behind `origin/main`, and the fragment it missed had been there since 2026-10-04 — six days before Rake's own scaffold commit. The grep would not have found it even on a current tree, because it reported a file list from a directory listing of `v1/*` and the rule lives at `v1/dapp/files/app/src/theme.css`. A measurement against an unfetched remote is an assertion wearing a command's clothes.

So the scaffold **is** the `design-base` dapp fragment, Rake's `6cc72a6` descends from it, and there is **one** upstream repo to fix, not three. `state-collection` ships the same rule independently (its CSS is inline in `app/src/index.html` and predates the fragment), so it needs its own change but is not a second source. Rake is fixed here; neither `design-base` nor `state-collection` is in this task's scope and neither was touched. The architect filed them as `design-base#2` and `state-collection#69`. The shape the fragment should adopt is what is in `theme.css` now: shrink the gap, then the type, then the lockup's sub-label (the Brand Sheet draws the lockup both with and without it), and never the destinations.
- **The bundle's minifier does not know HTML comments.** `app/build.mjs` strips `/* */` blocks and whole-line `//`, so a comment in `index.html`'s script, `theme.css`, `model.js` or `eth.js` costs the shipped bundle nothing — which is why those files are commented as heavily as they are. `<!-- -->` is not in either pattern and would ship verbatim. The favicon's rationale was written as an HTML comment in `<head>` first, found to be the only `<!--` in `app/src`, and moved to `theme.css` beside the accent declaration it is actually coupled to. `AGENTS.md` now states this.
- **`cast abi-decode` needs the struct's own parentheses**: `cast abi-decode "snapshot()((address,uint32,…))"`. `TASK.md` step 4 and the shape in M02 criterion 3 write `"snapshot()(…)"`, which decodes the struct as a flat return list and fails with `buffer overrun while deserializing`. Worth correcting wherever the command is quoted for t03 and t04.
- **`--input` does not belong in that command either.** Step 4 writes `cast call … | cast abi-decode --input "snapshot()(…)"`; `--input` decodes *calldata*, and `cast abi-decode` takes the data as a positional argument rather than on stdin, so the pipe is not a pipe. Two steps, no flag.
- **This worktree had no `lib/`.** `git submodule update --init --recursive` was needed before the first `forge build`; without it every `forge` command fails on `forge-std/Script.sol`. Worth a line in `AGENTS.md` for the next worktree, but `AGENTS.md`'s § Contracts entry is about `forge install` moving the pins, which is a different hazard, and the fix is one command — left out of scope rather than guessed at.
- **`serve --listen <port>` is ignored when it runs through `devbox run --`**, which picks an ephemeral port instead; run the binary from `.devbox/nix/profile/default/bin` directly, or through `make serve`'s process-compose, when the port matters. Unrelated to this task's files.
- **Carried forward, untouched here, as the task instructed:** [#34](https://github.com/dnznlabs/rake/issues/34) (M02 criterion 2 names a process-compose command that cannot pass as written) and [#35](https://github.com/dnznlabs/rake/issues/35) (a second `make deploy` on a live anvil redeploys the factory and moves the featured address). #35 is why every figure above names its chain state.
- **t01's handoff is right that `forge lint` has pre-existing `note`-level findings**; on this tree they are in `test/mocks/Mocks.sol` (and `src/App.sol`, `src/Distribution.sol` at other severities). None is in this task's files, and the project's configured severities print nothing.

## Open questions

None.
