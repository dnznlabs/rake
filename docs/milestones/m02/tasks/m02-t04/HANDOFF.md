# m02-t04 — handoff

PR: #60 · Branch: `m02/t04-docs` · 2026-10-13, re-scoped 2026-10-17

`#/docs` is written for the owner of a distribution, in eleven short sections: what it is, why it
exists, how it works, creating one, paying in, paying out, changing it, ownership, the widget, limits,
and a closing section for developers that points at the repo and at `docs/REFERENCE.md`. The text is
a draft: Denizen writes the final page himself in Phase 5, before the signoff (ROADMAP § Order). That is ROADMAP
decision 17, ruled by Denizen in this PR's review; the first cut of this branch was the twelve-section
white paper DESIGN_HANDOFF § 3.3 asked for, and the architect's approval at `fc2d4cb` was of that cut.
The contract's own surface — every function, event and error, and the `Snapshot` struct verbatim —
moved from the page to `docs/REFERENCE.md`, and the drift check moved with it: `test/docs.test.mjs`
asserts the struct block there against `src/Distribution.sol:10–30` character for character, and
criterion 6's script diffs its three tables against `forge inspect Distribution abi`. Every sentence
on the page that states contract behaviour was read against `src/` — § Reference check lists each with
its line. The route matches `#/docs` by prefix and paints before the wallet checks, so the page reads
with no wallet and on the wrong chain, and `#/docs#<section>` scrolls to `id="s-<section>"` once the
article exists — which is what makes the landing's `Get the widget` CTA reach the widget section. The
two figures are hand-drawn inline SVG taking every colour through a class on `currentColor`, the way
the landing's `FEEPATH` does. The bundle is **85,737 raw / 26,349 gzipped**, so the chain serves it
across **two SSTORE2 chunks**: `chunkCount()` 2, concatenated by `App.html()`, base64'd into the
bootstrap and inflated in a browser — the first time the gzipped branch has run over more than one
pointer. `tools/chain-doc.mjs` was extended to inflate that payload so criterion 8 could be measured on
the page rather than on the loader.

## Acceptance criteria

All commands run through `devbox run --` (forge/cast `1.7.1-dev`, node `v24.12.0`), on a fresh anvil
at `:8599` after `make deploy ANVIL_PORT=8599`. `jq` is in `devbox.json` and not on the host, so the
scripts below run inside devbox too. Figures are from the re-scoped page on 2026-10-17; the first
cut's are in § Size for comparison.

| AC | Result | Evidence |
|:---|:-------|:---------|
| **M02 criterion 6** — the reference's tables are the real ABI | pass | `/tmp/t04-abi.sh` (reproduced in § The acceptance script) prints nothing and exits 0, for `.type=="function"` against `### Functions`, `.type=="event"` against `### Events` and `.type=="error"` against `### Errors` in `docs/REFERENCE.md`. `grep -c 'id="s-' app/src/index.html` → `11`, in decision 17's order (asserted by the last test below, which compares the rendered id order with `SECTIONS`). corrected 2026-10-30 ([#104](https://github.com/dnznlabs/rake/issues/104)): 13 since Phase 5; test/docs.test.mjs pins it — re-run rather than quote |
| **M02 criterion 6** — the struct is pinned | pass | `node --test test/*.test.mjs` → `tests 46 · pass 46 · fail 0`, `test/docs.test.mjs` among the files (8 tests). Changing one character of `src/Distribution.sol:12` (`uint96 bps;` → `uint96 bips;`) fails it: `+ '    uint96 bps;\n' / - '    uint96 bips;\n'`. Restored; `git diff --stat -- src` prints nothing. |
| **M02 criterion 6** — the page is the owner's | pass, as a draft | Eleven `h2`: `What it is · Why it exists · How it works · Creating one · Paying in · Paying out · Changing it · Ownership · The widget · Limits · For developers`. The text is Denizen's to finalise in Phase 5 (ROADMAP § Order); what ships here is the draft he reviewed on 2026-10-17 and took as is. No function table, no struct, no event or error list on the page; `grep -c 'REFERENCE.md' app/src/index.html` → `2`: the docs block's comment and the last section's link. Every contract claim on it is in § Reference check with its line. |
| **M02 criterion 8, re-measured** — two chunks, served | pass | `make deploy ANVIL_PORT=8599`: `chunk 0 0xCafac3dD…052c` **and** `chunk 1 0x9f1ac54B…3a8e`, `payload bytes 26349`, `html() bytes 35809`. `cast call $APP "chunkCount()(uint256)"` → `2`; `"gzipped()(bool)"` → `true`. |
| **M02 criterion 8** — the chain's page is the built page | pass | After `make dapp-nodev`: `make chain-doc ANVIL_PORT=8599` → `inflated sha256 21d47cf629f8eab70c6bb642510888294f0e2013d4ad2a446243126e7ddd1f44`, `inflated bytes 85737`, and `sha256sum app/dist/index.html` → the same hash, 85,737 bytes. `grep -c '<h2 id="s-' out/chain/index.inflated.html` → `11`. See § Size for the whole table and § Deviations for the two traps this crosses. |
| **M02 criterion 8** — the bootstrap inflates and paints | pass at `fc2d4cb`; **not re-run on the rewrite** | At `fc2d4cb`, `out/chain/index.html` served over HTTP to the Playwright chromium with no `?rpc=`: `document.title` `"RAKE"`, `#nav-docs` present, no `atob(` left in the DOM, `#/docs` painted 12 `h2` with `console messages (none) · page errors (none)`; the architect reproduced it. The chromium in `~/.cache/ms-playwright` does not start on this host (`libnspr4.so` missing), so the rewrite's check is weaker: every `<script>` in `app/dist/index.html` compiles under node's `vm.Script`, and `docs()` evaluated with stubbed `eyebrow`/`esc`/`cname`/`ext` paints 11 `h2`, 11 rail links, 7 chain rows (six "not deployed" and the dev chain's), 2 `<svg>`, and 31 `<p>` opened and closed. The bootstrap and the routing did not change in the rewrite. **The reviewer's browser pass is the one that counts.** |
| **The landing's CTA reaches the widget section** | pass at `fc2d4cb`; the id is unchanged | `#s-widget` is section 9 of 11 and `route()`/`docScroll` are untouched by the rewrite; `test/docs.test.mjs` now asserts the `widget` id exists, since the CTA depends on it. At `fc2d4cb`: `CTA href "#/docs#widget"` → `location.hash` unchanged, `#s-widget` in viewport, on a hash change and on a fresh load alike. |
| **`#/docs` renders with no wallet** | pass at `fc2d4cb`; the route is unchanged | The prefix match and the early return in `route()` are the same lines. The chain table's last row on a dev chain is `anvil · 0x5FbDB2315678afecb367f032d93F642f64180aa3 · dev chain`, which is the address `make addresses` prints for `DistributionFactory` (confirmed in the stubbed render above). |
| **Nothing the prototype claimed survives unchecked** | pass | § Reference check below: every contract claim on the page with its `src/Distribution.sol` line. `grep -ci 'stipend' app/src/index.html` → `3` (1 on `main`), and `grep -ni stipend … \| grep -ci cold` → `3`, so every hit is on a line that also says *cold*. |
| **The trim list** | pass, re-measured | § Trim list: three figures, each measured as this branch's bundle with the named block removed, through one `node app/build.mjs` invocation per build. **The conclusion changed with the rewrite:** removing all three now reaches one chunk. |
| **Criterion 9's vocabulary grep** | pass | `grep -rnE '\btip\b\|govUrl\|about:\|ownerKind' app/src` prints nothing. |
| **The rest of criterion 9's list** | pass | `grep -c 'rake.distro'` → `0`; `grep -c 'style="'` → `5`, the `main` figure; `grep -cE '#[0-9a-fA-F]{6}'` → `0`; `forge test` → `36 tests passed, 0 failed`, `forge snapshot --check` exit 0, build free of `Warning (`/`warning[`, lint and fmt silent — all at `fc2d4cb`, and the rewrite touches nothing under `src/` or `test/*.t.sol` (`git diff --stat fc2d4cb -- src test/*.t.sol` is empty), so none of them re-opens. `git status --porcelain` empty after the list and after `make chain-doc` (`out/` and `broadcast/` are ignored). |
| **The diff names only the permitted files, plus the ruling's** | pass | `git diff --stat origin/main` → `AGENTS.md`, `app/src/index.html`, `app/src/theme.css`, `test/docs.test.mjs`, `tools/chain-doc.mjs`, this handoff, and — for decision 17 — `docs/REFERENCE.md` (new), `docs/ROADMAP.md` and `docs/milestones/m02/MILESTONE.md`. `app/src/layout.html` did **not** change — the rail needed no shell element. |

### The acceptance script

`/tmp/t04-abi.sh`, reading `docs/REFERENCE.md` rather than the page since decision 17, because
`devbox run -- bash -c '…'` mangles `|` and `$VAR`:

```bash
#!/usr/bin/env bash
# M02 criterion 6: the contract reference's three Distribution tables against the real ABI.
# Prints nothing and exits 0 when docs/REFERENCE.md and `forge inspect` agree.
set -eu
ref=docs/REFERENCE.md
check() { # $1 abi .type  $2 markdown heading
  forge inspect Distribution abi --json | jq -r ".[]|select(.type==\"$1\")|.name" | sort -u > "/tmp/abi-$1"
  # The backticked rows under the heading, up to the first blank line; the name is the first cell's
  # identifier, args off. The header and the rule rows carry no backtick and are skipped.
  awk -v h="$2" '$0==h{on=1;next} on&&/^$/{if(seen)exit} on&&/^\| `/{seen=1;print}' "$ref" \
    | sed -E 's/^\| `([A-Za-z0-9_]+).*/\1/' | sort -u > "/tmp/docs-$1"
  diff "/tmp/abi-$1" "/tmp/docs-$1"
}
check function '### Functions'
check event '### Events'
check error '### Errors'
n=$(grep -c 'id="s-' app/src/index.html)
[ "$n" = 13 ] || { echo "id=\"s- count is $n, expected 13"; exit 1; }
```

## Size

Criterion 8's figures, beside the two the plan carried and the first cut's. Everything measured
through devbox, since the gzip depends on the node build's zlib.

| | raw | gzip | chunks | `html()` bytes | notes |
|:--|--:|--:|--:|--:|:--|
| t02 | — | 14,254 | 1 | — | t02 handoff § Size |
| t03 / `main` at `98f1b89` | 74,811 | 23,036 | 1 | 31,393 | re-measured, byte-identical to the plan's baseline |
| t04 first cut, `fc2d4cb` | 95,224 | 29,443 | 2 | 39,937 | the twelve-section white paper; 1,743 over the plan's ~27,700 estimate |
| **t04, this branch** | **85,737** | **26,349** | **2** | **35,809** | the owner's page; 3,094 gzipped back from the first cut, 2,349 over `MAX_CHUNK` |

Hashes for the run above:

| | value |
|:--|:--|
| `make chain-doc` → `sha256` (the bootstrap wrapper) | `924f97460c5a0ceda925d9c3618226e9320c54c6c230de4c2a2d1a6c44ab328b` |
| `make chain-doc` → `inflated sha256` (the page) | `21d47cf629f8eab70c6bb642510888294f0e2013d4ad2a446243126e7ddd1f44` |
| `sha256sum app/dist/index.html` after `make dapp-nodev` | `21d47cf629f8eab70c6bb642510888294f0e2013d4ad2a446243126e7ddd1f44` |
| `payload bytes` / `inflated bytes` | 26,349 / 85,737 — equal to the built `.gz` and the built page |

**Baseline difference from the plan: none on the greps or the bytes.** `main` at `98f1b89` reproduces
the plan's figures exactly. The docs segment now costs 3,313 gzipped against the plan's ~4,650
estimate for the prototype's segment — the owner's page is shorter than the white paper was, and the
39 reference rows it no longer carries are most of the difference.

## Trim list

For Phase 5, as step 8 asks: not trimmed here. Each figure is **this branch's bundle with the named
block removed**, built through one `node app/build.mjs --chain 31337 --set …` invocation on the source
with the lines cut and restored after (full: raw 85,737 · gzip 26,349). Nothing was committed;
`git diff --stat -- app/src/index.html` after the runs is the rewrite's own diff and nothing else.

| candidate | where | raw saved | **gzip saved** | can Phase 5 drop it without a ruling? |
|:--|:--|--:|--:|:--|
| the names block | `index.html:193–269` — `NAMES`, `ensName`, `regName`, `resolveName`, `resolveAddr`, `addrField` | 3,243 | **902** | No — decision 13 puts it here and M04 exercises it; dropping it moves that decision's scope. |
| `FEEPATH` | `index.html:591–608`, the landing diagram | 3,082 | **600** | No — decision 15 put it on the landing deliberately; this row is a price, not a proposal. |
| the editor, the drawer and the create view | `editorState`…`editorBind` `452–495`, `drawerHTML` `722–762`, `createView`…`paintCreate` `830–929` | 10,993 | **3,031** | No — the write screens are M02 criterion 4. |

Two things the list says that the individual rows do not.

**Any figure here is a property of this bundle at this size.** `FEEPATH` measured +916 gzipped when
it landed in t02, 638 against the first cut, 600 now; the names block 898 against the first cut, 902
now. The blocks did not change — the bundle around them did, and gzip shares more or less of it. That
is why they are re-measured rather than carried.

**Removing all three now reaches a one-chunk bundle, which the first cut could not.** Measured in a
fourth build with every candidate above deleted: `raw 68419 bytes · gzip 21791 bytes` — **2,209 bytes
under** the 24,000-byte `MAX_CHUNK`, where the first cut's same build was 824 over. So the question
step 8 poses — whether a one-chunk bundle is ever worth having back — is live again for Phase 5, with
two things against it: every row above says "no" on its own, and t05 still has to add `widget.js` and
the host page to a bundle that would then hold 2,209 bytes of head-room. The two-chunk path has a
browser-verified run behind it at `fc2d4cb` and the same bootstrap now, which is the cheaper half of
that trade.

## Reference check

Every sentence on the page that states contract behaviour, with the line it was read against. Checked
against `src/Distribution.sol`, unchanged since `98f1b89` (`git diff --stat 98f1b89 HEAD -- src` is
empty). Where the claim is about this dapp rather than the contract, the line is `index.html`'s.

| § | claim on the page | line | |
|:--|:--|:--|:--|
| what | anyone triggers the split; only the owner proposes; every change waits the delay in public | `114`, `151`, `161–165`, `175` | ✓ |
| what | no cut is taken; no key over it but the owner's; no upgrade path | `114–134` (the whole unreserved balance is split), `90`, decision 5 | ✓ |
| create | the owner is the address allowed to propose and cancel; the create screen fills in the connected wallet | `151`, `185`; `index.html:827` (`owner: ACC`) | ✓ |
| create | a delay of zero lands the change the moment it is proposed, and this interface flags it | `156–159`; `index.html:368`, `402` (amber `none — changes apply instantly`), `860` (the create screen's hint) | ✓ |
| create | shares sum to 100%; a zero share and a repeated address are refused; the contract keeps the rows sorted by address and the highest address takes the remainder; names and notes are on chain | `241`, `236` (strictly ascending, so no duplicate), `123` (the last row of an ascending table), `10–15`; the dapp sorts before sending, `index.html:459` | ✓ — "sorted by address" is the owner's reading of "must be strictly ascending": the contract refuses any other order and the dapp supplies that one |
| create | the address is known before deploy and the create screen shows it; it depends on the factory and the salt, and the salt is tied to the creating key; a vault can be the owner from the first block; ETH sent with create lands in the clone | `351–362`, `309–314`, `318–320`, `329–330`, decision 10, `306–307`, `338`; `index.html:880` (`c-predict`), `876`, `892` (the deposit) | ✓ — "the same address on every chain where the factory sits at the same address" is the corrected form of the prototype's unconditional claim |
| paid | nothing moves on its own; a contract paying in with `.transfer()`/`.send()` can fail because the stipend does not cover the call into a **cold** implementation — pay in with `call` and gas | `114` (the only path out is `distribute`), `107–110`, ROADMAP § Findings ([#18](https://github.com/dnznlabs/rake/issues/18)) | ✓ |
| paid | a payer can pay in and pay out in one transaction by calling `distribute` after sending | `114` (permissionless) | ✓ |
| payout | anyone may distribute and pays the gas; one token per call, ETH counted as one; each payee paid directly in table order | `112–114` (`address(0)` for ETH), `118–131` | ✓ |
| payout | a payee that cannot receive has that share held and the others are still paid; a held share stays out of later splits; anyone may release it; a release that fails leaves it held | `126–131`, `115`, `129`, `136–146` | ✓ |
| payout | an ETH payout carries a fixed 100,000-gas allowance, so a payee needing more is always held | `48`, `277–279` | ✓ |
| change | propose, wait, anyone applies; table, description, delay and owner are each their own proposal | `150`, `170–175`, `193–208` | ✓ |
| change | cancel is the owner's and immediate; the current table stays until someone applies; a failed apply stays pending | `183–191`, `170–175`, `177–179` (and [#54](https://github.com/dnznlabs/rake/issues/54)) | ✓ |
| change | changing the delay waits the delay in force; zero applies in the proposing transaction; the wallet shows `propose`, `applyQueued`, `cancel` | `89–92`, `201`, `156–159`, the ABI | ✓ |
| handover | ownership moves by proposal; the contract knows one address; per chain | `205–208`, `151`, decision 10 | ✓ |
| handover | the zero address renounces: nothing can propose or cancel again, and it cannot be undone | `151`, `185`, `205–208` | ✓ |
| widget | reads `snapshot()` and nothing else | `211–215` | ✓ — the rest of that section is design, not contract behaviour; `widget.js` itself is t05 (decision 12) |
| trust | the owner is trusted *over a delay*; fee-on-transfer settles by balance; a payee needing more than the allowance is always held; the cold stipend line; immutable | `115`, `48`, `277–279`, `107–110`, decision 5 | ✓ |
| developers | MIT by every file's SPDX header; one file, no imports; the page is a renderer contract's `html()` | `1`, the file, `src/App.sol` | ✓ |

The first cut's five corrections to the prototype — the cold-path stipend, `applyQueued` and
`beneficiaries`, the sixth error, ETH-only `PUSH_GAS`, and the conditional same-address claim — are
all still what the page says, in the owner's words.

## Deviations from the plan

**The page was re-scoped at review, under decision 17.** The plan, DESIGN_HANDOFF § 3.3 and criterion
6 as written all asked for a technical reader's white paper, and `fc2d4cb` delivered it. Denizen's
review found it read as developer docs for a page whose reader is the owner of a distribution, and
ruled; the rewrite is on this branch for the architect's re-review rather than in a new task, by
Denizen's choice. The contract reference moved to `docs/REFERENCE.md` with its test, so criterion 6's
drift check is kept — § Acceptance criteria shows it still fails on one character — and criterion 6
was reworded in `MILESTONE.md` to say where each half lives.

**Three tables use `.dtab` rather than new `.chains` and audit grids.** Step 4 asked for the
prototype's `.chains` table and its audits table. `theme.css` already carries `.dtab` + `.scroll` from
t03, which is the project's docs table and fits both. The `.ftab` grid the first cut added for the
reference lists went with them: net, no new table class.

**The figure tint classes `.t0/.t1/.t2` did not gain `.fig`.** Step 5 named them; neither figure
carries an accent tint, so widening a selector for a rule nothing matches would have been dead CSS.
The classes the figures do use were widened instead: `.fig` gets `.r` (rule), `.m` (muted), `.d`
(dim), `.q` (amber) and `.pa` (paper, for the text on the filled `applied` box), all `color`
declarations resolved through `currentColor` exactly as `FEEPATH` does. Every colour still comes from
`theme.css`, and `grep -cE '#[0-9a-fA-F]{6}'` is 0. The figures' labels were reworded for the owner
(`payee`, `pending`, `cannot receive: held · release retries`); the drawings did not change.

**`theme.css` gained three resets the plan did not predict,** on `.rail`: `display:block`, `padding:0`
and `border-bottom:0`. See § Discoveries — the rail is the page's second `<nav>` and the base styles
the bare element. The alternative, scoping the header's rule to `.frame>nav`, edits a DNZN Base v1 rule
that is not this task's to change. The rail also gained `margin-top:40px`, so its `sections` eyebrow
sits level with the article's eyebrow, whose 40px top margin `.rail .eyebrow`'s reset had dropped.

**`make serve` was not used for the browser checks; two static servers were.** The criterion says
"with `make serve` up". `make serve` hosts the *dev* bundle, and three of the four page checks are
stronger against the bundle that ships (no `/*DEV*/` fences, no `?rpc=`), which is also the bundle
whose hash matches the chain. So `app/dist` was served on `:3097` holding the non-dev bundle, and
`out/chain` on `:3098`. The one check that genuinely needs a provider — clicking the CTA on the
landing, which `route()` will not paint without one — was taken on the dev bundle with `?rpc=`.
Those checks are from `fc2d4cb`; see the criterion 8 row for why the rewrite's browser pass is the
reviewer's.

**`make chain-doc`'s hash is taken in a stated order, and the plan's two traps both bit.** Both were
real, and both are now in `AGENTS.md`:
- `make deploy` rebuilds the dev bundle **last**, so `app/dist/index.html` straight after a deploy is
  the dev build (86,185 bytes on this branch). The order is: deploy, then `make dapp-nodev`, then
  compare.
- `make chain-doc` hashed the bootstrap wrapper, not the page, so criterion 8 could not pass as the
  tool stood. `tools/chain-doc.mjs` now also decodes the `atob` payload, `gunzipSync`s it, writes
  `out/chain/index.inflated.html` and prints `payload bytes`, `inflated bytes` and `inflated sha256`.
  An uncompressed document prints none of the three, exactly as before.

Everything else followed the plan.

## Decisions

**[#57](https://github.com/dnznlabs/rake/issues/57) — the "how to report" line: option 1, by default.**
No ruling had arrived when this task started, so step 4's stated default was taken: the `Limits`
section links the repository's private advisory form,
`https://github.com/dnznlabs/rake/security/advisories/new`, with "there is no bounty programme yet".
M03's `SECURITY.md` supersedes it. Per #57 § Record, this file is the record until it is ruled.

**Decision 17 — the page is the owner's, and the text is Denizen's to finish.** Ruled by Denizen on
2026-10-17 in this PR's review; the entry in `ROADMAP.md` § Decisions has the options and what it
supersedes. Two drafts were written on the branch that day: a nine-section one in the second person,
which he read as having a tone, and the eleven-section one that ships — what it is, why, how, then the
tasks, in plain sentences — which he took as is, with the note that he will write the final text
himself before the Phase 5 signoff. ROADMAP § Order now says so. The wallet's
names for the three steps — `propose`, `applyQueued`, `cancel` — appear once, in `Changing it`, because
the owner will meet them in a prompt and should recognise them; the other code spans on the page are
the two words a payer's developer needs (`call`, not `.transfer()`/`.send()`) and the widget snippet.

**The clone verification lines moved to `docs/REFERENCE.md` with the rest of the reference.** They
were verified on chain before they shipped in the first cut and are unchanged:

```
implementation  0x870C3710016cFe9e51f0eaA98c177E6d185402Ad
featured clone  0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
runtime code    0x5f5f365f5f37365f73870c3710016cfe9e51f0eaa98c177e6d185402ad5af43d5f5f3e6029573d5ffd5b3d5ff3
expected        0x5f5f365f5f37365f73870c3710016cfe9e51f0eaa98c177e6d185402ad5af43d5f5f3e6029573d5ffd5b3d5ff3
```

**The rail's links are real links, and the rail is a `<nav>`.** The plan asked for `#/docs#<section>`
rather than the prototype's `data-sec` handler; kept, and the element stays `<nav aria-label="sections">`
so the page has two labelled navigations rather than one and a styled div. The cost is the three
resets in § Discoveries.

**`docScroll` lives beside `route()` rather than inside `docs()`.** Scrolling is the router's job: the
same function has to answer both a fresh load of `#/docs#widget` and a `hashchange` from a rail click,
and `docs()` repaints identically in either case.

## Discoveries

- **The base styles the bare `nav` element, so a second `<nav>` on a page arrives wearing the header's
  clothes** — `theme.css:18` sets `display:flex`, `justify-content:space-between`, `padding:16px 0` and
  a bottom rule on every `nav`. The docs rail rendered as a wrapped flex row with a border until three
  properties were undone on `.rail`. The base's own fix is to scope that rule (`.frame>nav`, or a
  class on the header), which is a v2 proposal for the shared design system under `AGENTS.md` § Design, not an edit
  here. Carried as an issue on the shared design system.
- **`_push`'s comment and its code disagree about what a token must return.**
  `src/Distribution.sol:275` says a token "must answer with a non-zero word"; line 282 requires
  `abi.decode(data, (uint256)) == 1`. A token returning `2` is treated as failure and escrowed. The
  code is almost certainly right (it is the ERC-20 convention) and the comment is loose. Nothing under
  `src/` was touched. Carried as #61; the owner's page no longer states either reading, and
  `docs/REFERENCE.md` says nothing about return words — M03 settles the pair and the reference's
  `distribute` row is re-read then.
- **`forge inspect Distribution abi` prints 20 function names, and `test/fixtures/abi/selectors.txt`
  carries 13 of them.** The fixture has no public getters at all, which is why the struct assertion and
  the ABI diff are the real checks and the fixture is a spot check. If `tools/abi-vectors.sh` ever
  grows the getters, `test/docs.test.mjs` tightens for free.
- **The owner's page is 3,094 gzipped bytes smaller than the white paper**, and that is enough to make
  one chunk reachable again from the trim list (§ Trim list). The first cut's conclusion that it was
  unreachable by arithmetic is withdrawn; the rows' individual "no" answers stand.
- **The reference check now cites `index.html` lines as well as the contract's.** An owner's page
  says what the create screen does (fills in the wallet, shows the address, takes a deposit) and how
  the dapp flags a zero delay; those are claims about this dapp, true today and worth re-reading if
  the create flow changes in Phase 5.
- **`jq` is in `devbox.json` but not on the host**, so criterion 6's script has to run inside
  `devbox run --` rather than being piped into it. Mentioned only because the plan's text runs the
  script directly.

## Open questions

None. #57's default was taken and is recorded above; decision 17 is recorded in `ROADMAP.md`.
