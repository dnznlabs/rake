# Rake · roadmap

Proposed 2026-10-10 · approved 2026-10-11 (PR #1)

A fee-splitting primitive: one address per distribution, an on-chain table of beneficiaries, a
public delay on every owner action, and a dapp and widget served from the chain. The spec is
`brainstorming/PROJECT_OVERVIEW.md`; the UI contract is `brainstorming/design/HANDOFF.md`. Where
anything here disagrees with them, they win — except where § Decisions records a ruling that
supersedes them.

Milestones run in order. A milestone is done when every acceptance criterion in its `MILESTONE.md` is
demonstrably met — a command someone else can run and watch pass, not a judgement call.

| Milestone | Goal | Status |
|:----------|:-----|:-------|
| [M01 — The contract](milestones/m01/MILESTONE.md) | `Distribution` + factory built from the overview, every test in the definition of done passing, gas snapshot committed, deployed into `make serve` | in progress — t01 merged 2026-10-11 (#6) |
| [M02 — Dapp and widget on anvil](milestones/m02/MILESTONE.md) | The design prototype rebuilt on DNZN Base, reading `snapshot()` and sending the six writes, hosted by `App` and served end to end from a local chain | not started |
| [M03 — Hardening and deploy readiness](milestones/m03/MILESTONE.md) | Independent security review dispositioned in `SECURITY.md`, the open measurements closed, and a runbook for a same-address deploy on every target chain | not started |
| [M04 — Testnets](milestones/m04/MILESTONE.md) | The runbook executed on Sepolia and Base Sepolia, the dapp read through a `web3://` gateway, the widget embedded on a test host, and Denizen accepts it from a browser wallet | not started |
| [M05 — Mainnet](milestones/m05/MILESTONE.md) | The runbook on Ethereum, Base, Arbitrum and OP Mainnet at one address, with MegaETH and Robinhood Chain as a stretch row; DNZN's own 60/40 distribution live under the Ops multisig with a 7-day delay; dapp mirrored and widget embedded in one DNZN app | not started |
| [M06 — Owner integrations](milestones/m06/MILESTONE.md) | Optional, after mainnet. When the connected wallet is a member of the owner rather than the owner, route `propose`/`cancel` into the multisig vault's or Majeur DAO's own submit flow instead of copy-calldata. UI only; no contract change | not started |

## Order

Strictly sequential, and M01 is first because it is the only immutable thing on the list. Everything
in M02 reads the `snapshot()` struct, so the struct must be final before a line of UI is wired — which
is why the tip and label decisions below are gated on M01 starting, not on M05 shipping.

M03 follows M02 rather than M01 because the review covers the `App` host and the chunk upload as well
as `Distribution`; reviewing before M02 means reviewing twice.

**Same address, separate storage.** A distribution deployed to several chains is several contracts.
Tables can drift and every owner action is queued once per chain. M02's acceptance criteria must show
that drift rather than present one distribution; M03 must name the factory's byte-identical deploy
through a deterministic deployer as the one-way door it is.

**Cross-project gate.** `state-collection` M4 is gated on "the fee-splitting contract being ready".
That gate is satisfiable before Rake M05: the factory uses CREATE2 with a sender-bound salt, so the
DNZN distribution's address is known the moment the factory's own address is — `state-collection` can
hardcode it after M03 and ship before Rake is on mainnet, which is exactly the workflow the overview
names in § 8. Confirm in M03 by predicting the address from the runbook; do not make `state-collection`
wait for M05.

## Decisions

Ruled by Denizen on 2026-10-10, before M01. Each touches contract storage, which cannot change after M05.

1. **No tip in the contract.** Supersedes design turn 10 and `design/HANDOFF.md` § contract flags
   (`tip` field, 100 bps default, DNZN recipient hardcoded). Rejected because it bakes a DNZN address
   into an immutable public primitive and contradicts goal 5. Also rejected: a pre-filled 1% DNZN row
   in the create flow (presumptive), a `donate(message)` function or per-distribution tips config (storage
   and surface before the audit). Sending ETH to a distribution already is a tip to it. What remains,
   as M02 UI items in DNZN's own dapp and nowhere else: a quiet "tip the authors" line on the
   post-create screen, any amount, separate transaction, nothing pre-filled; and the footer linking to
   the DNZN distribution's own public page. Nothing in the widget — it renders on other people's pages.
2. **No `url` or `about` fields.** Owners carry URLs inside `description`. Rejected: two more string
   fields, which widen the audit surface for copy.
3. **Name.** `Rake` is the project and the repo; `Distribution` and `DistributionFactory` are the
   contracts, in `src/Distribution.sol`; "Rake Distro" is the product phrase. Ruled 2026-10-11,
   superseding the 2026-10-10 text "`Rake` for the contracts and repo", which disagreed with this
   file's milestone table and the overview. The lineage names the type, not the project:
   `Multisig.sol`, `Moloch.sol`, `SplitWallet`. Rejected: `Rake`/`RakeFactory` (a rake is the fee,
   not the thing that splits it); `RakeDistribution` and `RakeDistro` (a prefix with nothing to
   disambiguate on two contracts, and `Distro` is a product word that would land in the ABI).
4. **Chains.** The overview's four mainnets are the M05 acceptance criterion; MegaETH and Robinhood
   Chain, which multisig.software also serves, are a stretch row in the same milestone. Same bytecode,
   same deployer; no `.mega` or `.base.eth` name resolution in v1.
5. **The primitive is not upgradeable; `App` is, until `lock()`.** A distribution is pinned to the
   factory that made it. A new significant version is a new factory, and old distributions run
   unchanged forever. Rejected: a movable implementation pointer for new creates only, because the
   clone address depends on the implementation and versions would break same-address-everywhere.
6. **Supersession is a re-table, not a field.** An owner migrating to a new version proposes a
   one-row table forwarding 100% to the successor; the delay applies and the money follows. M02's UI
   renders a one-beneficiary table whose address answers `snapshot()` as "superseded by". Rejected: a
   `successor` field and setter, which can disagree with where funds go.
7. **Single owner; signers get the admin view.** No multi-owner in the contract: a multisig or DAO
   is the owner, and its members route `propose`/`cancel` through it. The M02 dapp shows the owner
   view to a connected wallet that is the owner, or a signer of an owning vault (probe `isOwner(address)`,
   failing soft), with writes as copy-calldata in v1. `applyQueued` and `distribute` stay direct.
8. **Footer.** `work no. 001`, as `state-collection` does (`work no. 003`), not the "a public work by
   dnzn labs" line the scaffold's `layout.html` and the design prototype carry. M02 fixes the slot.
9. **Two ABI names differ from the design vocabulary.** The function that runs a queued action is
   `applyQueued(bytes,uint32)`, and the table getter is `beneficiaries()`; the `Snapshot.table` field
   keeps its name. Ruled by Denizen merging PR #6 on 2026-10-11, after `m01-t01` found the planned names
   impossible: `apply` is a Solidity reserved keyword, and forge treats any `table`-prefixed function as
   a table test, which made the contract itself a failing suite. Supersedes `apply` and `table()` in
   `design/HANDOFF.md` § Vocabulary map and in the t01 plan as first merged; M02 decodes the names in
   this ruling. Rejected: `applyAction` and the reference's `executeQueued` (neither pairs with the
   `queued` mapping and the `Applied` event the way `applyQueued` does); a `table`-free rename of the
   struct field (M02 reads it, the design doc fixes it, and the collision is only on functions).

## Findings carried forward

Measurements made during a task that amend the spec but are not rulings. Each names the milestone that
closes it; none is closed yet.

- **The 2,300-gas stipend holds only while the implementation is warm.** Overview § 5 says `receive()`
  "stays under a 2,300-gas stipend". Measured in `m01-t01` (`HANDOFF.md` § Discoveries): the leanest
  `receive()` on a clone costs 1,662 gas with the `Received` event and 250 without, but a clone's
  `DELEGATECALL` to a *cold* implementation adds 2,600 on its own, so the cold path needs about 2,750 and
  no `receive()` body can rescue it. Unreachable from a wallet (a top-level transfer forwards the whole
  gas limit) and from another `Distribution` (it pushes with `PUSH_GAS`); reachable only from a contract
  paying in with `.transfer()`/`.send()` in a transaction that has not yet touched the implementation.
  Not constructible in a forge 1.7.1 unit test (`vm.cool` does not re-cool, `vm.etch` leaves its target
  warm), so `test_receiveUnderStipend` proves the warm path only. **M03** states it in `SECURITY.md` and
  decides whether to document or design around it; **M02** says it in the dapp's guidance for payers.
- **`reserved` assumes a balance that never falls on its own.** `distribute` computes
  `balance − reserved[token]` unchecked; a token whose balance can decrease between calls (rebasing
  down, inbound fee) leaves `reserved` above the balance and `distribute` reverts on underflow until
  someone tops it up. Noted in the t01 review; **M03** dispositions it.
- **`release` against a `false`-returning token bubbles the bare `false` word** as revert data, not a
  reason. Correct under t01's open question 5 and opaque to a reader; **M02** renders it as "retry
  failed", **M03** decides whether a named error is worth the surface.
- **ERC-777-style token callbacks are covered by `nonReentrant` but untested.** One test in **M03**.

## Not on the roadmap

- Streaming, vesting, conditional recipients, cross-chain messaging, ERC-777, EIP-7702 self-init.
  Non-goals in the overview; not reopened.
- Owner-kind submit routes in v1. Designed as a later phase; v1 ships "copy calldata" everywhere, per
  `design/HANDOFF.md`. Carried as the optional M06 above, decided 2026-10-10.
- The `Render` / `DocsRenderer` / `WidgetRenderer` split and the 60 KB uncompressed budget. Superseded
  by the scaffold's single `App` with gzipped SSTORE2 chunks. Measured 2026-10-10: the prototype
  comment-stripped is 74.0 KB, gzipped 20.7 KB; the widget 5.6 KB, gzipped 2.5 KB. Re-run before citing.
- `App.lock()` at launch. Same ruling as `state-collection`: lock when there is a reason to claim the
  document is immutable, not on deploy day.
- A branch protection rule on `main`. Not available on this plan; revisit at M05's go/no-go.
- ERC-1363 receiver. Optional surface before an audit; propose it as a task in M01 only if the
  review in M03 is already scoped to include it.
