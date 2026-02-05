# Row Level Security (RLS) Security Audit Report
**Date:** February 5, 2026  
**Scope:** All migration files in `/supabase/migrations/`  
**Auditor:** AI Security Analysis

---

## Executive Summary

This audit identified **23 security vulnerabilities** across 4 categories:
- **CRITICAL (5)**: Immediate action required
- **HIGH (8)**: Address within 1 week
- **MEDIUM (7)**: Address within 1 month
- **LOW (3)**: Address as time permits

**Overall Security Posture:** ⚠️ **MODERATE RISK** - Multiple critical vulnerabilities require immediate attention.

---

## 1. Missing RLS Policies

### 🔴 CRITICAL: Tables with RLS Enabled but No Policies

The following tables have RLS enabled but **NO policies defined**, making them completely inaccessible to authenticated users:

| Table | Migration File | Severity | Impact |
|-------|---------------|----------|--------|
| `document_chunks` | `20260128160937_*.sql` | **CRITICAL** | Blocks all document search/RAG functionality |
| `deal_milestones` | `20260128160937_*.sql` | **HIGH** | Blocks deal milestone tracking |
| `contact_agents` | `20260128160937_*.sql` | **HIGH** | Blocks contact-agent relationships |
| `user_agents` | `20260128160937_*.sql` | **MEDIUM** | Blocks user agent activation |
| `document_metadata` | `20260128202358_*.sql` | **MEDIUM** | Blocks structured document data access |
| `document_indexing_jobs` | `20260128194133_*.sql` | **MEDIUM** | Blocks indexing job visibility |
| `property_searches` | `20260129194013_*.sql` | **MEDIUM** | Blocks saved property searches |
| `document_projects` | `20260129021931_*.sql` | **MEDIUM** | Blocks document project access |
| `document_project_members` | `20260129021931_*.sql` | **MEDIUM** | Blocks project member management |

**Evidence:**
```sql
-- document_chunks: RLS enabled but NO policies
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
-- ❌ NO CREATE POLICY statements found
```

**Recommendation:**
Create policies for all tables. Example for `document_chunks`:
```sql
CREATE POLICY "Users can view chunks for their documents"
  ON public.document_chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
```

---

## 2. Policy Bypass Vulnerabilities

### 🔴 CRITICAL: Overly Permissive Policies

#### 2.1 `addresses` Table - Public Access
**Location:** `20260129003703_*.sql`  
**Severity:** **CRITICAL**

```sql
CREATE POLICY "Authenticated users can view addresses"
  ON public.addresses FOR SELECT TO authenticated
  USING (true);  -- ❌ ANY authenticated user can see ALL addresses
```

**Vulnerability:** No tenant isolation. Any authenticated user can view all addresses across all tenants.

**Fix:**
```sql
DROP POLICY "Authenticated users can view addresses" ON public.addresses;
CREATE POLICY "Users can view addresses in their tenant"
  ON public.addresses FOR SELECT
  USING (
    id IN (
      SELECT address_id FROM public.properties 
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR id IN (
      SELECT address_id FROM public.contacts
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
```

#### 2.2 `external_properties` Table - Public Access
**Location:** `20260129003703_*.sql`  
**Severity:** **CRITICAL**

```sql
CREATE POLICY "Authenticated users can view external properties"
  ON public.external_properties FOR SELECT TO authenticated
  USING (true);  -- ❌ ANY authenticated user can see ALL external properties
```

**Vulnerability:** No tenant isolation. Cross-tenant data leakage.

**Fix:** Add tenant_id column and filter by tenant.

#### 2.3 `notifications` Table - Service Role Insert Bypass
**Location:** `20260129020000_create_notifications_table.sql`  
**Severity:** **HIGH**

```sql
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);  -- ❌ No validation of tenant_id or user_id
```

**Vulnerability:** Service role can insert notifications for any user/tenant without validation.

**Fix:**
```sql
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    AND tenant_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = notifications.user_id
    )
  );
```

#### 2.4 `workspaces` Table - Unrestricted INSERT
**Location:** `20260204200001_workspace_rls_policies.sql`  
**Severity:** **MEDIUM**

```sql
CREATE POLICY "workspace_insert_authenticated"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- ⚠️ Any authenticated user can create workspaces
```

**Vulnerability:** While not necessarily wrong, this allows unlimited workspace creation. Consider rate limiting or approval workflow.

---

### 🟡 HIGH: Missing WITH CHECK Clauses

Several UPDATE policies are missing `WITH CHECK` clauses, allowing users to update rows to violate tenant isolation:

| Table | Policy | Issue |
|-------|--------|-------|
| `action_queue` | `20260204110000_autonomous_agent_system.sql` | UPDATE policy has USING but no WITH CHECK |
| `agent_triggers` | `20260204110000_autonomous_agent_system.sql` | UPDATE policy has USING but no WITH CHECK |

**Example:**
```sql
CREATE POLICY "Users can update triggers in their tenant"
  ON public.agent_triggers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  -- ❌ Missing: WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()))
```

**Vulnerability:** User can update a row they can see, then change `tenant_id` to another tenant.

**Fix:** Always include `WITH CHECK` clause matching `USING` clause for UPDATE policies.

---

### 🟡 MEDIUM: SQL Injection Risk in Policies

While most policies use parameterized functions, some use string concatenation or dynamic SQL:

**Location:** `20260206000000_contact_user_linking.sql` - `find_user_by_email()` function

```sql
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
-- Uses LOWER() comparison which is safe, but function is SECURITY DEFINER
```

**Risk:** SECURITY DEFINER functions bypass RLS. If email parameter is not properly sanitized, could leak data.

**Recommendation:** Add input validation:
```sql
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE (...)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ...
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(TRIM(_email))
    AND LENGTH(_email) <= 255  -- Prevent DoS
    AND _email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'  -- Basic email validation
  LIMIT 1;
$$;
```

---

## 3. Tenant Isolation Issues

### 🔴 CRITICAL: Cross-Tenant Data Leakage

#### 3.1 `user_preferences` Table - Cross-Tenant Access
**Location:** `20260206000000_contact_user_linking.sql`  
**Severity:** **CRITICAL**

```sql
CREATE POLICY "agents_read_contact_preferences"
  ON public.user_preferences FOR SELECT
  USING (
    user_id IN (
      SELECT c.user_id
      FROM public.contacts c
      WHERE c.tenant_id = public.get_user_tenant_id(auth.uid())
      AND c.user_id IS NOT NULL
    )
  );
```

**Vulnerability:** If a contact is linked to a user (`user_id`), agents from ANY tenant that has a contact for that user can read their preferences. This violates tenant isolation.

**Example Attack:**
1. Tenant A creates contact for User X
2. Tenant B creates contact for User X
3. Tenant B agents can now read User X's preferences (intended for Tenant A)

**Fix:** Add workspace membership check:
```sql
CREATE POLICY "agents_read_contact_preferences"
  ON public.user_preferences FOR SELECT
  USING (
    user_id IN (
      SELECT c.user_id
      FROM public.contacts c
      WHERE c.tenant_id IN (
        SELECT workspace_id FROM public.workspace_memberships
        WHERE user_id = auth.uid()
      )
      AND c.user_id IS NOT NULL
    )
  );
```

#### 3.2 `contacts` Table - Cross-Workspace Visibility
**Location:** `20260206000000_contact_user_linking.sql`  
**Severity:** **HIGH**

```sql
CREATE POLICY "users_view_own_linked_contacts"
  ON public.contacts FOR SELECT
  USING (user_id = auth.uid());
```

**Vulnerability:** Platform users can see ALL contacts linked to them, regardless of which workspace created them. This may be intentional (for "My Agents" feature), but should be documented and potentially restricted.

**Recommendation:** If intentional, document it. If not, add workspace filter:
```sql
CREATE POLICY "users_view_own_linked_contacts"
  ON public.contacts FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );
```

#### 3.3 `conversations` Table - Tenant ID Mismatch
**Location:** `20260204010000_create_messaging_tables.sql`  
**Severity:** **HIGH**

```sql
CREATE TABLE IF NOT EXISTS public.conversations (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- ...
);

CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    -- ❌ Wrong: profiles.id is UUID, not user_id
  );
```

**Vulnerability:** Policy references `profiles.id` instead of `profiles.user_id`, causing policy to fail or behave unexpectedly.

**Fix:**
```sql
CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );
```

---

### 🟡 MEDIUM: Inconsistent Tenant ID Usage

Multiple migrations use different patterns for tenant isolation:

1. **Old pattern:** `tenant_id = public.get_user_tenant_id(auth.uid())`
2. **New pattern:** `tenant_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())`
3. **Broken pattern:** `tenant_id = (SELECT auth.uid())` (from `20260202000100_create_rls_policies.sql` - already fixed)

**Recommendation:** Standardize on workspace-based pattern for all policies.

---

## 4. Super Admin Bypass Security

### 🟡 HIGH: `is_super_admin()` Function Security

**Location:** `20260205190000_create_is_super_admin_function.sql`  
**Severity:** **HIGH**

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  super_admin_email CONSTANT TEXT := 'siriz04081@gmail.com';
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_email = super_admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Issues:

1. **Hardcoded Email:** Super admin email is hardcoded in function. If email changes, function must be updated.

2. **No Rate Limiting:** Function can be called unlimited times. Consider caching result per transaction.

3. **Email Comparison:** Case-sensitive comparison (`user_email = super_admin_email`). Should use `LOWER()` for consistency.

4. **SECURITY DEFINER Risk:** Function runs with elevated privileges. If compromised, could access `auth.users` table.

5. **No Audit Logging:** Super admin actions are not logged.

#### Recommendations:

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  super_admin_emails TEXT[] := ARRAY['siriz04081@gmail.com'];  -- Array for multiple admins
BEGIN
  -- Cache result in transaction variable (PostgreSQL 14+)
  IF current_setting('app.is_super_admin', true) IS NOT NULL THEN
    RETURN current_setting('app.is_super_admin', true)::boolean;
  END IF;
  
  SELECT LOWER(email) INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check against array of admin emails
  IF user_email = ANY(super_admin_emails) THEN
    PERFORM set_config('app.is_super_admin', 'true', true);
    RETURN true;
  END IF;
  
  PERFORM set_config('app.is_super_admin', 'false', true);
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Add audit logging trigger
CREATE OR REPLACE FUNCTION public.log_super_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_super_admin() THEN
    INSERT INTO public.audit_log (
      user_id, action, table_name, record_id, changes
    ) VALUES (
      auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 🟡 MEDIUM: Super Admin Policies Too Broad

**Location:** `20260204200001_workspace_rls_policies.sql`

```sql
CREATE POLICY "contacts_super_admin"
  ON public.contacts FOR ALL  -- ❌ ALL operations
  USING ((SELECT public.is_super_admin()));
```

**Issue:** Super admin policies use `FOR ALL`, granting SELECT, INSERT, UPDATE, DELETE. Consider if super admin should be able to INSERT/UPDATE/DELETE, or only SELECT.

**Recommendation:** Split into separate policies:
```sql
CREATE POLICY "contacts_super_admin_select"
  ON public.contacts FOR SELECT
  USING (public.is_super_admin());

-- Only if super admin should modify data:
CREATE POLICY "contacts_super_admin_modify"
  ON public.contacts FOR INSERT, UPDATE, DELETE
  USING (public.is_super_admin());
```

---

## 5. Additional Security Concerns

### 🟡 MEDIUM: Service Role Policies Too Permissive

Multiple tables have service role policies that bypass all RLS:

```sql
CREATE POLICY "Service role can manage all MCP logs"
  ON public.mcp_call_logs FOR ALL
  USING (auth.role() = 'service_role');
```

**Risk:** If service role credentials are compromised, attacker has full database access.

**Recommendation:** 
1. Use service role only in Edge Functions (server-side)
2. Never expose service role key to client
3. Add IP whitelist for service role connections
4. Consider more granular service role policies

---

### 🟡 LOW: Missing Indexes on RLS Columns

Some tables with RLS policies don't have indexes on `tenant_id` or `user_id`, causing slow queries:

| Table | Missing Index | Impact |
|-------|--------------|--------|
| `user_preferences` | `user_id` | Slow preference lookups |
| `conversation_participants` | `user_id`, `contact_id` | Slow participant queries |

**Recommendation:** Add indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
  ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
  ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_contact_id 
  ON public.conversation_participants(contact_id);
```

---

### 🟡 LOW: Inconsistent Policy Naming

Policy names are inconsistent:
- Some use snake_case: `contacts_select_policy`
- Some use descriptive names: `Users can view contacts in their tenant`
- Some use abbreviations: `wm_select_own`

**Recommendation:** Standardize naming convention:
```
{table}_{operation}_{scope}
Example: contacts_select_tenant, profiles_update_own
```

---

## 6. Summary of Vulnerabilities by Severity

### 🔴 CRITICAL (5)
1. `document_chunks` - No RLS policies (blocks RAG)
2. `addresses` - Public access, no tenant isolation
3. `external_properties` - Public access, no tenant isolation
4. `user_preferences` - Cross-tenant data leakage
5. `conversations` - Wrong column reference in policy

### 🟡 HIGH (8)
1. `deal_milestones` - No RLS policies
2. `contact_agents` - No RLS policies
3. `notifications` - Service role insert bypass
4. `contacts` - Cross-workspace visibility
5. `action_queue` - Missing WITH CHECK clause
6. `agent_triggers` - Missing WITH CHECK clause
7. `is_super_admin()` - Security concerns
8. `user_agents` - No RLS policies

### 🟠 MEDIUM (7)
1. `document_metadata` - No RLS policies
2. `document_indexing_jobs` - No RLS policies
3. `property_searches` - No RLS policies
4. `document_projects` - No RLS policies
5. `document_project_members` - No RLS policies
6. `workspaces` - Unrestricted INSERT
7. `find_user_by_email()` - Input validation needed

### 🟢 LOW (3)
1. Missing indexes on RLS columns
2. Inconsistent policy naming
3. Service role policies too permissive (acceptable if properly secured)

---

## 7. Recommended Action Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ Add RLS policies for `document_chunks`
2. ✅ Fix `addresses` and `external_properties` tenant isolation
3. ✅ Fix `user_preferences` cross-tenant access
4. ✅ Fix `conversations` INSERT policy
5. ✅ Add missing WITH CHECK clauses

### Phase 2: High Priority (Week 2-3)
1. ✅ Add RLS policies for remaining tables
2. ✅ Fix `notifications` service role policy
3. ✅ Review and restrict `contacts` cross-workspace access
4. ✅ Enhance `is_super_admin()` security

### Phase 3: Medium Priority (Month 1)
1. ✅ Standardize tenant isolation patterns
2. ✅ Add input validation to SECURITY DEFINER functions
3. ✅ Review and restrict workspace creation
4. ✅ Add missing indexes

### Phase 4: Low Priority (Ongoing)
1. ✅ Standardize policy naming
2. ✅ Add audit logging for super admin actions
3. ✅ Document intentional cross-workspace access patterns

---

## 8. Testing Recommendations

### Unit Tests
```sql
-- Test tenant isolation
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "<user-a-uuid>"}';
SELECT COUNT(*) FROM contacts;  -- Should only see Tenant A contacts

SET request.jwt.claims TO '{"sub": "<user-b-uuid>"}';
SELECT COUNT(*) FROM contacts;  -- Should only see Tenant B contacts
RESET ROLE;
```

### Integration Tests
- Test super admin bypass works correctly
- Test service role policies are not accessible from client
- Test cross-tenant access is blocked
- Test missing policies cause expected failures

### Security Tests
- Attempt SQL injection in policy functions
- Attempt to bypass RLS via SECURITY DEFINER functions
- Attempt to access other tenants' data
- Attempt to escalate privileges

---

## 9. Conclusion

The RLS implementation has **good coverage** but contains **critical vulnerabilities** that must be addressed immediately. The most urgent issues are:

1. **Missing policies** blocking core functionality
2. **Cross-tenant data leakage** in `user_preferences` and `addresses`
3. **Overly permissive policies** allowing public access

Once these are fixed, the security posture will improve significantly. The super admin bypass is acceptable if properly secured and audited.

**Next Steps:**
1. Review this report with the development team
2. Prioritize critical fixes
3. Create migration files for fixes
4. Test thoroughly before deploying
5. Schedule follow-up audit after fixes

---

**Report Generated:** 2026-02-05  
**Next Audit Recommended:** After Phase 1 fixes are deployed
