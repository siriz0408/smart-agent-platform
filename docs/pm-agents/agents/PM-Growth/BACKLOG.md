# PM-Growth Backlog

> **Last Updated:** 2026-02-06 (Cycle 8)

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| GRW-002 | Pull current MRR metrics | P0 | 🔴 Blocked - No aggregation system |
| GRW-003 | Analyze conversion funnel | P0 | 🔴 Blocked - No funnel tool |

## Ready

| ID | Item | Priority | Effort | Notes |
|----|------|----------|--------|-------|
| GRW-004 | Check churn rate | P1 | S | Blocked - No churn tracking |
| GRW-012 | Add onboarding A/B testing | P3 | M | Test different step orders, messaging variants |
| GRW-013 | Add workspace setup step to onboarding | P3 | M | Team name, invite colleagues during onboarding |
| GRW-014 | Onboarding analytics dashboard | P3 | M | Track step completion rates, drop-off points, time-to-value |

## Completed

| ID | Item | Completed |
|----|------|-----------|
| GRW-000 | PM-Growth setup | 2026-02-05 |
| GRW-001 | Initial domain audit | 2026-02-06 |
| GRW-005 | Optimize onboarding experience | 2026-02-06 |
| GRW-006 | Complete workspace billing migration | 2026-02-06 |
| GRW-007 | Implement trial signup flow | 2026-02-06 |
| GRW-008 | Add usage limit enforcement | 2026-02-06 |
| GRW-009 | Build growth metrics dashboard | 2026-02-06 |
| GRW-010 | Implement conversion funnel analysis | 2026-02-06 |
| GRW-011 | Build churn prevention system | 2026-02-07 | ✅ Database schema (user_activity_log, churn_risk_assessments, retention_email_queue), churn risk scoring function (assess_churn_risk RPC), batch assessment function (assess_all_users_churn_risk), edge function (assess-churn-risk). Risk scoring based on login recency, feature usage, subscription health, onboarding completion, engagement trends. Risk levels: low/medium/high/critical (0-100 score) |