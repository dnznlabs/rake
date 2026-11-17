# m04-t12 — handoff

PR: [#227](https://github.com/dnznlabs/rake/pull/227) · Branch: `m04/t12-log-cache` · 2026-11-17

Decision 52's store was built in three parts: `splitFinal`, `evict` and `mergeHist` in `model.js`,
driven under node; one IndexedDB database `rake.logs` in `index.html`, keyed `[chainId, address]`,
whose version number is the schema version and whose every call resolves `null` rather than throwing;
and a wrapper around `histLogs` that reads `finalized` once per load, serves the record, scans only
the tail above it and persists only what is at or below the boundary. The `#/docs` page gained a
fifteenth section, Cache, with the count, the approximate bytes, the eviction rule and a `clear cache`
control. A second load of a distribution page now costs one `eth_getLogs` per kind where the first
pays one per window of the whole history (AC 1), and the three sections' rows do not move across the
two (AC 2).

Code head `6aae040`, the last commit to touch `app/` or `test/`; `git diff 6aae040..HEAD -- app/ test/`
is empty, so every figure below was read on that tree and none is quoted from the plan. The #227 review
found one bug in the `clear cache` path, fixed at that commit (red 7, AC 8 and AC 9); because the fix
is in a path the check exercises, the whole browser check was re-run at that head against a freshly
deployed stack, and every browser figure below is that one run's rather than the first run's. Each
figure is stated once, in its criterion's row; the sections after § Open questions are the artifacts
the plan asks for by name, and they reference the rows rather than restate them. The planted reds are
numbered in § The planted reds and cited from the row that needed each.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | pass | Step 7(a), store empty, `?win=100`: `self.__LOGREQ` grouped by `kind` = **11 / 11 / 11, total 33**, spans `[944,1043] [844,943] [744,843]` — 100 blocks wide, and 11 = ⌈1043 ÷ 100⌉. Step 7(b) reload: **1 / 1 / 1, total 3**, every span `[980,1043]`, the tail above `finalized` 979. `≤ 1 per kind: true · ≤ 3 total: true`. The plant this criterion names is red 6. |
| 2 | pass | The DOM text of `funds`, `h-changes` and `h-funds` after 7(a) and after 7(b): `byte-equal funds: true · byte-equal changes: true · byte-equal activity: true` — compared as strings in the browser, not by eye. The three texts are carried once in § The browser check. |
| 3 | pass | Step 7(c): the record's `through` 979 against head 1043. `evm_snapshot`; pay Ξ0.55, which lands above `finalized`; load → the page shows `Ξ0.5500` and the record's `through` is **980**, so the log was shown and not kept. `evm_revert`; pay Ξ0.99 in its place; reload → `shows 0.9900: true · shows 0.5500: false`, the replacement painting at block 1044. The plants are reds 5 and 5a. |
| 4 | pass | Step 7(d): 50 fresh records one minute apart plus one visited 31 days ago, written through `page.evaluate` against the open database → 51 records; a load → **count 50**, the 31-day record gone. Then a distribution not among the 50 (the escrow demo, salt 2) → **count 50**, the least recently visited seeded key `0xbeef…0049` gone and the new distribution in the store. `Model.evict` is pinned in `test/model.test.mjs` with four age-and-cap rows rather than the plan's three (§ Deviations 2); the predicted reds are 2, 2a, 3 and 3a. |
| 5 | pass | Step 7(e), `indexedDB` redefined as `undefined` by `page.addInitScript` and confirmed tripping (`typeof self.indexedDB` → `undefined`): two consecutive loads of **11 / 11 / 11, total 33** each, both equal to 7(a), and the three section texts equal to 7(a) on both. The Cache section renders its storage-unavailable line (quoted in § For Denizen) and the control is `<button class="btn off sm" disabled="">clear cache</button>`. |
| 6 | pass | `make dapp-nodev CHAIN_ID=11155111` at the head → `dapp: raw 149619 bytes · gzip 47636 bytes · chain 11155111` and `widget: raw 8132 bytes · budget 10240 · 2108 left`; `wc -c app/dist/widget.js` → **8132**, unchanged. The gzip delta is **+2,259** against the plan's baseline 45377 and **+2,101** against `origin/main` at `1a5a211`, re-measured today at 45535 (§ Deviations 1). |
| 7 | pass | [#227](https://github.com/dnznlabs/rake/pull/227) carries the closing reference: `gh pr view 227 --json closingIssuesReferences` → `#165` and `#221`, so GitHub closes [#165](https://github.com/dnznlabs/rake/issues/165) on merge. The closing comment carrying criterion 1's counts is on #165 as [`issuecomment-6960250350`](https://github.com/dnznlabs/rake/issues/165#issuecomment-6960250350), posted 2026-11-17 20:35:11Z; its text is § For the PR's. The product owner opened the PR and posted the comment, not me (§ Deviations 11). |
| 8 | pass | Step 7(f), one distribution load then a fresh load of `#/docs` so nothing is open behind it: the press leaves `0 distributions cached · about 0 bytes` in the section and `count()` through `page.evaluate` → **0**. The next distribution load → **11 / 11 / 11, total 33**, equal to 7(a). With a distribution page open behind the docs route (reached by hash, so `DS` keeps it) the press issued **33** `eth_getLogs` — the re-read the step asks for — and repainted the same rows AC 2 compares. That re-read writes the record back, which is the case red 7 caught; the section's figure once it lands is AC 9's. |
| 9 | pass | Step 7(g), after exactly **two** loads of one distribution page (7a and 7b), so one record: the section printed `1 distribution cached · about 6621 bytes`; `count()` and the summed `JSON.stringify` length read through `page.evaluate` outside the page gave `{"count":1,"bytes":6621}`. `count matches: true · bytes match: true`. The same comparison after `clear cache` with a distribution page open behind the docs route, waited on the store rather than on a sleep (`count() > 0`, then the section read): store `{"count":1,"bytes":6621}` against a section printing `1 distribution cached · about 6621 bytes` — `count matches: true · bytes match: true · PASS: true`. Red 7 is that case before the fix at `6aae040`. |
| 10 | pass | `devbox run -- node --test test/docs.test.mjs` → `ℹ tests 12 · ℹ pass 12 · ℹ fail 0`, with `:95` asserting `15`, the title at `:88` reworded to "fifteen sections" and one test added, `the Cache section says what is stored, the eviction rule and carries the clear control`. `grep -rniE '\btip\b\|govUrl\|about:\|ownerKind' app/src \| wc -l` → **4**, as the baseline is 4: the same four `ownerKind` reads, which at this head sit at `model.js:95`, `model.js:342`, `index.html:1752` and `index.html:1758` (`:291`, `:1601`, `:1607` before this task's lines pushed them down), and nothing new. The three reference-file tests (`the snapshot struct…`, `every Distribution signature…`, `the factory table…`) are untouched and pass in that run. |
| 11 | pass | At the head: `grep -ic indexeddb app/src/index.html` → **5** (baseline 0); `grep -ic finalized` → **6** (baseline 0); `grep -c eth_getBlockByNumber` → **2** (baseline 1 — the clock's `latest` read and `fin()`'s); `grep -ic '43,200 a day'` → **0** (baseline 1); `grep -ic 'id="s-cache"'` → **1** (baseline 0). That last pattern must keep its quotes: unquoted it reads `0` on the same tree, so re-run it quoted. |
| 12 | pass | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md scripts/ calldata/` → empty, and `git status --porcelain` → empty after `make dapp-nodev CHAIN_ID=11155111`. `node --test test/*.test.mjs` → `ℹ tests 121 · ℹ pass 121 · ℹ fail 0`, above the 102 the plan quotes and above the 109 re-measured at the branch point; the 12 added tests are named in § The tests added. `forge test` → `107 tests passed, 0 failed` in 7 suites, unchanged from `main`. `make fmt` (`forge fmt --check`) exit 0; `forge lint` exit 0 with no finding; `forge snapshot --check` exit 0, run after `forge build --force`, which compiled with 0 `warning[` and 0 `Warning (`. All of those were re-run locally through the pin at the code head. CI green there too: the `push` run [44178425532](https://github.com/dnznlabs/rake/actions/runs/44178425532) `completed success` in 4m10s with all twelve steps green, and the `pull_request` run [44178437816](https://github.com/dnznlabs/rake/actions/runs/44178437816) likewise. Its betterleaks and slither steps ran there rather than locally at this head; both are green in that run. |

## Deviations from the plan

1. **Two of § 0's baselines had moved.** The plan measured them at `6394f16` and this branch is cut at
   `1a5a211`, the #222 merge that carries m04-t11, so the node test count and the ship bundle's gzip
   were both out of date. Both were re-measured at the branch point and carried as the baselines of
   AC 12 and AC 6; nothing else in § 0 had moved.
2. **`Model.evict` is pinned with four age-and-cap rows, not § 1's three.** § 1 predicts that `>=` for
   `>` "does not red the 29-day case, so that row is the 30-days-plus-one-second record, which it does
   red". Measured, it does not: an age of 30 days + 1 s satisfies both `> 30 days` and `>= 30 days`, so
   that row reds under neither comparison and the 29-day row reds under neither either. The only
   record the slip moves is one visited **exactly** 30 days ago, which the plan's three rows do not
   include — the plant was invisible until that row was added (reds 3 and 3a). The row is the plan's
   own rule read literally, "older than `days`": at exactly 30 days a record stays.
3. **A second plant was needed for the cap.** "`evict` with `cap` 51" planted as the *default* `cap`
   passed green, because every cap row named `{ cap: 50 }` explicitly and the defaults row carried two
   records, so neither could see it. The defaults row now drives 51 records with no options at all,
   after which both the default plant and the applied-cap plant red (reds 2 and 2a).
4. **The eviction sweep also runs after a record is written**, not only on open as § 2 says. Decision
   52 rules that the store "holds at most 50"; the dapp's routes change by hash, so a device that
   opens a 51st distribution and never reloads would sit at 51 indefinitely, and § 7(d)'s second half
   would read 51 rather than the 50 it predicts. The open-time sweep is unchanged and is still where
   the age rule bites. Commit `a837fd2`.
5. **The cached record is served only where the read is the tail above it.** § 3 gives one condition,
   `through >= from − 1`. A `load older` pass calls `histLogs` with a `to` *below* `through`, which
   that condition admits and which would have served the record again and appended it to what the page
   already held. The served branch therefore also requires `to == null || to > through`; an older-slice
   read scans live from `from` as it always did and is merged as the older half, which is what lowers
   `first`.
6. **`mergeHist` keeps `ins` only where both halves carry it.** § 1 says "`cached.logs` plus
   `live.final` per kind" without qualification. A provider that refuses the address-less `Transfer`
   query leaves `ins` null, and a half-read list of other tokens cannot be told from a complete one, so
   a merge that treated null as empty would publish a short list as if it were whole. This is the rule
   `older()` already applied to the same query, now applied to the store as well, in `mergeHist` and on
   the served path.
7. **A tail scan that runs out of budget drops the record for that load** and reads the whole range.
   § 3 does not rule this case. Serving the record plus a short tail leaves a hole between them, and
   the group carries one boundary block, which cannot describe a hole — the same reason `logs()` keeps
   a batch only as far as its first refusal. Unreachable on any provider measured (§ The baselines).
8. **Step 7c's plant produces a dropped row, not a ghost, unless the whole boundary moves.** Both were
   planted and both are quoted (reds 5 and 5a): `through = head` alone leaves `splitFinal` cutting at
   `finalized`, so the record claims blocks it does not hold; the ghost the plan predicts needs the cut
   at head as well.
9. **`app/dist` was served by `python3 -m http.server 3200`, not `npx serve`.** `serve` drops the
   query string on its extension redirect, so `?rpc=…&win=100` would have been lost and the check
   would have measured the default window silently. The proof that the page saw `win=100` is in
   § The browser check.
10. **Step 6 says "Base Sepolia"; the comment now says "the Base chains".** Authorised by the architect
    on 2026-11-17 in the dispatching brief, and § The baselines is why: Base mainnet mints at the same
    rate as Base Sepolia, so the narrower wording would have been wrong about mainnet.
11. **The PR was opened by the product owner, not by me.** The brief that dispatched this task reserved
    it — "Do NOT open a PR — report back and I will" — so the branch was handed over at `de3180d`
    instead, and #227 and its closing comment discharge AC 7 (its row). § For the PR keeps the comment's
    text as it was handed over.
12. **`ls .git/hooks | grep -v sample` cannot run in this worktree**, where `.git` is a file rather than
    a directory, so the hook check § 0 prescribes reads nothing here. Run against the repository's
    common git directory instead, where it answers `pre-commit`, `post-commit` — § 0's answer. Both
    hooks ran on every commit on this branch.
13. **The `clear cache` path was fixed after the #227 review**, at `6aae040`: the section is painted a
    second time when the re-read's write-back lands. The plan's § 4 asks for the control to clear the
    store and re-read an open distribution's history, which it did; what it did not say, and what the
    review caught, is that the figures the section prints are read before that write-back and so sat at
    zero over a store holding a record. Red 7 is that state measured; AC 8 and AC 9 carry the case, and
    the browser check gained it (§ The browser check).

## Decisions

- **The check's chain and window**, which § Open questions leaves to the engineer: `?win=100` over a
  chain of about 1,040 blocks — three ETH payments of 0.11, 0.22 and 0.33 and one `setDescription`
  proposal, all inside the first twenty blocks, then `anvil_mine 0x400`. The exact heights move with
  what `make deploy && make fixtures` leaves behind, so the head and boundary each run measured are in
  AC 1 and AC 3 rather than here. That puts the whole shaped history
  far below `finalized` on the first load, so the tail is one window on the second; the counts and
  boundaries it produced are AC 1's and AC 3's. Default anvil, not `--slots-in-an-epoch 1`, because
  step 7(c) needs head − 64: a payment at the head is then above `finalized` by construction.
- **The two numbers of the eviction rule live in one place in the page**, `LOGKEEP = { days: 30, cap: 50 }`,
  which is passed to `Model.evict` and which the Cache section's prose repeats in words. The test added
  for AC 10 pins both the words and the constant, so a change to one that misses the other fails rather
  than shipping a page that misdescribes what it does.

## Discoveries

- **A browser record costs about 6.6 KB of JSON for a short history** — AC 9's figure, for a
  distribution with 2 `Queued` logs, 6 fund logs and no `Transfer` logs. Fifty such records are roughly
  330 KB, and one with a real lifetime of logs would be larger; the Cache section is what makes that
  visible. No quota error was reached in any run, so the quota arm of the guard is untested against a
  real refusal.
- **The 40-window budget is about 27 minutes of either Base chain**, not the week § 0's older
  arithmetic implied: Base mainnet mints at the same 0.2 s as Base Sepolia (§ The baselines), which the
  plan measured but which its § 6 wording did not carry into the page.
- **The tail above `finalized` is thousands of blocks on the Base chains and under a hundred on
  Sepolia** (§ The baselines) — one 10,000-block window on an uncapped provider and well under the
  40-window budget through the strictest endpoint measured, so a cached load prints no partial line on
  any of them.
- **A plant on a default is invisible to a test that passes the value explicitly** (§ Deviations 3), and
  **a boundary row is the only row a `>=`-for-`>` slip can move** (§ Deviations 2). Both are general,
  and both surfaced only by planting the reds the plan named and reading what actually failed instead of
  what was predicted.
- **Red 7's repaint is skipped if `absorb` rejects**, because the `.catch` that guards the chain
  swallows it. `decimalsOf` and `symbolOf` cannot reject — each swallows its own failure and caches
  `null` — but `readFunds` reads balances over RPC, so the path is reachable in principle and would
  leave the section at zero over a populated store again. A `.finally` would close it; the fix is the
  one the review named, and nothing measured here reaches the reject path, so this is left as a note
  rather than widened into a second change.
- `npx serve` drops the query string on its extension redirect (§ Deviations 9). Worth a line in
  `AGENTS.md` § The dapp if another task's browser check depends on a query parameter; not changed here.

## Open questions

None.

## The planted reds

Each was planted once, its failure read, then reverted by path and the suite confirmed green again.
The figures here are the reds' own; the rows above carry the passing measurements.

**1 · `splitFinal` with `<` for `<=`** (AC 1's boundary) — `node --test test/model.test.mjs` →
`ℹ pass 53 · ℹ fail 2`:

```
✖ splitFinal keeps the finalized block itself on the final side
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ 'a', -   'b' ]
      at TestContext.<anonymous> (test/model.test.mjs:521:10)
```

**2 · `evict` with the cap applied one too high** (`fresh.slice(cap + 1)`, AC 4) →
`ℹ pass 53 · ℹ fail 2`: `✖ evict takes the least recently visited one record past the cap, and none at
the cap` and `✖ evict reads the thirty days and the fifty records as its own defaults`.

**2a · `evict` with the *default* cap moved to 51** → `ℹ tests 55 · ℹ pass 55 · ℹ fail 0`. **Green**,
and that green is the hole: every cap row passed `{ cap: 50 }` explicitly and the defaults row carried
two records, so neither could see the plant. After the defaults row was rewritten to drive 51 records
with no options at all, the same plant reds `✖ evict reads the thirty days and the fifty records as its
own defaults` with `+ [] - [['1','0x50']]`. Both readings are recorded because the first one is what
§ Deviations 3 is about.

**3 · `evict` with `>=` for `>` on the age test** (AC 4) — `ℹ pass 54 · ℹ fail 1`:

```
✖ evict drops a record not visited for more than thirty days, and keeps one at twenty-nine
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ [ '1', '0xold' ], +   [ '1', '0xedge' ] ]
      at TestContext.<anonymous> (test/model.test.mjs:553:10)
```

It reds on the record visited **exactly** 30 days ago (`0xedge`), not on the plan's
30-days-plus-one-second record — § Deviations 2.

**3a · the age comparison inverted (`<` for `>`)** → `ℹ pass 52 · ℹ fail 3`, and here the
30-days-plus-one-second row is the one that moves: `+ ['1','0xyoung'] - ['1','0xold']`.

**4 · the Cache section added, the docs test untouched** (step 4's predicted red, AC 10) —
`node --test test/docs.test.mjs` → `ℹ pass 10 · ℹ fail 1`:

```
✖ the rail and the headings are the same fourteen sections, in one order
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  15 !== 14
      at TestContext.<anonymous> (test/docs.test.mjs:95:10)
```

**5 · `through = head`** (step 7c's plant, the record's boundary alone — AC 3) — step 7(c) →
`PASS: false`, but not by the ghost the plan predicts: the record claimed `through` 1051 while
`splitFinal` still cut at `finalized` 987, so the next load's tail scan started at 1052 and **every log
between 988 and 1051 was dropped** — `shows 0.9900: false · shows 0.5500: false`, and the activity list
ended at block 20.

**5a · the whole boundary at head** (`const at = await head()`, so the cut moves too) — step 7(c) →
`shows 0.9900: true · shows 0.5500: true`, `PASS: false`. This is the plan's ghost, measured: the
reverted Ξ0.55 payment at block 1052 stayed at the top of activity and in the record's `funds`
(`[…,20,1052]`) while the chain carried Ξ0.99 at that height.

**6 · a store that never writes `through`** (AC 1's plant) — step 7(a) and 7(b) both
**11 / 11 / 11, total 33**, `≤ 1 per kind: false · ≤ 3 total: false`. The three section texts stayed
byte-equal under this plant, so AC 2 alone cannot catch it; AC 1 is the row that does.

**7 · the Cache section not repainted when the write-back lands** — the #227 review's finding, which
is the code as it stood at `de3180d` rather than a plant, measured by running the new case against that
build before fixing it (AC 8, AC 9):

```
store after the write-back: {"count":1,"bytes":6621}
section after the write-back: 0 distributions cached · about 0 bytesclear cache
count matches: false · bytes match: false
PASS: false
```

The press's own repaint is right at the instant it runs; what was missing is the second one, after the
re-read it starts puts the record back. The same case at `6aae040` is AC 9's figure. It is the only
criterion whose check needed adding after the review, and the only code change at that commit.

## The browser check

The three section texts AC 2 compares, read at step 7(a) and byte-equal after 7(b). The chain is
§ Decisions' and the distribution is the seed one,
`0x9b407e3c98fdb820203275919A90A056275e1e37` on anvil 31337.

- `funds` — `ETHwaiting to distributeΞ1.6600distribute0x68B1…1aedwaiting to distribute · 40000000000000000000 raw held in escrow0 rawdistributeescrowed · 0x68B1…1aed0x7099…79C8 — the push failed, so this share waits here40000000000000000000 rawreleaseanyone can call distribute() — the contract splits by the table above; you pay the gas.Paying in from a contract with .transfer() or .send() can fail when the implementation is cold: the 2,300-gas stipend does not cover a clone's delegatecall to a cold implementation. Pay in with call and gas.`
- `h-changes` — `queuedsetDescription · new name · DNZN fees - revised · nonce 2 · 6d 23hblock 19 · 0xee47…cd45queuedsetBeneficiaries · new table · 40% / 60% · nonce 1 · 6d 23hblock 4 · 0xb0db…705d`
- `h-funds` — `inΞ0.3300 from 0xf39F…2266block 18 · 0xbdc7…efaeinΞ0.2200 from 0xf39F…2266block 17 · 0xe029…21c4inΞ0.1100 from 0xf39F…2266block 16 · 0x2f56…2115distributed100000000000000000000 raw 0x68B1…1aed by the tableblock 15 · 0x4ccf…4014escrowed40000000000000000000 raw 0x68B1…1aed · 0x7099…79C8block 15 · 0x4ccf…4014inΞ1.0000 from 0xf39F…2266block 4 · 0xdf97…aa8c`

`page errors: none` in all six browser contexts the check opens, as t01's check recorded it. The record
behind these rows reads `chainId 31337 · first 1 · schema 1 · changes 2 · funds 6 · ins 0`, its boundary
being AC 1's.
The check was run twice at this head — once for the `clear cache` case alone, to plant and then clear
red 7, and once end to end — with the same result on every row.

**That the page read `?win=100` was confirmed against the build under test** rather than inferred:
`WINDOW_START` read through `page.evaluate` is `100`, `MAX_WINDOWS` is `40` and `WINDOW_INFLIGHT` `4`,
neither retuned (§ Out of scope), and every window span in `__LOGREQ` is 100 blocks wide (AC 1). The
same read against the **ship** bundle answers `10000`, so the `/*DEV*/` fences hold and `?win=` reaches
nothing that ships. That reading cost a cycle on both runs, the same way each time: AC 6's
`make dapp-nodev` leaves the ship bundle in `app/dist`, and the ship bundle ignores `?win=` and `?rpc=`
by design, so a proof taken after it answers `10000` and means only that the wrong artifact was under
the browser. `make dapp` is rebuilt before the proof is read, and the `__LOGREQ` counter's presence in
`app/dist/index.html` is what tells the two bundles apart.

## The baselines, re-measured

§ 0's readings that no criterion above carries, re-run rather than quoted, at `1a5a211` (`origin/main`,
the #222 merge) on 2026-11-17 between 19:42 and 19:44 UTC through `devbox run --` (node `v24.12.0`,
forge and cast `1.7.1`, anvil `1.7.1-dev`). The two that had moved since the plan measured them are
AC 6's and AC 12's baselines (§ Deviations 1).

| § 0 reading | at `1a5a211` |
|:---|:---|
| `grep -c __LOGREQ app/dist/index.html`, nodev / dev | 0 / 2 |
| `grep -c eth_blockNumber app/src/index.html` | 1 |
| `test/docs.test.mjs:95` | `14` |

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

None refused the tag, so `fin()`'s fallback comment names no provider. Through `sepolia.base.org`'s
200-block cap, 5,728 blocks is **29** windows — under the 40 budget.

**Block time on the Base chains**, re-measured 2026-11-17 19:43 UTC with § 0's command,
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
chains**, so a 200-block window is 40 s of chain and the 40-window budget is 8,000 blocks. That is what
step 6's comment now says, and why it says **Base chains** (§ Deviations 10).

## The tests added

The twelve AC 12 counts. In `test/model.test.mjs`: three for `splitFinal` (the boundary, the split,
empty input), four for `evict` (the age rows, the cap at 50 and 51, the defaults driven at the counts
that make them bite, the empty store) and four for `mergeHist` (the per-kind merge with `through` and
`first`, the older slice lowering `first`, the first load of a device, the other-token list kept only
where both halves carry it). In `test/docs.test.mjs`: one for the Cache section's shape, which also
pins `LOGKEEP` (§ Decisions).

## For Denizen

Decision 17 gives you the docs page's text, and the Cache section's prose is a draft, as m02-t04's was.
Two paragraphs, before `For developers`. The structural checks run against whatever you write — what
the test pins is the heading, the words `30 days` and `at most 50`, the `clear cache` button and the
slot the count is painted into, not the sentences:

> This page keeps a copy of each distribution's event history in this browser, so that opening the
> same distribution a second time reads only the blocks the chain has added since. What is kept is
> public chain data: the events the chain has already published, and only those in blocks it has
> undertaken not to replace. No account state is stored, nothing a wallet signed, and nothing is sent
> anywhere — the copy stays on this device and is read by nothing but this page.
>
> A distribution not opened for 30 days is dropped, and this browser keeps at most 50 of them, the
> least recently opened going first. Clearing the cache costs nothing but the next read: everything in
> it is on chain, and the page reads it again.

Below them the page prints one line it reads from the store, in the shape AC 9 quotes, with the
`clear cache` button beside it. Where a browser has no storage that line reads `Storage is unavailable
in this browser, so nothing is cached here and every load reads the chain in full.` and the button is
disabled (AC 5).

## For the PR

#165's closing comment as it was handed over, and as it stands on the issue (AC 7). It carries AC 1's
counts in full because it is published outside this handoff, where a reference to a row would mean
nothing; the chain length it names is the first run's, the run it was written from:

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
