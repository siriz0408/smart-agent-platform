# PM-Integration Backlog

> **Last Updated:** 2026-02-15 (INT-017 Completed)

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| - | None | - | - |

## Ready

| ID | Item | Priority | Effort | Notes |
|----|------|----------|--------|-------|
| INT-018 | Plan AI chat integration with calendar/email/notes | P2 | L | Strategic: Agent-accessible data sources for chat |
| INT-005 | Create API docs | P2 | M | Blocked until public API exists |
| INT-009 | Add integration usage analytics | P2 | S | Track adoption metrics |
| INT-011 | Design public API v1 | P2 | L | Enable external developers |
| INT-013 | Add Microsoft Outlook calendar connector | P3 | L | Expand calendar integration to Office 365 users |
| INT-014 | Add Zoom meeting connector | P3 | M | Auto-create Zoom meetings from calendar events |

---

## Task Details

### INT-015: Move Integrations page to Settings
**Priority:** P0 | **Effort:** M | **Source:** Issue Tracker 2026-02-07

**Problem:** Integrations page is in main navigation. Should be in Settings (information architecture issue).

**Files to Modify:**
- `src/pages/Integrations.tsx` (move to Settings section)
- `src/pages/Settings.tsx` (add Integrations tab)
- `src/components/layout/GleanSidebar.tsx` (remove Integrations nav item)
- `src/App.tsx` (update routes if needed)

**Task:**
1. Remove "Integrations" from main navigation sidebar
2. Add "Integrations" tab to Settings page
3. Ensure all existing integration UI works in new location
4. Update internal links/routing
5. Test OAuth flows still work after move

**Acceptance Criteria:**
- [ ] Integrations removed from main nav
- [ ] Integrations accessible via Settings tab
- [ ] All integration functionality works in new location
- [ ] OAuth flows still work
- [ ] Tests pass

---

### INT-016: Fix broken Integrations page + remove duplicate data sources
**Priority:** P1 | **Effort:** M | **Source:** Issue Tracker 2026-02-07

**Problem:** User reports "this page doesn't work at all" + "we also have a separate page for data sources in admin console."

**Files to Investigate:**
- `src/pages/Integrations.tsx`
- Admin console data sources page (find and remove/merge)
- Integration-related components

**Debug Steps:**
1. Identify what's broken on Integrations page
   - [ ] Connectors not showing?
   - [ ] OAuth not working?
   - [ ] UI completely broken?
2. Find duplicate "data sources" page in admin console
3. Decide: merge or remove duplicate
4. Fix broken functionality
5. Test all OAuth flows

**Acceptance Criteria:**
- [ ] Integrations page functional
- [ ] Users can connect/disconnect integrations
- [ ] Duplicate data sources page removed or merged
- [ ] Clear single source of truth for integration management
- [ ] Tests pass

---

### INT-017: Design MCP-style connector experience
**Priority:** P1 | **Effort:** L | **Source:** Issue Tracker 2026-02-07

**Product Vision (from Product Lead):**
> "Think of the Claude experience. You go to Settings, enable connectors that your AI can search with via MCP. This is the experience I eventually want with AI chat. A real estate agent can connect their calendar, emails, notes, etc. and chat with them."

**Objective:** Design integration experience similar to Claude's MCP connector settings.

**Claude MCP Model:**
1. Settings > Integrations/Connectors
2. Toggle switches to enable/disable connectors
3. AI chat can access enabled connectors
4. Clear permissions and data access visibility

**Design Requirements:**
1. **Settings Location** (INT-015 prerequisite)
2. **Toggle Interface:**
   - List of available connectors (Gmail, Calendar, MLS, Notes, etc.)
   - Simple enable/disable toggle per connector
   - OAuth/auth flow on first enable
3. **AI Chat Integration:**
   - AI can query data from enabled connectors
   - User controls which data sources AI can access
   - Clear "Data sources available" indicator in chat
4. **Permissions & Privacy:**
   - Clear explanation of what data AI can access
   - Granular controls (e.g., only work calendar, not personal)
   - Revoke access easily

**Deliverables:**
- [ ] Design doc with UI mockups
- [ ] Integration permissions model
- [ ] AI chat + connector integration architecture
- [ ] Implementation plan for Phase 1 (MVP)

**Acceptance Criteria:**
- [ ] Design aligns with Claude MCP model
- [ ] Clear user controls for data access
- [ ] Integration with AI chat planned
- [ ] PM-Orchestrator approval

---

### INT-018: Plan AI chat integration with calendar/email/notes
**Priority:** P2 | **Effort:** L | **Source:** Issue Tracker 2026-02-07

**Objective:** Research and plan how AI chat can query user's connected data sources.

**Use Cases:**
1. **Calendar Integration:**
   - "What meetings do I have today?"
   - "Schedule a showing at 123 Main St next Tuesday"
   - "Check my availability for Friday afternoon"

2. **Email Integration:**
   - "Summarize emails from John Smith"
   - "Did I respond to the offer from yesterday?"
   - "Find all emails about 123 Main St"

3. **Notes Integration:**
   - "What did I note about the Johnson property?"
   - "Summarize my thoughts on the buyer from last week"

**Technical Requirements:**
- Connector framework (already exists via INT-006)
- AI function calling to query connectors
- Permission system (user must enable connector for AI access)
- RAG-style retrieval from connected data sources

**Deliverables:**
- [ ] Implementation plan
- [ ] AI prompt templates for connected data queries
- [ ] Permission model
- [ ] Phase 1 MVP scope

**Acceptance Criteria:**
- [ ] Plan created
- [ ] Handed off to PM-Intelligence for AI integration
- [ ] PM-Orchestrator approval

---

## Completed

| ID | Item | Completed |
|----|------|-----------|
| INT-000 | PM-Integration setup | 2026-02-05 |
| INT-001 | Initial domain audit | 2026-02-06 |
| INT-002 | Inventory current integrations | 2026-02-06 |
| INT-003 | Research MLS options | 2026-02-06 | ✅ RES-003 complete - Bridge Interactive recommended |
| INT-006 | Design connector framework | 2026-02-06 | ✅ Architecture complete, ready for implementation |
| INT-007 | Implement Gmail connector | 2026-02-06 | ✅ Database migration + OAuth callback handler complete |
| INT-008 | Build integration management UI | 2026-02-06 | ✅ OAuth connection flow implemented - users can connect/disconnect integrations |
| INT-010 | Implement Google Calendar connector | 2026-02-07 | ✅ Full connector with 5 actions: create_event, list_events, update_event, delete_event, get_availability (FreeBusy API). Migration to activate + updated OAuth scopes |
| INT-012 | Implement Bridge Interactive MLS connector | 2026-02-06 | ✅ Connector class implemented with RESO Web API support - search_listings, get_listing_details, get_listing_photos, sync_listings actions |
| INT-004 | Plan email sync | 2026-02-07 | ✅ Comprehensive implementation plan created. 4-phase approach: Gmail read-only sync (MVP), Gmail write ops, Outlook support, advanced features. Database schema, edge functions, UI components, and testing strategy defined. Report: `docs/pm-agents/reports/2026-02-07/pm-integration-int004-email-sync-plan.md` |
| **INT-015** | **Move Integrations page to Settings** | **2026-02-07** | ✅ Moved integrations from main nav to Settings tab. Created IntegrationsSettings component. OAuth flows updated to redirect to Settings#integrations. Legacy /integrations route redirects to Settings. |
| **INT-016** | **Fix broken Integrations page + remove duplicate data sources** | **2026-02-07** | ✅ Removed duplicate AdminDataSources page with placeholder data. Admin console now links to Settings#integrations. Removed /admin/data-sources route. Single source of truth for integration management established. |
| **INT-017** | **Design MCP-style connector experience** | **2026-02-15** | ✅ Implemented MCP-style AI Chat connector toggles. Created `AIConnectorToggle` component with permission dialog. Added `ai_enabled` column to `workspace_connectors` table. IntegrationCard now shows AI toggle for connected integrations. "AI Chat Data Sources" summary shows enabled connectors. |