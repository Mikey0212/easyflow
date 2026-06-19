# Test Review Methodology

This document is the detailed execution specification for Section 3 "Test Review" of the plan-review skill.

The goal of test review is **100% coverage**. Evaluate every code path in the plan, ensuring each has corresponding tests. If the plan lacks tests, add tests to the plan — the plan should be complete enough that the implementation phase includes full test coverage from the start.

## Step 1: Detect Test Framework

Before analyzing coverage, detect the project's test framework:

1. **Prefer reading the project root's documentation files** (e.g., README, CONTRIBUTING, CLAUDE.md), looking for a `## Testing` section for test commands and framework names. If found, use this as the authoritative source.

2. **If not found, auto-detect**:
   - `Gemfile` → ruby (RSpec/Minitest)
   - `package.json` → node (Jest/Vitest/Mocha/Playwright)
   - `requirements.txt` or `pyproject.toml` → python (pytest/unittest)
   - `go.mod` → go (testing)
   - `Cargo.toml` → rust (cargo test)
   - `pom.xml` or `build.gradle` → java (JUnit/TestNG)

3. **Check existing test infrastructure**:
   - Config files: `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`, `.rspec`, `pytest.ini`, `phpunit.xml`
   - Test directories: `test/`, `tests/`, `spec/`, `__tests__/`, `cypress/`, `e2e/`

4. **If no test framework exists at all**: Still produce a coverage diagram, but skip specific test code generation. Only record in the review report: "Project has no test framework; recommend introducing one first."

## Step 2: Trace Every Code Path in the Plan

Read the plan documents. For each new feature, service, endpoint, or component, trace how data will flow through the code — don't just list functions from the plan, **actually follow the planned execution paths step by step**.

### 2.1 Read the Plan

For each planned component, understand what it does and how it connects to existing code.

### 2.2 Trace Data Flow

Starting from each entry point (route handler, exported function, event listener, component render), follow the data through every branch:

- **Where does input come from**: request params, props, database, API calls?
- **Who transforms it**: validation, mapping, computation?
- **Where does data go**: database writes, API responses, UI renders, side effects?
- **What can go wrong at each step**: null/undefined, illegal input, network failure, empty collections?

### 2.3 Draw the Execution Diagram

For each changed file, draw an ASCII diagram showing:

- Each added or modified function/method
- Each conditional branch (if/else, switch, ternary, guard, early return)
- Each error path (try/catch, rescue, error boundary, fallback)
- Each call to other functions (continue tracing in — does it have untested branches?)
- For each edge: what about null input? Empty array? Illegal type?

**This is the critical step** — you're building a diagram showing every line that can execute differently based on input. **Every branch in this diagram needs a test.**

## Step 3: Map User Flows, Interactions, Error States

Code coverage isn't enough — you need to cover **how real users interact with the changed code**. For each changed feature, think about:

### 3.1 User Flows

What sequence of user actions will touch this code? Draw the journey in full (e.g., "User clicks Pay → form validation → API call → success/failure page"). **Every step of the journey needs a test.**

### 3.2 Interaction Edge Cases

What happens when users do unexpected things?
- **Rapid repeated actions**: double-click, rapid clicks, consecutive form submissions
- **Navigation interruption**: press back mid-process, close tab, click another link
- **Stale data submission**: page open 30 minutes, session expired
- **Slow connection**: API takes 10 seconds — what does the user see?
- **Concurrent operation**: two tabs, same form

### 3.3 User-Visible Error States

For every error the code handles, what does the user actually experience?
- Clear error message or silent failure?
- Can the user recover (retry, go back, fix input) or are they stuck?
- What about no network? API returns 500? Server returns illegal data?

### 3.4 Empty/Zero/Boundary States

- What does UI show when there are zero results?
- What about 10,000 results?
- Single-character input?
- Max-length input?

Add these alongside the execution diagram. **A user flow without a test is the same size gap as an if/else without a test.**

## Step 4: Check Each Branch Against Existing Tests

Go branch by branch through your diagram — both code paths **and user flows**. For each branch, search for tests:

- Function `processPayment()` → look for `billing.test.ts`, `billing.spec.ts`, `test/billing_test.rb`
- if/else → look for tests covering both true and false paths
- Error handler → look for tests that trigger that specific error condition
- Call to `helperFn()` which has its own branches → those branches need tests too
- User flow → look for integration or E2E tests traversing the entire journey
- Interaction edge case → look for tests simulating unexpected actions

### Test Quality Scoring

| Mark | Meaning |
|-----|------|
| ★★★ | Tests behavior + edge cases + error paths |
| ★★ | Tests correct behavior, happy path only |
| ★ | Smoke test / existence check / meaningless assertion (e.g., "it renders", "it doesn't throw") |

## Step 5: E2E vs Unit Decision Matrix

For each branch, decide whether to use unit tests or E2E/integration tests.

### Recommend E2E (mark [→E2E] in diagram)

- Common user flows involving 3+ components/services (e.g., register → email verify → first login)
- Integration points where mocks would hide real failures (e.g., API → queue → worker → DB)
- Auth/payment/data destruction flows — too important to trust unit tests alone

### Recommend EVAL (mark [→EVAL] in diagram)

- Critical LLM calls needing quality assessment (e.g., prompt change → test that output still meets quality baseline)
- Changes to prompt templates, system instructions, tool definitions

### Keep Unit Tests

- Pure functions with clear input/output
- Internal helpers with no side effects
- Edge cases of single functions (null input, empty array)
- Obscure flows not user-facing

## Regression Test Iron Rule (IRON RULE)

**When the coverage audit identifies a "regression" — code that previously worked but this diff breaks — regression tests must be added to the plan as critical requirements. Do not initiate ask_followup_question. Do not skip.**

Regression tests are the highest priority tests because they prove something is actually broken.

### What Is a Regression

- Diff modifies **existing behavior** (not new code)
- Existing tests (if any) do not cover the changed path
- The change introduces new failure modes for existing callers

**When uncertain, default to writing regression tests.** Better to write more.

## Step 6: Output ASCII Coverage Diagram

Include both code paths and user flows in the same diagram. Mark E2E candidates and eval candidates:

```
Code Paths                                              User Flows
[+] src/services/billing.ts                             [+] Payment Checkout
  ├── processPayment()                                    ├── [★★★ Tested] Full purchase — checkout.e2e.ts:15
  │   ├── [★★★ Tested] happy + declined + timeout         ├── [GAP] [→E2E] Double-click submit
  │   ├── [GAP]         Network timeout                   └── [GAP]        Leave page mid-process
  │   └── [GAP]         Invalid currency
  └── refundPayment()                                   [+] Error States
      ├── [★★  Tested] Full refund — :89                  ├── [★★  Tested] Card declined notice
      └── [★   Tested] Partial refund (non-throw) — :101  └── [GAP]        Network timeout UX

LLM Integration: [GAP] [→EVAL] Prompt template change — needs eval test

Coverage: 5/13 paths tested (38%)  |  Code paths: 3/5 (60%)  |  User flows: 2/8 (25%)
Quality: ★★★:2 ★★:2 ★:1  |  Gaps: 8 (2 E2E, 1 eval)
```

**Legend**: ★★★ behavior+edges+errors | ★★ happy path | ★ smoke check
[→E2E] = needs integration test | [→EVAL] = needs LLM eval

### Fast Path

If all paths are covered: output "Test Review: All new code paths have test coverage ✓", continue to next section.

## Step 7: Add Missing Tests to the Plan

For each GAP identified in the diagram, add test requirements to the plan. Be specific:
- **Test file path**: match existing naming conventions
- **What the test should assert**: concrete input → expected output/behavior
- **Test type**: unit / E2E / eval (use decision matrix)
- **Regression tests**: marked as **CRITICAL** with explanation of what's broken

The plan should be complete enough that each test is written synchronously with the feature code during implementation — not deferred to a subsequent PR.

## Artifact Write Convention (Single Artifact Principle)

Test review artifacts are **written directly** into the "Test Review" chapter of review-report.md, **not produced as a separate test-plan.md file**.

Structure:
```markdown
## 3. Test Review

### Test Framework
- Detected: [framework name + version]
- Command: `[test command]`

### Coverage Diagram
[ASCII diagram, per Step 6 format above]

### Gap List (by Priority)

#### CRITICAL (Regression Tests, must add to tasks.md)
- [F1] [file:line] — [description]

#### P1 (P1 Level, affects merge)
- ...

#### P2 (Deferrable, add to TODO)
- ...

### Test Tasks to Add to tasks.md

- [ ] T-test-001: Add `<test name>` test in `<file>` [Regression]
- [ ] T-test-002: Add `<test name>` test in `<file>` [E2E]
- ...
```

**Caller constraint**: Converting test gaps into executable tasks in tasks.md is **handled uniformly by the caller before the next phase starts** (in the easy-flow lock chain, handled by the `/ezfl:build` entry point). This skill only lists recommendations in review-report.md; **direct modification of tasks.md is forbidden**.
