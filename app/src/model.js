/* Every helper the dapp needs that touches neither the DOM nor a provider, so it can be tested
   under node and inlined into index.html unchanged.
   Implicit contract: `Eth` is ambient, as it is for index.html's own script — the build inlines
   eth.js first, and test/model.test.mjs puts the same module on globalThis before calling anything
   here. Nothing at module scope reads it, so the order only matters at call time. */
const Model = (() => {
  const BENEFICIARY = '(address,uint96,string,string)';
  /* The `snapshot()` return type, in one place: every reader of a distribution decodes with this. */
  const SNAPSHOT_T = `(address,uint32,uint32,string,${BENEFICIARY}[],(bytes32,uint256,bytes)[])`;
  /* The four `onlySelf` setters a pending action can carry. `transferOwnership(address(0))` is the
     renounce; it is the same call, so it decodes as one. */
  const SETTERS = [
    [`setBeneficiaries(${BENEFICIARY}[])`, 'setBeneficiaries', 'table'],
    ['setDescription(string)', 'setDescription', 'description'],
    ['setDelay(uint32)', 'setDelay', 'delay'],
    ['transferOwnership(address)', 'transferOwnership', 'owner'],
  ];
  const DAY = 86400, HOUR = 3600, MINUTE = 60;
  const UNITS = { d: DAY, h: HOUR, m: MINUTE, s: 1 };
  const WEI = 10n ** 18n;

  /** Basis points as a percentage with no trailing zeros: 6000 → `60%`, 3333 → `33.33%`. */
  function pct(bps) {
    const n = Number(bps), frac = String(n % 100).padStart(2, '0').replace(/0+$/, '');
    return Math.floor(n / 100) + (frac ? '.' + frac : '') + '%';
  }

  /** Seconds, as the chain counts them: `3d 14h`, then `ready to apply` once `now` passes `eta`. */
  function countdown(eta, now) {
    const left = Number(eta) - Number(now);
    if (left <= 0) return 'ready to apply';
    const d = Math.floor(left / DAY), h = Math.floor((left % DAY) / HOUR), m = Math.floor((left % HOUR) / MINUTE);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return m ? `${m}m` : 'under a minute';
  }

  /** A pending action's calldata as the setter it calls, or its selector when it is none of them. */
  function decodePending(action) {
    for (const [sig, kind, field] of SETTERS) {
      const args = Eth.decCall(sig, action);
      if (args) return { kind, [field]: args[0] };
    }
    return { kind: 'unknown', selector: String(action).slice(0, 10) };
  }

  /** The account a one-row table at 100% forwards to — decision 6's supersession — else null. */
  function supersededBy(table) {
    return table.length === 1 && BigInt(table[0][1]) === 10000n ? table[0][0] : null;
  }

  /** A sender-bound salt (decision 10): the sender in the top 20 bytes, `n` in the low 12. */
  function salt(sender, n) {
    return '0x' + String(sender).replace(/^0x/, '').toLowerCase() + BigInt(n).toString(16).padStart(24, '0');
  }

  /* Every custom error a write from this page can provoke, by the selector `cast sig` gives it. The
     value is what the page says instead of the four bytes; `NotReady` is the only one carrying data,
     and its eta reads as the same countdown the pending block already prints. */
  const ERRORS = {
    '0x30cd7471': () => 'only the owner can do that',                                     // NotOwner()
    '0x40da0647': () => 'the table must total 100%, every share above zero, ascending by address', // BadTable()
    '0x5a997526': (d, now) => `the delay has not passed — ${countdown(Eth.dec(['uint256'], d.slice(10))[0], now)}`, // NotReady(uint256)
    '0x5c52a868': () => 'nothing to do — there is nothing waiting here',                   // NothingToDo()
    '0x0f2e5b6c': () => 'locked — another call on this contract is still running',         // Locked()
    '0x82b42900': () => 'this contract will not take that call',                           // Unauthorized()
    '0x30116425': () => 'a distribution already exists at that address',                   // DeploymentFailed()
    '0x0c4549ef': () => 'that salt belongs to another wallet',                             // SaltDoesNotStartWith()
  };

  /** Revert bytes as the one line the page shows. `now` is seconds, for `NotReady`'s countdown. */
  function revertMessage(data, now) {
    const d = String(data == null ? '' : data);
    if (!d || d === '0x') return 'reverted';
    // #20: `release` bubbles the token's own `false` word — 32 bytes, no selector in front of them.
    if (d.length === 66) return 'retry failed';
    const known = ERRORS[d.slice(0, 10).toLowerCase()];
    return known ? known(d, now) : `reverted (${d.slice(0, 10)})`;
  }

  /** The editor's rows as the tuple array `Eth.enc` takes: percent to bps, and ascending by account
     because `BadTable` rejects every other order. The rows themselves are never reordered — the hint
     under the submit says which order is sent. */
  function tableFrom(rows) {
    return rows.map(r => [r.addr, Math.round((parseFloat(r.pct) || 0) * 100), r.name, r.note || ''])
      .sort((a, b) => (BigInt(a[0]) < BigInt(b[0]) ? -1 : BigInt(a[0]) > BigInt(b[0]) ? 1 : 0));
  }

  /** A delay as the field takes it — `7d`, `48h`, `30m`, or bare seconds — or null. Zero is legal. */
  function parseDelay(text) {
    const m = /^(\d+)\s*(d|h|m|s)?$/i.exec(String(text == null ? '' : text).trim());
    return m ? Number(m[1]) * UNITS[(m[2] || 's').toLowerCase()] : null;
  }

  /** A decimal amount of ETH as wei. An empty field is `0n`: the deposit is optional. Null is "not a
     number", which the field reports rather than sending. */
  function wei(text) {
    const s = String(text == null ? '' : text).trim();
    if (!s) return 0n;
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const [whole, frac = ''] = s.split('.');
    if (frac.length > 18) return null;
    return BigInt(whole) * WEI + BigInt((frac + '0'.repeat(18)).slice(0, 18));
  }

  /** EIP-137 namehash, over eth.js's own keccak. */
  function namehash(name) {
    let node = '0'.repeat(64);
    if (name) for (const label of String(name).split('.').reverse()) node = Eth.keccak(Eth.hexBytes(node + Eth.keccak(Eth.utf8(label))));
    return '0x' + node;
  }

  return { SNAPSHOT_T, pct, countdown, decodePending, supersededBy, salt, revertMessage, tableFrom, parseDelay, wei, namehash };
})();
export default Model;
