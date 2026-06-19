# Command Registration — Host-Neutral Command Registration

## Overview

easy-flow's `/ezfl:*` and `/openspec:*` commands must be registered in the host to be triggered. Registration methods differ per host.

## Host Registration Methods

### CodeBuddy

**Auto-registration**: CodeBuddy auto-registers via the `command_prefixes` field in `plugin.json`.

```json
{
  "command_prefixes": ["ezfl"]
}
```

Command files are placed under the `commands/` directory, and the host discovers them automatically.

### Claude Code

**Manual configuration**: Declare in the project's `CLAUDE.md` or global configuration:

```markdown
## Commands

- `/ezfl:*` commands available via easy-flow plugin
- Each `/ezfl:<verb>` command runs independently, loading the corresponding `<verb>` skill (no unified orchestrator)
```

## Degradation Paths

| Host Capability | Command Prefix | Invocation Method |
|---------|---------|---------|
| Full plugin support | `/ezfl:*` available | User directly inputs commands |
| Skill loading only | Not available | `use_skill("easy-flow:<name>")` |
| No skill support | Not available | easy-flow unavailable |
