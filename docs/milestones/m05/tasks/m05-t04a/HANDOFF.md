# m05-t04a — handoff

PR: #337 · Branch: `feat/m05-t04a-sepolia-default`, `docs/m05-t04a-handoff` · 2026-11-21

`https://rake.dnzn.dev/` ends on `/11155111/`. Both testnets stay served under their own prefixes, the first mainnet chain still takes `/` when one is added, and nothing under `src/`, `test/` or `app/` changed. **One deploying run was spent, which is the budget.**

**One criterion is not met: step 6's reading.** The deploy that would have carried it happened, but the instrument meant to take it died before the deploy started, so the reading was not taken. It is recorded below as not taken, with the reason, and **not** as a null result; the architect ruled it carried to the next worker-changing deploy rather than bought with a run of its own.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `/` ends on `/11155111/` showing the application, and `/84532/` shows it, in three engines — nine of nine each | pass | `make check-site URL=https://rake.dnzn.dev SITE_CONFIG=deploy/gw44.json EMBED="11155111/widget.js=sha384-YdiQK1VL…"`, once per engine from a gw44 worktree at the pin: **9 ok in chromium, 9 in firefox, 9 in webkit**, each run's header reading `chains [84532 11155111], default 11155111` and its first case `path /11155111/, title "RAKE" ok` |
| `make verify` prints `ok` for the root and `widget.js` on both chains against the live site | pass | exit 0, `verify: every comparison and every browser load passed`. First line names rake's address and `chains [11155111 84532]`; `11155111 site root` and `site widget`, `84532 site root` and `site widget` all **ok** |
| The handoff carries the deploy's run id, the three hashes, and the number of deploying runs spent | pass | § The runs. **One** |
| Step 6's reading is in the handoff and on gw44#85, with the control that showed the instrument seeing a change | **not met** | § Step 6. The control is taken and is a real result, on Pages; the open-browser reading is **not taken** because the process holding that browser was reaped before the deploy. Posted on [gw44#85](https://github.com/dnznlabs/gw44/issues/85) as attempted-and-not-taken, with the control beside it. Carried by the architect's ruling to the next deploy that changes the worker |
| `git diff --stat main` touches only `deploy/gw44.json`, the caller workflow, `RUNBOOK.md` and the two task directories | pass | `deploy/gw44.json` (one value), `.github/workflows/deploy-gateway.yml` (the three `expect` lines and one comment), `RUNBOOK.md` (one sentence), this directory, and one dated line in m05-t04's handoff |

## The runs

| # | Run | What | Outcome |
|:--|:--|:--|:--|
| 1 | [44963081922](https://github.com/dnznlabs/rake/actions/runs/44963081922) | `verify-only` from `main` after #333 merged as `10cc1c6` | green; `the build matches expect, line for line`, then `verify-only: built and checked, deployed nothing` |
| 2 | [44963182554](https://github.com/dnznlabs/rake/actions/runs/44963182554) | the deploy | green, **deployed on the first attempt** — `deploy-pages attempts: 1 success, 2 skipped, 3 skipped`, `Found 1 artifact(s)`, finished **23:44:21Z** |

**The three hashes**, printed locally at the pin before `expect` was written and reproduced by both runs:

```
c57375daa46705f7fab578be79483b52e75a5e26f94768c843e780f9bfb0cef9     9299  404.html
96fbe71216f0b2c63f937e4072c54b42be7c7cb5441a41067838248d106761a3     7817  gw44-sw.js
c57375daa46705f7fab578be79483b52e75a5e26f94768c843e780f9bfb0cef9     9299  index.html
```

Both `integrity` snippets printed again, unchanged at `sha384-YdiQK1VLmzn9EdOpTRan9r2NsUR+DnOwTJ/saTfdBDEkLxiyC2QiRFpVgJ/FQVtE` for `/11155111/widget.js` and `/84532/widget.js` — the copies are the same bytes on both chains and the default does not touch them. Off the wire after the deploy: `/` **9,299 B**, `/gw44-sw.js` **7,817 B**, against 9,296 and 7,814 before it.

## Step 6 — the control is a result; the open-browser reading is not taken

The plan asked for two things: a returning visitor read across the deploy **with the browser left open**, and — first — a control showing the instrument can see this change at all.

**The control, and it is the first time this has been shown on GitHub Pages rather than against `tools/serve.ts`:**

| Time | Profile B, seeded 23:37:54Z with the **old** worker |
|:--|:--|
| 23:44:21Z | the deploy finishes; the host now serves 7,817 B / 9,299 B |
| 23:44:46Z | a plain navigation to `/` ends on **`/84532/`** — the old default, 25 s after the deploy |
| 23:44:49Z | `registration.update()` returns in **3,081 ms**, `active: activated`, nothing waiting |
| 23:44:49Z | the next navigation ends on **`/11155111/`** |

So on Pages, with `cache-control: max-age=600` on the worker script, an explicit check propagates a redeploy in about three seconds and the navigation after it is current.

**The reading itself was not taken.** The profile that had to stay open across the deploy was opened at 23:43:21Z by a process backgrounded inside a shell call, and **that process was reaped when the call returned**: its log ends at `23:43:21 pre-deploy: /84532/` with no error, and the browser was gone within seconds — before the deploy started at 23:43:5x. Nothing it would have logged afterwards exists.

**Why this is recorded as not taken rather than as a null result.** Had the fifteen minutes been waited out and the empty log read as data, it would have looked exactly like *"fourteen navigations, never updated"* — which is the mistaken finding gw44#85 already contains once, from an instrument that closed the browser after every load. The failure was caught by reading the log while the measurement was supposedly running, not at its end.

**Carried, not bought.** The architect ruled against spending a second deploying run to make the event happen: the reading confirms a ruling that already stands, three engines have shown the behaviour locally, and the next deploy that changes the worker carries it — with the watch run **inside one long-lived call** and the control repeated. gw44#85 has the control, the failure and the carry.

## Deviations from the plan

1. **Step 6's acceptance criterion is unmet**, as above. The plan says the step "fails nothing: it is a measurement", and the architect accepts this as a deviation at review; gw44#85 stays open for the reading.
2. **m05-t04's handoff is not rewritten.** It records what was true then, including Base Sepolia as the default, and gains one dated line under its summary pointing here — as the plan directs.

## Discoveries

1. **A process backgrounded inside a shell call does not outlive the call**, whatever `setsid`, `nohup` or `&` suggest: the harness reaps the call's process group. Seen twice on 2026-11-21 — a local stand-in server that answered inside its own call and refused the next one, and this browser. The failure is **silent and shaped like a finding**: a server that is "down", a browser that "never updated". Anything that must outlive one command has to *be* the command, or a scheduled job.
2. **The embed copies are identical across the two chains** and their `integrity` is unchanged by the default, because `widget.js` comes from the contract and both chains hold the same bytes. A reader might expect the snippet to move with the default; it does not.
3. **The default costs three bytes.** `"11155111"` against `"84532"` is three characters more in the compiled configuration, which is the whole of the 7,814 → 7,817 and 9,296 → 9,299 change — the only reason this deploy changed the worker at all, and so the only reason it could have carried gw44#85's reading.

## Open questions

1. **Step 6's reading**, on the next deploy that changes the worker. [gw44#85](https://github.com/dnznlabs/gw44/issues/85).
2. **Which chain `/` lands on once a mainnet is live** — unchanged, and `RUNBOOK.md` § The gateway carries the rule.
