# Premise Challenge

## Core Principle

The design phase must proactively identify and challenge **unverified premises** in user descriptions. Premises ≠ facts, unless supported by evidence.

The purpose of the challenge is not to attack the user, but to make explicit the "assumptions treated as facts" so that the design can be adjusted promptly when any premise fails. **Tone must be collaborative; adversarial behavior is forbidden.**

---

## I. What is an "Unverified Premise"

Assumptions in user statements that are treated as facts but are not actually verified, for example:
- "Users won't do X" — how is this confirmed?
- "This API's performance is sufficient" — any benchmarks?
- "The existing system doesn't support Y" — verified?
- "This is the only approach" — have alternatives actually been searched?

---

## II. Premise Selection Rules

When extracting premises, you **must** cover at least 3 of the following types (full coverage not required):

| Type | Example |
|------|------|
| **Scope Premise** | "This change only covers the order main flow; cart and after-sales flows are out of scope" |
| **Dependency Premise** | "Assuming the upstream order center's `order_id` field won't change width or type within this quarter" |
| **Data/Scale Premise** | "Assuming daily new audit logs ≤ 500MB; storage plan needs reassessment if exceeding" |
| **User Behavior Premise** | "Assuming ops staff will check alert emails within 24h of import failure, rather than relying on ticket follow-ups" |
| **Tech Choice Premise** | "Assuming continued use of Redis 6.x for idempotency key storage, not introducing a KV database or external lock service" |
| **Priority Premise** | "Data consistency takes priority over write throughput; P99 latency increase from 50ms to 150ms is acceptable" |

Each premise **must satisfy**: single sentence, falsifiable, clear impact if invalid. **Forbidden** to write vacuous statements like "users will agree with X".

Extract **3-5** premises each time to present to the user.

---

## III. Output Format

```
🧩 Premise Challenge

Please confirm each premise below. Any one being invalid will change the design.

PREMISES:
1. <premise statement, single sentence, falsifiable> — agree / disagree / unsure
   Type: <Scope / Dependency / Data Scale / User Behavior / Tech Choice / Priority>
   Risk: <High / Low> (High = invalidity causes architecture rework; Low = limited impact)
   Basis: <where in the conversation this premise was derived from>
   Impact if invalid: <which part of the design would need to change>
   Verification method: <how to confirm this premise, e.g. benchmark / sampling survey / documentation review>

2. <premise statement> — agree / disagree / unsure
   ...

3. <premise statement> — agree / disagree / unsure
   ...
```

---

## IV. User Response Handling

| User Reply | Subsequent Action |
|---------|---------|
| All agree (or "confirm all") | Enter "complete proposal confirmation inquiry" phase |
| Any disagree | Return to discussion on that item: let user provide revised premise; after revision, **must** regenerate the Premise Challenge list (**max 3 rounds**) |
| Any unsure | AI must give specific follow-ups (concrete examples / boundary scenarios / verifiable criteria) to help user go from unsure → agree/disagree |
| Vague reply ("roughly"/"probably") | Treat as unsure, handle per previous row |

---

## V. Phase Artifact

All passed premises **must** be listed separately in `pre_design.md` as the `## Premises` section (before `## Decisions`), in this format:

```markdown
## Premises
<!-- Premises confirmed item-by-item with user before implementation; any one being invalid changes the design -->

1. <original premise text>
2. <original premise text>
3. <original premise text>
```

Premises rejected/modified by the user are written as a separate `## Premise History` section in `pre_design.md`, serving as an "assumption change log" reference for the lock phase review.

---

## VI. Sole Forbidden Behavior

**Forbidden to turn the challenge into an attack** — tone must be collaborative, addressing the issue, not the person.
