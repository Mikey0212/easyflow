# Menu Presentation Specification

## Design Principles

The selector's menu **always** exposes only three types of options, never exposing internal "dispatch driver" implementation details:

1. **Project-level agents** (`.md` files found by scanning `.agents/` / `.codebuddy/agents/` / `.claude/agents/`) — Dispatched by the main agent via the host's native Task/AgentTool as a subagent.
2. **Default subagent** (`D`) — Main agent dispatches using the host's native subagent capability, without specifying an agent file, handled by host defaults.
3. **Inline execution** (`I`) — Main agent directly executes subsequent commands (e.g., `/opsx:apply`) in its own session, dispatching no subagent.

> **Menu text constraint**: User-visible menu options **must not** include words that expose internal implementation details such as "superpowers", "native dispatch", or "driver". The selector contract only recognizes the above three types of options (the global ban on dispatch drivers is in hard-stops.md H13).

## User Cancellation Handling

If the user enters a **character not listed in the menu** or cancels directly (empty enter / Esc / "/q"), it is treated as choosing `I` (inline execution) — the selector will return `"inline"`. **Do not ask, do not block**; record `agent: "inline", remember: false` in cache (single-use, do not write "don't ask again").

## Menu Structure

### When candidates ≥ 1 (Standard Menu)

```
🔍 Project agents detected (dispatch point: {dispatch_point_id} — {phase semantic name})

📌 Recommended (description matches current phase):
  1. {relative_path} — {description summary, truncated to 60 chars}
  2. {relative_path} — {description summary}

📎 General (does not match current phase keywords, but usable):
  3. {relative_path} — {description summary}

───────────────────
  D. Default subagent (clean context, custom agent selectable)
  I. Inline execution (fast, saves tokens)
  R. Stop asking for this dispatch point this session (use in combination, e.g., "1R" / "DR" / "IR")
```

Sorting rules:
- "Recommended" group: sorted alphabetically by path
- "General" group: sorted alphabetically by path
- "Recommended" group always appears before "General" group

### When candidates = 0 (Streamlined Menu)

> **"Candidates" = total number of all scanned .md files with descriptions (Recommended + General combined), not "keyword match count".** As long as one .md file is scanned and has a description, candidates ≥ 1, and the standard menu should be presented (that file goes into the "General" group).

When scan results are empty (whether "all three directories don't exist" or "directories exist but no usable `.md` / none matched"), always present a menu for the user to explicitly choose between D / I. **Forbidden** to silently take any branch:

```
🔍 No project agents matched (dispatch point: {dispatch_point_id} — {name})
   Scanned: .agents/  .codebuddy/agents/  .claude/agents/

───────────────────
  D. Default subagent (clean context, custom agent selectable)
  I. Inline execution (fast, saves tokens)
  R. Stop asking for this dispatch point this session (e.g., "DR" / "IR")
```

> When all three scan directories do not exist on the filesystem, an additional line can be appended above the menu: `ℹ️ No project agent directories found (.agents / .codebuddy/agents / .claude/agents all absent). Choose between D / I.` — but **the menu must still be presented**; returning `"inline"` directly without a menu is forbidden.

## Phase Semantic Name Mapping

| Dispatch Point ID | Name |
|---|---|
| `design.brainstorm` | Requirements Exploration |
| `lock.plan-review` | Engineering Review |
| `build.implementer` | Implementation (execute /opsx:apply) |
| `audit.scorer-driver` | Audit Driver |

## Skipped File Warning

If files without descriptions were skipped during scanning, append at the bottom of the menu:

```
⚠️ Skipped {N} file(s) without a description field
```

## Option Semantics Reference (for caller interpreting return values)

| User Input | Selector Returns | Caller Should Execute |
|---|---|---|
| Number (e.g., `1`/`2R`) | agent file relative path (string) | Main agent uses host native Task tool, dispatches with that path as subagent_path |
| `D` / `DR` | `"default-subagent"` | Main agent dispatches using host native subagent capability, without specifying an agent file |
| `I` / `IR` / empty enter / unrecognized input | `"inline"` | Main agent executes subsequent commands inline within its own session, no dispatch |
