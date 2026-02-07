# PM-Transactions Backlog

> **Last Updated:** 2026-02-07 (Cycle 9 - TRX-008 investigated)

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| TRX-008 | Deal Activity Timeline | P2 | Investigation complete, ready for implementation |

## Ready

| ID | Item | Priority | Description | Acceptance Criteria |
|----|------|----------|-------------|---------------------|
| TRX-009 | Deal Document Association View | P2 | Show documents linked to a specific deal in the deal detail sheet. Currently there's no way to see which documents are associated with a deal from the deal view. | - Documents section in DealDetailSheet - Shows documents where `documents.deal_id` matches - Link to document view - Count badge on section header |
| TRX-010 | Align Pipeline Stages with PRD | P3 | Current stages (6 per type) don't match PRD which defines 8 buyer stages and 7 seller stages. Missing: Active Buyer, Property Search, Making Offers, Closing, Closed Lost (buyer); Pre-Listing, Offer Review, Closing Prep (seller). | - Buyer stages match PRD Section 8.1 - Seller stages match PRD Section 8.2 - Migration path for existing deals - Stage color assignments for new stages |
| TRX-011 | Enhanced Activity Logging | P3 | Create dedicated `deal_activities` table for comprehensive audit trail with stage changes, individual note timestamps, field updates, and rich activity metadata. Deferred from TRX-008 Option B. Requires schema migration, hook updates, and backfill strategy. | - New `deal_activities` table with activity_type, metadata JSONB - Stage change tracking via trigger or hook - Individual note timestamps - Field update tracking - Migration with backfill for existing deals - Activity log query API |

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| TRX-000 | PM-Transactions setup | 2026-02-05 | Initial agent setup |
| TRX-001 | Initial domain audit | 2026-02-06 | Completed comprehensive domain audit (`DOMAIN_AUDIT.md`). Created missing hooks (`useDeals.tsx`, `usePipeline.tsx`). Documented gaps between ownership claims and actual implementation. Health score: 85/100. |
| TRX-002 | Review all active deals | 2026-02-06 | Deal health audit system implemented (`DealHealthAudit.tsx`) with stalled/overdue detection |
| TRX-003 | Check pipeline health | 2026-02-06 | Created comprehensive pipeline E2E tests (`tests/e2e/pipeline.spec.ts`) covering seller deals, stage transitions, milestones, navigation, and layout. Enhanced `deals.spec.ts` with seller deal verification tests. |
| TRX-004 | Audit milestone system | 2026-02-06 | Completed comprehensive milestone system audit (`MILESTONE_AUDIT.md`). Added database indexes for performance (due_date, composite indexes). Added check constraints for data integrity (completed_after_due, completed_not_future, reasonable dates). Added length constraints on title (100) and notes (500). Added unique constraint preventing duplicate incomplete milestones. Fixed reminder function to check 3 days instead of 24 hours (matches UI indicator logic). Health score: 78/100 → improvements implemented. |
| TRX-005 | Add AI deal suggestions | 2026-02-06 | Implemented AI-powered deal suggestions feature. Created edge function `deal-suggestions` that analyzes deal data (milestones, activities, dates, stage) using Claude AI to generate actionable suggestions. Added `useDealSuggestions` hook and `DealSuggestions` component with priority-based UI (high/medium/low). Integrated into `DealDetailSheet` component. Suggestions include actions like moving stages, adding milestones, contacting clients, and updating dates. Includes fallback suggestions if AI parsing fails. |
| TRX-006 | Pipeline Revenue Forecast | 2026-02-07 | Created `RevenueForecast` component (`src/components/pipeline/RevenueForecast.tsx`) with: YTD earnings from closed deals, total pipeline commission, weighted forecast by stage probability (Lead 10% → Closed 100%), 6-month monthly commission forecast chart with stacked bars (total vs weighted), unscheduled deals section, and tooltips explaining methodology. Integrated into Pipeline.tsx. Also fixed missing imports in Pipeline.tsx (`useQuery`, `useMutation`, `addDays`, `format`, `DealHealthAudit`). |
| TRX-007 | Create useDeals & usePipeline hooks | 2026-02-07 | Enhanced `useDeals.ts`: added `actual_close_date` to `DealWithRelations` and query select. Enhanced `usePipeline.ts`: added `useRevenueForecast` hook with stage-weighted commission forecast derived from shared `useDeals` cache, exported `STAGE_WEIGHTS` and `MonthlyForecast` types. Refactored `PipelineAnalytics.tsx` to use `usePipelineMetrics` (eliminated duplicate `deals-analytics` inline query). Refactored `RevenueForecast.tsx` to use `useRevenueForecast` (eliminated 2 inline queries: `deals-forecast` + `deals-closed`). Net: 3 duplicate Supabase queries eliminated, all pipeline data flows through single `useDeals` React Query cache. Typecheck + lint clean. |