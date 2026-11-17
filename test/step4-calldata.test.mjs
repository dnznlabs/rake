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
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const tool = join(repo, 'tools/step4-calldata.mjs');

/* A run that reached the chain or the filesystem would be a different test; `--out` points at a
   throwaway so a regression that proceeds cannot overwrite committed calldata. */
const run = (...args) =>
  spawnSync(process.execPath, [tool, ...args], { cwd: repo, encoding: 'utf8' });

test('refuses with neither --rpc nor --app-nonce, and writes nothing', () => {
  const out = mkdtempSync(join(tmpdir(), 'step4-'));
  const r = run('--chain', '11155111', '--out', out);
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
    const r = run('--chain', '11155111', '--app-nonce', bad, '--out', out);
    assert.equal(r.status, 2, `accepted --app-nonce ${JSON.stringify(bad)} (exit ${r.status})`);
    assert.deepEqual(readdirSync(out), [], `wrote files for --app-nonce ${JSON.stringify(bad)}`);
  }
});
