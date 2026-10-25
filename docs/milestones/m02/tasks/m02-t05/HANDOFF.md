# m02-t05 — handoff

PR: #65 · Branch: `m02/t05-widget` · 2026-10-17

`App` serves two documents from one address. `html()` is the dapp, byte for byte what it was — the
bundle's raw bytes, its gzip, its chunk count and its `inflated sha256` are all unchanged from `main` —
and `request(["widget.js"])` returns a second pointer list raw as
`application/javascript; charset=utf-8`, with `lock()` covering both lists and requiring only the dapp.
The widget is the prototype's rebuilt on the real contract: one `eth_call` of `snapshot()` through
`data-rpc` or the host's wallet, its own reader for the return (no `eth.js`, no keccak), the full and
compact variants, loading, failure and queued-change states, and one injected `<style id="rk-css">`
in place of forty `style=` strings — **7,677 bytes, 2,563 under the 10,240 budget**, which
`app/build.mjs` now refuses to cross. `app/src/host.html` shows it in four foil hosts under
`make serve`, `scripts/forge/Chunks.s.sol` uploads both documents in one broadcast, and
`tools/chain-doc.mjs` reads the served script back off the chain and hashes it.

Measured on a fresh anvil at `:8599` (chain 31337) and a second at `:8546` (chain 31338), one deploy
each, everything through `devbox run --` (forge/cast `1.7.1-dev`, node `v24.12.0`). The figures below
are this branch's, re-measured rather than quoted: the plan's baseline was taken on #60's first cut and
`main` carries the rewrite (§ Size).

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| **M02 criterion 7 — served** | pass | `forge test` → `45 tests passed, 0 failed`; `forge test --match-contract AppTest --list` prints 22 names, the nine of step 2 among them (`test_requestWidget`, `test_requestWidgetAbsent`, `test_widgetIsNeverWrapped`, `test_lockCoversWidget`, `test_lockRejectsCodelessWidgetPointer`, `test_lockAcceptsDappWithoutWidget` (renamed on review), `test_setWidgetChunksRejectsCodelessPointer`, `…RejectsEmptyList`, `…AcceptsValidPointers`). `git diff origin/main -- test/App.t.sol` is a single trailing hunk (`@@ -202,4 +202,156 @@`); `test_gzipBootstrap` is byte-identical, 1,431 bytes on both sides. On a fresh anvil after `make deploy`: `chunk 0 0xCafac3dD…052c`, `chunk 1 0x9f1ac54B…3a8e`, `widget chunk 0 0xbf9fBFf0…CC55` and **no** `widget chunk 1`; `chunkCount()` → `2`, `widgetChunkCount()` → `1`. `make chain-doc` → `widget status 200`, `widget bytes 7677`, `widget sha256 6221a653ef7e41eddae9694561e6aea1cd8844ac7d50c9864a35374814ef773e` = `sha256sum app/dist/widget.js`; `inflated sha256 21d47cf629f8…` = `sha256sum app/dist/index.html` (85,737 bytes) after `make dapp-nodev`. |
| **M02 criterion 7 — the budget** | pass | `wc -c app/dist/widget.js` → `7677`; the build prints `widget: raw 7677 bytes · budget 10240 · 2563 left`. Padding `app/src/widget.js` with 3,000 bytes of surviving code: `build: the widget is 10581 bytes, 341 over the 10240-byte budget` / `the budget is the design's, not the chunk's — cut the widget, or re-argue the budget`, **exit code 1** (read directly, not off a pipe), and `app/dist/widget.js` still held the previous build — the refusal precedes every write. Restored; `git status --porcelain` empty. |
| **M02 criterion 7 — the host page** | pass | Recorded in § The browser check. `http://localhost:3099/host?rpc=…` renders the featured distribution full (two panels), compact, a failure state for `0x…dEaD`, and a loading state that becomes a failure state on the dead endpoint. `document.head.querySelectorAll('#rk-css').length` → `1` with **five** mounts on the page. `grep -c 'theme.css' app/src/host.html` → `0`. The URL is `/host`, not `/host.html` — see § Discoveries 1, the one finding in this task. |
| **The widget reads the contract, not a demo** | pass | `node --test test/*.test.mjs` → `tests 54 · pass 54 · fail 0`, `test/widget.test.mjs` among the files (8 tests; the suite was 46). Its decoder case reads `test/fixtures/abi/snapshot.return.hex`; flipping the last nibble of that fixture's `delay` word (`…093a80` → `…093a81`, 604800 → 604801) fails three tests, the widget's decoder case among them, with `actual: 604801n, expected: 604800n`. Restored; tree clean. `0x9711715a` and `0x8868f490` are the only `0x`-literals in `widget.js` and equal `selectors.txt`'s `snapshot()` and `setBeneficiaries((address,uint96,string,string)[])`. `grep -c 'RAKE_DEMO' app/src/widget.js` → `0`. |
| **The palette is the base's** | pass | `grep -oE '#[0-9a-fA-F]{6}\|oklch\([^)]*\)' app/src/widget.js` yields **six** literals, each occurring once: `oklch(.47 .09 230)`, `oklch(.58 .09 230)`, `#B8741A`, `#CE9640`, `#B23A2E`, `#D06456`. All six are in `app/src/theme.css` (enumerated one by one, after stating the population size — the plan says nine; see § Deviations 6). `grep -c 'style="' app/src/widget.js` → `0`; `app/src/index.html` → `5`, the same count `origin/main` has, and that file does not change on this branch. |
| **Vocabulary** | pass | `grep -rnE '\btip\b\|govUrl\|about:\|ownerKind\|rake\.distro' app/src` prints nothing. |
| **Criterion 9, whole list** | pass | `forge build --force` → `Compiler run successful!` with no `Warning (` or `warning[`; `forge lint` and `make fmt` silent; `forge snapshot` then `forge build --force` then `forge snapshot --check` → exit 0, no `Diff in`, and the check's own output shows `Ran 22 tests for test/App.t.sol:AppTest` so it measured the edited suite (lint was run only after). `.gas-snapshot` 35 → 44 lines, 13 → 22 `AppTest`, every moved line attributed in § The gas snapshot. `git status --porcelain` empty after `forge build --force`, `forge test`, `forge snapshot`, `make deploy` on 31337, `make deploy ANVIL_PORT=8546 CHAIN_ID=31338`, and `make chain-doc`. The 31338 chain: `chunkCount()` → `2`, `widgetChunkCount()` → `1`, `widget status 200`, the same `widget sha256 6221a653…`, and the host page against it renders `70%` / `30%` with `anvil 31338` in the footer. |
| **The diff names only the permitted files** | pass | `git diff --stat origin/main` → `.gas-snapshot`, `AGENTS.md`, `app/build.mjs`, `app/src/host.html`, `app/src/widget.js`, `scripts/forge/Chunks.s.sol`, `src/App.sol`, `test/App.t.sol`, `test/widget.test.mjs`, `tools/chain-doc.mjs`, and this handoff. **`app/src/index.html` does not change**: its § The widget says the script is served by the same contract, names a full and a compact version, and shows `<script src="widget.js">` with `data-rake` / `data-chain` — all four true of what shipped, so step 10's permitted sentence was not needed. |

## Size

Criterion 8 re-measured because `App.sol` changed (M02 Phase 5 § Consequences 2). The dapp is
**byte-identical to `main`'s** despite `app/build.mjs` being refactored to share its substitution and
minifier between three sources — same raw bytes, same gzip, same two chunks, same `html()` length, same
`inflated sha256`:

| build | raw | gzip | chunks | `html()` bytes | `inflated sha256` | `widget.js` bytes | `widget sha256` |
|:--|--:|--:|--:|--:|:--|--:|:--|
| `main` 58ba45d, chain 31337 | 85,737 | 26,349 | 2 | 35,809 | `21d47cf629f8…` | — (404) | — |
| **t05, chain 31337** | 85,737 | 26,349 | 2 | 35,809 | `21d47cf629f8…` | **7,677** | `6221a653ef7e…` |
| t05, chain 31338 | 85,737 | 26,350 | 2 | 35,813 | `97654f9dbd2b…` | 7,677 | `6221a653ef7e…` |

Three notes on that table. The widget's hash is **the same on both chains**: it carries no address and
no chain token, which is also why it is identical in a dev and a non-dev build (`6221a653…` in both,
while `index.html` is `e1114565…` dev against `21d47cf6…` non-dev). The 31338 dapp differs only by the
substituted chain id, which costs 4 bytes in `html()` and one byte of gzip.

And **every dapp figure in that table is per-deployment, so the row only holds on a fresh chain with one
deploy.** A second `make deploy` on a live anvil moves the factory
([#35](https://github.com/dnznlabs/rake/issues/35)), the new address is substituted into the bundle, and
the raw length stays 85,737 while the gzip and the `sha256` both change — 26,349 → 26,353 and
`21d47cf6…` → `a336c1fd…` on the chain this branch was verified on, purely from the address bytes. The
`main`-versus-t05 equality above is like-for-like: both built against the same broadcast log, and the
figures reproduce on any fresh chain, which is how the criteria prescribe measuring them and how the
architect reproduced them independently on `:8597`.

**The plan's baseline was stale and is not what this is measured against.** `TASK.md` quotes #60 at
`fc2d4cb` — raw 95,224 / gzip 29,443 / `html()` 39,937 / inflated `ce38fd31…` — which was that PR's
first cut; `main` carries the rewrite it landed with. The delta from the plan's figures to the ones
above is **−9,487 raw, −3,094 gzip, −4,128 `html()`**, all of it t04's, none of it this task's.

## Budget

`app/dist/widget.js` is **7,677 bytes of the 10,240 the design allows — 2,563 left, 75.0% used.** The
plan estimated 8,500–9,800 after the minifier; it came in under because the stylesheet *replaced* the
prototype's per-element `style=` strings rather than adding to them, which is the one change that both
shrinks the file and makes the host unable to override the widget's own geometry by accident. The
prototype's source was 5,674 bytes with its demo hook, so the real provider, the decoder, the chain
mismatch state, the retry and the queued-change preview cost about 2,000 bytes net. The review round's
UTF-8 fallback ([#67](https://github.com/dnznlabs/rake/issues/67)) is 111 of those bytes — more than
the ~40 the issue estimated, because the fallback decodes the percent string with a `replace` rather
than the deprecated `unescape`, and the budget has room for the non-deprecated form.

The budget is now a gate, not a figure: `app/build.mjs` exits 1 above `WIDGET_MAX = 10240` **before it
writes any artifact**, so a widget that has quietly grown stops the `make deploy` that would upload it,
and `app/dist`'s three files can never disagree. One SSTORE2 chunk holds 24,000 bytes, so the limit
that bites is the design's and the contract never sees a second widget chunk.

## The browser check

Chromium 153.0.8010.12 (`~/.cache/ms-playwright/chromium-1243`, the arm64 build), driven from
`/tmp/t05-browser`, against the dev bundle on `:3099` and anvil `:8599`, featured distribution
`0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc`. Verbatim:

- **Page header** — `featured 0xe73c1ac3d8ba5bc73a4720a3ae9798d5a1e174bc · chain 31337 · rpc http://127.0.0.1:8599`
- **Full mount** (`m-dex`, dark indigo; `m-saas` identical but for the theme class) — description
  `DNZN fees`; two segments, `data-w` `60%` and `40%` reaching `flex-basis` and computing to `60%` /
  `40%`, titled `ops 60%` and `treasury 40%`; rows `ops — operations 0x3c44…93bc60%` and
  `treasury 0x7099…79c840%`; pending line `a change is queued · lands in 6d 23h` with the preview bar
  `calc(40% - 1.0px)` / `calc(60% - 1.0px)` titled `ops 40%` / `treasury 60%` — the seed's queued
  `setBeneficiaries` swaps the shares, and the preview shows the swap; footer
  `delay 7d · owner 0xf39f…2266 · 0xe73c…74bc · anvil`; no `.rk-nd` line, the delay being non-zero.
  `classList` is `["rk","rk-dk"]` on the indigo host and `["rk"]` on the light one, so `isDark` reads
  the host it is in and nothing else.
- **Compact mount** (`m-serif`) — one `.rk-b` with the same two segments, one line, no heading, no
  table, no footer block: `ops 60% · treasury 40% — delay 7d · owner 0xf39f…2266 · 0xe73c…74bc · anvil`
- **Failure mount** (`m-fail`, `0x…dEaD`, code-less) —
  `could not read distribution 0x0000…dEaD on anvil · retry`
- **Loading, then failure** (`m-load`, `data-rpc="http://127.0.0.1:9"`) — read synchronously on return
  from `mount()`: `reading distribution…`, with
  `<div class="rk-b rk-w"></div><div class="rk-msg">reading distribution…</div>`; settled:
  `could not read distribution 0xe73c…74bc on anvil · retry`. All five mounts return
  `reading distribution…` from that synchronous read, which is the state machine's first paint.
- **Console, page errors, request failures over the whole page life** —
  `console: ["[error] Failed to load resource: net::ERR_UNSAFE_PORT"]`, `pageErrors: []`,
  `requestFailures: ["POST http://127.0.0.1:9/ — net::ERR_UNSAFE_PORT"]`. One error, from the dead
  endpoint, and it is the proof the failure path ran — see § Discoveries 2 for why it is
  `ERR_UNSAFE_PORT` rather than a refused connection.
- **`#rk-css`** — `1` in `document.head` with five mounts on the page.
- **The chain's bytes execute** — `out/chain/widget.js` (`6221a653…`, 7,677 bytes, written by
  `make chain-doc` from `request(["widget.js"])`) served over HTTP from a scratch directory and loaded
  by `<script src="widget.js">` into a page carrying one mount for the featured distribution: the full
  variant renders, same `DNZN fees`, same `60%` / `40%` rows, same pending preview, footer
  `delay 7d · owner 0xf39f…2266 · 0xe73C…74Bc · anvil`, `#rk-css` once, `consoleMsgs: []`,
  `pageErrors: []`.
- **Chain 31338**, the same page against `:8546` — `70%` / `30%`, rows `ops … 70%` /
  `treasury … 30%`, preview `calc(30% - 1.0px)` / `calc(70% - 1.0px)`, footer
  `delay 7d · owner 0xf39f…2266 · 0xe73c…74bc · **anvil 31338**`, which is the `CHAINS` entry this task
  added earning its place.

## The gas snapshot

`.gas-snapshot` goes 35 → 44 lines and 13 → 22 `AppTest`; the diff touches `AppTest` lines only. Every
pre-existing `AppTest` figure moved, and the plan is right that a moved line needs an explanation. It
is two measured components, not one. Pairing **this branch's contract with `origin/main`'s test file**
(a superset ABI, so it compiles) separates them:

| test | `main` | new contract, base tests | shipped | from `App` | from the test contract |
|:--|--:|--:|--:|--:|--:|
| `test_gzipBootstrap` | 185,835 | 186,159 | 182,233 | **+324** | **−3,926** |
| `test_requestRoot` | 117,874 | 118,509 | 118,568 | +635 | +59 |
| `test_lock` | 125,798 | 128,286 | 128,440 | +2,488 | +154 |

The `App` column is the larger selector dispatch (one more `address[]`, four more external functions),
plus — on the two tests that reach a successful `lock()` — the extra `widgetChunks.length` SLOAD that
makes `lock()` cover both lists. The test-contract column is `AppTest`'s own codegen shifting as the
suite grew from 13 tests to 22; it is the larger of the two effects on `test_gzipBootstrap`, which is
why that line *falls* while the contract it exercises got slightly more expensive. The contract's
behaviour on that path is unchanged and the test's source is byte-identical.

## Reference check

The decoder's layout, against `src/Distribution.sol`:

| widget | contract | |
|:--|:--|:--|
| head word → struct at `b`; `owner` `adr(b)`, `delay` `u(b+32)`, `nonce` `u(b+64)`, `description` `txt` at `b+96`, `table` `arr` at `b+128`, `pending` `arr` at `b+160` | `struct Snapshot` `22–29`: `address owner; uint32 delay; uint32 nonce; string description; Beneficiary[] table; Pending[] pending` | ✓ field order and word positions |
| `ben(p)` → `account` `adr(p)`, `bps` `u(p+32)`, `name` `txt` at `p+64`, `note` `txt` at `p+96` | `struct Beneficiary` `10–14`: `address account; uint96 bps; string name; string note` | ✓ |
| pending entry → `eta` `u(p+32)`, action bytes at `p+64` | `struct Pending` `16–20`: `bytes32 hash; uint256 eta; bytes action` | ✓ `hash` is read past, never decoded |
| `pct(bps) = bps/100` | `BPS_TOTAL = 10_000` (`49`), `sum != BPS_TOTAL` reverts `BadTable` (`241`) | ✓ a share is basis points of 10,000 |

Every string the widget shows that states contract behaviour:

| string | line | |
|:--|:--|:--|
| footer `delay 7d` / `no delay` | `delay` is the queue's wait in seconds; `propose` with `d == 0` runs the action in the same transaction (`148`, `155–159`) | ✓ |
| `no delay — the owner can change this table instantly` | same lines — `_selfCall(action)` then `Applied`, no `queued` entry | ✓ and it is the dapp's own wording for the same state |
| `a change is queued · lands in <eta>` | `Pending.eta` (`161–164`); `applyQueued` reverts `NotReady(eta)` while `block.timestamp < eta` (`170–175`) | ✓ |
| `ready to apply` (eta passed) | `applyQueued` has no owner check (`170`) — once `eta` has passed anyone may apply it | ✓ |
| `a change is queued` with **no** preview table for an action that is not `setBeneficiaries` | the other three setters change a scalar or a string, so there is no table to draw; the dapp's rule (M02 criterion 3) | ✓ |
| `wallet is on <name>, distribution is on <name>` | not a contract claim — `eth_chainId` against `data-chain` | n/a |

## Deviations from the plan

1. **Three worktrees, one branch.** The work ran as two parallel lanes (`App.sol` + `App.t.sol`;
   `widget.js` + `host.html` + `build.mjs` + `widget.test.mjs`) on their own branches, cherry-picked
   onto `m02/t05-widget` with the integration work (`Chunks.s.sol`, `chain-doc.mjs`, `AGENTS.md`, this
   file). Same commits, same base, one PR; the file sets never overlapped.
2. **`widget()` returns `string memory`.** The plan fixes the body and the concatenation but not the
   return type. `string` mirrors `html()` and makes `request`'s `body` a direct assignment.
3. **`test_lockAcceptsDappWithoutWidget` — the plan spells it "Dap".** The criterion is a name check
   against step 2, so the typo was carried rather than silently corrected, and flagged for the
   architect; he called the rename in review and it is in this branch (§ The review round).
4. **`_upload` takes a function pointer, as the plan preferred.** The fallback it offers ("or two plain
   loops if a function-typed argument fights `via_ir`") was not needed: an external function pointer
   `function(bytes memory) external returns (address)` compiles clean under `via_ir` with
   `optimizer_runs = 1000`. It also takes a `label`, so one loop prints both `chunk <i>` and
   `widget chunk <i>`. The rejected alternative was measured too: separate `_raw()`/`_rawWidget()`
   bodies cost *more* on every path (`test_gzipBootstrap` +40, `test_requestWidget` +228), so the
   plan's generalised `_raw(address[] storage)` is also the cheaper one.
5. **`chain-doc.mjs` factors its `eth_call` into one local helper** rather than carrying a second copy
   of the `fetch` block for the widget. Same requests, same error strings, one of each.
6. **Six colour literals, not nine.** The plan counts the accent, its dark variant, the three bar tints,
   amber ×2 and error ×2. The three tints are not literals: they are
   `color-mix(in srgb, var(--rk-ac) 100%|75%|50%, transparent)` over the accent custom property —
   `theme.css:76–78`'s recipe with *transparency* standing in for `--paper`, since the widget has no
   paper of its own and a tint has to let the host's background through. So the file carries six
   literals and the test and the grep enumerate six. The constraint the plan wanted is unchanged and
   met: every colour in the widget occurs in `theme.css`.
7. **`widget bytes` in `Chunks.s.sol` is read back off the chain** (`bytes(app.widget()).length`),
   mirroring `html() bytes`, rather than printed from the file. It is the stronger line: it proves the
   concatenation reads, not that a file was opened.
8. **Four panels, five mounts.** Step 7 asks for four foils and four states; the states panel carries
   two mounts (the code-less address and the dead endpoint) so both states stand side by side, and the
   two full panels are the dark and light hosts. That is also what makes the `#rk-css`-once check
   meaningful.
9. **`app/build.mjs`'s refusal moved ahead of every write.** The gate as first built fired after
   `app/dist/index.html` had been written, which would leave `app/dist` holding a new dapp beside an old
   widget for `make chunks` to upload. All three artifacts are now computed, then written.

## Discoveries

1. **`serve`'s clean-URL redirect drops the query string, so the plan's host-page URL does not work.**
   `curl -D - 'http://localhost:3099/host.html?rpc=http://127.0.0.1:8599'` answers
   `301` / `Location: /host` — no query — and the page then reads its `http://127.0.0.1:8545` default,
   fails to reach a factory and renders nothing (`MOUNTS: 0`,
   `could not reach 0x5FbD…0aa3 on http://127.0.0.1:8545 — Failed to fetch`). Step 7's own check line
   (`:3000/host.html?rpc=http://127.0.0.1:8545`) passes only because the value it drops equals the
   default; step 8's non-default endpoint is exactly the case that breaks. Nothing in `host.html` or
   `widget.js` is at fault — the `?rpc=` reader works on `/host`. `AGENTS.md` now documents `/host`,
   and every measurement above was taken there. A reviewer following `TASK.md` literally will see a
   blank page; that is the plan's URL, not a regression.
2. **Chromium refuses port 9 as unsafe, so the "no listener" mount fails for a different reason than
   the plan expects.** The failure arrives as `net::ERR_UNSAFE_PORT` from the browser rather than a
   refused connection from the kernel. The state machine still sees a rejected `fetch` and still shows
   loading then failure, so the mount demonstrates what it was built to demonstrate. The review settled
   why it stays: a browser-refused port fails identically on every machine, where "nothing listens on
   this port" depends on what the machine happens to be running. `host.html`'s own comment now says
   that, in place of the "hangs then fails" it claimed before.
3. **The playwright chromium does run on this host.** t04's handoff records it as unable to start
   (`libnspr4.so` missing) and falls back to `vm.Script` compilation for that reason. The missing
   library is on the **x86** `chrome-linux/` path, which does not exist in this cache; the arm64 build
   at `~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome` launches and drives fine from a
   directory outside the repo. Criterion 8's browser pass is available again, and `AGENTS.md` § The dapp
   now says so, with the path — the review asked for that sentence and it is where the next engineer
   will look.
4. **`out/chain/` lives inside forge's `out/`, so any `forge build --force` or `forge clean` deletes
   the chain document.** Harmless when `make chain-doc` is the last step, as the criteria run it, but a
   concurrent build wiped it mid-check here and the measurement had to be re-taken. Pre-existing from
   t04's design, out of scope to move.
5. **The same App and factory addresses land on both dev chains** (`0xe7f1…0512`, `0x5FbD…0aa3`), which
   is criterion 5's same-address property holding with a second resource in the contract.
6. **#41 still bites.** Both verification worktrees needed
   `git submodule update --init --recursive` before the first `forge` command. The one-line `AGENTS.md`
   fix that issue asks for is docs-only and belongs to whoever closes it, not here.

## The review round

The architect's review of `29c50db` reproduced every figure above independently and asked for two
changes, both in `a1d2d57`:

1. **`app/src/host.html`'s own comments contradicted § Discoveries 1 and 2.** The file told a developer
   to open `/host.html?rpc=…` — the URL this branch proves drops the query — and explained the loading
   mount as a fetch that "hangs then fails". Both now state what happens, including why port 9 stays
   (§ Discoveries 2), and the states panel's visible label reads `endpoint the browser refuses` rather
   than `no listener on the endpoint`.
2. **`test_lockAcceptsDapWithoutWidget` → `test_lockAcceptsDappWithoutWidget`**, snapshot regenerated,
   `--check` exit 0 after `forge build --force`. **The review expected one line to move; eighteen did.**
   The renamed test is **+567** (128,901 → 129,468) and seventeen of the other twenty-one shift by −1 to
   −24, because a test's selector comes from its name and the dispatch reorders around it — the same
   mechanism § The gas snapshot attributes, at a twentieth of the size. Four `AppTest` lines and all
   twenty-three non-`AppTest` lines are untouched; `forge test` is still 45/45.

Two of the three optional items were taken:

- **[#67](https://github.com/dnznlabs/rake/issues/67) is fixed and closed** in `6426e3c`. `txt` fell
  over on a `string` field that is not valid UTF-8 — legal on chain, since a Solidity `string` is
  bytes — and `decode` turned that throw into `null`, so one bad byte in one row rendered the whole
  mount as a failure. It now falls back to reading those bytes as latin1, which cannot throw: the row
  shows mojibake, every other row still reads. `test/widget.test.mjs` grew an eighth case that corrupts
  the fixture's `ops` name to `6f ff 73` and asserts the row decodes to `oÿs` while `description`,
  `delay` and the other row stay intact. Node is 54/54. The widget went 7,566 → **7,677 bytes**, so
  every byte figure above is the post-fix one.
- **`AGENTS.md` § The dapp names the arm64 chromium path** (§ Discoveries 3).

The third is recorded rather than acted on: **`app/dist/widget.js` carries no version string.**
`__VERSION__` appears only in the banner comment, which the minifier strips, so the plan's
"`__VERSION__` as the only token" describes the source and not the artifact. Putting a version in the
served bytes is a design question — it costs bytes and it is a string M05 may want to match — so it is
the architect's to spend, not mine to add in a fix round.

## Open questions

None. The two the plan decided under § Design — whether `lock()` requires a widget (it does not) and
whether the widget links anywhere (it does not) — are implemented as written, and neither needed the
Product Owner.
