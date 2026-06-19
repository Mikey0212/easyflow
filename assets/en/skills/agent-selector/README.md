# agent-selector — Integration Guide

## Audience

This document is intended for easy-flow internal skill developers, explaining how to integrate agent-selector into dispatch-point skills.

## Integration Steps

### 1. Determine the dispatch point ID

Check `policies/description-keyword-rules.md` to confirm your dispatch point is registered. If not, add it to that file and design doc §4 first.

### 2. Insert the selector call before dispatch

In your SKILL.md, before the main agent dispatches a subagent via the host's native Task / AgentTool, add the following instructions:

```markdown
### Agent Selection (before dispatch)

Before executing the next subagent dispatch, call the `easy-flow:agent-selector` skill:
- Pass `dispatch_point_id` = `<your dispatch point ID>`
- Based on the return value (one of three states), decide:
  - Returns agent file path (string) → Main agent uses host native Task tool, dispatches with that path as `subagent_path`
  - Returns `"default-subagent"` → Main agent dispatches using host native subagent capability, without specifying an agent file
  - Returns `"inline"` → Main agent executes inline within its own session, does not dispatch a subagent
```

### 3. Pass selector return value to host adapter

The selector return value is one of three states. The caller branches as follows:

| Return Value | Caller Action |
|---|---|
| agent file path (string) | **CodeBuddy**: pass this path to Task tool's `subagent_path` parameter; **Claude Code**: follow the corresponding section in `references/host-adapters.md` |
| `"default-subagent"` | Main agent dispatches using host native subagent capability, without specifying `subagent_path` |
| `"inline"` or host has no subagent capability | Main agent executes subsequent commands inline within its own session, does not dispatch any subagent |

### Example (build.implementer)

```markdown
### Before Dispatch: Agent Selection

Call easy-flow:agent-selector, dispatch_point_id = `build.implementer`.

Branch based on the three return states:
- agent path (string) → Main agent uses host native Task tool, dispatches with that path as subagent_path
- `"default-subagent"` → Main agent dispatches using host native subagent capability, without specifying an agent file
- `"inline"` → Main agent executes /opsx:apply inline within its own session, does not dispatch a subagent
```

> Dispatch paths other than the three states (such as superpowers dispatch drivers) are prohibited by HARD STOP H13 — see `hard-stops.md` for details.

## Cache Behavior

The selector re-reads the cache from disk (`.harness/.cache/agent-selection.json`) on every invocation.

- First invocation: presents a menu for the user to choose
- Subsequent invocations (same dispatch point, same session): silently reuses cache
- User selects "don't ask again" → menu is not shown again for that dispatch point within the entire session
- New session → session_id changes → cache invalidated → menu shown again

## Related Documents

- SKILL.md: complete flow definition
- policies/description-keyword-rules.md: keyword matching table
- policies/session-memory-protocol.md: cache read/write protocol
- policies/menu-presentation.md: menu format specification
