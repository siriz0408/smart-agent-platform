# RES-006: Email & Calendar Integration API Evaluation

> **Author:** PM-Research  
> **Date:** 2026-02-07  
> **Dev Cycle:** #9  
> **Status:** Complete  
> **Backlog Item:** RES-006 — Evaluate email/calendar integration APIs (Gmail, Outlook, Google Calendar)

---

## Executive Summary

This report evaluates four key APIs for deeper email and calendar integration in Smart Agent: **Gmail API**, **Microsoft Graph (Outlook Mail)**, **Google Calendar API v3**, and **Microsoft Graph (Outlook Calendar)**. Smart Agent already has working Gmail and Google Calendar connectors (Phase 2). This research informs the next integration priorities and architectural decisions for Phase 3 expansion.

**Key Finding:** Google APIs (Gmail + Calendar) should remain the primary integration path. Microsoft Graph should be added as the second priority to capture the ~30% of real estate professionals who use Outlook/Microsoft 365. A unified connector abstraction layer (already in place via `BaseConnector`) positions us well for both.

---

## 1. API Capabilities Comparison

### 1.1 Email APIs

| Capability | Gmail API | Microsoft Graph (Outlook Mail) |
|---|---|---|
| **Send email** | ✅ `messages.send` | ✅ `POST /me/sendMail` |
| **Read email** | ✅ `messages.get` (full/metadata/minimal) | ✅ `GET /me/messages/{id}` |
| **List/search** | ✅ `messages.list` with Gmail query syntax | ✅ `GET /me/messages` with OData `$filter`, `$search` |
| **Create drafts** | ✅ `drafts.create` | ✅ `POST /me/messages` (isDraft) |
| **Threads** | ✅ Native thread model (`threads.get/list`) | ✅ `conversationId` grouping |
| **Labels/folders** | ✅ Labels (Gmail-specific, flexible) | ✅ Folders (traditional hierarchy) |
| **Attachments** | ✅ Inline via multipart MIME or upload | ✅ Up to 150MB via resumable upload |
| **Batch requests** | ✅ Batch API (up to 100 requests) | ✅ JSON batching (`$batch`, up to 20) |
| **Real-time (push)** | ✅ `users.watch` via Cloud Pub/Sub | ✅ Change notifications via webhooks |
| **Sync (delta)** | ✅ `history.list` with `historyId` | ✅ Delta queries (`/me/messages/delta`) |
| **HTML email** | ✅ MIME encoding (manual) | ✅ Native `body.contentType: "HTML"` |
| **Categories/tags** | ✅ Labels | ✅ Categories (preset + custom) |
| **Rules/filters** | ❌ Not via API (UI only) | ✅ `messageRules` CRUD |
| **Focused inbox** | ❌ N/A | ✅ `inferenceClassification` |
| **Mentions** | ❌ N/A | ✅ `@mention` support |

### 1.2 Calendar APIs

| Capability | Google Calendar API v3 | Microsoft Graph (Outlook Calendar) |
|---|---|---|
| **Create event** | ✅ `events.insert` | ✅ `POST /me/events` |
| **List events** | ✅ `events.list` with time range filters | ✅ `GET /me/calendarView` or `/me/events` |
| **Update event** | ✅ `events.update` / `events.patch` | ✅ `PATCH /me/events/{id}` |
| **Delete event** | ✅ `events.delete` | ✅ `DELETE /me/events/{id}` |
| **Free/busy** | ✅ `freebusy.query` | ✅ `POST /me/calendar/getSchedule` |
| **Recurring events** | ✅ RRULE-based recurrence | ✅ `recurrence` pattern object |
| **Attendees/RSVP** | ✅ Attendee management, response status | ✅ Attendee tracking, response status |
| **Multiple calendars** | ✅ `calendarList` resource | ✅ `GET /me/calendars` |
| **Reminders** | ✅ Email + popup reminders | ✅ Reminders with `isReminderOn` |
| **Attachments** | ✅ Events can have file attachments | ✅ Up to 25MB per event attachment |
| **Push notifications** | ✅ Webhook via `events.watch` | ✅ Change notifications (subscriptions) |
| **Sync (delta)** | ✅ `syncToken` on events.list | ✅ Delta queries (`/me/events/delta`) |
| **Time zones** | ✅ Full IANA timezone support | ✅ Full timezone support |
| **Shared calendars** | ✅ ACL management | ✅ Calendar sharing + delegate access |
| **Room/resource booking** | ✅ Via domain resource calendars | ✅ `findRooms`, `findMeetingTimes` |
| **Meeting finder** | ❌ Not built-in | ✅ `findMeetingTimes` (AI-assisted) |

---

## 2. OAuth Requirements & Scopes

### 2.1 Gmail API

| Aspect | Details |
|---|---|
| **OAuth Provider** | Google Identity Platform |
| **Auth Flow** | OAuth 2.0 Authorization Code (with PKCE for SPAs) |
| **Token Endpoint** | `https://oauth2.googleapis.com/token` |
| **Consent Screen** | Google OAuth consent screen (requires Google Cloud project) |
| **Verification** | Required for sensitive/restricted scopes (Google review process, 4-6 weeks) |

**Recommended Scopes for Smart Agent:**

| Scope | Type | Purpose |
|---|---|---|
| `gmail.readonly` | Restricted | Read emails, search, list threads |
| `gmail.send` | Sensitive | Send emails on behalf of user |
| `gmail.compose` | Restricted | Create/edit drafts |
| `gmail.modify` | Restricted | Full read/write (labels, archive, etc.) |

**Current Smart Agent Implementation:** Uses `gmail.readonly` + `gmail.send` + `gmail.compose` (inferred from connector).

**Google Verification Note:** Apps requesting restricted Gmail scopes must undergo Google's security assessment. This includes a third-party security audit (CASA Tier 2) costing ~$15,000-$75,000. Sensitive scopes require a simpler verification but still need privacy policy and domain verification.

### 2.2 Microsoft Graph (Outlook Mail)

| Aspect | Details |
|---|---|
| **OAuth Provider** | Microsoft Identity Platform (Entra ID) |
| **Auth Flow** | OAuth 2.0 Authorization Code (with PKCE) |
| **Token Endpoint** | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |
| **App Registration** | Azure Portal → App registrations |
| **Admin Consent** | Required for some application-level permissions |

**Recommended Scopes for Smart Agent (Delegated):**

| Scope | Type | Purpose |
|---|---|---|
| `Mail.Read` | Delegated | Read user's email |
| `Mail.Send` | Delegated | Send email as user |
| `Mail.ReadWrite` | Delegated | Full email CRUD (drafts, move, etc.) |
| `MailboxSettings.Read` | Delegated | Read mailbox settings (timezone, auto-reply) |
| `offline_access` | Delegated | Get refresh token for long-lived access |

### 2.3 Google Calendar API v3

| Aspect | Details |
|---|---|
| **OAuth Provider** | Google Identity Platform (same project as Gmail) |
| **Auth Flow** | OAuth 2.0 Authorization Code (with PKCE) |
| **Token Sharing** | Shares token with Gmail if both scopes requested together |

**Recommended Scopes for Smart Agent:**

| Scope | Type | Purpose |
|---|---|---|
| `calendar.events` | Sensitive | Read/write events on all calendars |
| `calendar.events.readonly` | Sensitive | Read-only event access |
| `calendar.readonly` | Sensitive | Read calendar list + events |
| `calendar.freebusy` | Non-sensitive | Check free/busy only |

**Current Smart Agent Implementation:** Uses `calendar.events` (full read/write) and `calendar.freebusy`.

**Advantage:** Gmail + Calendar share the same Google OAuth project and can be consented in a single flow.

### 2.4 Microsoft Graph (Outlook Calendar)

| Aspect | Details |
|---|---|
| **OAuth Provider** | Microsoft Identity Platform (same registration as Mail) |
| **Token Sharing** | Shares token with Outlook Mail scopes |

**Recommended Scopes for Smart Agent (Delegated):**

| Scope | Type | Purpose |
|---|---|---|
| `Calendars.Read` | Delegated | Read calendar events |
| `Calendars.ReadWrite` | Delegated | Full calendar CRUD |
| `Calendars.Read.Shared` | Delegated | Read shared/delegated calendars |
| `offline_access` | Delegated | Refresh token |

**Advantage:** Outlook Mail + Calendar share a single Microsoft registration and auth flow.

---

## 3. Rate Limits & Quotas

### 3.1 Gmail API

| Limit | Value | Notes |
|---|---|---|
| **Per-project rate** | 1,200,000 quota units/min | Shared across all users |
| **Per-user rate** | 15,000 quota units/min | Per authenticated user |
| **Daily sending limit (free)** | 500 emails/day | Per Gmail account |
| **Daily sending limit (Workspace)** | 2,000 emails/day | Per Workspace account |
| **messages.send** | 100 quota units/call | Most expensive operation |
| **messages.get** | 5 quota units/call | Lightweight read |
| **messages.list** | 5 quota units/call | Lightweight list |
| **drafts.create** | 10 quota units/call | Draft creation |
| **users.watch** | 100 quota units/call | Push notification setup |

**Analysis for Smart Agent:** At 1,000 users, worst case = 1,000 × 15,000 = 15M quota units/min available. For typical CRM usage (50 reads + 5 sends per user/day), daily consumption is ~275,000 quota units — well within limits.

### 3.2 Microsoft Graph (Outlook Mail)

| Limit | Value | Notes |
|---|---|---|
| **Global app limit** | 130,000 requests/10 sec | Across all tenants |
| **Per-mailbox limit** | 10,000 requests/10 min | Per user mailbox |
| **Send limit** | 30 messages/min per user | Throttled for bulk sends |
| **Recipient limit** | 500 recipients/message | Per message |
| **Daily send limit** | 10,000 recipients/day | Per mailbox |
| **Throttle response** | HTTP 429 + `Retry-After` header | Exponential backoff required |

**Analysis for Smart Agent:** Microsoft's per-mailbox limit of 10,000/10min is generous for CRM usage. The 30 messages/min send limit is adequate for individual agent email (not bulk marketing).

### 3.3 Google Calendar API v3

| Limit | Value | Notes |
|---|---|---|
| **Daily quota** | 1,000,000 queries/day (default) | Per project |
| **Per-user rate** | ~500 queries/100 sec | Per user per project |
| **Push notification channels** | No explicit limit | Renewal required |
| **Event insert** | Standard quota unit | Creates consume more |
| **Event list** | Standard quota unit | Reads are cheap |
| **FreeBusy query** | Standard quota unit | Availability check |

**Analysis for Smart Agent:** At 1,000 users × 20 calendar operations/day = 20,000 queries/day — 2% of the default daily quota.

### 3.4 Microsoft Graph (Outlook Calendar)

| Limit | Value | Notes |
|---|---|---|
| **Global app limit** | 130,000 requests/10 sec | Shared with Mail |
| **Per-mailbox limit** | 10,000 requests/10 min | Shared with Mail quota |
| **Subscription limit** | 10,000 subscriptions/app | For change notifications |
| **Subscription max lifetime** | 4,230 min (~3 days) | Must renew regularly |
| **findMeetingTimes** | Lower throttle threshold | Complex computation |

**Analysis for Smart Agent:** Calendar and Mail share the same per-mailbox quota. Combined usage is still well within limits for CRM-scale operations.

---

## 4. Pricing & Free Tier Limits

### 4.1 Google APIs (Gmail + Calendar)

| Item | Cost |
|---|---|
| **Gmail API usage** | **Free** (no per-call charges) |
| **Google Calendar API usage** | **Free** (no per-call charges) |
| **Google Cloud project** | **Free** (required for OAuth credentials) |
| **Cloud Pub/Sub (for Gmail push)** | $0.04/100K messages (first 10GB/mo free) |
| **OAuth consent screen verification** | Free for sensitive scopes; $15K-$75K security audit for restricted scopes (one-time) |
| **Quota increase** | Free (request via Cloud Console) |

**Total ongoing cost:** Effectively **$0/month** for typical CRM usage. Pub/Sub costs are negligible at scale.

### 4.2 Microsoft Graph APIs (Outlook Mail + Calendar)

| Item | Cost |
|---|---|
| **Microsoft Graph API usage** | **Free** (no per-call charges) |
| **Azure App Registration** | **Free** (part of Azure Free Tier) |
| **Microsoft 365 Developer Program** | **Free** (25 E5 licenses for development) |
| **Change notifications** | **Free** (webhook-based) |
| **Azure subscription** | Free tier sufficient for app registration |

**Total ongoing cost:** Effectively **$0/month** for API usage. No per-call charges. Users must have their own Microsoft 365 / Outlook accounts.

### 4.3 Cost Comparison Summary

| Provider | API Cost | Push/Webhook Cost | Auth Setup Cost | Ongoing Cost |
|---|---|---|---|---|
| **Google (Gmail + Calendar)** | Free | ~$0 (Pub/Sub free tier) | $0-$75K one-time (security audit) | ~$0/mo |
| **Microsoft (Mail + Calendar)** | Free | Free | $0 | $0/mo |

**Note:** The Google security audit cost only applies if requesting restricted Gmail scopes (read access). For send-only scopes (sensitive), verification is simpler and free.

---

## 5. Real-Time & Sync Capabilities

### 5.1 Push Notification Architecture

| Feature | Google (Gmail + Calendar) | Microsoft Graph |
|---|---|---|
| **Delivery method** | Cloud Pub/Sub (Gmail), HTTPS webhooks (Calendar) | HTTPS webhooks |
| **Notification content** | Minimal (resource changed signal) | Configurable (with or without resource data) |
| **Subscription renewal** | 7 days (Gmail watch), configurable (Calendar) | Max 3 days (calendar), varies by resource |
| **Fan-out** | Pub/Sub handles fan-out natively | Direct webhook per subscription |
| **Rich notifications** | ❌ Must fetch changed data separately | ✅ Can include resource data in notification |
| **Lifecycle events** | ❌ Manual renewal | ✅ `subscriptionRemoved` / `missed` signals |
| **Infrastructure** | Requires Pub/Sub topic + subscription | Only requires HTTPS endpoint |

### 5.2 Incremental Sync (Delta)

| Feature | Google | Microsoft |
|---|---|---|
| **Email sync** | `history.list` with `historyId` | Delta queries (`/messages/delta`) with `deltaLink` |
| **Calendar sync** | `syncToken` on `events.list` | Delta queries (`/events/delta`) with `deltaLink` |
| **Granularity** | Per-change history entries | Per-resource delta with tracking |
| **Conflict handling** | Last-write-wins | ETags for optimistic concurrency |

### 5.3 Recommendation for Smart Agent

For real-time sync in Smart Agent, the recommended architecture is:

1. **Initial sync:** Full fetch on connector activation
2. **Incremental sync:** Delta queries on a 5-minute polling interval (simple, reliable)
3. **Push notifications:** Layer on top for near-real-time updates (reduces polling frequency)
4. **Conflict resolution:** Last-write-wins with user notification on conflicts

---

## 6. Smart Agent Current State Assessment

### 6.1 Existing Connectors (Phase 2)

| Connector | File | Status | Actions Supported |
|---|---|---|---|
| **Gmail** | `supabase/functions/_shared/connectors/gmail-connector.ts` | ✅ Built | send, read, search, drafts, thread, message |
| **Google Calendar** | `supabase/functions/_shared/connectors/google-calendar-connector.ts` | ✅ Built | create, list, update, delete events, availability |

### 6.2 Architecture Strengths

- **`BaseConnector` abstraction** — Clean interface for adding new connectors
- **`ConnectorRegistry`** — Central registration for connector lookup
- **OAuth flow** — Refresh token handling already implemented for Google
- **Credential management** — `ConnectorCredentials` type supports encrypted storage
- **Rate limiting** — `RateLimitInfo` type defined in connector-types
- **Error hierarchy** — `ConnectorError` → `ConnectorAuthError` / `ConnectorRateLimitError`

### 6.3 Gaps for Deeper Integration

| Gap | Description | Priority |
|---|---|---|
| **No push/webhook support** | Connectors are request-response only; no real-time sync | P1 |
| **No delta sync** | No incremental sync; full-fetch on each action | P1 |
| **No Microsoft connectors** | Outlook/Microsoft Calendar not implemented | P1 |
| **No contact sync** | Gmail contacts not synced to Smart Agent CRM | P2 |
| **No attachment handling** | Email attachments not extracted to document system | P2 |
| **No email templates** | Can send plain text only; no HTML template support | P2 |
| **No bulk operations** | No batch API usage for efficiency | P3 |

---

## 7. Recommended Implementation Approach

### 7.1 Phase 3A: Enhance Google Connectors (Weeks 1-3)

**Rationale:** Existing connectors are functional but lack sync and real-time features. Enhance before adding new providers.

| Task | Description | Effort |
|---|---|---|
| Gmail push notifications | Add `users.watch` + Pub/Sub webhook handler | M |
| Gmail delta sync | Implement `history.list`-based incremental sync | M |
| Calendar push notifications | Add `events.watch` webhook handler | S |
| Calendar delta sync | Implement `syncToken`-based incremental sync | S |
| HTML email support | Support HTML body in send/draft operations | S |
| Email attachment handling | Extract attachments → document intelligence pipeline | M |

### 7.2 Phase 3B: Add Microsoft Graph Connectors (Weeks 3-6)

**Rationale:** ~30% of real estate professionals use Outlook. Same `BaseConnector` pattern makes this straightforward.

| Task | Description | Effort |
|---|---|---|
| Microsoft OAuth flow | Add Microsoft Identity Platform auth | M |
| Outlook Mail connector | Implement `OutlookMailConnector` (send, read, search, drafts) | M |
| Outlook Calendar connector | Implement `OutlookCalendarConnector` (CRUD, availability) | M |
| Microsoft change notifications | Add webhook subscriptions for mail + calendar | M |
| Microsoft delta sync | Implement delta queries for incremental sync | S |

### 7.3 Phase 3C: Unified Communication Layer (Weeks 6-8)

**Rationale:** Abstract over providers for a seamless user experience regardless of email/calendar provider.

| Task | Description | Effort |
|---|---|---|
| Unified inbox UI | Single view for Gmail + Outlook emails | L |
| Unified calendar view | Single calendar merging Google + Microsoft events | M |
| Cross-provider search | Search across all connected email accounts | M |
| Sync status dashboard | Show sync health, last sync time, errors | S |

### 7.4 Estimated Total Effort

| Phase | Effort | Duration | Dependencies |
|---|---|---|---|
| **3A: Enhance Google** | ~3 weeks | Weeks 1-3 | Pub/Sub infrastructure |
| **3B: Add Microsoft** | ~3 weeks | Weeks 3-6 | Azure app registration |
| **3C: Unified Layer** | ~2 weeks | Weeks 6-8 | 3A + 3B complete |
| **Total** | ~8 weeks | 2 months | — |

---

## 8. Priority Ranking

Based on user impact, market coverage, effort, and architectural readiness:

| Rank | API | Rationale | Priority |
|---|---|---|---|
| **1** | Gmail API (enhance) | Already built; push + sync = 10x more useful | P0 |
| **2** | Google Calendar API (enhance) | Already built; push + sync enables scheduling features | P0 |
| **3** | Microsoft Graph — Outlook Mail | Captures ~30% of market; same BaseConnector pattern | P1 |
| **4** | Microsoft Graph — Outlook Calendar | Follows Outlook Mail; shares auth + connector | P1 |

### Priority Justification

1. **Gmail enhancement is highest priority** because:
   - Connector already exists (low incremental effort)
   - Push notifications prevent polling overhead
   - Delta sync enables unified inbox feature (REC-022)
   - Email is the #1 communication channel for real estate agents
   
2. **Google Calendar enhancement is tied-first** because:
   - Connector already exists
   - Push notifications enable real-time schedule awareness
   - Supports deal milestone ↔ calendar integration (REC-018)
   - Availability check enables smart scheduling

3. **Microsoft Outlook Mail is next** because:
   - ~30% market share among real estate professionals
   - Existing `BaseConnector` pattern reduces effort to ~3 weeks
   - Microsoft Graph provides Mail + Calendar in one integration
   - Enterprise/brokerage market skews toward Microsoft 365

4. **Microsoft Outlook Calendar follows naturally** because:
   - Shares Microsoft Graph auth and registration
   - Same `BaseConnector` pattern
   - Marginal additional effort once Outlook Mail is built

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Google restricted scope verification delay | Blocks Gmail read features | Medium | Start verification process immediately; use sensitive scopes first |
| Microsoft admin consent requirement | Blocks enterprise M365 orgs | Medium | Provide admin consent documentation; support multi-tenant auth |
| Webhook endpoint reliability | Missed notifications | Low | Implement fallback polling; use Pub/Sub dead letter queues |
| Rate limit hitting at scale | Degraded service | Low | Implement per-user request budgets; use batch APIs |
| Token refresh failures | Disconnected connectors | Medium | Proactive refresh (before expiry); user notification of disconnects |

---

## 10. Recommendations Summary

From this research, PM-Research proposes the following recommendations:

| ID | Recommendation | Priority | Owner |
|---|---|---|---|
| **REC-027** | Enhance Gmail connector with push notifications and delta sync | P0 | PM-Integration |
| **REC-028** | Enhance Google Calendar connector with push notifications and sync tokens | P0 | PM-Integration |
| **REC-029** | Build Microsoft Graph Outlook Mail connector | P1 | PM-Integration |
| **REC-030** | Build Microsoft Graph Outlook Calendar connector | P1 | PM-Integration |
| **REC-031** | Implement unified communication layer (cross-provider inbox + calendar) | P1 | PM-Integration + PM-Communication |
| **REC-032** | Start Google OAuth restricted scope verification process | P0 | PM-Infrastructure |

---

## Appendix A: API Endpoint Quick Reference

### Gmail API Base
```
https://gmail.googleapis.com/gmail/v1/users/{userId}/
```

### Google Calendar API Base
```
https://www.googleapis.com/calendar/v3/
```

### Microsoft Graph Base
```
https://graph.microsoft.com/v1.0/me/
```

### Key Endpoints

| Operation | Gmail | Google Calendar | Outlook Mail | Outlook Calendar |
|---|---|---|---|---|
| List | `/messages` | `/calendars/{id}/events` | `/messages` | `/events` or `/calendarView` |
| Read | `/messages/{id}` | `/events/{id}` | `/messages/{id}` | `/events/{id}` |
| Create | `/messages/send` | `/calendars/{id}/events` | `/sendMail` | `/events` |
| Update | `/messages/{id}/modify` | `/events/{id}` | `/messages/{id}` | `/events/{id}` |
| Delete | `/messages/{id}/trash` | `/events/{id}` | `/messages/{id}` | `/events/{id}` |
| Search | `/messages?q=` | `/events?q=` | `/messages?$search=` | `/events?$filter=` |
| Watch | `/watch` (Pub/Sub) | `/{calendarId}/events/watch` | POST `/subscriptions` | POST `/subscriptions` |
| Delta | `/history` | `/events?syncToken=` | `/messages/delta` | `/events/delta` |

---

## Appendix B: OAuth Flow Comparison

### Google OAuth 2.0 Flow
```
1. User clicks "Connect Gmail" / "Connect Calendar"
2. Redirect → https://accounts.google.com/o/oauth2/v2/auth
   ?scope=gmail.readonly+gmail.send+calendar.events
   &redirect_uri=...
   &response_type=code
   &client_id=...
   &access_type=offline
   &prompt=consent
3. User grants consent
4. Callback with authorization code
5. Exchange code → access_token + refresh_token
6. Store encrypted credentials in connector_credentials table
7. Refresh before expiry (tokens last ~1 hour)
```

### Microsoft OAuth 2.0 Flow
```
1. User clicks "Connect Outlook" / "Connect Microsoft Calendar"
2. Redirect → https://login.microsoftonline.com/common/oauth2/v2.0/authorize
   ?scope=Mail.Read+Mail.Send+Calendars.ReadWrite+offline_access
   &redirect_uri=...
   &response_type=code
   &client_id=...
3. User grants consent (may require admin consent for org accounts)
4. Callback with authorization code
5. Exchange code → access_token + refresh_token
6. Store encrypted credentials in connector_credentials table
7. Refresh before expiry (tokens last ~1 hour)
```

**Key Difference:** Microsoft supports `common` tenant for multi-org auth. Google uses a single project-level OAuth screen.

---

*Report generated by PM-Research, Dev Cycle #9, 2026-02-07*
