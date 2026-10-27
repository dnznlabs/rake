# m03-t01 — handoff

PR: #<n> · Branch: `m03/t01-measurements` · 2026-10-27

The two numbers M01 left as guesses are measured and pinned by tests. A Safe v1.4.1 proxy needs
**4,029** gas to `receive` ETH and a multisig.software vault clone needs **404**, both against a
`PUSH_GAS` of `100_000` — so the guess is not merely safe, it is **23× the larger requirement**, and
D11's option 2 (raise the cap) does not apply. A row whose recipient burns the push and fails costs
**138,917** gas, which puts the largest table that distributes under half a 30M block at **107 rows**
(14,896,325) with 108 over it (15,035,242). Nothing under `src/` changed: `git diff --stat
origin/main -- src/` is empty.

Every figure below was re-run on the integrated branch rather than carried over from the lane that
produced it, and the two methods for the `receive` minima agree to the gas (§ The cross-check).

## The figures

| figure | value | command |
|:--|--:|:--|
| Safe v1.4.1 proxy, minimum gas cap to `receive` | **4,029** | `forge test --mc PushGasTest -vv` |
| multisig.software clone, minimum gas cap to `receive` | **404** | `forge test --mc PushGasTest -vv` |
| `PUSH_GAS` headroom over the larger | **95,971** | `forge test --mc PushGasTest -vv` |
| the real path: `distribute(address(0))` paying both, cold | 34,680 | `forge test --mc PushGasTest -vv` |
| worst-case gas per row (recipient burns the cap, then fails) | **138,917** | `forge test --mc TableCapTest -vv` |
| fitted fixed gas (see the caveat below) | 29,703 | `forge test --mc TableCapTest -vv` |
| `CAP` — largest table under 15,000,000 | **107** | `forge test --mc TableCapTest -vv` |
| gas at `CAP` | **14,896,325** | `forge test --mc TableCapTest -vv` |
| gas at `CAP + 1` (108 rows) | **15,035,242** | `forge test --mc TableCapTest -vv` |

The three points the per-row figure is fitted from, and the arithmetic, so a reviewer can redo it:

```
gas at n=1 : 168623
gas at n=8 : 1141039
gas at n=64: 8920391

per-row = (8,920,391 − 1,141,039) / 56 = 7,779,352 / 56 = 138,917   exactly
fixed   = 1,141,039 − 138,917 × 8     = 1,141,039 − 1,111,336 = 29,703
line at n=1 = 29,703 + 138,917 = 168,620   against 168,623 measured, +3
```

## The cross-check

The `receive` minima were measured twice by different methods and agree:

- **Binary search** on the explicit cap: the smallest `gas:` under which `to.call{value: 1 wei, gas:
  cap}("")` returns `ok` — 4,029 and 404.
- **The real `distribute`**, read off the trace: the two push frames cost `[6329]` and `[2704]`,
  which are exactly `4,029 + 2,300` and `404 + 2,300`. The 2,300 is the stipend `_push` adds on top
  of the explicit cap for a value-bearing call.

```
├─ [34230] 0x613Ec2Ca…::distribute(0x00…00)
│   ├─ [34069] Distribution::distribute(0x00…00) [delegatecall]
│   │   ├─ [6329] 0x3FA2bfd0…::fallback{value: 5e17}()
│   │   │   ├─ [1504] 0x41675C099F32341bf84BFc5382aF534df5C7461a::fallback{value: 5e17}() [delegatecall]
│   │   │   │   ├─ emit SafeReceived(…)
│   │   ├─ [2704] 0xE9bFA8e2…::fallback{value: 5e17}()
│   │   │   ├─ [55] 0xD54cb65224410F3Ff97a8E72f363f224419f4FB0::fallback{value: 5e17}() [delegatecall]
```

## Why 404 is not a vacuous answer

The clone's minimum sits close to the floor an *empty* delegate target would give (~350), which is
exactly the failure mode the plan warns about — so magnitude cannot settle it. It is small for a
different reason: **the audited `receive()` is an empty function body costing 55 gas**, and almost
all of the 404 is the cold `DELEGATECALL` around it. Four assertions establish the call is real:

1. `MULTISIG_IMPL.codehash` equals `0xca195fdf…f183` and `.code.length` equals 10,532.
2. The clone's 45 bytes are exactly `5f5f365f5f37365f73` ‖ `0xD54c…4FB0` ‖
   `5af43d5f5f3e6029573d5ffd5b3d5ff3` — one unconditional `DELEGATECALL`, no branch on calldata, so
   the ETH path reaches the address in the middle.
3. A gas-capped call through the clone returns the owner table `create` wrote:
   `[7523] 0xE9bFA8e2…::getOwners() → [7353] 0xD54cb652…::getOwners() [delegatecall]`.
4. With the implementation emptied, the same frames read `[0]` with no returndata and the push drops
   9,565 → 9,510. `test_vaultCloneDelegateCallIsReal` pins that pair.

The same risk on the other side is handled too: the burner really burns. Per-row 138,917 is **38,917
above `PUSH_GAS`**, not below it, and two throwaway controls (run, reverted, not committed) separate
the callee from the frame: a table of cheap-reverting rows costs 36,530 per row on an identical fixed
basis, and measured directly the burner's `CALL` costs 109,180 against the cheap revert's 9,287 — a
difference of 99,893, which is the 100,000 cap being consumed.

## Deviations from the plan

1. **The RPC the plan names cannot serve the block the plan pins.** A pinned `cast code` is an
   archive read, and `ethereum-rpc.publicnode.com` answers one more than a few hundred blocks back
   with `-32602 Archive requests require a personal token`. `tools/bytecode-fixtures.sh` therefore
   defaults to `https://eth.drpc.org`, says why in its header, and records the endpoint it used in
   `PROVENANCE.md`. Unpinned at the head, publicnode works; every byte count and codehash prefix in
   the plan's table reproduced exactly from drpc, and the Safe singleton's full codehash matches the
   value upstream pins.
2. **`PROVENANCE.md` records the block's own timestamp, not the date of the run** (`2026-10-27
   11:40:59Z`). The plan asks for "the date"; a wall-clock date would make the second pinned run
   differ from the first a day later, and the block's timestamp *is* when those bytes were observed
   on chain. Idempotence is proven rather than asserted: a second `BLOCK=26283809` run leaves `git
   status --porcelain` empty.
3. **`vm.cool` does not arrange the cold path step 2 asks for, and that was measured, not assumed.**
   Under forge `1.7.1-dev` only the most recent `vm.cool` survives: cooling all five path accounts in
   sequence leaves four of them warm (402 gas on a balance read) and only the last cold (2,902). The
   plan's five-address cool would have left the cold `DELEGATECALL` out of the very figure it exists
   to capture — measured that way, the clone's minimum came back as **0**. Replaced with
   `vm.snapshotState` before the first touch and `vm.revertToState` per probe, verified to carry the
   access list (14,347 three times across reverts, against 7,347 when the snapshot is taken warm).
   A separate finding in the same family: forge gives each test body a **fresh cold** access list
   (2,957 cold against 402 warm at entry), so the real-path test needs only one `vm.cool`, and one
   does hold.
4. **`vm.cool` restores a cold storage *slot* but not a cold *account*** — measured directly (+2,100
   on the slot, no change to the account's access cost). This is why `vm.etch`ing the burner rows
   warms them and `vm.cool` cannot undo it; `TableCapTest` gets its cold state from the fresh
   per-test access list instead.
5. **`vm.parseBytes(vm.readFile(…))` fails on the fixtures** — step 1's script writes a trailing
   newline, as a text file should. The tests use `vm.parseBytes(vm.trim(vm.readFile(…)))`.
6. **The multisig factory's `create` takes a `uint256` salt, not `bytes32`.** The interface in
   `PushGas.t.sol` is declared from the deployed selector rather than from the README's prose.
7. **`CAP` is a constant in `test/TableCap.t.sol`,** as step 3 says, and t02 moves it into
   `src/Distribution.sol` under D8.
8. The plan's step 1 says "The five" above a table of **four** fixtures, and its acceptance criteria
   say "all four". Four is what exists.

## The knee the plan predicted is a constant, not a bend

Step 3 says not to compute the cap from a formula because "the first row's `reserved` write is a
zero-to-nonzero SSTORE and later rows' are warm, so the curve has a knee". The first half is true —
`distribute`'s loop does `reserved[token] += share` on every escrowed row (`src/Distribution.sol:129`),
so the first such write pays the 20,000 of a fresh slot and the rest pay a warm update — but the
consequence is not a knee. That surcharge is paid **once at every n ≥ 1**, so it is a constant offset
that the fitted intercept absorbs, leaving the curve straight: measured first differences are
138,914–138,920 from n=1 upward, and the line through n=8 and n=64 predicts n=1 to +3 gas.

Two things follow for t02. The cap was still measured and asserted rather than computed, as the plan
required — `assertLt` at 107 rows and over at 108. And **the fitted 29,703 is not a pure fixed cost**:
it is `distribute`'s own overhead plus that first-row surcharge (~17,100 of it), so anyone reusing it
as "the fixed part" for a different row count is reusing a number that already contains one row's
worth of surcharge.

## Discoveries

1. `escrowed[token][account]` is a fresh slot per row (20,000 every row) while `reserved[token]` is
   one slot for all of them — which is what makes the per-row figure 138,917 rather than ~156,000, and
   what puts the knee in the intercept. Worth knowing before D8 picks a cap with margin.
2. **A note for `release`, not a change here** (step 3 says to record it): a row escrowed by a burner
   can never be released to that recipient — `release` re-pushes with the same `PUSH_GAS` and the
   burner consumes it again, so the escrow is permanent for a recipient that always burns. That is
   the design (the escrow is recoverable only if the recipient becomes payable), but it means
   `escrowed` can hold funds no call will ever move. M03's review may want it stated.
3. `.gas-snapshot`'s last line is unterminated, so a one-row addition shows as `7 insertions, 1
   deletion` with the old last row removed and re-added identically. No existing row changed value —
   all six new rows are additions, and the two suites are new contracts, so no selector dispatch
   moved.

## Open questions

None. The plan's two recorded choices (runtime bytecode with a codehash assertion; `CAP` in the test
until t02) stand as written.
