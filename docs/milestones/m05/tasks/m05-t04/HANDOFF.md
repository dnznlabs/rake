# m05-t04 — handoff

PR: #329 · Branches: `feat/m05-t04-gateway`, `fix/m05-t04-concurrency`, `docs/m05-t04-runbook`, `docs/m05-t04-handoff` · 2026-11-21

`https://rake.dnzn.dev` serves rake's `App` from the chain on Sepolia and Base Sepolia through a pinned build of `dnznlabs/gw44`, deployed from this repository by one dispatch-only workflow, with a static copy of each chain's `widget.js` beside it. `/` lands on `/84532/` until a mainnet chain is added, which `RUNBOOK.md` § The gateway makes five edits and one dispatch. **One deploying run was spent of the three the plan allows.**

Four PRs rather than one, because two of them were fixes found by running the thing: **#322** (the configuration and the caller), **#324** (the caller's `concurrency`, which deadlocked the call), **#325** (`RUNBOOK.md` § The gateway and the README row) and this handoff. **#323 was opened on a wrong diagnosis and closed without merging**; it is in § Deviations because the record should show what I believed before I measured.

**Amended 2026-11-21, by m05-t04a:** the Product Owner ruled on seeing the deployed site that `/`
lands on **Sepolia** while rake is testnet-only, so this task's first acceptance criterion and its
step 1 `"default"` are superseded. What is recorded below was true when it was measured and is not
rewritten; [m05-t04a](../m05-t04a/HANDOFF.md) carries the change and its own readings. The rule for
the first mainnet chain is untouched.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `/` ends on `/84532/` showing the application, and `/11155111/` shows it, in three engines — nine of nine each | pass | `make check-site URL=https://rake.dnzn.dev SITE_CONFIG=deploy/gw44.json EMBED="84532/widget.js=sha384-YdiQK1VL…"`, run once per engine from a gw44 worktree at the pin: **9 ok in chromium, 9 in firefox, 9 in webkit**, `check-site: every case passed` each time |
| `make verify` prints `ok` for the root and `widget.js` on both chains against the live site, with rake's address on its first line | pass | exit 0. First line `verify: address 0x00a9f390a6010d045e0d34856048ddd6910d25ba on chains [11155111 84532]`; sixteen comparisons `ok`, including `11155111 site root`, `11155111 site widget`, `84532 site root`, `84532 site widget`, then three browser loads `ok` |
| The deploying run was called from this repository at the pinned commit with `expect` set; the handoff carries its run id, the three hashes and both `integrity` snippets | pass | § The runs |
| `RUNBOOK.md` § The gateway exists and a reader who did not write it can add a chain from it | pass | The section is in #325. Its own test, run **twice independently**: by me before handing it over, and by the architect at review, each adding `31337` with Base Sepolia's row duplicated in both files and building at the pin. § The runbook section's own test |
| The handoff records step 8's three readings and the number of deploying runs spent | pass | § Step 8, and **one** deploying run |
| `git diff --stat main` touches only `deploy/`, the caller workflow, `RUNBOOK.md`, `README.md` and this task's directory | pass | Across the four PRs: `deploy/gw44.json`, `deploy/chains.json`, `.github/workflows/deploy-gateway.yml`, `RUNBOOK.md`, `README.md`, and this directory. Nothing under `src/`, `test/`, `app/`, and no `.gas-snapshot` |

## The configuration, and the endpoints as read

`deploy/gw44.json` is the plan's verbatim: both chains at `0x00a9f390a6010d045e0d34856048ddd6910d25ba`, `"default": "84532"`, `"frame": "self"`.

`deploy/chains.json` carries **two endpoints per chain and no API key in any URL**, because the file is compiled into the deployable where anyone can read it. Each was asked `eth_chainId` on **2026-11-21** and answered its own chain's id:

| Endpoint | Answer | |
|:--|:--|:--|
| `https://ethereum-sepolia-rpc.publicnode.com` | `0xaa36a7` = 11155111 | kept from gw44's own file |
| `https://1rpc.io/sepolia` | `0xaa36a7` = 11155111 | the second Sepolia endpoint the plan asks for |
| `https://base-sepolia-rpc.publicnode.com` | `0x14a34` = 84532 | kept |
| `https://sepolia.base.org` | `0x14a34` = 84532 | kept, and it is Base Sepolia's `PUBLIC_RPC` entry |

Two candidates were rejected by that same reading rather than by reputation: **`https://rpc.sepolia.org`** answers a 404 HTML page, and **`https://sepolia.drpc.org`** answers `chain is not available on free plan`.

## The runs

Every dispatch of `deploy-gateway.yml`, in order, with what each one cost. **Only the fourth deployed.**

| # | Run | What it was | Jobs | Outcome |
|:--|:--|:--|:--|:--|
| 1 | [44958052197](https://github.com/dnznlabs/rake/actions/runs/44958052197) | `verify-only`, caller with `concurrency: pages` | **0** | startup failure, 2 s, nothing billable, no logs |
| 2 | [44958698883](https://github.com/dnznlabs/rake/actions/runs/44958698883) | the same with `concurrency` removed, from a branch | **1** | job created, then refused by the `github-pages` environment's branch rule — 3 s, zero steps |
| 3 | [44959438282](https://github.com/dnznlabs/rake/actions/runs/44959438282) | `verify-only` from `main`, after #324 | 1 | **green.** `the build matches expect, line for line`, then `verify-only: built and checked, deployed nothing` |
| 4 | [44959611268](https://github.com/dnznlabs/rake/actions/runs/44959611268) | the deploy | 1 | **green, deployed on the first attempt** — `deploy-pages attempts: 1 success, 2 skipped, 3 skipped`, `Found 1 artifact(s)` |

Runs 1 and 2 cost no deploying run and almost no minutes; run 3 deployed nothing by design. **So one of three deploying runs is spent.**

**The three hashes**, printed locally at the pin before run 1 and reproduced by runs 3 and 4 line for line:

```
9a1eb6992ed0d1119d44f32d5cd4a6b26a326f882d857ff65a67b341d5a60497     9296  404.html
2187c75c2cdc86751289bf742a897a80c30faab808e60ed4b64ec2d0e95f7d6e     7814  gw44-sw.js
9a1eb6992ed0d1119d44f32d5cd4a6b26a326f882d857ff65a67b341d5a60497     9296  index.html
```

**Both `integrity` snippets**, from run 4's own log:

```html
<script src="https://rake.dnzn.dev/84532/widget.js"    integrity="sha384-YdiQK1VLmzn9EdOpTRan9r2NsUR+DnOwTJ/saTfdBDEkLxiyC2QiRFpVgJ/FQVtE" crossorigin="anonymous"></script>
<script src="https://rake.dnzn.dev/11155111/widget.js" integrity="sha384-YdiQK1VLmzn9EdOpTRan9r2NsUR+DnOwTJ/saTfdBDEkLxiyC2QiRFpVgJ/FQVtE" crossorigin="anonymous"></script>
```

Both copies are 8,509 B with sha256 `8b6bbc8892657a88…`, which is the same figure `make verify` reads from the chain. **Off the wire after the deploy:** `/` **9,296 B** hashing to `9a1eb699…0497` — the `expect` line itself — `/gw44-sw.js` **7,814 B**, `/84532/widget.js` **8,509 B**, and `/84532/` and `/11155111/` answered **404** with the same 9,296-byte shell, which is the design and is what `check-site`'s second case asserts.

## Step 8

Three readings, taken against the live site on 2026-11-21 **with no wallet connected**, which is itself part of two of them.

1. **`rake.recent` is one key across both chains.** Visiting `/11155111/#/distros/0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199` wrote `["0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199"]`, and `/84532/` then read **the same value** in the same browser. One origin, one `localStorage`, as gw44 decision 9 implies and as `app/src/index.html:488-489` has it.
2. **Whether that misleads is not settled, and two things stop it being settled here.** The `recent` tab does not render without a connected account, so what it would *list* was not observable; and the only distribution available exists on **both** chains (DNZN, `codesize` 45 on each, read 2026-11-21), so it could not mislead even if listed. Showing the misleading case needs a wallet **and** an address that exists on one chain only.
3. **Neither page names its network.** On the home route of each chain, a search of the page's own text for `Sepolia`, `Base Sepolia`, `11155111` and `84532` matched **nothing** on either side; the two pages read identically and only the URL distinguishes them. Filed as [#328](https://github.com/dnznlabs/rake/issues/328) (`carried`, `m05`), with the fix named as an `app/` change that rides an upload — not fixed here, as the plan directs.

**The wallet half is asked and recorded, not skipped.** [#327](https://github.com/dnznlabs/rake/issues/327) is on the Product Owner, filed 2026-11-21 by the architect: connect on `/11155111/`, open `/84532/` in the same browser, and report whether the wallet stays connected, what the recent list shows, and whether either page names its network. His answers arrive here by a Markdown-only amendment; this row stays open until then and nothing else in the task waits on it.

## The runbook section's own test

The criterion says a reviewer checks § The gateway by adding a third chain and reading the failure or the hashes. It was run **twice, independently**, each time following the section and nothing else, with `31337` carrying Base Sepolia's row in both files:

| | Worker | Pages | Result |
|:--|:--|:--|:--|
| Mine, before handing it over | 7,925 B | 9,407 B | three lines, all three chains pinned, `84532` still the default; `make get` on `84532` still 200 / `text/html` / 64,305 B |
| The architect's, at review | 7,946 B | — | three lines naming all three chains, `84532` still the default; `make get` 200 / 64,305 B on `/31337/` **and** `/84532/` |

The two worker figures differ by 21 bytes because the endpoint lists we each wrote for `31337` differ; the sizes are not the point and the section does not quote them. What the pair shows is that the section's instructions produce a build for someone who did not write them.

## Deviations from the plan

1. **Four PRs, not one.** Steps 1–3 were one PR as the plan has it; the rest split because two were fixes discovered by running the thing, and because step 9's section and step 10's row needed no deploy and were worth reviewing while the deploy waited.
2. **`expect` was set in the first PR**, which step 6 permits. It made run 3 prove the three hashes as a side effect rather than as a separate check.
3. **#323 was opened on a wrong diagnosis and closed without merging.** Run 1 failed with zero jobs, and I concluded that `inputs.verify-only` parsed as `inputs.verify - only` because `-` is subtraction in an expression. The architect refuted it with the running code: `deploy-pages.yml` uses `${{ inputs.gw44-ref }}` and `${{ !inputs.verify-only }}` itself and had run eight times. I verified that rather than taking it, closed the PR, and said so on it. The record keeps it because a handoff that shows only the right answer teaches nothing.
4. **The cause was found by a differential dispatch rather than by reasoning**: one change, the caller's `concurrency` block removed, and jobs went from 0 to 1. That is #324, and it also proved the organisation Actions access setting works — a `deploy / deploy` job cannot exist unless the called workflow was read — so [#320](https://github.com/dnznlabs/rake/issues/320) stayed closed on evidence rather than on a reading of a 404.
5. **Step 8 is three readings and one ask**, not four readings, for the reasons in that section.

## Decisions

- **`84532` is the default** until a mainnet chain is added, and § The gateway states gw44 decision 11's rule where the next person will need it: the first mainnet chain added becomes `default`.
- **The caller carries no `concurrency` block.** The called workflow declares the group `pages` itself, which is what serialises deploys; a caller naming the same group deadlocks the call. A caller that wants its own group must choose a different name.
- **`verify-only` is a dispatch input rather than a second workflow**, so the path a deploy takes is exercised by the same file that deploys.
- **Two endpoints per chain, both asked before being trusted**, and none with an API key — the file is published.

## Discoveries

1. **A caller naming the called workflow's concurrency group fails the run at startup**, with zero jobs, no logs, two seconds and nothing billable. gw44's own caller sets no `concurrency`, so the pair had never run; the guide's § 5 block does set one, which is where this came from. Queued against that guide on [gw44#85](https://github.com/dnznlabs/gw44/issues/85).
2. **The `github-pages` environment on this repository admits only `main`** — `branch_policy`, `custom_branch_policies: true`, read from the API — and it gates the **whole job**, so even a `verify-only` dispatch fails from a branch after startup, in three seconds with zero steps. § The gateway says so.
3. **`gh workflow run --ref <branch>` works** once the workflow is on the default branch, and uses that ref's copy of the file. That is what made the differential test cheap.
4. **`actionlint` is not in this repository's devbox**, so the workflow rested on `pre-commit`'s `check-yaml` plus GitHub's own parse — and a `workflow_dispatch`-only workflow is **not listed by the Actions API until it is on the default branch**, so that parse could not be confirmed before the merge.
5. **A permission that cannot be read is proven only by a run.** `actions/permissions/workflow` answers 404 to a non-admin on both repositories, and the organisation route needs an admin. The job existing is the proof.

## Open questions

1. **Step 8's wallet half**, [#327](https://github.com/dnznlabs/rake/issues/327), on the Product Owner.
2. **Which mainnet chain `/` lands on** once all four are live — the plan's own open question, default (1) Base, taken at m05-t02's last step unless ruled otherwise. Nothing here waits on it.
3. **Two deploying runs remain** of the three this task was allotted. m05-t02 and m05-t03 each add a chain through § The gateway and will need one apiece.
