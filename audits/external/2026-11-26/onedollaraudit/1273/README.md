# Rake `App` — One Dollar Audit, engagement 1273

[`report.md`](report.md) **is the delivered report, untouched** — the bytes the auditor filed, with
nothing of ours added, so the content address below is the file's own. This file is the callout for
it: where it came from, what it covered, and how to check the copy.

| | |
|:--|:--|
| Hosted report (HTML) | <https://leftclaw.services/result/1273.html> |
| Delivered markdown, on IPFS | `bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde` — <https://bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde.ipfs.community.bgipfs.com/> |
| Engagement record | <https://www.onedollaraudit.com/audit/1273> · job detail <https://leftclaw.services/jobs/1273> |
| Target | `App` [`0x00a9F390A6010d045e0d34856048DdD6910d25BA`](https://basescan.org/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA), Base (8453); the same source is verified at the same address on Ethereum (1) and Base Sepolia (84532) |
| Commissioned | 2026-11-26 18:06:30 CST; report dated 2026-11-27 UTC, pulled 2026-11-27T01:29Z |
| Severity counts, as filed | 0 Critical · 0 High · 1 Medium · 13 Low · 8 Informational |
| Vendor | One Dollar Audit (LeftClaw Services) — an AI auditor, $1 per engagement; it calls its own work "an AI first-pass, not a Big-4 replacement" |

**Checking this copy** — one fetch and one compare, and the content address is of `report.md` itself:

```sh
curl -sS -L "https://bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde.ipfs.community.bgipfs.com/" | cmp - report.md && echo identical
# or, without the gateway: CIDv1, raw codec, sha2-256 of report.md == bafkreidt3yk43fimnxzzrrziufujyaaqp3fnjtyrsqx4lru2f3urgwtxde
```

**No disposition is recorded here, and none of it is the auditor's to make.** The index for this
filing is [`INDEX.md`](../../INDEX.md), the rules for filing an external review are
[`audits/README.md`](../../../../README.md) § External commissioned reviews, and the project's
security posture and every finding's disposition are
[`SECURITY.md`](../../../../../SECURITY.md).
