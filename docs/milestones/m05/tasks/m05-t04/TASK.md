# m05-t04 — The gateway at rake.dnzn.dev, on the two testnets first

Milestone: [M05](../../MILESTONE.md) · Phase: 4 — Served under dnzn.dev and embedded

When this is done `https://rake.dnzn.dev` serves rake's `App` from the chain on Sepolia and Base
Sepolia through a pinned build of `dnznlabs/gw44`, deployed from this repository by one workflow,
with a static copy of each chain's `widget.js` beside it. Adding a mainnet chain afterwards is a
two-line change and a dispatch, written into `RUNBOOK.md` for m05-t02 and m05-t03 to follow.

It runs now and waits for no mainnet address: gw44's decision 11 as amended on 2026-11-21
([gw44#118](https://github.com/dnznlabs/gw44/pull/118)) allows a testnet contract on a project's
origin when the mainnet owner controls it, and rake's does (§ Context).

## Plan

The guide for every step is `docs/DEPLOY.md` in `dnznlabs/gw44`, read at the pinned commit. Where
this plan and the guide disagree, stop and report; do not improvise. The pin throughout is
`3ee50fe2de7073f8dac66898e83f961bc88b8b8b`, the commit the test site was last deployed from.
Nothing under `src/`, `test/`, `app/` or `.gas-snapshot` changes in this task.

**The Actions budget is the constraint.** The workflow is `workflow_dispatch` only and this task
has **three deploying runs**. A run that fails before the deploy step (checkout, build, `expect`)
does not count. If the third deploying run fails, stop and report with the run ids.

1. **Two configuration files.** `deploy/gw44.json`:

   ```json
   {
     "default": "84532",
     "contracts": {
       "11155111": "0x00a9f390a6010d045e0d34856048ddd6910d25ba",
       "84532": "0x00a9f390a6010d045e0d34856048ddd6910d25ba"
     },
     "frame": "self"
   }
   ```

   and `deploy/chains.json` with **at least two endpoints per chain**, no API key in any URL (the
   file is published in the deployable). Start from gw44's own `chains.json` rows for the two
   chains and add a second Sepolia endpoint. Check: each URL answers `eth_chainId` with its own
   chain's id, recorded in the handoff with the date.
2. **Build it locally before any run**, from a gw44 checkout at the pin (guide § 3):
   `devbox run -- make build CONFIG=<rake>/deploy/gw44.json GW44_CHAINS=<rake>/deploy/chains.json`,
   then `make get URL="https://anything.invalid/<chain>/" CONFIG=…` for both chains. Check: three
   hash lines printed, and both `make get` readings are `200` with `text/html`. Keep the three
   lines; they are step 6's `expect`.
3. **The caller workflow**, `.github/workflows/deploy-gateway.yml`, as the guide's § 5 block:
   `workflow_dispatch` only, the four permissions including `actions: read`, `uses:` and
   `gw44-ref` both at the pin, `config: deploy/gw44.json`, `chains: deploy/chains.json`,
   `embeds: widget.js`, the secret `GW44_READ_KEY`, and a boolean dispatch input passed through
   as `verify-only`. Check: `actionlint` clean if the devbox carries it; otherwise say so.
4. **Wait for the Product Owner's action** (§ Open questions names the issue): Pages on this
   repository with GitHub Actions as the source, `rake.dnzn.dev` as the custom domain and HTTPS
   enforced; the `GW44_READ_KEY` secret here; organisation access on `dnznlabs/gw44`'s Actions
   settings. Check before spending a run:
   `gh api repos/dnznlabs/rake/pages --jq '.build_type, .cname, .https_enforced, .protected_domain_state'`
   prints `workflow`, `rake.dnzn.dev`, `true`, `verified`, and `gh secret list -R dnznlabs/rake`
   names the secret. The PR for steps 1–3 can be reviewed and merged while this waits.
5. **One `verify-only` run** from `main` after the PR merges. Check: the run is green and its
   build step prints the three lines of step 2, byte for byte.
6. **Deploy**, with `expect` set to those three lines in the workflow (a second small PR, or the
   same one if step 2's lines were committed with it). Check: the run names which attempt
   deployed, and prints the `integrity` snippet for `11155111/widget.js` and `84532/widget.js`.
7. **Check the site** from the gw44 checkout at the pin (guide § 7):
   `make check-site URL=https://rake.dnzn.dev SITE_CONFIG=<rake>/deploy/gw44.json EMBED="84532/widget.js=sha384-…" ENGINES="chromium firefox webkit"`
   and
   `VERIFY_SITE=https://rake.dnzn.dev VERIFY_ADDRESS=0x00a9f390a6010d045e0d34856048ddd6910d25ba VERIFY_CHAINS="11155111 84532" GW44_CHAINS=<rake>/deploy/chains.json make verify`.
   Check: nine cases pass in each of three engines; `verify` names rake's address on its first
   line and prints `ok` for the root and `widget.js` on both chains.
8. **One reading by hand, in a browser:** open `/11155111/`, connect a wallet, then open
   `/84532/`. Record whether the header names each network correctly, whether the wallet stays
   connected across the two, and what the `rake.recent` list (`app/src/index.html:488`) shows on
   the second chain for an address visited on the first. That key is not kept apart by chain. Do
   not fix it; if a recent address from one chain misleads on the other, file one issue and name
   it in the handoff.
9. **`RUNBOOK.md` gains § The gateway**: how a chain is added (its id and `App` address in
   `deploy/gw44.json`, its endpoints in `deploy/chains.json`, the local build of step 2, the new
   `expect` lines, one dispatch, step 7's two commands with the new chain in them), and the rule
   that **the first mainnet chain added becomes `default`** (gw44 decision 11). m05-t02 and
   m05-t03 run that section as their last step.
10. **`README.md` § Opening the App** gains a row for `https://rake.dnzn.dev/<chain id>/` beside
    the w3link row, saying in one sentence that it is DNZN's own gateway reading the same
    contract. The table's `App` address is whatever m05-t01 has left there; do not change it in
    this task.

## Acceptance criteria

- `https://rake.dnzn.dev/` ends on `/84532/` showing the application, and `/11155111/` shows it,
  in Chromium, Firefox and WebKit: step 7's `check-site`, nine of nine in each.
- Step 7's `make verify` prints `ok` for the root and `widget.js` on both chains against
  `https://rake.dnzn.dev`, with rake's address on its first line.
- The deploying run was called from this repository at the pinned gw44 commit with `expect` set,
  and the handoff carries its run id, the three hashes and both `integrity` snippets.
- `RUNBOOK.md` § The gateway exists and a reader who did not write it can add a chain from it;
  the reviewer checks this by building locally with a third chain added (Base Sepolia's row
  duplicated under an anvil id is enough) and reading the failure or the hashes.
- The handoff records step 8's three readings and the number of deploying runs spent.
- `git diff --stat main` touches only `deploy/`, `.github/workflows/deploy-gateway.yml`,
  `RUNBOOK.md`, `README.md` and this task's directory.

## Out of scope

- **Mainnet chains.** Each is added by the task that deploys it (m05-t02, m05-t03), through
  step 9's section.
- **The `#/docs` snippet's host and `integrity` attribute, and the widget in a DNZN app.** An
  `app/` change rides a Run B upload on every live chain; that is m05-t04b, after the chain list
  is final.
- **Keeping `rake.recent` apart by chain**, or any other `app/` change. Step 8 records; it does
  not fix.
- **Any change in `dnznlabs/gw44`.** A fault in its workflow or guide is an issue there and a
  stop here.
- **A push or schedule trigger on the workflow.** Dispatch only.
- **Mobile wallet connection** ([#318](https://github.com/dnznlabs/rake/issues/318)).

## Open questions

- **Action on the Product Owner: Pages, the secret and organisation access**, filed as an
  `action` issue when this plan merges and linked from the milestone. Gates step 5. No default:
  none of the three is a setting an agent can make.
- **Which mainnet chain `/` lands on once all four are live.** *Options:* (1) Base, the first
  mainnet and where the first real `distribute` runs, so `/` moves once, at m05-t02, and never
  again; (2) Ethereum, as decision 59 assumed for the mirror, which moves `/` a second time at
  m05-t03. *Recommendation:* (1). *Default:* (1); it gates nothing here, and is taken at m05-t02's
  last step unless ruled otherwise before then. *Record:* `docs/ROADMAP.md` § Decisions.

## Context

- gw44 decision 11 as amended, and M02 criterion 8:
  [gw44#118](https://github.com/dnznlabs/gw44/pull/118).
- Decision 66, `docs/ROADMAP.md`, as amended 2026-11-21.
- The testnet `App`, `0x00a9F390A6010d045e0d34856048DdD6910d25BA` on both chains:
  [m05-t01's handoff](../m05-t01/HANDOFF.md). Read 2026-11-21: `owner()` the Ops vault and
  `locked()` false on both.
- The Ops vault, read 2026-11-21 with `getOwners()`, `threshold()`, `delay()`: the same four
  owners and a threshold of 2 on Sepolia, Base Sepolia, Ethereum, OP Mainnet, Base and Arbitrum
  One; delay 900 on the two testnets, 3600 on the four mainnets.
- `rake.dnzn.dev` resolves to `dnznlabs.github.io` (read 2026-11-21); this repository has no
  Pages site yet (`gh api repos/dnznlabs/rake/pages` answers 404) and no Actions secret.
- The deploy step's record in gw44: three of eight runs deployed before the in-job retry
  ([gw44#111](https://github.com/dnznlabs/gw44/pull/111)), two of two since.
