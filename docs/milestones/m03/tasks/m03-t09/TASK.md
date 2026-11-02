# m03-t09 — The dapp follows t08's ABI

Milestone: [M03](../../MILESTONE.md) · Phase: 3 — The review

When this is done, the dapp tells the truth about what t08 built: a pending change shows the
deadline after which it expires, an expired one cannot be applied from the page and anyone may
clear it, an escrowed account connected to the page can `claim` its own escrow, `Expired` reads as a
sentence rather than four bytes, the two [#137](https://github.com/dnznlabs/rake/issues/137) items
land (a pending `setDelay` that lowers the delay is flagged; the page survives a `snapshot()` that
will not answer), and the widget says `expired` instead of `ready to apply` forever. `app/` only;
nothing under `src/`, `test/*.t.sol` or `.gas-snapshot` moves, and the third review (t07) is
unaffected because `app/` is not in `audits/SCOPE`.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, cast `1.7.1-dev`,
node from `devbox.lock`). Branch `m03/t09-dapp` from `origin/main` **at or after the merge of
[#143](https://github.com/dnznlabs/rake/pull/143)** (m03-t08) — the ABI this task follows is that
merge's; step 0 proves it. Check hooks with `ls .git/hooks | grep -v sample` (expect `pre-commit` and
`post-commit`); do not run `make init`. The source list for every edit is
[m03-t08 `HANDOFF.md`](../m03-t08/HANDOFF.md) § For t09, read whole before starting. Line numbers
below are `app/src/index.html` and `app/src/model.js` at `71c9f92` plus t08's three prose hunks;
trust names over numbers (`AGENTS.md`). The selectors, each confirmed with `cast sig` /
`cast sig-event` on 2026-11-01: `claim(address,address)` `0x21c0b342`, `GRACE()` `0x137d29d9`,
`Expired(uint256)` `0xf80dbaea`, `Claimed(address,address,address,uint256)` topic0
`0x913c992353dc81b7a8ba31496c484e9b6306bd2f6c509a649a38fdf5e1c953b2`. `GRACE` is **1,209,600**
seconds (14 days).

0. **The ABI is t08's.** `forge inspect Distribution abi --json | jq -r '.[]|select(.type!="constructor")|.name' | sort | grep -c -E '^(claim|Claimed|Expired|GRACE)$'`
   → 4, and `grep -c 'claim(address,address)' test/fixtures/abi/selectors.txt` → 1. If either is
   not, #143 has not merged under you: stop. Record `node --test test/*.test.mjs`'s count (62 at
   `71c9f92`, unchanged by t08) and `wc -c app/dist/widget.js` after `make dapp-nodev` (**7,920**
   bytes at t08's head, against the 10,240 budget `build.mjs` enforces).

1. **`model.js` learns the window.** `countdown(eta, now)` (`model.js:30-37`) gains an optional
   third argument: `countdown(eta, now, grace)` returns `'expired'` when `grace` is given and
   `now > eta + grace`, else as today — so every existing caller is unchanged and the two pending
   views opt in. Add `deadline(eta, grace)` → `eta + grace` as a `BigInt`, and export both. In
   `ERRORS` (`:74-93`), `'0xf80dbaea'` for `Expired(uint256)`: decode the eta and say
   `that change expired — it could be applied until <date> and anyone may cancel it now`, the date
   formatted the way the page formats block times (find the one helper; do not add a second).
   `test/model.test.mjs`: the `revertMessage` table (`:152-176`) gains the row with its `cast sig`
   comment, the `countdown` test (`:55`) gains the three-argument cases (inside the window, at
   `eta + grace` exactly — still `'ready to apply'`, since the contract applies at that instant — and
   one second past), and `deadline` gets a one-line test. `AGENTS.md` § The dapp: "the nine custom
   errors by selector" becomes ten.

   Check: `node --test test/model.test.mjs` passes with more tests than before, and
   `grep -c '0xf80dbaea' app/src/model.js test/model.test.mjs` hits in both.

2. **`GRACE` is read, not hard-coded, in the dapp.** The boot read that fetches
   `MAX_BENEFICIARIES()` from the implementation behind the factory (`index.html` near `:405`,
   `S.maxRows`) gains `GRACE()` beside it, carried as `S.grace` (a `BigInt`). The `#/docs` prose t08
   wrote says "fourteen days" twice (`:1504`, `:1526` region) — leave the prose; it is a document,
   and the constant is a new version if it ever moves. Rejected: a literal in `index.html` (a second
   copy of a contract constant, decision 16's cost again).

   Check: `grep -c 'GRACE' app/src/index.html` ≥ 2 (the read and its use).

3. **The pending block shows the window and refuses the dead.** `pendingBlock` (`:578-587`): the
   eyebrow becomes, by phase — waiting: `change queued · <countdown>`; ready:
   `ready to apply · expires in <countdown to deadline>`; expired: `expired · anyone may cancel`,
   in the error tint rather than amber. `pendingActs` (`:593-606`): when expired, the apply control
   is the disabled button with status `this change expired on <date> — it can no longer be applied`,
   and the cancel control is offered to **anyone connected** as a direct `sctl` (`cancel(bytes32)`,
   label `cancel`, status `expired — anyone may clear it`); when not expired, cancel stays the
   owner's `wctl` with its status reworded to `cancel is the owner's until the window closes`.
   `#137` item 1 goes here too: when `decoded.kind === 'setDelay'` and `decoded.delay < d.delay`, the
   row's status gains a `bad`-class line — `lowers the delay from <delayText(d.delay)> to
   <delayText(decoded.delay)>`, or `removes the delay — after this, changes apply the moment they are
   proposed` when it is zero — with the same weight the zero-delay flag already has. The drawer
   prose (`:1023`, "The owner can cancel any time before one lands; anyone can apply after.") and
   the renounce acknowledgement (`:1060`, "no change … can be proposed or cancelled again") are
   reworded for the window: after a renounce nothing can be proposed, and anyone may still clear an
   expired entry.

   Check: on the anvil walk of step 7, the three phases render as written, and the lowering
   `setDelay` carries its line.

4. **The escrow row offers `claim` to its own account.** `fundsHTML` (`:1229-1245`) renders each
   escrow row with `release` for everyone, as today, **and** a `claim` control when the connected
   account is the escrowed account: `same(ACC, e.ac)` → a direct `sctl` on
   `claim(address,address)` with `args: () => [e.tk, to]`, where `to` is a small address field
   beside the button defaulting to `ACC`, validated with the page's `isAddr` and resolving names
   the way the owner field does (`addrField`); when `signsFor(e.ac)` instead (the escrowed account
   is a vault the connected wallet signs for, decision 7's probe), the copy-calldata `wctl` with the
   same arguments. The row's sub-line says why both exist: `release retries the push under its gas
   cap; claim is the account's own exit, paid with its own gas`. `Claimed(address,address,address,uint256)`
   joins `FUND_EVENTS` (`:433`) as kind `claimed`, decoded with its `to`, and `fundWhat` prints
   `claimed to <address>`; `KINDS` follows from the list. A `Received` whose `from` is the zero
   address — t08's `init` sentinel — reads `present at creation` rather than a link to `0x000…0`;
   `tokenIn`/`entry` for kind `in` is where that reads.

   Check: `grep -c '0x21c0b342\|claim(address,address)' app/src/index.html` ≥ 1; the step 7 walk
   lands a `claim` with `status 1`.

5. **The page survives a `snapshot()` that will not answer (#137 item 2).** `loadDistro` (`:415-426`)
   wraps the `snapshot()` `eth_call` in a fallback: on a revert or a provider refusal, read `owner()`,
   `delay()`, `nonce()`, `description()` and `beneficiaries()` as five `eth_call`s (all exist on the
   ABI; each returns one bounded thing), set `d.pending = null`, and let `history()`'s
   `Queued`/`Applied`/`Cancelled` logs rebuild the pending list — a `Queued` log carries hash, nonce,
   eta and action (`:477-480`), which is everything `pendingBlock` needs, less the entries `Applied`
   or `Cancelled` have closed. The detail page then shows a `warn` notice above the pending block:
   `the one-call view could not be read — this list is rebuilt from the queue log and may lag it by a
   block`. A failed `beneficiaries()` is a failed boot read, rendered the way the page renders one
   today. For the rehearsal, a dev-only query flag inside a `/*DEV*/` fence (`?nosnapshot=1`) forces
   the fallback path, so step 7 can exercise it without a hostile node; the shipping bundle strips it
   (`build.mjs` strips the fences unless `--dev` — `AGENTS.md` § The dapp). Rejected: paging
   `snapshot()` on chain (#136 drops it; the contract is t08's and final), and a cap on `_pending`
   (same).

   Check: `make dapp` then `?rpc=…&nosnapshot=1` on the detail page shows the notice and the same
   pending rows the normal load shows; `grep -c 'nosnapshot' app/dist/index.html` → 0 after
   `make dapp-nodev`.

6. **The widget says `expired`.** `widget.js:85` `fmtEta` returns null once `eta` has passed and
   the row prints `ready to apply` (`:191`) forever after. Add the one comparison: when
   `now > eta + 1209600` print `expired` instead. The literal is deliberate — the widget is one
   `eth_call` by contract (`widget.js:3`) and a second read for `GRACE()` would break that — so it
   carries a comment naming `GRACE` in `src/Distribution.sol`, and `test/widget.test.mjs` gains a
   test that a decoded pending entry past the window renders `expired` **and** a test that the
   literal equals `14 * 86400`, so a future change to the constant fails here before it ships.
   `wc -c app/dist/widget.js` stays under the 10,240 budget; record the new size.

   Check: `node --test test/widget.test.mjs` passes with two more tests; `make dapp-nodev` prints the
   widget's size and `left` figure.

7. **The anvil walk, in the handoff.** `make serve` on a spare port set (`ss -ltn` first), then with
   the dev build's `?rpc=…&from=<account>`:
   - **Window.** As the owner (anvil account 0), propose a `setDescription` on a distribution with a
     delay; `cast rpc evm_increaseTime <delay>` and `evm_mine`; the row reads `ready to apply ·
     expires in 14d 0h` (± the mined seconds); increase time past `GRACE`; the row reads `expired`,
     apply is disabled, and as a **stranger** (`?from=<account 2>`) the cancel lands with a
     `status 1` receipt and the row disappears. Before the window closes, the stranger's view shows
     no cancel control and `cast send … "cancel(bytes32)"` from that account reverts `NotOwner`
     (`0x30cd7471`) — the contract's half, recorded for the dapp's.
   - **Lowering `setDelay`.** Propose `setDelay(0)` on the same distribution; the pending row carries
     the `removes the delay` line.
   - **Claim.** `scripts/forge/Fixtures.s.sol` (the escrow demo `make fixtures` runs, `mk/16-fixtures.mk`)
     gains a `BlocklistToken` row — the mock t08 added in `test/mocks/Mocks.sol`, blocking anvil
     account 1 — minted to the featured distribution and distributed, so account 1 holds a token
     escrow an EOA can act on. Connected as account 1 the escrow row shows `claim`; claim to account
     3 lands `status 1`, the `Claimed` row appears in the funds history with `claimed to`, and
     `escrowed(token, account1)` reads zero. The ETH case is a contract recipient's and is not
     reachable from a browser wallet; say so in the handoff rather than faking it.
   - **Fallback.** `?nosnapshot=1` renders the pending list from logs with the notice; without the
     flag the list is identical.
   - **Creation log.** The featured distribution's funds history shows `present at creation` for
     the deposit `make deploy` rode in on, if any; otherwise create one with a deposit and show it.
   The browser check runs as `AGENTS.md` § The dapp describes (`playwright-core` from outside the
   repo); [#110](https://github.com/dnznlabs/rake/issues/110) says the two chromiums may behave the
   other way round from that note — use whichever launches and record which, which is #110's
   evidence.

   Check: every receipt above in the handoff with its `status`, and screenshots or DOM text for the
   three phases, the lowering line, the claim control and the fallback notice.

8. **Criterion 8 and hygiene.** `make dapp-nodev`, then the `make chain-doc` equality from t06's
   runbook step 4 against a fresh upload on the dev chain (`inflated sha256` equals
   `sha256sum app/dist/index.html`, both byte counts), recorded — the document bytes change, so
   t06's step 4 figures in `RUNBOOK.md` § Rehearsed on anvil are superseded and the close-out re-run
   is where they are re-taken. Then `node --test test/*.test.mjs`, `forge build --force`, `forge test`,
   `forge snapshot --check`, `forge lint`, `forge fmt --check` (nothing under `src/` or `test/*.t.sol`
   moved, so all are the merge's figures), `git status --porcelain` empty. `HANDOFF.md` from the
   template: the AC table with evidence, every § For t09 line of t08's handoff disposed of one row
   each, § Deviations, § Discoveries, and § For close-out naming the widget's new size and the
   chain-doc hashes. PR from the template, `Closes #137`, `Carries forward:` filled at review.

## Acceptance criteria

- `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot scripts/forge/Deploy.s.sol scripts/forge/DeployApp.s.sol`
  prints nothing (`Fixtures.s.sol` may move; it is dev-chain only, decision 29); `forge snapshot --check`
  exit 0 on the committed snapshot.
- `node --test test/*.test.mjs` passes with more tests than step 0 recorded, the count stated;
  `grep -c '0xf80dbaea' app/src/model.js test/model.test.mjs` hits in both; `test/widget.test.mjs`
  has the `expired` and `14 * 86400` tests.
- `grep -c 'GRACE' app/src/index.html` ≥ 2; `grep -c 'claim(address,address)' app/src/index.html` ≥ 1;
  `grep -c 'Claimed(address,address,address,uint256)' app/src/index.html` ≥ 1;
  `grep -c 'nosnapshot' app/dist/index.html` → 0 after `make dapp-nodev`;
  `grep -c -i 'or cancelled again' app/src/index.html` → 0.
- `wc -c app/dist/widget.js` under 10,240, stated with the headroom.
- The step 7 walk is in the handoff: a `status 1` receipt each for the stranger's cancel of an
  expired entry, the `claim` to a third address, and the `Claimed` history row; the stranger's
  pre-expiry cancel reverting `NotOwner`; DOM text for the three phases, the lowering line and the
  fallback notice.
- Criterion 8 re-run: `make chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html`
  after `make dapp-nodev`, both recorded with byte counts.
- `HANDOFF.md` disposes of every line in m03-t08's § For t09, one row each.
- #137 closes on merge.

## Out of scope

- Anything under `src/`, `test/*.t.sol`, `.gas-snapshot`, the two scoped deploy scripts,
  `audits/`, `SECURITY.md` — t07's and the third review's.
- A `GRACE` read in the widget, paging or capping the pending queue on chain, a `Received` sender
  other than the sentinel — all contract matters, closed by #136 and t08.
- Log paging ([#76](https://github.com/dnznlabs/rake/issues/76)), name resolution beyond what the
  owner field already does, the gateway — M04.
- Rewriting t08's `#/docs` prose beyond the two sentences step 3 names.

## Human-in-the-loop

None gates this task. Denizen's M02 Phase 5 sign-off covered the dapp before any of these controls
existed; at M03's close-out he looks at the pending block's three phases and the escrow row's
`claim` on anvil, free-form, and says so in the close-out PR — a look, not a criterion.

## Open questions

None. The one design call — a literal `GRACE` in the widget against a read in the dapp — is fixed in
steps 2 and 6 with the reason and the test that pins it.

## Context

- [m03-t08 `HANDOFF.md`](../m03-t08/HANDOFF.md) § For t09 — the source list; § For t07 is not this
  task's.
- [#137](https://github.com/dnznlabs/rake/issues/137) — the two items and their acceptance;
  [#136](https://github.com/dnznlabs/rake/issues/136) — what the triage dropped on the contract side,
  so this task does not reopen it.
- `docs/ROADMAP.md` § Decisions 7 (vault signers act through copied calldata), 16 (the editor
  encodes `_set`'s rules, which is why constants are read rather than copied), 39 and 40 (what t08
  built), 29 (`Fixtures.s.sol` is dev-chain only).
- [m03-t03 `TASK.md`](../m03-t03/TASK.md) — the last dapp-follows-the-ABI task: the `ownerView`
  values, `signsFor`, `wctl`/`sctl`, and the browser walk's shape.
- `AGENTS.md` § The dapp — the write path, `revertMessage`, the `/*DEV*/` fences, the browser check.
