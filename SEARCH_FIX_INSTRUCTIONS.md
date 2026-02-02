# Universal Search - Fix Instructions

## Current Status

- ✅ Migrations applied (RPC function `search_all_entities_hybrid` exists)
- ✅ Edge function deployed with diagnostic logging
- ❌ Search returns no results in browser

## Root Cause (from diagnostic plan)

The edge function has a **tenant_id lookup issue**:

```typescript
// Current code (lines 170-176):
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("tenant_id")
  .eq("user_id", user.id)
  .single();

const tenantId = profile?.tenant_id || user.id;
```

**Problem:** If profile lookup fails or returns null, fallback uses `user.id` instead of correct `tenant_id`.

**Expected behavior:**
- User logs in → user.id = `e71b2c84-...`
- Profile should have → tenant_id = `5098bedb-...`
- Test data exists for tenant_id = `5098bedb-...`
- If fallback to user.id, wrong tenant → no results

## How to Diagnose

### Option 1: Check Supabase Dashboard Logs

1. Open: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/logs/edge-functions
2. Filter to `universal-search` function
3. Look for logs with 🔍 emoji:
   ```
   🔍 Auth user: { user_id: 'e71b2c84-...' }
   🔍 Profile lookup result: {
     profile_exists: false,  // ← This tells us the issue!
     profile_tenant_id: null,
     using_tenant_id: 'e71b2c84-...',  // ← Wrong! Should be 5098bedb-...
     fallback_used: true
   }
   ✅ RPC results: { count: 0 }  // ← No results because wrong tenant_id
   ```

4. If `profile_exists: false` or `profile_tenant_id: null` → That's the issue!

### Option 2: Run SQL Query Directly

Open SQL Editor: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/sql

```sql
-- Check if profile exists for the test user
SELECT
  id,
  user_id,
  tenant_id,
  full_name
FROM profiles
WHERE user_id = 'e71b2c84-7cea-433d-b9db-459cd6e91d50'  -- Test user
LIMIT 1;

-- Check if test data exists
SELECT
  COUNT(*) as total_contacts,
  tenant_id
FROM contacts
WHERE first_name ILIKE '%sarah%'
GROUP BY tenant_id;
```

**If profile query returns no rows** → Root cause confirmed!

## Fixes (Choose Based on Diagnosis)

### Fix A: Simplest - Assume user.id == tenant_id

**Use if:** You don't need multi-tenancy right now

**File:** `supabase/functions/universal-search/index.ts`

**Replace lines 170-184 with:**

```typescript
// Get tenant ID from profiles table
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("tenant_id")
  .eq("user_id", user.id)
  .maybeSingle();

// Use profile tenant_id if available, otherwise use user.id
// NOTE: For single-tenant-per-user setups, user.id works as tenant_id
const tenantId = profile?.tenant_id || user.id;

console.log("🔍 Profile lookup result:", {
  profile_exists: !!profile,
  profile_tenant_id: profile?.tenant_id,
  using_tenant_id: tenantId,
  fallback_used: !profile?.tenant_id,
  profile_error: profileError?.message,
});
```

**Then deploy:**
```bash
supabase functions deploy universal-search --project-ref sthnezuadfbmbqlxiwtq
```

### Fix B: Create Missing Profile

**Use if:** Profile should exist but doesn't

**Run SQL:**

```sql
-- Find the user's ID (if you don't know it)
-- Option 1: Check auth logs in Supabase dashboard
-- Option 2: User ID appears in edge function logs

-- Create profile for the user
INSERT INTO profiles (user_id, tenant_id, full_name, created_at, updated_at)
VALUES (
  'e71b2c84-7cea-433d-b9db-459cd6e91d50',  -- Replace with actual user_id
  '5098bedb-a0bc-40ae-83fa-799df8f44981',  -- Tenant with test data
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981';
```

### Fix C: Verify Test Data Tenant ID

**Use if:** Profile exists but test data has wrong tenant_id

**Run SQL:**

```sql
-- Check which tenant_id has the "sarah" contact
SELECT
  tenant_id,
  first_name,
  last_name,
  id
FROM contacts
WHERE first_name ILIKE '%sarah%'
LIMIT 5;

-- If tenant_id doesn't match profile, update test data:
UPDATE contacts
SET tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = 'YOUR_USER_ID')
WHERE first_name ILIKE '%sarah%';
```

## Verification Steps

After applying fix:

1. **Deploy edge function** (if code changed):
   ```bash
   supabase functions deploy universal-search --project-ref sthnezuadfbmbqlxiwtq
   ```

2. **Test in browser**:
   - Open: https://smart-agent-platform.vercel.app
   - Login as: siriz04081@gmail.com
   - Search for: "sarah"
   - Should see dropdown with results

3. **Check logs** (confirm fix):
   - Open: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/logs/edge-functions
   - Look for:
     ```
     ✅ RPC results: { count: 4 }  // ← Should be > 0 now!
     ```

## Quick Test via SQL (Bypass Edge Function)

To test if RPC works directly (bypassing auth issues):

```sql
-- Test RPC function with known tenant_id
SELECT
  entity_type,
  name,
  subtitle,
  similarity,
  rrf_score
FROM search_all_entities_hybrid(
  'sarah',
  (SELECT ARRAY_AGG(0.1::float4)::vector(1536) FROM generate_series(1, 1536)),
  '5098bedb-a0bc-40ae-83fa-799df8f44981'::uuid,  -- Known tenant with test data
  ARRAY['contact'],
  0.0,  -- Low threshold to catch more results
  10
)
ORDER BY rrf_score DESC
LIMIT 5;
```

**Expected:** Should return Sarah Johnson and other contacts.

**If this works but edge function doesn't** → Confirms tenant_id lookup is the issue!

## Summary

1. **Check logs** to see if `fallback_used: true`
2. **If yes**: Profile missing or tenant_id null → Apply Fix A or Fix B
3. **Deploy and test**
4. **Success criteria**: Search for "sarah" returns results in dropdown

---

**Created:** 2026-02-01
**Status:** Diagnostic logging added, awaiting log inspection
