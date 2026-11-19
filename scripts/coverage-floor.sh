#!/usr/bin/env bash
#
# The coverage gate: `forge coverage` over the subset of the suite that survives the coverage
# binary, floored per `src/` file on lines and branches.
#
# Why a subset at all. `forge coverage --ir-minimum` recompiles at minimal optimisation and
# inserts per-line counters, so gas changes by construction — and this suite asserts measured gas
# frames on purpose (the 2,300-gas stipend behaviour). 22 of the 107 tests fail under that binary
# for that reason and no other. The membership test is not coverage itself but a paired control
# with no coverage involved: `FOUNDRY_OPTIMIZER=false forge test` fails the same 22 by name
# (diffed, identical). A test that passes with the optimizer off is not excluded whatever else it
# does, and a test added here without that evidence is a bug in this list.
#
# `TableCapTest` is excluded by path, not by name: what reverts there is its `setUp`, so the suite
# contributes one failure line and no per-test rows.
#
# No figure here is a test count. Coverage enumerates 105 where `forge test` enumerates 107,
# because a reverting `setUp` contributes no per-test rows — a count would compare two different
# populations. The floors are line and branch percentages of the `src/` rows.
#
# Keeping this honest: if you add a `test/` assertion that pins gas, it joins the list below in the
# same PR, or this gate goes red. That is the intended cost of the exclusion, and `SECURITY.md`
# § Coverage states it.
set -euo pipefail

cd "$(dirname "$0")/.."

# The 21 excluded test names, each with the one-word reason it is here, so the list is read where
# it bites. Every one fails under `FOUNDRY_OPTIMIZER=false forge test --match-test <name>` and
# passes under `forge test --match-test <name>`.
SKIP_NAMES=(
  test_claimEthToOtherAddress                          # gas-pin
  test_claimEthToSelfUncapped                          # gas-pin
  test_claimReentrancyLocked                           # gas-pin
  test_coldReceiveFitsTheMeasuredFrame                 # gas-pin
  test_createAcceptsZeroOwnerBornRenounced             # gas-pin
  test_delayZeroOwnerSweepsAtomically                  # gas-pin
  test_distributeDiscardsEthReturnData                 # gas-pin
  test_distributeReleaseDistributeKeepsReserved        # gas-pin
  test_escrowRevertingEthRecipientOthersPaid           # gas-pin
  testFuzz_claimMovesExactlyEscrow                     # gas-pin
  testFuzz_roundingNeverExceedsAmount                  # gas-pin
  test_hookRecipientStarvesLaterRows                   # gas-pin
  test_realPathPaysASafeAndAVaultClone                 # gas-pin
  test_receiveUnderStipend                             # gas-pin
  test_receiveUnderStipendPassesOnceImplementationIsWarm # gas-pin
  test_reentrantRecipientIsEscrowed                    # gas-pin
  test_releaseFailedEthRecipient                       # gas-pin
  test_releaseStillBubblesEthReason                    # gas-pin
  test_renounceFreezes                                 # gas-pin
  test_rounding_3333_3333_3334                         # gas-pin
  test_selfRowRecycles                                 # gas-pin
)
SKIP_PATH='test/TableCap.t.sol'

# The trailing `\(` is load-bearing. `--no-match-test` matches the *signature*, so `^(…)$` matches
# nothing at all — and a pattern that matches nothing floors the full suite and reads as a pass.
# Without the `\(`, a listed name would exclude every test it prefixes, and the collision is inside
# this list: `test_receiveUnderStipend` prefixes
# `test_receiveUnderStipendPassesOnceImplementationIsWarm`.
SKIP_RE="^($(IFS='|'; echo "${SKIP_NAMES[*]}"))\\("

# Floors: the measured figures rounded down and one point under, so ordinary drift is not a red
# build but a real regression is. Lines and branches only; statements and funcs are printed, not
# gated. A `src/` file with no entry here is an error below, not a pass.
declare -A FLOOR_LINES=( [src/App.sol]=91 [src/Distribution.sol]=88 )
declare -A FLOOR_BRANCHES=( [src/App.sol]=91 [src/Distribution.sol]=88 )

LOG="$(mktemp -t coverage-floor.XXXXXX)"
trap 'rm -f "$LOG"' EXIT

set +e
forge coverage --ir-minimum --report summary \
  --no-match-test "$SKIP_RE" --no-match-path "$SKIP_PATH" 2>&1 | tee "$LOG"
FORGE_RC=${PIPESTATUS[0]}
set -e

fail() { echo "coverage-floor: $*" >&2; exit 1; }

[ "$FORGE_RC" -eq 0 ] || fail "forge coverage exited $FORGE_RC"

# The rows are only worth reading if every test that ran passed: a failing test still runs its
# lines up to the revert, so failures inflate the figures they are measured by.
RAN_LINE="$(grep -E 'Ran [0-9]+ test suites' "$LOG" | tail -1)"
[ -n "$RAN_LINE" ] || fail "no 'Ran N test suites' line in the coverage output"
case "$RAN_LINE" in
  *' 0 failed,'*) ;;
  *) fail "coverage run reported failures — $RAN_LINE" ;;
esac

# Every `src/*.sol` must have produced a row and must have a floor. A third contract with no floor
# is a red run that names it, not a green one that gates two files and ignores the third.
EXPECTED=$(ls src/*.sol | wc -l)
mapfile -t ROWS < <(grep -E '^\| src/' "$LOG" || true)
PARSED=${#ROWS[@]}
if [ "$PARSED" -ne "$EXPECTED" ]; then
  echo "coverage-floor: parsed $PARSED src/ rows, but src/ holds $EXPECTED file(s):" >&2
  ls src/*.sol >&2
  printf '%s\n' "${ROWS[@]}" >&2
  exit 1
fi

RC=0
for row in "${ROWS[@]}"; do
  file=$(awk -F'|' '{gsub(/ /,"",$2); print $2}' <<<"$row")
  lines=$(awk -F'|' '{print $3}' <<<"$row" | grep -oE '[0-9]+\.[0-9]+')
  branches=$(awk -F'|' '{print $5}' <<<"$row" | grep -oE '[0-9]+\.[0-9]+')

  if [ -z "${FLOOR_LINES[$file]+set}" ]; then
    echo "coverage-floor: $file has a coverage row and no floor — add one here" >&2
    RC=1
    continue
  fi

  for pair in "lines:$lines:${FLOOR_LINES[$file]}" "branches:$branches:${FLOOR_BRANCHES[$file]}"; do
    IFS=: read -r what got floor <<<"$pair"
    if awk -v g="$got" -v f="$floor" 'BEGIN{exit !(g < f)}'; then
      echo "coverage-floor: $file $what $got% is under its floor of $floor%" >&2
      RC=1
    else
      echo "coverage-floor: $file $what $got% >= $floor%"
    fi
  done
done

exit $RC
