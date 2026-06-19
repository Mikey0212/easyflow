# ship-lock — Ship Phase Serialization Mutex Lock Policy

> Called by Step 0 of the `ship` skill. Carries the full lock acquisition / release / stale recovery flow; SKILL.md only retains the entry reference and HARD-GATE anchor.

## Purpose

ship is the only phase in easy-flow that **writes shared main-repo resources** (`workflow.yaml` full rewrite, `.harness/metrics/` directory merge-back, `.harness/overrides.log` append, `/opsx:archive` moving `openspec/changes/`, `git rebase` + `git merge --ff-only` on main branch HEAD). Multiple worktrees shipping simultaneously would cause read-modify-write races or git reference conflicts on these resources. This policy serializes the entire ship flow using a file lock: **at most one ship runs on the same machine at any given time**.

Cross-machine concurrency is out of scope for this policy (lock file is not committed to repo, effective only on the local machine); multi-person collaboration is handled via git branches + PRs.

## Lock File Contract

- Path: `<main_repo_root>/.harness/.locks/ship.lock`
- `<main_repo_root>` resolution: prefer `.harness/changes/<change_id>/state.yaml: worktree.origin_repo`, fallback `git rev-parse --show-toplevel`
- Content (single line, space-separated): `<change_id> <PID> <unix_ts> <ISO_8601_UTC>`
  - Example: `refactor-sdk-api-0701c0 12345 1717000000 2026-05-28T19:00:00Z`
- Not committed to repo: `.harness/.gitignore` already includes `.locks/` (maintained by SessionStart)

## Step 0 Flow (executed before ship Step 1)

### 0.1 Resolve main_repo_root and change_id

Use `hooks/change-locate.sh` (no phase restriction) to locate the current session's active_changes entry, extract `change_id` (and `worktree_path` for resolving main_repo_root). Zero/multiple matches are blocked per script exit code — **do not acquire lock** — script stderr already contains unified block messages.

### 0.2 Detect Existing Lock

```bash
LOCK_DIR="$ORIGIN_REPO/.harness/.locks"
LOCK_FILE="$LOCK_DIR/ship.lock"
mkdir -p "$LOCK_DIR"

if [ -e "$LOCK_FILE" ]; then
  lock_content=$(cat "$LOCK_FILE" 2>/dev/null || echo "<unreadable>")
  lock_mtime=$(stat -c %Y "$LOCK_FILE" 2>/dev/null || stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0)
  lock_age=$(( $(date +%s) - lock_mtime ))

  if [ "$lock_age" -lt 1800 ]; then
    # < 30min: treat as active ship, block
    echo "[easy-flow] BLOCK: another change is shipping (HARD STOP H11)"
    echo "  lock content: $lock_content"
    echo "  held for: ${lock_age}s"
    echo "  Wait for the other ship to complete; or if you confirm the other process has died, manually rm $LOCK_FILE"
    exit 1
  fi

  # >= 30min: treat as potentially stale, defer to user judgment
  ask_followup_question:
    Title: "ship.lock may be stale (held ${lock_age}s ≥ 30min)"
    Content: |
      Lock file: $LOCK_FILE
      Lock content: $lock_content   # contains change_id / PID / start time

      You can run ps -p <PID> to check if the locking process is still alive.
    Options:
      A. Force-clear lock and continue ship (recommended: if the locking process no longer exists)
      B. Cancel this ship (recommended: if the locking process is still alive, wait for it)

  # User chooses A:
  rm -f "$LOCK_FILE"
  # User chooses B:
  exit 1
fi
```

### 0.3 Acquire Lock + Register Auto-Release

```bash
printf '%s %s %s %s\n' "$change_id" "$$" "$(date +%s)" "$(date -u +%FT%TZ)" > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT INT TERM HUP
```

`trap` covers normal exit + Ctrl+C (INT) + kill (TERM) + terminal close (HUP); SIGKILL / power loss cannot be intercepted, handled by the next ship's 0.2 stale detection as fallback.

### 0.4 Status Line Output

```
[easy-flow] ship lock acquired: change_id=<change_id> pid=<PID>, entering Step 1
```

## Failure Handling

| Scenario | Behavior |
|---|---|
| `mkdir -p .locks` fails (permission) | Output `[easy-flow] BLOCK: cannot create .harness/.locks/`, exit 1; do not proceed |
| `cat $LOCK_FILE` fails (corrupt) | lock_content set to `<unreadable>`, still judge age by mtime; semantics unchanged |
| `stat` unavailable on different platforms | Linux uses `stat -c %Y`, macOS/BSD uses `stat -f %m`; if both fail, lock_age=0, force stale path for user decision |
| Writing lock fails | exit 1, prompt user to check disk |
| trap executing `rm` fails | Does not block ship exit code; next ship uses stale threshold as fallback |

## Invariants

- One ship flow holds exactly one lock (Step 0 acquire → trap release)
- Lock content field order is fixed: `change_id PID unix_ts ISO`, for easy ops grepping
- Lock file does not enter git (`.locks/` in `.harness/.gitignore`)
- The 30min threshold is a **fallback for 2× normal ship ceiling**, not a performance target — ship itself should complete in 5-15min

## Relationship with SKILL.md

- HARD-GATE: Forbidden to skip Step 0 and directly enter Step 1
- Step 0 references this policy in one line
- The change_id resolution logic is currently **shared with SKILL.md Step 1** — if a common policy (`resolve-change-id.md`) is extracted later, both places should be replaced synchronously
