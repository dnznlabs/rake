/* The write rows: (f) create, (g) pay in and distribute, (h) release, (i) queue/apply/cancel,
   (j) a vault-owned create whose drawer hands back calldata. Every one of them is a transaction the
   page builds and the injected provider signs with the engineer's key through `cast send`, so what is
   asserted is the page's own flow and not a script's idea of it. */
import { eq, has, truthy, falsy, Miss, waitPainted, sectionStates } from './rows.mjs';

const text = (page, sel) => page.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const view = page => page.evaluate(() => (document.getElementById('view')?.innerText || '').replace(/\s+/g, ' ').trim());
const count = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);

/* The page reports every write on its own status line (`#txs`, `app/src/index.html:343`): the label,
   then `checking the call against the chain…`, then either `landed in block N` or a `bad` line with
   the reason. It cannot be *polled*, because `bindWrites` re-reads the whole view from the chain the
   moment a write lands (`:1381`) and the re-render takes `#txs` with it — poll and you find an empty
   element and learn nothing. So the lines are **recorded as they happen** by an observer installed
   before the click, and read afterwards. Three of this driver's early failures were a refused write
   discovered minutes later as a timeout on an unrelated assertion; this is how a refusal becomes a
   sentence. */
export async function watchTx(page) {
  await page.evaluate(() => {
    window.__txLines = [];
    if (window.__txObs) window.__txObs.disconnect();
    const grab = () => {
      const el = document.querySelector('#txs .status');
      if (!el) return;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const last = window.__txLines[window.__txLines.length - 1];
      if (last && last.text === text) return;
      window.__txLines.push({ text, bad: el.classList.contains('bad'), warn: el.classList.contains('warn'), at: Date.now() });
    };
    window.__txObs = new MutationObserver(grab);
    window.__txObs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    grab();
  });
}

/* A control the page re-rendered without rebinding is a control whose click does nothing — no status
   line, no transaction, no error. Pressing `refresh` re-renders and rebinds, so an attempt that
   produces no line at all is retried that way rather than waited out. A refusal or a warning is not
   retried: those are answers. */
export async function pressWriteRetry(page, selector, row, label, { attempts = 3, each = 60000 } = {}) {
  let last = null;
  for (let i = 1; i <= attempts; i++) {
    try { return await pressWrite(page, selector, row, label, { ms: each }); } catch (e) {
      if (e instanceof Miss) throw e;
      last = e;
      if (i < attempts) {
        await page.click('#refresh').catch(() => {});
        await waitPainted(page, 300000);
        await until(`${row}: ${label}'s control is offered again`, () => count(page, selector), { ms: 120000, every: 2000 });
      }
    }
  }
  throw new Error(`${row}: ${label} produced no status line in ${attempts} attempts — ${last && last.message}`);
}

export async function pressWrite(page, selector, row, label, { ms = 300000 } = {}) {
  await watchTx(page);
  await page.click(selector);
  const t0 = Date.now();
  for (;;) {
    const lines = await page.evaluate(() => window.__txLines || []);
    const landed = lines.find(l => /landed in block \d+/.test(l.text));
    if (landed) return { block: Number(landed.text.match(/landed in block (\d+)/)[1]), text: landed.text, lines: lines.map(l => l.text) };
    const bad = lines.find(l => l.bad);
    if (bad) throw new Miss(row, `${label} was refused by the page`, bad.text, 'to land');
    const warn = lines.find(l => l.warn);
    if (warn) throw new Miss(row, `${label} got no receipt`, warn.text, 'to land');
    if (Date.now() - t0 > ms) throw new Error(`${row}: ${label} never reported in ${Math.round(ms / 1000)} s — lines ${JSON.stringify(lines.map(l => l.text))}`);
    await page.waitForTimeout(1200);
  }
}

/* An assertion about a section's text has to wait on a **settled** section, not on one read: a write
   makes the page re-read the view, and during the repaint a row that is still there reads as absent.
   `settledText` requires the three sections painted and the predicate true on two consecutive reads
   two and a half seconds apart. The architect's review asks for exactly this on every "row went". */
export async function settledText(page, sel, test, { label, ms = 300000, every = 2500 } = {}) {
  let hits = 0, last = '';
  await until(label || `${sel} settled`, async () => {
    /* Settled means **this** section, not all three. Requiring the whole page quiet made a row wait
       out another section's churn — a fresh distribution's activity reloads while `changes` has long
       since settled — and that is a driver stall dressed as a page failure. */
    const state = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return 'absent';
      const LOADING = /^(loading…|reading the balances and the escrow…|reading…)$/;
      return [...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim())) ? 'loading' : 'painted';
    }, sel);
    if (state !== 'painted') { hits = 0; return false; }
    last = await text(page, sel);
    hits = test(last) ? hits + 1 : 0;
    return hits >= 2;
  }, { ms, every });
  return last;
}

/* The header of a distribution — its name, owner and delay — is filled by its own chain read, which
   can land after the three history sections have painted. Reading the view once at that moment catches
   a half-painted page: `OWNER renounced · DELAY none` for a distribution the chain says is owned by
   the vault with a 3,600-second delay, which is exactly what row (j) failed on. So the view, too, is
   read until a predicate holds twice. */
export async function settledView(page, test, { label, ms = 240000, every = 2500 } = {}) {
  let hits = 0, last = '';
  await until(label || 'the view settled', async () => {
    last = await view(page);
    hits = test(last) ? hits + 1 : 0;
    return hits >= 2;
  }, { ms, every });
  return last;
}

/** The write controls the page is offering, for a failure that would otherwise say only "not true". */
export const controlsNow = page => page.evaluate(() => [...document.querySelectorAll('[data-send],[data-copy]:not(.cp)')]
  .map(b => `${b.dataset.send ? 'send' : 'copy'}:${b.dataset.send || b.dataset.copy}${b.disabled ? ' (disabled)' : ''}`));

/** Waits for a control to be offered, pressing `refresh` between tries, and names what was there. */
export async function waitControl(page, selector, row, what, { attempts = 4, each = 45000 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await until(`${row}: ${what}`, () => count(page, selector), { ms: each, every: 1500 });
      return true;
    } catch (e) {
      if (i === attempts) {
        throw new Error(`${row}: ${what} — not offered after ${attempts} tries. Controls present: ${JSON.stringify(await controlsNow(page))}. who=${JSON.stringify(await page.evaluate(() => document.getElementById('who')?.textContent?.trim()))}`);
      }
      await page.click('#refresh').catch(() => {});
      await page.waitForTimeout(4000);
    }
  }
}

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

async function setRows(page, rows) {
  const have = await count(page, '.erow');
  for (let i = have; i < rows.length; i++) await page.click('[data-edadd]');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await page.fill(`[data-ed="name"][data-i="${i}"]`, r.name);
    await page.fill(`[data-ed="note"][data-i="${i}"]`, r.note ?? '');
    await page.fill(`[data-ed="pct"][data-i="${i}"]`, String(r.pct));
    await page.fill(`[data-ed="addr"][data-i="${i}"]`, r.addr);
    /* The address field reads on `change`, so the value has to be committed rather than typed. */
    await page.dispatchEvent(`[data-ed="addr"][data-i="${i}"]`, 'change');
    await page.waitForTimeout(400);
  }
}

/** Row (f): the create the whole write half hangs off. Returns the distribution's address. */
export async function rowF(page, { base, owner, delay = '60', desc, rows, saltFrom = 1 }) {
  await page.evaluate(() => { location.hash = '#/create'; });
  await until('(f) step 1 painted', () => count(page, '#c-next'));
  await page.fill('#c-desc', desc);
  await page.fill('#c-owner', owner);
  await page.dispatchEvent('#c-owner', 'change');
  await page.fill('#c-delay', delay);
  await page.waitForTimeout(1200);
  const ack = await count(page, '#c-ack');
  if (ack) await page.check('#c-ack');
  await until('(f) Next is live', async () => !(await page.isDisabled('#c-next')));
  await page.click('#c-next');
  await until('(f) step 2 painted', () => count(page, '#c-deploy'));
  await setRows(page, rows);
  const sum = await text(page, '#ed-sum');
  has('f', 'the editor reads the table back', sum, 'total 100%');
  /* #22: a used salt is refused rather than sent, so the driver walks the index up until the page
     offers one that is free — which is also the guard being exercised. */
  let salt = saltFrom, predicted = null;
  for (;;) {
    await page.fill('#c-n', String(salt));
    await page.waitForTimeout(2500);
    const line = await text(page, '#c-predict');
    if (/will deploy to/.test(line)) { predicted = (line.match(/0x[0-9a-fA-F]{40}/) || [])[0]; break; }
    if (/already exists/.test(line)) { salt++; if (salt > saltFrom + 20) throw new Error('(f): twenty salts in a row were taken'); continue; }
    throw new Miss('f', 'the predicted address line', line, 'to say where it would deploy');
  }
  truthy('f', 'the page predicted an address', predicted);
  await until('(f) Deploy is live', async () => !(await page.isDisabled('#c-deploy')));
  await page.click('#c-deploy');
  await until('(f) the create landed and the page routed to it', async () => {
    const h = await page.evaluate(() => location.hash);
    return h.toLowerCase().includes(predicted.toLowerCase());
  }, { ms: 240000, every: 2000 });
  /* A fresh distribution paints in about five seconds when the endpoint is warm, and the first read
     after a create has been seen to take far longer on a public endpoint under load. The patience is
     generous and a press of `refresh` is tried on the way, which is what a reader would do. */
  try {
    await waitPainted(page, 60000);
  } catch (e) {
    await page.click('#refresh').catch(() => {});
    await waitPainted(page, 180000);
  }
  await settledView(page, t => t.includes(desc), { label: `(f) the new distribution shows its name — ${desc}` });
  return { addr: predicted, salt, sum };
}

/** Row (g): a plain transfer in, then `distribute` — the receiver's share escrows.

   The escrow only happens while the receiver refuses ETH, and row (h) leaves it accepting — so a
   second run of this row would see three shares paid and no escrow. The row therefore **establishes
   its own precondition from the chain** rather than assuming the state the last run left: read
   `accepting()`, set it false if it is true, and record that it did. */
export async function rowG(page, { addr, payIn, rpcUrl, ether = '0.003', receiver, castCall, castSend, sender }) {
  let reset = null;
  if (receiver && castCall && castSend) {
    const accepting = (await castCall(['call', receiver, 'accepting()(bool)'], rpcUrl)).trim();
    if (accepting === 'true') {
      const r = await castSend(['send', receiver, 'setAccepting(bool)', 'false'], rpcUrl, sender);
      eq('g', 'the receiver was put back to refusing', r.status, '0x1');
      reset = r.transactionHash;
    }
  }
  const receipt = await payIn({ to: addr, ether, rpcUrl, sender });
  eq('g', 'the pay-in landed', receipt.status, '0x1');
  await page.click('#refresh');
  await waitPainted(page);
  await settledText(page, '#funds', t => /waiting to distribute/i.test(t), { label: '(g) the page sees the pay-in' });
  const before = await text(page, '#funds');
  const dist = await pressWrite(page, '[data-send^="dist:"]', 'g', 'distribute');
  await waitPainted(page);
  await settledText(page, '#funds', t => /held in escrow/i.test(t), { label: '(g) the escrow row appeared and stayed' });
  const funds = await text(page, '#funds');
  const activity = await text(page, '#h-funds');
  has('g', 'activity carries the pay-in', activity, 'in');
  has('g', 'activity carries the split', activity.toLowerCase(), 'distributed');
  has('g', 'the escrow row names the failed push', funds.toLowerCase(), 'escrow');
  return { payInTx: receipt.transactionHash, receiverResetTx: reset, distributeBlock: dist.block, fundsBefore: before.slice(0, 160), funds: funds.slice(0, 200), activity: activity.slice(0, 200) };
}

/** Row (h): the receiver starts accepting, then `release` pays the escrow out. */
export async function rowH(page, { receiver, castSend, castCall, rpcUrl, sender }) {
  const r = await castSend(['send', receiver, 'setAccepting(bool)', 'true'], rpcUrl, sender);
  eq('h', 'setAccepting landed', r.status, '0x1');
  /* And read it back before pressing `release`: the page's preflight asks an endpoint that may not
     have seen the flip yet, and a `Refused()` revert there is a race rather than a defect. */
  await until('(h) the receiver reads as accepting', async () => (await castCall(['call', receiver, 'accepting()(bool)'], rpcUrl)).trim() === 'true', { ms: 120000, every: 3000 });
  await page.click('#refresh');
  await waitPainted(page);
  await until('(h) the release control is offered', () => count(page, '[data-send^="rel:"]'));
  const rel = await pressWrite(page, '[data-send^="rel:"]', 'h', 'release');
  await waitPainted(page);
  await settledText(page, '#funds', t => t.length > 0 && !/held in escrow/i.test(t), { label: '(h) the escrow row went and stayed gone' });
  /* The sections repaint one after another, so `activity` can still be reading when `funds` has
     finished: wait for the row rather than for the other section. */
  await waitPainted(page);
  await settledText(page, '#h-funds', t => /released/i.test(t), { label: '(h) activity carries the release' });
  const activity = await text(page, '#h-funds');
  has('h', 'activity carries the release', activity.toLowerCase(), 'released');
  return { setAcceptingTx: r.transactionHash, releaseBlock: rel.block, activity: activity.slice(0, 200) };
}

/** Row (i): queue a table change, apply it past the eta, then queue a name and cancel it. */
export async function rowI(page, { rows }) {
  await page.click('#queue');
  await until('(i) the drawer opened', () => count(page, '[data-send="table"]'));
  await setRows(page, rows);
  await pressWrite(page, '[data-send="table"]', 'i', 'propose setBeneficiaries');
  await settledText(page, '#h-changes', t => /queued/i.test(t), { label: '(i) the change is queued' });
  const queued = await text(page, '#h-changes');
  /* `UAT.md` expects the apply control to read `anyone can apply once the delay passes`. That text
     is the **disabled** control's status (`app/src/index.html:1235`), so it exists only between the
     queue and the eta — a 60-second window that a settle wait on a public endpoint can easily
     outlast. Both states are correct and which one a run catches is timing, so the row accepts
     either and records which it saw rather than racing the window. */
  const applyState = await (async () => {
    const v = (await view(page)).toLowerCase();
    if (v.includes('anyone can apply')) return 'the delay had not passed: the disabled control reads "anyone can apply once the delay passes"';
    if (await count(page, '[data-send^="apply:"]')) return 'the delay had already passed by the time the row was read: a live apply control';
    return null;
  })();
  truthy('i', 'the queued change offers the apply path, before or after its eta', applyState);
  await waitControl(page, '[data-send^="apply:"]', 'i', 'the queued change offers apply');
  await until('(i) the apply control is live', async () => !(await page.isDisabled('[data-send^="apply:"]')), { ms: 300000, every: 5000 });
  await pressWriteRetry(page, '[data-send^="apply:"]', 'i', 'applyQueued');
  /* A write makes the page re-read the view from the chain, so the section is loading again; wait for
     the paint before reading its text, and give the endpoint room. */
  await settledText(page, '#h-changes', t => /applied/i.test(t), { label: '(i) the change applied' });
  const applied = await text(page, '#h-changes');
  /* rake#381 has this row assert `Created`, `queued` and `applied`. **`Created` cannot appear in
     `changes` on any distribution**, and not for want of history: the section is built from the
     distribution's own events, and `CHANGE_EVENTS` is `Queued`, `Applied`, `Cancelled` and
     `OwnershipTransferred` (`app/src/index.html:961-962`). The factory's `Created` is used only to
     find a distribution and to seed its first block (`:965`, `:2229-2230`). Measured too: on a
     distribution this driver created minutes earlier, `load older` pressed until nothing was left to
     load, `changes` reads `queued` and `applied` and no `Created` — while the factory's `Created` log
     for it is on chain at block 12,191,964. So the row asserts the three events the section is made
     of, and the `Created` clause is raised for amendment instead of being asserted into failure. */
  has('i', 'changes carries queued', applied.toLowerCase(), 'queued');
  has('i', 'changes carries applied', applied.toLowerCase(), 'applied');
  truthy('i', 'the owner bar reads as the owner', /you own this distribution/.test(await view(page)));
  // then a name change, queued and cancelled
  if (!(await count(page, '[data-send="desc"]'))) await page.click('#queue').catch(() => {});
  await waitControl(page, '[data-send="desc"]', 'i', 'the drawer offers the name write again');
  await page.fill('#q-desc', 'm05-t01c driver UAT · renamed');
  await pressWrite(page, '[data-send="desc"]', 'i', 'propose setDescription');
  await waitControl(page, '[data-send^="cancel:"]', 'i', 'the queued name change offers cancel');
  await pressWriteRetry(page, '[data-send^="cancel:"]', 'i', 'cancel');
  await settledText(page, '#h-changes', t => /cancelled/i.test(t), { label: '(i) the change is cancelled' });
  const cancelled = await text(page, '#h-changes');
  has('i', 'changes carries cancelled', cancelled.toLowerCase(), 'cancelled');
  return {
    queued: queued.slice(0, 200), applyState, applied: applied.slice(0, 240), cancelled: cancelled.slice(0, 240),
    createdRow: /created/i.test(cancelled),
    createdRowNote: 'absent by construction: CHANGE_EVENTS is Queued/Applied/Cancelled/OwnershipTransferred (app/src/index.html:961-962), so no distribution shows a Created row',
  };
}

/** Row (j): a vault-owned create, whose drawer writes are calldata rather than transactions. */
export async function rowJ(page, { base, vault, rows, sent }) {
  const before = sent.length;
  const made = await rowF(page, { base, owner: vault, delay: '3600', desc: 'm05-t01c driver UAT · vault', rows, saltFrom: 40 });
  await settledView(page, t => t.includes('you are a signer on'), { label: '(j) the owner bar names the vault this wallet signs on' });
  await page.click('#queue');
  /* `data-copy` is also on the little address copiers (`class="cp"`), so the drawer's own button is
     the one inside `.drawer` that is not one of those — clicking the first `[data-copy]` on the page
     copies an address and proves nothing. */
  const CD = '.drawer [data-copy]:not(.cp)';
  await until('(j) the drawer offers calldata rather than a send', () => count(page, CD));
  falsy('j', 'no send control in the vault drawer', await count(page, '.drawer [data-send]'));
  const afterCreate = sent.length;
  await page.click(CD);
  /* Two branches, and the page's own wording for each: the clipboard one writes `copied · N bytes`,
     and where the clipboard is refused it puts the calldata in a textarea and says `clipboard refused
     — select all and copy` (`app/src/index.html:402-407`). Either is a pass for this row; what the row
     is about is that bytes came back and **nothing was sent**. */
  const outcome = await until('(j) the calldata came back', async () => {
    const v = await view(page);
    if (/copied · \d+ bytes/.test(v)) return { branch: 'clipboard', line: v.match(/copied · \d+ bytes/)[0] };
    if (/clipboard refused/i.test(v)) {
      const cd = await page.evaluate(() => document.querySelector('#txs textarea.cd')?.value || null);
      return cd ? { branch: 'textarea', calldata: cd } : false;
    }
    return false;
  }, { ms: 120000, every: 1500 });
  if (outcome.branch === 'clipboard') {
    const bytes = Number(outcome.line.match(/(\d+) bytes/)[1]);
    truthy('j', 'the copied calldata has a length', bytes > 0);
    const cd = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
    if (cd) {
      truthy('j', 'the clipboard holds hex calldata', /^0x[0-9a-fA-F]+$/.test(cd));
      eq('j', 'the clipboard length matches what the page claimed', (cd.length - 2) / 2, bytes);
      outcome.calldata = cd;
    }
  } else {
    truthy('j', 'the textarea holds hex calldata', /^0x[0-9a-fA-F]+$/.test(outcome.calldata));
  }
  eq('j', 'pressing a drawer write sent no transaction', sent.length, afterCreate);
  return {
    addr: made.addr, salt: made.salt, branch: outcome.branch,
    copied: outcome.line || null, calldataBytes: outcome.calldata ? (outcome.calldata.length - 2) / 2 : null,
    selector: outcome.calldata ? outcome.calldata.slice(0, 10) : null,
    sendsDuringCreate: afterCreate - before,
  };
}
