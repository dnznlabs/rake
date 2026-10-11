# M01 — The contract

Status: in progress — phases 1 and 2 done, phase 3 next · updated 2026-10-11

`Distribution` and its factory built from `brainstorming/PROJECT_OVERVIEW.md` § 5 under the eight
rulings in [`ROADMAP.md`](../../ROADMAP.md) § Decisions, every test in the overview's definition of
done (§ 10) passing, a gas snapshot committed, and the factory deployed into `make serve` so M02 has a
chain to read. It comes first because it is the only immutable thing on the roadmap: everything M02
renders is the `snapshot()` struct, so the struct has to be final before a line of UI is wired.

## Acceptance criteria

Every command runs from the repo root through `devbox run --`; versions are the ones `devbox.json`
pins (forge `1.7.1-dev`, which is the 1.7.1 release built by nixpkgs). Measured against `main` at
`948e776` on 2026-10-11: criteria 1–6 all fail today, which is what makes them criteria. **After t01
merged (`main` at `0548391`, same day):** 1, 3 and 4 pass, 2 passes for its seven t01 rows, and 7 holds
for `forge build --force` and `forge test`; 5 and 6 and the rest of 2 and 7 are t02 and t03. **After
t02 merged (`main` at `0bb0403`, same day):** 1, 2 (all nine rows), 3, 4 and 6 pass; 7 holds for
`forge build --force`, `forge test` and `make deploy`; 5, and 7 for `forge snapshot`, are t03. Re-run
rather than quote.

1. `grep '^solc' foundry.toml` prints `solc = "0.8.34"`, and `forge build --force 2>&1` prints
   `Compiler run successful!` with no line matching `Warning (` and none matching `warning[`. Today:
   `solc = "0.8.26"`.
2. `forge test --list --match-contract Distribution` lists one test per definition-of-done item,
   named as the table below says, and `forge test` reports `0 failed` across every suite. Today:
   `No tests found in project!` for that match.

   | Overview § 10 item | Test | Task |
   |:--|:--|:--|
   | rounding (3,333/3,333/3,334) | `test_rounding_3333_3333_3334` | t01 |
   | escrow of a reverting ETH recipient with others paid | `test_escrowRevertingEthRecipientOthersPaid` | t01 |
   | `distribute → release → distribute` keeping `reserved` consistent | `test_distributeReleaseDistributeKeepsReserved` | t01 |
   | cancel-then-apply reverting | `test_cancelThenApplyReverts` | t01 |
   | `setDelay(0)` proposal not shortcutting an already-queued change | `test_setDelayZeroDoesNotShortcutQueued` | t01 |
   | USDT-style no-return token | `test_usdtStyleNoReturnToken` | t01 |
   | reentrancy attempt from a recipient | `test_reentrantRecipientIsEscrowed` | t01 |
   | CREATE2 address stability across chains | `test_create2AddressStableAcrossChains` | t02 |
   | salt front-running rejection | `test_saltFrontRunningRejected` | t02 |

3. `forge inspect Distribution abi --json | jq '.[]|select(.name=="snapshot")|.outputs'` describes
   exactly the struct the design prototype's docs page prints verbatim
   (`brainstorming/design/rake-dapp.html` line 528): `owner address`, `delay uint32`, `nonce uint32`,
   `description string`, `table (account address, bps uint96, name string, note string)[]`,
   `pending (hash bytes32, eta uint256, action bytes)[]`. No `tip`, `url` or `about` (rulings 1 and 2).
4. `make fmt` exits 0 and `forge lint` prints no finding.
5. `.gas-snapshot` is tracked, `forge snapshot --check` exits 0, and `.github/workflows/ci.yml` runs
   it. Today the file does not exist.
6. With anvil up (`make serve`, or `process-compose -f procs/10-chain.yml up -t=false` where there is
   no TTY), `make addresses` lists `DistributionFactory` with no `(no code …)` note and does not list
   `Counter`; `cast call <factory> "implementation()(address)" --rpc-url http://127.0.0.1:8545`
   returns an address whose `cast code` is non-empty. Today the list is `App` and `Counter`.
7. `git status --porcelain` is empty after `forge build --force`, `forge test`, `forge snapshot` and
   `make deploy`. Today a checkout whose submodules were not initialised ends with `?? foundry.lock`.

## Out of scope

- The dapp and the widget, and any change under `app/` or to `App.sol` beyond compiling it under the
  new solc — M02. One exception, measured 2026-10-11: `app/build.mjs` refuses a bundle with an
  unresolved token and the scaffold's placeholder page reads `__COUNTER__`, so t02 swaps that page's
  `Counter` rows for the factory when `Counter` goes — otherwise `make deploy`, and with it
  `make serve`, stops working. Nothing else under `app/` moves before M02.
- The `PUSH_GAS` measurement against a multisig.software clone and a Safe (overview § 6). M01 ships the
  draft constant `100_000`, labelled as a draft; M03 closes the measurement, before anything is
  deployed. The independent review and `SECURITY.md` — M03.
- ERC-1363 `transferAndCall`. `ROADMAP.md` § Not on the roadmap: only if the M03 review is scoped to
  include it, and it is not yet scoped.
- Any network other than anvil — M04.
- `App.lock()`, and a branch protection rule on `main` — ruled out in `ROADMAP.md`.

## Human-in-the-loop requirements

- ~~A ruling on the contract names.~~ Resolved 2026-10-11: `Distribution` and `DistributionFactory`
  in `src/Distribution.sol`, which is what the plan defaulted to. `ROADMAP.md` ruling 3 now says so.
- Merging three docs PRs and three code PRs. Everything else in this milestone is local to anvil and
  needs no credential, funds or external action.

## Phases

In order; each phase's acceptance checks are the next one's preconditions. One task per phase: the
primitive is one file by design (overview goal 5), and splitting its core across tasks would put the
reentrancy and escrow paths — the two that interact — in different PRs.

### Phase 1 — Toolchain and the primitive

The compiler that the transient-storage lock needs, and `Distribution` tested on its own, instantiated
through a test-side clone so the factory can follow without the core moving.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m01-t01](tasks/m01-t01/TASK.md) | solc 0.8.34 pinned warning-free, `foundry.lock` tracked, CI catching compiler warnings; `src/Distribution.sol` with the seven t01 tests of criterion 2 plus the table, timelock, stipend and implementation-guard tests | done — [#6](https://github.com/dnznlabs/rake/pull/6) merged 2026-10-11; [handoff](tasks/m01-t01/HANDOFF.md). Two ABI names changed from the plan (`ROADMAP.md` decision 9); one spec claim amended (`ROADMAP.md` § Findings carried forward) |

### Phase 2 — Factory and the dev chain

A distribution reaches an address the same way on every chain, and `make serve` brings one up.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m01-t02](tasks/m01-t02/TASK.md) | `DistributionFactory` in the same file: CREATE2, PUSH0 clones, sender-bound salt, `implementation` deployed in the constructor, `predict`; the two t02 tests of criterion 2 and the t01 suite re-pointed at `create`; `scripts/forge/Deploy.s.sol` deploys the factory and `Counter.sol` with its test and deploy go; criteria 3 and 6 | done — [#11](https://github.com/dnznlabs/rake/pull/11) merged 2026-10-11; [handoff](tasks/m01-t02/HANDOFF.md). Three open questions took their defaults, each pinned by a test; open salts (question 2) still wants a ruling before M02's create flow. One plan check corrected (`TASK.md` note) |

### Phase 3 — Definition of done

The milestone's remaining checks become machine-enforced.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m01-t03](tasks/m01-t03/TASK.md) | `.gas-snapshot` committed, `forge snapshot --check` in CI, criterion 7 demonstrated on a clean clone, and `AGENTS.md` § Contracts updated for the two new contracts | assigned — plan merged (#10), gate met by #11, issue open |

## One-way doors

None that cannot be undone: nothing leaves anvil. One sticky door, named so it is paid for knowingly —
**merging t01 fixes the `snapshot()` ABI that M02 is built against.** Walked through on 2026-10-11 with
#6; the struct is as criterion 3 says. It stays changeable until M02 starts; after that every struct
change is UI rework as well. The factory's byte-identical deploy
through a deterministic deployer is the real one-way door, and it belongs to M03 and M05, not here.
