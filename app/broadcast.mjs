/* A forge broadcast log, read for the contracts it created and the blocks they landed in.

   `run-latest.json` carries `transactions` and `receipts` as two lists, and the only thing joining
   them is `transactions[i].hash === receipts[j].transactionHash` — the orders are forge's, not the
   script's, which is why the pairing is by hash rather than by index. m03-t06 found that the join is
   not always sound: a `run-latest.json` can file a receipt under the wrong transaction object. A
   creation block read off a mispaired receipt is a plausible-looking `fromBlock` that silently starts
   a log scan in the wrong place, so a build that cannot trust the pairing refuses instead of
   guessing (rake#140).

   One creation per script *bounds the damage*: with a single `CREATE`/`CREATE2` in the log, at most
   one contract can take a block that is not its own. It is not what makes the pairing safe — a log
   with two transactions under one hash and a receipt each passes a count test and still hands the
   creation the other transaction's block, which is the mis-filing m03-t06 found and the defect
   `SECURITY.md` § Front end row R8 names. The checks that make it safe are the join's own: hashes
   unique on both lists, the two sets equal, and the creation's receipt agreeing with it. */
import Eth from './src/eth.js';

/** A `CREATE` or a `CREATE2`. Both: a salted `new` is routed through the keyless proxy, so the
   deploys this reads are logged `CREATE2` and a `CREATE`-only filter resolves nothing. */
export const isCreate = t => t.transactionType === 'CREATE' || t.transactionType === 'CREATE2';

/** The keyless CREATE2 deployer every salted deploy in this repo is routed through
   (`scripts/forge/Deploy.s.sol:11-13`, ROADMAP decision 33). A transaction sent to it carries the
   32-byte salt followed by the init code, which is everything the address is a function of — so an
   address logged beside that input can be recomputed rather than believed. */
export const PROXY = '0x4e59b44847b379578588920ca78fbf26c0b4956c';

/** The CREATE2 address of `initCode` placed by `deployer` under `salt`, checksummed:
   `keccak(0xff ‖ deployer ‖ salt ‖ keccak(initCode))`, low 20 bytes. `salt` and `initCode` may carry
   a `0x` prefix or not. */
export function create2(deployer, salt, initCode) {
  const hex = v => String(v).replace(/^0x/, '');
  return Eth.checksum('0x' + Eth.keccak(Eth.hexBytes(
    'ff' + hex(deployer) + hex(salt) + Eth.keccak(Eth.hexBytes(hex(initCode))),
  )).slice(24));
}

/** 20 hex bytes. `Eth.checksum` (`app/src/eth.js:188-191`) lowercases and re-cases its input but
   passes every other character through, so it is not a filter and cannot stand in for this. */
const isAddr = v => /^0x[0-9a-fA-F]{40}$/.test(v);

/** Throws unless `log`'s creation block can be trusted to the transaction that made it. `file` names
   the log in the message.

   Called where a block from this log is actually *wanted*, not on every log read: a log that created
   nothing has no block to misread (`Chunks.s.sol` is five `addChunk` calls, `Seed.s.sol` three
   sends), and `Fixtures.s.sol` creates four test mocks in one broadcast whose blocks nothing has ever
   asked for. Refusing those outright would make `make fixtures` fatal to the next `make dapp` while
   protecting a figure no bundle reads. */
export function assertPairable(file, log) {
  const txs = log.transactions || [], receipts = log.receipts || [];
  const creations = txs.filter(isCreate);
  if (!creations.length) return;
  if (pairable(log)) return;
  throw new Error(
    `build: ${file} has ${creations.length} creations and ${receipts.length} receipts for `
    + `${txs.length} transactions, so a creation block read from it cannot be trusted.\n`
    + `What is wrong with it: ${joinFault(log)}.\n`
    + 'One creation per script bounds the damage; the join checks are what make it safe — see\n'
    + 'rake#140. A receipt is joined to its transaction by hash, and m03-t06 found that join filing\n'
    + 'a hash under the wrong transaction — which would give a contract the creation block of some\n'
    + 'other call, and a log scan starting there loses the history in between. Split the script, or\n'
    + 'pass the address and block with --set.',
  );
}

/** The one test of the join that `log` fails, as the clause `assertPairable` names, or `null` where
   it fails none. A reader of a refusal needs to know what is wrong with the log, not only that
   something is.

   The clauses are ordered so the first one that fires is the one that describes the log: a missing
   receipt is reported as the missing receipt even when the receipt list also repeats a hash, since
   the repeat is how it went missing. */
export function joinFault(log) {
  const txs = log.transactions || [], receipts = log.receipts || [];
  const creates = txs.filter(isCreate);
  if (creates.length !== 1) return `it has ${creates.length} creations and one is the only count a hash join can resolve`;
  if (receipts.length !== txs.length) return `it has ${receipts.length} receipts for ${txs.length} transactions`;
  /* (B1) Unique on both lists. Without this a log with two transactions under one hash and two
     receipts passes every count test — and passes the set equality below too, since the two sets are
     then both `{the one hash}` — while `blocks.get(hash)` hands the creation whichever receipt the
     Map kept, which is the other transaction's block. `repeated` only names the hash for the
     message; the test is the size. */
  const repeated = list => list.find((h, i) => list.indexOf(h) !== i);
  const txHashes = txs.map(t => t.hash);
  if (new Set(txHashes).size !== txHashes.length) return `two transactions share hash ${repeated(txHashes)}`;
  /* (B2) The two sets equal. With B1 and equal counts, that is one receipt per hash. */
  const byTx = new Set(txHashes);
  const receiptHashes = receipts.map(r => r.transactionHash);
  const byReceipt = new Set(receiptHashes);
  const orphanTx = txs.find(t => !byReceipt.has(t.hash));
  if (orphanTx) return `transaction ${orphanTx.hash} has no receipt`;
  const orphanReceipt = receipts.find(r => !byTx.has(r.transactionHash));
  if (orphanReceipt) return `receipt ${orphanReceipt.transactionHash} has no transaction`;
  if (byReceipt.size !== receiptHashes.length) return `two receipts share hash ${repeated(receiptHashes)}`;
  /* (B3) And the creation's own receipt agrees with it. A receipt through the proxy carries
     `contractAddress: null` — read on both tracked logs 2026-11-18 — and a plain `CREATE` carries
     the address, so the comparison is made only where there is something to compare. */
  const c = creates[0];
  const r = receipts.find(x => x.transactionHash === c.hash);
  if (r.contractAddress != null
    && String(r.contractAddress).toLowerCase() !== String(c.contractAddress).toLowerCase()) {
    return `the creation's receipt names ${r.contractAddress} and the transaction ${c.contractAddress}`;
  }
  if (r.status != null && r.status !== '0x1') return `the creation's receipt has status ${r.status}`;
  return null;
}

/** Whether a creation block read out of `log` can be trusted to its contract: one creation, a
   receipt for every transaction, and a hash join that holds. `assertPairable` is the same question
   asked fatally, and `joinFault` is the same question asked for its reason. */
export function pairable(log) {
  return joinFault(log) === null;
}

/** Every contract `log` created, as `{ name, address, block, args }`.

   The address comes off the transaction itself, so it is sound whatever the receipts say. The block
   does not — it comes off the hash join — so it is `null` unless the log is `pairable`, and `null`
   again where the matched receipt carries no block. A withheld block is not a silent omission: the
   caller offers no `<NAME>_BLOCK` for it, and a bundle that needs one then refuses by name rather
   than substituting a figure nothing can stand behind.

   `args` are the constructor arguments forge recorded, in order, or `null` where the log names
   none. They come off the transaction like the address, so they are as sound as it is: the page's
   version string is read from `App`'s (ROADMAP decision 45, `app/version.mjs`), which is what keeps
   `v0.1` in one place instead of two.

   Every address is checked for its shape and, where the log carries what the address is a function
   of, recomputed from it: a creation routed through `PROXY` logs the salt and the init code in its
   own `transaction.input`, so a replacement address is not a value this has to take on trust.
   `file` names the log in those messages. */
export function creations(log, file = 'the log') {
  /* Matched by hash rather than by index: the receipt order is forge's, not this file's contract. */
  const blocks = new Map((log.receipts || []).map(r => [r.transactionHash, r.blockNumber]));
  const trust = pairable(log);
  const out = [];
  for (const t of (log.transactions || []).filter(t => isCreate(t) && t.contractName)) {
    /* (A3) Before `Eth.checksum` ever sees it: checksum is a re-casing, not a filter. */
    if (!isAddr(t.contractAddress)) {
      throw new Error(`build: ${file} logs ${t.contractName} at ${JSON.stringify(t.contractAddress)}, `
        + 'which is not an address of 20 hex bytes');
    }
    /* (A4) A creation through the keyless proxy is a function of the salt and the init code the log
       itself carries, so it is recomputed and asserted. A creation *not* through the proxy — a plain
       `CREATE`, which is what `Fixtures.s.sol`'s four mocks are — follows a nonce the log does not
       record and so cannot be recomputed from it; its address is left as logged. */
    const input = t.transaction && t.transaction.input;
    if (t.transaction && String(t.transaction.to).toLowerCase() === PROXY && typeof input === 'string') {
      const computed = create2(PROXY, input.slice(2, 66), '0x' + input.slice(66));
      if (computed.toLowerCase() !== t.contractAddress.toLowerCase()) {
        throw new Error(`build: ${file} logs ${t.contractName} at ${t.contractAddress}, but its own salt `
          + `and init code\n       through ${PROXY} computed ${computed}`);
      }
    }
    out.push({
      name: t.contractName,
      address: t.contractAddress,
      block: trust && blocks.has(t.hash) ? blocks.get(t.hash) : null,
      args: t.arguments || null,
    });
    /* The implementation the factory clones is created inside the factory's own constructor, so it
       is an `additionalContracts` entry rather than a transaction of its own — placed by the factory
       under salt zero (`src/Distribution.sol:439`, `salt: bytes32(0)`). It is yielded because the
       page needs its address as a build constant (R18), and recomputed on the same terms as the
       factory. No other additional contract is yielded or asserted: nothing substitutes one, and a
       figure nothing reads is not worth a refusal. */
    for (const a of t.additionalContracts || []) {
      if (a.contractName !== 'Distribution') continue;
      if (!isAddr(a.address)) {
        throw new Error(`build: ${file} logs ${a.contractName} at ${JSON.stringify(a.address)}, `
          + 'which is not an address of 20 hex bytes');
      }
      const computed = create2(t.contractAddress, '0x' + '00'.repeat(32), a.initCode);
      if (computed.toLowerCase() !== a.address.toLowerCase()) {
        throw new Error(`build: ${file} logs ${a.contractName} at ${a.address}, but its own init code\n`
          + `       under salt zero through ${t.contractAddress} computed ${computed}`);
      }
      out.push({ name: a.contractName, address: a.address, block: null, args: null });
    }
  }
  return out;
}
