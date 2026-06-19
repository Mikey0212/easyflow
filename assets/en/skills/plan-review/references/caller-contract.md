# Caller Contract

> This skill is a **general-purpose proposal reviewer**, not bound to any specific workflow. Any business workflow (e.g., easy-flow `lock` chain) as a caller must fulfill the contract below. **Modifying fields or order in this file must synchronously update all known adapters (including `commands/lock.md`).**

## Input

The caller must provide a "proposal material path list". In the easy-flow lock chain scenario, this is fixed as:

- `openspec/changes/<name>/proposal.md`
- `openspec/changes/<name>/design.md`
- `openspec/changes/<name>/specs/`
- `openspec/changes/<name>/tasks.md`

Standalone invocation scenarios have the user explicitly list document paths to review in the conversation.

## Output

**Sole artifact**: Review report file (path specified by caller).

In the easy-flow lock chain scenario, the output path is `openspec/changes/<name>/review-report.md`.

Contains the following chapters (order fixed):

1. Review meta-information (reviewed change name, review time, reviewer)
2. Step 0 Scope Challenge conclusion
3. Section 1: Architecture Review
4. Section 2: Code Quality Review
5. Section 3: Test Review (including ASCII coverage diagram)
6. Section 4: Performance Review
7. Outside Voice Review (if run)
8. NOT in scope
9. What already exists
10. Failure modes
11. Worktree Parallelization Strategy (if applicable)
12. Completion Summary
13. STATUS

## Modification Constraints

**During review, modifying any files outside the "proposal materials" directory is forbidden** (in the easy-flow lock chain scenario, this means outside `openspec/changes/<name>/`).

If the review discovers test gaps that need to be added to tasks.md, **only list recommendations in review-report.md**. The caller (e.g., easy-flow's `/ezfl:build`) updates tasks.md uniformly before the next phase starts.

## Constitution Compliance (Handled by Caller, Not in This Skill's Scope)

Some workflows require the review report to contain a `## Constitution Compliance` section. **This section is appended by the caller after this skill completes**, and is not within this skill's write responsibility. This skill does not read `openspec/memory/constitution.md`, and does not know the constitution exists.

→ In the easy-flow lock chain, injection point B described by `commands/lock.md` appends the Constitution Compliance section after this skill completes.

## Hard Gate Delivery

The review-report's STATUS field is the **caller's hard gate signal**:

- `STATUS: DONE` → caller may advance to the next phase
- `STATUS: DONE_WITH_CONCERNS` → user must decide on each concern item by item; confirm before advancing
- `STATUS: BLOCKED` or `STATUS: NEEDS_CONTEXT` → advancing is strictly prohibited; must resolve the blocking issue first

In the easy-flow lock chain, the "next phase" means `/ezfl:build`; STATUS decisions are handled by the chain transition described in `commands/lock.md`.
