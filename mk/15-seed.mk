# The featured distribution: the one the dapp shows before a wallet is connected. Numbered between
# the forge deploy and the dapp build, because the seed needs the factory and the build needs the salt.
FACTORY_ADDR = $$($(DEPLOYED) | awk '$$1=="DistributionFactory"{print $$2}')

# One build token, never an address: the dapp derives the address from `predict(salt)`. The top 20
# bytes are SENDER, as decision 10 requires of every salt; the low 12 are 1.
FEATURED_SALT ?= 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001
export FEATURED_SALT

# No `##`: `make help` already lists deploy, and a second line for the same target reads as a
# second target.
deploy::
	@FACTORY=$(FACTORY_ADDR) forge script scripts/forge/Seed.s.sol $(FORGE_SEND)
