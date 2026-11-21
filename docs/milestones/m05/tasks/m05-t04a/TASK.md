# m05-t04a — `/` lands on Sepolia while rake is testnet-only

Milestone: [M05](../../MILESTONE.md) · Phase: 4 — Served under dnzn.dev and embedded

When this is done `https://rake.dnzn.dev/` ends on `/11155111/`. Nothing else about the site
changes: both testnets stay served under their own prefixes, and the first mainnet chain still takes
`/` when it is added.

Ruled by the Product Owner on 2026-11-21 (chat), on seeing the deployed site: Sepolia is the default
for now, and a mainnet chain becomes the default once one is deployed. m05-t04 was planned and
accepted with Base Sepolia there, so this supersedes that task's first acceptance criterion and the
`"default"` in its step 1. The rule for mainnet in `RUNBOOK.md` § The gateway is untouched.

## Plan

The guide is `docs/DEPLOY.md` in `dnznlabs/gw44` at the commit the workflow pins,
`3ee50fe2de7073f8dac66898e83f961bc88b8b8b`, and `RUNBOOK.md` § The gateway here. Nothing under
`src/`, `test/` or `app/` changes.

**One deploying run.** A run that fails before the deploy step does not count. If the deploy step
fails on all three of its attempts, stop and report with the run id.

Read at scoping, 2026-11-21, on `main` at `d9096ad`: `deploy/gw44.json` has `"default": "84532"`;
the live site's `/` is 9,296 bytes and its worker 7,814; `RUNBOOK.md:1237` says "Until then the
default is `84532`".

1. **`deploy/gw44.json`**: `"default": "11155111"`. Nothing else in either configuration file.
2. **Build locally at the pin** (`RUNBOOK.md` § The gateway, step 3), then `make get` on both
   chains. Check: three hash lines; both readings `200` with `text/html`.
3. **`expect` in `.github/workflows/deploy-gateway.yml`**: the three lines step 2 printed.
4. **`RUNBOOK.md` § The gateway**: the sentence naming the testnet default says `11155111`, with
   the date of the ruling. No other sentence changes.
5. **One PR** with steps 1, 3 and 4. After it merges: one `verify-only` dispatch from `main`, then
   the deploy. Check: `verify-only` is green and says the build matches `expect`; the deploy run
   names which attempt deployed.
6. **A returning visitor across this deploy, with the browser left open.** This deploy changes the
   worker's bytes on GitHub Pages, which is the reading gw44 is waiting for
   ([gw44#85](https://github.com/dnznlabs/gw44/issues/85)). Before the deploy, open
   `https://rake.dnzn.dev/` in one persistent browser profile and leave that browser running.
   After the deploy, navigate to `/` in the same running browser about every thirty seconds and
   record on which navigation, and how long after the deploy, `/` first ends on `/11155111/`.
   First make the event happen once on purpose: a call to `registration.update()` in a second
   profile must move that profile, so the instrument is shown to see a change before its silence
   is believed. Stop reading after fifteen minutes and report what was seen. Post the reading on
   gw44#85. This step fails nothing: it is a measurement.
7. **Check the site** from a gw44 checkout at the pin, as `RUNBOOK.md` § The gateway has it:
   `make check-site` in three engines with `SITE_CONFIG` the new file and the `EMBED` pair the
   deploy printed, and `make verify` with rake's address and both chains.
8. **`HANDOFF.md`** for this task. m05-t04's handoff is a record of what was true then and is not
   rewritten; it gains one dated line under its summary pointing here.

## Acceptance criteria

- `https://rake.dnzn.dev/` ends on `/11155111/` showing the application, and `/84532/` shows it,
  in three engines: `make check-site` nine of nine each, with the new configuration file.
- `make verify` prints `ok` for the root and `widget.js` on both chains against the live site.
- The handoff carries the deploy's run id, the three hashes, and the number of deploying runs
  spent, which is one.
- Step 6's reading is in the handoff and on gw44#85, with the control that showed the instrument
  seeing a change.
- `git diff --stat main` touches only `deploy/gw44.json`, the caller workflow, `RUNBOOK.md` and
  the two task directories.

## Out of scope

- Which chain `/` lands on once a mainnet is live. `RUNBOOK.md` § The gateway and m05-t04's open
  question carry that, unchanged.
- Any `app/` change, including a page that names its network
  ([#328](https://github.com/dnznlabs/rake/issues/328)).
- Any change in `dnznlabs/gw44`.
- The static copies' snippet host in `#/docs`: m05-t04b.

## Open questions

None.

## Context

- [m05-t04](../m05-t04/TASK.md) and its `HANDOFF.md`; `RUNBOOK.md` § The gateway.
- gw44 decision 11 as amended, and [gw44#85](https://github.com/dnznlabs/gw44/issues/85).
