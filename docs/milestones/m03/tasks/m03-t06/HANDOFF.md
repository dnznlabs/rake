# m03-t06 — handoff

PR: #130 · Branch: `m03/t06-runbook` · 2026-11-01

`RUNBOOK.md` is at the repo root: one ordered list parameterised by network, modelled on
`state-collection`'s, that places `DistributionFactory`, its implementation and `App` at the same
addresses on every chain of criterion 7 and creates DNZN's distribution at an address predicted
before any transaction is sent. Both deploy scripts now take a salt, so Foundry routes the salted
`new` through Arachnid's keyless proxy (decision 33) and the addresses follow the deployer, the salt
and the init code rather than the sender's nonce; `DeployApp` requires `OWNER` with no default, which
is `SECURITY.md` F3; and `DEPLOYED` in `mk/10-forge.mk` accepts `CREATE2`, without which
`make addresses` and the `deploy::` guard would both go blind. Criterion 6 was rehearsed on two
anvils at once and every address matched the offline prediction and matched across the two chains.
**Two things need a ruling before this is done**, both in § Open questions: the #127 precondition
hits on OP Mainnet in a way F12's mechanism does not actually reach, and step 1's change breaks the
dapp's address lookup through a defect in a file this task puts out of scope.

## Acceptance criteria

Measured at `5ed1ed2` on 2026-11-01 through `devbox run --` (forge `1.7.1-dev`, node `v24.12.0`,
jq `1.8.2`). Re-run, not quoted.

| AC | Result | Evidence |
|:---|:-------|:---------|
| M03 criterion 6 — two fresh anvils from the runbook alone: factory at the offline-predicted address, same on both; `implementation()` same; `predict($DNZN_SALT)` same and equal to the landed `DISTRO`; `App` by the same list; `grep -c 'lock()'` only in § Not in this runbook | **pass** | `--chain-id 31337` (port 8555) and `31338` (8556). `FACTORY` predicted offline **before any transaction** = `0x550f3bE16E83388a73BFE09B05D6c4fED2Dcb66a`, landed identical on both. `IMPL` `0xB083aE8539E71D74679BFcFb0A0D9F45549359a9` on both. `APP` predicted and landed `0x9fFEe2c1C0c79C81DFCc4E9e3A1007407D39E2A1` on both. `predict($DNZN_SALT)` `0x55410930023a7019AF4960f5Dbb1891DB9A53472` on both, **equal to the `DISTRO` the create landed** (45-byte PUSH0 clone, `owner()` `0xf39F…2266`, `delay()` 3600). Both deploys recorded `CREATE2` with `to` the proxy; both broadcast logs read `commit: 5ed1ed2`. `grep -c 'lock()' RUNBOOK.md` → **3**, at lines 24, 29 and 33, all inside § Not in this runbook (lines 22–35). Full transcript in `RUNBOOK.md` § Rehearsed on anvil. |
| M03 criterion 7 — the four greps non-empty, eight chains with IDs | **pass** | `grep -ci 'unrecoverable'` → **1**; `grep -c 'cast code\|eth_getCode'` → **7**; `grep -c 'PUSH0\|cancun'` → **12**; § 1's table lists **8** rows with their chain IDs. The proxy was re-read on all eight the same day: 69 bytes and keccak `0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989` on every one, with each chain's `cast chain-id` confirmed against the table — reproducing the architect's 2026-10-30 figures exactly. |
| `grep -c 'DEFAULT_SENDER\|envAddress("OWNER")' scripts/forge/DeployApp.s.sol` ≥ 1 and `grep -c 'accepted → m03-t06' SECURITY.md` → 1 | **pass**, the second one satisfied by `main` | DeployApp grep → **2**. SECURITY.md grep → **1**. **`SECURITY.md` is byte-identical to `main`** on this branch (`git diff origin/main -- SECURITY.md` empty) — t05's close-out flipped the F3 row itself in #128, so the one-line change the plan assigned here was already done. See § Deviations 1. |
| `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` prints nothing; `forge test` passes; `forge snapshot --check` exit 0; `forge fmt --check` and `forge lint` silent; `node --test` passes | **pass**, with one figure corrected | Diff is **empty**. `forge build --force` → 39 files, **0** `warning[` and **0** `Warning (` lines. `forge test` → **72 passed, 0 failed**; `forge snapshot --check` → **exit 0** with all 72 run; `.gas-snapshot` **72 rows** (`grep -c ''`). `forge fmt --check` exit 0 silent, `forge lint` exit 0 silent, both run **after** the counts. `node --test test/*.test.mjs` → **62 pass, 0 fail**. The plan says "63 passed" — that is a pre-t05 figure; see § Deviations 2. |
| `make serve` on a fresh anvil deploys and `make addresses` lists `DistributionFactory` and `App` with code | **fail — blocked, not by this branch's code** | `make addresses` **passes**: it lists `App 0x9fFEe2c1…D39E2A1` and `DistributionFactory 0x550f3bE1…Dcb66a`, which is the `CREATE2` filter working. `make deploy` **does not complete**: `Deploy`, `DeployApp` and `Seed` all succeed, then `mk/20-dapp.mk:7` fails with `build: nothing to substitute for __DISTRIBUTIONFACTORY__, __DISTRIBUTIONFACTORY_BLOCK__, __APP__`, exit 2. The cause is `app/build.mjs:39`, which carries the same CREATE-only filter this task fixed in `DEPLOYED`. `app/` is out of scope. **§ Open questions 2.** |
| PR description has an `Audit scope touched` heading naming both scripts, and § For t05 names them with both paths | **pass** | Both in the PR body and in § For t05 below. |
| #22 and #23 close on merge, each by a sentence a reviewer can point at | **pass** | #22: `RUNBOOK.md` step 1g (`cast code $FACTORY` / `$APP` must print `0x`, with what it means if they do not) and step 6 (`cast code $DISTRO` before the `create`) — plus the rewritten `deploy::` comment in `mk/10-forge.mk`, which now gives the collision as the reason the guard exists. #23: step 6's closing paragraph, carrying the word **unrecoverable**, the once-per-chain-while-the-key-is-live rule, and the backup requirement before step 6 runs anywhere. |
| `git status --porcelain` empty after the criterion-8 sequence | **not run — same block as above** | `git status --porcelain` is **empty** after `forge build --force`, `forge test`, `forge snapshot` and the full two-anvil rehearsal. The criterion-8 sequence itself (`make deploy`, `make chain-doc`) is unreachable for the reason in § Open questions 2. `broadcast/`, `cache/` and `app/dist/` are gitignored and nothing from the rehearsal is committed. |

## For t05 — the audit-scope re-check (plan step 2)

Two of the four files in `audits/SCOPE` (decision 29) changed on this branch, **after** t04's legs
read them at `ede55c3` and after t05's review read `b0fb4e3`:

- `scripts/forge/Deploy.s.sol` — takes `FACTORY_SALT` (`vm.envOr`, zero default); `new
  DistributionFactory{salt: salt}()`; logs the salt beside the two addresses.
- `scripts/forge/DeployApp.s.sol` — `OWNER` is now `vm.envAddress` with **no default** (F3);
  takes `APP_SALT`; `new App{salt: salt}(owner, ver)`; logs the salt and the owner.

Neither change touches `src/`, so criterion 4's letter holds (`git diff --stat origin/main -- src/
test/ .gas-snapshot` is empty). t05's single-leg re-check should read both with its own diff; if t05
retires on a clean review, the architect reads them at this PR's review and `SECURITY.md` § What the
review did not cover names the salted placement.

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
3. **Two additions were taken from PR #128 before it merged**, at the architect's direction relayed
   through my requester: the #115 ruling under open question 2 (decision 37 — nothing changes here,
   the rehearsal still runs zero salts, mining is M04's) and the new open question 3 / #127
   precondition. **Both have since merged**, and I re-read `TASK.md` from `main` to reconcile:
   `git diff` between the PR branch's `TASK.md` and `main`'s is **empty**, so the text I implemented
   against is the merged text and there is nothing to reconcile. Recorded here because the brief
   asked for it; the merged text wins and it does not differ.
4. **Runbook step 4 was not rehearsed, and step 7's end state is therefore partial on anvil.** Same
   cause as the AC row above — § Open questions 2. Steps 1, 2, 3, 6 and 7 ran start to finish on both
   chains; step 5 is named and not run by design.
5. **`app/build.mjs` was edited temporarily and reverted by path.** To establish that the blocker in
   § Open questions 2 is one line and not a design problem, I applied the parallel `CREATE2` fix,
   measured it (`make dapp-nodev` exit 0, `dapp: raw 127,578 B · gzip 40,241 B`, the factory address
   appearing once in `app/dist/index.html` and zero unsubstituted `__NAME__` tokens), then reverted
   with `git checkout -- app/build.mjs`. `git diff origin/main -- app/` is empty.

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
   from a no-op.

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
   `/home/openclaw/src/rake-m03-t06` ran `pre-commit` and `post-commit` normally — git resolves hooks
   from the common git dir. The hazard is only an explicitly-set *relative* path, which resolves
   against the worktree's `.git` **file**.
6. **`procs/`, `Seed.s.sol` and `Fixtures.s.sol` needed no change**, as the plan expected. `Seed.s.sol`
   ran clean against the salted factory on anvil.
7. **The architect's `cdfaa0a` factory address moved, exactly as the plan predicted.** The spike's
   `0x2cF9C0d9…cb7a18` is now `0x550f3bE1…Dcb66a` at `5ed1ed2`; the init-code hash is
   `0xb28d5fcc…f7c35904`. Nothing in the runbook quotes either — step 1f computes them.

## Open questions

### 1. Does OP Mainnet fail #127's precondition, when the alias cannot move value?

**Question.** The #127 precondition says the runbook must record that each chain of criterion 7's
table carries **no native-balance or double-entry-point token**, and that a chain which fails is not
a runbook variable but a contract change and a new version (decision 5). OP Mainnet carries
`LegacyERC20ETH` at `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000`: 3,671 bytes of live code,
`name()` "Ether", `symbol()` "ETH", `decimals()` 18, and `balanceOf(x)` **equal to x's native
balance** for all five addresses probed, including a zero-balance one. By the literal text, that is
a double-entry-point token. But **every stateful method reverts** — `transfer`, `transferFrom` and
`approve` all answer "disabled" — so no value can move through it. Measured at block 158,978,665;
the [OP Stack spec](https://specs.optimism.io/protocol/predeploys.html#legacyerc20eth) lists it
**Deprecated**, "All of the stateful methods in this contract will revert after the Bedrock
upgrade". The other seven chains are clean: four alias families × eight chains = 32 checks, this one
hit, with the method validated against Celo mainnet where it fires on `GoldToken`.

Traced through `src/Distribution.sol` at this commit: `distribute(alias)` has `_balance` staticcall
`balanceOf(this)`, which succeeds and returns the native balance, so `amount` is the whole native
balance; then every `_push` reverts and the share is booked into `escrowed[alias][account]` and
`reserved[alias]`. **No native wei moves.** `reserved` is keyed by token (`:87`), so
`reserved[address(0)]` is untouched and `release(address(0), …)` still pays in full.
`release(alias, …)` reverts and rolls back. So **F12's loss — escrowed ETH paid out a second time —
is unreachable on OP Mainnet**; the residual is that any caller can inflate `escrowed[alias][*]`
with un-releasable phantom credits and emit misleading `Escrowed`/`Distributed` events, with no ETH
at risk.

**Options.** (a) **Read it literally**: OP Mainnet fails, and under decision 5 that is a contract
change and a new version, so chain 10 leaves the table until a version that keys escrow differently.
Costs the most and buys protection against a mechanism that is already unreachable there. (b) **Read
it as "no alias through which value can move"**: OP Mainnet passes; its row keeps the measurement,
the three disabled mutators and the deprecation as its source, and the runbook carries the residual
as a named caveat. Costs nothing and leaves a true row. (c) **(b) plus a deploy-time assertion** that
the alias's `transfer` still reverts, re-checked per chain before each deploy, so a future OP
upgrade that re-enabled it would be caught.

**Recommendation.** (c). The mechanism F12 describes needs a movable alias and this one is not
movable, so (a) retires a mainnet for nothing; but (b) alone rests on a property of a deprecated
contract that nobody has promised to keep, and the whole point of the precondition is that this is a
one-way door on eight chains. (c) is (b) with the assumption written down as a command.

**Default and deadline.** None — I did not fill it. `RUNBOOK.md` § 1's OP Mainnet row records the
measurement and says the disposition is pending this ruling and not to deploy to chain 10 before it
is ruled. Every other chain's row is final either way. Blocks: the first deploy on OP Mainnet, which
is M05's, so it does not block this PR's merge. Deadline: M05's scoping, or M03's close-out if the
close-out wants F12's row final.

**Record.** `SECURITY.md` F12 and [#127](https://github.com/dnznlabs/rake/issues/127);
`docs/ROADMAP.md` § Decisions if it rules on the reading rather than on the chain.

### 2. May `app/build.mjs:39` take the same one-line `CREATE2` fix the plan ordered for `DEPLOYED`?

**Question.** The plan's step 1 requires `DEPLOYED` in `mk/10-forge.mk` to accept `CREATE2` "or
`make addresses` and the `deploy::` guard both go blind". `app/build.mjs:39` carries the identical
filter — `if (t.transactionType !== 'CREATE' || !t.contractName) continue;` — and goes blind the
same way, so once the deploys are salted the dapp can no longer resolve
`__DISTRIBUTIONFACTORY__`, `__DISTRIBUTIONFACTORY_BLOCK__` or `__APP__`. `make dapp-nodev` and
`make deploy` both exit 2. But § Out of scope says "`Seed.s.sol`, `Fixtures.s.sol`, the dapp, the
widget, `procs/` — none needs a change; if one turns out to, say so in the handoff and stop," and
that is what this is. It collides with the AC "`make serve` on a fresh anvil deploys" and with
runbook step 4 and criterion 8, none of which can pass without it.

**Options.** (a) **One line in `app/build.mjs`**, accepting `CREATE2` beside `CREATE`. Measured
working: `make dapp-nodev` exit 0, the factory address substituted once into
`app/dist/index.html`, zero `__NAME__` tokens left. Costs one line in a file this task was told not
to touch, and the dapp is not in `audits/SCOPE`. (b) **Pass the three values from `mk/20-dapp.mk`
with `--set`**, keeping `app/` untouched. Needs the creation block as well as the two addresses, so
it duplicates the block lookup in make, where `DEPLOYED` does not carry it — more code, in a worse
place, to protect a scope line. (c) **Leave it and descope** the `make serve` AC, runbook step 4 and
criterion 8 from this task, as a t07 or a close-out item.

**Recommendation.** (a). It is the same defect, the same fix and the same reason as the change the
plan explicitly orders twenty lines earlier; "the dapp" in § Out of scope reads naturally as the
dapp's UI and behaviour, not a broadcast-log filter in its build script. It is one line, it is
measured, and it is the difference between a runbook whose step 4 has been rehearsed and one whose
step 4 has not.

**Default and deadline.** None — I did not make the change, and reverted the measurement by path.
Blocks: the `make serve` AC, runbook step 4, criterion 8's sequence, and therefore this PR's
completeness. Deadline: this PR's review — it is the one thing standing between the task and a full
pass.

**Record.** `docs/ROADMAP.md` § Decisions if it rules on scope; otherwise the ruling is just an
amended `TASK.md` and a commit on this branch.
