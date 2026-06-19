# Reframe Check — Reframing Candidates

## Core Principle

Before presenting specific design proposals to the user, must first check whether "the user's original ask" is truly the problem to solve. Reframe is a **problem-layer** re-slicing, not an implementation-layer multi-choice.

> ⚠️ This file contains two sections in fixed order:
> - **Section 1: Reframe Candidate** (problem-layer reframing)
> - **Section 2: Design Decision Options** (implementation-layer multi-option comparison)
>
> Must do Section 1 first, then Section 2. They solve different kinds of problems: Reframe asks "is there another problem to solve", Options asks "which path to implement the confirmed problem".

---

## 1. Reframe Candidate Output Format (Problem Layer)

### 1.1 When Reframe Can Be Skipped (Sole Determination Gate)

Only when **all** of the following are met may AI skip the Reframe candidate and explicitly state "The current requirement framing is sufficiently clear; no Reframe needed":

- User has self-explained context / problem boundaries / affected population
- All specific follow-up questions in brainstorming have received specific answers (**no vague replies**)
- No smaller or larger reasonable alternative slice exists compared to the current framing

Otherwise, **must** output at least 1 Reframe candidate and wait for user to choose among A/B/C.

### 1.2 Output Template

```
🔍 Reframe Candidate — Is this a different problem?

[Original Problem] <Restate user's original ask in 1 sentence, using noun phrases, no verb forms like "do/implement">
     ↓ I suspect the real problem to solve is ↓
[Deeper Problem] <Re-sliced problem, can be larger / smaller / different layer / different role>

Conversation evidence supporting this Reframe (1-3 items, must quote user's exact words):
  · "<user quote fragment 1>"
  · "<user quote fragment 2>"
  · "<user quote fragment 3> (if available)"

If this Reframe hits, the difference in approach (one sentence):
  Original direction → <verb phrase of user's original approach>
  New direction → <verb phrase under Reframe>

Please reply with one of:
  ✅  Hit — continue designing per new problem
  ✏️  Partially correct, needs supplement: <please directly write the supplement>
  ❌  No reframe needed, continue per original ask
```

### 1.3 User Selection Handling

| Choice | Subsequent Action |
|------|---------|
| ✅ Hit | Use Reframe understanding as subsequent design starting point |
| ✏️ Partially correct | Merge user's supplement into Reframe, re-present Reframe candidate for user confirmation (**max 2 rounds**) |
| ❌ No reframe needed | Keep original framing, record "User rejected Reframe" |

> If user reply doesn't use the above symbols but semantics are clear (e.g., "right", "that's what I mean" → ✅; "roughly right but X needs change" → ✏️; "no, use original" → ❌), handle per corresponding branch. If semantics are unclear, must re-present template and let user explicitly choose among three options; subjective judgment is forbidden.

### 1.4 Phase Artifact

The Reframe phase must record one "Reframe Journey" line in `pre_design.md`, e.g.:
- `Original ask X → User accepted Reframe as Y`, or
- `User rejected Reframe, keeping original framing X`

---

## 2. Design Decision Options Output Format (Implementation Layer)

### 2.1 Trigger Rules

Each **implementation-layer decision point** must provide at least 2-3 alternatives with their respective trade-offs. **Single-option direct advancement is forbidden.**

Skip conditions (any one met allows skipping Options):
- User explicitly says "don't give me alternatives, just use this one"
- The decision point has been thoroughly discussed with specific option comparison in prior conversation
- Purely mechanical operation with no design decision (e.g., "create directory")

### 2.2 Output Template

```markdown
### Option A: {{NAME}} (Recommended / Not Recommended)
- Pros: …
- Cons: …
- Applicable Scenarios: …

### Option B: {{NAME}}
- Pros: …
- Cons: …
- Applicable Scenarios: …

### Option C: {{NAME}} (if applicable)
- Pros: …
- Cons: …
- Applicable Scenarios: …

### Recommended Choice: Option X, because {{REASON}}
```

### 2.3 Hand-off to Premise Challenge

Eliminated options and their rejection reasons will be written to the `## Alternatives` section of `pre_design.md` after the Premise Challenge completes.
