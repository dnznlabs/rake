# Rake `App` — One Dollar Audit, engagement 1273

> **A commissioned external review, filed here verbatim.** It was produced by One Dollar Audit
> (LeftClaw Services) against the **deployed, Sourcify-verified source** — not against this
> repository, and not by rake's own two-leg method.
>
> | | |
> |:--|:--|
> | Hosted report (HTML) | <https://leftclaw.services/result/1273.html> |
> | Delivered markdown, on IPFS | `bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde` — <https://bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde.ipfs.community.bgipfs.com/> |
> | Engagement record | <https://www.onedollaraudit.com/audit/1273> · job detail <https://leftclaw.services/jobs/1273> |
> | Target | `App` [`0x00a9F390A6010d045e0d34856048DdD6910d25BA`](https://basescan.org/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA), Base (8453); the same source is verified at the same address on Ethereum (1) and Base Sepolia (84532) |
> | Commissioned | 2026-11-26 18:06:30 CST; report dated 2026-11-27 UTC, pulled 2026-11-27T01:29Z |
> | Severity counts, as filed | 0 Critical · 0 High · 1 Medium · 13 Low · 8 Informational |
>
> **Everything below the marker is the delivered file, byte for byte.** The IPFS CID above is of
> those bytes, so the copy is checkable without trusting this repository:
>
> ```sh
> awk 'f{print} /^<!-- DELIVERED REPORT BEGINS -->$/{f=1}' report.md > /tmp/1273.md
> # CIDv1, raw codec, sha2-256 of /tmp/1273.md == bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde
> curl -sS -L "https://bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde.ipfs.community.bgipfs.com/" | cmp - /tmp/1273.md && echo identical
> ```
>
> Dispositions are **not** in this file and are not the auditor's to make: the index for this date is
> [`AUDIT.md`](../../AUDIT.md), the method and what an external review is here are in
> [`audits/README.md`](../../../README.md) § External commissioned reviews, and the project's
> security posture is [`SECURITY.md`](../../../../SECURITY.md).

<!-- DELIVERED REPORT BEGINS -->
# Security Audit — Rake `App` (on-chain dapp host)

**LeftClaw job:** 1273 · **Date:** 2026-11-27 · **Method:** deep-audit v3 (x-ray pre-scan → context → 6 checklist agents → 12 blind attack agents → reconciliation)

## Audit target (pin)

- **On-chain source:** `0x00a9F390A6010d045e0d34856048DdD6910d25BA` on **Base, chain id 8453** — contract `App` (`src/App.sol`), Sourcify **exact match** (creation and runtime), verified 2026-11-22. Deployment tx `0x96a64bcb5a59f1812efd68fb952fe97f6b013876b7f5e103ba3789b82fd58b19`, block 60,731,271.
- **Fetch what was read:** `https://sourcify.dev/server/v2/contract/8453/0x00a9F390A6010d045e0d34856048DdD6910d25BA?fields=sources`
- **Compiler:** solc 0.8.38, via-IR, optimizer 1000 runs, EVM version `cancun`.
- **In scope:** `src/App.sol` (214 lines, 147 nSLOC). **Context only:** `lib/solady/src/auth/Ownable.sol`, `lib/solady/src/utils/SSTORE2.sol`, `lib/solady/src/utils/Base64.sol` (vendored Solady; inherited `Ownable` entry points are part of `App`'s surface and were covered).
- **No repository or commit was supplied.** The job description is `Rake App Contract: 0x00a9…25BA` with no chain named. Base was taken as the target (the job system runs on Base and the address is verified there). The same address is also verified with byte-identical source on **Ethereum (1)** and **Base Sepolia (84532)**; their live state was read for the cross-chain findings, and every code finding applies to all three.
- **No tests, deploy scripts or documentation** were available (verified-source bundle only). Coverage metrics unavailable — target-code execution disabled by audit policy during the pre-scan.

### Live state when audited (Base block 62,746,596)

| | Base (8453) | Ethereum (1) | Base Sepolia (84532) |
|---|---|---|---|
| `locked` | **false** | **false** | **false** |
| `gzipped` / `version` | true / `v0.1` | true / `v0.1` | true / `v0.1` |
| dapp chunks / widget chunks | 3 / 1 | 3 / 1 | 3 / 1 |
| `owner()` | `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` | same | same |

The owner is a 45-byte minimal proxy (identical code on all three chains) that delegates to `0xd54cb65224410f3ff97a8e72f363f224419f4fb0` (10,532 bytes, **not reviewed**). On Base, all four live pointers equal `keccak(rlp(App, nonce))` for nonces 1–4, so they were created by `App.addChunk` / `App.addWidgetChunk` and are ordinary SSTORE2 chunks. `html()` on Base costs about 3.38M gas today (`cast estimate`).

## Summary

`App` stores a dapp HTML document and an optional JavaScript widget as SSTORE2 chunks, serves them through `html()` and the ERC-5219 `request()`, and offers a one-way `lock()` that is meant to freeze the content for good. It holds no tokens and makes no external calls; the asset is the integrity and availability of a front end that users sign transactions through.

No path was found for anyone other than the owner to change content, take ownership, or block readers. The findings concern what `lock()` actually guarantees and what the owner can get wrong on the way to it.

**Severity counts:** 0 Critical · 0 High · 1 Medium · 13 Low · 8 Informational

- The one **Medium** (M-1) breaks the lock's stated promise: the owner can lock a pointer that the chain deletes at the end of that transaction, then put different bytes at the same address later. It was reproduced on a local Cancun node against the unmodified source. The live Base deployment is **not** in that state (it is unlocked and its pointers are App-created), but the deployed code cannot be patched, so the guidance in M-1 matters for how these deployments are locked and how users verify them.
- All three deployments are **unlocked** today, so users currently rely on the owner contract for every byte they are served (L-1).
- The **Low** items are mostly ways an honest owner can freeze an unusable or unintended document: read cost that grows with the square of the chunk count (L-2), a `gzipped` flag that `lock()` does not check (L-3, L-4), and identical pointer addresses that hold different bytes on Base and Ethereum (L-5, confirmed on-chain).

| ID | Severity | Title | Origin |
|---|---|---|---|
| M-1 | Medium | `lock()` accepts a pointer that deletes itself after the transaction, so locked content can still be replaced | Phase 2 |
| L-1 | Low | Before lock, the owner replaces the whole front end in one transaction and the events do not show it | Phase 1 |
| L-2 | Low | `_raw` re-copies the document per chunk; a lockable document can be too expensive to read | Both |
| L-3 | Low | `lock()` does not bind the `gzipped` flag or reject a zero-byte document | Both |
| L-4 | Low | `addChunk` cannot start a new document and never sets `gzipped`; "reset" is impossible | Both |
| L-5 | Low | The same pointer addresses hold different bytes on Base and Ethereum | Both |
| L-6 | Low | Lock state is per chain; a chain-less `web3://` URL reads the Ethereum copy | Phase 1 |
| L-7 | Low | No chunk-size check: one byte over the limit burns almost all the gas | Phase 1 |
| L-8 | Low | A widget can never be removed once added | Both |
| L-9 | Low | The gzip bootstrap does not load a document the way a browser does | Both |
| L-10 | Low | ETH sent to the payable `Ownable` functions cannot leave | Both |
| L-11 | Low | `transferOwnership` is one step with no acceptance | Phase 1 |
| L-12 | Low | `renounceOwnership` before lock leaves `locked() == false` forever | Phase 1 |
| L-13 | Low | The constructor accepts a zero or uncontrolled owner | Both |
| I-1 | Informational | `lock()` can be called again and re-emits `AppLocked` | Phase 1 |
| I-2 | Informational | Events carry counts only; constructor emits no `VersionSet`; `addChunk` reports a stale flag | Both |
| I-3 | Informational | Pointer permanence also rests on chain rules outside the contract | Both |
| I-4 | Informational | Handover requests are open to anyone and survive owner changes | Phase 1 |
| I-5 | Informational | Real access control sits in an owner contract outside the audited source | Both |
| I-6 | Informational | Chunk order is transaction order; no expected-index guard | Phase 1 |
| I-7 | Informational | Root returns `200` with an empty body before the first upload | Both |
| I-8 | Informational | No cap on list length; `delete` and `lock()` share one transaction-gas ceiling | Phase 1 |

---

## Findings

### M-1 — `lock()` accepts a pointer that deletes itself after the transaction, so locked content can still be replaced

**Severity:** Medium
**Confidence:** [75] · **Origin:** Phase 2 (invariant agent and numerical-gap agent, independently) · reproduced by the orchestrator
**Location:** `lock()` `App.sol:168-180`, `_requireChunk()` `App.sol:198-209`, reached through `setChunks()` `App.sol:125` and `setWidgetChunks()` `App.sol:147`

**What the code promises.** The NatSpec on `lock()` says the re-check exists so that a locked `App` cannot carry a pointer whose bytes can change, `App.sol:165-167`:

```solidity
    ///      The re-check is for a readable *chunk* and not merely for code, because a pointer that
    ///      holds code that is not a chunk is the thing the lock must refuse: its bytes can still
    ///      change afterwards, which is exactly the promise `lock()` exists to make.
```

**What the code checks.** Two properties of the account, at the moment of the call, `App.sol:203-208`:

```solidity
            n := extcodesize(ptr)
            extcodecopy(ptr, 0x00, 0x00, 0x01)
            first := mload(0x00)
        }
        if (n == 0) revert CodelessChunk(ptr);
        if (first[0] != 0x00) revert ForeignChunk(ptr);
```

The reasoning behind the check is that code beginning with `STOP` can never execute, so it can never `SELFDESTRUCT`. That is true of the *runtime* code. It is not true of the *init code* that creates the account. Init code can `DELEGATECALL` a helper that executes `SELFDESTRUCT` (which marks the new account for deletion) and then carry on and `RETURN` runtime code `0x00 ‖ data`. Under EIP-6780 (Cancun — live on Base, Ethereum and Base Sepolia) an account that self-destructs in the transaction that created it is deleted when that transaction ends. Until then its code is fully visible to `EXTCODESIZE` / `EXTCODECOPY`.

**Exploit path (all in one transaction sent through the owner contract).**

1. A factory does `CREATE2(salt, initcode)` → pointer `X`. The init code delegatecalls a self-destruct helper, then returns `0x00 ‖ A`.
2. `App.setChunks([X], false)` — `_requireChunk(X)` at `App.sol:125` passes: code is present and starts with `0x00`.
3. `App.lock()` — the loop at `App.sol:172` passes again, and `locked = true` is written at `App.sol:178`.
4. The transaction ends. `X` is deleted (no code, nonce 0). `locked()` is `true`.
5. Any later transaction: the factory runs `CREATE2` with the same salt and init code, this time without the self-destruct, returning `0x00 ‖ B`. `X` now holds `B`, permanently.

The same works for `widgetChunks` through `App.sol:147` and the loop at `App.sol:176`.

**Proof.** Reproduced on `anvil --hardfork cancun` with `App.sol` byte-identical to the verified source (via-IR, 1000 runs, `cancun`):

```
batch tx (factory.deploy → setChunks → lock)   status 1 (success)
locked()                                       true
cast code <ptr>   (after the lock tx)          0x
html()                                         EVM error OutOfGas
factory.deploy(same salt), no self-destruct    status 1 (success)
cast code <ptr>                                0x003c68313e42207265706c61636564206166746572206c6f636b3c2f68313e
locked()                                       true
html()                                         "<h1>B replaced after lock</h1>"      (locked with "<h1>A original</h1>")
```

PoC contracts used (not part of the target):

```solidity
contract Killer { fallback() external { selfdestruct(payable(address(0))); } }
contract Meta {
    constructor(address killer, Store store) {
        if (store.kill()) { (bool ok,) = killer.delegatecall(""); require(ok); }
        bytes memory c = abi.encodePacked(hex"00", store.d());
        assembly { return(add(c, 32), mload(c)) }
    }
}
contract OwnerBatch {
    function run(App app, Factory f, bytes32 salt) external {
        address p = f.deploy(salt);                 // CREATE2 of Meta
        address[] memory a = new address[](1); a[0] = p;
        app.setChunks(a, false);
        app.lock();
    }
}
```

**Impact, stated exactly.**

- Between step 4 and step 5 the locked `App` holds a codeless pointer. `SSTORE2.read` computes a 2^40-byte length for it, so `html()` and `request()` run out of gas for every caller. This is the state the `CodelessChunk` comment (`App.sol:37-38`) says the checks prevent. If step 5 never happens, the locked site is dead forever.
- After the lock, whoever controls the factory chooses the final content **once**, at a time of their choosing, with `locked() == true` and an `AppLocked` event that predates the content. Anyone who treats `locked` (or the event's block) as proof that the content was fixed at that point is wrong.
- The power is bounded: a pointer re-created *without* the self-destruct is permanent, and one re-created *with* it vanishes again at the end of that transaction. So a locked `App` whose pointers all hold code at a block boundary cannot change again under current chain rules.
- Only the owner can do this (it needs `setChunks` and `lock` in the same transaction as the pointer's creation). The live owner is a contract, so batching is available; an EOA owner could batch through an EIP-7702 delegation. No third party can trigger it. That, and the visible unreadable interval, is why this is Medium and not High: the harm requires the party the lock is meant to bind to act against it, and it does not let the owner show verified content and silently swap it.

**Recommendation.** Stop admitting pointers the contract did not create. `App`'s own pointers come from `SSTORE2.write`'s fixed init code, which cannot self-destruct:

```diff
+    /// @dev Pointers that this contract deployed with SSTORE2.write.
+    mapping(address => bool) public isChunk;
+
     function addChunk(bytes calldata data) external onlyOwner returns (address ptr) {
         if (locked) revert Locked();
         ptr = SSTORE2.write(data);
+        isChunk[ptr] = true;
         chunks.push(ptr);
@@
     function addWidgetChunk(bytes calldata data) external onlyOwner returns (address ptr) {
         if (locked) revert Locked();
         ptr = SSTORE2.write(data);
+        isChunk[ptr] = true;
         widgetChunks.push(ptr);
@@
     function _requireChunk(address ptr) private view {
+        if (!isChunk[ptr]) revert ForeignChunk(ptr);
         uint256 n;
```

Reuse and reordering through `setChunks` keep working for App-created chunks. A delay between `setChunks` and `lock()` does **not** fix this (the pointer can be re-created and self-destructed again inside the lock transaction).

**For the deployments that already exist** (the bytecode is immutable):

- Lock only pointer lists made of App-created chunks. This is checkable by anyone: each pointer must equal `keccak256(rlp([App, nonce]))` for some nonce ≥ 1. The four live Base pointers pass this check.
- After locking, verify in a later block that `html()` and `widget()` return, and publish `keccak256(bytes(html()))`. Users should verify the hash rather than trust `locked()` alone.

---

### L-1 — Before lock, the owner replaces the whole front end in one transaction and the events do not show it

**Severity:** Low
**Confidence:** [90] · **Origin:** Phase 1 (access-control; rated Medium there, see note)
**Location:** `setChunks()` `App.sol:120-130`, `setWidgetChunks()` `App.sol:142-151`, event `ChunksSet` `App.sol:31`

While `locked == false`, one `onlyOwner` check stands between a key holder and everything `html()`, `widget()` and `request()` return. `App.sol:120-123`:

```solidity
    function setChunks(address[] calldata ptrs, bool gzipped_) external onlyOwner {
        if (locked) revert Locked();
        if (ptrs.length == 0) revert EmptyDocument();
        delete chunks;
```

There is no delay, second approval or pause. Three details make monitoring hard:

- The replacement can be deployed in advance from an unrelated account; `_requireChunk` accepts any account whose code starts with `0x00`.
- `event ChunksSet(uint256 count, bool gzipped);` (`App.sol:31`) carries no pointers and no hash. Swapping N chunks for N others emits exactly what a legitimate update emits. `version` is free text and is not tied to content.
- Whoever swaps the content can then call `lock()` and transfer or renounce ownership, which makes the swap permanent; the legitimate owner cannot repair it at this address.

The front end builds the transactions users sign, and `widget.js` is meant to be embedded in third-party pages, so a hostile replacement reaches user wallets. `App` itself holds nothing.

**This is the live state today:** `locked == false` on Base, Ethereum and Base Sepolia, with the owner a proxy contract whose implementation was not in scope (I-5).

*Severity note.* Phase 1 rated this Medium. It is the documented design of an unlocked `App` (mutable until `lock()`), not a defect in a check, so it is reported as Low — but it is the item with the most practical weight for users right now.

**Recommendation.** Lock each deployment once its content is final (following M-1's guidance) and publish the content hash. If content must stay mutable, emit the pointer list (or its hash) in `ChunksSet` / `WidgetChunksSet`, and stage changes behind a delay:

```solidity
event ChunksProposed(address[] ptrs, bool gzipped, uint256 executableAt);
```

---

### L-2 — `_raw` re-copies the document per chunk; a lockable document can be too expensive to read

**Severity:** Low
**Confidence:** [85] · **Origin:** Both (Phase 1: general, precision-math, assembly, chain-specific, dos · Phase 2: six agents)
**Location:** `_raw()` `App.sol:190-195`; consumers `html()` `App.sol:60-77`, `request()` `App.sol:90-108`; not bounded by `lock()`

`App.sol:192-194`:

```solidity
        for (uint256 i; i < n; ++i) {
            out = bytes.concat(out, SSTORE2.read(list[i]));
        }
```

Each pass allocates a fresh copy of the chunk and a fresh buffer holding the entire prefix; nothing is freed. Memory grows with the square of the chunk count, and EVM memory gas is itself quadratic in memory size. `html()` then adds `Base64.encode`, `string.concat` and the ABI return copy.

Measured by a Phase 2 agent (Foundry, copy of the source in a scratch directory, via-IR, 1000 runs, `cancun`; 24,575-byte chunks; external `html()` call):

| Chunks | Raw | Gzipped |
|---:|---:|---:|
| 4 | 0.59M | 6.95M |
| 8 | 3.77M | 19.2M |
| 12 | 13.3M | 41.9M |
| 16 | 34.7M | 81.8M |
| 20 | 75.3M | 147.6M |

A single-buffer read of the same 20 chunks cost 4.26M gas. With the common 50M `eth_call` cap (geth / op-geth default), a gzipped document stops being readable at about 13 full chunks (~320 KB stored) and a raw one at about 17. Many small chunks reach the wall much sooner.

`lock()` deliberately does not exercise the read path (`App.sol:161-162`: "Not an `html()` call, which is unbounded gas") and nothing caps the list. An owner can therefore lock a document that no capped gateway can serve, and it can never be shortened afterwards. Only the owner controls the size; the live document (3 chunks, ~3.4M gas) is well inside the limit, with roughly 4× headroom in gzipped size.

**Recommendation.**

```diff
     function _raw(address[] storage list) internal view returns (bytes memory out) {
         uint256 n = list.length;
-        for (uint256 i; i < n; ++i) {
-            out = bytes.concat(out, SSTORE2.read(list[i]));
-        }
+        uint256 total;
+        for (uint256 i; i < n; ++i) total += list[i].code.length - 1;
+        out = new bytes(total);
+        uint256 off;
+        for (uint256 i; i < n; ++i) {
+            address p = list[i];
+            uint256 len = p.code.length - 1;
+            /// @solidity memory-safe-assembly
+            assembly { extcodecopy(p, add(add(out, 0x20), off), 1, len) }
+            off += len;
+        }
     }
```

Also enforce a maximum chunk count or total size in the setters and in `lock()`. For the existing deployments: keep the gzipped document under about 10 full chunks and test `request([])` against the intended gateways before locking.

---

### L-3 — `lock()` does not bind the `gzipped` flag or reject a zero-byte document

**Severity:** Low
**Confidence:** [85] · **Origin:** Both (Phase 1: general, dos · Phase 2: flow-gap, asymmetry leads)
**Location:** `lock()` `App.sol:168-180`; `html()` `App.sol:62`

`lock()` checks the pointer count and the shape of each pointer, `App.sol:169-173`:

```solidity
        uint256 n = chunks.length;
        if (n == 0) revert EmptyDocument();
        for (uint256 i; i < n; ++i) {
            _requireChunk(chunks[i]);
        }
```

It never reads `gzipped`, which alone decides how `html()` presents the bytes (`if (!gzipped) return string(doc);`, `App.sol:62`). Two states pass `lock()` and are then permanent:

- **Flag does not match the bytes.** Gzip bytes with `gzipped == false` are served raw as `text/html`; plain HTML with `gzipped == true` is wrapped in a bootstrap whose `DecompressionStream('gzip')` rejects, leaving a blank page.
- **Zero bytes.** `EmptyDocument` counts pointers, not bytes. `addChunk("")` deploys a 1-byte `0x00` pointer, which passes `_requireChunk`; `lock()` then succeeds and `html()` returns `""` — the outcome the error at `App.sol:47` is documented to prevent.

Owner error only; no third party can cause it.

**Recommendation.** Make the one-way door state what it freezes:

```solidity
function lock(bool expectGzipped, bytes32 expectedHash) external onlyOwner {
    if (gzipped != expectGzipped) revert FlagMismatch();
    bytes memory doc = _raw(chunks);
    if (doc.length == 0) revert EmptyDocument();
    if (keccak256(doc) != expectedHash) revert HashMismatch();
    ...
}
```

A content hash at lock also closes L-5 and gives users something to verify. If the full read is judged too costly, at least take `expectGzipped` and require a non-zero total size.

---

### L-4 — `addChunk` cannot start a new document and never sets `gzipped`; "reset" is impossible

**Severity:** Low
**Confidence:** [85] · **Origin:** Both (Phase 1: general · Phase 2: invariant, boundary, asymmetry leads)
**Location:** `addChunk()` `App.sol:111-116`; `setChunks()` `App.sol:118-130`

`gzipped` has a single writer, `App.sol:128` (`gzipped = gzipped_;` in `setChunks`), while the list has two. `addChunk` only appends and reports whatever flag is stored, `App.sol:114-115`:

```solidity
        chunks.push(ptr);
        emit ChunksSet(chunks.length, gzipped);
```

The NatSpec at `App.sol:118` says `setChunks` can "reuse already-deployed chunks, reorder, or reset", but `App.sol:122` reverts on an empty list. Consequences:

- A fresh deployment filled with `addChunk` alone has `gzipped == false`. Serving gzip needs a later `setChunks` call that re-passes every pointer. (The live deployments did exactly this.)
- Once the list is non-empty, uploading a new build with `addChunk` appends it after the old one. `html()` serves `old ‖ new` until a `setChunks` transaction lands. With a contract owner submitting several transactions, that window is real.
- The flag cannot be changed without re-submitting the list.

Recoverable before lock; permanent if locked in a bad state (L-3).

**Recommendation.** Add a staging path and a flag setter, and fix the comment:

```solidity
function storeChunk(bytes calldata data) external onlyOwner returns (address ptr) {
    if (locked) revert Locked();
    ptr = SSTORE2.write(data);   // not pushed; publish with setChunks
}
function setGzipped(bool g) external onlyOwner {
    if (locked) revert Locked();
    gzipped = g;
    emit ChunksSet(chunks.length, g);
}
```

---

### L-5 — The same pointer addresses hold different bytes on Base and Ethereum

**Severity:** Low
**Confidence:** [90] · **Origin:** Both (Phase 1: assembly, chain-specific · Phase 2: trust-gap lead) · confirmed on-chain by the orchestrator
**Location:** `addChunk()` `App.sol:113`, `addWidgetChunk()` `App.sol:135` (`CREATE` in `SSTORE2.sol:58`); `setChunks()` `App.sol:124-127`; `_requireChunk()` `App.sol:198-209`

`SSTORE2.write` uses plain `CREATE`, so a pointer's address is `keccak(rlp(App, nonce))` and does not depend on the data. `App` has the same address on three chains, so the k-th chunk it creates lands on the same address on each chain whatever was uploaded. Dapp and widget chunks share one nonce sequence.

This is the case today:

| Pointer | Base code hash | Ethereum code hash |
|---|---|---|
| `0x029E4004a2Be5fd03db9aDCee825898Ef70D98F4` | `0xc575a1a9035d…` | `0x0141ba6b2c3f…` |
| `0x87eE9c5C1857f57C941A880be4BbC036471780A3` | `0x29924826b9b2…` | `0x94fcfa32abf7…` |
| `0x295fF302b881280C245491aD0109324654239227` | `0xa75b27f643da…` | `0x6f0db961a16f…` |

`setChunks` validates pointers only with `_requireChunk` (`App.sol:125`: `_requireChunk(ptrs[i]);`), which looks at code size and one byte. A pointer list, or a whole `setChunks` calldata, copied from one chain to another passes validation and assembles a different document; `lock()` passes too. Equal pointer lists across chains do not mean equal content, and the events expose neither pointers nor hashes.

Owner-side operational hazard; no third party can occupy an App-created address.

**Recommendation.** Never reuse pointer lists or calldata across chains; compare `keccak256(bytes(html()))` per chain before locking. In code, bind content at lock (L-3's `expectedHash`), or create chunks with `SSTORE2.writeCounterfactual` so the address commits to the data.

---

### L-6 — Lock state is per chain; a chain-less `web3://` URL reads the Ethereum copy

**Severity:** Low
**Confidence:** [70] · **Origin:** Phase 1 (chain-specific)
**Location:** `lock()` `App.sol:178`; `request()` `App.sol:90-108`

`locked = true;` (`App.sol:178`) writes local storage only. Each of the three deployments has its own owner slot, lists, flag, version and lock, and nothing in a response is tied to a chain. Under ERC-4804 / ERC-6860 a `web3://<address>/` URL without a chain suffix resolves to chain 1. A statement like "the App at `0x00a9…25BA` is locked" is true only per chain, and a user who drops `:8453` is served the Ethereum deployment — which, per L-5, already holds different bytes.

Not exploitable without the owner key on the other chain. Gateway resolution behaviour was not tested.

**Recommendation.** Publish chain-qualified URLs only. Bring every deployment at this address to the same locked content, or document which one is canonical.

---

### L-7 — No chunk-size check: one byte over the limit burns almost all the gas

**Severity:** Low
**Confidence:** [85] · **Origin:** Phase 1 (precision-math, assembly; chain-specific and dos rated it Info)
**Location:** `addChunk()` `App.sol:110-113`; `addWidgetChunk()` `App.sol:132-135`

The limit is stated but not enforced, `App.sol:110-113`:

```solidity
    /// @notice Store one chunk (<= 24,575 bytes) and append its pointer.
    function addChunk(bytes calldata data) external onlyOwner returns (address ptr) {
        if (locked) revert Locked();
        ptr = SSTORE2.write(data);
```

The only bound in code is Solady's `0xfffe` check. In between, the chain enforces the limit the expensive way:

| `data.length` | Result |
|---|---|
| ≤ 24,575 | succeeds (a full chunk costs about 5.5M gas) |
| 24,576 – 49,141 | the `CREATE` frame fails the EIP-170 size rule and consumes 63/64 of the remaining gas, then `DeploymentFailed()` |
| ≥ 49,142 | init code exceeds the EIP-3860 limit; the call halts with all gas spent and no revert data |

An off-by-one in a chunking script costs nearly the whole gas limit (plus the L1 data fee on Base) and returns an unhelpful error. There is also no lower bound (see L-3). No state is corrupted.

**Recommendation.**

```solidity
error BadChunkSize(uint256 len);
if (data.length == 0 || data.length > 24_575) revert BadChunkSize(data.length);
```

---

### L-8 — A widget can never be removed once added

**Severity:** Low
**Confidence:** [90] · **Origin:** Both (Phase 1: dos · Phase 2: asymmetry, flow-gap leads)
**Location:** `setWidgetChunks()` `App.sol:144`; `request()` `App.sol:102`

The NatSpec treats "no widget" as a complete, valid state that answers 404 (`App.sol:88-89`), and `request()` implements it with `widgetChunks.length != 0` at `App.sol:102`. But the only function that can shrink the list rejects an empty one, `App.sol:144`:

```solidity
        if (ptrs.length == 0) revert EmptyDocument();
```

After the first `addWidgetChunk`, the 404 state is unreachable. The closest substitute is a zero-byte chunk, which makes `request(["widget.js"])` return `200` with an empty `application/javascript` body. After `lock()` this is permanent. All three live deployments already carry a widget.

**Recommendation.**

```solidity
function clearWidget() external onlyOwner {
    if (locked) revert Locked();
    delete widgetChunks;
    emit WidgetChunksSet(0);
}
```

---

### L-9 — The gzip bootstrap does not load a document the way a browser does

**Severity:** Low
**Confidence:** [60] · **Origin:** Both (Phase 1: general · Phase 2: periphery and first-principles leads) · reasoned from the HTML specification, **not browser-tested**
**Location:** `html()` `App.sol:63-76`

The bootstrap inflates the payload, parses it with `DOMParser`, swaps `documentElement`, and re-creates every script, `App.sol:70-72`:

```solidity
            "const d=new DOMParser().parseFromString(t,'text/html');",
            "document.replaceChild(document.importNode(d.documentElement,true),document.documentElement);",
            "for(const s of[...document.querySelectorAll('script')]){const n=document.createElement('script');",
```

Differences from loading the raw document:

- **`<noscript>` content becomes live.** `DOMParser` parses with scripting disabled, so the contents of `<noscript>` are built as real elements. They are imported into the live document, and the loop re-creates — and so executes — any `<script>` inside them; styles, links and images inside `<noscript>` also apply or load.
- **Lifecycle events are missed.** The swap happens after an `await`, by which time the outer document has finished parsing and fired `DOMContentLoaded` (and probably `load`). Inner scripts that only register listeners for those events never start.
- **No error handling.** The async function has no `catch`; any inflate failure (L-3) is an unhandled rejection and a blank page titled "app".
- **External scripts lose order**, as the comment at `App.sol:58-59` acknowledges; the inner doctype is dropped (only `documentElement` is imported).

The Base64 alphabet (`A-Za-z0-9+/=`) cannot close the JavaScript string or the `<script>` element, so the payload cannot break out of the bootstrap.

**The live Base document is not affected:** it has no `<noscript>`, five inline attribute-free scripts, and guards its one `DOMContentLoaded` listener with a `document.readyState` check. This is a constraint on future content.

**Recommendation.** Skip scripts with a `<noscript>` ancestor (or strip `<noscript>` before the swap), wrap the body in `try/catch` that renders an error, and dispatch synthetic `DOMContentLoaded` / `load` events after the swap — or document these constraints for dapp authors.

---

### L-10 — ETH sent to the payable `Ownable` functions cannot leave

**Severity:** Low
**Confidence:** [95] · **Origin:** Both (Phase 1: general, access-control · Phase 2: boundary lead)
**Location:** inherited `Ownable.sol:174`, `Ownable.sol:186`, `Ownable.sol:192`, `Ownable.sol:208`, `Ownable.sol:222`

Solady marks its five ownership mutators `payable`, for example `Ownable.sol:186`:

```solidity
    function renounceOwnership() public payable virtual onlyOwner {
```

Two of them (`requestOwnershipHandover`, `cancelOwnershipHandover`) are open to anyone. `App` has no withdraw function, no `receive`/`fallback`, and makes no outbound call, so any value attached is locked for good. Only the sender's own funds are at risk. The contract's balance is currently 0.

**Recommendation.** Override the five functions to revert on non-zero `msg.value`, or add an owner-only `sweep(address payable to)` that is not gated by `locked`.

---

### L-11 — `transferOwnership` is one step with no acceptance

**Severity:** Low
**Confidence:** [90] · **Origin:** Phase 1 (access-control)
**Location:** inherited `transferOwnership()` `Ownable.sol:174-183`

```solidity
    function transferOwnership(address newOwner) public payable virtual onlyOwner {
```

The transfer takes effect immediately and rejects only the zero address. A wrong address — or one that is a wallet on one chain but not on the chain being called, which matters for a contract deployed on three — loses ownership for good. Before lock, that means the content can never be completed, corrected or locked. The safer request-and-complete handover exists but is not enforced.

**Recommendation.** Override `transferOwnership` to revert so that only the handover flow remains.

---

### L-12 — `renounceOwnership` before lock leaves `locked() == false` forever

**Severity:** Low
**Confidence:** [90] · **Origin:** Phase 1 (access-control, general)
**Location:** inherited `renounceOwnership()` `Ownable.sol:186-188`; `lock()` `App.sol:168`

```solidity
    function renounceOwnership() public payable virtual onlyOwner {
        _setOwner(address(0));
    }
```

`renounceOwnership` never reads `locked`, and `lock()` is `onlyOwner`. Renouncing first freezes the content in whatever state it is in (including half-uploaded) while `locked()` reports `false` forever. A reader checking the flag cannot tell "immutable because ownerless" from "mutable", and `lock()`'s readability checks never run.

**Recommendation.**

```solidity
function renounceOwnership() public payable override onlyOwner {
    if (!locked) revert NotLocked();
    _setOwner(address(0));
}
```

---

### L-13 — The constructor accepts a zero or uncontrolled owner

**Severity:** Low
**Confidence:** [85] · **Origin:** Both (Phase 1: access-control, general, chain-specific · Phase 2: access-control lead)
**Location:** `constructor` `App.sol:50-53`

```solidity
    constructor(address owner_, string memory version_) {
        _initializeOwner(owner_);
        version = version_;
    }
```

`_guardInitializeOwner` is not overridden, so Solady stores `owner_` with no zero check. `new App(address(0), …)` yields a contract nobody can populate or lock. The same applies to an owner address that is not controlled on the deployment chain — a real consideration when one contract-account address is used as owner on three chains.

For the live deployments this was checked: `owner()` is the same address with identical 45-byte code on Base, Ethereum and Base Sepolia.

**Recommendation.** `if (owner_ == address(0)) revert NewOwnerIsZeroAddress();` in the constructor; verify `owner()` and its code on every chain after deployment.

---

### I-1 — `lock()` can be called again and re-emits `AppLocked`

**Severity:** Informational
**Confidence:** [95] · **Origin:** Phase 1 (general, access-control)
**Location:** `lock()` `App.sol:168-180`

`lock()` is the only content-related function without `if (locked) revert Locked();`. After locking, the owner can call it again; `locked = true;` and `emit AppLocked();` (`App.sol:178-179`) run each time. No state changes, but an indexer that takes the latest `AppLocked` as the lock time is misled — relevant alongside M-1. Add the guard as the first line.

### I-2 — Events carry counts only; constructor emits no `VersionSet`; `addChunk` reports a stale flag

**Severity:** Informational
**Confidence:** [95] · **Origin:** Both (Phase 1: general · Phase 2: asymmetry lead)
**Location:** events `App.sol:31-33`; constructor `App.sol:52`; `addChunk()` `App.sol:115`

`event ChunksSet(uint256 count, bool gzipped);` and `event WidgetChunksSet(uint256 count);` do not let anyone rebuild content history from logs (see L-1). The constructor writes `version = version_;` (`App.sol:52`) without `VersionSet`, so an event-only indexer misses the first version. `addChunk` emits the stored flag, not the format of the data just added. Emit pointer addresses or code hashes, and `VersionSet` in the constructor.

### I-3 — Pointer permanence also rests on chain rules outside the contract

**Severity:** Informational
**Confidence:** [50] · **Origin:** Both (Phase 1: assembly · Phase 2: five agents raised it as a lead)
**Location:** `_requireChunk()` `App.sol:198-209`; `SSTORE2.sol:213-214`

Apart from M-1, an admitted pointer's code stays constant only because of EVM rules (`STOP`-first code cannot execute; EIP-6780; EIP-7702 designators start with `0xef`; EIP-3541). `SSTORE2.read` re-reads current code on every call with no re-check:

```solidity
            let n := and(0xffffffffff, sub(extcodesize(pointer), 0x01))
            extcodecopy(pointer, add(data, 0x1f), 0x00, add(n, 0x21))
```

No account kind was found on Base, Ethereum or Base Sepolia that passes `_requireChunk` and can change later through ordinary transactions (precompiles are codeless; OP-stack predeploys start `0x60`; system contracts start `0x33`). A hard fork that rewrites code at arbitrary addresses cannot be excluded by a contract. Also note the `ForeignChunk` documentation (`App.sol:40-46`) describes the check as identifying SSTORE2 chunks; it identifies a one-byte prefix. The provenance mapping in M-1 removes this dependence on the prefix argument.

### I-4 — Handover requests are open to anyone and survive owner changes

**Severity:** Informational
**Confidence:** [90] · **Origin:** Phase 1 (access-control)
**Location:** inherited `requestOwnershipHandover()` `Ownable.sol:192-205`, `completeOwnershipHandover()` `Ownable.sol:222-238`

Any account can file and renew a 48-hour request in its own slot; slots are not cleared by ownership changes and are not gated by `locked`. A request grants nothing until the owner completes it, no account can touch another's slot, and a candidate can only make the owner's `completeOwnershipHandover` revert by cancelling first. The residual risk is social: look-alike addresses filing requests in the hope the owner copies the candidate address from the event log. Take `pendingOwner` from an authenticated out-of-band source.

### I-5 — Real access control sits in an owner contract outside the audited source

**Severity:** Informational
**Confidence:** [95] · **Origin:** Both (Phase 1: access-control, chain-specific · Phase 2: access-control lead)
**Location:** `onlyOwner` → `_checkOwner()` `Ownable.sol:151-160`; owner set at `App.sol:51`

`owner()` is `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, a 45-byte minimal proxy (same code on all three chains) delegating to `0xd54cb65224410f3ff97a8e72f363f224419f4fb0`. Every privilege in L-1 and M-1 belongs to whoever can make that contract call `App` — its signers, threshold, modules and any upgrade path. None of that code was in scope. If it can batch calls, the M-1 sequence and the L-1 swap-then-lock sequence are each one atomic transaction. Review it, and document its signer set and threshold.

### I-6 — Chunk order is transaction order; no expected-index guard

**Severity:** Informational
**Confidence:** [70] · **Origin:** Phase 1 (chain-specific)
**Location:** `addChunk()` `App.sol:114`

Document byte order is the execution order of `chunks.push(ptr);`. With a contract owner submitting through signers, relayers or parallel nonces, a reordered or partly failed batch produces a scrambled or truncated document that `lock()` accepts. Add `uint256 expectedIndex` and revert when `chunks.length != expectedIndex`, or rely on a content hash at lock (L-3).

### I-7 — Root returns `200` with an empty body before the first upload

**Severity:** Informational
**Confidence:** [90] · **Origin:** Both (Phase 1: chain-specific · Phase 2: asymmetry lead)
**Location:** `request()` `App.sol:97-101`

The widget branch requires `widgetChunks.length != 0` (`App.sol:102`); the root branch has no matching check and executes `return (200, html(), headers);` (`App.sol:100`) on an empty list. A new or unused deployment answers its root with `200` and no content instead of `404`. Only possible before lock (`lock()` requires a non-empty list). Return 404 when `chunks.length == 0`.

### I-8 — No cap on list length; `delete` and `lock()` share one transaction-gas ceiling

**Severity:** Informational
**Confidence:** [70] · **Origin:** Phase 1 (dos; rated Low there)
**Location:** `setChunks()` `App.sol:123`; `lock()` `App.sol:171-177`

The only way to shrink a list is `delete chunks;` (`App.sol:123`), about 5,000 gas per element in one transaction; `lock()` costs about 5,000 gas per pointer across both lists. Under a 16.7M per-transaction cap the ceiling is roughly 3,300 elements. Reaching a stuck state would take thousands of extra `addChunk` calls by the owner, far past the point where L-2 has already made the document unreadable, so this is reported as Informational. A `MAX_CHUNKS` constant removes it.

---

## Reconciliation summary

Phase 1 (breadth): 6 checklist agents — general, precision-math, assembly, chain-specific, dos, access-control — 32 raw findings. Phase 2 (depth, blind to Phase 1): 12 of 12 attack agents returned (math-precision, access-control, economic-security, execution-trace, invariant, periphery, first-principles, asymmetry, boundary, numerical-gap, trust-gap, flow-gap) — 3 raw findings and 26 raw leads, deduplicated and gated to 2 findings and 13 leads.

`Unified: 22 findings · Found by both phases: 12 · Phase 1 only: 9 · Phase 2 only: 1 (M-1) · Phase 2 sub-item with no Phase 1 match: <noscript> handling in L-9 · Coverage holes closed: 0 · Invariants: 10 answered (7 hold, 3 violated, 0 unverified)`

Notes on reconciliation decisions:

- **M-1** came only from Phase 2. Every Phase 1 agent that considered pointer permanence, and five other Phase 2 agents, concluded that `0x00`-prefixed code cannot self-destruct; that is correct for runtime code and misses the init-code path. The orchestrator reproduced the PoC before accepting it.
- **L-1** was rated Medium in Phase 1 and is reported as Low (documented pre-lock design, see the note in the finding).
- **L-2** thresholds: Phase 1 estimated the 50M wall at 16 gzipped chunks from the memory formula; a Phase 2 agent measured about 13. The measured figures are reported.
- **I-8** was Low in Phase 1 and is Informational here (unreachable at any usable document size).
- A Phase 2 lead that an attacker could deploy a clone at the owner address on another chain was checked on-chain and is not live (identical owner code on all three chains); it is folded into L-13 and I-5.
- Phase 2 leads were gated before any promotion. The read-cost item was promoted on multi-agent convergence; no other lead cleared the gates as an unprivileged-actor finding.

`Coverage: 11 entrypoints, 11 addressed. 13 threat rows, 13 answered. 10 inferred invariants, 10 answered. Holes closed this pass: 0.`

## Access-control inventory

The only guard is Solady's `onlyOwner` (`caller() == owner slot`). `locked` is a state gate on the five content/version setters; it does not gate `lock()` or any ownership function.

| Function | Guard | State written | Outcome |
|---|---|---|---|
| `addChunk(bytes)` | `onlyOwner` + `!locked` | new pointer; `chunks.push` | L-4, L-7, I-6 |
| `setChunks(address[],bool)` | `onlyOwner` + `!locked` + non-empty + `_requireChunk` | `chunks` replaced; `gzipped` | M-1, L-1, L-4, L-5 |
| `addWidgetChunk(bytes)` | `onlyOwner` + `!locked` | new pointer; `widgetChunks.push` | L-7, L-8 |
| `setWidgetChunks(address[])` | `onlyOwner` + `!locked` + non-empty + `_requireChunk` | `widgetChunks` replaced | M-1, L-8 |
| `setVersion(string)` | `onlyOwner` + `!locked` | `version` | examined, no issue (frozen by lock; see I-2 for the constructor event) |
| `lock()` | `onlyOwner`; non-empty dapp; `_requireChunk` on both lists | `locked = true` | M-1, L-2, L-3, I-1 |
| `transferOwnership(address)` | `onlyOwner`; non-zero | owner slot | L-11 |
| `renounceOwnership()` | `onlyOwner` | owner slot = 0 | L-12 |
| `completeOwnershipHandover(address)` | `onlyOwner`; live request | owner slot; handover slot | I-4 |
| `requestOwnershipHandover()` | none | caller's own handover slot | I-4, L-10 |
| `cancelOwnershipHandover()` | none | caller's own handover slot | I-4, L-10 |

Views (`html`, `widget`, `request`, `resolveMode`, counts, getters) write nothing. No missing guard was found: every write to `chunks`, `widgetChunks`, `gzipped`, `version` is behind both `onlyOwner` and the `locked` check, and `locked` has one writer and no path back to `false`.

## Threat model

| # | Actor → goal | Answer |
|---|---|---|
| T1 | Arbitrary account → mutate content | Holds — `onlyOwner` on all six mutators; the owner slot has no other writer |
| T2 | Arbitrary account → ownership via handover | Holds — a request grants nothing until the owner completes it (I-4) |
| T3 | Owner after lock → change storage | Holds for storage — no writer without the `locked` guard, no unlock |
| T4 | Owner → content that changes after lock | **Violated → M-1** |
| T5 | Third party controlling an admitted pointer | Only through M-1's same-transaction path with the owner's participation |
| T6 | Owner mistake → unusable locked site | L-2, L-3, L-4, L-5, L-8 |
| T7 | Reader → wrong routing / resource exhaustion | Routing is exact-match and holds; read cost → L-2; empty root → I-7 |
| T8 | Content → script breakout / unfaithful render | Breakout not possible (Base64 alphabet); fidelity → L-9 |
| T9 | ETH sender → stuck value | L-10 |
| T10 | Deployer → unusable owner | L-13 |
| T11 | Owner → loss of control | L-11, L-12 |
| T12 | Assembly / memory handling under via-IR | Holds — byte order, scratch-space use, the unaligned free pointer after `SSTORE2.read` and Base64's scratch use were each checked by three agents |
| T13 | Cross-chain confusion | L-5, L-6 |

## Invariant verification

Inferred invariants from the pre-scan, each answered by the audit.

| ID | Property | On-chain | Verdict |
|---|---|---|---|
| I-1 | `locked` moves `false → true` once and never back | Yes | **holds** — single write site at `App.sol:178` |
| I-2 | While locked, `chunks`, `widgetChunks`, `gzipped`, `version` are not written | Yes | **holds** — all seven write sites sit behind `if (locked) revert Locked();` |
| I-3 | Every address in `chunks` had non-empty `0x00`-first code when stored | Yes | **holds** at store time (see M-1 for what that is worth later) |
| I-4 | Same for `widgetChunks` | Yes | **holds** at store time |
| I-5 | `locked` ⇒ `chunks.length > 0` | Yes | **holds** — `App.sol:170`; the list cannot shrink to empty (but may hold zero bytes, L-3) |
| I-6 | Code at an admitted pointer never changes after admission | No | **violated → M-1** |
| I-7 | `gzipped` matches the real encoding of the bytes in `chunks` | No | **violated → L-3, L-4** (owner procedure only) |
| I-8 | Empty `widgetChunks` ⇒ `request(["widget.js"])` returns 404 | Yes | **holds** — `App.sol:102` (the empty state cannot be restored, L-8) |
| I-9 | Each App-created chunk holds ≤ 24,575 data bytes | Yes | **holds** — enforced by the chain inside `CREATE`, at a high gas cost on failure (L-7) |
| E-1 | Once locked, `html()`, `widget()`, `request()`, `version()` return the same values forever | No | **violated → M-1** |

## Scope limits

- Reviewed: `App.sol` in full and the inherited/used Solady code paths. Not reviewed: the owner proxy and its implementation, any deploy tooling, tests, the hosted dapp's own JavaScript (the live document was inflated only to check L-9's constructs), and web3:// gateway implementations.
- L-9 and L-6 rest on specification reading, not on browser or gateway tests. L-2's table was measured on a local copy, not on the deployed contract.
- A prior LeftClaw audit of this or a related deployment may exist; nothing from any earlier report was used. Every finding here comes from this job's own phases.

> This review was performed by an AI-driven audit pipeline. It cannot prove the absence of vulnerabilities and gives no guarantee of security. Independent human review, monitoring of `ChunksSet` / `AppLocked` events and of pointer code, and content-hash verification by users are recommended.
