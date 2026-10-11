# m01-t01 — handoff

PR: #6 · Branch: `m01/t01-toolchain-primitive` · 2026-10-11

`foundry.toml` pins solc 0.8.34 with `ignored_warnings_from = ["lib"]`, which clears solady's
deprecated-virtual-modifier warning without silencing the code in our own sources; CI gained the one
grep that catches solc's warning format; `foundry.lock` is tracked as forge writes it; and
`src/Distribution.sol` holds the primitive — sink, split, escrow, one timelock, no imports — with
`test/Distribution.t.sol` and `test/mocks/Mocks.sol` exercising it through a Solady PUSH0 clone, 18
tests, Arrange-Act-Assert throughout. Three points in the plan's fixed surface could not be built as
written and were changed as narrowly as the fix allows; they are the first three deviations below,
and two of them are ABI surface M02 will decode.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — solc pinned, build warning-free | pass | `grep '^solc' foundry.toml` → `solc = "0.8.34"`. `devbox run -- forge build --force` → `Compiling 36 files with Solc 0.8.34` / `Solc 0.8.34 finished in 4.06s` / `Compiler run successful!`. On that log `grep -c 'Warning ('` → `0` and `grep -c 'warning\['` → `0`. |
| 2 — CI fails a warning-laden log | pass | The three CI assertions replayed against three real logs: clean build → `PASS`; a 0.8.34 build with `ignored_warnings_from` removed → `FAIL(1)`, carrying `Warning (8429): Virtual modifiers are deprecated and scheduled for removal.`; the same file with the lint disable removed → `FAIL(1)`, carrying `warning[block-timestamp]`. On the solc log `grep -c 'Warning ('` → `1` and `grep -c 'warning\['` → `0`, so the pre-existing assertion alone would have passed it — the added line is load-bearing. CI on the PR is green (`gh pr checks 6` → `ci pass 50s`, `ci pass 48s`), and its build step ran the real thing: `Compiling 36 files with Solc 0.8.34` / `Solc 0.8.34 finished in 4.47s` / `Compiler run successful!`. |
| 3 — `foundry.lock` tracked, tree clean | pass | `git ls-files foundry.lock` → `foundry.lock`. `git status --porcelain` after `forge build --force`, `forge test`, `make fmt` and `make test` → empty (verified through `cat -A`, so trailing whitespace would have shown). CI's own `working tree clean` step passed on a fresh `actions/checkout`, which is the path where an untracked lockfile would have failed it. |
| 4 — all 18 tests listed, `0 failed` | pass | `devbox run -- forge test --list --match-contract Distribution` listed 18 names under `test/Distribution.t.sol:DistributionTest`. Those names, extracted from the forge output, `diff`ed against every `test_*` token in `TASK.md` and `MILESTONE.md` minus the two t02 rows → `IDENTICAL`, 18 vs 18. `devbox run -- forge test` → `Suite result: ok. 2 passed; 0 failed`, `ok. 13 passed; 0 failed`, `ok. 18 passed; 0 failed`, and `Ran 3 test suites: 33 tests passed, 0 failed, 0 skipped (33 total tests)`. |
| 5 — `snapshot()` ABI | pass | `forge inspect Distribution abi --json \| jq '.[]\|select(.name=="snapshot")\|.outputs'` → one tuple whose components are, in order, `owner address`, `delay uint32`, `nonce uint32`, `description string`, `table tuple[]` (`account address`, `bps uint96`, `name string`, `note string`), `pending tuple[]` (`hash bytes32`, `eta uint256`, `action bytes`). No `tip`, `url` or `about`. |
| 6 — lint and fmt clean | pass | `devbox run -- forge lint` → no finding, exit 0. `devbox run -- forge fmt --check` → no diff, exit 0. `devbox run -- make fmt` (which is `forge fmt --check`) → exit 0. |
| 7 — only the planned files touched | pass | `git diff --stat main` → `.github/workflows/ci.yml \| 1 +`, `foundry.lock \| 8 +`, `foundry.toml \| 3 +-`, `src/Distribution.sol \| 290 ++`, `test/Distribution.t.sol \| 522 ++`, `test/mocks/Mocks.sol \| 118 ++` — 6 files, 941 insertions, 1 deletion. No `App.sol`, `Counter.sol`, `app/`, `scripts/forge/`, `README.md` or `AGENTS.md`. |

Everything above was run from the worktree root through `devbox run --` on forge `1.7.1-dev` (the
nixpkgs build of 1.7.1), never the host's 1.8.1, which lints differently. CI on the PR ran the same
build, 33 tests with `0 failed`, `make fmt`, and the clean-tree check, all green.

## Deviations from the plan

1. **`apply(bytes, uint32)` is `applyQueued(bytes, uint32)`.** `apply` is a Solidity reserved
   keyword; a scratch contract declaring it under 0.8.34 fails with
   `Error (2314): Expected identifier but got reserved keyword 'apply'`. The name pairs with the
   `queued` mapping and the `Applied` event, and mirrors `executeQueued` in the reference
   implementation. The plan's rules for the function are otherwise unchanged. This is ABI surface —
   see Open questions.
2. **`table()` is `beneficiaries()`.** forge treats any function whose name begins with `table` as a
   table test, so a public `table()` getter made the *contract* a test suite: `forge test` reported
   `Encountered 1 failing test in src/Distribution.sol:Distribution` /
   `[FAIL: Table test should have at least one parameter] table()`, which fails AC 4 outright. The
   name pairs with the existing `setBeneficiaries`. The `Snapshot.table` **field** is untouched, and
   AC 5 still shows it as `table`. Also ABI surface.
3. **One scoped lint disable in `applyQueued`.** The plan's step 4 expects `forge lint` to print no
   finding, but a timelock's `block.timestamp < eta` trips `warning[block-timestamp]`, which
   `forge build` prints inline — failing AC 1 and the CI grep as well as AC 6. Fixed with a single
   `// forge-lint: disable-next-line(block-timestamp)` and a comment giving the reason. Rejected:
   `exclude_lints` in `foundry.toml`, which would silence the rule for every future comparison too.
4. **A failed `release` retry bubbles the recipient's revert** instead of raising a named error. Open
   question 5's default is "revert, leaving the escrow intact", and none of the six errors the plan
   fixes means "the retry failed"; re-reverting with the recipient's own data satisfies the rule and
   adds no surface. Same mechanism is used for the self-call in `propose`/`applyQueued`, which the
   plan does require.
5. **`_balance` on a codeless token** reverts through `abi.decode` of the empty staticcall return
   rather than a named error — the plan's "let a token with no code fail there", with no new error
   added.
6. **Test construction, two notes.** Funding goes through a mock that uses `transfer`, so every
   funding step in the suite also runs the 2,300-gas `receive()` path rather than `vm.deal`-ing the
   balance in. And `test_distributeReleaseDistributeKeepsReserved` needed one more send before the
   third distribute, because the release empties the contract and the third `distribute` would
   otherwise revert `NothingToDo`. `test_tableValidation` also covers a leading `address(0)` row
   beyond the plan's five cases, since it is the same branch.

## Decisions

- **Contract name (open question 1): the default.** `Distribution` in `src/Distribution.sol`, no
  rename, per the ruling that the gate takes the default when no other answer has arrived.
- **`Received` in `receive()` (open question 2): keep it.** Measured rather than assumed. The minimum
  gas for `receive()` on a clone, found by binary search on an explicit gas cap, is **1,662** with the
  event and **250** without it — so the event costs about 1,412 gas and still leaves 638 under the
  stipend. `test_receiveUnderStipend` passes with the event in place, so the plan's fallback is not
  needed. The caveat is in Discoveries.
- **Open questions 3, 4 and 5: the stated defaults.** No cap on table length; `propose` does not
  validate the action's selector; a failed `release` retry reverts.
- `propose` with `delay == 0` emits `Queued`, then self-calls, then emits `Applied`, so the action's
  own logs nest between the two and the log order matches the queued path. The plan fixes only that
  `Queued` precedes `Applied`.
- `_push` decodes an ERC-20's return data as a `uint256` and compares it to 1 rather than decoding a
  `bool`, so a token answering with a non-boolean word escrows instead of reverting inside
  `distribute`. Empty return data still counts as success, which is the USDT case the plan names.
- `PUSH_GAS` is left at the draft `100_000` with the comment saying M03 measures it.
- Mocks live in one `test/mocks/Mocks.sol` rather than a file each; `src/` holds the one file.

## Discoveries

- **The 2,300-gas stipend holds only while the implementation is warm.** A clone's `DELEGATECALL`
  costs 2,600 against a cold implementation and 100 against a warm one; at 250 gas for the leanest
  possible `receive()`, the cold path needs about 2,750 and cannot fit. Dropping `Received` —
  open question 2's remedy — therefore cannot rescue it; this is a property of every delegatecall
  proxy, not of this contract. It is also not reachable from a wallet: a top-level EOA transfer
  forwards the whole gas limit. Only a *contract* paying in with `.transfer()`/`.send()`, in a
  transaction that has not already touched the implementation, would fail — and a `Distribution`
  paying another one is fine, because it pushes with `PUSH_GAS`. Worth a line in M03's `SECURITY.md`.
- **That case is not constructible in a forge 1.7.1 unit test**, which is why
  `test_receiveUnderStipend` proves the warm path only. `vm.cool` does not re-cool: a fresh
  staticcall to an untouched address cost 2,889 gas and the same call *after* `vm.cool` cost 389.
  `vm.etch` leaves its target warm — a `transfer` to a clone of a freshly etched implementation
  succeeded and cost the caller 8,527 gas, byte-identical to the warmed case.
- **The plan's claim that the four `onlySelf` functions are all a queued action can reach is not how
  the guarantee works.** `address(this).call(action)` can reach any external function; nothing
  privileged is exposed because `init` requires `factory` and `propose`/`cancel` require `owner`, and
  the contract is neither. The conclusion stands, but it rests on each function's own guard rather
  than on the `onlySelf` set.
- **`foundry.lock` is not written on a checkout whose submodules are already initialised** — forge
  writes it only when it installs them, which is why it never appeared in this worktree. The
  committed bytes came from forge itself, in a local clone with the submodules deinitialised and
  their URLs pointed at local gitdirs so nothing left the machine. The file has no trailing newline,
  and no pre-commit hook rewrites files, so that survives a commit.
- **CI's pre-existing warning assertion was dead for solc.** On a real warning-laden 0.8.34 log,
  `grep -c 'warning\['` is 0 while `grep -c 'Warning ('` is 1, so the build step would have gone
  green. That is the gap step 2 closes, now measured rather than reasoned.
- Nothing outside the task's scope needed attention; `App.sol` and `Counter.sol` compile unchanged
  under 0.8.34 on their existing `^0.8.26` pragmas, and their suites still pass.

## Open questions

1. **Is `applyQueued` the right name for the ABI, given `apply` is impossible?** M02 decodes it, and
   a rename is one edit until M02 starts. `applyAction` and the reference's `executeQueued` are the
   obvious alternatives.
2. **Is `beneficiaries()` the right name for the getter**, for the same reason? `snapshot()` is what
   M02 actually reads, so the cost of changing it is lower than for `applyQueued`.
3. **Should the cold-implementation stipend limit be documented for users, or designed away?** It is
   not a t01 question — M03 scopes `SECURITY.md` and M02 writes the dapp's guidance — but it is a
   claim in the overview that measurement does not fully support, so it should not be inherited
   silently.
