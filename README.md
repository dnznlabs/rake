# DNZN // RAKE

Transparent fund distribution on Ethereum.

by **Denizen.** // dxnzn.wei

A distribution is one address with a published table of beneficiaries. Anything it receives, ETH or ERC-20, waits there until anyone calls `distribute()`, which pays it out by the table. Every change the owner makes to the table is queued behind a public time lock, so beneficiaries see it coming before it applies. The dapp and the widget are served from the chain by a contract of their own.

## Release Info

### Project Status

| STATUS | VERSION | AUDIT |
|:---|:---|:---|
| `pre-mvp` | unreleased | two-model agent review, 2026-10-30 ([SECURITY.md](SECURITY.md)) |

This is pre-release software. The contracts are unaudited and deployed only to a local dev chain. Milestones and their status are in the [roadmap](docs/ROADMAP.md).

No warranty.

## Documentation

| DOCUMENT | DESCRIPTION |
|----------|-------------|
| [Roadmap](docs/ROADMAP.md) | Milestones, decisions and status |
| [Reference](docs/REFERENCE.md) | The contracts' functions, events, errors and the `Snapshot` struct |
| [Project Overview](docs/brainstorming/PROJECT_OVERVIEW.md) | The spec the roadmap was planned from |
| [M01](docs/milestones/m01/MILESTONE.md) | The contract |
| [M02](docs/milestones/m02/MILESTONE.md) | Dapp and widget on anvil |
| [Working Conventions](AGENTS.md) | Workflow, commands and gotchas for contributors, human or agent |

## Development

### Common Helpers

```bash
make init           # Initialize the development environment (devbox, git hooks)
make serve          # Start anvil, deploy, and serve the dapp on :3000
make test           # Run the contract and node tests
make addresses      # Print deployed addresses
make dapp-nodev     # Build the bundle that ships
make chunks         # Upload it to App on the dev chain
make help           # List every command
```

Tools come from devbox, loaded by direnv; run forge through devbox, since the pinned version is the one the gas snapshot matches. See [Contracts and the dev chain](AGENTS.md#contracts-and-the-dev-chain).

```bash
git submodule update --init --recursive   # forge-std and solady
devbox run -- forge build                 # Build, with no warnings expected
devbox run -- forge snapshot --check      # Gas snapshot, as CI runs it
node --test test/*.test.mjs               # Dapp and widget tests
```

## Development Team

| Name | GPG Key | GitHub | EOA |
|:-----|:--------|:-------|:----|
| Denizen. | [`0DC6C60CFBD5E456`](https://keys.openpgp.org/search?q=CD435BB6A7BED718D95616450DC6C60CFBD5E456) | [`dxnzn`](https://github.com/dxnzn) | [`0x3578...902B`](https://etherscan.io/address/0x357836fFcB45307FA7ff2A574F505753c961902B) *dxnzn.wei* |
| Elanik. | [`70B6B0BB5F26178A`](https://keys.openpgp.org/search?q=DC49D48844590FA752780FFE70B6B0BB5F26178A) | [`elanikk`](https://github.com/elanikk) | [`0x5A15...C50d`](https://etherscan.io/address/0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d) *elanik.wei* |
| Lakos. | [`591DE0ECA387697A`](https://keys.openpgp.org/search?q=B7EABCBD80422BCC1AE0B23F591DE0ECA387697A) | [`lakkoss`](https://github.com/lakkoss) | [`0x9a54...4529`](https://etherscan.io/address/0x9a5489bB67d68ABABdA050A3b52d4F98Fe224529) *lakos.wei* |

## License

MIT — see [LICENSE](LICENSE).
