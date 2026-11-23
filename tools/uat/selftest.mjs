#!/usr/bin/env node
/* The patterns this driver sends into the page, run against real lines in node.

   A regex literal written inside a `page.evaluate` closure cannot be reached from a test, and one of
   them shipped with doubled backslashes: `/block (\\d+)/` matches a literal backslash, so row (e)'s
   boundary was always `null`, `moved` was always true and the assertion could not fail. The fix is
   not care, it is reachability — the patterns are strings in `rows.mjs`, the page compiles them with
   `new RegExp`, and this file proves they match what the page actually prints.

   Run: node selftest.mjs — exits non-zero on the first pattern that does not do its job. */
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
  ['boundaryLine', 'nothing has arrived at this address yet.', false],
  ['boundaryLine', 'history unavailable', false],
  ['unavailable', 'history unavailable — the token list and the escrow rows are read from the logs.', true],
  ['unavailable', 'history before block 12181673 not loaded · load older', false],
  /* The activity-row pattern, which row (c) now asks for *alongside* a boundary line rather than
     instead of one: a page may honestly stop short and say so, but it may not show nothing. */
  ['activityRow', 'in Ξ0.0030 from 0x5A15…C50d ↗ block 12192083 history before block 12181673 not loaded · load older', true],
  ['activityRow', 'this endpoint is limiting requests · history before block 12181673 is not loaded yet', false],
  ['activityRow', 'history unavailable', false],
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
  [/(^|\s)(in|distributed|escrowed|released|claimed)\s/i, 'history unavailable', false],
];

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
if (!quiet) console.log(bad ? `\n${bad} pattern(s) do not do their job.` : `\nall ${CASES.length + KINDS.length} patterns do their job.`);
return { bad, total: CASES.length + KINDS.length };
}

/* Run directly: `node selftest.mjs`. Imported by `run.mjs`, which refuses to start if a pattern is
   broken — a self-test nobody runs is one more instrument that cannot fail. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const { bad } = check();
  process.exit(bad ? 1 : 0);
}
