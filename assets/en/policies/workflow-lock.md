# workflow-lock — workflow.yaml Write Operation Mutex Lock Policy

## Lock File Contract

- Path: `<main_repo_root>/.harness/.locks/workflow.lock`
- Content (single line, space-separated): `<skill_name> <PID> <unix_ts> <ISO_8601_UTC>`
  - Example: `design 12345 1717000000 2026-05-28T19:00:00Z`
- Not committed to repo: shares `.locks/` directory with `ship.lock`, already in `.harness/.gitignore`

## Execution Method (Script-Enforced)

Any write operation to `workflow.yaml` **must** go through `hooks/workflow-entry.sh` — the script internally hardens the full flow of "lock → RMW → write-back verification → trap release". The caller only needs to pass the operation and parameters:

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
bash "$PLUGIN_ROOT/hooks/workflow-entry.sh" <op> --skill <skill_name> [op-specific args]
```

Supported operations (one-to-one with the "writer registry"):

| op | Purpose | Required Parameters |
|---|---|---|
| `append-active` | Append an entry to the end of `active_changes` | `--change-id --phase --worktree-path --started-at` |
| `update-active` | Update phase / worktree-path of a specified entry | `--where-change-id --set phase=<p> [--set worktree-path=<wt>]` |
| `rename-active` | Rename an entry's change_id (draft → formal) | `--from <old> --to <new>` |
| `delete-active` | Delete a specified entry | `--where-change-id <id>` |

## Exit Code Semantics (caller branches based on these)

| Exit | Meaning | Caller Action |
|---|---|---|
| 0 | Success (lock acquisition + modification + write-back verification all passed) | Continue subsequent logic |
| 1 | Lock acquisition failed (6s timeout or mkdir failure) | Block, output HARD STOP H12 self-check statement (script stderr already contains details) |
| 2 | Write-back verification failed (optimistic lock fallback, auto-retried once but still inconsistent) | Block, output H12 write-back verification failure statement, prompt user for manual intervention |
| 3 | Parameter error / input file anomaly | Block, manual investigation needed |

## Writer Registry (sync if new writers are added)

| Skill | Write Position | Operation Called |
|---|---|---|
| `design` | 1.4 Draft entry | `append-active` |
| `design` | 4.4 Rename entry | `rename-active` |
| `design` | 1.2 Option B: clear residue | `delete-active` |
| `propose` | 1.3.A.4 Switch phase + worktree | `update-active --set phase=propose --set worktree-path=...` |
| `propose` | 1.3.B Switch phase (stay in main repo) | `update-active --set phase=propose` |
| `ship` | 6.1.a Ship complete, clear entry | `delete-active` |
