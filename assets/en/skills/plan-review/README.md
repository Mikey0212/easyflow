# plan-review

> Engineering-manager-mode plan/proposal review skill. Lock in **architecture, data flow, test coverage, and performance** before coding — with the goal of "finding holes, not going through the motions."

## Usage

| Trigger | Description |
|---|---|
| easy-flow lock chain | User runs `/ezfl:lock` → `commands/lock.md` adapter automatically `use_skill("easy-flow:plan-review")`, producing `openspec/changes/<name>/review-report.md` |
| Standalone invocation | User asks for "review architecture", "engineering review", "lock in the plan", "tech review", "plan engineering review" or similar keywords in conversation; user explicitly lists document paths to review |
| Proactive suggestion | When a non-trivial change is described (>3 files, new components, cross-module changes) and clearly in the pre-coding phase, this skill proactively suggests running |

See [`SKILL.md`](./SKILL.md) for the complete execution flow entry point.

## File Structure

```
plan-review/
├── SKILL.md                                    Main entry point (flow overview + HARD-GATE + Agent Selection)
├── README.md                                   This file
├── config.example.yaml                         Configuration template (defaults used if missing)
│
├── policies/                                   Detailed flow rules (called sequentially by SKILL.md)
│   ├── scope-challenge.md                      Step 0: Scope Challenge (6 sub-sections)
│   ├── four-section-review.md                  Sections 1-4: Architecture/Code/Test/Performance
│   └── outside-voice.md                        Outside Voice: Launch/Input/Gate/User Sovereignty
│
├── references/                                 Reference materials (consult as needed)
│   ├── caller-contract.md                      Caller input/output/modification constraint contract
│   ├── engineering-mindset.md                  Engineering preferences + 15 cognitive patterns
│   ├── test-review-methodology.md              Test review 7-step method details
│   ├── output-format.md                        Output style + required output format + Escalation
│   └── host-adapters.md                        Subagent launch methods per host
│
├── agents/
│   └── cross-review-agent.md                   Cross-review subagent used by Outside Voice
│
└── prompts/
    └── main-review-summary.tmpl.md             Input template fed to challenger
```

## Cross-Host Support

This skill **requires the host to support subagent dispatch capability** (CodeBuddy `task` / Claude Code `Task` / other compatible hosts).

Hosts without subagent support **directly skip** the Outside Voice section and mark `Outside Voice: not run (host lacks subagent capability)` in the report — **inline fallback is no longer supported** (injecting challenger prompt into the same context has been empirically proven unreliable; under the effectiveness-first principle, it's better not to run than to fake-run). See `references/host-adapters.md` for specific host adaptation.

## Configuration

Copy `config.example.yaml` to the project root as `config.yaml` to modify. If missing, all defaults are used, skip loading, and note "Using default configuration" at the top of the report.

Configurable items summary:

- `challenger.enabled` — whether to enable Outside Voice, default `true`
- `challenger.model` — model used by challenger subagent, empty = host default
- `challenger.prompt_mode` — `always_ask` (default) / `auto_run` / `never`
- `challenger.share_user_decisions` — whether to feed user decisions to challenger, default `false` (maximizes independence)
- `scope_challenge.max_files` — complexity threshold (file count), default `8`
- `scope_challenge.max_new_services` — complexity threshold (new classes/new services count), default `2`

See `config.example.yaml` comments for complete field definitions.
