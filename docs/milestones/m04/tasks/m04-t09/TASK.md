# m04-t09 — The alpha marker: `0.1alpha`, the tag line, the Disclaimer

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, every surface a visitor reaches says the software is alpha, the way decision 45
rules it: the page's version string reads `0.1alpha`, derived from `App.version` plus the marker
rather than from a second hardcoded `v0.1`; a Disclaimer is the first section of `#/docs`; the tag
line **"alpha software is alpha, act accordingly."** sits in the dapp header on every view and on
the landing, linking to that section; and the widget carries the word `alpha` under its 10,240-byte
gate. `app/` and the README only — nothing under `src/`, because `App.version` feeds `App`'s
CREATE2 address and the marker is a page string, which is what makes removing it a chunk re-upload
and not a redeploy. The README half already landed with the ruling
([#181](https://github.com/dnznlabs/rake/pull/181), merged 2026-11-11); this task is the dapp half,
and it must merge before m04-t08 builds the bundle it uploads, or the testnets carry two uploads
where one would do.

## Plan

Every command runs from the repo root through `devbox run --` (node from `devbox.lock`). Branch
`m04/t09-alpha-marker` from `origin/main` at or after `8d0e4ab` (the merge of #181). Check hooks:
`ls "$(git rev-parse --git-path hooks)"` lists `pre-commit` and `post-commit`. Read decision 45 in
`docs/ROADMAP.md` first; its wording is the spec, and where this plan and the decision disagree,
the decision wins and this file is fixed. Never `devbox run -- bash -c` with a pipe; write a script.

0. **Baselines**, recorded in the handoff with the date. Measured on `main` at `8d0e4ab`,
   2026-11-12, re-run rather than quote:
   - `grep -ril alpha app/src/` → nothing (0 of 7 files); `grep -ri -c 'act accordingly' app/src/`
     → 0 in every file; `grep -ic disclaimer app/src/index.html` → 0.
   - `grep -n VERSION app/build.mjs` → one line, `app/build.mjs:55`:
     `const values = { VERSION: 'v0.1', ...onchain, CHAIN_ID: chain };` — the second source.
   - The version string is painted at two sites: `app/src/index.html:55`
     (`document.getElementById('ver').textContent = \`dnzn labs · ${CFG.version}\`` — the `#ver`
     span is in the **footer**, `app/src/layout.html:16`, not the header) and `index.html:1849`
     (the docs eyebrow, `docs · ${CFG.version}`). `CFG.version` is `__VERSION__` substituted at
     build (`index.html:34`). Nothing in `app/src/` calls `version()` on `App` (`grep -c 'version()'`
     → 0 in `index.html`, `eth.js`, `model.js`).
   - `grep -o "const SECTIONS = \[\['[a-z]*'" app/src/index.html` → `['what'` — Overview is first;
     `test/docs.test.mjs:87-95` pins the rail and the headings as **thirteen** sections in one order.
   - The widget: `node app/build.mjs` prints `widget: raw 8132 bytes · budget 10240 · 2108 left`
     (built 2026-11-12 with placeholder `--set` addresses on chain 31337; the dapp was 141,064 raw /
     44,500 gzipped the same way). `app/src/widget.js:1`'s header comment carries `__VERSION__`, but
     the minifier strips block comments (`build.mjs:77-78`), so the shipped widget carries no
     version and no `alpha` today.
   - README: `grep -ic '0.1alpha\|act accordingly' README.md` → 2; § Release Info carries the
     `0.1alpha` table, the tag line and a § Disclaimer with decision 45's four sentences. **Passes on
     `main`**; this task touches the README only if its wording must change to match the dapp's.
   - `node --test test/*.test.mjs` → 95 pass, 0 fail. `forge test` is not touched by this task.

1. **One source for the version string.** `App`'s constructor arguments are in the broadcast log
   `build.mjs` already reads for its address: `broadcast/DeployApp.s.sol/<chain>/run-latest.json`
   `transactions[].arguments` is `["<OWNER>", "v0.1"]` for the `App` creation (read 2026-11-12 from
   the Sepolia log on #179's branch; the dev chain's log has the same shape after `make deploy`).
   Extend `app/broadcast.mjs`'s `creations()` to return `args` beside `name`/`address`/`block`, and
   in `build.mjs` derive `VERSION` from the `App` creation's second argument: strip one leading `v`,
   append `alpha` — `v0.1` → `0.1alpha`. Delete the `VERSION: 'v0.1'` default at `build.mjs:55`.
   Keep `--set VERSION=…` working as the override it already is, so a build on a chain without a log
   can still be made deliberately. With neither, the existing "nothing to substitute for
   `__VERSION__`" refusal (`build.mjs:63-72`) is the behaviour: a bundle with no version is not
   built. Refuse, do not default, if `App`'s argument does not match `/^v?\d+\.\d+$/` — a
   surprising version is a question, not a string to ship.

   Rejected: reading `version()` from the chain at runtime as the source. The page's provider `P` is
   `null` with no wallet (`index.html:97`) and the docs are read wallet-less, so a visitor without
   a wallet would see no version at all; the chain is instead read by the reviewer (AC 1).

   Check: `make dapp-nodev` on a dev chain prints the version it derived; `grep -c "0.1alpha"
   app/dist/index.html` → 1 (the single `__VERSION__` in `CFG`), and `test/docs.test.mjs` pins the two
   paint sites (footer `#ver`, docs eyebrow) reading `CFG.version`; `grep -c "v0.1" app/build.mjs` → 0;
   a test in `test/inline-scripts.test.mjs` or a new `test/build.test.mjs` pins the derivation on
   three inputs (`v0.1` → `0.1alpha`, `0.1` → `0.1alpha`, `v1` → refused).

   *(Amended 2026-11-12 with AC 1's clause 3, by the architect's review on
   [#186](https://github.com/dnznlabs/rake/pull/186): this check previously read `≥ 2`, the same
   defect as the criterion — it counted source text for two runtime paints and could not hold.)*

2. **The Disclaimer, first in `#/docs`.** Add `['disclaimer', 'Disclaimer']` as the **first** entry
   of `SECTIONS` (`index.html:1783`) and `<h2 id="s-disclaimer">Disclaimer</h2>` as the first
   heading in `docs()`'s article, before `s-what`. The section says the four things decision 45
   says, in prose written for the owner of a distribution (decision 17): alpha software; the
   contracts are reviewed by the shared two-model method and Slither
   (link `${REPO}/blob/main/SECURITY.md`, `target="_blank" rel="noopener"` as the page's other repo
   links do), not audited; no warranty; and the contracts are immutable, so a found bug is not
   patched — it is a new address. One more sentence states the removal rule (step 6's note) so the
   page says when the marker goes. Mirror the README's § Disclaimer wording where it fits; neither
   copies the other's links.

   `test/docs.test.mjs:87-95` pins thirteen sections; it becomes fourteen, and the test's name says
   so. Add one assertion there: the first id in `SECTIONS` and the first `id="s-…"` in the page are
   both `disclaimer`.

   Check: `node --test test/docs.test.mjs` passes with fourteen; `#/docs` opened in the dev stack
   paints Disclaimer first and the rail's first link is `disclaimer`; `#/docs#disclaimer` scrolls to
   it (`docScroll`, `index.html:1979`).

3. **The tag line, header and landing.** In `app/src/layout.html`, inside the `.frame` and directly
   under `<nav>` so it is on **every** view, one line:
   `<a class="alpha" href="#/docs#disclaimer">alpha software is alpha, act accordingly.</a>` — the
   exact string, lowercase, with the full stop. On the landing (`landing()`, `index.html:967`), the
   same anchor under the hero's `<p class="prose">`, so a visitor who reads only the pitch reads it
   too. Style `.alpha` in `theme.css` as one small line in the dim colour the footer uses
   (`--dim`), no box, no icon; the header one stays on the phone layout (`@media (max-width:720px)`,
   `theme.css:238`) — a header is where the line is for.

   Check: `grep -c 'alpha software is alpha, act accordingly\.' app/dist/index.html` → 2;
   every route (`#/`, `#/distros`, `#/distros/<addr>`, `#/create`, `#/docs`) shows the header line in
   the dev stack, and clicking it lands on the Disclaimer; `make dapp-nodev` passes
   `assertInlineScripts` as before.

4. **The widget carries `alpha`, and no link.** In `app/src/widget.js:194`, the `foot` string gains
   the word: `'alpha · '` prefixed to the existing `delay … · owner … · <addr> · <chain>` line, so
   it is painted in both the full and the compact variant. No anchor, no `title`: decision 12's one
   outbound link is `data-link`'s and the widget's header comment promises "no link unless the host
   asks for one". Then build and read the byte line.

   **Measured 2026-11-12 on exactly that edit, on `main` at `8d0e4ab`: `widget: raw 8144 bytes ·
   budget 10240 · 2096 left`** — 12 bytes for `alpha · `. Headroom is the limit minus the measured
   size after the change, 10,240 − 8,144 = 2,096 bytes; the engineer's build is the figure the
   handoff records, not this one.

   Check: `node app/build.mjs …` exits 0 and prints the widget line (the gate, `build.mjs:98-104`,
   is the test; a failure there is a stop, not a budget argument); `grep -c alpha app/dist/widget.js`
   ≥ 1; `grep -c '<a ' app/dist/widget.js` unchanged from `main` (the `data-link` anchor only);
   `node --test test/widget.test.mjs` passes.

5. **The bundle and the chunks.** Any `app/` byte changes `app/dist/index.html.gz` and
   `widget.js`, so the hashes m04-t08 commits and uploads are only right if t08's step 1 builds at or
   after this PR's merge. Record in the handoff, per chain, `make dapp-nodev CHAIN_ID=<id>` then
   `sha256sum app/dist/index.html app/dist/index.html.gz app/dist/widget.js` and `wc -c` of each,
   built at the PR head — these are the figures t08 matches (its step 1) or, if t08 has already
   uploaded, the figures its re-run uploads. On the dev chain: `make dapp-nodev && make chunks &&
   make chain-doc` — `inflated sha256` equals `sha256sum app/dist/index.html`, `widget sha256`
   equals `widget.js`'s; then `make dapp` last, because the dev server reads the same `app/dist`
   (`mk/30-onchain.mk:16-17`). A public-chain upload is **not** this task's: step 4 is an Ops-vault
   action (decision 44, [#180](https://github.com/dnznlabs/rake/pull/180)) and runs as t08 or as t08
   re-run, with the vault's `nonce()` re-read, before Phase 4's UAT opens the page.

   Check: the three hashes and three byte counts per chain (11155111, 84532) in the handoff; the
   dev-chain `chain-doc` equality printed.

6. **The removal rule, as a criterion.** Add to the Disclaimer section (step 2) and to the handoff
   § For M05 one note in the shape of a test, so the day the marker comes off is a reading and not a
   feeling: *The marks come off in one PR — a chunk re-upload and a README edit, no redeploy —
   when all three hold: (a) M05's `CLOSEOUT.md` is merged and 90 days have passed since its merge
   commit's date; (b) `gh issue list -R dnznlabs/rake --label bug --state all --search
   "created:>=<M05 merge date>"` prints nothing; (c) `SECURITY.md` records no finding dated after
   that merge whose disposition is `fix` or `accepted`.* The PR that removes the marks cites the
   three readings with the date they were taken.

   Check: the sentence is in `#/docs` § Disclaimer and in the handoff.

7. **`HANDOFF.md`**: the AC table with evidence per row, § Baselines
   (step 0, re-measured), the widget byte line before and after, the per-chain hashes of step 5,
   § Deviations, and § For t08 naming the hashes to upload.

## Acceptance criteria

1. **One source.** `grep -n "v0.1" app/build.mjs` → nothing; `make dapp-nodev` on a chain whose
   `DeployApp.s.sol` log exists derives the string from the log's `App` constructor argument, and
   on both testnets `cast call 0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE "version()(string)"
   --rpc-url "$RPC"` prints `v0.1`, so the derived string is `0.1alpha`; `grep -c 0.1alpha
   app/dist/index.html` → 1 (the single `__VERSION__` in `CFG`), and `test/docs.test.mjs` pins the two
   paint sites (footer `#ver`, docs eyebrow) reading `CFG.version`. Without a log and without
   `--set VERSION=`, the build refuses by name.

   *(Clause 3 amended 2026-11-12 by the architect's review on [#186](https://github.com/dnznlabs/rake/pull/186):
   it previously read `≥ 2`, which counted source text for two runtime paints and could not hold — see
   the handoff's § Deviations 1 for the arithmetic.)*
2. **Disclaimer first.** `SECTIONS[0][0] === 'disclaimer'` and the first `id="s-…"` in
   `app/src/index.html` is `s-disclaimer` (pinned in `test/docs.test.mjs`, fourteen sections);
   the section states the four things decision 45 names, with the `SECURITY.md` link, and the
   removal note of step 6.
3. **The tag line, every view.** `grep -c 'alpha software is alpha, act accordingly\.'
   app/dist/index.html` → 2 (header, landing), both anchors to `#/docs#disclaimer`; the header one
   is in `app/src/layout.html`, so no route can omit it.
4. **The widget.** `grep -ic alpha app/dist/widget.js` ≥ 1; the anchor count in `app/dist/widget.js`
   equals `main`'s; `node app/build.mjs` prints the widget byte line and exits 0 (M02 criterion 7's
   10,240-byte gate); the handoff records the bytes before and after and the headroom as
   `10240 − after`.
5. **The chunk criterion is re-armed, not met here.** The handoff carries, per testnet, the
   `sha256sum` and `wc -c` of `index.html`, `index.html.gz` and `widget.js` built with
   `make dapp-nodev CHAIN_ID=<id>` at the PR head, and § For t08 says these are the hashes to upload
   (or re-upload) through the Ops vault before Phase 4. M04 criterion 3 is then t08's to close.
6. **Nothing else moved.** `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot
   RUNBOOK.md scripts/` empty; `README.md` unchanged or changed only to match the dapp's wording;
   `node --test test/*.test.mjs` count ≥ 95 with 0 failures, the count stated; `forge test` count
   unchanged from `main` and stated; `git status --porcelain` empty after `make dapp-nodev && make
   chunks && make dapp` on a fresh anvil.
7. PR closes this task's issue; § Deviations is empty or each item names the step it amends.

## Out of scope

- **Any `src/` byte**, including `App.version` or `setVersion` — the marker is not a version in the
  contract (decision 45), and a `src/` byte is M03 reopened (decision 5, M04 § Out of scope).
- **The public-chain upload.** Step 4 is an Ops-vault action (decision 44); it is m04-t08's, or a
  re-run of it. This task hands t08 the hashes and stops.
- **`app/src/host.html`.** A dev foil, never uploaded (`build.mjs` header); no marker there.
- **The README's wording** beyond matching the dapp's; #181 placed it and Denizen merged it.
- **Removing the marker.** Step 6 writes the test; nobody runs it before M05.
- **A visual redesign of the header.** One dim line; the `.frame`, `nav` and `footer` keep their
  shape. If the line does not fit a phone width, it wraps; it does not hide.

## Open questions

None that gate a step. Two defaults the engineer takes, stated so the review can disagree:

- **Version source is the broadcast log, not a runtime `version()` read** (step 1's rejection). If
  the review prefers the chain read as well, it is one `eth_call` through `P` when `P` exists,
  overwriting the built string — an addition, not a change of source.
- **The widget word is a prefix on `foot`**, `alpha · …`, in both variants. If Denizen wants it
  elsewhere (the description line, a suffix), the byte cost is the same order and the gate still
  decides; re-measure and record.

## Context

- Decision 45 (`docs/ROADMAP.md` § Decisions): the ruling, verbatim; decision 12 (the widget's one
  link); decision 5 (`lock()` not at launch); decision 44 and [#180](https://github.com/dnznlabs/rake/pull/180)
  (step 4 via the Ops vault, m04-t08's plan).
- The org "Alpha marker" convention, ruled 2026-11-11 and recorded as decision 45: the convention
  this task implements.
- `README.md` § Release Info and § Disclaimer ([#181](https://github.com/dnznlabs/rake/pull/181)).
- `app/build.mjs:55` (the hardcoded `VERSION`), `:63-72` (the refusal), `:77-78` (the minifier),
  `:98-104` (the widget gate); `app/broadcast.mjs:56-65` (`creations()`).
- `app/src/index.html:34` (`CFG`), `:55` (footer version), `:967` (`landing()`), `:1783`
  (`SECTIONS`), `:1849` (docs eyebrow), `:1979` (`docScroll`); `app/src/layout.html:16` (footer);
  `app/src/widget.js:194` (`foot`); `test/docs.test.mjs:87-95`.
- M04 `MILESTONE.md` criterion 3 (the chunk hashes), Phase 1 row m04-t09, Phase 4 (the UAT this
  precedes); m04-t08 `TASK.md` steps 1 and 8 (the hashes and the on-chain check).
- `SECURITY.md` § Prior reviews (the two-model method) and § Static analysis (Slither), the two
  things the Disclaimer names.
