# Session-Level Cache Read/Write Protocol

## Cache File

- Path: `<repo>/.harness/.cache/agent-selection.json`
- Session ID file: `<repo>/.harness/.cache/sessions/$PPID.id`

## Read Flow (mandatory before each dispatch)

```
1. Read .harness/.cache/sessions/$PPID.id → current_session_id
   - File missing → generate temporary session_id, write to sessions/$PPID.id + output warning
     "⚠️ sessions/$PPID.id missing, generated temporary ID. Recommend restarting session for session-start hook to function normally."

2. Read .harness/.cache/agent-selection.json → cache
   - File missing / JSON unparseable → cache = empty object

3. Compare cache.session_id with current_session_id
   - Mismatch → cache treated as empty (cross-session invalidation)
   - Match → cache valid

4. Check cache.selections[dispatch_point_id]
   - Does not exist → enter full flow (scan + menu)
   - Exists and `remember=false` → **do not reuse**, enter full flow (single selection not cached across calls)
   - Exists and `remember=true` → validate agent field (three states)
     - agent is `"inline"` → return `"inline"` directly
     - agent is `"default-subagent"` → return `"default-subagent"` directly
     - agent is a path (string) and file exists → return that path
     - agent is a path but file does not exist → treat as "undecided", enter full flow
```

## Write Flow

```
Write timing: after user makes a selection in the menu, or after automatic decision for 0 candidates

1. Read existing cache (may already have selections for other dispatch points)
2. Set cache.session_id = current_session_id
3. Set cache.created_at = current ISO time
4. Set cache.selections[dispatch_point_id] = { agent: <path|null>, remember: <bool> }
5. Atomically write back .harness/.cache/agent-selection.json (full overwrite)
```

## Schema

```json
{
  "session_id": "2026-05-23T13:37:00-a1b2c3",
  "created_at": "2026-05-23T13:37:00+08:00",
  "selections": {
    "<dispatch_point_id>": {
      "agent": "<relative_path_or_null>",
      "remember": true
    }
  }
}
```

## Field Semantics

| Field | Type | Description |
|---|---|---|
| `session_id` | string | Corresponds to `sessions/$PPID.id` (or fallback `.session_id`) file content |
| `created_at` | string | ISO 8601 with timezone |
| `selections` | object | key = dispatch point ID |
| `selections[id].agent` | string | One of three states: `"inline"` (main agent inline execution) / `"default-subagent"` (main agent dispatches default subagent) / agent file path relative to repo root (forward slash) |
| `selections[id].remember` | boolean | true = do not ask again for this dispatch point this session |

## File Existence Check

When the `agent` field in cache is a string path (not the reserved values `"inline"` / `"default-subagent"`), must verify the file exists on disk:
- Exists → return path
- Does not exist → treat this dispatch point as "undecided", re-enter full flow

When `agent` is the reserved value `"inline"` or `"default-subagent"`, **do not perform file check**, return directly.

## Atomic Write

Use "write temp file → rename" pattern to avoid JSON corruption from mid-crash:
```bash
tmp="$cache_file.tmp.$$"
echo "$json" > "$tmp"
mv "$tmp" "$cache_file"
```
