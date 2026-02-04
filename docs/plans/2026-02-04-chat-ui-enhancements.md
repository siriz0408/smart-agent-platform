# Chat UI Enhancements - Implementation Plan

**Created:** 2026-02-04
**Status:** Ready for Implementation
**Priority:** High (Option A), Medium (Option B)

## Goal

**Option A:** Wire non-functional chat input buttons to provide immediate user value and unblock UI.
**Option B:** Integrate completed messaging system backend with frontend UI for real-time agent-client communication.

---

## Option A: Wire Non-Functional Chat Buttons

### Background

Both `/src/pages/Home.tsx` and `/src/pages/Chat.tsx` have three non-functional buttons in the chat input area:
- **SlidersHorizontal** (Settings) - No onClick handler
- **Lightbulb** (AI thinking mode) - No onClick handler
- **Mic** (Voice input) - No onClick handler

These buttons exist in the UI but do nothing when clicked, creating a poor UX.

### Scope

**In scope:**
- Wire SlidersHorizontal button to open AI settings popover (model selection, search toggle)
- Wire Lightbulb button to toggle thinking mode (extended reasoning)
- Remove or disable Mic button (voice input out of scope for MVP)
- Apply changes to both Home.tsx and Chat.tsx for consistency

**Out of scope:**
- Actual voice input implementation
- Multi-provider integration (inference.sh)
- Web search functionality (deferred to Phase 2)

### Technical Approach

**SlidersHorizontal Button (AI Settings):**
- Create a Popover component with dropdown options:
  - AI Model: Default (Claude Sonnet 4), Fast (Haiku), Advanced (Opus) - placeholder for future
  - Search Mode: "My Data Only" (default) vs "Include Web Search" (disabled/coming soon)
  - Response Length: Short, Medium, Long
- Store preferences in localStorage via `useUserPreferences` hook
- Initially all options except "My Data Only" will show "Coming Soon" badge

**Lightbulb Button (Thinking Mode):**
- Add state toggle for "thinking mode" (extended reasoning)
- When enabled, modify system prompt to include "Think step-by-step" instruction
- Visual indicator (badge or icon color change) when active
- Persist preference in localStorage

**Mic Button:**
- Change to disabled state with tooltip "Voice input coming soon"
- Or remove entirely to reduce clutter

### File Changes

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/components/ai-chat/AISettingsPopover.tsx` | Settings popover with model/search/length options |
| Create | `src/components/ai-chat/ThinkingModeToggle.tsx` | Thinking mode toggle logic (or inline) |
| Modify | `src/hooks/useUserPreferences.ts` | Add AI preferences (model, searchMode, responseLength, thinkingMode) |
| Modify | `src/pages/Home.tsx` | Wire buttons, add state management |
| Modify | `src/pages/Chat.tsx` | Wire buttons, add state management |
| Modify | `src/hooks/useAIStreaming.ts` | Accept thinkingMode parameter, modify system prompt |

### Task Breakdown

#### Phase 1: Create Shared Components
- [ ] **Task 1.1:** Create `AISettingsPopover.tsx` component
  - Popover with three sections: Model, Search Mode, Response Length
  - Use shadcn/ui Popover, RadioGroup, Switch components
  - Show "Coming Soon" badges for non-implemented options
  - Read/write to localStorage via useUserPreferences
- [ ] **Task 1.2:** Update `useUserPreferences.ts` hook
  - Add `aiModel`, `searchMode`, `responseLength`, `thinkingMode` fields
  - Default values: model="default", searchMode="myData", responseLength="medium", thinkingMode=false
- [ ] **Task 1.3:** Update `useAIStreaming.ts` to accept `thinkingMode` parameter
  - Modify system prompt when thinkingMode=true to include step-by-step reasoning instruction

#### Phase 2: Wire Home.tsx Buttons
- [ ] **Task 2.1:** Import AISettingsPopover and preferences hook in Home.tsx
- [ ] **Task 2.2:** Add state for popover open/closed and thinking mode
- [ ] **Task 2.3:** Wire SlidersHorizontal button onClick to toggle popover
- [ ] **Task 2.4:** Wire Lightbulb button onClick to toggle thinking mode
- [ ] **Task 2.5:** Update Lightbulb button styling when thinking mode active
- [ ] **Task 2.6:** Disable or remove Mic button with tooltip
- [ ] **Task 2.7:** Pass thinkingMode to streamMessage call

#### Phase 3: Wire Chat.tsx Buttons
- [ ] **Task 3.1:** Import AISettingsPopover and preferences hook in Chat.tsx
- [ ] **Task 3.2:** Add state for popover open/closed and thinking mode
- [ ] **Task 3.3:** Wire SlidersHorizontal button onClick to toggle popover
- [ ] **Task 3.4:** Wire Lightbulb button onClick to toggle thinking mode
- [ ] **Task 3.5:** Update Lightbulb button styling when thinking mode active
- [ ] **Task 3.6:** Disable or remove Mic button with tooltip
- [ ] **Task 3.7:** Pass thinkingMode to streamMessage call

#### Phase 4: Testing
- [ ] **Task 4.1:** Test settings popover opens/closes correctly
- [ ] **Task 4.2:** Test thinking mode toggles and persists across page reloads
- [ ] **Task 4.3:** Verify thinking mode affects AI responses (step-by-step reasoning)
- [ ] **Task 4.4:** Test on mobile (popover positioning, touch interactions)
- [ ] **Task 4.5:** Verify no TypeScript errors

### Testing Strategy

**Unit Tests:**
- useUserPreferences returns correct default values
- AISettingsPopover renders all options correctly
- Thinking mode state toggles properly

**Integration Tests:**
- Settings changes persist to localStorage
- Thinking mode modifies system prompt in AI calls
- Buttons work in both Home.tsx and Chat.tsx

**Manual Testing:**
- Click SlidersHorizontal → popover opens with options
- Select different options → values save and persist
- Click Lightbulb → icon changes color, AI responses use thinking mode
- Test on mobile Safari and Chrome
- Test keyboard navigation (tab to buttons, enter to activate)

### Acceptance Criteria

- [x] SlidersHorizontal button opens settings popover
- [x] Popover shows Model, Search Mode, Response Length options
- [x] "Coming Soon" badges appear on unimplemented features
- [x] Lightbulb button toggles thinking mode
- [x] Thinking mode visual indicator (color change or badge)
- [x] Thinking mode persists across page reloads
- [x] Thinking mode affects AI system prompt
- [x] Mic button disabled with "Coming soon" tooltip
- [x] All functionality works in both Home.tsx and Chat.tsx
- [x] Responsive on mobile (320px width)
- [x] Keyboard accessible (tab, enter)
- [x] No TypeScript errors
- [x] No console errors

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users expect features to work when clicking settings | High | Medium | Clear "Coming Soon" badges and tooltips |
| Popover positioning issues on mobile | Medium | Medium | Test thoroughly, use shadcn/ui defaults |
| Thinking mode not noticeably different | Low | Low | Document expected behavior, iterate based on feedback |

---

## Option B: Messaging System UI Integration

### Background

From `.lovable/plan.md`, the messaging system backend is **100% complete**:
- ✅ Database tables created (`conversations`, `messages`, `user_presence`, `typing_indicators`)
- ✅ Storage bucket created (`message-attachments`)
- ✅ Hooks created (`useConversation`, `useRealtimeMessages`, `useUserPresence`, `useTypingIndicator`, `useReadReceipts`)
- ✅ RLS policies and realtime enabled

**Missing:** Frontend UI integration across the app.

### Scope

**In scope:**
- Build messaging UI page (conversation list + chat interface)
- Add presence indicators (online/away/offline) in contact lists and chat
- Show typing indicators in active conversations
- Display unread message counts in sidebar/navigation
- Add profile settings UI for extended profile fields (bio, headline, credentials, etc.)

**Out of scope:**
- Property alerts and saved searches (Phase 2 feature)
- Email notifications (separate task)
- Group conversations (start with 1-on-1 only)

### Technical Approach

**Messaging UI Architecture:**
- Create `/src/pages/Messages.tsx` with two-column layout:
  - Left: Conversation list with search, unread counts, last message preview
  - Right: Active conversation with message bubbles, typing indicators, attachment support
- Use existing hooks (`useConversation`, `useRealtimeMessages`, etc.)
- Follow chat UI patterns from Home.tsx/Chat.tsx for consistency

**Presence Indicators:**
- Use `useUserPresence` hook to track online/away/offline status
- Display colored dot next to user avatars (green=online, yellow=away, gray=offline)
- Update presence on user activity (debounced)

**Typing Indicators:**
- Use `useTypingIndicator` hook
- Show "User is typing..." below message input when active
- Auto-clear after 3 seconds of inactivity

**Unread Counts:**
- Query `messages` table for unread messages per conversation
- Display badge count in sidebar navigation and conversation list
- Mark messages as read when conversation is viewed

**Profile Settings:**
- Extend Settings page with new profile sections:
  - Bio and headline
  - Credentials (licenses, certifications)
  - Photo gallery
  - Social links
  - Privacy settings
- Use `useProfileExtensions` and `useProfilePrivacy` hooks

### File Changes

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/pages/Messages.tsx` | Main messaging page (2-column layout) |
| Create | `src/components/messages/ConversationList.tsx` | Left sidebar with conversations |
| Create | `src/components/messages/MessageThread.tsx` | Right panel with message bubbles |
| Create | `src/components/messages/MessageInput.tsx` | Chat input with attachment support |
| Create | `src/components/messages/TypingIndicator.tsx` | "User is typing..." component |
| Create | `src/components/messages/PresenceDot.tsx` | Colored status indicator |
| Create | `src/components/settings/ProfileExtensions.tsx` | Bio, credentials, gallery UI |
| Create | `src/components/settings/PrivacySettings.tsx` | Privacy controls UI |
| Modify | `src/App.tsx` | Add /messages route |
| Modify | `src/components/layout/GleanSidebar.tsx` | Add Messages link with unread count badge |
| Modify | `src/pages/Settings.tsx` | Add profile extensions sections |
| Modify | `src/components/contacts/ContactList.tsx` | Add presence indicators to avatars |

### Task Breakdown

#### Phase 1: Messaging UI Foundation
- [ ] **Task 1.1:** Create `Messages.tsx` page with 2-column responsive layout
  - Left sidebar: conversations, right panel: selected conversation
  - Mobile: show list by default, slide to conversation view when selected
- [ ] **Task 1.2:** Create `ConversationList.tsx` component
  - Display conversations with avatar, name, last message, timestamp
  - Show unread count badge
  - Search/filter functionality
  - Sort by most recent
- [ ] **Task 1.3:** Create `MessageThread.tsx` component
  - Message bubbles (user on right, contact on left)
  - Avatar, timestamp, read receipts
  - Auto-scroll to bottom on new messages
  - Group messages by date
- [ ] **Task 1.4:** Create `MessageInput.tsx` component
  - Text input with send button
  - Attachment button (wire to file upload later)
  - Character count or placeholder
  - Enter to send, Shift+Enter for newline

#### Phase 2: Real-time Features
- [ ] **Task 2.1:** Create `PresenceDot.tsx` component
  - Small colored circle (8px) with status color
  - Green (online), yellow (away), gray (offline)
  - Optional: pulse animation for online status
- [ ] **Task 2.2:** Integrate `useUserPresence` hook in Messages.tsx
  - Track current user presence
  - Subscribe to presence updates for conversation participants
  - Update presence on user activity (mouse move, key press, debounced 30s)
- [ ] **Task 2.3:** Create `TypingIndicator.tsx` component
  - "UserName is typing..." text with animated dots
  - Show below message input when active
- [ ] **Task 2.4:** Integrate `useTypingIndicator` hook in MessageInput.tsx
  - Send typing event on input change
  - Debounce to avoid excessive updates
  - Clear after 3 seconds of inactivity
- [ ] **Task 2.5:** Implement unread message counts
  - Query unread messages per conversation
  - Display badge in ConversationList
  - Mark as read when conversation is viewed (useReadReceipts)
- [ ] **Task 2.6:** Add realtime subscriptions
  - New messages appear instantly
  - Presence changes update immediately
  - Typing indicators show in real-time

#### Phase 3: Profile Settings UI
- [ ] **Task 3.1:** Create `ProfileExtensions.tsx` component
  - Bio textarea (500 char max)
  - Headline input (100 char max)
  - Brokerage name, license number, license state
  - Years experience (number input)
  - Specialties (multi-select or tags)
  - Service areas (textarea or multi-input)
  - Website URL
- [ ] **Task 3.2:** Create credential management UI
  - List existing credentials with edit/delete
  - Add credential dialog (type, number, issuing org, issue/expiry dates)
  - File upload for credential documents (optional)
- [ ] **Task 3.3:** Create photo gallery UI
  - Grid of uploaded photos
  - Upload button (max 10MB per photo)
  - Delete photos
  - Set as cover photo option
- [ ] **Task 3.4:** Create social links UI
  - Add/edit/delete social media links
  - Platform icons (LinkedIn, Twitter, Instagram, Facebook)
  - URL validation
- [ ] **Task 3.5:** Create `PrivacySettings.tsx` component
  - Toggle visibility for profile fields (public, connections, private)
  - Online status visibility toggle
  - Message request settings

#### Phase 4: Navigation & Integration
- [ ] **Task 4.1:** Add Messages route to App.tsx
  - Route: `/messages`
  - Protected route (requires auth)
- [ ] **Task 4.2:** Add Messages link to GleanSidebar
  - Icon: MessageSquare
  - Badge showing total unread count
  - Active state when on /messages route
- [ ] **Task 4.3:** Add presence indicators to Contacts page
  - Show PresenceDot on contact avatars in ContactList
  - Subscribe to presence updates for visible contacts
- [ ] **Task 4.4:** Add profile completion indicator
  - Use `useProfileCompletion` hook
  - Show percentage in Settings page header
  - Prompt to complete profile if <80%

#### Phase 5: Testing & Polish
- [ ] **Task 5.1:** Test real-time messaging flow
  - Send message, verify instant delivery
  - Test read receipts update
  - Verify unread counts decrement when viewed
- [ ] **Task 5.2:** Test presence system
  - Go online/offline, verify status updates
  - Test auto-away after 5 minutes idle
  - Verify presence shows correctly in multiple locations
- [ ] **Task 5.3:** Test typing indicators
  - Start typing, verify indicator appears
  - Stop typing, verify indicator clears after 3s
- [ ] **Task 5.4:** Test mobile responsiveness
  - 2-column layout on desktop
  - Single column on mobile with back navigation
  - Touch interactions work smoothly
- [ ] **Task 5.5:** Test profile extensions
  - Add bio, credentials, photos, social links
  - Verify data saves to database
  - Test privacy settings hide/show fields
- [ ] **Task 5.6:** Accessibility audit
  - Keyboard navigation works (tab through messages, conversations)
  - Screen reader announces new messages
  - Focus management on conversation change

### Testing Strategy

**Unit Tests:**
- PresenceDot renders correct colors for each status
- TypingIndicator shows/hides based on state
- MessageInput submits on Enter, newline on Shift+Enter
- Unread count calculates correctly

**Integration Tests:**
- Sending a message saves to database and appears in UI
- Presence updates propagate via Supabase Realtime
- Typing indicators show across users
- Read receipts mark messages as read

**E2E Tests:**
- User creates new conversation, sends message, receives reply
- User sees presence indicator change from offline to online
- User sees typing indicator when other user types
- Unread badge updates when new message arrives

**Manual Testing:**
- Test on mobile Safari (iOS) and Chrome (Android)
- Test with multiple browser tabs (realtime sync)
- Test rapid typing (debounce doesn't break)
- Test attachment uploads (files, images)

### Acceptance Criteria

**Messaging UI:**
- [x] Messages page shows conversation list and message thread
- [x] Can create new conversation with contact
- [x] Can send and receive messages in real-time
- [x] Messages appear instantly via Supabase Realtime
- [x] Unread count badge shows in sidebar and conversation list
- [x] Responsive layout (2-column desktop, 1-column mobile)

**Presence System:**
- [x] Colored dot shows online/away/offline status
- [x] Presence updates automatically (every 30s, on activity)
- [x] Status changes reflect immediately via Realtime
- [x] Presence indicators appear in Contacts and Messages

**Typing Indicators:**
- [x] "User is typing..." appears when other user types
- [x] Indicator clears after 3 seconds of inactivity
- [x] No typing indicator shown for own typing

**Profile Settings:**
- [x] Can edit bio, headline, brokerage info
- [x] Can add/edit/delete credentials
- [x] Can upload photos to gallery
- [x] Can add social media links
- [x] Privacy settings control field visibility
- [x] Profile completion percentage displays

**General:**
- [x] No TypeScript errors
- [x] No console errors
- [x] Lighthouse accessibility score >90
- [x] Works on mobile (iOS Safari, Chrome Android)
- [x] Keyboard accessible

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Realtime subscriptions cause performance issues | Medium | High | Limit subscriptions to visible conversations, cleanup on unmount |
| Presence polling drains battery on mobile | Low | Medium | Use debounced updates (30s), pause when app backgrounded |
| Unread counts become stale | Medium | Medium | Subscribe to message inserts, invalidate query on new message |
| File uploads fail for large attachments | Medium | Medium | Validate file size (<10MB), show progress indicator, handle errors |
| Typing indicator spam with rapid typing | Low | Low | Debounce typing events (500ms) |

---

## Timeline (High-Level Phases)

**Option A: Chat Button Wiring**
- Phase 1-2: Core implementation
- Phase 3: Apply to both pages
- Phase 4: Testing and polish

**Option B: Messaging System Integration**
- Phase 1: Messaging UI foundation
- Phase 2: Real-time features (presence, typing, unread)
- Phase 3: Profile settings UI
- Phase 4: Navigation integration
- Phase 5: Testing and polish

---

## Dependencies

**Option A:**
- None (self-contained)

**Option B:**
- Backend complete (database, hooks, RLS)
- Supabase Realtime enabled
- Storage buckets configured

---

## Rollback Plan

**Option A:**
- If issues arise, simply revert button onClick handlers
- Remove AISettingsPopover component
- Restore original non-functional state

**Option B:**
- Messaging page is additive (won't break existing features)
- Can hide Messages link from sidebar if issues found
- Profile extensions are optional (won't break core profiles)

---

## Success Metrics

**Option A:**
- Users can access AI settings via popover
- Users can toggle thinking mode
- No increase in support tickets about "broken buttons"

**Option B:**
- Users send/receive messages successfully
- Presence indicators show accurate status
- Unread count badge drives engagement
- Profile completion rate increases

---

## Next Steps

1. Review and approve this plan
2. Execute Option A first (quick win, unblocks UI)
3. Test and deploy Option A
4. Execute Option B (higher value, more complex)
5. Update TASK_BOARD.md with completion status
