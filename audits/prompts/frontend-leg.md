# Front-end leg prompt

The prompt one independent adversarial review of the front end receives. It is the web-security
sibling of [`leg.md`](leg.md): the same two-leg method, the same refusal to soften, a different
surface and no skill. Two substitutions are made before a harness sees it — the marker line in
§ What to review becomes the contents of `audits/SCOPE.frontend`, one path per line, and the marker
in § Where to leave it becomes the directory that leg writes to. Nothing else is substituted, so
what you read here, plus those two values, is what the model read.

It lives in prose, outside the runner, for the reason `leg.md` does: a heredoc inside a shell script
is not something a human can disagree with.

The method, the scope and the reasoning behind both are in [`../README.md`](../README.md).

---

You are running one leg of a two-leg security review of a web front end. Another model, in another
harness, is reviewing the same files independently; a third pass reconciles the two. Do not soften a
finding because it might be wrong — a false positive costs a paragraph in the rollup, a miss costs
the project.

## What to review

**Exactly these files, named explicitly.** Read each one in full.

```
<!-- SCOPE -->
```

Files under `app/` that are not listed are out of scope on purpose (`../README.md` § Scope); do not
add them back, and do not review `src/` — this leg has no Solidity in it.

There is **no skill for this leg**. `leg.md` runs `solidity-auditor`; nothing equivalent exists for
a browser document, and inventing an orchestration is not what is wanted here. Read the code and
review it.

Assume **no network**. Do not fetch a dependency, a CVE feed or a page; every claim must come from
the bytes in front of you.

## What this code is, and where it runs

A single HTML document and a widget script, both stored on chain in a contract and served to
strangers by a **third party's HTTP gateway** (`w3link.io` and the same software under other
hostnames). That hosting is the point of the review:

- **The gateway injects its own script into our document before ours runs.** At the pinned gateway
  revision the injected block is a `fetch` wrapper, a click handler and a `MutationObserver` on
  `body`. Our page cannot see it coming, cannot remove it, and shares an origin with it.
- **The gateway sets `access-control-allow-origin: *`** on what it serves.
- The document is swapped in with `DOMParser` after being inflated, and each `<script>` is
  re-created so it runs; `app/build.mjs` refuses a bundle whose scripts are not inline and
  attribute-free, because `src` would become fetch order.
- The widget is mounted **on pages nobody here controls**, from a `<script>` tag on a stranger's
  host page, reading its configuration out of DOM attributes on that page.

Review it as code that runs in that place, not as code that runs on a site we operate.

## Surfaces this project wants looked at

Not a checklist to tick, and not a boundary: a finding outside this list is still a finding. These
are the places this project already knows are load-bearing, so a leg that says nothing about them
has not finished.

- **Chain data rendered into HTML.** `description()`, row labels and URIs from `snapshot()`,
  ENS/WNS/GNS names, and log data all reach the page from a chain anyone can write to. Find every
  sink that takes markup rather than text — `innerHTML`, `insertAdjacentHTML`, attribute writes,
  `srcdoc`, a URL concatenated into an `href` — and decide for each whether the escaping helper
  (`esc()`) actually guards it, and whether escaping is even the right guard for that sink. An
  attacker-chosen name that reaches an `href` as `javascript:` is not fixed by HTML escaping.
- **The widget on a hostile host page.** `data-rpc` is an endpoint the host page chooses, so a mount
  can be pointed at a server that answers whatever it likes — follow what a lying RPC response can
  make the widget render, click or sign. `data-link` builds an `href` from `document.currentScript.src`.
  The widget injects `<style id="rk-css">` into a document it does not own. Ask what the host page
  can do to the widget and what the widget can do to the host page.
- **Query parameters the shipped build still reads.** `?rpc=`, `&from=` and any other — the
  `dapp-nodev` build is what gets uploaded, so a parameter that was a development convenience is a
  stranger-supplied input on a public URL.
- **The clipboard and the propose control.** Calldata and addresses are copied to the clipboard and
  shown for the user to carry to a wallet (decision 7). A value that is displayed as one thing and
  copied as another is the whole attack.
- **`window.ethereum` treated as trusted.** It is injected by an extension we do not ship. Chain
  ids, accounts, return data and errors from it are inputs.
- **`target="_blank"` links** and what `rel` they carry.
- **The build as an injection point.** `app/build.mjs`'s substitutions put values into the document
  before it is ever uploaded; a value that reaches the page through the build is as interesting as
  one that reaches it through a chain read. The three modules it imports are in scope for that
  reason: `version.mjs` and `broadcast.mjs` compute substituted values — a version string derived
  from a constructor argument, and addresses and a `fromBlock` read out of a forge broadcast log —
  and `inline-scripts.mjs` is the guard that every `<script>` in the bundle is inline and
  attribute-free. Ask what a wrong or attacker-influenced input to any of the three puts on the
  page, and what the guard would let through.

## Where to leave it

Write **`full-report.md`** into this directory, which already exists:

```
<!-- OUTDIR -->
```

It is outside the repository on purpose: the other leg must not be able to read yours
(`../README.md` § Running it — on 2026-10-30 a leg harvested into the tree was grepped by the next
one, and the rollup had to discount the agreement). Write nothing into the repository, and leave the
working tree exactly as you found it — no fixes, no `fmt`, no scratch files. A leg that dirties the
tree costs the runner a cleanup it cannot distinguish from a real change.

If part of this is something your harness cannot do, **do the review anyway, still write
`full-report.md`**, and say plainly at the top what you could not run. A leg that degrades and says
so is evidence. A leg that produces nothing is a failed pass, and it will be treated as one.

## What a finding must carry

- **A `file:line`.** The rollup deduplicates across two legs that share no vocabulary; a location is
  what makes two descriptions of one bug recognisable as one bug.
- **A severity you would defend.** The other leg's severity for the same finding will be put beside
  yours, and a disagreement is reported rather than averaged.
- **A one-line reproduction** — the input, the click or the chain value that produces the effect.
  "Unsanitised data reaches the DOM" is a category; "a distribution whose `description()` is
  `<img src=x onerror=…>` executes on load at `index.html:NNNN`" is a finding.

State the severity scale you used.

## What this leg is not

It does not fix anything. No edit to the document, the widget, a test or the build. Triage and
repair are a separate step, and a finding is worth more untouched than it is worth quietly fixed.

It also does not rank the project. No summary posture, no score, no "overall the code is sound" —
the rollup decides what the two legs together mean.
