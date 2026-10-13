# m02-t04 — handoff

PR: #60 · Branch: `m02/t04-docs` · 2026-10-13

`#/docs` is the prototype's twelve-section article rebuilt on the real contract. The route matches
`#/docs` by prefix and paints before the wallet checks, so the page reads with no wallet and on the
wrong chain, and `#/docs#<section>` scrolls to `id="s-<section>"` once the article exists — which is
what makes the landing's `Get the widget` CTA reach the widget section for the first time. The
reference section is generated rather than typed: `DOCS_FNS`, `DOCS_EVENTS`, `DOCS_ERRORS` and
`DOCS_FACTORY` are array literals the acceptance script diffs against `forge inspect Distribution abi`,
and the `Snapshot` struct is one `DOCS_STRUCT` string that `test/docs.test.mjs` asserts against
`src/Distribution.sol:10–30` line for line. Every sentence in the page that states contract behaviour
was read against `src/` — § Reference check below lists each with its line, including the three the
plan already knew were wrong and two more it did not. The two figures are hand-drawn inline SVG taking
every colour through a class on `currentColor`, the way the landing's `FEEPATH` does. The bundle is
**95,224 raw / 29,443 gzipped**, so the chain now serves it across **two SSTORE2 chunks**: `chunk 0`
and `chunk 1`, `chunkCount()` 2, concatenated by `App.html()`, base64'd into the bootstrap and inflated
in a browser — the first time the gzipped branch has ever run over more than one pointer.
`tools/chain-doc.mjs` was extended to inflate that payload so criterion 8 could be measured on the
page rather than on the loader.

## Acceptance criteria

All commands run through `devbox run --` (forge/cast `1.7.1-dev`, node `v24.12.0`), on a fresh anvil
at `:8599` after `make deploy`. `jq` is in `devbox.json` and not on the host, so the scripts below run
inside devbox too.

| AC | Result | Evidence |
|:---|:-------|:---------|
| **M02 criterion 6** — the page's lists are the real ABI | pass | `/tmp/t04-abi.sh` (reproduced in § The acceptance script) prints nothing and exits 0, for `.type=="function"` against `DOCS_FNS`, `.type=="event"` against `DOCS_EVENTS` and `.type=="error"` against `DOCS_ERRORS`. On `main` it was 20 lines of `<` and exit 1. `grep -c 'id="s-' app/src/index.html` → `12`, in DESIGN_HANDOFF § 3.3's order (asserted by the last test below, which compares the rendered id order with `SECTIONS`). |
| **M02 criterion 6** — the struct is pinned | pass | `node --test test/*.test.mjs` → `tests 46 · pass 46 · fail 0`, `test/docs.test.mjs` among the files (`node --test test/docs.test.mjs` → `tests 8 · pass 8`). Changing one character of `src/Distribution.sol:12` (`uint96 bps;` → `uint96 bips;`) fails it: `AssertionError … + 'uint96 bps;\n' / - 'uint96 bips;\n'`. Restored; `git diff --stat -- src` prints nothing. |
| **M02 criterion 8, re-measured** — two chunks, served | pass | `make chunks`: `chunk 0 0xCafac3dD…052c` **and** `chunk 1 0x9f1ac54B…3a8e`, `payload bytes 29443`, `html() bytes 39937`. `cast call $APP "chunkCount()(uint256)"` → `2`; `"gzipped()(bool)"` → `true`. |
| **M02 criterion 8** — the chain's page is the built page | pass | After `make dapp-nodev`: `make chain-doc \| awk '$1=="inflated" && $2=="sha256"{print $3}'` → `ce38fd317c29c9ba980d85ee387df2ded04a984ca8d2b39884b352a40a10f4b4`, and `sha256sum app/dist/index.html \| cut -c1-64` → the same. See § Size for the whole table and § Deviations for the two traps this crosses. |
| **M02 criterion 8** — the bootstrap inflates and paints | pass | `out/chain/index.html` served over HTTP to the Playwright chromium with no `?rpc=`: `document.title` `"RAKE"`, `#nav-docs` present (text `"docs"`), no `atob(` left in the DOM, `#/docs` renders `h2 count 12` — `Abstract · Motivation · How it works · Contract reference · The table · The timelock · Push, escrow, release · Deployment · The widget · Security · Source · Lineage` — with 12 rail links and 43 `.ftab` rows. **`console messages (none)` · `page errors (none)`.** |
| **The landing's CTA reaches the widget section** | pass | Clicking `Get the widget` on the landing (dev bundle, `?rpc=`): `CTA href "#/docs#widget"` → `location.hash "#/docs#widget"` (unchanged), `#s-widget` `in viewport true (top 20 of 720), scrollY 6106`, heading `"The widget"`, `h2 count 12`, `errors (none)`. Loading `#/docs#widget` directly on the shipping bundle gives the same, as does the chain-served document. |
| **`#/docs` renders with no wallet** | pass | Shipping bundle over HTTP, `?rpc=` absent, no wallet in the page: `No wallet found  absent`, `h2 count 12`, `scrollY 0`, `console / errors (none)`. The chain table's last row is `anvil · 0x5FbDB2315678afecb367f032d93F642f64180aa3 · dev chain`, which is the address `make addresses` prints for `DistributionFactory`. |
| **Nothing the prototype claimed survives unchecked** | pass | § Reference check below: every contract claim on the page with its `src/Distribution.sol` line, the plan's three corrections among them. `grep -ci 'stipend' app/src/index.html` → `3` (1 on `main`), and `grep -ni stipend … \| grep -ci cold` → `3`, so every hit is on a line that also says *cold*. |
| **The trim list** | pass | § Trim list: three figures, each measured as this branch's bundle with the named block removed, through one `node app/build.mjs` invocation. |
| **Criterion 9's vocabulary grep** | pass | `grep -rnE '\btip\b\|govUrl\|about:\|ownerKind' app/src` prints nothing. |
| **The rest of criterion 9's list** | pass | `grep -c 'rake.distro'` → `0`; `grep -c 'style="'` → `5`, the `main` figure (measured both); `grep -cE '#[0-9a-fA-F]{6}'` → `0`; `forge test` → `36 tests passed, 0 failed`; `forge snapshot --check` exit 0 with `Diff in` count `0`; `forge build --force` with `Warning (` count `0` and `warning[` count `0`; `forge fmt --check` and `forge lint` silent; `git status --porcelain` empty after the list and after `make chain-doc` (`out/` is ignored). |
| **The diff names only the permitted files** | pass | `git diff --stat origin/main` → `AGENTS.md`, `app/src/index.html`, `app/src/theme.css`, `test/docs.test.mjs`, `tools/chain-doc.mjs`, and this handoff. `app/src/layout.html` did **not** change — the rail needed no shell element. |

### The acceptance script

`/tmp/t04-abi.sh`, extended from the plan's to cover all three lists, because
`devbox run -- bash -c '…'` mangles `|` and `$VAR`:

```bash
#!/usr/bin/env bash
# M02 criterion 6: the docs page's three reference lists against the real ABI.
# Prints nothing and exits 0 when the page and `forge inspect` agree.
set -eu
page=app/src/index.html
check() { # $1 abi .type  $2 const name
  forge inspect Distribution abi --json | jq -r ".[]|select(.type==\"$1\")|.name" | sort -u > "/tmp/abi-$1"
  CONST="$2" node -e '
    const s=require("fs").readFileSync("app/src/index.html","utf8");
    const m=s.match(new RegExp("const "+process.env.CONST+"\\s*=\\s*(\\[[\\s\\S]*?\\]);")); if(!m) process.exit(2);
    for (const r of eval(m[1])) console.log(r[0].replace(/\(.*/,""));
  ' | sort -u > "/tmp/docs-$1"
  diff "/tmp/abi-$1" "/tmp/docs-$1"
}
check function DOCS_FNS
check event DOCS_EVENTS
check error DOCS_ERRORS
n=$(grep -c 'id="s-' "$page")
[ "$n" = 12 ] || { echo "id=\"s- count is $n, expected 12"; exit 1; }
```

## Size

Criterion 8's figures, beside the two the plan carried. Everything measured through devbox, since the
gzip depends on the node build's zlib.

| | raw | gzip | chunks | `html()` bytes | notes |
|:--|--:|--:|--:|--:|:--|
| t02 | — | 14,254 | 1 | — | t02 handoff § Size |
| t03 / `main` at `98f1b89` | 74,811 | 23,036 | 1 | 31,393 | re-measured here, byte-identical to the plan's baseline |
| **t04, this branch** | **95,224** | **29,443** | **2** | **39,937** | 1,743 over the plan's ~27,700 estimate |

Hashes for the run above:

| | value |
|:--|:--|
| `make chain-doc` → `sha256` (the bootstrap wrapper) | `2dbf4eeadb625c8447305e73d4744043aa82afd72a6d166771c50d7d85396aa0` |
| `make chain-doc` → `inflated sha256` (the page) | `ce38fd317c29c9ba980d85ee387df2ded04a984ca8d2b39884b352a40a10f4b4` |
| `sha256sum app/dist/index.html` after `make dapp-nodev` | `ce38fd317c29c9ba980d85ee387df2ded04a984ca8d2b39884b352a40a10f4b4` |
| `payload bytes` / `inflated bytes` | 29,443 / 95,224 — equal to the built `.gz` and the built page |

**Baseline difference from the plan: none on the greps or the bytes.** `main` at `98f1b89` reproduces
the plan's figures exactly — `raw 74811 bytes · gzip 23036 bytes`, and `id="s-abstract"`,
`struct Snapshot`, `beneficiaries()`, `widget.js`, `Lineage`, `rake.distro` and the `#rrggbb` grep all
0, `style="` 5, `stipend` 1. The one figure that moved is the plan's **estimate**: the docs segment
cost 6,407 gzipped rather than the estimated ~4,650, so the bundle landed at 29,443 rather than near
27,700. Two chunks either way, and no step of the plan depended on the smaller number.

## Trim list

For Phase 5, as step 8 asks: not trimmed here. Each figure is **this branch's bundle with the named
block removed**, built through one `node app/build.mjs --chain 31337 --set …` invocation on a scratch
copy of `index.html` and compared with the full bundle from the same invocation (full: raw 95,224 ·
gzip 29,443). Nothing was committed; `git status --porcelain` is clean after.

| candidate | where | raw saved | **gzip saved** | can Phase 5 drop it without a ruling? |
|:--|:--|--:|--:|:--|
| the names block | `index.html:193–269` — `NAMES`, `ensName`, `regName`, `resolveName`, `resolveAddr`, `addrField` | 3,243 | **898** | No — decision 13 puts it here and M04 exercises it; dropping it moves that decision's scope. |
| `FEEPATH` | `index.html:591–608`, the landing diagram | 3,082 | **638** | No — decision 15 put it on the landing deliberately; this row is a price, not a proposal. |
| the editor, the drawer and the create view | `editorState`…`editorBind` `452–495`, `drawerHTML` `722–762`, `createView`…`paintCreate` `830–932` | 10,993 | **3,066** | No — the write screens are M02 criterion 4. |

Two things the list says that the individual rows do not.

**`FEEPATH` is cheaper than it was.** t02 measured it at **+916** gzipped when it landed; removing it
from this bundle gives back **638**. The diagram did not change — the bundle around it did, and gzip
shares more of it the more there is. Any figure in this table is a property of this bundle at this
size, which is why they are re-measured rather than carried.

**Removing all three does not get a one-chunk bundle back.** Measured in a fourth build with every
candidate above deleted: `raw 77906 bytes · gzip 24824 bytes` — still **824 bytes over** the
24,000-byte `MAX_CHUNK`, before t05 adds `widget.js` and the host page. So the question step 8 poses —
whether a one-chunk bundle is ever worth having back — is answered for Phase 5 by arithmetic rather
than by taste: it is not reachable from this list at all, and the only way back would be cutting
something no row here proposes cutting. The two-chunk path now has a browser-verified run behind it,
which is the cheaper half of that trade.

## Reference check

Every sentence on the page that states contract behaviour, with the line it was read against. Checked
against `src/Distribution.sol` at `98f1b89`; nothing under `src/` changed.

| § | claim on the page | line | |
|:--|:--|:--|:--|
| how, security | the receive path only guards and logs, and a clone's delegatecall to a **cold** implementation costs more than the 2,300-gas stipend on its own — pay in with `call` and gas | `107–110`, ROADMAP § Findings ([#18](https://github.com/dnznlabs/rake/issues/18)) | **corrected** — the prototype said it "stays under the 2,300-gas stipend" |
| reference | `applyQueued(bytes,uint32)`, and the table getter is `beneficiaries()` | `170`, `218` | **corrected** — the prototype had `apply(action, nonce)` and `table()`; decision 9. The UI verb stays "apply". |
| reference | the errors are the six the ABI prints, `Unauthorized` among them; the factory's two are under Deployment | `40–45`, `299–300` | **corrected** — the prototype's list was five and omitted `Unauthorized`; the lists are generated now, so this class of error cannot recur |
| escrow | an **ETH** share is pushed with `PUSH_GAS`; an **ERC-20** push is bounded by the token, not by that constant | `48`, `277–279` vs `281` | **corrected** — the prototype said each share takes the fixed allowance |
| deploy | the clone address depends on the factory and the salt alone, and one factory address across chains is a later milestone's deployment | `309–314`, `318–320` | **corrected** — the prototype said "the same address can be claimed on every chain" without that condition |
| abstract | anyone triggers a split; only the owner proposes; every change waits the delay | `114`, `151`, `161–165`, `175` | ✓ |
| abstract | one `snapshot()` call carries the table, the labels and the pending list | `211–215` | ✓ |
| motivation | no cut is taken; no key but the owner's; no upgrade path | `114–134` (the whole unreserved balance is split), `90`, ROADMAP decision 5 | ✓ |
| how | `propose(bytes)` stages in public; `applyQueued` is permissionless after the eta | `150`, `170–175` | ✓ |
| table | shares are basis points and must sum to 10,000, or the table is refused | `49`, `241` | ✓ |
| table | the last row takes the integer remainder, so nothing is dust | `123` | ✓ |
| table | accounts must be strictly ascending, which deduplicates and keeps the first row above the zero address; a zero share is refused | `236` | ✓ |
| table | `name` and `note` live on chain | `10–15` | ✓ |
| timelock | `queued[keccak256(abi.encode(action, nonce))] = eta` | `154`, `162` | ✓ |
| timelock | the four setters are reachable only through a self-call, the delay's own included | `89–92`, `193–208` | ✓ |
| timelock | `cancel` is the owner's and immediate | `183–191` | ✓ |
| timelock | a delay of zero runs inline and logs `Queued` and `Applied` in one transaction | `156–159` | ✓ |
| timelock | an action that reverts stays queued, because the deletes roll back with it | `177–179` (and [#54](https://github.com/dnznlabs/rake/issues/54)) | ✓ |
| timelock | renouncing leaves nothing that can propose or cancel | `151`, `185`, `205–208` | ✓ |
| escrow | a failed push escrows that share and the rest still go out | `126–131` | ✓ |
| escrow | `release` retries, anyone may call it, and a failed retry reverts leaving the escrow | `136–146` | ✓ |
| escrow | `reserved[token]` keeps escrowed funds out of the next split | `115`, `129` | ✓ |
| escrow | a token returning nothing from `transfer` counts as success; anything else must answer with a word **equal to one** | `282` | ✓ — see § Discoveries, the contract's own comment says "non-zero" |
| deploy | PUSH0 minimal-proxy clones by CREATE2, salt's top 20 bytes must equal `msg.sender` | `329–338` | ✓ |
| deploy | the sender fixes the address, the owner does not enter it; each chain is a separate contract | `309–314`, decision 10 | ✓ |
| deploy | `predict(salt)` is readable before deployment, and value sent with `create` rides the CREATE2 with no `Received` log | `351–362`, `306–307`, `338` | ✓ |
| deploy | `init` is factory-only; neither factory nor implementation can receive ETH | `99`, `108`, `293–295` | ✓ |
| deploy | a second `create` on a used salt consumes the whole gas limit before `DeploymentFailed` — read the code at `predict(salt)` first | `315–317`, [#22](https://github.com/dnznlabs/rake/issues/22) | ✓ |
| security | the owner is trusted *over a delay*; fee-on-transfer settles by balance; a receiver needing more than `PUSH_GAS` is always escrowed; the contracts are immutable | `115`, `48`, `277–279`, decision 5 | ✓ |
| source | MIT by every file's SPDX header; a clone's runtime is solady's PUSH0 proxy with the implementation inside it | `1`, `332–338` | ✓ — verified on chain, § Decisions |
| widget | reads `snapshot()` and nothing else | `211–215` | ✓ — the rest of that section is design, not contract behaviour; `widget.js` itself is t05 (decision 12) |

## Deviations from the plan

**Three tables use `.dtab` rather than new `.chains` and audit grids.** Step 4 asked for the
prototype's `.chains` table and its audits table. `theme.css` already carries `.dtab` + `.scroll` from
t03, which is the project's docs table and fits both: their cells are short and `white-space:nowrap` is
right for them. `.ftab` was added as the plan says, because its last column is a sentence that has to
wrap and a `.dtab` cell does not — and the events, errors and factory lists use it too, with the
caller column reading "emitted by" / "thrown by", so the four reference tables are one pattern instead
of three. Net: one new table class rather than three.

**The figure tint classes `.t0/.t1/.t2` did not gain `.fig`.** Step 5 named them; neither figure
carries an accent tint (the prototype's do not either), so widening a selector for a rule nothing
matches would have been dead CSS. The classes the figures do use were widened instead: `.fig` gets
`.r` (rule), `.m` (muted), `.d` (dim), `.q` (amber) and `.pa` (paper, for the text on the filled
`applied` box), all `color` declarations resolved through `currentColor` exactly as `FEEPATH` does.
Every colour still comes from `theme.css`, and `grep -cE '#[0-9a-fA-F]{6}'` is 0.

**`theme.css` gained three resets the plan did not predict,** on `.rail`: `display:block`, `padding:0`
and `border-bottom:0`. See § Discoveries — the rail is the page's second `<nav>` and the base styles
the bare element. The alternative, scoping the header's rule to `.frame>nav`, edits a DNZN Base v1 rule
that is not this task's to change.

**`make serve` was not used for the browser checks; two static servers were.** The criterion says
"with `make serve` up". `make serve` hosts the *dev* bundle, and three of the four page checks are
stronger against the bundle that ships (no `/*DEV*/` fences, no `?rpc=`), which is also the bundle
whose hash matches the chain. So `app/dist` was served on `:3097` holding the non-dev bundle, and
`out/chain` on `:3098`. The one check that genuinely needs a provider — clicking the CTA on the
landing, which `route()` will not paint without one — was taken on the dev bundle with `?rpc=`,
which is what `make serve` would have given it.

**`make chain-doc`'s hash is taken in a stated order, and the plan's two traps both bit.** Both were
real, and both are now in `AGENTS.md`:
- `make deploy` rebuilds the dev bundle **last**, so `app/dist/index.html` straight after a deploy is
  the 95,672-byte dev build. Measured here: `after make deploy … 95672 bytes 57762e7ca8e199e2…`,
  `after make dapp-nodev … 95224 bytes ce38fd317c29c9ba…`, chain `inflated sha256 ce38fd317c29c9ba…`.
  The order is: deploy, then `make dapp-nodev`, then compare.
- `make chain-doc` hashed the bootstrap wrapper, not the page, so criterion 8 could not pass as the
  tool stood. `tools/chain-doc.mjs` now also decodes the `atob` payload, `gunzipSync`s it, writes
  `out/chain/index.inflated.html` and prints `payload bytes`, `inflated bytes` and `inflated sha256`.
  An uncompressed document prints none of the three, exactly as before.

Everything else followed the plan.

## Decisions

**[#57](https://github.com/dnznlabs/rake/issues/57) — the "how to report" line: option 1, by default.**
No ruling had arrived when this task started, so step 4's stated default was taken: the security
section links the repository's private advisory form,
`https://github.com/dnznlabs/rake/security/advisories/new`, with "there is no bounty programme yet".
M03's `SECURITY.md` supersedes it. Per #57 § Record, this file is the record until it is ruled.

**The clone verification line was verified on chain before it shipped.** Step 4 asked for
`cast call <factory> "implementation()(address)"` extended with `cast code <clone>` against solady's
PUSH0 init code (`Distribution.sol:332`). The page prints the expected runtime as
`0x5f5f365f5f37365f73<implementation>5af43d5f5f3e6029573d5ffd5b3d5ff3` — the init code's 45-byte
`CODECOPY` body, not the init code itself. Confirmed against the featured clone on the dev chain:

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
  class on the header), which is a `design-base` v2 proposal under `AGENTS.md` § Design, not an edit
  here. Worth carrying: t05's widget host page is the next thing likely to want a second nav.
- **`_push`'s comment and its code disagree about what a token must return.**
  `src/Distribution.sol:275` says a token "must answer with a non-zero word"; line 282 requires
  `abi.decode(data, (uint256)) == 1`. A token returning `2` is treated as failure and escrowed. The
  code is almost certainly right (it is the ERC-20 convention) and the comment is loose; the page says
  what the code does. Nothing under `src/` was touched. M03's reviewer may want the comment fixed.
- **`forge inspect Distribution abi` prints 20 function names, and `test/fixtures/abi/selectors.txt`
  carries 13 of them.** The fixture has no public getters at all, which is why the struct assertion and
  the ABI diff are the real checks and the fixture is a spot check. If `tools/abi-vectors.sh` ever
  grows the getters, `test/docs.test.mjs` tightens for free.
- **The docs page is 6,407 gzipped bytes, not the ~4,650 the plan estimated** — see § Size. The
  estimate was built from the prototype's segment appended to t03's bundle; the shipped section is
  longer because the generated lists carry 39 rows against the prototype's 6, and because five
  corrections are each a sentence the prototype did not have.
- **`jq` is in `devbox.json` but not on the host**, so criterion 6's script has to run inside
  `devbox run --` rather than being piped into it. Mentioned only because the plan's text runs the
  script directly.

## Open questions

None. #57's default was taken and is recorded above; nothing else in this task needed a ruling.
