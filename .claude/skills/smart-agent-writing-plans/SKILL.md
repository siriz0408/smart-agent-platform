---
name: smart-agent-writing-plans
description: Create detailed implementation plans with task breakdowns, file lists, testing strategies, and acceptance criteria
---

# Writing Plans

**When to Use:** Create detailed implementation plans with task breakdowns, file lists, testing strategies, and acceptance criteria. Use after brainstorming/design phase and before implementation.

## Purpose

Structure complex features into actionable tasks with clear deliverables, dependencies, and success metrics.

## Plan Structure

### 1. Context and Goals
- What problem are we solving?
- What's the expected outcome?
- Who is affected?
- What's the scope (in/out)?

### 2. Technical Approach
- High-level architecture
- Key decisions and rationale
- Dependencies/prerequisites
- Risk assessment

### 3. File Changes

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | src/components/NewFeature.tsx | Main component |
| Modify | src/App.tsx | Add route |
| Create | src/hooks/useNewFeature.ts | Feature hook |
| Modify | supabase/migrations/... | Database changes |

### 4. Task Breakdown

```markdown
## Tasks

### Phase 1: Database Setup
- [ ] Task 1.1: Create migration for new table
- [ ] Task 1.2: Add RLS policies
- [ ] Task 1.3: Test database layer

### Phase 2: Backend
- [ ] Task 2.1: Create edge function
- [ ] Task 2.2: Add API types
- [ ] Task 2.3: Write integration tests

### Phase 3: Frontend
- [ ] Task 3.1: Create UI components
- [ ] Task 3.2: Wire up data fetching
- [ ] Task 3.3: Add loading/error states
- [ ] Task 3.4: Implement responsive design

### Phase 4: Testing & Polish
- [ ] Task 4.1: Write unit tests
- [ ] Task 4.2: Mobile testing
- [ ] Task 4.3: Accessibility audit
```

### 5. Testing Strategy
- Unit tests: What to test, coverage target
- Integration tests: Critical flows
- E2E tests: User journeys to verify
- Manual testing: Edge cases, mobile

### 6. Acceptance Criteria
- [ ] Feature works as specified
- [ ] Tests pass (unit, integration)
- [ ] Accessible (keyboard, screen reader)
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Performance acceptable (Lighthouse >90)
- [ ] No TypeScript errors
- [ ] Code reviewed

### 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API rate limits | Medium | High | Implement caching |
| Complex edge cases | High | Medium | Start with happy path, iterate |

## Example Plan Template

```markdown
# Feature: [Feature Name]

## Goal
[One sentence describing the outcome]

## Background
[Why this feature, what problem it solves]

## Scope
**In scope:**
- Item 1
- Item 2

**Out of scope:**
- Item 1
- Item 2

## Technical Approach
[High-level description of implementation]

## File Changes
| Action | Path | Description |
|--------|------|-------------|
| ... | ... | ... |

## Tasks
[Broken into phases with checkboxes]

## Testing Strategy
[What to test and how]

## Acceptance Criteria
[Definition of done]

## Timeline
[Estimated phases/milestones - no specific times]

## Risks
[What could go wrong and how to handle it]
```

## Tips

- Keep tasks small (2-4 hours max)
- Order tasks by dependency
- Identify blockers early
- Include rollback plan for risky changes
- Reference existing patterns in codebase
- Link to related PRD sections

**Example:** See `.lovable/plan.md` and `TASK_BOARD.md` for actual plans used in Smart Agent development.
