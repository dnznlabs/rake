# The wallet's endpoint is not the page's (#400)

A connected wallet reads through whatever endpoint its network entry carries, and that endpoint can be
much worse than the one the document ships with. On Base Sepolia it is `sepolia.base.org`: **200
blocks a log query, 25 requests a second** — measured in [`rpc-depth.md`](rpc-depth.md), where it is
the `doc+deploy` row for 84532, beside the `base-sepolia-rpc.publicnode.com` entry the page uses at
50,000.

Until #400 the page's **first** history read went through the wallet when there was one. So connecting
a wallet on Base Sepolia replaced a 50,000-block endpoint with a 200-block one, and the walk — which
opens at `WINDOW_START` 10,000 — met a cap and a rate limit at once. Every driver in `tools/uat/`
pointed its injected provider at the chain's *good* endpoint, so none of them could see it.

## The measurement

`tools/uat/wallet-rpc.mjs` serves the document this branch builds, injects a provider relaying to the
wallet's endpoint, and loads the DNZN distribution page. `--pre-400` applies one substitution to the
built artefact — the first read routed back through the wallet — so the two runs differ in that line
and nothing else.

```
node tools/uat/wallet-rpc.mjs --chain 84532            # the page as it now ships
node tools/uat/wallet-rpc.mjs --chain 84532 --pre-400   # the same build, first read via the wallet
```

Chain 84532, 2026-11-23, page endpoint `base-sepolia-rpc.publicnode.com`, wallet endpoint
`sepolia.base.org`, one load each:

| | this branch | `--pre-400` |
|:--|--:|--:|
| `eth_getLogs` sent to the wallet's endpoint | **0** | 48, of which **18 refused** |
| first refusal | — | `-32614: eth_getLogs is limited to a 200 range` |
| widest span asked of it | — | 10,000 blocks |
| requests to the page's own endpoint | 22 | 0 |
| `changes` section | `no change has been queued in the last 24 hours.` | `history unavailable` |
| `activity` section | two `in Ξ0.0050` rows, block 62650196 | `history unavailable` |
| `distribute` controls | **1** | **0** |
| section heads | `last 24 hours`, `last 24 hours` | `last 24 hours`, `last 24 hours` |

The `--pre-400` funds block reads *"the funds could not be read from this endpoint at all — neither
the logs nor the balances answered"*. That is worth stating plainly: #398 keeps the ETH row and its
`distribute` when the **logs** fail, but here 48 log queries against a 25-a-second endpoint starved
the state reads as well, so there was nothing left to paint from. A guard that preserves the funds
block cannot help a page whose balances are also being refused — which is why the fix is to not ask
the wallet in the first place.

## Base mainnet, where only the logs fail

Chain 8453, same day, page endpoint `base-rpc.publicnode.com`, wallet endpoint `mainnet.base.org` —
which serves no log query at all (`rpc-depth.md`: `nothing`, `-32011 request limit reached`):

| | this branch | `--pre-400` |
|:--|--:|--:|
| `eth_getLogs` sent to the wallet's endpoint | **0** | 12, of which **12 refused** |
| first refusal | — | `-32011: request limit reached` |
| `changes` / `activity` | `no change has been queued in the last 24 hours.` / `nothing has arrived in the last 24 hours.` | `history unavailable` / `history unavailable` |
| `distribute` controls | **1** | **1** |

The two testnet and mainnet runs separate the two fixes cleanly. Here the state reads survived, so
#398's guard did its job and `distribute` stayed through a total log failure; on Base Sepolia the
endpoint was overwhelmed and even that was gone. #400 is what keeps the history itself.

## What the wallet is still for

`load older` — and only that. It is the one read that may reach below the day the page has already
painted, and the one place a wallet's endpoint can do better than ours. The press keeps the rule #391
set: a wallet's provider starts at 10,000, because its cap is not ours to know.

A page with a wallet therefore says the same thing about its window as a page without one, with a
different way onward: *"Use **load older** to read further back"* rather than *"Connect a wallet to
read further back"*.

## Sepolia has no free endpoint a wallet could use, and what that showed

The first attempt used `rpc.sepolia.org`, which answers a **404 HTML page** to `eth_blockNumber`. The
page then painted nothing and the driver called it *"the wallet made the page worse"* — a verdict
about the document, from an instrument that was not an endpoint. So the driver now probes the endpoint
before it launches a browser, and refuses a verdict (exit 2) when no section painted at all.

`1rpc.io/sepolia` is real and answers `eth_getCode` and `eth_call` in under a second, but refuses
`eth_getBlockByNumber`:

```
{"error":{"message":"chain is not available on free plan, please upgrade to paid plan","code":35}}  [HTTP 400]
```

So the page served **three** requests through it — `eth_accounts`, `eth_chainId`,
`eth_getBlockByNumber` — and painted no section, no head and no funds block. Worth surfacing and
**out of scope here**: a wallet endpoint that refuses block headers stops the boot, which is a worse
outcome than any of the four the history's stop outcomes describe, and nothing in this task's step 5
is about the boot. MetaMask's own Sepolia default is a keyed Infura endpoint, so there is no free
stand-in for it; Base Sepolia is the chain the report came from and the one measured above.

## Other chains

The run takes `--wallet-rpc <url>` for any endpoint, and `--chain` picks the recorded default:
`sepolia.base.org` for 84532, `mainnet.base.org` for 8453, `1rpc.io/sepolia` for 11155111 (which does
not boot, above). Chain 1 has no public default worth naming — a wallet there is usually on an
API-keyed endpoint — so it must be given one explicitly. `tools/uat/run.mjs` takes the same asymmetry through `--wallet-default` or
`--wallet-rpc <url>`, which point the row driver's injected provider at the wallet's endpoint while
the page keeps its own; writes still go to the chain's `rpc`.
