#!/usr/bin/env bash
# Prove the ERC-5219 surface works through a real gateway — not through our own reader. Run against
# the stack `make serve` brings up:
#
#   devbox run -- make gateway-check
#   APP=0x... devbox run -- tools/gateway-check.sh
#
# Or against a hosted gateway, by giving GATEWAY_BASE a full origin with no trailing slash and RPC
# the chain that origin serves:
#
#   APP=0x... RPC=https://... GATEWAY_BASE=https://<app>.<chainId>.w3link.io \
#     devbox run -- make gateway-check
#
# The hosted case is a mode, not a fork: the same assertions over the same strip-and-compare, since
# the equality below is the thing that must not drift between the two.
#
# A base on loopback is the project's own gateway build serving a chain other than the dev one
# (`tools/gateway.sh`'s GATEWAY_CHAIN_ID/GATEWAY_RPC). It goes through the hosted mode, because the
# base is handed over whole:
#
#   APP=0x... RPC=https://ethereum-sepolia-rpc.publicnode.com \
#     GATEWAY_BASE=http://<app>.11155111.w3.localhost:8799 devbox run -- make gateway-check
#
# CHAIN_ID names the chain in the dev mode's host labels and defaults to the dev chain, so the
# command above and `make gateway-check` against `make serve` both work unchanged.
#
# What it asserts, each with the value it measured:
#   GET /          200, text/html, the three Web3-* headers that prove the 5219 path was taken
#                  (not `html()`), and — after removing the block the gateway injects — a body that
#                  is byte-equal to what `html()` returns on chain.
#   GET /widget.js 200, application/javascript, byte-equal to app/dist/widget.js.
#   GET /nope      404.
#   The three-label host answers /widget.js too, which is why the four-label one is documented.
#
# `*.localhost` resolves to loopback in Chrome but not in curl, hence `--resolve` on every request.
#
# The injected block is the gateway's, not ours: `cmd/server/html.patch` at the pin, inserted
# immediately after `<body>`'s `>` (`cmd/server/protocol.go:678`). Its size is reported, never
# asserted — a different size is a finding for the next session, not a failing gate. The equality
# below is the gate.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"

GATEWAY_PORT=${GATEWAY_PORT:-8787}
ANVIL_PORT=${ANVIL_PORT:-8545}
RPC=${RPC:-http://127.0.0.1:$ANVIL_PORT}
GATEWAY_BASE=${GATEWAY_BASE:-}
CHAIN_ID=${CHAIN_ID:-31337}

# A hosted gateway serves one chain, and `html()` read from anvil and compared to a testnet gateway
# is exactly the silent wrong-chain comparison this check exists to catch. So RPC must be named
# explicitly, and this refuses before it reaches the network — not after a green run on nothing.
if [ -n "$GATEWAY_BASE" ] && [ "$RPC" = "http://127.0.0.1:$ANVIL_PORT" ]; then
  echo "gateway-check: GATEWAY_BASE=$GATEWAY_BASE needs RPC set to the chain that base serves;" >&2
  echo "               RPC is unset or still the loopback default ($RPC)." >&2
  exit 1
fi

fails=0
ok()   { printf '  ok      %s: %s\n' "$1" "$2"; }
bad()  { printf '  FAIL    %s: %s\n' "$1" "$2"; fails=$((fails + 1)); }
note() { printf '  measured %s: %s\n' "$1" "$2"; }

# `is` compares a measured value with the one expected; `starts` tolerates the charset parameter a
# Content-Type carries, and prints the whole header either way.
is()     { if [ "$2" = "$3" ]; then ok "$1" "$2"; else bad "$1" "$2 (expected $3)"; fi; }
starts() { case "$2" in "$3"*) ok "$1" "$2";; *) bad "$1" "$2 (expected $3...)";; esac; }

if [ -z "${APP:-}" ]; then
  APP=$(make --no-print-directory addresses | awk '$1=="App"{print $2}')
fi
[ -n "${APP:-}" ] || { echo "gateway-check: no App address — 'make deploy' first, or pass APP="; exit 1; }

# The host form the hosted gateway's URL has: <address>.<chainId>.w3.<gateway host>. The chain label
# is CHAIN_ID so a local gateway serving another chain is addressable; at the default these are the
# `31337` hosts they have always been.
app=$(printf '%s' "$APP" | tr 'A-Z' 'a-z')
H=$app.$CHAIN_ID.w3.localhost
H3=$app.$CHAIN_ID.localhost

# curl resolves neither `localhost` subdomains nor the four-label form — Chrome does, curl does not —
# so the dev mode has always passed `--resolve`. A GATEWAY_BASE on loopback needs the same, or the
# request dies in resolution and reads exactly like a gateway that is not running. Derived from the
# base rather than taken as another parameter: the base already carries the host and the port.
resolve=()
if [ -n "$GATEWAY_BASE" ]; then
  hostport=${GATEWAY_BASE#*://}; hostport=${hostport%%/*}
  bhost=${hostport%%:*}; bport=${hostport##*:}
  if [ "$bport" = "$bhost" ]; then
    case $GATEWAY_BASE in https://*) bport=443;; *) bport=80;; esac
  fi
  case $bhost in
    localhost|*.localhost|127.0.0.1) resolve=(--resolve "$bhost:$bport:127.0.0.1");;
  esac
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# One place that knows how to reach the gateway, so a stopped gateway fails here and nowhere else.
fetch() { # fetch <host> <path> <headers-out> <body-out>
  if [ -n "$GATEWAY_BASE" ]; then
    curl -s -D "$3" -o "$4" ${resolve[@]+"${resolve[@]}"} "$GATEWAY_BASE$2" \
      || { echo "gateway-check: no gateway at $GATEWAY_BASE (asked for $GATEWAY_BASE$2)"; exit 1; }
  else
    curl -s -D "$3" -o "$4" --resolve "$1:$GATEWAY_PORT:127.0.0.1" "http://$1:$GATEWAY_PORT$2" \
      || { echo "gateway-check: no gateway at http://127.0.0.1:$GATEWAY_PORT ('make serve' starts one)"; exit 1; }
  fi
}
status() { sed -n '1s/\r$//p' "$1" | awk '{print $2}'; }
header() { grep -i "^$2:" "$1" | sed 's/\r$//' | head -1 | cut -d' ' -f2-; }

# The hosted service's caching, measured and never asserted: a `hit` carrying the old document after
# an upload is a finding for the session that uploaded, not a failing gate. The dev gateway sends
# neither header, so this stays quiet unless a hosted base asked for it.
cache_note() { # cache_note <path> <headers-out>
  [ -n "$GATEWAY_BASE" ] || return 0
  local cs age
  cs=$(header "$2" Web3UrlGateway-Cache-Status || true)
  age=$(header "$2" Age || true)
  note "cache headers $1" "web3urlgateway-cache-status: ${cs:-(absent)}, age: ${age:-(absent)}"
}

if [ -n "$GATEWAY_BASE" ]; then
  echo "gateway-check: App $APP via $GATEWAY_BASE/ (hosted; html() from $RPC)"
  [ ${#resolve[@]} -eq 0 ] || echo "               ${resolve[*]} (loopback base)"
else
  echo "gateway-check: App $APP via http://$H:$GATEWAY_PORT/"
fi

echo "GET / — the document"
fetch "$H" "/" "$tmp/h" "$tmp/root.html"
is     "status"                          "$(status "$tmp/h")" 200
starts "content-type"                    "$(header "$tmp/h" Content-Type)" "text/html"
is     "web3-resolve-mode"               "$(header "$tmp/h" Web3-Resolve-Mode)" resourceRequest
is     "web3-mode-auto-method"           "$(header "$tmp/h" Web3-Mode-Auto-Method)" request
is     "web3-contract-return-processing"  "$(header "$tmp/h" Web3-Contract-Return-Processing)" decodeErc5219Request
cache_note "/" "$tmp/h"

# `html()` byte-exactly: the raw ABI return, not a `cast` string decode, whose escaping would make a
# byte comparison meaningless. Offset word, then length word, then the bytes.
raw=$(cast call "$APP" "html()" --rpc-url "$RPC")
hex=${raw#0x}
len=$((16#${hex:64:64}))
printf '%s' "${hex:128:$((len * 2))}" | xxd -r -p >"$tmp/html.bin"

# The block starts at `<script>` right after `<body>`'s `>` and ends with `</script>` plus the one
# newline that closes html.patch. Minification puts `<body><script>` on one line, so this is a byte
# span, not a line range. No JS can contain a literal `</script>`, so the first one is the closer.
# `tail` writes to a file rather than into `grep -m1`: past the 64 KiB pipe buffer — which a 69 KB
# document is — the early-exiting grep leaves tail with a SIGPIPE, and `pipefail` makes that the
# status of the assignment, so the strip died with 141 on a body it had read correctly.
body_off=$(grep -abo -m1 '<body>' "$tmp/root.html" | head -1 | cut -d: -f1)
start=$((body_off + 6))
tail -c +$((start + 1)) "$tmp/root.html" >"$tmp/after-body"
rel=$(grep -abo -m1 '</script>' "$tmp/after-body" | head -1 | cut -d: -f1)
removed=$((rel + 10))
{ head -c "$start" "$tmp/root.html"; tail -c +$((start + removed + 1)) "$tmp/root.html"; } >"$tmp/stripped.html"

note "served bytes"        "$(wc -c <"$tmp/root.html")"
note "injected block bytes" "$removed (the gateway's cmd/server/html.patch, after <body>)"
note "body minus block"    "$(wc -c <"$tmp/stripped.html")"
note "html() bytes"        "$(wc -c <"$tmp/html.bin")"
if cmp -s "$tmp/stripped.html" "$tmp/html.bin"; then
  ok "body minus block vs html()" "equal"
else
  bad "body minus block vs html()" "differs"
fi

echo "GET /widget.js — the resource"
fetch "$H" "/widget.js" "$tmp/hw" "$tmp/widget.js"
is     "status"       "$(status "$tmp/hw")" 200
starts "content-type" "$(header "$tmp/hw" Content-Type)" "application/javascript"
cache_note "/widget.js" "$tmp/hw"
note   "served bytes" "$(wc -c <"$tmp/widget.js")"
note   "app/dist/widget.js bytes" "$(wc -c <app/dist/widget.js)"
if cmp -s "$tmp/widget.js" app/dist/widget.js; then
  ok "cmp vs app/dist/widget.js" "identical"
else
  bad "cmp vs app/dist/widget.js" "differs"
fi

echo "GET /nope — anything else"
fetch "$H" "/nope" "$tmp/hn" "$tmp/nope"
is "status" "$(status "$tmp/hn")" 404

# Documented because it is surprising, not because it is the form to use: the gateway reads the last
# two labels as its own host and the one before as the address, then falls back to defaultChain.
# On a hosted service that fallback is its default chain, not ours, so there is nothing here to
# assert about a base the caller handed us whole.
if [ -n "$GATEWAY_BASE" ]; then
  echo "GET /widget.js on the three-label host"
  printf "  skipped: three-label form is the dev gateway's\n"
else
  echo "GET /widget.js on the three-label host $H3"
  fetch "$H3" "/widget.js" "$tmp/h3" "$tmp/w3.js"
  is "status" "$(status "$tmp/h3")" 200
fi

if [ "$fails" -eq 0 ]; then
  echo "gateway-check: all assertions passed"
else
  echo "gateway-check: $fails assertion(s) failed"
  exit 1
fi
