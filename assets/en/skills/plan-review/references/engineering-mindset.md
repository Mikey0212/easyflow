# Engineering Manager Cognitive Patterns & Review Preferences

This document is the core methodology reference for the plan-review skill, used as a thinking framework during the review process.

## I. Engineering Preferences (Review Scoring Criteria)

The following preferences are used to justify "why recommend A" when giving recommended approaches in ask_followup_question. Each recommendation must map to one preference.

1. **DRY Strictness First** — Flag duplicate code exceeding 3 lines immediately. Reuse beats rewrite.
2. **Testing is Non-Negotiable** — Better to over-test than under-test. Regression testing is an iron rule.
3. **Engineered Enough** — Neither under-engineered (fragile, hacky) nor over-engineered (premature abstraction, unnecessary complexity).
4. **Thick Edge-Case Handling** — Prefer handling more edge cases, not fewer. Deliberation > Speed.
5. **Explicit Over Clever** — Explicit code > implicit magic. Read time > Write time.
6. **Minimal Diff But Not Rigid** — Prefer minimal changes to express the change, but if the existing foundation is broken, say "tear it down" directly. Don't compress necessary rewrites into minimal patches.

## II. 15 Engineering Manager Cognitive Patterns

These are not additional check items, but **pattern recognition instincts** formed over years by experienced engineering leads — the gap between "having read the code" and "having found the landmine." Apply these patterns throughout the review process.

1. **State Diagnosis** — Teams exist in four states: falling behind, treading water, paying debt, innovating. Each requires different intervention (Larson, An Elegant Puzzle).

2. **Blast Radius Intuition** — Every decision is evaluated by "what's the worst case? How many systems/people are affected?"

3. **Boring-by-Default First** — "Every company gets about 3 innovation tokens." Everything else should use proven technology (McKinley, Choose Boring Technology).

4. **Incremental Over Revolutionary** — Strangler Fig pattern over Big Bang. Canary over Full Rollout. Refactor over Rewrite (Fowler).

5. **System Over Hero** — Design for the tired engineer at 3 AM, not the best engineer at their best.

6. **Reversibility Preference** — Feature flags, A/B tests, gradual rollout. Make "wrong decisions" cheap.

7. **Failure Is Information** — Blameless postmortems, error budgets, chaos engineering. Incidents are learning opportunities, not accountability events (Allspaw, Google SRE).

8. **Org Structure Is Architecture** — Conway's Law. Both architecture and organization need deliberate design (Skelton/Pais, Team Topologies).

9. **DX Is Product Quality** — Slow CI, poor local dev, painful deployment → worse software, higher churn. Developer experience is a leading indicator.

10. **Essential vs. Accidental Complexity** — Before adding anything, ask: "Is this solving a real problem, or a problem we created?" (Brooks, No Silver Bullet).

11. **Two-Week Sniff Test** — If a qualified engineer can't deliver a small feature in two weeks, there's an "onboarding problem disguised as an architecture problem."

12. **Glue Work Awareness** — Recognize invisible coordination work. Value it, but don't let anyone only do glue work (Reilly, The Staff Engineer's Path).

13. **Make the Change Easy, Then Make the Easy Change** — Refactor first, then implement. Never make structural and behavioral changes simultaneously (Beck).

14. **You Own What Goes to Production** — No wall between dev and ops. "The DevOps movement is ending because there's only one kind of engineer left: the one who writes code and is responsible for production" (Majors).

15. **Error Budgets Over Availability Targets** — SLO 99.9% = 0.1% downtime **budget can be spent on releases**. Reliability is a resource allocation problem (Google SRE).

### Application Mapping

| Review Phase | Primary Cognitive Patterns Applied |
|---------|------------------|
| Architecture Review | #3 Boring-by-Default, #10 Essential vs. Accidental Complexity |
| Complexity Audit | #11 Two-Week Sniff, #13 Make the Change Easy |
| Failure Mode Analysis | #2 Blast Radius, #5 System Over Hero, #7 Failure Is Information |
| Deploy/Release Strategy | #4 Incremental Over Revolutionary, #6 Reversibility, #15 Error Budgets |
| Test Strategy | #5 System Over Hero, #7 Failure Is Information |

Whenever reviewing introduces new infrastructure or new approaches, always check: "Is this spending an innovation token? Is this token well spent?"

## III. ASCII Diagram Documentation Philosophy

### Where to Use

Actively use ASCII diagrams in the following locations:

- **Data Flow Diagrams** — Data passing across services/components
- **State Machines** — State transitions, state guards
- **Dependency Graphs** — Module/service/package dependencies
- **Processing Pipelines** — Multi-step processing, worker chains
- **Decision Trees** — Business rule branching, routing decisions

### Embedding Locations

For particularly complex designs, embed ASCII diagrams in code comments:

- **Models** — Data relationships, state transitions
- **Controllers** — Request flow
- **Concerns / Mixins** — Mixed-in behavior
- **Services** — Multi-step processing pipelines
- **Tests** — When test structure is non-obvious, explain what is being set up and why

### Maintenance Rules (Iron Rule)

**Diagram maintenance is part of the change.** When modifying code near ASCII diagram comments, must review whether the diagram is still accurate. Update the diagram in the same commit.

**A stale diagram is worse than no diagram — it actively misleads readers.**

During review, flag any stale diagram encountered, even if outside the scope of this change.
