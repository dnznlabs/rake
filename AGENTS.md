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
  `cast call <factory> "implementation()(address)"`.
- The placeholder page under `app/` reads the factory's `implementation()` until M02 replaces it.
- `lib/` are submodules pinned to a tag. `forge install` would move them.
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
