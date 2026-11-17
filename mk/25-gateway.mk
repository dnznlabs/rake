# The ERC-5219 gateway the dev stack serves the on-chain `App` through. Exported like APP_PORT, so
# procs/30-gateway.yml and tools/gateway.sh read the same port the targets here do.
GATEWAY_PORT ?= 8787
export GATEWAY_PORT

.PHONY: gateway gateway-check

gateway: ## Run the web3url-gateway by hand (make serve runs it as a process)
	bash tools/gateway.sh

# Against a hosted gateway instead of the dev stack: APP=… RPC=… GATEWAY_BASE=… make gateway-check
gateway-check: ## Prove the ERC-5219 surface works through a real gateway
	@bash tools/gateway-check.sh
