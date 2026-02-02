# Search Functionality - Testing Guide

**Purpose:** Add test data and verify search functionality works correctly

---

## Quick Start (Recommended)

### Option 1: SQL Script (Simplest)

**Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/editor
2. Click "New query"

**Step 2: Run Test Data Script**
Copy and paste the contents of `scripts/seed-simple-test-data.sql` into the SQL editor and click "Run".

This will:
- ✅ Create 3 test contacts (John Denver, Sarah Johnson, Michael Smith)
- ✅ Create 3 test properties (including 922 Sharondale Dr)
- ✅ Auto-generate embeddings via database triggers
- ✅ Verify embeddings were created

**Expected Output:**
```
table_name | total | with_embedding | percentage
-----------|-------|----------------|------------
contacts   | 3     | 3              | 100.00%
properties | 3     | 3              | 100.00%
```

---

### Option 2: TypeScript Script (Advanced)

**Requires:** Supabase Service Role Key

```bash
# Set environment variables
export VITE_SUPABASE_URL="https://sthnezuadfbmbqlxiwtq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seeding script
npx tsx scripts/seed-test-data.ts
```

---

## Verify Test Data Created

### Check in Supabase Dashboard

**Contacts:**
1. Go to: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/editor
2. Click "contacts" table
3. You should see: John Denver, Sarah Johnson, Michael Smith

**Properties:**
1. Click "properties" table
2. You should see: 922 Sharondale Dr, 1234 Denver Street, 456 Main Street

**Embeddings:**
Run this query to verify embeddings exist:

```sql
SELECT
  'contacts' as table_name,
  COUNT(*) as total,
  COUNT(embedding) as with_embedding
FROM contacts
UNION ALL
SELECT 'properties', COUNT(*), COUNT(embedding) FROM properties;
```

Expected: `with_embedding` should equal `total`

---

## Run Integration Tests

### Test Search API

```bash
export VITE_SUPABASE_URL="https://sthnezuadfbmbqlxiwtq.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0aG5lenVhZGZibWJxbHhpd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MDAyOTEsImV4cCI6MjA4NTM3NjI5MX0.AGaxneydQTcb85MliGK1BT9fEPHa8cU3VCRr2UAu5hQ"

npx tsx scripts/test-search-integration.ts
```

**Expected Output:**
```
🧪 SEARCH INTEGRATION TESTS
============================================================

✅ Database connection (50ms)
✅ Search API requires authentication (150ms)
✅ Test data has embeddings (120ms)
✅ Search API returns results for "Denver" (250ms)
✅ Search finds "922 Sharondale Dr" (230ms)
✅ Faceted filtering (contacts only) (200ms)
✅ RRF scoring and sorting (240ms)

============================================================
TEST SUMMARY
============================================================

Total: 7 tests
✅ Passed: 7
❌ Failed: 0
Pass Rate: 100%
```

---

## Manual Testing in UI

### Test Credentials

If you used the SQL script with auth.uid(), test with your current logged-in user.

If you used the TypeScript script:
- **Email:** test-search@smartagent.test
- **Password:** TestSearch123!

### Test Scenarios

**Test 1: Search for "Denver"**
1. Login to https://smart-agent-platform.vercel.app
2. Type "Denver" in search bar
3. **Expected:** See John Denver (contact) and 1234 Denver Street (property)

**Test 2: Search for "922"**
1. Type "922" in search bar
2. **Expected:** See 922 Sharondale Dr property

**Test 3: Faceted Filtering**
1. Search "Denver"
2. Click "Contacts" filter
3. **Expected:** Only shows John Denver contact
4. Click "Properties" filter
5. **Expected:** Only shows 1234 Denver Street property

**Test 4: Click Result**
1. Search "922"
2. Click on "922 Sharondale Dr" result
3. **Expected:** Navigates to property detail page

**Test 5: Clear Search**
1. Type any query
2. Click X (clear button)
3. **Expected:** Dropdown closes, input cleared

**Test 6: Keyboard Shortcuts**
1. Press ⌘K (Mac) or Ctrl+K (Windows)
2. **Expected:** Search input focused
3. Press Escape
4. **Expected:** Dropdown closes

---

## Troubleshooting

### No Results Found

**Check 1: Embeddings exist**
```sql
SELECT address, embedding IS NOT NULL as has_embedding
FROM properties
WHERE address LIKE '%922%';
```

If `has_embedding = false`:
- Triggers may not be working
- Run backfill manually (see DEPLOYMENT_GUIDE)

**Check 2: User is authenticated**
- Check browser DevTools → Application → Local Storage
- Should see Supabase auth token

**Check 3: API is being called**
- Open DevTools → Network tab
- Search for "universal-search"
- Check request/response

### Tests Failing

**"Test user not found"**
- Run the seed-test-data script first
- Or use the SQL script with your current user

**"Database connection failed"**
- Check environment variables are set
- Check Supabase project is accessible

**"Search API requires authentication"**
- This should PASS (API should require auth)
- If it fails, there's a security issue

---

## Test Data Reference

### Contacts Created

| Name | Email | Company | Notes |
|------|-------|---------|-------|
| John Denver | john.denver@realestate.com | Denver Real Estate Partners | Looking for Denver properties |
| Sarah Johnson | sarah.j@example.com | Johnson Properties LLC | Selling 922 Sharondale Dr |
| Michael Smith | michael.smith@gmail.com | - | First-time buyer, Amherst area |

### Properties Created

| Address | City | State | Price | Status |
|---------|------|-------|-------|--------|
| 922 Sharondale Dr | Amherst | OH | $240,000 | active |
| 1234 Denver Street | Denver | CO | $675,000 | active |
| 456 Main Street | Amherst | OH | $189,000 | pending |

### Search Test Cases

| Query | Should Find |
|-------|-------------|
| "Denver" | John Denver (contact), 1234 Denver Street (property) |
| "922" | 922 Sharondale Dr (property) |
| "Amherst" | 922 Sharondale Dr, 456 Main Street (properties), Michael Smith (contact) |
| "John" | John Denver (contact) |
| "Sarah" | Sarah Johnson (contact) |

---

## Cleanup Test Data (Optional)

If you want to remove test data:

```sql
-- Delete test contacts
DELETE FROM contacts
WHERE email IN (
  'john.denver@realestate.com',
  'sarah.j@example.com',
  'michael.smith@gmail.com'
);

-- Delete test properties
DELETE FROM properties
WHERE address IN (
  '922 Sharondale Dr',
  '1234 Denver Street',
  '456 Main Street'
);
```

---

## Next Steps After Testing

1. ✅ Verify all 7 integration tests pass
2. ✅ Verify manual UI testing works
3. ✅ Run backfill for existing production data (if needed)
4. ✅ Update DEPLOYMENT_STATUS.md
5. ✅ Monitor search usage and performance

---

**Quick Command Reference:**

```bash
# Seed test data (TypeScript)
npx tsx scripts/seed-test-data.ts

# Run integration tests
npx tsx scripts/test-search-integration.ts

# Run unit tests
npm run test -- src/test/global-search.test.tsx

# Run all tests
npm run test
```
