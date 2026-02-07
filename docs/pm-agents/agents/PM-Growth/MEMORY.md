# PM-Growth Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Subscription Pattern:**
- Workspace-based subscriptions (not tenant-based)
- Stripe integration for payments
- Usage tracking for AI limits
- Plan tiers: Free, Starter, Professional, Team, Enterprise

**Onboarding Pattern:**
- Activation checklist with 5 milestones
- Real data queries (not mock data)
- Progress tracking
- Role selection and persistence

**Metrics Pattern:**
- MRR aggregation (blocked - needs infrastructure)
- Conversion funnel tracking (blocked)
- Churn analytics (blocked)
- Usage analytics (partial)

### Common Issues & Solutions

**Issue:** MRR metrics blocked
- **Blocker:** No metrics infrastructure exists
- **Solution:** Need PM-Infrastructure to build metrics system
- **Pattern:** Coordinate with PM-Infrastructure on metrics needs

**Issue:** Onboarding role not persisting
- **Solution:** Fixed role persistence bug
- **Pattern:** Test data persistence in onboarding flows

**Issue:** Subscription plan UI missing
- **Solution:** Created subscription plan UI (GRW-006)
- **Pattern:** Clear plan comparison, easy upgrade path

### Domain-Specific Knowledge

**Pricing Tiers:**
- Free: $0 (limited features)
- Starter: $29/month (basic features)
- Professional: $99/month (full features)
- Team: $199/month (team features)
- Enterprise: $499/month (enterprise features)

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
- Metrics infrastructure needed
- Deployment verification
- Cost tracking

**With PM-Experience:**
- Onboarding UI components
- Subscription plan UI
- Billing page

**With PM-Security:**
- Payment security
- Subscription access control
- Usage limit enforcement

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** GRW-006 - Subscription plan UI (in progress)
- **Discovered:** MRR metrics blocked on infrastructure
- **Blocked by:** PM-Infrastructure (metrics system)
- **Handoffs created:** None (coordination needed)

### Previous Cycles

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

**Avoids:**
- Hardcoding pricing tiers
- Skipping usage limit checks
- Mocking metrics data

**Works well with:**
- PM-Infrastructure (metrics)
- PM-Experience (onboarding UI)
- PM-Security (payment security)

---

*This memory is updated after each development cycle. PM-Growth should read this before starting new work.*
