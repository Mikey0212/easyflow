# harness-sync — Worktree Artifact Merge-Back Policy

> Called by Step 3.4.5 of the `ship` skill. **Actual execution is deterministically completed by the script `hooks/harness-sync.sh`** — the main agent is only responsible for calling the script + handling user interaction on exit 2, and is **forbidden** from performing any additional file copy actions beyond the script.

## Script Location

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
bash "$PLUGIN_ROOT/hooks/harness-sync.sh" <worktree_path> <origin_repo> <change_id> [--overwrite|--suffix|--skip]
```

## Trigger Conditions

Triggered by `ship` Step 3; executed if any of the following are met:

- 3.3 User chooses A (already PR-merged / no local merge needed) or B (local merge)
- 3.2 Detected `ALREADY_MERGED=1` (`finishing-a-development-branch` already merged)

3.6 Option C (keep worktree) **skips this policy** — artifacts remain in the worktree, record `ship.harness_sync = "skipped_worktree_retained"`.

## Key Constraints

This policy must be executed **before** ship Step 3.5 (`git worktree remove`). Once a worktree is removed, its internal `.harness/` is deleted along with it; the final-state `metrics` / `overrides.log` / `changes/<change_id>/state.yaml` / `pre_design.md` revisions are **unrecoverable**.

The main agent is **forbidden** from performing any additional file copy actions beyond the script — the merge-back scope is already hardcoded in the script, no need for prompt-layer duplicate constraints.

## Exit Codes and Main Agent Responsibilities

| Exit Code | Meaning | Main Agent Action |
|---|---|---|
| `0` | All successful | `harness_sync = "synced"`; read stdout JSON and output status line |
| `1` | Partial failure | `harness_sync = "partial_failure"`; stderr has failed items, ship continues to 3.5 |
| `2` | Archive conflict (directory exists) | Present `ask_followup_question` three options → re-call script (with `--overwrite` / `--suffix` / `--skip`) |
| `3` | Worktree `.harness/` does not exist | `harness_sync = "skipped_no_source"`; jump to 3.5 |

## stdout JSON Format

```json
{"metrics_files":3,"overrides_lines":12,"state_yaml":true,"pre_design":true}
```

`metrics_files` = number of files merged back to the **top-level** `.harness/metrics/` (archive does not store metrics copies — single-change traceability queries the top level via the `change_id` field inside the JSON).

The main agent uses this JSON to output a status line:
```
[easy-flow] harness artifact merge-back complete: metrics=3 files → top-level / overrides=12 lines / state.yaml + pre_design → archive/<change_id>/
```

## Final Archive Structure

```
.harness/archive/<change_id>/
  state.yaml
  pre_design.md
  overrides.log
```

No `metrics/` subdirectory — metrics are only stored in the top-level `.harness/metrics/`.

## harness_sync Status Field Overview

| Value | Trigger Scenario |
|---|---|
| `synced` | Script exit 0 |
| `partial_failure` | Script exit 1 |
| `skipped_no_source` | Script exit 3 |
| `skipped_worktree_retained` | Ship 3.6 Option C, script not called |
| `deferred_archive_conflict` | Script exit 2 + user chooses C (skip) |
| `n/a` | No worktree created this run (`worktree.created_by_easy_flow == false`) |
