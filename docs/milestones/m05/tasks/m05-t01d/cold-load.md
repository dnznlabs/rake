Read by `tools/uat/cold.mjs`: 10 cold loads per chain, **no wallet**, so the page uses its own
`PUBLIC_RPC` entry through the browser's own fetch. Landing panel, then the distribution page at
`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`, whose three log-built sections are classified into the
four outcomes step 5 distinguishes. Every reading below filled the featured panel **10/10** with
**0 page errors**, so those columns are dropped here.

**"Worst outcome per load" ranks read *quality*, not row count:**
`nothing > loading > empty > other > throttle > boundary > read in full`. A section that covered its
whole range is `read in full` whether or not that range held events — the `cast` column says which.
An earlier ranking placed "read, empty" above "rows", so a load whose `changes` section was
legitimately empty while the other two were full reported as "read, empty" and read as though the
page had found nothing. That was a defect in this file, not in the page.

## What the start window bought — 05:52Z against 06:17Z

| chain | start window | before (at 10,000 everywhere) | after |
|:--|--:|:--|:--|
| 1 | 1,000 | 10× read | 10× **read in full** |
| 8453 | 50,000 | 4 read, **6 throttle** | 10× **read in full** |
| 11155111 | 10,000 | 4 read, 1 boundary, 5 throttle | 2 boundary, 8 throttle |
| 84532 | 50,000 | **3 boundary, 7 throttle** | **6 read in full**, 4 throttle |

8453 lost every throttle and 84532 turned three truncated reads into six complete ones: both serve
50,000 blocks a query and were being asked for 10,000. **11155111 is the control — its reliable span
already *is* 10,000, so the amendment changes nothing for it**, and its throttle count still moved
5 → 8 → 8 across three runs an hour apart. That spread is what one run of any of this is worth.

## The reading of record — 2026-11-23T06:17:44Z

| chain | three sections, worst per load | blocks in the first pass | that in time | the chain, by `cast` |
|:--|:--|--:|--:|:--|
| 1 | 10× read in full | all of it, 10/10 | whole history | changes 0, funds 0 |
| 8453 | 10× read in full | all of it, 10/10 | whole history | changes 0, funds 0 |
| 11155111 | 2× boundary, 8× throttle | 9,965 | 1.4 days | changes 0, funds 6+ |
| 84532 | 6× read in full, 4× throttle | 399,999 (6/10 all) | 22.2 h | changes 0, funds 4 |

**The `cast` column is the answer to "is an empty section true?"** — the same question asked by a
different client, which builds its own JSON and opens its own connection, so agreement is evidence
rather than a tautology. Counted over the whole life of each chain's factory, windowed at that
chain's start window:

- **1** — 0 changes and 0 funds over blocks 26,469,801..26,475,987, **every window answered**. The
  mainnet distribution genuinely has no events yet, so ten "read in full" loads are correct.
- **8453** — 0 and 0 over 60,730,845..61,121,675, every window answered. Same.
- **11155111** — 0 changes and **6 funds** over 12,173,938..12,193,903, with one refused window on
  each, so those are floors. The funds history is real, which is what the driver's row (c) requires;
  `changes` is genuinely 0, so "no change has been queued yet" is a true sentence.
- **84532** — 0 changes and **4 funds** over 61,197,280..62,464,647, every window answered.

`cold.mjs` fails the run if any load claims an empty history for a kind `cast` counts events of.
It did not fire. A refused window makes the count a floor, and a floor is still enough to catch a
false "empty".

**The time column is read from the chain, never assumed** — two `eth_getBlockByNumber` timestamps per
row, because a block time would have been wrong by a factor of ten. Verified independently with
`cast` at 06:10Z: on **84532 ten thousand blocks took 2,000 s — 0.2 s a block**, Base Sepolia's
200 ms flashblocks, so 400,000 blocks there is under a day and that chain makes ~432,000 blocks a
day. On 11155111, 124,848 s — 12.48 s a block.

## What the endpoints said when they refused, in their own words

Counted over all ten loads of the 06:17Z run, from the browser's own traffic:

| chain | its own sentences |
|:--|:--|
| 1 | 40× `Please specify an address in your request or, to remove restrictions, order a dedicated…` |
| 8453 | 40× the same |
| 11155111 | 64× `pruned history unavailable` · 27× `Rate limit exceeded. To obtain higher limits…` · 20× the address-less refusal |
| 84532 | 37× the address-less refusal · 33× `Rate limit exceeded. To obtain higher limits…` |

**The address-less refusal is on all four chains and is not a fault**: it is the `Transfer` query
that has no `address` filter, which publicnode declines on every endpoint, and the page already
catches it (`histLogs`, `.catch(() => null)`). The consequence is worth stating plainly rather than
leaving in a log — **the "other tokens" list is unavailable on all four of the endpoints the page
ships**, by the operator's policy, and a connected wallet is the only way to see it.

## The Sepolia "nothing", explained from the browser's own eight requests

One load in twenty painted `history unavailable` across all three sections. The traffic is kept at
`evidence/nothing-11155111-load7.json`; the `topics` count names the kind (4 = `changes`,
5 = `funds`, 66 = the single `Transfer` topic string):

| # | kind | span | answer |
|--:|:--|--:|:--|
| 1–2 | Transfer | 10,000 / 9,945 | `-32701` address-less, caught and discarded by design |
| 3 | changes | 10,000 | `4444 pruned history unavailable` |
| 4 | **funds** | 10,000 | **a real log array** |
| 5 | **changes** | 9,945 | **`[]`** |
| 6–8 | funds, changes | 9,945 / 5,000 / 5,000 | `-32005 Rate limit exceeded`, HTTP 429 |

**The endpoint answered three windows, and the page said the history was unavailable.** The cause was
in step 5's own code, not in the endpoint: `logs()` keeps logs only from an unbroken run at the top of
a batch — correct, or a hole sits below the boundary the line prints — and the same loop was counting
`answered`. So window 5, answered by the endpoint and dropped for contiguity, did not count; the
`changes` walk reached the end with `answered === 0` and threw; and `history()` wraps both walks in
one `Promise.all`, so `paintFailed()` wrote `history unavailable` over the `funds` section too, whose
own window 4 had returned real logs.

Fixed by counting the endpoint rather than the keeping: `answered` increments for every window
answered in the batch, and the contiguous-prefix rule for `out` is untouched. Five tests in
`test/answered.test.mjs`, including one that keeps every event tagged with its own window's block so a
hole below the boundary is detectable — the first version of that assertion could not see one, and a
mutation that kept logs from under a refusal passed it.
