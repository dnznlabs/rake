# Rake · roadmap

Proposed 2026-10-10 · not yet approved

A fee-splitting primitive: one address per distribution, an on-chain table of beneficiaries, a
public delay on every owner action, and a dapp and widget served from the chain. The spec is
`brainstorming/PROJECT_OVERVIEW.md`; the UI contract is `brainstorming/design/HANDOFF.md`. Where
anything here disagrees with them, they win — except where § Decisions records a ruling that
supersedes them.

Milestones run in order. A milestone is done when every acceptance criterion in its `MILESTONE.md` is
demonstrably met — a command someone else can run and watch pass, not a judgement call.

| Milestone | Goal | Status |
|:----------|:-----|:-------|
| [M01 — The contract](milestones/m01/MILESTONE.md) | `Distribution` + factory built from the overview, every test in the definition of done passing, gas snapshot committed, deployed into `make serve` | not started |
| [M02 — Dapp and widget on anvil](milestones/m02/MILESTONE.md) | The design prototype rebuilt on DNZN Base, reading `snapshot()` and sending the six writes, hosted by `App` and served end to end from a local chain | not started |
| [M03 — Hardening and deploy readiness](milestones/m03/MILESTONE.md) | Independent security review dispositioned in `SECURITY.md`, the open measurements closed, and a runbook for a same-address deploy on every target chain | not started |
| [M04 — Testnets](milestones/m04/MILESTONE.md) | The runbook executed on Sepolia and Base Sepolia, the dapp read through a `web3://` gateway, the widget embedded on a test host, and Denizen accepts it from a browser wallet | not started |
| [M05 — Mainnet](milestones/m05/MILESTONE.md) | The runbook on Ethereum, Base, Arbitrum and OP Mainnet at one address; DNZN's own 60/40 distribution live under the Ops multisig with a 7-day delay; dapp mirrored and widget embedded in one DNZN app | not started |

## Order

Strictly sequential, and M01 is first because it is the only immutable thing on the list. Everything
in M02 reads the `snapshot()` struct, so the struct must be final before a line of UI is wired — which
is why the tip and label decisions below are gated on M01 starting, not on M05 shipping.

M03 follows M02 rather than M01 because the review covers the `App` host and the chunk upload as well
as `Distribution`; reviewing before M02 means reviewing twice.

**Cross-project gate.** `state-collection` M4 is gated on "the fee-splitting contract being ready".
That gate is satisfiable before Rake M05: the factory uses CREATE2 with a sender-bound salt, so the
DNZN distribution's address is known the moment the factory's own address is — `state-collection` can
hardcode it after M03 and ship before Rake is on mainnet, which is exactly the workflow the overview
names in § 8. Confirm in M03 by predicting the address from the runbook; do not make `state-collection`
wait for M05.

## Decisions needed before M01 starts

Each changes contract storage, and the contract cannot be changed after M05. Recommendation first.

1. **Tip.** The overview says "no fee taken by Rake Distro itself, free forever"; the design handoff
   adds a `tip` field, default 100 bps, recipient hardcoded to DNZN's distribution. **Recommend no tip
   field in the contract.** If DNZN wants a default cut, the create flow pre-fills a DNZN row in the
   table at 1%, removable like any other row; disclosure then comes from the table itself, and the
   contract keeps the promise the copy makes. Rejected: the hardcoded field, because it bakes a DNZN
   address into an immutable public primitive and contradicts goal 5 (no dependency on DNZN
   infrastructure). Cost of the recommendation: the tip is one row among others rather than "off the
   top", and the widget footer line in design turn 10 goes.
2. **Governance `url` and `about`.** Design wants them; the contract has `description` only.
   **Recommend deferring to a later version**, carrying any URL inside `description` by convention.
   Rejected: two more string fields now, because they widen the audit surface for copy.
3. **Name.** `Rake` for the contracts and repo, "Rake Distro" as the product phrase. The repo already
   decided the first half.

## Not on the roadmap

- Streaming, vesting, conditional recipients, cross-chain messaging, ERC-777, EIP-7702 self-init.
  Non-goals in the overview; not reopened.
- Owner-kind submit routes (multisig custom action, Majeur proposal) and vault import. Designed as a
  later phase; v1 ships "copy calldata" everywhere, per `design/HANDOFF.md`.
- The `Render` / `DocsRenderer` / `WidgetRenderer` split and the 60 KB uncompressed budget. Superseded
  by the scaffold's single `App` with gzipped SSTORE2 chunks. Measured 2026-10-10: the prototype
  comment-stripped is 74.0 KB, gzipped 20.7 KB; the widget 5.6 KB, gzipped 2.5 KB. Re-run before citing.
- `App.lock()` at launch. Same ruling as `state-collection`: lock when there is a reason to claim the
  document is immutable, not on deploy day.
- A branch protection rule on `main`. Not available on this plan; revisit at M05's go/no-go.
- ERC-1363 receiver. Optional surface before an audit; propose it as a task in M01 only if the
  review in M03 is already scoped to include it.
