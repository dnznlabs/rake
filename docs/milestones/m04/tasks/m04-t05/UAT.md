# m04-t05 — the UAT script

Two lists, one per chain, **14 rows each**. The rows are [TASK.md](TASK.md) step 3's; what differs per
chain is the URL, the explorer and the block time. Fill the `hash` and `screenshot` cells rather than
compose: a row whose expected state did not match is one issue, titled
`uat: <row> <chain> — <what the page did>`, labelled `m04` and `uat`.

Never `localhost`, never `?rpc=`. One screenshot per row, PNG under 300 KB, filed under the chain's
`shots/<chainId>/` directory — the engineer's headless Sepolia run files its own under
`shots/engineer/`. `count.js` is pasted into DevTools **after the landing has loaded and before the
distribution route is opened**; its printed object is the load's figure for § The wallet path.

Addresses, the same on both chains: the UAT wallet `0x357836fFcB45307FA7ff2A574F505753c961902B`, the
engineer's wallet `0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`, the Ops vault
`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, the DNZN distribution
`0x71a4221974Fc2E95081AE513248918dF27CF7a4A`. `<receiver>` is the `RevertingReceiver` deployed on that
chain, its address in [HANDOFF.md](HANDOFF.md) § The escrow receiver.

## Sepolia — 11155111

URL `https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3link.io/` · header reads `sepolia` ·
explorer `https://sepolia.etherscan.io/tx/<hash>` · about **12 s** a block, so row (i)'s 60 s delay is
about **five** blocks.

| # | action | expected state | screenshot | hash |
|:--|:--|:--|:--|:--|
| probe | On the landing, in DevTools: `window.top === window`, `typeof window.ethereum`, `location.origin` | `true`, `object`, the four-label `https:` origin above | `shots/11155111/probe.png` | — |
| (a) | Open the gateway URL | the landing, `RAKE` in the title, `sepolia` in the header, the featured widget reading the DNZN table through the wallet | `shots/11155111/a-landing.png` | — |
| (b) | Press connect; approve the account in MetaMask | MetaMask asks for the account; the header shows the UAT wallet's short address. On another chain, the page's own switch control moves it and the `chainChanged` reload is expected | `shots/11155111/b-header.png` | — |
| (c) | Paste `count.js`, then open `#/distros/0x71a4221974Fc2E95081AE513248918dF27CF7a4A` | description `DNZN // FUND DISTRIBUTION`, the three-row table, the owner bar reading as the owner, `funds`/`changes`/`activity` painted, `changes` carrying `Created` and the `setDescription` queued/applied pair, `activity` the `create` deposit. The console object is the **first-load** figure | `shots/11155111/c-distro.png`, `shots/11155111/c-console-first.png` | — |
| (d) | Reload on the landing, paste `count.js` again, open the same route | the same sections; the console object is the **second-load** figure, `firstLoad: false` | `shots/11155111/d-console-second.png` | — |
| (e) | If a section reads `history before block N not loaded · load older`, press it once | `N` moves down or the line goes, and `window.__uat.eth_getLogs` rises — record the delta. No line shown: record `not shown — the scan reached the factory block within budget` | `shots/11155111/e-older.png` | — |
| (f) | `#/create`: owner the UAT wallet, delay `60`, three rows summing to 100% — the UAT wallet, the engineer's wallet, `<receiver>`, ascending by address | the editor accepts the table, `create` lands, the page routes to the new address | `shots/11155111/f-created.png` | `create` … |
| (g) | Send `0.003` ETH to the new address from MetaMask as a plain transfer, then press `distribute` | `activity` gains an `in` row and funds reads `waiting to distribute` with the amount; after `distribute`, two rows paid and the receiver's share escrowed — an `escrowed` row in `activity` and a `held in escrow` row in funds | `shots/11155111/g-payin.png`, `shots/11155111/g-distributed.png` | pay-in … · `distribute` … |
| (h) | `cast send <receiver> "setAccepting(bool)" true` from any key, then press `release` on the escrow row | the escrow row goes, `activity` gains a `released` row | `shots/11155111/h-released.png` | `setAccepting` … · `release` … |
| (i) | Open `Queue a change`, queue a table change moving 1% between the two EOA rows as the owner; wait past the eta; press `apply`. Then queue a `setDescription` and press `cancel` on it | `changes` gains a `queued` row with an eta 60 s out and the apply control reads `anyone can apply once the delay passes`; after `apply`, `changes` gains `applied` and the table shows the new split; after `cancel`, `changes` gains `cancelled` | `shots/11155111/i-pending.png`, `shots/11155111/i-applied.png`, `shots/11155111/i-cancelled.png` | `propose` … · `applyQueued` … · `propose` … · `cancel` … |
| (j) | `#/create` with the owner field set to the Ops vault: screenshot the owner note, then a two-row table (the UAT wallet, the engineer's wallet), delay `3600`. After `create`, press one drawer write | the owner note reads `not the connected wallet — a contract — it will have to propose and cancel through its own calls` and step 2 proceeds with **no** acknowledgement — [#172](https://github.com/dnznlabs/rake/issues/172) requires one only for a never-used address, so `probeOwner` gives a contract no class (`app/src/index.html:1482`) and the box is drawn only for a classed reading (`:1742`); the new page's owner bar reads `you are a signer on <vault>, which owns this distribution — every change below is calldata to submit through it`; the drawer's writes read `copy calldata for your vault`, and pressing one gives the clipboard or the textarea fallback with the bytes, no transaction | `shots/11155111/j-guard.png`, `shots/11155111/j-ownerbar.png`, `shots/11155111/j-calldata.png` | `create` … |
| (k) | Open the dnzn.dev host page of m04-t04 AC (e) in the same browser, wallet on Sepolia | both mounts render the DNZN table — the one with `data-rpc` through publicnode, the one without through the wallet | `shots/11155111/k-host.png`, also filed as m04-t04's `shots/host-wallet.png` | — |
| (l) | Open `#/docs`, then `#/docs#widget` | fourteen sections in the rail, Disclaimer first; the widget section carries the snippet with this chain's gateway URL | `shots/11155111/l-docs.png` | — |
| (m) | Disposition: one issue per row whose expected state did not match | with nothing open, the dated signoff line under `MILESTONE.md` § Phases 4 in Denizen's own words | — | — |

## Base Sepolia — 84532

URL `https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.84532.w3link.io/` · header reads `base sepolia` ·
explorer `https://sepolia.basescan.org/tx/<hash>` · about **0.2 s** a block, so row (i)'s 60 s delay is
about **three hundred** blocks.

| # | action | expected state | screenshot | hash |
|:--|:--|:--|:--|:--|
| probe | On the landing, in DevTools: `window.top === window`, `typeof window.ethereum`, `location.origin` | `true`, `object`, the four-label `https:` origin above | `shots/84532/probe.png` | — |
| (a) | Open the gateway URL | the landing, `RAKE` in the title, `base sepolia` in the header, the featured widget reading the DNZN table through the wallet | `shots/84532/a-landing.png` | — |
| (b) | Press connect; approve the account in MetaMask | MetaMask asks for the account; the header shows the UAT wallet's short address. On another chain, the page's own switch control moves it and the `chainChanged` reload is expected | `shots/84532/b-header.png` | — |
| (c) | Paste `count.js`, then open `#/distros/0x71a4221974Fc2E95081AE513248918dF27CF7a4A` | description `DNZN // FUND DISTRIBUTION`, the three-row table, the owner bar reading as the owner, `funds`/`changes`/`activity` painted, `changes` carrying `Created` and the `setDescription` queued/applied pair, `activity` the `create` deposit. The console object is the **first-load** figure | `shots/84532/c-distro.png`, `shots/84532/c-console-first.png` | — |
| (d) | Reload on the landing, paste `count.js` again, open the same route | the same sections; the console object is the **second-load** figure, `firstLoad: false` | `shots/84532/d-console-second.png` | — |
| (e) | If a section reads `history before block N not loaded · load older`, press it once | `N` moves down or the line goes, and `window.__uat.eth_getLogs` rises — record the delta. No line shown: record `not shown — the scan reached the factory block within budget` | `shots/84532/e-older.png` | — |
| (f) | `#/create`: owner the UAT wallet, delay `60`, three rows summing to 100% — the UAT wallet, the engineer's wallet, `<receiver>`, ascending by address | the editor accepts the table, `create` lands, the page routes to the new address | `shots/84532/f-created.png` | `create` … |
| (g) | Send `0.003` ETH to the new address from MetaMask as a plain transfer, then press `distribute` | `activity` gains an `in` row and funds reads `waiting to distribute` with the amount; after `distribute`, two rows paid and the receiver's share escrowed — an `escrowed` row in `activity` and a `held in escrow` row in funds | `shots/84532/g-payin.png`, `shots/84532/g-distributed.png` | pay-in … · `distribute` … |
| (h) | `cast send <receiver> "setAccepting(bool)" true` from any key, then press `release` on the escrow row | the escrow row goes, `activity` gains a `released` row | `shots/84532/h-released.png` | `setAccepting` … · `release` … |
| (i) | Open `Queue a change`, queue a table change moving 1% between the two EOA rows as the owner; wait past the eta; press `apply`. Then queue a `setDescription` and press `cancel` on it | `changes` gains a `queued` row with an eta 60 s out and the apply control reads `anyone can apply once the delay passes`; after `apply`, `changes` gains `applied` and the table shows the new split; after `cancel`, `changes` gains `cancelled` | `shots/84532/i-pending.png`, `shots/84532/i-applied.png`, `shots/84532/i-cancelled.png` | `propose` … · `applyQueued` … · `propose` … · `cancel` … |
| (j) | `#/create` with the owner field set to the Ops vault: screenshot the owner note, then a two-row table (the UAT wallet, the engineer's wallet), delay `3600`. After `create`, press one drawer write | the owner note reads `not the connected wallet — a contract — it will have to propose and cancel through its own calls` and step 2 proceeds with **no** acknowledgement — [#172](https://github.com/dnznlabs/rake/issues/172) requires one only for a never-used address, so `probeOwner` gives a contract no class (`app/src/index.html:1482`) and the box is drawn only for a classed reading (`:1742`); the new page's owner bar reads `you are a signer on <vault>, which owns this distribution — every change below is calldata to submit through it`; the drawer's writes read `copy calldata for your vault`, and pressing one gives the clipboard or the textarea fallback with the bytes, no transaction | `shots/84532/j-guard.png`, `shots/84532/j-ownerbar.png`, `shots/84532/j-calldata.png` | `create` … |
| (k) | Not run on this chain | the host page is Sepolia's by design (TASK.md step 3 (k)), so this row is Sepolia-only and carries no reading here | — | — |
| (l) | Open `#/docs`, then `#/docs#widget` | fourteen sections in the rail, Disclaimer first; the widget section carries the snippet with this chain's gateway URL | `shots/84532/l-docs.png` | — |
| (m) | Disposition: one issue per row whose expected state did not match | with nothing open, the dated signoff line under `MILESTONE.md` § Phases 4 in Denizen's own words | — | — |
