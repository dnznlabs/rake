# m03-t06 — handoff

PR: #131 · Branch: `m03/t06-runbook` · 2026-11-01

`RUNBOOK.md` is at the repo root: one ordered list parameterised by network, modelled on
The sibling project's, that places `DistributionFactory`, its implementation and `App` at the same
addresses on every chain of criterion 7 and creates DNZN's distribution at an address predicted
before any transaction is sent. Both deploy scripts now take a salt, so Foundry routes the salted
`new` through Arachnid's keyless proxy (decision 33) and the addresses follow the deployer, the salt
and the init code rather than the sender's nonce; `DeployApp` requires `OWNER` with no default, which
is `SECURITY.md` F3; and `DEPLOYED` in `mk/10-forge.mk` accepts `CREATE2`, without which
`make addresses` and the `deploy::` guard would both go blind. Criterion 6 was rehearsed on two
anvils at once and every address matched the offline prediction and matched across the two chains.
**Both of this task's open questions have since been ruled** (§ Decisions 4 and 5): the #127
precondition now reads "no alias through which value can move", so OP Mainnet passes with a
`transfer`-must-revert assertion added per chain; and the one-line `CREATE2` fix in `app/build.mjs`
was ruled into scope, which unblocked runbook step 4, the `make serve` criterion and the criterion-8
sequence — all three now rehearsed rather than deferred. **Nothing in this task waits on a
decision.**

## Acceptance criteria

Measured at `d75b664` on 2026-11-01 through the devbox-pinned toolchain (forge `1.7.1-dev`, node
`v24.12.0`, jq `1.8.2`). Re-run at this head after the review, not quoted from the first round.

| AC | Result | Evidence |
|:---|:-------|:---------|
| M03 criterion 6 — two fresh anvils from the runbook alone: factory at the offline-predicted address, same on both; `implementation()` same; `predict($DNZN_SALT)` same and equal to the landed `DISTRO`; `App` by the same list; `grep -c 'lock()'` only in § Not in this runbook | **pass** | `--chain-id 31337` (port 8555) and `31338` (8556). `FACTORY` predicted offline **before any transaction** = `0x550f3bE16E83388a73BFE09B05D6c4fED2Dcb66a`, landed identical on both. `IMPL` `0xB083aE8539E71D74679BFcFb0A0D9F45549359a9` on both. `APP` predicted and landed `0x9fFEe2c1C0c79C81DFCc4E9e3A1007407D39E2A1` on both. `predict($DNZN_SALT)` `0x55410930023a7019AF4960f5Dbb1891DB9A53472` on both, **equal to the `DISTRO` the create landed** (45-byte PUSH0 clone, `owner()` `0xf39F…2266`, `delay()` 3600). Both deploys recorded `CREATE2` with `to` the proxy; both broadcast logs read `commit: d75b664` — re-run on the final commit as the review asked. `grep -c 'lock()' RUNBOOK.md` → **3**, at lines 24, 29 and 33, all inside § Not in this runbook (lines 22–35). Full transcript in `RUNBOOK.md` § Rehearsed on anvil. |
| M03 criterion 7 — the four greps non-empty, eight chains with IDs | **pass** | `grep -ci 'unrecoverable'` → **1**; `grep -c 'cast code\|eth_getCode'` → **7**; `grep -c 'PUSH0\|cancun'` → **12**; § 1's table lists **8** rows with their chain IDs. The proxy was re-read on all eight the same day: 69 bytes and keccak `0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989` on every one, with each chain's `cast chain-id` confirmed against the table — reproducing the architect's 2026-10-30 figures exactly. |
| `grep -c 'DEFAULT_SENDER\|envAddress("OWNER")' scripts/forge/DeployApp.s.sol` ≥ 1 and `grep -c 'accepted → m03-t06' SECURITY.md` → 1 | **pass**, the second one satisfied by `main` | DeployApp grep → **2**. SECURITY.md grep → **1**. **`SECURITY.md` is byte-identical to `main`** on this branch (`git diff origin/main -- SECURITY.md` empty) — t05's close-out flipped the F3 row itself in #128, so the one-line change the plan assigned here was already done. See § Deviations 1. |
| `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` prints nothing; `forge test` passes; `forge snapshot --check` exit 0; `forge fmt --check` and `forge lint` silent; `node --test` passes | **pass**, with one figure corrected | Diff is **empty**. `forge build --force` → 39 files, **0** `warning[` and **0** `Warning (` lines. `forge test` → **72 passed, 0 failed**; `forge snapshot --check` → **exit 0** with all 72 run; `.gas-snapshot` **72 rows** (`grep -c ''`). `forge fmt --check` exit 0 silent, `forge lint` exit 0 silent, both run **after** the counts. `node --test test/*.test.mjs` → **62 pass, 0 fail**. The plan says "63 passed" — that is a pre-t05 figure; see § Deviations 2. |
| `make serve` on a fresh anvil deploys and `make addresses` lists `DistributionFactory` and `App` with code | **pass** | `make serve` (with `PC_DISABLE_TUI=true`) brought up anvil on 8545 and ran `make deploy` to completion: four broadcast scripts — `Deploy`, `DeployApp`, `Seed`, `Chunks` — each reporting `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`, then `dapp-nodev` and `dapp`, with **no** `nothing to substitute` error and no `make` error anywhere in the run. `make addresses` lists `DistributionFactory 0x550f3bE1…Dcb66a` and `App 0x9fFEe2c1…D39E2A1`, neither carrying the `no code … stale, redeploy` note; measured directly, **1,320** and **7,118** bytes of code. The dapp then served at `http://localhost:3000`. This row failed in the first round; what changed is `app/build.mjs:39` (§ Deviations 4). |
| PR description has an `Audit scope touched` heading naming both scripts, and the audit-scope section names them with both paths | **pass** | Both in the PR body and in § For the third review (t07) below. The section was titled "For t05" in the first round; t05 has closed, so it is retitled and now states the ordering it depends on — this PR merges before t07 freezes. |
| #22 and #23 close on merge, each by a sentence a reviewer can point at | **pass** | #22: `RUNBOOK.md` step 1g (`cast code $FACTORY` / `$APP` must print `0x`, with what it means if they do not) and step 6 (`cast code $DISTRO` before the `create`) — plus the rewritten `deploy::` comment in `mk/10-forge.mk`, which now gives the collision as the reason the guard exists. #23: step 6's closing paragraph, carrying the word **unrecoverable**, the once-per-chain-while-the-key-is-live rule, and the backup requirement before step 6 runs anywhere. |
| `git status --porcelain` empty after the criterion-8 sequence | **pass** | The full sequence ran in the plan's order: `forge build --force` (**39 files**, 0 `warning[`, 0 `Warning (`), `forge test` (**72 passed, 0 failed**), `forge snapshot` — the **writing** form, which left `.gas-snapshot` byte-identical (`git diff -- .gas-snapshot` empty, **72** rows) — `make deploy` on the 8545 anvil via `make serve`, and `make chain-doc` (**exit 0**, `inflated sha256 6b48db1a…0dcafe71063`). `node --test` **62 pass, 0 fail**; `forge lint` and `forge fmt --check` silent, both **last**. `git status --porcelain` is then **empty**. `make chain-doc` needed a one-line fix of its own — § Deviations 6. `broadcast/`, `cache/`, `app/dist/` and `app/chain/` are gitignored; nothing from the rehearsal is committed. |

## For the third review (t07) — the audit-scope re-check (plan step 2)

Two of the four files in `audits/SCOPE` (decision 29) changed on this branch, **after** t04's legs
read them at `ede55c3` and after t05's review read `b0fb4e3`:

- `scripts/forge/Deploy.s.sol` — takes `FACTORY_SALT` (`vm.envOr`, zero default); `new
  DistributionFactory{salt: salt}()`; logs the salt beside the two addresses.
- `scripts/forge/DeployApp.s.sol` — `OWNER` is now `vm.envAddress` with **no default** (F3);
  takes `APP_SALT`; `new App{salt: salt}(owner, ver)`; logs the salt and the owner.

**No leg has read either file in its salted form.** t04's two legs read them at `ede55c3` and t05's
review read `b0fb4e3`, both before this branch existed, and this section was originally addressed to
a t05 single-leg re-check that t05's close-out made moot. The third review is m03-t07's
([#132](https://github.com/dnznlabs/rake/issues/132)) and it reads the whole of `audits/SCOPE` **from
`main`**, which fixes the ordering:

- **This PR merges before t07 freezes its code (its step 5).** t07's blinded tree is built at its
  frozen head, so the salted scripts are only in the tree the third review reads if they are on
  `main` first. The architect has told t07 to hold its freeze for this.
- **t07's known answer carries the salted placement**, so the third review is graded knowing the
  scripts route through the keyless proxy rather than meeting it as an unexplained diff.
- Neither change touches `src/`, so criterion 4's letter holds: `git diff --stat b0fb4e3 HEAD --
  src/` is empty and `src/Distribution.sol` is byte-identical to the reviewed commit. The one
  thing moving under `src/` before the third review is t07's own `App.lock` change.

`SECURITY.md` § What the review did not cover names the salted placement at close-out.

## Deviations from the plan

1. **`SECURITY.md` was not changed — t05's close-out had already done it.** The plan's step 1 says to
   change the F3 row from `accepted → m03-t05` to `accepted → m03-t06`. #128 merged at 18:06 UTC
   today and makes exactly that change itself, with fuller text. I had made the one-line edit before
   #128 landed; on rebasing onto the new `main` it conflicted, and I resolved it by taking `main`'s
   version wholesale, so `SECURITY.md` on this branch is byte-identical to `main`. The AC's
   `grep -c 'accepted → m03-t06' SECURITY.md` → 1 still passes, satisfied by t05's line.
2. **The plan's test count is pre-t05.** Step 1's check and the AC both say `forge test` → "63
   passed". On `main` it is **72** — t05 added nine tests. Nothing was done about it; the gates were
   run against the real count, and `.gas-snapshot` has 72 rows to match.
3. **Two additions were implemented from PR #128 before it merged, and have since been reconciled
   against the merged text at `67146a7`** — the wording is **identical, byte for byte**. The two are
   the #115 ruling under open question 2 (decision 37 — nothing changes here, the rehearsal still
   runs zero salts, mining is M04's) and the new open question 3 / #127 precondition. Measured, not
   assumed: `git diff 4ddab68 67146a7 -- docs/milestones/m03/tasks/m03-t06/TASK.md` is **empty**, so
   the merge took #128's branch text unchanged and what I built against *is* the merged text.
   `TASK.md` on `main` is **338 lines** (325 before #128). It has not moved since either —
   `git diff 67146a7 ae0c30a -- <the same path>` is also empty, so #130 (decision 38, t07's plan)
   left this task's authority untouched. Nothing in the implementation had to follow the merged
   text anywhere. Recorded because the distinction between "built from a pre-merge PR" and
   "reconciled against the merged text" is the whole value of the note, not because the text moved.
4. **`app/build.mjs:39` was changed, and `app/` was ruled into scope for that one line.** Not scope
   creep taken on my own judgement: § Out of scope said "the dapp … none needs a change; if one turns
   out to, say so in the handoff and stop," which is what the first round did. The architect **ruled
   option (a) on this PR** — the filter is the same defect, with the same cause and the same remedy,
   as the `DEPLOYED` change plan step 1 orders twenty lines earlier, it sits in a build script rather
   than in the dapp's behaviour, and `app/` is not in `audits/SCOPE` so no review surface moves. The
   change accepts `CREATE2` beside `CREATE`; nothing else in `app/` is touched. `TASK.md` is amended
   at close-out, as t05's step 7 was. This supersedes the first round's temporary measurement, where
   I applied the same line, measured it, and reverted it by path rather than keep it.
5. **The plan's step 4 and criterion 8 are now rehearsed, which the first round could not do.** They
   were blocked by the same filter; with it fixed, step 4 ran on anvil and the criterion-8 sequence
   completed. See the AC table and `RUNBOOK.md` § Rehearsed on anvil for the figures.
6. **`mk/30-onchain.mk`'s `chain-doc` recipe now passes `--app`, because the same defect has a
   *third* instance and criterion 8 hit it.** With `app/build.mjs` fixed, `make chain-doc` still
   failed: it passes no `--app`, so `tools/chain-doc.mjs` fell back to its own lookup at `:52`,
   `t.transactionType === 'CREATE' && t.contractName === name`, and threw `App not found in
   broadcast/DeployApp.s.sol/31337/run-latest.json`. Criterion 8's sequence names `make chain-doc`,
   so it could not complete. **I enumerated the whole tree rather than fix and move on:**
   `grep -rn transactionType` over `*.mjs`, `*.js`, `*.mk` outside `lib/`, `out/`, `cache/`,
   `broadcast/` and `node_modules/` returns **exactly three** readers — `mk/10-forge.mk:17` and
   `app/build.mjs:41` (both now accept `CREATE2`) and `tools/chain-doc.mjs:52` (this one). There is
   no fourth.
   **Fixed in `mk/`, not in `tools/`, and deliberately so.** `chunks` in the same file already
   resolves `App` through `APP_ADDR`, which goes through `DEPLOYED` — the variable plan step 1
   ordered taught to accept both creation types. Passing `--app $(APP_ADDR)` makes `chain-doc`
   consistent with its neighbour and keeps **one** place in the repo deciding what counts as a
   creation, where patching `tools/chain-doc.mjs` would have added a third copy of the filter to
   maintain. `tools/chain-doc.mjs` is untouched, and `RUNBOOK.md` step 4 was never affected because
   it passes `--app` explicitly.
   **Why I did not stop on this one.** The rule I stopped under in round one is § Out of scope's
   "`Seed.s.sol`, `Fixtures.s.sol`, the dapp, the widget, `procs/`" list — and `mk/` is not on it.
   `mk/10-forge.mk` is a file this task is *ordered* to change, `audits/SCOPE` excludes `mk/`
   explicitly ("build tooling, no authority on chain" — the same words it uses for `tools/` and
   `app/build.mjs`), so no review surface moves. **Flagging it rather than burying it:** if the
   architect would rather this were a `tools/` change, a `--app`-less `chain-doc`, or a separate
   task, it is one line to move and I will move it.

## Decisions

1. **The `deploy::` guard's comment gives the collision as its reason, not the moving address.** The
   plan asked for the rewrite and this is the wording: a second deploy is refused because a CREATE2
   collision through the proxy burns the whole forwarded gas before anything reverts (#22), not
   because the factory's address would move — through a deterministic deployer it would not.
2. **§ 1's proxy keccak is written once in full and abbreviated in the table.** All eight rows carry
   the same hash; repeating 66 characters eight times invites a transcription error and hides that
   they are identical. The table says it is a reading to re-take in step 1, not a value to trust.
3. **The #127 check is recorded with a positive control.** A per-chain "none found" row is
   indistinguishable from a check that never ran, so the same commands were run against Celo
   mainnet, where they fire on `GoldToken`. The runbook says so, so a future reader can tell a miss
   from a no-op. The control is kept now that the precondition's wording has changed.
4. **#127 ruled (c): the precondition is "no alias through which value can move", and OP Mainnet
   passes.** Ruled by the architect on this PR on 2026-11-01, recorded on
   [#127](https://github.com/dnznlabs/rake/issues/127), Denizen able to override there. I had
   recommended (c) and did not fill it myself. What changed in `RUNBOOK.md` § 1: the requirement is
   reworded, OP Mainnet's row says **passes** with its measurement as the source instead of
   "disposition pending", and a **`transfer`-must-revert assertion** is added to the per-chain
   command block — run against any alias that has code and whose `balanceOf` matched, and **re-run
   before each deploy**, not once, because it is the only thing standing between "cannot move value"
   and a future upgrade that re-enables it. Rejected: (a), retiring a mainnet against a mechanism
   unreachable there. `SECURITY.md` F12 is updated at close-out, not here.
   **Re-measured for this round** at block 158,979,851: `balanceOf(0x4200…0016)` and `cast balance`
   both `92688343257757826764769`, and `transfer(…, 1)` reverts `LegacyERC20ETH: transfer is
   disabled`. **One figure reconciled with the reviewer's independent run:** the reviewer's 3,672
   bytes against my 3,671. `cast code` returns **7,344 characters including the `0x`**, so halving
   the string gives 3,672 and the code is **3,671 bytes**. The reviewer has confirmed 3,671 and
   attributes their 3,672 to `wc -c` counting the trailing newline. Measured, so the note is exact:
   `cast code … | wc -c` is **7,345**, `${#C}` on the captured string is **7,344**, and the hex
   digits number **7,342** — so `7342 / 2 = 3671` is the only route that drops both the `0x` and the
   newline. Every near miss lands on the same wrong answer: `7344 / 2`, `7345 / 2` and
   `(7345 − 1) / 2` are all **3,672** under integer division, which is why the discrepancy was one
   byte rather than two and why it is worth writing down instead of splitting. The runbook says where
   the other figure comes from so the next reader does not re-open it.
5. **Open question 2 ruled (a): make the `app/build.mjs` one-liner here.** See § Deviations 4 for
   what changed and why it is not scope creep.

## Discoveries

1. **`app/build.mjs:39` has the same CREATE-only broadcast filter as `DEPLOYED` had** — the defect
   the plan caught in one place exists in two. § Open questions 2.
2. **OP Mainnet carries a live read-side native-balance ERC-20.** `LegacyERC20ETH` at
   `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000`, 3,671 bytes, `balanceOf` equal to the native
   balance. Deprecated since Bedrock with every mutator reverting. § Open questions 1.
3. **`cast send` takes `--from` where `forge script` takes `--sender`.** § 0's `SIGNER` is a
   `forge script` spelling; pasting it into the `create` fails with `unexpected argument '--sender'
   found`. Step 6 writes its flags out rather than reusing the variable.
4. **`BadTable()` (`0x40da0647`) covers two rules with one error.** The `bps` must sum to 10,000
   **and** the rows must be strictly ascending by `account`. A correct table in the wrong order is
   rejected and the error does not say which rule broke. Cost me one failed `create` in the
   rehearsal; now written into step 6.
5. **A worktree needs no `core.hooksPath` override.** Plain `git commit` in
   a second worktree of this repository ran `pre-commit` and `post-commit` normally — git resolves hooks
   from the common git dir. The hazard is only an explicitly-set *relative* path, which resolves
   against the worktree's `.git` **file**.
6. **`procs/`, `Seed.s.sol` and `Fixtures.s.sol` needed no change**, as the plan expected. `Seed.s.sol`
   ran clean against the salted factory on anvil.
7. **The architect's `cdfaa0a` factory address moved, exactly as the plan predicted.** The spike's
   `0x2cF9C0d9…cb7a18` is now `0x550f3bE1…Dcb66a` at `d75b664`; the init-code hash is
   `0xb28d5fcc…f7c35904`. Nothing in the runbook quotes either — step 1f computes them.
8. **`run-latest.json` pairs transaction hashes with the wrong transaction objects, so a gas figure
   attributed to a function by reading the broadcast log can be wrong.** This cost me a wrong table
   before I caught it, and it is the reason step 4's gas figures in `RUNBOOK.md` are read from the
   chain. What happened: two runs of the *same* five transactions, byte-identical calldata and
   identical nonces, produced the identical set of five hashes but **different hash→function
   pairings** in `.transactions[]`. Both cannot be right. The chain settles it — `cast tx
   0x9bd414a8…` returns **nonce 6, selector `0xa1b43c92` (`addWidgetChunk`)**, while that run's log
   filed the same hash as **nonce 5, `setChunks`, selector `0x10b744bf`**. So the log's hash, nonce,
   `function` and `input` fields are not reliably describing one transaction; the array order is
   forge's own and is not stable between runs.
   **What made it detectable was physics, not the log.** The mispaired table had `setChunks` costing
   1,819,075 gas to store two pointers and `addWidgetChunk` costing 35,819 to write 7,920 bytes —
   impossible, since code deposit alone is 200 gas/byte (~1.58M). Had the two figures been closer I
   would have recorded the wrong attribution and nobody could have told from the document. The
   corrected table cross-checks three ways: the 200 gas/byte floor, the pointer sizes on chain
   (24,001 + 16,242 = 40,243 = the 40,241-byte payload + SSTORE2's one leading byte per pointer), and
   the total, 10,820,875, which is invariant under the mispairing because it is a sum.
   **This repo already half-knew it:** `app/build.mjs:36` carries "Matched by hash rather than by
   index: the receipt order is forge's, not this file's contract." That comment is about `.receipts[]`
   and is why `build.mjs` joins on hash. The stronger finding is that joining on hash is **also**
   not enough, because `.transactions[]` itself mispairs. For gas attribution, read the chain.

## For close-out

1. **Every `App` address rehearsed here is superseded by m03-t07, by design.** Decision 38 (ruled on
   [#126](https://github.com/dnznlabs/rake/issues/126) on 2026-11-01, scoped in #130, task
   [#132](https://github.com/dnznlabs/rake/issues/132)) puts a first-code-byte `0x00` check into
   `App.lock`, which **changes `App`'s bytecode and therefore its init-code hash and its CREATE2
   address**. So `APP = 0x9fFEe2c1C0c79C81DFCc4E9e3A1007407D39E2A1` in the criterion-6 row above is
   a reading taken at `d75b664` against `App` as it stood at `b0fb4e3`, **not a value to carry
   forward**. Criterion 6 re-runs at close-out on the final `main` per `TASK.md:16`, and that re-run
   is the authoritative set. Nothing in `RUNBOOK.md` quotes an `App` address — step 1f computes it,
   which is why t07 costs the runbook nothing. **An `App` address that differs from this handoff's
   after t07 merges is the expected outcome, not a defect**, and no address here was pinned or
   future-proofed against it. The factory and implementation addresses are unaffected: t07's change
   is confined to `src/App.sol` and `src/Distribution.sol` stays byte-identical to `b0fb4e3`.

2. **Merge order against m03-t07: measured, and there is no file overlap.** The dependency was
   flagged to me as `SECURITY.md` (F3's row against t07's F11 row and § Prior reviews) and possibly
   `.gas-snapshot`. **Neither applies to this branch.** `git diff --name-only origin/main...HEAD`
   returns **eight** paths — `README.md`, `RUNBOOK.md`, this handoff, `app/build.mjs`,
   `mk/10-forge.mk`, `mk/30-onchain.mk`, `scripts/forge/Deploy.s.sol`,
   `scripts/forge/DeployApp.s.sol` — and **none** of `SECURITY.md`, `.gas-snapshot` or anything under
   `src/` is among them. Re-enumerated after this round added `app/build.mjs` and `mk/30-onchain.mk`;
   the conclusion is unchanged. t05's close-out flipped F3's row itself in
   #128 (§ Deviations 1), so this task's one assigned `SECURITY.md` line was already on `main` before
   the branch existed and the branch holds zero `SECURITY.md` bytes. Consequences for whoever merges
   second:
   - **If t07 merges first**, this branch needs no `SECURITY.md` or `.gas-snapshot` resolution, and
     its gated criterion survives unchanged: `git diff --stat origin/main -- src/ test/*.t.sol
     .gas-snapshot` stays empty against the *new* `main` precisely because this branch touches none
     of those three paths, whatever t07 does to them. `forge snapshot --check` is re-run on the
     rebase as a matter of course, but no row of `.gas-snapshot` is this task's to own or update.
   - **If t06 merges first**, t07 rebases and re-runs `forge snapshot --check` for its own `App`
     bytecode change; nothing this task leaves behind conflicts with it.
   The only true coupling is item 1 — t07 moves the `App` address this task rehearsed — and that is
   a re-measurement at close-out, not a merge conflict.

3. **`main` moved to `ae0c30a` after this branch was last rebased, and I did not chase it.** The
   branch sits on `67146a7` as instructed; `ae0c30a` adds only #130's docs (t07's `TASK.md`,
   `ROADMAP.md`, `MILESTONE.md` and F11's `SECURITY.md` row), none of which this branch touches, and
   GitHub reports #131 `MERGEABLE`. Rebasing again is deliberately *not* free: the criterion-6
   evidence is pinned to a commit — both broadcast logs read `commit: d75b664` — so moving the branch
   invalidates that hash and the honest response is a third full two-anvil rehearsal, not an edited
   figure. Left to the reviewer to call, since criterion 6 re-runs at close-out regardless and t07
   will move the `App` address anyway. Note the rehearsal *was* re-run on the final commit for this
   round, as the review asked — it is `main` moving underneath, not the branch, that this item is
   about.

4. **Three `TASK.md` amendments belong to close-out, as t05's step 7 was.** None is blocking and none
   is edited here, since `TASK.md` on `main` is this task's only authority:
   - **Open question 2's ruling** — `app/` in scope for the one `app/build.mjs` line (§ Deviations 4).
   - **The test count** — step 1's check and the AC say `forge test` → "63 passed"; it is **72** and
     has been since t05 added nine tests. § Deviations 2.
   - **Open question 1's ruling and the reworded precondition** — "no alias through which value can
     move" (§ Decisions 4), which is also `SECURITY.md` F12's row at close-out.
   If the architect would rather the `chain-doc` fix of § Deviations 6 were recorded there too, that
   is a fourth line.

## Open questions

**None.** Both of this task's open questions were ruled by the architect on 2026-11-01 on this PR,
and neither was filled by me: #127 / OP Mainnet ruled **(c)** and `app/build.mjs:39` ruled **(a)**.
The rulings and what each changed are § Decisions 4 and 5; the one `app/` line is § Deviations 4.
Nothing in this task now waits on a decision.
