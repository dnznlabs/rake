# m02-t01 — handoff

PR: #33 · Branch: `m02/t01-data-layer` · 2026-10-11

`app/src/eth.js` grew from a static-only encoder into a general ABI codec driven by a type string: `split`/`params`/`arr`/`members` parse the grammar, `dynamic` and `width` decide the head/tail split, and `encList`/`decList` walk it, so strings, bytes, nested tuples and arrays of them all work without a per-call special case. `Eth.decCall(sig, hex)` was added for t02's `pending[].action`; every name that was exported before still is. The fixtures are the point of the design: `tools/abi-vectors.sh` writes `test/fixtures/abi/` with `cast abi-encode`, `cast calldata` and `cast sig`, and `test/abi.test.mjs` asserts the codec byte-equal to them, so the oracle is never the thing under test. `scripts/forge/Seed.s.sol` plus `mk/15-seed.mk` put a featured distribution on every dev chain — a two-row table, a 1 ETH deposit and one queued `setBeneficiaries` — reached through `FEATURED_SALT`, which is the only new build token because the address is `predict(salt)` and the page derives it. Every measurement below was taken through `devbox run --` (forge/cast `1.7.1-dev`); the branch was rebased onto `origin/main` at `4149cc9` before any of it.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| M02 criterion 1 — codec byte-equal to cast | pass | `devbox run -- node --test test/*.test.mjs` → `tests 17 / pass 17 / fail 0`, exit 0. `test/abi.test.mjs` holds 9 of them and covers `create`, `setBeneficiaries`, `propose(bytes)`, `applyQueued(bytes,uint32)`, the `snapshot()` return decode and all 17 selectors. The fixtures are regenerable, not trusted: `devbox run -- tools/abi-vectors.sh` twice leaves `git status --porcelain` empty, so the committed `.hex` files *are* this cast's output. |
| M02 criterion 2 — seeded chain | pass | Through the real stack (`process-compose -f procs/10-chain.yml -f procs/20-dapp.yml up -t=false`): `cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "predict(bytes32)(address)" $FEATURED_SALT` → `0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc`; `cast balance` → `1000000000000000000`; `cast call <addr> "snapshot()(...)"` → `(0xf39F…2266, 604800, 1, "DNZN fees", [2 rows], [1 pending])`. The pending action's selector is `0x8868f490`. |
| M02 criterion 5, deploy half | pass | Four outputs below. |
| `node --test test/*.test.mjs` passes | pass | exit 0, `pass 17 / fail 0`. Count on `origin/main` is 8, so the rise is exactly the 9 cases added. |
| `forge build --force` clean | pass | exit 0, `Compiler run successful!`; `grep -c 'Warning ('` → 0, `grep -c 'warning\['` → 0, over a log that also contains `Compiling 36 files with Solc 0.8.34`, so the compile ran. |
| `forge lint` and `forge fmt --check` silent | pass | `forge lint` exit 0, output `No files changed, compilation skipped` and nothing else; `forge fmt --check` exit 0, 0 bytes of output. Non-emptiness: the same binary on the same tree with `--severity high med low info gas` prints `note[named-struct-fields]` at `src/App.sol:79` and `note[screaming-snake-case-immutable]` at `src/Distribution.sol:73`, so lint is parsing these sources and is silent because the project's configured severities hold no findings — not because it saw nothing. |
| `forge snapshot --check` exit 0, no `Diff in` | pass | exit 0 after `forge build --force`; `grep -c 'Diff in'` → 0 over a log reporting `36 tests passed` across 3 suites, so the check ran against a suite that executed. `.gas-snapshot` is untouched (`git diff --name-only origin/main` does not name it). |
| `git status --porcelain` empty after each of build/test/snapshot/both deploys | pass | `forge build --force` → `[]`; `forge test` → `[]`; `forge snapshot` → `[]`; `make deploy` → `[]`; `make deploy ANVIL_PORT=8546 CHAIN_ID=31338` → `[]`. The 31338 half needed the new `.gitignore` line; without it the second deploy leaves `broadcast/*/31338/` untracked. |
| Placeholder page still renders at `:3000` | pass, with one gap | The stack serves it: `HTTP 200`, 20423 bytes byte-identical to `app/dist/index.html`, holding the home ledger row (`ledgerRow('implementation'`, `DistributionFactory at `) and the docs contracts table. Its whole data path was driven against the live chain with the new codec — `eth_chainId` → `31337`, then `implementation()` → `0xE16BC898a44FA4c5C9E10829BA513B20cecb7670`, equal to `cast call <factory> "implementation()(address)"`. **Not verified visually:** browser navigation is blocked by policy in this session, so "renders" rests on the served markup and the read path, not on a screenshot. |
| Every prior `Eth` export still exists; `app/build.mjs` unchanged | pass | `origin/main`: `{ keccak, utf8, hexBytes, sel, pad, enc, addr, dec, checksum }`; now: the same nine plus `decCall`. `git diff --name-only origin/main -- app/build.mjs` is empty. |

### M02 criterion 5, the four cast outputs

```
chain 31337  factory=0x5FbDB2315678afecb367f032d93F642f64180aa3
chain 31337  predict=0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
chain 31337  benefs =[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 6000, "ops", "operations"), (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 4000, "treasury", "")]
chain 31338  factory=0x5FbDB2315678afecb367f032d93F642f64180aa3
chain 31338  predict=0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
chain 31338  benefs =[(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 7000, "ops", "operations"), (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 3000, "treasury", "")]
```

Same factory, same featured address, different table — which is the drift t02 has to show.

### The codec against the live chain

Worth one line because it is the only check that ties steps 2 and 4 together rather than testing each alone. Reading the seeded chain through `app/src/eth.js` (not cast) returns `owner 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, `delay 604800n`, `nonce 1n`, `description "DNZN fees"`, the two rows at 6000/4000, `pending.length 1`, and `Eth.decCall('setBeneficiaries((address,uint96,string,string)[])', pending[0][2])` yields the swapped 4000/6000 table. So the fixture-proved decoder also reads what the seed actually wrote.

## Deviations from the plan

None in substance. Two notes on how steps were carried out:

- The plan's `_table` sketch says "ops 6000 / treasury 4000 using anvil accounts 1 and 2 (`0x7099…79C8`, `0x3C44…93BC`), ascending by address as `BadTable` requires". Ascending puts `0x3C44…93BC` first, so `ops` is account 2 and `treasury` is account 1 — the shares follow the roles, not the order the addresses are listed in the plan.
- The seed passes `msg.sender` as `owner_` rather than reading a `SENDER` env var, which would have meant adding `export SENDER` to `mk/10-forge.mk` — outside this task's write scope. Verified `msg.sender` is `--sender` under `forge script … --unlocked --sender`. It is also the stronger form: `create` already requires `msg.sender` to equal the salt's top 20 bytes (decision 10), so a sender who does not own the salt reverts rather than seeding a distribution owned by the wrong key.

## Decisions

- **`selectors.txt` is written in the script's own case order, not sorted.** Either is stable; source order means a diff names the case that moved rather than reshuffling neighbours. The script's comment claimed "sorted" and did not sort — corrected to say what it does.
- **The `.gitignore` entry is `/broadcast/*/31338/`, matching the existing `31337` line's shape** rather than a wider `/broadcast/*/3133[78]/`. A real network's broadcast log is the deployment record and stays tracked; only the two dev chain ids are listed, one line each.
- **`Eth.dec` returns `bytes` as a `0x`-prefixed string and numbers as `BigInt` at every depth**, including inside tuples, so `pending[0][2]` can be handed straight back to `decCall`. The round-trip is asserted rather than assumed: the test feeds the decoded action back through `decCall` and compares to the fixture.

## Discoveries

- **`TASK.md` step 3's baseline test count is stale:** it says "it is 3 today, all in `inline-scripts.test.mjs`". `origin/main` actually reports 8 — that file has 4 top-level `test(` calls but parameterises several. The criterion still holds (8 → 17, a rise of exactly the 9 cases added); only the figure to compare against was wrong.
- **The TTY-less `make serve` command in M02 criterion 2 does not work as written.** `process-compose -f procs/10-chain.yml up -t=false` fails with `error: a value is required for '--port <NUM>'`, because `ANVIL_PORT` and `APP_PORT` are exported by `mk/10-forge.mk` and `mk/20-dapp.mk` — i.e. only when `make` runs process-compose. Running it directly needs `ANVIL_PORT=8545 APP_PORT=3000` in the environment. Not fixed here: the fix is either in the procs files or in the milestone's wording, and both are outside this task.
- **`make deploy` twice against one live anvil moves the featured address, and the #22 guard is not what prevents that.** The second run re-executes `Deploy*.s.sol`, so the factory lands at a new address and `predict(salt)` follows it. The guard protects the case it was written for — the same factory, the same salt — which was verified directly by re-running `Seed.s.sol` with the unchanged `FACTORY`: it logged `featured (already seeded, left alone)` and sent nothing. Pre-existing `make deploy` behaviour, not introduced here.
- **`forge lint` is silent on this tree at the project's configured severities but not empty-handed**, as the `--severity … info gas` run above shows: there are pre-existing `note`-level findings in `src/App.sol` and `src/Distribution.sol`. Both files are out of scope; neither is a defect, and the pinned 1.7.1 CI assertion is unaffected. Flagged only so a future "lint is silent" claim is not read as "lint found nothing to look at".

No contract defect surfaced, so there is no `carried` issue from the codec work.

## Open questions

None.
