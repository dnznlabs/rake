# m04-t11 — History read robustness

Milestone: [M04](../../MILESTONE.md) · Phase: 1 — The dapp that ships

When this is done, a range refusal that reaches the page with no range in its text — the object
MetaMask substitutes for a provider answer that arrived under an HTTP 413 — shrinks the window like
any other refusal instead of ending the history read at its first window
([#215](https://github.com/dnznlabs/rake/issues/215)); and the apply control on a distribution page
is enabled from what `snapshot()` returns, never from the history read, so a ripened queued action
stays applicable while the history sections report their own failure. `app/src/index.html`,
`app/src/model.js`, `test/model.test.mjs` only; nothing under `src/`, no `MAX_WINDOWS` change, and the
testnets' on-chain document is not re-uploaded by this task.

## Plan

Every command runs from the repo root through `devbox run --` (node `v24.12.0` from `devbox.lock`;
`anvil` `1.7.1-dev`). Branch `m04/t11-history-read-fix` from `origin/main` at or after `6394f16`.
Check hooks with `ls .git/hooks | grep -v sample` → `pre-commit`, `post-commit`. Line numbers below
are `app/src/index.html`, `app/src/model.js` and `test/model.test.mjs` at `6394f16`; trust names over
numbers. Never `devbox run -- bash -c` with a pipe; write a script. The browser check runs as
m04-t01's did ([HANDOFF.md](../m04-t01/HANDOFF.md) § The browser check): `playwright-core` outside
the repo driving the cached chromium `AGENTS.md` § The dapp names, against the dev build (`make dapp`),
which keeps the `/*DEV*/` fences the per-kind counter `self.__LOGREQ` (`:224`) and the `capped`
provider (`:74`) live inside.

0. **Baselines**, re-run and recorded with the date, not quoted. Measured on `main` at `6394f16`,
   2026-11-17:
   - `node --test test/*.test.mjs` → `ℹ tests 102 · ℹ pass 102 · ℹ fail 0`; `test/model.test.mjs`
     alone → 40.
   - `make dapp-nodev CHAIN_ID=11155111` → `widget: raw 8132 bytes · budget 10240 · 2108 left`,
     `dapp: raw 142989 bytes · gzip 45377 bytes`; `wc -c app/dist/widget.js` → `8132`.
   - `grep -ic '32080\|httpStatus' app/src/index.html app/src/model.js test/model.test.mjs` → `0`,
     `0`, `0`.
   - In the browser, `main`'s dev build against an anvil whose factory sits at block 1 and whose
     head is 1,034, with two ripe queued entries, read through a proxy that answers every
     `eth_getLogs` wider than 200 blocks with the object below: `self.__LOGREQ` holds **one request
     per kind, blocks 1..1034**; `#funds`, `#h-changes` and `#h-funds` read `history unavailable`;
     both apply buttons are `disabled` with the status `history unavailable — apply needs the queue
     log`. The text `logs()` throws is `errText` (`:213`) of that object:
     `RPC endpoint returned HTTP client error.` — nothing `rangeCap`, `isPruned` or `RANGEY` (`:218`)
     matches, so `:254` throws it. This is the reproduction the AC asks for on `main`; the proxy is
     the architect's and is not in the repo, so re-run it only if `logs()` has moved since `6394f16`,
     otherwise record this paragraph as the architect's measurement, dated.

   The object, as measured through MetaMask on Base Sepolia (#215) and answered by the proxy:

   ```
   { code: -32080, message: "RPC endpoint returned HTTP client error.", data: { httpStatus: 413, cause: null } }
   ```

1. **The classifier, in `model.js`, pure and tested.** Beside `isPruned` (`:230`) add
   `isWrappedRefusal(e)`: `true` when `e` is an object with `code === -32080`, or whose `data` is an
   object with `httpStatus === 413`; `false` for anything else, `null` and strings included. It
   takes the error *object*, not its text — the shape is the only evidence the substitution leaves.
   Export it (`:241`). Add a comment in the register of `:212-215` saying what MetaMask does and the
   date it was measured; do not touch `CAPS`, `rangeCap` or `isPruned`.

   Check, in `test/model.test.mjs` after the `isPruned` test (`:461`): four tests, with the object
   above and the three measured provider strings as objects (`{ code: -32701, message: 'exceed
   maximum block range: 50000' }`, `{ code: -32614, message: 'eth_getLogs is limited to a 200 range'
   }`, `{ code: 4444, message: 'pruned history unavailable' }`) as module-level fixtures —
   (i) `isWrappedRefusal` is `true` for the object, for `{ code: -32080 }` alone and for
   `{ code: -32603, data: { httpStatus: 413 } }`; (ii) `false` for the three provider objects, for
   `{ data: { httpStatus: 500 } }`, `{ code: 4001 }`, `null` and a bare string; (iii) `rangeCap` of
   the two named caps is still `[50000, 200]` and of the wrapped message `null`, `isPruned` of the
   pruned message still `true` and of the wrapped message `false`; (iv) the `nonceOf` test of step 3.
   `FUNCTIONS` (`:18`) gains both names or the export test fails. `node --test test/model.test.mjs`
   → **44**.

2. **`logs()` keeps the object and reads its shape before throwing.** `:247` becomes
   `e => ({ err: errText(e), e })`, and the throw at `:254` gains the fourth clause:

   ```js
   if (!Model.isPruned(text) && cap == null && !RANGEY.test(text) && !Model.isWrappedRefusal(res[i].e)) throw new Error(text);
   ```

   Nothing else in the loop moves: `cap` is `null` for this shape, so `:265` halves. Rejected, and
   measured: halving from the refused window's width rather than the nominal `size`
   (`Math.floor((top - batch[i][0] + 1) / 2)`) — on the 1,034-block rehearsal chain it changed the
   per-kind request count not at all (16 before, 16 after; the batch sends `WINDOW_INFLIGHT` windows
   at each probe size and the refusal of the first wastes the rest), so it buys nothing this task can
   measure. Rejected: widening `RANGEY` or `errText` to read `data.httpStatus` into the text — a
   classifier on a sentence the page composed itself.

3. **The apply control reads the nonce out of the snapshot, not out of the logs.** Today
   `pendingActs` (`:801`) takes `nonce` from `DS.nonces` (`:802`), which only `absorb` fills
   (`:1159`) from the `Queued` logs, so a failed history read leaves the button disabled with the
   `history unavailable — apply needs the queue log` line (`:806-808`). The nonce is recoverable
   without a log: `propose` sets `hash = keccak256(abi.encode(action, nonce))`
   (`src/Distribution.sol:224`) and `applyQueued` recomputes it (`:243`), and `snapshot()` returns
   `nonce` — the count of everything ever proposed — beside `pending`'s `(hash, eta, action)`
   (`index.html:544`). So:
   - `model.js`: `nonceOf(hash, action, upTo)` — for `n` from `Number(upTo)` down to 1, the first
     `n` with `'0x' + Eth.keccak(Eth.hexBytes(Eth.enc('x(bytes,uint32)', [action, n]).slice(10)))`
     equal to `hash` (compare lowercased), else `undefined`. `enc` with a throwaway signature and the
     selector sliced off is `abi.encode` of the arguments; `eth.js` has no bare encoder and does not
     need one. Export it. Verified 2026-11-17 against two `Queued` logs read off anvil: the seed's
     `setBeneficiaries` at nonce 1 and a `setDescription` proposed after it, hash
     `0xd4a469e4…a04d09`, at nonce 2 — `nonceOf(hash, action, 2n)` → `2`, with `upTo` 1 →
     `undefined`. Cost, worst case (no match, `upTo` keccaks), node `v24.12.0` on this host:
     10 → 6.6 ms, 100 → 22 ms, 1,000 → 187 ms; a distribution's `nonce` is its lifetime proposal
     count, so the DNZN distribution pays single-digit milliseconds per paint.
   - `pendingActs:802` becomes `const nonce = Model.nonceOf(p[0], p[2], d.nonce);`. Keep the
     `nonce === undefined` branch as a disabled button with one status line in the `bad` class —
     `no nonce reproduces this entry's hash — apply needs one` — because a correct contract never
     reaches it and a wrong one must not get a guessed nonce (`NotReady(0)`). Both `DS.failed`
     readings at `:808` go.
   - `DS.nonces` is now unused: remove the member (`:1090`, `:1139`), the fill (`:1159`) and the
     word from the comments at `:1088` and `:1144`. `DS.qtx` stays — the `queued in <tx>` link
     (`pendingBlock:784`) is the log's and still arrives when the history does.
   - Rewrite the comment at `:797-800` and the one at `:1088-1089` ("drawn twice: once disabled,
     once able"): the button is able at the first paint; the history adds the tx link, nothing more.
   - The fallback path is unchanged and stays log-dependent, and the comment at `:547-553` already
     says why: when `snapshot()` itself cannot be read, `pending` is `null` until `absorb` rebuilds
     it from the `Queued` logs (`:1164`), and with the logs also failing the block shows the lag
     notice and no entries. Rehearsed 2026-11-17 (`?nosnapshot=1` through a throwing proxy):
     `the one-call view could not be read — this list is rebuilt from the queue log and may lag it by
     a block`, no `.acts`. Do not change it; name it in the handoff.

   Check: step 1's `nonceOf` test (two logs' worth of hash/action/nonce, read from your own anvil
   with `cast logs --address <distribution> "Queued(bytes32,uint32,uint256,bytes)" --json`, topic 1
   the hash, the first data word the nonce; plus an `upTo` below the nonce → `undefined`, an
   uppercased hash → the same nonce, and `upTo` 0 → `undefined`); `grep -ci 'nonces'
   app/src/index.html` → 0 (baseline 6: `:802`, `:1088`, `:1090`, `:1139`, `:1144`, `:1159`).

4. **The dev `capped` provider answers the wrapped shape.** `capped(p, cap, prune)` (`:74`) gains a
   fourth parameter `wrap`; when set, the over-cap refusal thrown at `:79` is the object of step 0
   verbatim — `code -32080`, `message 'RPC endpoint returned HTTP client error.'`, `data { httpStatus:
   413, cause: null }`, no range text — instead of `-32614`. `:89` passes `!!Q.get('wrap')`. The
   comment at `:70-73` names `&wrap=1` and #215. `?cap=200&prune=N` keep their meaning.

5. **The browser check**, against a dev stack on spare ports as t01 ran it (`ANVIL_PORT=8745
   APP_PORT=3200`, `make deploy` then `make dapp CHAIN_ID=31337`, `serve app/dist`), the chain shaped
   so the first window is wider than 200 blocks and an entry is ripe: from the seed's owner
   (`0xf39F…2266`, `--unlocked`) `cast send <featured> "propose(bytes)" $(cast calldata
   "setDescription(string)" "<new name>")`, then `cast rpc evm_increaseTime 608400` (7 d + 1 h,
   inside `GRACE`) and `cast rpc anvil_mine 0x400`. The featured address is `cast call <factory>
   "predict(bytes32)(address)" 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001`.
   Read every DOM figure through playwright; `page errors: none` on every run.
   - (a) `?rpc=<anvil>&from=<account 1>&cap=200&wrap=1#/distros/<featured>`: `self.__LOGREQ` grouped
     by `kind` — the count and the distinct `b - a + 1` sizes per kind; `#funds`, `#h-changes`,
     `#h-funds` painted with rows; both apply buttons enabled (`data-send="apply:0"`, `"apply:1"`).
     Rehearsed 2026-11-17 on the prototype, head 1,034: **16 requests per kind**, sizes
     `1034, 625, 409, 312, 156, 98` — the nominal window halves 10,000 → 5,000 → 2,500 → 1,250 →
     625 → 312 → 156 and each probe above the range re-asks the whole range; `changes` carried both
     `queued` rows with their nonces. The same page with `?cap=200` and no `wrap`: **7 per kind**,
     sizes `1034, 200, 36` — the named cap is read on the first refusal. Record both.
   - (b) the same with the log provider failing outright. Either point `?rpc=` at a proxy that
     answers every `eth_getLogs` with `{ code: -32603, message: 'Internal JSON-RPC error.' }` and
     forwards the rest, or add a `/*DEV*/`-fenced `&nologs=1` to `capped` that throws that object
     for `eth_getLogs` — your choice, named in the handoff. Expect the three sections to read
     `history unavailable`, both apply buttons enabled, then click one: `#txs` reads
     `applyQueued · landed in block N`, `cast call <featured> "pendingCount()(uint256)"` falls by
     one, and a second load and click takes it to 0 with `description()` renamed. Rehearsed
     2026-11-17: `landed in block 1035`, `pendingCount` 2 → 1 → 0, `description()` `"DNZN fees"` →
     `"DNZN fees — renamed"`.
   - (c) `?nosnapshot=1` with the log provider failing: the lag notice and no `.acts`, as step 3
     says.

6. **Bytes.** `make dapp-nodev CHAIN_ID=11155111` → `wc -c app/dist/widget.js` → `8132`, unchanged
   (`widget.js` is not touched); record the dapp `gzip` figure beside step 0's 45,377. Rehearsed on
   the prototype: `gzip 45549`, +172 bytes. `git status --porcelain` empty after the build.

7. **`HANDOFF.md`** beside this file, from the template: the AC table with every figure measured
   today beside the baseline it is checked against, the request counts of step 5 (a) for both
   modes, the `applyQueued` hashes and the `pendingCount` reads of (b), § Deviations, and under
   § For the Product Owner the one line of AC (e).

## Acceptance criteria

Each row names its command and the baseline on `main` at `6394f16` (2026-11-17) that it must differ
from, so a vacuous pass has nowhere to hide.

- (a) **The wrapped shape halves instead of throwing.** Browser check 5 (a) with `&cap=200&wrap=1`:
  per-kind `__LOGREQ` counts recorded, each ≤ 40 and each > 1; the smallest size per kind ≤ 200;
  `#funds`, `#h-changes` and `#h-funds` carry rows and none reads `history unavailable`. Baseline on
  `main`: 1 request per kind, all three sections `history unavailable`, thrown text `RPC endpoint
  returned HTTP client error.` (step 0). Predicted red: comment out the fourth clause of step 2 and
  the page is `main`'s again — 1 request per kind, three `history unavailable`.
- (b) **Model tests.** `node --test test/model.test.mjs` → 44 passing (baseline 40), the four of
  step 1 named in the handoff; `node --test test/*.test.mjs` → 106 (baseline 102). Predicted red for
  each clause of step 1 (ii): change `httpStatus === 413` to `>= 400` and the `{ data: { httpStatus:
  500 } }` row fails; drop the `code === -32080` arm and the `{ code: -32080 }` row fails.
- (c) **Apply is gated on the snapshot.** Browser check 5 (b): with every `eth_getLogs` failing,
  both apply buttons carry `data-send` and no `disabled`; one click → `#txs` `applyQueued · landed
  in block N`; `pendingCount()` 2 → 1 → 0 across two clicks on anvil. Baseline on `main`: both
  buttons `disabled`, status `history unavailable — apply needs the queue log` (step 0).
  `grep -ci 'nonces' app/src/index.html` → 0 (baseline 6); `grep -ic 'apply needs the queue log'
  app/src/index.html` → 0 (baseline 1). Predicted red: leave `:802` as it is and (c) is `main`'s
  again — both buttons `disabled` under the throwing provider, and the first grep reads 1.
- (d) **Widget bytes unchanged, dapp delta recorded.** `make dapp-nodev CHAIN_ID=11155111`;
  `wc -c app/dist/widget.js` → `8132` (budget 10,240; baseline 8,132 from m04-t01); the dapp `gzip`
  figure recorded beside 45,377 (prototype: 45,549).
- (e) **The on-chain document is stale from this merge until the next Run B.** `App` on both
  testnets serves the #203 bundle ([#214](https://github.com/dnznlabs/rake/pull/214)'s upload,
  executed with `cast nonce $APP` at 7 on both chains); this task's bundle reaches them with the next
  `RUNBOOK.md` Run B, after m04-t12 merges, so one signing round carries both. The handoff names it
  under § For the Product Owner; until then the Base Sepolia workaround is the wallet's RPC set to
  `base-sepolia-rpc.publicnode.com`, whose refusal arrives at HTTP 200 with a parseable cap (#215).
- `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot app/src/widget.js` prints
  nothing; `forge test` unchanged.
- PR closes #215.

## Out of scope

- `MAX_WINDOWS`, `WINDOW_START`, `WINDOW_INFLIGHT`, or how the budget is spent — #165. One figure
  for that issue, counted from the code at `6394f16` and labelled an estimate: on Base Sepolia from a
  10,000 start, six nameless refusals at four windows each spend 24 of the 40 windows before a 156-block
  size is accepted, leaving about 16 × 156 ≈ 2,500 blocks per pass against 7,800 with the named cap.
  In time, at Base Sepolia's measured block time of 0.200 s (`eth_getBlockByNumber` on
  `base-sepolia-rpc.publicnode.com`, 2026-11-17: blocks 56,161,390 → 60,078,563, timestamps
  1,794,154,146 → 1,794,937,581, 783,435 s over 3,917,173 blocks), 7,800 blocks is about 26 minutes
  and 2,500 about 8 minutes; the 40 × 10,000 budget is 400,000 blocks, about 22 hours. #165's "4 h
  20 m" and "nine days" assume 2 s per block and are ten times too generous on this chain; re-read
  two timestamps before carrying any figure in hours. Carry it to #165 in the handoff; do not fix
  it here.
- A read RPC of the page's own — struck on #215, the Product Owner's to reverse.
- The finalized-log cache (m04-t12) and any re-upload (the next Run B).
- The fallback path when `snapshot()` itself fails (step 3, last bullet).
- `eth_sendTransaction` errors under the same wrapping — `txError` (`:167-174`) reads `data.data`;
  whether MetaMask substitutes there too is unmeasured and is a t05 observation, not a change here.
- Anything under `src/`; `#/docs` prose (decision 17).

## Open questions

None. The disabled-button sentence of step 3 is the engineer's to word within the register of
`:805-812`; the handoff records the final text.

## Context

- [#215](https://github.com/dnznlabs/rake/issues/215) — the measurement, the two fixes and the
  2026-11-17 ruling that struck the page-chosen RPC.
- [#165](https://github.com/dnznlabs/rake/issues/165) — the window budget, untouched here.
- m04-t01 [TASK.md](../m04-t01/TASK.md) step 1 and [HANDOFF.md](../m04-t01/HANDOFF.md) § The
  browser check, § The provider caps — the windowing this task extends and the harness it reuses.
- `src/Distribution.sol:220-245` — `propose` and `applyQueued`, the hash both compute.
- [#214](https://github.com/dnznlabs/rake/pull/214) — the upload that fixes what the testnets serve
  until the next Run B.
