# Browser QA Test Artifacts

This directory contains browser test plans, scripts, and results for Smart Agent platform.

---

## 📁 Directory Structure

```
test-artifacts/
├── README.md                      # This file
├── state.json                     # Test run state and results (JSON)
├── TEST_PLAN.md                   # Detailed test plan with expected outcomes
├── MANUAL_TEST_CHECKLIST.md       # Manual testing checklist (printable)
├── run-priority-tests.sh          # Automated test script (executable)
├── screenshots/                   # Test screenshots
│   ├── 01-login-page.png
│   ├── 02-login-filled.png
│   ├── 03-login-success.png
│   ├── 04-search-s.png
│   ├── 05-search-sa.png
│   ├── 06-search-sar.png
│   ├── 07-search-sarah.png
│   ├── 08-search-results-page.png
│   ├── 09-search-filter-tabs.png
│   ├── 10-search-922.png
│   ├── 11-documents-page.png
│   ├── 12-properties-page.png
│   └── 13-contacts-page.png
└── reports/                       # Bug reports and test reports
```

---

## 🚀 Quick Start

### Option 1: Automated Testing (Recommended)

**Prerequisites:**
- Node.js and npm installed
- jq installed (`brew install jq` on macOS)

**Run Tests:**
```bash
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1
./test-artifacts/run-priority-tests.sh
```

**View Results:**
```bash
# View summary
jq '.summary' test-artifacts/state.json

# View failures (if any)
jq '.failures' test-artifacts/state.json

# View all test results
jq '.tests' test-artifacts/state.json
```

---

### Option 2: Manual Testing

Use the manual checklist for step-by-step testing:

```bash
open test-artifacts/MANUAL_TEST_CHECKLIST.md
```

Print the checklist and manually verify each test case. Mark pass/fail and take screenshots.

---

## 📋 Test Coverage

### Priority 1: Search Functionality (Recently Fixed)
- ✅ Incremental search ("s" → "sa" → "sar" → "sarah")
- ✅ Search accuracy (sarah → Sarah Johnson, NOT 922 Sharondale)
- ✅ "See All Results" button navigation
- ✅ Filter tabs on search results page
- ✅ Property search by address number ("922")

### Priority 2: Core Pages
- ✅ Login flow
- ✅ Documents page load
- ✅ Properties page load
- ✅ Contacts page load

---

## 🎯 Test Execution Status

Current test run status is tracked in `state.json`:

```json
{
  "testRun": {
    "id": "qa-20260202-201016",
    "status": "ready",
    "environment": {
      "baseUrl": "https://smart-agent-platform-sigma.vercel.app",
      "testUser": "siriz04081@gmail.com"
    }
  }
}
```

**Status Values:**
- `ready` - Test plan prepared, waiting for execution
- `running` - Tests currently executing
- `completed` - All tests finished
- `failed` - Test run crashed or aborted

---

## 📊 Understanding Test Results

### state.json Structure

```json
{
  "testRun": {
    "id": "qa-20260202-201016",
    "startTime": "2026-02-03T01:10:16Z",
    "endTime": "2026-02-03T01:25:43Z",
    "status": "completed"
  },
  "tests": {
    "login-flow": {
      "status": "passed",
      "duration": 3.2,
      "screenshot": "test-artifacts/screenshots/03-login-success.png"
    },
    "search-incremental-sarah": {
      "status": "passed",
      "duration": 5.1,
      "screenshot": "test-artifacts/screenshots/07-search-sarah.png"
    },
    "search-no-false-positive": {
      "status": "passed",
      "duration": 0.5,
      "screenshot": "test-artifacts/screenshots/07-search-sarah.png"
    }
  },
  "failures": [],
  "summary": {
    "total": 9,
    "passed": 9,
    "failed": 0,
    "skipped": 0
  }
}
```

### Test Status Values
- `passed` - Test completed successfully
- `failed` - Test failed (check `error` field for details)
- `timeout` - Test exceeded timeout limit
- `skipped` - Test was not executed

---

## 🐛 Bug Reporting

If tests fail, bug reports should be created in `reports/` directory:

**Example:**
```bash
# Create bug report
cat > test-artifacts/reports/bug-search-sarah-20260202.md << EOF
# Bug: Search for "sarah" returns incorrect results

**Test:** search-incremental-sarah
**Date:** 2026-02-02
**Environment:** Production (https://smart-agent-platform-sigma.vercel.app)

## Description
When searching for "sarah", the dropdown returns 922 Sharondale property instead of Sarah Johnson contact.

## Steps to Reproduce
1. Navigate to home page
2. Type "sarah" in global search bar
3. Wait for dropdown to appear

## Expected Result
- Sarah Johnson contact appears in results
- 922 Sharondale does NOT appear

## Actual Result
- 922 Sharondale appears (incorrect)
- Sarah Johnson does NOT appear (missing)

## Screenshot
![Search Results](../screenshots/07-search-sarah.png)

## Root Cause
Search query using ILIKE '%sarah%' which matches 'Sharondale'.
Should use prefix matching (ILIKE 'sarah%').

## Fix Required
Update universal-search Edge Function to use prefix matching.
EOF
```

---

## 🔍 Debugging Failed Tests

### Check Screenshots
```bash
ls -lht test-artifacts/screenshots/
# Open the most recent screenshots
```

### Check State File
```bash
# View failed tests only
jq '.tests | to_entries | map(select(.value.status == "failed"))' test-artifacts/state.json

# View specific test
jq '.tests["login-flow"]' test-artifacts/state.json
```

### Check Browser Console Errors
If using manual testing, browser console errors should be documented in the manual checklist.

---

## 📝 Test Maintenance

### Adding New Tests

1. **Update TEST_PLAN.md** with new test case
2. **Update run-priority-tests.sh** with new test steps
3. **Update MANUAL_TEST_CHECKLIST.md** for manual verification

Example:
```bash
# Test 10: New Feature
echo "Test 10: New Feature Test"
echo "=========================="
START=$(date +%s)

npx -y agent-browser open "$TEST_BASE_URL/new-feature"
npx -y agent-browser wait --load networkidle --timeout 10000
npx -y agent-browser screenshot test-artifacts/screenshots/14-new-feature.png

END=$(date +%s)
DURATION=$((END - START))
update_test_result "new-feature" "passed" "$DURATION" "" "test-artifacts/screenshots/14-new-feature.png"
echo -e "${GREEN}✓ New feature test passed (${DURATION}s)${NC}"
```

### Updating Expected Results

When application behavior changes:
1. Update expected results in TEST_PLAN.md
2. Update pass criteria in test script
3. Add notes about behavioral changes

---

## 🛠️ Troubleshooting

### agent-browser Not Found
```bash
npm install -g agent-browser
# or use npx
npx -y agent-browser --version
```

### jq Not Available
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

### Script Permission Denied
```bash
chmod +x test-artifacts/run-priority-tests.sh
```

### Browser Crashes
```bash
# Kill any hanging browsers
pkill -f "agent-browser"
pkill -f "chrome"
pkill -f "chromium"

# Restart test
./test-artifacts/run-priority-tests.sh
```

### Screenshots Not Saving
```bash
# Ensure directory exists and is writable
mkdir -p test-artifacts/screenshots
chmod -R 755 test-artifacts/screenshots
```

---

## 📈 Test Metrics

Track test execution over time:

```bash
# View test duration trends
jq '.tests | to_entries | map({test: .key, duration: .value.duration})' test-artifacts/state.json

# Calculate total test run duration
jq '[.tests[].duration] | add' test-artifacts/state.json

# View pass rate
jq '(.summary.passed / .summary.total) * 100' test-artifacts/state.json
```

---

## 🎯 Success Criteria

**Test Run Passes If:**
- Login successful ✅
- Search for "sarah" returns Sarah Johnson ✅
- Search for "sarah" does NOT return 922 Sharondale ✅
- "See All Results" button works ✅
- Filter tabs visible ✅
- Search for "922" returns property ✅
- All pages load successfully ✅

**Minimum Pass Rate:** 88% (8/9 tests)
**Target Pass Rate:** 100% (9/9 tests)

---

## 📚 Related Documents

- **PRD:** `/Users/sam.irizarry/Downloads/ReAgentOS_V1/Smart_Agent_Platform_PRD_v3.md`
- **Architecture:** `/Users/sam.irizarry/Downloads/ReAgentOS_V1/ARCHITECTURE.md`
- **Task Board:** `/Users/sam.irizarry/Downloads/ReAgentOS_V1/TASK_BOARD.md`
- **Browser QA Skill:** `/Users/sam.irizarry/Downloads/ReAgentOS_V1/.claude/skills/smart-agent-browser-qa/SKILL.md`

---

## 🤖 Automation Integration

This test suite can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Browser QA Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  browser-qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g agent-browser jq
      - run: ./test-artifacts/run-priority-tests.sh
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-artifacts/
```

---

## 📞 Support

For questions or issues with test execution:
1. Check TEST_PLAN.md for detailed test descriptions
2. Review MANUAL_TEST_CHECKLIST.md for step-by-step guidance
3. Check browser-qa SKILL.md for agent-browser patterns
4. File issues in project task board

---

**Last Updated:** 2026-02-02
**Test Run ID:** qa-20260202-201016
**Status:** Ready for Execution
