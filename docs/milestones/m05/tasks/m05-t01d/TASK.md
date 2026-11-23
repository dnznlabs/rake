# m05-t01d — The document mainnet gets

Milestone: [M05](../../MILESTONE.md) · Phase: 1 — Same bytes everywhere

When this is done the page reads every property of its own chain from its own chain, says honestly
how much history its endpoint can serve, and the `#/docs` snippet points at `rake.dnzn.dev`. That
document is on both testnets, the driver passes on both, the gateway serves its `widget.js`, and it
is the document m05-t03 uploads to Base and Ethereum.

It carries the five findings of m05-t01c's acceptance run:
[#373](https://github.com/dnznlabs/rake/issues/373),
[#375](https://github.com/dnznlabs/rake/issues/375),
[#379](https://github.com/dnznlabs/rake/issues/379),
[#382](https://github.com/dnznlabs/rake/issues/382) and
[#385](https://github.com/dnznlabs/rake/issues/385).

## Plan

`app/` and `test/` unless a step says otherwise. Nothing under `src/`, `test/*.t.sol` or
`.gas-snapshot` changes.

**Sequence matters: step 1 is a measurement, and step 5 is written from it.** Read by the architect
on 2026-11-22, one sample each, through `eth_getLogs` on the factory with an `Origin` header:

| chain | endpoint | answers | refuses |
|:--|:--|:--|:--|
| 1 | `ethereum-rpc.publicnode.com` (the document's) | 10,000 blocks back | 50,000 back: HTTP 403, `Archive requests re…` |
| 8453 | `mainnet.base.org` (the document's) | nothing: `429 request limit reached` to all six queries | — |
| 8453 | `base-rpc.publicnode.com` | 50,000 back | wider: `-32701 exceed maximum block range: 50000` |
| 11155111 | `ethereum-sepolia-rpc.publicnode.com` (the document's) | 10,000 back | 50,000 back: `4444 pruned history unavailable` |
| 84532 | `sepolia.base.org` (the document's) | 200 | wider: HTTP 413, `-32614 … limited to a 200 range` |
| 84532 | `base-sepolia-rpc.publicnode.com` | 50,000 back | wider: `-32701` as above |

So #382 is not one chain's endpoint. A walk back from the head meets one of three walls on every
chain: a small window, a refusal of old blocks, or a rate limit. Sepolia passes today only because
its factory is 18,000 blocks old. No endpoint in this table serves a year of history to a page
with no wallet, and this task does not pretend one does.

1. **Measure, per chain, before any code.** For chains 1, 8453, 11155111 and 84532, and for at
   least three candidate endpoints each (the document's, `deploy/chains.json`'s, and one more):
   the largest `eth_getLogs` span answered; the oldest block answered at that span, found by
   bisection, and the error text past it; whether 40 requests four at a time are answered or
   rate limited; and the `access-control-allow-origin` returned to `https://rake.dnzn.dev`. A
   script under `tools/`, its output committed in the handoff with the date. Check: the script
   exits non-zero when an endpoint answers nothing, and the table has no empty cell.
2. **#379, one type.** `CHAIN` is a number at all three assignments (`load()`, `pickWallet`,
   `chainChanged`). Check: a test asserts `typeof CHAIN` after each of the three, and that a name
   resolves after a wallet is picked from the menu and after a same-chain `chainChanged`.
3. **#375, the page's chain answers for the page.** Every read whose answer is a property of the
   chain the document was built for goes through the page's read provider for `CFG.chainId`:
   `createPredict`'s `eth_getCode`, the preflight `eth_call`, and `resolveName`. The wallet's
   chain is compared with the page's at the top of `tx()`, before the preflight, so a mismatch is
   reported as a mismatch. Accepted cost: a wallet whose only name lives on another chain shows
   its short address. Check: tests with a wallet provider on chain 1 and a page built for
   11155111 show a taken salt as taken, the preflight naming the mismatch, and no mainnet name.
4. **#373, keep the node's sentence.** When a preflight fails with no revert data, the status
   line carries the node's own message, shortened, and not the bare word `reverted`. Check: a
   test for an error with `message` and no `data`, and one with both, which still decodes.
5. **#382, say what was read.** Three parts, the first chosen from step 1's table.
   - `PUBLIC_RPC` per chain is the measured endpoint that serves the deepest history to a
     browser, and `deploy/chains.json` agrees with it or the handoff says why not.
   - **Amended 2026-11-23: the walk starts at the window its own endpoint is known to serve.**
     `logs()` starts every walk at `WINDOW_START` 10,000 and only shrinks, so an endpoint that
     serves 50,000 blocks a query is read 10,000 at a time, and one that serves 100 spends its
     first four windows being refused. For the page's own read provider, and only for it, the
     starting window is a per-chain figure beside `PUBLIC_RPC`, set to the span step 1 found
     reliable. A wallet's provider keeps 10,000, since its cap is not ours to know. The window
     still shrinks on a refusal, and `MAX_WINDOWS` and #165 are untouched. Check: a test that the
     first request of a walk through the read provider asks for the chain's figure, that a
     refusal still shrinks it, and that a wallet provider's first request is 10,000.
   - **Amended 2026-11-23: one in-flight limit for the page's own provider.** A distribution
     page walks three log kinds at once, four windows in flight each, straight after the
     landing's reads, and the free endpoints meet that burst with a rate limit: measured in a
     browser, a first read ended on a throttle in 8 of 10 cold loads on Sepolia and 4 of 10 on
     Base Sepolia, and one load was refused after its eighth request. Through the page's own
     read provider the three kinds share one limit of four `eth_getLogs` in flight. A wallet's
     provider keeps today's behaviour. `MAX_WINDOWS` and #165 are untouched: the same windows
     are asked for, not all at once. Check: a test that no more than four are in flight across
     kinds through the read provider and that a wallet provider is unchanged; then
     `tools/uat/cold.mjs`, ten loads a chain, twice at least an hour apart, with a first read
     ending on a throttle in no more than 2 of 10 on every chain. If four does not reach that,
     the handoff says what figure does and what it costs in time to paint, and the architect
     rules before the calldata is cut.
   - **Amended 2026-11-23: mainnet at full budget.** Chains 1 and 8453 read cleanly today only
     because their distributions are a day old. Each is also built with `factoryBlock` set back
     by 40 times its start window and cold-loaded ten times, so the walk a visitor meets in
     three months is measured before the upload and not after. Same bound.
   - A refusal of old blocks ends the walk at that block as a boundary, as running out of budget
     does today. The section paints what was read, then one line naming the block and the cause:
     the endpoint does not serve history before it, and a connected wallet may. No `load older`
     is offered past a wall the endpoint has named.
   - `history unavailable` is left for an endpoint that answered nothing at all. Before changing
     it, find why 84532 reads that today and not a partial line with empty rows, since the walk
     should have ended on its budget: reproduce it, and put the cause in the handoff.
   Check: tests through the `capped` provider for a 200-block cap, a prune floor and a refusal
   on the first window, each asserting the line painted; `#165`'s budget is not changed.
6. **#385, name the hash.** A queued change's action hash is labelled as one wherever a history
   row prints it, and is not styled as an address. Check: a test on `histRows` output.
7. **The snippet, moved here from m05-t04b.** `#/docs` § the widget gives
   `https://rake.dnzn.dev/<chain id>/widget.js` with an `integrity` attribute computed at build
   from `app/dist/widget.js`. It is moved so that the mainnet documents carry it and no chain
   needs a second upload for it. Check: a test that the attribute equals the build's own sha384,
   and `tools/uat/` row (l) asserts the host.
8. **The driver.** `tools/uat/`: the row-kind patterns exported from one place; `history
   unavailable` fails at once; row (c) accepts step 5's boundary line and then requires at least
   one activity row; `--chain 84532` runs the full list. Check: `node selftest.mjs`, and the
   control exits 1 on row (c) on both chains.
9. **One PR** with steps 1 to 8 and the regenerated `calldata/` for both testnets, cut under the
   pin. `RUNBOOK.md` Step 4 gains two steps after 4d: redeploy the gateway (§ The gateway), then
   gw44's `make verify` with `VERIFY_SITE=https://rake.dnzn.dev`, whose `site` lines are the
   record. m05-t01c's run of that command read a local build and no deployed host.
10. **Preview, then Run B on both testnets**, as m05-t01c steps 7a and 8 had it: the Product
    Owner's word on a preview built from `main`, proposals by the engineer, digests checked by
    the architect before he co-signs, executed, 4d, then step 9's two new steps. Check:
    `chain-doc`'s `inflated sha256` equals the build on both chains, and the `site` pass prints
    `ok` for the root and `widget.js` on both.
11. **The acceptance run.** The driver on both chains, in full. The Product Owner drives only
    what a wallet must vouch for and what changed: connect with his wallet on another chain than
    the page's (#375), and one row of step 5's line with no wallet on a phone.
12. **`HANDOFF.md`**, with step 1's table, the upload tables, the `site` lines and his word.

## Acceptance criteria

- `devbox run -- make test` passes with the tests of steps 2 to 7 in it.
- On all four chains the handoff's table names the endpoint chosen and the depth it serves, and
  the page built for each paints its boundary line at that depth in a browser, with a screenshot.
- `tools/uat/`'s driver exits 0 on Sepolia **and on Base Sepolia** against
  `https://rake.dnzn.dev`, full list, and exits 1 on the control on both. This closes the rows
  m05-t01c recorded as not met on 84532.
- On both testnets `make chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`,
  and `curl https://rake.dnzn.dev/<chain>/widget.js | sha256sum` equals `chain-doc`'s widget
  hash.
- gw44's `make verify` with `VERIFY_SITE` set prints `ok` on its `site` lines for both chains.
- #373, #375, #379, #382 and #385 are closed by the PR, each by a named test.
- `git diff --stat main` touches only `app/`, `test/`, `tools/`, `calldata/`, `deploy/`,
  `docs/milestones/m04/tasks/m04-t05/`, `RUNBOOK.md` Step 4 and § Uploads, and this directory.

## Out of scope

- **A log cache or an indexer** ([#221](https://github.com/dnznlabs/rake/issues/221), decision
  62) and **the history budget** ([#165](https://github.com/dnznlabs/rake/issues/165)). This task
  makes the page honest about what it could not read. It does not make it read more.
- **A `Created` row in `changes`.** Not shown today on any distribution; a product question.
- **`wallet_addEthereumChain`**, switching wallets without disconnecting (#348), and Rainbow and
  Phantom (#342, #341).
- **The embed in a DNZN app and the host page** (m05-t04b, #303).
- **Any mainnet transaction.**

## Open questions

- **Is a page that reads only recent history without a wallet acceptable at launch?**
  ([#387](https://github.com/dnznlabs/rake/issues/387)) *Options:*
  (1) yes, stated on the page as step 5 has it — costs nothing more, and a visitor with no
  wallet sees days or weeks of history, depending on the chain, and a line saying so; (2) no —
  the log cache of #221, or an endpoint DNZN pays for with its key in a public document, either
  of which is a task of its own before mainnet. *Recommendation:* (1): the table, the balances
  and the escrow are read from state and are always current; history is the part that degrades,
  and the alpha marker is on the page. *Default:* (1), taken when this file merges; gates step 5.
  *Record:* `ROADMAP.md` § Decisions, as a note on decision 62.

## Context

- m05-t01c's handoff, § Discoveries and § The upload.
- Decision 71: `app/` changes ride one upload. Decision 62: the log cache is carried.
- `tools/uat/` and `docs/milestones/m04/tasks/m04-t05/UAT.md`.
