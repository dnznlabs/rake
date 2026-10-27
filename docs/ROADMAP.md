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

Ruled by Denizen on 2026-10-27, before M03 Phase 2, each on the issue linked
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
25. **D6 — `propose` queuing an action `applyQueued` will always revert ([#54](https://github.com/dnznlabs/rake/issues/54)).**
    No ruling as of 2026-10-27 on [#83](https://github.com/dnznlabs/rake/issues/83). The default is
    option 3: document it in `SECURITY.md` as a known shape, since the editor already refuses both
    detectable cases (decision 16) and nothing is lost, only the pending list is wrong. It proceeds
    on 2026-11-02 if still unruled, and this entry is rewritten with the ruling either way.
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
    writes the constant, and the figure is added here when it exists. Rejected: no cap with the
    ceiling documented (a table past the block gas limit traps every balance behind a `distribute`
    that cannot be mined, and only a `setBeneficiaries` through the delay frees it).
28. **D9 — is ERC-1363 in the review's scope?** No ruling as of 2026-10-27 on
    [#86](https://github.com/dnznlabs/rake/issues/86). The default is option 1, no: it is not a goal,
    it is surface before the audit, and § Not on the roadmap already lists it. It proceeds on
    2026-11-02 if still unruled, and this entry is rewritten with the ruling either way.
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
    thousand; m03-t01 posts the figures on #88 and they are added here. Rejected in advance:
    lowering it (a lower cap buys nothing and escrows more).
31. **The factory is placed through SafeSummoner; the keyless proxy is the fallback.** D12, ruled on
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
