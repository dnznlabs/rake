# m04-t10 — The document re-upload, and the runbook's two entry points

Milestone: [M04](../../MILESTONE.md) · Phase: 2 — The runbook, for real

When this is done, `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` serves the bundle built from
`main` at or after [#203](https://github.com/dnznlabs/rake/pull/203) on Sepolia (11155111) and Base
Sepolia (84532) — the FUND distribution featured (decisions 49 and 51), the hero without the alpha line
(decision 48), the editor and list fixes — with `chain-doc`'s `inflated sha256` equal to that build on
each chain; and `RUNBOOK.md` opens with a section that tells a reader which of two runs they are about to
do — **Run A, the contracts** (steps 1–7) or **Run B, the document** (Step 4 alone) — and Run B is
executable from the runbook with no other document open ([#193](https://github.com/dnznlabs/rake/issues/193),
Denizen 2026-11-17 08:29–08:31 CST: "we need to ensure the rake runbook has designation between …
first time deployment … redeploy of UI"). This is the first routine upload, and the runbook's text for
routine uploads is written by it.

## Plan

Both chains, Sepolia first. Branch `m04/t10-reupload` from `origin/main` at or after `c0ea940` (the
merge of #200; #203, #205, #208 and #210 are all below it). Every chain read carries an explicit
`--rpc-url "$RPC"` and begins with `cast chain-id`. Everything through `devbox run --`, and that is
load-bearing here, not habit: #199 measured the host `node` deflating `index.html` to a different byte
count than devbox's, which would propose a full-gas re-upload of an identical document.

0. **Gates, per chain, read and recorded.** `cast nonce $APP` → **4** (read 2026-11-17 ~08:40 CST on
   both chains; the pointers below depend on it, and the tool's default is 1 — see step 3); the vault's
   `cast call $OWNER "nonce()(uint32)"` → **6** on both (same read; the digests depend on it);
   `isOwner($ENGINEER)` → `true`, `threshold()` → 2; `cast call $APP "chunkCount()(uint256)"` → 2 and
   `"locked()(bool)"` → `false`. `node tools/chain-doc.mjs --app $APP --rpc "$RPC" --chain $CHAIN_ID`
   for the document now on chain: payload 45,358 bytes, inflated 142,949 (Sepolia) / 142,947 (Base
   Sepolia) on that read. Any other `cast nonce $APP` is a stop: someone has written to `App`.

1. **The bundle, per chain, and its hashes.** `make dapp-nodev CHAIN_ID=$CHAIN_ID`, then `sha256sum
   app/dist/index.html app/dist/widget.js` and `wc -c` of both, and `grep -c alpha app/dist/widget.js` →
   0, `grep -o '__FEATURED_SALT__\|0x357836ff[0-9a-f]*' app/dist/index.html | head -1` → the DNZN salt
   (`mk/15-seed.mk` picks it for any `CHAIN_ID` other than 31337). Record the four figures and the
   generating commit (`git rev-parse HEAD`). The widget is under 10,240 bytes (8,132 at #203's head).

2. **The calldata tool takes the nonce from the chain, not from a default.** `tools/step4-calldata.mjs`
   reads `--app-nonce` with a default of `1`, which was right once and is wrong for every upload after the
   first. Change it to **require** the flag or read `cast nonce $APP --rpc-url` itself when `--rpc` is
   given, and exit non-zero with the instruction otherwise; keep the `--app-nonce` override for the
   anvil rehearsal. Add a unit test in `test/` that the tool refuses with neither (~~the existing test
   pattern for a tool is `test/abi.test.mjs`, which runs `tools/` scripts as child processes~~ —
   corrected 2026-11-17: `abi.test.mjs` asserts against fixtures and spawns nothing; no test in `test/`
   spawned a child process before this task, so the test introduces the pattern). The pointers for this upload are `App`'s CREATEs at
   nonces **4, 5, 6** (two document chunks, one widget chunk, if the payload still splits in two under
   `MAX_CHUNK = 24_000`; if it splits in three, the tool says so and the proposal count changes —
   stop and report, do not improvise a fourth proposal).

3. **Regenerate, into a per-upload home.** The t08 calldata under
   `docs/milestones/m04/tasks/m04-t08/calldata/` is that task's record and stays. Routine uploads commit
   to **`calldata/<CHAIN_ID>/`** at the repository root, overwritten per upload, with the generating
   commit in the Record (git history is the archive). `node tools/step4-calldata.mjs --chain $CHAIN_ID
   --rpc "$RPC" --out calldata` per chain; `git status --porcelain` is non-empty exactly for the new files;
   `wc -c calldata/$CHAIN_ID/*.hex` with every file under 65,536 characters (#188's cap, enforced by the
   coordination service); files 1–2's bytes concatenate to the payload and file 3's to the widget (`cmp`
   exit 0); `cast decode-calldata` of `batch345.hex` gives three `$APP` targets, three `0` values and
   files 3, 4, 5's bytes. Rejected: a dated directory per upload (bloats the tree; git has the dates).

4. **Gas, from a fork, not from the live node.** [#189](https://github.com/dnznlabs/rake/issues/189):
   `cast estimate` of calls 4 and 5 against the live chain is red by construction until calls 1–3 land.
   Estimate all five on an `anvil --fork-url "$RPC"` after impersonating `$OWNER` and sending 1–3 there
   (t08's HANDOFF § The fork rehearsal is the procedure), record the five figures and the block gas
   limit, and set the `executeQueued` gas limits from them as t08 did (37,591,595 was the largest call on
   Sepolia; 50,000,000 sent had room).

5. **Propose three per chain, one signature each (RUNBOOK 4a).** Targets `$APP`, `$APP`, `$OWNER`;
   nonces *N*, *N* + 1, *N* + 2 with *N* the live `nonce()` re-read at proposal time; digests from
   `getTransactionHash` on the vault, equal to what the dapp shows; include `p_threshold` in the POST
   ([#196](https://github.com/dnznlabs/rake/issues/196)). `record:` the three nonces, digests and the
   generating commit. Then stop and hand to the Product Owner with the 4b checklist (three items per
   proposal: target and value, data equals the committed file by `sha256sum`, nonce live and digest
   equal) — in `HANDOFF.md` § For Denizen, as t08 wrote it.

6. **4c and 4d.** After the Product Owner's signatures and the 3,600 s: `executeQueued` 1 → 2 → batch
   per chain, in order (the pointer predictions depend on it; RUNBOOK § Step 4 "The one silent
   misorder" is the repair if not). Then `node tools/chain-doc.mjs` per chain: `inflated sha256` =
   step 1's `index.html` hash, `widget sha256` = step 1's `widget.js` hash, byte counts both ways;
   `cast nonce $APP` → 7; `chunks(0|1)` and `widgetChunks(0)` equal the predicted pointers. `cast
   receipt` for the six transactions: `gasUsed`, `effectiveGasPrice`, and on Base Sepolia the `l1Fee`
   from raw `eth_getTransactionReceipt` (t08 § What it cost); reconcile the engineer's balance delta to
   the wei on both chains.

7. **`RUNBOOK.md`: the two entry points.** A new section **§ Which run is this** directly after § Not
   in this runbook, before § 0, with one table:

   | Run | When | Sections |
   |:--|:--|:--|
   | **A — the contracts** | first deploy to a chain, or any change under `src/` (new bytes are new addresses, decision 37's mining repeats, the old addresses stay live and are marked superseded in README § Contracts) | § 0, § 1, steps 1–7, § Record |
   | **B — the document** | `app/` changed and `src/` did not: the page, the widget, the featured salt | § 0's Run-B variables, Step 4, § Uploads |

   Under Run A one sentence: which of steps 2 and 3 run is decided by which contracts' bytes changed —
   factory and `App` addresses depend on their own init code independently. Then make Step 4
   **self-contained for Run B**: its own variable list (`RPC`, `CHAIN_ID`, `OWNER`, `ENGINEER`, `APP`,
   and `APP` read from README § Contracts rather than predicted); the `cast nonce $APP` precondition
   reworded from "must be 1" to "must equal the `--app-nonce` the calldata was generated with, and the
   Record names it"; the regenerate commands with `--rpc` and `--out calldata`; the fork-estimate step;
   the `p_threshold` note; and the #199 rule as a sentence — the regeneration criterion is `chain-doc`'s
   `inflated sha256` against the build, under the pinned toolchain, not `sha256sum` of calldata on an
   arbitrary `node`. A new **§ Uploads** after § Record: one table, one row per chain per upload — date ·
   commit · `inflated sha256` · `widget sha256` · pointers · vault nonces · six tx hashes · gas across the
   three — with this upload as rows 1 and 2. Step 4's prose that narrates the first upload's history
   (the one-`batch` route, the cap) stays where it is; Run B links to it rather than repeating it.

8. **`HANDOFF.md`**, per the template: every figure above beside its criterion, § For Denizen with the
   4b checklists, § Discoveries for anything the second upload taught that the first did not, and the
   wall-clock and wei cost of a routine upload as #193 asked for, labelled as one measurement.

## Acceptance criteria

Every figure is read at the review head, not quoted from here.

- **M04 criterion 3's chain half, both chains, for the new bundle:** `node tools/chain-doc.mjs --app $APP
  --rpc "$RPC" --chain $CHAIN_ID` `inflated sha256` = `sha256sum app/dist/index.html` of that chain's
  `make dapp-nodev CHAIN_ID=$CHAIN_ID` at the PR head, `widget sha256` = `sha256sum app/dist/widget.js`,
  byte counts both ways; `cast nonce $APP` → 7; the chunk pointers equal the committed predictions.
- **The bundle is #203's:** built `widget.js` contains `alpha` 0 times (`grep -c`); built `index.html`
  carries the DNZN salt `0x357836ff…0001` as `featuredSalt` and no `0xf39f…2266` salt (`grep -c` 0).
- **Regeneration is reproducible under the pin** (amended 2026-11-17, before 4c, on the engineer's
  finding: once the tool reads the live nonce, the live-read command regenerates pointers at 7, 8, 9 after
  execution, so the as-written criterion could not hold at a post-execution head). Two measurements, both
  inside `devbox run --`, on each chain: **(a) pre-execution, at App nonce 4,** `make dapp-nodev
  CHAIN_ID=$CHAIN_ID && node tools/step4-calldata.mjs --chain $CHAIN_ID --rpc "$RPC" --out calldata`
  leaves `git status --porcelain` empty — recorded in `HANDOFF.md` with the nonce it read; **(b) at any
  head, including the review head after 4c,** the same with `--app-nonce 4` in place of `--rpc` leaves
  `git status --porcelain` empty, and `4` is the nonce RUNBOOK § Uploads names for this upload. Every
  `calldata/$CHAIN_ID/*.hex` is under 65,536 characters by `wc -c`; `ls calldata/*/batch.hex` prints
  nothing. ~~on each chain, `make dapp-nodev CHAIN_ID=$CHAIN_ID && node tools/step4-calldata.mjs --chain
  $CHAIN_ID --rpc "$RPC" --out calldata` inside `devbox run --` leaves `git status --porcelain` empty at
  the PR head~~
- **The tool refuses a defaulted nonce:** `node tools/step4-calldata.mjs --chain 11155111 --out /tmp/x`
  with neither `--rpc` nor `--app-nonce` exits non-zero and names the flag; the test in `test/` reds
  when the default is restored (plant it, quote the red, revert).
- **Six transactions recorded and reconciled:** the three submit and three `executeQueued` hashes per
  chain in `HANDOFF.md` and in RUNBOOK § Uploads, `gasUsed` and `effectiveGasPrice` per receipt, the
  Base Sepolia `l1Fee`s, and the engineer's balance delta equal to the sum on each chain.
- **The runbook has two entry points:** `RUNBOOK.md` has a § Which run is this section before § 0 with
  the two-row table; Step 4 names its own variables and its `cast nonce $APP` precondition no longer
  says "must be 1" (`grep -n "must be 1" RUNBOOK.md` prints nothing); § Uploads exists with two rows.
  **The reviewer's test:** following Run B from the runbook alone, with `HANDOFF.md` and this file
  closed, every command in Step 4 is runnable with the variables Step 4 itself lists — the architect
  does this walk at review and names any command that needed another document.
- **Carried issues this PR closes, each with the evidence in its closing comment:** #193 (the
  re-upload), #199 (the #199 rule is in Run B and the pin is what the regeneration criterion ran under),
  #196 (the `p_threshold` note is in 4a), #189 (the fork-estimate step is in Run B). It does not close
  #188 or #197.
- `forge test`, `node --test test/*.test.mjs`, `make fmt`, `forge lint` and CI pass at the head;
  `src/` diff empty (`git diff c0ea940 -- src/` prints nothing).

## Out of scope

- Anything under `src/`. `MAX_CHUNK` and the chunk count are #188's and a later milestone's.
- `make setup` / the libs guard (#197).
- The gateway read of the new document (t04, criterion 3's gateway half) and the UAT (t05). This task
  proves the chain serves the bytes; t04 proves w3link does.
- #209, the testnet `setDescription` to FUND: Denizen's action from his EOA, independent of this
  upload, since the page reads `description()` live.
- The "fee distribution" wording in `mk/15-seed.mk` and `AGENTS.md` comments (decision 51 says FUND):
  any later docs PR; not this one, which should touch `RUNBOOK.md`, the tool, its test, `calldata/` and
  the task's own files.
- A `make verify` target for Step 5 (#207): M05's.
- Hiding or restyling the featured panel: decision 49 rules it stays.

## Open questions

None. The decisions this plan needed are 44, 47, 48, 49, 51 and the 2026-11-17 chat ruling quoted at
the top; the one choice the plan made itself — `calldata/<CHAIN_ID>/` at the root, per-upload overwrite
— is reversible and named in step 3 with the alternative rejected.

## Context

- [#193](https://github.com/dnznlabs/rake/issues/193) (the task's origin), [#199](https://github.com/dnznlabs/rake/issues/199),
  [#196](https://github.com/dnznlabs/rake/issues/196), [#189](https://github.com/dnznlabs/rake/issues/189),
  [#188](https://github.com/dnznlabs/rake/issues/188).
- [m04-t08 TASK.md](../m04-t08/TASK.md) and [HANDOFF.md](../m04-t08/HANDOFF.md): the first upload, the
  fork rehearsal (§ The fork rehearsal), the cost table (§ What it cost), the 4b checklist (§ For Denizen).
- `RUNBOOK.md` § Step 4 (4a–4d, § The five calls, § Gas) as it stands at `c0ea940`.
- ROADMAP decisions 44 (Step 4 is a vault action), 47 (three proposals), 48, 49, 51.
- [#203](https://github.com/dnznlabs/rake/pull/203): the UI batch this upload ships.
- handbook `docs/contract-verification.md`: not exercised here (no new contract), cited by Run A.
