# ✅ Test Universal Search - Final Verification

## Quick Test (2 minutes)

### Step 1: Login
1. Open: **https://smart-agent-platform.vercel.app**
2. Login with:
   - Email: `siriz04081@gmail.com`
   - Password: [your password]

### Step 2: Test Search
1. Look for the **search bar** in the top header (next to logo)
2. Type: **sarah**
3. **Expected Result:**
   - Dropdown appears below search bar
   - Shows "Sarah Johnson" contact
   - Shows company/type info
   - Shows relevance score

### Step 3: Click Result
1. Click on the Sarah Johnson result
2. **Expected:** Navigates to contact detail page

### Step 4: Test Other Queries
- Type: **denver** → Should show properties/contacts with Denver
- Type: **922** → Should show entities with this number
- Type: **@** → Should show mention autocomplete

---

## If Search Works ✅

**Success!** The fix worked. Search is now functional.

Close this issue and move on to next task.

---

## If Search Still Broken ❌

### Check Browser Console

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Look for errors (red text)
4. Copy any errors and report them

### Check Network Tab

1. Open DevTools → **Network** tab
2. Type "sarah" in search
3. Look for request to `/functions/v1/universal-search`
4. Click on it
5. Check:
   - Status code (should be 200)
   - Response body (should have results)
   - Preview tab (should show JSON with results)

### Check Edge Function Logs

1. Open: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/logs/edge-functions
2. Filter to `universal-search`
3. Type "sarah" in the app search
4. Look for the 🔍 log messages:
   ```
   🔍 Auth user: { user_id: 'xxx' }
   🔍 Profile lookup result: {
     profile_exists: true,  ← Should be true
     using_tenant_id: '5098bedb-a0bc-40ae-83fa-799df8f44981'  ← Should match this
   }
   ✅ RPC results: { count: 1 }  ← Should be > 0
   ```

### Diagnostic SQL

If still broken, run this in Supabase SQL Editor:

```sql
-- Check if fix was applied correctly
SELECT
  'Profile Check' as test,
  p.email,
  p.tenant_id,
  CASE
    WHEN p.tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981' THEN '✅ CORRECT'
    ELSE '❌ WRONG - Fix failed!'
  END as status
FROM profiles p
WHERE p.email = 'siriz04081@gmail.com';

-- Check if data exists
SELECT
  'Data Check' as test,
  COUNT(*) as sarah_contacts,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM contacts
WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
  AND first_name ILIKE '%sarah%';
```

---

## Common Issues & Fixes

### Issue: "No results found" despite fix

**Possible causes:**
1. Browser cache - Hard refresh (Cmd+Shift+R)
2. Embeddings not generated - Wait 30 seconds, try again
3. Wrong tenant_id in profile - Re-run migration

**Fix:**
```bash
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1
supabase db push --linked
# Select YES when prompted
```

### Issue: Search bar not visible

**Cause:** Frontend not deployed or old version cached

**Fix:**
1. Hard refresh browser (Cmd+Shift+R)
2. Check if GlobalSearch component exists:
   ```bash
   grep -r "GlobalSearch" src/components/layout/AppHeader.tsx
   ```

### Issue: Dropdown appears but empty

**Cause:** API returns 200 but with 0 results

**Fix:** Check edge function logs for tenant_id mismatch

---

## Summary of Changes

### 1. Edge Function Updated ✅
- Added diagnostic logging
- Changed `single()` to `maybeSingle()`
- Deployed to production

### 2. Database Fixed ✅
- Migration applied: `20260202003000_fix_profile_tenant_mapping.sql`
- Profile for siriz04081@gmail.com now points to correct tenant
- Verified: Found 1 Sarah contact

### 3. Ready to Test ✅
- All fixes deployed
- Logs enabled for debugging
- Verification scripts created

---

## Next Steps

1. **Test now** - Login and search for "sarah"
2. **If works** - Close this issue
3. **If broken** - Follow diagnostic steps above and report findings

---

**Fix applied:** 2026-02-02
**Status:** ✅ Ready for testing
**Test URL:** https://smart-agent-platform.vercel.app
