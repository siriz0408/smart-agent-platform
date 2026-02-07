# Cross-PM Awareness

> **Purpose:** Reduce silos by sharing context across all PMs
> **Last Updated:** 2026-02-07 (Cycle 9)
> **Update Frequency:** After each development cycle

---

## Active Work Across All PMs

| PM | Current Task | Dependencies | Blockers | Related PMs |
|----|--------------|--------------|----------|-------------|
| PM-Discovery | DIS-014: Fix numeric search | None | None | PM-Context (search data) |
| PM-Intelligence | INT-014/15/16: Fix AI chat buttons | None | None | PM-Experience (UI components) |
| PM-Experience | EXP-011/12/13: Navigation & layout fixes | None | None | PM-Intelligence (chat UI) |
| PM-Integration | INT-015/16/17/18: Architecture refactor | INT-015 (Settings move) | None | PM-Intelligence (AI chat integration), PM-Experience (Settings UI) |
| PM-Context | CTX-005/10: Metadata column migration | None | None | PM-Intelligence (RAG citations) |
| PM-Transactions | TRX-007: Deal hooks refactor | None | None | None |
| PM-Growth | GRW-006: Subscription plan UI | None | MRR metrics blocked | PM-Infrastructure (metrics) |
| PM-Communication | COM-006: Message search + archive | None | None | None |
| PM-Infrastructure | INF-012: Deploy pending migrations | None | None | PM-Context, PM-Communication, PM-Integration |
| PM-Security | SEC-016: RLS tightening | None | None | PM-Context (data access) |
| PM-Research | RES-006: Email/calendar API research | Complete | None | PM-Integration |
| PM-QA | QA-006: E2E baseline documentation | Complete | None | All PMs |

---

## Cross-PM Initiatives

### Initiative: MCP-Style Connector Experience
**Status:** In Progress (40% complete)
**Goal:** Claude-like connector settings for AI chat

**PMs Involved:**
- **PM-Integration**: Design and architecture (INT-017)
- **PM-Intelligence**: AI chat integration (INT-018)
- **PM-Experience**: Settings UI (INT-015 complete)

**Progress:**
- ✅ INT-015: Moved integrations to Settings (complete)
- ✅ INT-016: Fixed broken UI (complete)
- 🟡 INT-017: MCP connector design (in progress)
- 🟡 INT-018: AI chat integration plan (pending)

**Coordination:** Weekly sync recommended

---

### Initiative: Search Fix (Critical)
**Status:** In Progress (P0)
**Goal:** Fix numeric search failures

**PMs Involved:**
- **PM-Discovery**: Fix search function (DIS-014)
- **PM-Context**: Verify data access patterns

**Progress:**
- 🔴 DIS-014: Root cause identified, fix in progress
- 🔴 DIS-015: Comprehensive testing needed
- 🔴 DIS-016: Input matching investigation needed

**Coordination:** Daily updates until resolved

---

## Shared Context

### Architecture Changes

**Recent:**
- Dark mode system (PM-Experience) - affects all UI components
- Message reactions (PM-Communication) - new table, affects messaging UI
- Search click tracking (PM-Discovery) - new analytics table
- Google Calendar connector (PM-Integration) - new connector pattern

**Upcoming:**
- Metadata column migration (PM-Context) - affects document chunks
- Deal hooks refactor (PM-Transactions) - new hook pattern

### Common Patterns

**Data Access:**
- All PMs use workspace_id for tenant isolation
- RLS policies enforced on all tables
- Service role for backend operations

**UI Components:**
- shadcn/ui components preferred
- Tailwind CSS for styling
- React Query for data fetching

**Testing:**
- E2E tests use Playwright
- Test helpers in `tests/e2e/helpers/`
- Browser automation via MCP

---

## Cross-PM Dependencies

### PM-Intelligence ↔ PM-Context
- **RAG quality** depends on document indexing quality
- **AI citations** need chunk metadata (page numbers, sections)
- **Document types** affect AI prompt selection

### PM-Experience ↔ PM-[Any]
- **UI components** used across all domains
- **Layout changes** affect all pages
- **Design system** shared by all

### PM-Integration ↔ PM-Intelligence
- **Connector data** feeds AI chat
- **OAuth flows** need UI components
- **MCP pattern** affects AI agent execution

### PM-Growth ↔ PM-Infrastructure
- **Metrics** depend on infrastructure
- **Billing** needs deployment verification
- **Usage tracking** requires monitoring

---

## Coordination Guidelines

**Before Starting Work:**
1. Read this document
2. Check for related work by other PMs
3. Identify dependencies or coordination needs
4. Note any cross-PM impacts in work report

**During Work:**
- Update this document if you discover cross-PM impacts
- Create handoffs if coordination needed
- Share learnings that might help other PMs

**After Work:**
- Update this document with completed work
- Note any patterns or solutions discovered
- Document cross-PM coordination that worked well

---

## Weekly Cross-PM Sync

**When:** Every Friday (end of week)
**Facilitated by:** PM-Orchestrator

**Agenda:**
1. Work Review - Each PM shares accomplishments
2. Dependency Check - Review upcoming work
3. Best Practice Sharing - Share successful patterns
4. Update This Document - Refresh active work table

---

*This document is maintained by PM-Orchestrator. PMs should check this before starting work and update it when they discover cross-PM impacts.*
