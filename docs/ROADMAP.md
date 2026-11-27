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
| [M02 — Dapp and widget on anvil](milestones/m02/MILESTONE.md) | The design prototype rebuilt on DNZN Base, reading `snapshot()` and sending the six writes, hosted by `App` and served end to end from a local chain, and Denizen has ironed out the experience against it | done 2026-10-26 — t01 (#33), t02 (#40), t03 (#52), t04 (#60), t05 (#65), t06 done; Phase 5 signed off by Denizen in [#73](https://github.com/dnznlabs/rake/pull/73) |
| [M03 — Hardening and deploy readiness](milestones/m03/MILESTONE.md) | Independent security review dispositioned in `SECURITY.md`, the open measurements closed, and a runbook for a same-address deploy on every target chain | **done 2026-11-07** — ten tasks (t01–t10), three two-leg reviews (`audits/2026-10-30`, `10-31`, `11-06`), 14 `SECURITY.md` rows, decisions 20–40; `src/` final at `3ad48ec` ([#153](https://github.com/dnznlabs/rake/pull/153)), `FACTORY_SALT`/`APP_SALT` mined against it (decision 37: `0x00D18B5b…`, `0x00A90943…`), `RUNBOOK.md` rehearsed on two anvils with the real Creator key; DNZN's predicted address `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`; criteria 1–8 re-run in [CLOSEOUT.md](milestones/m03/CLOSEOUT.md) |
| [M04 — Testnets](milestones/m04/MILESTONE.md) | The runbook executed on Sepolia and Base Sepolia, the dapp read through a `web3://` gateway, the widget embedded on a test host, and Denizen accepts it from a browser wallet | **done 2026-11-19** — sixteen tasks (t01–t16; t12 closed unmerged by decision 62), criteria 1–8 re-run at `2f93d26` in [CLOSEOUT.md](milestones/m04/CLOSEOUT.md), closed on that close-out's merge ([#296](https://github.com/dnznlabs/rake/pull/296), `eec7164`) by decision 64, with criteria 1, 3 and 5's unmet clauses transferred to m05-t01 Part B beside criterion 6's wallet run (decision 63) and criterion 8's state-collection#74 comment drafted and awaiting the Product Owner's word. Scoped 2026-11-07: seven tasks in four phases (Phase 1 done the same day: the dapp's carried items #164 and the `web3://` gateway in the dev stack #163, the ERC-5219 surface's first real consumer; then Slither as a third audit leg gating the deploy, invariant tests beside it, the runbook for real, then the gateway and a host page, then a scripted wallet session with a signoff line); two decisions open ([#156](https://github.com/dnznlabs/rake/issues/156) the test host, [#157](https://github.com/dnznlabs/rake/issues/157) DNZN's testnet table, both ruled); needed testnet ETH on two keys and an Etherscan API key |
| [M05 — Mainnet](milestones/m05/MILESTONE.md) | The runbook on Ethereum, Base, Arbitrum and OP Mainnet at one address, with MegaETH and Robinhood Chain as a stretch row; the DNZN fund distribution live at its Sepolia address with the Sepolia table, the Ops vault as owner and a 7-day delay (decision 50); dapp mirrored and widget embedded in one DNZN app | **done 2026-11-26** — closed on [`CLOSEOUT.md`](milestones/m05/CLOSEOUT.md): as re-scoped by decision 70, the contracts and the document are live on Base and Ethereum at the testnets' addresses, served at `rake.dnzn.dev` with `/` on Ethereum; the other four chains follow on the Product Owner's word |
| [M06 — Going public](milestones/m06/MILESTONE.md) | `dnznlabs/rake` is public, as a new repository whose history is one signed commit from the mainnet tag; the private repository is renamed `rake.buildarchive`, archived and never published. Four phases: the labelling of outside issues and comments installed and proven on this repo; a staging tree from the tag with the build-out record removed (milestones, tasks, handoffs, review runs, dev-chain broadcasts), the roadmap reset to the mainnet row, `SECURITY.md` carrying no findings, and every document audited for a reader who has only the repo; a fresh review of the staging tree that must come back clean; then Denizen renames, archives, creates and flips | not started — gated on M05's close-out; scoped when M05 closes (decision 60) |
| [M07 — Owner integrations](milestones/m07/MILESTONE.md) | Optional, after mainnet. When the connected wallet is a member of the owner rather than the owner, route `propose`/`cancel` into the multisig vault's or Majeur DAO's own submit flow instead of copy-calldata. UI only; no contract change | not started |

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
starts until the signoff line is dated. **The docs page is part of that signoff.** `#/docs` ships from
m02-t04 as a draft the agents wrote (decision 17); Denizen writes its final text himself in Phase 5,
and the signoff is not dated while the page still carries the draft. The checks on it — the reference
file's struct and tables, the stipend-and-cold lines, criterion 9's greps — stay as they are and run
against whatever he writes.

**M06 is the last thing that happens in this repository.** Everything after the flip happens in the new one, in public, and nothing in M06 touches `src/` or the deployed contracts: the fresh review must find nothing, because a finding against immutable mainnet code is a disclosure or a redeploy, not a fix. M07 is optional and does not gate M06.

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
   **Addendum 2026-10-11 ([#38](https://github.com/dnznlabs/rake/issues/38)):** both UI items move
   from M02 to M05, where the DNZN distribution has an address. Reached by default when m02-t03's
   issue opened with no ruling; options were defer (chosen), a build token with no value on any M02
   chain, or loosening criterion 9's grep. M02 criterion 9 stays as written.
   **Addendum 2026-10-26 (Phase 5, [#73](https://github.com/dnznlabs/rake/pull/73)):** the support
   line comes forward to M02 as `#/docs` § Economics, ruled by Denizen in the walk-through: one amount
   field sending plain ETH to the distribution the app features (`S.featured`), separate transaction,
   nothing pre-filled, shown only once that address has read. It is worded "support", never "tip", and
   names no owner, because on an M02 chain the featured address is a `FEATURED_SALT` dev seed rather
   than DNZN's; the DNZN attribution, the post-create line and the footer link stay in M05. Criterion 9
   stays as written.
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
   same deployer; no `.mega` or `.base.eth` name resolution in v1. *Amended 2026-11-21:* the dapp
   lists all six, with the two testnets, as the chains rake intends to be on, and shows each one
   that is not yet enabled as "pending deployment" (decision 69). The stretch chains are therefore
   named in the dapp before m05-t05 runs, and stay named if that row closes as not reached, until
   an upload takes them off the list.
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
   **Amended 2026-10-11 in the #40 review:** the right side is the version span alone — the `docs`
   link `state-collection` carries there is redundant with the header nav and is dropped. The slot
   decision 1 reserves for the DNZN distribution's own page stays reserved; that address exists after
   M03. Supersedes "footer exactly as state-collection's" in the m02-t02 plan, step 2.
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
15. **The landing carries the prototype's fee-path diagram.** Ruled by Denizen in the #40 review on
    2026-10-11 ("it added visual clarity"), answering [#44](https://github.com/dnznlabs/rake/issues/44)
    before its default would have left it out; landed in t02 rather than t04, so the recommendation's
    timing is superseded and its substance kept. Not the prototype's SVG verbatim: the three beneficiary
    swatches take the bar's tints through classes so one hue drives them, the hex addresses under the
    boxes are dropped, and the distribution box gains the amber `changes wait the delay` line, so the
    picture states all three of the contract's promises. Shown under 720 px as a single column, not
    hidden as the prototype did. Cost measured in the t02 handoff: +916 gzipped bytes, dapp at
    14,254 gzipped, one chunk, 9,746 bytes of head-room before a second — re-measured in t04.
16. **The table editor refuses tables the contract will refuse.** Ruled by Denizen on 2026-10-12
    ("Select Option 1"), closing [#55](https://github.com/dnznlabs/rake/issues/55), the t03 handoff's
    open question. The editor blocks duplicate accounts and zero shares and disables submit, as m02-t03
    shipped it (#52); the cost accepted is that the page encodes two of `_set`'s rules, so a future
    change to `_set` makes the editor wrong until it is updated, and M03's review reads the pair.
    Rejected: letting the table through, which lands a `propose` whose every `applyQueued` reverts
    `BadTable` and that only `cancel` clears after the delay ([#54](https://github.com/dnznlabs/rake/issues/54),
    M03's); and preflighting `applyQueued` at propose time, impossible because the entry does not
    exist yet.
17. **`#/docs` is written for the owner of a distribution; the contract reference lives in the repo.**
    Ruled by Denizen on 2026-10-17 in the #60 review ("these docs should be targeted to end-user who
    creates and owns a distribution … they read like developer docs"), superseding
    `DESIGN_HANDOFF.md` § 3.3's "technical reader, white-paper register" and its twelve sections. The
    page is eleven short sections — what it is, why it exists, how it works, creating one, paying in,
    paying out, changing it, ownership, the widget, limits, for developers — in plain declarative
    sentences, with a wallet's function names given once where the owner will meet them in a prompt.
    The text on the branch is a draft: Denizen writes the final page himself in Phase 5, before the
    signoff (amended 2026-10-25: Denizen delegated the text — "I really don't want to write them
    myself" — and the final page is written at his direction and approved by his merge) (§ Order, "M02 ends on Denizen"). The function, event and error tables and the verbatim `Snapshot` struct move to
    `docs/REFERENCE.md`, which `test/docs.test.mjs` and criterion 6's ABI diff read instead of the
    page, so the drift check is kept and the page stops paying for it. Rejected: an owner's
    introduction above the developer page (two audiences on one page, and the one who deploys reads
    the one who does not); the reference as a third on-chain document (a developer has the repo and
    the contract itself, which is where they go). Criterion 6 reworded in `MILESTONE.md`. Landed in
    m02-t04 on re-review.
18. **The landing is a pitch, not a reading; the fee-path diagram is an illustration.** Ruled by
    Denizen on 2026-10-25 in Phase 5, closing [#50](https://github.com/dnznlabs/rake/issues/50) ("the
    landing diagram is just an example"; the live example is "way too loud"). The hero is "Transparent
    fund distribution." with protocol fees named as the primary case, not the only one, and one CTA.
    The featured distribution's bar, ledger, pending block and meta leave `#/`; in their place the
    real widget, `widget.js` inlined into the dapp, renders it beside the address field, mounted only
    once its `snapshot()` reads. Criterion 3 moves its featured-distribution check to
    `#/distros/<featured>`. "Get the widget" leaves the hero for the owner bar, where the docs snippet
    then carries that owner's address. The diagram keeps the mock's 60/30/10, captioned `example`, and
    under 720 px drops its two minor labels so the rest sets at about 10 px. The landing's rhythm is
    64 px; the favicon is ink, not accent. Rejected: drawing the diagram from the featured `snapshot()`
    (#50's recommendation — it ties the pitch to a dev seed); a dapp-drawn look-alike of the widget
    (no bytes, but it can drift from the thing a host gets); hiding the diagram on a phone (decision
    15 already turned that down).
    **Amendment 2026-10-26 (Phase 5, [#73](https://github.com/dnznlabs/rake/pull/73)):** ruled by
    Denizen in the walk-through. The hero is two columns with two CTAs, create and docs, beside the
    widget and the address field; a "use cases" row follows it. The diagram is no longer the mock's
    60/30/10: it draws three sources into one distribution, whose box shows the table, the time lock
    and that funds wait for `distribute()`, paid out to four beneficiaries at 45/25/20/10, set wide
    above 720 px and as a tall variant below it. It stays an illustration, not drawn from `snapshot()`.
19. **The widget snippet names an ERC-5219 gateway, and shows `web3://` as the alternative.** Ruled
    by Denizen on 2026-10-25, closing [#68](https://github.com/dnznlabs/rake/issues/68) ("show both
    for clarity"). Off http(s), `#/docs` § the widget gives `src` as
    `https://<App>.<chainId>.w3link.io/widget.js`, the gateway's address-and-chain-id host form
    (`ethstorage/web3url-gateway` `cmd/server/protocol.go`), and names `web3://<App>:<chain>/widget.js`
    beside it as the form for pages opened in a 5219 client, with the caveat that `html()`-only clients
    such as Freedom cannot reach it. Decision 12 stands: `App` answering both is what keeps it reachable
    from both camps. Rejected: the bare `web3://` src alone (it renders the dapp in Freedom). M04's
    gateway criterion should name a 5219 gateway for the same reason.

Ruled by Denizen on 2026-10-27, before M03 Phase 2, each on the issue linked and each as the recommended option
(`docs/milestones/m03/MILESTONE.md` § Human-in-the-loop requirements, D1–D13). Where the issue was
amended after it opened, the amendment is what was ruled on, and the milestone table row is marked.

20. **The M03 review is the shared `forge-audit` method now, and a paid external review later.**
    D1, ruled on [#78](https://github.com/dnznlabs/rake/issues/78) ("Select Option 3"), as amended
    by [#91](https://github.com/dnznlabs/rake/pull/91). Phase 3 runs the method `state-collection`
    ran on 2026-09-28: two legs from two labs (Codex and Claude, each with the pinned
    `solidity-auditor` skill) over `audits/SCOPE`, reconciled by a rollup into `audits/<date>/AUDIT.md`
    with a provenance block, graded against a known answer the legs are not told. Two models from two
    labs is the whole independence claim; `SECURITY.md` and `README.md`'s `AUDIT` cell say "two-model
    agent review" until a paid review happens. The paid review, the only kind that is *independent*
    in the overview § 10 sense, is an M05 go/no-go input, not a gate on M03 or M04: testnets are the
    cheap place to find what a review missed, and a paid review of code that then changes is a second
    paid review. It is a spend Denizen approves on a quote; nothing here commits it. Rejected: the
    agent review alone (no independent party ever reads it); the paid review alone or first (weeks of
    lead time on code M04 may still change). *Superseded on one point by decision 55 (2026-11-18):
    "a paid external review later" and "an M05 go/no-go input" no longer hold; no paid review is
    planned, and M05's go/no-go does not wait on one. The method, the scope, the rollup and the
    "two-model agent review" wording stand.*
21. **`transferOwnership` becomes two-step, without a struct change.** D2, ruled on
    [#79](https://github.com/dnznlabs/rake/issues/79) ("Select Option 2"), closing
    [#74](https://github.com/dnznlabs/rake/issues/74) when it lands. `pendingOwner()` is its own
    getter and `acceptOwnership()` a new external; the `snapshot()` struct is unchanged, so decision 9
    is amended by an ABI addition and `docs/REFERENCE.md` and the selector fixtures are regenerated.
    Renounce stays one-step: `transferOwnership(address(0))` clears `owner` directly, since nothing
    can accept for `address(0)`. A vault owner accepts through its own calldata, as for every other
    owner write (decision 7). The dapp gains one surface: accept, and "transfer pending to …" on the
    page. Rejected: `pendingOwner` inside the struct (the whole cost of two-step is the struct, and
    the struct does not need the field; it re-opens M02 t01–t05 and every codec test); one-step with
    the dapp's guards as the mitigation (a caller who skips the page is unprotected).
22. **Distributions do not declare their tokens on chain.** D3, ruled on
    [#80](https://github.com/dnznlabs/rake/issues/80) ("Select Option 3"). Nothing on the contract in
    v1; the dapp's "recognised by a first distribute" rule stands, with per-chain curated lists later
    if wanted. A declaration binds nothing, since anyone can still send anything; it widens the
    surface the review reads; and the display problem it solves is the dapp's.
    [#75](https://github.com/dnznlabs/rake/issues/75) is relabelled `m05` with this reason.
    Rejected: a `tokens` array in config set through `propose` (struct change, re-opens t01–t05); an
    event-only `TokensDeclared(address[])` (no struct, but read by a log scan, which is what #76 says
    real providers refuse).
23. **`reserved[token]` above the balance is documented, not saturated.** D4, ruled on
    [#81](https://github.com/dnznlabs/rake/issues/81) ("Select Option 1"), closing
    [#19](https://github.com/dnznlabs/rake/issues/19) when the line lands. Non-standard balance
    semantics are a non-goal; one line of owner guidance in `SECURITY.md`. The reviewer may reopen
    it in Phase 3 with a finding. Rejected: `balance < reserved ? 0 : balance − reserved` plus a
    test that `release` still pays what is there (a primitive change for tokens the overview
    excludes).
    *Reaffirmed 2026-11-07 at M03 close-out.* The 2026-11-06 review's rollup F2 rated the
    consequence **Medium** — under a shortfall the first `release`/`claim` is paid in full and the
    last exiter bears the whole loss — the third raising of #19's shape (`SECURITY.md` F4). Denizen
    agreed in the architect's Telegram DM ("i agree") that the ruling stands: no contract change,
    because the precondition is a token whose balance falls on its own, which the overview excludes
    and decision 23 already places out of scope, and the fix is per-token backing accounting on
    every exit. Remedy: one sentence on `#/docs` § Limits naming balance-falling tokens beside the
    fee-on-transfer one, in M04's first dapp task (`app/` only, no mining). Rejected again: the
    saturating subtraction; and pro-rating escrow exits against the shortfall (a new mechanism for
    an excluded token class).
24. **`release` names the opaque failure and bubbles the rest.** D5, ruled on
    [#82](https://github.com/dnznlabs/rake/issues/82) ("Selected Option 3"), closing
    [#20](https://github.com/dnznlabs/rake/issues/20) when it lands. `revert ReleaseFailed(token)`
    when the push returns `false` with revert data of 32 bytes or fewer (the bare word, or nothing);
    anything longer, which is a real `Error(string)` or a custom error with arguments, bubbles as
    today. Supersedes the reason carried from #20 into the milestone's D5 row, that a named error
    "adds bytecode to every clone's implementation": measured on 2026-10-27 (`origin/main` at
    `3bae486`, solc 0.8.34, via-IR, `optimizer_runs = 1000`, `forge build --force`), the current
    bubble path is 8,306 deployed bytes, always-named 8,175, and this option 8,195, so the named
    error *shrinks* the implementation by 111 bytes; builds only, re-measure rather than quote once
    `release` changes for any other reason. Costs accepted: one more error in the primitive's ABI,
    and a second match arm in the dapp's "retry failed" branch. Rejected: no named error (the
    original recommendation, made on the wrong bytecode premise); naming every failure (throws away
    the token's own reason in the reverting case).
25. **A queued action that can never apply is documented, not validated or cancellable.** D6, ruled
    on [#83](https://github.com/dnznlabs/rake/issues/83) ("Option 3"), closing
    [#54](https://github.com/dnznlabs/rake/issues/54) when the line lands. `SECURITY.md` records it
    as a known shape: the editor already refuses both detectable cases (decision 16), nothing is
    lost, and only the pending list is wrong until `cancel` clears it after the delay. Rejected:
    validating the table in `propose` too (gas on every propose, and a duplicate check that a future
    `_set` change silently desynchronises); letting anyone `cancel` an entry whose apply reverts (a
    second path to reason about, and a preflight that is not always decidable).
26. **`_push` requires a return word equal to one; the comment says so.** D7, ruled on
    [#84](https://github.com/dnznlabs/rake/issues/84) ("Option 1"), closing
    [#61](https://github.com/dnznlabs/rake/issues/61) when it lands. The comment is tightened to
    what the code does; the docs page already says it. Rejected: accepting any non-zero word (a code
    change for tokens nobody has named).
27. **Tables have a cap, at the measured figure.** D8, ruled on
    [#85](https://github.com/dnznlabs/rake/issues/85) ("Option 1"). `_set` refuses `n > CAP`, one
    comparison and one `BadTable`, so a table that can never distribute becomes impossible. `CAP` is
    the largest length whose worst-case `distribute` (every row escrowed, `PUSH_GAS` spent per row)
    stays under half of a 30M-gas block; m03-t01 measures it and posts the figures on #85, t02
    writes the constant. **The figure is 107**, measured by m03-t01 (#94, 2026-10-27,
    `test/TableCap.t.sol`): a worst-case row (recipient burns the full push, then fails) costs
    138,917 gas; 107 rows `distribute` in 14,896,325, 108 in 15,035,242, both asserted by running
    them rather than computed. Re-measure rather than quote if `distribute`, `_push` or `PUSH_GAS`
    changes. Rejected: no cap with the
    ceiling documented (a table past the block gas limit traps every balance behind a `distribute`
    that cannot be mined, and only a `setBeneficiaries` through the delay frees it).
28. **ERC-1363 is out of the review's scope.** D9, ruled on
    [#86](https://github.com/dnznlabs/rake/issues/86) ("Option 1"). It is not a goal, it is surface
    before the audit, and § Not on the roadmap already lists it. Rejected: adding it (about ten
    lines, and a Phase 2 task before the review).
29. **`audits/SCOPE` is `Distribution.sol`, `App.sol` and the two deploy scripts.** D10, ruled on
    [#87](https://github.com/dnznlabs/rake/issues/87) ("Option 1"), as amended by
    [#91](https://github.com/dnznlabs/rake/pull/91). `src/Distribution.sol`, `src/App.sol`,
    `scripts/forge/Deploy.s.sol` and `scripts/forge/DeployApp.s.sol`: `App` is what strangers load
    and its `lock()` is one-way; the deploy scripts set constructor arguments and hand over
    ownership, Phase 4's runbook runs them, and the method's first finding on `state-collection` was
    in a deploy script. Not `Chunks.s.sol`, `Fixtures.s.sol` or `Seed.s.sol`, which are owner-run on
    a dev chain; every exclusion is written in `audits/SCOPE` with its reason, as the method
    requires. Rejected: `Distribution.sol` only (cheaper, and the roadmap's reason for M03 sitting
    after M02 goes unmet); everything under `src/` and `scripts/forge/` (dev-chain seeding read as if
    it shipped).
30. **`PUSH_GAS` stays `100_000` if both reference wallets receive within it.** D11, ruled on
    [#88](https://github.com/dnznlabs/rake/issues/88) ("Option 1") ahead of the measurement, on the
    option's own condition: keep the constant and record the headroom if both a multisig.software
    vault clone and a Safe `receive` within it. If either does not, the ruling's fallback is the
    issue's default for that case, option 2 at twice the larger measured need rounded up to a
    thousand; m03-t01 posts the figures on #88 and they are added here. **Measured 2026-10-27
    (#94, `test/PushGas.t.sol`), against the wallets' mainnet runtime bytecode etched at their
    canonical addresses and read cold:** a Safe v1.4.1 proxy needs 4,029 gas to `receive`, a
    multisig.software vault clone 404, so `PUSH_GAS` stays `100_000` with 95,971 of headroom over the
    larger and option 2 does not apply. Two methods agree to the gas (binary search on the cap; the
    `distribute` trace's push frames at 6,329 and 2,704, each the minimum plus the 2,300 stipend).
    Rejected in advance: lowering it (a lower cap buys nothing and escrows more).
31. *Superseded by 33 on 2026-10-30; kept as ruled.* **The factory is placed through SafeSummoner;
    the keyless proxy is the fallback.** D12, ruled on
    [#89](https://github.com/dnznlabs/rake/issues/89) ("Option 4"), confirming the Telegram
    agreement of the same day. "SafeSummoner" is a contract, `0x00000000004473e1f31C8266612e7FD5504e6f2a`,
    exposing `create2Deploy(bytes bytecode, bytes32 salt)`; it is the deployer `multisig`'s README
    § Deployments names for Ethereum, Base, MegaETH, Arbitrum, Optimism, Robinhood Chain, Sepolia and
    Base Sepolia, the eight chains of criterion 7, and `multisig` carries `script/deploy.html` and
    `script/VanityMiner.sol` around it. The overview § 10 line stands as written. Supersedes the
    milestone's D12 row, whose candidates were the keyless proxy, the Safe singleton factory and
    CreateX, and whose default was the keyless proxy. Chosen because it is proven on the eight target
    chains by our own deployments, it reuses org tooling, and vanity-mined addresses match house
    style. Rejected: the keyless deterministic-deployment proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`;
    more ubiquitous and 69 bytes to SafeSummoner's 18,730, which would matter beyond those eight
    chains, but a second deployer convention inside one org for no gain today); it is used only if
    SafeSummoner is absent on a criterion-7 chain. Still owed by m03-t06: the `cast code` preflight
    on all eight chains (only Ethereum mainnet checked, block 26,283,809), and a read of
    SafeSummoner's salt rules, since the miner's `CALLER` option suggests the salt may bind to
    `msg.sender`, which decides who runs the deploy.
32. **DNZN's distribution is created by one org-wide cold creator key.** D13, ruled on
    [#90](https://github.com/dnznlabs/rake/issues/90) ("option 1, scoped to the org rather than to
    rake"). The key that calls `create` is a fresh cold EOA, **DNZN Creator** (keystore
    `dnzn-creator`), held by Denizen and backed up to the standard of an owner key; it is the one
    creator key for every DNZN project whose contracts are placed by a salted `create`, not a key for
    rake alone. Two conditions, recorded org-wide, which the M03
    runbook references rather than restates: salted creates only (it is a CREATE2 `msg.sender`, never
    a plain CREATE, where the address would depend on the order of every other deploy across projects
    and chains; a project that needs nonce-based addresses gets its own throwaway key); and never an
    owner or a signer for anything else (the owner passed to `create` is the Ops multisig, M05's).
    Compromise costs nothing deployed: the holder could place a contract at a DNZN predicted address
    on a chain DNZN has not reached, with an owner of their choosing, which is the squat decision 10
    exists to prevent, now across every project at once; accepted because separate keys stored the
    same way would fall together anyway and multiply the backup burden. Rejected: an existing key
    Denizen names. The key's address, the salt's top 20 bytes, named 2026-11-07 after a restore from
    its paper backup reproduced it: `0x68e0741D8d693e14BF56914567eADdC130b186eE`. The low 12 bytes
    ruled `…0001` by Denizen on 2026-11-07 in the architect's Telegram DM ("0001 is fine"), so
    `DNZN_SALT` is `0x68e0741D8d693e14BF56914567eADdC130b186eE000000000000000000000001` and
    `predict(DNZN_SALT)` on a factory at `0x00D18B5b…` (decision 37) is
    **`0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`**, measured on two anvils at M03 close-out
    ([CLOSEOUT.md](milestones/m03/CLOSEOUT.md) criterion 6). Nothing remains open on #90; the
    close-out PR closes it.
33. **The factory is placed through Arachnid's keyless deterministic-deployment proxy,
    `0x4e59b44847b379578588920cA78FbF26c0B4956C`; the Safe singleton factory is the fallback for a
    chain that refuses pre-EIP-155 transactions and lacks it.** D12, re-ruled on
    [#89](https://github.com/dnznlabs/rake/issues/89) on 2026-10-30 ("Lockin Option 1") after the
    2026-10-27 ruling was suspended for research. Supersedes 31. Chosen because it is the only
    candidate anyone can place on a new chain without a key (a published pre-EIP-155 transaction
    after funding `0x3fab184622dc19b6109349b94811493bf2a45362` with 0.01 ETH), it is present on all
    eight criterion-7 chains and in genesis on MegaETH and Robinhood Chain, it is Foundry's default
    CREATE2 deployer, and its salt is raw, so vanity mining and offline prediction are a
    `cast create2` call. Rejected: SafeSummoner (placed by `z0r0z.eth` through a sender-bound
    VanityMarket token, mainnet tx `0x028bd2b5…f05cfc`; no path to a new chain without that key;
    its users are z0r0z's projects only); CreateX (unaudited by its own README, a held key, hashed
    salts); the Safe factory as primary (every new chain waits on Safe's key and queue). Decision
    31's premises "our own deployments" and "org tooling" were `src-company/multisig`'s, and
    SafeSummoner's salt is not sender-bound: `create2Deploy` passes it raw. A front-run of the
    factory's init code yields the identical contract, since no constructor reads the sender. The
    cost of the proxy is that a constructor run through it sees the proxy as `msg.sender` and the
    submitter as `tx.origin`; `App` takes its owner as an argument and the factory has none, and the
    runbook greps `src/` for both before any deploy so a later constructor change fails there. The
    runbook's preflight expects 69 bytes of runtime code with keccak
    `0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989` on every chain. The
    overview § 10 line naming SafeSummoner is superseded by this record; the brainstorming folder
    stays frozen.
34. **M03 Phase 3 starts beside t03, not after Phase 2 closes.** Ruled by Denizen on 2026-10-30
    (Telegram), at the scoping of m03-t03 and m03-t04. The review's input is `src/` and the two
    deploy scripts, final at `ede55c3` (the merge of #103, m03-t02); t03 touches only `app/` and
    carries `git diff --stat origin/main -- src/` empty as an acceptance criterion, so the commit
    t04 reviews is fixed before t03 lands and does not move when it does. Supersedes nothing: M03
    § Phases already keyed Phase 3 on `src/` being final rather than on Phase 2 closing, and that
    sentence is clarified to say so. The cost accepted is that an `app/` change found to need a
    contract change would re-open a review already run; t02's handoff swept all of `app/` and
    found none, and `app/` depends on the struct and the ABI only. Rejected: serialising (a
    review that waits for a dapp task reads the same bytes a week later).
35. **`OWNER` is the Ops vault on every target chain; Base Sepolia got the vaults rather than an
    exception.** D-question opened at m03-t06's scoping on
    [#114](https://github.com/dnznlabs/rake/issues/114), ruled by Denizen on 2026-10-30 by doing
    it: Treasury `0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9` and Ops
    `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` were created on Base Sepolia (84532) at their
    addresses — same factory `0x000000000e8CB9ed9DC2114d79d9215eacb9cB07`, same sender-bound
    salts, so the same `create2` — and re-read the same night: both vaults carry the same 45-byte
    code, the same three owners, 2-of-3, delays 86,400 s and 3,600 s, Ops's fast path on, on all
    eight chains of M03 criterion 7. So `App`'s owner and the owner passed to DNZN's `create` are
    one constant, the Ops vault, on every chain, and `App` is same-address on all eight. The
    question existed because the org's vault roster said "mainnet + Sepolia", which was stale
    by six chains; the chain, not the roster, is the source for deployment state (the row was
    corrected 2026-11-06). Rejected: Denizen's EOA as owner on chains without a vault, handed over
    later (two owners to keep straight, and `App` at a different address on one testnet).
36. **F8 is documented, not capped: the ERC-20 push keeps all its gas.** D14, opened at m03-t05's
    scoping on [#123](https://github.com/dnznlabs/rake/issues/123), ruled by Denizen on 2026-10-31
    ("Select Option 1"). The grief needs a hook token (ERC-777-style `transfer` callbacks, a
    non-goal in the overview) *and* an owner-chosen hostile row; its effect is a `distribute(token)`
    for that token that cannot be mined until a re-table through the delay, and nothing is lost.
    t05 measured it on the branch at `b0fb4e3`: with a `GasBurner` first in a full table under a
    hook token, `distribute` first succeeds at 95,049,000 gas (reverts at 95,048,000), over three
    30M blocks — read the handoff, not this line, before quoting it. `SECURITY.md`'s F8 row states
    the shape, its two preconditions and the owner's remedy; `test_hookRecipientStarvesLaterRows`
    asserts the measurement. Rejected: `gas: PUSH_GAS` on the ERC-20 call (an honest token whose
    `transfer` needs more — proxied tokens with pause and blocklist checks on cold slots, rebasing
    or reward-bearing tokens — would be escrowed on every push and never releasable under the
    same cap: the #95 shape, permanent, for a compliant token); a 500k cap (bounds nothing the
    half-block rule cares about and keeps the same failure above it).
37. **`FACTORY_SALT` and `APP_SALT` are mined for a vanity prefix, not zero.** Opened at m03-t06's
    scoping on [#115](https://github.com/dnznlabs/rake/issues/115), ruled by Denizen on 2026-10-31
    ("Option 2 is fine"); recorded at t05's close-out on 2026-11-01. Mined with
    `cast create2 --starts-with <hex>` against the final init-code hash, four to six hex digits,
    matching the vaults' addresses (`0x00b6…`, `0x00c0…`). A mined salt is tied to one bytecode, so
    each is mined once, after the contract it places is final and before M04's first public deploy;
    any later change to that contract mines again (decision 5: a new version is a new factory
    anyway). Sequencing that follows: `DistributionFactory` and its implementation are final at
    `b0fb4e3` (m03-t05, #124), so `FACTORY_SALT` can be mined now; `APP_SALT` waits until D15
    ([#126](https://github.com/dnznlabs/rake/issues/126)) rules whether a t07 touches `App.sol`.
    t06's two-anvil rehearsal runs with zero salts in every case (the issue's default), since the
    runbook takes the salt as a variable and the rehearsal proves the method, not the address.
    Rejected: zero salts (nothing gained, and the house style already has the prefix).
    *Amended 2026-11-07 — the prefixes.* Ruled by Denizen in the architect's Telegram DM ("yeah go
    with option 1"): `0x00` plus four hex digits, the vaults' family — `0x00d1…` for
    `DistributionFactory`, `0x00a9…` for `App`, the pair the architect proposed. Rejected: four
    digits without the `0x00` (no family resemblance) and eight digits (hours per salt for a signal
    nobody reads). The sequencing above is superseded by events: `FACTORY_SALT` was not mined at
    `b0fb4e3`, because t08 and then #150 (a) moved `Distribution.sol` after it; both salts are mined
    once, in [m03-t10](milestones/m03/tasks/m03-t10/TASK.md), after that task's NatSpec line — the
    last `src/` byte — and the mining took 2.4 ms per salt at rehearsal, so "minutes" in the DM was
    an overestimate. #115 closed the same day.
38. **`App.lock` is fixed before M04: a t07 refuses any chunk pointer whose code can change.** D15,
    opened at m03-t05's second review on [#126](https://github.com/dnznlabs/rake/issues/126), ruled
    by Denizen on 2026-11-01 ("Option 1"). The issue's § Record said decision 37; #115 took that
    number first, so this is 38. The finding (`SECURITY.md` F11, leg 2's F4 of 2026-10-31,
    confidence 80): `setChunks`, `setWidgetChunks` and `lock` admit a pointer on `code.length`
    alone, and an EIP-7702 delegation designator (`0xef0100‖address`, 23 bytes) has code, so its
    key holder can re-point or clear what a locked `App` serves. Rehearsed at scoping with
    `vm.signDelegation`/`vm.attachDelegation` on `67146a7`: `code.length` 23, first byte `0xef`,
    and today's `setChunks` then `lock` both succeed. The fix is one private check — non-empty code
    whose first byte is the `STOP` `SSTORE2.write` prefixes (`lib/solady/src/utils/SSTORE2.sol:52`);
    EIP-3541 means no deployed contract begins `0xef`, and `SSTORE2.read` discards byte 0, so a
    pointer the check refuses could never have been served correctly — plus one error,
    `ForeignChunk(address)`, and a third two-leg review, since criterion 4 wants `SECURITY.md` to
    name a commit with no `src/` diff to the one M04 deploys. Why before M04 and not in the next
    version: `App` is placed at one same-address on every chain (decision 5), so a fix after M04 is
    a new address on eight chains, and this version's `lock()` could never be called — a one-way
    door with a known defect behind it. Scoped as m03-t07 the same day; runs beside t06, and
    `APP_SALT` (decision 37) is mined against the hash t07's merge produces. Rejected: carrying all
    three new findings (option 2) for the reason above; a t07 for all three (option 3), because F12
    has no contract fix the contract can tell from an honest token — it is a chain precondition,
    [#127](https://github.com/dnznlabs/rake/issues/127) — and F13 is F9's mechanism, whose
    mitigation stands; both were dispositioned at t05's close-out and neither row moves.
39. **Queued actions expire: a matured action is applicable for `GRACE` after its eta, then anyone
    may drop it.** D16, opened at the #133 triage on [#134](https://github.com/dnznlabs/rake/issues/134),
    ruled by Denizen on 2026-11-01 ("Option 1"). Reverses F9/F13's "none needed" (reconciled the
    same morning) on the third independent raise of the shape: the 2026-10-30 leg (F9), the
    2026-10-31 leg 2 (F13) and DNZN // RESEARCH's source analysis (#133 item 1). `queued[hash]` held
    only an eta, so a forgotten proposal was a permanent option held by the public and whoever
    called `applyQueued` chose the order. The fix is `uint256 public constant GRACE = 14 days`, an
    `Expired(eta)` revert in `applyQueued` past `eta + GRACE`, and `cancel` accepting an expired hash
    from anyone — Compound's Timelock shape; one new error and one new view in the ABI. Rejected:
    nonce ordering (a never-applicable entry, decision 25's shape, would block everything behind
    it); an owner epoch (t05's queue clear already covers handovers and renounces); keeping "none
    needed" with a dapp warning (ships a three-times-flagged shape at a permanent address). Decision
    25 is not reopened: it rejected cancel-by-anyone on a revert test, which is not always decidable;
    an expiry is a timestamp comparison. Built as [m03-t08](milestones/m03/tasks/m03-t08/TASK.md),
    which merges before t07 freezes so the third review reads both changes once.
40. **The escrowed account can claim its escrow, to an address it names, with its own gas.** D17,
    opened at the #133 triage on [#135](https://github.com/dnznlabs/rake/issues/135), ruled by
    Denizen on 2026-11-01 ("Option 1"). Reverses F5/#95's "documented" on #133 item 2's correction
    of the documented remedy: `release` retried through the same `_push` under the same `PUSH_GAS`,
    so a recipient needing more than 100,000 gas to accept ETH, or a token that refuses the account,
    could never be paid — and a re-table stops further escrow but recovers nothing already held, which
    `SECURITY.md`'s F5 row and #95 claimed it did. The fix is `claim(address token, address to)`,
    `nonReentrant`, moving only `msg.sender`'s escrow with the caller's gas and emitting
    `Claimed(token, account, to, amount)`; `release` stays as the permissionless push. Two shapes it
    does not rescue are stated in the row: a contract recipient with no outgoing-call ability, and
    the fact that an issuer-frozen beneficiary can redirect tokens the Distribution holds. Rejected:
    keeping it documented (a permanent loss for an honest recipient with an expensive `receive`).
    Same m03-t08.

Ruled by Denizen on 2026-11-07, at M04's scoping, each on the issue linked.

41. **The widget's test host is a static page under dnzn.dev.** M04-D1, ruled on
    [#156](https://github.com/dnznlabs/rake/issues/156) ("Option 1"). The page that embeds the
    widget for M04 criterion 5 lives on a host Denizen already runs under dnzn.dev: one HTML file
    on his side, an origin we do not serve, nothing newly public; it is also where M05's dapp mirror
    will live (decision 12's "mirrors of it"). m04-t04 writes the file's content and the URL is
    recorded in its handoff; publishing it is Denizen's step. Rejected: GitHub Pages from a new
    public repository (a public repo whose only content is the snippet; rake itself is private); a
    page served from this VM over a tunnel (the origin would be ours, and a real host's CSP and
    mixed-content behaviour is what the criterion exists to meet).
42. **DNZN's testnet distribution: "DNZN // FEE DISTRIBUTION", one day, 60/30/10.** M04-D2, ruled
    on [#157](https://github.com/dnznlabs/rake/issues/157). `RUNBOOK.md` step 6 on Sepolia and Base
    Sepolia passes `DNZN_DESCRIPTION` **`DNZN // FEE DISTRIBUTION`**, `DNZN_DELAY` **86,400** (one
    day), and a three-row table — written here **in the ascending address order `_set` requires**,
    which is not the order the ruling listed them in: Treasury `0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9`
    at **1,000 bps**, Ops `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` at **3,000**, and
    `0x357836fFcB45307FA7ff2A574F505753c961902B` at **6,000**, the row the ruling labels "Creator".
    **That label is a beneficiary's name, not the Creator key:** the key that signs the `create` is
    decision 32's `0x68e0741D…`, and it holds no row; `0x3578…902B` is Denizen's own address. The
    `owner_` passed to `create` stays the Ops vault (decision 35). These are the testnet values; M05's
    are M05's to rule, so they live in `RUNBOOK.md` § Executed on testnets (m04-t03), not in § 0.
    Rejected: the anvil rehearsal's placeholders under DNZN's name on two public chains; skipping
    step 6 on testnets (criterion 1 and state-collection#74 both need code at the address).
    **Amended 2026-11-08 (m04-t03 review).** Three things pinned before the first testnet `create`:
    (i) **these are the values a testnet step 6 uses** — not placeholders and not M05's; `RUNBOOK.md`
    § Step 6's "M05 values are M05's to fill" refers to the mainnet table, and the m04-t03 handoff's
    § For Denizen carries exactly these. (ii) **Step 6 runs before step 4 on the testnets** (Denizen,
    22:17 CST: he travels with the Creator key and one of three Ops signers, so the document upload
    waits for his return while the `create` does not); step 6 touches only the factory and the clone,
    so the order is sound and no runbook deviation is needed. (iii) **Precondition, unverifiable from
    any agent host:** `RUNBOOK.md` § Step 6 requires the Creator key "backed up to the org's
    standard for an owner key before step 6 runs anywhere" — #23 closed the *documentation* of that
    requirement, not the backup — so Denizen confirms the backup in writing before the first send.
    **Confirmed by Denizen, Telegram, 2026-11-08 22:26 CST: the Creator key is backed up to the
    org's standard for an owner key.** The medium and location are deliberately not recorded here
    or anywhere in this repo; the fact, the date and the channel are what the gate needs. The handoff
    repeats that line beside the step-6 rows; the gate is satisfied. The address is
    `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f` on both chains (`predict(DNZN_SALT)` on the live
    factory, `cast code` `0x` on both, 2026-11-08); the anvil rehearsal's `0x633e24C2…6148` differs by
    design — a different salt prefix and a different implementation address fold into the clone's
    init code — and is not a discrepancy.

43. **`create` accepts a zero `owner_`; a born-renounced distribution is documented, not refused.**
    M04-D3, ruled by Denizen on 2026-11-08 on [#173](https://github.com/dnznlabs/rake/issues/173)
    ("Option 1"), reaffirmed the same day against the question "are we being lazy". Raised by
    Slither's `missing-zero-check` on `init:134` (m04-t06, `SECURITY.md` § Static analysis row 14).
    Two industry standards exist and they split by what the contract is: OpenZeppelin `Ownable`
    (v5.0+) reverts `OwnableInvalidOwner(address(0))` in its constructor, because a zero owner on a
    general-purpose contract is almost always a typo and the owner is usually the only route to
    anything; 0xSplits' `createSplit` documents its `controller` as "0x0 if immutable", deploys that
    case deterministically and exposes `predictImmutableSplitAddress` for it — an immutable split is
    their headline product, not an edge case (`SplitMain.sol`, read 2026-11-08). Rake is the second
    kind: an ownerless distribution is a fully working splitter whose table can never change, which
    is a thing a counterparty deliberately wants to be able to verify. **The reason, not just the
    precedent:** rake has no one-call renounce. Renounce is `propose` → the delay → `apply`, so
    refusing a zero owner at `create` would make the honest route to an immutable distribution slower
    and, during the delay, less trustworthy — the interim owner could rewrite the table. The
    restriction removes no state; it taxes the people who want that state. No `src/` byte; row 14
    stays `design`. **The mistake risk moves to the dapp**, where it belongs:
    [#172](https://github.com/dnznlabs/rake/issues/172) adds the `REFERENCE.md` sentence, a test
    pinning the shape, and a create-screen guard — whenever the owner field holds anything other than
    the connected wallet, the page says what it holds (zero: "no owner, immutable forever"; a
    contract; an account; a never-used address) and requires an acknowledgement before step 2, the
    pattern the ownership drawer already uses. Rejected (option 2): a one-line zero check in `init`
    or `create`, M03 reopened for a state the contract already supports on another path.

44. **Step 4 of the runbook — the document upload — is an Ops-vault action, permanently.** M04-D4,
    ruled by Denizen on 2026-11-08 on [#178](https://github.com/dnznlabs/rake/issues/178) (Telegram,
    22:06 CST: "I guess I was thinking we wouldn't set owner to the multisig until after everything is
    fully deployed and tested - but agree, doesn't help future deploys that require ops ms anyway. yes
    I have access to all three signers on the ms."). Found by m04-t03: `App` takes its owner in the
    constructor, the chunk setters are `onlyOwner`, § 0 makes the owner the Ops vault on every chain and
    `APP_SALT` was mined against init code containing it, so the engineer's key can never run step 4
    on a public chain — and the only rehearsal had signer and owner as one anvil account. Five calls
    per chain (`addChunk` ×2, `addWidgetChunk`, `setChunks`, `setWidgetChunks`), by one of two routes:
    **unanimous via `TimelockExecutor.forward()`, immediate**, which Denizen can satisfy alone since
    all three Ops signers are his; or **threshold via `Multisig.execute()`, queued for the vault's
    3,600 s, then `executeQueued()`**, kept in the runbook as the fallback. *Route changed 2026-11-15
    ([#191](https://github.com/dnznlabs/rake/pull/191)): the threshold route is the one used, as one
    `batch` proposal per chain with the engineer's signature first — RUNBOOK § Step 4 (4a–4d). And
    again 2026-11-16: three proposals per chain, because the one `batch` exceeds the proposal-size cap —
    decision 47.* `forward()` requires
    `ownerCount()` signatures for anything but `cancelQueued` (`TimelockExecutor.sol:35-46`); the
    org record that said threshold was corrected the same day. Every later
    upload, `lock()` and M05's mirror take the same road. Rejected: redeploying `App` owned by the
    deploying key and transferring afterwards (a new `APP_SALT`, a new live address, and it saves one
    upload); the engineer's key as owner (decision 35). **Also ruled:** the
    step-4 preparation is a new task, m04-t08, scoped after this ruling rather than widened into
    m04-t03 under review — the engineer correctly refused to take it from an issue, since `TASK.md` on
    `main` is the only task authority.

Ruled by Denizen on 2026-11-11 over Telegram, for rake, runner and drop alike, as an org
convention. Numbered 45 because 44 is taken by
[#180](https://github.com/dnznlabs/rake/pull/180), open when this was written.

45. **Alpha marker: `0.1alpha`, the tag line, the Disclaimer; removed by a test.** "Alpha" is a
    marker, not a version in the contract: `App.version` is a constructor argument that feeds `App`'s
    CREATE2 address (`DeployApp.s.sol`'s own comment) and stays `v0.1`. The marker lives in three
    places: the page's version string — `0.1alpha`, and one source: `build.mjs:55` hardcodes
    `VERSION: 'v0.1'` beside `App.version`'s `v0.1` today, and the task collapses the page string onto
    `App.version` plus the marker — the README's Release Info table, and a Disclaimer section first in
    `#/docs`, saying: alpha; reviewed by the two-model method and Slither (`SECURITY.md`), not
    audited; no warranty; and that the contracts are immutable, so a found bug is not patched, it is
    a new address. The tag line "alpha software is alpha, act accordingly." sits in the dapp header
    and on the landing, every view, linking to that section; the widget carries the word `alpha` and
    no link (decision 12's one outbound link is spoken for and M02 criterion 7's 10,240-byte gate
    stands). An M04 Phase 1 task, `app/` and README only, with the chunks re-uploaded on both
    testnets before Phase 4's UAT reads the page. Removal: 90 days after M05 closes with no `bug`
    issue filed and no accepted security finding, the marks come off in one PR — a chunk re-upload
    and a README edit, no redeploy — one more reason `lock()` is not called at launch (decision 5).
    Rejected: the marker in `App.version` (a new `App` address, and M03's predicted addresses
    redone); a README-only disclaimer (the dapp is the surface a user reaches without ever seeing the
    repo).

46. **The first public-testnet document upload ships the dev-seed `FEATURED_SALT`; a real featured
    distribution comes with the next upload.** [#190](https://github.com/dnznlabs/rake/issues/190).
    Ruled by Denizen on 2026-11-16 (Telegram, 08:46 CST): "that's fine - re-running the uploads ...
    it's really only this first ... in the future will be regular updates... but we'll need a followup
    task created so that we set the featured distro and re-upload chunks." So the committed `batch.hex`
    (since decision 47: the committed `1-addChunk-0.hex`, `2-addChunk-1.hex` and `batch345.hex`)
    is what step 4 signs; the landing page's featured panel is empty on Sepolia and Base Sepolia until
    [#193](https://github.com/dnznlabs/rake/issues/193) (carried, m04) creates the featured distribution
    per chain and re-uploads. Rejected: creating the distribution first (a day's delay before the
    first upload, and the Creator key used for a testnet seed) and hiding the panel when the salt
    resolves to no code (a bundle change inside a task that forbids one; reconsidered in #193).

47. **Step 4 is three vault proposals per chain, not one `batch`: the two `addChunk` calls plain,
    then one `batch` over calls 3–5.** Ruled by Denizen on 2026-11-16 (Telegram, 10:00 CST):
    "option 2". Found at step 7 of m04-t08, the first time the route of #191 was tried for real: the
    multisig coordination service caps a proposal's calldata at **65,536 hex characters** (32,768
    bytes) and the request body at 72 KiB, and the dapp enforces the same limits; the five-call
    `batch.hex` is 109,962 characters and was refused — measured live with a paired control (413 at
    the batch's size, 400 just over the cap, past every size check at 64,000), recorded on
    [#188](https://github.com/dnznlabs/rake/issues/188), which this widens: `MAX_CHUNK = 24_000`
    is now bound by the code limit, by gas and by the proposal cap, and one `addChunk` of a full chunk
    is 48,138 characters, 73% of it. The shape: proposal 1 = `1-addChunk-0.hex` (48,138 chars) and
    proposal 2 = `2-addChunk-1.hex` (42,890) as plain calls to `App`; proposal 3 = `batch345.hex`
    (18,314), the vault's `batch(address[],uint256[],bytes[])` over `addWidgetChunk`, `setChunks`,
    `setWidgetChunks`, so the setters stay atomic with the widget chunk where `CodelessChunk` bites.
    Each has its own digest at nonce *N*, *N* + 1, *N* + 2; each is proposed with the engineer's
    signature and co-signed by the Product Owner; submit queues each at its own eta and
    `executeQueued` runs 1, 2, then the batch, because calls 4 and 5 validate the pointers 1 and 2
    create. `batch.hex` is deleted, not kept beside the live file. RUNBOOK § Step 4 (4a–4c, § The five
    calls, § Gas) and m04-t08's steps 7–9 are amended to match. Rejected: **five plain proposals**
    (the setters no longer atomic with the chunk they name, and five signing rounds for the Product
    Owner); **on-chain `approve()` from both owners with one packed `execute`** (needs the Product
    Owner to send raw transactions on Sepolia — the limitation that moved the route off `forward()` in
    #191 — and the approve path is unverified in source); **shrinking `MAX_CHUNK`** (a contract
    constant that re-chunks every later upload; #188's question, owned by the milestone that next
    touches the upload). Supersedes the route line of decision 44 (one `batch` proposal per chain),
    not the decision: step 4 is still an Ops-vault action.

48. **The alpha marker comes off the landing hero and the widget; it stays in the header.** Ruled by
    Denizen on 2026-11-17 (Telegram, 00:15 CST): "alpha comes off the landing *hero* and widget - not
    the header". Decision 45 put the tag line in the dapp header *and* on the landing, and the word
    `alpha` in the widget; the testnet run ([#203](https://github.com/dnznlabs/rake/pull/203))
    found the landing repeated it under the hero and proposed dropping both the repeat and the widget
    word. The marker now lives in the header tag line on every view, the page version string
    `0.1alpha`, the README table and the `#/docs` Disclaimer; the widget carries no marker. The
    reasoning of 45 stands: the header is the surface every view shows, so the owner still sees it;
    the widget is embedded on a host that is not ours and the marker is for owners. Removal at 90 days
    (decision 45) is unchanged and now touches one place fewer. Amends decision 45's placement, not
    its content or its removal clause.

49. **The DNZN fee distribution exists on every chain the dapp is deployed to, so the featured panel
    is not hidden when its salt resolves to no code.** Ruled by Denizen on 2026-11-16, recorded in the
    body of [#203](https://github.com/dnznlabs/rake/pull/203): "The featured panel is not hidden when
    the salt has no code: ruled 2026-11-16 that the fee distribution will exist on every chain the
    dapp is deployed to." `mk/15-seed.mk` picks `FEATURED_SALT` per chain: the seed's on 31337, the
    DNZN fee distribution's (`0x357836ff…902b` + `…0001`, which `predict()`s
    `0x71a4221974Fc2E95081AE513248918dF27CF7a4A` on Sepolia and Base Sepolia) everywhere else. This
    answers the second open question of [#193](https://github.com/dnznlabs/rake/issues/193) (hide the
    panel on an empty salt: no) and amends decision 46's rejected clause on hiding; 46's first-upload
    ruling and #193's re-upload are unchanged. Consequence for M05: Step 6 (`create` from the Creator
    key at that salt) is a precondition of the page reading correctly on each mainnet, not an
    optional last step.

50. **The mainnet DNZN distribution is the Sepolia one, `0x71a4221974Fc2E95081AE513248918dF27CF7a4A`,
    with a 7-day delay and the Ops vault as owner.** Ruled by Denizen on 2026-11-17 (Telegram,
    00:19 CST: "this is the distro i want to create on all chains - refer to sepolia
    name/beneficiaries/etc … except on mainnets 7d instead of 1h"; 00:27 CST: "yes, on mainnets the
    ops vault should be owner"). Read from chain on 2026-11-17 (`cast call` via publicnode Sepolia and
    `sepolia.base.org`, identical on both): description `DNZN // FEE DISTRIBUTION`; table, ascending
    by account, `0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9` 2,000 bps `treasury` "long-term growth,
    future projects" · `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` 4,000 bps `ops` "infrastructure,
    services, tokens" · `0x357836fFcB45307FA7ff2A574F505753c961902B` 4,000 bps `creator` "founding
    engineer, product vision"; salt `0x357836ff…902b` + `…0001`; owner on the testnets the Creator EOA,
    delay 3,600 s. On every mainnet: the same description, table and salt, so `predict()` gives the same
    address wherever the factory is at its one address (**superseded by decision 54 on the address and
    the salt**: the Sepolia salt begins with Denizen's EOA, so its address cannot be reached by the
    Creator key; description, table, delay and owner stand); `DNZN_DELAY` 604,800; `OWNER` the Ops vault
    `0x00c0e887…3790`, passed as `create`'s `owner_` directly — `create(owner_, …)` sets the owner, so
    no `transferOwnership`/`acceptOwnership` round follows. Ops is 2-of-3 with a 3,600 s timelock on all
    six mainnets rake targets (handbook `docs/multisig-transactions.md`, read 2026-10-30), so an owner
    action on the distribution is two signatures, Ops's hour, then the distribution's seven days. The
    `create` itself still comes from the Creator key: the salt's top 20 bytes must be `msg.sender`
    (decision 10). Corrects the M05 row and RUNBOOK § Step 6, which said "60/40": the table is
    20/40/40 and has been since the Sepolia `create`; the ROADMAP row was written before it existed.
    Rejected: the Creator EOA as owner, as on Sepolia (a 7-day delay guards a mistaken action, not a
    compromised single key, and this contract routes DNZN's fees); `create` then transfer to Ops (two
    extra transactions for a value `create` already takes).

51. **The DNZN distribution is described `DNZN // FUND DISTRIBUTION`, not `FEE`.** Ruled by Denizen on
    2026-11-17 (Telegram, 00:51–00:53 CST): "we should call our distro 'DNZN // FUND DISTRIBUTION'
    instead of 'FEE' ... since on our first three projects we're not taking a fee (donation only)";
    "go for it". `FEE` claimed something the first three projects do not do; `FUND` names what flows
    through it and stays true if a fee is added later. Cost: none to the address, which depends on the
    factory and the salt only (`src/Distribution.sol:445`). On every mainnet `DNZN_DESCRIPTION` is the
    new string at `create`. On Sepolia and Base Sepolia the live distribution keeps `FEE` until its
    owner (the Creator EOA, decision 50) queues `setDescription` and applies it after the 3,600 s
    delay — [#209](https://github.com/dnznlabs/rake/issues/209), carried, m04, which doubles as a
    rehearsal of the owner path before t05's UAT reads the page. Amends the description in decisions
    42 and 50; the rest of both stands. Design history under `docs/brainstorming/` that says "fee
    distribution" is left as written. Rejected: `DNZN // DISTRIBUTION` (claims nothing, and says
    nothing).

52. **The dapp caches finalized event logs in IndexedDB, per chain and distribution, evicted by last
    visit.** Ruled by Denizen on 2026-11-17 (Telegram DM, 11:09 CST). Option 1 of three: one object
    store keyed `[chainId, address]` holding the three raw `eth_getLogs` results a distribution's
    history is built from, complete up to the chain's `finalized` block as of the last visit; each load
    reads `finalized` once (`eth_getBlockByNumber`), serves the record, scans only the tail above it
    live, and persists only what is at or below `finalized`; a provider that refuses the tag gets
    `head − 1000`, said in a comment. Records are never trimmed internally; across distributions, one
    not opened in 30 days is dropped whole, and the store holds at most 50, least recently visited
    first. The schema version is in the key, so a decoder change starts clean. With storage
    unavailable the page behaves as it does today. `app/` only; `logs()` and `histLogs()` are wrapped
    and nothing above them changes. Amended the same day (11:10 CST): the `#/docs` page gains a
    Cache section — what is stored, count and bytes, the eviction rule, a `clear cache` control — with
    its wording a draft under decision 17. **Why:** the history budget is 40 windows per log kind
    (m04-t01, #76), 120 `eth_getLogs` per page load once the span from the factory block exceeds the
    budget on an uncapped provider — 400,000 blocks at the 10,000-block start — and the scan is paid
    on every load, so it only gets heavier as the chain ages. Measured 2026-11-17: Base and Base
    Sepolia mint a block every **0.2 s** (10,000 blocks in 2,000 s on both `mainnet.base.org` and
    `sepolia.base.org`), so that span is under a day of factory age and the Base Sepolia factory,
    9.0 days old, is already 3.9 million blocks back; on a 12 s chain it is about 56 days. A cached
    load reads the tail above `finalized` — 4,387 blocks on Base and 6,500 on Base Sepolia at one
    read the same day, 81 on Sepolia — one window per kind uncapped, so the 120 becomes 3 after the
    first load and stays 3 as the chain grows. Closes
    [#165](https://github.com/dnznlabs/rake/issues/165) against the per-load figure m04-t12 measures,
    rather than by a block-target budget; m04-t12 must merge before M05 uploads the mainnet document,
    or every mainnet chain pays a chunk re-upload for it (**superseded by decision 62 on the gate**:
    t12 is closed before mainnet, see the second addendum below). **Rejected:** (2) leave the scan as is and
    close #165 with a block-target budget — still the full scan on every load, and the only option
    that gets dearer with time; (3) a `createdBlock` on the clone so the scan starts at the right
    block — still rescans the whole lifetime every load, and touches clone storage, which is frozen
    (decision 5, `src/` final since M03). Also rejected: a service worker caching JSON-RPC responses
    (keyed by request body, and every window boundary differs, so the hit rate is near zero), and
    per-record age expiry (the `Applied`-to-`Queued` matching, the recognised-token list and the
    escrow rows are derived from the whole lifetime of logs, and a trimmed record breaks them with
    nothing on the page to say so). Task: [m04-t12](milestones/m04/tasks/m04-t12/TASK.md).
    **Addendum 2026-11-18 (held, [#227](https://github.com/dnznlabs/rake/pull/227)):** Denizen
    halted the task's PR on 2026-11-18 (Telegram DM, 00:05 CST) while testing it locally before
    mainnet; the ruled shape stands and the ship decision moves. m04-t12 is out of the next Run B,
    which carries t11, t04 and t13 only; the branch stays unmerged at `ad556ff`, do-not-merge. The
    remedy was sized from the public fallback RPC and the page reads through the wallet's, which
    m04-t05 is the task to measure, and it adds persistent client state right before that UAT.
    Decide after t05 records the per-load count and wall time through MetaMask's RPC, and before
    M05 builds the mainnet document, which was always the gate that mattered: ship it as amended,
    or close #165 by option 2 with the figure recorded. #165 reopens against t05 until then.
    **Addendum 2026-11-19 (closed, decision 62):** the ship-or-close deadline above is withdrawn.
    m04-t12 is closed before mainnet, #227 unmerged with its branch kept, and #221 and #165 are
    carried as a post-mainnet consideration; neither the gate "before M05 builds the mainnet
    document" nor the line "m04-t12 must merge before M05 uploads the mainnet document" is live.
    The ruled shape of this decision (option 1, the finalized-log cache) stands as the design if
    the figure ever justifies it.

53. **The gateway the visitor chose is the trust boundary for the hosted dapp; `web3://` direct is
    preferred and gateways are a convenience.** Ruled by Denizen on 2026-11-18 (GitHub,
    [#232](https://github.com/dnznlabs/rake/issues/232), 14:26 UTC): "Option 1 - document it. web3://
    direct is preferred, gateways are for convenience. Anyone can run a gateway that serves a contract
    html(), it is a trust boundary out of scope for our project." The project accepts that a `web3://`
    gateway operator can alter what a visitor runs, and says so: the authenticated paths are a native
    `web3://` client or a gateway the visitor runs themselves (the one m04-t02 put in the dev stack); a
    hosted gateway such as `w3link.io` is a convenience whose operator the visitor is trusting.
    Supersedes nothing; it records the ruling that `SECURITY.md` § Front end row R1 (front-end audit
    `audits/2026-11-17/frontend/AUDIT.md`, m04-t04, [#230](https://github.com/dnznlabs/rake/pull/230))
    was dispositioned `accepted` on, and R23 leans on the same boundary. **Why:** a gateway that can
    inject script into our document can equally serve a different document, so the on-chain bytes
    authenticate the document only to a client that reads the chain itself, and no change in `app/`
    moves that boundary — which is why R1 is `accepted` rather than a `fix` or `design`, and why the
    property is out of scope for the project rather than a defect in it. Cost: a paragraph of page
    text, nothing in `app/` beyond it. The `#/docs` wording is Denizen's under decision 17 and is not
    changed by this transcription: it rides the post-UAT `app/` task alongside
    [#243](https://github.com/dnznlabs/rake/issues/243) and
    [#241](https://github.com/dnznlabs/rake/issues/241), before M05 builds the mainnet document.
    **Rejected:** (2) stop recommending hosted gateway URLs — publish only `web3://<App>/` and the
    self-run gateway, and drop `w3link.io` from the docs page and the widget snippet. Most visitors
    cannot open a `web3://` URL today, so the dapp would have no browser-reachable address until they
    install a client or run a gateway, and the boundary would be no different for those who did
    neither.

54. **DNZN's `create` is signed by the Creator key on every chain, testnets included, never by
    Denizen's EOA.** Ruled by Denizen on 2026-11-18 (Telegram, 15:03 CST): "Oh yeah so it has the
    same address salt. Yes creator key every where not my eoa". Closes M05-D2. Step 6 of `RUNBOOK.md`
    runs as written: `SIGNER` re-exported to the DNZN Creator key `0x68e0741D8d693e14BF56914567eADdC130b186eE`
    (decision 32, handbook `docs/multisig-transactions.md` § The DNZN Creator key), salt `DNZN_SALT`
    = `CREATOR` ‖ `…0001` (§ 0 line 73), on all six mainnets and, in m05-t01, on Sepolia and Base
    Sepolia again, so the DNZN distribution is one address everywhere the factory is. That address
    is fixed when m05-t01's re-mined factory address is (decision 5, M05-D1) and is recorded there,
    not here. `mk/15-seed.mk:10`'s `FEATURED_SALT_DNZN`, today Denizen's EOA salt, becomes the
    Creator salt in t01's bundle (decision 49). Supersedes decision 50's address `0x71a4…7a4A` and
    its "the `create` itself still comes from the Creator key" as a description of Sepolia: read on
    2026-11-18, that distribution's salt and `owner()` are Denizen's EOA `0x3578…902B`, so it was his
    EOA's create and the sentence never held; decision 50's description, table, delay and owner are
    unchanged. Rejected: Denizen's EOA as the address-bearing key, as Sepolia stands (a beneficiary
    row and a wallet in daily use would be part of the address on every chain forever, which decision
    32 ruled out: "never an owner or a signer for anything else"); costs nothing now only because
    M05-D1's redeploy is already forced.
55. **No paid independent review for M05; the self-review is the review of record, and mainnet does
    not wait on one.** M05-D3, ruled by Denizen on 2026-11-18 (Telegram, 16:36 CST) on
    [#167](https://github.com/dnznlabs/rake/issues/167), option 3, after an estimate of $2k–8k for a
    solo review. The direction: there is no budget for a paid review; a review or a bounty may come
    later, possibly paid in trade or in a future token; the project relies on its own self-review and
    due diligence with the tools it already runs (the `pashov/skills` auditor among them); and what
    else a reader could verify from the public repo and the chain is researched as
    [#262](https://github.com/dnznlabs/rake/issues/262). The review of record is the self-review: the two-model `forge-audit` method
    of decision 20 (`audits/<date>/AUDIT.md`), Slither, and the invariant suite. No mainnet
    transaction waits on a review result: Phase 3 of M05 follows Phase 2 on Base's handoff alone,
    and `SECURITY.md` and the README's `AUDIT` cell say what the review is without a "until a paid
    review happens" clause. A paid review or a bug bounty may come later, possibly paid in trade or
    in a future token; that is its own decision when there is a quote and a budget, and nothing here
    commits it. Supersedes decision 20 on the paid review and on
    the go/no-go input only; its method, scope and rollup stand. Rejected: options (1) and (2) of
    M05-D3 (every chain, or the three dear chains, waiting on a review) — both spend money there is
    none of; the quote request #167 stands for is withdrawn, not deferred.

56. **Three reader-verifiable additions to the self-review before the first mainnet deploy: a threat
    model, a coverage floor and a mutation run; the bytecode attestation rides the Base deploy; no
    SMTChecker.** Decision 55's follow-up, ruled by Denizen on 2026-11-19 (GitHub,
    [#262](https://github.com/dnznlabs/rake/issues/262), 06:40 UTC): "Option 2". Before m05-t02, as
    one task (m05-t01b in the M05 plan): (a) `docs/THREAT_MODEL.md` listing actors, token classes,
    chains and what each assumption's test is, each row naming a test `forge test --list` returns,
    diffed against the Solodit checklist and two Pashov fee-distribution reports; (b) a `forge
    coverage --ir-minimum` summary committed with a CI floor one point under the measured figure;
    (c) `slither-mutate` over `src/` with `forge test`, results committed per commit, every survivor
    getting a test or a one-line reason. Folded into m05-t02's deploy task, after the salts are
    re-mined so the first attestation is the real one: (d) a `deployments/<chainId>.json` bytecode
    attestation with a scheduled CI compare of `forge inspect deployedBytecode` against `cast code`
    over a public RPC. Dropped: (e) the solc SMTChecker CHC profile. The next `audits/<date>/AUDIT.md`
    provenance block names the coverage floor and the mutation score beside the leg versions. **Why:**
    (a)–(c) are what make the review's silence mean something and cost under two days of agent time
    with no spend; (d) belongs in the task that produces the bytes it attests; (e) is a week of z3
    noise over arithmetic the invariants already sample. Amends decision 55's description of the review
    of record by addition; nothing in it is superseded. Rejected: option (1), all five as one task
    before m05-t02 (3.5–5 days, the SMTChecker leg the bulk of it); option (3), nothing beyond decision
    55 (the alpha posture carries the risk alone). Rejected before the request, on maintenance: Aderyn,
    Halmos, Mythril, 4naly3er, Gambit, vertigo, Solhint, Certora and a third agent lab, for the reasons
    the issue lists.

57. **R9 is a sentence, not a product change: recognised means "has been distributed once"; R19 and
    #241 get plain-labelled lines; the sentences are drafted on the post-UAT `app/` task's PR.** Ruled
    by Denizen on 2026-11-19 (GitHub, [#258](https://github.com/dnznlabs/rake/issues/258), 06:35 UTC):
    "1a", the recommendation followed, "draft it". The three sentences are the page's voice under
    decision 17, so the architect drafts them on the PR of the post-UAT `app/` task (M04's, m04-t15
    once scoped) and they stay marked draft until Denizen accepts them by that merge; none of the text
    is in this record. R9 (`SECURITY.md` § Front end): the ledger and `#/docs` say that a recognised
    token is one that has been distributed once, and nothing more; the recognised set stays anyone's.
    R19: a plain-labelled line beside the copied calldata giving the target address, the chain and the
    value. [#241](https://github.com/dnznlabs/rake/issues/241): a plain-labelled row for the one-row
    forward to a non-distribution, beside the code fix that rides the same task with
    [#243](https://github.com/dnznlabs/rake/issues/243). Both `SECURITY.md` rows keep their `accepted`
    disposition; the row text names this decision and the task. Rejected: 1(b), the recognised set
    becomes the owner's — a product change to a function anyone may call (decision 11), where the
    finding only needs the page to stop implying a verification the set does not carry.

58. **The Ops vault keeps Elanik as an owner on all eight chains at the current threshold.** Ruled by
    Denizen on 2026-11-19 (GitHub, [#257](https://github.com/dnznlabs/rake/issues/257), 06:33 UTC):
    "Option 1", Elanik stays a signer on the Ops vault to streamline deployment, and whether the
    threshold moves to 3-of-4 is out of scope for this project. So the owner set after
    `addOwner(Elanik)` landed on 2026-11-16 is the set: four owners, threshold 2, a 3,600 s delay,
    which the M05 plan measured on 2026-11-18 on every mainnet it targets
    (`docs/milestones/m05/MILESTONE.md` § Acceptance criteria). No `removeOwner` or `setThreshold`
    self-call is proposed by any rake task, and the deploy tasks' signing route (decision 47) is
    unchanged. The handbook's `docs/multisig-transactions.md` is rewritten separately to say the
    same; this record is rake's. Supersedes nothing in this file; decision 50's "2-of-3" description
    of Ops was read on 2026-10-30, before the fourth owner, and its threshold and delay still hold.
    Rejected: option (2), six `removeOwner` self-calls to match the owner set to where the vault acts
    (six proposal-and-co-sign rounds for no deploy the vault needs); option (3), 3-of-4 on all eight
    (every future proposal would need three signatures, and the question is not rake's).

59. *Superseded by 66 on 2026-11-20; kept as ruled.* **The mirror is `rake.dnzn.dev`, served by
    GitHub Pages from a make target, with `/widget.js` at
    the same path it has on chain; the DNZN app that embeds the widget is still unnamed.** M05-D4,
    ruled in part by Denizen on 2026-11-19 (GitHub,
    [#256](https://github.com/dnznlabs/rake/issues/256), 06:28 UTC). The URL is "rake.dnzn.dev"; the
    host is GitHub Pages; the repo gets a make target of the shape "make deploy-ghpages-mirror" that
    publishes the bundle; the mirror serves "/widget.js" from the same URL path the on-chain document
    serves it at, so the `#/docs` snippet's host form holds on the mirror too. Which chain's bundle
    the mirror serves was not said: the issue's option (1), the Ethereum bundle, stands as the
    default until m05-t04's scoping says otherwise. The app that embeds the widget was not named
    either; that half of M05-D4 stays open in the milestone's § Needs with the issue's default, named
    at m05-t04's scoping. Which repository the Pages site is served from, and how a private rake fits
    that, is m05-t04's scoping question, not ruled here. Decision 41 rejected GitHub Pages for the
    widget's *test host* because it would have meant a new public repo for one snippet; that ruling
    stands for the test host, and this one is for the mirror decision 12 said M05 would publish.
    Rejected: option (2), a landing under dnzn.dev linking each chain's gateway URL and serving no
    bundle (not a mirror in decision 12's sense).

60. **Going public is its own milestone, M06, between mainnet and owner integrations; owner
    integrations moves from M06 to M07.** Ruled by Denizen on 2026-11-19 (Telegram, 09:18 CST),
    with the procedure agreed the same morning. The public repository is a new one whose history
    starts at the mainnet tag; the private one is archived under the `.buildarchive` suffix, never
    published. The repository keeps what a user needs to use, verify and develop the product and
    nothing about how it was built; `SECURITY.md` keeps its shape and starts with no findings,
    recording what is found after the flip exactly as it does today. The renumbering is safe
    because nothing is bound to M06 at this date: no milestone file, no issue labelled `m06`, no
    task ID under it; the five out-of-scope pointers to it in earlier milestone documents are
    renumbered in the same change. Rejected: folding the flip into M05's close-out. M05 is done when mainnet is
    verified, and going public can slip past that without M05 being any less done; a milestone
    that cannot close on its own criteria is two milestones.

61. **The two no-wallet findings of m04-t05 step 3 are fixed before mainnet, as m04-t16 after
    m04-t15, so the bundle m05-t01's Run B uploads reads without a wallet and names the connected
    account; the user settings page (decision issue #275: RPC URL per chain, read route, name
    priority, plain `localStorage` per origin, docs section) follows going public as its own
    milestone, with the shared cross-dapp module, the shared-origin iframe and anything
    cross-device after it.** Ruled by Denizen on 2026-11-19 (Telegram, 09:59 CST; a 10:08 ruling
    to build the settings page before mainnet was withdrawn at 10:14, because wallet users already
    read through the wallet's own RPC and the page's capacity risk is the gateway, which no setting
    reaches). [#273](https://github.com/dnznlabs/rake/issues/273) (every route but `#/docs` stops
    at "No wallet found"; the fix reads through the chain's public endpoint when no provider is
    injected) and [#274](https://github.com/dnznlabs/rake/issues/274) (the wallet button never
    shows the resolved name) are one small `app/` task, scoped the same day
    ([m04-t16 TASK.md](milestones/m04/tasks/m04-t16/TASK.md)), gated on m04-t15's merge, and
    m05-t01's step 14 waits for its merge as it waits for m04-t15's. The settings page is
    [#275](https://github.com/dnznlabs/rake/issues/275), its storage and sharing sub-choices
    recommended there, scoped as a milestone once M06 closes; nothing in M04 or M05 waits on it,
    and m04-t16's read-only provider is one function so that milestone has a seam to insert into.
    Supersedes nothing: m04-t15's "last `app/` change before M05" line now describes m04-t16, and
    m04-t15's § The upload stands. Rejected: fixing #273 and #274 after mainnet, at one vault
    proposal round per chain for two fixes an unbuilt bundle carries for nothing — a visitor with
    no wallet is the reader the mainnet document most needs to serve.

62. **m04-t12, the finalized-log cache, is closed before mainnet: [#227](https://github.com/dnznlabs/rake/pull/227)
    stays unmerged with its branch kept, and [#221](https://github.com/dnznlabs/rake/issues/221)
    and [#165](https://github.com/dnznlabs/rake/issues/165) are carried as a post-mainnet
    consideration, reassessed after M05's mainnet upload with a per-load figure from a chain that
    costs something.** Ruled by Denizen on 2026-11-19 (Telegram, 20:15 CST), as "premature
    optimization". **Why:** the remedy was sized from the public fallback RPC while wallet users
    read through their wallet's RPC (decision 61 rests on the same fact), and it adds persistent
    client state before mainnet for a cost nobody has measured in the field; the 120-request
    figure in decision 52 is a ceiling computed from the window budget, not a count read from a
    user's wallet. Done on GitHub the same evening (read 2026-11-19): #227 closed unmerged, branch
    `m04/t12-log-cache` kept at `ad556ff` with the architect's approval at `c830f5d` on record;
    #221 relabelled `carried`, out of `m04`, unassigned; #165 commented and stays carried. The
    earliest home for the cache is the optional M07, after mainnet; nothing in M04, M05 or M06
    waits on it. **Supersedes** decision 52's addendum of 2026-11-18, whose ship-or-close deadline
    ("before M05 builds the mainnet document") is withdrawn, and 52's line "m04-t12 must merge
    before M05 uploads the mainnet document"; 52's ruled shape stands as the design. **Rejected:**
    shipping as amended at `ad556ff` — still on the shelf, the branch is kept for it; closing #165
    by 52's option 2 (a block-target budget) — not taken either, since no per-load figure from a
    paid chain is recorded and the option would fix the budget without one.

63. **m04-t05 step 3, Denizen's wallet run on both testnets, is superseded: criterion 6's wallet run
    moves to M05 Part B, after the Run B upload m05-t01 step 14 proposes has executed (its step
    16) with the m04-t16 bundle on the redeployed testnets, and M04 closes with steps 0–2 done.** Ruled by Denizen on 2026-11-19 (Telegram,
    20:32 CST), on the architect's recommendation (option (c) on
    [#245](https://github.com/dnznlabs/rake/issues/245)). M04 closes with m04-t05's steps 0–2 done,
    the two no-wallet findings ([#273](https://github.com/dnznlabs/rake/issues/273),
    [#274](https://github.com/dnznlabs/rake/issues/274)) filed and fixed in m04-t16, and the
    wallet-path measurement withdrawn with t12 (decision 62). The wallet run itself is a step of
    [m05-t01](milestones/m05/tasks/m05-t01/TASK.md) after its step 16, driven by m04-t05's `UAT.md`
    on the t16 bundle, and the signoff line of M04 criterion 6 is written in that handoff. **Why:**
    the deployed M04 bundle predates m04-t15 and m04-t16 by design (no Run C, m04-t15 § The upload
    and m04-t16 criterion 9), so a wallet UAT on it is evidence about a bundle that never ships; the
    measurement's consumer, decision 52's ship decision, is gone with decision 62; and the gate was
    circular — Part B waited on M04's close-out, close-out on step 3, step 3 on Part B's upload.
    Also on record (read 2026-11-19, the engineer's step 0 re-run at `6634c28`): `chain-doc` on both
    chains equals the Run B pinned hashes (`b1fc3b96…` Sepolia, `6f0225bb…` Base Sepolia, widget
    `8b6bbc88…`), so step 0's document bullet passes on both; w3link's Sepolia endpoint serves a
    stale document (61,181 bytes against `html()`'s 62,265; widget 8,132 against 8,509;
    `cache-status: miss`, stale since at least 15:20Z), [#242](https://github.com/dnznlabs/rake/issues/242)'s
    third-party condition, so step 0's hosted-gateway bullet fails on Sepolia and passes on Base
    Sepolia. **Supersedes** m04-t05 TASK.md step 3 as an M04 step, and M04 criterion 6's "from a
    browser wallet on each chain" as an M04 condition; decision 61's "m05-t01's step 14 waits for
    its merge" stands. **Rejected:** (b) drive step 3 now against the deployed bundle with the two
    known rows marked superseded — proves wallet connect from the real w3link origin on Base Sepolia
    today, and nothing that the M05 run does not prove later; (a) a new M04 upload (a Run C) —
    already rejected by m04-t15 § The upload and m04-t16 criterion 9.
64. **M04 closes on its close-out's merge, with four unmet clauses transferred to m05-t01 Part B and
    verified there, each as its own criterion.** Ruled by Denizen on 2026-11-19 (Telegram, 21:29
    CST) by merging [#296](https://github.com/dnznlabs/rake/pull/296), the M04 close-out, at
    `eec7164e1db4aa84dfe9b787a1f5eca70fc25598`, on the architect's recommendation
    ([#296 comment](https://github.com/dnznlabs/rake/pull/296#issuecomment-7028983680)): asked what
    decision was needed, he merged, and the merge is the ruling. The four clauses, each added as its
    own m05-t01 acceptance criterion naming the M04 criterion it came from (criteria 18c–18f):
    **criterion 1's artifact comparison**, repeated against `main` after the redeploy (18c) — against
    `main`'s `0.8.38` bytes the M04 chain differs by 1,088 of 1,320 factory bytes and 6,475 of 7,155
    `App` bytes, and against a build of `08b3304` by 60 factory bytes, all inside the three
    `immutableReferences` spans, and 0 `App` bytes (`CLOSEOUT.md` criterion 1), so the wording is
    stale and not the deployment; **criterion 1's DNZN address** at the new factory (18d) —
    `0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`, never `0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f`,
    which is the right prediction for the M04 factory and will never hold code, because decision 54
    gives the `create` to the Creator key in Part B; **criterion 3's chain document and both hosted
    gateway checks** (18e), "after the Run B upload m05-t01 step 14 proposes has executed (its step
    16)" in decision 63's words — those two are m05-t01's **plan** steps, which run 0–18, not its
    acceptance criteria, which run 1–19 with 18b–18f beside them — the chain half passes on both
    chains today, and Sepolia's w3link endpoint serves the
    2026-11-17 document, [#242](https://github.com/dnznlabs/rake/issues/242)'s third-party
    condition; **criterion 5's host page** regenerated against the new addresses (18f), published
    once by the Product Owner with its URL in that handoff, since the tracked page's snippet names
    the M04 `App` and the `0x71a4…7a4A` distribution, both retired by the redeploy. **Criterion 6 is
    recorded as transferred, not as a pass** — it moved in decision 63 and is verified as m05-t01
    criterion 18b. Criterion 8's comment on
    [state-collection#74](https://github.com/dnznlabs/state-collection/issues/74) is drafted and
    unposted in `CLOSEOUT.md` § For state-collection#74, awaiting the Product Owner's word; the
    recommendation on record is to post it now rather than after the redeploy, and m05-t01 plan step 17
    carries the same comment with the readings. **M04 closes now, not when Part B verifies them** —
    the other way round is the circularity decision 63 removed, since Part B is gated on this
    close-out. **Why:** every one of the four is satisfiable only on the redeployed testnets, and
    m05-t01 Part B is the task that redeploys them; holding M04 open changes no byte and blocks the
    work that closes the clauses. **Supersedes** the stale wording of M04 criteria 1, 3 and 5 as M04
    conditions — each amended in place as transferred, the original text kept, the way a superseded
    decision is marked rather than deleted. **Rejected:** (a) hold M04 open until Part B lands —
    M04 would then close on M05's work, which makes the milestone boundary meaningless and stalls
    Part B behind itself; (b) publish the criterion 5 page now — a second publication after the
    redeploy, for a page stale within days; (c) a new M04 upload to catch the document up — already
    rejected by m04-t15 § The upload and m04-t16 criterion 9.

65. **The widget snippet in `#/docs` leads with the `data-rpc` form; the widget gets no built-in
    endpoint.** Ruled by Denizen on 2026-11-20 (Telegram), raised as
    [#309](https://github.com/dnznlabs/rake/issues/309). The snippet a host pastes first is the one
    that reads through an RPC endpoint, so the embed works for a visitor with no wallet or with a
    wallet on another chain; the wallet form follows as the alternative, with its failure states
    still named. The endpoint stays the host's explicit choice: the example carries the chain's
    `PUBLIC_RPC` entry so that it works as pasted, as the second snippet does today, and
    `widget.js` does not change and never falls back to an endpoint of ours. It lands in m05-t01 as
    plan step 13a, before step 14's upload is signed: the testnet document had not been uploaded
    when this was ruled, so the change costs a rebuild and six regenerated proposals, no extra
    upload and no extra sitting, and the testnet wallet run and every mainnet document carry it.
    Decisions 19, 53 and 59 stand: this is the order of two snippets, not the `src` host form, the
    trust boundary or the mirror, and the mirror changes nothing here, because `src` is resolved
    from the page's own address and `data-rpc` from the bundle's chain. **Why:** the read is public
    chain state and needs no wallet, and the form shown first failed on the test host for a wallet
    on another chain. **Rejected:** (a) a fallback inside the widget to a built-in public endpoint
    when no wallet answers, offered to him and refused, since a contract-served script would then
    call a third party the host never chose; (b) m05-t04, the architect's first proposal: Base and every
    mainnet landing before t04 would have led with the wallet form, and the wallet run would have
    accepted a page that was then changed. It rested on the testnet upload having happened, which
    it had not: on 2026-11-20 step 14's six proposals carried the engineer's signature alone, and
    Denizen said so.


66. **`rake.dnzn.dev` is a gw44 gateway reading the dapp from the chain, with static copies of
    `widget.js` beside it; decision 59's static mirror is superseded.** Ruled by Denizen on 2026-11-20
    (Telegram, 23:11 CST; [gw44#44](https://github.com/dnznlabs/gw44/issues/44), option 1). The
    hostname and the host stand: `rake.dnzn.dev`, on GitHub Pages, deployed from this repository.
    What it serves changes. Instead of one chain's built document copied to the site, it serves a
    pinned build of `dnznlabs/gw44` that reads `App.html()` and `App.request()` in the visitor's
    browser on every mainnet chain rake is deployed to, each under `/<chain id>/`, with `/` going to
    the default chain. The deploy also publishes each chain's `widget.js` as a plain file at
    `/<chain id>/widget.js`, checked against the chain's hash, so a host page embeds it with a
    `<script src>` and no third-party gateway. Decision 12 stands: the widget is an on-chain
    document and `App` is its source. The file is a copy of it, as the gateway snippet's bytes are
    today, and the `#/docs` snippet pins it to the chain's bytes with an `integrity` attribute, so a
    copy that differs is refused by the browser. Reading the widget from the chain on a host page
    with no copy at all is gw44's loader (gw44 M03). Accepted with it: the site depends on public RPC
    endpoints where a mirror would not, and the widget's path is `/<chain id>/widget.js`, not the
    `/widget.js` decision 59 named. *Amended 2026-11-21:* the hostname serves Sepolia and Base
    Sepolia as well, and serves them first. gw44's decision 11 as amended that day
    ([gw44#118](https://github.com/dnznlabs/gw44/pull/118)) allows a testnet contract on a
    project's origin when the mainnet owner controls it, and `App` on both testnets is owned by the
    Ops vault, which read the same four owners and threshold on all six chains (its delay is 900
    seconds on the testnets and 3600 on the mainnets, accepted as it stands). `/` lands on a
    mainnet chain from the first one deployed. As first ruled, testnet deployments were not served
    from this hostname. m05-t04 is rescoped under this decision before it is planned: M05 criterion 5's
    `curl` of the document no longer measures anything, since `curl` sees the gateway's shell, and
    the `#/docs` snippet's host changes. The deploy is gw44's reusable workflow (gw44 M02), so
    m05-t04 waits on gw44 m02-t02 as well as on the chain list. Still open from M05-D4: the DNZN
    app that embeds the widget. Rejected: the mirror at this hostname and the gateway at another
    (two official URLs and a second repository for the second Pages site); the mirror alone (one
    chain's bundle at the official URL).

67. **Connect gets a wallet picker and, on a phone, "Open in <wallet>" links before the first
    mainnet upload; WalletConnect follows after launch, from a shared on-chain library.** Ruled by
    Denizen on 2026-11-21 (Telegram, 16:37–17:04 CST), closing
    [#318](https://github.com/dnznlabs/rake/issues/318). Three things, in two steps. In the
    document mainnet first receives: a picker listing every wallet extension that announces itself,
    where today the app takes the first one (`app/src/index.html:126`); and, only on a phone where
    no wallet is found, a short list of links that open the page in a wallet app's own browser,
    where the injected path already works. Desktop behaviour is otherwise unchanged, and a desktop
    with no extension reads the message it reads today. After launch, in a later upload: a
    WalletConnect entry in the same picker, for a phone visitor who stays in their browser and for
    a wallet with no extension and no browser of its own (his case: a Tangem card), with the client
    code read on demand from a contract shared by every DNZN app and not carried in this document.
    That library, and whether an app pins it by hash or follows its latest version, is scoped under
    [design-base#4](https://github.com/dnznlabs/design-base/issues/4). **Why:** the smallest
    WalletConnect client measured 142 to 154 KB gzipped against a 45.5 KB document (#318), so
    inside the document it would be paid on every chain at every upload; the picker and the links
    are a few hundred bytes and need no library, relay or project id. **Accepted with it:** until
    the later upload a WalletConnect-only wallet cannot act on rake, and a phone visitor finishes
    in the wallet's browser. No link format has been tried by us; the task that builds them tries
    each on iOS and Android first, and a wallet whose link does not work is left off the list.
    **Cost to the schedule:** the contract deploys are not held; the first mainnet document upload
    waits for this change, which also goes to both testnets first so that the document mainnet
    receives is one a wallet has been run against. **Rejected:** WalletConnect in the first upload
    (about three to four days, an estimate, ahead of launch, for a case he does not need at
    launch); WalletConnect inside the document; a static host of ours for its code, in favour of
    the shared contract he proposed. *Readings, 2026-11-21:* on his iPhone, each link tapped in
    Chrome, MetaMask and Coinbase Wallet opened rake and are the list; Trust Wallet's link is a
    dead format, and Rainbow and Phantom are left off until
    [#342](https://github.com/dnznlabs/rake/issues/342) and
    [#341](https://github.com/dnznlabs/rake/issues/341) close
    ([#334](https://github.com/dnznlabs/rake/issues/334)). On Android, in an emulator and not on
    a device (`sdk_gphone64_arm64`, Android 17), both listed links opened the wallet, showed rake
    in its browser and connected ([#352](https://github.com/dnznlabs/rake/issues/352)); the
    wallet versions were not recorded, and Samsung's own browser is untried. He
    ruled the same day that the Android reading comes before the first mainnet upload, in place
    of the plan's default of shipping on the iPhone readings alone.

68. **While rake is testnet-only, `rake.dnzn.dev/` lands on Sepolia.** Ruled by Denizen on
    2026-11-21 (Telegram, 17:22 CST), on seeing the deployed site. m05-t04 was planned and accepted
    with Base Sepolia as the default chain; the default becomes `11155111`, and both testnets stay
    served under their own prefixes. Unchanged: the first mainnet chain added takes `/` (gw44
    decision 11, and `RUNBOOK.md` § The gateway), and which mainnet holds it once all four are
    live is still m05-t04's open question, with Base as its default. Built as m05-t04a.

69. **A chain is enabled in the dapp by a short hand-kept list, by being the chain the page reads, or
    by its `App` holding a document; every other intended chain is shown as "pending deployment".**
    Ruled by Denizen on 2026-11-21, in session, and built in
    [#349](https://github.com/dnznlabs/rake/pull/349); recorded from
    [#350](https://github.com/dnznlabs/rake/issues/350). The dapp carries two lists
    (`app/src/index.html`). `NETWORKS` is every chain rake intends to be on: the four M05 mainnets,
    MegaETH (4326), Robinhood Chain (4663) and the two testnets. `ENABLED` is the subset known live
    when the bundle was built, Sepolia and Base Sepolia today. A chain is enabled when any one of
    three things holds: it is in `ENABLED`; it is the chain the bundle itself reads; or
    `chunkCount()` at the `App` address answers above zero through that chain's public RPC
    (`liveCheck`). The rest of `NETWORKS` is greyed. The answer is used in four places: the network
    menu, where enabled chains link to the same route on that chain; the `#/docs` contracts table,
    whose status column reads "live" or "pending deployment"; the wrong-network notice; and the
    links offered when a distribution address holds nothing on the page's chain. **The lookup** is
    one `eth_call` per chain outside `ENABLED`, six today, sent once per page load and only when the
    network menu or `#/docs` first opens. A yes is kept in `localStorage` under `rake.live` and that
    chain is not asked again in that browser. A failed read, or an address with no code, leaves the
    chain pending. **Why:** `ENABLED` ships inside each chain's document, so a list alone would mean
    an upload on every live chain each time one more chain is enabled, on Ethereum an upload to
    refresh a menu. With the lookup, uploading a chain's document is what enables it, on every
    chain's menu, with no upload elsewhere. `ENABLED` is only the set that needs no read: any later
    upload can extend it, and once it holds all of `NETWORKS` the dapp asks nothing.
    **Accepted with it:**
    - The order of the M05 uploads no longer matters to the menu, and adding a chain to `ENABLED`
      is housekeeping for the next bundle, never a reason to upload (`RUNBOOK.md` § Step 4).
    - A chain cannot have its document uploaded and be kept out of the menu. "Deployed but not
      enabled" is the state where the contracts are placed and no document is up.
    - Once a chain's upload has executed, the other chains' pages link to it. On
      `rake.dnzn.dev` that link is `/<chain id>/`, which serves the chain only once it is in the
      gateway's configuration (decision 66, `RUNBOOK.md` § The gateway), so the gateway step
      follows the upload directly.
    - "Live" in the `#/docs` table means the `App` there serves a document. The factory is no
      longer read, so an `App` with a document and no factory beside it would read as live. The
      per-contract `eth_getCode` read the table made before is gone.
    - The dapp depends, for the menu only, on the public RPCs of chains other than its own. The
      endpoints for MegaETH and Robinhood Chain answered a browser-origin request on 2026-11-21
      (review on #349).
    - A yes is remembered without expiry. A document later removed with `setChunks([])` still
      shows as enabled in a browser that saw it.
    - The stretch chains are listed as pending deployment whether or not m05-t05 reaches them
      (decision 4 as amended).

    **Not verified:** no automated test covers `liveCheck`, and neither the menu nor the table has
    had a headless browser run. The read was made by hand on 2026-11-21: Sepolia answers `2`; Base
    and Robinhood Chain, where no `App` is placed, answer `0x`. **Rejected:** the hand-kept list
    alone, as #349 first built it (an upload on every live chain per chain enabled); a live lookup
    alone (a read per chain for every visitor for good, and it treats placed contracts as offered).
    Changing network is a link and never `wallet_switchEthereumChain`, in the same change; the
    link's form per gateway is `Model.GATEWAYS` (`app/src/model.js`). *Amended 2026-11-22:* by his
    ruling that day (Telegram, 02:05 CST) `ENABLED` also holds Ethereum and Base from the document
    m05-t01c uploads, ahead of their own uploads, so the first mainnet documents need no lookup for
    each other. Accepted by him: until each of the two has its document and its gateway entry,
    the link to it leads nowhere and the contracts table reads it as live; nothing else uses the
    gateway in earnest before then.

70. **M05's mainnets are Base and Ethereum; the contracts go to both first, then the document; the
    other four chains wait until those two have been in real use.** Ruled by Denizen on 2026-11-22
    (Telegram, 23:54 CST on the 21st through 01:36 CST). M05 was scoped as the four mainnets of
    decision 4 with MegaETH and Robinhood Chain as a stretch row, Base end to end first. It is now
    two chains in two steps. First, as one task (m05-t02): Run A, verification and DNZN's `create`
    on Base and then on Ethereum, with no document uploaded. Then (m05-t03): the document through
    the Ops vault on Base and then on Ethereum. OP Mainnet, Arbitrum One, MegaETH and Robinhood
    Chain are not deployed to in M05; they follow on his word, scoped then as their own work, and
    the dapp goes on listing them as pending deployment (decision 69). This is also the written go
    M05-D3 requires for the contract sends; every document upload still takes his co-signatures.
    **Why:** DNZN's own products are built on Ethereum and the other mainnets are there for other
    people's distributions; Base is the one of them he wants live at launch; and Sepolia and Base
    Sepolia are the only chains he or the runbook has run on. Nothing is lost by waiting on the
    rest: an address can only ever hold our own bytes, since the proxy derives it from the init
    code and the salt and `App`'s owner is inside that init code, and only the Creator key can
    create DNZN's distribution (decision 10). Decision 67 had already separated the contract
    deploys from the first document. **`rake.dnzn.dev/` goes to Ethereum** once its document is
    up, which closes the question decision 68 left with m05-t04, whose default was Base. Base does
    not take `/` at any point (his ruling of 2026-11-22, 02:05 CST): until Ethereum's document is
    up and the gateway carries it, `/` stays on Sepolia, where decision 68 put it. The embed and criterion 5's screenshot
    are taken on Ethereum for the same reason. **Accepted with it:** both deploys precede any real
    use on a mainnet, so a `fix`-grade finding after them supersedes two deployments where the
    earlier phasing risked one; what remains of that hedge is Base first, a stop before Ethereum,
    and the alpha posture of decision 45. The mainnet contracts are also placed before the wallet
    run on the redeployed testnets (m05-t01c step 9); that run exercises the document, and the
    contract bytes are the ones both testnets have carried since 2026-11-20. **Amends:** decision
    4's chain list for M05, M05's phases and criteria (its "four chains" read as these two), its
    count of signatures, and m05-t05, which is withdrawn. **Rejected:** the four chains with a
    stretch row, the plan until this ruling; and the contracts on all six ahead of any use, which
    he first asked for to stop someone taking the addresses on other chains, a risk that does not
    exist for the reason above.

71. **`app/` is frozen on `main` from the Product Owner's word on a preview until that upload has
    executed.** Ruled by Denizen on 2026-11-21 (Telegram, 23:54 CST). An upload is cut from the tip
    of `main` (`RUNBOOK.md` § 4a), so a commit under `app/` after a preview is accepted makes the
    calldata, the fork proof and the preview stale together; on 2026-11-21 that happened twice in
    one evening. Between his word on a preview and the last `executeQueued` of that upload on every
    chain it goes to, nothing under `app/` reaches `main`, by merge or by direct commit, his own
    included. A change wanted in that window rides the next upload, unless the wallet run cannot
    pass without it, which means a new preview and a new word. First applied to m05-t01c's testnet
    upload ([#345](https://github.com/dnznlabs/rake/issues/345)). **Rejected:** re-cutting at each
    commit, which costs a rebuild, a fork proof and a preview sitting every time.
    **Amended 2026-11-26 (Product Owner, Telegram, 02:04 CST; [#425](https://github.com/dnznlabs/rake/issues/425)):
    a mainnet upload needs no preview of its own while `app/` is byte-identical to the commit his
    word was given for.** m05-t03 uploads to Base and Ethereum the document previewed for the
    testnets at `4fb6296`; the builds differ only in chain id, `factoryBlock` and endpoints, his
    § 4b co-signature is the acceptance, and the freeze runs from each chain's cut to its last
    `executeQueued`. If `git diff 4fb6296 origin/main -- app/` is not empty at a cut, the cut stops
    and a preview is owed. Rejected: a preview per mainnet build, a sitting each for a page he
    reads on Base with his own wallet before Ethereum is cut (m05-t03 step 8).

72. **With no wallet, the page reads as much history as its free endpoint serves, and says where it
    stopped.** Ruled by Denizen on 2026-11-22 by merging m05-t01d's plan
    ([#388](https://github.com/dnznlabs/rake/pull/388)), whose default it was
    ([#387](https://github.com/dnznlabs/rake/issues/387)). No free endpoint read that day served
    deep log history to a browser: Ethereum's refused 50,000 blocks back, Sepolia's pruned there,
    Base's capped each query, one sample each. The table, the balances and the escrow are read
    from state and stay current; history is the part that degrades. A connected wallet may read
    further through its own provider. **Leaves standing:** decision 62, the log cache carried
    post-mainnet. **Rejected:** building that cache before mainnet, and an endpoint DNZN pays for
    with its key in a public document.
    **Amended 2026-11-23 by Denizen (Telegram, 00:51 CST; m05-t01d's plan as merged in
    [#394](https://github.com/dnznlabs/rake/pull/394)): with no wallet the page reads the last
    24 hours of activity and changes, says so, and says a connected wallet loads more.** "We
    don't need to be so catering for non-wallets as far as activity/history goes." Measured
    first: Ethereum's free endpoint serves about 1.4 days and no more, and Base mints a block
    every 0.2 s, so no reach that could be promised was worth tuning for. Escrow is exempt:
    the contract's own total says exactly how much is held, so the page never shows less
    without stating the difference. **Withdrawn with it:** the request pacing of
    [#392](https://github.com/dnznlabs/rake/pull/392), unless Base misses its 24 hours.

73. **The embed of criterion 5 is the widget's test page, published by the Product Owner under
    `research.dnzn.dev`; no DNZN product embeds the widget in M05.** Ruled by Denizen on 2026-11-26
    (Telegram, 17:16–17:35 CST; [#438](https://github.com/dnznlabs/rake/issues/438)), completing
    M05-D4, whose host half is decisions 59 and 66. The page is
    `docs/milestones/m05/tasks/m05-t04b/host/index.html`, made from M04's host page: one mount, the snippet `#/docs` prints for
    Ethereum, loading `https://rake.dnzn.dev/1/widget.js` with its `integrity` attribute and reading
    through a public endpoint, so it needs no wallet. He published it at
    `https://research.dnzn.dev/tmp/rake-widget-test.html`; read back the same day, it is
    byte-identical to the committed file and renders DNZN's table from Ethereum
    (`docs/milestones/m05/tasks/m05-t04b/embed-ethereum.png`). It is a test page under a `tmp/`
    path and is not promised to stay up. **Rejected:** an embed inside a DNZN product, which is work
    in a repository that is not the focus project and would hold M05's close-out on it; and
    dropping the embed, which he considered and replaced with this. The page first carried a
    second mount with no `data-rpc`, which reads through `window.ethereum` and told him his wallet
    was on Base when the wallet he uses was not; that mount is removed, and the widget reading only
    `window.ethereum` is [#289](https://github.com/dnznlabs/rake/issues/289).

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
- **An escrow to a recipient that always burns the push can never be released.** Found in
  `m03-t01` (`HANDOFF.md` § Discoveries 2): `release` re-pushes with the same `PUSH_GAS` cap and
  bubbles the failure, so a recipient that consumes the cap every time keeps its share in `escrowed`
  until it changes behaviour, and nothing says so. By design (an escrow is recoverable only if the
  recipient becomes payable); the owner's remedy is a re-table (decision 6). **M03** states it in
  `SECURITY.md` beside decision 25 and puts it in the review's known answer; no code change. Issue
  [#95](https://github.com/dnznlabs/rake/issues/95).
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
  `design/HANDOFF.md`. Carried as the optional M07 above (M06 until decision 60), decided 2026-10-10.
- The `Render` / `DocsRenderer` / `WidgetRenderer` split and the 60 KB uncompressed budget. Superseded
  by the scaffold's single `App` with gzipped SSTORE2 chunks. Measured 2026-10-10: the prototype
  comment-stripped is 74.0 KB, gzipped 20.7 KB; the widget 5.6 KB, gzipped 2.5 KB. Re-run before citing.
- `App.lock()` at launch. Same ruling as `state-collection`: lock when there is a reason to claim the
  document is immutable, not on deploy day.
- A branch protection rule on `main`. Not available on this plan; revisit at M05's go/no-go.
- ERC-1363 receiver. Optional surface before an audit; propose it as a task in M01 only if the
  review in M03 is already scoped to include it.
