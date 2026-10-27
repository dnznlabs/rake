# m03-t01 — The two measurements

Milestone: [M03](../../MILESTONE.md) · Phase: 2 — The code the review will read

When this is done, the two numbers M01 left as guesses are measured and pinned by tests: the gas a
multisig.software vault clone and a Safe each need to `receive` ETH from `distribute`, against
`PUSH_GAS`; and the gas `distribute` spends per row when every push is escrowed, and so the table
length that stays under half a 30M block. Nothing under `src/` changes. The figures feed two rulings
(D8 and D11) and t02 writes the constants.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, cast `1.7.1-dev`).
Branch `m03/t01-measurements` from `origin/main` at or after `3bae486` (#91). Check hooks with
`ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`); run
`devbox run -- pre-commit install --install-hooks` if either is missing. Do not run `make init`.

1. **Capture the canonical bytecode, with provenance.** Add `tools/bytecode-fixtures.sh` (bash,
   `set -euo pipefail`, through devbox) that writes one `.hex` per contract under
   `test/fixtures/bytecode/` with `cast code <addr> --rpc-url "$RPC"`, and a `PROVENANCE.md` beside
   them recording for each: address, chain (`cast chain-id`), block (`cast block-number`), byte
   length, `cast keccak` of the code, the RPC used, and the date. The five, with what this VM saw
   on 2026-10-27 at Ethereum block 26,283,809 via `https://ethereum-rpc.publicnode.com`:

   | fixture | address | bytes | codehash (prefix) |
   |:--|:--|--:|:--|
   | `safe-v1.4.1/singleton.hex` | `0x41675C099F32341bf84BFc5382aF534df5C7461a` | 23,579 | `0x1fe2df852ba3299d` |
   | `safe-v1.4.1/factory.hex` | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` | 3,054 | `0x50c3cdc4074750a7` |
   | `multisig/implementation.hex` | `0xD54cb65224410F3Ff97a8E72f363f224419f4FB0` | 10,532 | `0xca195fdffa34ca3a` |
   | `multisig/factory.hex` | `0x000000000e8CB9ed9DC2114d79d9215eacb9cB07` | 2,349 | `0x213b1d76ad1ca04f` |

   The Safe singleton's full codehash is
   `0x1fe2df852ba3299d6534ef416eefa406e56ced995bca886ab7a553e6d0c5e1c4`, the value upstream pins
   (`src-company/multisig`, `test/SafeComparison.t.sol`, `SAFE_CODEHASH`). The multisig addresses
   are the ones its README § Deployments publishes; the byte counts match its comparison table
   (10,532 and 23,579). These are **runtime** bytecodes, etched in step 2: `receive()` runs runtime
   code, a creation deploy yields byte-identical runtime, and the codehash assertion is what proves
   the fixture is the audited contract. Criterion 3 is reworded to say so in this task's PR.

   Add to `foundry.toml`, under the existing `fs_permissions` block:
   ```
   [[profile.default.fs_permissions]]
   access = "read"
   path = "./test/fixtures/bytecode"
   ```
   Check: the script is idempotent against a fixed block — run it twice with `BLOCK=26283809`
   (`cast code --block`), `git status --porcelain` is empty the second time. Commit the fixtures.

2. **`test/PushGas.t.sol`, contract `PushGasTest`: what the two recipients need.** `setUp` etches
   the four fixtures at their canonical addresses with `vm.etch(addr, vm.parseBytes(vm.readFile(…)))`
   and asserts `SAFE_SINGLETON.codehash` equals the full hash above (fail loudly if the fixture is
   not canonical — same line as upstream). The multisig implementation **must** sit at
   `0xD54c…4FB0`: the factory's clone bytecode embeds that address
   (`0x5f5f365f5f37365f73D54c…4FB05af43d…`, README § Deployments), so a clone of an implementation
   etched anywhere else delegates into empty code and `receive` silently succeeds for 250 gas.
   Then deploy one of each as a real wallet would exist on chain:
   - a Safe: `ISafeProxyFactory(SAFE_FACTORY).createProxyWithNonce(SAFE_SINGLETON, setupCalldata, 1)`
     with `setup([owner], 1, address(0), "", address(0), address(0), 0, payable(address(0)))` — one
     owner, no fallback handler (it is not on the `receive` path; `SafeReceived` is emitted by the
     singleton itself);
   - a vault clone: `IMultisigFactory(MULTISIG_FACTORY).create([owner], 0, 1, address(0), salt)`
     with a salt whose top 20 bytes are `address(0)` (permissionless; the factory checks the prefix).
   Both interfaces are declared in the test file from upstream's `SafeComparison.t.sol` and the
   multisig README; four functions, no import.

   Build a `Distribution` through the project's own factory with the two as a 5000/5000 table (sort
   the addresses: `_set` requires ascending), fund it through `PlainSender`, then **cool before
   measuring**: `vm.cool` on the Safe proxy, the clone, both singletons and the `Distribution`
   clone's implementation, so every `DELEGATECALL` pays the 2,600 cold cost — the M01 handoff's
   finding (#18) is that warm measurements flatter this path. Measure two ways and report both:
   - **The real path.** `vm.recordLogs()`, `distribute(address(0))`, assert no `Escrowed` log and
     both balances increased by half. This is the criterion's test.
   - **The minimum.** For each recipient, cooled the same way, the smallest explicit gas cap under
     which `to.call{value: 1 wei, gas: cap}("")` returns `ok` — binary search between 0 and
     `PUSH_GAS`, the method M01 used for the clone (1,662 with the event, 250 without). Assert the
     result is under `PUSH_GAS` for both, and `emit log_named_uint` it.
   Check: `forge test --mc PushGasTest -vv` passes and prints both minima. Both are expected to land
   in the low thousands (a cold `DELEGATECALL`, one event, no storage write); if either is above
   `100_000`, D11's option 2 applies and the handoff says so first.

3. **`test/TableCap.t.sol`, contract `TableCapTest`: what a row costs when it fails.** Worst case
   for `distribute` is a row whose recipient burns everything it is given and then fails, so each
   row pays `PUSH_GAS` in full plus the escrow writes. Add `GasBurner` to `test/mocks/Mocks.sol`:
   `receive()` is `while (true) {}` — consumes the forwarded gas, the call returns `false`, the
   caller keeps going. For a table of `n` rows, etch the burner's runtime code at `n` ascending
   addresses (`address(uint160(0x10000 + i))`; `_set` needs ascending and distinct) with equal
   `bps` and the remainder on the last row. Fund, then measure `distribute(address(0))` by
   `gasleft()` delta at `n = 1`, `n = 8`, `n = 64` and assert every row was escrowed (`n` `Escrowed`
   logs, `reserved[address(0)]` equals the amount). Derive the per-row cost from the two larger
   points and the fixed cost from the intercept; **do not compute the cap from a formula** — the
   first row's `reserved` write is a zero-to-nonzero SSTORE and later rows' are warm, so the curve
   has a knee. Then the pinning test: a table of `CAP` rows, `CAP` the largest `n` whose measured
   `distribute` is under `15_000_000`, asserted by running it (`assertLt(gasUsed, 15_000_000)`), and
   `CAP + 1` rows asserted over. `CAP` is a test-file constant in this task; t02 moves it into
   `src/Distribution.sol` under D8 and this test reads it from there. Check:
   `forge test --mc TableCapTest -vv` passes and prints per-row, fixed, `CAP` and the gas at `CAP`.

4. **Snapshot and the suite.** `forge snapshot` (not `--check`) to add the new rows; `forge test`,
   `forge build --force` with zero warning lines, `forge lint`, `forge fmt --check`. Check:
   `grep -c '' .gas-snapshot` is 47 plus the number of tests added; `git diff --stat origin/main -- src/`
   is empty.

5. **Handoff.** `HANDOFF.md` beside this file carries one table: Safe `receive` minimum, clone
   `receive` minimum, headroom under `PUSH_GAS` (`100_000` minus the larger), per-row worst-case
   gas, fixed gas, `CAP`, gas at `CAP`, gas at `CAP + 1`, each with the command that printed it.
   Then post the `receive` figures as a comment on #88 (D11) and the cap figures on #85 (D8) — the
   rulings are one line each once the numbers are on the issue. The architect records both in
   `ROADMAP.md` § Decisions.

6. **PR** titled `test(m03): measure PUSH_GAS and the table cap`, in the PR template's form.
   Review: architect first against this file, Product Owner second. The Phase 1 deadline is the
   day *this task's docs PR* opened, not this one (§ Human-in-the-loop requirements); by the time
   the test PR opens, every `decision` issue has a ruling or its default.

## Acceptance criteria

- `forge test --mc PushGasTest` passes; its log names both `receive` minima and both are under
  `100_000`; the real-path test emits no `Escrowed`.
- `forge test --mc TableCapTest` passes; `CAP` rows of the worst case `distribute` under
  `15_000_000` and `CAP + 1` do not.
- `test/fixtures/bytecode/PROVENANCE.md` names address, chain, block, bytes, codehash, RPC and date
  for all four fixtures; `PushGasTest.setUp` asserts the Safe singleton codehash.
- `git diff --stat origin/main -- src/` is empty. `forge build --force` prints zero warning lines;
  `forge lint` and `forge fmt --check` are silent; `.gas-snapshot` has 47 + (tests added) rows.
- `HANDOFF.md` has the figures table with the commands; #88 and #85 each have the comment.
- Milestone criterion 3, measurement half: both figures exist in tests on this branch.

## Out of scope

- Changing `PUSH_GAS` or adding the cap to `src/` — t02, under D11 and D8.
- Safe modules, the fallback handler, `SafeL2`, L2 chains: none is on the `receive` path.
- ERC-20 pushes: bounded by the token, not by `PUSH_GAS`; the overview's measurement question is
  about ETH.
- The stipend qualifier for the overview § 5 (#18, criterion 5) — t04.
- Anything the burner test suggests about `release` or `_push` — a HANDOFF.md note, not a change.

## Open questions

None. Two choices this plan makes rather than asks: runtime bytecode with a codehash assertion
stands in for "published creation bytecode" (step 1), and `CAP` lives in the test until t02 (step 3).
Both are the architect's, recorded here.

## Context

- [`MILESTONE.md`](../../MILESTONE.md) § Acceptance criteria 3; § Human-in-the-loop requirements D8
  and D11 ([#85](https://github.com/dnznlabs/rake/issues/85),
  [#88](https://github.com/dnznlabs/rake/issues/88)).
- [M01 t01 `HANDOFF.md`](../../../m01/tasks/m01-t01/HANDOFF.md) § the 2,300-gas finding (#18): the
  binary-search method and why cold matters.
- `docs/brainstorming/PROJECT_OVERVIEW.md` § 6: "`PUSH_GAS` value. 100k is a guess. Measure what a
  multisig.software clone and a Safe actually need to receive ETH."
- Upstream harness to copy the shape of, not the code:
  [`src-company/multisig` `test/SafeComparison.t.sol`](https://github.com/src-company/multisig/blob/main/test/SafeComparison.t.sol)
  (etch, codehash assert, `vm.cool` before measuring) and its README § Deployments (addresses, the
  clone bytecode).
