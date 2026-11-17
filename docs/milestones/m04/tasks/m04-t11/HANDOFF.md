# m04-t11 — handoff

PR: #222 · Branch: `m04/t11-history-read-fix` · 2026-11-17

Two independent fixes for #215, both confined to `app/src/index.html`, `app/src/model.js` and
`test/model.test.mjs`. `model.js` gained `isWrappedRefusal(e)`, which takes the error *object* rather
than its text because a wallet's substitution leaves the shape as the only evidence; `logs()` keeps
that object beside the text it already had and its throw gained a fourth clause, so the wrapped
refusal now halves the window like any other nameless one instead of ending the history read at its
first window. Separately `model.js` gained `nonceOf(hash, action, upTo)` and `pendingActs` now takes
each queued entry's nonce from `snapshot()` through it, so the apply control is live at the first
paint and the `Queued` logs add only the `queued in <tx>` link — `DS.nonces` is gone at all six
sites. The dev `capped` provider takes `&wrap=1` and answers the substituted object verbatim, which
is how the browser check drove the shape. Nothing under `src/`, no `MAX_WINDOWS` change, widget bytes
unchanged, and the testnets' document is not re-uploaded by this task (AC (e)).

## Acceptance criteria

Every figure below was measured at `0fcbaaf` on 2026-11-17, beside the baseline it is checked
against. Baselines marked † were re-run on this branch's parent rather than quoted from the plan —
see § Deviations 1.

| AC | Result | Evidence |
|:---|:-------|:---------|
| (a) the wrapped shape halves instead of throwing | **pass** | Browser check with `?rpc=…&from=…&cap=200&wrap=1`, dev build, head 1030: **16 requests per kind** across 3 kinds (48 total), each ≤ 40 and each > 1. Window sizes, descending: **1030, 625, 405, 312, 156, 94** — smallest 94, ≤ 200. `#funds`, `#h-changes` and `#h-funds` all carried rows; none read `history unavailable`; `#h-changes` carried both `queued` rows with `nonce 2` and `nonce 1`. Both apply buttons enabled, `data-send="apply:0"` and `"apply:1"`. Baseline on `main`: **1 request per kind**, all three sections `history unavailable`, thrown text `RPC endpoint returned HTTP client error.` |
| (a) predicted red | **confirmed** | Paired against the same server, chain and URL at head 1033: two copies of the built page differing only in line 788, where `&& !Model.isWrappedRefusal(res[i].e)` is wrapped in `/* … */` — a 6-byte single-line diff, `cmp`-clean against the build otherwise. Green: **16** per kind, sizes 1030-shape, all three sections with rows. Red: **1** per kind, `1..1033` only, all three `history unavailable`. So the clause is what carries (a). |
| (a) the named cap still read on the first refusal | **pass** | Same URL with `&cap=200` and no `wrap`: **7 requests per kind** (21 total), sizes **1030, 200, 30**. `rangeCap` is untouched and still shortcuts the halving. |
| (b) model tests | **pass** | `node --test test/model.test.mjs` → **44 pass, 0 fail** (baseline **40**). The four added: `isWrappedRefusal` true for the measured object, `{ code: -32080 }` and `{ code: -32603, data: { httpStatus: 413 } }`; false for the three provider objects, `{ data: { httpStatus: 500 } }`, `{ code: 4001 }`, `null` and the bare message string; the text classifiers unchanged (`rangeCap` → `[50000, 200]` and `null`, `isPruned` → `true` and `false`); and `nonceOf` against two real `Queued` logs. `node --test test/*.test.mjs` → **109 pass, 0 fail** (baseline **105**†, not the plan's 102 — § Deviations 1). |
| (c) apply is gated on the snapshot | **pass** | Browser check with every `eth_getLogs` refused `{ code: -32603, message: 'Internal JSON-RPC error.' }` through a local proxy (16 refusals, 73 calls forwarded): the three sections read `history unavailable`, and **both apply buttons carried `data-send` with no `disabled`**. Click 1 → `applyQueued` `0xd1dbe694cbc3094aaa3f8742335fb2f4c3fa780aad57c76bb2472d8fe35a5ccd`, block **1031**; click 2 → `0x1fa8e1230b0f20962fbbf4743ee450153906f7bc189fb4fc3e2dc9111589bb1c`, block **1032**, with `#txs` reading **`applyQueued · landed in block 1032 · 0x1fa8…bb1c`**. `pendingCount()` **2 → 1 → 0**; `description()` `"DNZN fees"` → **`"DNZN fees - renamed"`**. Baseline on `main`: both buttons `disabled`, status `history unavailable — apply needs the queue log`. |
| (c) greps | **pass** | `grep -ci 'nonces' app/src/index.html` → **0** (baseline **6**: `:802`, `:1088`, `:1090`, `:1139`, `:1144`, `:1159`). `grep -ic 'apply needs the queue log' app/src/index.html` → **0** (baseline **1**). `grep -ic '32080\|httpStatus'` → **1 / 5 / 4** across `index.html`, `model.js`, `test/model.test.mjs` (baseline **0 / 0 / 0**). |
| (c) the fallback path, unchanged | **pass** | `?nosnapshot=1` with the logs still refused, after re-queuing one entry so the check was not vacuous against an empty queue (`propose` `0x53652148f5290f96d8db3dd1acc3dc0b5d0d090b412ebd30314ea802b00beec7`, block 1033, `pendingCount` 1): the notice reads verbatim `the one-call view could not be read — this list is rebuilt from the queue log and may lag it by a block`, and `.acts` count is **0**. Not changed by this task, as step 3's last bullet requires. |
| (d) widget bytes unchanged, dapp delta recorded | **pass** | `make dapp-nodev CHAIN_ID=11155111` → `wc -c app/dist/widget.js` → **8132**, unchanged (budget 10,240, 2,108 left); `widget.js` is not touched by this task. Dapp **gzip 45,535** against the baseline **45,377** — **+158 bytes**. (The plan's prototype recorded +172 to 45,549; the delta differs because the final comment and status wording differ from the prototype's.) |
| (e) the on-chain document is stale from this merge | **recorded, not a check** | See § For the Product Owner. |
| scope | **pass** | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot app/src/widget.js` prints nothing. `forge test` unchanged at **107 tests, 7 suites, 0 failed**. `git status --porcelain` empty after the build. |
| PR closes #215 | **pass** | `closingIssuesReferences` on #222 reads `#215`, checked after the body's last edit. |

Page and console errors: **none on all seven browser runs**, which AC (a) requires of every run.

## Deviations from the plan

1. **Two of the plan's baselines are `6394f16`'s and m04-t10 has merged since.** The plan's step 0
   records `node --test test/*.test.mjs` → 102 and AC (b) asks for 106. t10 added
   `test/step4-calldata.test.mjs` with three tests, so the real baseline at this branch's parent
   (`025b132`) is **105**, re-run rather than quoted, and four new model tests give **109**. The
   `test/model.test.mjs` baseline of 40 and target of 44 are unaffected. Reported against the
   measured baseline rather than the plan's arithmetic; the plan's own instruction to branch "at or
   after `6394f16`" is what opens the gap.
2. **The plan's step 5 (a) window sizes do not reproduce, by two blocks.** It records the prototype
   at head 1034 with sizes `1034, 200, 36`. After the named cap is read the walk is six windows of
   200 down from the head, so the remainder is `1034 − 5 × 200` = **34**, not 36; at my head 1030 it
   is **30**, which is what I measured. Everything else in that paragraph reproduced in shape. I did
   not change the plan.
3. **`cast send` takes `--from`, not `--sender`, and its trailing arguments are variadic.** Step 5's
   proposal command worked only as `cast send --rpc-url … --unlocked --from <owner> <featured>
   'propose(bytes)' <calldata>`: flags placed after the signature's arguments are swallowed by them.
   `--sender` is `forge script`'s flag, which is what the Makefile's `SEND_FLAGS` feeds — the two are
   not interchangeable.
4. **(b) used a local proxy rather than a `&nologs=1` fence**, which step 5 (b) leaves to the
   engineer's choice and asks to be named. A 60-line Node proxy answered every `eth_getLogs` with
   `{ code: -32603, message: 'Internal JSON-RPC error.' }` and forwarded everything else; it counted
   **16 refusals and 73 forwarded calls**, so the failure was total rather than assumed. Chosen over
   a fence because it leaves `app/src` untouched and because the refusal then arrives by the path a
   real provider's would.

## Decisions

1. **The disabled-button sentence**, which the plan left to the engineer within the register of
   `:805-812`: `no nonce reproduces this entry's hash — apply needs one`, in the `bad` class. It
   states what was tried and what is missing, and it is reachable only from a contract whose hash
   does not match any nonce at or below its own `nonce()` — which a correct `Distribution` never
   produces. The previous two-state wording (`reading the queue log …` / `history unavailable …`) is
   gone with `DS.nonces`.
2. **`isWrappedRefusal` takes the error object, not a message**, unlike its three neighbours. The
   substitution's defining property is that the text carries nothing to match, so a text predicate
   could only ever match the wallet's *sentence* — which would make the page's own composed strings
   classifiable as provider refusals. The test asserts that explicitly: the bare message string is
   `false` while the object carrying it is `true`.

## Discoveries

1. **`app/src/index.html:191`'s comment says Base Sepolia mints a block every 2 s and 43,200 a day.
   Measured 2026-11-17: 0.2000 s, five a second.** `eth_getBlockByNumber` on
   `base-sepolia-rpc.publicnode.com`, blocks 56,161,390 → 60,086,908, timestamps 1,794,154,146 →
   1,794,939,250: 785,104 s over 3,925,518 blocks. Every figure in hours derived from that comment is
   ten times too generous, including the ones #165 carries and the ones I gave the Product Owner
   yesterday. The 40 × 200 budget is **≈27 minutes** of that chain, not 4 h 20 m. Carry to #165; not
   fixed here (out of scope).
2. **The `landed in block N` line is only observable through a MutationObserver.** `reload(w)`
   repaints `#txs` within the frame, so a 300 ms poll sees only the first of the three states
   (`checking the call…`, `sent · waiting for the block`, `landed in block N`). Any future check of a
   send's final state needs to observe rather than sample.
3. **`cast logs --json` returns the `Queued` nonce as the first data word, not a topic**, since only
   the hash is indexed. The fixtures in `test/model.test.mjs` document the parse; a reader expecting
   an indexed nonce finds none.
4. **Applying is permissionless and the UI was the only thing gating it.** `applyQueued` carries
   `notLocked` and no owner modifier (`src/Distribution.sol:242`), so the (b) clicks landed from
   anvil account 1, not the owner. That is the full extent of what #215 cost: not a missing display,
   a withheld action.

## Open questions

None.

## For the Product Owner

**The testnets serve the previous bundle until the next Run B, and that is deliberate.** `App` on
Sepolia and Base Sepolia still serves #214's upload — the #203 bundle, `cast nonce $APP` at 7 on both
chains — and this task's change reaches them only with the next `RUNBOOK.md` Run B, after m04-t12
merges, so one signing round carries both fixes rather than two. Until then the Base Sepolia
workaround stands: set the wallet's Base Sepolia RPC to `base-sepolia-rpc.publicnode.com`, whose
refusal arrives at HTTP 200 with a parseable cap, and the page reads its history normally (#215).
