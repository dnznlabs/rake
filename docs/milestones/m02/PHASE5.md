# M02 Phase 5 — handoff for Denizen's session

Written by the architect 2026-10-25, on `main` at `b1efe27`. For the Claude Code session Denizen
drives himself; it assumes the reader has the repo and nothing else. Where this file and
`MILESTONE.md` disagree, `MILESTONE.md` wins — this is the executable summary, not the record.

## What this phase is

A free-form pass over the dapp, the widget and the docs page on anvil, driven by Denizen, until he is
done finding things. It is the last phase of M02 and the only one with no checkable criterion: it
closes on a dated signoff line in `MILESTONE.md` (criterion 10), not on a command. M03's security
review starts after that line and reads what this phase produced, so a change made here costs one
review; the same change made after M03 costs two. Roadmap decision 14 is why it sits here.

Everything is anvil. No wallet on a public network, no gateway, no deploy: those are M04.

## Where things stand

All six build tasks are merged. The dapp reads `snapshot()`, sends the six writes, shows drift
between two chains, has a docs page and a widget served from `App` as a second document. The
close-out (m02-t06, #71) just fixed the four things most likely to be met first: `make deploy` refuses
a chain that already has the factory; the featured distribution shows its deposit as an activity row;
token amounts use the token's `decimals()`; `make chain-doc` writes under `app/chain/`.

Open on this milestone, all for Denizen:

| Item | What it is | Where |
|:-----|:-----------|:------|
| docs text | `#/docs` ships as a draft the agents wrote (decision 17). Denizen writes the final page himself. **The signoff is not dated while the draft stands.** | § The docs page |
| #68 | Freedom calls `html()` for every path, so `web3://…/widget.js` renders the dapp there. A ruling on what the docs page tells a host to embed; the client survey and a recommendation are on the issue. Rule before the widget section's text is final. | [#68](https://github.com/dnznlabs/rake/issues/68) |
| #50 | The landing diagram's 60/30/10 sits above a live 60/40, and its type is ~5 px at 390 px. Three options each on the issue. | [#50](https://github.com/dnznlabs/rake/issues/50) |
| anything else | Whatever Denizen finds. Scope is decided per item when it is filed, not fenced in advance. | § Rules |

## Running the stack

From the repo root, everything through `devbox run --` (forge `1.7.1-dev`, node from `devbox.lock`).
A fresh worktree has no `lib/`: `git submodule update --init --recursive` first.

```bash
devbox run -- make serve        # anvil :8545, deploy + seed, static server :3000
# without a TTY:
ANVIL_PORT=8545 APP_PORT=3000 devbox run -- process-compose -f procs/10-chain.yml -f procs/20-dapp.yml up -t=false
```

- Dev build, no wallet needed: `http://localhost:3000/?rpc=http://127.0.0.1:8545&from=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.
  The `from` is anvil account 0, which owns the featured distribution, so the owner view is on.
- `#/` is the featured distribution (two rows, 7-day delay, one pending change, 1 ETH, one `Received`
  row); `#/distros` the list; `#/distros/<addr>` any distribution; `#/create`; `#/docs`.
- `devbox run -- make fixtures` after the deploy adds the escrow demo (a distribution with a held ETH
  share and a `false`-returning token) and a vault-owned distribution for the copy-calldata view.
- A second chain to see drift: `anvil --port 8546 --chain-id 31338`, then
  `devbox run -- make deploy ANVIL_PORT=8546 CHAIN_ID=31338`. Same addresses, different table.
- Host page for the widget, four foil hosts: `http://localhost:3000/host?rpc=http://127.0.0.1:8545`.
- With a wallet browser instead of the dev build: MetaMask custom network `http://127.0.0.1:8545`,
  chain ID `31337`, anvil key 0 imported. Each of those, when wrong, presents as "No wallet found."
- `make deploy` twice on one chain now refuses (`#35`). To refresh the on-chain document after an
  `app/` change on a live chain: `make dapp-nodev && make chunks && make dapp`. To start over:
  restart anvil.
- `make chain-doc` reads what the chain serves to `app/chain/` and prints the hashes; compare
  `inflated sha256` with `sha256sum app/dist/index.html` **after** `make dapp-nodev`, and
  `widget sha256` with `app/dist/widget.js`.

## The docs page

`#/docs` is in `app/src/index.html`, from `const SECTIONS` (line ~1019) down: eleven sections, each
an `<section id="s-<key>">` with a heading, and a rail built from `SECTIONS`. Written for the owner of
a distribution, not a developer (decision 17): what it is, why it exists, how it works, creating one,
paying in, paying out, changing it, ownership, the widget, limits, for developers. Function names
appear once, where the owner meets them in a wallet prompt. The contract reference is
`docs/REFERENCE.md`, not the page.

Rewrite the text freely. These are the checks that run against whatever is written, so keep their
inputs:

- **`test/docs.test.mjs`** pins that `SECTIONS` has eleven entries and that the `id="s-…"` sections
  appear in the same order with the same keys, and that `widget` is one of them — the landing's "Get
  the widget" button links `#/docs#widget`. Adding, removing or reordering sections means changing
  `SECTIONS`, the ids and the test together. Section *titles* and *bodies* are free.
- **Criterion 9's grep** must stay empty: `grep -rnE '\btip\b|govUrl|about:|ownerKind' app/src`.
  Decisions 1, 2 and 7: no tip line, no `url`/`about` fields, no owner-kind routing. A "tip the
  authors" line is M05's, not this page's.
- **Two sentences the page must keep saying**, because carried issues point at them: paying in from
  a contract with `.transfer()`/`.send()` can fail when the implementation is cold, pay in with `call`
  and gas (#18); and the create flow refuses an address that already has code (#22).
- **The widget section** is where #68's ruling lands: what URL a host loads `widget.js` from. The
  current draft assumes a path-routing `web3://` gateway. The recommendation on the issue is to name a
  5219 gateway URL and never a bare `web3://…/widget.js`.
- `docs/REFERENCE.md` is not part of the rewrite. Its struct and tables are tested against `src/` and
  the ABI; leave it unless the ABI changed, which it must not.

After the text: `devbox run -- node --test test/*.test.mjs`, then `make dapp-nodev && make chunks`
on a live chain and `make chain-doc` to see it served, and record the new bundle size — the
non-dev build was 88,388 raw / 27,321 gzipped / two chunks at `b1efe27`; one SSTORE2 chunk is 24,000
bytes of gzip, so the third chunk starts at 48,000 and there is room.

## Rules

1. **Anything is fair game**, `app/` or `src/`, and what an item may touch is settled when it is filed.
   But the bill is priced per item (`MILESTONE.md` § Phase 5 § Consequences):
   - any `app/` change makes the on-chain document stale until re-chunked (above), and criterion 8's
     hashes and criterion 7's widget budget (`wc -c app/dist/widget.js` ≤ 10,240; the build refuses
     over it) are re-recorded at signoff;
   - a `src/App.sol` or `Chunks.s.sol` change re-opens criteria 7 and 8;
   - a `Distribution.sol` change that leaves the `snapshot()` struct and the ABI alone re-runs M01's
     suite and the reference tables; `forge snapshot --check` fails until the snapshot is
     regenerated, by design;
   - **a `snapshot()` struct change re-opens t01 through t05** and should be refused unless the struct
     is wrong, not merely inconvenient.
2. **A tweak that contradicts a ruling is a ruling first.** Decisions 1, 2, 6, 7, 9, 11, 12, 13 fix
   what the dapp shows; superseding one means a five-line entry in `docs/ROADMAP.md` § Decisions
   before the code lands, so the record and the dapp never disagree. The five lines: question,
   options with costs, recommendation, default, where recorded.
3. **One PR per item or per coherent batch**, from the handbook's `templates/PR.md` (no task line —
   this is work outside the loop; the paragraph and the review line stay), reviewed by the architect against the criteria it touches, merged by
   Denizen. **Merge commit, not squash or rebase**, or the authorship and signatures on the branch
   are lost (as #65's were). Each PR's row goes in the Phase 5 table in `MILESTONE.md`; the architect
   keeps that table current.
4. **Hand-offs are rows, not messages.** Anything Denizen wants Elanik to build gets a row in the
   Phase 5 table and a task issue; Elanik is not in this phase by default.
5. **CI is the net, with one gap.** Every PR is gated on a warning-free, lint-free build, `make fmt`,
   `make test` (`forge test` + `node --test`), `forge snapshot --check` and a clean tree. Nothing in CI
   runs `make deploy` or `make chain-doc`, so the on-chain document is checked by hand at signoff.
6. **Before any commit:** `git status --porcelain` empty after `forge build --force`, `forge test`,
   `forge snapshot`, `make deploy` and `make chain-doc`; run `forge build --force` before any test
   count, never `forge lint` before a count or a `--check` (it poisons the cache — `AGENTS.md`
   § Contracts). `.gas-snapshot` is regenerated through devbox only.
7. Working conventions are `AGENTS.md` in the repo and `../shared/ORG.md`, which `CLAUDE.md` imports
   (conventional commits, signed). Don't name the org in a tracked file.

## Closing the phase

Done means Denizen is done finding things, the docs text is his, and #68 and #50 are ruled or
dropped with a reason. Then:

1. Re-run criteria 8 and 9 against the final `main` and any other criterion whose inputs the phase
   touched (the architect does this and records it under the signoff line).
2. Date the signoff in `MILESTONE.md` criterion 10 — the architect opens that PR with the re-run
   results; Denizen's merge is the signature.
3. M03 starts: the security review, `SECURITY.md`, the deterministic-deploy runbook, and the seven
   carried issues already labelled `m03` (#18, #19, #20, #22, #23, #54, #61). Its `MILESTONE.md` is
   being drafted now and does not wait on this phase.

## Where to look

- `docs/milestones/m02/MILESTONE.md` — criteria, Phase 5 § Consequences, the table this phase fills.
- `docs/ROADMAP.md` § Decisions 1–17 — what is already ruled; § Findings carried forward.
- `docs/milestones/m02/tasks/m02-t0{2,3,4,5,6}/HANDOFF.md` — what each screen was verified to do, with
  the browser checks; t04 for the docs page, t05 for the widget and host page, t06 for the newest.
- `docs/brainstorming/design/HANDOFF.md` and `DESIGN_HANDOFF.md` — the design intent, frozen;
  decisions 9, 13 and 17 override parts of them.
- `AGENTS.md` — the repo's own conventions and traps.
