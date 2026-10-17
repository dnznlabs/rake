# m02-t03 — handoff

PR: #52 · Branch: `m02/t03-writing` · 2026-10-11

Every write the contract offers can now be sent from the dev build, and all of them go down one path.
`tx(to, sig, args, {value, label})` does an `eth_call` on exactly the transaction it is about to send,
then sends, then waits for the receipt and reads its `status`; a revert is therefore a sentence before
anything has been paid for, and `Model.revertMessage` is what turns the bytes into it — the eight
custom errors by the selector `cast sig` gives them, a bare 32-byte word as `retry failed` because
that is the `false` a token returned with no selector in front of it (#20), no bytes as `reverted`,
and anything else keeping its four. `create` is the one write with no preflight, which is the rule
proving itself: a second `create` on a used salt burns the whole gas limit before `DeploymentFailed`,
so the page reads `eth_getCode` on the predicted address and refuses rather than preflighting a
transaction not worth making (#22). One table editor serves create's step 2 and the propose drawer —
the live bar, the sum line, and the one-line reason the submit is disabled — and `Model.tableFrom`
converts percent to bps and sorts ascending by account, which is asserted byte-for-byte against t01's
cast-written `setBeneficiaries` fixture rather than against this encoder. The detail page decides its
view once per load (decision 7): the owner's own account sends directly, a signer on a contract owner
gets the same drawer with every owner write rendered as calldata to copy, and everyone else is a
visitor who can still `distribute`, `release` and `apply`, because those three are anyone's whoever
the owner is (decision 11). The token list and the escrow rows are the chain's own — ETH plus every
token that has appeared in a `Distributed` or `Escrowed` log, read back from `escrowed(token,account)`
so a released row drops out — which is the answer to t02's deferred question about where a token list
comes from. `make fixtures` adds the two distributions the escrow and vault paths need and the seed
does not carry. The names block is ported from state-collection, gated to mainnet and Sepolia, and
makes no request on anvil, as decision 13 and M04 intend.

Two things in the plan turned out to be wrong against the chain, and both are in § Deviations: a
countdown measured against the browser's clock keeps `apply` disabled on a dev chain the plan's own
step 6 has just moved 604,800 seconds forward, and `propose` does not validate the action it queues,
so a table the contract will refuse can be queued successfully and then sticks for the whole delay.

Every figure below was taken through `devbox run --` from the repo root — forge/cast `1.7.1-dev`,
node `v24.12.0` — on **one anvil started empty for this run** (block 0 at the start, `make deploy`,
then `make fixtures`), because a second `make deploy` on a live chain moves the factory (#35). The
full transcript is 1,884 lines; what is quoted here is cut from it, and every page claim is the
rendered text of `#view`, read with Playwright (see § Browser verification).

## Step 0 — the baseline, re-measured on the merged t02

The plan's figures are from `main` at `1a642f4`, before t02. Re-measured with `grep -c` in
`app/src/index.html` at the three points:

```
                       1a642f4   5caf1f3   this branch
create(                      0         0             1
propose                      0         1             7
eth_getCode                  0         1             3
isOwner                      0         0             2
eth_sendTransaction          1         1             1
waitReceipt                  1         1             2
```

Two of the plan's four zeroes were no longer zero on `main`, both from t02 and both expected:
`decodePending`'s `SETTERS` names the `propose`-able setters, and `loadDistro` guards with
`eth_getCode`. Nothing on that baseline sent a transaction — `eth_sendTransaction` and `waitReceipt`
were the scaffold's, with no caller — so criterion 4 failed entirely by absence. On this branch
`eth_sendTransaction` is still 1 because `tx()` is the only place it appears; the scaffold's bare
`send` helper was folded into it rather than left beside it.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| **M02 criterion 4** — ten `status 0x1` hashes | pass | The ten below, each re-read with `cast receipt <h> status` rather than trusted from the page. |
| the refused second `create` sends nothing | pass | `reason line : a distribution already exists at this address for salt #5` · `deploy ready : false` · `eth_sendTransaction in this pass: 0`, and the whole network log for that pass is `eth_chainId, eth_getBlockByNumber, eth_call, eth_call, eth_getCode, eth_call, eth_getCode` — seven reads, no send. |
| the `false`-returning token's `release` reads `retry failed`, nothing sent | pass | `release · checking the call against the chain…` → `release · retry failed` · `eth_sendTransaction: 0`. The preflight's `error.data` is the bare 32-byte `false` word `_bubble` reverted with, which has no selector, so `revertMessage` reads `data.length === 66`. |
| each write's page view equals `snapshot()` / `reserved` / `escrowed` from `cast call` | pass | Each of the eleven sections of the transcript is *write → the page re-read from the chain → `reads.sh`*. Three reconciliations are quoted in full below; the rest are in the transcript. |
| copy-calldata decodes through both signatures | pass | Both outputs quoted below. |
| `node --test test/*.test.mjs`, every `revertMessage` branch incl. the bare `false` word | pass | `ℹ tests 38 · ℹ pass 38 · ℹ fail 0`. Branches: the seven no-argument errors in one test, `NotReady` in another (future eta, sub-minute eta, and eta `0`), the bare word `0x00…00` and `0x00…01`, `'0x'`/`''`/`null`/`undefined`, and an unknown selector. |
| `forge test` 36 passed | pass | `Ran 3 test suites …: 36 tests passed, 0 failed, 0 skipped (36 total tests)` — `MockVault` has no test, as the plan expected. |
| `forge snapshot --check` exit 0, no `Diff in` | pass | `grep -c "Diff in"` → `0`; exit `0`. Run after `forge build --force`, never after `forge lint`. |
| build free of `Warning (` and `warning[` | pass | `forge build --force` → `Compiler run successful!`; `grep -cE 'Warning \(\|warning\['` → `0`. |
| lint and fmt silent | pass | `forge lint` exit `0`, output `No files changed, compilation skipped`; `forge fmt --check` exit `0`, no output. |
| the frozen paths are untouched | pass | `git diff --stat origin/main -- src .gas-snapshot scripts/forge/Seed.s.sol mk/15-seed.mk` → empty. |
| `make fixtures` is idempotent | pass | Second run: `escrow demo (already there, left alone) 0xd1FD…2AFB` / `vault demo  (already there, left alone) 0xfd08…1920` / `Warning: No transactions to broadcast.` |
| `make deploy` is unchanged | pass | `git diff --stat origin/main -- mk/` names `mk/16-fixtures.mk` alone, and that file adds no `deploy::` recipe — the four that exist are still `mk/10-forge.mk`, `15-seed.mk`, `20-dapp.mk`, `30-onchain.mk`. `make help` lists `make fixtures`. |
| criterion 9's grep prints nothing | pass | `grep -rnE '\btip\b\|govUrl\|about:\|ownerKind' app/src` → no output, exit 1. It caught two of my own comments first; they are reworded. |
| `git diff --stat origin/main` names only the permitted paths | pass | Eight of the ten, plus this handoff. `app/src/layout.html` is permitted but unchanged: the drawer is a panel in the flow, so no shell was needed. |

## The ten hashes

One anvil, started empty. The featured distribution is the seed's at
`0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc`; the escrow demo is `make fixtures`' at
`0xd1FD542A56bD18Cd1692829D8162a791B0832AFb`.

```
$ cast receipt <hash> status   /   blockNumber   /   cast tx <hash> to

 1  create                     0x3dee24be9619c3ddcfa431facd70ffb3df3cf97f992a31928428763be5e2d94c  status true  block 10  to 0x5FbDB2315678afecb367f032d93F642f64180aa3
 2  propose-setBeneficiaries   0xec304578f36a87bd5b9485fcc5210cefaaa8c98e38c3a62982c4ed0d206ae9fb  status true  block 11  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 3  propose-setDescription     0x5e5f6d226077903ada86b4cfe0ba7308417606783412dd8eee4879baf39d7dec  status true  block 12  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 4  propose-setDelay           0x8f3e33cc80b23d457b98fde2ceb94dedbd88cf9663c1b9d0957a2187a7e96559  status true  block 13  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 5  propose-transferOwnership  0xc2d2a2a1e1a41e75e96127e8efb801c67172afee8e9ebcf6e39e16759dd701fc  status true  block 14  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 6  cancel                     0x63092fa2104c4dec52dbce749017c90cdca4c9e65be0f514ce072d29e3df622d  status true  block 15  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 7  applyQueued                0x1ab043a4066482bf448fdea7a3c7784cd3d62bd11b2d67fa2433704fb3cf5602  status true  block 17  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 8  distribute                 0x6691759571fb170b1fff4c99780a415d015653e06256d0f50002a26960eae555  status true  block 18  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
 9  propose-renounce           0x621d92ce3d684437edcfc060824885347423735a1b093045b8500aca754bd606  status true  block 19  to 0xe73C1AC3D8BA5Bc73A4720a3aE9798D5a1E174Bc
10  release                    0xd025705814b794246f29a910265fbb35c7f874fc498376a554cb34ca6cc80f37  status true  block 21  to 0xd1FD542A56bD18Cd1692829D8162a791B0832AFb
```

The order is the plan's: `cancel` after four `propose`s so there is something to cancel; `applyQueued`
after the time travel; `renounce` the last write the featured distribution takes. The one cancelled is
`transferOwnership` — the one proposal it would be careless to leave queued, since anyone can land it
once the delay passes. Block 16 is the `evm_mine` of the time travel (`eth_getBlockTransactionCount`
→ `0x0`); block 20 is the one `cast send` in the run, `setAccepting(bool) true` on the receiver,
`0x0c62a84cba38e8ff0aa8d40abb70a2d06dcaab30ef7d0a31f4dd7d5d1a7b41c6`, status 1.

## Three reconciliations, in full

**`create` (hash 1).** The page, before anything was sent:

```
predict line : will deploy to 0x8F4f3358c766724A76819bC61bA60A93d673E489 — same address on every chain for this wallet
reason line  : sent ascending by address — the only order the contract accepts
deploy ready : true
```

then `create · checking the call against the chain…` → `create · sent · waiting for the block ·
0x3dee…d94c` → `create · landed in block 10 · 0x3dee…d94c`, and the hash moved to
`#/distros/0x8F4f3358c766724A76819bC61bA60A93d673E489` by itself. The page there reads
`created from the dapp` · `30% treasury` / `70% ops` · `OWNER 0xf39F…2266 · you` · `DELAY 7d` ·
`WAITING TO DISTRIBUTE 0.2500 ETH`. The rows were typed `ops`/`70` first and `treasury`/`30` second;
they are sent and stored the other way round because `tableFrom` sorts by account and
`0x3C44…93BC < 0x7099…79C8`.

**`applyQueued` (hash 7).** The time travel, and the two clocks it separates:

```
$ cast rpc evm_increaseTime 604800 --rpc-url $RPC   ->  604800
$ cast rpc evm_mine --rpc-url $RPC                  ->  "0x0"
$ cast block latest --field timestamp               ->  1792372322
$ date +%s (the browser's clock, for contrast)      ->  1791767522
```

All four pending entries then read `CHANGE QUEUED · READY TO APPLY` and row 0 is the seed's
`setBeneficiaries · new table · 40% / 60%`. After the apply:

```
--- cast call 0xe73C…74BC 'snapshot()' --rpc-url $RPC
(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 604800, 5, "DNZN fees",
 [(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 4000, "ops", "operations"),
  (0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 6000, "treasury", "")], [ …three pending… ])
```

and the page's live table reads `40% ops` / `60% treasury`, matching it. **The plan says this check
should show "the seed's 70/30 table"; on chain 31337 the seed's revised table is 40/60** —
`Seed.s.sol:56` sets `ops = block.chainid == 31337 ? 6000 : 7000` and then `10_000 - ops` for the
revision, so 70/30 is the non-anvil branch (and the figure t01's `setBeneficiaries` fixture carries).
Nothing was changed to make this pass; the plan's figure names the wrong branch.

**`release` (hash 10).** Before: `escrowed · ETH` / `0x0165…Eb8F — the push failed, so this share
waits here` / `0.5000` / `release`. After `cast send <receiver> "setAccepting(bool)" true` (status 1,
block 20) and the page's own release:

```
--- cast call 0xd1FD…2AFB 'reserved(address)' 0x0                                 ->  0
--- cast balance 0xd1FD…2AFB                                                      ->  0
--- cast call 0xd1FD…2AFB 'escrowed(address,address)' 0x00…00 0x0165878A…9242Eb8F  ->  0
--- cast call 0xd1FD…2AFB 'escrowed(address,address)' 0xa513E6E4…C4D5C853 0x0165…  ->  50000000000000000000
--- cast call 0xd1FD…2AFB 'reserved(address)' 0xa513E6E4…C4D5C853                  ->  100000000000000000000
```

The ETH escrow row is gone from the page and the two token rows remain, which is what those five
numbers say. The activity list gained `released · 0.5000 ETH · 0x0165…Eb8F · block 21`.

## Step 1's three checks

```
$ cast call <escrow> 'escrowed(address,address)(uint256)' 0x00…00 <receiver>   ->  500000000000000000 [5e17]
$ cast call <escrow> 'escrowed(address,address)(uint256)' <liar>  <receiver>   ->  50000000000000000000 [5e19]
$ cast call <MockVault> 'isOwner(address)(bool)' 0x90F79bf6EB2c4f870365E785982E1f101E93b906  ->  true
```

`make fixtures` logs the six addresses it leaves on the chain: `receiver 0x0165878A…9242Eb8F`,
`liar 0xa513E6E4…C4D5C853`, `vault 0x2279B7A0…73d2eBe6`, `vault signer 0x90F79bf6…1E93b906`,
`escrow demo 0xd1FD542A…B0832AFb`, `vault demo 0xfd083dB3…edcdE1920`.

## Copy-calldata, from the vault demo

Loaded as anvil account 3, the signer the `MockVault` names. The owner bar reads *you are a signer on
0x2279…eBe6, which owns this distribution — every change below is calldata to submit through it*, and
all five owner controls in the drawer are `copy calldata for your vault` — `copy:table`, `copy:desc`,
`copy:delay`, `copy:owner`, `copy:renounce`. `eth_sendTransaction` over the whole session: `0`.
The delay field was set to `1h` and the calldata read back out of the clipboard:

```
$ cast calldata-decode "propose(bytes)" 0x37558af5000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000241034866500000000000000000000000000000000000000000000000000000000000000e10…
0x103486650000000000000000000000000000000000000000000000000000000000000e10

$ cast calldata-decode "setDelay(uint32)" 0x103486650000000000000000000000000000000000000000000000000000000000000e10
3600
```

## The three states the apply button has, and the two it refuses from

With `eth_getLogs` delayed by six seconds, every pending row reads *apply · reading the queue log —
apply needs the nonce it carries* and the button is disabled. With `eth_getLogs` aborted, it reads
*apply · history unavailable — apply needs the queue log*, the funds block reads *history unavailable
— the token list and the escrow rows are read from the logs*, and the table itself is untouched
(`6 segments, 2 ledger rows`). Before the eta it reads *anyone can apply once the delay passes*; after
it, *the delay has passed — anyone can land it*. Zero page errors in all four states; console
messages were counted separately, across every screen — see the last row of § Browser verification.

The preflight earns its place in the stale case, which is reachable without any contrivance: two pages
open on the same ready change, one applies it, the other's button now points at an entry that is no
longer queued.

```
both pages see row 0: ["setDelay · new delay · 2d","setDelay · new delay · 2d"]
  A applyQueued · landed in block 22 · 0xb1d7…76eb
  B applyQueued · that change is not queued here — it has already been applied or cancelled
  B eth_sendTransaction: 0
```

`NotOwner`'s shape was measured directly rather than inferred, which is what the comment in
`index.html` claims: `eth_call` and `eth_estimateGas` of `cancel(bytes32)` from a non-owner both
answer `{"code":3,"message":"execution reverted: custom error 0x30cd7471","data":"0x30cd7471"}`.

## Names, ported and unexercised

Every address field on anvil answers *names resolve on mainnet and Sepolia* — the load field, create's
owner, the drawer's owner and every editor row — and three such lookups in one session issue
**zero** requests: `requests while resolving three names: []`. That is structural, not luck;
`resolveName` and `resolveAddr` both return before asking anything when `CHAIN` is neither 1 nor
11155111. t02's `name resolution arrives with t03` notice is gone. Nothing beyond the port and the
gate is provable until M04 (decision 13).

## Size

```
$ make dapp-nodev   ->  dapp: raw 74811 bytes · gzip 23036 bytes · chain 31337
$ make chunks       ->  payload bytes 23036 / chunk 0 0x9f1ac54B…300d3a8e / html() bytes 31393
$ make dapp         ->  dapp: raw 75259 bytes · gzip 23227 bytes · chain 31337 · dev overrides kept
```

| | raw | gzip | chunks | head-room to 24,000 |
|:--|--:|--:|--:|--:|
| t02 | 44,355 | 14,254 | 1 | 9,746 |
| t03 | 74,811 | 23,036 | 1 | **964** |

Still one chunk, and 8,782 bytes of t02's head-room are gone. See § Discoveries — this is the number
the architect most needs before t04 is scoped.

## Deviations from the plan

- **The error selectors are held against the contract, not `selectors.txt`.** Step 2's check says the
  test's `cast sig` comments must match `test/fixtures/abi/selectors.txt`. That file has 17 lines and
  carries **function** selectors only — no errors — and `test/fixtures/abi/` is not in the task's
  permitted diff list, so nothing could be added to it. Resolved by matching `selectors.txt` for what
  it does carry and, for the eight errors, carrying the `cast sig` value in a comment beside each and
  verifying it against the declaration in `src/Distribution.sol` (lines 40–45 and 299–300). All eight
  were re-derived with the pinned `cast sig`: `NotOwner 0x30cd7471`, `BadTable 0x40da0647`,
  `NotReady(uint256) 0x5a997526`, `NothingToDo 0x5c52a868`, `Locked 0x0f2e5b6c`,
  `Unauthorized 0x82b42900`, `DeploymentFailed 0x30116425`, `SaltDoesNotStartWith 0x0c4549ef`. Note
  that `src/App.sol` declares its own `Locked()`, the same selector on a different contract, outside
  M02's scope. Correct this reading if something else was meant.
- **Countdowns measure the chain's clock, not the browser's.** The plan does not say which, and
  `secs()` was the browser's. It cannot be: `applyQueued` compares `block.timestamp`, and after the
  plan's own `evm_increaseTime 604800` the chain's timestamp is `1792372322` against the browser's
  `1791767522` — exactly 604,800 apart — so a wall-clock countdown leaves every entry reading `6d 23h`
  and `apply` disabled on a chain that would accept all four. The page now reads the latest block's
  timestamp at boot and again on each detail load, and ticks forward from it; on a real chain the two
  agree to within a block. Without this, step 6's demonstration cannot be made to pass.
- **The editor refuses two tables the prototype's two one-liners do not.** `propose` does not validate
  the action it queues — only `applyQueued`'s `_selfCall` does, through `_set`. Measured on a
  development chain: a table with the same account on two rows at 50/50 was queued with
  `status 0x1`, and would then revert `BadTable` on every apply, staying queued for the whole delay
  with only a `cancel` to clear it (`applyQueued`'s deletes roll back with the revert). The editor now
  says *two rows cannot share an address — the contract refuses that table* and *every row needs a
  share above zero — the contract refuses that table*, and holds the submit disabled. This is the one
  place I added product behaviour rather than rendering the contract's answer; see § Open questions.
- **`revertMessage(data, now)` takes the clock.** The plan writes `revertMessage(data)`, but
  `NotReady`'s countdown needs a now and a test needs a deterministic one — exactly as t02's
  `countdown(eta, now)` already does. `now` is the chain-anchored `secs()` at the call site.
- **`NotReady(0)` is not rendered as a countdown.** The contract uses one error for two conditions
  (`eta == 0 || block.timestamp < eta`), and a zero eta means *not queued here at all* — an entry
  already applied or cancelled, which is what a stale page reaches. Rendering it as a countdown would
  have said "the delay has not passed — ready to apply". It reads *that change is not queued here — it
  has already been applied or cancelled*; the future-eta branch is unchanged and unit-tested.
- **Step 6's "before it, the preflight returns `NotReady(eta)`" is unreachable from the page, by
  design.** The plan's check asks for the pre-eta preflight to answer `NotReady(eta)` and render the
  countdown rather than the raw error. The page never gets there: before the eta the apply button is
  disabled, carries no `data-send` and has no handler, so there is nothing to preflight — forcing a
  click does nothing at all. That is the behaviour step 6 asks for two sentences earlier (the button
  "stays disabled, rather than guessing"), so the two halves of the check cannot both hold, and the
  disabled one is the right one: a preflight before the eta would be a wasted round trip to learn
  something `countdown` already knows locally. **So the future-eta countdown branch is unit-tested
  only, never demonstrated through the page**, and the `NotReady` the page does reach is the eta-`0`
  stale race above. Nothing in § The three states claims otherwise, but the plan's sentence reads as
  satisfied unless this says plainly that it was not, and could not be. Noted for the TASK.md
  correction at close-out.
- **`namehash` lives in `model.js`, not beside the rest of the ported names block.** The plan says
  port state-collection `224–279` verbatim, and also unit-test `namehash` against EIP-137's vectors;
  `test/model.test.mjs` tests `model.js`. `namehash` is pure, so it moved; `ensName`, `regName`,
  `resolveName` and `NAMES` need the provider and are in `index.html` as the plan says, comments
  included. Both vectors were re-derived with `cast` rather than quoted from memory —
  `cast keccak "0x<32 zero bytes><cast keccak eth>"` → `0x93cdeb70…a93fc4ae`, and the same with `foo`
  → `0xde9b09fd…b019f84f`.
- **Forward resolution is wired to every address input, not two.** The plan says "the load field and
  the two address inputs". One helper, `addrField(value, res)`, serves the load field, create's owner,
  the drawer's owner and each editor row — fewer paths than wiring a subset, and the same notice
  everywhere.
- **Create's step 1 validates before `Next`.** The prototype validated nothing there. A name, an
  address-resolved owner and a parseable delay are required, each with the one-line reason; a delay of
  zero is allowed and carries *no delay: every change applies the moment it is proposed* in amber,
  which is the "flagged everywhere" the plan asks for.
- **The page was not served with `make serve`.** `make serve` is process-compose, which cannot run
  TTY-less (#34, explicitly out of scope), and it would start its own anvil and `make deploy` — the
  second deploy #35 warns about. The project's own `serve` from
  `.devbox/nix/profile/default/bin` was run directly on `:3003` against `app/dist`, as t02 did, because
  `serve --listen <port>` is ignored when it goes through `devbox run --`.
- **`app/src/layout.html` is unchanged.** Permitted, but nothing needed it: the drawer is a panel in
  the document flow rather than an overlay, so the view renders it and no shell element was added.
- **`scripts/forge/Fixtures.s.sol` sorts the escrow table at run time** rather than writing it in
  order. The receiver's address comes from the script's own nonce, so which of it and anvil account 1
  is lower is not knowable when the file is written, and `BadTable` requires ascending.

## Discoveries

- **The shipping bundle has 964 bytes of head-room left against the 24,000-byte chunk boundary**
  (gzip 23,036, one chunk). t03 spent 8,782 of t02's 9,746. t04 is `#/docs`, the long page of
  DESIGN_HANDOFF § 3.3, plus criterion 8 — it will not fit in one chunk, so either the chunking is
  already proven for two (`Chunks.s.sol` loops, and `html()` concatenates, but no run has ever
  produced `chunk 1`) or the bundle needs trimming first. Worth a `carried` issue before t04 is
  scoped rather than discovered inside it.
- **`propose` does not validate the action it queues.** Above, as a deviation, because I acted on it.
  It is also a contract-level observation for M03: a stuck pending entry can only be cleared by the
  owner's `cancel`, so a renounced distribution with a bad table queued keeps it forever.
- **`make fixtures` adds three names to `make addresses` and to `app/build.mjs`'s substitution table.**
  The broadcast log it writes carries `RevertingReceiver`, `MockERC20` and `MockVault` as `CREATE`
  rows, so after it has run on a dev chain `make addresses` lists five contracts, not two, and
  `__MOCKVAULT__`-style tokens become substitutable. Nothing in `app/src` references any of them and
  the bundle is byte-identical either way (gzip 23,036 before and after), so this is cosmetic — but it
  is a dev-chain-only effect worth knowing before someone reads `make addresses` as the deployment.
- **`cast receipt --field` is not a flag in 1.7.1.** The field is positional:
  `cast receipt <hash> --rpc-url $RPC status`. `cast block` does take `--field`. Cost a wasted pass.
- **The escrow demo's `distribute` button is correctly disabled at `0.0000` while 100 tokens sit in
  escrow**, because `balance − reserved[token]` is zero. The row reads
  `waiting to distribute · 100.0000 held in escrow`, which is the honest reading and worth keeping in
  mind for the widget: "balance" and "distributable" are not the same number.

## Decisions

- **`distribute`, `release` and `applyQueued` are always sent from the page, even in the vault view.**
  Decision 7's copy-calldata is about writes the owner alone may make; these three are anyone's, so a
  vault signer sends them from their own account like any visitor. Only `propose` and `cancel` become
  calldata.
- **After a write lands, the view is read again from the chain rather than patched from the receipt.**
  Costs a round trip; means the page's claim about the contract always comes from the contract. It is
  also what makes each section of the transcript a genuine reconciliation rather than an echo.
- **An argument thunk that throws is how a field reports itself unusable.** Each registered write
  carries `args()` rather than arguments, so an input is read when its button is pressed; a bad delay
  throws `delay takes 7d, 48h, 30m or a number of seconds` and that message lands on the status line
  with nothing sent. One mechanism instead of per-field validation state.
- **The editor's rows are never reordered on screen.** The submitted table is sorted, and the hint
  under the submit says so — *sent ascending by address — the only order the contract accepts*.
  Silently rearranging rows someone is typing is worse than telling them.
- **The drawer stays open across a write and a reload.** The rows someone typed survive; the pending
  block behind it updates. Closing is theirs to do.

## Open questions

**Question.** Should the page refuse to queue a change the contract will certainly refuse, or queue it
and let the owner discover it on apply?

**Options.**
1. Refuse — the editor blocks duplicate accounts and zero shares, as shipped. Costs: the page now
   encodes two of the contract's rules, so a future `_set` change makes it wrong until it is updated.
2. Allow — the editor keeps only the prototype's two reasons. Costs: `propose` accepts the table with
   `status 0x1`, and the owner finds out a delay later, with a pending entry that can never apply and
   only `cancel` to clear it.

**Recommendation.** Option 1, as shipped: a UI that cheerfully queues an action it knows cannot land,
and says nothing for seven days, is worse than one that duplicates two lines of validation.

**Default and deadline.** Option 1 stands unless ruled otherwise; it blocks nothing. If option 2 is
preferred, it is a three-line revert in `editorState`.

**Record.** `ROADMAP.md` § Decisions if it is ruled; otherwise this handoff is the record.

_Ruled 2026-10-12: option 1, as shipped — [#55](https://github.com/dnznlabs/rake/issues/55), `ROADMAP.md` decision 16._

## Browser verification

The OpenClaw browser tool cannot reach this box's own dev server — no Chromium on it, and loopback is
blocked — so every page claim above was taken with Playwright driven from `/tmp/rake-t03-pw`, outside
the repo, against the chromium already on disk at `~/.cache/ms-playwright/chromium-1243`: the route
t02 and state-collection's t07 used. Nothing it wrote is in the tree: `git status --porcelain` printed
nothing after `make fixtures`, after `make chunks` at the end of the recorded run, and before each of
the four commits on this branch.

Console messages and failed requests were counted on every screen as the last step of the run, loading
each of the seven with a `console` and a `pageerror` listener attached before `goto`: landing, create,
the featured distribution, the escrow demo, the vault demo as its signer, the vault demo as a
stranger, and the list. `-- errors: []` on all seven.

Eight scripts: the write orchestrator (`run.sh`, which owns the ordering and interleaves `cast`), the
create flow and its refusal, the propose drawer, the apply button, the funds block, the vault copy, the
delayed/failed-logs and names states, and the stale-apply race. Two things in them are worth naming
because they are the difference between evidence and assertion. First, every status line the page
passes through is recorded by a `MutationObserver` with the `title` attribute behind each shortened
hash, so a full hash is read out of the document rather than reconstructed — and the record survives
the hash navigation a landed `create` performs. Second, "nothing was sent" is read off the page's own
network log (`eth_sendTransaction` counted from `page.on('request')` against the RPC URL), never
inferred from the absence of a hash.

One harness bug is worth recording because its first symptom looked like an application bug: the
settle check initially scanned every recorded status line, so after one write had landed each later
write read that line as its own and "settled" before it had sent anything, reporting
`eth_sendTransaction: 0` for writes that did send. It counts from a mark now. The figures in this
handoff are from the corrected harness, and each is cross-checked against `cast receipt`.
