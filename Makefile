.PHONY: help init add
.DEFAULT_GOAL := help

help: ## List commands
	@awk -F ':+[^#]*## ' '/^[a-zA-Z0-9_-]+:+[^#]*## /{printf "  make %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init: ## Init development
	bash ../shared/scripts/init.sh

add: ## Add a template fragment: make add F=<name>; no F lists them
	@bash ../shared/scripts/add.sh $(F)

include $(sort $(wildcard mk/*.mk))
