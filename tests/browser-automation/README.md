# Browser Automation Testing with agent-browser

This directory contains automated browser tests for the Smart Agent Platform production deployment.

## Overview

These tests use [agent-browser](https://github.com/yourusername/agent-browser) to validate that all features work correctly in production at https://smart-agent-platform.vercel.app after database optimizations.

## Prerequisites

### Install agent-browser

```bash
npm install -g agent-browser
```

Verify installation:
```bash
agent-browser --version
```

### Configure Test Credentials

Edit `config.sh` and update the test credentials:

```bash
TEST_EMAIL="your-test-account@example.com"
TEST_PASSWORD="your-test-password"
```

**IMPORTANT**: Use a dedicated test account, not your production account.

## Quick Start

### Run All Tests

```bash
cd tests/browser-automation
bash run-all-tests.sh
```

This runs all test phases sequentially. Some tests require manual interaction (clicking buttons, filling forms).

### Run Individual Test Phases

```bash
# Phase 1: Authentication
bash scripts/01-auth-test.sh

# Phase 2: Document Management
bash scripts/02-documents-test.sh

# Phase 3: AI Chat
bash scripts/03-ai-chat-test.sh

# Phase 4: CRM Features
bash scripts/04-crm-test.sh

# Phase 5: Performance
bash scripts/05-performance-test.sh
```

## Test Structure

```
browser-automation/
├── config.sh                    # Test configuration
├── run-all-tests.sh            # Master test runner
├── scripts/
│   ├── 01-auth-test.sh         # Authentication tests
│   ├── 02-documents-test.sh    # Document management tests
│   ├── 03-ai-chat-test.sh      # AI chat tests
│   ├── 04-crm-test.sh          # CRM feature tests
│   └── 05-performance-test.sh  # Performance tests
├── test-data/
│   └── sample-document.txt     # Test document for upload
└── test-results/               # Screenshots, snapshots, reports
```

## What Gets Tested

### ✅ Authentication (Phase 2)
- Landing page loads
- Login form works
- User authentication succeeds
- Session persists after reload

### ✅ Document Management (Phase 3)
- Documents page loads
- Document upload works
- Document indexing completes
- Document viewing displays correctly

### ✅ AI Chat (Phase 4)
- Chat interface loads
- Basic AI queries work (Anthropic Claude)
- RAG queries retrieve document information
- Multi-document queries function

### ✅ CRM Features (Phase 5)
- Contacts page loads
- Contact creation works
- Properties page displays
- Pipeline/deals view renders

### ✅ Performance (Phase 6)
- Mobile viewport renders correctly
- Page load times are acceptable (<3s)
- No console errors on key pages

## Test Results

After running tests, check:

1. **Screenshots**: `test-results/*.png`
   - Visual evidence of each test step

2. **Page Snapshots**: `test-results/*.txt`
   - HTML structure and text content

3. **Test Report**: `test-results/test-report.md`
   - Summary of all test results

4. **Performance Data**: `test-results/page-load-times.txt`
   - Page load measurements

## Interactive Testing

For more control, use agent-browser interactively:

```bash
# Start interactive session
agent-browser --session smart-agent-test interactive

# Or use individual commands
agent-browser --session smart-agent-test open https://smart-agent-platform.vercel.app
agent-browser --session smart-agent-test snapshot -i
agent-browser --session smart-agent-test screenshot ./my-screenshot.png
```

## Troubleshooting

### agent-browser not found
```bash
npm install -g agent-browser
```

### Permission denied
```bash
chmod +x run-all-tests.sh
chmod +x scripts/*.sh
```

### Session state issues
```bash
# Clear and restart session
rm -f test-results/auth-state.json
agent-browser --session smart-agent-test open about:blank
```

### Manual interaction required
Most tests require manual steps (clicking, typing) because:
- UI selectors vary across deployments
- Some actions can't be automated easily
- This allows for human verification

Follow the prompts in each test script.

## Database Optimization Validation

These tests validate the database optimizations from MIGRATION_STATE.md Phase 4:

- **Document chunk retrieval**: Should be fast (<100ms) during RAG queries
- **Usage quota checks**: Should be instant (<10ms) during operations
- **Tenant-scoped queries**: Should use indexes efficiently
- **Multi-document search**: Should complete quickly without errors

Watch for:
- ✅ Fast AI responses (document retrieval is working)
- ✅ No timeout errors (indexes are optimized)
- ✅ Smooth document uploads (indexing is efficient)
- ❌ Slow RAG queries (may indicate index issues)
- ❌ Failed document uploads (may indicate migration problems)

## Next Steps

After testing:

1. **If all tests pass**:
   - Mark Phase 4 (Testing) complete in MIGRATION_STATE.md
   - Proceed to Phase 5 (24-48 hour monitoring)

2. **If issues found**:
   - Document bugs in test-results/issues.md
   - Create GitHub issues for tracking
   - Fix critical issues before proceeding

3. **Performance issues**:
   - Check Vercel deployment logs
   - Review Supabase query performance
   - Investigate slow endpoints

## Contributing

To add new tests:

1. Create a new script in `scripts/`
2. Follow the existing pattern
3. Update `run-all-tests.sh` to include the new test
4. Document test coverage in this README

## References

- [agent-browser documentation](https://github.com/yourusername/agent-browser)
- [Smart Agent Platform PRD](../../Smart_Agent_Platform_PRD_v2.md)
- [Migration State](../../MIGRATION_STATE.md)
- [Task Board](../../TASK_BOARD.md)
