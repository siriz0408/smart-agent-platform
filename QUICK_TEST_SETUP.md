# Quick Test Data Setup

## Current Status
✅ Database migrations applied
✅ Edge functions deployed
✅ Frontend deployed
❌ **Need test data with embeddings**

## Add Test Data (Choose One Method)

### Method 1: SQL Script (Recommended - 2 minutes)

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/sql/new

2. Copy and paste this SQL:
   ```bash
   cat scripts/seed-simple-test-data.sql | pbcopy  # Copies to clipboard
   ```

3. Click "Run" in SQL Editor

4. Verify test data created (should see 3 contacts, 3 properties with embeddings)

### Method 2: Automated Script

```bash
npm run seed:test-data
```

This will:
- Open SQL Editor in your browser
- Display the SQL to copy/paste
- Show verification command

## Run Integration Tests

After adding test data:

```bash
npm run test:integration
```

**Expected Result:**
```
✅ Database connection
✅ Search API requires authentication
✅ Test data has embeddings
✅ Search API returns results for "Denver"
✅ Search finds "922 Sharondale Dr"
✅ Faceted filtering (contacts only)
✅ RRF scoring and sorting

Pass Rate: 100% (7/7 tests)
```

## Test Data Created

### Contacts (3)
- John Denver - Denver Real Estate Partners
- Sarah Johnson - Johnson Properties LLC
- Michael Smith - First-time buyer

### Properties (3)
- **922 Sharondale Dr** - Amherst, OH - $240,000
- 1234 Denver Street - Denver, CO - $675,000
- 456 Main Street - Amherst, OH - $189,000

## Manual UI Testing

1. Login to https://smart-agent-platform.vercel.app
2. Search for "922" → Should find 922 Sharondale Dr
3. Search for "Denver" → Should find John Denver + Denver property
4. Test filters (All, Contacts, Properties)

## Troubleshooting

**"No results found"**
→ Test data doesn't have embeddings yet. Run the SQL script above.

**"Test user not found"**
→ The TypeScript seed script creates a test user, but the SQL script uses your current user. SQL method is simpler.

**Tests still failing**
→ Check that embeddings were generated:
```sql
SELECT address, embedding IS NOT NULL as has_embedding
FROM properties
WHERE address LIKE '%922%';
```

## Next Steps After Testing

1. ✅ Verify all 7 integration tests pass
2. ✅ Test search in production UI
3. Run backfill for existing production data (if needed)
4. Update DEPLOYMENT_STATUS.md

## Quick Commands

```bash
# Add test data (opens SQL Editor)
npm run seed:test-data

# Run integration tests
npm run test:integration

# Check deployment status
npm run status
```
