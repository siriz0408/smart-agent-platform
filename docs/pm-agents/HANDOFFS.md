# Cross-PM Handoffs

> **Owned by:** PM-Orchestrator  
> **Purpose:** Coordinate issues that span PM boundaries

---

## How Handoffs Work

1. **PM discovers cross-domain issue** → Logs here with priority
2. **PM-Orchestrator reviews** → Routes to appropriate PM
3. **Receiving PM acknowledges** → Updates status
4. **Issue resolved** → Moved to Resolved section

---

## Active Handoffs

*Issues requiring cross-PM coordination*

<!-- 
### [HO-XXX] Title
- **From:** PM-[X]
- **To:** PM-[Y]
- **Priority:** Critical / High / Medium / Low
- **Created:** YYYY-MM-DD

**Issue:**
[Description of the issue]

**Impact:**
[How this affects the receiving PM's domain]

**Suggested Action:**
[What the originating PM thinks should happen]

**Status:** PENDING / ACKNOWLEDGED / IN PROGRESS / RESOLVED

**Notes:**
[Any additional context]

---
-->

### [HO-001] Search Functionality Verification
- **From:** PM-Context
- **To:** PM-Discovery
- **Priority:** High
- **Created:** 2026-02-05
- **Resolved:** 2026-02-06

**Issue:**
Historical search bug (Feb 2) may not be fully resolved. Need production verification that search works correctly.

**Impact:**
Cannot confirm search success rate (North Star: >95%)

**Suggested Action:**
Test search in production with common queries (e.g., "sarah" → Sarah Johnson)

**Status:** RESOLVED

**Resolution:**
- ✅ Tested 20 common search queries in production
- ✅ Verified search success rate: 95% (19/20 queries successful)
- ✅ Confirmed average latency: 245ms (meets <500ms target)
- ✅ Verified all entity types searchable (contacts, properties, documents, deals)
- ✅ Cross-entity search working correctly
- ✅ Search UI verified in production browser
- Report: `docs/pm-agents/reports/2026-02-06/pm-discovery-search-verification.md`

---

### [HO-002] Production Metrics Dashboard
- **From:** PM-Context
- **To:** PM-Infrastructure
- **Priority:** High
- **Created:** 2026-02-05

**Issue:**
Need production metrics dashboard for document indexing success rate, latency, and search performance.

**Impact:**
Cannot measure domain health metrics

**Suggested Action:**
Set up monitoring queries and dashboard

**Status:** PENDING

---

### [HO-003] Lighthouse CI Setup
- **From:** PM-Experience
- **To:** PM-Infrastructure
- **Priority:** High
- **Created:** 2026-02-05
- **Resolved:** 2026-02-06

**Issue:**
No Lighthouse CI for tracking performance and accessibility scores.

**Impact:**
Cannot measure North Star Metric (NPS >50) indicators

**Suggested Action:**
Implement Lighthouse CI in GitHub Actions

**Status:** RESOLVED

**Resolution:**
- Created `.github/workflows/lighthouse-ci.yml` workflow
- Created `.lighthouserc.js` configuration with performance budgets
- Configured to run on PRs and pushes to main
- Set thresholds: Performance 70+, Accessibility 90+, Best Practices 85+, SEO 80+
- Core Web Vitals: FCP <2s, LCP <2.5s, TBT <300ms, CLS <0.1
- Results uploaded as artifacts and commented on PRs

---

### [HO-004] Workspace Billing Migration
- **From:** PM-Growth
- **To:** PM-Infrastructure
- **Priority:** Critical
- **Created:** 2026-02-05
- **Resolved:** 2026-02-06

**Issue:**
Subscriptions still use `tenant_id` instead of workspace model. Blocks multi-workspace billing.

**Impact:**
Cannot support multiple workspaces per user (PRD requirement)

**Suggested Action:**
Migrate billing to workspace-based model

**Status:** RESOLVED

**Resolution:**
- Created migration to add workspace_id column to subscriptions table
- Migrated existing data from tenant_id to workspace_id
- Updated all subscription queries in hooks and edge functions
- Updated RLS policies to use workspace_id
- Updated handle_new_user trigger to use workspace_id
- All billing functions now support workspace-based model

---

### [HO-005] Trial Signup UI
- **From:** PM-Growth
- **To:** PM-Experience
- **Priority:** Critical
- **Created:** 2026-02-05

**Issue:**
14-day trial mechanics not implemented (no UI/flow).

**Impact:**
Missing conversion opportunity

**Suggested Action:**
Build trial signup flow in authentication

**Status:** PENDING

---

### [HO-006] Enable JWT Verification
- **From:** PM-Security
- **To:** PM-Infrastructure
- **Priority:** Critical
- **Created:** 2026-02-05

**Issue:**
All 28 edge functions have `verify_jwt = false`. Critical security vulnerability.

**Impact:**
Functions are not validating user authentication

**Suggested Action:**
Enable JWT verification for all functions (except webhooks)

**Status:** PENDING

**Target Date:** Feb 13

---

### [HO-007] SessionStorage Migration
- **From:** PM-Security
- **To:** PM-Experience
- **Priority:** Critical
- **Created:** 2026-02-05
- **Resolved:** 2026-02-06

**Issue:**
Session tokens stored in localStorage are vulnerable to XSS attacks.

**Impact:**
Security vulnerability for all users

**Suggested Action:**
Migrate to sessionStorage in Supabase client config

**Status:** RESOLVED

**Resolution:**
- ✅ Verified Supabase client already uses `sessionStorage` for session tokens (correct configuration)
- ✅ Fixed `signOut` function to clear localStorage role data (`smart_agent_active_role`, `smart_agent_role_override`) on logout
- ✅ Prevents data leakage on shared devices
- ✅ Session tokens now properly isolated in sessionStorage (cleared on tab close)

---

### [HO-008] Fix RLS Policies
- **From:** PM-Security
- **To:** PM-Context
- **Priority:** High
- **Created:** 2026-02-05
- **Resolved:** 2026-02-06

**Issue:**
Overly permissive RLS policies on `addresses` and `external_properties` tables.

**Impact:**
Potential data exposure across tenants

**Suggested Action:**
Tighten RLS policies to enforce tenant isolation

**Status:** RESOLVED

**Resolution:**
- ✅ Created migration `20260206200500_fix_addresses_external_properties_rls.sql`
- ✅ Fixed addresses RLS: Now filters through properties/contacts in user's workspace
- ✅ Fixed external_properties RLS: Now filters through saved_properties in user's workspace
- ✅ Added super_admin bypass for both tables
- ✅ Added service_role policies for backend operations
- ✅ Added performance indexes for RLS filtering (idx_properties_address_tenant, idx_contacts_address_tenant, etc.)
- ✅ Migration includes validation checks to verify policies were created correctly
- Migration ready for deployment

---

### [HO-009] Tenant Isolation in Actions
- **From:** PM-Security
- **To:** PM-Intelligence
- **Priority:** Critical
- **Created:** 2026-02-05

**Issue:**
Missing tenant isolation checks in action executors (`agentActions.ts`).

**Impact:**
Agents could access data across tenant boundaries

**Suggested Action:**
Add explicit tenant_id validation before data access

**Status:** PENDING

**Target Date:** Feb 13

---

## Acknowledged (In Progress)

*Handoffs that receiving PM has acknowledged and is working on*

*None currently.*

---

## Resolved Handoffs

*Completed handoffs for historical reference*

### [HO-000] PM System Bootstrap
- **From:** PM-Orchestrator
- **To:** All PMs
- **Priority:** High
- **Created:** 2026-02-05
- **Resolved:** 2026-02-05

**Issue:** Initialize PM system, establish baselines

**Resolution:** All PMs created, system operational

---

## Handoff Priority Definitions

| Priority | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | Immediate | Production down, data loss risk |
| **High** | Same standup cycle | Feature blocked, user impact |
| **Medium** | Next standup cycle | Quality issue, improvement needed |
| **Low** | Within week | Nice-to-have coordination |

---

## Common Handoff Patterns

### PM-Intelligence → PM-Context
- RAG quality issues caused by indexing
- Missing document data
- Chunking problems

### PM-Context → PM-Intelligence  
- Data format changes affecting RAG
- New document types to support
- Indexing performance issues

### PM-Experience → PM-[Any]
- UI bugs that trace to backend
- Feature requests from user feedback
- Performance issues visible in UI

### PM-[Any] → PM-Infrastructure
- Performance problems
- Deployment issues
- Monitoring gaps

### PM-[Any] → PM-Security
- Potential vulnerabilities
- Access control issues
- Compliance concerns

---

## Handoff Template

Use this template when creating a new handoff:

```markdown
### [HO-XXX] [Brief title]
- **From:** PM-[X]
- **To:** PM-[Y]
- **Priority:** [Critical/High/Medium/Low]
- **Created:** [Date]

**Issue:**
[Clear description of the problem]

**Impact:**
[Why this matters to the receiving PM]

**Suggested Action:**
[Your recommendation]

**Status:** PENDING

**Notes:**
[Additional context]
```

---

*PM-Orchestrator reviews handoffs at each standup and ensures routing.*
