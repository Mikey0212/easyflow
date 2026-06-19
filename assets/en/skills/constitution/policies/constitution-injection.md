# Constitution Injection — Four Injection Point Logic

## Core Principle

The constitution is injected at 4 key points in the workflow, ensuring end-to-end compliance. Each injection point has clear, non-skippable behavior.

## Four Injection Points

### Injection Point A: Design Entry

**Position**: When `/ezfl:design` command starts
**Behavior**:
1. Subagent entry reads constitution
2. References constitution principles during design exploration
3. design.md must contain `## Constitution Alignment` section

### Injection Point B: After Lock Completes

**Position**: `/ezfl:lock` command, after plan-review completes
**Behavior**:
1. Lock subagent appends `## Constitution Compliance` section to review report
2. Evaluates item-by-item whether the plan may violate the constitution
3. STATUS aggregation rule: take the stricter of plan-review and Constitution Compliance

### Injection Point C: Build Entry

**Position**: `/ezfl:build` command, before each task sub-step 1
**Behavior**:
1. Build subagent entry reads constitution
2. Before each task begins, outputs: constitution principles relevant to this task
3. References principles during execution

### Injection Point D: Audit Step 1

**Position**: Constitution Compliance Audit step of `/ezfl:audit` command
**Behavior**:
1. See `constitution-audit.md` for details
2. Checks item-by-item, outputs violation list
3. Violations → pause and present user with three options

## Validity Pre-Check

Each injection point entry first runs `constitution-validity.sh`:
- exit 0 → execute injection
- exit 1 → block if constitution_required=true, warn and skip if =false
- exit 2 → same logic as exit 1
