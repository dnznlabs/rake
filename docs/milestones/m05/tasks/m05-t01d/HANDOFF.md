# m05-t01d — handoff

PR: #419 · Branch: `docs/m05-t01d-step12-handoff` · 2026-11-26

The five findings of m05-t01c's acceptance run were fixed in `app/`, each with a named test, and the
plan's step 5 grew three Product Owner amendments while they were being built — the 24-hour read, "a
wallet is never worse off than no wallet", and "the page reads its own chain through its own
provider" — so what shipped is the third shape of that step rather than the first. The resulting
document was cut from `main` at `4fb6296`, proposed by the engineer, co-signed and submitted by the
Product Owner, and executed on both testnets as § Uploads rows 7 and 8; the gateway was redeployed so
its static `widget.js` copies match, and gw44's `make verify` measured the deployed host for the
first time in this project's record. **One acceptance criterion is not met — AC 2's 9-of-10 cold-load
rate — and it is not met by the task's own committed measurement rather than by anything found
tonight; it is the § Open question below, because the remedies are all outside this task.**

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — `make test` passes with the tests of steps 2 to 7 in it | **pass** | `devbox run -- make test` at `16891a2` → `tests 419 · pass 419 · fail 0 · skipped 0`. The step tests, run as a set: `node --test test/day-read.test.mjs test/answered.test.mjs test/page-chain.test.mjs test/node-sentence.test.mjs test/action-hash.test.mjs test/chain-type.test.mjs test/widget-sri.test.mjs` → `tests 77 · pass 77 · fail 0 · skipped 0`. **`skipped 0` is load-bearing and newly enforced:** `node --test` exits 0 on a skip, so two `widget-sri` tests were silent passes whenever they lost a race for `app/dist`; `make test` now runs through `tools/node-test.sh`, which fails the build on any skip (commit `1572929`, and Deviation 2) |
| 2 — on all four chains, no wallet, the last 24 hours read in ≥ **9 of 10** cold loads, saying `last 24 hours` and `connect a wallet to load more`, never showing less escrow than `reserved` accounts for without stating the difference; a screenshot per chain | **not met** | **The wording and the escrow clause pass; the rate does not, and the screenshots are absent.** `cold-load.md` § Run A (as shipped, 2026-11-23T06:31:49Z, 10 loads each) gives loads whose every section printed no boundary line: chain **1 → 6/10**, **8453 → 10/10**, **11155111 → 0/10**, **84532 → 6/10**, against the 9 the criterion asks. The dominant cause is the endpoints' rate limiting, not the page — Run A's own worst-per-load column reads `9× throttle` on 11155111 and `4× throttle` on each of 1 and 84532 — and § The limits records that **none of the four endpoints names a figure** for its rate, so the cap cannot be derived from their words and has to be measured. **11155111's 0/10 is confounded by my own traffic** and the file says so in § A confound — four runs in one hour took its throttle count 5 → 8 → 9 of 10 and its median truncated depth from 9,965 blocks to 31, which is a measurement of my instrument. Wording: § Run A classifies by the page's own lines and `test/day-read.test.mjs` asserts the 24-hour floor from timestamps and both sentences. Escrow: `test/escrow-state.test.mjs`, with decision 72's reasoning — `reserved[token]` is exact, so the difference is always stated. **No screenshot per chain exists**; `cold.mjs --shots` was never run with it. See § Open questions |
| 3 — the driver exits 0 on Sepolia **and** Base Sepolia against `https://rake.dnzn.dev`, full list, and 1 on the control on both | **pass** | Record run at `16891a2`, `--acceptance`: 11155111 **exit 0**, 14 rows, 5 writes, 03:05:59–03:13:26Z; 84532 **exit 0**, 14 rows, 5 writes, 03:13:38–03:18:05Z. Controls: **exit 1** on both, failing at row (c) with `sections still loading after 20 s`. Row (k) reports **pending**, not pass, for the pre-existing reason in `rowK` (Deviation 4). This closes the 84532 rows m05-t01c recorded as not met: that chain's shots went from 5 files to 13, the 8 new ones being `c-distro`, `c-console-first`, `d-console-second`, `e-older`, `g-distributed`, `h-released`, `i-applied`, `j-calldata`. **Sepolia's record run needed a second attempt** — Deviation 3 |
| 4 — on both testnets `chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`, and `curl …/<chain>/widget.js \| sha256sum` equals `chain-doc`'s widget hash | **pass** | 11155111: `fbd0519846d31bb5d58e6649db8353554009902b031af7f96868f7ba49043549` at 170,387 B, equal both ways. 84532: `525f4e3f006049a6b489c03b45b6c6b75ea1470c30d153b7098f5341e2011d08` at 170,385 B — the two-byte difference is `__CHAIN_ID__`. Widget `044139b751a901df06e106d3b8a4c307c745427c3e210ea8f8467f28961b37f1` at 8,525 B from `chain-doc`, from `sha256sum app/dist/widget.js`, **and** from `curl https://rake.dnzn.dev/<chain>/widget.js` on both chains. Full readings in `RUNBOOK.md` § Uploads rows 7 and 8 |
| 5 — gw44's `make verify` with `VERIFY_SITE` prints `ok` on its `site` lines for both chains | **pass** | Four `site` lines, all `ok`: `11155111 site root` and `site widget`, `84532 site root` and `site widget`, root 72,421 B per chain and widget 8,525 B, chain hash equal to site hash on each. Its first line read `verify: address 0x00a9F390A6010d045e0d34856048DdD6910d25BA on chains [11155111 84532]` before the result, as § 4f requires. The browser stage also passed, six loads across both chains |
| 6 — #373, #375, #379, #382 and #385 closed by the PR, each by a named test | **pass** | All five `CLOSED` 2026-11-23T09:30:4xZ by merge commit `8195da0`. Named tests: #373 `test/node-sentence.test.mjs`; #375 `test/page-chain.test.mjs`, `test/chain-bar.test.mjs`; #379 `test/chain-type.test.mjs`, `test/wallet-picker.test.mjs`; #382 `test/answered.test.mjs`, `test/history-wall.test.mjs`; #385 `test/action-hash.test.mjs` |
| 7 — `git diff --stat main` touches only `app/`, `test/`, `tools/`, `calldata/`, `deploy/`, `docs/milestones/m04/tasks/m04-t05/`, `RUNBOOK.md` Step 4 and § Uploads, and this directory | **pass with two declared exceptions** | `git diff --name-only 8f71b244 origin/main` (the plan's own merge as base) over 61 files: everything is in the list except **`docs/ROADMAP.md`** and **`mk/20-dapp.mk`**, both declared as Deviations 1 and 2. `RUNBOOK.md`'s four hunks are all inside Step 4 and § Uploads (`@@ -1074`, `-1450`, `-1507`, `-1557`). This row excludes the handoff and its shots, which cannot count themselves: `git diff --name-only 8f71b244 origin/main -- . ':!docs/milestones/m05/tasks/m05-t01d/HANDOFF.md'` |

## Deviations from the plan

1. **`docs/ROADMAP.md` is outside AC 7's path list, and the plan itself requires it.** Step 5's
   § Open questions names `ROADMAP.md` § Decisions as the `Record:` destination for #387's ruling, so
   the criterion's list is incomplete by the plan's own instruction rather than by a choice of mine.
   What landed there is **decision 72** and its 2026-11-23 amendment, 20 lines, no other entry moved.
2. **`mk/20-dapp.mk` changed, also outside AC 7's list**, in commit `1572929`: `make test` now runs
   `bash tools/node-test.sh test/*.test.mjs` instead of `node --test test/*.test.mjs`. The reason is
   in AC 1 — `node --test` exits 0 on a skip, so two SRI tests were silent passes depending on
   process scheduling. Declared rather than quietly carried because it changes how **every**
   criterion that quotes `make test` is measured.
3. **Step 11's record run on Sepolia needed two attempts, and the first failed.** Attempt 1
   (03:00:34–03:04:44Z) failed at row (i): `propose setDescription was refused by the page — send
   failed: … error code -32000: nonce too low: next nonce…`, after rows (f), (g) and (h) had each
   sent. Attempt 2 passed every row. **The failure is recorded rather than re-run away**, and it is
   the first Discovery; the rate across tonight's four full Sepolia runs is **1 in 4**. I did not
   change the driver to make the record pass.
4. **Row (k) is `pending`, not a pass, on both chains**, which is unchanged from m04-t05 § Step 2 and
   not a regression: there is no published URL for the host page, and the committed file names
   84532's w3link base rather than a `dnzn.dev` one. `rowK` still asserts the file's two mounts, its
   one `data-rpc` and its gateway `widget.js` source, so the row is checked as far as it can be.
5. **Row (c) and row (e) of the driver had to be fixed after the upload, in a PR of their own**
   ([#414](https://github.com/dnznlabs/rake/pull/414)): they still asserted the wording step 5's
   #400 amendment replaced, so the first record run failed on a page that was correct. The architect
   requested changes on the first fix because it replaced one unconditional claim with another; the
   merged version reads which of `dayHead`'s three states the page is in and asserts that state.
6. **A merged record of mine was wrong and was corrected in
   [#418](https://github.com/dnznlabs/rake/pull/418).** § Uploads rows 7 and 8 claimed "the first
   three-chunk document"; m05-t01c's was first. The false claim is struck rather than deleted in the
   file.

## Decisions

- **The order gate for § 4c was read as chunk *contents*, not only as `App`'s nonce.** Before piece 2
  the code at the doc-0 pointer was compared with `0x00` + `1-addChunk-0.hex`'s `bytes` argument, and
  before the batch both document pointers were. The runbook offers the nonce and code-presence rows as
  cheap pre-checks and names the content equality as the only thing that proves the order held; the
  cheap ones cannot see the one silent misorder, so all three were read on both chains.
- **The w3link Sepolia failure was classed as third-party and carried, not re-uploaded**, per § 4d's
  own rule. Before classing it I checked the instrument could see a presence: 84532 answers 200 on the
  same host, our own gw44 build at the pinned commit answers 200 at 72,421 bytes for **both** chains,
  and `request([])` answers 200 through our endpoints on both.
- **m05-t01c's missing § Uploads row was surfaced, not reconstructed, inside this task** (#418). It is
  another task's record, and inventing its figures to close a visual gap is the error that section
  exists to prevent. See § Discoveries for where the reconstruction now lives.
- **Row (c)'s two non-day branches are proven by forced-selector mutation rather than by a live
  reading**, because they cannot be induced against a deployed host: the `?rpc=`, `?cap=`, `?win=` and
  `?maxwin=` overrides are `/*DEV*/`-guarded and the shipped build strips them — `maxwin` occurs 2× in
  `app/src/index.html`, **0×** in `app/dist/index.html` and 0× in the document on chain. #414's body
  says which branch has which kind of evidence.

## Discoveries

- **A new driver failure, not #412 and not filed: `cast send` can be refused `nonce too low` mid-run.**
  Row (i), record attempt 1, after three rows of sends from the same key. The pooled-endpoint
  explanation is **ruled out**, not assumed: 20 consecutive `cast nonce` reads and 20 `cast
  block-number` reads from `ethereum-sepolia-rpc.publicnode.com` agreed 20/20, and `latest` equalled
  `pending` at 202. The remaining plausible cause is overlapping sends from one key within a run; the
  page's `eth_sendTransaction` path in `tools/uat/provider.mjs` calls `cast send` directly and has no
  `sendOnce` retry behind it, unlike the driver's own setup sends. Rate 1 in 4 Sepolia full runs
  tonight.
- **§ Uploads had no row for m05-t01c's upload at all** — `App` nonce 1 to 8 with nothing between —
  which the struck superlative was hiding. **A reconstruction now exists and wants review:** branch
  `docs/m05-t01d-handoff` on `origin` at `ff704c5`, written by another session of mine before it
  stood down, adding rows 6a and 6b with two independent confirmations per row. It is **misnamed**,
  has **no PR**, and is based on `01f2646`, which predates #418, so its strike and the merged one
  overlap. It also states the pointer sizes as runtime bytes (24,001 / 2,367 / 8,526) where #418
  states them as chunk data (24,000 / 2,366 / 8,525), one byte apart by the SSTORE2 stop byte — the
  file should not carry both conventions.
- **w3link's Sepolia instance is not in ERC-5219 mode**, which narrows what `README.md`'s row should
  say: no `web3-resolve-mode` header, and `/widget.js` answers `Invalid method name`, the auto-mode
  error for a path read as a function name. Added to
  [#411](https://github.com/dnznlabs/rake/issues/411#issuecomment-7181148239) with the comparison
  table.
- **A latent trap in the driver that `cold-load.md` found and row (c) still carries:**
  `PATTERNS.activityRow` backs row (c)'s "at least one row" assertion, and it once matched the bare
  ` in ` of "token payments **in** could not be read from this provider". It is anchored to an amount
  now, but the funds block gaining another sentence containing ` in ` would make row (c) pass on a
  section with no rows. Row (c) counts `.hrow` **elements** as well, which is what currently stops it.
- **AC 7's path list and the plan's own `Record:` line disagree** (Deviation 1). Worth fixing in the
  template or in the next plan rather than here.

## Open questions

- **AC 2's 9-of-10 cold-load rate is not met. Does the document ship on the committed figures, or is
  a clean re-measurement a gate?**
  *Options:* (1) **ship as measured** — the page is honest about what it could not read, which is what
  #387's ruling and decision 72 chose, and the rate is a property of free public endpoints rather than
  of the code; costs nothing, and leaves a criterion recorded as not met. (2) **re-measure cleanly
  first** — `cold.mjs` on all four chains after a genuinely quiet gap from a quiet IP, with
  `--shots` so the missing screenshot per chain exists; costs calendar time, not work, and is the only
  way to know whether 11155111's 0/10 is the endpoint or my own four thousand requests. (3) **buy or
  build depth** — a paid endpoint with its key out of the public document, or the log cache of #221;
  both are tasks of their own and #221 is explicitly carried post-mainnet by decision 62.
  *Recommendation:* **(2) then (1).** The figures as they stand cannot support a ship decision in
  either direction, because the one chain that reads 0/10 is the one the file itself says is
  confounded; a clean run costs a quiet gap and nothing else. If it comes back below 9 of 10 anyway,
  (1) is right and the criterion should be amended to a rate the free endpoints can actually hold,
  since (3) is out of this task's scope by its own § Out of scope.
  *Default, if nothing is said:* (1), because decision 72 already governs what the page *says* and
  nothing here changes it. *Blocks:* this task's close, and nothing else — the mainnet uploads of
  m05-t03 read the same endpoints and will meet the same rate.
  *Record:* `ROADMAP.md` § Decisions, as a second amendment to decision 72.
