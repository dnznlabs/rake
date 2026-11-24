/* Who is asked for a receipt, and what the page says when the answer is slow (#403).

   The receipt moved to the page's own provider with everything else, for a reason that is about the
   paint rather than the rule: the repaint after a landed write reads the new state through our
   provider, so a wallet telling us "landed" a block before ours had it would put the **old** balance
   under a success line.

   But it is the one read whose subject the wallet created. Our endpoints are pooled hostnames whose
   backends disagree by a block — the race that once answered `null` for a block that existed and took
   the whole history down — so our provider can legitimately not have a receipt that exists. Hence the
   architect's one named exception: at the deadline, and only there, ask the wallet once. If it has the
   receipt the write landed, and printing "no receipt after 120s" would be false.

   Four states, and the wording is the subject of two of them: a reader who is told a transaction
   timed out when it landed will send it again.
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

const WAIT = block('async function waitReceipt(hash, ms) {');
const RECEIPT = { status: '0x1', blockNumber: '0x2a' };

/** `waitReceipt` over two endpoints, each scripted.
 *
 *  `ourAnswers` is consulted once per poll: `null` means "not yet", a thrown value means the endpoint
 *  refused (a throttle), and the receipt means it has it. `walletHas` is what the wallet would answer
 *  at the deadline. `sameProvider` collapses the two into one object, which is the no-wallet case.
 */
function poll({ ourAnswers = [], walletHas = null, sameProvider = false, ms = 60 } = {}) {
  const asked = { ours: 0, wallet: 0 };
  const src = `
    const sleep = m => new Promise(r => setTimeout(r, Math.min(m, 2)));
    const ours = {
      request: async () => {
        const step = OUR[Math.min(ASKED.ours, OUR.length - 1)];
        ASKED.ours++;
        if (step === 'throttle') throw { message: 'the RPC endpoint answered HTTP 429', data: { httpStatus: 429 } };
        return step === 'null' ? null : RECEIPT;
      },
    };
    const wallet = {
      request: async () => { ASKED.wallet++; return WALLET_HAS ? RECEIPT : null; },
    };
    const pageRead = () => ours;
    const P = SAME ? ours : wallet;
    ${WAIT}
    return { waitReceipt, lagged: () => POLL_LAGGED, err: () => POLL_ERR };
  `;
  const m = new Function('OUR', 'WALLET_HAS', 'SAME', 'ASKED', 'RECEIPT', src)(
    ourAnswers.length ? ourAnswers : ['null'], walletHas, sameProvider, asked, RECEIPT);
  return { ...m, asked, run: () => m.waitReceipt('0xabc', ms) };
}

test('a receipt our endpoint answers null for at first still resolves, and the wallet is never asked', async () => {
  /* The pooled-backend case: one backend has the block, another does not, for a poll or two. */
  const p = poll({ ourAnswers: ['null', 'null', 'null', 'receipt'], walletHas: true });

  const rc = await p.run();

  assert.equal(rc, RECEIPT, 'three empty answers are not a failure, they are a slow block');
  assert.ok(p.asked.ours >= 4, `it kept polling: ${p.asked.ours} asks`);
  assert.equal(p.asked.wallet, 0, 'our own endpoint answered, so there was nothing to ask the wallet');
  assert.equal(p.lagged(), false, 'and nothing to explain to the reader');
});

test('a throttled poll does not time out on a transaction that landed', async () => {
  /* The failure this exception exists for: our endpoint refuses for the whole deadline — up to eighty
     requests a write now reach it — while the transaction is on chain and the wallet's endpoint has
     the receipt. Printing "no receipt" here would tell a reader to send it again. */
  const p = poll({ ourAnswers: ['throttle'], walletHas: true });

  const rc = await p.run();

  assert.equal(rc, RECEIPT, 'the write landed; our reader was the thing that failed');
  assert.equal(p.asked.wallet, 1, 'the wallet is asked exactly once, at the deadline');
  assert.equal(p.lagged(), true, 'and the caller is told which endpoint found it');
  assert.ok(p.err(), 'the refusal is still recorded rather than swallowed');
});

test('when neither has it, it is a deadline and says so', async () => {
  const p = poll({ ourAnswers: ['null'], walletHas: false });

  const rc = await p.run();

  assert.equal(rc, null, 'no receipt anywhere is the one case the timeout wording is for');
  assert.equal(p.asked.wallet, 1, 'the wallet was asked before that wording was earned');
  assert.equal(p.lagged(), false);
});

test('with no wallet there is no second endpoint, so nothing is asked twice', async () => {
  const p = poll({ ourAnswers: ['null'], sameProvider: true });

  await p.run();

  /* `P !== pageRead()` is the whole test in the page: with no wallet they are one object, and asking
     it again at the deadline would be a request that cannot tell us anything new. */
  assert.equal(p.asked.wallet, 0);
});

test('the page says both facts when only the wallet had it', () => {
  /* The sentence, lifted. "Landed" alone would claim a block this page cannot yet read state at; the
     timeout wording would be false. The reader is told the write landed **and** why the page still
     shows what it shows. */
  const line = SHIPPED.slice(SHIPPED.indexOf('if (POLL_LAGGED) {'), SHIPPED.indexOf('return { ok: true, hash, receipt: rc, lagged: true };'));
  assert.match(line, /landed in block/);
  assert.match(line, /has not caught up/);
  assert.match(line, /'warn'/, 'it is not a plain success: the page is behind the chain it just wrote to');
});
