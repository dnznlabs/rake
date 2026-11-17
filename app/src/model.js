/* Every helper the dapp needs that touches neither the DOM nor a provider, so it can be tested
   under node and inlined into index.html unchanged.
   Implicit contract: `Eth` is ambient, as it is for index.html's own script — the build inlines
   eth.js first, and test/model.test.mjs puts the same module on globalThis before calling anything
   here. Nothing at module scope reads it, so the order only matters at call time. */
const Model = (() => {
  /* The `Beneficiary` tuple, in one place: `SNAPSHOT_T` is built from it and `beneficiaries()` — the
     one-view fallback for a provider that will not answer `snapshot()` — decodes with it directly. */
  const BENEFICIARY_T = '(address,uint96,string,string)';
  /* The `snapshot()` return type, in one place: every reader of a distribution decodes with this. */
  const SNAPSHOT_T = `(address,uint32,uint32,string,${BENEFICIARY_T}[],(bytes32,uint256,bytes)[])`;
  /* The four `onlySelf` setters a pending action can carry. `transferOwnership(address)` is one call
     with three effects since decision 21 — it nominates, and `address(0)` renounces, and the current
     owner's own address withdraws a nomination still in flight — so it decodes as one and
     `ownerChange` below says which of the three a decoded action is. */
  const SETTERS = [
    [`setBeneficiaries(${BENEFICIARY_T}[])`, 'setBeneficiaries', 'table'],
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

  /** The create screen's owner field as the one line it shows, and whether that line has to be
     acknowledged before the flow goes on (decision 43, #172). `owner` is the field's address,
     checksummed; `acc` is the connected wallet; `probe` is what `probeOwner` answered for `owner`, or
     null while that read is still out. Four readings:
       - the connected wallet, which is the default the screen fills in: no line at all, as before;
       - the zero address, which `create` accepts rather than refusing, so the clone is born renounced
         — permanent from its first block, which is `bad` and acknowledged rather than turned away;
       - any other address, where the probe's own sentence is prefixed to say whose it is not. A
         contract and an account with a history proceed on the line alone; a `warn` — an address that
         has never sent a transaction, which is also what a mistyped one looks like, and equally a
         read that could not be made — is acknowledged first.
     A probe still in flight is the third reading with nothing read yet: `ack`, so Next does not go
     live for the instant before the answer, and classless, which is how the caller tells it from the
     two readings that have a checkbox to draw. */
  function ownerKind(owner, acc, probe) {
    const a = String(owner);
    if (acc && a.toLowerCase() === String(acc).toLowerCase()) return { text: '', cls: '', ack: false };
    if (BigInt(a) === 0n) return { text: 'no owner: nobody can ever change the table, delay or description; this is permanent', cls: 'bad', ack: true };
    if (!probe) return { text: 'not the connected wallet — reading the address…', cls: '', ack: true };
    return { text: `not the connected wallet — ${probe.text}`, cls: probe.cls, ack: probe.cls === 'warn' };
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
       the page holds no second copy of a contract constant; decision 16's cost again.
       #148: that read lands at boot, and a revert can be decoded before it — the create flow runs
       before `S.loaded`, and `S.grace` is `null` until then. Without a grace there is no deadline to
       print, and `deadline()` would throw on the null rather than say so, so the sentence drops its
       date clause and keeps the part that is true either way. */
    '0xf80dbaea': (d, now, grace) => {
      const eta = Eth.dec(['uint256'], d.slice(10))[0];
      if (grace == null) return 'that change expired — anyone may cancel it now';
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
    let s = String(text == null ? '' : text).trim();
    if (!s) return 0n;
    if (s[0] === '.') s = '0' + s; // `.1` is how people type a tenth
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const [whole, frac = ''] = s.split('.');
    if (frac.length > 18) return null;
    return BigInt(whole) * WEI + BigInt((frac + '0'.repeat(18)).slice(0, 18));
  }

  /* ---- log windows (#76) --------------------------------------------------------------------- */

  /** A block range as the list of windows a provider will accept: inclusive `[a, b]` pairs of at most
     `size` blocks, ascending, together covering `from..to` exactly once. `from > to` is no range at
     all — which is what a distribution created in the head block has behind it — and so is a
     non-positive `size`. Numbers, not BigInts: a block height is far inside `Number`'s exact range,
     and the caller hex-encodes them for the wire. */
  function windows(from, to, size) {
    const lo = BigInt(from), hi = BigInt(to), step = BigInt(size);
    if (step <= 0n || hi < lo) return [];
    const out = [];
    for (let a = lo; a <= hi; a += step) {
      const b = a + step - 1n;
      out.push([Number(a), Number(b > hi ? hi : b)]);
    }
    return out;
  }

  /* The two shapes a provider's range refusal takes, both measured against the live endpoints on
     2026-11-07: publicnode's Sepolia answers `-32701 exceed maximum block range: 50000` and
     `sepolia.base.org` answers `-32614 eth_getLogs is limited to a 200 range` under an HTTP 413. The
     number is the window to retry with, so it is read out rather than guessed at by halving. */
  const CAPS = [/block range:\s*(\d+)/i, /limited to a\s+(\d+)\s+range/i];

  /** The window size a provider's error names, or `null` for an error that names none — including a
     pruned-history refusal, which is about which blocks are kept and not about how many were asked
     for, and so is `isPruned`'s to answer. */
  function rangeCap(message) {
    const s = String(message == null ? '' : message);
    for (const re of CAPS) { const m = re.exec(s); if (m) return Number(m[1]); }
    return null;
  }

  /** Whether a provider refused a range because it no longer holds those blocks (publicnode's
     `4444 pruned history unavailable`). No smaller window fixes this one: the history simply stops
     there, and what the page can say is where. */
  function isPruned(message) {
    return /pruned history/i.test(String(message == null ? '' : message));
  }

  /* A third shape, and the only one with no range left in its text: the wallet's own object,
     substituted for whatever the provider said. Measured through MetaMask on Base Sepolia on
     2026-11-17 (#215), where `sepolia.base.org` refuses an over-range `eth_getLogs` at the
     *transport* level — HTTP 413, with `-32614 eth_getLogs is limited to a 200 range` in the body —
     and MetaMask discards that body and hands the page

         { code: -32080, message: 'RPC endpoint returned HTTP client error.',
           data: { httpStatus: 413, cause: null } }

     The identical refusal from publicnode arrives at HTTP 200 with its body intact, which is the
     whole reason `rangeCap` works on Sepolia and found nothing on Base Sepolia. So `CAPS` cannot be
     widened to catch this: there is no number and no word of range left to match. The *shape* is the
     only evidence the substitution leaves — hence an error-object predicate rather than another
     regex, and hence this is not `rangeCap`'s to answer. */

  /** Whether an error is a range refusal a wallet rewrote, leaving no range in its text: code
     `-32080`, or any object carrying an HTTP 413. Shrinks the window like any other nameless
     refusal — `rangeCap` is `null` for it by construction, so the caller halves. Takes the error
     *object*: a string or `null` cannot carry the shape, and is not this. */
  function isWrappedRefusal(e) {
    if (e == null || typeof e !== 'object') return false;
    if (e.code === -32080) return true;
    const d = e.data;
    return d != null && typeof d === 'object' && d.httpStatus === 413;
  }

  /* ---- the finalized-log cache (decision 52) ------------------------------------------------- */

  /* The three pure parts of the store that keeps a distribution's event history between visits: where
     to cut the logs a load read, which records to drop, and what to write back. Each is over plain
     data so it can be driven under node; the store itself — IndexedDB, and every way it can refuse —
     lives in index.html, which is where the DOM and the provider are. */

  /** The logs a load may keep, and the logs it may not: `final` is everything at or below the chain's
     `finalized` block, `tail` the rest. The boundary is inclusive on the final side — a log *in* the
     finalized block is final, since that block is the last one the chain has promised not to replace.
     `blockNumber` arrives as hex off the wire, so it is read as hex and never compared as a string. */
  function splitFinal(logs, finalized) {
    const at = Number(finalized), final = [], tail = [];
    for (const l of logs || []) (parseInt(l.blockNumber, 16) <= at ? final : tail).push(l);
    return { final, tail };
  }

  /** The keys to delete, over `[{ key, visited }]`: every record older than `days`, then, of what is
     left, the least recently visited beyond `cap`. Pure — the store applies it — and in that order,
     because the age rule can take a record out of the way of the count. `days` is read as an age
     rather than as a date, so a record visited exactly `days` ago is still inside the window and
     stays; one second more and it goes. */
  function evict(records, now, { days = 30, cap = 50 } = {}) {
    const ms = Number(days) * 86400000;
    const old = r => Number(now) - Number(r.visited) > ms;
    const stale = (records || []).filter(old);
    /* Newest first, so what falls past `cap` is exactly the least recently visited. */
    const fresh = (records || []).filter(r => !old(r)).sort((a, b) => Number(b.visited) - Number(a.visited));
    return [...stale, ...fresh.slice(Number(cap))].map(r => r.key);
  }

  /** The record a load writes back: the cached logs plus the finalized logs this load read, per kind,
     `through` the finalized block of this load and `first` the lower of the two lower bounds. The
     `load older` pass calls this the same way with the older slice as `live`, which is what lowers
     `first`. `ins` — the address-less `Transfer` query — is kept only where both halves have it: a
     half-read list of other tokens cannot be told from a complete one, which is the rule `older()`
     already applies to the same query. */
  function mergeHist(cached, live) {
    const through = Number(live.through);
    if (!cached) {
      return { first: Number(live.first), through, changes: [...live.changes], funds: [...live.funds], ins: live.ins ? [...live.ins] : null };
    }
    return {
      first: Math.min(Number(cached.first), Number(live.first)),
      through,
      changes: [...cached.changes, ...live.changes],
      funds: [...cached.funds, ...live.funds],
      ins: cached.ins && live.ins ? [...cached.ins, ...live.ins] : null,
    };
  }

  /* Recovering a queued entry's nonce without reading a log. `propose` commits to
     `keccak256(abi.encode(action, nonce))` (`src/Distribution.sol:224`) and `applyQueued` recomputes
     the same hash from the arguments it is handed (`:243`), so the nonce is not extra information the
     chain only emits in an event — it is determined by the hash and the action together, and
     `snapshot()` already returns both the `pending` entries and `nonce`, the count of everything ever
     proposed. Searching down from that count finds it in at most `nonce` keccaks.

     This exists because the apply control used to take the nonce from the `Queued` logs, so a failed
     history read disabled a button whose transaction never needed the logs at all (#215). Cost,
     measured on node v24.12.0 on this host: 10 candidates 6.6 ms, 100 → 22 ms, 1,000 → 187 ms. A
     distribution's `nonce` is its lifetime proposal count, so this is single-digit milliseconds per
     paint for anything real. */

  /** The nonce `hash` commits to for `action`, searching `upTo` down to 1, or `undefined` when none
     reproduces it. Downwards because the entries a page is about to apply are the recent ones. */
  function nonceOf(hash, action, upTo) {
    const want = String(hash == null ? '' : hash).toLowerCase();
    for (let n = Number(upTo); n >= 1; n--) {
      const h = '0x' + Eth.keccak(Eth.hexBytes(Eth.enc('x(bytes,uint32)', [action, n]).slice(10)));
      if (h.toLowerCase() === want) return n;
    }
    return undefined;
  }

  /** EIP-137 namehash, over eth.js's own keccak. */
  function namehash(name) {
    let node = '0'.repeat(64);
    if (name) for (const label of String(name).split('.').reverse()) node = Eth.keccak(Eth.hexBytes(node + Eth.keccak(Eth.utf8(label))));
    return '0x' + node;
  }

  return { SNAPSHOT_T, BENEFICIARY_T, pct, countdown, deadline, dateText, decodePending, ownerChange, ownerKind, supersededBy, salt, revertMessage, tableFrom, parseDelay, wei, namehash, windows, rangeCap, isPruned, isWrappedRefusal, splitFinal, evict, mergeHist, nonceOf };
})();
export default Model;
