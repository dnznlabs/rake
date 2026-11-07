#!/usr/bin/env bash
# Prove the ERC-5219 surface works through a real gateway — not through our own reader. Run against
# the stack `make serve` brings up:
#
#   devbox run -- make gateway-check
#   APP=0x... devbox run -- tools/gateway-check.sh
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

# The host form the hosted gateway's URL has: <address>.<chainId>.w3.<gateway host>.
app=$(printf '%s' "$APP" | tr 'A-Z' 'a-z')
H=$app.31337.w3.localhost
H3=$app.31337.localhost

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# One place that knows how to reach the gateway, so a stopped gateway fails here and nowhere else.
fetch() { # fetch <host> <path> <headers-out> <body-out>
  curl -s -D "$3" -o "$4" --resolve "$1:$GATEWAY_PORT:127.0.0.1" "http://$1:$GATEWAY_PORT$2" \
    || { echo "gateway-check: no gateway at http://127.0.0.1:$GATEWAY_PORT ('make serve' starts one)"; exit 1; }
}
status() { sed -n '1s/\r$//p' "$1" | awk '{print $2}'; }
header() { grep -i "^$2:" "$1" | sed 's/\r$//' | head -1 | cut -d' ' -f2-; }

echo "gateway-check: App $APP via http://$H:$GATEWAY_PORT/"

echo "GET / — the document"
fetch "$H" "/" "$tmp/h" "$tmp/root.html"
is     "status"                          "$(status "$tmp/h")" 200
starts "content-type"                    "$(header "$tmp/h" Content-Type)" "text/html"
is     "web3-resolve-mode"               "$(header "$tmp/h" Web3-Resolve-Mode)" resourceRequest
is     "web3-mode-auto-method"           "$(header "$tmp/h" Web3-Mode-Auto-Method)" request
is     "web3-contract-return-processing"  "$(header "$tmp/h" Web3-Contract-Return-Processing)" decodeErc5219Request

# `html()` byte-exactly: the raw ABI return, not a `cast` string decode, whose escaping would make a
# byte comparison meaningless. Offset word, then length word, then the bytes.
raw=$(cast call "$APP" "html()" --rpc-url "$RPC")
hex=${raw#0x}
len=$((16#${hex:64:64}))
printf '%s' "${hex:128:$((len * 2))}" | xxd -r -p >"$tmp/html.bin"

# The block starts at `<script>` right after `<body>`'s `>` and ends with `</script>` plus the one
# newline that closes html.patch. Minification puts `<body><script>` on one line, so this is a byte
# span, not a line range. No JS can contain a literal `</script>`, so the first one is the closer.
body_off=$(grep -abo -m1 '<body>' "$tmp/root.html" | head -1 | cut -d: -f1)
start=$((body_off + 6))
rel=$(tail -c +$((start + 1)) "$tmp/root.html" | grep -abo -m1 '</script>' | head -1 | cut -d: -f1)
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
echo "GET /widget.js on the three-label host $H3"
fetch "$H3" "/widget.js" "$tmp/h3" "$tmp/w3.js"
is "status" "$(status "$tmp/h3")" 200

if [ "$fails" -eq 0 ]; then
  echo "gateway-check: all assertions passed"
else
  echo "gateway-check: $fails assertion(s) failed"
  exit 1
fi
