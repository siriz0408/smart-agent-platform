# Entity Embedding Backfill

> **Task:** CTX-009  
> **Status:** ✅ Complete  
> **Date:** 2026-02-06

## Overview

Entity embeddings enable semantic search across contacts, properties, and deals. This task implements scripts to check embedding status and backfill missing embeddings.

## Implementation

### Scripts Created

1. **`scripts/check-entity-embeddings.ts`**
   - Checks how many entities (contacts, properties, deals) have embeddings
   - Reports percentage coverage
   - Exits with error code if backfill is needed

2. **`scripts/index-entities-backfill.ts`**
   - Calls the `index-entities` edge function to backfill embeddings
   - Supports filtering by entity type (contact/property/deal/all)
   - Processes entities in batches (default: 100)

### NPM Scripts Added

```bash
# Check embedding status
npm run check:embeddings

# Run backfill for all entities
npm run index:entities

# Run backfill for specific entity type
npm run index:entities -- --type contact
npm run index:entities -- --type property
npm run index:entities -- --type deal

# Custom batch size
npm run index:entities -- --batch-size 50
```

## Usage

### Prerequisites

Set the service role key:

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Get the key from: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/settings/api

### Step 1: Check Status

```bash
npm run check:embeddings
```

**Example Output:**
```
📊 Embedding Status:

┌─────────────┬────────┬──────────────┬─────────────────┬────────────┐
│ Entity Type │ Total  │ With Embedding│ Without Embedding│ Percentage │
├─────────────┼────────┼──────────────┼─────────────────┼────────────┤
│ contacts    │     42 │           30 │              12 │ ✅  71.4% │
│ properties  │     15 │           15 │               0 │ ✅ 100.0% │
│ deals       │      8 │            5 │               3 │ 🟡  62.5% │
└─────────────┴────────┴──────────────┴─────────────────┴────────────┘

📈 Overall: 50/65 entities have embeddings (76.9%)

⚠️  15 entities need embeddings
   Run: npm run index:entities to backfill
```

### Step 2: Run Backfill

```bash
npm run index:entities
```

**Example Output:**
```
🚀 Starting entity embedding backfill (all, batch size: 100)...

📊 Backfill Results:

┌─────────────┬──────────┬──────────┬────────┬──────────────┐
│ Entity Type │ Indexed  │ Skipped  │ Errors │ Duration (ms) │
├─────────────┼──────────┼──────────┼────────┼──────────────┤
│ contact     │       12 │        0 │      0 │          450 │
│ property    │        0 │        0 │      0 │           50 │
│ deal        │        3 │        0 │      0 │          120 │
└─────────────┴──────────┴──────────┴────────┴──────────────┘

📈 Summary:
   Total indexed: 15
   Total skipped: 0
   Total errors: 0
   Total duration: 0.62s

✅ Backfill completed successfully!
```

## How It Works

1. **Check Script**: Queries database for entities with `embedding IS NULL`
2. **Backfill Script**: 
   - Calls `index-entities` edge function via HTTP
   - Edge function uses `generateDeterministicEmbedding()` from `embedding-utils.ts`
   - Updates entities with generated embeddings and `embedding_indexed_at` timestamp

## Edge Function

The backfill uses the existing `index-entities` edge function at:
- Path: `supabase/functions/index-entities/index.ts`
- Endpoint: `https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/index-entities`

## Notes

- **Triggers**: New entities automatically get embeddings via database triggers (see `20260202002000_create_entity_indexing_triggers.sql`)
- **Backfill Needed**: Only existing entities created before the embedding migration need backfill
- **Batch Processing**: If you have many entities, run the script multiple times (it processes in batches)
- **Service Role Key**: Required for admin access to update embeddings

## Related Files

- `supabase/functions/index-entities/index.ts` - Edge function implementation
- `supabase/functions/_shared/embedding-utils.ts` - Embedding generation logic
- `supabase/migrations/20260202000000_add_entity_embeddings.sql` - Schema migration
- `supabase/migrations/20260202002000_create_entity_indexing_triggers.sql` - Auto-indexing triggers
