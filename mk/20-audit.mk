# Two independent adversarial reviews of the files in audits/SCOPE, captured separately and reconciled
# into audits/<date>/AUDIT.md. The method is audits/README.md; the prompts are audits/prompts/, in
# prose, deliberately outside the runner.
#
# Models are variables so neither is relitigated in prose. CLAUDE_MODEL is an alias for the latest
# Opus rather than a pinned version string — the provenance block records what it resolved to.
CLAUDE_MODEL ?= opus
CODEX_MODEL  ?= gpt-5.6-sol

.PHONY: audit

audit: ## Two independent adversarial security reviews of audits/SCOPE, reconciled
	@CLAUDE_MODEL=$(CLAUDE_MODEL) CODEX_MODEL=$(CODEX_MODEL) bash scripts/audit.sh
