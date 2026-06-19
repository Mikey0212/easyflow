# Main Review Summary Template

> This template is fed to the `cross-review-agent` subagent so it knows:
> 1. What issues the main review has already discovered (to avoid duplication)
> 2. Where the proposal materials are located
>
> **Important**: This template does NOT include "user A/B/C decisions for each finding" by default, to maximize challenger independence.
> If `config.challenger.share_user_decisions: true`, the main skill should additionally attach a user decision paragraph when generating this template,
> and explicitly note "challenger independence sacrificed" in the review report.
>
> Placeholder convention: Use `{{PLACEHOLDER}}` for fields the main skill replaces before invocation.

---

# Your Task for This Session

You are `cross-review-agent`, an independent proposal cross-reviewer.

The main review has completed. Now, using a **different perspective than the main reviewer**, perform an independent second review of the following proposal materials, **focusing on finding issues the main review missed** (see the "Five Types of Blind Spots" and "Six Lines of Defense" in your system prompt).

---

## Proposal Material Paths

**Invocation Scenario**: {{SCENARIO}}  <!-- "easy-flow lock chain" / "standalone invocation" -->

**Review Targets (please read all)**:

{{PROPOSAL_MATERIALS_LIST}}
<!-- Example (easy-flow lock chain scenario):
- openspec/changes/add-auth/proposal.md
- openspec/changes/add-auth/design.md
- openspec/changes/add-auth/specs/auth.md
- openspec/changes/add-auth/specs/token-refresh.md
- openspec/changes/add-auth/tasks.md
-->

<!-- Example (standalone invocation scenario):
- docs/plans/2026-05-payment-redesign.md
- docs/plans/2026-05-payment-redesign-design.md
-->

---

## Issues Already Discovered by the Main Review

> Below are all findings the main review already identified in Sections 1-4.
> **Your job is NOT to repeat these**, but to find what they missed.
> Note: User final decisions for each finding are **not provided** — this is deliberate, to avoid anchoring you to user preferences.

### Section 1 Architecture Review

{{ARCHITECTURE_FINDINGS}}
<!-- Main skill fill example:
- [P1] design.md L23 — Rate-limiting approach doesn't consider cross-node synchronization
- [P2] design.md L67 — Service boundaries overly coupled with existing controllers/
-->

### Section 2 Code Quality Review

{{CODE_QUALITY_FINDINGS}}

### Section 3 Test Review

{{TEST_REVIEW_FINDINGS}}
<!-- Main skill fill example:
- Coverage diagram gaps: 8 items (2 E2E, 1 eval, 5 unit)
- Critical gap: processPayment() API timeout has no error handling (critical gap)
- Regression test needed: refundPayment() modified existing caller signature
-->

### Section 4 Performance Review

{{PERFORMANCE_FINDINGS}}

---

## Step 0 Scope Conclusion

{{SCOPE_DECISION}}
<!-- Main skill fill example:
- Scope accepted per original proposal (complexity threshold not triggered)
- or: Scope reduced per recommendation — deferred [item], reason: [one sentence]
-->

---

## Your Work Steps

1. Strictly execute per your system prompt (i.e., `cross-review-agent.md`) "Execution Flow"
2. Prioritize scanning for traces of the following five blind spot types in the proposal materials:
   - Logical Gaps: unstated assumptions, broken reasoning chains
   - Over-Complexity: is there a simpler approach
   - Feasibility Risks: can things the main review assumes achievable actually be done
   - Dependency/Ordering Issues: implicit dependencies between steps, circular dependencies
   - Strategic Misjudgment: should this thing really be built
3. Output markdown per the system prompt's "Output Format" — **must include both `CODE READING PLAN` and `CODE READING AUDIT` sections**
4. If you judge the main review has already covered all important issues, **directly output `NO-FINDINGS DECLARATION`** — do not fabricate

---

## Boundary Reminders

- ❌ Do not repeat issues the main review already found
- ❌ Do not do code review (review code quality, naming, implementation style)
- ❌ Do not suggest "how to write specific code" (you're reviewing the proposal, not writing code)
- ❌ Do not modify any files
- ❌ Do not call other skills / agents
- ✅ Find issues in the five blind spot types that the main review missed
- ✅ Strictly follow the six lines of defense (triggers / Code Reading Plan / traceability tags / Code Reading Audit / anti-laziness self-check)
- ✅ Output format strictly per system prompt's "Output Format"

Begin your review.
