# m03-t06 — The runbook

Milestone: [M03](../../MILESTONE.md) · Phase: 4 — The runbook

`RUNBOOK.md` at the repo root is one ordered list, parameterised by network, that puts
`DistributionFactory`, its implementation and `App` at the same addresses on every chain of
criterion 7, and creates DNZN's distribution at the address it predicted before any transaction. It
is rehearsed on two anvils with different chain IDs and every address matches the offline
prediction on both (criterion 6); it says the four things the carried issues require (criterion 7).

**Sequencing.** This task runs beside t04 and before t05 closes, so the bytecode it rehearses is
not final: a `src/` change in t05 moves the factory's init-code hash and with it every address in
§ Rehearsed on anvil. That is by design. The runbook carries a *method* (`cast create2` from a
hash read at execution time) and *variables*; the only addresses written into it as values are
the proxy's and the Ops vault's, which no build changes. The rehearsal records the commit it ran
on, and criterion 6 is re-run at close-out on the final `main` (Phase 5), which is the measurement
that counts. Do not wait for t05.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`; `cast` is not on
the host PATH). Branch `m03/t06-runbook` from `origin/main` at or after `cdfaa0a`. Check hooks
with `ls .git/hooks | grep -v sample` (expect `pre-commit` and `post-commit`); do not run
`make init`. Two anvils are needed in step 8; pick ports nobody else on the VM holds (`ss -ltn`
first — the architect's spikes used 8555 and 8556 on 2026-10-30; another agent's `make serve`
holds 8545).

Every spike below was run by the architect on 2026-10-30 at `cdfaa0a`; the figures are that
commit's and are re-run, not quoted.

1. **The deploy scripts place through the proxy.** Decision 33 names Arachnid's keyless
   deterministic-deployment proxy, `0x4e59b44847b379578588920cA78FbF26c0B4956C`. Foundry routes a
   salted `new` to exactly that address: spiked on an anvil at chain ID 31339,
   `new DistributionFactory{salt: bytes32(uint256(7))}()` inside `vm.startBroadcast()` landed at
   `0x03a434bF3C8892d35015389Ec0a1054e089B0593`, equal to
   `cast create2 --salt 0x…07 --init-code-hash $(cast keccak $(forge inspect DistributionFactory bytecode))`,
   and the broadcast log recorded `transactionType: "CREATE2"` with `to` the proxy.
   - `scripts/forge/Deploy.s.sol`: `new DistributionFactory{salt: salt}()` where
     `bytes32 salt = vm.envOr("FACTORY_SALT", bytes32(0))`. Log the salt beside the two addresses.
   - `scripts/forge/DeployApp.s.sol`: `new App{salt: salt}(owner, ver)` where
     `salt = vm.envOr("APP_SALT", bytes32(0))`. `App`'s address depends on `OWNER` and
     `APP_VERSION` as well as the salt, so the same-address property holds only while those two
     are the same on every chain; the runbook's § 0 says so.
   - Spiked the other way too: `cast send $PROXY "${SALT}${INIT#0x}"` with the 9,978-byte init
     code placed the factory and `App` (constructor args ABI-appended) at the predicted
     addresses, so a raw send is the fallback if a script ever cannot run. The runbook uses the
     scripts; the fallback is one sentence in § 1.
   - `mk/10-forge.mk`: `DEPLOYED` selects `transactionType=="CREATE"`; it must also accept
     `"CREATE2"` or `make addresses` and the `deploy::` guard both go blind
     (`select(.transactionType=="CREATE" or .transactionType=="CREATE2")`). Rewrite the guard's
     comment: the factory is no longer "placed by plain CREATE from the deployer's nonce"; the
     reason a second deploy is refused is now #22's — a CREATE2 collision through the proxy burns
     the forwarded gas before anything reverts.
   - The implementation needs no change: `implementation = address(new Distribution{salt: bytes32(0)}())`
     (`src/Distribution.sol:346`) is already a CREATE2 from the factory, so it follows the factory's
     address. Nothing under `src/` moves.

   Check: `make serve` still brings a dev chain up (anvil ships the proxy at the canonical address
   by default — `cast code 0x4e59…956C` on a fresh anvil is 69 bytes; `--disable-default-create2-deployer`
   is the flag that would remove it); `make addresses` lists `DistributionFactory` and `App`;
   `git diff --stat -- src/` prints nothing; `forge test` → 63 passed; `forge snapshot --check`
   exit 0; `forge fmt --check` and `forge lint` silent.

2. **Audit-scope notice.** `Deploy.s.sol` and `DeployApp.s.sol` are two of the four files in
   `audits/SCOPE` (decision 29), and t04's legs read them at `ede55c3`. Step 1 changes both after
   that reading. The PR description names the two diffs under a heading `Audit scope touched`,
   and the handoff § For t05 lists them so t05's single-leg re-check reads them with its own diff;
   if t05 retires on a clean review, the architect reads them at this PR's review and
   `SECURITY.md` § What the review did not cover names the salted placement. Criterion 4's letter
   (`src/` untouched since the review commit) is met either way; this step is what keeps its
   spirit.

   Check: the PR body has the heading; `HANDOFF.md` has § For t05 with both paths.

3. **`RUNBOOK.md`, the shape.** Model it on `state-collection`'s (`~/src/state-collection/RUNBOOK.md`
   — or Elanik's own clone of it): a header stating what it ends with, then in this order:
   - **§ Not in this runbook.** `lock()` is never sent; it is M05's after mainnet has been watched.
     The word `lock()` appears in this file only in this section, and the section says so with the
     check `grep -c 'lock()' RUNBOOK.md` (criterion 6's grep). Renouncing or transferring `App`'s
     ownership and any distribution owner change are likewise not here.
   - **§ 0 — variables.** Every command parameterised by these and nothing else; bash, because
     one gate reads `${PIPESTATUS[0]}`:
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
     `OWNER` is one value for every chain on purpose, as `state-collection`'s `PAYEE` is: there is
     no second constant to pick the wrong one of. The Ops vault exists on Ethereum and Sepolia
     only today (handbook § Vaults); what `OWNER` is on the other six chains is open question 1
     below, and the runbook carries its ruling as one line under this variable. `CREATOR` is a
     placeholder until #90 names the address; the rehearsal uses anvil's first account for it and
     says so. The creator key's two conditions are referenced to the handbook
     (`docs/multisig-transactions.md` § The DNZN Creator key), not restated.
   - **§ 1 — the chains.** One table, every chain DNZN's distribution is expected to reach:
     M04's two testnets, M05's four mainnets, M05's stretch row. Columns: chain, ID, RPC, proxy
     present (bytes, keccak), EVM. All eight were read by the architect on 2026-10-30, every one
     69 bytes with keccak `0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989`:

     | chain | ID | RPC read from |
     |:------|---:|:--------------|
     | Ethereum | 1 | `https://ethereum-rpc.publicnode.com` |
     | OP Mainnet | 10 | `https://mainnet.optimism.io` |
     | Base | 8453 | `https://mainnet.base.org` |
     | Arbitrum One | 42161 | `https://arb1.arbitrum.io/rpc` |
     | MegaETH | 4326 | `https://mainnet.megaeth.com/rpc` |
     | Robinhood Chain | 4663 | `https://robinhood-rpc.publicnode.com` |
     | Sepolia | 11155111 | `https://ethereum-sepolia-rpc.publicnode.com` |
     | Base Sepolia | 84532 | `https://sepolia.base.org` |

     Below the table, the EVM sentence criterion 7 greps for: `foundry.toml` builds for `cancun`
     and the clone bytecode is solady's PUSH0 proxy (`docs/REFERENCE.md:110-116`), so a chain
     that cannot execute PUSH0 or transient storage cannot run this code; step 1's simulated
     deploy is how the runbook proves it per chain. The raw-send fallback sentence from plan
     step 1 goes here.
   - **§ 2 — the steps**, each a fenced block of commands with the value it must print and a
     `record:` line for § Record. Plan steps 4–7 specify them.
   - **§ Record.** The table the executor fills per chain: commit, forge version, node version,
     the four addresses, the chunk pointers, the `inflated sha256`, the tx hashes.
   - **§ Rehearsed on anvil.** Filled by step 8.

   Check: `grep -n '^## ' RUNBOOK.md` lists exactly those sections in that order.

4. **Step 1 of the runbook — preflight, nothing broadcast.** In order:
   - toolchain asserted (`forge --version | head -1` → `1.7.1-dev`; `node --version`), tree clean
     (`git status --porcelain | wc -l` → 0), `git rev-parse HEAD` recorded;
   - the gates: `forge build --force 2>&1 | tee` with `${PIPESTATUS[0]}` 0 and
     `grep -c 'warning\[' ` 0; `forge test` 63 passed; `forge snapshot --check` exit 0;
   - the proxy: `cast code $PROXY --rpc-url "$RPC"` is 69 bytes and
     `cast keccak <that>` equals the hash in § 1. Anything else: stop; decision 33's fallback is
     the Safe singleton factory and a different runbook, not an improvisation here;
   - the sender check decision 33 requires, verbatim from the milestone row:
     `grep -rn 'tx.origin' src/` prints nothing and `grep -n 'msg.sender' src/App.sol` prints
     nothing (both empty at `cdfaa0a`); `Distribution.sol`'s `factory = msg.sender` is the one
     constructor read and it runs under the factory, not the proxy. A hit means a constructor
     would see the proxy as its sender, and the deploy stops;
   - the chain executes the bytecode: `cast call --rpc-url "$RPC" --create "$(forge inspect DistributionFactory bytecode)"`
     returns the factory's 1,320-byte runtime (the constructor runs `new Distribution`, whose
     bytecode is cancun/PUSH0, so success is the EVM check). Spiked on Base Sepolia and Robinhood
     Chain: 1,320 bytes, starting `0x6080604052600436…`; `cast estimate --rpc-url "$RPC" --create …`
     printed 2,220,198 on Base Sepolia, which is also the gas figure to record;
   - the prediction, offline:
     ```sh
     INIT=$(forge inspect DistributionFactory bytecode)
     FACTORY=$(cast create2 --deployer $PROXY --salt $FACTORY_SALT --init-code-hash $(cast keccak $INIT))
     AINIT=$(forge inspect App bytecode)$(cast abi-encode 'c(address,string)' $OWNER $APP_VERSION | cut -c3-)
     APP=$(cast create2 --deployer $PROXY --salt $APP_SALT --init-code-hash $(cast keccak $AINIT))
     ```
     `cast create2` prints the address alone on its last line. At `cdfaa0a` with zero salts and
     `OWNER` anvil's first account the architect's spike gave factory
     `0x2cF9C0d93F88A7d1A5C2EE26E1739Edb24cb7a18` — a figure that moves with the bytecode, which
     is why it is predicted here and never copied;
   - the collision check (#22): `cast code $FACTORY --rpc-url "$RPC"` and `cast code $APP …`
     both print `0x`. Code at either means this chain already carries the deploy, and the runbook
     says what that means (the record for this chain is already written; go to step 5) rather
     than resending.

   Check: the runbook's step 1 ends with every command above and the value each must print.

5. **Steps 2 and 3 of the runbook — the factory and `App`.**
   ```sh
   FACTORY_SALT=$FACTORY_SALT forge script scripts/forge/Deploy.s.sol --rpc-url "$RPC" --broadcast $SIGNER
   cast call $FACTORY "implementation()(address)" --rpc-url "$RPC"      # record as IMPL
   OWNER=$OWNER APP_VERSION=$APP_VERSION APP_SALT=$APP_SALT forge script scripts/forge/DeployApp.s.sol --rpc-url "$RPC" --broadcast $SIGNER
   cast call $APP "owner()(address)" --rpc-url "$RPC"                   # must equal OWNER
   cast call $APP "version()(string)" --rpc-url "$RPC"                  # must equal APP_VERSION
   cast call $APP "locked()(bool)" --rpc-url "$RPC"                     # must be false, and stays false
   ```
   The script's logged `DistributionFactory` address must equal the `FACTORY` predicted in step 1;
   the logged `App` must equal `APP`. Write the reason the owner read-back exists: `App` takes its
   owner as a constructor argument (`src/App.sol:43`), so the proxy being `msg.sender` is
   harmless; an `Ownable(msg.sender)` pattern would leave it owned by the proxy forever, with
   `lock()` unreachable, and the read is what would catch a future change to that.

   Check: the runbook's steps 2 and 3 carry those commands, the two equalities and the three reads.

6. **Step 4 of the runbook — the document.** `make dapp-nodev` against `CHAIN_ID` (the bundle
   that ships; a dev bundle on chain reads through its `?rpc=` override and never reaches a
   wallet — `mk/30-onchain.mk`'s comment), then
   `APP=$APP forge script scripts/forge/Chunks.s.sol --rpc-url "$RPC" --broadcast $SIGNER`, then
   `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID` and the equality
   t03's handoff § Criterion 8 shows: `inflated sha256` equals `sha256sum app/dist/index.html`,
   `widget sha256` equals `sha256sum app/dist/widget.js`, byte counts both ways. Record the chunk
   pointers. `make deploy` is **not** used on a public chain: its later recipes run `Seed.s.sol`,
   `Fixtures.s.sol` and a dev build, all dev-chain only (decision 29).

   Step 5 — explorer verification, **named, not run**: the `forge verify-contract` invocation for
   each of the three contracts with `--constructor-args` for `App`, and the sentence that M04
   executes it and records the explorer links. No key is needed to write the command.

   Step 6 — DNZN's `create`. The signer is the DNZN Creator key (`SIGNER` re-exported to it; the
   runbook says this is the one step that key signs, referencing the handbook's two conditions).
   First `DISTRO=$(cast call $FACTORY "predict(bytes32)(address)" $DNZN_SALT --rpc-url "$RPC")`,
   then `cast code $DISTRO --rpc-url "$RPC"` must print `0x` (#22, the second place it is
   checked), then the `create(address,uint32,string,(address,uint96,string,string)[],bytes32)` send with
   `OWNER`, the delay, the description and the table as § 0 variables added for this step —
   their M05 values (the 60/40 table) are M05's to fill; the runbook carries them as variables
   with the rehearsal's placeholder values marked as such. Read back `owner()` on `DISTRO` equal to
   `OWNER`. Then the sentence #23 requires, with the word `unrecoverable`: the creator key is part
   of this address on every chain; a chain not reached while the key is live can never carry this
   distribution at this address, so the `create` is done once per chain in § 1's table while the
   key is live, and the key is backed up to the handbook's standard before step 6 runs anywhere.

   Step 7 — stop. Nothing closes; § Not in this runbook is the authority.

   Check: criterion 7's four greps on `RUNBOOK.md` are non-empty —
   `grep -ci 'unrecoverable'`, `grep -c 'cast code\|eth_getCode'`, `grep -c 'PUSH0\|cancun'`, and
   the § 1 table has eight rows.

7. **Two docs lines.** `README.md`: the quick-start list gains `RUNBOOK.md` beside `make serve`,
   one line; `docs/ROADMAP.md` is not touched (the milestone row and decision 33 already say what
   this task does). `AGENTS.md` § The dapp stays as is — #110 is t04's close-out row, not this
   task's.

   Check: `grep -c RUNBOOK README.md` ≥ 1; `git diff --stat -- docs/ROADMAP.md AGENTS.md` prints
   nothing.

8. **The rehearsal, criterion 6 verbatim.** Two anvils, `--chain-id 31337` and `--chain-id 31338`,
   on two spare ports. On each, first `cast code $PROXY` (69 bytes — anvil predeploys it; if a
   future anvil does not, `cast rpc anvil_setCode $PROXY <runtime>` with the 69 bytes read from
   any chain in § 1 is the step, and the runbook's § Rehearsed on anvil says which happened). Then
   run §§ 1–7 start to finish on both with the same `OWNER` (anvil's first account standing in for
   the vault), `APP_VERSION`, salts and `DNZN_SALT` (its top 20 bytes the signing account's,
   decision 10). Record in `RUNBOOK.md` § Rehearsed on anvil and in the handoff, for both chains:
   the commit, the predicted and landed `FACTORY` (equal, and equal across the two chains), `IMPL`
   (equal across the two), `APP` (equal across the two), `predict($DNZN_SALT)` (equal across the
   two and equal to the `DISTRO` the create landed), the chunk pointers, `inflated sha256`, and
   every tx hash. `grep -c 'lock()' RUNBOOK.md` hits only in § Not in this runbook.
   `broadcast/*/31337/` and `31338/` are gitignored; nothing from the rehearsal is committed
   except the two documents.

   Check: the handoff quotes both runs; `git status --porcelain` is empty after
   `forge build --force`, `forge test`, `forge snapshot`, `make deploy` (on one of the anvils) and
   `make chain-doc`.

9. **`HANDOFF.md`** from the template: AC table with evidence, § For t05 (step 2), § Deviations,
   § Discoveries, § Open questions. The PR description carries `Audit scope touched` (step 2),
   `Carries forward: #22, #23` (both closed by this PR — their closing conditions are the runbook
   sentences in step 6) and `Closes #22, #23`.

## Acceptance criteria

- M03 criterion 6, run by the reviewer on two fresh anvils from the runbook alone: the factory
  lands at the address predicted offline before any transaction, the same on both chains;
  `implementation()` the same on both; `predict($DNZN_SALT)` the same on both and equal to the
  `DISTRO` the create landed; `App` deployed by the same list; `grep -c 'lock()' RUNBOOK.md` hits
  only inside § Not in this runbook.
- M03 criterion 7: `grep -ci 'unrecoverable' RUNBOOK.md`, `grep -c 'cast code\|eth_getCode' RUNBOOK.md`,
  `grep -c 'PUSH0\|cancun' RUNBOOK.md` all ≥ 1, and § 1's table lists the eight chains with IDs.
- `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` prints nothing; `forge test`
  63 passed; `forge snapshot --check` exit 0; `forge fmt --check` and `forge lint` silent; `node --test test/*.test.mjs` 62 passed.
- `make serve` on a fresh anvil deploys and `make addresses` lists `DistributionFactory` and `App`
  with code (the `DEPLOYED` filter accepts `CREATE2`).
- The PR description has an `Audit scope touched` heading naming `Deploy.s.sol` and
  `DeployApp.s.sol`, and `HANDOFF.md` § For t05 names them with both paths of plan step 2.
- #22 and #23 close on merge, each by a sentence in `RUNBOOK.md` the reviewer can point at.
- `git status --porcelain` empty after the criterion-8 sequence on one of the rehearsal anvils.

## Out of scope

- Anything under `src/`, `test/*.t.sol` or `.gas-snapshot`. The contract is t04's input and t05's
  output; a change here re-opens the review.
- Running the runbook on any public network, verifying on any explorer, funding or using the
  DNZN Creator key — M04. The key's address is #90's to name; this task uses a placeholder.
- Vanity-mining `FACTORY_SALT` or `APP_SALT` — open question 2; this task uses the zero salt and
  the runbook takes the salt as a variable, so a mined value is a one-line change at M04.
- `lock()`, ownership renounce or transfer on `App` or any distribution — M05, § Not in this runbook.
- `SECURITY.md`, `audits/`, `AGENTS.md` § The dapp (#110), the overview — t04 and close-out.
- `Seed.s.sol`, `Fixtures.s.sol`, the dapp, the widget, `procs/` — none needs a change; if one
  turns out to, say so in the handoff and stop.

## Open questions

1. **Question.** What is `OWNER` — `App`'s owner and the owner passed to `create` — on the six
   chains where the Ops vault does not exist (Base, Arbitrum One, OP Mainnet, MegaETH, Robinhood
   Chain, Base Sepolia)?
   **Options.** (a) Denizen's own EOA `0x357836fFcB45307FA7ff2A574F505753c961902B` on those
   chains, transferred to a vault once one exists there (`App` is `Ownable`; a distribution's
   owner changes through the two-step, decision 21): nothing to deploy first, one more line in
   the runbook, and `App`'s address then differs between chains with and without a vault, since
   `OWNER` is in its init code. (b) Deploy the Ops vault to every target chain first, at its
   mainnet address, so `OWNER` is one value everywhere: same-address `App` on all eight, but a
   vault deployment per chain is `multisig`'s runbook and a prerequisite M04 does not have today.
   (c) One value everywhere by making `OWNER` the EOA on every chain including Ethereum, and
   handing to the vault afterwards: same-address `App`, but two handovers on the chains that
   have a vault already.
   **Recommendation.** (b) if the vault's placement is a salted deploy the org can run in M04
   with no new key; otherwise (a). `App` being same-address is a convenience the roadmap never
   promised (decision 5 promises it for distributions, which it keeps either way, since `OWNER`
   is not in a clone's address).
   **Default and deadline.** (a). Gates nothing in this task — the rehearsal uses one anvil
   account as `OWNER` on both chains — but the runbook's § 0 line under `OWNER` is written from
   the ruling, and M04 cannot start without it. Deadline: the day this task's PR opens.
   **Record.** `ROADMAP.md` § Decisions; issue [#114](https://github.com/dnznlabs/rake/issues/114).

2. **Question.** Are `FACTORY_SALT` and `APP_SALT` zero, or mined for a vanity prefix like the
   vaults' (`0x00b6…`, `0x00c0…`, `0x00000000a7…`)?
   **Options.** (a) Zero: nothing to do, the address is whatever the final bytecode gives. (b)
   Mined with `cast create2 --starts-with <hex>` against the final init-code hash: seconds for
   four hex digits, hours for eight; the mined salt is tied to one bytecode, so it is mined once,
   after t05 lands and before M04's first public deploy, and a later contract change needs a new
   mine.
   **Recommendation.** (b) at four to six hex digits, mined at M04 from the final `main`; the
   runbook already takes the salt as a variable, so this task costs nothing either way.
   **Default and deadline.** (a) for this task's rehearsal in every case; the ruling decides what
   M04 exports before step 1. Deadline: M04's scoping.
   **Record.** `ROADMAP.md` § Decisions; issue [#115](https://github.com/dnznlabs/rake/issues/115).

## Context

- `docs/milestones/m03/MILESTONE.md` § Acceptance criteria 6, 7 and 8; § Human-in-the-loop D12
  and D13; § One-way doors 1 and 2 (the factory's address and the creator key are both permanent).
- `docs/ROADMAP.md` § Decisions 5 (a new version is a new factory), 10 (sender-bound salts), 29
  (audit scope includes the two deploy scripts), 32 (the creator key), 33 (the keyless proxy, and
  the preflight it requires).
- `~/src-lakos/handbook/docs/multisig-transactions.md` § Vaults (the Ops address and the chains it
  exists on) and § The DNZN Creator key (the two conditions the runbook references).
- `state-collection`'s `RUNBOOK.md` — the shape: § Not in this runbook, § 0 variables, numbered
  steps with `must print` lines, § Record, § Rehearsed on anvil.
- `docs/milestones/m03/tasks/m03-t03/HANDOFF.md` § Criterion 8, re-run — the chain-doc equality
  as it is checked.
- [#22](https://github.com/dnznlabs/rake/issues/22), [#23](https://github.com/dnznlabs/rake/issues/23)
  — closed by this task; [#90](https://github.com/dnznlabs/rake/issues/90) — still owes the
  creator address.
