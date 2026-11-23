/* The injected EIP-1193 provider, in two halves.
   In the page: an object that forwards every call to one exposed function, because the page takes
   `window.ethereum` when nothing announces over EIP-6963 (`app/src/index.html:102-107`).
   In node: reads go to the chain's public endpoint, and `eth_sendTransaction` becomes a `cast send`
   with the engineer's keystore — the key is never in this tree and never printed. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

/* `execFile`'s own error says only "Command failed" and drops what the tool printed, which turned one
   transient endpoint error into a run that could not say why it stopped. Everything here goes through
   this wrapper so a failure carries `cast`'s own words. */
async function run(cmd, args, opts) {
  try { return await exec(cmd, args, opts); } catch (e) {
    const detail = [e.stderr, e.stdout].map(s => String(s || '').trim()).filter(Boolean).join(' | ').slice(0, 600);
    const err = new Error(`${args[0]} failed: ${detail || e.message}`);
    err.stderr = e.stderr; err.stdout = e.stdout; err.code = e.code;
    throw err;
  }
}

/** One retry for a send that never reached the chain, decided by the account nonce rather than by
    reading the error: a pay-in retried after it landed would pay twice. */
async function sendOnce(args, rpcUrl, sender) {
  const nonceOf = async () => Number((await exec(CAST, ['nonce', sender, '--rpc-url', rpcUrl])).stdout.trim());
  const before = await nonceOf();
  try { return JSON.parse((await run(CAST, args, { maxBuffer: 1 << 24 })).stdout); } catch (e) {
    const after = await nonceOf();
    if (after > before) throw new Error(`${e.message} — and the nonce moved ${before} → ${after}, so something was sent; not retrying`);
    const retry = JSON.parse((await run(CAST, args, { maxBuffer: 1 << 24 })).stdout);
    retry.retried = true;
    return retry;
  }
}

/* `cast` from `PATH`, not from a path of mine: whichever foundry the caller has is the one the run
   should use, and a missing one fails with its own message rather than a wrong absolute path. */
export const CAST = process.env.RAKE_UAT_CAST || 'cast';
export const PASS = process.env.RAKE_UAT_PASSFILE || `${process.env.HOME}/.config/elanik-wallet/keystore.pass`;
export const ACCOUNT = process.env.RAKE_UAT_ACCOUNT || 'elanik';

export const PAGE_SCRIPT = `(() => {
  const listeners = {};
  window.ethereum = {
    isMetaMask: false,
    _uat: true,
    request: args => window.__uatRpc(args && args.method, (args && args.params) || []),
    on: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeListener: () => {},
  };
})();`;

/** The node half. `log` receives every method so a run can be read after the fact. */
/* `readUrl` is the endpoint the **wallet** reads through, when it is not the page's own (#400).
   Until this existed the injected provider always relayed to the chain's `PUBLIC_RPC` entry, so a
   wallet could not be worse than the page and the one failure that mattered was invisible to every
   row here: on Base Sepolia a real wallet reads through `sepolia.base.org`, 200 blocks a log query.
   Writes stay on `rpcUrl` whatever this is set to — a narrow read endpoint is no reason to broadcast
   somewhere a run did not choose. `tools/uat/wallet-rpc.mjs` is the read-only driver for the same
   asymmetry. */
export function makeRpc({ chainId, rpcUrl, readUrl, sender, log }) {
  const reads = readUrl || rpcUrl;
  const sent = [];
  const rpc = async (method, params) => {
    log?.(method);
    switch (method) {
      case 'eth_chainId':
        return '0x' + Number(chainId).toString(16);
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return [sender];
      case 'wallet_requestPermissions':
        return [{ parentCapability: 'eth_accounts' }];
      case 'wallet_switchEthereumChain':
        return null;
      case 'eth_sendTransaction': {
        const tx = params[0] || {};
        const args = [
          'send', tx.to, tx.data && tx.data !== '0x' ? tx.data : '0x',
          '--rpc-url', rpcUrl, '--account', ACCOUNT, '--password-file', PASS, '--json',
        ];
        if (tx.value && BigInt(tx.value) > 0n) args.push('--value', BigInt(tx.value).toString());
        const { stdout } = await run(CAST, args, { maxBuffer: 1 << 24 });
        const receipt = JSON.parse(stdout);
        sent.push({ to: tx.to, hash: receipt.transactionHash, status: receipt.status });
        if (receipt.status !== '0x1') throw new Error(`cast send reverted: ${receipt.transactionHash}`);
        return receipt.transactionHash;
      }
      default: {
        const res = await fetch(reads, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });
        const body = await res.json();
        if (body.error) { const e = new Error(body.error.message); e.code = body.error.code; e.data = body.error.data; throw e; }
        return body.result;
      }
    }
  };
  return { rpc, sent };
}

/** One plain ETH transfer, for row (g)'s pay-in, which the page does not send. */
export async function payIn({ to, ether, rpcUrl, sender }) {
  return sendOnce([
    'send', to, '--value', `${ether}ether`,
    '--rpc-url', rpcUrl, '--account', ACCOUNT, '--password-file', PASS, '--json',
  ], rpcUrl, sender);
}

/** Any read or write the script asks for with `cast` rather than through the page. */
export async function castSend(args, rpcUrl, sender) {
  return sendOnce([...args, '--rpc-url', rpcUrl, '--account', ACCOUNT, '--password-file', PASS, '--json'], rpcUrl, sender);
}
export async function castCall(args, rpcUrl) {
  const { stdout } = await run(CAST, [...args, '--rpc-url', rpcUrl], { maxBuffer: 1 << 24 });
  return stdout.trim();
}
