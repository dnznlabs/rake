# m03-t10 — handoff

PR: #153 · Branch: `m03/t10-salts` · 2026-11-07

`src/` is final for M04 and both salts are mined against it. The factory's NatSpec point 3 had said
the factory was nonce-addressed, untrue since m03-t06 placed it through the keyless CREATE2 proxy; it
now names the proxy, `FACTORY_SALT` and the contract's own bytes, and `RUNBOOK.md` as the document
that puts it at one address per chain. That comment is the only `src/` change on the branch and it
moved nothing but the metadata tail: with the 53-byte CBOR block stripped, `Distribution` and
`DistributionFactory` are `cmp`-identical to `a28f2c4`'s and `App`'s whole `deployedBytecode` string
is byte-identical, so the third review is not re-opened and `SECURITY.md` § The reviewed commit says
so where that section is read. The `#/docs` page gained one line telling a payer not to fund a
predicted address on a chain the distribution is not on yet — with the NatSpec, both halves of #150.
`FACTORY_SALT` and `APP_SALT` in `RUNBOOK.md` § 0 are mined values: `0x00D18B5b…De71B` for the
factory and `0x00A90943…95BaE` for `App`, each mined once, in milliseconds, against the init-code
hash step 1f computes. One anvil then ran `RUNBOOK.md` steps 1 through 3 with the § 0 values and
those salts, and both contracts landed at the addresses step 1f predicted at block 0, with
`owner()` the Ops vault and `locked()` false. Five commits, four files, one of them under `src/`.

## Acceptance criteria

| AC | Result | Evidence |
|:---|:-------|:---------|
| `git diff --stat origin/main -- src/` names `src/Distribution.sol` alone; `… \| grep -c '^[-+][^-+]'` → 8 or fewer, every one a `///` line; `grep -c 'nonce-addressed'` → 0 | pass | ` src/Distribution.sol \| 6 ++++--`, `1 file changed, 4 insertions(+), 2 deletions(-)`; changed lines **6**; the same lines filtered through `grep -vc '///'` → **0**; `grep -c 'nonce-addressed' src/Distribution.sol` → **0**. Three `///` lines removed, five written; git pairs the unchanged first line, hence 6 rather than 8 |
| Opcode equality: step 1's `cmp` silent for `Distribution` and `DistributionFactory`; `forge inspect App deployedBytecode` identical to `33c8336`'s; both commands and the captured byte counts shown | pass | The baseline was captured at the branch point `a28f2c4`, which **is** `33c8336` for this purpose: `git diff --stat 33c8336 a28f2c4 -- src/` is empty, and so is the same diff over `foundry.toml`, `foundry.lock`, `devbox.lock` and `lib` — same sources, same compiler, same settings. At `a28f2c4`, `forge inspect <C> deployedBytecode \| sed 's/.\{106\}$//' > /tmp/<C>.before` → **18,439** and **2,537** chars (9,218 and 1,267 opcode bytes, plus `0x`, plus the newline; the AC's 18,437/2,535 is the same capture counted without `0x` — see § Deviations 1). At the branch head the same command and `cmp - /tmp/<C>.before` are **silent** for both. `forge inspect App deployedBytecode` → **14,313** chars, sha256 `cec781b3d9210445fe0efa9cb7fd63de5d85dac025545727d7391ed6c5346a6e`, `cmp` silent against the base capture. Metadata did move: the factory's init-code hash went `0x1652f0c1…a94d1` → `0xd8a1208a…1cc5` |
| `forge test` 91/0; `node --test test/*.test.mjs` 67; `forge snapshot --check` 0 and `.gas-snapshot` untouched; `forge build --force` 0 warning lines; `forge fmt --check` and `forge lint` silent; `tools/abi-vectors.sh` idempotent | pass | At `47e61b6`: `91 tests passed, 0 failed, 0 skipped (91 total tests)`; `tests 67 pass 67 fail 0`; `forge snapshot --check` exit **0** and `git diff --stat origin/main -- .gas-snapshot` empty, `grep -c '' .gas-snapshot` → **91**; `forge build --force` exit 0, `grep -ci warning` → **0**; `forge fmt --check` exit **0**; `forge lint` exit **0**, no findings (it prints `No files changed, compilation skipped`); `tools/abi-vectors.sh` exit 0 and `git status --porcelain` empty after it |
| `grep -c '^export FACTORY_SALT=0x00000' RUNBOOK.md` → 0, same for `APP_SALT`; both recompute to `0x00d1…` and `0x00a9…` | pass | Both greps → **0**. Read back out of `RUNBOOK.md` § 0 and recomputed (not taken from the mining output): `cast create2 --deployer $PROXY --salt $FACTORY_SALT --init-code-hash $(cast keccak $(forge inspect DistributionFactory bytecode))` → **`0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B`**; the `App` equivalent → **`0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE`** |
| One anvil, from `RUNBOOK.md` alone: predicted `FACTORY` and `APP` equal the landed ones, both prefixed, `owner()` equal to `OWNER` | pass | § The anvil that landed them. Predicted at block 0, before any transaction; landed through the proxy in blocks 1 and 2 at the same two addresses; `owner()` → `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790` |
| `grep -c 'code at the address' app/src/index.html` → 1; `grep -c 'm03-t10' SECURITY.md` → 1 | pass | **1** and **1** at `47e61b6` |
| `HANDOFF.md` exists with the figures above and § For close-out; the PR says `Closes #150` | pass | This file. `gh pr view 153 --json closingIssuesReferences` → `150` and `152`, both resolved by GitHub, not merely written |

### Step 0 — the baselines, at `a28f2c4`

The plan quotes its figures at `33c8336` and the branch starts at `a28f2c4`, two docs commits later;
nothing between them touches `src/`, `foundry.toml`, `foundry.lock`, `devbox.lock` or `lib`, so every
bytecode figure below is `33c8336`'s, read at the branch point rather than copied from the plan.

Every figure the plan predicted, measured before any edit: `forge test` **91 passed, 0 failed**;
`node --test test/*.test.mjs` **67**; `grep -c '' .gas-snapshot` **91**; `forge build --force` **0**
warning lines over a full 39-file compile; factory init-code hash
`0x1652f0c136da4c6c7e51020acf3bf978946ff8e8bd1e3b7842920298343a94d1` and `App`
`0x0b2894a38c541f156e2be856b7469993004331006a2ba9c66fa4d040f7b9864a`, both exactly as the plan said.
The metadata tail of `Distribution`, `DistributionFactory` and `App` is `0033` in all three, so the
106-character strip is the right width and the step was ready.

### Step 1 — what the comment moved, and what it did not

The three `///` lines of point 3 became five, wrapped at the file's 120 and no wider than the 114 the
file already carried. Nothing else under `src/` moved. `App`'s init-code hash is unchanged, which the
plan predicted because `App.sol` is untouched and imports nothing that is; the factory's is a new
value, and it is the figure step 3 mined against.

The metadata block is the only thing that moved in the runtime, and that is measured rather than
asserted. Opcode bytes `cmp` equal for both affected contracts, `App` identical whole, and the
init-code hash different: a comment cannot change opcodes, and an unchanged init-code hash would
have meant the comment never reached the compiler.

### Step 2 — the payer sentence, and the widget that does not carry it

`make dapp-nodev` builds the page bundle, not the widget, from this prose: with the sentence
`app/dist/index.html` is **133,359** bytes (gzip 41,907), without it **133,136** (gzip 41,839), and
`app/dist/widget.js` is **8,043 bytes, sha256 `7cd0f4d3e9a1dd1a7a8200970f96a9056cad02350f5217a383121bfa1a781f0e`**
in both builds — `cmp` silent. Both builds ran against the same broadcast logs, so the only variable
was the sentence. `node --test` **67** after.

### Step 3 — the mining

Against the branch's factory hash and the base commit's `App` hash, through the keyless proxy
`0x4e59b44847b379578588920cA78FbF26c0B4956C`:

| | salt | address | mined in |
|:--|:--|:--|--:|
| `FACTORY_SALT` | `0xc7b08946793948e2cb78adf914cfa19ac8341e52b8a7a96ab26034fe6c476693` | `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` | 1.608 ms |
| `APP_SALT` | `0xd9ad8a57dc1d24c639881670feb590b06bb437e8c698f3e9fc53d5920c04b7ef` | `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` | 3.459 ms |

Both inside the 2.4 ms the plan rehearsed, so neither was mined against a wrong input. `APP_SALT` is
tied to `App`'s init-code hash, and `OWNER` (the Ops vault) and `APP_VERSION` (`v0.1`) are inside
that hash — so it holds for this owner and this version only, which is what `RUNBOOK.md` § 0 now
says above the two lines.

### Step 4 — the anvil that landed them

One anvil, `--chain-id 31337`, port **8558**, `RUNBOOK.md` steps 1 through 3 with the § 0 values and
the mined salts. Step 6 was not run: `CREATOR` is still #90's.

Step 1 preflight: tree clean with provenance (`git status --porcelain | wc -l` → 0, HEAD `68eb285`);
build exit 0 over `Compiling 39 files`, `warning[` 0, `Warning (` 0; `forge test` 91/0,
`forge snapshot --check` 0, then `forge lint` and `forge fmt --check` after them, as 1b requires;
the proxy present in genesis at the canonical address, **141** code chars = 69 bytes, keccak
`0x2fa86add0aed31f33a762c9d88e807c475bd51d0f52bd0955754b2608f7e4989`, identical to § 1's — no
`anvil_setCode` needed; `grep -rn 'tx.origin' src/` and `grep -n 'msg.sender' src/App.sol` both
empty, so no constructor reads the proxy; `cast call --create` returned the factory's **1,320-byte**
runtime and `cast estimate --create` **2,375,324**.

| | predicted (step 1f, block 0) | landed | tx | gasUsed |
|:--|:--|:--|:--|--:|
| `FACTORY` | `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` | same | `0xa3b215af271d8eb8f8735c784a0329a393f47bc7dc5849a5edbe6228410250e8` | 2,380,182 |
| `APP` | `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` | same | `0x9163a1a447952cd1682954b08d285dab4941a422b746a47a93076c83e3abda9a` | 1,655,660 |
| `IMPL` | — | `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` | inside the factory's constructor | — |

Step 1g read `0x` at both predicted addresses before anything was sent. Both transactions have
`to` = `0x4e59b448…0B4956C`, the keyless proxy, and `status` true — which is why neither receipt has
a `contractAddress` (§ Deviations 2) and why the landed address is read as code at the predicted
one. `App`'s on-chain code (**7,155 bytes**) equals its artifact `deployedBytecode` exactly. The
factory's is 1,320 bytes, as step 1e predicted, and differs from its artifact at **exactly** the
three `immutableReferences` spans the artifact declares — offsets 275, 865 and 940, 32 bytes each,
every one of them holding `0x…31dd18b4c3ece3f123c285bdb045331364cfa4b0`, the implementation. 60
differing bytes, all 60 inside those spans, checked offset by offset.

Reads after step 3: `owner()` → `0x00c0e88778E3e3d17AcaaBC7550deC7Ab61F3790`, equal to § 0's `OWNER`;
`version()` → `"v0.1"`; `locked()` → **false**, and nothing in steps 1 to 3 sends `lock()`.

An earlier run of the same script on port 8557 produced the same two addresses, the same two
transaction hashes and the same gas (`0x245196` = 2,380,182 and `0x19436c` = 1,655,660) — two
chains, identical inputs, identical outputs, which is the determinism the salts rely on.

## For close-out

The two salts, the two hashes they were mined against, and the four addresses:

| | value |
|:--|:--|
| `FACTORY_SALT` | `0xc7b08946793948e2cb78adf914cfa19ac8341e52b8a7a96ab26034fe6c476693` |
| `APP_SALT` | `0xd9ad8a57dc1d24c639881670feb590b06bb437e8c698f3e9fc53d5920c04b7ef` |
| factory init-code hash | `0xd8a1208ac79c66d94c864e7620534dd0f923bf0f7518d25ae87a7f619bc31cc5` |
| `App` init-code hash | `0x0b2894a38c541f156e2be856b7469993004331006a2ba9c66fa4d040f7b9864a` |
| `FACTORY` | `0x00D18B5b72c4d8E7761776d1275B69D4DBCDe71B` |
| `IMPL` | `0x31dd18b4c3EcE3F123c285bdB045331364Cfa4b0` (31337 only — it follows the factory, so it is the same on every chain the factory is) |
| `APP` | `0x00A90943f58b6Ab7fdE05aAE01C13a80e6995BaE` |
| `DISTRO` | not deployed here; step 6 waits on #90 |

The sentence M04's milestone file needs:

> `src/` final at the merge of #153; salts mined against it; any `src/` byte after this is a new
> factory and a new mining run.

Fill the merge sha in at close-out — the two init-code hashes above, and therefore both addresses,
are properties of that tree and of nothing else. `APP_SALT` additionally holds only while `OWNER` is
the Ops vault and `APP_VERSION` is `v0.1`.

## Deviations from the plan

1. **The capture byte counts.** Step 0 says `wc -c` must give **18,439** and **2,537**; the
   acceptance criteria call the same two captures **18,437** and **2,535**. Measured: 18,439 and
   2,537, by step 0's own command. The AC's pair is that capture counted without the `0x` prefix
   (9,218 × 2 + 1 newline = 18,437; 1,267 × 2 + 1 = 2,535), so both figures describe one capture and
   neither is wrong — but they cannot both be the output of the same `wc -c`. Nothing was changed;
   the table above gives the measurement and the arithmetic.
2. **"Landed" is read as code at the predicted address, not from the receipt.** A CREATE2 through
   the keyless proxy is a `CALL` to the proxy, so `eth_getTransactionReceipt.contractAddress` is
   `null` for both deploys. The first anvil run (port 8557) compared predictions against that field
   and reported a mismatch; the instrument was wrong, not the deploy. The run recorded above reads
   the code at each predicted address and compares it with the artifact. Related: the factory's
   artifact `deployedBytecode` can never equal a landed factory's code, because the implementation
   address is an immutable — the three spans are enumerated above rather than hand-waved.
3. **`SECURITY.md` gained one sentence and one pin.** The plan asked for the sentence only. The
   sentence before it asserted `git diff --stat 94d028c HEAD -- src/` prints nothing, which is false
   on this branch and on `main` after it merges; `HEAD` is now pinned to `0819552`, the branch head
   that sentence was written about, where the claim is true and stays true
   (`git diff --stat 94d028c 0819552 -- src/` is empty — verified). No row, no § Findings and no
   § Prior reviews change.
4. **Step 2's build ran after step 4, not before it.** `make dapp-nodev` substitutes
   `__DISTRIBUTIONFACTORY__`, `__DISTRIBUTIONFACTORY_BLOCK__` and `__APP__` out of the broadcast
   logs and fails without them, so there was nothing to rebuild until a chain had been deployed to.
   Both builds (with and without the sentence) then ran against the same logs, which is what makes
   the `widget.js` comparison sound.

## Decisions

- **The five added `///` lines are the plan's own wrapping.** It fits the file's 120-character limit
  with room (longest new line ~101), and five is the AC's ceiling, so the prose went in as written
  rather than reflowed tighter.
- **Step 4 used § 0's `OWNER`, the Ops vault, not anvil's first account.** `APP_SALT` is mined
  against a hash that contains `OWNER`, so an anvil account would have landed `App` somewhere else
  and proved nothing about the mined value. t06's rehearsal substituted the signing account and its
  `App` address is therefore not reproducible here — which is exactly why § Rehearsed on anvil now
  says it ran with zero salts and points here for the values.
- **`RUNBOOK.md` § 0's two salt lines carry `# mined, decision 37` and nothing else.** The hashes,
  the prefixes and what the salts are tied to are the paragraph below them; a comment long enough to
  say all that would have pushed those lines past the block's existing width.
- **Port 8558.** 8555 is t06's record, 8557 was the discarded first run, and 8599 is occupied (see
  § Discoveries).

## Discoveries

- **`SECURITY.md` § The reviewed commit, the paragraph after the one this task edited, is now
  partly stale, and milestone criterion 4 with it.** It says that when t07's PR merged
  `git diff --stat 94d028c origin/main -- src/` would become empty; after this PR it reports
  `src/Distribution.sol`. Criterion 4 wants "an ancestor whose diff to it touches nothing under
  `src/`", which this tree satisfies on the opcode reading and not on the literal one. The added
  sentence says so at the point of reading, but whether criterion 4 gains a clause about metadata is
  the architect's call, not this task's — the plan scoped step 5 to one sentence and no row changes.
- **A stray `anvil` from `~/src/rake-m03-t07` is still listening on `127.0.0.1:8599`** (pid 137811,
  from that worktree's devbox profile). Not touched here. Worth clearing before the next rehearsal
  picks a port.
- **`forge lint` is not literally silent**: it prints `No files changed, compilation skipped` and
  exits 0. "Silent" was read as no findings. Worth knowing before a gate greps its output for
  emptiness.
- **`forge build --force` fetches the submodules in `lib/`** and prints git's `Resolving deltas`
  progress into its own stdout. A warning-line grep over that log is unaffected, but a gate that
  asserted the log's shape more tightly would trip on it.

## Open questions

None.
