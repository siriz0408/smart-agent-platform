# Issue Tracker

> **Owned by:** PM-Orchestrator  
> **Last Updated:** 2026-02-07  
> **Source:** User feedback from production testing

This document tracks critical issues found during production testing. Issues are assigned to PMs based on feature ownership and domain expertise.

---

## Active Issues

### [ISSUE-001] Sidebar Navigation Revamp
- **Priority:** High
- **Assigned to:** PM-Experience
- **Created:** 2026-02-07
- **Status:** PENDING

**Issue:**
Sidebar (purple navigation menu on home page) needs revamp. Need to hide some page tools under a dropdown menu. Help, Admin, Settings should be moved to a dropdown menu instead of being top-level navigation items.

**Current State:**
- Help, Admin, Settings are currently top-level navigation items
- Sidebar is cluttered with too many items

**Expected Behavior:**
- Help, Admin, Settings moved to a "More" dropdown menu
- Cleaner sidebar with only primary navigation items visible
- Dropdown menu accessible via "More" or "..." icon

**Files Affected:**
- `src/components/layout/GleanSidebar.tsx`
- `src/components/layout/MobileBottomNav.tsx` (mobile navigation)

**Acceptance Criteria:**
- [ ] Help, Admin, Settings moved to dropdown menu
- [ ] Sidebar shows only primary navigation items
- [ ] Dropdown menu works on desktop and mobile
- [ ] Navigation remains accessible and intuitive

---

### [ISSUE-002] Workspace Not Centered
- **Priority:** Medium
- **Assigned to:** PM-Experience
- **Created:** 2026-02-07
- **Status:** PENDING

**Issue:**
The workspace content is not centered on the page. This creates a poor visual experience.

**Expected Behavior:**
- Workspace content should be centered horizontally
- Consistent padding/margins on both sides
- Responsive centering on all screen sizes

**Files Affected:**
- `src/components/layout/AppLayout.tsx`
- `src/pages/Home.tsx` (dashboard)
- Layout wrapper components

**Acceptance Criteria:**
- [ ] Workspace content centered horizontally
- [ ] Consistent spacing on all pages
- [ ] Works on mobile and desktop

---

### [ISSUE-003] Chat History Layout Padding
- **Priority:** Medium
- **Assigned to:** PM-Experience
- **Created:** 2026-02-07
- **Status:** PENDING

**Issue:**
Chat history layout needs padding/spacing from the edge of the column. Current spacing is too tight, creating a poor UI/UX experience.

**Expected Behavior:**
- Chat history should have adequate padding from column edges
- Consistent spacing between messages
- Better visual breathing room

**Files Affected:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/*` (chat message components)
- Chat sidebar/conversation list

**Acceptance Criteria:**
- [ ] Chat history has proper padding (minimum 16px from edges)
- [ ] Message spacing is consistent and comfortable
- [ ] Works on mobile and desktop

---

### [ISSUE-004] Global Search Not Working
- **Priority:** Critical
- **Assigned to:** PM-Discovery
- **Created:** 2026-02-07
- **Status:** PENDING

**Issue:**
Global Search doesn't work properly. Searching for something like "922" shows "no results found" even when results should exist. Search doesn't match what user inputs in the search bar.

**Current State:**
- Search input doesn't match results
- Search fails for numeric queries (e.g., "922")
- Search may not be working across all entity types

**Expected Behavior:**
- Search should match user input accurately
- Search should work for all entity types: Documents, Contacts, Properties, Deals, Agents
- Numeric queries should work (e.g., property addresses, contact IDs)
- Search should be tested across all search types

**Files Affected:**
- `src/components/search/GlobalSearch.tsx`
- `supabase/functions/universal-search/index.ts`
- Search result components

**Testing Required:**
- [ ] Test search for Documents
- [ ] Test search for Contacts
- [ ] Test search for Properties
- [ ] Test search for Deals
- [ ] Test search for Agents
- [ ] Test numeric queries (addresses, IDs)
- [ ] Test partial matches
- [ ] Test special characters

**Acceptance Criteria:**
- [ ] Search returns accurate results for all entity types
- [ ] Numeric queries work correctly
- [ ] Search matches user input
- [ ] All search types tested and working

---

### [ISSUE-005] AI Chat Page Buttons Not Working
- **Priority:** High
- **Assigned to:** PM-Intelligence (primary), PM-Experience (UI)
- **Created:** 2026-02-07
- **Status:** PENDING

**Issue:**
Multiple buttons on the AI Chat page don't work:
- The "+" button (new conversation) doesn't work
- The lightbulb indicator for "thinking" mode doesn't work
- Other buttons may not be working (needs investigation)

**Current State:**
- "+" button for new conversation is non-functional
- Lightbulb/thinking mode toggle doesn't work
- Some buttons may be placeholders for future features

**Expected Behavior:**
- "+" button should create a new conversation
- Lightbulb should toggle thinking mode on/off
- All functional buttons should work as expected
- Placeholder buttons should be disabled or removed if not ready

**Files Affected:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/*` (chat UI components)
- Chat action buttons

**Acceptance Criteria:**
- [ ] "+" button creates new conversation
- [ ] Lightbulb toggles thinking mode
- [ ] All functional buttons work correctly
- [ ] Placeholder buttons are disabled or removed
- [ ] Non-functional features added to roadmap if needed

---

### [ISSUE-006] Integrations Tab Location & Functionality
- **Priority:** High
- **Assigned to:** PM-Integration (primary), PM-Experience (Settings UI)
- **Created:** 2026-02-07
- **Status:** PENDING

**Issue:**
1. Integrations tab should be in Settings, not on main navigation panel
2. Integrations page doesn't work at all
3. There's a separate "Data Sources" page in admin console - this is confusing
4. Integrations should work like Claude's MCP experience: user goes to Settings, enables connectors that AI can search with

**Current State:**
- Integrations is a top-level navigation item
- Integrations page is non-functional
- Data Sources exists separately in admin console
- No clear integration flow

**Expected Behavior:**
- Integrations moved to Settings page
- Integrations page functional (connect/disconnect connectors)
- Clear distinction between "Integrations" (user connectors) and "Data Sources" (admin data)
- Integration flow similar to Claude MCP: Settings → Enable connectors → AI can use them in chat
- Real estate agents can connect calendar, emails, notes, etc. and chat with them

**Vision:**
- User goes to Settings → Integrations
- User connects Gmail, Google Calendar, etc.
- AI chat can then search/use these connected services
- Similar to Claude's MCP connector experience

**Files Affected:**
- `src/pages/Integrations.tsx` (move to Settings)
- `src/pages/Settings.tsx` (add Integrations section)
- `src/components/layout/GleanSidebar.tsx` (remove Integrations from nav)
- Integration connection UI components

**Acceptance Criteria:**
- [ ] Integrations moved to Settings page
- [ ] Integrations page is functional
- [ ] Users can connect/disconnect connectors
- [ ] Clear distinction from Data Sources (admin)
- [ ] Integration flow works end-to-end
- [ ] AI chat can use connected integrations
- [ ] Roadmap updated with MCP-style integration vision

---

## Issue Summary

| Issue | Priority | Assigned PM | Status |
|-------|----------|-------------|--------|
| ISSUE-001 | High | PM-Experience | PENDING |
| ISSUE-002 | Medium | PM-Experience | PENDING |
| ISSUE-003 | Medium | PM-Experience | PENDING |
| ISSUE-004 | Critical | PM-Discovery | PENDING |
| ISSUE-005 | High | PM-Intelligence + PM-Experience | PENDING |
| ISSUE-006 | High | PM-Integration + PM-Experience | PENDING |

**Total Issues:** 6  
**Critical:** 1  
**High:** 3  
**Medium:** 2

---

## PM Workload

| PM | Issues Assigned | Priority Breakdown |
|----|----------------|-------------------|
| PM-Experience | 4 issues (001, 002, 003, 005, 006) | 2 High, 2 Medium |
| PM-Discovery | 1 issue (004) | 1 Critical |
| PM-Intelligence | 1 issue (005) | 1 High |
| PM-Integration | 1 issue (006) | 1 High |

---

## Next Steps

1. **PM-Orchestrator:** Review and approve issue assignments
2. **Assigned PMs:** Add issues to respective backlogs
3. **PM-Discovery:** Investigate search functionality (ISSUE-004) - Critical
4. **PM-Experience:** Start with ISSUE-001 (Sidebar revamp) - High priority
5. **PM-Integration:** Plan Integrations refactor (ISSUE-006) - High priority

---

## Related Documentation

- **OWNERSHIP.md**: Feature ownership map
- **HANDOFFS.md**: Cross-PM coordination
- **BACKLOG.md**: Individual PM backlogs

---

*Issues are tracked here until resolved. Once resolved, move to "Resolved Issues" section below.*

## Resolved Issues

*None yet.*
