# Pre-Design Template

> **Usage Convention**: This template is referenced by the `design` skill Step 4.1. The design main agent reads this template and then fills in `<repo_root>/<draft_dir>/pre_design.md` section by section; source annotations for each section are indicated in inline comments.
>
> The first line `# Pre-Design: <change_id>` is initially written as a placeholder `<TBD>` in stage 4.1, and backfilled by 4.4 once `change_id` is finalized.

---

# Pre-Design: <change_id>

## Reframe Journey
<!-- From design Step 3.2, one line -->
- Original ask X → User accepted Reframe as Y (or: "User rejected Reframe, keeping original framing X")

## Constitution Alignment
<!-- From design Step 2, aligned item by item against each Core Principle -->
- Principle 1: <how it aligns>
- Principle 2: <how it aligns>
- ...

## Premises
<!-- From design Step 3.4, premises confirmed by the user one by one -->
1. <premise original text>
2. <premise original text>

## Premise History
<!-- From design Step 3.4, rejected/modified premises and their history -->
- <historical premise> → <revised premise>, reason: <...>

## Decisions (Architecture + Tech Choices)
<!-- From design Step 3.3, user-selected approach -->

### Architecture
<...>

### Tech Choices
<...>

## Alternatives
<!-- From design Step 3.3, unselected options -->

### Option B (not selected)
- Pros: …
- Cons: …
- Rejection reason: …

### Option C (not selected)
- ...

## Task Scope
- Included: <...>
- Excluded: <...>

## Open Questions
<!-- Questions unresolved in brainstorming, left for the lock phase to address -->
- <...>

## Downstream Constraints

- Before generating tasks.md, must `read_file templates/tasks-template.md` (TDD=5 steps / non-TDD=3 steps)
- The propose exit is validated by `hooks/tasks-lint.sh` script; non-compliant output is blocked
