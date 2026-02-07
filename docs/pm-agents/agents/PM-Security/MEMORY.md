# PM-Security Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**RLS Pattern:**
- Row-Level Security on all tables
- Workspace isolation via `workspace_id`
- Service role bypass for backend operations
- Super admin bypass for admin operations

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
- **Solution:** Need sanitization pass (SEC-016)
- **Pattern:** User-friendly error messages, log details internally

### Domain-Specific Knowledge

**Security Layers:**
1. RLS policies (database level)
2. Edge function validation (application level)
3. Frontend access control (UI level)
4. API authentication (JWT verification)

**Security Checks:**
- JWT verification on all edge functions
- Tenant isolation on all data access
- CORS restrictions on all endpoints
- Input validation on all inputs

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

**With PM-Intelligence:**
- Tenant isolation in action executors
- Security validation helpers
- Defense-in-depth pattern

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** SEC-016 - Error message sanitization (pending)
- **Discovered:** Error messages may leak internal details
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

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

**Avoids:**
- Permissive security policies
- Skipping validation checks
- Hardcoding security rules

**Works well with:**
- PM-Context (RLS policies)
- PM-Infrastructure (deployment security)
- PM-Intelligence (action executor security)

---

*This memory is updated after each development cycle. PM-Security should read this before starting new work.*
