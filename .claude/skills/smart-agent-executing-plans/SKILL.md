---
name: smart-agent-executing-plans
description: Execute implementation plans systematically with progress tracking, checkpoint validation, and quality gates
---

# Executing Plans

**When to Use:** Execute implementation plans systematically with progress tracking, checkpoint validation, and quality gates. Use when implementing features from a validated plan.

## Purpose

Ensure plans are followed methodically with validation at each milestone, preventing scope creep and ensuring quality.

## Execution Pattern

### 1. Pre-Flight Checks

Before starting:
- [ ] Plan is finalized and approved
- [ ] Dependencies are available
- [ ] Development environment ready
- [ ] No blocking issues from previous work
- [ ] Understand full scope of changes

### 2. Implementation Order

Follow task dependencies:
```
1. Database changes first (migrations)
2. Backend/API changes second
3. Frontend changes third
4. Tests alongside each layer
5. Integration testing last
```

### 3. Checkpoint Validation

After each phase:
- [ ] Run tests (`npm run test`)
- [ ] Run linter (`npm run lint`)
- [ ] Check TypeScript (`npx tsc --noEmit`)
- [ ] Manual smoke test
- [ ] Update plan status

### 4. Progress Tracking

Update plan as you work:
```markdown
## Tasks

### Phase 1: Database Setup
- [x] Task 1.1: Create migration for new table ✅ Completed 2026-01-29
- [x] Task 1.2: Add RLS policies ✅ Completed 2026-01-29
- [ ] Task 1.3: Test database layer 🔄 In progress

### Phase 2: Backend
- [ ] Task 2.1: Create edge function
```

### 5. Quality Gates

Before marking phase complete:

**Code Quality:**
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests passing
- [ ] Code self-documented or commented

**Functionality:**
- [ ] Happy path works
- [ ] Error cases handled
- [ ] Loading states present
- [ ] Edge cases considered

**UX:**
- [ ] Responsive design verified
- [ ] Touch targets adequate (mobile)
- [ ] Keyboard accessible
- [ ] Screen reader friendly

### 6. Deviation Handling

When requirements change mid-implementation:

1. **Stop and assess** - Don't continue with outdated plan
2. **Document deviation** - Note what changed and why
3. **Update plan** - Revise tasks/scope if needed
4. **Get approval** - Confirm with stakeholder if significant
5. **Continue** - Resume with updated plan

### 7. Completion Criteria

Before marking plan complete:
- [ ] All tasks checked off
- [ ] All tests passing
- [ ] No regressions introduced
- [ ] Documentation updated (if needed)
- [ ] Code reviewed (if required)
- [ ] Plan marked as complete

## Execution Commands

```bash
# Start work session
git checkout -b feature/your-feature
npm run dev  # Start dev server

# After each significant change
npm run lint
npm run test
git add -A && git commit -m "feat: description"

# End of phase
npm run build  # Verify production build
npm run test   # Full test suite

# Final validation
npm run lint && npm run test && npm run build
```

## Handling Blockers

When blocked:

1. **Document the blocker** - What's preventing progress?
2. **Assess impact** - Can other tasks proceed?
3. **Seek help** - Ask for clarification/assistance
4. **Work around** - If possible, skip and return later
5. **Update plan** - Note blocked status

## Tips

- Work in small, committable chunks
- Test frequently, not just at the end
- Don't skip quality gates "to save time"
- Keep plan updated as single source of truth
- Celebrate phase completions

## Anti-Patterns to Avoid

- ❌ Starting without reading full plan
- ❌ Skipping tests to "move faster"
- ❌ Making changes outside plan scope
- ❌ Not updating plan status
- ❌ Ignoring TypeScript/lint errors
- ❌ Marking tasks complete before validation
