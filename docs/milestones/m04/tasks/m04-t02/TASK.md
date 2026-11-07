# m04-t02 — The gateway in the dev stack

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, `make serve` brings up a third process beside anvil and the dapp: the
[ethstorage/web3url-gateway](https://github.com/ethstorage/web3url-gateway), the software behind
w3link.io, serving the dev chain's `App` at `http://0x<App>.31337.w3.localhost:8787/`, and a
`make gateway-check` that proves what the architect rehearsed on 2026-11-07 — the ERC-5219 surface
works through a real gateway: `/` is `html()` plus one script block the gateway injects, `/widget.js`
is `app/dist/widget.js` byte for byte with `application/javascript`, and any other path is 404.
Denizen can then open the gateway URL in Chrome with MetaMask and measure the half no headless
browser can: whether a gateway-delivered document reaches a wallet. Nothing under `src/` moves; if
anything here needed a `src/` byte, that would be M03 reopened and the task stops.

## Plan

Every command runs from the repo root through `devbox run --` unless it says otherwise. **`devbox
run --` ignores the working directory** (m03-t07's lesson): a `go build` must `cd` inside the script
it runs, or it builds the wrong tree — the rehearsal hit exactly that on its first attempt. Branch
`m04/t02-gateway` from `origin/main` at or after `df74066`'s merge. Check hooks with `ls .git/hooks |
grep -v sample`. Rehearsed figures below are from a scratch build on this host on 2026-11-07; re-run
rather than quote.

0. **Preflight.** `devbox add go@1.27` → `devbox.json` gains `go@1.27` and `devbox run -- go
   version` prints `go version go1.27.1 linux/arm64` (nixpkgs' 1.27.1; the gateway's `go.mod` says
   `go 1.27.3` and built under 1.27.1 at rehearsal without a toolchain download — if a later commit
   insists, `GOTOOLCHAIN=auto` fetches it, and the handoff says which happened). `grep -n '^cache/'
   .gitignore` → `9:cache/`, so the clone and the binary below are untracked by construction.

   Check: `git status --porcelain` shows `devbox.json` and `devbox.lock` only.

1. **`tools/gateway.sh` — clone, build, configure, run.** One script, idempotent:
   - `GATEWAY_PIN=c5826718855a` (the repo's `main` on 2026-10-23, read at scoping; pin it, do not
     track `main`). If `cache/web3url-gateway/.git` is absent, `git clone` the repo there; then
     `git -C cache/web3url-gateway checkout -q $GATEWAY_PIN`.
   - `(cd cache/web3url-gateway && go build -o ../gateway-server ./cmd/server)` — **13 s** and a
     14.3 MB binary at rehearsal, skipped when the binary is newer than the pinned checkout.
   - Render `cache/gateway.toml` from the tracked template `procs/gateway.toml.tmpl` by substituting
     `$GATEWAY_PORT` and `$ANVIL_PORT` (sed; no envsubst in devbox). The template, verified working:

     ```toml
     ServerPort = "$GATEWAY_PORT"
     RunAsHttp = true
     IsBehindHttpsProxy = false
     HomePage = "/"
     CORS = "*"
     defaultChain = 31337
     requestLimit = 50
     [pageCache]
     enabled = false
     [nsDefaultChains]
     [name2chain]
     "anvil" = 31337
     [chainConfigs]
         [chainConfigs.31337]
         "ChainID" = 31337
         "RPC" = "http://127.0.0.1:$ANVIL_PORT"
     ```

     `pageCache.enabled = false` is load-bearing: the dev loop re-uploads the document and a cached
     page would hide it. No `dbToken`, so no InfluxDB.
   - `exec cache/gateway-server -config cache/gateway.toml`. It logs `Running server in unsecure
     mode...` and one line per request mapping the host form to the `web3://` URL.

   `mk/25-gateway.mk`: `GATEWAY_PORT ?= 8787`, exported like `APP_PORT`, plus the `gateway-check`
   target of step 3 and a `gateway` target that runs the script by hand.

   Check: `bash tools/gateway.sh` from a shell with anvil up serves; `ls cache/` shows the clone,
   the binary and the rendered config; `git status --porcelain` shows only tracked additions.

2. **`procs/30-gateway.yml`.** Same shape as `procs/20-dapp.yml`: process `gateway`, command
   `bash tools/gateway.sh`, `depends_on: deploy: condition: process_completed_successfully`,
   `availability.restart: on_failure`, readiness probe `exec` of
   `bash -c 'exec 3<>/dev/tcp/127.0.0.1/$GATEWAY_PORT'` with a 2 s period (the root host alone
   answers the gateway's home page, which is not our document, so the probe is the port, not a
   body). `make serve` already globs `procs/*.yml` (`mk/10-forge.mk:22`); nothing else changes.

   Check: `make serve` (with a TTY, or `process-compose … up -t=false`) shows `gateway` healthy
   after `deploy` completes, and `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8787/`
   is not `000`.

3. **`make gateway-check` — the measurement, as a target.** `tools/gateway-check.sh`, bash, reads
   `APP` from `make addresses` (or `$APP`), lower-cases it, sets
   `H=$APP.31337.w3.localhost`, and with `curl --resolve $H:$GATEWAY_PORT:127.0.0.1`:
   - `GET /` → `HTTP/1.1 200`, `Content-Type: text/html; charset=utf-8`, and the response headers
     `Web3-Resolve-Mode: resourceRequest`, `Web3-Mode-Auto-Method: request`,
     `Web3-Contract-Return-Processing: decodeErc5219Request` — the proof the gateway took the
     5219 path and not `html()` (all four seen at rehearsal). **The body is not `html()` verbatim:**
     the gateway inserts one `<script>` block, `cmd/server/html.patch` at the pin ("Patch by
     web3url-gateway: Convert web3:// URLs into gateway URLs"; a `fetch` wrapper, a click handler
     and a `MutationObserver` on `body`), **7,871 bytes plus one newline, immediately after
     `<body>`**. Measured: the body with that block and its newline removed is byte-equal to
     `cast call $APP "html()(string)"` decoded. The check removes the block by its first and last
     lines and compares; a different patch size is a finding, not a failure, and the check prints
     the size it removed.
   - `GET /widget.js` → `200`, `Content-Type: application/javascript; charset=utf-8`, body
     `cmp`-equal to `app/dist/widget.js` (8,043 bytes at rehearsal).
   - `GET /nope` → `404`.
   - The three-label form `$APP.31337.localhost` also answers `/widget.js` with `200` (measured),
     because the gateway reads the last two labels as its own host and the one before as the
     address and falls back to `defaultChain`; the four-label form is the one documented, because it
     is the one the hosted gateway's URL has.

   Check: the target exits 0 against the running stack and prints each assertion with its measured
   value; against a stopped gateway it exits non-zero on the first `curl`.

4. **Write it down where the next session reads.** `AGENTS.md` § The dapp gains one paragraph:
   the gateway's URL form, that `*.localhost` resolves to loopback in Chrome but `curl` needs
   `--resolve`, the injected block and `make gateway-check`. `RUNBOOK.md` is not touched (the
   hosted gateway is t04's).

   Check: `grep -c 'w3.localhost' AGENTS.md` ≥ 1.

5. **The wallet half, for Denizen, written as a script.** In the handoff § For Denizen: open
   `http://0x<App>.31337.w3.localhost:8787/` in Chrome with MetaMask on the dev chain
   (`chainId 31337`, RPC `http://127.0.0.1:8545`), then in DevTools: `window.top === window`
   (expect `true`), `typeof window.ethereum` (expect `object`), `location.origin` (expect the
   four-label host, not `null`); connect, and send one transaction from the page (a `distribute` on
   the seeded distribution is the cheapest); paste the three answers and the hash into the handoff
   as his, dated. The engineer runs the same three expressions in headless chromium (no wallet, so
   the second is `undefined`) and records them, so the origin question is answered twice.

   Check: the handoff has both tables, or the engineer's and an empty row labelled "Denizen:
   pending" that the architect fills at review.

6. **`HANDOFF.md`** from the handbook template beside this file: the AC table with the figures
   measured on the branch head, § Deviations, and § For M04 risks 1 and 2 — one sentence each on
   what this task settled about the software and what it leaves for t04 to settle about the hosted
   service.

## Acceptance criteria

- `make serve` brings up `gateway` after `deploy`; `make gateway-check` exits 0 and prints, for `/`:
  status 200, `text/html`, the three `Web3-*` headers above, and the injected block's size; for
  `/widget.js`: 200, `application/javascript`, `cmp` silent against `app/dist/widget.js`; for
  `/nope`: 404.
- The body of `/` with the injected block removed equals `html()`: the check's comparison line
  reads `equal`, with both byte counts printed (56,754 and 56,754 + block at rehearsal, for a
  different bundle; the numbers move with the bundle, the equality does not).
- `devbox.json` has `go@1.27`; `cache/` holds the clone, binary and config and `git status
  --porcelain` is empty after `make serve` has run; `tools/gateway.sh`, `tools/gateway-check.sh`,
  `procs/30-gateway.yml`, `procs/gateway.toml.tmpl`, `mk/25-gateway.mk` are tracked.
- `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` is empty; `forge test` 91,
  `node --test test/*.test.mjs` unchanged from `main` (this task adds no node test; it adds a make
  target that is itself the test).
- `grep -c 'w3.localhost' AGENTS.md` ≥ 1.
- The handoff holds the headless origin table and Denizen's wallet table (or the labelled pending
  row), and § For M04 risks 1 and 2.

## Out of scope

- Anything under `src/`. If the gateway rejects `request()`'s shape — it did not at rehearsal —
  stop and report; the fix is a new `App` address and Denizen's decision.
- The hosted w3link.io (t04), any testnet, Freedom or another native client.
- Making the gateway's injected block go away (it is the gateway's, and the hosted one presumably
  injects the same; t04 measures that).
- The `/host` dev page and `#/docs`: the snippet there names the hosted form, which is right.

## Open questions

None.

## Context

- The architect's rehearsal, 2026-11-07, scratch build outside the repo: Go 1.27.1 from nixpkgs,
  gateway `c582671`, build 13 s, binary 14.3 MB; `/` 200 `text/html` with the 5219 headers;
  `/widget.js` 200 `application/javascript`, byte-identical to `app/dist/widget.js`; `/nope` 404;
  the injected block 7,871 bytes after `<body>`; body minus block equal to `html()`.
- `handleSubdomain`, `cmd/server/protocol.go:416-516` at the pin — why four labels.
- `ROADMAP.md` decision 19 (the snippet names a 5219 gateway; Freedom reads `html()` for every path).
- M04 `MILESTONE.md` risks 1 and 2, which this task rewrites through its handoff.
