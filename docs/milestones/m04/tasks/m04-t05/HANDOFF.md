# m04-t05 — handoff

PR: not opened · Branch: `m04/t05-uat` · 2026-11-18

Step 0's baselines were re-run at the branch point and step 1's two files were written: `UAT.md`, two
ordered lists of **14 rows each**, and `count.js`, the provider-call counter the headless run uses
first. **Step 2 has now run, end to end, every row of the Sepolia list**, through the project's own
gateway build — the path rake#248 added to step 0 for exactly this condition, because Sepolia's hosted
`gateway-check` was still failing. Ten transactions landed with `status 1`, `page errors: none`, and
seventeen screenshots are filed under `shots/engineer/`. **Steps 3 and 5 still wait on Denizen**, and
§ The wallet path carries the engineer's two rows with Denizen's four still empty.

Step 0's amended gateway bullet also permitted one tracked change, and it is made: `tools/gateway.sh`
and `procs/gateway.toml.tmpl` take the chain and its RPC as parameters defaulting to anvil's, and
`tools/gateway-check.sh` can address a local base for another chain. **The defaults did not move**, by
the before-and-after run on anvil step 0 demands — § The parameterisation below.

The Sepolia hosted gateway condition is unchanged throughout: the primary is serving the document of
§ Uploads **row 1** (2026-11-17, `9fdf0f1`), two uploads behind the chain, read failing at 19:35:24Z,
again at 20:00:43Z before step 2 and again at 20:45:05Z after it. It is
[#242](https://github.com/dnznlabs/rake/issues/242)'s third-party condition, not a failed upload, and
this task does not change a hosted gateway. Base Sepolia passes and is clear for step 3.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| 1 | **partial — Base Sepolia pass, Sepolia fails** | Per chain, `cast nonce $APP` → **10**, past the `7` rows 1–2 left (read 19:34:46Z; blocks 12,163,527 and 60,543,095). § Uploads **row 3** (Sepolia) and **row 4** (Base Sepolia), both commit `3751211`, App nonce 7. `chain-doc`'s `inflated sha256` equals the build's at that commit on both chains — see § The served document. Gateway URLs **200 ×4** with `web3urlgateway-cache-status: miss` and no `Age` on all four. Hosted `gateway-check`: **Base Sepolia all assertions passed, 19:36:31Z**; **Sepolia 2 assertions failed, 19:35:24Z** (§ The hosted gateway). Sepolia's run may not start until it passes. |
| 2 | **pass** | `UAT.md` has two lists of **14 rows each**, identical row ids `probe,(a)…(m)`, every row carrying action, expected state, screenshot and hash cells — parsed, not eyeballed, re-parsed after the row (j) amendment. `node --check docs/milestones/m04/tasks/m04-t05/count.js` → **exit 0**; **59** lines (`grep -c ''`), under the 60 the plan sets. The Sepolia headless run reached **every row's expected state** — § Step 2 — with ten hashes in the engineer's column below and **`page errors: none`**. One row's *expectation* was wrong rather than unreachable and the script was fixed: row (j)'s acknowledgement, § Deviations 6. |
| 3 | **pending — step 3** | Denizen's run has not happened; the two hash tables below are scaffolded and empty. |
| 4 | **partial — the engineer's two rows are filled; Denizen's four wait on step 3** | § The wallet path: `11155111 · engineer · first load` and `· second load`, each with `head`, `eth_getLogs` **84**, `ms to painted` and the instrument named (`count.js`, headless). AC 4 asks for "at least one engineer row" and both loads are recorded, since step 2's own check asks for the first-load and second-load figures. No row is a `0` count beside painted sections. |
| 5 | **pass on Sepolia; Base Sepolia is step 3's** | Receiver `0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95`, deploy `0x365e2edd…35bd05`, flip `0x145f3ae7…01b3f5` — § The escrow receiver. Read from the chain, not the page: `distribute`'s receipt `0xc84179f1…764af2` carries **`Escrowed`** `0x393ce2c0…055c9eea` on the distribution, and `release`'s `0x2f644209…50a9c29` carries **`Released`** `0x2d87480f…07748f52`; both `status 0x1`. |
| 6 | **pending — step 5** | § Carried issues names the four issues and what each line still needs. |
| 7 | **pass** | `git diff --stat origin/main -- app/ src/ test/ RUNBOOK.md` prints **nothing**. `git diff --name-only origin/main HEAD` → the task's three files, `shots/engineer/`, and the three step 0 permits: `tools/gateway.sh`, `tools/gateway-check.sh`, `procs/gateway.toml.tmpl`. **No issue was opened by step 2**: every row reached its expected state, and the one mismatch was the script's expectation, not the page's behaviour — § Deviations 6 proves the page implements #172 as written. |
| 8 | **pending — Denizen** | `MILESTONE.md` § Phases 4 carries no line from this task yet. |
| 9 | **partial — the engineer's files are in; Denizen's are step 3's** | `git status --porcelain` **empty** at every commit. **17** PNGs under `shots/engineer/`, every one referenced in § Step 2; largest `l-docs.png` at **176,493 bytes**, so all are under the 300 KB the plan sets, and all 17 carry the PNG magic `89504e470d0a1a0a` (`file` is not installed here, so the magic was read with `od`). `shots/11155111/` and `shots/84532/` are step 3's. CI: not run on this branch yet. |

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

**Sepolia · 11155111 — FAILED, 2026-11-18 19:35:24Z**, 2 of the assertions, exit **1**
(`tools/gateway-check.sh:206`; the `2` is the fail count, and a `2` seen at the shell is `make`'s and
the `devbox run` wrapper's, not the script's). The 5219 path
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

**The escalation point, as TASK.md step 0 now reads.** The upload executed 2026-11-18
**17:46:48Z–17:49:36Z** (§ Uploads, the six `executeQueued` calls), so step 0's "within a day of the
upload" expires **2026-11-19 ≈17:49Z**. That deadline now belongs to **step 3 alone**: rake#248
(merged `bc17d0e`) amended step 0 so that **the engineer's run (step 2) may use the project's own
gateway** — m04-t02's `tools/gateway.sh` build at its pin, pointed at a public RPC for the chain
under test, the authenticated path decision 53 names — when the primary's check is still failing at
the time step 2 is ready. Step 3 keeps the primary, and if its check has not passed by that deadline
the question in § For Denizen is whether to run Sepolia through the project's gateway or to wait.

**`web3gateway.dev` is not a second path, and that was measured rather than assumed.** At 19:36Z it
served Sepolia the same stale document as w3link — inflated sha256 `2d27b603…3f9a9d4a`, 142,989
bytes, `web3urlgateway-cache-status: miss` — while its Base Sepolia copy was current, so that host
discriminates by chain and is simply behind on Sepolia in the same way. The two share backing state:
one instrument twice, not a second reading. The project's own build is independent precisely because
it holds the software constant at the same pin and varies only the node.

**Which gateway served step 2, and the primary's state at that time**, are in § The gateway that
served step 2 below, as the amended step 0 requires: the project's own build served it, and the
primary was read failing at both ends of the run.

### The four URLs

`curl -sS -o /dev/null -w '%{http_code}\n'`, 2026-11-18 19:37:03Z. `A` = `0x00a90943f58b6ab7fde05aae01c13a80e6995bae`.

| URL | HTTP | `web3urlgateway-cache-status` | `Age` |
|:--|--:|:--|:--|
| `https://$A.11155111.w3link.io/` | 200 | `miss` | absent |
| `https://$A.11155111.w3link.io/widget.js` | 200 | `miss` | absent |
| `https://$A.84532.w3link.io/` | 200 | `miss` | absent |
| `https://$A.84532.w3link.io/widget.js` | 200 | `miss` | absent |

## The parameterisation — step 0's one permitted change

Three files, named by step 0 and by § Out of scope, and nothing else: `git diff --name-only
origin/main HEAD` outside `docs/` and `shots/` is exactly `tools/gateway.sh`,
`tools/gateway-check.sh`, `procs/gateway.toml.tmpl`.

- **`tools/gateway.sh`** takes `GATEWAY_CHAIN_ID` (default `31337`) and `GATEWAY_RPC` (default
  `http://127.0.0.1:$ANVIL_PORT`). Named `GATEWAY_*` like `GATEWAY_PORT` and `GATEWAY_PIN` rather than
  `CHAIN_ID`/`RPC` **deliberately**: those two belong to `mk/10-forge.mk` and `RUNBOOK.md` § 0 tells
  you to `export` them, so a shell set up for a testnet deploy would otherwise aim the dev stack's
  gateway at that testnet without saying so.
- **`procs/gateway.toml.tmpl`** renders both, in `defaultChain`, `[chainConfigs.<id>]`, `"ChainID"`
  and `"RPC"`. `$ANVIL_PORT` is no longer substituted because it is no longer in the template: it
  reaches the config inside `GATEWAY_RPC`'s default, already expanded.
- **`tools/gateway-check.sh`** takes `CHAIN_ID` (default `31337`) for the chain label in its two local
  host forms, and derives a `--resolve` from a `GATEWAY_BASE` on loopback. That second half is the one
  that mattered: curl resolves neither `localhost` subdomains nor the four-label form — Chrome does,
  curl does not — so before this change a local base in hosted mode died in **resolution** and the
  script reported it as "no gateway at …", which reads exactly like a gateway that is not running.
  The base already carries the host and the port, so nothing new is passed in.

**The defaults did not move, which is the gate step 0 puts on this edit.** `make serve`, then the
local `make gateway-check` on anvil at the defaults, before and after:

| | before the change | after the change |
|:--|:--|:--|
| run at | 2026-11-18 19:55:51–19:56:00Z | 2026-11-18 20:02:29–20:02:34Z |
| `make serve`'s gateway line | `gateway: serving chain 31337 at http://127.0.0.1:8787 (RPC http://127.0.0.1:8545)` | identical |
| `make gateway-check` | `all assertions passed`, **exit 0** | `all assertions passed`, **exit 0** |
| served bytes · injected block | 70,129 · 7,872 | 70,129 · 7,872 |
| body minus block vs `html()` | 62,257 = 62,257, **equal** | 62,257 = 62,257, **equal** |
| `/widget.js` vs `app/dist/widget.js` | 8,509, **identical** | 8,509, **identical** |
| `/nope` · three-label host | 404 · 200 | 404 · 200 |

The two check outputs are **identical line for line, 24 lines each** (`diff -q` quiet), and the
rendered `cache/gateway.toml` is **byte-identical**: 302 bytes, sha256
`cc13e915e68c775f4e69c3c0af5205481d32e0d8456a33dd7b309cdb29398223`. An earlier revision of the
template carried a three-line comment, which made the rendered config differ by those comments alone;
the comment moved into `tools/gateway.sh` beside the parameters precisely so this row could read
byte-identical rather than equal-once-stripped.

**One thing measured rather than assumed, after the first version of the change assumed the opposite.**
The template's `[name2chain] "anvil" = …` alias takes the chain id too, and has to. Left at a literal
`31337`, chain 11155111 **refused to start**:

```
level=fatal msg="Chain short name anvil is defined, but its chain is not\n"
```

The pin validates that table against `[chainConfigs]` at startup, so a dangling alias is fatal, not
inert. `"anvil"` now reads as "the chain this local gateway serves", which is the only chain it ever
serves, and it still renders `"anvil" = 31337` at the defaults.

## The gateway that served step 2, and the primary's state then

The amended step 0 asks for both, so both are here.

**Step 2 was served by the project's own gateway**, not by w3link: m04-t02's `tools/gateway.sh` build
of `ethstorage/web3url-gateway` at its tracked pin `c5826718855a`, pointed at
`https://ethereum-sepolia-rpc.publicnode.com` for 11155111 on port 8799 — the authenticated path
decision 53 names. Base: `http://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3.localhost:8799`.
The binary was not rebuilt: `cache/` is gitignored and was warmed from m04-t04's build of the same
pin, whose clone's `HEAD` reads `c5826718855a9ece2b71abfee2f4e548a83b9d16`.

**It passed the hosted check before the run and again after it**, with the Sepolia `nodev` bundle in
place, so only a passing gateway was driven:

| hosted `gateway-check` against the project's own base | 20:03:24Z (before) | 20:45:08Z (after) |
|:--|:--|:--|
| status · content-type · three `Web3-*` headers | 200 · `text/html; charset=utf-8` · all three | the same |
| served bytes · injected block · body minus block | 70,137 · 7,872 · **62,265** | the same |
| `html()` on chain | **62,265** — **equal** | **62,265** — **equal** |
| `/widget.js` | 8,509, **identical** to `app/dist/widget.js` | the same |
| `/nope` · verdict | 404 · `all assertions passed`, **exit 0** | 404 · `all assertions passed`, **exit 0** |
| cache headers | `web3urlgateway-cache-status: miss`, no `Age` | the same |

**The primary was failing throughout**, read at both ends of the run and unchanged from step 0's
19:35:24Z reading:

| w3link Sepolia | 20:00:43Z (before step 2) | 20:45:05Z (after step 2) |
|:--|:--|:--|
| served bytes | 69,053 | 69,053 |
| body minus block vs `html()` | 61,181 vs **62,265** — **FAIL** | 61,181 vs **62,265** — **FAIL** |
| `/widget.js` | 8,132 vs built 8,509 — **FAIL** | 8,132 vs 8,509 — **FAIL** |
| verdict | `2 assertion(s) failed`, exit 1 | `2 assertion(s) failed`, exit 1 |

Those are § Uploads row 1's bytes, so the gateway is still two uploads behind, and the `miss` cache
header still says it is not a cache hit. **Step 2 did not depend on which gateway served the bytes**:
the gateway serves the chain's current document byte-exactly either way, and the row this task
measures — the request count through the injected provider — is a property of the page and the
provider, not of the host that delivered it.

## Step 2 — the engineer's headless Sepolia run

2026-11-18, 20:06–20:42Z. `playwright-core` 1.63.0 from outside the repo with the cached arm64
chromium `AGENTS.md` names (`~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`), against
the gateway base above — **not** a local build and never `?rpc=`. The provider is the engineer's own
object, injected as `window.ethereum` through `context.addInitScript` before any page script runs; the
page took it, because nothing announces over EIP-6963 (`index.html:102-107`). Every method goes to
publicnode through `page.exposeFunction` except the five TASK.md step 2 names, and
`eth_sendTransaction` becomes a `cast send` with the engineer's keystore whose receipt hash is the
answer — the page then polls `eth_getTransactionReceipt` itself.

**`page errors: none`** across the whole run. The only console entry was one
`Failed to load resource: … 404 (Not Found)` per page load, which is the favicon the gateway does not
serve; no request the page made for its own content failed.

| row | what it did | what the page did — the expected state in every case |
|:--|:--|:--|
| probe | the three origin expressions on the landing | `window.top === window` **true** · `typeof window.ethereum` **object** · `location.origin` **`http://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3.localhost:8799`** — the four-label form, this run's base rather than the `https:` w3link origin Denizen will read |
| (a) | opened the base | title **`RAKE`**, header `… sepolia 0x5A15…C50d`, and the featured widget read the DNZN table **through the wallet**: `treasury 20% · ops 40% · creator 40% · delay 1h · owner 0x3578…902b` |
| (b) | pressed connect | there is nothing to press: `eth_accounts` answers `[ENGINEER]` at once, so the header already showed `0x5A15…C50d`. An injected provider has no approval prompt — the row is Denizen's to exercise |
| (c) | pasted `count.js`, opened `#/distros/0x71a4…7a4A` | description **`DNZN // FUND DISTRIBUTION`**; `changes` carried `applied setDescription` **and** the `queued setDescription … applied` pair of #209, plus the `queued`/`cancelled transferOwnership` pair; `activity` carried `in Ξ0.0100 from 0x3578…902B` and **`in Ξ0.0500 present at creation`**, which is criterion 4's `create` deposit; all three sections painted. First-load figure below |
| (d) | reloaded, pasted again, same route | the same sections, `firstLoad: false` from `sessionStorage`. Second-load figure below |
| (e) | pressed `load older` once | the line was shown on all three sections, so the recorded answer is the delta, not "not shown". **84** more `eth_getLogs`, and the boundary moves — see below |
| (f) | `#/create`, owner an EOA, delay `60`, three rows 40/30/30 ascending | the editor read `3 beneficiaries · total 100%`; salt #1 was refused — `a distribution already exists at 0xD96d5C16…1ee5 · choose another salt #`, the #22 guard working — and salt #2 predicted `0x4E4661c5…D95c`; `create` landed and the page routed there, heading `m04-t05 engineer UAT` |
| (g) | sent `0.003` ETH as a plain transfer, then pressed `distribute` | after the pay-in, `activity` gained **`in Ξ0.0030 from 0x5A15…C50d`** and funds read **`waiting to distribute Ξ0.0030`**. After `distribute`: `activity` **`distributed Ξ0.0030 by the table`** and **`escrowed Ξ0.0009 · 0xC559…7C95`**, funds **`Ξ0.0009 held in escrow`** with the row `the push failed, so this share waits here` and a `release` control. 0.0009 is 30% of 0.003 — the receiver's share, escrowed because `receive()` reverts while `accepting` is false |
| (h) | flipped the receiver, then pressed `release` | `activity` gained **`released Ξ0.0009 · 0xC559…7C95`**, the escrow row went, funds returned to `Ξ0.0000` |
| (i) | queued a table change 40/30 → **41/29**, waited out the delay, applied; then queued a `setDescription` and cancelled it | `changes` gained **`queued setBeneficiaries · new table · 41% / 29% / 30% · nonce 1 · under a minute`** and the apply control read **`anyone can apply once the delay passes`**; after `apply`, **`applied setBeneficiaries`** and the table itself read **`41% uat · 29% engineer · 30% receiver`**; after `cancel`, **`cancelled setDescription · new name · m04-t05 engineer UAT · renamed`** |
| (j) | `#/create` with the owner set to the Ops vault, two rows, delay `3600`; then pressed one drawer write | the owner note read **`not the connected wallet — a contract — it will have to propose and cancel through its own calls`** and step 2 proceeded with no acknowledgement — § Deviations 6, where the page is right and the row was wrong. After `create` at `0xb9A08bEb…e07b`, the owner bar read **`you are a signer on 0x00c0…3790 ↗, which owns this distribution — every change below is calldata to submit through it`**, and all four drawer writes rendered as **`copy calldata for your vault`**. Pressing one: **`copied · 676 bytes`**, **no transaction sent** |
| (k) | — | **`pending on t04 (e)`**. There is no published host-page URL to open; unchanged from step 0 |
| (l) | `#/docs`, then `#/docs#widget` | **14** sections in the rail, **`disclaimer` first**, matching `test/docs.test.mjs:95`; the widget section carried the snippet with **this chain's** gateway URL — `<script src="http://0x00a90943…11155111.w3.localhost:8799/widget.js">`, the base the page was served from, so the snippet follows the origin rather than hard-coding w3link |
| (m) | disposition | **no issue opened.** Every row reached its expected state; the one mismatch was the script's, and the script was fixed in this PR |

**Row (j)'s bytes, since the screenshot shows a confirmation rather than the calldata.** The four-label
`*.localhost` origin is a **secure context** in Chromium even over `http:` (`window.isSecureContext`
→ `true`, `typeof navigator.clipboard` → `object`), so `copyCalldata` took the clipboard branch and
the textarea fallback never appeared. With `clipboard-read` granted, what the button put on the
clipboard is **byte-equal** to the page's own `Eth.enc(w.sig, w.args())` for the `table` write: 1,354
hex chars, **676 bytes**, selector `0x37558af5` (`propose(bytes)`), sha256
`cee2c833f48be1aeffb065b38e898f7a65110c311a499bf3540763c897c57416`. Denizen, on the `https:` w3link
origin, will see the same branch; the textarea fallback stays untested here and says so.

**The screenshots**, all under `shots/engineer/`: `probe-a-b-landing`, `c-distro`, `d-second`,
`e-older`, `f-form`, `f-created`, `g-payin`, `g-distributed`, `h-released`, `i-pending`, `i-applied`,
`i-cancelled`, `j-guard`, `j-ownerbar`, `j-calldata`, `l-docs`, `l-docs-widget` — 17 files, one or
more per row, each under 300 KB.

### The transactions step 2 sent

Ten, all `status 0x1`, all from the engineer's wallet `0x5A158aF8…C50d` through `cast send` with the
`elanik` keystore, on the explorer at `https://sepolia.etherscan.io/tx/<hash>`. Total **7,764,816**
gas, against step 0's estimate of about 1.35 M — the propose writes are what blew past it, and
§ Discoveries says why.

| row | transaction | hash | gas used |
|:--|:--|:--|--:|
| — | `RevertingReceiver` deploy | `0x365e2edd1a68562ee09a48518535994d04999b35ce112e6bf1ac06414935bd05` | 559,747 |
| (f) | `create`, EOA-owned | `0x8b6923f8bc2b08e554a3aa156bb59ffbcbe040fba84d21c9254c9af0f816debd` | 1,301,141 |
| (g) | pay-in `0.003` ETH | `0x64f0392c8275da5b559cb27af9d9a59de9dec366bb770bc8a5a5715417804020` | 25,562 |
| (g) | `distribute` | `0xc84179f10086c2cefed1fa9535cc18b739e984b3bc4a657e91f2f4b31d764af2` | 292,168 |
| (h) | `setAccepting(true)` | `0x145f3ae78c1866609c65a12ee71209b89f434e3147e24635a7a9111d2101b3f5` | 125,513 |
| (h) | `release` | `0x2f6442092cbf34703cbf708ff77c1f0d2e7978b6d15222fac994bbf9e50a9c29` | 48,548 |
| (i) | `propose` — the table change | `0xa3c847b2d1b6b3db9d641e9296a6a8a55b24e9c8f71365358e488ca11c4c096a` | 3,249,747 |
| (i) | `applyQueued` | `0x5ba1e5a848085c9f5a16565373d83d46e6bbe8286eea065e4c34f981f872c58e` | 393,617 |
| (i) | `propose` — the `setDescription` | `0xe7f702863819cc98ee528fe6b5c138573f7c9805a51f38277bc7669855bb1c72` | 1,138,506 |
| (i) | `cancel` | `0x4dd3ae6533eec0968383b3d44d81090228646e849d458df396812a08f8fdbe49` | 116,072 |
| (j) | `create`, vault-owned | `0xfaa1b698d3bcb2df2e52f3dacd033d1ea4ddf9e26c17789a05f9e1d030e5f9ac` | 1,073,942 |

**What they left on Sepolia**, read back from the chain rather than from the page:

| contract | `owner()` | `delay()` | note |
|:--|:--|--:|:--|
| `0x4E4661c5bC37B65785e6fE016daeBe9DAb86D95c` | `0x5A158aF8…C50d` — the engineer | 60 | rows (f)–(i); `description()` `m04-t05 engineer UAT`, table 41/29/30 after (i) |
| `0xb9A08bEb5E4eF2Bc4Dc282783b8EA6Dd1908e07b` | `0x00c0e887…3790` — the Ops vault | 3600 | row (j); never written to, the calldata was copied not sent |
| `0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95` | — | — | the receiver; `accepting()` reads **true** after (h)'s flip |
| `0xD96d5C16495D89A8B9738F0c362643AAee821ee5` | `0x5A158aF8…C50d` | 60 | **a by-product**, salt #1, created while diagnosing the `cast send` flag trap of § Discoveries. Not part of the recorded run, which is why (f) used salt #2. Nothing reads it |

**The engineer's balance**: 0.204087421898051616 ETH at step 0, **0.201987421704518312** after the run
— about 0.0021 ETH spent net, the 0.003 pay-in less the 0.0009 the table returned to the engineer's
own row, plus gas. No top-up is needed for anything left in this task.

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

One row per transaction row of `UAT.md`, both chains. **The engineer's column is filled from step 2;
every Denizen cell is empty, because step 3 has not run.** The engineer's column is Sepolia-only.

### Sepolia · 11155111

| row | transaction | engineer (step 2) | Denizen (step 3) |
|:--|:--|:--|:--|
| (f) | `create`, EOA-owned | `0x8b6923f8bc2b08e554a3aa156bb59ffbcbe040fba84d21c9254c9af0f816debd` | |
| (g) | pay-in `0.003` ETH | `0x64f0392c8275da5b559cb27af9d9a59de9dec366bb770bc8a5a5715417804020` | |
| (g) | `distribute` | `0xc84179f10086c2cefed1fa9535cc18b739e984b3bc4a657e91f2f4b31d764af2` | |
| (h) | `setAccepting(true)` on the receiver | `0x145f3ae78c1866609c65a12ee71209b89f434e3147e24635a7a9111d2101b3f5` | |
| (h) | `release` | `0x2f6442092cbf34703cbf708ff77c1f0d2e7978b6d15222fac994bbf9e50a9c29` | |
| (i) | `propose` — the table change | `0xa3c847b2d1b6b3db9d641e9296a6a8a55b24e9c8f71365358e488ca11c4c096a` | |
| (i) | `applyQueued` | `0x5ba1e5a848085c9f5a16565373d83d46e6bbe8286eea065e4c34f981f872c58e` | |
| (i) | `propose` — the `setDescription` | `0xe7f702863819cc98ee528fe6b5c138573f7c9805a51f38277bc7669855bb1c72` | |
| (i) | `cancel` | `0x4dd3ae6533eec0968383b3d44d81090228646e849d458df396812a08f8fdbe49` | |
| (j) | `create`, vault-owned | `0xfaa1b698d3bcb2df2e52f3dacd033d1ea4ddf9e26c17789a05f9e1d030e5f9ac` | |

Ten hashes, which is AC 3's count for a chain where (j) was reachable. They are the **engineer's**,
not the UAT wallet's: AC 3 asks for Denizen's column to resolve to the UAT wallet as sender, and that
column is still empty.

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

Sepolia's is deployed and is **to be reused by Denizen's Sepolia run**; Base Sepolia's is deployed
before that chain's run and is not this task's to place yet.

| chain | address | deploy hash | `setAccepting(true)` hash |
|:--|:--|:--|:--|
| 11155111 | `0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95` | `0x365e2edd1a68562ee09a48518535994d04999b35ce112e6bf1ac06414935bd05` | `0x145f3ae78c1866609c65a12ee71209b89f434e3147e24635a7a9111d2101b3f5` |
| 84532 | `0x869DFe837B8dB2819027E53d75C20bE31f13acD2` | `0x65aa3cb36266a890ef6b134b613d833f44d1fb0fc84bf976285911738f73f418` | — |

**Added 2026-11-22 (m05-t01c step 9):** Base Sepolia's receiver was deployed for the Product Owner's run, 227 bytes, `accepting()` **false**. Sepolia's was set back to **false** the same day in `0xa01fa076796a708d40af27fbfdffe3842d7cabe8c902bf5ba9013bccb7d4f0a5`. Both read from the chain by the architect.

`cast codesize` **227**, `accepting()` **false** at construction and **true** after the flip, so the
escrow in (g) and the release in (h) each had the state they needed. **Denizen's Sepolia run will find
it already `true`** and must flip it back to `false` before row (g), or `distribute` will push
successfully and there will be no escrow to release — one `cast send 0xC5593d2a…7C95
"setAccepting(bool)" false` from any key. That is in § For Denizen.

## The wallet path

Step 4's table. **The engineer's two rows are measured; Denizen's four are empty, pending step 3.**
The instrument is `count.js` for every row unless the extension-panel fallback replaces one, in which
case the row says so.

| chain | date | RPC | head | `eth_getLogs` | ms to painted | `load older` delta | instrument |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 11155111 · first load | | | | | | | |
| 11155111 · second load | | | | | | | |
| 84532 · first load | | | | | | | |
| 84532 · second load | | | | | | | |
| 11155111 · engineer · first load | 2026-11-18 | publicnode | 12,163,790 | **84** | **1,385** | **84** per press | `count.js`, headless |
| 11155111 · engineer · second load | 2026-11-18 | publicnode | 12,163,791 | **84** | **13,368** | — | `count.js`, headless |

Two engineer rows rather than AC 4's minimum of one, because step 2's own check asks for the
first-load and second-load figures. Both are publicnode's, labelled as such and **not the wallet's** —
MetaMask's endpoint is step 3's and may answer very differently, which is the whole point of keeping
the rows apart.

**What the figure means against `MAX_WINDOWS` 40 per kind (`index.html:221`) and the 10,000-block
opening window (`:219`).** The 84 is not a count under the ceiling — it **is** the ceiling, for two of
the three log kinds. Measured per kind by recording every `eth_getLogs` filter the page sent:

| log kind | windows | window sizes tried | contiguous coverage |
|:--|--:|:--|:--|
| `topic-set(5)` — the funds and activity events | **40** — at `MAX_WINDOWS` | 10,000 → 5,000 → 2,500 → 1,250 → 625 → 312 → 156 → 78 → 39 → 19 | runs out of budget |
| `topic-set(4)` — the change events | **40** — at `MAX_WINDOWS` | the same ladder | runs out of budget |
| `Transfer` (`0xddf252ad…`) | **4** | 10,000 whole, every time | 40,000 blocks, finished |

So **publicnode does not take the 10,000-block opening window for the multi-topic filters**: it
refuses, the page halves the way `rangeCap` and the shrink path intend, and the budget is exhausted
before the factory block — which is why the `history before block N not loaded · load older` line
appears on all three sections on every load. The single-topic `Transfer` query *is* answered at 10,000
whole, by the same endpoint in the same session, so the refusal is about the filter's topic breadth and
not about the range alone. One `load older` press spends another full budget, **84** again (40 + 40 +
4), and moves the boundary by however much the ladder happens to win: two presses measured in one
session moved it **39** blocks and then **6,445** blocks. That variance is the endpoint's, not the
page's.

**Did the count move between the loads? No — 84 and 84.** No log cache is in this bundle, and the
reading agrees. What did move is the *time*: 1,385 ms against 13,368 ms for the identical 84 requests,
and contiguous coverage differed between loads in the same way the presses differed. Both are
publicnode's latency and refusal pattern varying minute to minute, with `WINDOW_INFLIGHT` 4 hiding
round trips when the endpoint is quick. The figure to carry forward is the request count, which is
stable; the millisecond figure is a reading of one endpoint on one afternoon.

## The origin probe

m04-t02's pending wallet half, closed in step 3 on the landing of each chain. **Denizen's column is
empty**, and the engineer's column does **not** close it — the reading below is a different origin
through a different provider, recorded because step 2 took it, not because it substitutes.

| expression | expected | engineer · 11155111 (step 2) | Denizen · 11155111 | Denizen · 84532 |
|:--|:--|:--|:--|:--|
| `window.top === window` | `true` | **`true`** | | |
| `typeof window.ethereum` | `object` | **`object`** | | |
| `location.origin` | the four-label `https:` gateway origin | **`http://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3.localhost:8799`** — four labels, but the project's own gateway over `http:` | | |

The first two answers are the ones m04-t02 was waiting on and they read as expected, from an injected
provider rather than MetaMask. The third is the one that genuinely differs: Denizen's will be the
`https:` w3link origin, and only that reading closes the question m04-t02 asked, because the opaque-origin
risk MILESTONE § Risks 2 names is about the hosted gateway's origin and not about a loopback one.

## Carried issues

Step 5's four lines. **Each is pending its figure; none is written from a reading that exists yet.**

- **#165** — the per-load count and the `load older` delta on both chains, and which closing shape the
  figure fits: **the engineer's Sepolia figure is in and it is not shape (b); both chains through the
  wallet are still step 3's, so the issue does not close on this handoff.** Through publicnode the
  count is **84 per load** and **84 per `load older` press**, which is `MAX_WINDOWS` **40 reached on
  two of the three log kinds** plus 4 for `Transfer` — not "well under the ceiling" — and publicnode
  **refuses the 10,000-block opening window** for the multi-topic filters, which is the other half of
  shape (b)'s condition. So on this endpoint the issue **carries on the number**, for decision 52's
  addendum to act on. Shape (b) is still open on the facts that matter, because MetaMask's default
  endpoint is Infura, whose 10,000-block limit is exactly the `WINDOW_START` the page was written
  against (`index.html:219`): if Denizen's rows come back at 3 or 4 requests a load, (b) fits and the
  engineer's row was measuring a stricter endpoint. **Denizen's four rows decide it.**
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

**One, and it is not a row.** [#251](https://github.com/dnznlabs/rake/issues/251) — `RUNBOOK.md:66`
defines `SIGNER` as `--account <keystore> --sender <address>`, which `forge script` takes and which
**`cast send` and `forge create` refuse outright** on the pinned forge 1.7.1-dev with
`error: unexpected argument '--sender' found`. Any step that follows § 0 literally with either
command fails before it reaches the network; the working form drops `--sender` and lets the keystore
name the sender. It cost a full debugging pass here because the failure reads as a signing problem
rather than an argument-parsing one. Labelled `carried`: the runbook amendment is m05-t01's.

**No row is a finding, and that is a reading rather than an omission.** Step 2 ran all fourteen
Sepolia rows and **every one reached its expected state**, so there is no row to open an issue for.
The one mismatch was row (j)'s *expectation* of an acknowledgement, and the page turned out to
implement #172 exactly as #172 specifies — opening an issue against it would have been a false
finding. The plan agreed: `TASK.md` row (j) was rewritten to expect the contract-owner note
([#250](https://github.com/dnznlabs/rake/pull/250), merged `74f680f`), so the expected state now
matches and AC 7 is satisfied without an issue. § Deviations 6 carries the proof. Step 3's rows are
Denizen's and may yet produce findings.

**Row (e) is not a finding either, and it nearly was reported as one.** A reading taken seconds after
the press caught the load mid-flight — `loading older…`, boundary unmoved — which would have recorded
a press that did nothing. Awaited to a quiet request stream, each press costs **84** `eth_getLogs` and
the boundary does move: the two presses measured moved it **39** and **6,445** blocks. § Deviations 9
carries the figures. The lesson is in § Decisions: an in-flight reading is not a result.

The Sepolia gateway condition is **not** a finding of this task either: it is
[#242](https://github.com/dnznlabs/rake/issues/242), a third-party condition already filed, recorded
in § The hosted gateway.

## Deviations from the plan

1. **Row (k) is present on the Base Sepolia list as a not-run row.** Step 1 requires the two lists to
   have the same row count; step 3 (k) and § Human-in-the-loop item 5 make that row Sepolia-only. Both
   hold only if the row exists on both lists and the Base Sepolia one carries no reading, which is how
   it is written — 14 rows each, identical row ids, nothing executed for (k) on 84532.
2. **Row (i) carries four hash cells, not three.** The row's text says "Three hashes", but AC 3
   enumerates `propose` ×2, `applyQueued` and `cancel` for it — four transactions. The cells follow AC 3,
   since a missing cell is a row that cannot read red.
3. **A row `probe` precedes (a) on both lists.** Step 3 prescribes the three probe expressions before
   the first row on each chain and AC 3 requires the column filled, so it is a row rather than prose
   above the table.
4. **The bundle was built at the branch point, not at `3751211`.** Justified by an empty
   `git diff --stat 3751211 HEAD -- broadcast/ app/ src/ Makefile` — see § The served document.
5. **Steps 3 and 5 are not in this handoff, and step 4 is half of it.** Step 3 waits on Denizen; step 4
   carries the engineer's rows only. Step 2 is complete.
6. **Row (j) expected an acknowledgement the page is right not to ask for, and the script was fixed
   rather than the page reported.** TASK.md step 3 (j) and `UAT.md`'s row both said the owner guard
   "asks for an acknowledgement before step 2". It does not, for a contract owner. The note itself
   appears exactly as written — `not the connected wallet — a contract — it will have to propose and
   cancel through its own calls` — and then Next proceeds. The mechanism, read rather than guessed:
   `probeOwner` returns `cls: ''` for **any** address with code (`app/src/index.html:1482`),
   `Model.ownerKind` sets `ack: probe.cls === 'warn'` (`app/src/model.js:100`), and `paintOwner` draws
   the box only for `k.ack && k.cls` (`app/src/index.html:1742`). And this is **#172's own
   specification**, verbatim: "Acknowledgement required before Next for the never-used case; the other
   two show the note and proceed." So the page is correct and the row's expectation was wrong.
   `UAT.md` row (j) is amended on both lists to expect the note and no acknowledgement, with the
   citations; still 14 rows each, same ids, every cell filled. **Nothing about this depends on who
   signs** — `isOwner` does not enter it — so Denizen would have met the same wall, and TASK.md step 3
   (j)'s wording is the line an architect may want to revise. TASK.md itself is untouched.
7. **Row (f)'s owner is the engineer's wallet, not the UAT wallet.** The cell says "owner the UAT
   wallet", which is right for Denizen and impossible for the engineer: `propose` is `onlyOwner`
   (`0x30cd7471` `NotOwner()`), so with the UAT wallet as owner row (i)'s four writes could not be
   sent from this session at all, and the drawer would not even offer them. Row (f)'s subject is
   **EOA ownership** — its own title is "Create, EOA-owned" — and for Denizen the EOA is the UAT
   wallet while for this run it is the engineer's. The script needs no change: in Denizen's run the
   owner field and the connected wallet are the same address by construction.
8. **Row (g)'s pay-in went through the injected provider, not a page control.** The cell says "from
   MetaMask as a plain transfer", which is a wallet action rather than a page one; the headless
   equivalent is `window.ethereum.request({ method: 'eth_sendTransaction', … })` with no calldata,
   which is the same `cast send` underneath and the same plain transfer on chain — `data: 0x`, value
   `0xaa87bee538000` = 0.003 ETH. Same for (h)'s `setAccepting`, which the row already assigns to
   `cast send` from any key.
9. **Row (e) is recorded as a delta, and the delta needed waiting out.** The partial line was shown on
   all three sections, so the "not shown" branch does not apply. A first reading taken a few seconds
   after the press caught it mid-flight — `loading older…`, boundary unmoved — and would have recorded
   a press that did nothing. Awaited to a quiet request stream, each press costs 84 and the boundary
   does move; the two presses measured moved it 39 and 6,445 blocks.

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
- **RUNBOOK § 0's `SIGNER` does not work with `cast send` or `forge create` on the pinned forge.**
  `SIGNER` is `--account <keystore> --sender <address>`, which `forge script` takes. Both of the other
  two refuse it outright on forge **1.7.1-dev**: `error: unexpected argument '--sender' found · tip: a
  similar argument exists: '--ledger'`. TASK.md step 2 prescribes `cast send … $SIGNER --json` and
  `forge create … $SIGNER`, so both had to drop `--sender` and pass `--account elanik
  --password-file …`; the keystore names the sender anyway. It cost a full debugging pass, because the
  failure surfaced in the browser as the page's own `create · reverted` status line: the preflight
  `eth_call` had passed, `eth_sendTransaction` reached the bridge, and `cast send`'s stderr was the
  only place the real reason existed. `forge create` also needs **`--broadcast`** on this version or
  it only simulates — the prescribed command without it deploys nothing and says so quietly.
- **The pinned gateway validates `[name2chain]` at startup, so a dangling alias is fatal.** Measured,
  after the first version of the parameterisation left the alias at a literal `31337` and chain
  11155111 died with `level=fatal msg="Chain short name anvil is defined, but its chain is not"`.
  § The parameterisation carries it.
- **A four-label `*.localhost` base is a secure context in Chromium, and curl cannot resolve it at
  all.** The two facts sit either side of the same hostname. Chromium gives
  `0x00a9….11155111.w3.localhost:8799` `window.isSecureContext === true` over plain `http:`, so
  `navigator.clipboard` exists and row (j) takes the clipboard branch rather than the textarea
  fallback — the fallback is therefore **untested** by this run. curl, on the same host, resolves
  nothing without `--resolve`, which is the change `tools/gateway-check.sh` needed.
- **`propose(bytes)` costs more than step 0's whole estimate.** The table change cost **3,249,747**
  gas and the `setDescription` **1,138,506**, against step 0's figure of about 1.2–1.35 M for the
  entire set of nine or ten transactions. The estimate came from MILESTONE § Needs from the Product
  Owner's anvil `create` figure of 280,281 and was never a measurement of `propose` on a real chain;
  Sepolia's code-deposit pricing, which RUNBOOK § 1e already records as about 7× cancun, is the
  likeliest reason a write that stores a pending action lands this high. **Denizen's balance is still
  far above what the run needs** — 0.124970105281688963 ETH against a measured 7,764,816 gas at a
  15 wei base fee, which is about 0.000000116 ETH — so no top-up is asked for, and § Balances'
  verdicts stand. It is recorded because the estimate in step 0 is wrong by a factor of six and the
  next task to quote it should quote this instead.
- **The featured widget on the landing reads through the wallet on a `nodev` build, and it showed.**
  Row (a)'s expected state includes it, and the landing rendered the DNZN table from the injected
  provider with no `data-rpc` anywhere — the first thing the run proved, before any transaction.
- **`node --check` through a pipe reports the pipe's status.** `devbox run -- node --check <file> |
  grep -v '^Info:'` exits 1 when the filter drops every line, on a file node accepted. Every exit code
  quoted here was read from the command itself inside a script.

## Open questions

**One, and it is the architect's rather than the Product Owner's.** TASK.md step 3 (j) says the owner
guard "asks for an acknowledgement before step 2". It does not, for a contract owner, and #172 says it
should not — § Deviations 6. `UAT.md`'s row is amended to match the page; **TASK.md is not mine to
edit**, so if the plan's own wording should change it takes a revised `TASK.md` on `main` through the
architect. Nothing is blocked on the answer: the row ran and reached its expected state as amended.

Otherwise none. The two things this task still waits on are not decisions: the Sepolia gateway's check
passing, which § For Denizen turns into a question only if it is still failing at 2026-11-19 ≈17:49Z
**for step 3** — step 2 no longer waits on it and has now run, per the rake#248 amendment — and
m04-t04 AC (e)'s URL, which decision 41 already assigns to the Product Owner.

## Step 3

**Step 3 did not run, and does not run on this bundle.** Decision 63 (`docs/ROADMAP.md`,
2026-11-19) moves Denizen's wallet run to M05: it executes as a step of m05-t01 after step 16, on
the m04-t16 bundle the redeployed testnets serve, with `UAT.md` as its script and M04 criterion 6's
signoff line in that handoff. The document this task's steps 0–2 read predates m04-t15 and m04-t16
by design (no Run C), so a wallet run on it would be evidence about a bundle that never ships; the
measurement of step 4 was withdrawn with t12 (decision 62). The two findings step 2's path surfaced,
[#273](https://github.com/dnznlabs/rake/issues/273) and
[#274](https://github.com/dnznlabs/rake/issues/274), are m04-t16's. § For Denizen below is the
record of what step 3 would have asked and is not live.

Step 0's document and gateway bullets, re-run by the engineer at `6634c28` — read 2026-11-19,
re-run rather than quote:

| Chain | `chain-doc` `inflated sha256` = Run B pinned hash | w3link `gateway-check` |
|:------|:--------------------------------------------------|:-----------------------|
| Sepolia · 11155111 | yes, `b1fc3b96…`; widget `8b6bbc88…` | **fail** — the endpoint serves a stale document (61,181 bytes against `html()`'s 62,265; widget 8,132 against 8,509; `cache-status: miss`, stale since at least 15:20Z); [#242](https://github.com/dnznlabs/rake/issues/242)'s third-party condition |
| Base Sepolia · 84532 | yes, `6f0225bb…`; widget `8b6bbc88…` | pass |

## For Denizen

1. **Your run on Sepolia is the one that waits; the engineer's has run.** Sepolia's hosted
   `gateway-check` still fails because the gateway serves the 2026-11-17 document — read failing at
   19:35Z, 20:00Z and 20:45Z, unchanged across about 23 hours and two uploads. Base Sepolia is clear.
   The rake#248 amendment let **step 2** run through the project's own gateway build on publicnode and
   it did, end to end, every row; **step 3 keeps w3link**, and if its check has not passed by
   **2026-11-19 ≈17:49Z** — a day after the upload executed — step 0 asks you whether to run Sepolia
   through the project's gateway or to wait. Nothing about the chain's own document is in question:
   both chains' `inflated sha256` match their builds exactly, and the project's own gateway, holding
   the same software at the same pin and varying only the node, serves the current document byte for
   byte.
2. **Before your Sepolia row (g), flip the escrow receiver back to `false`.** Step 2 left
   `0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95` with `accepting()` **true**, which is where (h) left
   it. If it is still `true` when you press `distribute`, the push to that row will **succeed**, there
   will be no `escrowed` row and no escrow to release, and rows (g) and (h) will both fail to match
   for a reason that has nothing to do with the page. One transaction from any key, before (g):
   `cast send 0xC5593d2aa5f89fDaBE6e298b4AC38ad1E50D7C95 "setAccepting(bool)" false --rpc-url "$RPC"`
   — the engineer does it on request during your session. Base Sepolia's receiver does not exist yet
   and will be deployed `false` at construction, so that chain needs nothing.
3. **Row (j) no longer expects an acknowledgement**, and if you were watching for one, that is why it
   does not appear: #172 requires it only for a never-used address, and the Ops vault is a contract.
   You will see the note — `not the connected wallet — a contract — it will have to propose and cancel
   through its own calls` — and the flow will continue. § Deviations 6.
4. **m04-t04 AC (e)'s host-page URL**, if you have published it — row (k) is `pending on t04 (e)`
   until it arrives, and criterion 5's live half with it.
5. **The signoff line** goes under `docs/milestones/m04/MILESTONE.md` § Phases 4, in your own words,
   dated, once step 3 has run with nothing open. The PR carries it.
6. **One wording question, and it is yours under decision 17.** Row (j) expects the owner bar to read
   `you are a signer on <vault>, which owns this distribution — every change below is calldata to
   submit through it`, and the drawer's writes to read `copy calldata for your vault`. Both strings
   are in the shipped document. If either reads wrong to you when you see it in place, that is a
   wording finding rather than a defect, and it is the one question this task holds open for you.
