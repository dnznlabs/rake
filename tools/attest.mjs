#!/usr/bin/env node
/* The bytecode attestation (decision 56 d): prove, from outside, that each chain still holds the
   bytes this source tree builds.

   It answers two different questions and would be worth little if it answered only one:

   1. **Is the chain still what we recorded?** `cast code` at each saved address, hashed, against the
      `codeKeccak` in `deployments/<chainId>.json`. This is the half that catches a chain that moved
      under us — a selfdestructed or re-created address, a proxy repointed, a reorg'd deploy.
   2. **Are those bytes the ones this tree builds?** The same `cast code` against
      `forge inspect <Contract> deployedBytecode`. This is the half that catches a repository that
      moved away from the chain: a `src/` change nobody redeployed, a solc pin bumped, a library
      swapped.

   **No contract is compared outright, because two of the three carry immutables.** An immutable is
   zero in the build's bytes and the real value in the chain's, so a flat comparison fails on a
   healthy deployment. The comparison therefore skips each contract's own `immutableReferences` spans
   and then checks what those spans *hold*, which is the stronger statement anyway:

   - `DistributionFactory` has three spans, and every one must hold the implementation's address (the
     comparison `RUNBOOK.md` step 2 writes out by hand).
   - `Distribution` — the implementation — has two, `self` and `factory` (`src/Distribution.sol:101`
     and `:102`). Measured on both testnets 2026-11-22: they hold the implementation's own address and
     the factory's. They are checked **by value as a set**, not by position, because a span's offset
     and its AST id both move between solc builds while the two addresses do not.
   - `App` has none, and that is asserted rather than assumed: an immutable added to it later would
     otherwise be skipped by nobody and silently break the outright comparison.

   m05-t02's plan expected the implementation to compare outright; it does not, and this is the
   deviation the handoff records.

   Everything is read with `cast` over the public endpoints in `deploy/chains.json` — no key, no
   secret, nothing that could not be run by a stranger, which is the point of an attestation.

   usage: node tools/attest.mjs [--dir deployments] [--chain <id>]
   exit:  0 everything matched · 1 a mismatch, a missing contract, or a chain that would not answer */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const dir = arg('dir', 'deployments');
const only = arg('chain');

const cast = (...args) => execFileSync('cast', args, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const lower = (s) => String(s).replace(/^0x/i, '').toLowerCase();

/* The artifact rather than `forge inspect <c> deployedBytecode`, because the factory's comparison
   needs `immutableReferences` from the same object and the two must not come from different builds. */
const ARTIFACTS = {
  DistributionFactory: 'out/Distribution.sol/DistributionFactory.json',
  Distribution: 'out/Distribution.sol/Distribution.json',
  App: 'out/App.sol/App.json',
};
const artifact = (name) => {
  const path = ARTIFACTS[name];
  if (!path) throw new Error(`attest: no artifact path known for ${name}`);
  if (!existsSync(path)) throw new Error(`attest: ${path} is missing — run \`forge build\` first`);
  const j = JSON.parse(readFileSync(path, 'utf8'));
  return { object: lower(j.deployedBytecode.object), immutable: j.deployedBytecode.immutableReferences ?? {} };
};

/* Every span of every immutable, flattened and sorted, so the factory comparison can skip them. */
const spansOf = (immutable) =>
  Object.values(immutable)
    .flat()
    .map(({ start, length }) => ({ start, length }))
    .sort((a, b) => a.start - b.start);

/* The first differing byte and how many differ in the window, because a reader of a failed
   attestation needs to know whether it is one immutable or a different contract altogether. */
function describe(onChain, built, from, to = onChain.length) {
  const a = onChain.slice(from, to);
  const b = built.slice(from, to);
  let first = -1;
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 2) {
    if (a.slice(i, i + 2) !== b.slice(i, i + 2)) {
      if (first === -1) first = (from + i) / 2;
      n++;
    }
  }
  const window = `bytes ${from / 2}..${to === onChain.length ? 'end' : to / 2}`;
  return `${window}: ${n} byte(s) differ from what this tree builds, first at ${first}`;
}

/* Which addresses each contract's immutables must hold, derived from the record itself so that the
   check cannot drift from the deployment it describes. `null` means "unknown contract", which is a
   failure rather than a skip. */
function expectation(name, rec) {
  const factory = rec.contracts?.DistributionFactory?.address;
  const impl = rec.contracts?.Distribution?.address;
  if (name === 'DistributionFactory') return impl ? [impl, impl, impl] : null;
  if (name === 'Distribution') return impl && factory ? [impl, factory] : null;
  if (name === 'App') return [];
  return null;
}

/* Equal outside the spans. Returns a list of human-readable differences, empty when it matches. */
function compareOutsideSpans(onChain, built, spans) {
  const bad = [];
  if (onChain.length !== built.length) {
    bad.push(`length ${onChain.length / 2} bytes on chain against ${built.length / 2} built`);
    return bad;
  }
  let at = 0;
  for (const { start, length } of spans) {
    const from = start * 2;
    const to = (start + length) * 2;
    if (onChain.slice(at, from) !== built.slice(at, from)) {
      bad.push(describe(onChain, built, at, from));
    }
    at = to;
  }
  if (onChain.slice(at) !== built.slice(at)) bad.push(describe(onChain, built, at));
  return bad;
}

const rpcs = JSON.parse(readFileSync('deploy/chains.json', 'utf8'));
const files = readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).sort();
if (files.length === 0) {
  console.error(`attest: no <chainId>.json under ${dir}/ — nothing to attest`);
  process.exit(1);
}

let failures = 0;
const fail = (chain, contract, why) => {
  console.error(`attest: FAIL chain ${chain} · ${contract}: ${why}`);
  failures++;
};

for (const file of files) {
  const rec = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const chain = String(rec.chainId);
  if (only && only !== chain) continue;
  if (file !== `${chain}.json`) {
    fail(chain, '-', `${file} declares chainId ${chain}`);
    continue;
  }

  const endpoints = rpcs[chain];
  if (!endpoints || endpoints.length === 0) {
    /* Named rather than skipped: a chain with a deployment record and no endpoint is unattestable,
       which is a gap in the same way a mismatch is. */
    fail(chain, '-', 'no endpoint for this chain in deploy/chains.json');
    continue;
  }
  const rpc = endpoints[0];

  /* The chain is asked who it is before anything is read from it, so a mislabelled or redirected
     endpoint cannot pass one chain's bytes off as another's. */
  let answered;
  try {
    answered = cast('chain-id', '--rpc-url', rpc);
  } catch (e) {
    fail(chain, '-', `${rpc} did not answer: ${String(e.message).split('\n')[0]}`);
    continue;
  }
  if (answered !== chain) {
    fail(chain, '-', `${rpc} answered chain id ${answered}`);
    continue;
  }

  const impl = rec.contracts?.Distribution?.address;
  console.log(`chain ${chain} · ${rpc} · commit ${String(rec.commit).slice(0, 7)}`);

  for (const [name, entry] of Object.entries(rec.contracts ?? {})) {
    let code;
    try {
      code = lower(cast('code', entry.address, '--rpc-url', rpc));
    } catch (e) {
      fail(chain, name, `cast code failed: ${String(e.message).split('\n')[0]}`);
      continue;
    }
    if (code.length === 0) {
      fail(chain, name, `no code at ${entry.address}`);
      continue;
    }

    const got = cast('keccak', `0x${code}`);
    if (lower(got) !== lower(entry.codeKeccak)) {
      fail(chain, name, `the chain's code hashes to ${got}, the record says ${entry.codeKeccak}`);
      continue;
    }

    const { object, immutable } = artifact(name);
    const spans = spansOf(immutable);
    const want = expectation(name, rec);
    if (want === null) {
      fail(chain, name, 'no immutable expectation is defined for this contract — add one rather than skip it');
      continue;
    }
    if (spans.length !== want.length) {
      fail(chain, name, `the build has ${spans.length} immutable span(s); this check knows ${want.length}`);
      continue;
    }

    const bad = compareOutsideSpans(code, object, spans);
    if (bad.length) {
      bad.forEach((why) => fail(chain, name, why));
      continue;
    }

    /* What the spans hold, as a set: a span's offset and its AST id both move between solc builds,
       the addresses do not. */
    const held = spans.map(({ start, length }) => lower(code.slice(start * 2, (start + length) * 2)).replace(/^0+/, ''));
    const expected = want.map((a) => lower(a).replace(/^0+/, ''));
    const missing = expected.filter((a) => !held.includes(a));
    const extra = held.filter((a) => !expected.includes(a));
    if (missing.length || extra.length) {
      fail(
        chain,
        name,
        `the immutables hold [${held.map((h) => `0x${h}`).join(', ')}], expected [${expected.map((h) => `0x${h}`).join(', ')}]`,
      );
      continue;
    }

    const how = spans.length === 0 ? 'byte for byte' : `outside ${spans.length} immutable(s), each holding a recorded address`;
    console.log(`  ${name.padEnd(19)} ${entry.address}  matches this tree ${how}`);
  }
}

if (failures) {
  console.error(`attest: ${failures} failure(s)`);
  process.exit(1);
}
console.log('attest: every recorded address holds the bytes this tree builds');
