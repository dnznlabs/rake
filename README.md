# DNZN // RAKE

Transparent fund distribution on Ethereum.

by **Denizen.** // dxnzn.wei

A distribution is one address with a published table of beneficiaries. Anything it receives, ETH or ERC-20, waits there until anyone calls `distribute()`, which pays it out by the table. Every change the owner makes to the table is queued behind a public time lock, so beneficiaries see it coming before it applies. The dapp and the widget are served from the chain by a contract of their own.

## Release Info

### Project Status

| STATUS | VERSION | AUDIT |
|:---|:---|:---|
| `pre-mvp` | `0.1alpha` | two-model agent review and Slither, 2026-11-06, the review of record; three commissioned $1 AI reviews of the deployed Base contracts, 2026-11-26; no professional paid audit planned ([SECURITY.md](SECURITY.md)) |

This is pre-release software and the contracts are unaudited. **They are now on Ethereum and Base as well as Sepolia and Base Sepolia** — see [Contracts](#contracts) for addresses and per-chain status. **The dapp's document is uploaded on all four**, since 2026-11-26 on Ethereum and Base, and is served at [`rake.dnzn.dev`](https://rake.dnzn.dev/) — see [Opening the App](#opening-the-app). Milestones and their status are in the [roadmap](docs/ROADMAP.md).

**Alpha software is alpha, act accordingly.** See [Disclaimer](#disclaimer).

### Disclaimer

Alpha software. The contracts are reviewed by the shared two-model method, by Slither, and by three commissioned $1 AI reviews of the deployed contracts ([SECURITY.md](SECURITY.md)) — none of which is a professional audit, and the vendor of the third says so itself. No warranty. The contracts are immutable: a found bug is not patched, it is a new address. The alpha marks come off 90 days after the mainnet milestone closes with no `bug` issue filed and no accepted security finding ([decision 45](docs/ROADMAP.md#decisions)).

## Contracts

Every address below is **the same on all four chains it is deployed to** — Ethereum, Base, Sepolia and Base Sepolia — so a bookmark or an integration does not change from one chain to the next. Both contracts are placed by a salted `CREATE2`, which binds the address to the init code — so the address repeats on a new chain only while the compiled bytes are unchanged. The addresses moved once, when `main` re-pinned solc to `0.8.38` in [#201](https://github.com/dnznlabs/rake/pull/201): the salts were re-mined and both testnets redeployed on 2026-11-20, and the pre-#201 deployments are kept in [Deployment Status](#deployment-status) as the rows marked **superseded**. Read the addresses in this section as a record of what is deployed, not as a prediction of where the next chain lands.

| CONTRACT | ADDRESS | ROLE |
|:---|:---|:---|
| `DistributionFactory` | [`0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E`](https://sepolia.etherscan.io/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) | Places each `Distribution`, one per distribution. **Permissionless and unowned** — anyone may call `create`, and the caller names the owner of what they create |
| `App` | [`0x00a9F390A6010d045e0d34856048DdD6910d25BA`](https://sepolia.etherscan.io/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA) | Serves the dapp and the widget from the chain over [ERC-5219](https://eips.ethereum.org/EIPS/eip-5219) |
| `App`'s owner | [`0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`](https://sepolia.etherscan.io/address/0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790) | DNZN Ops, a multisig behind a time lock. Only it can change what `App` serves — and it owns nothing else here: `owner()` reverts on the factory, and each `Distribution` is owned by whoever created it |

A `Distribution` is not listed here: there is one address per distribution, created on demand through the factory. The one exception is DNZN's own fund distribution, because the dapp features it before a wallet is connected — it is at **`0xB611Ff193DA8Fa9391C0A3DAa29C3c9a0F4D5199`** on every chain the factory reaches, which is what `predict($DNZN_SALT)` answers against the factory above. It is **live on all four chains** — on both mainnets, read 2026-11-22: `codesize` 45, owner the Ops vault `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, `delay()` **604800** on Ethereum and on Base; and on both testnets, read 2026-11-21, the same with `delay()` 86400 on each. The pre-#201 Sepolia distribution at `0x71a4221974Fc2E95081AE513248918dF27CF7a4A` stays live under the superseded factory and is not this one.

### Deployment Status

| CHAIN | CHAIN ID | FACTORY | APP | DOCUMENT | SOURCE VERIFIED (EXPLORER · SOURCIFY) |
|:---|:---|:---|:---|:---|:---|
| Sepolia | `11155111` | live | live | uploaded 2026-11-26 · `4fb6296` · `fbd05198…49043549` | explorer [factory](https://sepolia.etherscan.io/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E#code) · [app](https://sepolia.etherscan.io/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA#code) · Sourcify [factory](https://repo.sourcify.dev/11155111/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) · [impl](https://repo.sourcify.dev/11155111/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A) · [app](https://repo.sourcify.dev/11155111/0x00a9F390A6010d045e0d34856048DdD6910d25BA) |
| Base Sepolia | `84532` | live | live | uploaded 2026-11-26 · `4fb6296` · `525f4e3f…e2011d08` | explorer [factory](https://sepolia.basescan.org/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E#code) · [app](https://sepolia.basescan.org/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA#code) · Sourcify [factory](https://repo.sourcify.dev/84532/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) · [impl](https://repo.sourcify.dev/84532/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A) · [app](https://repo.sourcify.dev/84532/0x00a9F390A6010d045e0d34856048DdD6910d25BA) |
| Sepolia | `11155111` | **superseded, pre-#201 bytes** | **superseded, pre-#201 bytes** | uploaded 2026-11-18 · `3751211` | explorer [factory](https://sepolia.etherscan.io/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B#code) · [app](https://sepolia.etherscan.io/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE#code) · Sourcify [factory](https://repo.sourcify.dev/11155111/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B) · [impl](https://repo.sourcify.dev/11155111/0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0) · [app](https://repo.sourcify.dev/11155111/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE) |
| Base Sepolia | `84532` | **superseded, pre-#201 bytes** | **superseded, pre-#201 bytes** | uploaded 2026-11-18 · `3751211` | explorer [factory](https://sepolia.basescan.org/address/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B#code) · [app](https://sepolia.basescan.org/address/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE#code) · Sourcify [factory](https://repo.sourcify.dev/84532/0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B) · [impl](https://repo.sourcify.dev/84532/0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0) · [app](https://repo.sourcify.dev/84532/0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE) |
| Ethereum | `1` | **live**, 2026-11-22 | **live**, 2026-11-22 | **live**, 2026-11-26 · `52a8602c…b1bb89e` · 3 chunks | explorer [factory](https://etherscan.io/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E#code) · [impl](https://etherscan.io/address/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A#code) · [app](https://etherscan.io/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA#code), verified — read back 2026-11-26, `getsourcecode` carries no timestamp · sourcify [factory](https://sourcify.dev/server/v2/contract/1/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) · [app](https://sourcify.dev/server/v2/contract/1/0x00a9F390A6010d045e0d34856048DdD6910d25BA) · [implementation](https://sourcify.dev/server/v2/contract/1/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A), all `exact_match` |
| Base | `8453` | **live**, 2026-11-22 | **live**, 2026-11-22 | **live**, 2026-11-26 · `e9af3eaa…c4c4f556` · 3 chunks | explorer [factory](https://basescan.org/address/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E#code) · [impl](https://basescan.org/address/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A#code) · [app](https://basescan.org/address/0x00a9F390A6010d045e0d34856048DdD6910d25BA#code), verified — read back 2026-11-26, `getsourcecode` carries no timestamp · sourcify [factory](https://sourcify.dev/server/v2/contract/8453/0x00D19609f2349d4160D2BaBAf46b0Cd1eC6d7f8E) · [app](https://sourcify.dev/server/v2/contract/8453/0x00a9F390A6010d045e0d34856048DdD6910d25BA) · [implementation](https://sourcify.dev/server/v2/contract/8453/0xc4eD7EA21B8CC334F08945B4D0c182e0afF8cB0A), all `exact_match` |
| Arbitrum One, OP Mainnet, MegaETH, Robinhood Chain | — | not deployed | not deployed | — | — |

Read live rather than trusted: `make addresses CHAIN_ID=<id>` prints the addresses from the broadcast logs, and `cast codesize <address> --rpc-url <rpc>` is the check that one is really there — on both testnets today the live set reads **`1319`** for the factory, **`9277`** for the implementation and **`7154`** for `App`, and the superseded set reads `1320` and `7155`, which is also the cheapest way to tell the two apart. Sources of record are `broadcast/<Script>/<chain id>/run-latest.json` and [`RUNBOOK.md`](RUNBOOK.md) § Executed on testnets.

Source is published in both places a client might look, at solc `0.8.38` for the live set and `0.8.34` for the superseded one: the explorers, and **[Sourcify](https://sourcify.dev), which is where a wallet looks to decode a call** — factory, implementation and `App` are each `exact_match` on both chains, verified 2026-11-20 by the asserting loop rather than by eye. A `Distribution` is a clone and Sourcify does not report one as verified at all, so its function and event signatures are registered on OpenChain instead; a wallet that cannot find the source can still show the function name.

### Opening the App

`App` holds the dapp as gzipped chunks and answers ERC-5219 requests, so it needs a client that speaks [`web3://`](https://eips.ethereum.org/EIPS/eip-4804) — either natively or through a gateway.

One row per chain, and **the address is `App`'s live one on every chain** — `0x00a9F390A6010d045e0d34856048DdD6910d25BA`. The address this table named until 2026-11-26 was `App`'s pre-#201 one, which is still deployed on the testnets and still answers with the document it was given in M04, so a reader following it saw a real page that was not this one ([#411](https://github.com/dnznlabs/rake/issues/411)).

| CHAIN | A `web3://`-capable browser or extension | Any browser, through the w3link gateway | DNZN's own gateway, on `dnzn.dev` |
|:---|:---|:---|:---|
| Ethereum (`1`) | `web3://0x00a9F390A6010d045e0d34856048DdD6910d25BA:1/` | [`…1.w3link.io`](https://0x00a9f390a6010d045e0d34856048ddd6910d25ba.1.w3link.io/) | [`rake.dnzn.dev/`](https://rake.dnzn.dev/) — **the bare root lands here** |
| Base (`8453`) | `web3://0x00a9F390A6010d045e0d34856048DdD6910d25BA:8453/` | [`…8453.w3link.io`](https://0x00a9f390a6010d045e0d34856048ddd6910d25ba.8453.w3link.io/) | [`rake.dnzn.dev/8453/`](https://rake.dnzn.dev/8453/) |
| Sepolia (`11155111`) | `web3://0x00a9F390A6010d045e0d34856048DdD6910d25BA:11155111/` | answers **400** — a third-party condition on that one host, not a fault in the document ([#411](https://github.com/dnznlabs/rake/issues/411)) | [`rake.dnzn.dev/11155111/`](https://rake.dnzn.dev/11155111/) |
| Base Sepolia (`84532`) | `web3://0x00a9F390A6010d045e0d34856048DdD6910d25BA:84532/` | [`…84532.w3link.io`](https://0x00a9f390a6010d045e0d34856048ddd6910d25ba.84532.w3link.io/) | [`rake.dnzn.dev/84532/`](https://rake.dnzn.dev/84532/) |

The last column is this project's own deployment of [gw44](https://github.com/dnznlabs/gw44) reading the same contract on the same chains: three static files on a domain DNZN controls, with the contract read in your browser rather than by a server. `/` goes to Ethereum because it is the first mainnet chain with a document on it.

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
