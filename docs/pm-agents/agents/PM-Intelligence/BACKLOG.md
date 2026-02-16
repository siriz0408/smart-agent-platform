# PM-Intelligence Backlog

> **Last Updated:** 2026-02-15 (Cycle 12 - INT-018 Complete)

---

## In Progress

_No tasks currently in progress_

---

## Ready

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| INT-017 | Add visual feedback to chat buttons | P2 | UX enhancement - Add toasts, loading states, confirmations |
| INT-023 | Add E2E tests for chat buttons | P1 | Test coverage - Verify all 18 interactive elements |
| INT-019 | Add tooltips to chat buttons | P2 | UX enhancement - Explain button purposes |
| INT-020 | Implement "Stop generating" button | P1 | Completed in Cycle 11 |
| INT-024 | Add connector action execution | P2 | Allow AI to execute connector actions (calendar create, email send) |

---

## Task Details

### INT-017: Add visual feedback to chat buttons
**Priority:** P2 | **Effort:** S | **Source:** BUTTON_AUDIT_REPORT.md 2026-02-07

**Problem:** Buttons work but provide no visual confirmation of actions.

**Enhancement Opportunities:**
1. Plus button: Show toast "New conversation started"
2. Thinking mode: Add tooltip "Use extended reasoning for complex queries"
3. Send button: Add loading spinner while streaming
4. Delete: Add confirmation dialog
5. Sidebar toggle: Add smooth animation (already has transition)
6. Agent cards: Add hover lift effect (already has shadow)
7. Retry button: Show "Retrying..." text

**Files to Modify:**
- `src/pages/Chat.tsx`
- `src/components/ui/use-toast.ts`

**Acceptance Criteria:**
- [ ] Toast shown for new conversation
- [ ] Tooltips added to all buttons
- [ ] Loading states visible during actions
- [ ] Confirmation dialog for destructive actions
- [ ] Smooth animations for state changes

---

### INT-018: Add E2E tests for chat buttons
**Priority:** P1 | **Effort:** M | **Source:** BUTTON_AUDIT_REPORT.md 2026-02-07

**Problem:** No automated tests verify button functionality.

**Test Coverage Needed:**
- Plus button creates new conversation
- Thinking mode toggle works
- Send message button submits form
- Sidebar toggle works
- Delete conversation works
- Agent cards work
- Retry button works after error
- Settings button navigates

**Files to Create:**
- `tests/e2e/ai-chat-buttons.spec.ts`

**Acceptance Criteria:**
- [ ] 8+ test cases created
- [ ] All 18 interactive elements covered
- [ ] Tests pass on CI/CD
- [ ] Mobile and desktop viewports tested

---

### INT-019: Add tooltips to chat buttons
**Priority:** P2 | **Effort:** S | **Source:** BUTTON_AUDIT_REPORT.md 2026-02-07

**Problem:** Users don't understand what some buttons do.

**Tooltips Needed:**
- Plus button: "Start a new conversation"
- Thinking mode: "Enable extended reasoning for complex queries"
- AI Settings: "Adjust AI behavior and preferences"
- Sidebar toggle: "Show/hide conversation history"
- Agent cards: "Click to use this assistant"

**Files to Modify:**
- `src/pages/Chat.tsx`
- `src/components/ui/tooltip.tsx`

**Acceptance Criteria:**
- [ ] All buttons have descriptive tooltips
- [ ] Tooltips appear on hover
- [ ] Mobile tap-and-hold shows tooltips
- [ ] Accessible via keyboard navigation

---

### INT-020: Implement "Stop generating" button
**Priority:** P1 | **Effort:** S | **Source:** BUTTON_AUDIT_REPORT.md 2026-02-07

**Problem:** Users can't cancel in-progress AI streams.

**Implementation:**
- Show "Stop" button while `isStreaming === true`
- Replace send button with stop button
- Call `abort()` from `useAIStreaming` hook
- Show toast "Generation stopped"

**Files to Modify:**
- `src/pages/Chat.tsx`
- `src/hooks/useAIStreaming.ts` (abort already exists)

**Acceptance Criteria:**
- [ ] Stop button appears while streaming
- [ ] Clicking stop cancels the stream
- [ ] Partial response is kept in chat
- [ ] User can send new message immediately
- [ ] No console errors

---

### INT-021: Implement copy/regenerate response buttons
**Priority:** P2 | **Effort:** M | **Source:** BUTTON_AUDIT_REPORT.md 2026-02-07

**Problem:** Missing common AI chat UX patterns.

**Features:**
1. **Copy response:** Copy AI message to clipboard
2. **Regenerate response:** Re-generate last AI response

**Implementation:**
- Add button bar to AI message cards
- Use `navigator.clipboard.writeText()` for copy
- Show toast "Copied to clipboard"
- For regenerate: remove last assistant message, re-submit last user message

**Files to Modify:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/` (new component: MessageActions.tsx)

**Acceptance Criteria:**
- [ ] Copy button appears on AI messages
- [ ] Copy works on all browsers
- [ ] Regenerate button appears on last AI message
- [ ] Regenerate re-sends last user message
- [ ] Visual feedback for both actions

---

## Task Details (Legacy - Resolved as False Positives)

### INT-014: Fix "+" button on chat page
**Priority:** P0 | **Effort:** S | **Source:** Issue Tracker 2026-02-07

**Problem:** The "+" button on the chat page doesn't work. Users can't create new conversations.

**Files to Investigate:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/*`
- `src/hooks/useAIChat.ts`

**Debug Steps:**
1. Locate "+" button in Chat.tsx or ai-chat components
2. Check if onClick handler is attached
3. Verify handler function exists and is callable
4. Check for console errors when clicking
5. Test new conversation creation flow

**Acceptance Criteria:**
- [ ] "+" button creates new conversation
- [ ] New conversation appears in conversation list
- [ ] User can start chatting in new conversation
- [ ] No console errors
- [ ] E2E test passes: `tests/e2e/ai-chat.spec.ts`

---

### INT-015: Fix "lightbulb" thinking indicator
**Priority:** P0 | **Effort:** S | **Source:** Issue Tracker 2026-02-07

**Problem:** The "lightbulb" thinking indicator doesn't work. Users have no visual feedback during AI processing.

**Files to Investigate:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/*`
- `src/hooks/useAIStreaming.ts`
- `src/hooks/useTypingIndicator.ts`

**Debug Steps:**
1. Locate thinking indicator component
2. Check if it's connected to streaming state
3. Verify `isStreaming` or `isLoading` state is being read
4. Check CSS visibility (display: none? opacity: 0?)
5. Test with actual AI request

**Possible Issues:**
- Indicator component not connected to streaming state
- CSS hiding the indicator
- Streaming state not updating correctly
- Indicator removed during recent refactor

**Acceptance Criteria:**
- [ ] Thinking indicator appears when AI is processing
- [ ] Indicator disappears when response starts streaming
- [ ] Visual feedback is clear and noticeable
- [ ] Tests pass

---

### INT-016: Audit and fix all non-working buttons on AI chat page
**Priority:** P0 | **Effort:** M | **Source:** Issue Tracker 2026-02-07

**Problem:** User reports "None of the buttons on the AI chat page work, some are enhancements to add to roadmap."

**Objective:**
1. Identify ALL buttons on AI chat page
2. Test each button's functionality
3. Fix broken buttons
4. Identify which buttons are unimplemented features (add to roadmap)

**Files to Audit:**
- `src/pages/Chat.tsx`
- `src/components/ai-chat/*`

**Audit Checklist:**
- [ ] "+" button (new conversation) → INT-014
- [ ] Thinking indicator → INT-015
- [ ] Send message button
- [ ] Stop generating button
- [ ] Copy response button
- [ ] Regenerate response button
- [ ] Thumbs up/down (feedback)
- [ ] Share conversation button
- [ ] Delete conversation button
- [ ] Settings/options menu
- [ ] Document selector (for RAG)
- [ ] Model selector
- [ ] Other interactive elements

**Task:**
1. Create comprehensive button inventory
2. Test each button manually
3. Categorize: Working | Broken | Unimplemented
4. Fix broken buttons
5. Create roadmap items for unimplemented features
6. Run E2E tests

**Acceptance Criteria:**
- [ ] All buttons identified and categorized
- [ ] Broken buttons fixed
- [ ] Unimplemented features logged as roadmap items
- [ ] E2E tests pass: `tests/e2e/ai-chat.spec.ts`
- [ ] Report created with findings

---

## Backlog

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| INT-009 | Multi-model fallback | P3 | Reliability - Implement GPT-4 fallback per INT-005 |
| INT-010 | Query expansion improvements | P3 | RAG enhancement |
| INT-012 | Implement GPT-4 Turbo fallback | P1 | Based on INT-005 recommendations |
| INT-013 | Route structured extraction to GPT-4 | P2 | JSON mode for critical extractions |

---

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| INT-000 | PM-Intelligence setup | 2026-02-05 | Initial |
| INT-001 | Initial domain discovery audit | 2026-02-06 | DOMAIN_AUDIT.md created with full system mapping |
| INT-002 | Audit RAG retrieval quality | 2026-02-06 | RAG_AUDIT.md created with full analysis |
| INT-003 | Document current prompt templates | 2026-02-06 | PROMPTS.md created |
| INT-004 | Set up AI quality monitoring | 2026-02-06 | ai_chat_metrics table created, tracking integrated into Chat.tsx, dashboard ready |
| INT-005 | Research Anthropic vs OpenAI | 2026-02-06 | ANTHROPIC_VS_OPENAI.md created with comprehensive comparison, 3 recommendations submitted |
| INT-006 | Improve citation formatting in responses | 2026-02-06 | Standardized to [Source: filename, page X], RAG_IMPROVEMENT_PROPOSAL.md created |
| INT-011 | Create AgentDetail.tsx page | 2026-02-06 | Created missing AgentDetail.tsx page with full agent details view, added route, linked from Agents.tsx |
| HO-009 | Fix tenant isolation in action executors | 2026-02-07 | Critical security fix: hardened add_note contact/deal/property validation, hardened assign_tags with UUID validation + tenant warning logs, added callerTenantId defense-in-depth to execute-actions, forwarded tenant_id to MCP gateway, added tenant_id filter to action approval, added validateTenantAccess/validateUserInTenant helpers, added executeAction UUID gate |
| INT-007 | Add confidence indicators to AI responses | 2026-02-07 | Frontend confidence scoring: `confidenceScoring.ts` utility (extracts citations, computes High/Medium/Low), `ConfidenceIndicator.tsx` component (color-coded badge + tooltip), integrated into Chat.tsx streaming pipeline |
| **INT-014** | **Investigate "+" button on chat page** | **2026-02-07** | **FALSE POSITIVE: Button works correctly. See BUTTON_AUDIT_REPORT.md** |
| **INT-015** | **Investigate "lightbulb" thinking indicator** | **2026-02-07** | **FALSE POSITIVE: Thinking mode toggle works correctly. See BUTTON_AUDIT_REPORT.md** |
| **INT-021** | **Implement copy/regenerate response buttons** | **2026-02-14** | **COMPLETED: Created MessageActions.tsx component with Copy (clipboard) and Regenerate (re-generate last response) buttons. Integrated into Chat.tsx assistant message cards. Copy shows success toast, Regenerate removes last assistant message and re-submits user prompt.** |
| **INT-016** | **Audit all buttons on AI chat page** | **2026-02-07** | **COMPLETED: All 18 interactive elements verified functional. Created BUTTON_AUDIT_REPORT.md with comprehensive audit. Identified 5 enhancement opportunities (INT-017 to INT-021)** |
| **INT-018** | **AI chat connector integration** | **2026-02-15** | **COMPLETED: Integrated connector data into AI chat. Backend calls `get_ai_enabled_connectors()` to fetch enabled connectors. Added `buildConnectorContext()` to add connector info to system prompt. Created `ActiveConnectorsBadge.tsx` component to show which data sources are being used. Added `active_connectors` to EmbeddedComponents type.** |

---

## Research Items

| Topic | Status | Findings |
|-------|--------|----------|
| Anthropic vs OpenAI comparison | ✅ Complete | ANTHROPIC_VS_OPENAI.md - Claude optimal primary, GPT-4 valuable fallback |
| Claude 4 capabilities | In Progress | Documented in ANTHROPIC_VS_OPENAI.md |
| Competitor AI features | Pending | - |
| RAG best practices 2026 | Pending | - |
