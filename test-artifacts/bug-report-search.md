# Search Bug Report - 2026-02-02

## Executive Summary

Testing revealed critical search functionality bugs after initial implementation. Search infrastructure works but returns incorrect results.

## Bug #1: Search Returns Wrong Results ❌ CRITICAL

**Severity:** Critical
**Status:** Under Investigation

**Description:**
Searching for "sarah" returns only "922 Sharondale Dr" documents instead of contacts named Sarah Johnson.

**Expected Behavior:**
- Search for "sarah" should return Sarah Johnson contacts (6 results)
- Should also return properties/documents containing "sarah"

**Actual Behavior:**
- API reports finding 21 total results (All: 21, Contacts: 6, Documents: 5, Properties: 5)
- But dropdown only shows 5 documents, all "922_Sharondale_Dr___General_Home_Inspection_Report 2"
- No Sarah Johnson contacts appear despite Contacts (6) tab showing 6 results

**Evidence:**
![Search Bug](../screenshots/search-wrong-results.png)

**Investigation:**
1. ✅ Frontend passes query correctly to API (`query: "sarah"`)
2. ✅ Edge Function receives query and passes to RPC (`p_query: "sarah"`)
3. ✅ Database function uses `websearch_to_tsquery('english', p_query)` correctly
4. ❌ API appears to return wrong results OR frontend filters incorrectly

**Root Cause Hypothesis:**
- **Theory 1:** Database RPC returning hardcoded/cached results
- **Theory 2:** Frontend result grouping logic filtering incorrectly
- **Theory 3:** Embedding mismatch causing wrong vector results

**Debugging Steps Taken:**
1. Verified query parameter passed from GlobalSearch component
2. Verified useGlobalSearch hook passes query to API
3. Verified Edge Function extracts query from request body
4. Verified database function signature accepts p_query parameter
5. Deployed auth fix (JWT token passing)
6. Added debug logging to useGlobalSearch hook

**Next Steps:**
1. Check Supabase Edge Function logs for actual API responses
2. Verify database RPC function returns correct results via direct SQL query
3. Check if React Query is caching stale results
4. Test API endpoint directly with curl/Postman

---

## Bug #2: "See All Results" Button Not Working ⚠️ HIGH

**Severity:** High
**Status:** Partially Tested

**Description:**
"See All Results" button appears in search dropdown but navigation may not work.

**Expected Behavior:**
- Click "See All Results (21)" button
- Navigate to `/search?q=sarah`
- Show comprehensive search results page

**Actual Behavior:**
- Button visible with correct count (21)
- **Not yet confirmed if click works** - dropdown closes before testing completed

**Investigation:**
1. ✅ handleViewAllResults defined in GlobalSearch.tsx
2. ✅ Passed to SearchResultsDropdown as onViewAllResults prop
3. ✅ Button wired with onClick={onViewAllResults}
4. ❌ Did not successfully test click behavior

**Next Steps:**
1. Test button click in stable environment
2. Verify navigation to /search page works
3. Verify search results page displays correctly

---

## Environment

**URL:** https://smart-agent-platform.vercel.app
**User:** siriz04081@gmail.com
**Test Data:**
- Sarah Johnson (contact) - Johnson Realty Group
- Sarah Johnson (contact) - Johnson Properties LLC
- Test documents containing "922 Sharondale"

**Browser:** Headless Chromium via agent-browser
**Date:** 2026-02-02

---

## Fixes Applied

###  Fix 1: JWT Token Authentication ✅ DEPLOYED

**File:** `supabase/functions/universal-search/index.ts:152`

**Problem:** Edge Function calling `supabase.auth.getUser()` without token parameter causing 401 errors

**Fix:**
```typescript
// Before
const { data: { user }, error } = await supabase.auth.getUser();

// After
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);
```

**Deployment:** Deployed via `npx supabase functions deploy universal-search`

**Validation:** Still seeing 401 errors - deployment may not have propagated or fix incomplete

---

## Debug Logging Added

**File:** `src/hooks/useGlobalSearch.ts`

Added console logging to see API response structure:
```typescript
console.log('🔍 Search API Response:', {
  query,
  total: data.results?.length || 0,
  byType: data.results?.reduce((acc, r) => {
    acc[r.entity_type] = (acc[r.entity_type] || 0) + 1;
    return acc;
  }, {}),
  firstResult: data.results?.[0]
});
```

**Status:** Deployed to Vercel, awaiting propagation

---

## Recommended Actions

### Immediate (P0)
1. ✅ Deploy auth fix - **DONE**
2. ⏳ Wait for deployment propagation - **IN PROGRESS**
3. ❌ Test with fresh browser session - **ATTEMPTED, STILL FAILING**
4. ⏹️ Check Supabase Edge Function logs - **TODO**

### Short Term (P1)
1. Debug why API returns wrong results
2. Test "See All Results" button navigation
3. Verify search results page works
4. Add E2E tests for search flow

### Medium Term (P2)
1. Add automated QA tests using smart-agent-browser-qa skill
2. Add monitoring/alerting for search API errors
3. Add analytics to track search usage patterns
4. Optimize search result ranking

---

## Test Cases Failed

- [ ] Search for contact name returns correct contacts
- [ ] Search dropdown shows mixed entity types
- [ ] "See All Results" button navigates to search page
- [ ] Contact detail page accessible from search results

## Test Cases Passed

- [x] Search API accepts query parameter
- [x] Search dropdown shows result counts per entity type
- [x] Search results grouped by entity type in frontend
- [x] "See All Results" button renders with count

---

## Screenshots

1. `search-wrong-results.png` - Shows "922 Sharondale" documents for "sarah" query
2. `search-contacts-filter.png` - Contacts filter tab (dropdown closed before viewing)
3. `search-fresh-session.png` - Same wrong results after fresh login

---

## Next Debugging Session

1. Check Supabase dashboard for Edge Function logs
2. Run SQL query directly against database to verify RPC function
3. Test API with curl bypassing frontend
4. Check React Query devtools for cached results
5. Simplify test - search for "922" (known working query)
6. Compare "922" results vs "sarah" results to find difference
