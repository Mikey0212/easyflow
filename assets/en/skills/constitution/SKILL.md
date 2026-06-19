---
name: constitution
description: "Must use this skill when user triggers /ezfl:constitution or /openspec:constitution, or requests creation / amendment / viewing of the project constitution. Manages CREATE / AMEND / SHOW modes for openspec/memory/constitution.md."
---

# constitution

<HARD-GATE>
Forbidden to modify constitution.md without entering explicit CREATE / AMEND mode (no silent editing). Forbidden to mark a Core Principle as (NON-NEGOTIABLE) without explicit user confirmation. The constitution drives downstream injection points A/B/C/D; any change propagates downstream.
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: constitution — using easy-flow:constitution skill.`

## Overview

Constitution management skill. Three modes: CREATE / AMEND / SHOW. Fully aligned with the openspec-integrated-superpowers constitution framework (no changes), only path migration and Law #4 hook upgrade.

## Three Modes

| Detection Condition | Mode |
|---------|------|
| constitution.md does not exist | CREATE |
| Exists but contains `[ALL_CAPS_PLACEHOLDER]` | CREATE |
| Exists without placeholders | AMEND |
| User passes `show` | SHOW |

## Policies

| Policy | File | Purpose |
|--------|------|------|
| CREATE | `./policies/constitution-create.md` | Guide user through filling in the template |
| AMEND | `./policies/constitution-amend.md` | Amendment flow + versioning + Sync Impact Report |
| Injection | `./policies/constitution-injection.md` | Specific logic for the four injection points (A/B/C/D) |

## Validity Determination (Law #4 upgraded to MACHINE_VERIFIED)

Script resides within the plugin, located via `.harness/.cache/.plugin_root` (written by SessionStart); if missing, treat as "does not exist" and prompt to restart session.

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
bash "$PLUGIN_ROOT/hooks/constitution-validity.sh"
# Exit codes: 0=valid / 1=invalid (contains unreplaced placeholders) / 2=does not exist
```

## Configuration

```toml
[constitution]
required = false  # when true, projects without a valid generated constitution block propose/apply
path = "openspec/memory/constitution.md"
```
