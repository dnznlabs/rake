# m04-t09 — handoff

PR: not yet opened · Branch: `m04/t09-alpha-marker` · 2026-11-12

The dapp half of the alpha marker landed as decision 45 rules it. The page's version string is no longer a second hardcoded `v0.1`: `creations()` now returns the constructor `args` it already had in hand, and `app/version.mjs` turns `App`'s own `version` argument into the page string — one leading `v` off, `alpha` on — so `build.mjs` carries no version of its own and the marker comes off in a chunk re-upload rather than a redeploy. A Disclaimer is the first section of `#/docs`, saying the four things the decision names and when the marks come off; the tag line sits in `layout.html` under the nav, where no route can omit it, and again on the landing under the hero's prose; and the widget's `foot` carries the word `alpha` in both variants, with no anchor, for 12 bytes. Nothing under `src/` moved. **One acceptance criterion is red and was left red: AC 1's `grep -c 0.1alpha app/dist/index.html` ≥ 2 cannot pass, for the reason given in § Deviations — the page paints the string at two sites from one `__VERSION__`, which the browser check confirms it does.**

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | **partly red** | `grep -n "v0.1" app/build.mjs` → no match (exit 1). `make dapp-nodev` on the dev chain, whose `DeployApp.s.sol` log exists, derived `version: '0.1alpha'`. Both testnets: `cast call 0x00A9…5BaE "version()(string)"` → `"v0.1"`, raw return `0x…0476302e31…` (`76302e31` = `v0.1`), controls in § On chain. Derivation pinned on the three inputs in `test/build.test.mjs`. Refusal with no log and no `--set VERSION=`: `build: nothing to substitute for __VERSION__ … on chain 31337`, exit 1. **`grep -c 0.1alpha app/dist/index.html` → 1, not ≥ 2** — see § Deviations 1; the two paint sites are proved at runtime instead (`dnzn labs · 0.1alpha`, `docs · 0.1alpha`). |
| 2 | pass | `SECTIONS[0][0] === 'disclaimer'` and first `id="s-…"` is `id="s-disclaimer"` (both pinned in `test/docs.test.mjs`, now fourteen sections, and the test's name says fourteen). The rendered section states the four things and the removal note — each pinned by a second test and re-read from the painted DOM in § Browser check. `SECURITY.md` linked as `${REPO}/blob/main/SECURITY.md`, `target="_blank" rel="noopener"`. |
| 3 | pass | `grep -c 'alpha software is alpha, act accordingly\.' app/dist/index.html` → `2`; both anchors `<a class="alpha" href="#/docs#disclaimer"`. The header copy is in `app/src/layout.html` (`grep -c` → 1), outside `#view`, and the browser check found it on all five routes — `#/`, `#/distros`, `#/distros/<addr>`, `#/create`, `#/docs` — and clicking it landed on the Disclaimer. |
| 4 | pass | `grep -ic alpha app/dist/widget.js` → `1`. Anchor count `grep -c '<a ' app/dist/widget.js` → `1`, equal to `main`'s measured `1`. `node app/build.mjs` exits 0 and prints `widget: raw 8144 bytes · budget 10240 · 2096 left`. Bytes before/after and headroom in § The widget's bytes. |
| 5 | pass | Per-testnet `sha256sum` and `wc -c` of the three artifacts, built at the PR head with `make dapp-nodev CHAIN_ID=<id>`, in § The bundle, per chain; § For t08 names them as the hashes to upload, with one caveat about `FEATURED_SALT` that t08 must read. |
| 6 | pass | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/` → empty. `README.md` unchanged (`git diff --stat origin/main -- README.md` → empty). `node --test test/*.test.mjs` → **101 tests, 101 pass, 0 fail** (≥ 95; `main` was 95). `forge test` → **107 passed, 0 failed, 7 suites — unchanged from `main`'s 107**, both through devbox-pinned forge 1.7.1-dev. `git status --porcelain` → empty after `make dapp-nodev && make chunks && make dapp` on a fresh anvil. |
| 7 | pass | The PR body carries one `Closes #184`. § Deviations has two items, each naming the step or criterion it amends. |

## Baselines (re-measured)

Re-measured on this branch's base, `origin/main` at `8507039`, on 2026-11-12. Every figure below was run rather than quoted; the plan's own numbers are noted where they differ.

- `grep -ril alpha app/src/` → no output, exit 1 (0 of the 7 files in `app/src/`).
- `grep -ri -c 'act accordingly' app/src/` → `0` for each of the 7 files.
- `grep -ic disclaimer app/src/index.html` → `0`.
- `grep -n VERSION app/build.mjs` → one line: `55:const values = { VERSION: 'v0.1', ...onchain, CHAIN_ID: chain };`
- `grep -o "const SECTIONS = \[\['[a-z]*'" app/src/index.html` → `const SECTIONS = [['what'` — Overview first, thirteen sections pinned in `test/docs.test.mjs`.
- `grep -c 'version()' app/src/index.html app/src/eth.js app/src/model.js` → `0`, `0`, `0`. Nothing in `app/src/` reads `version()` from the chain.
- `grep -ic '0.1alpha\|act accordingly' README.md` → `2`. The README half (#181) passes on `main` and this task did not need to touch it.
- The widget, before: `widget: raw 8132 bytes · budget 10240 · 2108 left`. `grep -ic alpha app/dist/widget.js` → `0`; `grep -c '<a ' app/dist/widget.js` → `1`, which is the anchor count AC 4 compares against.
- The dapp, before, on chain 11155111: `dapp: raw 141134 bytes · gzip 44618 bytes`. The plan's 141,064 / 44,500 was a chain-31337 build with placeholder `--set` addresses, so it is not comparable to this one and neither is wrong.
- `node --test test/*.test.mjs` → `tests 95 · pass 95 · fail 0`.
- `forge test` → `107 tests passed, 0 failed, 0 skipped` in 7 suites, forge 1.7.1-dev from `devbox.lock`. Untouched by this task, and re-run at the head to prove it.

## The widget's bytes

| | raw bytes | budget | left |
|:---|:---|:---|:---|
| before (`origin/main` 8507039) | 8,132 | 10,240 | 2,108 |
| after (head `ed0aa00`) | **8,144** | 10,240 | **2,096** |

The change is 12 bytes for `'alpha · '+` — eleven characters, of which the `·` is two bytes in UTF-8. Headroom is `10240 − 8144 = 2096` bytes. The gate in `build.mjs:98-104` is the test and it passes; the figure is identical on every chain, since `widget.js` carries no chain-dependent token.

## The bundle, per chain

Built at the PR head `ed0aa00` with the prescribed `make dapp-nodev CHAIN_ID=<id>`, through the devbox-pinned toolchain (gzip output depends on the node build's zlib).

**Chain 11155111 (Sepolia)** — `dapp: raw 142949 bytes · gzip 45358 bytes`

| artifact | sha256 | bytes |
|:---|:---|:---|
| `app/dist/index.html` | `cb2e83012c9d716217dcd321e3b45b7e1ce39afce93dd1bdbf95b2fb70b99363` | 142,949 |
| `app/dist/index.html.gz` | `0023521faf2ed5a61079277d8ff222b71689688a4fd162e998f41caff9428097` | 45,358 |
| `app/dist/widget.js` | `21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a` | 8,144 |

**Chain 84532 (Base Sepolia)** — `dapp: raw 142947 bytes · gzip 45358 bytes`

| artifact | sha256 | bytes |
|:---|:---|:---|
| `app/dist/index.html` | `8c235917fd1f7a26ce61f07d4a41ef13450bf82b17c463910514425f12576ea3` | 142,947 |
| `app/dist/index.html.gz` | `bce7a41b4d70cccc4adaecab78ea0fa0d9e0462f7718a380435f8d60519b1a8e` | 45,358 |
| `app/dist/widget.js` | `21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a` | 8,144 |

`widget.js` is byte-identical on both chains and on the dev chain, as it must be: its only token was `__VERSION__`, inside the header comment the minifier strips.

The dev chain closed the loop the plan asks for. `make dapp-nodev && make chunks && make chain-doc` on a fresh anvil:

```
inflated bytes   142941
inflated sha256  f5be5c35640c01e528fbcfb33ef3bdeb8db4a87a948357d388895bed7b4fc4aa
widget sha256    21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a
```

and locally, `sha256sum app/dist/index.html app/dist/widget.js`:

```
f5be5c35640c01e528fbcfb33ef3bdeb8db4a87a948357d388895bed7b4fc4aa  app/dist/index.html
21dd3d131c9f7dfccc3f92776f89433f469d85232607e21229ca4d9c97eea24a  app/dist/widget.js
```

Both equalities hold. `html()` returned 61,145 bytes over a 45,351-byte payload, and the chain's copy of the page derives `version: '0.1alpha'` from the dev chain's own `DeployApp.s.sol` log. `make dapp` ran last, and `git status --porcelain` was empty.

## On chain

AC 1's reading, taken 2026-11-12 against public endpoints, decoded and raw so the answer does not rest on a signature supplied here:

| chain | endpoint reports | codesize at `App` | `version()(string)` | raw return |
|:---|:---|:---|:---|:---|
| 11155111 | 11155111 | 7,155 | `"v0.1"` | `0x…0020…0004 76302e31 00…` |
| 84532 | 84532 | 7,155 | `"v0.1"` | identical |

`76302e31` is `v0.1` in ASCII, at offset `0x20` with length `4`. Paired control: the same selector `0x54fd4d50` at `0x…dEaD`, an address with no code, returns `0x` on both chains. So the derived page string is `0.1alpha`, which is what the dev-chain build and the browser check both paint.

## Browser check

The check every `app/` task ends with (`AGENTS.md` § The dapp), `playwright-core` 1.63.0 from outside the repo against the cached arm64 chromium `153.0.8010.12`, on the dev bundle with the dev stack up. Thirty assertions in the sweep, every one `ok`, ending `ALL CHECKS PASSED`; the per-distribution route is a thirty-first, in a second run that needed the seeded address passed to it. What it establishes beyond the greps:

- The header line is present exactly once, with the exact string and the `#/docs#disclaimer` href, on `#/`, `#/distros`, `#/distros/0x633e…6148`, `#/create` and `#/docs`. The per-distribution route rendered its real table from anvil.
- **The footer paints `dnzn labs · 0.1alpha` and the docs eyebrow paints `docs · 0.1alpha`** — the two sites AC 1's grep was reaching for, from the one `__VERSION__` the source carries.
- The rail lists fourteen sections and opens with `#/docs#disclaimer`; the article paints fourteen `<h2>`s and opens with `s-disclaimer`.
- The rendered Disclaimer text carries all four things and all three readings of the removal rule, and its `SECURITY.md` anchor resolves to `https://github.com/dnznlabs/rake/blob/main/SECURITY.md`.
- `#/docs#disclaimer` puts the heading 19.5 px from the top of the viewport, so `docScroll` reaches it; clicking the header line from the landing ends at `#/docs#disclaimer` with `s-disclaimer` first.
- No page errors and no console errors.

## Deviations from the plan

1. **AC 1's `grep -c 0.1alpha app/dist/index.html` ≥ 2 is left red, and the page was not changed to make it pass.** The plan's own step 0 records why the check cannot hold: the version is painted at two sites, `app/src/index.html:55` and the docs eyebrow, but **both read `CFG.version`, and `CFG` carries the single `__VERSION__` the source contains** (`grep -o '__VERSION__' app/src/index.html | wc -l` → 1). The built bundle therefore holds the literal exactly once, in `version: '0.1alpha'`, and would hold `v0.1` exactly once on `main` by the same arithmetic — the grep measures the source text while the "two sites" are two *runtime* paints. Making it ≥ 2 would mean substituting `__VERSION__` separately at each paint site, which is a second source of the string to satisfy a grep and the opposite of what step 1 is for. The substance is evidenced instead by the browser check reading both painted nodes. **This needs the architect's ruling: amend AC 1's third clause, or ask for the page change.** Nothing else in AC 1 is red.
2. **The derivation lives in a new `app/version.mjs`, not inside `build.mjs`** (step 1). Step 1 says to derive `VERSION` in `build.mjs`, and AC 1 requires a test pinning the derivation on three inputs; both cannot hold, because `build.mjs` does its work at import and a test that imported it would run a build. `inline-scripts.mjs` is the precedent — a build concern in its own module so `test/inline-scripts.test.mjs` can import it — and this follows it. `build.mjs` still owns the wiring: it reads the log, calls `marked()`, and refuses.

## Decisions

- **A malformed `App` version argument refuses even when `--set VERSION=` is passed.** Step 1 says to keep `--set` working and to "refuse, do not default" on an unrecognised argument. The two meet only on a chain whose log exists but says something unexpected, and there the refusal wins: `--set` exists so a chain with *no* log can be built deliberately, whereas a log that does exist and carries a surprising version is a question about the deploy, which an override would answer by painting an unchecked string onto a bundle about to be uploaded. Every intended use of `--set` is unaffected.
- **The widget's word is a prefix on `foot`**, as the plan's open question proposed, so both the full and the compact variant paint it and the compact bar cannot be the one that omits it. 12 bytes, re-measured.
- **The tag line's rationale is a comment in `theme.css`, not beside the markup in `layout.html`.** The minifier strips `/* */` but not HTML comments, and the bundle's markup carries none today (`grep -c '<!--' app/dist/index.html` → 0 before this change), so a comment in `layout.html` would have shipped to every visitor.
- **The page says "the mainnet milestone's closeout", not "M05".** The removal rule is addressed to a reader of the docs, and the README's § Disclaimer already words it that way; the three readings are stated precisely enough to act on without the internal milestone label.

## Discoveries

- **`FEATURED_SALT` is substituted into `index.html`, so the per-chain hashes above are only reproducible with the same salt.** `make dapp-nodev CHAIN_ID=<id>` — the command the plan prescribes — passes `mk/15-seed.mk`'s default salt, which is the dev chain's seeded distribution. If t08 builds a testnet bundle with a different `FEATURED_SALT`, `index.html` and `index.html.gz` will not match § The bundle, per chain; `widget.js` still will. Named in § For t08.
- `app/src/theme.css`'s comment above the `max-width:720px` block says the narrow docs rail keeps "the nine destinations". It was already stale at thirteen sections and is now fourteen; the rule itself is correct and untouched. Not fixed here — it is outside the marker's scope.
- The Limits section already says "The contracts cannot be upgraded. A defect is remedied by deploying a new distribution." and "The contracts have not yet been audited." The new Disclaimer says both more fully and in decision 45's words. Consistent, but two sections now carry the thought; whether Limits should defer to the Disclaimer is a copy question for the owner, not a defect.
- `test/build.test.mjs` already existed, though step 1 offers it as "a new `test/build.test.mjs`". The derivation tests were added to it.
- Adding `args` to `creations()` changed two `assert.deepEqual` fixtures in `test/build.test.mjs` that pinned the returned object whole; both now carry `args: null`. Worth knowing that this shape is pinned by equality rather than by field.

## For t08

**These are the hashes to upload, or to re-upload.** They were built at this branch's head, `ed0aa00`, which is the head the PR opens from; if the PR is amended during review, t08's step 1 must rebuild and re-read them rather than trust this table.

- Chain **11155111**: `index.html` `cb2e8301…99363` (142,949 B) · `index.html.gz` `0023521f…28097` (45,358 B) · `widget.js` `21dd3d13…ea24a` (8,144 B)
- Chain **84532**: `index.html` `8c235917…76ea3` (142,947 B) · `index.html.gz` `bce7a41b…9b1a8e` (45,358 B) · `widget.js` `21dd3d13…ea24a` (8,144 B)

Full digests in § The bundle, per chain. Three things t08 should carry into its step 1:

1. **Build with the same `FEATURED_SALT`** or expect different `index.html` hashes — see § Discoveries. Decide deliberately which salt a public testnet bundle should feature; it is not this task's call.
2. **Build at or after this PR's merge.** Any `app/` byte moves `index.html.gz` and `widget.js`, so a bundle cut before the merge carries no marker and M04 criterion 3 would close on the wrong bytes.
3. The upload is step 4, an Ops-vault action (decision 44, #180), with the vault's `nonce()` re-read, and it must land before Phase 4's UAT opens the page. M04 criterion 3 is t08's to close; this task re-armed it and stopped.

## For M05

The removal rule, as it now reads in `#/docs` § Disclaimer and as the PR that removes the marks must satisfy. The marks come off in one PR — a chunk re-upload and a README edit, **no redeploy** — when all three readings hold:

1. M05's `CLOSEOUT.md` is merged and **90 days** have passed since its merge commit's date.
2. `gh issue list -R dnznlabs/rake --label bug --state all --search "created:>=<M05 merge date>"` prints nothing.
3. `SECURITY.md` records no finding dated after that merge whose disposition is `fix` or `accepted`.

The PR that removes the marks cites the three readings with the date they were taken. Nobody runs this before M05 closes (this task's § Out of scope); it is written now so the day is a reading and not a feeling.

## Open questions

None for the Product Owner. One for the architect, and it is § Deviations 1: AC 1's `grep -c 0.1alpha app/dist/index.html` ≥ 2 is unsatisfiable without giving the page a second source for the version string, which step 1 exists to remove. It is left red rather than quietly amended. The reviewer's call is to amend the criterion or to ask for the page change; nothing else in the task waits on it.
