# Host Adapter Guide

This document explains how to launch the `cross-review-agent` subagent on different hosts. **Must read** the corresponding host chapter in this document before launching the challenger in the Outside Voice section.

> **Important**: This skill requires the host to **support subagent dispatch capability**. Hosts without subagent support **directly skip** the Outside Voice section and mark "cross-review not run (host lacks subagent capability)" in the report — **inline fallback is no longer supported** (injecting challenger prompt into the same context has been empirically proven unreliable; under the effectiveness-first principle, it's better not to run than to fake-run).

## General Convention

Regardless of the host, when launching the challenger the main skill must complete 3 things:

1. **Determine model name**: Read from `config.yaml: challenger.model`. Empty = use host default model.
2. **Prepare prompt context**: Fill the main review summary using `../prompts/main-review-summary.tmpl.md`; the subagent uses `cross-review-agent.md`.
3. **Validate output**: After the subagent completes, check `CODE READING PLAN` / `CODE READING AUDIT` / traceability tags and other structural requirements per SKILL.md "Finding Credibility Gate".

### Launch Method

```text
task(
  subagent_name="cross-review-agent",
  subagent_path="<skill root>/agents/cross-review-agent.md",
  description="Independent cross-review of proposal materials",
  prompt="<content after filling prompts/main-review-summary.tmpl.md>",
  mode="<config.yaml: challenger.model value>"  # if non-empty
)
```

### Key Points

- If `config.challenger.model` is empty, omit the `mode` parameter; CodeBuddy uses the host default model
- After the subagent completes, get the review markdown from the returned final message

### Claude Code Launch

```text
Task(
  subagent_type="cross-review-agent",   # session-start already copied to .claude/agents/, dispatched by registered name
  description="Independent cross-review of proposal materials",
  prompt="<content after filling prompts/main-review-summary.tmpl.md>"
)
```

### Model

The model is determined by the `model:` field in `cross-review-agent.md` frontmatter: session-start injects per `config.yaml: challenger.model`, injecting `inherit` if empty (reusing the main conversation model). Under `inherit`, cross-model independence is limited — if cross-vendor independence is needed, explicitly specify a different model in config, or manually run once with Codex / Gemini CLI.

## Other Compatible Hosts (General Pattern)

If the host supports "open a child context + pass prompt + wait for markdown return" capability (regardless of whether the API is named task / agent / spawn / subprocess), follow these steps:

1. Read the body of `../agents/cross-review-agent.md` as the system prompt
2. Use the filled `../prompts/main-review-summary.tmpl.md` as the user prompt
3. If the host API supports a model parameter, pass the `config.challenger.model` value
4. Wait for the child context to complete, get the markdown output
5. Validate the output per SKILL.md "Finding Credibility Gate"

## Hosts Without Subagent Support: Skip Outside Voice

If the host **completely does not support** subagent / child task mechanisms:

1. **Directly skip** the Outside Voice section
2. **Explicitly annotate** in review-report.md's Completion Summary: `Outside Voice: not run (host lacks subagent capability)`
3. Do not ask the user, do not retry, do not degrade to inline — this is a design choice, not a bug

## Failure Handling

Regardless of host, subagent launch failures follow this path:

| Failure Type | Action |
|---------|------|
| Subagent does not exist (agent file unreadable) | Report "agent file missing", let user check skill installation; no degradation — this is a skill-internal issue |
| Model unavailable (config-specified model not supported by host) | Ask user: switch model / use host default / skip challenger |
| Subagent output malformed (missing CODE READING PLAN / AUDIT) | Per "Finding Credibility Gate" rules, the entire challenger output is voided; record "skipped" in report |
| Subagent timeout (host has time limit) | Ask user: retry / skip |

Any failure/skip is **explicitly recorded in review-report.md's Completion Summary**, so the user clearly knows: whether Outside Voice was actually run, what model was used, and how the quality was.
