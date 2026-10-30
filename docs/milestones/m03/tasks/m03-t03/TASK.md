# m03-t03 — The dapp follows the ABI

Milestone: [M03](../../MILESTONE.md) · Phase: 2 — The code the review will read

When this is done, the dapp can finish an ownership transfer it starts: the detail page shows a
pending owner, offers `acceptOwnership()` to the connected wallet that is it (as calldata when that
wallet is a signer of an owning vault, decision 7), lets the owner withdraw a nomination, and refuses
a table past the cap before any transaction. `#/docs` § Ownership describes two steps instead of one,
`model.js` names `ReleaseFailed`, and every `app/` line m03-t02's handoff listed as stale is true
again. Nothing under `src/` changes; the review (t04) reads `ede55c3` either way.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, cast `1.7.1-dev`,
node from `devbox.lock`). Branch `m03/t03-dapp` from `origin/main` at or after `ede55c3` (the merge
of [#103](https://github.com/dnznlabs/rake/pull/103)). Check hooks with `ls .git/hooks | grep -v sample`
(expect `pre-commit` and `post-commit`); do not run `make init`.

The source of every edit below is [m03-t02 `HANDOFF.md`](../m03-t02/HANDOFF.md) § For t03, read
whole before starting: the four selectors, the line-by-line list, the three JS tests that fail the
moment this task edits, and § Checked and still accurate, which names the files this task does
**not** touch (`eth.js`, `widget.js`, `host.html`, `layout.html`, `build.mjs`, `theme.css`). Line
numbers are the handoff's, taken at `ede55c3`; trust names over numbers (`AGENTS.md`). The four
selectors, each re-confirmed with `cast sig` on 2026-10-30: `acceptOwnership()` `0x79ba5097`,
`pendingOwner()` `0xe30c3978`, `MAX_BENEFICIARIES()` `0x2348dd18`, `ReleaseFailed(address)`
`0xca0b64e5`. `OwnershipTransferred(address,address)` topic0 is
`0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0`.

The seven questions the handoff raised for the architect are ruled here, in § Open questions, and
the steps assume the rulings.

1. **The detail page reads `pendingOwner()` (ruling 3).** In `app/src/index.html`'s `detail(addr)`,
   beside the `snapshot()` read, one more `eth_call` to `pendingOwner()` on the distribution, decoded
   as an address and carried on `d` as `d.pendingOwner`. The `meta` block (`:534`) prints a
   second line when it is non-zero: `transfer pending to <address>` (decision 21's wording), with
   the address linked the way `owner` is. A failed read renders as the page renders any failed
   boot read, never as "no transfer pending".

   Check: with the featured distribution's owner having applied `transferOwnership(B)` on anvil
   (step 7 does this), the detail page prints `transfer pending to` with B's address.

2. **The accept control (ruling 2).** `ownerView` (`:837-845`) gains two values beside `visitor`,
   `owner` and `vault`: `pending` when `same(ACC, d.pendingOwner)`, and `pending-vault` when
   `d.pendingOwner` is a contract whose `isOwner(ACC)` answers `1` (the same probe, failing soft,
   that decision 7 uses for the owner). `ownerBar` (`:920-928`) renders, for those two views only,
   a bar with one control: `accept ownership`, a direct `acceptOwnership()` transaction for
   `pending`, and the copy-calldata control the vault view already uses (`wctl` with `to: d.addr`,
   `sig: 'acceptOwnership()'`) for `pending-vault`. The status text says who the connected account
   is and what accepting does: `you are the pending owner — accepting makes you the owner at once;
   nothing changes until you do`. The owner's bar is unchanged; `'you own this distribution'`
   (`:922`) is still right for the current owner while a transfer is pending, because it is.

   Check: on anvil with B pending, the dev build at `?from=<B>` shows the `accept ownership`
   control and the owner's address does not. With a vault pending (step 9 uses `MockVault`,
   `test/mocks/Mocks.sol:224`, the `isOwner` mock M02 criterion 4 used), the copied bytes are
   exactly `0x79ba5097` (`cast calldata-decode
   "acceptOwnership()" 0x79ba5097` succeeds).

3. **The ownership disclosure tells the truth (`:967-1030`).** Rewrite the change-owner
   acknowledgements at `:973-975` so each is a statement the user can attest to:
   - `:973` → applying the change names the address as the pending owner; the current owner keeps
     every power until that address calls `acceptOwnership()`;
   - `:974` → an address that cannot accept takes nothing; until it accepts, the owner can withdraw
     the nomination by proposing itself (this replaces the "loses control permanently" line, which
     two-step ownership exists to make false);
   - `:975` → after the delay anyone can apply it; the owner can cancel it until then and withdraw
     it after.
   The renounce acknowledgements (`:978-980`) stay, plus one clause on the first: renouncing also
   destroys a nomination in flight. `ownReady` / `ownerNote` (`:984-986`, `:1010`) admit the
   current owner's address **when a transfer is pending** and label it `withdraws the pending
   transfer` rather than `bad` (ruling 5); with nothing pending it stays refused as today. The help
   text at `:1019` and the hold label at `:1023` say "nominate", not "hands this distribution to";
   `:1024`'s `propose transferOwnership` label is kept. The comment at `:967-970` counts four
   ownership writes: nominate, renounce, withdraw, accept.

   Check: `grep -n 'loses control of this distribution permanently\|the new owner alone can propose' app/src/index.html`
   prints nothing.

4. **The pending-action label has three arms (`:488`, `model.js:10-16`).** `p.kind === 'transferOwnership'`
   renders `renounced` for the zero address (as today), `withdraws the pending transfer` when
   `p.owner === d.owner`, and `nominates <address>` otherwise — never `new owner`. `model.js`'s
   comment at `:10-11` says the one call has three effects; `describe()` (or whatever `:488` calls)
   branches on the three. The decode itself is unchanged.

   Check: a `node --test test/model.test.mjs` case decodes a queued `transferOwnership(owner)` and
   reads it as a withdrawal.

5. **The table cap in the editor (`:582-628`, ruling 4).** At boot, beside the page's existing
   factory reads, one `eth_call` to the factory's `implementation()` and one to its
   `MAX_BENEFICIARIES()`, cached where the other boot values live; `editorState` (`:587-595`)
   refuses `rows.length > MAX_BENEFICIARIES` with the same shape as its three existing refusals
   (it is the one validator for create step 2 and the propose drawer, so one check covers both);
   `add.onclick` (`:628`) stops adding at the cap, as the remove handler at `:626` stops at one;
   the row count at `:613` reads `<n> of 107 beneficiaries` with the figure from the read, not a
   literal; the comment at `:582-586` counts four refusals. A failed boot read is reported as the
   page reports any failed boot read; the editor never falls back to a literal.

   Check: with the dev build up, the editor refuses a 108th row and the count line says `of 107`.
   `grep -c '107' app/src/index.html` is at most the docs mentions step 6 adds (state the number in
   the handoff) — the editor carries no copy of the constant.

6. **`#/docs` (`:727`, `:1414`, `:1428-1435`, ruling 1).** § Ownership (`:1434-1435`) is rewritten
   for two steps, in Denizen's register for that page (decision 17; the page is his since Phase 5,
   so change the claims and keep the voice): propose the new owner; after the delay anyone applies
   it, which only nominates; the current owner keeps every power until the nominee calls
   `acceptOwnership()`, which any wallet can send but only the nominee's succeeds; the owner can
   withdraw by proposing itself; renouncing is immediate and destroys a nomination; the two halves
   leave different traces — acceptance emits `OwnershipTransferred(previousOwner, newOwner)`, the
   nomination has no event of its own and rides in `Queued`'s calldata, so a pending transfer is
   read from `pendingOwner()`. § Changing a distribution (`:1428`, `:1431`) lists `acceptOwnership`
   as the one operation the incoming owner signs, neither owner-only nor delayed; the landing
   summary at `:727` says an owner change also needs an acceptance. The table rules at `:1414` gain
   the cap: at most 107 rows (`MAX_BENEFICIARIES`). § Limits (`:1441-1449`) is **not** changed: its
   rules are hazards the owner cannot fix, and the cap is a build-time rule the editor enforces.
   No section is added or removed: `SECTIONS` (`:1316`) and the thirteen `id="s-…"` headings stay
   as they are, so `test/docs.test.mjs:94`'s `13` holds.

   Check: `grep -c 'id="s-' app/src/index.html` → 13; `grep -n 'acceptOwnership' app/src/index.html`
   hits inside § Ownership and § Changing a distribution.

7. **`model.js` errors (`:57-84`, rulings 6 and 7).** `ERRORS` gains `'0xca0b64e5'` in the
   `(d, now)` shape, decoding the token the way `NotReady` decodes its eta (`:67`) and returning
   `retry failed — the token gave no reason`; the address is not printed, the release button already
   names the token. The comment at `:57-59` no longer says `NotReady` is the only error carrying
   data. `Unauthorized()`'s message (`:74`) becomes `this contract will not take that call from this
   account`, one message for both the `init`/`receive` guards and a wrong caller of
   `acceptOwnership()`. The `d.length === 66` branch (`:83-84`) **stays**: `release` no longer bubbles
   a bare word, but `_balance` (`src/Distribution.sol:308`) still bubbles raw `balanceOf` revert
   data, so a token whose `balanceOf` reverts with one word reaches it through `distribute`. Its
   comment is re-attributed to `_balance` and its text becomes `the token refused the call`.

   Then the three tests the handoff names: `test/model.test.mjs:128-152` counts nine selectors and
   adds a `revertMessage('0xca0b64e5' + <padded token>)` case, with every `Distribution.sol` line
   annotation re-verified (the factory errors are at `:342`/`:343` on `ede55c3`, not `:299`/`:300`);
   `:171-178` is renamed and re-commented for `_balance` and asserts the new text. `test/abi.test.mjs`'s
   `>= 17` lower bound is left alone; it guards nothing here.

   Check: `node --test test/*.test.mjs` passes with every test added named in the handoff; on
   `ede55c3` the count is 61 (`ℹ tests 61`, 2026-10-30).

8. **#104, one line.** `docs/milestones/m02/tasks/m02-t04/HANDOFF.md:72` asserts the `id="s-`
   count is `11`; the file has had 13 since Phase 5 and `test/docs.test.mjs:94` pins it. Change the
   literal to `13` and append one sentence to the table cell at `:35`: `corrected 2026-10-30
   ([#104](https://github.com/dnznlabs/rake/issues/104)): 13 since Phase 5; test/docs.test.mjs
   pins it — re-run rather than quote`. Nothing else in that handoff moves.

   Check: the script in that handoff, run verbatim on the branch, exits 0.

9. **The ownership walk on anvil (M02 criterion 4, re-run).** `make serve` (anvil and the dev
   build on `:3000`, `?rpc=…&from=…`, no wallet). From the page, as the featured distribution's
   owner: propose `transferOwnership(B)`, advance the delay (`cast rpc evm_increaseTime`,
   `evm_mine`), apply; the page shows `transfer pending to B`. As `B` (`?from=<B>`): accept; the
   page shows `B` as owner and no pending line; `cast call <d> "pendingOwner()(address)"` answers
   zero and `cast logs` shows `OwnershipTransferred`. Then as `B`: propose `transferOwnership(C)`,
   apply, and withdraw by proposing `B`, applying; `pendingOwner()` zero. Then the vault case: a
   distribution whose pending owner is the `isOwner` mock, connected as its signer, copies
   `0x79ba5097`. Each receipt re-read with `cast receipt <h> status`, the hashes listed in the
   handoff as m02-t03's were.

   Check: every listed hash has `status 1`; the handoff table has the propose, apply, accept and
   withdraw rows.

10. **Chunks and criterion 8.** Any change to `app/` invalidates M02 criterion 8 (M02 § Phase 5
    § Consequences 1): `make dapp-nodev && make chunks && make dapp` (not `make deploy`, which
    refuses a chain that has the factory, #35), then `make chain-doc`; record `inflated sha256`
    equal to `sha256sum app/dist/index.html`, and `widget sha256` equal to
    `sha256sum app/dist/widget.js` (expected unchanged — `widget.js` is not touched). Then
    `node --test test/*.test.mjs`, `forge build --force`, `forge test`, `forge snapshot --check`
    (no `src/` or `test/*.t.sol` change, so the committed snapshot must still check), `forge lint`
    and `forge fmt --check` last.

    Check: `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` is empty;
    `git status --porcelain` is empty after all of them.

11. **Handoff and PR.** `HANDOFF.md` beside this file: the walk's hashes, criterion 8's two hashes
    and byte counts, the node test count before and after, the `107` grep count, and every line
    of the handoff's § For t03 list with what became of it (changed, or still accurate and why).
    PR titled `feat(m03): the dapp follows the two-step ABI`, in the PR template's form, closing
    [#104](https://github.com/dnznlabs/rake/issues/104). Review: architect first against this file,
    Product Owner second.

## Acceptance criteria

- `git diff --stat origin/main -- src/` prints nothing, and so does
  `git diff --stat origin/main -- test/*.t.sol .gas-snapshot`; `forge snapshot --check` exits 0 on
  the committed snapshot (app-only, milestone § Out of scope).
- `node --test test/*.test.mjs` passes, with more than the 61 tests `ede55c3` runs, and
  `grep -n '0xca0b64e5' app/src/model.js test/model.test.mjs` hits in both files.
- `grep -n -i 'loses control of this distribution permanently\|the new owner alone can propose\|new owner · ' app/src/index.html`
  prints nothing; `grep -c -i 'acceptOwnership' app/src/index.html` is at least 3 (the control, § Ownership,
  § Changing a distribution); `grep -c 'pendingOwner' app/src/index.html` is at least 1.
- On anvil, the walk of step 9 is in the handoff with a `status 1` receipt for propose, apply,
  accept and withdraw, `pendingOwner()` zero at the end, and the vault case's copied calldata equal
  to `0x79ba5097` (M02 criterion 4, ownership half, re-run; decisions 7 and 21).
- The editor refuses a 108th row before any transaction and prints `of 107` from a
  `MAX_BENEFICIARIES()` read; `grep -n 'MAX_BENEFICIARIES' app/src/index.html` hits in the boot
  read and the docs line.
- `grep -c 'id="s-' app/src/index.html` → 13, `test/docs.test.mjs` passes unchanged, and the
  script in `docs/milestones/m02/tasks/m02-t04/HANDOFF.md` § The acceptance script exits 0 run
  verbatim (#104).
- M02 criterion 8 re-run: `make chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`
  after `make dapp-nodev`, both recorded in the handoff with the byte counts.
- `forge build --force` prints zero `warning[` / `Warning (` lines; `forge lint` and
  `forge fmt --check` are silent; `git status --porcelain` is empty after everything above.
- `HANDOFF.md` disposes of every line in m03-t02's § For t03, one row each.

## Out of scope

- Anything under `src/`, `test/*.t.sol` or `.gas-snapshot`. The contract is final at `ede55c3` and
  t04 is reading it; a change here re-opens the review.
- `eth.js`, `widget.js`, `host.html`, `layout.html`, `build.mjs`, `theme.css` — the handoff's
  § Checked and still accurate. If one turns out to need a change, say so in the handoff and stop.
- A new `#/docs` section, a fourth tab in the ownership disclosure, an `OwnershipTransferStarted`
  event or anything else on the contract (ruled out in § Open questions below).
- § Limits naming the cap (ruling 1). Raise in the handoff if the page reads wrong without it.
- Log paging ([#76](https://github.com/dnznlabs/rake/issues/76)), name resolution, the gateway —
  M04.
- `SECURITY.md`, `audits/`, the overview — t04.

## Open questions

None for the Product Owner. The seven the handoff put to the architect are ruled here; each is the
architect's call under decisions 7, 16, 17 and 21, and none changes the contract.

1. **Limits names the cap?** No. § Limits lists hazards the owner cannot fix; the cap is a build
   rule the editor enforces before any transaction, so it is stated at `:1414` (the table rules) and
   `:613` (the row count). Rejected: a Limits row (puts an editor rule among chain hazards).
2. **Where is `acceptOwnership()` offered?** In the detail page's bar, to the connected account
   that is the pending owner (direct) or a signer of a vault that is (calldata, decision 7), as two
   more `ownerView` values. Rejected: docs-only ("call it yourself" makes the dapp unable to finish
   a transfer it starts); a fourth top-level role with its own page (one control does not need one).
3. **Read `pendingOwner()` on every detail load?** Yes, one `eth_call`. Rejected: inferring it
   from the `Queued`/`Applied` pair (a withdrawal or a renounce in between makes it wrong, and it
   cannot see an accept, which has no proposal).
4. **Hardcode 107 or read it?** Read it at boot from the implementation behind the factory. The
   editor runs on create, before any distribution exists, which is why the read goes to the factory's
   `implementation()` and not to a distribution. Rejected: a literal (grows decision 16's cost by one
   more copy of `_set`'s rules, and goes stale with the next factory).
5. **Withdraw through the transfer field, or its own control?** The field, admitting the current
   owner only while a transfer is pending, with the note and the acknowledgements worded for
   withdrawal. Rejected: a third tab (its own `ACKS` set, meaningful only while pending).
6. **Does the `ReleaseFailed` message name the token?** No — the release button already does; the
   message says the token gave no reason, which is what the error means (decision 24's threshold
   swallows argument-less custom errors too, so "no reason" is exact).
7. **One `Unauthorized()` message or two?** One, reworded to cover both callers. Rejected:
   context-dependent text (`revertMessage` would have to know which write was attempted, which it
   does not).

## Context

- [`MILESTONE.md`](../../MILESTONE.md) § Phases (Phase 2, this row; the sequencing deviation that
  lets Phase 3 run beside this task), § Out of scope (the one `app/` exception this task is).
- `docs/ROADMAP.md` § Decisions 7 (vault owners act through calldata), 16 (the editor refuses what
  the contract refuses), 17 (`#/docs` is written for the owner), 21 (D2: two-step without a struct
  change; "the dapp gains one surface: accept, and 'transfer pending to …' on the page"), 24
  (`ReleaseFailed`), 27 (the cap, `MAX_BENEFICIARIES` is public so the dapp reads it).
- [m03-t02 `HANDOFF.md`](../m03-t02/HANDOFF.md) § For t03 (the list this task executes), § The ABI
  diff, § Discoveries 1 (#104) and 2 (why the bare-word branch stays).
- [M02 `MILESTONE.md`](../../../m02/MILESTONE.md) criteria 4 and 8, § Phase 5 § Consequences 1;
  [m02-t03 `HANDOFF.md`](../../../m02/tasks/m02-t03/HANDOFF.md) for the hash table's shape;
  [m02-t04 `HANDOFF.md`](../../../m02/tasks/m02-t04/HANDOFF.md) § The acceptance script (#104).
- Issue this closes: [#104](https://github.com/dnznlabs/rake/issues/104).
