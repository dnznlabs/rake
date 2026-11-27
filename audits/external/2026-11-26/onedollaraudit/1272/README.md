# Rake Distribution factory and implementation — One Dollar Audit, engagement 1272

[`report.md`](report.md) **is the delivered report, untouched** — the bytes the auditor filed, with
nothing of ours added, so the content address below is the file's own. This file is the callout for
it: where it came from, what it covered, and how to check the copy.

| | |
|:--|:--|
| Hosted report (HTML) | <https://leftclaw.services/result/1272.html> |
| Delivered markdown, on IPFS | `bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly` — <https://bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly.ipfs.community.bgipfs.com/> |
| Engagement record | <https://www.onedollaraudit.com/audit/1272> · job detail <https://leftclaw.services/jobs/1272> |
| Target | `DistributionFactory` [`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`](https://basescan.org/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) and the `Distribution` implementation [`0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`](https://basescan.org/address/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A), Base (8453) |
| Commissioned | 2026-11-26 18:05:25 CST; report dated 2026-11-27 UTC, pulled 2026-11-27T01:29Z |
| Severity counts, as filed | 0 Critical · 0 High · 6 Medium · 12 Low · 8 Informational |
| Vendor | One Dollar Audit (LeftClaw Services) — an AI auditor, $1 per engagement; it calls its own work "an AI first-pass, not a Big-4 replacement" |

**Checking this copy** — one fetch and one compare, and the content address is of `report.md` itself:

```sh
curl -sS -L "https://bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly.ipfs.community.bgipfs.com/" | cmp - report.md && echo identical
# or, without the gateway: CIDv1, raw codec, sha2-256 of report.md == bafkreih2omrnsmbcqmrhkbek7u5tirld6rekeq5unaqte3eukfmnu4slly
```

**No disposition is recorded here, and none of it is the auditor's to make.** The index for this
filing is [`INDEX.md`](../../INDEX.md), the rules for filing an external review are
[`audits/README.md`](../../../../README.md) § External commissioned reviews, and the project's
security posture and every finding's disposition are
[`SECURITY.md`](../../../../../SECURITY.md).
