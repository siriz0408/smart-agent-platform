# Cross-Site Semantic Search - Deployment Checklist

**Date Started:** ___________
**Completed By:** ___________
**Status:** 🔄 In Progress

---

## Pre-Deployment Checks

### Code Quality
- [ ] Run `npm run lint` - No errors
- [ ] Run `npm run typecheck` - No TypeScript errors
- [ ] Run `npm run test` - All tests pass
- [ ] Review IMPLEMENTATION_SUMMARY_SEMANTIC_SEARCH.md
- [ ] Review DEPLOYMENT_GUIDE_SEMANTIC_SEARCH.md

### Environment Setup
- [ ] Supabase project ID confirmed: `sthnezuadfbmbqlxiwtq`
- [ ] Service role key available (from Supabase Dashboard → Settings → API)
- [ ] User access token available (for testing)
- [ ] Vercel project connected to GitHub repo

---

## Step 1: Database Migrations

### Apply Migrations
- [ ] Run `supabase db push`
- [ ] Verify no errors in output
- [ ] Confirm all 4 migrations applied

### Verify Migration Success
- [ ] Check embedding columns exist:
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('contacts', 'properties', 'deals')
    AND column_name IN ('embedding', 'search_text', 'embedding_indexed_at');
  ```
  **Expected:** 9 rows (3 columns × 3 tables)

- [ ] Check indexes created:
  ```sql
  SELECT indexname, tablename
  FROM pg_indexes
  WHERE indexname LIKE '%embedding%' OR indexname LIKE '%search%' OR indexname LIKE '%tenant%';
  ```
  **Expected:** 9+ indexes

- [ ] Check RPC function exists:
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'search_all_entities_hybrid';
  ```
  **Expected:** 1 row

- [ ] Check triggers created:
  ```sql
  SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'trigger_%';
  ```
  **Expected:** 4 triggers (contact, property, deal × 2)

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Step 2: Backfill Entity Embeddings

### Deploy Indexing Function
- [ ] Run `supabase functions deploy index-entities --project-ref sthnezuadfbmbqlxiwtq`
- [ ] Verify deployment successful

### Backfill Contacts
- [ ] Run backfill command (see DEPLOYMENT_GUIDE)
- [ ] Check response - `success: true`
- [ ] Note: Indexed ___ contacts, Skipped ___, Errors ___

### Backfill Properties
- [ ] Run backfill command
- [ ] Check response - `success: true`
- [ ] Note: Indexed ___ properties, Skipped ___, Errors ___

### Backfill Deals
- [ ] Run backfill command
- [ ] Check response - `success: true`
- [ ] Note: Indexed ___ deals, Skipped ___, Errors ___

### Verify Backfill Success
- [ ] Run verification query:
  ```sql
  SELECT
    'contacts' as table_name,
    COUNT(*) as total,
    COUNT(embedding) as with_embedding,
    ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as percentage
  FROM contacts
  UNION ALL
  SELECT 'properties', COUNT(*), COUNT(embedding), ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) FROM properties
  UNION ALL
  SELECT 'deals', COUNT(*), COUNT(embedding), ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) FROM deals;
  ```
  **Expected:** Near 100% for all tables

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Step 3: Deploy Search Edge Function

### Deploy Function
- [ ] Run `supabase functions deploy universal-search --project-ref sthnezuadfbmbqlxiwtq`
- [ ] Verify deployment successful

### Verify Function Accessible
- [ ] Test CORS preflight:
  ```bash
  curl -X OPTIONS https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/universal-search
  ```
  **Expected:** 200 OK with CORS headers

### Test Search API
- [ ] Get user token from browser DevTools
- [ ] Run test search request (see DEPLOYMENT_GUIDE)
- [ ] Verify response has `results` array
- [ ] Check latency < 500ms

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Step 4: Frontend Deployment

### Pre-Deploy Checks
- [ ] Run `npm run lint` - Pass
- [ ] Run `npm run typecheck` - Pass
- [ ] Run `npm run test` - Pass
- [ ] Run `npm run build` - Success

### Git Commit & Push
- [ ] Git status shows only expected changes
- [ ] Commit with descriptive message
- [ ] Push to `main` branch: `git push origin main`

### Verify Vercel Deployment
- [ ] Go to Vercel dashboard
- [ ] Check deployment status - Building
- [ ] Wait for deployment - Success
- [ ] Note deployment URL: ___________________________________________

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Step 5: Manual Testing

### Basic Functionality (P0 - CRITICAL)
- [ ] Open production app: https://smart-agent-platform.vercel.app
- [ ] Login successful
- [ ] Search bar visible in header (top-left)
- [ ] Type "Denver" (or any query >= 2 chars)
- [ ] Dropdown appears within 300ms
- [ ] Results displayed with icons and names
- [ ] Click "Contacts" filter → only contacts shown
- [ ] Click "Properties" filter → only properties shown
- [ ] Click "Documents" filter → only documents shown
- [ ] Click "Deals" filter → only deals shown
- [ ] Click "All" filter → all types shown
- [ ] Click a result → navigates to correct detail page
- [ ] Clear button (X) clears search and closes dropdown
- [ ] Press ⌘K (Mac) or Ctrl+K (Windows) → search focused
- [ ] Press Escape → dropdown closes
- [ ] No console errors in browser DevTools

**Issues Found:**
___________________________________________________________________________
___________________________________________________________________________

### Backward Compatibility (P0 - CRITICAL)
- [ ] Navigate to `/documents` → page loads
- [ ] Navigate to `/contacts` → page loads
- [ ] Navigate to `/properties` → page loads
- [ ] Navigate to `/pipeline/all` (deals) → page loads
- [ ] Navigate to `/` (AI chat) → page loads
- [ ] Type `@` in AI chat → autocomplete appears
- [ ] Select `@document` mention → inserts correctly
- [ ] Send message with mention → AI responds
- [ ] Header height unchanged (64px)
- [ ] No layout shift when search dropdown opens
- [ ] No console errors on any page

**Issues Found:**
___________________________________________________________________________
___________________________________________________________________________

### Mobile Responsive (P1 - HIGH)
- [ ] Open app on iPhone or responsive mode (390px width)
- [ ] Search bar visible and usable
- [ ] Dropdown width matches screen (no horizontal scroll)
- [ ] Filter chips wrap on small screen
- [ ] Clear button is tappable (>= 44px touch target)
- [ ] Results readable on small screen
- [ ] Navigation works after tapping result

**Issues Found:**
___________________________________________________________________________
___________________________________________________________________________

### Performance (P1 - HIGH)
- [ ] Open browser DevTools → Network tab
- [ ] Clear network log
- [ ] Type search query
- [ ] Check `/universal-search` request
- [ ] Response time < 500ms
- [ ] Check DevTools → Performance tab
- [ ] No janky animations or layout shifts

**Metrics:**
- Search API latency: _______ ms
- Time to results displayed: _______ ms
- Bundle size increase: _______ KB

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Step 6: Performance Verification

### Database Performance
- [ ] Run EXPLAIN ANALYZE on search function (see DEPLOYMENT_GUIDE)
- [ ] Execution time < 200ms
- [ ] Uses "Index Scan" (not "Seq Scan")

### Index Usage
- [ ] Check index usage query:
  ```sql
  SELECT indexrelname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  WHERE indexrelname LIKE '%embedding%' OR indexrelname LIKE '%search%'
  ORDER BY idx_scan DESC;
  ```
- [ ] All indexes have `idx_scan > 0` (being used)

### Edge Function Performance
- [ ] Check Supabase Dashboard → Edge Functions → universal-search
- [ ] Check invocation count
- [ ] Check average execution time
- [ ] Check error rate (should be < 1%)

**Metrics:**
- Database query time: _______ ms
- Edge function exec time: _______ ms
- Error rate: _______ %

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Step 7: Monitoring Setup

### Metrics to Track
- [ ] Add Supabase Dashboard to bookmarks
- [ ] Set up alerts for edge function errors (if available)
- [ ] Set up alerts for slow queries (if available)
- [ ] Document baseline metrics (for comparison next week)

### Baseline Metrics (Week 0)
- **Search queries per day:** _______
- **Average search latency:** _______ ms
- **Error rate:** _______ %
- **Most searched queries:** ___________________________________________

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Post-Deployment Actions

### Communication
- [ ] Notify team: "Semantic search feature deployed to production"
- [ ] Share documentation links (IMPLEMENTATION_SUMMARY, DEPLOYMENT_GUIDE)
- [ ] Schedule demo/walkthrough for team (if applicable)

### Monitoring (First Week)
- [ ] Day 1: Check for errors and user feedback
- [ ] Day 3: Review performance metrics
- [ ] Day 7: Collect usage analytics
- [ ] Week 1: Identify any slow queries or optimization opportunities

### Follow-Up Tasks
- [ ] Create GitHub issue for any bugs found
- [ ] Document any manual workarounds needed
- [ ] Plan next iteration (query suggestions, fuzzy matching, etc.)

**Notes:**
___________________________________________________________________________
___________________________________________________________________________

---

## Rollback Plan (If Needed)

### Indicators for Rollback
- [ ] Critical bug affecting core functionality
- [ ] Search latency > 5 seconds (unusable)
- [ ] Database performance degraded
- [ ] Multiple user complaints

### Quick Rollback (Frontend Only)
```bash
git revert HEAD~1
git push origin main
```
- [ ] Vercel auto-deploys previous version
- [ ] Verify old search bar restored
- [ ] Monitor for stability

### Full Rollback (Backend + Frontend)
- [ ] Run rollback SQL (see DEPLOYMENT_GUIDE)
- [ ] Revert frontend code
- [ ] Notify team of rollback
- [ ] Create incident report

**Rollback Executed?** ☐ No  ☐ Yes (Date: _________)

**Reason:**
___________________________________________________________________________
___________________________________________________________________________

---

## Sign-Off

### Deployment Complete
- [ ] All checklist items completed
- [ ] No critical issues found
- [ ] Monitoring in place
- [ ] Team notified

**Deployed By:** ___________________________________________
**Date Completed:** ___________________________________________
**Version:** v2.1.0
**Status:** ✅ Success  ☐ Partial  ☐ Rollback

**Final Notes:**
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________

---

## Next Steps

1. **Week 1:** Monitor performance, collect feedback, fix bugs
2. **Week 2-4:** Add search analytics, track popular queries
3. **Month 2:** Implement query suggestions, fuzzy matching
4. **Month 3+:** Consider ML embeddings upgrade, voice search

**Priority Next Features:**
1. ___________________________________________________________________________
2. ___________________________________________________________________________
3. ___________________________________________________________________________

---

**Reference Documents:**
- Implementation Summary: `IMPLEMENTATION_SUMMARY_SEMANTIC_SEARCH.md`
- Deployment Guide: `DEPLOYMENT_GUIDE_SEMANTIC_SEARCH.md`
- Troubleshooting: See DEPLOYMENT_GUIDE → Troubleshooting section
