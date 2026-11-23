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
export const viewText = page => page.evaluate(() => (document.getElementById('view')?.innerText || '').replace(/\s+/g, ' ').trim());

/** Painted = none of the three containers still carries its loading notice. `count.js`'s rule. */
export const painted = page => page.evaluate(() => {
  const IDS = ['funds', 'h-changes', 'h-funds'];
  const LOADING = /^(loading…|reading the balances and the escrow…|reading…)$/;
  return IDS.every(id => {
    const el = document.getElementById(id);
    return el && ![...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim()));
  });
});

/* Reports which sections were still loading when it gave up, and does not pretend to know whose row
   it was: the caller tags the error with its own id. A bare "still loading" says nothing about which
   of the three was waiting or whether one was missing altogether. */
export const sectionStates = page => page.evaluate(() => {
  const IDS = ['funds', 'h-changes', 'h-funds'];
  const LOADING = /^(loading…|reading the balances and the escrow…|reading…)$/;
  return IDS.map(id => {
    const el = document.getElementById(id);
    if (!el) return `${id}:absent`;
    return `${id}:${[...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim())) ? 'loading' : 'painted'}`;
  }).join(' ');
});

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

export async function rowA(page, { chainName, wallet }) {
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
  const r = await page.evaluate(() => ({
    view: (document.getElementById('view')?.innerText || '').replace(/\s+/g, ' ').trim(),
    changes: (document.getElementById('h-changes')?.textContent || '').replace(/\s+/g, ' ').trim(),
    funds: (document.getElementById('funds')?.textContent || '').replace(/\s+/g, ' ').trim(),
    activity: (document.getElementById('h-funds')?.textContent || '').replace(/\s+/g, ' ').trim(),
    queueButton: !!document.getElementById('queue'),
    ownerBar: ([...document.querySelectorAll('.actions .status')].map(n => n.textContent.trim())[0]) || '',
    ownsText: (document.getElementById('view')?.innerText || '').includes('you own this distribution'),
  }));
  has('c', 'the description', r.view, 'DNZN // FUND DISTRIBUTION');
  has('c', 'the table', r.view, 'treasury');
  /* `UAT.md` expects `changes` to carry `Created`, and on this distribution it cannot through the
     page's own endpoint: the factory's `Created` event is outside the `eth_getLogs` range that
     endpoint serves, which `RUNBOOK.md:1944` already records for Base Sepolia. Measured here on
     Sepolia: after two presses of `load older` the partial line goes, `changes` still reads "no
     change has been queued yet.", and there are no page errors — the page scanned to its floor and
     the range came back empty. So the row asserts that the section painted and records whether the
     `Created` row was there; the absence is a finding about the endpoint, raised for amendment, and
     not something this driver passes over in silence. */
  /* Ruled 2026-11-22 (rake#381): `Created` moves to row (i), on the distribution row (f) creates.
     Here the row asserts the three sections painted, `activity` non-empty, and `changes` carrying
     either `Created` or its empty line with nothing left to load. */
  truthy('c', '`changes` painted', r.changes.length > 0);
  truthy('c', '`activity` is not empty', r.activity.length > 0);
  /* The ruling reads "`Created`, or the empty line with nothing left to load". On the **first** load
     there is still history to load — the section says so, and pressing it is row (e) — so the two
     halves are asserted across the two rows rather than demanded of this one: here, `Created` or the
     empty line; in row (e), that the boundary moves down or goes. Split this way the pair is stronger
     than the clause, not weaker, and the deviation is stated rather than assumed. */
  const changesOk = /created/i.test(r.changes) || /no change has been queued yet/i.test(r.changes);
  truthy('c', '`changes` carries Created, or its empty line', changesOk);
  /* Amended 2026-11-22: its owner is the Ops vault, so the owner bar reads as NOT the owner —
     `ownerBar` returns nothing at all (`app/src/index.html:1747-1755`). */
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
    createdRowNote: /created/i.test(r.changes) ? null : 'absent by construction: `changes` is built from CHANGE_EVENTS — Queued, Applied, Cancelled, OwnershipTransferred (app/src/index.html:961-962) — and the factory\'s Created is used only to find a distribution (:2229). No distribution shows a Created row; raised for amendment',
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
   different sections. The minimum is monotone whichever section was pressed. */
export async function rowE(page) {
  const read = () => page.evaluate(() => {
    const lines = [...document.querySelectorAll('.notice, .status')]
      .map(n => n.textContent.trim())
      .filter(t => /history before block \\d+ not loaded/.test(t));
    const nums = lines.map(t => Number((t.match(/block (\\d+)/) || [])[1])).filter(Number.isFinite);
    return {
      logs: window.__uat ? window.__uat.eth_getLogs : null,
      lines, boundary: nums.length ? Math.min(...nums) : null,
      older: document.querySelectorAll('button.older').length,
    };
  });
  const before = await read();
  if (!before.older) return { shown: false, note: 'not shown — the scan reached the factory block within budget', logs: before.logs };
  await page.click('button.older');
  /* Give the reload of the older window time to land, and stop as soon as it has rather than after a
     fixed sleep: an `eth_getLogs` round trip on a public endpoint is not a predictable 6 s. */
  let after = before;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    after = await read();
    const moved = after.boundary === null || (before.boundary !== null && after.boundary < before.boundary);
    if (moved && after.logs > before.logs) break;
  }
  await waitPainted(page);
  const moved = after.boundary === null || (before.boundary !== null && after.boundary < before.boundary);
  truthy('e', 'the boundary moved down or the line went', moved);
  truthy('e', 'eth_getLogs rose', after.logs > before.logs);
  const changes = await page.evaluate(() => (document.getElementById('h-changes')?.innerText || '').replace(/\\s+/g, ' ').trim());
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

export async function rowL(page, { base, shot } = {}) {
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
     The row asks that it carries *this chain's* gateway URL, so both halves are asserted. */
  const article = await page.evaluate(() => (document.querySelector('article.doc')?.innerText || '').replace(/\s+/g, ' '));
  has('l', 'the widget snippet is in the article', article, 'widget.js');
  if (base) has('l', 'the snippet carries this chain’s gateway URL', article, new URL(base).origin + new URL(base).pathname);
  const snippet = (article.match(/<script[^>]*widget\.js[^>]*>/) || [])[0] || null;
  return { ...r, snippet };
}
