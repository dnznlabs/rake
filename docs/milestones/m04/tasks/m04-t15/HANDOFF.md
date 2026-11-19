# m04-t15 — handoff

PR: #<n> · Branch: `m04/t15-page-fixes` · 2026-11-19

A distribution page now paints its frame from the address alone and fills as each read lands: `detail`
runs in three phases, the middle one under a sixth `VIEW` value `probing` where every write control is
drawn disabled rather than left out, and the history read still starts at the phase-1 paint so a slow
owner probe never holds the logs back. Every chain-reading route carries one `refresh` in the nav with
an `as of block N` stamp beside it, both read from the `eth_blockNumber` the page already made — `HEAD`
now keeps the promise rather than the number, so one route entry makes one request where main made
three, and `route` clears it so a press re-pulls rather than serving the boot value. A successor read
that rejects is caught into a third shape, `rejected`, and `heirRow` is the one row it costs the page
instead of the whole view. The three sentences decision 57 asked for are on the page, shipped as
drafted. `SECURITY.md` rows R9 and R19 are `fix` rows naming `#258`. No upload is started.

## Acceptance criteria

Baselines are step 0's, re-run on this branch's base `e770054` (`origin/main`) on 2026-11-19 through
the devbox pin (node `v24.12.0`, forge `1.7.1`), and every one of them reproduced the figure TASK.md
records. Every grep is `devbox run -- grep -ic -F '<pattern>' app/src/index.html` unless it names
another file. The browser figures are the dev build (`make dapp`) on a dev stack on `ANVIL_PORT=8599`
/ `APP_PORT=3099`, `app/dist` served by `python3 -m http.server`, with main's dev build of `e770054`
served beside it on `:3098` for every comparison; every page was opened as
`…/?rpc=…&from=<address>#/<route>` and the `location.search` assertion on `from=<that address>` ran
before any result was read, in every case.

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | `git diff --name-only origin/main -- . ':!docs'` → **5** files, and they are exactly `SECURITY.md`, `app/src/index.html`, `app/src/layout.html`, `app/src/theme.css`, `test/heir.test.mjs`. That 5 is also the whole diff's denominator: `git diff --name-only origin/main` → 5 at the last code commit `ebf137d`, this handoff being the one file outside the list and the only thing added after it. `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/ audits/ app/src/widget.js app/src/eth.js app/src/model.js app/build.mjs app/broadcast.mjs app/values.mjs` → empty. |
| 2 | pass | Both reds of step 4 planted once and quoted below under § Planted reds, each with `devbox run -- node --test test/heir.test.mjs` and its exit status. The browser reds of 9 (a), (b) and (c) are recorded in rows 3, 4 and 5 and quoted under § Planted reds. One sub-prediction of the plan did not hold and is declared under § Deviations: red 2 fires on its first assertion, not on an `undefined` rendered in the `<a>`. |
| 3 | pass | 9 (a), two measurements (§ Deviations, first entry): with every `eth_call` delayed 2,000 ms, first `.sechead` **4,076 ms** on the branch against **10,130 ms** on main; entering the same route by hash after boot, **12–13 ms** on the branch against **6,044 ms** on main — the figure "< 1,000 ms" is about. At the phase-1 paint on the featured distribution (its `Seed.s.sol` entry moved into its apply window out of the page), **1** `button[data-send],button[data-copy]`, `{"key":"apply:0","label":"apply","disabled":true,"title":"checking who you are…"}`, every one disabled; main's one paint draws the same control already `disabled:false`. Settled enabled sets equal on both builds: on the vault demo `["send:dist:0x0000000000000000000000000000000000000000"]`, on the featured distribution `["apply:0","claim:0x68B1…1aed:0x7099…79C8","dist:0x0000…0000","rel:0x68B1…1aed:0x7099…79C8"]`. `probing` → `4` (baseline `0`). |
| 4 | pass | 9 (b). One `#refresh` on `#/` and `#/distros` and on a distribution page, `hidden` on `#/docs` and `#/create` (`{"refresh":{"hidden":true,…},"asof":{"hidden":true,…}}`). In flight: `{"text":"reading…","disabled":true}`, read in the same tick as the click; `refresh`/enabled after. Stamp **`as of block 27` → `as of block 29`**, strictly greater. The out-of-page `distribute` (block 29) is on the page without a reload: the activity total went `show all 12` → `show all 14` and the newest row became `distributed Ξ0.0100 by the table · block 29 · 0x3990…abb1`. The press issued **exactly one** `eth_blockNumber`, and its method set and counts are identical to a route entry's: `{"eth_getCode":1,"eth_getBlockByNumber":1,"eth_blockNumber":1,"eth_call":8,"eth_getBalance":2,"eth_getLogs":3}`. Greps: `as of block` → `1`; `id="refresh"` in `app/src/layout.html` → `1`; `HEAD = null` → `2` (baseline `1`); `eth_blockNumber` → `1`, unchanged. |
| 5 | pass | `devbox run -- node --test test/heir.test.mjs` → `ℹ tests 7 · ℹ pass 7 · ℹ fail 0`, exit `0` — the six rows of step 4 plus one for the `null` heir (§ Deviations). 9 (c) on all three targets: a `foreign` heir (a distribution created through `#/create` forwarding 100 % to the implementation), the same page with that heir's `eth_getCode` answered `{"error":{"code":-32000,"message":"execution reverted"}}`, and that rejected read — in every case the page painted (`h1` `"forwards to the implementation"`, heads `["funds","changes","activity"]`), the row read the step-4 sentence, `links` to `#/distros/` was `[]`, and `page errors: none` with no unhandled rejection. Greps: `rejected: true` → `1`; `loadHeir` → `2`; `heirRow` → `2`; `forwards everything` → `2`; `not a distribution` → `2`. |
| 6 | pass | `distributed here at least once` → `2` (baseline `0`), one in the ledger's warning and one in `#/docs` § Receiving funds, the latter capitalised — both quoted from the built bundle under § The three sentences as shipped. 9 (e), on the featured distribution with one token distributed (the blocklist token, escrowed by `make fixtures`) and one received-only (a `DevToken` "SPAM" minted in out of the page): the `.status.warn` under `other tokens received (1)` reads `unverified — … once distributed it is listed above. listed means distributed here at least once — not checked, not endorsed.`, and `#/docs` § Receiving funds' second paragraph carries `Listed means distributed here at least once — not checked, not endorsed.`; on main neither is present. `devbox run -- node --test test/docs.test.mjs` → `ℹ tests 11 · ℹ pass 11 · ℹ fail 0`, the fourteen sections unchanged. |
| 7 | pass | 9 (d), the vault demo opened with the vault's signer, one `copy calldata for your vault` control pressed, in both branches. Clipboard branch: `{"status":"copied · 196 bytes","textarea":false,"cdmeta":"for 0xb8b4…37Fb on anvil · value Ξ0.0000 — check these three in your vault before signing.","cdmetaAddr":"0xb8b4f6966bE4420AFe4680b5bD503D9e930B37Fb"}`. Textarea branch, with `navigator.clipboard.writeText` replaced before any page script by a function that throws: `{"status":"clipboard refused — select all and copy","textarea":true,"cdmeta":"<the same line>","cdmetaAddr":"<the same address>"}`. `cdmetaAddr` is the distribution's own address, carried by `data-addr` because the target prints through `ext`; the chain is `cname(31337)` = `anvil`; the value contains `value Ξ0` as `value Ξ0.0000` (§ Deviations). On main `.cdmeta` is `null` in both branches. `cdmeta` → `2` (baseline `0`); `copied ·` → `1` and `copy calldata for your vault` → `1`, unchanged. |
| 8 | pass | All three quoted under § The three sentences as shipped, extracted from the built `app/dist/index.html` of `make dapp-nodev CHAIN_ID=11155111`, one hit each. Each equals the draft in TASK.md steps 4–6 character for character; TASK.md was not amended, so no Product Owner change is named. |
| 9 | pass | R9 and R19 both read `fix` and both name `#258`: `grep -c '^| R9 .*issues/258' SECURITY.md` → `1`, same for R19. `grep -c '^| R' SECURITY.md` → **24**; `grep -c 'accepted\`' SECURITY.md` → **6** (baseline `8`; the two rows left, the remaining six lines are the summary's and R1, R3, R14, R23, R24). The summary paragraph now reads eighteen `fix`, three `design`, three `accepted` — **18 + 3 + 3 = 24**, the row count. `git diff --stat origin/main -- audits/` → empty. `git diff origin/main -- SECURITY.md | grep -c '^[-+]| R18'` → **0**. |
| 10 | pass | `devbox run -- make dapp-nodev CHAIN_ID=11155111` → `widget: raw 8509 bytes · budget 10240 · 1731 left`, **equal to step 0's re-run `8509`, delta `0`**, and `wc -c app/dist/widget.js` → `8509`. `dapp:` line `raw 149332 bytes · gzip 47149 bytes` against the re-run baseline `raw 146563 · gzip 46448` — **raw +2,769, gzip +701**. Both chains' `sha256` under § For the next upload. |
| 11 | pass, one clause blocked | **CI did not run at this head and could not:** the `ci` workflow was queued by the push and failed in 2 s with `The job was not started because recent account payments have failed or your spending limit needs to be increased` (run `44563154187`), which is an account-level GitHub Actions billing block and not this branch's — the two other branches pushed to this repository within the same minute, `m04/t16-scope` and `m05/t01-remine`, failed identically in 2–3 s. Every one of CI's seven gates was therefore run locally on the pinned toolchain at this head, each with its exit code read directly: `devbox run -- pre-commit run betterleaks-tree --hook-stage manual --all-files --verbose` exit `0`, `scanned ~13826054 bytes (13.83 MB)` and `no leaks found` — CI's own "did the scan read anything" assertion (`scanned ~[1-9][0-9]{5,} bytes`) matches, so the gate measured the tree; `devbox run -- forge build --force` exit `0`, one `Compiler run successful` and zero `warning[` and `Warning (`; `devbox run -- make fmt` exit `0`; `devbox run -- make slither` exit `0`, `6 contracts with 75 detectors, 0 result(s) found`; `devbox run -- forge snapshot --check` exit `0`; `git status --porcelain` empty. The rest of this criterion: `devbox run -- make test` exit `0` — `107 tests passed, 0 failed` from `forge test` and `ℹ tests 174 · ℹ pass 174 · ℹ fail 0` from `node --test test/*.test.mjs`, against step 0's re-run `167`; the seven added are all in `test/heir.test.mjs` (`ℹ tests 7`) and no other file gained or lost one. `devbox run -- forge test` after `forge build --force` → `Ran 7 test suites … 107 tests passed, 0 failed, 0 skipped (107 total tests)`, unchanged from main because no Solidity byte differs: `git diff --stat origin/main -- src/ test/ scripts/ foundry.toml remappings.txt lib/` lists `test/heir.test.mjs` alone. `devbox run -- forge lint` exit `0`. `git status --porcelain` empty after `make dapp-nodev CHAIN_ID=11155111`. This table has twelve rows, one per criterion. The PR clause is the one thing here this branch cannot show: **no PR is open yet** — it is opened from `templates/PR.md` with `@lakkoss` as reviewer and the `Merge:` line left unfilled for the architect, after this handoff. |
| 12 | pass | No upload is started by this task: nothing under `calldata/` or `RUNBOOK.md` moved (AC 1's empty diff) and no M04 task row was added. § For the next upload names m05-t01's Run B on the redeployed testnets as the upload this bundle rides, with both chains' hashes and the list of what it carries. **The gate is open, read rather than assumed:** m05-t01 is split, and its Part A handoff on `origin/m05/t01-remine` states "Part B is not started" and "**no transaction was sent to any public chain**, nothing was proposed to a vault and `app/` was not touched" — so no Run B bundle has been built from `app/`, and the `calldata/11155111/` regeneration in that handoff's AC 5 is the tool rehearsal, not the upload's bundle. Part A is not merged either: `origin/main` is still `e770054`. Nothing needs re-sequencing. |

## Hunks

| Step | Sink or site | The change | Checked by |
|:-----|:-------------|:-----------|:-----------|
| 2 | `detail` `:1314`, `wctl` `:1077`, `sctl` `:1084`, `probeBtn` `:1076` | Three phases, each ending in a paint; `VIEW = 'probing'` between phases 1 and 2, under which `OWNS()`/`COPIES()` stay false and both control helpers return the control disabled and titled `checking who you are…`; the history read still starts at the phase-1 paint | AC 3 (9 (a)); `probing` → `4` |
| 3 | `head`/`stamp` `:244-245`, `route` `:2236`, `track` `:2220`, `chrome` `:2235`, `layout.html:10`, `theme.css:30-31` | One `refresh` and one `as of block N` in `.navr`; `HEAD` keeps the promise, `route` clears it; `track` holds the route's own promise and drives the button; both hidden on `#/docs` and `#/create` | AC 4 (9 (b)); four greps |
| 4 | `loadHeir` `:687`, `heirRow` `:877`, `paintDetail` `:1442` | A successor read that rejects answers `{ addr, rejected: true, why }`; one row, three answers — readable, unreadable, and `null` for the first paint | AC 5; `test/heir.test.mjs`, two planted reds, 9 (c) |
| 5 | `fundsHTML` `:1769`, `docs` `:2116` | One sentence in each, lowercase in the chrome and capitalised in the prose; no `#/docs` section added | AC 6 (9 (e)); `test/docs.test.mjs` |
| 6 | `cdCheck` `:204`, `copyCalldata` `:205`, `bindWrites` `:1114` | The write passes through the copy handler; both branches carry one `.cdmeta` line naming the target through `ext`, the chain and the value | AC 7 (9 (d)); `cdmeta` → `2` |

## Planted reds

**Red 1 — `loadHeir` without its `.catch`** (`const loadHeir = next => loadDistro(next);`), `devbox run
-- node --test test/heir.test.mjs`, exit `1`, `ℹ pass 6 · ℹ fail 1`:

```
✖ loadHeir answers a rejected read instead of rejecting with it
  AssertionError [ERR_ASSERTION]: Got unwanted rejection.
  Actual message: "execution reverted"
    operator: 'doesNotReject'
```

**Red 2 — `|| heir.rejected` dropped from `heirRow`'s condition**, same command, exit `1`, `ℹ pass 6 ·
ℹ fail 1`:

```
✖ heirRow names a heir whose read rejected and links nowhere
  AssertionError [ERR_ASSERTION]: <div class="status warn">superseded by <a href="#/distros/0x71a4221974Fc2E95081AE513248918dF27CF7a4A"></a> — this table forwards everything it receives.</div>
```

**The browser reds, all three on main's dev build of `e770054` served beside the branch's.** 9 (a): the
first `.sechead` at **6,044 ms** against the branch's **13 ms** for the same route entry, and at
**10,130 ms** against **4,076 ms** for a full navigation — main holds one `.notice` until the owner
probe answers. 9 (b): `document.getElementById('refresh')` → **`null`** and `#asof` → **`null`**; the
out-of-page `distribute` of block 31 was still absent after it landed (`show all 14`, newest row block
29) and arrived only on a real reload (`show all 16`, newest row block 31). 9 (c): with the heir's
`eth_getCode` answered `{"error":{"code":-32000,"message":"execution reverted"}}` the page stayed on
its notice — `{"h1":null,"warn":[],"notices":["reading 0x0029…7Ac7…"],"heads":[],"ledgerRows":0}` —
with one page error and the unhandled rejection `{"code":-32000,"message":"execution reverted"}`.

## The three sentences as shipped

Extracted from `app/dist/index.html` after `devbox run -- make dapp-nodev CHAIN_ID=11155111`, one hit
each, each identical to TASK.md's draft:

- R9, the ledger (decision 57 § 1): `listed means distributed here at least once — not checked, not endorsed.`
- R9, `#/docs` § Receiving funds: `Listed means distributed here at least once — not checked, not endorsed.`
- R19, beside the copied calldata (decision 57 § 2): ``for ${ext('address', w.to, short(w.to))} on ${cname(CFG.chainId)} · value ${eth(w.value ? w.value() : 0n)} — check these three in your vault before signing.`` — on the dev chain, `for 0xb8b4…37Fb on anvil · value Ξ0.0000 — check these three in your vault before signing.`
- #241 and decision 57 § 3, the heir row: ``forwards everything it receives to ${ext('address', next, short(next))} — not a distribution of this app's factory, so there is nothing to show for it.``

## Deviations from the plan

1. **Step 9 (a)'s "< 1,000 ms" cannot be read from a navigation with every `eth_call` delayed, so it
   was measured twice.** The plan delays *every* `eth_call` by 2,000 ms, which delays the boot read
   (`load()` — `implementation()`, then `MAX_BENEFICIARIES()` and `GRACE()`) that `route()` waits on,
   so on either build no route paints anything inside 1,000 ms of a navigation. Recorded: the plan's
   instruction exactly (branch **4,076 ms**, main **10,130 ms** to the first `.sechead`), and the same
   page entered by hash after boot with the delay installed first (branch **12–13 ms**, main
   **6,044 ms**) — which isolates the detail view's own four reads, is how a visitor reaches the page
   from `#/distros`, and is the figure criterion 3 is about. Both are in AC 3.
2. **`[data-send],[data-copy]` is not the write controls.** `ext` prints every address with a
   `<span class="cp" … data-copy="<the address>">` copy icon, so that selector counts twelve to twenty
   spans on a detail page. Every figure in AC 3 uses `button[data-send],button[data-copy]`, which is
   the controls `wctl` and `sctl` draw and nothing else.
3. **The ≥ 1 control at the phase-1 paint needed a page that has one.** On the vault-owned
   distribution the count is **0** on both builds, and an empty population reads as a pass for "every
   one is disabled": before the funds block lands, the only `button[data-send]` `paintDetail` can draw
   comes from `pendingActs`, and only for a queued entry whose delay has passed. So the count was taken
   on the featured distribution after moving its `Seed.s.sol` queue entry into its apply window out of
   the page (`cast rpc evm_increaseTime 608400`; delay 604,800, `GRACE` 1,209,600) — 1 control,
   disabled, quoted in AC 3. The vault-owned distribution's own 0 is recorded there too, with its
   settled enabled set against main's.
4. **`heirRow` has a third branch the plan does not list, and a seventh test row for it.** Step 2 sets
   `DS` with `heir: null` at phase 1, and `paintDetail` draws the row whenever `next` is truthy — so
   `heirRow(next, null)` is reached on the first paint of every superseded distribution, and reading
   `heir.missing` off `null` would throw there. The `null` branch reads `superseded by <address> —
   reading that distribution…`, which carries neither `forwards everything` nor `not a distribution`,
   so both greps are the `2` AC 5 asks for.
5. **Red 2 fires on its first assertion, not on an `undefined` in the `<a>`.** The plan predicts that
   dropping `|| heir.rejected` renders the string `undefined` inside the anchor; `esc` (`:320`) maps a
   null description to `''`, so the row is an anchor with **no label** — a link to a distribution the
   page has just failed to read. The red is quoted above; the test's third assertion pins the address
   through `ext` instead of the absent `undefined`.
6. **`theme.css` gains two rules, not one.** `.pill` sets `display:inline-flex`, which outranks the
   user-agent `[hidden]{display:none}`, so `hidden` on the refresh pill does nothing without a rule:
   `.asof` is the one rule the plan asks for, and `.asof[hidden],.pill[hidden]{display:none}` is what
   makes step 3's `hidden` on `#/docs` and `#/create` true rather than merely set.
7. **Phase 2 does not call `bindAll()` after `paintDetail()`.** The plan's phase 2 is `DS.heir = heir;
   VIEW = view; paintDetail()` and `bindAll()`; `paintDetail` already ends in `bindAll()` (`:1457`),
   so the second call would bind the same controls twice with the same handlers. Omitted.
8. **`probeBtn` carries `title="checking who you are…"` for both helpers.** The plan names the title
   for `sctl` only. One disabled control with an explanation and one without would be the same state
   told two ways, so both carry it.
9. **The branch is `m04/t15-page-fixes`, not the plan's `m04/t15-post-uat`.** The worktree was prepared
   under that name before the task started. Nothing else about the plan's § Plan preamble changed: the
   base is `origin/main` at `e770054`, which is after `78b5eb7`.
10. **9 (c)'s distribution was created through `#/create` as the plan says, but twice.** One per build,
    at different salt indexes, because a single distribution cannot be created twice (`#22`'s guard
    refuses a used salt — observed, quoted in § Discoveries). The branch and main runs therefore read
    two different addresses with the same one-row table.

11. **Criterion 11's "CI pass at the head" is not met, and cannot be met from here.** GitHub Actions
    is blocked on this account for billing, so the `ci` workflow fails in seconds without starting a
    job, on this branch and on every other branch pushed today. All seven of its gates were run
    locally on the pinned toolchain instead, with their exit codes, in AC 11. This needs the account's
    billing settled, not a change to this branch.

## Decisions

- **The stamp is written by `head()` rather than by each route.** `head()` is the one place the block
  number arrives, so `stamp` is called where it resolves and no route has to remember to write it; the
  three reading routes only have to *call* `head()`, which two of them already did through the history
  read.
- **`HEAD` keeps the promise, not the number.** The plan asks for exactly one `eth_blockNumber` per
  press. The old `HEAD ?? (HEAD = parseInt(await …))` re-entered before the first answer landed, so one
  page load made three (measured on main: `"eth_blockNumber":3` for one navigation). Memoising the
  promise makes it one, which is also what AC 4's count reads. One consequence worth knowing: a head
  read that fails now stays failed for that route entry instead of being retried by the next caller —
  `route` clears `HEAD`, so the next entry or press retries.
- **`.cdmeta` composes with `.status`.** The line is `class="status cdmeta"`, so it inherits the
  status family and `theme.css` needs no rule for it; `cdmeta` is the hook the grep and 9 (d) read.

## Discoveries

- **`make dapp` fails after `make fixtures` on the same dev chain.** `app/build.mjs` reads every
  broadcast log for the chain, and `Fixtures.s.sol`'s carries four mocks with no shape in
  `app/values.mjs`: `no shape declared for __REVERTINGRECEIVER__ … __MOCKERC20__ … __MOCKVAULT__ …
  __BLOCKLISTTOKEN__`, exit 1. `make deploy` builds the dapp before `make fixtures` runs, so the
  documented order hides it; rebuilding the dev bundle afterwards needs
  `broadcast/Fixtures.s.sol` moved aside. It is gitignored dev-chain output and was moved aside and
  put back for every dev build here. Not touched: `mk/*`, `app/build.mjs` and `app/values.mjs` are all
  out of this task's scope.
- **A Playwright `goto` to the URL the page is already at is a same-document navigation.** Nothing
  re-runs and no `hashchange` fires, so a `page.route` installed just before it is never exercised and
  a "reload" measures the previous load. Two readings in this check were wrong that way before being
  re-taken with `page.reload()` — 9 (b)'s main half and 9 (c)'s rejecting read. Worth a line in the
  next `app/` task's harness notes.
- **An activity row count saturates at ten.** `histFill` shows its newest `HIST_SHOW = 10` rows behind
  a `show all N`, so "the activity section carries the new row" reads unchanged at ten rows whichever
  way it goes. AC 4 reads the `show all N` total and the newest row's own block instead.
- **The create screen's `#22` guard was exercised by accident and held.** A re-run of 9 (c) at a used
  salt index painted `a distribution already exists at 0x0462…C737 — choose another salt #` with
  `#c-deploy` disabled and `a distribution already exists at this address for salt #11` on the status
  line — the refusal, before any transaction, that `createPredict` exists for.
- **`MockERC20` emits no `Transfer` and has no `symbol()`**, so it cannot stand in for a received-only
  token; 9 (e) needed `DevToken` (`test/mocks/Mocks.sol:404`), deployed with `forge create` and minted
  into the featured distribution. `AGENTS.md` § The dapp already says a token without `Transfer` events
  is invisible until distributed — this is that line being load-bearing.

## For the next upload

**This task starts no upload.** The bundle rides **m05-t01's Run B on the redeployed testnets**
(M05-D1, `docs/milestones/m05/MILESTONE.md` § Decisions, decision 54), as TASK.md § The upload says,
and that section has not been superseded on this file. m05-t01 Part A is on `origin/m05/t01-remine`
and unmerged, its handoff states Part B is not started and `app/` untouched, and `origin/main` is
still `e770054` — so **no Run B bundle has been built from `app/` yet** and nothing needs
re-sequencing. **This PR has to merge before m05-t01's Part B builds that bundle**, or the upload
carries the pre-fix document.

What the bundle carries, beyond anything merged after this: **R18** (m04-t14's computed featured
address, `c8fe478` — carried, not re-done; `git diff origin/main -- app/src/index.html` touches none of
`predictLocal`, `S.featuredLie` or `CFG.impl`, each at the same count before and after), **#243** parts
1 and 2, **#241**, **R9** and **R19**.

`devbox run -- make dapp-nodev CHAIN_ID=<chain>`, then `sha256sum`:

| Chain | `dapp:` line | `sha256 app/dist/index.html` | `sha256 app/dist/widget.js` |
|:------|:-------------|:-----------------------------|:----------------------------|
| 11155111 | `raw 149332 bytes · gzip 47149 bytes` | `6acc284bc034de10b6cccfa3f9c1b1446425331c6085c7a0e05f937117b07269` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |
| 84532 | `raw 149330 bytes · gzip 47146 bytes` | `391a00ec89096f9d4eeb014dc58004365bb6b43cf69f5c7a15a6aeecf1fba97d` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |

`widget.js` is byte-identical on both chains and byte-identical to `main`'s, at `8509` bytes — the
delta criterion 10 holds at `0`.

## For Denizen

Nothing is expected beyond the merge. The three sentences are decision 57's draft as accepted, shipped
character for character and quoted above; `TASK.md` was not amended, so there is no wording change to
ratify. The upload choice is TASK.md's and no part of it is started here.

## Open questions

None.
