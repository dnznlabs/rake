# m04-t14 — Build hardening: validated inputs and a computed featured address

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, every value `app/build.mjs` writes into the three artifacts has a declared shape
it was checked against, every address it reads out of a broadcast log has been recomputed from the
log's own init code and salt, `pairable()` checks the hash join it exists to protect, and the docs
page computes the featured distribution's address itself and refuses to paint the support payment
when the provider says otherwise. The three `SECURITY.md` § Front end rows this closes (R4, R8, R18)
become `fix` rows. `app/`, `test/*.mjs` and those three rows only; nothing under `src/`, no
`.gas-snapshot` change, no upload. This task is live on merge for R4 and R8 — they change no shipped
byte — and R18 is a page change that rides whichever upload follows it; this task starts none.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`).
Never `devbox run -- bash -c` with a pipe; write a script. Scratch files go under a directory outside
the repo. **Branch `m04/t14-build-hardening` from `origin/main` at or after
[#237](https://github.com/dnznlabs/rake/pull/237) (m04-t13's last amendment, merge `3751211`)**: t13
rewrote the `SECURITY.md` rows this task rewrites again and added the `CLONE` constant step 5 builds
on. Check hooks with `ls .git/hooks | grep -v sample` → `pre-commit`, `post-commit`. **Line numbers
below are `main` at `3751211`** for `app/build.mjs`, `app/broadcast.mjs`, `app/version.mjs`,
`app/src/eth.js`, `app/src/index.html` and `test/build.test.mjs`; trust names over numbers.
[#227](https://github.com/dnznlabs/rake/pull/227) (m04-t12) is held and this task does not depend on
it or touch what it touches.

The three findings are `SECURITY.md` § Front end rows R4, R8 and R18 and the rollup entries
[`audits/2026-11-17/frontend/AUDIT.md`](../../../../../audits/2026-11-17/frontend/AUDIT.md) § R4,
§ R8 and § R18; the carried issue is [#235](https://github.com/dnznlabs/rake/issues/235). Which rule
answers which sentence of those rows is the table below, and the engineer does not re-triage. Every
rule has the same four parts, and the handoff reports each: the input or sink, the check, the test
that is red without it (**planted once, the red quoted; a predicted red that does not red is a
deviation, not a pass**), and the exact command the red was taken with.

| Finding | Sentence in the row | Rule | Step |
|:--|:--|:--|:--|
| R4 | a quote in any value breaks out of the `CFG` literal; `--set VERSION=<img…>` discards `version.mjs`'s validation | every token has a declared shape, checked whatever the source (A1, A2) | 2 |
| R4 | a log's `contractAddress` passes through `Eth.checksum` unchecked | `creations()` refuses a creation whose address is not 20 hex bytes (A3) | 3 |
| R4 | a valid replacement address silently re-points the bundle at another factory | every creation through the keyless proxy is recomputed from its init code and salt; the implementation from the factory's `additionalContracts` with salt zero (A4); a `--set` that overrides a log value says so on stderr (A5) | 3 |
| R4 | in `deployed()` the last `contractName` wins | a name seen twice is refused with both files (A6) | 2 |
| R8 | `pairable()` requires neither unique hashes nor a receipt per hash | hashes unique on both lists, and the two sets equal (B1, B2) | 4 |
| R8 | the creation takes the other transaction's block | the creation's receipt agrees with it: `contractAddress` when the receipt carries one, `status` `0x1` (B3) | 4 |
| R18 | the featured address is read from the provider | the page computes it from `CFG.factory`, the implementation as a build constant and the salt, and refuses the support form when the provider differs (C1–C4) | 5 |

0. **Baselines**, re-run at the branch point and recorded in the handoff with the commit and the
   date, never carried from here. On `main` at `3751211`, 2026-11-18, re-run at the branch point, the
   figures were: `node --test test/*.test.mjs` → `ℹ tests 144 · ℹ pass 144 · ℹ fail 0`;
   `make dapp-nodev CHAIN_ID=11155111` → `dapp: raw 145765 bytes · gzip 46189 bytes · chain 11155111`,
   `widget: raw 8509 bytes · budget 10240 · 1731 left`; `wc -c app/dist/widget.js` → `8509`. Re-run
   those three, then these greps (every grep in this plan is `-i`; the figure before is the
   denominator the figure after is read against; all measured at `3751211`, re-run):
   - `grep -ic -F '4e59b448' app/broadcast.mjs` → `0`; `app/build.mjs` → `0`.
   - `grep -ic -F '602d5f8160095f39f35f5f365f5f37365f73' app/src/index.html` → `0`;
     `app/broadcast.mjs` → `0` (the clone init prefix appears nowhere outside `src/` today).
   - `grep -ic -F 'predict(bytes32)' app/src/index.html` → `2` (`:578` at boot, `:1832` on create).
   - `grep -ic -F 'S.featured' app/src/index.html` → `9`.
   - `grep -ic -F '__DISTRIBUTION__' app/src/index.html` → `0`; `grep -oh '__[A-Z][A-Z0-9_]*__'
     app/src/index.html app/src/widget.js app/src/host.html | sort -u | wc -l` → `6` (`APP`,
     `CHAIN_ID`, `DISTRIBUTIONFACTORY`, `DISTRIBUTIONFACTORY_BLOCK`, `FEATURED_SALT`, `VERSION`).
   - `grep -ic -F 'new Set' app/broadcast.mjs` → `0`.
   - `grep -ic -F 'rake#140' app/build.mjs` → `1`; `app/broadcast.mjs` → `2`
     (`test/build.test.mjs:145` pins the first at exactly one).
   - `grep -c '^| R' SECURITY.md` → `24`; `grep -c 'accepted\`' SECURITY.md` → `11`.
   - The CREATE2 figures, **rehearsed on 2026-11-18 at `3751211` with `Eth.keccak` from
     `app/src/eth.js` against the two tracked `broadcast/Deploy.s.sol/*/run-latest.json`, re-run**:
     both logs' one transaction is a `CREATE2` whose `transaction.to` is
     `0x4e59b44847b379578588920ca78fbf26c0b4956c` and whose `transaction.input` is the 32-byte salt
     `0xc7b08946…476693` (`RUNBOOK.md:69`, `FACTORY_SALT`) followed by the init code; `keccak(0xff ‖
     proxy ‖ salt ‖ keccak(init))` low 20 bytes → `0x00d18b5b72c4d8e7761776d1275b69d4dbcde71b`, equal
     to `contractAddress`. Each log's `additionalContracts[0]` is `{ transactionType: 'CREATE2',
     contractName: 'Distribution', address: '0x31dd18b4…cfa4b0', initCode }`, and `keccak(0xff ‖
     factory ‖ 0x00…00 ‖ keccak(initCode))` → that address (`src/Distribution.sol:439`, `salt:
     bytes32(0)`). The 54-byte clone init code `0x602d5f8160095f39f35f5f365f5f37365f73 ‖ impl ‖
     0x5af43d5f5f3e6029573d5ffd5b3d5ff3` (`src/Distribution.sol:473-475`, hashed at `:493-496`) with
     factory, implementation and `FEATURED_SALT_DNZN` (`mk/15-seed.mk:10`) → checksummed
     `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`, decision 50's address, on both chains. Record all
     three re-runs in the handoff; a figure that does not reproduce stops the task at step 3.

1. **Read the three rollup entries and the three rows** so each hunk is written against the leg's
   reproduction and not this summary. Check: nothing to run; the handoff's fix rows cite the rollup
   line each rule answers.

2. **Shapes for every value (A1, A2, A6), `app/values.mjs` new, wired at `app/build.mjs:73-78`.**
   A new module, for the reason `app/version.mjs:10-12` gives for itself: `build.mjs` does its work
   at import, so a rule that lives there cannot be read by a test without running a build. It exports
   `SHAPES`, one entry per token the three sources use, and nothing outside this table is
   substitutable:

   | Token | Shape | Why that and no wider |
   |:--|:--|:--|
   | `CHAIN_ID` | `/^[1-9][0-9]{0,9}$/` | a decimal chain id; `CFG.chainId` is compared as a string and parsed with `Number` (`index.html:115`, `:164`) |
   | `VERSION` | `/^[0-9]+\.[0-9]+[a-z]{0,8}$/` | the page string `marked()` produces (`version.mjs:41`: `v?<major>.<minor>` minus the `v`, plus the marker); a `--set` has to supply the same shape, so no markup and no quote can reach `:34` or `:1978` |
   | `DISTRIBUTIONFACTORY`, `APP`, `DISTRIBUTION` | `/^0x[0-9a-fA-F]{40}$/` and `v === Eth.checksum(v)` | an address, checksummed, as `build.mjs:47` already writes it — mixed case that is not the checksum is a typo, and lowercase gzips to a different size (`:46`) |
   | `DISTRIBUTIONFACTORY_BLOCK` (every `*_BLOCK`) | `/^0x(0|[1-9a-f][0-9a-f]*)$/` | the form `build.mjs:48` writes: `'0x' + BigInt(n).toString(16)`, no leading zeros, lowercase |
   | `FEATURED_SALT` | `/^0x[0-9a-fA-F]{64}$/` | 32 bytes; `mk/15-seed.mk:9-10` |

   `check(values)` returns the values unchanged or throws one error naming every failing token with
   its source (`--set`, the log file, or the default) and the shape it failed; a token with no `SHAPES`
   row fails closed with `no shape declared for __X__ — add one to app/values.mjs`. `build.mjs` keeps
   the `--set` loop at `:74-78` but (A1) refuses an argument whose key fails `/^[A-Z][A-Z0-9_]*$/`
   (the token grammar `substitute` matches at `:83`) or whose value is empty, naming the argument, and
   (A2) calls `check` on the merged `values` once, after the loop and before the first `substitute`
   (`:104`), so the same table covers the log's addresses, `marked()`'s output and the `CHAIN_ID`
   default alike. Every shape is an allow-list, so there is no escaping function and no sink changes:
   none of the five admits `'`, `\`, `<`, `&` or a newline, which is what closes leg 1's
   `--set VERSION=<img…>` and the quote in the `CFG` literal at `index.html:34`. (A6) In `deployed()`
   (`build.mjs:40-47`) a `name` already in `out` throws naming both files and the name —
   `build: DistributionFactory is created by broadcast/A.s.sol/… and broadcast/B.s.sol/…` — instead
   of the later directory winning. **Rejected:** routing `--set VERSION` through `marked()` so the
   flag takes `App`'s argument rather than the page string — it changes the meaning of a documented
   override (`build.mjs:72`, m04-t09 § Deviations) for no gain the shape does not already give.

   Check: `test/build.test.mjs` gains, for `check`: one passing row with the six tokens the Sepolia
   build resolves (the values step 0 lists); one row per token with a failing value — `CHAIN_ID`
   `'0x1'`, `VERSION` `"0.1alpha'"` and `'<img src=x onerror=alert(1)>'`, `DISTRIBUTIONFACTORY`
   lowercase (`isAddr` passes, checksum fails) and `'0x' + 'g'.repeat(40)`, `DISTRIBUTIONFACTORY_BLOCK`
   `'0x0b88091'` (leading zero) and `'12'`, `FEATURED_SALT` 63 hex digits — each `assert.throws`
   matching the token's name; and `{ FOO: 'x' }` → throws `/no shape declared for __FOO__/`.
   **Predicted reds, one plant each:** `VERSION`'s shape widened to `/.*/` reds its two rows and
   nothing else; the checksum equality dropped reds the lowercase-address row only; the
   `no shape` throw replaced by `return` reds the `FOO` row. Three plants, three reds, quoted with
   `devbox run -- node --test test/build.test.mjs`. For A1 and A6 the surface is `build.mjs` itself,
   so the test runs it: `spawnSync(process.execPath, ['app/build.mjs', '--chain', '11155111', '--set',
   'FEATURED_SALT=<FEATURED_SALT_DNZN>', '--set', "VERSION=0.1alpha'"])` → `status` `1`, stderr
   matching `/VERSION/`, and `app/dist/index.html`'s mtime (or absence) unchanged across the run —
   the refusal path leaves `app/dist` as it was (`build.mjs:129-130`), which is why this test may run
   the real build on the tracked Sepolia logs; a green build in a test would write `app/dist` and is
   not written. The same spawn with `--set` `lowercase=1` → `1` and `/lowercase/`. A6 is unit-tested
   through `creations()` in step 3's duplicate-name row, and the `deployed()` throw is pinned the way
   `:136-146` pins the withheld wiring: `assert.match(src, /is created by/)`. **Predicted red:** with
   the `check(values)` call removed from `build.mjs`, the `VERSION=0.1alpha'` spawn exits `0`
   (quote the stdout `dapp:` line it prints) — then restore and confirm `app/dist` carries no quote:
   `grep -c "0.1alpha''" app/dist/index.html` → `0`. (Amended 2026-11-18: the original pattern
   `"0.1alpha'"` matches the closing quote of the legitimate `version: '0.1alpha',` and reads `1` on
   any correct build; the injected value would print `0.1alpha''`. Declared as deviation 1 in #255.)

3. **The log's addresses recomputed (A3, A4, A5), `app/broadcast.mjs`.** Add beside `isCreate`
   (`:16`): `export const PROXY = '0x4e59b44847b379578588920ca78fbf26c0b4956c'` with a comment naming
   `scripts/forge/Deploy.s.sol:11-13` and decision 33, and `export function create2(deployer, salt,
   initCode)` → the checksummed address `'0x' + keccak(0xff ‖ deployer ‖ salt ‖ keccak(initCode))`
   low 20 bytes, through `Eth.keccak` and `Eth.hexBytes` (`app/src/eth.js:22`, `:35`; `build.mjs:17`
   already imports `Eth`, and `broadcast.mjs` gains the same import). In `creations()` (`:61-71`):
   - (A3) a creation whose `contractAddress` fails `/^0x[0-9a-fA-F]{40}$/` throws naming the file
     and the value — `creations(log, file)` gains the file for its messages, and `build.mjs:44` passes
     it. `Eth.checksum` (`eth.js:188-191`) lowercases and re-cases but passes any other character
     through, so it is not a filter.
   - (A4) a creation whose `transaction.to` is `PROXY` is recomputed: `salt = input.slice(2, 66)`,
     `initCode = '0x' + input.slice(66)`, and `create2(PROXY, salt, initCode)` must equal
     `contractAddress` case-insensitively, else throw naming the file, the logged and the computed
     address. A creation not through the proxy (a plain `CREATE`, which is what `Fixtures.s.sol`'s
     four mocks are) is not recomputed — its address follows a nonce the log does not carry — and
     the handoff says so. The factory's `additionalContracts` entry with `contractName:
     'Distribution'` is yielded as a creation `{ name: 'Distribution', address, block: null, args:
     null }` and recomputed as `create2(<factory address>, 0x00…00, initCode)` — salt zero by
     `src/Distribution.sol:439`; any other additional contract is neither yielded nor asserted.
     That is what resolves the new token `__DISTRIBUTION__` step 5 adds, through `deployed()`'s
     existing loop with no change to `build.mjs` beyond the file argument.
   - (A5) in `build.mjs:74-78`, a `--set` whose key is already in `onchain` prints
     `build: --set NAME overrides the log's <old> with <new>` to stderr and continues: the override is
     the flag's documented purpose (`:10`, `:72`) and the finding is that it was silent.

   Check: `test/build.test.mjs` — `create2(PROXY, <salt>, <init>)` for the real Sepolia log, read from
   `broadcast/Deploy.s.sol/11155111/run-latest.json` (tracked; the test skips if absent, as `:235-251`
   does), equals its `contractAddress`; the same file through `creations()` yields `DistributionFactory`
   at `0x00D18B5b…` **and** `Distribution` at `0x31dd18b4…`; a copy of `ONE` (`:23-26`) with
   `transaction: { to: PROXY, input: <salt ‖ init> }` and `contractAddress` one hex digit off →
   `assert.throws` matching `/computed/` and both addresses; `ONE` with `contractAddress`
   `'0x' + 'g'.repeat(40)` → throws `/not an address/`; a log with the same `contractName` in two
   transactions → `creations()` yields both, and the `deployed()` source grep of step 2 covers the
   refusal. **Predicted reds:** the init-code slice taken from offset 2 instead of 66 (salt hashed
   into the init code) reds the Sepolia equality and the one-digit-off row together; the address
   regex dropped reds the `g`-row. Two plants, quoted with `devbox run -- node --test
   test/build.test.mjs`. Greps: `grep -ic -F '4e59b448' app/broadcast.mjs` → `1` (baseline 0),
   `app/build.mjs` → `0` unchanged.

4. **The hash join (B1–B3), `app/broadcast.mjs:44-47` and the message at `:31-39`.** `pairable(log)`
   keeps its two tests and adds, in this order: (B1) `new Set(txs.map(t => t.hash)).size ===
   txs.length` and the same over `receipts.map(r => r.transactionHash)`; (B2) every transaction hash
   has a receipt and every receipt hash a transaction (with B1 and equal counts, one receipt per
   hash); (B3) for the one creation, its receipt's `contractAddress`, when not `null`, equals the
   transaction's case-insensitively (through the proxy the receipt's is `null` on both tracked logs,
   read 2026-11-18, and a plain `CREATE` carries the address), and its `status`, when present, is
   `0x1`. `pairable` stays a boolean; `assertPairable`'s message (`:31-39`) gains one clause naming
   which test failed — `two transactions share hash 0x…`, `receipt 0x… has no transaction`,
   `the creation's receipt names 0x… and the transaction 0x…` — so a reader knows what is wrong with
   the log, not only that something is. `creations()` (`:68`) is otherwise unchanged: with B1 and B2
   holding, `blocks.get(t.hash)` is the creation's own receipt, which is the sentence of R8 this
   answers. The comment at `:11-12` ("One creation per script is what makes it safe") is corrected:
   one creation bounds the damage; the join checks are what make it safe.

   Check: `test/build.test.mjs` gains, each on a one-creation log: two transactions under hash
   `0xaa` with two receipts `0xaa`, `0xbb` → `pairable` `false` and `assertPairable` throws
   `/share hash 0xaa/` (leg 1's reproduction: today `pairable` is `true` and the creation takes
   whichever block the map kept last); transactions `0xaa`, `0xbb` with receipts `0xaa`, `0xaa` →
   `false`, `/0xbb has no receipt/`; the creation's receipt carrying `contractAddress`
   `'0x' + '3'.repeat(40)` against a transaction at `'1'.repeat(40)` → `false`, `/names/`; receipt
   `status: '0x0'` → `false`; and `ONE` unchanged → `true`, `creations(ONE)[0].block === '0x7b'`
   (`:56-69` already pins that and stays green). **Predicted reds, one plant each:** B1 removed reds
   the shared-hash row and no other; B2 removed reds the missing-receipt row; B3 removed reds the
   `names` and `status` rows. Three plants, quoted. `grep -ic -F 'new Set' app/broadcast.mjs` → `2`
   or more (baseline 0); the Fixtures row (`:117-134`) and the working-tree row (`:235-269`) stay
   green, which is the check that the two tracked logs pass every new test.

5. **The featured address computed on the page (C1–C4), `app/src/index.html`.** (C1) `CFG` (`:34`)
   gains `impl: '__DISTRIBUTION__'`, resolved by step 3 from the factory's own creation log. (C2)
   Beside `CLONE` (`:386`): `const predictLocal = salt => Eth.checksum('0x' +
   Eth.keccak(Eth.hexBytes('ff' + CFG.factory.slice(2) + salt.slice(2) + Eth.keccak(Eth.hexBytes(
   '602d5f8160095f39f35f5f365f5f37365f73' + CFG.impl.slice(2) + '5af43d5f5f3e6029573d5ffd5b3d5ff3'))))
   .slice(24))` — the 54 bytes `predict` hashes (`src/Distribution.sol:489-499`), the 9-byte init
   prefix in front of the 45 runtime bytes `CLONE` already carries — with a comment naming those
   lines and step 0's rehearsal. `CFG.impl` and never `S.impl`: a provider that lies about `predict()`
   lies about `implementation()` too, which is why R18 could not share R3's inputs (`SECURITY.md`
   row R18). (C3) In `load()` (`:577-593`) both provider reads stay; after them: `const mine =
   predictLocal(CFG.featuredSalt); if (String(a).toLowerCase() === mine.toLowerCase()) S.featured = a;
   else { S.featured = null; S.featuredLie = { said: a, computed: mine }; }`. (C4) The two paints:
   `#/docs` § Economics (`:1992-1994`) paints, when `S.featuredLie` is set, in place of the form,
   `notice(\`this page computes the featured distribution at ${ext('address', computed, …)}; your
   wallet's provider answered ${short(said)} instead — the support form is not shown.\`, 'err')`, and
   otherwise what it paints today; the landing (`:1114`) returns before `loadDistro` when
   `!S.featured` (today `loadDistro(null)` would send `eth_getCode` with a `null` address). `giveBind`
   (`:2066`) is untouched: with no form there is no button to bind. The widget demo (`:1954-1972`)
   already handles a null `S.featured`. **Nothing else reads the computed address**: `S.impl` keeps
   the provider's value for `isClone`, `MAX_BENEFICIARIES()` and `GRACE()`, and the create screen's
   `predict` at `:1832` keeps the provider's — replacing either is a runtime change beyond R18 and is
   surfaced in the handoff, not made.

   Check: `test/ext.test.mjs` lifts `predictLocal` beside `isClone` with `CFG = { factory:
   '0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B', impl: '0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0' }`:
   `predictLocal('0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001')` →
   `'0x71a4221974Fc2E95081AE513248918dF27CF7a4A'` (decision 50, read from both testnets 2026-11-17;
   step 0 reproduces it from the logs); the same salt with its last byte `02` → a different address
   of the same shape; a lowercase `CFG.impl` → the same answer (the hash takes bytes, not case).
   **Predicted red:** the 9-byte prefix dropped, hashing the 45 runtime bytes alone, reds the
   decision-50 row with another address (quote it). `test/docs.test.mjs` keeps its fourteen sections
   (`:88`): no section is added. The browser check, as m04-t13 ran it (`python3 -m http.server`,
   `?rpc=…&from=…` read back from `location.search`): (a) `#/docs` on the dev chain paints the form —
   the dev `FEATURED_SALT_DEV` is seeded by `make deploy`, and `predictLocal` must agree with anvil's
   `predict()`, which is the live check that `__DISTRIBUTION__` resolved to the right address on a
   chain nobody computed by hand; (b) `page.route` answers `predict(bytes32)` (selector `0x` +
   `Eth.sel('predict(bytes32)')`) with `0x…dead`-ending word and passes every other call through:
   `#/docs` paints the `not shown` notice with the computed address and no `#give-go`; the landing's
   `#featured` slot is empty; `page errors: none`. Before the fix (b) paints the form naming the
   lying address — record it as the red. Greps: `grep -ic -F '602d5f8160095f39f35f5f365f5f37365f73'
   app/src/index.html` → `1`; `grep -ic -F '__DISTRIBUTION__' app/src/index.html` → `1`; the
   token count of step 0 → `7`; `grep -ic -F 'predict(bytes32)' app/src/index.html` → `2`,
   unchanged (no provider read is removed; one comparison is added).

6. **`SECURITY.md` § Front end.** Rows R4, R8 and R18 become `fix` rows in the shape R11's row has
   at `3751211`: the hunk (file, function, commit), the test rows and the quoted red, the grep with
   its baseline, and `#235` named as the carried issue each closes. The summary paragraph's counts
   are rewritten — the `fix` count rises by three, `accepted` falls to five (R1, R23 on the trust
   boundary; R9, R19, R24 carried for wording) — and both the count sentence and the row count are
   restated, as the section does today. `AUDIT.md` is not touched.

7. **`HANDOFF.md`** beside this file: the AC table beside step 0's re-run baselines; one rule row per
   finding (A1–A6, B1–B3, C1–C4) with its four parts and the planted red quoted under its command;
   the byte deltas; § For Denizen: nothing expected beyond the merge — say so, or say what came up;
   § Discoveries; § For the next upload: both chains' `make dapp-nodev` hashes, stating that the
   next upload after the Run B that carried t11, t04 and t13 is M05's mainnet document unless m04-t05
   produces a re-upload, and that this task starts none.

## Acceptance criteria

Every figure is read at the review head, not quoted from here. Baselines are step 0's, re-run at the
branch point and recorded in the handoff with the commit.

1. **The rule table is the diff.** Every rule A1–A6, B1–B3, C1–C4 has a row in the handoff naming its
   hunk and its test; `git diff --stat origin/main -- app/ test/ SECURITY.md` touches only
   `app/build.mjs`, `app/broadcast.mjs`, `app/values.mjs`, `app/src/index.html`, `test/build.test.mjs`,
   `test/ext.test.mjs` and `SECURITY.md`, and nothing else (`git diff --stat origin/main --
   src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/ audits/ app/src/widget.js
   app/src/eth.js app/src/model.js app/version.mjs app/inline-scripts.mjs` is empty, with the full
   diff's file count stated beside it as the denominator).
2. **Planted reds.** Each predicted red was planted once and quoted in the handoff with the exact
   command: step 2 ×3 unit (`VERSION`, checksum, `no shape`) and ×1 spawn (the `check` call removed),
   step 3 ×2, step 4 ×3, step 5 ×1 and the browser red of step 5 (b) — eleven. A plant that did not
   red is declared as a deviation with what did.
3. **Shapes (A1, A2).** `test/build.test.mjs`'s `check` rows pass; the two `spawnSync` refusals exit
   `1` with the named token on stderr and `app/dist` unchanged; `grep -c "0.1alpha''"
   app/dist/index.html` → `0` after `make dapp-nodev CHAIN_ID=11155111` (amended 2026-11-18, see
   step 2's predicted red: the single-quote pattern reads `1` on every correct build); `app/values.mjs` declares
   exactly the seven tokens step 0's count reaches after step 5, and
   `grep -oh '__[A-Z][A-Z0-9_]*__' app/src/index.html app/src/widget.js app/src/host.html | sort -u`
   lists no token `SHAPES` lacks (both lists in the handoff, side by side).
4. **Recomputed addresses (A3, A4, A6).** The Sepolia and Base Sepolia logs, read from the tree,
   recompute to their logged factory `0x00d18b5b…` and implementation `0x31dd18b4…` through
   `create2` (the handoff quotes the test's output for both chains); the one-digit-off and `g`-rows
   throw; `grep -ic -F '4e59b448' app/broadcast.mjs` → `1` (baseline 0); `assert.match(src, /is
   created by/)` pins the duplicate-name refusal in `build.mjs`.
5. **The override says so (A5).** `node app/build.mjs --chain 11155111 --set FEATURED_SALT=<DNZN>
   --set DISTRIBUTIONFACTORY=0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` (the log's own value)
   prints `overrides the log's` on stderr and exits `0`; recorded in the handoff with `app/dist`
   rebuilt afterwards from the plain command so the committed state is the unforced one.
6. **The join (B1–B3).** The five `pairable` rows of step 4 pass; the working-tree row
   (`test/build.test.mjs:235-269` at `3751211`) and the Fixtures row stay green; `grep -ic -F
   'new Set' app/broadcast.mjs` ≥ `2` (baseline 0); `assertPairable`'s message names the failing
   test in each of the three throwing rows (`assert.match` on each).
7. **R18 on the page (C1–C4).** `predictLocal` is pinned in `test/ext.test.mjs` with the three rows
   of step 5, the first equal to decision 50's `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`; step 5
   (a) and (b) recorded with `location.search` read back and `page errors: none`; `grep -ic -F
   '602d5f8160095f39f35f5f365f5f37365f73' app/src/index.html` → `1`, `grep -ic -F '__DISTRIBUTION__'`
   → `1`, `grep -ic -F 'predict(bytes32)'` → `2`, and `grep -ic -F 'S.featured' app/src/index.html`
   stated against the baseline `9` with the delta explained row by row.
8. **Bytes.** `make dapp-nodev CHAIN_ID=11155111` → `widget: raw N bytes · budget 10240 · M left`
   with `N` **equal to step 0's re-run figure, delta `0`** — no rule touches `widget.js` — and
   `wc -c app/dist/widget.js` the same `N`; the `dapp:` line's `gzip` figure recorded as a signed
   delta against step 0's re-run figure, R18 being the only change that can move it, and the raw
   figure beside it. Both hashes for both chains in the handoff § For the next upload.
9. **`SECURITY.md`.** Rows R4, R8, R18 read `fix`, each naming `#235`; `grep -c '^| R' SECURITY.md`
   → `24`; `grep -c 'accepted\`' SECURITY.md` → `8` (baseline 11; the three rows) and the summary
   paragraph's counts sum to 24 as stated in the text; `git diff --stat origin/main -- audits/`
   empty.
10. **Nothing else moved.** `node --test test/*.test.mjs` passes with more tests than step 0's re-run
    count and the handoff names the added ones per file; `forge test` count unchanged from `main` and
    stated; `make fmt`, `forge lint` and CI pass at the head; `git status --porcelain` empty after
    `make dapp-nodev CHAIN_ID=11155111`; `test/docs.test.mjs` passes with its fourteen sections.
11. **The M05 gate.** This PR merges before M05's mainnet-document build is prepared — the first
    build an unvalidated input would reach on mainnet, and the one that paints the featured address
    the DNZN distribution carries at `0x71a4…` on every chain (decision 50). No upload is started by
    this task: R4 and R8 are live on merge, and R18 rides the next upload after the Run B that
    carried t11, t04 and t13, which is M05's mainnet document unless m04-t05 produces a re-upload
    first; the handoff § For the next upload says which, with the hashes. If a mainnet build has
    already been prepared when this is ready, the handoff says so and the architect re-sequences.

## Out of scope

- Any runtime change beyond R18: `S.impl`, `MAX_BENEFICIARIES()`, `GRACE()` and the create screen's
  `predict` keep their provider reads; replacing `S.impl` with `CFG.impl` is noted in the handoff
  for a later task, not made.
- The widget: no rule touches `app/src/widget.js`, and criterion 8 holds its size at delta `0`.
- [#227](https://github.com/dnznlabs/rake/pull/227) (m04-t12, held) and anything it touches.
- Any upload or re-upload, the Run B, m04-t05 and the mainnet document itself.
- R1 and R23 (`accepted` on the trust boundary), R13, R20, R22 (`design`), and R9, R19, R24 (carried
  for wording and the `mount` signature): their rows are not rewritten.
- Recomputing a plain `CREATE` address from a nonce the log does not carry; asserting any additional
  contract other than the factory's `Distribution`.
- Any `src/` byte, `.gas-snapshot`, `RUNBOOK.md`, `scripts/forge/*`, `mk/*`, the Makefile.

## Open questions

None. Every rule's shape was settled against the code and the two tracked logs at `3751211` (step
0's rehearsal), and the two choices a reader might contest are recorded with their rejected
alternative where they are made: the shape `--set VERSION` must take (step 2) and the new
`app/values.mjs` module rather than rules inside `build.mjs` (step 2, `version.mjs:10-12`'s reason).

## Context

- [#235](https://github.com/dnznlabs/rake/issues/235), the carried issue;
  [`audits/2026-11-17/frontend/AUDIT.md`](../../../../../audits/2026-11-17/frontend/AUDIT.md) § R4,
  § R8, § R18; `SECURITY.md` § Front end rows R4, R8, R18 as m04-t13 left them.
- [m04-t13 TASK.md](../m04-t13/TASK.md), the shape this plan follows, and its step 4 (`CLONE`,
  `isClone`) that step 5 builds on; [m04-t09 TASK.md](../m04-t09/TASK.md) and
  [HANDOFF.md](../m04-t09/HANDOFF.md) § Deviations for what `--set VERSION` was kept as.
- `src/Distribution.sol:439` (the implementation's salt), `:459-486` (`create`, the init code),
  `:489-499` (`predict`); `scripts/forge/Deploy.s.sol:11-18` (the proxy route and `FACTORY_SALT`);
  `mk/15-seed.mk` (the two salts); `RUNBOOK.md:69` and `:340-341` (the same computation by `cast`).
- `ROADMAP.md` decisions 12 (the widget's cost model, why its bytes do not move here), 33 (the
  keyless proxy), 37 (the mined salts), 45 (the version string), 50 (the DNZN distribution and the
  address decision 50 states, which step 5 reproduces).
- `RUNBOOK.md` § Which run is this and § Uploads: the upload R18 rides.
