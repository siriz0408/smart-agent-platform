# Smart Agent Browser QA

**When to Use:** Run automated browser tests for Smart Agent platform. Tests login, documents, properties, contacts, AI chat, and search functionality using agent-browser CLI tool.

## Overview

Automated browser testing for Smart Agent using agent-browser. Runs test suites, captures screenshots on failures, and saves results to state.json.

## Prerequisites

```bash
# Environment variables required
export TEST_USER_EMAIL="siriz04081@gmail.com"
export TEST_USER_PASSWORD="Test1234"
export TEST_BASE_URL="https://smart-agent-platform.vercel.app"

# Or use .env file
source .env
```

## Test Suites

### 1. Login Flow Tests

**Test: Valid Login**
```bash
# Navigate to login
agent-browser open $TEST_BASE_URL/login

# Take snapshot
agent-browser snapshot -i

# Fill credentials
agent-browser fill @email "$TEST_USER_EMAIL"
agent-browser fill @password "$TEST_USER_PASSWORD"
agent-browser click @login-button

# Verify success
agent-browser wait --url "**/documents" --timeout 10000
agent-browser screenshot test-artifacts/screenshots/login-success.png

# Save result
echo '{"status": "passed", "duration": 3.2}' > /tmp/login-result.json
```

**Test: Invalid Login**
```bash
agent-browser open $TEST_BASE_URL/login
agent-browser snapshot -i

agent-browser fill @email "invalid@example.com"
agent-browser fill @password "wrongpassword"
agent-browser click @login-button

# Verify error message appears
agent-browser wait --text "Invalid credentials"
agent-browser screenshot test-artifacts/screenshots/login-invalid.png

echo '{"status": "passed", "duration": 2.1}' > /tmp/login-invalid-result.json
```

### 2. Documents Tests

**Test: List Documents**
```bash
# Assume already logged in
agent-browser open $TEST_BASE_URL/documents
agent-browser wait --load networkidle
agent-browser snapshot -i

# Verify table/grid exists
agent-browser find role "table" || agent-browser find role "grid"
agent-browser screenshot test-artifacts/screenshots/documents-list.png

echo '{"status": "passed", "duration": 1.5}' > /tmp/documents-list-result.json
```

**Test: Upload Document**
```bash
agent-browser open $TEST_BASE_URL/documents
agent-browser snapshot -i

# Click upload button
agent-browser click @upload-button

# Fill upload form
agent-browser snapshot -i
agent-browser upload @file-input ./test-fixtures/sample-document.pdf
agent-browser select @category "contract"
agent-browser click @submit-upload

# Wait for upload to complete
agent-browser wait --text "uploaded successfully"
agent-browser screenshot test-artifacts/screenshots/document-upload-success.png

echo '{"status": "passed", "duration": 5.3}' > /tmp/document-upload-result.json
```

**Test: Search Documents**
```bash
agent-browser open $TEST_BASE_URL/documents
agent-browser snapshot -i

# Search for document
agent-browser fill @search "922"
agent-browser wait 2000

# Verify results appear
agent-browser snapshot -i | grep -q "922_Sharondale"
agent-browser screenshot test-artifacts/screenshots/document-search.png

echo '{"status": "passed", "duration": 2.7}' > /tmp/document-search-result.json
```

**Test: Chat with Document**
```bash
agent-browser open $TEST_BASE_URL/documents
agent-browser snapshot -i

# Click first document
agent-browser find first ".document-card" click

# Click Chat with AI button
agent-browser wait --text "Chat with AI"
agent-browser click @chat-ai-button

# Wait for chat page
agent-browser wait --url "**/documents/chat"
agent-browser screenshot test-artifacts/screenshots/document-chat.png

echo '{"status": "passed", "duration": 3.1}' > /tmp/document-chat-result.json
```

**Test: Delete Document**
```bash
agent-browser open $TEST_BASE_URL/documents
agent-browser snapshot -i

# Click delete on test document
agent-browser find text "test-document.pdf" hover
agent-browser click @delete-button
agent-browser click @confirm-delete

# Wait for deletion
agent-browser wait --text "deleted successfully"
agent-browser screenshot test-artifacts/screenshots/document-delete.png

echo '{"status": "passed", "duration": 2.9}' > /tmp/document-delete-result.json
```

### 3. Properties Tests

**Test: List Properties**
```bash
agent-browser open $TEST_BASE_URL/properties
agent-browser wait --load networkidle
agent-browser snapshot -i

# Verify properties grid exists
agent-browser find role "grid" || agent-browser find first ".property-card"
agent-browser screenshot test-artifacts/screenshots/properties-list.png

echo '{"status": "passed", "duration": 1.8}' > /tmp/properties-list-result.json
```

**Test: Create Property**
```bash
agent-browser open $TEST_BASE_URL/properties
agent-browser snapshot -i

# Click new property button
agent-browser click @new-property-button

# Fill property form
agent-browser snapshot -i
agent-browser fill @address "123 Test Street"
agent-browser fill @city "Seattle"
agent-browser fill @state "WA"
agent-browser fill @zip "98101"
agent-browser fill @price "500000"
agent-browser fill @bedrooms "3"
agent-browser fill @bathrooms "2"
agent-browser select @property-type "single-family"
agent-browser click @submit-property

# Verify creation
agent-browser wait --text "created successfully"
agent-browser screenshot test-artifacts/screenshots/property-create.png

echo '{"status": "passed", "duration": 4.5}' > /tmp/property-create-result.json
```

**Test: View Property Detail**
```bash
agent-browser open $TEST_BASE_URL/properties
agent-browser snapshot -i

# Click first property
agent-browser find first ".property-card" click

# Wait for detail page
agent-browser wait --url "**/properties/*"
agent-browser screenshot test-artifacts/screenshots/property-detail.png

# Verify breadcrumb
agent-browser find text "Properties"

echo '{"status": "passed", "duration": 2.3}' > /tmp/property-detail-result.json
```

**Test: Edit Property**
```bash
agent-browser open $TEST_BASE_URL/properties
agent-browser find text "123 Test Street" click
agent-browser wait --url "**/properties/*"

# Click edit button
agent-browser click @edit-button
agent-browser snapshot -i

# Update price
agent-browser fill @price "525000"
agent-browser click @save-button

# Verify update
agent-browser wait --text "updated successfully"
agent-browser screenshot test-artifacts/screenshots/property-edit.png

echo '{"status": "passed", "duration": 3.7}' > /tmp/property-edit-result.json
```

**Test: Delete Property**
```bash
agent-browser open $TEST_BASE_URL/properties
agent-browser find text "123 Test Street" click

# Delete property
agent-browser click @delete-button
agent-browser click @confirm-delete

# Verify deletion
agent-browser wait --text "deleted successfully"
agent-browser screenshot test-artifacts/screenshots/property-delete.png

echo '{"status": "passed", "duration": 2.6}' > /tmp/property-delete-result.json
```

### 4. Contacts Tests

**Test: List Contacts**
```bash
agent-browser open $TEST_BASE_URL/contacts
agent-browser wait --load networkidle
agent-browser snapshot -i

# Verify contacts table exists
agent-browser find role "table"
agent-browser screenshot test-artifacts/screenshots/contacts-list.png

echo '{"status": "passed", "duration": 1.6}' > /tmp/contacts-list-result.json
```

**Test: Create Contact**
```bash
agent-browser open $TEST_BASE_URL/contacts
agent-browser snapshot -i

# Click new contact button
agent-browser click @new-contact-button

# Fill contact form
agent-browser snapshot -i
agent-browser fill @first-name "John"
agent-browser fill @last-name "Doe"
agent-browser fill @email "john.doe@example.com"
agent-browser fill @phone "5551234567"
agent-browser select @contact-type "lead"
agent-browser click @submit-contact

# Verify creation
agent-browser wait --text "created successfully"
agent-browser screenshot test-artifacts/screenshots/contact-create.png

echo '{"status": "passed", "duration": 4.1}' > /tmp/contact-create-result.json
```

**Test: View Contact Detail**
```bash
agent-browser open $TEST_BASE_URL/contacts
agent-browser snapshot -i

# Click first contact
agent-browser find text "John Doe" click

# Wait for detail page
agent-browser wait --url "**/contacts/*"
agent-browser screenshot test-artifacts/screenshots/contact-detail.png

# Verify breadcrumb
agent-browser find text "Contacts"

echo '{"status": "passed", "duration": 2.2}' > /tmp/contact-detail-result.json
```

**Test: Edit Contact**
```bash
agent-browser open $TEST_BASE_URL/contacts
agent-browser find text "John Doe" click
agent-browser wait --url "**/contacts/*"

# Click edit button
agent-browser click @edit-button
agent-browser snapshot -i

# Update email
agent-browser fill @email "john.updated@example.com"
agent-browser click @save-button

# Verify update
agent-browser wait --text "updated successfully"
agent-browser screenshot test-artifacts/screenshots/contact-edit.png

echo '{"status": "passed", "duration": 3.5}' > /tmp/contact-edit-result.json
```

**Test: Delete Contact**
```bash
agent-browser open $TEST_BASE_URL/contacts
agent-browser find text "John Doe" click

# Delete contact
agent-browser click @delete-button
agent-browser click @confirm-delete

# Verify deletion
agent-browser wait --text "deleted successfully"
agent-browser screenshot test-artifacts/screenshots/contact-delete.png

echo '{"status": "passed", "duration": 2.4}' > /tmp/contact-delete-result.json
```

### 5. AI Chat Tests

**Test: New Conversation**
```bash
agent-browser open $TEST_BASE_URL
agent-browser wait --load networkidle
agent-browser snapshot -i

# Click new conversation button
agent-browser click @new-conversation-button

# Verify chat input is focused
agent-browser find role "textbox" focus
agent-browser screenshot test-artifacts/screenshots/ai-chat-new.png

echo '{"status": "passed", "duration": 1.9}' > /tmp/ai-chat-new-result.json
```

**Test: Send Message**
```bash
agent-browser open $TEST_BASE_URL
agent-browser snapshot -i

# Type message in chat
agent-browser fill @chat-input "What documents do I have about 922 Sharondale?"
agent-browser click @send-button

# Wait for AI response
agent-browser wait --text "inspection"
agent-browser screenshot test-artifacts/screenshots/ai-chat-send.png

echo '{"status": "passed", "duration": 8.3}' > /tmp/ai-chat-send-result.json
```

**Test: View Chat History**
```bash
agent-browser open $TEST_BASE_URL
agent-browser snapshot -i

# Click conversation history
agent-browser click @history-button

# Verify conversations list appears
agent-browser find text "conversations"
agent-browser screenshot test-artifacts/screenshots/ai-chat-history.png

echo '{"status": "passed", "duration": 1.7}' > /tmp/ai-chat-history-result.json
```

### 6. Universal Search Tests

**Test: Search Dropdown**
```bash
agent-browser open $TEST_BASE_URL
agent-browser snapshot -i

# Type in global search
agent-browser fill @search "sarah"
agent-browser wait 2000

# Verify dropdown appears with results
agent-browser snapshot -i | grep -q "Sarah Johnson"
agent-browser screenshot test-artifacts/screenshots/search-dropdown.png

echo '{"status": "passed", "duration": 2.5}' > /tmp/search-dropdown-result.json
```

**Test: Search Results Page**
```bash
agent-browser open $TEST_BASE_URL
agent-browser fill @search "sarah"
agent-browser wait 2000

# Click "See All Results"
agent-browser click @see-all-results

# Wait for search page
agent-browser wait --url "**/search?q=*"
agent-browser screenshot test-artifacts/screenshots/search-results.png

# Verify grouped results
agent-browser find text "Documents"
agent-browser find text "Contacts"

echo '{"status": "passed", "duration": 3.1}' > /tmp/search-results-result.json
```

**Test: Navigate to Detail from Search**
```bash
agent-browser open "$TEST_BASE_URL/search?q=sarah"
agent-browser wait --load networkidle
agent-browser snapshot -i

# Click first contact result
agent-browser find text "Sarah Johnson" click

# Verify navigation to contact detail
agent-browser wait --url "**/contacts/*"
agent-browser screenshot test-artifacts/screenshots/search-navigate.png

echo '{"status": "passed", "duration": 2.8}' > /tmp/search-navigate-result.json
```

## Test Runner Script

Create `scripts/run-all-tests.sh`:

```bash
#!/bin/bash

# Load environment
source .env 2>/dev/null || true

# Initialize results
RESULTS_DIR="test-artifacts/results"
mkdir -p "$RESULTS_DIR"

# Test suites
SUITES=(
  "login"
  "documents"
  "properties"
  "contacts"
  "ai-chat"
  "search"
)

# Run each suite
for suite in "${SUITES[@]}"; do
  echo "Running $suite tests..."

  # Source suite test file
  source ".claude/skills/smart-agent-browser-qa/scripts/${suite}-tests.sh"

  # Collect results
  cat /tmp/${suite}-*-result.json > "$RESULTS_DIR/${suite}.json"
done

# Aggregate results to state.json
node scripts/aggregate-results.js
```

## Error Handling

**On Test Failure:**
1. Capture screenshot: `agent-browser screenshot test-artifacts/screenshots/TESTNAME-fail.png`
2. Capture console errors: `agent-browser errors`
3. Save failure to state.json:
   ```json
   {
     "test": "documents/upload",
     "status": "failed",
     "error": "Upload button not found",
     "screenshot": "test-artifacts/screenshots/document-upload-fail.png",
     "console": ["TypeError: Cannot read property 'click' of null"]
   }
   ```

**On Browser Crash:**
1. Restart browser: `agent-browser close && agent-browser open $TEST_BASE_URL`
2. Re-authenticate if needed
3. Retry failed test once

**On Timeout:**
1. Mark test as "timeout"
2. Take screenshot of stuck state
3. Move to next test

## State File Update

After all tests complete, update `test-artifacts/state.json`:

```json
{
  "testRun": {
    "id": "qa-20260202-123000",
    "startTime": "2026-02-02T12:30:00Z",
    "endTime": "2026-02-02T12:45:23Z",
    "status": "completed",
    "retryCount": 0
  },
  "tests": {
    "login/valid": { "status": "passed", "duration": 3.2 },
    "login/invalid": { "status": "passed", "duration": 2.1 },
    "documents/list": { "status": "passed", "duration": 1.5 },
    "documents/upload": { "status": "failed", "duration": 5.3, "error": "Upload button not found" },
    "documents/search": { "status": "passed", "duration": 2.7 }
  },
  "failures": [
    {
      "test": "documents/upload",
      "error": "Upload button not found",
      "screenshot": "test-artifacts/screenshots/document-upload-fail.png"
    }
  ],
  "summary": {
    "total": 25,
    "passed": 24,
    "failed": 1,
    "skipped": 0,
    "duration": 923.4
  }
}
```

## References

- `references/agent-browser-patterns.md` - Browser automation best practices
- `references/test-data-setup.md` - Test fixtures and cleanup
- `references/snapshot-strategies.md` - When to snapshot for debugging
