# PM-Communication Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Messaging Pattern:**
- Real-time messaging via Supabase Realtime
- Conversation management (direct and group chats)
- Message storage in `messages` table
- RLS policies enforce workspace isolation

**Reactions Pattern:**
- 6 emoji set (👍 ❤️ 😂 😮 😢 🎉)
- Real-time subscription for updates
- Toggle on/off functionality
- Hover tooltips showing who reacted

**Presence Pattern:**
- User presence tracking (`useUserPresence` hook)
- Typing indicators (`useTypingIndicator` hook)
- Read receipts (`useReadReceipts` hook)
- Real-time updates via Supabase subscriptions

### Common Issues & Solutions

**Issue:** Message reactions not updating in real-time
- **Solution:** Added real-time subscription to reactions
- **Pattern:** All real-time features need Supabase subscriptions

**Issue:** File attachments incomplete
- **Solution:** Schema exists, storage configured, UI incomplete
- **Pattern:** Backend ready, frontend pending

**Issue:** Notification preferences missing
- **Solution:** No UI for user preferences yet
- **Pattern:** Backend ready, frontend pending

### Domain-Specific Knowledge

**Message Types:**
- Text messages
- File attachments (pending UI)
- System messages
- Reactions (emoji)

**Conversation Types:**
- Direct messages (1-on-1)
- Group conversations (multiple participants)
- Support conversations (future)

**Notification Types:**
- In-app notifications (working)
- Email notifications (templates exist)
- Push notifications (future - mobile app)

### Cross-PM Coordination Patterns

**With PM-Experience:**
- Messaging UI components
- Notification bell component
- Message thread components

**With PM-Context:**
- Message storage in database
- File attachment storage
- Search integration (message search)

**With PM-Intelligence:**
- AI can send messages (future)
- Message context for AI (future)

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** COM-006 - Message search + archive (complete)
- **Discovered:** File attachments UI incomplete
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Implemented message reactions (6 emojis)
- Added real-time subscription
- Created MessageReactions component

**Cycle 7:**
- Established messaging patterns
- Created conversation management

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for UI improvements
- Testing real-time features thoroughly
- Coordinating with PM-Experience on UI

**Avoids:**
- Skipping real-time subscription setup
- Hardcoding message types
- Breaking existing conversation flows

**Works well with:**
- PM-Experience (messaging UI)
- PM-Context (message storage)
- PM-Intelligence (AI messaging - future)

---

*This memory is updated after each development cycle. PM-Communication should read this before starting new work.*
