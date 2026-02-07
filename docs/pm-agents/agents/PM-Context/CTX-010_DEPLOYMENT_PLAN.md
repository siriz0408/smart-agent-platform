# CTX-010: Deployment Plan

**Migration:** `20260207080000_ctx010_add_metadata_to_document_chunks.sql`
**Status:** Ready for deployment
**Risk:** Low (additive-only migration)

---

## Pre-Deployment Checklist

- [x] Migration file created
- [x] Investigation completed
- [x] Risk assessment: LOW
- [ ] Human approval obtained
- [ ] Backlog updated

---

## Deployment Commands

### Option 1: Automated deployment (Recommended)
```bash
npm run db:migrate
```

### Option 2: Manual deployment
```bash
npx supabase db push
```

### Option 3: Via Supabase Dashboard
1. Go to https://app.supabase.com/project/sthnezuadfbmbqlxiwtq/sql
2. Open SQL Editor
3. Paste contents of migration file
4. Execute

---

## Post-Deployment Verification

### Step 1: Verify column exists
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'document_chunks'
  AND column_name = 'metadata';

-- Expected: 1 row returned
-- column_name: metadata
-- data_type: jsonb
-- is_nullable: YES
```

### Step 2: Verify indexes created
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'document_chunks'
  AND indexname LIKE '%metadata%';

-- Expected: 2 indexes
-- idx_document_chunks_metadata (GIN index)
-- idx_document_chunks_page_metadata (partial index on page_start)
```

### Step 3: Test document upload
1. Go to production app
2. Upload a PDF document
3. Check if chunks have metadata:
```sql
SELECT id, document_id, chunk_index,
       metadata->>'page_start' as page_start,
       metadata->>'page_end' as page_end,
       metadata->>'section' as section
FROM document_chunks
WHERE document_id = '<newly_uploaded_doc_id>'
ORDER BY chunk_index
LIMIT 5;

-- Expected: page_start, page_end populated for PDF chunks
```

---

## Rollback Plan (if needed)

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_document_chunks_page_metadata;
DROP INDEX IF EXISTS idx_document_chunks_metadata;

-- Drop column
ALTER TABLE public.document_chunks
  DROP COLUMN IF EXISTS metadata;
```

**When to rollback:**
- Migration causes errors
- Production document uploads fail
- Performance degradation observed

**Note:** Rollback is safe as column is nullable and newly added.

---

## Timeline

- **Created:** 2026-02-07 (Cycle 9)
- **Ready for deployment:** 2026-02-07
- **Target deployment:** Immediate (waiting for human approval)
- **Estimated downtime:** 0 seconds (online migration)

---

## Success Metrics

- ✅ Migration completes without errors
- ✅ Column and indexes exist in production
- ✅ Document uploads continue to work
- ✅ New chunks have metadata populated
- ✅ No performance degradation observed
