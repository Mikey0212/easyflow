# Hook Registration — Host-Neutral Hook Configuration

## Overview

easy-flow uses hooks to execute checks at key moments (such as SessionStart dependency version checks, constitution validity determination). Hook configuration methods differ per host.

## Hook Inventory

| Hook | Script | Trigger |
|------|---------|---------|
| SessionStart | `${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh` | New session starts |
| Constitution Validity | `$PLUGIN_ROOT/hooks/constitution-validity.sh` | design/lock/build/audit entry points |
| Scorers ×5 | `$PLUGIN_ROOT/scorers/*.sh` | audit Step 2 scoring |

> **Path Locating**: All hook/scorer scripts reside within the plugin, **not mirrored to `.harness/`**. SessionStart writes the current plugin absolute path to `.harness/.cache/.plugin_root`. Skills resolve it via `PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"` before invocation. If `.plugin_root` is missing at skill startup, prompt the user to restart the session to rewrite it.

## Host Configuration

### CodeBuddy

Supports `session_start` hook configuration:

```json
// .codebuddy-plugin/plugin.json
{
  "hooks": {
    "session_start": "hooks/session-start.sh"
  }
}
```

### Claude Code

Declare required checks in `CLAUDE.md`:

```markdown
## Session Start

Run: `bash <plugin-path>/hooks/session-start.sh`
```

### Hosts Without Hook Support

**Degrade to runtime detection**: Each command entry point invokes the corresponding check script itself.

```
command entry (/ezfl:*):
  if hook available → rely on host execution
  else → inline execution: bash hooks/session-start.sh
```

## Dual-Platform Scripts

Each hook provides two versions:
- `.sh` (POSIX bash, for macOS/Linux)
- `.cmd` (Windows batch, for Windows)

Automatically selected based on OS at runtime.
