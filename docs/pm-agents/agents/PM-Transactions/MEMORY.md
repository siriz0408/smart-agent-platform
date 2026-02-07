# PM-Transactions Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
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
- Eliminates duplicate Supabase queries
- Consistent data fetching across components

**Revenue Forecast Pattern:**
- YTD earnings calculation
- Pipeline commission forecast
- Weighted probabilities (based on stage)
- 6-month chart visualization

### Common Issues & Solutions

**Issue:** Duplicate Supabase queries
- **Solution:** Create useDeals & usePipeline hooks
- **Pattern:** Centralize data fetching, reuse hooks

**Issue:** Pipeline stages misaligned with PRD
- **Solution:** Need to align stages (TRX-010)
- **Pattern:** Keep PRD and implementation in sync

**Issue:** Revenue forecast missing
- **Solution:** Created RevenueForecast component
- **Pattern:** Add financial metrics to pipeline view

### Domain-Specific Knowledge

**Deal Stages:**
- Buyer: Lead → Active Buyer → Property Search → Making Offers → Under Contract → Closing → Closed Won/Lost
- Seller: Lead → Listing Prep → Active Listing → Under Contract → Closing → Closed Won/Lost

**Deal Metrics:**
- Deal velocity (time in each stage)
- Conversion rate (stage to stage)
- Revenue forecast (weighted by probability)
- Pipeline value

**Milestone Tracking:**
- Deal milestones with deadlines
- Auto-reminders (future)
- Activity logging
- Document associations

### Cross-PM Coordination Patterns

**With PM-Context:**
- Deal documents need proper indexing
- Document associations with deals
- Document access permissions

**With PM-Intelligence:**
- AI can suggest next actions for deals
- Deal context in AI chat
- Automated task creation

**With PM-Experience:**
- Pipeline/Kanban board UI
- Deal detail components
- Revenue forecast panel

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** TRX-007 - Deal hooks refactor (complete)
- **Discovered:** Need to align pipeline stages with PRD (TRX-010)
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Implemented revenue forecast panel
- Added weighted probability calculations
- Created 6-month chart

**Cycle 7:**
- Established pipeline patterns
- Created deal management system

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for UI improvements
- Using `/feature-dev` for complex features (revenue forecast)
- Coordinating with PM-Context on document associations

**Avoids:**
- Duplicating data fetching logic
- Hardcoding deal stages
- Skipping revenue calculations

**Works well with:**
- PM-Context (deal documents)
- PM-Intelligence (AI suggestions)
- PM-Experience (pipeline UI)

---

*This memory is updated after each development cycle. PM-Transactions should read this before starting new work.*
