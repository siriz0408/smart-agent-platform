# Testing Database Migrations

## Overview

This document explains how to verify that database optimizations were applied correctly using our TDD-style verification suite.

## Test Suite Components

### 1. Bash Verification Script (Quick Check)

**Location**: `scripts/verify-database-migrations.sh`

**Purpose**: Fast verification immediately after deploying migrations

**Usage**:
```bash
# After deploying migrations
supabase db push

# Run verification
./scripts/verify-database-migrations.sh
```

**What it checks**:
- ✅ All indexes created (50+ indexes across 3 sprints)
- ✅ Schema changes applied (tenant_id column, NOT NULL constraints)
- ✅ Monitoring views exist
- ✅ Query plans use indexes (EXPLAIN analysis)
- ✅ No NULL values where NOT NULL enforced

**Output**:
```
==========================================
Database Migration Verification
==========================================

=== Sprint 1: Critical Performance Indexes ===

Checking: document_chunks composite index... ✓ PASS
Checking: usage_records tenant index... ✓ PASS
Checking: contacts tenant_id index... ✓ PASS
Checking: no NULL tenant_ids in document_chunks... ✓ PASS

...

==========================================
Results:
==========================================
Passed: 18
Failed: 0

All verification checks passed! ✓
```

**Exit codes**:
- `0` = All checks passed
- `1` = One or more checks failed

---

### 2. TypeScript Integration Tests (Comprehensive)

**Location**: `src/test/database-migration-verification.test.ts`

**Purpose**: Comprehensive integration testing with detailed assertions

**Usage**:
```bash
# Run all database migration tests
npm test database-migration-verification.test.ts

# Or via Vitest
npx vitest run src/test/database-migration-verification.test.ts
```

**Prerequisites**:
- Supabase instance with migrations applied
- Environment variables set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

**What it tests**:

#### Sprint 1 Tests (Critical Performance)
- ✅ Composite index on document_chunks(document_id, chunk_index)
- ✅ Performance indexes on usage_records
- ✅ tenant_id indexes on 10+ tables
- ✅ document_chunks.tenant_id column exists and is NOT NULL
- ✅ No NULL tenant_ids in actual data
- ✅ RLS policy uses direct tenant_id check (no subquery)

#### Sprint 2 Tests (High-Priority Optimizations)
- ✅ Partial indexes on active/unread records
- ✅ GIN indexes on JSONB and array columns
- ✅ Composite indexes for common query patterns

#### Sprint 3 Tests (Monitoring & Maintenance)
- ✅ Monitoring views (slow_queries, index_health, etc.)
- ✅ Can query monitoring views
- ✅ Archival functions exist
- ✅ NOT NULL constraints applied

#### Performance Tests
- ✅ Tenant-filtered queries use index (no seq scan)
- ✅ document_chunks queries use composite index
- ✅ Usage quota check completes in < 10ms

#### Edge Function Compatibility
- ✅ Can insert document_chunks with tenant_id
- ✅ Trigger auto-populates tenant_id
- ✅ No errors on chunk insert

---

### 3. SQL Helper Functions

**Location**: `supabase/migrations/20260201130000_add_verification_helper_functions.sql`

**Purpose**: Enable TypeScript tests to query database metadata

**Functions created**:

```sql
-- Check if an index exists
SELECT check_index_exists('document_chunks', 'idx_document_chunks_doc_idx');

-- Check if a column exists
SELECT check_column_exists('document_chunks', 'tenant_id');

-- Check if column is NOT NULL
SELECT check_column_not_null('document_chunks', 'tenant_id');

-- Check if a view exists
SELECT check_view_exists('slow_queries');

-- Get RLS policy definition
SELECT get_policy_definition('document_chunks', 'Users can view chunks in their tenant');

-- Explain a query (performance testing)
SELECT explain_query('SELECT * FROM document_chunks WHERE tenant_id = ''...'');
```

**Security**: All functions use `SECURITY DEFINER` and are granted to `authenticated` role

---

## Testing Workflow

### After Initial Deployment

```bash
# 1. Deploy all migrations
supabase db push

# 2. Quick verification
./scripts/verify-database-migrations.sh

# 3. Comprehensive testing
npm test database-migration-verification.test.ts

# 4. Manual spot checks (optional)
supabase db execute "SELECT * FROM slow_queries LIMIT 5"
supabase db execute "SELECT * FROM index_health WHERE scans > 0 ORDER BY scans DESC LIMIT 10"
```

### After Code Changes

If you modify edge functions or queries:

```bash
# Test edge function still works
npm test database-migration-verification.test.ts -- -t "Edge Function Compatibility"

# Test performance hasn't regressed
npm test database-migration-verification.test.ts -- -t "Performance Validation"
```

### Before Production Deployment

```bash
# Full test suite
npm test database-migration-verification.test.ts

# Check for regressions
./scripts/verify-database-migrations.sh

# Manual EXPLAIN checks
supabase db execute "EXPLAIN ANALYZE SELECT * FROM document_chunks WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 100"
# Should show: Index Scan using idx_document_chunks_tenant_id
# Execution time should be < 10ms
```

---

## Interpreting Test Results

### Bash Script Output

**✓ PASS** (Green): Check passed
**✗ FAIL** (Red): Check failed - review output for details
**⚠ WARNING** (Yellow): Non-critical issue, review recommended

### TypeScript Test Output

```
✓ Sprint 1: Critical Performance Indexes (6)
  ✓ document_chunks composite index exists
  ✓ usage_records performance indexes exist
  ✓ tenant_id indexes exist on core tables
  ✓ document_chunks has tenant_id column
  ✓ document_chunks tenant_id is NOT NULL
  ✓ document_chunks has no NULL tenant_ids

✓ Sprint 2: Partial and GIN Indexes (3)
  ✓ partial indexes exist for active records
  ✓ GIN indexes exist for JSONB columns
  ✓ composite indexes exist for common query patterns

✓ Sprint 3: Monitoring and Maintenance (4)
  ✓ monitoring views exist
  ✓ can query slow_queries view
  ✓ archival functions exist
  ✓ NOT NULL constraints applied

✓ Performance Validation (3)
  ✓ tenant-filtered query uses index
  ✓ document_chunks query uses composite index
  ✓ usage quota check is fast (<10ms)

✓ Edge Function Compatibility (1)
  ✓ can insert document_chunks with tenant_id

Test Files  1 passed (1)
     Tests  17 passed (17)
```

---

## Common Issues & Troubleshooting

### Issue: "Index not found"

**Cause**: Migration didn't apply or was rolled back

**Fix**:
```bash
# Check migration status
supabase db remote ls

# Re-apply migrations
supabase db push
```

### Issue: "NULL tenant_ids found"

**Cause**: Backfill didn't complete or new chunks inserted without tenant_id

**Fix**:
```sql
-- Check which chunks are NULL
SELECT document_id, chunk_index FROM document_chunks WHERE tenant_id IS NULL;

-- Manual backfill
UPDATE document_chunks dc
SET tenant_id = d.tenant_id
FROM documents d
WHERE dc.document_id = d.id AND dc.tenant_id IS NULL;
```

### Issue: "Query still uses Seq Scan"

**Cause**: Index exists but query planner chose not to use it (often due to small table size)

**Check**:
```sql
-- Force index usage (testing only)
SET enable_seqscan = off;
EXPLAIN SELECT * FROM contacts WHERE tenant_id = '...';
SET enable_seqscan = on;

-- Check table statistics
ANALYZE contacts;
```

**Note**: Small tables may use seq scan even with indexes (this is correct behavior)

### Issue: "Performance test fails (<10ms)"

**Cause**: Database latency, network delay, or cold cache

**Fix**:
- Run test multiple times (first run is always slower)
- Check Supabase region/latency
- This test may be too strict for remote databases (adjust threshold)

---

## Test Coverage Summary

| Category | Tests | What's Verified |
|----------|-------|-----------------|
| Sprint 1 Indexes | 6 | Critical performance indexes created and used |
| Sprint 2 Indexes | 3 | Partial, GIN, and composite indexes exist |
| Sprint 3 Monitoring | 4 | Views, functions, and constraints in place |
| Performance | 3 | Queries use indexes, execute quickly |
| Edge Functions | 1 | Compatible with denormalization changes |
| **Total** | **17** | **Comprehensive migration verification** |

---

## Continuous Verification

### Add to CI/CD

```yaml
# .github/workflows/test.yml
- name: Run database migration tests
  run: npm test database-migration-verification.test.ts
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_KEY }}
```

### Weekly Monitoring

```bash
# Add to cron or monitoring system
supabase db execute "SELECT * FROM slow_queries WHERE mean_time_ms > 100 LIMIT 10"
supabase db execute "SELECT * FROM unused_indexes WHERE scans < 10"
```

---

## References

- **Implementation Plan**: `/Users/sam.irizarry/.claude/plans/kind-roaming-hedgehog.md`
- **Code Review**: `docs/DATABASE_OPTIMIZATION_CODE_REVIEW.md`
- **Migrations**: `supabase/migrations/202601*.sql`, `supabase/migrations/202602*.sql`

---

## Success Criteria

✅ All bash script checks pass (18/18)
✅ All TypeScript tests pass (17/17)
✅ No seq scans on tables > 1000 rows
✅ Usage quota check < 10ms (p95)
✅ No NULL values where NOT NULL enforced
✅ RLS policies use indexes (no subqueries)

**If all criteria met**: Migrations successfully applied! 🎉
