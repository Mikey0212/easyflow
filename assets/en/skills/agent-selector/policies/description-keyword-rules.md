# Dispatch Point → Keyword Mapping Rules

## Matching Algorithm

For each candidate agent file, read its frontmatter `description` field (plain text scan for `description: ` line, no YAML parser dependency), and perform **case-insensitive substring matching** against the keyword list for the current dispatch point in the table below.

- Match ≥1 keyword → classified as "Recommended" group
- No match → classified as "General" group
- Match keywords from multiple dispatch points = recommended in menus for multiple dispatch points

## Keyword Table

| Dispatch Point ID | Keywords (`|` separated, any match triggers recommendation) |
|---|---|
| `design.brainstorm` | brainstorm \| requirement \| discovery \| exploration \| design |
| `lock.plan-review` | review \| engineering \| plan \| spec \| inspection |
| `build.implementer` | implementer \| apply \| implement \| implementation |
| `audit.scorer-driver` | audit \| quality \| scorer \| metric \| compliance |

## Maintenance Rules

- When adding a new dispatch point, a new row must be added to this table
- Keyword changes must be synced with the design doc §4
- Keywords should be based on common description terms used in the agent community
