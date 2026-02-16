# PM-Growth Backlog

> **Last Updated:** 2026-02-15 (Cycle 13)

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| *(none)* | | | |

## Ready

| ID | Item | Priority | Effort | Notes |
|----|------|----------|--------|-------|
| GRW-013 | Add workspace setup step to onboarding | P3 | M | Team name, invite colleagues during onboarding |
| GRW-014 | Onboarding analytics dashboard | P3 | M | Track step completion rates, drop-off points, time-to-value |
| GRW-015 | Add revenue forecasting | P2 | L | Predict MRR based on trial conversion rates and historical trends |
| GRW-016 | Implement cohort analysis | P2 | M | Track subscription cohorts by signup month |
| GRW-017 | Add more experiment variants | P3 | S | Add pricing page A/B tests, feature discovery experiments |

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| GRW-000 | PM-Growth setup | 2026-02-05 | |
| GRW-001 | Initial domain audit | 2026-02-06 | |
| GRW-005 | Optimize onboarding experience | 2026-02-06 | |
| GRW-006-old | Complete workspace billing migration | 2026-02-06 | |
| GRW-007 | Implement trial signup flow | 2026-02-06 | |
| GRW-008 | Add usage limit enforcement | 2026-02-06 | |
| GRW-009 | Build growth metrics dashboard | 2026-02-06 | |
| GRW-010 | Implement conversion funnel analysis | 2026-02-06 | |
| GRW-011 | Build churn prevention system | 2026-02-07 | Database schema (user_activity_log, churn_risk_assessments, retention_email_queue), churn risk scoring function (assess_churn_risk RPC), batch assessment function (assess_all_users_churn_risk), edge function (assess-churn-risk). Risk scoring based on login recency, feature usage, subscription health, onboarding completion, engagement trends. Risk levels: low/medium/high/critical (0-100 score) |
| GRW-004 | Check churn rate | 2026-02-07 | Implemented comprehensive churn metrics system: useChurnMetrics hook (churn rate, active users, risk distribution, subscription health), useAtRiskUsers hook (filter by risk level), GrowthMetricsDashboard component (admin-only tab in Settings), displays churn rate, 7d/30d active users, at-risk count, avg activity days, risk distribution charts, subscription health breakdown, high-risk user list with details |
| GRW-002 | Pull current MRR metrics | 2026-02-15 | **UNBLOCKED by INF-017!** Implemented useMRRSummary hook that calculates real-time MRR from subscriptions |
| GRW-003 | Analyze conversion funnel | 2026-02-15 | Implemented useSubscriptionEvents hook to track subscription lifecycle events (new, upgrade, downgrade, churn, reactivation) |
| GRW-006 | MRR Metrics Dashboard | 2026-02-15 | **P0 COMPLETE!** Comprehensive MRR dashboard with: (1) Database migration for mrr_snapshots table and subscription_events tracking, (2) useMRRMetrics.ts hook with useMRRSummary, useMRRHistory, useMRRBreakdown, useSubscriptionEvents, (3) MRRDashboard.tsx component with MRR/ARR cards, ARPU, growth targets, MRR breakdown (new/expansion/contraction/churn), plan distribution visualization, MRR trend history, subscription activity feed, PM-Growth targets tracker. Integrated into Settings > Growth tab and dedicated /growth-metrics page. Files: `supabase/migrations/20260215130000_grw006_mrr_metrics_infrastructure.sql`, `src/hooks/useMRRMetrics.ts`, `src/components/growth/MRRDashboard.tsx` |
| GRW-012 | Add onboarding A/B testing | 2026-02-15 | **COMPLETE!** Full A/B testing framework: (1) Database migration with `experiments`, `experiment_assignments`, `experiment_conversions` tables plus RLS policies and RPC functions (`get_or_assign_experiment_variant`, `record_experiment_conversion`, `get_experiment_results`), (2) `useOnboardingExperiment.ts` hook for variant assignment and conversion tracking, (3) `ABTestingDashboard.tsx` admin UI with experiment list, variant performance metrics, statistical significance calculation, traffic controls, (4) Updated `useOnboarding.ts` with variant-aware step order, (5) New step components `WelcomeCombinedStep.tsx` (streamlined variant) and `FirstActionStep.tsx` (guided variant), (6) Updated `OnboardingWizard.tsx` to support all variants. Three variants: Control (standard 4-step), Streamlined (2-step combined), Guided (5-step with first action prompt). Files: `supabase/migrations/20260215150000_grw012_onboarding_ab_testing.sql`, `src/hooks/useOnboardingExperiment.ts`, `src/components/growth/ABTestingDashboard.tsx`, `src/components/onboarding/steps/WelcomeCombinedStep.tsx`, `src/components/onboarding/steps/FirstActionStep.tsx` |
