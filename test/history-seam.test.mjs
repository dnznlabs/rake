/* The seam between two reads from two providers (#400).

   A wallet page's history is now read **twice, by different endpoints**: the page's own provider
   reads the last 24 hours, and `load older` continues below it through the wallet's. So the page
   holds one history assembled from two walks, and the boundary between them is a single block
   number — the architect's point, 2026-11-23. Either mistake at that number is silent:

     one block too high   the two ranges overlap and an event is listed twice
     one block too low    a block is in neither range and an event is gone

   Nothing downstream can catch it. `histOf` sorts and groups; it does not deduplicate, and it cannot
   know which blocks were asked for. So the invariant is asserted here against an endpoint that
   answers **one event per block**, which makes the union of the two reads directly comparable to the
   range they were supposed to cover between them.

   Both walks are the page's own `logs`, the boundary is the page's own expression lifted out of
   `older()`, and the join is the page's own. Only `fetch` and the budget constants are stubbed.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join as pjoin } from 'node:path';
import { fileURLToPath } from 'node:url';
import Model from '../app/src/model.js';

const root = pjoin(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(pjoin(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

const block = (anchor, end = '\n}\n', from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  const to = from.indexOf(end, at);
  assert.ok(to > at, `\`${anchor}\` is no longer closed by ${JSON.stringify(end)}`);
  return from.slice(at, to + end.length);
};
const line = (anchor, from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer has \`${anchor}\``);
  return from.slice(at, from.indexOf('\n', at));
};

const WIN_START = line('let WINDOW_START =');
const WIN_INFLIGHT = line('const WINDOW_INFLIGHT =');
const MAX_WINDOWS = line('let MAX_WINDOWS =');
const RANGEY = line('const RANGEY =');
const ERRTEXT = block('const errText = e =>', ".join(' · ');\n");
const STATED_FLOOR = block('const statedFloor = text =>', '\n};\n');
const WINDOW1 = block('function window1(address, topics, a, b, prov) {');
const LOGS = block('async function logs(address, topics, fromBlock, toBlock, prov) {');
/* The two expressions the seam is made of, lifted rather than restated: the top block of the older
   walk, and the join that puts the halves together. */
const TO = line('  const to = (DS.h.partial != null');
const JOIN = line('  const join = (older_, newer_) =>');

/** A walk over an endpoint that answers exactly one log per block in whatever range it is asked for,
 *  and records every span it served. Two of these stand in for the two providers. */
function walker(tag) {
  const served = [];
  const src = `
    const fetch = async (url, init) => {
      const p = JSON.parse(init.body).params[0];
      const a = parseInt(p.fromBlock, 16), b = parseInt(p.toBlock, 16);
      SERVED.push([a, b]);
      const out = [];
      for (let n = a; n <= b; n++) out.push({ blockNumber: '0x' + n.toString(16), logIndex: '0x0', topics: ['0xaa'], data: '0x', by: TAG });
      return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1, result: out }) };
    };
    const prov = { request: async ({ params }) => {
      const r = await fetch('http://x', { body: JSON.stringify({ params }) });
      const j = await r.json();
      return j.result;
    } };
    ${WIN_START}
    ${WIN_INFLIGHT}
    ${MAX_WINDOWS}
    ${RANGEY}
    ${ERRTEXT}
    ${STATED_FLOOR}
    const head = async () => { throw new Error('the seam never asks for the head: both ranges are given'); };
    ${WINDOW1}
    ${LOGS}
    return (from, to) => logs('0xabc', [['0xaa']], from, to, prov);
  `;
  return { run: new Function('Model', 'SERVED', 'TAG', src)(Model, served, tag), served };
}

const topOf = h => new Function('DS', `${TO}\nreturn to;`)({ h });
const joiner = new Function(`${JOIN}\nreturn join;`)();

/** Every block each half reported, and the blocks the two were asked to cover between them. */
function seam({ own, floor, hi, partial }) {
  const page = walker('page');
  const wallet = walker('wallet');
  return (async () => {
    /* The first read: the day, through the page's provider. `partial` lets a first read that stopped
       short be driven too, since that is the ordinary case on a narrow endpoint. */
    const first = await page.run(partial != null ? partial : floor, hi);
    /* What `older()` does between the two reads, with nothing of mine in between. */
    const to = topOf({ partial: first.partial != null ? first.partial : partial, from: floor });
    const older = await wallet.run(own, to);
    const both = joiner(older, first);
    const blocks = both.logs.map(l => Number(BigInt(l.blockNumber)));
    return { to, first, older, blocks, want: Array.from({ length: hi - own + 1 }, (_, i) => own + i) };
  })();
}

test('the two reads meet at one block: nothing twice, nothing missing', async () => {
  const hi = 1_000_000, floor = hi - 20, own = hi - 60;      // a day of 21 blocks, 41 more below it
  const s = await seam({ own, floor, hi });

  assert.equal(s.to, floor - 1, 'the older walk stops one block below the floor the first read used');
  assert.deepEqual([...s.blocks].sort((a, b) => a - b), s.want,
    'the union of the two reads must be exactly the blocks they were asked to cover, each once');
  assert.equal(new Set(s.blocks).size, s.blocks.length, 'no block is reported by both halves');
});

test('and when the first read stopped short, the seam is its boundary', async () => {
  const hi = 1_000_000, floor = hi - 60, own = hi - 100, partial = hi - 20;
  const s = await seam({ own, floor, hi, partial });

  assert.equal(s.to, partial - 1, 'a boundary hands over its own block, not the floor');
  assert.deepEqual([...s.blocks].sort((a, b) => a - b), s.want);
  assert.equal(new Set(s.blocks).size, s.blocks.length);
});

test('the halves really did come from different providers, or this proves nothing', async () => {
  /* Each stub stamps its logs. If both halves carried the same tag the ranges could overlap without
     the union noticing, and an assertion over one provider's output would say nothing about a seam
     between two. */
  const hi = 1_000_000, floor = hi - 20, own = hi - 60;
  const s = await seam({ own, floor, hi });
  const by = new Set(s.older.logs.concat(s.first.logs).map(l => l.by));

  assert.deepEqual([...by].sort(), ['page', 'wallet']);
  assert.ok(s.first.logs.every(l => l.by === 'page'), 'the day came from the page');
  assert.ok(s.older.logs.every(l => l.by === 'wallet'), 'and what is below it from the wallet');
});

test('the older half goes in front, so the newest row is still the newest', async () => {
  /* `histOf` sorts afterwards, but the join's order is what a reader of the raw lists sees, and the
     page relies on it for the boundary and the wall that travel with the older half. */
  const hi = 1_000_000, floor = hi - 20, own = hi - 60;
  const s = await seam({ own, floor, hi });

  assert.equal(s.blocks[0], own, 'the first entry of the joined list is the oldest block read');
  assert.equal(s.blocks[s.blocks.length - 1], hi, 'and the last is the head');
});
