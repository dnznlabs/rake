Read by `tools/uat/cold.mjs`: cold loads with **no wallet**, so the page uses its own `PUBLIC_RPC`
entry through the browser's own fetch. Landing panel, then the distribution page at
`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`. Every reading below filled the featured panel on every
load with **0 page errors**.

## What the columns mean

**"Worst outcome per load" ranks read *quality*:**
`nothing > loading > empty > other > throttle > boundary > read in full`, first match wins across the
three sections. **`read in full` means every section covered its whole range** — it is one label for
"rows", "read and empty" and the funds block, because a section that finished is a good outcome
whether or not its range held events. An earlier ladder put "read, empty" above "rows", so a load
whose `changes` was legitimately empty while the other two were full reported as "read, empty" and
read as though the page had found nothing.

**"Loads covering the whole range" is the count whose *every* section printed no boundary line.**
It is now a column of its own: one cell used to carry both it and the median depth of the loads that
were cut short, which reads as "it stopped at 400,000 blocks and claimed to have read it all".
The finished loads and the truncated ones are never averaged together.

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

| chain | worst per load | whole range | when truncated | that in time |
|:--|:--|--:|--:|--:|
| 1 | 6× read in full, 4× throttle | 6/10 | 3,999 | 13.4 h |
| 8453 | 10× read in full | 10/10 | — none were | — |
| 11155111 | 1× boundary, 9× throttle | 0/10 | 31 | 6 min |
| 84532 | 6× read in full, 4× throttle | 6/10 | 399,999 | 22.2 h |

## Run B — the mainnets under a full budget, 06:34:25Z, 10 loads each

`--full-budget` lowers `factoryBlock` in the **built** document by 40 × the chain's start window, so
the walk has a full budget's worth of range and spends it. The depth is simulated: these rows are a
load measurement, not a reading of the chain's own history. With no wallet the walk starts at
`CFG.factoryBlock` — `FIRST` is only filled by the `Created` scan a connected account triggers — so
lowering it is the whole of the change needed.

| chain | worst per load | whole range | when truncated | that in time | what it refused with |
|:--|:--|--:|--:|--:|:--|
| 1 | **10× boundary** | 0/10 | 9,999 | 1.4 days | 40× `Archive requests require a personal token` |
| 8453 | 4× boundary, **6× throttle** | 0/10 | 399,999 | 22.2 h | 39× `Rate limit exceeded` |

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

`-32701 Please specify an address in your request` on **all four** endpoints, 37–40× per run. The page
catches it by design (`histLogs`, `.catch(() => null)`), so nothing breaks — but **the "other tokens"
list is unavailable on every endpoint the page ships**, by operator policy, and only a connected
wallet can show it.

## Block times, read rather than assumed

Two `eth_getBlockByNumber` timestamps per row, because a block time would have been wrong by a factor
of ten. Verified with `cast` at 06:10Z: **84532 mints every 0.2 s** — 10,000 blocks in 2,000 s, Base's
200 ms flashblocks — so that chain makes ~432,000 blocks a day and 400,000 blocks is under one.
11155111 is 12.48 s.
