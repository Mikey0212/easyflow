# tasks.md Template and Rules (easy-flow Workflow)

> **Important**: The design phase's `/opsx:propose` invocation **must re-read this file via read_file before each call**.

## Task Granularity Rules

tasks.md supports two types of tasks:

| Type | Applicable Scenario | Sub-task Step Count |
|------|---------|-----------|
| **TDD Task** | New features, bug fixes, implementations with branching logic | 5 steps (Write Failing Test → RED → Write Minimal Implementation → GREEN → REFACTOR) |
| **Non-TDD Task** | Configuration changes, renames, documentation updates, dependency upgrades, build scripts, pure templates/scaffolding | 3 steps (Execute Change → Verify No Regression → Check Completeness) |

**Determination Principle**: When uncertain, **default to TDD task**. The determination result is annotated as an HTML comment after each task (`<!-- TDD task -->` / `<!-- Non-TDD task -->`) for `/opsx:apply` to identify the sub-step order within the implementer subagent.

---

## Template Body (propose must generate tasks.md in this format)

```markdown
# {{CHANGE_ID}} — Implementation Task Plan

> **Execution Entry**: This plan is executed by `/ezfl:build` via `/opsx:apply` within the implementer subagent, task by task.


**Goal**: {{GOAL_ONE_SENTENCE}}

**Architecture**: {{ARCHITECTURE_2_3_SENTENCES}}

**Tech Stack**: {{TECH_STACK}}

---

## 1. {{TASK_GROUP_NAME}}

- [ ] 1.1 {{TASK_NAME}}  <!-- TDD task -->

  **Files**:
  - Create / Modify: `{{IMPL_PATH}}`
  - Test: `{{TEST_PATH}}`

  - [ ] 1.1.1 Write failing test: `{{TEST_PATH}}`
  - [ ] 1.1.2 Verify test fails (run: `{{TEST_COMMAND}}`, confirm failure is due to missing feature)
  - [ ] 1.1.3 Write minimal implementation: `{{IMPL_PATH}}`
  - [ ] 1.1.4 Verify test passes (run: `{{TEST_COMMAND}}`, confirm all tests pass with clean output)
  - [ ] 1.1.5 Refactor: remove duplication / improve naming / extract helpers (keep all tests passing)

- [ ] 1.2 {{TASK_NAME}}  <!-- Non-TDD task -->

  **Files**:
  - Modify: `{{PATH}}`

  - [ ] 1.2.1 Execute change: `{{PATH}}`
  - [ ] 1.2.2 Verify no regression (run: `{{VERIFY_COMMAND}}`, confirm clean output)
  - [ ] 1.2.3 Check change completeness (no missing files, no un-updated references)

## 2. {{NEXT_TASK_GROUP_NAME}}

(Append task groups as needed, numbering continuous)

---

## N. Documentation Sync (REQUIRED — must be the last group)

- [ ] N.1 Sync `openspec/changes/<change-id>/design.md`: record technical decisions during implementation, deviations from design, key implementation details
- [ ] N.2 Sync this `tasks.md`: check all top-level tasks and sub-tasks checkbox status; mark completed items still at `[ ]` as `[x]` (each update only changes `[ ]` → `[x]`, must not modify task description text)
- [ ] N.3 Sync `openspec/changes/<change-id>/proposal.md`: if scope/impact deviates from the original proposal, update corresponding sections
- [ ] N.4 Sync `openspec/changes/<change-id>/specs/*.md`: if requirements were adjusted during implementation, update spec files
- [ ] N.5 Final review: confirm all OpenSpec four-piece set (proposal/design/specs/tasks) reflects actual implementation results
```

---

## tasks.md Mandatory Rules (must be followed when propose generates)

### 1. Task Type Determination and Annotation

- New features / bug fixes / implementations with branching logic → TDD task (5 steps)
- Configuration changes / renames / documentation updates / dependency upgrades / build scripts / pure templates & scaffolding → Non-TDD task (3 steps)
- When uncertain, **default to TDD task**
- Each task must be annotated with its type as an HTML comment: `<!-- TDD task -->` or `<!-- Non-TDD task -->`

### 2. Sub-task Order is Fixed

- **TDD task**: Write Failing Test → Verify RED → Write Minimal Implementation → Verify GREEN → REFACTOR (order cannot be changed)
- **Non-TDD task**: Execute Change → Verify No Regression → Check Completeness

### 3. Files and Commands Must Be Executable

- File paths are relative to the project root (e.g. `src/api/auth.ts`), must not use `<...>` placeholders
- Test commands and verification commands must be directly copy-pasteable to terminal
- If placeholders appear in paths, they must be explicitly marked with `{{...}}`, and propose replaces them with real values when generating

### 4. Documentation Sync Mandatory Requirements

- DocSync **must** be the last group (numbered N, where N = number of implementation task groups + 1)
- Sub-tasks are flat checklist items, no further nesting
- DocSync does not make commit / PR / merge decisions — these actions are delegated to the `/ezfl:ship` phase's `ship` skill + `superpowers:finishing-a-development-branch`

### 5. YAGNI Principle

- Only list tasks actually needed for this change; no speculative planning
- Must not reserve placeholder tasks for "possible future needs"

### 6. Prohibited Items

- Must not add `git commit` steps in sub-tasks (handled uniformly by the ship phase at the end)
- Must not write TDD task implementation code before observing test failure (N.M.2 must complete before N.M.3)
- Must not skip the REFACTOR step (even if code is already clean, must explicitly confirm "no refactoring needed")

---

## Contract with build / lock / audit

| Upstream Consumer | What it Expects from tasks.md |
|------------|----------------------|
| `/ezfl:lock` (plan-review) | Reviews tasks.md granularity, dependency ordering, executability; review suggestions are written to `review-report.md`, **does not directly modify tasks.md** |
| `/ezfl:build` (implementer subagent running `/opsx:apply`) | Executes tasks sequentially; determines sub-step pacing via `<!-- TDD task / Non-TDD task -->` comments; apply itself handles checkbox updates (`[ ]` → `[x]`) |
| `/ezfl:audit` | After implementation, scans artifacts for Constitution compliance and scorer evaluation; does not read tasks.md, only examines code changes and outputs |
