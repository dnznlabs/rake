#!/usr/bin/env bash
# Regenerate test/fixtures/abi/ from cast. The fixtures are the oracle test/abi.test.mjs asserts
# against, so they must come from a tool that is not app/src/eth.js: an encoder compared with itself
# proves nothing. Run through devbox, from the repo root:
#
#   devbox run -- tools/abi-vectors.sh
#
# Idempotent: a second run leaves `git status --porcelain` empty. Commit what it writes and never
# hand-edit a .hex file — fix the case here and regenerate.
set -euo pipefail

CAST=${CAST:-cast}
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
out=$root/test/fixtures/abi
mkdir -p "$out"

# One hex string per file, no trailing newline beyond the one `write` adds: the test trims.
write() { printf '%s\n' "$2" >"$out/$1.hex"; }

# Anvil's first three dev accounts: public, deterministic, and the ones the seed uses.
A0=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
A1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
A2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
A3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
# A sender-bound salt (decision 10): the top 20 bytes are A0, the low 12 are 1.
SALT=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001

BENEFICIARY='(address,uint96,string,string)'
PENDING='(bytes32,uint256,bytes)'

# The arguments of `create`, encoded without its selector: the dapp's hardest call, with a dynamic
# string, an array of tuples each carrying two strings (one of them empty), and a static bytes32.
create_args=$("$CAST" abi-encode "f(address,uint32,string,${BENEFICIARY}[],bytes32)" \
  "$A1" 604800 "DNZN fees" \
  "[($A2,6000,\"ops\",\"operations\"),($A3,4000,\"treasury\",\"\")]" \
  "$SALT")
write create.args "$create_args"

# The four writes t02 has to encode, and the two the pending block has to decode.
set_beneficiaries=$("$CAST" calldata "setBeneficiaries(${BENEFICIARY}[])" \
  "[($A2,7000,\"ops\",\"operations\"),($A3,3000,\"treasury\",\"\")]")
write setBeneficiaries.calldata "$set_beneficiaries"

write propose.calldata "$("$CAST" calldata 'propose(bytes)' "$set_beneficiaries")"
write applyQueued.calldata "$("$CAST" calldata 'applyQueued(bytes,uint32)' "$set_beneficiaries" 1)"
write setDescription.calldata "$("$CAST" calldata 'setDescription(string)' "DNZN fees, revised")"
write setDelay.calldata "$("$CAST" calldata 'setDelay(uint32)' 172800)"
write renounce.calldata "$("$CAST" calldata 'transferOwnership(address)' 0x0000000000000000000000000000000000000000)"

# Exactly what `snapshot()` puts on the wire: one tuple return value, so the head offset word
# (0x…20) comes first, and every dynamic member is reached through its own offset.
write snapshot.return "$("$CAST" abi-encode \
  "f((address,uint32,uint32,string,${BENEFICIARY}[],${PENDING}[]))" \
  "($A1,604800,1,\"DNZN fees\",[($A2,6000,\"ops\",\"operations\"),($A3,4000,\"treasury\",\"\")],[(0x1111111111111111111111111111111111111111111111111111111111111111,1760000000,$set_beneficiaries)])")"

# Every selector the dapp sends or decodes, as `signature 0xselector` lines in the order below, so
# the file is byte-stable across runs and a diff names the case that moved.
sigs=(
  "create(address,uint32,string,${BENEFICIARY}[],bytes32)"
  "predict(bytes32)"
  "implementation()"
  "snapshot()"
  "beneficiaries()"
  "propose(bytes)"
  "applyQueued(bytes,uint32)"
  "cancel(bytes32)"
  "distribute(address)"
  "release(address,address)"
  "setBeneficiaries(${BENEFICIARY}[])"
  "setDescription(string)"
  "setDelay(uint32)"
  "transferOwnership(address)"
  "reserved(address)"
  "escrowed(address,address)"
  "isOwner(address)"
)
: >"$out/selectors.txt"
for sig in "${sigs[@]}"; do
  printf '%s %s\n' "$sig" "$("$CAST" sig "$sig")" >>"$out/selectors.txt"
done

printf 'abi-vectors: wrote %s files to %s\n' "$(ls -1 "$out" | wc -l | tr -d ' ')" "${out#"$root"/}"
