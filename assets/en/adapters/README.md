# Adapters — Host-Neutral Adaptation Guide

The easy-flow plugin is designed to be host-neutral, running on both **Claude Code / claude-internal** and **CodeBuddy**. This directory houses documentation and implementation guidance for the differences between the two hosts.

## Files

| File | Description |
|------|-------------|
| `agent-directory-probe.md` | Guide for probing the subagent directory location on different hosts |
| `command-registration.md` | Differences in command registration mechanisms between hosts |
| `hook-registration.md` | Differences in hook registration mechanisms between hosts |

## Design Principles

- **Commands and skills are host-agnostic**: The actual command and skill definitions (under `commands/` and `skills/`) are written in a host-independent manner. Differences are isolated to registries and manifests.
- **Hooks are self-adaptive**: Hook scripts (under `hooks/`) detect the host at runtime and adapt paths accordingly.
- **Manifest files are host-specific**: `.claude-plugin/` and `.codebuddy-plugin/` each maintain their own manifest, but the `plugin.json` root file provides host-neutral metadata.
