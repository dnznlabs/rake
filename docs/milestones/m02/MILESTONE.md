# M02 — Dapp and widget on anvil

Status: in progress — t01, t02, t03 done, t04 assigned, Phase 5 added · updated 2026-10-13

The design prototype (`brainstorming/design/rake-dapp.html`, `rake-widget.html`) rebuilt as the real
dapp on DNZN Base v1: reading `snapshot()` from the chain, sending the six writes through the wallet,
hosted by `App` and served end to end from `make serve`, with the widget as a second on-chain
document. It comes second because every view renders the `snapshot()` struct M01 fixed, and before
M03 because the review in M03 covers `App` and the chunk upload as well as `Distribution` — reviewing
before the dapp exists means reviewing twice. Everything here stays on anvil; a wallet browser and a
`web3://` gateway are M04's acceptance, not this milestone's.

It ends on Denizen, not on a check: once the five tasks are merged, he drives the anvil deployment
himself and irons out the experience until he is done finding things (Phase 5, criterion 10, roadmap
decision 14). M03's review starts after that signoff, so it reads what the tweaks produced rather
than what they replaced.

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
2. **Seeded chain.** `make serve` (or, without a TTY,
   `ANVIL_PORT=8545 APP_PORT=3000 process-compose -f procs/10-chain.yml up -t=false` — corrected
   2026-10-11 for [#34](https://github.com/dnznlabs/rake/issues/34): the two ports are exported by
   `mk/10-forge.mk` and `mk/20-dapp.mk`, so only `make` supplies them, and the bare command fails on
   `--port`; the corrected form verified on `:8599`/`:3099` the same day) leaves a *featured*
   distribution at `cast call <factory> "predict(bytes32)(address)" $FEATURED_SALT`,
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
6. **Docs page.** `#/docs` is written for the owner of a distribution (decision 17): what it is, why
   it exists, how it works, creating one, paying in, paying out, changing it, ownership, the widget
   snippet, limits and how to report, and a closing section that sends developers to the repo and to
   `docs/REFERENCE.md`, with the chain table reading "not deployed". Every claim it makes about
   contract behaviour is read against `src/`. **The text m02-t04 ships is a draft**: Denizen writes
   the final page himself in Phase 5, and criterion 10's signoff is not dated while the draft stands. `docs/REFERENCE.md` carries the `Snapshot` struct
   verbatim and a function table whose names are exactly the external functions of
   `forge inspect Distribution abi` (decision 9 names, so `applyQueued` and `beneficiaries`), plus
   events and errors; `test/docs.test.mjs` pins the struct and the ABI diff runs against the file.
   Diagrams are the prototype's inline SVG, re-inked to theme tokens.
7. **Widget.** Per decision 12: `App.request(["widget.js"])` returns
   `200`, `Content-Type: application/javascript`, and a body byte-equal to `app/dist/widget.js`;
   `request([])` still returns the dapp; `forge test` covers both and the `lock()` paths. A host page
   served under `make serve` embeds `<div data-rake=… data-chain=… data-rpc=…>` and renders the featured
   distribution in full and compact variants with loading, failure (an address with no code) and
   pending states. `wc -c app/dist/widget.js` is at most 10,240 bytes (design budget), recorded.
8. **End to end from the chain.** After `make deploy`, `make chain-doc` prints a sha256 equal to
   `sha256sum app/dist/index.html` from `make dapp-nodev`; `chunkCount()` and `html()` bytes are
   recorded in the handoff. *Corrected 2026-10-11:* for a gzipped document `html()` returns the
   bootstrap wrapper, so the hash `make chain-doc` prints today is the wrapper's (31,393 bytes,
   `5fd594d4…` on one chunk), not the page's (`c4de9156…`); the equality holds for the wrapper's
   base64 payload inflated — measured byte-equal the same day. The criterion is met when the
   **inflated** document's sha256 equals `sha256sum app/dist/index.html`, and `make dapp-nodev` is run
   *after* `make deploy`, which rebuilds the dev bundle last. `m02-t04` teaches `tools/chain-doc.mjs`
   to print that hash. Measured 2026-10-11 as the starting point: prototype 75,876 bytes raw,
   74,252 stripped, 20,680 gzipped; the state-collection dapp ships at 56,773 raw / 19,672 gzipped in
   one chunk. The real dapp is expected to need two chunks at most — an estimate, re-measured here.
9. **Clean.** `forge build --force` prints no `Warning (` or `warning[`; `forge lint` and `make fmt`
   silent; `forge snapshot --check` exit 0; `git status --porcelain` empty after `forge build --force`,
   `forge test`, `forge snapshot`, `make deploy` and the 31338 deploy of criterion 5;
   `grep -rnE '\btip\b|govUrl|about:|ownerKind' app/src` prints nothing (decisions 1, 2, 7).
10. **Signoff.** Phase 5 is closed by Denizen's written signoff, dated, recorded in this file. **This is
    the one criterion in M02 that is not a measurement**, and it is deliberate: the phase it closes is a
    subjective pass over the experience, so no command can settle it. The check is that the signoff
    line exists and is dated — not that anyone agrees with it. One thing it does gate: the `#/docs`
    text is his, not the draft m02-t04 shipped (criterion 6, roadmap § Order), and the line is not
    dated until he has written it. Criteria 8 and 9 are re-run against the code he signs off, and the
    result is recorded under this line; any other criterion whose inputs
    Phase 5 touched is re-run with them (see Phase 5 § Consequences). Same rule as `state-collection`
    M1 AC 10, decided there on 2026-09-17 over a proposal to close on an empty task table.

    _Not yet signed off._

## Out of scope

- Name resolution *exercised*. The ENS/WNS/GNS code lands in `m02-t03`, ported from state-collection's
  reference implementation, but anvil has no registries and the dapp has no network but the wallet's,
  so it is first exercised on Sepolia in **M04**. Order of precedence is decision 13.
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
- Any change to `src/Distribution.sol` **by tasks t01–t05**. The struct is frozen the day this
  milestone starts. Phase 5 is the exception, priced per item: see its § Consequences.
- Mirroring at dnzn.dev or IPFS, and a published widget URL — **M05**.

## Human-in-the-loop requirements

Three rulings, each a `decision` issue in the five-line form. ~~None gating `m02-t01`.~~ All three
ruled by Denizen on 2026-10-11 as the recommended option, before t01 started; recorded as
`ROADMAP.md` decisions 11–13:

- [#26](https://github.com/dnznlabs/rake/issues/26) — `distribute` shown to everyone, under the balance,
  labelled (decision 11). `m02-t03`.
- [#27](https://github.com/dnznlabs/rake/issues/27) — widget served by `App` as `widget.js` (decision 12).
  `m02-t05`.
- [#28](https://github.com/dnznlabs/rake/issues/28) — ENS → WNS → GNS, the state-collection ruling
  (decision 13). `m02-t03`.

Merging five docs PRs and five code PRs. No credential, funds or external action: everything is anvil.

**All of Phase 5.** He drives it, executes it in Claude Code and signs it off (criterion 10); review
here is the only agent participation unless he hands a specific item over. A wallet browser against
anvil needs the same three MetaMask settings `state-collection` needed — custom network
`http://127.0.0.1:8545` chain ID `31337`, anvil key 0 imported, "Allow access to file URLs" on if he
opens the chain's document over `file://` — each of which presents as "No wallet found." when wrong.

## Phases

In order; each phase's criteria are the next one's preconditions. One task per phase except Phase 4,
whose two tasks are independent of each other. Phase 5 runs last and is open-ended — it ends on
Denizen's signoff (criterion 10), not on a check.

### Phase 1 — Data layer

The dapp can encode every call and decode every return the contract has, and the dev chain has
something worth rendering.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m02-t01](tasks/m02-t01/TASK.md) | General ABI codec in `eth.js` with cast-generated fixtures; the seed that creates the featured distribution on every dev chain with a chain-dependent table, a deposit and one pending change; `FEATURED_SALT` as a build token; criteria 1, 2 and the deploy half of 5 | done — [#33](https://github.com/dnznlabs/rake/pull/33) merged 2026-10-11 at `1a642f4`; carried [#34](https://github.com/dnznlabs/rake/issues/34), [#35](https://github.com/dnznlabs/rake/issues/35) |

### Phase 2 — Reading

Every screen that reads: landing, list, detail, pending decode, histories, drift.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m02-t02](tasks/m02-t02/TASK.md) | The prototype's shell on the scaffold's provider code, rulings 1, 2, 7, 8 and 9 applied; `#/`, `#/distros`, `#/distros/<addr>`; pending actions decoded; `Queued`/`Applied`/`Cancelled` and `Received`/`Distributed`/`Escrowed`/`Released` histories loaded after the snapshot; criteria 3 and 5 | done — [#40](https://github.com/dnznlabs/rake/pull/40) merged 2026-10-11 at `5caf1f3`, approved at `3e846f5` and re-approved at `d456312` after Denizen's six review items; carried [#41](https://github.com/dnznlabs/rake/issues/41), [#42](https://github.com/dnznlabs/rake/issues/42), [#43](https://github.com/dnznlabs/rake/issues/43), [#50](https://github.com/dnznlabs/rake/issues/50), [design-base#2](https://github.com/dnznlabs/design-base/issues/2), [state-collection#69](https://github.com/dnznlabs/state-collection/issues/69) |

### Phase 3 — Writing

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m02-t03](tasks/m02-t03/TASK.md) | Create flow (salt, predict, `eth_getCode` guard), propose panel for the four setters and renounce, `applyQueued`, `cancel`, `distribute` (per #26), `release` with the `false`-word rendering, copy-calldata for a vault signer, the payer-guidance line (#18), name resolution ported (per #28); criterion 4 | done — [#52](https://github.com/dnznlabs/rake/pull/52) merged 2026-10-11 at `66c77e5`, approved at `9173145`, re-approved at `2ebd2fd`; carried [#53](https://github.com/dnznlabs/rake/issues/53), [#54](https://github.com/dnznlabs/rake/issues/54), [#55](https://github.com/dnznlabs/rake/issues/55) |

### Phase 4 — Docs and the widget

Independent of each other; the widget waits on #27, the docs page does not.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m02-t04](tasks/m02-t04/TASK.md) | `#/docs` from the prototype's docs segment against the real ABI; criterion 6; criterion 8 measured and recorded, with the second chunk served for the first time (#53 decided in the plan) | assigned — plan merged [#56](https://github.com/dnznlabs/rake/pull/56) 2026-10-13 at `98f1b89`; task issue [#58](https://github.com/dnznlabs/rake/issues/58), no gate; the report line is [#57](https://github.com/dnznlabs/rake/issues/57), default option 1 |
| m02-t05 | `App` serves `widget.js` as a second chunk set (per #27), `Chunks.s.sol` uploads both, the widget reads `snapshot()` through `data-rpc` or the host's `window.ethereum`, host page under `make serve`; criterion 7; criterion 9 | not started |

### Phase 5 — dapp and widget refinement

Last phase of M02, after t05 merges. Denizen drives the anvil deployment, finds what is wrong with the
experience — dapp, widget, docs page — and irons it out. A loop, not a fixed list: it runs as long as
he is still finding things, and his signoff closes it (criterion 10). Added 2026-10-11 at his request,
after `state-collection` M1 Phase 5 showed the shape works; roadmap decision 14 records why it sits
here and not in M03 or before M04.

**He executes this phase himself**, in Claude Code, outside the agent loop, opening PRs for review
here. Elanik is not in this phase by default — anything Denizen does want handed off gets filed as a
row below and assigned explicitly. Lakos reviews each PR against the criteria it touches and keeps the
table below current.

Scope is decided per item, not fenced in advance: **anything is fair game**, `app/` or `src/`, and
what a change is allowed to touch is settled when it is filed. What that costs is under
"Consequences" below — it is a real cost, not a reason to narrow the rule.

One row is fixed in advance: the docs page. m02-t04 shipped `#/docs` as a draft (decision 17), and
Denizen writes the final text himself before the signoff. The checks on the page stay — the
`docs/REFERENCE.md` struct and tables, the stipend-and-cold lines, criterion 9's greps, the `widget`
section id the landing's CTA depends on — and run against what he writes.

| Task | Goal | Status |
|:-----|:-----|:-------|
| docs text | `#/docs` rewritten by Denizen; criterion 6's checks re-run; criterion 8 re-chunked | not started — gates the signoff |

#### Consequences of "anything is fair game" at end of M02

Not objections. These are the bills that come due if a Phase 5 change reaches past `app/src`, and they
should be priced when the item is filed rather than discovered at review.

1. **Any change to `app/` invalidates criterion 8.** The chunks `App` serves are uploaded from the
   built bundle, so `html()` is stale the moment the dapp changes, and `widget.js` the moment the widget
   does. Re-chunking is `make deploy`; criterion 8's sha256 and byte counts are re-recorded, and
   criterion 7's size budget re-checked if the widget moved.
2. **A change under `src/` re-opens M01's evidence, and the amount depends on the file.**
   `forge snapshot --check` fails until the snapshot is regenerated — by design, that is the check
   working. A change to `App.sol` or `Chunks.s.sol` re-opens criteria 7 and 8 only. A change to
   `Distribution.sol` that leaves the `snapshot()` struct and the external ABI alone re-runs M01's suite
   and criterion 6's function table. **A change to the `snapshot()` struct is the sticky door from
   § One-way doors**: it re-opens the codec fixtures (criterion 1), every read (3, 5) and write (4),
   the docs struct (6) and the widget (7) — in effect t01 through t05 — and it is the one item that
   should be refused unless the struct is wrong, not merely inconvenient.
3. **A tweak that contradicts a ruling is a ruling first.** Decisions 1, 2, 6, 7, 9, 11, 12 and 13
   fix what the dapp shows and how; criterion 9's grep enforces three of them. A Phase 5 item that
   wants the opposite supersedes the decision in `ROADMAP.md` before the code lands, in the five-line
   form, so the record and the dapp never disagree.
4. **CI is the safety net, with one gap.** `.github/workflows/ci.yml` (read 2026-10-11 at `25baad7`)
   gates every PR on a warning-free, lint-free build, `make fmt`, `make test` — `forge test` plus
   `node --test` against the cast-generated fixtures — `forge snapshot --check` and a clean tree, so a
   Phase 5 PR cannot quietly break the contract or the codec no matter how wide its scope. What CI does
   **not** check is the chain document: nothing runs `make deploy` and `make chain-doc` against the
   build, so criterion 8 is re-run by hand at signoff (criterion 10), not caught per PR. That is why
   "anything is fair game" is affordable, and why consequence 1 is a manual step.
5. **M03, M04 and M05 wait.** The roadmap is strictly sequential and this phase is open-ended, so the
   security review starts when Denizen signs off and not before — and reads the code he signed off.
   That is the point of the placement, not a side effect.

## One-way doors

None that leaves anvil. One sticky door, the mirror of M01's: **starting `m02-t02` fixes the
`snapshot()` ABI for good.** Until then a struct change is a contract edit; after it, every struct
change is UI rework as well, and M03's review reads the pair. Phase 5 does not reopen that door: it
may touch `src/`, but a struct change there costs t01–t05 over again (Phase 5 § Consequences 2).
`App` stays unlockable throughout; nothing here calls `lock()`.
