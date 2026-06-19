# Agent Directory Probe — Host-Neutral Agent Directory Discovery

## Probe Scope

easy-flow's agent-selector skill scans the following **project-level** directories to discover available subagents:

```
1. <main_repo_root>/.agents/                  ← Recommended location (host-neutral)
2. <main_repo_root>/.codebuddy/agents/        ← CodeBuddy project-level
3. <main_repo_root>/.claude/agents/           ← Claude Code project-level
```

All three directories are scanned, and results are merged with deduplication.

### `main_repo_root` Resolution

```bash
main_repo_root="$(git rev-parse --show-toplevel)"
```

`--show-toplevel` always returns an **absolute path**, works both in the main repo and inside a worktree. Inside a worktree it returns the worktree root (host directories like `.claude/` may not exist — this is expected; scanning empty produces a streamlined menu).

> **Do NOT use** `dirname "$(git rev-parse --git-common-dir)"` — it returns a relative path `.` in the main repo, and path joining depends on CWD correctness, proven unreliable in practice.

## Relationship with agent-selector

This document defines "where to find agents"; the `agent-selector` skill defines "how to recommend and select after finding" — scan all → selector recommends based on phase keywords → user chooses among three options (project-level agent / default subagent / inline) → main agent branches dispatch based on the three-state return value.

## Fallback

No candidates / user chooses D → main agent dispatches using host native subagent capability, without specifying an agent file (selector returns `"default-subagent"`).
No candidates / user chooses I / user cancels → main agent executes inline within its own session, does not dispatch any subagent (selector returns `"inline"`).

> Dispatch drivers (`superpowers:subagent-driven-development` / `:executing-plans`) are globally banned by HARD STOP H13 — see `hard-stops.md` for details.

**There are no longer any plugin built-in fallback agent files.**

## Host-Specific Notes

### CodeBuddy

- Project-level: `<main_repo_root>/.codebuddy/agents/`
- Global-level: `$HOME/.codebuddy/agents/` (Windows: `%USERPROFILE%\.codebuddy\agents\`)

### Claude Code

- Project-level: `<main_repo_root>/.claude/agents/`
- Global-level: `$HOME/.claude/agents/`

> **Note**: v1 only scans project-level. Global-level is not within the selector's scan scope and is only retained as host documentation reference.
