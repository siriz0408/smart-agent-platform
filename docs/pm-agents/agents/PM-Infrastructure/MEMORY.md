# PM-Infrastructure Memory

> **Last Updated:** 2026-02-15 (INF-013 Deployment Rollback Automation)
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
- Build time tracking (Vite plugin + standalone script)

**Build Metrics Pattern (INF-012):**
- Vite plugin: `plugins/vite-build-metrics.ts`
- Standalone tracker: `scripts/build-time-tracker.ts`
- Metrics stored in: `test-artifacts/build-metrics/`
- npm scripts: `build:track`, `build:track:dev`, `build:report`
- Tracks: phases, bundle size, chunks, git info, trends
- Thresholds: Production <1m=good, <2m=warning; Dev <30s=good, <1m=warning

**Deployment Rollback Pattern (INF-013):**
- Rollback script: `scripts/deployment-rollback.ts`
- Documentation: `docs/DEPLOYMENT_ROLLBACK_PROCEDURES.md`
- npm scripts: `deploy:list`, `deploy:current`, `deploy:rollback`, `deploy:rollback:prev`, `deploy:rollback:status`
- Uses Vercel CLI under the hood (vercel rollback/promote)
- Vercel accepts deployment URL or ID for rollback
- JSON output: `vercel ls -F json` (note: -F not --json)
- Rollback is actually a "promote" operation - promotes previous deployment

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

### Last Cycle (INF-013 - 2026-02-15)
- **Worked on:** INF-013 - Deployment rollback automation
- **Completed:** Full deployment rollback tooling
- **Files created:**
  - `scripts/deployment-rollback.ts` - TypeScript rollback utility
  - `docs/DEPLOYMENT_ROLLBACK_PROCEDURES.md` - Rollback documentation
- **Files modified:**
  - `package.json` - Added npm scripts (deploy:list, deploy:current, deploy:rollback, deploy:rollback:prev, deploy:rollback:status)
- **Key features implemented:**
  - List recent Vercel deployments with commit info
  - Show current production deployment
  - Rollback to specific deployment by URL/ID
  - Quick rollback to previous production
  - Check rollback status
  - Interactive confirmation before rollback
  - Automatic verification after rollback
  - JSON output for scripting
- **Learnings:**
  - Vercel CLI uses `-F json` for JSON output, not `--json`
  - Vercel JSON response wraps deployments in `{ deployments: [...] }`
  - Vercel accepts full URL as deployment identifier for rollback
  - Rollback is actually a "promote" operation under the hood
  - Use `execFileSync` instead of `exec` for security (no shell injection)
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycle (INF-012 - 2026-02-15)
- **Worked on:** INF-012 - Track build times for performance monitoring
- **Completed:** Full build metrics system implementation
- **Files created:**
  - `plugins/vite-build-metrics.ts` - Vite plugin for automatic tracking
  - `scripts/build-time-tracker.ts` - Standalone tracking script
- **Files modified:**
  - `vite.config.ts` - Added build metrics plugin
  - `package.json` - Added npm scripts (build:track, build:track:dev, build:report)
- **Key metrics discovered:**
  - Production build time: ~9 seconds (GOOD)
  - Transform phase: ~98% of total build time
  - 4,179 modules transformed out of 12,392 total
  - 145 chunks generated, ~2.84 MB total bundle
- **Learnings:**
  - Vite's plugin API provides hooks for all build phases
  - Transform phase dominates build time (good target for optimization)
  - Module resolution is fast due to optimizeDeps pre-bundling
- **Blocked by:** None
- **Handoffs created:** None

### Cycle 9
- **Worked on:** Deploy pending migrations
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
