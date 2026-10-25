# m02-t06 — handoff

PR: #71 · Branch: `m02/t06-close-out` · 2026-10-25

Five carried issues are closed and #22's test half has landed. `make deploy` now refuses a chain that
already carries the factory instead of silently moving the featured address (#35); the seed's deposit
is a plain transfer, so the dev chain has the one `Received` log the first screen needs (#42); token
amounts are formatted by the token's own `decimals()`, and a token that cannot answer is shown in raw
units rather than as a wrong number (#43); `make chain-doc` writes under `app/chain/`, outside the
directory a `forge build` empties (#66); the reentrancy lock is proved against a token whose
`transfer` calls back into `distribute` and into `release` (#21); and the CREATE2 collision's gas burn
is pinned by an assertion rather than described in prose (#22, test half). Nothing under `src/`
changed — `git diff --stat origin/main -- src` is empty.

Measured on two fresh anvils, `:8599` (31337) and `:8546` (31338), one deploy each, everything through
`devbox run --` (forge/cast `1.7.1-dev`, node from `devbox.lock`). Figures are this branch's, re-run
rather than quoted.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| **M02 criterion 9 in full** | pass | `forge build --force` → `Compiler run successful!`, no `Warning (` or `warning[`; `forge lint` and `make fmt` silent; `forge snapshot --check` exit 0 with no `Diff in`, and its own output shows `Ran 22 tests for test/App.t.sol:AppTest`, `Ran 20 tests for test/Distribution.t.sol:DistributionTest`, `Ran 5 tests for test/DistributionFactory.t.sol:DistributionFactoryTest` — so it measured the suites this task edited, not a lint-poisoned pass. `grep -rnE '\btip\b\|govUrl\|about:\|ownerKind\|rake\.distro' app/src` prints nothing. `git status --porcelain` empty after `forge build --force`, `forge test`, `forge snapshot`, `node --test`, `make deploy` on both chains, `make dapp-nodev`, `make dapp`, `make fixtures` and `make chain-doc`. |
| **Criterion 2 re-run** | pass | On the fresh 31337 chain: `beneficiaries()` → 2 rows, `delay()` → `604800`, `pendingCount()` → `1`, balance `1000000000000000000`, and **one** `Received` log — `cast logs … "Received(address,uint256)"` → 1 entry, block 4, `data 0x…0de0b6b3a7640000`, topic1 `0xf39f…2266`. Same shape on 31338 (1 log, 1 ETH, 2 rows). |
| **Criterion 8 re-run** | pass | After `make dapp-nodev`: `make chain-doc` → `inflated bytes 88388`, `inflated sha256 1e61c88d504697f1d1d7925bc0178c4495f7ced099a28408834efcafb65808cc` = `sha256sum app/dist/index.html`; `widget bytes 7677`, `widget sha256 6221a653ef7e41eddae9694561e6aea1cd8844ac7d50c9864a35374814ef773e` = `sha256sum app/dist/widget.js`. The files are under **`app/chain/`**, and `ls app/chain/` after a `forge build --force` still lists `index.html`, `index.inflated.html`, `widget.js` — which is the whole point of #66. |
| **A second `make deploy` exits 1 and moves no address** | pass | Verbatim: `deploy: chain 31337 at http://127.0.0.1:8599 already has DistributionFactory at 0x5FbDB2315678afecb367f032d93F642f64180aa3 — restart anvil for a fresh chain, or 'make dapp-nodev && make chunks && make dapp' to re-upload the dapp`, then `make: *** [mk/10-forge.mk:44: deploy] Error 1`. The recipe exits 1; `make`'s own status is 2 (see § Deviations 2). `make addresses` and `cast call <factory> "predict(bytes32)(address)" $FEATURED_SALT` `diff`-identical before and after. On 31338 the first deploy **proceeded** and its own second run refused with its own chain id, so the guard is per chain. |
| **`forge test` 47; `node --test` with the new `amt` cases** | pass | `forge test` → `47 tests passed, 0 failed` (45 → 47). `node --test test/*.test.mjs` → `tests 61 · pass 61 · fail 0` (54 → 61), `test/amt.test.mjs` listed, seven cases: 18 decimals, 18-as-default, 6 decimals, under-four, the `raw` fallback, every token call site passing a `dec`, and the cache seeded with ETH. |
| **#21/#35/#42/#43/#66 closed by the PR; #22 commented** | pass | The PR body carries one `Closes` line each for #21, #35, #42, #43 and #66, verified through `closingIssuesReferences`; #22 is **not** closed and carries a comment that the test half landed and `SECURITY.md` stays M03's. |

## What the dapp renders (step 3, on chain and in a browser)

The 6-decimal half was driven in the Playwright chromium against the dev bundle on `:3097` and the
`:8599` chain, because the row text is produced by the page and no other check can see it:

- `MockERC20Dec6` deployed at `0x68B1D87F95878fE05B998F19b66F4baba5De1aed`, `decimals()` → `6`;
  1,500,000 units minted to the featured distribution and `distribute(token)` sent. Its activity row
  reads **`distributed 1.5000 0x68B1…1aed by the table`** — the same amount read under the old
  hard-coded 18 would have printed `0.0000`.
- The escrow demo's `MockERC20`, which has no `decimals()`, reads
  **`distributed 100000000000000000000 raw 0xB7f8…4F5e by the table`** and
  `escrowed 50000000000000000000 raw 0xB7f8…4F5e · 0x7099…79C8` — raw units with the suffix, never a
  scaled guess.
- The ETH paths are untouched: `in 1.0000 ETH from 0xf39F…2266` (which is also #42's row, on the
  featured distribution's first screen), `distributed 1.0000 ETH by the table`,
  `escrowed 0.5000 ETH · 0x6101…D788`, and the funds block's `ETH waiting to distribute 1.0000`.
- `pageErrors: []`, `consoleErrors: []` across both pages.

## The gas snapshot

`.gas-snapshot` goes **45 rows → 47**. Two new rows, `test_hookTokenDistributeIsLocked` at `703,747`
and `test_hookTokenReleaseIsLocked` at `704,369`. Seventeen rows moved, all of them accounted for:

| row | delta | why |
|:--|--:|:--|
| `DistributionFactoryTest:test_saltFrontRunningRejected` | **+3,966** | step 6's own additions inside that test — the `gasleft()` pair, the `assertGt`, and the two `log_named_uint` emits that make the figures quotable under `-vv` |
| 16 × `DistributionTest:*` | +16 to +44 | step 5's two new test names change `DistributionTest`'s selector set, so dispatch reorders around them; same mechanism t05's handoff attributes, two orders of magnitude smaller |

**No `AppTest` row moved** — all 22 are byte-identical, which is what you would expect from a task
that does not touch `src/App.sol` or `test/App.t.sol`.

The collision's burn, read from the test's own logs rather than inferred:

```
collision gas available: 1071450484
collision gas used:      1038230139
```

That is a ratio of `0.96900`, which is `(63/64)²` to five places — the two nested 1/64 retentions
(test → `create` → `create2`). The assertion is `used > before * 9 / 10`, so it pins "the whole
limit" without pinning a figure that moves with the harness.

## Deviations from the plan

1. **Three worktrees, one branch.** The work ran as two parallel lanes — the Solidity tests (steps 5,
   6) and the `amt` work (step 3) — on their own branches, cherry-picked onto `m02/t06-close-out` with
   the make/scripts/tools/docs steps (1, 2, 4) and this file. Same commits, one PR, disjoint file sets.
2. **"exits 1" is the recipe, not `make`.** The guard's `exit 1` makes `make` print
   `*** [mk/10-forge.mk:44: deploy] Error 1` and exit **2**, which is `make`'s status for a failed
   recipe. Anything scripting `make deploy` should test for non-zero, not for `1`.
3. **`decimalsOf` does a plain `eth_call`, not `call(tk, 'decimals()', [], ['uint8'])`.**
   `Eth.dec(['uint8'], '0x')` returns `0n` rather than failing, so a token that answers nothing would
   be read as a **0-decimal** token and printed in whole units — precisely the wrong number the `raw`
   path exists to prevent. The helper treats a return shorter than one word as a failure, then decodes.
   Same shape, same cache, one extra guard.
4. **Under four decimals the value scales up rather than truncating** (`v * 10n ** BigInt(4 - dec)`),
   so a 0-decimal token's `1500` reads `1500.0000`. Below four places there is nothing to truncate, so
   scaling is exact; it also keeps four places a property of the column rather than of the token, so
   the funds ledger stays aligned, and `dec = 4` needs no special case.
5. **The `raw` suffix lands inside the amount**, so the row reads
   `distributed 1500000 raw 0xB7f8…4F5e by the table`. Both of the plan's sentences describe `amt`, so
   that is where it went.
6. **A new `test/amt.test.mjs` rather than cases in `test/model.test.mjs`.** The mechanism by which
   `Model` reaches its test is *being a separate module* that `/*@inline@*/` pulls in, and moving `amt`
   into `app/src/model.js` is a larger change than step 3 asks for. The new file follows
   `widget.test.mjs`'s precedent instead: it lifts the declaration out of `app/src/index.html` and
   evaluates it, asserting both ends of the slice so a reformat fails with a sentence rather than
   silently testing nothing. **If `amt` should live in `model.js`, that is a one-line move plus a
   re-point of this test. **Decided at review: `amt` stays in `index.html`, and the move to
   `model.js` rides whichever Phase 5 PR next touches the formatter.**
7. **The collision test emits two `log_named_uint` lines.** Step 6 asks only for the `gasleft()` pair
   and the `assertGt`; the emits exist so the figures above can be read off `-vv` instead of being
   re-derived, and they are part of that row's +3,966.
8. **`h-changes` and `pending` now fill before the decimals pass**, with `h-funds` after. The plan left
   the order implicit; the fills are `innerHTML` into fixed slots, so DOM order is unaffected, and a
   slow `decimals()` read no longer holds back the lists that do not need it.
9. **`MockERC20Dec6` is `MockERC20` by inheritance plus `decimals()`**, so the existing `MockERC20`
   still has **no** `decimals()` — the `raw` half of step 3's check depends on that.
10. **The 6-decimal `distribute` was sent with `cast`, not clicked in the dapp.** `distribute` is
    permissionless and emits the same log either way; what step 3 actually pins is the *row*, and the
    row was read in a browser from the rendered page.

## Discoveries

1. **`.gas-snapshot` has 45 rows at the baseline, not 44.** The plan's figure (and my own first
   measurement) came from `wc -l`, which undercounts by one because the file has no trailing newline.
   `grep -c ''` is the honest count: 45 before, 47 after. Any future row arithmetic on this file wants
   `grep -c ''`.
2. **`main`'s bundle is no longer t05's.** It is raw 88,388 / gzip 27,321 for the non-dev build here,
   against t05's 85,737 / 26,349: the widget snippet commits that landed with #65's merge added to the
   docs page. t05's § Size figures are superseded, not wrong.
3. **`forge create --constructor-args` is variadic and swallows the flags after it** — `--constructor-args 0
   --rpc-url …` sent the deploy at the default `localhost:8545` and failed with a connection refusal
   that looks like a dead chain. Put `--constructor-args` last.
4. **#65 was rebased into `main` after all**, so t05's sixteen commits are eight, authored and signed
   as Denizen, and none of the original SHAs is an ancestor of `main`. Nothing to fix now — recorded
   because rake still has squash and rebase enabled, and this PR raises the same question.
5. The featured distribution's funds block was still showing `reading the balances and the escrow…`
   at the instant the escrow-demo page was sampled — the per-token reads had not settled. Not a
   defect, and not a regression from step 3: the activity rows it gates on had already rendered.

## Open questions

None. The plan's one choice — record rather than bubble in the hook token — was taken as written, and
the `dec < 4` reading it left open is settled in § Deviations 4.
