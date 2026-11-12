/* A forge broadcast log, read for the contracts it created and the blocks they landed in.

   `run-latest.json` carries `transactions` and `receipts` as two lists, and the only thing joining
   them is `transactions[i].hash === receipts[j].transactionHash` — the orders are forge's, not the
   script's, which is why the pairing is by hash rather than by index. m03-t06 found that the join is
   not always sound: a `run-latest.json` can file a receipt under the wrong transaction object. A
   creation block read off a mispaired receipt is a plausible-looking `fromBlock` that silently starts
   a log scan in the wrong place, so a build that cannot trust the pairing refuses instead of
   guessing (rake#140).

   One creation per script is what makes it safe: with a single `CREATE`/`CREATE2` in the log there is
   only one answer the pairing can give, whichever receipt it picks up. */

/** A `CREATE` or a `CREATE2`. Both: a salted `new` is routed through the keyless proxy, so the
   deploys this reads are logged `CREATE2` and a `CREATE`-only filter resolves nothing. */
export const isCreate = t => t.transactionType === 'CREATE' || t.transactionType === 'CREATE2';

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
    + 'One creation per script is what makes the pairing safe; see rake#140. A receipt is joined to\n'
    + 'its transaction by hash, and m03-t06 found that join filing a hash under the wrong\n'
    + 'transaction — which would give a contract the creation block of some other call, and a log\n'
    + 'scan starting there loses the history in between. Split the script, or pass the address and\n'
    + 'block with --set.',
  );
}

/** Whether a creation block read out of `log` can be trusted to its contract: one creation, and a
   receipt for every transaction. `assertPairable` is the same question asked fatally. */
export function pairable(log) {
  const txs = log.transactions || [], receipts = log.receipts || [];
  return txs.filter(isCreate).length === 1 && receipts.length === txs.length;
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
   `v0.1` in one place instead of two. */
export function creations(log) {
  /* Matched by hash rather than by index: the receipt order is forge's, not this file's contract. */
  const blocks = new Map((log.receipts || []).map(r => [r.transactionHash, r.blockNumber]));
  const trust = pairable(log);
  return (log.transactions || []).filter(t => isCreate(t) && t.contractName).map(t => ({
    name: t.contractName,
    address: t.contractAddress,
    block: trust && blocks.has(t.hash) ? blocks.get(t.hash) : null,
    args: t.arguments || null,
  }));
}
