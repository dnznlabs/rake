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

const { SNAPSHOT_T, pct, countdown, deadline, dateText, decodePending, ownerChange, ownerKind, supersededBy, salt } = Model;
const { revertMessage, tableFrom, parseDelay, wei, namehash } = Model;
const { windows, rangeCap, isPruned } = Model;
const FUNCTIONS = ['countdown', 'dateText', 'deadline', 'decodePending', 'isPruned', 'namehash', 'ownerChange', 'ownerKind', 'parseDelay', 'pct', 'rangeCap', 'revertMessage', 'salt', 'supersededBy', 'tableFrom', 'wei', 'windows'];
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
const ZERO = '0x' + '0'.repeat(40);

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

/* The third argument, which is `GRACE` as the page read it. The boundary is the contract's:
   `applyQueued` refuses only `block.timestamp > eta + GRACE` (`src/Distribution.sol:249`), so
   `eta + grace` exactly is still applicable and the first expired second is the one after it. */
test('countdown reads the far end of the window when it is given a grace', () => {
  const eta = 1760000000, GRACE = 14 * 86400;

  const got = [
    // The delay still running, with a grace that has nothing to say yet.
    countdown(eta + 3 * 86400, eta, GRACE),
    // Inside the window: matured, and a day short of the far end.
    countdown(eta, eta + 86400, GRACE),
    // The far end exactly, which the contract still applies at.
    countdown(eta, eta + GRACE, GRACE),
    // One second past it, which it does not.
    countdown(eta, eta + GRACE + 1, GRACE),
    // Two arguments is every other caller on the page, and none of them may start reading `expired`.
    countdown(eta, eta + GRACE + 1),
  ];

  assert.deepEqual(got, ['3d 0h', 'ready to apply', 'ready to apply', 'expired', 'ready to apply']);
});

test('deadline is the eta plus the grace, as a BigInt', () => {
  assert.equal(deadline(1760000000n, 1209600n), 1761209600n);
  // Both arrive off the chain, and `eta` through `Eth.dec` is already a BigInt while a literal is not.
  assert.equal(deadline(1760000000, 1209600), 1761209600n);
});

/* One date format on the page, and it is UTC: a block timestamp carries no zone, and `toLocaleString`
   would make the same document read differently on every machine that opened it. */
test('dateText prints a chain timestamp as a UTC minute', () => {
  assert.equal(dateText(1761209600n), '2025-10-23 08:53 UTC');
  assert.equal(dateText(1761209600), '2025-10-23 08:53 UTC');
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

/* The create screen's owner guard (decision 43, #172). The probes below are `probeOwner`'s own three
   answers verbatim (`app/src/index.html:1358-1361`), since what `ownerKind` does to them is prefix
   one and read the class off it — a paraphrase here would pass while the screen showed something
   else. */
const CONTRACT = { text: 'a contract — it will have to propose and cancel through its own calls', cls: '' };
const ACCOUNT = { text: 'an account · 3 transactions on Sepolia', cls: '' };
const NEVER = { text: 'has never sent a transaction on Sepolia — make sure someone holds its key', cls: 'warn' };

test('the connected wallet in the owner field is the default, and says nothing at all', () => {
  const got = [
    ownerKind(OWNER, OWNER, null),
    // The field holds what the user typed, and a wallet names itself in whichever case it likes.
    ownerKind(OWNER, OWNER.toLowerCase(), NEVER),
  ];

  assert.deepEqual(got, [{ text: '', cls: '', ack: false }, { text: '', cls: '', ack: false }]);
});

test('the zero owner is the permanent one, and is acknowledged rather than refused', () => {
  const got = ownerKind(ZERO, OWNER, null);

  /* `create` accepts it (decision 43) and the clone is born renounced, so the screen's job is to say
     what that costs — not to turn it away, which is the whole point of the ruling. */
  assert.deepEqual(got, {
    text: 'no owner: nobody can ever change the table, delay or description; this is permanent',
    cls: 'bad',
    ack: true,
  });
});

test('another address carries the probe\'s own sentence, prefixed with whose wallet it is not', () => {
  const got = [ownerKind(TREASURY, OWNER, CONTRACT), ownerKind(TREASURY, OWNER, ACCOUNT)];

  // A contract and an account with a history are both legitimate owners: the line is shown and Next
  // stays live, so neither carries `ack`.
  assert.deepEqual(got, [
    { text: `not the connected wallet — ${CONTRACT.text}`, cls: '', ack: false },
    { text: `not the connected wallet — ${ACCOUNT.text}`, cls: '', ack: false },
  ]);
});

test('an address that has never been used is the one probe that must be acknowledged', () => {
  const got = ownerKind(TREASURY, OWNER, NEVER);

  /* Amber rather than refused, for the reason `probeOwner` gives: a fresh key looks exactly like a
     typo. The acknowledgement is what separates the two, and it is the probe's own class that asks
     for it — so a read that could not be made (`warn` too) is held the same way, deliberately. */
  assert.deepEqual(got, { text: `not the connected wallet — ${NEVER.text}`, cls: 'warn', ack: true });
});

test('a probe still in flight holds Next without a checkbox to draw', () => {
  const got = ownerKind(TREASURY, OWNER, null);

  /* `ack` without a class: the screen renders a checkbox only for a classed reading, so Next is held
     for the instant before the answer lands without a box flashing in and out of the step. */
  assert.deepEqual(got, { text: 'not the connected wallet — reading the address…', cls: '', ack: true });
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

/* The ten selectors, each beside the `cast sig` that produced it and the line of
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
    /* cast sig "Expired(uint256)" · Distribution.sol:54 — its argument is the eta, so the date the
       message prints is `eta + GRACE`, and the grace is the third argument rather than a literal. */
    revertMessage('0xf80dbaea' + Eth.pad(1760000000), undefined, 1209600),
    /* #148: the same revert decoded before the boot read has filled `S.grace` (`index.html:489` sets
       it `null`, `:510` fills it), which the create flow reaches before `S.loaded`. There is no
       deadline to name there, and `deadline()` threw `Cannot convert null to a BigInt` on it until
       this task, so the sentence drops its date clause rather than the whole message. */
    revertMessage('0xf80dbaea' + Eth.pad(1760000000), undefined, null),
    revertMessage('0xf80dbaea' + Eth.pad(1760000000), undefined, undefined),
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
    'that change expired — it could be applied until 2025-10-23 08:53 UTC and anyone may cancel it now',
    'that change expired — anyone may cancel it now',
    'that change expired — anyone may cancel it now',
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

/* ---- log windows (#76) ------------------------------------------------------------------------
   The three helpers the windowed `logs()` is built on. The provider strings below are verbatim from
   the architect's 2026-11-07 measurement against the live endpoints, which is the whole point of
   pinning them here: a provider that rewords its refusal breaks the cap read, and this is where that
   shows up rather than in a browser against a week-old distribution. */

test('windows cuts a range into inclusive windows that tile it exactly', () => {
  const got = windows(100, 350, 100);

  assert.deepEqual(got, [[100, 199], [200, 299], [300, 350]]);
});

test('windows leaves no gap and no overlap at a window boundary', () => {
  const got = windows(1000, 1199, 100);

  /* 1099 → 1100 with nothing between and nothing twice: an `eth_getLogs` range is inclusive at both
     ends, so an off-by-one here drops or double-counts a whole block of history. */
  assert.deepEqual(got, [[1000, 1099], [1100, 1199]]);
});

test('windows covers every block in the range exactly once', () => {
  const seen = [];
  for (const [a, b] of windows(7, 43, 5)) for (let n = a; n <= b; n++) seen.push(n);

  assert.deepEqual(seen, Array.from({ length: 37 }, (_, i) => i + 7));
});

test('windows gives one window to a range smaller than the window', () => {
  assert.deepEqual(windows(0, 9, 10), [[0, 9]]);
  assert.deepEqual(windows(500, 500, 10_000), [[500, 500]]);
});

test('windows reads the hex a block number arrives as', () => {
  /* `CFG.factoryBlock` is a build token substituted as hex, and `log.blockNumber` is hex off the
     wire, so neither caller has a decimal to pass. */
  assert.deepEqual(windows('0x10', '0x1f', 8), [[16, 23], [24, 31]]);
});

test('windows answers an empty list where there is no range to scan', () => {
  assert.deepEqual(windows(5, 4, 10), []);
  assert.deepEqual(windows(100, 100, 0), []);
});

test('rangeCap reads the window out of the two refusals that name one', () => {
  const got = [
    rangeCap('-32701 exceed maximum block range: 50000'),      // ethereum-sepolia-rpc.publicnode.com
    rangeCap('-32614 eth_getLogs is limited to a 200 range'),   // sepolia.base.org, under an HTTP 413
    rangeCap('4444 pruned history unavailable'),                // ethereum-sepolia.publicnode.com
    rangeCap('header not found'),                              // not about the range at all
  ];

  /* The pruned refusal is deliberately `null`: it is about which blocks the provider keeps, not how
     many were asked for, so halving the window would retry forever. `isPruned` answers that one. */
  assert.deepEqual(got, [50_000, 200, null, null]);
});

test('rangeCap survives the wrapping a wallet puts around a provider error', () => {
  const got = rangeCap('Internal JSON-RPC error: {"code":-32701,"message":"exceed maximum block range: 50000"}');

  assert.equal(got, 50_000);
});

test('rangeCap answers null rather than a number for an error with no window in it', () => {
  const got = ['', null, undefined, 'reverted', 'rate limit exceeded', 'Failed to fetch'].map(rangeCap);

  assert.deepEqual(got, [null, null, null, null, null, null]);
});

test('isPruned tells a provider that dropped the blocks from one that refused the count', () => {
  const got = [
    isPruned('4444 pruned history unavailable'),
    isPruned('-32701 exceed maximum block range: 50000'),
    isPruned('header not found'),
    isPruned(null),
  ];

  assert.deepEqual(got, [true, false, false, false]);
});
