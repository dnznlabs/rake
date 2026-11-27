# m02-t01 — Data layer: ABI codec and the seeded dev chain

Milestone: [M02](../../MILESTONE.md) · Phase: 1 — Data layer

When this is done, `app/src/eth.js` encodes and decodes every type the two contracts use — strings,
bytes, nested tuples and arrays of them — proven byte-equal to `cast` on fixtures the repo can
regenerate, and `make serve` brings up a chain with a *featured* distribution (two-row table, a deposit,
one queued change) at an address the dapp derives from one build token. Nothing visible changes yet:
the placeholder page keeps building, and M02's screens arrive in t02 on top of this.

## Plan

Every command below runs from the repo root through `devbox run --` (forge `1.7.1-dev`, cast `1.7.1-dev`,
the pinned node). Branch `m02/t01-data-layer` from `origin/main` after #16 has merged; check hooks with
`ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`), and run
`devbox run -- pre-commit install --install-hooks` if either is missing. Do not run `make init` on this
project.

1. **Fixtures first.** Add `tools/abi-vectors.sh` (bash, `set -euo pipefail`, runs through devbox) that
   writes `test/fixtures/abi/<name>.hex` for each case below, one hex string per file, and a
   `test/fixtures/abi/selectors.txt` of `name 0xselector` lines from `cast sig`. Commit the generated
   files; CI does not run cast through node. Cases, with the exact cast syntax (strings inside tuples
   are double-quoted; an empty string is `""`; verified 2026-10-11 on cast 1.7.1):

   ```
   cast abi-encode 'f(address,uint32,string,(address,uint96,string,string)[],bytes32)' \
     0x70997970C51812dc3A010C7d01b50e0d17dc79C8 604800 "DNZN fees" \
     '[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,6000,"ops","operations"),(0x90F79bf6EB2c4f870365E785982E1f101E93b906,4000,"treasury","")]' \
     0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001        # create.args
   cast calldata 'setBeneficiaries((address,uint96,string,string)[])' \
     '[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,7000,"ops","operations"),(0x90F79bf6EB2c4f870365E785982E1f101E93b906,3000,"treasury","")]'   # setBeneficiaries.calldata
   cast calldata 'propose(bytes)' <setBeneficiaries.calldata>                   # propose.calldata
   cast calldata 'applyQueued(bytes,uint32)' <setBeneficiaries.calldata> 1     # applyQueued.calldata
   cast calldata 'setDescription(string)' "DNZN fees, revised"                 # setDescription.calldata
   cast calldata 'setDelay(uint32)' 172800                                      # setDelay.calldata
   cast calldata 'transferOwnership(address)' 0x0000000000000000000000000000000000000000   # renounce.calldata
   cast abi-encode 'f((address,uint32,uint32,string,(address,uint96,string,string)[],(bytes32,uint256,bytes)[]))' \
     '(0x70997970C51812dc3A010C7d01b50e0d17dc79C8,604800,1,"DNZN fees",[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,6000,"ops","operations"),(0x90F79bf6EB2c4f870365E785982E1f101E93b906,4000,"treasury","")],[(0x1111111111111111111111111111111111111111111111111111111111111111,1760000000,<setBeneficiaries.calldata>)])'   # snapshot.return
   ```

   The last is exactly what `snapshot()` returns on the wire: a single tuple return value, encoded with
   its head offset word (`0x…20`) first. Selectors to record and assert: `create(...)` `0xf0f469ff`,
   `setBeneficiaries(...)` `0x8868f490`, `applyQueued(bytes,uint32)` `0xcb313c17` (all three verified),
   plus `snapshot()`, `beneficiaries()`, `predict(bytes32)`, `propose(bytes)`, `cancel(bytes32)`,
   `distribute(address)`, `release(address,address)`, `setDescription(string)`, `setDelay(uint32)`,
   `transferOwnership(address)`, `reserved(address)`, `escrowed(address,address)`, `implementation()`,
   `isOwner(address)`. Check: the script is idempotent — run it twice, `git status --porcelain` is
   empty the second time.
2. **The codec.** In `app/src/eth.js`, replace the static-only `enc` and the flat `dec` with a general
   pair driven by a type string: `Eth.enc(sig, args)` keeps its name and callers (`build.mjs` uses
   `checksum`; `index.html` uses `enc`, `dec`, `sel`, `pad`, `addr` — keep every exported name) but
   parses the signature's parameter list and encodes head/tail per the ABI spec: static types one
   word; `string`/`bytes` as length-prefixed, right-padded; `T[]` as length then elements; `T[k]` and
   tuples inline when static, by offset when any member is dynamic. `Eth.dec(types, hex)` mirrors it
   and returns nested arrays for tuples (`['(address,uint96,string,string)[]']` → array of 4-arrays);
   `Eth.decCall(sig, hex)` returns the arguments of calldata whose first four bytes match `sel(sig)`,
   or `null` — this is how t02 decodes `pending[].action`. Numbers come back as `BigInt`, addresses
   checksummed, `bytes` as `0x`-hex strings. No new file: the build inlines `eth.js` and the bundle
   budget is measured in criterion 8. Check: `node -e` round-trips are not the test; step 3 is.
3. **The test.** `test/abi.test.mjs` under `node:test` loads every fixture and asserts: `Eth.enc` of the
   `create` arguments equals `create.args.hex` after the selector; each `*.calldata.hex` equals the
   matching `enc`; `Eth.dec` of `snapshot.return.hex` yields owner `0x7099…79C8`, delay `604800n`,
   nonce `1n`, the two table rows with their strings, and one pending whose `action` decodes via
   `decCall('setBeneficiaries(...)')` to the 7000/3000 table; `Eth.sel` of every line in
   `selectors.txt` matches; and `enc` throws on an argument count mismatch rather than padding. Check:
   `node --test test/*.test.mjs` passes and the test count rose by the number of cases above (it is 3
   today, all in `inline-scripts.test.mjs`).
4. **The seed.** `scripts/forge/Seed.s.sol`, not `Deploy*.s.sol`: the deploy loop in `mk/10-forge.mk`
   runs every `Deploy*.s.sol` with no environment, and the seed needs the factory address. Add
   `mk/15-seed.mk` with a `deploy::` recipe between the forge deploy and the dapp build, modelled on
   `APP_ADDR` in `mk/30-onchain.mk`:

   ```
   FACTORY_ADDR = $$($(DEPLOYED) | awk '$$1=="DistributionFactory"{print $$2}')
   FEATURED_SALT ?= 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001
   export FEATURED_SALT
   deploy::
   	@FACTORY=$(FACTORY_ADDR) forge script scripts/forge/Seed.s.sol $(FORGE_SEND)
   ```

   The salt's top 20 bytes are `SENDER` (anvil key 0), as decision 10 requires once #16 is in; the
   low 12 bytes are `1`. The script reads `FACTORY` and `FEATURED_SALT` with `vm.envAddress` /
   `vm.envBytes32`, and does, under `vm.startBroadcast()`: if `predict(salt)` already has code, log
   and return (anvil restarts empty, but `make deploy` against a running chain must not burn a gas
   limit on a CREATE2 collision — #22); else `create{value: 1 ether}(SENDER, 7 days, "DNZN fees",
   table, salt)` with the table chosen by `block.chainid` — `31337`: ops 6000 / treasury 4000 using
   anvil accounts 1 and 2 (`0x7099…79C8`, `0x3C44…93BC`), ascending by address as `BadTable`
   requires; any other chain id: 7000 / 3000 the same two accounts — then
   `propose(abi.encodeCall(Distribution.setBeneficiaries, (revised)))` where `revised` swaps the two
   shares, so the chain carries one queued change. Log the distribution address. The owner is
   `SENDER`, so `propose` goes through under `--unlocked`. Check: `make serve` in one terminal, then
   `cast call <factory> "predict(bytes32)(address)" $FEATURED_SALT --rpc-url http://127.0.0.1:8545`
   returns an address whose `cast code` is non-empty, whose `cast balance` is `1000000000000000000`,
   and whose `cast call <addr> "snapshot()" | cast abi-decode --input …` (or `cast call … "pendingCount()(uint256)"`)
   shows one pending. On a second anvil, `anvil --port 8546 --chain-id 31338` then
   `make deploy ANVIL_PORT=8546 CHAIN_ID=31338`: the factory lands at `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   on both (verified 2026-10-11 before the seed existed), the featured address is the same on both,
   and `beneficiaries()` differs. Add `/broadcast/*/31338/` to `.gitignore` beside the `31337` line,
   or the second deploy leaves the tree dirty.
5. **The token.** `__FEATURED_SALT__` in `app/src/index.html` (a `CFG.featuredSalt` entry; the page
   does not use it yet) and `--set FEATURED_SALT=$(FEATURED_SALT)` passed to both `app/build.mjs`
   invocations in `mk/20-dapp.mk`. The address is never a token: the page derives it from `predict`
   at boot (t02). Check: `make dapp` succeeds; `grep -c FEATURED_SALT app/dist/index.html` is 0 and
   `grep -c f39fd6e51aad88f6 app/dist/index.html` is at least 1; `make dapp-nodev` the same.
6. **CI and gas.** `.github/workflows/ci.yml` already runs `make test`, which runs the node tests after
   forge's (`mk/20-dapp.mk` `test::`). No `src/` change, so `.gas-snapshot` should not move; confirm
   with `forge snapshot --check` after `forge build --force` (and run the build *first*, never
   `forge lint` ahead of a count — `AGENTS.md` § Contracts). Check: the PR's CI run is green with the
   `gas snapshot` step at exit 0.
7. **Docs.** `AGENTS.md` § The dapp gains one bullet for `tools/abi-vectors.sh` and the fixture rule
   (regenerate, never hand-edit), and § Contracts and the dev chain one bullet for the seed and the
   featured salt. `HANDOFF.md` beside this file. Check: `git diff --stat origin/main` names only
   `app/src/eth.js`, `app/src/index.html`, `mk/15-seed.mk`, `mk/20-dapp.mk`, `scripts/forge/Seed.s.sol`,
   `tools/abi-vectors.sh`, `test/abi.test.mjs`, `test/fixtures/abi/*`, `.gitignore`, `AGENTS.md`
   and the handoff.

## Acceptance criteria

- M02 criterion 1 in full; criterion 2 in full; criterion 5's deploy half (same factory and featured
  address on 31337 and 31338, different `beneficiaries()`), with the four cast outputs in the handoff.
- `node --test test/*.test.mjs` passes; `forge build --force` prints `Compiler run successful!` with
  no `Warning (` and no `warning[`; `forge lint` and `forge fmt --check` silent; `forge snapshot --check`
  exit 0 with no `Diff in` line; `git status --porcelain` empty after `forge build --force`,
  `forge test`, `forge snapshot`, `make deploy`, and `make deploy ANVIL_PORT=8546 CHAIN_ID=31338`.
- The placeholder page still renders at `:3000` with the factory and implementation rows.
- Every exported name of `Eth` that existed before still exists, and `app/build.mjs` is unchanged.

## Out of scope

- Any view, route or copy change beyond the one `CFG` entry — t02. The pull to start the landing while
  the codec is warm is real; the landing is reviewed against a plan that does not exist yet.
- `App.sol`, `Chunks.s.sol`, the widget — t05, gated on #27.
- `src/Distribution.sol` and `.gas-snapshot`. If the codec work surfaces a contract defect, it goes in
  the handoff and a `carried` issue, not in this PR.
- Replacing the scaffold's provider, wallet and theme code in `index.html`. It is the DNZN dapp
  fragment and t02 builds on it.

## Open questions

None. The three M02 rulings (#26, #27, #28) gate t03 and t05, not this task.

## Context

- Spec: `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 (`snapshot()` is the widget's entire data contract),
  `docs/brainstorming/design/HANDOFF.md` § Demo → real wiring.
- Rulings: `docs/ROADMAP.md` decisions 9 (ABI names) and 10 (sender-bound salts; the seed's salt is
  shaped for it, and the task starts after #16 merges).
- Contract surface: `src/Distribution.sol` — `Snapshot`, `Beneficiary`, `Pending` structs (lines 10–30),
  `create` (line 319), `predict` (line 349); public getters `owner`, `delay`, `nonce`, `description`,
  `queued`, `reserved`, `escrowed`.
- Precedent: the sibling project's `app/src/index.html` § names, for how the same `call`/`enc`
  pattern is used, and `tools/names-probe.mjs` there as the oracle pattern this task's `abi-vectors.sh`
  follows.
- Carried: #22 (the `eth_getCode` guard the seed also honours).
