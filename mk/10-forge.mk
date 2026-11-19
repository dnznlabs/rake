# Anvil's first dev account: public, deterministic, worthless. Override RPC, CHAIN_ID and
# SEND_FLAGS together to point the same targets at a real network.
ANVIL_PORT ?= 8545
RPC        ?= http://127.0.0.1:$(ANVIL_PORT)
CHAIN_ID   ?= 31337
SENDER     ?= 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
SEND_FLAGS ?= --unlocked --sender $(SENDER)
# `DeployApp.s.sol` requires OWNER with no default (`SECURITY.md` F3), and `make deploy` passes no
# environment, so default it to the dev sender here. A real deploy exports it (RUNBOOK.md § 0).
OWNER      ?= $(SENDER)
export ANVIL_PORT OWNER

FORGE_SEND := --rpc-url $(RPC) --broadcast $(SEND_FLAGS)
# "Name address" for every contract created by any deploy script on this chain. Both creation types:
# the deploy scripts place through a deterministic deployer, which the broadcast log records as
# CREATE2, and a CREATE-only filter would leave `addresses` and the `deploy::` guard below blind.
DEPLOYED    = jq -r '.transactions[]|select(.transactionType=="CREATE" or .transactionType=="CREATE2")|"\(.contractName) \(.contractAddress)"' broadcast/*/$(CHAIN_ID)/run-latest.json

# Every path under lib/ a forge command needs. The names are listed rather than globbed from
# .gitmodules so that an empty lib/ is distinguishable from a lib/ that was never meant to hold
# anything.
LIBS := lib/forge-std lib/solady

.PHONY: serve build test fmt clean deploy addresses slither setup libs

setup: ## Fetch the pinned submodules: the one step a fresh clone or `git worktree add` needs
	git submodule update --init --recursive

# `setup` is the only target that writes lib/. Nothing below it updates a submodule implicitly:
# they are pinned to a tag, `forge install` would move them, and a build that quietly ran
# `submodule update` would drag a deliberately-moved submodule back to the pin — the silent clobber
# `init.sh` uses copy-if-absent to avoid. So the forge targets check and stop.
#
# Without the check, an uninitialised lib/ surfaces three layers down as an unresolved import
# (`solady/utils/Base64.sol not found` from `src/App.sol:6`), which reads as a broken source tree
# rather than an empty checkout.
libs:
	@for d in $(LIBS); do \
	  [ -n "$$(ls -A $$d 2>/dev/null)" ] || \
	    { echo "$$d is empty — the pinned submodules are not checked out. Run 'make setup' first."; exit 1; }; \
	done

serve: libs ## Start the dev stack: anvil, a deploy, and whatever else procs/ holds
	process-compose $(addprefix -f ,$(sort $(wildcard procs/*.yml))) up

# Double-colon: later mk/ files add their own recipe to the same target, run in file order.
build:: libs ## Compile
	forge build

test:: libs ## Run the test suites
	forge test

fmt:: ## Check formatting
	forge fmt --check

clean:: ## Remove build artifacts
	forge clean

# `slither.config.json` holds the whole configuration, including `fail_on: pedantic`, so an
# untriaged result is a non-zero exit. The run is only green because `slither.db.json` carries one
# triage entry per row of `SECURITY.md` § Static analysis; the two move together in the same PR.
# Single-colon and not part of `test`: Slither's compile rewrites `out/` without the test artifacts,
# so a `forge test` or `forge snapshot --check` chained behind it pays a full rebuild.
slither: ## Static analysis gate — every result triaged in SECURITY.md
	slither .

# Every scripts/forge/Deploy*.s.sol, each with its own broadcast log. LC_ALL=C because glob order is
# locale-dependent, and deploy order decides the addresses.
#
# The second recipe line refuses a chain that already carries the factory. The reason is no longer
# that the address would move — the factory is placed through a deterministic deployer now, so the
# same salt and init code give the same address every time. It is #22's: a second deploy is a CREATE2
# collision, and a collision burns every unit of gas forwarded to it before anything can revert, so
# the refusal is what keeps a re-run from costing the whole gas limit. The log is read the way
# `addresses` reads it, and the logged address is checked for code, so an anvil that has restarted
# falls through and deploys.
# `deploy::` is double-colon, so this `exit 1` stops `make` before the seed, fixtures and dapp
# recipes in the later mk/ files run — which is the point.
deploy:: libs ## Deploy to the chain at RPC (anvil by default)
	@cast block-number --rpc-url $(RPC) >/dev/null 2>&1 || \
	  { echo "deploy: no chain at $(RPC) — 'make serve' starts one"; exit 1; }
	@if ls broadcast/*/$(CHAIN_ID)/run-latest.json >/dev/null 2>&1; then \
	  f=$$($(DEPLOYED) | awk '$$1=="DistributionFactory"{print $$2}' | tail -1); \
	  if [ -n "$$f" ]; then \
	    a=$$(cast to-check-sum-address $$f); \
	    code=$$(cast code $$a --rpc-url $(RPC) 2>/dev/null); \
	    case "$$code" in 0x|"") ;; *) \
	      echo "deploy: chain $(CHAIN_ID) at $(RPC) already has DistributionFactory at $$a — restart anvil for a fresh chain, or 'make dapp-nodev && make chunks && make dapp' to re-upload the dapp"; \
	      exit 1;; \
	    esac; \
	  fi; \
	fi
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
