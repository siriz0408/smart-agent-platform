# PM-Transactions Memory

> **Last Updated:** 2026-02-15 (Cycle 14)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Deal Pipeline Pattern:**
- Kanban board with stages
- Deal cards show key info (address, price, stage)
- Drag-and-drop stage changes
- Revenue forecast with weighted probabilities

**Deal Hooks Pattern:**
- `useDeals` hook for deal data
- `usePipeline` hook for pipeline data
- `useDealNotifications` hook for activity notifications
- `useDealActivities` hook for activity timeline (TRX-012)
- Eliminates duplicate Supabase queries
- Consistent data fetching across components

**Revenue Forecast Pattern:**
- YTD earnings calculation
- Pipeline commission forecast
- Weighted probabilities (based on stage)
- 6-month chart visualization

**Notification Pattern (TRX-011):**
- Edge function `deal-notifications` handles notification creation
- Respects user preferences (`deal_updates` from `user_preferences` table)
- Two notification types: `deal_stage_change` and `milestone_completion`
- Email templates in `_shared/email-templates.ts`
- Fire-and-forget pattern for non-blocking UI

**Activity Logging Pattern (TRX-012):**
- Dedicated `deal_activities` table with JSONB metadata
- Database triggers handle automatic logging (deal creation, milestones, documents)
- Frontend hooks handle user-initiated logging (stage changes, notes)
- Activity types are extensible via check constraint
- Backfill strategy for existing data ensures historical continuity
- Fire-and-forget logging to avoid blocking user actions

### Common Issues & Solutions

**Issue:** Duplicate Supabase queries
- **Solution:** Create useDeals & usePipeline hooks
- **Pattern:** Centralize data fetching, reuse hooks

**Issue:** Pipeline stages misaligned with PRD
- **Solution:** Aligned stages in Cycle 12 (TRX-010)
- **Pattern:** Keep PRD and implementation in sync

**Issue:** Revenue forecast missing
- **Solution:** Created RevenueForecast component
- **Pattern:** Add financial metrics to pipeline view

**Issue:** Deal activity changes not notified
- **Solution:** Created `deal-notifications` edge function (TRX-011)
- **Pattern:** Use edge functions for notification logic, respect user preferences

**Issue:** No comprehensive activity audit trail
- **Solution:** Created `deal_activities` table with triggers and hooks (TRX-012)
- **Pattern:** Combine DB triggers for automatic events + hooks for user actions

### Domain-Specific Knowledge

**Deal Stages:**
- Buyer: Lead -> Active Buyer -> Property Search -> Making Offers -> Under Contract -> Closing -> Closed Won/Lost
- Seller: Prospect -> Pre-Listing -> Active Listing -> Offer Review -> Under Contract -> Closing Prep -> Closed

**Deal Metrics:**
- Deal velocity (time in each stage)
- Conversion rate (stage to stage)
- Revenue forecast (weighted by probability)
- Pipeline value

**Milestone Tracking:**
- Deal milestones with deadlines
- Auto-reminders via `check-milestone-reminders` edge function
- Completion notifications via `deal-notifications` edge function
- Document associations
- Activity logging via triggers on `deal_milestones` table

**Notification Types:**
- `milestone_reminder` - Upcoming milestone due
- `deal_stage_change` - Deal moved to new stage
- `milestone_completion` - Milestone marked complete (uses `milestone_reminder` type with `completed: true` metadata)

**Activity Types (TRX-012):**
- `created` - Deal was created (trigger)
- `stage_changed` - Deal moved to new stage (hook)
- `note_added` - Note added to deal (hook)
- `milestone_created` - Milestone added (trigger)
- `milestone_completed` - Milestone completed (trigger)
- `document_uploaded` - Document uploaded to deal (trigger)
- `field_updated` - Deal field updated (future TRX-013)

### Cross-PM Coordination Patterns

**With PM-Context:**
- Deal documents need proper indexing
- Document associations with deals
- Document access permissions
- Document uploads auto-logged to deal_activities via trigger

**With PM-Intelligence:**
- AI can suggest next actions for deals
- Deal context in AI chat
- Automated task creation

**With PM-Experience:**
- Pipeline/Kanban board UI
- Deal detail components
- Revenue forecast panel
- Notification bell integration
- Activity timeline component

**With PM-Communication:**
- Notifications use shared notification infrastructure
- Email templates in `_shared/email-templates.ts`
- Real-time notification updates via Supabase subscriptions

---

## Recent Work Context

### Last Cycle (Cycle 14)
- **Worked on:** TRX-012 - Enhanced Activity Logging (complete)
- **Created:**
  - `supabase/migrations/20260215140000_create_deal_activities.sql` - Migration with table, triggers, RLS, backfill
  - `src/hooks/useDealActivities.ts` - Hook for fetching/creating activities with helpers
  - `src/components/deals/DealActivityTimeline.tsx` - Visual timeline component
- **Updated:**
  - `src/hooks/useDeals.ts` - Added `logStageChangeActivity` function, activity invalidation
  - `src/components/deals/AddNoteDialog.tsx` - Added note activity logging
  - `src/components/deals/DealDetailSheet.tsx` - Integrated activity timeline
- **Discovered:** Need TRX-013 for field update tracking (price, dates, etc.)
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 13:**
- TRX-011: Deal Activity Notifications (complete)
- Created deal-notifications edge function
- Integrated with useDeals and MilestoneList

**Cycle 12:**
- TRX-010: Aligned pipeline stages with PRD
- Buyer: 8 stages, Seller: 7 stages

**Cycle 9:**
- TRX-007: Deal hooks refactor (complete)

**Cycle 8:**
- Implemented revenue forecast panel
- Added weighted probability calculations
- Created 6-month chart

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for UI improvements
- Using `/feature-dev` for complex features (revenue forecast)
- Coordinating with PM-Context on document associations
- Fire-and-forget for non-blocking operations (notifications, activity logging)
- Database triggers for automatic event logging
- Frontend hooks for user-initiated event logging
- JSONB metadata for extensible activity details

**Avoids:**
- Duplicating data fetching logic
- Hardcoding deal stages
- Skipping revenue calculations
- Blocking user actions for non-critical operations
- Complex join queries when simple hooks suffice

**Works well with:**
- PM-Context (deal documents)
- PM-Intelligence (AI suggestions)
- PM-Experience (pipeline UI, activity timeline)
- PM-Communication (notifications infrastructure)

---

*This memory is updated after each development cycle. PM-Transactions should read this before starting new work.*
