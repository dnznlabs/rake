# m05-t01d — handoff

PR: #419 · Branch: `docs/m05-t01d-step12-handoff` · 2026-11-26

The five findings of m05-t01c's acceptance run were fixed in `app/`, each with a named test, and the
plan's step 5 grew three Product Owner amendments while they were being built — the 24-hour read, "a
wallet is never worse off than no wallet", and "the page reads its own chain through its own
provider" — so what shipped is the third shape of that step rather than the first. The resulting
document was cut from `main` at `4fb6296`, proposed by the engineer, co-signed and submitted by the
Product Owner, and executed on both testnets as § Uploads rows 7 and 8; the gateway was redeployed so
its static `widget.js` copies match, and gw44's `make verify` measured the deployed host for the
first time in this project's record. **Every criterion is met except one clause of AC 2: the
screenshot per chain, which was never produced.** AC 2's rate was measured **10/10 on every chain**
at #396's head and has not been re-taken for the bytes that shipped, so what it wants is one
`cold.mjs --shots` run after the quiet gap step 5 asks for — work, and mine, not a decision.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — `make test` passes with the tests of steps 2 to 7 in it | **pass** | `devbox run -- make test` at `16891a2` → `tests 419 · pass 419 · fail 0 · skipped 0`. The step tests, run as a set: `node --test test/day-read.test.mjs test/answered.test.mjs test/page-chain.test.mjs test/node-sentence.test.mjs test/action-hash.test.mjs test/chain-type.test.mjs test/widget-sri.test.mjs` → `tests 77 · pass 77 · fail 0 · skipped 0`. **`skipped 0` is load-bearing and newly enforced:** `node --test` exits 0 on a skip, so two `widget-sri` tests were silent passes whenever they lost a race for `app/dist`; `make test` now runs through `tools/node-test.sh`, which fails the build on any skip (commit `1572929`, and Deviation 2) |
| 2 — on all four chains, no wallet, the last 24 hours read in ≥ **9 of 10** cold loads, saying `last 24 hours` and `connect a wallet to load more`, never showing less escrow than `reserved` accounts for without stating the difference; a screenshot per chain | **not yet evidenced for the uploaded document** — the rate was measured met, the screenshots are absent | **The rate clause was measured met, at [#396](https://github.com/dnznlabs/rake/pull/396)'s head `8fa8aea`**, whose criteria table reads **10/10 on every chain**, 0 page errors, no load stopping short, and **no endpoint refusing for rate in forty loads**; requests per load **55 on chain 1 and 47 on the other three**, which is the count step 5's check asks this file to give; floors used 7,000 blocks back on chain 1, 6,923 on Sepolia and 431,999 on both Base chains. **That is not the uploaded bytes:** `app/` moved **nine commits** after `8fa8aea` (`075549a` through `7c8a20b`, #399–#406) before the calldata was cut at `4fb6296`, so the figure holds for the page as #396 built it and has not been re-taken for the page that shipped. Wording: `test/day-read.test.mjs` asserts the 24-hour floor from timestamps and both sentences. Escrow: `test/escrow-state.test.mjs`, with decision 72's reasoning — `reserved[token]` is exact, so the difference is always stated. **The screenshot per chain does not exist**; `cold.mjs --shots` was never run with it, and that clause is **not met**. **The remedy is one run, not a decision:** `cold.mjs --shots` on all four chains from `main`, after the two quiet hours step 5 asks for, with the result and the shots committed here. **Do not read `cold-load.md` § Run A for this row** — it was taken 2026-11-23T06:31:49Z, forty minutes *before* the Product Owner's 06:51Z ruling and before `1262576` (07:11:29Z) built the 24-hour read, so it measures the full-history walk and not this criterion; an earlier head of this handoff reported AC 2 failed on those figures, which was my error |
| 3 — the driver exits 0 on Sepolia **and** Base Sepolia against `https://rake.dnzn.dev`, full list, and 1 on the control on both | **pass** | Record run at `16891a2`, `--acceptance`: 11155111 **exit 0**, 14 rows, 5 writes, 03:05:59–03:13:26Z; 84532 **exit 0**, 14 rows, 5 writes, 03:13:38–03:18:05Z. Controls: **exit 1** on both, failing at row (c) with `sections still loading after 20 s`. Row (k) reports **pending**, not pass, for the pre-existing reason in `rowK` (Deviation 4). This closes the 84532 rows m05-t01c recorded as not met: that chain's shots went from 5 files to 13, the 8 new ones being `c-distro`, `c-console-first`, `d-console-second`, `e-older`, `g-distributed`, `h-released`, `i-applied`, `j-calldata`. **Sepolia's record run needed a second attempt** — Deviation 3. **The two create rows did not flake, and their counts differ because attempt 1 stopped before one of them.** Row (f) passed **4 of 4** on Sepolia — the full run on #414's first head, the full run on its amended head `a7b3c23`, and both record attempts at `16891a2`, attempt 1 having reached (f) and failed later at (i). Row (j) passed **3 of 3** there, because attempt 1 never reached it. On Base Sepolia both are **3 of 3**: the same first two runs and the single record run. Two notes on those citations: the first head is named rather than quoted as a hash because answering the review force-pushed it off the branch, so it is reachable only through #414's own timeline and not from `main`; and the two earlier runs predate their commits by minutes, each being the check that released one, so a head here names the code and not the clock. So [#412](https://github.com/dnznlabs/rake/issues/412) did not appear in this task's runs at all, and the standing instruction to report it rather than re-run was never triggered |
| 4 — on both testnets `chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`, and `curl …/<chain>/widget.js \| sha256sum` equals `chain-doc`'s widget hash | **pass** | 11155111: `fbd0519846d31bb5d58e6649db8353554009902b031af7f96868f7ba49043549` at 170,387 B, equal both ways. 84532: `525f4e3f006049a6b489c03b45b6c6b75ea1470c30d153b7098f5341e2011d08` at 170,385 B — the two-byte difference is `__CHAIN_ID__`. Widget `044139b751a901df06e106d3b8a4c307c745427c3e210ea8f8467f28961b37f1` at 8,525 B from `chain-doc`, from `sha256sum app/dist/widget.js`, **and** from `curl https://rake.dnzn.dev/<chain>/widget.js` on both chains. Full readings in `RUNBOOK.md` § Uploads rows 7 and 8 |
| 5 — gw44's `make verify` with `VERIFY_SITE` prints `ok` on its `site` lines for both chains | **pass** | Read by the owner of this handoff at **2026-11-26T03:42:35–03:42:50Z**, from the gw44 worktree at the commit `deploy-gateway.yml` pins, which is **after** § 4e's deploy at 01:58:19Z — the timestamp is given because a § 4f reading that cannot be ordered against the deploy proves nothing about the deployed bytes. Four `site` lines, all `ok`: `11155111 site root` 72,421 B and `site widget` 8,525 B, `84532 site root` 72,421 B and `site widget` 8,525 B, with `chain=` equal to `site=` on each. Its first line read `verify: address 0x00a9F390A6010d045e0d34856048DdD6910d25BA on chains [11155111 84532]` before the result, as § 4f requires. The browser stage passed its six loads and the run exited 0. An earlier reading of mine and one by another session at 02:45:33Z agreed, both also after the deploy |
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
3. **Step 11's record run on Sepolia needed two attempts, and the first failed.** Attempt 1,
   03:00:34–03:04:44Z, **exit 1**, `rows 10 · writes 3`, failing at row (i): `propose setDescription
   was refused by the page — send failed: … error code -32000: nonce too low: next nonce…`. Its rows
   before the failure, in order: `probe` ok · `a` ok · `c` ok (read state **day**, presses 2) ·
   `c-console-first` ok · `e` ok (pressed from the day line, boundary `null` → 12,200,071, day lines
   2 → 0, `eth_getLogs` 0 → 84) · `d` ok · `k` pending · `l` ok · `f` ok
   (`0x2266E523Bd2Ea19D811B189664645c264743ad92` at salt #14) · `g` ok (pay-in `0x934b85c9fa…`,
   distribute in block 12,213,757, receiver put back to refusing) · `h` ok (`setAccepting`
   `0xd0a98b4ff0…`, release in block 12,213,759). So the three sends before row (i) are readable
   against the chain by their blocks. Attempt 2, 03:05:59–03:13:26Z, **exit 0**, every row. **The
   failure is recorded rather than re-run away** and is carried as #420; the rate across tonight's
   four full Sepolia runs is **1 in 4**. I did not change the driver to make the record pass.
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
- **m05-t01c's missing § Uploads row is added, by the architect's ruling, in its own `RUNBOOK.md` PR**
  ([#422](https://github.com/dnznlabs/rake/pull/422), merged) rather than here. #418 surfaced the gap and deliberately did not fill it, on the view that it
  is another task's record; **that view was overruled** — the row is added, with its twelve figures
  read against the chain by me, pointer sizes in #418's chunk-data convention, and #418's "has no row
  in this table" paragraph rewritten in the same commit so the file does not contradict itself.
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
  tonight. Carried as [#420](https://github.com/dnznlabs/rake/issues/420).
- **§ Uploads had no row for m05-t01c's upload at all** — `App` nonce 1 to 8 with nothing between —
  which the struck superlative was hiding. **Now added as rows 6a and 6b in
  [#422](https://github.com/dnznlabs/rake/pull/422), merged**, by the architect's ruling and against #418's
  view: its draft came from another session of mine, its twelve figures were re-read off the chain
  before publishing, and it rewrites #418's "has no row in this table" paragraph in the same commit
  so the file does not contradict itself.
- **w3link's Sepolia instance is not in ERC-5219 mode**, which narrows what `README.md`'s row should
  say: no `web3-resolve-mode` header, and `/widget.js` answers `Invalid method name`, the auto-mode
  error for a path read as a function name. Added to
  [#411](https://github.com/dnznlabs/rake/issues/411#issuecomment-7181148239) with the comparison
  table.
- **A latent trap in the driver that `cold-load.md` found and row (c) still carries:**
  `PATTERNS.activityRow` backs row (c)'s "at least one row" assertion, and it once matched the bare
  ` in ` of "token payments **in** could not be read from this provider". It is anchored to an amount
  now, but the funds block gaining another sentence containing ` in ` would make row (c) pass on a
  section with no rows — and the same pattern is `settledText`'s *wait* predicate, where a false match
  ends the wait early and the row then reads a section mid-paint. Row (c) counts `.hrow` **elements**
  as well, which is what currently stops it. Carried as
  [#421](https://github.com/dnznlabs/rake/issues/421).
- **AC 7's path list and the plan's own `Record:` line disagree** (Deviation 1): following the open
  question's `Record:` destination necessarily breaks the criterion, so the only honest close is a
  deviation for something the plan instructed. Raised where the template that produces both lives,
  since any plan with an open question recorded outside its own directory reproduces it.

## Open questions

**None.**

An earlier head of this handoff asked the Product Owner to rule on AC 2's cold-load rate. **That
question was raised by my own error and is withdrawn:** it rested on `cold-load.md` § Run A, a
measurement of the page the 24-hour ruling replaced, and the rate was in fact measured **10/10 on
every chain** at #396's head (AC 2). Nothing here needs the Product Owner. What AC 2 still wants is
one `cold.mjs --shots` run against the uploaded document after the quiet gap step 5 asks for — work,
not a decision, and mine. If that run comes back under 9 of 10, the question returns with its new
figures and is his then.
