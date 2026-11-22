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
   - **Disconnect holds across a reload** (the Product Owner's requirement, 2026-11-21). Today
     `disconnect` asks the wallet to revoke (`wallet_revokePermissions`, `index.html:148`), and a
     wallet without that method hands the account back on the next load, so the page reconnects
     by itself. Disconnect also sets a mark in the page's storage, `rake.off`. While it is set
     the page does not ask the wallet for accounts at boot and ignores `accountsChanged`, so it
     stays disconnected. Connect clears the mark and asks with `wallet_requestPermissions` for
     `eth_accounts` first, which makes a wallet that supports it show its own prompt again, and
     with `eth_requestAccounts` where it does not. What the page cannot do is make a wallet ask:
     one that supports neither revoke nor a permission request may return the account with no
     prompt, and the handoff names any wallet seen to do so.
   A wallet's name is the wallet's own string: it reaches the page through `textContent` or
   `esc`, never as markup, and its icon is not rendered. Check: tests for each of the five cases, the fifth with a provider that has no `wallet_revokePermissions` and still reports an account after a reload,
   and one in which a wallet announces a name containing markup and the menu shows it as text.
4. **One carried finding that rides this upload**, because it would otherwise cost one of its
   own. (Amended 2026-11-21: this step first carried a second,
   [#328](https://github.com/dnznlabs/rake/issues/328), that the page names no network with no
   wallet connected. It does: `app/src/index.html:619` sets `#netname` from `CFG.chainId`, and the
   live pages read `sepolia` and `base sepolia`. The reading behind #328 searched for the names
   with capitals; the issue is closed as invalid and nothing is built for it.)
   - **Hold what is already true.** A test asserts that the header's network name is set from the
     build's chain with no wallet connected. If a test already asserts it, name it in the handoff
     and add none.
   - `rake.recent` is one key for every chain on a shared origin (m05-t04's handoff, § Step 8).
     Key it by chain id, and read an old unkeyed value once as the current chain's so nobody
     loses a list. Check: a test in which an address saved on one chain id is absent on another.
4a. **The page reloads only on a real chain change** ([#341](https://github.com/dnznlabs/rake/issues/341)).
   In Phantom's in-app browser the dapp reloads without stopping, through two different
   gateways (#334). `index.html:134` reloads on every `chainChanged`; reload only when the
   event's chain differs from the chain the page last read. That this is the cause is a
   hypothesis until step 7a's preview is opened in Phantom. Check: a test in which a provider
   emits `chainChanged` on load with an unchanged chain and no reload follows, and one in which
   a changed chain still reloads.
5. **The phone links.** Shown only when **no wallet is found and the device is a phone or a
   tablet**; a desktop with no wallet reads today's sentence, unchanged. One function decides
   "phone": `navigator.userAgentData.mobile` where it exists, otherwise the user-agent names
   Android, iPhone, iPad or iPod, otherwise a Mac user-agent with `maxTouchPoints > 1` (an
   iPad). Each link carries the page's own `location.host`, path and fragment, and the list is
   offered only on `https:`. The list holds **only the wallets step 1 saw work**; a format that
   failed or was not tried on any device is left out, and the handoff says which. **Read on the
   Product Owner's iPhone on 2026-11-21 (#334), each link tapped in Chrome: MetaMask and Coinbase
   Wallet open the page in the wallet and Connect works there, so those two are the list.
   Rainbow opens the page and connects, and the page then cannot read the chain through it
   ([#342](https://github.com/dnznlabs/rake/issues/342)), so it is off the list until that is closed; Trust Wallet does not, and its link host
   publishes no app-association file, so it is off the list; Phantom opens the page and is
   listed only if step 7a's preview shows step 4a stopped the reloading.** A link pasted into the
   address bar goes to the App Store and is not a failure of the link. The candidates as first
   written:

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
   **Amended 2026-11-21: the stop was taken, and a third chunk is allowed, inside the batch.**
   As reported by the engineer on [#336](https://github.com/dnznlabs/rake/issues/336): `main`'s
   document is under the 48,000 bytes two chunks hold and this task's is over it. **The figures
   first written here were wrong about their cause (corrected 2026-11-21):** the compressed size
   does not move with the contract addresses, it moves with the zlib build, as `app/build.mjs`
   says at its `gzipSync` line. Measured by the architect on `main` at `550b802`, one document of
   150,842 bytes: **47,659** compressed under the pinned toolchain (`devbox run`, node v24.12.0,
   zlib 1.3.1) and 47,917 under the machine's own node (v24.21.0, zlib 1.3.2.1). Only the pinned
   figure counts, because only the pinned toolchain builds what is uploaded. The engineer's figure
   for this task's document under the pinned toolchain is 48,551 and 48,550 on the two testnets
   (#336), so a third chunk of about 550 bytes is needed.
   The chunk size stays 24,000: `RUNBOOK.md` § Gas makes that the ceiling, and it is not raised
   to buy room. What changes is the upload's shape, and only as far as it must:
   - **Proposals stay three per chain.** Document chunks 0 and 1 are proposals 1 and 2 as today.
     Every document chunk after the second is an `addChunk` call **inside the batch**, ahead of
     `addWidgetChunk`, so the batch becomes `addChunk` (one per extra chunk), `addWidgetChunk`,
     `setChunks`, `setWidgetChunks`, in that order. `App` creates its pointers in call order, so
     the pointer `setChunks` names for chunk 2 is `App`'s CREATE at nonce *N* + 2 and the
     widget's at *N* + 3.
   - **`tools/step4-calldata.mjs` builds that shape for any chunk count of two or more**, refuses
     a batch over the 65,536-character cap as it refuses any file over it, and prints the pointer
     list it derived. The file names for proposals 1 and 2 do not change. A unit test builds a
     three-chunk payload and asserts the batch's decoded calls and their order, the pointer
     addresses for a given `App` nonce, and that a two-chunk payload still produces today's five
     files byte for byte.
   - **`RUNBOOK.md` § 4a to § 4d say it**: the batch's contents by rule and not by count, the
     gate before each piece read from the calldata as now, and `cast nonce $APP` after an upload
     as *N* plus the number of chunks uploaded, document and widget together, in place of the
     literal 4.
   - **The fork proof of § Gas runs before any signature**, as it does today, on both testnets:
     the three pieces executed in order on a fork, then `chain-doc`'s `inflated sha256` equal to
     the build. That is what shows the three-chunk document reassembles.
   - **Stop and report** if the batch's estimate on either testnet exceeds half that chain's
     block gas limit, or if the document needs a fourth chunk.
   - **The handoff quotes the compressed size with the node and zlib versions that produced it**,
     since the same document compresses about 260 bytes apart under two zlib builds;
     `RUNBOOK.md`'s sizing text gains that sentence where it states the two-chunk figures, and
     says that a size read outside `devbox run` is not a size of the upload.
4b. **Base and Ethereum are in `ENABLED`** (the Product Owner's ruling, 2026-11-22; decision 69
   as amended). `app/src/index.html:42` becomes `[1, 8453, 11155111, 84532]`, so the document
   that goes to both testnets, and after them to Base and Ethereum, links both mainnets with no
   read. He accepted what comes with it: until a mainnet's own document is up and the gateway
   carries that chain, the menu's link to it leads nowhere, and the `#/docs` contracts table reads
   it as live. Correct the comment above the list and any test that pins it. Steps 2 to 6 merged
   in #347, so this is a PR of its own, `Refs` the task issue. Then the preview of step 7a is
   rebuilt from `main`; it lands before his word on that preview, which is when decision 71's
   freeze begins. Check: `grep -n 'const ENABLED' app/src/index.html` prints that list, and in the
   rebuilt preview the network menu shows `mainnet` and `base` as links and the other four as
   pending deployment.
   **In the same PR, one link** (his request, 2026-11-22): the `ERC-8244` link in `#/docs`
   (`app/src/index.html:2382`, today `https://github.com/ethereum/ERCs/pull/1712`) goes where the
   footer's does (`:68`, `https://eip.tools/eip/8244`). Check: `grep -c 'ERCs/pull/1712'
   app/src/index.html` prints 0, and both links carry the same `href`.
7. **One PR** with steps 2 to 6, the regenerated `calldata/` for both testnets, and
   `docs/milestones/m04/tasks/m04-t05/UAT.md` gaining rows for: the menu with two extensions, a remembered wallet after reload, a
   disconnect that holds after reload, the chain's name with no wallet, and each listed phone link. Review, then merge.
7a. **A preview the Product Owner tests before anything is uploaded** (his requirement,
   2026-11-21). No proposal of step 8 is made until he has said the preview is good.
   - **What is served:** the document that would be uploaded, `app/dist/index.html` from
     `make dapp-nodev`, one chain at a time, as a static file. It reads the testnet contracts
     through the chain's public endpoint and through his wallet, as the uploaded one will. It is
     not served through the gateway, so anything that depends on the gateway's first load is
     still read at step 9.
   - **How it reaches his phone:** a static file server bound to `127.0.0.1` over
     `app/dist/` alone, and a temporary HTTPS address in front of it from a quick tunnel
     (`cloudflared tunnel --url http://127.0.0.1:<port>`; `nix run nixpkgs#cloudflared` gave
     version 2026.10.7 on this machine on 2026-11-21, and no account is needed). Nothing is added
     to `devbox.json`. The address is random, is sent to him on the action issue and nowhere
     else, and the tunnel and the server are stopped when the sitting ends. Check before sending
     it: `curl` of the address returns the built file's SHA-256, and a path outside `app/dist/`
     returns 404.
   - **A switch for a desktop look, in the development build only:** `?phone=1` makes the page
     take the phone path, and `?phone=0` the desktop one, inside the `/*DEV*/` fence that
     `app/build.mjs` strips, so the document that ships has no such switch. Check: the strip test
     of `test/nowallet.test.mjs` covers it, and `grep -c 'phone=' app/dist/index.html` after
     `make dapp-nodev` prints 0.
   - **What he checks:** the new `UAT.md` rows of step 7 that need no upload: the menu with two
     extensions on a desktop, a remembered wallet after reload, and on the phone each listed
     link opening the preview's own address inside that wallet with Connect working there.
   - **His word gates step 8.** A comment on the action issue, or in chat and recorded there. A
     row that fails is fixed in a PR and previewed again; nothing is uploaded to find it.
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
- A test holds the header's network name with no wallet connected, and an address saved under
  one chain id is not listed under another.
- On both testnets `make chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`,
  and the document is two chunks, or three with the third inside the batch as step 6 was
  amended; three proposals per chain either way, and a two-chunk payload still produces
  byte-identical calldata to `main`'s tool.
- M04 criterion 6's signoff is in the handoff, dated, in the Product Owner's words, for this
  document.
- The Product Owner's word that the preview of step 7a was good is on its action issue, dated
  before the first proposal of step 8, and `grep -c 'phone=' app/dist/index.html` prints 0 for
  the document uploaded.
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

- **Action on the Product Owner: test the preview of step 7a**, filed by the engineer as an
  `action` issue when the preview is up, with the address. Gates step 8. No default: the upload
  waits for his word.
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
  network it is showing. The header does, with or without a wallet (`app/src/index.html:619`);
  step 4's test holds it.
