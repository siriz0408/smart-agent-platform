# PM-Security Memory

> **Last Updated:** 2026-02-15 (Cycle 14)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**RLS Pattern:**
- Row-Level Security on all tables
- Workspace isolation via `workspace_id` or `tenant_id`
- Service role bypass for backend operations (use `TO service_role`)
- Super admin bypass for admin operations (use `is_super_admin()`)
- Active workspace lookup: `SELECT active_workspace_id FROM profiles WHERE user_id = auth.uid()`

**Tenant Isolation Pattern:**
- Defense-in-depth: validate at multiple layers
- Entry point validation (UUID checks)
- Executor-level validation (tenant ownership)
- Centralized validation helpers

**CORS Pattern:**
- Dynamic origin validation (not wildcard)
- Allowed origins: production, localhost, Vercel previews
- `Vary: Origin` header for caching
- Applied to all 38 edge functions

**Error Sanitization Pattern (SEC-016):**
- Centralized error handler in `_shared/error-handler.ts`
- Raw error messages logged server-side only
- Generic, safe messages returned to clients
- Pattern-based detection of unsafe content (SQL, paths, stack traces)
- Known safe messages allowed through (e.g., "Not found", "Unauthorized")
- HTTP status codes mapped from error categories

**RLS Policy Security (SEC-017):**
- CRITICAL: `WITH CHECK(true)` without `TO service_role` allows ANY authenticated user
- Always use `TO service_role` when creating service role policies
- Admin policies MUST filter by workspace_id/tenant_id for tenant isolation
- Super admin should use separate policy with `is_super_admin()` check
- Add performance indexes for all RLS filter patterns

### Common Issues & Solutions

**Issue:** Overly permissive RLS policies
- **Solution:** Tightened policies, added tenant filters
- **Pattern:** Always filter by workspace_id

**Issue:** CORS wildcard (*) security risk
- **Solution:** Dynamic origin validation
- **Pattern:** Validate specific origins, not wildcard

**Issue:** Tenant isolation gaps in action executors
- **Solution:** Added centralized validation helpers
- **Pattern:** Defense-in-depth (multiple validation layers)

**Issue:** Error messages leak internal details
- **Solution:** Implemented SEC-016 - centralized error sanitization
- **Pattern:** Use `createErrorResponse()` from `error-handler.ts`
- **Files updated:** 31 edge functions now use sanitized error responses

**Issue:** Service role policies without TO service_role restriction
- **Solution:** SEC-017 - Fixed policies using `WITH CHECK(true)` or `USING(true)`
- **Pattern:** ALWAYS use `TO service_role` when creating service_role policies
- **Tables fixed:** churn_risk_assessments, push_notification_tokens
- **Learning:** `USING(auth.uid() IS NOT NULL)` allows any authenticated user

**Issue:** Admin policies lack tenant isolation
- **Solution:** SEC-017 - Split into super_admin (all) + workspace admin (tenant only)
- **Pattern:** Super admins use `is_super_admin()`, regular admins filter by workspace
- **Tables fixed:** mrr_snapshots, subscription_events

### Domain-Specific Knowledge

**Security Layers:**
1. RLS policies (database level)
2. Edge function validation (application level)
3. Frontend access control (UI level)
4. API authentication (JWT verification)
5. Error message sanitization (response level)

**Security Checks:**
- JWT verification on all edge functions
- Tenant isolation on all data access
- CORS restrictions on all endpoints
- Input validation on all inputs
- Error message sanitization on all responses

**Compliance:**
- SOC 2 Type II (planned)
- GDPR (planned)
- CCPA (planned)
- MLS compliance (planned)

### Cross-PM Coordination Patterns

**With PM-Context:**
- RLS policies on all tables
- Tenant isolation on data access
- Data encryption at rest

**With PM-Infrastructure:**
- Deployment security checks
- Environment variable management
- Secret management
- Error sanitization in edge functions

**With PM-Intelligence:**
- Tenant isolation in action executors
- Security validation helpers
- Defense-in-depth pattern

---

## Recent Work Context

### Last Cycle (Cycle 14)
- **Worked on:** SEC-017 - Create missing RLS policies (COMPLETED)
- **Audited:** All 70+ tables for RLS policy coverage and tenant isolation
- **Key files:** `supabase/migrations/20260215140000_sec017_create_missing_rls_policies.sql`
- **Issues fixed:**
  - churn_risk_assessments: Fixed overly permissive `USING(auth.uid() IS NOT NULL)` policy
  - push_notification_tokens: Fixed service policy lacking `TO service_role`
  - mrr_snapshots: Added tenant isolation (was cross-tenant for admins)
  - subscription_events: Added tenant isolation (was cross-tenant for admins)
- **Policies added:**
  - Super admin bypass: user_activity_log, retention_email_queue, message_reactions, search_click_events
  - Service role policies: Same tables plus proper restrictions
- **Indexes added:** For all new RLS filter patterns

### Previous Cycles

**Cycle 13:**
- SEC-016 - Error message sanitization
- Centralized error sanitization across 31 edge functions

**Cycle 9:**
- Planned SEC-016 error message sanitization
- Created `error-handler.ts` and `error-sanitizer.ts` utilities

**Cycle 8:**
- Restricted CORS across all 38 edge functions
- Tightened RLS policies on 9 tables
- Added performance indexes for RLS

**Cycle 7:**
- Established security patterns
- Created RLS policy templates

---

## Preferences & Patterns

**Prefers:**
- Using `/feature-dev` for security architecture
- Defense-in-depth approach
- Coordinating with PM-Intelligence on validation
- Centralized security utilities in `_shared/`

**Avoids:**
- Permissive security policies
- Skipping validation checks
- Hardcoding security rules
- Raw error messages in client responses

**Works well with:**
- PM-Context (RLS policies)
- PM-Infrastructure (deployment security, error handling)
- PM-Intelligence (action executor security)

---

*This memory is updated after each development cycle. PM-Security should read this before starting new work.*
