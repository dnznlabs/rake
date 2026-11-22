.PHONY: attest

# The bytecode attestation (decision 56 d). Reads every `deployments/<chainId>.json` over that
# chain's public endpoint in `deploy/chains.json` and proves two things at once: the chain still
# holds the bytes the record names, and those bytes are the ones this tree builds. No key, no
# secret — a stranger can run it, which is what makes it an attestation rather than a self-report.
#
# `forge build` first, because the comparison reads `out/`'s artifacts: the factory's
# `immutableReferences` and its `deployedBytecode` have to come from one build, not two.
attest: ## Prove each chain holds the bytes this tree builds
	@forge build
	@node tools/attest.mjs
