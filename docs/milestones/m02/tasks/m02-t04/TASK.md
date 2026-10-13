# m02-t04 — Docs: `#/docs` against the real ABI, and the second chunk

Milestone: [M02](../../MILESTONE.md) · Phase: 4 — Docs and the widget

When this is done `#/docs` is the prototype's twelve-section article rebuilt on the real contract —
the `Snapshot` struct verbatim from `src/Distribution.sol`, a function table whose names are exactly
the external functions `forge inspect Distribution abi` prints, the two figures re-inked to theme
tokens — and the bundle it makes the dapp into is served from the chain across **two** SSTORE2 chunks,
concatenated by `App.html()` and inflated in the browser, with criterion 8 measured on it. Today the
chain has served one chunk only; this task is the first time `chunk 1` exists.

## Plan

Every command runs from the repo root through `devbox run --` (forge/cast `1.7.1-dev`, node
`v24.12.0`). Branch `m02/t04-docs` from `origin/main` after #52 has merged (t03's writes, editor and
`tx()` are in; this task adds no write). A fresh worktree has no `lib/`: run
`git submodule update --init --recursive` before the first `forge` command
([#41](https://github.com/dnznlabs/rake/issues/41)), then check hooks with
`ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`) and run
`devbox run -- pre-commit install --install-hooks` if either is missing. Do not run `make init`.

**Baseline on `main` at `66c77e5`, measured 2026-10-11 — re-run rather than quote.** In
`app/src/index.html`: `grep -c 'id="s-abstract"'` → 0, `grep -c 'struct Snapshot'` → 0,
`grep -c 'beneficiaries()'` → 0, `grep -c 'widget.js'` → 0, `grep -c Lineage` → 0; the page is the
scaffold's `docs()` at lines 971–981 (`How it works` / `Contracts` / `Verify it yourself`), so
criterion 6 fails by absence. The landing's `Get the widget` CTA points at `#/docs#widget` (line 557)
and `route()` compares `h === '#/docs'` (988–989), so that link renders the landing today. Size,
without a chain:

```
$ node app/build.mjs --chain 31337 --set FEATURED_SALT=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001 \
    --set DISTRIBUTIONFACTORY=0x5FbDB2315678afecb367f032d93F642f64180aa3 --set DISTRIBUTIONFACTORY_BLOCK=0x1
dapp: raw 74811 bytes · gzip 23036 bytes · chain 31337
```

(`DISTRIBUTIONFACTORY_BLOCK=1` gives 74,809 / 23,037: the two bytes are the `0x`.) Head-room to
`Chunks.s.sol`'s 24,000-byte `MAX_CHUNK` (`scripts/forge/Chunks.s.sol:13`): **964 gzipped bytes**, the
t03 handoff's figure. The prototype's docs segment — `rake-dapp.html` 127–144 (styles) and 484–545
(`figSeq`, `figState`, `SECTIONS`, `vDocs`) — is 14,592 raw bytes, 5,180 gzipped on its own, and
appended to the bundle it costs about 4,650 gzipped (27,629 against 22,973 through `gzip -9`, which
runs 64 bytes under node's zlib on the same input). **Estimate: the bundle lands near 27,700
gzipped, two chunks.** That is the whole reason for steps 6–8.

**Decision, closing [#53](https://github.com/dnznlabs/rake/issues/53): prove two-chunk serving here;
carry a trim list to Phase 5.** The alternative — trim the bundle first so the docs page fits in the
remaining 964 bytes — is rejected: it adds a measurement task in front of t04, and it leaves the bundle
fighting its budget through t05 (the widget host page and `Chunks.s.sol` changes) and through Phase 5,
where every tweak would be priced against a boundary that the contract was built to cross.
`App._raw()` concatenates any number of pointers (`src/App.sol:129–134`), `Chunks.s.sol` cuts the
payload into `ceil(len / 24,000)` parts (lines 22–31), `test_rawChunksConcat` pins two chunks with
tiny payloads (`test/App.t.sol:21–27`) — and on 2026-10-11 the loop was run with `GZIP=false` on a
scratch anvil: 4 chunks, `chunkCount()` → 4, `html()` 74,811 bytes, `make chain-doc` byte-equal to
`app/dist/index.html`. What has **never** run is the gzipped branch over more than one pointer — the
base64 of a two-chunk concatenation inflated by the bootstrap in a browser — and that is what step 7
proves. #53 closes when this plan merges; the trim list is step 8's.

1. **The docs route.** `route()` (`index.html:984–1000`) matches `#/docs` by prefix:
   `h.startsWith('#/docs')` paints the page before the wallet checks, as the strict compare does today,
   so the page reads with no wallet and on the wrong chain; `#/docs#<section>` scrolls to
   `id="s-<section>"` after painting (the twelve ids are the prototype's `SECTIONS`, `rake-dapp.html:508`),
   and the landing's `#/docs#widget` lands on the widget section. The rail's links are `#/docs#<section>`
   rather than the prototype's `data-sec` handler. Check: `grep -c "h === '#/docs'" app/src/index.html`
   → 0; `grep -c 'id="s-' app/src/index.html` → 12.
2. **The article, from the prototype, against the contract.** Replace `docs()` with the prototype's
   `vDocs` (`rake-dapp.html:509–545`): sticky rail, eyebrow, `<h1>`, twelve `<h2>` sections in
   DESIGN_HANDOFF § 3.3's order. Styles: the `.docgrid`/`.rail` grid and the `.ftab`/`.chains` tables
   from `rake-dapp.html:127–144` into `theme.css`, merged with the `.doc` rules already there (169–176),
   and the 560 px collapse (167–168) at the base's 720 px breakpoint; no inline `style=` attributes
   survive (the base's rule, `AGENTS.md` § The dapp). **The prototype's prose is a draft, not a
   source: every sentence that states contract behaviour is checked against `src/Distribution.sol`
   and the handoff lists the line for each.** Three are already known wrong and are corrected here:
   - "the receive path stays under the 2,300-gas stipend" — true only while the implementation is
     warm (`ROADMAP.md` § Findings, [#18](https://github.com/dnznlabs/rake/issues/18)). The docs say
     what the dapp's funds block already says: paying in from a contract with `transfer`/`send` can
     fail when the implementation is cold; use `call` with gas.
   - `apply(action, nonce)` and any `table()` — decision 9: `applyQueued(bytes,uint32)` and
     `beneficiaries()`; the UI verb stays "apply".
   - the errors list omits `Unauthorized` and carries the factory's two under the wrong contract —
     step 3's lists are generated, not typed.
   Vocabulary: nothing from decisions 1, 2 and 7 — criterion 9's `grep -rnE '\btip\b|govUrl|about:|ownerKind' app/src`
   stays empty, so the Motivation and Security prose avoids the word "tip" as well as the fields.
   Check: `node --test test/*.test.mjs` passes with step 3's test; `grep -c 'style="' app/src/index.html`
   → 5, as on `main` (the prototype's docs segment alone carries 20).
3. **Reference section: generated lists, verbatim struct.** The function table carries **every**
   external function of `Distribution` — the 20 names `forge inspect Distribution abi` prints
   (`applyQueued beneficiaries cancel delay description distribute escrowed init nonce owner pendingCount
   propose queued release reserved setBeneficiaries setDelay setDescription snapshot transferOwnership`,
   measured 2026-10-11), with its signature in the `fn` cell, the caller (`anyone`, `owner`, `self` for
   the four `onlySelf` setters, `factory` for `init`, `view`) and one line of effect. Events (7) and
   errors (6) likewise; the factory's `create`, `predict`, `implementation`, `Created`,
   `DeploymentFailed` and `SaltDoesNotStartWith` go in the Deployment section, not here. Hold the
   names in one `const DOCS_FNS = [[sig, who, effect], …]` so a test can read them. The struct is the
   prototype's `<pre>` form — one JS string with `\n` and the four-space indents inside it, because the
   build minifier strips leading whitespace from every *source* line, `<pre>` included
   (`app/build.mjs`, "Conservative minify") — holding `Beneficiary`, `Pending` and `Snapshot` exactly
   as `src/Distribution.sol:10–30` declares them. Add `test/docs.test.mjs` (node, like
   `inline-scripts.test.mjs` it reads the source): extract `DOCS_FNS` and the struct string from
   `app/src/index.html`; assert the struct equals the three declarations read from
   `src/Distribution.sol` between `struct Beneficiary {` and the close of `struct Snapshot`, both sides
   trimmed per line; assert every `DOCS_FNS` name is in `test/fixtures/abi/selectors.txt` where that
   file has it (it carries 17 signatures, the factory's and the vault probe among them, and none of the
   public getters — so this half is a spot check, and the ABI diff below is the real one). Check: the
   AC script `/tmp/t04-abi.sh` below prints nothing.
4. **Deployment, widget, security, source, lineage.** Deployment: the prototype's chain table
   (ethereum, base, arbitrum, op mainnet, sepolia, base sepolia — "not deployed"), plus the dev chain's
   row from `CONTRACTS` when `CFG.chainId` is 31337 or 31338 so anvil shows its factory; sender-bound
   salts in decision 10's words (the sender fixes the address, each chain is a separate contract). The
   widget: the prototype's snippet (`rake-dapp.html:537`) with `src="widget.js"` — root-relative,
   which is what `App.request(["widget.js"])` serves under a `web3://` gateway (decision 12) — never
   the prototype's `rake.distro` host; one line that a mirror URL arrives with M05. Security: the
   audits table with its "none yet — planned pre-launch" row, the trust line (owner trusted *over a
   delay*), the known limitations the contract actually has (fee-on-transfer settles by balance;
   `PUSH_GAS` is 100,000, `Distribution.sol:48`, so a receiver needing more is always escrowed; #18's
   cold-path line), and the report line from the open question below (default: the repository's
   private-advisory form). Source: `https://github.com/dnznlabs/rake`, MIT by the files' SPDX headers
   — there is no `LICENSE` file on `main`, say "MIT" and nothing about a file — and the existing
   `cast call <factory> "implementation()(address)"` verification kept, extended with
   `cast code <clone>` against solady's PUSH0 init code (`Distribution.sol:332`). Lineage as the
   prototype has it. Check: `grep -c 'rake.distro' app/src/index.html` → 0; the chain table on
   `make serve` shows `anvil` with the factory address `make addresses` prints.
5. **Figures.** `figSeq` and `figState` (`rake-dapp.html:485–507`) as inline SVG, colours through the
   theme's tokens the way t02's `FEEPATH` does (the `.t0/.t1/.t2` classes, whose selectors in
   `theme.css:76–78` are scoped to `.verbs` and `.herograph` and gain `.fig`; amber for the pending
   edge; `var(--ink)`/`var(--muted)`; no `var(--t1)` literals, which `theme.css` does not define — t02
   handoff § Deviations). Captions say "rendered to inline SVG", not "mermaid": there is no Mermaid in
   the bundle and none at build time either (DESIGN_HANDOFF § 3.3's "rendered at build" was a plan, and
   the prototype's hand-drawn SVG is what ships). Check: both figures render in light and dark;
   `grep -cE '#[0-9a-fA-F]{6}' app/src/index.html` → 0, as on `main` (the favicon's hex is in
   `layout.html`).
6. **Measure, then cut.** `make dapp-nodev` (needs a deploy for the addresses; a fresh anvil and
   `make deploy` first — a second deploy on a live chain moves the factory,
   [#35](https://github.com/dnznlabs/rake/issues/35)). Record raw and gzip bytes and
   `ceil(gzip / 24000)` beside t02's 14,254 and t03's 23,036. If the figure is under 24,000, the
   estimate above was wrong by more than 3,700 bytes: say so, and still do step 7 with `GZIP=false`
   as the 2026-10-11 run did, so the multi-pointer path is on record from this task either way.
7. **Two chunks, served.** `make deploy` on a fresh anvil (`make serve`, or the TTY-less form in
   criterion 2): `make chunks` logs `chunk 0 <ptr>` **and** `chunk 1 <ptr>`, then `html() bytes`.
   Then, pasting each in the handoff:
   - `cast call $(make -s addresses | awk '$1=="App"{print $2}') "chunkCount()(uint256)" --rpc-url $RPC` → `2`;
     `"gzipped()(bool)"` → `true`.
   - `make chain-doc` prints `bytes` and `sha256`. **As the tool stands that hash is of the bootstrap
     wrapper `html()` returns, not of the page** — measured 2026-10-11 on one chunk: `html()` is 31,393
     bytes and hashes to `5fd594d4…`, while `app/dist/index.html` is 74,811 bytes at `c4de9156…`;
     the base64 inside the wrapper decodes byte-equal to `app/dist/index.html.gz` and inflates
     byte-equal to `app/dist/index.html`. Extend `tools/chain-doc.mjs`: when the document starts with
     the bootstrap (`<!DOCTYPE html><html><head><meta charset="utf-8"><title>app</title>`,
     `src/App.sol:51`), also decode the `atob("…")` payload, `gunzipSync` it, write it to
     `out/chain/index.inflated.html` and print `payload bytes`, `inflated bytes` and `inflated sha256`;
     an uncompressed document prints the three lines it prints today. The criterion-8 equality is then
     one command each side: `make chain-doc | awk '$1=="inflated" && $2=="sha256"{print $3}'` equals
     `sha256sum app/dist/index.html | cut -c1-64` **after `make dapp-nodev`** — `make deploy` rebuilds
     the dev bundle last (`mk/30-onchain.mk`), so `app/dist/index.html` right after a deploy is the
     75,259-byte dev build and the hashes differ for that reason alone. State the order in the handoff.
   - The page served from the chain: open `out/chain/index.html` in the Playwright chromium t02 and t03
     used (`~/.cache/ms-playwright/chromium-1243`, from a directory outside the repo), with `?rpc=`
     unavailable to it (the shipping bundle has no dev fences) — so the check is that the bootstrap
     inflates and the shell paints: `document.title` is Rake's, `#nav-docs` exists, and navigating to
     `#/docs` renders the twelve `h2`s with no `pageerror`. Record the console output. That is the
     two-chunk proof: a base64 that straddles two pointers, inflated.
   - Criterion 8's starting figures and this run's, in one table in the handoff: raw, gzip, chunks,
     `html()` bytes, inflated sha256.
8. **The trim list, for Phase 5.** Not trimmed here: write to the handoff, for each candidate, what
   it is, where it lives, and its gzipped cost measured as *bundle with the block removed* against the
   full bundle through the same `node app/build.mjs` invocation (three builds, one per candidate, on a
   scratch copy of `index.html` — nothing committed). Candidates, with what is known today:
   - the names block (`index.html:193–269`: `NAMES`, `ensName`, `regName`, `resolveName`,
     `resolveAddr`, `addrField`) — unexercised until M04 (decision 13);
   - `FEEPATH`, the landing diagram — +916 gzipped when it landed (t02 handoff § Size; decision 15
     keeps it, so this row is a price, not a proposal);
   - the editor, the drawer and the create view (`editorState`…`editorBind` from 452, `drawerHTML`
     722–762, `createView` from 830) — most of t03's +8,782 gzipped, by the t03 handoff's own reading;
     measure what the three are together.
   Say which of the three Phase 5 could drop without a ruling (none: the first needs decision 13 moved
   to M04's scope, the second decision 15, the third is criterion 4) — the list is a price list, and
   the question it answers is whether a one-chunk bundle is ever worth having back.
9. **Tests, size, clean.** `node --test test/*.test.mjs` passes with `test/docs.test.mjs`; `forge
   test` 36 passed (nothing under `src/` or `test/*.t.sol` changes); `forge snapshot --check` exit 0,
   run after `forge build --force` and never after `forge lint`; build free of `Warning (` and
   `warning[`; `forge lint` and `make fmt` silent; criterion 9's grep empty; `git status --porcelain`
   empty after every command in criterion 9's list and after `make chain-doc` (`out/` is ignored).
10. **Docs.** `AGENTS.md` § The dapp: one bullet for the docs page (generated lists, the struct string,
    `test/docs.test.mjs`); § The contract-hosted dapp: amend the `make chain-doc` bullet with the
    inflated output and the dev-bundle-last trap. `HANDOFF.md` beside this file, with § Size carrying
    the table from step 7 and § Trim list from step 8.

## Acceptance criteria

Each is a command the reviewer runs through `devbox run --`; multi-command checks are a script file
under `/tmp`, because `devbox run -- bash -c '…'` mangles `|` and `$VAR`. Baselines are `main` at
`66c77e5`, 2026-10-11, re-run rather than quoted.

- **M02 criterion 6.** `/tmp/t04-abi.sh` prints nothing and exits 0:

  ```
  #!/usr/bin/env bash
  set -eu
  forge inspect Distribution abi --json | jq -r '.[]|select(.type=="function")|.name' | sort -u > /tmp/abi-fns
  node -e '
    const s=require("fs").readFileSync("app/src/index.html","utf8");
    const m=s.match(/const DOCS_FNS\s*=\s*(\[[\s\S]*?\]);/); if(!m) process.exit(2);
    for (const r of eval(m[1])) console.log(r[0].replace(/\(.*/,""));
  ' | sort -u > /tmp/docs-fns
  diff /tmp/abi-fns /tmp/docs-fns
  ```

  Today the diff is 20 lines of `<` and the script exits 1, since `DOCS_FNS` does not exist (the
  node step exits 2 and the pipeline carries on; measured 2026-10-11). The same shape for
  `.type=="event"` against the events list and `.type=="error"` against the errors list, both held in
  consts the test reads. `grep -c 'id="s-' app/src/index.html` → 12, in DESIGN_HANDOFF § 3.3's order.
  `node --test test/*.test.mjs` passes and `test/docs.test.mjs` is among the files it reports; the
  struct assertion fails when one character of `src/Distribution.sol:10–30` is changed in a scratch
  copy (demonstrate once in the handoff, then restore — `git diff --stat -- src` empty).
- **M02 criterion 8, re-measured.** On a fresh anvil after `make deploy`: `make chunks` output
  carries `chunk 0` and `chunk 1`; `chunkCount()` → `2`; `gzipped()` → `true`; `make chain-doc`'s
  `inflated sha256` equals `sha256sum app/dist/index.html` taken after `make dapp-nodev`; the
  bootstrap inflates and paints `#/docs` in a browser with no page error. Raw, gzip, chunk count,
  `html()` bytes and the two hashes are in the handoff. If the bundle is under 24,000 gzipped, the
  `GZIP=false` run stands in and the handoff says so.
- **The landing's CTA reaches the widget section.** With `make serve` up, `#/docs#widget` renders the
  docs page scrolled to `s-widget` (Playwright: `location.hash` unchanged, `#s-widget` within the
  viewport), and `#/docs` renders with no wallet (`?rpc=` absent) without the "No wallet found" notice.
- **Nothing the prototype claimed survives unchecked.** The handoff's § Reference check lists each
  contract claim in the page with its `src/Distribution.sol` line; the three corrections in step 2 are
  on it. `grep -ci 'stipend' app/src/index.html` → 1 on `main` (line 818, the funds block's cold-path
  line); every hit this task adds is on a line that also says *cold*.
- **The trim list** is in the handoff with three measured gzipped figures, each labelled as measured
  on this branch's bundle with the named block removed.
- Criterion 9's `grep -rnE '\btip\b|govUrl|about:|ownerKind' app/src` prints nothing;
  `grep -c 'rake.distro' app/src/index.html` → 0; `grep -c 'style="' app/src/index.html` equals the
  `main` figure the handoff records (measure both); `forge test` 36 passed; `forge snapshot --check`
  exit 0 with no `Diff in`; build free of `Warning (` and `warning[`; lint and fmt silent;
  `git status --porcelain` empty after the criterion-9 list and after `make chain-doc`.
- `git diff --stat origin/main` names only `app/src/index.html`, `app/src/theme.css`,
  `test/docs.test.mjs`, `tools/chain-doc.mjs`, `AGENTS.md` and the handoff. `app/src/layout.html` is
  permitted if the rail needs a shell element; say so if it changes.

## Out of scope

- The widget — `widget.js`, `App.request(["widget.js"])`, the second chunk set, the host page,
  `Chunks.s.sol` and `src/App.sol` changes — t05. This task uploads with `Chunks.s.sol` as it is.
- Exercising name resolution — M04. The names block is measured for the trim list, not touched.
- Any trim beyond what the two-chunk proof needs — which is none. The trim list is written, not acted
  on; Phase 5 decides.
- Anything that touches `src/Distribution.sol`, `.gas-snapshot`, `test/*.t.sol`.
- `SECURITY.md`, the audits table's first real row, `PUSH_GAS`'s value, the named `release` error —
  M03. The page's security section says what the contract does today and no more.
- A `LICENSE` file. The page says MIT because every source file's SPDX header does; the file is
  Denizen's to add, and nothing here waits on it.
- Fixing criterion 2's wording ([#34](https://github.com/dnznlabs/rake/issues/34)) — done in
  `MILESTONE.md` by the PR carrying this plan, not by the engineer: the command passes once
  `ANVIL_PORT` and `APP_PORT` are in the environment (verified 2026-10-11 on `:8599`/`:3099`), and the
  criterion now says so. `make serve` remains the documented way.

## Open questions

- **Question.** What does the docs page's "how to report" line say before `SECURITY.md` exists?
  **Options.** (1) The repository's private vulnerability-report form,
  `https://github.com/dnznlabs/rake/security/advisories/new` — costs nothing, exists today, is private
  to the org while the repo is; (2) the prototype's `security@dnzn.dev` — costs a mailbox nobody has
  confirmed exists; (3) no line until M03 — costs a security section that tells a reader nothing.
  **Recommendation.** (1), and M03's `SECURITY.md` supersedes it. **Default and deadline.** (1), taken
  by the engineer at step 4 if no answer has arrived when the issue for this task opens; gates
  nothing. **Record.** `ROADMAP.md` § Decisions if ruled; otherwise this file is the record. Opened as
  a `decision` issue by the architect when this plan merges.

## Context

- Design: `docs/brainstorming/DESIGN_HANDOFF.md` § 3.3 (the twelve sections, the figures, the
  register); prototype `docs/brainstorming/design/rake-dapp.html` 127–144 (styles), 485–507 (figures),
  508 (`SECTIONS`), 509–545 (`vDocs`), 537 (snippet). `design/HANDOFF.md` § Vocabulary map, as
  superseded by decision 9.
- Decisions: 1, 2, 7 (criterion 9's grep), 9 (`applyQueued`, `beneficiaries`), 10 (sender-bound salts,
  the two operating rules for the Deployment section), 12 (`widget.js` served by `App`), 13 (names,
  unexercised), 15 (`FEEPATH` stays). Carried findings #18 (the stipend line), #22 (the `eth_getCode`
  refusal, worth one sentence under Deployment).
- Carried into this task: [#53](https://github.com/dnznlabs/rake/issues/53) (decided above),
  [#41](https://github.com/dnznlabs/rake/issues/41) (the submodule line in the setup),
  [#34](https://github.com/dnznlabs/rake/issues/34) (criterion 2's wording, fixed in `MILESTONE.md` by
  this plan's PR). Carried past it: [#54](https://github.com/dnznlabs/rake/issues/54),
  [#55](https://github.com/dnznlabs/rake/issues/55) from the t03 review — read them before starting; if
  either names `#/docs` or `tools/`, it is a defect in this plan, fixed here before work begins.
- Contract: `src/Distribution.sol` structs 10–30, events 32–38, errors 40–45, `PUSH_GAS` 48,
  `receive()` 106–110, `_push` 276–283, factory 293–363 (`implementation` 303, init code 332,
  `predict` 351). `src/App.sol`: `html()` 47–64 (bootstrap literal 51–62), `request()` 70–81,
  `chunkCount()` 125–127, `_raw()` 129–134. `scripts/forge/Chunks.s.sol`: `MAX_CHUNK` 13, the loop
  22–31. `tools/chain-doc.mjs` as it stands. `test/App.t.sol:21–27` (two tiny chunks, raw).
- Precedent: t02 handoff § Size (14,254, head-room 9,746) and § Deviations (`FEEPATH`'s tints); t03
  handoff § Size (23,036, head-room 964) and § Discoveries (the first paragraph is #53's origin).
- Measured 2026-10-11 on a scratch anvil at `:8599`, nothing committed: `Chunks.s.sol` with
  `GZIP=false` on the 74,811-byte raw bundle → `chunk 0`…`chunk 3`, `chunkCount()` 4, `html()` 74,811
  bytes, `make chain-doc` sha256 `c4de9156…` equal to `sha256sum app/dist/index.html`; the same deploy
  gzipped → one chunk, `html()` 31,393 bytes, `chain-doc` sha256 `5fd594d4…`, base64 payload byte-equal
  to `index.html.gz`, inflated byte-equal to `index.html`.
