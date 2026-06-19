---
name: ship
description: "Must use this skill when user triggers /ezfl:ship or requests shipping / delivering / completing a change. Executes final verification, branch management, worktree merge-back, and after asking the user, invokes /opsx:archive to archive the OpenSpec change directory."
---

# ship

<HARD-GATE>
Forbidden to skip Step 0 (ship lock). Forbidden to skip Step 3.4.5 (harness-sync) and directly enter 3.5 (worktree remove). Forbidden to execute /opsx:archive without asking the user. Archive failure does not block ship.
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: ship — using easy-flow:ship skill.`

## Observed Hard Stops

H8 (status lines), H9 (worktree merge-back mandatory), H11 (ship lock serialization).

## Input

Read `.harness/workflow.yaml: active_changes` to locate `change_id` and `worktree_path`:
- **Single match**: use its `change_id`
- **Multiple matches**: use `ask_followup_question` for user selection
- **Zero matches**: block, prompt "No active change found in design phase, please run /ezfl:design first"

Read `.harness/changes/<change_id>/state.yaml` (from worktree if in worktree mode): take `worktree.*`, `audit.*`
- `audit.blocked == true` → **entry block**: immediately stop this skill, prompt "audit is in blocked state, please return to /ezfl:audit to resolve before shipping", do not enter Step 1
- `worktree.created_by_easy_flow == true` → triggers this skill's worktree merge-back branch

## Execution Flow

### Step 0: Acquire Ship Lock (serialization protection)

`read_file ./policies/ship-lock.md` and acquire a mutex lock on `.harness/.locks/ship.lock` in the main repo per its rules; failure blocks ship. Lock content includes `change_id`, PID, start time; `trap EXIT INT TERM HUP` auto-release; > 30min treated as stale, requiring explicit user confirmation to clear (HARD STOP H11).

### Step 1: Final Verification

Invoke `superpowers:verification-before-completion`, wait for all checks to pass.

Any check fails → block and require user to fix, then re-trigger `/ezfl:audit` (re-run from audit). After audit passes, return to `/ezfl:ship`.

### Step 2: Branch Management (Core)

Invoke `superpowers:finishing-a-development-branch`, let it present PR / merge / cleanup three options to the user. Wait for its return.

### Step 3: Worktree Artifact Merge-Back + Git Merge-Back + Cleanup (only if this workflow created a worktree)

**Condition**: `state.yaml: worktree.created_by_easy_flow == true`. Order cannot be changed: 3.1–3.4 determine merge status → 3.4.5 artifact merge-back → 3.5 cleanup.

#### 3.1 Read Worktree Meta-Info

From the `worktree` block, take `path`, `branch`, `origin_repo`.

#### 3.2 Dirty Check + Merge Status

```bash
bash "$PLUGIN_ROOT/hooks/worktree-merge-status.sh" "$WORKTREE_PATH" "$ORIGIN_REPO" "$BRANCH"
case $? in
  0) ALREADY_MERGED=1 ;;       # clean + already merged → jump to 3.4.5
  1) ALREADY_MERGED=0 ;;       # clean + not merged → enter 3.3
  2) exit 1 ;;                 # dirty → stderr already contains block message
  *) exit 1 ;;                 # parameter/environment anomaly
esac
```

#### 3.3 If Not Merged: Ask User

Present worktree path/branch via `ask_followup_question` with three options: A. Already merged via PR / no local merge needed → cleanup only; B. Local rebase to trunk then fast-forward merge; C. Hold off, keep worktree.

#### 3.4 Option B: Local Rebase + FF Merge

```bash
bash "$PLUGIN_ROOT/hooks/worktree-rebase-ff.sh" "$WORKTREE_PATH" "$ORIGIN_REPO" "$BRANCH"
# Exit codes: 0=success / 1=rebase conflict (worktree left in intermediate state, require user to manually git rebase --continue then re-run /ezfl:ship) / 2=ff merge failed / 3=environment anomaly
```

#### 3.4.5 + 3.5 Artifact Merge-Back → Clean Worktree (combined execution, cannot be split)

**Shared by A/B** (C skips the entire block). Must execute in order within the same step — merge-back first, then cleanup:

```bash
# ━━━ Step 1: harness-sync (merge artifacts back to archive) ━━━
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
SYNC_RESULT=$(bash "$PLUGIN_ROOT/hooks/harness-sync.sh" "$WORKTREE_PATH" "$ORIGIN_REPO" "$change_id")
SYNC_EXIT=$?
# Exit codes:0=synced,1=partial_failure,2=archive conflict (present three options, re-call),3=skipped_no_source

# ━━━ Step 2: Clean worktree (only after step 1 completes) ━━━
cd "$ORIGIN_REPO"
git worktree remove "$WORKTREE_PATH"
if [ "$ALREADY_MERGED" = "1" ] || git merge-base --is-ancestor "$BRANCH" HEAD; then git branch -d "$BRANCH"; fi
rmdir "$(dirname "$WORKTREE_PATH")" 2>/dev/null || true
```

- SYNC_EXIT=2 → first present three options to re-call script and resolve conflict, then continue step 2
- worktree remove fails → prompt user `git worktree remove --force`
- **Forbidden to skip step 1 and directly execute step 2**

#### 3.6 Option C: Keep Worktree

Do not execute 3.4.5/3.5. Mark `worktree.status: abandoned`, `ship.harness_sync: skipped_worktree_retained`, remind user to manually merge-back artifacts before future cleanup.

### Step 4: State Writing

Update `.harness/changes/<change_id>/state.yaml` (in worktree mode, write inside the worktree; in non-worktree mode, write in the main repo; archive filing and cursor removal handled by Step 6.1 — this step **does not delete here** — Steps 5/6 still need change_id):

```yaml
ship:
  status: "shipped"
  finished_at: "<ISO>"
  merge_strategy: "<rebase-ff|pr-only|abandoned>"
  harness_sync: "<synced|partial_failure|skipped_no_source|skipped_worktree_retained|deferred_archive_conflict|n/a>"
  archive_dir: ".harness/archive/<change_id>"   # only when harness_sync ∈ {synced, partial_failure}
worktree: { status: "<merged|abandoned>" }   # only updated when created_by_easy_flow=true
current_verb: idle
```

`harness_sync = "n/a"`: no worktree created this run, no merge-back needed.

### Step 5: Invoke `/opsx:archive` for Archiving (mandatory inquiry, main agent direct execution)

**Prerequisite**: This step is executed **after** Step 4 writes `ship.status=shipped` — so even if archive is skipped or fails, the completed ship status is not lost.

#### 5.1 Ask User Whether to Archive

Present current `change_id` and `ship.status=shipped` status via `ask_followup_question` with three options: A. Archive now (recommended); B. Do not archive for now (PR still in review / paused midway, manual later); C. Skip archive (experimental change). Archiving will move `openspec/changes/<change_id>/` to `openspec/changes/archive/YYYY-MM-DD-<change_id>/`.

#### 5.2 User Chooses A — Main Agent Executes `/opsx:archive`

```bash
openspec archive "$change_id" --yes
```

Add `--yes` to skip openspec's internal confirm interaction. **Archive failure (exit ≠ 0) → immediately block ship**, output error info, forbidden to continue into Step 6.

#### 5.3 Archive Result Handling

| Archive Returns | Handling |
|--------------|------|
| `Archive Complete` | Record `ship.archive = "archived"`, `ship.archive_path = "<archived path>"`; enter Step 6 |
| `Archive Complete (with warnings)` | Same as above, but additionally append warnings to Step 6 summary |
| exit ≠ 0 / any error | **Block**: output `[easy-flow] BLOCK: archive failed, ship aborted.` + error info, wait for user to troubleshoot then retry `/ezfl:ship` |

#### 5.4 User Chooses B / C — Skip Archive

- Choose B (hold off) → record `ship.archive = "deferred"`, prompt user "manually run `/opsx:archive <change_id>` later to complete archiving"
- Choose C (skip) → record `ship.archive = "skipped"`, no subsequent prompt

`changes/<change_id>/state.yaml` append: `ship: { archive: "<archived|deferred|skipped|failed>", archive_path: "<only has value when archived>", archive_error: "<only has value when failed>" }`

### Step 6: Delivery Summary Output

```
[easy-flow] ship complete:

  change_id     : <change-name>
  tier          : <tier>
  branch        : <feature/...>
  worktree      : <merged and cleaned / retained / not created>
  harness artifacts : <merged back to main repo .harness/archive/<change_id>/ | not merged (worktree retained) | partial failure: <failed items> | n/a>
  audit score   : <X>/100
  files touched : <N>
  archive       : <archived at <archive_path> | deferred (user chose B) | skipped (user chose C) | failed: <archive_error>>

Next: proceed to next `/ezfl:design`; or `/ezfl:reflect` to view metrics for this run (including metrics merged back this time).
```

#### 6.1 Main Repo Cursor Reset + Cleanup (Mandatory)

After summary output, invoke `ship-cleanup.sh` (delete active_changes entry + rm -rf changes/<id>{,.snapshot}):

```bash
bash "$PLUGIN_ROOT/hooks/ship-cleanup.sh" "$change_id" "$ORIGIN_REPO" || exit 1
```

Output `[easy-flow] workflow: entry removed, active changes: <N>`.
