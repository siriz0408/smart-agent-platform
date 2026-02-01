# Browser Automation Testing Guide

## Overview

This guide walks you through testing the Smart Agent Platform production deployment using agent-browser automation.

## Before You Start

### Prerequisites Checklist

- ✅ agent-browser installed (`npm install -g agent-browser`)
- ✅ Test credentials configured in `config.sh`
- ✅ Test data available in `test-data/`
- ✅ Production URL accessible: https://smart-agent-platform.vercel.app

### Create a Test Account

Before running tests, create a dedicated test account:

1. Go to https://smart-agent-platform.vercel.app
2. Sign up with a test email (e.g., `test+automation@yourdomain.com`)
3. Verify the account
4. Update `config.sh` with these credentials

## Testing Workflow

### Quick Start: Run All Tests

```bash
cd tests/browser-automation
bash run-all-tests.sh
```

This runs all 6 test phases sequentially with prompts for manual steps.

### Step-by-Step: Run Individual Tests

#### Phase 1: Authentication

```bash
bash scripts/01-auth-test.sh
```

**What it tests**:
- Landing page loads correctly
- Login form appears
- Authentication works
- Session persists after reload

**Manual steps**:
1. Wait for landing page to load
2. Click "Sign In" button when prompted
3. Fill in email and password
4. Submit form
5. Verify redirect to dashboard

**Success criteria**:
- Screenshots show successful login flow
- `auth-state.json` is created
- Session persists after reload

---

#### Phase 2: Document Management

```bash
bash scripts/02-documents-test.sh
```

**What it tests**:
- Documents page loads
- Document upload works
- Document indexing completes
- Document viewing displays

**Manual steps**:
1. Navigate to Documents page
2. Click upload button
3. Select test document
4. Wait for indexing to complete
5. Click on document to view details

**Success criteria**:
- Document appears in list
- Indexing status shows "Indexed"
- Document details display correctly

---

#### Phase 3: AI Chat

```bash
bash scripts/03-ai-chat-test.sh
```

**What it tests**:
- Chat interface loads
- Basic AI queries work
- RAG (document-based) queries work
- Multi-document queries function

**Manual steps**:
1. Navigate to chat/home page
2. Type: "What is this platform?"
3. Send message and wait for response
4. Type: "What information is in my documents?"
5. Wait for RAG response
6. (Optional) Ask multi-document query

**Success criteria**:
- AI responds within 30 seconds
- RAG queries retrieve document information
- Responses are relevant and accurate

---

#### Phase 4: CRM Features

```bash
bash scripts/04-crm-test.sh
```

**What it tests**:
- Contacts page loads
- Contact creation works
- Properties page displays
- Pipeline/deals view renders

**Manual steps**:
1. Navigate to Contacts
2. Click "Add Contact"
3. Fill in: Name, Email, Phone
4. Save contact
5. Navigate to Properties
6. Navigate to Pipeline

**Success criteria**:
- Contact appears in list
- Properties page loads (may be empty)
- Pipeline displays with stages

---

#### Phase 5: Performance

```bash
bash scripts/05-performance-test.sh
```

**What it tests**:
- Mobile viewport responsiveness
- Page load times
- Network performance

**Manual steps**:
1. Navigate through pages on mobile viewport
2. Navigate through pages on desktop viewport
3. Observe load times

**Success criteria**:
- All pages render on mobile (375x667)
- Page loads complete within 3 seconds
- No console errors

---

## Understanding Test Results

### Screenshots

Located in `test-results/*.png`:

- `01-landing-page.png` - Initial landing page
- `02-logged-in-state.png` - After authentication
- `03-session-persistence.png` - After reload
- `04-documents-page.png` - Documents list
- `05-document-uploaded.png` - After upload
- `06-document-view.png` - Document details
- `07-chat-page.png` - Chat interface
- `08-ai-response.png` - AI chat response
- `09-rag-response.png` - RAG query response
- `10-multi-doc-chat.png` - Multi-document query
- `11-contacts-page.png` - Contacts list
- `12-contact-created.png` - After creating contact
- `13-properties-page.png` - Properties view
- `14-pipeline-page.png` - Pipeline/deals
- `15-mobile-landing.png` - Mobile viewport landing
- `16-mobile-documents.png` - Mobile documents
- `17-mobile-chat.png` - Mobile chat

### Page Snapshots

Located in `test-results/*-snapshot.txt`:

These contain the HTML structure and text content of pages. Useful for:
- Finding UI element selectors
- Verifying content presence
- Debugging layout issues

### Test Report

`test-results/test-report.md` summarizes:
- Which phases passed/failed
- Overall test status
- Timestamp of test run

### Performance Data

`test-results/page-load-times.txt` shows:
- Landing page load time
- Documents page load time
- Chat page load time

**Target**: All pages should load in <3000ms

## Interpreting Results

### ✅ All Tests Pass

If all phases show ✅ in the test report:

1. Review screenshots to confirm visual correctness
2. Check performance data (page load times)
3. Verify no console errors in snapshots
4. Mark Phase 4 complete in `MIGRATION_STATE.md`
5. Proceed to Phase 5 (monitoring)

### ❌ Tests Fail

If any phase shows ❌:

1. **Review error messages** in terminal output
2. **Check screenshots** for visual clues
3. **Examine snapshots** for HTML/content issues
4. **Document issues** in `test-results/issues.md`
5. **Create GitHub issues** for tracking
6. **Fix critical bugs** before proceeding

### ⚠️ Performance Issues

If page loads are slow (>3000ms):

1. Check Vercel deployment logs
2. Review Supabase query performance
3. Investigate slow API endpoints
4. Consider database optimization
5. Profile frontend bundle size

## Common Issues

### Authentication Fails

**Symptoms**: Can't log in, redirected to login page

**Solutions**:
- Verify test credentials in `config.sh`
- Check if account is verified
- Ensure password is correct
- Try creating new test account

### Document Upload Fails

**Symptoms**: Upload doesn't complete, indexing stuck

**Solutions**:
- Check file size (<10MB recommended)
- Verify file format (PDF, TXT supported)
- Check Supabase storage limits
- Review Edge Function logs

### AI Chat Times Out

**Symptoms**: No response after 30 seconds

**Solutions**:
- Check Anthropic API key in Supabase secrets
- Verify Edge Function is deployed
- Check Lovable API Gateway status
- Review Edge Function logs

### RAG Queries Don't Return Document Info

**Symptoms**: AI responds but doesn't reference documents

**Solutions**:
- Ensure documents are indexed (check "Indexed" status)
- Verify embeddings were created
- Check `document_chunks` table in Supabase
- Review RAG query logs

### Session Not Persisting

**Symptoms**: Logged out after reload

**Solutions**:
- Check Supabase Auth settings
- Verify session token storage
- Review browser cookies
- Check auth state save/load

## Advanced Usage

### Interactive Testing

For manual exploration:

```bash
agent-browser --session smart-agent-test interactive
```

This opens an interactive prompt where you can:
- Run commands one at a time
- Inspect page state
- Debug issues
- Try different selectors

### Custom Test Scripts

Create your own test:

```bash
#!/bin/bash
source ./config.sh

SESSION="$SESSION_NAME"

log_info "My custom test"
agent-browser --session "$SESSION" open "$PROD_URL"
# ... your test steps ...
take_screenshot "my-test.png"
log_success "Test complete"
```

### Debugging Failed Tests

Enable verbose output:

```bash
# Run with debugging
set -x
bash scripts/01-auth-test.sh
set +x
```

Check browser console:

```bash
agent-browser --session smart-agent-test console
```

## Next Steps

After completing all tests:

1. **Generate test report**: Already created in `test-results/test-report.md`
2. **Document issues**: Create `test-results/issues.md` for any bugs found
3. **Update migration state**: Mark Phase 4 complete in `MIGRATION_STATE.md`
4. **Share results**: Review with team
5. **Proceed to monitoring**: Start Phase 5 (24-48 hour monitoring)

## Resources

- [README](./README.md) - Quick reference
- [INSTALLATION](./INSTALLATION.md) - Setup guide
- [Production Testing Plan](../../docs/PRODUCTION_TESTING_PLAN.md) - Full plan
- [Migration State](../../MIGRATION_STATE.md) - Current migration status
