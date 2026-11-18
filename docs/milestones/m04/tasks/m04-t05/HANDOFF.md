# m04-t05 — handoff

PR: not opened · Branch: `m04/t05-uat` · 2026-11-18

Step 0's baselines were re-run at the branch point and step 1's two files were written: `UAT.md`, two
ordered lists of **14 rows each**, and `count.js`, the provider-call counter the headless run uses
first. **Steps 2 through 5 have not run.** Step 0's own gate stopped them: TASK.md step 0 says no run
in steps 2–3 drives a gateway whose check fails, and the hosted `gateway-check` **fails on Sepolia**
while passing on Base Sepolia — the Sepolia gateway is serving the document of § Uploads **row 1**
(2026-11-17, `9fdf0f1`), two uploads behind the chain. The condition, its time and both hashes are in
§ The hosted gateway below; it is [#242](https://github.com/dnznlabs/rake/issues/242)'s third-party
condition, not a failed upload, and this task does not change the gateway. Every figure below was
measured at the branch point; every cell belonging to steps 2–5 is empty and says so.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | **partial — Base Sepolia pass, Sepolia fails** | Per chain, `cast nonce $APP` → **10**, past the `7` rows 1–2 left (read 19:34:46Z; blocks 12,163,527 and 60,543,095). § Uploads **row 3** (Sepolia) and **row 4** (Base Sepolia), both commit `3751211`, App nonce 7. `chain-doc`'s `inflated sha256` equals the build's at that commit on both chains — see § The served document. Gateway URLs **200 ×4** with `web3urlgateway-cache-status: miss` and no `Age` on all four. Hosted `gateway-check`: **Base Sepolia all assertions passed, 19:36:31Z**; **Sepolia 2 assertions failed, 19:35:24Z** (§ The hosted gateway). Sepolia's run may not start until it passes. |
| 2 | **partial — the script exists; the headless run is step 2** | `UAT.md` has two lists of **14 rows each**, identical row ids `probe,(a)…(m)`, every row carrying action, expected state, screenshot and hash cells — parsed, not eyeballed. `node --check docs/milestones/m04/tasks/m04-t05/count.js` → **exit 0**; **59** lines (`grep -c ''`), under the 60 the plan sets. The Sepolia headless run, its hashes and `page errors` are **step 2, not run**. |
| 3 | **pending — step 3** | Denizen's run has not happened; the two hash tables below are scaffolded and empty. |
| 4 | **pending — step 4** | § The wallet path carries its five rows, all empty. |
| 5 | **pending — step 2/3** | No `RevertingReceiver` deployed yet; § The escrow receiver is empty. |
| 6 | **pending — step 5** | § Carried issues names the four issues and what each line still needs. |
| 7 | **pass so far** | `git diff --stat origin/main -- app/ src/ test/ RUNBOOK.md` prints **nothing**. `git diff --name-only origin/main HEAD` → exactly `docs/milestones/m04/tasks/m04-t05/UAT.md` and `…/count.js`. No findings are open, because no run has produced any. |
| 8 | **pending — Denizen** | `MILESTONE.md` § Phases 4 carries no line from this task yet. |
| 9 | **partial** | `git status --porcelain` **empty** at every commit. No screenshots exist yet: `shots/` is not created until step 2 files one. |

## The gate, per chain

Read 2026-11-18, branch `m04/t05-uat` off `origin/main` at `3f6ac3c`.

| reading | Sepolia · 11155111 | Base Sepolia · 84532 |
|:--|:--|:--|
| `cast nonce $APP` | **10** | **10** |
| `cast codesize $APP` | 7,155 | 7,155 |
| block at the reading | 12,163,527 | 60,543,095 |
| `cast chain-id` | 11155111 | 84532 |
| § Uploads row matched | **row 3** — 2026-11-18, commit `3751211`, App nonce 7 | **row 4** — 2026-11-18, commit `3751211`, App nonce 7 |

`3751211` is a **docs-only descendant of `06fbaab`**: `git diff --name-only 06fbaab 3751211` → one
file, `docs/milestones/m04/tasks/m04-t13/TASK.md`, and `git merge-base --is-ancestor 06fbaab 3751211`
exits 0. So the row satisfies § Gate's `3751211` and AC 1's "`06fbaab` or its descendant" alike.

## The served document

The build was run at the branch point rather than at `3751211`, because the two are byte-identical
everywhere the build reads: `git diff --stat 3751211 HEAD -- broadcast/ app/ src/ Makefile` prints
nothing, and `app/build.mjs` embeds no commit — its substitutions come from `broadcast/` and
`--chain`. The pair is equal on both chains, as RUNBOOK § Uploads requires of a row.

| reading | Sepolia · 11155111 | Base Sepolia · 84532 |
|:--|:--|:--|
| `make dapp-nodev CHAIN_ID=<id>` | raw 145,765 B · gzip 46,189 B | raw 145,763 B · gzip 46,186 B |
| `sha256sum app/dist/index.html` | `b1fc3b96f52b1c17f282e541f4d0293cb8bc96fc1e38866c6d128c13e5ef1e86` | `6f0225bbb3a9262f1f42780dea918c71cdc0e1e2b99a847282ec6c00ff45336f` |
| `chain-doc` `inflated sha256` | `b1fc3b96…e5ef1e86` — **equal** | `6f0225bb…ff45336f` — **equal** |
| `chain-doc` inflated bytes | 145,765 | 145,763 |
| `chain-doc` wrapper `sha256` | `99f2a8d1c841ecb316d2759a3ed8f4e60a9bcef12135e77e55385d7e764fa87e`, 62,265 B | `96a557a04771eeaeca0902a87deb70f0f308049a4f57f455b29949e647eee4a5`, 62,261 B |
| `sha256sum app/dist/widget.js` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` | the same bytes |
| `chain-doc` `widget sha256` | `8b6bbc88…108bc368`, status 200, 8,509 B — **equal** | `8b6bbc88…108bc368`, status 200, 8,509 B — **equal** |

Both chains' pairs reproduce § Uploads rows 3 and 4 exactly.

## The hosted gateway

`tools/gateway-check.sh` in hosted mode, `APP`/`RPC`/`GATEWAY_BASE` per chain, with that chain's
`app/dist` in place.

**Base Sepolia · 84532 — passed, 2026-11-18 19:36:31Z.** Every assertion: status 200,
`text/html; charset=utf-8`, the three `Web3-*` headers, `body minus block` **62,261** equal to
`html()` **62,261**; `/widget.js` 200, **8,509 B** identical to `app/dist/widget.js`; `/nope` 404.
`gateway-check: all assertions passed`, exit 0. **This chain is clear to run.**

**Sepolia · 11155111 — FAILED, 2026-11-18 19:35:24Z**, 2 of the assertions, exit 2. The 5219 path
itself is fine (200, the three `Web3-*` headers, `/nope` 404); what differs is the document:

| assertion | measured | expected |
|:--|:--|:--|
| `body minus block vs html()` | served 69,053 B, injected block 7,872 B, body minus block **61,181 B** | `html()` **62,265 B** — differs |
| `cmp vs app/dist/widget.js` | served **8,132 B** | built **8,509 B** — differs |

**The two hashes.** What the gateway serves, inflated the way `chain-doc` inflates the chain:

| | gateway serves | the chain serves |
|:--|:--|:--|
| `inflated sha256` | `2d27b603b657391a24bd882598ef61d32e3bb635c2e918b414af04683f9a9d4a` | `b1fc3b96f52b1c17f282e541f4d0293cb8bc96fc1e38866c6d128c13e5ef1e86` |
| inflated bytes | 142,989 | 145,765 |
| `widget sha256` | `07e808ed9e5f0a08786715a0cbc0458dfb5905b41150999b8c2bf6e67d51b8ca` | `8b6bbc8892657a888d6f9d522f49246e1519182d7f3850e7ec464b15108bc368` |

That pair is § Uploads **row 1** — 2026-11-17, commit `9fdf0f1` — byte for byte, so Sepolia's gateway
is **two uploads behind**, not merely stale by one. The gateway's raw served body hashes
`bc2dd55967beeed1fb6b2bcccbf82197c44e81fb0637481e00604860492ca1b8` at 69,053 B, which is **byte-identical
to m04-t04 § The hosted gateway's reading of 2026-11-17 21:36Z** — the same bytes for about 22 hours
across two uploads. Base Sepolia's moved over the same period, from t04's 69,049 B / `21e93494…272e1b39`
to 70,133 B / `1d2783ab6f504b4483d596da955b8db7b81b0245298f9f6d741750d02654ae68`, which is the control
on the instrument: the method sees a gateway that updated.

**Its mechanism is not a cache hit, and is not diagnosed here.** All four URLs answer
`web3urlgateway-cache-status: miss` with no `Age` — so m04-t04 § After the next Run B's expected
residual, a `hit` serving the pre-Run-B document, is *not* what this is. Recorded, not explained.

**The escalation point.** The upload executed 2026-11-18 **17:46:48Z–17:49:36Z** (§ Uploads, the six
`executeQueued` calls), so TASK.md step 0's "within a day of the upload" expires **2026-11-19 ≈17:49Z**.
At the time of writing it has not expired. If the check has still not passed by then, the question for
Denizen is in § For Denizen: run Sepolia through a second gateway, or wait.

### The four URLs

`curl -sS -o /dev/null -w '%{http_code}\n'`, 2026-11-18 19:37:03Z. `A` = `0x00a90943f58b6ab7fde05aae01c13a80e6995bae`.

| URL | HTTP | `web3urlgateway-cache-status` | `Age` |
|:--|--:|:--|:--|
| `https://$A.11155111.w3link.io/` | 200 | `miss` | absent |
| `https://$A.11155111.w3link.io/widget.js` | 200 | `miss` | absent |
| `https://$A.84532.w3link.io/` | 200 | `miss` | absent |
| `https://$A.84532.w3link.io/widget.js` | 200 | `miss` | absent |

## The DNZN distribution

`cast call $FACTORY "predict(bytes32)(address)" 0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001`,
2026-11-18 19:37:24Z. Identical on both chains, and equal to the route `UAT.md` row (c) opens.

| reading | Sepolia · 11155111 | Base Sepolia · 84532 |
|:--|:--|:--|
| `predict(bytes32)` | `0x71a4221974Fc2E95081AE513248918dF27CF7a4A` | `0x71a4221974Fc2E95081AE513248918dF27CF7a4A` |
| `cast codesize` | **45** | **45** |
| `description()` | `DNZN // FUND DISTRIBUTION` | `DNZN // FUND DISTRIBUTION` |
| `owner()` | `0x357836fFcB45307FA7ff2A574F505753c961902B` — the UAT wallet | the same |
| `delay()` | 3600 | 3600 |
| `pendingCount()` | 0 | 0 |

## Balances, and what the run needs

`cast balance` and `cast base-fee`, 2026-11-18 19:37:43Z. The need is TASK.md step 0's estimate —
two `create`s, a pay-in, `distribute`, two `propose`, `applyQueued`, `cancel`, `release`, about
**1.2 M gas** plus the **0.003 ETH** pay-in of row (g); the engineer's wallet carries **1.35 M**, the
same set plus the `RevertingReceiver` deploy. The base fee is a spot reading and a priority fee is
extra, so these are floors, not quotes.

| chain · wallet | balance (ETH) | `cast base-fee` (wei) | gas × base-fee | need | twice need | verdict |
|:--|--:|--:|--:|--:|--:|:--|
| 11155111 · UAT | 0.124970105281688963 | 15 | 18,000,000 wei | 0.003000000018 ETH | 0.006000000036 | **no top-up** — about 41× need |
| 11155111 · engineer | 0.204087421898051616 | 15 | 20,250,000 wei | 0.003000000020 ETH | 0.006000000041 | **no top-up** — about 68× need |
| 84532 · UAT | 0.045000000000000000 | 5,000,000 | 6,000,000,000,000 wei | 0.003006 ETH | 0.006012 | **no top-up** — about 15× need |

No balance is under twice its need, so nothing is asked of Denizen here. The engineer's Base Sepolia
balance, which TASK.md does not ask for because the headless run is Sepolia-only, reads
0.034781883673510621 ETH.

## The vault's owner set

`cast call $OWNER "isOwner(address)(bool)" <wallet>`, both chains, 2026-11-18 19:37:43Z.

| wallet | Sepolia · 11155111 | Base Sepolia · 84532 |
|:--|:--|:--|
| UAT `0x357836fF…902B` | **true** | **true** |
| engineer `0x5A158aF8…C50d` | true | true |

`isOwner(UAT)` is `true` on both, so **row (j) is reachable on both chains** and is not recorded as
`not reachable with this wallet`.

## Criterion 5's host page

**Pending on m04-t04 AC (e).** That handoff's AC table reads `(e) | not met — Denizen: pending` — the
URL, the MetaMask screenshot and the DevTools answers are the Product Owner's to return under
decision 41. So `curl -s <url> | grep -ci 'w3link.io/widget.js'` **was not run: there is no URL to run
it against.** The repo carries **29** `dnzn.dev` matches across `*.md` and `*.html` (so the search had
something to find), and none is a published host-page URL — they are the page's own footer link, the
docs and the task files. `UAT.md` row (k) therefore stands at `pending on t04 (e)` and nothing here
closes it.

## The hash tables

One row per transaction row of `UAT.md`, both chains. **All cells are empty: steps 2 and 3 have not
run.** The engineer's column is Sepolia-only and is step 2's; Denizen's is step 3's.

### Sepolia · 11155111

| row | transaction | engineer (step 2) | Denizen (step 3) |
|:--|:--|:--|:--|
| (f) | `create`, EOA-owned | | |
| (g) | pay-in `0.003` ETH | | |
| (g) | `distribute` | | |
| (h) | `setAccepting(true)` on the receiver | | |
| (h) | `release` | | |
| (i) | `propose` — the table change | | |
| (i) | `applyQueued` | | |
| (i) | `propose` — the `setDescription` | | |
| (i) | `cancel` | | |
| (j) | `create`, vault-owned | | |

### Base Sepolia · 84532

| row | transaction | Denizen (step 3) |
|:--|:--|:--|
| (f) | `create`, EOA-owned | |
| (g) | pay-in `0.003` ETH | |
| (g) | `distribute` | |
| (h) | `setAccepting(true)` on the receiver | |
| (h) | `release` | |
| (i) | `propose` — the table change | |
| (i) | `applyQueued` | |
| (i) | `propose` — the `setDescription` | |
| (i) | `cancel` | |
| (j) | `create`, vault-owned | |

## The escrow receiver

**Empty — step 2 deploys the first one.** `forge create test/mocks/Mocks.sol:RevertingReceiver` on
Sepolia, reused by Denizen's Sepolia run; a second is deployed on Base Sepolia before that run.

| chain | address | deploy hash | `setAccepting(true)` hash |
|:--|:--|:--|:--|
| 11155111 | | | |
| 84532 | | | |

## The wallet path

Step 4's table. **All five rows are empty: no load has been measured.** The instrument is `count.js`
for every row unless the extension-panel fallback replaces one, in which case the row says so.

| chain | date | RPC | head | `eth_getLogs` | ms to painted | `load older` delta | instrument |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 11155111 · first load | | | | | | | |
| 11155111 · second load | | | | | | | |
| 84532 · first load | | | | | | | |
| 84532 · second load | | | | | | | |
| 11155111 · engineer | | publicnode | | | | | `count.js`, headless |

What the figure means against `MAX_WINDOWS` **40** per kind (`index.html:221`) and the **10,000**-block
opening window (`:219`), and whether the count moved between the loads: **unwritten, pending step 4.**
No log cache is in this bundle, so the count is not expected to move.

## The origin probe

m04-t02's pending wallet half, closed in step 3 on the landing of each chain. **Denizen's column is
empty.**

| expression | expected | Denizen · 11155111 | Denizen · 84532 |
|:--|:--|:--|:--|
| `window.top === window` | `true` | | |
| `typeof window.ethereum` | `object` | | |
| `location.origin` | the four-label `https:` gateway origin | | |

## Carried issues

Step 5's four lines. **Each is pending its figure; none is written from a reading that exists yet.**

- **#165** — the per-load count and the `load older` delta on both chains, and which closing shape the
  figure fits: **pending step 4.** Shape (b) needs the wallet RPC to take the 10,000-block opening
  window with the count well under the 40-per-kind ceiling; otherwise it carries on the number for
  decision 52's addendum.
- **#127** — the two testnet rows of RUNBOOK § 1's native-balance table, re-read with the three
  commands of `RUNBOOK.md:189-198` against the UAT wallet as the probe address: **not re-read here.**
  The two rows stand as `RUNBOOK.md:219-220` has them — Sepolia, token `none`, source `measured, all
  four aliases 0x`; Base Sepolia, token `none — post-Bedrock OP Stack chain`, source `measured, 0x at
  the legacy address`. The issue stays open into M05 for the six mainnet rows.
- **#174** — not this task's. Whether both items the issue lists are on `main` at the branch point —
  the docs sentence at `index.html:1683`, `:1987`, `:2019` and the cold-stipend test
  `test/ColdStipend.t.sol`: **unverified here**, one line owed in step 5.
- **#197** — not this task's (`make setup`, the libs guard); carried as is, and **`unassigned`** at the
  branch point: `grep -rn '#197\|issues/197' docs/ --include=*.md` returns 8 hits, none of them a task
  taking it on — m04-t10's TASK.md lists it under what it does *not* do, and m04-t04's cites it only as
  the submodule hazard.

## Findings

**None.** No row of either list has been run, so nothing has failed to match its expected state. The
Sepolia gateway condition is **not** a finding of this task: it is
[#242](https://github.com/dnznlabs/rake/issues/242), a third-party condition already filed, recorded
in § The hosted gateway.

## Deviations from the plan

- **Row (k) is present on the Base Sepolia list as a not-run row.** Step 1 requires the two lists to
  have the same row count; step 3 (k) and § Human-in-the-loop item 5 make that row Sepolia-only. Both
  hold only if the row exists on both lists and the Base Sepolia one carries no reading, which is how
  it is written — 14 rows each, identical row ids, nothing executed for (k) on 84532.
- **Row (i) carries four hash cells, not three.** The row's text says "Three hashes", but AC 3
  enumerates `propose` ×2, `applyQueued` and `cancel` for it — four transactions. The cells follow AC 3,
  since a missing cell is a row that cannot read red.
- **A row `probe` precedes (a) on both lists.** Step 3 prescribes the three probe expressions before
  the first row on each chain and AC 3 requires the column filled, so it is a row rather than prose
  above the table.
- **The bundle was built at the branch point, not at `3751211`.** Justified by an empty
  `git diff --stat 3751211 HEAD -- broadcast/ app/ src/ Makefile` — see § The served document.
- **Steps 2, 3, 4 and 5 are not in this handoff.** Step 0's gate forbids Sepolia's run while its
  gateway check fails, and step 3 waits on Denizen.

## Decisions

- **`firstLoad` is `sessionStorage`'s.** It survives a reload in the same tab, so step 3 (d)'s second
  paste reports `false` without anyone tracking which load it is. The alternative — asking Denizen to
  edit a flag between pastes — is a step that can be skipped silently.
- **The painted test matches the loading *text*, not the `.notice` class.** `partialLine()`
  (`index.html:819-823`) is a `.notice` too, so a class test would read a section offering `load
  older` as still loading and never report row (e)'s own load.
- **The console gets a copy of the object, `window.__uat` stays live.** Row (e)'s delta is read off
  the live object after the press; a console entry holding the live reference would re-render with the
  post-press count and quietly restate the load's figure.

## Discoveries

- **The Sepolia gateway's stale document is not a cache hit.** All four URLs answer
  `web3urlgateway-cache-status: miss` with no `Age`, yet Sepolia returns row 1's bytes. m04-t04
  § After the next Run B predicted the residual as a `hit`; the mechanism is something else and is
  not identified here.
- **TASK.md § Gate attributes the `7` to § Uploads rows 1 and 2.** The table records App nonce **4**
  for rows 1 and 2 and **7** for rows 3 and 4; `7` is the nonce rows 1 and 2 *left* after their three
  chunk transactions. The gate's verdict is unaffected — 10 is past both.
- **§ Gate and AC 1 name different commits for the § Uploads row** (`3751211` and `06fbaab`). They
  agree in fact: `3751211` is a docs-only descendant of `06fbaab`, proved in § The gate.
- **The widget grew in this upload.** m04-t04 recorded 8,132 B and `07e808ed…d51b8ca` on both chains;
  the chain and Base Sepolia's gateway now serve 8,509 B and `8b6bbc88…108bc368`. Sepolia's gateway
  still serves the 8,132 B one, which is the second half of its staleness.
- **`node --check` through a pipe reports the pipe's status.** `devbox run -- node --check <file> |
  grep -v '^Info:'` exits 1 when the filter drops every line, on a file node accepted. Every exit code
  quoted here was read from the command itself inside a script.

## Open questions

**None.** The two things this task waits on are not decisions: the Sepolia gateway's check passing,
which § For Denizen turns into a question only if it is still failing at 2026-11-19 ≈17:49Z, and
m04-t04 AC (e)'s URL, which decision 41 already assigns to the Product Owner.

## For Denizen

1. **Sepolia's run cannot start yet.** Its hosted `gateway-check` fails because the gateway serves
   the 2026-11-17 document. Base Sepolia is clear. If the check has not passed by **2026-11-19
   ≈17:49Z** — a day after the upload executed — TASK.md step 0 asks you whether to run Sepolia
   through a second gateway or to wait. Nothing about the chain's own document is in question: both
   chains' `inflated sha256` match their builds exactly.
2. **m04-t04 AC (e)'s host-page URL**, if you have published it — row (k) is `pending on t04 (e)`
   until it arrives, and criterion 5's live half with it.
3. **The signoff line** goes under `docs/milestones/m04/MILESTONE.md` § Phases 4, in your own words,
   dated, once step 3 has run with nothing open. The PR carries it.
4. **One wording question, and it is yours under decision 17.** Row (j) expects the owner bar to read
   `you are a signer on <vault>, which owns this distribution — every change below is calldata to
   submit through it`, and the drawer's writes to read `copy calldata for your vault`. Both strings
   are in the shipped document. If either reads wrong to you when you see it in place, that is a
   wording finding rather than a defect, and it is the one question this task holds open for you.
