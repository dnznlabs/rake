# m03-t10 — The last `src/` byte, then the salts

Milestone: [M03](../../MILESTONE.md) · Phase: 3 — The review

When this is done, `src/` is final for M04 and the two salts the runbook deploys with are mined
against it. The factory's NatSpec point 3 says how the factory is actually placed (the keyless
CREATE2 proxy, decision 33) instead of the nonce-addressing it has contradicted since m03-t06
([#150](https://github.com/dnznlabs/rake/issues/150) (a)); the `#/docs` page tells a payer not to
pre-fund a predicted address on a chain the clone is not on yet (#150 (b)); `FACTORY_SALT` and
`APP_SALT` in `RUNBOOK.md` are the mined values decision 37 asked for, with the prefixes Denizen
chose on 2026-11-07 (`0x00d1…` for the factory, `0x00a9…` for `App`), and one anvil has landed both
contracts at the predicted addresses. The comment is the only `src/` change, and it is proven to
move nothing but the metadata tail, so the third review (`SECURITY.md` § The reviewed commit,
`94d028c`) is not re-opened; this task says so where that section will be read.

## Plan

Every command runs from the repo root through `devbox run --` (forge `1.7.1-dev`, cast `1.7.1-dev`,
node from `devbox.lock`). Branch `m03/t10-salts` from `origin/main` at or after `33c8336` (the merge
of [#139](https://github.com/dnznlabs/rake/pull/139)). Check hooks with `ls .git/hooks | grep -v
sample` (expect `pre-commit` and `post-commit`); do not run `make init`. Write multi-command checks
to a script file and run that through `devbox run -- bash <file>`: `devbox run -- bash -c` mangles
pipes and variables. Figures below were measured at `33c8336` on 2026-11-07; re-run rather than
quote.

0. **Baselines, before any edit.** Record in the handoff: `forge test` → **91 passed**; `node --test
   test/*.test.mjs` → **67**; `grep -c '' .gas-snapshot` → **91**; `forge build --force` with 0
   warning lines; and the two init-code hashes exactly as `RUNBOOK.md` step 1f computes them, with
   `OWNER` and `APP_VERSION` from § 0:

   ```sh
   INIT=$(forge inspect DistributionFactory bytecode); cast keccak $INIT
   AINIT=$(forge inspect App bytecode)$(cast abi-encode 'c(address,string)' $OWNER $APP_VERSION | cut -c3-); cast keccak $AINIT
   ```

   Expect `0x1652f0c136da4c6c7e51020acf3bf978946ff8e8bd1e3b7842920298343a94d1` and
   `0x0b2894a38c541f156e2be856b7469993004331006a2ba9c66fa4d040f7b9864a` (the second is the figure
   m03-t07's handoff § For M04 names). Then save the **opcode bytes** of the two contracts the
   comment can touch, for step 1's check: `forge inspect <C> deployedBytecode` ends in a CBOR
   metadata block whose length is the last two bytes (`0x0033`, 51 bytes, at `33c8336`) and which
   embeds an IPFS hash of the sources, so a comment moves exactly that block. For `Distribution` and
   `DistributionFactory`, write `forge inspect <C> deployedBytecode | sed 's/.\{106\}$//'` (51 bytes
   of CBOR plus the 2-byte length, as hex) to `/tmp/<C>.before`; `wc -c` must give **18,439** and **2,537**
   respectively (9,218 and 1,267 opcode bytes as hex, plus `0x`, plus the newline `forge inspect`
   prints — rehearsed at scoping, both figures and the silent `cmp`).
   If the tail is not `0033`, stop: the strip width is wrong and the step is not ready.

   Check: the numbers above, in the handoff, with the commit they were read at.

1. **NatSpec point 3 tells the truth.** `src/Distribution.sol:454-456`, the three lines beginning
   `/// 3. Same-address-everywhere`. Replace them with, wrapped as the file wraps:

   > 3. Same-address-everywhere is this factory's address, not a clone's claim on its own. The
   >    factory is placed by CREATE2 through the keyless proxy at `0x4e59b448…0B4956C`
   >    (`scripts/forge/Deploy.s.sol`), so its address follows that proxy, `FACTORY_SALT` and this
   >    contract's bytes — never a deployer's nonce — and `RUNBOOK.md` puts it at one address on
   >    every chain it reaches.

   Nothing else under `src/` moves — not a blank line, not another comment. Then `forge build
   --force` (0 warning lines), `forge fmt --check` and `forge lint` silent, `forge test` 91 passed,
   `forge snapshot --check` exit 0 (a comment changes no gas; if `.gas-snapshot` wants to move,
   stop and find out what else changed), and `tools/abi-vectors.sh` leaves `git status --porcelain`
   showing only `src/Distribution.sol`.

   Check: `grep -c 'nonce-addressed' src/Distribution.sol` → 0, and for each of `Distribution` and
   `DistributionFactory`, `forge inspect <C> deployedBytecode | sed 's/.\{106\}$//' | cmp -
   /tmp/<C>.before` is silent — opcode bytes equal, only the metadata moved. `forge inspect App
   deployedBytecode` is byte-identical to `33c8336`'s (the whole string, including the tail: `App.sol`
   is not touched and imports nothing that is). Record the **new** factory init-code hash from
   step 0's command; it is the figure step 3 mines against. `App`'s hash is unchanged.

2. **One sentence for the payer.** `app/src/index.html:1640`, the `<p>` under `<h2
   id="s-create">Creating a distribution</h2>` that begins "The address of a distribution is
   determined before it is deployed" — the one place the docs page tells a payer the address can be
   written into an invoice in advance. Add after its last sentence, in that paragraph's register:

   > Do not pay a predicted address on a chain where the distribution is not yet deployed: until
   > there is code at the address, the funds go to whatever table the eventual creation passes.
   > Wait for code at the address, then pay.

   No `README.md` change: the README has no payer-facing section, and two copies of one sentence
   is one too many. `make dapp-nodev` rebuilds; `wc -c app/dist/widget.js` is unchanged (the widget
   does not carry docs prose); `node --test test/*.test.mjs` → 67.

   Check: `grep -c 'code at the address' app/src/index.html` → 1.

3. **Mine the two salts, each once.** Against the step 1 factory hash and the step 0 `App` hash
   (`OWNER` and `APP_VERSION` are inside `App`'s hash, so the mined `APP_SALT` is tied to the Ops
   vault and `v0.1` as well as to the bytes — say so in the handoff):

   ```sh
   PROXY=0x4e59b44847b379578588920cA78FbF26c0B4956C
   cast create2 --deployer $PROXY --init-code-hash <factory hash from step 1> --starts-with 00d1
   cast create2 --deployer $PROXY --init-code-hash 0x0b2894a38c541f156e2be856b7469993004331006a2ba9c66fa4d040f7b9864a --starts-with 00a9
   ```

   Each prints `Address:` and `Salt:`; rehearsed at scoping, four hex digits took **2.4 ms**, so a
   run that takes minutes is mining against the wrong input. Put the two salts in `RUNBOOK.md` § 0
   (`:47-48`), replace the paragraph **The salts are zero here** (`:65-68`) with one that names
   decision 37, the prefixes, the two init-code hashes they were mined against and this task, and
   amend the sentence at `:447` (§ Rehearsed on anvil) to say that rehearsal used zero salts and
   step 4 below is the one with the mined values. The ruling the prefixes come from is recorded
   as an amendment to decision 37 in `ROADMAP.md`; link it, do not restate it.

   Check: `cast create2 --deployer $PROXY --salt $FACTORY_SALT --init-code-hash <factory hash> |
   tail -1` starts `0x00d1` and the `App` equivalent starts `0x00a9`, both recomputed from the
   `RUNBOOK.md` lines, not from the mining output.

4. **One anvil lands them.** Run `RUNBOOK.md` steps 1 through 3 on a single anvil (`--chain-id
   31337`, a port no one else is using; t06 used 8555) exactly as § Rehearsed on anvil did, with
   the § 0 values and the mined salts: the offline prediction of step 1f **before** any
   transaction, then `Deploy.s.sol` and `DeployApp.s.sol`. The landed `FACTORY` and `APP` equal the
   predictions and carry the prefixes. Two anvils are not needed — criterion 6 proved the method on
   two chains; this proves the values. Do not run step 6 (`create`): `CREATOR` is still #90's.

   Check: the four addresses (predicted and landed, factory and `App`) in the handoff, with the
   transaction hashes, and `cast call $APP "owner()(address)"` equal to `OWNER`.

5. **The review record stays honest.** `SECURITY.md` § The reviewed commit (`:364-368`) gains one
   sentence after the one that names `94d028c`: this task changed one NatSpec comment in
   `src/Distribution.sol` after the review, the opcode bytes of every contract are equal to
   `94d028c`'s by step 1's check, only the metadata block moved, and the review is therefore not
   re-opened — naming this task's PR. No row changes; F14's disposition already names #150.

   Check: `grep -c 'm03-t10' SECURITY.md` → 1.

6. **`HANDOFF.md`** from the handbook template, beside this file: the AC table with every figure
   re-measured at the branch head; § For close-out with the two salts, the two init-code hashes,
   the four addresses, and the sentence M04's milestone file needs ("`src/` final at `<merge>`;
   salts mined against it; any `src/` byte after this is a new factory and a new mining run").

## Acceptance criteria

- `git diff --stat origin/main -- src/` names `src/Distribution.sol` alone, and `git diff
  origin/main -- src/ | grep -c '^[-+][^-+]'` → 8 or fewer changed lines (three removed, up to five
  added), every one of them a `///` line. `grep -c 'nonce-addressed' src/Distribution.sol` → 0.
- Opcode equality: step 1's `cmp` against the step 0 captures is silent for `Distribution` and
  `DistributionFactory`, and `forge inspect App deployedBytecode` is identical to `33c8336`'s. The
  handoff shows both commands and their outputs, and the captured byte counts (18,437 and 2,535)
  as the denominator.
- `forge test` 91 passed, 0 failed; `node --test test/*.test.mjs` 67; `forge snapshot --check`
  exit 0 and `.gas-snapshot` untouched; `forge build --force` 0 warning lines; `forge fmt --check`
  and `forge lint` silent; `tools/abi-vectors.sh` idempotent on the branch head.
- `grep -c '^export FACTORY_SALT=0x00000' RUNBOOK.md` → 0 and the same for `APP_SALT`; both salts
  recompute through `cast create2` to addresses starting `0x00d1` and `0x00a9` (step 3's check,
  shown in the handoff).
- One anvil, from `RUNBOOK.md` alone: predicted `FACTORY` and `APP` equal the landed ones, both
  prefixed, `owner()` equal to `OWNER`.
- `grep -c 'code at the address' app/src/index.html` → 1; `grep -c 'm03-t10' SECURITY.md` → 1.
- `HANDOFF.md` exists with the figures above and § For close-out; the PR says `Closes #150`.

## Out of scope

- Any other byte under `src/`, `test/*.t.sol` or `scripts/forge/` — including the factory NatSpec
  points 1 and 2, which are true. A second `src/` change is a second task and a second mining run.
- `SECURITY.md` rows, § Findings or § Prior reviews. F14 stands as dispositioned.
- `CREATOR`, `DNZN_SALT` and DNZN's predicted address: [#90](https://github.com/dnznlabs/rake/issues/90),
  Denizen's, and the close-out's once it rules.
- [#148](https://github.com/dnznlabs/rake/issues/148) and
  [#149](https://github.com/dnznlabs/rake/issues/149), the dapp items from t09's review: `m04`.
- The M04 milestone file, and any explorer verification.

## Open questions

None. The prefixes were ruled by Denizen on 2026-11-07 in the architect's Telegram DM ("yeah go
with option 1": `0x00` plus four digits in the vaults' family, the architect's proposed `00d1` for
the factory and `00a9` for `App`), recorded as an amendment to decision 37. Whether a comment-only
`src/` change re-opens the review is settled by this plan and its merge: it does not, on the
condition step 1's opcode-equality check holds; if that check fails, stop, because something other
than a comment moved.

## Context

- [#150](https://github.com/dnznlabs/rake/issues/150) — both halves, with the pointers into
  `audits/2026-11-06/` and `SECURITY.md` F14.
- `ROADMAP.md` decisions 33 (the keyless proxy) and 37 (mined salts, amended today with the prefixes).
- [m03-t07 `HANDOFF.md`](../m03-t07/HANDOFF.md) § For M04 — `App`'s init-code hash and why
  `cast keccak $(forge inspect App bytecode)` is not it.
- [m03-t06 `HANDOFF.md`](../m03-t06/HANDOFF.md) § Acceptance criteria, criterion 6 row — the anvil
  rehearsal step 4 repeats with values.
- `RUNBOOK.md` § 0 and step 1f.
