# Deploy Database Optimizations - Quick Start

## Prerequisites Check ✓

- ✅ 14 migration files ready in `supabase/migrations/`
- ✅ Verification tests ready
- ✅ Supabase CLI installed
- ✅ Environment variables configured

## Deploy in 3 Steps

### Step 1: Authenticate with Supabase

```bash
# Login to Supabase (opens browser for auth)
supabase login

# Link your project (smart-agent-platform)
supabase link --project-ref sthnezuadfbmbqlxiwtq
```

### Step 2: Deploy Migrations

```bash
# Review what will be deployed
supabase db diff

# Deploy all migrations
supabase db push

# This will apply all 14 migrations in order:
# - Sprint 1: Critical performance indexes (5 migrations)
# - Sprint 2: Partial/GIN/composite indexes (4 migrations)
# - Sprint 3: Monitoring & maintenance (5 migrations)
```

### Step 3: Verify Deployment

```bash
# Quick bash verification (18 checks)
./scripts/verify-database-migrations.sh

# Comprehensive TypeScript tests (17 test cases)
npm test database-migration-verification.test.ts
```

## Expected Results

**Performance Improvements:**
- Hybrid search (RAG): 200ms → 50ms (4x faster)
- Chunk neighbors: 500ms → 50ms (10x faster)
- Usage quota check: 100ms → 5ms (20x faster)
- Tenant-scoped lists: 50ms → 5ms (10x faster)

**Verification Output:**
```
==========================================
Database Migration Verification
==========================================

=== Sprint 1: Critical Performance Indexes ===
✓ document_chunks composite index exists
✓ usage_records tenant index exists
✓ document_chunks has tenant_id column
✓ no NULL tenant_ids in document_chunks

[... 14 more checks ...]

==========================================
Results:
==========================================
Passed: 18
Failed: 0

All verification checks passed! ✓
```

## Rollback (if needed)

If any issues arise, rollback instructions are in:
- `docs/DEPLOYMENT_CHECKLIST.md` - Section "Rollback Procedures"
- `docs/DATABASE_OPTIMIZATION_CODE_REVIEW.md` - Section "Deployment Strategy"

Each sprint can be rolled back independently by dropping the created indexes.

## Support

- Full deployment checklist: `docs/DEPLOYMENT_CHECKLIST.md`
- Testing guide: `docs/TESTING_DATABASE_MIGRATIONS.md`
- Implementation plan: `~/.claude/plans/kind-roaming-hedgehog.md`

---

**Ready to deploy? Run: `supabase login`**
