Read 2026-11-23T04:39:19Z, by `tools/rpc-depth.mjs` on the factory `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`.

Each span and each depth was attempted **3 times**; a figure in bold is the one answered on *every* attempt, which is the only one a page may count on. A fraction means the endpoint is a pool whose backends disagree.

| chain | endpoint | role | span, reliable / ever | refused past it | depth reliable (blocks back) | deeper, sometimes | states about itself | 40 reqs, 4 at a time | CORS to rake.dnzn.dev |
|:--|:--|:--|--:|:--|--:|:--|:--|:--|:--|
| 1 | `https://ethereum-rpc.publicnode.com` | doc | **1,000** / 1,000 | 10,000: -32602 Archive requests require a personal token. Get one at: https://www.allnodes.com/publicnode | none | — | — | 40/40 answered | * |
| 1 | `https://0xrpc.io/eth` | other | **10,000** / 10,000 | 50,000: -32601 Request contains invalid block params | **5,000,000** | — | — | 40/40 answered | * |
| 1 | `https://rpc.flashbots.net` | other | **100** / 200 | 200: -32016 over rate limit | none | 10,000, 50,000, 200,000, 5,000,000 | — | 40/40 answered | * |
| 1 | `https://eth.drpc.org` | other | **100** / 100 | 200: 35 ranges over 100 blocks are not supported on free plan | **5,000,000** | — | — | 40/40 answered | * |
| 8453 | `https://mainnet.base.org` | doc | **nothing** | -32011 request limit reached | — | — | — | — | — |
| 8453 | `https://base-rpc.publicnode.com` | other | **50,000** / 50,000 | 100,000: -32701 exceed maximum block range: 50000 | **5,000,000** | — | — | 40/40 answered | * |
| 8453 | `https://base.drpc.org` | other | **50** / 100 | 100: 15 You reached Public endpoint rate limit, please upgrade to paid plan | **200,000** | 50,000 | — | 0/40 answered · 15 You reached Public endpoint rate limit, please upgrade to paid plan | * |
| 84532 | `https://sepolia.base.org` | doc+deploy | **200** / 200 | 1,000: -32614 eth_getLogs is limited to a 200 range | **5,000,000** | — | — | 28/40 answered · HTTP 429 {"code":-32007,"message":"25/second request limit reached"} | https://rake.dnzn.dev |
| 84532 | `https://base-sepolia-rpc.publicnode.com` | deploy | **50,000** / 50,000 | 100,000: -32701 exceed maximum block range: 50000 | **5,000,000** | — | — | 40/40 answered | * |
| 84532 | `https://base-sepolia.drpc.org` | other | **nothing** | 30 Request timeout on the free plan, please upgrade to paid plan | — | — | — | — | — |
| 11155111 | `https://ethereum-sepolia-rpc.publicnode.com` | doc+deploy | **10,000** / 50,000 | 50,000: 4444 pruned history unavailable | **10,000** | 50,000, 200,000, 1,000,000, 5,000,000 | — | 40/40 answered | * |
| 11155111 | `https://sepolia.gateway.tenderly.co` | other | **100,000** / 100,000 | nothing wider refused | **5,000,000** | — | — | 19/40 answered · -32005 rate limit exceeded | * |
| 11155111 | `https://1rpc.io/sepolia` | deploy | none / 50 | 50: -32001 Block range too large: maximum allowed is 50 blocks on your current plan. Upgrade your subscription at https://no /  | **5,000,000** (at an unreliable width) | 50,000, 200,000 | — | 17/40 answered · 4444 pruned history unavailable | * |
| 11155111 | `https://sepolia.rpc.thirdweb.com` | other | **50** / 1,000 | 100: -32005 Rate limit exceeded. Upgrade your plan at https://thirdweb.com/pricing | none | — | — | 0/40 answered · -32005 Rate limit exceeded. Upgrade your plan at https://thirdweb.com/pricing | (none) **unusable** |
