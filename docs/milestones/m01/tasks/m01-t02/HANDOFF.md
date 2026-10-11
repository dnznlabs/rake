# m01-t02 — handoff

PR: #11 · Branch: `m01/t02-factory-dev-chain` · 2026-10-11

`DistributionFactory` sits below `Distribution` in `src/Distribution.sol` exactly as the plan's step 1
fixes it — implementation deployed in the constructor with `new Distribution{salt: bytes32(0)}()`, the
PUSH0 init code verbatim from the reference factory, the sender-or-zero salt prefix, and an on-chain
`predict` — with the three properties the dapp has to know written into `create`'s natspec. `Distribution`
itself is byte-for-byte unchanged. `test/DistributionFactory.t.sol` adds the five tests of step 2, and
`test/Distribution.t.sol` is re-pointed at `factory.create` through its two helpers plus the two tests
that constructed their clone by hand; across the whole file exactly two assertion or cheatcode lines
moved, both inside those two tests. `scripts/forge/Deploy.s.sol` deploys the factory into `Counter`'s
slot, `Counter` and its suite are deleted, and the placeholder page reads `implementation()` off the
factory so `make deploy` still builds a bundle. The plan's three open questions all took their stated
defaults. Nothing deviated from the plan except two verification commands that do not work as written
on forge 1.7.1 — deviations 1 and 2 — neither of which changes what was built.

## Acceptance criteria

Every command ran from the worktree root through `devbox run --` on forge `1.7.1-dev` (the nixpkgs
build of 1.7.1), never the host's 1.8.1.

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — build warning-free, lint and fmt clean | pass | `devbox run -- forge build --force` → `Compiling 35 files with Solc 0.8.34` / `Solc 0.8.34 finished in 4.83s` / `Compiler run successful!`. On that log: `grep -c 'Compiler run successful!'` → `1` (so the compile really ran), `grep -cE 'Warning \('` → `0`, `grep -cE 'warning\['` → `0`. `devbox run -- forge lint` → no output, exit `0`. `devbox run -- forge fmt --check` → no output, exit `0`. |
| 2 — the 18 t01 names unchanged plus the five new ones, `0 failed` | pass | `devbox run -- forge test --list --match-contract Distribution` listed `DistributionTest` (18) and `DistributionFactoryTest` (5) → 23 names. Those 23, extracted from the forge output and sorted, `diff`ed against the 18 names the same command printed on `main` before any edit plus the five the plan names → `IDENTICAL`, 23 vs 23; `comm -12` against the t01 baseline → `18 of 18`, so no t01 name was renamed or dropped. `devbox run -- forge test` → `Suite result: ok. 5 passed; 0 failed`, `ok. 13 passed; 0 failed`, `ok. 18 passed; 0 failed`, and `Ran 3 test suites: 36 tests passed, 0 failed, 0 skipped (36 total tests)` — 36 rather than t01's 38 because `CounterTest`'s two went with `Counter`. |
| 3 — `snapshot()` ABI unmoved; the factory's ABI complete | pass | `forge inspect Distribution abi --json \| jq -c '.[]\|select(.name=="snapshot")\|.outputs'` → one tuple whose components are, in order, `owner address`, `delay uint32`, `nonce uint32`, `description string`, `table tuple[]` (`account address`, `bps uint96`, `name string`, `note string`), `pending tuple[]` (`hash bytes32`, `eta uint256`, `action bytes`) — the same struct t01's AC 5 recorded, with no `tip`, `url` or `about`. `src/Distribution.sol`'s diff against the base is `71 ++++` and zero deletions, so nothing in `Distribution` could have moved. The factory: `forge inspect DistributionFactory abi --json \| jq -r '.[]\|"\(.type) \(.name)"' \| sort` → `error DeploymentFailed`, `error SaltDoesNotStartWith`, `event Created`, `function create`, `function implementation`, `function predict` — all six. `create`'s canonical signature is proved by selector rather than by string: the ABI gives `create` selector `0xf0f469ff`, and `cast sig "create(address,uint32,string,(address,uint96,string,string)[],bytes32)"` → `0xf0f469ff`. Likewise `predict(bytes32)` → `0x0e787cce` and `implementation()` → `0x5c60da1b`, both matching. `DeploymentFailed()` → `0x30116425`, which is the constant the assembly reverts with. |
| 4 — the dev chain: `make addresses` lists the factory, not `Counter`; `implementation()` has code | pass | Step 5's script on a throwaway anvil at `:8599`: `make deploy` → `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.` three times (`Deploy.s.sol`, `DeployApp.s.sol`, `Chunks.s.sol`), with `== Logs == DistributionFactory 0x5FbDB2315678afecb367f032d93F642f64180aa3` / `implementation 0x8684eB16Dc607a8Dc3b4bade166A568A2EAd47c8`. `make addresses` → `App            0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` and `DistributionFactory 0x5FbDB2315678afecb367f032d93F642f64180aa3` — two lines, neither carrying a `(no code …)` note, and no `Counter` line. `cast call 0x5FbD… "implementation()(address)" --rpc-url http://127.0.0.1:8599` → `0x8684eB16Dc607a8Dc3b4bade166A568A2EAd47c8`, and `cast code` on that address is `16615` characters, i.e. about 8.3 kB of bytecode, not `0x`. The dapp build inside the same `make deploy` printed `dapp: raw 17354 bytes · gzip 6471 bytes · chain 31337 · dev overrides kept` and never `build: nothing to substitute`; the emitted bundle holds `factory: '0x5FbDB2315678afecb367f032d93F642f64180aa3'` and `grep -coE '__[A-Z][A-Z0-9_]*__' app/dist/index.html` → `0`. `make serve` was not run: there is no TTY in this session (`[ -t 0 ]` → false), which is the case the plan's bare-anvil script exists for. |
| 5 — `Counter` is gone from the tracked tree | pass | `git ls-files src/Counter.sol test/Counter.t.sol` → empty. `git grep -n Counter -- src test scripts app/src` → no output, exit `1`. The pattern is not vacuous: the same `git grep -c Counter main -- src test scripts app/src` on the base commit returns `app/src/index.html:2`, `scripts/forge/Deploy.s.sol:3`, `src/Counter.sol:1`, `test/Counter.t.sol:5`. |
| 6 — tree clean after build, test and the chain run | pass | `git status --porcelain` → empty, run after `forge build --force`, `forge test` and the step 5 script. `broadcast/`, `cache/`, `out/` and `app/dist/` are all gitignored, so the deploy left nothing behind. |
| 7 — only the planned files touched | pass | `git diff --name-status 8cb5dc4` → `M app/src/index.html`, `M scripts/forge/Deploy.s.sol`, `D src/Counter.sol`, `M src/Distribution.sol`, `D test/Counter.t.sol`, `M test/Distribution.t.sol`, `A test/DistributionFactory.t.sol` — the seven files step 6 names, plus this handoff. `--stat`: `278 insertions, 100 deletions`. Nothing in `App.sol`, `App.t.sol`, `Makefile`, `mk/`, `procs/`, `.github/`, `foundry.toml`, `README.md`, `AGENTS.md`, or under `app/` beyond the one page. |

The re-point's other trap, separately: `git diff -U0 -- test/Distribution.t.sol | grep -E '^[-+].*(assert|vm\.)'` prints exactly two lines across the whole file — `+ assertEq(created, address(d), …)` in `test_reentrantRecipientIsEscrowed` and `+ vm.prank(address(factory));` in `test_initOnlyFactoryAndOnce`. The hunk list is the imports, the contract's doc comment, two new fields, `setUp`, those two tests and the two helpers; no assertion in the remaining sixteen tests moved.

## Deviations from the plan

1. **Step 1's and AC 3's `grep -oE '"name":"(create|predict|…)"'` finds nothing on this toolchain, so the
   ABI was read with `jq` instead.** `forge inspect … abi --json` on forge 1.7.1 pretty-prints, so the
   bytes are `"name": "create"` with a space and the plan's pattern cannot match. Run as written it
   returns empty and would read as a missing surface. Replaced with
   `jq -r '.[]|"\(.type) \(.name)"' | sort`, and `create`'s full signature checked by selector against
   `cast sig` rather than by substring, which is stronger than the plan asked for. Nothing about the
   contract changed.
2. **AC 7 was run against the merge base `8cb5dc4`, not the local `main` ref.** `main` in this clone is
   15 commits behind `origin/main` (it points at `a5e7cd0`), so `git diff --stat main` drags in all of
   t01. `origin/main` has also moved past the branch point — it now carries m01-t03's plan — so that is
   not the base either. `git merge-base HEAD origin/main` → `8cb5dc4`, the commit the branch is off and
   what the plan means by `main`. The branch was deliberately left un-rebased; GitHub computes the PR
   diff from the same merge base.
3. **Step 3 and step 4 are one commit, not two.** They are mutually dependent: deleting `Counter`
   without the page breaks `app/build.mjs` on `__COUNTER__`, and pointing the page at
   `__DISTRIBUTIONFACTORY__` before the deploy script creates one breaks it the same way. Splitting
   them would have put a commit that cannot `make deploy` on the branch.

Everything else is as planned. `Distribution` was not renamed or touched; the factory's surface,
`create`'s body, `predict`'s formula, the five new tests and the four re-pointed call sites are the
plan's.

## Decisions

- **Open question 1 — where `msg.value` on `create` goes: the default.** Through CREATE2's value
  (`create2(callvalue(), …)`), verbatim from the reference, so a deposit lands in the clone with no
  `Received` log. `test_createForwardsValue` pins both halves: the clone's balance is 1 ether, and the
  one recorded log is `Created` from the factory.
- **Open question 2 — open salts: the default.** Allowed. `create` rejects only a prefix that is
  neither zero nor `msg.sender`. `test_saltFrontRunningRejected` asserts an open salt succeeds for a
  caller who does not own it, so refusing them later is the one comparison the plan says it is — plus
  that one assertion, which would have to invert.
- **Open question 3 — `Created` fields: the default.** `Created(address indexed distribution, address
  indexed owner)`. The salt is not indexed; it is in the calldata.
- `predict` hashes the init code in assembly (the same four `mstore`s as `create`, keccak'd over
  `0x0e..0x44`) and then builds the CREATE2 address in Solidity with
  `keccak256(abi.encodePacked(hex"ff", address(this), salt, initCodeHash))`. One assembly block, not
  two: the plan fixes only `create`'s body as verbatim, and the address derivation is clearer as
  Solidity than as a second memory-clobbering block.
- The salt prefix is compared once into a local (`uint256 prefix = uint256(salt) >> 96`) rather than
  shifted twice, and the revert is a Solidity `revert SaltDoesNotStartWith()` rather than the
  reference's `require(…, Error())`. Same selector, `0x0c4549ef`, as solady's `checkStartsWith`.
- `DistributionTest._salt()` returns `bytes32(uint256(++salts))` from a `uint96` counter, so every
  clone in the suite gets a fresh open salt. It is called before `vm.expectRevert` in
  `_expectBadInit`, so the counter survives the reverted `create` and the next case cannot collide.
- `test_create2AddressStableAcrossChains` captures the first chain's factory address, implementation
  and clone into locals before `revertToState`, and compares those to the second chain's. Reading
  `mainnet.implementation()` after the revert would have been a comparison of one address with itself,
  since the re-deployed factory lands at the same place.

## Discoveries

- **A CREATE2 collision really does cost the whole limit.** `test_saltFrontRunningRejected` reports
  `gas: 1040508234`, which is the plan's `1,038,008,638` to within the surrounding calls — worth the
  line the plan wants in M03's `SECURITY.md`, and the reason M02 must `eth_getCode` `predict(salt)`
  before sending.
- **`vm.revertToState` reverts state, not the calling frame's memory**, which is what makes the
  two-chain test possible at all: values captured before the revert survive it while every account
  goes back. Not documented in the cheatcode's natspec.
- **solady's `predictDeterministicAddress_PUSH0` returns an address with dirty upper 96 bits** (its own
  natspec says so), and `assertEq` against it passes anyway under this project's `via_ir = true`, which
  cleans on use. A legacy-pipeline project comparing it the same way could see a false mismatch.
- **`forge script` prints `Warning: Detected artifacts built from source files that no longer exist`**
  naming `src/Counter.sol` and `test/Counter.t.sol` while `out/` still holds their artifacts. It is
  `Warning:`, not `Warning (`, so neither the plan's greps nor CI's two assertions can see it, and it
  disappears after one `forge build --force`. CI checks out fresh, so it will never appear there.
- **The page now carries dead code**: `send`, `waitReceipt`, `sleep`, `POLL_MS` and `POLL_ERR` lost
  their only caller when `increment()` went, and `.actions`, `.btn` and `.status` are no longer used
  by it. Left in place because step 4 scopes the edit to "the least amount that keeps the stack
  proving itself" and M02's create flow needs all of them. The shipped bundle is 16,906 bytes raw /
  6,273 gzipped.
- `forge inspect DistributionFactory abi` (the table form, no `--json`) prints `create`'s struct
  argument as `Distribution.Beneficiary[]` and the `--json` form as `tuple[]` with `components`;
  neither prints the plan's `(address,uint96,string,string)[]` spelling. The selector is the only form
  that is both canonical and checkable, which is what AC 3 above uses.
- Nothing outside the task's scope needed attention. `App.sol`, `App.t.sol` and the `Chunks`/`DeployApp`
  scripts are untouched and all still pass and deploy.

## Open questions

None that need a human. The three the plan carried are closed by their defaults above, and each is
still cheap to reverse before M02's create flow is written — open salts especially, which the plan
flags as needing a ruling before that point rather than before this merge.
