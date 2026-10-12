# The dev chain's escrow and vault demos: what the write screens need and the seed does not carry —
# a live escrow in two assets, and a distribution owned by a contract. Numbered after the seed and
# deliberately not hooked to `deploy`: `deploy` is run by `make serve` on every chain start, and these
# two creates are a hand-run step. `mk/15-seed.mk` is #35's, so this lives beside it rather than in it.
.PHONY: fixtures

fixtures: ## Add the dev chain's escrow and vault demos (run by hand, after deploy)
	@FACTORY=$(FACTORY_ADDR) forge script scripts/forge/Fixtures.s.sol $(FORGE_SEND)
