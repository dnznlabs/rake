# Rake Distro — Design & UI Handoff

**For:** Claude Design
**From:** DNZN LABS
**Status:** Mockup stage. Two working mockups exist (`dapp.html`, `widget.html`) and should be treated as a direction, not a spec. Everything in them is up for revision except the constraints in §1.

---

## 0. What this is

Rake Distro is a small on-chain primitive. A **distribution** is a contract address that splits whatever money it receives across a published table of beneficiaries (by percentage, in basis points). Anyone can trigger the split. Only the owner can change the table, and every change waits out a public delay before it lands.

It exists so any app that takes a fee can replace the paragraph that explains "where the fee goes" with an address, a bar, and a table — and so that table can't change out from under users without warning.

The audience is engineers and builders who run on-chain products. They distrust dashboards, read contracts, and will judge the UI by whether it gets out of the way. The product is sibling-in-spirit to [multisig.software](https://www.multisig.software) (same author ecosystem, same single-file, no-build ethos) but must not look like it.

Two surfaces:

1. **The dapp** — landing, dashboard, docs. Served from a contract (see §1), so it must be small and self-contained.
2. **The widget** — a drop-in `<script>` + `<div data-rake="0x…">` that third-party apps embed next to their fee line. Inherits the host's look; brings only the bar.

---

## 1. Hard constraints

These are not preferences.

- **Pure HTML/CSS/JS. Zero external dependencies.** No webfonts, no CDN scripts, no remote CSS, no icon fonts, no images loaded by URL. Everything inline. The dapp will be served from a contract's `html()` view, so the artifact is literally one string of HTML.
- **Size matters.** Target: dapp under ~60 KB uncompressed before any wallet library. Widget under ~10 KB. Decoration is bytes.
- **System type stacks only.** Monospace: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`. Sans: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Design *with* the fact that type will vary by platform.
- **Logo/mark is inline SVG.** Must read at 16px (favicon, wordmark) and 200px (landing). Monochrome, uses `currentColor` so it inherits theme. No gradients, no raster.
- **Light / Dark / System switcher.** Three-state, persisted in `localStorage`, no flash of wrong theme on load (inline script in `<head>` sets the class before paint).
- **No build step.** The file a reviewer opens is the file the site serves. Comments are allowed in source and stripped by a separate tool, so don't design around minification.
- **Hash routing** (`#/`, `#/distros`, `#/docs`) — there is no server to rewrite paths. Pretty paths in this doc are notional.
- **Accessible floor:** visible keyboard focus, `prefers-reduced-motion` respected, contrast AA in both themes, semantic headings.

---

## 2. Information architecture

```
RAKE  DNZN LABS                          distros   docs   [connect]
──────────────────────────────────────────────────────────────────
#/            Landing — what Rake Distro is
#/distros     Dashboard — list + selected distribution
#/distros/0x… Deep link to one distribution
#/docs        Single-page technical documentation
──────────────────────────────────────────────────────────────────
a public work by dnzn labs        open source · on chain · <tagline>
```

### 2.1 Top nav

- **Top left:** `RAKE` wordmark (mark + word). To its right, vertically centered, small and muted: `DNZN LABS`. The wordmark links to `#/`.
- **Right, in order:** `distros`, `docs`, then the wallet button.
- **Wallet button:** reads `connect` when disconnected. When connected, shows the shortest available identity in this priority: `.wei` name → `.gwei` name → `.eth` name → `0x1234…abcd`. Clicking when connected opens a tiny menu: copy address, switch chain, disconnect. Current chain shown as a small label beside or inside the button.
- Nav collapses gracefully under ~480px; wallet button stays visible.

### 2.2 Footer

- **Left:** `a public work by dnzn labs`
- **Right:** `open source · on chain · ` + one of:
  - `no servers were harmed`
  - `the page you're reading lives in a contract`
  - `nothing here to shut down`
  - `read the source, it's right there`

  Pick one, or propose better. It should be a fact about the project stated dryly, not a slogan.

---

## 3. Pages

### 3.1 Landing `#/`

**Job:** In one screen, show what a distribution *is* and get the visitor to either create one or look at one.

Open with the **signature element** (§5): a live rake bar and ledger for a real distribution (DNZN LABS's own fee distribution, once deployed; demo data until then). The bar is the thesis. Then a short headline and two sentences of prose. Then two actions: `Create a distribution` (primary) and `Get the widget` (secondary). Then a load-existing field (`0x… or a name`, hint: `.eth / .wei / .gwei`).

Below the fold, four short blocks that name the four verbs and what they do: **receive**, **distribute**, **propose**, **apply**. Plain language, one line each. These are the only words a user needs.

Copy direction from the mockup, revise freely:

> **Show where the rake goes.**
> Every app that takes a fee has a paragraph explaining what it's for. This replaces the paragraph with an address. A distribution splits whatever it receives across a table you publish on-chain, and any change to that table waits in public before it lands.

### 3.2 Dashboard `#/distros`

**Job:** Let a connected user see the distributions they own or are a beneficiary of, pick one, and see everything about it. This is also the public view page for any distribution via deep link.

**List (left or top, tabbed):**
- Tabs: `mine` (owner), `paid to me` (beneficiary), `recent` (last viewed, localStorage). Disconnected: only `recent` plus the load field.
- Each item: description, chain, shortened address, a miniature of its rake bar (thin, ~6px, same segments). Pending change indicator if one exists.

**Selected distribution (main):**
1. Address (short) · chain · explorer link, as an eyebrow.
2. Description as the heading.
3. **Rake bar** (full size).
4. **Ledger:** one row per beneficiary — name (bold), note (prose, muted), address (mono, muted, links to explorer, resolves to a name if the address has one), percentage (large, right-aligned).
5. **Pending change** block, if any: "change pending · lands in 3d 14h", with the *proposed* table drawn as a second bar in the pending style (§5). If multiple pending, stack them. Owner sees `cancel` per item; anyone sees `apply` once the ETA has passed.
6. **Meta strip:** owner (resolved name if any), delay, balance waiting to distribute (per token, ETH first).
7. **Actions:** `Distribute` (permissionless — anyone can call it; consider whether to surface this to non-owners or tuck it behind the balance), `Propose a change` (owner only), `Embed` (opens the snippet).

**Propose a change** (owner flow, can be a drawer/panel rather than a page):
- Edit the table inline with the same editor as create step 2 (§3.4). The live bar updates as you type. Totals must equal 100%; deploy button stays disabled with a one-line reason until they do.
- Also editable here, each its own proposal: description, delay, owner (with a renounce option: "transfer to nobody — the table can never change again").
- Submit = one transaction (`propose`). After it lands, the pending block appears with its countdown.

### 3.3 Docs `#/docs`

**Job:** One long page a technical reader can read top to bottom or jump around with a sticky in-page nav. White-paper register: declarative, dry, specific. No marketing.

Sections (in this order):

1. **Abstract** — three sentences.
2. **Motivation** — fees are suspicious by default; the existing answer (Splits) became a banking product; what a primitive should be.
3. **How it works** — the four verbs, with a Mermaid sequence diagram (receive → distribute → push/escrow) and a Mermaid state diagram for the timelock (queued → applied | cancelled).
4. **Contract reference** — function table: name, who can call, what it does. Events. Errors. The `Snapshot` struct, verbatim, because it's what the widget reads.
5. **The table** — basis points, ascending-address rule, last-takes-remainder, labels and notes.
6. **The timelock** — every owner action goes through it, including changing the owner and the delay; `delay = 0` is allowed and flagged; renouncing.
7. **Push, escrow, release** — what happens when a beneficiary can't receive.
8. **Deployment** — factory, CREATE2, sender-bound salt, same address on every chain, chain list with addresses (table, fill in when deployed).
9. **The widget** — snippet, what it reads, what it renders, theming.
10. **Security** — audits table (date, auditor, scope, findings, link), trust assumptions (owner is trusted *over a delay*), known limitations, how to report.
11. **Source** — GitHub links, license (MIT), how to verify the clone bytecode.
12. **Lineage** — Multisig (Src Co / z0r0z), Solady, Splits. Credit where the patterns came from.

**Mermaid:** there is no Mermaid library in the bundle (constraint §1). Diagrams are authored in Mermaid for the repo's docs and **rendered to inline SVG at build time**, then pasted into the page. Design the SVG treatment (stroke, fill, type) so it matches the page in both themes. Provide a style target; engineering will render to it.

### 3.4 Create flow

Reached from the landing CTA. Two steps, no wizard chrome beyond "1 of 2 / 2 of 2".

**Step 1 — "Who controls it, and how slowly."**
Fields: description, owner (defaults to connected wallet; accepts a name), delay (human input like `7d`, `48h`, `0`). Help text under each. Next.

**Step 2 — "Who gets what."**
The rake bar at the top, filling live. Below it, a row per beneficiary: name, note, address (accepts a name), percentage (large numeric input, right side). Remove (×) per row. `+ add a beneficiary`. Sum line: `2 beneficiaries · total 100%` — the total goes red when ≠ 100, green when =100. Unassigned remainder shows in the bar as a hatched segment. Deploy button disabled until valid; a one-line hint says why.

**Deploy:** one transaction per chain. Show the predicted address *before* sending (it's deterministic). After: land on `#/distros/0x…`.

---

## 4. The widget

A separate deliverable with its own constraints.

- Mounts into `<div data-rake="0x…" data-chain="8453">`. Renders: description (linked to explorer), the bar, the table (name, note, short address, %), a pending block if any, a `no delay` warning if delay is zero, and a one-line footer: delay · owner · address · `rake.distro`.
- **Must inherit the host.** Font from the host. Ink from `currentColor`. Rules and muted text derived from `currentColor` at reduced opacity. The only fixed colors are the bar segments and the pending amber. It should look native inside a dark indigo DEX, a light SaaS dashboard, and a brutalist black-on-white page.
- Provide a compact variant (bar + one-line table, for a footer) and the full variant (for an expandable "where does it go?" disclosure).
- Design the loading state (`reading…`) and the failure state (`could not read distribution 0x1d2f…a3c9 on base`).
- The host mockup in `widget.html` shows the shape; restyle the pretend host freely, it's a foil.

---

## 5. Visual system

The mockup's choices, stated so you can keep or overturn them deliberately.

**Signature element: the rake bar.**
A single full-width bar, segmented by basis points, each segment labeled inline with `60%` (bold) and the name. Segments alternate through three tints of one accent. It is the hero on the landing, the live preview in the editor, the identity on the dashboard, the miniature in the list, the body of the widget, and — made small and abstract — the logo. Every place the product appears, the bar appears. Nothing else gets color.

**Pending state.** The proposed table drawn as a second bar, outlined in amber with transparent fill, under the live bar. It must read as "not yet" without reading as "error".

**Palette (mockup):**
- paper `#FCFCFA` / dark `#111311`
- ink `#161616` / dark `#ECECE6`
- muted `#6F6F6B`, dim `#A3A39E`, rule `#DCDCD7`
- accent: **felt green** `#0F6B4B` (dark: `#1E8C63`) — the green of a poker table, because "rake" is the house's cut and this project's whole point is making that cut visible. Reconsider if it reads as "fintech green"; the subject-link is the argument for keeping it.
- pending: amber `#B8741A`
- error: `#B23A2E`

**Type.** Mono for all chrome, data, labels, numbers (tabular). Sans for prose only. Large numerals are the display type — there is no display face. Eyebrows in 11px uppercase tracked. Headings 28/40px mono bold with slightly tight tracking.

**Layout.** One column, 720px max, left-aligned, generous vertical rhythm. Rows separated by hairlines; the ledger has a 1px ink top rule and hairline rows. No cards, no shadows, no rounded containers in the dapp (the widget uses a 4px radius on the bar only, to sit in hosts that are rounded).

**Motion.** Bar segments animate `flex-basis` over 250ms when values change. That's the only motion. Off under reduced-motion.

**Things to avoid.** Gradient backgrounds, glassmorphism, illustrated hero art, emoji, generic "web3" purple, and the specific electric-blue-all-caps look of multisig.software.

---

## 6. Logo / mark

Needs: an SVG mark that is recognizably the rake bar, reduced. Directions to explore:

- Three horizontal bars of decreasing width, stacked, inset — the bar seen as an object.
- A single bar split unevenly (e.g. 60/40) with a 2px gap, in a square.
- The letter R whose stem is the bar.

Requirements: `currentColor` only; legible at 16px; square aspect for favicon; a horizontal lockup `[mark] RAKE` for the nav. Deliver as inline SVG markup, not files.

---

## 7. Name services

The UI resolves and displays names wherever an address appears.

- Forward (name → address) for inputs: `.eth` (ENS, mainnet), `.wei` (WNS, mainnet), `.gwei` (GNS, mainnet). Design the field states: resolving, resolved (show the address under the name), not found, unreachable (mainnet didn't answer — distinct from not found).
- Reverse (address → name) for display: show the name with the short address on hover/secondary. Priority `.wei` → `.gwei` → `.eth`.
- All three namespaces live on Ethereum mainnet regardless of which chain the app is on. Resolution can be slow or fail while the app is otherwise fine; never block an action on it.

---

## 8. Chains

Ethereum, Base, Arbitrum, OP Mainnet, plus Sepolia and Base Sepolia behind a `testnet` toggle (as multisig does). A distribution has the same address on every chain it's deployed to; the dashboard should show which chains a given address is live on.

---

## 9. Reference material

- `dapp.html` — current mockup, all screens, hash-routed, demo data.
- `widget.html` — widget inside a pretend host, with pending state.
- `Distribution.sol` — the contract. The `Snapshot` struct is the data contract for every read in the UI:

```solidity
struct Beneficiary { address account; uint96 bps; string name; string note; }
struct Pending     { bytes32 hash; uint256 eta; bytes action; }
struct Snapshot {
    address owner; uint32 delay; uint32 nonce; string description;
    Beneficiary[] table; Pending[] pending;
}
```

- multisig.software — sibling project. Study the *ethos* (single file, no build, dense comments, audit-first) and then look different.
- splits.org — the incumbent. Now an "onchain banking" product. We are the primitive it used to be.

---

## 10. Deliverables

1. Landing, dashboard (list + detail + propose panel), docs, create step 1 & 2 — desktop and ~390px mobile.
2. Widget, full and compact, in three host contexts (dark app, light app, plain page).
3. Mark + wordmark lockup, inline SVG.
4. Token sheet: colors (light/dark), type scale, spacing, the bar's tint steps, pending style.
5. Diagram style target for the build-rendered Mermaid SVGs.
6. Empty, loading, and error states for: dashboard list, distribution detail, name resolution, widget.
