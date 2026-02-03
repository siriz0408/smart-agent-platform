# Search Test - Simplified Keyword Search

**Date:** 2026-02-03
**Status:** Ready to Test

## What Was Fixed

✅ Removed fake deterministic embeddings
✅ Simplified to keyword-only search using PostgreSQL full-text search
✅ Database function changed from `search_all_entities_hybrid` to `search_all_entities`
✅ Edge function deployed
✅ Frontend updated to use `text_rank` instead of `rrf_score`

## Test Cases

### Test 1: Search for Contact Name
**Search:** `sarah`
**Expected:** Should return Sarah Johnson contacts
**Before:** Returned wrong documents ("922 Sharondale Dr")
**After:** Should show actual Sarah Johnson contacts

### Test 2: Search for Property Address
**Search:** `922 sharondale`
**Expected:** Should return 922 Sharondale Dr properties/documents

### Test 3: Search for Company
**Search:** `johnson realty`
**Expected:** Should return Johnson Realty Group contacts

### Test 4: Search for City
**Search:** `denver`
**Expected:** Should return properties, contacts, deals in Denver

### Test 5: Partial Search
**Search:** `sha`
**Expected:** Should return partial matches (Sharon, Sharondale, etc.)

## How to Test

### Option 1: Browser Testing
1. Open https://smart-agent-platform.vercel.app
2. Login with your account
3. Use the search bar (top navigation)
4. Try each test case above
5. Verify results match expected outcomes

### Option 2: API Testing
```bash
# Get your auth token from browser DevTools
# Application > Local Storage > sb-access-token

curl -X POST https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/universal-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "sarah",
    "entityTypes": ["contact", "document", "property"],
    "matchCountPerType": 10
  }'
```

## Expected Behavior

### Search Dropdown
- Shows results grouped by entity type
- Displays relevance score (text_rank) if > 0
- Shows "See All Results" button if more than 5 results per type
- Each result shows name, subtitle, and metadata preview

### Search Results Page (/search?q=query)
- Full list of all matching results
- Grouped by entity type (Documents, Contacts, Properties, Deals)
- Click on result navigates to detail page

## Debugging

If search still doesn't work:

1. **Check Edge Function Logs**
   - Go to Supabase Dashboard > Edge Functions > universal-search > Logs
   - Look for RPC errors or database connection issues

2. **Check Database Function**
   ```sql
   -- Run directly in Supabase SQL Editor
   SELECT * FROM search_all_entities(
     'sarah',
     'YOUR_TENANT_ID'::uuid,
     ARRAY['contact', 'document', 'property', 'deal'],
     10
   );
   ```

3. **Check Browser Console**
   - Open DevTools > Console
   - Look for "🔍 Search API Response" logs
   - Verify query, total count, and entity type breakdown

4. **Check Network Tab**
   - Look for POST request to `/functions/v1/universal-search`
   - Check request payload and response

## Success Criteria

- [ ] Search for "sarah" returns Sarah Johnson contacts (not random documents)
- [ ] Search for "922" returns 922 Sharondale properties/documents
- [ ] Search for company names returns matching contacts
- [ ] Search for cities returns relevant properties
- [ ] Partial searches work (ILIKE fallback)
- [ ] "See All Results" button navigates correctly
- [ ] Result cards show correct metadata
- [ ] Entity type filters work
- [ ] Relevance scores display correctly

## Rollback Plan

If the simplified search doesn't work:

1. The old `search_all_entities_hybrid` function was dropped, so you'd need to restore it from:
   - Migration: `supabase/migrations/20260202001000_create_unified_search.sql`

2. Restore edge function:
   - Revert `supabase/functions/universal-search/index.ts` changes
   - Add back `generateDeterministicEmbedding` import and call

3. Restore frontend:
   - Revert `src/hooks/useGlobalSearch.ts` (add back rrf_score, similarity)
   - Revert `src/components/search/SearchResultsDropdown.tsx` (use rrf_score for badge)

But this should not be necessary - the simplified search is more reliable!
