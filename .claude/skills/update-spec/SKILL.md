---
name: update-spec
description: Use when implementing new features during conversation that weren't in the original spec. Requires updating the specification document before or alongside code changes.
---

# Update Specification

## Overview

**Any new feature discovered during development must be documented in the spec.**

**Core principle:** If it's not in the spec, it doesn't exist. Update spec first, then implement.

## When to Use

**Always:**
- User requests a feature not in original spec during conversation
- Discovering implied requirements while coding
- Changing scope or behavior from original plan
- Adding features "just mentioned" in passing

**Examples:**
- "Oh, also need a login button"
- "Can you make it support dark mode too?"
- "Actually, let's add sound effects"
- "This should work on mobile as well"

## The Iron Law

```
NO NEW FEATURES WITHOUT SPEC UPDATE
```

User mentions new feature? Stop. Update spec first.

**No exceptions:**
- Don't implement "just this one thing" quickly
- Don't "remember" to update spec later
- Don't add to TODO list in code
- Spec update means NOW, before implementation

## Workflow

### 1. PAUSE Implementation

When user mentions new feature:

```
USER: "Can you also add a timer?"
YOU: "I'll add the timer feature. First, let me update the spec to document this requirement."
```

### 2. Update SPEC Document

Find the spec file (SDD, SPEC.md, CLAUDE.md, etc.) and add:

```markdown
## New: Timer Feature

### Requirement
- Display countdown timer for player turns
- Default: 15 seconds per turn
- Visual warning at 5 seconds remaining

### Implementation Notes
- Add to GameState: `turnTimeRemaining`
- UI: Show timer above action buttons
- Sound: Optional tick at last 5 seconds

### Acceptance Criteria
- [ ] Timer displays correctly
- [ ] Auto-pass when time runs out
- [ ] Visual warning shows at 5s
```

### 3. CONFIRM with User

```
I've added the timer feature to the spec. Here's what I documented:

[Show spec excerpt]

Is this correct? Any adjustments before I implement?
```

### 4. IMPLEMENT

Only after spec is updated and confirmed.

## Why This Matters

| Without Spec Update | With Spec Update |
|---------------------|------------------|
| Forgotten requirements | Documented decisions |
| Scope creep unnoticed | Clear feature boundaries |
| "Wait, did we agree on that?" | Source of truth for reference |
| Technical debt | Maintainable project |
| Confusion in future sessions | Clear handoff to future Claude |

## Spec File Locations

| Project Type | Spec File |
|--------------|-----------|
| Web App | `docs/SPEC.md` or `SDD.md` |
| Game | `docs/GDD.md` or `SDD.md` |
| API | `docs/API_SPEC.md` |
| Small project | `CLAUDE.md` |
| Memory-based | `memory/*.md` |

## Red Flags

- "I'll just add this quickly"
- "It's obvious it should work this way"
- "I'll document it later"
- User mentions feature → you immediately start coding
- Multiple new features pile up without documentation

## Template for Spec Update

```markdown
## Feature: [Name]

**Source:** User request during [date/session]

### Requirements
- [Specific requirement 1]
- [Specific requirement 2]

### Technical Design
- [How it works]
- [Data structures]
- [UI changes]

### Acceptance Criteria
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]

### Notes
- [Any special considerations]
```

## Final Rule

```
New feature mentioned → Update spec → Confirm → Implement
Never: New feature mentioned → Implement → (Maybe) Update spec
```
