---
name: propose
description: "Must use this skill when user triggers /ezfl:propose or requests generating OpenSpec four-piece set based on pre_design.md. This skill connects three things: (1) prompts user at entry to decide whether to create a worktree (non-blocking); (2) locates and validates the pre_design.md produced by the design phase (falls back to user's original prompt if missing); (3) has the main agent inline-invoke /opsx:propose with exit compliance verification. It is the sole hand-off point between design → lock, and also serves as the worktree decision entry."
---

# propose

<HARD-GATE>
- **Forbidden** to invoke `/opsx:propose` without reading or confirming the existence/content of `pre_design.md`
- **Forbidden** to skip the worktree prompt and directly enter the propose main flow (the prompt is non-blocking: user can choose not to create and continue, but **must be asked**)
- **Forbidden** for the main agent to not `read_file templates/tasks-template.md` before invoking `/opsx:propose`
- **Forbidden** to create a worktree via `superpowers:using-git-worktrees` — must be done by this skill's Step 1.3.A directly executing git commands
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: propose — using easy-flow:propose skill.`

## Flow (execute in order; do not proceed to next step until current is complete)

### Step 0: Locate change_id

Read `.harness/workflow.yaml: active_changes`, filter for entries with `phase=design`:
- **Single match**: directly use its `change_id`
- **Multiple matches**: use `ask_followup_question` to list all candidates for user selection
- **Zero matches**: block, prompt "No active change found in design phase, please run /ezfl:design first"

### Step 1: Worktree Decision (informational, non-blocking)

**1.1 Pre-check**: Read `.harness/changes/<change_id>/state.yaml: worktree.created_by_easy_flow`. If non-empty value already exists → skip this step, output `[easy-flow] worktree: already decided (<...>), skipping this prompt.` then enter Step 2.

**1.2 Ask user** (unified text, no tier differentiation):

> About to enter the propose phase, which will write the OpenSpec four-piece set and modify the repo. Create an isolated git worktree for this change?
>
> A. Yes, create worktree
> B. No, stay in current working directory

#### 1.3.A User chooses A — Create worktree (script execution)

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
main_repo_root="$(git rev-parse --show-toplevel)"
WT_RESULT=$(bash "$PLUGIN_ROOT/hooks/worktree-create.sh" "$change_id" "$main_repo_root")
WT_EXIT=$?
```

- exit 0 → `$WT_RESULT` contains JSON(`target_path` / `target_branch` / `snapshot_path`); continue with workflow update below
- exit 1 → **block**, stderr has error info

**Sync main repo workflow.yaml** (script internally handles lock/write-back verification, see H12):

```bash
bash "$PLUGIN_ROOT/hooks/workflow-entry.sh" update-active --skill propose \
  --where-change-id "$change_id" --set phase=propose --set worktree-path="$target_path"
```

Output `[easy-flow] worktree: created at <target_path> on branch <target_branch>`.

#### 1.3.B User chooses B — Stay in main repo

No git changes. Update main repo `.harness/changes/<change_id>/state.yaml`: write `worktree.created_by_easy_flow: false`, `current_verb: propose`. Sync workflow.yaml (switch phase to propose, worktree_path remains empty):

```bash
bash "$PLUGIN_ROOT/hooks/workflow-entry.sh" update-active --skill propose \
  --where-change-id "$change_id" --set phase=propose
```

Output `[easy-flow] worktree: not created, staying in <cwd>`.

### Step 2: Locate and Validate `pre_design.md`

**2.1 Locate**: For worktree mode (1.3.A), take `<target_path>/.harness/changes/<change_id>/pre_design.md`; for main repo mode (1.3.B), take `<main_repo_root>/.harness/changes/<change_id>/pre_design.md`.

**2.2 File existence + integrity**:

| Case | Handling |
|---|---|
| **File does not exist** | Fallback: use the user's original message when invoking `/ezfl:propose` as propose input; output `[easy-flow] pre_design.md not found, using user's original prompt as propose input.` then jump to Step 3.2 |
| **File exists** | Run `bash "$PLUGIN_ROOT/hooks/pre-design-validate.sh" <pre_design_path>` (8-section mandatory checklist, same source as `templates/pre-design-template.md`): exit 0 pass / exit 2 missing sections (stderr already contains unified block message) / exit 1 file not found (theoretically cannot hit) |

**2.3 User final confirmation** (defensive, guards against stale pre_design.md): Output preview of full path + ask `A. Confirm / B. Pause and return to design`. Only A enters Step 3.

### Step 3: Invoke `/opsx:propose`

**3.1 Mandatory prerequisite**: Before invocation, must `read_file templates/tasks-template.md` and explicitly output `[easy-flow propose] read_file templates/tasks-template.md (version: <template top first line>)`.

**3.2 Assemble input**: Full path → embed the full text of `pre_design.md` as a whole block (do not summarize); fallback path → user's original message at invocation time.

**`pre_design.md` section → OpenSpec four-piece set mapping** (full path only):

| `pre_design.md` Section | Written To |
|---|---|
| `## Reframe Journey` | `proposal.md` "Why / Context" section |
| `## Constitution Alignment` | `design.md` `## Constitution Alignment` section (aligned per Core Principle) |
| `## Premises` | `design.md` `## Premises` section |
| `## Decisions` (architecture + tech choices) | `design.md` `## Decision` / `## Architecture` section |
| `## Alternatives` | `design.md` `## Alternatives` section |
| `## Task Scope` | `tasks.md` task division scope basis |
| `## Open Questions` | `proposal.md` `## Open Questions` section |

`tasks.md` strictly follows `templates/tasks-template.md` rules; `change_id` from Step 0 location result.

**3.3 Execute**: Main agent invokes `/opsx:propose <change_id>` within its own session, using the assembled input from 3.2 as command context.

### Step 4: Exit Verification

> In fallback mode (user's original prompt as input), if propose did not generate the sections required by items 2/3/4, they can be relaxed (not blocking), only marked `(fallback)` in the summary.

After `/opsx:propose` returns, verify:

1. All four pieces generated: `openspec/changes/<change_id>/` contains `proposal.md` / `design.md` / `specs/` / `tasks.md`
2. `design.md` contains `## Constitution Alignment` section, and covers each Core Principle
3. `design.md` contains `## Alternatives` section, explaining each unselected option and rejection reason
4. `design.md` contains `## Premises` section
5. `tasks.md` compliance check (**must run script, forbidden to inspect manually**):

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
LINT_RESULT=$(bash "$PLUGIN_ROOT/hooks/tasks-lint.sh" "openspec/changes/$change_id/tasks.md")
LINT_EXIT=$?
```

   exit 0 → pass; exit 1 → **block**, output `$LINT_RESULT` (JSON violations), require correction of tasks.md then re-run this check
6. This skill has explicitly output "read_file `templates/tasks-template.md`" declaration before invocation

Verification passed → output `[easy-flow] propose complete: four-piece set written to openspec/changes/<change_id>/. Next step suggestion: /ezfl:lock.`; any item not met → block and output failure reason.
