---
name: design
description: "Must use this skill when user triggers /ezfl:design or requests entering the design phase. Only responsible for design discussion, Reframe, Premise Challenge, and producing pre_design.md."
---

# design

<HARD-GATE>
This skill is **only** responsible for landing user requirements into `pre_design.md` after a mandatory structured discussion.

- **Forbidden** to skip brainstorming forced interaction (≥3 exploratory questions + wait for user answers + cover ≥3 categories)
- **Forbidden** to skip Reframe Check (./policies/reframe-check.md)
- **Forbidden** to skip Premise Challenge (./policies/premise-challenge.md)
- **Forbidden** to mark this phase complete without receiving the user's **overall confirmation** of the **complete design proposal**
- **Forbidden** to generate `pre_design.md` without first `read_file templates/pre-design-template.md` (mandatory prerequisite for Step 4.1)
- **Forbidden** to use random slugs not based on the brainstorming summary — the slug part of `change_id` must be extracted by AI from the user's answers to exploratory questions (taking 2-3 core noun keywords), ensuring interpretability
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: design — using easy-flow:design skill.`

## State Layout

- During drafting: `.harness/changes/draft-<session_suffix>-<unix_ts>/state.yaml`
- After Step 4.4 finalization: `mv` to `.harness/changes/<change_id>/state.yaml`
- Synchronously maintain `.harness/workflow.yaml: active_changes` cursor entry (all writes go through `hooks/workflow-entry.sh`, see `./policies/workflow-lock.md`, HARD STOP H12).

---

## Flow (execute in order; do not proceed to next step until current is complete)

### Step 1: Prepare draft directory + workflow entry

**Single Bash invocation** (encapsulates draft creation / state.yaml write / workflow entry append):

```bash
PLUGIN_ROOT="$(cat <repo_root>/.harness/.cache/.plugin_root)"
INIT_RESULT=$(bash "$PLUGIN_ROOT/hooks/design-init.sh" "<repo_root>")
INIT_EXIT=$?
echo "INIT_EXIT=$INIT_EXIT INIT_RESULT=$INIT_RESULT"
```

**Output interpretation** (read `INIT_RESULT` JSON):

| `INIT_EXIT` | `status` Field | Meaning | Subsequent Action |
|------------|--------------|------|---------|
| 0 | `"ok"` | Success | Take `draft_name` value, enter Step 1.5 |
| 1 | `"existing"` | Unfinished draft exists | Use `ask_followup_question` to ask A/B/C (see below) |
| 2 | — (stderr) | Parameter/environment error | Block per H12 |
| 3 | — (stderr) | Workflow write failed | Block per H12 |

When `status="existing"`, the `existing` field contains a list of existing draft directories. **Must** use `ask_followup_question` to ask:
- **A. Resume latest**: `draft_name` is the last item in the list, jump to Step 2
- **B. Discard all**: For each dir, execute the following then re-call `design-init.sh`:
  ```bash
  for d in <existing list>; do
    rm -rf "<repo_root>/.harness/changes/$d"
    bash "$PLUGIN_ROOT/hooks/workflow-entry.sh" delete-active --skill design \
      --repo-root "<repo_root>" --where-change-id "$d"
  done
  ```
- **C. Cancel exit**: Exit

#### 1.5 Status Line Output (H8)

Output `[easy-flow] design draft: .harness/changes/<draft_name>/ ; workflow: appended entry phase=design`.

### Step 2: Load Constitution (Injection Point A)

Read `openspec/memory/constitution.md` (if it exists without placeholders).

### Step 3: Brainstorming Forced Interaction (Core Step)

#### 3.1 Design Discussion (Mandatory Hard Gate)

| Dimension | Minimum |
|------|------|
| Question count | **≥ 3** exploratory questions |
| Category coverage | **≥ 3 categories** (cannot spam same-category questions to reach count) |
| Question pattern source | `./policies/response-posture.md` Section 4 **Exploratory Question Patterns** (E1-E5) |
| Wait behavior | Must wait for user to answer **all** ≥3 questions before entering 3.2 |
| Vague answer handling | Push back per response-posture.md Section 2 **Pushback Patterns**, does **not** count toward question quota |

The entire sub-flow must first `read_file ./policies/response-posture.md` and execute per its behavior matrix, Pushback Patterns, and 6 pre-reply self-checks.

**3.1 Self-Check** (must pass before presenting proposals): Have ≥3 questions been asked, covering ≥3 categories, with concrete answers received? Not met → continue asking.

#### 3.2 Reframe Check

`read_file ./policies/reframe-check.md` and execute per its **Section 1**: if 3 skip conditions are met, skip; otherwise output 1 Reframe candidate, wait for user to choose ✅ / ✏️ / ❌ (✅ enter 3.3; ✏️ max 2 iteration rounds; ❌ keep original framing).

#### 3.3 Design Decision Options

`read_file ./policies/reframe-check.md` and execute per its **Section 2**: for each implementation-layer decision point, give 2-3 options + trade-offs, wait for user to choose A/B/C; unselected options + rejection reasons recorded for later writing to `## Alternatives` section.

#### 3.4 Premise Challenge

`read_file ./policies/premise-challenge.md` and execute accordingly: based on 3.1~3.3, extract 3-5 premises (covering ≥3 categories) → output list, wait for user to agree / disagree / unsure on each (disagree → regenerate list, max 3 rounds; unsure → ask specifically) → all agreed → enter Step 4.

### Step 4: Produce `pre_design.md` + Finalize change_id + User Overall Confirmation

#### 4.1 Write `pre_design.md` to Draft Directory

Write path: `<repo_root>/<draft_dir>/pre_design.md` (i.e., `.harness/changes/<draft_name>/pre_design.md`).

**Mandatory prerequisite**: Must `read_file templates/pre-design-template.md` before writing, and output `[easy-flow design] read_file templates/pre-design-template.md`. **Forbidden** to generate content without reading the template.

Content strictly follows the template's 9 fixed sections (Reframe Journey / Constitution Alignment / Premises / Premise History / Decisions / Alternatives / Task Scope / Open Questions / Downstream Constraints). Section content sources (3.2 / Step 2 / 3.4 / 3.3) are filled from the outputs of the corresponding phase steps; the first line `# Pre-Design: <change_id>` temporarily uses placeholder `<TBD>`, backfilled after 4.4 finalization.

#### 4.2 User Overall Confirmation of pre_design.md

Output preview to user and ask:

> This is the complete design proposal (including architecture, tech choices, task scope). Please review and confirm whether to proceed to the next phase.
>
> (Reply with "confirm / ok / agree" etc. for explicit overall confirmation; if you have feedback on a specific item, please point it out directly for revision)

Determination rules:

| User Reply | Determination | Subsequent Action |
|---------|------|---------|
| Explicit overall confirmation ("confirm/ok/agree" etc.) | Complete | Enter 4.3 |
| Feedback on a specific item/section only | **Not confirmation** | Revise the content then **re-run 4.2** |
| Vague reply ("roughly done", "seems ok") | **Not confirmation** | **Must explicitly ask again**: "This is the complete design proposal. Please confirm whether to proceed to the next phase?" |
| Silence / no reply | **Not confirmation** | Same as above |

**Forbidden** to treat any user's local "agreement" from 3.1~3.4 as overall confirmation.

#### 4.3 Generate change_id (AI Auto)

After overall confirmation, AI automatically extracts 2-3 core noun/verb keywords from the brainstorming "core problem statement" (the core action + target that emerged from the user's ≥3 question answers, **not** literal excerpts), kebab-case-joins them into a slug (regex `^[a-z][a-z0-9-]+$`, 10-25 chars), then assembles `change_id = "<slug>-<session_suffix>"` (final regex `^[a-z][a-z0-9-]+-[0-9a-f]{6}$`). Retry on validation failure; block after 3 attempts requiring manual intervention.

Auditable output:

```
[easy-flow] AI generated change_id: <change_id>
  slug source: <brainstorming keywords referenced during extraction, e.g. "refactor / sdk / api">
  session suffix: <session_suffix>
This identifier will serve as the unified name for worktree directory / git branch / OpenSpec change directory / change state.yaml.
To override, reply before /ezfl:propose is triggered: "rename to <new slug>". Otherwise, it cannot be modified after entering the next phase.
```

Does not block the flow; directly enters 4.4. If after 4.5 the user replies "rename to X" → replace slug with X and redo 4.4.

#### 4.4 Rename Draft → Formal Directory + Sync workflow.yaml

**Single Bash invocation** (encapsulates directory mv / state.yaml update / pre_design.md first-line backfill / workflow rename):

```bash
PLUGIN_ROOT="$(cat <repo_root>/.harness/.cache/.plugin_root)"
FINAL_RESULT=$(bash "$PLUGIN_ROOT/hooks/design-finalize.sh" "<repo_root>" "<draft_name>" "<change_id>")
FINAL_EXIT=$?
echo "FINAL_EXIT=$FINAL_EXIT FINAL_RESULT=$FINAL_RESULT"
```

| `FINAL_EXIT` | Meaning | Subsequent Action |
|---|---|---|
| 0 | Success | Enter 4.5 |
| 1 | Target directory already exists | Block per H12 |
| 2 | Parameter/environment error | Block per H12 |
| 3 | Workflow rename failed | Block per H12 |

#### 4.5 Output Completion Status Line

Output `[easy-flow] design phase complete: .harness/changes/<change_id>/pre_design.md locked; workflow entry change_id changed from <draft_name> to <change_id>.` and suggest next step `/ezfl:propose`.
