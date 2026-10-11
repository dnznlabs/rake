APP_PORT ?= 3000
export APP_PORT

.PHONY: dapp dapp-nodev

dapp: ## Build app/dist against the deployed addresses, dev overrides kept
	@node app/build.mjs --dev --chain $(CHAIN_ID) --set FEATURED_SALT=$(FEATURED_SALT)

dapp-nodev: ## Same, without the dev overrides: the bundle that ships
	@node app/build.mjs --chain $(CHAIN_ID) --set FEATURED_SALT=$(FEATURED_SALT)

test::
	node --test test/*.test.mjs

clean::
	rm -rf app/dist

deploy::
	@$(MAKE) --no-print-directory dapp
	@echo "dapp: http://localhost:$(APP_PORT)/?rpc=$(RPC)&from=$(SENDER)  (dev build: no wallet needed)"
