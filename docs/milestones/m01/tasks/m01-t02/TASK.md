# m01-t02 — Factory and the dev chain

Milestone: [M01](../../MILESTONE.md) · Phase: 2 — Factory and the dev chain

`DistributionFactory` sits below `Distribution` in `src/Distribution.sol`: the implementation deployed in
its constructor, PUSH0 clones through CREATE2 under a sender-bound salt, and a `predict` the dapp's
create flow can call. The two definition-of-done tests that need a factory pass, the t01 suite is
re-pointed at `create` as t01 planned, `scripts/forge/Deploy.s.sol` deploys the factory, `Counter` is
gone, and `make serve` brings up a chain where `make addresses` lists `DistributionFactory`. M01
criteria 3 and 6.

Every command and version below was run on this machine on 2026-10-11 against `main` at `0548391`
(t01 merged), through `devbox run --` (forge `1.7.1-dev`, the nixpkgs build of 1.7.1). A stub of the
factory surface in step 1 and the first three tests in step 2 were compiled and run under that
toolchain before this plan was written — build warning-free, `forge lint` and `forge fmt --check`
clean, 3 passed — so the surface is known to exist. The stub is not in the repo; write your own.

**Setup.** Branch `m01/t02-factory-dev-chain` off `main`. After any fresh clone run
`devbox run -- bash ../shared/scripts/init.sh` and verify `ls .git/hooks | grep -v sample` prints
`pre-commit` and `post-commit`. `rake` carries a `.planning/` directory that `make init` creates;
`roles/README.md` would read that as a GSD project, and it is not one — nothing in this loop is written
there.

## Plan

### Step 1 — `DistributionFactory`

Below `Distribution` in the same file, same pragma, no imports. This is the surface M02's create flow
is built against, so it is the plan; the body of `create` is lifted from the reference and is given.

```solidity
contract DistributionFactory {
    event Created(address indexed distribution, address indexed owner);

    error DeploymentFailed();
    error SaltDoesNotStartWith();

    /// @dev Deployed by the factory, so `Distribution.factory` is this contract on every clone.
    address public immutable implementation = address(new Distribution{salt: bytes32(0)}());

    function create(
        address owner_,
        uint32 delay_,
        string calldata description_,
        Distribution.Beneficiary[] calldata table_,
        bytes32 salt
    ) external payable returns (address distribution);

    function predict(bytes32 salt) external view returns (address);
}
```

**Rules.**

- No constructor body, no `receive`, no `fallback`: stray ETH to the factory reverts (overview § 5,
  § 8 "singleton-funds trap"). The implementation already rejects ETH through `self` (t01).
- `create`: the top 20 bytes of `salt` (`uint256(salt) >> 96`) must be zero or `uint160(msg.sender)`,
  else `SaltDoesNotStartWith`. Then CREATE2 with the PUSH0 clone init code, verbatim from the reference
  factory ([`src-company/multisig` `Multisig.sol` at `62eb905`](https://github.com/src-company/multisig/blob/62eb905/src/Multisig.sol)
  lines 273–299) and identical to solady's `LibClone.initCode_PUSH0` (`lib/solady/src/utils/LibClone.sol:379`):

  ```solidity
  assembly ("memory-safe") {
      mstore(0x24, 0x5af43d5f5f3e6029573d5ffd5b3d5ff3)
      mstore(0x14, impl)
      mstore(0x00, 0x602d5f8160095f39f35f5f365f5f37365f73)
      distribution := create2(callvalue(), 0x0e, 0x36, salt)
      if iszero(distribution) {
          mstore(0x00, 0x30116425) // DeploymentFailed()
          revert(0x1c, 0x04)
      }
      mstore(0x24, 0)
  }
  ```

  Then `Distribution(payable(distribution)).init(owner_, delay_, description_, table_)` — a bad table
  reverts `BadTable` out of `create` — and `emit Created(distribution, owner_)`. `msg.value` rides the
  CREATE2 as in the reference, so it lands without a `Received` log (open question 1).
- `predict(salt)` = `keccak256(0xff ‖ address(this) ‖ salt ‖ keccak256(initCode))`, the same bytes as
  above hashed over `0x0e..0x44`. It does not check the salt prefix: the dapp predicts before it knows
  who will send.

**Three properties the body has and the dapp must know, so write them in the natspec:**

1. **The address depends on the factory and the salt only.** Not on the table, owner or delay. So an
   *open* salt (zero prefix) is first-come: whoever sends first fixes the table at that address. That
   is the reference's behaviour and the overview's "pre-funded address" workflow wants it, but M02's
   create flow defaults to a sender-bound salt and labels an open one as claimable by anyone.
2. **A second `create` with a used salt burns the whole gas limit before `DeploymentFailed`.** A
   CREATE2 collision consumes every unit forwarded to it; the spike's revert case measured
   `1,038,008,638` gas, i.e. all of forge's default limit. M02 reads `predict(salt)` with
   `eth_getCode` before sending and refuses a non-empty answer; a wallet shows the same salt as a
   failed transaction at full cost. Worth a line in M03's `SECURITY.md`.
3. **Same-address-everywhere is the factory's address, not this task's.** `new DistributionFactory()` in
   `Deploy.s.sol` is nonce-addressed and lands wherever the deployer's nonce says. The byte-identical
   deploy through a deterministic deployer is the one-way door `ROADMAP.md` § Order gives to M03 and
   M05; do not add a deployer here.

Why `bytes32 salt` and not the reference's `uint256`: M02 builds a salt as 20 bytes of sender followed
by 12 bytes of its own, and `bytes32` is the type for that; it is also what `LibClone`'s predictor
takes, which step 2 uses as the independent check. Why an on-chain `predict`: the design handoff's
create step 2 shows the address before the transaction (`design/HANDOFF.md` § Demo → real wiring),
and one `eth_call` is cheaper to keep correct than a second copy of the init-code hash in JavaScript
that has to match the bytecode forever. Rejected: a `createWithCalls` like the reference — nothing
needs post-init calls and it is surface before the audit; indexing the salt in `Created` — it is in the
calldata.

**Check.**

```bash
devbox run -- forge build --force 2>&1 | tee /tmp/build.log | grep -E 'Compiler run successful!$'
! grep -E 'Warning \(|warning\[' /tmp/build.log
devbox run -- forge inspect DistributionFactory abi --json | grep -oE '"name":"(create|predict|implementation|Created|DeploymentFailed|SaltDoesNotStartWith)"' | sort -u
devbox run -- forge lint
```

Six names; lint prints nothing for the new contract. `forge lint` is run through 1.7.1, never the
host's 1.8.1, which lints differently (t01 handoff).

### Step 2 — tests

**New file `test/DistributionFactory.t.sol`**, contract `DistributionFactoryTest`. `--match-contract
Distribution` matches it too, which is what criterion 2's command relies on. Deploy the factory
deterministically from the test contract — `new DistributionFactory{salt: keccak256("rake.test")}()`
— so its address is the same in both halves of the first test. The cheatcodes exist at the pinned
forge-std (`lib/forge-std/src/Vm.sol`): `chainId` line 2106, `snapshotState` 2346, `revertToState` 2285.

| Test | Arrange / act | Assert |
|:--|:--|:--|
| `test_create2AddressStableAcrossChains` | `snapshotState()`; `vm.chainId(1)`; deploy the factory; `predict(salt)`; `create` as the salt's sender with one table; `revertToState`; `vm.chainId(8453)`; deploy the factory again; `create` with the same salt and a *different* owner, delay, description and table | the two factory addresses are equal, their `implementation()`s are equal, the two distribution addresses are equal, equal to `predict(salt)`, and equal to `LibClone.predictDeterministicAddress_PUSH0(implementation, salt, factory)` |
| `test_saltFrontRunningRejected` | salt = `bytes32(uint256(uint160(alice)) << 96) \| bytes32(uint256(1))`; `vm.prank(bob)` `create` → `vm.prank(alice)` `create` → an open salt `bytes32(uint256(2))` from `bob` → alice's salt again | `SaltDoesNotStartWith`; a distribution whose `owner()` is the one given; succeeds; `DeploymentFailed` |
| `test_factoryRejectsEth` | `call{value: 1}("")` to the factory and to `implementation()` | both `false` |
| `test_createEmitsAndInits` | `vm.expectEmit` `Created(predicted, owner)`; `create` | `snapshot()` carries the owner, delay, description and table given; a second `init` from a stranger and one from `vm.prank(address(factory))` both revert `Unauthorized` |
| `test_createForwardsValue` | `create{value: 1 ether}` with `vm.recordLogs()` | the distribution's balance is 1 ether and no `Received` log was emitted |

**Re-point `test/Distribution.t.sol` at the factory**, the one-edit swap t01's step 5 set up. `setUp`
becomes `factory = new DistributionFactory(); impl = Distribution(payable(factory.implementation()));`.
The five direct-clone sites are lines 223, 275, 503 and 512 (`LibClone.clone_PUSH0`) and the `init`
calls under them:

- `_deploy` (503) → `factory.create(OWNER, delay_, "desc", t, _salt())` where `_salt()` returns an open
  salt from a counter; `_expectBadInit` (512) → `vm.expectRevert(BadTable)` around `factory.create`.
- `test_reentrantRecipientIsEscrowed` (223) builds mocks that need the clone's address before it exists:
  pick the salt, `factory.predict(salt)`, construct the mocks with that, then `create` with it and
  assert the created address equals the prediction. This is the one place the suite exercises
  `predict` against a real deploy.
- `test_initOnlyFactoryAndOnce` (275) keeps its name (it is in t01's acceptance list) and becomes: after
  `create`, `init` from `STRANGER` reverts `Unauthorized`, and `init` from `vm.prank(address(factory))`
  reverts `Unauthorized` because the table is set.
- `test_implementationRejectsEth` is unchanged; `impl` still points at the implementation.
- Drop the `LibClone` import from `Distribution.t.sol` once nothing uses it.

Nothing else in the file should move; a diff that touches assertions in the other fifteen tests is a
sign the swap went wrong. Arrange-Act-Assert in every new test.

**Check.**

```bash
devbox run -- forge test --list --match-contract Distribution 2>/dev/null | grep -cE '^\s+test_'   # 23
devbox run -- forge test                                                                         # 0 failed
devbox run -- forge fmt --check
```

### Step 3 — `Deploy.s.sol`, and `Counter` goes

`scripts/forge/Deploy.s.sol`: import `DistributionFactory` instead of `Counter`, deploy
`new DistributionFactory()` inside the broadcast, `console.log` the factory and its `implementation()`.
Keep the file name: `mk/10-forge.mk` deploys every `scripts/forge/Deploy*.s.sol` in `LC_ALL=C` order and
the dapp build reads `broadcast/Deploy.s.sol/<chain>/run-latest.json`, so `App` keeps its address and
the factory takes `Counter`'s slot. The implementation is an internal creation and does not appear as a
`CREATE` transaction, which is why criterion 6 reads it through `cast call … "implementation()"`.

Delete `src/Counter.sol` and `test/Counter.t.sol`. `git grep -n Counter -- src test scripts` then prints
nothing.

### Step 4 — the placeholder page

**Measured, and the reason this step exists:** `app/build.mjs` refuses to emit a bundle with an
unresolved `__NAME__` token (`app/build.mjs:51–57`, exit 1), `app/src/index.html:23` holds
`__COUNTER__`, and `make deploy` ends by building the dapp (`mk/20-dapp.mk`). On a throwaway anvil
today `make deploy addresses` exits 0 and lists `App 0xe7f1…0512` and `Counter 0x5FbD…0aa3`; with
`Counter` gone and the page untouched, the same command fails at the build step and `make serve`'s
`deploy` process with it. So the page changes by the least amount that keeps the stack proving itself:

- `index.html:23–24`: `counter: '__COUNTER__'` → `factory: '__DISTRIBUTIONFACTORY__'`;
  `CONTRACTS = [['DistributionFactory', CFG.factory]]`.
- State and load (`:110`, `:115`): `S.number` → `S.implementation`; the read becomes
  `call(CFG.factory, 'implementation()', [], ['address'])`.
- `home()` (`:123–129`): eyebrow `factory · <chain>`; one ledger row `implementation` showing the
  address through `ext('address', …)` under a sub-line `DistributionFactory at <factory>`; no button.
  Delete `increment()` whole (`:131–154`) and the `#go`/`#st`/`#log` wiring that calls it.
- `docs()` (`:164`): the verify line becomes `cast call ${CFG.factory} "implementation()(address)" --rpc-url $RPC`.
- `route()` (`:176`): the error notice names `CFG.factory`.

Keep every rule `AGENTS.md` § The dapp states: no `<script>` attributes (`test/inline-scripts.test.mjs`
fails the build otherwise), tokens uppercase between double underscores, no inline styles. `theme.css`,
`layout.html` and `eth.js` do not change. This is M02's page to replace; it is edited here only so that
`make deploy` runs on the day `Counter` leaves — `MILESTONE.md` § Out of scope names this exception.
Rejected: keeping `Counter` until M02 (M01 would ship a placeholder contract in `src/` and criterion 6
would have to move); `--set COUNTER=0x000…0` in the Makefile (a dev page pointing at a dead address,
and a lie in the broadcast-derived config).

**Check.** `devbox run -- make test` runs the node tests and they pass; the deploy in step 5 builds the
dapp without `build: nothing to substitute`.

### Step 5 — the dev chain, criterion 6

With no TTY, `make serve` cannot run; use the chain process alone or a bare anvil:

```bash
cat > /tmp/ac6.sh <<'EOF'
export ANVIL_PORT=8599
anvil --port 8599 >/tmp/anvil.log 2>&1 & pid=$!
for i in $(seq 1 15); do cast block-number --rpc-url http://127.0.0.1:8599 >/dev/null 2>&1 && break; sleep 1; done
make deploy addresses
F=$(jq -r '.transactions[]|select(.contractName=="DistributionFactory")|.contractAddress' broadcast/Deploy.s.sol/31337/run-latest.json)
I=$(cast call $F "implementation()(address)" --rpc-url http://127.0.0.1:8599)
echo "factory $F implementation $I code $(cast code $I --rpc-url http://127.0.0.1:8599 | wc -c)"
kill $pid
EOF
devbox run -- bash /tmp/ac6.sh
```

(`devbox run -- bash -c '…'` with `${PIPESTATUS[0]}` inside breaks on devbox's `sh` eval; a script file
does not.) Expect `make addresses` to print `App` and `DistributionFactory`, no `Counter`, no
`(no code …)` note, and a code length well above 3. `broadcast/*/31337/` is gitignored, so this leaves
the tree clean. If a TTY is available, `make serve` end to end once as well.

### Step 6 — the tree

`git diff --stat main` names exactly: `src/Distribution.sol`, `src/Counter.sol` (deleted),
`test/Counter.t.sol` (deleted), `test/Distribution.t.sol`, `test/DistributionFactory.t.sol`,
`scripts/forge/Deploy.s.sol`, `app/src/index.html`, and your `HANDOFF.md`. Nothing in `App.sol`,
`App.t.sol`, `Makefile`, `mk/`, `procs/`, `.github/`, `foundry.toml`, `README.md`, `AGENTS.md`, or
under `app/` beyond the one page.

## Acceptance criteria

M01 criteria 3 and 6, the t02 rows of 2, and the task's own, in the order to run them:

- `devbox run -- forge build --force` prints `Compiler run successful!` and no `Warning (` or
  `warning[` line; `devbox run -- forge lint` and `devbox run -- forge fmt --check` print no finding.
- `devbox run -- forge test --list --match-contract Distribution` lists the 18 t01 names unchanged plus
  the five in step 2, `test_create2AddressStableAcrossChains` and `test_saltFrontRunningRejected`
  among them; `devbox run -- forge test` reports `0 failed`.
- `devbox run -- forge inspect Distribution abi --json` still shows `snapshot()` exactly as M01
  criterion 3 says; `forge inspect DistributionFactory abi --json` shows
  `create(address,uint32,string,(address,uint96,string,string)[],bytes32)`, `predict(bytes32)`,
  `implementation()`, `Created`, `DeploymentFailed`, `SaltDoesNotStartWith`.
- Step 5's script: `make addresses` lists `DistributionFactory` with no `(no code …)` note and does not
  list `Counter`; `implementation()` returns an address with non-empty code.
- `git ls-files src/Counter.sol test/Counter.t.sol` prints nothing; `git grep -n Counter -- src test
  scripts app/src` prints nothing.
- `git status --porcelain` is empty after `forge build --force`, `forge test` and step 5.
- `git diff --stat main` touches only the files step 6 names.

## Out of scope

`.gas-snapshot`, `forge snapshot --check` in CI, and `AGENTS.md` § Contracts for the new contracts
(t03). A deterministic deployer or any same-address claim for the factory itself (M03, M05). Any change
under `app/` beyond step 4's page, or to `App.sol`, `Makefile`, `mk/`, `procs/`, CI. Measuring
`PUSH_GAS` (M03). Any rename or body change in `Distribution` — its ABI is fixed by `ROADMAP.md`
decision 9 and M01's one-way door. A `createWithCalls`. ERC-1363. Testing the cold-implementation
stipend (not constructible in forge 1.7.1 — t01 handoff § Discoveries).

## Open questions

Each with the default you take if no answer arrives before it matters.

1. **Where `msg.value` on `create` goes.** Default: through CREATE2's value, as the reference does, so
   the deposit lands with no `Received` log and M02 reads the balance. Alternative: `init{value:
   msg.value}`, which would route it through `init` (payable already) and still emit nothing. Neither
   emits; the default is the verbatim one.
2. **Open salts.** Default: allowed, as the reference and overview § 8 intend, with the UI defaulting
   to sender-bound. If Denizen wants open salts refused, it is one comparison and one assertion in
   `test_saltFrontRunningRejected`, and it must be decided before M02 writes the create flow.
3. **`Created` fields.** Default `(address indexed distribution, address indexed owner)`, so M02's
   "recent" view can filter by owner. Not indexed: the salt, which is in the calldata.

## Context

- Spec: `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 ("Factory + PUSH0 minimal-proxy clones, CREATE2,
  sender-bound salt … Implementation deployed in the factory constructor. No `receive()` on factory or
  implementation"), § 8 lessons ("Sender-bound salt exists for pre-funded addresses"), § 10.
- Rulings: [`ROADMAP.md`](../../../../ROADMAP.md) decisions 5 (a distribution is pinned to its factory),
  9 (the ABI names); § Order "Cross-project gate" for why the address must be predictable from the
  factory alone; § Findings carried forward for what t01 left to M02 and M03.
- Reference factory: [`src-company/multisig` `Multisig.sol` at `62eb905`](https://github.com/src-company/multisig/blob/62eb905/src/Multisig.sol)
  lines 267–300 (`MultisigFactory`: `implementation` 273, `create` 280, `emit Created` 299).
- Solady, pinned `v0.1.26`: `lib/solady/src/utils/LibClone.sol` — `cloneDeterministic_PUSH0` 351,
  `initCode_PUSH0` 379, `initCodeHash_PUSH0` 392, `predictDeterministicAddress_PUSH0` 405,
  `checkStartsWith` 2844 (the same prefix rule, for comparison).
- t01: [`TASK.md`](../m01-t01/TASK.md) step 5 (the harness this task swaps),
  [`HANDOFF.md`](../m01-t01/HANDOFF.md) § Discoveries (stipend, `vm.cool`).
- The dapp's rules: `AGENTS.md` § Contracts and the dev chain, § The dapp; `app/build.mjs:20–57`.
