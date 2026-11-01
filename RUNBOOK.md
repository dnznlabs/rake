# RUNBOOK — deploying Rake

One ordered list, parameterised by network. [M04](docs/milestones/m03/MILESTONE.md) runs it against
the two testnets of § 1 and amends it; M05 runs the amended document against the mainnets. There is
no per-network copy of these steps on purpose: two copies drift.

It ends with `DistributionFactory`, its implementation and `App` **at the same addresses on every
chain in § 1**, DNZN's own distribution at the address this document predicted before any
transaction was sent, and **`App` still owned and still unlocked**. Read § Not in this runbook
before looking for the step that closes a door.

Authority for anything this document leaves ambiguous:
[M03 § Acceptance criteria](docs/milestones/m03/MILESTONE.md#acceptance-criteria) 6, 7 and 8 for
what the deploy must prove; [`docs/ROADMAP.md`](docs/ROADMAP.md) § Decisions 5, 10, 29, 32, 33 and
35 for why it is shaped this way; [`AGENTS.md`](AGENTS.md) § Contracts and the dev chain for what
counts as a check.

Every command runs from the repository root, in **bash**, through `devbox run --` — the toolchain is
pinned in `devbox.json` and the host's is not it. Bash specifically because one gate reads
`${PIPESTATUS[0]}`: an exit code measured off the end of a pipe is `tee`'s, not the command's.

## Not in this runbook

**No door closes on deploy day.** `lock()` is never sent here — it is M05's, taken after mainnet has
been watched under real use, and it is one-way: once `App` is locked the document it serves can never
be replaced. Renouncing or transferring `App`'s ownership is likewise not here, and neither is any
owner change on a distribution, DNZN's included.

So the word `lock()` appears in this file **only in this section**. Step 3 reads `locked()` back and
requires `false`, and that check passes by this transaction never being sent:

```sh
grep -c 'lock()' RUNBOOK.md        # every hit is in this section
```

## 0 — variables

Every command below is parameterised by these and nothing else, and nothing below hard-codes a value
that belongs here.

```sh
export RPC=<full https URL>          # every command passes --rpc-url "$RPC"
export CHAIN_ID=<from § 1's table>
export SIGNER="--account <keystore> --sender <address>"   # anvil: --unlocked --sender 0xf39F…2266
export OWNER=0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790    # the Ops vault: App's owner, and the owner passed to create
export APP_VERSION=v0.1
export FACTORY_SALT=0x0000000000000000000000000000000000000000000000000000000000000000
export APP_SALT=0x0000000000000000000000000000000000000000000000000000000000000000
export CREATOR=<DNZN Creator address>                     # decision 32; #90 still owes the value
export DNZN_SALT=${CREATOR}000000000000000000000001        # top 20 bytes CREATOR (decision 10), low 12 bytes 1
# filled in by step 1, never by hand
export PROXY=0x4e59b44847b379578588920cA78FbF26c0B4956C FACTORY= IMPL= APP= DISTRO=
```

**`OWNER` is one value for every chain on purpose**, as `state-collection`'s `PAYEE` is: there is no
second constant to pick the wrong one of. The Ops vault is at this address on all eight chains of
§ 1 — read 2026-10-30, table on [#114](https://github.com/dnznlabs/rake/issues/114), ruled as
**decision 35** after Denizen placed Treasury and Ops on Base Sepolia at their addresses — so this
line never branches by chain, and `App` is same-address on all eight because of it.

**`App`'s address depends on `OWNER` and `APP_VERSION` as well as `APP_SALT`.** All three are
constructor or salt inputs, so the same-address property holds only while all three are the same on
every chain. Changing any one of them on one chain puts `App` somewhere else there.

**The salts are zero here.** [#115](https://github.com/dnznlabs/rake/issues/115) was ruled for
vanity mining (decision 37) and that is M04's step, not this document's: the salts are variables, so
a mined value is a one-line change to the two lines above. `FACTORY_SALT` can be mined against the
final `src/`; `APP_SALT` waits on D15 ([#126](https://github.com/dnznlabs/rake/issues/126)).

**`CREATOR` is a placeholder until [#90](https://github.com/dnznlabs/rake/issues/90) names the
address.** The rehearsal in § Rehearsed on anvil uses the signing account for it and says so. The
creator key's two conditions — salted creates only, and never an owner or a signer for anything
else — are the handbook's, in `docs/multisig-transactions.md` § The DNZN Creator key, and are
referenced rather than restated so there is one copy of them.

## 1 — the chains

Every chain DNZN's distribution is expected to reach: M04's two testnets, M05's four mainnets, and
M05's stretch row. The `create` in step 6 is done **once per chain in this table**, while the
creator key is live.

| chain | ID | RPC read from | proxy bytes | proxy keccak | EVM |
|:------|---:|:--------------|------------:|:-------------|:----|
| Ethereum | 1 | `https://ethereum-rpc.publicnode.com` | 69 | `0x2fa86add…f7e4989` | cancun |
| OP Mainnet | 10 | `https://mainnet.optimism.io` | 69 | `0x2fa86add…f7e4989` | cancun |
| Base | 8453 | `https://mainnet.base.org` | 69 | `0x2fa86add…f7e4989` | cancun |
| Arbitrum One | 42161 | `https://arb1.arbitrum.io/rpc` | 69 | `0x2fa86add…f7e4989` | cancun |
| MegaETH | 4326 | `https://mainnet.megaeth.com/rpc` | 69 | `0x2fa86add…f7e4989` | cancun |
| Robinhood Chain | 4663 | `https://robinhood-rpc.publicnode.com` | 69 | `0x2fa86add…f7e4989` | cancun |
| Sepolia | 11155111 | `https://ethereum-sepolia-rpc.publicnode.com` | 69 | `0x2fa86add…f7e4989` | cancun |
| Base Sepolia | 84532 | `https://sepolia.base.org` | 69 | `0x2fa86add…f7e4989` | cancun |

The keccak is the same on all eight and is given in full once:
`0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989`. Re-read per chain in step 1
rather than trusted from this table — a table is a reading someone else took.

**The EVM each chain must execute.** `foundry.toml` builds for **cancun**, and a clone's runtime is
solady's **PUSH0** minimal proxy (`docs/REFERENCE.md:110-116`), so a chain that cannot execute PUSH0
or transient storage cannot run this code at all. The lock inside `Distribution` is transient
storage. Step 1's simulated deploy is how this document proves it per chain, rather than reading a
chain's claimed hard-fork list: `cast call --create` runs the real constructor on the real node.

**Fallback if a script cannot run.** A raw `cast send $PROXY "${SALT}${INIT#0x}"` to the proxy places
the same contract at the same address — the proxy takes 32 bytes of salt followed by the init code,
with constructor arguments ABI-appended for `App` — so the scripts are a convenience, not the
mechanism. Decision 33's *other* fallback, for a chain that refuses pre-EIP-155 transactions and
lacks the proxy, is the Safe singleton factory, and that is a different runbook rather than an
improvisation here.

### The native-balance token precondition (#127, `SECURITY.md` F12)

`reserved` is keyed by token address, so on a chain carrying an ERC-20 whose `balanceOf` **is** the
native balance — a double-entry-point token, Celo's `GoldToken` being the named example —
`distribute(alias)` reads the same balance that `distribute(address(0))` escrowed and can pay it to
the table a second time. **This is checked and recorded per chain before the first deploy on that
chain.** A chain that fails is **not a runbook variable**: it is a contract change and a new version
(decision 5), and the deploy does not proceed on it.

The check, per chain, against a probe address whose native balance is non-zero — a comparison that
cannot tell "equal" from "empty" is not a check:

```sh
ALIAS=<candidate token address>
P=<any address with a non-zero native balance on this chain>
cast balance $P --rpc-url "$RPC"                                   # must be non-zero: the denominator
cast code $ALIAS --rpc-url "$RPC"                                  # 0x means the alias does not exist here
cast call $ALIAS "balanceOf(address)(uint256)" $P --rpc-url "$RPC"  # must NOT equal the balance above
```

Read 2026-11-01 at the commit in § Record, four known alias families probed on each chain
(OP `LegacyERC20ETH`, Celo `GoldToken`, Polygon's `0x…1010`, `0x…0001`) — 32 alias-chain checks,
one hit. The method was validated against Celo mainnet, where the same commands **do** fire on
`GoldToken` `0x471EcE3750Da237f93B8E339c536989b8978a438` (2,585 bytes, `balanceOf` equal to the
native balance), so a clean row below means the check ran and missed, not that it failed to run.

| chain | native-balance / double-entry-point token | source checked |
|:------|:------------------------------------------|:---------------|
| Ethereum | none — no alias has code; ETH is only ever wrapped, and WETH holds its own balance | measured, all four aliases `0x` |
| OP Mainnet | **`LegacyERC20ETH` `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` is live on the read side** — 3,671 bytes, `name()` "Ether", `symbol()` "ETH", `balanceOf(x)` equal to x's native balance. **Every stateful method reverts** (`transfer`, `transferFrom`, `approve` — all "disabled"), so no value can move through it. **Disposition pending the architect's ruling — see § Open questions in this task's `HANDOFF.md`; do not deploy to chain 10 before it is ruled.** | measured at block 158,978,665, and [OP Stack spec § Predeploys](https://specs.optimism.io/protocol/predeploys.html#legacyerc20eth): LegacyERC20ETH is **Deprecated**, "All of the stateful methods in this contract will revert after the Bedrock upgrade" |
| Base | none — post-Bedrock OP Stack chain, so the legacy alias was never deployed | measured, `0x` at the legacy address |
| Arbitrum One | none — no native-balance ERC-20; the Arbitrum precompiles are not tokens | measured, all four aliases `0x` |
| MegaETH | none | measured, all four aliases `0x` |
| Robinhood Chain | none | measured, all four aliases `0x` |
| Sepolia | none | measured, all four aliases `0x` |
| Base Sepolia | none — post-Bedrock OP Stack chain | measured, `0x` at the legacy address |

Re-run the three commands above on any chain added to this table, and on any chain whose row is
older than its last network upgrade. A new predeploy is a new reading.

## 2 — the steps

### Step 1 — preflight, nothing broadcast

Nothing is sent in this step. It produces the addresses every later step is checked against.

**1a. The toolchain and the tree, asserted rather than assumed.**

```sh
forge --version | head -1              # must print forge Version: 1.7.1-dev
node --version                         # record it
git status --porcelain | wc -l         # must be 0 — a dirty tree has no provenance
git rev-parse HEAD                     # record: this is the commit being deployed
```

**1b. The gates.**

```sh
forge build --force 2>&1 | tee /tmp/build.log >/dev/null
echo "build exit=${PIPESTATUS[0]}"                  # must be 0 — forge's status, not tee's
grep -E 'Compiling [0-9]+ files' /tmp/build.log     # must print: the input was not empty
grep -c 'warning\[' /tmp/build.log                  # must be 0
grep -c 'Warning (' /tmp/build.log                  # must be 0

forge test                             # must be all passed, 0 failed; record the count
forge snapshot --check                 # must exit 0
```

`--force` so the warning assertion runs over a full compile rather than a warm `out/` that prints
nothing, and because `forge lint` after an edit records a file as built without writing its
artifact, which silently drops that file's suite from the next `forge test`. Run `forge lint` and
`forge fmt --check` **after** these, never before.

**1c. The proxy is on this chain, at the canonical address.**

```sh
cast code $PROXY --rpc-url "$RPC" | wc -c          # must be 141 chars = 69 bytes
cast keccak "$(cast code $PROXY --rpc-url "$RPC")" # must equal § 1's keccak
```

Anything else: **stop.** Decision 33's fallback is the Safe singleton factory and a different
runbook, not an improvisation here. On a local chain anvil predeploys the proxy; if a future anvil
does not, `cast rpc anvil_setCode $PROXY <runtime>` with the 69 bytes read from any chain in § 1 is
the step, and § Rehearsed on anvil says which happened.

**1d. The sender check decision 33 requires.** A constructor run through the proxy sees **the proxy**
as `msg.sender` and the submitter only as `tx.origin`, so any constructor that reads either would
read the wrong thing:

```sh
grep -rn 'tx.origin' src/              # must print nothing
grep -n 'msg.sender' src/App.sol       # must print nothing
```

`Distribution.sol`'s `factory = msg.sender` is the one constructor read in the tree, and it runs
under the factory, not under the proxy, so it is correct as written. A hit in either grep means a
constructor would see the proxy as its sender, and **the deploy stops**.

**1e. The chain executes this bytecode.**

```sh
cast call --rpc-url "$RPC" --create "$(forge inspect DistributionFactory bytecode)"
cast estimate --rpc-url "$RPC" --create "$(forge inspect DistributionFactory bytecode)"
```

The call must return the factory's **1,320-byte** runtime. The constructor runs
`new Distribution`, whose bytecode is cancun/PUSH0, so a success here is the EVM check of § 1 —
executed, not read off a feature list. Record the estimate; it is the gas figure for this chain.

**1f. The prediction, offline, before any transaction.**

```sh
INIT=$(forge inspect DistributionFactory bytecode)
FACTORY=$(cast create2 --deployer $PROXY --salt $FACTORY_SALT --init-code-hash $(cast keccak $INIT) | tail -1)
AINIT=$(forge inspect App bytecode)$(cast abi-encode 'c(address,string)' $OWNER $APP_VERSION | cut -c3-)
APP=$(cast create2 --deployer $PROXY --salt $APP_SALT --init-code-hash $(cast keccak $AINIT) | tail -1)
printf 'FACTORY %s\nAPP     %s\n' "$FACTORY" "$APP"
```

`cast create2` prints the address alone on its last line, hence the `tail -1`. **Both figures move
with the bytecode**, which is why they are computed here and never copied from a previous run or
from § Rehearsed on anvil. `record:` `FACTORY`, `APP`, and the two init-code hashes.

**1g. The collision check (#22).**

```sh
cast code $FACTORY --rpc-url "$RPC"    # must print 0x
cast code $APP --rpc-url "$RPC"        # must print 0x
```

Code at either address means **this chain already carries the deploy**. Do not resend: a second
CREATE2 through the proxy is a collision, and a collision consumes every unit of gas forwarded to it
before anything can revert. The record for this chain is already written — go to step 5.

### Step 2 — the factory

```sh
FACTORY_SALT=$FACTORY_SALT forge script scripts/forge/Deploy.s.sol --rpc-url "$RPC" --broadcast $SIGNER
cast call $FACTORY "implementation()(address)" --rpc-url "$RPC"      # record as IMPL
```

The script logs `FACTORY_SALT`, `DistributionFactory` and `implementation`. **The logged
`DistributionFactory` must equal the `FACTORY` step 1f predicted.** If it does not, stop and find
out why before sending anything else: search the deployer, salt and init-code hash for the address
that did land, because a disagreement is a wrong input, not a quirk of the toolchain.

The implementation needs no deploy of its own — `implementation = address(new Distribution{salt:
bytes32(0)}())` is already a CREATE2 from the factory, so it follows the factory's address and is
the same on every chain the factory is. It is created inside the constructor, so it is not a CREATE
transaction in the broadcast log and `make addresses` cannot list it; the `cast call` above is how it
is read.

`record:` the transaction hash, `gasUsed`, `FACTORY`, `IMPL`.

### Step 3 — `App`

```sh
OWNER=$OWNER APP_VERSION=$APP_VERSION APP_SALT=$APP_SALT \
  forge script scripts/forge/DeployApp.s.sol --rpc-url "$RPC" --broadcast $SIGNER
cast call $APP "owner()(address)" --rpc-url "$RPC"       # must equal OWNER
cast call $APP "version()(string)" --rpc-url "$RPC"      # must equal APP_VERSION
cast call $APP "locked()(bool)" --rpc-url "$RPC"         # must be false, and stays false
```

**The logged `App` must equal the `APP` step 1f predicted.** `OWNER` is required by the script with
no default, so a missing value fails before any transaction rather than handing `App` to an address
nobody holds (`SECURITY.md` F3).

**Why the owner read-back exists.** `App` takes its owner as a constructor argument
(`src/App.sol:43`), so the proxy being `msg.sender` is harmless here. An `Ownable(msg.sender)`
pattern would instead leave `App` owned by the proxy forever — an address with no key, which would
make the one-way door in § Not in this runbook unreachable and the document unreplaceable. This read
is what would catch a future change to that pattern, and it is cheap.

`record:` the transaction hash, `gasUsed`, `APP`, and the three reads.

### Step 4 — the document

The bundle that ships, then the chunks, then the comparison that proves the chain serves the bytes
that were built:

```sh
make dapp-nodev CHAIN_ID=$CHAIN_ID
APP=$APP forge script scripts/forge/Chunks.s.sol --rpc-url "$RPC" --broadcast $SIGNER
node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID
sha256sum app/dist/index.html app/dist/widget.js
```

`dapp-nodev`, never `dapp`: a dev bundle on chain reads through its `?rpc=` override and never
reaches a wallet (`mk/30-onchain.mk`). The equality to check is the one
`docs/milestones/m03/tasks/m03-t03/HANDOFF.md` § Criterion 8 shows — `inflated sha256` equals
`sha256sum app/dist/index.html`, `widget sha256` equals `sha256sum app/dist/widget.js`, and the byte
counts match both ways. `record:` the chunk pointers, `inflated sha256`, `widget sha256`, both byte
counts, every transaction hash.

**`make deploy` is not used on a public chain.** Its later recipes run `Seed.s.sol`,
`Fixtures.s.sol` and a dev build, all of which are dev-chain only (decision 29).

### Step 5 — explorer verification, named and not run

M04 executes these and records the explorer links; no key is needed to write them down.

```sh
forge verify-contract $FACTORY src/Distribution.sol:DistributionFactory \
  --chain "$CHAIN_ID" --etherscan-api-key "$ETHERSCAN_API_KEY" --watch

forge verify-contract $IMPL src/Distribution.sol:Distribution \
  --chain "$CHAIN_ID" --etherscan-api-key "$ETHERSCAN_API_KEY" --watch

forge verify-contract $APP src/App.sol:App \
  --chain "$CHAIN_ID" --etherscan-api-key "$ETHERSCAN_API_KEY" --watch \
  --constructor-args "$(cast abi-encode 'constructor(address,string)' "$OWNER" "$APP_VERSION")"
```

`DistributionFactory` and `Distribution` take no constructor arguments; `App` takes two. `--watch` so
the command's own exit code carries the result rather than a submission receipt. `--constructor-args`
goes **last**: it is variadic and eats any flag placed after it.

### Step 6 — DNZN's `create`

**This is the one step the DNZN Creator key signs**, and the only one. Re-export `SIGNER` to that
key for this step and back afterwards. Its two conditions are the handbook's, in
`docs/multisig-transactions.md` § The DNZN Creator key — salted creates only, and never an owner or
a signer for anything else.

```sh
DISTRO=$(cast call $FACTORY "predict(bytes32)(address)" $DNZN_SALT --rpc-url "$RPC")
cast code $DISTRO --rpc-url "$RPC"      # must print 0x — #22, the second place this is checked
```

Then the send, with the table and the delay as § 0 variables added for this step. Their M05 values —
the 60/40 table — are M05's to fill; this document carries them as variables, and § Rehearsed on
anvil marks its own values as the rehearsal's placeholders.

```sh
export DNZN_DELAY=<uint32 seconds>
export DNZN_DESCRIPTION="<string>"
export DNZN_TABLE='[(<address>,<bps>,"<name>","<note>"),(…)]'   # see the two rules below

cast send $FACTORY \
  'create(address,uint32,string,(address,uint96,string,string)[],bytes32)' \
  $OWNER $DNZN_DELAY "$DNZN_DESCRIPTION" "$DNZN_TABLE" $DNZN_SALT \
  --rpc-url "$RPC" --unlocked --from <address>    # or: --account <keystore> --from <address>

cast call $DISTRO "owner()(address)" --rpc-url "$RPC"    # must equal OWNER
cast call $DISTRO "delay()(uint32)" --rpc-url "$RPC"     # must equal DNZN_DELAY
```

**`cast send` takes `--from` where `forge script` takes `--sender`.** `$SIGNER` as § 0 defines it is
a `forge script` spelling and `cast send` rejects `--sender` outright, so this is the one step that
writes its signer flags out rather than reusing the variable. A paste of `$SIGNER` here fails with
`unexpected argument '--sender' found`.

**Two rules on the table, both enforced by `_set` with the same error.** `BadTable()` —
selector `0x40da0647`, which is what a revert here decodes to — covers both: the `bps` must sum to
exactly 10,000, **and the rows must be sorted strictly ascending by `account`** (`b.account <= prev`
reverts, so duplicates fail too). A correct table in the wrong order is rejected, and the error does
not say which rule was broken. There is a maximum of 107 rows (`MAX_BENEFICIARIES`).

The salt's top 20 bytes must be the sending key's own address or the call reverts with
`SaltDoesNotStartWith` (`0x0c4549ef`) — open salts are refused (decision 10), which is what stops
anyone else putting a different table at this address on a chain DNZN has not reached yet.

**Losing the creator key is unrecoverable.** Under decision 10 that key is part of this
distribution's address on every chain: ownership can be transferred per chain, but no other sender
can ever place a distribution at this address on a chain that does not already have one. So the
`create` is done **once per chain in § 1's table while the key is live**, not on demand years later,
and the key is backed up to the handbook's standard for an owner key **before step 6 runs anywhere**
([#23](https://github.com/dnznlabs/rake/issues/23)).

`record:` `DNZN_SALT`, `DISTRO`, the transaction hash, `gasUsed`, and the `owner()` read.

### Step 7 — stop

The factory, its implementation and `App` are at their predicted addresses, the document is on
chain, and DNZN's distribution is at the address this document predicted before the first
transaction. **`App` is still owned and still unlocked.** Nothing closes; § Not in this runbook is
the authority for the rest.

Fill in anything still blank in § Record before closing the session.

## Record

Filled in as the steps execute, not reconstructed afterwards. One table per chain. A row with a
blank transaction hash is a step that did not run.

| | Step | What | Value |
|--:|:--|:--|:--|
| | 1a | commit · forge version · node version | |
| | 1b | files compiled · tests passed · snapshot | |
| | 1c | proxy bytes · proxy keccak | |
| | 1e | factory runtime bytes · `cast estimate` | |
| | 1f | `FACTORY` predicted · `APP` predicted · both init-code hashes | |
| | § 1 | native-balance token check: result · source | |
| 1 | 2 | `DistributionFactory` CREATE2 | tx: · gas: · addr: |
| | 2 | `implementation()` | `IMPL`: |
| 2 | 3 | `App` CREATE2 | tx: · gas: · addr: |
| | 3 | `owner()` · `version()` · `locked()` | · · false |
| 3 | 4 | `addChunk` ×N · `setChunks` | tx: · gas: · pointers: |
| 4 | 4 | widget chunks | tx: · gas: · pointers: |
| | 4 | `inflated sha256` · `widget sha256` · both byte counts | |
| 5 | 5 | explorer: factory / implementation / App | |
| 6 | 6 | DNZN `create` | tx: · gas: · `DNZN_SALT`: · `DISTRO`: |
| | 6 | `owner()` on `DISTRO` | |

## Rehearsed on anvil

Steps 1, 2, 3, 6 and 7 were run start to finish on **two anvils at once** — `--chain-id 31337` on
port 8555 and `--chain-id 31338` on port 8556 — at commit `2a7f485`, forge `1.7.1-dev`, node
`v24.12.0`, on 2026-11-01. Both chains used the same `FACTORY_SALT` and `APP_SALT` (zero), the same
`APP_VERSION` (`v0.1`), and the same `OWNER`: anvil's first account
`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, standing in for the Ops vault, which also stands in
for the DNZN Creator key until [#90](https://github.com/dnznlabs/rake/issues/90) names it. So
`DNZN_SALT` was `0xf39f…2266` + `000000000000000000000001`, its top 20 bytes the signing account's
as decision 10 requires.

**Neither anvil needed `anvil_setCode`.** Both carried the proxy at its canonical address in
genesis: 69 bytes, keccak `0x2fa86add…f7e4989`, identical to all eight chains in § 1.

**The four addresses are identical on both chains, and the factory's was predicted before any
transaction was sent:**

| | value | 31337 | 31338 |
|:--|:--|:--|:--|
| `FACTORY` predicted offline (step 1f) | `0x550f3bE16E83388a73BFE09B05D6c4fED2Dcb66a` | — | — |
| `FACTORY` landed | `0x550f3bE16E83388a73BFE09B05D6c4fED2Dcb66a` | equal | equal |
| `IMPL` via `implementation()` | `0xB083aE8539E71D74679BFcFb0A0D9F45549359a9` | equal | equal |
| `APP` predicted, and landed | `0x9fFEe2c1C0c79C81DFCc4E9e3A1007407D39E2A1` | equal | equal |
| `predict($DNZN_SALT)` | `0x55410930023a7019AF4960f5Dbb1891DB9A53472` | equal | equal |
| `DISTRO` the create landed | `0x55410930023a7019AF4960f5Dbb1891DB9A53472` | equal to `predict` | equal to `predict` |

Both deploys were recorded `transactionType: "CREATE2"` with `to` the proxy
`0x4e59b448…0b4956c`, and both broadcast logs carry `commit: 2a7f485` — the commit above, read
rather than assumed. The clone's runtime on both chains is the 45-byte PUSH0 proxy
`0x5f5f365f5f37365f73b083ae8539e71d74679bfcfb0a0d9f45549359a95af43d5f5f3e6029573d5ffd5b3d5ff3`,
carrying `IMPL` inside it exactly as `docs/REFERENCE.md:110-116` documents. The implementation's
deployed code is 8,729 bytes on both.

| step | 31337 | 31338 |
|:--|:--|:--|
| factory tx | `0x2df5664b…ce661973` | `0xff90f12b…d02a19f5` |
| factory gas | 2,262,485 | 2,262,485 |
| `App` tx | `0x566e4a63…27c58cdc` | `0x45c05b93…7289f045` |
| `App` gas | 1,648,295 | 1,648,295 |
| `create` tx | `0x…446d9` run, gas 280,281 | `0x28ab844c…34224f4c`, gas 280,437 |
| `App` `owner()` / `version()` / `locked()` | `0xf39F…2266` · `v0.1` · `false` | same |
| `DISTRO` `owner()` / `delay()` | `0xf39F…2266` · 3600 | same |

The two `create` gas figures differ by 156 because the two runs passed descriptions of different
lengths; the description is not an input to the address, so the `DISTRO` equality above is
unaffected. `cast estimate --create` on the factory's init code read **2,258,236** on both chains.

**Step 1g's collision check was exercised in both directions.** On a fresh chain `cast code` at the
predicted factory, `App` and `DISTRO` all printed `0x`. Re-running the create on 31337 after it had
landed found 45 bytes at `predict($DNZN_SALT)` and **did not resend**, which is the #22 path the
step exists for.

**Step 4 was not rehearsed.** It is blocked on a defect outside this task's scope — see
`docs/milestones/m03/tasks/m03-t06/HANDOFF.md` § Deviations. Step 5 is named and not run by design.
