# m04-t15 — Post-UAT page fixes: first paint, refresh, the heir read, and three sentences

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, a distribution page paints its frame from the address alone and fills as each
read lands, every chain-reading route carries one `refresh` control with an `as of block N` stamp
([#243](https://github.com/dnznlabs/rake/issues/243)); a successor read that rejects costs the page
nothing but one row ([#241](https://github.com/dnznlabs/rake/issues/241)); and the three sentences
decision 57 asked for are on the page — what "listed" means in the ledger and in `#/docs` (R9), the
target, chain and value beside copied vault calldata (R19), and the row for a one-row forward whose
target is not a distribution (#241). `app/`, `test/*.mjs`, the `SECURITY.md` § Front end rows R9 and
R19, and the `#/docs` text inside `app/src/index.html` only; nothing under `src/`, no `.gas-snapshot`
change, no upload. This is the last `app/` change before M05, and its bundle is the one M05 uploads.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`).
Never `devbox run -- bash -c` with a pipe; write a script. Scratch files go under a directory outside
the repo. **Branch `m04/t15-post-uat` from `origin/main` at or after `78b5eb7`** (m04-t14 merged at
`0eaec45`; its `predictLocal` moved every line of `app/src/index.html` below `:399` by 24). Check
hooks with `ls .git/hooks | grep -v sample` → `pre-commit`, `post-commit`. **Line numbers below are
`main` at `78b5eb7`** for `app/src/index.html` and `app/src/layout.html`; trust names over numbers.
Elanik measured the #243 lines at `78b5eb7` on 2026-11-19
([#243 comment](https://github.com/dnznlabs/rake/issues/243#issuecomment-7002047647)); each one
here was re-read against that commit before it was cited. The line numbers inside #243 and #241 are
at `3751211` and are 24 lower than these from `detail` down, and #243's `:1257` was already off at
`3751211` (`supersededBy` is `:1258`, the `Promise.all` `:1259`). #243 also says three history
sections carry `loading…`; it is two. `:1385` is `funds`, under
`notice('reading the balances and the escrow…')`, and only `:1386` (`changes`) and `:1387`
(`activity`) say `loading…` — the count in step 0 is the measured one, not the issue's. [#227](https://github.com/dnznlabs/rake/pull/227) (m04-t12) is held and this task does not
depend on it or touch `logs()`/`histLogs()`, which it wraps.

**m04-t05 step 3 ([#245](https://github.com/dnznlabs/rake/issues/245)) does not gate this task.**
Both defects were found in the Product Owner's 2026-11-18 session and are reproduced in the issues
from the source; a step-3 finding that is new becomes its own issue and, if it is `app/`, rides the
same bundle only if it is scoped before step 9 below runs.

**Decision 57** ([#258](https://github.com/dnznlabs/rake/issues/258), ruled 2026-11-19, option 1(a):
the recognised set stays anyone's and the page says what "listed" means; the three sentences are
drafted on the plan and accepted by the Product Owner's merge of it). The sentences in steps 4–6 are
that draft, in the page's register — short, lowercase in the app's chrome, a plain sentence in
`#/docs`. The engineer writes them as they stand here; a change is the Product Owner's, made on this
file before the task starts, and the handoff quotes the text as shipped.

The browser check runs as m04-t13 step 9 did: `playwright-core` outside the repo driving the cached
chromium `AGENTS.md` § The dapp names, against the dev build (`make dapp`) on a dev stack on spare
ports (`ANVIL_PORT=<a> APP_PORT=<b> make deploy && make fixtures`), `app/dist` served with
`python3 -m http.server <b>` (never `npx serve`), the page opened with
`?rpc=http://127.0.0.1:<a>&from=<account>` and `location.search` read back through `page.evaluate`
and recorded before any result is read. `page errors: none` in every run. `make fixtures` creates a
distribution owned by a `MockVault` (`scripts/forge/Fixtures.s.sol:53`, `:69`, printed as `vault`),
which is the one whose page runs the owner probe when `from=` is any account that is not the vault.

0. **Baselines**, re-run at the branch point and recorded in the handoff with the commit and the
   date, never carried from here. On `main` at `78b5eb7`, 2026-11-19, through the devbox pin:
   `node --test test/*.test.mjs` → `ℹ tests 167 · ℹ pass 167 · ℹ fail 0`; `make dapp-nodev
   CHAIN_ID=11155111` → `dapp: raw 146563 bytes · gzip 46448 bytes · chain 11155111`, `widget: raw
   8509 bytes · budget 10240 · 1731 left`; `wc -c app/dist/widget.js` → `8509`; `git status
   --porcelain` empty after the build. Then these greps, every one `grep -ic -F '<pattern>'
   app/src/index.html` (case-insensitive, fixed string), the figure before being the denominator the
   figure after is read against; all measured at `78b5eb7`, re-run:
   - `as of block` → `0`; `id="refresh"` → `0`; `refresh` → `0`; `probing` → `0`.
   - `rejected: true` → `0`; `loadHeir` → `0`; `heirRow` → `0`; `forwards everything` → `1` (`:1378`,
     the one row); `not a distribution` → `1` (`:851`, `notFactory`).
   - `distributed here at least once` → `0`; `unverified` → `2` (`:1702`, `:2046`).
   - `cdmeta` → `0`; `copied ·` → `1` (`:200`); `copy calldata for your vault` → `1` (`:1043`).
   - `eth_blockNumber` → `1` (`:232`, `head`); `HEAD = null` → `1` (`:231`).
   - `notice('loading…')` → `2` (`:1386-1387`); `reading…` → `2` (`:1898` and a comment at `:1925`).
   - `grep -c '^| R' SECURITY.md` → `24`; `grep -c 'accepted\`' SECURITY.md` → `8`.
   - `node --test test/docs.test.mjs` → `ℹ tests 11 · ℹ pass 11`, the fourteen sections of `:88-95`.

1. **Read #243, #241 and the two `SECURITY.md` rows** (R9 at `:397`, R19 at `:407`) so each hunk
   below is written against the finding's reproduction and not this summary. Check: nothing to run;
   the handoff's rows cite the issue line each hunk answers.

2. **The first paint (#243, part 1), `detail` `:1268-1299` and `paintDetail` `:1374-1395`.** Today
   `detail` awaits `loadDistro` and `readClock` (`:1273`), then the heir load and `ownerView` (`:1283`),
   and only then paints (`:1289`); over a wallet's RPC each is a round trip, so the view is the one
   `reading 0x…` notice (`:1270`) until the owner probe (`signsFor`, `:1246`) answers. Restructure
   into three phases, each ending in a paint, with the `TOKEN`/`stale` guard (`:1100-1101`) at every
   `await` as today:
   - **Phase 0, no read.** Replace the notice at `:1270` with the frame: the eyebrow with the address
     and chain (`:1376`, which needs no read), an empty `<h1>`, and the four section heads of
     `:1385-1387` — the table's (`funds`), `changes`, `activity` — plus one for the table itself,
     each with `notice('reading…')` under it. The write controls are not yet drawn. This paint is
     synchronous: nothing precedes it but `closeDrawer()`.
   - **Phase 1, the distribution.** `await Promise.all([loadDistro(addr), readClock()])` as at `:1273`;
     `missing` and `foreign` paint `unreadable`/`notFactory` as today (`:1275`, `:1279`); then
     `addRecent`, and `paintDetail()` with `VIEW = 'probing'` — a sixth `VIEW` value beside the five
     at `:1037`, under which `wctl` (`:1040-1045`) returns its `data-send` button with `disabled`
     and `sctl` (`:1046-1050`) its button `disabled` with `title="checking who you are…"`; `OWNS()` and
     `COPIES()` are both false for it, so nothing is enabled early and the controls are present, which
     is what #243 asks (disabled until the probe answers; never absent, never enabled early). `DS` is
     set here with `heir: null`.
   - **Phase 2, the heir and the probe.** `await Promise.all([next ? loadHeir(next) : null,
     ownerView(d)])` (`loadHeir` is step 4's), then `DS.heir = heir; VIEW = view; paintDetail()` and
     `bindAll()`. The history read starts after phase 1's paint as it does today (`:1293`), not after
     phase 2, so a slow probe never holds the logs back.

   `paintDetail` is otherwise unchanged; it already repaints the whole view from `DS` and is what
   `absorb` and the drawer call. Check: the browser step 9 (a). `grep -ic -F probing
   app/src/index.html` ≥ `3` (the value, `wctl`, `sctl`; baseline 0).

3. **The refresh control and the stamp (#243, part 2), `app/src/layout.html:7-13` and `route`
   `:2142-2161`.** In `.navr` (`layout.html:7`), before the theme pill: `<span class="asof"
   id="asof"></span><button class="pill" id="refresh" aria-label="refresh">refresh</button>`. The
   stamp reads `as of block N` from `head()` (`:232`) — the `eth_blockNumber` the page already
   reads — and `head()` writes it whenever it resolves. `route()` sets `HEAD = null` at entry so a
   route entry re-pulls rather than serving the boot value, and `landing` (`:1105`), `list` (`:1893`)
   and `detail` call `head()` once in their read path so the stamp exists on routes that read no
   history. The button's handler is `route`; while the current route's read is in flight the button is
   `disabled` and its text `reading…`, restored when the paint that ends the read runs (a module-level
   `BUSY` promise `route` sets and the three routes resolve). `#/docs` and `#/create` read nothing at
   entry (`:2149`, `:1735`): the control and stamp are `hidden` there, and nowhere else. No
   per-section control (#243: one read repaints every section; a `re-read` in the history header
   waits on t05's figures and the #227 decision). Styling: one `.asof` rule in `app/src/theme.css`
   in the pill's family, no new colour.

   Check: the browser step 9 (b). `grep -ic -F 'as of block' app/src/index.html` → `1`; `grep -ic -F
   'id="refresh"' app/src/layout.html` → `1`; `grep -ic -F 'HEAD = null' app/src/index.html` → `2`
   (declaration and `route`; baseline 1); `grep -ic -F eth_blockNumber app/src/index.html` → `1`,
   unchanged — the stamp adds no request.

4. **The heir read and its row (#241 and decision 57 § 3), `detail` and `paintDetail:1378`.** Beside
   `loadDistro` (`:623`): `const loadHeir = next => loadDistro(next).catch(e => ({ addr: next,
   rejected: true, why: errText(e) }));` with a comment citing #241: EIP-7702 makes "has code" false
   as a proxy for "answers", and a read that reverts rejects the promise, which `Promise.all` at
   `:1283` then threw past the paint. `rejected` joins `missing` (`:625`) and `foreign` (`:629`) as the
   third shape a target can come back in, and nothing else in the page reads it. Then the row:
   replace the inline template at `:1378` with `heirRow(next, heir)` declared beside `notFactory`
   (`:851`):
   - a readable heir (none of `missing`, `foreign`, `rejected`): today's text — `superseded by
     <a href="#/distros/${next}">${esc(heir.description)}</a> — this table forwards everything it
     receives.`;
   - otherwise, **the decision 57 § 3 sentence, as drafted:** `forwards everything it receives to
     ${ext('address', next, short(next))} — not a distribution of this app's factory, so there is
     nothing to show for it.`

   Check: a new `test/heir.test.mjs` lifts both one-liners the way `ext.test.mjs` lifts a declaration
   (`one('const loadHeir =')`, `one('const heirRow =')`), with `loadDistro`, `errText`, `ext`, `esc`
   and `short` passed in as stubs. Rows: `loadDistro` rejecting with `Error('execution reverted')` →
   `loadHeir` resolves `{ addr, rejected: true, why: 'execution reverted' }`; `loadDistro` resolving
   `{ addr, description: 'x' }` → the same object through; `heirRow` with `{ description: 'DNZN
   fees' }` → contains `href="#/distros/` and `forwards everything it receives.`; with each of
   `{ missing: true }`, `{ foreign: true }`, `{ rejected: true }` → contains `not a distribution of
   this app's factory` and no `href="#/distros/`. **Predicted reds, two plants:** `loadHeir` without
   its `.catch` rejects the first row (`assert.doesNotReject` fails with `execution reverted`); the
   `|| heir.rejected` dropped from `heirRow`'s condition reds the `rejected` row with the link
   branch's text (`esc(undefined)` renders `undefined` inside an `<a>` — quote it). The visible
   behaviour is step 9 (c). Greps: `grep -ic -F 'rejected: true' app/src/index.html` → `1`;
   `loadHeir` → `2`; `heirRow` → `2`; `forwards everything` → `2` (both branches of `heirRow`);
   `not a distribution` → `2` (`notFactory` and the row).

5. **"listed" in the ledger and in `#/docs` (R9, decision 57 § 1).** The recognised set stays
   anyone's (option 1(a)); the page says what membership means. Two sites, one sentence:
   - the ledger's warning at `:1702`, which today reads `unverified — anyone can send any token to
     this address. Check a token before distributing it; once distributed it is listed above.`,
     gains before its full stop: `listed means distributed here at least once — not checked, not
     endorsed.` as its own sentence after the existing text (lowercase, the chrome's register);
   - the `#/docs` § Receiving funds paragraph at `:2046` (`Because anyone can send any token to the
     address, this page lists a token by name only once it has been distributed there. …`) gains the
     same sentence, capitalised: `Listed means distributed here at least once — not checked, not
     endorsed.` after its first sentence.
   No section is added to `#/docs` (`test/docs.test.mjs:95` pins fourteen). Check: `grep -ic -F
   'distributed here at least once' app/src/index.html` → `2` (baseline 0); `node --test
   test/docs.test.mjs` → 11 pass, fourteen sections.

6. **Target, chain and value beside the copied calldata (R19, decision 57 § 2), `copyCalldata`
   `:199-205` and the copy handler `:1068-1077`.** The handler passes `w` through: `copyCalldata(Eth.enc(
   w.sig, args), slot, w)`. Both branches of `copyCalldata` — the `copied · N bytes` status (`:200`) and
   the textarea fallback (`:202`) — gain one line under them, class `cdmeta`, **the decision 57 § 2
   sentence, as drafted:** `for ${ext('address', w.to, short(w.to))} on ${cname(CFG.chainId)} · value
   ${v} — check these three in your vault before signing.`, where `v` is `eth(w.value ? w.value() :
   0n)` through the page's own formatter (`:323`, `Ξ` + `amt`) and every `wctl` write today carries
   no value (`:1418`, `:1433`, `:935`: `value` absent), so `Ξ0` is what ships until one does. `ext` is the sink every address goes through (R2), so the target prints
   through it and nothing new is escaped by hand. Check: the browser step 9 (d); `grep -ic -F cdmeta
   app/src/index.html` → `2` (both branches; baseline 0); `grep -ic -F 'copied ·'` → `1`, unchanged.

7. **R18 is carried, not re-done.** m04-t14 fixed it on `main` (`c8fe478`, merge `0eaec45`;
   `SECURITY.md` row R18 reads `fix` and names `#235`), and its row says the change "rides the next
   upload". That upload is the one this task's bundle takes (§ The upload below). Check: nothing to
   change; the handoff § For the next upload lists R18 beside #243, #241, R9 and R19 as what the
   bundle carries, and `git diff origin/main -- app/src/index.html` touches none of `predictLocal`,
   `S.featuredLie` or `CFG.impl` (`grep -c` of each name equal before and after).

8. **`SECURITY.md` § Front end.** Rows R9 and R19 become `fix` rows in the shape R11's has: the
   hunk (file, function, commit), the test or the browser step, the grep with its baseline, `#258`
   (decision 57) as the ruling and m05-t01's Run B as the upload they ride. The summary paragraph
   (`SECURITY.md:373-377`) moves: `fix` up by two, the `accepted` rows from five to three (R1, R23 on
   the trust boundary; R24 carried for the `mount` signature), and "three (R9, R19, R24) are carried
   for wording" becomes one, with both the count sentence and the row count restated as the section
   does. R3's widget half and R14's chain half stay `accepted` in their rows. `AUDIT.md` is not
   touched. Check: `grep -c '^| R' SECURITY.md` → `24`; `grep -c 'accepted\`' SECURITY.md` → `6`
   (baseline 8: seven rows and the summary line; the two rows leave).

9. **The browser check**, on the dev stack as the preamble says, `location.search` read back first,
   `page errors: none` in every run, each with the figure the reviewer compares:
   - (a) **The first paint (#243 part 1).** `page.route` on the dev endpoint delaying every
     `eth_call` by 2,000 ms and passing everything else through; open `#/distros/<the vault-owned
     distribution>` with `from=<anvil account 1>` (not the vault, so `ownerView` runs `signsFor`).
     Record: the time from navigation to the first `.sechead` in the DOM (→ under 1,000 ms; before the
     fix the view holds one `.notice` until the probe answers, record that time as the red); at the
     phase-1 paint, the count of `[data-send],[data-copy]` buttons (≥ 1) and that every one is
     `disabled`; after the probe, the same selector's enabled set equal to what `main` paints for the
     same account (record both lists). Then the same page with `from=<the vault's signer>` → the
     `copy calldata for your vault` controls appear enabled only after the probe. Remove the route and
     load the seed distribution once: `h1` is its description, the `funds`, `changes` and `activity` sections painted.
   - (b) **Refresh (#243 part 2).** On the seed distribution's page, read `#asof`'s text (`as of block
     N`); from another anvil account send one `distribute` outside the page (`cast send`); press
     `#refresh`; record that the button reads `reading…` and is `disabled` while in flight, that
     `#asof` now names a block greater than `N`, that the activity section carries the new row, and —
     through `page.route` counting bodies — that the press issued exactly one `eth_blockNumber` and
     the same set of methods a route entry does (list both). Before the fix there is no `#refresh`
     (record `null` as the red) and the row appears only on reload. Then `#/`, `#/distros`: the stamp
     is present with a block; `#/docs`, `#/create`: `#refresh` and `#asof` are `hidden`.
   - (c) **The heir (#241).** `create` a distribution whose one row at 100 % is the implementation
     address (`S.impl`: code that is not the clone, so `loadDistro` returns `foreign` — #241's trigger
     set is unreachable on `main` because `isClone` answers first, which is the issue's own finding).
     The page paints fully and carries the step-4 sentence with the address and no link. Then
     `page.route` answering the heir's `eth_getCode` with a JSON-RPC error
     (`{"error":{"code":-32000,"message":"execution reverted"}}`) and passing everything else
     through — the one shape that rejects the promise: the page paints fully, the row reads the step-4
     sentence, and `page errors: none`. Before the fix the same route leaves the page on
     `reading 0x…` with the rejection in `page errors` — record it as the red.
   - (d) **R19.** As the vault's signer on the vault-owned distribution, press one `copy calldata
     for your vault` control; `#txs` contains `.cdmeta` whose text names the distribution's address
     (through `ext`, so `data-addr` carries it), `cname(31337)`'s text and `value Ξ0`. Record the
     text. For the fallback branch, `page.addInitScript` replaces `navigator.clipboard.writeText` with
     a function that throws, so `copyCalldata` takes its `catch`: the same line sits under the
     textarea.
   - (e) **R9.** On a distribution with one token distributed and one received-only: the ledger's
     `.status.warn` under `other tokens received` contains `listed means distributed here at least
     once`; `#/docs` § Receiving funds contains the capitalised form.
   - (f) **The whole page once more** with no route: a distribution page, `#/distros`, `#/docs`,
     `#/create` step 2, `#/` — `page errors: none`.

10. **`HANDOFF.md`** beside this file, from the handbook template: the AC table with one row per
    criterion below, the figures beside step 0's re-run baselines; one row per hunk (steps 2–6) with
    the sink or site, the change, the test or browser step, and the planted red quoted under its
    exact command; the three decision 57 sentences quoted **as shipped**; the byte deltas; § For the
    next upload with both chains' `make dapp-nodev` hashes and the list of what the bundle carries
    (R18, #243, #241, R9, R19), naming m05-t01's Run B as the upload unless § The upload below has
    been superseded on this file; § For Denizen with nothing expected beyond the merge, or what
    came up; § Discoveries.

## The upload

**This task starts no upload, and no M04 task row is added for one.** The bundle rides **m05-t01's
Run B on the redeployed testnets** (M05-D1, `docs/milestones/m05/MILESTONE.md` § Decisions, decision
54: the factory, the implementation and `App` are re-mined against `main`'s bytes and both testnets
are redeployed at the new addresses, with Run A, Run B and step 6 run again there). A Run C on the M04
`App` would be a third signing round for the Product Owner — three proposals per chain, co-signed,
executed after the hour's delay, as `RUNBOOK.md` § Uploads rows 3–4 record (about 98 M gas across the
two chains) — to serve a document that m05-t01 supersedes with the next thing it does, and the bundle
that upload carries is this one either way: m05-t01's row says it is scoped after #227's decision is
ruled "so the bundle this redeploy uploads is the one mainnet gets". The gate is therefore **this
task merges before m05-t01's step 4 is prepared**, and criterion 12 says so.

**Rejected: a separate row `m04-t16 — Run C`** on the M04 `App`, gated on this merge. It is the
shape m04-t10 had and the right one when a human step sits inside a build task (m04-t08's step 4
stalled on exactly that, M04-D4 → decision 44), and it would put the fixes on a public chain through
a wallet weeks before m05-t01 does. It costs the third signing round and the gas above for a document
with a known replacement date, and M04's criterion 6 is met on the `3751211` bundle by t05 step 3,
not on this one. Taken back off the shelf if m05-t01 slips past M04's close-out by more than the
Product Owner will wait: then the row is added, `not started`, with this task's merge as its gate.

## Acceptance criteria

Every figure is read at the review head, not quoted from here. Baselines are step 0's, re-run at the
branch point and recorded in the handoff with the commit. Every grep is `grep -ic -F` on
`app/src/index.html` unless it names another file. Twelve criteria.

1. **The diff is the plan.** `git diff --stat origin/main -- app/ test/ SECURITY.md` touches only
   `app/src/index.html`, `app/src/layout.html`, `app/src/theme.css`, `test/heir.test.mjs` and
   `SECURITY.md`, with the full diff's file count stated as the denominator; `git diff --stat
   origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/ audits/ app/src/widget.js
   app/src/eth.js app/src/model.js app/build.mjs app/broadcast.mjs app/values.mjs` is empty.
2. **Planted reds.** The two of step 4 planted once and quoted with `devbox run -- node --test
   test/heir.test.mjs`, plus the browser reds of step 9 (a), (b) and (c) recorded on the reviewed
   build. A plant that did not red is declared as a deviation with what did.
3. **First paint (#243 part 1).** Step 9 (a) as recorded: first `.sechead` under 1,000 ms with every
   `eth_call` delayed 2,000 ms, every write control present and `disabled` at the phase-1 paint, the
   enabled set after the probe equal to `main`'s for the same account; `probing` ≥ `3` (baseline 0).
4. **Refresh (#243 part 2).** Step 9 (b) as recorded: one `#refresh` on `#/`, `#/distros` and a
   distribution page, `hidden` on `#/docs` and `#/create`; `reading…` and `disabled` in flight; the
   stamp's block strictly greater after the press; the out-of-page `distribute` visible without a
   reload; `as of block` → `1`, `id="refresh"` → `1` in `app/src/layout.html`, `HEAD = null` → `2`,
   `eth_blockNumber` → `1` unchanged.
5. **The heir (#241).** `test/heir.test.mjs` with the six rows of step 4 passing; step 9 (c) as
   recorded on all three targets (foreign, reverting, rejected read) with the page painted and
   `page errors: none`; `rejected: true` → `1`, `loadHeir` → `2`, `heirRow` → `2`, `forwards
   everything` → `2`, `not a distribution` → `2`.
6. **"listed" (R9).** `distributed here at least once` → `2` (baseline 0), one in the ledger's
   warning and one in `#/docs` § Receiving funds, the latter capitalised; step 9 (e) as recorded;
   `node --test test/docs.test.mjs` passes with fourteen sections, none added.
7. **The calldata line (R19).** Step 9 (d) as recorded in both the clipboard and the textarea
   branch, the line naming the target through `ext`, the chain and `value Ξ0`; `cdmeta` → `2`
   (baseline 0); `copied ·` → `1` and `copy calldata for your vault` → `1`, unchanged.
8. **The sentences as shipped.** The handoff quotes the three decision 57 sentences from the built
   `app/dist/index.html` (not from this file), and each equals the draft in steps 4–6 or names the
   Product Owner's amendment to this file that changed it, with its commit.
9. **`SECURITY.md`.** Rows R9 and R19 read `fix` and name `#258`; `grep -c '^| R' SECURITY.md` → `24`;
   `grep -c 'accepted\`' SECURITY.md` → `6` (baseline 8); the summary paragraph's counts sum to 24;
   `git diff --stat origin/main -- audits/` empty; row R18 unchanged (`git diff origin/main --
   SECURITY.md | grep -c '^[-+]| R18'` → `0`).
10. **Bytes.** `make dapp-nodev CHAIN_ID=11155111` → `widget: raw N bytes · budget 10240 · M left`
    with `N` **equal to step 0's re-run `8509`, delta `0`** — nothing here touches `app/src/widget.js`
    — and `wc -c app/dist/widget.js` the same `N`; the `dapp:` line's `gzip` and `raw` figures
    recorded as signed deltas against step 0's re-run figures, and both chains' `sha256` of
    `app/dist/index.html` and `app/dist/widget.js` in the handoff § For the next upload.
11. **Nothing else moved.** `node --test test/*.test.mjs` passes with more tests than step 0's re-run
    `167` and the handoff names the added ones per file; `forge test` count unchanged from `main` and
    stated; `make fmt`, `forge lint` and CI pass at the head; `git status --porcelain` empty after
    `make dapp-nodev CHAIN_ID=11155111`; `HANDOFF.md` has an AC table with exactly twelve rows, one per
    criterion here, and the PR is from the handbook template with the architect (`@lakkoss`) as
    reviewer.
12. **The M05 gate.** This PR merges before m05-t01's Run B step 4 is prepared, and the handoff's
    § For the next upload says so with the hashes and the list of what the bundle carries; no upload
    is started by this task. If m05-t01's bundle has already been built when this is ready, the
    handoff says so and the architect re-sequences.

## Out of scope

- [#227](https://github.com/dnznlabs/rake/pull/227) (m04-t12, held on t05 step 3's wallet-path
  figures) and anything it touches: `logs()`, `histLogs()`, the Cache section, `MAX_WINDOWS`,
  [#165](https://github.com/dnznlabs/rake/issues/165).
- Any `src/` byte, `.gas-snapshot`, `RUNBOOK.md`, `scripts/forge/*`, `mk/*`, the Makefile, `calldata/`.
- The widget (`app/src/widget.js`): no chrome, reads once by design (#243); criterion 10 holds its
  size at delta `0`. The drop dapp and the vault dapp's refresh (#243's last paragraph) are their
  own repositories'.
- A per-section `re-read` control, a block-target history budget, any change to how often the
  history is read.
- New sections on `#/docs`; any `#/docs` text beyond the one R9 sentence; decision 53's gateway
  paragraph (its wording is the Product Owner's and is not drafted here).
- Making the recognised set the owner's (option 1(b), rejected by decision 57); a symbol allow-list.
- Replacing `S.impl` with `CFG.impl` for `isClone` (m04-t14 § Out of scope, still carried).
- The upload itself, m04-t05 step 3, and M05.

## Open questions

None. The upload choice is made in § The upload with its alternative named; the three sentences are
decision 57's draft, accepted by the merge of this file.

## Context

- [#243](https://github.com/dnznlabs/rake/issues/243) and [#241](https://github.com/dnznlabs/rake/issues/241),
  the two findings; [#258](https://github.com/dnznlabs/rake/issues/258), decision 57 (ruled
  2026-11-19, option 1(a)); `SECURITY.md` § Front end rows R9, R18, R19 as m04-t14 left them;
  [`audits/2026-11-17/frontend/AUDIT.md`](../../../../../audits/2026-11-17/frontend/AUDIT.md) § R9,
  § R19.
- [m04-t13 TASK.md](../m04-t13/TASK.md) step 9 and [HANDOFF.md](../m04-t13/HANDOFF.md) § For
  Denizen (the two R9 sentences quoted there); [m04-t14 TASK.md](../m04-t14/TASK.md) and
  [HANDOFF.md](../m04-t14/HANDOFF.md) § For the next upload (R18's hashes); [m04-t01
  HANDOFF.md](../m04-t01/HANDOFF.md) § The browser check (the harness).
- `ROADMAP.md` decisions 6 (a one-row table is a forward), 7 (calldata for a vault), 17 (the page's
  voice), 52 and its addendum (the held cache), 53 (the gateway boundary), 54 (the testnet redeploy
  this bundle rides).
- `docs/milestones/m05/MILESTONE.md` § Decisions M05-D1 and the m05-t01 row; `RUNBOOK.md` § Which
  run is this and § Uploads rows 3–4 (what a Run B costs).
