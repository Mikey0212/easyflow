# Output Style Guide & Required Output Format

This document defines the plan-review skill's output style, confidence rules, ask_followup_question format constraints, and required artifacts at review completion.

## I. Output Style Guide

### 1. Describe Problems in Outcome Terms, Not Implementation Terms

When initiating each ask_followup_question, prefer describing **what the user/system will experience**, rather than **what the underlying implementation is**.

**Counter-example** (implementation-oriented, user fatigue):
> "Is this endpoint idempotent?"
> "Does the database use pessimistic or optimistic locking?"
> "Is a distributed transaction needed?"

**Good example** (outcome-oriented, user understands instantly):
> "If the user double-clicks the button, is performing the operation twice OK?"
> "If two people edit the same record at the same time, whose changes are preserved?"
> "If a middle step fails, are previously completed actions automatically rolled back?"

### 2. Connect Every Decision to Concrete User Impact

Each ask_followup_question option must have one sentence: "If you choose this, what's the consequence."

**Counter-example**: "This might be slow."

**Good example**: "This is an N+1 query. With 50 records, each list load adds 200ms — users will see a noticeable stutter."

### 3. Short Sentences, Concrete Nouns, Active Voice

- ❌ "Edge cases should be thoroughly considered and handled"
- ✅ "Handle these 3 edges: null input, empty array, oversized string"

### 4. Terminology Localization

When output contains technical terms, briefly explain them on first occurrence if the audience may be unfamiliar:

| Term | Brief Explanation |
|------|------------|
| idempotent | (repeated calls yield the same result) |
| race condition | (two things happen simultaneously and step on each other) |
| N+1 query | (data that could be fetched in one query is split into N queries) |
| cache stampede | (caches expire simultaneously, traffic floods the database) |
| backpressure | (when downstream can't keep up, push back to slow upstream) |

Terms not on this list are assumed to be understood by the reader without explanation.

## II. Confidence Calibration

Each finding must carry a confidence score (1-10):

| Score | Meaning | Display Rule |
|-----|------|---------|
| 9-10 | Verified by reading specific code. Concrete bug or vulnerability demonstrable. | Display normally |
| 7-8 | High-confidence pattern match. Very likely correct. | Display normally |
| 5-6 | Medium confidence. Could be a false positive. | Display with note: "Medium confidence, verify whether it's a real issue" |
| 3-4 | Low confidence. Pattern suspicious but may be fine. | **Do not enter main report**, only enter appendix |
| 1-2 | Speculation. | Report only when severity is P0 |

### Finding Format

```
[Severity] (Confidence: N/10) file:line — description
```

**Examples**:

```
[P1] (Confidence: 9/10) src/auth/login.ts:42 — SQL injection, string concatenation in where clause
[P2] (Confidence: 5/10) src/api/users.ts:18 — Suspected N+1 query, needs production log verification
```

### Calibration Learning

If a finding with confidence < 7 is confirmed as a real issue by the user, this is a **calibration event** — your initial confidence was too low. Record the corrected pattern in project memory for higher-confidence detection in future reviews.

## III. ask_followup_question Format Constraints

### One Issue = One Question

Each finding separately initiates one ask_followup_question, **never bundle**.

Rationale: Users facing 5 questions at once experience decision fatigue and tend to answer yes/no without reading details. Expand each question into 2-3 concrete options the user can choose within 5 seconds.

### Standard Structure

Each ask_followup_question must contain 4 parts:

1. **Reorientation** (1-2 sentences): State the project, current branch, current task. Let the user understand instantly even after 20 minutes away.

2. **Simplified problem** (plain language, understandable by a 16-year-old): Use concrete examples and analogies. Say "what it does", not "what it's called". If you need to read source code to explain yourself, it's too complex.

3. **Recommendation** (required format):
   ```
   Recommendation: Choose [letter] because [one-sentence reason, mapped to one engineering preference]
   Completeness: A=X/10, B=Y/10
   ```

4. **Options** (2-3, letter-labeled):
   ```
   A) [description] (Human: ~X / AI-assisted: ~Y) Completeness: N/10
   B) [description] (Human: ~X / AI-assisted: ~Y) Completeness: M/10
   ```

### Completeness Score (Completeness Principle)

Each option is labeled `Completeness: X/10`:

- **10** = Full implementation (all edges + full coverage + all error paths handled)
- **7** = Happy path only
- **3** = Shortcut deferring significant work

**Always recommend options ≥8.** If both are ≥8, recommend the higher one. If any option is ≤5, explicitly mark it as "shortcut" and explain the deferred workload.

### Efficiency Reference Table (The Other Side of the Completeness Principle)

| Task Type | Human Team | AI-Assisted | Compression Ratio |
|---------|---------|---------|--------|
| Boilerplate Code | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Features | 1 week | 30 min | ~30x |
| Bug Fixes | 4 hours | 15 min | ~20x |

AI assistance makes "completeness" nearly free. Always recommend the **full solution** over the shortcut, because the gap is often just minutes. **If a full solution only takes a few more minutes (AI-assisted), must recommend the full solution.**

## IV. Required Output Trio

After review completion, the following three chapters must be produced; none can be omitted. All are written into `review-report.md` (`openspec/changes/<name>/review-report.md` in the OpenSpec context).

### 1. NOT in Scope (Explicitly Out-of-Scope Work)

List work **considered during review but explicitly deferred**, each with a one-sentence rationale.

Format:
```markdown
## NOT in scope

The following work was considered for this proposal but is not included:

- **[Item 1]** — [one-sentence reason]
- **[Item 2]** — [reason]
```

**Why required**: Prevents "vague deferral". Every deferred item must be named, or it appears in production incidents as "forgotten".

### 2. What Already Exists (Existing Code Inventory)

List **existing code/flows that already partially or fully address sub-problems**, and whether the plan reuses them or unnecessarily rebuilds.

Format:
```markdown
## What already exists

| Sub-Problem | Existing Solution | Plan's Handling | Assessment |
|--------|---------|-------------|------|
| User Auth | `auth/jwt-validator.ts` already implements JWT validation | Reuse | ✅ |
| Rate Limiting | `middleware/rate-limit.ts` has infrastructure | Rebuild another | ❌ Should reuse, flag P1 |
```

**Why required**: Prevents the AI-assisted era's "information overload bias toward rebuilding". AI writes new code easily, leading to default rebuild over reuse.

### 3. Failure Modes

For each new code path identified in the test review diagram, list one real production failure mode (timeout / nil / race / stale data), and annotate:

1. Whether there's a test covering the failure
2. Whether there's error handling
3. Whether the user sees a clear error or silent failure

Format:
```markdown
## Failure modes

| Code Path | Real Failure Mode | Has Test? | Has Error Handling? | User-Visible? |
|---------|-------------|--------|-----------|----------|
| `processPayment()` | 3rd-party API timeout 5s | ❌ | ⚠️ catch only, no retry | ❌ Silent failure |
| `refundPayment()` | Partial refund amount invalid | ✅ | ✅ | ✅ |

### Critical Gaps

[List items where all three conditions — "no test + no error handling + silent failure" — are met, marked as critical gaps]
- `processPayment()` API timeout — **CRITICAL GAP**: User pays and sees no feedback, assumes payment failed and retries
```

**Why required**: Any failure mode with "no test + no error handling + silent failure" is a **critical gap** that must be fixed before implementation.

## V. Worktree Parallelization Strategy (Optional Output)

Produced only when the review detects **multiple independent workflows**.

### Skip Condition

If **all steps touch the same main module**, or **the plan has fewer than 2 independent workflows**, skip this section, write one sentence: "Sequential implementation, no parallelization opportunity."

## VI. Completion Summary

Fill in and display at the end of the report:

```markdown
## Review Completion Summary

| Item | Status |
|------|------|
| Step 0 Scope Challenge | [Scope accepted per original proposal / Scope reduced per recommendation] |
| Architecture Review | ___ issues found |
| Code Quality Review | ___ issues found |
| Test Review | Coverage diagram produced, ___ GAPs identified |
| Performance Review | ___ issues found |
| NOT in scope | Written |
| What already exists | Written |
| Failure modes | ___ critical gaps flagged |
| Outside Voice | [Run: cross-review-agent (model: <name>) / Skipped / Not run (host lacks capability)] |
| Worktree Parallelization | ___ Lanes, ___ parallel / ___ sequential (or: sequential implementation) |
| Completeness Score | X/Y recommended options chose the full solution |

**Unresolved Decisions (may bite you later)**:
- [If user didn't answer some ask_followup_question or interrupted, list here]

## STATUS

[Choose one of four, see Escalation Protocol]
- DONE — All complete, every claim has evidence
- DONE_WITH_CONCERNS — Complete but with concerns the user should know [list each concern]
- BLOCKED — Cannot continue [explain what's stuck, what was tried]
- NEEDS_CONTEXT — Missing information, cannot continue [explain what's needed]
```

## VII. Unresolved Decision Handling

If the user:
- Didn't answer some ask_followup_question
- Interrupted to continue
- Skipped a review section

→ **Never silently default to any option.** List a separate "Unresolved Decisions" section in the final Completion Summary, listing each unresolved item and its possible consequences.

## VIII. Escalation Protocol (Completion Status Protocol)

**Core principle**: Bad work is worse than no work. You won't be punished for escalating.

### When You Must Escalate

- Same task attempted 3 times and failed → STOP
- Security-sensitive changes (auth, encryption, permissions, PII) uncertain → STOP
- Work scope exceeds verifiable capability → STOP

### Escalation Format

```markdown
## STATUS: BLOCKED / NEEDS_CONTEXT

**REASON**: [1-2 sentences]
**ATTEMPTED**: [what was tried]
**RECOMMENDATION**: [what the user should do]
```

Write STATUS directly at the end of review-report.md. **Do not force out a low-quality review report to "look professional"** — explicitly saying "this exceeds my capability" is professional.
