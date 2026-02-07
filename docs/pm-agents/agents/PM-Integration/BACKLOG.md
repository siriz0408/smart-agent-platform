# PM-Integration Backlog

> **Last Updated:** 2026-02-07

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| - | None | - | - |

## Ready

| ID | Item | Priority | Effort | Notes |
|----|------|----------|--------|-------|
| INT-005 | Create API docs | P2 | M | Blocked until public API exists |
| INT-009 | Add integration usage analytics | P2 | S | Track adoption metrics |
| INT-011 | Design public API v1 | P2 | L | Enable external developers |
| INT-013 | Add Microsoft Outlook calendar connector | P3 | L | Expand calendar integration to Office 365 users |
| INT-014 | Add Zoom meeting connector | P3 | M | Auto-create Zoom meetings from calendar events |

## Completed

| ID | Item | Completed |
|----|------|-----------|
| INT-000 | PM-Integration setup | 2026-02-05 |
| INT-001 | Initial domain audit | 2026-02-06 |
| INT-002 | Inventory current integrations | 2026-02-06 |
| INT-003 | Research MLS options | 2026-02-06 | ✅ RES-003 complete - Bridge Interactive recommended |
| INT-006 | Design connector framework | 2026-02-06 | ✅ Architecture complete, ready for implementation |
| INT-007 | Implement Gmail connector | 2026-02-06 | ✅ Database migration + OAuth callback handler complete |
| INT-008 | Build integration management UI | 2026-02-06 | ✅ OAuth connection flow implemented - users can connect/disconnect integrations |
| INT-010 | Implement Google Calendar connector | 2026-02-07 | ✅ Full connector with 5 actions: create_event, list_events, update_event, delete_event, get_availability (FreeBusy API). Migration to activate + updated OAuth scopes |
| INT-012 | Implement Bridge Interactive MLS connector | 2026-02-06 | ✅ Connector class implemented with RESO Web API support - search_listings, get_listing_details, get_listing_photos, sync_listings actions |
| INT-004 | Plan email sync | 2026-02-07 | ✅ Comprehensive implementation plan created. 4-phase approach: Gmail read-only sync (MVP), Gmail write ops, Outlook support, advanced features. Database schema, edge functions, UI components, and testing strategy defined. Report: `docs/pm-agents/reports/2026-02-07/pm-integration-int004-email-sync-plan.md` |