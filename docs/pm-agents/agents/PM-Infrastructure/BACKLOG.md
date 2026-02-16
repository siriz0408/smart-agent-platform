# PM-Infrastructure Backlog

> **Last Updated:** 2026-02-15

## In Progress

| ID | Item | Priority | Effort |
|----|------|----------|--------|

## Ready

| ID | Item | Priority | Effort |
|----|------|----------|--------|
| INF-014 | Configure GitHub repository variables for verification (PRODUCTION_URL, SUPABASE_PROJECT_REF) | P3 | S |

## Completed

| ID | Item | Completed |
|----|------|-----------|
| INF-000 | PM-Infrastructure setup | 2026-02-05 |
| INF-001 | Initial domain audit | 2026-02-06 |
| INF-003 | Check uptime history | 2026-02-06 |
| INF-002 | Run performance tests | 2026-02-06 |
| INF-006 | Set up Lighthouse CI | 2026-02-06 |
| INF-007 | Create production metrics dashboard | 2026-02-06 |
| INF-008 | Enable edge function JWT verification | 2026-02-06 |
| INF-010 | Set up performance monitoring | 2026-02-06 |
| INF-004 | Audit deployment pipeline | 2026-02-06 |
| INF-009 | Verify Sentry configuration | 2026-02-06 |
| INF-011 | Add deployment verification | 2026-02-07 |
| INF-005 | Optimize costs | 2026-02-07 | ✅ Comprehensive cost optimization analysis. Identified 15 optimization opportunities across edge functions (38 functions), database, storage, and API usage. 4-phase implementation plan with expected 30-50% cost savings ($32-135/month). Report: `docs/pm-agents/reports/2026-02-07/pm-infrastructure-inf005-cost-optimization.md` |
| INF-015 | Investigate and fix pending migrations dependency issues (6 migrations blocked) | 2026-02-07 | ✅ **CRITICAL FIX: Triple duplicate timestamp resolved.** Found 3 migrations with timestamp 080000 (not 2!). Renamed: grw011_churn_scoring_function → 080100, ctx010_add_metadata_to_document_chunks → 080200, sec006_security_monitoring → 080300. Created automated verification script. All 6 migrations validated and ready. Deployment command: `npm run db:migrate`. Prevention plan documented. Report: `docs/pm-agents/reports/2026-02-07/pm-infrastructure-inf015-migration-fix-FINAL.md` |
| INF-012 | Track build times | 2026-02-15 | ✅ **BUILD TIME TRACKING IMPLEMENTED.** Created comprehensive build metrics system: (1) Vite plugin `plugins/vite-build-metrics.ts` for automatic per-build phase tracking, (2) Standalone script `scripts/build-time-tracker.ts` for historical analysis and reporting. Features: phase breakdown (config-resolve, plugins-init, module-resolution, transform, bundle-generation, write-bundle), bundle size tracking, chunk counting, git info, trend analysis, performance thresholds (good/warning/slow), and automatic recommendations. npm scripts: `build:track`, `build:track:dev`, `build:report`. Metrics stored in `test-artifacts/build-metrics/`. Current production build: ~9s (GOOD status). |
| INF-013 | Deployment rollback automation | 2026-02-15 | ✅ **DEPLOYMENT ROLLBACK IMPLEMENTED.** Created comprehensive rollback tooling: (1) TypeScript script `scripts/deployment-rollback.ts` for listing deployments and executing rollbacks, (2) npm scripts: `deploy:list`, `deploy:current`, `deploy:rollback`, `deploy:rollback:prev`, `deploy:rollback:status`, (3) Documentation: `docs/DEPLOYMENT_ROLLBACK_PROCEDURES.md`. Features: safe command execution (execFileSync), input validation, interactive confirmation, automatic verification after rollback, JSON output support. Uses Vercel CLI under the hood. |