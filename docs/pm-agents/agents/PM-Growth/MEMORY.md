# PM-Growth Memory

> **Last Updated:** 2026-02-15 (Cycle 13)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Subscription Pattern:**
- Workspace-based subscriptions (not tenant-based)
- Stripe integration for payments
- Usage tracking for AI limits
- Plan tiers: Free, Starter, Professional, Team, Brokerage
- Plan prices: $0, $29, $79, $199, $499

**MRR Infrastructure Pattern (GRW-006):**
- `mrr_snapshots` table for historical MRR tracking
- `subscription_events` table for lifecycle event logging
- Trigger-based event capture on subscription changes
- RPC functions for MRR calculations: `calculate_current_mrr`, `snapshot_daily_mrr`, `get_mrr_history`, `get_mrr_summary`
- MRR breakdown components: New, Expansion, Contraction, Churn, Reactivation

**A/B Testing Pattern (GRW-012):**
- `experiments` table for test definitions with variants as JSONB
- `experiment_assignments` table for user variant assignments (unique per user per experiment)
- `experiment_conversions` table for goal tracking (supports primary and secondary conversions)
- RPC functions: `get_or_assign_experiment_variant`, `record_experiment_conversion`, `get_experiment_results`
- Weighted random variant selection with traffic allocation control
- Statistical significance calculation using z-test approximation

**Onboarding Pattern:**
- Activation checklist with 5 milestones
- Real data queries (not mock data)
- Progress tracking
- Role selection and persistence
- A/B testing support with dynamic step order based on variant
- Three variants: Control (standard), Streamlined (combined), Guided (with first action)

**Metrics Pattern:**
- MRR aggregation now available via `useMRRSummary` hook
- Conversion funnel tracking via `useSubscriptionEvents`
- Churn analytics via `useChurnMetrics`
- A/B test results via `useExperimentResults` hook
- Usage analytics (partial)

### Common Issues & Solutions

**Issue:** MRR metrics previously blocked
- **Blocker:** No metrics infrastructure existed
- **Solution:** PM-Infrastructure delivered INF-017, then GRW-006 built on that
- **Pattern:** Cross-PM dependencies resolved through backlog coordination

**Issue:** Subscription event tracking
- **Solution:** Database trigger `tr_log_subscription_event` automatically logs all subscription changes
- **Pattern:** Use triggers for consistent event capture

**Issue:** Onboarding role not persisting
- **Solution:** Fixed role persistence bug
- **Pattern:** Test data persistence in onboarding flows

### Domain-Specific Knowledge

**Pricing Tiers:**
- Free: $0 (limited features)
- Starter: $29/month (basic features)
- Professional: $79/month (full features)
- Team: $199/month (team features)
- Brokerage: $499/month (enterprise features)

**MRR Metrics:**
- MRR = Sum of active paid subscription prices
- ARR = MRR * 12
- ARPU = MRR / paying_users
- Net New MRR = New + Expansion + Reactivation - Contraction - Churned
- Growth Rate = (Current MRR - Previous MRR) / Previous MRR * 100

**Usage Limits:**
- AI messages per month (varies by plan)
- Document storage (varies by plan)
- Workspace members (varies by plan)
- API access (enterprise only)

**Onboarding Milestones:**
1. Profile complete
2. Document uploaded
3. Contact added
4. AI chat used
5. Deal created

### Cross-PM Coordination Patterns

**With PM-Infrastructure:**
- INF-017 unblocked GRW-006 (metrics infrastructure)
- Deployment verification
- Cost tracking
- Pattern: Infrastructure PMs unblock feature PMs

**With PM-Experience:**
- Onboarding UI components
- Subscription plan UI
- Billing page
- Growth dashboard UI

**With PM-Security:**
- Payment security
- Subscription access control
- Usage limit enforcement

---

## Recent Work Context

### Last Cycle (Cycle 13)
- **Worked on:** GRW-012 - Onboarding A/B Testing
- **Completed:** Full A/B testing framework with experiment management and conversion tracking
- **Key Files Created:**
  - `supabase/migrations/20260215150000_grw012_onboarding_ab_testing.sql`
  - `src/hooks/useOnboardingExperiment.ts`
  - `src/components/growth/ABTestingDashboard.tsx`
  - `src/components/onboarding/steps/WelcomeCombinedStep.tsx`
  - `src/components/onboarding/steps/FirstActionStep.tsx`
- **Key Files Modified:**
  - `src/hooks/useOnboarding.ts` (variant-aware step order)
  - `src/components/onboarding/OnboardingWizard.tsx` (support for all variants)
  - `src/pages/Settings.tsx` (added A/B Testing tab)
  - `src/components/growth/index.ts` (export ABTestingDashboard)

### Previous Cycles

**Cycle 12:**
- Completed GRW-006 MRR Metrics Dashboard
- Unblocked by PM-Infrastructure (INF-017)

**Cycle 11:**
- Blocked on GRW-006 waiting for INF-017
- Worked on GRW-012 (A/B testing framework design)

**Cycle 9:**
- Implemented churn metrics system (GRW-004, GRW-011)
- Created GrowthMetricsDashboard component

**Cycle 8:**
- Optimized onboarding experience
- Created activation checklist
- Fixed role persistence bug

**Cycle 7:**
- Established subscription patterns
- Created billing infrastructure

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for UI improvements
- Coordinating with PM-Infrastructure on metrics
- Testing with real subscription data
- Database triggers for event capture (consistent, reliable)
- RPC functions for complex calculations (security, reusability)

**Avoids:**
- Hardcoding pricing tiers (use PLAN_PRICES constant)
- Skipping usage limit checks
- Mocking metrics data
- Direct table queries when RPC functions exist

**Works well with:**
- PM-Infrastructure (metrics, infrastructure)
- PM-Experience (onboarding UI, dashboard UI)
- PM-Security (payment security, access control)

---

## Technical Notes

### MRR Dashboard Architecture

```
User -> Settings/Growth Tab -> MRRDashboard component
                                    |
                                    v
                            useMRRSummary hook
                                    |
                                    v
                    supabase.rpc('get_mrr_summary')
                                    |
                                    v
                        mrr_snapshots table
                                    ^
                                    |
            supabase.rpc('snapshot_daily_mrr') <- Cron job
                                    ^
                                    |
                        subscriptions table <- Stripe webhook
```

### Key Database Objects (GRW-006)

**Tables:**
- `mrr_snapshots` - Daily MRR snapshots with plan distribution
- `subscription_events` - Subscription lifecycle events

**Functions:**
- `calculate_current_mrr(workspace_id)` - Real-time MRR calculation
- `snapshot_daily_mrr(date)` - Create daily snapshot (cron)
- `get_mrr_history(workspace_id, days)` - Historical MRR data
- `get_mrr_summary(workspace_id)` - Dashboard summary data
- `log_subscription_event()` - Trigger function for event capture

**Triggers:**
- `tr_log_subscription_event` - ON INSERT/UPDATE on subscriptions

### A/B Testing Architecture (GRW-012)

```
User Signup -> OnboardingWizard
                    |
                    v
            useOnboardingExperiment hook
                    |
                    v
        supabase.rpc('get_or_assign_experiment_variant')
                    |
                    v
            experiments table (check if running)
                    |
                    v
        experiment_assignments table (check/create)
                    |
                    v
            Return variant config -> Dynamic step order
                    |
                    v
            User completes onboarding
                    |
                    v
        supabase.rpc('record_experiment_conversion')
                    |
                    v
            experiment_conversions table
                    |
                    v
        Admin -> ABTestingDashboard
                    |
                    v
        supabase.rpc('get_experiment_results')
                    |
                    v
            Conversion rates + statistical significance
```

### Key Database Objects (GRW-012)

**Tables:**
- `experiments` - Experiment definitions with variants JSONB, status, traffic allocation
- `experiment_assignments` - User-to-variant mapping (unique per experiment)
- `experiment_conversions` - Goal completions with metadata

**Functions:**
- `get_or_assign_experiment_variant(name, user_id)` - Get or create assignment with weighted random
- `record_experiment_conversion(name, user_id, type, metadata)` - Record goal completion
- `get_experiment_results(name)` - Aggregate results per variant

**Onboarding Variants:**
- `control` (standard): welcome -> profile -> role -> completion (4 steps)
- `streamlined`: welcome-combined -> completion (2 steps)
- `guided`: welcome -> profile -> role -> first-action -> completion (5 steps)

---

*This memory is updated after each development cycle. PM-Growth should read this before starting new work.*
