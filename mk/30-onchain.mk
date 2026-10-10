.PHONY: chunks chain-doc

APP_ADDR = $$($(DEPLOYED) | awk '$$1=="App"{print $$2}')

# Uploads whatever app/dist holds. Run `make dapp-nodev` first: a dev bundle on chain reads through
# its ?rpc= override and never reaches a wallet.
chunks: ## Upload app/dist as gzipped SSTORE2 chunks
	@APP=$(APP_ADDR) forge script scripts/forge/Chunks.s.sol $(FORGE_SEND)

chain-doc: ## Extract and hash the document html() returns
	@node tools/chain-doc.mjs --rpc $(RPC) --chain $(CHAIN_ID)

# The chunks are cut from the non-dev bundle; the dev one is rebuilt last because the static server
# reads the same app/dist.
deploy::
	@$(MAKE) --no-print-directory dapp-nodev
	@$(MAKE) --no-print-directory chunks
	@$(MAKE) --no-print-directory dapp
