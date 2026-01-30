# Smart Agent - Development Task Board

> **Last Updated:** January 28, 2026
> **Phase 1 MVP Completion:** ~95%
> **Total Remaining Tasks:** 8 (5 medium + 3 low priority)

---

## Current Status Summary

| Metric | Value |
|--------|-------|
| Phase 1 MVP Progress | ~95% complete |
| Deployment Blockers | 0 critical |
| High Priority Tasks | 0 |
| Medium Priority Tasks | 5 |
| Low Priority Tasks | 3 (Tasks #16, #17, #18 complete) |
| Technical Debt Items | 2 |

### Quick Links
- [High Priority (Blockers)](#-high-priority-blocks-deployment)
- [Medium Priority (Core)](#-medium-priority-core-features)
- [Low Priority (Polish)](#-low-priority-polish)
- [Technical Debt](#technical-debt-identified)
- [Phase 2 Preview](#phase-2-preview-post-mvp)

---

## Phase 1 MVP - Remaining Work

### 🔴 High Priority (Blocks Deployment)

These tasks must be completed before MVP can launch.

#### ~~1. Implement Contact Detail View/Edit~~ ✅ COMPLETE
- **Complexity:** Medium
- **PRD Reference:** Section 5.2.2 (Contacts & Relationships)
- **Completed:** Already implemented (found during audit)
- **Files:**
  - `/src/components/contacts/ContactDetailSheet.tsx` - View/edit tabs, all fields
  - `/src/components/contacts/AddToPipelineDialog.tsx` - Create deals from contacts
  - `/src/pages/Contacts.tsx` - All handlers wired up
- **Subtasks:**
  - [x] Create `ContactDetailSheet` component with view/edit tabs
  - [x] Display all contact fields (name, email, phone, company, tags, notes)
  - [x] Add edit form with validation
  - [x] Wire delete confirmation dialog
  - [x] Add "Add to pipeline" functionality
  - [x] Connect dropdown menu items to sheet/dialogs

---

#### ~~2. Implement Property Detail View/Edit~~ ✅ COMPLETE
- **Complexity:** Medium
- **PRD Reference:** Section 5.2.4 (Properties)
- **Completed:** January 28, 2026
- **Files Created/Modified:**
  - Created: `/src/components/properties/PropertyDetailSheet.tsx` - View/edit tabs, photo gallery
  - Modified: `/src/pages/Properties.tsx` - Added click handlers and sheet
- **Subtasks:**
  - [x] Create `PropertyDetailSheet` component
  - [x] Display all property fields (address, beds/baths/sqft, price, status, photos)
  - [x] Add photo gallery view with navigation
  - [x] Wire edit functionality with form validation
  - [x] Add delete with confirmation
  - [x] Connect property cards to detail sheet on click

---

#### ~~3. Wire Settings Page Controls~~ ✅ COMPLETE
- **Complexity:** Low
- **PRD Reference:** Section 5.2.1 (Profiles)
- **Completed:** January 28, 2026
- **Files Created/Modified:**
  - Created: `/src/hooks/useUserPreferences.ts` - localStorage-based preferences with dark mode support
  - Created: `/src/components/settings/EditProfileDialog.tsx` - Profile editing with avatar upload
  - Modified: `/src/pages/Settings.tsx` - Wired all switches and Edit Profile button
- **Subtasks:**
  - [x] Add state management for notification switches
  - [x] Persist preferences to localStorage (avoided DB migration)
  - [x] Implement "Edit Profile" dialog with name/avatar upload
  - [x] Wire dark mode toggle to Tailwind dark class
  - [ ] Add keyboard shortcuts modal (deferred - not blocking)

---

#### ~~4. Complete Agent Execution Engine~~ ✅ COMPLETE
- **Complexity:** High
- **PRD Reference:** Section 6.3 (Pre-Built AI Agents)
- **Completed:** Already implemented (found during audit)
- **Files:**
  - `/supabase/functions/execute-agent/index.ts` - Full execution with streaming
  - `/src/hooks/useAgentExecution.ts` - Frontend streaming handler
  - `/src/components/agents/AgentExecutionSheet.tsx` - Complete UI with input/output
- **Subtasks:**
  - [x] Implement agent workflow parser (context gathering by entity type)
  - [x] Add system prompt injection from `ai_agents` table
  - [x] Connect to Lovable AI Gateway (google/gemini-3-flash-preview)
  - [x] Store results in `agent_runs` table
  - [x] Return structured output to frontend via SSE streaming
  - [x] Streaming support with real-time display
  - [x] Usage limit enforcement and error handling

---

#### ~~5. Add Deal Notes/Activities~~ ✅ COMPLETE
- **Complexity:** Medium
- **PRD Reference:** Section 4.4 (Automation Triggers), Section 5.2.3 (deal_activities)
- **Completed:** January 28, 2026
- **Implementation Notes:** Used existing `deals.notes` field with timestamped format (no DB migration needed)
- **Files Created/Modified:**
  - Created: `/src/components/deals/AddNoteDialog.tsx` - Add note with auto-timestamp
  - Modified: `/src/components/deals/DealDetailSheet.tsx` - Enhanced notes section with Add Note button
- **Subtasks:**
  - [x] Display chronological notes with timestamps
  - [x] Add "Add Note" functionality with dialog
  - [x] Notes prepend with timestamp for activity-like tracking
  - [ ] Auto-log stage transitions (deferred - requires DB trigger or activities table)
  - [x] Milestones serve as primary activity tracking

---

### 🟡 Medium Priority (Core Features)

Important for a complete MVP experience but not blocking deployment.

#### 6. Implement Document Projects/Folders
- **Complexity:** Medium
- **PRD Reference:** Section 2.2.3 (Document Intelligence)
- **Current State:** Documents are flat list only; no organization capability
- **Files to Create:**
  - `/src/components/documents/ProjectSidebar.tsx`
  - `/src/components/documents/CreateProjectDialog.tsx`
- **Database:** `document_projects` and `document_project_members` tables exist in schema

---

#### 7. Add Document Sharing
- **Complexity:** Medium
- **PRD Reference:** Section 2.2.3 (document_shares table)
- **Current State:** No document sharing UI or backend logic
- **Files to Create:**
  - `/src/components/documents/ShareDocumentDialog.tsx`
- **Database:** `document_shares` table exists in schema

---

#### 8. Implement Trial Period Logic
- **Complexity:** Low
- **PRD Reference:** Section 3.4 (Trial & Upgrade Flow)
- **Current State:** Stripe integration works but trial flow not implemented
- **Subtasks:**
  - [ ] Add trial_end field handling in subscription creation
  - [ ] Show trial countdown banner in UI
  - [ ] Handle trial expiration webhook

---

#### 9. Add OAuth Authentication (Google/Apple)
- **Complexity:** Medium
- **PRD Reference:** Section 9.4 (Authentication & Authorization)
- **Current State:** Only email/password authentication
- **Files to Modify:**
  - `/src/pages/Login.tsx`
  - `/src/pages/Signup.tsx`
  - Supabase dashboard: Enable OAuth providers

---

#### 10. Implement Real Drag-Drop in Pipeline (DEFERRED)
- **Complexity:** Low
- **PRD Reference:** Section 4 (Deal Orchestration)
- **Current State:** Stage movement works via dropdown menu (functional alternative)
- **Status:** Deferred - current dropdown UX is acceptable for MVP
- **Note:** True drag-drop requires `@dnd-kit/core` installation and significant refactor
- **Files (if implementing later):**
  - `/src/pages/Pipeline.tsx`
  - `/src/components/pipeline/StageColumn.tsx`
  - `/src/components/pipeline/DealCard.tsx`

---

### 🟢 Low Priority (Polish)

Nice-to-have improvements for MVP quality.

#### 11. Add Invoice History to Billing
- **Complexity:** Low
- **PRD Reference:** Section 3.5.4 (UI Components Required)
- **Current State:** Billing page shows current plan but no invoice history
- **Files to Modify:**
  - `/src/pages/Billing.tsx`
- **Subtasks:**
  - [ ] Fetch invoices from Stripe via edge function
  - [ ] Display invoice list with download links

---

#### 12. Implement Usage Analytics Dashboard
- **Complexity:** Medium
- **PRD Reference:** Section 3.5.4
- **Current State:** Basic usage display exists; no trends or detailed analytics
- **Files to Create:**
  - `/src/components/billing/UsageChart.tsx`

---

#### 13. Add Email Notification System
- **Complexity:** High
- **PRD Reference:** Section 7.3.2 (Delivery Options)
- **Current State:** No email notifications implemented
- **Subtasks:**
  - [ ] Set up email provider (Resend, SendGrid, etc.)
  - [ ] Create email templates
  - [ ] Add edge function for sending emails
  - [ ] Wire to milestone reminders and deal updates

---

#### ~~14. Profile Edit Dialog~~ ✅ COMPLETE
- **Complexity:** Low
- **PRD Reference:** Section 5.2.1
- **Completed:** January 28, 2026 (as part of Task #3)
- **Files Created:**
  - `/src/components/settings/EditProfileDialog.tsx` - Full name, phone, title, avatar upload

---

#### ~~15. Delete Contact/Property Confirmation~~ ✅ COMPLETE
- **Complexity:** Low
- **PRD Reference:** N/A (UX polish)
- **Completed:** January 28, 2026 (as part of Tasks #1 and #2)
- **Implementation:**
  - `ContactDetailSheet.tsx` has delete confirmation AlertDialog
  - `PropertyDetailSheet.tsx` has delete confirmation AlertDialog
  - `Contacts.tsx` also has a separate delete confirmation dialog

---

#### ~~16. Add AI Chat Disclaimers~~ ✅ COMPLETE
- **Complexity:** Low
- **PRD Reference:** Section 6.4 (AI Safety & Disclaimers)
- **Completed:** January 28, 2026
- **Files Modified:**
  - `/src/pages/Chat.tsx` - Added disclaimer below input
  - `/src/pages/DocumentChat.tsx` - Added disclaimer below input
- **Subtasks:**
  - [x] Add legal/financial disclaimer text to Chat.tsx
  - [x] Add legal/financial disclaimer text to DocumentChat.tsx
  - [x] Ensure disclaimers are non-intrusive but visible

---

#### ~~17. Integrate Source Citations in Chat~~ ✅ COMPLETE
- **Complexity:** Low
- **PRD Reference:** Section 6.4 (Source Attribution)
- **Completed:** January 28, 2026
- **Files Modified:**
  - `/src/pages/DocumentChat.tsx` - Integrated SourceCitation component
- **Subtasks:**
  - [x] Parse AI responses for source citations using parseSourceCitations()
  - [x] Display SourceCitation component below assistant messages
  - [x] Link citations to document viewer (opens ChunkBrowser)

---

#### ~~18. Add Data Export Feature~~ ✅ COMPLETE
- **Complexity:** Medium
- **PRD Reference:** Section 9.2 (Data Ownership & Portability) - Key differentiator
- **Completed:** January 28, 2026
- **Files Created:**
  - `/src/components/settings/DataExportDialog.tsx` - Full export dialog with format selection
- **Files Modified:**
  - `/src/pages/Settings.tsx` - Added Data Export section with button
- **Subtasks:**
  - [x] Create DataExportDialog component
  - [x] Implement CSV export for Contacts
  - [x] Implement CSV export for Properties
  - [x] Implement CSV export for Deals (with related contact/property info)
  - [x] Implement JSON export option
  - [x] Add export button to Settings page

---

## Technical Debt Identified

Issues discovered during audit that should be addressed:

| Issue | Location | Impact | Suggested Fix |
|-------|----------|--------|---------------|
| **Embeddings as JSON strings** | `document_chunks` table | Suboptimal search performance | Migrate to native pgvector type |
| **Duplicate streaming logic** | `Chat.tsx`, `DocumentChat.tsx` | Maintenance burden | Extract to shared hook |

> ✅ **Resolved:** Settings switches no handlers - Fixed in Task #3
> ✅ **Resolved:** Contact dropdown no handlers - Fixed in Task #1 (already implemented)
> ✅ **Resolved:** Unimplemented dropdown items - Fixed in Task #1 (ContactDetailSheet exists)

---

## Phase 2 Preview (Post-MVP)

Features planned for Phase 2 per PRD Section 10.2:

| Feature | PRD Section | Complexity |
|---------|-------------|------------|
| Real-time messaging (agent-client chat) | 7.2 | High |
| Property alerts and saved searches | 7.3 | Medium |
| NLP property search | 2.3 | High |
| Trial period management | 3.4 | Low |
| Agent marketplace foundation | 3.6 | High |
| Cross-document semantic search | 2.2.3 | Medium |

---

## Phase 3 Preview (AI Enhancement)

| Feature | PRD Section | Notes |
|---------|-------------|-------|
| Pre-built AI agents (full implementation) | 6.3 | Listing Writer, CMA, Contract Reviewer |
| Multi-model support with fallback | 6.1 | OpenAI → Claude fallback |
| Document analysis with recommendations | 6.2.3 | Risk identification, entity extraction |
| Add-on billing integration | 3.2 | AI Query Packs, Agent subscriptions |

---

## How to Use This Board

### Starting a Task
1. Check that no blockers exist (tasks marked as blocked)
2. Update task status to "In Progress"
3. Create a feature branch: `feat/task-name`

### Completing a Task
1. Run `npm run build` to verify
2. Run tests if applicable
3. Create PR with task reference
4. Mark task as "Complete" after merge

### Adding New Tasks
Add to the appropriate priority section with:
- **Complexity:** Low/Medium/High
- **PRD Reference:** Section number
- **Current State:** What exists now
- **Files to Modify:** Specific file paths
- **Subtasks:** Checkbox list of sub-items

---

*Generated by codebase audit on January 28, 2026*
