# PM-Security Backlog

> **Last Updated:** 2026-02-07 (Cycle 9)

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| SEC-012 | Migrate session storage to sessionStorage | P0 | Handoff to PM-Experience |
| SEC-013 | Fix tenant isolation in action executors | P0 | Handoff to PM-Intelligence |

## Ready

| ID | Item | Priority | Effort | Owner |
|----|------|----------|--------|-------|
| SEC-016 | Sanitize error messages | P1 | M | PM-Infrastructure |
| SEC-017 | Create missing RLS policies | P2 | M | PM-Context |
| SEC-018 | Standardize admin check implementation | P2 | S | PM-Context |
| SEC-019 | Add explicit tenant_id filters to frontend | P2 | L | PM-Experience |
| SEC-006 | Set up security monitoring | P2 | M | PM-Security |

## Completed

| ID | Item | Completed |
|----|------|-----------|
| SEC-000 | PM-Security setup | 2026-02-05 |
| SEC-001 | Initial domain audit | 2026-02-06 |
| SEC-002 | Audit RLS policies | 2026-02-06 |
| SEC-003 | Check auth flows | 2026-02-06 |
| SEC-011 | Enable JWT verification in edge functions | 2026-02-06 |
| SEC-004 | Scan for exposed secrets | 2026-02-06 |
| SEC-012 | Migrate session storage to sessionStorage | 2026-02-06 |
| SEC-005 | Review GDPR compliance | 2026-02-06 |
| SEC-015 | Restrict CORS to specific origins (38 edge functions migrated) | 2026-02-06 |
| SEC-014 | Fix overly permissive RLS policies (9 tables: email_campaign_recipients, email_send_history, email_campaign_steps, production_metrics, search_metrics, ai_chat_metrics, zero_results_log, notifications, usage_records_archive) | 2026-02-07 |