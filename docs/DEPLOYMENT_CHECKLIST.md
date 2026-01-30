# Database Optimization Deployment Checklist

## Overview

This checklist guides you through deploying 14 database optimization migrations to Supabase safely.

**Total Migrations**: 14
**Expected Duration**: 30-60 minutes (including verification)
**Risk Level**: Medium (schema changes, includes denormalization)

---

## Pre-Deployment Checklist

### ☐ 1. Environment Verification

```bash
# Check Supabase CLI is installed
supabase --version
# Should show: supabase 1.x.x

# Check you're linked to the correct project
supabase status
# Should show your project details

# Verify environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_PUBLISHABLE_KEY
# Both should be set
```

**If not linked:**
```bash
supabase link --project-ref your-project-ref
```

---

### ☐ 2. Backup Current Database

**CRITICAL: Always backup before schema changes**

```bash
# Option 1: Supabase dashboard backup
# Go to: Settings > Database > Backups > Create backup

# Option 2: pg_dump backup (if you have direct access)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Option 3: Supabase CLI (if available)
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql
```

**Verify backup exists:**
```bash
ls -lh backup-*.sql
```

---

### ☐ 3. Review Migration Files

**Verify all 14 migrations exist:**

```bash
ls -1 supabase/migrations/202601301*.sql \
     supabase/migrations/202601311*.sql \
     supabase/migrations/202602011*.sql

# Should list 14 files
```

**Check for syntax errors (optional):**
```bash
# If you have postgres locally
for file in supabase/migrations/202601*.sql supabase/migrations/202602*.sql; do
  echo "Checking: $(basename $file)"
  psql -d postgres --dry-run -f "$file" 2>&1 | grep -i error || echo "  ✓ OK"
done
```

---

### ☐ 4. Notify Team (If Production)

**If deploying to production:**
- [ ] Notify team in Slack/Discord
- [ ] Schedule maintenance window (15-30 min)
- [ ] Set status page to "maintenance" (if applicable)
- [ ] Ensure no active deployments in progress

**If deploying to staging/dev:**
- [ ] Notify developers using staging
- [ ] Check no one is running tests

---

### ☐ 5. Check Current Database State

```bash
# Check current migration status
supabase db remote ls

# Note the last applied migration timestamp
# Our new migrations start at: 20260130120000
```

**Check for existing data:**
```bash
# Check if document_chunks table has data
supabase db execute "SELECT COUNT(*) FROM document_chunks"

# Check if documents table has data
supabase db execute "SELECT COUNT(*) FROM documents"

# These numbers will help verify denormalization worked
```

---

## Deployment Steps

### Phase 1: Deploy Sprint 1 (Critical Performance)

**Migrations**: 5 files (20260130120000 - 20260130124000)

```bash
# Push all migrations at once
supabase db push

# OR push incrementally (safer for first time)
supabase db push --include-migrations 20260130120000
supabase db push --include-migrations 20260130121000
supabase db push --include-migrations 20260130122000
supabase db push --include-migrations 20260130123000
supabase db push --include-migrations 20260130124000
```

**Expected output:**
```
Applying migration 20260130120000_add_document_chunks_performance_indexes.sql...
Applying migration 20260130121000_add_usage_records_performance_indexes.sql...
Applying migration 20260130122000_add_tenant_id_indexes.sql...
Applying migration 20260130123000_add_foreign_key_indexes_phase1.sql...
Applying migration 20260130124000_denormalize_tenant_id_to_chunks.sql...
Finished supabase db push.
```

**⚠️ Watch for errors:**
- If any migration fails, STOP and review the error
- Do NOT continue to next phase
- See "Troubleshooting" section below

---

### ☐ 6. Verify Phase 1 (Sprint 1)

**Run quick verification:**
```bash
./scripts/verify-database-migrations.sh
```

**Expected**: All Sprint 1 checks should pass

**Manual spot checks:**
```bash
# Check document_chunks has tenant_id column
supabase db execute "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='document_chunks' AND column_name='tenant_id'"
# Should show: tenant_id | NO

# Check no NULL tenant_ids
supabase db execute "SELECT COUNT(*) FROM document_chunks WHERE tenant_id IS NULL"
# Should return: 0

# Check index exists
supabase db execute "SELECT indexname FROM pg_indexes WHERE tablename='document_chunks' AND indexname='idx_document_chunks_doc_idx'"
# Should show: idx_document_chunks_doc_idx
```

**If verification fails**: See "Rollback" section

---

### Phase 2: Deploy Sprint 2 (High-Priority Optimizations)

**Migrations**: 4 files (20260131120000 - 20260131123000)

```bash
supabase db push
```

**Expected**: 4 more migrations applied

---

### ☐ 7. Verify Phase 2 (Sprint 2)

```bash
# Check partial indexes
supabase db execute "SELECT indexname FROM pg_indexes WHERE indexname LIKE '%_active' OR indexname LIKE '%_gin'"
# Should list 9+ indexes

# Check GIN index works
supabase db execute "EXPLAIN SELECT * FROM contacts WHERE tags @> ARRAY['VIP']"
# Should mention GIN index
```

---

### Phase 3: Deploy Sprint 3 (Monitoring & Maintenance)

**Migrations**: 5 files (20260201120000 - 20260201130000)

```bash
supabase db push
```

**Expected**: 5 more migrations applied (including verification helpers)

---

### ☐ 8. Verify Phase 3 (Sprint 3)

```bash
# Check monitoring views exist
supabase db execute "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname IN ('slow_queries', 'unused_indexes', 'index_health')"
# Should return 3 views

# Test a monitoring view
supabase db execute "SELECT * FROM slow_queries LIMIT 5"
# Should return query stats (may be empty if no slow queries)

# Check archival function
supabase db execute "SELECT proname FROM pg_proc WHERE proname='archive_old_usage_records'"
# Should return: archive_old_usage_records
```

---

## Post-Deployment Verification

### ☐ 9. Run Full Test Suite

**Bash verification (quick):**
```bash
./scripts/verify-database-migrations.sh
```

**Expected output:**
```
==========================================
Results:
==========================================
Passed: 18
Failed: 0

All verification checks passed! ✓
```

---

### ☐ 10. Run Integration Tests

**Set environment variables:**
```bash
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

**Run tests:**
```bash
npm test database-migration-verification.test.ts
```

**Expected output:**
```
✓ Sprint 1: Critical Performance Indexes (6)
✓ Sprint 2: Partial and GIN Indexes (3)
✓ Sprint 3: Monitoring and Maintenance (4)
✓ Performance Validation (3)
✓ Edge Function Compatibility (1)

Test Files  1 passed (1)
     Tests  17 passed (17)
```

**If tests fail**: Review errors and see "Troubleshooting"

---

### ☐ 11. Verify Edge Functions Still Work

**Test document indexing:**
```bash
# Upload a test document via UI or API
# Check it processes successfully
# Verify chunks are created with tenant_id

# Or manually test:
supabase db execute "
  INSERT INTO documents (tenant_id, name, file_path, file_type)
  VALUES (
    (SELECT id FROM tenants LIMIT 1),
    'test.pdf',
    '/test/test.pdf',
    'application/pdf'
  )
  RETURNING id
"
# Note the document ID

# Insert a chunk (simulating edge function)
supabase db execute "
  INSERT INTO document_chunks (document_id, tenant_id, chunk_index, content, embedding)
  VALUES (
    'document-id-from-above',
    (SELECT tenant_id FROM documents WHERE id = 'document-id-from-above'),
    0,
    'Test chunk',
    '[0.1, 0.2, 0.3]'
  )
"
# Should succeed without errors
```

**Test AI chat:**
- Open app
- Try a document search query
- Verify results return quickly
- Check browser console for errors

---

### ☐ 12. Performance Benchmarking

**Before/After comparison:**

```bash
# Test 1: Document chunk retrieval
echo "Test: Document chunk retrieval"
time supabase db execute "
  SELECT * FROM document_chunks
  WHERE document_id = (SELECT id FROM documents LIMIT 1)
  ORDER BY chunk_index
  LIMIT 30
"
# Should be < 10ms

# Test 2: Usage quota check
echo "Test: Usage quota check"
time supabase db execute "
  SELECT COALESCE(SUM(quantity), 0)::int
  FROM usage_records
  WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
    AND record_type = 'ai_query'
    AND recorded_at >= now() - interval '30 days'
"
# Should be < 5ms

# Test 3: Tenant-filtered list
echo "Test: Tenant-filtered contact list"
time supabase db execute "
  SELECT * FROM contacts
  WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  ORDER BY updated_at DESC
  LIMIT 50
"
# Should be < 20ms
```

**Record results for comparison**

---

### ☐ 13. Check Query Plans Use Indexes

```bash
# Verify document_chunks uses composite index
supabase db execute "
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM document_chunks
  WHERE document_id = (SELECT id FROM documents LIMIT 1)
  ORDER BY chunk_index
  LIMIT 30
"
# Should show: Index Scan using idx_document_chunks_doc_idx
# Should NOT show: Seq Scan

# Verify tenant filtering uses index
supabase db execute "
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM contacts
  WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  LIMIT 100
"
# Should show: Index Scan using idx_contacts_tenant_id
# Should NOT show: Seq Scan
```

---

### ☐ 14. Monitor for Issues (First 24 Hours)

**Immediate checks (first hour):**
```bash
# Check for slow queries
supabase db execute "SELECT * FROM slow_queries LIMIT 10"

# Check all indexes being used
supabase db execute "
  SELECT indexname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND idx_scan = 0
  ORDER BY pg_relation_size(indexrelid) DESC
"
# Ideally no results (all indexes used)

# Check for errors in Supabase logs
# Dashboard > Logs > Postgres logs
# Look for: ERROR, FATAL, migration failed
```

**Daily checks (first week):**
```bash
# Monday: Check slow queries
supabase db execute "SELECT * FROM slow_queries WHERE mean_time_ms > 50 LIMIT 10"

# Wednesday: Check index health
supabase db execute "SELECT * FROM index_health WHERE cache_hit_ratio_pct < 90"

# Friday: Check table bloat
supabase db execute "SELECT * FROM table_maintenance_status WHERE dead_ratio_pct > 15"
```

---

## Rollback Procedure

### If Critical Issues Found

**⚠️ Only rollback if:**
- Migrations failed to apply
- Data corruption detected
- Critical performance regression
- Application is broken

**Do NOT rollback for:**
- Minor performance variations
- Single test failure (investigate first)
- Cosmetic issues

---

### Rollback Steps

**1. Identify which phase to rollback:**

- Sprint 3 only: Safest, least impact
- Sprint 2 only: Safe, no schema changes
- Sprint 1: Risky (denormalization), avoid if possible

**2. Rollback Sprint 3 (if needed):**

```sql
-- Drop monitoring views
DROP VIEW IF EXISTS slow_queries CASCADE;
DROP VIEW IF EXISTS unused_indexes CASCADE;
DROP VIEW IF EXISTS table_maintenance_status CASCADE;
DROP VIEW IF EXISTS index_health CASCADE;

-- Drop archival infrastructure
DROP TABLE IF EXISTS usage_records_archive CASCADE;
DROP FUNCTION IF EXISTS archive_old_usage_records() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_archives() CASCADE;

-- Drop verification helper functions
DROP FUNCTION IF EXISTS check_index_exists(text, text) CASCADE;
DROP FUNCTION IF EXISTS check_view_exists(text) CASCADE;
DROP FUNCTION IF EXISTS explain_query(text) CASCADE;

-- Drop Phase 2 FK indexes
DROP INDEX IF EXISTS idx_properties_listing_agent_id;
DROP INDEX IF EXISTS idx_ai_agents_created_by;
-- (see migration 20260201122000 for complete list)

-- Revert NOT NULL constraints
ALTER TABLE document_chunks ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE ai_messages ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE deal_milestones ALTER COLUMN deal_id DROP NOT NULL;
ALTER TABLE contact_agents ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE contact_agents ALTER COLUMN agent_user_id DROP NOT NULL;
```

**3. Rollback Sprint 2 (if needed):**

```sql
-- Drop partial indexes
DROP INDEX IF EXISTS idx_contacts_active;
DROP INDEX IF EXISTS idx_properties_active;
DROP INDEX IF EXISTS idx_notifications_unread;
-- (see migration 20260131120000 for complete list)

-- Drop GIN indexes
DROP INDEX IF EXISTS idx_contacts_tags_gin;
DROP INDEX IF EXISTS idx_properties_features_gin;
-- (see migration 20260131121000 for complete list)

-- Drop composite indexes
DROP INDEX IF EXISTS idx_documents_tenant_created;
DROP INDEX IF EXISTS idx_contacts_tenant_type_updated;
-- (see migration 20260131122000 for complete list)
```

**4. Rollback Sprint 1 (⚠️ HIGH RISK - Last Resort):**

**WARNING**: This rollback is complex due to denormalization

```sql
-- Step 1: Restore old RLS policy
DROP POLICY IF EXISTS "Users can view chunks in their tenant" ON document_chunks;

CREATE POLICY "Users can view document_chunks for their documents"
  ON document_chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- Step 2: Drop denormalization
DROP TRIGGER IF EXISTS sync_chunk_tenant_id_on_insert ON document_chunks;
DROP FUNCTION IF EXISTS sync_chunk_tenant_id() CASCADE;
DROP INDEX IF EXISTS idx_document_chunks_tenant_doc_idx;
DROP INDEX IF EXISTS idx_document_chunks_tenant_id;

-- Step 3: Remove tenant_id column
-- ⚠️ CRITICAL: This will fail if column is NOT NULL
-- Must first make it nullable
ALTER TABLE document_chunks ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE document_chunks DROP COLUMN tenant_id;

-- Step 4: Drop other Sprint 1 indexes
DROP INDEX IF EXISTS idx_document_chunks_doc_idx;
DROP INDEX IF EXISTS idx_usage_records_tenant_type_date;
DROP INDEX IF EXISTS idx_contacts_tenant_id;
-- (see migrations 20260130120000-123000 for complete list)

-- Step 5: Revert edge function changes
-- Manually remove tenant_id from chunk inserts in:
-- supabase/functions/index-document/index.ts:830
```

**5. After rollback:**
```bash
# Verify database is functional
./scripts/verify-database-migrations.sh
# Will show failures for rolled-back items (expected)

# Test application manually
# Verify documents can be uploaded
# Verify AI chat works
```

---

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Cause**: Migration already partially applied

**Fix**:
```bash
# Check migration status
supabase db remote ls

# If migration shows as applied but failed, manually fix:
# Remove the failed ALTER/CREATE statement
# Re-run migration
```

---

### Issue: "NULL value in column violates not-null constraint"

**Cause**: Denormalization backfill didn't complete

**Fix**:
```sql
-- Check for NULL values
SELECT COUNT(*) FROM document_chunks WHERE tenant_id IS NULL;

-- Manual backfill
UPDATE document_chunks dc
SET tenant_id = d.tenant_id
FROM documents d
WHERE dc.document_id = d.id
  AND dc.tenant_id IS NULL;

-- Verify
SELECT COUNT(*) FROM document_chunks WHERE tenant_id IS NULL;
-- Should be 0
```

---

### Issue: "Permission denied for table/function"

**Cause**: RLS or grant permissions not set correctly

**Fix**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'document_chunks';
-- rowsecurity should be true

-- Check grants on monitoring views
GRANT SELECT ON slow_queries TO authenticated;
GRANT SELECT ON index_health TO authenticated;
```

---

### Issue: Tests fail with "Function does not exist"

**Cause**: Verification helper functions migration not applied

**Fix**:
```bash
# Check if migration applied
supabase db execute "SELECT proname FROM pg_proc WHERE proname='check_index_exists'"

# If not, manually apply:
supabase db push --include-migrations 20260201130000
```

---

### Issue: Query still uses Seq Scan

**Cause**: Table too small, or statistics not updated

**Fix**:
```sql
-- Update table statistics
ANALYZE document_chunks;
ANALYZE contacts;
ANALYZE documents;

-- Re-check query plan
EXPLAIN SELECT * FROM contacts WHERE tenant_id = '...' LIMIT 100;
```

**Note**: For tables < 1000 rows, Postgres may choose Seq Scan (this is correct)

---

## Success Criteria

### ✅ Deployment Successful If:

- [ ] All 14 migrations applied without errors
- [ ] Bash verification script: 18/18 checks pass
- [ ] Integration tests: 17/17 tests pass
- [ ] No NULL tenant_ids in document_chunks
- [ ] Query plans use indexes (no Seq Scan on large tables)
- [ ] Edge functions work (document upload + AI chat)
- [ ] No errors in Supabase logs
- [ ] Performance improved (benchmark queries faster)

### 📊 Performance Targets

| Query | Before | After | Status |
|-------|--------|-------|--------|
| Chunk retrieval | 200ms | <50ms | ☐ |
| Usage quota | 100ms | <5ms | ☐ |
| Tenant list | 50ms | <20ms | ☐ |
| Tag search | 200ms | <20ms | ☐ |

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor slow_queries view daily
- [ ] Check index usage (idx_scan > 0)
- [ ] Verify no application errors
- [ ] Collect performance metrics

### Week 2-4
- [ ] Review index_health weekly
- [ ] Check for table bloat
- [ ] Plan Sprint 2 deployment (if phased)
- [ ] Document any issues found

### Month 1
- [ ] Run first usage archival: `SELECT archive_old_usage_records()`
- [ ] Review unused_indexes, drop if needed
- [ ] Tune vector index if needed (>100K chunks)
- [ ] Share performance improvements with team

---

## Emergency Contacts

**If deployment fails:**
1. Check this checklist's "Troubleshooting" section
2. Review Supabase logs in Dashboard
3. Check #engineering Slack channel
4. Escalate to DBA/DevOps if critical

**Don't panic**: All migrations have IF NOT EXISTS - safe to re-run

---

## Final Notes

- Take your time - rushing causes mistakes
- When in doubt, ask for help
- Document any deviations from this checklist
- Celebrate success! 🎉

**Estimated time**: 30-60 minutes
**Best time to deploy**: Low-traffic hours (if production)
**Rollback time**: 10-20 minutes (if needed)

---

Last updated: 2026-01-30
