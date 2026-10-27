#!/usr/bin/env bash
# Writes the canonical runtime bytecode of the four wallets M03's measurements run against, with the
# provenance that makes a fixture checkable: where it came from, at which block, and its codehash.
#
#   devbox run -- tools/bytecode-fixtures.sh                    # at the chain's head
#   BLOCK=26283809 devbox run -- tools/bytecode-fixtures.sh      # pinned, and therefore idempotent
#   RPC=https://eth.drpc.org devbox run -- tools/bytecode-fixtures.sh
#
# The default RPC is drpc, not the ethereum-rpc.publicnode.com the task's provenance names: a pinned
# BLOCK is an archive request, and publicnode answers one more than a few hundred blocks back with
# `-32602 Archive requests require a personal token`, so it cannot serve the idempotence check. It
# does serve the head, so an unpinned run works against either.
#
# `receive()` runs runtime code, so runtime is what the tests etch; a creation deploy would yield a
# byte-identical runtime anyway. The codehash in PROVENANCE.md is what proves a fixture is the
# audited contract — `test/PushGas.t.sol` asserts the Safe singleton's against the value upstream
# pins, so a swapped fixture fails the suite rather than quietly measuring the wrong thing.
set -euo pipefail

RPC="${RPC:-https://eth.drpc.org}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/test/fixtures/bytecode"

# fixture path | address | what it is
FIXTURES=(
  "safe-v1.4.1/singleton.hex|0x41675C099F32341bf84BFc5382aF534df5C7461a|Safe v1.4.1 singleton"
  "safe-v1.4.1/factory.hex|0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67|Safe v1.4.1 proxy factory"
  "multisig/implementation.hex|0xD54cb65224410F3Ff97a8E72f363f224419f4FB0|multisig.software implementation"
  "multisig/factory.hex|0x000000000e8CB9ed9DC2114d79d9215eacb9cB07|multisig.software factory"
)

chain=$(cast chain-id --rpc-url "$RPC")
[ "$chain" = "1" ] || { echo "bytecode-fixtures: $RPC is chain $chain, not Ethereum mainnet" >&2; exit 1; }

# A pinned BLOCK makes every line below deterministic, which is what lets a second run leave the
# tree clean. Unpinned, the head block is recorded and a later run will differ — as it should.
block="${BLOCK:-$(cast block-number --rpc-url "$RPC")}"
# The block's own timestamp, not today's date: it is when these bytes were observed on chain, and it
# does not change between runs of a pinned block.
observed=$(date -u -d "@$(cast block "$block" --field timestamp --rpc-url "$RPC")" '+%Y-%m-%d %H:%M:%SZ')

mkdir -p "$OUT"
rows=""
for f in "${FIXTURES[@]}"; do
  IFS='|' read -r path addr what <<< "$f"
  mkdir -p "$OUT/$(dirname "$path")"
  code=$(cast code "$addr" --block "$block" --rpc-url "$RPC")
  [ "$code" != "0x" ] || { echo "bytecode-fixtures: no code at $addr at block $block" >&2; exit 1; }
  printf '%s\n' "$code" > "$OUT/$path"
  bytes=$(( (${#code} - 2) / 2 ))
  rows="$rows| \`$path\` | $what | \`$addr\` | $(printf "%'d" "$bytes") | \`$(cast keccak "$code")\` |"$'\n'
  printf '%-30s %s  %7d bytes\n' "$path" "$addr" "$bytes"
done

cat > "$OUT/PROVENANCE.md" <<EOF
# Bytecode fixtures — provenance

Written by \`tools/bytecode-fixtures.sh\`. **Runtime** bytecode, fetched with \`cast code\`; see that
script's header for why runtime and not creation bytecode, and \`test/PushGas.t.sol\` for the codehash
assertion that holds a fixture to being the audited contract.

- Chain: \`$chain\` (Ethereum mainnet)
- Block: \`$block\`
- Observed: $observed (the block's own timestamp, so a pinned block reproduces this file)
- RPC: \`$RPC\`

| fixture | contract | address | bytes | codehash |
|:--|:--|:--|--:|:--|
$rows
Regenerate pinned to this block, and the tree stays clean:

\`\`\`
BLOCK=$block devbox run -- tools/bytecode-fixtures.sh
\`\`\`
EOF
echo "wrote $OUT/PROVENANCE.md (chain $chain, block $block)"
