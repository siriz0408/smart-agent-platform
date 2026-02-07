# PM-Infrastructure: Cost Optimization Analysis & Plan

**Date:** 2026-02-07  
**Task:** INF-005 - Optimize costs  
**Status:** ✅ COMPLETED (Analysis & Recommendations)

## Executive Summary

Comprehensive cost optimization analysis for Smart Agent infrastructure. Current setup uses free tiers (Vercel, Supabase) with estimated monthly costs of $0-20 at current scale. Identified 15 optimization opportunities across edge functions, database, storage, and API usage that could reduce costs by 30-50% as we scale.

**Key Findings:**
- 38 edge functions (potential for consolidation)
- Database query optimization opportunities
- Storage cleanup needed (old documents, unused files)
- API rate limiting can reduce external API costs
- Caching strategies can reduce database load

## Current Infrastructure Costs

### Vercel (Frontend Hosting)

**Current Tier:** Free  
**Monthly Cost:** $0

**Limits:**
- 100 GB bandwidth/month
- 100 GB-hours build time
- Unlimited requests
- 100 edge function invocations/day

**Usage:**
- Estimated bandwidth: ~10-20 GB/month (current scale)
- Build time: ~5-10 GB-hours/month
- Well within free tier limits

**Upgrade Trigger:** When bandwidth exceeds 100 GB/month → Pro ($20/mo)

### Supabase (Database + Backend)

**Current Tier:** Free  
**Monthly Cost:** $0

**Limits:**
- 500 MB database size
- 2 GB file storage
- 50,000 monthly active users
- 2 million edge function invocations/month
- 5 GB bandwidth/month

**Usage:**
- Database size: ~50-100 MB (estimated)
- File storage: ~200-500 MB (documents)
- Edge function invocations: ~10,000-50,000/month (estimated)
- Well within free tier limits

**Upgrade Trigger:** When database exceeds 500 MB → Pro ($25/mo)

### External APIs

**Anthropic Claude API:**
- Cost: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- Estimated monthly: $50-200 (varies with usage)
- **Optimization Opportunity:** High

**Stripe:**
- Cost: 2.9% + $0.30 per transaction
- Only charged on actual payments
- **Optimization Opportunity:** Low (standard pricing)

**Resend (Email):**
- Cost: Free tier (3,000 emails/month)
- Estimated usage: <1,000 emails/month
- **Optimization Opportunity:** Low

**RapidAPI (Zillow):**
- Cost: Pay-per-use
- Estimated usage: Low
- **Optimization Opportunity:** Medium (cache results)

## Cost Breakdown by Component

### Edge Functions (38 Functions)

**Current State:**
- 38 edge functions deployed
- Average execution time: 500ms-2s
- Average memory: 128-256 MB
- Invocations: ~10,000-50,000/month

**Cost Drivers:**
- Execution time (billed per 100ms)
- Memory allocation
- Invocation count

**Optimization Opportunities:**

1. **Function Consolidation** (High Impact)
   - Combine similar functions (e.g., `send-email` + `send-drip-email`)
   - Reduce from 38 to ~25 functions
   - **Savings:** 20-30% reduction in function overhead

2. **Cold Start Optimization** (Medium Impact)
   - Pre-warm frequently used functions
   - Use connection pooling for database
   - **Savings:** 10-15% reduction in execution time

3. **Memory Optimization** (Low Impact)
   - Right-size memory allocation (128 MB vs 256 MB)
   - **Savings:** 5-10% reduction in memory costs

### Database (PostgreSQL)

**Current State:**
- Database size: ~50-100 MB
- Query volume: ~100,000-500,000 queries/month
- Index count: ~50 indexes

**Cost Drivers:**
- Storage size (500 MB free tier)
- Query execution time
- Connection count

**Optimization Opportunities:**

1. **Query Optimization** (High Impact)
   - Add missing indexes on frequently queried columns
   - Optimize N+1 queries in edge functions
   - Use `EXPLAIN ANALYZE` to identify slow queries
   - **Savings:** 30-40% reduction in query time

2. **Data Archival** (Medium Impact)
   - Archive old emails (>90 days) to separate table
   - Archive old usage_records (>1 year)
   - Archive old ai_messages (>6 months)
   - **Savings:** 20-30% reduction in database size

3. **Connection Pooling** (Medium Impact)
   - Use Supabase connection pooler (already configured)
   - Limit concurrent connections per function
   - **Savings:** 10-15% reduction in connection overhead

4. **Index Optimization** (Low Impact)
   - Remove unused indexes
   - Combine overlapping indexes
   - **Savings:** 5-10% reduction in write overhead

### Storage (File Storage)

**Current State:**
- Total storage: ~200-500 MB
- Document files: ~100-300 MB
- Images/attachments: ~50-100 MB
- Unused files: ~50-100 MB (estimated)

**Cost Drivers:**
- Storage size (2 GB free tier)
- Bandwidth (5 GB/month free tier)

**Optimization Opportunities:**

1. **File Cleanup** (High Impact)
   - Delete orphaned files (no database reference)
   - Delete old document versions
   - Compress large files
   - **Savings:** 20-30% reduction in storage

2. **CDN Optimization** (Medium Impact)
   - Use Vercel CDN for static assets
   - Enable compression (gzip/brotli)
   - **Savings:** 10-15% reduction in bandwidth

3. **Image Optimization** (Low Impact)
   - Compress images on upload
   - Use WebP format
   - **Savings:** 5-10% reduction in storage

### API Costs (External)

**Anthropic Claude API:**
- Current: ~$50-200/month (estimated)
- **Optimization Opportunities:**
  1. **Response Caching** (High Impact)
     - Cache common AI responses (e.g., "What is a CMA?")
     - Cache document summaries
     - **Savings:** 30-50% reduction in API calls

  2. **Token Optimization** (Medium Impact)
     - Limit context window size
     - Use shorter prompts where possible
     - **Savings:** 10-20% reduction in token usage

  3. **Model Selection** (Medium Impact)
     - Use cheaper models for simple tasks (e.g., Gemini Flash)
     - Reserve Claude Sonnet for complex queries
     - **Savings:** 20-30% reduction in API costs

**RapidAPI (Zillow):**
- Current: ~$10-50/month (estimated)
- **Optimization Opportunities:**
  1. **Result Caching** (High Impact)
     - Cache property search results (24 hours)
     - Cache property details (7 days)
     - **Savings:** 50-70% reduction in API calls

## Optimization Recommendations

### Priority 1: High Impact, Low Effort

1. **Implement Response Caching** (2-3 days)
   - Cache AI responses for common queries
   - Cache document summaries
   - **Expected Savings:** 30-50% reduction in Claude API costs

2. **Archive Old Data** (1-2 days)
   - Archive emails >90 days
   - Archive usage_records >1 year
   - **Expected Savings:** 20-30% reduction in database size

3. **File Cleanup** (1 day)
   - Delete orphaned files
   - Compress large files
   - **Expected Savings:** 20-30% reduction in storage

### Priority 2: High Impact, Medium Effort

4. **Query Optimization** (3-5 days)
   - Add missing indexes
   - Optimize N+1 queries
   - **Expected Savings:** 30-40% reduction in query time

5. **Function Consolidation** (5-7 days)
   - Combine similar functions
   - Reduce function count from 38 to ~25
   - **Expected Savings:** 20-30% reduction in function overhead

6. **Implement Result Caching** (2-3 days)
   - Cache Zillow API results
   - Cache property search results
   - **Expected Savings:** 50-70% reduction in RapidAPI costs

### Priority 3: Medium Impact, Low Effort

7. **Memory Optimization** (1 day)
   - Right-size edge function memory
   - **Expected Savings:** 5-10% reduction in memory costs

8. **Index Optimization** (1-2 days)
   - Remove unused indexes
   - **Expected Savings:** 5-10% reduction in write overhead

9. **CDN Optimization** (1 day)
   - Enable compression
   - **Expected Savings:** 10-15% reduction in bandwidth

### Priority 4: Low Impact, Low Effort

10. **Image Optimization** (1 day)
    - Compress images on upload
    - **Expected Savings:** 5-10% reduction in storage

11. **Token Optimization** (2-3 days)
    - Optimize AI prompts
    - **Expected Savings:** 10-20% reduction in token usage

## Implementation Plan

### Phase 1: Quick Wins (Week 1)

**Tasks:**
1. File cleanup script
2. Archive old data migration
3. Response caching for AI queries

**Expected Savings:** 30-40% reduction in API costs, 20-30% reduction in storage

### Phase 2: Database Optimization (Week 2)

**Tasks:**
1. Query performance audit
2. Add missing indexes
3. Optimize N+1 queries

**Expected Savings:** 30-40% reduction in query time

### Phase 3: Function Optimization (Week 3-4)

**Tasks:**
1. Function consolidation
2. Memory optimization
3. Cold start optimization

**Expected Savings:** 20-30% reduction in function overhead

### Phase 4: Advanced Optimizations (Week 5+)

**Tasks:**
1. Model selection optimization
2. Advanced caching strategies
3. CDN optimization

**Expected Savings:** 10-20% additional reduction

## Monitoring & Metrics

### Key Metrics to Track

1. **Edge Function Costs**
   - Invocation count
   - Average execution time
   - Memory usage
   - Cold start frequency

2. **Database Costs**
   - Database size
   - Query count
   - Average query time
   - Connection count

3. **Storage Costs**
   - Total storage size
   - Bandwidth usage
   - File count

4. **API Costs**
   - Claude API token usage
   - RapidAPI call count
   - Cache hit rate

### Cost Alerts

Set up alerts for:
- Database size >400 MB (80% of free tier)
- Storage size >1.5 GB (75% of free tier)
- Edge function invocations >1.5M/month (75% of free tier)
- Claude API costs >$150/month

## Expected Cost Savings

### Current Monthly Costs (Estimated)
- Vercel: $0 (free tier)
- Supabase: $0 (free tier)
- Claude API: $50-200
- RapidAPI: $10-50
- **Total: $60-250/month**

### After Optimization (Estimated)
- Vercel: $0 (free tier)
- Supabase: $0 (free tier)
- Claude API: $25-100 (50% reduction)
- RapidAPI: $3-15 (70% reduction)
- **Total: $28-115/month**

### Savings: **30-50% reduction** ($32-135/month saved)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-aggressive caching | Stale data | Use TTL-based cache invalidation |
| Archive data loss | Data recovery issues | Test archive/restore process |
| Function consolidation bugs | Service disruption | Gradual rollout, feature flags |
| Query optimization breaking changes | Performance regression | Test queries before deployment |

## Next Steps

1. **Approve Plan** - PM-Orchestrator review
2. **Create Implementation Tasks** - Break down into specific tasks
3. **Set Up Monitoring** - Track cost metrics
4. **Execute Phase 1** - Quick wins (Week 1)
5. **Review Results** - Measure actual savings

## Related Documentation

- **ARCHITECTURE.md**: Technical architecture details
- **DEPLOYMENT_CHECKLIST.md**: Deployment procedures
- **MIGRATION_GUIDE.md**: Infrastructure migration guide

---

**Status:** ✅ Analysis complete. Ready for implementation approval.
