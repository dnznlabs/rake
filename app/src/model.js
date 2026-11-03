/* Every helper the dapp needs that touches neither the DOM nor a provider, so it can be tested
   under node and inlined into index.html unchanged.
   Implicit contract: `Eth` is ambient, as it is for index.html's own script — the build inlines
   eth.js first, and test/model.test.mjs puts the same module on globalThis before calling anything
   here. Nothing at module scope reads it, so the order only matters at call time. */
const Model = (() => {
  const BENEFICIARY = '(address,uint96,string,string)';
  /* The `snapshot()` return type, in one place: every reader of a distribution decodes with this. */
  const SNAPSHOT_T = `(address,uint32,uint32,string,${BENEFICIARY}[],(bytes32,uint256,bytes)[])`;
  /* The four `onlySelf` setters a pending action can carry. `transferOwnership(address)` is one call
     with three effects since decision 21 — it nominates, and `address(0)` renounces, and the current
     owner's own address withdraws a nomination still in flight — so it decodes as one and
     `ownerChange` below says which of the three a decoded action is. */
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

  /** Seconds, as the chain counts them: `3d 14h`, then `ready to apply` once `now` passes `eta`. With
     a `grace`, the far end of the window is read too: an action more than `grace` past its eta is
     `expired`, which is what `applyQueued` answers from that instant on
     (`src/Distribution.sol:249`). Every caller that passes two arguments is unchanged, which is every
     countdown that is not a pending view's. */
  function countdown(eta, now, grace) {
    if (grace != null && Number(now) > Number(eta) + Number(grace)) return 'expired';
    const left = Number(eta) - Number(now);
    if (left <= 0) return 'ready to apply';
    const d = Math.floor(left / DAY), h = Math.floor((left % DAY) / HOUR), m = Math.floor((left % HOUR) / MINUTE);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return m ? `${m}m` : 'under a minute';
  }

  /** The last instant a queued action can still be applied: `eta + GRACE`, a BigInt because both
     numbers come off the chain as one. The boundary itself is inside the window on both sides —
     `applyQueued` lands at `eta + GRACE` and a stranger's `cancel` is still refused there
     (`src/Distribution.sol:249,266`) — so this is the last applicable second, not the first dead one. */
  function deadline(eta, grace) {
    return BigInt(eta) + BigInt(grace);
  }

  /** A chain timestamp as the one date this page prints. UTC to the minute: a block carries no zone,
     and a locale string would read differently on every machine that loaded the same document. */
  function dateText(when) {
    return new Date(Number(when) * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }

  /** A pending action's calldata as the setter it calls, or its selector when it is none of them. */
  function decodePending(action) {
    for (const [sig, kind, field] of SETTERS) {
      const args = Eth.decCall(sig, action);
      if (args) return { kind, [field]: args[0] };
    }
    return { kind: 'unknown', selector: String(action).slice(0, 10) };
  }

  /** Which of `transferOwnership`'s three effects a decoded action carries: `renounce` for the zero
     address, `withdraw` where it names `owner` — the two-step ABI's way to take a nomination back —
     and `nominate` for any other address. `owner` is who the action is read against; a log does not
     carry the owner of the moment it was written, so without one the reading is `nominate`, which is
     what the call does either way. */
  function ownerChange(p, owner) {
    if (BigInt(p.owner) === 0n) return 'renounce';
    const self = owner && String(p.owner).toLowerCase() === String(owner).toLowerCase();
    return self ? 'withdraw' : 'nominate';
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
     value is what the page says instead of the four bytes. Two of them carry data: `NotReady`'s eta
     reads as the same countdown the pending block already prints, and `ReleaseFailed`'s token is
     deliberately not printed — the release button it answers already names the token. */
  const ERRORS = {
    '0x30cd7471': () => 'only the owner can do that',                                     // NotOwner()
    '0x40da0647': () => 'the table must total 100%, every share above zero, ascending by address', // BadTable()
    /* NotReady(uint256) covers two conditions: `eta == 0` is "never queued, or already applied or
       cancelled", and a non-zero eta in the future is the delay still running. A countdown is only an
       answer to the second, so the zero is read as what it is. */
    '0x5a997526': (d, now) => {
      const eta = Eth.dec(['uint256'], d.slice(10))[0];
      return eta === 0n
        ? 'that change is not queued here — it has already been applied or cancelled'
        : `the delay has not passed — ${countdown(eta, now)}`;
    },
    /* Expired(uint256 eta) carries the eta, not the deadline, so the date here is `eta + GRACE` — the
       far end of the window `applyQueued` refused it past. `grace` is the boot read's (`S.grace`), so
       the page holds no second copy of a contract constant; decision 16's cost again. */
    '0xf80dbaea': (d, now, grace) => {
      const eta = Eth.dec(['uint256'], d.slice(10))[0];
      return `that change expired — it could be applied until ${dateText(deadline(eta, grace))} and anyone may cancel it now`;
    },
    '0x5c52a868': () => 'nothing to do — there is nothing waiting here',                   // NothingToDo()
    '0x0f2e5b6c': () => 'locked — another call on this contract is still running',         // Locked()
    /* ReleaseFailed(address token): decision 24's threshold swallows an argument-less custom error
       too, so a token that reverted `Refused()` arrives here as well — "no reason" is exact for both,
       and for the bare `false` the push path turns into one. */
    '0xca0b64e5': () => 'retry failed — the token gave no reason',                         // ReleaseFailed(address)
    /* One message for both callers: the `init`/`receive` guards, and a wrong account pressing
       accept, which `acceptOwnership()` refuses with the same four bytes. */
    '0x82b42900': () => 'this contract will not take that call from this account',         // Unauthorized()
    '0x30116425': () => 'a distribution already exists at that address',                   // DeploymentFailed()
    '0x0c4549ef': () => 'that salt belongs to another wallet',                             // SaltDoesNotStartWith()
  };

  /** Revert bytes as the one line the page shows. `now` is seconds, for `NotReady`'s countdown, and
     `grace` is `GRACE()` as the page read it, for `Expired`'s date. */
  function revertMessage(data, now, grace) {
    const d = String(data == null ? '' : data);
    if (!d || d === '0x') return 'reverted';
    /* #20: `_balance` bubbles whatever `balanceOf` reverted with, unguarded (`src/Distribution.sol:308`),
       so a token whose balance read reverts with one bare word — 32 bytes, no selector in front of
       them — still reaches here through `distribute`. `release` no longer does: it names
       `ReleaseFailed(token)` above. */
    if (d.length === 66) return 'the token refused the call';
    const known = ERRORS[d.slice(0, 10).toLowerCase()];
    return known ? known(d, now, grace) : `reverted (${d.slice(0, 10)})`;
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

  return { SNAPSHOT_T, pct, countdown, deadline, dateText, decodePending, ownerChange, supersededBy, salt, revertMessage, tableFrom, parseDelay, wei, namehash };
})();
export default Model;
