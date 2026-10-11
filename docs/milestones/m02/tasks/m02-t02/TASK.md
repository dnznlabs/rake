# m02-t02 — Reading: the shell and every screen that only reads

Milestone: [M02](../../MILESTONE.md) · Phase: 2 — Reading

When this is done the dapp is Rake on DNZN Base rather than the scaffold's placeholder: `#/` shows the
featured distribution live from the chain, `#/distros/<addr>` shows any distribution with its pending
changes decoded and its histories loaded from logs, `#/distros` lists `recent` and `mine`, and two
anvils at one address show two tables. Nothing is written to the chain yet; the create and propose
screens are t03 and route to a one-line notice here.

## Plan

Every command runs from the repo root through `devbox run --`. Branch `m02/t02-reading` from
`origin/main` after t01's PR has merged (its codec, seed and `CFG.featuredSalt` are the foundation);
hooks as in t01. The baseline on `main` at `aa38c7b`, 2026-10-11: `grep -c distros app/src/index.html`
→ 0, `grep -c snapshot` → 0, and the only routes are `#/` and `#/docs` — M02 criteria 3 and 5 fail
entirely, which is what makes them this task's.

1. **Pure helpers in their own inlined file.** Add `app/src/model.js`, inlined into `index.html` the way
   `eth.js` is (`/*@inline model.js@*/`, `export default` stripped by the build), holding every function
   that needs no DOM and no provider: `pct(bps)` (`6000` → `60%`, `3333` → `33.33%`, no trailing
   zeros), `countdown(eta, now)` (`3d 14h`, `ready to apply` once past), `decodePending(action)`
   returning `{kind, table|description|delay|owner}` or `{kind:'unknown', selector}` via `Eth.decCall`
   against the four setters, `supersededBy(table)` (one row, `bps === 10000n`, returns its account),
   `salt(sender, n)` (sender-prefixed, for t03 but tested here), and the snapshot type string in one
   place: `SNAPSHOT_T`. Test them in `test/model.test.mjs` under `node:test`, including `decodePending`
   on the t01 fixture `setBeneficiaries.calldata.hex` and on four bytes of garbage. Check:
   `node --test test/*.test.mjs` passes and `grep -c 'function ' app/src/model.js` equals the number
   of names the test imports — enumerate both, do not eyeball.
2. **The shell.** Keep the scaffold's provider, wallet, network and theme code in `index.html` (EIP-6963
   discovery, `switchChain`, `disconnect`, the three menus); replace the look and the views. In
   `layout.html`: the mark is the prototype's R with the split stem (`rake-dapp.html`, the nav lockup
   `<svg>`, and `Rake Brand Sheet.dc.html` for the lockup rules), wordmark `RAKE`, sub-label
   `DNZN LABS`; nav `distros · docs`; footer exactly as state-collection's
   (`app/src/index.html:100` there): left `work no. 001`, right `docs · dnzn labs · v0.1` with
   `id="ver"` (decision 8; the version string stays `__VERSION__`). In `theme.css`: the accent hue
   becomes `230` in both `--accent` declarations (DNZN Base `v1/README.md` § The contract names Rake's
   as baize 230); `.sig` becomes the rake bar; everything else inherited unchanged. Check:
   `grep -c 'oklch(.47 .09 230)\|oklch(.58 .09 230)' app/src/theme.css` → 2; `grep -c 'a public work'
   app/src/layout.html` → 0; `node --test` still passes (`inline-scripts.test.mjs` reads the source).
3. **The bar and the ledger.** Port `.bar`, `.seg`, `.ledger`, `.row` and the pending outline from the
   prototype's CSS into `theme.css` (tints t1/t2/t3 by the DNZN Base formula, amber outline for
   pending, 250 ms `flex-basis` as the one motion, off under `prefers-reduced-motion`). Render functions
   in `index.html`: `bar(table, {pending})` and `ledger(table)` — name bold, note in sans, address
   through `ext('address', …)` as the scaffold already does, percentage right-aligned. Check: a table
   of `[3333, 3333, 3334]` renders three segments whose `flex-basis` percentages sum to 100 and whose
   labels read `33.33% · 33.33% · 33.34%`.
4. **Reading one distribution.** `loadDistro(addr)`: `eth_getCode` first (empty → the "could not read
   distribution … on <chain>" state, not a decode error), then one `eth_call` to `snapshot()` decoded
   with `Eth.dec([SNAPSHOT_T], …)`, then in parallel `reserved(address(0))` and `eth_getBalance`
   (waiting-to-distribute is `balance − reserved`, ETH only in v1 — tokens need a list the chain does
   not carry, out of scope below). Detail view `#/distros/<addr>`: eyebrow `short(addr) · <chain> ·
   explorer`, description as `<h1>`, bar, ledger, pending block per `decodePending` (`setBeneficiaries`
   as a second bar in the pending style, the other three as one line each, unknown as the selector),
   `countdown` per item, then the meta strip (owner, delay, waiting). `supersededBy` non-null → load
   that address too and render the "superseded by" line before the bar (decision 6). Check: against
   the seeded chain, every value on the page equals the matching field of
   `cast call <addr> "snapshot()" --rpc-url … | cast abi-decode --input "snapshot()(…)"` — paste both
   in the handoff — and the pending block names `setBeneficiaries` with the swapped shares.
5. **The landing.** `#/`: the featured address is `predict(CFG.featuredSalt)` read once at boot
   (`call(CFG.factory, 'predict(bytes32)', [CFG.featuredSalt], ['address'])`); then its bar and ledger
   through the same `loadDistro`, the headline and two sentences from the prototype (`vLanding`, with
   the tip line and any `govUrl`/`about` copy removed — decisions 1, 2), two CTAs (`Create a
   distribution` → `#/create`, `Get the widget` → `#/docs#widget`), the load field (`0x… or a name`;
   addresses navigate, names show `name resolution arrives with t03`), and the four verb blocks.
   `#/create` renders one notice: `the create flow arrives in the next task`. Check: with
   `make serve` up, `#/` shows the seeded table and its pending change with no console error, and
   `#/create` shows the notice.
6. **The list.** `#/distros`: tabs `recent` (`rake.recent`, up to 8 addresses, `try/catch`-guarded as
   the prototype's `store` is) and `mine`. `mine` is an `eth_getLogs` on the factory, topics
   `[sel('Created(address,address)') padded, null, pad(ACC)]`, `fromBlock` the factory's deploy block:
   add `<NAME>_BLOCK` tokens to `app/build.mjs` from each CREATE's receipt `blockNumber` in the
   broadcast log (`broadcast/Deploy.s.sol/<chain>/run-latest.json` → `receipts[].blockNumber`, `0x1`
   on a fresh anvil), so the page carries `__DISTRIBUTIONFACTORY_BLOCK__` and never scans from genesis
   on a real chain. Each hit is confirmed against `snapshot().owner` before it is listed, since
   ownership can have moved. Each row: description, chain, short address, a 6 px miniature bar,
   amber dot if pending. Disconnected: `recent` only. Check: after the seed, `mine` for anvil key 0
   lists the featured distribution and nothing else; for anvil key 1 it is empty with the empty-state
   copy, not a spinner.
7. **Histories, progressively.** After the snapshot has painted, `eth_getLogs` on the distribution for
   `Queued`, `Applied`, `Cancelled` (the changes list) and `Received`, `Distributed`, `Escrowed`,
   `Released` (activity), from the distribution's own first block — the `Created` log's block if known,
   else the factory's. Render newest first with block number, never blocking the table; a failed logs
   call shows `history unavailable` under the table and nothing else changes. Check: the seeded chain
   shows one `queued` entry and one `in 1 ETH` entry; throttle the dev RPC to prove the table paints
   first (`?rpc=` to a port with nothing listening still paints the error state within the poll
   timeout rather than hanging).
8. **Chains and explorers.** Extend the scaffold's `CHAINS`/`EXPLORER` maps with Base (8453,
   basescan.org), Arbitrum (42161, arbiscan.io), OP Mainnet (10, optimistic.etherscan.io) and Base
   Sepolia (84532, sepolia.basescan.org); anvil and 31338 (`anvil-b`) have no explorer and print plain
   text with the full value in the title, as `ext()` already does. Check: `grep -c 'onclick="return
   false"' app/src/index.html` → 0 — no neutered links survive from the prototype.
9. **Drift.** Second anvil: `anvil --port 8546 --chain-id 31338`, `make deploy ANVIL_PORT=8546
   CHAIN_ID=31338`, then open the dev build with `?rpc=http://127.0.0.1:8546`. Check: the same
   featured address, the 70/30 table, and `anvil-b` in the eyebrow; on `:8545`, 60/40 and `anvil`.
   Paste both `beneficiaries()` cast outputs and both eyebrow texts in the handoff. Tree clean after
   (t01 added the `31338` ignore line).
10. **Size and clean.** `make dapp-nodev` prints raw and gzip bytes; record them and the chunk count
    (`gzip / 24000`, rounded up) in the handoff against the M02 criterion 8 starting point. Then
    `forge build --force`, `forge test`, `forge snapshot --check` (no `src/` change: expect no diff),
    `forge lint`, `forge fmt --check`, `node --test test/*.test.mjs`, `make deploy`, and
    `git status --porcelain` empty. `grep -rniE '\btip\b|govUrl|about:|ownerKind' app/src` → nothing.
11. **Docs.** `AGENTS.md` § The dapp: one bullet for `model.js` (pure, tested, inlined) and one for the
    `<NAME>_BLOCK` tokens. `HANDOFF.md` beside this file.

## Acceptance criteria

- M02 criterion 3 in full and criterion 5's display half, with the cast outputs and page texts pasted
  in the handoff; criterion 9's greps and the clean tree.
- `node --test test/*.test.mjs` passes with `test/model.test.mjs` present; `forge test` 36 passed;
  `forge snapshot --check` exit 0 with no `Diff in`; build free of `Warning (` and `warning[`; lint and
  fmt silent.
- `#/create` and the load field's name path each show their one-line notice; `#/docs` is the scaffold's
  page, untouched (t04).
- The page issues no request before `discover()` resolves and paints the table before any logs call
  returns (step 7's check).
- `git diff --stat origin/main` names only `app/src/index.html`, `app/src/layout.html`,
  `app/src/theme.css`, `app/src/model.js`, `app/build.mjs`, `test/model.test.mjs`, `AGENTS.md` and the
  handoff.

## Out of scope

- Every write and the screens that collect their inputs — t03. The temptation is the propose drawer,
  whose table editor is the same component as create's; both are t03.
- Name resolution, forward or reverse — t03 (decision 13 fixes the order).
- The docs page — t04. The widget, `App.sol`, `Chunks.s.sol` — t05.
- Token balances other than ETH in the meta strip. The chain carries no token list; a later task may
  read `Distributed`/`Escrowed` logs for the set of tokens seen, which is a design question for t03's
  handoff rather than a feature here.
- `paid to me` — M02 `MILESTONE.md` § Out of scope.
- `src/Distribution.sol`, `.gas-snapshot`.

## Open questions

None. Decisions 1, 2, 6, 7, 8, 9 and 13 cover every choice this task makes.

## Context

- Design: `docs/brainstorming/design/rake-dapp.html` (`vLanding` 314–338, `vDistros` 348–363,
  `detailHTML` 364–405, `resolveName` states 260–271 for the copy only), `design/HANDOFF.md`
  § Tokens, § Type & spacing; DNZN Base `v1/GUIDELINES.md` and `v1/README.md` § The contract.
- Precedent: state-collection `app/src/index.html` — footer (line 100), `who()` painting before any
  network answer, `ext()`; its `CHAINS`/`EXPLORER` shape is the scaffold's.
- Contract: `src/Distribution.sol` events (lines 32–38), `Created` on the factory (line 297), public
  getters `reserved`, `escrowed`, `queued`.
- t01: `Eth.dec`, `Eth.decCall`, `CFG.featuredSalt`, the seed's tables (60/40 on 31337, 70/30
  elsewhere), the fixtures under `test/fixtures/abi/`.
- Carried into this task's successors, not this one: #18, #20, #22 (all t03).
