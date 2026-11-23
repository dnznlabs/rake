#!/usr/bin/env bash
# Mutation run for #400: each mutation reverts one half of the change, and at least one test must
# fail for each. A surviving mutation is an assertion that cannot fail. Not part of CI; run by hand.
#
# `node --test test/` is **not** the suite: node reads the directory as one test file, runs a single
# phantom test named `test` and fails it, which looks exactly like a caught mutation. The first
# version of this script used it and reported all seven caught against a baseline that was already
# red. The suite is the glob, the way `tools/node-test.sh` is called, and the baseline is checked
# green before any mutation is applied.
set -uo pipefail
cd "$(dirname "$0")/../.."
PAGE=app/src/index.html
cp "$PAGE" /tmp/page-400.orig
trap 'cp /tmp/page-400.orig "$PAGE"' EXIT

suite() { devbox run -- node --test test/*.test.mjs 2>&1; }
failcount() { printf '%s' "$1" | sed -n 's/^. fail \([0-9]*\)$/\1/p' | tail -1; }

base=$(suite)
if [ "$(failcount "$base")" != "0" ]; then
  echo "BASELINE IS NOT GREEN — no mutation result below would mean anything:"
  printf '%s' "$base" | grep -E '^. (tests|pass|fail|skipped) |^✖ ' | head -20
  exit 2
fi
echo "baseline: $(printf '%s' "$base" | sed -n 's/^. \(pass [0-9]*\)$/\1/p' | tail -1), fail 0"

run() {
  local name="$1" from="$2" to="$3"
  cp /tmp/page-400.orig "$PAGE"
  python3 - "$PAGE" "$from" "$to" <<'PY' || { echo "SKIP  $name (anchor not found)"; return; }
import sys
p, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p).read()
assert s.count(a) == 1, f"anchor appears {s.count(a)} times"
open(p, 'w').write(s.replace(a, b))
PY
  local out fails
  out=$(suite)
  fails=$(failcount "$out")
  if [ "${fails:-0}" -gt 0 ]; then
    echo "CAUGHT ($fails) $name"
    printf '%s' "$out" | sed -n '/^✖ failing tests:/,$p' | grep -E '^✖ ' \
      | grep -v 'failing tests' | sed 's/ ([0-9.]*ms)$//' | sort -u | sed 's/^/         /'
  else
    echo "SURVIVED $name"
  fi
}

run "first read routed back through the wallet (P)" \
    'history(addr, from, hi, pageRead())' 'history(addr, from, hi, P)'
run "press routed through the page instead of the wallet" \
    'histLogs(d.addr, from, to, WALLET ? P : pageRead())' 'histLogs(d.addr, from, to, pageRead())'
run "Created scan passes the provider one slot early" \
    'CFG.factoryBlock, null, P)' 'CFG.factoryBlock, P)'
run "the walk takes its window from P again, not its argument" \
    'let size = (prov && prov.logWindow) || WINDOW_START' 'let size = (P && P.logWindow) || WINDOW_START'
run "window1 ignores its provider argument" \
    'function window1(address, topics, a, b, prov) {' 'function window1(address, topics, a, b, prov) { prov = P;'
run "the heads claim a whole read for any wallet again" \
    'const readWhole = () => !!(DS.h && DS.h.partial == null && DS.h.whole);' \
    'const readWhole = () => !!WALLET;'
run "the floor search exempts a wallet from the day again" \
    'const own = ownFloor(d);' \
    'const own = ownFloor(d); if (WALLET) return own;'

# The press on a finished day read, and the boundary it continues from — #400's own first head had
# neither, and the token list was telling a wallet to use a control that was not painted.
run "a wallet whose day read finished is offered no press" \
    'return (DS.h && DS.h.partial == null) ? `<div class="help">this read covers the last 24 hours${press()}</div>` : '"''"';' \
    "return '';"
run "the press takes its top block from partial alone, as it did before the day read" \
    'const to = (DS.h.partial != null ? DS.h.partial : DS.h.from) - 1;' \
    'const to = DS.h.partial - 1;'
run "a finished span is read as a finished history" \
    'const readWhole = () => !!(DS.h && DS.h.partial == null && DS.h.whole);' \
    'const readWhole = () => !!(DS.h && DS.h.partial == null);'
run "the first read claims to have read the whole history" \
    'whole: from <= ownFloor(d)' 'whole: true'

# The seam between the two reads: one block out either way is silent, and nothing downstream can see
# it. `histOf` sorts and groups; it does not deduplicate and cannot know which blocks were asked for.
run "the seam overlaps by one block, so an event is listed twice" \
    'const to = (DS.h.partial != null ? DS.h.partial : DS.h.from) - 1;' \
    'const to = (DS.h.partial != null ? DS.h.partial : DS.h.from);'
run "the seam skips one block, so an event is lost" \
    'const to = (DS.h.partial != null ? DS.h.partial : DS.h.from) - 1;' \
    'const to = (DS.h.partial != null ? DS.h.partial : DS.h.from) - 2;'
run "the join puts the halves back in the wrong order" \
    'logs: [...older_.logs, ...newer_.logs]' 'logs: [...newer_.logs, ...older_.logs]'

# The architect's review, 2026-11-23: the day floor's two block reads belong to the page's chain, and
# the Created scan behind the "mine" tab belongs to the wallet, where the depth is.
run "the day floor is read through the wallet again" \
    "const b = await pageRead().request({ method: 'eth_getBlockByNumber'" \
    "const b = await P.request({ method: 'eth_getBlockByNumber'"
run "the chain head is read through the wallet again" \
    "HEAD = pageRead().request({ method: 'eth_blockNumber' })" \
    "HEAD = P.request({ method: 'eth_blockNumber' })"
run "the mine tab is moved to the page, where it cannot see far enough" \
    "CFG.factoryBlock, null, P);" "CFG.factoryBlock, null, pageRead());"

# The architect's second review: the press's repaint rejects out of a click handler on a throttling
# endpoint, which was an uncaught HTTP 429 and a page error the driver passed anyway.
run "the press's repaint is left outside the handler's guard" \
    '  try {
    await absorb(t, d, { ...histOf({' \
    '  {
    await absorb(t, d, { ...histOf({'
