# m02-t03 — Writing: create, propose, apply, cancel, distribute, release

Milestone: [M02](../../MILESTONE.md) · Phase: 3 — Writing

When this is done every write the contract offers can be sent from the dev build and lands with a
receipt the page checks: `#/create` deploys a distribution at an address shown before sending and
refuses a used salt without sending; the owner's drawer queues each of the four setters and renounce;
pending entries can be cancelled by the owner and applied by anyone once the delay has passed;
`distribute` and `release` sit under the balance for everyone; a `release` the token refuses renders as
"retry failed"; a vault signer gets the owner view with copy-calldata instead of a send. Name display is
ported from state-collection but not exercised: anvil has no registries (decision 13, M04).

## Plan

Every command runs from the repo root through `devbox run --`. Branch `m02/t03-writing` from
`origin/main` after t02's PR has merged (its `model.js`, `loadDistro`, the `#/create` stub and the
`Queued` log loader are the foundation); hooks as in t01. Baseline on `main` at `1a642f4`, 2026-10-11,
before t02: `grep -c` in `app/src/index.html` for `create(`, `propose`, `eth_getCode`, `isOwner` → 0,
0, 0, 0; `eth_sendTransaction` and `waitReceipt` → 1 each (the scaffold's `send` at line 75 and
`waitReceipt` at 77–88, with no caller). Re-measure on the merged t02 before relying on any of these
and record the difference in the handoff. Criterion 4 fails entirely on that baseline by absence.

1. **Dev-chain fixtures, run by hand, never by `make deploy`.** The seeded chain has no escrow, no
   token and no vault, and criterion 4 needs all three. Add `scripts/forge/Fixtures.s.sol` (not a
   `Deploy*.s.sol`: the deploy loop runs those with no environment) and a `fixtures` target in a new
   `mk/16-fixtures.mk` — not in `mk/15-seed.mk`, which #35 owns. It reads `FACTORY` like `Seed.s.sol`
   does and, as `SENDER` (anvil account 0), deploys from `test/mocks/Mocks.sol`: a `RevertingReceiver`
   (accepting `false`), a `MockERC20(Ret.False)` ("liar"), and a new ten-line `MockVault` added to
   `Mocks.sol` with `isOwner(address) view returns (bool)` true for one constructor-given signer
   (anvil account 3, `0x90F79bf6EB2c4f870365E785982E1f101E93b906`). Then two distributions, salts
   `salt(SENDER, 2)` and `salt(SENDER, 3)` by the same rule as `FEATURED_SALT` (top 20 bytes sender,
   low 12 bytes the index):
   - **escrow demo** (salt 2): owner account 0, delay `1 hours`, table `[receiver 5000, account 1
     5000]` ascending by address — check the order with `cast to-check-sum-address` and sort, since
     `BadTable` requires ascending; deposit 1 ETH; `liar.mint(distribution, 100e18)`; then
     `distribute(address(0))` and `distribute(liar)`. `_push` returns `ok == false` for both the
     reverting receiver and the `false`-returning token (`src/Distribution.sol:114–134` escrows on
     `!ok`), so both leave an `Escrowed` row for the receiver and nothing for account 1's ETH share
     beyond its transfer. Log the four addresses. `release(address(0), receiver)` succeeds only after
     `receiver.setAccepting(true)`; `release(liar, receiver)` always hits `_bubble` with the bare
     32-byte `false` word and no selector (#20). That pair is the whole point of this fixture.
   - **vault demo** (salt 3): owner the `MockVault`, delay `7 days`, the seed's two-row table, deposit
     0.5 ETH. Owned by a contract from block one, as decision 10 describes for real deployments.
   Idempotent like the seed: `predict(salt)` with code → log "already there" and return. Check:
   fresh anvil, `make deploy`, `make fixtures`, then `cast call <escrow> "escrowed(address,address)(uint256)" 0x0000000000000000000000000000000000000000 <receiver>` → `500000000000000000`,
   the same call with the liar's address → `50000000000000000000`, and `cast call <vault> "isOwner(address)(bool)" 0x90F7…b906` → `true`. `make fixtures` twice sends nothing the second time.
   Nothing under `src/` changes; `forge snapshot --check` stays clean because `Mocks.sol` has no tests.
2. **One transaction path, preflighted.** In `index.html`, replace the bare `send` call pattern with
   `tx(to, sig, args, {value, label})`: first `eth_call` with the same `from`/`to`/`data`/`value`;
   on error decode it; only then `send` and `waitReceipt(hash, POLL_MS)`; `status !== '0x1'` paints
   `reverted` with the explorer link, exactly state-collection's `index.html:488–514` shape. The
   error object differs by provider: the dev `rpcProvider` throws the JSON-RPC `error` object, so the
   revert bytes are at `error.data` (measured on anvil 2026-10-11: `eth_call` and `eth_estimateGas`
   both return `{"code":3,"message":"execution reverted: custom error 0x30cd7471","data":"0x30cd7471"}`
   for a non-owner `cancel`); MetaMask-class wallets nest it one deeper at `error.data.data`. Read
   `typeof e.data === 'string' ? e.data : e?.data?.data`, and treat `4001` as `rejected in wallet`.
   The decoding is pure and lives in `model.js` as `revertMessage(data)`: the eight custom errors by
   selector (`NotOwner 0x30cd7471`, `NothingToDo 0x5c52a868`, `NotReady(uint256) 0x5a997526` with the
   eta decoded into a countdown, `BadTable 0x40da0647`, `Unauthorized 0x82b42900`, `Locked
   0x0f2e5b6c`, `SaltDoesNotStartWith 0x0c4549ef`, `DeploymentFailed 0x30116425`); a 32-byte word with
   no selector (`data.length === 66`) → `retry failed` (#20: that is the `false` word bubbled bare);
   `0x` or empty → `reverted`; anything else → `reverted (0x…)` with the first four bytes. Test every
   branch in `test/model.test.mjs`, including the bare `false` word
   `0x0000000000000000000000000000000000000000000000000000000000000000`. Check: the test enumerates the
   selectors with `cast sig` in a comment beside each, matching `test/fixtures/abi/selectors.txt`.
   *Correction 2026-10-11 (t03 handoff § Deviations):* `selectors.txt` carries function selectors
   only — 17 lines, no errors — so the eight error selectors are verified against their declarations
   in `src/Distribution.sol` (lines 40–45 and 299–300), not against that file.
3. **The table editor, once.** One component for create step 2 and the propose drawer, from the
   prototype's `data-dr` rows (`docs/brainstorming/design/rake-dapp.html:408–425, 462–476`): name,
   note, address (or a name — step 8), percentage; remove per row; add row; the live bar from t02's
   `bar(table, {pending})` painting a hatched unassigned segment; the sum line red when ≠ 100 and green
   at 100; the submit disabled with the one-line reason from the prototype (`total must equal 100% —
   N% unassigned`, `every row needs a name and address`). Convert percent to bps as the prototype
   does, `Math.round(pct * 100)`, and sort rows ascending by address before encoding, since
   `BadTable` rejects any other order — say so in the hint rather than silently reordering. Output is
   the `(address,uint96,string,string)[]` tuple array `Eth.enc` already takes. Check: `decodePending`
   on the encoded `setBeneficiaries` calldata round-trips the rows (unit test).
4. **Create.** Replace t02's `#/create` notice with the two steps of `DESIGN_HANDOFF.md` § 3.4: step 1
   description, owner (defaults to `ACC`), delay as `7d` / `48h` / `0` with zero flagged everywhere;
   step 2 the editor, an optional deposit in ETH (`create` is payable; `msg.value` rides the CREATE2
   into the clone), and a salt index `n` (default 1, a number input, labelled "salt #"). The salt is
   `salt(ACC, n)` from `model.js`; the predicted address `predict(salt)` is read and shown before the
   button is enabled, with the line "will deploy to <addr> — same address on every chain for this
   wallet". **Before sending, `eth_getCode` that address; non-empty disables the button with "a
   distribution already exists at this address for salt #n" and sends nothing** (#22). Send
   `create(address,uint32,string,(address,uint96,string,string)[],bytes32)` to `CFG.factory` through
   step 2's path; on `status 0x1` navigate to `#/distros/<predicted>`. Nothing from the prototype's
   owner-kind control, `govUrl`, `about` or `tip` selector (decisions 1, 2, 7; criterion 9's grep).
   Check: dev build, `from=` account 0, create with salt #5 lands and the page shows it; create again
   with salt #5 and watch the network tab — no `eth_sendTransaction`.
5. **Owner view and the propose drawer.** On `#/distros/<addr>`, decide the view once per load:
   `ACC === owner` → owner, direct sends; else `eth_call` `isOwner(address)` (`0x2f54bf6e`, in
   `selectors.txt`) on the owner with `ACC` — a raw `P.request` `eth_call`, not `cast`, because the
   result on an EOA owner is `0x` (no code) and must read as "not a vault", and a revert reads the same
   way; `true` → owner view with every write rendered as copy-calldata (decision 7); anything else →
   visitor. The drawer is the prototype's "Queue a change" (`rake-dapp.html:408–425`): the editor →
   `propose(setBeneficiaries calldata)`; and, each its own transaction, description →
   `setDescription`, delay → `setDelay`, owner → `transferOwnership`, and renounce →
   `transferOwnership(0x0)` behind the prototype's copy "transfer to nobody — the table can never
   change again" and a confirm. The action bytes are `Eth.enc(setter, args)`; the outer call is
   `propose(bytes)` `0x37558af5`. In the vault case the copy button writes the `propose(bytes)`
   calldata to the clipboard (`navigator.clipboard.writeText`, with a select-all `<textarea>` fallback
   when the API is absent) and labels it "copy calldata for your vault". Check: on the vault demo with
   `from=` account 3, copy `setDelay(3600)`'s proposal and run `cast calldata-decode "propose(bytes)"
   <pasted>` → the inner bytes, then `cast calldata-decode "setDelay(uint32)" <inner>` → `3600`.
6. **Pending entries: cancel and apply.** Each pending row from `snapshot().pending[]` carries its
   `hash`; `cancel(bytes32)` takes it straight from the struct (owner only, "cancel is owner-only and
   immediate"). `applyQueued(bytes,uint32)` needs the `uint32 nonce` that the struct does not carry:
   it is the first data word of that entry's `Queued` log (`Queued(bytes32 indexed hash, uint32 nonce,
   uint256 eta, bytes action)`; measured on the seed: nonce `1`, eta `0x6ad5165b`), which t02's step 7
   loader already fetches. Map hash → nonce from the logs; while the logs have not loaded, or failed,
   the apply button reads "history unavailable — apply needs the queue log" and stays disabled, rather
   than guessing. Enable it once `eta` has passed (`countdown` returns "ready to apply"), with the
   prototype's "the delay has passed — anyone can land it". Demonstrate on the seeded pending with
   `cast rpc evm_increaseTime 604800 --rpc-url $RPC && cast rpc evm_mine --rpc-url $RPC` (both
   verified on anvil 2026-10-11; the plain decimal form is accepted). Check: after time travel, apply
   lands with `status 0x1` and `snapshot()` shows the seed's 70/30 table; before it, the preflight
   returns `NotReady(eta)` and the message carries the countdown, not the raw error.
   *Two corrections 2026-10-11 (t03 handoff § Three reconciliations and § Deviations):* (1) "70/30"
   is the seed's non-anvil branch — `Seed.s.sol:56` sets `ops = block.chainid == 31337 ? 6000 : 7000`
   and the revision is `10_000 - ops`, so on 31337 the applied table is **40/60**; (2) the pre-eta
   preflight is unreachable, by this step's own earlier sentence: before the eta the apply button is
   disabled with no handler, so nothing is preflighted and the `NotReady(eta)` countdown branch is
   unit-tested only. The `NotReady` the page does reach is eta `0`, the stale-page race.
7. **Distribute, release, and the payer line.** Under the balance line for everyone: `distribute` for
   ETH, labelled "anyone can call distribute() — the contract splits by the table above; you pay the
   gas" (decision 11), disabled when `balance − reserved[token]` is zero. Tokens shown are ETH plus
   every token address seen in `Distributed`/`Escrowed` logs — the answer to t02's deferred question
   about a token list, since the chain carries none. Escrow rows: for each `(token, account)` from
   `Escrowed` logs, read `escrowed(token, account)`; non-zero rows render with a `release` button for
   anyone. One line in the funds block, verbatim from #18's ruling: paying in from a contract with
   `transfer`/`send` can fail when the implementation is cold; use `call` with gas. Check on the
   escrow demo, in this order, recording each: (a) `release(liar, receiver)` → the preflight returns
   the bare `false` word → "retry failed", no transaction sent; (b) `cast send <receiver>
   "setAccepting(bool)" true --unlocked --from $SENDER --rpc-url $RPC`, then `release(ETH, receiver)`
   → `status 0x1`, the escrow row disappears and `escrowed(ETH, receiver)` reads 0.
8. **Name display, ported, unexercised.** Port state-collection `app/src/index.html:224–279` verbatim
   (`NAMES` with ENS, WNS, GNS registries, `namehash`, `ensName`, `regName`, `resolveName`), gated to
   chain 1 and 11155111 as there, priority ENS → WNS → GNS winner alone (decision 13). Reverse display
   wherever an address renders through t02's `ext()`; forward lookup for the load field and the two
   address inputs: ENS `resolver(bytes32)` then `addr(bytes32)` on the same registry, same gate,
   returning `null` elsewhere so t02's "name resolution arrives with t03" notice becomes "names
   resolve on mainnet and Sepolia". Unit-test `namehash` against the two worked vectors in EIP-137
   (`eth` and `foo.eth`). Check: on anvil every name input shows that notice and no request is
   made; nothing else is provable until M04.
9. **Tests, size, clean.** `test/model.test.mjs` gains `revertMessage`, the editor's bps conversion and
   sort, `namehash`, and the round-trip of step 3; enumerate the imported names against
   `grep -c 'function ' app/src/model.js` as t02 does. `make dapp-nodev` prints raw and gzip bytes;
   record both and the chunk count beside t02's figures. Criterion 9's greps; `forge test` 36 passed
   (`MockVault` adds no test); `forge snapshot --check` exit 0; build, lint, fmt clean; porcelain
   empty after each command in criterion 9's list and after `make fixtures`.
10. **Docs.** `AGENTS.md` § The dapp: one bullet for `tx()` and `revertMessage` (preflight, then send;
    provider error shapes), one for `make fixtures` and what it leaves on the chain. `make help`
    lists `fixtures`.

Order matters in the demonstration: `cancel` needs a pending entry, `applyQueued` needs time travel,
and renounce ends proposing, so renounce is the last write on whichever distribution it is sent to.
Use a fresh anvil for the recorded run; a second `make deploy` on a live chain moves the factory (#35).

## Acceptance criteria

- M02 criterion 4 in full. The handoff lists **ten** `status 0x1` transaction hashes — `create`,
  `propose` ×5 (the four setters and renounce), `applyQueued`, `cancel`, `distribute`, `release` — plus
  the refused second `create` (same salt, no transaction sent, shown by the network log) and the
  `release` of the `false`-returning token rendering `retry failed` with no transaction sent. For each
  write, the page's view after it equals `snapshot()` / `reserved` / `escrowed` from `cast call`, pasted.
- Copy-calldata from the vault demo decodes with `cast calldata-decode "propose(bytes)"` and the inner
  setter decodes with its own signature, both outputs pasted.
- `node --test test/*.test.mjs` passes and includes every branch of `revertMessage`, including the bare
  `false` word; `forge test` 36 passed; `forge snapshot --check` exit 0 with no `Diff in`; build free of
  `Warning (` and `warning[`; lint and fmt silent; `git diff --stat origin/main -- src .gas-snapshot
  scripts/forge/Seed.s.sol mk/15-seed.mk` is empty.
- `make fixtures` is idempotent (second run broadcasts nothing) and `make deploy` is unchanged.
- Criterion 9's `grep -rnE '\btip\b|govUrl|about:|ownerKind' app/src` prints nothing.
- `git diff --stat origin/main` names only `app/src/index.html`, `app/src/layout.html`,
  `app/src/theme.css`, `app/src/model.js`, `test/model.test.mjs`, `test/mocks/Mocks.sol`,
  `scripts/forge/Fixtures.s.sol`, `mk/16-fixtures.mk`, `AGENTS.md`, and the handoff.

## Out of scope

- Anything under `src/` and `.gas-snapshot` (the struct is frozen for M02); the named `release` error,
  `PUSH_GAS`, a beneficiaries cap, `SECURITY.md` and the payer-guidance *disposition* — M03.
- `scripts/forge/Seed.s.sol` and `mk/15-seed.mk`: #35 owns them; the fixtures live beside, not inside.
- Submitting through a vault or DAO (M07). v1 is copy-calldata, and the clipboard is the whole feature.
- The post-create "tip the authors" line and the footer link to the DNZN distribution — [#38](https://github.com/dnznlabs/rake/issues/38), default: M05.
- `#/docs`, the widget, criterion 8 — t04.
- Exercising name resolution against a registry — M04. Only the port and the gate are this task's.
- Fixing the `process-compose` TTY-less command (#34): use `make serve`.

## Open questions

- [#38](https://github.com/dnznlabs/rake/issues/38) — the tip line. Default: deferred to M05; gates
  nothing here.

## Context

- Design: `docs/brainstorming/DESIGN_HANDOFF.md` § 3.2 (propose), § 3.4 (create); prototype
  `docs/brainstorming/design/rake-dapp.html` `drawerHTML` 408–425, `vCreate` 450–508, detail actions
  364–405; vocabulary in `design/HANDOFF.md` 31–39.
- Decisions: 1, 2, 6, 7 (owner view and copy-calldata), 9 (`applyQueued`), 10 (sender-bound salts),
  11 (`distribute` for everyone, #26), 13 (name order, #28); carried findings #18, #20, #22.
- Contract: `src/Distribution.sol` — `create` 321–347 and `predict` 351; `distribute` 114, `release`
  137, `propose` 150, `applyQueued` 170 (hash is `keccak256(abi.encode(action, nonce))`), `cancel`
  184; errors and events 32–45. Mocks: `test/mocks/Mocks.sol` (`RevertingReceiver` 8, `MockERC20`
  58 with `Ret.False`).
- Precedent: state-collection `app/src/index.html` 488–514 (send → receipt → `reverted`), 224–279
  (names). t02: `model.js` (`salt`, `decodePending`, `countdown`, `SNAPSHOT_T`), `loadDistro`, the
  `Queued` loader in step 7, `#/create` stub.
- Measured 2026-10-11 on a fresh anvil: `evm_increaseTime` accepts the plain decimal; `eth_call` and
  `eth_estimateGas` reverts carry the selector at `error.data`; `isOwner` on an EOA owner returns `0x`.
