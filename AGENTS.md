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
- `mk/*.mk` hold the make targets, included in name order; `procs/*.yml` the `make serve` processes,
  merged in name order. `build`, `test`, `fmt`, `clean` and `deploy` are double-colon targets, so
  extend one by adding a recipe in a new numbered file rather than editing an existing one.
- `make serve` starts anvil and runs `make deploy`: every `scripts/forge/Deploy*.s.sol`, in name order.
- Addresses are read from `broadcast/*/<chain>/run-latest.json`, never hard-coded. `make addresses`
  prints them and flags any with no code on the chain.
- `lib/` are submodules pinned to a tag. `forge install` would move them.
- The toolchain is pinned in `devbox.json`; run forge through devbox. `forge build` must print no
  `warning[` line, and lint findings differ across foundry versions.

<!-- fragment: dapp -->
## The dapp

- `app/src/index.html` is the dapp: no dependencies, no network but the wallet's EIP-1193 provider.
  The build inlines `eth.js` (keccak and the ABI subset), `theme.css` and `layout.html` into it.
- `theme.css` and `layout.html` are the whole look. The script styles nothing: it emits classes and
  looks up ids, and state is a class (`warn`, `bad`, `err`, `on`), never an inline style.
- `app/build.mjs` inlines `/*@inline file@*/`, substitutes every `__NAME__` token, strips the
  `/*DEV*/` fences unless `--dev`, minifies, and writes `app/dist/` (gitignored). It refuses to emit a
  bundle with an unresolved token, comments included. A deployed contract's token is its name,
  uppercased, between double underscores.
- `make dapp` is the dev build `make serve` hosts on :3000; `?rpc=<url>&from=<address>` reads and
  sends without a wallet. `make dapp-nodev` is the bundle that ships.
- Every `<script>` stays inline and attribute-free: `src`, `type="module"`, `defer` and `async` are
  refused by the build (`app/inline-scripts.mjs`), because contract hosting breaks on them silently.
- The build minifier strips leading whitespace on every line, template literals included.
- gzip output depends on the node build's zlib. Build through devbox when the bytes matter.
- Node tests are `test/*.test.mjs`.

<!-- fragment: onchain-dapp -->
## The contract-hosted dapp

- `src/App.sol` hosts the dapp: ERC-8244 `html()` returns the document, ERC-5219 `request()` serves
  it to web3:// gateways. The bytes are SSTORE2 chunks uploaded by `scripts/forge/Chunks.s.sol`.
- `make deploy` deploys `App` (`scripts/forge/DeployApp.s.sol`), builds the non-dev bundle, uploads
  it, then rebuilds the dev bundle for :3000.
- Any change under `app/` makes the deployed document stale until `make dapp-nodev && make chunks`.
- The gzip bootstrap in `App.html()` is load-bearing byte for byte and `test_gzipBootstrap` pins it.
  To allow a `<script>` with attributes, change the bootstrap first and re-measure in a real wallet.
- `make chain-doc` writes the document the chain returns to `out/chain/index.html` and hashes it.
  `cast call … "html()(string)"` does not produce it: cast escapes the string.
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
