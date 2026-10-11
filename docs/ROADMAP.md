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
| [M01 — The contract](milestones/m01/MILESTONE.md) | `Distribution` + factory built from the overview, every test in the definition of done passing, gas snapshot committed, deployed into `make serve` | done 2026-10-11 — t01 (#6), t02 (#11), t03 (#14) and the decision-10 follow-up (#24) merged; every criterion re-run and passing on `main` at `c292106` |
| [M02 — Dapp and widget on anvil](milestones/m02/MILESTONE.md) | The design prototype rebuilt on DNZN Base, reading `snapshot()` and sending the six writes, hosted by `App` and served end to end from a local chain, and Denizen has ironed out the experience against it | in progress — plan merged (#29) 2026-10-11; t01 done (#33), t02 assigned (#36); Phase 5 added 2026-10-11 |
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

**M02 ends on Denizen, not on a check.** Its last phase is a free-form pass over the dapp and widget
by Denizen on anvil — the same shape as `state-collection` M1 Phase 5 — open-ended, closed by his
signoff (decision 14). It sits before M03 for the same reason M03 sits after M02: a UI change made
after the review is a second review, and a contract change made after it is a third. Nothing in M03
starts until the signoff line is dated.

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
10. **Sender-bound salts only; open salts are refused.** `create` accepts a salt only when its top 20
    bytes equal `msg.sender`; a zero prefix reverts with `SaltDoesNotStartWith` like any other wrong
    prefix. Ruled by Denizen on 2026-10-11 over Telegram, after `m01-t02` shipped the reference's
    default (open salts allowed, pinned by `test_saltFrontRunningRejected`); supersedes that default and
    the "Open salts are allowed" entry under § Findings carried forward. Rejected because a distribution's
    address depends on the factory and the salt alone, so an open salt is first-come on every chain: a
    distribution that is DNZN's on Ethereum could be deployed at the same address on Base by anyone,
    with their owner and table, and the primitive's one promise is that an address means one thing
    everywhere. Also rejected: keeping them and steering the dapp to sender-bound salts, which protects
    nobody who calls the contract directly, and the direct caller is the squatter. Front-running a
    `create` is also griefing, since a CREATE2 collision burns the whole gas limit (finding below).
    What is given up: reproducing an address on a new chain from a *different* sender. Accepted
    knowingly, with the operating rule it implies, which M03's runbook and M02's create flow both state:

    - **The sender fixes the address; the owner does not enter it.** `create(owner, …, salt)` takes the
      owner as a parameter, and the address is `predict(salt)` regardless of it. So one EOA calls
      `create` on every chain with the same salt and passes the multisig as `owner` in that call. The
      distribution is owned by the multisig from its first block on every chain, at one address, and no
      ownership transfer is ever needed to deploy to the next chain.
    - **Each chain is a separate contract.** Transferring ownership on one chain changes neither the
      salt nor any other chain. The address is reproducible as long as the deploying EOA's key exists;
      that key never needs to own anything, so it can be a cold key used only for `create`.

    Code change: one comparison in `create` and the inverted assertion in `test_saltFrontRunningRejected`,
    plus the `.gas-snapshot` row and the `create` doc comment, which still describes open salts as
    "claimable". Issued as a follow-up to `m01-t03`, before M02's create flow is written; landed as
    [#24](https://github.com/dnznlabs/rake/pull/24) on 2026-10-11, closing M01.

Ruled by Denizen on 2026-10-11, before M02 started, each on the issue linked and each as the
recommended option.

11. **`distribute` is shown to everyone.** Under the balance line, labelled that anyone can call it and
    that it spends the caller's own gas. Ruled on [#26](https://github.com/dnznlabs/rake/issues/26).
    Rejected: owner-and-beneficiaries only (hides that the function is permissionless, and a keeper
    has to leave the dapp); hidden entirely (the dapp would show a balance it cannot settle). Closes
    overview § 6 "Should `distribute` be surfaced to non-owners?". M02 `m02-t03` builds it.
12. **The widget is served by `App` as a second on-chain document.** `App.request(["widget.js"])`
    returns a second chunk set with `Content-Type: application/javascript`; `html()` stays the dapp;
    `lock()` covers both. Ruled on [#27](https://github.com/dnznlabs/rake/issues/27). Rejected: a
    second `App` instance (the contract changes anyway, plus a second owner, lock and address per
    chain); off-chain only (the one piece strangers load would be the one piece not verifiable on
    chain). Closes overview § 6 "Widget hosting" for the on-chain half; dnzn.dev and IPFS in M05 are
    mirrors of it. M02 `m02-t05` builds it.
13. **Name display priority is ENS → WNS → GNS, winner alone.** The ruling already made for
    state-collection (PR #53 there), ported verbatim. Ruled on
    [#28](https://github.com/dnznlabs/rake/issues/28). Supersedes `design/HANDOFF.md` § Demo → real
    wiring and `DESIGN_HANDOFF.md` § 2.1, which say `.wei → .gwei → .eth`; the brainstorming folder is
    frozen, so this entry is the correction. Rejected: the design order, which would show two DNZN
    products different names for one address. Lands in `m02-t03`, exercised in M04.
14. **A free-form UI/UX tweak phase, driven by Denizen, closes M02.** Asked for by Denizen on
    2026-10-11 ("before testnets, maybe before hardening"); placed as M02 Phase 5 on Lakos's
    recommendation, confirmed by the merge of the PR that added it. Options: (a) last phase of M02,
    before M03 — chosen, because every change it produces is then inside the review's scope rather
    than after it, and anvil is where a change costs least; (b) its own milestone between M02 and M03
    — rejected as ceremony, it has no acceptance criteria but a signoff; (c) inside M03 — rejected,
    the review would read moving code; (d) after M03, before M04 — rejected, each tweak that reaches
    `src/` or `App` re-opens the review. Shape is `state-collection` M1 Phase 5 verbatim: he executes
    it himself outside the agent loop, opens PRs reviewed here, files anything he wants handed off as
    a task row; anything is fair game with the bill priced per item; closed by a dated signoff
    (M02 criterion 10). Rejected: closing on an empty task table — the same proposal `state-collection`
    overruled on 2026-09-17.

## Findings carried forward

Measurements made during a task that amend the spec but are not rulings. Each names the milestone that
closes it; none is closed yet. Since 2026-10-11 each also has a `carried` issue, labelled with the
milestone that first acts on it, and the issue list is the queue — this section is the record.

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
  Issue [#18](https://github.com/dnznlabs/rake/issues/18).
- **`reserved` assumes a balance that never falls on its own.** `distribute` computes
  `balance − reserved[token]` unchecked; a token whose balance can decrease between calls (rebasing
  down, inbound fee) leaves `reserved` above the balance and `distribute` reverts on underflow until
  someone tops it up. Noted in the t01 review; **M03** dispositions it. Issue
  [#19](https://github.com/dnznlabs/rake/issues/19).
- **`release` against a `false`-returning token bubbles the bare `false` word** as revert data, not a
  reason. Correct under t01's open question 5 and opaque to a reader; **M02** renders it as "retry
  failed", **M03** decides whether a named error is worth the surface. Issue
  [#20](https://github.com/dnznlabs/rake/issues/20).
- **ERC-777-style token callbacks are covered by `nonReentrant` but untested.** One test in **M03**.
  Issue [#21](https://github.com/dnznlabs/rake/issues/21).
- **A CREATE2 collision costs the whole gas limit, not a cheap revert.** Measured in `m01-t02`
  (`HANDOFF.md` § Discoveries, confirming the architect's spike): `create` against a salt whose address
  already has code reports about 1.04 billion gas in the test harness, because CREATE2 consumes all
  forwarded gas before the factory's `DeploymentFailed` can fire. Unreachable by accident with a
  sender-bound salt; reachable with a re-sent transaction, and until decision 10 lands in code, with an
  open (zero-prefixed) salt. **M02**'s create flow must `eth_getCode` `predict(salt)` and refuse to send
  when it is non-empty; **M03** states it in `SECURITY.md`. Issue
  [#22](https://github.com/dnznlabs/rake/issues/22).
- **Under decision 10 the deploying EOA's key is the address.** Raised by Elanik on reading the ruling,
  2026-10-11: reproducing a distribution's address on a further chain needs a `create` from the same
  sender, so losing that key is unrecoverable in a way losing an owner key is not — ownership moves per
  chain, the address never does. **M03**'s runbook names the key as a protected artefact, says the
  consequence in one sentence, and does the `create` on every expected chain while the key is live.
  Issue [#23](https://github.com/dnznlabs/rake/issues/23).
- **`forge lint` poisons the build cache**, so a following `forge snapshot --check` can exit 0 having
  skipped an edited file's whole suite. Found in `m01-t03` (`HANDOFF.md` § Discoveries), reproduced in
  review. Toolchain, not rake; CI cannot reach it. Closed by one ordering rule in `AGENTS.md`
  § Contracts. Issue [#17](https://github.com/dnznlabs/rake/issues/17).
- ~~**Open salts are allowed, by default rather than by ruling.**~~ Closed 2026-10-11 by decision 10:
  refused. Kept for the record: `m01-t02` shipped `create` accepting a zero prefix as well as
  `msg.sender` (t02 open question 2, default taken, pinned by `test_saltFrontRunningRejected`), and
  flagged it as needing a ruling before M02's create flow.

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
