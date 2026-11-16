# m04-t03 — The runbook, for real: Sepolia and Base Sepolia

Milestone: [M04](../../MILESTONE.md) · Phase: 2 — The runbook, for real

When this is done, `RUNBOOK.md` steps 1–5 have been executed start to finish on Sepolia (11155111)
and then on Base Sepolia (84532), by the engineer, with Elanik's agent wallet: the factory at
`0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B`, its implementation at
`0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0`, `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`
owned by the Ops vault and unlocked, the per-chain `dapp-nodev` bundle uploaded and hash-equal to what
`html()` serves, and all six contracts verified on their explorers. Every `record:` line of the runbook
is filled from the chain, every deviation the runbook meets is a change to `RUNBOOK.md` in the same
PR, and `RUNBOOK.md` gains § Executed on testnets. Step 6, DNZN's `create`, is **not** this task's:
the handoff hands it to Denizen as one exact command per chain with decision 42's values. Nothing
under `src/` moves; if a step here needs a `src/` byte, stop — that is M03 reopened.

**These transactions are public and permanent, at the addresses M05 will use.** There is no
redeploy: a mistake at step 2 or 3 is a collision for ever on that chain (#22), which is why the
runbook predicts before it sends and checks `cast code` at every address first. Read
`RUNBOOK.md` § Not in this runbook and § 2 whole before the first command.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, node from
`devbox.lock`), in bash, as `RUNBOOK.md` says (`${PIPESTATUS[0]}`). Branch `m04/t03-testnets` from
`origin/main` at or after `9eed049` (the merge of #164; the bundle step 4 uploads is t01's). Check
hooks with `ls .git/hooks | grep -v sample`. Work in one shell per chain with `RUNBOOK.md` § 0
exported exactly as written there, plus:

```sh
export SIGNER="--account elanik --password-file $HOME/.config/elanik-wallet/keystore.pass --sender 0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d"
```

`forge script` takes `--account`, `--password-file` and `--sender` (checked against `forge script
--help` on 2026-11-07); `cast send` takes `--account`, `--password-file` and `--from`. The
keystore and password file are the handbook's (`docs/agent-backup-and-restore.md` step 6). Never
`--unlocked` on a public chain; never the Creator key for anything but step 6, which is not yours.
Figures below were read on 2026-11-07; re-run rather than quote.

0. **Gates before any transaction, both chains.**
   - Funding: `cast balance 0x5A158aF8… --ether --rpc-url $RPC` ≥ **0.05** on Sepolia and ≥ **0.01**
     on Base Sepolia (funded 2026-11-07 15:30: **0.1049** Sepolia and **0.0100** Base Sepolia — the
     latter exactly at the gate, enough for 14.7 M gas at today's 0.005 gwei a hundred times over,
     but say so in the handoff if the base fee rises). The Creator key `0x68e0741D…` needs ≥ 0.005 on each for Denizen's step 6 (funded
     2026-11-07: 0.01 and 0.01); read it and record it, it is not yours to fund.
   - `ETHERSCAN_API_KEY` lives in the org's shared env file, `../shared/.envrc.local`
     (`/mnt/bigdata/shared/.envrc.local`, mode 664, user `openclaw`), which this repo's `.envrc`
     already names (`source_env_if_exists ../shared/.envrc.local`) — for **direnv**, which only an
     interactive shell with the hook runs; a tool shell and `devbox run` see nothing from it,
     measured 2026-11-07. So at the top of each chain's shell: `set -a; . ../shared/.envrc.local;
     set +a`, then `[ -n "$ETHERSCAN_API_KEY" ]`. **That file also exports `ETH_RPC_URL`**, which
     `cast` and `forge` take as the default `--rpc-url`: after sourcing it, every command carries an
     explicit `--rpc-url "$RPC"`, as the runbook writes them — a bare `cast` would talk to whatever
     that variable names, not your testnet. Never echo the key, never commit it; the handoff names
     its last four characters only. (`forge verify-contract` reads the variable itself; `-e` is not
     needed.)
   - Base fee: `cast base-fee --rpc-url $RPC` — record it; if above **20 gwei** on Sepolia, wait for
     a quieter hour before step 2 and again before step 4 (risk 4). Read 2026-11-07: 22 wei on
     Sepolia, 0.005 gwei on Base Sepolia.
   - Nothing at the three addresses yet: `cast code` at `FACTORY`, `APP` and the predicted
     `DISTRO` prints `0x` on both chains (true 2026-11-07). Code at any of them means someone ran a
     step already — stop and find out who.
   - t02 passed (#163 merged, `make gateway-check` green on anvil) and t01 merged (#164): the
     bundle you upload is the one that reads a capped provider.
   - **t06 merged with no `fix` row** (added 2026-11-07): Slither over `src/` and the two shipped
     scripts, every result dispositioned in `SECURITY.md` § Static analysis, `make slither` exit 0
     on `main`. Its handoff's last line says whether anything was a `fix`; if it was, this task does
     not start until the architect has taken it to Denizen. Run `devbox run -- make slither` once
     yourself at step 1a and record the exit code beside the commit.

   Check: the six readings per chain in the handoff § Gates, dated.

1. **Sepolia, steps 1a–1g.** Exactly as `RUNBOOK.md` § 2 Step 1, in order: toolchain and clean tree
   (record the commit); the gates (`forge build --force` with the two warning greps, `forge test`,
   `forge snapshot --check`); the proxy at `0x4e59b448…` (69 bytes, keccak `0x2fa86add…` — present on
   both chains, read 2026-11-07); the sender check greps; `cast call --create` and `cast estimate
   --create` of the factory init code (the EVM proof; record the estimate); the offline prediction
   of `FACTORY` and `APP` with the two init-code hashes (must equal `0xd8a1208a…` and `0x0b2894a3…`,
   the figures `RUNBOOK.md` § 0 names — if either differs, the tree is not `main`'s `src/`: stop);
   the collision check. Also the three alias commands of § 1 for this chain, re-run and recorded
   (the row says `none`, measured 2026-11-01; a re-reading is cheap and the table asks for it on a
   chain whose row predates its last upgrade).

   Check: § Record rows 1a–1f and the § 1 row filled, from the chain, before anything is sent.

2. **Sepolia, steps 2 and 3.** `Deploy.s.sol` with `FACTORY_SALT` through the proxy; the logged
   `DistributionFactory` **must equal** the 1f prediction or stop; `implementation()` read back.
   Then `DeployApp.s.sol` with `OWNER`, `APP_VERSION`, `APP_SALT`; the logged `App` equal to the
   prediction; `owner()` the Ops vault, `version()` `v0.1`, `locked()` `false`. Record each
   transaction hash and `gasUsed` **with `cast receipt`**, not from `run-latest.json` (#140; the
   broadcast log is read only by `make dapp-nodev` for the factory's block, where its one-creation
   shape makes it safe). Anvil figures for scale: factory 2,262,485 gas, `App` 1,648,295.

   Check: `cast code` at both addresses non-empty and `App`'s runtime equal to `forge inspect App
   deployedBytecode` byte for byte; the factory's equal outside its three `immutableReferences`
   spans (m03-t10's handoff shows the comparison).

3. **Sepolia, step 4 — moved to m04-t08 (decision 44, amended 2026-11-08).** `App.owner()` is the
   Ops vault on every public chain and `addChunk`/`setChunks` are `onlyOwner`, so `Chunks.s.sol`
   broadcast from the engineer's key reverts `Unauthorized` — found by this task on both chains
   (#178). The upload is five Ops-vault calls per chain that Denizen signs; preparing and verifying
   them is [m04-t08](../m04-t08/TASK.md). This task records step 4 as "prepared by t08, awaiting
   Denizen" in § Executed on testnets and does not build or upload the bundle.

4. **Sepolia, step 5 — explorer verification.** The three `forge verify-contract` commands of
   `RUNBOOK.md` Step 5 with `--chain 11155111 --watch`, `App` with its ABI-encoded constructor
   arguments. Each exits 0; then read the explorer's `getsourcecode` for each address and record the
   three `#code` URLs. A verification that fails for an explorer-side reason is recorded with the
   verbatim error and does not block the chain's remaining steps (risk 5); the architect decides
   at review whether criterion 2 is amended.

   Check: three URLs in the handoff, each showing the contract name.

5. **Base Sepolia, steps 1–3 and 5**, the same list with `CHAIN_ID=84532`, `RPC=https://sepolia.base.org`
   and its explorer. Same addresses must come out of 1f — that is the point — and the same
   collision check must print `0x` first. Note `sepolia.base.org` caps `eth_getLogs` at 200 blocks;
   nothing in steps 1–5 reads logs, so it does not bite here. Explorer verification goes through
   Etherscan's v2 API with the same key (Basescan is Etherscan-family); if forge's chain table
   needs `--verifier-url`, say which.

   Check: as steps 1, 2 and 4 above, per chain.

6. **`RUNBOOK.md`, amended by what happened.** Every deviation you met is either a change to the
   runbook's text in this PR or a one-line reason it is not (criterion 7). Add § Executed on
   testnets after § Rehearsed on anvil: one § Record table per chain, filled; the explorer URLs; the
   base fees paid; the two bundles' hashes; the Creator key's balance as read; and a sentence that
   step 6 is Denizen's and its two values are decision 42's. Do not touch § 0 (M05's values are not
   these) and do not write step 6's `record:` rows — they are filled when it runs.

   Check: `git diff --stat origin/main -- RUNBOOK.md` non-empty, and the handoff § Deviations lists
   each with its runbook hunk or its reason.

7. **The step 6 handoff for Denizen.** In `HANDOFF.md` § For Denizen — step 6, per chain, the
   complete command with decision 42's values and nothing to fill in:

   ```sh
   export RPC=<this chain's>; FACTORY=0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B
   DNZN_SALT=0x68e0741D8d693e14BF56914567eADdC130b186eE000000000000000000000001
   DISTRO=$(cast call $FACTORY "predict(bytes32)(address)" $DNZN_SALT --rpc-url "$RPC")   # 0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f
   cast code $DISTRO --rpc-url "$RPC"                                                      # must print 0x
   cast send $FACTORY \
     'create(address,uint32,string,(address,uint96,string,string)[],bytes32)' \
     0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790 86400 "DNZN // FEE DISTRIBUTION" \
     '[(0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9,1000,"Treasury",""),(0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790,3000,"Ops",""),(0x357836fFcB45307FA7ff2A574F505753c961902B,6000,"Creator","")]' \
     $DNZN_SALT --rpc-url "$RPC" --account dnzn-creator --from 0x68e0741D8d693e14BF56914567eADdC130b186eE
   cast call $DISTRO "owner()(address)" --rpc-url "$RPC"     # the Ops vault
   cast call $DISTRO "delay()(uint32)" --rpc-url "$RPC"      # 86400
   ```

   The table is in `_set`'s ascending address order (Treasury, Ops, then `0x3578…`), which is not
   the order #157 listed; the row named `Creator` is Denizen's own address, not the Creator key —
   decision 42 says so and this section repeats it in one line, because the key that signs is the
   thing a reader could confuse it with. Rehearse the exact string against the dev anvil once
   (`make serve`, then the same `cast send` with `--unlocked --from` anvil's first account and a
   salt prefixed by it) so the table parses before Denizen types it; record that rehearsal's
   `DISTRO` and `owner()`.

   Check: the section exists with both chains' commands and the anvil rehearsal's receipt.

8. **`HANDOFF.md`**: the AC table with chain-read figures, § Gates,
   § Deviations, § For Denizen — step 6, and § For t04 (the two gateway URLs to measure:
   `https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3link.io/` and `…84532…`, and the
   `App` document hashes per chain).

## Acceptance criteria

- M04 criterion 1 for everything but DNZN's distribution: on both chains, `cast code` at
  `0x00D18B5b…` is the factory runtime (equal to the artifact outside the immutable spans),
  `implementation()` is `0x31dd18b4…`, `cast code` at `0x00A90943…` equals `forge inspect App
  deployedBytecode`, `App.owner()` is the Ops vault, `locked()` false; every hash and `gasUsed` in
  the handoff is from `cast receipt`.
- M04 criterion 2: six `forge verify-contract … --watch` exits 0 (or the verbatim explorer error,
  with the five that passed), six `#code` URLs naming the contracts.
- M04 criterion 3's chain half (`chain-doc` hashes equal the `dapp-nodev` build's) is **m04-t08's**
  (decision 44); here, § Executed on testnets names step 4 as awaiting t08 and `App.locked()` is
  `false` on both chains.
- M04 criterion 7: `RUNBOOK.md` carries § Executed on testnets with both § Record tables filled;
  the handoff § Deviations is empty or every item names its runbook hunk or its reason.
- `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` empty; `forge test` 91; node
  90; `git status --porcelain` empty (the broadcast logs are gitignored; their figures are in the
  handoff and the runbook).
- § For Denizen — step 6 holds both chains' complete commands and the anvil rehearsal of the table
  string; § Gates holds the balances, base fees and `cast code` readings, dated.
- PR closes this task's issue; `Closes #127` **only if** the re-run alias readings for both chains
  are recorded and the architect agrees at review that the mainnet rows (M05's) do not keep it open
  — default: leave #127 open, relabelled `m05` at M04's close-out.

## Out of scope

- **Step 6** on either chain: the Creator key is Denizen's and never lives on this host.
- Any mainnet; any `src/` byte; `lock()`, renounce, any ownership change.
- The hosted gateway and the host page (t04); the UAT (t05).
- Re-mining, re-verifying or re-deploying anything after a mistake: a wrong address on a public
  chain is a stop and a message to the architect, not a retry.

## Open questions

None. Funding and the Etherscan key are inputs, not rulings; step 0 refuses to start without them.

## Context

- `RUNBOOK.md` whole, especially § Not in this runbook, § 0, § 1 and § Record.
- `ROADMAP.md` decisions 5, 10, 32, 33, 35, 37, 42.
- m03-t06 `HANDOFF.md` (the two-anvil rehearsal) and m03-t10 `HANDOFF.md` (the landing with the
  mined salts, the immutable-span comparison, the CREATE2-through-proxy receipt shape).
- M04 `MILESTONE.md` criteria 1, 2, 3, 7 and risks 4, 5; [#127](https://github.com/dnznlabs/rake/issues/127).
- The handbook: `docs/multisig-transactions.md` § The DNZN Creator key; `docs/agent-backup-and-restore.md`
  step 6 (Elanik's keystore and password file).
