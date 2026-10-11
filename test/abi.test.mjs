/* The codec against cast. Every expected byte string in here comes from test/fixtures/abi/, which
   tools/abi-vectors.sh writes with `cast abi-encode`, `cast calldata` and `cast sig` — so these are
   assertions against an oracle, not against Eth itself. Fixtures are never hand-edited: change a
   case in the script and regenerate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Eth from '../app/src/eth.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/abi');

/* A fixture that is missing, empty or not a whole number of words would make every comparison
   below pass vacuously, which is the one way an oracle test can lie. */
function fixture(name) {
  const hex = readFileSync(join(dir, `${name}.hex`), 'utf8').trim();
  assert.match(hex, /^0x[0-9a-f]+$/, `${name}.hex is not lowercase hex — regenerate it`);
  assert.ok(hex.length > 2, `${name}.hex is empty`);
  return hex;
}
const body = name => fixture(name).slice(2);
/* Calldata is a 4-byte selector then whole words; a bare argument encoding is whole words. */
const args = name => { const h = body(name); assert.equal(h.length % 64, 0); return h; };
const call = name => { const h = body(name); assert.equal((h.length - 8) % 64, 0); return h; };

const BENEFICIARY = '(address,uint96,string,string)';
const CREATE = `create(address,uint32,string,${BENEFICIARY}[],bytes32)`;
const SET_BENEFICIARIES = `setBeneficiaries(${BENEFICIARY}[])`;
const SNAPSHOT = `(address,uint32,uint32,string,${BENEFICIARY}[],(bytes32,uint256,bytes)[])`;

const OWNER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const OPS = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const TREASURY = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const SALT = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001';

const table = (ops, treasury) => [[OPS, ops, 'ops', 'operations'], [TREASURY, treasury, 'treasury', '']];

test('create arguments encode byte-equal to cast', () => {
  const expected = args('create.args');
  const got = Eth.enc(CREATE, [OWNER, 604800, 'DNZN fees', table(6000, 4000), SALT]);
  assert.equal(got.slice(0, 10), '0x' + Eth.sel(CREATE));
  assert.equal(got.slice(10), expected);
});

test('setBeneficiaries calldata is byte-equal to cast', () => {
  assert.equal(Eth.enc(SET_BENEFICIARIES, [table(7000, 3000)]).slice(2), call('setBeneficiaries.calldata'));
});

test('the dynamic-bytes writes are byte-equal to cast', () => {
  const action = fixture('setBeneficiaries.calldata');
  assert.equal(Eth.enc('propose(bytes)', [action]).slice(2), call('propose.calldata'));
  assert.equal(Eth.enc('applyQueued(bytes,uint32)', [action, 1]).slice(2), call('applyQueued.calldata'));
});

test('the static and string setters are byte-equal to cast', () => {
  assert.equal(Eth.enc('setDescription(string)', ['DNZN fees, revised']).slice(2), call('setDescription.calldata'));
  assert.equal(Eth.enc('setDelay(uint32)', [172800]).slice(2), call('setDelay.calldata'));
  const zero = '0x' + '0'.repeat(40);
  assert.equal(Eth.enc('transferOwnership(address)', [zero]).slice(2), call('renounce.calldata'));
});

test('a snapshot() return decodes to its fields', () => {
  const [snap] = Eth.dec([SNAPSHOT], fixture('snapshot.return'));
  const [owner, delay, nonce, description, rows, pending] = snap;
  assert.equal(owner, OWNER);
  assert.equal(delay, 604800n);
  assert.equal(nonce, 1n);
  assert.equal(description, 'DNZN fees');
  assert.deepEqual(rows, [[OPS, 6000n, 'ops', 'operations'], [TREASURY, 4000n, 'treasury', '']]);
  assert.equal(pending.length, 1);
  const [hash, eta, action] = pending[0];
  assert.equal(hash, '0x' + '11'.repeat(32));
  assert.equal(eta, 1760000000n);
  assert.equal(action, fixture('setBeneficiaries.calldata'));
});

test('a pending action decodes through its selector', () => {
  const [snap] = Eth.dec([SNAPSHOT], fixture('snapshot.return'));
  const action = snap[5][0][2];
  const [rows] = Eth.decCall(SET_BENEFICIARIES, action);
  assert.deepEqual(rows, [[OPS, 7000n, 'ops', 'operations'], [TREASURY, 3000n, 'treasury', '']]);
  /* The selector is the whole guard: another setter's calldata is not this call. */
  assert.equal(Eth.decCall('setDelay(uint32)', action), null);
  assert.equal(Eth.decCall(SET_BENEFICIARIES, fixture('setDelay.calldata')), null);
});

test('every selector cast recorded matches Eth.sel', () => {
  const lines = readFileSync(join(dir, 'selectors.txt'), 'utf8').trim().split('\n');
  assert.ok(lines.length >= 17, `selectors.txt has ${lines.length} lines — regenerate it`);
  for (const line of lines) {
    const i = line.lastIndexOf(' ');
    const sig = line.slice(0, i), expected = line.slice(i + 1);
    assert.match(expected, /^0x[0-9a-f]{8}$/, `${sig} has no selector`);
    assert.equal('0x' + Eth.sel(sig), expected, sig);
  }
});

test('enc throws on an argument count mismatch rather than padding', () => {
  assert.throws(() => Eth.enc('setDelay(uint32)', []), /takes 1 arguments, got 0/);
  assert.throws(() => Eth.enc('setDelay(uint32)', [1, 2]), /takes 2 members|takes 1 arguments, got 2/);
  assert.throws(() => Eth.enc(SET_BENEFICIARIES, [table(7000, 3000), 1]), /takes 1 arguments, got 2/);
  /* A short tuple is the same bug one level down. */
  assert.throws(() => Eth.enc(SET_BENEFICIARIES, [[[OPS, 10000, 'ops']]]), /takes 4 members, got 3/);
});

test('every fixture the script writes is covered by a case above', () => {
  const written = readdirSync(dir).filter(f => f.endsWith('.hex')).sort();
  assert.deepEqual(written, [
    'applyQueued.calldata.hex', 'create.args.hex', 'propose.calldata.hex', 'renounce.calldata.hex',
    'setBeneficiaries.calldata.hex', 'setDelay.calldata.hex', 'setDescription.calldata.hex',
    'snapshot.return.hex',
  ]);
});
