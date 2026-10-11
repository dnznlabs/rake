/* The pure half of the dapp. `decodePending` is asserted against the cast-written fixtures under
   test/fixtures/abi/, so the calldata it decodes is the calldata the chain carries. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';
import Model from '../app/src/model.js';

/* model.js reads an ambient `Eth`, the way it does inside the bundle. Nothing at its module scope
   touches it, so assigning here — after the import — is in time for every call below. */
globalThis.Eth = Eth;

const { SNAPSHOT_T, pct, countdown, decodePending, supersededBy, salt } = Model;
const FUNCTIONS = ['countdown', 'decodePending', 'pct', 'salt', 'supersededBy'];

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/abi');
const fixture = name => {
  const hex = readFileSync(join(dir, `${name}.hex`), 'utf8').trim();
  assert.match(hex, /^0x[0-9a-f]{8,}$/, `${name}.hex is not calldata — regenerate it`);
  return hex;
};
const row = (account, bps) => [account, bps, 'r', ''];
const OPS = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const TREASURY = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const OWNER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

test('the module exports exactly the functions this file imports', () => {
  const exported = Object.keys(Model).filter(k => typeof Model[k] === 'function').sort();

  assert.deepEqual(exported, FUNCTIONS);
  assert.equal(typeof SNAPSHOT_T, 'string');
});

test('pct drops trailing zeros and keeps the hundredths that matter', () => {
  const got = [10000, 6000, 4000, 3333, 3334, 3330, 500, 1, 0].map(pct);

  assert.deepEqual(got, ['100%', '60%', '40%', '33.33%', '33.34%', '33.3%', '5%', '0.01%', '0%']);
});

test('pct reads the BigInt a decoded table carries', () => {
  const got = pct(6000n);

  assert.equal(got, '60%');
});

test('countdown counts down in seconds and stops at ready', () => {
  const now = 1760000000;

  const got = [
    countdown(now + 3 * 86400 + 14 * 3600, now),
    countdown(now + 5 * 3600 + 2 * 60, now),
    countdown(now + 90, now),
    countdown(now + 30, now),
    countdown(now, now),
    countdown(now - 1, now),
  ];

  assert.deepEqual(got, ['3d 14h', '5h 2m', '1m', 'under a minute', 'ready to apply', 'ready to apply']);
});

test('decodePending names the setter a queued setBeneficiaries calls', () => {
  const action = fixture('setBeneficiaries.calldata');

  const got = decodePending(action);

  assert.equal(got.kind, 'setBeneficiaries');
  assert.deepEqual(got.table, [[OPS, 7000n, 'ops', 'operations'], [TREASURY, 3000n, 'treasury', '']]);
});

test('decodePending decodes the other three setters to their one field', () => {
  const got = [
    decodePending(fixture('setDescription.calldata')),
    decodePending(fixture('setDelay.calldata')),
    decodePending(fixture('renounce.calldata')),
  ];

  assert.deepEqual(got, [
    { kind: 'setDescription', description: 'DNZN fees, revised' },
    { kind: 'setDelay', delay: 172800n },
    { kind: 'transferOwnership', owner: '0x' + '0'.repeat(40) },
  ]);
});

test('four bytes of garbage decode to their selector, not to a setter', () => {
  const got = decodePending('0xdeadbeef');

  assert.deepEqual(got, { kind: 'unknown', selector: '0xdeadbeef' });
});

test('a call that is not a setter is unknown even when it is this ABI', () => {
  const action = Eth.enc('propose(bytes)', [fixture('setBeneficiaries.calldata')]);

  const got = decodePending(action);

  assert.deepEqual(got, { kind: 'unknown', selector: action.slice(0, 10) });
});

test('supersededBy answers only for a single row at 100%', () => {
  const got = [
    supersededBy([row(OPS, 10000n)]),
    supersededBy([row(OPS, 6000n), row(TREASURY, 4000n)]),
    supersededBy([row(OPS, 10000n), row(TREASURY, 0n)]),
    supersededBy([row(OPS, 9999n)]),
  ];

  assert.deepEqual(got, [OPS, null, null, null]);
});

test('salt puts the sender in the top 20 bytes and the counter in the low 12', () => {
  const sender = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  const got = salt(sender, 1);

  assert.equal(got, '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001');
  assert.equal(got.length, 66);
  assert.equal(salt(sender, 255).slice(-24), '0000000000000000000000ff');
});

test('SNAPSHOT_T decodes a real snapshot() return', () => {
  const [snap] = Eth.dec([SNAPSHOT_T], fixture('snapshot.return'));

  const [owner, delay, nonce, description, table, pending] = snap;

  assert.equal(owner, OWNER);
  assert.equal(delay, 604800n);
  assert.equal(nonce, 1n);
  assert.equal(description, 'DNZN fees');
  assert.equal(table.length, 2);
  assert.equal(decodePending(pending[0][2]).kind, 'setBeneficiaries');
});
