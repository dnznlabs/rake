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

  return { SNAPSHOT_T, pct, countdown, decodePending, supersededBy, salt };
})();
export default Model;
