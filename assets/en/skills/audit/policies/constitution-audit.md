# Constitution Audit — Compliance Audit Rules

## Core Principles

Constitution Audit is Step 1 (injection point D) of the audit command. It checks the implementation outputs item-by-item against the constitution's Core Principles.

## Prerequisites

1. `constitution-validity.sh` returns exit 0 (constitution valid)
2. If exit 1 or 2 → handle per `constitution_required` config

## Audit Flow

### 1. Read Constitution

```
read openspec/memory/constitution.md
Extract all Core Principles (### sections under ## Core Principles)
```

### 2. Item-by-Item Check

For each Principle:
- Check whether the implementation output has violations
- Violation classification:
  - Principles marked `NON-NEGOTIABLE` → **Critical** (must fix)
  - Other principles → **Important** (should fix)

### 3. Output Violation List

```markdown
## Constitution Compliance Audit

| # | Principle | Status | Violation Description |
|---|-----------|------|---------|
| I | Test-First (NON-NEGOTIABLE) | ✅ / ❌ | {{DETAIL}} |
| II | Library-First | ✅ / ❌ | {{DETAIL}} |
```

### 4. Violation Handling

If any Critical or Important violations exist:
- Pause and present user with three options:
  1. Fix the violating code yourself
  2. Accept the violation (record to overrides.log)
  3. Redo the entire task group

## STATUS Aggregation Rules

Take the stricter of Constitution Audit and other reviews as the final STATUS.
