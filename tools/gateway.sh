#!/usr/bin/env bash
# Clone, build, configure and run the ERC-5219 gateway the dev stack serves the on-chain `App`
# through: ethstorage/web3url-gateway, the software behind w3link.io. Run through devbox, from the
# repo root — or let `make serve` run it as the `gateway` process:
#
#   devbox run -- tools/gateway.sh
#   GATEWAY_PORT=9000 devbox run -- tools/gateway.sh
#
# The chain it serves is a parameter, defaulting to the dev chain, so the same build at the same pin
# can be pointed at a public node for one chain — the authenticated path decision 53 names, used when
# a hosted gateway is serving a stale document:
#
#   GATEWAY_CHAIN_ID=11155111 GATEWAY_RPC=https://ethereum-sepolia-rpc.publicnode.com \
#     GATEWAY_PORT=8799 devbox run -- tools/gateway.sh
#
# Named `GATEWAY_*` like every other parameter here, and deliberately not `CHAIN_ID`/`RPC`: those are
# `mk/10-forge.mk`'s and `RUNBOOK.md` § 0 exports them, so a shell set up for a testnet deploy would
# silently aim the dev stack's gateway at that testnet.
#
# Idempotent and incremental: the clone happens once, the checkout is a fixed pin, and the build is
# skipped while the binary is newer than the pinned tree. Everything it writes lands in `cache/`,
# which `.gitignore` already covers, so a run leaves `git status --porcelain` empty.
#
# The toolchain, measured rather than assumed: the pin's `go.mod` says `go 1.27.3` and devbox pins
# `go@1.27`, which is nixpkgs' 1.27.1. The build therefore does NOT run under 1.27.1 —
# `GOTOOLCHAIN=local go build` refuses with "go.mod requires go >= 1.27.3". The default
# `GOTOOLCHAIN=auto` downloads a 1.27.3 toolchain (~72 MB, once, into GOMODCACHE) and compiles with
# that, so `go version` prints 1.27.1 at the repo root and 1.27.3 inside the clone. The first build
# on a fresh machine needs network access for that fetch.
#
# This script execs the server in the foreground: it is a process-compose process, not a daemon.
set -euo pipefail

# The gateway's `main` as of 2026-10-23, read at scoping. Pinned, deliberately not tracking `main`:
# the injected HTML patch and the subdomain parsing this task measures are both properties of a
# revision, and `make gateway-check` asserts sizes that a silent upgrade would move.
GATEWAY_PIN=${GATEWAY_PIN:-c5826718855a}
GATEWAY_REPO=${GATEWAY_REPO:-https://github.com/ethstorage/web3url-gateway}

GATEWAY_PORT=${GATEWAY_PORT:-8787}
ANVIL_PORT=${ANVIL_PORT:-8545}

# The chain under test. Both default to anvil's, so `make serve` renders the same config it always
# did; `ANVIL_PORT` stays in the default rather than being baked, so overriding it still moves the RPC.
GATEWAY_CHAIN_ID=${GATEWAY_CHAIN_ID:-31337}
GATEWAY_RPC=${GATEWAY_RPC:-http://127.0.0.1:$ANVIL_PORT}

# The template's `[name2chain]` alias takes the chain id too, and has to: the pin validates the table
# at startup and an alias naming a chain `[chainConfigs]` does not carry is fatal, not inert —
#   level=fatal msg="Chain short name anvil is defined, but its chain is not"
# — measured here on 11155111 before this line existed. So `anvil` reads as "the chain this local
# gateway serves", which is the only chain it ever has, rather than becoming a third parameter.

# `devbox run --` ignores the working directory and runs from the project root (m03-t07's lesson),
# and process-compose has its own notion of one. Neither is trusted: the root is derived from where
# this file sits, and the `go build` below cds into the clone itself.
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"

src=cache/web3url-gateway
bin=cache/gateway-server
conf=cache/gateway.toml

mkdir -p cache

if [ ! -d "$src/.git" ]; then
  echo "gateway: cloning $GATEWAY_REPO into $src"
  git clone -q "$GATEWAY_REPO" "$src"
fi
git -C "$src" checkout -q "$GATEWAY_PIN"

# Rebuild only when the checkout is newer than the binary. `git checkout` touches the files it
# changes, so a pin bump moves the tree's mtime and this notices.
if [ ! -x "$bin" ] || [ -n "$(find "$src" -name '*.go' -newer "$bin" -print -quit)" ]; then
  echo "gateway: building $bin from $src at $GATEWAY_PIN"
  (cd "$src" && go build -o "../gateway-server" ./cmd/server)
fi

# No envsubst in devbox, so sed. The port, the chain and its RPC vary; everything else about the
# config is a property of the gateway's own behaviour and lives in the tracked template. `$ANVIL_PORT`
# is no longer substituted here because it is no longer in the template: it reaches the config inside
# `GATEWAY_RPC`'s default, already expanded.
#
# sed reads `&` in a replacement as the whole match and `|` as the delimiter, and an RPC URL can
# carry either in an API key. Escaped, so the config holds the URL that was passed.
esc_rpc=$(printf '%s' "$GATEWAY_RPC" | sed -e 's/[\\&|]/\\&/g')
sed -e "s|\$GATEWAY_PORT|$GATEWAY_PORT|g" \
    -e "s|\$GATEWAY_CHAIN_ID|$GATEWAY_CHAIN_ID|g" \
    -e "s|\$GATEWAY_RPC|$esc_rpc|g" \
    procs/gateway.toml.tmpl >"$conf"

echo "gateway: serving chain $GATEWAY_CHAIN_ID at http://127.0.0.1:$GATEWAY_PORT (RPC $GATEWAY_RPC)"
exec "$bin" -config "$conf"
