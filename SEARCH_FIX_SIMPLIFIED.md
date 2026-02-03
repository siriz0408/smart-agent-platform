# Search Fix: Remove Fake Embeddings, Use Real Keyword Search

**Date:** 2026-02-03
**Status:** ✅ READY TO DEPLOY

## Problem

The search system was broken due to:

1. **Fake semantic embeddings** - Using `generateDeterministicEmbedding()` which creates pseudo-random numbers from MD5 hashes instead of real AI embeddings
2. **Overcomplicated architecture** - RRF (Reciprocal Rank Fusion) hybrid search combining broken vector search + keyword search
3. **Wrong results** - Searching for "sarah" returned documents about "922 Sharondale Dr" instead of Sarah Johnson contacts

## Root Cause

The deterministic embedding function generates "embeddings" that don't represent semantic meaning:

```typescript
// ❌ This doesn't capture meaning - just generates random-looking numbers
function generateDeterministicEmbedding(text: string): number[] {
  const hash = createHash("md5").update(text).digest("hex");
  // ... generates 1536 pseudo-random numbers from hash
}
```

This made vector search completely useless, while adding complexity.

## Solution

**Simplify to keyword-only search using PostgreSQL full-text search**

### Changes Made

#### 1. Database Migration (`20260203000000_simplify_search_keyword_only.sql`)
- ❌ Removed `search_all_entities_hybrid()` (with fake vector search)
- ✅ Created `search_all_entities()` (keyword-only)
- Uses PostgreSQL's `to_tsvector()` and `websearch_to_tsquery()`
- Added `ILIKE` fallback for partial matches
- Increased default results from 5 to 10 per entity type

#### 2. Edge Function (`supabase/functions/universal-search/index.ts`)
- Removed `generateDeterministicEmbedding` import
- Removed `matchThreshold` parameter (not needed for keyword search)
- Updated RPC call to use `search_all_entities()`
- Simplified SearchResult interface (removed `similarity`, `rrf_score`)

#### 3. Frontend Hook (`src/hooks/useGlobalSearch.ts`)
- Updated `SearchResult` interface (kept only `text_rank`)
- Removed `matchThreshold` parameter
- Increased default `matchCountPerType` from 5 to 10
- Updated documentation

#### 4. UI Component (`src/components/search/SearchResultsDropdown.tsx`)
- Changed relevance badge to use `text_rank` instead of `rrf_score`
- Only show badge if `text_rank > 0`

## Benefits

✅ **Actually works** - Uses proven PostgreSQL full-text search
✅ **Simpler** - Removed ~200 lines of complex vector search logic
✅ **Faster** - No embedding generation overhead
✅ **More results** - Increased from 5 to 10 per entity type
✅ **Better matches** - Added `ILIKE` fallback for partial matches

## How It Works Now

1. User types "sarah" in search box
2. Frontend calls `/functions/v1/universal-search` with `query: "sarah"`
3. Edge function calls `search_all_entities()` database function
4. PostgreSQL searches:
   - **Documents**: name, ai_summary, category
   - **Contacts**: first_name, last_name, email, company
   - **Properties**: address, city, state
   - **Deals**: search_text
5. Returns ranked results by `text_rank` (keyword relevance)

## Search Examples

```sql
-- Search for contact name
SELECT * FROM search_all_entities('sarah', tenant_id, ARRAY['contact'], 10);
-- Returns: Sarah Johnson contacts ranked by name match

-- Search for property address
SELECT * FROM search_all_entities('922 sharondale', tenant_id, ARRAY['property'], 10);
-- Returns: 922 Sharondale Dr properties

-- Multi-entity search
SELECT * FROM search_all_entities('denver', tenant_id, ARRAY['contact','property','deal'], 10);
-- Returns: All entities mentioning Denver
```

## Deployment Steps

1. Push migration to Supabase:
   ```bash
   npm run db:push
   ```

2. Deploy edge function:
   ```bash
   npx supabase functions deploy universal-search
   ```

3. Test in browser:
   - Search for "sarah" → should show Sarah Johnson contacts
   - Search for "922" → should show 922 Sharondale properties/documents
   - Search for company names, cities, etc.

## Future Enhancements (Optional)

If you later want real semantic search:

1. Use a proper embedding service (OpenAI, Anthropic, or Voyage AI)
2. Generate embeddings during document indexing
3. Re-introduce vector search alongside keyword search
4. Use RRF fusion for best results

For now, keyword search is reliable and sufficient.

## Files Changed

- ✅ `supabase/migrations/20260203000000_simplify_search_keyword_only.sql` (NEW)
- ✅ `supabase/functions/universal-search/index.ts`
- ✅ `src/hooks/useGlobalSearch.ts`
- ✅ `src/components/search/SearchResultsDropdown.tsx`

## Testing

After deployment, test these scenarios:

- [ ] Search for "sarah" returns Sarah Johnson contacts
- [ ] Search for "johnson" returns Johnson Realty contacts
- [ ] Search for "922" returns 922 Sharondale documents/properties
- [ ] Search for city name returns properties in that city
- [ ] Search for email returns matching contacts
- [ ] "See All Results" button navigates to `/search?q=query`
- [ ] Filter by entity type works (Documents, Contacts, Properties, Deals)
