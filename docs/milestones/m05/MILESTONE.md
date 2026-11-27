# M05 — Mainnet

Status: done · closed on the merge of [`CLOSEOUT.md`](CLOSEOUT.md), run 2026-11-26 · scoped 2026-11-18 · re-scoped 2026-11-22 (decision 70)

**Re-scoped 2026-11-22, decision 70: this milestone's mainnets are Base and Ethereum.** Wherever the
text below says "the four chains", read those two, and where it says "all six", read those two and
the two testnets. OP Mainnet, Arbitrum One, MegaETH and Robinhood Chain are not deployed to in this
milestone: they follow on the Product Owner's word once Base and Ethereum have been in real use,
scoped then as their own work. The text below is otherwise as scoped on 2026-11-18, and the phases
and tasks are current.

`RUNBOOK.md` Run A executed for real on **Ethereum (1), Base (8453), Arbitrum One (42161) and OP
Mainnet (10)** so that `DistributionFactory`, its implementation and `App` sit at one address on all
four, the same address the two testnets carry; DNZN's fund distribution live on each of them with the
Sepolia description and table, **the Ops vault as owner and a seven-day delay** (decisions 50 and
51); the document uploaded through the Ops vault (decisions 44 and 47) and read through a gateway;
the dapp served at `rake.dnzn.dev` by a gw44 gateway and the widget embedded in one DNZN app
(decisions 12, 41 and 66);
MegaETH (4326) and Robinhood Chain (4663) as a stretch row that passes or is recorded as not reached
without holding the close-out (decision 4). It comes now because M04 is the last cheap place to find
what the runbook gets wrong, and it comes **after** M04 closes because every deviation M04 met is
folded into the runbook before it runs where ETH costs money and `App`'s address is permanent.

**Gate: M04 closed on 2026-11-19, and this milestone starts.** Decision 64: M04 closed on its
close-out's merge ([#296](https://github.com/dnznlabs/rake/pull/296), `eec7164`), with four unmet
clauses transferred to m05-t01 Part B and verified there as its criteria 18c–18f — M04 criterion 1's
artifact comparison against `main` after the redeploy and DNZN's address at the new factory,
criterion 3's chain document and both hosted gateway checks after the Run B upload step 14 proposes
has executed, and criterion 5's host page regenerated and published once by the Product Owner.
Criterion 6 was transferred by decision 63 (criterion 18b) and criterion 8's comment on
state-collection#74 is drafted and awaiting the Product Owner's word. The gate as it read before
that merge, for the record. Read 2026-11-18: m04-t05
(the UAT and the wallet-path measurement) has steps 0–2 done, and **its step 3, Denizen's wallet run,
moved here by decision 63 (2026-11-19)** — it runs as a step of m05-t01 after step 16, once the upload
step 14 proposes has executed with the m04-t16 bundle on the redeployed testnets, and M04's criterion 6 signoff is written in that handoff;
the measurement was withdrawn with t12 (decision 62); m04-t14 (build hardening, #235) is scoped and
not merged, and its own text says it must merge before M05 builds the mainnet document; m04-t12
([#227](https://github.com/dnznlabs/rake/pull/227)) was held by Denizen's ruling of 2026-11-18 and
is **closed before mainnet by decision 62 (2026-11-19)** — #227 unmerged, branch kept, #221 and
#165 carried post-mainnet, so it no longer gates this milestone; the post-UAT `app/` task carrying [#243](https://github.com/dnznlabs/rake/issues/243),
[#241](https://github.com/dnznlabs/rake/issues/241) and decision 53's `#/docs` paragraph is not yet
scoped; and M04's Phase 5 close-out (`CLOSEOUT.md`, the carried-issues table, the comment on
state-collection#74) has not been written. Phase 1 below can be *scoped* while those finish, because
its first task touches no chain where ETH costs money; nothing in Phase 2 is dispatched before M04's
close-out PR merges — which it did, on 2026-11-19, so that condition is met and Phase 2 waits only
on m05-t01's and m05-t01b's merges, as its own row says.

**The bytes moved after the testnets were deployed, and that is the first thing this milestone has to
settle.** [#201](https://github.com/dnznlabs/rake/pull/201) (merged 2026-11-17) pinned solc 0.8.38 for
a compiler bug it could not exclude by inspection, with no `src/` change. `RUNBOOK.md` § 0 records the
consequence ([#202](https://github.com/dnznlabs/rake/pull/202)): "Both salts above were mined against
the 0.8.34 init-code hashes quoted here; `main` now compiles to different bytes, so step 1f computes
different hashes and neither salt yields its `0x00…` prefix any more. Do not run the deploy steps
against `main` until decision 37's mining run has been repeated for the new hashes and this block
updated." So the four addresses M04 put on Sepolia and Base Sepolia (`0x00D18B5b…`, `0x31dd18b4…`,
`0x00A90943…`, and DNZN's clone) **cannot be the mainnet addresses**, and a clone's address follows
the factory's — `predict` hashes `address(this)` (`src/Distribution.sol:499`) — so decision 50's
address literal `0x71a4…7a4A` moves with it. The milestone therefore opens with a mining run and a
testnet redeploy from the bytes `main` builds today (M05-D1), so that "same address on every chain"
is true across all six chains and not only across the four mainnets. Nothing under `src/`,
`test/*.t.sol` or `.gas-snapshot` moves in this milestone, and neither does the compiler pin: #201 is
the proof that a pin is a byte of bytecode.

## Acceptance criteria

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, node from
`devbox.lock`), with `RPC` and `CHAIN_ID` set per chain as `RUNBOOK.md` § 0 does and the § 0
constants unchanged except the two salts and the four addresses they fix, which m05-t01 rewrites
once (M05-D1): `OWNER` the Ops vault, `APP_VERSION` `v0.1`, `DNZN_SALT` the salt M05-D2 rules.
"The four chains" means Ethereum, Base, Arbitrum One and OP Mainnet, every time; "all six" adds
Sepolia and Base Sepolia. Measured 2026-11-18 on all six mainnets of § 1: `cast code` at the three
M04 addresses prints `0x`, the proxy at `0x4e59b448…` is 69 bytes, and the Ops vault answers
`ownerCount()` 4, `threshold()` 2, `delay()` 3600 with the engineer's key an owner on every one.
Re-run rather than quote.

1. **The four addresses carry code on all six chains, and they are the same four.** With
   `FACTORY` and `APP` recomputed from `main`'s init code and the re-mined salts by step 1f
   (`RUNBOOK.md:340-343`), on each of the four chains and on both testnets: `cast code $FACTORY`
   equals `forge inspect DistributionFactory deployedBytecode` outside the three
   `immutableReferences` spans (`RUNBOOK.md:422-428`); `cast call $FACTORY
   "implementation()(address)"` prints one address on all six;
   `cmp <(cast code $APP --rpc-url "$RPC" | tr -d '\n') <(forge inspect App deployedBytecode | tr -d '\n')`
   (`RUNBOOK.md:370`) reports equal; `cast call $APP "owner()(address)"` is the Ops vault and
   `cast call $APP "locked()(bool)"` is `false`. Every transaction hash and `gasUsed` in the deploy
   tasks' handoffs is read from the chain with `cast receipt`, not from a broadcast log (#140).
2. **Verified on the explorer and on Sourcify, asserted rather than read by eye.** For the three
   contracts on each of the four chains, the `getsourcecode` read (`RUNBOOK.md:961`) names
   `DistributionFactory`, `Distribution` and `App`, and the Sourcify read
   `curl -s "https://sourcify.dev/server/v2/contract/$CHAIN_ID/$a" | jq -r .match`
   (`RUNBOOK.md:984`) prints `exact_match` for all twelve — through the loop as m05-t01 amends it to
   exit non-zero on anything else ([#207](https://github.com/dnznlabs/rake/issues/207)); today the
   loop prints and the operator reads. `forge verify-contract … --watch` exited 0 for all twelve
   with `App`'s constructor arguments as step 5 encodes them, one at a time (the v2 key's 3/s cap).
   OpenChain carries the ABI's signatures (`RUNBOOK.md:997`): one upload, all `Duplicated:` if the
   ABI is unchanged.
3. **The document on chain is the bundle, and a gateway serves it.** Per chain, after
   `make dapp-nodev` for that chain (`mk/20-dapp.mk:9`): `make chain-doc` (`mk/30-onchain.mk:13`)
   reports `inflated sha256` equal to `sha256sum app/dist/index.html` and `widget sha256` equal to
   `sha256sum app/dist/widget.js`; `make gateway-check` (`mk/25-gateway.mk:12`) pointed at
   `https://<App>.<chainId>.w3link.io/` passes with the gateway's injected block allowed for, as M04
   criterion 3 was amended; `curl -sI …/widget.js` carries `content-type: application/javascript`.
   Measured 2026-11-18 at the M04 `App` address: w3link.io resolves chains 1, 10, 8453 and 42161 (an
   `eth_call` is made and answers "the contract returned no data"), and does not answer at all for
   4326 and 4663 (`curl` exit 000) — the stretch row's gateway is its own task's first measurement,
   and criterion 3 for those two chains is amended by that finding or waived with it recorded. Every
   upload is a row in `RUNBOOK.md` § Uploads with its six hashes and its gas.
4. **DNZN's fund distribution is live under the Ops vault with seven days, on the four chains.**
   `DISTRO=$(cast call $FACTORY "predict(bytes32)(address)" $DNZN_SALT)` has 45 bytes of code;
   `cast call $DISTRO "owner()(address)"` is `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`;
   `cast call $DISTRO "delay()(uint32)"` is `604800` (`RUNBOOK.md:1033-1034`);
   `cast call $DISTRO "description()(string)"` is `DNZN // FUND DISTRIBUTION` (run on Sepolia
   2026-11-18 against `0x71a4…`; not yet a step-6 read-back in the runbook — t01 adds it); `snapshot().table` is decision 50's three rows in ascending
   address order — Treasury `0x00b6E7D1…` 2,000 bps, Ops `0x00c0e887…` 4,000 bps, `0x357836fF…`
   4,000 bps. `DISTRO` is one address on all six chains (criterion 1's factory plus M05-D2's one
   key and salt); on the two testnets, where the M04 distribution at `0x71a4…7a4A` stays live under
   the old factory, the new one is created by m05-t01 at the new address with decision 42's testnet
   delay. One `distribute` has run on Base, from a deposit Denizen made, with the hash in m05-t03's
   handoff — the first real transfer through the contract. **Met 2026-11-26:** deposit
   `0xee99eb54a345781729e647ed95d7d79ddb386e584d460ea2fd2ccf8a58ecfdd5` (block 62,651,967) and
   `distribute(0x0)` `0x6564ba6e70e4e6ae42b916f6f67fe6302d3a72590eb7c1a1e32b9e0630f06b83`
   (62,652,371), both `status 1`, the distribution 0.001 ETH → **0** and the split 20/40/40 landing
   to the wei ([#433](https://github.com/dnznlabs/rake/issues/433)).
5. **Served under dnzn.dev and embedded.** Rewritten 2026-11-21 under decision 66 as amended.
   `https://rake.dnzn.dev`, deployed from this repository by gw44's reusable workflow at a pinned
   commit, serves `App` on every chain rake is live on, the four mainnets and the two testnets,
   each under `/<chain id>/`, and `/` ends on a mainnet chain. From a gw44 checkout at the pinned
   commit, `make check-site` passes its nine cases in Chromium, Firefox and WebKit against that
   URL, and `make verify` prints `ok` for the root and `widget.js` on every chain with rake's
   address on its first line. A page in the DNZN app M05-D4 names carries the snippet `#/docs`
   § the widget gives, a `<script src>` to `https://rake.dnzn.dev/<chain id>/widget.js` with the
   `integrity` attribute the deploy printed, with a browser screenshot in the handoff showing
   DNZN's table rendered from it on a mainnet. Decision 53's boundary is stated in `#/docs`. The
   first clause is met on the two testnets by m05-t04, on each mainnet by the task that deploys
   it, and the embed by m05-t04b.
6. **The runbook is amended by what happened, not annotated.** Every deviation a deploy task's
   handoff lists is a `RUNBOOK.md` change in that PR or a one-line reason it is not; § Executed on
   testnets gains a sibling § Executed on mainnets with every chain's addresses, hashes, gas and base
   fees, and § Uploads gains one row per chain per upload. `grep -n gwei RUNBOOK.md` hits a stop
   rule in § 0 or step 1 — today it hits only lines 1677–1685, which *cite* "the 20 gwei stop of
   step 0" that is not in step 0 (m05-t01 restores it or corrects the citation).
7. **Public records say so.** `README.md` § Deployment Status carries a live row per mainnet with
   explorer and Sourcify links and marks the M04 addresses superseded, as § Which run is this
   requires; `grep -c -i 'No mainnet deployment' README.md` prints 0 (today 1, `README.md:17`);
   [state-collection#74](https://github.com/dnznlabs/state-collection/issues/74) carries the
   architect's comment naming the chains where `cast code` at `DISTRO` is non-empty and the address,
   which is no longer the one its body predicts.
8. **Carried out and clean.** `gh issue list -R dnznlabs/rake --label carried --label m05 --state open`
   prints nothing; `git status --porcelain` is empty after `forge build --force`, `forge test`,
   `forge snapshot`, `make deploy` and `make chain-doc` on a fresh anvil; CI is green on the merge
   commit; `ROADMAP.md` § Decisions carries M05-D1 through M05-D4 as numbered decisions, and the
   go/no-go ruling (M05-D3) is dated before the block timestamp of the first mainnet transaction in
   Phase 3.

## Out of scope

- **Any byte under `src/`, `test/*.t.sol`, `.gas-snapshot`, or `foundry.toml`'s compiler pin.** A
  finding that needs one reopens M03 — a new review, a new mining run, a new address set with the
  old one live and superseded — and is a decision for Denizen. No review gates this milestone
  (M05-D3, decision 55): a `fix`-grade finding from the self-review, a reader or a later bounty is
  the one way it is expected to stop, and Phase 2's ordering is built so that stop costs Base's gas
  and not Ethereum's.
- **`App.lock()`.** M04 § Out of scope said "`lock()` is M05's, after mainnet has been watched". It is
  not sent here either: the door is one-way, its precondition is a watch period under real use that
  no criterion inside this milestone can measure, and decision 45's 90-day alpha clock starts at
  this milestone's close and needs a chunk re-upload, which a locked `App` cannot take. The close-out
  opens a `decision` issue proposing the watch period and the date; sending it is a later task.
  Rejected: locking on the last chain's deploy day (the same ruling `state-collection` took, and
  decision 45's removal clause would then be impossible).
- **Renounce or transfer of `App`'s ownership, and any owner change on DNZN's distribution.**
  Decision 50 sets the owner at `create`; nothing after.
- **Owner-kind submit routes** (M07). The vault-owned distribution shows calldata, as shipped.
- **[#75](https://github.com/dnznlabs/rake/issues/75), the owner-declared token list**, labelled
  `m05` by decision 22. Its options (a) and (b) are contract changes, which this milestone cannot
  take, and (c) is dapp work that gates nothing on mainnet. Relabelled at close-out to the next
  version with this reason; not dropped.
- **The alpha marker's removal** (decision 45): 90 days after this milestone closes, its own PR.
- **Chains beyond `RUNBOOK.md` § 1's table.** A new chain is a new § 1 row with its proxy, alias and
  gateway readings first, not a variable.
- **A second `App` version or any dapp change that is not a document upload.** `app/` changes land
  through Run B as uploads; the post-UAT `app/` task is M04's and closes before Phase 2 builds the
  mainnet document; #227 (the log cache) is closed before mainnet by decision 62 and carried
  post-mainnet, so no ship decision on it is pending here.

## Needs from the Product Owner

Each decision is a `decision` issue opened by the architect when this file merges, in the five-line
form; the numbers here are the milestone's and the record is `ROADMAP.md` § Decisions.

- **M05-D1, the stale salts and the testnet redeploy.** *Question:* with `main`'s bytes no longer the
  bytes the salts were mined against (#201, #202), do the mainnets deploy from `main` at re-mined
  addresses with the two testnets redeployed to match, or at re-mined addresses with the testnets
  left at M04's? *Options:* (1) re-mine both salts against `main`'s init-code hashes (decision 37's
  run, 2.4 ms per salt at m03-t10; `cast create2 --deployer $PROXY --init-code-hash … --starts-with
  00d1`/`00a9`, `docs/milestones/m03/tasks/m03-t10/TASK.md:93-94`), then Run A, Run B and step 6
  again on Sepolia and Base Sepolia at the new addresses — costs about a week, testnet ETH, two more
  vault signing rounds for Denizen, one `create` per testnet from the step-6 key, and the M04 records
  marked superseded (README § Contracts, as § Which run is this already requires); buys one address
  set on all six chains, a Run A rehearsal of the exact bytes mainnet gets, and a DNZN distribution
  address that is the same on testnet and mainnet, which state-collection#74 and the featured panel
  (`mk/15-seed.mk`, decision 49) both assume. (2) re-mine and deploy the mainnets only — costs
  nothing now and two address sets forever: the testnets would be the one place the dapp's
  "same address" claim is false, and the Sepolia distribution decision 50 points at could never be
  reached on a mainnet. (3) re-pin 0.8.34 for the deploy — rejected: #201's reason was a compiler
  bug that "cannot be excluded by inspection", pinned "before anything reaches mainnet".
  *Recommendation:* (1). *Default and deadline:* (1), when this file merges; blocks m05-t01's
  redeploy half (the mining and the runbook amendments proceed under any option). *Record:*
  `ROADMAP.md` § Decisions, amending decision 37's "mined once" and the address literals in
  decisions 32, 37 and 50.
- **M05-D2, the key that signs step 6 and the salt it uses.** **Ruled 2026-11-18: option (1), decision 54.** *Question:* which key sends DNZN's
  `create` on the mainnets, given that decision 32 names the DNZN Creator key
  (`0x68e0741D…`, `RUNBOOK.md` § 0's `CREATOR` and `DNZN_SALT`) and decision 50 names the Sepolia
  distribution, whose salt begins with Denizen's own EOA `0x357836fF…902B`? Read from Sepolia on
  2026-11-18: `predict(0x357836fF…902B‖…0001)` is `0x71a4…7a4A`, its `owner()` is that same EOA, its
  `delay()` 3600; `predict(0x68e0741D…‖…0001)` is `0x6aC98EDA…` with no code. The salt's top 20 bytes
  must be `msg.sender` (decision 10), so decision 50's sentence "the `create` itself still comes
  from the Creator key" and its salt cannot both hold. *Options:* (1) the Creator key, salt
  `CREATOR‖…0001`, on all six chains — costs one `create` per testnet in m05-t01 so the address
  matches, and `mk/15-seed.mk:10`'s `FEATURED_SALT_DNZN`, which is Denizen's EOA salt today,
  becomes the Creator salt (a bundle change that rides t01's upload, decision 49); keeps decision
  32's org-wide rule (the creating key is part of the address forever and is
  never an owner or a table row) and the handbook's § The DNZN Creator key. (2) Denizen's EOA, salt
  `0x3578…902B‖…0001`, as on Sepolia — costs nothing now; makes a key that is also a beneficiary row
  and a wallet in daily use the permanent address-bearing key on every chain, which decision 32
  rejected ("never an owner or a signer for anything else"). *Recommendation:* (1). *Default and
  deadline:* (1); blocks step 6 of m05-t01 and the `DNZN_SALT` line of § 0. *Record:* `ROADMAP.md`
  § Decisions, amending decision 50's address and sender and leaving its description, table, delay
  and owner as ruled.
- **M05-D3, the go/no-go: does Ethereum wait for the paid review?** **Ruled 2026-11-18: option (3),
  decision 55 — no paid review; the self-review is the review of record and no mainnet transaction
  waits on a review result. The recommendation below was not taken, and the "until a paid review
  happens" wording it leans on is removed by the same transcription. Kept as asked.** Decision 20: "The paid review,
  the only kind that is *independent* in the overview § 10 sense, is an M05 go/no-go input, not a
  gate on M03 or M04 … It is a spend Denizen approves on a quote; nothing here commits it."
  [#167](https://github.com/dnznlabs/rake/issues/167) asked for quotes at M04's scoping and has no
  comment; its default — "request at M05's scoping and let M05's estimate absorb the weeks" — fires
  with this file. *Question:* does any mainnet transaction wait on the paid review's result?
  *Options:* (1) all four chains wait — costs the review's calendar (weeks, unmeasured until a quote
  exists) before the first mainnet byte; (2) Base first on the evidence that exists (three two-model
  runs, Slither, seven invariants, the alpha posture of decision 45 published on the page and in the
  README), then Ethereum, OP Mainnet and Arbitrum One after the review's result — a `fix` finding
  then costs Base's deploy (gas measured at 1.05× anvil on Base Sepolia, so tens of dollars at
  today's base fee) and one superseded row, not Ethereum's; (3) no paid review — rejected: the
  README's `AUDIT` cell and `SECURITY.md` say "two-model agent review" *until a paid review happens*,
  and this is the milestone that puts DNZN's own funds through the contract. *Recommendation:* (2),
  with the quotes requested now. *Default and deadline:* none — a mainnet transaction is a one-way
  door and a spend, so nothing in Phase 2 or 3 proceeds on a timeout; Phase 2 starts on Denizen's
  written go, Phase 3 on the review's dispositions in `SECURITY.md` or his written waiver. Blocks
  m05-t02. *Record:* `ROADMAP.md` § Decisions as an amendment to decision 20; the accepted quote is
  its own decision.
- **M05-D4, where the mirror lives and which DNZN app embeds the widget.** *Decision 66
  (2026-11-20) supersedes decision 59 below: `rake.dnzn.dev` serves a gw44 gateway with static
  widget copies, not a mirror. The app that embeds the widget is still open.* **Ruled in part
  2026-11-19 ([#256](https://github.com/dnznlabs/rake/issues/256)), decision 59: the mirror is
  `rake.dnzn.dev` on GitHub Pages, published by a make target of the shape
  `make deploy-ghpages-mirror`, with `/widget.js` at the path it has on chain; the chain is the
  option-(1) default, Ethereum, until m05-t04's scoping. Still open: the DNZN app that embeds the
  widget, named at m05-t04's scoping as the default below says.** *Question:* which URL
  under dnzn.dev serves the mirror, which chain's bundle it serves (`make dapp-nodev` builds per
  chain, and Sepolia's and Base Sepolia's `inflated sha256` differ in § Uploads rows 3 and 4 while
  their widget hash is one), and which DNZN app carries the widget? *Options:* (1) the mirror serves the
  Ethereum bundle and the widget goes into the app Denizen names — costs one static file and one
  snippet on his side; (2) a landing under dnzn.dev that links each chain's gateway URL and serves no
  bundle — costs nothing on our side and is not a mirror in decision 12's sense. *Recommendation:*
  (1), the host decision 41 already chose. *Default and deadline:* (1) with the app named at
  m05-t04's scoping; blocks m05-t04. *Record:* `ROADMAP.md` § Decisions.
- **Mainnet ETH, three keys, estimates labelled as such.** Measured gas on the testnets: Run A
  steps 2 + 3 cost **28,296,098** gas on Sepolia and **4,035,842** on Base Sepolia; Run B's three
  `executeQueued` cost **85,666,566** and **12,206,026** (§ Uploads rows 3 and 4); a `create` is
  280,281 gas on anvil. Sepolia prices code deposit about 7× what Base Sepolia does, and whether
  Ethereum prices like Sepolia is **unmeasured** — step 1e's `cast estimate --create`
  (`RUNBOOK.md:310`) reads it per chain without a key or a wei, and m05-t01 does that on all six
  mainnets first. Base fees read 2026-11-18: Ethereum 0.149 gwei, OP Mainnet 0.0000075 gwei, Base
  0.005 gwei, Arbitrum One 0.02 gwei. At those prices and Sepolia's pricing, Ethereum's Run A is
  about 0.004 ETH and its Run B about 0.013 ETH; **at 5 gwei the same two are 0.14 and 0.43 ETH**,
  which is why the stop rule of criterion 6 exists and why the figures here are a margin, not a
  forecast. The L2s' L1-data component is also unmeasured and the upload is about 56 KB of
  calldata per chain (111,710 hex characters across the three committed files of § Uploads row 3). Keys: the **engineer's wallet** `0x5A158aF8…` signs steps 2, 3 and the
  `executeQueued` calls — holds 0.0051 ETH on Ethereum and 0 on Base today; ask **0.03 ETH on
  Ethereum and 0.02 ETH on each L2**, funded per chain as its task starts, not all at once, with
  the stop rule criterion 6 restores set at **1 gwei** base fee on Ethereum: 0.03 ETH covers Run A,
  Run B and step 6 up to about that price on Sepolia's pricing, and a fee held above it for days is
  a top-up and a raised rule by Denizen's word, not a buffer pre-funded in a hot key. (Amended
  2026-11-18 from "0.2 ETH on Ethereum", which was a margin against 5 gwei; Denizen, Telegram,
  15:38 CST: "I can live with .02ish" — the expected spend at today's fee, labelled an estimate,
  since whether Ethereum prices code deposit like Sepolia or like Base Sepolia is what m05-t01's
  keyless estimate measures first.) The
  **step-6 key** M05-D2 picks needs about 0.005 ETH per chain (the Creator key holds 0 on Ethereum
  today). **Denizen's signing account** pays the three proposal submits per chain, as it did on the
  testnets. The handoff records what was spent, per key per chain.
  **Conditioned 2026-11-22 ([#279](https://github.com/dnznlabs/rake/issues/279)).** The 0.03 ETH
  figure was sized at Ethereum's code-deposit rate of about 218 gas per byte and a base fee of
  0.57 gwei, both read 2026-11-19 (`RUNBOOK.md` § 1). It does not hold if Ethereum adopts EIP-8037
  before a cut, or at a base fee a few times that. Each deploy task re-reads both at its gate and
  re-sizes its ask before any funding is requested. m05-t02 asks for the contract sends only, an
  estimate: 0.002 ETH on Base and 0.01 ETH more on Ethereum for the engineer's key, and about
  0.0005 ETH on Base and 0.002 ETH on Ethereum for the Creator key's two `create`s. m05-t03 sizes
  the uploads.
- **Signatures: two `create`s and six vault co-signatures**, for Base and Ethereum (decision 70).
  Each mainnet is three Run B proposals co-signed through the coordination service (decision 47's
  route; the engineer proposes, Denizen co-signs, the engineer executes after the vault's hour), then
  one `create` from the step-6 key by hand with the exact command in the task's handoff. **Whether
  the signing app and the coordination service support each of the four mainnets is unmeasured** —
  it did not support Sepolia, which is what moved the route in #191 — and m05-t01 asks before
  anything is proposed; the fallback the handbook names, on-chain `approve(digest, true)`, is
  unverified in source and would be a runbook change first.
- **An Etherscan v2 API key** for step 5 on the four chains (one key covers etherscan.io, basescan.org,
  arbiscan.io and optimistic.etherscan.io in forge's chain table; **the stretch chains' explorers and
  whether forge resolves them are unverified**, m05-t05's first step), handed to the engineer's
  session and never committed.
- ~~**Quotes for the paid review, now** (#167's default), and the spend decision when one arrives.~~
  Withdrawn by M05-D3 (decision 55): no paid review, no quote request.
- **Pages on this repository for `rake.dnzn.dev`** (GitHub Actions as the source, the custom
  domain, HTTPS enforced), **the `GW44_READ_KEY` secret here and organisation access on
  `dnznlabs/gw44`'s Actions settings**, filed as [#320](https://github.com/dnznlabs/rake/issues/320) and closed 2026-11-21, and
  needed by its step 5; the DNS record is in place (read 2026-11-21). **And the widget embedded**
  under M05-D4, on Denizen's side, at m05-t04b; and the Base signoff line under Phase 2 after the first real `distribute`.
- **A branch protection rule on `main`**: `ROADMAP.md` § Not on the roadmap says "revisit at M05's
  go/no-go". A plan question for Denizen at M05-D3; it changes nothing in the criteria.

## Phases

In order, as re-scoped on 2026-11-22 (decision 70). Phase 1's redeploy fixes the addresses, so it
merged before anything is sent to a mainnet. Phase 2 places the contracts on Base and on Ethereum
and uploads nothing. Phase 3 uploads the document, to Base and then to Ethereum, and needs Phase 1's
last task (the document a wallet has been run against) and Phase 2's merge. Phase 4's gateway
(m05-t04) needed no mainnet and is done; its embed (m05-t04b) follows Phase 3.

**Two chains, the two the testnets rehearsed.** DNZN's own products are built on Ethereum, Base is
the one other chain the Product Owner wants live at launch, and Sepolia and Base Sepolia are the
only chains the runbook has run on. The other four add nothing DNZN needs at launch and cannot be
lost by waiting: an address can only ever hold our own bytes (`CREATE2` through the proxy, with
`App`'s owner inside the init code), and only the Creator key can create DNZN's distribution. So
they wait until these two have been in real use, and a `fix`-grade finding in that time supersedes
two deployments and not six. Inside Phase 2 the order is Base, then Ethereum, with a stop between
them: Base is the cheapest place to meet a runbook surprise and Ethereum the dearest. Rejected, and
the plan until 2026-11-22: the four chains of decision 4 in two tasks, Base end to end and then the
other three, with a stretch row for two more.

### Phase 1 — Same bytes everywhere

The salts re-mined against `main`, the runbook amended by everything M04 found, and both testnets
redeployed so six chains share one address set before any mainnet does; beside it, the three
reader-verifiable additions to the self-review that decision 56 puts before the first mainnet deploy.

| Task | Goal | Status |
|:-----|:-----|:-------|
| m05-t01 | **Re-mine, amend, redeploy.** Decision 37's mining run against `main`'s init-code hashes (M05-D1; `0x00d1…`/`0x00a9…`, m03-t10's commands), `RUNBOOK.md` § 0 rewritten with the new salts and addresses and the stale block removed; the Step 5 read-back loop made an assertion ([#207](https://github.com/dnznlabs/rake/issues/207)); a per-chain chunk gas term — `cast estimate --create` of the factory on each of the six mainnets (step 1e) read into a table beside § 1, and `tools/step4-calldata.mjs`/`scripts/forge/Chunks.s.sol:13`'s `MAX_CHUNK` given a per-chain size where a 24,000-byte chunk would not clear the chain's block limit with margin ([#188](https://github.com/dnznlabs/rake/issues/188); Ethereum's limit read 60,000,000 and OP Mainnet's and Base's 40,000,000 on 2026-11-18, against a 37.8 M-gas chunk at Sepolia's pricing); the base-fee stop rule restored or its citation corrected (criterion 6); § 0's step-6 block filled with decisions 50 and 51's values and M05-D2's key; the signing app's and coordination service's mainnet chain support read and recorded. Then Run A steps 1–5, Run B and step 6 on Sepolia and Base Sepolia at the new addresses, § Executed on testnets amended, README § Contracts marking the M04 rows superseded, state-collection#74 told the new prediction; then M04 criterion 6's wallet run — Denizen through the gateway URL on both redeployed testnets, driven by m04-t05's `UAT.md` on the m04-t16 bundle, the signoff line in this task's handoff (decision 63); **and M04's four transferred clauses as Part B criteria 18c–18f (decision 64)** — criterion 1's artifact comparison against `main` and DNZN's address at the new factory, criterion 3's chain document and both hosted gateway checks after the Run B upload, and criterion 5's host page regenerated against the new addresses and published once by the Product Owner. Closes #207, #188 | done — Part B [#330](https://github.com/dnznlabs/rake/pull/330) merged 2026-11-21, #271 closed; criterion 18b moved to m05-t01c step 9, and 18f's publish is pending under [#303](https://github.com/dnznlabs/rake/issues/303) |
| m05-t01b | **Threat model, coverage floor, mutation run** (decision 56, [#262](https://github.com/dnznlabs/rake/issues/262)). `docs/THREAT_MODEL.md` listing actors, token classes, chains and what each assumption's test is, each row naming a test `forge test --list` returns, diffed against the Solodit checklist and two Pashov fee-distribution reports; a `forge coverage --ir-minimum` summary committed with a CI floor one point under the measured figure; `slither-mutate` over `src/` with `forge test`, results committed per commit, every survivor given a test or a one-line reason. The next `audits/<date>/AUDIT.md` provenance block names the coverage floor and the mutation score beside the leg versions. § Out of scope's first line holds: a survivor whose only remedy is under `src/` is recorded with its reason, not fixed | done — [#292](https://github.com/dnznlabs/rake/pull/292) merged 2026-11-19; campaign at `audits/mutation/e770054/`, 755 of 847 caught, no `src/` byte moved; carries #127 and [#293](https://github.com/dnznlabs/rake/issues/293) |
| [m05-t01c](tasks/m05-t01c/TASK.md) | **The wallet picker and the phone links** (decision 67). Connect lists every announced wallet extension; on a phone with no wallet found it offers "Open in <wallet>" links, only for wallets seen to work on a phone first. The header names its chain with no wallet (#328) and `rake.recent` is kept apart by chain. One Run B upload on both testnets and the Product Owner's wallet run on the result (m05-t01's criterion 18b, moved here), so the document m05-t03 uploads to Base is this one | done — [#386](https://github.com/dnznlabs/rake/pull/386) merged 2026-11-22: uploaded to both testnets, the Product Owner's signoff in the handoff. On Base Sepolia five history rows were not met ([#382](https://github.com/dnznlabs/rake/issues/382)) and are closed by m05-t01d |
| [m05-t01d](tasks/m05-t01d/TASK.md) | **The document mainnet gets.** The five findings of m05-t01c's acceptance run: reads that belong to the page's chain go through the page's chain (#375, #379), a refused write keeps the node's sentence (#373), the page says how much history its endpoint served (#382), the action hash is named (#385). The `#/docs` snippet moves to `rake.dnzn.dev` here, from m05-t04b, so no mainnet needs a second upload for it. One Run B upload on both testnets, the gateway redeployed and read back, the driver passing on both | done — handoff [#419](https://github.com/dnznlabs/rake/pull/419) merged 2026-11-26: uploaded to both testnets on 2026-11-26 from `4fb6296` (§ Uploads rows 7 and 8), the gateway redeployed and read back, the driver exit 0 on both, the 24-hour read 10 of 10 on all four chains. Carries [#420](https://github.com/dnznlabs/rake/issues/420), [#421](https://github.com/dnznlabs/rake/issues/421), [#417](https://github.com/dnznlabs/rake/issues/417) |

### Phase 2 — The contracts, on Base and Ethereum

Base (8453), then Ethereum (1), contracts only. No document is uploaded and nothing is proposed to
the vault in this phase.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m05-t02](tasks/m05-t02/TASK.md) | **The contracts on Base and Ethereum.** Before any send: step 1e's gas-limit rule written as procedure ([#308](https://github.com/dnznlabs/rake/issues/308)), § 4a's comparison made a stop ([#359](https://github.com/dnznlabs/rake/issues/359)), the test [#293](https://github.com/dnznlabs/rake/issues/293) asks for, and decision 56's bytecode attestation built against the two testnets. Then, per chain, Run A steps 1, 2, 3 and 5 with every `record:` line read from the chain, the native-balance check re-run ([#127](https://github.com/dnznlabs/rake/issues/127)), `deployments/<chainId>.json`, and DNZN's `create` prepared by the engineer and sent by the Product Owner from the Creator key; § Executed on mainnets opened, two README rows. A stop before Ethereum on any deviation on Base, and at anything that touches `src/`. The architect's second update to state-collection#74, with the landed mainnet `DISTRO`, follows this task's merge | done — Part A [#365](https://github.com/dnznlabs/rake/pull/365), Part B [#371](https://github.com/dnznlabs/rake/pull/371) and criterion 2's record [#372](https://github.com/dnznlabs/rake/pull/372) merged 2026-11-22: contracts on Base and Ethereum, attested, DNZN's distribution created on each |

### Phase 3 — The documents

The document on Base and then on Ethereum, through the Ops vault, each chain added to the gateway
as its upload lands.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m05-t03](tasks/m05-t03/TASK.md) | **The document on Base, then on Ethereum.** Run B on each: the cut from the tip of `main`, three proposals at the vault's live nonce, co-signed, executed after the vault's delay, 4d's byte comparison before the batch is executed; `make gateway-check` against `https://<App>.<chainId>.w3link.io/`; the chain added to `rake.dnzn.dev` by `RUNBOOK.md` § The gateway, with `/` going to Ethereum once its document is up and never to Base (decision 70); a § Uploads row each. Ethereum's base fee against the stop rule before every send. On Base, the first deposit and `distribute`, and the signoff below. A chain's upload needs that chain's `create` landed, or its featured panel has nothing to paint | **done 2026-11-26** — the document is on Base and Ethereum, three `executeQueued` per chain through the Ops vault at vault nonces 3, 4, 5, read back equal to each chain's own build (`RUNBOOK.md` § Uploads rows 9 and 10, twelve transactions); `rake.dnzn.dev` serves all four chains with `/` on Ethereum (#436); the first deposit and `distribute` ran on Base and are the signoff below (#433). Records and handoff in [#437](https://github.com/dnznlabs/rake/pull/437) |

m05-t05, the stretch row for MegaETH and Robinhood Chain, is withdrawn with the other two chains
(decision 70).

**Signoff:** **2026-11-26 — Denizen, on [#433](https://github.com/dnznlabs/rake/issues/433): "Verified
all three on Base."** He opened DNZN's distribution at `rake.dnzn.dev/8453/` from his own wallet,
deposited 0.001 ETH and pressed `distribute`, and ticked all three of that issue's boxes: the page
naming Base with the three rows, the owner and the delay; `waiting to distribute` showing the amount
after the deposit; and the return to zero with the split in `activity` after it ran. Read back from
the chain in the same issue — deposit `0xee99eb54…8ecfdd5` in block 62,651,967 and
`distribute(0x0)` `0x6564ba6e…30f06b83` in 62,652,371, both `status 1`, the distribution's balance
0.001 → **0**, and treasury **+0.0002** / ops **+0.0004** / creator **+0.0004**, summing to the
deposit exactly.

### Phase 4 — Served under dnzn.dev and embedded

The dapp at `rake.dnzn.dev` and the widget inside a DNZN product, as decisions 12, 41 and 66 say.
The gateway no longer waits for a mainnet: it is deployed on the two testnets first (decision 66
as amended 2026-11-21), and **m05-t03 adds each chain to it as that chain's document lands**, through
the `RUNBOOK.md` section m05-t04 writes. The first mainnet added becomes the chain `/` lands on.

| Task | Goal | Status |
|:-----|:-----|:-------|
| [m05-t04](tasks/m05-t04/TASK.md) | **The gateway, on the two testnets.** `deploy/gw44.json`, `deploy/chains.json` and a dispatch-only workflow calling gw44's `deploy-pages.yml` at a pinned commit; `rake.dnzn.dev` serving `App` on Sepolia and Base Sepolia with static `widget.js` copies; gw44's `check-site` and `verify` passing against it; `RUNBOOK.md` § The gateway, which later tasks follow to add a chain; one README row | done — [#321](https://github.com/dnznlabs/rake/issues/321) closed 2026-11-21 |
| [m05-t04a](tasks/m05-t04a/TASK.md) | **`/` lands on Sepolia while rake is testnet-only** (decision 68). The default chain in `deploy/gw44.json` becomes `11155111`, one deploy, and the reading gw44#85 waits for, taken across it with the browser left open | done — [#333](https://github.com/dnznlabs/rake/pull/333) and its handoff [#337](https://github.com/dnznlabs/rake/pull/337) merged 2026-11-21; the open-browser reading for gw44#85 was not taken and is carried to the next gateway deploy |
| m05-t04b | **The embed.** The `#/docs` snippet's host changed to `rake.dnzn.dev/<chain id>/widget.js` with its `integrity` attribute, checked against what the deploy printed; the widget placed in the DNZN app named at this task's scoping, with the screenshot of criterion 5; README § Release Info's "deployed to Sepolia and Base Sepolia only" sentence rewritten, `0.1alpha` kept (decisions 45 and 48). `app/` changes ride one Run B upload on every live chain, so this task waits for the chain list to be final | done 2026-11-26, with no engineer task — the `#/docs` snippet moved in m05-t01d; the embed is the widget's test page, published by the Product Owner at `research.dnzn.dev/tmp/rake-widget-test.html` and read back rendering DNZN's table from Ethereum (decision 73, [#438](https://github.com/dnznlabs/rake/issues/438), [screenshot](tasks/m05-t04b/embed-ethereum.png)); README § Release Info rewritten in the same PR. The host-page publish of [#303](https://github.com/dnznlabs/rake/issues/303) is this |

### Phase 5 — Close-out

The architect re-runs criteria 1–8, records them in `CLOSEOUT.md` beside this file, fills § Carried
issues at close-out, comments on state-collection#74 with the live chains and the address, opens the
`lock()` decision issue with a proposed watch period, notes the date decision 45's 90-day clock
starts, and hands M07 nothing it needs. No task.

**Estimate, labelled as one:** nine tasks, one optional; three to five weeks of calendar time, of
which m05-t01 is about one week (two testnet signing rounds and two `create`s by hand), m05-t01b
under two days of agent time beside it (decision 56's figure, unmeasured), Phase 2 a
few days after the go, and the rest is Denizen's signing sessions — two `create`s and six
co-signatures (decision 70). The earlier six-to-ten-week figure carried a paid review's lead time,
which M05-D3 (decision 55) removed. Re-estimate when m05-t02 reports.

## Carried issues at close-out

**Filled at close-out, 2026-11-26: [`CLOSEOUT.md`](CLOSEOUT.md) § Carried issues is the record of where each open issue went.** The table below is the queue as it stood when the milestone was scoped. The queue then, 2026-11-18 — every open issue labelled `m05`, plus the M04
issues whose body names this milestone:

| Issue | Where it lands |
|:------|:---------------|
| [#207](https://github.com/dnznlabs/rake/issues/207) Step 5 read-back gate | t01; criterion 2. |
| [#188](https://github.com/dnznlabs/rake/issues/188) chunk gas term | t01; the per-chain table and `MAX_CHUNK` per chain, before any mainnet upload. |
| [#127](https://github.com/dnznlabs/rake/issues/127) native-balance alias (F12) | t02 re-runs the check on Base and Ethereum at its gate. It stays open for the four chains not deployed in this milestone and is relabelled at close-out with that reason. |
| [#308](https://github.com/dnznlabs/rake/issues/308) gas-limit rule, [#359](https://github.com/dnznlabs/rake/issues/359) § 4a's stop, [#293](https://github.com/dnznlabs/rake/issues/293) views mid-`distribute` | t02 Part A, before any mainnet send. |
| [#279](https://github.com/dnznlabs/rake/issues/279) the 0.03 ETH ask | Conditioned in § Needs from the Product Owner on 2026-11-22; t02's gate re-sizes it. Closed by that change. |
| [#167](https://github.com/dnznlabs/rake/issues/167) paid review quotes | Ruled 2026-11-18, option 3, decision 55: no paid review, no quote request. Closes on the transcription's merge. |
| [#75](https://github.com/dnznlabs/rake/issues/75) token list | Not M05's: every contract-side option is a new version (decision 5). Relabelled at close-out with that reason. |
| [#235](https://github.com/dnznlabs/rake/issues/235) build hardening (m04-t14), [#243](https://github.com/dnznlabs/rake/issues/243), [#241](https://github.com/dnznlabs/rake/issues/241) | #235 closed in M04. #243 and #241 were fixed in m04-t15 ([#277](https://github.com/dnznlabs/rake/pull/277)) and close on the 4d read of m05-t01c's testnet upload, which carries that bundle; nothing is left to build for either before the mainnet document. |
| [#227](https://github.com/dnznlabs/rake/pull/227) the log cache (m04-t12), [#221](https://github.com/dnznlabs/rake/issues/221), [#165](https://github.com/dnznlabs/rake/issues/165) | Closed before mainnet by decision 62 (2026-11-19): #227 unmerged, branch kept; #221 and #165 carried post-mainnet, reassessed after this milestone's mainnet upload with a per-load figure from a chain that costs something. Not a gate on anything here. |
| [#309](https://github.com/dnznlabs/rake/issues/309) snippet order | t01, decision 65: `#/docs` leads with the `data-rpc` form. Plan step 13a, before step 14's upload is signed, so the testnet wallet run and every mainnet document carry it; criterion 18g. |
| state-collection#74 | The architect posts each update: the new prediction at t01, the landed mainnet address at t02; close-out names the live chains. |

## One-way doors

Mainnet transactions are public, permanent and paid for. In the order they close:

1. **`App`'s mainnet address, at Base's step 3.** From that block, any byte under `src/` or in the
   compiler pin is a new `App` on every chain with Base's old one live and superseded forever —
   the property decision 5 protects, now with money behind it. M05-D1's mining is what fixes the
   address; Base's transaction is what makes it a door.
2. **The step-6 key and salt, at Base's `create`.** Decision 10: the sender's address is in the
   salt, so the key that creates DNZN's distribution on the first mainnet is the only key that can
   reproduce its address on the next (#23), and `create` runs once per chain and never again on it
   (#22). M05-D2 chooses before this closes, not after.
3. **Spend.** A failed send burns what it burns: Sepolia's first step-2 attempt burned 2,833,494 gas
   (§ Record — Sepolia), which on Ethereum at 5 gwei is 0.014 ETH for nothing. Step 1e's estimate and
   the base-fee stop are what stand before every send; the handoff records every failed attempt by
   hash.
4. **Money starts to flow.** state-collection#74 sets a `PAYEE` on the chains this milestone makes
   live, and the first `distribute` on Base moves real ETH to the three table rows. Decision 50's
   seven-day delay is the guard on the table, not on the address.
5. **The public record.** README's "No mainnet deployment exists" is replaced and the explorers show
   verified source under DNZN's names; additive, named because it is the first time the addresses
   are published as live.

## Risks

Things that would cost a redeploy, a re-upload or real ETH to learn late. Each says what settles it.

1. **Code-deposit pricing on the four chains.** Sepolia charged ~7× anvil for the same init code and
   a 24,000-byte chunk estimated 37.8 M gas there; Ethereum's block limit read 60,000,000 and OP
   Mainnet's and Base's 40,000,000 on 2026-11-18. If a mainnet prices like Sepolia, one chunk is
   63% of Ethereum's block and 95% of a 40 M one. Settled by t01's step 1e read on all six mainnets,
   with no key and no gas, before `MAX_CHUNK` is fixed per chain — which is #188 closed by
   measurement rather than by guess.
2. **The signing route on mainnet.** Decision 47's route depends on the coordination service and
   Denizen's signing app supporting each chain; Sepolia was not supported in November, which is why
   the engineer became an Ops owner. Settled by t01 asking, per chain, before anything is proposed;
   a chain the service cannot sign for is a runbook change (on-chain `approve`), not an improvisation
   on deploy day.
3. **A `fix`-grade finding after deploy** — from the self-review's next run, a reader, or a later
   bounty (decision 55). Then `src/` reopens, the salts are mined again, and whatever is deployed is
   superseded. Bounded, not settled: no review precedes mainnet now, so the ordering inside
   m05-t02 is the only hedge — Base first, a stop before Ethereum; decision 70 keeps it to two
   deployments until both have been in real use — and the alpha posture of
   decision 45 is published where a visitor sees it.
4. **The hosted gateway's chain list.** Measured 2026-11-18 for 1, 10, 8453 and 42161 (resolved) and
   4326 and 4663 (no answer). Settled for the four; the stretch row's first step for the other two,
   with decision 53's `web3://` direct and the self-run gateway as the fallback the docs already name.
5. **Ethereum gas at the hour of the send.** Base fee read 0.149 gwei on 2026-11-18 and the same chain
   has priced in tens of gwei. Settled by the stop rule criterion 6 restores and by t03 reading
   `cast base-fee` before every send on chain 1; the handoff records the price paid.
6. **A mainnet upload that lands the pieces out of order.** 4c's silent misorder — chunk 1 at chunk
   0's nonce — was seen on Sepolia and does not revert. Settled by 4d's byte comparison at each
   predicted pointer (§ Uploads, rows 3 and 4), which the task runs before `batch345` is executed,
   never after.
