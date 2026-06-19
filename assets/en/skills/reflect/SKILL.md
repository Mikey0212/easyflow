---
name: reflect
description: "Must use this skill when user triggers /ezfl:reflect or requests viewing metrics / overrides / improvement suggestions. Aggregates .harness/metrics/ and .harness/overrides.log, outputs a retrospective report."
---

# reflect

<HARD-GATE>
Forbidden to fabricate metric data or skip the .harness/metrics aggregation step. If no metric data exists (audit has never been run), must explicitly inform the user. Forbidden to generate empty reports or fabricated content.
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: reflect — using easy-flow:reflect skill.`

## Overview

Metrics retrospective skill. Aggregates historical data under `.harness/metrics/`, analyzes trends, generates improvement suggestions.

## Trigger Modes

- `/ezfl:reflect` — outputs current project metrics overview
- `/ezfl:reflect monthly` — outputs monthly retrospective report

## Data Sources

1. `.harness/metrics/*-metrics.json` — scorer results from each audit (**global aggregation view**: includes history merged back from worktrees during the ship phase; cross-change trend analysis directly uses glob). **Stable contract**: this path is the sole data source for reflect's global view; metrics copies under the archive subdirectory are only for "per-change_id lookback", **must not be treated as redundant and cleaned from the top-level directory** — otherwise cross-change trend analysis is broken. Each metrics JSON top-level carries a `change_id` field (since v0.3.7); reflect can bucket by change attribution; missing or empty string is treated as "unattributed", displayed in its own bucket
2. `.harness/overrides.log` — all override records (team mode; includes worktree override appends merged back during ship)
3. `.harness/workflow.yaml` — global workflow cursor (`active_changes` lists changes not yet shipped, each with phase / worktree_path / started_at)
4. `.harness/changes/<change_id>/state.yaml` — in-progress change business archive (design→audit phase artifacts)
5. `.harness/archive/<change_id>/` — complete snapshots of shipped changes (optional traceback entry):
   - `state.yaml` — the change's design→ship final-state archive
   - `metrics/*-metrics.json` — copies of metrics produced during the change
   - `overrides.log` — override slices produced during the change
   - `pre_design.md` — design phase output (including worktree revisions)

> Cross-change trend analysis still uses data source 1 (top-level `metrics/`), no need to traverse `archive/*`; archive is only for "per-change_id lookback at a single change".

## Output Content

1. **Scorer Trends**: Historical score curves for each scorer (last N runs)
2. **Override Analysis**: Frequency, reason distribution, whether there are repeated violations
3. **Constitution Compliance**: Violation count and distribution
4. **Improvement Suggestions**: 2-3 actionable suggestions based on low-score items and frequent violations
5. **Team Health** (team mode): Block frequency, response time

## Constraints

- Metrics calculations are `[MACHINE_VERIFIED]`
- Improvement suggestions are `[LLM_SELF_CHECK]`
