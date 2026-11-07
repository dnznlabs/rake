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
| [M03 — Hardening and deploy readiness](milestones/m03/MILESTONE.md) | Independent security review dispositioned in `SECURITY.md`, the open measurements closed, and a runbook for a same-address deploy on every target chain | in progress — Phase 1 closed 2026-10-30 (decisions 20–33); Phase 2 done 2026-10-30: t01 (#94), t02 ([#103](https://github.com/dnznlabs/rake/pull/103)), t03 ([#109](https://github.com/dnznlabs/rake/pull/109)); t04 merged 2026-10-30 ([#117](https://github.com/dnznlabs/rake/pull/117)): ten findings over `ede55c3`, five accepted, so t05 stands — scoped 2026-10-31, three contract fixes and a second two-leg run on the final code; t06 done 2026-11-01 ([#131](https://github.com/dnznlabs/rake/pull/131): `RUNBOOK.md`, salted scripts through the keyless proxy, criterion 6 rehearsed; closes #22, #23, #129); D14 ruled as decision 36; Phase 3 reopened — t07 (`App.lock`, decision 38) live, and t08 (expiry and `claim`, decisions 39–40 from the #133 triage) scoped 2026-11-01 to merge before t07 freezes, so the third review reads both; dapp follow-up t09 scoped at t08's merge |
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
starts until the signoff line is dated. **The docs page is part of that signoff.** `#/docs` ships from
m02-t04 as a draft the agents wrote (decision 17); Denizen writes its final text himself in Phase 5,
and the signoff is not dated while the page still carries the draft. The checks on it — the reference
file's struct and tables, the stipend-and-cold lines, criterion 9's greps — stay as they are and run
against whatever he writes.

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
    lead time on code M04 may still change).
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
    rake alone. Two conditions, recorded org-wide in the handbook beside the vaults, which the M03
    runbook references rather than restates: salted creates only (it is a CREATE2 `msg.sender`, never
    a plain CREATE, where the address would depend on the order of every other deploy across projects
    and chains; a project that needs nonce-based addresses gets its own throwaway key); and never an
    owner or a signer for anything else (the owner passed to `create` is the Ops multisig, M05's).
    Compromise costs nothing deployed: the holder could place a contract at a DNZN predicted address
    on a chain DNZN has not reached, with an owner of their choosing, which is the squat decision 10
    exists to prevent, now across every project at once; accepted because separate keys stored the
    same way would fall together anyway and multiply the backup burden. Rejected: an existing key
    Denizen names. Still open on #90: the key's address (the salt's top 20 bytes) and the low 12
    bytes (the runbook proposes `…0001`). Criterion 6 stays open and m03-t06 proceeds with a
    placeholder salt until the address is named here.
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
    question existed because the handbook's vault table said "mainnet + Sepolia", which was stale
    by six chains; the chain, not the roster, is the source for deployment state (handbook#32
    corrects the row). Rejected: Denizen's EOA as owner on chains without a vault, handed over
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
  `design/HANDOFF.md`. Carried as the optional M06 above, decided 2026-10-10.
- The `Render` / `DocsRenderer` / `WidgetRenderer` split and the 60 KB uncompressed budget. Superseded
  by the scaffold's single `App` with gzipped SSTORE2 chunks. Measured 2026-10-10: the prototype
  comment-stripped is 74.0 KB, gzipped 20.7 KB; the widget 5.6 KB, gzipped 2.5 KB. Re-run before citing.
- `App.lock()` at launch. Same ruling as `state-collection`: lock when there is a reason to claim the
  document is immutable, not on deploy day.
- A branch protection rule on `main`. Not available on this plan; revisit at M05's go/no-go.
- ERC-1363 receiver. Optional surface before an audit; propose it as a task in M01 only if the
  review in M03 is already scoped to include it.
