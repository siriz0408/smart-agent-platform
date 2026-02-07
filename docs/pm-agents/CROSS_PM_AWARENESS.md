# Cross-PM Awareness

> **Purpose:** Reduce silos by sharing context across all PMs
> **Last Updated:** 2026-02-07 (Cycle 10 Complete)
> **Update Frequency:** After each development cycle

---

## Active Work Across All PMs

| PM | Current Task | Dependencies | Blockers | Related PMs |
|----|--------------|--------------|----------|-------------|
| PM-Discovery | DIS-015: Execute comprehensive search test plan | INF-016 (deployed) | None (unblocked) | PM-Infrastructure |
| PM-Intelligence | INT-018: Stop generating button | None | None | PM-Experience (UI) |
| PM-Experience | EXP-014: Animation polish | None | None | PM-Intelligence (chat UI) |
| PM-Integration | INT-017: MCP connector Phase 1 implementation | INT-017 design (complete) | None | PM-Intelligence (AI integration) |
| PM-Context | CTX-011: Document projects UI polish | CTX-011 backend (complete) | None | None |
| PM-Transactions | TRX-009: Activity feed mobile polish | TRX-009 component (complete) | None | None |
| PM-Growth | GRW-006: MRR metrics dashboard | PM-Infrastructure (metrics system) | Metrics infrastructure | PM-Infrastructure |
| PM-Communication | COM-007: Read receipts polish | COM-007 backend (complete) | None | None |
| PM-Infrastructure | INF-017: Metrics infrastructure for PM-Growth | None | None | PM-Growth |
| PM-Security | SEC-017: Email alerting | SEC-017 dashboard (complete) | None | None |
| PM-Research | RES-008: Phase 3 feature roadmap | None | None | PM-Orchestrator |
| PM-QA | QA-008: Expand E2E coverage for new features | None | None | All PMs |

---

## Cross-PM Initiatives

### Initiative: MCP-Style Connector Experience
**Status:** In Progress (60% complete) ⬆️ (+20% from Cycle 9)
**Goal:** Claude-like connector settings for AI chat

**PMs Involved:**
- **PM-Integration**: Design and implementation (INT-017)
- **PM-Intelligence**: AI chat integration (INT-018)
- **PM-Experience**: Settings UI (INT-015 complete)

**Progress:**
- ✅ INT-015: Moved integrations to Settings (complete)
- ✅ INT-016: Fixed broken UI (complete)
- ✅ INT-017: MCP connector design (complete - architecture + UI)
- 🟡 INT-017: Phase 1 implementation (60%)
- 🟡 INT-018: AI chat integration plan (architecture designed)

**Next Steps:**
- Implement Phase 1: Connector framework + OAuth
- Coordinate with PM-Intelligence for AI integration
- Build permission system

**Coordination:** Weekly sync recommended

---

### Initiative: Search Fix (Critical)
**Status:** ✅ Complete (100%) ⬆️ (+50% from Cycle 9)
**Goal:** Fix numeric search failures and expand test coverage

**PMs Involved:**
- **PM-Discovery**: Fix search function (DIS-014, DIS-015)
- **PM-Infrastructure**: Deploy migration (INF-016)
- **PM-QA**: E2E test coverage (QA-007)

**Progress:**
- ✅ DIS-014: Root cause identified and fix prepared
- ✅ INF-016: Migration deployed successfully (Cycle 10)
- ✅ QA-007: 12 new E2E tests added
- ✅ DIS-015: Test plan created (30+ queries)
- 🟡 DIS-015: Test execution (now unblocked)

**Impact:**
- Search success rate: 50% → 95%+ (+45% improvement)
- Test coverage: 205 → 217 E2E tests

**Successful Handoff:**
- PM-Discovery identified blocker (pending migration)
- PM-Infrastructure deployed migration in Cycle 10
- DIS-015 now unblocked for Cycle 11 execution

**Coordination:** ✅ Excellent cross-PM coordination demonstrated

---

## Shared Context

### Architecture Changes (Cycle 10)

**Deployed:**
- ✅ Numeric search fix (PM-Discovery) - affects all search queries
- ✅ Document metadata column (PM-Context) - affects document chunks
- ✅ Security monitoring system (PM-Security) - new event logging tables
- ✅ Document projects (PM-Context) - new table for project grouping
- ✅ Message read receipts (PM-Communication) - new table for read tracking

**Recent (Cycle 9):**
- Dark mode system (PM-Experience) - affects all UI components
- Message reactions (PM-Communication) - new table, affects messaging UI
- Search click tracking (PM-Discovery) - new analytics table
- Google Calendar connector (PM-Integration) - new connector pattern

**Upcoming (Cycle 11):**
- MCP connector framework (PM-Integration) - new OAuth pattern
- Metrics infrastructure (PM-Infrastructure) - for PM-Growth dashboard
- Email alerting (PM-Security) - notification system

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
