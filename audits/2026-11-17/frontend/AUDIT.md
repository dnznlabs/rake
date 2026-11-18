# Front-end audit — 2026-11-17 (m04-t04)

The front-end pass of m04-t04: two independent legs reading `audits/SCOPE.frontend` under
`audits/prompts/frontend-leg.md`, no skill. This is not the Solidity audit, and its findings are
not in `src/`.

## 1. Provenance

```
audit date        2026-11-17
code commit       b04af653317e63d801886e37d16f721693cf8b81  (dirty: no)
scope             app/src/index.html
                  app/src/model.js
                  app/src/eth.js
                  app/src/widget.js
                  app/src/layout.html
                  app/build.mjs
                  app/inline-scripts.mjs
                  app/broadcast.mjs
                  app/version.mjs
skill             none — web-security prompt, audits/prompts/frontend-leg.md
leg 1 requested   codex gpt-5.6-sol · effort high · 1 pass
leg 1 cli         codex-cli 0.158.0
leg 1 observed    model: gpt-5.6-sol
leg 1 wall        433s (exit 0)
leg 1 tokens      131,757
leg 2 requested   claude opus · 1 pass
leg 2 cli         2.1.310 (Claude Code)
leg 2 observed    "model":"claude-opus-5-5"
leg 2 wall        415s (exit 0)
leg 2 tokens      "output_tokens":1102
```

That is the runner's block, copied byte for byte. It uses the front-end pass's own fields
(`requested` / `cli` / `observed` / `wall` per leg, and `skill none`) rather than the Solidity
template's `leg 1` / `leg 2` lines. Every field the template asks for has a value in it, so none is
marked `not reported`. One reading note: leg 2's `"output_tokens":1102` is less than its
23,101-byte report needs, so it cannot be a whole-session count. This document records it as
captured and does not correct it.

## Counts

- **Leg 1** (`gpt-5.6-sol/`): **9** findings, F-01 to F-09. Its scale has no Info level.
- **Leg 2** (`opus/`): **21** findings, F1 to F21: 15 rated Low or above, and 6 Info.
- **30** findings read in total, before deduplication.
- **6** issues were reported by both legs. Merging each pair leaves **24 distinct findings**.

| Severity | Count | Findings |
|---|---|---|
| Critical | 1 | R1 |
| High | 2 | R2, R3 |
| Medium | 7 | R4–R10 |
| Low | 8 | R11–R18 |
| Info | 6 | R19–R24 |
| **Total** | **24** | |

**The finding count is 24.** SECURITY.md should carry one row per `R` number below.

Line numbers were checked against `b04af65`. Where a leg's number does not exist in the file, the
correct line is given and the leg's number is recorded next to it.

## 2. Findings

### R1 — Critical — The gateway's injected script runs first in the dapp's origin and can change what is shown, copied or sent

- **File:** `app/src/index.html:13`. That is `<body>`, the point where the gateway injects its
  block, ahead of every application script on `:16-25`.
- **Sinks named:** `:373-382` (copy) and `:941-964` (vault calldata copy).
- **Found by:** leg 1 only (F-01).
- **Severity:** Critical (leg 1). There is no second rating to reconcile, so the leg's rating is
  carried.

The script that `cmd/server/html.patch` puts after `<body>` (AGENTS.md § The dapp) runs in the
same global before the dapp does. It can:

- register earlier capturing listeners;
- rewrite `data-copy` and `data-send`;
- wrap `window.ethereum.request`.

`esc()`, the preflights and `holdToFire` do not constrain it. Leg 1's repro is a capturing click
listener that rewrites a `.cp` element's `data-copy`.

**Rollup note:** the precondition is a hostile or compromised gateway operator. A gateway that can
inject script can also serve a different document, so the on-chain bytes do not authenticate what a
gateway visitor runs, injection or no injection. Leg 1 says the same thing in its last paragraph. No
change to the scoped files removes this. Whether it is a defect or a documented property of the
w3link path is for triage to decide. Leg 2 did not read `html.patch` and said so, so it makes no
claim either way (see § 3).

### R2 — High — Provider-supplied hashes and addresses are interpolated unescaped into attributes and `href`s by `ext()` / `xlink()`

- **File:** `app/src/index.html:363-370` (the sink).
- **Sources:**
  - the `eth_sendTransaction` hash, written into the page at `:159` by `txSay`;
  - `log.transactionHash`, through `histRows` at `:757`;
  - `log.topics[1]` for `Applied` and `Cancelled`;
  - the "queued in" tx hash on the pending block;
  - `log.address` from the address-less `Transfer` query.
- **Found by:** both legs (leg 1 F-03, leg 2 F2).
- **Severity:** High from both legs, adopted.

`ext()` writes `v` raw into `title`, `data-addr`, `aria-label`, `data-copy` and, through `xlink`,
into `href`. No hex-shape check runs before it. `Eth.checksum` (`app/src/eth.js:183-186`) lowercases
and re-cases its input but passes every character through, so it is not a filter. Leg 2 ran it on
`0x'+alert(1)+…` and got the payload back.

Both legs give the same repro: a provider that returns `"><img src=x onerror=…>` as a tx hash gets
script execution in the dapp's origin. Both legs then note that script there can rewrite every later
transaction and every clipboard value.

Leg 2 adds a latent instance:

- `ACC` from `eth_accounts` is never checked as an address.
- It reaches `ext('address', ACC, …)` on the list path.
- Today it is stopped only because `word(ACC)` throws first.

### R3 — High — The detail page and the widget paint any contract as a Rake distribution

- **File:** `app/src/index.html:539-541`. `loadDistro` checks only that the code is not `0x`
  (verified at `:540`).
- **Related lines in index.html:**
  - the route match, `:2032-2033`;
  - `addRecent`, `:1160`;
  - the heir load, `:1162-1163`.
- **Same gap in the widget:** `app/src/widget.js:151-163`.
- **Found by:** leg 2 only (F1).
- **Severity:** High (leg 2), adopted.

Nothing compares the code with the PUSH0 clone of `implementation()`, or checks the address against
the factory's `Created` logs or `predict()`. Any contract that answers `snapshot()`, `reserved` and
`pendingOwner` is painted with the page's full trust surface:

- the table;
- the delay;
- the timelock phases;
- "anyone can apply";
- the `distribute` buttons.

The fake is also saved to the visitor's `rake.recent`. A link to a fake that claims a seven-day
delay but forwards on `receive()` is a phishing page carrying the dapp's own trust signals.

Secondary effect: a fake can report a large `nonce` with one pending entry. `Model.nonceOf`
(`index.html:826`, `model.js:275-281`) then runs up to 2³² keccaks on every paint, which freezes the
tab.

### R4 — Medium — The build substitutes unvalidated values raw into JavaScript string literals and into markup

- **Files:**
  - `app/build.mjs:73-78` (`--set` overrides);
  - `app/build.mjs:81-83` (`substitute`);
  - `app/build.mjs:37-59` (`deployed`).
- **Sinks:** `app/src/index.html:34` (`CFG`), and `CFG.version` written as markup at
  `app/src/index.html:1878`.
- **Found by:** both legs (leg 1 F-02, leg 2 F10).
- **Severities:** leg 1 High, leg 2 Medium. **This document adopts Medium.**

**Why Medium:** every path needs write access to an input of the build: the command line, or a
tracked `broadcast/*/run-latest.json`. That is the same authority as editing `index.html` directly.
What the finding adds is narrower:

- the input is one reviewers read less carefully than code (leg 2's argument);
- `--set` silently discards the validation `version.mjs` applies (leg 1's argument).

That is leg 1's own definition of Medium ("a stronger precondition"), and it is where leg 2 put it.

**The two legs' sources:**

- **Leg 1:** `--set VERSION=<img … onerror=…>` overrides the `marked()` value read from `App`'s
  constructor and reaches `${CFG.version}` in the docs view. A quote in any value breaks out of the
  `CFG` object literal.
- **Leg 2:** a tracked broadcast log's `contractAddress` passes through `Eth.checksum` unchanged.
  Nothing checks it against `^0x[0-9a-fA-F]{40}$`.

**Leg 2's two extra sub-points:**

- A *valid* replacement address in the JSON silently re-points the bundle at another factory, even
  though the factory's CREATE2 address could be computed and asserted.
- In `deployed()`'s name-ordered loop, the last `contractName` wins, so a same-named contract in a
  later script directory overrides the address silently.

**Leg 2's line numbers for this finding do not exist:** `build.mjs` has 141 lines and
`broadcast.mjs` has 71. Its references map to the real lines as follows:

| Leg 2 cited | Actual line | What is there |
|---|---|---|
| `build.mjs:237` | `build.mjs:47` | `Eth.checksum(c.address)` |
| `build.mjs:273` | `build.mjs:83` | `substitute` |
| `build.mjs:230-237` | `build.mjs:40-47` | the loop in `deployed()` |
| `broadcast.mjs:436-441` | `broadcast.mjs:65-70` | `creations()` |

The mechanism leg 2 describes matches the code at those real lines.

### R5 — Medium — Beneficiary rows skip the EIP-55 refusal every other address field enforces

- **Files:**
  - `app/src/index.html:870`: `editorState` tests `isAddr` only;
  - `app/src/index.html:899-905`: `oninput` stores the raw value; `onchange` runs `addrField`,
    which leaves the bad value in `rows[i]` and then repaints the table as valid;
  - `app/src/model.js:171-173`: `tableFrom`.
- **Found by:** both legs (leg 1 F-04, leg 2 F4).
- **Severities:** leg 1 High, leg 2 Medium. **This document adopts Medium.**

The owner field and the claim field refuse an address whose mixed-case checksum is wrong. The
beneficiary editor shows "checksum does not match" but leaves Deploy and Queue enabled. It then
encodes the 20 bytes of the mistyped address.

**Why Medium:** no attacker is involved. The loss needs the owner's own typo plus an on-screen
warning that names it. Leg 2's scale gives this case Medium in so many words ("a user is misled about
an address … plausibly leads to a wrong transaction"). Leg 1's High rests on the loss being
irreversible, and it is: `distribute` is permissionless, so a payout to the mistyped row can happen
as soon as the table is in force. This document records that, but it does not treat the outcome
alone as enough to override the precondition.

### R6 — Medium — The widget turns host-supplied `data-*` attributes into live markup, including a `javascript:` link

- **File:** `app/src/widget.js:198`. `data-link` goes into `href` with HTML escaping only; its
  scheme is not checked.
- **Leg 2 adds:**
  - `widget.js:197`: `short(addr)` from `data-rake` is concatenated unescaped;
  - `widget.js:218`: `mountAll` mounts every `[data-rake]` element in the host page.
- **Found by:** both legs (leg 1 F-08, leg 2 F5).
- **Severities:** leg 1 Low, leg 2 Medium. **This document adopts Medium.**

**Why Medium:** leg 1 rated it Low on the ground that whoever supplies the attribute already
controls the embedding page. Leg 2 shows that this does not hold on a host that renders sanitised
user HTML and keeps `data-*` attributes. That is a default sanitiser configuration, not control of
the host. On such a host a commenter's `<div data-rake=… data-link="javascript:…//">` becomes a
link that runs script in the host's origin when clicked.

Leg 1 names that same less-trusted-content case in its own text but did not let it change the
rating. The click it requires keeps this below High.

### R7 — Medium — The percentage check and the basis-point encoding disagree, so the UI can queue a table the contract will refuse

- **Files:**
  - `app/src/index.html:867-868`: the decimal total is checked within `0.005`;
  - `app/src/model.js:171-173`: `tableFrom` rounds each row to integer bps on its own;
  - the senders at `app/src/index.html:1322-1326`.
- **Found by:** leg 1 only (F-05).
- **Severity:** Medium (leg 1), adopted.

Three rows at `33.334%` add up to `100.002%`, which the check accepts. They encode as
`3333 × 3 = 9999` bps. The sum of the rounded values is never checked. Behind a non-zero delay,
`propose` queues the action and it fails only at `applyQueued`. The owner can cancel it, but the
change they meant cannot land.

Leg 1 also notes two smaller gaps: negative percentages are not rejected, and the zero address
passes `isAddr`.

This is the front-end route into the known-answer shape #54 (see § 4).

### R8 — Medium — `pairable()` does not verify the hash join it exists to protect

- **Files:**
  - `app/broadcast.mjs:44-47`: `pairable` checks only that there is one creation and that the
    receipt and transaction counts are equal;
  - `app/broadcast.mjs:63-68`: `creations()` trusts `blocks.get(t.hash)`;
  - the substitution at `app/build.mjs:48`.
- **Found by:** leg 1 only (F-09).
- **Severity:** Medium (leg 1), adopted.

The check does not require unique hashes, or a receipt for each hash. Leg 1's example is a log with
two transactions under one hash and an equal number of receipts. `pairable` passes it, and the
creation gets the other transaction's block.

The comment at `build.mjs:31-36` says this guard exists for m03-t06's mis-filed hash. In the
one-creation case, that mis-filing is the kind the guard lets through. A creation block that is too
late becomes `__DISTRIBUTIONFACTORY_BLOCK__`, and every `Created` and history scan then silently
starts after real events.

There is no attacker here. The input is forge's own log, and the defect is a guard that passes the
case it was written to catch.

### R9 — Medium — Anyone can make a token "recognised" for the cost of one `distribute`

- **Files:** `app/src/index.html:616` (`known` is built from `Distributed`/`Escrowed` logs), plus
  `:683`, `:1197` and `:1471`.
- **Found by:** leg 2 only (F3).
- **Severity:** Medium (leg 2), adopted.

`distribute(address)` is permissionless. A spammer can send one unit of a token whose `symbol()` is
`USDC` and then distribute it. From then on the token:

- leaves the collapsed "unverified" list;
- is listed in the main ledger by its symbol, with a live `distribute` button.

That contradicts the page's own advice at `:1582` ("once distributed it is listed above") and the
docs' claim at `:1921`. The 12-character symbol cap still allows `USDC` or a short URL.

### R10 — Medium — Reverse names replace addresses without normalisation or a lookalike check

- **Files:**
  - `app/src/index.html:450-455` (`nameSweep`);
  - `app/src/index.html:411-427` (`ensName` / `regName`);
  - `app/src/index.html:463-465` (forward lookup);
  - `app/src/model.js:285-288` (`namehash`, no ENSIP-15).
- **Found by:** leg 2 only (F6).
- **Severity:** Medium (leg 2), adopted.

A forward-confirmed name proves only that its holder set it. A mixed-script name, such as one with a
Cyrillic `і` or with zero-width or bidi controls, is printed verbatim in place of the address. That
covers the owner cell, "transfer pending to …" and every beneficiary row, and the name has no length
cap. The address then survives only in `title` and the copy icon.

### R11 — Low — The inline-script guard matches `<script` case-sensitively

- **File:** `app/inline-scripts.mjs:11` (`indexOf('<script')`).
- **Found by:** both legs (leg 1 F-06, leg 2 F11).
- **Severities:** leg 1 Medium, leg 2 Low. **This document adopts Low.**

`<SCRIPT src=…>` and `<Script defer>` are real external or deferred scripts, and the guard does not
see them. Leg 1 confirmed this under Node.

**Why Low:**

- The guard's stated job (`inline-scripts.mjs:1-6`) is to stop the project's own bundle from
  shipping in a form that silently does not run.
- Its inputs are tracked source files.
- Leg 1's Medium rested on combining this gap with build-time injection. That precondition is R4's,
  and it is rated there.

### R12 — Low — Decoded array lengths are unbounded, so a hostile response freezes the host tab

- **File:** `app/src/widget.js:129`. `arr()` loops `u(p)` times, with no bound and no check against
  `hex.length`.
- **Leg 2 adds:**
  - `app/src/eth.js:145-146`: `decOne` calls `new Array(len)` with a length read from the response;
  - the `nonceOf` loop from R3.
- **Found by:** both legs (leg 1 F-07, leg 2 F9).
- **Severities:** leg 1 Medium, leg 2 Low. **This document adopts Low.**

**Why Low:** the result is availability only. The endpoint that would send the hostile length is one
the host chose in `data-rpc`. That endpoint can already show any table it likes (R14), and a frozen
tab is less harm than a believed lie.

### R13 — Low — Every address meant for verification is shown as 6 + 4 characters

- **Files:** `app/src/index.html:288` (`short`), used through `ext` everywhere; `widget.js:197`.
- **Found by:** leg 2 only (F7).
- **Severity:** Low, adopted.

The visible form carries 32 bits. A vanity address that matches a trusted row's first and last four
hex digits is cheap to grind, and that is how address-poisoning campaigns work.

### R14 — Low — The widget's `data-rpc` path does not check the chain, and does not check that the response is hex

- **Files:**
  - `app/src/widget.js:153-156`: no `eth_chainId` on the RPC path, although the wallet path at
    `:159-161` makes the call;
  - `widget.js:118-120`: `reader` does no hex check;
  - `widget.js:197`: `short(snap.owner)` is written unescaped.
- **Found by:** leg 2 only (F8).
- **Severity:** Low, adopted.

An RPC for chain X mounted under `data-chain="Y"` shows X's table labelled Y. A non-hex response
places four plus four raw characters into the footer.

### R15 — Low — Bidi control characters in chain strings are rendered without isolation

- **Files:** `app/src/widget.js:201` and `:207`; `app/src/index.html:734` and `:1802`.
- **Found by:** leg 2 only (F12).
- **Severity:** Low, adopted.

`esc()` keeps U+202E and U+2066–2069. There is no `<bdi>` and no `unicode-bidi: isolate`, so one
row's name can visually reverse the rest of the compact widget's line.

### R16 — Low — The recent list crashes on a distribution read through the fallback

- **Files:** `app/src/index.html:1803` reads `d.pending.length`; `:577` is the fallback that
  returns `pending: null`.
- **Found by:** leg 2 only (F13).
- **Severity:** Low, adopted.

The `TypeError` is thrown outside the `try`, so `#/distros` stays on "reading…" for good. With R3's
`addRecent`, a single visit to a hostile link is enough to cause it.

### R17 — Low — `tx()` does not re-check the chain before sending

- **Files:** `app/src/index.html:147-158` (no `eth_chainId` re-read and no `chainId` field) and
  `:109` (the `chainChanged` reload exists only if `P.on` does).
- **Found by:** leg 2 only (F14).
- **Severity:** Low, adopted.

With a provider that has no event emitter, a mid-session switch of chain sends the write to the same
address on the other chain.

### R18 — Low — The featured address, and so the support payment, is taken from the provider instead of being computed

- **Files:** `app/src/index.html:515-517` (`predict(featuredSalt)` read through `P`) and `:1973`
  (`giveBind` sends to `S.featured`).
- **Found by:** leg 2 only (F15).
- **Severity:** Low, adopted.

The page already has keccak, the factory address and the salt, so it could compute the CREATE2
address locally. As written, a lying provider names the recipient of the docs' "support its authors"
payment.

### R19 — Info — Vault calldata is copied with no target, chain or value shown beside it

- **Files:** `app/src/index.html:931`, `:956-964` and `:186-187`.
- **Found by:** leg 2 only (F16).

### R20 — Info — `signsFor` believes any owner contract's `isOwner` answer

- **Files:** `app/src/index.html:1130-1136` and `:1145`.
- **Found by:** leg 2 only (F17).

This affects the UI only; the copied calldata still needs the real vault.

### R21 — Info — `target="_blank"` links carry `noopener` but not `noreferrer`

- **Files:** `app/src/index.html` at `:54`, `:370`, `:1881`, `:1897-1898`, `:1955` and `:1958`;
  `app/src/widget.js:198`.
- **Found by:** leg 2 only (F18).

There is no reverse-tabnabbing. The Referer header is still sent, so the widget's link leaks the
host page's URL to the gateway.

### R22 — Info — The widget's stylesheet is global, and the host can suppress it

- **Files:** `app/src/widget.js:166-168` and `:50-76`.
- **Found by:** leg 2 only (F19).

### R23 — Info — The dapp can be framed

- **File:** `app/src/index.html:972-983` (`holdToFire`).
- **Found by:** leg 2 only (F20).

A meta CSP cannot set `frame-ancestors`, so the headers are the gateway's to set. A
"hold for 3 seconds" control is a classic clickjacking target. The wallet's confirmation is the only
real gate.

### R24 — Info — The landing widget may read through a different wallet from the page

- **Files:** `app/src/index.html:106` and `:1024`; `app/src/widget.js:157`.
- **Found by:** leg 2 only (F21).

The page uses the first EIP-6963 announcer, while the inlined widget reads `window.ethereum`.

## 3. Agreement and disagreement

### The overlap

- **6 of the 24 distinct findings were reported by both legs:** R2, R4, R5, R6, R11 and R12.
- **As a share of each leg:**
  - leg 1: 6 of its 9 findings (67%);
  - leg 2: 6 of its 21 findings (29%), or 6 of its 15 findings rated Low or above (40%).
- **Every shared finding was matched on the same file and line, or the same function**, even where
  the two legs described it differently. For example, leg 1 approached R4 through `--set VERSION`,
  and leg 2 through `contractAddress` in the broadcast log. Both arrive at `substitute()` and the
  `CFG` literal.
- **On severity, the legs matched exactly once (R2, High/High).** On the other five shared findings
  they differed by one step:

| Finding | Leg 1 | Leg 2 | Higher leg | Adopted |
|---|---|---|---|---|
| R4 | High | Medium | leg 1 | Medium |
| R5 | High | Medium | leg 1 | Medium |
| R6 | Low | Medium | leg 2 | Medium |
| R11 | Medium | Low | leg 1 | Low |
| R12 | Medium | Low | leg 1 | Low |

  Leg 1 was the higher leg four times and leg 2 once. In four of those five cases the higher rating
  rested on an outcome (code execution, irreversible loss) and the lower one on the precondition.
  This document has followed the precondition each time, and the reason is given in each entry.

### Leg 1 alone (3)

- **R1 is not a miss by leg 2.** Leg 2 stated that it did not read `cmd/server/html.patch` and made
  no claim about it. Leg 1 reasoned from the prompt's description of the injection. The finding sits
  at the boundary of the scope (`<body>` is in scope, the injector is not), and its precondition is a
  hostile gateway (see R1's note).
- **R7 looks like a genuine miss by leg 2.** The arithmetic can be checked directly: the `0.005`
  tolerance at `index.html:867-868` against the per-row `Math.round` at `model.js:172`. Leg 2 read
  both functions, and cited `editorState` for R5, but did not compare the two roundings.
- **R8 looks like a genuine miss by leg 2.** Leg 2 read `broadcast.mjs` for R4 but cited line
  numbers the file does not have (see R4). That suggests its reading of the build modules was less
  exact than its reading of `index.html`, where every line this rollup spot-checked was right.

### Leg 2 alone (15)

- **R3** is the most consequential finding either leg made that the other did not. It is a
  structural trust gap: any contract is rendered with the full trust surface. It is checkable at one
  line (`index.html:540`), and it reads as a genuine miss by leg 1.
- **R9 and R10** are trust-signal findings of the same kind as R3. Neither looks like a false
  positive.
- **R13–R18** are narrow, real shapes. Leg 1's scale has nothing below Low, and its report argues
  only defects it rates Low or above, so some of these may have been seen and not reported rather
  than missed. The reports cannot tell those two apart.
- **R19–R24** are Info by leg 2's own rating, and leg 1's scale has no level for them.

### False positives

- No finding in either report was contradicted by the code at the lines this rollup checked:
  - `index.html` lines 13, 34, 159, 363-370, 539-540, 577, 616, 757, 826, 867-905, 1160, 1582,
    1803, 1878 and 1973;
  - `widget.js` lines 129, 197, 198 and 218;
  - `eth.js` lines 183-186;
  - `model.js` lines 171-173;
  - `inline-scripts.mjs` line 11;
  - `build.mjs` lines 37-91;
  - `broadcast.mjs` lines 42-70.
- The one factual defect found is leg 2's line numbering in R4.

## 4. Grading against the known answer

The known answer supplied for this run is the Solidity one: `rake, 94d028c`, with 16 entries, all
of them in `src/Distribution.sol` or `src/App.sol`. **Neither file is in this pass's scope**
(§ 1), and leg 1 says outright that it "did not inspect Solidity". This pass was therefore not in a
position to find any of the 16, and the result below measures the scope rather than the legs.

**Both legs missed all six live entries. No leg reported any closed entry as open.**

| Entry | Status at `94d028c` | Leg 1 | Leg 2 |
|---|---|---|---|
| #19 — `reserved` above balance reverts `distribute`/`release`/`claim` | live | not found | not found |
| #54 — `propose` queues an action `applyQueued` will revert | live | not found (see below) | not found |
| #18 — `receive()` over the 2,300 stipend on a cold implementation | live | not found | not found |
| #22 — CREATE2 collision in `create` burns forwarded gas | live | not found | not found |
| F8 / #123 — ERC-20 push passes no gas; hook recipient starves later rows | live | not found | not found |
| F12 / #127 — native-balance alias token pays escrowed ETH again | live | not found | not found |
| #20 — `release` opaque failure | closed | not raised | not raised |
| #61 — `_push` comment overstating ERC-20 acceptance | closed | not raised | not raised |
| #74 — single-step `transferOwnership` | closed | not raised | not raised |
| F1 — reentrant `applyQueued`/`propose` mid-`distribute` | closed | not raised | not raised |
| F2 — queue outliving handover or renounce | closed | not raised | not raised |
| F6 — ETH push copying unbounded return data | closed | not raised | not raised |
| F9 / F13 — `applyQueued` with no ordering or expiry | closed | not raised | not raised |
| F5 / #95 — escrow unreleasable after a burned push | closed | not raised | not raised |
| #111 (code half) — renounce left no log | closed | not raised | not raised |
| F11 — `App.lock` accepting a mutable code pointer | closed | not raised | not raised |

**#54 and R7.** R7 (leg 1) is the front-end's way of *producing* #54's shape: a table the
validator accepts, queued through `propose`, that `applyQueued` will refuse. Judged on location and
mechanism, it is not a find of #54. #54 is about `propose` at `src/Distribution.sol:220` validating
nothing, while R7 is the dapp's rounding at `model.js:172`. It is recorded here because it shows that
#54's "nothing is lost; the pending list is simply wrong" can be reached by an owner using the
shipped UI correctly, with no mistake on their part.

**#22.** The dapp's documented remedy for #22 is the `eth_getCode` refusal before `create`
(AGENTS.md § The dapp). Neither leg commented on it, either as present or as missing.

## 5. Legs

### Leg 1 — codex `gpt-5.6-sol`, effort high, 1 pass ([`gpt-5.6-sol/`](gpt-5.6-sol/full-report.md))

- **Read:** all nine scoped files in full. No Solidity and no out-of-scope `app/` file. No network.
- **Ran:** a local Node probe of `scriptTags()`, which confirmed R11.
- **Could not run**, in its own words: "I could not run the intended Chromium spot-check because
  both cached Chromium launchers terminated under this harness with `Operation not permitted`; the
  findings below do not depend on that browser run."
- **Produced:** 9 findings: 1 Critical, 3 High, 4 Medium, 1 Low.

### Leg 2 — claude `claude-opus-5-5`, 1 pass ([`opus/`](opus/full-report.md))

- **Read:** all nine scoped files in full. No network.
- **Ran:**
  - one non-dev build, from a throwaway copy of `app/` and `broadcast/` under `/tmp`;
  - one `node -e` call to `Eth.checksum` on a hostile string (R2, R4).
- **Did not run**, in its own words:
  - "**Not run:** a browser. No finding below was reproduced in a page. Every one is argued from the
    source."
  - "**Not read:** the gateway's injected block (`cmd/server/html.patch`). It is not in scope and
    not in the tree, so I make no claim about what it rewrites."
- **Produced:** 21 findings: 2 High, 6 Medium, 7 Low, 6 Info.
- **Line numbers:** its `build.mjs` and `broadcast.mjs` numbers in F10 do not exist in those files
  (corrected under R4). Its `index.html`, `widget.js`, `eth.js` and `model.js` numbers checked out.

Neither leg reproduced a finding in a browser. Every finding above is argued from the source, apart
from leg 1's Node check of the script-tag guard, leg 2's `Eth.checksum` call, and leg 2's build run.
