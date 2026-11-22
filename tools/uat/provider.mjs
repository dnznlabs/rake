/* The injected EIP-1193 provider, in two halves.
   In the page: an object that forwards every call to one exposed function, because the page takes
   `window.ethereum` when nothing announces over EIP-6963 (`app/src/index.html:102-107`).
   In node: reads go to the chain's public endpoint, and `eth_sendTransaction` becomes a `cast send`
   with the engineer's keystore — the key is never in this tree and never printed. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

export const CAST = `${process.env.HOME}/.foundry/bin/cast`;
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
export function makeRpc({ chainId, rpcUrl, sender, log }) {
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
        const res = await fetch(rpcUrl, {
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
export async function payIn({ to, ether, rpcUrl }) {
  const { stdout } = await run(CAST, [
    'send', to, '--value', `${ether}ether`,
    '--rpc-url', rpcUrl, '--account', ACCOUNT, '--password-file', PASS, '--json',
  ], { maxBuffer: 1 << 24 });
  return JSON.parse(stdout);
}

/** Any read or write the script asks for with `cast` rather than through the page. */
export async function castSend(args, rpcUrl) {
  const { stdout } = await run(CAST, [...args, '--rpc-url', rpcUrl, '--account', ACCOUNT, '--password-file', PASS, '--json'], { maxBuffer: 1 << 24 });
  return JSON.parse(stdout);
}
export async function castCall(args, rpcUrl) {
  const { stdout } = await run(CAST, [...args, '--rpc-url', rpcUrl], { maxBuffer: 1 << 24 });
  return stdout.trim();
}
