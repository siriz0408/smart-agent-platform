# Post-Cycle QA Gate Process

> **Owner:** PM-QA  
> **Status:** ✅ Implemented  
> **Last Updated:** 2026-02-06

## Overview

The post-cycle QA gate is an automated process that runs after every PM development cycle to ensure code quality before merging to main. It identifies changed files, maps them to critical user flows, runs targeted E2E tests, and reports results.

## Process Flow

```
1. Identify files changed in the cycle (git diff)
   ↓
2. Map changed files to critical flows (using OWNERSHIP.md)
   ↓
3. Run targeted Playwright tests for affected flows
   ↓
4. Run full critical flow smoke test (P0 flows)
   ↓
5. Report results (PASS/WARN/FAIL)
```

## Usage

### Basic Usage

```bash
# Run QA gate against current branch vs main
npm run qa:gate

# Run against specific base branch
npm run qa:gate -- --base develop

# Test specific files
npm run qa:gate -- --files src/components/auth/Login.tsx src/pages/Contacts.tsx
```

### Integration with PM Orchestrator

The QA gate should be run automatically after each PM development cycle:

```bash
# After all PMs complete their work
npm run qa:gate

# If PASS: Merge approved
# If WARN: Merge with caution, review warnings
# If FAIL: Block merge, assign bugs to responsible PMs
```

## Critical Flows

The QA gate tests these critical flows (P0):

| Flow | Test File | Priority |
|------|-----------|----------|
| Login / Signup | `tests/e2e/auth.spec.ts` | P0 |
| Create contact | `tests/e2e/contacts.spec.ts` | P0 |
| Create deal | `tests/e2e/deals.spec.ts` | P0 |

Additional flows tested (P1):

| Flow | Test File | Priority |
|------|-----------|----------|
| Pipeline drag-and-drop | `tests/e2e/pipeline.spec.ts` | P1 |
| Property search and save | `tests/e2e/properties.spec.ts` | P1 |
| Admin console access | `tests/e2e/admin-agents-delete.spec.ts` | P1 |

## File-to-Flow Mapping

The QA gate automatically maps changed files to flows based on `OWNERSHIP.md`:

- `src/components/auth/**` → Login / Signup flow
- `src/components/contacts/**` → Create contact flow
- `src/components/deals/**` → Create deal flow
- `src/pages/Pipeline.tsx` → Create deal + Pipeline drag-and-drop flows
- `src/components/pipeline/**` → Pipeline drag-and-drop flow
- `src/components/properties/**` → Property search flow

## Report Status

### PASS ✅
- All tests passed
- No critical issues found
- **Action:** Merge approved

### WARN ⚠️
- Some tests skipped
- Non-critical issues found
- No affected flows detected (only config/docs changed)
- **Action:** Merge with caution, review warnings

### FAIL ❌
- Tests failed
- Critical flow broken
- **Action:** Block merge, assign bugs to responsible PMs

## Output

The QA gate produces:

1. **Console Report** - Real-time status and summary
2. **Test Results** - Playwright JSON results in `test-artifacts/playwright-results.json`
3. **Exit Code** - 0 for PASS/WARN, 1 for FAIL

## Example Output

```
🚪 PM-QA Post-Cycle QA Gate

📊 Base branch: main

📝 Changed files: 3
   - src/components/contacts/ContactForm.tsx
   - src/pages/Contacts.tsx
   - src/hooks/useContacts.ts

🎯 Affected flows: 1
   - Create contact

🧪 Test files to run: 2
   - tests/e2e/contacts.spec.ts
   - tests/e2e/auth.spec.ts

🧪 Running 2 test file(s)...

============================================================
📋 QA GATE REPORT
============================================================
Status: ✅ PASS
Tests: 8 passed, 0 failed, 0 skipped
Affected flows: 1
Tests run: 2
============================================================

✅ QA Gate PASSED - Merge approved
```

## Bug Reporting

When the QA gate finds bugs:

1. Reproduce the bug with Playwright
2. Capture screenshot/recording
3. Identify the responsible PM based on `OWNERSHIP.md`
4. Create a bug report in `BUG_TRACKER.md`:

```
BUG-001: Contact form validation fails
Severity: P0
Found by: PM-QA
Assigned to: PM-Context
Found in cycle: 2026-02-06
Steps to reproduce:
1. Navigate to /contacts
2. Click "Add Contact"
3. Submit form without email
Expected: Validation error shown
Actual: Form submits successfully
Affected flow: Create contact
Status: Open
```

## Troubleshooting

### No tests run
- **Cause:** Changed files don't map to any critical flows
- **Solution:** Check file-to-flow mapping in `OWNERSHIP.md`

### Tests fail but code looks correct
- **Cause:** Flaky test or test data issue
- **Solution:** Run tests manually: `npm run test:e2e`

### Script fails to detect changed files
- **Cause:** Not on a feature branch or git issues
- **Solution:** Ensure you're on a branch: `git branch`

## Future Enhancements

- [ ] Visual regression testing integration
- [ ] Performance testing for affected flows
- [ ] Automatic bug report generation
- [ ] Slack/email notifications
- [ ] Historical trend tracking

---

*PM-QA: The Gatekeeper — ensuring quality before merge.*
