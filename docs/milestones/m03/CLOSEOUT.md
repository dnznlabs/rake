# M03 close-out — criteria 1–8 re-run on the final `main`

Run by the architect on 2026-11-07 against `main` at **`3ad48ec`** (the merge of
[#153](https://github.com/dnznlabs/rake/pull/153), m03-t10), forge `1.7.1-dev`, node `v24.12.0`,
every command through `devbox run --` from the repo root. The script is the architect's own
(`tmp/m03-closeout-lakos.sh` in their workspace, not tracked here); every figure below is from that
run, not quoted from a handoff. Where `MILESTONE.md` and this file disagree, `MILESTONE.md` wins.

## Results

| # | Criterion | Result | Evidence |
|:--|:----------|:-------|:---------|
| 1 | Nothing is open | **pass** at merge | `gh issue list --label decision --state open` printed `90` at the time of the run; #90's last input, the salt's low 12 bytes, was ruled `…0001` by Denizen the same day (decision 32, amended) and the close-out PR closes it. Every D1–D17 ruling is in `ROADMAP.md` § Decisions as decisions 20–40, each naming its issue; none was taken by default. |
| 2 | The primitive is what the rulings say | **pass** | `snapshot()` components `["owner","delay","nonce","description","table","pending"]`, unchanged. `claim` and `GRACE` are in `test/fixtures/abi/selectors.txt` (events and errors are not selectors, so `Claimed`, `Expired`, `ForeignChunk` are in `docs/REFERENCE.md` only, where `claim` 1, `Claimed` 1, `Expired` 1, `GRACE` 3 hits). `tools/abi-vectors.sh` run twice leaves `git status --porcelain` empty. `forge test --list --json` counts **91** tests, `DistributionTest` **52**. |
| 3 | Both measurements closed in code | **pass** | `PUSH_GAS = 100_000` at `src/Distribution.sol:59`, measured by `test_realPathPaysASafeAndAVaultClone` and `test_receiveUnderStipend` (m03-t01); `MAX_BENEFICIARIES = 107` at `:72`, pinned by `test_tableCapBoundary`, `test_capRowsStayUnderHalfABlock` and `test_capBloatingRowsStayUnderHalfABlock` (m03-t01, t05). All in the 91. |
| 4 | Review read the final code, `SECURITY.md` dispositions it | **pass**, on the amended wording | `SECURITY.md` names **`94d028c`** as reviewed (8 mentions) and carries **14** rows; `audits/2026-11-06/AUDIT.md` provenance `code commit d07483a… (dirty: no)`, `BLIND.md` maps it to `94d028c`, both leg directories non-empty (`pashov/` 1, `transcripts/` 2). `main` is not that commit: m03-t10 changed three `///` lines after it. Opcode equality re-measured here in a worktree at `94d028c` with the same compiler: `Distribution` and `DistributionFactory` `cmp`-silent with the 53-byte CBOR tail stripped, `App` byte-identical whole. For `#18 #19 #20 #22 #54 #61 #74 #95`: 2 2 1 5 4 1 1 3 hits. `README.md` `AUDIT` cell reads `two-model agent review, 2026-11-06`. "two-model" appears 3 times in `SECURITY.md`. |
| 5 | Stipend claim qualified where made | **pass** | `grep -n '2,300' docs/brainstorming/PROJECT_OVERVIEW.md` → `:61`, the § 5 sentence with its qualifier; `grep -c 'cold' app/src/index.html` → 3. |
| 6 | Runbook rehearsed on two anvils | **pass**, re-run with the real `CREATOR` and the mined salts | Two anvils, `--chain-id 31337` (port 8561) and `31338` (8562), both carrying the proxy in genesis (69 bytes, keccak `0x2fa86add…`). Predicted **offline before any transaction**: `FACTORY` `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B`, `APP` `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`. Landed identical on both; `implementation()` `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` on both; `App` `owner()` the Ops vault, `version()` `v0.1`, `locked()` false. `predict(DNZN_SALT)` with `DNZN_SALT = 0x68e0741D8d693e14BF56914567eADdC130b186eE000000000000000000000001` → **`0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`** on both, code `0x` before the `create`; the `create` sent as the Creator (impersonated on anvil), status 1, 239,624 gas, 45-byte clone at that address, `owner()` the Ops vault, `delay()` 3600, on both. `grep -n 'lock()' RUNBOOK.md` → lines 24, 29, 33, all inside § Not in this runbook (heading at line 9). `git status --porcelain` empty after the broadcasts were removed. |
| 7 | Runbook says what the carried issues require | **pass** | `unrecoverable` 1, `cast code\|eth_getCode` 8, `PUSH0\|cancun` 12; § 1's table carries OP Mainnet, Base, MegaETH and the rest of the eight chains. |
| 8 | Carried out and clean | **pass** | `gh issue list --label carried --label m03 --state open` prints nothing (#127, #148, #149 relabelled `m04` with reasons in § Carried issues at close-out; #150 closed by #153). `git status --porcelain` empty after `forge build --force`, `forge test`, `forge snapshot`, and after `make deploy` then `make chain-doc` on a fresh anvil (`inflated sha256 84b5c766…`, widget 8,043 bytes, status 200). CI on `3ad48ec`: `ci completed success`. |

Gates at `3ad48ec`, for the record: `forge test` 91 passed, node 67, `.gas-snapshot` 91 rows,
`forge snapshot --check` exit 0, `forge build --force` 0 warning lines, `forge fmt --check` exit 0,
`forge lint` no finding. Deployed bytes: `Distribution` **9,271**, `DistributionFactory` **1,320**,
`App` **7,155** (the baseline paragraph's 8,306 / 1,320 / 7,118 at `878dfa3`).

## One instrument error, so nobody repeats it

The first `make deploy` of criterion 8 failed with `Unauthorized()` at the chunk upload. Cause: the
same shell had `export`ed `RUNBOOK.md` § 0 (`OWNER` = the Ops vault) for criterion 6, and
`make deploy` honours `OWNER`, so the dev `App` was owned by the vault and anvil's account could
not upload. Re-run with `OWNER` unset: clean. The runbook is right to make `OWNER` required; the
lesson is that criterion 6's environment and criterion 8's are different shells.

## The third review and the metadata clause

Criterion 4's text said the reviewed commit is `main` "or an ancestor of it whose diff to it touches
nothing under `src/`". After m03-t10 the literal diff reports `src/Distribution.sol` (three NatSpec
lines). The criterion is amended at this close-out to say what it meant: opcode bytes equal, only the
compiler's metadata block may differ, and the handoff that moves a comment proves it by the strip
and compare above. The ruling and the measurement are both in `SECURITY.md` § The reviewed commit.

## Handed to M04

- **`src/` is final at `3ad48ec`.** Both salts are mined against it (`RUNBOOK.md` § 0); any `src/`
  byte after this is a new factory address and a new mining run (decision 5).
- **DNZN's predicted address is `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`**, the same on every
  chain where the factory is at `0x00D18B5b…` and the `create` is sent by the Creator key with
  `DNZN_SALT` above. Posted to `state-collection`'s tracker for its M4 payee gate:
  [state-collection#74](https://github.com/dnznlabs/state-collection/issues/74).
- Carried, labelled `m04`: #127 (per-chain alias check before the first deploy), #140 (one-creation
  assertion in `build.mjs`), #110 (the chromium note), #148 and #149 (dapp nits from t09), #76 (log
  paging). Plus one docs sentence from decision 23's reaffirmation: the Limits page should name
  balance-falling tokens beside fee-on-transfer ones.
- **Not re-audited:** `src/App.sol`, `scripts/forge/Deploy.s.sol`, `DeployApp.s.sol` were in scope
  on all three runs and no leg raised anything in them; #54 and #22 were missed by every leg on
  every run. Both are inputs to M05's go/no-go on an independent review (D1(b)), not M04 gates.
