# Message Flow End-to-End Audit

**Task:** COM-009  
**Date:** 2026-02-06  
**Status:** Complete  
**Author:** PM-Communication

## Executive Summary

This document provides a comprehensive audit of the Smart Agent messaging system, mapping out the complete end-to-end message flow from user input to recipient display. The audit covers architecture, data flows, real-time subscriptions, edge cases, and identifies gaps for E2E testing.

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Messages.tsx (Main Container)                                  │
│  ├── ConversationList.tsx (Sidebar)                            │
│  ├── MessageThread.tsx (Message Display)                        │
│  ├── MessageInput.tsx (Input + Attachments)                     │
│  └── ConversationHeader.tsx (Header)                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HOOKS LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  useConversation.ts          - Conversation & message management│
│  useRealtimeMessages.ts      - Real-time message subscriptions │
│  useReadReceipts.ts          - Read receipt tracking            │
│  useTypingIndicator.ts       - Typing indicator management       │
│  useUserPresence.ts          - User presence tracking            │
│  useMessageAttachments.ts    - File attachment handling         │
│  useUnreadCounts.ts          - Unread message counts            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
├─────────────────────────────────────────────────────────────────┤
│  Database Tables:                                                │
│  ├── conversations              - Conversation metadata         │
│  ├── messages                   - Message content               │
│  ├── conversation_participants  - Participant tracking          │
│  ├── typing_indicators          - Typing state                 │
│  ├── message_attachments         - File metadata                │
│  └── user_presence              - Online/offline status          │
│                                                                   │
│  Storage Bucket:                                                 │
│  └── message-attachments        - File storage                  │
│                                                                   │
│  Realtime:                                                       │
│  ├── messages (INSERT events)                                   │
│  ├── typing_indicators (INSERT/UPDATE/DELETE)                   │
│  └── conversation_participants (UPDATE for read receipts)       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Database Schema

**conversations**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants)
- `type` (TEXT: 'direct' | 'group')
- `title` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**messages**
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `sender_id` (UUID, FK → auth.users)
- `content` (TEXT)
- `message_type` (TEXT: 'text' | 'file' | 'system')
- `file_url` (TEXT, nullable - legacy)
- `sent_at` (TIMESTAMPTZ)
- `edited_at` (TIMESTAMPTZ, nullable)
- `is_deleted` (BOOLEAN)

**conversation_participants**
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `user_id` (UUID, FK → auth.users, nullable)
- `contact_id` (UUID, FK → contacts, nullable)
- `joined_at` (TIMESTAMPTZ)
- `last_read_at` (TIMESTAMPTZ, nullable)
- `muted` (BOOLEAN)

**typing_indicators**
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `user_id` (UUID, FK → auth.users)
- `started_at` (TIMESTAMPTZ)
- Unique constraint: (conversation_id, user_id)

**message_attachments**
- `id` (UUID, PK)
- `message_id` (UUID, FK → messages)
- `storage_path` (TEXT)
- `file_name` (TEXT)
- `file_type` (TEXT)
- `file_size` (INTEGER)
- `created_at` (TIMESTAMPTZ)

---

## 2. Message Flow: Text Messages

### 2.1 Happy Path Flow

```
User Action: Types message and clicks Send
    │
    ▼
MessageInput.tsx::handleSend()
    │
    ├─► Validates: content.trim() || hasAttachments
    ├─► Calls: stopTyping() (clears typing indicator)
    └─► Calls: onSend(content, uploadAttachments?)
         │
         ▼
Messages.tsx::handleSendMessage()
    │
    └─► Calls: sendMessage(content, uploadAttachments)
         │
         ▼
useConversation.ts::sendMessage()
    │
    └─► Calls: sendMessageMutation.mutateAsync()
         │
         ▼
useConversation.ts::sendMessageMutation (mutationFn)
    │
    ├─► Step 1: Insert message into DB
    │   └─► supabase.from("messages").insert({
    │         conversation_id,
    │         sender_id: user.id,
    │         content,
    │         message_type: "text"
    │       }).select("id").single()
    │
    ├─► Step 2: Upload attachments (if any)
    │   └─► uploadAttachments(messageId)
    │       └─► For each attachment:
    │           ├─► Upload to storage bucket
    │           └─► Insert into message_attachments table
    │
    ├─► Step 3: Update conversation timestamp
    │   └─► supabase.from("conversations")
    │       .update({ updated_at: now() })
    │       .eq("id", conversationId)
    │
    └─► Step 4: Refetch queries
        ├─► refetchMessages()
        └─► refetchConversations()
```

### 2.2 Real-time Delivery Flow

```
Database Trigger: INSERT on messages table
    │
    ├─► Trigger: update_conversation_timestamp()
    │   └─► Updates conversations.updated_at
    │
    └─► Supabase Realtime: Broadcasts INSERT event
         │
         ▼
useRealtimeMessages.ts::useEffect()
    │
    ├─► Subscribes to: channel(`messages:${conversationId}`)
    ├─► Listens for: postgres_changes on messages table
    └─► Filter: conversation_id = eq.{conversationId}
         │
         ▼
On INSERT event received:
    │
    ├─► queryClient.invalidateQueries(["messages", conversationId])
    │   └─► Triggers refetch of messages query
    │
    └─► onNewMessage?.() callback
         └─► Calls: refetchConversations() (updates list)
```

### 2.3 Recipient View Flow

```
Recipient's Browser:
    │
    ├─► useRealtimeMessages hook active
    │   └─► Receives INSERT event via Supabase Realtime
    │
    ├─► React Query refetches messages
    │   └─► useConversation.ts::messages query
    │       └─► Fetches all messages for conversation
    │           ├─► Includes sender profiles
    │           └─► Includes attachments
    │
    ├─► MessageThread.tsx re-renders
    │   └─► Displays new message
    │
    └─► Auto-scroll to bottom
        └─► useEffect(() => bottomRef.current?.scrollIntoView())
```

---

## 3. Typing Indicator Flow

### 3.1 Start Typing Flow

```
User Action: Types in MessageInput textarea
    │
    ▼
MessageInput.tsx::handleContentChange()
    │
    └─► Calls: handleTyping()
         │
         ▼
useTypingIndicator.ts::handleTyping()
    │
    ├─► Clears existing timeout (if any)
    ├─► Calls: startTyping.mutate()
    │   └─► supabase.from("typing_indicators")
    │       .upsert({
    │         conversation_id,
    │         user_id: user.id,
    │         started_at: now()
    │       }, { onConflict: "conversation_id,user_id" })
    │
    └─► Sets timeout to auto-stop after 5 seconds
        └─► setTimeout(() => stopTyping.mutate(), 5000)
```

### 3.2 Real-time Typing Display

```
Database: INSERT/UPDATE on typing_indicators
    │
    └─► Supabase Realtime: Broadcasts change
         │
         ▼
useTypingIndicator.ts::useEffect() (subscription)
    │
    ├─► Subscribes to: channel(`typing:${conversationId}`)
    ├─► Listens for: postgres_changes on typing_indicators
    └─► Filter: conversation_id = eq.{conversationId}
         │
         ▼
On change event:
    │
    └─► queryClient.invalidateQueries(["typing", conversationId])
         │
         ▼
useTypingIndicator.ts::typingQuery refetches
    │
    ├─► Filters: Only indicators from last 10 seconds
    ├─► Excludes: Current user's typing indicator
    └─► Returns: Array of typing users
         │
         ▼
TypingIndicator.tsx component
    │
    ├─► Receives typingUsers from hook
    ├─► Displays: "User is typing..." or "2 people are typing..."
    └─► Shows animated dots
```

### 3.3 Stop Typing Flow

```
Trigger: User stops typing for 5 seconds OR sends message
    │
    ├─► Timeout expires (5s)
    │   └─► stopTyping.mutate()
    │
    └─► User sends message
        └─► MessageInput::handleSend() calls stopTyping()
             │
             ▼
useTypingIndicator.ts::stopTyping.mutate()
    │
    └─► supabase.from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
```

---

## 4. File Attachment Flow

### 4.1 Attachment Upload Flow

```
User Action: Selects file(s) via file input
    │
    ▼
MessageInput.tsx::handleFileSelect()
    │
    ├─► Calls: addFiles(files)
    │   └─► useMessageAttachments.ts::addFiles()
    │       ├─► Validates each file:
    │       │   ├─► Size ≤ 25MB
    │       │   └─► Type in ALLOWED_TYPES
    │       ├─► Creates PendingAttachment objects
    │       ├─► Generates preview URLs for images
    │       └─► Adds to pendingAttachments state
    │
    └─► Displays: AttachmentPreview components
```

### 4.2 Send Message with Attachments

```
User Action: Sends message with attachments
    │
    ▼
MessageInput.tsx::handleSend()
    │
    ├─► Creates uploadFn callback:
    │   └─► async (messageId) => {
    │         await uploadAttachments(conversationId, messageId)
    │       }
    │
    └─► Calls: onSend(content || "(Attachment)", uploadFn)
         │
         ▼
useConversation.ts::sendMessageMutation
    │
    ├─► Step 1: Insert message (gets messageId)
    └─► Step 2: Call uploadAttachments(messageId)
         │
         ▼
useMessageAttachments.ts::uploadAttachments()
    │
    └─► For each pending attachment:
        │
        ├─► Step 1: Upload to storage
        │   └─► supabase.storage
        │       .from("message-attachments")
        │       .upload(storagePath, file, { contentType })
        │   Storage path: {user_id}/{conversation_id}/{message_id}/{timestamp}-{filename}
        │
        └─► Step 2: Create attachment record
            └─► supabase.from("message_attachments")
                .insert({
                  message_id,
                  file_name,
                  file_type,
                  file_size,
                  storage_path
                })
```

### 4.3 Attachment Display Flow

```
MessageThread.tsx renders message with attachments
    │
    ├─► Fetches attachments from messages query
    │   └─► useConversation.ts includes attachments in message objects
    │
    └─► Renders AttachmentDisplay component
         │
         ├─► For images: Loads signed URL
         │   └─► useGetAttachmentUrl() creates signed URL (1hr expiry)
         │
         └─► For files: Shows file icon + download button
             └─► Download uses signed URL
```

---

## 5. Read Receipts Flow

### 5.1 Mark as Read Flow

```
User Action: Opens conversation OR messages load
    │
    ▼
Messages.tsx::useEffect()
    │
    ├─► Trigger: selectedConversationId changes
    ├─► Trigger: messages.length > 0
    └─► Calls: markAsRead.mutate(conversationId)
         │
         ▼
useReadReceipts.ts::markAsRead.mutate()
    │
    └─► supabase.from("conversation_participants")
        .update({ last_read_at: now() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
         │
         └─► Invalidates queries:
             ├─► ["conversations"]
             ├─► ["conversation", conversationId]
             ├─► ["unread-counts"]
             └─► ["total-unread-count"]
```

### 5.2 Unread Count Calculation

```
ConversationList.tsx displays unread badges
    │
    └─► Calls: useUnreadCounts(conversationIds)
         │
         ▼
useUnreadCounts.ts (assumed implementation)
    │
    └─► For each conversation:
        ├─► Get participant's last_read_at
        └─► Count messages where:
            ├─► sent_at > last_read_at
            └─► sender_id ≠ current_user_id
```

---

## 6. Presence Tracking Flow

### 6.1 User Presence Updates

```
Component Mount: useUserPresence() hook
    │
    ├─► Sets status to "online" on mount
    ├─► Updates every 30 seconds
    ├─► Sets "away" when tab hidden
    ├─► Sets "offline" on unmount
    └─► Uses sendBeacon for reliable offline on page close
```

### 6.2 Presence Display

```
ConversationList.tsx::ConversationPresence component
    │
    ├─► Queries: user_presence table for participant
    ├─► Refetches every 30 seconds
    └─► Displays: PresenceDot with status
```

---

## 7. Real-time Subscription Architecture

### 7.1 Active Subscriptions

**Messages Subscription** (`useRealtimeMessages.ts`)
- Channel: `messages:{conversationId}`
- Table: `messages`
- Event: `INSERT`
- Filter: `conversation_id = eq.{conversationId}`
- Action: Invalidates messages query + refetches conversations

**Typing Indicators Subscription** (`useTypingIndicator.ts`)
- Channel: `typing:{conversationId}`
- Table: `typing_indicators`
- Event: `*` (INSERT/UPDATE/DELETE)
- Filter: `conversation_id = eq.{conversationId}`
- Action: Invalidates typing query

**Presence Subscription** (`usePresenceSubscription.ts`)
- Channel: `presence-changes`
- Table: `user_presence`
- Event: `*`
- Filter: `user_id = in.({userIds})`
- Action: Invalidates presence query

### 7.2 Subscription Lifecycle

```
Component Mount:
    │
    ├─► useEffect() creates subscription
    ├─► Channel subscribed via supabase.channel().subscribe()
    └─► Cleanup function registered
         │
         ▼
Component Unmount:
    │
    └─► Cleanup function executes
        └─► supabase.removeChannel(channel)
```

---

## 8. Edge Cases & Error Handling

### 8.1 Offline Scenarios

**Current State:**
- ❌ No offline message queue
- ❌ No retry mechanism for failed sends
- ❌ No offline indicator in UI
- ✅ Realtime subscriptions auto-reconnect when online

**Gap:** Messages sent while offline are lost.

### 8.2 Reconnection Scenarios

**Current State:**
- ✅ Supabase Realtime auto-reconnects
- ✅ React Query refetches on reconnect
- ⚠️ No explicit reconnection UI feedback

**Gap:** Users don't know when reconnection happens.

### 8.3 Attachment Failures

**Current State:**
- ✅ Error handling in uploadAttachments()
- ✅ Cleanup of failed uploads (removes from storage)
- ⚠️ Message sent even if attachments fail (with error toast)

**Gap:** No retry mechanism for failed attachments.

### 8.4 Race Conditions

**Potential Issues:**
1. **Typing indicator timeout vs. send message:**
   - ✅ Handled: stopTyping() called before send
   
2. **Multiple tabs sending messages:**
   - ✅ Handled: Each tab has independent state
   - ⚠️ No conflict resolution

3. **Read receipt updates:**
   - ✅ Handled: Last write wins (acceptable)

### 8.5 Large Message Lists

**Current State:**
- ✅ Messages ordered by sent_at ASC
- ⚠️ No pagination (loads all messages)
- ⚠️ No virtual scrolling

**Gap:** Performance issues with very long conversations.

---

## 9. Known Issues & Gaps

### 9.1 Critical Gaps

1. **No offline message queue**
   - Messages sent while offline are lost
   - **Recommendation:** Implement service worker + IndexedDB queue

2. **No message pagination**
   - All messages loaded at once
   - **Recommendation:** Implement cursor-based pagination

3. **No retry mechanism**
   - Failed sends are not retried
   - **Recommendation:** Add exponential backoff retry

4. **No message editing/deletion UI**
   - Database supports `edited_at` and `is_deleted` but no UI
   - **Recommendation:** Add edit/delete actions

### 9.2 Medium Priority Gaps

1. **No message search**
   - Can't search within conversations
   - **Recommendation:** Add full-text search on messages.content

2. **No read receipts for individual messages**
   - Only conversation-level read receipts
   - **Recommendation:** Add message-level read receipts table

3. **No typing indicator for contacts**
   - Only works for authenticated users
   - **Recommendation:** Extend to contacts (if contacts can type)

4. **No message reactions**
   - **Recommendation:** Add reactions table + UI

### 9.3 Minor Issues

1. **Typing indicator uses polling + realtime**
   - `useTypingIndicator.ts` polls every 2s AND subscribes to realtime
   - **Recommendation:** Remove polling, rely on realtime only

2. **No message delivery status**
   - Can't tell if message was delivered vs. just sent
   - **Recommendation:** Add delivery receipts

3. **Attachment preview generation**
   - Only for images, no PDF previews
   - **Recommendation:** Add PDF thumbnail generation

---

## 10. Recommended E2E Tests

### 10.1 Core Message Flow Tests

```typescript
describe("Message Flow E2E", () => {
  test("User can send and receive text message", async () => {
    // 1. User A sends message
    // 2. Verify message appears in User A's view
    // 3. Verify message appears in User B's view via realtime
    // 4. Verify conversation list updates for both users
  });

  test("User can send message with attachments", async () => {
    // 1. User selects file(s)
    // 2. User sends message
    // 3. Verify attachments upload
    // 4. Verify attachments display for both users
    // 5. Verify attachments downloadable
  });

  test("Typing indicator appears and disappears", async () => {
    // 1. User A starts typing
    // 2. Verify User B sees typing indicator
    // 3. User A stops typing (5s timeout)
    // 4. Verify typing indicator disappears
  });

  test("Read receipts update correctly", async () => {
    // 1. User A sends message
    // 2. User B opens conversation
    // 3. Verify User B's last_read_at updates
    // 4. Verify unread count decreases
  });
});
```

### 10.2 Edge Case Tests

```typescript
describe("Message Flow Edge Cases", () => {
  test("Handles offline message sending", async () => {
    // 1. Go offline
    // 2. Try to send message
    // 3. Verify error handling
    // 4. Go online
    // 5. Verify message queue (when implemented)
  });

  test("Handles reconnection gracefully", async () => {
    // 1. Start conversation
    // 2. Disconnect network
    // 3. Reconnect network
    // 4. Verify messages sync
    // 5. Verify no duplicate messages
  });

  test("Handles attachment upload failure", async () => {
    // 1. Select large/invalid file
    // 2. Verify validation error
    // 3. Select valid file
    // 4. Simulate upload failure
    // 5. Verify error handling + cleanup
  });

  test("Handles multiple tabs", async () => {
    // 1. Open conversation in Tab A
    // 2. Open same conversation in Tab B
    // 3. Send message from Tab A
    // 4. Verify Tab B updates
    // 5. Verify no duplicate subscriptions
  });
});
```

### 10.3 Performance Tests

```typescript
describe("Message Flow Performance", () => {
  test("Handles large conversation (1000+ messages)", async () => {
    // 1. Load conversation with 1000+ messages
    // 2. Verify initial load time < 2s
    // 3. Verify scrolling performance
    // 4. Verify new messages append correctly
  });

  test("Handles rapid message sending", async () => {
    // 1. Send 10 messages rapidly
    // 2. Verify all messages appear
    // 3. Verify correct ordering
    // 4. Verify no race conditions
  });
});
```

### 10.4 Security Tests

```typescript
describe("Message Flow Security", () => {
  test("User cannot see messages from other tenants", async () => {
    // 1. User A (tenant 1) sends message
    // 2. User B (tenant 2) tries to access conversation
    // 3. Verify RLS blocks access
  });

  test("User cannot send message to conversation they're not in", async () => {
    // 1. User A tries to send to conversation they're not in
    // 2. Verify RLS blocks insert
  });

  test("User cannot access attachments from other conversations", async () => {
    // 1. User A uploads attachment
    // 2. User B (not in conversation) tries to access URL
    // 3. Verify storage RLS blocks access
  });
});
```

---

## 11. Testing Strategy

### 11.1 Unit Tests (Recommended)

- `useConversation.ts`: Test message sending, fetching, conversation creation
- `useTypingIndicator.ts`: Test typing start/stop logic, debouncing
- `useMessageAttachments.ts`: Test file validation, upload logic
- `useReadReceipts.ts`: Test read receipt updates, unread count calculation

### 11.2 Integration Tests (Recommended)

- Message sending → Database → Realtime → UI update
- Typing indicator → Database → Realtime → UI update
- Attachment upload → Storage → Database → UI display

### 11.3 E2E Tests (Critical)

- Full message flow with two users
- Offline/online scenarios
- Attachment upload/download
- Read receipts
- Presence tracking

### 11.4 Performance Tests (Recommended)

- Large conversation loading
- Rapid message sending
- Multiple concurrent subscriptions

---

## 12. Monitoring & Observability

### 12.1 Metrics to Track

1. **Message Delivery Latency**
   - Time from send to recipient view
   - Target: < 500ms

2. **Realtime Connection Health**
   - Connection uptime
   - Reconnection frequency

3. **Attachment Upload Success Rate**
   - Successful uploads / total attempts
   - Target: > 99%

4. **Typing Indicator Accuracy**
   - False positives (showing when not typing)
   - False negatives (not showing when typing)

### 12.2 Logging Points

- Message send attempts (success/failure)
- Realtime subscription events
- Attachment upload progress
- Read receipt updates
- Typing indicator changes

---

## 13. Conclusion

The Smart Agent messaging system has a solid foundation with:
- ✅ Real-time message delivery via Supabase Realtime
- ✅ Typing indicators
- ✅ File attachments
- ✅ Read receipts
- ✅ Presence tracking
- ✅ Proper RLS security

**Critical gaps to address:**
1. Offline message queue
2. Message pagination
3. Retry mechanism for failed sends
4. Message editing/deletion UI

**Recommended next steps:**
1. Implement E2E tests for core flows
2. Add offline message queue
3. Implement message pagination
4. Add retry mechanism
5. Add message editing/deletion UI

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-06  
**Next Review:** After E2E tests implementation
