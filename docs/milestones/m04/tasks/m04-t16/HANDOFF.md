# m04-t16 — handoff

PR: #286 · Branch: `m04/t16-no-wallet` · 2026-11-19

A visitor with no wallet now reads every route through the chain's public endpoint, and the wallet
button carries the connected account's name. `rpcProvider` moved out of its DEV-fenced block so the
shipped bundle keeps it, `readProvider` chooses the transport, `WALLET` records whether a wallet was
actually found, and `nameWho` resolves the button's name under the same gate as every other printed
address. One line the plan did not prescribe was needed: `discover` was asking the *public endpoint*
who was connected, which on a dev chain answers with its own unlocked keys — see § Deviations. Two of
the nine criteria carried figures the plan's own wording made unreachable; both were declared red at
the first head and are **amended at the review of #286**, listed at the top of § Discoveries. Branch
point `7724d73`. Code commits are mine — `2a519ec`, `10fa1ba`, `49e7761`, `56939ce` — plus
**Denizen's `f37145b`**, which hardened the read path after his own review of the branch, and a final
pass of mine for the three items the architect ruled from it.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | `git diff --name-only origin/main -- . ':!docs'` → 4 files: `app/src/index.html`, `test/nowallet.test.mjs`, `test/who.test.mjs`, `AGENTS.md` — the last added to the scope by the review (amended in the task preamble). This handoff is the one file outside that list; a handoff cannot count itself. The negative set — `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/ audits/ SECURITY.md app/src/widget.js app/src/eth.js app/src/model.js app/src/layout.html app/src/theme.css app/build.mjs app/broadcast.mjs app/values.mjs` → empty. |
| 2 | pass | Four plants, each red on exactly the one predicted test; messages quoted in § Planted reds. Browser reds for 6 (a) and (c) recorded on `origin/main`'s own dev build in § Browser check. |
| 3 | pass | **Re-measured at the final head**, after the review's item 1 reworded three comments that were carrying the counted literals. `grep -c 'const rpcProvider' app/dist/index.html` → **1** (baseline 0) after `make dapp-nodev CHAIN_ID=11155111`; `grep -c 'const capped' app/dist/index.html` → **0**; `devbox run -- node --test test/nowallet.test.mjs` → **9/9** — this row read 4/4, measured when the file held four tests, while AC 8's row already counted nine, so the two rows disagreed inside this file; its strip literal equals `app/build.mjs:145`'s (the first test asserts exactly that); `rpcProvider` → **4**; `readProvider` → **2**; `let WALLET` → **1**; `PUBLIC_RPC[CFG.chainId]` → **4**, at `:88` the read-provider helper, `:622` step 3's host, `:1220` step 4's landing `rpc`, `:2224` the `#/docs` preview. |
| 4 | pass | **Re-measured at the final head**, same reword as row 3. Step 6 (a) as recorded in § Browser check: five routes opened on the dev chain with no query and no injected provider, every write control `disabled` or absent with its existing line, the network menu's two step-3 lines. Step 6 (b) recorded on Sepolia through `ethereum-sepolia-rpc.publicnode.com`. `grep -ic -F 'No wallet found'` → **2**; `grep -c -F 'No wallet found' app/src/index.html` → **1**, which is `route()`'s notice at `:2290` and proves it untouched — the second, lowercase match is step 3's own prescribed line at `:625`. `a wallet to act` → **1**; `reads go through` → **1**; `connect a wallet` → **8**, unchanged. |
| 5 | pass | `eth_requestAccounts` → **1**, unchanged. Step 6 (e) with a stub holding no account: `#who` reads `connect`, the stub's `eth_requestAccounts` counter goes **0 → 1** on a click, and the button then reads `0xf39F…2266`. The enabled `[data-send]` set afterwards is `['cancel:0', 'dist:0x0000000000000000000000000000000000000000']`, **identical** to `origin/main`'s dev build for the same account. |
| 6 | pass | `devbox run -- node --test test/who.test.mjs` → 4/4, the four rows of step 5. Step 6 (c): `#who` goes `connect` → `0xd8dA…6045` → `vitalik.eth`, `title` the full address in both address states, against that day's `cast` re-read of the reverse record (resolver `0x5fBb459C49BB06083C33109fA4f14810eC2Cf358`, `name()` → `"vitalik.eth"`). Step 6 (d): the button repaints to `0x7099…79C8` after a fired `accountsChanged`, one listener, no error. `nameWho` → **2**. |
| 7 | pass | `make dapp-nodev CHAIN_ID=11155111` → `widget: raw 8509 bytes · budget 10240 · 1731 left`, **delta 0** against the re-run baseline, and `app/dist/widget.js` sha256 unchanged. `dapp:` 11155111 **raw +1258, gzip +418** (149584/47241 → 150842/47659); 84532 **raw +1258, gzip +418** (149582/47239 → 150840/47657). **Where the bytes went:** the plan's "about 300 raw bytes" was right about the thing it scoped — the moved `rpcProvider` declaration ships at **310 bytes**, measured in `app/dist/index.html` — and `readProvider` adds **69**. The rest is code the estimate did not cover: the plan's own (`let WALLET`, the `eth_accounts` gate, `who()`'s menu lines and `WALLET` branch, step 4's landing `const rpc`, `nameWho`), then Denizen's `rpcProvider` hardening in `f37145b`, then the review's item 1. Both chains' hashes in § For the next upload. **The review's item 1 ships no bytes:** the three comments it reworded are stripped by the minifier, so `app/dist/index.html` is byte-identical across the change — sha256 `5b298120…` before and after, with `raw 150842 · gzip 47659` and the widget's `8509` unmoved, so these figures and § For the next upload's hashes stand at the final head. |
| 8 | pass | `node --test test/*.test.mjs` → **188 tests, 188 pass, 0 fail**, against a re-run baseline of **175/175/0** at `7724d73`; the thirteen added are **9** in `test/nowallet.test.mjs` (4 mine, 4 Denizen's in `f37145b`, 1 for the review's item 1) and **4** in `test/who.test.mjs`. `forge test` → **107 passed, 7 suites**, identical to the baseline tree at `7724d73`. `make fmt` exit 0; `forge lint` reports nothing. `git status --porcelain` empty after `make dapp-nodev CHAIN_ID=11155111`. This table has nine rows, one per criterion. CI passed on the code at `49e7761` — runs [44600608501](https://github.com/dnznlabs/rake/actions/runs/44600608501) (3m26s) and [44600623837](https://github.com/dnznlabs/rake/actions/runs/44600623837) (4m0s), both `SUCCESS`, the first green runs since CI resumed service at 19:02Z. Rather than naming a head here — a handoff cannot name its own head — the check is that `git diff --name-only <last code commit>..HEAD -- . ':!docs'` is empty, and CI's result at the review head is the PR's own checks. CI is re-run on each push and its result at the review head is the PR's own checks. |
| 9 | pass | No upload is started here. § For the next upload names m05-t01's Run B step 14 as the upload and lists what the bundle carries. M05's bundle had not been built when this was ready, so no re-sequencing is needed. |

## Planted reds

Each plant was applied alone and reverted before the next. `app/src/index.html` is byte-identical to
its committed state afterwards: the rebuilt `app/dist/index.html` sha256 matched the pre-plant build
exactly.

| Plant | Command | Red |
|:--|:--|:--|
| `const rpcProvider` moved back inside a DEV-fenced block | `devbox run -- node --test test/nowallet.test.mjs` | `the shipped bundle keeps rpcProvider and drops capped` — `AssertionError: rpcProvider must survive the strip: with no wallet it is the page's only read path (#273)`, `0 !== 1`. The other three passed. **At the final head this plant reds four tests, not one** (`9 tests, 5 pass, 4 fail`): the predicted one plus the three `rpcProvider` hardening tests `f37145b` added (`rpcProvider turns a non-JSON HTTP failure into a sentence carrying the status`, `… throws the JSON-RPC error even under an HTTP error status`, `… refuses a body with no result and keeps a null one`), which go with the declaration when it is fenced. Expected, and reproduced at review. |
| `readProvider` rewritten to `injected => injected` | same | `readProvider ships and falls back to the public endpoint` — `AssertionError: readProvider no longer reaches rpcProvider, so a visitor with no wallet has no transport: const readProvider = injected => injected`. The other three passed. |
| `&& same(ACC, acc)` dropped from `nameWho` | `devbox run -- node --test test/who.test.mjs` | `a resolve for an account that is no longer connected does not paint` — `AssertionError: a name resolved for a switched-away account overwrote the newer account's text`. The other three passed. |
| `Model.plainName(n) &&` dropped from `nameWho` | same | `a name the gate refuses never reaches the button` — `AssertionError: a mixed-script name painted the wallet button`. The other three passed. |

## The hunks

| Step | Site (at the branch point) | Change | Checked by |
|:--|:--|:--|:--|
| 2 | `:59-93`, `discover` `:94-110` | `rpcProvider` moved above the fence with its own comment; `let WALLET = false` beside `:59`; `readProvider` added under it; `WALLET = !!P; P = readProvider(P);` in `discover` | `test/nowallet.test.mjs`, plants 1–2, dist greps in AC 3 |
| 3 | `who()` — `:566` at `e770054`, **`:579`** here | the button's `onclick` branches on `ACC` then `WALLET`; the first `k` line of `nm.innerHTML` branches on `WALLET` | step 6 (a)'s network menu |
| 4 | `landing` — `:1136` at `e770054`, **`:1194-1195`** here | `const rpc = WRPC \|\| (WALLET ? '' : PUBLIC_RPC[CFG.chainId] \|\| '')`, the guard reads `rpc`, `data-rpc` comes from `rpc` | step 6 (a): the landing's widget mounted with `data-rpc="http://127.0.0.1:8545"` |
| 5 | beside `nameSweep` — `:520` at `e770054`, **`:536`** here | one-line `nameWho`, called unawaited from `who()` | `test/who.test.mjs`, plants 3–4, step 6 (c) and (d) |

Every line number in `TASK.md` is from `e770054`; `app/src/index.html` lines 36–111 did not move under
m04-t15, and everything below did. Re-measured anchors: `who` 566→579, `resolveName` 503→515,
`nameSweep` 520→533, `landing` 1136→1144, `widgetDemo` 2112→2184, `route` 2142→2238,
`No wallet found` 2151→2250. `app/build.mjs`'s strip is still at `:145`.

## The eight `connect a wallet` sites, and what each painted in 6 (a)

Counted at the head, unchanged at **8**. Line numbers are this branch's.

| Site | What it is | In 6 (a) |
|:--|:--|:--|
| `:163` | `tx`'s preflight refusal | not reached — a send-time guard, and nothing can be sent |
| `:980` | the apply status line | not reached — nothing was queued on the dev chain's featured distribution at that moment |
| `:1111` | `sctl`'s disabled button | not rendered — `ownerView` returns `visitor`, so `wctl` never renders |
| `:1800` | the distribute help | painted: "anyone can call `distribute()` — the contract splits by the table above; you pay the gas." with its no-account clause |
| `:1829` | `#/create`'s notice | painted, and the only thing on the route: "Connect a wallet to create a distribution: a salt carries the sender in its top 20 bytes (decision 10)…", zero inputs |
| `:1990` | the `mine` tab | `disabled`, `title="connect a wallet"` |
| `:2115` | `#give-go` on **`#/docs`**, not the landing | `disabled`, `title="connect a wallet to send"`, beside `#give-amt` |
| `:2116` | `#txs` | painted: "connect a wallet to send." |

## Browser check

`playwright-core` 1.63.0 from `/home/openclaw/src/deadletter/node_modules`, the cached arm64 chromium
at `~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`, `app/dist` served by
`python3 -m http.server` (127.0.0.1:8111 for this branch, :8112 for `origin/main`). anvil took 8545
directly — `ss -ltn` showed it free — so `PUBLIC_RPC[31337]` resolved with no route interception.
**`page errors: none` in every run below, and no console errors either.**

**(a) no wallet, dev chain.** Opened with no `?rpc=` and no `from=`; headless chromium announces no
EIP-6963 provider and sets no `window.ethereum`.

- the seeded distribution `0x9b407e3c98fdb820203275919A90A056275e1e37`: `h1` "DNZN fees"; `funds`,
  `changes` and `activity` all painted from the public endpoint — `Ξ1.0000` waiting to distribute,
  a queued `setBeneficiaries · new table · 40% / 60% · nonce 1 · 7d 0h` at block 4, and the
  `Ξ1.0000` deposit from `0xf39F…2266`; nothing left reading "reading…" or "loading…"; **5,071 ms**
  to paint. `[data-send]` count **0**, and no write-control `[data-copy]` — the eight `[data-copy]`
  nodes are `ext`'s address and tx-hash copy affordances, which are read-only.
- `#/distros`: one row, "DNZN fees anvil · 0x9b40…1e37"; `mine` `disabled` with
  `title="connect a wallet"`. There is no `owned` tab (see § Discoveries).
- the landing: `#who` "connect", `#netname` "anvil", `h1` painted, `#wdg` mounted with
  `data-rpc="http://127.0.0.1:8545"` and `#rk-css` present.
- the network menu, opened by clicking `#who`: `no wallet found — open this page in a browser with a
  wallet to act.` / `reads go through 127.0.0.1:8545`. Those are step 3's two lines, and they are
  what criterion 4 asks for. The third line read `wallet: anvil` in this run, which **predates
  `56939ce`**; after it the same open reads `wallet: none`. Re-measured on Sepolia rather than
  re-deploying the dev chain, both branches of the ruling in one run: with no wallet the menu reads
  `no wallet found — …` / `reads go through ethereum-sepolia-rpc.publicnode.com` / **`wallet: none`**;
  with a stub holding `0xd8dA…6045` it reads step 3's original sentence and **`wallet: sepolia`**.
  Zero page errors both ways. After the review's item 1, the dev override was checked the same way:
  a Sepolia build opened at `?rpc=https://ethereum-rpc.publicnode.com` reads `#netname` `mainnet` and
  a menu of `no wallet found — …` / **`reads go through ethereum-rpc.publicnode.com`** / `wallet: none`
  — the override's host, where before it named Sepolia's. Zero page errors.
- `#/docs`: `#give-go` `disabled` with `title="connect a wallet to send"`, `#txs` "connect a wallet
  to send.", and the widget preview carrying `data-rpc`.
- **the red, on `origin/main`'s own dev build:** all four of the landing, the distribution page,
  `#/distros` and `#/create` paint exactly one `.notice` reading `No wallet found. Open this page in
  a browser with a wallet.`; `#wdg` does not mount; `#/docs` renders no `#give-go` and no
  `#give-amt` at all; and clicking `#who` does nothing — `#net-menu` stays `hidden`, because
  `b.onclick` was `null` with no provider.

**(b) no wallet, a public endpoint.** `make dapp CHAIN_ID=11155111`, opened at `#/` with no query.
`#netname` read `sepolia`, which is `eth_chainId` answered cross-origin from a browser origin, and
the network menu's second line read `reads go through ethereum-sepolia-rpc.publicnode.com`. No CORS
refusal: the endpoint returns `access-control-allow-origin: *`. The featured distribution does not
exist on this chain (§ Discoveries), so a real one was opened instead —
`0x538516e3b6f24c05136307fafc4dff02b660bdc4`, "Throw Away 002": `funds` `Ξ0.0100` waiting to
distribute, `changes` "no change has been queued yet", `activity` the `Ξ0.0100` deposit from
`0x3578…902B` at block 12163253. **1,517 ms** to the activity section's first row. Both history
sections carry "history before block 12154703 not loaded · load older", and the token line reads
"token payments in could not be read from this provider" — the windowed read degrading on a capped
public endpoint, which is the budget `AGENTS.md` § The dapp sizes against, not a failure.

**(c) the name, dev path.** The Sepolia build opened at
`?rpc=https://ethereum-rpc.publicnode.com&from=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045#/`, query
before the fragment; `from=` and `rpc=` both read back exactly. `#who` passed through three states —
`connect`, then `0xd8dA…6045` with `title` the full address, then `vitalik.eth` with the same
`title` — which is the short address being on the button before any round trip, the reason `who()`
does not await `nameWho`. The view painted "Your wallet is on mainnet. This app lives on sepolia.
Switch network." at the same time, because `who()` runs before `route()` and does not wait on it.
**The red, on `origin/main`:** `#who` reaches `0xd8dA…6045` and stays there; no state with a name
ever appears.

**(d) `accountsChanged`, stubbed wallet.** A `window.ethereum` installed by `addInitScript`, reads
forwarded to the dev endpoint by `fetch`, `on` storing its listeners. `#who` read `0xf39F…2266`
after load, one listener fired, and `#who` read `0x7099…79C8` with that account's full address in
`title`. anvil answers no name (`resolveName` returns before asking off chains 1 and 11155111), so
this proves the re-run, not the name.

**(e) the whole page under a stubbed wallet.** `#/distros/<addr>`, `#/distros`, `#/docs`,
`#/create`, `#/`: the account on the button on every route, and the enabled `[data-send]` set equal
to `origin/main`'s for the same account (AC 5).

## Deviations from the plan

1. **Step 2 needed a line it does not prescribe.** The plan has `discover` do
   `WALLET = !!P; P = readProvider(P);` and leaves `:107`'s `if (!P) return;` and the
   `eth_accounts` call after it untouched. But `P` is now the public endpoint, so the page asks the
   *endpoint* which account is connected. A real endpoint returns `[]`; a dev chain returns its own
   unlocked keys. The first run of 6 (a) therefore painted `#who` as `0xf39f…2266` and enabled the
   `mine` tab for a visitor with no wallet, while the network menu said "no wallet found" in the
   same breath — `WALLET` false and `ACC` set. **Done instead:** the `eth_accounts` call is gated on
   `WALLET`, with the reasoning in a comment (`49e7761`). Measured both ways:
   `eth_accounts` on anvil → ten accounts, on `ethereum-sepolia-rpc.publicnode.com` → `[]`.
   **Accepted as a plan defect at the review of #286, and step 2 is amended** to say the account is
   asked only of an injected provider. The code comment stays; no `SECURITY.md` row was added.
2. **6 (b) opened a real distribution rather than the featured one.** The plan expects "the featured
   distribution's rows painted" on Sepolia. The featured salt is the DNZN Creator's, and the
   distribution it predicts has never been created — see § Discoveries. The page is right to show an
   empty slot, so a distribution that does exist on the same factory was opened instead, and its
   figures are in § Browser check.
3. **`#give-go` is on `#/docs`, not the landing.** Step 4 places the `give` control on the landing at
   `:2018-2019`; at the branch point those lines are inside `docs()`'s `S.featured` block
   (`:2115-2116` here). 6 (a) therefore opens a fifth route to reach it. Nothing was changed to make
   this true; only where the criterion is checked moved. The review amended step 6 (a)'s route list
   to name `#/docs` so the next reader opens it; the check at `:173` stands as written.
4. **The `wallet:` line was changed after the review.** At the first head it rendered the chain being
   read (`wallet: anvil`, `wallet: sepolia`) even with no wallet. The review ruled step 3's original
   expectation stands, so it now reads `none` when `WALLET` is false and the chain's name when it is
   true (`56939ce`). Verified both ways in a browser — see § Browser check.
5. **AC 3's and AC 4's figures were red at the first head** and are amended in `TASK.md` at the
   review, in m04-t11's form. Both AC rows now pass against the amended figures.
6. **`f37145b` is Denizen's commit, not mine.** He reviewed the branch and pushed a fix on top of
   `5e43893`, co-authored with Fable 5.2, and it closed two real holes in my hunks: `rpcProvider`
   threw a raw `SyntaxError` out of `r.json()` when a public endpoint answered a rate limit or an
   outage with an HTML body — and with no wallet that endpoint is the only read path, so the page went
   blank — and `new URL(PUBLIC_RPC[CFG.chainId])` in my step-3 hunk throws for a chain absent from the
   table, which I had noticed and implemented as prescribed rather than guarded. He also gated the
   switch row on a wallet existing. His four tests came with it. The architect accepted the commit at
   the review: the `data.httpStatus` shape is the one `Model.isWrappedRefusal` already reads, and
   `null` is kept as a real result. Its signature first read `E` for me, which is a missing public key
   rather than bad provenance — the key is `CD435BB6A7BED718D95616450DC6C60CFBD5E456`, his documented
   fingerprint, and it verifies `U` once imported.
7. **Three items from his review, ruled by the architect, two of them landed here.**
   - **The dev `?rpc=` menu named the `PUBLIC_RPC` host rather than the override.** Step 3's own hunk:
     the line now names `new URL(WRPC || pub).host` and the row is omitted only when both are absent.
     "no wallet found" stays, since it is true on that path. One test row added, and it reds on the
     defect: dropping `WRPC ||` fails `the menu names the dev override ahead of the public endpoint`
     with `the dev \`?rpc=\` endpoint is what reads happen through when it is set`.
   - **The docs still called the wallet the only network path.** `AGENTS.md` § The dapp and the two
     comments above `PUBLIC_RPC` and `WRPC` now say reads go through the injected provider when there
     is one and otherwise the chain's public endpoint, and that writes always go through the wallet.
     This is why `AGENTS.md` is in the scope and the preamble is amended.
   - **The landing widget never mounts for an EIP-6963-only wallet.** Carried as
     [#289](https://github.com/dnznlabs/rake/issues/289), not fixed here: it predates this branch and
     is neither #273 nor #274. Two causes, both named in the issue — `landing()`'s guard tests
     `window.ethereum` where `discover` already holds the announced provider, and `widget.js:169`
     reads the global itself, so a mount would have nothing to read with either.

## Decisions

- **The baselines in the AC table are re-runs at `7724d73`, not the plan's `e770054` figures**, as
  step 0 requires. They differ: node tests 175/175/0 against the plan's 167/167/0, and
  `make dapp-nodev CHAIN_ID=11155111` raw 149584 / gzip 47241 against the plan's 146563 / 46448.
  m04-t15 and #278 both landed in between.
- **Both ends of every delta were measured the same way.** A first baseline run showed `175 tests,
  174 pass, 1 skipped`, which is not a property of the commit: calling the pinned `node` directly
  leaves `cast` off `PATH`, and one test skips itself when `cast` is absent. Re-measured with the
  pinned toolchain on `PATH`, the baseline is 175/175/0, which is comparable with the 183/183/0
  after. The two bundle-build invocations were also checked against each other and produce
  byte-identical output.

## Discoveries

**The amendments made at the review of [#286](https://github.com/dnznlabs/rake/pull/286)**, all in
`TASK.md` in m04-t11's form:

1. **AC 3** — `PUBLIC_RPC[CFG.chainId]` `4` ~~`2`~~. Four sites, at the final head: the
   read-provider helper (`:88`), step 3's `reads go through` host (`:622`), step 4's landing `rpc`
   (`:1220`), the `#/docs` preview (`:2224`). Step 2's local figure of `2` stands as a step figure.
   These four were `:76`, `:611`, `:1205` and `:2209` when the amendment was written; the count is
   unchanged and only the lines moved. **Measured, because the first version of this sentence got it
   wrong:** `app/src/index.html` grew by `f37145b` (net **+10** lines) and `62f7ce4` (net **+5**),
   which is the +15 the two later sites moved exactly; the two earlier sites moved +12 and +11
   because some of those lines sit below them. The review's item 1 moved **nothing** — it is +4 −4,
   net zero — so crediting it, as this sentence first did, was wrong in both directions. The line
   numbers are mine and not a quotation of `TASK.md`, which carries none.
2. **AC 4** — `No wallet found` `2` ~~`1`~~, plus a new case-sensitive check
   `grep -c -F 'No wallet found' app/src/index.html` → `1` pinning `route()`'s own notice. Every
   grep in the plan is `grep -ic -F`, and step 3 prescribes a lowercase line matching the same
   pattern.
3. **Step 2** — the account is asked only of an injected provider, never of the public endpoint.
4. **Step 6 (a)** — "`mine` and `owned` tabs `disabled`" becomes "`mine` `disabled` with its title",
   there being no `owned` tab; and `#/docs` is added to the route list.
5. **Step 3's `wallet:` line — not an amendment.** Its expected text stands unamended; the ruling was
   that the *code* move to match it, which `56939ce` does. Listed here so the five rulings read
   together, not because `TASK.md` changed at that site.
6. **The task preamble** — `AGENTS.md` added to the scope for the review's item 2 below.

- **The paired control behind the step 2 amendment.** `eth_accounts` on anvil returns its ten
  unlocked keys; on `ethereum-sepolia-rpc.publicnode.com` it returns `[]`. One reading of a dev chain
  would not have established the defect; the pair does, and it is why the fault is dev-chain-only and
  was certain to surface in the case the plan put first.
- **The featured distribution does not exist on Sepolia.** `predict(bytes32)` on factory
  `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` for the DNZN Creator salt returns
  `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`, whose `cast codesize` is **0**. That is M05's step 6
  and not this task's, but it means no chain other than the dev chain can satisfy "the featured
  distribution's rows painted" today. **Carried as [#287](https://github.com/dnznlabs/rake/issues/287)** (M05 Part B), not dropped.
- **`#/docs` loses its support block with no wallet, which #273 does not cover.** #273's title
  excludes `#/docs` deliberately, and rightly — the route renders on `origin/main` rather than
  stopping at the notice. What is missing there is narrower: `#give-go`, `#give-amt` and the widget
  preview's `data-rpc` are all absent, because `docs()` wraps them in `S.featured`, which needs a
  provider to resolve. This branch paints all three. It is the fifth route opened in 6 (a) and the
  only place `#give-go` exists, so the plan's four-route count is a count of routes that showed the
  notice, not of routes this fixes.
- **There is no `owned` tab.** The tabs are `recent` and `mine`, so step 6 (a)'s "`mine` and `owned`
  tabs `disabled`" was one tab, not two. Amended at the review (4 above).
- **`origin/main`'s bundle hash is not m04-t15's.** The baseline `app/dist/index.html` for 11155111
  hashes `fb4e6b41…`, where m04-t15's handoff recorded `083a175e…` for the same chain. #278 re-mined
  `FACTORY_SALT`, so the addresses the build substitutes moved. Worth knowing before anyone compares
  bundle hashes across those two merges.
- **`test/ext.test.mjs`'s fixture factory is not the deployed one.** The test pins
  `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`; the Sepolia bundle builds
  `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` from `broadcast/`. Consistent with M05-D1 being
  pending — the plan says this case "reads whichever it finds" — but the two will disagree until
  Part B deploys. **Carried as [#288](https://github.com/dnznlabs/rake/issues/288)** (M05 Part B), not dropped.

## For the next upload

No upload here. The bundle rides m05-t01's **Run B step 14**, whose gate now waits on this task's
merge as well as m04-t15's.

| Chain | `make dapp-nodev` | `app/dist/index.html` sha256 | `app/dist/widget.js` sha256 |
|:--|:--|:--|:--|
| 11155111 | raw 150842 · gzip 47659 | `5b2981205e3f9c36e212793c3e09e66f632d4417248db8c6b5f50229bbd40832` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |
| 84532 | raw 150840 · gzip 47657 | `b081be5202b06ad53b376c64fb5e878cd111b5ce1e79fced4be674d3c363290e` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |

The widget is byte-identical on both chains and unchanged from the branch point. What the bundle
carries: m04-t15's five — R18, [#243](https://github.com/dnznlabs/rake/issues/243),
[#241](https://github.com/dnznlabs/rake/issues/241), R9, R19 — plus
[#273](https://github.com/dnznlabs/rake/issues/273) and
[#274](https://github.com/dnznlabs/rake/issues/274) from this task.

## For Denizen

One optional check, and it needs a real wallet, which no harness here has: **the Sepolia wallet path
for the name.** No address in this repository has a reverse record on Sepolia, so 6 (c) proves the
name only through the mainnet `?rpc=` path. Opening the Sepolia build in a browser with MetaMask on
an account that has an ENS reverse record would confirm the button names it through a wallet rather
than through the dev override. Everything #273 and #274 ask for is otherwise verified above.

## Open questions

None.
