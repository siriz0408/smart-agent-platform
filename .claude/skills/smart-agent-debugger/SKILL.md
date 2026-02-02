# Smart Agent Debugger

**When to Use:** Automatically debug and fix test failures found during QA cycles. Uses systematic debugging methodology to identify root causes, implement fixes, validate with lint/test, and report fixes in structured format.

## Overview

The debugger agent is spawned when Browser QA tests fail. It analyzes failure screenshots, error messages, and code context to implement fixes, then validates fixes pass linting and testing before returning control to the orchestrator.

## Systematic Debugging Process

### 1. Gather Evidence

**From state.json:**
```json
{
  "test": "documents/upload",
  "status": "failed",
  "error": "Upload button not found",
  "screenshot": "test-artifacts/screenshots/document-upload-fail.png",
  "console": ["ReferenceError: uploadButton is not defined at line 45"]
}
```

**Steps:**
1. Read failure context from state.json
2. View screenshot: `Read test-artifacts/screenshots/document-upload-fail.png`
3. Read console errors
4. Identify affected code paths

### 2. Reproduce Locally

**Set up debugging session:**
```bash
# Start dev server if not running
npm run dev

# Open browser to failing page
agent-browser open http://localhost:8080/documents
agent-browser snapshot -i

# Attempt to reproduce failure
agent-browser click @upload-button
# Error: No element found with ref @upload-button
```

**Confirm hypothesis:**
- Check if element exists in snapshot output
- Verify data-testid or ref attributes
- Check for race conditions (element not loaded yet)

### 3. Identify Root Cause

**Common failure patterns:**

| Error | Root Cause | Fix |
|-------|------------|-----|
| "Element not found" | Missing data-testid | Add `data-testid="upload-button"` |
| "Timeout waiting for URL" | Navigation didn't happen | Fix redirect logic |
| "Text not found" | Wrong success message | Update expected text |
| "Upload failed" | API error | Fix backend or mock API |
| "Cannot read property" | Null reference | Add null check |

**Example: Upload button not found**

1. Search for upload button component:
   ```bash
   grep -r "upload.*button" src/pages/Documents.tsx
   ```

2. Read component file:
   ```typescript
   // Found in Documents.tsx line 45
   <Button onClick={handleUpload}>
     Upload Document
   </Button>
   ```

3. **Root cause:** Button missing `data-testid` attribute

### 4. Implement Fix

**Add data-testid to button:**

```typescript
// Before (broken)
<Button onClick={handleUpload}>
  Upload Document
</Button>

// After (fixed)
<Button onClick={handleUpload} data-testid="upload-button">
  Upload Document
</Button>
```

**Use Edit tool:**
```typescript
Edit({
  file_path: "src/pages/Documents.tsx",
  old_string: `<Button onClick={handleUpload}>
  Upload Document
</Button>`,
  new_string: `<Button onClick={handleUpload} data-testid="upload-button">
  Upload Document
</Button>`
});
```

### 5. Validate Fix

**Run lint:**
```bash
npm run lint
```

**Run tests:**
```bash
npm run test
```

**Re-run failing test:**
```bash
# Test upload button now findable
agent-browser open http://localhost:8080/documents
agent-browser snapshot -i | grep "upload-button"
# Output: button "Upload Document" [ref=e5] [data-testid="upload-button"]

agent-browser click @upload-button
# Success!
```

**Verify no regressions:**
- Check related tests still pass
- Verify component still renders correctly

### 6. Report Fix

**Update state.json with fix details:**
```json
{
  "fixes": [
    {
      "test": "documents/upload",
      "rootCause": "Upload button missing data-testid attribute",
      "fix": "Added data-testid='upload-button' to Button component in Documents.tsx:45",
      "filesChanged": ["src/pages/Documents.tsx"],
      "lintPassed": true,
      "testsPassed": true,
      "retestStatus": "passed"
    }
  ]
}
```

## Debugging Workflows

### Workflow 1: Missing Element

```
Failure: "Upload button not found"
    ↓
Search codebase for upload button component
    ↓
Read component file
    ↓
Check if data-testid exists
    ↓
NO → Add data-testid attribute
    ↓
Lint + Test
    ↓
Re-run test → PASS
    ↓
Report fix
```

### Workflow 2: API Failure

```
Failure: "Upload failed with 500"
    ↓
Check browser console for API errors
    ↓
Identify failing API endpoint
    ↓
Read Edge Function code
    ↓
Find error (e.g., missing env variable)
    ↓
Fix Edge Function code
    ↓
Deploy Edge Function: npx supabase functions deploy
    ↓
Re-run test → PASS
    ↓
Report fix
```

### Workflow 3: Race Condition

```
Failure: "Element not visible after 5s"
    ↓
Review screenshot - page still loading
    ↓
Check component loading state
    ↓
Add proper loading indicators
    ↓
Update test to wait for loading state
    ↓
Lint + Test
    ↓
Re-run test → PASS
    ↓
Report fix
```

### Workflow 4: Incorrect Assertion

```
Failure: "Expected 'Success' but got 'Upload successful'"
    ↓
Check actual vs expected text
    ↓
Verify which is correct
    ↓
Update test assertion to match actual behavior
    ↓
OR update UI to match expected text
    ↓
Re-run test → PASS
    ↓
Report fix
```

## Common Fixes

### 1. Add Missing data-testid

```typescript
// Search for component
grep -r "New Property" src/

// Add data-testid
Edit({
  file_path: "src/pages/Properties.tsx",
  old_string: '<Button>New Property</Button>',
  new_string: '<Button data-testid="new-property-button">New Property</Button>'
});
```

### 2. Fix API Authentication

```typescript
// Edge Function missing auth token
Edit({
  file_path: "supabase/functions/upload-document/index.ts",
  old_string: 'const { data: { user } } = await supabase.auth.getUser();',
  new_string: `const token = authHeader.replace("Bearer ", "");
const { data: { user } } = await supabase.auth.getUser(token);`
});

// Deploy
Bash({ command: "npx supabase functions deploy upload-document" });
```

### 3. Add Loading State Handling

```typescript
Edit({
  file_path: "src/pages/Documents.tsx",
  old_string: 'return <div>{documents.map(...)}</div>',
  new_string: `if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage />;
return <div>{documents.map(...)}</div>`
});
```

### 4. Fix Navigation

```typescript
Edit({
  file_path: "src/components/ContactForm.tsx",
  old_string: 'onSuccess: () => toast.success("Contact created")',
  new_string: `onSuccess: () => {
  toast.success("Contact created");
  navigate("/contacts");
}`
});
```

### 5. Update Test Expectations

```bash
# Test expects wrong text
Edit({
  file_path: ".claude/skills/smart-agent-browser-qa/SKILL.md",
  old_string: 'agent-browser wait --text "Upload successful"',
  new_string: 'agent-browser wait --text "Document uploaded successfully"'
});
```

## Validation Checklist

Before reporting fix complete:

- [ ] Root cause identified and documented
- [ ] Fix implemented with Edit tool
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run test` passes (0 failures)
- [ ] Failing test re-run succeeds
- [ ] Related tests still pass (no regressions)
- [ ] Screenshot captured showing fix working
- [ ] Fix details added to state.json

## Fix Report Format

```json
{
  "test": "documents/upload",
  "rootCause": "Upload button missing data-testid attribute",
  "hypothesis": "Browser test cannot find button without stable selector",
  "investigation": [
    "Searched for 'upload' in src/pages/Documents.tsx",
    "Found Button component at line 45",
    "Confirmed missing data-testid attribute"
  ],
  "fix": "Added data-testid='upload-button' to Button component",
  "filesChanged": [
    {
      "path": "src/pages/Documents.tsx",
      "line": 45,
      "change": "Added data-testid attribute"
    }
  ],
  "validation": {
    "lintPassed": true,
    "testsPassed": true,
    "retestStatus": "passed",
    "screenshot": "test-artifacts/screenshots/document-upload-fixed.png"
  }
}
```

## Debugging Tools

**Code Search:**
```bash
# Find component by text
grep -r "Upload Document" src/

# Find by data-testid
grep -r 'data-testid="upload' src/

# Find API calls
grep -r "supabase.from('documents')" src/
```

**Log Analysis:**
```bash
# View browser console
agent-browser console

# View browser errors
agent-browser errors
```

**Network Debugging:**
```bash
# Check API responses
agent-browser network requests --filter "api/"
```

**Visual Debugging:**
```bash
# Highlight element
agent-browser highlight @e5

# Take screenshot
agent-browser screenshot debug.png
```

## Error Recovery

**If fix doesn't work:**
1. Revert changes: `git checkout -- FILE`
2. Try alternative hypothesis
3. Add more logging/debugging
4. Consult references for similar issues

**If tests timeout:**
1. Increase wait time
2. Add explicit waits for async operations
3. Check for infinite loops in code

**If linting fails:**
1. Run `npm run lint -- --fix`
2. Manually fix remaining errors
3. Re-validate

## References

- `references/systematic-debugging.md` - Debugging methodology
- `references/common-qa-failures.md` - Known failure patterns and fixes
- `references/test-fix-patterns.md` - Test assertion patterns
