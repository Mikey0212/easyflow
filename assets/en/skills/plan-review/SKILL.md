---
name: plan-review
description: "Must use this skill when user triggers /ezfl:lock, or requests engineering review / locking plan / review architecture / tech review, or describes a non-trivial change (>3 files, new components, cross-module changes) and is clearly in the pre-coding phase. Reviews plans/proposals from an engineering-manager perspective with adversarial rigor (architecture, data flow, edge cases, test coverage, performance), aiming to find holes rather than go through the motions. **Do NOT** use for: simple bug fixes / single-file changes / pure documentation or configuration changes / requesting 'review of already written code' (that's code review, not plan review)."
---

# Plan Eng Review

<HARD-GATE>
Forbidden to modify proposal materials (proposal.md / design.md / specs/ / tasks.md) — this skill only performs review, conclusions are written to review-report.md. When unresolved Critical / Important issues exist, forbidden to mark STATUS as DONE. Critical-tier changes forbidden to skip Outside Voice (cross-review-agent).
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: lock — using easy-flow:plan-review skill.`

## Overview

Engineering-manager-mode plan/proposal review skill. Before writing code, lock in architecture, data flow, test coverage, and performance. Aim to "find holes, not go through the motions", interacting with the user one question at a time to resolve each item. **Host-neutral** (subagent launch method distributed per host by `./references/host-adapters.md`); **configurable model** (the subagent model for cross-model review is declared by the user in `config.yaml: challenger.model`, not hardcoded in agent file frontmatter); **business workflow decoupled** — this skill only accepts "proposal material paths + output path" as input, with business concepts fulfilled by the caller (e.g., easy-flow lock chain) per `./references/caller-contract.md`.

## Configuration Loading

Upon entering the skill, first read the project root `config.yaml` (if missing, use all defaults from `config.example.yaml`, skip loading, and note "Using default configuration" at the top of the review report). Configurable items summary: `challenger.{enabled, model, prompt_mode, share_user_decisions}` / `scope_challenge.{max_files, max_new_services}`. Missing configuration **does not block**.

## Flow Overview

```
Read config → Step 0 Scope Challenge → Section 1-4 Sequential Review → Outside Voice → Required Output → Write review-report.md
```

What each phase does is in the corresponding policy file. This SKILL.md only carries the entry point, HARD-GATE anchors, and cross-phase hand-offs.

## Step 0: Scope Challenge

`read_file ./policies/scope-challenge.md` and execute per its rules: 6 sub-sections (existing code inventory / minimal change set / complexity check / search check / TODOS cross-reference / completeness check). If complexity hits the threshold (default 8+ files or 2+ new services) → proactively `ask_followup_question` proposing scope reduction, wait for user response before continuing; threshold not hit → directly enter Section 1.

**Key iron rule**: Once the user accepts/rejects scope reduction, **fully commit** — subsequent review sections must never re-raise reduction suggestions.

## Sections 1-4: Four-Section Review

`read_file ./policies/four-section-review.md` and execute the four sections in order: Architecture → Code Quality → Testing → Performance.

**STOP rule**: Within each section, "one question at a time" — each finding separately initiates one `ask_followup_question`, **no bundling** (see `./references/output-format.md` Section 3 for details). Only when all issues in this section have been decided by the user (one of A/B/C, or explicitly skipped) does the next section begin.

The full test review methodology (7-step method, E2E vs Unit decision matrix, regression test iron rules, ASCII coverage chart) is in `./references/test-review-methodology.md` — this is the heaviest section of this skill.

## Outside Voice — Independent Cross-Review

After the four-section review completes, **must first ask the user whether to enter cross-review**, and provide a recommendation based on the actual complexity of this change:

```
Ask via ask_followup_question:

🔍 Main review complete. Start Outside Voice independent cross-review?

Recommendation: <judged based on scope and task complexity in the OpenSpec four-piece set>
  - Multi-module/cross-layer architecture/high-risk interface changes/task count ≥5 → "Strongly recommended (large scope, high complexity)"
  - Single-module change/moderate task count → "Recommended (some complexity, cross-review helps discover blind spots)"
  - Pure config/docs/single-file minor change → "Skippable (change is simple, limited benefit from cross-review)"

A. Start cross-review
B. Skip, complete lock directly
```

User chooses B → mark `Outside Voice: skipped (user decision)` in review-report.md Completion Summary, jump to "Required Output" section.
User chooses A → continue with the launch flow below.

Launch an independent challenger via the host's native subagent mechanism, using a **different model** than the main review to perform a second review of the proposal materials. Detailed launch method, input construction, and credibility gate: first `read_file ./policies/outside-voice.md` and execute per its rules.

The challenger first `read_file ./references/host-adapters.md` and dispatches `cross-review-agent` directly via the host's native subagent mechanism per its rules (registered to the host agent directory by session-start, no selector choice needed).

### Behavior When Host Lacks Subagent Support

Directly skip the Outside Voice section, mark `Outside Voice: not run (host lacks subagent capability)` in review-report.md Completion Summary. **Inline fallback is no longer supported** — injecting a challenger prompt into the same context has been empirically proven unreliable; under the effectiveness-first principle, it's better not to run than to fake-run.

## Required Output

**Mandatory prerequisite**: Before writing review-report.md, must `read_file templates/review-report-template.md`, and output `[easy-flow lock] read_file templates/review-report-template.md`. **Forbidden** to write the report without reading the template.

First `read_file ./references/output-format.md`. After review completion, the following sections are mandatory (detailed format per its rules):

1. **NOT in scope** — explicit list of deferred work
2. **What already exists** — existing code inventory
3. **Failure modes** — failure mode table + critical gap list
4. **Worktree parallelization strategy** — only when multiple independent workflows exist, otherwise one sentence "Sequential implementation, no parallelization opportunity"
5. **Completion Summary** — review completion summary table
6. **STATUS** — one of four (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT)

**Unresolved Decisions**: When the user skips/interrupts/does not answer an `ask_followup_question`, **never silently default to any option**. List a separate "Unresolved Decisions" section at the end of Completion Summary.

**Escalation**: Task fails 3 attempts / security-sensitive uncertainty / scope exceeds verifiable capability → STOP and escalate, using STATUS: BLOCKED or NEEDS_CONTEXT format. **Bad work is worse than no work.** See `./references/output-format.md` Section 8 for details.

## Caller Contract

This skill is a general-purpose proposal reviewer, not bound to any specific workflow. The contract that callers (e.g., easy-flow lock chain) must fulfill (input path list / output report section order / modification constraints / Constitution Compliance appended by caller / STATUS hard gate signal) is in `./references/caller-contract.md`.
