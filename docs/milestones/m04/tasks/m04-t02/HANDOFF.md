# m04-t02 — handoff

PR: pending · Branch: `m04/t02-gateway` · 2026-11-07

`make serve` now brings up a third process beside anvil and the dapp: `tools/gateway.sh` clones
[ethstorage/web3url-gateway](https://github.com/ethstorage/web3url-gateway) at the pinned
`c5826718855a` into gitignored `cache/`, builds `./cmd/server`, renders `cache/gateway.toml` from the
tracked `procs/gateway.toml.tmpl` with the two ports substituted, and execs the server;
`procs/30-gateway.yml` waits for `deploy` and probes the port. `make gateway-check` is the
measurement as a target, and it passes: the ERC-5219 surface works through real gateway software. `/`
is 200 `text/html` with all three `Web3-*` headers and, once the gateway's own 7,872-byte
`html.patch` block is removed, byte-equal to `html()` on chain; `/widget.js` is 200
`application/javascript` and byte-identical to `app/dist/widget.js`; `/nope` is 404. Nothing under
`src/` moved. Two things the plan asserted turned out false and are recorded below: the build does
not run under Go 1.27.1, and the injected block cannot be removed by line.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — `make serve` brings up `gateway` after `deploy`; `make gateway-check` exits 0 and prints status, content type, the three `Web3-*` headers and the block size for `/`, 200 + `application/javascript` + silent `cmp` for `/widget.js`, 404 for `/nope` | pass | `make -n serve` → `process-compose -f procs/10-chain.yml -f procs/20-dapp.yml -f procs/30-gateway.yml up`. `process-compose process list` → `deploy Completed`, `gateway Running ready=Ready` (also `anvil Running ready=Ready`, `app Running`). `make gateway-check; echo EXIT=$?` → `EXIT=0` and `gateway-check: all assertions passed`, printing `ok status: 200`, `ok content-type: text/html; charset=utf-8`, `ok web3-resolve-mode: resourceRequest`, `ok web3-mode-auto-method: request`, `ok web3-contract-return-processing: decodeErc5219Request`, `measured injected block bytes: 7872`; then `ok status: 200`, `ok content-type: application/javascript; charset=utf-8`, `ok cmp vs app/dist/widget.js: identical`; then `ok status: 404`. Against the gateway stopped via `process-compose process stop gateway`: `gateway-check: no gateway at http://127.0.0.1:8787` and `EXIT=2` (make's; the script exits 1) on the first `curl` |
| 2 — body of `/` minus the injected block equals `html()`, comparison line reads `equal`, both byte counts printed | pass | `measured served bytes: 64625` · `measured injected block bytes: 7872` · `measured body minus block: 56753` · `measured html() bytes: 56753` · `ok body minus block vs html(): equal`. 56,753 + 7,872 = 64,625. Rehearsal read 56,754 for a different bundle, as the plan said it would. Extra check not in the plan: the removed 7,872 bytes are `cmp`-identical to the pin's `cache/web3url-gateway/cmd/server/html.patch` |
| 3 — `devbox.json` has `go@1.27`; `cache/` holds clone, binary and config; `git status --porcelain` empty after `make serve`; the five files tracked | pass | `grep -n 'go@1.27' devbox.json` → `11:    "go@1.27"`. `ls -d cache/web3url-gateway/.git cache/gateway-server cache/gateway.toml` → all three. `git status --porcelain` → empty. `git ls-files --error-unmatch` → `tools/gateway.sh`, `tools/gateway-check.sh`, `procs/30-gateway.yml`, `procs/gateway.toml.tmpl`, `mk/25-gateway.mk` all tracked. Binary 14,283,800 B = 14.3 MB, matching the rehearsal exactly |
| 4 — `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` empty; `forge test` 91; node tests unchanged | pass | That `git diff --stat` prints nothing. After `forge build --force`: `91 tests passed, 0 failed, 0 skipped (91 total tests)`; `node --test test/*.test.mjs` → `tests 67 / pass 67 / fail 0`, the same 67 measured on `c5cfce2` before the first edit. Full branch diff touches only `AGENTS.md`, `devbox.json`, `devbox.lock`, `mk/25-gateway.mk`, `procs/30-gateway.yml`, `procs/gateway.toml.tmpl`, `tools/gateway-check.sh`, `tools/gateway.sh`. `forge fmt --check` clean |
| 5 — `grep -c 'w3.localhost' AGENTS.md` ≥ 1 | pass | `grep -c 'w3.localhost' AGENTS.md` → `1` |
| 6 — the handoff holds the headless origin table and Denizen's wallet table (or the labelled pending row), and § For M04 risks 1 and 2 | pass | § Wallet reach and § For M04 risks 1 and 2 below |

Supporting evidence, the gateway's own request log — the host form mapped to `web3://`, which is the
proof `handleSubdomain` read four labels the way the plan said:

```
0x372e…b24a.31337.w3.localhost:8787/          => web3://0x372e…b24a:31337/
0x372e…b24a.31337.w3.localhost:8787/widget.js => web3://0x372e…b24a:31337/widget.js
0x372e…b24a.31337.w3.localhost:8787/nope      => web3://0x372e…b24a:31337/nope
0x372e…b24a.31337.localhost:8787/widget.js    => web3://0x372e…b24a:31337/widget.js
```

and the config the server actually parsed, which shows the load-bearing setting landed:
`PageCache:{Enabled:false …}`, `DefaultChain:31337`, `ChainConfigs:map[31337:{… RPC:http://127.0.0.1:8645 …}]`.
Anvil served the run's `18 eth_call`s and `52 eth_getCode`s.

## Wallet reach

The engineer's half, in headless chromium (Chrome for Testing 153.0.8010.12, driven over CDP) at
`http://0x372ef1ed64257507a1f0bf0ebfa12c202157b24a.31337.w3.localhost:8787/`. Chromium resolved the
four-label host to loopback on its own — no `--resolve`, no `hosts` entry:

| Expression | Measured | Expected |
|:---|:---|:---|
| `window.top === window` | `true` | `true` — the gateway does not frame the document |
| `typeof window.ethereum` | `"undefined"` | `undefined` — no wallet in headless, so this half cannot answer criterion 6 |
| `location.origin` | `"http://0x372ef1ed64257507a1f0bf0ebfa12c202157b24a.31337.w3.localhost:8787"` | the four-label host, **not** `null` |

The origin question — risk 2's actual content — is therefore answered on the software side: a real
origin, not an opaque one, and a top-level document. What headless cannot answer is whether an
extension injects into that origin.

| Denizen: pending | | |
|:---|:---|:---|
| `window.top === window` | | |
| `typeof window.ethereum` | | |
| `location.origin` | | |
| transaction hash (`distribute` on the seeded distribution) | | |
| date | | |

Chrome with MetaMask on the dev chain (`chainId 31337`, RPC `http://127.0.0.1:8545` — note the
committed default, not this run's 8645), the same three expressions in DevTools, then connect and
send one transaction from the page.

## Deviations from the plan

- **The gateway does not build under Go 1.27.1.** The plan said it "built under 1.27.1 at rehearsal
  without a toolchain download" and treated a toolchain fetch as a later-commit contingency. It is
  not contingent: at the pin, `GOTOOLCHAIN=local go build ./cmd/server` refuses with `go: go.mod
  requires go >= 1.27.3 (running go 1.27.1; GOTOOLCHAIN=local)`. The default `GOTOOLCHAIN=auto`
  downloads a go1.27.3 toolchain (~72 MB, once, into `GOMODCACHE`) and compiles with that. The
  rehearsal did not notice because `go version` prints `go1.27.1` at the repo root, where there is no
  `go.mod`, and `go1.27.3` inside the clone; and because the fetch had already happened — the
  toolchain zip in the shared module cache is dated `2026-11-07T13:44:33`, about half an hour before
  this task's first command, so it was the rehearsal's own build that pulled it. Step 0's check still
  passes verbatim (`devbox run -- go version` → `go version go1.27.1 linux/arm64`) and `go@1.27` is
  still the right pin, since it supplies the `go` that performs the switch. Behaviour left as the
  plan permits; the fact is written into `tools/gateway.sh`'s header and the AGENTS.md paragraph,
  because the consequence is that a fresh machine's first build needs network access.
- **The injected block is removed as a byte span, not by its first and last lines.** The plan said
  "the check removes the block by its first and last lines". It cannot: the minifier emits
  `…<title>app</title></head><body><script>` as one line, so the block's first line is also the
  document's, and deleting it would take `<!DOCTYPE html>` and the whole `<head>` with it. The check
  is anchored on the same two markers but cuts bytes — from `<body>`'s `>` through the first
  `</script>` plus `html.patch`'s trailing newline. No JavaScript can contain a literal `</script>`,
  so the first one is always the closer. The result is byte-exact and independently corroborated: the
  7,872 bytes it removes are `cmp`-identical to the pinned `cmd/server/html.patch`.
- **`html()` is read from the raw ABI return, not through `cast call "html()(string)"`.** The plan
  named the string-decoding form. That form escapes the payload — every newline in a 56 KB document
  comes back as `\n` — so a byte comparison against it would be meaningless whatever the answer. The
  check reads `cast call $APP "html()"`, takes the offset and length words, and decodes the bytes
  with `xxd -r -p`. The ABI length word and the decoded file agree at 56,753.
- **Build time is not reproducible on this host, and the rehearsal's 13 s is not the figure.** The
  shared `GOMODCACHE` (464 MB) and `GOCACHE` were already warm from the rehearsal, so a plain
  rebuild took **1 s**; with a private `GOCACHE` and the warm module cache, **6 s**. A figure
  comparable to the rehearsal's 13 s would need a cold module cache too, which on this host means
  evicting another task's. Binary size needed no such caveat and matched exactly: 14,283,800 B.
- **`make serve` was exercised through the plan's own alternative**, `process-compose -f … up
  -t=false`, because this session has no TTY; `make -n serve` is quoted above as the evidence that
  the target's glob picks up `procs/30-gateway.yml` in sorted order. process-compose's API port was
  moved to 8899 for the same reason as the next item.
- **Non-default ports for this run only**, to avoid colliding with a task running beside this one:
  `ANVIL_PORT=8645`, `APP_PORT=3100`. `GATEWAY_PORT` stayed at the plan's default 8787. No committed
  default changed, which is why the pending wallet row above names 8545.
- **The readiness probe is the port, per TASK.md.** `MILESTONE.md`'s t02 row says it "probes
  readiness with a `curl` of the root"; TASK.md step 2 specifies the `/dev/tcp` port probe and gives
  the reason (the root host answers the gateway's own home page, not our document). TASK.md is the
  authority, so the port probe is what landed.

## Decisions

- The three-label host is **asserted** at 200 rather than merely noted. The plan measured it; as an
  assertion it will catch `handleSubdomain`'s parsing changing under a future pin bump, which a note
  would not.
- `gateway-check` prints the injected block's size but never asserts it, per the plan's "a different
  patch size is a finding, not a failure". The equality against `html()` is the only gate on that
  path, and it is size-independent.
- `tools/gateway.sh` derives the repo root from `BASH_SOURCE` and `cd`s there, rather than trusting
  the caller's directory. The plan warns about `devbox run --` for the `go build`; process-compose
  has its own notion of a working directory, and the `sed` of the template has the same exposure as
  the build does.
- The headless half is driven over CDP with node 24's global `WebSocket` rather than Playwright —
  see the first discovery below.

## Discoveries

- `AGENTS.md`'s headless-browser bullet is wrong on this host, in the direction that costs time: it
  says the cached Playwright chromium at `~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`
  "fails on `libnspr4.so` and two dozen other missing host libraries" and that the nix chromium is
  the one that launches. That arm64 binary launched fine and drove the whole origin table, while
  `/nix/store/*-chromium-1*/bin` does not exist at all. Not fixed here — it is prose outside this
  task's one paragraph.
- Relatedly, there is no `playwright` package anywhere outside the repo now, so that bullet's
  "run it from outside the repo" recipe has nothing to run. CDP over node's built-in `WebSocket`
  needs no package and is what the origin table came from.
- `devbox run -- git commit -m "<multi-line message>"` writes the newlines through as literal `\n`.
  `-F <file>` is the working form; the first commit on this branch was amended to fix it.
- A stray `anvil` from another task's tree is listening on `127.0.0.1:8599`. Left alone.
- The headless browser requested `/favicon.ico` from the gateway, which the gateway duly mapped to
  `web3://…/favicon.ico`. Harmless — the real favicon is a `data:` URI in `<head>` — but it means a
  gateway-served page makes one more contract call than the document needs.

## For M04 risks 1 and 2

- **Risk 1 — "the hosted gateway is not its README."** The *software* half is now settled, which is
  all this task claimed: the pinned `c5826718855a` of `ethstorage/web3url-gateway`, running our
  config against anvil, serves `App` correctly over the four-label host form, takes the ERC-5219
  `request()` path (`Web3-Contract-Return-Processing: decodeErc5219Request`) rather than `html()`,
  and needs nothing from `src/`. What remains for t04 is entirely about the *running service*: its
  chain list, and whether the hosted deployment injects the same `html.patch`. Nothing found here
  argues the hosted service will differ in the 5219 shape; it is the config that is unread.
- **Risk 2 — "a gateway-delivered document may not reach a wallet."** The feared mechanism is ruled
  out on the software side. The gateway serves the document as a **top-level page on a real origin**:
  `window.top === window` is `true`, and `location.origin` is
  `http://0x372e….31337.w3.localhost:8787` — not `null`, no sandboxed frame, no `data:` URI. So the
  opaque-origin failure state that would pass criterion 3 and block criterion 6 does not occur in
  this software. What is still unmeasured is narrower than the risk as filed: whether an extension
  injects `window.ethereum` into that origin, which needs a browser with a wallet (Denizen's half
  above), and whether the hosted service wraps what this one does not (t04).

## Open questions

- Step 5's wallet half is Denizen's to run and is left as the labelled pending row the plan permits;
  it is not a question so much as a booked measurement. No decision is blocked on it inside this
  task — the branch's gates all pass without it — but criterion 6 of M04 is, and so is the second
  half of risk 2.
