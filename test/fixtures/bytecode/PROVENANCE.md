# Bytecode fixtures — provenance

Written by `tools/bytecode-fixtures.sh`. **Runtime** bytecode, fetched with `cast code`; see that
script's header for why runtime and not creation bytecode, and `test/PushGas.t.sol` for the codehash
assertion that holds a fixture to being the audited contract.

- Chain: `1` (Ethereum mainnet)
- Block: `26283809`
- Observed: 2026-10-27 11:40:59Z (the block's own timestamp, so a pinned block reproduces this file)
- RPC: `https://eth.drpc.org`

| fixture | contract | address | bytes | codehash |
|:--|:--|:--|--:|:--|
| `safe-v1.4.1/singleton.hex` | Safe v1.4.1 singleton | `0x41675C099F32341bf84BFc5382aF534df5C7461a` | 23,579 | `0x1fe2df852ba3299d6534ef416eefa406e56ced995bca886ab7a553e6d0c5e1c4` |
| `safe-v1.4.1/factory.hex` | Safe v1.4.1 proxy factory | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` | 3,054 | `0x50c3cdc4074750a7a974204a716c999edd37482f907608d960b2b025ee0b3317` |
| `multisig/implementation.hex` | multisig.software implementation | `0xD54cb65224410F3Ff97a8E72f363f224419f4FB0` | 10,532 | `0xca195fdffa34ca3a8a52cd236d6b8f61524860ba674e31623d34b4b5be72f183` |
| `multisig/factory.hex` | multisig.software factory | `0x000000000e8CB9ed9DC2114d79d9215eacb9cB07` | 2,349 | `0x213b1d76ad1ca04f3ec71eca64b4df0e5f5db0c0b7fb445b28e96b3d7c6a9944` |

Regenerate pinned to this block, and the tree stays clean:

```
BLOCK=26283809 devbox run -- tools/bytecode-fixtures.sh
```
