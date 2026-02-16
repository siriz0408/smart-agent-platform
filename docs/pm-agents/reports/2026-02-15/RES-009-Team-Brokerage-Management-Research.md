# RES-009: Team/Brokerage Management Research Report

> **PM-Research** | Research Report
> **Date:** 2026-02-15
> **Status:** Complete
> **Priority:** P2 - Medium

---

## Executive Summary

This report evaluates team and brokerage management features in competing real estate platforms, assesses Smart Agent's current workspace implementation, and provides recommendations for enhancement. The research reveals that while Smart Agent has a solid workspace foundation, several gaps exist compared to industry leaders like Follow Up Boss, kvCORE/BoldTrail, and Keller Williams Command.

**Key Findings:**
1. Smart Agent's current workspace architecture provides a strong foundation for multi-workspace support
2. Critical gaps exist in team collaboration, lead distribution, and brokerage-level analytics
3. Billing model is well-designed (workspace-based subscriptions) but needs enhanced seat management
4. Competitor analysis reveals 8 key feature areas needing attention

**Recommendations:** 6 new recommendations (REC-033 through REC-038) submitted for PM-Orchestrator review

---

## 1. Current State Analysis

### 1.1 Smart Agent Workspace Architecture

**Strengths (Already Implemented):**

| Feature | Status | Implementation |
|---------|--------|----------------|
| Multi-workspace membership | ✅ Complete | Users can belong to multiple workspaces via `workspace_memberships` |
| Workspace switching | ✅ Complete | `active_workspace_id` in profiles enables seamless switching |
| Role-based access | ✅ Complete | `app_role` enum: super_admin, owner, admin, agent, buyer, seller |
| Workspace-level subscriptions | ✅ Complete | Each workspace has its own subscription |
| RLS isolation | ✅ Complete | Row-Level Security enforces workspace data isolation |
| Workspace ownership | ✅ Complete | `is_owner` flag on workspace_memberships |
| Invite tracking | ✅ Complete | `invited_by` field tracks who invited each member |

**Current Role Hierarchy:**
```
super_admin > owner > admin > agent > buyer/seller
```

**Database Schema Summary:**
- `workspaces` - Organization units (brokerages, teams)
- `workspace_memberships` - User-workspace relationships with roles
- `profiles.active_workspace_id` - Current workspace context
- `subscriptions.workspace_id` - One subscription per workspace

### 1.2 Identified Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Team hierarchy | High | No team structure within workspaces (team leads, sub-teams) |
| Lead distribution | High | No automated lead routing or round-robin assignment |
| Agent performance tracking | High | No brokerage-level analytics for agent productivity |
| Granular permissions | Medium | Limited field-level and feature-level permissions |
| Agent onboarding | Medium | No structured onboarding flow for new team members |
| Commission tracking | Medium | No commission split management |
| Workspace branding | Low | Limited customization options for workspace branding |
| Seat management UI | Low | No UI for managing agent seats and invitations |

---

## 2. Competitor Analysis

### 2.1 Follow Up Boss (The "Real Estate Team OS")

**Pricing:** $69/user/mo (Grow) | $499/mo for 10 users (Pro) | $1,000/mo for 30 users (Platform)

**Team Management Features:**
| Feature | Description | Relevance to SA |
|---------|-------------|-----------------|
| Lead distribution | Round-robin, performance-based, geographic, source-based routing | **Critical gap** |
| Team accountability | Built-in tracking, leaderboards, performance metrics | **Critical gap** |
| Shared inboxes | Team-wide email/text visibility with @mentions | Nice to have |
| Call routing | Inbound call distribution to available agents | Future consideration |
| Team templates | Shared email/SMS templates and sequences | **Partially exists** |
| Performance reporting | Agent-level and team-level conversion analytics | **Critical gap** |
| ISA support | Dedicated ISA workflows with agent handoff | Specialized |

**Key Insight:** Follow Up Boss positions itself as a "Team Operating System" - emphasizing collaboration, accountability, and lead management as core differentiators.

### 2.2 kvCORE / BoldTrail

**Pricing:** $749/mo (5 users) | $1,199/mo (50 users) | $1,800/mo (enterprise)

**Brokerage Management Features:**
| Feature | Description | Relevance to SA |
|---------|-------------|-----------------|
| Database privacy | Agents can protect their contacts from brokerage visibility | **Important for adoption** |
| Agent productivity reports | Detailed brokerage-level agent analytics | **Critical gap** |
| Lead routing | Sophisticated multi-rule routing engine | **Critical gap** |
| Branding controls | Enterprise-level branding consistency across agents | Nice to have |
| Transaction management | Back-office integration (Brokermint, CORE BackOffice) | Future phase |
| Marketing automation | Brokerage-level campaign management | **Exists in SA** |
| IDX website | Agent-specific IDX websites under brokerage domain | Not core to SA vision |

**Key Insight:** kvCORE targets brokerages by emphasizing cost consolidation (35% technology savings) and unified platform approach.

### 2.3 Keller Williams Structure (Reference Model)

**Commission Structure:**
- Standard 70/30 split (agent/broker)
- Annual cap system (agent keeps 100% after cap)
- No parking/privilege hierarchy among agents

**Organizational Model:**
- Franchise structure with 1,000+ offices
- Market Center model (physical office as organizational unit)
- Associate Leadership Council (top 20% agents advise on policy)
- Team within team structures common

**Key Insight:** Successful brokerages balance agent autonomy with organizational structure. Smart Agent should support various brokerage models (flat, hierarchical, hybrid).

### 2.4 LionDesk

**Team Features:**
| Feature | Description |
|---------|-------------|
| Lead assignment | Manual assignment or automated distribution |
| Performance-based routing | Route leads based on agent conversion rates |
| Region-based routing | Route based on geographic expertise |
| Task assignment | Assign tasks to team members |
| Team-specific pricing | Pricing varies by team size |

### 2.5 Rex Software (Permission Model Reference)

**Privilege Roles Model:**
| Role | Access Level | Use Case |
|------|--------------|----------|
| Super Admin | Full system access | Agency owner, head admin |
| General Admin | Limited admin access | Executive assistants, secretaries |
| Agent (Open) | See all records, edit own | Collaborative environments |
| Agent (Closed) | See/edit own records only | Competitive environments |
| Agent (Hybrid) | See all, edit own unless permitted | Balance of collaboration and ownership |

**Key Insight:** Rex's three operating models (open, closed, hybrid) address different brokerage cultures. Smart Agent should support configurable workspace modes.

---

## 3. Industry Billing Models

### 3.1 SaaS Pricing Patterns for Real Estate

| Model | Description | Examples | SA Alignment |
|-------|-------------|----------|--------------|
| Per-seat/user | Fixed price per user per month | Follow Up Boss ($69/user) | **Current model** |
| Tiered bundles | Fixed user count per tier | kvCORE ($749 for 5 users) | Compatible |
| Per-transaction | Charge per closed deal | Zipi | Not recommended |
| Hybrid | Base subscription + success fee | Emerging trend | Future consideration |

**Industry Benchmarks:**
| Tier | Price Range | Users | Features |
|------|-------------|-------|----------|
| Solo/Starter | $29-$79/mo | 1 | Basic CRM, limited AI |
| Team | $199-$499/mo | 4-10 | Full features, team tools |
| Brokerage | $499-$1,800/mo | 10-50+ | Enterprise features, API access |

### 3.2 Smart Agent Pricing Assessment

**Current Pricing (from PRD):**
| Tier | Price | Users | Assessment |
|------|-------|-------|------------|
| Free | $0 | 1 | Competitive |
| Starter | $29/mo | 1 | **2-3x lower than competitors** |
| Professional | $79/mo | 1-3 | Competitive |
| Team | $199/mo | 4-10 | **Very competitive** |
| Brokerage | $499/mo | 10-30 | **Competitive** |

**Recommendation:** Maintain pricing advantage but consider tiered seat add-ons ($29/additional seat) for Team/Brokerage tiers.

---

## 4. Key Feature Requirements

### 4.1 Must-Have Features (P0-P1)

| # | Feature | Priority | Competitive Parity |
|---|---------|----------|-------------------|
| 1 | Lead distribution/routing | P0 | FUB, kvCORE, LionDesk |
| 2 | Agent performance analytics | P0 | All competitors |
| 3 | Team hierarchy (team leads, sub-teams) | P1 | FUB, kvCORE |
| 4 | Granular permissions (open/closed/hybrid modes) | P1 | Rex, kvCORE |
| 5 | Seat management UI | P1 | All competitors |
| 6 | Leaderboards/gamification | P1 | FUB |

### 4.2 Should-Have Features (P2)

| # | Feature | Priority | Competitive Parity |
|---|---------|----------|-------------------|
| 7 | Commission tracking | P2 | Specialized tools |
| 8 | Agent onboarding workflow | P2 | kvCORE |
| 9 | Workspace branding controls | P2 | kvCORE, BoldTrail |
| 10 | Database privacy controls | P2 | kvCORE |

### 4.3 Nice-to-Have Features (P3)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 11 | ISA workflows | P3 | Specialized use case |
| 12 | Call routing | P3 | Requires telephony integration |
| 13 | Back-office integration | P3 | Future phase |

---

## 5. Recommendations

### REC-033: Implement Lead Distribution Engine
**Source:** RES-009 Team/Brokerage Management Research
**Priority:** P0 - Critical
**Status:** Pending PM-Orchestrator Review
**Date:** 2026-02-15

**Recommendation:**
Build an automated lead distribution engine supporting round-robin, weighted (performance-based), geographic, and custom rule-based routing. Essential for team adoption and competitive parity with Follow Up Boss.

**Rationale:**
- Follow Up Boss's #1 team feature is lead distribution
- 80% of sales require 5+ follow-ups - fast lead assignment is critical
- Teams with good lead routing convert 21x higher (5-minute response benchmark)
- Current gap is a deal-breaker for team/brokerage sales
- Addresses PM-Research finding: no competitors use AI for lead routing (opportunity)

**Impact:**
- **User Impact:** 5/5 (transformative for teams)
- **Vision Alignment:** 5/5 (AI-first lead intelligence)
- **Effort:** Medium (M)
- **Owner:** PM-Transactions + PM-Intelligence
- **Timeline:** Q2 2026

**Implementation:**
1. Lead routing rules engine (configurable per workspace)
2. Distribution modes: round-robin, weighted, geographic, expertise-based
3. AI enhancement: predictive routing based on agent-lead fit
4. Lead pool feature (agents claim leads from pool)
5. Notification + SLA tracking (time to first contact)
6. Performance feedback loop (routing adjusts based on conversion)

---

### REC-034: Build Agent Performance Dashboard
**Source:** RES-009 Team/Brokerage Management Research
**Priority:** P0 - Critical
**Status:** Pending PM-Orchestrator Review
**Date:** 2026-02-15

**Recommendation:**
Create brokerage-level analytics dashboard showing agent productivity metrics, lead conversion rates, response times, and deal performance. Include leaderboards for gamification.

**Rationale:**
- Every major competitor offers brokerage-level analytics
- Brokerages need visibility into team performance for coaching
- Gamification (leaderboards) increases engagement and performance
- Follow Up Boss emphasizes accountability as core value prop
- Data exists in SA (leads, deals, activities) - just needs aggregation

**Impact:**
- **User Impact:** 4/5 (high value for team leads/admins)
- **Vision Alignment:** 4/5 (supports team tier value prop)
- **Effort:** Medium (M)
- **Owner:** PM-Experience + PM-Transactions
- **Timeline:** Q2 2026

**Implementation:**
1. Agent performance metrics: leads assigned, contacted, converted
2. Response time tracking (first contact, average response)
3. Deal metrics: deals in progress, closed, velocity
4. Activity metrics: calls, emails, meetings logged
5. Leaderboard with configurable rankings (weekly, monthly)
6. Export/reporting for brokerage owners

---

### REC-035: Implement Team Hierarchy Structure
**Source:** RES-009 Team/Brokerage Management Research
**Priority:** P1 - High
**Status:** Pending PM-Orchestrator Review
**Date:** 2026-02-15

**Recommendation:**
Add team structure within workspaces: teams, team leads, and reporting relationships. Enable team leads to manage their sub-team while workspace admins maintain overall control.

**Rationale:**
- Large brokerages have 10-30+ agents organized into teams
- Team leads need visibility into their team without full admin access
- kvCORE and FUB support team hierarchy
- Enables team-specific lead routing and reporting
- Current flat workspace model doesn't scale to 30+ agents

**Impact:**
- **User Impact:** 4/5 (essential for larger workspaces)
- **Vision Alignment:** 4/5 (supports brokerage tier)
- **Effort:** Medium (M)
- **Owner:** PM-Orchestrator (schema) + PM-Experience (UI)
- **Timeline:** Q2-Q3 2026

**Implementation:**
1. Add `teams` table: id, workspace_id, name, team_lead_id
2. Add `team_memberships`: user_id, team_id, joined_at
3. New role: `team_lead` with team-scoped admin permissions
4. Team-scoped views in dashboard and reports
5. Team-specific lead routing and performance tracking
6. UI for managing teams within Settings

**Schema Addition:**
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  team_lead_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);
```

---

### REC-036: Add Workspace Data Privacy Modes
**Source:** RES-009 Team/Brokerage Management Research
**Priority:** P1 - High
**Status:** Pending PM-Orchestrator Review
**Date:** 2026-02-15

**Recommendation:**
Implement configurable workspace data privacy modes (open, closed, hybrid) following Rex Software's model. Allows brokerages to balance collaboration with agent data ownership.

**Rationale:**
- kvCORE's "database privacy" is a key adoption driver
- Some brokerages want full visibility (collaboration-first)
- Others want agent-owned databases (competitive environment)
- Hybrid mode (see all, edit own) balances both
- Agents leaving brokerage is a real concern - data ownership matters
- SA's current RLS is workspace-scoped (closed is default)

**Impact:**
- **User Impact:** 4/5 (addresses adoption blocker for some brokerages)
- **Vision Alignment:** 4/5 (supports diverse brokerage models)
- **Effort:** Medium (M)
- **Owner:** PM-Security + PM-Context
- **Timeline:** Q2-Q3 2026

**Implementation:**
1. Add `privacy_mode` column to workspaces: 'open', 'closed', 'hybrid'
2. Open mode: all agents see all contacts/deals in workspace
3. Closed mode: agents only see own data (current behavior)
4. Hybrid mode: agents see all, edit only own records
5. Contact ownership field: `owner_user_id` on contacts
6. RLS policies update based on workspace privacy mode
7. Admin override capability for any mode

---

### REC-037: Build Seat Management UI
**Source:** RES-009 Team/Brokerage Management Research
**Priority:** P1 - High
**Status:** Pending PM-Orchestrator Review
**Date:** 2026-02-15

**Recommendation:**
Create a comprehensive workspace management UI for inviting agents, managing roles, and tracking seat usage against subscription limits.

**Rationale:**
- Current workspace management is limited
- Team/Brokerage tiers need seat management (4-30 agents)
- Self-service reduces support burden
- Competitive table stakes (all competitors offer this)
- Enables workspace admins to operate independently

**Impact:**
- **User Impact:** 4/5 (essential for team/brokerage admins)
- **Vision Alignment:** 4/5 (supports self-service growth)
- **Effort:** Small (S)
- **Owner:** PM-Experience + PM-Growth
- **Timeline:** Q1-Q2 2026

**Implementation:**
1. Workspace Settings > Team Members page
2. Invite by email with role selection
3. Pending invitations list with resend/revoke
4. Active members list with role editing
5. Seat usage meter (X of Y seats used)
6. Upgrade prompt when approaching limit
7. Remove member with data handling options (delete/transfer/keep)

---

### REC-038: Implement AI-Powered Lead Scoring
**Source:** RES-009 Team/Brokerage Management Research
**Priority:** P1 - High
**Status:** Pending PM-Orchestrator Review
**Date:** 2026-02-15

**Recommendation:**
Build ML-based lead scoring to rank leads by conversion likelihood, enabling smarter lead distribution and prioritization. Differentiator: use document intelligence signals (pre-approval letters, signed disclosures) in scoring.

**Rationale:**
- DwellCRM has "AI Lead Scoring" but limited to engagement signals
- SA's document intelligence provides unique data (financial docs, signed contracts)
- Pre-approval letter → high intent signal
- Follow Up Boss uses engagement scoring - SA can go deeper
- Supports REC-033 (lead distribution) with intelligent routing
- Addresses REC-024 (from RES-005) - implements it

**Impact:**
- **User Impact:** 5/5 (higher conversion, reduced wasted effort)
- **Vision Alignment:** 5/5 (AI-first, document intelligence compound advantage)
- **Effort:** Medium (M)
- **Owner:** PM-Intelligence
- **Timeline:** Q2-Q3 2026

**Implementation:**
1. Lead scoring model inputs:
   - Engagement: page views, email opens, chat interactions
   - Documents: pre-approval uploaded, disclosures signed
   - Profile: budget, timeline, location match
   - Behavior: property saves, showing requests
2. Score displayed on contact cards and lists
3. "Hot leads" filter and smart list
4. Routing integration: high-score leads to top performers
5. Scoring model feedback loop (conversion outcomes)
6. Explanation UI: "Why this score?" transparency

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Q1-Q2 2026)
| Week | Deliverable | Owner |
|------|-------------|-------|
| 1-2 | Seat Management UI (REC-037) | PM-Experience |
| 3-4 | Agent Performance Dashboard MVP (REC-034) | PM-Experience |
| 5-6 | Lead Distribution Engine - Round Robin (REC-033) | PM-Transactions |

### Phase 2: Intelligence (Q2 2026)
| Week | Deliverable | Owner |
|------|-------------|-------|
| 7-8 | Lead Scoring Model (REC-038) | PM-Intelligence |
| 9-10 | Lead Distribution - AI Routing (REC-033) | PM-Intelligence |
| 11-12 | Leaderboards & Gamification (REC-034) | PM-Experience |

### Phase 3: Scale (Q2-Q3 2026)
| Week | Deliverable | Owner |
|------|-------------|-------|
| 13-14 | Team Hierarchy Structure (REC-035) | PM-Orchestrator |
| 15-16 | Workspace Privacy Modes (REC-036) | PM-Security |
| 17-18 | Team-scoped reporting and routing | PM-Transactions |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Complexity of lead routing rules | Medium | High | Start with simple modes, iterate based on feedback |
| RLS performance with privacy modes | Low | High | Benchmark queries, optimize indexes |
| Adoption resistance from solo agents | Medium | Medium | Maintain solo-friendly UI, team features opt-in |
| Schema migration complexity | Low | Medium | Additive changes only, backward compatible |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Team tier adoption | +50% QoQ | Subscription upgrades to Team/Brokerage |
| Multi-user workspaces | 30% of paid workspaces | Workspaces with 3+ members |
| Lead response time | <5 minutes average | Time to first contact after lead creation |
| Agent satisfaction | NPS >40 | Survey team/brokerage users |
| Churn reduction | -20% | Team tier churn rate |

---

## 9. Appendix: Competitor Feature Matrix

| Feature | SA Current | FUB | kvCORE | LionDesk | Rex |
|---------|------------|-----|--------|----------|-----|
| Multi-workspace | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lead distribution | ❌ | ✅ | ✅ | ✅ | ⚠️ |
| Agent analytics | ❌ | ✅ | ✅ | ⚠️ | ✅ |
| Team hierarchy | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| Leaderboards | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| Privacy modes | ⚠️ | ❌ | ✅ | ❌ | ✅ |
| Seat management | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| AI lead scoring | ❌ | ⚠️ | ⚠️ | ❌ | ❌ |
| Document intelligence | ✅ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ Full support | ⚠️ Partial/basic | ❌ Not available

---

## Sources

Research was conducted using the following sources:

- [Best Real Estate CRM Software 2025](https://www.myoutdesk.com/blog/best-real-estate-crm-software-2026/)
- [Follow Up Boss - Real Estate Team OS](https://www.followupboss.com/)
- [Follow Up Boss Pricing](https://www.followupboss.com/pricing)
- [Follow Up Boss Team Leaders](https://www.followupboss.com/how-it-works/team-leader)
- [kvCORE Platform for Brokerages](https://www.insiderealestate.com/kvcore)
- [kvCORE Review](https://theclose.com/kvcore-review/)
- [BoldTrail (kvCORE Evolution) Review](https://www.realestateskills.com/blog/kvcore)
- [Keller Williams Commission Structure](https://moving-careers.com/keller-williams-realty-the-commission-structure/)
- [Compass vs Keller Williams Comparison](https://smartagentalliance.com/best-real-estate-brokerage/matchup/compass-kw/)
- [Rex Software Privilege Roles](https://www.rexsoftware.com/articles/understanding-rexs-privilege-roles)
- [LionDesk Features](https://www.getapp.com/real-estate-property-software/a/liondesk/features/)
- [SaaS Pricing Models for Real Estate](https://www.getmonetizely.com/articles/whats-the-best-pricing-model-for-real-estate-saas-commission-based-or-subscription)
- [Real Estate Software Pricing 2026](https://theclose.com/real-estate-software)
- [SkySlope Brokerage Software](https://skyslope.com/products-services/skyslope/)
- [Jointly Real Estate Software](https://jointly.com/solutions/software-for-brokerages)

---

*Report prepared by PM-Research | 2026-02-15*
