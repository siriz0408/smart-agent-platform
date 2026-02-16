# PM-Transactions Backlog

> **Last Updated:** 2026-02-15 (Cycle 14 - TRX-012 complete)

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| TRX-008 | Deal Activity Timeline | P2 | Superseded by TRX-012 (more comprehensive solution) |

## Ready

| ID | Item | Priority | Description | Acceptance Criteria |
|----|------|----------|-------------|---------------------|
| TRX-009 | Deal Document Association View | P2 | Show documents linked to a specific deal in the deal detail sheet. Currently there's no way to see which documents are associated with a deal from the deal view. | - Documents section in DealDetailSheet - Shows documents where `documents.deal_id` matches - Link to document view - Count badge on section header |
| TRX-010 | COMPLETED - Align Pipeline Stages with PRD | P3 | Completed 2026-02-14 in Cycle 12 | Buyer: 8 stages (PRD 8.1), Seller: 7 stages (PRD 8.2), STAGE_WEIGHTS updated |
| TRX-011 | COMPLETED - Deal Activity Notifications | P3 | Completed 2026-02-15 in Cycle 13 | Stage change notifications, milestone completion notifications, user preference integration |
| TRX-012 | COMPLETED - Enhanced Activity Logging | P3 | Completed 2026-02-15 in Cycle 14 | deal_activities table, stage change logging, note logging, activity timeline UI |
| TRX-013 | Field Update Tracking | P3 | Track when deal fields are updated (price, dates, etc.) and log to deal_activities. Currently only stage changes and notes are logged. | - Detect field changes in EditDealDialog - Log field updates to deal_activities - Show in activity timeline |

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| TRX-000 | PM-Transactions setup | 2026-02-05 | Initial agent setup |
| TRX-001 | Initial domain audit | 2026-02-06 | Completed comprehensive domain audit (`DOMAIN_AUDIT.md`). Created missing hooks (`useDeals.tsx`, `usePipeline.tsx`). Documented gaps between ownership claims and actual implementation. Health score: 85/100. |
| TRX-002 | Review all active deals | 2026-02-06 | Deal health audit system implemented (`DealHealthAudit.tsx`) with stalled/overdue detection |
| TRX-003 | Check pipeline health | 2026-02-06 | Created comprehensive pipeline E2E tests (`tests/e2e/pipeline.spec.ts`) covering seller deals, stage transitions, milestones, navigation, and layout. Enhanced `deals.spec.ts` with seller deal verification tests. |
| TRX-004 | Audit milestone system | 2026-02-06 | Completed comprehensive milestone system audit (`MILESTONE_AUDIT.md`). Added database indexes for performance (due_date, composite indexes). Added check constraints for data integrity (completed_after_due, completed_not_future, reasonable dates). Added length constraints on title (100) and notes (500). Added unique constraint preventing duplicate incomplete milestones. Fixed reminder function to check 3 days instead of 24 hours (matches UI indicator logic). Health score: 78/100 -> improvements implemented. |
| TRX-005 | Add AI deal suggestions | 2026-02-06 | Implemented AI-powered deal suggestions feature. Created edge function `deal-suggestions` that analyzes deal data (milestones, activities, dates, stage) using Claude AI to generate actionable suggestions. Added `useDealSuggestions` hook and `DealSuggestions` component with priority-based UI (high/medium/low). Integrated into `DealDetailSheet` component. Suggestions include actions like moving stages, adding milestones, contacting clients, and updating dates. Includes fallback suggestions if AI parsing fails. |
| TRX-006 | Pipeline Revenue Forecast | 2026-02-07 | Created `RevenueForecast` component (`src/components/pipeline/RevenueForecast.tsx`) with: YTD earnings from closed deals, total pipeline commission, weighted forecast by stage probability (Lead 10% -> Closed 100%), 6-month monthly commission forecast chart with stacked bars (total vs weighted), unscheduled deals section, and tooltips explaining methodology. Integrated into Pipeline.tsx. Also fixed missing imports in Pipeline.tsx (`useQuery`, `useMutation`, `addDays`, `format`, `DealHealthAudit`). |
| TRX-007 | Create useDeals & usePipeline hooks | 2026-02-07 | Enhanced `useDeals.ts`: added `actual_close_date` to `DealWithRelations` and query select. Enhanced `usePipeline.ts`: added `useRevenueForecast` hook with stage-weighted commission forecast derived from shared `useDeals` cache, exported `STAGE_WEIGHTS` and `MonthlyForecast` types. Refactored `PipelineAnalytics.tsx` to use `usePipelineMetrics` (eliminated duplicate `deals-analytics` inline query). Refactored `RevenueForecast.tsx` to use `useRevenueForecast` (eliminated 2 inline queries: `deals-forecast` + `deals-closed`). Net: 3 duplicate Supabase queries eliminated, all pipeline data flows through single `useDeals` React Query cache. Typecheck + lint clean. |
| TRX-011 | Deal Activity Notifications | 2026-02-15 | Implemented deal activity notifications system. Created `deal-notifications` edge function for stage changes and milestone completions. Created `useDealNotifications` hook for frontend integration. Updated `useDeals.ts` to send notifications on stage changes (with previous stage tracking). Updated `MilestoneList.tsx` to send notifications on milestone completion. Added `milestone_completed` email template. Respects user preferences (`deal_updates` setting). |
| TRX-012 | Enhanced Activity Logging | 2026-02-15 | **Comprehensive activity tracking system implemented:** Created `deal_activities` table with migration (`20260215140000_create_deal_activities.sql`) including: activity types (created, stage_changed, note_added, milestone_created, milestone_completed, document_uploaded, field_updated), JSONB metadata, RLS policies, and indexes. Created triggers for automatic logging of deal creation, milestone creation/completion, and document uploads. Implemented backfill for existing deals and milestones. Created `useDealActivities` hook with helper functions (`useLogStageChange`, `useLogNoteAdded`, `useLogFieldUpdate`). Created `DealActivityTimeline` component with visual timeline, icons per activity type, and responsive design. Updated `useDeals.ts` to log stage changes. Updated `AddNoteDialog` to log note additions. Integrated timeline into `DealDetailSheet`. |
