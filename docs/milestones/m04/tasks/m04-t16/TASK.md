# m04-t16 — Read without a wallet, and name the connected account

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, a visitor with no wallet reads every route of the page through the chain's public
endpoint — the landing, `#/distros`, every distribution page and `#/create`'s one-line notice — with
every write control disabled behind the line it already carries, and the "No wallet found" notice
reached only on a chain the page knows no public endpoint for
([#273](https://github.com/dnznlabs/rake/issues/273)); and the wallet button names the connected
account the way the page names every other address — the short address first, the resolved name in
its place when one returns, the full address in the title, re-run on every account change
([#274](https://github.com/dnznlabs/rake/issues/274)). `app/src/index.html` and `test/*.mjs` only;
nothing under `src/`, no `.gas-snapshot` change, no upload. Decision 61: this is the `app/` change
after m04-t15 that the mainnet bundle carries, and the settings page
([#275](https://github.com/dnznlabs/rake/issues/275)) is not here — it is m04-t17, after this task,
and the one thing it takes from here is the read-only provider of step 2.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`).
Never `devbox run -- bash -c` with a pipe; write a script. Scratch files go under a directory outside
the repo. **Branch `m04/t16-no-wallet` from `origin/main` at or after m04-t15's merge commit** — this
task is gated on [m04-t15](../m04-t15/TASK.md)'s task PR being on `main`, because both edit `route()`
and `landing()` and the bundle is one bundle. Check hooks with `ls .git/hooks | grep -v sample` →
`pre-commit`, `post-commit`. **Line numbers below are `main` at `e770054`** (2026-11-19, before
m04-t15 merged) for `app/src/index.html`; m04-t15 moves every line of `detail`, `route` and the
`.navr` controls, so trust names over numbers and re-measure each anchor at the branch point.

The browser check runs as m04-t15 step 9 does: `playwright-core` outside the repo driving the cached
chromium `AGENTS.md` § The dapp names, against the dev build (`make dapp`), `app/dist` served with
`python3 -m http.server <b>` (never `npx serve`), `page errors: none` in every run. Two things differ
from m04-t15's harness and both are the point of this task: the no-wallet cases open the page **with
no `?rpc=` and no `from=`** — `discover()` then finds no EIP-6963 announcement and no
`window.ethereum`, which is exactly what an incognito window gives it — and headless chromium injects
no provider, so nothing has to be stubbed to reach the path #273 reports. One case (d) stubs a wallet
on purpose, and says so.

0. **Baselines**, re-run at the branch point and recorded in the handoff with the commit and the
   date, never carried from here. On `main` at `e770054`, 2026-11-19, through the devbox pin:
   `node --test test/*.test.mjs` → `ℹ tests 167 · ℹ pass 167 · ℹ fail 0`; `make dapp-nodev
   CHAIN_ID=11155111` → `dapp: raw 146563 bytes · gzip 46448 bytes · chain 11155111`, `widget: raw
   8509 bytes · budget 10240 · 1731 left`; `git status --porcelain` empty after the build. Then these
   greps, every one `grep -ic -F '<pattern>' app/src/index.html` unless it names another file
   (case-insensitive, fixed string), the figure before being the denominator the figure after is read
   against; all measured at `e770054`, re-run (m04-t15 changes none of them):
   - `No wallet found` → `1` (`:2151`); `rpcProvider` → `3` (`:64` the declaration, `:97` its dev
     use, `:185` a comment); `const capped` → `1` (`:79`); `PUBLIC_RPC` → `3` (`:41`, `:1986`,
     `:2112`); `PUBLIC_RPC[CFG.chainId]` → `1` (`:2112`).
   - **`grep -c 'const rpcProvider' app/dist/index.html` → `0` and `grep -c 'const capped'
     app/dist/index.html` → `0` after `make dapp-nodev`** — the declaration at `:64` sits inside the
     `/*DEV*/` fence that opens at `:63` and closes at `:93`, and `app/build.mjs:145` strips every
     fence unless `--dev`. The shipped bundle has no `rpcProvider`; step 2 is why.
   - `let WALLET` → `0`; `nameWho` → `0`; `a wallet to act` → `0`; `reads go through` → `0`.
   - `connect a wallet` → `8` (`:150`, `:926`, `:1048`, `:1705`, `:1736`, `:1897`, `:2018`,
     `:2019`): the `!ACC` guards every write control already carries, which step 4 keeps and counts.
   - `eth_requestAccounts` → `1` (`:111`, `connect`); `Reads and transactions go through your
     wallet` → `1` (`:574`); `data-rpc` → `5`; `window.ethereum` → `5`.

1. **Read #273 and #274** so each hunk below is written against the finding's reproduction and not
   this summary. Both were confirmed from the source at `e770054` and cite the lines this plan
   cites. Check: nothing to run; the handoff's rows cite the issue line each hunk answers.

2. **The read-only provider (#273), `:59-93` and `discover` `:94-110`.** `rpcProvider` (`:64-69`,
   a `fetch` over JSON-RPC that throws the `error` object — the shape `:185` and `Model.revertMessage`
   already read) is the provider the page needs with no wallet, and it is stripped from the shipped
   bundle (step 0). **Move the six lines of `const rpcProvider = …` above the `/*DEV*/` at `:63`**,
   with its own one-line comment saying it is the page's read path without a wallet and the dev
   `?rpc=` override; `capped` (`:79-92`) stays inside the fence, which now opens on its comment.
   Declare `let WALLET = false;` beside `:59` — true only when `discover` found an injected
   provider, and the one thing `who()` reads to tell "no wallet" from "wallet, not connected".
   Directly under the moved `rpcProvider`, one function that answers which transport reads the
   chain: `const readProvider = injected => { const u = PUBLIC_RPC[CFG.chainId]; return injected ||
   (u ? rpcProvider(u) : null); };` — the injected provider when there is one, else the chain's
   public endpoint, else `null`. **This function is the seam m04-t17 reuses: the user's RPC URL and
   the wallet-or-RPC route choice of decision 61 are inserted inside `readProvider` and nowhere
   else, so nothing of that page is here and nothing here moves when it lands.** In `discover`,
   after `:106` (`P = (found[0] && found[0].provider) || window.ethereum || null;`): `WALLET = !!P;
   P = readProvider(P);` then `:107`'s `if (!P) return;` stands. The dev branch (`:95-101`) leaves
   `WALLET` false, so `?rpc=` without `from=` behaves as a visitor
   with no wallet, which is what case (a) of step 6 relies on. Nothing else changes: `load()` reads
   `eth_chainId` through `P` (`:584`) and the public endpoint answers it, so `CHAIN`, `wrongChain()`
   and `resolveName`'s chain gate (`:503`) all work as they do under a wallet; the boot sequence at
   `:2172-2175` already runs `load()` whenever `P` is set. The endpoints are the table the `#/docs`
   widget preview (`:2112`) already hands a no-wallet visitor's browser, so the cross-origin
   `fetch` is one the bundle already makes; the page's windowed `eth_getLogs` were sized against
   these same endpoints (`AGENTS.md` § The dapp, #76, #215), so a public endpoint's range cap is
   handled before this task.

   Check: a new `test/nowallet.test.mjs` reads `app/src/index.html` and `app/build.mjs`, lifts the
   strip from `app/build.mjs:145` by asserting the file contains the literal
   `html.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '')` (so a changed strip fails the test rather
   than silently diverging from it), applies that same regex to the page, and asserts on the stripped
   text: `const rpcProvider =` present once; `const capped` absent; `const readProvider =` present
   once and the text from it to the next `;\n` contains `rpcProvider(`; and the slice from `async
   function discover` to `async function connect` contains `readProvider(P)`. **Predicted reds,
   two plants:** `const rpcProvider` moved back under the `/*DEV*/` at `:63` reds the first
   assertion (quote the message); `readProvider` rewritten to `injected => injected` (the fallback
   removed) reds the third alone. Greps: `grep -c 'const rpcProvider' app/dist/index.html` → `1`
   after `make dapp-nodev CHAIN_ID=11155111` (baseline 0); `grep -c 'const capped'
   app/dist/index.html` → `0`, unchanged; `rpcProvider` in the source → `4` (baseline 3: the
   declaration, the dev `?rpc=` call and a comment at `:185`; the call inside `readProvider` is the
   one addition); `readProvider` → `2` (the declaration and the call in `discover`); `let WALLET`
   → `1`; `PUBLIC_RPC[CFG.chainId]` → `2` (baseline 1, the `#/docs` preview at `:2112`).

3. **The header with no wallet, `who()` `:566-580`.** Today the button's click is `null` with no
   provider and `connect` otherwise (`:570`); with step 2 there is always a provider, and
   `connect` (`:111`) sends `eth_requestAccounts` to it, which a public endpoint refuses. Rewrite
   `:570` as: `b.onclick = ACC ? e => { e.stopPropagation(); toggle(wm); } : WALLET ? connect : e =>
   { e.stopPropagation(); toggle(nm); };` — the button still reads `connect`, and with no wallet its
   click opens the network menu, which says what to do. In `nm.innerHTML` (`:574-576`), the first
   `k` line becomes a branch on `WALLET`: the existing sentence under a wallet; without one,
   `no wallet found — open this page in a browser with a wallet to act.` as the first line and
   `reads go through ${new URL(PUBLIC_RPC[CFG.chainId]).host}` as the second, with the `wallet:
   none` line and the switch line unchanged (the switch line never renders here: `CHAIN` equals
   `CFG.chainId`, so `wrong` is false). Lowercase, the chrome's register. Check: step 6 (a) reads
   both lines; `a wallet to act` → `1`; `reads go through` → `1`; `Reads and transactions go through
   your wallet` → `1`, unchanged; `eth_requestAccounts` → `1`, unchanged.

4. **Every route paints (#273), `route` `:2142-2156` and `landing` `:1136-1142`.** `route()`'s
   `:2151` (`if (!P) { V.innerHTML = notice('No wallet found. …'); return; }`) is kept verbatim and is
   now reached only when `PUBLIC_RPC[CFG.chainId]` is absent — every chain in `CHAINS` (`:36`) has
   an entry today, so that is a build for a chain the page does not know. m04-t15 adds `HEAD =
   null` and the `BUSY` promise at the top of `route()`; this hunk touches neither. The write
   controls need no new guard: every one already renders disabled or absent on `!ACC` with its own
   line (step 0's eight `connect a wallet` sites — `tx` refuses at `:150`, `sctl` at `:1048`, the
   apply status at `:926`, the distribute help at `:1705`, `#/create`'s notice at `:1736`, the
   `mine`/`owned` tabs at `:1897`, the landing's `give` at `:2018-2019`), and `ownerView` returns
   `visitor` before any probe (`:1258`), so `wctl` (`:1040`) never renders. The handoff lists those
   eight sites with what each paints in case (a). `#/create` paints its `:1736` notice and nothing
   else, which is its one line: a salt carries its sender (decision 10), so there is no draft to
   predict for. One site reads the chain and refuses a no-wallet visitor for no reason: the
   landing's widget mount at `:1140` returns on `!(WRPC || window.ethereum)`. Make it the
   `widgetDemo` shape (`:2112`): `const rpc = WRPC || (WALLET ? '' : PUBLIC_RPC[CFG.chainId] || '');`
   before `:1140`, the guard `!(rpc || window.ethereum)`, and `:1141`'s `data-rpc` from `rpc`
   instead of `WRPC` — so the landing's live example mounts through the public endpoint for the
   visitor who most needs the example to work. Check: step 6 (a) and (b); `No wallet found` → `1`,
   unchanged; `data-rpc` → `5`, unchanged; `window.ethereum` → `5`, unchanged.

5. **The name on the button (#274), `who()` `:566-580` and a new `nameWho`.** `who()` sets
   `b.textContent = ACC ? short(ACC) : 'connect'` (`:568`) and the title (`:569`); both stay. Beside
   `nameSweep` (`:520`), **one line**, so `test/*.mjs` can lift it the way `ext.test.mjs:42-46`
   lifts a declaration:
   `async function nameWho(acc) { const n = await resolveName(acc); if (n && Model.plainName(n) && same(ACC, acc)) document.getElementById('who').textContent = n; }`
   with a comment above it: the button is the one printed address that does not go through `ext`,
   so it gets its name here by the same resolver (decision 13's order), the same gate (R10,
   `Model.plainName`) and the same winner-alone rule; `ACC` is re-read after the `await` so an
   account switched mid-resolve keeps the newer account's text. `who()` calls `if (ACC)
   nameWho(ACC);` after `:570`, not awaited — the short address is on the button before any round
   trip, and `who()` stays synchronous for `accountsChanged` (`:109`), `connect` (`:111`) and
   `disconnect` (`:125`), each of which already calls it, so the name is re-resolved on every
   account change with no new listener. `resolveName` returns `null` before asking on every chain
   but `1` and `11155111` (`:503`), so on Base Sepolia and every other chain the button keeps the
   short address by design, and `NAMED` is not consulted: one resolve per `who()` with an account,
   which on anvil costs no request.

   Check: a new `test/who.test.mjs` lifts `one('async function nameWho')` with `resolveName`,
   `Model`, `same`, `ACC` and `document` passed in as stubs (`document.getElementById` returning one
   object with a `textContent`). Rows: `resolveName` resolving `'vitalik.eth'` with `ACC` equal to
   the argument → `textContent` is `vitalik.eth`; resolving `null` → unchanged; resolving a name
   `Model.plainName` refuses (a Cyrillic `і`, as `test/model.test.mjs` uses) → unchanged; resolving
   `'vitalik.eth'` with `ACC` another address → unchanged. **Predicted reds, two plants:** `&&
   same(ACC, acc)` dropped reds the fourth row; `Model.plainName(n) &&` dropped reds the third.
   Greps: `nameWho` → `2` (the declaration and the call); `short(ACC)` count unchanged from the
   branch point.

6. **The browser check**, on the dev stack as the preamble says, each case with the figure the
   reviewer compares and `page errors: none`:
   - (a) **No wallet, dev chain (#273).** `make dapp` against the dev stack; `PUBLIC_RPC[31337]` is
     `http://127.0.0.1:8545` (`:41`), so either anvil listens on `8545` (`ss -ltn` shows it free
     first) or the harness routes `http://127.0.0.1:8545/*` to the stack's port with
     `route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:<a>/' }) })`; say which.
     Open `http://127.0.0.1:<b>/#/` with no query. Record: `#who` reads `connect`; `#netname` reads
     `anvil`; the featured distribution's `h1` and rows are painted and `#wdg` holds a mounted
     widget (the `rk-css` style present); `#give-go` is `disabled` with its title; a click on `#who`
     opens `#net-menu` and its text contains both step-3 lines, with the host `127.0.0.1:8545`.
     Then `#/distros` (rows painted, `mine` and `owned` tabs `disabled`), the seed distribution's
     page (`h1` its description, `funds`, `changes` and `activity` painted, every `[data-send]`
     button `disabled` and the count of them recorded, no `[data-copy]` write control), and
     `#/create` (the `:1736` notice and nothing else). **Before the fix** the same four opens paint
     one `.notice` reading `No wallet found` — record it as the red on `origin/main`'s own dev build.
   - (b) **No wallet, a public endpoint (#273).** `make dapp CHAIN_ID=11155111` (the Sepolia
     addresses in `broadcast/`, whichever deployment `main` carries at the branch point — M05-D1
     moves them, and this case reads whichever it finds), served the same way, opened at `#/` with
     no query: the page reads Sepolia through `ethereum-sepolia-rpc.publicnode.com` from a browser
     origin — the landing's `h1` and the featured distribution's rows painted, `#netname` reading
     `sepolia`, and the network menu's second line naming that host. Then that distribution's page:
     `funds`, `changes` and `activity` painted (the history read through a capped public endpoint,
     the budget `AGENTS.md` names). Record the wall time to the activity section's first row. A
     CORS refusal here is a stop and a finding, not something to route around: the widget preview
     already depends on this origin answering browsers.
   - (c) **The name (#274), dev path.** The Sepolia build of (b) opened with
     `?rpc=https://ethereum-rpc.publicnode.com&from=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045#/`
     (query before the fragment, as m04-t15's preamble says, and the `from=` read-back asserted):
     `resolveName` reads `CHAIN`, which is `1` here, so the button goes through ENS on mainnet while
     the view paints the wrong-network notice — `who()` runs before `route()` (`:2175`) and does not
     wait on it. Record `#who`'s text immediately after load (`0xd8dA…6045`) and within 5 s
     (`vitalik.eth`), and `#who`'s `title` equal to the full address both times. That address's
     reverse record was read on 2026-11-19 through the page's own path — registry
     `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` `resolver(bytes32)` on
     `namehash(<addr>.addr.reverse)` → `0x5fBb459C49BB06083C33109fA4f14810eC2Cf358`, whose
     `name(bytes32)` returned `"vitalik.eth"` — re-run it with `cast call` against the same endpoint
     before trusting the figure. **Before the fix** the text stays `0xd8dA…6045`; record it as the
     red. No address in this repository has a reverse record on Sepolia, so the Sepolia wallet-path
     check is § For Denizen's, not the engineer's.
   - (d) **`accountsChanged` (#274), stubbed wallet.** On the dev build of (a), `page.addInitScript`
     installs a `window.ethereum` whose `request` forwards to the dev endpoint over `fetch`, answers
     `eth_accounts` and `eth_requestAccounts` with a held account, and whose `on(event, fn)` stores
     `fn` so the harness can fire `accountsChanged` with a second account through
     `page.evaluate`. Record `#who`'s text and `title` after load and after the fired event (the
     second account's short form and full address), and that no error is thrown — the stub proves
     the re-run, not the name: anvil answers no name (`:503`), and the handoff says so.
   - (e) **The whole page once more** under a stubbed wallet with an account, as m04-t15 step 9 (f)
     opens it: a distribution page, `#/distros`, `#/docs`, `#/create` step 2, `#/` — the write
     controls enabled as on `main` for the same account (record the enabled `[data-send]` set
     against `main`'s dev build), `page errors: none`.

7. **`HANDOFF.md`** beside this file, from the handbook template: the AC table with one row per
   criterion below, the figures beside step 0's re-run baselines; one row per hunk (steps 2–5)
   with the site, the change, the test or browser step, and the planted red quoted under its exact
   command; the eight `connect a wallet` sites with what each painted in 6 (a); the byte deltas;
   § For the next upload with both chains' `make dapp-nodev` hashes and the list of what the bundle
   carries — m04-t15's list (R18, #243, #241, R9, R19) plus #273 and #274 — naming m05-t01's Run
   B step 14 as the upload; § For Denizen with the one optional check below; § Discoveries.

## The upload

As [m04-t15 TASK.md](../m04-t15/TASK.md) § The upload: no upload here and no M04 row for one. The
bundle rides m05-t01's Run B on the redeployed testnets, and that step's gate now waits for this
task's merge as well as m04-t15's and m04-t17's (m05-t01 TASK.md § Gate and step 14, amended with
this plan). This task starts after m04-t15 merges, m04-t17 starts after this one merges, and both
are small enough to land before m05-t01's Part A is through; if either is not merged when
m05-t01's steps 12–13 are done, step 14 waits exactly as it waits on m04-t15, and the architect
re-sequences rather than letting a bundle without them be built.

## Acceptance criteria

Every figure is read at the review head, not quoted from here. Baselines are step 0's, re-run at the
branch point and recorded in the handoff with the commit. Every grep is `grep -ic -F` on
`app/src/index.html` unless it names another file. Nine criteria.

1. **The diff is the plan.** `git diff --stat origin/main -- app/ test/` touches only
   `app/src/index.html`, `test/nowallet.test.mjs` and `test/who.test.mjs`, with the full diff's file
   count stated as the denominator; `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot
   RUNBOOK.md scripts/ calldata/ audits/ SECURITY.md app/src/widget.js app/src/eth.js app/src/model.js
   app/src/layout.html app/src/theme.css app/build.mjs app/broadcast.mjs app/values.mjs` is empty.
2. **Planted reds.** The two of step 2 and the two of step 5 planted once and quoted with
   `devbox run -- node --test test/nowallet.test.mjs` and `… test/who.test.mjs`, plus the browser
   reds of step 6 (a) and (c) recorded on `origin/main`'s dev build. A plant that did not red is
   declared as a deviation with what did.
3. **The provider ships.** `grep -c 'const rpcProvider' app/dist/index.html` → `1` after `make
   dapp-nodev CHAIN_ID=11155111` (baseline 0); `grep -c 'const capped' app/dist/index.html` → `0`;
   `test/nowallet.test.mjs` passes, and its strip literal equals `app/build.mjs:145`'s; `rpcProvider`
   → `4` (baseline 3); `readProvider` → `2`; `let WALLET` → `1`; `PUBLIC_RPC[CFG.chainId]` → `2`
   (baseline 1).
4. **Every route reads without a wallet (#273).** Step 6 (a) as recorded: four routes painted with
   rows on the dev chain with no query and no injected provider, every write control `disabled` or
   absent with its existing line, the network menu's two step-3 lines; step 6 (b) as recorded on
   Sepolia through the public endpoint; `No wallet found` → `1`, unchanged; `a wallet to act` →
   `1`; `reads go through` → `1`; `connect a wallet` → `8`, unchanged.
5. **The connect button still connects.** `eth_requestAccounts` → `1`, unchanged; step 6 (e): with
   a stubbed wallet holding no account, a click on `#who` calls the stub's `eth_requestAccounts`
   (the stub counts it) and the enabled write set afterwards equals `main`'s for that account.
6. **The name (#274).** `test/who.test.mjs` with the four rows of step 5 passing; step 6 (c) as
   recorded — `0xd8dA…6045` then `vitalik.eth`, the title the full address both times, against
   that day's `cast` re-read of the reverse record; step 6 (d) as recorded — the button repainted
   for the second account after a fired `accountsChanged`; `nameWho` → `2`.
7. **Bytes.** `make dapp-nodev CHAIN_ID=11155111` → `widget: raw N bytes · budget 10240 · M left`
   with `N` **equal to step 0's re-run figure, delta `0`** — nothing here touches
   `app/src/widget.js`; the `dapp:` line's `gzip` and `raw` figures recorded as signed deltas
   against step 0's re-run figures (the moved declaration ships about 300 raw bytes it did not
   before; the figure, not this estimate, goes in the handoff), and both chains' `sha256` of
   `app/dist/index.html` and `app/dist/widget.js` in the handoff § For the next upload.
8. **Nothing else moved.** `node --test test/*.test.mjs` passes with more tests than step 0's re-run
   figure and the handoff names the added ones per file; `forge test` count unchanged from `main` and
   stated; `make fmt`, `forge lint` and CI pass at the head; `git status --porcelain` empty after
   `make dapp-nodev CHAIN_ID=11155111`; `HANDOFF.md` has an AC table with exactly nine rows, one per
   criterion here, and the PR is from the handbook template with the architect (`@lakkoss`) as
   reviewer.
9. **The M05 gate.** This PR merges before m05-t01's Run B step 14 is prepared, and the handoff's
   § For the next upload says so with the hashes and the list of what the bundle carries (m04-t15's
   five plus #273 and #274); no upload is started by this task. If m05-t01's bundle has already been
   built when this is ready, the handoff says so and the architect re-sequences.

## Out of scope

- Everything of m04-t17 ([#275](https://github.com/dnznlabs/rake/issues/275), decision 61): a
  settings page, a user RPC URL per chain, a wallet-or-RPC read route the reader chooses,
  name-service priority, any `localStorage` key beyond `theme` and `rake.recent`. The public
  endpoint is the table at `:41` and the reader does not pick it here; `readProvider` is where
  m04-t17 lets them.
- Any `src/` byte, `.gas-snapshot`, `RUNBOOK.md`, `scripts/forge/*`, `mk/*`, the Makefile,
  `calldata/`, `SECURITY.md`, `app/src/layout.html`, `app/src/theme.css`, the build.
- The widget (`app/src/widget.js`): criterion 7 holds its size at delta `0`.
- A new wording for any write control: the eight `connect a wallet` sites stand as they are.
- Reverse names on chains other than `1` and `11155111`; a name on the button that bypasses
  `Model.plainName`; caching the button's name in `NAMED`.
- [#227](https://github.com/dnznlabs/rake/pull/227) (m04-t12) and anything it touches; the
  m04-t15 hunks themselves (this branch starts after they merge and re-measures their anchors).
- The upload itself, m04-t05 step 3, and M05.

## Open questions

None. The upload choice is m04-t15's, extended to this task in § The upload; the wording of the
two header lines is in the chrome's register and the Product Owner's merge of this file accepts
it.

## Context

- [#273](https://github.com/dnznlabs/rake/issues/273) and [#274](https://github.com/dnznlabs/rake/issues/274),
  the two findings; [#275](https://github.com/dnznlabs/rake/issues/275), the settings page this
  task is not; `ROADMAP.md` decisions 10 (the salt carries its sender, why `#/create` needs a
  wallet), 13 (the resolution order), 17 (the page's voice), 54 (the testnet redeploy this bundle
  rides), 61 (this task).
- [m04-t15 TASK.md](../m04-t15/TASK.md) — the preamble's harness, § The upload, criterion 12 — and
  its `HANDOFF.md` § For the next upload once it exists (the list this task's bundle extends);
  [m04-t13 TASK.md](../m04-t13/TASK.md) R10 (the name gate `nameWho` sits behind);
  [m04-t01 HANDOFF.md](../m04-t01/HANDOFF.md) § The browser check (the harness).
- `docs/milestones/m05/tasks/m05-t01/TASK.md` § Gate and step 14, amended for this task;
  `docs/milestones/m05/MILESTONE.md` § Decisions M05-D1.
- `AGENTS.md` § The dapp: the `/*DEV*/` fence and what `make dapp-nodev` strips; the window budget
  sized against the public endpoints; the chromium that launches.
