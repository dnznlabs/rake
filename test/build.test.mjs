/* The build's refusal to read a broadcast log it would misread (rake#140).

   Like `inline-scripts.test.mjs`, this tests the assertion the build runs rather than running the
   build: `app/build.mjs` calls `assertPairable` before it pairs anything, and what is asserted here
   is that the assertion fires on the shape m03-t06 actually found and stays quiet on the shape every
   deploy script in this repo actually produces. The fixtures are the two-creation log the pairing
   cannot resolve and the one-creation log it can. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertPairable, create2, creations, isCreate, pairable, PROXY } from '../app/broadcast.mjs';
import { check, SHAPES } from '../app/values.mjs';
import { marked, MARKER } from '../app/version.mjs';

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
    args: null,
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
    args: null,
  }]);
});

test('CREATE2 counts as a creation, and a plain call does not', () => {
  /* The deploy scripts place through a deterministic deployer, which forge logs as CREATE2; a
     CREATE-only filter would leave every address in this repo unresolved. */
  const got = ['CREATE', 'CREATE2', 'CALL', undefined].map(t => isCreate({ transactionType: t }));

  assert.deepEqual(got, [true, true, false, false]);
});

/* The assertion is only worth anything if the build actually calls it before it pairs. */
test('an ambiguous log gives up its addresses but never a block', () => {
  /* The address comes off the transaction and is sound whatever the receipts say; the block comes
     off the hash join and is the only thing rake#140 can corrupt. So a two-creation log still
     resolves `__APP__`, and withholds `__APP_BLOCK__`. */
  assert.equal(pairable(TWO), false);

  const got = creations(TWO);

  assert.deepEqual(got.map(c => c.name), ['DistributionFactory', 'App']);
  assert.deepEqual(got.map(c => c.address), ['0x' + '1'.repeat(40), '0x' + '2'.repeat(40)]);
  assert.deepEqual(got.map(c => c.block), [null, null], 'a block was offered from a log that cannot be paired');
});

test('Fixtures.s.sol\'s four mocks do not make the next build fatal', () => {
  /* `make fixtures` is a documented hand-run step (AGENTS.md § The dapp) and its broadcast log
     creates four test mocks at once. Nothing substitutes a mock's block, so the build must keep
     working: the addresses resolve and only the blocks are withheld. */
  const fixtures = {
    transactions: ['RevertingReceiver', 'MockERC20', 'MockVault', 'BlocklistToken']
      .map((n, i) => tx('0x' + String(i).repeat(2), n, '0x' + String(i + 1).repeat(40), 'CREATE')),
    receipts: [0, 1, 2, 3].map(i => receipt('0x' + String(i).repeat(2), '0x' + (i + 10).toString(16))),
  };

  const got = creations(fixtures);

  assert.equal(got.length, 4);
  assert.deepEqual(got.map(c => c.block), [null, null, null, null]);
  // And the demand is what throws, so a build that *did* want one of these is still refused.
  assert.throws(() => assertPairable('broadcast/Fixtures.s.sol/31337/run-latest.json', fixtures),
    /4 creations and 4 receipts for 4 transactions/);
});

test('build.mjs refuses a withheld block by name rather than substituting one', () => {
  const src = readFileSync(join(root, 'app/build.mjs'), 'utf8');

  /* The wiring this depends on: a block the pairing could not give is remembered in `withheld`, and
     `substitute` turns a demand for it into the rake#140 refusal instead of "nothing to substitute". */
  assert.match(src, /else withheld\.set\(`\$\{name\}_BLOCK`/);
  assert.match(src, /for \(const k of missing\) if \(withheld\.has\(k\)\) assertPairable\(/);
  /* `creations` takes the log and the name of the file it came from, which is what its own refusals
     cite — a build that passed only the log would name no file in them. */
  assert.ok(src.indexOf('creations(log, rel)') > 0, 'app/build.mjs does not pair through creations()');
  // The AC's grep: one reference to the issue, in the file whose refusal it explains.
  assert.equal((src.match(/rake#140/g) || []).length, 1);
});

/* ---- the version string, derived rather than hardcoded (ROADMAP decision 45) ---------------- */

/* The marker is not a version in the contract: `App.version` feeds `App`'s CREATE2 address and stays
   `v0.1`, and the page string is that argument plus `alpha`. Two hardcoded `v0.1`s — one in `src/`
   and one in `build.mjs` — is the state this replaces, and the one in `build.mjs` is the one that
   could drift, since nothing compared them. */
test('the page\'s version string is App\'s argument with the marker appended', () => {
  /* The three inputs m04-t09 names: the argument `DeployApp.s.sol` passes today, the same argument
     without its `v`, and a shape nobody has explained. */
  assert.equal(marked('v0.1'), '0.1alpha');
  assert.equal(marked('0.1'), '0.1alpha');
  assert.throws(() => marked('v1'), err => {
    /* Refused by name and with the reason: this stops a build whose bundle was about to be uploaded,
       so the message has to say which argument and what was wrong with it. */
    assert.match(err.message, /"v1"/);
    assert.match(err.message, /not v<major>\.<minor>/);
    assert.match(err.message, /decision 45/);
    return true;
  });
  // One `v` comes off, not every one, and the marker is appended rather than interpolated.
  assert.equal(marked('v1.0'), '1.0' + MARKER);
  assert.equal(marked('12.34'), '12.34alpha');
});

test('a log that offers no version leaves it to the build\'s refusal rather than defaulting', () => {
  /* `null` is not a string: it means this log said nothing, and `build.mjs` then has nothing to
     substitute for `__VERSION__` and refuses by name — the same stop as a missing address. A
     default here would paint a stale version on a bundle about to be uploaded. */
  assert.equal(marked(null), null);
  assert.equal(marked(undefined), null);
  assert.equal(marked(''), null);
});

test('App\'s constructor arguments come off the log beside its address', () => {
  /* The shape `DeployApp.s.sol` writes: `[owner, version]`, read 2026-11-12 from both testnet logs.
     The address and the arguments both come off the transaction, so they are equally sound — unlike
     the block, which comes off the receipt join rake#140 found mispairing. */
  const log = {
    transactions: [{
      hash: '0xaa',
      contractName: 'App',
      contractAddress: '0x00a90943f58b6ab7fde05aae01c13a80e6995bae',
      transactionType: 'CREATE2',
      arguments: ['0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790', 'v0.1'],
    }],
    receipts: [receipt('0xaa', '0x7b')],
  };

  const got = creations(log);

  assert.deepEqual(got[0].args, ['0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790', 'v0.1']);
  assert.equal(marked(got[0].args[1]), '0.1alpha');
});

test('build.mjs carries no version of its own', () => {
  const src = readFileSync(join(root, 'app/build.mjs'), 'utf8');

  /* The AC's grep: the second hardcoded source is gone, so the only `v0.1` left in the repo that the
     page depends on is `App`'s constructor argument. */
  assert.equal((src.match(/v0\.1/g) || []).length, 0, 'app/build.mjs still hardcodes a version');
  assert.doesNotMatch(src, /VERSION:\s*'/, 'app/build.mjs still defaults VERSION');
  assert.ok(src.includes('marked('), 'app/build.mjs does not derive the version through marked()');
});

/* The repo's own logs are the oracle: if `DeployApp.s.sol` ever stops passing a version this
   recognises, the build refuses, and it is better found here than at an upload. */
test('every App creation in this working tree yields a derivable version', () => {
  const dir = join(root, 'broadcast/DeployApp.s.sol');
  if (!existsSync(dir)) return;   // a clean checkout has not deployed yet
  const seen = [];
  for (const chain of readdirSync(dir)) {
    const file = join(dir, chain, 'run-latest.json');
    if (!existsSync(file)) continue;
    for (const c of creations(JSON.parse(readFileSync(file, 'utf8')))) {
      if (c.name !== 'App' || !c.args || c.args.length < 2) continue;
      seen.push([chain, marked(c.args[1])]);
    }
  }
  if (!seen.length) return;

  for (const [chain, version] of seen) {
    assert.match(version, /^\d+\.\d+alpha$/, `chain ${chain} derives ${version}`);
  }
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
  // No log found is the same state as no directory, and both mean "this tree has not deployed".
  // Removing the chain directories (`rm -rf` over each `broadcast/<script>/31337`) leaves the
  // per-script directories behind, so an assertion here — "no broadcast log in this tree — deploy
  // first, or this proves nothing" — made `node --test` green or red according to what the
  // developer last deleted. A suite the acceptance criteria gate on cannot depend on local
  // deploy history.
  if (files.length === 0) return;

  /* Every `__NAME___BLOCK__` the three sources ask for, which is the only set that has to resolve.
     `Fixtures.s.sol` creates four mocks in one log and so offers none of their blocks — that is the
     design, and what must hold is that nothing the bundle reads is among them. */
  const wanted = new Set();
  for (const f of ['app/src/index.html', 'app/src/widget.js', 'app/src/host.html']) {
    for (const m of readFileSync(join(root, f), 'utf8').matchAll(/__([A-Z][A-Z0-9_]*_BLOCK)__/g)) wanted.add(m[1]);
  }
  const offered = new Set();
  for (const file of files) {
    for (const c of creations(JSON.parse(readFileSync(file, 'utf8')))) {
      if (c.block != null) offered.add(`${c.name.toUpperCase()}_BLOCK`);
    }
  }

  assert.ok(wanted.size > 0, 'no source asks for a creation block — this test has stopped measuring anything');
  for (const k of wanted) assert.ok(offered.has(k), `__${k}__ is wanted by the bundle and no pairable log offers it`);
});

/* ---- every value has a declared shape, whatever the source (A1, A2, A6) --------------------- */

/* The six tokens the Sepolia build resolves, read from `broadcast/` and `mk/15-seed.mk` and pinned
   here as the one row that must pass: a table every real build fails is not a check, it is a stop. */
const SEPOLIA = {
  CHAIN_ID: '11155111',
  VERSION: '0.1alpha',
  DISTRIBUTIONFACTORY: '0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B',
  DISTRIBUTIONFACTORY_BLOCK: '0xb88091',
  FEATURED_SALT: '0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001',
  APP: '0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE',
};

test('the values a real build resolves pass every declared shape', () => {
  assert.deepEqual(check({ ...SEPOLIA }), SEPOLIA);
  // Returned unchanged: this is a gate, not a normaliser, so nothing downstream reads a rewritten value.
  assert.equal(check({ CHAIN_ID: '31337' }).CHAIN_ID, '31337');
});

/* One row per token with a value that must not reach a sink, each refused by name. The widths are
   the argument of `app/values.mjs`: every one of these is admitted by a shape one character wider. */
test('a value outside its declared shape is refused by name', () => {
  const bad = [
    // Hex where `CFG.chainId` is compared as a decimal string and parsed with `Number`.
    ['CHAIN_ID', '0x1'],
    // Leg 1's two reproductions: the quote that breaks out of the `CFG` literal, and the markup.
    ['VERSION', "0.1alpha'"],
    ['VERSION', '<img src=x onerror=alert(1)>'],
    // `isAddr` passes and the checksum fails: a typo, and a different gzip size for the same address.
    ['DISTRIBUTIONFACTORY', '0x00d18b5b72c4d8e7761776d1275b69d4dbcde71b'],
    ['DISTRIBUTIONFACTORY', '0x' + 'g'.repeat(40)],
    // The form `build.mjs:48` writes has no leading zero, and is hex rather than decimal.
    ['DISTRIBUTIONFACTORY_BLOCK', '0x0b88091'],
    ['DISTRIBUTIONFACTORY_BLOCK', '12'],
    // 63 hex digits is not 32 bytes.
    ['FEATURED_SALT', '0x' + 'a'.repeat(63)],
  ];

  for (const [token, value] of bad) {
    assert.throws(() => check({ ...SEPOLIA, [token]: value }),
      new RegExp(`__${token}__`), `${token}=${value} was not refused`);
  }
});

test('the source of a failing value is named with it', () => {
  /* The message is read by whoever has to fix the value, and where it came from is half of that:
     the command line, a log in `broadcast/`, or this build's one default. */
  assert.throws(() => check({ CHAIN_ID: 'nope' }, { CHAIN_ID: '--set' }), /from --set/);
  assert.throws(() => check({ CHAIN_ID: 'nope' }, { CHAIN_ID: 'broadcast/Deploy.s.sol/1/run-latest.json' }),
    /from broadcast\/Deploy\.s\.sol\/1\/run-latest\.json/);
  assert.throws(() => check({ CHAIN_ID: 'nope' }), /from the default/);
});

test('a token with no declared shape fails closed rather than passing unchecked', () => {
  /* The point of the table is that there is no such thing as an unchecked value: a new `__NAME__`
     in the sources stops the build until someone states what it may be. */
  assert.throws(() => check({ FOO: 'x' }), /no shape declared for __FOO__/);
  assert.throws(() => check({ ...SEPOLIA, FOO: 'x' }), /add one to app\/values\.mjs/);
});

test('every token the three sources use has a shape, and the table is only those', () => {
  /* Both halves, because each is blind to the other defect: a token with no row would be refused at
     every build, and a row for a token nothing substitutes is a rule nothing applies. */
  const used = new Set();
  for (const f of ['app/src/index.html', 'app/src/widget.js', 'app/src/host.html']) {
    for (const m of readFileSync(join(root, f), 'utf8').matchAll(/__([A-Z][A-Z0-9_]*)__/g)) used.add(m[1]);
  }

  assert.deepEqual([...used].sort(), Object.keys(SHAPES).sort());
});

/* `--set` and `deployed()` are `build.mjs`'s own surface, so these run it. The refusal path leaves
   `app/dist` as it was (`build.mjs:129-130`), which is why a *failing* build may be run here on the
   tracked Sepolia logs; a green one would write `app/dist` and is deliberately not written. */
const buildRun = (...set) => {
  const dist = join(root, 'app/dist/index.html');
  const before = existsSync(dist) ? statSync(dist).mtimeMs : null;
  const r = spawnSync(process.execPath,
    ['app/build.mjs', '--chain', '11155111', ...set.flatMap(s => ['--set', s])],
    { cwd: root, encoding: 'utf8' });
  const after = existsSync(dist) ? statSync(dist).mtimeMs : null;
  return { ...r, before, after };
};
const DNZN = 'FEATURED_SALT=0x357836ffcb45307fa7ff2a574f505753c961902b000000000000000000000001';

test('a --set value outside its shape stops the build and leaves app/dist alone', () => {
  /* Leg 1's reproduction: `--set VERSION=…` discarded `version.mjs`'s validation entirely, because
     nothing checked the merged values and `marked()` is never asked about an override. */
  const r = buildRun(DNZN, "VERSION=0.1alpha'");

  assert.equal(r.status, 1);
  assert.match(r.stderr, /VERSION/);
  assert.equal(r.after, r.before, 'a refused build wrote app/dist');
});

test('a --set key the substitution could never match is refused as the argument given', () => {
  /* `substitute` matches `__[A-Z][A-Z0-9_]*__`, so `--set lowercase=1` set a key nothing would ever
     read and the document kept its literal token — a flag that silently did nothing. */
  const r = buildRun(DNZN, 'lowercase=1');

  assert.equal(r.status, 1);
  assert.match(r.stderr, /lowercase/);
  assert.equal(r.after, r.before, 'a refused build wrote app/dist');
});

test('a --set over a value the log already gave says so on stderr and still builds', () => {
  /* The override is the flag's documented purpose (`build.mjs:10`, `:72`); what R4 named is that it
     was silent, so a bundle could be re-pointed at another factory leaving no trace of it. This
     passes the log's own value, so the build is the one it would have made anyway. */
  const r = buildRun(DNZN, `DISTRIBUTIONFACTORY=${SEPOLIA.DISTRIBUTIONFACTORY}`);

  assert.equal(r.status, 0);
  assert.match(r.stderr, /--set DISTRIBUTIONFACTORY overrides the log's 0x00D18B5b/);
});

test('build.mjs refuses a name two broadcast logs both create', () => {
  const src = readFileSync(join(root, 'app/build.mjs'), 'utf8');

  /* Pinned the way `:136-146` pins the withheld wiring: the surface is `deployed()`'s loop over
     `broadcast/`, which no unit test can reach without a second tracked log creating the same name.
     What used to happen is that the later directory won, with no notice. */
  assert.match(src, /is created by/);
  assert.ok(src.indexOf('if (name in out)') > 0, 'app/build.mjs does not refuse a repeated name');
});

/* ---- the log's addresses recomputed rather than believed (A3, A4) --------------------------- */

const DEPLOYED = {
  factory: '0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B',
  impl: '0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0',
};

/* The two chains whose `Deploy.s.sol` log is tracked, and so the only two whose addresses are a fact
   about this repository rather than about whoever last ran `make deploy`. A dev chain's log is read
   for the property and not for the figures: `:245-251` records why a suite the acceptance criteria
   gate on cannot depend on local deploy history. */
const TRACKED = { 11155111: DEPLOYED, 84532: DEPLOYED };

test('every Deploy log in this tree recomputes to the addresses it logs', () => {
  /* The chains are read from the tree rather than listed here: a third deploy is covered the day its
     log lands. The test skips if absent, as `:235-251` does. */
  const dir = join(root, 'broadcast/Deploy.s.sol');
  if (!existsSync(dir)) return;
  const seen = [];
  for (const chain of readdirSync(dir).sort()) {
    const file = join(dir, chain, 'run-latest.json');
    if (!existsSync(file)) continue;
    const log = JSON.parse(readFileSync(file, 'utf8'));
    const t = log.transactions.find(x => x.contractName === 'DistributionFactory');

    // The address is a function of the salt and the init code the log itself carries.
    assert.equal(t.transaction.to.toLowerCase(), PROXY);
    const computed = create2(PROXY, t.transaction.input.slice(2, 66), '0x' + t.transaction.input.slice(66));
    assert.equal(computed.toLowerCase(), t.contractAddress.toLowerCase(), `chain ${chain} factory`);

    const got = creations(log, file);
    assert.deepEqual(got.map(c => c.name), ['DistributionFactory', 'Distribution'], `chain ${chain} names`);
    // The implementation is created inside the factory's constructor, so it carries no block of its own.
    assert.deepEqual(got.map(c => c.block), [log.receipts[0].blockNumber, null], `chain ${chain} blocks`);
    /* The two tracked testnets place at the addresses ROADMAP decision 50 and `RUNBOOK.md:69` state;
       a dev chain's factory is a different address and only the recomputation above is asserted. */
    if (TRACKED[chain]) {
      assert.deepEqual(got.map(c => c.address.toLowerCase()),
        [TRACKED[chain].factory.toLowerCase(), TRACKED[chain].impl.toLowerCase()], `chain ${chain} addresses`);
    }
    seen.push([chain, computed, got[1].address]);
  }

  // Both tracked chains were actually read: an empty loop asserts nothing.
  for (const chain of Object.keys(TRACKED)) {
    assert.ok(seen.some(([c]) => c === chain), `no Deploy log read for tracked chain ${chain}`);
  }
  console.log('recomputed:', JSON.stringify(seen));
});

test('an address the salt and init code do not produce is refused with both', () => {
  /* The sentence of R4 this answers: a *valid* replacement address silently re-pointed the bundle at
     another factory. One hex digit is the whole defect — the value passes every shape check there is. */
  const real = JSON.parse(readFileSync(join(root, 'broadcast/Deploy.s.sol/11155111/run-latest.json'), 'utf8'));
  const input = real.transactions[0].transaction.input;
  const bent = DEPLOYED.factory.slice(0, -1) + (DEPLOYED.factory.slice(-1) === 'B' ? 'c' : 'B');
  const log = {
    transactions: [{ ...tx('0xaa', 'DistributionFactory', bent), transaction: { to: PROXY, input } }],
    receipts: [receipt('0xaa', '0x7b')],
  };

  assert.throws(() => creations(log, 'broadcast/Deploy.s.sol/11155111/run-latest.json'), err => {
    assert.match(err.message, /computed/);
    assert.match(err.message, new RegExp(bent));
    assert.match(err.message, new RegExp(DEPLOYED.factory));
    assert.match(err.message, /run-latest\.json/);
    return true;
  });
});

test('a contractAddress that is not 20 hex bytes is refused before it is checksummed', () => {
  /* `Eth.checksum` lowercases and re-cases and passes everything else through, so a `g` survives it
     into the `CFG` literal. The filter has to be here. */
  const log = { transactions: [tx('0xaa', 'DistributionFactory', '0x' + 'g'.repeat(40))], receipts: [receipt('0xaa', '0x7b')] };

  assert.throws(() => creations(log, 'x.json'), err => {
    assert.match(err.message, /not an address/);
    assert.match(err.message, /x\.json/);
    return true;
  });
});

test('a creation that is not through the proxy keeps its logged address', () => {
  /* A plain `CREATE` — which is what `Fixtures.s.sol`'s four mocks are — places at an address that
     follows the sender's nonce, and the log does not carry it. Nothing to recompute from, so
     nothing is asserted, and `make fixtures` stays non-fatal to the next build. */
  const log = {
    transactions: [tx('0xaa', 'MockERC20', '0x' + '4'.repeat(40), 'CREATE')],
    receipts: [receipt('0xaa', '0x7b')],
  };

  assert.deepEqual(creations(log, 'x.json').map(c => c.address), ['0x' + '4'.repeat(40)]);
});

test('a name two transactions in one log both create is yielded twice, not collapsed', () => {
  /* `creations` reports what the log says; which of two addresses a token takes is `deployed()`'s
     refusal, pinned above. Collapsing here would hide the question from it. */
  const log = {
    transactions: [tx('0xaa', 'App', '0x' + '1'.repeat(40)), tx('0xbb', 'App', '0x' + '2'.repeat(40))],
    receipts: [receipt('0xaa', '0x7b'), receipt('0xbb', '0x7c')],
  };

  assert.deepEqual(creations(log, 'x.json').map(c => c.address), ['0x' + '1'.repeat(40), '0x' + '2'.repeat(40)]);
});

/* ---- the hash join the pairing exists to protect (B1-B3) ------------------------------------ */

/* One creation and one call, so every row below is a log `pairable` used to accept. */
const joined = (txs, receipts) => ({ transactions: txs, receipts });

test('two transactions under one hash are refused, naming the hash', () => {
  /* Leg 1's reproduction: today `pairable` is `true` — one creation, two receipts for two
     transactions — and the creation takes whichever block the Map kept last. */
  const log = joined(
    [tx('0xaa', 'DistributionFactory', '0x' + '1'.repeat(40)), tx('0xaa', null, null, 'CALL')],
    [receipt('0xaa', '0x7b'), receipt('0xbb', '0x7c')],
  );

  assert.equal(pairable(log), false);
  assert.throws(() => assertPairable('x.json', log), /share hash 0xaa/);
});

test('the shared hash with matching receipts is refused, which only uniqueness catches', () => {
  /* Leg 1's reproduction in the shape every other check passes: one creation, two receipts for two
     transactions, and *every* hash on one list present on the other — the set equality holds because
     the two sets are both `{0xaa}`. The Map keeps the last receipt, so the creation takes `0x7c`,
     which is the call's block and not its own. Uniqueness is the only test that sees it, which is
     why this row is here beside the one above and not instead of it. */
  const log = joined(
    [tx('0xaa', 'DistributionFactory', '0x' + '1'.repeat(40)), tx('0xaa', null, null, 'CALL')],
    [receipt('0xaa', '0x7b'), receipt('0xaa', '0x7c')],
  );

  assert.equal(pairable(log), false);
  assert.throws(() => assertPairable('x.json', log), /share hash 0xaa/);
  // And with the block withheld, nothing substitutes the figure that would have been wrong.
  assert.equal(creations(log, 'x.json')[0].block, null);
});

test('a transaction with no receipt of its own is refused, naming the transaction', () => {
  const log = joined(
    [tx('0xaa', 'DistributionFactory', '0x' + '1'.repeat(40)), tx('0xbb', null, null, 'CALL')],
    [receipt('0xaa', '0x7b'), receipt('0xaa', '0x7c')],
  );

  assert.equal(pairable(log), false);
  assert.throws(() => assertPairable('x.json', log), /0xbb has no receipt/);
});

test('a receipt naming another contract than its transaction is refused with both', () => {
  /* A plain `CREATE` carries the address in the receipt too, so where there are two answers they
     have to agree — a receipt filed under the wrong transaction is exactly what m03-t06 found. */
  const log = joined(
    [tx('0xaa', 'MockERC20', '0x' + '1'.repeat(40), 'CREATE')],
    [{ ...receipt('0xaa', '0x7b'), contractAddress: '0x' + '3'.repeat(40) }],
  );

  assert.equal(pairable(log), false);
  assert.throws(() => assertPairable('x.json', log), err => {
    assert.match(err.message, /names/);
    assert.match(err.message, /0x3{40}/);
    assert.match(err.message, /0x1{40}/);
    return true;
  });
});

test('a creation whose receipt reverted gives up no block', () => {
  /* A failed transaction still has a receipt and a block; the contract it names was never created. */
  const log = joined(
    [tx('0xaa', 'DistributionFactory', '0x' + '1'.repeat(40))],
    [{ ...receipt('0xaa', '0x7b'), status: '0x0' }],
  );

  assert.equal(pairable(log), false);
  assert.throws(() => assertPairable('x.json', log), /status 0x0/);
});

test('the one-creation log every deploy script writes still pairs and gives up its block', () => {
  // The control for the four rows above: the checks refuse the broken shapes and not the real one.
  assert.equal(pairable(ONE), true);
  assert.equal(creations(ONE)[0].block, '0x7b');
});
