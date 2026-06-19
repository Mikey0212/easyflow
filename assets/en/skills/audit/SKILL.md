---
name: audit
description: "Must use this skill when user triggers /ezfl:audit or requests auditing of implementation outputs. Executes Constitution compliance check (injection point D) + 5 scorer scripts, results written to .harness/metrics/<timestamp>-metrics.json."
---

# audit

<HARD-GATE>
Forbidden to skip any of the 5 scorer scripts. In team mode, when scorers detect blocking violations, forbidden to mark audit as passed. Forbidden to enter ship before audit results are written to `.harness/metrics/<timestamp>-metrics.json` (directory format, one new file per audit).
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: audit — using easy-flow:audit skill.`

## Overview

Audit skill. Two-step audit workflow: Constitution Compliance Audit + Scorer Evaluation.

**Metrics Storage Convention** (spanning audit / reflect / scorer):
- Directory: `.harness/metrics/` (**current working directory's** `.harness/` — if inside a worktree, it's the worktree's metrics; the ship phase merges back to the main repo)
- Filename: `<timestamp>-metrics.json`, each audit writes a new file, **never overwrite** history
- `<timestamp>` recommended format: `YYYYMMDD-HHMMSS` (UTC, e.g. `20260525-074800`)
- **JSON top-level must contain `change_id` field** (since v0.3.7): used by reflect for per-change attribution; if the same worktree runs audits for A→B changes sequentially, they can be distinguished by change_id
- **Stable contract**: `.harness/metrics/` is the **sole storage location** (no longer copied to archive). reflect aggregates global trends via glob; single change traceability uses the `change_id` field inside the JSON to filter from the top level. **Forbidden to treat top-level metrics as redundant and clean them up** — this would break reflect's global view
- The reflect skill aggregates all history by glob-ing the main repo's `.harness/metrics/*-metrics.json` (worktree metrics only enter reflect's view after the ship phase merges them back to the main repo)
- Individual scorers also get the latest result via `ls -t .harness/metrics/*-metrics.json | head -1`

**State Writing Convention**:
- Single change archive: `.harness/changes/<change_id>/state.yaml` (under worktree path if in a worktree)
- After audit completion, write `audit.*` section (`constitution_valid` / `overall_score` / `scorer_results` / `blocked`)
Read `.harness/workflow.yaml: active_changes`, filter for entries with `phase=audit`:
- **Single match**: use its `change_id`
- **Multiple matches**: use `ask_followup_question` for user selection
- **Zero matches**: block, prompt "No active change found in audit phase, please run /ezfl:design first"

## Step 1: Constitution Compliance Audit (Injection Point D)

Scripts reside within the plugin, located via `.harness/.cache/.plugin_root` (written by SessionStart); if missing or not executable, prompt the user to restart the session to trigger a rewrite.

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
bash "$PLUGIN_ROOT/hooks/constitution-validity.sh"   # 0=valid / 1=invalid / 2=does not exist
```

Post-determination:
- Valid: check each Core Principle — NON-NEGOTIABLE violations are Critical, others are Important; if violations exist, halt and present user with three options
- Invalid: decide warn or block based on `constitution_required` config

## Step 2: Scorer Evaluation

The 5 scorer scripts also reside within the plugin (`$PLUGIN_ROOT/scorers/`), each outputting 0-100 score + reason:

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
for s in audit-violation-rate constitution-violation-count test-coverage-scorer complexity-scorer doc-sync-scorer; do
  bash "$PLUGIN_ROOT/scorers/$s.sh"
done
```

Each script outputs one JSON line to stdout: `{"scorer":"<name>","score":<0-100>,"reason":"<text>"}`.

**Aggregation Write Convention**:
- Directory: `mkdir -p .harness/metrics`
- File: `.harness/metrics/<timestamp>-metrics.json` (`<timestamp>` using `date -u +%Y%m%d-%H%M%S`)
- `change_id` taken from single match result (shared resolution logic with SKILL.md "State Writing Convention" section); if resolution fails (e.g. trivial path has no entry), fill `""`, reflect buckets as "unattributed"
- `overall_score` is **weighted aggregation** (see "Overall Score Weighted Aggregation" below)
- Single file structure (array form for direct traversal by reflect; nested `audit` section retained for `audit-violation-rate.sh` reuse next time):

```json
{
  "timestamp": "20260525-074800",
  "change_id": "refactor-sdk-api-0701c0",
  "mode": "solo",
  "audit": {
    "violations": 0,
    "total_checks": 12
  },
  "overall_score": 90,
  "scorers": [
    {"scorer":"audit-violation-rate","score":100,"reason":"no known violations"},
    {"scorer":"constitution-violation-count","score":100,"reason":"..."},
    {"scorer":"test-coverage","score":85,"reason":"line coverage 85% (source=istanbul:coverage/coverage-summary.json)"},
    {"scorer":"complexity","score":78,"reason":"..."},
    {"scorer":"doc-sync","score":92,"reason":"..."}
  ]
}
```

> `audit.violations` = cumulative Critical+Important violations from Step 1; `audit.total_checks` = total Core Principles + sub-checks checked in this audit (fill 1 if no clear denominator). `audit-violation-rate.sh` reads the latest metrics to calculate violation rate.

## Overall Score Weighted Aggregation

The 5 scorer scores are aggregated into `overall_score` via weighted average, used for `thresholds.solo.warn_below` / `thresholds.team.block_below` threshold determination, while also written to `metrics JSON` top-level and `state.yaml: audit.overall_score`.

**Formula**:

```
overall_score = round( Σ(score_i × w_i) / Σ(w_i) )
```

Where `w_i` is taken from `.harness/harness.toml: [scorer.weights]` for the corresponding scorer name; **unconfigured / missing / entire [scorer.weights] section absent** → all default to `1.0` (equal-weight average, behavior identical to before this feature was introduced).

**Special Semantics**:
- `w_i = 0` → scorer completely excluded from overall_score (its score still written to `scorers[]` for traceability, but not in calculation)
- `Σ(w_i) = 0` (theoretical extreme: all weights zero) → overall_score is 0, reason notes "all scorer weights are 0"
- Negative weight → treated as config error, that item handled as 1.0 with stderr warning

## Mode Dispatch

- solo: low score (< `thresholds.solo.warn_below`) only warns
- team: low score (< `thresholds.team.block_below`) blocks, requires override

## Policy

| Policy | File | Purpose |
|--------|------|------|
| Constitution Audit | `./policies/constitution-audit.md` | Detailed audit rules |
