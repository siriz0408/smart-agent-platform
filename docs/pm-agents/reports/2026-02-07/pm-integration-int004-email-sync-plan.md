# PM-Integration: Email Sync Implementation Plan

**Date:** 2026-02-07  
**Task:** INT-004 - Plan email sync  
**Status:** ✅ COMPLETED (Planning Phase)

## Executive Summary

This plan outlines the implementation strategy for bidirectional email synchronization between Smart Agent and external email providers (Gmail, Outlook). The sync will enable users to view, search, and manage emails within Smart Agent while maintaining consistency with their email provider.

**Scope:** Phase 1 focuses on Gmail sync (read-only initially), with Outlook support planned for Phase 2.

## Current State

### Existing Infrastructure

✅ **Gmail Connector** (`supabase/functions/_shared/connectors/gmail-connector.ts`)
- Supports: `send_email`, `read_email`, `search_emails`, `create_draft`, `get_thread`, `get_message`
- OAuth scopes: `gmail.readonly`, `gmail.send`, `gmail.compose`
- Action-based execution (on-demand)

✅ **Connector Framework**
- `connector_definitions` table (connector metadata)
- `workspace_connectors` table (active connections per workspace)
- `connector_credentials` table (encrypted OAuth tokens)
- `connector_actions` table (action execution logs)
- Base connector class with validation and error handling

✅ **OAuth Flow**
- `oauth-callback` edge function handles OAuth redirects
- Encrypted credential storage
- Refresh token management

### Gaps Identified

❌ **No Email Sync System**
- No local email storage/cache
- No sync state tracking
- No incremental sync mechanism
- No email threading/conversation grouping

❌ **No Email UI**
- No email inbox view
- No email search UI
- No email detail view
- No email-to-contact linking

## Requirements

### Functional Requirements

1. **Initial Sync**
   - Sync last 30 days of emails on first connection
   - Sync all emails from selected labels/folders
   - Store emails locally in `emails` table

2. **Incremental Sync**
   - Use Gmail `history.list` API with `historyId` for incremental updates
   - Use Microsoft Graph `delta` queries for Outlook
   - Sync every 5 minutes (configurable)
   - Track sync state per workspace connector

3. **Email Storage**
   - Store email metadata (subject, from, to, date, thread_id)
   - Store email body (HTML + plain text)
   - Store attachments (reference URLs, not full files)
   - Link emails to contacts (via email address matching)

4. **Email Threading**
   - Group emails by `thread_id` (Gmail) or `conversationId` (Outlook)
   - Display threaded conversations
   - Track unread status per thread

5. **Search & Filter**
   - Full-text search across email content
   - Filter by sender, date range, labels/folders
   - Search within Smart Agent (not just API calls)

6. **Email-to-Contact Linking**
   - Auto-link emails to contacts via email address matching
   - Manual linking UI
   - Show email history in contact detail view

### Non-Functional Requirements

1. **Performance**
   - Initial sync: Complete within 5 minutes for 1000 emails
   - Incremental sync: <30 seconds per sync cycle
   - Search: <500ms for full-text queries

2. **Reliability**
   - Handle API rate limits gracefully
   - Retry failed syncs with exponential backoff
   - Track sync errors per connector

3. **Security**
   - Encrypt email content at rest (already handled by Supabase encryption)
   - Respect workspace isolation (RLS)
   - Audit email access logs

4. **Scalability**
   - Support 10,000+ emails per workspace
   - Efficient pagination for large inboxes
   - Archive old emails (>90 days) to reduce storage

## Architecture

### Database Schema

#### `emails` Table

```sql
CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES public.workspace_connectors(id) ON DELETE CASCADE,
  
  -- Provider-specific IDs
  provider_message_id TEXT NOT NULL, -- Gmail message ID or Outlook message ID
  provider_thread_id TEXT, -- Gmail thread ID or Outlook conversationId
  
  -- Email metadata
  subject TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[], -- Array of recipient emails
  cc_emails TEXT[],
  bcc_emails TEXT[],
  reply_to TEXT,
  
  -- Content
  body_html TEXT,
  body_text TEXT,
  snippet TEXT, -- Short preview
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  -- Labels/Folders (provider-specific)
  labels TEXT[], -- Gmail labels or Outlook categories
  folder_path TEXT, -- Outlook folder path
  
  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sync state
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  sync_error TEXT,
  
  -- Unique constraint per provider
  UNIQUE(connector_id, provider_message_id)
);

CREATE INDEX idx_emails_workspace_id ON public.emails(workspace_id);
CREATE INDEX idx_emails_connector_id ON public.emails(connector_id);
CREATE INDEX idx_emails_thread_id ON public.emails(provider_thread_id);
CREATE INDEX idx_emails_from_email ON public.emails(from_email);
CREATE INDEX idx_emails_received_at ON public.emails(received_at DESC);
CREATE INDEX idx_emails_sync_status ON public.emails(sync_status);
CREATE INDEX idx_emails_workspace_received ON public.emails(workspace_id, received_at DESC);

-- Full-text search index
CREATE INDEX idx_emails_search ON public.emails USING gin(
  to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_text, '') || ' ' || coalesce(from_name, ''))
);
```

#### `email_attachments` Table

```sql
CREATE TABLE public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  
  -- Attachment metadata
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  attachment_id TEXT, -- Provider-specific attachment ID
  
  -- Storage
  storage_url TEXT, -- Supabase Storage URL (if downloaded)
  provider_url TEXT, -- Provider API URL (Gmail/Outlook)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_attachments_email_id ON public.email_attachments(email_id);
```

#### `email_sync_states` Table

```sql
CREATE TABLE public.email_sync_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES public.workspace_connectors(id) ON DELETE CASCADE UNIQUE,
  
  -- Sync state tracking
  last_sync_at TIMESTAMPTZ,
  last_history_id TEXT, -- Gmail historyId or Outlook deltaToken
  last_sync_status TEXT DEFAULT 'idle' CHECK (last_sync_status IN ('idle', 'syncing', 'error')),
  last_sync_error TEXT,
  
  -- Sync configuration
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval_minutes INTEGER DEFAULT 5,
  sync_days_back INTEGER DEFAULT 30, -- Initial sync window
  
  -- Statistics
  total_emails_synced INTEGER DEFAULT 0,
  last_sync_duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_sync_states_connector_id ON public.email_sync_states(connector_id);
CREATE INDEX idx_email_sync_states_sync_enabled ON public.email_sync_states(sync_enabled) WHERE sync_enabled = TRUE;
```

#### `email_contact_links` Table

```sql
CREATE TABLE public.email_contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  -- Link metadata
  link_type TEXT DEFAULT 'auto' CHECK (link_type IN ('auto', 'manual')),
  matched_email TEXT NOT NULL, -- Which email address matched
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(email_id, contact_id)
);

CREATE INDEX idx_email_contact_links_email_id ON public.email_contact_links(email_id);
CREATE INDEX idx_email_contact_links_contact_id ON public.email_contact_links(contact_id);
```

### Edge Functions

#### `sync-emails` (New)

**Purpose:** Incremental email sync for all active connectors

**Trigger:** Scheduled (every 5 minutes) or manual via API

**Flow:**
1. Query `email_sync_states` for connectors with `sync_enabled = TRUE`
2. For each connector:
   - Load connector instance and credentials
   - Get last `historyId`/`deltaToken` from sync state
   - Call provider API for incremental updates
   - Process new/updated/deleted emails
   - Update `emails` table
   - Update `email_sync_states` with new sync state
   - Link emails to contacts (auto-match)
3. Log sync results

**Rate Limiting:**
- Respect provider rate limits (Gmail: 250 quota units/second)
- Batch API calls efficiently
- Exponential backoff on errors

#### `sync-emails-initial` (New)

**Purpose:** Initial full sync when connector is first connected

**Trigger:** Called after OAuth callback completes

**Flow:**
1. Create `email_sync_states` record
2. Fetch emails from last N days (default: 30)
3. Process in batches (100 emails at a time)
4. Store emails in `emails` table
5. Link emails to contacts
6. Update sync state

**Error Handling:**
- If sync fails, mark sync state as `error`
- Allow retry via manual trigger

### Frontend Components

#### `src/pages/Emails.tsx` (New)

**Features:**
- Email inbox list view
- Thread grouping
- Unread/starred filters
- Search bar
- Pagination

**Components:**
- `EmailList` - List of email threads
- `EmailThread` - Threaded conversation view
- `EmailDetail` - Single email detail view
- `EmailSearch` - Full-text search UI

#### `src/components/emails/EmailThreadCard.tsx` (New)

**Displays:**
- Thread subject
- Participants (from/to)
- Snippet/preview
- Unread count
- Last message timestamp
- Labels/folders

#### `src/components/emails/EmailDetailSheet.tsx` (New)

**Displays:**
- Full email content (HTML rendering)
- Attachments list
- Reply/Forward actions
- Link to contact (if matched)
- Thread history

#### `src/hooks/useEmailSync.ts` (New)

**Functions:**
- `syncEmails()` - Trigger manual sync
- `getSyncStatus()` - Get sync state for connector
- `pauseSync()` / `resumeSync()` - Control sync

#### `src/hooks/useEmails.ts` (New)

**Functions:**
- `useEmailThreads()` - Query email threads
- `useEmailSearch()` - Full-text search
- `useEmailDetail()` - Get single email
- `markAsRead()` / `markAsUnread()` - Update read status
- `starEmail()` / `unstarEmail()` - Update starred status

## Implementation Phases

### Phase 1: Gmail Read-Only Sync (MVP)

**Duration:** 2-3 weeks

**Tasks:**
1. ✅ Create database schema (`emails`, `email_attachments`, `email_sync_states`, `email_contact_links`)
2. ✅ Create `sync-emails` edge function (incremental sync)
3. ✅ Create `sync-emails-initial` edge function (initial sync)
4. ✅ Extend Gmail connector with sync-specific methods
5. ✅ Create email inbox UI (`Emails.tsx`)
6. ✅ Create email detail view
7. ✅ Implement email-to-contact auto-linking
8. ✅ Add email search functionality

**Deliverables:**
- Users can connect Gmail and see emails in Smart Agent
- Emails sync automatically every 5 minutes
- Users can search emails within Smart Agent
- Emails auto-link to contacts

### Phase 2: Gmail Write Operations

**Duration:** 1-2 weeks

**Tasks:**
1. Add reply/forward actions (use existing `send_email` action)
2. Add mark as read/unread sync (bidirectional)
3. Add archive/unarchive sync
4. Add label management

**Deliverables:**
- Users can reply/forward emails from Smart Agent
- Read status syncs bidirectionally
- Labels sync from Gmail

### Phase 3: Outlook Support

**Duration:** 2-3 weeks

**Tasks:**
1. Create Outlook Mail connector (similar to Gmail)
2. Implement Microsoft Graph delta queries
3. Adapt sync functions for Outlook API differences
4. Test Outlook sync end-to-end

**Deliverables:**
- Outlook email sync works identically to Gmail
- Users can connect either Gmail or Outlook

### Phase 4: Advanced Features

**Duration:** 2-3 weeks

**Tasks:**
1. Email templates (pre-built responses)
2. Email scheduling (send later)
3. Email analytics (open rates, click tracking)
4. Bulk operations (archive multiple, apply labels)

**Deliverables:**
- Advanced email management features
- Email engagement analytics

## Technical Considerations

### Gmail API Specifics

**History API:**
- Use `history.list` with `historyId` for incremental sync
- `historyId` is a token representing a point in time
- Changes since `historyId` are returned
- Store `historyId` in `email_sync_states.last_history_id`

**Rate Limits:**
- 250 quota units per second per user
- `messages.list`: 5 quota units
- `messages.get`: 5 quota units
- `history.list`: 5 quota units
- Batch requests: 1 quota unit per request

**Best Practices:**
- Use batch requests for multiple operations
- Cache message metadata to reduce API calls
- Use `format: 'metadata'` when body not needed

### Microsoft Graph Specifics

**Delta Queries:**
- Use `/me/messages/delta` for incremental sync
- Returns `@odata.deltaLink` for next sync
- Store `deltaLink` in `email_sync_states.last_history_id`

**Rate Limits:**
- 10,000 requests per 10 minutes per app
- Throttling headers: `Retry-After`

**Best Practices:**
- Use `$select` to limit fields
- Use `$top` for pagination
- Handle `429 Too Many Requests` with retry

### Performance Optimization

1. **Batch Processing**
   - Process emails in batches of 100
   - Use provider batch APIs when available

2. **Incremental Sync**
   - Only sync changes since last sync
   - Use `historyId`/`deltaToken` for efficiency

3. **Caching**
   - Cache email metadata in `emails` table
   - Only fetch full body when viewing email detail

4. **Indexing**
   - Full-text search index on email content
   - Indexes on `workspace_id`, `received_at`, `from_email`

### Error Handling

1. **API Errors**
   - Retry with exponential backoff
   - Log errors to `email_sync_states.last_sync_error`
   - Mark sync as `error` if persistent failures

2. **Rate Limiting**
   - Respect `Retry-After` headers
   - Implement token bucket algorithm
   - Queue syncs if rate limit exceeded

3. **Data Consistency**
   - Use transactions for multi-table updates
   - Handle partial sync failures gracefully
   - Validate email data before storing

## Testing Strategy

### Unit Tests
- Gmail connector sync methods
- Email parsing/formatting
- Contact matching logic

### Integration Tests
- End-to-end sync flow
- Error handling scenarios
- Rate limit handling

### E2E Tests (Playwright)
- Connect Gmail connector
- Verify emails appear in inbox
- Search emails
- View email detail
- Link email to contact

## Migration Plan

### Database Migrations

1. **Create email tables** (`20260208000000_create_email_sync_tables.sql`)
   - `emails` table
   - `email_attachments` table
   - `email_sync_states` table
   - `email_contact_links` table
   - Indexes and RLS policies

2. **Add RLS Policies**
   - Users can only see emails in their workspace
   - Service role can insert/update for sync

### Deployment Steps

1. Deploy database migration
2. Deploy `sync-emails` edge function
3. Deploy `sync-emails-initial` edge function
4. Update frontend with email UI
5. Enable sync for existing Gmail connectors (manual trigger)

## Success Metrics

1. **Sync Performance**
   - Initial sync completes in <5 minutes for 1000 emails
   - Incremental sync completes in <30 seconds
   - 99%+ sync success rate

2. **User Adoption**
   - 50%+ of users with Gmail connector enable sync
   - Average 10+ emails synced per user

3. **Search Performance**
   - Email search results in <500ms
   - 95%+ search accuracy

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | Sync delays | Implement efficient batching, respect rate limits |
| Large inboxes | Slow initial sync | Sync in batches, show progress UI |
| OAuth token expiry | Sync failures | Auto-refresh tokens, alert on failures |
| Storage costs | High database usage | Archive old emails, compress attachments |
| Data privacy | Email content storage | Encrypt at rest, respect workspace isolation |

## Next Steps

1. **Approve Plan** - PM-Orchestrator review
2. **Create Database Migration** - INT-004.1
3. **Implement Sync Functions** - INT-004.2
4. **Build Email UI** - INT-004.3 (may handoff to PM-Experience)
5. **Test End-to-End** - INT-004.4 (PM-QA)

## Related Documentation

- **RES-006**: Email & Calendar Integration API Evaluation
- **CONNECTOR_FRAMEWORK_ARCHITECTURE.md**: Connector architecture
- **GMAIL_CONNECTOR_EXAMPLE.md**: Gmail connector reference

---

**Status:** ✅ Planning complete. Ready for implementation approval.
