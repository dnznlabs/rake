# m04-t01 — handoff

PR: pending · Branch: `m04/t01-dapp` · 2026-11-07

Step 5 went first, as the plan instructed, and inverted the paragraph it was testing: on this host the
cached Playwright chromium launches and the nix one does not exist, so every browser check below ran
through the cached arm64 build. Then `logs()` became a newest-first walk in windows — three pure
helpers in `model.js`, a thin adaptive caller in `index.html`, a `partial` boundary and a `load older`
that re-decodes over the union — proved against a provider that refuses anything wider than 200
blocks the way `sepolia.base.org` does. The `Expired`-before-boot throw, the widget's clock note and
hour of skew tolerance, and the Limits sentence are each one small change with its own test. Step 6
is the one that did not survive contact: the plan's assertion, applied to every broadcast log read,
makes the documented `make fixtures` step fatal to the next `make dapp`, because `Fixtures.s.sol`
creates four mocks in one broadcast. It now withholds the block it cannot trust instead of refusing
the log, and refuses only when a withheld block is actually demanded — see § Deviations.

Baselines (step 0) matched the plan exactly: `node --test` **67**, `wc -c app/dist/widget.js`
**8,043** of 10,240, `forge test` **91**.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` empty; `forge test` 91 | pass | diff prints nothing. `forge build --force && forge test` → `Ran 5 test suites in 297.07ms (618.46ms CPU time): 91 tests passed, 0 failed, 0 skipped (91 total tests)` |
| `node --test test/*.test.mjs` passes with more tests than 67, handoff names the added tests | pass | `ℹ tests 90 · ℹ pass 90 · ℹ fail 0` — **67 → 90, +23**. Per file: `model.test.mjs` 25→35, `widget.test.mjs` 10→12, `docs.test.mjs` 8→9, `build.test.mjs` new 10. Added tests listed below this table. |
| `grep -c 'rebasing or slashable' app/src/index.html` → 1 | pass | `1` |
| `grep -c "device's clock" app/src/widget.js` → 1 | pass | `1` (needed `CLOCKNOTE` to be double-quoted — a `\'` parses the same and greps as nothing) |
| `grep -c 'rake#140' app/build.mjs` → 1 | pass | `1` |
| `make dapp-nodev` → `wc -c app/dist/widget.js` ≤ 10,240, figure recorded | pass | `widget: raw 8132 bytes · budget 10240 · 2108 left`; `wc -c` → **8132**. Dapp `raw 138584 · gzip 43844`. |
| `git status --porcelain` empty after it | pass | prints nothing |
| Browser check of step 7 recorded | pass | § The browser check, below — four views, `page errors: none` |
| The forced-cap run shows ≤ 40 requests per log kind | pass | **40 windows attempted per kind, 39 on the wire** (the 41st never exists; the one wide probe is refused before it leaves the page). Three kinds: `topic-set(4)` 40, `topic-set(5)` 40, `Transfer` 40. |
| …and the partial line with a working `load older` | pass | `"history before block 1211 not loaded · load older"` on all three of `funds`, `h-changes`, `h-funds`; one click → boundary gone, `0 → 2` change rows, 7 requests per kind |
| `AGENTS.md`'s chromium paragraph is dated 2026-11 and names the launcher used for step 7 | pass | dated `2026-11-07`, names `~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome` and says it **launches** |
| PR closes #76, #110, #140, #148, #149 | pending | PR not opened — the product owner opens it after verifying the branch |

**The added tests, by name.** `model.test.mjs` (+10): `windows` × 6 — tiling, the inclusive boundary
with no gap or overlap, every block covered exactly once, a range smaller than one window, hex input,
and the two empty cases (`from > to`, `size 0`); `rangeCap` × 3 — the three verbatim provider strings
plus one non-match, a wallet-wrapped error, and six strings with no window in them; `isPruned` × 1.
The `Expired`-without-`grace` rows (`null` and `undefined`) joined the existing `revertMessage` table
rather than adding a test. `widget.test.mjs` (+2): the hour-past and 30-minutes-past cases, and the
clock note's single unescaped occurrence. `docs.test.mjs` (+1): the Limits sentence, scoped to the
Limits section. `build.test.mjs` (new, 10): the two-creation fixture throwing, the receipt-count
mismatch, the one-creation fixture giving up its block, the no-creation exemption, a receipt with no
block, `CREATE2` vs a call, the ambiguous-log withhold, `Fixtures.s.sol`'s four mocks, the
`build.mjs` wiring, and every `_BLOCK` token the sources ask for being offered by a pairable log.

## The one thing measured without a prior — step 5's two launchers

Both run on this host today, 2026-11-07, from `/tmp/m04t01/pw` (outside the repo) through
`playwright-core` 1.63.0 at `/home/openclaw/src/deadletter/node_modules/playwright-core`:

| launcher | result |
|:---|:---|
| nix chromium, `ls -d /nix/store/*-chromium-1*/bin` | **glob matched 0 derivations.** `ls -d /nix/store/*chromium*` → 0 hits; `find /nix/store -maxdepth 3 -name chromium -type f` → nothing; no `chromium` on `PATH`. Never launched: there is no such file. |
| cached Playwright chromium, `~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome` | **LAUNCHED** · chromium `153.0.8010.12` · page content set and its DOM read back · 786 ms |
| `playwright-core`'s own resolution, no `executablePath` | **LAUNCHED** · same build, 382 ms |

So the paragraph was backwards and m03-t03's experience was the correct one. The cached install is
the `arm64` build and carries `DEPENDENCIES_VALIDATED`; the `libnspr4.so` failure the paragraph
blamed on it belongs to the `chrome-linux` (x86) directory, which this install does not have. The
rewritten paragraph says which launcher works, carries the date, and tells the next reader to
re-measure if the host's nix profile changes.

## The provider caps the constants rest on

The plan's table is the architect's measurement. I re-measured it live today, because `rangeCap` is
pinned to two verbatim strings and a reworded refusal would make the parser silently useless. **Both
strings confirmed.** The command shape is `RUNBOOK.md`'s, with the address — and the address matters:
without one, publicnode refuses outright.

| endpoint | span | answer, verbatim |
|:---|--:|:---|
| `ethereum-sepolia-rpc.publicnode.com` | 200 | accepted |
| | 50,000 | `error code 4444: pruned history unavailable` |
| | 50,001 | `error code -32002: request timed out` |
| | 200,000 | `error code -32701: exceed maximum block range: 50000` |
| `ethereum-sepolia.publicnode.com` | 200 | accepted |
| | 50,000 / 50,001 | `error code 4444: pruned history unavailable` |
| | 200,000 | `error code -32701: exceed maximum block range: 50000` |
| `sepolia.base.org` | 200, **201** | accepted |
| | 202, 500 | HTTP 413, `{"code":-32614,"message":"eth_getLogs is limited to a 200 range"}` |

**MetaMask's own Sepolia and Base Sepolia RPCs were not measured** — see § Deviations.

## The browser check

Driven by `playwright-core` with the launcher step 5 established, against the dev stack
(`ANVIL_PORT=8745`, `APP_PORT=3200`, `make deploy && make fixtures`, `serve app/dist`). The chain was
shaped for the check: a `setDescription` queued through `propose()` at block 9, then
`evm_increaseTime 1821600` (21 d 2 h) to carry it past `eta + GRACE`, then `anvil_mine 0x2328` to a
head of 9,010 so the window budget would actually bite. `page errors: none` in every run.

**Step 7 (a) the distribution page** — heading `DNZN fees`, all three section headings
`funds · changes · activity`, and all three painted with rows: changes carried
`queued setDescription · new name · DNZN fees — revised · nonce 2 … block 9`, activity carried the
`distributed` and `escrowed` rows, funds carried the ETH row and the escrow row.

**Step 7 (b) the pending view with an expired entry** — two expired entries, two `.status.bad`:
`expired · anyone may cancel … this change expired on 2026-11-28 20:13 UTC — it can no longer be
applied`.

**Step 7 (c) the widget's queued line with its title** — `title="judged by this device's clock"` on
every run. The text is the live demonstration of #149: with the chain's clock 21 days ahead of the
device's, the dapp says **expired** on the same action the widget reads as `lands in 6d 23h`, and the
title is what explains the disagreement. The tolerance driven in the browser by moving `Date.now`
while leaving the chain alone:

| device clock, relative to `eta + GRACE` | widget's queued line |
|:---|:---|
| as-is (21 d behind the chain) | `a change is queued · lands in 6d 23h` |
| 30 minutes past | `a change is queued · ready to apply` |
| 2 hours past | `a change is queued · expired` |

**Step 7 (d) the Limits page** — nine paragraphs, the third being the new sentence verbatim.

**Step 1, the capped run.** `?cap=200` makes the dev provider answer the verbatim `-32614` refusal for
any range wider than 200 blocks, so the shrink path runs end to end in a browser rather than only in
unit tests. On a 9,010-block chain with `from = 1`: window sizes tried **200..9010** — the 9,010 is
the single wide probe the cap refuses, after which `rangeCap` reads `200` out of the message and every
later window is 200. 40 windows attempted per kind, 39 reaching the wire, 39 × 200 = 7,800 blocks
covered, boundary at **9010 − 7800 + 1 = 1211** — which is exactly the `history before block 1211 not
loaded` the page printed. One `load older` spent 7 windows per kind (1,010 blocks remaining ÷ 200 = 6,
plus one probe), cleared the boundary, and brought the block-9 `Queued` into the changes list.

On anvil without `?cap=`, nothing changes: one window, no partial line, as the plan required.

## Deviations from the plan

1. **Step 6 — the assertion withholds a block rather than refusing a log.** The plan: assert, for each
   broadcast log read, exactly one `CREATE`/`CREATE2` and `receipts.length === transactions.length`,
   else throw; `Chunks.s.sol` is exempt because it creates nothing. That is what commit `ccf6fc9`
   does, and it **breaks the build**: `Fixtures.s.sol` creates `RevertingReceiver`, `MockERC20`,
   `MockVault` and `BlocklistToken` in one broadcast, so `make fixtures && make dapp` dies — and
   `make fixtures` is a documented hand-run step (`AGENTS.md` § The dapp) that the write screens need.
   It also contradicts the plan's own step 6 check, "`make dapp-nodev` on the dev stack still builds".
   Commit `5f03f10` resolves it: an unpairable log yields its **addresses**, which come off the
   transactions and not the hash join and so cannot be corrupted by #140, and **no block at all**.
   `withheld` records which, and `substitute` turns a demand for one into the #140 refusal instead of
   a bare "nothing to substitute". The safety property is unchanged — no untrustworthy block is ever
   emitted — and the refusal is still reachable and still tested. Measured: the three sources ask for
   exactly one creation block, `__DISTRIBUTIONFACTORY_BLOCK__`, from `Deploy.s.sol`'s single-creation
   log, so nothing the bundle reads is ever withheld. Both commits are on the branch deliberately, so
   the review can see the failure and the fix. **This one wants a ruling — see § Open questions.**
2. **Step 6 — the pairing moved to `app/broadcast.mjs`.** The plan put the assertion in
   `app/build.mjs:37`, and its check asks for a unit test that feeds the assertion a fixture and gets
   a block back. `build.mjs` runs its build at import, so a test cannot import it. `app/broadcast.mjs`
   follows `app/inline-scripts.mjs`, which is this repo's own precedent for exactly this (a build
   helper in its own module, tested by `test/inline-scripts.test.mjs`). The test file is
   `test/build.test.mjs`, as the plan named it, and `rake#140` is in `build.mjs` at the call site
   where the AC greps for it.
3. **Step 1 — a pruned refusal shrinks instead of stopping.** The plan: "On `isPruned`, the same:
   partial from the first block the provider still serves." Taken literally as "stop here", a pruned
   provider loads **nothing**: the newest 10,000-block window straddles the prune boundary and is
   itself refused, so the scan gives up at the head. Measured in a stub harness — `partial 100001` on
   a chain whose head was 100,000. A pruned refusal now halves like any other refusal that names no
   number, which bisects toward the boundary; the same harness then loaded everything down to 99,006
   against a boundary of 99,000. That *is* "the first block the provider still serves", discovered
   rather than assumed. This matters in production, not only in theory: both publicnode endpoints
   prune at ~50,000 blocks back (table above).
4. **MetaMask's own RPCs were not measured.** The plan asks the browser check to measure MetaMask's
   Sepolia and Base Sepolia endpoints and record both. Those are Infura endpoints keyed to the
   extension; there is no MetaMask on this host, no Infura key, and extracting MetaMask's shipped key
   is not ours to do. Web search was unavailable this session, so the "10,000 = MetaMask's Infura
   default" provenance is the plan's assertion and is **not** verified by me. What I measured instead
   is the three public endpoints, live, with both verbatim strings confirmed (table above). Why this
   costs little: see the `WINDOW_START` decision below.
5. **`git submodule update --init --recursive` was needed first.** The prepared worktree had empty
   `lib/forge-std` and `lib/solady`, so nothing compiled and `make deploy` failed on
   `Source "solady/auth/Ownable.sol" not found`. Not a plan deviation so much as a worktree one, noted
   because the next task in a fresh worktree will hit it.

## Decisions

The plan left the four window constants to me, within the AC.

- **`WINDOW_START = 10_000`** — kept as the plan suggested, though I could not verify its provenance
  (deviation 4). The reason it barely matters: a wrong start costs exactly **one** request per log
  kind, because `rangeCap` reads the provider's own number out of the first refusal rather than
  halving toward it. Observed in the browser — one 9,010-block probe, refused, and every window after
  it was 200. A smaller start would spend more windows on an uncapped endpoint for no gain; a larger
  one changes nothing.
- **`WINDOW_INFLIGHT = 4`** — the plan's figure, unchanged. Four round trips at once hides the latency
  without looking like a flood to a rate limiter; the batch is contiguous and newest-first, which is
  what lets a truncated scan describe itself with one block number instead of a set of holes.
- **`MAX_WINDOWS = 40`** — the plan's figure, and the AC's ceiling, unchanged. Its consequence is
  worth stating plainly: 39 effective windows × 200 blocks is 7,800 blocks, which on Base Sepolia at
  2 s a block is **4 hours 20 minutes of history per pass**. A week-old distribution needs about 39
  presses of `load older`. That is within the AC and I have not changed it — see § Open questions.
- **The widget's tolerance, `SKEW = 3600`** — the plan's one hour, unchanged. An hour is 0.3% of the
  fourteen-day `GRACE`, so being late to say `expired` costs almost nothing, where being early tells
  an owner a live change is dead. Both sides of the boundary are pinned in `widget.test.mjs` and were
  driven in a browser (table above).
- **One `partial` boundary for the whole section group**, the highest of the changes and funds scans.
  The three sections and the funds block sit under one `load older`, so one honest number beats three
  that invite arithmetic. The address-less `Transfer` query is excluded from it: a provider that
  refuses that query outright leaves `other` null already, and its budget says nothing about the two
  queries that carry the history.
- **`load older` re-decodes over the union**, not over the new slice. `histLogs` fetches and `histOf`
  decodes, so an `Applied` already on the page still closes a `Queued` that only arrives in the older
  slice. The alternative — merging decoded rows — gets the cross-boundary pairing wrong.
- **The window only ever shrinks.** A provider that names a cap it is already honouring is refusing
  for some other reason, so a named cap is taken only when it is narrower than what just failed, and
  everything else halves. Without this, `size = cap` can loop forever on such a provider.
- **A refusal that is neither a cap nor pruning is thrown**, which preserves the existing painted
  failure: `history()` already catches the address-less query (`other` → null) and the detail page
  already catches the rest (`paintFailed`).

## Discoveries

- The architect's cap table splits the two publicnode endpoints — 50,000 for one, pruning for the
  other. Measured today, **both do both**: pruned at 50,000 blocks back, and
  `exceed maximum block range: 50000` at 200,000. The split is not wrong about the numbers, just about
  which endpoint owns which.
- `sepolia.base.org` accepts **201** inclusive blocks, refusing at 202, so its "200 range" is a
  `toBlock − fromBlock` delta. `windows()` emits `size` inclusive blocks, so a cap of 200 is read as
  200 inclusive and stays one block inside — conservative, and no change needed.
- Both publicnode endpoints refuse an **address-less** `eth_getLogs` outright:
  `-32701 Please specify an address in your request or, to remove restrictions, order a dedicated full
  node here: …`. That is neither a range nor a pruned error, so it throws and the "other tokens
  received" list is simply absent there — which is the behaviour `AGENTS.md` already documents. My
  first cap probe omitted the address and misread this as the range error; the table above is the
  re-run with one.
- `Fixtures.s.sol` creates four contracts in one broadcast log (deviation 1). Nothing reads their
  blocks today, but any future `__MOCKERC20_BLOCK__`-style token would now be refused rather than
  guessed — which is the right failure, just a surprising one to meet.
- `app/build.mjs` cannot be imported without running a build, which is why the helper moved. If more
  of it ever needs testing, the same split is the move.
- Not fixed, outside scope: `cast call … "applyQueued(uint32)"` on an expired entry returns
  `execution reverted, data: "0x"` rather than the `Expired(uint256)` bytes, so the revert that #148
  is about is not reproducible through `cast` on this chain. The unit test and a before/after against
  `origin/main`'s `model.js` carry that evidence instead: grace `null` and `undefined` both threw
  `TypeError: Cannot convert null to a BigInt` on main and both now give the shorter sentence, with
  the dated row unchanged.

## Open questions

**1. Is `MAX_WINDOWS = 40` the intended reach on a 2-second chain?**

- *Options.* (a) Leave it at 40 — 4 h 20 m of Base Sepolia history per pass, ~39 presses of
  `load older` for a week. No work, and the AC is already met. (b) Scale the budget by the measured
  cap, e.g. hold a block target rather than a request count, so a 200-block provider gets more windows
  than a 50,000-block one — one change in `logs()`, and it loosens the AC's flat "≤ 40 per kind".
  (c) Raise the flat number; same shape, worse on a slow provider.
- *Recommendation.* (a) for this task, (b) as its own task if the dapp is meant to read a week of Base
  Sepolia without a stack of clicks. I have not changed it: 40 is the AC.
- *Default and what it blocks.* Shipping as-is. Blocks nothing in m04-t01; it is a question about what
  "the dapp that ships" should reach on the chain m04-t03 uploads to.
- *Where the ruling is recorded.* `ROADMAP.md` decision log if (b).

**2. Is deviation 1's withhold-rather-throw the intended reading of #140?**

- *Options.* (a) Withhold the block, refuse only on demand — what is on the branch; keeps
  `make fixtures` working and still emits no untrustworthy block. (b) Throw on every multi-creation
  log as the plan literally says, and split `Fixtures.s.sol` into four broadcasts so the dev stack
  works again — more faithful to the plan's words, and a change to a script outside this task's scope.
- *Recommendation.* (a). It keeps the safety property exactly and satisfies the plan's own "`make
  dapp-nodev` on the dev stack still builds", which (b) cannot without work the task excludes.
- *Default and what it blocks.* (a) ships. Blocks nothing; if the architect prefers (b), it is a new
  task against `scripts/forge/Fixtures.s.sol`.
- *Where the ruling is recorded.* The PR review, and `ROADMAP.md` if the pairing rule becomes general.
