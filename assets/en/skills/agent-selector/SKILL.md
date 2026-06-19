---
name: agent-selector
description: "Scans project-level agent directories before subagent dispatch, recommends based on phase keywords, lets user choose, and persists results to disk for anti-corruption"
---

# agent-selector

## Caller Contract (Mandatory Path)

**Any dispatch-point skill must first call `use_skill("easy-flow:agent-selector")` and wait for the return before performing any subagent dispatch action.**

"Dispatch actions" include but are not limited to:

- Directly dispatching a subagent via the host's native Task / AgentTool
- Any action that "hands work off to another LLM context"

> **Global Ban (HARD STOP H13)**: Any skill is **forbidden** from invoking `superpowers:subagent-driven-development` and `superpowers:executing-plans` — these two dispatch drivers. All subagent dispatch is uniformly performed by the main agent using the host's native Task / AgentTool. The selector only decides one of three semantics: "which agent file to use / default subagent / inline no dispatch".
>
> Note: `superpowers:brainstorming`, `superpowers:test-driven-development` and other passive methodology skills are **not covered by the ban** — they do not dispatch subagents, only provide checklists and guidance to the main agent or subagent, and may continue to be used.

**Forbidden** for the main agent to skip this step thinking "the requirement is clear, the selector is unnecessary" — this would deprive the user of visibility and control over subagent selection.

### Currently Registered Dispatch Points

| dispatch_point_id | Caller Skill | Purpose |
|---|---|---|
| `design.brainstorm` | `design` | brainstorming subagent |
| `lock.plan-review` | `plan-review` | main review subagent |
| `build.implementer` | `build` | implementer subagent executing `/opsx:apply` (selected once, reused throughout) |
| `audit.scorer-driver` | `audit` (if applicable) | audit driver subagent |

### Skip Self-Check (violation halts)

If a dispatch-point skill is about to perform a dispatch action and this skill has not yet been called, it **must** immediately halt and output:

> "[easy-flow] BLOCK: Dispatch point `<dispatch_point_id>` must first call easy-flow:agent-selector. Agent Selection must not be skipped."

Then return to the Agent Selection step, complete it, and continue the dispatch.

## Invocation Method

Called as an inline instruction by the dispatch-point skill. The dispatch point passes `dispatch_point_id` (e.g. `build.implementer`), and the selector returns a conclusion.

**Key Constraint**: Before each dispatch, must re-read the cache from disk — relying on the main agent's in-memory "last selection result" is forbidden.

## Input

| Parameter | Type | Description |
|---|---|---|
| `dispatch_point_id` | string | Dispatch point identifier (first `read_file ./policies/description-keyword-rules.md`) |

## Output

| Return Value | Meaning | Caller Action |
|---|---|---|
| agent file path (string, relative to repo root) | User selected a project-level agent from scan results | Main agent uses host native Task / AgentTool, dispatches subagent with this path as `subagent_path` |
| `"default-subagent"` | User chose D — no agent file specified | Main agent dispatches using host native subagent capability, handled by host defaults |
| `"inline"` | User chose I or cancelled / unrecognized input | Main agent executes subsequent commands inline within its own session, does not dispatch any subagent |

> **`null` is not a valid return value.** It is forbidden to return any value without presenting a menu via `ask_followup_question` and receiving user input. The selector must present a menu, wait for user selection, then return one of the three states.

## Full Flow

```
[1] Read disk: .harness/.cache/sessions/$PPID.id → current_session_id
    - File missing → generate temporary session_id, write to sessions/$PPID.id + output warning

[2] Read disk: .harness/.cache/agent-selection.json → cache
    - File missing / JSON unparseable → cache = empty

[3] Compare cache.session_id with current_session_id
    - Mismatch → cache treated as empty
    - Match → check cache.selections[dispatch_point_id]
      - Exists and remember=true → verify agent file existence (if agent is a path) → return directly
      - Exists but remember=false → **do not reuse**, enter full flow (single selection not cached across calls)
      - Does not exist → continue

[4] Scan project-level agent directories:

    [4.0] Determine scan root main_repo_root (**absolute path, main repo first**):

        ```bash
        main_repo_root="$(git rev-parse --show-toplevel)"
        ```

        `--show-toplevel` always returns an absolute path. Inside a worktree it returns the worktree root (host directories like `.claude/` may not exist — this is expected; scanning empty produces a streamlined menu).
        **Do NOT use** `dirname "$(git rev-parse --git-common-dir)"` — it returns relative path `.` in the main repo, requiring correct CWD.

    [4.1] Scan the following three directories (based on main_repo_root, not current CWD):
        - <main_repo_root>/.agents/
        - <main_repo_root>/.codebuddy/agents/
        - <main_repo_root>/.claude/agents/
        All three directories are scanned, results merged with deduplication. Skip files without a frontmatter description field.

    Design rationale: agent definitions are **project-level shared configuration**. Multiple worktrees (i.e., multiple feature branches) should share the same agent definitions from the main repo. Host directories like .claude/ and .codebuddy/ are typically not committed, and git worktree does not copy these untracked directories to new worktrees, causing empty scan results inside worktrees.

[5] `read_file ./policies/description-keyword-rules.md` and match by dispatch_point_id keywords
    - Keywords matched → classified as "Recommended" group
    - No match → classified as "General" group
    - **Total candidates = Recommended + General** (i.e., all scanned .md files with descriptions, not just keyword-matched count)

[6] `read_file ./policies/menu-presentation.md` and present menu accordingly — **forbidden to skip, forbidden to return without presenting menu**
    - Candidates ≥ 1 (any .md file scanned, whether keyword-matched or not) → present standard menu (Recommended + General + D + I + R), wait for user choice
    - Candidates = 0 (all three directories empty / no .md / no descriptions) → present streamlined menu (only D + I + R)
    - **Both cases must present menu via ask_followup_question and wait for user input before returning**
    - Unrecognized input / empty enter / cancel → treated as I, return `"inline"`

[7] `read_file ./policies/session-memory-protocol.md` and write back cache accordingly

[8] Return one of three states: agent path (string) / `"default-subagent"` / `"inline"`
```

## Scan Directories (project-level only)

```
<main_repo_root>/.agents/
<main_repo_root>/.codebuddy/agents/
<main_repo_root>/.claude/agents/
```

`main_repo_root` resolution: `main_repo_root="$(git rev-parse --show-toplevel)"` (absolute path). See `read_file adapters/agent-directory-probe.md` for details.

Scan logic: List all `*.md` files in the directory, read the first 5 lines of each file looking for a `description:` line (plain text scan, no YAML parser dependency).

## Policies

| Policy | Path | Responsibility |
|---|---|---|
| Keyword Rules | `./policies/description-keyword-rules.md` | Dispatch point → keyword mapping table |
| Cache Protocol | `./policies/session-memory-protocol.md` | Full rules for read/write/invalidation/fallback |
| Menu Presentation | `./policies/menu-presentation.md` | Copy, ordering, and option specifications |
