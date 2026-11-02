# m03-t08 — Queued actions expire, and an escrowed account can claim

Milestone: [M03](../../MILESTONE.md) · Phase: 3 — The review

When this is done, `src/Distribution.sol` carries the two changes decisions 39 and 40 ruled from
[#133](https://github.com/dnznlabs/rake/issues/133): a matured action can be applied only for a
grace window after its `eta`, and anyone may drop it once that window has passed (F9/F13); and the
account an escrow is held for can take it itself, to an address it names, with its own gas (F5,
#95). It also carries the two one-line changes [#136](https://github.com/dnznlabs/rake/issues/136)
folds in — a renounce emits `OwnershipTransferred`, and value present at `init` is logged — the
corrected escrow-remedy sentence, and the research PoCs as tests. **No review runs here.** This PR
merges before m03-t07 freezes (its step 5), and t07's third two-leg review reads both changes once.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`). Branch
`m03/t08-expiry-claim` from `origin/main` at or after the merge of the PR that carries this file.
Check hooks with `ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`); do not run
`make init`. If the worktree is fresh, `git submodule update --init --recursive` first (#41). Line
numbers below are `src/Distribution.sol` at `71c9f92`, whose `src/` is byte-identical to `b0fb4e3`;
step 0 proves it. Every figure below labelled *spike* was measured by the architect on 2026-11-01 in
a throwaway worktree at `71c9f92` with exactly the code in steps 1–4 applied; re-run, not quoted.

0. **The code is where the second review left it.** `git diff --stat b0fb4e3 origin/main -- src/`
   prints nothing. If it does not, stop: either t07 merged first (then this plan's line numbers for
   `Distribution.sol` still hold, since t07 touches `App.sol` only — say so in the handoff and go
   on) or something else moved and the plan is stale. Record the baselines: `forge build --force`,
   `Distribution`'s deployed bytecode (**8,729** bytes at `71c9f92`, from
   `forge inspect Distribution deployedBytecode` with the hex length halved; the factory **1,320**),
   `forge test` (**72** passed), `grep -c '' .gas-snapshot` (72), and
   `forge inspect Distribution abi --json | jq -r '.[]|select(.type!="constructor")|.name' | sort`
   (**39** lines; keep the file, the AC diffs against it).

1. **F9/F13 — a matured action expires.** `applyQueued` (`:205-216`) gates on
   `eta == 0 || block.timestamp < eta` (`:210`) and nothing else, so a matured action is applicable by
   anyone, in any order, forever. Add, beside `PUSH_GAS` (`:56`):

   ```solidity
   /// @notice How long after its eta a matured action stays applicable. Past it, `applyQueued`
   /// reverts `Expired` and anyone may `cancel` the entry. Compound's Timelock shape: a change nobody
   /// applied inside the window lapses instead of waiting as a permanent option held by the public.
   uint256 public constant GRACE = 14 days;
   ```

   and beside `ReleaseFailed` (`:51`): `error Expired(uint256 eta);`. In `applyQueued`, directly after
   the `NotReady` line:

   ```solidity
   // forge-lint: disable-next-line(block-timestamp)
   if (block.timestamp > eta + GRACE) revert Expired(eta);
   ```

   The lint comment is load-bearing: CI greps `warning\[` and `forge lint` flags every
   `block.timestamp` comparison (the existing one at `:208-209` carries the same comment).

   Then `cancel` (`:219-226`) lets anyone drop an expired entry while keeping every other case the
   owner's, **in this order** so a non-owner still sees `NotOwner` for anything that is not an
   expired entry — `test_renounceFreezes` (`test/Distribution.t.sol:513-515`) asserts a renounced
   owner's `cancel(bytes32(0))` reverts `NotOwner`, and checking `NothingToDo` first would break it
   (*spike*: it did):

   ```solidity
   function cancel(bytes32 hash) external {
       uint256 eta = queued[hash];
       // Anyone may drop an expired action; everything else stays the owner's.
       // forge-lint: disable-next-line(block-timestamp)
       if (msg.sender != owner && (eta == 0 || block.timestamp <= eta + GRACE)) revert NotOwner();
       if (eta == 0) revert NothingToDo();
       ...   // unchanged: delete, _remove, Cancelled
   }
   ```

   `block.timestamp == eta + GRACE` applies and does not yet let a stranger cancel; the boundary is
   the same instant in both places. The `@notice` lines on `applyQueued` and `cancel` say both
   things. `GRACE` is a constant, not a variable: a per-instance window would be one more thing an
   owner could set to a year, and the dapp reads one number. Rejected: an owner epoch in the hash
   (t05's F2 already clears the queue on a handover or a renounce, which is all the epoch was for),
   and nonce ordering (a never-applicable entry, decision 25's shape, would block everything queued
   behind it). Decision 25 is not reopened: it rejected cancel-by-anyone on a *revert* test, which
   is not always decidable; an expiry is a timestamp comparison.

   Check: `grep -c 'GRACE' src/Distribution.sol` → 4 (the constant, two comparisons, one NatSpec
   mention at least); `grep -c 'Expired' src/Distribution.sol` ≥ 2.

2. **F5 / #95 — the escrowed account claims.** `release` (`:164-182`) is the only exit from
   `escrowed[token][account]` and retries through `_push` under `PUSH_GAS`, so a recipient that
   needs more than 100,000 gas to accept ETH, or a token that refuses the account, can never be
   paid — and a re-table recovers nothing already escrowed. Add after `release`:

   ```solidity
   /// @notice The escrowed account takes its own escrow, to an address it names, with the caller's
   /// gas: no `PUSH_GAS` cap, because the beneficiary is paying for its own receive. Only
   /// `msg.sender`'s escrow moves, so neither the owner nor anyone else gains a path to funds.
   function claim(address token, address to) external nonReentrant {
       uint256 amount = escrowed[token][msg.sender];
       if (amount == 0) revert NothingToDo();

       escrowed[token][msg.sender] = 0;
       reserved[token] -= amount;
       bool ok;
       bytes memory data;
       if (token == address(0)) (ok, data) = to.call{value: amount}("");
       else (ok, data) = _push(token, to, amount, true);
       if (!ok) {
           if (data.length <= 32) revert ReleaseFailed(token);
           _bubble(data);
       }
       emit Claimed(token, msg.sender, to, amount);
   }
   ```

   and the event beside `Released` (`:35`):
   `event Claimed(address indexed token, address indexed account, address to, uint256 amount);`.
   A new event rather than `Released`, because `to` is the fact a reader needs and `Released` has no
   slot for it. The failure path is `release`'s (decision 24): a bare word names the token, a longer
   reason bubbles. `nonReentrant` is the shared transient lock, so `propose` and `applyQueued` are
   refused from inside a `claim` exactly as from inside a `release`. `to` is not validated: it is
   the beneficiary's own money, and the dapp defaults the field to the account. Two shapes `claim`
   does not rescue, for the `SECURITY.md` row: a contract recipient with no outgoing-call ability
   still cannot use it; and for an issuer-frozen account, `claim` moves tokens the Distribution holds
   to another address, which the issuer's freeze on the beneficiary did not reach — a property to
   state, not hide. *Spike*: `claim` to itself by a recipient whose `receive` writes 600 storage
   slots costs **123,585** gas and pays in full where `release{gas: 10_000_000}` reverts.

   Check: `grep -c 'function claim' src/Distribution.sol` → 1; `grep -c 'Claimed' src/Distribution.sol` → 2.

3. **The two one-liners from #136.** In the renounce branch of `transferOwnership` (`:245-250`),
   first line: `emit OwnershipTransferred(owner, address(0));` — before `owner` is cleared, the
   Ownable2Step shape, so a renounce leaves the same trace a handover does (#111's code half). At
   the end of `init` (`:122-131`), after `_set(table_)`:
   `if (address(this).balance != 0) emit Received(address(0), address(this).balance);` — value
   that rode the `create` and value sent to the counterfactual address before deployment both reach
   the log in one event; `address(0)` is the sentinel for "present at init, sender unknown", and
   `docs/REFERENCE.md` says so. Forced sends after deployment stay unlogged; the reference says
   that too. Update `transferOwnership`'s `@notice` (`:241-244`) and `init`'s (`:121`).

   Check: `grep -c 'OwnershipTransferred' src/Distribution.sol` → 3 (event, accept, renounce);
   `grep -c 'emit Received' src/Distribution.sol` → 2.

4. **Build, size, ABI.** `forge build --force` → 0 `warning[` lines and 0 `Warning (` lines (the
   two lint comments of step 1 are why). `Distribution`'s deployed bytecode: *spike* **9,271**
   bytes, **+542** against 8,729; the factory byte-identical at 1,320 (it embeds the implementation's
   init code only through `new Distribution`, which CREATE2s at construction — its own runtime does
   not change). The ABI name list diffed against step 0's shows **exactly four added lines and
   nothing removed**: `claim`, `Claimed`, `Expired`, `GRACE` (*spike*: 39 → 43). The handoff
   records all three figures with the commands.

5. **Tests — each behaviour change fails on `71c9f92` first.** Mocks go in `test/mocks/Mocks.sol`:
   `HungryReceiver` (a `receive()` that writes a storage slot 600 times — well over `PUSH_GAS` — and
   a `take(Distribution, address, address)` that calls `claim`), `SweepingOwner`, `PlainNFT` and
   `BigToken` as the #133 attachment defines them; `ApplyHookToken` is not needed (F1 is pinned by
   `test_applyQueuedRefusedDuringDistribute`). In `test/Distribution.t.sol`, with the suite's
   `_deploy`, `_salt`, `_send`, `OWNER`, `STRANGER`, `A`/`B`/`C` and `WEEK`:

   - `test_applyQueuedExpires`: propose under `WEEK`; at `eta + GRACE` `applyQueued` succeeds; a
     second action at `eta + GRACE + 1` reverts `Expired(eta)` (use
     `abi.encodeWithSelector(Distribution.Expired.selector, eta)`). Fails on `71c9f92` (no revert).
   - `test_strangerCancelsExpired`: at `eta + GRACE + 1`, `vm.prank(STRANGER); cancel(hash)`
     succeeds, emits `Cancelled`, `pendingCount()` 0, `queued(hash)` 0. Fails on `71c9f92`
     (`NotOwner`).
   - `test_strangerCannotCancelUnexpired`: before `eta`, at `eta`, and at exactly `eta + GRACE`,
     the stranger's `cancel` reverts `NotOwner`; the owner's succeeds at any of them. Passes on both
     (the regression guard for step 1's ordering).
   - `test_staleActionExpires`: the #133 `test_staleMaturedActionResurrects` inverted — two tables
     queued, the newer applied at `+7 days`, the older at `+187 days` reverts `Expired`; the table
     stays the newer. Fails on `71c9f92` (*spike*: the stale action applied).
   - `test_claimEthToSelfUncapped`: `HungryReceiver` at 50%; `distribute(address(0))` escrows its
     share; `release{gas: 10_000_000}` reverts; `h.take(d, address(0), address(h))` pays in full,
     `reserved(address(0))` 0, `escrowed` 0, `Claimed(address(0), h, h, share)` emitted; a second
     `take` reverts `NothingToDo`. Fails on `71c9f92` (no `claim`). This is the #133
     `test_escrowNeverReleasableForHungryRecipient` with its companion.
   - `test_claimEthToOtherAddress`: same escrow, `take(d, address(0), C)`; `C.balance` is the share.
   - `test_claimErc20`: a `RevertingToken`-style account refusal is not reproducible with the
     mocks, so use `MockERC20` with an escrow produced by a `RevertingReceiver`-shaped row that the
     token refuses — if no existing mock refuses a *recipient*, add `BlocklistToken` (a `transfer`
     that reverts for one address) and have the blocked account claim to another address. Assert
     balances and `reserved`.
   - `test_claimReentrancyLocked`: a recipient whose `receive` re-enters `claim` (or `distribute`)
     is refused `Locked`; the outer `claim` bubbles that reason (it is longer than a word).
   - `test_renounceEmitsOwnershipTransferred`: `vm.expectEmit` for `OwnershipTransferred(OWNER,
     address(0))` on an applied renounce. Fails on `71c9f92`.
   - In `test/DistributionFactory.t.sol`, `test_createForwardsValue` (`:148-168`) **flips**: two
     logs — `Received(address(0), 1 ether)` from the clone, then `Created` from the factory — and the
     `"no Received log"` loop goes. *Spike*: it fails today on exactly that count. Add
     `test_prefundedAddressLogsReceivedAtInit`: `predict(salt)`, send 3 ether there, `create`, expect
     `Received(address(0), 3 ether)` from the clone; this is also the #133
     `test_counterfactualFundsFollowCreatorTable` with `distribute` paying `C` 3 ether afterwards.
   - The remaining #133 PoCs pin accepted shapes as they are, adapted to the helpers and mocks:
     `test_delayZeroOwnerSweepsAtomically` (`SweepingOwner`), `test_nftViaTransferFromPhantomEscrow`
     (`PlainNFT`), `test_hugeBalanceOverflowsShareMath` (`BigToken`, `stdError.arithmeticError`),
     `test_selfRowRecycles`. Passes on both. Each gets a one-line comment naming the `SECURITY.md`
     row or decision that accepts the shape (decision 25, F4's decision 23, overview § 5 for the
     zero delay, the `create` NatSpec for the counterfactual deposit).
   - `test_hookRecipientStarvesLaterRows` (`:1096-1103`) **re-bisects**: `F8_SUCCEEDS_AT`
     (`:52`) is a bytecode-dependent figure and *spike* shows the test failing at 95,049,000 on the
     new code. Bisect one gas limit per transaction to the round thousand, as t05 did; record old and
     new in the handoff; the `SECURITY.md` F8 row's two figures move with it.

   Check: `forge test` all passed; the handoff names every test above with its failing assertion
   on `71c9f92` (`git stash` is not how — check out `71c9f92`'s `src/Distribution.sol` into the
   worktree, run, restore); `forge test --list | wc -l` is 72 plus the count added, stated.

6. **Snapshot, lint, fmt.** `forge snapshot` (the writing form). *Spike*, labelled: 46 of the 72
   existing rows move — the four `DistributionFactoryTest` rows by about +109,000 each (and
   `test_create2AddressStableAcrossChains` +218,129: two factories), because every `new
   DistributionFactory()` deploys 542 more bytes of implementation; the four renounce tests by
   +1,667 to +4,023 (the event, and `cancel` now reading `eta` before `owner`); everything else by
   under 700. Record every moved row with before and after in the handoff and a sentence for the two
   groups above. Then `forge lint` (0 `warning[`) and `forge fmt --check` **last** (`AGENTS.md`
   § Contracts: lint poisons the cache).

7. **The reference and the fixtures.** `docs/REFERENCE.md` § Functions: `claim` row; `applyQueued`
   gains "until `GRACE` after its eta"; `cancel` becomes "owner; anyone once the action has expired";
   `GRACE()` view row; `init` row notes the `Received` log. § Events: `Claimed` row;
   `Received`'s emitter column gains `init` with the `address(0)` sentinel; `OwnershipTransferred`'s
   gains the renounce branch (the "only trace of the handover" sentence is now true of a renounce
   too, so rewrite it). § Errors: `Expired(uint256 eta)` row; `NotOwner`'s caller column gains
   `cancel` of an unexpired action. The snapshot struct block is unchanged (`Pending` and `Snapshot`
   do not move; `test/docs.test.mjs` asserts it verbatim). Then `tools/abi-vectors.sh`: its selector
   list gains `claim(address,address)` and `GRACE()`; run `devbox run -- tools/abi-vectors.sh`,
   commit what it writes, and `node --test test/*.test.mjs` — `docs.test.mjs` is what checks the
   reference, `selectors.txt` and `src/` agree, so a missing row fails here, not in review. The
   `#/docs` prose in `app/src/index.html` that the changes make false, and only prose: the "anyone
   may apply it. Until it is applied, the owner may cancel it" sentences (`:1504`, `:1526`) gain the
   grace window and the anyone-may-cancel-after; the held-funds paragraph (`:1521`) gains the
   claim; the renounce paragraph (`:1534`) gains the event. **No dapp logic** — the pending view's
   deadline, the cancel-expired and claim buttons and `model.js`'s error map are m03-t09's, scoped
   when this merges. If `node --test` fails on anything other than a reference or fixture row, stop
   and say so.

   Check: `node --test test/*.test.mjs` all pass; `grep -c 'claim' docs/REFERENCE.md` ≥ 2;
   `grep -c 'GRACE' docs/REFERENCE.md` ≥ 2; `git diff --stat -- app/src/model.js app/src/eth.js
   app/src/widget.js` prints nothing.

8. **`SECURITY.md` rows, and only rows.** F5: **fixed in this PR** — `claim`, the two shapes it does
   not rescue, the tests; and the remedy sentence corrected: an escrow is recoverable by `claim`, or
   by `release` once the recipient can take the push; a re-table stops further escrow and recovers
   nothing already held (the sentence on `main` is wrong on this point — #136 item 3). F9 and F13:
   **fixed in this PR** — `GRACE`, `Expired`, cancel-by-anyone-when-expired, the three tests; F13's
   row says the ordering game is now bounded to the window. F8: the two re-bisected figures. § Carried
   issues: the #95 row says fixed by this PR; the #111 row says the renounce now emits. § Invariants:
   the count follows `forge test --list` (two-way `comm`), the new names join **The delay** ("a
   matured action is applicable only until `GRACE` after its eta; after that anyone may drop it")
   and a new group **The escrow** ("only the escrowed account can redirect its escrow, with its own
   gas"). **§ Prior reviews and § The reviewed commit do not change**: between this merge and t07's
   step 7, `SECURITY.md` names `b0fb4e3` with `src/Distribution.sol` moved, which criterion 4 does
   not allow at close-out — t07's step 7 is what restores it, and the handoff says so in one line.
   Also `ROADMAP.md` § Decisions 39 and 40 already record the rulings; do not edit them.

   Check: `grep -c 'fixed in this PR' SECURITY.md` is the previous count plus 3 (state both);
   `grep -c '^| F' SECURITY.md` → 13, unchanged.

9. **Hygiene, handoff, PR.** `forge build --force`, `forge test`, `forge snapshot --check` (exit 0
   on step 6's snapshot), `forge lint`, `forge fmt --check` last; `node --test`;
   `git status --porcelain` empty. `HANDOFF.md` from the template: the AC table with evidence; step
   0's and step 4's figures side by side; every failing assertion on `71c9f92`; the snapshot rows;
   the F8 re-bisect; § For t07 — the three things t07's known answer moves from *still in the code*
   to *closed* (F9/F13, F5/#95, #111's event) and the `src/Distribution.sol` hash t07's blinded
   tree must carry; § For t09 — every `app/` surface the ABI made stale (the `ERRORS` map's
   `Expired` selector, the pending view's deadline, cancel-expired for anyone, the escrow view's
   `claim`, #137's items). PR from the template with `Audit scope touched: src/Distribution.sol`,
   `Closes #136`, `Carries forward:` filled at review. Message the architect with the head.

## Acceptance criteria

- `git diff --stat b0fb4e3 HEAD -- src/App.sol` is empty: the only contract that moves is
  `Distribution`. `forge inspect Distribution abi --json | jq -r '.[]|select(.type!="constructor")|.name' | sort`
  diffed against the same list on `origin/main` shows **exactly four added lines** — `claim`,
  `Claimed`, `Expired`, `GRACE` — and nothing removed; both counts stated (39 → 43 expected).
- `forge test` all passed, and the handoff quotes each of these failing on `71c9f92`'s
  `src/Distribution.sol` with the assertion that failed: `test_applyQueuedExpires`,
  `test_strangerCancelsExpired`, `test_staleActionExpires`, `test_claimEthToSelfUncapped`,
  `test_renounceEmitsOwnershipTransferred`, `test_createForwardsValue` (flipped),
  `test_prefundedAddressLogsReceivedAtInit`. `test_renounceFreezes` is **unchanged** and passes
  (`git diff origin/main -- test/Distribution.t.sol` shows its body untouched).
- `forge snapshot --check` exit 0; `forge build --force` 0 `warning[` and 0 `Warning (`;
  `forge lint` 0 `warning[`; `forge fmt --check` exit 0; `node --test test/*.test.mjs` all pass
  with the count stated (62 plus any added).
- `Distribution` deployed bytecode and the delta against 8,729 stated; the factory 1,320.
- `docs/REFERENCE.md` carries `claim`, `Claimed`, `Expired` and `GRACE` rows, and `test/docs.test.mjs`
  passes against them; `test/fixtures/abi/selectors.txt` has `claim(address,address)` and `GRACE()`.
- `SECURITY.md`: F5, F9 and F13 read **fixed in this PR** naming their tests; F8's figures match
  `F8_SUCCEEDS_AT`; the escrow-remedy sentence no longer says a re-table recovers anything; `grep -c
  '^| F' SECURITY.md` → 13; § Prior reviews and § The reviewed commit unchanged
  (`git diff origin/main -- SECURITY.md` touches no line in either section).
- `git diff --stat origin/main -- app/` touches only `app/src/index.html`, and only inside `#/docs`
  prose (the handoff quotes the hunks); `make serve`'s dev stack still deploys and `node --test` is
  green, since the dapp never calls the new names until t09.
- #136 closes on merge; the PR body's `Audit scope touched` names `src/Distribution.sol`.
- `git status --porcelain` empty after the full gate sequence.

## Out of scope

- `src/App.sol` — t07's, in flight on `m03/t07-applock`. Do not rebase onto it or pick from it.
- Any dapp or widget **logic**: the `ERRORS` map, the pending view, the escrow view, #137 — m03-t09.
- Running or staging the audit; `audits/`, `SECURITY.md` § Prior reviews, § The reviewed commit,
  `README.md`'s `AUDIT` cell — t07's steps 5–7. Any new finding is t07's to disposition.
- A cap on the ERC-20 push (decision 36 stands), `_set` rejecting `address(this)`, `distribute`
  refusing a token whose every push fails (#136 drops both with reasons), a bound on `_pending`
  (#137), a `GRACE` variable.
- `TASK.md` amendments to m03-t06 and m03-t07 — the architect's, in the PR that carries this file.

## Open questions

None. The three design choices the decisions left open are fixed above with the alternative named:
`GRACE = 14 days` as a constant; `Claimed(token, account, to, amount)` rather than reusing
`Released`; `address(0)` as the `Received` sentinel at `init`.

## Context

- [#133](https://github.com/dnznlabs/rake/issues/133) — the research analysis and its `test/Poc.t.sol`
  attachment (the PoC source for step 5); the architect's triage comment is the disposition table.
- [#134](https://github.com/dnznlabs/rake/issues/134) (D16 → decision 39),
  [#135](https://github.com/dnznlabs/rake/issues/135) (D17 → decision 40),
  [#136](https://github.com/dnznlabs/rake/issues/136) (closed by this PR),
  [#137](https://github.com/dnznlabs/rake/issues/137) (t09's).
- `SECURITY.md` F5, F9, F13 and the #95 and #111 rows as they stand on `main`.
- `docs/ROADMAP.md` § Decisions 24 (the `release` failure path `claim` reuses), 25 (why
  cancel-by-anyone on a revert test was rejected and an expiry is different), 36 (no ERC-20 cap).
- [m03-t05 `TASK.md`](../m03-t05/TASK.md) and its handoff — the shape of a contract task here, the
  freeze language this task does **not** need, and the F8 bisection method.
- [m03-t07 `TASK.md`](../m03-t07/TASK.md) § Sequencing — t07 holds its freeze for this PR.
