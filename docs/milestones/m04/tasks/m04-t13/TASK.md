# m04-t13 — Front-end audit remediation

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, every finding of the 2026-11-17 front-end audit whose remedy is a byte in the
shipped bundle has either been closed at its sink or input, with a test that is red without the
change, or has been accepted for this release with its reason in `SECURITY.md` § Front end; and the
Cache section cannot sit at zero over a populated store on the path `#227` left open. `app/`,
`test/*.mjs` only; nothing under `src/`, no `.gas-snapshot` change, and the testnets' document is not
re-uploaded by this task — this is the last `app/` change the next Run B carries, so that one upload
carries m04-t11, m04-t12, m04-t04 and this.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`;
`anvil` `1.7.1-dev`). **Branch `m04/t13-audit-fixes` from `origin/main` at or after the merge of
[#230](https://github.com/dnznlabs/rake/pull/230) (m04-t04)**: R2's `shaped()` check at `ext`/`xlink`
is the pattern steps 3 and 5 follow and `test/ext.test.mjs` is the test they extend, so a branch cut
before that merge rebases onto it before the PR opens. [#227](https://github.com/dnznlabs/rake/pull/227)
(m04-t12) is expected to have merged first; if it has not, the task waits, because step 9 edits the
`cacheBind` chain it adds. Check hooks with `ls .git/hooks | grep -v sample` → `pre-commit`,
`post-commit`. **Line numbers below are PR #230's head `3789dbc`** for `app/src/widget.js`,
`app/src/eth.js`, `app/src/model.js` and `app/inline-scripts.mjs`, which no open PR moves, and for
`app/src/index.html`, which #227 moves by about +136 lines below `:425` — trust names over numbers.
Never `devbox run -- bash -c` with a pipe; write a script. Scratch files go under a directory outside
the repo. The browser check runs as m04-t12's did ([HANDOFF.md](../m04-t12/HANDOFF.md) § The browser
check): `playwright-core` outside the repo driving the cached chromium `AGENTS.md` § The dapp names,
against the dev build (`make dapp`) on a dev stack on spare ports. **Serve `app/dist` with
`python3 -m http.server <port>`, not `npx serve`: `serve` drops the query string on its extension
redirect (m04-t12 handoff § Deviations 9), so any check that passes `?rpc=…` through `serve` measures
a page that never received it. Every browser step below that passes a parameter proves the page saw it
(read `location.search` back through `page.evaluate` and record it) before reading a result.**

The rollup is [`audits/2026-11-17/frontend/AUDIT.md`](../../../../../audits/2026-11-17/frontend/AUDIT.md),
24 findings R1–R24, and the register is `SECURITY.md` § Front end, 24 rows. **Which findings this task
fixes and which it accepts was decided at scoping, from the rollup, and is the table below; the
engineer does not re-triage.** A finding this table accepts stays `accepted` in `SECURITY.md` with the
reason given here written into its row; a finding it fixes becomes a `fix` row naming the hunk and the
test, in the shape R2's row already has.

| Finding | This task | Why, in one line |
|:--|:--|:--|
| R3 (High) dapp half | **fix** (step 4) | `loadDistro` compares the code at the address with the PUSH0 clone of `implementation()`, which the page already reads at boot; the fake never reaches the paint, and `nonceOf`'s 2³² keccaks go with it. |
| R3 widget half | accept | The host names the address in `data-rake`, and a host that names a fake can print any table it likes without the widget; the check would cost a second request against the one-`eth_call` contract (`widget.js:3`, decision 12). |
| R5 (Medium) | **fix** (step 3) | `editorState` adds the `checksumOk` refusal the owner and claim fields already apply. |
| R7 (Medium) | **fix** (step 3) | `editorState` sums the rounded basis points, which is what `tableFrom` encodes, and refuses a negative share and the zero address — the contract's own refusals (`src/Distribution.sol:332-344`). |
| R6 (Medium) | **fix** (step 5) | `data-rake` is checked for shape before it is printed or put in an `href`; `data-link` is allowed only with an `http:` or `https:` scheme. |
| R10 (Medium) | **fix** (step 6) | A reverse name replaces the address only if it is plain ASCII of the DNS shape and at most 64 characters; anything else keeps the address. ENSIP-15 in the page is rejected: it is a table of tens of kilobytes against a bundle this milestone is about to upload, and plain names are the ones this page's visitors read. |
| R11 (Low) | **fix** (step 7) | Case-insensitive `<script` match, one test row per case the legs named. |
| R12 (Low) | **fix** (step 5) | A length word larger than the body has words is refused in `widget.js`'s `arr` and `eth.js`'s `decOne`. |
| R14 (Low) hex half | **fix** (step 5) | `decode` refuses a non-hex answer before `reader` slices it, which is the same sink class R2 closed in `index.html`. |
| R14 chain half | accept | The host supplies both `data-rpc` and `data-chain`; a mismatch is the host's own configuration, and an `eth_chainId` on the RPC path is a second request against the one-call contract. A JSON-RPC batch would keep one round trip, but which public endpoints accept a batch is unmeasured, and this task does not add an unrehearsed mechanism to a bundle about to be uploaded. |
| R15 (Low) | **fix** (step 2) | `esc` in both files drops the bidi control characters U+202A–U+202E and U+2066–U+2069, so every escaped site is covered at once, `title` attributes included, where no `<bdi>` can reach. |
| R16 (Low) | **fix** (step 4) | The recent list reads `d.pending` as possibly `null`, the shape the fallback returns. |
| R17 (Low) | **fix** (step 8) | `tx` re-reads `eth_chainId` immediately before `eth_sendTransaction` and refuses a chain other than `CFG.chainId`; the transaction also carries `chainId`. |
| R21 (Info) | **fix** (step 2) | `noreferrer` joins `noopener` at the eight `target="_blank"` sites; the widget promises no analytics and a `Referer` to the gateway is one. |
| #227 residual | **fix** (step 9) | The Cache section is repainted whether the re-read after `clear cache` settles or rejects. |
| R4, R8 (Medium) | accept | `app/build.mjs` and `app/broadcast.mjs` input validation changes no byte of the bundle and needs no upload, and exploiting either needs write access to a tracked input — the authority to edit `index.html` itself. Carried to a build-hardening task before M05 builds the mainnet document; not here, because this task gates the Run B. |
| R9 (Medium) | accept | The remedy is what the ledger calls a token that has been distributed once, which is the docs page's and the ledger's wording — Denizen's under decision 17 — and whether the set should be the owner's rather than anyone's is a product decision. Raised with this task's handoff, not changed here. |
| R18 (Low) | accept | Computing the featured address needs the clone init-code hash and the implementation address as build constants; today both are provider reads, and the provider that can lie about `predict()` lies about `implementation()` too. The build change shares R4's and R8's task and is carried there. |
| R19 (Info) | accept | Printing target, chain and value beside the vault calldata is a presentation addition in the page's voice (decision 17), not a sink; carried with R9 for Denizen's wording. |
| R24 (Info) | accept | Passing the page's provider to the inlined widget changes the widget's public `mount` signature for an inconsistency with no silent wrong read: the widget checks `eth_chainId` against `data-chain` and fails loudly on a mismatch. Carried. |
| R1 | out | Accepted on the trust boundary; the decision issue is the architect's ([#225](https://github.com/dnznlabs/rake/issues/225) ruling, 2026-11-17). |
| R2 | done | Fixed in #230. |
| R13, R20, R22 | out | `design` rows; R23 `accepted` on the trust boundary — none has an `app/` remedy. |

Every fix below has the same four parts, and the handoff reports each: the sink or input, the check,
the test that is red without it (**planted once, the red quoted; a predicted red that does not red is a
deviation, not a pass**), and the browser step where the behaviour is visible.

0. **Baselines**, re-run at the branch point and recorded in the handoff with the commit and the date,
   never carried from here: #230 and #227 both move the test count and the gzip figure, and m04-t11
   and m04-t12 each caught this plan's predecessors quoting a stale one. On `main` at `3d4f4cf`,
   2026-11-17, before either merge, the figures were: `node --test test/*.test.mjs` → `ℹ tests 109 ·
   ℹ pass 109 · ℹ fail 0`; `make dapp-nodev CHAIN_ID=11155111` → `dapp: raw 143339 bytes · gzip
   45535 bytes · chain 11155111`, `widget: raw 8132 bytes · budget 10240 · 2108 left`; `wc -c
   app/dist/widget.js` → `8132`. Re-run those three, then these greps (every grep in this plan is
   `-i`, and the figure before is the denominator the figure after is read against; all measured at
   `3789dbc`, re-run):
   - `grep -ic noreferrer app/src/index.html` → `0`; `app/src/widget.js` → `0`.
     `grep -ic noopener app/src/index.html` → `7`; `app/src/widget.js` → `1`.
   - `grep -ic 'u202E' app/src/index.html` → `0`; `app/src/widget.js` → `0`.
   - `grep -ic 5f5f365f5f37365f73 app/src/index.html` → `0`.
   - `grep -ic -F 'd.pending.length' app/src/index.html` → `1`.
   - `grep -ic checksumOk app/src/index.html` → `8`.
   - `grep -ic eth_chainId app/src/index.html` → `1`; `app/src/widget.js` → `2`.
   - `grep -ic 'javascript:' app/src/widget.js` → `0` (the fix names the schemes it allows, not the
     one it refuses, so this stays `0` after; it is here so a denylist is noticed if one appears).
   - `grep -ic -F "indexOf('<script'" app/inline-scripts.mjs` → `1`.
   - `grep -ic plainName app/src/model.js app/src/index.html test/model.test.mjs` → `0` each.
   - `grep -ic finally app/src/index.html` → `0`.
   - `grep -rniE '\btip\b|govUrl|about:|ownerKind' app/src | wc -l` → `4` (M02 criterion 9's
     baseline, the four `ownerKind` reads; m04-t12 holds it at four).
   - The clone's runtime code, **rehearsed by the architect on anvil `1.7.1` on a spare port,
     2026-11-17**, against a clone the dev deploy created: `cast code <clone>` is exactly 45 bytes,
     `0x5f5f365f5f37365f73` + the 20 bytes of `implementation()` lower-cased + `5af43d5f5f3e6029573d5ffd5b3d5ff3`,
     which is the `0x2d` bytes `create` copies out after its 9-byte init prefix
     (`src/Distribution.sol:473-476`; `predict` at `:489-495` hashes the same 54 bytes). The
     implementation itself (9,277 bytes of code) answers `snapshot()` and is not a clone, so it is
     the foreign contract step 10 opens; the factory (1,319 bytes) reverts `snapshot()` and is the
     fallback-path foreign contract. Re-run the `cast code` comparison on the task's own dev chain
     and record it.

1. **Read the rollup entries this table fixes** — R3, R5, R6, R7, R10, R11, R12, R14, R15, R16, R17,
   R21 — and the `SECURITY.md` rows that carry them, so each hunk below is written against the leg's
   reproduction and not against this summary of it. Check: nothing to run; the handoff's fix rows
   cite the rollup line each hunk answers.

2. **`esc` and the link sites (R15, R21), both files.** In `app/src/index.html:286` and
   `app/src/widget.js:78`, `esc` first removes `/[‪-‮⁦-⁩]/g`, then escapes the
   four characters it escapes today — one `replace` added in front, same function, same name, so
   every site that already calls `esc` is covered, the `title` attributes at `index.html:734` and
   `widget.js:176` included. At the seven `rel="noopener"` sites in `index.html` (`:54`, `:385`
   (`xlink`), `:1881`, `:1897`, `:1898`, `:1955`, `:1958`) and the one in `widget.js:198`, the
   attribute becomes `rel="noopener noreferrer"`. **No `<bdi>`, no `unicode-bidi` rule**: isolation
   would leave the `title` sites uncovered and cost a class per site; dropping the controls covers
   every sink in one line and costs a name nothing a reader would miss, since a plain RTL name
   renders correctly without explicit controls.

   Check: `test/ext.test.mjs` gains an `esc` row — `esc('a‮b')` → `'ab'`, and a row with each
   of the nine code points, lifted from `index.html` the way the file lifts `ext`; `test/widget.test.mjs`
   gains the same two rows against the widget's `esc`, returned from the IIFE the way `decode` is
   (`:51`). **Predicted red:** without the `replace`, both `'ab'` rows fail with the control present
   in the actual value. Greps: `grep -ic 'u202E'` → `1` in each file; `grep -ic noreferrer` → `7`
   and `1`; `grep -ic noopener` unchanged at `7` and `1`.

3. **`editorState` (R5, R7), `app/src/index.html:869-877`.** Replace the decimal tolerance at `:870`
   with the arithmetic the contract applies: `bps = rows.map(r => Math.round((parseFloat(r.pct) || 0) * 100))`,
   and the first refusal is `sum(bps) !== 10000`, worded as today (`total must equal 100% — X%
   unassigned/over`, with `X = Math.abs(10000 − sum) / 100`). Then, in order: any `parseFloat(r.pct) < 0`
   → `a share cannot be negative`; the address row (`:871`) becomes `isAddr(r.addr) && checksumOk(r.addr)`,
   with the `BAD_SUM` text (`:362`) as the reason when `isAddr` passes and `checksumOk` fails, so the
   editor says the same sentence the owner field does; any `r.addr.toLowerCase() === ZERO` → `the
   zero address cannot be a beneficiary — the contract refuses that table`. The existing duplicate,
   zero-share and row-cap refusals stay. `addrField` (`:899-905`) is not changed: it already shows the
   warning; what moves is that Deploy and Queue now follow it. `Model.tableFrom` is untouched — the
   sum check reads the same `Math.round` it does, so the two cannot disagree again.

   Check: a new `test/editor.test.mjs` lifts the region from `const EMPTY_ROW` through the end of
   `editorState` (anchor on `return { ok: true, total, why: 'sent ascending by address`), as
   `ext.test.mjs` lifts `ext`, with `S = { maxRows: 50 }`, `isAddr`, `checksumOk`, `BAD_SUM`, `ZERO`
   and `Eth` passed in. Rows: three at `33.334` → `ok: false` with `unassigned` in `why` (leg 1's
   reproduction: the decimals total `100.002`, which today's tolerance accepts, but they encode as
   `3333 × 3 = 9999` bps, `0.01%` short of `BPS_TOTAL`, and the sentence has to say which way the
   contract would read it); `33.33, 33.33, 33.34` → `ok: true`; a `-10` row with the rest summing to 110 → `negative`; a
   well-formed address with one letter's case flipped → `why === BAD_SUM`; the all-lowercase form of
   the same address → ok (one case carries no checksum, as `checksumOk` says); the zero address →
   `zero address`. **Predicted reds, each planted by reverting one line:** the tolerance check back
   in place reds the `33.334` row (it accepts `100.002`); `isAddr` alone reds the flipped-case row;
   no negative check reds the `-10` row; no zero check reds the zero row. Four plants, four reds,
   each quoted. `grep -ic checksumOk app/src/index.html` → `9` (baseline 8).

4. **The clone check and the recent list (R3, R16), `app/src/index.html`.** In `load()` (`:525-547`)
   keep the implementation address read at `:529`: `S.impl = impl`. Add beside `isAddr` (`:351`):
   `const CLONE = impl => '0x5f5f365f5f37365f73' + impl.slice(2).toLowerCase() + '5af43d5f5f3e6029573d5ffd5b3d5ff3';`
   with a comment naming `src/Distribution.sol:473-476` as the source of the bytes and step 0's
   `cast code` as the measurement, and `const isClone = (code, impl) => String(code).toLowerCase() === CLONE(impl);`.
   In `loadDistro` (`:552-554`), after the `0x` check: `if (!isClone(code, S.impl)) return { addr,
   foreign: true };`. In `detail` (`:1173`) and the list path (`:1799`), a `foreign` result is
   handled where `missing` is: `detail` paints a new `notice(…, 'err')` beside `unreadable` (`:775`)
   — `${ext('address', addr, short(addr))} on ${cname(CFG.chainId)} has code, but it is not a
   distribution of this app's factory — this page will not read it.` — and **does not call
   `addRecent`**, which today runs at `:1175` after the `missing` return and would save the foreign
   address; `recents().map(loadDistro)` filters `foreign` as it filters `missing`. R16: at `:1817`
   the row reads `(d.pending && d.pending.length)` — the fallback (`:577`) returns `pending: null`,
   and the `TypeError` thrown there is outside the `try` at `:1797`, so the list stays on `reading…`
   for good today.

   Check: `test/ext.test.mjs` gains `isClone` rows lifted with the predicates (extend `OPEN`/`CLOSE`
   or add a second lift): the 45-byte clone of a given implementation → `true`; the same with one hex
   digit changed → `false`; the implementation's own code (any longer string) → `false`; `0x` → `false`;
   upper-cased input → `true`. **Predicted red:** `isClone` written with `===` against a mixed-case
   `impl` reds the upper-cased row. The visible behaviour is step 10 (a) and (b). Greps:
   `grep -ic 5f5f365f5f37365f73 app/src/index.html` → `1`; `grep -ic -F 'd.pending.length'` → `0`
   (baseline 1) and `grep -ic -F 'd.pending && d.pending.length'` → `1`.

5. **The widget's inputs and decoder (R6, R12, R14), `app/src/widget.js`, with `eth.js` for R12.**
   - `render` (`:177-184`): `addr` is checked with `/^0x[0-9a-fA-F]{40}$/` before anything is
     written; a failing `data-rake` paints the error state (`:188-192`) with the text `data-rake is
     not an address` and **no `short(addr)`** in it, and returns before `fetchSnapshot`. That closes
     the `short(addr)` at `:197` and the `addr` in the `href` at `:198` together.
   - `data-link` (`:193-198`): the `href` is built from `new URL(link || <default>, location.href)`
     inside a `try`; only `protocol === 'http:' || protocol === 'https:'` emits the `<a>`; anything
     else — `javascript:`, `data:`, a string `URL` refuses — emits no link at all. An allow-list,
     not a denylist (step 0's `javascript:` grep stays `0`).
   - `decode` (`:135-148`): `if (!hex || !/^0x[0-9a-fA-F]+$/.test(hex) || hex.length < 642) return null;`
     — the hex check before the length check, so `reader` never slices a non-hex body; a non-hex
     answer then lands in the existing error state rather than in `foot`.
   - `arr` (`:129`): `var n = u(p); if (n > H.length / 64) throw 0;` — a length word larger than the
     body has words cannot be a real array, and the throw lands in `decode`'s own `catch` (`:148`),
     which returns `null`. In `app/src/eth.js:145`, `decOne`: `if (len > d.length / 64) throw new
     Error('array length ' + len + ' exceeds the data');` before `new Array(len)`.

   Check: `test/widget.test.mjs` — `decode` of the fixture with its table-length word rewritten to
   `0x00…0186a0` (100,000) → `null`; `decode('0xzz' + fixture.slice(4))` → `null`; the fixture
   unchanged → the same object as today (the row `:63` already reads, so no new row, but the run
   proves the check lets the real shape through). **Predicted reds:** without the `arr`
   bound, the 100,000 row returns an object with a 100,000-row table in a few hundred milliseconds
   rather than hanging — that is why the plant uses 100,000 and not 2³² — so the assertion `null`
   reds on a non-null value; without the hex check the `0xzz` row returns an object whose `owner` is
   `0xzz…` (quote it). `test/abi.test.mjs` — `Eth.dec(['uint256[]'], <head word 0x20, length word
   100000, no body>)` throws `/exceeds/`; **predicted red:** without the bound it returns an array of
   100,000 `0n`s and the `assert.throws` fails. For `data-rake` and `data-link`, the IIFE's `render`
   is not reachable from node without a DOM; those two are proved in the browser, step 10 (e) and
   (f), with the red planted on the reviewed build. `grep -ic eth_chainId app/src/widget.js` → `2`,
   unchanged — the RPC path gains no request.

6. **Reverse names (R10), `app/src/model.js` and `index.html:450-455`.** In `model.js`, beside
   `namehash` (`:285`): `plainName(name)` → `true` only for a string of at most 64 characters
   matching `/^[a-z0-9-]+(\.[a-z0-9-]+)+$/` after `String(name)` — lowercase ASCII letters, digits,
   hyphens, at least one dot, nothing else, no normalisation attempted. Export it (`:293`). In
   `nameSweep` (`:454`): `if (name && Model.plainName(name)) n.textContent = name;`, and the three
   resolvers are unchanged: the gate is at the one place the name is written, not at each lookup.
   The comment above `nameSweep` says what is refused and why (a forward-confirmed name proves its
   holder set it, not that a reader can tell it from another).

   Check: `test/model.test.mjs` — `vitalik.eth` → `true`; `a.b.c.eth` → `true`; a name with a
   Cyrillic `і` (U+0456) → `false`; a name containing U+200B → `false`; `Vitalik.eth` → `false`
   (case is the resolver's to normalise, not this gate's to accept); `eth` (no dot) → `false`; 65
   characters → `false`, 64 → `true`. **Predicted red:** the pattern without its `^`/`$` anchors
   reds the Cyrillic row, because the name's ASCII tail then matches on its own. Two plants that do
   **not** red, so they are not the ones to use: `\w` for `[a-z0-9-]` (`\w` is ASCII-only in
   JavaScript, so the Cyrillic row stays red-free) and `> 64` for `>= 65` (the same test). The cap's
   own plant is `< 64` for `<= 64`, which reds the 64-character row. Plant the anchors and the cap,
   quote both. `grep -ic plainName app/src/model.js` → `2` or more, `index.html` → `1`.

7. **The inline-script guard (R11), `app/inline-scripts.mjs:11`.** `scriptTags` scans
   case-insensitively — a `RegExp` `/<script(?=[\s/>])/gi` exec loop replacing both `indexOf`
   calls and the `:13` name check, or `indexOf` over `html.toLowerCase()` with the slice taken from
   the original (both keep the quote-aware attribute scan). Check: `test/inline-scripts.test.mjs`'s
   loop (`:28-41`) gains `['SRC, upper-cased tag', '<SCRIPT src="app.js"></SCRIPT>']` and
   `['defer, mixed case', '<Script defer>var a=1;</Script>']`; **predicted red:** both fail on `main`
   with `assert.throws` finding no throw. `grep -ic -F "indexOf('<script'" app/inline-scripts.mjs`
   → `0` (baseline 1).

8. **`tx` (R17), `app/src/index.html:147-165`.** Between the preflight and the send: `const on =
   parseInt(await P.request({ method: 'eth_chainId' }), 16); if (String(on) !== String(CFG.chainId))
   { const text = \`your wallet is on ${cname(on)} — this app lives on ${cname(CFG.chainId)}\`;
   txSay(label, text, 'bad'); return { ok: false, stage: 'chain', text }; }`, and `chainId: '0x' +
   Number(CFG.chainId).toString(16)` added to `params` (`:153`), with a comment saying the re-read is
   the check and the field is what a wallet that validates it enforces on its own side. **The field's
   effect in MetaMask is unmeasured here**: the handoff records what the dev provider does with it
   (anvil accepts a matching `chainId`), and if Denizen's m04-t05 run reaches a mismatch it records
   that too; the re-read is the measured check. `wrongChain()` at boot (`:527`) stays; this is the
   same test at the moment it matters.

   Check: step 10 (d). `grep -ic eth_chainId app/src/index.html` → `2` (baseline 1).

9. **The Cache section after a rejected re-read (#227 residual), `index.html` `cacheBind`.** The
   chain after `clear cache` — `history(…).then(h => absorb(t, d, h)).then(() => cacheBind()).catch(() => {})`
   as #227 wrote it — becomes `.then(h => absorb(t, d, h)).catch(() => {}).finally(() => cacheBind())`,
   with the comment above it (#227's, about the write-back) extended by one sentence: `readFunds`
   reads balances over RPC and can reject, and the section must be read again either way. Check:
   step 10 (g); `grep -ic finally app/src/index.html` → `1` (baseline 0).

10. **The browser check**, against a dev stack on spare ports as m04-t12 ran it (`ANVIL_PORT=<a>
    APP_PORT=<b> make deploy && make fixtures`, `make dapp`, `python3 -m http.server <b>` over
    `app/dist`), the page opened with `?rpc=http://127.0.0.1:<a>&from=<anvil account 0>` and
    `location.search` read back and recorded first. `page errors: none` in every run, as t01 and t12
    recorded. In this order, each with the figure the reviewer compares:
    - (a) **R3, the foreign contract.** Open `#/distros/<implementation address>` (step 0: it answers
      `snapshot()` and is not a clone). Before the fix the page paints it as a distribution — record
      the owner cell and the table it shows, which is the red. After: the `not a distribution of this
      app's factory` notice, no table, and `localStorage['rake.recent']` does not contain the address
      (read it before and after; the before value is the red for `addRecent`). Then the factory
      address: the same notice, reached through the `0x`-check-passed, `snapshot()`-reverts path.
    - (b) **R16.** `?rpc=…&from=…&nosnapshot=1#/distros/<seed distribution>` — the query before the
      hash, read back as in the preamble; `nosnapshot` is the dev fence at `:561` — so the fallback
      with `pending: null` lands in `rake.recent`; then `#/distros`. Before: the list stays on
      `reading…` with a `TypeError` in `page errors`. After: the row paints with no dot, and
      `page errors: none`.
    - (c) **R5, R7.** On `#/create` step 2: three rows at `33.334` — the sum line reads `bad` and the
      submit is `disabled` with `unassigned` in the reason; change to `33.33 / 33.33 / 33.34` → enabled.
      One row's address with a letter's case flipped → the `res` line shows `BAD_SUM`'s sentence and
      the submit is `disabled`; the lowercase form → enabled. Before the fix the first and third cases
      show the submit enabled — record both as the red.
    - (d) **R17.** Intercept the RPC with `page.route` on the dev endpoint. Load the page normally, then
      switch the route so `eth_chainId` answers `0x1` while every other method passes through; press
      `distribute` (or any write) and record: the status line's text (contains `this app lives on`),
      and the count of `eth_sendTransaction` bodies seen by the route → `0`. Before the fix the count
      is `1` and the status line reads `sent · waiting…` — the red. Restore the route and send one
      write to prove the path still sends: count `1`, receipt `0x1`.
    - (e) **R6.** A scratch host page outside the repo (start from `app/src/host.html`'s mount shape,
      `:107`) with the dev `widget.js` and four mounts: `data-rake="<img src=x onerror=alert(1)>"`;
      `data-rake=<seed> data-link="javascript:alert(1)//"`; `data-rake=<seed> data-link` (bare, the
      default link); `data-rake=<seed> data-link="https://example.com/app/"`. Record per mount: the
      count of `img` elements inside it (→ `0`), the count of `a[href^="javascript:"]` (→ `0`), the
      `href` of the bare-link mount (the page's own URL plus `#/distros/<seed>`), and the `href` of
      the https mount. Before the fix, mount 1's error line carries the raw `short()` of the payload
      and mount 2 has an `a[href^="javascript:"]` — record both counts as the red.
    - (f) **R12, R14.** Two more mounts on the same host page, each with `data-rpc` pointing at a
      stub endpoint the check runs (a few lines of node `http`): one answering `{"result":"0xzz…"}`
      (non-hex, ≥ 642 characters), one answering the fixture with its table-length word rewritten to
      100,000. Both mounts show the `could not read distribution` error state; neither shows a `foot`
      line. Before the fix the first shows a footer with `0xzz…` in it and the second a table — the
      red, recorded by `innerHTML` length and the presence of `rk-f`.
    - (g) **#227 residual.** A distribution page open behind `#/docs`, as t12's criterion 9 case:
      press `clear cache` with the route failing every `eth_getBalance` (→ `absorb` rejects at
      `readFunds`). Wait on `count() > 0` through `page.evaluate`, then read the Cache section: it
      prints `1 distribution cached · about N bytes` with `N` equal to the sum computed outside the
      page. Before the fix the section reads `0 distributions cached · about 0 bytes` over a store at
      count 1 — the red, recorded as t12's red 7 was.
    - (h) **The whole page once more** with no route and no stub: a distribution page, `#/distros`,
      `#/docs` with the Cache section, `#/create` step 2; `page errors: none`.

11. **`SECURITY.md` § Front end.** Every row this table fixes becomes `fix`, naming the hunk (file,
    function, commit) and the test, in the shape R2's row has; every row it accepts keeps `accepted`
    and gains the table's reason as its last sentence, replacing "a follow-on task the architect
    scopes from this rollup" with this task's name and, for R4, R8, R18, R9, R19, R24, the words
    `carried past m04-t13`. The section's summary sentence ("One row is a `fix`…", "twenty are
    `accepted`") is rewritten to the new counts, and both the count sentence and the row count are
    stated, as that section already does. **Nothing is removed from the rollup**: `AUDIT.md` is the
    legs' record and stays as committed.

12. **`HANDOFF.md`** beside this file: the AC table with the figures beside step 0's re-run baselines;
    one fix row per finding with its four parts and the planted red quoted; the widget and gzip
    deltas; § For Denizen naming R9 and R19 as the two wording questions this task leaves him, with
    the ledger sentence (`:1582`) and the docs claim (`:1921`) quoted so he can rule on the words;
    § Discoveries for anything the sinks taught; § For the Run B with the `make dapp-nodev` hashes
    for both chains, which the next Run B (`RUNBOOK.md` § Which run is this) uploads.

## Acceptance criteria

Every figure is read at the review head, not quoted from here. Baselines are step 0's, re-run at the
branch point and recorded in the handoff with the commit.

1. **The fix table is the diff.** Every row marked **fix** above has a `fix` row in `SECURITY.md`
   § Front end naming its hunk and its test, every row marked accept keeps `accepted` with the
   table's reason, the section's count sentence matches its 24 rows, and `git diff --stat
   origin/main -- app/ test/` touches nothing a row does not name (the handoff lists each file beside
   the rows that touch it).
2. **Planted reds.** Each predicted red in steps 2–9 was planted once and the red quoted in the
   handoff — the node rows: `esc` ×2 (step 2), `editorState` ×4 (step 3), `isClone` ×1
   (step 4), `decode`/`arr` ×2 and `Eth.dec` ×1 (step 5), `plainName` ×2 (step 6),
   `scriptTags` ×1 (step 7) — thirteen — plus the browser reds of step 10 (a)–(g) recorded on the reviewed
   build. A plant that did not red is declared as a deviation with what did.
3. **R3 in the browser.** Step 10 (a): the implementation address and the factory address both paint
   the foreign notice, no table, and `rake.recent` does not gain either; `isClone` is pinned in
   `test/ext.test.mjs` with the five rows of step 4.
4. **R5 and R7.** Step 10 (c) as recorded, and `test/editor.test.mjs` with the six rows of step 3
   passing; `grep -ic checksumOk app/src/index.html` → `9` (baseline 8).
5. **R6, R12, R14 in the widget.** Step 10 (e) and (f): zero `img` elements and zero
   `a[href^="javascript:"]` across the mounts, the bare and `https:` links as recorded, both stub
   mounts in the error state; `test/widget.test.mjs` with the step 5 rows; `test/abi.test.mjs` with
   the `exceeds` row.
6. **R17.** Step 10 (d): zero `eth_sendTransaction` under the flipped `eth_chainId`, one with it
   restored; `grep -ic eth_chainId app/src/index.html` → `2`.
7. **R10, R11, R15, R16, R21 by test and grep.** `Model.plainName` rows (step 6) pass;
   `test/inline-scripts.test.mjs` with its two new rows passes and `grep -ic -F "indexOf('<script'"
   app/inline-scripts.mjs` → `0`; `grep -ic 'u202E'` → `1` in `app/src/index.html` and `1` in
   `app/src/widget.js`; `grep -ic -F 'd.pending.length' app/src/index.html` → `0` and step 10 (b)
   paints; `grep -ic noreferrer` → `7` in `index.html`, `1` in `widget.js`, with `grep -ic noopener`
   unchanged at `7` and `1`.
8. **The Cache section after a rejected re-read.** Step 10 (g): the section's count equals `count()`
   and its bytes equal the outside sum after `clear cache` with `eth_getBalance` failing;
   `grep -ic finally app/src/index.html` → `1`.
9. **Bytes.** `make dapp-nodev CHAIN_ID=11155111` → `widget: raw N bytes · budget 10240 · M left`
   with `N ≤ 10240`, and `wc -c app/dist/widget.js` → the same `N`, **recorded as a signed delta
   against step 0's re-run `8132`** — the widget is expected to grow by a few hundred bytes for the
   first time since M02; the `dapp:` line's `gzip` figure recorded as a signed delta against step 0's
   re-run figure. Both hashes for both chains in the handoff § For the Run B.
10. **The docs page's checks still pass.** `node --test test/docs.test.mjs` passes with the section
    count as #227 left it (`15`) and no section added or removed; `grep -rniE
    '\btip\b|govUrl|about:|ownerKind' app/src | wc -l` → `4`, the same four `ownerKind` lines
    (M02 criterion 9, baseline stated).
11. **Nothing else moved.** `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot
    RUNBOOK.md scripts/ calldata/ audits/` empty; `node --test test/*.test.mjs` passes with more
    tests than step 0's re-run count and the handoff names the added ones per file; `forge test` count
    unchanged from `main` and stated; `make fmt`, `forge lint` and CI pass at the head; `git status
    --porcelain` empty after `make dapp-nodev CHAIN_ID=11155111`.
12. **The Run B gate.** The PR merges before the next Run B's step 4 is prepared, and the handoff's
    § For the Run B says so with the hashes; if the Run B has already been prepared when this is
    ready, the handoff says that instead and the architect re-sequences — this task does not start an
    upload.

## Out of scope

- R1 (the decision issue), R2 (done in #230), R13, R20, R22 (`design`), R23 (trust boundary).
- R4, R8, R18: `app/build.mjs` and `app/broadcast.mjs` validation and the computed featured
  address, carried to one build-hardening task that needs no upload; it runs before M05 builds the
  mainnet document.
- R9, R19, R24: the wording and product questions above, carried; the engineer surfaces anything the
  work teaches about them in `HANDOFF.md` § For Denizen, and changes no text under decision 17.
- The widget's chain check on the `data-rpc` path and the widget's own clone check (R14 and R3's
  widget halves): the one-`eth_call` contract stands.
- ENSIP-15 normalisation, `<bdi>` isolation, a full-address display form (R13).
- Any `src/` byte, `.gas-snapshot`, `RUNBOOK.md`, the upload itself and m04-t05.
- `MAX_WINDOWS`, the cache's rules, anything m04-t12 ruled.

## Open questions

None. The fix/accept table is the architect's triage from the rollup under the #225 ruling, and the
two wording items (R9, R19) go to Denizen through the handoff, not through this task's code.

## Context

- [`audits/2026-11-17/frontend/AUDIT.md`](../../../../../audits/2026-11-17/frontend/AUDIT.md), the
  rollup; `SECURITY.md` § Front end, the register this task rewrites rows of;
  [#225](https://github.com/dnznlabs/rake/issues/225) and the architect's ruling of 2026-11-17 on the
  findings (R1 accepted with a decision issue, R2 fixed in t04, the rest to this task), and
  [#230](https://github.com/dnznlabs/rake/pull/230), whose `shaped()` at `ext`/`xlink` and
  `test/ext.test.mjs` are the pattern.
- [m04-t12 HANDOFF.md](../m04-t12/HANDOFF.md) § Discoveries (the `absorb` residual, `npx serve`),
  § The browser check (the harness); [m04-t11 TASK.md](../m04-t11/TASK.md) and
  [m04-t12 TASK.md](../m04-t12/TASK.md), the shape this plan follows.
- `src/Distribution.sol:459-497` (`create`, `predict`, the clone bytes) and `:325-345` (the table
  validator this task's editor mirrors); `ROADMAP.md` decisions 12 (the widget's cost model), 13
  (name resolution order), 17 (the docs page's voice).
- `RUNBOOK.md` § Which run is this and § Uploads: the Run B this task's bundle rides.
