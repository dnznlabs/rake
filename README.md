# DNZN // RAKE

Transparent fund distribution on Ethereum.

by **Denizen.** // dxnzn.wei

A distribution is one address with a published table of beneficiaries. Anything it receives, ETH or ERC-20, waits there until anyone calls `distribute()`, which pays it out by the table. Every change the owner makes to the table is queued behind a public time lock, so beneficiaries see it coming before it applies. The dapp and the widget are served from the chain by a contract of their own.

## Release Info

### Project Status

| STATUS | VERSION | AUDIT |
|:---|:---|:---|
| `pre-mvp` | `0.1alpha` | two-model agent review and Slither, 2026-11-06; the review of record, no paid review planned ([SECURITY.md](SECURITY.md)) |

This is pre-release software. The contracts are unaudited and are deployed to **Sepolia and Base Sepolia only** — see [Contracts](#contracts) for addresses and per-chain status. No mainnet deployment exists. Milestones and their status are in the [roadmap](docs/ROADMAP.md).

**Alpha software is alpha, act accordingly.** See [Disclaimer](#disclaimer).

### Disclaimer

Alpha software. The contracts are reviewed by the shared two-model method and Slither ([SECURITY.md](SECURITY.md)), not audited. No warranty. The contracts are immutable: a found bug is not patched, it is a new address. The alpha marks come off 90 days after the mainnet milestone closes with no `bug` issue filed and no accepted security finding ([decision 45](docs/ROADMAP.md#decisions)).

## Contracts

Every address below is **the same on both chains it is deployed to**, so a bookmark or an integration does not change from one chain to the next. Both contracts are placed by a salted `CREATE2`, which binds the address to the init code — so the address repeats on a new chain only while the compiled bytes are unchanged. **They have changed:** `main` has compiled with solc `0.8.38` since [#201](https://github.com/dnznlabs/rake/pull/201), and the salts of record were mined against the `0.8.34` init-code hashes. That mining run has now been repeated against the bytes `main` builds today, so [RUNBOOK.md](RUNBOOK.md) § 0 — variables carries new salts and a new address for each contract ([#202](https://github.com/dnznlabs/rake/pull/202), m05-t01). **The deployments below are still the `0.8.34` ones** and are self-consistent; the two testnets are redeployed to the new addresses in the second half of m05-t01, and the rows here are updated with it. Read the addresses in this section as a record of what is deployed, not as a prediction of where the next chain lands.

| CONTRACT | ADDRESS | ROLE |
|:---|:---|:---|
| `DistributionFactory` | [`0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B`](https://sepolia.etherscan.io/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B) | Places each `Distribution`, one per distribution. **Permissionless and unowned** — anyone may call `create`, and the caller names the owner of what they create |
| `App` | [`0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`](https://sepolia.etherscan.io/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE) | Serves the dapp and the widget from the chain over [ERC-5219](https://eips.ethereum.org/EIPS/eip-5219) |
| `App`'s owner | [`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`](https://sepolia.etherscan.io/address/0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790) | DNZN Ops, a multisig behind a time lock. Only it can change what `App` serves — and it owns nothing else here: `owner()` reverts on the factory, and each `Distribution` is owned by whoever created it |

A `Distribution` is not listed here: there is one address per distribution, created on demand through the factory. The one exception is DNZN's own fund distribution, because the dapp features it before a wallet is connected — at the new factory it is predicted to land at **`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`** on every chain, which is what `predict($DNZN_SALT)` answered on m05-t01's anvil with the factory at its § 0 address. It is **not created on any chain yet**; the second half of m05-t01 sends the first two `create`s and fills the status rows.

### Deployment Status

| CHAIN | CHAIN ID | FACTORY | APP | DOCUMENT | SOURCE VERIFIED (EXPLORER · SOURCIFY) |
|:---|:---|:---|:---|:---|:---|
| Sepolia | `11155111` | live, pre-#201 bytes | live, pre-#201 bytes | uploaded 2026-11-18 · `3751211` | explorer [factory](https://sepolia.etherscan.io/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B#code) · [app](https://sepolia.etherscan.io/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE#code) · Sourcify [factory](https://repo.sourcify.dev/11155111/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B) · [impl](https://repo.sourcify.dev/11155111/0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0) · [app](https://repo.sourcify.dev/11155111/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE) |
| Base Sepolia | `84532` | live, pre-#201 bytes | live, pre-#201 bytes | uploaded 2026-11-18 · `3751211` | explorer [factory](https://sepolia.basescan.org/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B#code) · [app](https://sepolia.basescan.org/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE#code) · Sourcify [factory](https://repo.sourcify.dev/84532/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B) · [impl](https://repo.sourcify.dev/84532/0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0) · [app](https://repo.sourcify.dev/84532/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE) |
| Ethereum, Base, Arbitrum, OP Mainnet | — | not deployed | not deployed | — | — |

Read live rather than trusted: `make addresses CHAIN_ID=<id>` prints the addresses from the broadcast logs, and `cast codesize <address> --rpc-url <rpc>` is the check that one is really there — `1320` for the factory and `7155` for `App` on both testnets today. Sources of record are `broadcast/<Script>/<chain id>/run-latest.json` and [`RUNBOOK.md`](RUNBOOK.md) § Executed on testnets.

Source is published in both places a client might look, at solc `0.8.34`: the explorers, and **[Sourcify](https://sourcify.dev), which is where a wallet looks to decode a call** — factory, implementation and `App` are each `exact_match` on both chains, `creationMatch` and `runtimeMatch` alike. A `Distribution` is a clone and Sourcify does not report one as verified at all, so its function and event signatures are registered on OpenChain instead; a wallet that cannot find the source can still show the function name.

### Opening the App

`App` holds the dapp as gzipped chunks and answers ERC-5219 requests, so it needs a client that speaks [`web3://`](https://eips.ethereum.org/EIPS/eip-4804) — either natively or through a gateway.

| HOW | SEPOLIA | BASE SEPOLIA |
|:---|:---|:---|
| A `web3://`-capable browser or extension | `web3://0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE:11155111/` | `web3://0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE:84532/` |
| Any browser, through the w3link gateway | [`…11155111.w3link.io`](https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.11155111.w3link.io/) | [`…84532.w3link.io`](https://0x00a90943f58b6ab7fde05aae01c13a80e6995bae.84532.w3link.io/) |

The widget is the same URL plus `/widget.js`. The gateway form is `https://<app address>.<chain id>.w3link.io/`, lowercase address, and it is a third-party service reading the same contract — nothing about the document depends on it. `make gateway` runs a gateway locally against the dev chain instead ([AGENTS.md](AGENTS.md) § The dapp).

**Two things to expect on a first visit.** The page arrives as a small self-extracting wrapper that inflates the document in the browser, so `curl` shows a short script rather than the dapp and a byte comparison against a local build will not match — a browser is the only valid check. And a gateway may inject a script of its own into the response; w3link does.

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
                    # Deploying to a real chain is RUNBOOK.md, not make serve
make test           # Run the contract and node tests
make addresses      # Print deployed addresses
make dapp-nodev     # Build the bundle that ships
make chunks         # Upload it to App on the dev chain
make help           # List every command
```

Tools come from devbox, loaded by direnv; run forge through devbox, since the pinned version is the one the gas snapshot matches. See [Contracts and the dev chain](AGENTS.md#contracts-and-the-dev-chain).

```bash
make setup                               # Fetch the pinned submodules: forge-std and solady
devbox run -- forge build                 # Build, with no warnings expected
devbox run -- forge snapshot --check      # Gas snapshot, as CI runs it
node --test test/*.test.mjs               # Dapp and widget tests
```

## Credits

The design of these contracts derives from [multisig.software](https://multisig.software) by Src Co / z0r0z: the timelock, the self-call setters, the PUSH0 clones and the sender-bound salt. The low-level patterns follow [Solady](https://github.com/Vectorized/solady).

Rake is a fully on-chain contract-hosted dapp, also after z0r0z's work: the dapp is served by the `html()` view of a contract, as [ERC-8244](https://github.com/ethereum/ERCs/pull/1712) proposes, and gateways reach the same contract through ERC-5219. There is no server behind it; the widget is served the same way.

## Development Team

| Name | GPG Key | GitHub | EOA |
|:-----|:--------|:-------|:----|
| Denizen. | [`0DC6C60CFBD5E456`](https://keys.openpgp.org/search?q=CD435BB6A7BED718D95616450DC6C60CFBD5E456) | [`dxnzn`](https://github.com/dxnzn) | [`0x3578...902B`](https://etherscan.io/address/0x357836fFcB45307FA7ff2A574F505753c961902B) *dxnzn.wei* |
| Elanik. | [`70B6B0BB5F26178A`](https://keys.openpgp.org/search?q=DC49D48844590FA752780FFE70B6B0BB5F26178A) | [`elanikk`](https://github.com/elanikk) | [`0x5A15...C50d`](https://etherscan.io/address/0x5A158aF8DC28FE756dB81Ef669e4Db2536bBC50d) *elanik.wei* |
| Lakos. | [`591DE0ECA387697A`](https://keys.openpgp.org/search?q=B7EABCBD80422BCC1AE0B23F591DE0ECA387697A) | [`lakkoss`](https://github.com/lakkoss) | [`0x9a54...4529`](https://etherscan.io/address/0x9a5489bB67d68ABABdA050A3b52d4F98Fe224529) *lakos.wei* |

## License

MIT — see [LICENSE](LICENSE).
