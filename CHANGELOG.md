# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2025-06-19

### Added

- `easyflow update` command — check upstream tags and diff-update local skills
- `easyflow doctor` command — diagnose installation health
- `easyflow status` command — show active changes (multi-worktree aware)
- Support for 15 AI coding platforms (Claude Code, CodeBuddy, Cursor, Codex CLI, Gemini CLI, Windsurf, Cline, RooCode, GitHub Copilot, Trae, Lingma, Amazon Q, Augment CLI, Kiro, OpenCode)
- Bilingual skill support (`--lang zh` / `--lang en`)
- Non-interactive mode (`--yes`) for CI/CD environments

### Changed

- Improved platform auto-detection logic
- Updated Superpowers minimum version to 4.0.0
- Updated OpenSpec minimum version to 1.4.0

## [0.1.0] - 2025-05-01

### Added

- Initial release
- `easyflow init` command — install OpenSpec, Superpowers, and easy-flow skills
- Eight-phase workflow: design → propose → lock → build → audit → ship → reflect
- Constitution governance with four injection points
- Deterministic hook scripts
- Multi-worktree concurrency support
- Cross-model review (Outside Voice)
- Template forced loading
- Rebase merge strategy

[0.2.0]: https://github.com/Mikey0212/easyflow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Mikey0212/easyflow/releases/tag/v0.1.0
