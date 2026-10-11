# M02 — Dapp and widget on anvil

Status: not started — plan proposed 2026-10-11, starts when M01 closes (#16 merged) · updated 2026-10-11

The design prototype (`brainstorming/design/rake-dapp.html`, `rake-widget.html`) rebuilt as the real
dapp on DNZN Base v1: reading `snapshot()` from the chain, sending the six writes through the wallet,
hosted by `App` and served end to end from `make serve`, with the widget as a second on-chain
document. It comes second because every view renders the `snapshot()` struct M01 fixed, and before
M03 because the review in M03 covers `App` and the chunk upload as well as `Distribution` — reviewing
before the dapp exists means reviewing twice. Everything here stays on anvil; a wallet browser and a
`web3://` gateway are M04's acceptance, not this milestone's.

## Acceptance criteria

Every command runs from the repo root through `devbox run --`; versions are the ones `devbox.json` pins
(forge `1.7.1-dev`, node from `devbox.lock`). Measured against `main` at `c292106` on 2026-10-11:
criteria 1–9 all fail today — `app/src/index.html` has no route but `#/` and `#/docs`, mentions neither
`distros` nor `snapshot`, and `app/src/eth.js` encodes static arguments only (its own comment). Re-run
rather than quote.

1. **Codec.** `node --test test/*.test.mjs` passes and includes `test/abi.test.mjs`, whose fixtures
   under `test/fixtures/abi/` are written by `tools/abi-vectors.sh` from `cast abi-encode` /
   `cast calldata` / `cast sig`, so they can be regenerated rather than trusted. The encodings of
   `create(address,uint32,string,(address,uint96,string,string)[],bytes32)`,
   `setBeneficiaries((address,uint96,string,string)[])`, `propose(bytes)`, `applyQueued(bytes,uint32)`,
   and the decode of a `snapshot()` return carrying two beneficiaries and one pending action, are
   byte-equal to cast's. Today: no such test, no such directory.
2. **Seeded chain.** `make serve` (or `process-compose -f procs/10-chain.yml up -t=false` without a
   TTY) leaves a *featured* distribution at `cast call <factory> "predict(bytes32)(address)" $FEATURED_SALT`,
   whose `snapshot()` shows a two-row table, a non-zero delay and exactly one pending action, with
   `cast balance` of it above zero. `FEATURED_SALT` is one build token, never an address: the dapp
   computes the address through `predict`.
3. **Reads.** With the dev build up (`make serve`, `http://localhost:3000/?rpc=…&from=…`):
   `#/` shows the featured distribution's bar, ledger, delay, owner and the pending change;
   `#/distros/<addr>` shows the same for any created distribution; `#/distros` lists `recent`
   (localStorage) and `mine` (`Created` logs filtered by owner, each confirmed against `snapshot().owner`).
   Every displayed value equals the matching field of `cast call <addr> "snapshot()"` and the pending
   block names the decoded setter (`setBeneficiaries` as a second bar, the other three as one line).
   A one-row table at 100% whose account answers `snapshot()` renders as "superseded by" (decision 6).
4. **Writes.** From the dev build, each of `create`, `propose` (all four setters and renounce),
   `applyQueued`, `cancel`, `distribute`, `release` lands a receipt with `status 1`, and the view after
   each equals `snapshot()` / `reserved` / `escrowed` from cast; the handoff lists the six transaction
   hashes. `create` shows the predicted address before sending, equal to `predict(salt)`, builds a
   sender-bound salt, and **refuses to send when `eth_getCode` of that address is non-empty**
   (demonstrated by a second create with the same salt: no transaction is sent — #22). A `release`
   whose token returns `false` renders as "retry failed", not raw data (#20). A connected wallet that
   is a signer of an owning vault (`isOwner(address)` true, probed soft) gets the owner view with the
   writes as copy-calldata (decision 7); the copied bytes decode with `cast calldata-decode`.
5. **Drift is shown, not hidden.** A second anvil (`--port 8546 --chain-id 31338`) deployed with
   `make deploy ANVIL_PORT=8546 CHAIN_ID=31338` puts the factory at the same address (verified
   2026-10-11: `0x5FbDB2315678afecb367f032d93F642f64180aa3` on both) and the seed creates the featured
   distribution at the same address with a **different** table. The dapp pointed at each chain shows
   that chain's table and names the chain; nothing presents the two as one distribution.
6. **Docs page.** `#/docs` carries the `Snapshot` struct verbatim, a function table whose names are
   exactly the external functions of `forge inspect Distribution abi` (decision 9 names, so
   `applyQueued` and `beneficiaries`), the four verbs, the timelock, push/escrow/release, deployment
   (chain table reading "not deployed"), the widget snippet, security (trust assumptions, how to
   report), source and lineage. Diagrams are the prototype's inline SVG, re-inked to theme tokens.
7. **Widget.** Decision #27 taken as (a) unless ruled otherwise: `App.request(["widget.js"])` returns
   `200`, `Content-Type: application/javascript`, and a body byte-equal to `app/dist/widget.js`;
   `request([])` still returns the dapp; `forge test` covers both and the `lock()` paths. A host page
   served under `make serve` embeds `<div data-rake=… data-chain=… data-rpc=…>` and renders the featured
   distribution in full and compact variants with loading, failure (an address with no code) and
   pending states. `wc -c app/dist/widget.js` is at most 10,240 bytes (design budget), recorded.
8. **End to end from the chain.** After `make deploy`, `make chain-doc` prints a sha256 equal to
   `sha256sum app/dist/index.html` from `make dapp-nodev`; `chunkCount()` and `html()` bytes are
   recorded in the handoff. Measured 2026-10-11 as the starting point: prototype 75,876 bytes raw,
   74,252 stripped, 20,680 gzipped; the state-collection dapp ships at 56,773 raw / 19,672 gzipped in
   one chunk. The real dapp is expected to need two chunks at most — an estimate, re-measured here.
9. **Clean.** `forge build --force` prints no `Warning (` or `warning[`; `forge lint` and `make fmt`
   silent; `forge snapshot --check` exit 0; `git status --porcelain` empty after `forge build --force`,
   `forge test`, `forge snapshot`, `make deploy` and the 31338 deploy of criterion 5;
   `grep -rnE '\btip\b|govUrl|about:|ownerKind' app/src` prints nothing (decisions 1, 2, 7).

## Out of scope

- Name resolution *exercised*. The ENS/WNS/GNS code lands in `m02-t03`, ported from state-collection's
  reference implementation, but anvil has no registries and the dapp has no network but the wallet's,
  so it is first exercised on Sepolia in **M04**. Order of precedence is decision #28.
- `paid to me` in the dashboard list. No event indexes beneficiaries, so it needs either a scan of
  every `Created` distribution's table (unbounded on mainnet) or an indexer, which overview § 2 goal 2
  rules out. v1 lists `recent` and `mine`; the gap is recorded for the overview, and a later milestone
  may add a `Created`-log scan behind an explicit "search the chain" action if Denizen wants it.
- Owner-kind submit routes (multisig custom action, Majeur proposal) — **M06**. v1 is copy-calldata.
- A browser-wallet acceptance by Denizen, the `web3://` gateway, and opening the chain's document over
  `file://` — **M04**. Here the document is proved byte-equal to the build; nothing more.
- `SECURITY.md`, the payer-guidance *disposition* (#18 — M02 writes the one line, M03 decides), the
  named `release` error (#20's second half), `PUSH_GAS`, a beneficiaries cap — **M03**.
- `App.lock()`; a branch protection rule — ruled out in `ROADMAP.md`.
- Any change to `src/Distribution.sol`. The struct is frozen the day this milestone starts.
- Mirroring at dnzn.dev or IPFS, and a published widget URL — **M05**.

## Human-in-the-loop requirements

Three rulings, each a `decision` issue in the five-line form, none gating `m02-t01`:

- [#26](https://github.com/dnznlabs/rake/issues/26) — show `distribute` to non-owners? Recommend yes,
  under the balance, labelled. Gates `m02-t03`.
- [#27](https://github.com/dnznlabs/rake/issues/27) — widget served by `App` as a second document, or
  off-chain only? Recommend `App`. Gates `m02-t05`.
- [#28](https://github.com/dnznlabs/rake/issues/28) — name display priority: the state-collection ruling
  (ENS, WNS, GNS) or the design handoff's (`.wei`, `.gwei`, `.eth`)? Recommend the existing ruling.
  Gates one line of `m02-t03`.

Merging five docs PRs and five code PRs. No credential, funds or external action: everything is anvil.

## Phases

In order; each phase's criteria are the next one's preconditions. One task per phase except the last,
whose two tasks are independent of each other.

### Phase 1 — Data layer

The dapp can encode every call and decode every return the contract has, and the dev chain has
something worth rendering.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m02-t01](tasks/m02-t01/TASK.md) | General ABI codec in `eth.js` with cast-generated fixtures; the seed that creates the featured distribution on every dev chain with a chain-dependent table, a deposit and one pending change; `FEATURED_SALT` as a build token; criteria 1, 2 and the deploy half of 5 | not started |

### Phase 2 — Reading

Every screen that reads: landing, list, detail, pending decode, histories, drift.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m02-t02](tasks/m02-t02/TASK.md) | The prototype's shell on the scaffold's provider code, rulings 1, 2, 7, 8 and 9 applied; `#/`, `#/distros`, `#/distros/<addr>`; pending actions decoded; `Queued`/`Applied`/`Cancelled` and `Received`/`Distributed`/`Escrowed`/`Released` histories loaded after the snapshot; criteria 3 and 5 | planned — plan written 2026-10-11 while t01 builds; issue opens when t01 merges |

### Phase 3 — Writing

| Task | Goal | Status |
|:-----|:-----|:-------|
| m02-t03 | Create flow (salt, predict, `eth_getCode` guard), propose panel for the four setters and renounce, `applyQueued`, `cancel`, `distribute` (per #26), `release` with the `false`-word rendering, copy-calldata for a vault signer, the payer-guidance line (#18), name resolution ported (per #28); criterion 4 | not started |

### Phase 4 — Docs and the widget

Independent of each other; the widget waits on #27, the docs page does not.

| Task | Goal | Status |
|:-----|:-----|:-------|
| m02-t04 | `#/docs` from the prototype's docs segment against the real ABI; criterion 6; criterion 8 measured and recorded | not started |
| m02-t05 | `App` serves `widget.js` as a second chunk set (per #27), `Chunks.s.sol` uploads both, the widget reads `snapshot()` through `data-rpc` or the host's `window.ethereum`, host page under `make serve`; criterion 7; criterion 9 | not started |

## One-way doors

None that leaves anvil. One sticky door, the mirror of M01's: **starting `m02-t02` fixes the
`snapshot()` ABI for good.** Until then a struct change is a contract edit; after it, every struct
change is UI rework as well, and M03's review reads the pair. `App` stays unlockable throughout;
nothing here calls `lock()`.
