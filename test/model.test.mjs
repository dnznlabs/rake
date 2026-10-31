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

const { SNAPSHOT_T, pct, countdown, decodePending, ownerChange, supersededBy, salt } = Model;
const { revertMessage, tableFrom, parseDelay, wei, namehash } = Model;
const FUNCTIONS = ['countdown', 'decodePending', 'namehash', 'ownerChange', 'parseDelay', 'pct', 'revertMessage', 'salt', 'supersededBy', 'tableFrom', 'wei'];
const SET_BENEFICIARIES = 'setBeneficiaries((address,uint96,string,string)[])';

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
  /* The same enumeration from the other side, so a helper added to the file and left unexported
     fails here rather than shipping untested: `grep -c 'function ' app/src/model.js`. */
  const declared = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../app/src/model.js'), 'utf8')
    .match(/function /g).length;

  assert.deepEqual(exported, FUNCTIONS);
  assert.equal(declared, FUNCTIONS.length);
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

/* Decision 21 gave the one `transferOwnership(address)` call three effects, and the detail page's
   pending line reads them apart from the decode alone: a queued call naming the current owner is a
   withdrawal of the nomination in flight, which under one-step ownership could not exist. The
   renounce arm is the zero address the test above decodes. */
test('a queued transferOwnership naming the owner reads as a withdrawal, not a nomination', () => {
  const queued = decodePending(Eth.enc('transferOwnership(address)', [OWNER]));

  const got = [
    ownerChange(queued, OWNER),
    ownerChange(queued, TREASURY),
    ownerChange(queued),
    ownerChange(decodePending(fixture('renounce.calldata')), OWNER),
  ];

  assert.equal(queued.owner, OWNER);
  // The owner of the moment is not in a `Queued` log, so a reading without one says what the call does.
  assert.deepEqual(got, ['withdraw', 'nominate', 'nominate', 'renounce']);
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

/* The nine selectors, each beside the `cast sig` that produced it and the line of
   `src/Distribution.sol` that declares it — every annotation re-read on this revision rather than
   carried over. `test/fixtures/abi/selectors.txt` carries function selectors only, so the errors are
   held against the contract instead — see the handoff. `ReleaseFailed` takes an argument, so its
   padded token rides behind the selector here; the message deliberately does not name it. */
test('revertMessage names every custom error the write screens can provoke', () => {
  const TOKEN = '0x' + 'e'.repeat(40);
  const got = [
    revertMessage('0x30cd7471'),  // cast sig "NotOwner()"              · Distribution.sol:45
    revertMessage('0x40da0647'),  // cast sig "BadTable()"              · Distribution.sol:46
    revertMessage('0x5c52a868'),  // cast sig "NothingToDo()"           · Distribution.sol:48
    revertMessage('0x0f2e5b6c'),  // cast sig "Locked()"                · Distribution.sol:49
    revertMessage('0x82b42900'),  // cast sig "Unauthorized()"          · Distribution.sol:50
    revertMessage('0xca0b64e5' + Eth.pad(TOKEN)),  // cast sig "ReleaseFailed(address)" · Distribution.sol:51
    revertMessage('0x30116425'),  // cast sig "DeploymentFailed()"      · Distribution.sol:342
    revertMessage('0x0c4549ef'),  // cast sig "SaltDoesNotStartWith()"  · Distribution.sol:343
  ];

  assert.deepEqual(got, [
    'only the owner can do that',
    'the table must total 100%, every share above zero, ascending by address',
    'nothing to do — there is nothing waiting here',
    'locked — another call on this contract is still running',
    'this contract will not take that call from this account',
    'retry failed — the token gave no reason',
    'a distribution already exists at that address',
    'that salt belongs to another wallet',
  ]);
});

/* `applyQueued` reverts `NotReady(eta)` for two different things — `eta == 0` is an entry that is not
   queued at all, which is what a stale page clicking a change someone else already applied gets. */
test('NotReady carries its eta as the countdown, not as the raw error', () => {
  const now = 1760000000;
  // cast sig "NotReady(uint256)" · Distribution.sol:47 — the eta is its one argument.
  const got = [
    revertMessage('0x5a997526' + Eth.pad(now + 3 * 86400 + 14 * 3600), now),
    revertMessage('0x5a997526' + Eth.pad(now + 90), now),
    revertMessage('0x5a997526' + Eth.pad(0), now),
  ];

  assert.deepEqual(got, [
    'the delay has not passed — 3d 14h',
    'the delay has not passed — 1m',
    'that change is not queued here — it has already been applied or cancelled',
  ]);
});

test('a bare 32-byte word is a balanceOf revert bubbled raw, and reads as the token refusing', () => {
  /* #20: `_balance` bubbles whatever `balanceOf` reverted with and guards nothing
     (`src/Distribution.sol:308-313`), so one bare word with no selector in front of it still reaches
     here through `distribute`. `release` no longer takes this path — it reverts `ReleaseFailed(token)`,
     asserted above. */
  const got = [
    revertMessage('0x' + '0'.repeat(64)),
    revertMessage('0x' + '0'.repeat(63) + '1'),
  ];

  assert.deepEqual(got, ['the token refused the call', 'the token refused the call']);
});

test('revertMessage says reverted when there are no bytes to read', () => {
  const got = [revertMessage('0x'), revertMessage(''), revertMessage(null), revertMessage(undefined)];

  assert.deepEqual(got, ['reverted', 'reverted', 'reverted', 'reverted']);
});

test('an error this build does not know keeps its four bytes', () => {
  const got = revertMessage('0xdeadbeef' + Eth.pad(7));

  assert.equal(got, 'reverted (0xdeadbeef)');
});

test('tableFrom converts percent to bps and sorts ascending by address', () => {
  const rows = [
    { name: 'treasury', note: '', addr: TREASURY, pct: '30' },
    { name: 'ops', note: 'operations', addr: OPS, pct: '70' },
  ];

  const got = tableFrom(rows);

  assert.deepEqual(got, [[OPS, 7000, 'ops', 'operations'], [TREASURY, 3000, 'treasury', '']]);
  assert.deepEqual(tableFrom([{ name: 'a', note: '', addr: OPS, pct: '33.33' }])[0][1], 3333);
});

/* Step 3's round trip, against the cast-written fixture rather than against this encoder: the editor's
   rows, encoded, are byte-for-byte the calldata the chain carries for the seed's queued change. */
test('the editor round-trips through setBeneficiaries calldata', () => {
  const rows = [
    { name: 'treasury', note: '', addr: TREASURY, pct: '30' },
    { name: 'ops', note: 'operations', addr: OPS, pct: '70' },
  ];

  const calldata = Eth.enc(SET_BENEFICIARIES, [tableFrom(rows)]);

  assert.equal(calldata, fixture('setBeneficiaries.calldata'));
  assert.deepEqual(decodePending(calldata), {
    kind: 'setBeneficiaries',
    table: [[OPS, 7000n, 'ops', 'operations'], [TREASURY, 3000n, 'treasury', '']],
  });
});

test('parseDelay takes the delay the field offers, and refuses the rest', () => {
  const got = ['7d', '48h', '0', '30m', '3600', '90s', ' 7d ', '7D', '', 'soon', '7w', '-1', '1.5d'].map(parseDelay);

  assert.deepEqual(got, [604800, 172800, 0, 1800, 3600, 90, 604800, 604800, null, null, null, null, null]);
});

test('wei reads a decimal deposit, and an empty field is no deposit', () => {
  const got = ['1', '0.5', '', '0', '1.000000000000000001', '0.1 ', 'lots', '.5', '1.'].map(wei);

  assert.deepEqual(got, [10n ** 18n, 5n * 10n ** 17n, 0n, 0n, 10n ** 18n + 1n, 10n ** 17n, null, null, null]);
});

/* EIP-137's own worked example. Derived independently with cast on 2026-10-11:
   cast keccak "0x<32 zero bytes><cast keccak eth>" and then the same with `foo`. */
test('namehash matches the two vectors EIP-137 works through', () => {
  const got = [namehash(''), namehash('eth'), namehash('foo.eth')];

  assert.deepEqual(got, [
    '0x' + '0'.repeat(64),
    '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
    '0xde9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f',
  ]);
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
