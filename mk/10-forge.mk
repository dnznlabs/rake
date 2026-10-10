# Anvil's first dev account: public, deterministic, worthless. Override RPC, CHAIN_ID and
# SEND_FLAGS together to point the same targets at a real network.
ANVIL_PORT ?= 8545
RPC        ?= http://127.0.0.1:$(ANVIL_PORT)
CHAIN_ID   ?= 31337
SENDER     ?= 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
SEND_FLAGS ?= --unlocked --sender $(SENDER)
export ANVIL_PORT

FORGE_SEND := --rpc-url $(RPC) --broadcast $(SEND_FLAGS)
# "Name address" for every contract created by any deploy script on this chain.
DEPLOYED    = jq -r '.transactions[]|select(.transactionType=="CREATE")|"\(.contractName) \(.contractAddress)"' broadcast/*/$(CHAIN_ID)/run-latest.json

.PHONY: serve build test fmt clean deploy addresses

serve: ## Start the dev stack: anvil, a deploy, and whatever else procs/ holds
	process-compose $(addprefix -f ,$(sort $(wildcard procs/*.yml))) up

# Double-colon: later mk/ files add their own recipe to the same target, run in file order.
build:: ## Compile
	forge build

test:: ## Run the test suites
	forge test

fmt:: ## Check formatting
	forge fmt --check

clean:: ## Remove build artifacts
	forge clean

# Every scripts/forge/Deploy*.s.sol, each with its own broadcast log. LC_ALL=C because glob order is
# locale-dependent, and deploy order decides the addresses.
deploy:: ## Deploy to the chain at RPC (anvil by default)
	@cast block-number --rpc-url $(RPC) >/dev/null 2>&1 || \
	  { echo "deploy: no chain at $(RPC) — 'make serve' starts one"; exit 1; }
	@for s in $$(LC_ALL=C ls scripts/forge/Deploy*.s.sol); do forge script $$s $(FORGE_SEND) || exit 1; done

# The broadcast log outlives the chain, so each address is checked for code rather than trusted.
addresses: ## Print deployed addresses, flagging any with no code on chain
	@ls broadcast/*/$(CHAIN_ID)/run-latest.json >/dev/null 2>&1 || \
	  { echo "addresses: no deployment on chain $(CHAIN_ID) — run 'make deploy' first"; exit 1; }
	@$(DEPLOYED) | while read -r name addr; do \
	  a=$$(cast to-check-sum-address $$addr); \
	  code=$$(cast code $$a --rpc-url $(RPC) 2>/dev/null); \
	  case "$$code" in 0x|"") note="  (no code at $(RPC) — stale, redeploy)";; *) note="";; esac; \
	  printf '%-14s %s%s\n' $$name $$a "$$note"; \
	done
