# The featured distribution: the one the dapp shows before a wallet is connected. Numbered between
# the forge deploy and the dapp build, because the seed needs the factory and the build needs the salt.
FACTORY_ADDR = $$($(DEPLOYED) | awk '$$1=="DistributionFactory"{print $$2}')

# One build token, never an address: the dapp derives the address from `predict(salt)`. The top 20
# bytes are the creator, as decision 10 requires of every salt; the low 12 are 1. The dev chain
# features the seed's distribution (anvil account 0); every other chain the DNZN fund distribution,
# created by the DNZN Creator key 0x68e0…86eE at the same salt on each (decision 54).
FEATURED_SALT_DEV  = 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000001
FEATURED_SALT_DNZN = 0x68e0741d8d693e14bf56914567eaddc130b186ee000000000000000000000001
FEATURED_SALT ?= $(if $(filter 31337,$(CHAIN_ID)),$(FEATURED_SALT_DEV),$(FEATURED_SALT_DNZN))
export FEATURED_SALT

# No `##`: `make help` already lists deploy, and a second line for the same target reads as a
# second target.
deploy::
	@FACTORY=$(FACTORY_ADDR) forge script scripts/forge/Seed.s.sol $(FORGE_SEND)
