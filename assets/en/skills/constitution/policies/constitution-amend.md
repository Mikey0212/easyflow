# Constitution Amend — Constitution Amendment Flow

## Trigger Conditions

- `openspec/memory/constitution.md` exists and has no placeholders
- User requests constitution modification

## Version Number Decisions

| Modification Type | Version Change |
|---------|-----------|
| Add new Principle | MINOR +1 |
| Modify Principle wording (same semantics) | PATCH +1 |
| Modify Principle semantics | MAJOR +1 |
| Delete Principle | MAJOR +1 |
| Change NON-NEGOTIABLE flag | MAJOR +1 |

## Flow

### 1. Display Current Constitution

Output the current version in full.

### 2. Confirm Modification Intent

- "Which Principle do you want to modify?"
- "Are you modifying wording, semantics, or adding/removing?"

### 3. Generate Sync Impact Report

```markdown
## Sync Impact Report

**Modification Summary**: {{SUMMARY}}
**Version Change**: {{OLD}} → {{NEW}}
**Affected Scope**:
- [ ] Constitution Alignment section in design.md needs update
- [ ] Whether changes that have passed audit need re-audit
- [ ] Other affected documents
```

### 4. Execute After User Confirmation

- Update constitution.md
- Update version number and Last Amended date
- Commit

### 5. Validate Validity

Run `constitution-validity.sh` to confirm exit 0.
