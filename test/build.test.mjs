/* The build's refusal to read a broadcast log it would misread (rake#140).

   Like `inline-scripts.test.mjs`, this tests the assertion the build runs rather than running the
   build: `app/build.mjs` calls `assertPairable` before it pairs anything, and what is asserted here
   is that the assertion fires on the shape m03-t06 actually found and stays quiet on the shape every
   deploy script in this repo actually produces. The fixtures are the two-creation log the pairing
   cannot resolve and the one-creation log it can. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPairable, creations, isCreate } from '../app/broadcast.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const tx = (hash, contractName, contractAddress, transactionType = 'CREATE2') =>
  ({ hash, contractName, contractAddress, transactionType });
const receipt = (transactionHash, blockNumber) => ({ transactionHash, blockNumber });

/* One creation, one receipt: the shape `Deploy.s.sol` and `DeployApp.s.sol` write. */
const ONE = {
  transactions: [tx('0xaa', 'DistributionFactory', '0xeda72bb52b76818574d5cd6d7dd1dd695b8ddc7f')],
  receipts: [receipt('0xaa', '0x7b')],
};
/* Two creations in one log: whichever receipt the hash join picks up, there is no way to tell from
   the file which block belongs to which contract — which is exactly rake#140. */
const TWO = {
  transactions: [
    tx('0xaa', 'DistributionFactory', '0x' + '1'.repeat(40)),
    tx('0xbb', 'App', '0x' + '2'.repeat(40)),
  ],
  receipts: [receipt('0xaa', '0x7b'), receipt('0xbb', '0x7c')],
};

test('a two-creation log is refused rather than paired', () => {
  assert.throws(() => assertPairable('broadcast/Both.s.sol/31337/run-latest.json', TWO), err => {
    /* The message has to carry the file and the counts: this throw stops a deploy, and the figure is
       what tells the reader which log and what was wrong with it. */
    assert.match(err.message, /broadcast\/Both\.s\.sol\/31337\/run-latest\.json/);
    assert.match(err.message, /2 creations and 2 receipts for 2 transactions/);
    assert.match(err.message, /rake#140/);
    return true;
  });
});

test('a receipt count that does not match the transactions is refused', () => {
  /* The other half of the pairing's precondition: a log missing a receipt cannot be checked for a
     mispaired one, so a creation block read out of it is a guess. */
  const short = { transactions: ONE.transactions, receipts: [] };

  assert.throws(() => assertPairable('x.json', short), /1 creations and 0 receipts for 1 transactions/);
});

test('a one-creation log passes and gives up its block', () => {
  assertPairable('broadcast/Deploy.s.sol/31337/run-latest.json', ONE);

  const got = creations(ONE);

  assert.deepEqual(got, [{
    name: 'DistributionFactory',
    address: '0xeda72bb52b76818574d5cd6d7dd1dd695b8ddc7f',
    block: '0x7b',
  }]);
  // The block is what `__DISTRIBUTIONFACTORY_BLOCK__` becomes, and a log scan's `fromBlock`.
  assert.equal('0x' + BigInt(got[0].block).toString(16), '0x7b');
});

test('a log that created nothing is exempt, and offers no contract', () => {
  /* `Chunks.s.sol` is five `addChunk` calls and `Seed.s.sol` three sends: no creation, nothing
     paired, and nothing in either that a block is read from. */
  const calls = {
    transactions: [tx('0xaa', null, null, 'CALL'), tx('0xbb', null, null, 'CALL')],
    receipts: [receipt('0xaa', '0x7b'), receipt('0xbb', '0x7c')],
  };

  assertPairable('broadcast/Chunks.s.sol/31337/run-latest.json', calls);

  assert.deepEqual(creations(calls), []);
});

test('a receipt that carries no block leaves the block null rather than guessing one', () => {
  const got = creations({ transactions: ONE.transactions, receipts: [receipt('0xZZ', '0x7b')] });

  assert.deepEqual(got, [{
    name: 'DistributionFactory',
    address: '0xeda72bb52b76818574d5cd6d7dd1dd695b8ddc7f',
    block: null,
  }]);
});

test('CREATE2 counts as a creation, and a plain call does not', () => {
  /* The deploy scripts place through a deterministic deployer, which forge logs as CREATE2; a
     CREATE-only filter would leave every address in this repo unresolved. */
  const got = ['CREATE', 'CREATE2', 'CALL', undefined].map(t => isCreate({ transactionType: t }));

  assert.deepEqual(got, [true, true, false, false]);
});

/* The assertion is only worth anything if the build actually calls it before it pairs. */
test('build.mjs runs the assertion before it reads a block from the log', () => {
  const src = readFileSync(join(root, 'app/build.mjs'), 'utf8');

  const guard = src.indexOf('assertPairable(file, log)');
  const use = src.indexOf('creations(log)');

  assert.ok(guard > 0, 'app/build.mjs does not call assertPairable');
  assert.ok(use > guard, 'app/build.mjs pairs the log before it asserts the log is pairable');
  // The AC's grep: one reference to the issue, in the file whose refusal it explains.
  assert.equal((src.match(/rake#140/g) || []).length, 1);
});

/* And the shape it asserts is the shape this repo's own deploys produce — a log in `broadcast/`
   that the assertion would refuse is a build that cannot run, so it is better found here. */
test('every broadcast log in this working tree passes the assertion', () => {
  const dir = join(root, 'broadcast');
  if (!existsSync(dir)) return;   // a clean checkout has not deployed yet
  const files = [];
  for (const script of readdirSync(dir)) {
    for (const chain of readdirSync(join(dir, script))) {
      const file = join(dir, script, chain, 'run-latest.json');
      if (existsSync(file)) files.push(file);
    }
  }

  for (const file of files) assertPairable(file, JSON.parse(readFileSync(file, 'utf8')));

  assert.ok(files.length >= 0);
});
