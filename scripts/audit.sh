#!/usr/bin/env bash
#
# Two independent adversarial reviews of the contracts that hold authority and value, captured
# separately, then reconciled. The method is audits/README.md; the prompts are audits/prompts/.
# This file runs them and records what happened — it does not decide anything.
#
# Ordered: preflight, skill sync, Codex leg, Claude leg, rollup.
#
#   make audit
#   make audit CLAUDE_MODEL=opus CODEX_MODEL=gpt-5.6-sol
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CLAUDE_MODEL="${CLAUDE_MODEL:-opus}"
CODEX_MODEL="${CODEX_MODEL:-gpt-5.6-sol}"
AUDIT_DATE="${AUDIT_DATE:-$(date +%Y-%m-%d)}"
LEG_TIMEOUT="${LEG_TIMEOUT:-5400}"   # seconds, per leg and for the rollup

SKILL_DIR="$REPO_ROOT/audits/.skills/pashov"
SKILL_PATH="$SKILL_DIR/solidity-auditor"
OUT_DIR="$REPO_ROOT/audits/$AUDIT_DATE"
LEGS_DIR="$OUT_DIR/pashov/solidity-auditor"
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/audit-XXXXXX")"

# The scratch holds claude.json, codex.log and provenance.txt — the evidence a failed run has to be
# diagnosed from. Removing it unconditionally deletes that evidence at exactly the moment it is
# needed: on 2026-09-28 the rollup failed and the trap took claude.json with it, so the one open
# question about that run — which model leg 2 actually used — became unanswerable. Kept on any
# non-zero exit, removed only on success.
cleanup() {
  local rc=$?
  if [ "$rc" -eq 0 ]; then
    rm -rf "$SCRATCH"
  else
    printf '\n\033[1maudit: exit %s — scratch kept for diagnosis: %s\033[0m\n' "$rc" "$SCRATCH" >&2
  fi
}
trap cleanup EXIT

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
info() { printf '   %s\n' "$*"; }
die()  { printf '\n\033[1;31maudit: %s\033[0m\n' "$*" >&2; exit 1; }

# ---- preflight ----------------------------------------------------------------------------------
# Fails loudly and early. An audit that starts and silently produces one leg is worse than one that
# refuses to start, so every prerequisite in audits/README.md § Prerequisites is checked here and
# none of them is checked again later by inference.

say "preflight"

# The scope, named file by file, read from audits/SCOPE. audits/README.md § Scope has both reasons
# the skill's own file discovery is not trusted. This one list is what the leg prompt names and what
# the provenance block records as "the file list actually passed", so the two cannot drift. Checked
# first: a project that has not written it has nothing to audit, whatever else is installed.
[ -f "$REPO_ROOT/audits/SCOPE" ] || die "audits/SCOPE is missing — name the files to audit, one per line (see audits/SCOPE.example)"
mapfile -t SCOPE < <(grep -vE '^[[:space:]]*(#|$)' "$REPO_ROOT/audits/SCOPE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
[ "${#SCOPE[@]}" -gt 0 ] || die "audits/SCOPE names no files"

command -v claude >/dev/null 2>&1 || die "claude not on PATH — see audits/README.md § Prerequisites"
command -v codex  >/dev/null 2>&1 || die "codex not on PATH — see audits/README.md § Prerequisites"
command -v git    >/dev/null 2>&1 || die "git not on PATH"

CLAUDE_VERSION="$(claude --version 2>&1 | head -1)"
CODEX_VERSION="$(codex --version 2>&1 | head -1)"
info "claude  $CLAUDE_VERSION"
info "codex   $CODEX_VERSION"

# `codex login status` exits non-zero when logged out; measure the exit code directly rather than
# grepping its output, which is the shape of check this repo has been burned by.
if ! CODEX_LOGIN="$(codex login status 2>&1)"; then
  die "codex is not logged in — run 'codex login'. It said: ${CODEX_LOGIN//$'\n'/ }"
fi
info "codex   $CODEX_LOGIN"

[ -f "$REPO_ROOT/audits/SKILL_PIN" ] || die "audits/SKILL_PIN is missing"
SKILL_COMMIT="$(awk '!/^#/ && NF {print $2; exit}' "$REPO_ROOT/audits/SKILL_PIN")"
SKILL_REPO="$(awk  '!/^#/ && NF {print $1; exit}' "$REPO_ROOT/audits/SKILL_PIN")"
case "$SKILL_COMMIT" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) ;;
  *) die "audits/SKILL_PIN does not name a commit (parsed: '${SKILL_COMMIT:-<empty>}')" ;;
esac
info "pin     $SKILL_REPO @ ${SKILL_COMMIT:0:12}"

# An existing checkout at the wrong commit is a hard stop, not something to silently reset: a
# finding has to be attributable to a skill version, and a runner that quietly moves the checkout
# under you makes that untrue. A missing checkout is fine — skill sync clones it below.
if [ -d "$SKILL_DIR/.git" ]; then
  HAVE="$(git -C "$SKILL_DIR" rev-parse HEAD)"
  [ "$HAVE" = "$SKILL_COMMIT" ] || die \
    "skill checkout is at ${HAVE:0:12}, SKILL_PIN says ${SKILL_COMMIT:0:12}
       fix: git -C audits/.skills/pashov fetch origin && git -C audits/.skills/pashov checkout $SKILL_COMMIT
       or delete audits/.skills/pashov and re-run to re-clone at the pin"
fi

for f in "${SCOPE[@]}"; do
  [ -f "$REPO_ROOT/$f" ] || die "scope file missing: $f"
done
info "scope   ${#SCOPE[@]} files, $(wc -l < <(cat "${SCOPE[@]}")) lines"

[ -f "$REPO_ROOT/audits/prompts/leg.md" ]    || die "audits/prompts/leg.md is missing"
[ -f "$REPO_ROOT/audits/prompts/rollup.md" ] || die "audits/prompts/rollup.md is missing"
# Without it a leg would be sent off with no file list.
grep -qxF '<!-- SCOPE -->' "$REPO_ROOT/audits/prompts/leg.md" || die "audits/prompts/leg.md has no <!-- SCOPE --> line"

# audits/README.md § Layout: audits are append-only, because the next audit's rollup cites this one.
# A second run on the same date would honour that nowhere — harvest copies into the populated leg
# directory, so any file only the earlier run wrote survives and is committed as part of the new
# audit, and the rollup overwrites AUDIT.md outright. The result is one directory holding two runs
# with nothing recording that it does. Refuse instead; AUDIT_DATE is the escape hatch.
[ -e "$OUT_DIR" ] && die "audits/$AUDIT_DATE already exists — audits are append-only (audits/README.md § Layout)
       to re-run today: move it aside, or pass AUDIT_DATE=<something-else>"
info "output  audits/$AUDIT_DATE (new)"

# Captured here, before any leg writes a byte. The flag is about the code that was audited — an
# audit of an uncommitted tree cannot be re-run by anyone else — so reading it after the run would
# report this audit's own output directory as if it were an uncommitted contract change.
CODE_COMMIT="$(git rev-parse HEAD)"
if [ -n "$(git status --porcelain)" ]; then DIRTY=yes; else DIRTY=no; fi
info "commit  ${CODE_COMMIT:0:12} (dirty: $DIRTY)"

# ---- skill sync ---------------------------------------------------------------------------------
# The skill is cloned at the pin rather than vendored, and made discoverable to each CLI by a
# symlink into its user skills directory — proven 2026-09-28 to be the mechanism that works for
# both. audits/README.md § Prerequisites records the proof and its consequences.

say "skill sync"

if [ ! -d "$SKILL_DIR/.git" ]; then
  info "cloning $SKILL_REPO"
  mkdir -p "$(dirname "$SKILL_DIR")"
  git clone --quiet "$SKILL_REPO" "$SKILL_DIR"
  git -C "$SKILL_DIR" checkout --quiet "$SKILL_COMMIT"
fi

# Re-checked after the clone, so the assertion covers the fresh-clone path too and is not a check
# that can only ever pass.
HAVE="$(git -C "$SKILL_DIR" rev-parse HEAD)"
[ "$HAVE" = "$SKILL_COMMIT" ] || die "skill checkout is at ${HAVE:0:12} after sync, expected ${SKILL_COMMIT:0:12}"

[ -f "$SKILL_PATH/SKILL.md" ] || die "$SKILL_PATH/SKILL.md is missing — the checkout is not the skill"
SKILL_VERSION="$(cat "$SKILL_PATH/VERSION" 2>/dev/null || echo "unknown")"
info "skill   solidity-auditor VERSION $SKILL_VERSION at ${HAVE:0:12}"

# ~/.claude and ~/.codex belong to the OS user and are shared with other sessions: add one entry
# each, never replace the directory, and refuse rather than clobber something that is not ours.
for d in "${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}" "${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"; do
  mkdir -p "$d"
  link="$d/solidity-auditor"
  if [ -e "$link" ] && [ ! -L "$link" ]; then
    die "$link exists and is not a symlink — refusing to replace it. Move it aside and re-run."
  fi
  ln -sfn "$SKILL_PATH" "$link"
  [ -f "$link/SKILL.md" ] || die "$link does not resolve to a skill"
  info "link    $link -> $(readlink "$link")"
done

# ---- legs ---------------------------------------------------------------------------------------

mkdir -p "$LEGS_DIR"

# The skill writes .solidity-auditor/runs/{stamp}/ into the repo on every scan, whatever flags it
# gets. Harvest only the run directories a leg actually created — snapshot before, diff after — so
# nothing pre-existing is destroyed and an empty harvest is visible rather than inferred.
snapshot_runs() {
  ls -1 "$REPO_ROOT/.solidity-auditor/runs" 2>/dev/null | sort || true
}

# harvest <before-file> <leg-dir> <leg-name>
# A failed leg is a failed audit: this exits non-zero rather than leaving an empty directory for the
# rollup to read as "no findings".
harvest() {
  local before="$1" dest="$2" name="$3"
  local new
  new="$(comm -13 "$before" <(snapshot_runs))"
  [ -n "$new" ] || die "$name: the scan wrote no .solidity-auditor/runs/ directory — a failed leg is a failed audit"

  mkdir -p "$dest"
  local d
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    cp -a "$REPO_ROOT/.solidity-auditor/runs/$d/." "$dest/"
    rm -rf "${REPO_ROOT:?}/.solidity-auditor/runs/$d"
  done <<< "$new"

  [ -s "$dest/full-report.md" ] || die "$name: $dest/full-report.md is missing or empty — a failed leg is a failed audit"
  local lines
  lines="$(wc -l < "$dest/full-report.md")"
  [ "$lines" -gt 0 ] || die "$name: full-report.md has no lines"
  info "$name: $lines lines of report, $(ls -1 "$dest" | wc -l) files in $(realpath --relative-to="$REPO_ROOT" "$dest")"
}

# The one substitution any prompt gets: the line that is exactly the SCOPE marker becomes the scope,
# one path per line. Preflight has already refused a prompt without the marker.
LEG_PROMPT="$(SCOPE_TEXT="$(printf '%s\n' "${SCOPE[@]}")" \
  awk '$0 == "<!-- SCOPE -->" { print ENVIRON["SCOPE_TEXT"]; next } { print }' "$REPO_ROOT/audits/prompts/leg.md")"

# -- leg 1: codex --
say "leg 1 — codex $CODEX_MODEL, effort high, 1 pass"
CODEX_LEG="$LEGS_DIR/$CODEX_MODEL"
snapshot_runs > "$SCRATCH/before-codex"
CODEX_LOG="$SCRATCH/codex.log"
CODEX_START=$(date +%s)
set +e
timeout "$LEG_TIMEOUT" codex exec \
  -m "$CODEX_MODEL" \
  -c model_reasoning_effort="high" \
  -s workspace-write \
  -C "$REPO_ROOT" \
  "$LEG_PROMPT" < /dev/null 2>&1 | tee "$CODEX_LOG"
CODEX_RC=${PIPESTATUS[0]}
set -e
CODEX_SECONDS=$(( $(date +%s) - CODEX_START ))
[ "$CODEX_RC" -eq 0 ] || die "codex leg exited $CODEX_RC after ${CODEX_SECONDS}s — a failed leg is a failed audit"
harvest "$SCRATCH/before-codex" "$CODEX_LEG" "leg 1"

# Observed, from the session header the run actually printed — not from CODEX_MODEL, which is what
# was asked for rather than what answered.
CODEX_MODEL_OBSERVED="$(awk -F': *' '/^model:/ {print $2; exit}' "$CODEX_LOG")"
CODEX_EFFORT_OBSERVED="$(awk -F': *' '/^reasoning effort:/ {print $2; exit}' "$CODEX_LOG")"
CODEX_TOKENS="$(awk '/^tokens used/ {getline; print; exit}' "$CODEX_LOG" | tr -d ' ')"
info "wall ${CODEX_SECONDS}s · model ${CODEX_MODEL_OBSERVED:-not reported} · effort ${CODEX_EFFORT_OBSERVED:-not reported} · tokens ${CODEX_TOKENS:-not reported}"

# -- leg 2: claude --
say "leg 2 — claude $CLAUDE_MODEL, 1 pass"
CLAUDE_LEG="$LEGS_DIR/$CLAUDE_MODEL"
snapshot_runs > "$SCRATCH/before-claude"
CLAUDE_JSON="$SCRATCH/claude.json"
CLAUDE_START=$(date +%s)
set +e
timeout "$LEG_TIMEOUT" claude -p \
  --model "$CLAUDE_MODEL" \
  --dangerously-skip-permissions \
  --output-format json \
  "$LEG_PROMPT" < /dev/null > "$CLAUDE_JSON" 2>"$SCRATCH/claude.err"
CLAUDE_RC=$?
set -e
CLAUDE_SECONDS=$(( $(date +%s) - CLAUDE_START ))
if [ "$CLAUDE_RC" -ne 0 ]; then
  sed -n '1,40p' "$SCRATCH/claude.err" >&2 || true
  die "claude leg exited $CLAUDE_RC after ${CLAUDE_SECONDS}s — a failed leg is a failed audit"
fi
harvest "$SCRATCH/before-claude" "$CLAUDE_LEG" "leg 2"

# node, not jq: jq is not in devbox.json, so it is not a dependency this repo may assume.
#
# Every model in modelUsage, sorted and comma-joined — never modelUsage's first key. The skill fans
# out to twelve sub-agents, so that map routinely holds more than one entry and its key order is
# insertion order, not significance: on 2026-09-28 it reported `claude-haiku-4-5-20251001` for a leg
# invoked `--model opus`, writing a model attribution into the durable record that the run may not
# have used. A provenance block is worth nothing if it can be confidently wrong, so this reports the
# whole set and lets a disagreement stay visible rather than be resolved by array order.
read -r CLAUDE_MODEL_OBSERVED CLAUDE_TOKENS <<EOF
$(node -e '
  const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const u = j.usage || {};
  const models = Object.keys(j.modelUsage || {}).sort();
  const tok = ["input_tokens","output_tokens","cache_creation_input_tokens","cache_read_input_tokens"]
    .map(k => u[k]).filter(n => typeof n === "number").reduce((a,b) => a+b, 0);
  console.log((models.join(",") || "not-reported") + " " + (tok || "not-reported"));
' "$CLAUDE_JSON" 2>/dev/null || echo "not-reported not-reported")
EOF
info "wall ${CLAUDE_SECONDS}s · model ${CLAUDE_MODEL_OBSERVED} · tokens ${CLAUDE_TOKENS}"

# ---- provenance ---------------------------------------------------------------------------------
# Observed values, captured at run time. audits/README.md § Provenance is the field list; the rollup
# reproduces this block verbatim rather than composing one, so no field is ever a model's guess.

PROVENANCE="$SCRATCH/provenance.txt"
{
  printf 'audit date        %s\n' "$AUDIT_DATE"
  printf 'code commit       %s  (dirty: %s)\n' "$CODE_COMMIT" "$DIRTY"
  printf 'scope             %s\n' "${SCOPE[0]}"
  for f in "${SCOPE[@]:1}"; do printf '                  %s\n' "$f"; done
  printf 'skill             %s @ %s  · solidity-auditor VERSION %s\n' "$SKILL_REPO" "$SKILL_COMMIT" "$SKILL_VERSION"
  printf 'leg 1             codex %s · requested %s → observed %s · effort %s · 1 pass · %ss wall\n' \
    "$CODEX_VERSION" "$CODEX_MODEL" "${CODEX_MODEL_OBSERVED:-not reported}" "${CODEX_EFFORT_OBSERVED:-not reported}" "$CODEX_SECONDS"
  printf 'leg 2             claude %s · requested %s → observed %s · 1 pass · %ss wall\n' \
    "$CLAUDE_VERSION" "$CLAUDE_MODEL" "${CLAUDE_MODEL_OBSERVED:-not reported}" "$CLAUDE_SECONDS"
  printf 'tokens            leg 1 %s · leg 2 %s\n' "${CODEX_TOKENS:-not reported}" "${CLAUDE_TOKENS:-not reported}"
} > "$PROVENANCE"

say "provenance"
cat "$PROVENANCE"

# ---- rollup -------------------------------------------------------------------------------------
# A synthesis, so a model writes it. The shell appends only the run-specific paths; everything the
# rollup is asked to do lives in audits/prompts/rollup.md, in prose a human can disagree with.

say "rollup — claude $CLAUDE_MODEL"
ROLLUP_PROMPT="$SCRATCH/rollup-prompt.md"
{
  cat "$REPO_ROOT/audits/prompts/rollup.md"
  printf '\n\n## This run\n\n'
  printf -- '- leg 1 (codex, model `%s`): `%s`\n' "${CODEX_MODEL_OBSERVED:-$CODEX_MODEL}" "audits/$AUDIT_DATE/pashov/solidity-auditor/$CODEX_MODEL"
  printf -- '- leg 2 (claude, model `%s`): `%s`\n' "${CLAUDE_MODEL_OBSERVED:-$CLAUDE_MODEL}" "audits/$AUDIT_DATE/pashov/solidity-auditor/$CLAUDE_MODEL"
  printf -- '- provenance file (reproduce verbatim): `%s`\n' "$PROVENANCE"
  printf -- '- write the document to: `%s`\n' "audits/$AUDIT_DATE/AUDIT.md"
  # Optional. audits/prompts/rollup.md § 4 grades the legs against it when present.
  if [ -s "$REPO_ROOT/audits/KNOWN_ANSWER.md" ]; then
    printf '\n## Known answer\n\n'
    cat "$REPO_ROOT/audits/KNOWN_ANSWER.md"
  fi
} > "$ROLLUP_PROMPT"

# The prompt goes in on stdin, not as a positional argument. `--add-dir <directories...>` is variadic,
# so a positional prompt after it is consumed as one more directory and `-p` is left with no input:
# observed 2026-09-28 as `Error: Input must be provided either through stdin or as a prompt argument
# when using --print`, exit 1, one second in — after both legs had already cost 43 minutes. The legs
# above take their prompt positionally and are unaffected because neither passes `--add-dir`.
ROLLUP_START=$(date +%s)
set +e
timeout "$LEG_TIMEOUT" claude -p \
  --model "$CLAUDE_MODEL" \
  --dangerously-skip-permissions \
  --add-dir "$SCRATCH" \
  < "$ROLLUP_PROMPT"
ROLLUP_RC=$?
set -e
ROLLUP_SECONDS=$(( $(date +%s) - ROLLUP_START ))
[ "$ROLLUP_RC" -eq 0 ] || die "rollup exited $ROLLUP_RC after ${ROLLUP_SECONDS}s"

# ---- completion ---------------------------------------------------------------------------------
# "Complete" is audits/README.md's definition, asserted rather than assumed: AUDIT.md exists and
# every leg directory under this audit is non-empty.

say "check"
[ -s "$OUT_DIR/AUDIT.md" ] || die "audits/$AUDIT_DATE/AUDIT.md was not written, or is empty"
for leg in "$CODEX_LEG" "$CLAUDE_LEG"; do
  [ -d "$leg" ] || die "missing leg directory: $leg"
  [ "$(ls -A "$leg" | wc -l)" -gt 0 ] || die "empty leg directory: $leg — an empty leg is a failed audit, not a clean one"
done
info "AUDIT.md    $(wc -l < "$OUT_DIR/AUDIT.md") lines"
info "leg 1       $(ls -1 "$CODEX_LEG" | wc -l) files"
info "leg 2       $(ls -1 "$CLAUDE_LEG" | wc -l) files"
info "rollup      ${ROLLUP_SECONDS}s wall"

printf '\n\033[1maudit complete: audits/%s/AUDIT.md\033[0m\n' "$AUDIT_DATE"
