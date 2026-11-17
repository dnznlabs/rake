# m04-t12 — The finalized-log cache

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, a distribution page opened for the second time on the same device re-reads only
the blocks that were not final when it was last opened: the event history the three sections are
built from sits in an IndexedDB store per chain and distribution, complete up to the `finalized`
block of the last visit, and the live scan covers the tail above it — one `eth_getLogs` per kind on
an uncapped provider instead of the 40-per-kind ceiling every load pays today once the factory is
older than the window budget (decision 52). The `#/docs` page gains a Cache section that says what
is stored, how much, and how it is evicted, with a `clear cache` control. `app/`, `test/*.mjs` only;
nothing under `src/`, and the testnets' on-chain document is not re-uploaded by this task.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`,
forge `1.7.1`; `anvil` is `1.7.1-dev`). Branch `m04/t12-log-cache` from `origin/main` at or after
`6394f16`; if [#214](https://github.com/dnznlabs/rake/pull/214) (m04-t10) has merged, at or after
that merge, so the runbook the handoff points the next upload at is the two-entry-point one.
**Order, set by the architect on [#215](https://github.com/dnznlabs/rake/issues/215#issuecomment-6955504049)
(2026-11-17): m04-t11 → m04-t12 → the m04-t10 upload step
([#212](https://github.com/dnznlabs/rake/issues/212), [#214](https://github.com/dnznlabs/rake/pull/214)),
so one signing round carries both `app/` changes.** m04-t11 is the history-read robustness task
scoped from [#215](https://github.com/dnznlabs/rake/issues/215) (classify MetaMask's rewrite of an
HTTP 413 range refusal so the scan halves instead of throwing; gate `apply` on `snapshot().pending`
rather than on the history read). This task starts after m04-t11 merges: step 3's wrapper around
`logs()` and `histLogs()` sits on top of t11's classifier change, and a branch cut before that merge
rebases onto it before the PR opens. The one fact to carry with the order: #214's own upload executed
on both testnets on 2026-11-17 (its PR body, nonces 6–8), so the upload step that carries both
changes is the next Run B that runbook defines, not a re-run of #214's. Check
hooks with `ls .git/hooks | grep -v sample` → `pre-commit`, `post-commit`. Line numbers below are
`app/src/index.html`, `app/src/model.js` and `test/docs.test.mjs` at `6394f16`; trust names over
numbers. Never `devbox run -- bash -c` with a pipe; write a script. The browser check runs as
m04-t01's did ([HANDOFF.md](../m04-t01/HANDOFF.md) § The browser check): `playwright-core` outside
the repo driving the cached chromium `AGENTS.md` § The dapp names, against the dev build (`make dapp`),
which is the build that keeps the `/*DEV*/` fences — the per-kind counter lives inside them.

0. **Baselines**, recorded in the handoff with the date and re-run rather than quoted. Measured on
   `main` at `6394f16`, 2026-11-17:
   - `node --test test/*.test.mjs` → `ℹ tests 102 · ℹ pass 102 · ℹ fail 0`.
   - `make dapp-nodev CHAIN_ID=11155111` (the Sepolia broadcast log is tracked, so this builds
     without a dev chain) → `dapp: raw 142989 bytes · gzip 45377 bytes · chain 11155111` and
     `widget: raw 8132 bytes · budget 10240 · 2108 left`; `wc -c app/dist/widget.js` → `8132`.
     `grep -c __LOGREQ app/dist/index.html` → `0` on that build and `2` after `make dapp
     CHAIN_ID=11155111`: the counter ships in the dev build only.
   - `grep -ic indexeddb app/src/index.html` → `0`; `grep -ic finalized app/src/index.html` → `0`;
     `grep -c eth_getBlockByNumber app/src/index.html` → `1` (`:334`, the clock's `latest` read);
     `grep -c eth_blockNumber app/src/index.html` → `1` (`:210`, `head()`); `grep -ic '43,200 a day'
     app/src/index.html` → `1` (`:191`); `grep -ic 'id="s-cache"' app/src/index.html` → `0`.
   - `grep -rniE '\btip\b|govUrl|about:|ownerKind' app/src | wc -l` → `4`, all four `ownerKind`
     (`model.js:95`, `:241`, `index.html:1576`, `:1582`) — M02 criterion 9's grep no longer prints
     nothing on `main`; the name came back with the owner-kind read, and this task's criterion 10
     holds the count at four rather than at zero.
   - `test/docs.test.mjs:95` pins **fourteen** sections (`assert.equal(sections.length, 14)`), and
     `:88` names them so in the test title.
   - The `finalized` tag, rehearsed on anvil `1.7.1-dev` on a spare port, 2026-11-17, with
     `cast rpc eth_getBlockByNumber '"finalized"' false --rpc-url http://127.0.0.1:<port>`:
     after `anvil_mine 0x14` (a 40-block chain) the answer's `number` is **`0x0`** — genesis, with
     `parentHash` all zeros; after `anvil_mine 0x64` (100 blocks) it is
     `{"number":"0x24","hash":"0xfe9168f83fb59965a6d2db172fa5f843033e18a1a8b3e0da08a673409de301f8"}`,
     with `safe` at `0x44` and `latest` at `0x64`. So on a default anvil `finalized` is **head − 64**
     (two 32-slot epochs), floored at genesis; with `anvil --slots-in-an-epoch 1` a 100-block chain
     answers `finalized` `0x62`, `safe` `0x63`. A misspelt tag (`"finalised"`) is refused with
     `error code -32602: hex string without 0x prefix`. The public endpoints answer the tag too (read
     2026-11-17 ~17:10 UTC, one sample each, re-run rather than quote): `sepolia.base.org` finalized
     `0x3947a09` against latest `0x394936d` (6,500 blocks behind); `mainnet.base.org` finalized
     `0x3800861` against head `58726788` (4,387 behind); publicnode Sepolia finalized `0xb97b56`
     against latest `0xb97ba7` (81 behind). Re-read 2026-11-17 ~17:33 UTC on
     `base-sepolia-rpc.publicnode.com`: finalized `60068021` (ts `1794935473`) against latest
     `60074519` (ts `1794936772`), 6,498 blocks and 1,299 s — about 22 minutes — behind, so the
     live tail fits one 10,000-block window on an uncapped provider.
   - **Base Sepolia mints a block every 0.20 s today, not every 2 s.** Measured 2026-11-17 twice:
     `cast block <n> --field timestamp` on `sepolia.base.org` (blocks 60058588 → 60068588: 2,000 s
     for 10,000 blocks), and the factory block against head on `base-sepolia-rpc.publicnode.com`
     (factory `56161390` ts `1794154146`, head `60074519` ts `1794936772`: 3,913,129 blocks in
     782,626 s = 0.200 s per block). At that rate the 40-window budget, 400,000 blocks at
     `WINDOW_START`, spans 80,000 s — **about 22 hours** of factory age — so the first load of any
     distribution more than a day old is already partial there, and the factory is 9.06 days back.
     **Base mainnet, measured separately** the same day on `mainnet.base.org`, two samples: blocks
     58716788 → 58726788 in 2,000 s, and (re-read ~17:34 UTC) `58630082` ts `1794916392` →
     `58730082` ts `1794936392`, 100,000 blocks in 20,000 s — 0.200 s per block. So the 40-window
     budget is about 22 hours of history on Base mainnet as well, and a distribution's first load is
     partial after its first day there too; re-run before quoting. `index.html:191`'s comment and the m04-t01 handoff's arithmetic assume
     2 s. Step 6 corrects the comment.

1. **The pure parts, in `model.js`, tested under node.** Three functions beside `windows` (`:201`),
   exported from the object at `:241`:
   - `splitFinal(logs, finalized)` → `{ final, tail }`: the logs whose `blockNumber` (hex) is
     `<= finalized` and the rest. The boundary is inclusive on the final side — a log *in* the
     finalized block is final.
   - `evict(records, now, { days: 30, cap: 50 })` → the keys to delete: every record whose `visited`
     is older than `days` of milliseconds, then, of what remains, the least recently visited beyond
     `cap`. Pure over `[{ key, visited }]`; the store code applies it.
   - `mergeHist(cached, live)` → the record a load writes back: `cached.logs` plus `live.final`
     per kind, `through` the finalized block of this load, `first` the lower of the two.
     `load older` uses the same function with the older slice as `live` and lowers `first`.

   Check: `test/model.test.mjs` gains `splitFinal` (a log at the finalized block is final; one above
   is tail; empty input), `evict` (a record visited 30 days + 1 s ago goes, one at 29 days stays; 51
   fresh records lose exactly the least recently visited one; 50 lose none), `mergeHist` (kinds merge,
   `through` and `first` move the right way). Predicted reds, each planted once and the red quoted
   in the handoff: `splitFinal` with `<` for `<=` reds the at-the-boundary case; `evict` with `cap`
   51 reds the 51-record case; `evict` with `>=` for `>` on the age test does **not** red the 29-day
   case, so that row is the 30-days-plus-one-second record, which it does red.

2. **The store, in `index.html`, under the same guard shape as `store` (`:372-373`).** One
   IndexedDB database, `rake.logs`, whose version number *is* the schema version (`SCHEMA = 1`): the
   `onupgradeneeded` handler deletes and recreates the single object store `logs` with
   `keyPath: ['chainId', 'address']`, so a decoder change bumps `SCHEMA`, opens clean and drops the
   old shapes in one step. The value is `{ schema, chainId, address, first, through, changes, funds,
   ins, visited }` — the three raw log arrays `histLogs` (`:591`) returns today, so nothing above it
   changes shape; `visited` is `Date.now()` at the last read. Every call is wrapped so that a missing
   `indexedDB`, a refused open (private mode, a sandboxed frame) or a quota error resolves to `null`
   and the page behaves exactly as it does today — the same contract `store.get` keeps for
   `localStorage`. **On open**, before the first history read: `getAll()`, `Model.evict(...)`, delete
   the keys it names. No library.

3. **The read path, wrapping `logs()` and `histLogs()` (`:235`, `:591`) and nothing above them.**
   The wrapper goes around the `logs()` that m04-t11 leaves behind — its 413 classifier changes what
   `logs()` throws and how the window halves — so this step is written against `main` after t11
   merges, and a branch that predates it rebases first; the line numbers here are `6394f16`'s and
   move with t11. Per page load, beside `head()` (`:210`): `fin()` reads `eth_getBlockByNumber ['finalized', false]`
   once and keeps `parseInt(number, 16)`; if the request throws, `fin()` returns `head − 1000` and
   the fallback carries a comment saying which providers refused the tag and when it was last seen
   (none measured here; the two public testnet endpoints and Base mainnet all answer it, step 0). In
   `histLogs(addr, from, to)`: read the record; if one exists with `through >= from − 1`, scan only
   `through + 1 .. to` live and serve `[first, through]` from it; else scan as today. Then
   `splitFinal` each kind against `fin()`, `mergeHist`, write the record back with `visited` now.
   The tail above `finalized` is never written: on Base that tail is a few thousand blocks today
   (step 0), one 10,000-block window per kind on an uncapped provider, 22–33 windows per kind through
   `sepolia.base.org`'s 200 cap — under the 40 budget, so a cached load there has no partial line.
   The first load on a device is unchanged: the full walk from `FIRST.get(addr) || CFG.factoryBlock`
   (`:1146`), whose complete range becomes `[first, through]`, so the factory-block fallback is paid
   once per device. `older()` (`:1186`) appends its slice and lowers `first`; `partial` keeps its
   meaning (the boundary of the whole group) and a partial first load writes `first` at that boundary.

   On anvil nothing is final for 64 blocks (step 0), so the dev chain the check runs on is mined
   past its logs before the first load, or started with `--slots-in-an-epoch 1`.

   Check: the browser check of step 7; `grep -ic finalized app/src/index.html` ≥ 1.

4. **The Cache section on `#/docs`.** A fifteenth entry in `SECTIONS` (`:1787`), `['cache',
   'Cache']`, placed before `['developers', 'For developers']`, and the matching `<h2 id="s-cache">`
   in `docs()` (`:1850`) before `s-developers` (`:1932`). It states, in the page's register: what is
   stored (finalized event logs per chain and distribution — public chain data, no account state,
   nothing a wallet signed), the record count and approximate bytes now (`count()` and the summed
   `JSON.stringify` length of the records, labelled approximate), the eviction rule (not opened in
   30 days, or beyond 50 records, least recently opened first), and a `clear cache` button —
   `class="btn sm"` — that deletes every record and, if a distribution page is open, re-reads its
   history. With storage unavailable the section says so in one line and the button is
   `class="btn off sm" disabled`, the shape `:804` and `:912` already use. Reuse `btn`, `ledger`,
   `doc`, `status`; no inline style; any new class goes into `theme.css`. Bind the button the way
   `giveBind` binds `#give-go`. **The section's prose is a draft**: decision 17 gives Denizen the
   docs page's final text, the same way m02-t04's text was a draft he rewrote; the handoff § For
   Denizen says so and quotes the paragraph, and the structural checks (criterion 10) run against
   whatever he writes.

   Check: `test/docs.test.mjs:95` → `15`, the title at `:88` reworded, and one new test pinning the
   Cache section's shape (the `s-cache` heading, a `clear cache` button, the words `30 days` and
   `50`). Predicted red: adding the section without the test change reds `:95` with
   `15 !== 14` — plant it by running the suite before editing the test, quote the red.

5. **Storage-unavailable, end to end.** The one guard of step 2 is what every path reads: history
   as today, the Cache section's one line, the `off` button. Driven in the browser check with an
   init script that redefines `indexedDB` as `undefined` before the page's scripts run
   (`page.addInitScript`), which is a check the engineer confirms trips — the section must read
   unavailable before the counts are compared.

6. **The comment at `:191`** says Base Sepolia mints a block every 2 s, 43,200 a day. Rewrite it to
   what step 0 measured, with the date: 0.2 s, 432,000 a day, so a 200-block window is 40 s of chain
   and the 40-window budget is 27 minutes of Base Sepolia through that endpoint. Check: `grep -ic
   '43,200 a day' app/src/index.html` → `0`.

7. **The browser check**, against a dev stack on spare ports as t01 ran it (`ANVIL_PORT=8745
   APP_PORT=3200 make deploy && make fixtures`, `make dapp`, serve `app/dist`). Shape the chain so
   the budget is visible: a few payments and one queued change against the seed distribution at
   known blocks, then `anvil_mine 0x400` (1,024 blocks), and open the page with `?rpc=…&win=100`
   (`:204`) so the first load is about 11 windows per kind (counted: 1,024 ÷ 100, newest-first). Read
   `self.__LOGREQ` (`:46`, pushed at `:224` inside `window1`) grouped by `kind` after each load.
   Record, in this order:
   - (a) first load, store empty: the per-kind counts (the baseline for criteria 1 and 8), and the
     DOM text of the three sections t01's check read (`funds`, `h-changes`, `h-funds`);
   - (b) reload: ≤ 1 per kind, 3 total, and the same three texts, byte-equal to (a);
   - (c) `evm_snapshot`; send a payment of one amount (its `Received` log lands within 64 blocks of
     head, so above `finalized`); load; `evm_revert`; send a payment of a *different* amount; reload:
     activity shows the second amount and not the first. The plant that reds this is persisting
     `through = head` instead of `through = finalized`;
   - (d) eviction: seed 50 records with fresh `visited` and one at `now − 31 d` through
     `page.evaluate` against the open database; load the docs page; count → 50 and the old key gone.
     Then open a distribution not among the 50: count → 50 and the least recently visited of the
     seeded keys gone;
   - (e) with `indexedDB` undefined (step 5): the Cache section reads unavailable, the button is
     `btn off`, and the per-kind counts on two consecutive loads both equal (a);
   - (f) `clear cache` on the docs page: count → 0 and bytes → 0 in the section; the next
     distribution load's counts equal (a); with a distribution page open behind the docs route, its
     history re-paints;
   - (g) the Cache section after (a) and (b): the count it prints equals `count()` read through
     `page.evaluate`, and the bytes figure equals the same sum computed there.
   `page errors: none` in every run, as t01 recorded.

8. **`HANDOFF.md`** beside this file: the AC table with the figures, the three planted reds quoted,
   § For Denizen with the Cache section's draft paragraph, the dapp gzip delta, § Discoveries for
   anything the store taught (quota, a provider's `finalized` shape, the real tail on a testnet
   through MetaMask if one was reached).

## Acceptance criteria

Every figure is read at the review head, not quoted from here. Baselines are step 0's, re-run.

1. **Second load, three requests.** In the browser check (step 7b) `self.__LOGREQ` grouped by `kind`
   shows ≤ 1 per kind and ≤ 3 in total; the first load (7a) shows the count step 0's arithmetic
   predicts for the chain shape (about 11 per kind at `?win=100` over 1,024 blocks), recorded as the
   baseline. The plant that reds the second-load count is a store that never writes (`through`
   unset): both loads then equal (a).
2. **Identical rows.** The DOM text of `funds`, `h-changes` and `h-funds` after (a) and after (b) is
   byte-equal; the handoff carries the three texts once and says the comparison was made.
3. **Reorg above `finalized`.** Step 7c: the page shows the second payment's amount and not the
   first after `evm_revert`. The plant: `through = head`.
4. **Eviction.** Step 7d: a record with `visited` older than 30 days is gone after open; a 51st
   record evicts the least recently visited; `Model.evict` is pinned in `test/model.test.mjs` with
   the three rows step 1 names, and the two planted reds (cap 51; the 30-days-plus-one-second row
   with the comparison flipped) are quoted.
5. **Blocked storage is today's page.** Step 7e: per-kind counts on two consecutive loads equal
   (a), the three section texts equal (a), the Cache section reads unavailable, the button is
   `btn off`.
6. **Bytes.** `make dapp-nodev CHAIN_ID=11155111` → `wc -c app/dist/widget.js` → `8132`, unchanged;
   the `dapp:` line's `gzip` figure recorded beside the baseline `45377` as a signed delta.
7. **#165 closes against the figure.** The PR closes
   [#165](https://github.com/dnznlabs/rake/issues/165) with criterion 1's measured counts in the
   closing comment — or, if the number says otherwise, re-scopes it in one line and does not close it.
8. **`clear cache`.** Step 7f: `count()` → 0 after the press; the next distribution load's per-kind
   counts equal (a).
9. **The section is honest about the store.** Step 7g: the record count the Cache section prints
   equals `count()`, and its bytes figure equals the sum computed the same way outside the page,
   after a known number of loads (the handoff says how many).
10. **The docs page's checks still pass.** `node --test test/docs.test.mjs` passes with `:95` at
    `15` and the Cache-section test added; `grep -rniE '\btip\b|govUrl|about:|ownerKind' app/src |
    wc -l` → `4`, the same four `ownerKind` lines as step 0 and nothing new (M02 criterion 9, with
    its baseline stated); the reference-file tests in the same file (`the snapshot struct…`, `every
    Distribution signature…`, `the factory table…`) are untouched and pass.
11. **Greps.** `grep -ic indexeddb app/src/index.html` ≥ 1 (baseline 0); `grep -ic finalized
    app/src/index.html` ≥ 1 (baseline 0); `grep -c eth_getBlockByNumber app/src/index.html` → `2`
    (baseline 1: the clock's read and the new `finalized` read); `grep -ic '43,200 a day'
    app/src/index.html` → `0` (baseline 1); `grep -ic 'id="s-cache"' app/src/index.html` → `1`
    (baseline 0).
12. **Nothing else moved.** `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot RUNBOOK.md
    scripts/ calldata/` empty; `node --test test/*.test.mjs` passes with more than 102 tests and the
    handoff names the added ones; `forge test` count unchanged from `main` and stated; `make fmt`,
    `forge lint` and CI pass at the head; `git status --porcelain` empty after `make dapp-nodev
    CHAIN_ID=11155111`.

## Out of scope

- The landing's and the `mine` view's lists: `loadDistro` reads at `latest`, and the `Created` scan
  (`:1736`) is a factory-wide query with its own budget. A second task if the counts say so.
- A 30-day display window over the history. The sections render the whole record; the matching of
  `Applied` to `Queued`, the recognised-token list and the escrow rows are derived from the whole
  lifetime and a trimmed view would break them silently.
- Any contract change, including a `createdBlock` on the clone (decision 52's rejected option 3).
- `MAX_WINDOWS`, `WINDOW_START`, `WINDOW_INFLIGHT`: #165 closes against criterion 1's figure, not
  by retuning them.
- The upload. The testnets keep the m04-t10 document until the next Run B (`RUNBOOK.md` § Which run
  is this, once #214 merges), which this task's handoff hands the hashes to and which carries m04-t05's
  findings in the same upload; M05's mainnet document is built from a tree that includes this.
- Generalising the store to the shared dapp template or to the other projects that scan logs.
- The `#/docs` page's voice beyond the Cache section's draft (decision 17).

## Open questions

None. Decision 52 rules the shape, the 30 days and the 50 records; the check's `?win=` and chain
length are the engineer's, recorded in the handoff with the counts they produced.

## Context

- `ROADMAP.md` decision 52 (the ruling, the two rejected options and the arithmetic), decision 17
  (the docs page's voice), decision 45 (the Disclaimer stays first).
- [#165](https://github.com/dnznlabs/rake/issues/165), the window-budget consequence this closes;
  [#76](https://github.com/dnznlabs/rake/issues/76) and [m04-t01's HANDOFF.md](../m04-t01/HANDOFF.md)
  § The browser check, § Decisions (`MAX_WINDOWS`) and § The provider caps the constants rest on.
- [#215](https://github.com/dnznlabs/rake/issues/215), the task before this one (m04-t11): the
  classifier change under `logs()` this task's wrapper rebases onto.
- [m04-t10 TASK.md](../m04-t10/TASK.md), [#212](https://github.com/dnznlabs/rake/issues/212) and
  [#214](https://github.com/dnznlabs/rake/pull/214): the document now on the testnets and the Run B
  this task's bundle later follows, after t11 and this task.
- `AGENTS.md` § The dapp: the launcher the browser check uses and the `/*DEV*/` fence rule.
