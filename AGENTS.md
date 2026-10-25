# <PROJECT NAME>

<!-- Project-specific only. Org-wide rules belong in ../shared/ORG.md. -->

> `../shared` is an optional sibling checkout. Without it, only this file applies.

## Overview

## Repo Structure

## Commands

## Conventions

## Gotchas

<!-- fragment: forge-anvil -->
## Contracts and the dev chain

- `src/` contracts, `test/*.t.sol` their tests, `scripts/forge/` forge scripts (`script` in `foundry.toml`).
- `src/Distribution.sol` holds both contracts: `Distribution`, the primitive, and `DistributionFactory`,
  which deploys the implementation in its constructor and creates PUSH0 clones through CREATE2. The ABI
  is fixed by `docs/ROADMAP.md` decisions 3 and 9; a rename is a roadmap change, not an edit.
- `mk/*.mk` hold the make targets, included in name order; `procs/*.yml` the `make serve` processes,
  merged in name order. `build`, `test`, `fmt`, `clean` and `deploy` are double-colon targets, so
  extend one by adding a recipe in a new numbered file rather than editing an existing one.
- `make serve` starts anvil and runs `make deploy`: every `scripts/forge/Deploy*.s.sol`, in name order.
- Addresses are read from `broadcast/*/<chain>/run-latest.json`, never hard-coded. `make addresses`
  prints them and flags any with no code on the chain.
- `make addresses` lists `App` and `DistributionFactory`. The implementation is created inside the
  factory's constructor and is not a `CREATE` transaction in the broadcast log; read it with
  `cast call <factory> "implementation()(address)"`. The factory itself is placed by plain CREATE from
  the deployer's nonce, so the factory, the implementation and every `predict()` move together with
  that sender's nonce history — which is why a second `make deploy` on one chain would move the
  featured address while the first distribution still holds the ETH (`make deploy` now refuses
  instead, [#35](https://github.com/dnznlabs/rake/issues/35)), and why a real deployment needs a
  deterministic deployer rather than "whatever nonce this key is on".
- `scripts/forge/Seed.s.sol` creates the *featured* distribution every dev chain carries: a two-row
  table, a 1 ETH deposit and one queued change. It is not a `Deploy*.s.sol` — that loop runs with no
  environment, and the seed needs `FACTORY`. `mk/15-seed.mk` runs it between the deploy and the dapp
  build and owns `FEATURED_SALT`, whose top 20 bytes are `SENDER` as decision 10 requires. The salt is
  the only build token; the address is `predict(salt)`, which the page reads at boot, so the same salt
  gives the same address on every chain while the table differs by `block.chainid`. A salt that already
  has code is left alone rather than re-created (#22).
- `lib/` are submodules pinned to a tag. `forge install` would move them. A fresh `git worktree add`
  checks out without them, so the first `forge` command dies on `forge-std/Script.sol`: run
  `git submodule update --init --recursive` in the worktree first (#41).
- The toolchain is pinned in `devbox.json`; run forge through devbox. `forge build` must print no
  `warning[` and no `Warning (` line, and lint findings differ across foundry versions.
- `.gas-snapshot` is tracked and CI runs `forge snapshot --check` with no tolerance. Regenerate with
  `devbox run -- forge snapshot` after any change to `src/` or `test/`, through devbox only — the
  host's forge gives different numbers. To look without writing, `--diff` or `--snap /tmp/x`.
- `forge script` prints `Warning: Detected artifacts built from source files that no longer exist`
  when `out/` still holds artifacts for a deleted source (t02 handoff, after `Counter` went). It is
  `Warning:`, not solc's `Warning (` or lint's `warning[`, so neither CI grep sees it, and it clears
  with one `forge build --force`. Not a build warning; do not widen the CI assertion for it.
- Run `forge build --force` immediately before any test count or `forge snapshot --check`, and never
  script `forge lint` ahead of either. After `forge lint` compiles an edited file, the cache records it
  as built without writing its artifact, and the next `forge test`/`forge snapshot` silently drops that
  file's whole suite — `--check` then exits 0 on code it never ran (t03 handoff: 23 tests counted of
  36). CI is unaffected because it builds from a clean checkout.

<!-- fragment: dapp -->
## The dapp

- `app/src/index.html` is the dapp: no dependencies, no network but the wallet's EIP-1193 provider.
  The build inlines `eth.js` (keccak and the ABI subset), `model.js`, `theme.css` and `layout.html`
  into it.
- `app/src/model.js` is everything that needs no DOM and no provider: `pct`, `countdown`,
  `decodePending`, `supersededBy`, `salt` and the `snapshot()` type string `SNAPSHOT_T`. It is tested
  under node in `test/model.test.mjs` and inlined unchanged, so it reads an ambient `Eth` rather than
  importing one — the build inlines `eth.js` first, and the test puts `Eth` on `globalThis`. A helper
  that needs either the DOM or the chain belongs in `index.html`, not here.
- Besides a contract's address, `app/build.mjs` substitutes `__<NAME>_BLOCK__` with the block that
  contract was created in, read from the broadcast log's receipts. A log scan needs a `fromBlock`, and
  genesis is not one on a chain with a history: `__DISTRIBUTIONFACTORY_BLOCK__` is where the dapp's
  `Created` scan starts.
- `theme.css` and `layout.html` are the whole look. The script styles nothing: it emits classes and
  looks up ids, and state is a class (`warn`, `bad`, `err`, `on`), never an inline style. The one
  colour outside `theme.css` is the favicon's: it is a `data:` URI in `<head>`, with no page to
  inherit `currentColor` from, so it carries the accent frozen as a hex. Move the accent's hue and
  move that hex — `theme.css` names the coupling where the hue is set.
- `app/build.mjs` inlines `/*@inline file@*/`, substitutes every `__NAME__` token, strips the
  `/*DEV*/` fences unless `--dev`, minifies, and writes `app/dist/` (gitignored). It refuses to emit a
  bundle with an unresolved token, comments included. A deployed contract's token is its name,
  uppercased, between double underscores. The minifier drops `/* */` blocks and `//` lines, so a
  comment in any of the four inlined files costs the bundle nothing — but it does not know
  `<!-- -->`, which would ship. There is no HTML comment in `app/src` for that reason.
- `make dapp` is the dev build `make serve` hosts on :3000; `?rpc=<url>&from=<address>` reads and
  sends without a wallet. `make dapp-nodev` is the bundle that ships.
- Every `<script>` stays inline and attribute-free: `src`, `type="module"`, `defer` and `async` are
  refused by the build (`app/inline-scripts.mjs`), because contract hosting breaks on them silently.
- `tools/abi-vectors.sh` writes `test/fixtures/abi/` from `cast`, which is the oracle `test/abi.test.mjs`
  asserts `eth.js` against — an encoder compared with itself proves nothing. Regenerate with
  `devbox run -- tools/abi-vectors.sh` and commit what it writes; never hand-edit a `.hex` file or
  `selectors.txt`. The script is idempotent, so a second run leaves the tree clean, and CI never runs
  cast through node.
- Every write goes through `tx(to, sig, args, {value, label})`: an `eth_call` preflight on exactly the
  transaction about to be sent, then `eth_sendTransaction`, then `waitReceipt`, then the receipt's
  `status`. A revert is therefore a sentence before anything is paid for, and `Model.revertMessage`
  turns the bytes into it — the eight custom errors by selector, a bare 32-byte word as `retry failed`
  (that is the `false` a token returned, bubbled with no selector in front of it), no bytes as
  `reverted`. The bytes themselves sit at `error.data` for the dev `rpcProvider`, which throws the
  JSON-RPC error object, and at `error.data.data` for a MetaMask-class wallet, so both are read.
  `create` is the one write with no preflight: a second `create` on a used salt burns the whole gas
  limit before `DeploymentFailed`, so the page reads `eth_getCode` on the predicted address and
  refuses instead. Every countdown, and the gate on `apply`, measures against the chain's latest block
  timestamp rather than the browser's clock: `applyQueued` compares `block.timestamp`, and on a dev
  chain that has been moved forward the two are days apart.
- `#/docs#widget` builds its snippets from the page itself: `src` is `widget.js` resolved against the
  page's own URL (or `web3://<App>:<chain>/widget.js` when it has none), `data-rake` the featured
  distribution once `load()` has read it, and `data-rpc` from `PUBLIC_RPC` — public endpoints chosen
  only so the example works when pasted, since the embedding developer owns that choice. `__APP__` is
  substituted like any contract token.
- `make fixtures` adds the two distributions the write screens need and `make deploy` does not: an
  *escrow demo* at salt 2, holding half of 1 ETH and half of 100 of a token that reports failure, both
  escrowed against a receiver that refuses ETH until told not to; and a *vault demo* at salt 3, owned
  by a `MockVault` that answers `isOwner` for anvil account 3. It is a hand-run step after
  `make deploy` and never part of it, and it is idempotent: both salts are read with `eth_getCode`
  first, so a second run broadcasts nothing.
- `#/docs` is the long page, and it matches by prefix so it paints before the wallet checks; the rail's
  links are `#/docs#<section>` and `docScroll` reaches `id="s-<section>"` once `docs()` has painted.
  It is written for the owner of a distribution (ROADMAP decision 17), not for a developer: the
  contract's surface is `docs/REFERENCE.md`, which the page's last section links. The tables there are
  data — `test/docs.test.mjs` fails when the struct block and `src/Distribution.sol` disagree by one
  character, or when a function the selector fixture names is missing from the function table, and
  M02 criterion 6's script diffs the three `Distribution` tables against `forge inspect`. A claim about
  contract behaviour on the page is checked against `src/` before it ships; the landing CTA depends
  on the `widget` section id.
- `app/src/widget.js` is a **second bundle, not part of the dapp**: one IIFE that `App` serves as a
  classic script, with its own minimal reader for `snapshot()`'s return and none of `eth.js`,
  `model.js` or `theme.css` inlined — it needs no keccak (both selectors are literals a test pins
  against `selectors.txt`), and it inherits the host page's font and ink, injecting one
  `<style id="rk-css">` guarded by that id. `app/build.mjs` runs it through the same minifier, never
  gzips it, prints `widget: raw N bytes · budget 10240 · N left`, and **exits 1 above 10,240 bytes
  before writing any artifact**, so the budget is a gate on every `make deploy` rather than a figure in
  a report. Every colour literal in it must also occur in `theme.css` and it carries no `style=`
  attribute; `test/widget.test.mjs` pins both, and pins the decoder against
  `test/fixtures/abi/snapshot.return.hex` — cast's fixture, the same oracle `test/abi.test.mjs` holds
  `eth.js` to, so the two decoders are never compared with each other.
- `app/src/host.html` → `app/dist/host.html` is a **dev foil, not a page of the dapp**: four hosts in
  their own `<style>` block (never `theme.css`, whose job here is to be absent) showing the widget full,
  compact, failed and loading. `make serve` serves it beside the dapp — at
  **`/host?rpc=<url>`**, without the extension: `serve`'s clean-URL redirect answers `/host.html?rpc=…`
  with a bare `Location: /host` and the query string is lost, so the page falls back to its default
  endpoint and renders nothing. `Chunks.s.sol` never reads it and nothing uploads it.
- The browser check every `app/` task ends with runs here, driven by `playwright-core` from a directory
  outside the repo (there is no playwright in this project's `node_modules`). The cached Playwright
  chromium (`~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`) fails on `libnspr4.so` and
  two dozen other missing host libraries; the nix chromium (`ls -d /nix/store/*-chromium-1*/bin`, not the
  `-unwrapped` or `-sandbox` one) launches as `executablePath`. Chromium also refuses a handful of ports outright — port 9 answers `ERR_UNSAFE_PORT`
  rather than connecting — which `host.html` uses deliberately for its failure mount.
- The build minifier strips leading whitespace on every line, template literals included.
- gzip output depends on the node build's zlib. Build through devbox when the bytes matter.
- Node tests are `test/*.test.mjs`.

<!-- fragment: onchain-dapp -->
## The contract-hosted dapp

- `src/App.sol` hosts the dapp: ERC-8244 `html()` returns the document, ERC-5219 `request()` serves
  it to web3:// gateways. The bytes are SSTORE2 chunks uploaded by `scripts/forge/Chunks.s.sol`.
- **Two documents, one address.** `html()` and `request([])`/`request(["index.html"])` are the dapp;
  `request(["widget.js"])` is the widget, a second pointer list (`widgetChunks`) answered `200` with
  `application/javascript; charset=utf-8`. The widget is stored **raw and never gzipped**: a
  `<script src="widget.js">` fetched through a gateway has to be plain JavaScript, and the gzip path is
  an HTML document that inflates itself, which a script tag cannot run. `lock()` freezes both lists and
  checks every pointer in both for code; it requires the dapp (`EmptyDocument`) and does *not* require
  a widget, so an `App` carrying the dapp alone is a complete site and answers 404 to `widget.js`.
- `make deploy` deploys `App` (`scripts/forge/DeployApp.s.sol`), builds the non-dev bundle, uploads
  it, then rebuilds the dev bundle for :3000.
- `Chunks.s.sol` uploads both documents in one broadcast through one cut loop: the bundle into
  `addChunk`/`setChunks`, then `app/dist/widget.js` into `addWidgetChunk`/`setWidgetChunks`, logging
  `widget chunk <i> <ptr>` and `widget bytes`. The widget is one chunk — `MAX_CHUNK` is 24,000 and the
  budget is 10,240.
- Any change under `app/` makes the deployed document stale until `make dapp-nodev && make chunks`.
- The gzip bootstrap in `App.html()` is load-bearing byte for byte and `test_gzipBootstrap` pins it.
  To allow a `<script>` with attributes, change the bootstrap first and re-measure in a real wallet.
- `make chain-doc` writes the document the chain returns to `app/chain/index.html` and hashes it.
  `cast call … "html()(string)"` does not produce it: cast escapes the string. The output sits beside
  `app/dist/`, not under forge's `out/`: `forge build --force` and `forge clean` empty `out/`, so a
  build running beside a check would delete the very document being checked.
- On a gzipped `App` that document is the bootstrap wrapper, not the page, so its `sha256` never equals
  `app/dist/index.html`'s. `chain-doc` therefore also inflates the `atob` payload to
  `app/chain/index.inflated.html` and prints `payload bytes`, `inflated bytes` and `inflated sha256`;
  `inflated sha256` is the one to compare. An uncompressed `App` prints neither, since there is nothing
  to inflate.
- Take that comparison **after `make dapp-nodev`**: `make deploy` rebuilds the dev bundle last
  (`mk/30-onchain.mk`), so `app/dist/index.html` straight after a deploy is the dev build and the two
  hashes differ for that reason alone.
- `make chain-doc` also reads `request(["widget.js"])` and prints three more lines — `widget status`,
  `widget bytes`, `widget sha256` — writing the served bytes to `app/chain/widget.js`. Nothing inflates
  there, so `widget sha256` compares straight with `sha256sum app/dist/widget.js`, and that comparison
  holds in a dev build too: `widget.js` has no `/*DEV*/` fence and no address token, so the dev and
  non-dev builds produce the same bytes. `widget status 404` prints alone, so an `App` with no widget is
  reported rather than crashed.
- `lock()` is one-way.

<!-- fragment: design-base -->
## Design: DNZN Base v1

- `app/src/theme.css` and `app/src/layout.html` are DNZN Base v1. The system and its rules are in the
  `design-base` repo: `v1/README.md` and `v1/GUIDELINES.md`. Read both before changing either file.
- A project supplies four slots and inherits everything else unchanged: the mark and wordmark (the
  `<svg>` and name in the nav lockup, and `<title>`), the accent hue (the `250` in both `--accent`
  declarations), the signature data element (`.sig`), and the footer fact (the right-hand footer span).
- The accent appears on the signature element, the focus ring and link hover, and nowhere else.
  Amber means pending, red means error; neither is restyled.
- No webfonts, CDN scripts, icon fonts or remote images. No cards, shadows, gradients or emoji.
- A pattern the base is missing is designed to its rules here and proposed to `design-base` for the
  next version.
