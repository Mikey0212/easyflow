# Sections 1-4: Four-Section Review

> Called sequentially by `plan-review` SKILL.md after Step 0 completes. Within each section, "one question at a time" — each finding in this section separately initiates one `ask_followup_question`, **no bundling** (see `../references/output-format.md` Section 3). Only when all issues in this section have been decided by the user (one of A/B/C, or explicitly skipped) does the next section begin.

## Section 1: Architecture Review

For detailed dimensions, see `../references/engineering-mindset.md` "15 Engineering Manager Cognitive Patterns" (especially #3 Boring-by-Default, #10 Essential vs Accidental Complexity, #11 Two-Week Sniff Test).

Evaluation checklist:

- Overall system design and component boundaries
- Dependency graph and coupling concerns
- Data flow patterns and potential bottlenecks
- Scalability characteristics and single points of failure
- Security architecture (authentication, data access, API boundaries)
- Which key flows deserve embedded ASCII diagrams in plan/code comments
- For each new code path or integration point, describe a real production failure scenario and check whether the plan considers it
- **Distribution architecture**: If introducing new artifacts (binary, package, container), how are they built, released, updated? Is the CI/CD pipeline part of the plan or deferred?

## Section 2: Code Quality Review

Evaluation checklist:

- Code organization and module structure
- DRY violations — be strict here
- Error handling patterns and missing edge cases (explicitly flag)
- Technical debt hotspots
- Over-engineered or under-engineered areas relative to engineering preferences
- Existing ASCII diagrams in touched files — still accurate after this change?

## Section 3: Test Review

**Full methodology in `../references/test-review-methodology.md`**. This is the heaviest section of this skill, targeting 100% coverage.

Core steps (summary):

1. **Step 1**: Detect project test framework
2. **Step 2**: Trace every code path in the plan (draw execution ASCII diagram)
3. **Step 3**: Map user flows, interaction edge cases, error states
4. **Step 4**: Check each branch against existing tests (★/★★/★★★ scoring)
5. **Step 5**: Apply E2E vs Unit decision matrix
6. **Step 6**: Produce ASCII coverage diagram (code paths + user flows combined)
7. **Step 7**: Add missing tests to the plan

### Regression Test Iron Rule

**When the coverage audit identifies a "regression" — code that previously worked but this diff breaks — regression tests must be added to the plan as critical requirements. Do not initiate ask_followup_question. Do not skip.**

When uncertain, default to writing regression tests. See `../references/test-review-methodology.md` "Regression Test Iron Rule" section for details.

### Test Review Artifact (Single Artifact Principle)

Test review artifacts are **written directly** into the "Test Review" chapter of review-report.md, **not produced as a separate test-plan.md file**. In the OpenSpec context, this aligns with the single-artifact convention of `openspec/changes/<name>/`; in standalone invocation scenarios, it avoids scattered file management.

## Section 4: Performance Review

Evaluation checklist:

- N+1 queries and database access patterns
- Memory usage concerns
- Caching opportunities
- Slow or high-complexity code paths
