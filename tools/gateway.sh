#!/usr/bin/env bash
# Clone, build, configure and run the ERC-5219 gateway the dev stack serves the on-chain `App`
# through: ethstorage/web3url-gateway, the software behind w3link.io. Run through devbox, from the
# repo root — or let `make serve` run it as the `gateway` process:
#
#   devbox run -- tools/gateway.sh
#   GATEWAY_PORT=9000 devbox run -- tools/gateway.sh
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

# No envsubst in devbox, so sed. Only the two ports vary; everything else about the config is a
# property of the dev chain and lives in the tracked template.
sed -e "s|\$GATEWAY_PORT|$GATEWAY_PORT|g" \
    -e "s|\$ANVIL_PORT|$ANVIL_PORT|g" \
    procs/gateway.toml.tmpl >"$conf"

echo "gateway: serving chain 31337 at http://127.0.0.1:$GATEWAY_PORT (RPC http://127.0.0.1:$ANVIL_PORT)"
exec "$bin" -config "$conf"
