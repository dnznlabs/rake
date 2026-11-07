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

   A log that created nothing is exempt, and that is not a loophole: `Chunks.s.sol`'s log is five
   `addChunk` calls with no deploy in it, and nothing reads a creation block out of it. The check is
   on the logs this module actually pairs. */
export function assertPairable(file, log) {
  const txs = log.transactions || [], receipts = log.receipts || [];
  const creations = txs.filter(isCreate);
  if (!creations.length) return;
  if (creations.length === 1 && receipts.length === txs.length) return;
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

/** Every contract `log` created, as `{ name, address, block }`, with `block` null where no receipt
   carries one. Call `assertPairable` first: this function is the pairing the assertion guards. */
export function creations(log) {
  /* Matched by hash rather than by index: the receipt order is forge's, not this file's contract. */
  const blocks = new Map((log.receipts || []).map(r => [r.transactionHash, r.blockNumber]));
  return (log.transactions || []).filter(t => isCreate(t) && t.contractName).map(t => ({
    name: t.contractName,
    address: t.contractAddress,
    block: blocks.has(t.hash) ? blocks.get(t.hash) : null,
  }));
}
