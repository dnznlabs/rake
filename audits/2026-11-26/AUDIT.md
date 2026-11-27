# Commissioned external reviews — 2026-11-26

**Three $1 engagements with One Dollar Audit (LeftClaw Services), filed verbatim under
`onedollaraudit/<job>/report.md`.** Denizen commissioned them from his own wallet on 2026-11-26
between 18:05 and 18:14 CST; all three were delivered the same evening and pulled here at
2026-11-27T01:29Z.

**This file is an index, not a rollup.** It is not the reconciliation that `AUDIT.md` means elsewhere
in this directory: there are no legs here, and nothing was merged into one set of findings. Each
report stands as the vendor filed it. See [`../README.md`](../README.md) § External commissioned
reviews for how this differs from `make audit`, and `SECURITY.md` § Prior reviews for where
dispositions will go.

**No finding here is dispositioned yet.** Nothing in this directory has been accepted, rejected,
fixed or ruled on. Triage is tracked in [#440](https://github.com/dnznlabs/rake/issues/440).

## The three engagements

| job | target | severity counts, as filed | report | hosted | IPFS CID |
|:--|:--|:--|:--|:--|:--|
| [1272](https://www.onedollaraudit.com/audit/1272) | `DistributionFactory` `0x00D19609…7f8E` + the `Distribution` implementation `0xc4eD7EA2…cB0A` | 0C · 0H · **6M** · 12L · 8I | [`report.md`](onedollaraudit/1272/report.md) | [html](https://leftclaw.services/result/1272.html) | `bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly` |
| [1273](https://www.onedollaraudit.com/audit/1273) | `App` `0x00a9F390…25BA` | 0C · 0H · **1M** · 13L · 8I | [`report.md`](onedollaraudit/1273/report.md) | [html](https://leftclaw.services/result/1273.html) | `bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde` |
| [1274](https://www.onedollaraudit.com/audit/1274) | DNZN's distribution clone `0xB611Ff19…5199`, and the implementation behind it | 0C · 0H · **3M** · 13L · 7I | [`report.md`](onedollaraudit/1274/report.md) | [html](https://leftclaw.services/result/1274.html) | `bafkreib55lzeh5vuuzrkmfdd64uq6kcknvr24v347xong53xqeqlppaoem` |

No Critical and no High in any of the three. Every CID above was verified locally against the bytes
committed here — CIDv1, raw codec, sha2-256 — and each `report.md` carries the command to repeat
that check from the file itself.

## What they read, and what follows from it

Every engagement read the **deployed, Sourcify-verified source** for an address, not this repository.
No repo, no tests, no `docs/`, no `RUNBOOK.md`, and no decision log were available to the auditor,
and each report says so in its own scope section. Three consequences worth keeping in view while
triaging:

1. **The code they reviewed is immutable.** A finding cannot be patched at these addresses; it is
   either operational guidance, a new deployment, or accepted. That is already this project's
   position on bugs ([`README.md`](../../README.md) § Disclaimer).
2. **A finding may already be answered here and the auditor could not know.** Where the test suite
   pins a property or a decision settles a question, the disposition is to say so with the citation —
   not to treat silence as agreement, and not to treat the finding as new.
3. **They could read live state, and did.** Each report pins the block it read; 1273's cross-chain
   table and 1274's live-state block are the useful ones.

## The implementation was reviewed twice, independently

1272 and 1274 are separate engagements that both read `src/Distribution.sol` at
`0xc4eD7EA2…cB0A` — 1272 by way of the factory, 1274 by way of DNZN's clone. That is an accidental
independence check of exactly the kind this directory's method prizes, and it is worth reading the
two against each other. **The substance agrees; three items are rated differently:**

| the same issue | 1272 | 1274 |
|:--|:--|:--|
| ETH sent with a 2,300-gas `transfer`/`send` cannot reach a clone | M-2, Medium (confidence 95) | M-01, Medium — measured 4,159 gas cold on Base |
| Matured timelock actions can be applied by anyone in any order; renounce-first wipes its siblings | M-1 and M-4, both Medium | M-03, Medium |
| A beneficiary's token receive hook can block `distribute` for that token | **M-3, Medium** | **L-02, Low** |
| The clone address does not commit to owner, delay or table | **M-5, Medium** | **L-11, Low** |
| An applied nomination cannot be withdrawn before the nominee can accept | **L-1, Low** | **M-02, Medium** |

Two of those disagreements raise what the other lowered, in both directions, so neither report is
simply the harsher one. The disagreements are the triage's job, not this file's.

## The three items to read first

- **1273 M-1 — `lock()` accepts a pointer that deletes itself at the end of the transaction.** Init
  code can `DELEGATECALL` a self-destruct helper and still return runtime `0x00 ‖ data`; under
  EIP-6780 the account is deleted when that transaction ends, so `_requireChunk`'s "code present and
  first byte `0x00`" test passes at lock time and the same `CREATE2` salt can later place different
  bytes at the same address. Reproduced on `anvil --hardfork cancun` against byte-identical source,
  with the transcript in the report. **This is a new variant of the vector `SECURITY.md` § Findings
  records as F11**, which `_requireChunk` was written to close: F11 was a 7702 delegation designator,
  this is a same-transaction self-destruct. It needs the owner to install the pointer, so it is an
  owner-trust finding rather than an unprivileged attack — the same framing F11 had.
  **Bounding it today:** `App` is unlocked on all four chains and
  [decision 74](../../docs/ROADMAP.md#decisions) says there is no plan to call `lock()`, so nothing
  is locked under a deletable pointer now. It matters for any future lock and for how a reader
  verifies what they are served.
- **1272 M-2 / 1274 M-01 — a clone cannot be paid by `transfer`/`send`.** Measured, not inferred. It
  bears on how anything of ours pays a distribution, and on what we tell a payer.
- **1272 M-1 / M-4 and 1274 M-03 — the timelock queue is public and unordered.** Anyone may choose
  which matured action runs first, and a queued renounce applied first deletes the changes it was
  meant to follow. This is operational: it constrains how the Ops vault sequences a final table and a
  renounce. Nothing is queued on DNZN's clone today (`nonce()` 0, `pendingCount()` 0, read in 1274).

## Already in this project's record

Four of the external items correspond to something already written down here. **These pairings are
mine, made for triage — the auditor had none of these files and claimed no such thing**, and each
still needs a disposition that says whether the existing record answers the finding or the finding
sharpens the record.

| external | already here |
|:--|:--|
| 1272 M-2 / 1274 M-01 — a clone cannot be paid by a 2,300-gas `transfer`/`send`; measured 4,159 gas cold on Base | [`docs/ROADMAP.md`](../../docs/ROADMAP.md) § Findings carried forward, first bullet — measured in `m01-t01` at 1,662 gas warm, with a cold `DELEGATECALL` adding about 2,600, and `test_receiveUnderStipend` proving the warm path only. Carried issue [#18](https://github.com/dnznlabs/rake/issues/18) (closed). **Two measurements of the same thing; reconcile the numbers rather than filing it as new** |
| 1272 L-8 / 1274 L-03 — a token balance below `reserved` makes `distribute` revert | [`SECURITY.md`](../../SECURITY.md) § Findings — disposition, **F4**, dispositioned "none needed" under decision 23 and carried as [#19](https://github.com/dnznlabs/rake/issues/19) (closed). Raised by the two-model method on all three of its runs; **these are the fourth and fifth raisings, and the first two to rate it Low** (the 2026-11-06 rollup rated the consequence Medium) |
| 1272 I-4 — `release` copies and re-throws recipient-chosen revert data | Carried issue [#20](https://github.com/dnznlabs/rake/issues/20) (closed), `release` bubbling a bare `false` word as revert data. 1272 L-10 and 1274 L-09 sit beside it on the same reliance on the return word, and are not the same item |
| 1273 M-1 — `lock()` admits a pointer that deletes itself at the end of the transaction | [`SECURITY.md`](../../SECURITY.md) § Findings — disposition, **F11**, fixed by `_requireChunk` against a 7702 delegation designator. A second shape of the same vector, and **not** closed by that fix |

What is **not** in our record, as far as I can tell: the unordered application of matured timelock
actions (1272 M-1 / M-4, 1274 M-03), escrow having no exit for a contract that can neither receive in
100k gas nor call `claim` (1272 M-6 / 1274 L-04), and the clone address not committing to its
configuration (1272 M-5 / 1274 L-11). Those three are the ones to read as genuinely new.

## Provenance

| | |
|:--|:--|
| Vendor | One Dollar Audit, by LeftClaw Services — an AI auditor, paid $1 per engagement, escrowed on Base |
| Method, as the vendor states it | `deep-audit v3` — x-ray pre-scan, context map, checklist agents, then blind attack agents, reconciled with a coverage gate; each report's own header carries its agent counts and lens list |
| Stage at delivery | `audit-pass-2-pashov`, status Completed, read from each engagement page |
| What the vendor says about itself | "an AI first-pass, not a Big-4 replacement"; the engagement pages say the same |
| Independence from rake's own reviews | total: different vendor, different method, no access to this repository |
| Pulled by | Elanik, 2026-11-27T01:29Z, from each engagement's IPFS link, CIDs verified locally |

**Append-only, like every audit here.** Nothing in this directory is edited later; a correction goes
in the next audit's `AUDIT.md`, marked as superseding.
