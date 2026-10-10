# Rake Distro — Project Overview

**Owner:** DNZN LABS
**Status:** Pre-implementation. Draft contract and UI mockups exist; nothing deployed, nothing audited.
**Audience:** Engineering (human or agent) picking this up for implementation. This document says what it has to do and why, what's already been decided, and what's been learned. It does not prescribe the build.

---

## 1. Problem

Apps that take a protocol fee owe their users an answer to "where does this go?" Today that answer is prose, and prose can change silently. There is no cheap, verifiable, self-describing way for a project to say: *this fee is split this way, here are the recipients, and if we change it you'll see it coming.*

DNZN LABS needs this for its own projects first: every public DNZN release that takes a fee should route it to a single address that splits it across operations and treasury vaults (initially 60/40, subject to change). The vaults are timelocked multisigs (multisig.software). The split should be readable by any app via one `eth_call` and renderable by a widget on the app's own page.

If it works for DNZN it should work for anyone, so it's built as a public primitive.

## 2. Goals

1. **One address per distribution.** A project points its fee at an address. That's the whole integration on the paying side.
2. **Self-describing.** The table (recipients, percentages, human labels) is on-chain and readable in a single call. No indexer, no API, no subgraph required to display it.
3. **Changes are visible before they land.** Every owner action waits out a public delay. The promise lives in the distribution contract, not in whatever the owner happens to be.
4. **Zero ceremony.** Connect wallet → create → set table → done. No accounts, no email, no off-chain state.
5. **Minimal and immutable.** Single-file contract, factory + clones, no upgradeability, no admin keys, no dependency on DNZN infrastructure or on multisig.software.
6. **A widget.** A drop-in script any dapp can embed to render a distribution next to its fee line.
7. **Served from chain.** The dapp is small enough to be returned from a contract view (`html()`), via a separate renderer contract so the UI can be iterated without touching the core.

## 3. Non-goals

- Not a treasury, wallet, or accounting product. Splits went that direction; we are explicitly the primitive.
- Not streaming, vesting, or time-based payout. Balance-at-call-time split only.
- No token-gated or conditional recipients. A table is addresses and basis points.
- No cross-chain messaging. Same address on many chains via CREATE2, each chain independent.
- No fee taken by Rake Distro itself. Free, forever, like the multisig.
- No off-chain database. (Multisig uses PostgREST for signature coordination; we have no signatures to coordinate.)

## 4. Users and stories

**Project operator (owner)**
- As an operator I create a distribution with an owner, a delay, a description, and a table, and get a deterministic address I can hardcode into my fee-paying contracts before or after deploying.
- As an operator I propose a new table, description, delay, or owner; it appears as pending with a countdown; after the delay anyone can apply it; before then I can cancel.
- As an operator I can renounce ownership so the table is provably frozen.
- As an operator I embed the widget on my app with two lines of HTML.

**Beneficiary**
- As a beneficiary I see every distribution that pays me and what's pending on each.
- As a beneficiary whose address couldn't receive a push, I (or anyone) can call `release` to retry.

**End user of a fee-taking app**
- As a user I click "where does it go?" under a fee and see the table, the bar, and any pending change, with links to verify each address on an explorer.

**Keeper / anyone**
- As anyone I can call `distribute(token)` to split whatever has accumulated. I can call `apply` on an expired pending action.

**Integrator (dev paying a fee)**
- As an integrating contract I send ETH or tokens to the address and optionally call `distribute` in the same transaction for pass-through behaviour.

## 5. What's been decided

These were worked through and should not be relitigated without reason.

- **Sink + permissionless drain, not push-on-receive.** `receive()` only accumulates (stays under a 2,300-gas stipend). `distribute(token)` splits. Pass-through is achieved by the payer calling `distribute` after paying. ERC-20 has no receive hook, so this is the floor anyway.
- **Push with escrow fallback.** Each share is pushed; if the push fails it's escrowed for that beneficiary and the rest still go out. `release(token, account)` retries. A `reserved[token]` total keeps escrowed funds out of the next split.
- **Basis points, sum = 10,000, last recipient takes the remainder.** No dust.
- **Table is strictly ascending by address.** Dedupe for free (same trick as the multisig's signer loop). Consequence: "last" is by address, not list order; document it.
- **One timelock mechanism for every owner action.** `propose(bytes action)` → `queued[hash(action, nonce)] = eta` → permissionless `apply(action, nonce)` → self-call to an `onlySelf` setter. `cancel` is owner-only and immediate. Setters: `setBeneficiaries`, `setDescription`, `setDelay`, `transferOwnership`. No setter is reachable except through `apply`. `delay == 0` executes inline and is allowed (the UI flags it).
- **Pending actions are iterable on-chain** (array + index map, action bytes stored) so a read can show what's pending without event logs. Costs storage per proposal; accepted for the sake of a log-free widget.
- **`snapshot()`** returns owner, delay, nonce, description, table, pending in one call. This is the widget's entire data contract.
- **Human labels on-chain.** `name` and `note` per beneficiary, `description` per distribution. Widget can overlay resolved names but the labels are the distribution's own.
- **Owner is trusted over a delay.** The contract protects beneficiaries from surprise, not from the owner. What the owner *is* (EOA, multisig, DAO) is not our concern.
- **Factory + PUSH0 minimal-proxy clones, CREATE2, sender-bound salt**, lifted verbatim from multisig.software / Solady. Implementation deployed in the factory constructor. No `receive()` on factory or implementation so stray ETH reverts rather than locks.
- **Reentrancy lock via transient storage** (solc ≥ 0.8.28). ETH pushes hand control to recipients mid-loop.
- **ETH pushes are gas-capped** (`PUSH_GAS`, draft 100k); ERC-20 pushes are bounded by the token.
- **No ERC-721/1155 receiver shim.** NFTs sent here revert.
- **No 7702 path, no self-init.** `init` is factory-only.
- **UI: pure HTML/JS, zero external deps, hash-routed, served via a separate renderer contract.** See `DESIGN_HANDOFF.md`.

## 6. Open questions

- **`PUSH_GAS` value.** 100k is a guess. Measure what a multisig.software clone and a Safe actually need to receive ETH.
- **Should `distribute` be surfaced to non-owners in the UI?** It's permissionless by design; the question is whether a public button that spends the visitor's gas is good UX.
- **Max beneficiaries.** Contract allows up to `uint16`; gas makes a few hundred the practical ceiling. Should `_set` enforce a lower cap?
- **Multiple pending actions of the same kind.** Allowed. Should the UI warn when two `setBeneficiaries` are pending at once?
- **`html()` sizing.** Confirm the dapp can land under whatever the renderer contract can return in one call on each target chain, including with a vendored wallet-connection shim. If a signing library is needed at all, it dominates the budget; investigate whether `window.ethereum` raw JSON-RPC is sufficient (it should be: the only writes are `create`, `propose`, `apply`, `cancel`, `distribute`, `release`, all plain calls with no EIP-712).
- **Name.** "Rake" is deliberate (the house's cut, made visible). "RakeDistro" vs "Rake" vs something else is unresolved.
- **Widget hosting.** Served from chain, from `dnzn.dev`, from IPFS, or all three? The widget is the piece most likely to be loaded cross-origin by strangers.

## 7. Constraints and limitations

- Contracts are immutable once deployed. Bugs are mitigated in the dapp or by redeploy under a new factory, never by upgrade. Plan the audit accordingly.
- A beneficiary contract that consumes more than `PUSH_GAS` on receive is always escrowed, never paid directly. Document loudly.
- Rebasing and fee-on-transfer tokens: balance-based accounting handles them; per-beneficiary amounts may differ from `amount * bps / 10000` for fee-on-transfer. Accepted.
- Mainnet USDT returns nothing from `transfer`; `_push` tolerates that. (Splits V2 does not support USDT — a small, real advantage.)
- Name resolution (`.eth`, `.wei`, `.gwei`) is always a mainnet call regardless of active chain. Must be bounded by a timeout and never block a write.
- The UI cannot use `localStorage` inside some preview sandboxes; in production it's fine and required for theme + recent list.

## 8. Research and findings

**Prior art**
- **Splits (splits.org)** — the incumbent primitive; immutable hyperstructure, mutable or immutable splits, ETH + ERC-20. Since May 2026 the product is an "onchain banking" app (subaccounts, accounting, CLI/MCP). V2 uses an ERC-6909 warehouse (pull, not push). A V2 audit found that an immutability check on a split can be spoofed via `execCalls()` + ownership round-trip. A controller can change a mutable split instantly; there is no split-level timelock. Mainnet USDT unsupported in V2.0/2.1. → Our differentiation: timelock in the distribution itself, push with escrow, labels on-chain, zero product ceremony.
- **OpenZeppelin PaymentSplitter** — removed in OZ v5.0.0 with no documented rationale and no replacement. There is no "just import it" option.
- **Juicebox, Drips, thirdweb Split, Manifold/Zora payout splitters** — heavier or narrower; none are "minimal primitive with on-chain UI."
- **multisig.software (Src Co / z0r0z)** — the architectural model. One file, ~320 lines, no imports, single packed storage slot, sentinel linked list, `onlySelf` config via signed `execute`, timelock as `queued[hash] = eta`, vanity-address guard hooks, PUSH0 clones via CREATE2 with sender-bound salt, five independent audits tracked in `SECURITY.md`. Its dapp is a 14k-line static file with vendored ethers and a PostgREST backend — **not** served on-chain. (The "ERC-8244 `html()`" idea attributed to it earlier does not exist in the repo; no such ERC was found.) Repos: `github.com/src-company/multisig` (maintained), `github.com/z0r0z/multisig` (origin).
- **ERC-4804 / ERC-6860 (`web3://`)** — the addressing layer for on-chain HTML, if we want a canonical URL for the renderer contract's output.
- **ERC-1363 `transferAndCall`** — optional receiver interface worth supporting (≈10 lines) for tokens that implement it. ERC-777 should not be supported.

**Lessons taken from multisig's SECURITY.md**
- Singleton-funds trap: ETH sent to the implementation/factory is unrecoverable. Mitigate in contract (no `receive`) and UI (never offer those addresses).
- Sender-bound salt exists for pre-funded addresses; this is exactly our workflow (hardcode the address, deploy later / on more chains).
- Permissionless `executeQueued` is a feature; ours (`apply`) is the same.
- Atomic retry: deleting the queued hash and then reverting on the inner call leaves the hash queued. Ours inherits this.
- Every owner-bypass path must be closed: an immediate `setDelay(0)` would collapse the whole timelock. All four setters go through `propose`.

## 9. Artifacts in hand

| File | What |
|---|---|
| `Distribution.sol` | Draft contract: `Distribution` + `DistributionFactory`. Uncompiled. |
| `dapp.html` | UI mockup, all screens, demo data, hash-routed. |
| `widget.html` | Widget inside a pretend host app, with pending state. |
| `DESIGN_HANDOFF.md` | Design brief for the full UI pass. |
| `vendor/multisig` (local clone) | Reference implementation and audit history. |

## 10. Definition of done (v1)

- `forge build` clean at `solc 0.8.34`, `optimizer_runs` high, no imports in the core file.
- Test suite covering at minimum: rounding (3,333/3,333/3,334), escrow of a reverting ETH recipient with others paid, `distribute → release → distribute` keeping `reserved` consistent, cancel-then-apply reverting, `setDelay(0)` proposal not shortcutting an already-queued change, USDT-style no-return token, reentrancy attempt from a recipient, CREATE2 address stability across chains, salt front-running rejection.
- Gas snapshot committed.
- At least one independent security review, findings dispositioned in a `SECURITY.md` in the multisig style.
- Deployed via SafeSummoner to Ethereum, Base, Arbitrum, OP Mainnet, Sepolia, Base Sepolia at the same address.
- Dapp served from a renderer contract and mirrored at `dnzn.dev` and IPFS.
- Widget published and embedded on at least one DNZN app.
- DNZN's own fee distribution live, owned by the Ops multisig, 60/40, 7-day delay.
