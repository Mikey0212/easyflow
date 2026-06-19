# Easy-Flow Hard Stops

> Cross-phase hard constraint checklist. Global constraints that all skills must collectively follow.

## Scope

The Hard Stops listed in this document are global constraints that all easy-flow skills **must comply with** during execution. Each skill declares which clauses it adheres to by referencing the document IDs (H8/H9/H10) in its own SKILL.md.

When any skill is about to violate a Hard Stop, it **must first output the corresponding self-check statement, then halt**, and wait for user intervention.

## Hard Stops List

| ID | Rule | Applicable Skill | Consequence of Violation |
|----|------|------------------|--------------------------|
| H8 | Every state transition **must** output a visible status line in the reply, such as `[easy-flow] entering phase: <verb>` or `[easy-flow] worktree: ...`, so the user can visualize the path | All skill entries and key steps corresponding to `/ezfl:*` commands | Rewrite current reply |
| H9 | When `state.yaml` has `worktree.created_by_easy_flow=true`, the ship phase **must** append a **three-step sequence** after `superpowers:finishing-a-development-branch` completes: (1) **harness artifacts merge-back** (`.harness/metrics/*` / `overrides.log` / `state.yaml` final state / `pre_design.md` revisions → main repo `.harness/` top level + `.harness/archive/<change_id>/`); (2) git merge-back (skip if already merged); (3) worktree cleanup. **Forbidden** to only do finishing without cleaning up the worktree; **forbidden** to `git worktree remove` without first executing the artifact merge-back (which would evaporate this run's reflect/audit data) | `ship` (Step 3) | Stop immediately |
| H10 | Any dispatch-point skill (`build` / `audit`) **must** first call `use_skill("easy-flow:agent-selector")` and wait for the return before dispatching a subagent; **forbidden** to skip the internal Agent Selection step and directly dispatch implementer/scorer subagents | All dispatch-point skills | Stop immediately |
| H11 | The ship phase **must**, before Step 1, first acquire a mutex lock on `.harness/.locks/ship.lock` in the main repo per `ship/policies/ship-lock.md`; lock content includes `change_id`+PID+start time; `trap EXIT INT TERM HUP` auto-release; if lock exists and is < 30min → block; if ≥ 30min, treat as stale → `ask_followup_question` for explicit user confirmation to clear. Cross-machine concurrency is out of scope for this constraint (lock not committed to repo) | `ship` (Step 0) | Stop immediately |
| H12 | Any write operation (read-modify-write full rewrite) to the main repo's `.harness/workflow.yaml` **must** first acquire the `.harness/.locks/workflow.lock` mutex lock per `policies/workflow-lock.md`; after writing, **must** read back and verify that the modification took effect; lock content includes `skill_name`+PID+start time; `trap` auto-release; stale threshold 5s (normal RMW < 100ms). When nested within `ship`, the lock order is fixed as ship.lock → workflow.lock to avoid deadlock | All positions in `design`/`propose`/`ship` that write to workflow.yaml | Stop immediately |
| H13 | **Forbidden** for any skill / main agent / subagent to invoke `superpowers:subagent-driven-development` or `superpowers:executing-plans` — these two dispatch drivers. All subagent dispatch is uniformly performed by the main agent using the host's native Task / AgentTool. The agent file is determined by `easy-flow:agent-selector`; when the selector returns `"inline"`, the main agent executes inline within its own session and never falls back to superpowers dispatch. **Not covered by the ban**: `superpowers:brainstorming`, `superpowers:test-driven-development`, `superpowers:verification-before-completion`, `superpowers:finishing-a-development-branch`, `superpowers:using-git-worktrees` and other passive methodology/tool skills — they remain usable as they do not dispatch subagents | All easy-flow skills; all subagents dispatched by easy-flow | Stop immediately |

> Note: Original H3 (mandatory worktree decision) has been removed. Worktree creation is now a non-blocking prompt — handled by the `propose` skill's Step 1 at the `/ezfl:propose` entry point with a user inquiry, no longer a global hard constraint, no standalone worktree skill needed.

## Self-Check Statements (must output before halting when about to violate)

| Hard Stop | Self-Check Statement |
|-----------|---------------------|
| H8 | (No blocking statement; only "rewrite reply" — add the missing `[easy-flow] ...` status line before continuing) |
| H9 | `[easy-flow] BLOCK: This workflow created a worktree. ship must complete the three-step sequence of harness artifact merge-back + git merge-back + cleanup before delivering the final summary (HARD STOP H9). First ensure .harness/metrics, overrides.log, state.yaml final state, and pre_design.md revisions have been copied back to the main repo .harness/ and .harness/archive/<change_id>/, then run git worktree remove.` |
| H10 | `[easy-flow] BLOCK: Must call easy-flow:agent-selector before dispatching a subagent (HARD STOP H10). The current dispatch point <dispatch_point_id> has not completed Agent Selection. Dispatching subagent is prohibited.` |
| H11 | `[easy-flow] BLOCK: ship must first acquire .harness/.locks/ship.lock mutex (HARD STOP H11). Existing lock detected <lock_content> held for <age>s (< 30min treated as active / ≥ 30min treated as stale, requires user confirmation). Handle per policies/ship-lock.md or wait for the other ship to complete.` |
| H12 | `[easy-flow] BLOCK: Must acquire .harness/.locks/workflow.lock before writing workflow.yaml (HARD STOP H12). Lock not acquired within 6s, held by <lock_content>. Handle per policies/workflow-lock.md.` (or on write-back verification failure: `[easy-flow] BLOCK: workflow.yaml write-back verification failed (HARD STOP H12). Expected <expected>, actual <actual>. Manual intervention required.`) |
| H13 | `[easy-flow] BLOCK: About to invoke <superpowers:subagent-driven-development | superpowers:executing-plans>. This dispatch driver has been globally disabled (HARD STOP H13). Instead: ① First call easy-flow:agent-selector to get the three-state return value; ② The main agent dispatches directly using the host's native Task/AgentTool (with agent path or default subagent), or executes inline (when selector returns "inline"); ③ Never fall back to superpowers dispatch drivers.` |
