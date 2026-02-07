# Issue Tracker Report
> **Date:** 2026-02-07
> **Submitted by:** Product Lead
> **Status:** Delegated to PM Team
> **Priority:** HIGH - Critical UX and functionality issues

---

## Executive Summary

User testing has revealed critical issues across 4 domains that are blocking optimal user experience. These issues have been triaged and delegated to the appropriate Product Managers for immediate resolution.

**Impact:** High - Core functionality (search, AI chat) is broken or degraded
**Urgency:** P0 tasks should be completed in next PM Dev Cycle

---

## Issues by Domain

### 1. UI/UX Issues → **PM-Experience** 🎨

| Issue ID | Description | Priority | Impact |
|----------|-------------|----------|--------|
| **EXP-011** | Sidebar navigation needs revamp - hide Help, Admin, Settings under dropdown menu | P0 | Navigation clutter, poor mobile experience |
| **EXP-012** | Workspace not centered | P0 | Visual imbalance, unprofessional appearance |
| **EXP-013** | Chat history layout - needs padding/spacing from edge of column | P0 | Poor readability, cramped UI |

**Owner:** PM-Experience
**Files Affected:**
- `src/components/layout/GleanSidebar.tsx`
- `src/components/messages/ConversationList.tsx`
- Layout components

**Recommended Action:**
1. Implement collapsible dropdown for secondary nav items (Help, Admin, Settings)
2. Fix center alignment for main workspace container
3. Add responsive padding to chat history (min 16px/1rem)

---

### 2. Search Issues → **PM-Discovery** 🔍

| Issue ID | Description | Priority | Impact |
|----------|-------------|----------|--------|
| **DIS-014** | Global Search broken - searching "922" shows no results | P0 | **CRITICAL** - Core functionality failure |
| **DIS-015** | Need to test all search types: documents, contacts, properties, deals, agents | P0 | Unknown scope of search failures |
| **DIS-016** | Search doesn't match input in message bar | P0 | User confusion, broken expectations |

**Owner:** PM-Discovery
**Files Affected:**
- `src/components/search/GlobalSearch.tsx`
- `src/components/search/SearchResultsDropdown.tsx`
- `src/pages/SearchResults.tsx`
- `supabase/functions/search-*` (if backend issue)

**Recommended Action:**
1. **URGENT:** Debug why numeric searches (e.g., "922") return no results
2. Run comprehensive test suite across all entity types
3. Verify search input consistency between UI and query execution
4. Check if recent DIS-010 (query expansion) broke basic matching

**Hypothesis:** Recent query expansion feature (DIS-010) may have broken exact/partial matching for numeric queries.

---

### 3. AI Chat Issues → **PM-Intelligence** 🧠

| Issue ID | Description | Priority | Impact |
|----------|-------------|----------|--------|
| **INT-014** | "+" button on chat page doesn't work | P0 | Can't create new conversations |
| **INT-015** | "Lightbulb" thinking indicator doesn't work | P0 | No visual feedback during AI processing |
| **INT-016** | Multiple buttons on AI chat page don't work | P0 | Broken core interactions |

**Owner:** PM-Intelligence
**Files Affected:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/*`
- `src/hooks/useAIChat.ts`

**Recommended Action:**
1. Audit all interactive elements on Chat.tsx
2. Check event handlers for "+" button (new conversation trigger)
3. Verify thinking indicator integration with streaming state
4. Identify which other buttons are non-functional
5. Run E2E test: `tests/e2e/ai-chat.spec.ts`

**Note:** User mentions "some are enhancements to add to roadmap" - identify which buttons are intended vs. broken.

---

### 4. Integrations Issues → **PM-Integration** 🔌

| Issue ID | Description | Priority | Impact |
|----------|-------------|----------|--------|
| **INT-015** | Integrations page should be in Settings, not main navigation | P0 | Information architecture issue |
| **INT-016** | Integrations page doesn't work at all + duplicate "data sources" in admin | P1 | Broken feature |
| **INT-017** | Need MCP-style connector experience (Claude settings model) | P1 | Product vision alignment |
| **INT-018** | Plan AI chat integration with calendar/email/notes (agent-accessible data) | P2 | Strategic feature |

**Owner:** PM-Integration
**Files Affected:**
- `src/pages/Integrations.tsx` (needs to move)
- `src/pages/Settings.tsx` (target location)
- `src/components/layout/GleanSidebar.tsx` (remove from nav)
- Admin console data sources page (needs removal/merge)

**Product Vision (from user):**
> "Think of the Claude experience. You go to Settings, enable connectors that your AI can search with via MCP. This is the experience I eventually want with AI chat. A real estate agent can connect their calendar, emails, notes, etc. and chat with them."

**Recommended Action:**
1. Move Integrations to Settings tab
2. Remove from main navigation
3. Audit and fix broken integration UI
4. Remove duplicate "data sources" page from admin
5. Design MCP-style connector toggle experience
6. Create implementation plan for AI chat + connected data sources

---

## Delegation Summary

| PM | Issues Assigned | Priority Level | Estimated Effort |
|----|----------------|----------------|------------------|
| **PM-Experience** | 3 issues (EXP-011 to EXP-013) | P0 | Small (2-3 hours) |
| **PM-Discovery** | 3 issues (DIS-014 to DIS-016) | P0 **CRITICAL** | Medium (4-6 hours) |
| **PM-Intelligence** | 3 issues (INT-014 to INT-016) | P0 | Medium (4-6 hours) |
| **PM-Integration** | 4 issues (INT-015 to INT-018) | P0-P2 | Large (8-12 hours) |

---

## Next Steps

1. ✅ **PM-Orchestrator:** Review and approve delegation (COMPLETE)
2. ⏳ **Sub-PMs:** Update BACKLOG.md files with new tasks (IN PROGRESS)
3. ⏳ **Product Lead:** Review updated backlogs
4. ⏳ **Run PM Dev Cycle:** Execute high-priority fixes

---

## Testing Requirements

Before marking any issue as complete:

- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run test`
- [ ] Manual browser testing of affected feature
- [ ] Run relevant E2E tests (`tests/e2e/`)
- [ ] Test on mobile viewport (PM-Experience issues)

---

## Success Criteria

**UI/UX (PM-Experience):**
- Navigation is clean and uncluttered
- Workspace is visually centered
- Chat history has proper spacing (16px+ padding)

**Search (PM-Discovery):**
- Searching "922" returns expected results
- All entity types (documents, contacts, properties, deals, agents) return results
- Search input matches query execution

**AI Chat (PM-Intelligence):**
- "+" button creates new conversation
- Thinking indicator appears during AI processing
- All buttons function as expected

**Integrations (PM-Integration):**
- Integrations moved to Settings
- No duplicate pages
- Integration UI functional
- Vision for MCP-style connectors documented

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Search fix requires backend changes | Medium | High | PM-Discovery to investigate backend vs. frontend issue early |
| Multiple AI chat buttons broken indicates larger issue | High | High | PM-Intelligence to do full component audit before fixing |
| Integration refactor breaks existing connections | Low | Medium | PM-Integration to test OAuth flows after moving pages |

---

**Report Status:** Delegated to PM team
**Next Review:** After PM Dev Cycle completion
**Follow-up:** Product Lead to verify fixes in UAT
