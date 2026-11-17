# m04-t12 — handoff

PR: not yet opened · Branch: `m04/t12-log-cache` · 2026-11-17

Decision 52's store was built in three parts: `splitFinal`, `evict` and `mergeHist` in `model.js`,
driven under node; one IndexedDB database `rake.logs` in `index.html`, keyed `[chainId, address]`,
whose version number is the schema version and whose every call resolves `null` rather than throwing;
and a wrapper around `histLogs` that reads `finalized` once per load, serves the record, scans only
the tail above it and persists only what is at or below the boundary. The `#/docs` page gained a
fifteenth section, Cache, with the count, the approximate bytes, the eviction rule and a `clear cache`
control. On the browser check's chain a second load of a distribution page costs **3** `eth_getLogs`
where the first costs **33** — one per kind instead of eleven — and the three sections' DOM text is
byte-equal across the two. Every figure below was read at the head named in AC 12, not quoted from the
plan; the baselines were re-measured rather than taken from § 0, and two of them had moved (§
Deviations 1).

Built at `a837fd2`, the last commit touching `app/` or `test/`; this file is the only later change and
`git diff a837fd2..HEAD -- app/ test/` is empty.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | Step 7(a) store empty, `?win=100` over a 1,040-block chain from `factoryBlock` 1: `self.__LOGREQ` grouped by `kind` = **11 / 11 / 11, total 33**, window spans `[941,1040] [841,940] [741,840]` (so the page did read `win=100`, and 11 = ⌈1040 ÷ 100⌉). Step 7(b) reload: **1 / 1 / 1, total 3**, every span `[977,1040]` — exactly the tail above `finalized` 976. `≤ 1 per kind: true · ≤ 3 total: true`. The plant (a store that never writes `through`) made both loads 11/11/11 total 33, `≤ 1 per kind: false` — quoted in § The planted reds. |
| 2 | pass | The DOM text of `funds`, `h-changes` and `h-funds` after 7(a) and after 7(b): `byte-equal funds: true · byte-equal changes: true · byte-equal activity: true`. The comparison was made in the browser on the two strings, not by eye; the three texts are carried once in § The three section texts. |
| 3 | pass | Step 7(c): record `through` 976, head 1040. `evm_snapshot`, pay Ξ0.55 → block 1041 (above `finalized`), load → the page shows `Ξ0.5500` and the record's `through` is **977**, so the 0.55 log was shown and not kept. `evm_revert`, pay Ξ0.99 at the same height, reload → `shows 0.9900: true · shows 0.5500: false`. The `through = head` plant is quoted in § The planted reds. |
| 4 | pass | Step 7(d), 50 fresh records one minute apart plus one visited 31 days ago, written through `page.evaluate` against the open database: 51 records, then a load → **count 50**, the 31-day record gone. Opening a distribution not among the 50 (the escrow demo, salt 2) → **count 50**, the least recently visited seeded key `0xbeef…0049` gone, the new distribution in the store. `Model.evict` is pinned in `test/model.test.mjs` with four rows, not three (§ Deviations 2), and both predicted reds are quoted. |
| 5 | pass | Step 7(e), `indexedDB` redefined as `undefined` by `page.addInitScript`: the init script trips (`typeof self.indexedDB` → `undefined`), two consecutive loads both **11 / 11 / 11, total 33**, both equal to 7(a); the three section texts equal 7(a) on both loads; the Cache section reads `Storage is unavailable in this browser, so nothing is cached here and every load reads the chain in full.` and the control is `<button class="btn off sm" disabled="">clear cache</button>`. |
| 6 | pass | `make dapp-nodev CHAIN_ID=11155111` at the head → `dapp: raw 149592 bytes · gzip 47629 bytes · chain 11155111`, `widget: raw 8132 bytes · budget 10240 · 2108 left`; `wc -c app/dist/widget.js` → **8132**, unchanged. gzip delta **+2,252** against the plan's baseline 45377, and **+2,094** against `origin/main` at `1a5a211` re-measured today at 45535 (§ Deviations 1). |
| 7 | deferred | The PR is not this task's to open (so ruled for this run). The closing comment is drafted in § For the PR, with criterion 1's measured counts: 120 `eth_getLogs` per load becomes 3 after the first load, 33 → 3 on the check's chain. #165 is not closed by anything in this branch. |
| 8 | pass | Step 7(f), one distribution load then a fresh load of `#/docs` so nothing is open behind it: the section reads `1 distribution cached · about 6618 bytes`, the press leaves `0 distributions cached · about 0 bytes` and `count()` through `page.evaluate` → **0**. The next distribution load: **11 / 11 / 11, total 33**, equal to 7(a). With a distribution page open behind the docs route (reached by hash, so `DS` keeps it) the press issued **33** `eth_getLogs` — a full re-read — and the three texts after it are the same rows. |
| 9 | pass | Step 7(g), after exactly **two** loads of one distribution page (7a and 7b) and so one record: the section printed `1 distribution cached · about 6618 bytes`; `count()` and the summed `JSON.stringify` length read through `page.evaluate` outside the page gave `{"count":1,"bytes":6618}`. `count matches: true · bytes match: true`. |
| 10 | pass | `devbox run -- node --test test/docs.test.mjs` → `ℹ tests 12 · ℹ pass 12 · ℹ fail 0`, with `:95` at `15`, the title reworded to "fifteen sections" and one new test, `the Cache section says what is stored, the eviction rule and carries the clear control`. `grep -rniE '\btip\b\|govUrl\|about:\|ownerKind' app/src \| wc -l` → **4** (baseline 4, § 0), the same four `ownerKind` lines — `model.js:95`, `model.js:291`, `index.html:1601`, `index.html:1607` — and nothing new. The three reference-file tests (`the snapshot struct…`, `every Distribution signature…`, `the factory table…`) are untouched and pass. |
| 11 | pass | At the head: `grep -ic indexeddb app/src/index.html` → **5** (baseline 0); `grep -ic finalized` → **6** (baseline 0); `grep -c eth_getBlockByNumber` → **2** (baseline 1 — the clock's `latest` read and `fin()`'s); `grep -ic '43,200 a day'` → **0** (baseline 1); `grep -ic 'id="s-cache"'` → **1** (baseline 0). |
| 12 | pass | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/` → empty. `node --test test/*.test.mjs` → `ℹ tests 121 · ℹ pass 121 · ℹ fail 0`, above the 102 the plan quotes and above the 109 re-measured at the branch point; the 12 added tests are named in § The tests added. `forge test` → `107 tests passed, 0 failed` in 7 suites, unchanged from `main` (nothing under `src/`, `test/*.t.sol`, `.gas-snapshot`, `foundry.toml` or `lib/` moved — the path-scoped diff above). `make fmt` → `forge fmt --check`, exit 0. `forge lint` → exit 0, no finding. `forge snapshot --check` → exit 0 after `forge build --force`. `git status --porcelain` empty after `make dapp-nodev CHAIN_ID=11155111`. **CI green at `a837fd2`** — run [44166498439](https://github.com/dnznlabs/rake/actions/runs/44166498439), `completed success` in 3m54s; every one of its steps was also run locally through the pin first (secrets `scanned ~15720516 bytes`, `forge build --force` with 0 `warning[` and 0 `Warning (`, `make fmt`, `make test`, `forge snapshot --check` exit 0, `make slither` → `6 contracts with 75 detectors, 0 result(s) found`, working tree clean). |

## The planted reds

Each was planted once, the failure quoted, reverted by path, and the suite confirmed green again.

**1 · `splitFinal` with `<` for `<=`** — `node --test test/model.test.mjs` → `ℹ pass 53 · ℹ fail 2`:

```
✖ splitFinal keeps the finalized block itself on the final side
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ 'a', -   'b' ]
      at TestContext.<anonymous> (test/model.test.mjs:521:10)
```

**2 · `evict` with the cap applied one too high** (`fresh.slice(cap + 1)`) → `ℹ pass 53 · ℹ fail 2`:
`✖ evict takes the least recently visited one record past the cap, and none at the cap` and
`✖ evict reads the thirty days and the fifty records as its own defaults`.

**2a · `evict` with the *default* cap moved to 51** → `ℹ tests 55 · ℹ pass 55 · ℹ fail 0`. **Green**:
every cap row passed `{ cap: 50 }` explicitly and the defaults row carried two records, so neither
could see it. The defaults row was rewritten to drive 51 records with no options at all, after which
the same plant reds `✖ evict reads the thirty days and the fifty records as its own defaults` with
`+ [] - [['1','0x50']]`. Both readings are recorded because the first one is the hole.

**3 · `evict` with `>=` for `>` on the age test** — the plant § 1 names — → `ℹ pass 54 · ℹ fail 1`:

```
✖ evict drops a record not visited for more than thirty days, and keeps one at twenty-nine
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ [ '1', '0xold' ], +   [ '1', '0xedge' ] ]
      at TestContext.<anonymous> (test/model.test.mjs:553:10)
```

It reds on the record visited **exactly** 30 days ago (`0xedge`), not on the plan's
30-days-plus-one-second record — see § Deviations 2.

**3a · the age comparison inverted (`<` for `>`)** → `ℹ pass 52 · ℹ fail 3`, and here the
30-days-plus-one-second row is the one that moves: `+ ['1','0xyoung'] - ['1','0xold']`.

**4 · the Cache section added, the docs test untouched** — `node --test test/docs.test.mjs` →
`ℹ pass 10 · ℹ fail 1`:

```
✖ the rail and the headings are the same fourteen sections, in one order
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  15 !== 14
      at TestContext.<anonymous> (test/docs.test.mjs:95:10)
```

**5 · `through = head`** (step 7c's plant, the record's boundary alone) — step 7(c) → `PASS: false`,
but not by the ghost the plan predicts: the record claimed `through` 1051 while `splitFinal` still cut
at `finalized` 987, so the next load's tail scan started at 1052 and **every log between 988 and 1051
was dropped** — `shows 0.9900: false · shows 0.5500: false`, and the activity list ended at block 20.

**5a · the whole boundary at head** (`const at = await head()`, so the cut moves too) — step 7(c) →
`shows 0.9900: true · shows 0.5500: true`, `PASS: false`. This is the plan's ghost, measured: the
reverted Ξ0.55 payment at block 1052 stayed at the top of activity and in the record's `funds`
(`[…,20,1052]`) while the chain carried Ξ0.99 at that height.

**6 · a store that never writes `through`** (AC 1's plant) — step 7(a) and 7(b) both
**11 / 11 / 11, total 33**, `≤ 1 per kind: false · ≤ 3 total: false`. The three section texts stayed
byte-equal under this plant, so AC 2 alone cannot catch it; AC 1 is the row that does.

## The three section texts

Step 7(a), and byte-equal after 7(b) (AC 2). Chain: `factoryBlock` 1, head 1040, `finalized` 976; the
seed distribution `0x9b407e3c98fdb820203275919A90A056275e1e37` on anvil 31337.

- `funds` — `ETHwaiting to distributeΞ1.6600distribute0x68B1…1aedwaiting to distribute · 40000000000000000000 raw held in escrow0 rawdistributeescrowed · 0x68B1…1aed0x7099…79C8 — the push failed, so this share waits here40000000000000000000 rawreleaseanyone can call distribute() — the contract splits by the table above; you pay the gas.Paying in from a contract with .transfer() or .send() can fail when the implementation is cold: the 2,300-gas stipend does not cover a clone's delegatecall to a cold implementation. Pay in with call and gas.`
- `h-changes` — `queuedsetDescription · new name · DNZN fees - revised · nonce 2 · 6d 23hblock 16 · 0xbab4…3a70queuedsetBeneficiaries · new table · 40% / 60% · nonce 1 · 6d 23hblock 4 · 0xb0db…705d`
- `h-funds` — `inΞ0.3300 from 0xf39F…2266block 15 · 0x38a1…b30einΞ0.2200 from 0xf39F…2266block 14 · 0xc85e…0214inΞ0.1100 from 0xf39F…2266block 13 · 0xdd82…da2bdistributed100000000000000000000 raw 0x68B1…1aed by the tableblock 12 · 0x4ccf…4014escrowed40000000000000000000 raw 0x68B1…1aed · 0x7099…79C8block 12 · 0x4ccf…4014inΞ1.0000 from 0xf39F…2266block 4 · 0xdf97…aa8c`

`page errors: none` in every one of the seven runs.

The whole check was run twice end to end against the same dev build, with the same result on every
row; the second run's record carries `through` 977 rather than 976, the chain having advanced one
block under the first run's `evm_revert`. **That the page read `?win=100` was confirmed against the
build under test** rather than inferred: `WINDOW_START` read through `page.evaluate` is `100`, and
`MAX_WINDOWS` is `40` with `WINDOW_INFLIGHT` `4`, neither retuned (§ Out of scope). The same read
against the **ship** bundle answers `10000` — the `/*DEV*/` fences hold, so `?win=` reaches nothing
that ships. That reading cost a cycle first: `app/dist` held the `dapp-nodev` build when it was taken,
and the ship bundle ignores `?win=` and `?rpc=` by design, so the first answer was `10000` and meant
only that the wrong artifact was under the browser.

## The baselines, re-measured

Taken at `1a5a211` (`origin/main`, the #222 merge) on 2026-11-17 between 19:42 and 19:44 UTC, through
`devbox run --` (node `v24.12.0`, forge/cast `1.7.1`, anvil `1.7.1-dev`).

| § 0 reading | plan, at `6394f16` | re-measured at `1a5a211` |
|:---|:---|:---|
| `node --test test/*.test.mjs` | `tests 102 · pass 102 · fail 0` | **`tests 109 · pass 109 · fail 0`** |
| `make dapp-nodev CHAIN_ID=11155111` | `raw 142989 · gzip 45377` | **`raw 143339 · gzip 45535`** |
| `wc -c app/dist/widget.js` | 8132 | 8132 |
| `grep -c __LOGREQ app/dist/index.html`, nodev / dev | 0 / 2 | 0 / 2 |
| `grep -ic indexeddb app/src/index.html` | 0 | 0 |
| `grep -ic finalized app/src/index.html` | 0 | 0 |
| `grep -c eth_getBlockByNumber app/src/index.html` | 1 | 1 |
| `grep -c eth_blockNumber app/src/index.html` | 1 | 1 |
| `grep -ic '43,200 a day' app/src/index.html` | 1 | 1 |
| `grep -ic 'id="s-cache"' app/src/index.html` | 0 | 0 |
| M02 criterion 9's grep | 4, all `ownerKind` | **4, all `ownerKind`** (`model.js:95`, `:291`, `index.html:1601`, `:1607`) |
| `test/docs.test.mjs:95` | `14` | `14` |

**The `finalized` tag on anvil `1.7.1-dev`**, port 8746, 2026-11-17 19:44 UTC, with
`cast rpc eth_getBlockByNumber '"finalized"' false --rpc-url http://127.0.0.1:8746`: after
`anvil_mine 0x14` (head 20) the answer is genesis, `parentHash` all zeros; after a further
`anvil_mine 0x64` (head 120) it is `0x38` = 56 with `safe` `0x58` = 88 — so **head − 64**, two 32-slot
epochs, floored at genesis, exactly as § 0 records. `"finalised"` is refused with
`error code -32602: hex string without 0x prefix`.

**The tag on the public endpoints**, 2026-11-17 19:44 UTC, one sample each:

| endpoint | finalized | latest | behind |
|:---|---:|---:|---:|
| `mainnet.base.org` | 58766512 | 58771326 | 4,814 |
| `base-rpc.publicnode.com` | 58766512 | 58771330 | 4,818 |
| `sepolia.base.org` | 60108142 | 60113866 | 5,724 |
| `base-sepolia-rpc.publicnode.com` | 60108142 | 60113870 | 5,728 |
| `ethereum-sepolia-rpc.publicnode.com` | 12156461 | 12156547 | 86 |

None refused it, so `fin()`'s fallback comment names no provider. Every tail fits one 10,000-block
window, so a cached load is one `eth_getLogs` per kind on an uncapped provider; through
`sepolia.base.org`'s 200 cap, 5,728 blocks is **29** windows — under the 40 budget, so a cached load
there has no partial line either.

**Block time on the Base chains**, re-measured 2026-11-17 19:43 UTC with the § 0 command,
`cast block <n> --field timestamp`, over two spans on each of three endpoints per chain:

| chain | endpoint | span | seconds | s/block |
|:---|:---|---:|---:|---:|
| Base | `base.drpc.org` | 500,000 | 100,000 | **0.2000** |
| Base | `base.drpc.org` | 10,000 | 2,000 | **0.2000** |
| Base | `base-rpc.publicnode.com` | 500,000 | 100,000 | **0.2000** |
| Base | `base-rpc.publicnode.com` | 10,000 | 2,000 | **0.2000** |
| Base | `mainnet.base.org` | 500,000 | 100,000 | **0.2000** |
| Base | `mainnet.base.org` | 10,000 | 2,000 | **0.2000** |
| Base Sepolia | `base-sepolia.drpc.org` | 500,000 | 100,000 | **0.2000** |
| Base Sepolia | `base-sepolia-rpc.publicnode.com` | 500,000 | 100,000 | **0.2000** |
| Base Sepolia | `base-sepolia-rpc.publicnode.com` | 10,000 | 2,000 | **0.2000** |
| Base Sepolia | `sepolia.base.org` | 500,000 | 100,000 | **0.2000** |
| Base Sepolia | `sepolia.base.org` | 10,000 | 2,000 | **0.2000** |

Eleven of twelve readings; `base-sepolia.drpc.org` failed its 10,000-block read once and was not
retried, the other five Sepolia readings agreeing. **0.2 s per block, 432,000 a day, on both Base
chains** — so a 200-block window is 40 s of chain and the 40-window budget is 8,000 blocks, about 27
minutes. This is what step 6's comment now says, and it says **Base chains** rather than Base Sepolia,
as ruled today.

## The tests added

Twelve, taking `node --test test/*.test.mjs` from 109 to 121. In `test/model.test.mjs`: three for
`splitFinal` (the boundary, the split, empty input), four for `evict` (the three age rows, the cap at
50 and 51, the defaults driven at the counts that make them bite, the empty store) and four for
`mergeHist` (the per-kind merge with `through` and `first`, the older slice lowering `first`, the first
load of a device, the other-token list kept only where both halves carry it). In `test/docs.test.mjs`:
one for the Cache section's shape, which also pins `LOGKEEP` at `{ days: 30, cap: 50 }` so the prose's
two numbers and the store's cannot drift apart.

## Deviations from the plan

1. **Two of § 0's baselines had moved**, because the plan measured them at `6394f16` and this branch is
   cut at `1a5a211` (the #222 merge, which carries m04-t11): `node --test` is **109**, not 102, and the
   ship bundle is **gzip 45535**, not 45377. Both are re-measured above and AC 6 carries the delta
   against each. Nothing else in § 0 had moved.
2. **`Model.evict` is pinned with four age rows, not the plan's three.** § 1 predicts that `>=` for `>`
   "does not red the 29-day case, so that row is the 30-days-plus-one-second record, which it does
   red". Measured, it does not: an age of 30 days + 1 s satisfies both `> 30 days` and `>= 30 days`, so
   that row reds under neither comparison, and the 29-day row reds under neither. The only record the
   slip moves is one visited **exactly** 30 days ago, which the plan's three rows do not include — the
   plant was invisible until that row was added (quoted green in § The planted reds 2a's sibling, red
   in 3). The row is the plan's own rule read literally ("older than `days`"): at exactly 30 days a
   record stays.
3. **A second plant was needed for the cap.** "`evict` with `cap` 51" planted as the *default*
   `cap = 51` passed green, because every cap row named `{ cap: 50 }` explicitly. The defaults row now
   drives 51 records with no options, and both the default plant and the applied-cap plant red.
4. **The eviction rule also runs after a record is written**, not only on open as § 2 says. Decision 52
   rules that the store "holds at most 50"; the dapp's routes change by hash, so a device that opens a
   51st distribution and never reloads would sit at 51 indefinitely, and § 7(d)'s second half would
   read 51 rather than the 50 it predicts. The open-time sweep is unchanged and is still where the age
   rule bites. Commit `a837fd2`.
5. **The cached record is served only where the read is the tail above it.** § 3 gives one condition,
   `through >= from − 1`. A `load older` pass calls `histLogs` with a `to` *below* `through`, which that
   condition admits and which would have served the record again and appended it to what the page
   already held. The served branch therefore also requires `to == null || to > through`; an older-slice
   read scans live from `from` as it always did and is merged as the older half, which is what lowers
   `first`.
6. **A tail scan that runs out of budget drops the record for that load** and reads the whole range.
   § 3 does not rule this case. Serving the record plus a short tail leaves a hole between them, and
   the group carries one boundary block, which cannot describe a hole — the same reason `logs()` keeps
   a batch only as far as its first refusal. Unreachable on any provider measured (§ The baselines: the
   worst tail is 29 windows of the strictest endpoint, under the 40 budget).
7. **Step 7c's plant produces a dropped row, not a ghost, unless the whole boundary moves.** Both were
   planted and both are quoted (§ The planted reds 5 and 5a). `through = head` alone leaves
   `splitFinal` cutting at `finalized`, so the record claims blocks it does not hold; the ghost the
   plan predicts needs the cut at head as well.
8. **`app/dist` was served by `python3 -m http.server 3200`, not `npx serve`.** `serve` drops the query
   string on its extension redirect, so `?rpc=…&win=100` would have been lost and the check would have
   measured `WINDOW_START` 10,000 silently. That the page saw `win=100` is proved twice: `WINDOW_START`
   read as `100` through `page.evaluate`, and every window span in `__LOGREQ` being 100 blocks wide.
9. **Step 6 says "Base Sepolia"; the comment says "the Base chains".** Ruled by the architect on
   2026-11-17, and the measurement above is why: Base mainnet mints at the same 0.2 s.
10. **AC 7 is deferred.** The PR is not this task's to open, so #165 is not closed here. The closing
    text is in § For the PR.
11. **`ls .git/hooks | grep -v sample` cannot run in a worktree**, where `.git` is a file. Read at the
    common directory instead — `ls /home/openclaw/src/rake/.git/hooks | grep -v sample` → `pre-commit`,
    `post-commit`, which is § 0's answer.

## Decisions

- **The check's chain and window**, which § Open questions leaves to the engineer: `?win=100` over a
  chain of 1,040 blocks — three ETH payments of 0.11, 0.22 and 0.33 at blocks 13, 14 and 15, one
  `setDescription` proposed at block 16, then `anvil_mine 0x400`. That gives 11 windows per kind on the
  first load against the 40 budget, and a `finalized` of 976 that sits 960 blocks above every shaped
  log, so the whole history is final on the first load and the tail is one window on the second.
  Default anvil, not `--slots-in-an-epoch 1`: head − 64 is what step 7(c) needs, since a payment at the
  head is then above `finalized` by construction.
- **The two numbers of the eviction rule live in one place in the page**, `LOGKEEP = { days: 30, cap: 50 }`,
  which is passed to `Model.evict` and which the Cache section's prose repeats in words. The docs test
  pins both the words and the constant, so a change to one that misses the other fails rather than
  shipping a page that misdescribes what it does.
- **`ins` is kept only where both halves carry it.** A provider that refuses the address-less
  `Transfer` query leaves `ins` null, and a half-read list of other tokens cannot be told from a
  complete one. This is the rule `older()` already applied to the same query, now applied to the store
  as well, in `mergeHist` and on the served path.

## Discoveries

- **A browser record costs about 6.6 KB of JSON for a short history.** The seed distribution, with 2
  `Queued` logs, 6 fund logs and no `Transfer` logs, serialises to **6,618** characters. Fifty such
  records are roughly 330 KB; a distribution with a real lifetime of logs would be larger, and the
  Cache section is what makes that visible. No quota error was reached in any run, so the quota arm of
  the guard is untested against a real refusal.
- **The 40-window budget is about 27 minutes of either Base chain**, not the week § 0's old arithmetic
  implied — Base mainnet mints at 0.2 s too, which the plan measured but which its § 6 wording did not
  carry into the page.
- **The tail above `finalized` is 4,800–5,700 blocks on the Base chains and 86 on Sepolia** (§ The
  baselines). The Base figure is 22–32 minutes of chain at 0.2 s, which is what the store leaves to be
  read live; it is one window uncapped and 29 through the strictest endpoint measured.
- **A plant on a default is invisible to a test that passes the value explicitly** (§ Deviations 3), and
  **a boundary row is the only row a `>=`-for-`>` slip can move** (§ Deviations 2). Both are general,
  and both were found by planting the reds the plan named and reading what actually failed.
- `npx serve` drops the query string on its extension redirect (§ Deviations 8). Worth a line in
  `AGENTS.md` § The dapp if another task's browser check depends on a query parameter; not changed here.

## For Denizen

Decision 17 gives you the docs page's text, and the Cache section's prose is a draft, as m02-t04's was.
Two paragraphs, before `For developers`, and the structural checks (AC 10) run against whatever you
write — what the test pins is the heading, the words `30 days` and `at most 50`, the `clear cache`
button and the slot the count is painted into, not the sentences:

> This page keeps a copy of each distribution's event history in this browser, so that opening the
> same distribution a second time reads only the blocks the chain has added since. What is kept is
> public chain data: the events the chain has already published, and only those in blocks it has
> undertaken not to replace. No account state is stored, nothing a wallet signed, and nothing is sent
> anywhere — the copy stays on this device and is read by nothing but this page.
>
> A distribution not opened for 30 days is dropped, and this browser keeps at most 50 of them, the
> least recently opened going first. Clearing the cache costs nothing but the next read: everything in
> it is on chain, and the page reads it again.

Below them the page prints one line it reads from the store — `1 distribution cached · about 6618
bytes` — and the `clear cache` button beside it. Where a browser has no storage, that line reads
`Storage is unavailable in this browser, so nothing is cached here and every load reads the chain in
full.` and the button is disabled.

## For the PR

#165's closing comment, with criterion 1's measured counts:

> Closed by decision 52's store (m04-t12). The window budget is 40 per log kind, so a load of a
> distribution older than the budget paid up to 120 `eth_getLogs`. It now pays that once per device:
> on the browser check's chain the first load issued **33** (11 per kind at `?win=100` over 1,040
> blocks) and every load after it issued **3** — one per kind, covering only the tail above the
> chain's `finalized` block, measured at 4,814 blocks on Base and 5,724 on Base Sepolia on 2026-11-17,
> which is one 10,000-block window uncapped and 29 of `sepolia.base.org`'s 200. `MAX_WINDOWS`,
> `WINDOW_START` and `WINDOW_INFLIGHT` are unchanged.

The upload is not this task's (§ Out of scope). The testnets keep the m04-t10 document until the next
Run B that `RUNBOOK.md` § Which run is this defines, which carries this change together with m04-t11's
and m04-t05's findings; M05's mainnet document is built from a tree that includes this one, and
decision 52 requires this merged before that upload.

## Open questions

None.
