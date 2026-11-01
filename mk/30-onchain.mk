.PHONY: chunks chain-doc

APP_ADDR = $$($(DEPLOYED) | awk '$$1=="App"{print $$2}')

# Uploads whatever app/dist holds. Run `make dapp-nodev` first: a dev bundle on chain reads through
# its ?rpc= override and never reaches a wallet.
chunks: ## Upload app/dist as gzipped SSTORE2 chunks
	@APP=$(APP_ADDR) forge script scripts/forge/Chunks.s.sol $(FORGE_SEND)

# `--app` explicitly, as `chunks` above already does: `chain-doc.mjs`'s own fallback lookup reads the
# broadcast log with a CREATE-only filter, which a salted deploy never matches. Passing the address
# routes the lookup through `DEPLOYED`, which accepts both creation types in one place.
chain-doc: ## Extract and hash the document html() returns
	@node tools/chain-doc.mjs --app $(APP_ADDR) --rpc $(RPC) --chain $(CHAIN_ID)

# The chunks are cut from the non-dev bundle; the dev one is rebuilt last because the static server
# reads the same app/dist.
deploy::
	@$(MAKE) --no-print-directory dapp-nodev
	@$(MAKE) --no-print-directory chunks
	@$(MAKE) --no-print-directory dapp
