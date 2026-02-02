# Smart Agent QA Dev Team

Automated skill-based QA system for Smart Agent platform with browser testing, automatic debugging, and comprehensive reporting.

## Architecture

```
smart-agent-qa-orchestrator (Coordinator)
    ├─ smart-agent-browser-qa (Browser Tests)
    ├─ smart-agent-debugger (Fix Failures)
    └─ smart-agent-reporter (Generate Reports)
```

## Components

### 1. QA Orchestrator
- **Skill:** `smart-agent-qa-orchestrator`
- **Role:** Coordinates entire QA cycle
- **Responsibilities:**
  - Spawn browser QA agents
  - Monitor test execution
  - Trigger debugger on failures
  - Manage retry cycles (max 3)
  - Spawn reporter at completion

### 2. Browser QA
- **Skill:** `smart-agent-browser-qa`
- **Role:** Run automated browser tests
- **Responsibilities:**
  - Login flow tests
  - Documents CRUD + search + chat
  - Properties CRUD
  - Contacts CRUD
  - AI Chat functionality
  - Universal search
  - Capture screenshots
  - Update state.json with results

### 3. Debugger
- **Skill:** `smart-agent-debugger`
- **Role:** Automatically fix test failures
- **Responsibilities:**
  - Analyze failure context
  - Identify root causes
  - Implement fixes
  - Validate with lint + test
  - Report fixes in structured format
  - Re-run failed tests

### 4. Reporter
- **Skill:** `smart-agent-reporter`
- **Role:** Generate test reports
- **Responsibilities:**
  - Aggregate test results
  - Calculate metrics
  - Embed screenshots
  - Create markdown reports
  - Provide recommendations

## Setup

### 1. Environment Variables

```bash
cp .env.qa.example .env.qa
source .env.qa
```

Edit `.env.qa` with your credentials:
```bash
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
TEST_BASE_URL=https://your-domain.vercel.app
```

### 2. Install Dependencies

```bash
# agent-browser CLI (for browser automation)
npm install -g agent-browser

# OR use via npx (no installation)
npx -y agent-browser --version
```

### 3. Test Fixtures

Create test fixtures directory:
```bash
mkdir -p test-fixtures
# Add sample PDF for upload tests
cp sample-document.pdf test-fixtures/
```

## Usage

### Trigger Full QA Cycle

**In Claude Code, say:**
```
Run full QA test cycle on Smart Agent
```

**What happens:**
1. Orchestrator creates state.json
2. Spawns Browser QA agent → runs all tests
3. If failures detected and retries < 3:
   - Spawns Debugger agent → fixes issues
   - Re-runs failed tests
4. Spawns Reporter agent → generates report
5. Returns summary

### View Results

**Check test status:**
```bash
cat test-artifacts/state.json | jq '.summary'
```

**View report:**
```bash
cat test-artifacts/reports/qa-report-*.md
```

**Browse screenshots:**
```bash
ls -lt test-artifacts/screenshots/
```

### Run Specific Test Suite

**In Claude Code, say:**
```
Run browser QA tests for documents only
```

**Or manually:**
```bash
source .env.qa
agent-browser open $TEST_BASE_URL/login
# ... run specific tests
```

## Test Suites

### Login Flow (2 tests)
- ✅ Valid login credentials
- ✅ Invalid login credentials

### Documents (5 tests)
- ✅ List documents
- ✅ Upload document
- ✅ Search documents
- ✅ Chat with document
- ✅ Delete document

### Properties (5 tests)
- ✅ List properties
- ✅ Create property
- ✅ View property detail
- ✅ Edit property
- ✅ Delete property

### Contacts (5 tests)
- ✅ List contacts
- ✅ Create contact
- ✅ View contact detail
- ✅ Edit contact
- ✅ Delete contact

### AI Chat (3 tests)
- ✅ New conversation
- ✅ Send message
- ✅ View chat history

### Universal Search (3 tests)
- ✅ Search dropdown
- ✅ Search results page
- ✅ Navigate to detail from search

**Total:** 25 tests

## Workflow Examples

### Example 1: All Tests Pass

```
User: "Run full QA test cycle"
    ↓
Orchestrator spawns Browser QA agent
    ↓
All 25 tests pass (12 minutes)
    ↓
Orchestrator spawns Reporter agent
    ↓
Report generated: ✅ All tests passed
    ↓
User: "Great! Show me the report"
```

### Example 2: Test Fails, Auto-Fix

```
User: "Run full QA test cycle"
    ↓
Browser QA runs → 1 test fails
    ↓
Orchestrator spawns Debugger agent
    ↓
Debugger identifies: "Upload button missing data-testid"
    ↓
Debugger adds data-testid attribute
    ↓
Debugger runs: npm run lint && npm run test ✅
    ↓
Orchestrator re-runs failed test → ✅ PASS
    ↓
Reporter generates report: ✅ All tests passed (1 fix applied)
```

### Example 3: Max Retries Reached

```
User: "Run full QA test cycle"
    ↓
Browser QA runs → 5 tests fail
    ↓
Cycle 1: Debugger fixes 3, retests → 2 still failing
    ↓
Cycle 2: Debugger fixes 1, retests → 1 still failing
    ↓
Cycle 3: Debugger cannot fix remaining failure
    ↓
Max retries reached (3/3)
    ↓
Reporter generates report: ❌ 24/25 tests passed (manual investigation needed)
```

## State Management

### state.json Structure

```json
{
  "testRun": {
    "id": "qa-20260202-123000",
    "startTime": "2026-02-02T12:30:00Z",
    "endTime": "2026-02-02T12:45:23Z",
    "status": "completed",
    "retryCount": 1,
    "maxRetries": 3
  },
  "tests": {
    "login/valid": { "status": "passed", "duration": 3.2 },
    "login/invalid": { "status": "passed", "duration": 2.1 },
    "documents/list": { "status": "passed", "duration": 1.5 },
    "documents/upload": {
      "status": "passed",
      "duration": 5.3,
      "retried": true,
      "fixApplied": "Added data-testid attribute"
    }
  },
  "failures": [
    {
      "test": "documents/upload",
      "error": "Upload button not found",
      "screenshot": "test-artifacts/screenshots/document-upload-fail.png",
      "console": ["ReferenceError: uploadButton is not defined"],
      "fixed": true
    }
  ],
  "fixes": [
    {
      "test": "documents/upload",
      "rootCause": "Upload button missing data-testid",
      "fix": "Added data-testid='upload-button' to Button component",
      "filesChanged": ["src/pages/Documents.tsx"],
      "lintPassed": true,
      "testsPassed": true
    }
  ],
  "summary": {
    "total": 25,
    "passed": 25,
    "failed": 0,
    "skipped": 0,
    "duration": 923.4
  }
}
```

## Debugging

### View Agent Progress

```bash
# List running agents
/tasks

# Check specific agent output
# (Get task ID from /tasks output)
cat /path/to/agent-output.txt
```

### Check Test State

```bash
# View current state
cat test-artifacts/state.json | jq '.'

# Check test summary
cat test-artifacts/state.json | jq '.summary'

# List failures
cat test-artifacts/state.json | jq '.failures'

# List fixes applied
cat test-artifacts/state.json | jq '.fixes'
```

### View Screenshots

```bash
# List all screenshots
ls -lt test-artifacts/screenshots/

# View specific screenshot
open test-artifacts/screenshots/login-success.png
```

### Manual Test Execution

```bash
source .env.qa

# Run single test manually
agent-browser open $TEST_BASE_URL/login
agent-browser snapshot -i
agent-browser fill @email "$TEST_USER_EMAIL"
agent-browser fill @password "$TEST_USER_PASSWORD"
agent-browser click @login-button
agent-browser wait --url "**/documents"
agent-browser screenshot test-manual.png
```

## Extending the System

### Add New Test Suite

1. Edit `smart-agent-browser-qa/SKILL.md`
2. Add test suite section:
   ```markdown
   ### 7. Settings Tests

   **Test: Update Profile**
   ```bash
   agent-browser open $TEST_BASE_URL/settings
   agent-browser snapshot -i
   agent-browser fill @name "New Name"
   agent-browser click @save-button
   agent-browser wait --text "saved"
   ```
   ```

3. Update total test count in orchestrator

### Add Custom Validation

Create `scripts/custom-validation.sh`:
```bash
#!/bin/bash

# Custom post-test validation
echo "Running custom validation..."

# Check database state
# Check API health
# Check performance metrics

echo "Validation complete"
```

### Add Notifications

Edit orchestrator to send notifications:
```bash
# Slack notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"QA Complete: $SUMMARY\"}"

# Email notification
echo "$REPORT" | mail -s "QA Report" $EMAIL_RECIPIENTS
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up test data after each test
- Don't rely on test execution order

### 2. Stable Selectors
- Use data-testid attributes
- Avoid CSS classes or nth-child selectors
- Use semantic role selectors when possible

### 3. Explicit Waits
- Always wait for page load: `agent-browser wait --load networkidle`
- Wait for specific elements: `agent-browser wait @element`
- Wait for text: `agent-browser wait --text "Success"`

### 4. Screenshot Everything
- Screenshot on every assertion
- Screenshot on failures
- Screenshot after actions complete

### 5. Error Handling
- Capture console errors: `agent-browser errors`
- Log network failures: `agent-browser network requests`
- Provide detailed error messages

## Troubleshooting

### Tests Timing Out

**Solution:** Increase timeout in .env.qa
```bash
BROWSER_TIMEOUT=60000  # 60 seconds
```

### Elements Not Found

**Solution:** Add data-testid attributes
```typescript
<Button data-testid="my-button">Click Me</Button>
```

### Authentication Failing

**Solution:** Check credentials in .env.qa
```bash
echo $TEST_USER_EMAIL
echo $TEST_USER_PASSWORD
```

### Debugger Not Fixing Issues

**Solution:** Review debugger logs, may need manual intervention
```bash
cat test-artifacts/state.json | jq '.fixes'
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: QA Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run QA tests
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: |
          # Trigger Claude Code QA cycle
          # (Requires Claude Code CLI integration)

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: qa-artifacts
          path: test-artifacts/
```

## Support

For issues or questions:
1. Check `test-artifacts/state.json` for failure details
2. Review screenshots in `test-artifacts/screenshots/`
3. Read generated report in `test-artifacts/reports/`
4. Consult skill reference docs in `.claude/skills/*/references/`

## Contributing

To add new tests or improve the QA system:
1. Update relevant skill SKILL.md file
2. Add test fixtures if needed
3. Update this README
4. Run full QA cycle to verify changes
5. Commit and push

## License

Part of Smart Agent platform. See main project LICENSE.
