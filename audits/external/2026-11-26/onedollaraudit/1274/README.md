# DNZN's distribution — One Dollar Audit, engagement 1274

[`report.md`](report.md) **is the delivered report, untouched** — the bytes the auditor filed, with
nothing of ours added, so the content address below is the file's own. This file is the callout for
it: where it came from, what it covered, and how to check the copy.

| | |
|:--|:--|
| Hosted report (HTML) | <https://leftclaw.services/result/1274.html> |
| Delivered markdown, on IPFS | `bafkreib55lzeh5vuuzrkmfdd64uq6kcknvr24v347xong53xqeqlppaoem` — <https://bafkreib55lzeh5vuuzrkmfdd64uq6kcknvr24v347xong53xqeqlppaoem.ipfs.community.bgipfs.com/> |
| Engagement record | <https://www.onedollaraudit.com/audit/1274> · job detail <https://leftclaw.services/jobs/1274> |
| Target | the DNZN distribution clone [`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`](https://basescan.org/address/0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199) and, behind it, the `Distribution` implementation `0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A`, Base (8453) |
| Commissioned | 2026-11-26 18:14:25 CST; report dated 2026-11-27 UTC, pulled 2026-11-27T01:29Z |
| Severity counts, as filed | 0 Critical · 0 High · 3 Medium · 13 Low · 7 Informational |
| Vendor | One Dollar Audit (LeftClaw Services) — an AI auditor, $1 per engagement; it calls its own work "an AI first-pass, not a Big-4 replacement" |

**Checking this copy** — one fetch and one compare, and the content address is of `report.md` itself:

```sh
curl -sS -L "https://bafkreib55lzeh5vuuzrkmfdd64uq6kcknvr24v347xong53xqeqlppaoem.ipfs.community.bgipfs.com/" | cmp - report.md && echo identical
# or, without the gateway: CIDv1, raw codec, sha2-256 of report.md == bafkreib55lzeh5vuuzrkmfdd64uq6kcknvr24v347xong53xqeqlppaoem
```

**No disposition is recorded here, and none of it is the auditor's to make.** The index for this
filing is [`INDEX.md`](../../INDEX.md), the rules for filing an external review are
[`audits/README.md`](../../../../README.md) § External commissioned reviews, and the project's
security posture and every finding's disposition are
[`SECURITY.md`](../../../../../SECURITY.md).
