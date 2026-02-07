# PM-Infrastructure Backlog

> **Last Updated:** 2026-02-07

## In Progress

| ID | Item | Priority | Effort |
|----|------|----------|--------|

## Ready

| ID | Item | Priority | Effort |
|----|------|----------|--------|
| INF-012 | Track build times | P2 | S |
| INF-013 | Add deployment rollback automation | P2 | M |
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