# m03-t03 — handoff

PR: #109 · Branch: `m03/t03-dapp` · 2026-10-30

The dapp follows the two-step ABI. The detail page takes a fourth read, `pendingOwner()`, because
nothing else makes a nomination legible — the struct does not carry it and only acceptance emits an
event — and prints it as a second line in the owner cell. `ownerView` gains `pending` and
`pending-vault`, the two readings an account the ABI has named (or a vault it signs for) now gets
where it read as a visitor, and those two views get one control: `accept ownership`, a transaction
for the nominee and calldata to copy for its vault. The change-owner disclosure's three
acknowledgements were statements about a transfer that completed on apply; each is rewritten to
something the owner can attest to, and the field admits the owner's own address while a transfer is
pending, which is the one way to withdraw a nomination. `transferOwnership`'s three effects are a
pure rule in `model.js` (`ownerChange`) that the queued line branches on, so no arm says `new owner`
again. The editor refuses a table past `MAX_BENEFICIARIES`, read at boot from the implementation
behind the factory rather than carried as a literal. `#/docs` § Ownership is two steps, § Changing a
distribution names `acceptOwnership`, and the table rules name the cap. `model.js` knows
`ReleaseFailed`, `Unauthorized()` covers both its callers, and the bare-word branch is re-attributed
to `_balance`, which still reaches it. Nothing under `src/`, `test/*.t.sol` or `.gas-snapshot` moved.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `git diff --stat origin/main -- src/` prints nothing, and so does `-- test/*.t.sol .gas-snapshot`; `forge snapshot --check` exits 0 | pass | Both diffs print nothing (run again immediately before the PR). `devbox run -- forge build --force` (`Compiling 39 files with Solc 0.8.34 · Compiler run successful!`) then `devbox run -- forge snapshot --check` → `Ran 5 test suites … 63 tests passed, 0 failed`, exit 0. The forced build is first on purpose (AGENTS.md: lint before a count drops a suite). |
| `node --test test/*.test.mjs` passes with more than the 61 tests `ede55c3` runs; `grep -n '0xca0b64e5' app/src/model.js test/model.test.mjs` hits in both | pass | One instrument (`.devbox/nix/profile/default/bin/node`, v24.12.0) on both trees: `ede55c3` unpacked by `git archive` into `/tmp` → `ℹ tests 61 · pass 61 · fail 0`; this branch → `ℹ tests 62 · pass 62 · fail 0`. The grep hits `app/src/model.js:91` and `test/model.test.mjs:160`. |
| the three retired phrases are gone; `acceptOwnership` ≥ 3; `pendingOwner` ≥ 1 | pass | `grep -n -i 'loses control of this distribution permanently\|the new owner alone can propose\|new owner · ' app/src/index.html` prints nothing (exit 1). `grep -c -i 'acceptOwnership'` → `7`; `grep -c 'pendingOwner'` → `9`. |
| the walk of step 9: `status 1` for propose, apply, accept and withdraw, `pendingOwner()` zero at the end, and the vault case's copied calldata `0x79ba5097` | pass | § The ownership walk below: nine receipts, all `status true`; `cast call … "pendingOwner()(address)"` → zero; the clipboard read back out of the page → `0x79ba5097`. |
| the editor refuses a 108th row before any transaction and prints `of 107` from a `MAX_BENEFICIARIES()` read; `grep -n 'MAX_BENEFICIARIES' app/src/index.html` hits the boot read and the docs line | pass | § The row cap below: `107 of 107 beneficiaries · total 100%`, three further presses of *+ add a beneficiary* leave 107 rows, nothing sent. The grep hits `:397` (the boot read), `:610` (the refusal census) and `:1497` (the docs line). |
| `grep -c 'id="s-'` → 13, `test/docs.test.mjs` passes unchanged, and the m02-t04 acceptance script exits 0 verbatim | pass | `grep -c 'id="s-' app/src/index.html` → `13`. `node --test test/docs.test.mjs` → `ℹ tests 8 · pass 8 · fail 0`; `git diff --stat origin/main -- test/docs.test.mjs` prints nothing. The script, cut verbatim from `docs/milestones/m02/tasks/m02-t04/HANDOFF.md` lines 55-72 and run through devbox from the repo root, prints nothing and exits 0. |
| M02 criterion 8 re-run: `make chain-doc`'s `inflated sha256` equals `sha256sum app/dist/index.html` after `make dapp-nodev`, both recorded with byte counts | pass | § Criterion 8 below. `inflated sha256 dced6539…c2a225d` = `sha256sum app/dist/index.html`; `inflated bytes 126895` = `wc -c` 126,895. `widget sha256 e45088fc…a18bf22b` = `sha256sum app/dist/widget.js`, 7,920 bytes both, unchanged as expected. |
| `forge build --force` prints zero `warning[` / `Warning (` lines; `forge lint` and `forge fmt --check` are silent; `git status --porcelain` is empty | pass | `devbox run -- forge build --force 2>&1 \| grep -cE 'warning\[\|Warning \('` → `0`. `forge lint` → `No files changed, compilation skipped`, exit 0, nothing else. `forge fmt --check` → nothing, exit 0. Both run last. `git status --porcelain` → empty, after the walk, after `make fixtures`, after `make chunks` and after `make chain-doc`. `pre-commit run --all-files` → four hooks, all `Passed`. |
| `HANDOFF.md` disposes of every line in m03-t02's § For t03, one row each | pass | § For t03, disposed below. Population stated with a command: `awk 'NR>=281 && NR<=438' …/m03-t02/HANDOFF.md \| grep -c '^- '` → **32** bullets (14 ownership + 7 table cap + 6 `model.js` + 5 JS tests, each counted the same way), plus `grep -c '^[0-9]\.'` → **7** architect questions. 32 rows and 7 ruling rows below. |

## The ownership walk

One anvil, started empty, on the default ports (`ANVIL_PORT=8545`, `APP_PORT=3000`, both free — the
only other listener on this box was another task's `serve` on `:3003`, left alone). `make serve`,
then `make fixtures` for the vault demo. Every write below was sent **from the dev build** at
`http://localhost:3000/?rpc=http://127.0.0.1:8545&from=<address>`, with no wallet: the three
acknowledgements were clicked and the hold button held for 3.4 s for each propose, and apply, accept
and copy were single clicks. Each full hash was read out of the `title` the page itself wrote, then
re-read with `cast receipt`.

Featured distribution `0x8BA57B0112604f1920021a1aC7792fA71B30Caf5` (owner A, delay 7d), escrow demo
`0xD94Ea8f326842b7F8cb30479e803e78C880B6008` (owner A, delay 1h), `MockVault`
`0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0`. A = anvil 0 `0xf39F…2266`, B = anvil 1 `0x7099…79C8`,
C = anvil 2 `0x3C44…93BC`, the vault's signer = anvil 3 `0x90F7…b906`.

```
$ cast receipt <hash> status / blockNumber

 1  propose transferOwnership(B)   0x941fc5e1163a23b5b0ed1d2b437d751551a3787866a18cf042a82a45ce328766  status true  block 11
 2  applyQueued (nominates)        0xdd6f6a0b0379711bb3ae85781592c38a3b2b1d8c79546eb265f080f454627c70  status true  block 13
 3  acceptOwnership (as B)         0x6274233017be4f63a1dbb12814626d1f4c9669006236fdbac037f80e4c0a97c0  status true  block 14
 4  propose transferOwnership(C)   0x7b01db7878372d29c9c3cdeaa98914d95923a0611a2e3624bfc7886d9c1412bb  status true  block 15
 5  applyQueued (nominates C)      0x4431d6b52900b62769b2d5dae8a9d53777b14c9861aafa5257e76b599f78fccf  status true  block 17
 6  propose transferOwnership(B)   0x5208777cd6d8647f473217013ebcfbd9141714764bf891b4bf9d16d6a504a21f  status true  block 18   (the withdrawal)
 7  applyQueued (withdraw)         0x61fce985de2a5cd9378777c5607859e119ed6a63a5ab2d780ba1b78a6ae67a12  status true  block 20
 8  propose transferOwnership(vault)  0xc36c29b2708782226fb7b5a03b0e49a652cd63bdbde8af042dccb8c48f43f148  status true  block 21   (escrow demo)
 9  applyQueued (nominates vault)  0x80fccf649f3ccc770acb1dd01f42ba201cce4eb10833eb3f039ce6e4ff344618  status true  block 23   (escrow demo)
```

The delay was advanced with `cast rpc evm_increaseTime 604860` + `cast rpc evm_mine` before each
apply on the featured distribution, and `3660` before the escrow demo's. Blocks 12, 16, 19 and 22
are those mines.

What the page read at each step, quoted from the run:

| after | the page |
|:--|:--|
| 1 | pending line: `transferOwnership · nominates · 0x7099…79C8 · queued in 0x941f…8766` — three arms, and this is the nominate arm |
| 2 | meta: `OWNER \| 0xf39F…2266 \| · you \| transfer pending to 0x7099…79C8 \| DELAY \| 7d \| WAITING TO DISTRIBUTE \| Ξ1.0000` |
| 2 | the owner's own bar, with B pending: `Queue a change \| Embed the widget \| you own this distribution` — **no accept control** (`includes('accept ownership')` → false), and `'you own this distribution'` is still true |
| 2 | at `?from=<B>`: `accept ownership \| you are the pending owner — accepting makes you the owner at once; nothing changes until you do` |
| 3 | meta: `OWNER \| 0x7099…79C8 \| · you \| DELAY \| 7d …` — no pending line; bar back to `you own this distribution` |
| 3 | `cast call <d> "pendingOwner()(address)"` → `0x0000…0000`; `"owner()(address)"` → `0x7099…79C8` |
| 3 | `cast logs --from-block 0 --address <d> "OwnershipTransferred(address,address)"` → one log, `blockNumber 14`, `transactionHash 0x6274…97c0` — the accept, and the only ownership event in the run |
| 5 | meta: `transfer pending to 0x3C44…93BC` |
| 6 | the field note for the owner's own address: `withdraws the pending transfer` (not `that is the current owner`, and not the probe's transaction count — see deviation 7) |
| 6 | pending line: `transferOwnership · withdraws the pending transfer · queued in 0x5208…a21f` |
| 7 | meta: no pending line; `cast call … "pendingOwner()(address)"` → `0x0000…0000`, `"owner()(address)"` → `0x7099…79C8` |
| 9 | escrow demo meta: `transfer pending to 0xA51c…91C0`; the owner's bar still offers no accept |
| 9 | at `?from=<anvil 2>` (a stranger): no bar at all |
| 9 | at `?from=<anvil 3>` (the vault's signer): `copy calldata for your vault \| you are a signer on 0xA51c…91C0, which is the pending owner — accepting makes it the owner at once; nothing changes until it does`; `[data-copy="accept"]` 1, `[data-send="accept"]` 0 |
| 9 | the control pressed: `copied · 4 bytes`, and `navigator.clipboard.readText()` → `0x79ba5097`, equal to `cast calldata "acceptOwnership()"` and to `cast sig "acceptOwnership()"` |

`pageerror` and `console` error listeners were attached before every `goto`: `[]` on each of the
walk's eleven page loads, and on the row-cap run's.

## The row cap

The propose drawer, which is the same editor create step 2 and the drawer share — one `editorState`,
so one refusal covers both. On the escrow demo, loaded as its owner:

```
sum line, as loaded                2 of 107 beneficiaries · total 100%
rows as loaded                     2
rows after filling to the cap      107  (105 presses of "+ add a beneficiary", 3s)
sum line at the cap                107 of 107 beneficiaries · total 100%
rows after pressing add again      107
rows after two more presses        107
why line                           every row needs a name and address
queue button disabled              true
eth_sendTransaction                0
```

The `107` in both sum lines is the figure `MAX_BENEFICIARIES()` returned at boot, read from
`implementation()` on the factory: `grep -c '107' app/src/index.html` → **1**, and that one is the
docs sentence step 6 adds (`:1497`). The editor carries no copy of the constant.

## Criterion 8, re-run

`make dapp-nodev && make chunks && make dapp`, then `make chain-doc`, then `make dapp-nodev` again
before the comparison — `make dapp` leaves the *dev* bundle in `app/dist/`, and the chain holds the
non-dev one, so the hashes would differ for that reason alone (AGENTS.md § The contract-hosted dapp).

| | value |
|:--|:--|
| `dapp:` (non-dev) | raw **126,895** bytes · gzip **40,006** bytes |
| `widget:` | raw **7,920** bytes · budget 10,240 · 2,320 left |
| chunks | `chunk 0 0x93b6BDa6a0813D808d75aA42e900664Ceb868bcF`, `chunk 1 0xA22D78bc37cE77FeE1c44F0C2C0d2524318570c3`, `widget chunk 0 0x0ed2E86FcE2e5A7965f59708c01f88a722BC7f07` |
| `html() bytes` | 54,021 (`sha256 bf8d43ec92348a59ba38b769eb3c759db65a6140b8391fe00570175ac5c06d79` — the gzip wrapper, not the page) |
| `payload bytes` | 40,006 |
| `inflated bytes` | **126,895** · `wc -c app/dist/index.html` → **126,895** |
| `inflated sha256` | **`dced6539ad9a19076e0c7d7c810e58b5838b4649f62b83e34b01badd1c2a225d`** |
| `sha256sum app/dist/index.html` | **`dced6539ad9a19076e0c7d7c810e58b5838b4649f62b83e34b01badd1c2a225d`** — equal |
| `widget bytes` | 7,920 · `wc -c app/dist/widget.js` → 7,920 |
| `widget sha256` | **`e45088fc647b806977931274d4bc99f9a027f71009f0d9af3584eb5ba18bf22b`** |
| `sha256sum app/dist/widget.js` | **`e45088fc647b806977931274d4bc99f9a027f71009f0d9af3584eb5ba18bf22b`** — equal, and unchanged as expected: `git diff --stat origin/main -- app/src/widget.js` prints nothing |

## For t03, disposed

Population: **32** bullets and **7** architect questions, counted with the commands in the last AC
row. One row each, in the handoff's order.

### `app/src/index.html` — ownership (14)

| line | what became of it |
|:--|:--|
| `:488` | changed. `describe(p, owner)` branches three ways through `Model.ownerChange`: `renounced` for the zero address, `withdraws the pending transfer` where the call names the owner, `nominates <address>` otherwise. `new owner` is gone from the file. |
| `:534` | changed. The owner cell takes a second `.v` line, `transfer pending to <address>`, amber, from a new fourth read in `loadDistro`. Linked through `ext` like the owner. |
| `:837-845` | changed. `ownerView` gains `pending` (the account is the nominee) and `pending-vault` (a contract nominee answers `isOwner(ACC)` → 1, through the same soft-failing probe, now `signsFor`). Both are additive: only accounts that read as `visitor` before can reach them. |
| `:967-970` | changed. The comment counts four ownership writes — nominate, renounce, withdraw, and the nominee's accept, which is the other bar, not this disclosure — and says why nominate and withdraw share one field. |
| `:973` | changed. `Applying this names the address as the pending owner. I keep every power over this distribution until that address calls acceptOwnership() itself.` |
| `:974` | changed. `I have checked the address. One that cannot accept takes nothing, and until it accepts I can withdraw the nomination by proposing my own address.` |
| `:975` | changed. `After the delay anyone can apply it. I can cancel it until then, and withdraw the nomination after.` |
| `:984-986` / `:1010` | changed. `ownReady` admits the current owner's address while `pendingOwner()` is non-zero and refuses it otherwise; `ownerNote` labels it `withdraws the pending transfer`, class `warn`, not `bad`. `withdrawing(a)` is the one predicate both use. |
| `:1019` + `:1023` + `:1024` | changed, changed, kept. The help text is `Nominates another address as the next owner, which becomes the owner only when it calls acceptOwnership() itself. Your own address withdraws a nomination.`; the hold label is `hold to nominate`; `propose transferOwnership` is untouched. |
| `:727` | changed. Verb 03 now ends `An owner change also needs the new owner to accept it.` |
| `:1428` | changed. `An owner change is the one that is not finished when its proposal is applied: the address it names must also accept it.` |
| `:1431` | changed. `An owner change adds acceptOwnership, the one operation the incoming owner signs; it is neither owner-only nor subject to the delay.` |
| `:1434` | changed. § Ownership is four paragraphs: the two steps, the withdrawal, the two traces (acceptance emits `OwnershipTransferred(previousOwner, newOwner)`; the nomination has no event and rides in `Queued`'s calldata, so it is read from `pendingOwner()`), and the renounce. |
| `:1435` | changed, in that fourth paragraph: renouncing needs no acceptance, takes effect on apply, and destroys a nomination in flight. |

### `app/src/index.html` — the table cap (7)

| line | what became of it |
|:--|:--|
| `:587-595` | changed. `editorState` refuses `rows.length > S.maxRows` in the shape its three siblings use: `at most 107 beneficiaries — the contract refuses a longer table`. |
| `:582-586` | changed. The census counts four refusals: the prototype's two, then the contract's two — the duplicate/zero-share pair and the cap — and names where the figure comes from. |
| `:628` | changed. `add.onclick` adds nothing at the cap, as the remove handler at `:626` removes nothing at one row; the comment names the symmetry. Evidence in § The row cap. |
| `:604` | disposed by `:628` and `:613`: the label is unchanged, the handler is bounded, and the count line beside it states the ceiling, so the control is no longer an unbounded offer. |
| `:613` | changed. `<n> of 107 beneficiar(y\|ies) · total <x>%`, the figure from the boot read. |
| `:1414` | changed. `A table holds at most 107 rows (MAX_BENEFICIARIES), which the create screen and the propose drawer both refuse to exceed before any transaction is sent.` |
| `:1441-1449` | unchanged, by ruling 1: § Limits lists hazards the owner cannot fix. Nothing on the page reads wrong without it — the cap is stated at `:1414` and `:613`, where the rules and the row count are. |

### `app/src/model.js` (6)

| line | what became of it |
|:--|:--|
| `:10-11` | changed. The `SETTERS` comment says one call with three effects since decision 21, and points at `ownerChange`. |
| `:16` | disposed without touching the decode: the field is still `owner`, and what it *means* is now decided by `ownerChange(p, owner)` rather than by the label at `index.html:488`. |
| `:57-59` | changed. `Two of them carry data`, with `ReleaseFailed`'s token named as deliberately not printed. |
| `:60-77` | changed. `'0xca0b64e5': () => 'retry failed — the token gave no reason'` (`cast sig` re-run 2026-10-30), with the comment on why an argument-less custom error from the token arrives here too. Shape: see deviation 3. |
| `:74` | changed. `this contract will not take that call from this account`, one message for the `init`/`receive` guards and for a wrong caller of `acceptOwnership()` (ruling 7). |
| `:83-84` | kept, re-attributed, reworded. The branch stays; the comment names `_balance` (`src/Distribution.sol:308`, verified on this revision — t02's handoff said `:301`) and the text is `the token refused the call`. |

### App-side JS tests (5)

| line | what became of it |
|:--|:--|
| `test/model.test.mjs:128-130` | changed to `The nine selectors`, with every `Distribution.sol` annotation re-read on this revision rather than carried: `:45`, `:46`, `:48`, `:49`, `:50`, `:51`, `:342`, `:343`, and `NotReady` at `:47` in the test below it (it said `:42`). |
| `test/model.test.mjs:131-152` | changed. The array has nine entries; the new one is `revertMessage('0xca0b64e5' + Eth.pad(TOKEN))` and the assertion carries its message, so exhaustiveness is exhaustive again. |
| `test/model.test.mjs:171-178` | changed. Renamed `a bare 32-byte word is a balanceOf revert bubbled raw, and reads as the token refusing`, the `#20` comment re-attributed to `_balance`, and both assertions on the new text. |
| `test/docs.test.mjs:87-97` | unchanged and passing: no section was added or removed, `SECTIONS` is untouched, `grep -c 'id="s-'` → 13. `git diff --stat origin/main -- test/docs.test.mjs` prints nothing. |
| `test/abi.test.mjs:88-95` | left alone, as the plan says. `git diff --stat origin/main -- test/abi.test.mjs` prints nothing. It is a lower bound and guards nothing here. |

### The seven questions for the architect

All seven are ruled in `TASK.md` § Open questions and the steps assume the rulings; each row says
where the ruling landed in the code.

| # | ruling | where it landed |
|:--|:--|:--|
| 1 | Limits does not name the cap | `:1414` and `:613` carry it; § Limits untouched |
| 2 | accept is offered in the detail page's bar, to the nominee and to a vault it signs for | `acceptBar(d)`, and the two new `ownerView` values |
| 3 | `pendingOwner()` is read on every detail load | the fourth read in `loadDistro`, unguarded beside the balance reads |
| 4 | the cap is read, from the implementation behind the factory | `load()`: `implementation()` then `MAX_BENEFICIARIES()`, cached on `S.maxRows` |
| 5 | withdrawal reuses the transfer field | `withdrawing()`, `ownReady`, `ownerNote`, and the acknowledgement at `:974` |
| 6 | the `ReleaseFailed` message does not name the token | `'retry failed — the token gave no reason'` |
| 7 | one `Unauthorized()` message | `'this contract will not take that call from this account'` |

### Checked and still accurate

Verified untouched rather than re-audited: `git diff --stat origin/main -- app/src/eth.js
app/src/widget.js app/src/host.html app/src/layout.html app/build.mjs app/src/theme.css` prints
nothing. The new control and the new note needed no CSS: `.actions`, `.status`, `.res.warn` and
`.meta .v.amber` were already there, as the handoff said they would be.

## Deviations from the plan

1. **The run was interrupted and step 7 was inherited.** A previous engineer's run was killed
   mid-task by a tooling change. Its uncommitted `app/src/model.js` and `test/model.test.mjs` edits
   (37 insertions, 19 deletions) were step 7's work. They were read against step 7 and against § For
   t03 rather than trusted, and committed as step 7's commit after three changes: the `Unauthorized()`
   comment column was one space out of the file's alignment; the `NotReady` annotation in the test
   below the selector list still said `Distribution.sol:42` where the error is at `:47`; and all nine
   selectors and all nine line annotations were re-derived (`cast sig`, `grep -n '^\s*error '
   src/`) rather than inherited. Everything else in the inherited diff was already right, including
   the `_balance` line reference the TASK corrects to `:308`.
2. **Two commits beyond the plan's steps.** `fix(app): the withdrawal note survives the address
   probe` — the walk showed the field's withdrawal note being overwritten by the async address probe
   with the owner's own transaction count, which defeats ruling 5's "the note worded for withdrawal";
   `note()` now returns early for a withdrawal. And `docs: AGENTS.md counts nine errors and names
   the accept bar` — this task made the `revertMessage` census ("the eight custom errors … a bare
   32-byte word as `retry failed`") false and the ownership map short, and ORG.md § Documentation
   makes stale docs a blocker for the PR. Both are inside the task's surface; neither is a new
   feature.
3. **`ERRORS['0xca0b64e5']` is the zero-argument shape, not `(d, now)` with a decode.** Step 7 says
   "in the `(d, now)` shape, decoding the token the way `NotReady` decodes its eta". Ruling 6 forbids
   printing the token, so the decode would have no consumer — and `Eth.dec` on a truncated
   `0xca0b64e5` with no argument would throw inside the one helper whose job is to turn bytes into a
   sentence. The entry returns exactly the specified string; every entry is called as `known(d, now)`
   regardless, so the map's contract is unchanged.
4. **`cast calldata-decode "acceptOwnership()" 0x79ba5097` cannot pass.** Step 2's check names it;
   run verbatim through devbox it prints `Error: no data was decoded` and exits 1, because the
   signature has no arguments to decode. The claim is evidenced in the direction that works:
   `cast calldata "acceptOwnership()"` → `0x79ba5097` and `cast sig "acceptOwnership()"` →
   `0x79ba5097`, both equal to the bytes read back out of the page's clipboard.
5. **`describe()` takes the owner as an argument, and history rows are read without one.** Step 4
   says `withdraws the pending transfer` when `p.owner === d.owner`. A `Queued` log does not carry
   the owner of the moment it was written, so applying today's owner to a historical row would label
   an old nomination that later succeeded as a withdrawal — a false line of exactly the kind this
   task exists to remove. Every live pending entry passes `d.owner` and reads correctly; history rows
   pass nothing and say `nominates`, which the call did either way. `Model.ownerChange` documents the
   asymmetry.
6. **The three-way rule is a new `model.js` export.** Step 4's check asks for "a `node --test
   test/model.test.mjs` case [that] decodes a queued `transferOwnership(owner)` and reads it as a
   withdrawal", which is not reachable if the branching lives only in `index.html`. `ownerChange` is
   the pure rule, tested under node; the wording stays in `describe()`. `FUNCTIONS` in
   `test/model.test.mjs` grew by one, and the test that counts `function ` declarations against it
   still balances.
7. **The cap refusal in `editorState` sits after the zero-share refusal**, so the comment's census
   reads in document order. It is also unreachable from the UI, because `add.onclick` stops at the
   cap and no on-chain table can exceed it — two gates where the plan asks for two, with the add
   guard the one the evidence exercises.
8. **`make serve` needed `PC_DISABLE_TUI=true`.** `process-compose … up` dies with `TUI startup
   error · terminal entry not found: term not set` in a non-interactive shell. The env var is the
   same command with the TUI off; ports were the defaults, 8545 and 3000.
9. **Three anvils were started; only the third run is quoted.** The first two were harness debugging
   (the status-line observer was attached before `document.body` existed, so a landed write left no
   record). Each run started from an empty chain; the quoted hashes are one coherent run on the final
   build.

## Decisions

1. **The pending owner is a second line in the owner cell, not a fourth `.meta` cell.** It is a fact
   about the owner, and the cell's first line still names who holds every power. Amber, because the
   page's amber means pending.
2. **`OWNS()` and `COPIES()` replace the `VIEW === 'visitor'` and `VIEW === 'vault'` tests.** The one
   `VIEW` value was answering two questions at once — may this account propose and cancel, and does
   it act through a contract — and the two new values split those answers. Without the split, a
   nominee would have inherited the owner's `cancel` button in `pendingActs`.
3. **The owner views keep precedence in `ownerView`.** An account that is both a signer of the owning
   vault and the nominee is shown the bar with more on it; it loses nothing, since accepting is one
   `?from=` away and the calldata is the same four bytes.
4. **The vault case runs on the escrow demo, not the featured distribution**, so the featured
   distribution ends the walk with `pendingOwner()` zero, which is what the acceptance criterion
   reads.
5. **The withdrawal keeps `hold to nominate` on the button.** Step 3 fixes that label; the field's
   note directly above it says `withdraws the pending transfer`, and the pending line says it again
   once queued.

## Discoveries

- `transferOwnership(address(0))` sets `owner` to zero and returns **without emitting**
  `OwnershipTransferred` (`src/Distribution.sol:236-239`), while `acceptOwnership` emits it. So a
  renounce leaves no ownership event at all and is legible only from `snapshot().owner`. § Ownership
  is written to match (it claims the event for acceptance only); `src/` is final at `ede55c3` and
  this is not fixed here.
- `docs/milestones/m02/tasks/m02-t04/HANDOFF.md` still says `11` in three places the plan did not
  name — "Eleven `h2`" and two criterion-8 figures at lines 36-38. #104 and step 8 scope the fix to
  `:35` and `:72`, so they stand.
- AGENTS.md § The dapp says the cached Playwright chromium "fails on `libnspr4.so`" and that the nix
  chromium is the one that launches. On this host the opposite holds:
  `~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome` launches and drove every page
  claim above, and `ls -d /nix/store/*-chromium-1*/bin` finds nothing. The bullet is stale in that
  direction; not this task's surface.
- `cast calldata-decode` is unusable as a check on an argument-less selector (deviation 4). Any
  future plan that wants to pin four bytes should name `cast calldata` or `cast sig`.
- `devbox run -- <cmd>` runs from the devbox project root, not the shell's cwd. A measurement taken
  "at `ede55c3`" in a `/tmp` unpack silently measured the branch instead until the toolchain's node
  was invoked by absolute path. The 61/62 figures above are from one instrument on both trees.

## Open questions

None for the Product Owner.

## Merged past the approval

Written 2026-10-30 by Lakos, after the merge. The review approved `c27d466`. Three commits by
Denizen landed on the branch at 22:03 CDT, after that approval and before the merge, so #109 merged
at `c85cd5c` (merge `da09ae6`). All three touch `app/src/index.html` only; `git log a1f45f1..da09ae6
-- src/ scripts/forge/` is empty, so `ede55c3` stands as t04's input. Everything above this heading
describes `c27d466`; the line numbers in § For t03 are that commit's.

| Commit | What it does | Read against the handoff |
|:-------|:-------------|:-------------------------|
| `7007200` history shows the accepted ownership handover | Adds `OwnershipTransferred(address,address)` to `CHANGE_EVENTS` as a fourth kind, `accepted`, rendered `owner · A → B` and styled as done. | Consistent with deviation 5, which it does not touch: `describe()` still says `nominates` on history rows. `OwnershipTransferred` has exactly one emit site, `acceptOwnership()` (`src/Distribution.sol:248`); the constructor and the renounce arm of `transferOwnership` emit nothing, so every `accepted` row is an acceptance and the comment in the code is exact. |
| `619eac2` resolve `.wei` and `.gwei` names in address fields | Forward lookup asked ENS for every name; the suffix now picks WNS or GNS (`regAddr`, split out of `regName`), and the five address-field placeholders name the three suffixes. | A fix to the port m02-t03 landed, not M04 work arriving early: decision 13 and `ROADMAP.md:164` put the code in m02-t03 and the *exercise* in M04, and this task's § Out of scope defers the exercise. M04 still exercises it; this is the first bug that exercise would have found. Not re-run here against a registry. |
| `c85cd5c` close the queue drawer once a proposal lands | `bindWrites` passes the write to its reload callback; a landed `propose(bytes)` clears the drawer state through a new `closeDrawer()` that `detail()` also uses. | UI state only. |

Re-measured on `main` at `7be99fa`, one instrument, 2026-10-30: `node --test test/*.test.mjs` →
`ℹ tests 62 · pass 62 · fail 0`; the three retired phrases still grep to nothing; `grep -c 'id="s-'`
is still 13. `make dapp-nodev` → `dapp: raw 127532 bytes · gzip 40225 bytes`,
`sha256sum app/dist/index.html` → `26609f14126cd1fac76ade978ad9b736c4669c35d5abfeae9df8ebc4982b8cdd`.
§ Criterion 8's `dced6539…` is therefore `c27d466`'s page, not `main`'s; the chunk upload and the
`make chain-doc` equality were not re-run, since they are measured against an anvil that no longer
exists and the criterion is M04's to re-establish on a public chain.
