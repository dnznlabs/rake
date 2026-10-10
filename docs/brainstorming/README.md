# Brainstorming reference set

Pre-implementation material for Rake Distro: the product brief, the design brief, and what design
produced from it. Frozen as received (2026-08-22 → 2026-09-04); edit nothing here. Decisions made from
it belong in `.planning/` and the real docs.

## What is what

Read in this order. Where two disagree, the later-dated one wins unless noted under § Conflicts.

| File | Date | Role |
|---|---|---|
| `PROJECT_OVERVIEW.md` | 08-22 | **Product spec.** Problem, goals, non-goals, decided contract design, open questions, definition of done. Authoritative for the contract. |
| `DESIGN_HANDOFF.md` | 08-22 | **Design brief** — the input sent to design. IA, pages, widget, initial visual direction. Superseded on visuals by `design/HANDOFF.md`; still the best statement of page jobs and flows. |
| `design/HANDOFF.md` | 09-04 | **Engineering handoff** — the output of design. Final tokens, budgets, UI ↔ contract wiring, contract changes design asks for. Authoritative for UI. |
| `design/rake-dapp.html` | 09-04 | Working prototype, demo data. Source of truth for layout, copy and states. |
| `design/rake-widget.html` | 09-04 | Widget source (`script#rake-widget-src`) plus a test harness. |
| `design/Rake Boards.dc.html` | 09-04 | Design record: numbered turns and options, newest on top. |
| `design/Rake Brand Sheet.dc.html` | 09-04 | Brand one-pager: mark, lockups, palette, type, voice. |
| `design/support.js` | — | Viewer runtime for the two `.dc.html` files only (loads React from unpkg). Never ship it. |

Dropped from the source folder as byte-identical duplicates: `design/handoff/*` (copies of the three
`design/` handoff files) and `design/uploads/ref_files-*.md` (`PROJECT_OVERVIEW.md` as uploaded to design).

## Lineage

This work was generalised into DNZN Base (`../design-base`, `v1/`) and the `dapp` / `onchain-dapp`
fragments in `../shared/templates`. Those are now the starting points; this folder is the record of
the Rake-specific choices that fill DNZN Base's four slots: mark (R with split stem), accent (baize,
oklch hue 230), signature element (the rake bar), footer fact.

## Missing

- **`Distribution.sol`** — the draft contract both briefs cite. It is not in the source folder.
  `PROJECT_OVERVIEW.md` § 5 describes it fully enough to rewrite from.
- `vendor/multisig` is cited as the reference implementation; a clone exists at `../vendor/multisig`.

## Conflicts

1. **Protocol tip.** Overview non-goal: "No fee taken by Rake Distro itself. Free, forever." Engineering
   handoff: `tip`, default 100 bps, hardcoded to the DNZN distribution. Unresolved product decision.
2. **On-chain hosting.** Overview: separate renderer contracts (`Render`, `DocsRenderer`,
   `WidgetRenderer`) and "ERC-8244 does not exist". `onchain-dapp` fragment: one `App` contract,
   ERC-8244 `html()` + ERC-5219, gzipped SSTORE2 chunks. The fragment's model likely replaces the
   segment split and the 60 KB budget.
3. **solc.** Overview requires 0.8.34 (transient-storage lock needs ≥ 0.8.28); `foundry.toml` from
   `forge-anvil` pins 0.8.26.
4. **Snapshot struct** lacks the fields design added: `tip`, governance `url`, `about`.
5. **Accent and frame.** Brief: felt green `#0F6B4B`, 720 px column. Handoff and DNZN Base: baize
   `#2E6379`, 960 px frame / 720 px prose. Handoff wins.
6. **Vocabulary.** UI says `queue` and `name`; contract says `propose` and `description`.
7. **Boards** run to turn 11; the engineering handoff cites turns 1–10.
8. **File names.** Overview § 9 calls the mockups `dapp.html` / `widget.html`; they are now
   `design/rake-dapp.html` / `design/rake-widget.html`. The widget embed points at the placeholder
   `https://rake.distro/widget.js`.
