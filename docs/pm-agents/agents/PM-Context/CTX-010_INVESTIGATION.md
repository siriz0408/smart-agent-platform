# CTX-010: Add metadata column to document_chunks - Investigation Report

**Date:** 2026-02-07
**Agent:** PM-Context
**Priority:** P1
**Status:** Migration Created, Pending Deployment

---

## Problem Statement

The `document_chunks` table is missing a `metadata` JSONB column that the `index-document` edge function expects to exist. This mismatch was introduced in CTX-004 (PDF parsing improvements) where the function code was updated but the corresponding database migration was never created.

---

## Root Cause Analysis

### Timeline
1. **CTX-004 completed (2026-02-06)**: Enhanced PDF parsing with page-aware chunking
   - Added metadata extraction: `page_start`, `page_end`, `section`
   - Updated `index-document` function to insert `metadata` column
2. **Missing step**: Database migration to add `metadata` column was never created
3. **Current state**: Function attempts to insert into non-existent column

### Code Evidence

**File:** `supabase/functions/index-document/index.ts` (lines 1091-1107)
```typescript
// Build metadata object for the chunk
const chunkMetadata: Record<string, unknown> = {};
if (chunkMeta.pageStart !== null) chunkMetadata.page_start = chunkMeta.pageStart;
if (chunkMeta.pageEnd !== null) chunkMetadata.page_end = chunkMeta.pageEnd;
if (chunkMeta.sectionHeader) chunkMetadata.section = chunkMeta.sectionHeader;

const insertData: Record<string, unknown> = {
  document_id: documentId,
  tenant_id: document.tenant_id,
  chunk_index: i,
  content: chunkMeta.content,
  embedding: JSON.stringify(embedding),
};

// Only add metadata if we have any (avoid overwriting with empty object)
if (Object.keys(chunkMetadata).length > 0) {
  insertData.metadata = chunkMetadata; // ⚠️ Column doesn't exist!
}
```

**Current schema:** `supabase/migrations/20260128160937_*.sql` (lines 144-151)
```sql
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  -- ⚠️ NO metadata column
);
```

---

## Impact Assessment

### Current Impact
- **Severity:** Medium (function likely silently fails to insert metadata)
- **User Impact:** PDF uploads may still work, but rich metadata is lost
- **Data Loss:** Page numbers and section headers not stored since CTX-004

### Potential Issues
1. Insert failures on document upload (if Supabase rejects unknown columns)
2. Silent metadata loss (if Supabase ignores unknown columns)
3. RAG quality degradation (chunks lack page context for better retrieval)

### Benefits of Fix
- Enable page-level citation in AI responses ("According to page 5...")
- Better chunk context for improved RAG accuracy
- Section-based filtering ("Show me the financial disclosures section")

---

## Solution

### Migration Created
**File:** `supabase/migrations/20260207080000_ctx010_add_metadata_to_document_chunks.sql`

**Changes:**
1. Add `metadata JSONB DEFAULT NULL` column
2. Create GIN index on metadata (supports JSON queries)
3. Create partial index on `page_start` (optimizes page-based filtering)

**Deployment Steps:**
```bash
# Test locally (if Supabase CLI configured)
npx supabase db reset

# Deploy to production
npm run db:migrate
# OR
npx supabase db push

# Verify deployment
# Expected: metadata column exists, indexes created
```

**Verification Query:**
```sql
-- Run after deployment
SELECT
  count(*) as total_chunks,
  count(metadata) as chunks_with_metadata,
  count(metadata->>'page_start') as chunks_with_pages
FROM document_chunks;

-- Expected for existing chunks:
-- total_chunks: N
-- chunks_with_metadata: 0 (old chunks have NULL)
-- chunks_with_pages: 0 (old chunks have NULL)

-- After new uploads:
-- chunks_with_metadata should increase
-- chunks_with_pages should increase
```

---

## Recommendations

### Immediate (P1)
1. ✅ **DONE**: Create migration file
2. **TODO**: Deploy migration to production
3. **TODO**: Test document upload in production
4. **TODO**: Verify metadata is being stored

### Follow-up (P2)
- **CTX-011**: Re-index existing documents to populate metadata
  - Estimate: ~500 documents × 10 chunks = 5,000 chunks to re-index
  - Impact: Existing documents will gain page metadata
  - Risk: Re-indexing cost (API calls, compute time)

### Process Improvement
- **Add pre-deployment checklist**: Verify migrations exist for schema changes
- **Automated validation**: CI check that edge functions don't reference non-existent columns
- **Testing**: Add integration test that verifies metadata column exists before function deploy

---

## Task Status Update

### Completed
- [x] Investigated schema mismatch
- [x] Identified root cause (CTX-004 incomplete)
- [x] Created migration file
- [x] Documented findings

### Next Steps
1. Human approval to deploy migration
2. Deploy to production (`npm run db:migrate`)
3. Verify in production
4. Update BACKLOG.md with CTX-011 status
5. Close CTX-010

---

## Risk Assessment

**Risk Level:** Low
- Migration is additive (no data loss risk)
- Default NULL is safe (no breaking changes)
- Indexes improve performance (no negative impact)
- Rollback available (DROP COLUMN if needed)

**Confidence:** High
- Migration tested locally (syntax valid)
- Edge function code already expects this column
- Indexes follow PostgreSQL best practices
