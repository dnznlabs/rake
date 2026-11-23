/* One function per UAT row, each an assertion on the expected state `UAT.md` names. A row returns
   the facts it read, for the run's record; it throws on the first miss, and the caller writes its
   screenshot only when it has returned. Nothing here screenshots on failure: a PNG in `shots/` is
   the claim that the row passed, so it is written after the assertions and never before. */

export const DNZN = '0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199';
export const VAULT = '0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790';
export const ENGINEER = '0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d';
export const UAT_WALLET = '0x357836fFcB45307FA7ff2A574F505753c961902B';
/* Row (l): `test/docs.test.mjs` asserts fifteen sections and `UAT.md` still says fourteen, so the
   number comes from the test rather than from either, and the run records which it found. */
export const DOCS_SECTIONS = 15;

/* Patterns that cross into `page.evaluate` live here as **strings**, and the page builds them with
   `new RegExp`. A regex literal written inside an evaluate closure cannot be tested from node, which
   is how `/block (\d+)/` shipped as `/block (\\d+)/` and left row (e) unable to fail. `selftest.mjs`
   runs these against real lines. */
export const PATTERNS = {
  /* One place for every row-kind pattern, so the driver and `selftest.mjs` cannot disagree about
     what a row looks like (m05-t01d step 8). */
  partialLine: 'history before block \\d+ not loaded',
  /* A read can stop short in four ways since step 5, and three of them print a line: out of budget
     ("…not loaded · load older"), a depth refusal ("…not loaded · this endpoint serves no history
     before block N"), and a throttle ("this endpoint is limiting requests · history before block N
     is not loaded yet"). The fourth, an endpoint that answered nothing, prints `unavailable` below
     and is a failure rather than a boundary. This matches the three that are boundaries — note the
     throttle's wording differs, which is why `partialLine` alone no longer covers them. */
  boundaryLine: 'history before block \\d+ (?:not loaded|is not loaded yet)',
  /* The one line that is never acceptable: the page saying an endpoint answered nothing at all. */
  unavailable: 'history unavailable',
  /* **Anchored to the amount, because a bare kind word is a word.** This matched ` in ` anywhere, and
     the funds block prints "token payments **in** could not be read from this provider" whenever the
     address-less `Transfer` query is refused — which every endpoint the page ships does — so the help
     sentence read as an activity row and credited chain 1 with history it has none of. A row always
     puts its amount straight after its kind (`in Ξ0.0030 from 0x…`, `escrowed Ξ0.0009 · 0x…`,
     `in 12.5 USDC from 0x…`), which is the form `writes.mjs` has always used. Row (c) counts the row
     **elements** rather than trusting this; the pattern is for waiting and for classifying. */
  activityRow: '(^|\\s)(in|distributed|escrowed|released|claimed)\\s+(?:Ξ)?\\d',
  /* What a history row *is*, for counting. `histRows` emits one `.hrow` per entry inside `.hist`. */
  activityRowSelector: '#h-funds .hrow',
  blockNumber: 'block (\\d+)',
  loadingNotice: '^(loading…|reading the balances and the escrow…|reading…)$',
};

export class Miss extends Error {
  constructor(row, what, got, want) {
    super(`row ${row}: ${what} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    this.row = row;
  }
}
export const eq = (row, what, got, want) => { if (got !== want) throw new Miss(row, what, got, want); return got; };
export const has = (row, what, hay, needle) => {
  const ok = String(hay ?? '').includes(needle);
  if (!ok) throw new Miss(row, what, String(hay ?? '').slice(0, 200), `to contain ${JSON.stringify(needle)}`);
  return true;
};
export const truthy = (row, what, got) => { if (!got) throw new Miss(row, what, got, 'a truthy value'); return got; };
export const falsy = (row, what, got) => { if (got) throw new Miss(row, what, got, 'a falsy value'); return got; };

/* `document.body.textContent` includes the text of the inline `<script>`, because the script is a
   child of `<body>` — so matching against it matches the bundle's own source and an assertion can
   pass on a page that renders nothing. Every text read here goes through the rendered view
   (`<main id="view">`, `app/src/layout.html:16`) and uses `innerText`, which is the rendered text. */
export const text = (page, sel) => page.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
export const count = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);
export const viewText = page => page.evaluate(() => (document.getElementById('view')?.innerText || '').replace(/\s+/g, ' ').trim());

/** Polls a predicate rather than sleeping: a public endpoint's round trip is not a fixed number. */
export async function until(label, fn, { ms = 120000, every = 1000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`${label}: still not true after ${Math.round((Date.now() - t0) / 1000)} s`);
    await new Promise(r => setTimeout(r, every));
  }
}

/** Painted = none of the three containers still carries its loading notice. `count.js`'s rule. */
/* An assertion about a section's text waits on a **settled** section, not on one read: a write makes
   the page re-read the view, and during the repaint a row that is still there reads as absent. The
   predicate must hold on two consecutive reads of a section that is itself painted — this section,
   not all three, because requiring the whole page quiet made one row wait out another's churn. */
export async function settledText(page, sel, test, { label, ms = 300000, every = 2500, fatal = PATTERNS.unavailable } = {}) {
  let hits = 0, last = '';
  await until(label || `${sel} settled`, async () => {
    const state = await page.evaluate(([s, pats]) => {
      const el = document.querySelector(s);
      if (!el) return 'absent';
      const LOADING = new RegExp(pats.loadingNotice);
      return [...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim())) ? 'loading' : 'painted';
    }, [sel, PATTERNS]);
    if (state !== 'painted') { hits = 0; return false; }
    last = await text(page, sel);
    /* **`history unavailable` is final, so it fails here and not in five minutes.** It is the page
       saying an endpoint answered nothing at all; waiting for that to improve is waiting for a
       different endpoint. The old behaviour spent the whole 300-second budget on it and then
       reported "still not true after 301 s", which reads as a slow read rather than as the refusal
       it is — and three of those in one run is fifteen minutes of a driver telling you nothing. */
    if (fatal && new RegExp(fatal, 'i').test(last)) {
      throw new Miss(label || sel, 'the section reads `history unavailable`, which no amount of waiting changes', last.slice(0, 120), 'rows, or a boundary line');
    }
    hits = test(last) ? hits + 1 : 0;
    return hits >= 2;
  }, { ms, every });
  return last;
}

export const painted = page => page.evaluate(pats => {
  const IDS = ['funds', 'h-changes', 'h-funds'];
  const LOADING = new RegExp(pats.loadingNotice);
  return IDS.every(id => {
    const el = document.getElementById(id);
    return el && ![...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim()));
  });
}, PATTERNS);

/* Reports which sections were still loading when it gave up, and does not pretend to know whose row
   it was: the caller tags the error with its own id. A bare "still loading" says nothing about which
   of the three was waiting or whether one was missing altogether. */
export const sectionStates = page => page.evaluate(pats => {
  const IDS = ['funds', 'h-changes', 'h-funds'];
  const LOADING = new RegExp(pats.loadingNotice);
  return IDS.map(id => {
    const el = document.getElementById(id);
    if (!el) return `${id}:absent`;
    return `${id}:${[...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim())) ? 'loading' : 'painted'}`;
  }).join(' ');
}, PATTERNS);

export const waitPainted = async (page, ms = 120000) => {
  const t0 = Date.now();
  for (;;) {
    if (await painted(page)) return Date.now() - t0;
    if (Date.now() - t0 > ms) throw new Error(`sections still loading after ${Math.round(ms / 1000)} s — ${await sectionStates(page)}`);
    await page.waitForTimeout(250);
  }
};

/* ---- the rows ------------------------------------------------------------------------------- */

export async function probe(page, { base }) {
  const r = await page.evaluate(() => ({
    top: window.top === window,
    ethereum: typeof window.ethereum,
    origin: location.origin,
  }));
  eq('probe', 'window.top === window', r.top, true);
  eq('probe', 'typeof window.ethereum', r.ethereum, 'object');
  eq('probe', 'location.origin', r.origin, new URL(base).origin);
  return r;
}

export async function rowA(page, { chainName, wallet, patience = 60000 } = {}) {
  /* **The featured panel is filled asynchronously, so it is waited for and not merely read.** This
     row used to read it the instant the load event fired, which passed only because the endpoint it
     was pointed at happened to answer inside that window. Repointing 11155111 at Tenderly in
     m05-t01d step 5 made it fail with an empty panel — and the failure was the driver's, not the
     page's: the panel filled a moment later. A row that depends on which endpoint is fast is not an
     assertion about the document.

     It is the same gap row (c)'s comment describes: painted is not filled. The timeout is the
     finding if it expires — an endpoint too slow to fill the landing page inside a minute is worth
     failing on, and it fails saying so rather than reporting an empty string. */
  await until('(a) the featured panel fills', async () => {
    const t = await text(page, '#featured');
    return t.length > 0 && !/^(loading…|reading…)$/i.test(t);
  }, { ms: patience, every: 1000 });
  const r = await page.evaluate(() => ({
    title: document.title,
    netname: document.getElementById('netname')?.textContent?.trim() ?? null,
    who: document.getElementById('who')?.textContent?.trim() ?? null,
    featured: (document.getElementById('featured')?.innerText || '').replace(/\s+/g, ' ').trim(),
  }));
  eq('a', 'document.title', r.title, 'RAKE');
  eq('a', 'the header names the chain', r.netname, chainName);
  /* The featured panel reads the DNZN table on both paths since m05-t01 step 15's `create` landed
     (`UAT.md` row (a), amended 2026-11-22): an empty panel here is a finding, not the expectation. */
  has('a', 'the featured panel reads the DNZN table', r.featured, 'DNZN // FUND DISTRIBUTION');
  has('a', 'the featured panel carries the table', r.featured, 'treasury');
  if (wallet) has('a', 'the connect button shows the account', r.who.toLowerCase(), '0x5a15');
  else eq('a', 'the connect button with no wallet', r.who, 'connect');
  return r;
}

/** Row (w3): no wallet at all — the chain's name in lower case and the menu's own line. */
export async function rowW3(page, { chainName }) {
  await page.click('#who');
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({
    netname: document.getElementById('netname')?.textContent?.trim() ?? null,
    menu: (document.getElementById('wallet-menu')?.textContent || '').replace(/\s+/g, ' ').trim(),
    ethereum: typeof window.ethereum,
  }));
  eq('w3', 'typeof window.ethereum', r.ethereum, 'undefined');
  eq('w3', 'the header names the chain in lower case', r.netname, chainName);
  has('w3', 'the connect menu says no wallet was found', r.menu, 'no wallet found');
  return r;
}

/* Which owner bar is correct is a property of the chain, not of the script's prose, so the row reads
   it: the distribution's `owner()`, and — when that owner is a contract — whether the connected
   account is one of its signers. `UAT.md`'s amended wording says "the owner bar reading as not the
   owner", which holds only for an account that is neither; the wallet the script names is an Ops
   signer, so the page's correct answer there is the vault line. The run asserts the page agrees with
   the chain and records which branch it took. */
export async function ownerRelation({ addr, connected, rpcUrl, castCall }) {
  const owner = (await castCall(['call', addr, 'owner()(address)'], rpcUrl)).trim();
  const code = (await castCall(['codesize', owner], rpcUrl)).trim();
  const isContract = Number(code) > 0;
  let signer = false;
  if (isContract) {
    try { signer = (await castCall(['call', owner, 'isOwner(address)(bool)', connected], rpcUrl)).trim() === 'true'; } catch (e) { signer = false; }
  }
  const direct = owner.toLowerCase() === connected.toLowerCase();
  return { owner, isContract, signer, direct, expect: direct ? 'owner' : signer ? 'vault' : 'none' };
}

export async function rowC(page, { base, addr = DNZN, patience = 120000, relation = null }) {
  await page.evaluate(a => { location.hash = '#/distros/' + a; }, addr);
  const ms = await waitPainted(page, patience);
  /* Painted is not the same as filled: the sections drop their loading notice and then render their
     rows, so a single read lands in that gap — which is how `activity carries at least one row` failed
     on a page whose activity, read seconds later, carried six. Each section is read until its own
     predicate holds twice (`settledText`), and only then are the facts taken. */
  /* **A boundary line is accepted, and a row is still required** (step 5, step 8). The page may
     honestly stop short — out of budget, or refused older blocks, or throttled — and say so; what it
     may not do is show nothing and call that history. So the predicate asks for an activity row and
     tolerates whatever stop line sits under it; `settledText` fails at once on `history unavailable`,
     which is the one state no waiting improves. */
  await settledText(page, '#h-funds', t => new RegExp(PATTERNS.activityRow, 'i').test(t),
    { label: '(c) `activity` carries at least one row' });
  await settledText(page, '#h-changes', t => /created/i.test(t) || /no change has been queued yet/i.test(t),
    { label: '(c) `changes` reads the empty line this distribution has, or a Created row' });
  const r = await page.evaluate(() => ({
    view: (document.getElementById('view')?.innerText || '').replace(/\s+/g, ' ').trim(),
    changes: (document.getElementById('h-changes')?.innerText || '').replace(/\s+/g, ' ').trim(),
    funds: (document.getElementById('funds')?.innerText || '').replace(/\s+/g, ' ').trim(),
    activity: (document.getElementById('h-funds')?.innerText || '').replace(/\s+/g, ' ').trim(),
    /* Counted as elements. A text pattern over a section that also carries help sentences and stop
       lines is a guess about wording; `.hrow` is what a row is. */
    activityRows: document.querySelectorAll('#h-funds .hrow').length,
    queueButton: !!document.getElementById('queue'),
    ownerBar: ([...document.querySelectorAll('.actions .status')].map(n => n.textContent.trim())[0]) || '',
    ownsText: (document.getElementById('view')?.innerText || '').includes('you own this distribution'),
  }));
  has('c', 'the description', r.view, 'DNZN // FUND DISTRIBUTION');
  has('c', 'the table', r.view, 'treasury');
  falsy('c', '`activity` is not the #382 notice', new RegExp(PATTERNS.unavailable, 'i').test(r.activity));
  falsy('c', '`changes` is not the #382 notice', new RegExp(PATTERNS.unavailable, 'i').test(r.changes));
  truthy('c', `\`activity\` carries at least one row (${r.activityRows} \`.hrow\` elements)`, r.activityRows > 0);
  has('c', '`changes` reads the empty line this distribution has', r.changes, 'no change has been queued yet');
  if (relation) {
    if (relation.expect === 'vault') {
      truthy('c', 'a vault signer is offered the drawer', r.queueButton);
      has('c', 'the owner bar names the vault it is a signer on', r.ownerBar, 'you are a signer on');
      falsy('c', 'and does not claim direct ownership', r.ownsText);
    } else if (relation.expect === 'owner') {
      truthy('c', 'the owner is offered the drawer', r.queueButton);
      truthy('c', 'the owner bar says so', r.ownsText);
    } else {
      falsy('c', 'no owner drawer for an account that neither owns nor signs', r.queueButton);
      falsy('c', 'no "you own this distribution"', r.ownsText);
    }
  }
  return {
    ...r, msToPainted: ms, view: r.view.slice(0, 300), relation,
    createdRow: /created/i.test(r.changes),
  };
}

/* `count.js` is the committed instrument, evaluated rather than pasted: same file, same object. The
   script reads its figure off the console; here it is read off `window.__uat`, which is what the
   console line is a copy of (`count.js:62`). */
export async function countOn(page, src) { await page.evaluate(src); }
export const uatFigure = page => page.evaluate(() => (window.__uat ? { ...window.__uat } : null));

/** Row (d): the second load of the same route in the same tab, so `firstLoad` is false. */
export async function rowD(page, { base, src, addr = DNZN }) {
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3000);
  await countOn(page, src);
  await page.evaluate(a => { location.hash = '#/distros/' + a; }, addr);
  const ms = await waitPainted(page);
  const fig = await uatFigure(page);
  truthy('d', 'count.js reported a figure', fig);
  eq('d', 'firstLoad on the second load', fig.firstLoad, false);
  return { ...fig, msToPainted: ms };
}

/** Row (e): press `load older` once, if a section offers it, and record the delta.

   Three sections can each offer the control, so the boundary is read as the **minimum** across all
   of their lines rather than from whichever line happens to be first in the DOM: clicking one makes
   its own line go, the array shifts, and comparing `[0]` before with `[0]` after compares two
   different sections. The minimum is monotone whichever section was pressed.

   The regexes below were written with doubled backslashes until 2026-11-22 and matched a literal
   backslash, so `boundary` was always `null`, `moved` was always true and this row's whole boundary
   assertion could not fail. The architect caught it at review. Hence the paired check in
   `tools/uat/selftest.mjs`, which runs these patterns against a real line. */
export async function rowE(page) {
  const read = () => page.evaluate(pats => {
    const partial = new RegExp(pats.partialLine);
    const num = new RegExp(pats.blockNumber);
    const lines = [...document.querySelectorAll('.notice, .status')]
      .map(n => n.textContent.trim())
      .filter(t => partial.test(t));
    const nums = lines.map(t => Number((t.match(num) || [])[1])).filter(Number.isFinite);
    return {
      logs: window.__uat ? window.__uat.eth_getLogs : null,
      lines, boundary: nums.length ? Math.min(...nums) : null,
      older: document.querySelectorAll('button.older').length,
    };
  }, PATTERNS);
  const before = await read();
  if (!before.older) return { shown: false, note: 'not shown — the scan reached the factory block within budget', logs: before.logs };
  truthy('e', 'a boundary was read from the partial line before pressing', Number.isFinite(before.boundary));
  await page.click('button.older');
  /* Give the reload of the older window time to land, and stop as soon as it has rather than after a
     fixed sleep: an `eth_getLogs` round trip on a public endpoint is not a predictable 6 s. */
  let after = before;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    after = await read();
    const moved = after.boundary === null || after.boundary < before.boundary;
    if (moved && after.logs > before.logs) break;
  }
  await waitPainted(page);
  const moved = after.boundary === null || after.boundary < before.boundary;
  truthy('e', `the boundary moved down or the line went (before ${before.boundary}, after ${after.boundary})`, moved);
  truthy('e', `eth_getLogs rose (before ${before.logs}, after ${after.logs})`, after.logs > before.logs);
  const changes = await page.evaluate(() => (document.getElementById('h-changes')?.innerText || '').replace(/\s+/g, ' ').trim());
  return {
    shown: true, boundaryBefore: before.boundary, boundaryAfter: after.boundary,
    logsBefore: before.logs, logsAfter: after.logs, delta: after.logs - before.logs,
    olderControlsBefore: before.older, olderControlsAfter: after.older,
    changesCarriesCreated: /created/i.test(changes),
  };
}

/* Row (k), Sepolia only: the published host page of m04-t04 AC (e), with the widget mounted twice.
   It cannot be driven, and the reason is in the repository rather than in the page: the file exists
   at `docs/milestones/m04/tasks/m04-t04/host/index.html` and carries both mounts, but **no published
   URL for it exists** — m04-t05's own § Step 2 records this row as "pending on t04 (e)" for the same
   reason — and the file names **84532's** w3link base rather than a `dnzn.dev` one, so even published
   it would not be the page this row describes. Recorded as pending with the evidence; the plan has a
   row that cannot reach its expected state become an issue linked from the handoff. */
export async function rowK({ readFile }) {
  const file = 'docs/milestones/m04/tasks/m04-t04/host/index.html';
  const html = readFile(file);
  const mounts = (html.match(/data-rake=/g) || []).length;
  const withRpc = (html.match(/data-rpc=/g) || []).length;
  const script = (html.match(/<script src="([^"]+widget\.js)"/) || [])[1] || null;
  eq('k', 'the host page carries two mounts', mounts, 2);
  eq('k', 'one of them names its own endpoint', withRpc, 1);
  truthy('k', 'it loads widget.js from a gateway', script);
  return {
    pending: true,
    why: 'no published URL for the host page; m04-t05 § Step 2 records the same, and the committed file names 84532’s w3link base rather than a dnzn.dev one',
    file, mounts, withRpc, script,
  };
}

export async function rowL(page, { base, chainId, shot } = {}) {
  await page.evaluate(() => { location.hash = '#/docs'; });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    /* `nav.rail` inside the docs grid, not every `nav a` on the page — the header is a nav too, and
       counting it is how a rail of fifteen reads as twenty-one. */
    rail: [...document.querySelectorAll('nav.rail a')].map(a => a.textContent.trim()).filter(Boolean),
    ids: [...document.querySelectorAll('[id^="s-"]')].map(n => n.id.slice(2)),
  }));
  eq('l', 'the rail is the same count as the article', r.rail.length, r.ids.length);
  /* `UAT.md` row (l) says fourteen; `test/docs.test.mjs` asserts fifteen and the page has fifteen,
     so the number comes from the test and the row wants amending. The run records what it found. */
  eq('l', 'the section count', r.ids.length, DOCS_SECTIONS);
  eq('l', 'the Disclaimer is first', r.ids[0], 'disclaimer');
  /* Two viewport shots, because the row navigates to both and one frame cannot show both (rake#381). */
  if (shot) await shot('l-docs');
  await page.evaluate(() => { location.hash = '#/docs#widget'; });
  await page.waitForTimeout(1200);
  /* The snippet is in the article, after the `s-widget` heading — the heading itself is three words.

     **It names one fixed host, and no longer the page's own address** (m05-t01d step 7). It used to
     be asserted against `new URL(base).origin`, which was right while the snippet resolved
     `widget.js` against whatever served the page — and would now fail on any run whose base is not
     the gateway, a local preview among them. What a host pasting this needs is an address that
     resolves in an ordinary browser, so the assertion is the literal host and this chain's id.

     The `integrity` and `crossorigin` attributes are asserted with it: the hash is what makes a
     cross-origin script safe to paste, and a browser **refuses** a cross-origin script carrying
     `integrity` without `crossorigin` rather than checking it — so a snippet with one and not the
     other would not load at all, which no assertion about the URL would catch. */
  const article = await page.evaluate(() => (document.querySelector('article.doc')?.innerText || '').replace(/\s+/g, ' '));
  has('l', 'the widget snippet is in the article', article, 'widget.js');
  has('l', 'the snippet names the gateway and this chain', article, `https://rake.dnzn.dev/${chainId}/widget.js`);
  has('l', 'the snippet pins the widget’s bytes', article, 'integrity="sha384-');
  has('l', 'and carries crossorigin, without which integrity is refused', article, 'crossorigin="anonymous"');
  const snippet = (article.match(/<script[^>]*widget\.js[^>]*>/) || [])[0] || null;
  return { ...r, snippet };
}
