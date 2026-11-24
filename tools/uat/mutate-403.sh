#!/usr/bin/env bash
# Mutation run for #403. Each reverts one site to reading through the wallet, or one guard to its old
# form; at least one test must fail for each. The baseline is checked green first — `node --test test/`
# reads the directory as one phantom test and would make every result meaningless.
set -uo pipefail
cd ~/src/rake
PAGE=app/src/index.html
cp "$PAGE" /tmp/page-403.orig
trap 'cp /tmp/page-403.orig "$PAGE"' EXIT
suite() { devbox run -- node --test test/*.test.mjs 2>&1; }
failcount() { printf '%s' "$1" | sed -n 's/^. fail \([0-9]*\)$/\1/p' | tail -1; }
base=$(suite)
[ "$(failcount "$base")" = "0" ] || { echo "BASELINE NOT GREEN"; printf '%s' "$base" | grep -E '^. (tests|pass|fail) '; exit 2; }
echo "baseline: $(printf '%s' "$base" | sed -n 's/^. \(pass [0-9]*\)$/\1/p' | tail -1), fail 0"
run() {
  local name="$1" from="$2" to="$3"
  cp /tmp/page-403.orig "$PAGE"
  python3 - "$PAGE" "$from" "$to" <<'PY' || { echo "SKIP  $name (anchor not found)"; return; }
import sys
p, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p).read()
assert s.count(a) == 1, f"anchor appears {s.count(a)} times"
open(p, 'w').write(s.replace(a, b))
PY
  local out fails
  out=$(suite); fails=$(failcount "$out")
  if [ "${fails:-0}" -gt 0 ]; then
    echo "CAUGHT ($fails) $name"
    printf '%s' "$out" | sed -n '/^✖ failing tests:/,$p' | grep -E '^✖ ' | grep -v 'failing tests' \
      | sed 's/ ([0-9.]*ms)$//' | sort -u | head -4 | sed 's/^/         /'
  else
    echo "SURVIVED $name"
  fi
}
run "every eth_call back through the wallet" \
    "const call = async (to, sig, args, types) => Eth.dec(types, await pageRead().request({ method: 'eth_call'" \
    "const call = async (to, sig, args, types) => Eth.dec(types, await P.request({ method: 'eth_call'"
run "the clock back through the wallet (the #402 boot failure)" \
    "const b = await pageRead().request({ method: 'eth_getBlockByNumber', params: ['latest', false] })" \
    "const b = await P.request({ method: 'eth_getBlockByNumber', params: ['latest', false] })"
run "the receipt poll back through the wallet" \
    "const rc = await pageRead().request({ method: 'eth_getTransactionReceipt', params: [hash] }); if (rc) return rc;" \
    "const rc = await P.request({ method: 'eth_getTransactionReceipt', params: [hash] }); if (rc) return rc;"
run "the deadline ask removed, so a landed write reads as a timeout" \
    "if (rc) { POLL_LAGGED = true; return rc; }" "if (rc) { POLL_LAGGED = false; }"
run "the deadline ask made general, polling the wallet throughout" \
    "if (P && P !== pageRead()) {" "if (false) {"
run "the docs demo choosing on a wallet existing again" \
    "const rpc = WRPC || PUBLIC_RPC[CFG.chainId] || '', first = input.value;" \
    "const rpc = WRPC || (window.ethereum ? '' : PUBLIC_RPC[CFG.chainId] || ''), first = input.value;"
run "the landing widget choosing on a wallet existing again" \
    "const rpc = WRPC || PUBLIC_RPC[CFG.chainId] || '';" \
    "const rpc = WRPC || (WALLET ? '' : PUBLIC_RPC[CFG.chainId] || '');"
run "the boot gate restored, so a wrong chain blanks the page" \
    "  await readClock();" "  if (wrongChain()) return;\n  await readClock();"
run "the route gate restored" \
    "$(printf 'chainBar();\n  if (S.error)')" \
    "$(printf "if (wrongChain()) { V.innerHTML = notice('wrong chain'); return; }\n  if (S.error)")"
run "the chain bar silenced, so a wrong chain is only in the pill" \
    "  if (!wrongChain()) { el.hidden = true; el.innerHTML = ''; return; }" \
    "  if (true) { el.hidden = true; el.innerHTML = ''; return; }"
run "a distribution's code read through the wallet" \
    "async function loadDistro(addr) {
  const code = await pageRead().request" \
    "async function loadDistro(addr) {
  const code = await P.request"

# The architect's review of #403: the one place a wallet could still stop the page.
run "load()'s eth_chainId unguarded again, so a wallet blanks the page" \
    "  try { CHAIN = asChain(await P.request({ method: 'eth_chainId' })); } catch (e) { CHAIN = null; }" \
    "  CHAIN = asChain(await P.request({ method: 'eth_chainId' }));"
