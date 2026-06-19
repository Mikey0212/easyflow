# Constitution Create — Constitution Creation Flow

## Trigger Conditions

- `openspec/memory/constitution.md` does not exist
- Or file exists but still contains `[ALL_CAPS_PLACEHOLDER]`

## Flow

### 1. Introduce the Constitution Concept

Explain to the user:
- The constitution is the project's highest engineering principle
- It overrides specific changes
- Checks are injected at 4 phases: design/lock/build/audit

### 2. Guide User to Define Core Principles

Ask one by one:
- "What are the most important engineering principles for this project?"
- "Which principles are NON-NEGOTIABLE (absolutely cannot be violated)?"
- "Which principles are recommended but flexible?"

Suggest 3-5 principles (not too many).

### 3. Generate Using Template

**Mandatory prerequisite**: Must `read_file templates/constitution-template.md`, and output `[easy-flow constitution] read_file templates/constitution-template.md`. **Forbidden** to generate content without reading the template.

Fill in the user's answers based on the read template.

### 4. Confirm and Write

- Present the complete constitution for user confirmation
- Write to `openspec/memory/constitution.md`
- Set version to `1.0.0`
- Commit

### 5. Validate Validity

Run `constitution-validity.sh` to confirm exit 0.
