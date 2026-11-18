# m04-t05 — The UAT script, and the wallet-path measurement

Milestone: [M04](../../MILESTONE.md) · Phase: 4 — Accepted from a wallet

When this is done, criterion 6 has a script — one ordered list per chain, Sepolia (11155111) and Base
Sepolia (84532), each step naming the action, the expected state, the screenshot and the hash — that the
engineer has run once in headless chromium with an injected provider against Sepolia, so it is known
executable before Denizen opens it; Denizen has run it from a browser wallet on both chains, with every
hash and screenshot filed in `HANDOFF.md` by whoever holds them; the per-load `eth_getLogs` count and
wall time through the wallet's own RPC are recorded for both chains, which is the figure decision 52's
addendum waits on; and the signoff line under `MILESTONE.md` § Phases 4 is written or the findings that
stand in its way are issues. Nothing under `app/` changes here: anything Denizen finds is an issue,
scoped per item, and `app/` fixes land in their own task.

## Gate

**The next Run B has executed on both chains** — `RUNBOOK.md` § Which run is this, Step 4 alone —
serving the bundle built from `main` at `06fbaab` (the merge of m04-t13, carrying m04-t11, m04-t04 and
m04-t13). Read it per chain: `cast nonce $APP --rpc-url "$RPC"` has moved past the `7` that RUNBOOK
§ Uploads rows 1 and 2 record, § Uploads carries a row for that chain whose commit is `06fbaab` or a
docs-only descendant of it, and `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID`
reports an `inflated sha256` equal to `sha256sum app/dist/index.html` after `make dapp-nodev
CHAIN_ID=$CHAIN_ID` at that commit. **The engineer's headless run (step 2) starts when Sepolia's upload
has executed; Denizen's run (step 3) when both have.** m04-t12 (#227) is held by Denizen's ruling of
2026-11-18 and is not in this bundle; the page under test has no log cache, so the second load of
step 4 measures the same scan as the first — that is the point of the measurement.

## Plan

Every repo command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`,
`cast` from forge `1.7.1-dev`). Branch `m04/t05-uat` from `origin/main` at or after `06fbaab`; check
hooks with `ls .git/hooks | grep -v sample` → `pre-commit`, `post-commit`. Never `devbox run -- bash -c`
with a pipe; write a script. Scratch outside the repo. `RPC` and `CHAIN_ID` per chain as `RUNBOOK.md`
§ 0 sets them; `APP`, `FACTORY` and `OWNER` read from README § Contracts, never predicted.

**Line numbers below are `main` at `06fbaab`** for `app/src/index.html`, `src/Distribution.sol`,
`test/mocks/Mocks.sol` and `RUNBOOK.md`; nothing ahead of this task moves them, but trust names over
numbers.

**Two wallets, named once.** *The UAT wallet* is Denizen's EOA, `0x3578…902B` (README § Development
Team), which owns the DNZN distribution on both testnets (decision 50; `owner()` read in
[m04-t04 HANDOFF.md](../m04-t04/HANDOFF.md) § The hosted gateway) — so it is the one wallet that can
show the owner path on the page criterion 6 names, and it is not the Creator key of RUNBOOK § 0
(`0x68e0741D…`, whose predicted distribution `0x6aC98EDA…` is still codeless). *The engineer's wallet*
is `0x5A158aF8…` (RUNBOOK § 0 `ENGINEER`), which signs the headless run's transactions on Sepolia.

**The instrument for the measurement, stated once.** The served document is the `nodev` build:
`app/build.mjs:102` strips every `/*DEV*/` block, and the request log `self.__LOGREQ`
(`app/src/index.html:43-47`, pushed to at `:244-247`) is inside one, so the page on chain counts
nothing. Two instruments, one per run:

- *Headless (step 2):* the injected provider is the engineer's own object, so it counts every
  `request` whose `method` is `eth_getLogs` and records the `eth_blockNumber` answer the page reads
  once per load (`index.html:231-232`). Exact by construction.
- *Denizen's browser (step 3):* the page takes its provider at load — the first EIP-6963 announce,
  else `window.ethereum` (`index.html:102-107`) — and a hash navigation does not reload, so a snippet
  pasted into the DevTools console **after the landing has loaded and before the distribution route is
  opened** wraps `window.ethereum.request`, counts `eth_getLogs`, keeps the `eth_blockNumber` answer,
  stamps `performance.now()` at the `hashchange`, and watches the three section containers — `#funds`,
  `#h-changes`, `#h-funds` (`index.html:1361-1363`) — until none of them still carries its loading
  notice, which is the "painted" moment. The snippet is tracked as
  `docs/milestones/m04/tasks/m04-t05/count.js`, written in step 1 and run first by the headless run.
  **Its one unverifiable assumption** is that MetaMask's announced provider is the `window.ethereum`
  object the wrap touches; the detector is built in — a count of `0` with rows painted means the wrap
  missed the page's provider — and the fallback is the extension's own DevTools (the MetaMask service
  worker's Network panel, filtered to its RPC host), counting `eth_getLogs` entries in the request
  bodies, batched bodies counted per entry, with a screenshot of the filtered panel. **The page's own
  Network panel is not an instrument here**: a wallet request leaves the page by message, not by HTTP,
  so the panel shows none of it.

0. **Baselines, re-run at the branch point and recorded in the handoff with the commit and the date,
   never carried from here.** Per chain unless said otherwise:
   - The gate above, with the `cast nonce $APP` figure and the § Uploads row it matches.
   - The served document's hashes: `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain
     $CHAIN_ID` → `inflated sha256` and `widget sha256`, beside `sha256sum app/dist/index.html
     app/dist/widget.js` of `make dapp-nodev CHAIN_ID=$CHAIN_ID` at the commit § Uploads names for that
     chain; the pair must be equal, as RUNBOOK § Uploads requires of a row.
   - The gateway URLs' HTTP status: `curl -sS -o /dev/null -w '%{http_code}\n'
     https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.<chainId>.w3link.io/` and the same for
     `/widget.js` (README § Opening the App, `README.md:56`) → `200` ×4, with the
     `web3urlgateway-cache-status` header and, if present, `Age` — a `hit` serving the pre-Run-B
     document is m04-t04 § After the next Run B's residual and is recorded, not fixed.
   - The DNZN distribution: `cast call $FACTORY "predict(bytes32)(address)" 0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001`
     → the address, `cast codesize` → `45`, `description()` → `DNZN // FUND DISTRIBUTION`, `owner()`
     → the UAT wallet, `delay()` and `pendingCount()`. Decisions 50 and 51 say what to expect; the
     reading is the record.
   - Balances, with the amounts the run needs beside them: `cast balance <UAT wallet>` on both chains
     and `cast balance $ENGINEER` on Sepolia, plus `cast base-fee` on each. Need, as estimates: the UAT
     wallet sends two `create`s (280,281 gas each on anvil, MILESTONE § Needs from the Product Owner),
     one pay-in, `distribute`, two `propose`, `applyQueued`, `cancel`, `release` — about 1.2 M gas
     plus the pay-in — per chain; the engineer's wallet the same set once on Sepolia plus one small
     contract deploy. Record the figure the base fee makes of that and ask for a top-up only if a
     balance is under twice it.
   - `cast call $OWNER "isOwner(address)(bool)" <UAT wallet> --rpc-url "$RPC"` on both chains: `true`
     is what makes step 3 (h) reachable; `false` makes it a recorded `not reachable with this wallet`,
     not a finding.
   - The host page of criterion 5: the URL Denizen returned to m04-t04 AC (e), and
     `curl -s <url> | grep -ci 'w3link.io/widget.js'` → `1`; if AC (e) is still pending, say so — step
     3 (k) then records `pending on t04 (e)` and nothing here closes it.

1. **The script and the counter.** Write `docs/milestones/m04/tasks/m04-t05/UAT.md`: the two ordered
   lists below, one per chain, with a column each for the action, the expected state, the screenshot
   name and the hash cell, so Denizen fills cells rather than composes. Write `count.js` as the
   instrument says above, under 60 lines, no dependency, printing one object — `{ chainId, head,
   eth_getLogs, msToPainted, firstLoad: true|false }` — through `console.log` and keeping it on
   `window.__uat` so a screenshot of the console carries it. **The two lists are the same steps; what
   differs per chain is the URL, the explorer and the block times** (Sepolia about 12 s a block, Base
   Sepolia 0.2 s — decision 52's measurement — so a 60 s delay is five blocks on one and three hundred
   on the other). Each step is one of the rows in step 3; the file carries no prose the row does not.

   Check: `node --check docs/milestones/m04/tasks/m04-t05/count.js` exits 0; the two lists have the same
   row count, stated in the handoff; every row has all four cells.

2. **The engineer's headless run, Sepolia only, after Sepolia's upload executes.** The harness is
   m04-t01's ([HANDOFF.md](../m04-t01/HANDOFF.md) § The browser check: `playwright-core` outside the
   repo, the cached chromium `AGENTS.md` § The dapp names), but against **the gateway URL, not a local
   build**, and with a provider injected through `context.addInitScript` as `window.ethereum` before
   any page script runs: an object whose `request({ method, params })` forwards every method to
   `https://ethereum-sepolia-rpc.publicnode.com` (RUNBOOK § 1's Sepolia endpoint) through
   `page.exposeFunction`, except `eth_accounts` and `eth_requestAccounts` (answer `[ENGINEER]`),
   `eth_chainId` (answer `0xaa36a7`), `wallet_switchEthereumChain` (answer `null`), and
   `eth_sendTransaction`, which the node side turns into `cast send <to> <data> --value <value>
   --rpc-url "$RPC" $SIGNER --json` with the engineer's keystore (RUNBOOK § 0 `SIGNER`) and answers
   with the receipt's hash — the page then polls `eth_getTransactionReceipt` itself
   (`waitReceipt`, `index.html:132`). No `on` method is needed (`index.html:109` guards it). This is not a
   wallet: it answers the question "is every row of the script executable against the served document
   from a real origin", and it records figures for the measurement through publicnode, labelled as
   publicnode's and not the wallet's. Run the Sepolia list top to bottom, every row, with the counter
   wired into the provider rather than pasted; the escrow row needs the receiver of step 3 (f), which
   the engineer deploys first: `forge create test/mocks/Mocks.sol:RevertingReceiver --rpc-url "$RPC"
   $SIGNER` — its `accepting` is `false` at construction and `setAccepting` has no access control
   (`test/mocks/Mocks.sol:8-18`), so anyone flips it with one `cast send`. Record its Sepolia address
   in the handoff; it is reused by Denizen's Sepolia run and a second is deployed on Base Sepolia before
   that run.

   Check: every row's expected state reached, each hash in the handoff's Sepolia table in the
   engineer's column, `page errors: none`; the first-load and second-load figures of step 4 from
   publicnode; one screenshot per row under `shots/engineer/` (PNG, each under 300 KB, as m04-t04's
   `shots/` set the precedent). A row that cannot be reached is a defect in the script or in the page:
   the script is fixed in this PR, the page is an issue, and the handoff says which.

3. **Denizen's run, both chains, after both uploads execute.** Chrome with MetaMask, the UAT wallet on
   the chain in question, the gateway URL of README § Opening the App — never `localhost`, never
   `?rpc=`. One screenshot per row, filed under `shots/<chainId>/` by whoever holds it; every hash in
   the handoff's per-chain table. Before the first row on each chain, in DevTools on the landing: the
   three probe expressions of m04-t04 § The origin probe, with Denizen's column filled — `window.top
   === window`, `typeof window.ethereum`, `location.origin` — which is m04-t02's pending wallet half
   and closes here. The rows, per chain:

   - **(a) Load.** Open the gateway URL. Expected: the landing, `RAKE` in the title, the chain's name
     in the header (`sepolia` / `base sepolia`), the featured widget on the landing reading the DNZN
     distribution's table through the wallet (`index.html:1117`, no `data-rpc` on a `nodev` build).
     Screenshot: the landing with the address bar visible.
   - **(b) Connect.** Press connect; MetaMask asks for the account; the header shows the UAT wallet's
     short address. If MetaMask is on another chain, the page's own switch control
     (`index.html:114-121`) moves it, and the `chainChanged` reload is expected. Screenshot: the
     header with the account.
   - **(c) The DNZN distribution.** Paste `count.js` into the console, then open
     `#/distros/0x71a4221974Fc2E95081AE513248918dF27CF7a4A`. Expected: description `DNZN // FUND
     DISTRIBUTION`, the three-row table of decision 50, the owner bar reading as the owner (the UAT
     wallet is `owner()`), the `funds`, `changes` and `activity` sections painted, `changes` carrying
     the `Created` row and the `setDescription` queued/applied pair of #209, `activity` the `create`
     deposit (criterion 4's wording). The console's `__uat` object is the **first-load** figure of
     step 4. Screenshot: the page from the heading through the three sections, and the console object.
   - **(d) Second load.** Reload the page on the landing, paste `count.js` again, open the same route.
     Expected: the same sections; the `__uat` object is the **second-load** figure. Screenshot: the
     console object.
   - **(e) `load older`.** If a section shows `history before block N not loaded · load older`
     (`partialLine`, `index.html:819-823`), press it once; expected: the line's `N` moves down or the line goes, and
     the counter adds the press's `eth_getLogs` (record the delta — it is #165's figure in the
     wallet's own units). If no section shows the line, record `not shown — the scan reached the
     factory block within budget`, which is itself the finding #165 asked for.
   - **(f) Create, EOA-owned.** `#/create`: owner the UAT wallet, delay `60` (the field accepts
     seconds, `7d`, `48h` or `0`, `index.html:1427`), a table of three rows that sums to 100% —
     the UAT wallet, the engineer's wallet, and **the `RevertingReceiver` of step 2 on this chain**,
     ascending by address as the editor sorts them. Expected: step 2's editor accepts the table (the
     R5/R7 refusals of m04-t13 do not fire on a well-formed one), the `create` transaction lands, the
     page routes to the new address. Hash recorded; screenshot: the new distribution's page.
   - **(g) Pay in and distribute.** Send `0.003` ETH (an amount, not a figure to match) to the new
     address from MetaMask as a plain transfer. Expected: `activity` gains an `in` row and the funds
     section reads `waiting to distribute` with the amount. Press `distribute` (`index.html:1610`).
     Expected: two rows paid, and the receiver's share **escrowed** — `activity` shows an `escrowed`
     row and the funds section an escrow row `held in escrow` (`index.html:1662`), because the
     receiver's `receive()` reverts while `accepting` is `false` and `distribute` escrows a failed push
     (`src/Distribution.sol:154-171`, `_push` at `:402-418`, `PUSH_GAS` 100,000 at `:59`). Two hashes.
   - **(h) Release.** Flip the receiver — `cast send <receiver> "setAccepting(bool)" true --rpc-url
     "$RPC"` from any key, Denizen's or the engineer's on request — then press `release` on the escrow
     row (`release(address,address)`, `src/Distribution.sol:177-191`, permissionless). Expected: the
     escrow row goes, `activity` gains a `released` row. Hash. *Rejected alternative:* `App` as the
     escrowed row — it has no `receive()` (only `src/Distribution.sol:147` declares one across `src/`),
     so the escrow is reachable without a deploy, but `release` can never succeed on it and `claim`
     needs the escrowed account as `msg.sender` (`:199-203`), so the criterion's "exercises `release` or
     `claim`" would be a predicted revert, not an exercise.
   - **(i) Queue, apply, cancel.** Open the drawer (`Queue a change`, `index.html:1381`) and queue a
     table change — move one share by 1% between the two EOA rows — as the owner: a direct
     `propose(bytes)` transaction (`index.html:1403-1409`). Expected: `changes` gains a `queued` row
     with an `eta` 60 s out and the apply control reads `anyone can apply once the delay passes`
     (`index.html:899-907`). Wait past the eta (the page compares against the chain's clock,
     `index.html:359`), press `apply`: `applyQueued(bytes,uint32)` lands, `changes` gains `applied`,
     the table shows the new split. Then queue a second change — a `setDescription` — and press
     `cancel` on it (`cancel(bytes32)`, `index.html:912`); `changes` gains `cancelled`. Three hashes;
     screenshots of the pending row, the applied row and the cancelled row.
   - **(j) Create, vault-owned, and the calldata view (decision 7).** `#/create` again with the owner
     field set to the Ops vault `0x00c0e887…3790` (README § Contracts): the owner-guard of #172 says
     the owner is not the connected wallet and asks for an acknowledgement before step 2 — screenshot
     that sentence — then a two-row table (the UAT wallet, the engineer's wallet), delay `3600`.
     Expected after `create`: the new page's owner bar reads `you are a signer on <vault>, which owns
     this distribution — every change below is calldata to submit through it` (`index.html:1383`,
     reached through the `isOwner(address)` probe at `:1218-1225`), and the drawer's writes render as
     `copy calldata for your vault` (`index.html:1023`). Press one: expected the clipboard or, refused,
     the textarea fallback with the bytes (`index.html:198-202`); screenshot the bytes, no transaction.
     This is the only way criterion 6's "propose control showing calldata" is reachable on a testnet
     whose DNZN distribution is EOA-owned (decision 50 fixed that for the testnets and the vault for the
     mainnets), and it rehearses the mainnet shape. *Rejected:* transferring the DNZN distribution to
     the vault here — decision 50's testnet owner is the Creator EOA and a transfer is a one-way
     change to a public record for the sake of a screenshot. If `isOwner` read `false` in step 0, this
     row records `not reachable with this wallet` and the create is skipped.
   - **(k) The widget on the host page.** Open the dnzn.dev URL of m04-t04 AC (e) in the same browser,
     wallet on Sepolia. Expected: both mounts render the DNZN table — the one with `data-rpc` through
     publicnode and the one without through the wallet (`host/index.html:26-34`). Screenshot, filed as
     m04-t04's `shots/host-wallet.png` by the same PR if t04's row is still pending, with a line in
     both handoffs. On Base Sepolia the host page is Sepolia's by design and this row is Sepolia-only.
   - **(l) The docs page.** `#/docs`: fourteen sections in the rail, Disclaimer first
     (`test/docs.test.mjs:95` pins the count), `#/docs#widget` carrying the snippet with this chain's
     gateway URL. Screenshot: the rail and the widget section.
   - **(m) Sign-off or findings.** Anything that did not match its expected state is one issue per
     item, labelled `m04`, titled `uat: <row letter> <chain> — <what the page did>`, opened by the
     engineer with the screenshot and the expected state beside it. With nothing open, Denizen writes
     the dated line under `MILESTONE.md` § Phases 4 in Denizen's own words; the PR carries it.

4. **The measurement, recorded for decision 52's addendum.** One table in the handoff, § The wallet
   path, with one row per (chain × load): `chain`, `date`, `RPC` (MetaMask's endpoint for that chain
   as its network settings name it; publicnode for the engineer's row), `head` (the `eth_blockNumber`
   the counter kept, as the block tag of the reading), `eth_getLogs`, `ms to painted`, `load older`
   delta where pressed, and the instrument used (`count.js` or the extension panel fallback). Beside
   it, in one sentence each: what the figure means against the 40-per-kind ceiling (`MAX_WINDOWS`,
   `index.html:221`) and the 10,000-block opening window (`:219`), and whether the count moved
   between first and second load (it should not — no cache is in this bundle; if it did, say what
   could have changed between the loads). **The ship-or-close decision on t12 is not this task's**:
   the handoff records, decision 52's addendum decides.

5. **Close-out facts the handoff states**, each in its own line under § Carried issues:
   - **#165**: the per-load count and the `load older` delta from step 4, on both chains, and which of
     the issue's two closing shapes the figure fits — (b) if the wallet RPC takes the 10,000-block
     opening window and the count stays well under the ceiling, in which case the issue closes on
     that figure in its closing comment; otherwise it carries on the number, for decision 52's
     addendum to act on.
   - **#127**: the two testnet rows of RUNBOOK § 1's native-balance table (`RUNBOOK.md:219-220`,
     both `none — measured, all four aliases 0x` / `0x at the legacy address`), re-read with the
     three commands of `RUNBOOK.md:189-198` against the UAT wallet as the probe address on each chain,
     the readings quoted; the issue stays open into M05 for the six mainnet rows and says so in a
     comment with the testnet readings.
   - **#174**: not this task's — its docs sentence is on the page (`index.html:1683`, `:1987`, `:2019`)
     and its cold-stipend test is `test/ColdStipend.t.sol`; one line saying whether both items the
     issue lists are on `main` at the branch point, and if so that it closes by that comment with the
     `src/` comment carried to the milestone that reopens `src/`; if not, carried as is.
   - **#197**: not this task's (`make setup`, the libs guard); one line, carried as is, naming the
     task that owns it or `unassigned`.

6. **`HANDOFF.md`** beside this file, from the handbook template: the AC table; the two per-chain hash
   tables (engineer's column on Sepolia, Denizen's on both); § The wallet path (step 4); § The origin
   probe, Denizen's column; § Carried issues (step 5); § Findings, the issue numbers opened at (m) or
   `none`; § For Denizen, the signoff line's location and the one wording question if (j)'s guard
   sentence reads wrong to the Product Owner (decision 17's voice). Screenshots under `shots/`, each under 300 KB.

## Acceptance criteria

Every figure is read at the review head, not quoted from here. Baselines are step 0's, re-run at the
branch point and recorded with the commit.

1. **The gate held.** The handoff's step 0 shows, per chain, `cast nonce $APP` past 7, the § Uploads
   row at `06fbaab` or its descendant, and `chain-doc`'s `inflated sha256` equal to the build's at
   that commit; the gateway URLs answer 200 ×4 with the cache header recorded.
2. **The script exists and is executable.** `UAT.md` has two lists of equal row count, every row with
   action, expected state, screenshot name and hash cell; `count.js` passes `node --check`; the
   engineer's Sepolia run reached every row's expected state, with one hash per transaction row in the
   engineer's column and `page errors: none`.
3. **Criterion 6, both chains, with evidence.** Denizen's table carries a hash for each of: `create`
   (EOA-owned), the pay-in, `distribute`, `release`, `propose` ×2, `applyQueued`, `cancel`, and the
   vault-owned `create` where (j) was reachable — nine or ten per chain — each resolving on that
   chain's explorer to the UAT wallet as sender with `status 1`; the DNZN distribution read (c) and
   the calldata screenshot (j) are present; the origin-probe column is filled.
4. **The measurement.** § The wallet path has four Denizen rows (2 chains × 2 loads) and at least one
   engineer row, each with `head`, `eth_getLogs`, `ms to painted` and the instrument named; no
   Denizen row is a `0` count beside painted sections unless the fallback instrument's row replaces it.
5. **The escrow was real.** The receiver's address per chain is in the handoff with its deploy hash,
   `distribute`'s receipt carries an `Escrowed` log for it, and `release`'s a `Released`; the flip's
   hash is recorded.
6. **Close-out lines.** § Carried issues has the four lines of step 5; #165's line names the figure and
   the closing shape; #127's quotes the two re-read rows.
7. **Findings are issues.** Every row whose expected state did not match has an issue number in
   § Findings, labelled `m04` and `uat`; none is fixed in this PR (`git diff --stat origin/main --
   app/ src/ test/ RUNBOOK.md` prints nothing beyond `test/` if a mock's comment changed, and nothing
   at all otherwise).
8. **The signoff.** `MILESTONE.md` § Phases 4 carries Denizen's dated line, or § Findings names the
   open issues standing in its way and the row says `pending` with their numbers.
9. **Files.** Every screenshot referenced exists under `shots/`, is a PNG under 300 KB, and
   `git status --porcelain` is empty at the head; CI green.

## Out of scope

- **Any `app/` change.** A finding is an issue, scoped per item; the fix lands in its own task and, if
  it changes what criterion 3 hashes, is re-uploaded once through m04-t08's vault procedure (RUNBOOK
  § Step 4) — said here once.
- **The mainnet document** and anything M05.
- **m04-t12 (#227)**, held; the ship-or-close decision on it, which decision 52's addendum takes from
  this task's figures.
- **Re-uploads.** This task reads the document the next Run B serves and starts no upload.
- **`MAX_WINDOWS`, `WINDOW_START`** and any history-read constant; #165 is recorded here, acted on
  elsewhere.
- **Transferring the DNZN distribution's ownership**, `App.lock()`, renounce — MILESTONE § Out of
  scope.
- **#174's and #197's work** — one line each in the handoff, no change.

## Human-in-the-loop requirements

What Denizen does, in order, with the time each takes as an estimate:

1. **Confirm the Run B executed on both chains** (the gate) — a read, no time beyond the
   signatures the Run B itself needs under RUNBOOK § Step 4b.
2. **Fund the UAT wallet** if step 0's balance line asks — a few minutes at a faucet; the amounts are
   step 0's, not this list's.
3. **Return m04-t04 AC (e)'s host-page URL** if still pending — the publish is the Product Owner's
   under decision 41; without it row (k) is recorded pending.
4. **Run the script on Sepolia** — rows (a) to (m): about 40 minutes, of which the delay wait in (i)
   is one minute and the two `create`s and seven other transactions are each a MetaMask confirmation.
5. **Run it on Base Sepolia** — the same rows minus (k): about 30 minutes.
6. **Hand over the screenshots and hashes** — to the engineer's session or by committing them himself
   under `shots/<chainId>/`; either files them, the handoff says who.
7. **Write the signoff line** under `MILESTONE.md` § Phases 4, or say which finding stops it — five
   minutes.

The flip of the receiver (h) is one `cast send` from any key; on request the engineer does it during
the session.

## Open questions

None. The one choice this plan made beyond the milestone row — the vault-owned second `create` as the
route to decision 7's calldata view, because the testnet DNZN distribution is EOA-owned under decision
50 — is row (j), with its alternative rejected there.

## Context

- [`MILESTONE.md`](../../MILESTONE.md) criterion 6 (the goal text), criterion 3 (the URL), criterion 4
  (what the DNZN page must show), § Needs from the Product Owner (the UAT session), § Phases 4 (the
  signoff slot), § Risks 2 (the opaque origin this task closes the wallet half of).
- [m04-t04 HANDOFF.md](../m04-t04/HANDOFF.md): § The hosted gateway (the URLs and the chain state),
  § The origin probe (Denizen's column), § For the Product Owner (AC (e)), § After the next Run B.
- [m04-t01 HANDOFF.md](../m04-t01/HANDOFF.md) § The browser check (the harness); [m04-t13
  TASK.md](../m04-t13/TASK.md), the shape this plan follows, and its step 8 (R17: the page re-reads
  `eth_chainId` before every send, which a wrong-network wallet will meet first).
- `RUNBOOK.md` § Which run is this, § Step 4 and § Uploads (the gate's record), § 1 (the
  native-balance table and its commands), § 0 (`SIGNER`, `ENGINEER`, `OWNER`).
- `docs/ROADMAP.md` decisions 7 (calldata for a contract owner), 17 (the page's voice), 50 and 51
  (the DNZN distribution's owner, table and name), 52 and its 2026-11-18 addendum (the measurement).
- Issues [#165](https://github.com/dnznlabs/rake/issues/165),
  [#127](https://github.com/dnznlabs/rake/issues/127), [#174](https://github.com/dnznlabs/rake/issues/174),
  [#197](https://github.com/dnznlabs/rake/issues/197); [#227](https://github.com/dnznlabs/rake/pull/227),
  held.
- `test/mocks/Mocks.sol:8-18` (`RevertingReceiver`), `src/Distribution.sol:147-203` (`receive`,
  `distribute`, `release`, `claim`), `:402-418` (`_push`).
