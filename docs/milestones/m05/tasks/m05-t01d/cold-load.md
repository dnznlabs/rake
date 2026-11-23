## How many of the last 30 events a visitor sees — **derived**, and the figure to read first

For a distribution with **one event a day for a month**, on first load, **with no wallet**. Derived
from the measured reach and the measured block time; every input is in this file and none of it is
estimated. It is a worked example, not a measurement of any real distribution.

| chain | s/block | budget: 40 × start window | that in days | best of 30 | where it actually stopped | that in days | **events seen** | can a press go further? |
|:--|--:|--:|--:|--:|:--|--:|--:|:--|
| 1 Ethereum | 12.05 | 40,000 | 5.6 | 5 | archive wall, 9,999 blocks, 10/10 loads | **1.4** | **1** | **no — it is a wall** |
| 8453 Base | 0.20 | 2,000,000 | **4.6** | **4** | throttle, 399,999 blocks, 6/10 loads | 0.9 | **0 or 1** | yes, a throttle keeps the press |
| 11155111 Sepolia | 12.48 | 400,000 | 57.8 | 30 | prune wall, 11,231 blocks, in a browser | **1.6** | **1** | **no — it is a wall** |
| 84532 Base Sepolia | 0.20 | 2,000,000 | 4.6 | 4 | nothing; whole history reached, 6/10 | — | **4** | n/a |

**Every chain lands between none and four of the last thirty, and for different reasons.** Ethereum
and Sepolia are cut by the endpoint's own horizon — an archive refusal and a prune refusal, both
**walls with no press**, so a visitor without a wallet cannot get past them at all. Base and Base
Sepolia are not cut by depth but by **arithmetic**: at 0.2 s a block, forty windows of fifty thousand
is 4.6 days, so even a walk that spends its whole budget unthrottled sees four events. Sepolia is the
one chain whose *budget* would cover the month — 57.8 days — and its endpoint prunes to 1.6.

**The press is the difference that matters.** `load older` adds another budget's worth per kind, so on
the Base chains a visitor can keep pressing deeper; on Ethereum and Sepolia the stop is a wall and
there is no press to offer. So "1 of 30 on Ethereum" is not "1 at first, more on request" — it is one,
full stop, until a wallet with its own endpoint is connected.

Block times read with `cast` from **outside** the four endpoints under a cooling period (`eth.drpc.org`,
`base.drpc.org`), since block time is a property of the chain and reading it elsewhere keeps the quiet
gap intact: 1,000 Ethereum blocks took 12,048 s, 10,000 Base blocks took 2,000 s. Base's 0.2 s was
checked twice because it is surprising — publicnode and dRPC agree, and Base Sepolia reads the same.

---

Read by `tools/uat/cold.mjs`: cold loads with **no wallet**, so the page uses its own `PUBLIC_RPC`
entry through the browser's own fetch. Landing panel, then the distribution page at
`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`. Every reading below filled the featured panel on every
load with **0 page errors**.

## A standing risk: Ethereum's margin, which no code change can widen

The page promises a visitor with no wallet **the last 24 hours**. On Ethereum that is about **7,171
blocks** at the measured 12.05 s a block, and `ethereum-rpc.publicnode.com` was measured serving about
**10,000** before refusing with `Archive requests require a personal token` — ten of ten loads at full
budget, corroborated by `cast` having 37 of 47 windows refused over the same range.

**So the margin is about 2,830 blocks, or nine hours.** If the operator tightens that horizon below
~7,200 blocks, every no-wallet read on Ethereum stops short of its day. The page stays honest —
`dayHead` then says "as far back as this endpoint served" and the outcome line names the block — but
the promise is gone, and **no change in this repository recovers it**: the endpoint decides. The
`RUNBOOK.md` § The gateway check now re-reads this horizon before each mainnet upload.

Sepolia has the same shape with more room: 6,923 blocks needed against a prune wall measured at
11,231. The Base chains are not depth-limited at all — 24 hours is ~432,000 blocks against a
2,000,000-block budget — but they need **nine windows a section** to cover it, which is the throttle
exposure instead.

## What the columns mean

**"Worst outcome per load" ranks read *quality*:**
`nothing > loading > empty > other > throttle > boundary > read in full`, first match wins across the
three sections. **`read in full` means every section covered its whole range** — it is one label for
"rows", "read and empty" and the funds block, because a section that finished is a good outcome
whether or not its range held events. An earlier ladder put "read, empty" above "rows", so a load
whose `changes` was legitimately empty while the other two were full reported as "read, empty" and
read as though the page had found nothing.

**"Loads covering the whole range" is the count whose *every* section printed no boundary line**, and
the depth column beside it describes **only the loads that did not** — it is their median, and it now
prints its own subject (`399,999 (median of 4)`). One cell used to carry both, which reads as "it
stopped at 400,000 blocks and claimed to have read it all", and that is how it was read. The two
populations are never averaged, and the figure is not a ceiling on what the page can reach: on 84532
the loads that *finished* went a million blocks further than the median of the ones that did not.

**`#funds` is classified for read quality only.** It is the funds *block*, not a log list, and when
the address-less `Transfer` query is refused it prints "token payments **in** could not be read from
this provider" — which `PATTERNS.activityRow` matches on the bare ` in `, so chain 1 was briefly
credited with activity `cast` says it does not have. **A latent trap in the driver, not just here:**
the same pattern backs acceptance row (c), so if the activity section ever gains a help sentence
containing ` in `, row (c) would pass on a section with no rows.

## Can the page state an empty history it did not finish reading?

**No, and it is now a test rather than an argument.** `histFill` writes `notice(empty) +
partialLine()`, so a budget stop carries the boundary and the press alongside the sentence;
`test/answered.test.mjs` asserts both halves — the empty-with-boundary case and the
whole-range-alone case — and the mutation that drops the boundary line fails it. The classifier also
ranks `boundary` above the empty sentences, so such a section is labelled `boundary` and never
`read in full`.

**And the claim is checked against the chain per section, not per load.** `cold.mjs` takes the block
of every event of each kind with `cast` — a different client, which builds its own JSON and opens its
own connection — and fails the run if a section says a history is empty over the range **that
section itself read** while `cast` finds events in it. The load's lowest boundary was the wrong unit:
it excused a section claiming emptiness whenever any *other* section had stopped short. It has not
fired on any run since.

## Each chain's event floor, and the depth needed to reach it

Read with `cast` at 06:28Z, both kinds in one query, over the whole life of each factory:

| chain | events | earliest | depth from head | budget (40 × start window) | reachable |
|:--|--:|--:|--:|--:|:--|
| 1 | 0 | — | — | 40,000 | — |
| 8453 | 0 | — | — | 2,000,000 | — |
| 11155111 | 6 | 12,187,731 | 6,205 | 400,000 | yes, in one window |
| 84532 | 4 | **61,397,101** | **1,069,648** | **2,000,000** | **yes — and not before #391** |

**This is what the start window actually bought on Base Sepolia.** At 10,000 blocks a window the
budget reached 400,000 blocks and the earliest event sits 1,069,648 back, so the distribution's
history was **unreachable at any point in the walk**; at 50,000 it is inside the budget, and the six
loads that covered the whole range show those four events. That is a stronger claim than "fewer
requests", and it is why the 399,999 figure in the earlier table was the median of the four
**throttled** loads and not a ceiling on what the page can read.

## Run A — the four chains as shipped, 2026-11-23T06:31:49Z, 10 loads each

| chain | worst per load | covered the whole range | blocks read by the loads that did **not** | that in time |
|:--|:--|--:|--:|--:|
| 1 | 6× read in full, 4× throttle | 6/10 | 3,999 (median of 4) | 13.4 h |
| 8453 | 10× read in full | 10/10 | — none were truncated | — |
| 11155111 | 1× boundary, 9× throttle | 0/10 | 31 (median of 10) | 6 min |
| 84532 | 6× read in full, 4× throttle | 6/10 | 399,999 (median of 4) | 22.2 h |

**On 84532 those are two different sets of loads.** Six reached the factory block, 1,069,648 blocks
down, inside the 2,000,000-block budget. The other four were throttled and stopped a median of
399,999 blocks down. The second figure is not a ceiling on the first.

## Run B — the mainnets under a full budget, 06:34:25Z, 10 loads each

`--full-budget` lowers `factoryBlock` in the **built** document by 40 × the chain's start window, so
the walk has a full budget's worth of range and spends it. The depth is simulated: these rows are a
load measurement, not a reading of the chain's own history. With no wallet the walk starts at
`CFG.factoryBlock` — `FIRST` is only filled by the `Created` scan a connected account triggers — so
lowering it is the whole of the change needed.

| chain | worst per load | covered the whole range | blocks read by the loads that did **not** | that in time | what it refused with |
|:--|:--|--:|--:|--:|:--|
| 1 | **10× boundary** | 0/10 | 9,999 (median of 10) | 1.4 days | 40× `Archive requests require a personal token` |
| 8453 | 4× boundary, **6× throttle** | 0/10 | 399,999 (median of 10) | 22.2 h | 39× `Rate limit exceeded` |

**Chain 1's mainnet problem is depth, not rate.** Every load ended on an archive wall about 10,000
blocks back — **1.4 days of history** — and the endpoint said so in its own words forty times out of
forty. `cast` corroborates from the other side: asked for the same 46,000-block range it had 37 of 47
windows refused for the same reason. So a visitor to a mainnet distribution more than about a day old
sees the recent history and a line saying this endpoint serves no older, with no press — which is the
honest outcome step 5 built, but it is a 1.4-day window onto a permanent record.

**Chain 8453 throttles 6 of 10 under a full budget** while being clean 10/10 as shipped, because its
day-old history finishes in one or two windows. So the mainnet throttle question is answered: it is
there, and it appears the moment the history is long enough to need the budget.

## The limits, in the endpoints' own words

| chain | the rate limit it states |
|:--|:--|
| 1 | **names no number** — `Rate limit exceeded. To obtain higher limits, please request a personal token…` |
| 8453 | **names no number** — the same sentence |
| 11155111 | **names no number** — the same sentence |
| 84532 | **names no number** — the same sentence |

None of the four names a figure, so a shared in-flight cap cannot be derived from their words and has
to be measured. Two further sentences worth having on the record: `pruned history unavailable` is
Sepolia's depth wall (65× in run A), and 8453 once refused with `block range extends beyond current
head block: requested 61125860, head 61125859` — a pooled hostname whose backends are a block apart,
which the walk treats as a range refusal and halves for. Harmless, and not ours to fix.

## A confound in the throttle figures, which are therefore not clean

Sepolia's throttle count across four runs in one hour went **5 → 8 → 9 of 10**, and its median
truncated depth collapsed from 9,965 blocks to **31**. Those runs are the same endpoint, the same IP
and a few thousand requests of my own cumulative traffic. **A visitor does not arrive after I have
made four thousand requests**, so the rising trend is at least partly my own instrument. Any figure
used to size a shared in-flight limit should come from runs spaced far enough apart to clear the
window, and from the mainnets, where run B is the only full-budget reading so far.

## The Sepolia "nothing", explained from the browser's own eight requests

One load in twenty painted `history unavailable` across all three sections; the traffic is kept at
`evidence/nothing-11155111-load7.json`, with the `topics` count naming the kind (4 = `changes`,
5 = `funds`, 66 = the single `Transfer` topic string). `changes` was refused `4444 pruned history
unavailable` on its newer window and answered `[]` on its older one, `funds` returned a real log
array and was then rate-limited. **The endpoint answered three windows and the page said the history
was unavailable.** The cause was in step 5's own code: `logs()` keeps logs only from an unbroken run
at the top of a batch — correct, or a hole sits below the boundary the line prints — and the same loop
counted `answered`, so the window answered below a refusal did not count, the `changes` walk ended
with `answered === 0` and threw, and `history()`'s single `Promise.all` turned that into
`paintFailed()` across all three sections including `funds`, whose own window had the logs. Fixed by
counting the endpoint rather than the keeping; the contiguous-prefix rule is untouched.

## The address-less query, refused everywhere

`-32701 Please specify an address in your request` on **all four** endpoints, 37–40× per run, so the
"other tokens" list is unavailable to every visitor without a wallet. **Confirmed in a browser on all
four chains** (06:48Z, one load each): every one paints "token payments in could not be read from this
provider" and **none has an `#others` element at all**, so nothing reads as "there are none" and no
code changes here. Carried as
[#393](https://github.com/dnznlabs/rake/issues/393), which holds the browser reading and the two
routes open to it.

## Chain 1's wall line, read in a browser at full budget

`CHAIN_ID=1`, `factoryBlock` lowered by 40 × 1,000, no wallet, 06:48Z. `#h-funds` ends:

> history before block 26466137 not loaded · **this endpoint refused older blocks, and may not serve
> history that far back.** A connected wallet reads through its own endpoint, which may go further.

**No press**, and `.hrow` count 0 — which is correct and is *not* the "serves no history before block
N" wording. That variant only appears where the refusal **names** a floor, as
`4444 pruned history unavailable: requested …, earliest available N` does. `Archive requests require a
personal token` names nothing, so the line says the endpoint *may* not serve that far back rather than
claiming a boundary the walk merely stopped at, which is step 5's own rule. Sepolia's line came out the
same way in the same reading, for the same reason: its `pruned history unavailable` arrived without the
`earliest available` suffix.

## The row count corroborates the census, per chain

One load each, 06:48Z, counting `#h-funds .hrow` **elements** rather than matching text:

| chain | `.hrow` elements | `cast` event count |
|:--|--:|--:|
| 1 | 0 | 0 |
| 8453 | 0 | 0 |
| 11155111 | 10 (the display cap) | 6+ |
| 84532 | **4** | **4** |

84532 agrees exactly and the two mainnets agree at zero, from two different clients. 11155111 shows
the `HIST_SHOW` cap of ten, which is why it is not an equality there.

## Block times, read rather than assumed

Two `eth_getBlockByNumber` timestamps per row, because a block time would have been wrong by a factor
of ten. Verified with `cast` at 06:10Z: **84532 mints every 0.2 s** — 10,000 blocks in 2,000 s, Base's
200 ms flashblocks — so that chain makes ~432,000 blocks a day and 400,000 blocks is under one.
11155111 is 12.48 s.
