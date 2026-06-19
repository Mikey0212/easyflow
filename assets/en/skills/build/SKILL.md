---
name: build
description: "Must use this skill when user triggers /ezfl:build or requests implementation / execution of tasks.md. Selects implementer subagent, which executes /opsx:apply in its own session — main agent is forbidden from directly writing implementation code."
---

# build

<HARD-GATE>
Forbidden for the main agent to directly write implementation code in its own session. Forbidden to invoke /opsx:apply before Step 1 (Agent Selection via easy-flow:agent-selector) is complete. /opsx:apply must be executed by the implementer subagent, not the main agent; the subagent launch prompt must inject Constitution C constraints.
</HARD-GATE>

**Must output on startup**: `[easy-flow] entering phase: build — using easy-flow:build skill.`

## Observed Hard Stops

This skill observes the following from `hard-stops.md`:
- **H8** (status line output): Each Step entry outputs visible status lines like `[easy-flow] entering build Step <N>: <action>`
- **H10** (agent-selector prerequisite): Step 1 must first call `easy-flow:agent-selector`; must not skip Agent Selection before launching the implementer subagent
- **H13** (disable superpowers dispatch drivers): When Step 1 returns `"inline"`, the main agent must run `/opsx:apply` inline, never falling back to `superpowers:subagent-driven-development` / `:executing-plans`

## Flow

Execute **step by step** in order. Do not proceed to the next step until the current one is complete:

### Step 0: Locate change_id

Read `.harness/workflow.yaml: active_changes`, filter for entries with `phase=build`:
- **Single match**: use its `change_id`
- **Multiple matches**: use `ask_followup_question` for user selection
- **Zero matches**: block, prompt "No active change found in design phase, please run /ezfl:design first"

### Step 1: Agent Selection — implementer (mandatory, must not skip)

**[Hard constraint]** Before launching the implementer subagent, **must** first:

1. `use_skill("easy-flow:agent-selector")`
2. Input `dispatch_point_id = "build.implementer"`
3. Wait for return of one of three states (see selector SKILL.md "Output" section):
   - **agent file path (string)** — user selected a project-level agent from scan results
   - **`"default-subagent"`** — user chose D, main agent dispatches using host native subagent capability, no agent file specified
   - **`"inline"`** — user chose I or cancelled, main agent executes inline in its own session, no subagent dispatch

The return value is used for this build's implementer dispatch (see Step 2):

- Returns agent path → main agent dispatches via host native Task / AgentTool with that path as `subagent_path`
- Returns `"default-subagent"` → main agent dispatches using host native subagent capability, no agent file specified
- Returns `"inline"` → main agent executes `/opsx:apply` inline (injection point C is the main agent's responsibility)
- Host has no subagent capability → **forced fallback to `"inline"`**: skip Step 2 subagent launch, main agent directly executes `/opsx:apply`

Skip self-check: If about to launch implementer / invoke `/opsx:apply` / dispatch implementation subagent / main agent directly writes code and Step 1 is not complete, immediately stop and output `[easy-flow] BLOCK: Before launching implementer / invoking /opsx:apply in build phase, must first call easy-flow:agent-selector (dispatch_point_id=build.implementer). Agent Selection must not be skipped.` then return to Step 1.

### Step 2: Branch on selector three-state to execute `/opsx:apply`

**Assemble launch prompt**: `read_file $PLUGIN_ROOT/skills/build/assets/implementer-prompt.md` to get the prompt template text (three sections: task / Constitution injection point C / return contract). Replace the `<change_id or omitted>` placeholder in the template with the Step 0 location result; keep other `<N.M>` / `<...>` placeholders as-is (they are self-filled by the subagent at runtime).

Branch on Step 1 return value into three paths:

#### 2.A — Returns agent file path (string)

Main agent dispatches subagent via host native Task / AgentTool:
- `subagent_path` = agent path returned from Step 1
- `prompt` = assembled launch prompt from above

Main agent **must not intervene** during subagent execution, only receives the final report.

#### 2.B — Returns `"default-subagent"`

Main agent dispatches subagent via host native Task / AgentTool, **without specifying `subagent_path`** (handled by host default subagent):
- `prompt` = assembled launch prompt from above

Main agent **must not intervene** during subagent execution, only receives the final report.

#### 2.C — Returns `"inline"` (main agent inline execution)

Main agent executes within its own session — no subagent dispatched:
1. First output the applicable Constitution principle list for this build (injection point C inline form);
2. Invoke `/opsx:apply [<change_id>]`, wait for completion;
3. Within apply, before each task implementation, the main agent outputs `[Constitution C] Task <N.M>: applicable principles = ...` (injection point C mandatory clause, main agent bears responsibility).

### Step 3: Exit Verification

After `/opsx:apply` returns (or subagent returns its report), verify:

1. All tasks in `tasks.md` have checkboxes checked (`- [x]`) — **any `- [ ]` means incomplete**
2. apply output includes `Implementation Complete` summary
3. Main agent did not directly write implementation code (violating Step 1 skip self-check means flow failure)

**Hard block (any condition not met → forbidden to mark build.status=completed)**:

- Verification 1 fails (has `- [ ]`) → **block**, output `[easy-flow] BLOCK: tasks.md has incomplete tasks, forbidden to mark build as complete.` + list uncompleted task numbers, wait for user instruction (continue implementation / manually mark / abandon)
- Verification 2 fails (apply paused/errored) → **block**, present pause reason and options, wait for user instruction
- Verification 3 fails → **block**, flow considered failed
- **All pass** → commit worktree changes and mark complete:

```bash
cd "$WORKTREE_PATH"
git add -A && git commit -m "feat($change_id): implementation complete"
```

Write `build.status: completed` to state.yaml, output `[easy-flow] build complete, next step recommendation: run /ezfl:audit`

## Constitution Injection Point C

- Implementer subagent (2.A / 2.B path) outputs `[Constitution C] Task <N.M>: applicable principles = ...` before each task execution
- Main agent injects this constraint as a mandatory clause into the subagent launch prompt during Step 2 assembly
- When taking 2.C (main agent inline), the main agent outputs the principle list for this build once in inline form before executing apply, and supplements `[Constitution C] Task <N.M>: ...` before each task
