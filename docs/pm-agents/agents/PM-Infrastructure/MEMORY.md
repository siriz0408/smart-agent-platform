# PM-Infrastructure Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Deployment Pattern:**
- Vercel for frontend (auto-deploy on git push)
- Supabase for backend (migrations via CLI)
- Edge functions deployed via Supabase CLI
- Deployment verification workflow (7 checks)

**Migration Pattern:**
- Numbered migrations: `YYYYMMDDHHMMSS_description.sql`
- Test migrations locally first
- Deploy via `supabase db push`
- Rollback migrations exist for critical changes

**Monitoring Pattern:**
- Health checks for all services
- Performance monitoring (latency, errors)
- Error tracking (Supabase logs)
- Cost tracking (API usage)

### Common Issues & Solutions

**Issue:** Migrations not deployed
- **Solution:** Create deployment checklist
- **Pattern:** Track pending migrations in STATE.md

**Issue:** Deployment failures not caught early
- **Solution:** Created deployment verification workflow
- **Pattern:** 7 automated checks before deployment

**Issue:** Metrics infrastructure missing
- **Solution:** Need to build metrics aggregation system
- **Pattern:** Coordinate with PM-Growth on requirements

### Domain-Specific Knowledge

**Infrastructure Stack:**
- Frontend: Vercel (free tier)
- Backend: Supabase (free tier)
- Database: PostgreSQL with pgvector
- Edge Functions: Deno runtime

**Deployment Checks:**
1. Health check
2. Security headers
3. Supabase connectivity
4. Edge functions
5. Bundle size
6. HTML validation
7. Playwright smoke test

**Cost Optimization:**
- Free tiers sufficient for current scale
- API costs: ~$50-200/month (Claude API)
- Storage: ~200-500 MB (well within limits)

### Cross-PM Coordination Patterns

**With PM-Growth:**
- Metrics infrastructure needed
- Cost tracking
- Usage analytics

**With PM-Security:**
- Deployment security checks
- Environment variable management
- Secret management

**With PM-QA:**
- Deployment verification tests
- Smoke tests
- Performance testing

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** INF-012 - Deploy pending migrations
- **Discovered:** 3 migrations ready for deployment
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Created deployment verification workflow
- Added 7 automated checks
- Created manual verification script

**Cycle 7:**
- Established deployment patterns
- Created migration templates

---

## Preferences & Patterns

**Prefers:**
- Using `/feature-dev` for infrastructure changes
- Testing migrations locally first
- Coordinating with PM-Growth on metrics

**Avoids:**
- Skipping deployment checks
- Deploying untested migrations
- Hardcoding environment variables

**Works well with:**
- PM-Growth (metrics)
- PM-Security (deployment security)
- PM-QA (verification tests)

---

*This memory is updated after each development cycle. PM-Infrastructure should read this before starting new work.*
