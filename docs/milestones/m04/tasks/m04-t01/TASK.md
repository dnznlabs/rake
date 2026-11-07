# m04-t01 — The dapp that ships to a public chain

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, the bundle m04-t03 uploads is the one that works on a real chain: the history
reads survive a provider that caps `eth_getLogs` (#76 — and the caps are now measured, not assumed:
**200 blocks** on `sepolia.base.org`, **50,000** on publicnode's Sepolia, with pruned history behind
that), an `Expired` revert before boot no longer throws (#148), the widget says whose clock judges
expiry (#149), the Limits page names the token class decision 23 excludes, `AGENTS.md`'s chromium
paragraph says what this host does today (#110), and `app/build.mjs` refuses a broadcast log it would
misread (#140). `app/`, `test/*.mjs`, `AGENTS.md` only; nothing under `src/`.

## Plan

Every command runs from the repo root through `devbox run --` (node from `devbox.lock`, forge
`1.7.1-dev`). Branch `m04/t01-dapp` from `origin/main` at or after `df74066`'s merge (#155's repaint
fix is in; build on it). Check hooks with `ls .git/hooks | grep -v sample`. Line numbers are
`app/src/index.html`, `app/src/widget.js`, `app/src/model.js` and `app/build.mjs` at `df74066`;
trust names over numbers. The browser check every `app/` task ends with runs as `AGENTS.md` § The
dapp describes — which step 5 corrects first, so do step 5 early.

0. **Baselines.** `node --test test/*.test.mjs` → **67**; `make dapp-nodev` → `wc -c
   app/dist/widget.js` **8,043** of the 10,240 budget (2,197 left — #149's label and nothing else
   spends it); `forge test` 91. Record all three.

1. **Logs in windows the provider accepts (#76).** Today `logs(address, topics, fromBlock)`
   (`index.html:166`) is one `eth_getLogs` from `fromBlock` to `latest`, called three times per
   distribution page from `from = FIRST.get(d.addr) || CFG.factoryBlock` (`:1013`) and once for the
   `Created` scan (`:1517`). Measured on 2026-11-07 with `cast rpc eth_getLogs` against the public
   endpoints `RUNBOOK.md` § 1 names:

   | provider | cap | error, verbatim |
   |:--|--:|:--|
   | `https://ethereum-sepolia-rpc.publicnode.com` | 50,000 blocks | `-32701 exceed maximum block range: 50000` |
   | `https://ethereum-sepolia.publicnode.com` | 50,000, and older ranges | `4444 pruned history unavailable` at 50,000 back |
   | `https://sepolia.base.org` | **200 blocks** | HTTP 413, `-32614 eth_getLogs is limited to a 200 range` |

   Base Sepolia mints a block every 2 s — 43,200 a day — so a naive window over a week-old
   distribution through that endpoint is 1,500 requests. The design, therefore, in `model.js`
   (pure, tested) plus a thin caller in `index.html`:
   - `windows(from, to, size)` → the list of `[a, b]` inclusive ranges; `rangeCap(message)` → the
     number a provider's error names (`exceed maximum block range: N`, `limited to a N range`), or
     `null` for an error that is not a range error; `isPruned(message)` for `pruned history`.
   - `logs()` becomes: read `eth_blockNumber` once per page load; start with `WINDOW = 10_000`
     (MetaMask's Infura default; the task measures MetaMask's own Sepolia and Base Sepolia RPCs in
     the browser check and records them); on a range error, set the window to `rangeCap(message)`
     if it names one, else halve, and retry that range; issue at most **4 windows in flight**; stop
     after **`MAX_WINDOWS = 40`** requests per log kind and mark the history **partial from block
     `b`**. On `isPruned`, the same: partial from the first block the provider still serves.
   - The three history sections and the funds block already render from `DS` (#155): a partial
     history paints what arrived and one line under the section — `history before block N not
     loaded · load older` — whose control runs another `MAX_WINDOWS` further back. The `Created`
     scan (`:1517`) uses the same `logs()` and, when partial, says so in the recents list rather
     than silently showing fewer.
   - Rejected: a third-party indexer (a dependency the dapp has none of); a per-chain window table
     (the cap belongs to the provider the wallet picked, not the chain, as the two Sepolia endpoints
     above show).

   Check: `test/model.test.mjs` gains `windows` (exact ranges, inclusive bounds, a range smaller
   than one window, `from > to` → `[]`), `rangeCap` against the three verbatim strings above and
   one unrelated error → `null`, `isPruned`; `node --test test/model.test.mjs` passes with more
   tests than step 0. In the browser check: on anvil nothing changes (one window); with the dev
   stack pointed at Sepolia through `?rpc=https://sepolia.base.org` for a Base Sepolia address —
   or, if no address exists there yet, with the window forced to 200 by a `/*DEV*/`-fenced
   override — the DNZN page shows its sections, the network panel shows ≤ 40 requests per kind,
   and the partial line appears with a working `load older`.

2. **An `Expired` before boot (#148).** `txError` (`index.html:147-150`) passes `S.grace` to
   `Model.revertMessage(d, secs(), S.grace)`; `S.grace` is set at boot (`:410`), so a revert
   decoded before that throws on `null`. Two edits: `revertMessage` (`model.js`) treats a missing
   `grace` as "no deadline known" and says `that change expired — anyone may cancel it now`
   without the date clause; and `txError` passes `S.grace ?? null`. Rejected: blocking `txError`
   on boot (a revert can come from the create flow before `S.loaded`).

   Check: `test/model.test.mjs`'s `revertMessage` table gains the `Expired` row with `grace`
   undefined → the shorter sentence; the existing row with `grace` still carries the date.

3. **The widget names its clock (#149).** `widget.js:85-92`: `fmtEta` and `etaText` judge
   `eta + GRACE` against `Date.now()`, the only clock a one-`eth_call` widget has; the dapp judges
   against the block timestamp. Keep the clock; say so: the queued line (`:197`) gains
   `title="judged by this device's clock"`, and `etaText` returns `'expired'` only when the local
   clock is **more than an hour** past `eta + GRACE`, else `'ready to apply'`, so a skewed device
   does not call a live change dead at the boundary. Rejected: a second RPC call for the block
   timestamp (the widget's one-call shape is deliberate, decision 12's cost model).

   Check: `test/widget.test.mjs`: the existing "past the window renders expired" test moves its
   clock an hour past and passes; a new case 30 minutes past reads `ready to apply`; `grep -c
   "device's clock" app/src/widget.js` → 1; `wc -c app/dist/widget.js` ≤ 10,240 after
   `make dapp-nodev`, the figure recorded.

4. **The Limits page names balance-falling tokens.** `index.html:1688`, under `#/docs` § Limits,
   after `A token that charges a fee on transfer delivers less than the table specifies.`, add one
   sentence in that register: `A token whose balance can fall on its own, such as a rebasing or
   slashable token, is not supported: under a shortfall the first account to take its escrow is
   paid in full and the last bears the loss.` (Decision 23, reaffirmed 2026-11-07; `SECURITY.md`
   F4.)

   Check: `grep -c 'rebasing or slashable' app/src/index.html` → 1; `test/docs.test.mjs` gains one
   assertion that the Limits section contains it, if that file asserts section contents today
   (read it first; if it does not, the grep is the check).

5. **The chromium paragraph says what is true (#110).** `AGENTS.md:169-173` says the cached
   Playwright chromium fails on missing libraries and the nix one launches; m03-t03 saw the
   reverse. Run both launchers on this host today, from a directory outside the repo as the
   paragraph describes, and rewrite the paragraph to what happened, with the date and the two
   paths. Do this first, because steps 1 and 3 end with a browser check.

   Check: the paragraph carries today's date and names the launcher that works; the browser
   checks below were run with it.

6. **`build.mjs` refuses a log it would misread (#140).** `app/build.mjs:37` maps
   `transactionHash → blockNumber` from `log.receipts` and reads a contract's creation block from
   it. m03-t06 showed `run-latest.json` can pair hashes with the wrong transaction objects. Add,
   before the map is used: for each broadcast log read, assert
   `transactions.filter(t => t.transactionType === 'CREATE' || t.transactionType === 'CREATE2').length === 1`
   and `receipts.length === transactions.length`, else `throw` naming the file and the counts
   ("one creation per script is what makes the pairing safe; see rake#140"). `Chunks.s.sol`'s log
   has no creation and is not read for a block, so it is exempt by the filter.

   Check: a unit test in a new `test/build.test.mjs` feeds the assertion a two-creation fixture
   and expects the throw, and a one-creation fixture and expects the block; `make dapp-nodev` on
   the dev stack still builds.

7. **The browser check**, as `AGENTS.md` § The dapp (corrected in step 5) describes, against the
   dev stack: the distribution page, the pending view with an expired entry, the widget's queued
   line with its title, and the Limits page. Screenshots or DOM text in the handoff.

8. **`HANDOFF.md`** from the handbook template beside this file: the AC table with measured
   figures, the MetaMask cap measurements from step 1 (both chains), § Deviations, and the widget
   byte count.

## Acceptance criteria

- `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` is empty; `forge test` 91.
- `node --test test/*.test.mjs` passes with more tests than step 0's 67, and the handoff names the
  added tests: `windows`, `rangeCap` (three verbatim provider strings and one non-match),
  `isPruned`, the `Expired`-without-`grace` row, the widget's hour-past and 30-minutes-past cases,
  the two `build.test.mjs` fixtures.
- `grep -c 'rebasing or slashable' app/src/index.html` → 1; `grep -c "device's clock"
  app/src/widget.js` → 1; `grep -c 'rake#140' app/build.mjs` → 1.
- `make dapp-nodev` → `wc -c app/dist/widget.js` ≤ 10,240, figure recorded; `git status
  --porcelain` empty after it.
- The browser check of step 7 recorded; the step 1 Base-Sepolia (or forced-200) run shows ≤ 40
  requests per log kind and the partial line with a working `load older`.
- `AGENTS.md`'s chromium paragraph is dated 2026-11 and names the launcher used for step 7.
- PR closes #76, #110, #140, #148, #149.

## Out of scope

- Anything under `src/`; the two stale contract comments (next version).
- A different history source (indexer, subgraph). The dapp reads the chain and nothing else.
- The gateway (t02, running in parallel), the runbook, any testnet transaction.
- `#/docs` prose beyond the one Limits sentence; Denizen owns the page's voice (decision 17).

## Open questions

None. The window constants (`10_000` start, `40` requests, `4` in flight, the one-hour widget
tolerance) are the engineer's to tune against the measurements, within the AC; the handoff
records the final values and why.

## Context

- [#76](https://github.com/dnznlabs/rake/issues/76), [#148](https://github.com/dnznlabs/rake/issues/148),
  [#149](https://github.com/dnznlabs/rake/issues/149), [#110](https://github.com/dnznlabs/rake/issues/110),
  [#140](https://github.com/dnznlabs/rake/issues/140).
- `ROADMAP.md` decision 23 (reaffirmed 2026-11-07) and decision 12 (the widget's one-call shape).
- The architect's cap measurements, 2026-11-07, command shape:
  `cast rpc eth_getLogs '{"fromBlock":"0x…","toBlock":"latest","address":"0x…"}' --rpc-url <url>`
  (a bare object, not an array — the array form fails with `-32602` on both providers).
- m03-t09's handoff § For the dapp, and #155 (the sections now paint from `DS`).
