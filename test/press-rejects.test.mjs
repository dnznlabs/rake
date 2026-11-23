/* What `load older` does when the read it starts fails (#400, the architect's review).

   The press is the one read that goes through the wallet's endpoint, and on a throttling endpoint it
   is the one most likely to fail. Two failures have to be survivable, and they are not the same:

     the walk itself      `histLogs` rejects — covered since the press was built
     the repaint after it `absorb` rejects, because it re-reads the token decimals, the symbols and
                          then the funds from **state** through `call()`, which is the wallet's
                          provider when one is connected. On an endpoint the press has just sent
                          seventy log queries to, a state read comes back `HTTP 429`.

   The second one was rejecting out of a click handler, where nothing was waiting for it: an
   `unhandledrejection` carrying `{"message":"HTTP 429","data":{"httpStatus":429}}`, seen in one run
   of three by me and in one of one by the architect. A page error on the path a PR adds is not a
   detail, and `older()` is where it is caught, because the handler is the only place that knows the
   press should come back.

   `older()` is lifted whole. What is asserted is that the promise it returns does **not** reject —
   which is the defect exactly — and that the press is restored with the failure wording.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = readFileSync(join(root, 'app/src/index.html'), 'utf8');
const SHIPPED = PAGE.replace(/\/\*DEV\*\/[\s\S]*?\/\*DEV\*\//g, '');

const block = (anchor, end = '\n}\n', from = SHIPPED) => {
  const at = from.indexOf(anchor);
  assert.ok(at >= 0, `app/src/index.html no longer declares \`${anchor}\` — this test lifts it`);
  const to = from.indexOf(end, at);
  assert.ok(to > at, `\`${anchor}\` is no longer closed by ${JSON.stringify(end)}`);
  return from.slice(at, to + end.length);
};

const OLDER = block('async function older() {');

/** One press, with the two things it can fail at made to fail on demand.
 *
 *  Everything `older()` reaches is supplied: the buttons it disables and restores, the two reads, and
 *  `absorb`, which stands in for the whole repaint. `histOf` is the page's own shape-shuffler and is
 *  not what this test is about, so it is the identity.
 */
function press({ failWalk = false, failPaint = false } = {}) {
  const buttons = [{ disabled: false, textContent: 'load older' }, { disabled: false, textContent: 'load older' }];
  const calls = { histLogs: 0, absorb: 0 };
  const src = `
    const TOKEN = 1;
    const stale = () => false;
    const V = { querySelectorAll: () => BUTTONS };
    const CFG = { factoryBlock: '1000' };
    const FIRST = new Map();
    const ownFloor = () => 1000;
    const DS = { d: { addr: '0xabc' }, h: { raw: { changes: { logs: [], partial: null, wall: null }, funds: { logs: [], partial: null, wall: null }, ins: null }, partial: 5000, from: 5000 } };
    let WALLET = true;
    const P = { tag: 'wallet' };
    const pageRead = () => ({ tag: 'page' });
    const histOf = x => x;
    const histLogs = async () => {
      CALLS.histLogs++;
      if (FAIL_WALK) throw { message: 'the RPC endpoint answered HTTP 429', data: { httpStatus: 429 } };
      return { changes: { logs: [], partial: null, wall: null }, funds: { logs: [], partial: null, wall: null }, ins: null };
    };
    /* The repaint. It rejects the way it does on a throttled endpoint: a state read through call(),
       which is the wallet's provider, answering 429. No backticks in this comment. */
    const absorb = async () => {
      CALLS.absorb++;
      if (FAIL_PAINT) throw { message: 'the RPC endpoint answered HTTP 429', data: { httpStatus: 429 } };
    };
    ${OLDER}
    return older;
  `;
  const older = new Function('BUTTONS', 'CALLS', 'FAIL_WALK', 'FAIL_PAINT', src)(buttons, calls, failWalk, failPaint);
  return { older, buttons, calls };
}

test('a press whose walk fails restores the press and rejects nothing', async () => {
  const p = press({ failWalk: true });

  await assert.doesNotReject(() => p.older(),
    'older() is called from a click handler, so a rejection it lets through is an uncaught page error');

  assert.equal(p.calls.histLogs, 1);
  assert.equal(p.calls.absorb, 0, 'nothing was read, so nothing is repainted');
  for (const b of p.buttons) {
    assert.equal(b.disabled, false, 'the press comes back: asking the same endpoint again may work');
    assert.match(b.textContent, /that read failed, try again/);
  }
});

test('a press whose repaint fails rejects nothing either — the HTTP 429 of the review', async () => {
  /* The defect. `absorb` re-reads the decimals, the symbols and the funds from state through the
     wallet's provider, right after the press has flooded that endpoint with log queries. */
  const p = press({ failPaint: true });

  await assert.doesNotReject(() => p.older(),
    'this is the unhandledrejection the driver reported as `Object`: {"message":"HTTP 429"}');

  assert.equal(p.calls.histLogs, 1, 'the walk ran');
  assert.equal(p.calls.absorb, 1, 'and the repaint was attempted');
  for (const b of p.buttons) {
    assert.equal(b.disabled, false);
    assert.match(b.textContent, /that read failed, try again/,
      'a failed repaint says so in the same words as a failed walk: one failure, one wording');
  }
});

test('a press that works leaves the press alone for the repaint to settle', async () => {
  /* The other half, or both tests above would pass on a press that always printed its failure line. */
  const p = press();

  await assert.doesNotReject(() => p.older());

  assert.equal(p.calls.absorb, 1);
  for (const b of p.buttons) {
    assert.doesNotMatch(b.textContent, /that read failed/,
      'nothing failed, so nothing says it did; what the press becomes is the next paint\'s business');
  }
});

test('the press disables its buttons while it runs, so one press spends one budget', async () => {
  /* Lifted from the same function and asserted here because it is the only thing that stops a second
     press spending another forty windows on the blocks the first one is already reading. */
  assert.match(OLDER, /b\.disabled = true; b\.textContent = 'loading older…'/,
    'older() must disable the press while it runs');
});
