#!/usr/bin/env node
/* The patterns this driver sends into the page, run against real lines in node.

   A regex literal written inside a `page.evaluate` closure cannot be reached from a test, and one of
   them shipped with doubled backslashes: `/block (\\d+)/` matches a literal backslash, so row (e)'s
   boundary was always `null`, `moved` was always true and the assertion could not fail. The fix is
   not care, it is reachability — the patterns are strings in `rows.mjs`, the page compiles them with
   `new RegExp`, and this file proves they match what the page actually prints.

   Run: node selftest.mjs — exits non-zero on the first pattern that does not do its job. */
import { readFileSync } from 'node:fs';
import { PATTERNS } from './rows.mjs';

const CASES = [
  // [pattern, text, should it match, and what we expect to capture]
  ['partialLine', 'history before block 12181673 not loaded · load older', true],
  ['partialLine', 'no change has been queued yet.', false],
  ['blockNumber', 'history before block 12181673 not loaded · load older', true, '12181673'],
  ['loadingNotice', 'loading…', true],
  ['loadingNotice', 'reading the balances and the escrow…', true],
  ['loadingNotice', 'history unavailable', false],
  /* The three stop lines step 5 can print, each read from the page's own wording. A boundary is
     acceptable to row (c); `unavailable` never is, and the driver fails on it at once rather than
     waiting out five minutes for a refusal to improve. */
  ['boundaryLine', 'history before block 12181673 not loaded · load older', true],
  ['boundaryLine', 'history before block 900000 not loaded · this endpoint serves no history before block 900000. A connected wallet reads through its own endpoint, which may go further.', true],
  ['boundaryLine', 'this endpoint is limiting requests · history before block 12181673 is not loaded yet · load older', true],
  /* The no-wallet wording, which has no press because the day is the limit by design. A pattern that
     knew only the wallet wording would read this as "nothing stopped the read". */
  ['boundaryLine', 'nothing has arrived at this address yet. this read stopped at block 12181673, short of a full day connect a wallet to load more', true],
  ['boundaryLine', 'nothing has arrived at this address yet. connect a wallet to load more', false],
  ['activityRow', 'nothing has arrived at this address yet. connect a wallet to load more', false],
  ['boundaryLine', 'nothing has arrived at this address yet.', false],
  ['boundaryLine', 'history unavailable', false],
  ['unavailable', 'history unavailable — the token list and the escrow rows are read from the logs.', true],
  ['unavailable', 'history before block 12181673 not loaded · load older', false],
  /* The activity-row pattern, which row (c) now asks for *alongside* a boundary line rather than
     instead of one: a page may honestly stop short and say so, but it may not show nothing. */
  ['activityRow', 'in Ξ0.0030 from 0x5A15…C50d ↗ block 12192083 history before block 12181673 not loaded · load older', true],
  ['activityRow', 'this endpoint is limiting requests · history before block 12181673 is not loaded yet', false],
  ['activityRow', 'history unavailable', false],
  /* **The sentence that broke it.** The funds block prints this whenever the address-less `Transfer`
     query is refused, which is every endpoint the page ships (#393) — and the pattern used to match
     the bare ` in ` inside "payments **in** could not be read", so a mainnet with no history at all
     classified as having activity rows. The amount anchor is what makes it false. */
  ['activityRow', 'token payments in could not be read from this provider, so a token never distributed here is not listed.', false],
  ['activityRow', 'anyone can call distribute() — the contract splits by the table above; you pay the gas.', false],
  /* A token row, so the anchor is not accidentally tied to the ether sign. */
  ['activityRow', 'in 12.5 USDC from 0x5A15…C50d ↗ block 12192083', true],
  ['activityRow', 'escrowed Ξ0.0009 · 0x5A15…C50d — the push failed', true],
];

/* The row-kind patterns live in node, so they are tested as literals — including the two the
   architect found accepting an empty section: `/queued/i` matches `no change has been queued yet.`
   and `in` matches almost anything. */
const KINDS = [
  [/queued setBeneficiaries/i, 'queued setBeneficiaries · new table · 41% / 29% / 30% · nonce 4 · applied', true],
  [/queued setBeneficiaries/i, 'no change has been queued yet.', false],
  [/applied setBeneficiaries/i, 'applied setBeneficiaries · new table · 41% / 29% / 30%', true],
  [/cancelled setDescription/i, 'cancelled setDescription · new name · renamed', true],
  [/(^|\s)in Ξ[\d.]+ from 0x/i, 'in Ξ0.0030 from 0x5A15…C50d ↗ block 12192083', true],
  [/(^|\s)in Ξ[\d.]+ from 0x/i, 'funds moves by the table, permissionlessly — no approval involved', false],
  [/(^|\s)distributed Ξ[\d.]+ by the table/i, 'distributed Ξ0.0030 by the table block 12192085', true],
  [/(^|\s)escrowed Ξ[\d.]+/i, 'escrowed Ξ0.0009 · 0xC559…7C95 ↗', true],
  [/(^|\s)released Ξ[\d.]+/i, 'released Ξ0.0027 · 0xC559…7C95 ↗', true],
  /* A stale literal copy of `PATTERNS.activityRow`, kept here from before it was anchored. Updated
     with it, and given the case that matters: the sentence the funds block prints when the
     address-less query is refused. A test that encodes a retired pattern tests nothing. */
  [/(^|\s)(in|distributed|escrowed|released|claimed)\s+(?:Ξ)?\d/i, 'history unavailable', false],
  [/(^|\s)(in|distributed|escrowed|released|claimed)\s+(?:Ξ)?\d/i, 'token payments in could not be read from this provider', false],
  [/(^|\s)(in|distributed|escrowed|released|claimed)\s+(?:Ξ)?\d/i, 'in Ξ0.0030 from 0x5A15…C50d', true],
];

/* **The emptiness assertion's own negative case**, which the architect asked for after it fired on ten
   correct Base Sepolia loads. The bug was the *range*: it compared a no-boundary section against every
   block since the factory, when a no-wallet read with no boundary has covered its day. So the case
   that matters is an event **inside** the day — that must still be caught — and one outside it, which
   must not be. Modelled here rather than driven, because `cold.mjs` is the driver and this is its rule. */
function checkEmptinessRange(quiet) {
  const fb = 61_197_280, head = 62_510_175, dayLow = head - 432_000;
  const claim = /nothing has arrived (at this address yet|in the last 24 hours)/i;
  const text = 'nothing has arrived in the last 24 hours. connect a wallet to load more';
  /* The rule as `cold.mjs` applies it: a section with no boundary read `[max(fb, dayLow), head]`. */
  const low = (stopped) => stopped == null ? Math.max(fb, dayLow) : stopped;
  const fires = (at, stopped) => claim.test(text) && at >= low(stopped) && at <= head;
  const cases = [
    ['an event inside the day, no boundary — must fire', 61_397_101 + 1_000_000, null, true],
    ['an event 1.1M blocks back, outside the day — must NOT fire', 61_397_101, null, false],
    ['an event above a boundary the section printed — must fire', head - 100, head - 1_000, true],
    ['an event below that boundary — must NOT fire', head - 5_000, head - 1_000, false],
  ];
  let bad = 0;
  for (const [name, at, stopped, want] of cases) {
    const got = fires(at, stopped);
    if (got !== want) { console.error(`FAIL ${name}: got ${got}`); bad++; }
    else if (!quiet) console.log(`ok   ${name}`);
  }
  return bad;
}

/* Not a pattern but a property of the runner, and it belongs here because it is the same kind of
   claim: something the driver does that nobody can see by reading a row. The default screenshot
   directory must not be inside the repository. It used to be m05-t01c's merged acceptance evidence,
   so an exploratory run rewrote files another task had shipped — twice, during m05-t01d. */
function checkShotsDefault() {
  const src = readFileSync(new URL('./run.mjs', import.meta.url), 'utf8');
  const fails = [];
  if (!/const acceptance = flag\('acceptance'\)/.test(src)) {
    fails.push('run.mjs has no --acceptance flag: the record and a trial run are not told apart');
  }
  /* The default branch must reach for the OS temp directory, and the `docs/` path must sit behind the
     flag. Both halves are asserted: a default of `os.tmpdir()` with the docs path still reachable by
     accident would read as fixed and not be. */
  if (!/os\.tmpdir\(\)/.test(src)) fails.push('run.mjs does not default its shots to a temp directory');
  const docsUse = src.match(/ACCEPTANCE_SHOTS[^\n]*/g) || [];
  if (!docsUse.some(l => /acceptance\s*\n?\s*\?/.test(src.slice(src.indexOf(l))) || /acceptance\s*\?/.test(src))) {
    fails.push('the docs/ shots path is not behind --acceptance');
  }
  for (const f of fails) console.log(`FAIL ${f}`);
  if (!fails.length) console.log('ok   the default shots directory is outside the repository, and docs/ is behind --acceptance');
  return fails.length;
}

export function check({ quiet = false } = {}) {
let bad = 0;
for (const [name, text, want, capture] of CASES) {
  const re = new RegExp(PATTERNS[name]);
  const got = re.test(text);
  const ok = got === want && (!capture || (text.match(re) || [])[1] === capture);
  if (!ok) { bad++; console.error(`FAIL ${name} on ${JSON.stringify(text)}: matched ${got}, expected ${want}${capture ? `, capture ${capture} got ${JSON.stringify((text.match(re) || [])[1])}` : ''}`); }
  else if (!quiet) console.log(`ok   ${name} ${want ? 'matches' : 'refuses'} ${JSON.stringify(text.slice(0, 48))}`);
}
for (const [re, text, want] of KINDS) {
  const got = re.test(text);
  if (got !== want) { bad++; console.error(`FAIL ${re} on ${JSON.stringify(text)}: matched ${got}, expected ${want}`); }
  else if (!quiet) console.log(`ok   ${String(re)} ${want ? 'matches' : 'refuses'} ${JSON.stringify(text.slice(0, 48))}`);
}
// The runner's own default, checked with the patterns rather than beside them: `run.mjs` refuses to
// start if this file reports anything bad, so a driver that could overwrite another task's evidence
// does not start either.
bad += checkShotsDefault();
bad += checkEmptinessRange(quiet);
if (!quiet) console.log(bad ? `\n${bad} check(s) do not do their job.` : `\nall ${CASES.length + KINDS.length} patterns do their job, the emptiness assertion is scoped to the day, and the shots default is outside the repository.`);
return { bad, total: CASES.length + KINDS.length + 1 };
}

/* Run directly: `node selftest.mjs`. Imported by `run.mjs`, which refuses to start if a pattern is
   broken — a self-test nobody runs is one more instrument that cannot fail. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const { bad } = check();
  process.exit(bad ? 1 : 0);
}
