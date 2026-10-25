# m02-t06 — Close-out fixes before Phase 5

Milestone: [M02](../../MILESTONE.md) · Phase: 4 — Docs and the widget (close-out)

When this is done five carried issues are closed and nothing Denizen meets in Phase 5 contradicts
itself: a second `make deploy` on a live anvil refuses instead of moving the featured address (#35);
the featured distribution's first screen shows the deposit as an activity row instead of "nothing
has arrived" over a 1 ETH balance (#42); token amounts are formatted by the token's own `decimals()`
(#43); `make chain-doc` writes outside forge's `out/` so a concurrent build cannot delete the document
mid-check (#66); and the reentrancy lock is proved against a token with transfer hooks, not only
against an ETH recipient (#21), with the CREATE2 collision's gas burn pinned by an assertion (#22,
test half). Nothing under `src/` changes.

## Plan

Every command runs from the repo root through `devbox run --` (forge/cast `1.7.1-dev`, node from
`devbox.lock`). Branch `m02/t06-close-out` from `origin/main` after the close-out docs PR that adds
this file has merged. A fresh worktree has no `lib/`: `git submodule update --init --recursive` before
the first `forge` command; check hooks with `ls .git/hooks | grep -v sample` (expect `pre-commit` and
`post-commit`). Do not run `make init`.

**Baseline, `main` at `9a0def6`, 2026-10-25 — re-run rather than quote.** `forge test` → 45 passed;
`node --test test/*.test.mjs` → 54 passed; `.gas-snapshot` 44 rows. `grep -rn 'out/chain'
tools AGENTS.md` → 6 lines (`tools/chain-doc.mjs:5,17,42`; `AGENTS.md:172,176,183`). `grep -n
'function transfer' test/mocks/Mocks.sol` → one, `MockERC20` (no hooks, no `decimals()`). `amt` is
one line at `app/src/index.html:157`, 18 decimals hard-coded, used at `349, 352, 357, 406, 807–808,
814`. `Seed.s.sol:42` is `factory.create{value: DEPOSIT}(…)`. `mk/10-forge.mk:34–37` is the `deploy`
recipe: a chain check and the `Deploy*.s.sol` loop, no guard.

Steps 5 and 6 were spiked on 2026-10-25 against `main` at `9a0def6` in a throw-away
`test/Spike.t.sol`: the mock and the three assertions below compiled under `forge build --force`
and passed (`test_collisionBurnsTheGasLimit` at `1,040,502,788` gas; `used 1,038,281,331` of
`before 1,071,503,263`). The spike was discarded; the step gives its shape, not its text.

1. **`make deploy` refuses a chain that already has the factory (#35).** In `mk/10-forge.mk`, between
   the chain check and the loop in the `deploy::` recipe, read the current broadcast log the way
   `addresses` does: if `broadcast/*/$(CHAIN_ID)/run-latest.json` exists and names a
   `DistributionFactory` whose address has code at `$(RPC)` (`cast code … --rpc-url $(RPC)` not `0x`),
   print one line — `deploy: chain $(CHAIN_ID) at $(RPC) already has DistributionFactory at <addr> —
   restart anvil for a fresh chain, or 'make dapp-nodev && make chunks && make dapp' to re-upload the
   dapp` — and `exit 1`. A missing log, or a logged address with no code (anvil restarted), falls
   through to the loop as today. Because `deploy::` is double-colon, `exit 1` in this recipe stops
   `make`, so the seed and the dapp recipes in `mk/15-seed.mk`, `mk/20-dapp.mk` and `mk/30-onchain.mk`
   do not run either — that is the point. Then one sentence in `AGENTS.md` § Contracts, on the
   `implementation()` bullet: the factory is placed by plain CREATE from the deployer's nonce, so the
   factory, the implementation and every `predict()` move together with the sender's nonce history,
   which is why a second deploy on one chain moves the featured address and why M03's runbook needs a
   deterministic deployer (#35's measurement). **Check:** on a fresh `make serve`, `make deploy`
   succeeds; a second `make deploy` prints the line, exits 1, and `cast call <factory>
   "predict(bytes32)(address)" $FEATURED_SALT` and `make addresses` print the same addresses as
   before it. `make deploy ANVIL_PORT=8546 CHAIN_ID=31338` against a second anvil still proceeds.
   Phase 5's consequence 1 in `MILESTONE.md` (re-chunking is `make dapp-nodev && make chunks`) is
   already worded for this guard.
2. **The seed deposit emits `Received` (#42).** `scripts/forge/Seed.s.sol:42`: `create` with no value,
   then `(bool ok,) = distribution.call{value: DEPOSIT}(""); require(ok, "deposit");` then the
   `propose`. Rewrite the comment at `40–41` to say the deposit is a plain transfer so the dev chain
   has one `Received` log (#42), not that it rides the CREATE2. `AGENTS.md` § Contracts' seed bullet
   does not mention the value path, so it stands. **Check:** on a fresh chain after `make deploy`,
   `cast logs --rpc-url $RPC --from-block 0 --address <featured> "Received(address,uint256)"` prints
   exactly one log; the dapp's `#/` activity list shows `in 1.0000 ETH from 0xf39F…2266` under
   "funds", and the meta strip still reads `1.0000 ETH waiting to distribute`. `make deploy` on the
   31338 chain shows the same row with its own table.
3. **Amounts by the token's decimals (#43).** In `app/src/index.html`: `amt(w, dec = 18)` truncates to
   four places for any `dec ≥ 4` (divide by `10n ** BigInt(dec - 4)`), and a token whose `decimals()`
   call fails is shown in raw units with the suffix `raw` so a wrong number is never printed. A
   `DECIMALS` map seeded with `[ZERO, 18]`; a `decimalsOf(tk)` that reads `call(tk, 'decimals()', [],
   ['uint8'])` once per token, caches it, and caches `null` on failure. The activity rows (`349–357`)
   are built synchronously from logs today, so move the formatting of `e.what` to where `history()`
   resolves in `loadDistro` (`~668`): collect the token set from `h.funds`, `await` their decimals in
   one `Promise.all`, then build the rows — the same place `readFunds` (`784`) already awaits per
   token, so add `decimalsOf` to that `Promise.all` rather than a second pass. ETH paths (`349`,
   `406`) are unchanged. **Check:** `node --test` gains cases in `test/model.test.mjs` or a new
   `test/amt.test.mjs` for `amt` at 18, 6 and 0 decimals and the raw fallback — if `amt` is not
   exported through `app/inline-scripts.mjs`'s mechanism, follow how `Model` reaches
   `test/model.test.mjs` and do the same. On chain: `make fixtures` deploys `MockERC20`, which has no
   `decimals()`, so its rows must read `… raw`; then deploy a 6-decimal token by hand (`forge create`
   a `MockERC20` subclass with `decimals() returns (uint8) { return 6; }` under `test/mocks/`, or
   `cast send` through an existing mock — whichever is shorter; name it in the handoff), `transfer`
   `1500000` of it to the featured distribution, `distribute(<token>)` from the dapp, and the
   `Distributed` row reads `1.5000 <short addr> by the table`, not `0.0000`.
4. **`chain-doc` writes under `app/chain/` (#66).** `tools/chain-doc.mjs:42` default `app/chain/index.html`;
   its header comment lines `5` and `17` to match; `.gitignore` gains `app/chain/` beside `app/dist/`
   under the `dapp` fragment; `mk/20-dapp.mk`'s `clean::` removes it too; `AGENTS.md:172,176,183`
   say the new path. **Check:** `grep -rn 'out/chain' tools AGENTS.md mk .gitignore` prints nothing;
   `make chain-doc` then `forge build --force` then `ls app/chain/` still lists `index.html`,
   `index.inflated.html`, `widget.js`; `git status --porcelain` empty after `make chain-doc`.
5. **The lock against a hook token (#21).** `test/mocks/Mocks.sol` gains `HookToken(Distribution
   target, Hook hook)` with `enum Hook { Distribute, Release }`, `mint`, `balanceOf`, and a `transfer`
   that first low-level-calls `target.distribute(address(this))` or `target.release(address(this),
   to)`, records `(hookOk, hookData)` in public storage, then moves the balance and returns `true`.
   Recording rather than bubbling is deliberate: the outer `distribute` then takes its success path,
   and the test asserts the lock directly from `hookData`. In `test/Distribution.t.sol`,
   `test_hookTokenDistributeIsLocked`: a zero-delay distribution with the suite's two-row table,
   `tk.mint(address(d), 10_000)`, `d.distribute(address(tk))`; assert `tk.hookOk()` false,
   `tk.hookData()` equals `abi.encodeWithSelector(Distribution.Locked.selector)`, `tk.balanceOf(A)`
   6000, `tk.balanceOf(B)` 4000, `d.reserved(address(tk))` 0. `test_hookTokenReleaseIsLocked`: the
   `Release` variant through the same `distribute`, asserting the same two hook fields — `release`
   itself cannot be entered from a hook token without an escrow to release, and a token that returns
   `true` never escrows, so the release-selector callback under the lock is what this proves; say so
   in the test comment. Both passed in the spike. **Check:** `forge build --force && forge test` →
   47 passed; `forge snapshot` adds the two rows; `forge snapshot --check` exit 0 after.
6. **The collision's gas burn is asserted (#22, test half).** In `test/DistributionFactory.t.sol`,
   `test_saltFrontRunningRejected` at `82–85`: take `uint256 before = gasleft();` before the
   `vm.prank`/`vm.expectRevert`/`create` trio and `assertGt(before - gasleft(), before * 9 / 10, "the
   collision burns the gas available, not a cheap revert")` after it. Nine tenths, not a number: the
   figure depends on the harness gas limit (`1,071,503,263` available in the spike, `1,038,281,331`
   used), and the claim being pinned is "the whole limit", which `63/64` of the available gas
   satisfies and a cheap revert never can. Passed in the spike as its own test; folding it into the
   existing one keeps the snapshot to one moved row. **Check:** the test passes; its `.gas-snapshot`
   row changes and no other factory row does.
7. **Close-out.** `forge build --force`, `forge test`, `forge snapshot`, `make fmt`, `forge lint`,
   `node --test test/*.test.mjs`, `make deploy` on a fresh anvil and on 31338, `make chain-doc`;
   `git status --porcelain` empty after all of them. `HANDOFF.md` beside this file records the test
   counts, the two snapshot rows, the deploy refusal line verbatim, the `Received` log, the
   6-decimal row, and the measured gas figures. The PR closes #21, #35, #42, #43 and #66 with one
   `Closes` line each, and **does not** close #22 — comment on it that the test half landed and the
   `SECURITY.md` half stays M03's.

## Acceptance criteria

- M02 criterion 9 in full (`forge build --force` warning-free, `forge lint` and `make fmt` silent,
  `forge snapshot --check` exit 0, clean tree after each listed command, criterion 9's grep empty).
- Criterion 2 re-run: the featured distribution's `snapshot()` still shows two rows, a non-zero delay
  and one pending action, and now one `Received` log.
- Criterion 8 re-run: `make chain-doc` after `make dapp-nodev` prints `inflated sha256` equal to
  `sha256sum app/dist/index.html` and `widget sha256` equal to `sha256sum app/dist/widget.js`, with
  the files under `app/chain/`.
- A second `make deploy` on a live chain exits 1 with the line in step 1 and moves no address.
- `forge test` 47 passed; `node --test` passes with the new `amt` cases.
- Each of #21, #35, #42, #43, #66 is closed by the PR's `Closes` lines; #22 carries the comment.

## Out of scope

- `src/Distribution.sol`, including the `_push` comment #61 names — M03 reads that pair.
- Rendering "arrived before this chain's history" for a non-zero balance with no logs (#42 option b)
  — a copy change for Denizen's Phase 5, surfaced in the handoff if it is still wanted after (a).
- The `SECURITY.md` entry for #22; `SECURITY.md` does not exist before M03.
- The landing diagram (#50) and anything else Phase 5 owns.
- A `decimals()` read for the widget: it renders shares, not amounts, and has no token rows.

## Open questions

None. The one choice — bubble or record in the hook token — is fixed in step 5 with its reason.

## Context

- Issues: [#21](https://github.com/dnznlabs/rake/issues/21), [#22](https://github.com/dnznlabs/rake/issues/22),
  [#35](https://github.com/dnznlabs/rake/issues/35), [#42](https://github.com/dnznlabs/rake/issues/42),
  [#43](https://github.com/dnznlabs/rake/issues/43), [#66](https://github.com/dnznlabs/rake/issues/66).
- `MILESTONE.md` § Phase 5 § Consequences 1 and 4 (why re-chunking is manual and why CI misses it).
- `docs/ROADMAP.md` decision 10 (sender-bound salts) and § Findings carried forward (#22's measurement).
- m02-t05 `HANDOFF.md` § Discoveries 4 (the `out/chain/` wipe) and § The gas snapshot (how to attribute
  moved rows).
