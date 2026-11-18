# m04-t14 — handoff

PR: not yet opened (Denizen opens it) · Branch: `m04/t14-build-hardening` · 2026-11-18

Branched from `origin/main` at `e6e5a42`, which is after `3751211` (m04-t13's last amendment). Every
value `app/build.mjs` writes into the three artifacts now has a declared shape in the new
`app/values.mjs`, checked once over the merged values so a `--set`, a broadcast log and the one
default are all held to the same table; every address a log yields is refused unless it is 20 hex
bytes, and every creation routed through the keyless proxy is recomputed from the salt and init code
the log itself carries; `pairable()` applies the three tests of the hash join it exists to protect and
`assertPairable` names which one failed; and the docs page computes the featured distribution's
CREATE2 address from `CFG.factory`, the implementation as a new build constant and the salt, painting
a notice instead of the support form when the provider answers something else. `SECURITY.md` § Front
end rows R4, R8 and R18 are `fix` rows naming `#235`. Thirteen rules, not twelve: A1–A6, B1–B3 and
C1–C4 is 6 + 3 + 4 (the task brief said twelve; TASK.md's own list is thirteen and TASK.md wins).

## Baselines (step 0, re-run at the branch point)

Re-run at `e6e5a42` on 2026-11-18 through `devbox run --` (forge `1.7.1-dev`, node `v24.12.0`). Every
figure the plan recorded at `3751211` reproduced exactly; none is carried from the plan.

| Measurement | Command | Re-run at `e6e5a42` |
|:--|:--|:--|
| node suite | `node --test test/*.test.mjs` | `ℹ tests 144 · ℹ pass 144 · ℹ fail 0` |
| bundle | `make dapp-nodev CHAIN_ID=11155111` | `dapp: raw 145765 bytes · gzip 46189 bytes · chain 11155111` · `widget: raw 8509 bytes · budget 10240 · 1731 left` |
| widget bytes | `wc -c app/dist/widget.js` | `8509` |
| proxy named | `grep -ic -F '4e59b448'` | `app/broadcast.mjs` `0` · `app/build.mjs` `0` |
| clone init prefix | `grep -ic -F '602d5f8160095f39f35f5f365f5f37365f73'` | `app/src/index.html` `0` · `app/broadcast.mjs` `0` |
| provider predict reads | `grep -ic -F 'predict(bytes32)' app/src/index.html` | `2` |
| featured reads | `grep -ic -F 'S.featured' app/src/index.html` | `9` |
| new token | `grep -ic -F '__DISTRIBUTION__' app/src/index.html` | `0` |
| token count | `grep -oh '__[A-Z][A-Z0-9_]*__' … \| sort -u \| wc -l` | `6` |
| join sets | `grep -ic -F 'new Set' app/broadcast.mjs` | `0` |
| issue refs | `grep -ic -F 'rake#140'` | `app/build.mjs` `1` · `app/broadcast.mjs` `2` |
| register | `grep -c '^\| R' SECURITY.md` · `grep -c 'accepted\`' SECURITY.md` | `24` · `11` |

**The CREATE2 rehearsal, re-run at `e6e5a42` with `Eth.keccak` from `app/src/eth.js` against the two
tracked `broadcast/Deploy.s.sol/*/run-latest.json`.** All three figures reproduced, so the task did
not stop at step 3:

1. Both logs' one transaction is a `CREATE2` to `0x4e59b44847b379578588920ca78fbf26c0b4956c` whose
   input is the salt `0xc7b08946793948e2cb78adf914cfa19ac8341e52b8a7a96ab26034fe6c476693` followed by
   10,780 bytes of init code; `keccak(0xff ‖ proxy ‖ salt ‖ keccak(init))` low 20 bytes →
   `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B`, case-insensitively equal to the logged
   `contractAddress` on **both** chains.
2. Each log's `additionalContracts[0]` is `{ transactionType: 'CREATE2', contractName:
   'Distribution', address: 0x31dd18b4…cfa4b0, initCode }`, and `create2(<factory>, 0x00…00,
   initCode)` → `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` on both chains.
3. The 54-byte clone init code (`0x602d5f8160095f39f3` ‖ the 45 runtime bytes `CLONE` carries) with
   factory, implementation and `FEATURED_SALT_DNZN` → `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`
   on both chains — decision 50's address.

Also read at the branch point, because the join's new tests depend on it: both tracked `Deploy`
receipts carry `contractAddress: null` and `status: '0x1'`, and both `DeployApp` receipts the same.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | Thirteen rule rows in § The thirteen rules, each naming its hunk and its test. `git diff --stat origin/main -- app/ test/ SECURITY.md` → **7 files**, 682 insertions, 56 deletions: `SECURITY.md`, `app/broadcast.mjs`, `app/build.mjs`, `app/src/index.html`, `app/values.mjs`, `test/build.test.mjs`, `test/ext.test.mjs`. `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/ audits/ app/src/widget.js app/src/eth.js app/src/model.js app/version.mjs app/inline-scripts.mjs` → **no output**. The denominator: `git diff --name-only origin/main \| wc -l` → **7**, the same seven, so nothing outside the scoped list moved at all. |
| 2 | pass, with three reds broader than predicted | Eleven reds planted one at a time, each quoted in § The eleven planted reds with the command it was taken with: step 2 ×3 unit + ×1 spawn, step 3 ×2, step 4 ×3, step 5 ×1 and the browser red of step 5 (b). Every one reddened. **Three reddened more rows than the plan predicted** — reds 1, 5 and 8 — and each is declared there with exactly what else failed and why; none reddened fewer, and none failed to red. |
| 3 | pass, except one grep that cannot hold as written | The `check` rows pass (`test/build.test.mjs`, 167-test suite green). Both `spawnSync` refusals exit **`1`** with the named token on stderr and `app/dist/index.html`'s mtime unchanged across the run (`assert.equal(r.after, r.before)`). **`grep -c "0.1alpha'" app/dist/index.html` returns `1`, not `0`** — see § Deviations 1; the defect it exists to catch is measured there instead. `app/values.mjs` declares exactly **7** tokens and the two lists are identical: `SHAPES` keys `APP, CHAIN_ID, DISTRIBUTION, DISTRIBUTIONFACTORY, DISTRIBUTIONFACTORY_BLOCK, FEATURED_SALT, VERSION`; `grep -oh '__[A-Z][A-Z0-9_]*__' app/src/index.html app/src/widget.js app/src/host.html \| sort -u` → `__APP__, __CHAIN_ID__, __DISTRIBUTION__, __DISTRIBUTIONFACTORY__, __DISTRIBUTIONFACTORY_BLOCK__, __FEATURED_SALT__, __VERSION__`. The equality is asserted in the suite, both directions, by `every token the three sources use has a shape, and the table is only those`. |
| 4 | pass | `every Deploy log in this tree recomputes to the addresses it logs` prints `recomputed: [["11155111","0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B","0x31dd18b4c3ece3f123c285bdb045331364cfa4b0"],["84532","0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B","0x31dd18b4c3ece3f123c285bdb045331364cfa4b0"]]` — the factory recomputed through `create2(PROXY, salt, init)` and the implementation through `create2(factory, 0x00…00, initCode)`, for both chains, with the two tracked chains additionally asserted against those literals and the loop asserted to have read both. The one-digit-off row throws `/computed/` naming both addresses; the `g`-row throws `/not an address/`. `grep -ic -F '4e59b448' app/broadcast.mjs` → **`1`** (baseline `0`). `assert.match(src, /is created by/)` pins the duplicate-name refusal in `build.mjs` (`build.mjs refuses a name two broadcast logs both create`). |
| 5 | pass | `node app/build.mjs --chain 11155111 --set FEATURED_SALT=0x357836ff…0001 --set DISTRIBUTIONFACTORY=0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` → exit **`0`**, stdout `dapp: raw 146563 bytes · gzip 46448 bytes · chain 11155111`, stderr `build: --set DISTRIBUTIONFACTORY overrides the log's 0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B with 0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B`. `app/dist` was then rebuilt from the plain `make dapp-nodev CHAIN_ID=11155111`, so the committed state is the unforced one, and `git status --porcelain` is empty after it. |
| 6 | pass | All six `pairable` rows pass (the plan's five plus one more, § Deviations 4). The working-tree row (`every broadcast log in this working tree passes the assertion`) and the Fixtures row stay green, which is the check that the four tracked logs pass every new test. `grep -ic -F 'new Set' app/broadcast.mjs` → **`3`** ≥ 2 (baseline `0`). `assertPairable`'s message names the failing test in each of the throwing rows, by `assert.match` on each: `/share hash 0xaa/` (twice), `/0xbb has no receipt/`, `/names/` with both addresses, `/status 0x0/`. |
| 7 | pass | `predictLocal` is pinned in `test/ext.test.mjs` with three rows, the first equal to **`0x71a4221974Fc2E95081AE513248918dF27CF7a4A`**. Step 5 (a), on the dev chain through `?rpc=&from=` read back as `location.search = ?rpc=http%3A%2F%2F127.0.0.1%3A8555&from=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`: `#/docs` paints the support form, `#give-go` present, `.notice.err` **`[]`**, the form naming `0x9b40…1e37` — and `predictLocal` on that bundle's own `CFG` equals anvil's `predict(0xf39f…0001)` → `0x9b407e3c98fdb820203275919A90A056275e1e37`, which is the live check that `__DISTRIBUTION__` resolved to the right address (`0xA0aa47816994B60B97Ae6aB6A59E9D55C1dE3704`) on a chain nobody computed by hand. Step 5 (b), with `page.route` answering `predict(bytes32)` (selector `0x0e787cce`) with a `0x…dead`-ending word and passing the other **5** calls through: `#give-go` **absent**, the only `.notice.err` reads `this page computes the featured distribution at 0x9b40…1e37; your wallet's provider answered 0x0000…DEaD instead — the support form is not shown.`, the landing's `#featured` slot is **empty**, `page errors: none`. Greps: `grep -ic -F '602d5f8160095f39f35f5f365f5f37365f73' app/src/index.html` → **`1`**, `grep -ic -F '__DISTRIBUTION__'` → **`1`**, `grep -ic -F 'predict(bytes32)'` → **`2`** unchanged. `grep -ic -F 'S.featured' app/src/index.html` → **`12`** against the baseline `9`, **+3**, explained row by row below. |
| 8 | pass | `make dapp-nodev CHAIN_ID=11155111` → `widget: raw **8509** bytes · budget 10240 · **1731** left`, and `wc -c app/dist/widget.js` → **`8509`**, the same `N`: **delta `0`** against step 0's re-run figure, as no rule touches `widget.js`. `dapp:` **gzip `+259`** (46189 → 46448) and raw **`+798`** (145765 → 146563), all of it R18's: the same command after the two build-side commits and before the page commit still read `dapp: raw 145765 bytes · gzip 46189 bytes`, so A1–A6 and B1–B3 move no shipped byte. Both chains' hashes are in § For the next upload. |
| 9 | pass | Rows R4, R8 and R18 read `fix` and each names `#235` (`grep -c 'issues/235' SECURITY.md` → `3`, one per row). `grep -c '^\| R' SECURITY.md` → **`24`**. `grep -c 'accepted\`' SECURITY.md` → **`8`** (baseline `11`; the three rows). The dispositions in the table count **16 `fix` + 3 `design` + 5 `accepted` = 24**, which is what the summary paragraph now states. `git diff --stat origin/main -- audits/` → no output. |
| 10 | pass | `node --test test/*.test.mjs` → `ℹ tests 167 · ℹ pass 167 · ℹ fail 0`, **23 more** than step 0's re-run `144`: `test/build.test.mjs` 15 → 35 (**+20**) and `test/ext.test.mjs` 16 → 19 (**+3**), named per file below. `forge test` → **107 tests passed, 0 failed** in 7 suites — unchanged from `main`, because the out-of-scope diff above is empty for `src/`, `test/*.t.sol` and `.gas-snapshot`, so the suite `forge` lists is the same tree's. `make fmt` exit **0**; `forge lint` exit **0** with **0** warnings or notes (through the devbox pin — host `forge` is 1.8.1 and is not the instrument here); `forge snapshot --check` exit **0**. `git status --porcelain` → empty after `make dapp-nodev CHAIN_ID=11155111`. `test/docs.test.mjs` → `ℹ tests 11 · ℹ pass 11 · ℹ fail 0`, its fourteen sections intact (`the rail and the headings are the same fourteen sections, in one order`). |
| 11 | **states the dependency only — not yet satisfiable** | No mainnet build has been prepared: `broadcast/` carries `11155111` and `84532` and no chain `1`, and this task started no upload and ran no `make chunks` against any network. The gate is that this PR merges before M05's mainnet-document build is prepared; at the time of writing the PR is not open, so the condition is neither met nor failed. R4 and R8 are live on merge — they move no shipped byte (AC 8). R18 rides the next upload after the Run B that carried t11, t04 and t13, which is M05's mainnet document unless m04-t05 produces a re-upload first; § For the next upload carries the hashes and states which. Sequencing is Lakos's. |

## The thirteen rules

Four parts each: the input or sink, the check, the test that is red without it, and the command the
red was taken with. The reds themselves are quoted once, in § The eleven planted reds.

| Rule | Input or sink | The check | Hunk | Test that is red without it |
|:--|:--|:--|:--|:--|
| A1 | the `--set` argument list (`build.mjs:74-78` at `3751211`) | a key outside `SET_KEY` (`/^[A-Z][A-Z0-9_]*$/`, the grammar `substitute` matches) or an empty value stops the build, naming the argument given | `app/build.mjs:96`, `:102-105` (`f208401`) | `a --set key the substitution could never match is refused as the argument given` — `spawnSync` of the real build with `--set lowercase=1` → status `1`, stderr `/lowercase/` |
| A2 | every value, whatever its source: `--set`, a `broadcast/*/run-latest.json`, or the `CHAIN_ID` default | `check(values, sources)` once over the **merged** map, after the `--set` loop and before the first `substitute` | `app/values.mjs` (new, `f208401`) `SHAPES:39`, `shapeOf:56`, `check:67`; called at `app/build.mjs:117` | `a value outside its declared shape is refused by name` (8 rows), `the values a real build resolves pass every declared shape`, `the source of a failing value is named with it`, `a token with no declared shape fails closed rather than passing unchecked`, `every token the three sources use has a shape, and the table is only those`, and `a --set value outside its shape stops the build and leaves app/dist alone` |
| A3 | a log's `contractAddress`, and the `Distribution` additional contract's `address`, on their way to `Eth.checksum` | `isAddr` — 20 hex bytes — before the re-casing, which passes any other character through | `app/broadcast.mjs:41`, `:140-144`, `:171-174` (`d59a418`) | `a contractAddress that is not 20 hex bytes is refused before it is checksummed` |
| A4 | the same `contractAddress`, where the creation was routed through the keyless proxy | recomputed from the log's own salt and init code and refused on a mismatch; the factory's `Distribution` recomputed under salt zero; a plain `CREATE` is not recomputed, its address following a nonce the log does not carry | `app/broadcast.mjs:27` (`PROXY`), `:32` (`create2`), `:145-156`, `:175-179` (`d59a418`) | `every Deploy log in this tree recomputes to the addresses it logs`, `an address the salt and init code do not produce is refused with both`, `a creation that is not through the proxy keeps its logged address` |
| A5 | a `--set` whose key is already in `onchain` | the override is announced on stderr and the build continues — the flag's documented purpose (`build.mjs:10`, `:72`), and the finding is that it was silent | `app/build.mjs:108` (`f208401`) | `a --set over a value the log already gave says so on stderr and still builds` — exit `0` and `/--set DISTRIBUTIONFACTORY overrides the log's 0x00D18B5b/` |
| A6 | `deployed()`'s directory-ordered loop over `broadcast/` | a `contractName` already seen throws naming both files and the name, instead of the later directory winning | `app/build.mjs:50-59` (`f208401`) | `build.mjs refuses a name two broadcast logs both create` — `assert.match(src, /is created by/)` and `src.indexOf('if (name in out)')`, pinned the way `:136-146` pins the withheld wiring, because no unit test can reach that loop without a second tracked log creating the same name; `a name two transactions in one log both create is yielded twice, not collapsed` pins that `creations` does not hide the question from it |
| B1 | the hash join `pairable()` exists to protect | `new Set(hashes).size === hashes.length` on both lists | `app/broadcast.mjs:87`, `:96` (`d59a418`) | `the shared hash with matching receipts is refused, which only uniqueness catches` — the only state B1 alone catches, since the two hash sets are then both `{0xaa}` — and `two transactions under one hash are refused, naming the hash` |
| B2 | the same join | every transaction hash has a receipt and every receipt hash a transaction; with B1 and equal counts, one receipt per hash | `app/broadcast.mjs:89-95` (`d59a418`) | `a transaction with no receipt of its own is refused, naming the transaction` |
| B3 | the creation's own receipt | its `contractAddress`, where it carries one, equals the transaction's case-insensitively, and its `status`, where present, is `0x1` | `app/broadcast.mjs:97-106` (`d59a418`) | `a receipt naming another contract than its transaction is refused with both`, `a creation whose receipt reverted gives up no block` |
| — | `assertPairable`'s message (`:31-39` at `3751211`) | gains one clause naming which test failed, from `joinFault` (`:75`); the header's claim is corrected with it — one creation per script bounds the damage, the join checks are what make it safe | `app/broadcast.mjs:11-16`, `:59`, `:75-108` (`d59a418`) | the three throwing rows above, each `assert.match`ing its own clause; `the one-creation log every deploy script writes still pairs and gives up its block` is the control |
| C1 | `CFG` (`index.html:34`) | gains `impl: '__DISTRIBUTION__'`, resolved by A4 from the factory's own creation log | `app/src/index.html:34` (`c8fe478`) | `every token the three sources use has a shape, and the table is only those` (the token must have a shape and the shape must have a token); the browser check of step 5 (a) is what shows it resolved to the *right* address |
| C2 | the CREATE2 address of a clone | `predictLocal(salt)` hashes the 54 bytes `predict` hashes — the 9-byte init prefix in front of the 45 runtime bytes `CLONE` already carries — from `CFG.factory` and `CFG.impl`, never `S.impl` | `app/src/index.html:388-399` (`c8fe478`) | `predictLocal computes decision 50's address from the build alone`, `a different salt gives a different address of the same shape`, `the implementation's case does not move the address` |
| C3 | `load()`'s `predict(featuredSalt)` read (`:577-593` at `3751211`) | both provider reads stay; the provider's featured address is taken only where it equals the computed one, else `S.featured` is `null` and `S.featuredLie = { said, computed }` | `app/src/index.html:605-612` (`c8fe478`) | the browser check of step 5 (b): with the provider lying, `#give-go` is absent and the notice names both addresses |
| C4 | the two paints: `#/docs` § Economics and the landing's `#featured` | the notice replaces the support form when `S.featuredLie` is set; the landing returns before `loadDistro` when there is no featured address | `app/src/index.html:1134-1137`, `:2016` (`c8fe478`) | the browser check of step 5 (b), both halves; the landing guard measured separately in § Discoveries 3 |

**`grep -ic -F 'S.featured' app/src/index.html` → `12`, against the baseline `9`, +3** (the pattern
also matches `S.featuredLie`, which is why the delta is read row by row rather than as a count):

- `:611` and `:612` are the one baseline line `S.featured = a; S.impl = impl; …` split into the
  agreeing assignment and the disagreeing branch — **+1 line**.
- `:1137` is C4's landing guard, `if (!S.featured) return;` — **+1 line**.
- `:2016` is C4's notice — **+1 line**.
- The other nine (`:1138`, `:1978`, `:1987`, `:1990`, `:1996`, `:2017`, `:2018`, `:2098`, and the
  assignment) are the baseline's nine, moved but unchanged.

**The tests added, per file.** `test/build.test.mjs` 15 → 35: `the values a real build resolves pass
every declared shape`, `a value outside its declared shape is refused by name`, `the source of a
failing value is named with it`, `a token with no declared shape fails closed rather than passing
unchecked`, `every token the three sources use has a shape, and the table is only those`, `a --set
value outside its shape stops the build and leaves app/dist alone`, `a --set key the substitution
could never match is refused as the argument given`, `a --set over a value the log already gave says
so on stderr and still builds`, `build.mjs refuses a name two broadcast logs both create`, `every
Deploy log in this tree recomputes to the addresses it logs`, `an address the salt and init code do
not produce is refused with both`, `a contractAddress that is not 20 hex bytes is refused before it
is checksummed`, `a creation that is not through the proxy keeps its logged address`, `a name two
transactions in one log both create is yielded twice, not collapsed`, `two transactions under one
hash are refused, naming the hash`, `the shared hash with matching receipts is refused, which only
uniqueness catches`, `a transaction with no receipt of its own is refused, naming the transaction`,
`a receipt naming another contract than its transaction is refused with both`, `a creation whose
receipt reverted gives up no block`, `the one-creation log every deploy script writes still pairs and
gives up its block`. `test/ext.test.mjs` 16 → 19: `predictLocal computes decision 50's address from
the build alone`, `a different salt gives a different address of the same shape`, `the
implementation's case does not move the address`.

## The eleven planted reds

Each planted alone, measured, and reverted before the next. The unit reds were taken with
`devbox run -- node --test test/build.test.mjs` (steps 2–4) or `test/ext.test.mjs` (step 5).

**1 — `VERSION`'s shape widened to `/.*/` (step 2).** `ℹ tests 34 · ℹ pass 32 · ℹ fail 2`.

```
✖ a value outside its declared shape is refused by name
  AssertionError [ERR_ASSERTION]: Missing expected exception: VERSION=0.1alpha' was not refused
    expected: /__VERSION__/, operator: 'throws'
✖ a --set value outside its shape stops the build and leaves app/dist alone
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:  0 !== 1
```

**Broader than predicted.** The plan expected "its two rows and nothing else". Both `VERSION` rows
are in one table-driven test, which is the first failure; the second is the `--set VERSION` spawn row,
whose input is the same widened token — a shape wide enough to admit the quote in a unit test is wide
enough to admit it end to end, so this red could not be narrower. Nothing else failed.

**2 — the checksum equality dropped from `ADDRESS` (step 2).** `ℹ tests 34 · ℹ pass 33 · ℹ fail 1`,
the lowercase-address row only, as predicted.

```
✖ a value outside its declared shape is refused by name
  AssertionError: Missing expected exception: DISTRIBUTIONFACTORY=0x00d18b5b72c4d8e7761776d1275b69d4dbcde71b was not refused
    expected: /__DISTRIBUTIONFACTORY__/, operator: 'throws'
```

**3 — the `no shape` throw replaced by `return` (step 2).** `ℹ tests 34 · ℹ pass 33 · ℹ fail 1`, the
`FOO` row only, as predicted.

```
✖ a token with no declared shape fails closed rather than passing unchecked
  AssertionError: Missing expected exception.
    expected: /no shape declared for __FOO__/, operator: 'throws'
```

**4 — the `check(values, sources)` call removed from `build.mjs` (step 2, the spawn).** The build
**exits `0`** and the quote reaches the bundle. Taken with
`devbox run -- node app/build.mjs --chain 11155111 --set FEATURED_SALT=0x357836ff…0001 --set "VERSION=0.1alpha'"`:

```
exit=0
stdout: dapp: raw 146564 bytes · gzip 46449 bytes · chain 11155111
        widget: raw 8509 bytes · budget 10240 · 1731 left
stderr: build: --set VERSION overrides the log's 0.1alpha with 0.1alpha'
app/dist/index.html: version: '0.1alpha'',
```

That last line is the finding: the quote is out of the `CFG` object literal. The suite's own row reds
with `0 !== 1` on the exit status. Restored and rebuilt from the plain command, `app/dist/index.html`
carries `version: '0.1alpha',` and `grep -c -F "0.1alpha''" app/dist/index.html` → **`0`**.

**5 — the init-code slice taken from offset 2 instead of 66 (step 3).** `ℹ tests 34 · ℹ pass 27 ·
ℹ fail 7`.

```
✖ both tracked Deploy logs recompute to the addresses they log
  Error: build: broadcast/Deploy.s.sol/11155111/run-latest.json logs DistributionFactory at
  0x00d18b5b72c4d8e7761776d1275b69d4dbcde71b, but its own salt and init code
         through 0x4e59b44847b379578588920ca78fbf26c0b4956c computed 0x59D33536EE396E90373E8601ADeBb30128229e48
✖ an address the salt and init code do not produce is refused with both
  AssertionError: The input did not match the regular expression /0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B/
```

**Broader than predicted.** The plan expected those two rows together, and got them; the other five
are rows that read a tracked log or run the real build, and the plant makes `creations()` throw on
every one of them — `every App creation in this working tree yields a derivable version`, `every
broadcast log in this working tree passes the assertion`, and the three `spawnSync` rows. Salting the
init code is fatal to the build, which is a stronger result than the plan counted, in the same
direction.

**6 — the 20-hex-byte check dropped from `creations` (step 3).** `ℹ tests 34 · ℹ pass 33 · ℹ fail 1`,
the `g`-row only, as predicted.

```
✖ a contractAddress that is not 20 hex bytes is refused before it is checksummed
  AssertionError: Missing expected exception.  operator: 'throws'
```

**7 — B1, both uniqueness tests, removed (step 4).** `ℹ tests 35 · ℹ pass 33 · ℹ fail 2`.

```
✖ two transactions under one hash are refused, naming the hash
  AssertionError: The input did not match the regular expression /share hash 0xaa/. Input:
  'Error: build: x.json has 1 creations and 2 receipts for 2 transactions, …
    What is wrong with it: receipt 0xbb has no transaction.
✖ the shared hash with matching receipts is refused, which only uniqueness catches
  AssertionError: Expected values to be strictly equal:  true !== false
```

The second line is leg 1's reproduction exactly: without uniqueness, `pairable` returns **`true`** for
a log whose creation takes the other transaction's block. The first is the same defect reported under
a different clause, which is why the plan's row and the added one are both kept.

**8 — B2, both set-equality tests, removed (step 4).** `ℹ tests 35 · ℹ pass 33 · ℹ fail 2`.

```
✖ a transaction with no receipt of its own is refused, naming the transaction
  AssertionError: The input did not match the regular expression /0xbb has no receipt/. Input:
    What is wrong with it: two receipts share hash 0xaa.
✖ a receipt that carries no block leaves the block null rather than guessing one
  TypeError: Cannot read properties of undefined (reading 'contractAddress')
      at joinFault (app/broadcast.mjs:94)
```

**Broader than predicted.** The plan expected the missing-receipt row alone. The second failure is a
row that existed at `3751211`, and it crashes rather than failing cleanly: B3 reads the creation's own
receipt, which B2 is what guarantees exists. That ordering is an invariant of the real code — B2
returns before B3 is reached — so no real log can take that path, and it is recorded rather than
guarded, since a guard there would be unreachable.

**9 — B3 removed (step 4).** `ℹ tests 35 · ℹ pass 33 · ℹ fail 2`, the `names` and `status` rows only,
as predicted, both on the boolean rather than the message.

```
✖ a receipt naming another contract than its transaction is refused with both
  AssertionError: Expected values to be strictly equal:  true !== false
✖ a creation whose receipt reverted gives up no block
  AssertionError: Expected values to be strictly equal:  true !== false
```

**10 — the 9-byte init prefix dropped from `predictLocal`, hashing the 45 runtime bytes alone
(step 5).** `ℹ tests 19 · ℹ pass 17 · ℹ fail 2` — decision 50's row with another address, as
predicted, and the lowercase-`impl` row, which asserts the same address.

```
✖ predictLocal computes decision 50's address from the build alone
  AssertionError: Expected values to be strictly equal:
  + '0x2319b9ebC0f2110f80bA0e6DD3975e2106CEbd81'
  - '0x71a4221974Fc2E95081AE513248918dF27CF7a4A'
```

**11 — the browser red of step 5 (b).** The same run as AC 7's (b) against a bundle built from
`app/src/index.html` at `e6e5a42`, dev chain, `python3 -m http.server 3005`, `page.route` answering
`predict(bytes32)` with the `0x…dead`-ending word:

```
#give-go present : true
.notice.err      : []
§ Economics      : …the distribution this app features,
                   <span title="0x00000000000000000000000000000000dEadDEaD"
                     data-addr="0x00000000000000000000000000000000dEadDEaD">0x0000…DEaD</span>…
landing #featured: ""
predict calls intercepted: 1 · other calls passed through: 8
page errors      : none
```

The support form is painted, naming the address a hostile provider chose as the recipient of the
docs' "support its authors" payment. After the fix the same route gives `#give-go` **false** and the
notice quoted in AC 7. The landing's `#featured` slot is empty in **both** runs, for different
reasons: before the fix because `loadDistro(0x0000…DEaD)` returns `missing`, after it because C4's
guard returns first — so the empty slot alone does not distinguish them, which is why `#give-go` and
the notice are what AC 7 reads.

## Deviations from the plan

1. **AC 3's `grep -c "0.1alpha'" app/dist/index.html` → `0` cannot hold as written, and does not.**
   It returns **`1`** at the head and **also at the branch point**, for any correct build: the
   pattern's trailing `'` matches the closing quote of the legitimate value, so the substring
   `0.1alpha'` is in `version: '0.1alpha',`. Measured, not argued — the match is
   `hainId: '11155111', version: '0.1alpha', factory: '0x00D18B`, and
   `git show e6e5a42:app/src/index.html | grep -c -F "version: '__VERSION__'"` → `1`, the same form
   the baseline substituted. What the grep was written to catch — the refused quote reaching the
   bundle — is measured instead by `grep -c -F "0.1alpha''" app/dist/index.html` → **`0`** (exit 1, no
   match) with `grep -c -F "version: '0.1alpha'," app/dist/index.html` → **`1`**: the value is present
   exactly once and well formed. Red 4 shows what the other reading looks like: with the check
   removed, the dist carries `version: '0.1alpha'',` and the `''` grep is `1`.
2. **The order of the clauses in `assertPairable`'s message, not of the tests in `pairable`.** Step 4
   prescribes B1 before B2, and `pairable` applies every test of both — it is a conjunction, so the
   order is unobservable there. The order *is* observable in the one clause the message names, and
   step 4's own expected message for the duplicate-receipt row is B2's (`/0xbb has no receipt/`),
   which B1's receipt-uniqueness clause would pre-empt. So the clauses are ordered
   transactions-unique → missing receipt → orphan receipt → receipts-unique → B3, which produces
   exactly the five messages step 4 prescribes. Both halves of B1 are present and both are
   load-bearing (red 7).
3. **`test/build.test.mjs:143`'s source grep had to change.** It asserted
   `src.indexOf('creations(log)') > 0`; step 3 requires `build.mjs` to pass the file, so it is now
   `creations(log, rel)` with the reason beside it. Nothing else in that test moved.
4. **A sixth `pairable` row, beyond step 4's five.** `the shared hash with matching receipts is
   refused, which only uniqueness catches` — two transactions under `0xaa` with **both** receipts
   `0xaa`. Step 4's shared-hash row uses receipts `0xaa`/`0xbb`, which B2 also catches, so removing
   B1 reds it only on the message; the added row is the state B1 alone catches and it reds on the
   boolean (red 7). Added because a check whose removal only changes a string is not measured.
5. **`esc()` around the provider's address in C4's notice.** Step 5 writes
   `your wallet's provider answered ${short(said)}`; `said` is provider-supplied, which is precisely
   R2's class of defect, so it is `esc(short(S.featuredLie.said))`. The computed address goes through
   `ext('address', …)` as the plan writes it.
6. **Three planted reds reddened more rows than predicted** (reds 1, 5 and 8), each declared with
   what else failed in § The eleven planted reds. None reddened fewer and none failed to red, so no
   predicted red is a deviation in the sense AC 2 defines.
7. **The brief said "twelve rules"; TASK.md's list is thirteen** (A1–A6, B1–B3, C1–C4 = 6 + 3 + 4).
   TASK.md wins and the handoff carries thirteen rows.

## Decisions

1. **`shapeOf` applies the `DISTRIBUTIONFACTORY_BLOCK` row to every `__<NAME>_BLOCK__`.** Step 2's
   table says "`DISTRIBUTIONFACTORY_BLOCK` (every `*_BLOCK`)" while AC 3 fixes `SHAPES` at exactly
   seven keys, so one row states the form and `shapeOf` (`values.mjs:56`) is where it generalises —
   a row per contract that might ever be deployed would be a table nobody could keep complete. Every
   block token is written by the one line at `build.mjs:64`, so there is one form to state.
2. **`creations(log, file = 'the log')` keeps a default.** The unit rows that existed at `3751211`
   pass one argument and none of them throws, so the default appears in no real message;
   `build.mjs:48` passes the repo-relative path and every refusal names it.
3. **A3's shape check covers the `Distribution` additional contract's address too.** It reaches
   `Eth.checksum` by the same route as a transaction's, through `build.mjs:61`.
4. **Messages name logs repo-relatively.** `deployed()` keeps the absolute path for reading and
   builds `rel` for messages (`build.mjs:46`), so a refusal prints the string a reader can grep.
   `withheld`'s rake#140 message is unchanged.
5. **`S.featuredLie` is declared in `S`'s literal** (`index.html:582`) rather than appearing by
   assignment, because `S` lists every key the page keeps.

## Discoveries

1. **`check` fails closed on a log-derived contract name with no `SHAPES` row, so `make fixtures`
   followed by `make dapp` would now refuse the build.** `check` is called once over the merged
   values, which include every `contractName` any log on the chain created, and `Fixtures.s.sol`
   creates `RevertingReceiver`, `MockERC20`, `MockVault` and `BlocklistToken` — none of which can
   have a row, because AC 3 fixes `SHAPES` at exactly the seven tokens the sources use. Measured on
   the same code path: `node app/build.mjs --chain 11155111 --set FEATURED_SALT=… --set
   MOCKERC20=0x3333…3333` → exit **`1`**, `build: 1 value this build would substitute does not have
   the shape declared for it: no shape declared for __MOCKERC20__ — add one to app/values.mjs`. This
   is what step 2 prescribes, and it is the opposite of the trade-off `app/broadcast.mjs:22-25`
   argues for `assertPairable` ("Refusing those outright would make `make fixtures` fatal to the next
   `make dapp` while protecting a figure no bundle reads"). Not changed here: narrowing `check` to the
   tokens a source actually asks for would be a different rule from the one the plan states. The dev
   chain is unaffected unless `make fixtures` is run — `make deploy` does not run it (`mk/16-fixtures.mk:3`)
   — and this task's own dev-chain build (step 5 (a)) was green.
2. **A test that reads `broadcast/<script>/<chain>/` must not assert the tracked chains' addresses
   for every chain it finds.** The first version of `every Deploy log in this tree recomputes to the
   addresses it logs` did, and went red the moment step 5 (a)'s `make deploy` wrote
   `broadcast/Deploy.s.sol/31337` — `0x88d0da5e…` where it expected `0x00d18b5b…`. It now asserts the
   recomputation for every chain and the literals only for `11155111` and `84532`, with the loop
   asserted to have read both. This is the trap `test/build.test.mjs:245-251` already records in
   prose; it is worth knowing that it bites a *new* test too. Fixed within the task.
3. **C4's landing guard is load-bearing, measured.** With `if (!S.featured) return;` removed and the
   provider lying, the dev-chain run gives `page errors: ["Object"]` — the rejected `eth_getCode`
   with a null address — against `page errors: none` with the guard. Measured rather than inferred,
   because a guard whose only evidence is that nothing visibly broke is not measured.
4. **R18 is the only one of the three rows that moves a shipped byte.** `make dapp-nodev
   CHAIN_ID=11155111` after the two build-side commits and before the page commit still read
   `dapp: raw 145765 bytes · gzip 46189 bytes`, byte-identical to step 0's re-run; the whole `+798`
   raw and `+259` gzip is the page change. That is the measurement behind "R4 and R8 are live on
   merge".
5. **Four candidates for a later task, surfaced and not made** (TASK.md § Out of scope requires the
   first): `S.impl` still carries the provider's `implementation()` for `isClone`,
   `MAX_BENEFICIARIES()` and `GRACE()`, and the create screen's `predict` at `:1856` still takes the
   provider's answer — `CFG.impl` is now in the bundle and could replace the first, and
   `predictLocal` the second, but both are runtime changes beyond R18. `app/broadcast.mjs`'s
   `joinFault` is exported and could be read by `tools/` if anything else ever wants the reason a log
   is unusable. Neither touched.
6. **`forge lint` is clean at the head through the devbox pin and would not be through the host's.**
   `devbox run -- forge lint` → exit 0, 0 warnings; the host `forge` is 1.8.1 against the pin's
   1.7.1-dev. No `src/` byte moved here, so this is a note about the instrument rather than about
   this diff.

## Open questions

None.

## For Denizen

**Nothing expected beyond the merge.** No wording ruling is needed: the one new sentence the visitor
can read is C4's notice, and it reports a mechanism rather than making a product claim — `this page
computes the featured distribution at <computed>; your wallet's provider answered <said> instead —
the support form is not shown.` If that sentence should read differently it is a one-line change, and
the row it sits in (`SECURITY.md` R18) is a `fix` either way.

Two things to be aware of rather than to decide:

- § Discoveries 1: after this merge, `make fixtures` followed by `make dapp` refuses the build by
  name. That is what the plan specifies, and the fix if it ever bites is one line in
  `app/values.mjs`'s `check`, not a revert.
- § Deviations 1: one acceptance grep cannot hold as written. The defect it was written to catch is
  measured, and red 4 shows the measurement failing on the broken code.

## For the next upload

**This task starts no upload, and has started none.** R4 and R8 move no shipped byte (AC 8,
§ Discoveries 4) and are live on merge. R18 is a page change and rides **whichever upload comes next
after the Run B that carried m04-t11, m04-t04 and m04-t13** — which is **M05's mainnet document
unless m04-t05 produces a re-upload first**, and m04-t05 is live work this task did not read.
`RUNBOOK.md` § Which run is this classifies it as a Run B (`app/` changed, `src/` did not).

Built with `make dapp-nodev CHAIN_ID=<chain>` through the devbox pin, at the tree of `c8fe478`:

| Chain | `dapp:` | `widget:` | `sha256 app/dist/index.html` | `sha256 app/dist/widget.js` |
|:--|:--|:--|:--|:--|
| 11155111 | `raw 146563 · gzip 46448` | `raw 8509 · 1731 left` | `7ef31c15d4e29796ca8ddd1151bf9604d4991538cf7db5772aca5c8dcbc36ab7` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |
| 84532 | `raw 146561 · gzip 46445` | `raw 8509 · 1731 left` | `b075d5f7c48e3c18256aecd2612b67942142c5745b5c544b7d5ef703c87a1ecd` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |

`app/dist/widget.js` is **byte-identical across the two chains and to m04-t13's figure** (the same
`sha256` `8b6bbc88…`), as no rule touches it; `index.html` differs between the chains by the two bytes
of the chain id. `git status --porcelain` is empty after either build.

**One thing an upload has to carry that the hashes do not show:** `CFG` gains a seventh value,
`impl`, which the build resolves from the factory's own creation log. A chain whose
`broadcast/Deploy.s.sol/<id>/run-latest.json` is not in the tree cannot resolve `__DISTRIBUTION__`,
and the build refuses by name rather than substituting — so the mainnet document's build needs the
mainnet `Deploy` log tracked, exactly as it already needs the factory address and block.
