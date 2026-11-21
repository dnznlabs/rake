# m05-t01c — The wallet picker and the phone links

Milestone: [M05](../../MILESTONE.md) · Phase: 1 — Same bytes everywhere

When this is done Connect offers every wallet extension the browser announces, and on a phone with
no wallet it offers links that open the page in a wallet app's own browser. The document carrying
it is on both testnets, a wallet has been run against it, and it is the document m05-t02 uploads to
Base.

Decision 67. WalletConnect is not in this task.

## Plan

Everything is in `app/src/index.html` unless a step says otherwise. Nothing under `src/`,
`test/*.t.sol` or `.gas-snapshot` changes, and `app/src/widget.js` does not change.

**Sequence matters: the link formats are tried on a phone before any code lists them** (step 1),
because a format that does not work is found for the price of a tap now and for an upload on two
chains later.

1. **Wait for the phone readings** on the action issue named in § Open questions: which of the
   candidate links open `https://rake.dnzn.dev/11155111/` inside that wallet's browser, on which
   device, and whether Connect then works. Steps 2 to 4 do not wait for it; step 5's list does.
2. **Collect every announced wallet.** Today boot keeps the first EIP-6963 announcement
   (`index.html:122-126`). Keep them all, each with its `info.name` and `info.rdns`, and keep
   listening after the 150 ms wait so that a late extension is added. `window.ethereum` is used
   only when nothing announced. Check: a test in the manner of `test/ext.test.mjs`, lifting the
   page's own declarations, in which two fake announcers both appear in the list.
3. **Choose one.**
   - **One wallet found:** exactly as today. No menu, no extra click.
   - **Several, and none remembered:** the page reads as it does for a visitor with no wallet
     (the public endpoint), and Connect opens a menu naming each wallet. Picking one connects it.
   - **A remembered choice:** the picked wallet's `rdns` is stored under `rake.wallet`; on the
     next load that wallet is used as today's single wallet is, including the silent
     `eth_accounts`. If it is no longer announced, the choice is forgotten.
   - **Disconnect** forgets the choice, so the next Connect offers the menu again.
   A wallet's name is the wallet's own string: it reaches the page through `textContent` or
   `esc`, never as markup, and its icon is not rendered. Check: tests for each of the four cases,
   and one in which a wallet announces a name containing markup and the menu shows it as text.
4. **Two carried findings that ride this upload**, because each would otherwise cost one of its
   own:
   - [#328](https://github.com/dnznlabs/rake/issues/328): the header names the chain the page
     reads, from `CFG.chainId`, with no wallet connected. Check: the issue's own search of
     `document.body.innerText` finds the chain's name on the home route.
   - `rake.recent` is one key for every chain on a shared origin (m05-t04's handoff, § Step 8).
     Key it by chain id, and read an old unkeyed value once as the current chain's so nobody
     loses a list. Check: a test in which an address saved on one chain id is absent on another.
5. **The phone links.** Shown only when **no wallet is found and the device is a phone or a
   tablet**; a desktop with no wallet reads today's sentence, unchanged. One function decides
   "phone": `navigator.userAgentData.mobile` where it exists, otherwise the user-agent names
   Android, iPhone, iPad or iPod, otherwise a Mac user-agent with `maxTouchPoints > 1` (an
   iPad). Each link carries the page's own `location.host`, path and fragment, and the list is
   offered only on `https:`. The list holds **only the wallets step 1 saw work**; a format that
   failed or was not tried on any device is left out, and the handoff says which. Candidates,
   none of them proven by us:

   | Wallet | Link, for a page at `https://<host><path><fragment>` | Source |
   |:--|:--|:--|
   | MetaMask | `https://metamask.app.link/dapp/<host><path><fragment>` | from memory; its documentation has moved, find and cite the current page |
   | Coinbase Wallet | `https://go.cb-w.com/dapp?cb_url=<url, encoded>` | from memory; cite the page |
   | Trust Wallet | `https://link.trustwallet.com/open_url?coin_id=60&url=<url, encoded>` | from memory; cite the page |
   | Rainbow | `https://rnbwapp.com/dapp?url=<url, encoded>` | from memory; cite the page |
   | Phantom | `https://phantom.com/ul/browse/<url, encoded>?ref=<origin, encoded>` | its documentation, read 2026-11-21 |

   Check: tests that the list is empty on a desktop user-agent, empty when a wallet is found, and
   that each link built for `https://rake.dnzn.dev/8453/#/docs` equals a literal in the test.
6. **Size.** `make dapp-nodev` for each testnet, then `make chain-doc`'s sizing. The document is
   two chunks today, 24,068 and 21,444 bytes of calldata (`RUNBOOK.md:649-650`). **If the build
   needs a third document chunk, stop and report** with the byte count: the proposal count and
   the sizing rule change, and that is a plan question.
7. **One PR** with steps 2 to 6, the regenerated `calldata/` for both testnets, and
   `docs/milestones/m04/tasks/m04-t05/UAT.md` gaining rows for: the menu with two extensions, a remembered wallet after reload, the chain's
   name with no wallet, and each listed phone link. Review, then merge.
8. **Run B on both testnets** (`RUNBOOK.md` Step 4), proposals by the engineer, co-signed and
   executed as that section has it. Check: `make chain-doc` reports `inflated sha256` equal to
   the build's on both chains, and `make verify` from a gw44 checkout at the gateway's pin prints
   `ok` for the root and `widget.js` on both chains against `https://rake.dnzn.dev`.
9. **The wallet run**, on the Product Owner, against `https://rake.dnzn.dev`: every `UAT.md` row,
   the new ones included, one screenshot per row under `shots/`, and M04 criterion 6's signoff
   line in his words. This is m05-t01's criterion 18b, moved here. Any row that cannot reach its
   expected state is an issue linked from the handoff.
10. **`HANDOFF.md`**, with the two per-chain upload tables, the size before and after, the wallets
    listed and left out with the device each was tried on, and the signoff.

## Acceptance criteria

- `devbox run -- make test` passes, with the new tests of steps 2 to 5 in it.
- With two wallet extensions announcing, Connect lists both by name and connects the one picked;
  with one, the page behaves as `main` does today. Shown by the tests and by a `UAT.md` row.
- A desktop browser with no wallet shows the sentence it shows today and no link.
- A phone browser with no wallet shows a link for each wallet step 1 saw work and for no other,
  and each opens the same page, fragment included, in that wallet's browser, where Connect
  works. Shown by the Product Owner's rows in `shots/`.
- #328's search finds the chain's name with no wallet connected, and an address saved under one
  chain id is not listed under another.
- On both testnets `make chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`,
  and the document is still two chunks, or the stop of step 6 was taken.
- M04 criterion 6's signoff is in the handoff, dated, in the Product Owner's words, for this
  document.
- `git diff --stat main` touches only `app/`, `test/`, `calldata/`, `shots/`,
  `docs/milestones/m04/tasks/m04-t05/UAT.md`, `RUNBOOK.md` § Uploads, and this task's directory.

## Out of scope

- **WalletConnect**, its client, a QR code, and the shared library: after launch, scoped under
  [design-base#4](https://github.com/dnznlabs/design-base/issues/4).
- **The widget.** `widget.js` keeps reading `window.ethereum`; whether an embedded widget offers a
  picker is a design question there.
- **A desktop visitor with no extension.** Today's sentence stands.
- **Wallet icons, and any wallet list fetched from a third party.**
- **Mainnet.** m05-t02 uploads this document to Base; nothing here sends a mainnet transaction.
- **The `#/docs` snippet's host.** m05-t04b.

## Open questions

- **Action on the Product Owner: try the candidate links on a phone**, filed as an `action` issue
  when this plan merges. Gates step 5's list only. *Default if a wallet is not installed on any
  device he has:* it is left off the list and named in the handoff as untried.
- **Android.** Decision 67 says each link is tried on iOS and Android. *Question:* is there an
  Android device to try them on? *Options:* (1) the Product Owner tries them on one; (2) the list
  ships on the iOS readings alone and the handoff says Android is untried, with a `carried` issue
  to try it when a device is to hand. *Recommendation:* (1) if a device exists, since a link that
  fails on Android is a dead button for those visitors. *Default:* (2), taken at step 5 if no
  Android reading has arrived. *Record:* this task's handoff, and decision 67 gains a dated line.

## Context

- Decision 67, `docs/ROADMAP.md`; [#318](https://github.com/dnznlabs/rake/issues/318) for the
  WalletConnect measurement.
- `app/src/index.html:122-136` (boot and `connect`), `:609-631` (`who`, the header and the
  no-wallet sentence), `:488-489` (`rake.recent`).
- [m05-t04's handoff](../m05-t04/HANDOFF.md) § Step 8, and
  [#327](https://github.com/dnznlabs/rake/issues/327).
- m05-t01's criterion 18b and [#302](https://github.com/dnznlabs/rake/issues/302), which this
  task's step 9 now answers.
- gw44 decision 11: a testnet shares the origin on condition that the application says which
  network it is showing. #328 is that condition with no wallet connected.
