# m03-t02 — handoff

PR: #103 · Branch: `m03/t02-primitive` · 2026-10-30

`Distribution` is the contract the review will read. Ownership moves in two steps, tables are capped
at 107 rows inside `_set`, `release` names an opaque retry failure, and the two comments the rulings
touched say what the code does. The ABI gains exactly four names and loses nothing, and the
`Snapshot` struct is byte-for-byte unchanged — so nothing under `app/` had to move, and step 8's job
was to list what it must follow in t03 rather than to edit it.

Three of the plan's instructions could not stand, and the architect ruled on all three mid-task
(§ Deviations 1–3). The largest is that **the cap's upper bound stopped being measurable**: `_set` is
the only writer of `_table`, so a 108-row table cannot be built, and the measurement that justified
107 is one the cap now forbids.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `snapshot` struct unchanged | pass | `forge inspect Distribution abi` → `["owner","delay","nonce","description","table","pending"]` |
| ABI gains exactly four, loses nothing | pass | gained `acceptOwnership MAX_BENEFICIARIES pendingOwner ReleaseFailed`; lost: nothing (`comm` against `origin/main`) |
| `forge test` passes | pass | `63 tests passed, 0 failed, 0 skipped (63 total)` |
| every M01 name still listed | pass | all nine definition-of-done names present in `forge test --list --match-contract Distribution` (36 names) |
| `TableCapTest` reads the cap off the contract | pass | `CAP` is `new Distribution().MAX_BENEFICIARIES()`; `gas at CAP: 14892067` < 15,000,000 |
| 108 refused *(amended, deviation 1)* | pass | `test_tableCapBoundary`: cap rows accepted, `cap + 1` reverts `BadTable()` |
| `grep 'non-zero word\|M03 measures'` empty | pass | 0 matches |
| `node --test` passes *(command corrected, deviation 3)* | pass | `node --test test/*.test.mjs` → `tests 61, pass 61, fail 0` |
| `tools/abi-vectors.sh` idempotent | pass | second run leaves `git status --porcelain` empty |
| REFERENCE tables match the ABI | pass | functions 23 = 23, events 7 = 7, errors 7 = 7; all three diffs empty |
| zero build warnings | pass | `forge build --force` → `grep -cE 'warning\[|Warning \('` = 0 |
| `forge lint`, `forge fmt --check` silent | pass | both exit 0, no output; lint run last per `AGENTS.md` |
| `forge snapshot --check` exits 0 | pass | exit 0 on the committed snapshot |
| tree clean | pass | `git status --porcelain` empty after `build --force`, `test`, `snapshot` and `make deploy` |
| M01 criteria 1, 2, 4, 5, 7 | pass | 1 `solc = "0.8.34"` + 0 warnings · 2 nine names + 0 failed · 4 `make fmt` exit 0, lint silent · 5 snapshot tracked, `--check` 0, `ci.yml:52` runs it · 7 clean after all four, `make deploy` exit 0 against a throwaway anvil on `:8601` |

## The ABI diff

Names only, `forge inspect Distribution abi` on `origin/main` against the branch:

```
gained: acceptOwnership  MAX_BENEFICIARIES  pendingOwner  ReleaseFailed
lost:   (nothing)
```

Selectors, each confirmed with `cast sig` rather than derived once: `acceptOwnership()` `0x79ba5097`,
`pendingOwner()` `0xe30c3978`, `MAX_BENEFICIARIES()` `0x2348dd18`, `ReleaseFailed(address)`
`0xca0b64e5`.

## Bytecode sizes

| contract | `878dfa3` baseline | `origin/main` (`b055bc3`) | this branch | change |
|:--|--:|--:|--:|--:|
| `Distribution` | 8,306 | 8,306 | **8,424** | +118 |
| `DistributionFactory` | 1,320 | 1,320 | **1,320** | 0 |

The factory is byte-identical, which matters for M04: its init code contains every byte of
`Distribution.sol`, so the number to watch after this PR is the implementation's.

## The snapshot rows that moved

53 rows on `main` → **63** here: eleven tests added, one removed (deviation 1), so 53 + 11 − 1. Of the
52 rows present in both, **28 moved and 24 did not**.

| change | row | main → branch |
|--:|:--|:--|
| +47,540 | `test_create2AddressStableAcrossChains` | 4,519,050 → 4,566,590 |
| +23,756 | `test_createEmitsAndInits` | 2,282,906 → 2,306,662 |
| +23,721 | `test_createForwardsValue` | 2,266,467 → 2,290,188 |
| +23,710 | `test_factoryRejectsEth` | 2,016,575 → 2,040,285 |
| −4,263 | `test_capRowsStayUnderHalfABlock` | 15,100,104 → 15,095,841 |
| −2,918 | `test_perRowAndFixedCost` | 10,403,499 → 10,400,581 |
| +2,644 | `test_renounceFreezes` | 372,348 → 374,992 |
| +1,385 | `test_tableValidation` | 1,609,015 → 1,610,400 |
| +737 | `test_saltFrontRunningRejected` | 1,040,504,375 → 1,040,505,112 |
| +637 | `test_setDelayZeroDoesNotShortcutQueued` | 900,703 → 901,340 |
| +622 | `test_pendingIterable` | 725,758 → 726,380 |
| +530 | `test_applyFailureKeepsQueued` | 738,482 → 739,012 |
| +435 | `test_settersOnlySelf` | 282,004 → 282,439 |
| +405 | `test_cancelThenApplyReverts` | 398,486 → 398,891 |
| +345 | `test_delayZeroAppliesInline` | 293,403 → 293,748 |
| +341 | `test_nonOwnerCannotProposeOrCancel` | 459,096 → 459,437 |
| +283 | `test_initOnlyFactoryAndOnce` | 280,929 → 281,212 |
| +257 | `test_hookTokenReleaseIsLocked` | 704,369 → 704,626 |
| +240 | `test_reentrantRecipientIsEscrowed` | 660,197 → 660,437 |
| +239 | `test_receiveUnderStipend` | 284,728 → 284,967 |
| +237 | `test_usdtStyleNoReturnToken` | 780,329 → 780,566 |
| +147 | `test_nftTransferReverts` | 489,019 → 489,166 |
| +103 | `test_hookTokenDistributeIsLocked` | 703,747 → 703,850 |
| +83 | `test_escrowRevertingEthRecipientOthersPaid` | 569,500 → 569,583 |
| +81 | `test_implementationRejectsEth` | 289,156 → 289,237 |
| −37 | `test_distributeReleaseDistributeKeepsReserved` | 644,813 → 644,776 |
| +13 | `test_rounding_3333_3333_3334` | 499,059 → 499,072 |
| −3 | `test_realPathPaysASafeAndAVaultClone` | 333,660 → 333,657 |

**Sentences for the rows that moved by more than a few hundred gas**, as step 7 asks.

- The four `+23.7k`–`+47.5k` rows all deploy a `DistributionFactory`, whose constructor deploys the
  implementation. 118 more bytes of implementation at 200 gas a byte is 23,600, which is the whole of
  three of them; `test_create2AddressStableAcrossChains` deploys two factories, hence roughly double.
- `test_renounceFreezes` +2,644 is the only *behavioural* row: renouncing now writes `pendingOwner`
  as well as `owner`, and that is a second slot.
- `test_tableValidation` +1,385 is `_set`'s extra `n > MAX_BENEFICIARIES` comparison paid across the
  suite's many validation cases.
- The two `TableCapTest` rows went **down** — `−4,263` and `−2,918` — which is the same effect as the
  per-row figure moving (see § The figures t01 measured are not this revision's).
- Everything else is a double handful of gas from the test contracts growing by eleven tests, which
  reorders selector dispatch. Same effect measured on m02-t05, where a rename moved eighteen rows.

## The figures t01 measured are not this revision's

`MAX_BENEFICIARIES`'s `@dev` quotes t01's three figures, as step 2 instructs. They are correct **for
the tree t01 measured**, which is `main` at `b055bc3` — re-run there, `TableCapTest` reproduces
138,917 a row, 14,896,325 at 107 and 15,035,242 at 108 exactly. On this branch the same suite reads:

| figure | `main` (= t01) | this branch |
|:--|--:|--:|
| worst-case row | 138,917 | **138,877** |
| 107 rows | 14,896,325 | **14,892,067** |
| 108 rows | 15,035,242 | *not measurable — `_set` refuses it* |
| fitted intercept | 29,703 | 29,725 |

40 gas a row cheaper, and 107 × 40 = 4,280 accounts for the 4,258 the total fell. `distribute`'s
source is untouched (`git diff origin/main -- src/` shows no change inside it), so I attribute it to
`via_ir` codegen moving under the members added here — attributed, not proven, which is why the
comment says so rather than claiming an opcode. No assertion depends on it: the margin under half a
block is unchanged in direction and the cap does not move. The `@dev` now labels each figure with the
revision it is from, which is deviation 5.

## Deviations from the plan

1. **The cap's upper bound stopped being measurable, and the 108 measurement is gone** (architect's
   ruling, option 1 of three I put to him). Step 2 says "the 107 and 108 measurements still run".
   They cannot: `_prepare` reaches its table through `factory.create` → `init` → `_set`, `_set` is
   the only writer of `_table`, and it now rejects `n > MAX_BENEFICIARIES` — so `setUp`'s
   `_prepare(CAP + 1)` reverted `BadTable()` and took the whole suite down with it. Dropped that
   line; `TableCapTest` keeps `_prepare(1/8/64/107)` and the 107 measurement. 15,035,242 stays
   findable in m03-t01's HANDOFF and in the `@dev`. `test_capPlusOneRowsExceedHalfABlock` is removed,
   which is the one row fewer in the snapshot count.
2. **`pendingOwner` goes after `nonce`, not after `owner`** (architect's ruling; his plan error).
   Step 1 says after `owner`, but `owner`, `delay` and `nonce` pack into slot 0 and a 20-byte address
   cannot join them either way — so the plan's position split the hot slot for nothing, and `propose`
   and `snapshot`, which read `owner` and `delay` together, each gained a read. Measured on a tree
   identical but for that one declaration's position: **37 rows move, 34 of them cheaper, net
   −371,789 gas** with `pendingOwner` after `nonce`. The worst single row was `test_tableValidation`
   at −135,616, and the `propose`-heavy tests ran −17,865 to −22,533. Later slots shift by one in
   both layouts; nothing in the repo reads a raw slot (`grep` for `vm.load`, `vm.store`,
   `cast storage`, `getStorageAt` across `src test tools mk scripts app .github` finds only
   comments), so the shift costs nothing.
3. **`node --test test/` cannot pass on this host, and the command is `node --test test/*.test.mjs`**
   (architect's ruling; being fixed in TASK.md and the milestone in a separate docs PR). Node
   v24.12.0 resolves the bare directory as a module and loads zero test files. It fails identically
   on untouched `main`, so it is a stale command and not this branch. `mk/20-dapp.mk:13` has the real
   one, which gives 61/61.
4. **The plan's ten tests are eleven.** The threshold is `data.length <= 32`, so 32 bytes is named and
   33 bubbles, and none of the ten sat on that byte — test 8 is a 32-byte bare word, test 9 a 100-byte
   `Error(string)`, test 10 a 4-byte custom error. `test_releaseBubblesJustOverThreshold` reverts with
   exactly 33 raw bytes and asserts they come back byte for byte. Without it the rule is pinned only
   from a distance; a mutation moving the arm from 32 to 33 passes the other ten.
5. **`MAX_BENEFICIARIES`'s `@dev` says which revision each figure is from.** Step 2 dictates the three
   t01 figures and I kept them, but a reviewer re-measuring on this branch gets 138,877 and
   14,892,067, and 108 is unmeasurable by construction. The comment now says so. See § The figures
   t01 measured are not this revision's.
6. **The two revert shapes went into a new `RevertingToken`, not into `MockERC20`.** Step 5 says to
   add a `Ret.RevertString` arm to `MockERC20`. Doing that moved `test_usdtStyleNoReturnToken` — an
   M01 definition-of-done row — by **+260,510 gas**, because it deploys two of them, for reasons
   having nothing to do with this PR. `MockERC20`'s code is now byte-identical to `main` (28 lines,
   empty diff) and that row sits at +237, which is the dispatch drift everything else has.
   `_escrowFailingToken` gained two typed fronts over an address core; both mocks answer `mint` and
   `balanceOf` at the same selectors.
7. **`TableCapTest` reads the constant off a throwaway instance, in a field initializer.** Step 2
   offers `Distribution.MAX_BENEFICIARIES` or a call through the contract type. The first does not
   compile — a `public constant` of another contract is reachable only through an instance (solc
   9582) — and the second has nothing to call that early, since `_prepare(CAP)` runs from `setUp` and
   the suite's `factory` is built there. `uint256 internal immutable CAP = new Distribution().MAX_BENEFICIARIES();`
   keeps it `immutable` and the name in the repo's constant case, and the throwaway is not the
   implementation the clones delegate into, so it warms nothing any measurement touches.
   `Distribution.t.sol` uses the plan's form, `impl.MAX_BENEFICIARIES()`, which works there.
8. **`Unauthorized()`'s REFERENCE row changed, beyond the four rows step 6 lists.**
   `acceptOwnership` reverts it on a wrong caller, so the old row was wrong by omission; it now reads
   `init, the setters, acceptOwnership, receive` and "not the pending owner". No name moved, so the
   table-vs-ABI diff is unaffected.
9. **Line numbers in the plan had drifted**, trusting the function names as `AGENTS.md` says:
   `release` is at 137, not 144; `_set` at 227, not 229; `_push`'s `@dev` around 275. The anchors in
   steps 1, 2 and 3 for `owner` (53), `BPS_TOTAL` (49), `PUSH_GAS`'s `@dev` (47) and `Unauthorized()`
   (45) were exact, as were `Mocks.sol:8`, `Distribution.t.sol:473` and `TableCap.t.sol:45`.

## Decisions

- **Which of the two cap-boundary tests to keep**, which the architect left to me: `test_tableCapBoundary`
  in `Distribution.t.sol`. It takes both sides — a table of exactly the cap goes in and is read back
  through `beneficiaries()` and `snapshot()`, one row more reverts `BadTable()` — reads the cap off
  the contract, and uses the suite's own `_capTable`/`_expectBadInit` helpers. Its alternative in
  `TableCapTest` needed thirty lines re-implementing `_prepare`'s table build to make one assertion
  honest, inside a harness whose subject is gas. `TableCapTest` now carries a comment pointing at it,
  so a reader of the measurement finds the refusal.
- **Both boundary tests assert the over-cap table breaks no *other* rule first** — ascending, no zero
  share, sums to exactly 10,000 — so a `BadTable()` cannot be the wrong rule tripping. Four
  mutations confirm the eleven tests are not vacuous, including moving the named/bubbled arm from 32
  to 33 bytes, which fails as it must.

## Discoveries

Not fixed here; each is outside this task's scope.

1. **m02-t04's acceptance script no longer passes on a correct tree.** After its three table checks it
   asserts `grep -c 'id="s-' app/src/index.html` is 11, but `test/docs.test.mjs:87-97` asserts 13 and
   the file has 13. The three table checks are sound and I ran them verbatim; only the trailing count
   is stale, and it is about `app/`, not the Distribution tables.
2. **`model.js`'s bare-word branch survives this change for a reason worth recording.** `release` no
   longer bubbles a bare word, but `_balance` still bubbles raw `balanceOf` revert data unguarded
   (`src/Distribution.sol:301`), so a token whose `balanceOf` reverts with 32 bytes still reaches
   `d.length === 66` through `distribute`. t03 keeps the branch and re-attributes the comment rather
   than deleting it — the full reasoning is in § For t03.
3. **`acceptOwnership()` has no on-chain trace of its own.** No event, and `Snapshot` does not carry
   `pendingOwner`, so a completed handover is visible only as `owner()` changing between two reads.
   The plan rules an event out of scope for this task and leaves it to Phase 3; recording that the
   tests made the case, since nothing but a second `eth_call` tells a client a transfer is pending.

## Open questions

None for the Product Owner. The three that arose mid-task were the architect's and are ruled
(deviations 1–3); the seven in § For t03 are his too, and belong to t03's scoping rather than to this
merge.

## For t03 — every `app/` line this ABI makes stale

Nothing under `app/` changed here (step 8 lists, t03 edits). Verified by sweep over the whole of
`app/`, not only the lines the plan named; `app/src/eth.js`, `app/src/widget.js`, `app/src/host.html`,
`app/src/layout.html`, `app/build.mjs` and `app/src/theme.css` need **no** change and are listed under
§ Checked and still accurate so t03 does not re-audit them.

The four selectors t03 needs, each confirmed with `cast sig` rather than derived once:

| signature | selector |
|:--|:--|
| `acceptOwnership()` | `0x79ba5097` |
| `pendingOwner()` | `0xe30c3978` |
| `MAX_BENEFICIARIES()` | `0x2348dd18` |
| `ReleaseFailed(address)` | `0xca0b64e5` |

### `app/src/index.html` — ownership

- `:488` — `p.kind === 'transferOwnership'` renders the non-zero arm as `new owner`. False: applying
  the action only *names* a candidate. Needs a nomination wording, and a **third arm** —
  `p.owner === d.owner` is a withdrawal, and today renders as "new owner · <the current owner>".
- `:534` — the `meta` block prints `owner` only, so a live `pendingOwner` is invisible. Surfacing it
  costs a second `eth_call`; `snapshot()` deliberately does not carry it (ruling 3 below).
- `:837-845` — `ownerView` returns `'visitor'` for the named pending owner, and `:920-928`
  (`ownerBar`) returns nothing for a visitor. **So there is no control anywhere in the dapp to call
  `acceptOwnership()`:** a transfer this dapp starts cannot be finished in it. Largest functional
  gap, not a text fix. `'you own this distribution'` at `:922` is also now reachable while a transfer
  is pending against you.
- `:967-970` — "Both ownership writes" is short by two: `transferOwnership(address)` has three
  effects (nominate, renounce, withdraw) and `acceptOwnership()` is a fourth ownership write, by a
  different caller.
- `:973` — **the most dangerous line in the file.** "Once this is applied, the new owner alone can
  propose and cancel changes" — nothing changes on apply; the current owner keeps every power until
  the named address accepts. The user attests to a consequence that does not occur.
- `:974` — "A mistyped address, or one nobody controls, loses control of this distribution
  permanently." Now false in the direction that matters: an address that cannot accept takes
  nothing, and the owner can withdraw by proposing itself. Two-step ownership is the *fix* for this
  hazard and the acknowledgement still warns about it.
- `:975` — "I can cancel it only until then" understates the window: after apply, the owner can
  still withdraw the nomination.
- `:984-986` / `:1010` — `ownReady` refuses the current owner and `ownerNote` marks it `bad`. That
  address is now the **only** way to withdraw a pending transfer, so the dapp blocks a legitimate
  action (ruling 5).
- `:1019` "Hands this distribution to another address" and `:1023` "hold to change owner" both
  promise a completed transfer. `:1024`'s `propose transferOwnership` label is honest — keep it.
- `:727` — the landing page's four-verb summary: an owner change now also needs an acceptance, and
  `acceptOwnership` is neither owner-only nor delayed.
- `:1428` — "Each change is a separate proposal" is incomplete for the owner change.
- `:1431` — the wallet-operations list omits `acceptOwnership`, the only one the *incoming* owner
  signs.
- `:1434` — the three-step sequence is four. Must also say that the current owner keeps every power
  until acceptance, that the nomination can be withdrawn by proposing oneself, and that **there is
  no event for either** — the only on-chain trace stays the `Queued`/`Applied` pair.
- `:1435` — renouncing now also destroys a nomination in flight.

### `app/src/index.html` — the table cap

- `:587-595` — `editorState` has no `> MAX_BENEFICIARIES` refusal, so a 108-row table passes
  validation, queues happily and then reverts `BadTable()` on apply, stuck for the whole delay. That
  is the exact failure mode the comment at `:582-586` says the function exists to prevent. It is the
  only validator for **both** write paths (`editorPaint:609`, the propose drawer `:949`, create step
  2 via `paintCreate:1260`), so one fix covers create and propose.
- `:582-586` — "Valid means the contract will take it" is false until that check exists, and the
  refusal census ("the first two… the third…") is short by one.
- `:628` — `add.onclick` pushes past 107 unguarded. The symmetric lower guard is already at `:626`.
- `:604` — offers an unbounded "+ add a beneficiary".
- `:613` — prints the row count with no reference to the ceiling; natural home for "107 max".
- `:1414` — reads as an exhaustive enumeration of the table rules and omits the cap. The strongest
  case in the docs for naming it, independent of the Limits ruling.
- `:1441-1449` — the Limits section contains no row-count statement (ruling 1).

### `app/src/model.js`

- `:10-11` — the comment is still right that renounce "decodes as one" call, but that call now has
  **three** effects, so `describe()` must branch three ways.
- `:16` — the decoded field named `owner` now means *nominee* in the non-zero, non-self case. The
  decode is correct; flagged because `index.html:488` prints it as "new owner".
- `:57-59` — "`NotReady` is the only one carrying data" is false: `ReleaseFailed(address token)`
  carries a token.
- `:60-77` — `ERRORS` needs `0xca0b64e5`. It takes one argument, so it wants the `(d, now)` shape and
  can decode the token the way `NotReady` decodes its eta at `:67`.
- `:74` — `Unauthorized()`'s message, "this contract will not take that call", was written for the
  `init`/`receive` guards. It is now also the revert a user meets by pressing an accept button as the
  wrong account, where that wording tells them nothing (ruling 7).
- `:83-84` — **the comment is false but the branch is not dead, and that distinction matters.**
  `// #20: release bubbles the token's own false word` no longer describes `release`, which names
  `ReleaseFailed(token)` instead. But `_balance` still bubbles raw `balanceOf` revert data unguarded
  (`src/Distribution.sol:301` — verified, not assumed), so a token whose `balanceOf` reverts with a
  bare word still reaches `d.length === 66` through `distribute`. t03 **keeps** the branch,
  re-attributes the comment to `_balance`, and rewords `'retry failed'`, which now names the wrong
  call. Decision 24 gives the function its second arm: `ReleaseFailed` at hex length 74.

### App-side JS tests — none fails today, three fail the moment t03 edits

`app/` is unchanged and `Snapshot` was untouched, so all five `*.test.mjs` pass on this branch. What
breaks next:

- `test/model.test.mjs:128-130` — "The eight selectors" counts the `ERRORS` map; adding
  `ReleaseFailed` makes nine. The `Distribution.sol` line annotations at `:134-140` have **drifted**
  with this commit (the factory errors annotated `:299`/`:300` are now at `:315`/`:316`). Re-verify
  each rather than assume.
- `test/model.test.mjs:131-152` — asserts exhaustiveness over a seven-element array. It passes while
  no longer being exhaustive, which is the worse failure; t03 adds a `revertMessage('0xca0b64e5' + …)`
  case.
- `test/model.test.mjs:171-178` — the test name and the `#20` comment document a path `release` no
  longer takes, and the assertion **fails** if t03 changes the `'retry failed'` string, which it
  should.
- `test/docs.test.mjs:87-97` — `assert.equal(sections.length, 13)` is order-sensitive, so a new
  `id="s-…"` docs heading needs `SECTIONS` at `index.html:1316` and the literal `13` updated too.
- `test/abi.test.mjs:88-95` — `lines.length >= 17` is a lower bound and does **not** guard the new
  selectors. Do not mistake it for coverage.

### Needs a ruling from the architect, not a mechanical edit

1. **Does the Limits section name the cap at all?** Its eight rules are hazards the owner cannot fix;
   a row cap is a build-time constraint the editor enforces before any transaction, which argues for
   `:1414` and `:613` instead. And if stated — the number, or "a limit the editor enforces"? The
   contract justifies 107 by a gas measurement, a figure a future deployment could move.
2. **Where does the dapp offer `acceptOwnership()`?** A fourth `VIEW` role, an accept button in the
   `meta` block for a connected account matching `pendingOwner()`, or deliberately out of scope with
   the docs telling the user to call it directly. This decides whether the dapp can complete a
   transfer it started.
3. **Does the detail page read `pendingOwner()` at all?** A second `eth_call` on every detail load,
   for a state that is otherwise invisible and has no event. The cheaper alternative — inferring it
   from the `Queued`/`Applied` pair the page already fetches — is less reliable.
4. **Does `editorState` hardcode 107 or read `MAX_BENEFICIARIES()`?** The constant is `public` so the
   editor need not carry a copy (decision 27), but the editor also runs on *create*, before any
   distribution exists, so the read would have to go to the implementation or the factory. t03 needs
   a ruling on which address is called and what the editor does when that read fails.
5. **Does the transfer field admit the current owner as "withdraw", or does withdrawal get its own
   control?** Reusing the field is cheap but puts a withdrawal behind three transfer-flavoured
   acknowledgements; a third tab beside `change owner` / `renounce` needs its own `ACKS` set and only
   makes sense while a transfer is pending.
6. **Does `ReleaseFailed`'s message name the token?** The error carries it and the page can render it,
   but the release button already names the token. Related: `ReleaseFailed` now swallows
   argument-less custom errors like `Refused()` that a user might have recognised, so the ruling
   includes whether the message should say the token gave no reason.
7. **One `Unauthorized()` message or two?** It now covers the `init`/`receive` guards *and* a wrong
   caller to `acceptOwnership()`. Context-dependent text means `revertMessage` must know which write
   was attempted, which it currently does not.

### Checked and still accurate — do not re-audit

`app/src/eth.js` (every selector derived from keccak at call time, no tables); `app/src/widget.js`
(its `SNAP`/`SETBEN` literals and the `Snapshot` field offsets are all still correct because the
struct was untouched; it makes no claim about ownership or row counts and never decodes revert data);
`app/src/host.html`; `app/src/layout.html`; `app/build.mjs` (the widget is unchanged, so the 10,240
gate is not at risk); `app/src/theme.css` (`.ack`, `.tabs`, `.btn.hold` already provide every hook a
third tab or a new acknowledgement set would need). Also still true: the three renounce
acknowledgements at `:978-980`; the zero-address guards at `:1009`, `:1028-1029`; the duplicate,
zero-share and ascending checks at `:591-594` (only the row-count rule is missing); the escrow and
release prose at `:1405`, `:1424-1425`, `:1444-1445` (`release`'s behaviour is unchanged — only how
an opaque failure is *reported*); the pending/countdown paragraphs at `:1429-1430`; `pendingActs`,
`cancel` and `applyQueued` at `:551-568`; `model.js`'s `supersededBy` and `tableFrom`; and the
calldata, widget and pending-decode tests.
