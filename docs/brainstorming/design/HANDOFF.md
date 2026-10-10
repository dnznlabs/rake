# Rake Distro — Engineering Handoff (v0.1)

## Artifacts
- `Rake Boards.dc.html` — design record. Turns 1–10, newest on top; locked direction = 1c+1e+1h+1j+1o (turn 2), structure per turns 3–7, docs turn 8, widget turn 9, tip turn 10.
- `rake-dapp.html` — working prototype. Plain single file, zero deps, hash-routed, demo data. This is the source-of-truth for layout, copy, and states.
- `rake-widget.html` — widget source (`script#rake-widget-src`, 5.5KB raw) + test harness (delete harness, keep widget).
- `Rake Brand Sheet.dc.html` — brand identity one-pager (mark, lockups, palette, type, the bar, voice, rules). Lives in the design workspace alongside the boards.

## Assembly model & budgets
Segments are comment-marked in `rake-dapp.html` and map to renderer contracts:
- `SEGMENT:core` → `Render.html()` — 51.5KB comment-stripped (target ~60KB ✓)
- `SEGMENT:docs` → `DocsRenderer.html()` — 14.0KB payload, spliced into `<main>` via eth_call
- widget → `WidgetRenderer.html()` — 5.5KB (target 10KB ✓)
Assembled single doc: 65.5KB stripped. Crossing rule: docs/widget segments may use ONLY the shared layer — CSS custom properties, `.eyebrow/.mutd/.dim` type classes, `esc()`. A build-time whitespace pass saves ~0.7KB more; not worth readability.

## Tokens (light / dark)
- paper `#FCFCFA` / `#111311` · ink `#161616` / `#ECECE6`
- muted `#6F6F6B` / `#8A8A85` · dim `#A3A39E` / `#5C5E5A` · rule `#DCDCD7` / `#2E302E`
- accent baize t1 `#2E6379` / `#3F87A6` · t2 = mix(t1, paper 25%) `#618999` / `#6AA0B6` · t3 = mix 50% `#95B0BA` / `#95B9C6`
- pending amber `#B8741A` / `#CE9640` · error `#B23A2E` / `#D06456`
- Accent appears ONLY in: bar segments, focus ring, link hover. Fixed colors in the widget: tints + amber (+ error).

## Type & spacing
- mono `ui-monospace,"SF Mono",Menlo,Consolas,monospace` — all chrome, data, numbers (tabular-nums)
- sans `system-ui,-apple-system,"Segoe UI",Roboto,sans-serif` — prose/notes only
- Scale: eyebrow 11/600 track .08em · data 13 · prose 15/1.65 · ledger % 20 bold · page h2 28 · landing H1 40 · docs h1 30 / h2 19
- Spacing steps: 4 8 12 16 24 40 64. Page frame 960px; hairlines end at the frame.
- Bar: 250ms flex-basis transition is the ONLY motion; off under reduced-motion. Pending bars: amber 1.5px outline, transparent fill, 3px gaps, widths `calc(bps% − gapShare)`.

## Vocabulary map (UI ↔ contract)
- queue → `propose(bytes)` · name → `description` · apply/cancel/distribute/release literal.

## Demo → real wiring
- `DISTROS` registry → `snapshot()` per chain (shape matches the struct verbatim; one eth_call).
- `fetchSnapshot()` in the widget → same call; pending previews decode `setBeneficiaries` actions only.
- `resolveName()` → ENS/WNS/GNS, always mainnet, ~timeout-bounded, never blocks a write. Four states are designed: resolving / resolved / not found / unreachable (distinct).
- Wallet stub → `window.ethereum` raw JSON-RPC. Six writes total (create, propose, apply, cancel, distribute, release) — no EIP-712, no signing lib.
- `changes[]` / `activity[]` → event logs; progressive, loads after snapshot, never blocks the table.
- Predicted address in create step 2 → CREATE2 (factory, sender-bound salt); same address every chain.
- localStorage keys: `rake.theme` (light|dark|system), `rake.recent` — all access try/catch-guarded (sandboxes).
- Theme boots inline in `<head>` before paint; favicon is SVG data-URI, swaps via `prefers-color-scheme`.

## Contract flags (design decided, storage undecided)
- `tip` (bps, default 100 at create, recipient hardcoded = DNZN distribution, skimmed pre-table): NOT in the current Snapshot struct — needs a field or config slot. Always disclosed: detail line + widget footer + queueable like any config.
- governance `url` + `about`: need a storage home (contract has `description` only). Candidates: convention inside description, or a v1.1 field.
- Later phase (designed, not v1): owner-kind submit routes (multisig custom action / Majeur proposal), vault import. v1 bridge = "copy calldata" everywhere.

## Accessibility floor
- `:focus-visible` 2px accent ring · `prefers-reduced-motion` kills all transitions · AA pairs verified per theme · semantic headings · menus: esc/click-away close, aria-expanded maintained · 390px: nav second row, stacked CTAs, single-column verbs.
