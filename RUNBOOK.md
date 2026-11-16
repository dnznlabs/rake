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
export FACTORY_SALT=0xc7b08946793948e2cb78adf914cfa19ac8341e52b8a7a96ab26034fe6c476693  # mined, decision 37
export APP_SALT=0xd9ad8a57dc1d24c639881670feb590b06bb437e8c698f3e9fc53d5920c04b7ef      # mined, decision 37
export CREATOR=0x68e0741D8d693e14BF56914567eADdC130b186eE  # DNZN Creator, decision 32
export ENGINEER=0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d # Elanik's key, an Ops owner since 2026-11-16 (§ Step 4)
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

**The salts are mined.** [#115](https://github.com/dnznlabs/rake/issues/115) was ruled for vanity
mining (**decision 37**, amended 2026-11-07 with the prefixes: `0x00d1…` for `DistributionFactory`,
`0x00a9…` for `App`), and both were mined once, in
[m03-t10](docs/milestones/m03/tasks/m03-t10/TASK.md), against the init-code hashes step 1f computes:
`0xd8a1208ac79c66d94c864e7620534dd0f923bf0f7518d25ae87a7f619bc31cc5` for the factory and
`0x0b2894a38c541f156e2be856b7469993004331006a2ba9c66fa4d040f7b9864a` for `App`. **A salt is tied to
the bytes it was mined against**: any later `src/` byte is a new factory address and a new mining
run (decision 5 — a new version is a new factory anyway), and because `OWNER` and `APP_VERSION` are
inside `App`'s hash, `APP_SALT` holds only for the Ops vault and `v0.1`. Step 1f recomputes both
addresses from these variables on every chain; it never copies them.

**`CREATOR` is named** (decision 32; [#90](https://github.com/dnznlabs/rake/issues/90) closed at M03
close-out): `0x68e0741D8d693e14BF56914567eADdC130b186eE`, and the salt's low 12 bytes are `…0001`,
so **DNZN's distribution is `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`** on every chain where the
factory is at the § 0 address — `predict($DNZN_SALT)` answered that on two anvils at close-out
(`docs/milestones/m03/CLOSEOUT.md` criterion 6), and step 6 recomputes it on each chain rather than
copying it from here. The rehearsal in § Rehearsed on anvil predates the key and uses the signing
account for it, and says so. The creator key's two conditions — salted creates only, and never an owner or a signer for anything
else — are the handbook's, in `docs/multisig-transactions.md` § The DNZN Creator key, and are
referenced rather than restated so there is one copy of them.

**Setting the creator key up for `cast`** is the handbook's too: `docs/multisig-transactions.md`
§ Setting the key up for `cast` covers `cast wallet import dnzn-creator --interactive`, verifying
the address, and backing up the key itself before step 6 runs anywhere. Done, step 6's `SIGNER` is
`--account dnzn-creator --sender <address>`.

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
the table a second time. **The requirement is that the chain carries no alias through which value
can move**, and it is checked and recorded per chain before the first deploy on that chain. A chain
that fails is **not a runbook variable**: it is a contract change and a new version (decision 5),
and the deploy does not proceed on it.

The wording is deliberate: F12's loss needs an alias that both *reads* the native balance and can
*move* value. An alias that reads it while every mutator reverts cannot reach the loss, and under
the architect's ruling on [#127](https://github.com/dnznlabs/rake/issues/127) (2026-11-01) that is a
pass with the measurement as its source — see OP Mainnet below. That ruling carries no decision
number and is recorded on the issue itself; decision 38 is a different ruling (D15, `App.lock`). The
residual is that any caller can book un-releasable phantom credits into `escrowed[alias][*]` and
emit misleading `Escrowed`/`Distributed` events; `reserved[address(0)]` is untouched, so no native
wei is at risk and the caller pays the gas.

The check, per chain, against a probe address whose native balance is non-zero — a comparison that
cannot tell "equal" from "empty" is not a check:

```sh
ALIAS=<candidate token address>
P=<any address with a non-zero native balance on this chain>
cast balance $P --rpc-url "$RPC"                                   # must be non-zero: the denominator
cast code $ALIAS --rpc-url "$RPC"                                  # 0x means the alias does not exist here
cast call $ALIAS "balanceOf(address)(uint256)" $P --rpc-url "$RPC"  # must NOT equal the balance above

# Only where $ALIAS has code and its balanceOf DID equal the balance: the alias must not be movable.
# This must REVERT. A success is a movable alias, and the chain fails the check.
cast call $ALIAS 'transfer(address,uint256)(bool)' $P 1 --from $P --rpc-url "$RPC"
```

The `transfer` assertion is re-run per chain **before each deploy**, not once: it is the only thing
standing between "the alias cannot move value" and a future upgrade that re-enables it, and the
check is a one-way door on eight chains.

Read 2026-11-01 at the commit in § Record, four known alias families probed on each chain
(OP `LegacyERC20ETH`, Celo `GoldToken`, Polygon's `0x…1010`, `0x…0001`) — 32 alias-chain checks,
one hit. The method was validated against Celo mainnet, where the same commands **do** fire on
`GoldToken` `0x471EcE3750Da237f93B8E339c536989b8978a438` (2,585 bytes, `balanceOf` equal to the
native balance), so a clean row below means the check ran and missed, not that it failed to run.

| chain | native-balance / double-entry-point token | source checked |
|:------|:------------------------------------------|:---------------|
| Ethereum | none — no alias has code; ETH is only ever wrapped, and WETH holds its own balance | measured, all four aliases `0x` |
| OP Mainnet | **`LegacyERC20ETH` `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` is live on the read side** — 3,671 bytes, `name()` "Ether", `symbol()` "ETH", `balanceOf(x)` equal to x's native balance. **Every stateful method reverts** (`transfer`, `transferFrom`, `approve` — all "disabled"), so no value can move through it. **Passes: ruled on [#127](https://github.com/dnznlabs/rake/issues/127) on 2026-11-01**, because the requirement is no alias through which value *can move* and nothing moves through this one. The `transfer` assertion above is what keeps that true, and it is re-run before each deploy to chain 10. | measured at block 158,979,851: `balanceOf(0x4200…0016)` and `cast balance` both `92688343257757826764769`, and `transfer(…,1)` reverts `LegacyERC20ETH: transfer is disabled`. Code size is **3,671 bytes** — `cast code` returns 7,344 characters including the `0x`, so a figure of 3,672 is that string halved. Corroborated by the [OP Stack spec § Predeploys](https://specs.optimism.io/protocol/predeploys.html#legacyerc20eth): LegacyERC20ETH is **Deprecated**, "All of the stateful methods in this contract will revert after the Bedrock upgrade" |
| Base | none — post-Bedrock OP Stack chain, so the legacy alias was never deployed | measured, `0x` at the legacy address |
| Arbitrum One | none — no native-balance ERC-20; the Arbitrum precompiles are not tokens | measured, all four aliases `0x` |
| MegaETH | none | measured, all four aliases `0x` |
| Robinhood Chain | none | measured, all four aliases `0x` |
| Sepolia | none | measured, all four aliases `0x` |
| Base Sepolia | none — post-Bedrock OP Stack chain | measured, `0x` at the legacy address |

Re-run the three commands above on any chain added to this table, and on any chain whose row is
older than its last network upgrade. A new predeploy is a new reading.

## 2 — the steps

**Every step's `record:` line is committed before the next transaction is sent.** Not at the end of
the chain, not at the end of the session: a step that sent something is written down and committed —
and pushed, if a remote is reachable — before the next `forge script` or `cast send` runs. The
broadcast logs of a real network are part of that commit; `.gitignore` keeps only the dev-chain ones
out (`!/broadcast`, then `31337/`, `31338/` and `dry-run/`), precisely so this rule has something to
commit.

The reason is not tidiness. These transactions are public and permanent and there is no redeploy, so
the chain is authoritative and the only question a later reader has is *what was already sent*. A run
that dies between sending and recording leaves that question unanswerable from the repository: the
addresses are taken, the gas is spent, and nothing on disk says so. Worse, the pre-send readings a
killed run never wrote down are **not recoverable afterwards** in any form that can stand in for
them — archive state may answer what the chain held at that block, but a reading taken after the
send is not the gate that was supposed to precede it, and no honest record can present it as one
(m04-t03 § Gates names which of its Sepolia gates went unrecorded this way).

So the commit is the step's receipt. If the run is killed, the tree still says what it spent.

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

`make slither` is the same hazard with a louder mechanism: it runs `forge clean` and then
`forge build --build-info --skip ./test/** ./scripts/forge/** --force`, so it leaves `out/` with no
test or script artifacts at all. Run it after this step — M04 reads its exit code here — and then
**`forge build --force` again** before quoting any test count or running any `forge script`.

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
cast estimate --rpc-url "$RPC" --create "$AINIT"   # the App init code of 1f, same reason
```

The call must return the factory's **1,320-byte** runtime. The constructor runs
`new Distribution`, whose bytecode is cancun/PUSH0, so a success here is the EVM check of § 1 —
executed, not read off a feature list. Record the estimate; it is the gas figure for this chain.

**The estimate is a per-chain reading and `forge script` does not take it.** `forge script` sizes its
gas limit from its *own* simulation, which runs under `foundry.toml`'s cancun rules and so prices
creation the same on every chain: it printed `Estimated total gas used for script: 3287625` for
`Deploy.s.sol` on Sepolia and on Base Sepolia alike, where this `cast estimate` — which asks the node
— read **16,730,843** and **2,395,343** respectively (2026-11-08). Sepolia charges roughly 7× cancun
for this init code and Base Sepolia does not, so one simulated figure cannot cover both chains.
On Sepolia that gap is what made the first step-2 attempt fail: `0xf80fc26d…534b7c29`, gas limit
3,287,625, **status 0 after burning 2,833,494 gas** (m04-t03). So, before step 2 on any chain:

```sh
cast block latest --rpc-url "$RPC" --field gasLimit   # the estimate must fit in a block
```

Compare the node's estimate with the `Estimated total gas used for script` the dry run prints. If the
node's figure is the larger, the broadcast needs the limit raised explicitly rather than forge's — and
a step-2 or step-3 transaction that fails for gas is **safe** (it creates nothing and is not a
collision: #22's one-way door closes only on a *successful* create), but it is not free, so read the
estimate rather than discovering it. `record:` both estimates and the block gas limit.

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

`0x` at both: proceed to step 2.

Code at either address means **something is already there**, and there are two cases. Do not resend
in either one: a second CREATE2 through the proxy is a collision, and a collision consumes every unit
of gas forwarded to it before anything can revert. Which case it is decides whether this chain is
done or stopped, so **identify it before doing anything else**:

```sh
# Is it ours? The runtime must match the artifact, and the contract must answer step 3's reads.
cast code $FACTORY --rpc-url "$RPC" | tr -d '\n' | wc -c                    # 2,642 chars = 1,320 bytes
cast call $FACTORY "implementation()(address)" --rpc-url "$RPC"             # must be a contract, see below
cast code $APP --rpc-url "$RPC" | tr -d '\n' | wc -c                        # must equal the artifact's length
cmp <(cast code $APP --rpc-url "$RPC" | tr -d '\n') <(forge inspect App deployedBytecode | tr -d '\n')
cast call $APP "owner()(address)" --rpc-url "$RPC"                          # must be $OWNER
cast call $APP "version()(string)" --rpc-url "$RPC"                         # must be $APP_VERSION
cast call $APP "locked()(bool)" --rpc-url "$RPC"                            # must be false
```

- **Already deployed by us — record and skip.** The factory's runtime is the artifact's outside its
  three `immutableReferences` spans (the comparison step 2 writes out), `implementation()` reads back
  a contract whose address equals the one every other chain reports, and `App`'s runtime is `cmp`-equal
  to `forge inspect App deployedBytecode` with `owner()`, `version()` and `locked()` the § 0 values.
  Then CREATE2 did what it is for and this chain simply already carries *this* deploy. **Fill this
  chain's `record:` rows from the chain** — the transaction hashes and `gasUsed` with `cast receipt`,
  which needs the hashes: take them from the committed broadcast logs if the run that sent them got
  that far, otherwise from the explorer by address, and say in the handoff which. Commit that record,
  then go to step 4. This is the branch a killed or resumed run lands in, and m04-t03 is the precedent:
  Sepolia's steps 2 and 3 were already on chain when the recovery began, and recording them was the
  whole of the work left.
- **Stop — collision.** Anything else: a length that disagrees, a `cmp` that differs, a read that
  reverts or answers a value that is not § 0's, or code at the predicted `DISTRO` before step 6. The
  address is taken by bytes that are not ours, and this is #22's one-way door. Message the architect
  with the address, the code length and the readings; do not send, do not "try the other salt", and do
  not improvise a new salt — a new address is decision 37's mining run and a ruling, not a step here.

**The check is only as good as the chain it ran against.** `../shared/.envrc.local` exports
`ETH_RPC_URL`, which `cast` takes as its default, and in m04-t03 it pointed at **mainnet** — where a
historical `cast code` at these addresses returns a cheerful `0x` that looks exactly like a passing
gate. Hence every command here carries an explicit `--rpc-url "$RPC"`, and if there is any doubt,
`cast chain-id --rpc-url "$RPC"` must print `$CHAIN_ID` before the readings are believed.

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

`record:` the transaction hash, `gasUsed`, `FACTORY`, `IMPL`. **The hash and the `gasUsed` come from
`cast receipt`**, never from `run-latest.json` (#140); the broadcast log is read only by
`make dapp-nodev`, for the factory's block, where its one-creation shape makes it safe.

**The runtime, compared to the artifact.** The factory carries `IMPL` in three immutables, so it is
not byte-equal to `forge inspect DistributionFactory deployedBytecode` — it must be equal
*everywhere else*. `forge inspect` has no `immutableReferences` field in 1.7.1-dev (its `<FIELD>`
list does not offer one), so the spans are read from the build artifact:

```sh
cast code $FACTORY --rpc-url "$RPC" | tr -d '\n' > /tmp/fac.onchain
forge inspect DistributionFactory deployedBytecode | tr -d '\n' > /tmp/fac.artifact
jq -r '.deployedBytecode.immutableReferences' out/Distribution.sol/DistributionFactory.json
```

Both files must be the same length; every differing byte must fall inside a declared span, and each
span must hold `IMPL` left-padded to 32 bytes. `record:` the byte count, the number of differing
bytes, and that **none** of them is outside the spans. `App` takes no immutables, so its runtime is
compared with a plain `cmp` against `forge inspect App deployedBytecode` and must be equal outright.

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

### Step 4 — the document, via the Ops vault

The bundle that ships, then the chunks, then the comparison that proves the chain serves the bytes
that were built. **No command here sends a transaction to `App`**: its chunk setters are `onlyOwner`
and the owner is the Ops vault, so the upload is a vault action (decision 44,
[#178](https://github.com/dnznlabs/rake/issues/178)) — **three proposals per chain** since
2026-11-16 (decision 47; one `batch` proposal before that, which the coordination service's
proposal-size cap refused, [#188](https://github.com/dnznlabs/rake/issues/188)). It moves between
two roles, and neither holds the other's authority:

- **The engineer** (Elanik) builds the bytes, proposes them to the vault with her own signature — one
  signature per proposal, three per chain — and verifies the result. One signature is not a quorum, so
  proposing moves nothing.
- **The product owner** (Denizen) reviews the proposal against this repository and adds the second
  signature. That signature is the only thing that makes the upload happen.

**Precondition: the engineer is an Ops owner on the chain.** Ops is 2-of-*n* with a 3,600 s delay, so
the engineer's signature plus one of the product owner's is the threshold. Read it before 4a, and
re-read `nonce()` there — the vault's internal counter, not `cast nonce $OWNER`, which is the
account nonce and would put every digest one off:

```sh
cast call $OWNER "isOwner(address)(bool)" $ENGINEER --rpc-url "$RPC"  # must be true
cast call $OWNER "threshold()(uint16)" --rpc-url "$RPC"                 # 2
cast call $OWNER "nonce()(uint32)" --rpc-url "$RPC"                     # the proposal's nonce
cast nonce $APP --rpc-url "$RPC"                                        # must be 1: the pointers assume it
```

#### 4a — the engineer proposes

```sh
make dapp-nodev CHAIN_ID=$CHAIN_ID
node tools/step4-calldata.mjs --chain $CHAIN_ID    # rewrites calldata/$CHAIN_ID/; git diff must be empty
```

`dapp-nodev`, never `dapp`: a dev bundle on chain reads through its `?rpc=` override and never
reaches a wallet (`mk/30-onchain.mk`). The calldata is committed under
`docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/`, so a non-empty `git diff` is a stale
proposal and stops here.

The upload is **three proposals, in nonce order**, all value `0`. ~~The proposal is **one
transaction**: target `$OWNER`, data `calldata/$CHAIN_ID/batch.hex`, nonce the live `nonce()`.~~
That single `batch` over all five calls is 109,962 hex characters, and the coordination service that
carries proposals to the signers caps a proposal's calldata at **65,536 characters** (32,768 bytes; the
request body at 72 KiB), enforced identically by the dapp — measured live on 2026-11-16 with a paired
control, recorded on [#188](https://github.com/dnznlabs/rake/issues/188). It cannot be proposed.
Ruled 2026-11-16 (decision 47):

| proposal | file | target | value | nonce | size, hex chars (cap 65,536, measured 2026-11-16) | calldata bytes |
|--:|:--|:--|--:|:--|--:|--:|
| 1 | `1-addChunk-0.hex` — `addChunk(bytes)`, document chunk 0 | `$APP` — a plain call | `0` | *N* | 48,138 | 24,068 |
| 2 | `2-addChunk-1.hex` — `addChunk(bytes)`, document chunk 1 | `$APP` — a plain call | `0` | *N* + 1 | 42,890 | 21,444 |
| 3 | `batch345.hex` — the vault's `batch(address[],uint256[],bytes[])` over calls 3, 4, 5 | `$OWNER` — the vault itself, **not** `App` | `0` | *N* + 2 | 18,314 | 9,156 |

*N* is the live `nonce()` read above (3 on both chains, read 2026-11-16 16:04Z); the sizes are
`wc -c` of the committed files on both chains the same day, `0x` included, and the bytes are
`(chars − 2) / 2`. The batch is the real `cast calldata batch(...)` encoding, identical on both
chains; the deleted `batch.hex` was 109,962 characters, **44,426 over the cap**. Each proposal carries its
own digest, `getTransactionHash(<target>, 0, <file>, <nonce>)` on the vault, with the proposal's own
target: `$APP` for 1 and 2, `$OWNER` for 3.

`batch345.hex` keeps the setters atomic with the widget chunk: calls 4 and 5 validate their pointers
through `_requireChunk` (§ The five calls), so the widget pointer is created and consumed inside one
transaction, and the two setters either both land or neither does. That works only because the
widget chunk is the **third** CREATE: `addWidgetChunk` inside the batch deploys at `App` nonce 3, the
address `5-setWidgetChunks.hex` names, and that is where the nonce stands only after proposals 1 and
2 have each executed once, in that order (4c's gates). The document pointers are created by
proposals 1 and 2, which is why the batch executes last and why 1 precedes 2 (4c). `batch` is
`onlySelf`, so the vault is its target and it calls `App` as its owner.

The engineer signs each digest and proposes through the dapp's API — handbook
`docs/multisig-transactions.md` § Doing it as an agent, steps 1–3, three times: `getTransactionHash`
as above, `cast wallet sign --no-hash`, `POST /proposals`. Each description names this step, the
chain, the proposal's number of three and the commit the calldata was generated at; it is not signed
and proves nothing, which is why 4b does not read it.

`record:` the three nonces and digests, and the commit the files were generated at.

#### 4b — the product owner reviews and signs

In the multisig dapp, open each of the three proposals — handbook § Doing it as a human, *Sign* —
and before signing it, against a checkout of the commit 4a recorded. **Proposals 1 and 2** (the plain
`addChunk` calls):

1. **The target is `App` and the value is 0.** `$APP`, not the vault; a proposal whose target is the
   vault is proposal 3 or not this upload.
2. **The data is the committed file.** `sha256sum` of the proposal's data equals
   `sha256sum calldata/$CHAIN_ID/1-addChunk-0.hex` (proposal 1) or `…/2-addChunk-1.hex` (proposal
   2), and the file regenerates byte-identically (4a's `git diff`).
3. **It decodes to one `addChunk(bytes)`.** `cast decode-calldata "addChunk(bytes)" $(cat <file>)`
   gives one `bytes` argument, whose `sha256` is the handoff's figure for that chunk.
4. **The nonce is the live one** for proposal 1 and the live one plus one for proposal 2, and the
   digest equals `getTransactionHash($APP, 0, <file>, <nonce>)` on the vault.

**Proposal 3** (`batch345.hex`):

1. **The target is the vault and the value is 0.** `$OWNER`, not `App`.
2. **The data is the committed file.** `sha256sum` of the proposal's data equals
   `sha256sum calldata/$CHAIN_ID/batch345.hex`, and that file regenerates byte-identically.
3. **It decodes to calls 3, 4 and 5 in order.** `cast decode-calldata
   "batch(address[],uint256[],bytes[])" $(cat batch345.hex)` gives three targets, all `$APP`, three
   values, all `0`, and three `bytes` equal to `3-addWidgetChunk.hex`, `4-setChunks.hex`,
   `5-setWidgetChunks.hex` in that order.
4. **The nonce is the live one plus two** and the digest equals `getTransactionHash($OWNER, 0,
   batch345.hex, <nonce>)` on the vault.

`batch` is a vault self-call, which the handbook's review checklist marks high risk; confirm it
outside the chat that requested it. Then sign. With two signatures a proposal is at threshold. Sign
all three before submitting any (4c): a gap in the nonce sequence stalls the ones behind it.

#### 4c — submit, wait, execute

1. **Submit all three** (either signer), back to back, in nonce order: 1, then 2, then the batch. Each
   `execute()` checks the signatures, consumes its nonce and **queues** the call at
   `eta = block.timestamp + delay()` — nothing reaches `App` yet. Here the vault does enforce the
   order: `execute` hashes against `nonce++` (`src/Multisig.sol:136` of src-company/multisig at
   `62eb905`), so proposal 2's signatures, made over the digest at *N* + 1, are `InvalidSig` while the
   nonce is still *N*. Submit 2 before 1 and it is refused; nothing is lost but the gas.
2. **Wait one hour, not three.** Each submit queues its digest at its own
   `eta = block.timestamp + _delay` (`:165-166`), and the three submits are seconds apart, so the
   three 3,600 s windows run **concurrently**: one wait of 3,600 s from the third submit, then three
   `executeQueued` in a row. "Three timelocks" is the natural misreading and it is wrong; the delay
   is per proposal, not cumulative.
3. **`executeQueued()` three times** (anyone), **in the order 1 → 2 → batch**, each after the one
   before it has succeeded. **The vault does not enforce this order; the operator does.** `queued` is
   keyed by digest, not by nonce (`mapping(bytes32 txHash => uint256) public queued;`, `:29`), and
   `executeQueued(target, value, data, _nonce)` (`:187`) checks only
   `require(eta != 0 && (msg.sender == address(this) || block.timestamp >= eta), NotReady(eta));`
   (`:192`) — any queued, matured digest runs when asked, whatever its nonce and whatever is still
   queued ahead of it. The three calls are therefore sent by one person, one at a time, waiting for
   each receipt, in the order 1, 2, batch. What each misorder does, from the source:
   - **The batch before 1 or 2 reverts and stays queued.** Call 4, `setChunks`, validates both
     document pointers through `_requireChunk` and reverts `CodelessChunk(ptr)` (`src/App.sol:125`,
     `:198-209`) on the one whose chunk has not landed; `batch` re-raises the inner revert
     (`Multisig.sol:212`), `executeQueued` re-raises that (`:195`), and the state change — `delete
     queued[hash]` — is rolled back with it, so the piece can be sent again after 1 and 2. The whole
     piece reverts: `addWidgetChunk` inside it does not land either.
   - **2 before 1 does not revert, and that is the worse case.** Both are plain `addChunk` calls that
     deploy a pointer at `App`'s next CREATE address; nothing in `addChunk` knows which chunk it is
     carrying. Executed 2 then 1, chunk 1 lands at the address call 4 names as pointer 0 and chunk 0
     at the address it names as pointer 1; `_requireChunk` checks only that each has code whose first
     byte is `0x00` (`src/App.sol:198-209`) — which chunk it is, it cannot tell — so the batch then
     succeeds and the page is served with its halves
     swapped. Nothing stops it until 4d's `inflated sha256` differs. The repair is a further vault
     proposal — a corrective `setChunks` with the two pointers in the right order — not a redeploy.
     So the order 1 → 2 is load-bearing in itself, not only relative to the batch.
   So each piece has a **gate, read from the chain before it is sent**. `App` starts at account nonce
   1 (the precondition above), and every `add*Chunk` is one CREATE, so the nonce counts the chunks
   that have landed and the predicted pointers (handoff § The pointers, identical on both chains) say
   where:

   | before sending | `cast nonce $APP` | `cast code <ptr>` non-empty at |
   |:--|--:|:--|
   | piece 1 | `1` | nothing yet — both document pointers print `0x` |
   | piece 2 | `2` | doc 0: `0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D` |
   | the batch | `3` | doc 0 as above **and** doc 1: `0xAf5f9504714D4D441E836ef626633553ccF730a0` |
   | (after the batch) | `4` | widget: `0xc39C7643cbfFE57114A1851Af499f1781c0daC8e` — step 4d's check |

   Neither the nonce nor a non-empty `cast code` is the gate against the swap: after piece 2
   executed first, the nonce reads `2` *and* the doc-0 pointer holds code — chunk 1's. Only the
   **contents** discriminate. Before piece 2, the code at the doc-0 pointer must equal `0x00`
   followed by chunk 0's bytes, which are the `bytes` argument of the committed call:

   ```sh
   CHUNK0=$(cast calldata-decode "addChunk(bytes)" "$(cat calldata/$CHAIN_ID/1-addChunk-0.hex)")
   [ "$(cast code 0x0f8132D41Ea16c4536565cb2910EF801c2e35D0D --rpc-url "$RPC")" = "0x00${CHUNK0#0x}" ] && echo chunk0-in-place
   ```

   (`SSTORE2.write` stores a `0x00` STOP byte then the data, `lib/solady/src/utils/SSTORE2.sol:52`,
   so an SSTORE2 pointer's runtime code is exactly that.) The same comparison for the doc-1 pointer
   against `2-addChunk-1.hex` before the batch. The nonce and code-presence rows above are the
   cheap pre-checks; the content equality is what proves the order held. Any other reading is a
   stop and a message to the architect, not a retry.

   Each `executeQueued` is the transaction that runs its call and pays for it, so **set each gas limit
   by hand** — three figures per chain, § Gas. A wallet's own estimate through a public RPC reports a
   false `DeploymentFailed()`. Running out of gas reverts that one call and leaves it queued, so it
   can be sent again with more; the ones already executed stay executed.

**The one silent misorder, and its repair.** The pointer predictions depend on execution *order*,
not on the proposals: `App`'s CREATE address is a function of its nonce, and `addChunk` records
whatever lands at it. Every out-of-order permutation of the three pieces but one reverts
`CodelessChunk` and leaves the piece queued. The one that does not is **piece 2 before piece 1**:
doc 1 lands at nonce 1 (the predicted doc-0 address), doc 0 at nonce 2, both hold valid SSTORE2
chunks, `_requireChunk` (`src/App.sol:198-209`) checks `extcodesize != 0` and a `0x00` first byte and
nothing about contents, so the batch's `setChunks` passes and `App` serves the document with its two
gzip chunks swapped — no revert anywhere, caught only by 4d's `inflated sha256`. `executeQueued`
imposes no order (above). The repair is **one corrective `setChunks` proposal** with the two pointers
in the right order, through 4a–4c again at the then-live nonce; no chunk is re-uploaded, since both
are on chain and the list is the only thing wrong. The gates above exist so the repair is never
needed.

`TimelockExecutor.forward()` skips the delay but needs **every** owner's signature, not the
threshold, and nothing here is in a hurry; it is not this runbook's route.

#### 4d — the engineer verifies

```sh
make dapp-nodev CHAIN_ID=$CHAIN_ID                 # the bundle this chain's calldata was cut from
node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID
sha256sum app/dist/index.html app/dist/widget.js
```

The equality to check is the one `docs/milestones/m03/tasks/m03-t03/HANDOFF.md` § Criterion 8 shows —
`inflated sha256` equals `sha256sum app/dist/index.html`, `widget sha256` equals
`sha256sum app/dist/widget.js`, and the byte counts match both ways. Rebuild for this chain first:
`index.html` carries `__CHAIN_ID__`, so a bundle built for the other testnet hashes differently.
`record:` the chunk pointers, `inflated sha256`, `widget sha256`, both byte counts, and the three
submit and three `executeQueued` transaction hashes.

**`make deploy` is not used on a public chain.** Its later recipes run `Seed.s.sol`,
`Fixtures.s.sol` and a dev build, all of which are dev-chain only (decision 29).

**`scripts/forge/Chunks.s.sol` is dev-chain only.** It broadcasts from one key, and on a dev chain
that key is both signer and owner, so it works there and reverts `Unauthorized` on every public
chain. It stays for `make deploy`; it is never the public-chain route. That collapse is also why no
rehearsal caught this — a dev chain cannot tell the two roles apart.

#### The five calls, and their order

`tools/step4-calldata.mjs` writes them to `docs/milestones/m04/tasks/m04-t08/calldata/$CHAIN_ID/`,
splitting `app/dist/index.html.gz` at `MAX_CHUNK = 24_000` bytes exactly as `Chunks.s.sol:_upload`
does, and wraps calls 3–5 into `batch345.hex`. They are committed, so what the product owner signs is
reviewable before it is signed and re-derivable after:

| # | call | file | proposed as |
|--:|:--|:--|:--|
| 1 | `addChunk(bytes)` — document chunk 0 | `1-addChunk-0.hex` | proposal 1, plain, target `$APP` |
| 2 | `addChunk(bytes)` — document chunk 1 | `2-addChunk-1.hex` | proposal 2, plain, target `$APP` |
| 3 | `addWidgetChunk(bytes)` | `3-addWidgetChunk.hex` | proposal 3, element 1 of `batch345.hex` |
| 4 | `setChunks(address[],bool)` — the two document pointers, `true` | `4-setChunks.hex` | proposal 3, element 2 |
| 5 | `setWidgetChunks(address[])` — the widget pointer | `5-setWidgetChunks.hex` | proposal 3, element 3 |
| 3–5 | the vault's `batch(address[],uint256[],bytes[])` over the three above, all `$APP`, all `0` | `batch345.hex` | proposal 3, target `$OWNER` |

**`batch.hex` — the one `batch` over all five — is deleted, not kept.** It was the route of
2026-11-15 (#191) and could not be proposed: 109,962 hex characters against the service's 65,536 cap
(4a, [#188](https://github.com/dnznlabs/rake/issues/188)). The record of that route is this
paragraph, decision 47 and #188; a second `batch*.hex` beside the live one is one more file to
mistake for it, and the 4b checklist names exactly one batch file. The tool no longer writes it, so
a regenerated directory with `batch.hex` still in it is a stale checkout.

**Calls 1–3 must have executed before calls 4 and 5.** The setters take their pointers from calldata
and validate each through `_requireChunk`, which reverts `CodelessChunk(ptr)` on an address with no
code (`src/App.sol:125`, `:147`, `:198-209`). `cast estimate` on call 4 against a chain where calls
1–3 have not landed reverts `0xef9230eb` naming the first pointer. The three proposals satisfy this
by executing in nonce order (4c): 1 and 2 create the document pointers, and `batch345` creates the
widget pointer and runs both setters in array order inside one transaction. Five separate proposals
would also work, executed strictly in order, but the setters would no longer be atomic with the chunk
they name (decision 47, rejected).

**The pointers are `App`'s own CREATE addresses and are identical on every chain**, because `App` is
at one address everywhere (decision 35) and at account nonce 1 before step 4. So calls 3, 4 and 5 are
**byte-identical across chains, and so is `batch345.hex`** (one `sha256`, `7946270a…`, on both
chains at `61322ca`); only calls 1 and 2 differ, because `index.html` carries `__CHAIN_ID__`. The
digest is not identical across chains even where the calldata is: `getTransactionHash` binds the
chain, so a Sepolia signature cannot be replayed on Base Sepolia.

#### Gas

Per-call figures come from `cast estimate --from $OWNER $APP $(cat <file>)` against the node — the
vault as sender, which `eth_estimateGas` does not sign-check — never from a broadcast log, which
files hashes under the wrong transaction. On Sepolia on 2026-11-15 calls 1–3 estimated **37,859,277**,
**33,740,257** and **13,140,215**; on Base Sepolia **5,343,761**, **4,767,004** and **1,883,560**;
the setters are tens of thousands (71,317 and 42,719 estimated on a fork). Each `executeQueued`
carries its call plus the queue bookkeeping, and the third adds the batch's loop; that overhead is
**unmeasured** on a real-priced chain. Set each gas limit to its estimate plus a margin of about a
third, rather than quoting a measured figure — **three limits per chain**, all **estimates**:

| `executeQueued` | Sepolia estimate | **set to** | Base Sepolia estimate | **set to** |
|:--|--:|--:|--:|--:|
| proposal 1 — call 1 | 37,859,277 | **50,000,000** | 5,343,761 | **7,000,000** |
| proposal 2 — call 2 | 33,740,257 | **44,000,000** | 4,767,004 | **6,200,000** |
| proposal 3 — `batch345` | **derived** ≈13.17M — the whole-batch estimate less calls 1 and 2, consistent with `addWidgetChunk` 13,140,215 plus the setters (sum 13,254,251, loop excluded) | **18,000,000** | **derived** ≈2.08M — the 2026-11-16 whole-batch estimate of 12,188,581 less calls 1 and 2, consistent with `addWidgetChunk` 1,883,560 plus the setters | **2,800,000** |
| block `gasLimit` | 200,000,000 | | 120,000,000 | |

**These three limits replace the single 110,000,000 of the one-`batch` route**, which was set by
budget because its ~85M total could not be estimated through a public RPC. Each of the three is set
from a per-call figure the node did return (≈38M, ≈34M and ≈13M on Sepolia; Base Sepolia from the
handoff's figures), with the margin above, and the question that route carried — whether 110M clears
the block limit and leaves headroom — goes away: the largest limit is a quarter of Sepolia's block
and under 6% of Base Sepolia's. **`batch345` cannot be estimated from the node before the upload**:
`cast estimate --from $OWNER $OWNER $(cat batch345.hex)` reverts `CodelessChunk` on both chains
until proposals 1 and 2 have executed (measured 2026-11-16), because `setChunks` validates their
pointers. Its two figures are therefore a **derivation**, labelled so in the table, until the fork
rehearsal or the live read; the hand limit is the derivation plus margin. After the second
`executeQueued` the same command gives the live figure, and the limit is re-set from that one. The old
single-batch total (~85M on Sepolia, budgeted at 110M) was unmeasurable there, because public RPCs
cap `eth_call` gas below it; a single `addChunk` is under that cap, so the per-proposal figures are.

The five-call batch was rehearsed on an anvil fork of Sepolia on 2026-11-15, impersonating the vault:
it executed, and `chain-doc` then read `inflated sha256` and `widget sha256` equal to `app/dist/`'s.
Anvil does not reproduce Sepolia's code-deposit pricing (11,896,347 gas there), so it proves the
bytes and the order, not the gas. The three-proposal split changes the transaction boundaries and
nothing about the bytes or their order, so that rehearsal still stands for both.

**`MAX_CHUNK = 24_000` is sized against one constraint and bound by three**
([#188](https://github.com/dnznlabs/rake/issues/188)). The constant is a byte budget, chosen
against the **24,576-byte code limit**. It has no **gas** term: Sepolia prices code deposit about 7×
(§ 1e), so a 24,000-byte chunk estimates ~37.9M gas there against ~5.3M on Base Sepolia, 19% of a 200M
block for one call, and a chain with a 30M block limit and Sepolia's pricing could not land it. And
it has no **proposal-size** term: the coordination service and the dapp refuse a proposal whose
calldata exceeds 65,536 hex characters (32,768 bytes), measured 2026-11-16; one `addChunk` of a
24,000-byte chunk is 48,138 characters, 73% of the cap, and anything above ~32,700 bytes per chunk
stops being proposable even as a plain call. That cap is what split the upload into three proposals
(4a). Sizing the constant against all three at once is #188's question for the milestone that next
touches the upload; this runbook does not change it.

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
the command's own exit code carries the result rather than a submission receipt. Here
`--constructor-args` takes **one** ABI-encoded value — `forge verify-contract --help` gives it as
`--constructor-args <ARGS>` — so its position among the flags does not matter, which is why the
`cast abi-encode` is quoted as a single argument. The variadic spelling is `forge create`'s
(`<ARGS>...`), where the flag must go last because it swallows anything after it; that command is
not used in this runbook — the hazard is that command's, not this one's.

**Run the three one at a time.** Etherscan's v2 API caps at 3 calls/sec per key and each
`verify-contract --watch` spends several, so back to back they fail the third with
`Response: NOTOK` / `Max calls per sec rate limit reached (3/sec)` — a key-side throttle, not a
verification failure. Re-running the one that tripped it succeeds. **No `--verifier-url` is needed
for Base Sepolia**: forge 1.7.1-dev's chain table resolves 84532 to Basescan through the same
Etherscan v2 key (measured 2026-11-08, all three contracts `Pass - Verified`).

A contract already verified reports `is already verified. Skipping verification.` and **exits 0**,
which is a pass for criterion 2 but is not a reading of *who* verified it: `getsourcecode` carries no
verification timestamp, so a re-run cannot distinguish a verification this run submitted from one that
already existed. Record which of the two each address was.

Then read each one back and record the `#code` URL:

```sh
curl -s "https://api.etherscan.io/v2/api?chainid=$CHAIN_ID&module=contract&action=getsourcecode\
&address=$FACTORY&apikey=$ETHERSCAN_API_KEY" | jq -r '.result[0].ContractName'
```

`record:` the three `#code` URLs and the `ContractName` each returns.

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
and the key is backed up to the org's standard for an owner key **before step 6 runs anywhere**
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
port 8555 and `--chain-id 31338` on port 8556 — at commit `d75b664`, forge `1.7.1-dev`, node
`v24.12.0`, on 2026-11-01. **Step 4 was rehearsed on the 31337 chain** (below); step 5 is named and
not run by design. **That rehearsal ran with zero salts**, before decision 37's prefixes were ruled;
the run that landed both contracts at the mined addresses of § 0 is m03-t10's, recorded in
[its handoff](docs/milestones/m03/tasks/m03-t10/HANDOFF.md) § Acceptance criteria. Both chains here
used the same `FACTORY_SALT` and `APP_SALT` (zero), the same
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
`0x4e59b448…0b4956c`, and both broadcast logs carry `commit: d75b664` — the commit above, read
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
| `create` tx | `0x90314d96…cdcbec00` | `0xd604f884…e1123260` |
| `create` gas | 280,281 | 280,281 |
| `App` `owner()` / `version()` / `locked()` | `0xf39F…2266` · `v0.1` · `false` | same |
| `DISTRO` `owner()` / `delay()` | `0xf39F…2266` · 3600 | same |

`cast estimate --create` on the factory's init code read **2,258,236** on both chains, and the
factory's returned runtime was **1,320 bytes** on both — the EVM check of § 1, executed rather than
read off a feature list.

**Step 1g's collision check was exercised in both directions.** Before the sends, `cast code` at
the predicted `FACTORY`, `APP` and `DISTRO` printed `0x` on both chains. Re-read on 31337 after the
run, the same three addresses carry 1,320, 7,118 and 45 bytes, so the step reports *this chain
already carries the deploy* and the operator does not resend — the #22 path it exists for, and the
reason the check is not decoration.

**Step 6's table and description are the rehearsal's placeholders**, named here so the figures are
reproducible: `DNZN_DELAY=3600`, `DNZN_DESCRIPTION="rehearsal placeholder"`, and a two-row
`DNZN_TABLE` of `0x3C44CdDd…4293BC` at 6,000 bps and `0x70997970…dc79C8` at 4,000 bps, both named
`A`/`B` with note `rehearsal placeholder` — sorted strictly ascending by account and summing to
10,000, as `BadTable()` requires. M05 fills the real 60/40 table. The `create` transaction hashes
above are this run's and move with those placeholder strings; the three addresses do not, because
the salt and the factory determine them.

### Step 4, rehearsed on 31337

Run on the 31337 chain only — the document is the same artifact on every chain, and uploading it
twice proves nothing the sha256 equality does not. `make dapp-nodev` first, never `make dapp`.

| what | value |
|:--|:--|
| bundle built | `dapp: raw 127,578 bytes · gzip 40,241 bytes · chain 31337`; `widget: raw 7,920 · budget 10,240 · 2,320 left` |
| unsubstituted `__NAME__` tokens in `app/dist/index.html` | **none** |
| document chunk pointers | `0x56C9358a2805F54287356317A3DD4CeB58F2489f` (**24,001** bytes on chain), `0x5B039B1D8a6bB94e6c860508e6967384A68f2902` (**16,242**) |
| widget chunk pointer | `0x2e25e351B14928fBE5FB735a07d6DCC1aB7Dbdec` (**7,921** bytes on chain) |
| `html()` payload read back | 54,333 bytes stored · `sha256 bee088a8…70ec129b`; payload 40,241 bytes |
| **`inflated sha256`** | `6b48db1aed7a9e7130c7b0cb89d11ba5fcf9389a03d120561ccc10dcafe71063` — **equals `sha256sum app/dist/index.html`** |
| **`widget sha256`** | `e45088fc647b806977931274d4bc99f9a027f71009f0d9af3584eb5ba18bf22b` — **equals `sha256sum app/dist/widget.js`** |
| byte counts, both ways | inflated 127,578 = `wc -c app/dist/index.html`; widget 7,920 = `wc -c app/dist/widget.js` |
| `App.locked()` after step 4 | `false`, and it stays false |

The pointer sizes are their own check: 24,001 + 16,242 = **40,243** = the 40,241-byte payload plus
SSTORE2's one leading `0x00` byte per pointer, and the widget's 7,921 is 7,920 + 1 the same way.

Step 4's five transactions, **read from the chain rather than from the broadcast log** — see the
handoff's § Discoveries for why that distinction is not pedantry:

| nonce | call | gas |
|--:|:--|--:|
| 3 | `addChunk(bytes)` | 5,300,226 |
| 4 | `addChunk(bytes)` | 3,603,200 |
| 5 | `setChunks(address[],bool)` | 62,555 |
| 6 | `addWidgetChunk(bytes)` | 1,819,075 |
| 7 | `setWidgetChunks(address[])` | 35,819 |
| | **total** | **10,820,875** |

**The dev stack runs end to end on a fresh anvil.** `make serve` brought up anvil on 8545, ran
`make deploy` to completion — four broadcast scripts (`Deploy`, `DeployApp`, `Seed`, `Chunks`), each
reporting `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`, plus `dapp-nodev` and `dapp` — and
`make addresses` then listed `DistributionFactory 0x550f3bE1…Dcb66a` (1,320 bytes of
code) and `App 0x9fFEe2c1…D39E2A1` (7,118 bytes), neither carrying the `no code … stale, redeploy`
note. `make chain-doc` exits 0 and its `inflated sha256` is the one above. Note that `make deploy`
rebuilds the **dev** bundle last, so `app/dist/index.html` afterwards is the dev build (128,047
bytes) and will not match the chain's hash — which is exactly why step 4 checks the equality
immediately after `dapp-nodev` and `chunks`, and why this document says `dapp-nodev`, never `dapp`.

## Executed on testnets

Steps 1, 2, 3 and 5 were executed on **Sepolia (11155111)** and then **Base Sepolia (84532)** in
m04-t03, with Elanik's agent wallet `0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d`. **Step 4 was not
run on either chain**, for two reasons in succession. First the architect held it until
[#172](https://github.com/dnznlabs/rake/issues/172) merged, because #172 changes the dapp bundle and
an upload before it would become a re-upload on both chains; that merged on 2026-11-08 at 21:46 CST
([#177](https://github.com/dnznlabs/rake/pull/177), `7681d35`). Then the harder reason: **step 4 as
written cannot be run by the engineer at all.** `App` takes its owner in the constructor and
`addChunk`, `setChunks`, `addWidgetChunk` and `setWidgetChunks` are `onlyOwner`; § 0 sets `OWNER` to
the Ops vault on every chain, and `APP_SALT` was mined against init code containing it, so the owner
is part of `App`'s address. `scripts/forge/Chunks.s.sol` broadcasts from the engineer's key, which is
not an Ops owner, so it reverts `Unauthorized` on any public chain. The only step-4 rehearsal used
the anvil account as both signer and owner, which is why no rehearsal caught it. This was **ruled on
2026-11-08 as decision 44** (M04-D4, [#178](https://github.com/dnznlabs/rake/issues/178)): step 4
becomes an Ops vault action, permanently, for every future upload including `lock()` and M05's mirror.
It is **five calls to `App` per chain** — `addChunk` ×2, `addWidgetChunk` ×1, then `setChunks` and
`setWidgetChunks`.

**Superseded 2026-11-15 — see the last paragraph of this block and § Step 4.** The two paragraphs
that follow are the plan as m04-t03 left it and are kept as its record.

**The route is the unanimous one.** All three Ops owners are Denizen's and he has confirmed he can
reach all three, so the five calls go through `TimelockExecutor.forward()` at **3-of-3**, executing
**immediately** — no queue and no wait. Write it this way first; it is the plan, not a fallback.

**The threshold route stays documented for the day a signer is unreachable.** With only `threshold()`
signatures the call goes through `Multisig.execute()`, which **queues** it at
`eta = block.timestamp + delay()`, and `executeQueued()` runs it after. All five can be queued
back-to-back so they share one hour rather than costing five. **Order matters on this route and on
the other**: both `addChunk` calls and the `addWidgetChunk` call must have *executed* before
`setChunks` and `setWidgetChunks`, because the setters validate their pointers through
`_requireChunk`, which reverts `CodelessChunk(ptr)` on a pointer with no code
(`src/App.sol:125`, `:147`, `:198-209`). Queueing a setter beside the adds it depends on is a
revert at execution, not at queue time.

**`forward()` is not a threshold route**, which is the trap worth stating once: it requires
`ownerCount()` signatures for everything except `cancelQueued`, plus `forwardEnabled`
(`src/mods/TimelockExecutor.sol:41-47` of src-company/multisig, identical at `62eb905` and
`cbfa345`), so a threshold signature set sent through it reverts `InvalidSig` on the
`sigs.length == required * 65` check.
Read on both chains 2026-11-08: Ops `ownerCount()` **3**, `threshold()` **2**, `delay()` **3600**,
`forwardEnabled(Ops)` **true**. #178 carries the mechanics and is the authority on them. So there are
**no bundle hashes in this section**, step 4's `record:` rows are blank on purpose, and criterion 3's
chain half is not claimed here. **§ Step 4 via the Ops vault is written by the step-4 preparation
task**, which was scoped after decision 44 and is recorded beside M04-D4; it is not this task's,
whose `TASK.md` still describes step 4 as a `forge script` the engineer runs.

**Step 4 is prepared and not yet executed, on either chain** (m04-t08, 2026-11-12). § Step 4 now
carries the vault procedure, `tools/step4-calldata.mjs` writes the five calldatas and they are
committed per chain, and the per-call estimates and digests are in that task's `HANDOFF.md`
§ For Denizen. The rows below stay blank until the upload executes. Criterion 3's chain half is
still open.

**The route changed on 2026-11-15, before anything was signed**: one `batch` proposal per chain
through the threshold route, proposed by the engineer and signed by the product owner (§ Step 4).
The product owner's signing app does not support Sepolia, so the unanimous route's three signatures
were not all reachable there; the engineer becomes an Ops owner instead, which makes her signature
plus one of the product owner's the 2-of-*n* threshold and puts the upload behind the vault's one-hour delay. The
five per-call files are unchanged; `batch.hex` is added beside them and carries them.

**And again on 2026-11-16, still before anything was signed**: three proposals per chain (§ Step 4,
4a). The single `batch.hex` was 109,962 hex characters and the coordination service caps a proposal
at 65,536 (#188), so step 7 stopped there; calls 1 and 2 go as plain proposals and calls 3–5 as
`batch345.hex`, executed in nonce order. `batch.hex` is deleted (§ The five calls).

Step 6 has not run on
either chain:
`cast code` at `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f` prints `0x` on both and the Creator key
is at **nonce 0** on both.

**Sepolia's steps 2 and 3 were sent by a run that was killed before it recorded anything**, at
09:44–09:51 CST on 2026-11-08 from commit `4b6f95b`. This section **records** those transactions; it
does not repeat them, and they were not re-sent — the addresses are taken and a second CREATE2 would
be the collision of #22. `git diff --stat 4b6f95b 308ca75 -- src/` prints nothing, so the bytecode on
Sepolia is `main`'s, and step 1f recomputed both init-code hashes and both addresses at `308ca75` to
prove it retroactively. **That chain's step 0 and step 1g gates were never recorded**, and no reading
taken now can replace them: a `cast code` run after the send is not the check that was meant to
precede it, whatever it returns. What each missing reading is worth afterwards differs, though, and
the difference is the lesson — **a historical read is only evidence if something independent can fail
when it is wrong**:

- **The pre-send `0x` code read cannot be recovered as a reading.** Its pass value is the *empty*
  answer, so it cannot self-validate: a wrong answer looks exactly like a right one. This is the
  `ETH_RPC_URL` hazard of § 1g again, one level deeper, and on its own it settles the matter. A
  historical `cast code` on `ethereum-sepolia-rpc.publicnode.com` is also only intermittently served,
  being load-balanced across archive and pruned backends — which makes **the positive control
  non-deterministic too**: `cast codesize` at the deploy block, where 1,320 bytes certainly exist,
  errored for the architect and returned the true 1320 on 4 of 5 attempts here. At the pre-send block,
  8 paired attempts gave the proxy's known 69 bytes 6 times and `historical state … is not available`
  twice. The refusal is always explicit — a pruned backend errors rather than fabricating, and was
  never observed returning a false `0x` — but a control you cannot reproduce on demand is not a
  control, and a lone `0x` carries no evidence about which backend answered it. **Treat such a reading
  as lost.**
- **The emptiness those reads were checking for is nevertheless proven, by the chain rather than by
  an RPC.** Both CREATE2s **succeeded**, at exactly the addresses step 1f predicted, with runtime
  matching the artifacts — and a CREATE2 onto an address that already holds code **fails**.
  Demonstrated on anvil at m04-t03: the same salt and init code through the proxy gave status 1 and a
  10-byte runtime onto an empty address, then `execution reverted` at gas estimation when repeated
  onto the now-occupied one. So the success of the deploy *is* the collision check, after the fact and
  unconditionally. This is why **#22's one-way door closes only on a successful create** — and it is
  stronger evidence than the gate would have produced.
- **The balance at send time is recoverable**, because it has an independent control the code read
  lacks: it reconciles against the receipts. `gasUsed × effectiveGasPrice` over the three
  transactions is **31,130,197,802,436 wei**, and the pre-send balance minus that equals the recorded
  post-send balance **to the wei**. A wrong figure from a pruned backend would not balance. That
  control earned its keep at m04-t03: it caught an assumed `effectiveGasPrice` of 1,000,019 on the
  failed attempt where the receipt says 1,000,020, an error of exactly one wei per gas.

What is left genuinely and permanently lost is **whether those checks were run at all** — which is
the thing the § 2 preamble's commit rule exists to stop losing, and no reading of any quality can
supply it. m04-t03's handoff § Gates records the split above.

The toolchain for every row: forge `1.7.1-dev`, node `v24.12.0`, solc `0.8.34`, `make slither`
exit **0** with 0 results. `forge test` **102 passed**, `node --test` **90 passed**,
`forge snapshot --check` exit 0, `forge build --force` 41 files with **0** `warning[` and **0**
`Warning (`.

### § Record — Sepolia (11155111)

| | Step | What | Value |
|--:|:--|:--|:--|
| | 1a | commit · forge · node | `4b6f95b` sent, re-proved at `308ca75` · 1.7.1-dev · v24.12.0 |
| | 1b | files compiled · tests · snapshot | 41 · 102 forge / 90 node · exit 0 |
| | 1c | proxy bytes · keccak | 69 (141 chars) · `0x2fa86add…f7e4989`, equal to § 1 |
| | 1e | factory runtime bytes · `cast estimate` | 1,320 · **16,730,843** (factory), 16,712,775 (App); block gas limit 36,000,000 |
| | 1f | `FACTORY` · `APP` · init-code hashes | `0x00D18B5b…DBCDe71B` · `0x00A90943…6995BaE` · `0xd8a1208a…bc31cc5` and `0x0b2894a3…f7b9864a`, both equal to § 0 |
| | § 1 | native-balance token check | **none** — all four aliases `cast code` `0x`; probe balance 104,863,387,533,085,144 wei non-zero; re-read 2026-11-08 |
| 1 | 2 | `DistributionFactory` CREATE2 | tx: `0xa2d02cfbf870e63d9d236bafff9844a8ba66f4b9137dc5eb3aca524d868350de` · gas: **16,789,404** · addr: `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` · block 12,091,537 |
| | 2 | `implementation()` | `IMPL`: `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` (9,271 bytes) |
| 2 | 3 | `App` CREATE2 | tx: `0x6f8d868f381a5b0cda7fd6c397fc63d581ab08593e57d6eb1a318cd13275ad14` · gas: **11,506,694** · addr: `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` · block 12,091,543 |
| | 3 | `owner()` · `version()` · `locked()` | `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` · `v0.1` · false |
| 3 | 4 | `addChunk` ×N · `setChunks` | **not run — blocked on M04-D4 (#178)** |
| 4 | 4 | widget chunks | **not run — blocked on M04-D4 (#178)** |
| | 4 | `inflated sha256` · `widget sha256` · byte counts | **not run — blocked on M04-D4 (#178)** |
| 5 | 5 | explorer: factory / implementation / App | all three `Pass`, names `DistributionFactory` / `Distribution` / `App`; URLs below |
| 6 | 6 | DNZN `create` | not run — Denizen's; `predict($DNZN_SALT)` = `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`, `cast code` `0x` |
| | 6 | `owner()` on `DISTRO` | not run |

One extra transaction belongs to this chain's record: **`0xf80fc26d6c99b686147c834eb35f8a19fdb2c39ede03d9aaa7c65e3e534b7c29`,
nonce 1, gas limit 3,287,625, status 0, 2,833,494 gas burned, block 12,091,513** — a first step-2
attempt that failed on gas, for the reason step 1e now writes down. It created nothing, so it is not
a collision and the successful send that followed it is not a resend.

### § Record — Base Sepolia (84532)

| | Step | What | Value |
|--:|:--|:--|:--|
| | 1a | commit · forge · node | `e604b29` · 1.7.1-dev · v24.12.0 |
| | 1b | files compiled · tests · snapshot | 41 · 102 forge / 90 node · exit 0 |
| | 1c | proxy bytes · keccak | 69 (141 chars) · `0x2fa86add…f7e4989`, equal to § 1 |
| | 1e | factory runtime bytes · `cast estimate` | 1,320 · **2,395,343** (factory), 1,666,249 (App); block gas limit 120,000,000 |
| | 1f | `FACTORY` · `APP` · init-code hashes | identical to Sepolia's row — the same-address property, recomputed not copied |
| | § 1 | native-balance token check | **none** — post-Bedrock OP Stack; all four aliases `0x`; probe balance 10,000,000,000,000,000 wei non-zero; read 2026-11-08 |
| 1 | 2 | `DistributionFactory` CREATE2 | tx: `0xda05cbb975cf7477dcdac70b654361d8c1f0c94099e0eca708aa460dde2abf52` · gas: **2,380,182** · addr: `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` · block 56,161,390 |
| | 2 | `implementation()` | `IMPL`: `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` (9,271 bytes) |
| 2 | 3 | `App` CREATE2 | tx: `0xce1bdad0a3907098277ce40fe412aac1ac56b4bde62879349e4fc67886130e52` · gas: **1,655,660** · addr: `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` · block 56,161,508 |
| | 3 | `owner()` · `version()` · `locked()` | `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` · `v0.1` · false |
| 3 | 4 | `addChunk` ×N · `setChunks` | **not run — blocked on M04-D4 (#178)** |
| 4 | 4 | widget chunks | **not run — blocked on M04-D4 (#178)** |
| | 4 | `inflated sha256` · `widget sha256` · byte counts | **not run — blocked on M04-D4 (#178)** |
| 5 | 5 | explorer: factory / implementation / App | all three `Pass - Verified` this run; URLs below |
| 6 | 6 | DNZN `create` | not run — Denizen's; `predict($DNZN_SALT)` = `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`, `cast code` `0x` |
| | 6 | `owner()` on `DISTRO` | not run |

### The runtime, compared to the artifact

Identical on both chains. The factory is **1,320 bytes**, with **60** bytes differing from
`forge inspect DistributionFactory deployedBytecode` and **none of the 60 outside** the three
declared `immutableReferences` spans — offsets **275, 865 and 940**, 32 bytes each, every one holding
`0x…31dd18b4c3ece3f123c285bdb045331364cfa4b0`, the implementation. `App` is **7,155 bytes** and `cmp`
against `forge inspect App deployedBytecode` reports **equal, byte for byte**, on both chains.

### Base fees and what the chains charged

| | Sepolia | Base Sepolia |
|:--|:--|:--|
| base fee at step 2's block | 19 wei | 0.005 gwei (5,000,000 wei) |
| base fee at step 3's block | 20 wei | 0.005 gwei |
| `effectiveGasPrice` paid | 1,000,019 / 1,000,020 wei | 6,000,000 wei both |
| step 2 + step 3 gas | 28,296,098 | 4,035,842 |
| spent by the signer | 0.000031130197802436 ETH (includes the failed attempt) | 0.000024215052017478 ETH |
| signer balance after | 0.104863387533085144 ETH, nonce 4 | 0.009975784947982522 ETH, nonce 2 |
| Creator key balance, read 2026-11-08 | 0.010000000000000000 ETH, nonce 0 | 0.010000000000000000 ETH, nonce 0 |

Both chains sat far under the 20 gwei stop of step 0. **Sepolia charged roughly 7× what cancun does
for the same init code** (16,789,404 against anvil's 2,262,485, and 11,506,694 against 1,648,295)
while Base Sepolia charged about 1.05× (2,380,182 and 1,655,660) — the per-chain creation pricing
step 1e now reads from the node rather than from a simulation. **M05 must re-read it per mainnet; the
anvil figures in § Rehearsed on anvil are a floor, not a budget.** Base Sepolia's 0.01 ETH was
exactly at step 0's gate and proved ample at this base fee, as step 0 asks to be said.

### Explorer verification

Six of six `forge verify-contract … --watch` exited 0 and six `getsourcecode` reads name the
contracts. On Sepolia the factory and the implementation reported `is already verified` rather than
being submitted by this run — most likely verified by the killed run between 09:51 and 09:56, which
`getsourcecode` carries no timestamp to confirm; `App` was submitted and verified here. All three on
Base Sepolia were submitted and verified here.

| contract | Sepolia | Base Sepolia |
|:--|:--|:--|
| `DistributionFactory` | [`#code`](https://sepolia.etherscan.io/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B#code) | [`#code`](https://sepolia.basescan.org/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B#code) |
| `Distribution` (implementation) | [`#code`](https://sepolia.etherscan.io/address/0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0#code) | [`#code`](https://sepolia.basescan.org/address/0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0#code) |
| `App` | [`#code`](https://sepolia.etherscan.io/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE#code) | [`#code`](https://sepolia.basescan.org/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE#code) |

Every one reports solc `v0.8.34+commit.80d5c536`, optimizer on.

### Step 6 is Denizen's

**Step 6 was not run on either chain and is not this document's to run here**: the DNZN Creator key
is Denizen's and never lives on the engineer's host. Its two values are
**decision 42's** — `DNZN_DELAY=86400` and the three-row `DNZN_TABLE` of Treasury 1,000 bps, Ops
3,000 and `0x357836fF…902B` 6,000, in `_set`'s ascending address order, with
`DNZN_DESCRIPTION="DNZN // FEE DISTRIBUTION"`. m04-t03's handoff § For Denizen — step 6 carries the
complete command per chain, and that exact table string was rehearsed on anvil first: it parsed,
`DISTRO` landed at the `predict` address `0x633e24C2320B8d86A2A36aB659b64850e5aC6148`,
`owner()` the Ops vault and `delay()` 86400.
