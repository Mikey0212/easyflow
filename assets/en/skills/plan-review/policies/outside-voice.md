# Outside Voice — Independent Cross-Review

> Called by `plan-review` SKILL.md after Sections 1-4 complete. Agent Selection hard constraints, skip self-checks, and HARD-GATE anchors remain in SKILL.md; this document carries mechanical execution details: launch method, input construction, credibility gate, and user sovereignty handling.

## Core Positioning

**Outside Voice reviews "proposal materials", not code.**

Definition of "Proposal Materials":

- **easy-flow lock chain scenario**: The four-piece set under `openspec/changes/<name>/` (`proposal.md` + `design.md` + `specs/` + `tasks.md`)
- **Standalone invocation scenario**: The full collection of plan documents passed in by the user

The `cross-review-agent`'s responsibility is to perform an independent second review of "proposal materials," not code review. Reading code is only for **verifying references or assumptions in the proposal materials**, not for reviewing the code itself.

## Launch Method (Host-Neutral)

This skill does not assume a specific host's subagent API. When launching the challenger:

1. Based on the current host, execute per the corresponding section in `../references/host-adapters.md`
2. The subagent uses `cross-review-agent.md`;

**When the host lacks subagent support**: Directly skip the Outside Voice section, mark `Outside Voice: not run (host lacks subagent capability)` in the review report's Completion Summary. **Inline fallback is no longer supported** — injecting a challenger prompt into the same context has been empirically proven unreliable; under the effectiveness-first principle, it's better not to run than to fake-run.

## Input Fed to Challenger

Fill in the following content per the `../prompts/main-review-summary.tmpl.md` template (note: **do not** feed the user's A/B/C choices for each finding to the challenger; see the header comment in `../prompts/main-review-summary.tmpl.md` for rationale):

1. Proposal material path list
2. List of findings already discovered by the main review (remove user decisions, keep only discovery content and severity)
3. Challenger behavior constraints (six lines of defense, full text in `../agents/cross-review-agent.md`)

If `config.challenger.share_user_decisions: true` (not recommended), attach user decisions — but the report must explicitly note "challenger independence sacrificed".

## User Sovereignty Iron Rule

**Outside Voice findings are informational only. Even cross-model consensus does not automatically adopt them into the plan.**

For each Outside Voice finding, if there is tension with the main review (i.e., the two review conclusions conflict), you must:

1. Mark it as `CROSS-MODEL TENSION` in the report
2. Separately initiate one `ask_followup_question`, presenting both reviews' respective positions
3. Give a recommendation (explain which side is more convincing and why)
4. **Wait for explicit user approval** before updating review-report or tasks.md

Even if you and the cross-review-agent both agree on a modification, **do not auto-apply it**. Cross-model agreement is a strong signal, not a permission to act.

## Finding Credibility Gate

After receiving the cross-review-agent's output, before adopting, perform the following checks (any item fails → that finding is voided, not entered into review-report):

1. Does the output contain a `CODE READING PLAN` section?
2. Does the output contain a `CODE READING AUDIT` section?
3. Does each finding carry a traceability tag (`[proposal-only]` / `[verified-by-code]` / `[verified-by-search]`)?
4. Do `[verified-by-code]` tagged findings list file paths + line numbers?
5. Do `[verified-by-search]` tagged findings list query/path + hit/miss result?
6. Is the fallback search count ≤3?

If the subagent output violates any of the above, **do not adopt it just to "look complete"** — directly record in the main review report: "Outside Voice output does not meet defense line requirements, skipped." And inform the user per the user sovereignty iron rule.

## When to Skip

**Outside Voice asks the user by default; AI must not self-determine to skip.** Skipping is only allowed under:

- `config.challenger.enabled: false` or `config.challenger.prompt_mode: never`
- User explicitly chooses skip in `ask_followup_question`
- User explicitly enters "skip review" / "skip outside voice" etc. skip commands in conversation
- Host lacks subagent support (handled per "Launch Method" section, auto-skip with annotation)

**AI may suggest but not decide**: If AI judges the proposal scope is small (e.g., single bug fix, single-file change, single API endpoint), it may explain the rationale in the `ask_followup_question` recommendation and suggest skipping, but **must wait for explicit user choice before skipping**. AI self-determination to directly skip is forbidden.
