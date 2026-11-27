# m03-t09 — handoff

PR: #146 · Branch: `m03/t09-dapp` · 2026-11-03

The dapp now tells the truth about t08's ABI. `GRACE()` is read once at boot beside
`MAX_BENEFICIARIES()` and carried as `S.grace`, so nothing on the page copies the constant; a pending
row reads by phase — queued, ready with the date it expires at, or expired in the error tint — the
apply control refuses an expired entry by date, and the cancel control is the owner's inside the
window and anyone's outside it. The escrow row offers `claim` to the escrowed account, a transaction
for that account and calldata for a vault it signs for, with a `to` field resolved through the owner
field's own `addrField`. `Expired(uint256)` is the tenth custom error `revertMessage` names, `Claimed`
is the fifth fund event, and a `Received` from the zero address reads `present at creation`. #137's
two items land: a queued `setDelay` that lowers the delay carries a `bad` line, and `loadDistro` falls
back to five bounded views plus the queue log when the one-call view will not answer. The widget says
`expired` against a literal `GRACE` its own test pins to `14 * 86400`. Six commits, seven files, none
of them under `src/`, `test/*.t.sol` or `.gas-snapshot`.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 — nothing moves under `src/`, `test/*.t.sol`, `.gas-snapshot` or the two scoped deploy scripts; `forge snapshot --check` exit 0 | **pass** | `git diff --stat origin/main -- src/ test/*.t.sol .gas-snapshot scripts/forge/Deploy.s.sol scripts/forge/DeployApp.s.sol` → no output. The whole branch is 8 files — this handoff plus the 7 the code commits touch: `git diff --stat origin/main` at `59878f9` → `AGENTS.md 2+-`, `app/src/index.html 208`, `app/src/model.js 47`, `app/src/widget.js 10`, `scripts/forge/Fixtures.s.sol 24`, `test/model.test.mjs 45`, `test/widget.test.mjs 28` — `306 insertions(+), 58 deletions(-)`. `devbox run -- forge snapshot --check` → `exit=0`, `Ran 5 test suites: 86 tests passed, 0 failed`; `grep -c '' .gas-snapshot` → `86`. Order mattered: `forge build --force` (exit 0) ran before the count, never `forge lint` first. |
| 2 — more node tests than step 0, count stated; `0xf80dbaea` in both files; the widget's two tests | **pass** | Step 0 at `679d1b8`: `devbox run -- node --test test/*.test.mjs` → `tests 62 · pass 62 · fail 0`. Now → `tests 67 · suites 0 · pass 67 · fail 0`. `grep -c '0xf80dbaea' app/src/model.js test/model.test.mjs` → `test/model.test.mjs:1`, `app/src/model.js:1`. `devbox run -- node --test test/widget.test.mjs` → `✔ a decoded pending entry past the window renders expired`, `✔ the widget's GRACE literal is the contract's fourteen days`. |
| 3 — the five greps | **pass** | `grep -c 'GRACE' app/src/index.html` → `4` (≥ 2). `grep -c 'claim(address,address)' app/src/index.html` → `1` (≥ 1). `grep -c 'Claimed(address,address,address,uint256)' app/src/index.html` → `1` (≥ 1). After `devbox run -- make dapp-nodev`: `grep -c 'nosnapshot' app/dist/index.html` → `0` (the dev build has `1`). `grep -c -i 'or cancelled again' app/src/index.html` → `0`. |
| 4 — `wc -c app/dist/widget.js` under 10,240, with the headroom | **pass** | `wc -c app/dist/widget.js` → `8043`. Build line: `widget: raw 8043 bytes · budget 10240 · 2197 left`. **2,197 bytes of headroom**, up from 2,320 at t08's head (7,920 → 8,043, +123). |
| 5 — the step 7 walk, with receipts and DOM text | **pass** | § The anvil walk below: three `status`-true receipts (the stranger's cancel, the claim, and the claim's `Claimed` log), the stranger's pre-expiry cancel reverting `0x30cd7471`, and DOM text for all three phases, both arms of the lowering line, the claim control and the fallback notice. |
| 6 — criterion 8 re-run: `inflated sha256` equals `sha256sum app/dist/index.html`, both byte counts | **pass** | After `make dapp-nodev`: `sha256sum app/dist/index.html` → `2a8eb21676b620e144e6c8571da3b7757d87f8843a62021dc8ef849e1c719412`, `wc -c` → `133136`. `make chain-doc` → `inflated bytes 133136`, `inflated sha256 2a8eb21676b620e144e6c8571da3b7757d87f8843a62021dc8ef849e1c719412`. Equal on both the hash and the count. Widget too: `widget bytes 8043`, `widget sha256 7cd0f4d3e9a1dd1a7a8200970f96a9056cad02350f5217a383121bfa1a781f0e`, and `sha256sum app/dist/widget.js` → the same hash. |
| 7 — every line of m03-t08's § For t09 disposed of, one row each | **pass** | § t08's § For t09, line by line below: seven bullets, seven rows. |
| 8 — #137 closes on merge | **pass** | The PR body carries `Closes #144, closes #137`; `gh pr view 146 --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]\|sort'` → `[137,144]`, and a direct GraphQL query → `totalCount 2`. Read three times across two independent paths — § Closing-reference verification. |

### The gates, in the order they were run

`forge build --force` first, because a `forge lint` run after a test edit drops that suite from
`--list` and makes `snapshot --check` exit 0 on code it never ran.

| Gate | Result |
|:--|:--|
| `devbox run -- node --test test/*.test.mjs` | exit 0 · `tests 67 · pass 67 · fail 0` |
| `devbox run -- forge build --force` | exit 0 · `Solc 0.8.34 finished in 11.33s · Compiler run successful!` |
| `devbox run -- forge test` | exit 0 · `Ran 5 test suites: 86 tests passed, 0 failed, 0 skipped (86 total tests)` |
| `devbox run -- forge test --list --json \| jq '[.[]\|to_entries[]\|.value[]]\|length'` | `86` — t08's deviation 6's instrument, not `--list \| wc -l` |
| `devbox run -- forge snapshot --check` | exit 0 · `86 tests passed` |
| `devbox run -- forge lint` | exit 0 · no findings (3 lines of output, all devbox and "No files changed") |
| `devbox run -- forge fmt --check` | exit 0 · no output |
| `git status --porcelain` | empty, before and after the gates |

Everything ran from the repo root through `devbox run --` (forge/cast `1.7.1-dev`). The `jq` pipeline
above ran inside `devbox run -- bash -c`, because `jq` is not on the bare PATH here and would have
yielded an empty count that passed vacuously.

## Step 0 — the ABI is t08's

`devbox run -- bash -c "forge inspect Distribution abi --json | jq -r '.[]|select(.type!=\"constructor\")|.name' | sort | grep -c -E '^(claim|Claimed|Expired|GRACE)$'"`
→ **4**, the four being `claim`, `Claimed`, `Expired`, `GRACE`.
`grep -c 'claim(address,address)' test/fixtures/abi/selectors.txt` → **1**. #143 had merged under me
(`git merge-base --is-ancestor 679d1b8 origin/main` → yes; the branch is off `679d1b8` exactly).

The four selectors the plan quotes were re-measured rather than carried: `cast sig "claim(address,address)"`
→ `0x21c0b342`, `cast sig "GRACE()"` → `0x137d29d9`, `cast sig "Expired(uint256)"` → `0xf80dbaea`
(the error's four bytes; `cast sig-event "Expired(uint256)"` → `0xf80dbaea4785…`, the same prefix),
`cast sig-event "Claimed(address,address,address,uint256)"` →
`0x913c992353dc81b7a8ba31496c484e9b6306bd2f6c509a649a38fdf5e1c953b2`. `GRACE()` read off the live
chain → `1209600`. All four as the plan had them.

## t08's § For t09, line by line

| t08's line | Where it landed |
|:--|:--|
| `ERRORS` needs `Expired(uint256)`; an expired action renders as unknown four bytes | Step 1. `ERRORS['0xf80dbaea']` decodes the eta and prints `that change expired — it could be applied until 2025-10-23 08:53 UTC and anyone may cancel it now`. `AGENTS.md` § The dapp now says **ten** custom errors. Row added to the `revertMessage` table test with its `cast sig` comment. |
| The pending view needs a deadline beside its countdown; after it the row should read expired, not ready | Step 3. The ready eyebrow is `ready to apply · expires in <countdown to eta + GRACE>`; past it, `expired · anyone may cancel` in the `err` tint. `Model.countdown` takes an optional third argument and `Model.deadline(eta, grace)` is new; both tested, including the `eta + GRACE` boundary, which is still applicable. |
| A cancel-expired control, available to anyone and not only the owner | Step 3. `pendingActs` renders cancel as a direct `sctl` with status `expired — anyone may clear it` when expired, and as the owner's `wctl` with `cancel is the owner's until the window closes` otherwise. Walked: account 2's cancel of an expired entry landed `status` true. |
| The escrow view needs a `claim` control for the connected account, `to` defaulting to the account itself | Step 4. `escrowActs` renders `claim` for `same(ACC, e.ac)` as a transaction and for `signsFor(e.ac)` as copy-calldata, with a `to` field defaulting to the account and resolved by `addrField`. Walked: account 1 claimed 40e18 to account 3, `status` true. |
| `GRACE()` is a new view the page can read rather than hard-coding fourteen days; the prose spells the number out | Step 2. `GRACE()` joins the boot read as `S.grace`, a `BigInt`. t08's `#/docs` prose keeps "fourteen days" — the plan rules it a document, and a change to the constant is a new version of that document. The drawer prose now derives its figure: `then stay applicable for ${delayText(S.grace)}`. |
| #137's items — the pending-queue fallback to logs, and the un-highlighted `setDelay` that lowers the delay | Steps 5 and 3. The fallback reads `owner()`, `delay()`, `nonce()`, `description()`, `beneficiaries()` and rebuilds `_pending` from the `Queued` logs, with a `warn` notice. The lowering flag has both arms: `lowers the delay from 7d to 3d` and `removes the delay — after this, changes apply the moment they are proposed`, both `status bad`. |
| The `Received(address(0), …)` log at `init` is a new shape for the funds block's token-in scan | Step 4. `entry`'s `in` branch prints `present at creation` for a zero sender instead of a link to `0x000…0`. Walked on the fixtures' escrow demo: `in · Ξ1.0000 present at creation`. An ERC-20 `Transfer` from the zero address is a mint and keeps its link — that path is `tokenIn`'s, and it was deliberately left alone. |

## The anvil walk

A spare port set, checked first with `ss -ltn` (only `38617` and `18789` were listening): anvil on
**8555**, `serve` on **3009**, chain id 31337. `make deploy RPC=http://127.0.0.1:8555` then
`make fixtures RPC=http://127.0.0.1:8555`. Addresses: factory
`0xE3b765b5eE413B939A23fD6B505c199B3342a67e`, App `0x9fFEe2c1C0c79C81DFCc4E9e3A1007407D39E2A1`,
featured `0x6FaB073Da30B801d71201BDa6218dBAdF4566b80`, escrow demo
`0xDB951541377C02Fb4663503Ce018444B55AeCfB5`, blocklist token
`0x68B1D87F95878fE05B998F19b66F4baba5De1aed`.

The browser check ran with `playwright-core` 1.63.0 from a sibling project's `node_modules`,
driven from `/tmp/t09walk` — outside the repo, as `AGENTS.md` § The dapp requires.

### Which chromium launched — #110's evidence

**The cached Playwright chromium launched**, first try, on every one of the nine page loads:
the host's own playwright cache, chromium 1243 (arm64). The nix chromium was
never reached, because there is none on this machine: `ls -d /nix/store/*-chromium-1*/bin` prints
nothing. `AGENTS.md` § The dapp has the two the wrong way round — it says the cached one "fails on
`libnspr4.so` and two dozen other missing host libraries" and that the nix one "launches as
`executablePath`". That note is [#110](https://github.com/dnznlabs/rake/issues/110)'s to correct and
is left untouched here; see § Discoveries.

### The window

Owner is anvil account 0 (`0xf39F…2266`), featured delay 604,800s (7d), `GRACE()` 1,209,600s.

**Waiting.** With the seed's queued `setBeneficiaries` plus a `setDescription` proposed as the owner
(`cast send … "propose(bytes)"` with `setDescription("renamed by t09")`, receipt `status 0x1`, tx
`0xd66bb0ec…c9e6`), the DOM reads:

```
eyebrow amber: CHANGE QUEUED · 6D 23H
status warn: setBeneficiaries · new table · 40% / 60% · queued in 0x29fe…fb3f
status: cancel is the owner's until the window closes
status: anyone can apply once the delay passes
button "cancel" enabled
button "apply" DISABLED
```

**Ready.** `cast rpc evm_increaseTime 604860` then `evm_mine` (timestamp `1794340308`):

```
eyebrow amber: READY TO APPLY · EXPIRES IN 13D 23H
status: cancel is the owner's until the window closes
status: the delay has passed — anyone can land it
```

`13d 23h` rather than `14d 0h` because the jump was the delay plus 60 seconds — the plan's "± the
mined seconds".

**The stranger, inside the window.** As account 2 (`?from=0x3C44…93BC`) the pending block carries
**only** apply controls — `button "apply" enabled` four times, no `cancel` — and the contract agrees:

```
$ cast send 0x6FaB… "cancel(bytes32)" 0xf21d9f0e…06aa --unlocked --from 0x3C44…93BC
Error: Failed to estimate gas: … execution reverted: custom error 0x30cd7471, data: "0x30cd7471": NotOwner
$ cast sig "NotOwner()"
0x30cd7471
```

**Expired.** `cast rpc evm_increaseTime 1209660` then `evm_mine` (timestamp `1795549997`, against the
`setDescription` entry's deadline `1794339200 + 1209600 = 1795548800`):

```
eyebrow err: EXPIRED · ANYONE MAY CANCEL
status: expired — anyone may clear it
status bad: this change expired on 2026-11-24 19:50 UTC — it can no longer be applied
button "cancel" enabled
button "apply" DISABLED
```

**The stranger's cancel, pressed from the page.** As account 2, clicking the `cancel` control on an
expired row took the pending block from four rows to three, and the chain confirms it:

```
$ cast receipt 0x22918725b0ed8ba6563d639c8353f0e6c5d83df813cdde74486a7f34be32ded8 status
true
$ cast tx 0x2291…ded8 from      → 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC   (account 2, not the owner)
$ cast tx 0x2291…ded8 to        → 0x6FaB073Da30B801d71201BDa6218dBAdF4566b80
$ cast tx 0x2291…ded8 input     → 0xc4d252f5 b0d3eaa3efaed98bd18f058376bb221b0aa6b8e3ac19aac3fe2dcf2bc092331d
$ cast sig "cancel(bytes32)"    → 0xc4d252f5
$ cast call 0x6FaB… "pendingCount()(uint256)"  → 3   (was 4)
```

The `Cancelled` log's topic1 is `0xb0d3eaa3…331d`, the `setBeneficiaries` entry's hash — the row that
disappeared.

### The lowering `setDelay`, both arms

`setDelay(0)` (tx `0x1c0fbcb9…9323`, `status 0x1`) and `setDelay(259200)` (tx `0xf0b1900e…893e`,
`status 0x1`), both proposed on the featured distribution, whose live delay is `7d`:

```
status warn: setDelay · new delay · none — changes apply instantly · queued in 0x1c0f…9323
status bad: removes the delay — after this, changes apply the moment they are proposed
status warn: setDelay · new delay · 3d · queued in 0xf0b1…893e
status bad: lowers the delay from 7d to 3d
```

The plan names only the zero arm; the second proposal was added to exercise the other.

### The claim

`escrowed(blocklist, account1)` was `40000000000000000000` after `make fixtures`. Connected as
account 1 (`?from=0x7099…79C8`) the escrow row carries both controls and the sub-line that says why:

```
escrowed · 0x68B1…1aed
0x7099…79C8 — the push failed, so this share waits here · release retries the push under its gas cap;
claim is the account's own exit, paid with its own gas
40000000000000000000 raw
button "release" enabled
input[claim to] = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
button "claim" enabled
```

The `to` field was filled with account 3 (`0x90F7…b906`) and `claim` clicked. One
`eth_sendTransaction`, and:

```
$ cast receipt 0x3c7b8e807f775c2eaaa3f2ad8679b3a2efee509c789b65e78e891bffae00e028 status
true
$ cast tx 0x3c7b…e028 from   → 0x70997970C51812dc3A010C7d01b50e0d17dc79C8   (the escrowed account)
$ cast tx 0x3c7b…e028 input  → 0x21c0b342 …68b1d87f… …90f79bf6…            (claim(blocklist, account3))
$ cast sig "claim(address,address)"                      → 0x21c0b342
$ cast call 0x6FaB… "escrowed(address,address)(uint256)" 0x68B1… 0x7099…  → 0
$ cast call 0x68B1… "balanceOf(address)(uint256)" 0x90F7…b906              → 40000000000000000000
$ cast call 0x68B1… "balanceOf(address)(uint256)" 0x7099…79C8              → 0
```

The `Claimed` log's topic0 is `0x913c992353dc81b7a8ba31496c484e9b6306bd2f6c509a649a38fdf5e1c953b2`,
topics 1 and 2 the token and the account, data the `to` and the amount. The escrow row is gone from
the funds block and the history row reads:

```
claimed
40000000000000000000 raw 0x68B1…1aed · 0x7099…79C8 claimed to 0x90F7…b906
block 18 · 0x3c7b…e028
```

**The ETH case was not walked, and is not fakeable.** Every ETH escrow this chain can hold is owed to
a contract — `RevertingReceiver`, which is what makes the push fail — and `claim` is self-only, so no
browser wallet can be the caller. t08's `test/Distribution.t.sol` covers that arm on chain; the dapp's
half of it is the same two lines of markup with `token == address(0)`.

### The fallback

With `?nosnapshot=1` on the dev build, the detail page carries the notice and the same rows:

```
notice warn: the one-call view could not be read — this list is rebuilt from the queue log and may lag it by a block
```

Three pending rows on each side, and the normal load carries no notice at all:

```
$ diff <(normal: the three 'status warn' lines, sorted) <(fallback: the same, sorted)
(no output) — 3 rows on each side
```

Both sides: `h1` = `DNZN fees` (the fallback's from `description()`), the same table, the same three
`EXPIRED · ANYONE MAY CANCEL` eyebrows, the same `lowers`/`removes` flags, the same funds block. The
one difference is row **order** — see § Discoveries.

### The creation log

The fixtures' escrow demo is created with `factory.create{value:}`, so `init` logs the sentinel. Its
`Received` log's topic1 is `0x0000…0000`, and the activity list reads:

```
in
Ξ1.0000 present at creation
block 10 · 0xfcfb…d552
```

For contrast, the featured distribution's deposit is a plain transfer (`Seed.s.sol` avoids
`create{value:}` for [#42](https://github.com/dnznlabs/rake/issues/42)) and still reads
`Ξ1.0000 from 0xf39F…2266`.

## Deviations from the plan

1. **The date helper the plan told me to find does not exist, so step 1 adds exactly one.** Step 1
   says to format the date "the way the page formats block times (find the one helper; do not add a
   second)". There is no such helper: `grep -rc 'toLocaleDateString\|toLocaleString\|toDateString\|toUTCString\|DateTimeFormat' app/src/`
   hits **0 in every file**, and the page prints no absolute time anywhere — every time it shows is a
   relative `countdown` or a block number. So one helper was added, `Model.dateText(when)`, UTC to the
   minute (`new Date(…).toISOString()`), and **both** callers use it: `ERRORS['0xf80dbaea']` and
   `pendingActs`'s expired status. It is in `model.js` because it needs neither the DOM nor the chain
   (`AGENTS.md` § The dapp). UTC rather than a locale string because a block carries no zone and a
   locale string makes one document read differently on every machine that opens it — and because a
   test has to be able to pin it.
2. **`revertMessage` gained a third parameter.** `Expired(uint256 eta)` carries the eta, not the
   deadline (`src/Distribution.sol:54,249`), so printing "could be applied until \<date\>" needs
   `GRACE`, and `revertMessage(data, now)` had no way to reach it. It is now
   `revertMessage(data, now, grace)` and the `ERRORS` handlers take `(d, now, grace)`. The plan forces
   this by putting `deadline(eta, grace)` in `model.js` rather than a literal in the message. One call
   site, `txError`, which passes `S.grace`.
3. **`Model.BENEFICIARY_T` is a new export.** The fallback's `beneficiaries()` decode needs the
   `Beneficiary` tuple string, which `model.js` held as a private `BENEFICIARY`. Rather than write a
   second copy into `index.html`, it is renamed `BENEFICIARY_T` and exported, the way `SNAPSHOT_T`
   already is — and `SNAPSHOT_T` is still built from it, so there is one copy. Not a function, so the
   module's export-enumeration test is unaffected; `FUNCTIONS` went 11 → 13 for `deadline` and
   `dateText`, and `grep -c 'function ' app/src/model.js` → `13` matches.
4. **`entry()` now carries `eta` and `action` on a `queued` row.** The plan says the `Queued` log
   "carries hash, nonce, eta and action … which is everything `pendingBlock` needs", but `entry` was
   keeping only the hash, the nonce and the rendered description. The two extra fields are what the
   fallback rebuilds `_pending` from.
5. **In the vault arm, the `to` field defaults to the escrowed account rather than to `ACC`.** The
   plan fixes "defaulting to `ACC`" inside the `same(ACC, e.ac)` branch, where the two are the same
   address, and says only "the same arguments" for the `signsFor` branch. There, `ACC` is the signer's
   own key and `e.ac` is the vault, so defaulting to `ACC` would pre-fill a transfer of a vault's
   escrow to a personal key. The code is `esc(mine ? ACC : e.ac)` — identical to the plan's words in
   the branch the plan specifies.
6. **`make serve` was not used; the same recipes were run against a hand-started stack.** `make serve`
   runs `process-compose … up`, a TUI, and `run_in_background` is denied environment-wide in this
   session, so anvil and `serve` were started detached (`setsid nohup`) on the spare port set and
   `make deploy`, `make fixtures`, `make dapp-nodev`, `make dapp` and `make chain-doc` were run with
   `RPC=http://127.0.0.1:8555`. Same targets, same recipes, same `procs/` commands — only the
   supervisor differs.
7. **A second lowering proposal, `setDelay(3d)`, beyond the plan's `setDelay(0)`.** The plan's check
   names only the zero arm; the non-zero arm has its own message (`lowers the delay from 7d to 3d`)
   and would otherwise have shipped unwalked.
8. **The window walk ran on the featured distribution, which already carried the seed's queued
   `setBeneficiaries`.** So the phase captures show four rows rather than one. Every row is in the
   same phase at the same time, so the three phases are still what the plan asked to see; the extra
   rows are the ones the `lowers` flag needed anyway.
9. **The ready eyebrow read `13d 23h`, not `14d 0h`** — the time jump was `delay + 60s`. Inside the
   plan's "± the mined seconds".
10. **`make fixtures` was run twice before the figures above were taken.** The first run was killed
    mid-broadcast (see § Discoveries), which left the escrow and vault demos created and the new
    blocklist row not. The chain was then restarted empty and the whole deploy and fixtures run again
    uninterrupted; every figure in this handoff is from that second chain.

## Decisions

None. The plan's § Open questions is "None", and the one design call it names — a literal `GRACE` in
the widget against a read in the dapp — was implemented as steps 2 and 6 fix it, with the comment and
the `14 * 86400` test that pin it. Deviations 1 and 2 are the plan's own instructions carried out
where the codebase did not match its assumption; deviation 5 is the safe reading of a default the plan
leaves open in a branch it does not specify.

## Discoveries

- **`AGENTS.md` § The dapp has the two chromiums the wrong way round, and the nix one is not on this
  machine at all.** The note says the cached Playwright chromium fails on `libnspr4.so` and that the
  nix chromium launches; in fact the cached arm64 binary launched on all nine page loads, and
  `ls -d /nix/store/*-chromium-1*/bin` prints nothing. This is
  [#110](https://github.com/dnznlabs/rake/issues/110)'s and was left unfixed — correcting a note about
  the browser harness is not this task's scope, and #110 is where the evidence belongs.
- **The fallback's pending rows are in a different order from `snapshot()`'s, with the same content.**
  `_pending` uses swap-and-pop, so after a cancel the live list is in storage order
  (`3d`, `setDescription`, `setDelay(0)`) while the rebuilt list is chronological
  (`setDescription`, `setDelay(0)`, `3d`). Same three rows, same phase, same flags; only the sequence
  differs. Nothing on the page depends on the order, but a reader comparing the two views will notice.
- **`make fixtures` is not idempotent step by step.** Its guard is "does the escrow or vault demo have
  code", so a run interrupted after those two creates leaves every later step — now including the
  blocklist row — permanently skipped on that chain. I hit exactly this: the first run was killed at
  ten minutes and the re-run returned `escrow demo (already there, left alone)` without ever
  deploying `BlocklistToken`. The recovery is to restart anvil. Pre-existing shape; this task made the
  tail of the script longer, so the window is wider.
- **The page now has exactly one absolute date format and it did not have one before.** `Model.dateText`
  is UTC to the minute. A later task that wants to print a block time should call it rather than add a
  second, which is what step 1's instruction was trying to protect.
- **The two "from the zero address" shapes in the funds block now read differently, on purpose.** A
  `Received(address(0), …)` is `init`'s sentinel and reads `present at creation`; an ERC-20 `Transfer`
  from the zero address is a mint and keeps its address link. Both are right, and `docs/REFERENCE.md`
  states only the first. Worth a sentence there if anyone asks why the list is inconsistent.
- **If both `snapshot()` and the log query fail, the page shows two overlapping notices.** The pending
  block carries "rebuilt from the queue log and may lag it by a block" above no rows, while the
  changes section says "history unavailable". Honest, but redundant; collapsing them needs a third
  state the plan does not ask for.
- **`#/docs`'s "fourteen days" is now the only place on the page that spells the constant out.** The
  plan rules that correct — it is a document, and the constant moving is a new version of it. Flagging
  it so the next reader does not file it as the drift step 2 was meant to remove.

## For close-out

- **The widget's new size: 8,043 bytes**, `2197 left` of the 10,240 budget (t08's head: 7,920, `2320
  left`). `wc -c app/dist/widget.js` → `8043`.
- **The chain-doc hashes, from this branch's `make dapp-nodev` on a fresh anvil**: document
  `56469` bytes / `bf47af747e7eaa69f1abefaf6b525a087ad893d9e8f388f517268438a68d0631`; payload
  `41842` bytes; inflated `133136` bytes /
  `2a8eb21676b620e144e6c8571da3b7757d87f8843a62021dc8ef849e1c719412`; widget `8043` bytes /
  `7cd0f4d3e9a1dd1a7a8200970f96a9056cad02350f5217a383121bfa1a781f0e`.
- **t06's `RUNBOOK.md` § Rehearsed on anvil step 4 figures are superseded.** The document bytes
  changed with this PR, so every hash and byte count that section quotes is from a bundle that no
  longer exists. The close-out re-run is where they are re-taken; the figures above are this branch's,
  not the close-out's.
- **Denizen's look** (§ Human-in-the-loop, a look and not a criterion): the pending block's three
  phases and the escrow row's `claim`, on anvil. The reproduction is this section's walk — `make deploy`
  then `make fixtures`, open the featured distribution, and move the clock with
  `cast rpc evm_increaseTime`.

## Closing-reference verification

`Closes #144, closes #137` verified through **two independent paths**, because a closing keyword fires
from inside backticks and from inside a negation, and this body names other issues.

1. **GraphQL, from the PR.** `gh pr view 146 --json closingIssuesReferences --jq '[.closingIssuesReferences[].number]|sort'`
   → `[137,144]`, read twice. `gh pr view`'s projection of that connection returns `state` and
   `title` as `null`, so it proves the numbers and nothing more; a direct query was run for the rest:
   `gh api graphql` on `repository.pullRequest(number:146).closingIssuesReferences(first:10)` →
   `totalCount 2`, the two nodes being `#137 [OPEN] Dapp: flag a pending setDelay that lowers the
   delay, and fall back to logs when snapshot() fails (#133 items 3, 6)` and
   `#144 [OPEN] m03-t09 — The dapp follows t08's ABI`. Exactly two issues close, and they are the two
   intended ones.
2. **REST, from the stored body.** `gh api repos/dnznlabs/rake/pulls/146 --jq .body`, then a keyword
   scan of what the server actually stored rather than of what I sent:
   `grep -oniE '\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b[[:space:]]*#[0-9]+'` returns exactly
   **`9:Closes #144`** and **`9:closes #137`** — two matches, both on line 9, and no others in 14
   lines. The body's other references, listed with `grep -onE '#[0-9]+'`, are `#110` (line 7), `#137`
   (line 3, keyword-less), `#139` (line 5) and `#143` (line 3): none carries a keyword and none
   closes anything.

The two paths run in opposite directions — GitHub's resolved intent against the raw stored text — and
agree on both the count and the two numbers. The states above come from the issues themselves
(`gh issue view 137`, `gh issue view 144`), not from the PR's view of them.

## The PR

PR [#146](https://github.com/dnznlabs/rake/pull/146), `m03/t09-dapp` → `main`, open, not a draft,
`lakkoss` requested as reviewer and @-mentioned in the body. `Audit scope touched: none` — `audits/SCOPE`
excludes `app/` ("not Solidity; the dapp was signed off in M02 Phase 5") and `scripts/forge/Fixtures.s.sol`
("owner-run on a dev chain, never shipped", decision 29), and
`git diff --stat origin/main -- src/Distribution.sol src/App.sol scripts/forge/Deploy.s.sol scripts/forge/DeployApp.s.sol`
is empty, so t07's third review is untouched. `Carries forward:` is left to be filled after the
review, before the merge.

Commits, oldest first:

| Commit | What |
|:--|:--|
| `0518a4b` | `feat(dapp)` — `model.js` learns the window: `countdown`'s third argument, `deadline`, `dateText`, `Expired` in `ERRORS`, ten errors in `AGENTS.md` |
| `042ccb3` | `feat(dapp)` — the `GRACE()` boot read, the three phases, the expired cancel and apply, #137's lowering flag, the two prose rewordings |
| `e226d2f` | `feat(dapp)` — the escrow row's `claim` and its `to` field, `Claimed` in `FUND_EVENTS`, the `init` sentinel |
| `c5d2895` | `feat(dapp)` — the `snapshot()` fallback, the rebuilt pending list, `BENEFICIARY_T`, the `?nosnapshot=1` fence |
| `508bcea` | `feat(widget)` — `etaText` and the pinned `GRACE` literal, with its two tests |
| `59878f9` | `feat(fixtures)` — the `BlocklistToken` row, so one escrow on the dev chain is an EOA's |

## Open questions

None.
