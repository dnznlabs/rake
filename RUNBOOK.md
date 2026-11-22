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

## Which run is this

Two different jobs live in this file and they share almost nothing. Decide which one you are doing
before reading further, because Run B is most of the traffic and reading Run A's steps for it is how
an upload ends up re-deploying contracts that are already live.

| Run | When | Sections |
|:--|:--|:--|
| **A — the contracts** | first deploy to a chain, or any change under `src/` (new bytes are new addresses, so decision 37's salt mining repeats; the old addresses stay live and are marked superseded in [README](README.md#contracts) § Contracts) | § 0, § 1, steps 1–7, § Record |
| **B — the document** | `app/` changed and `src/` did not: the page, the widget, the featured salt | § 0's Run-B variables, Step 4, § Uploads |

**Under Run A, which of steps 2 and 3 run is decided by which contracts' bytes changed.** The factory
and `App` are placed by separate salted `CREATE2`s against their own init code, so their addresses
move independently: a change under `src/App.sol` alone moves `App` and leaves the factory where it
is, and step 2 is then skipped rather than repeated. Step 1f recomputes both addresses either way, and
disagreeing with the live ones is the signal that a mining run is owed.

**Run B needs nothing from this file but § 0's Run-B variables and Step 4.** It sends no transaction
from the engineer's key at all: `App`'s chunk setters are `onlyOwner` and the owner is the Ops vault,
so a document upload is three vault proposals the Product Owner co-signs (decisions 44 and 47). If
you are here because the page changed, go to Step 4.

## 0 — variables

Every command below is parameterised by these and nothing else, and nothing below hard-codes a value
that belongs here.

```sh
export RPC=<full https URL>          # every command passes --rpc-url "$RPC"
export CHAIN_ID=<from § 1's table>
export SIGNER="--account <keystore> --password-file <file> --sender <address>"   # forge script only
export SENDER="--account <keystore> --password-file <file> --from <address>"     # cast send, forge create
export OWNER=0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790    # the Ops vault: App's owner, and the owner passed to create
export APP_VERSION=v0.1
export FACTORY_SALT=0xf83d35cef117466f8f7d514b6413fda46f290e45d72f4d985312f746ce6e4193  # mined, decision 37
export APP_SALT=0x87cdf85b31cb82e688a11bbb8cf4c0249648f7dc2e5bec932424960920ead3f2      # mined, decision 37
export CREATOR=0x68e0741D8d693e14BF56914567eADdC130b186eE  # DNZN Creator, decision 32
export ENGINEER=0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d # Elanik's key, an Ops owner since 2026-11-16 (§ Step 4)
export DNZN_SALT=${CREATOR}000000000000000000000001        # top 20 bytes CREATOR (decision 10), low 12 bytes 1
# step 6's values — read from the chain and the decisions, never typed from memory
export DNZN_DESCRIPTION="DNZN // FUND DISTRIBUTION"
export DNZN_TABLE='[(0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9,2000,"treasury","long-term growth, future projects"),(0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790,4000,"ops","infrastructure, services, tokens"),(0x357836fFcB45307FA7ff2A574F505753c961902B,4000,"creator","founding engineer, product vision")]'
export DNZN_DELAY=604800        # mainnets, decision 50; 86400 on the two testnets, decision 42
# filled in by step 1, never by hand
export PROXY=0x4e59b44847b379578588920cA78FbF26c0B4956C FACTORY= IMPL= APP= DISTRO=
```

**Step 6's three values are read, not remembered.** The description and the table are the live
Sepolia distribution's, read on 2026-11-19 with
`cast call 0x71a4221974Fc2E95081AE513248918dF27CF7a4A 'snapshot()(…)'` and `description()` against
that chain, and they match decision 50's record of the three names and notes and decision 51's
string. The table is already sorted strictly ascending by account and its `bps` sum to 10,000, which
is what `BadTable()` checks. `OWNER` above is the owner step 6 passes (decision 50) and the sender is
the Creator key on every chain, testnets included (**decision 54**), with `$SENDER`.

**Two signer variables because the two commands spell it differently, and one rejects the other's
spelling outright** ([#251](https://github.com/dnznlabs/rake/issues/251)). On the pinned toolchain
(forge `1.7.1-dev`, measured 2026-11-19) `forge script --help` offers `--sender` and no `--from`,
while `cast send --help` and `forge create --help` offer `--from` and **no `--sender`** — handed one
they stop before sending with `error: unexpected argument '--sender' found`. So **`$SIGNER` is for
`forge script` and nothing else** (steps 2 and 3), and **`$SENDER` is for `cast send` and
`forge create`** (step 6). `cast wallet sign` takes `--account` with neither. On an anvil the
keystore flags become `--unlocked` plus the account flag the command accepts: `--sender` for
`forge script`, `--from` for `cast send`.

**Run B needs five of these and no salts.** A document upload touches no address that mining decides,
so the mined salts, `PROXY`, `FACTORY_SALT`, `APP_SALT`, `CREATOR` and `DNZN_SALT` are all Run A's.
Run B's list, complete:

```sh
export RPC=<full https URL>          # every command passes --rpc-url "$RPC"
export CHAIN_ID=<from § 1's table>
export OWNER=0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790    # the Ops vault: App's owner
export ENGINEER=0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d # the proposing key, an Ops owner
export APP=<from README § Contracts>  # read, not predicted — Run B never mines or computes it
```

**`APP` is read from [README](README.md#contracts) § Contracts rather than predicted.** Run A derives
it from init code and salt; Run B is uploading to a contract that already exists, so deriving it again
only creates a way to upload to the wrong one. `SIGNER` is not in the list because Run B sends nothing
from the engineer's key: it proposes, and the Product Owner's signature is what moves anything.

**The base-fee stop, before every send on a chain where ETH costs money.** Read it first and compare
it to the chain's stop:

```sh
cast base-fee --rpc-url "$RPC"
```

**On Ethereum the stop is 1 gwei.** `MILESTONE.md:239-248` sizes the mainnet ask at 0.03 ETH for
Run A, Run B and step 6, and that covers them to about that price — at Sepolia's pricing, which the
§ 1 estimate table shows is the dearer reading; Ethereum prices code deposit well under it, so 1 gwei
is where a send waits rather than where it becomes unaffordable. On the L2s the stop is the figure the
deploy task's gate records, since their fees run three orders of magnitude below Ethereum's. **The
testnets have no stop** — their fees are wei, and a testnet send is never deferred for price.

A fee above the stop for days is not a reason to put a buffer in a hot key: it is a top-up and a
raised rule, by the Product Owner's word. The stop defers a send; it never silently widens the budget.

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
`0x00a9…` for `App`). Both were mined once in
[m03-t10](docs/milestones/m03/tasks/m03-t10/TASK.md) against the 0.8.34 bytes, and **mined again in
[m05-t01](docs/milestones/m05/tasks/m05-t01/TASK.md) against the 0.8.38 bytes `main` builds today** —
why the run repeated is `ROADMAP.md` § Decisions M05-D1 and
[#202](https://github.com/dnznlabs/rake/pull/202), not restated here. The salts above are the second
run's, against the init-code hashes step 1f computes:
`0x9778c35879aa3214905a41c9519ae6c704dc5d00333806ac56ed6e7fbd2d8945` for the factory and
`0xa8bbb83700d29d4b2e4b871c680f31165f42c0eb9234071a7948ce79f9fe33a3` for `App`. **A salt is tied to
the bytes it was mined against**: any later `src/` byte is a new factory address and a new mining
run (decision 5 — a new version is a new factory anyway), and because `OWNER` and `APP_VERSION` are
inside `App`'s hash, `APP_SALT` holds only for the Ops vault and `v0.1`. Step 1f recomputes both
addresses from these variables on every chain; it never copies them.

**`CREATOR` is named** (decision 32; [#90](https://github.com/dnznlabs/rake/issues/90) closed at M03
close-out): `0x68e0741D8d693e14BF56914567eADdC130b186eE`, and it is the sender of step 6 on every
chain, testnets included (**decision 54**). The salt's low 12 bytes are `…0001`, so **DNZN's
distribution is `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`** on every chain where the factory is at
the § 0 address — `predict($DNZN_SALT)` answered that on m05-t01's anvil on 2026-11-19, with the
factory at its § 0 address, and step 6 recomputes it on each chain rather than copying it from here.
Both rehearsals stand the signing account in for the creator key when they send the `create` — § 0's
real `DNZN_SALT` reverts `SaltDoesNotStartWith` from any other sender — so the address their `create`
lands is the rehearsal's, while `predict($DNZN_SALT)` above is this one; § Rehearsed on anvil says so
for its own run. The creator key's two conditions — salted creates only, and never an owner or a signer for anything
else — are the handbook's, in `docs/multisig-transactions.md` § The DNZN Creator key, and are
referenced rather than restated so there is one copy of them.

**Setting the creator key up for `cast`** is the handbook's too: `docs/multisig-transactions.md`
§ Setting the key up for `cast` covers `cast wallet import dnzn-creator --interactive`, verifying
the address, and backing up the key itself before step 6 runs anywhere. Done, step 6's `SENDER` is
`--account dnzn-creator --password-file <file> --from <address>` — step 6 is a `cast send`, so it
takes the `$SENDER` spelling of § 0 and not `$SIGNER`'s.

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

### What a chunk costs per chain, read keylessly

**All figures are `eth_estimateGas` estimates read 2026-11-19** through step 1e's instruments, no
key and no wei: `cast estimate --rpc-url "$RPC" --create "$INIT"` for the factory, and for the chunk
a synthetic SSTORE2-shaped init code — `0x00` plus 24,000 data bytes behind solady's 10-byte creation
prefix, built out of `calldata/11155111/1-addChunk-0.hex`. The second instrument needs no `App` on
the chain, which is what lets it run on the four mainnets before step 2; it reproduces the live
`addChunk` figure to under 1% (§ Uploads row 3's 37,760,229 on Sepolia against **37,435,995** here).

| chain | ID | factory `--create` | 24,000-byte chunk `--create` | block `gasLimit` | chunk ÷ limit | signing row |
|:--|--:|--:|--:|--:|--:|:--|
| Ethereum | 1 | 2,396,446 | 5,286,009 | 60,000,000 | 8.8% | yes |
| OP Mainnet | 10 | 2,396,446 | 5,286,009 | 40,000,000 | 13.2% | yes |
| Base | 8453 | 2,396,446 | 5,286,009 | 40,000,000 | 13.2% | yes |
| Arbitrum One | 42161 | 2,489,291 | 5,651,278 | 32,000,000 (documented; the RPC field is a placeholder) | 17.7% | yes |
| MegaETH | 4326 | 111,772,970 | 253,077,911 | 10,000,000,000 | 2.5% | yes |
| Robinhood Chain | 4663 | 2,396,446 | 5,286,009 | no documented cap found (the RPC field is a placeholder) | — | yes |
| Sepolia | 11155111 | 16,738,648 | 37,435,995 | 200,000,000 | 18.7% | yes |
| Base Sepolia | 84532 | 2,396,446 | 5,286,009 | 120,000,000 | 4.4% | yes |

**Arbitrum One and Robinhood Chain report `gasLimit` as `1125899906842624`** (2⁵⁰), a placeholder and
not a ceiling, because both are Arbitrum chains — Robinhood Chain is built on Arbitrum Dedicated
Blockchains, per its own docs. Arbitrum One's documented block gas limit is **32,000,000**
([chain parameters](https://docs.arbitrum.io/arbitrum-essentials/reference/chain-params), read
2026-11-19) and that is the figure the rule uses for it. Robinhood Chain publishes no equivalent
figure that could be found on 2026-11-19, so its ceiling is unread and its row is the estimate
alone; the sizing rule's re-evaluation before a cut on that chain is what covers it. It is a stretch
row, not an M05 acceptance chain.

**The `signing row` column is the coordination service's, not the signing app's** (step 10): one
`wallets` row per chain per vault, read 2026-11-19 for the Ops vault
`0x00c0e88778e3e3d17acaabc7550dec7ab61f3790`, which answered a row for **all eight** chain ids —
1, 10, 8453, 42161, 4326, 4663, 11155111 and 84532. Its `owner_count` read 3 on the four mainnets
and 4 on the testnets and MegaETH; that field is the service's cached figure and the chain is what
to believe. Whether the Product Owner's signing app lists each mainnet is his reading, not this
one, and a chain without a row or without the app is a runbook change first — never the unverified
on-chain `approve(digest, true)` route improvised on deploy day.

**The condition every row holds under, not only the date.** Each row holds while that chain prices
code deposit at the rate measured on the date stated. Two readings per chain over bodies of 6,001
and 24,001 bytes give the marginal cost directly: **217.978 gas per byte on Ethereum and 1,558.723
on Sepolia**, a ratio of **7.151** — a per-byte price, not a fixed overhead. The repricing is
[EIP-8037, State Creation Gas Cost Increase](https://eips.ethereum.org/EIPS/eip-8037) (Standards
Track Core, status **Last Call** on 2026-11-19): code deposit moves from 200 gas per byte to a
state-gas price of 1,530 per byte, metered in its own dimension. **Sepolia carries it; Ethereum, OP
Mainnet, Base, Base Sepolia and Robinhood Chain do not yet** — their rows are identical to the byte.
MegaETH prices it higher again, about 10,545 gas per byte, a third rate and its own reading.

**So the Sepolia row is read as the figure every other chain would show at Sepolia's rate**, and that
is what makes it worth keeping rather than dismissing as a testnet quirk. On Ethereum the same chunk
would be 37,435,995 ÷ 60,000,000 = **62.4%** of the block, over the rule's half, and the rule would
cut at **19,000 bytes** (29,640,000 gas, 49.4%) — which changes the piece count, the committed
`calldata/` and the proposal split.

**Ethereum prices code deposit as Base Sepolia does, not as Sepolia does**, which answers the
question `MILESTONE.md:231-233` left open — and the money question turns entirely on that. Ethereum's
base fee read **570,774,697 wei (0.5708 gwei)** on 2026-11-19, under § 0's 1 gwei stop. At that fee:

| at 0.5708 gwei | gas | ETH |
|:--|--:|--:|
| Run A on Ethereum, factory + `App` at Ethereum's rate | 4,792,892 | 0.00274 |
| three 24,000-byte pieces at **Ethereum's** rate | 15,858,027 | 0.00905 |
| the same three at **Sepolia's** rate | 112,307,985 | 0.06410 |
| Run B as measured on Sepolia (§ Uploads row 3) | 85,666,566 | 0.04890 |

So `MILESTONE.md:239-248`'s **0.03 ETH ask holds comfortably at Ethereum's rate and would not hold at
Sepolia's**: the ask is generous only while Ethereum stays off 8037. It is the deposit rate, not the
base fee alone, that decides whether the ask is enough — and a chain that adopts 8037 before its cut
needs the ask re-sized in the task that cuts it, beside the chunk size. The sizing rule those
ceilings feed is in § Gas, stated once.

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
(OP `LegacyERC20ETH` `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000`, Celo `GoldToken`
`0x471EcE3750Da237f93B8E339c536989b8978a438`, Polygon's `0x0000000000000000000000000000000000001010`,
and `0x0000000000000000000000000000000000000001` — written out in full 2026-11-22 so that nobody has
to infer them again) — 32 alias-chain checks,
one hit. The method was validated against Celo mainnet, where the same commands **do** fire on
`GoldToken` `0x471EcE3750Da237f93B8E339c536989b8978a438` (2,585 bytes, `balanceOf` equal to the
native balance), so a clean row below means the check ran and missed, not that it failed to run.

| chain | native-balance / double-entry-point token | source checked |
|:------|:------------------------------------------|:---------------|
| Ethereum | **the gate holds, read 2026-11-22 under #368's amended test.** No alias address on chain 1 is a token whose `balanceOf` answers an account's native balance, and none whose `transfer` moves it — which is the reading this row exists for (`SECURITY.md` F12). All four § 1 names, against a probe holding 25,093,601,299,726,950 wei: `LegacyERC20ETH` `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` **0 bytes**; `0x0000000000000000000000000000000000001010` **0**; `0x0000000000000000000000000000000000000001` **0**; and `0x471EcE3750Da237f93B8E339c536989b8978a438` **1,582 bytes** whose `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf` and `transfer` **all revert with empty data** — it is not Celo's `GoldToken`, which is 2,585 bytes there. **Control first:** on Celo mainnet the same call on `GoldToken` returns 457,156,951,045,076,936,137, exactly the probe's native balance, so the probe fires on the case it is looking for and a clean row here means the check ran and missed | code sizes and calls both read by the engineer and the architect **on 2026-11-22**, independently and on public endpoints. The two controls used different probe accounts: the engineer's was the token's own address on Celo (`0x471EcE37…a438`, 457,156,951,045,076,936,137 wei), the architect's three funded accounts including that one. **Re-read immediately before Ethereum's step 2.** ~~measured, all four aliases `0x`~~ — **superseded**: the 2026-11-01 reading, no longer true of `0x471EcE37…a438` |
| OP Mainnet | **`LegacyERC20ETH` `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` is live on the read side** — 3,671 bytes, `name()` "Ether", `symbol()` "ETH", `balanceOf(x)` equal to x's native balance. **Every stateful method reverts** (`transfer`, `transferFrom`, `approve` — all "disabled"), so no value can move through it. **Passes: ruled on [#127](https://github.com/dnznlabs/rake/issues/127) on 2026-11-01**, because the requirement is no alias through which value *can move* and nothing moves through this one. The `transfer` assertion above is what keeps that true, and it is re-run before each deploy to chain 10. | measured at block 158,979,851: `balanceOf(0x4200…0016)` and `cast balance` both `92688343257757826764769`, and `transfer(…,1)` reverts `LegacyERC20ETH: transfer is disabled`. Code size is **3,671 bytes** — `cast code` returns 7,344 characters including the `0x`, so a figure of 3,672 is that string halved. Corroborated by the [OP Stack spec § Predeploys](https://specs.optimism.io/protocol/predeploys.html#legacyerc20eth): LegacyERC20ETH is **Deprecated**, "All of the stateful methods in this contract will revert after the Bedrock upgrade" |
| Base | none — post-Bedrock OP Stack chain, so the legacy alias was never deployed | measured 2026-11-01, and **re-measured 2026-11-22 for m05-t02's step 6 against a probe holding 0.005 ETH**: `0x` at `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` and at `0x471EcE3750Da237f93B8E339c536989b8978a438`. The row reproduced, which is why Base was not gated by Ethereum's correction |
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

The call must return the factory's **1,319-byte** runtime. The constructor runs
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

**The rule, not a judgement** ([#308](https://github.com/dnznlabs/rake/issues/308)). Every figure
below is from m05-t01's handoff § Step 13, both chains:

- **`E`** is the node's own `cast estimate --rpc-url "$RPC" --create` for the init code being sent —
  `$INIT` for step 2, `$AINIT` for step 3 — read **on the day**, not carried from a previous run.
- **`P`** is the `Estimated total gas used for script` line of a dry run: the same `forge script`
  command *without* `--broadcast`.
- **`-g` multiplies forge's own per-transaction estimate, which is `P ÷ 1.3`, not `P`.** Two pairs
  measured: 3,482,636 ÷ 1.3 = 2,678,951 and 2,286,547 ÷ 1.3 = 1,758,883. Using `P` as the base
  silently asks for 1.3× more than intended.
- **Send 2 × `E`.** So `G = ceil(100 × 2 × E ÷ (P ÷ 1.3))` and the send is
  `forge script … --broadcast -g $G $SIGNER`.
- **Never below 1.3 × `E`.** The node's estimate was exceeded by the transaction itself on both
  Sepolia sends, by 58,514 and 99,321 gas.
- **The limit must be under half the chain's block `gasLimit`** (§ 1's table; Arbitrum One's
  documented 32,000,000). **If it is not, stop.**
- **A submission the node refuses — `-32003: gas limit too high`, as on Base Sepolia — sends nothing
  and burns nothing.** Recompute `G` for 1.5 × `E`, record the refusal, and resubmit **once**. A
  second refusal is a **stop**.
- **`cast run` on a failed hash is not a post-mortem instrument for gas** (handoff, Sepolia step 3).

A step-2 or step-3 transaction that fails for gas is **safe** — it creates nothing and is not a
collision, since #22's one-way door closes only on a *successful* create — but it is not free, so
read the estimate rather than discovering it. On Sepolia that gap is what made the first step-2
attempt fail. `record:` `E`, `P`, the computed `G`, and the block gas limit, per chain.

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
cast code $FACTORY --rpc-url "$RPC" | tr -d '\n' | wc -c                    # 2,640 chars = 1,319 bytes
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
cast nonce $APP --rpc-url "$RPC"   # must equal the --app-nonce the calldata was generated with
```

**On that last line.** `App`'s chunk pointers are its own `CREATE` addresses, so they are a function
of its account nonce, and the calldata is only valid for the nonce it was generated at. It read `1`
for the first upload onto a fresh `App` and has moved with every upload since — 4 before this one.
So the check is equality with the generating nonce, which § Uploads names per upload, **not** a
constant. `tools/step4-calldata.mjs` reads the nonce from the chain when given `--rpc` and refuses to
run with neither `--rpc` nor `--app-nonce` rather than defaulting, because a wrong nonce yields
calldata that is well-formed, byte-reproducible and points at the wrong three contracts.

#### 4a — the engineer proposes

```sh
devbox run -- make dapp-nodev CHAIN_ID=$CHAIN_ID
devbox run -- node tools/step4-calldata.mjs --chain $CHAIN_ID --app $APP --rpc "$RPC" --out calldata
```

**Cut from the tip of `main`, fetched in the same sitting, and from nothing else** (ruled by the
Product Owner on 2026-11-21: what is uploaded is `main` as it stands at the upload). The build reads
`app/` and the addresses under `broadcast/`, and no check below compares either to `main`: every one
compares the calldata to the *build*, so a well-formed upload cut from a branch or from a checkout a
day old passes all of them.

**And `main`'s `app/` does not move while an upload is in flight** (decision 71). From the Product
Owner's word on the preview until the last `executeQueued` of that upload on every chain it goes
to, nothing under `app/` reaches `main`. A commit there in that window makes the calldata, the fork
proof and the preview stale together, and the cut starts again.

```sh
git fetch origin && git status --porcelain | wc -l        # 0
git rev-parse HEAD origin/main                            # the same commit twice
```

`record:` that commit as the generating commit. **It has to still be `main` when the upload goes
out.** If a commit touching `app/` or `broadcast/` merges after the cut, the proposals describe a
document `main` no longer builds: they are not signed, or if signed are not submitted, and 4a is run
again at the new tip. Once 4c has submitted, the upload is what it is and the newer commit waits for
the next one, so nothing touching `app/` is merged between the cut and 4c's last `executeQueued`
unless the upload is meant to be redone.

**`--app $APP` is not optional, and `$APP` is § 0's — read from `README` § Contracts, never recalled**
([#311](https://github.com/dnznlabs/rake/issues/311)). The tool used to default the address, and the
default outlived the deployment it named: m05-t01 redeployed `App`, and on m05-t01c the whole upload
was generated and committed against the retired `0x00A90943…5BaE` before review caught it. Nothing in
the checks below could see it — every one of them compares the calldata to the *build*, and a
well-formed upload aimed at the wrong contract passes all of them, executes without a revert if that
contract is still vault-owned, and is first contradicted by § 4d's `chain-doc`, two sittings later.
The tool now exits 2 without `--app`, and with `--rpc` it refuses an address holding no code.

**So check the target, not only the bytes**, before proposing — the one check § 4a did not have:

```sh
cast codesize $APP --rpc-url "$RPC"                    # non-zero: the App exists on this chain
grep -o "App 0x[0-9a-fA-F]*" <<<"$(devbox run -- node tools/step4-calldata.mjs --chain $CHAIN_ID --app $APP --app-nonce $N --out /tmp/check)"
# and the proposal targets: 1 and 2 are plain calls to $APP, the batch targets $OWNER (§ 4a's table)
```

**And check the address set *inside* the document, which is a different question**
([#357](https://github.com/dnznlabs/rake/issues/357)). The target check above asks whether `App` is
real; this asks whether the page `App` would serve points at contracts that exist. `app/build.mjs`
substitutes `__DISTRIBUTIONFACTORY__`, `__APP__` and `__DISTRIBUTION__` from the committed
`broadcast/<Script>/<chain id>/run-latest.json` logs, so a build made while those logs are behind the
chain is well-formed, byte-reproducible, passes every check in this section **and serves a dapp
pointed at a retired factory** — which on m05-t01c it did, because the redeploy's logs were still on
an unmerged branch. The symptom is the featured panel going empty, because the featured distribution
is computed from the baked factory and implementation and nothing exists at the address a retired
factory yields:

```sh
CFG=$(grep -o "const CFG = {[^}]*}" app/dist/index.html)
FACTORY_IN=$(sed -E "s/.*factory: '([^']*)'.*/\1/" <<<"$CFG")
APP_IN=$(sed -E "s/.*app: '([^']*)'.*/\1/" <<<"$CFG")
IMPL_IN=$(sed -E "s/.*impl: '([^']*)'.*/\1/" <<<"$CFG")
SALT_IN=$(sed -E "s/.*featuredSalt: '([^']*)'.*/\1/" <<<"$CFG")

test "${APP_IN,,}" = "${APP,,}" || { echo "the document names another App than the one being uploaded to"; exit 1; }
for a in $FACTORY_IN $APP_IN $IMPL_IN; do
  cast codesize $a --rpc-url "$RPC"                    # three non-zero readings, or stop
done

# The featured distribution, the page's own computation (`app/src/index.html` predictLocal):
INIT=0x602d5f8160095f39f35f5f365f5f37365f73${IMPL_IN:2}5af43d5f5f3e6029573d5ffd5b3d5ff3
DISTRO_IN=$(cast create2 --deployer $FACTORY_IN --salt $SALT_IN --init-code-hash $(cast keccak $INIT) | tail -1)
cast codesize $DISTRO_IN --rpc-url "$RPC"              # non-zero: the panel will have something to show
cast call $FACTORY_IN "predict(bytes32)(address)" $SALT_IN --rpc-url "$RPC"   # must equal $DISTRO_IN
```

`record:` the three readings and `$DISTRO_IN`. The last two lines are the pair the page itself
compares before it will render the panel, so a disagreement here is the page's `featuredLie` state
ahead of time. **A zero in any of them is a stop, not a note:** the fix is to land the deployment's
`broadcast/` logs and rebuild, never to upload and correct afterwards — an upload spends three
proposals and a sitting.

**Which line does the work, measured rather than assumed.** Run against m05-t01c's two trees on
2026-11-21, both built under `devbox run` for chain 11155111:

| | the redeploy's logs | `main`'s logs, behind the chain |
|:--|:--|:--|
| `$APP_IN` equals `$APP` | yes | **no — prints the warning** |
| factory · `App` · impl `codesize` | 1,319 · 7,154 · 9,277 | 1,320 · 7,155 · 9,271 |
| `$DISTRO_IN` | `0xB611Ff19…5199`, `codesize` **45** | `0x6aC98EDA…3F9f`, `codesize` **0** |

So **the three `codesize` readings alone do not catch it** — a retired set is still deployed and still
answers with code, which is what made this defect survive review. The two lines that discriminate are
`$APP_IN` against `$APP` and `$DISTRO_IN`'s `codesize`. Keep all five anyway: the first three are what
tell a wrong *chain* from a wrong *generation*, and a build for the wrong chain reads zero on all
three.

`dapp-nodev`, never `dapp`: a dev bundle on chain reads through its `?rpc=` override and never
reaches a wallet (`mk/30-onchain.mk`). Routine uploads write **`calldata/$CHAIN_ID/`** at the
repository root, overwritten per upload, and are committed — git history is the archive, and § Uploads
names the generating commit and nonce per upload. (m04-t08's first upload kept its calldata under its
own task directory; that stays as that task's record.)

**Through `devbox run --`, and that is load-bearing rather than habit.** The gzip is produced by
`node`'s zlib, and zlib differs between node versions: this VM's `node v24.21.0` deflates the same
`index.html` to 45,624 bytes where the pinned `v24.12.0` gives 45,358
([#199](https://github.com/dnznlabs/rake/issues/199)). Outside devbox the tool therefore rewrites two
calldata files for a document that has not changed, which costs a full-gas re-upload of identical
bytes. **The regeneration criterion is `chain-doc`'s `inflated sha256` against the build under the
pin — not `sha256sum` of calldata on whatever `node` is on `PATH`.**

A non-empty `git status --porcelain` here is a stale proposal and stops the run — with one
expected exception: after an upload has executed, `App`'s nonce has moved, so re-running the command
above with `--rpc` regenerates *different* pointers by design. To reproduce a past upload's committed
calldata at any later head, pass the nonce § Uploads records for it instead:
`--app-nonce <n>` in place of `--rpc`.

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

**Three proposals whatever the document's size (amended 2026-11-21, m05-t01c step 6).** The table
above records a two-chunk document, which is the shape the committed calldata has. The rule, which
is what to follow when the count differs:

- **Proposals 1 and 2 are always document chunks 0 and 1**, plain calls to `$APP`, same file names.
- **Every document chunk after the second rides inside the batch**, ahead of `addWidgetChunk`, so
  the batch is `addChunk`…, `addWidgetChunk`, `setChunks`, `setWidgetChunks` — in that order, which
  is the order `App` must create the pointers in. The batch file is named for the call numbers it
  carries: `batch345.hex` for two document chunks, `batch3456.hex` for three.
- **The pointers follow call order from `cast nonce $APP`.** With three document chunks, chunk 2's
  pointer is the CREATE at *N* + 2 and the widget's at *N* + 3.
- **A fourth document chunk is a stop**, not a fourth proposal: it changes the proposal arithmetic
  and the gas per piece, so it is a plan question. `tools/step4-calldata.mjs` refuses it.
- Measured for the three-chunk document of m05-t01c, against `App`
  `0x00a9F390A6010d045e0d34856048DdD6910d25BA` at its nonce **4** on both testnets: proposals 1 and
  2 are 48,138 characters each and the batch is **22,474** against the 65,536 cap, 43,062 spare. The
  two-chunk batch it replaces was 19,018. A size quoted here means nothing without the `App` and the
  nonce it was cut for — the pointers are that contract's CREATE addresses.

`batch345.hex` keeps the setters atomic with the widget chunk: the setter calls validate their
pointers through `_requireChunk` (§ The five calls, and their order), so the widget pointer is created and
consumed inside one transaction, and the two setters either both land or neither does. That works
because the widget chunk is the **last** CREATE of the upload: `addWidgetChunk` inside the batch
deploys at the `App` nonce after the document's chunks, the address `*-setWidgetChunks.hex` names,
and that is where the nonce stands only after proposals 1 and 2 have each executed once, in that
order (4c's gates). The document pointers are created by
proposals 1 and 2, which is why the batch executes last and why 1 precedes 2 (4c). `batch` is
`onlySelf`, so the vault is its target and it calls `App` as its owner.

The engineer signs each digest and proposes it, three times, with no other document open:

```sh
DIGEST=$(cast call $OWNER 'getTransactionHash(address,uint256,bytes,uint32)(bytes32)' \
  <target> 0 "$(cat calldata/$CHAIN_ID/<file>)" <nonce> --rpc-url "$RPC")
SIG=$(cast wallet sign --no-hash --account <keystore> "$DIGEST")
cast wallet verify --address $ENGINEER --no-hash "$DIGEST" "$SIG"   # positional, not --signature
```

Then `POST https://multisig-proposals.onrender.com/proposals` with
`p_wallet_id`, `p_chain_id`, `p_nonce`, `p_target`, `p_value` (a string), `p_call_data`, `p_tx_hash`
(the digest), **`p_threshold`**, `p_proposed_by`, `p_description`, `p_signature` and
`p_sig_type: "ecdsa"`.

**`p_threshold` is required and is not optional-with-a-default**
([#196](https://github.com/dnznlabs/rake/issues/196)): without it the service answers
`400 Invalid proposal threshold` and stores nothing, so the retry is the same POST with the field
added. It must be at least the vault's on-chain `threshold()` and at most `ownerCount()`.

Each description names this step, the chain, the proposal's number of three and the commit the
calldata was generated at; it is not signed and proves nothing, which is why 4b does not read it.

**Verify by reading the proposals back, not by the POST's `200`.** Query
`tx_summary` with the signatures embedded — `?wallet_id=eq.<id>&status=in.(proposed,executing,queued)
&select=id,nonce,proposed_at,target,value,status,tx_hash,call_data,threshold,signatures(signer,sig_type)`
on `https://multisig-postgrest.onrender.com` — and check each row carries exactly one `ecdsa`
signature from `$ENGINEER`, `value` 0, the committed file's bytes and the digest just signed. The
`sig_count` column reads `0` for signed and unsigned proposals alike and must not be used; and a
proposal with no valid owner signature is **hidden** from every owner's dapp with no message, so an
empty vault page is not evidence of an empty queue.

**Identify the rows by nonce, and expect more of them than this upload proposed.** Earlier uploads'
rows linger in the service as `queued` or `stale` after the chain has consumed them — nothing deletes
them when `executeQueued` runs — so this filter returned **six rows per chain** today for three new
proposals. Match each row by its `nonce` against the three 4a just wrote; `proposed_at` is what lets a
reader tell a lingering row from the live one at the same glance. There is no `created_at` column —
asking for one answers `42703 column tx_summary.created_at does not exist` and the whole query fails.

**`<id>` is the `wallets` row's id, and three things about that table bite.** Look it up on the same
host with `wallets?address=eq.<vault>&chain_id=eq.$CHAIN_ID&select=id,address,chain_id,nonce,owner_count`.
The rows are **per chain**, so one vault deployed at the same address on two chains has two rows and
two different ids — the wrong one silently queries the wrong chain's proposals. The `address` column
is stored **lowercase**, so a checksummed `address=eq.0x00c0…` returns `[]`, which reads exactly like
an unregistered vault; lowercase the address before querying. And the `nonce` and `owner_count` those
rows carry **lag the chain** — they are the service's last-seen values, not live reads, so every nonce
and threshold precondition comes from `cast call` on the vault and never from here.

`record:` the three nonces and digests, the commit the files were generated at, and the `--app-nonce`
they were generated for.

#### 4b — the product owner reviews and signs

In the multisig dapp, open each of the three proposals — handbook § Doing it as a human, *Sign* —
and before signing it, against a checkout of the commit 4a recorded. **First, that commit is still
what `main` builds**, or nothing below is worth checking:

```sh
git fetch origin && git diff --quiet <the commit 4a recorded> origin/main -- app/ broadcast/ && echo current
```

No `current` means `main` has moved under the proposals: do not sign, and 4a is run again. **Proposals
1 and 2** (the plain `addChunk` calls):

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
2. **Wait one `delay()`, not three.** Each submit queues its digest at its own
   `eta = block.timestamp + _delay` (`:165-166`), and the three submits are seconds apart, so the
   three windows run **concurrently**: one wait of `delay()` seconds from the third submit, then
   three `executeQueued` in a row. "Three timelocks" is the natural misreading and it is wrong; the
   delay is per proposal, not cumulative.

   **Read `delay()`; do not type an hour.** This step said "one hour" and "3,600 s" throughout until
   2026-11-20, which is the mainnet figure (decision 58) and **wrong on the testnets**: the Ops vault
   answers **900 s — 15 minutes** on both 11155111 and 84532, read four times on 2026-11-18 and again
   on 11-20, and the Product Owner confirmed he set it there. m05-t01 Part B waited 900 s on each
   chain. Step 12 already requires the value to be read rather than assumed; this corrects the prose
   that contradicted it.
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
   So each piece has a **gate, read from the chain before it is sent**. Let ***N*** be the `App`
   account nonce the calldata was generated for — the precondition above reads it, and § Uploads
   records it per upload. Every `add*Chunk` is one CREATE, so the nonce counts the chunks that have
   landed, and the three pointers are `App`'s CREATEs at *N*, *N* + 1 and *N* + 2. **Read them out of
   the committed calldata rather than retyping them**, which is both shorter and the only form that
   stays correct across uploads:

   ```sh
   # the two document pointers, in order, and the widget pointer
   cast calldata-decode 'setChunks(address[],bool)'   "$(cat calldata/$CHAIN_ID/*-setChunks.hex)"
   cast calldata-decode 'setWidgetChunks(address[])'  "$(cat calldata/$CHAIN_ID/*-setWidgetChunks.hex)"
   # the same pointers, independently, from the nonce — the two must agree.
   # CHUNKS is the number of add*Chunk calls in this upload: document chunks plus the widget's one
   # (3 for a two-chunk document, 4 for a three-chunk one). The glob above keeps the file numbers
   # out of the command, because they shift with the chunk count.
   CHUNKS=$(ls calldata/$CHAIN_ID/*-add*Chunk*.hex | wc -l)
   for i in $(seq $N $((N + CHUNKS - 1))); do cast compute-address $APP --nonce $i; done
   ```

   Those two routes agreeing is itself a check: the first reads what the setters will be told, the
   second what the EVM will create, and a mismatch means the calldata was generated for a different
   nonce than the one you are about to execute at.

   | before sending | `cast nonce $APP` | `cast code <ptr>` non-empty at |
   |:--|--:|:--|
   | piece 1 | *N* | nothing yet — both document pointers print `0x` |
   | piece 2 | *N* + 1 | doc 0 (the `CREATE` at *N*) |
   | the batch | *N* + 2 | doc 0 **and** doc 1 (the `CREATE` at *N* + 1) |
   | (after the batch) | *N* + `CHUNKS` | every pointer — step 4d's check |

   The table is read for a two-chunk document, where `CHUNKS` is 3 and the last row is *N* + 3. The
   first three rows do not move with the count: chunks 0 and 1 are always the two plain proposals,
   and everything else is inside the batch. What moves is the last row and what the batch creates —
   with a three-chunk document the batch creates doc 2 **and** the widget, so `CHUNKS` is 4.

   Neither the nonce nor a non-empty `cast code` is the gate against the swap: after piece 2
   executed first, the nonce reads *N* + 1 *and* the doc-0 pointer holds code — chunk 1's. Only the
   **contents** discriminate. Before piece 2, the code at the doc-0 pointer must equal `0x00`
   followed by chunk 0's bytes, which are the `bytes` argument of the committed call:

   ```sh
   DOC0=$(cast calldata-decode 'setChunks(address[],bool)' \
            "$(cat calldata/$CHAIN_ID/4-setChunks.hex)" | sed -n '1p' | tr -d '[] ' | cut -d, -f1)
   CHUNK0=$(cast calldata-decode 'addChunk(bytes)' "$(cat calldata/$CHAIN_ID/1-addChunk-0.hex)")
   [ "$(cast code $DOC0 --rpc-url "$RPC")" = "0x00${CHUNK0#0x}" ] && echo chunk0-in-place
   ```

   (`SSTORE2.write` stores a `0x00` STOP byte then the data, `lib/solady/src/utils/SSTORE2.sol:52`,
   so an SSTORE2 pointer's runtime code is exactly that.) The same comparison for the doc-1 pointer
   against `2-addChunk-1.hex` before the batch. The nonce and code-presence rows above are the
   cheap pre-checks; the content equality is what proves the order held. Any other reading is a
   stop and a message to the architect, not a retry.

   Each `executeQueued` is the transaction that runs its call and pays for it, so it needs a gas
   limit. **Estimate, then send estimate + 30%**, and keep § Gas's hand table only as the fallback for
   an RPC that refuses to estimate:

   ```sh
   cast estimate --from $ENGINEER <target> "$(cat calldata/$CHAIN_ID/<file>)" --rpc-url "$RPC"
   ```

   The batch cannot be estimated until its chunks have landed — `CodelessChunk` — so estimate it
   *between* piece 2 and the batch rather than before piece 1. Measured across all six sends of the
   2026-11-17 upload, every estimate came back clean from the public RPCs and sat between **2.62%**
   (Sepolia doc 0) and **7.62%** (the Sepolia batch) above the gas actually used; § Uploads carries
   the figures. The `DeploymentFailed()` that the hand table exists for is a **wallet-path**
   observation and did not reproduce on `cast estimate` against either chain. Running out of gas
   reverts that one call and leaves it queued, so it can be sent again with more; the ones already
   executed stay executed.

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

**The nonce after an upload is *N* plus the number of chunks uploaded**, document and widget
together — 3 for a two-chunk document, 4 for a three-chunk one — not a constant. `cast nonce $APP`
is the reading; `ls calldata/$CHAIN_ID/*-add*Chunk*.hex | wc -l` is what it should have moved by.

**Then prove it through the gateway, because nothing above does.** `chain-doc` reads the ERC-5219
path with our own reader, so it establishes what the chain holds and nothing at all about what a
visitor receives — a gateway can serve a document two uploads old while every reading above is
correct and stays correct ([#242](https://github.com/dnznlabs/rake/issues/242)). The comparison
already exists: `tools/gateway-check.sh` removes the block the gateway injects after `<body>` and
compares the remainder byte-for-byte with `html()` on chain, and it takes a hosted origin rather
than only the dev stack's.

```sh
APP=$APP RPC="$RPC" \
  GATEWAY_BASE="https://$(printf %s "$APP" | tr 'A-Z' 'a-z').$CHAIN_ID.w3link.io" \
  devbox run -- make gateway-check
```

Run it **once per chain**, after that chain's `chain-doc` reading, and `record:` its outcome beside
that reading — `body minus block` against `html()` bytes, and `/widget.js` against
`app/dist/widget.js`. The origin is four labels, the address lowercased, no trailing slash. The
script refuses outright when `GATEWAY_BASE` is set while `RPC` is still the loopback default, which
is the silent wrong-chain comparison it exists to catch, so a green run on nothing is not available.

**A mismatch here is a documented third-party condition, not a failed upload — and the chain is the
reference.** If `chain-doc` matches the build and the gateway disagrees, the upload is sound: no
operator action changes what a third-party gateway is serving, so the figures and the date are
recorded and carried, and a re-upload is never the response — it would spend the gas and move
nothing, since the bytes on chain are already the ones intended. What a mismatch does gate is any
step that reads the hosted URL as a proxy for the chain: a UAT pass driving that origin is
exercising whatever the gateway last served unless this check passed for that chain first
([#238](https://github.com/dnznlabs/rake/pull/238)).

**`make deploy` is not used on a public chain.** Its later recipes run `Seed.s.sol`,
`Fixtures.s.sol` and a dev build, all of which are dev-chain only (decision 29).

**`scripts/forge/Chunks.s.sol` is dev-chain only.** It broadcasts from one key, and on a dev chain
that key is both signer and owner, so it works there and reverts `Unauthorized` on every public
chain. It stays for `make deploy`; it is never the public-chain route. That collapse is also why no
rehearsal caught this — a dev chain cannot tell the two roles apart.

#### What the upload does to the network menu

**The upload is what enables the chain in the dapp, on every chain (decision 69).** A page on any
other chain asks this chain's `App` for `chunkCount()` when its network menu or `#/docs` opens, and
once 4c has executed it answers above zero, so those pages stop showing this chain as "pending
deployment" and link to it. Nothing is uploaded anywhere else for that. The
read the dapp makes, by hand:

```sh
cast call $APP "chunkCount()(uint256)" --rpc-url "$RPC"   # above 0 once the document is up
```

- **Run § The gateway next, without a gap.** On `rake.dnzn.dev` the link the other chains now show
  is `/<chain id>/`, and the gateway serves that path only once the chain is in `deploy/gw44.json`.
  Between this step and that dispatch the link leads to a chain the gateway has no contract for.
- **`ENABLED` is housekeeping, not a step.** `ENABLED` in `app/src/index.html` is the set of chains
  a bundle links to with no read. When a bundle is next cut for any other reason, add every chain
  whose document is up, so that bundle's visitors ask about fewer chains. Never cut or upload a
  bundle for this alone: the menu is already right without it.
- **There is no way to upload and stay off the menu.** A chain that must not be offered yet does
  not get its document yet.

#### The five calls, and their order

**The committed `calldata/` is the last cut, not a mirror of `main`.** It is regenerated at step 4a
from the head the proposals are built from, so any `app/` commit merged after that cut leaves these
files describing a document `main` no longer builds — measured on 2026-11-22, when three merges and a
direct commit moved the document and the committed chunks still decoded to the previous payload.
**Never propose from the files as committed**: re-cut at the proposing head and compare, which § 4a
and § 4d already require. The same applies to the widget: it has its own chunk and its own hash, and
both move whenever `app/src/widget.js` does.

`tools/step4-calldata.mjs` writes them to **`calldata/$CHAIN_ID/`** at the repository root — § 4a's
`--out calldata`, which is the live path for every routine upload; only m04-t08's first upload kept
its calldata under its own task directory, which is where the tool's own default would still put it.
It splits `app/dist/index.html.gz` at `MAX_CHUNK = 24_000` bytes exactly as `Chunks.s.sol:_upload`
does, and wraps calls 3–5 into `batch345.hex`. They are committed, so what the product owner signs is
reviewable before it is signed and re-derivable after:

**Cut the calldata through the pinned toolchain, and check which `node` you have.** The payload is
`gzipSync`'s output, and `app/build.mjs` says it is "deterministic per zlib build, not across them".
Measured 2026-11-21 on one byte-identical document (`sha256 268afd4b…`): **48,551** bytes under
devbox's node v24.12.0 (zlib 1.3.1) and **48,810** under this machine's node v24.21.0
(zlib 1.3.2.1-motley). The raw document is the same either way — so § 4d's `inflated sha256` check
still passes — but the chunk bytes, their hashes and the chunk *count* are not, so calldata cut under
the wrong one will not match what is committed.

The trap is that `devbox run` does not always give you the pinned node:

| command | `which node` |
|:--|:--|
| `devbox run -- bash <script>.sh` | `.devbox/nix/profile/default/bin/node` — **pinned, use this** |
| `devbox run -- make dapp-nodev …` | pinned |
| `devbox run -- bash -c '…'` | `/usr/bin/node` — the system one |

So run the generation from a **script file** or as a direct `make`/`node` argument, never through
`bash -c`, and record the node and zlib versions with the sizes.

**"Five" is this upload's count, not the rule (amended 2026-11-21, m05-t01c step 6).** A document of
three chunks has six calls and a `batch3456.hex`; the heading keeps its name because m04-t08's and
m04-t10's records cite it. The rule is § 4a's: chunks 0 and 1 are the two plain proposals, everything
after them is one batch in call order, and a fourth document chunk is a stop.

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

**Run B's gas step, which is a fork and not the live node** ([#189](https://github.com/dnznlabs/rake/issues/189)).
Calls 1 and 2 depend on nothing and are live-estimable; the batch is not, because `setChunks`
validates pointers that calls 1–3 create, so asking the live node for it is red by construction and
the revert is `CodelessChunk` naming your own predicted pointer. Estimate it on a fork, which also
proves the whole sequence before anyone signs:

```sh
cast estimate --from $OWNER $APP "$(cat calldata/$CHAIN_ID/1-addChunk-0.hex)" --rpc-url "$RPC"
cast estimate --from $OWNER $APP "$(cat calldata/$CHAIN_ID/2-addChunk-1.hex)" --rpc-url "$RPC"

anvil --fork-url "$RPC" --port 8701 --silent &            # kill by PID, never by pattern
cast rpc anvil_impersonateAccount $OWNER --rpc-url http://127.0.0.1:8701
cast rpc anvil_setBalance $OWNER 0xDE0B6B3A7640000 --rpc-url http://127.0.0.1:8701
for f in 1-addChunk-0 2-addChunk-1; do
  cast send --from $OWNER --unlocked $APP "$(cat calldata/$CHAIN_ID/$f.hex)" --rpc-url http://127.0.0.1:8701
done
# The batch file is named for the calls it carries — batch345.hex for a two-chunk document,
# batch3456.hex for a three-chunk one (§ 4a). The glob keeps this command true for either.
BATCH=$(ls calldata/$CHAIN_ID/batch*.hex)
cast estimate --from $OWNER $OWNER "$(cat $BATCH)" --rpc-url http://127.0.0.1:8701
cast send --from $OWNER --unlocked $OWNER "$(cat $BATCH)" --rpc-url http://127.0.0.1:8701
node tools/chain-doc.mjs --app $APP --rpc http://127.0.0.1:8701 --chain $CHAIN_ID
```

`record:` the figures, and read the last command's `inflated sha256` against `sha256sum
app/dist/index.html` — **equal there means the upload will serve the right bytes, proven before a
signature exists.** Two cautions. The fork collapses signer and owner by impersonating the vault, so
it establishes encoding, order and gas and says *nothing* about authority — the authority readings are
the live `isOwner`/`threshold` above. And **anvil prices code deposit at ~223 gas/byte, which matches
Base Sepolia live to within 2% and under-prices Sepolia by ~7×**: measured 2026-11-17, Sepolia's chunk
0 estimates **37,760,737** live against **5,283,594** on the fork, while Base Sepolia's reads
5,369,650 live against 5,283,450. So a fork figure is authoritative only for a call that creates no
code; for the rest the live estimate is, and on Sepolia the batch's real cost exceeds its fork figure
by roughly the code-deposit term for the widget chunk.

**The sizing rule, stated once** ([#188](https://github.com/dnznlabs/rake/issues/188)).
`MAX_CHUNK = 24_000` began as a byte budget against the **24,576-byte code limit** alone, with no gas
term and no proposal-size term. It now has all three:

> **A chain's chunk size is 24,000 bytes while a full chunk estimates at or under both gas ceilings
> — half that chain's block gas limit, and the per-transaction gas cap where the chain applies one.
> Otherwise it is the largest multiple of 1,000 whose estimate does, and that chain's size is a
> column of the § 1 estimate table. The rule is re-evaluated immediately **before any mainnet cut**,
> in the task that cuts it, against whichever ceiling binds that day: the chunk estimate is re-read
> on that chain on that day, and if the size it gives differs from the committed default then
> `--max-chunk` moves and the calldata and the proposal split are regenerated in that task, before
> anything is proposed.**

The **proposal cap bounds the size from above whatever the gas ceilings say**: the coordination
service and the dapp refuse a proposal whose calldata exceeds 65,536 hex characters (32,768 bytes),
measured 2026-11-16, so no chunk above ~32,700 bytes is proposable at all — one `addChunk` of a
24,000-byte chunk is 48,138 characters, 73% of the cap, and that cap is what split the upload into
three proposals (4a).

**The second gas ceiling** is [EIP-7825](https://eips.ethereum.org/EIPS/eip-7825)'s
`TX_MAX_GAS_LIMIT` of 16,777,216, on a chain that carries 7825 **without** 8037's carve-out — 8037
applies that cap to execution gas only, so deposit metered as state gas sits outside it. That
carve-out is why the six `executeQueued` of 2026-11-18 on Sepolia, at up to 37,493,327 gas each,
were valid at all; on a chain with 7825 and not 8037 they would have been **invalid, not merely
expensive**.

Today's mainnet chunk estimates **5,286,009** (§ 1's table, read 2026-11-19), under both ceilings on
every chain of § 1, so the size is 24,000 everywhere and nothing in m05-t01 moves on this. What this
runbook now carries is the mechanism rather than a second literal: `tools/step4-calldata.mjs` takes
`--max-chunk <bytes>` defaulting to 24,000 and `Chunks.s.sol` reads
`vm.envOr("MAX_CHUNK", uint256(24_000))`, so the dev chain and the tool cut at the same number. A
re-run that records a new figure and leaves `--max-chunk` where it is regenerates nothing; it is the
**rule changing its answer** that invalidates the committed calldata.

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

Then the same three on Sourcify, which is where wallets look to decode a call to these contracts.
**Unset `ETHERSCAN_API_KEY` for these commands**: while it is set, forge ignores
`--verifier sourcify` and goes to Etherscan, which reports `already verified` and exits 0, so the
Sourcify verification looks done when it never ran.

```sh
env -u ETHERSCAN_API_KEY forge verify-contract $FACTORY src/Distribution.sol:DistributionFactory \
  --chain "$CHAIN_ID" --verifier sourcify --watch

env -u ETHERSCAN_API_KEY forge verify-contract $IMPL src/Distribution.sol:Distribution \
  --chain "$CHAIN_ID" --verifier sourcify --watch

env -u ETHERSCAN_API_KEY forge verify-contract $APP src/App.sol:App \
  --chain "$CHAIN_ID" --verifier sourcify --watch \
  --constructor-args "$(cast abi-encode 'constructor(address,string)' "$OWNER" "$APP_VERSION")"

for a in $FACTORY $IMPL $APP; do
  m=$(curl -s "https://sourcify.dev/server/v2/contract/$CHAIN_ID/$a" | jq -r .match)
  printf '%s %s\n' "$a" "$m"
  [ "$m" = exact_match ] || { echo "sourcify: $a is $m, not exact_match"; exit 1; }
done
```

**The loop is the gate, and the operator's eye is not**
([#207](https://github.com/dnznlabs/rake/issues/207)). Passing is *exit 0 with three `exact_match`
lines* and nothing else: an address Sourcify does not hold answers `null`, which reads like a blank
line to anyone skimming, so the comparison is made by the shell and the step stops on it rather than
leaving a human to notice a missing word. Rehearsed in both directions before it was written in
(m05-t01, 2026-11-19, handbook `docs/contract-verification.md` § Sourcify): against an address with
no code it printed `null` and exited **1**; against the three M04 Sepolia addresses it printed
`exact_match` three times and exited **0**.

`env -u ETHERSCAN_API_KEY` stays on the three `verify-contract` commands above for the reason given
there — with the key set, forge ignores `--verifier sourcify`, goes to Etherscan, reports
`already verified` and exits 0, so a Sourcify verification that never ran looks done. The loop is
what catches that, and it only catches it while the key is unset for the verifies.

`record:` each address's `match`, and the loop's exit code.

A distribution is a clone, and Sourcify does not report one as verified (`match: null`). What covers
it is the function, error and event signatures on OpenChain, keyed by selector rather than by chain,
so a wallet that cannot find the source can still show the function name. Upload them from the
artifacts this deployment was built from, after the verifications above and before Step 6:

```sh
forge build
cast upload-signature out/Distribution.sol/Distribution.json \
  out/Distribution.sol/DistributionFactory.json out/App.sol/App.json \
  | awk '{print $1}' | sort | uniq -c        # Imported: / Duplicated: counts, 82 in all for this ABI
```

A second upload of the same signatures prints `Duplicated:` for each one and changes nothing, so an
unchanged ABI on a new chain is all `Duplicated:`; an ABI change shows up as `Imported:` lines.

`record:` the date, and the `Imported:` and `Duplicated:` counts.

### Step 6 — DNZN's `create`

**This is the one step the DNZN Creator key signs**, and the only one. Re-export `SENDER` to that
key for this step and back afterwards. Its two conditions are the handbook's, in
`docs/multisig-transactions.md` § The DNZN Creator key — salted creates only, and never an owner or
a signer for anything else.

```sh
DISTRO=$(cast call $FACTORY "predict(bytes32)(address)" $DNZN_SALT --rpc-url "$RPC")
cast code $DISTRO --rpc-url "$RPC"      # must print 0x — #22, the second place this is checked
```

Then the send. `DNZN_DESCRIPTION`, `DNZN_TABLE` and `DNZN_DELAY` are § 0's, filled there with M05's
values — the Sepolia table and description, `DNZN_DELAY` 604800 on the mainnets (decision 50) and
86400 on the two testnets (decision 42), `OWNER` the Ops vault. **Export `DNZN_DELAY=86400` for a
testnet** and leave § 0's default for a mainnet. § Rehearsed on anvil marks its own values as the
rehearsal's placeholders, and the two rules below are what reject a wrong table.

```sh
cast send $FACTORY \
  'create(address,uint32,string,(address,uint96,string,string)[],bytes32)' \
  $OWNER $DNZN_DELAY "$DNZN_DESCRIPTION" "$DNZN_TABLE" $DNZN_SALT \
  --rpc-url "$RPC" $SENDER                        # anvil: --unlocked --from <address>

cast call $DISTRO "owner()(address)" --rpc-url "$RPC"       # must equal OWNER
cast call $DISTRO "delay()(uint32)" --rpc-url "$RPC"        # must equal DNZN_DELAY
cast call $DISTRO "description()(string)" --rpc-url "$RPC"  # must equal DNZN_DESCRIPTION
cast call $DISTRO 'snapshot()((address,uint32,uint32,string,(address,uint96,string,string)[],(bytes32,uint256,bytes)[]))' \
  --rpc-url "$RPC"                                          # the three rows, ascending by account
```

**This step takes `$SENDER`, not `$SIGNER`** — the two spellings, and the error a paste of the wrong
one stops with, are § 0's, stated once there.

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

## The gateway

`https://rake.dnzn.dev` serves `App` from the chain through a pinned build of `dnznlabs/gw44`,
deployed from this repository by `.github/workflows/deploy-gateway.yml`. Nothing is server-side: the
deployable is three static files, and a visitor's own browser reads the contract over the endpoints
named below. The guide for every step here is `docs/DEPLOY.md` in that repository, read at the commit
the workflow pins.

**Adding a chain is five edits and one dispatch.** m05-t02 and m05-t03 run this section as their last
step, once their chain's `App` exists.

1. **`deploy/gw44.json`** — add the chain id and its `App` address to `contracts`. **Ethereum becomes
   `default` when it is added, and no other chain does** (decision 70; gw44 decision 11 gives `/`
   to a mainnet chain once one is live, and the Product Owner ruled on 2026-11-22 that the mainnet
   is Ethereum, so Base, added before it, does not take `/`). Until then the default is
   `11155111`, Sepolia, by his ruling of 2026-11-21 on seeing the deployed site.
2. **`deploy/chains.json`** — add **at least two** endpoints for it, `https:` only and **no API key
   in any URL**: the file is compiled into the deployable, where anyone can read it. Ask each one
   before trusting it, and record the answers in the task's handoff with the date:

   ```bash
   curl -sS -X POST -H 'content-type: application/json' \
     --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' <endpoint>
   ```

   The result is hex: `0xaa36a7` is 11155111, `0x14a34` is 84532. An endpoint that answers another
   chain's id, or an HTML error page, is not an endpoint.
3. **Build it locally before spending a run**, from a gw44 checkout at the commit the workflow pins
   — a worktree or a clone of its own, not a checkout something else is using:

   ```bash
   devbox run -- make build CONFIG=<rake>/deploy/gw44.json GW44_CHAINS=<rake>/deploy/chains.json \
     GW44_OUT=/tmp/gateway-out
   devbox run -- make get URL="https://anything.invalid/<new chain>/" CONFIG=<rake>/deploy/gw44.json \
     GW44_CHAINS=<rake>/deploy/chains.json
   ```

   The build prints three `sha256  bytes  name` lines. `make get` must answer **200** with
   `text/html; charset=utf-8` for the new chain; `404 0 B` with `application/octet-stream` means the
   contract answered 404 for that path, and `404 47 B` with `text/plain` means nothing answered at
   that address on that chain — usually the wrong address or the wrong chain id.
4. **`expect` in the workflow** — replace the three lines with the three the build just printed.
   Whitespace is normalised on both sides, so paste the build's own lines. A mismatch fails the run
   **before** anything is deployed, which is the point of it.
5. **Dispatch it**, from `main` only — the `github-pages` environment on this repository admits no
   other branch, and it gates the whole job, so even a verify-only run fails from a branch:

   ```bash
   gh workflow run deploy-gateway.yml --repo dnznlabs/rake --ref main -f verify-only=true   # first
   gh workflow run deploy-gateway.yml --repo dnznlabs/rake --ref main                        # then deploy
   ```

   The run names which of its three attempts deployed and prints an `integrity` snippet per chain for
   the published `widget.js` copies.

**Then check it, from the same gw44 checkout, with the new chain in both commands:**

```bash
devbox run -- make check-site URL=https://rake.dnzn.dev SITE_CONFIG=<rake>/deploy/gw44.json \
  EMBED="<chain>/widget.js=sha384-…" ENGINES="chromium firefox webkit"
devbox run -- env VERIFY_SITE=https://rake.dnzn.dev VERIFY_ADDRESS=<App> \
  VERIFY_CHAINS="11155111 84532 <new chain>" GW44_CHAINS=<rake>/deploy/chains.json make verify
```

`check-site` is nine cases per engine. `make verify` reads the contract through the endpoints and
compares what the site serves byte for byte; **read its first line**, which names the address and the
chains it actually checked, before reading its result.

**Two things the caller must not do**, both learned by doing them:

- **No `concurrency` block.** The called workflow declares the group `pages` itself; a caller naming
  the same group deadlocks the call and the run fails at startup with **zero jobs and no log to
  read** (runs 44958052197 and 44958698883 are the pair that showed it). A caller that wants its own
  group must choose a different name.
- **No push or schedule trigger.** A deploy replaces the site the milestone's checks are measured
  against, so it stays a decision: `workflow_dispatch` only.

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
| | 5 | Sourcify: factory / implementation / App | |
| | 5 | OpenChain signatures | |
| 6 | 6 | DNZN `create` | tx: · gas: · `DNZN_SALT`: · `DISTRO`: |
| | 6 | `owner()` on `DISTRO` | |

## Uploads

Run B's record: one row per chain per upload, newest last. The **nonce** column is the `App` account
nonce the calldata was generated for, which is what makes a past upload reproducible —
`--app-nonce <that number>` regenerates its committed `calldata/<chain>/` byte-for-byte at any later
head, where `--rpc` would read today's nonce and emit different pointers.

| # | date | chain | commit | App nonce | pointers (doc 0 · doc 1 · widget) | vault nonces | `inflated sha256` · `widget sha256` | six tx hashes | gas across the three |
|--:|:--|:--|:--|--:|:--|:--|:--|:--|--:|
| 1 | 2026-11-17 | Sepolia | `9fdf0f1` | 4 | `0x831f740F…1268` · `0x02d5AcDA…A0C3` · `0x80bDDA62…FC38` | 6, 7, 8 | `2d27b603…3f9a9d4a` · `07e808ed…d51b8ca` | in full below | **83,827,120** |
| 2 | 2026-11-17 | Base Sepolia | `9fdf0f1` | 4 | the same three — the pointers are a function of `App`'s address and nonce, and both are identical per chain | 6, 7, 8 | `1111b791…0920e17` · `07e808ed…d51b8ca` | in full below | **11,947,862** |
| 3 | 2026-11-18 | Sepolia | `3751211` | 7 | `0x3C4C7D4E…5C06` · `0xcEaA7F17…7396` · `0x1Affb52C…F45D` | 9, 10, 11 | `b1fc3b96…e5ef1e86` · `8b6bbc88…108bc368` | in full below | **85,666,566** |
| 4 | 2026-11-18 | Base Sepolia | `3751211` | 7 | the same three | 9, 10, 11 | `6f0225bb…ff45336f` · `8b6bbc88…108bc368` | in full below | **12,206,026** |
| 5 | 2026-11-20 | Sepolia | `557a405` | **1** | `0x029E4004…98F4` · `0x87eE9c5C…80A3` · `0x295fF302…9227` | 13, 14, 15 | `59c24c98…cffdd2010` · `8b6bbc88…108bc368` | `0x3bc0b3c0…40e8fea` · `0xf25b0128…ca0f75a5` · `0x194caf5e…98e7a8eb` | **88,414,431** |
| 6 | 2026-11-20 | Base Sepolia | `557a405` | **1** | the same three | 13, **17**, 15 | `59ef3a4e…ce20df28` · `8b6bbc88…108bc368` | `0xa64c1bb7…10e1ba4d` · `0xf9c0d4b6…0d1c862f` · `0x841bce0e…86a08524` | **12,602,565** |

**Rows 5 and 6 are the first upload to the redeployed `App`** `0x00a9F390A6010d045e0d34856048DdD6910d25BA`
(m05-t01 Part B). Three things about them differ from rows 1–4 and are the reason this note exists:

- **`App` nonce is 1, not 4 or 7**, because the contract is new — so `--app-nonce 1` is what
  reproduces this calldata, and the three pointers are `App`'s CREATEs at 1, 2 and 3.
- **Row 6's middle vault nonce is 17 rather than 14.** On Base Sepolia the proposal submitted at
  nonce 14 was the pre-step-13a chunk 1; it was cancelled through
  `TimelockExecutor.forward()` (`0xdf711576…3656e0ca`, `queued` → `0`) and the correct chunk
  re-proposed at the then-live nonce 17. Nonce 14 is spent and carries nothing. The full account is
  in m05-t01's handoff § Deviations 0 and § Step 16a.
- **The `inflated sha256` differs per chain**, as in every row, but here the two builds also differ
  from m04-t16's recorded page by step 13a's commit alone (decision 65). Criterion 18's equality is
  shown by substituting the four deployment values back to the M04 set; see the task's § Step 14.

Gas across the three is the sum of the `executeQueued` receipts, not of the proposals: Sepolia
37,591,184 + 37,060,412 + 13,762,835, Base Sepolia 5,330,644 + 5,253,026 + 2,018,895. Sepolia's is
**7.02×** Base Sepolia's for byte-identical chunk payloads, which is #201's code-deposit repricing
measured a fourth time.

**Rows 3 and 4 are complete — 4a through 4d all ran.** The product owner co-signed and submitted all
six proposals on 2026-11-18 at 16:42–16:44 UTC; the engineer ran the six `executeQueued` calls once
the hour delay matured, 17:46:48Z–17:49:36Z by the executing blocks' own timestamps, and every
receipt is `status 1`. The two hash columns were
written from a fork at 4a, before the proposals were signed, and **4d re-read both from the chain
after execution and they are unchanged** — so, as in rows 1 and 2, the column now carries a live
`chain-doc` reading rather than a prediction. The pointers landed at the three predicted addresses and
`cast nonce` reads `10` on both chains **for the `App` of that upload, `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`** — named
rather than written as `$APP`, because m05-t01 redeployed `App` and `$APP` now means
`0x00a9F390…25BA`, whose nonce is its own (#311). This upload carries
m04-t11, m04-t04 and m04-t13; #227 (m04-t12) is held out by ruling and #235's R18 waits for a later
upload. The generating commit is `3751211` and the bundle under `app/` and `src/` is byte-identical to
the `06fbaab` the plan scoped — `git diff --stat 06fbaab 3751211 -- app/ src/` is empty, the one
change between them being a `TASK.md`. The calldata is committed in `calldata/<chain>/`.

The three digests per chain, each `getTransactionHash(<that proposal's own target>, 0, <file>, <nonce>)`
on the vault — `$APP` for proposals 1 and 2, `$OWNER` for the batch, and the chain is bound by
`getTransactionHash`, so no signature crosses chains:

| vault nonce | proposal | target | Sepolia digest | Base Sepolia digest |
|--:|:--|:--|:--|:--|
| 9 | 1 — `1-addChunk-0.hex` | `$APP` | `0x3cb3f8f9dd76fa1dfdea85b5f8ab5d0980e89630124f8801612631bd7bec864e` | `0xff8f5ba1d9c46b5e8a5df8121a274e9c51ed83c7fab5f1552e3f4cd09a72756d` |
| 10 | 2 — `2-addChunk-1.hex` | `$APP` | `0x8baf5cf5f206e0e8c74bab5ad741ade54e4a145ca27cf29fd95cb81aaf5f542e` | `0xb0e751cfe5996d45e995a9dffffa7412c8ab9f9d616bdc9ed843653905b5eecc` |
| 11 | 3 — `batch345.hex` | `$OWNER` | `0x6162d2ef558c5d436807e2834d9ccaf7fc0d1e6c423e9b2ccb356a52485654d5` | `0x2b16c2d0be0c38a1dd15dc8efb31b4364ea317cb80dd1dcc6641e7ec371ec5de` |

Sizes and gas for rows 3 and 4. The proposal sizes are `wc -c` of the committed files, `0x` included,
and differ per chain only in content — this upload's two chunks pad to the same encoded length on both.
Calls 1 and 2 are live `cast estimate --from $OWNER`; `batch345` reverts `CodelessChunk` live by
construction (§ Gas) and its figure is the fork's, with a derivation for Sepolia where anvil
under-prices code deposit:

| proposal | hex chars (cap 65,536) | Sepolia gas | Base Sepolia gas |
|:--|--:|--:|--:|
| 1 — `1-addChunk-0.hex` | 48,138 | 37,760,229 live | 5,369,382 live |
| 2 — `2-addChunk-1.hex` | 44,554 | 34,937,102 live | 4,970,346 live |
| 3 — `batch345.hex` | 19,018 | 2,021,612 fork · **≈13,524,000 derived** | 2,021,612 fork · ≈2,035,800 derived |

The Sepolia derivation is the fork figure plus the chain's code-deposit premium over anvil for the
widget chunk's 8,510 deposited bytes. That premium was measured on this chain at two chunk sizes —
1,351.19 and 1,352.16 gas per byte from calls 1 and 2's live-minus-fork — and the same method applied
to row 1's widget reproduces its executed `gasUsed` of 12,898,921 to **0.26%**, which is the check that
the two figures are not one instrument twice. Row 1's live estimate ran 7.62% above its own `gasUsed`,
so expect a live `batch345` estimate near 14.6M once proposals 1 and 2 have executed and § Gas's
re-estimate becomes possible. Every proposal clears its block limit with room: the largest is 18.88%
of Sepolia's 200,000,000 and 4.47% of Base Sepolia's 120,000,000.

**Both of those predictions held, which is the derivation's own check.** Once the chunks had landed
the live Sepolia `batch345` estimate was **14,603,875** against the 14.6M expected, and its executed
`gasUsed` of **13,482,308** is **0.31%** off the ≈13,524,000 derived above — a figure derived from two
chunk-size measurements and validated against a different upload's receipt, then confirmed against
its own. The fork figure alone (2,021,612) would have under-funded the call by a factor of six, so on
a chain where anvil under-prices code deposit the derivation is the number to carry, not the fork's.

The `inflated sha256` and `widget sha256` in rows 1 and 2 were the build's when the rows were written,
read from a fork of each chain before the proposals were signed; **4d re-read both from the chain
after execution and they are unchanged**, so the column now carries a live `chain-doc` reading rather
than a prediction. The gas column is the sum of the three `executeQueued` receipts.

**The six transactions of each row, in full.** Three submits (the proposal, which queues it) and three
`executeQueued` (which runs it), in nonce order. The submits are not the engineer's: `from` is the
Product Owner's account on Sepolia and a relayer EOA on Base Sepolia, both through the same relay
`to` of `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` — so **`from` is never a signer attribution on
either chain**, since the signatures authorise the call and `execute()` does not read `msg.sender`.
All twelve of rows 1 and 2's read `status true`, and so do all twelve of rows 3 and 4's. Rows 3 and 4
follow the same shape with one difference: their submits are the Product Owner's own account on both
chains, no relayer in between — which changes nothing about attribution, for the same reason.

Row 1 — Sepolia, `eth_estimateGas` and `gasUsed` per `executeQueued`:

| vault nonce | call | submit tx | `executeQueued` tx | block | `gasUsed` | estimate |
|--:|:--|:--|:--|--:|--:|--:|
| 6 | `addChunk` doc 0 | `0x9629018a60bd73fd2d34b3eedf7222e9db5eeac1c7dbe2513c8a81dc5b1c88fa` | `0x9559ca95b77595cf54980b9668b08f5760adb2c4715565ac0abb88e11cda59a2` | 12155608 | 37,493,831 | 38,474,885 |
| 7 | `addChunk` doc 1 | `0x7df581c038f35cdc29e85c976fe215e74f553dd358dd60caa956696aea22f083` | `0xf5d6dcf20fa0dcfa1e9bab8cdcb62f8e1a85478436b568bda4d8aa0d77a2965e` | 12155609 | 33,434,368 | 34,479,858 |
| 8 | `batch345` | `0x9ec56529a28121218d87e2aa5dca9db0760c55e73377ce19f213029498d4395d` | `0xe1f955983bbef0aa908968abda15762cadbe1ae90f5747c0dc50abb259855005` | 12155610 | 12,898,921 | 13,881,217 |

Row 2 — Base Sepolia:

| vault nonce | call | submit tx | `executeQueued` tx | block | `gasUsed` | estimate |
|--:|:--|:--|:--|--:|--:|--:|
| 6 | `addChunk` doc 0 | `0xb9c0e46e3a8e7aa371c1de43d48b730d798440e539167aff66f98b2a42012bff` | `0x1109d70289ae81f0138a148eb9ca870b94a88d3256deb13546cd27c9586b81b1` | 60056890 | 5,313,847 | 5,538,669 |
| 7 | `addChunk` doc 1 | `0x13d73ce6f37e3a3f2843c99b01731a35c01785332588e55aed6e4c7d3865d253` | `0x51ebc2842191f3804fbea1bf1cf8f54a57e48f39d3e3c904a6874a33fe640206` | 60056912 | 4,742,766 | 4,965,321 |
| 8 | `batch345` | `0xc5b7abb9b36a9b4d082c56ec4a94c19db937591ad3280d57384509380ae72e41` | `0x3b3c01042a857123233c8396ae967201ca5011c78965b913b56bf1510bb15714` | 60056932 | 1,891,249 | 2,016,300 |

Row 3 — Sepolia, this upload. Submits at vault nonces 9–11 in blocks 12162699, 12162701 and 12162703;
the `executeQueued` calls after the delay matured:

| vault nonce | call | submit tx | `executeQueued` tx | block | `gasUsed` | estimate |
|--:|:--|:--|:--|--:|--:|--:|
| 9 | `addChunk` doc 0 | `0xf7e62f1bc70e55fb761393b862b53048f2479081625874993eb37e7469b8c370` | `0x6cc405e453233fcd9c674fb1e23ca1920aad235e387b6fbbf17b63b080c28be5` | 12163010 | 37,493,327 | 38,474,389 |
| 10 | `addChunk` doc 1 | `0x2e981710463c39ae1072189b93a7dee815bb9c4f3725ebb97edbbcea73ae4f78` | `0x21022288de684c6c844415fd0fc2a71dd2ba1d292829c119c40f86c0eaeab973` | 12163016 | 34,690,931 | 35,531,152 |
| 11 | `batch345` | `0xf85536643fbeef28dd6f6f6ea31b901b4380fb7a833dbb6efbfa68f8b29d1e05` | `0xaba41d0cb3f11f668e808fd12d3587bb09b183a53b8b6b9371d1c43ac34637ac` | 12163019 | 13,482,308 | 14,603,875 |

Row 4 — Base Sepolia. Submits in blocks 60491332, 60491399 and 60491459; **the chain now produces
200 ms blocks**, so the submits sit ~20,000 blocks below their executions rather than the ~2,000 a
2 s block time would put them, and `eth_getLogs` here is capped at a **200-block range**, which is
what makes a wide `cast logs` sweep for them come back empty rather than erroring usefully:

| vault nonce | call | submit tx | `executeQueued` tx | block | `gasUsed` | estimate |
|--:|:--|:--|:--|--:|--:|--:|
| 9 | `addChunk` doc 0 | `0x710daccbb751f6f9664a1d893ef78087635e0798714bd538efdb4febf8b64ab7` | `0x337e52476f8dddf2e22046efd22160fd52474cd2bb69634048d0c5ad70be1e81` | 60511403 | 5,313,583 | 5,538,404 |
| 10 | `addChunk` doc 1 | `0xeca03fa11a6c9ccd2e424e913a0763b80ce6d7d3933c0a641df2a433c226ec1e` | `0x029904f076f31194a1e35d730039da0af81255989145318dd56a43edf2a811b7` | 60511451 | 4,919,283 | 5,142,539 |
| 11 | `batch345` | `0xd5c2770bae41eec22cf0e3fbcf6789c32f49dd9522bdbb2a1822c1a234083d93` | `0x44258f6970f469e7d03aab236f1d37ed1190b98f143ec9946ceeadfabedcd133` | 60511536 | 1,973,160 | 2,101,838 |

**Recovering a send-time estimate that was not written down.** The gas limit in a sent transaction is
`estimate * 13 / 10` in integer arithmetic, so `cast tx <hash> gas` inverts to a unique estimate — the
only integer `g` with `g * 13 / 10` equal to the limit. That is how row 3's order-1 estimate above was
read back after its console output was lost, and running it on the other five reproduced their logged
figures to the digit, which is what makes it a measurement rather than a reconstruction.

**Estimate-then-send was used for all twelve, and the hand limits of § Gas were not needed** — two
uploads reproducing t08's finding. `cast estimate --from $ENGINEER` returned a clean figure for every
one, including `batch345` once its chunks had landed, and what was sent was estimate + 30% every
time. Across the twelve the estimate ran **2.42% to 8.32%** above the gas actually used, and it is the
four `batch345` calls that sit at the top of that range (**6.52% to 8.32%**) while the eight
`addChunk` calls stay under 4.7% — so **the +30% margin is the one to keep, and 7% is not a ceiling to
plan against**. Keep § Gas's table as the fallback for an RPC that refuses to estimate.

**The order gate was read between every send**, per chain. Rows 1 and 2 walked `cast nonce $APP` —
`4`, `5`, `6` before orders 1, 2, 3 and `7` after the batch. **Rows 3 and 4 proved the order by
contents instead**, which is the stronger gate and the one § Step 4 asks for: after piece 2, `cast
code` at each predicted pointer was compared byte-for-byte against `cast calldata-decode
'addChunk(bytes)'` of the committed file, with the `0x00` `STOP` prefix prepended — equal on both
chains (48,004 and 44,382 hex chars on Sepolia, 48,004 and 44,376 on Base Sepolia). The nonce walk
cannot distinguish the swapped case, in which both pointers carry code and the nonce reads the same;
only the byte comparison can, so a nonce reading is a precondition and not the proof.

**The first upload of all, m04-t08's on 2026-11-16, is deliberately not a row here.** It was not
routine — it is the one whose calldata lives under its own task directory, it predates this table, and
its figures survive only in that handoff. Reconstructing them into this table would make a record
whose rule is *filled in as the steps execute* carry two rows that were not, which is the one thing a
record cannot afford. Its widget was 8,144 bytes and carried the alpha marker that decision 48
removed, which is the difference these two rows ship.

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
10,000, as `BadTable()` requires. M05 fills the real table (decision 50: the Sepolia one, 20/40/40). The `create` transaction hashes
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

## Executed on mainnets

**Deployed 2026-11-22 (m05-t02 Part B).** Base and Ethereum were taken through steps 1, 2, 3, 5 and 6.
**Step 4 was not run on either and no document is on either chain** — the mainnet documents are
m05-t03's — so `App` is live and serves nothing, with `chunkCount()` 0 and `locked()` false. M05 is
Base and Ethereum only (decision 70).

**Six sends, every one landing first time: no failure, no `-32003` refusal, no retry, no deviation
from step 1e's rule.** Four from the engineer key (a factory and an `App` per chain) and **two from
the Creator key, sent by the Product Owner** — step 6's `create` on each chain, which only that key
can sign. Addresses are the same as the testnets', which is what one init-code set under
`CREATE2` means: factory `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`, implementation
`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`, `App` `0x00a9F390A6010d045e0d34856048DdD6910d25BA`.
**The three `cast code` keccaks are identical on all four chains** — `0x66d10374…8b6c2`,
`0xd3399543…caa8c`, `0x691c7120…88a75` — each compared against a build of the repository rather than
against another chain, by `make attest` over `deployments/{1,8453,11155111,84532}.json`.

### § Record — Base (8453)

| step | what | reading |
|:--|:--|:--|
| 1 | gates | chain id 8453; both predictions equal § 0; `0x` at all four addresses; proxy 69 bytes, keccak `0x2fa86add…f7e4989`; block `gasLimit` 40,000,000; `E` 2,396,446 / 1,666,007; balance 0.005 ETH against 0.000081249 needed (61.5×); explorer key `status` 1 |
| 2 | factory | tx `0x07b81dcabe7b1041e800831ad460b27dfd5e589c2ba254ee71cef9b54f9d7377`, status 1, block 60,730,845, `gasUsed` **2,381,290** of a 4,795,322 limit (`G` 179), effective gas price 6,333,075 wei, **base fee at send 5,299,967 wei** |
| 2 | runtime | 1,319 bytes each side, 60 differing, **none outside the three immutable spans**, each holding `IMPL` |
| 3 | `App` | tx `0x96a64bcb5a59f1812efd68fb952fe97f6b013876b7f5e103ba3789b82fd58b19`, status 1, block 60,731,271, `gasUsed` **1,655,420** of 3,341,876 (`G` 190), effective gas price 6,746,681 wei, **base fee at send 5,758,940 wei** |
| 3 | read-backs | `owner()` the Ops vault, `version()` `v0.1`, `locked()` false, `chunkCount()` 0, `cmp` against the artifact equal at 7,154 bytes |
| 5 | Sourcify | three `exact_match`, asserting loop exit 0; factory `verifiedAt` 08:38:35Z and `App` 08:40:25Z, each about three minutes after its own deploy and not by this run's loop; implementation 08:47:37Z, this run's |
| 5 | explorer | **queued, not verified** — GUID `6xw4xwzxi2dcmrtkvyxchcehcansymkj6jrvgkzd8gqxqviaiq`, `Pending in queue`, `getsourcecode` empty |
| 5 | OpenChain | 82 `Duplicated:`, 0 `Imported:` |
| 6 | DNZN `create` | **sent by the Product Owner from the Creator key**, tx `0x589b14dc65d280a251e181f4fc3ff0159ea57ca1e71a61eb937b3ee582cc4e7b`, status 1, block 60,747,680, index 48, `from` `0x68e0741D8d693e14BF56914567eADdC130b186eE` at nonce 0, `to` the factory, value 0, `gasUsed` **463,727** of the 480,533 estimated, effective gas price 6,000,000 wei |
| 6 | read-backs | at `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`: `codesize` **45**, `owner()` the Ops vault, `delay()` **604800**, `description()` `DNZN // FUND DISTRIBUTION`, `beneficiaries()` treasury **2000** / ops **4000** / creator **4000** ascending, `nonce()` 0, `pendingCount()` 0; the 45 bytes' `PUSH20` holds `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`, the attested implementation |

**What the engineer's key spent on Base: 26,396,332,711,465 wei (~0.0000264 ETH)** for both sends —
0.005000000 ETH before, 0.004973603667288535 after.

**What the Creator key spent on Base: 2,786,722,829,162 wei (~0.00000279 ETH)** for step 6 —
0.001000000000000000 ETH before, 0.000997213277170838 after, nonce 0 → 1. That is **4,360,829,162 wei
more than `gasUsed × effectiveGasPrice`** (2,782,362,000,000), which is the L1 data fee an OP-stack
chain charges outside the execution gas — the receipt's two fields do not account for the whole
debit here, and on Ethereum they do.

### § Record — Ethereum (1)

| step | what | reading |
|:--|:--|:--|
| 1 | gates | chain id 1; both predictions equal § 0; `0x` at all four addresses; proxy 69 bytes, same keccak; block `gasLimit` 60,000,000; `E` 2,396,446 / 1,666,007; balance 0.025093601 ETH against 0.002171 needed (11.6×); explorer key `status` 1; **alias gate re-read immediately before step 2** — `0`, 1,582, `0`, `0`, `balanceOf` reverting |
| 2 | factory | tx `0x5cfd85b738dad390dfc0b43f7aa29e8883265d9b58cb3db87f14ad19dd4a8f50`, status 1, block 26,469,801, `gasUsed` **2,381,290** of 4,795,322 (`G` 179), effective gas price 118,800,946 wei, **base fee at send 126,882,335 wei** |
| 2 | runtime | 1,319 bytes each side, 60 differing, **none outside the three spans**, each holding `IMPL` |
| 3 | `App` | tx `0x37d157cc643bb26358d59e6de43bc967b5bcffd72e57d26a2ec57bdd5f8d3295`, status 1, block 26,469,806, `gasUsed` **1,655,420** of 3,341,876 (`G` 190), effective gas price 123,794,910 wei, **base fee at send 117,397,085 wei** |
| 3 | read-backs | `owner()` the Ops vault, `version()` `v0.1`, `locked()` false, `chunkCount()` 0, `cmp` equal at 7,154 bytes |
| 5 | Sourcify | three `exact_match`, loop exit 0; factory `verifiedAt` 09:38:02Z against a 09:36:59Z deploy and `App` 09:39:02Z against 09:37:59Z — each about a minute later, not this run's loop; implementation 09:40:43Z, this run's. All three carry `creationMatch: exact_match`, unlike Base's implementation, which carries none; recorded unexplained |
| 5 | explorer | **queued, not verified** — GUIDs `vyqncc7ethysu5igia38zpmlv2lpdiaxsqtt8gsjtpny5qrqg9` (factory), `4qe7mxxtx6lybemkrh6gz4tyyzfxl28nhxmmj86s8ce8j1jg1h` (implementation), `hfnhk7c5sarhs9821ecqy3iifb2ng6anz5cw9awlh4phtbwer3` (`App`) |
| 5 | OpenChain | 82 `Duplicated:`, 0 `Imported:` |
| 6 | DNZN `create` | **sent by the Product Owner from the Creator key**, tx `0xe8b7ca91ff62854e3a6a8bd0bf08a51241a0cf2896f0a358ef1d9103ceb9afc1`, status 1, block 26,469,844, index 225, `from` `0x68e0741D8d693e14BF56914567eADdC130b186eE` at nonce 0, `to` the factory, value 0, `gasUsed` **463,727** — the same figure as Base — of the 480,533 estimated, effective gas price 126,664,141 wei (~0.0000588 ETH) |
| 6 | read-backs | the same address and the same eleven readings as Base, value for value, re-read against `https://ethereum-rpc.publicnode.com`: 45 bytes, Ops-vault `owner()`, `delay()` **604800**, `DNZN // FUND DISTRIBUTION`, the three rows 2000/4000/4000 ascending, `nonce()` and `pendingCount()` 0, `PUSH20` holding the attested implementation |

**What the engineer's key spent on Ethereum: 487,832,074,612,540 wei (~0.000488 ETH)** — 0.025093601299726950
ETH before, 0.024605769225114410 after. Under **5%** of the 0.01 ETH asked for that chain.

**What the Creator key spent on Ethereum: 58,737,582,113,507 wei (~0.0000587 ETH)** for step 6 —
0.010000000000000000 ETH before, 0.009941262417886493 after, nonce 0 → 1. That is **exactly**
`463,727 × 126,664,141`, to the wei, with no L1 component. Both keys are left funded: the Creator
holds ~0.00994 ETH on Ethereum and ~0.000997 ETH on Base.

**The per-step gas is identical on both chains** — 2,381,290 for each factory and 1,655,420 for each
`App`. That is expected from one init-code set at one optimiser setting, and it is also a check: a
different figure would have meant different bytes. The *prices* differ by about twenty times, which is
the whole of the cost difference between the two chains.

**Failed or refused attempts: none, on either chain.** Recorded explicitly because the plan asks for
every one, and an empty list is only worth anything if it was asked for.

## Executed on testnets

**Redeployed 2026-11-20 (m05-t01 Part B, [#202](https://github.com/dnznlabs/rake/pull/202)).** Both
testnets were taken through steps 1, 2, 3, 5 and then 4 again on the re-mined salts, because #201's
solc re-pin to `0.8.38` moved every init-code hash and so every address. The live set is one address
per contract on both chains — factory `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`, implementation
`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`, `App`
`0x00a9F390A6010d045e0d34856048DdD6910d25BA` — with `codesize` 1,319 / 9,277 / 7,154 against the
superseded set's 1,320 and 7,155. DNZN's distribution is at
`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`, **live on Sepolia** and not yet created on Base
Sepolia. § Record — M05 below carries the per-step readings for this deploy; § Uploads rows 5 and 6
carry the document; the two **superseded** M04 tables further down are kept unchanged as that
milestone's record. Nothing of the M04 set was touched: its factory is unowned and its `App` is
vault-owned and still serves its own document.

### § Record — M05, Sepolia (11155111), 2026-11-20

| | Step | What | Value |
|--:|:--|:--|:--|
| | 1a | commit · forge · node | `b77827f` · 1.7.1-dev · v24.12.0 |
| | 1b | files compiled · tests · snapshot | 42 · 124 forge / 188 node · exit 0 |
| | 1c | proxy bytes · keccak | 69 · `0x2fa86add…f7e4989`, equal to § 1 |
| | 1e | factory runtime bytes · `cast estimate` | 1,319 · **16,738,648** (factory), 11,405,803 (`App`); block gas limit 200,000,000; base fee 16 wei |
| | 1f | `FACTORY` · `APP` · init-code hashes | `0x00D19609…6d7f8E` · `0x00a9F390…0d25BA` · `0x9778c358…bd2d8945` and `0xa8bbb837…f9fe33a3`, both equal to the task's premise |
| 1 | 2 | `DistributionFactory` CREATE2 | tx: `0xf9da99cd04279a55a58c7be1431b3877d4547c6f5e7451f675f32922be4109bc` · gas: **16,797,162** · addr: `0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E` · block 12,173,938 |
| | 2 | `implementation()` · immutable spans | `IMPL`: `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A` (9,277 bytes) · 60 differing bytes, **0 outside** the three declared spans |
| 2 | 3 | `App` CREATE2 | tx: `0xa3748d963f39e1a7c6747d832103ec8f7b1d22613f6a8fa6e5da0783f7bb3261` · gas: **11,505,124** · addr: `0x00a9F390A6010d045e0d34856048DdD6910d25BA` · block 12,173,956 · runtime `cmp`-equal to the artifact |
| | 3 | one failed attempt, recorded | `0x2be31dbb…49b3c86639` status **false**, 11,075,750 burned at a limit of 11,432,739 — out of gas, created nothing, no #22 collision. Cause: `forge script` applies `-g` to its **per-transaction** estimate, not to the printed script total. Amending § 1e to say so is [#308](https://github.com/dnznlabs/rake/issues/308), which must close before any mainnet send; the arithmetic is in m05-t01's handoff § Step 14 |
| | 3 | `owner()` · `version()` · `locked()` | `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` · `v0.1` · false |
| 3 | 4 | the document, via the Ops vault | chunk 0 tx `0x3bc0b3c0…40e8fea` gas **37,591,184** · chunk 1 tx `0xf25b0128…ca0f75a5` gas **37,060,412** · `batch345` tx `0x194caf5e…98e7a8eb` gas **13,762,835** · vault nonces 13, 14, 15 |
| | 4d | `inflated sha256` · `widget sha256` · `App` nonce | `59c24c98…cffdd2010` · `8b6bbc88…108bc368`, both equal to the build · **4** |
| | 4d | hosted gateway | **fails**: `status: 400`, no ERC-5219 headers. Third-party condition, carried, never re-uploaded — the chain is the reference |
| 4 | 5 | explorer · Sourcify | all three `Pass - Verified` **by this run** · three `exact_match`, asserting loop exit 0 · OpenChain 82 `Duplicated:` |
| 5 | 6 | DNZN `create` | **landed**, `0xB611Ff19…0F4D5199` · `codesize` **45** · `owner()` the Ops vault `0x00c0e887…F3790` · `delay()` **86400** · `nonce()` 0 · `snapshot()` table treasury **2,000** / ops **4,000** / creator **4,000**, ascending, description `DNZN // FUND DISTRIBUTION`. Sent by Denizen from the Creator keystore; #300's pre-flight estimated **2,241,718** gas. The transaction hash is not recorded here, for the reason given in Base Sepolia's row. Re-read live on 2026-11-21 |

### § Record — M05, Base Sepolia (84532), 2026-11-20

| | Step | What | Value |
|--:|:--|:--|:--|
| | 1a–1c | commit · toolchain · proxy | as Sepolia's row — one branch, one build; proxy 69 bytes, keccak equal to § 1 |
| | 1e | factory runtime bytes · `cast estimate` | 1,319 · **2,396,446** (factory), 1,666,007 (`App`); block gas limit 120,000,000; base fee 5,000,000 wei |
| | 1f | `FACTORY` · `APP` | identical to Sepolia's — CREATE2 through the same proxy at the same salts |
| 1 | 2 | `DistributionFactory` CREATE2 | tx: `0x73e4e918a1420edfa63adcf2ba1435474aef43da98423635d9360652cc61a0ca` · gas: **2,381,290** · block 61,197,280 · limit as sent 5,357,902 |
| | 2 | one submission the node refused | `-g 900` asked 24,110,559 and the RPC answered `-32003: gas limit too high`. **Nothing sent** — no hash, no nonce, no gas. The per-transaction cap here sits well under the block limit, so the multiplier is per chain |
| 2 | 3 | `App` CREATE2 | tx: `0xe8f0c7066102ea9e27ee89b52b442faa9cd704deec453b40a74af4e85c47f414` · gas: **1,655,420** · block 61,197,481 · runtime `cmp`-equal |
| | 3 | the gas number worth keeping | 1,655,420 here against 11,505,124 on Sepolia for the same bytes — **6.95×** — and exactly what a local `cast run` replay predicts, because anvil and this chain price code deposit alike |
| 3 | 4 | the document, via the Ops vault | chunk 0 tx `0xa64c1bb7…10e1ba4d` gas **5,330,644** · chunk 1 tx `0xf9c0d4b6…0d1c862f` gas **5,253,026** · `batch345` tx `0x841bce0e…86a08524` gas **2,018,895** · vault nonces 13, **17**, 15 |
| | 4 | why nonce 17 | the proposal at nonce 14 was the pre-13a chunk 1; cancelled by `forward()` `0xdf711576…3656e0ca` (`queued` → `0`, two endpoints) and re-proposed at the live nonce. Nonce 14 is spent and carries nothing |
| | 4d | `inflated sha256` · `widget sha256` · `App` nonce | `59ef3a4e…ce20df28` · `8b6bbc88…108bc368`, both equal to the build · **4** |
| | 4d | hosted gateway | **passes**, exit 0 — body-minus-block equal to `html()`, `/widget.js` 200 and `cmp`-identical at 8,509 bytes, `/nope` 404, cache-status `miss` |
| 4 | 5 | explorer · Sourcify | factory and implementation `Pass - Verified` by this run; **`App` reported *already verified***, so that one is not attributable here · three `exact_match`, loop exit 0 |
| 5 | 6 | DNZN `create` | **landed**, `0xB611Ff19…0F4D5199` · `codesize` **45** · `owner()` the Ops vault `0x00c0e887…F3790` · `delay()` **86400** · `nonce()` 0 · `snapshot()` table treasury **2,000** / ops **4,000** / creator **4,000**, ascending, description `DNZN // FUND DISTRIBUTION` — identical to Sepolia's reading. Sent by Denizen from the Creator keystore after #304's pre-flight, which estimated **480,533** gas. **The transaction hash is not recorded here**: it is his send, it is not in #304, and the factory's `Created` event is outside the `eth_getLogs` range this endpoint serves, so recovering it is a lookup on the explorer rather than a figure I measured. Row read live on 2026-11-21 |

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
§ For Denizen. ~~The rows below stay blank until the upload executes. Criterion 3's chain half is
still open.~~

**Step 4 executed on both chains on 2026-11-16** — Base Sepolia and then Sepolia, three
`executeQueued` calls each in nonce order, every receipt `status true`. The rows below are filled
from the chain, and **criterion 3's chain half is closed**: `cast nonce $APP` reads `4` on both, the
three pointers equal the committed predictions in the right slots, and `chain-doc`'s `inflated
sha256` and `widget sha256` equal `sha256sum` of each chain's rebuilt bundle. The three submit and
three `executeQueued` hashes per chain are in this section's 4c `record:` blocks below, and the
verification figures in m04-t08's `HANDOFF.md` § Step 8's `record:`.

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

**4a `record:` — both chains are proposed** (2026-11-16; Base Sepolia at 16:57Z, Sepolia at 21:10Z
after the stop below was lifted). Gates on both chains at **16:54Z**: `isOwner($ENGINEER)` `true`, `threshold()` `2`,
`nonce()` `3`, `cast nonce $APP` `1`. `make dapp-nodev` and `tools/step4-calldata.mjs` regenerated
every committed file byte-identical on both chains, `git status --porcelain` empty. The three Base
Sepolia proposals carry one signature, the engineer's, and were generated at commit **`9fa393f`**:

| proposal | file | target | nonce | digest |
|--:|:--|:--|--:|:--|
| 1 | `1-addChunk-0.hex` | `$APP` | 3 | `0xf9996757df4ac60bbf8fad2b779c39ef7c82215390a8a12dc7bf17284706d702` |
| 2 | `2-addChunk-1.hex` | `$APP` | 4 | `0xa2f30eebdcdc15eaa2ee322bf050796e72a12707b72eb4a38232fb10fa70f9a1` |
| 3 | `batch345.hex` | `$OWNER` | 5 | `0xc691bc7e6ca4098f7b37ec1207fc0a7389ccead111ad762296d8758ff320f521` |

**Sepolia's nonces 3 and 4 were already occupied when step 7 ran**, by two live proposals from the
product owner's account `0x357836ff…902b` of 2026-11-16 00:21Z and 00:26Z: at nonce 3 a call to
`$APP` whose calldata is byte-identical to `2-addChunk-1.hex` (sha256
`cdb5fe891727c7cb98e26d84e3e0f79acb91b95694fd90da94069da66ca06357`, 42,890 characters), and at
nonce 4 a second `addOwner($ENGINEER)`, which nonce 2 already executed on both chains. The first is
**chunk 1 at the nonce chunk 0 must occupy** — the one misorder 4c calls silent: it does not revert,
and `App` would serve the document's two halves swapped. Proposing calls 1–3 at nonces 3–5 there
would put two `addChunk` proposals at nonce 3 and leave which one executes to whoever signs, so step
7 stopped on that chain and escalated rather than competing with it.

**Amended 2026-11-16: that stop rested on a wrong premise, and Sepolia is proposable.** The two rows
above carry **no signature at all**, and an unsigned proposal is hidden from every owner by design —
the dapp drops any proposal with no valid owner signature that the chain does not hold queued, with
only a `console.warn`; its user-facing notice fires only when the signatures could not be *read*,
which is not this case, so the rows vanish silently. Measured with a paired control, using the query
the dapp itself sends (`tx_summary` with `signatures(signer,sig_type)` embedded, as anon): Base
Sepolia's three return one `ecdsa` row each, signer `0x5a158af8…bc50d`; Sepolia's two return `[]`.
That is why the product owner sees three rows on Base Sepolia and **zero** on Sepolia. The
`sig_count` column reads `0` on every `proposed` row on both chains and is not a usable signal; the
embedded rows are. A duplicate-nonce rendering theory was tested and rejected — one mainnet vault
carries four duplicate-nonce rows and renders.

So the hidden pair never contested nonce 3 as the stop assumed: unsigned, not queued on chain
(`queued()` returns `0` for both digests), and unsignable through the dapp because it does not
display them.

**The hazard that remains is bounded by the nonce, and the upload is what closes it.** A signature
collected outside the dapp is only dangerous if the vault accepts it: `execute()` requires every
signature slot — ECDSA-recovered or the `v == 0` approval form — to resolve to an address in the
vault's own owner mapping, so a non-owner's signature is worthless at execution. And the digest is
nonce-bound: `getTransactionHash` puts `nonce` inside the EIP-712 `Execute` struct hash, and
`execute()` computes its hash from the live counter it increments, never from a caller-supplied
nonce (`Multisig.sol` at `e767b88`, lines 85 and 136–137). **Say the window plainly: the hidden
nonce-3 row is executable only while Sepolia's `nonce()` is exactly 3, and it stops being executable
the moment that nonce is consumed** — proposal 1 executing at nonce 3 kills its digest permanently,
and proposal 2 at nonce 4 does the same to the duplicate `addOwner`. It is a real hazard in that
window; it is not an open door, and it argues for proposing sooner rather than for pruning first.

**Follow-on, not a gate: prune the hidden pair.** It needs the proposer's own address, so it is the
product owner's. It is **housekeeping, not safety** — once the nonces move it protects nothing. The
reason it stays on the list is the one that survives the nonce moving: a phantom row an owner can
neither see nor act on is a trust cost in the dapp every time a key is used on that chain. "Cosmetic"
here does not mean it never mattered.

**Sepolia's three, proposed 2026-11-16 21:10Z** on the product owner's go. Gates re-read immediately
before: `isOwner($ENGINEER)` `true`, `threshold()` `2`, `nonce()` **`3`** — unmoved, so the digests
TASK.md recorded at *N* = 3 still hold — `delay()` `3600`, `cast nonce $APP` `1`. `make dapp-nodev
CHAIN_ID=11155111` and `node tools/step4-calldata.mjs --chain 11155111` regenerated every committed
file byte-identical (`git status --porcelain` empty), and each digest was recomputed from the chain
and compared against TASK.md's value before signing:

| proposal | file | target | nonce | digest | proposal id |
|--:|:--|:--|--:|:--|:--|
| 1 | `1-addChunk-0.hex` | `$APP` | 3 | `0xe73c3f13c1b2f66f1d15e53a1cc2cefcd6da67b41599f1273d31e359caca326d` | `62b53064-2768-4da3-adf0-0df130d02b17` |
| 2 | `2-addChunk-1.hex` | `$APP` | 4 | `0xc1e9b846b07a3c73ad80c4f168c7972b78e0d239342dc530ebe4668fa2d4bc47` | `3ad0d25f-a8d5-477f-9b7e-c01e5eae50b7` |
| 3 | `batch345.hex` | `$OWNER` | 5 | `0x7d2d3128a3e3ee78c30a10c2e7e2834c9031d57c1c466c9900c91fa8e256c0f5` | `6760a9a5-df96-47b8-a659-5cbe2f45d664` |

Read back through the dapp's own query, all three carry **exactly one** signature, `ecdsa`, signer
`0x5a158af8…bc50d`, with `value 0`, `threshold 2`, calldata byte-equal to the committed file and the
digest equal to TASK.md's. **The prediction above held:** the same read returns five rows for that
vault and the two unsigned ones are still the only hidden pair, so the product owner sees exactly
three signable rows on Sepolia.

**4c, partial `record:` — Base Sepolia submitted and queued** (2026-11-16, by the product owner).
Vault `nonce()` moved `3 → 6` and `queued()` is nonzero for all three digests; nothing has reached
`App` yet. Read from the chain, not from the service:

| proposal | nonce | submit tx | block | `gasUsed` | ETA |
|--:|--:|:--|--:|--:|:--|
| 1 | 3 | `0x2425762d26dafd86d303beea53e4bd4e64391f88ed5b96d84901702e30630e2f` | 59706961 | 1,984,890 | `1794866861` · 22:07:41Z |
| 2 | 4 | `0x913236ed909b8ca76df1ff2d082f714c1a15f00aaddc96864826a418e2f64feb` | 59707098 | 1,773,830 | `1794866888` · 22:08:08Z |
| 3 | 5 | `0x24b889609e17fc7ad11c8a09afee1d7036848ba9c1c19d5c7745bdc71b983b8a` | 59707756 | 748,940 | `1794867020` · 22:10:20Z |

All three receipts are `status true`. **Two things a later reader will trip on.** First, the submits
were *relayed*: each `from` is a different EOA (`0xB42F812A…EAD6`, `0xB01caEa8…9C2E`,
`0xC066ac5D…8B8c`) and each `to` is `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`, not the vault and
not the product owner's account — the signatures are what authorise the call, and with both slots
ECDSA the vault does not care who sends it. Second, **the `cast receipt <hash> --field gasUsed`
form this plan prescribes does not run** on the pinned `cast 1.7.1`: the field is positional,
`cast receipt <hash> gasUsed`. The figures above come from the positional form.

**4c `record:` — Sepolia submitted and queued too** (2026-11-16 22:18Z, by the product owner). Not
recorded when sent; recovered from the vault's own `Queued(bytes32,uint256,uint256)` logs, topic0
`0x51c73878…6fdcf39`, one `cast logs --address $OWNER <topic0> <digest>` per digest — the event is
emitted by `execute()` on the vault, so it is better evidence than the service's rows:

| proposal | nonce | submit tx | block | `gasUsed` | ETA |
|--:|--:|:--|--:|--:|:--|
| 1 | 3 | `0xfa83fb4c8bccf54aaaa640f7aa80afeb739369102cef85c4aa1c1a2f1d1df627` | 12149932 | 1,651,608 | `1794867504` · 22:18:24Z |
| 2 | 4 | `0xec93f725db2d8d362ab0d61ad21597f7d3bd581fc71a2358cf2d40a7a1400924` | 12149934 | 1,483,672 | `1794867528` · 22:18:48Z |
| 3 | 5 | `0x9005224aa5bcf9af5f0e6d2882d1268f7c6dcf100b6155a59b33d6912fffed8d` | 12149936 | 697,240 | `1794867552` · 22:19:12Z |

All three `status true`. **Sepolia's submits were not relayed the way Base Sepolia's were:** each
`from` is the product owner's own account `0x357836fFcB45307FA7ff2A574F505753c961902B`, through the
same relay `to` of `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`. The relay contract is constant
across both chains; the sending EOA is not. Which is why **`from` is never a signer attribution on
either chain** — the signatures authorise the call and `execute()` does not read `msg.sender`.

**4c `record:` — the six `executeQueued` calls, both chains, 2026-11-16** (by the engineer, on the
product owner's explicit go of 21:35Z, after every ETA had passed). Pre-send gates re-read on both
chains at 22:20Z: all six digests recomputed from the chain with `getTransactionHash` and equal to
4a's table, `queued()` nonzero for all six, every ETA past, vault `nonce()` `6`, `cast nonce $APP`
**`1`** — nothing had run.

| chain | order | nonce | file | target | `executeQueued` tx | block | `gasUsed` | estimate |
|:--|--:|--:|:--|:--|:--|--:|--:|--:|
| Base Sepolia | 1 | 3 | `1-addChunk-0.hex` | `$APP` | `0x542f24c8bff7a15c91f3b9a067472bd5c8a60a5e0f37cf6c9f01d0417e0a0154` | 59729067 | 5,330,923 | 5,555,812 |
| Base Sepolia | 2 | 4 | `2-addChunk-1.hex` | `$APP` | `0xaaaa14162deb7d56a8cdbc50a71a03366d4f4d62d22004e783fe1738ae7c12bf` | 59729117 | 4,739,420 | 4,961,962 |
| Base Sepolia | 3 | 5 | `batch345.hex` | `$OWNER` | `0x6fba77ffcc25d2d7a37180b5e19ce40d99436afa4eff96f797ac69281caee533` | 59729165 | 1,939,537 | 2,085,800 |
| Sepolia | 1 | 3 | `1-addChunk-0.hex` | `$APP` | `0x7d902b542d993503245d4156847f2dc3f27c0f55d23f33a3d03848f3992e44fb` | 12150245 | 37,591,595 | 38,202,423 |
| Sepolia | 2 | 4 | `2-addChunk-1.hex` | `$APP` | `0xeff1ea245e51e77ce07f51953615412517dd47e9612caff43aa9d3e921555d20` | 12150247 | 33,404,902 | 34,214,503 |
| Sepolia | 3 | 5 | `batch345.hex` | `$OWNER` | `0x08a15c2649adc1c4051d6e4ff4f9a27233c6227d69831941b6d86cc5ef78805a` | 12150251 | 13,197,961 | 14,043,126 |

All six `status true`, every figure from `cast receipt <hash> gasUsed` positionally. **The order gate
was read between every send:** `cast nonce $APP` returned `1`, `2`, `3` before orders 1, 2, 3 and `4`
after the batch, per chain — the table above walked, so the silent misorder was never reachable.

**The hand-set gas limits of § Gas were not needed on these RPCs, and the reason given for them did
not hold.** `cast estimate --from` the signer returned a clean figure for all six against the same
public RPCs — no `DeploymentFailed()` — within 2% of the gas actually used every time; what was sent
was each estimate plus 30% headroom. The batch still cannot be estimated before its chunks land, as
written; it was estimated after order 2 on each chain. **Keep the table as a fallback and prefer
estimate-then-send**: the false `DeploymentFailed()` is a wallet-path observation, not an
`eth_estimateGas` one.

Step 6 has not run on
either chain: ~~`cast code` at the pre-#201 predicted address prints `0x` on both~~ — **superseded
2026-11-19 (m05-t01, M05-D1)**: that prediction was a function of the pre-#201 factory address and
both moved with the re-mine, so the address this reading was taken at is no longer the one step 6
reaches. The Creator key is at **nonce 0** on both. § 0 carries the current prediction and Part B
re-reads `cast code` at it per chain.

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

### § Record — Sepolia (11155111) — **superseded 2026-11-20, pre-#201 bytes**

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
| 3 | 4 | `addChunk` ×2 · `setChunks` | **done** 2026-11-16 via the vault (m04-t08, § Step 4) · chunk 0 tx `0x7d902b54…f992e44fb` block 12,150,245 gas **37,591,595** · chunk 1 tx `0xeff1ea24…921555d20` block 12,150,247 gas **33,404,902** · `setChunks` inside `batch345` |
| 4 | 4 | widget chunk · `setWidgetChunks` | **done** · both in `batch345` tx `0x08a15c26…5ef78805a` block 12,150,251 gas **13,197,961** |
| | 4 | pointers · `cast nonce $APP` | `chunks(0)` `0x0f8132D4…5D0D` · `chunks(1)` `0xAf5f9504…30a0` · `widgetChunks(0)` `0xc39C7643…aC8e`, all equal to the predictions · nonce **4** |
| | 4 | `inflated sha256` · `widget sha256` · byte counts | `cb2e8301…b99363` = `sha256sum app/dist/index.html` · `21dd3d13…eea24a` = `sha256sum app/dist/widget.js` · 142,949 and 8,144 both ways · `html()` 61,157 bytes, payload 45,358 |
| 5 | 5 | explorer: factory / implementation / App | all three `Pass`, names `DistributionFactory` / `Distribution` / `App`; URLs below |
| | 5 | Sourcify: factory / implementation / App | all three **`exact_match`**, with `creationMatch` and `runtimeMatch` also `exact_match`; read from `/v2/contract/11155111/<address>` on 2026-11-17 — factory `05:56:42Z`, implementation `05:56:56Z`, `App` `05:57:11Z` |
| | 5 | OpenChain signatures | uploaded for `Distribution`, `DistributionFactory` and `App`. A `Distribution` clone is **not** verifiable on Sourcify (`match: null`), which is what these signatures exist to cover; a second upload prints `Duplicated:` per signature and changes nothing |
| 6 | 6 | DNZN `create` | not run — Denizen's; ~~`predict($DNZN_SALT)` = the pre-#201 address, `cast code` `0x`~~ **superseded 2026-11-19 (m05-t01, M05-D1)** — the re-mine moved the factory, so it moved this prediction; § 0 carries the current one |
| | 6 | `owner()` on `DISTRO` | not run |

One extra transaction belongs to this chain's record: **`0xf80fc26d6c99b686147c834eb35f8a19fdb2c39ede03d9aaa7c65e3e534b7c29`,
nonce 1, gas limit 3,287,625, status 0, 2,833,494 gas burned, block 12,091,513** — a first step-2
attempt that failed on gas, for the reason step 1e now writes down. It created nothing, so it is not
a collision and the successful send that followed it is not a resend.

### § Record — Base Sepolia (84532) — **superseded 2026-11-20, pre-#201 bytes**

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
| 3 | 4 | `addChunk` ×2 · `setChunks` | **done** 2026-11-16 via the vault (m04-t08, § Step 4) · chunk 0 tx `0x542f24c8…17e0a0154` block 59,729,067 gas **5,330,923** · chunk 1 tx `0xaaaa1416…1738ae7c12bf` block 59,729,117 gas **4,739,420** · `setChunks` inside `batch345` |
| 4 | 4 | widget chunk · `setWidgetChunks` | **done** · both in `batch345` tx `0x6fba77ff…281caee533` block 59,729,165 gas **1,939,537** |
| | 4 | pointers · `cast nonce $APP` | identical to Sepolia's row — `0x0f8132D4…5D0D`, `0xAf5f9504…30a0`, `0xc39C7643…aC8e`, all equal to the predictions · nonce **4** |
| | 4 | `inflated sha256` · `widget sha256` · byte counts | `8c235917…576ea3` = `sha256sum app/dist/index.html` · `21dd3d13…eea24a`, the same widget hash as Sepolia · 142,947 and 8,144 both ways · `html()` 61,157 bytes, payload 45,358 |
| 5 | 5 | explorer: factory / implementation / App | all three `Pass - Verified` this run; URLs below |
| | 5 | Sourcify: factory / implementation / App | all three **`exact_match`**, with `creationMatch` and `runtimeMatch` also `exact_match`; read from `/v2/contract/84532/<address>` on 2026-11-17 — factory `05:58:43Z`, implementation `05:58:57Z`, `App` `05:59:13Z` |
| | 5 | OpenChain signatures | the same three uploads cover this chain: signatures are keyed by selector, not by chain, so one upload serves every deployment of the same ABI |
| 6 | 6 | DNZN `create` | not run — Denizen's; ~~`predict($DNZN_SALT)` = the pre-#201 address, `cast code` `0x`~~ **superseded 2026-11-19 (m05-t01, M05-D1)** — the re-mine moved the factory, so it moved this prediction; § 0 carries the current one |
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

Both chains sat far under any stop worth naming — and § 0's stop rule is the one that applies, which
sets no stop on a testnet at all; the figure cited here before this edit was m04-t03's plan and was
in no step of this document. **Sepolia charged roughly 7× what cancun does
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

### Step 6 is Denizen's — the M04 record, superseded 2026-11-19

> **This section is M04's record and is kept as read, not corrected.** Every value in it was the
> value of the day; § 0 carries what step 6 passes now, and the paragraph after this block says what
> moved.

**Step 6 was not run on either chain and is not this document's to run here**: the DNZN Creator key
is Denizen's and never lives on the engineer's host. Its two values are
**decision 42's** — `DNZN_DELAY=86400` and the three-row `DNZN_TABLE` of Treasury 1,000 bps, Ops
3,000 and `0x357836fF…902B` 6,000, in `_set`'s ascending address order, with
`DNZN_DESCRIPTION="DNZN // FEE DISTRIBUTION"`. m04-t03's handoff § For Denizen — step 6 carries the
complete command per chain, and that exact table string was rehearsed on anvil first: it parsed,
`DISTRO` landed at the `predict` address `0x633e24C2320B8d86A2A36aB659b64850e5aC6148`,
`owner()` the Ops vault and `delay()` 86400.

**What step 6 passes now is § 0's, and three things above have moved** (m05-t01, 2026-11-19). The
description is `DNZN // FUND DISTRIBUTION`, not `FEE` — decision 51, and the live Sepolia
distribution answers it. The table is decision 50's 2,000 / 4,000 / 4,000 over Treasury, Ops and the
Creator, not decision 42's 1,000 / 3,000 / 6,000. The delay is 604800 on the mainnets (decision 50),
86400 on the two testnets (decision 42). The `predict` address above is a function of the pre-#201
factory and moved with the re-mine. Part B records the deploy that uses § 0's values below this.
