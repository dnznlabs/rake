# m03-t02 — The primitive under the rulings

Milestone: [M03](../../MILESTONE.md) · Phase: 2 — The code the review will read

When this is done, `src/Distribution.sol` is the contract the review reads and the contract that
ships: ownership transfers in two steps (decision 21), tables are capped at the measured 107 rows
(decision 27), `release` names the opaque failure (decision 24), and the two comments the rulings
touched say what the code does (decisions 26 and 30). Every path the ABI gains has a test, the
reference and the ABI fixtures follow, and the `snapshot()` struct is byte-for-byte unchanged. t03
then makes the dapp follow this ABI; t04 reads the merge commit of this PR.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, cast
`1.7.1-dev`). Branch `m03/t02-primitive` from `origin/main` at or after the merge of
[#99](https://github.com/dnznlabs/rake/pull/99). Check hooks with `ls .git/hooks | grep -v sample`
(expect `pre-commit` and `post-commit`); do not run `make init`. The givens from t01, so they are not
re-derived ([#96](https://github.com/dnznlabs/rake/issues/96)): `CAP = 107`, `PUSH_GAS` stays
`100_000`, and the fitted 29,703 is not a pure fixed cost and is not used here.

1. **Two-step ownership, struct unchanged (decision 21, [#74](https://github.com/dnznlabs/rake/issues/74)).**
   In `src/Distribution.sol`:
   - Add `address public pendingOwner;` after `owner` (line 53). It is **not** in `Snapshot`; the
     struct and `snapshot()` do not change.
   - `transferOwnership(address owner_)` stays `onlySelf` and becomes: `owner_ == address(0)` →
     `owner = address(0); pendingOwner = address(0);` (renounce stays immediate, and a transfer that
     was pending dies with it); otherwise `pendingOwner = owner_ == owner ? address(0) : owner_;`
     (proposing the current owner is how a pending transfer is withdrawn — there is no other value
     that can mean "none", since zero means renounce). `owner` is untouched on the non-zero path.
   - Add `function acceptOwnership() external`: `if (msg.sender != pendingOwner) revert Unauthorized();`
     then `owner = msg.sender; pendingOwner = address(0);` (with nothing pending, `pendingOwner` is
     zero and no caller equals it, so the one comparison covers both cases). `Unauthorized()` rather
     than `NotOwner()`:
     the caller is not claiming to be the owner, and `NotOwner` is documented as "the caller is not
     the owner". No new event: the handover's intent is already on chain as the `Queued`/`Applied`
     pair of the `transferOwnership` action, and the dapp reads `owner()`; the reviewer may ask for
     one in Phase 3, and it would be an ABI addition then, not a struct change.
   - Doc comments: `transferOwnership`'s `@notice` says a non-zero address is *pending until accepted*
     and `address(0)` renounces at once; `acceptOwnership` has a `@notice`.
   - `cancel(bytes32)` needs no change: cancelling the queued `transferOwnership` action before its
     eta leaves `pendingOwner` as it was, which step 5 pins.

   Check: `forge build --force 2>&1 | grep -c 'warning\[\|Warning (' ` prints 0, and
   `forge inspect Distribution abi --json | jq -c '.[]|select(.name=="snapshot")|.outputs[0].components|map(.name)'`
   still prints `["owner","delay","nonce","description","table","pending"]`.

2. **The table cap (decision 27, [#85](https://github.com/dnznlabs/rake/issues/85)).** Add
   `uint256 public constant MAX_BENEFICIARIES = 107;` beside `BPS_TOTAL` (line 49) with a `@dev`
   naming the measurement (m03-t01, `test/TableCap.t.sol`: 138,917 gas per worst-case row; 107 rows
   under 15,000,000, 108 over) and the rule it enforces (worst-case `distribute` under half a 30M
   block). In `_set` (line 229): `if (n == 0 || n > MAX_BENEFICIARIES) revert BadTable();`. It is
   `public` so `TableCapTest` and, later, the dapp's editor read it from the contract instead of
   carrying their own copy — decision 16's cost (the page encoding `_set`'s rules) is not grown by
   one more hardcoded number. The name is the architect's choice recorded here: decision 27 calls it
   `CAP`, which is a fine constant and a poor ABI getter.

   In `test/TableCap.t.sol`: delete the local `CAP` constant (line 45) and read
   `Distribution(payable(address(impl))).MAX_BENEFICIARIES()` — or import the constant through the
   contract type, whichever `forge lint` accepts silently — so the two pinning tests measure the
   contract's own figure. The 107 and 108 measurements still run, which is what makes criterion 3
   "closed in code".

   Check: `forge test --mc TableCapTest -vv` passes and still prints `gas at CAP` under
   15,000,000 and `CAP + 1` over.

3. **`ReleaseFailed(address token)` (decision 24, [#20](https://github.com/dnznlabs/rake/issues/20)).**
   Add `error ReleaseFailed(address token);` to the errors block (after `Unauthorized()`, line 45). In
   `release` (line 144) replace `if (!ok) _bubble(data);` with: when `!ok` and `data.length <= 32`,
   `revert ReleaseFailed(token)`; when `!ok` and longer, `_bubble(data)` as today. The threshold is
   the ruling's: 32 bytes or fewer is the bare `false` word or nothing; anything longer is a real
   `Error(string)` or a custom error with arguments and keeps its reason. `distribute` does not
   change — its failure path is the escrow, not a revert.

   Check: `forge inspect Distribution abi --json | jq -r '.[]|select(.type=="error")|.name' | sort`
   lists `ReleaseFailed` among the errors.

4. **The two comments (decisions 26 and 30).**
   - `_push`'s `@dev` (lines 273–275): "anything else must answer with a non-zero word" becomes
     "anything else must answer with a word equal to one", which is what line 282 requires
     ([#61](https://github.com/dnznlabs/rake/issues/61)). No code change.
   - `PUSH_GAS`'s `@dev` (line 47) stops saying M03 will measure it and says what was measured:
     a Safe v1.4.1 proxy receives in 4,029 gas and a multisig.software vault clone in 404 (m03-t01,
     `test/PushGas.t.sol`, cold), so 100,000 is 23× the larger need and was kept under decision 30.

   Check: `grep -n 'non-zero word' src/Distribution.sol` prints nothing;
   `grep -n 'M03 measures' src/Distribution.sol` prints nothing.

5. **Tests, in `test/Distribution.t.sol`,** one per path the ABI gains or changes, named so
   `forge test --list` reads as the list below. Use the suite's existing helpers for building a
   distribution through the factory and for queuing-then-applying an action (as
   `test_renounceFreezes` at line 473 does).
   - `test_transferOwnershipIsPending`: apply `transferOwnership(B)`; `owner()` is still A,
     `pendingOwner()` is B, and `snapshot().owner` is A.
   - `test_acceptOwnershipByPendingOwner`: B calls `acceptOwnership()`; `owner()` is B,
     `pendingOwner()` is zero; A can no longer `propose` (`NotOwner`), B can.
   - `test_acceptOwnershipByOtherReverts`: with B pending, C's `acceptOwnership()` reverts
     `Unauthorized`; with nothing pending, anyone's reverts `Unauthorized` (two `expectRevert`s in
     one test is fine; two tests are also fine).
   - `test_renounceStillImmediateAndClearsPending`: with B pending, apply
     `transferOwnership(address(0))`; `owner()` and `pendingOwner()` are both zero, and B's
     `acceptOwnership()` reverts. `test_renounceFreezes` stays as it is.
   - `test_transferToCurrentOwnerWithdrawsPending`: with B pending, apply `transferOwnership(A)`;
     `pendingOwner()` is zero, `owner()` is A.
   - `test_cancelQueuedTransferLeavesPendingOwner`: with B pending from an applied action, queue a
     second `transferOwnership(C)` and `cancel` it; `pendingOwner()` is still B.
   - `test_tableCapBoundary`: `init` (through `create`) with 107 ascending rows summing to 10,000
     succeeds; 108 reverts `BadTable`. Build the rows the way `TableCapTest._prepare` does.
   - `test_releaseFailedNamesBareWord`: `MockERC20` with `Ret.False` (`test/mocks/Mocks.sol:137`,
     `transfer` returns `false`) — after a `distribute` escrows the row, `release` reverts with
     `ReleaseFailed(token)` and `escrowed`/`reserved` are unchanged.
   - `test_releaseBubblesLongReason`: a mock whose `transfer` reverts with `Error("insufficient")`
     — `release` reverts with that string, not `ReleaseFailed`. Add a `Ret.RevertString` arm to
     `MockERC20` if none exists; note that `MockERC20`'s `InsufficientBalance()` is a 4-byte custom
     error and so falls *under* the threshold — by the ruling, an argument-less custom error is
     named `ReleaseFailed`, and the test for "long" must use a string reason.
   - `test_releaseFailedEthRecipient`: an ETH row escrowed by `RevertingReceiver` (`Mocks.sol:8`,
     reverts `Refused()`, 4 bytes) — `release` reverts `ReleaseFailed(address(0))`.

   Check: `forge test` passes; `forge test --list --match-contract Distribution` shows every name
   above and every M01 name (M01 criterion 2's table is intact).

6. **Reference and fixtures.** In `docs/REFERENCE.md` § Distribution: a function row for
   `acceptOwnership()` (caller: the pending owner) and for `pendingOwner()` and
   `MAX_BENEFICIARIES()` (view); `transferOwnership`'s row now says "names the next owner, who must
   `acceptOwnership()`; the zero address renounces at once"; an error row for
   `ReleaseFailed(address token)` (thrown by `release`, when the retry failed with no reason of its
   own); `BadTable()`'s row gains "or more than 107 rows". The struct block stays verbatim. In
   `tools/abi-vectors.sh`: add `acceptOwnership()`, `pendingOwner()` and `MAX_BENEFICIARIES()` to
   `sigs` after `transferOwnership(address)`, keep the existing order otherwise, and run it. Add a
   row to `docs/REFERENCE.md`'s factory section only if the factory changed (it should not).

   Check: `node --test test/` passes (`docs.test.mjs` reads the struct and the selector fixture
   against the tables); running `tools/abi-vectors.sh` a second time leaves `git status --porcelain`
   empty; M02 criterion 6's diff of the three `Distribution` tables against
   `forge inspect Distribution abi` is clean.

7. **Snapshot, suite, hygiene.** `forge build --force`, `forge test`, `forge snapshot` (not
   `--check`), then `forge lint` and `forge fmt --check` — lint last, since it poisons the build
   cache (`AGENTS.md` § Contracts). `grep -c '' .gas-snapshot` is 53 plus the tests added. Existing
   rows will move: `BadTable` gains a comparison, `release` gains a branch, and `transferOwnership`
   writes a different slot. Record the before/after of every moved row in the handoff; a row that
   moves by more than a few hundred gas needs a sentence. Build sizes too, measured the way decision
   24 was (`forge build --force`, the implementation's deployed bytecode against 8,306 bytes on
   `878dfa3`), so the review knows what it is reading.

8. **The `#/docs` and `index.html` claims, read and listed, not changed.** `grep -n -i 'owner' app/src/index.html`
   between `id="s-owner"` and `id="s-widget"`, and `app/src/model.js:84` (`d.length === 66`, the
   "retry failed" branch that decision 24 gives a second arm). List in `HANDOFF.md` § For t03 every
   line whose claim this PR makes false or incomplete: the ownership paragraph at line 1434 (one
   step → two), the ownership disclosure's confirmations at lines 967–1030, the pending-action
   label at line 488, the Limits section if it should name the cap, and the `ReleaseFailed`
   selector for `ERRORS` in `model.js`. t03 owns the edits; this task owns the list.

9. **Handoff and PR.** `HANDOFF.md` beside this file: the ABI diff (`forge inspect Distribution abi`
   on `origin/main` against the branch, names only), the snapshot rows that moved with figures, the
   bytecode sizes, § For t03, and § Deviations. PR titled
   `feat(m03): two-step ownership, the table cap and ReleaseFailed`, in the PR template's form,
   closing #74, #61 and #96 (and #20 by the same keyword — decision 24 says it closes "when it
   lands"; the `SECURITY.md` row for it is t04's and does not need the issue open). Review:
   architect first against this file, Product Owner second. **This PR's merge commit is the one
   `SECURITY.md` names** unless t05 happens; nothing under `src/` changes after it without
   re-opening the review.

## Acceptance criteria

- `forge inspect Distribution abi --json | jq -c '.[]|select(.name=="snapshot")|.outputs[0].components|map(.name)'`
  prints `["owner","delay","nonce","description","table","pending"]` (milestone criterion 2).
- The ABI gains exactly `acceptOwnership()`, `pendingOwner()`, `MAX_BENEFICIARIES()` and
  `ReleaseFailed(address)`, and loses nothing: `forge inspect Distribution abi --json | jq -r '.[]|select(.type!="constructor")|.name' | sort`
  on the branch minus the same on `origin/main` is those four names.
- `forge test` passes; `forge test --list --match-contract Distribution` lists the ten tests of step
  5 and every M01 test; `forge test --mc TableCapTest` reads the cap from the contract and still
  asserts 107 under and 108 over 15,000,000 (milestone criterion 3, cap half, closed in code).
- `grep -n 'non-zero word\|M03 measures' src/Distribution.sol` prints nothing (#61, decision 30).
- `node --test test/` passes; `tools/abi-vectors.sh` is idempotent; `docs/REFERENCE.md`'s three
  `Distribution` tables match `forge inspect Distribution abi` (M02 criterion 6's diff).
- `forge build --force` prints zero `warning[` / `Warning (` lines; `forge lint` and
  `forge fmt --check` are silent; `forge snapshot --check` exits 0 on the committed snapshot;
  `git status --porcelain` is empty after all of them.
- `HANDOFF.md` has the ABI diff, the moved snapshot rows with figures, the bytecode sizes against
  8,306 / 1,320, and § For t03 listing every `app/` line this ABI makes stale.
- M01 criteria 1, 2, 4, 5 and 7 pass on the branch (milestone criterion 2's last sentence).

## Out of scope

- Anything under `app/`. The dapp follows this ABI in t03; this task only lists what it must follow
  (step 8). The one exception the milestone allows — "what an accepted ABI addition forces" — is
  t03's, not this task's, so the PR stays reviewable as a contract change.
- `pendingOwner` in `Snapshot`, or any struct change. Decision 21 rejected it; it re-opens M02
  t01–t05.
- An `OwnershipTransferred` event, an `isPendingOwner` probe, or a deadline on the pending transfer.
  Raise in the handoff if the tests make a case; the reviewer decides in Phase 3.
- Changing `PUSH_GAS` (decision 30 keeps it), `_push`'s return-word rule (decision 26 keeps it), or
  `reserved`'s semantics (decision 23 documents instead).
- Validating in `propose` what `applyQueued` will refuse (decision 25: documented in t04).
- `SECURITY.md`, `audits/`, `RUNBOOK.md`, the overview's § 5 qualifier — t04 and t06.
- The factory. Nothing ruled touches it; its one-way door (its init code, which includes every byte
  of `Distribution.sol`) closes in M04, after this task, and that is the point of sequencing it here.

## Open questions

None. Four choices this plan makes rather than asks, each the architect's and recorded here: the
getter is named `MAX_BENEFICIARIES` and is `public` (step 2); `acceptOwnership` by the wrong caller
reverts `Unauthorized()` and emits no event (step 1); a pending transfer is withdrawn by proposing
the current owner (step 1); and `release`'s threshold is read as `data.length <= 32` exactly as
decision 24 words it (step 3).

## Context

- [`MILESTONE.md`](../../MILESTONE.md) § Acceptance criteria 2 and 3; § Human-in-the-loop
  requirements D2, D4–D8, D11.
- `docs/ROADMAP.md` § Decisions 21 (two-step), 24 (`ReleaseFailed`), 26 (`_push` comment), 27
  (cap), 30 (`PUSH_GAS`); decision 9 for the two ABI names this file does not touch; decision 5 for
  why a byte here is forever after M04.
- [m03-t01 `HANDOFF.md`](../m03-t01/HANDOFF.md) § The figures and § The knee the plan predicted is
  a constant (why 29,703 is not reused); [#96](https://github.com/dnznlabs/rake/issues/96).
- Issues this closes: [#74](https://github.com/dnznlabs/rake/issues/74),
  [#61](https://github.com/dnznlabs/rake/issues/61), [#20](https://github.com/dnznlabs/rake/issues/20),
  [#96](https://github.com/dnznlabs/rake/issues/96).
- `AGENTS.md` § Contracts and the dev chain: snapshot through devbox only, lint order, the
  `Warning:` line that is not a build warning.
