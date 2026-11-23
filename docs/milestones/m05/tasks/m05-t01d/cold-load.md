Read by `tools/uat/cold.mjs`: 10 cold loads per chain, **no wallet**, so the page uses its own
`PUBLIC_RPC` entry through the browser's own fetch. Landing panel, then the distribution page at
`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`, whose three log-built sections are classified into the
four outcomes step 5 distinguishes. Every reading below has **0 page errors** and filled the featured
panel **10/10**, so those columns are dropped here.

## Before the start window — 2026-11-23T05:52:21Z

Every walk opens at `WINDOW_START` 10,000 and only shrinks.

| chain | endpoint | three sections, worst outcome per load |
|:--|:--|:--|
| 1 | `ethereum-rpc.publicnode.com` | 10× read, empty |
| 8453 | `base-rpc.publicnode.com` | 4× read empty, **6× throttle** |
| 11155111 | `ethereum-sepolia-rpc.publicnode.com` | 4× read empty, 1× boundary, 5× throttle |
| 84532 | `base-sepolia-rpc.publicnode.com` | **3× boundary, 7× throttle** |

## After it — 2026-11-23T06:05:22Z, the same four endpoints

Each walk opens at the span `rpc-depth.md` found reliable for its own endpoint (#391): 1,000 ·
50,000 · 10,000 · 50,000.

| chain | start window | three sections, worst outcome per load | blocks in the first pass | that in time |
|:--|--:|:--|--:|--:|
| 1 | 1,000 | 10× read, empty | all of it, 10/10 | whole history |
| 8453 | 50,000 | **10× read, empty** | all of it, 10/10 | whole history |
| 11155111 | 10,000 | 1× boundary, 1× read empty, 8× throttle | 9,903 (1/10 read it all) | 1.4 days |
| 84532 | 50,000 | **6× read empty**, 4× throttle | 399,999 (6/10 read it all) | 22.2 h |

**What moved, and what did not.** 8453 lost every throttle (6 → 0) and 84532 turned three truncated
reads into six complete ones, because both endpoints serve 50,000 a query and were being asked for
10,000. **11155111 is the control: its reliable span *is* 10,000, so the amendment changes nothing
for it** — and its throttle count still moved 5 → 8 between two runs thirteen minutes apart. That
spread is the honest measure of what a single run of anything here is worth. Chain 1's two mainnet
figures say "all of it" because its distribution is a day old, not because the endpoint is deep: its
10,000-block span is an *archive* refusal, and what the amendment buys there is four refusals skipped
at the start of every walk rather than more history.

**The time column is read from the chain, never assumed** — two `eth_getBlockByNumber` timestamps
per row, because a per-chain block time would have been wrong by a factor of ten. Checked
independently with `cast` at 06:10Z: on **84532 ten thousand blocks took 2,000 s — 0.2 s a block**,
Base Sepolia's 200 ms flashblocks, which is why 400,000 blocks there is under a day and why that
chain has always been the walk's worst case at ~432,000 blocks a day. On 11155111 ten thousand blocks
took 124,848 s, 12.48 s a block.
