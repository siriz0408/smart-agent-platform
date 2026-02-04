# Smart Agent Continuous Tester

**When to Use:** Run systematic continuous testing of Smart Agent platform. Executes test suites on schedule, tracks bugs, monitors regressions, and reports status.

## Overview

The Continuous Tester agent runs in the background, systematically testing all platform features and logging results. It can:
- Run scheduled test suites (P0/P1/P2)
- Track discovered bugs in `test-artifacts/bugs.json`
- Generate regression reports
- Alert on new failures
- Retry and verify fixes

## Test Execution

### Run All P0 Critical Tests

```bash
# Using Playwright
npx playwright test --grep @p0

# Using agent-browser
source .env.qa
npx agent-browser open $TEST_BASE_URL
# ... run test suite
```

### Run Full Test Suite

```bash
# Run all E2E tests
npx playwright test

# Run with specific browser
npx playwright test --project=chromium

# Run mobile tests (David persona)
npx playwright test --project=mobile-chrome
```

### Run Persona-Specific Tests

```bash
# Sarah - First-time buyer tests
npx playwright test --grep "Sarah"

# Marcus - Luxury listing tests  
npx playwright test --grep "Marcus"

# David - Mobile tests
npx playwright test --project=mobile-chrome
```

## Bug Tracking

### Bug Format

Bugs are tracked in `test-artifacts/bugs.json`:

```json
{
  "bugs": [
    {
      "id": "BUG-001",
      "title": "Contact creation fails with empty phone",
      "severity": "medium",
      "status": "open",
      "test": "contacts.spec.ts:create buyer contact",
      "error": "Validation error: phone required",
      "screenshot": "test-artifacts/screenshots/bug-001.png",
      "steps": [
        "Navigate to Contacts",
        "Click Add Contact",
        "Fill required fields (no phone)",
        "Click Create"
      ],
      "expected": "Contact should be created",
      "actual": "Error: phone is required",
      "discovered": "2026-02-04T10:30:00Z",
      "lastSeen": "2026-02-04T10:30:00Z",
      "occurrences": 1,
      "persona": "sarah",
      "priority": "P1",
      "assignedFix": null,
      "fixAttempts": 0
    }
  ],
  "summary": {
    "total": 1,
    "open": 1,
    "fixed": 0,
    "wontfix": 0
  }
}
```

### Log New Bug

When a test fails:

```javascript
const bug = {
  id: `BUG-${Date.now()}`,
  title: extractTitle(error),
  severity: determineSeverity(error),
  status: 'open',
  test: testName,
  error: error.message,
  screenshot: screenshotPath,
  discovered: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  occurrences: 1
};

// Append to bugs.json
const bugs = JSON.parse(fs.readFileSync('test-artifacts/bugs.json'));
bugs.bugs.push(bug);
fs.writeFileSync('test-artifacts/bugs.json', JSON.stringify(bugs, null, 2));
```

### Update Existing Bug

If same error occurs again:

```javascript
const existingBug = bugs.bugs.find(b => b.error === error.message);
if (existingBug) {
  existingBug.occurrences++;
  existingBug.lastSeen = new Date().toISOString();
}
```

## Continuous Test Cycle

### Workflow

```
Start Continuous Testing
    ↓
Run P0 Critical Tests
    ↓
If failures → Log bugs, attempt fixes
    ↓
Run P1 High Priority Tests
    ↓
If failures → Log bugs
    ↓
Generate Report
    ↓
Wait (1 hour)
    ↓
Repeat
```

### Implementation

```bash
#!/bin/bash
# continuous-test-loop.sh

while true; do
  echo "=== Starting test cycle at $(date) ==="
  
  # Run P0 tests
  npx playwright test --grep @p0 --reporter=json > test-artifacts/p0-results.json 2>&1
  P0_EXIT=$?
  
  if [ $P0_EXIT -ne 0 ]; then
    echo "P0 tests failed! Logging bugs..."
    node scripts/log-bugs.js test-artifacts/p0-results.json
  fi
  
  # Run P1 tests
  npx playwright test --grep @p1 --reporter=json > test-artifacts/p1-results.json 2>&1
  P1_EXIT=$?
  
  if [ $P1_EXIT -ne 0 ]; then
    echo "P1 tests failed! Logging bugs..."
    node scripts/log-bugs.js test-artifacts/p1-results.json
  fi
  
  # Generate summary report
  node scripts/generate-continuous-report.js
  
  echo "=== Cycle complete. Waiting 1 hour... ==="
  sleep 3600
done
```

## Test Tags

Tag tests for filtering:

```typescript
// P0 Critical - run every deploy
test('@p0 should login successfully', async ({ page }) => {
  // ...
});

// P1 High - run daily
test('@p1 should create buyer contact with preferences', async ({ page }) => {
  // ...
});

// P2 Medium - run weekly
test('@p2 should test mobile responsive layout', async ({ page }) => {
  // ...
});

// Persona tags
test('@sarah @p1 first-time buyer workflow', async ({ page }) => {
  // ...
});
```

## Monitoring Dashboard

### Status Summary

```
┌─────────────────────────────────────────────────┐
│           CONTINUOUS TEST STATUS                │
├─────────────────────────────────────────────────┤
│ Last Run: 2026-02-04 10:30:00 UTC               │
│ Next Run: 2026-02-04 11:30:00 UTC               │
│                                                 │
│ P0 Critical:  ✅ 6/6 passed                     │
│ P1 High:      ⚠️ 14/15 passed (1 flaky)         │
│ P2 Medium:    ✅ 10/10 passed                   │
│                                                 │
│ Open Bugs: 3                                    │
│ Fixed Today: 2                                  │
│ Regression: 0                                   │
└─────────────────────────────────────────────────┘
```

### Bug List View

```
┌─────────────────────────────────────────────────┐
│                 OPEN BUGS                       │
├─────────────────────────────────────────────────┤
│ BUG-001 [P1] Contact phone validation           │
│   - 3 occurrences since 2026-02-04              │
│   - Status: Open                                │
│                                                 │
│ BUG-002 [P2] Mobile menu not closing            │
│   - 1 occurrence since 2026-02-04               │
│   - Status: Open                                │
│                                                 │
│ BUG-003 [P1] AI chat timeout on long docs       │
│   - 5 occurrences since 2026-02-03              │
│   - Status: Investigating                       │
└─────────────────────────────────────────────────┘
```

## Integration

### Start Continuous Testing

Tell Claude Code:
```
Start continuous testing of Smart Agent platform
```

### Check Test Status

Tell Claude Code:
```
Show me the current test status and open bugs
```

### Run Specific Tests

Tell Claude Code:
```
Run P0 critical tests only
Run Sarah persona tests
Run mobile responsive tests
```

### Investigate Bug

Tell Claude Code:
```
Investigate BUG-001 and attempt to fix
```

## Files

| File | Purpose |
|------|---------|
| `test-artifacts/bugs.json` | Bug tracking database |
| `test-artifacts/state.json` | Test run state |
| `test-artifacts/continuous-report.md` | Latest report |
| `test-artifacts/screenshots/` | Failure screenshots |
| `tests/e2e/*.spec.ts` | Playwright test files |
| `tests/TEST_PERSONAS.md` | User personas & scenarios |

## References

- `tests/TEST_PERSONAS.md` - User personas and test scenarios
- `playwright.config.ts` - Playwright configuration
- `.claude/skills/smart-agent-qa-orchestrator/SKILL.md` - QA orchestration
- `.claude/skills/smart-agent-browser-qa/SKILL.md` - Browser test commands
