# m01-t01 — Toolchain and the primitive

Milestone: [M01](../../MILESTONE.md) · Phase: 1 — Toolchain and the primitive

`foundry.toml` pins solc 0.8.34 and the build is warning-free; `src/Distribution.sol` holds the
primitive — sink, split, escrow, one timelock — with the seven definition-of-done tests that need no
factory, instantiated in tests through a Solady PUSH0 clone so t02 can add the factory without the
core moving. Nothing in this task deploys, and nothing touches `App.sol`, `app/` or `Counter.sol`.

Every command and version below was run on this machine on 2026-10-11 against `main` at `948e776`,
through `devbox run --` (forge `1.7.1-dev`, which is the nixpkgs build of the 1.7.1 release). Where a
step rests on a fact that can go stale, the evidence is named inline; re-run it rather than quote it.

> **Corrected 2026-10-11, after PR #6 was built against the version below.** Two names this plan fixed
> could not exist: `apply` is a Solidity reserved keyword (solc 0.8.34: `Expected identifier but got
> reserved keyword 'apply'`, reproduced by both the engineer and the architect), and forge 1.7.1 treats
> any function whose name begins with `table` as a table test, so a public `table()` getter turned
> `src/Distribution.sol` itself into a failing suite. The engineer shipped `applyQueued` and
> `beneficiaries()`, declared in `HANDOFF.md`; the architect's review recommended keeping both, and
> Denizen merged PR #6 with them on 2026-10-11 — that merge is the ruling, recorded as `ROADMAP.md`
> decision 9, and this text now says what was built. Also corrected: the lint check in step 4 now
> allows the one scoped `block-timestamp` disable a timelock needs, and the `onlySelf` row no longer
> claims those four functions are all a queued action can reach. Lesson for the next plan: compile a
> stub of any surface a plan fixes before fixing it.

## Plan

### Step 1 — solc 0.8.34, warning-free

In `foundry.toml`, replace `solc = "0.8.26"` with:

```toml
solc = "0.8.34"
ignored_warnings_from = ["lib"]
```

Leave `optimizer_runs`, `via_ir` and `evm_version = "cancun"` as they are; transient storage needs
Cancun and all four M05 chains have it.

Why 0.8.34 and why the second line, measured here with forge 1.7.1 (`forge build --force --use <v>`
on `main`, each version fetched by forge into `~/.local/share/svm/<v>/` on first use — network on
first build, about two seconds each):

| solc | result |
|:--|:--|
| 0.8.28, 0.8.30 | `Compiler run successful!` |
| 0.8.32, 0.8.33, 0.8.34, 0.8.37 | `Compiler run successful with warnings:` — `Warning (8429): Virtual modifiers are deprecated and scheduled for removal.` at `lib/solady/src/auth/Ownable.sol:274` |
| 0.8.34 with `ignored_warnings_from = ["lib"]` | `Compiler run successful!` |

The warning is solady's, not ours, and a submodule bump cannot clear it: solady `main` fetched the
same day still has `modifier onlyOwner() virtual` at line 274 and its `package.json` is still 0.1.26,
the tag `lib/solady` is pinned to. Only `App.sol` imports solady; the core file imports nothing
(overview goal 5), so the silenced path never covers it.

Alternatives rejected: **0.8.30**, the last version that builds warning-free unaided, only defers the
same warning to the next bump, and the overview's definition of done names 0.8.34, which is also what
`src-company/multisig` — the reference implementation — compiles under (`pragma solidity ^0.8.34`).
**0.8.37**, the latest release, builds here too but nothing in this task needs it, and a compiler
bump after M03's review is a re-review; one before it is free, so stay on the version the documents
name. `ignored_error_codes = [8429]` would silence the code everywhere, including a future `virtual`
modifier of our own; scoping by path does not.

`transient` under this toolchain is verified: a scratch contract declaring `bool transient locked`
and using it in a modifier compiled under `--use 0.8.34` with `via_ir = true` and
`evm_version = "cancun"` — `Compiler run successful!`. Existing files keep `pragma solidity ^0.8.26;`;
0.8.34 satisfies it.

**Check.**

```bash
devbox run -- forge build --force 2>&1 | tee /tmp/build.log | grep -E 'Solc 0.8.34|Compiler run successful!$'
! grep -E 'Warning \(|warning\[' /tmp/build.log
```

Both lines print; the second prints nothing and exits 0.

### Step 2 — CI catches compiler warnings

`.github/workflows/ci.yml` line 42 asserts `! grep -q 'warning\[' "$BUILD_LOG"`. That is the
`forge lint` format; solc's is `Warning (8429):`, and `echo 'Warning (8429): x' | grep -q 'warning\['`
does not match — measured. So CI on `main` today would pass the build that step 1's table shows as
warning-laden. Add, after line 42:

```yaml
          ! grep -q 'Warning (' "$BUILD_LOG"
```

Nothing else in the workflow changes. The `cache solc` step keys on `hashFiles('foundry.toml')`, so
the bump invalidates the cache by itself.

**Check.** The two greps from step 1 are the same two CI runs; both pass on the local log.

### Step 3 — track `foundry.lock`

`forge build` on a clone whose submodules were not yet initialised prints
`Updating dependencies in …/lib` and writes `foundry.lock` at the repo root:

```json
{
  "lib/forge-std": { "rev": "bf647bd6046f2f7da30d0c2bf435e5c76a780c1b" },
  "lib/solady":    { "rev": "acd959aa4bd04720d640bf4e6a5c71037510cc4b" }
}
```

Those are the revs `git submodule status` reports (tags `v1.16.2` and `v0.1.26`). The file is not
gitignored and not tracked, so it sits as `?? foundry.lock` and CI's "working tree clean" step would
fail on such a checkout; CI passes only because `actions/checkout` initialises the submodules first.
Commit the file as forge writes it. Rejected: gitignoring it — forge treats it as the dependency
pin, and `state-collection` tracks its own.

**Check.** `git ls-files foundry.lock` prints the path; `git status --porcelain` is empty after
`devbox run -- forge build --force`.

### Step 4 — `src/Distribution.sol`

One file, `pragma solidity ^0.8.28;` (the floor `transient` needs — the pin, not the pragma, chooses
the compiler), no imports, one contract `Distribution` for now; t02 adds `DistributionFactory` below
it in the same file. The surface below is the contract M02 is built against, so it is the plan, not a
suggestion; what is left to you is the body of each function.

**Storage.** `address owner`, `uint32 delay`, `uint32 nonce`, `string description`,
`Beneficiary[] _table`, `Pending[] _pending` with `mapping(bytes32 => uint256) _pendingIndex` (1-based,
0 means absent), `mapping(bytes32 => uint256) queued` (hash → eta), `mapping(address => uint256)
reserved` (token → escrowed total), `mapping(address => mapping(address => uint256)) escrowed`
(token → account → amount), `bool transient locked`. Two immutables set in the constructor:
`address immutable factory = msg.sender` and `address immutable self = address(this)` — both live in
the implementation's bytecode, so every clone reads the factory that deployed the implementation and
the implementation's own address. `uint256 constant PUSH_GAS = 100_000;` with a comment that it is the
overview's draft and that M03 measures it.

**Types, verbatim from the prototype's docs page and the design handoff:**

```solidity
struct Beneficiary { address account; uint96 bps; string name; string note; }
struct Pending     { bytes32 hash; uint256 eta; bytes action; }
struct Snapshot {
    address owner; uint32 delay; uint32 nonce; string description;
    Beneficiary[] table; Pending[] pending;
}
```

**Events** `Received(address indexed from, uint256 amount)`, `Distributed(address indexed token,
uint256 amount)`, `Escrowed(address indexed token, address indexed account, uint256 amount)`,
`Released(address indexed token, address indexed account, uint256 amount)`, `Queued(bytes32 indexed
hash, uint32 nonce, uint256 eta, bytes action)`, `Applied(bytes32 indexed hash)`, `Cancelled(bytes32
indexed hash)`. **Errors** `NotOwner()`, `BadTable()`, `NotReady(uint256 eta)`, `NothingToDo()`,
`Locked()`, `Unauthorized()`. The names are the ones the prototype's docs page lists; M02 decodes
them, so do not rename.

**Functions and their rules:**

| Function | Who | Rule |
|:--|:--|:--|
| `init(address owner_, uint32 delay_, string calldata description_, Beneficiary[] calldata table_)` | `factory` only, once | `Unauthorized` unless `msg.sender == factory` and `_table.length == 0`; table validated as below. Payable, like the reference. |
| `receive()` | anyone | `if (address(this) == self) revert Unauthorized();` then `emit Received`. No other work: it must run under a 2,300-gas `transfer` stipend. The `self` compare is how "no `receive()` on the implementation" is met when clones share the implementation's code — the implementation rejects ETH, a clone accepts it, and the check costs no storage read. |
| `distribute(address token)` | anyone, `nonReentrant` | `token == address(0)` is ETH. `amount = balance − reserved[token]`; `NothingToDo` if zero. For each row in table order: `share = bps * amount / 10_000`, except the last row, which takes `amount − paid`. Push each; a failed push adds `share` to `escrowed[token][account]` and `reserved[token]`, emits `Escrowed`, and the loop continues. Emit `Distributed(token, amount)`. |
| `release(address token, address account)` | anyone, `nonReentrant` | `amount = escrowed[token][account]`; `NothingToDo` if zero. Zero it, subtract from `reserved`, push with the same cap; if the push fails, revert (state unwinds, the escrow stands). Emit `Released`. |
| `propose(bytes calldata action) returns (bytes32 hash)` | owner | `NotOwner` otherwise. `n = ++nonce`; `hash = keccak256(abi.encode(action, n))`. If `delay == 0`: self-call `action` inline, bubble its revert, emit `Queued(hash, n, block.timestamp, action)` then `Applied(hash)`. Else `eta = block.timestamp + delay`, `queued[hash] = eta`, append `Pending(hash, eta, action)`, emit `Queued`. |
| `applyQueued(bytes calldata action, uint32 nonce_)` | anyone | Recompute `hash`; `eta = queued[hash]`; `NotReady(eta)` if `eta == 0` or `block.timestamp < eta`. Delete `queued[hash]`, remove the `Pending` (swap-and-pop through `_pendingIndex`), self-call `action`, bubble its revert — so a failing action leaves the hash queued, the atomic-retry behaviour the overview § 8 says we inherit. Emit `Applied`. |
| `cancel(bytes32 hash)` | owner, immediate | `NothingToDo` if not queued. Delete and remove as above; emit `Cancelled`. |
| `setBeneficiaries(Beneficiary[] calldata)`, `setDescription(string calldata)`, `setDelay(uint32)`, `transferOwnership(address)` | `onlySelf` | `Unauthorized` unless `msg.sender == address(this)`. These are the only four `onlySelf` functions. The self-call in `applyQueued` can reach any external function, so what keeps anything else out of reach is each function's own guard — `init` requires `factory`, `propose` and `cancel` require `owner`, and the contract is neither. `transferOwnership(address(0))` is renounce: no one can `propose` or `cancel` again, and the table is frozen. |
| `snapshot() returns (Snapshot memory)` | view | Owner, delay, nonce, description, the table, and every pending action in array order. |
| `owner()`, `delay()`, `nonce()`, `description()`, `queued(bytes32)`, `reserved(address)`, `escrowed(address,address)`, `beneficiaries() returns (Beneficiary[] memory)`, `pendingCount()` | view | Public getters; `snapshot()` is the one M02 reads. |

**Table validation**, in `init` and `setBeneficiaries`, all `BadTable`: empty table; any `bps == 0`;
`account` not strictly greater than the previous row's (so the first row must be above `address(0)`
and duplicates are impossible, the reference's signer-loop trick); `sum(bps) != 10_000`. The table is
stored in the order given, which is ascending by address, so "last takes the remainder" means the
highest address. No cap on length beyond what `uint16` can index (overview § 6 leaves this open; see
Open questions).

**Pushing.** ETH: `to.call{value: share, gas: PUSH_GAS}("")`. ERC-20: `token.call(abi.encodeWithSelector(0xa9059cbb, to, share))` succeeded, and the return data is either empty (mainnet
USDT) or decodes to `true`; no gas cap, the overview's "bounded by the token". Read the balance with
a `staticcall` to `balanceOf(address)` and let a token with no code fail there.

**Reentrancy.** A `nonReentrant` modifier on `distribute` and `release` over the transient `locked`,
reverting `Locked`. An ETH push into a recipient that calls back into `distribute` fails on `Locked`,
which the push loop sees as a failed push and escrows — the test below pins that.

Any address — `_table`, `_pending`, mappings — may be named differently in the body; the external
surface, the struct layouts, the error and event names, and the rules in the table may not.

**Check.** `devbox run -- forge build --force` as in step 1, and `devbox run -- forge lint` prints no
finding for the new file. The one exception is `block-timestamp` on the timelock's `block.timestamp < eta`,
which `forge build` also prints inline: silence that single line with
`// forge-lint: disable-next-line(block-timestamp)` and a comment, not with `exclude_lints` in `foundry.toml`. Both run before the tests exist; a surface that does not compile is the
first thing to find.

### Step 5 — `test/Distribution.t.sol`

Tests deploy the implementation and clone it, because `receive()` rejects ETH on the implementation
and `init` must be called by the implementation's deployer:

```solidity
import {LibClone} from "solady/utils/LibClone.sol";   // lib/solady/src/utils/LibClone.sol:269, clone_PUSH0
Distribution impl = new Distribution();                // factory = address(this)
Distribution d = Distribution(payable(LibClone.clone_PUSH0(address(impl))));
d.init(owner, delay, "desc", table);
```

`clone_PUSH0` exists at the pinned tag (verified by grep). t02 replaces this harness with
`factory.create(...)`; write the setup once in a helper so that swap is one edit. Arrange-Act-Assert
in every test. The seven definition-of-done tests, named exactly as [M01 criterion 2](../../MILESTONE.md#acceptance-criteria)
lists them:

| Test | Arrange / act | Assert |
|:--|:--|:--|
| `test_rounding_3333_3333_3334` | three rows 3,333 / 3,333 / 3,334 bps in ascending address order; send 10,000 wei, `distribute(address(0))`; then 10,001 wei and again | first split 3,333 / 3,333 / 3,334; second 3,333 / 3,333 / 3,335 — the highest address takes the remainder, contract balance 0 after each |
| `test_escrowRevertingEthRecipientOthersPaid` | one beneficiary is a contract whose `receive` reverts; send ETH, distribute | the other rows are paid their share; `escrowed(0, bad)` and `reserved(0)` both equal the bad share; `Escrowed` emitted; contract balance equals the escrow |
| `test_distributeReleaseDistributeKeepsReserved` | as above, then send more ETH and distribute again; then make the bad recipient accept and `release(0, bad)`; then distribute a third time | the second split divides only `balance − reserved`; after release `escrowed` and `reserved` are 0 and the recipient holds its share; the third split divides the whole balance; `Released` emitted |
| `test_cancelThenApplyReverts` | `propose(setDescription)` with a 7-day delay; `cancel(hash)`; `vm.warp` past eta; `applyQueued(action, nonce)` | `vm.expectRevert(abi.encodeWithSelector(NotReady.selector, 0))`; `snapshot().pending` is empty; `description` unchanged |
| `test_setDelayZeroDoesNotShortcutQueued` | delay 7 days; propose A = `setBeneficiaries(newTable)`; propose B = `setDelay(0)` | B is queued with its own eta, not applied inline; A's eta is unchanged; before 7 days both `applyQueued` calls revert `NotReady`; after 7 days both succeed; `delay()` is 0 only after B applies |
| `test_usdtStyleNoReturnToken` | a mock ERC-20 whose `transfer` returns no data; a second mock whose `transfer` returns `false`; distribute each | the no-return token pays every row; the false-returning token escrows every row and `reserved[token]` equals the contract's balance of it |
| `test_reentrantRecipientIsEscrowed` | a beneficiary contract whose `receive` calls `distribute(address(0))`, and a variant that calls `release(0, self)` | both pushes fail, both are escrowed, the other rows are paid, and the contract's balance equals `reserved(0)` |

And these, which the surface above is not safe without:

- `test_receiveUnderStipend` — `payable(address(d)).transfer(1 ether)` from a plain account succeeds
  and `Received` is emitted. This is the check on the 2,300-gas claim.
- `test_implementationRejectsEth` — `payable(address(impl)).call{value: 1}("")` fails; the same to the
  clone succeeds.
- `test_initOnlyFactoryAndOnce` — `init` from a stranger reverts `Unauthorized`; a second `init` from
  the deployer reverts `Unauthorized`.
- `test_tableValidation` — empty, zero-bps, unsorted, duplicate, and sum-9,999 tables each revert
  `BadTable`, through `init` and through an applied `setBeneficiaries` with `delay == 0`.
- `test_settersOnlySelf` — each of the four setters called directly, by the owner, reverts
  `Unauthorized`.
- `test_delayZeroAppliesInline` — with `delay == 0`, `propose` changes state in the same call,
  `snapshot().pending` stays empty, `Queued` then `Applied` are emitted.
- `test_pendingIterable` — three proposals; cancel the second; `snapshot().pending` holds the first
  and third with their hashes, etas and action bytes, in that order.
- `test_applyFailureKeepsQueued` — propose an action whose self-call reverts (a `setBeneficiaries`
  with a bad table); after eta, `applyQueued` reverts and `queued(hash)` is still the eta.
- `test_renounceFreezes` — apply `transferOwnership(address(0))`; the former owner's `propose` and
  `cancel` revert `NotOwner`; `distribute` still works.
- `test_nftTransferReverts` — an ERC-721 mock's `safeTransferFrom` to the clone reverts (no receiver
  shim, overview § 5).
- `test_nonOwnerCannotProposeOrCancel` — `NotOwner` on both.

Mocks live in the test file or under `test/mocks/`; nothing under `src/` but the one file.

**Check.**

```bash
devbox run -- forge test --list --match-contract Distribution   # the names above, all present
devbox run -- forge test                                        # every suite: 0 failed
devbox run -- forge fmt --check                                 # exit 0
```

### Step 6 — the tree

`git status --porcelain` empty after step 5's commands. `App.sol`, `App.t.sol`, `Counter.sol`,
`Counter.t.sol`, everything under `app/` and `scripts/forge/` unchanged — `git diff --stat main` names
`foundry.toml`, `foundry.lock`, `.github/workflows/ci.yml`, `src/Distribution.sol`,
`test/Distribution.t.sol` and any `test/mocks/`, nothing else.

## Acceptance criteria

M01 criteria 1 and 7, and the t01 rows of criterion 2, in the order to run them:

- `grep '^solc' foundry.toml` prints `solc = "0.8.34"`; `devbox run -- forge build --force` prints
  `Compiler run successful!` and no `Warning (` or `warning[` line.
- `.github/workflows/ci.yml` fails a build log containing `Warning (` — the grep is present and the
  CI run on the PR is green.
- `git ls-files foundry.lock` prints the path, and `git status --porcelain` is empty after
  `forge build --force` and `forge test`.
- `devbox run -- forge test --list --match-contract Distribution` lists the seven criterion-2 tests
  and the eleven others above by name; `devbox run -- forge test` reports `0 failed`.
- `devbox run -- forge inspect Distribution abi --json | jq '.[]|select(.name=="snapshot")|.outputs'`
  shows the six fields and two nested tuples of M01 criterion 3, in that order.
- `devbox run -- forge lint` and `devbox run -- forge fmt --check` print no finding.
- `git diff --stat main` touches only the files step 6 names.

## Out of scope

The factory, `create`, the CREATE2 tests and the salt rule (t02). `scripts/forge/Deploy.s.sol`,
removing `Counter.sol`, `make serve` (t02). `.gas-snapshot` and the CI snapshot check (t03). Measuring
`PUSH_GAS` (M03 — leave the draft and its comment). Any edit to `App.sol`, `app/`, `README.md`,
`AGENTS.md`. ERC-1363. Bumping `pragma` lines in existing files. Upgrading devbox or foundry — foundry
1.8.x is upstream but nixpkgs tops out at 1.7.1, and that is an escalation, not a workaround.

## Open questions

Each with the default you take if no answer arrives before it matters.

1. **Contract name.** Closed 2026-10-11: `Distribution` in `src/Distribution.sol`, the default, now
   `ROADMAP.md` ruling 3. Nothing to decide in `HANDOFF.md`.
2. **`Received` in `receive()`.** Default: emit it. If `test_receiveUnderStipend` fails with the event
   in place, drop the event, keep the test, and say so in `HANDOFF.md` — the stipend is the contract,
   the event is a convenience for M02's activity list, which can also read `Distributed`.
3. **A cap on table length.** Overview § 6 asks whether `_set` should enforce one below `uint16`.
   Default: no cap; a few hundred rows is the practical ceiling by gas and M02 can say so.
4. **`propose` validating the action's selector.** Default: no — a wrong action fails at `applyQueued` and
   stays queued, which is visible, and a selector whitelist is surface before the audit.
5. **`release` when the retry fails.** Default: revert, leaving the escrow intact. Rejected:
   re-escrowing silently, which succeeds while nothing moved.

## Context

- Spec: `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 (decided design), § 6 (open questions), § 8
  (lessons from the reference's `SECURITY.md`), § 10 (definition of done).
- Rulings: [`docs/ROADMAP.md`](../../../../ROADMAP.md) § Decisions, 1–8. Rulings 1 and 2 are why
  the struct has no `tip`, `url` or `about`; 5 is why `init` is factory-only and nothing is
  upgradeable; 7 is why there is one `owner`.
- The struct and the error and event names: `docs/brainstorming/design/rake-dapp.html` lines
  526–528; the UI ↔ contract vocabulary: `docs/brainstorming/design/HANDOFF.md` § Vocabulary map.
- Reference implementation for the timelock and `onlySelf` shape:
  [`src-company/multisig` `src/Multisig.sol` at `62eb905`](https://github.com/src-company/multisig/blob/62eb905/src/Multisig.sol)
  — `queued[hash] = eta` at lines 165–167, `executeQueued` at 187–198, `onlySelf` at 32–35. The
  overview cites a `dnznlabs/multisig` clone; that repository answers 404 to this account, and
  `src-company/multisig` is the maintained origin the overview § 8 names.
- Solady clone helper used by the tests only: `lib/solady/src/utils/LibClone.sol:269`.
