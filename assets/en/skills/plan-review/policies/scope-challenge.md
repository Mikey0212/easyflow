# Step 0: Scope Challenge

> Called by `plan-review` SKILL.md at the review entry point. **Before reviewing anything**, answer the following 6 questions. This is the "foundation" of the review — skipping it would cause Sections 1-4 to lose focus.

## 0.1 Existing Code Inventory

What existing code already partially or fully addresses each sub-problem? Can you capture the output of existing flows instead of building parallel flows?

→ Output goes into the final report's "What already exists" chapter (see `../references/output-format.md` Section 4.2).

## 0.2 Minimal Change Set

What is the **minimal change set** to achieve the stated goal? Flag any work that can be deferred without blocking core objectives. **Be rigorous about scope creep.**

## 0.3 Complexity Check (Key Thresholds)

If the plan meets any of the following, treat as a **complexity smell** and must challenge (thresholds controlled by `config.scope_challenge.max_files` / `max_new_services`, defaults below):

- Touches **8+ files**
- Introduces **2+ new classes/new services**

→ Proactively recommend scope reduction via `ask_followup_question`:

- Explain what is being over-engineered
- Propose the minimal version that achieves the core goal
- Ask the user whether to reduce scope or continue with the original plan

**Key iron rule**: Once the user accepts/rejects scope reduction, **fully commit** — never re-raise reduction suggestions in subsequent review sections, never silently reduce scope, never skip planned components.

## 0.4 Search Check

For each architectural pattern, infrastructure component, and concurrency approach introduced in the plan:

- Does the runtime/framework have a built-in solution? Try using the host's internet search capability to query: `"{framework} {pattern} built-in"`
- What are the current best practices? Query: `"{pattern} best practice {current year}"`
- Are there known footguns? Query: `"{framework} {pattern} pitfalls"`

If the host does not provide internet search capability, skip this item and record in the report: "Internet search unavailable — continuing with built-in knowledge."

If the plan reinvents something the framework already provides, flag as a scope reduction opportunity.

## 0.5 TODOS Cross-Reference

Read the project root's `TODOS.md` (if it exists). Check:

- Are there legacy items blocking this plan?
- Can legacy items be **piggybacked** into this PR without expanding scope?
- Does this plan generate new work that should be recorded as TODOs?

## 0.6 Completeness Check (Completeness Principle)

**This is the core application of the Boil-the-Lake Principle.**

See `../references/output-format.md` Section 3 "ask_followup_question Format Constraints" for the "Completeness Score" and "Efficiency Reference Table". In short:

- AI assistance makes "complete solutions" nearly free (15 minutes vs. 1 human week)
- Default to recommending options with Completeness ≥8
- If the plan proposes a shortcut that saves "person-hours" but under AI assistance only saves "minutes", must recommend the complete version

## Trigger Result Branching

- **Complexity check hit** → Proactively `ask_followup_question` proposing scope reduction, wait for user response before continuing to Section 1
- **Complexity check not hit** → Display the above 6 findings in table form, then directly enter Section 1
