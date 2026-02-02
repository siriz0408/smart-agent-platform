# Common QA Failures and Fixes

## Overview

This document catalogs common test failures in Smart Agent QA and their proven fixes. Use this as a reference when debugging similar issues.

## Element Not Found Errors

### Failure: "Upload button not found"

**Error:**
```
agent-browser click @upload-button
Error: No element found with selector data-testid="upload-button"
```

**Root Cause:** Button missing `data-testid` attribute

**Fix:**
```typescript
// Before
<Button onClick={handleUpload}>
  Upload Document
</Button>

// After
<Button onClick={handleUpload} data-testid="upload-button">
  Upload Document
</Button>
```

**Affected Files:** `src/pages/Documents.tsx`

**Validation:**
```bash
npm run lint && npm run test
agent-browser snapshot -i | grep "upload-button"
```

---

### Failure: "New contact button not found"

**Error:**
```
agent-browser click @new-contact-button
Error: strict mode violation: multiple elements found
```

**Root Cause:** Multiple buttons with same text, no unique identifier

**Fix:**
```typescript
// Before
<Button>New Contact</Button>

// After
<Button data-testid="new-contact-button">New Contact</Button>
```

**Affected Files:** `src/pages/Contacts.tsx`

---

## API Authentication Errors

### Failure: "API returned 401 Unauthorized"

**Error:**
```
Failed to fetch: 401 Unauthorized
```

**Root Cause:** JWT token not passed to `supabase.auth.getUser()`

**Fix:**
```typescript
// Before
const { data: { user }, error } = await supabase.auth.getUser();

// After
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);
```

**Affected Files:** `supabase/functions/*/index.ts`

**Deployment:**
```bash
npx supabase functions deploy FUNCTION_NAME
```

---

### Failure: "Missing Authorization header"

**Error:**
```
Error: Authorization header is required
```

**Root Cause:** Frontend not passing auth token

**Fix:**
```typescript
// Before
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// After
const { data: { session } } = await supabase.auth.getSession();
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify(data)
});
```

**Affected Files:** `src/hooks/use*.ts`

---

## Navigation Errors

### Failure: "Timeout waiting for URL"

**Error:**
```
agent-browser wait --url "**/documents"
Error: Timeout after 10000ms
```

**Root Cause:** Form submit doesn't navigate

**Fix:**
```typescript
// Before
onSuccess: () => {
  toast.success("Contact created");
}

// After
onSuccess: () => {
  toast.success("Contact created");
  navigate("/contacts");
}
```

**Affected Files:** `src/components/*/Form.tsx`

---

### Failure: "Expected /search?q=sarah but got /"

**Error:**
```
Current URL: https://smart-agent-platform.vercel.app/
Expected: https://smart-agent-platform.vercel.app/search?q=sarah
```

**Root Cause:** "See All Results" button doesn't navigate

**Fix:**
```typescript
// Before
<Button onClick={() => console.log('See all')}>
  See All Results
</Button>

// After
<Button onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}>
  See All Results
</Button>
```

**Affected Files:** `src/components/search/SearchResultsDropdown.tsx`

---

## Text Assertion Errors

### Failure: "Expected 'Success' but got 'Upload successful'"

**Error:**
```
agent-browser wait --text "Success"
Error: Text "Success" not found
```

**Root Cause:** Incorrect expected text in test

**Fix Option 1:** Update test to match actual text
```bash
# Before
agent-browser wait --text "Success"

# After
agent-browser wait --text "Upload successful"
```

**Fix Option 2:** Update UI to match expected text
```typescript
// Before
toast.success("Upload successful");

// After
toast.success("Success");
```

**Recommendation:** Keep descriptive messages, update test

---

## Race Conditions

### Failure: "Element not visible after 5s"

**Error:**
```
agent-browser click @submit-button
Error: Element is not visible
```

**Root Cause:** Button disabled while loading, test clicks too early

**Fix:**
```typescript
// Before
<Button onClick={handleSubmit} disabled={isLoading}>
  Submit
</Button>

// After
<Button
  onClick={handleSubmit}
  disabled={isLoading}
  data-testid="submit-button"
>
  {isLoading ? "Submitting..." : "Submit"}
</Button>

// Test update
agent-browser wait @submit-button  // Wait until enabled
agent-browser click @submit-button
```

**Affected Files:** `src/components/*/Form.tsx`

---

### Failure: "Search returned 0 results but expected 21"

**Error:**
```
Expected at least 1 result for "sarah"
Actual: 0 results
```

**Root Cause:** Test runs before data indexed

**Fix:**
```bash
# Before
agent-browser fill @search "sarah"
agent-browser wait 1000  # Fixed wait

# After
agent-browser fill @search "sarah"
agent-browser wait --text "results"  // Wait for results to appear
agent-browser wait --load networkidle
```

---

## Upload Errors

### Failure: "File upload failed with 413"

**Error:**
```
Upload failed: 413 Request Entity Too Large
```

**Root Cause:** File size exceeds limit

**Fix:**
```typescript
// Add validation before upload
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_FILE_SIZE) {
  toast.error("File size exceeds 10MB limit");
  return;
}
```

**Affected Files:** `src/components/documents/UploadForm.tsx`

---

### Failure: "Upload button disabled after first upload"

**Error:**
```
agent-browser click @upload-button
Error: Element is disabled
```

**Root Cause:** Form not reset after successful upload

**Fix:**
```typescript
// Before
onSuccess: () => {
  toast.success("Upload successful");
}

// After
onSuccess: () => {
  toast.success("Upload successful");
  form.reset();  // Reset form state
  setFile(null);  // Clear file input
}
```

**Affected Files:** `src/components/documents/UploadForm.tsx`

---

## State Management Errors

### Failure: "Search state not persisting in URL"

**Error:**
```
Navigate to /search?q=sarah
Refresh page
Query param missing: /search
```

**Root Cause:** Query not read from URL on mount

**Fix:**
```typescript
// Before
const [query, setQuery] = useState("");

// After
const [searchParams] = useSearchParams();
const [query, setQuery] = useState(searchParams.get("q") || "");
```

**Affected Files:** `src/pages/SearchResults.tsx`

---

## Styling/Visibility Errors

### Failure: "Element exists but not visible"

**Error:**
```
agent-browser click @modal-close
Error: Element is not visible (hidden by CSS)
```

**Root Cause:** Element rendered but `display: none`

**Fix:**
```typescript
// Before
<Dialog open={false}>
  <DialogContent>
    <button data-testid="modal-close">Close</button>
  </DialogContent>
</Dialog>

// After
{isOpen && (
  <Dialog open={isOpen}>
    <DialogContent>
      <button data-testid="modal-close">Close</button>
    </DialogContent>
  </Dialog>
)}
```

**Affected Files:** `src/components/*/Modal.tsx`

---

## Debugging Process

For any failure:

1. **Read error message** - Understand what failed
2. **View screenshot** - See actual vs expected state
3. **Check console errors** - Identify JavaScript errors
4. **Search codebase** - Find relevant component
5. **Identify root cause** - Missing attribute, API error, race condition, etc.
6. **Implement fix** - Add data-testid, fix auth, add wait, etc.
7. **Validate** - Lint, test, re-run failed test
8. **Document** - Add to this list if new pattern

## Fix Checklist

Before marking fix complete:

- [ ] Root cause identified
- [ ] Fix implemented with Edit tool
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Failed test now passes
- [ ] No regressions introduced
- [ ] Screenshot shows fix working
- [ ] Fix documented in state.json

## Quick Reference

| Error Pattern | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| "not found" | Missing data-testid | Add `data-testid` attribute |
| "401 Unauthorized" | Auth token issue | Pass token to `getUser(token)` |
| "Timeout waiting" | No navigation | Add `navigate()` call |
| "Multiple elements" | Non-unique selector | Add unique `data-testid` |
| "Not visible" | CSS display:none | Conditional rendering |
| "Element disabled" | Loading state | Wait for enabled state |
| "Text not found" | Wrong expected text | Update test or UI text |
| "413 Too Large" | File size limit | Add validation |

## Testing Fixes Locally

```bash
# Start dev server
npm run dev

# Test fix manually
agent-browser open http://localhost:8080/documents
agent-browser snapshot -i
agent-browser click @upload-button  # Should work now

# Run automated test
npm run test -- documents

# Verify no regressions
npm run lint
npm run test
```
