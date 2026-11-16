# m04-t03 — handoff

PR: [#179](https://github.com/dnznlabs/rake/pull/179) · Branch: `m04/t03-testnets` · 2026-11-08

Steps 1, 2, 3 and 5 of `RUNBOOK.md` ran on **Sepolia (11155111)** and then **Base Sepolia (84532)**.
The factory is at `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` on both, its implementation at
`0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0`, `App` at `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`
owned by the Ops vault, `v0.1`, unlocked — the same three addresses on both chains, recomputed on
each rather than copied, which was the point of the exercise. All six contracts are verified. The
runbook gained § Executed on testnets with both § Record tables filled, and three procedural changes
that this run's two surprises earned.

Two things did not go to plan and both are written up below rather than smoothed over. **Sepolia's
steps 2 and 3 were sent by a run that was killed before it recorded anything**, so this task's first
work was recovering a deploy that already existed — the transactions are recorded here, not repeated,
and the pre-send gates that run never wrote down are named as unrecorded rather than reconstructed
(§ Gates). **Step 4 was not run on either chain**, and the reason turned out to be permanent rather
than a scheduling hold: `App.owner()` is the Ops vault, so the engineer's key cannot upload at all.
That was ruled 2026-11-08 as decision 44 (M04-D4,
[#178](https://github.com/dnznlabs/rake/issues/178)) — step 4 becomes a permanent Ops vault action,
on the unanimous 3-of-3 route — and it takes
criterion 3's chain half with it.

## Acceptance criteria

Every chain reading below was re-verified live on 2026-11-08 at 22:05 CST against
`ethereum-sepolia-rpc.publicnode.com` and `https://sepolia.base.org`, with an explicit `--rpc-url` on
every command. Tree figures are the branch head through `devbox run --` (forge `1.7.1-dev`).

| AC | Result | Evidence |
|:---|:-------|:---------|
| **1.** M04 criterion 1, both chains: factory runtime equals the artifact outside the immutable spans; `implementation()` is `0x31dd18b4…`; `App` runtime equals `forge inspect App deployedBytecode`; `App.owner()` the Ops vault; `locked()` false; every hash and `gasUsed` from `cast receipt` | **pass** | Factory **1,320 bytes** on both (`cast code \| tr -d '\n' \| wc -c` → 2,642), **60** bytes differ from the artifact, **none outside** the three declared `immutableReferences` spans at offsets **275, 865, 940**, each holding `0x…31dd18b4c3ece3f123c285bdb045331364cfa4b0`. `implementation()` → `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` on both. `App` **7,155 bytes** (14,312 chars) and `cmp` against `forge inspect App deployedBytecode` **equal, byte for byte**, on both. `owner()` → `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`; `version()` → `"v0.1"`; `locked()` → `false`. Hashes and `gasUsed` all from `cast receipt`, never `run-latest.json` (#140) — and § Discoveries 3 says why that mattered |
| **2.** M04 criterion 2: six `forge verify-contract … --watch` exit 0, six `#code` URLs naming the contracts | **pass** | Six of six exited 0; six `getsourcecode` reads name `DistributionFactory`, `Distribution`, `App`. URLs in `RUNBOOK.md` § Explorer verification. All six report solc `v0.8.34+commit.80d5c536`, optimizer on. Caveat recorded there: on Sepolia the factory and implementation answered `is already verified` rather than being submitted by this run — almost certainly the killed run did it between 09:51 and 09:56, which `getsourcecode` carries no timestamp to confirm. `App` was submitted and verified here; all three on Base Sepolia were |
| **3.** M04 criterion 3's chain half: `make chain-doc` hashes equal `sha256sum` of that chain's bundle, byte counts both ways | **not met — blocked** | Step 4 was not run on either chain. `App.owner()` is the Ops vault and `Chunks.s.sol` broadcasts from the engineer's key into `onlyOwner` setters, so it reverts `Unauthorized` on any public chain. **Ruled 2026-11-08 as decision 44** (M04-D4, [#178](https://github.com/dnznlabs/rake/issues/178)): option 1, step 4 becomes an Ops vault action permanently, on the unanimous 3-of-3 `forward()` route. No bundle hashes exist for either chain and none are claimed. § Deviations 1 |
| **4.** M04 criterion 7: `RUNBOOK.md` § Executed on testnets with both § Record tables filled; § Deviations empty or each item names its runbook hunk or its reason | **pass** | `git diff --stat origin/main -- RUNBOOK.md` → `1 file changed, 268 insertions(+), 5 deletions(-)`. § Executed on testnets carries both § Record tables, the runtime comparison, the base-fee table, the explorer table and § Step 6 is Denizen's. Step 4's rows are blank **on purpose**, labelled `not run — blocked on M04-D4 (#178)`. Each deviation below names its hunk |
| **5a.** `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot` empty | **pass, measured against the branch base** | Against the base `308ca75`: **empty**. Against the current `origin/main` tip it is *not* empty — but that is main moving, not me: main gained `7681d35` (#177) after this branch started, which added `test/ColdStipend.t.sol` and 66 lines of `test/Distribution.t.sol`. This branch touches `RUNBOOK.md`, the real-network broadcast logs and this handoff, and nothing else: `git diff --stat 308ca75 HEAD` lists exactly those. § Deviations 3 |
| **5b.** `forge test` 91 | **pass on intent, the figure is stale** | **102 passed**, 0 failed. The plan's 91 predates m04-t07, which added 11 tests (`76eeba1`, `e35ae13`, `3c4cdf3` — 7 `invariant_` + 4 `testFuzz`) and merged into main *before* this branch's base; `MILESTONE.md:187` records the same 91 → 102. All three commits are ancestors of `308ca75`. § Discoveries 1 |
| **5c.** `node --test` 90 | **pass** | 90 passed |
| **5d.** `git status --porcelain` empty | **pass** | empty at the branch head |
| **6a.** § For Denizen — step 6 holds both chains' complete commands and the anvil rehearsal of the table string | **pass** | § For Denizen — step 6 below, one complete command per chain, decision 42's values, nothing to fill in. Rehearsed on anvil 2026-11-08 with the exact table string: it parsed, `DISTRO` landed on its `predict` address `0x633e24C2320B8d86A2A36aB659b64850e5aC6148` (the rehearsal's own salt, not the real `DNZN_SALT`), `owner()` the Ops vault, `delay()` 86400 |
| **6b.** § Gates holds the balances, base fees and `cast code` readings, dated | **pass, with Sepolia's pre-send gates declared unrecorded** | § Gates below. Base Sepolia's six gates were performed before its first send and are recorded. **Sepolia's were not recorded** — the killed run never wrote them down, and § Gates says so plainly instead of substituting a later reading. It splits the missing readings by what each is actually worth: the `0x` code read is **lost as a reading** (its pass value cannot self-validate), though the emptiness it checked for is *proven* by the successful CREATE2 itself; the send-time balance is **recoverable**, because it reconciles against the receipts to the wei |
| **7.** PR closes this task's issue | **pass** | [#179](https://github.com/dnznlabs/rake/pull/179), reviewer `lakkoss` requested. `gh pr view 179 --json closingIssuesReferences` → `[175]` and nothing else, checked twice. **No closing keyword for #127 is present**, which is the plan's default; the per-chain alias re-readings it asks for are recorded (both chains `none`, 2026-11-08), so the architect can rule on it at review if the M05 rows do not keep it open |

`forge snapshot --check` exit 0; `forge build --force` 41 files with **0** `warning[` and **0**
`Warning (`; `make slither` exit **0** with 0 results. `forge build --force` was re-run before every
count quoted here.

## § Gates

Dated readings, per chain. `ETHERSCAN_API_KEY` was present and non-empty, last four characters
**`9SKI`**; it was never echoed and is not committed.

**Base Sepolia (84532) — six gates, performed before the first send, 2026-11-08.** All confirmed
again from archive state at block **56,161,389**, the block before step 2:

| gate | reading |
|:--|:--|
| signer funding `0x5A158aF8…C50d` | **0.010000000000000000 ETH**, nonce 0 — exactly at step 0's 0.01 gate, and ample at this base fee |
| Creator key `0x68e0741D…86eE` | **0.010000000000000000 ETH**, nonce 0 (read, not funded — not mine to fund) |
| base fee | **0.005 gwei** (5,000,000 wei), far under the 20 gwei stop |
| `cast code` at `FACTORY`, `APP`, predicted `DISTRO` | **`0x`** at all three |
| `ETHERSCAN_API_KEY` | present, `…9SKI` |
| t01 (#164), t02 (#163), t06 (#170, **no `fix` row**) | all merged |

**Sepolia (11155111) — the gates were not recorded.** Steps 2 and 3 were sent at 09:44–09:51 CST on
2026-11-08 by a run that was killed before writing anything down. Nothing below is a gate: a reading
taken after the send is not the check that was meant to precede it, whatever it returns, so none of it
is evidence that step 0 or step 1g was performed on this chain. The readings are archive reads at the
pre-send blocks **12,091,512** (before the first, failed step-2 attempt) and **12,091,536** (before
the successful one), taken 2026-11-08 between 22:05 and 22:40 CST. They differ in how much they are
worth, and the column says which — nothing here is reconstructed or inferred:

| reading | value | what it is worth |
|:--|:--|:--|
| `cast code` at `FACTORY` | `0x` | **lost — no positive control.** The emptiness is *proven* separately, by the chain, below |
| `cast code` at `APP` | `0x` | **lost — no positive control.** Same proof applies |
| `cast code` at predicted `DISTRO` | `0x` | **lost — no positive control** as a historical read. Not needed: step 6 has not run, so the live read stands on its own (`0x`, Creator nonce 0, today) |
| `cast code` at the proxy `0x4e59b448…` | **69 bytes**, keccak equal to § 1's | **lost as a gate reading.** Quoted only as the *control* for the rows above, which is the one job a known-non-zero value can do here |
| signer balance at send time | **0.104894517730887580 ETH**, nonce 1 | **archive read, reconciled** — against `gasUsed × effectiveGasPrice`, to the wei |
| Creator key balance | **0.010000000000000000 ETH**, nonce 0 | archive read; also reads the same live today |
| base fee | **19 wei** | archive read, reconciled — agrees with the receipts' `effectiveGasPrice` |
| `ETHERSCAN_API_KEY` | present, `…9SKI` | current, verified this session |

**Why the code read is lost and the balance is not.** The distinction is whether anything independent
can fail when the value is wrong.

The `0x` code read **cannot self-validate, because its pass value is the empty answer** — a wrong
answer is indistinguishable from a right one. That is the `ETH_RPC_URL` hazard of § Discoveries 2 one
level deeper, and on its own it is enough to call the read lost.

The endpoint's behaviour makes it worse, and here the architect's reading and mine disagree in a way
worth recording rather than smoothing over. `ethereum-sepolia-rpc.publicnode.com` is load-balanced
across archive and pruned backends, so **the positive control is itself non-deterministic**: the
architect found `cast codesize` at the deploy block 12,091,537 — where 1,320 bytes certainly exist —
*erroring*, while five attempts here returned the true **1320** four times. Both observations are
real. At the factory's pre-send block 12,091,536, eight paired attempts returned the proxy's known 69
bytes 6 times and `historical state … is not available` twice. The refusal is always **explicit** — a
pruned backend errors rather than fabricating, and was never once observed returning a false `0x`.

That last point is the only place I would soften the mechanism: the failure mode here is a visible
error, not a silent default. **It does not rescue the reading, and the verdict is still lost.** A
control you cannot reproduce on demand is not a control; each `cast` call may reach a different
backend, so a `0x` carries no attached evidence about which backend answered it; and the architect's
conclusion — an endpoint that cannot reliably return a known non-zero value at N+1 cannot vouch for
an empty value at N — holds under either observation. Non-determinism argues for `lost` at least as
strongly as a flat failure would.

The balance **does** have an independent control: `gasUsed × effectiveGasPrice` over the three
transactions is **31,130,197,802,436 wei** (2,833,494 × 1,000,020 + 16,789,404 × 1,000,019 +
11,506,694 × 1,000,020), and 104,894,517,730,887,580 − 31,130,197,802,436 = **104,863,387,533,085,144**,
the recorded post-send balance, exactly. A wrong figure from a pruned backend would not balance. That
control proved itself here by catching an error of mine: I first assumed the failed attempt's
`effectiveGasPrice` was 1,000,019 and the sum missed by precisely 2,833,494 wei — one wei per gas —
until the receipt was read and gave 1,000,020.

**The emptiness of `FACTORY` and `APP` before the send is proven regardless, by the chain rather than
by any RPC.** Both CREATE2s succeeded, at exactly the addresses step 1f predicted, with runtime
matching the artifacts — and a CREATE2 onto an address that already holds code **fails**. Verified on
anvil rather than cited: the same salt and init code through the proxy gave status 1 and a 10-byte
runtime onto an empty address, then `Failed to estimate gas: … execution reverted` when repeated onto
the now-occupied one. So the success of the deploy *is* the collision check, after the fact and
unconditionally — which is the reason #22's one-way door closes only on a *successful* create. It is
stronger evidence than the gate would have produced, and it needs no archive node.

What is left genuinely and permanently gone is **whether those checks were run at all** — the thing
the runbook's new commit rule exists to stop losing, and which no reading of any quality can supply.
The recovery established the rest another way: `git diff --stat 4b6f95b 308ca75 -- src/` prints
nothing, so the bytecode on Sepolia is `main`'s, and step 1f recomputed both init-code hashes and both
addresses at `308ca75` and got `0xd8a1208a…bc31cc5`, `0x0b2894a3…f7b9864a` and the two § 0 addresses —
which proves the deployed bytes are the right bytes, retroactively.

## Deviations from the plan

1. **Step 4 was not run on either chain, and cannot be as the plan writes it.** The plan (steps 3
   and 5) has the engineer run `make dapp-nodev` then `Chunks.s.sol` with `$SIGNER`. `App` takes its
   owner in the constructor (`src/App.sol:50-51`) and `addChunk`,
   `setChunks`, `addWidgetChunk`, `setWidgetChunks`, `setVersion` and `lock` are all `onlyOwner`
   (`:111`, `:120`, `:133`, `:142`, `:153`, `:168`); `RUNBOOK.md` § 0 sets `OWNER` to the Ops vault on
   every chain and `APP_SALT` was mined against init code containing it, so the owner is part of
   `App`'s address. The engineer's key is not an Ops owner, so step 4 reverts `Unauthorized` on any
   public chain. Found by this task, confirmed from the chain by the architect, and **ruled 2026-11-08
   as decision 44** (M04-D4, [#178](https://github.com/dnznlabs/rake/issues/178)): option 1, step 4
   becomes an Ops vault action permanently, for every future upload including `lock()` and M05's
   mirror. Five calls to `App` per chain — `addChunk` ×2, `addWidgetChunk` ×1, then `setChunks` and
   `setWidgetChunks`. **The route is the unanimous one**: all three Ops owners are Denizen's and he
   confirmed he can reach all three, so the five go through `TimelockExecutor.forward()` at 3-of-3 and
   execute immediately, with no queue and no hour. The **threshold** route stays documented as the
   fallback — `Multisig.execute()` queues at `eta = block.timestamp + delay()` and `executeQueued()`
   runs it after, with all five queued back-to-back sharing one hour rather than costing five. On
   either route the three `add*Chunk` calls must have *executed* before the two setters, because
   `setChunks` and `setWidgetChunks` validate their pointers through `_requireChunk`, which reverts
   `CodelessChunk(ptr)` on a pointer with no code (`src/App.sol:125`, `:147`, `:198-207`) — so
   queueing a setter beside the adds it depends on reverts at execution, not at queue time. #178 and
   decision 44 are the authority on the mechanics. My earlier wording here
   and in the runbook said "sign 2-of-3, execute through `TimelockExecutor.forward()`", which is
   **wrong and would have reverted**: `forward()` requires `ownerCount()` signatures for everything
   except `cancelQueued`, plus `forwardEnabled` (`src/mods/TimelockExecutor.sol:41-47` of
   src-company/multisig, identical at `62eb905` and `cbfa345`), so a threshold set fails the
   `sigs.length == required * 65` check with `InvalidSig`. Read on both chains 2026-11-08: Ops
   `ownerCount()` **3**, `threshold()` **2**, `delay()` **3600**, `forwardEnabled(Ops)` **true** —
   so `forward()` needs 3-of-3 and the 2-of-3 route carries the full hour's wait. Corrected at the
   architect's first pass. It was *first* held for a different and smaller reason, #172's
   bundle change, which merged at 21:46 CST as #177 (`7681d35`); that hold is gone and this one
   replaced it. Runbook hunk: § Executed on testnets, the step-4 paragraph, and six `record:` rows
   now reading `not run — blocked on M04-D4 (#178)`.
   **#178 also asked the engineer to prepare the five calldatas, pointers, hashes, estimates and a
   draft runbook section "regardless of ruling". That is not in this PR**, because `TASK.md` on
   `main` does not contain it — it is unrevised since 2026-11-07, before the finding — and an issue
   filed at review is not task authority. **That is now settled the same way**: the architect took
   option (b) at review and the step-4 preparation has been scoped as **its own task** after decision
   44, recorded beside M04-D4. So nothing in this PR prepares calldata, and § Step 4 via the Ops vault
   is that task's to write, against the ruling rather than against a recommendation.

2. **Sepolia's steps 2 and 3 were recorded, not executed, by this task.** The plan has one run per
   chain doing steps 1–5 in order. On Sepolia a run at commit `4b6f95b` sent both transactions at
   09:44–09:51 CST and was killed before recording anything. They were **not re-sent** — the
   addresses were taken and a second CREATE2 through the proxy is #22's collision, which consumes
   every unit of gas forwarded to it. This task recorded them from the chain instead. A third
   transaction belongs to that chain's record and is in the runbook: `0xf80fc26d…534b7c29`, nonce 1,
   gas limit 3,287,625, **status 0** after burning 2,833,494 gas — a first step-2 attempt that failed
   on gas. It created nothing, so it is not a collision and the send that followed it is not a
   resend. Runbook hunk: § Executed on testnets, the killed-run paragraph.

3. **The AC's `git diff --stat origin/main` check is measured against the branch base.** `origin/main`
   advanced past this branch (#177, `7681d35`) while the task was in flight, so the literal command
   now reports main's newer tests as differences. Against the base `308ca75` it is empty, which is
   what the criterion is actually asking. Stated here so the reviewer running the literal command
   is not surprised by it.

4. **Three procedural additions to `RUNBOOK.md` beyond § Executed on testnets**, both earned by this
   run and both asked for at review: the rule that each step's `record:` line is committed before the
   next transaction is sent (§ 2 preamble), and step 1g's collision check gaining a second branch —
   "already deployed by us, record and skip" as distinct from "stop, collision" (§ 1g). The runbook
   previously knew only "stop", which assumed any code at the address was ours; that is precisely why
   this morning's recovery had no procedure to follow. The third is the `ETH_RPC_URL` warning in
   § 1g, from § Discoveries 2.

## Decisions

1. **The `App` runtime comparison uses `cmp` against `forge inspect App deployedBytecode`, and the
   factory's uses the artifact's `immutableReferences`.** `forge inspect` has no `immutableReferences`
   field in 1.7.1-dev, so the three spans are read from `out/Distribution.sol/DistributionFactory.json`
   with `jq`. The prescribed `cmp` was run through the pinned toolchain before being written into the
   runbook as a gate: exit 0.
2. **Verification was attempted on all six contracts even though two reported `is already verified`.**
   Re-running is idempotent and the alternative — assuming the killed run had done it — is an
   assumption. The two that answered `already verified` are recorded as such rather than claimed.
3. **#127 is left open, with no closing keyword in the PR.** The plan's default. Both chains' alias re-readings are
   recorded (`none`), so the architect has what the condition asks for and can rule at review.

## Discoveries

1. **The plan's `forge test` 91 is stale by 11.** m04-t07 merged 7 `invariant_` and 4 `testFuzz`
   tests into `main` before this branch's base, making it 102; `MILESTONE.md:187` already records
   91 → 102. Not fixed here — `TASK.md` is not mine to edit — but the AC's figure wants updating
   wherever it is copied next.
2. **`ETH_RPC_URL` from `../shared/.envrc.local` points at mainnet, and that is a trap with teeth.**
   The runbook already warns that a bare `cast` talks to whatever that variable names. The sharper
   version, measured this session: `cast code <FACTORY> --block 12091512` against that variable
   returns a cheerful **`0x`** — because it is a 2021 mainnet block — which is *exactly* what a
   passing collision gate looks like. A wrong-chain `0x` and a correct `0x` are indistinguishable.
   Written into § 1g with `cast chain-id` as the cheap confirmation.
3. **The plan's parenthetical "the broadcast logs are gitignored" is wrong for this repo**, and acting
   on it would have lost the killed run's only local record. `.gitignore:11-16` un-ignores
   `/broadcast` and excludes only `31337/`, `31338/` and `dry-run/`, under the comment "Dev-chain
   broadcast logs are throwaway; real-network ones are the deployment record." The nine real-network
   logs are committed, deliberately, in `e604b29`. `make dapp-nodev` reads the factory's block from
   them, so on this branch they are load-bearing as well as evidential.
4. **Sepolia prices this init code roughly 7.4× every other chain**, which is a finding about Sepolia
   rather than about the contract: factory create **16,789,404** gas used against Base Sepolia's
   **2,380,182** and anvil's **2,262,485**; `App` **11,506,694** against **1,655,660** and
   **1,648,295**. `cast estimate --create` corroborates it from the node at **16,730,843** on Sepolia
   and **2,395,343** on Base Sepolia. The architect's independent read the same day was **16,915,900**
   on Sepolia against 2,395,343 on five other chains — a different block, so a different reading, and
   both are quoted rather than reconciled into one number. M05 must re-read this per mainnet; the
   anvil figures are a floor, not a budget.
5. **`forge script` cannot size a gas limit for a chain it has not asked.** It sizes from its own
   cancun simulation and printed `Estimated total gas used for script: 3287625` for `Deploy.s.sol` on
   *both* chains, while the node said 16,730,843 and 2,395,343. On Sepolia that gap is the whole
   explanation of the failed first attempt, whose gas limit was 3,287,625 — forge's figure, byte for
   byte. Step 1e now says to compare the node's estimate with the dry run's and raise the limit
   explicitly when the node's is larger.
6. **A historical reading is only evidence if something independent can fail when it is wrong** —
   and a gate whose pass value is "empty" can never meet that bar. This is the general form of the
   `ETH_RPC_URL` trap in 2 above, and it is what separates the two missing Sepolia gates: the `0x`
   code read has no control and is lost as a reading, while the send-time balance reconciles against
   `gasUsed × effectiveGasPrice` to the wei and so is recoverable. Worth stating because the useful
   move when a reading is lost is not to hunt for a better RPC — it is to look for a different fact
   that the chain's own rules make unconditional. Here that fact was the **success** of the CREATE2,
   which cannot happen onto occupied code. § Gates carries the full argument and the anvil proof.
7. **A step-2 or step-3 transaction that fails for gas is safe but not free.** `0xf80fc26d…` created
   nothing and is not a collision — #22's one-way door closes only on a *successful* create — but it
   burned 2,833,494 gas. Recorded in step 1e as the reason to read the estimate rather than discover it.

## § For Denizen — step 6

**Not run on either chain, and not this task's**: the DNZN Creator key is Denizen's and never
lives on the engineer's host. Both chains are ready for it — `cast code` at the predicted
`DISTRO` prints `0x` on Sepolia and Base Sepolia, and the Creator key is at **nonce 0** on both with
**0.01 ETH** on each (read 2026-11-08 22:05 CST).

The values are **decision 42's**: `DNZN_DELAY=86400`, `DNZN_DESCRIPTION="DNZN // FEE DISTRIBUTION"`,
and the three-row table of Treasury 1,000 bps, Ops 3,000 and `0x357836fF…902B` 6,000. The table is in
`_set`'s **ascending address order**, which is not the order #157 listed. The row named `Creator` is
**Denizen's own address**, not the Creator key — decision 42 says so, and the key that signs is the
one thing a reader could confuse it with.

Nothing below needs filling in. Run it once per chain, changing only the first line.

```sh
# Sepolia:      export RPC=https://ethereum-sepolia-rpc.publicnode.com
# Base Sepolia: export RPC=https://sepolia.base.org
export RPC=<one of the two above>

FACTORY=0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B
DNZN_SALT=0x68e0741D8d693e14BF56914567eADdC130b186eE000000000000000000000001

cast chain-id --rpc-url "$RPC"                 # 11155111 or 84532 — confirm before anything else
DISTRO=$(cast call $FACTORY "predict(bytes32)(address)" $DNZN_SALT --rpc-url "$RPC")
echo "$DISTRO"                                 # 0x6aC98EDA2553dD67dBb1c4b23F5bb34c63E13F9f
cast code $DISTRO --rpc-url "$RPC"             # MUST print 0x — anything else, stop

cast send $FACTORY \
  'create(address,uint32,string,(address,uint96,string,string)[],bytes32)' \
  0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790 86400 "DNZN // FEE DISTRIBUTION" \
  '[(0x00b6E7D12EdE9Ca4A74fE69be758aAB1ee02cFb9,1000,"Treasury",""),(0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790,3000,"Ops",""),(0x357836fFcB45307FA7ff2A574F505753c961902B,6000,"Creator","")]' \
  $DNZN_SALT --rpc-url "$RPC" --account dnzn-creator --from 0x68e0741D8d693e14BF56914567eADdC130b186eE

cast call $DISTRO "owner()(address)" --rpc-url "$RPC"   # 0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790
cast call $DISTRO "delay()(uint32)" --rpc-url "$RPC"     # 86400
```

**The table string was rehearsed on anvil first**, on 2026-11-08, so that it parses before you type
it: it parsed, `DISTRO` landed on its `predict` address
`0x633e24C2320B8d86A2A36aB659b64850e5aC6148` — the rehearsal's own salt, prefixed by the signing
account, not the real `DNZN_SALT` — with `owner()` the Ops vault and `delay()` 86400.

Fill step 6's `record:` rows in `RUNBOOK.md` § Executed on testnets when it runs; they are
deliberately blank until then.

## § For t04

- **The two gateway URLs to measure**, both live now that `App` is deployed and unlocked:
  - `https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3link.io/`
  - `https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.84532.w3link.io/`
- **The `App` document hashes per chain do not exist yet.** They are step 4's output and step 4 is
  blocked on M04-D4 (#178). `cast call $APP "html()(string)"` returns **`""`** on both chains, read
  2026-11-08 22:05 CST — `chunks` is unset — so t04's criterion-3 measurement cannot run until the
  upload does. t04 can still do the
  origin probe (`window.top === window`, `window.ethereum` present) against a gateway URL, and
  should expect an empty body rather than read it as a gateway fault.
- The per-chain bundles will differ from each other by design, because each carries its own chain's
  addresses and the factory's block on that chain, and so will each chain's `html()`.

## Open questions

**None outstanding.** Both questions this handoff opened were ruled while it was in review, and are
recorded here as closed rather than deleted:

1. **M04-D4 — who executes step 4.** **Ruled 2026-11-08 as decision 44**: option 1, step 4 becomes a
   permanent Ops vault action, on the unanimous 3-of-3 `forward()` route, Denizen having confirmed he
   can reach all three Ops signers ([#178](https://github.com/dnznlabs/rake/issues/178) comments). The
   threshold route stays documented as the fallback. The ruling's `ROADMAP.md` § Decisions entry lands
   in a later PR, not this one. It still blocks this task's criterion 3 and t04's criterion 3 until the
   upload runs.
2. **Whether the step-4 preparation belongs to m04-t03 or a new task.** **Ruled (b)** by the architect
   at first-pass review: a new task, scoped after decision 44 and recorded beside M04-D4, so the
   preparation is written against the ruling rather than a recommendation. Nothing in this PR prepares
   calldata.
