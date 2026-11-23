/* `tools/step4-calldata.mjs` must refuse to guess `App`'s nonce.

   The pointers it emits are `App`'s own CREATE addresses, so the nonce is not a convenience: with
   the wrong one the tool still produces well-formed, byte-reproducible calldata whose `setChunks`
   names three contracts that are not the ones the `addChunk` calls will create. That failure is
   invisible to every other check in the task — `git status` is clean, the sizes are right, the
   batch decodes — and it only surfaces on chain, after signatures. It had a default of 1, which
   was correct exactly once, for the first upload on a fresh `App` (m04-t08).

   This is the repository's first test that runs a `tools/` script as a child process; m04-t10's
   plan named `test/abi.test.mjs` as that pattern, but that file asserts against fixtures written
   by `tools/abi-vectors.sh` and spawns nothing (`grep -ln child_process test/*.mjs` printed no
   file before this one). Recorded in the handoff as a deviation.

   **Which assertion discriminates, measured rather than assumed.** A plain `status !== 0` does not:
   with the refusal removed the tool does not proceed quietly, it *crashes* — `cast nonce --rpc-url
   undefined` throws — so a bare non-zero check passes for both the refusal and the regression it is
   meant to catch. The discriminating assertions are therefore the exit code **2**, which only the
   deliberate `process.exit(2)` paths produce (a crash is 1), and an output directory left **empty**,
   which proves it stopped before writing. Both were confirmed red against a planted restoration of
   the old `--app-nonce` default. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readdirSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const tool = join(repo, 'tools/step4-calldata.mjs');

/* The deployed `App` — m05-t01's redeploy, the address `deploy/gw44.json` names. Every case that is
   meant to get past argument validation passes it explicitly, because the tool no longer has a
   default (#311). */
const APP = '0x00a9F390A6010d045e0d34856048DdD6910d25BA'; // the deployed App, m05-t01's redeploy

/* A run that reached the chain or the filesystem would be a different test; `--out` points at a
   throwaway so a regression that proceeds cannot overwrite committed calldata. */
const run = (...args) =>
  spawnSync(process.execPath, [tool, ...args], { cwd: repo, encoding: 'utf8' });

test('refuses with neither --rpc nor --app-nonce, and writes nothing', () => {
  const out = mkdtempSync(join(tmpdir(), 'step4-'));
  const r = run('--chain', '11155111', '--app', APP, '--out', out);
  /* 2 is the deliberate refusal; 1 would be a crash, which is what the regression does. */
  assert.equal(r.status, 2, `expected a deliberate exit 2, got ${r.status}: ${r.stderr}`);
  assert.deepEqual(readdirSync(out), [], 'the refusal wrote files — it did not stop before working');
  const msg = `${r.stderr}${r.stdout}`;
  assert.match(msg, /--rpc/, 'the refusal does not name --rpc');
  assert.match(msg, /--app-nonce/, 'the refusal does not name --app-nonce');
});

test('--chain is still required, and its usage names the nonce flags', () => {
  const r = run();
  assert.notEqual(r.status, 0);
  assert.match(`${r.stderr}${r.stdout}`, /--chain/);
});

test('an --app-nonce that is not a non-negative integer is refused', () => {
  const out = mkdtempSync(join(tmpdir(), 'step4-'));
  for (const bad of ['-1', 'one', '']) {
    const r = run('--chain', '11155111', '--app', APP, '--app-nonce', bad, '--out', out);
    assert.equal(r.status, 2, `accepted --app-nonce ${JSON.stringify(bad)} (exit ${r.status})`);
    assert.deepEqual(readdirSync(out), [], `wrote files for --app-nonce ${JSON.stringify(bad)}`);
  }
});

/* `--max-chunk` has to reach the cut, not just parse. The flag exists because RUNBOOK § Gas's
   sizing rule can lower the chunk size on a chain that prices code deposit as state gas, and a flag
   that is accepted and then ignored would let a task believe it had re-cut an upload it had not.
   The tool prints the piece count, so that is what is asserted.

   The fixture is a payload of its own in a throwaway tree used as the tool's cwd, because the tool
   reads `app/dist/` relative to cwd and `make test` does not build the dapp first — a test that
   needed a real bundle would pass here and fail in CI. 30,000 bytes is two pieces at the default,
   which is the committed upload's shape. The widget fixture is 10 bytes so it stays one chunk under
   both sizes; a second widget chunk is a refusal the tool makes on purpose.

   **Only the printed count is asserted for the narrow run, and deliberately not its exit code.**
   What this case measures is that the flag reaches the cut at all. The comment here used to say the
   tool stopped on a three-chunk cut; measured against `main`'s tool on a 60,000-byte fixture
   (m05-t01c), it did not — it exited 0 and wrote the extra chunk into the batch, under a file name
   that said `batch345`. So the count was the right thing to assert, but not for the reason given.

   `--app-nonce 1` keeps it off the chain. `cast` is still needed, for the ABI encoding the tool
   never hand-rolls, so the case states its own precondition rather than failing obscurely without
   it; `make test` runs through devbox, where it is pinned and present. */
/* **Absent tooling fails rather than skips**, with one named way out. A skip is a silent pass, and
   these two are the only cases that exercise the tool against real ABI encoding and a real chain.
   `make test` runs through devbox where `cast` and `anvil` are pinned and present, so failing by
   default costs nothing there and costs a clear message anywhere else. `RAKE_ALLOW_MISSING_TOOLS=1`
   is the deliberate opt-out for a tree without foundry; it has to be chosen, which is the point. */
const haveCast = spawnSync('cast', ['--version'], { encoding: 'utf8' }).status === 0;
const haveAnvilBin = spawnSync('anvil', ['--version'], { encoding: 'utf8' }).status === 0;
const optOut = process.env.RAKE_ALLOW_MISSING_TOOLS === '1';
/** Fails naming the tool and the opt-out, or skips only because the opt-out was set. */
const needs = (have, what) => {
  if (have) return false;
  if (optOut) return `${what} is absent and RAKE_ALLOW_MISSING_TOOLS=1 was set deliberately`;
  assert.fail(`${what} is not on PATH. Run through \`devbox run -- make test\`, where it is pinned, `
    + `or set RAKE_ALLOW_MISSING_TOOLS=1 to skip this case on purpose. A skip you did not choose is a `
    + `silent pass, so this fails instead.`);
};

test('--max-chunk reaches the cut, and its default leaves the piece count alone',
  { skip: needs(haveCast, 'cast') }, () => {
    const home = mkdtempSync(join(tmpdir(), 'step4-fixture-'));
    mkdirSync(join(home, 'app', 'dist'), { recursive: true });
    writeFileSync(join(home, 'app', 'dist', 'index.html.gz'), Buffer.alloc(30_000, 0x61));
    writeFileSync(join(home, 'app', 'dist', 'widget.js'), Buffer.alloc(10, 0x62));
    const at = (...args) =>
      spawnSync(process.execPath, [tool, ...args], { cwd: home, encoding: 'utf8' });

    const wide = at('--chain', '11155111', '--app', APP, '--app-nonce', '1', '--out', join(home, 'wide'));
    assert.equal(wide.status, 0, `the default run failed: ${wide.stderr}`);
    assert.match(wide.stdout, /payload 30000 bytes → 2 chunks/,
      'the 24,000-byte default no longer cuts 30,000 bytes into two pieces');

    const narrow = at('--chain', '11155111', '--app', APP, '--app-nonce', '1',
      '--max-chunk', '10000', '--out', join(home, 'narrow'));
    assert.match(narrow.stdout, /payload 30000 bytes → 3 chunks/,
      '--max-chunk 10000 did not reach the cut — the flag parses but is ignored');
  });

/* ---- a document of three chunks (m05-t01c, amended step 6) ------------------------------------ */

/* Document chunks 0 and 1 stay proposals 1 and 2; every later chunk rides inside the batch, ahead of
   the widget chunk. So the count of signatures per chain does not grow with the document, and the
   two things a reviewer re-derives — the call order and the pointer each setter names — have to hold
   for any count of two or more.

   Both cases run against fixtures in a throwaway cwd, for the reason the case above gives: the tool
   reads `app/dist/` relative to cwd and `make test` builds no bundle. `--app-nonce` keeps them off
   the chain, and the pointer assertions are pinned to that nonce. */
const fixture = (docBytes) => {
  const home = mkdtempSync(join(tmpdir(), 'step4-shape-'));
  mkdirSync(join(home, 'app', 'dist'), { recursive: true });
  writeFileSync(join(home, 'app', 'dist', 'index.html.gz'), Buffer.alloc(docBytes, 0x61));
  writeFileSync(join(home, 'app', 'dist', 'widget.js'), Buffer.alloc(10, 0x62));
  return home;
};
const skip = haveCast ? false : 'cast is not on PATH — run through `devbox run -- make test`';

test('a three-chunk document still takes three proposals, the third inside the batch', { skip }, () => {
  const home = fixture(60_000); // three chunks at the 24,000-byte default: 24,000 + 24,000 + 12,000
  const out = join(home, 'out');
  const r = spawnSync(process.execPath, [tool, '--chain', '11155111', '--app', APP, '--app-nonce', '7', '--out', out], { cwd: home, encoding: 'utf8' });

  assert.equal(r.status, 0, `a three-chunk document was refused: ${r.stderr}`);
  assert.match(r.stdout, /payload 60000 bytes → 3 chunks \(24000 \+ 24000 \+ 12000\)/);

  /* The files: chunks 0 and 1 are proposals, and the batch is named for the four calls it carries. */
  const files = readdirSync(join(out, '11155111')).sort();
  assert.deepEqual(files, [
    '1-addChunk-0.hex', '2-addChunk-1.hex', '3-addChunk-2.hex',
    '4-addWidgetChunk.hex', '5-setChunks.hex', '6-setWidgetChunks.hex',
    'batch3456.hex',
  ].sort());

  /* The batch's decoded calls, in order: the third document chunk, the widget chunk, then the two
     setters. `cast decode-calldata` gives back the three arrays; the selectors in the bytes[] are
     what pins the order. */
  const batch = readFileSync(join(out, '11155111', 'batch3456.hex'), 'utf8');
  const selectors = ['addChunk(bytes)', 'addWidgetChunk(bytes)', 'setChunks(address[],bool)', 'setWidgetChunks(address[])']
    .map(sig => spawnSync('cast', ['sig', sig], { encoding: 'utf8' }).stdout.trim());
  let at = 0;
  for (const sel of selectors) {
    const found = batch.indexOf(sel.slice(2), at);
    assert.ok(found > 0, `the batch does not carry ${sel} after the previous call — the order is wrong`);
    at = found;
  }

  /* The pointers: `App`'s CREATE addresses from the nonce given, in call order — chunk 2's is N + 2
     and the widget's is N + 3, which is the mapping the amendment names. */
  const expected = [7, 8, 9, 10].map(n =>
    spawnSync('cast', ['compute-address', APP, '--nonce', String(n)], { encoding: 'utf8' }).stdout.trim().split(/\s+/).pop());
  for (const [i, addr] of expected.entries()) {
    assert.match(r.stdout, new RegExp(`${addr}\\s+${i < 3 ? `${i + 1}-addChunk-${i}` : '4-addWidgetChunk'}`),
      `pointer ${i} (nonce ${7 + i}) is not reported against its call: ${addr}`);
  }
  const setChunks = readFileSync(join(out, '11155111', '5-setChunks.hex'), 'utf8');
  for (const addr of expected.slice(0, 3)) {
    assert.ok(setChunks.toLowerCase().includes(addr.slice(2).toLowerCase()), `setChunks does not name ${addr}`);
  }
  assert.ok(
    !setChunks.toLowerCase().includes(expected[3].slice(2).toLowerCase()),
    'setChunks names the widget pointer, so the document would serve the widget as a third chunk',
  );
});

test('a two-chunk document still produces today\'s files byte for byte', { skip }, () => {
  /* The committed upload's shape. A generalisation that changed these bytes would invalidate every
     signature and every re-derivation recorded against them, so it is pinned against itself: the
     same fixture through the same tool twice, and the file set and names of the two-chunk case. */
  const home = fixture(30_000);
  const a = join(home, 'a'), b = join(home, 'b');
  const run2 = (out) => spawnSync(process.execPath, [tool, '--chain', '11155111', '--app', APP, '--app-nonce', '1', '--out', out], { cwd: home, encoding: 'utf8' });

  assert.equal(run2(a).status, 0);
  assert.equal(run2(b).status, 0);

  const names = readdirSync(join(a, '11155111')).sort();
  assert.deepEqual(names, [
    '1-addChunk-0.hex', '2-addChunk-1.hex', '3-addWidgetChunk.hex',
    '4-setChunks.hex', '5-setWidgetChunks.hex', 'batch345.hex',
  ].sort(), 'the two-chunk file set changed, so the committed calldata no longer regenerates');

  for (const n of names) {
    assert.equal(
      readFileSync(join(a, '11155111', n), 'utf8'),
      readFileSync(join(b, '11155111', n), 'utf8'),
      `${n} is not reproducible`,
    );
  }
});

test('a fourth document chunk is a stop, not a fourth proposal', { skip }, () => {
  const home = fixture(80_000); // four chunks at the default
  const out = join(home, 'out');
  const r = spawnSync(process.execPath, [tool, '--chain', '11155111', '--app', APP, '--app-nonce', '1', '--out', out], { cwd: home, encoding: 'utf8' });

  assert.notEqual(r.status, 0, 'a four-chunk document was built without a word to anyone');
  assert.match(`${r.stderr}${r.stdout}`, /stop and report/);
  /* The refusal lands before the first write, so the output directory is never created. */
  assert.ok(!existsSync(out), 'the refusal created the output directory, so it got as far as writing');
});

/* ---- the target, which used to have a default (#311) ------------------------------------------ */

/* `--app` defaulted to the `App` that m05-t01's redeploy retired. A wrong *nonce* was already
   refused because it is silent; a retired *address* is silent in the same way and costs more — the
   upload is well-formed, reproducible, under the cap, and lands on a contract nothing serves. It
   reached committed calldata on this very task before review caught it, which is why the refusal is
   tested rather than trusted. */

test('refuses without --app, and writes nothing', () => {
  const out = mkdtempSync(join(tmpdir(), 'step4-'));
  const r = run('--chain', '11155111', '--app-nonce', '1', '--out', out);

  assert.equal(r.status, 2, `expected a deliberate exit 2, got ${r.status}: ${r.stderr}`);
  assert.deepEqual(readdirSync(out), [], 'the refusal wrote files — it did not stop before working');
  assert.match(`${r.stderr}${r.stdout}`, /--app/, 'the refusal does not name --app');
});

test('the usage line names --app as required', () => {
  const r = run();
  assert.match(`${r.stderr}${r.stdout}`, /--chain <id> --app 0x/, 'usage no longer shows --app as required');
});

test('an --app that is not an address is refused', () => {
  const out = mkdtempSync(join(tmpdir(), 'step4-'));
  for (const bad of ['0x00a9F390', 'App', '00a9F390A6010d045e0d34856048DdD6910d25BA', '0xZZa9F390A6010d045e0d34856048DdD6910d25BA']) {
    const r = run('--chain', '11155111', '--app', bad, '--app-nonce', '1', '--out', out);
    assert.equal(r.status, 2, `accepted --app ${JSON.stringify(bad)} (exit ${r.status})`);
    assert.deepEqual(readdirSync(out), [], `wrote files for --app ${JSON.stringify(bad)}`);
  }
});

/* The `--rpc` half of #311: with a chain to ask, refuse a target that holds no code. Run against a
   throwaway anvil, with **both** readings — an address with no code and the same run against an
   address that has some, planted with `anvil_setCode`. The pair is the point: a refusal that fires
   for everything would pass the first assertion alone. */
const haveAnvil = haveAnvilBin;

test('with --rpc, an App with no code is refused — and one with code is not',
  { skip: needs(haveCast && haveAnvil, 'anvil and cast') }, () => {
    /* `spawn`, detached, with stdio ignored. A backgrounded node inside `spawnSync('bash', …)`
       inherits the pipe spawnSync waits on, so the call never returns even though the shell has
       exited — the test hangs rather than fails. Readiness is then polled rather than slept for. */
    const port = 8704;
    const rpc = `http://127.0.0.1:${port}`;
    const chain = spawn('anvil', ['--port', String(port), '--silent'], { detached: true, stdio: 'ignore' });
    chain.unref();
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      up = spawnSync('cast', ['chain-id', '--rpc-url', rpc], { encoding: 'utf8' }).status === 0;
      if (!up) spawnSync('sleep', ['0.25']);
    }
    assert.ok(up, `the dev chain did not answer on ${rpc} within 10s`);
    try {
      const home = fixture(30_000);
      const at = (...args) => spawnSync(process.execPath, [tool, ...args], { cwd: home, encoding: 'utf8' });
      const EMPTY = '0x00000000000000000000000000000000000dEaD0';

      const empty = at('--chain', '31337', '--app', EMPTY, '--rpc', rpc, '--out', join(home, 'empty'));
      assert.equal(empty.status, 2, `an App with no code was accepted (exit ${empty.status}): ${empty.stdout}`);
      assert.match(`${empty.stderr}${empty.stdout}`, /no code at/i);

      /* The control: the same command, the same tool, an address that holds code. */
      const planted = spawnSync('cast', ['rpc', 'anvil_setCode', EMPTY, '0x60006000f3', '--rpc-url', rpc], { encoding: 'utf8' });
      assert.equal(planted.status, 0, `could not plant code: ${planted.stderr}`);
      const ok = at('--chain', '31337', '--app', EMPTY, '--rpc', rpc, '--out', join(home, 'ok'));
      assert.equal(ok.status, 0, `the same address with code was still refused: ${ok.stderr}`);
      assert.match(ok.stdout, /payload 30000 bytes/);
    } finally {
      try { process.kill(-chain.pid); } catch { try { chain.kill('SIGKILL'); } catch { /* already gone */ } }
    }
  });
