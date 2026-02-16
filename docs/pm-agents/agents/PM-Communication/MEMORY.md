# PM-Communication Memory

> **Last Updated:** 2026-02-15 (Cycle 13)
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

**Push Notifications Pattern (Cycle 13):**
- Capacitor PushNotifications plugin for native iOS/Android
- Device tokens stored in `push_notification_tokens` table
- `usePushNotifications` hook manages registration and permissions
- Platform detection via `Capacitor.isNativePlatform()`
- Token registration requires permission + native platform
- Web fallback shows "mobile app required" message
- Settings UI component: `PushNotificationSettings.tsx`

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
- Push notifications (infrastructure ready, server-side sender pending)

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

### Last Cycle (Cycle 13)
- **Worked on:** COM-008 - Push notifications infrastructure (80% complete)
- **Implemented:**
  - Installed @capacitor/push-notifications plugin
  - Created `usePushNotifications` hook with full lifecycle management
  - Added `push_notification_tokens` database table with RLS
  - Updated capacitor.config.ts with PushNotifications config
  - Created `PushNotificationSettings.tsx` UI component
  - Integrated into Settings page notifications tab
- **Remaining:** Server-side push sender (edge function to send via FCM/APNs)
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 9:**
- Message search + archive (complete)
- File attachments UI discovered incomplete

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
