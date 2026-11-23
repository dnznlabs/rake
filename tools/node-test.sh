#!/usr/bin/env bash
# Run the node suite, keep its exit status, and fail the build on any skipped test.
#
# `node --test` exits 0 when a test skips, so a skip is invisible to `make` and to anyone reading a
# green tick. That is not a theoretical gap: two tests in `test/widget-sri.test.mjs` skipped whenever
# they lost a race against another file's build, so the check that the page's `integrity` matches the
# widget it ships ran or did not run depending on process scheduling, and nothing said which
# (2026-11-23). The tests themselves are fixed; this is the guard that makes the next one loud.
#
# Two things here are load-bearing and both were found by being wrong first.
#
# **`set -o pipefail`.** Without it the pipeline reports only `awk`'s status,
# so a genuine test failure passed this guard and the build went green — measured before writing it.
# That is also why this is a script and not a recipe line: `make`'s default shell may be `dash`,
# which has no `pipefail`.
#
# Usage: tools/node-test.sh test/*.test.mjs
set -o pipefail
set -u

node --test "$@" 2>&1 | awk '
  { print }
  # **No leading `. ` here, deliberately.** node prints `\u2139 skipped N`, and `\u2139` is three bytes, so
  # whether `.` matches it depends on the awk and the locale: it matched under devbox in UTF-8 and did
  # not under `LC_ALL=C`, nor under mawk in any locale \u2014 so the guard silently stopped guarding in
  # exactly the environments nobody checks. Anchoring on the tail alone matched everywhere tried.
  /skipped [0-9]+$/ { skipped = $NF }
  END {
    if (skipped + 0 > 0) {
      printf "\nmake test: skipped %d\n", skipped
      printf "make test: %d test(s) skipped. A skip is a silent pass: run them, or delete them.\n", skipped
      printf "If a skip is deliberate, it must be chosen explicitly — see RAKE_ALLOW_MISSING_TOOLS in test/step4-calldata.test.mjs.\n"
      exit 1
    }
  }
'
