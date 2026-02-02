# Manual Testing Instructions - Search Debug

## Status
- ✅ Enhanced debug logging deployed to production
- ✅ "See All Results" button fix deployed
- ⏳ Need to verify what API actually returns

## Quick Test (2 minutes)

### Step 1: Open Browser Console
1. Navigate to: https://smart-agent-platform.vercel.app
2. Login as: siriz04081@gmail.com (password: Test1234)
3. Open browser DevTools (F12 or Cmd+Option+I)
4. Go to **Console** tab

### Step 2: Search for "sarah"
1. Type "sarah" in the global search bar
2. Wait for results dropdown to appear
3. Check console output for debug logs

### Step 3: Look for Debug Output

You should see a console log like this:
```
🔍 Search API Response: {
  query: "sarah",
  total: 21,
  documents: 5,
  contacts: 6,
  properties: 5,
  deals: 5,
  first5: [
    { type: "contact", name: "Sarah Johnson" },
    { type: "contact", name: "Sarah Johnson" },
    { type: "document", name: "922_Sharondale..." },
    ...
  ]
}
```

### Step 4: Analyze Results

**If first5 shows contacts named "Sarah Johnson":**
- ✅ API is working correctly
- ❌ Frontend filtering bug - results being hidden somehow
- **Fix**: Check SearchResultsDropdown component

**If first5 shows only "922 Sharondale" documents:**
- ❌ API returning wrong data
- **Fix**: Check database RPC function or Edge Function logic

## Advanced Test (Browser Console API Call)

If you want to test the API directly, run this in browser console:

```javascript
// Get current session token
const session = await supabase.auth.getSession();
const token = session.data.session.access_token;

// Call search API directly
const response = await fetch('https://txngwdagqnjkeykcmviq.supabase.co/functions/v1/universal-search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: 'sarah',
    entityTypes: ['document', 'contact', 'property', 'deal'],
    matchThreshold: 0.1,
    matchCountPerType: 5
  })
});

const data = await response.json();
console.log('API Direct Response:', data);
console.log('Total Results:', data.results?.length);
console.log('By Type:', data.results?.reduce((acc, r) => {
  acc[r.entity_type] = (acc[r.entity_type] || 0) + 1;
  return acc;
}, {}));
console.log('First 10 Results:', data.results?.slice(0, 10));
```

## Test "See All Results" Button

1. Type "sarah" in search
2. Wait for dropdown
3. Click "See All Results (21)" button at bottom
4. **Expected**: Navigate to `/search?q=sarah`
5. **If nothing happens**: Outside click handler still blocking button

## Next Steps Based on Results

### If API returns Sarah Johnson contacts:
1. Check React Query cache for stale data
2. Examine SearchResultsDropdown filtering logic
3. Check if `results` prop is being modified before rendering

### If API returns only "922 Sharondale" documents:
1. Check Supabase Edge Function logs in dashboard
2. Run SQL query directly against database
3. Check if embeddings are being generated correctly
4. Verify search_text column contains "sarah" for contacts

## Quick Fixes to Try

### Clear React Query Cache
```javascript
// In browser console
queryClient.clear();
// Then refresh page
```

### Check localStorage/sessionStorage
```javascript
// See if any cached search results
console.log(localStorage);
console.log(sessionStorage);
```

## Report Back

Please share:
1. Screenshot of console showing debug output
2. What `first5` array contains
3. Whether "See All Results" button works
4. Any errors in console

This will help me identify if the bug is:
- ❌ Backend (API/database returning wrong data)
- ❌ Frontend (filtering/caching showing wrong results)
