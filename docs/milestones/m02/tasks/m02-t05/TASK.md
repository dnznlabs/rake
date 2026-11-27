# m02-t05 — The widget: `widget.js` served by `App`, and the host page

Milestone: [M02](../../MILESTONE.md) · Phase: 4 — Docs and the widget

When this is done `App` serves two documents from one address: `html()` is still the dapp, and
`request(["widget.js"])` returns a second chunk set as `application/javascript`, byte-equal to
`app/dist/widget.js`, with `lock()` covering both (decision 12). The script itself is the prototype's
widget rebuilt on the real contract — one `eth_call` to `snapshot()` through `data-rpc` or the host's
`window.ethereum`, its own decoder for the struct, full and compact variants, loading, failure and
pending states, inheriting the host's font and ink — at or under the design's 10,240-byte budget. A
dev-only host page under `make serve` shows it inside four foil hosts against the featured
distribution. Today `App` answers 404 to every path but the root, and no `widget.js` exists anywhere.

## Plan

Every command runs from the repo root through `devbox run --` (forge/cast `1.7.1-dev`, node
`v24.12.0`). Branch `m02/t05-widget` from `origin/main` **after #60 has merged** (t04's docs page and
`tools/chain-doc.mjs`'s inflated output are both used here). A fresh worktree has no `lib/`: run
`git submodule update --init --recursive` before the first `forge` command
([#41](https://github.com/dnznlabs/rake/issues/41)), check hooks with `ls .git/hooks | grep -v sample`
(expect `pre-commit` and `post-commit`) and run `devbox run -- pre-commit install --install-hooks` if
either is missing. Do not run `make init`.

**Baseline, measured 2026-10-13 — `main` at `98f1b89` for the contract and the tools, #60 at
`fc2d4cb` for the bundle; re-run on the merged t04 rather than quote.** `app/src/widget.js` and
`app/src/host.html` do not exist; `grep -c widget src/App.sol scripts/forge/Chunks.s.sol app/build.mjs`
→ `0` for all three; `test_requestRoot` (`test/App.t.sol:73–90`) pins that `request(["nope"])` is 404,
which is what `request(["widget.js"])` returns today; `forge test` 36 passed; `.gas-snapshot` is 35
lines, 13 of them `AppTest`; `node --test` 46 passed on #60. The bundle on #60: raw 95,224 / gzip
29,443 / 2 chunks / `html()` 39,937 / inflated sha256 `ce38fd31…` (t04 handoff § Size). The prototype's
widget source — `docs/brainstorming/design/rake-widget.html` 79–146, between the `<script
id="rake-widget-src">` tags — is **5,674 bytes raw** with its demo `fetchSnapshot` (137–142) and
`data-demo` hook; the harness (16–77, 148–150) is not part of it. The budget is `wc -c
app/dist/widget.js` ≤ 10,240 (M02 criterion 7, DESIGN_HANDOFF § 1 "widget under ~10 KB"), so the
port has about 4,500 bytes for a real provider, a decoder, and the corrections below. **Estimate:
8,500–9,800 after the minifier.** It is an estimate; step 3's refusal makes the budget a gate rather
than a measurement.

**Design, fixed here so the engineer does not have to choose it.** Two resources, not a path-keyed
map: `App` gains a second `address[]` for the widget, served **raw**, never gzipped — a `<script
src="widget.js">` fetched through a `web3://` gateway must be plain JavaScript, and the gzip bootstrap
is an HTML document that inflates itself, which a script tag cannot run. One chunk holds it (24,000 >
10,240). Rejected: `mapping(string => Doc)` keyed by path — generic, a string compare on every
`request`, and more surface for M03 to read when the whole requirement is two documents; a second `App`
instance — rejected in decision 12. `lock()` freezes both lists; it requires the dapp to exist
(`EmptyDocument`, as today) and **does not** require a widget — a dapp without a widget is a complete
document, and `lock` checks what is there for code. The widget carries no link anywhere: the only
URL it could carry is the mirror M05 publishes, and decision 1 keeps every DNZN line out of it.

1. **`App.sol`: the second resource.** Beside `chunks` (`src/App.sol:21`), `address[] public
   widgetChunks;`. `addWidgetChunk(bytes)` and `setWidgetChunks(address[])` mirror `addChunk`
   (`84–89`) and `setChunks` (`93–103`) — `onlyOwner`, `Locked` when locked, `CodelessChunk` on a
   calldata pointer with no code, `EmptyDocument` on an empty list — without a gzip flag;
   `widgetChunkCount()` beside `chunkCount()` (`125–127`); `widget()` returns the raw concatenation,
   through `_raw` generalised to take the list (`129–134`). `request()` (`70–81`): `["widget.js"]`
   answers `200`, `Content-Type: application/javascript; charset=utf-8`, body `widget()`; when
   `widgetChunks` is empty it answers `404` like any other unknown path, so a freshly deployed `App`
   with the dapp uploaded and no widget is still a valid site. `lock()` (`115–123`) checks every
   pointer in both lists for code; `n == 0` stays a check on `chunks` only. One event,
   `WidgetChunksSet(uint256 count)`. The contract's doc comment (`8–14`) names the second resource,
   as decision 12's § Record asks. Nothing in `html()` or the bootstrap changes — `test_gzipBootstrap`
   stays byte-identical. Check: `forge build --force` clean; `grep -c 'widget.js' src/App.sol` → ≥ 2
   (the comment and the compare).
2. **`App.t.sol`: both resources, both doors.** Add, beside the existing 13: `test_requestWidget` (two
   widget chunks `"(function(){"` + `"})();"` concatenate; `200`; header key `Content-Type`, value
   `application/javascript; charset=utf-8`; `widgetChunkCount()` 2); `test_requestWidgetAbsent`
   (`["widget.js"]` → `404` before any upload, and the root still `200` with the dapp);
   `test_widgetIsNeverWrapped` (`setChunks(…, true)` then a widget upload: `widget()` contains no
   `DecompressionStream` and `request(["widget.js"])`'s body equals the raw bytes);
   `test_lockCoversWidget` (after `lock()`, `addWidgetChunk` and `setWidgetChunks` revert `Locked`);
   `test_lockRejectsCodelessWidgetPointer` (a widget pointer `vm.etch`ed to empty, as `172–182` does
   for the dapp; `lock()` reverts `CodelessChunk(ptr)` and `locked()` stays false);
   `test_lockAcceptsDapWithoutWidget` (dapp uploaded, `widgetChunks` empty, `lock()` succeeds);
   `test_setWidgetChunksRejectsCodelessPointer` and `…RejectsEmptyList` and `…AcceptsValidPointers`
   (the positive control, as `154–167`). Then `forge snapshot` — **this task regenerates
   `.gas-snapshot`, the one tracked file outside `app/`, `scripts/forge/`, `tools/`, `test/` and docs
   that it may change.** Record the line count before and after (35 / 13 `AppTest` today) in the
   handoff; a line for a test that did not change moving is a finding, not noise. Check: `forge test`
   45 passed (36 + 9); `forge snapshot --check` exit 0 after the regenerate, run after `forge build
   --force` and never after `forge lint`.
3. **The widget source and its build.** `app/src/widget.js` from the prototype's 79–146, as one IIFE,
   `'use strict'`, no `export` (it is not `/*@inline*/`d anywhere and it is not a module; `App` serves
   it as a classic script). Changes from the prototype, each a sentence in the handoff:
   - **Provider.** `fetchSnapshot(addr, chainId, cb)` is real: one `eth_call` of
     `{to: addr, data: "0x9711715a"}` (`cast sig "snapshot()"`, measured 2026-10-13; a test asserts
     it against `test/fixtures/abi/selectors.txt`) at `latest`. The transport is `data-rpc` when the
     mount carries it — `fetch` JSON-RPC, `id` 1 — otherwise `window.ethereum.request` **after**
     `eth_chainId` has answered `data-chain` (a wallet on another chain is the failure state, worded
     "wallet is on <name>, distribution is on <name>", not a silent read of the wrong chain); neither
     present is the failure state too. `data-chain` defaults to `1` as the prototype does; the
     `CHAINS` map (84) gains `31337: anvil` and `31338: anvil 31338` so the foil page reads
     naturally, and nothing else.
   - **Decoder.** The widget decodes `snapshot()`'s return itself — no `eth.js` (8,998 bytes raw, and
     it carries keccak the widget never needs since both selectors are literals). A minimal reader for
     this one layout: head offset, then `(address,uint32,uint32,string,(address,uint96,string,string)[],
     (bytes32,uint256,bytes)[])`, with a `bytes`/`string` reader and a tuple-array reader used by both
     the table and the pending list. A pending action whose first four bytes are `0x8868f490`
     (`cast sig "setBeneficiaries((address,uint96,string,string)[])"`) decodes its table and renders the
     prototype's amber preview bar; any other action renders the one amber line "a change is queued
     · lands in <eta>" with no table, which is the dapp's own rule for the other three setters
     (M02 criterion 3). `tip` leaves the footer (decision 1: "nothing in the widget").
   - **Styles.** One `<style id="rk-css">` injected once into `document.head` (guarded by the id, so
     two script tags do not double it), with `rk-` classes, replacing the per-element `style=` strings
     — smaller, and `grep -c 'style="' app/src/widget.js` → 0 keeps the base's rule. Colours: the
     accent as `oklch(.47 .09 230)`, dark `oklch(.58 .09 230)`; the three bar tints as the accent at
     `color-mix(in srgb, <accent> 100% | 75% | 50%, transparent)` — `theme.css:76–78`'s recipe with
     the host's background standing in for `--paper`, which is what "inherit the host" means for a
     tint; amber `#B8741A` / `#CE9640` and error `#B23A2E` / `#D06456` as `theme.css:6–7` has them.
     Those nine literals are the only colours in the file, and a test asserts each occurs in
     `theme.css`, so the widget cannot drift from the base's palette unnoticed. `isDark` (90–95) and
     `data-theme` stay; `RULE` (85) stays; `font: inherit; color: inherit` on the mount stays.
   - **Footer.** `delay 7d · owner 0xf39F…2266 · 0xe73C…74Bc · anvil` — delay, owner, address,
     chain; no `rake.distro`, no link (see Design above). `description` is text, not an anchor.
   - **Dropped.** `data-demo` and `window.RAKE_DEMO_SNAPSHOTS` (harness). `window.RakeWidget =
     {mount, refresh}` stays: the host page and the browser check call `mount`.
   `app/build.mjs` builds it: `app/src/widget.js` → `app/dist/widget.js` through the same minifier
   (`70–71`: block comments, whole-line comments, leading whitespace, blank lines) with `__VERSION__`
   as the only token, no gzip, printing `widget: raw N bytes`, and **exits 1 above `WIDGET_MAX =
   10240`** the way the missing-token refusal does (`59–66`) — the budget is a gate on every
   `make deploy`, not a number in a handoff. Check: `node app/build.mjs --chain 31337 --set …` (the
   t04 invocation) prints the `dapp:` line and a `widget:` line with raw ≤ 10,240;
   `grep -c 'style="' app/src/widget.js` → 0; `grep -rnE '\btip\b|govUrl|about:|ownerKind|rake\.distro' app/src`
   prints nothing.
4. **`test/widget.test.mjs`.** Node, reading `app/src/widget.js` as source like `docs.test.mjs`
   does. Four things: (a) the decoder, extracted by evaluating the IIFE in a stub `window`/`document`
   (a 20-line fake is enough: `document.head.appendChild`, `querySelectorAll` returning `[]`,
   `readyState` `complete`), decodes `test/fixtures/abi/snapshot.return.hex` to the same owner,
   delay `604800`, nonce, description `DNZN fees`, two rows (`6000 ops operations`, `4000 treasury`)
   and one pending `setBeneficiaries` table (`7000 / 3000`) that `Eth.dec` (`test/abi.test.mjs:63–90`)
   reads from it — cast's fixture is the oracle for both decoders, which is why neither is compared
   with itself; (b) `0x9711715a` and `0x8868f490` equal the selectors `selectors.txt` carries for
   `snapshot()` and `setBeneficiaries(...)`; (c) every colour literal in `widget.js` (`#rrggbb` and
   `oklch(…)`) occurs in `app/src/theme.css`; (d) `grep`-equivalent: the source contains no `style="`,
   no `tip`, no `rake.distro`. Check: `node --test test/*.test.mjs` passes and lists the file.
5. **`Chunks.s.sol`: two payloads.** The cut loop (`21–32`) becomes a function `_upload(bytes data,
   function(bytes) returns (address) add)` — or two plain loops if a function-typed argument fights
   `via_ir`; say which — run twice: `app/dist/index.html.gz` (or `.html` under `GZIP=false`) into
   `addChunk` + `setChunks(ptrs, gz)` as today, then `app/dist/widget.js` into `addWidgetChunk` +
   `setWidgetChunks(ptrs)`, logging `widget chunk <i> <ptr>` and `widget bytes <n>` after the
   existing lines. `make chunks` and `make deploy` (`mk/30-onchain.mk:15–18`) need no change: the
   script reads both files from `app/dist`, which `foundry.toml`'s `fs_permissions` already allows.
   Check: `make deploy` on a fresh anvil logs `chunk 0`, `chunk 1`, `widget chunk 0` and no `widget
   chunk 1`; `cast call $APP "widgetChunkCount()(uint256)"` → `1`.
6. **`tools/chain-doc.mjs`: the widget from the chain.** After the inflated lines, call
   `request(["widget.js"], [])` — the calldata is a constant, `cast calldata
   'request(string[],(string,string)[])' '["widget.js"]' '[]'`, pasted with that command in a comment
   — decode `(uint16, string, (string,string)[])` far enough to read the status and the body
   (the tool already reads one `string` return; the body is the second head word's offset), write
   `out/chain/widget.js`, print `widget status 200`, `widget bytes N`, `widget sha256 …`; a 404 prints
   `widget status 404` and nothing else, so an `App` with no widget is reported rather than crashed.
   `rmSync` it first like the others. Check: after `make deploy` then `make dapp-nodev`, `make
   chain-doc | awk '$1=="widget" && $2=="sha256"{print $3}'` equals `sha256sum app/dist/widget.js |
   cut -c1-64` — and because `make deploy` ends by rebuilding the dev bundle, state in the handoff
   whether `widget.js` differs between the dev and non-dev builds (it should not: it has no `/*DEV*/`
   fence and no address token; if the two hashes differ, say why).
7. **The host page.** `app/src/host.html` → `app/dist/host.html`, copied by `build.mjs` with
   `__DISTRIBUTIONFACTORY__`, `__FEATURED_SALT__` and `__CHAIN_ID__` substituted and nothing minified
   (a foil, not a bundle; never uploaded — `Chunks.s.sol` does not read it). The prototype's four
   panels (`rake-widget.html:31–62`) in their own looks — dark indigo, light SaaS, serif, and the
   states panel — **styled by a `<style>` block of their own and not by `theme.css`**: the page exists
   to show the widget wearing the host's font and ink, so a host that is DNZN Base proves nothing.
   `<script src="widget.js">` relative, as `serve` (`procs/20-dapp.yml`) serves both from `app/dist`.
   An inline script reads `?rpc=` (default `http://127.0.0.1:8545`), calls
   `predict(__FEATURED_SALT__)` on the factory (`0x0e787cce`), then writes the mounts: full
   (featured, `data-rpc`), compact (featured, `data-variant="compact"`), **failure** (an address with no
   code — `0x000000000000000000000000000000000000dEaD` on the same rpc: `eth_call` returns `0x`, the
   decoder refuses, "could not read distribution 0x0000…dEaD on anvil"), and **loading, then failure**
   (`data-rpc="http://127.0.0.1:9"` — no listener, so the first paint is "reading distribution…" and
   the settled state is the failure line; one mount shows both states deterministically, which a
   demo hook could not). Every mount is created *after* `predict` answers and mounted with
   `RakeWidget.mount(el)`, so the page does not depend on `DOMContentLoaded` ordering. Check:
   `grep -c 'theme.css' app/src/host.html` → 0; the page under `make serve` at
   `http://localhost:3000/host.html?rpc=http://127.0.0.1:8545` shows four panels.
8. **Browser check, recorded.** The Playwright chromium t02–t04 used (`~/.cache/ms-playwright/
   chromium-1243`, driven from a directory outside the repo) against the dev build served on a
   non-default port (`APP_PORT=3099`, anvil on `8599` — [#35](https://github.com/dnznlabs/rake/issues/35):
   fresh chain, one deploy). Record, verbatim: on the full mount, the description `DNZN fees`, two
   segments at `60%`/`40%` (31337's table), two rows, a pending block whose preview is `40 / 60` with
   `lands in 6d 23h` or similar, and the footer line; on the compact mount, one bar and one line; the
   failure mount's text; the loading mount's text read synchronously after `mount()` and again after
   settle; `console messages` and `page errors`, expected none but the no-listener fetch's own network
   error on the loading mount (quote it — it is the proof the state machine saw a failure). Then on
   the chain document: `out/chain/widget.js` loaded into a page by `<script src>` from a static server
   mounts the full variant of the featured distribution with `data-rpc` — the served bytes execute.
9. **Criterion 7, 8 and 9, in full.** This is M02's last task, so the reviewer re-runs criterion 9's
   whole list including the `31338` deploy of criterion 5 (`make deploy ANVIL_PORT=8546
   CHAIN_ID=31338` on a second anvil — the widget uploads there too, and the host page pointed at it
   shows the `70/30` table). Criterion 8 is re-measured because `App` changed (Phase 5 § Consequences
   2 — `App.sol` re-opens 7 and 8): the t04 figures with a t05 row beside them, raw / gzip / chunks /
   `html()` bytes / inflated sha256, plus `widget.js` bytes and sha256.
10. **Docs.** `AGENTS.md` § The contract-hosted dapp: `App` serves two documents, the widget raw and
    never gzipped and why, the 10,240 gate in `build.mjs`, `make chain-doc`'s three `widget` lines;
    § The dapp: `widget.js` is a second bundle with its own decoder and no `eth.js`, `model.js` or
    `theme.css`, `host.html` is a foil and not a page of the dapp, `test/widget.test.mjs`. The docs
    page's § The widget already says `src="widget.js"` — read it against what shipped and change a
    sentence only if it is now wrong. `HANDOFF.md` beside this file: § Size with the table from step
    9, § Budget with the widget's raw bytes and what the 10,240 has left, § Reference check for the
    decoder's layout against `src/Distribution.sol:10–30` and for every string the widget shows that
    states contract behaviour (the "no delay" line, the pending line).

## Acceptance criteria

Each is a command the reviewer runs through `devbox run --`; multi-command checks are a script file
under `/tmp`, because `devbox run -- bash -c '…'` mangles `|` and `$VAR`. Baselines are `main` at
`98f1b89` and #60 at `fc2d4cb`, 2026-10-13, re-run rather than quoted.

- **M02 criterion 7 — served.** `forge test` passes with the nine tests of step 2 among the names
  (`forge test --match-contract AppTest --list` prints them); `test_gzipBootstrap` is unchanged in
  `git diff origin/main -- test/App.t.sol`. On a fresh anvil after `make deploy`:
  `cast call $APP "widgetChunkCount()(uint256)"` → `1`; `make chain-doc` prints `widget status 200`
  and a `widget sha256` equal to `sha256sum app/dist/widget.js | cut -c1-64`; `chunkCount()` → `2`
  and the `inflated sha256` still equals `sha256sum app/dist/index.html` after `make dapp-nodev`.
  Today: no such function, `request(["widget.js"])` → 404.
- **M02 criterion 7 — the budget.** `wc -c app/dist/widget.js` ≤ `10240`, recorded in the handoff;
  `node app/build.mjs` with a scratch copy of `widget.js` padded past the budget exits 1 with a
  message naming the bytes (demonstrate once, restore, `git status --porcelain` empty).
- **M02 criterion 7 — the host page.** With the dev build served, `host.html?rpc=…` renders the
  featured distribution in the full and compact variants, a failure state for the no-code address,
  and a loading state that becomes a failure state on the no-listener rpc, each recorded from the
  browser as step 8 says; `#rk-css` occurs once in `document.head` with two or more mounts on the
  page. `grep -c 'theme.css' app/src/host.html` → 0.
- **The widget reads the contract, not a demo.** `node --test test/*.test.mjs` passes and lists
  `test/widget.test.mjs`; its decoder case reads `test/fixtures/abi/snapshot.return.hex`; changing one
  byte of the fixture's `delay` word in a scratch copy fails it (demonstrate, restore). The two
  selector literals equal `selectors.txt`'s. `grep -c 'RAKE_DEMO' app/src/widget.js` → 0.
- **The palette is the base's.** Every `#[0-9a-fA-F]{6}` and `oklch\([^)]*\)` literal in
  `app/src/widget.js` occurs in `app/src/theme.css` (the test of step 4 (c), and a grep the reviewer
  runs by hand). `grep -c 'style="' app/src/widget.js` → 0; `app/src/index.html`'s count equals the
  `main` figure (5 on #60).
- **Vocabulary.** `grep -rnE '\btip\b|govUrl|about:|ownerKind|rake\.distro' app/src` prints
  nothing — `app/src` as a whole, the widget and the host page included.
- **Criterion 9, whole list.** `forge build --force` prints no `Warning (` or `warning[`; `forge
  lint` and `make fmt` silent; `forge snapshot --check` exit 0 with no `Diff in` after the regenerate
  (and `.gas-snapshot`'s diff is additions plus whatever moved, each movement explained);
  `git status --porcelain` empty after `forge build --force`, `forge test`, `forge snapshot`, `make
  deploy`, the 31338 deploy of criterion 5, and `make chain-doc`.
- `git diff --stat origin/main` names only `src/App.sol`, `test/App.t.sol`, `.gas-snapshot`,
  `scripts/forge/Chunks.s.sol`, `app/build.mjs`, `app/src/widget.js`, `app/src/host.html`,
  `test/widget.test.mjs`, `tools/chain-doc.mjs`, `AGENTS.md` and the handoff. `app/src/index.html` is
  permitted for one sentence in § The widget if step 10 finds it wrong; say so if it changes.

## Out of scope

- A `web3://` gateway reading either document, and a browser wallet — **M04**. Here the served bytes
  are proved equal and executed from a static copy; nothing more.
- A published widget URL, mirrors at dnzn.dev or IPFS, and any link from the widget to a page — **M05**.
  The widget carries no `href`; a `data-href` attribute is M05's to add if the mirror wants it.
- `App.lock()` — ruled out in `ROADMAP.md`; the tests exercise it, no deploy calls it.
- Owner-kind routes, name resolution, and anything in `app/src/index.html` beyond step 10's one
  sentence; the t04 trim list — Phase 5.
- `src/Distribution.sol`, `test/Distribution*.t.sol` and the M01 suite: untouched. `.gas-snapshot`
  changes only by the `AppTest` lines (and whatever moves — explained, not silenced).
- A widget build that gzips, inlines, or splits across chunks. The budget is one raw chunk; if the
  widget cannot fit 10,240 bytes the handoff says what it would cost to, and the plan is wrong, not the
  budget.
- Serving `host.html` from the chain. It is a dev foil.

## Open questions

None. The two choices a plan could have left open — whether `lock()` requires a widget, and whether
the widget links anywhere — are decided under § Design above, neither being the Product Owner's:
the first is contract behaviour M03 reads either way, the second follows from decision 1 and from
there being no URL to link until M05.

## Context

- Decision 12 (`ROADMAP.md`; [#27](https://github.com/dnznlabs/rake/issues/27)): `App.request(["widget.js"])`,
  `application/javascript`, `html()` stays the dapp, `lock()` covers both. Decision 1: nothing DNZN
  in the widget. Decisions 10 (the sender-bound salt the host page predicts with), 15 (the landing's
  bar, whose tints `theme.css:76–78` define).
- Design: `docs/brainstorming/DESIGN_HANDOFF.md` § 4 (the widget: mounts, inherits the host, compact
  and full, loading and failure), § 1 (sizes), § 5 (the bar; 4 px radius on the bar only in the
  widget). Prototype `docs/brainstorming/design/rake-widget.html`: 31–62 (the four foils), 79–146
  (the widget: `TL/TD/AMB/ERR` 82–83, `CHAINS` 84, `RULE` 85, `isDark` 90–95, `barHTML` 96–98,
  `render` 99–136, `fetchSnapshot` 137–142, `mountAll`/`RakeWidget` 143–145).
- Contract: `src/App.sol` (`chunks` 21, `html()` 47–64, `request()` 70–81, `addChunk` 84–89,
  `setChunks` 93–103, `lock()` 115–123, `chunkCount()` 125–127, `_raw()` 129–134);
  `test/App.t.sol` (`test_requestRoot` 73–90, `test_lockRejectsCodelessPointer` 172–182,
  `test_setChunksAcceptsValidPointers` 154–167); `scripts/forge/Chunks.s.sol` (`MAX_CHUNK` 12, loop
  21–32); `scripts/forge/Seed.s.sol` (the featured table, `6000/4000` on 31337 and `7000/3000` on
  31338, one pending `setBeneficiaries` swapping the shares); `src/Distribution.sol:10–30` (the
  structs the decoder reads).
- Build and serve: `app/build.mjs` (minify 70–71, refusal 59–66, gzip 83, output line 86);
  `mk/20-dapp.mk`, `mk/30-onchain.mk:15–18` (deploy order: nodev, chunks, dev), `procs/20-dapp.yml`
  (`serve --listen $APP_PORT app/dist`); `tools/chain-doc.mjs` as #60 leaves it.
- Fixtures: `test/fixtures/abi/snapshot.return.hex` and `selectors.txt`, written by
  `tools/abi-vectors.sh`; `test/abi.test.mjs:63–90` (how `Eth.dec` reads the same fixture).
- Carried into this task: none. Carried past it, read before starting: [#50](https://github.com/dnznlabs/rake/issues/50),
  [#42](https://github.com/dnznlabs/rake/issues/42), [#41](https://github.com/dnznlabs/rake/issues/41),
  [#35](https://github.com/dnznlabs/rake/issues/35) (M02); [#61](https://github.com/dnznlabs/rake/issues/61)
  and the M03 set; the shared design system's own issue (the base styles
  the bare `nav` — moot for the host page, which does not load the base). If any names `widget.js`,
  `App.sol` or `Chunks.s.sol`, it is a defect in this plan, fixed here before work begins.
- Precedent: t04 handoff § Size and § Deviations (the hash order; the inflated output); M02 Phase 5
  § Consequences 1–2 (what an `app/` or `App.sol` change re-opens).
