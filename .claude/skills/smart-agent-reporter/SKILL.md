# Smart Agent Reporter

**When to Use:** Generate comprehensive test reports after QA cycles complete. Creates markdown reports with screenshots, pass/fail counts, performance metrics, and actionable recommendations.

## Overview

The reporter agent is spawned at the end of a QA cycle (whether tests pass, fail, or reach max retries). It reads the state.json file, aggregates test results, embeds screenshots, and generates a detailed markdown report.

## Report Structure

### 1. Executive Summary

```markdown
# QA Test Report - Smart Agent Platform

**Test Run ID:** qa-20260202-123000
**Date:** February 2, 2026 12:30 PM - 12:45 PM
**Duration:** 15 minutes 23 seconds
**Status:** ✅ PASSED (24/25 tests passed)

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | 25 |
| ✅ Passed | 24 |
| ❌ Failed | 1 |
| ⏭️ Skipped | 0 |
| ⏱️ Average Duration | 3.2s |

## Test Coverage

- ✅ Login Flow (2/2 passed)
- ✅ Documents (4/5 passed)
- ✅ Properties (5/5 passed)
- ✅ Contacts (5/5 passed)
- ✅ AI Chat (3/3 passed)
- ✅ Universal Search (3/3 passed)
```

### 2. Test Results by Suite

```markdown
## Test Results

### Login Flow ✅

| Test | Status | Duration | Screenshot |
|------|--------|----------|------------|
| Valid Login | ✅ PASS | 3.2s | [View](screenshots/login-success.png) |
| Invalid Login | ✅ PASS | 2.1s | [View](screenshots/login-invalid.png) |

**Suite Duration:** 5.3s

---

### Documents ⚠️

| Test | Status | Duration | Screenshot |
|------|--------|----------|------------|
| List Documents | ✅ PASS | 1.5s | [View](screenshots/documents-list.png) |
| Upload Document | ❌ FAIL | 5.3s | [View](screenshots/document-upload-fail.png) |
| Search Documents | ✅ PASS | 2.7s | [View](screenshots/document-search.png) |
| Chat with Document | ✅ PASS | 3.1s | [View](screenshots/document-chat.png) |
| Delete Document | ✅ PASS | 2.9s | [View](screenshots/document-delete.png) |

**Suite Duration:** 15.5s
**Failures:** 1

#### Failure Details

**Test:** Upload Document
**Error:** Upload button not found
**Root Cause:** Button missing data-testid attribute
**Screenshot:**

![Upload Failure](screenshots/document-upload-fail.png)

**Console Errors:**
```
ReferenceError: uploadButton is not defined at line 45
```

**Fix Applied:**
- Added `data-testid="upload-button"` to Button component in Documents.tsx:45
- Retest Status: ✅ PASSED

---

### Properties ✅

| Test | Status | Duration | Screenshot |
|------|--------|----------|------------|
| List Properties | ✅ PASS | 1.8s | [View](screenshots/properties-list.png) |
| Create Property | ✅ PASS | 4.5s | [View](screenshots/property-create.png) |
| View Property Detail | ✅ PASS | 2.3s | [View](screenshots/property-detail.png) |
| Edit Property | ✅ PASS | 3.7s | [View](screenshots/property-edit.png) |
| Delete Property | ✅ PASS | 2.6s | [View](screenshots/property-delete.png) |

**Suite Duration:** 14.9s

```

### 3. Performance Metrics

```markdown
## Performance

### Test Duration Distribution

| Percentile | Duration |
|------------|----------|
| p50 (median) | 2.7s |
| p75 | 3.5s |
| p90 | 5.1s |
| p95 | 5.3s |
| p99 | 8.3s |

### Slowest Tests

1. AI Chat: Send Message - 8.3s
2. Documents: Upload Document - 5.3s
3. Properties: Create Property - 4.5s
4. Contacts: Create Contact - 4.1s
5. Properties: Edit Property - 3.7s

### Fastest Tests

1. Documents: List Documents - 1.5s
2. Contacts: List Contacts - 1.6s
3. AI Chat: View History - 1.7s
4. Properties: List Properties - 1.8s
5. AI Chat: New Conversation - 1.9s
```

### 4. Failures and Fixes

```markdown
## Failures and Resolutions

### Failure 1: Document Upload

**Test:** documents/upload
**Status:** ❌ FAILED → ✅ FIXED
**Retry Cycle:** 1 of 3

**Error Message:**
```
Upload button not found
```

**Investigation:**
1. Searched for 'upload' in src/pages/Documents.tsx
2. Found Button component at line 45
3. Confirmed missing data-testid attribute

**Root Cause:**
Upload button missing data-testid attribute for test automation

**Fix:**
Added `data-testid="upload-button"` to Button component

**Files Changed:**
- `src/pages/Documents.tsx` (line 45)

**Validation:**
- ✅ Lint passed
- ✅ Tests passed
- ✅ Retest passed

**Screenshot After Fix:**

![Upload Success](screenshots/document-upload-fixed.png)
```

### 5. Recommendations

```markdown
## Recommendations

### Critical Issues

None

### High Priority

1. **Add data-testid to all interactive elements**
   - Missing on several buttons and inputs
   - Prevents reliable test automation
   - Impact: Medium - causes test flakiness

### Medium Priority

1. **Optimize slow tests**
   - AI Chat: Send Message takes 8.3s
   - Consider mocking AI responses in tests
   - Impact: Low - extends test suite duration

2. **Add loading state tests**
   - No tests verify loading spinners appear
   - Can improve UX verification
   - Impact: Low - cosmetic

### Low Priority

1. **Add more edge case tests**
   - Test empty states (no documents, no contacts)
   - Test pagination limits
   - Test error recovery flows
```

### 6. Test Coverage Analysis

```markdown
## Test Coverage

### Tested Features

✅ Login (valid/invalid credentials)
✅ Documents (CRUD + search + chat)
✅ Properties (CRUD)
✅ Contacts (CRUD)
✅ AI Chat (new conversation, send message, history)
✅ Universal Search (dropdown, results page, navigation)

### Missing Coverage

❌ Settings page
❌ Billing page
❌ Admin panel
❌ Agents page
❌ Pipeline/Deals
❌ Multi-user collaboration
❌ Mobile responsive testing
❌ Accessibility testing
❌ Performance testing (Lighthouse)
```

## Report Generation Script

Create `scripts/generate-report.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Read state.json
const state = JSON.parse(
  fs.readFileSync('test-artifacts/state.json', 'utf8')
);

// Generate markdown report
let report = `# QA Test Report - Smart Agent Platform\n\n`;

// Executive Summary
report += `**Test Run ID:** ${state.testRun.id}\n`;
report += `**Date:** ${new Date(state.testRun.startTime).toLocaleString()}\n`;
report += `**Duration:** ${calculateDuration(state.testRun)}\n`;
report += `**Status:** ${getOverallStatus(state)}\n\n`;

// Summary table
const summary = calculateSummary(state.tests);
report += `## Summary\n\n`;
report += `| Metric | Count |\n`;
report += `|--------|-------|\n`;
report += `| Total Tests | ${summary.total} |\n`;
report += `| ✅ Passed | ${summary.passed} |\n`;
report += `| ❌ Failed | ${summary.failed} |\n`;
report += `| ⏭️ Skipped | ${summary.skipped} |\n`;
report += `| ⏱️ Average Duration | ${summary.avgDuration}s |\n\n`;

// Test Results by Suite
report += generateSuiteResults(state.tests);

// Performance Metrics
report += generatePerformanceMetrics(state.tests);

// Failures and Fixes
if (state.failures.length > 0 || state.fixes) {
  report += generateFailuresSection(state);
}

// Recommendations
report += generateRecommendations(state);

// Coverage Analysis
report += generateCoverageAnalysis(state.tests);

// Write report
const reportPath = 'test-artifacts/reports/qa-report.md';
fs.writeFileSync(reportPath, report);
console.log(`Report generated: ${reportPath}`);
```

## Screenshot Embedding

**Inline screenshots:**
```markdown
![Login Success](../screenshots/login-success.png)
```

**Linked screenshots:**
```markdown
[View Screenshot](../screenshots/login-success.png)
```

**Screenshot grid (multiple screenshots):**
```markdown
| Before | After |
|--------|-------|
| ![Before](screenshots/upload-fail.png) | ![After](screenshots/upload-fixed.png) |
```

## Report Delivery

**Save to file:**
```bash
# Generate report
node scripts/generate-report.js

# Output location
test-artifacts/reports/qa-report-20260202-123000.md
```

**Email report (optional):**
```bash
# Send via email
cat test-artifacts/reports/qa-report.md | \
  mail -s "QA Report - Smart Agent" dev-team@example.com
```

**Slack notification (optional):**
```bash
# Post summary to Slack
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "QA Report: 24/25 tests passed",
    "attachments": [{
      "title": "View Full Report",
      "title_link": "https://example.com/qa-reports/latest"
    }]
  }'
```

## Report Templates

### Full Pass Report

```markdown
# ✅ QA Test Report - All Tests Passed

**Test Run ID:** qa-20260202-123000
**Status:** ✅ ALL TESTS PASSED
**Duration:** 12 minutes 34 seconds

All 25 tests passed successfully! No issues found.

## Test Coverage

✅ Login Flow (2/2)
✅ Documents (5/5)
✅ Properties (5/5)
✅ Contacts (5/5)
✅ AI Chat (3/3)
✅ Universal Search (3/3)

[View Detailed Report](test-artifacts/reports/qa-report-full.md)
```

### Partial Failure Report

```markdown
# ⚠️ QA Test Report - Some Tests Failed

**Test Run ID:** qa-20260202-123000
**Status:** ⚠️ 24/25 TESTS PASSED
**Duration:** 15 minutes 23 seconds

1 test failed after 2 retry attempts.

## Failed Tests

❌ Documents: Upload Document
  - Error: API returned 500
  - Root Cause: Edge Function authentication bug
  - Fix Applied: Yes
  - Retest Status: ✅ PASSED

## Next Steps

All issues have been resolved. Next QA cycle should pass all tests.
```

### Max Retries Report

```markdown
# ❌ QA Test Report - Max Retries Reached

**Test Run ID:** qa-20260202-123000
**Status:** ❌ FAILED (20/25 tests passed)
**Duration:** 45 minutes 12 seconds
**Retry Cycles:** 3/3 (max retries reached)

5 tests failed after maximum retry attempts.

## Failed Tests

❌ Documents: Upload Document
❌ Properties: Create Property
❌ Contacts: Edit Contact
❌ AI Chat: Send Message
❌ Search: Navigate to Detail

## Critical Issues

**BLOCKER:** API authentication completely broken
  - All API calls returning 401 Unauthorized
  - Requires immediate investigation

## Action Required

Manual investigation needed. Automated fixes unsuccessful.
```

## Utility Functions

```javascript
function calculateDuration(testRun) {
  const start = new Date(testRun.startTime);
  const end = new Date(testRun.endTime);
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = ((diffMs % 60000) / 1000).toFixed(0);
  return `${minutes} minutes ${seconds} seconds`;
}

function getOverallStatus(state) {
  const summary = calculateSummary(state.tests);
  if (summary.failed === 0) return '✅ PASSED';
  if (summary.failed <= 2) return '⚠️ PARTIAL PASS';
  return '❌ FAILED';
}

function calculateSummary(tests) {
  const results = Object.values(tests);
  return {
    total: results.length,
    passed: results.filter(t => t.status === 'passed').length,
    failed: results.filter(t => t.status === 'failed').length,
    skipped: results.filter(t => t.status === 'skipped').length,
    avgDuration: (results.reduce((sum, t) => sum + t.duration, 0) / results.length).toFixed(1)
  };
}
```

## References

- `references/report-templates.md` - Report markdown templates
- `references/screenshot-embedding.md` - Image handling in reports
- `references/metrics-calculation.md` - Performance metric formulas
