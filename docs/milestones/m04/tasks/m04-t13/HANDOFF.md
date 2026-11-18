# m04-t13 — handoff

PR: #236 · Branch: `m04/t13-audit-fixes` · 2026-11-18

Twelve of the 2026-11-17 front-end rollup's findings closed at their sink or input, in seven commits
one per finding group, across `app/inline-scripts.mjs`, `app/src/eth.js`, `app/src/index.html`,
`app/src/model.js`, `app/src/widget.js` and six test files. The shape of the work is the plan's: a
check at the sink, a node test that is red without it, and a browser step where the behaviour is
visible — thirteen node reds planted one at a time and six browser reds read on the before build.
Three of the twelve are not reachable from node without a DOM or a wire (`data-rake`, `data-link`,
`tx`'s chain re-read), and those are proved in the browser alone. `SECURITY.md` § Front end now
carries 13 `fix` rows, 3 `design` and 8 `accepted`; the six it carries past this task say why. No
`src/` byte, no `.gas-snapshot` row and no upload moved, and the bundle this PR builds is the one the
next Run B carries with m04-t11 and m04-t04.

**Code was last touched by `89a84c3`**; `git diff --stat 89a84c3 HEAD -- app/ test/` is empty, so
every figure below was read at that tree and only documentation has moved since.

## Baselines (step 0, re-run at the branch point)

Re-run at **`b7260b0`** (`origin/main`, the merge of #231, which is the merge base of this branch),
**2026-11-18**, through `devbox run --` with node `v24.12.0` and forge `1.7.1-dev`. **The plan's own
step-0 figures were stale and are not used:** they were measured on `main` at `3d4f4cf`, before #230
merged, exactly the drift step 0 warned about.

| Measurement | Plan quoted (`3d4f4cf`) | Re-run at `b7260b0` |
|:--|:--|:--|
| `node --test test/*.test.mjs` | `tests 109 · pass 109 · fail 0` | **`tests 118 · pass 118 · fail 0`** |
| `make dapp-nodev CHAIN_ID=11155111`, `dapp:` | `raw 143339 · gzip 45535` | **`raw 143623 · gzip 45617`** |
| `make dapp-nodev CHAIN_ID=11155111`, `widget:` | `raw 8132 · 2108 left` | **`raw 8132 · budget 10240 · 2108 left`** |
| `wc -c app/dist/widget.js` | `8132` | **`8132`** |
| `forge test` | not quoted | **`107 tests passed, 0 failed` in 7 suites** |

Every step-0 grep re-run at `b7260b0` returned the plan's figure exactly: `noreferrer` `0`/`0`,
`noopener` `7`/`1`, `u202E` `0`/`0`, clone bytes `0`, `d.pending.length` `1`, `checksumOk` `8`,
`eth_chainId` `1`/`2`, `javascript:` `0`, `indexOf('<script'` `1`, `plainName` `0`/`0`/`0`, and the
M02 criterion 9 grep `4` (the four `ownerKind` reads). `test/docs.test.mjs:95` pins `14` sections.

**The clone's runtime code, re-measured on this task's own dev chain** (anvil `1.7.1-dev`, port
18555), as step 0 requires: `cast codesize` gives the implementation **9,277** bytes, the factory
**1,319** and the seed distribution **45**, and `cast code <seed>` is byte-equal to
`0x5f5f365f5f37365f73` + `implementation()` lower-cased + `5af43d5f5f3e6029573d5ffd5b3d5ff3`.
`snapshot()` answers on the implementation (642 characters of return data) and reverts on the
factory, which is what makes them the two foreign contracts step 9 (a) opens. Sizes are from
`cast codesize`, not from `wc -c` on hex output, which counts two characters per byte plus `0x`.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | `SECURITY.md` § Front end has **24 rows, R1–R24 with none missing** (counted from the id column before anything else, so an absent row cannot read as a pass), and the disposition column counts **13 `fix` · 3 `design` · 8 `accepted`**, stated as `13 + 3 + 8 = 24`. The `fix` ids are exactly R2 (m04-t04) and R3, R5, R6, R7, R10, R11, R12, R14, R15, R16, R17, R21 — the twelve this task's table marks **fix**; `accepted` is exactly R1, R4, R8, R9, R18, R19, R23, R24 and `design` exactly R13, R20, R22. `git diff --stat origin/main -- app/ test/` → **11 files, 505 insertions, 45 deletions**, mapped to rows in § Which file carries which row below. |
| 2 | pass, with one deviation | **Thirteen node plants, each planted once, each red**, by exit code and not by matching a failure's wording: `esc` ×2, `editorState` ×4, `isClone` ×1, `decode`/`arr` ×2, `Eth.dec` ×1, `plainName` ×2, `scriptTags` ×1. The driver refuses a plant whose target is not present exactly once, and restores by path after each; `git status --porcelain` was empty after all thirteen. Quoted per finding in § The twelve fixes. **Zero plants failed to red.** The deviation is the *mechanism* of the `arr` red, not its colour — see § Deviations 3. Browser reds for (a)–(f) read on the before build, quoted in the same section. |
| 3 | pass | Step 9 (a), after: the implementation `0xA0aa…3704` and the factory `0x88D0…2eb5` **both** paint `has code, but it is not a distribution of this app's factory — this page will not read it`, with **no `.distro`, no `.seg`, no `.ledger` and no leaf reading `100%`** (the detail region holds only `.notice.err`), and `localStorage['rake.recent']` is `null` before and after each — neither address is added. `page errors: none`. Before: the implementation painted a full detail view (`.distro` 1, `.seg` 1, `.ledger` 2, a `100%` leaf, owner cell `renounced`) and `rake.recent` became `["0xA0aa47816994B60B97Ae6aB6A59E9D55C1dE3704"]`. `isClone` is pinned in `test/ext.test.mjs` with the five rows of step 4. |
| 4 | pass | Step 9 (c), after: `33.334 ×3` → sum line `bad`, submit `disabled`, reason `total must equal 100% — 0.01% unassigned`; `33.33/33.33/33.34` → `ok`, enabled; one address with a letter's case flipped → `bad`, `disabled`, reason `checksum does not match — a character is likely wrong`; the all-lowercase form → `ok`, enabled. `page errors: none`. Before: cases 1 and 3 both read `ok` with the submit **enabled**. `test/editor.test.mjs` passes with 8 tests covering the six rows of step 3. `grep -ic checksumOk app/src/index.html` → **`9`** (baseline `8`). |
| 5 | pass | Step 9 (e), after, across the four `data-*` mounts: `img` elements **0**, `a[href^="javascript:"]` **0**, no dialog fired; the bare `data-link` href is `http://127.0.0.1:18557/#/distros/0x9b40…1e37` (the host page's own URL plus the hash) and the `https:` mount `https://example.com/app/#/distros/0x9b40…1e37`. Step 9 (f), after: both stub mounts sit in `could not read distribution … · retry` with **no `.rk-f`** (`innerHTML` 293 characters each), while the **paired control** mount — the same stub answering the real fixture — does paint a footer (`innerHTML` 952), so the error states are the code's and not a broken stub. Before: mount 1's error line carried the raw payload (`could not read distribution <img s…(1)> on anvil`), mount 2 had `a[href^="javascript:"]` **1** with href `javascript:alert(1)//#/distros/0x9b40…1e37`, and the non-hex mount painted a **footer** reading `owner 0xzzzz…zzzz` (`.rk-f` present, `innerHTML` 360). `test/widget.test.mjs` carries the step 5 rows and `test/abi.test.mjs` the `exceeds` row. |
| 6 | pass | Step 9 (d), after, with `page.route` answering `eth_chainId` as `0x1` and passing every other method through: **`eth_sendTransaction` bodies on the wire = 0**, and the status line reached `distribute ETH · your wallet is on mainnet — this app lives on anvil`. Route restored: **1** send, receipt status `0x1`. Before: **1** send under the flipped chain, and `eth_chainId` does not appear among the methods the route observed at all — the page never asked. `grep -ic eth_chainId app/src/index.html` → **`2`**. |
| 7 | pass, with one grep that cannot hold as written | `Model.plainName` rows pass (`test/model.test.mjs`, 46 tests). `test/inline-scripts.test.mjs` passes with its two new rows (10 tests) and `grep -ic -F "indexOf('<script'" app/inline-scripts.mjs` → **`0`**. `grep -ic 'u202E'` → **`1`** in `app/src/index.html` and **`1`** in `app/src/widget.js`. `grep -ic noreferrer` → **`7`** in `index.html`, **`1`** in `widget.js`, with `grep -ic noopener` **unchanged at `7` and `1`** — the unchanged half is what shows the token was added rather than substituted. Step 9 (b) paints: with `nosnapshot=1` forcing the fallback, 1 list row, 0 queue dots, not on `reading…`, `page errors: none`; before, 0 rows, stuck on `reading…`, `page errors: ["Cannot read properties of null (reading 'length')"]`. **`grep -ic -F 'd.pending.length' app/src/index.html` returns `1`, not `0`** — see § Deviations 2; the defect it exists to catch is measured there instead. |
| 8 | pass | `make dapp-nodev CHAIN_ID=11155111` → `widget: raw **8509** bytes · budget 10240 · **1731** left`, and `wc -c app/dist/widget.js` → **`8509`**, the same `N`, with `8509 ≤ 10240`. Signed deltas against the re-run baselines: **widget `+377` bytes** (8132 → 8509, its first growth since M02, as the plan expected) and **`dapp:` gzip `+572` bytes** (45617 → 46189). Both chains' hashes are in § For the Run B. |
| 9 | pass | `node --test test/docs.test.mjs` → `tests 11 · pass 11 · fail 0`, with the section count still pinned at `14` (`test/docs.test.mjs:95`, `assert.equal(sections.length, 14)`) and no section added or removed. `grep -rniE '\btip\b\|govUrl\|about:\|ownerKind' app/src` → **`4`**, the same four `ownerKind` lines as the baseline (M02 criterion 9). |
| 10 | pass | The frozen-path gate, **measured one path at a time** with each path's file count at `origin/main` printed beside it, so a pathspec that matches nothing cannot read like a path with no changes: `src/` (2 files), `test/*.t.sol` (6), `.gas-snapshot` (1), `RUNBOOK.md` (1), `scripts/` (8), `calldata/` (12), `audits/` (40) — **all seven non-empty, all seven zero diff lines**. `node --test test/*.test.mjs` → **`tests 144 · pass 144 · fail 0`**, more than the re-run `118`, with the added tests named per file in § Which file carries which row. `forge test` → **`107 tests passed, 0 failed`**, unchanged from the baseline `107`. `make fmt` exit `0`; `forge lint` exit `0` through the pinned forge `1.7.1-dev`. `git status --porcelain` **empty** after `make dapp-nodev CHAIN_ID=11155111`. |
| 11 | **not yet satisfiable — states the dependency only** | This task does not start an upload and has not. The gate is that this PR merges before the next Run B's step 4 is prepared; at the time of writing the PR is open and unmerged, so the condition is neither met nor failed. § For the Run B carries the hashes the Run B needs and states the dependency. **Lakos owns the upload sequencing and has confirmed that**, so nothing here acts on it. |

## The twelve fixes

Each is the four parts the plan asks for: the sink or input, the check, the red, and the browser step.
Reds are quoted from the run that produced them; a figure stated here is stated once.

**R15 — bidi controls in `esc` (`e5259e5`).** Sink: every `esc` call in both files, `title`
attributes included. Check: `esc` removes `/[‪-‮⁦-⁩]/g` before the four
characters it already escaped (`index.html:307`, `widget.js:82`) — one `replace` in front of the same
function, so no call site changes. Red, planted by deleting the `replace` in each file in turn:
`✖ esc drops a bidi override rather than escaping it` and `✖ esc drops each of the nine bidi control
characters` (`test/ext.test.mjs`, `tests 16 · pass 14 · fail 2`), and the widget's pair
`✖ the widget's esc drops a bidi override rather than escaping it` (`test/widget.test.mjs`,
`tests 17 · pass 15 · fail 2`). Browser: covered by (g), which repaints every view with
`page errors: none`.

**R21 — `noreferrer` (`e5259e5`).** Input: the eight `target="_blank"` sites. Check: `rel="noopener
noreferrer"` at `index.html:54, 420, 1981, 1997, 1998, 2055, 2058` and `widget.js:231`. Red: none
planted — this is a grep-measured attribute change with no behaviour a test can red on, which the
plan also treats as grep-only. Measured by the pair in AC 7.

**R5 — the editor's checksum refusal (`425cd51`).** Sink: `editorState`'s address row. Check:
`isAddr(r.addr) && checksumOk(r.addr)` (`:959`) with `BAD_SUM`'s sentence as the reason. Red, planted
by deleting the `checksumOk` refusal: `✖ a beneficiary address with a flipped case says what the
owner field says` (`tests 8 · pass 7 · fail 1`). Browser: (c) case 3.

**R7 — the bps sum, negative shares, the zero address (`425cd51`).** Sink: `editorState`'s total.
Check: `bps = rows.map(r => Math.round((parseFloat(r.pct) || 0) * 100))` with `sum(bps) !== 10000`
(`:951`), plus `:953` negative and `:962` zero-address refusals. Three reds, each planted alone:
restoring the decimal tolerance gives `✖ a table that rounds to 9999 bps is refused, with the
shortfall the contract would read` with `AssertionError … Expected values to be strictly equal:
true !== false`; deleting the negative check gives `✖ a negative share is refused even when the
rounded sum is exactly 10000`; deleting the zero check gives `✖ the zero address is refused, which
isAddr alone does not do`. Browser: (c) cases 1 and 2.

**R3 — the clone check (`05a9613`).** Sink: `loadDistro`'s `0x` test, and `addRecent`. Check:
`CLONE`/`isClone` at `:386-387`, `foreign: true` at `:603`, the notice at `:831`, and `addRecent` not
called on that path. Red, planted by writing `isClone` with `===` against a mixed-case `impl`:
`✖ isClone reads an upper-cased answer as the same code` (`tests 16 · pass 15 · fail 1`). Browser:
(a), quoted in AC 3.

**R16 — the recent list's `pending: null` (`05a9613`).** Sink: the list row's `d.pending.length`.
Check: `(d.pending && d.pending.length)` at `:1903`. Red: the browser, not node — the crash is in the
list paint, and the before build gives `page errors: ["Cannot read properties of null (reading
'length')"]` with `#/distros` stuck on `reading…`. Browser: (b), quoted in AC 7.

**R6 — `data-rake` and `data-link` (`418ba57`).** Inputs: two host-supplied attributes. Check:
`/^0x[0-9a-fA-F]{40}$/` on `data-rake` before anything is written, with the error text carrying no
`short(addr)` (`:189`); the `href` from `new URL(...)` in a `try`, emitted only for `http:`/`https:`
(`:229`). Red: the browser alone — `render` is not reachable from node without a DOM. Browser: (e),
quoted in AC 5.

**R12 — unbounded array lengths (`418ba57`).** Inputs: a response-supplied length word in two
decoders. Check: `if (n > H.length / 64) throw 0` (`widget.js:137`) and the same bound before
`new Array(len)` with a named error (`eth.js:150`). Two reds. Deleting the `arr` bound did **not**
produce the predicted non-null value; it killed the process: `FATAL ERROR: Ineffective mark-compacts
near heap limit Allocation failed - JavaScript heap out of memory`, after `20669.879922ms` at about
4,031 MB, reported by the runner as `✖ test/widget.test.mjs` with `tests 1 · pass 0 · fail 1` (see
§ Deviations 3). Deleting the `eth.js` bound gives `✖ a dynamic array length larger than the data is
refused, not allocated` (`test/abi.test.mjs`, `tests 11 · pass 10 · fail 1`). Browser: (f), and the
same mount crashed the renderer outright — `page.evaluate: Target crashed`.

**R14 hex half — a non-hex answer (`418ba57`).** Sink: `reader`'s slice, reached from `decode`.
Check: `if (!hex || !/^0x[0-9a-fA-F]+$/.test(hex) || hex.length < 642) return null;` (`:148`), hex
before length. Red, planted by deleting the hex test: `✖ a non-hex answer decodes to null before
reader slices it`, with the actual value `{ delay: NaN, description: '', nonce: NaN, owner:
'0xzz00000000000000000000000000000000000000', pending: [], table: [] }`. Browser: (f), quoted in
AC 5.

**R10 — reverse names (`a2378fe`).** Sink: the one place a name replaces an address, `nameSweep`.
Check: `Model.plainName` at `model.js:295`, exported `:307`, gating the write at `index.html:515`.
Two reds. Dropping the `^`/`$` anchors: `✖ plainName accepts a plain name and refuses one a reader
cannot tell apart` (`tests 46 · pass 45 · fail 1`) — the Cyrillic name matches on its ASCII tail.
Using `< 64` for `<= 64`: `✖ plainName caps a name at 64 characters`. The plan's two predicted
**non**-reds were left unplanted as evidence and are recorded as such in `SECURITY.md`. Browser: no
step; the gate is a pure predicate and the plan assigns it none.

**R11 — the inline-script guard (`2006896`).** Input: the bundle `scriptTags` scans. Check:
`const open = /<script(?=[\s/>])/gi` at `:17`, replacing both `indexOf` calls and the name check,
keeping the lookahead so `<scriptable>` still is not a tag. Red, planted by dropping the `i` flag:
`✖ a bundle with a SRC, upper-cased tag script fails the build` and `✖ a bundle with a defer, mixed
case script fails the build`, both `AssertionError … Missing expected exception`
(`tests 10 · pass 8 · fail 2`). Browser: no step; it is a build-time guard.

**R17 — the chain re-read before a write (`89a84c3`).** Sink: `tx`'s send. Check: `eth_chainId`
re-read at `:163` refusing anything but `CFG.chainId`, the message at `:165`, and `chainId` on the
params. Red: the browser alone — the figure is on the wire. Browser: (d), quoted in AC 6.

## Which file carries which row

| File | Rows | Tests added |
|:--|:--|:--|
| `app/src/index.html` | R3, R5, R7, R10 (write site), R15, R16, R17, R21 | — |
| `app/src/widget.js` | R6, R12, R14, R15, R21 | — |
| `app/src/model.js` | R10 | — |
| `app/src/eth.js` | R12 | — |
| `app/inline-scripts.mjs` | R11 | — |
| `test/editor.test.mjs` (new) | R5, R7 | **+8** (0 → 8) |
| `test/ext.test.mjs` | R15, R3 | **+7** (9 → 16) |
| `test/widget.test.mjs` | R15, R12, R14 | **+5** (12 → 17) |
| `test/model.test.mjs` | R10 | **+2** (44 → 46) |
| `test/abi.test.mjs` | R12 | **+2** (9 → 11) |
| `test/inline-scripts.test.mjs` | R11 | **+2** (8 → 10) |

`118 + 26 = 144`, which is AC 10's figure. `test/amt.test.mjs`, `test/build.test.mjs`,
`test/docs.test.mjs` and `test/step4-calldata.test.mjs` are unchanged at 7, 15, 11 and 3.

## Deviations from the plan

1. **Step 0's baselines were stale, and the plan said they would be.** The figures it quotes are
   `main` at `3d4f4cf`, before #230; re-run at the branch point the test count is `118` not `109`
   and the `dapp:` line is `raw 143623 · gzip 45617` not `raw 143339 · gzip 45535`. Every delta in
   this handoff is against the re-run figures. The widget and `wc -c` figures were unchanged at
   `8132`, so only the two moved figures matter.

2. **AC 7's `grep -ic -F 'd.pending.length' app/src/index.html` → `0` cannot hold, and is reported
   red rather than worked around.** Step 4 prescribes the replacement text
   `(d.pending && d.pending.length)`, which *contains* the substring the grep forbids, so the count
   is `1` for any correct fix of the prescribed shape. The hunk was left exactly as the plan
   prescribes. What the grep was written to catch is an **unguarded** read, and that is measured
   instead: the file's only occurrence of `d.pending.length` is at `:1903` inside
   `d.pending && d.pending.length`, so unguarded reads are zero. A `?.` form would satisfy both
   greps, but it is not the text the plan names and re-triaging the hunk is not this task's.

3. **The `arr` plant's red is a crash, not the predicted assertion.** The plan chose `100000`
   explicitly because it expected "an object with a 100,000-row table in a few hundred milliseconds
   rather than hanging", so that asserting `null` would fail on a non-null value. Measured, the
   unbounded decoder exhausts a 4 GB V8 heap in 20.7s and the process dies before any assertion
   runs, and the same input kills a chromium renderer (`Target crashed`). The plant still reds, and
   reds for the right reason, but the plan's stated justification for the constant is wrong and the
   row in `SECURITY.md` says so. Nothing was changed to accommodate this.

4. **Step 9 (a)'s before-state differs between the two foreign addresses.** The plan predicts "the
   page paints it as a distribution" for both. That is what the **implementation** does. The
   **factory** reverts `snapshot()`, so on the before build it never finishes: the page stays on
   `reading 0x88D0…2eb5…` with an uncaught `Object` in `page errors`, and paints no table and adds
   nothing to `rake.recent`. The after-state is as predicted for both — the same notice by the
   `0x`-check-passed, `snapshot()`-reverts path. So the factory's red is a stuck read plus a page
   error, not a fake paint, and only the implementation demonstrates the `addRecent` half.

5. **The before build cannot be read with all six (e)/(f) mounts on one page.** The 100,000-row
   mount crashes the renderer before the first `page.evaluate` returns, which takes every other
   mount's figure with it. The before run therefore excludes that mount (`?mounts=m1,m2,m3,m4,m5,m7`)
   and the crashing mount was run alone, with the crash itself recorded as its result. The after run
   carries all seven mounts in one page.

6. **`page errors: none` holds for every dapp run and not literally for the two host-page runs.**
   All of (a), (b), (c), (d) and (g) report `none`. The scratch host page produces one console
   resource error, `Failed to load resource: … 404`, which the server log identifies as
   `GET /favicon.ico` — the scratch page provides no favicon. It is my harness's, not the widget's;
   there are no uncaught page errors in those runs.

7. **A paired control was added to step 9 (f), beyond the plan.** A mount in the error state cannot
   be told from a broken stub, so a seventh mount answers the *real* fixture from the same stub and
   must paint a footer. It does (`innerHTML` 952, `.rk-f` present), which is what licenses reading
   the other two mounts' error states as the code's.

8. **Step 9 (a)'s "the table it shows" needed a different instrument.** The generic
   `.trow, .row, tbody tr` selector matched `0` on **both** builds, so it measured nothing. The
   figure in AC 3 is the detail view's real structure instead — the `.distro`, `.seg` and `.ledger`
   class counts and the leaf element reading `100%` — which moves from 1/1/2 and `["100%"]` before to
   0/0/0 and `[]` after.

9. **Step 9 (d)'s `contains 'this app lives on'` boolean reads `false` on a passing run.** The
   harness keeps the first non-empty `#txs` sample, which is the preflight line
   `distribute ETH · checking the call against the chain…`; the refusal is the second sample. The
   figure to read is the ordered sample list, which carries
   `your wallet is on mainnet — this app lives on anvil`. The send count — `0` flipped, `1`
   restored — is the criterion's real instrument and is unaffected.

10. **Step 2's and step 6's control characters were rewritten to `\u` escape text** in the two source
    files and three test files, by a script committed nowhere (it ran from the scratch directory).
    A literal U+202E or U+0456 is invisible both to AC 7's `u202E` grep and to the next reader, and
    the tests exist to name those inputs. Behaviour is identical; the bytes are legible.

## Decisions

1. **`python3 -m http.server`, not `npx serve`**, as the plan requires, and every parameterised step
   reads `location.search` back through `page.evaluate` before any result. All reads matched what was
   sent, including the `nosnapshot=1` case where the query precedes the hash.
2. **Spare ports 18555–18560** (anvil, after-bundle, after-host, before-bundle, before-host, stub),
   all outside chromium's refused set. The before build is `origin/main`'s own dev build against the
   same dev chain and the same deployed addresses — `broadcast/` copied into a detached worktree at
   `b7260b0` — so before and after differ in exactly the `app/` bytes and nothing else. It rebuilt
   byte-identically at 145,010 bytes across two runs.
3. **One commit per finding group**, seven in all, so a reviewer can read a row's hunk against its
   test without separating two findings' changes. `SECURITY.md` is a separate eighth commit, since it
   is the register rather than the fix.
4. **The plant driver refuses a plant whose target is not present exactly once** and restores by
   path, never by `git checkout -- .`. Both guards are there because a plant that silently matches
   nothing reads exactly like a pass, and a blanket revert would have taken uncommitted work with it.

## Discoveries

1. **`100000` is not the gentle case.** A length word four orders of magnitude below the 2³² the
   finding cites is already enough to OOM a 4 GB node heap and to kill a chromium renderer. Any
   future reasoning about decoder bounds should not assume a large-but-finite length degrades
   gracefully.
2. **The implementation's `snapshot()` returns exactly 642 characters**, which is precisely
   `decode`'s minimum-length floor. The floor alone would therefore not have refused the
   highest-severity foreign contract in step 9 (a); only the clone check does. The two checks look
   redundant and are not.
3. **The `SECURITY.md` offset-table pattern does not survive a multi-file task.** m04-t04 could map
   scope-commit lines to head lines with three ranges and two numbers; this task moves five scoped
   files and twenty hunks in `index.html` alone. The section now tells a reader to resolve against
   the pushed tag, and each `fix` row carries its own head lines. A future `app/` task should expect
   to delete an offset table rather than extend one.
4. **An acceptance grep can forbid a string the prescribed fix contains** (Deviations 2). Worth a
   glance when a plan states both a replacement text and a `grep … → 0` over a substring of it.
5. **`test/editor.test.mjs` lifts a region of `index.html` by two anchors**, as `ext.test.mjs` does.
   The lift is now 130 lines and the anchors are a `const` name and a return-object literal; if
   either is reworded the test silently lifts the wrong region. Not fixed here — the plan prescribes
   those anchors — but it is a sharp edge in a growing pattern.

## Open questions

None. The fix/accept split was the architect's triage and was not re-litigated; the two wording items
go to Denizen below rather than through this task's code.

## For Denizen

Two rows the rollup raises are wording and product calls under decision 17, not engineering, and
nothing in this task changed either text. Both are quoted so they can be ruled on as written.

1. **R9 — "recognised" is not "verified".** `distribute(address)` is permissionless, so one unit of a
   token whose `symbol()` is `USDC`, distributed once, leaves the collapsed unverified list and is
   listed in the main ledger by its symbol with a live `distribute` button. The two texts that read
   as verification:
   - the ledger's warning, `app/src/index.html:1678`: *"unverified — anyone can send any token to
     this address. Check a token before distributing it; once distributed it is listed above."*
   - the docs page, `app/src/index.html:2021`: *"Because anyone can send any token to the address,
     this page lists a token by name only once it has been distributed there. A token that has been
     received but never distributed appears under other tokens received, by address and marked
     unverified, with its own distribute control."*

   The question is whether the recognised set should be **anyone's** (as today) or the **owner's**,
   and what the two sentences should say either way. The 12-character symbol cap still admits `USDC`
   or a short URL.
2. **R19 — vault calldata with no target, chain or value beside it.** Copying calldata for a vault to
   submit is decision 7's design; what a signer needs to check it against — the target address, the
   chain, the value — is not printed with it (`app/src/index.html:931`, `:956-964`, `:186-187` at the
   scope commit). This is a presentation addition in the page's voice, so the wording is yours.

R24 is carried for the same reason in kind — passing the page's provider to the inlined widget changes
the widget's public `mount` signature for an inconsistency with no silent wrong read — and is noted
here only so all three carried-for-wording rows are in one place.

## For the Run B

This bundle is the last `app/` change the next Run B carries, so **one upload carries m04-t11,
m04-t04 and this task** (`RUNBOOK.md` § Which run is this: Run B, `app/` changed and `src/` did not).
Built with `make dapp-nodev CHAIN_ID=<chain>` through the pin, at the tree of `89a84c3`:

| Chain | `dapp:` | `widget:` | `sha256 app/dist/index.html` | `sha256 app/dist/widget.js` |
|:--|:--|:--|:--|:--|
| 11155111 | `raw 145765 · gzip 46189` | `raw 8509 · 1731 left` | `b1fc3b96f52b1c17f282e541f4d0293cb8bc96fc1e38866c6d128c13e5ef1e86` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |
| 84532 | `raw 145763 · gzip 46186` | `raw 8509 · 1731 left` | `6f0225bbb3a9262f1f42780dea918c71cdc0e1e2b99a847282ec6c00ff45336f` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |

`app/dist/widget.js` is **byte-identical across the two chains** (one `sha256`), as the widget carries
no chain constant; `index.html` differs by the two bytes of the chain id. `git status --porcelain` is
empty after either build, so neither leaves a tracked file dirty.

**The dependency, stated and not acted on (AC 11):** this PR must merge before the Run B's step 4 is
prepared, because step 4 cuts its calldata from `app/dist` and a bundle built before this merge would
upload a document without these twelve fixes. If the Run B has already been prepared when this is
ready, the sequencing is the architect's to redo — **Lakos owns it and has confirmed so**. This task
sends no transaction, re-uploads nothing, and touches no file under `calldata/`.
