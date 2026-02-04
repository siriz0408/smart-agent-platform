# Database Migration Review: Autonomous Agent System
**File**: `supabase/migrations/20260204110000_autonomous_agent_system.sql`  
**Date**: 2026-02-04  
**Reviewer**: AI Code Review

---

## Executive Summary

**Overall Assessment**: ⚠️ **NEEDS FIXES** - The migration has several critical security issues, missing constraints, and potential performance problems that must be addressed before deployment.

**Critical Issues**: 3  
**High Priority Issues**: 5  
**Medium Priority Issues**: 4  
**Low Priority Issues**: 2

---

## 1. Schema Design Analysis

### ✅ What Looks Good

1. **Well-structured tables**: Clear separation of concerns (actions, queue, triggers, events)
2. **Appropriate data types**: UUIDs for IDs, JSONB for flexible configs, proper timestamps
3. **Good use of CHECK constraints**: Action types, status values, priority ranges are validated
4. **Sensible defaults**: `step_order`, `is_active`, `requires_approval` have logical defaults

### ❌ Critical Issues

#### 1.1 Missing `tenant_id` NOT NULL Constraint on `agent_triggers`
**Location**: Line 74  
**Issue**: `tenant_id` is nullable but should be required for tenant isolation
```sql
tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
```
**Risk**: HIGH - Allows creation of triggers without tenant context, breaking RLS isolation  
**Fix**: 
```sql
tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
```

#### 1.2 Missing `tenant_id` NOT NULL Constraint on `agent_events`
**Location**: Line 112  
**Issue**: `tenant_id` is NOT NULL but has no foreign key constraint
```sql
tenant_id UUID NOT NULL,
```
**Risk**: HIGH - No referential integrity, orphaned events possible  
**Fix**:
```sql
tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
```

#### 1.3 Missing Foreign Key on `action_queue.agent_run_id`
**Location**: Line 37  
**Issue**: References `agent_runs(id)` but no FK constraint defined
```sql
agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
```
**Status**: ✅ Actually correct - FK is defined, but verify `agent_runs` table exists

### ⚠️ High Priority Issues

#### 1.4 Missing Index on `action_queue.created_at`
**Location**: Missing  
**Issue**: Common query pattern (recent actions, pagination) will be slow  
**Impact**: Performance degradation on action queue queries  
**Fix**: Add `CREATE INDEX idx_action_queue_created_at ON public.action_queue(created_at DESC);`

#### 1.5 Missing Composite Index for Trigger Matching
**Location**: Line 154  
**Issue**: The `idx_agent_triggers_active` index doesn't include `trigger_conditions` which is used in matching  
**Impact**: Trigger matching queries will be slow  
**Fix**: Consider adding GIN index on `trigger_conditions`:
```sql
CREATE INDEX idx_agent_triggers_conditions ON public.agent_triggers USING GIN(trigger_conditions);
```

#### 1.6 Missing Unique Constraint on `agent_actions`
**Location**: Line 9  
**Issue**: No constraint preventing duplicate action definitions for same agent/step  
**Impact**: Data integrity - could have duplicate actions  
**Fix**: Consider adding:
```sql
UNIQUE (agent_id, step_order, action_type)
```
Or if step_order can be null/duplicate:
```sql
UNIQUE (agent_id, action_type, condition_expression)
```

---

## 2. Foreign Key Analysis

### ✅ What Looks Good

1. **Proper CASCADE behavior**: Most FKs use `ON DELETE CASCADE` appropriately
2. **SET NULL for optional relationships**: `agent_run_id` uses `ON DELETE SET NULL` which is correct

### ❌ Critical Issues

#### 2.1 Missing Foreign Key on `agent_events.tenant_id`
**Location**: Line 112  
**Issue**: No FK constraint despite referencing tenants  
**Risk**: HIGH - Data integrity violation, orphaned events  
**Fix**: Add `REFERENCES public.tenants(id) ON DELETE CASCADE`

#### 2.2 Inconsistent FK Behavior on `agent_triggers.tenant_id`
**Location**: Line 74  
**Issue**: Allows NULL but RLS policy assumes tenant_id exists  
**Risk**: MEDIUM - Triggers without tenant_id bypass RLS  
**Fix**: Make NOT NULL or update RLS policy to handle NULL explicitly

### ⚠️ High Priority Issues

#### 2.3 Missing FK on `action_queue.user_id`
**Location**: Line 38  
**Issue**: References `auth.users(id)` but should verify this is correct  
**Status**: ✅ Actually correct - FK is defined

---

## 3. RLS Policy Analysis

### ✅ What Looks Good

1. **RLS enabled on all tables**: Good security practice
2. **Tenant isolation pattern**: Uses `get_user_tenant_id()` consistently
3. **Service role policies**: Allows backend processing

### ❌ Critical Security Issues

#### 3.1 RLS Policy Allows NULL tenant_id Access
**Location**: Lines 216-221  
**Issue**: Policy allows viewing triggers where `tenant_id IS NULL`
```sql
CREATE POLICY "Users can view triggers in their tenant or global"
  ON public.agent_triggers FOR SELECT
  USING (
    tenant_id IS NULL 
    OR tenant_id = public.get_user_tenant_id(auth.uid())
  );
```
**Risk**: CRITICAL - Any authenticated user can see "global" triggers  
**Impact**: Data leak - users see triggers from other tenants  
**Fix**: Remove `tenant_id IS NULL` OR add explicit check:
```sql
USING (
  (tenant_id IS NULL AND public.is_admin(auth.uid()))
  OR tenant_id = public.get_user_tenant_id(auth.uid())
);
```

#### 3.2 Inconsistent RLS on `agent_actions`
**Location**: Lines 176-193  
**Issue**: SELECT policy checks `is_public` and `tenant_id`, but ALL policy only checks `created_by`
```sql
-- SELECT allows viewing public agents or tenant agents
CREATE POLICY "Users can view actions for accessible agents"
  ON public.agent_actions FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents 
      WHERE is_public = true 
        OR tenant_id IS NULL 
        OR tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

-- ALL only checks ownership
CREATE POLICY "Users can manage actions for their agents"
  ON public.agent_actions FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents WHERE created_by = auth.uid()
    )
  );
```
**Risk**: MEDIUM - Users can view actions but not modify, which is correct. However, the SELECT policy allows viewing actions for agents with `tenant_id IS NULL`, which could be a leak.  
**Fix**: Align SELECT policy with ALL policy or add explicit admin check

#### 3.3 Missing RLS Policy for INSERT on `agent_events`
**Location**: Line 228-230  
**Issue**: Only SELECT policy exists, but service role policy allows ALL  
**Risk**: LOW - Service role can insert, but regular users cannot  
**Status**: ✅ Actually acceptable - events should only be created by triggers/service role

#### 3.4 Missing WITH CHECK Clause on UPDATE Policies
**Location**: Lines 205-209, 223-225  
**Issue**: UPDATE policies have USING but no WITH CHECK  
**Risk**: MEDIUM - Users might update rows to violate tenant isolation  
**Fix**: Add WITH CHECK clauses:
```sql
CREATE POLICY "Users can update action queue items they own or are admin"
  ON public.action_queue FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
  );
```

### ⚠️ High Priority Issues

#### 3.5 Service Role Policy Too Broad
**Location**: Lines 233-239  
**Issue**: Service role has ALL access to `agent_events` and `action_queue`  
**Risk**: MEDIUM - If service role key is compromised, full access  
**Mitigation**: This is standard practice for backend processing, but ensure service role key is properly secured  
**Status**: ✅ Acceptable for edge functions, but document security requirements

---

## 4. Index Analysis

### ✅ What Looks Good

1. **Comprehensive indexing**: Most foreign keys and common query columns are indexed
2. **Partial indexes**: Good use of WHERE clauses for filtered queries
3. **Composite indexes**: Properly designed for common query patterns

### ⚠️ High Priority Issues

#### 4.1 Missing Index on `action_queue.created_at`
**Location**: Missing  
**Issue**: Common query pattern (recent actions, pagination)  
**Impact**: Performance - sequential scans on large tables  
**Fix**: 
```sql
CREATE INDEX idx_action_queue_created_at ON public.action_queue(created_at DESC);
```

#### 4.2 Missing Index on `agent_events.created_at`
**Location**: Missing  
**Issue**: Event processing queries likely order by created_at  
**Impact**: Performance - sequential scans  
**Fix**:
```sql
CREATE INDEX idx_agent_events_created_at ON public.agent_events(created_at DESC);
```

#### 4.3 Missing GIN Index on JSONB Columns
**Location**: Missing  
**Issue**: `trigger_conditions`, `action_config`, `action_params`, `event_data` are JSONB but not indexed  
**Impact**: Performance - JSONB queries will be slow  
**Fix**: Add GIN indexes for JSONB queries:
```sql
CREATE INDEX idx_agent_triggers_conditions_gin ON public.agent_triggers USING GIN(trigger_conditions);
CREATE INDEX idx_action_queue_params_gin ON public.action_queue USING GIN(action_params);
CREATE INDEX idx_agent_events_data_gin ON public.agent_events USING GIN(event_data);
```

#### 4.4 Missing Index on `agent_triggers.next_run_at` for Scheduled Queries
**Location**: Line 156  
**Issue**: Index exists but might need DESC ordering  
**Status**: ✅ Actually fine - PostgreSQL can scan in reverse

---

## 5. Function Analysis

### ✅ What Looks Good

1. **Helper functions**: Well-designed for common operations
2. **Security definer**: Proper use of SECURITY DEFINER for tenant checks
3. **Error handling**: Uses GET DIAGNOSTICS for update verification

### ❌ Critical Issues

#### 5.1 `log_agent_event()` Function Security Risk
**Location**: Lines 258-296  
**Issue**: Function is SECURITY DEFINER but doesn't validate tenant_id  
**Risk**: HIGH - If called with malicious tenant_id, could insert events for other tenants  
**Current Code**:
```sql
CREATE OR REPLACE FUNCTION public.log_agent_event()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_event_type TEXT;
BEGIN
  -- Get tenant_id from the record
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  ...
  INSERT INTO public.agent_events (
    tenant_id,
    ...
  ) VALUES (
    v_tenant_id,  -- ⚠️ No validation!
    ...
  );
```
**Fix**: Add tenant validation or ensure triggers only fire on tenant-scoped tables:
```sql
-- Add validation
IF v_tenant_id IS NULL OR v_tenant_id != (SELECT tenant_id FROM public.tenants WHERE id = v_tenant_id) THEN
  RAISE EXCEPTION 'Invalid tenant_id: %', v_tenant_id;
END IF;
```

#### 5.2 Missing Input Validation in Approval Functions
**Location**: Lines 367-407  
**Issue**: Functions don't validate that action is in correct status  
**Risk**: MEDIUM - Could approve already-executed actions  
**Current**: Functions check `status = 'pending'` ✅ Actually correct

### ⚠️ High Priority Issues

#### 5.3 `get_pending_actions_count()` Doesn't Filter by User
**Location**: Lines 357-364  
**Issue**: Returns count for all pending actions in tenant, not per user  
**Impact**: May not match UI expectations if users expect personal counts  
**Status**: ✅ Actually fine if design intent is tenant-wide approval queue

#### 5.4 Missing Error Handling in Batch Functions
**Location**: Lines 410-428  
**Issue**: `batch_approve_actions()` doesn't handle partial failures  
**Impact**: Some actions might fail silently  
**Fix**: Consider returning detailed results:
```sql
RETURNS TABLE(action_id UUID, approved BOOLEAN, error TEXT) AS $$
```

---

## 6. Trigger Analysis

### ✅ What Looks Good

1. **Proper trigger timing**: AFTER INSERT/UPDATE is correct
2. **Conditional triggers**: Good use of WHEN clauses to avoid unnecessary firing
3. **Event type arguments**: Clean use of TG_ARGV for event type

### ❌ Critical Issues

#### 6.1 Potential Infinite Loop Risk
**Location**: Lines 303-350  
**Issue**: Triggers on `contacts`, `deals`, `documents`, `properties` insert into `agent_events`, which could theoretically trigger more events  
**Risk**: LOW - `agent_events` table doesn't have triggers that would cause loops  
**Status**: ✅ Safe - no circular dependencies

#### 6.2 Missing Trigger on `agent_events.processed` Update
**Location**: Missing  
**Issue**: When `processed` is updated, no mechanism to prevent re-processing  
**Risk**: LOW - Application logic should handle this  
**Status**: ✅ Acceptable - handled by application

### ⚠️ High Priority Issues

#### 6.3 Trigger Performance on High-Volume Tables
**Location**: Lines 303-350  
**Issue**: Every INSERT/UPDATE on contacts/deals/documents/properties fires trigger  
**Impact**: Performance - could slow down bulk operations  
**Mitigation**: 
- Consider batching event processing
- Add conditional logic to skip events for certain operations
- Monitor trigger performance

#### 6.4 Missing Error Handling in Triggers
**Location**: Lines 258-296  
**Issue**: `log_agent_event()` doesn't handle errors gracefully  
**Risk**: MEDIUM - If event logging fails, the original operation fails  
**Fix**: Consider wrapping in exception handler:
```sql
BEGIN
  -- ... existing code ...
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'Failed to log agent event: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
```

---

## 7. Additional Concerns

### 7.1 Missing Constraints

1. **`agent_triggers.schedule_cron`**: No validation that cron expression is valid
2. **`action_queue.retry_count`**: No maximum limit constraint
3. **`agent_triggers.priority`**: Has CHECK constraint ✅ Good

### 7.2 Data Consistency

1. **`agent_triggers.last_run_at` vs `next_run_at`**: No constraint ensuring `next_run_at > last_run_at`
2. **`action_queue.executed_at`**: Should be NULL when status is 'pending', but no constraint

### 7.3 Missing Audit Trail

1. **No `updated_by` columns**: Can't track who modified triggers/actions
2. **No version history**: Changes to triggers/actions aren't tracked

---

## 8. Recommended Changes Summary

### Critical (Must Fix Before Deployment)

1. ✅ **Add NOT NULL constraint** on `agent_triggers.tenant_id` (Line 74)
2. ✅ **Add foreign key** on `agent_events.tenant_id` (Line 112)
3. ✅ **Fix RLS policy** on `agent_triggers` to prevent NULL tenant_id access (Lines 216-221)
4. ✅ **Add WITH CHECK clauses** to UPDATE policies (Lines 205-209, 223-225)
5. ✅ **Add error handling** to `log_agent_event()` trigger function (Lines 258-296)

### High Priority (Fix Soon)

1. ✅ **Add indexes** on `created_at` columns for `action_queue` and `agent_events`
2. ✅ **Add GIN indexes** on JSONB columns used in queries
3. ✅ **Add error handling** to trigger function to prevent operation failures
4. ✅ **Consider unique constraint** on `agent_actions` to prevent duplicates

### Medium Priority (Nice to Have)

1. ✅ **Add validation** for cron expressions in `agent_triggers.schedule_cron`
2. ✅ **Add constraints** for data consistency (e.g., `executed_at` NULL when pending)
3. ✅ **Consider audit columns** (`updated_by`, version history)

---

## 9. Security Findings

### Critical Vulnerabilities

1. **RLS Policy Allows Global Trigger Access**: Any authenticated user can view triggers with `tenant_id IS NULL`
2. **Missing Tenant Validation in Trigger Function**: `log_agent_event()` doesn't validate tenant_id

### High Risk Issues

1. **Service Role Over-Privileged**: Full access to events and action queue (acceptable but document security requirements)
2. **Missing WITH CHECK Clauses**: UPDATE policies don't prevent tenant_id changes

### Recommendations

1. **Audit RLS policies** regularly for tenant isolation
2. **Monitor service role key** usage and rotation
3. **Add tenant validation** to all SECURITY DEFINER functions
4. **Consider row-level audit logging** for sensitive operations

---

## 10. Performance Considerations

### Current Performance Risks

1. **Missing indexes** on `created_at` columns will cause slow pagination
2. **JSONB queries** without GIN indexes will be slow
3. **Trigger overhead** on high-volume tables (contacts, deals)

### Recommendations

1. **Add missing indexes** before deployment
2. **Monitor trigger performance** in production
3. **Consider batch processing** for event handling
4. **Add query performance monitoring** for agent-related queries

---

## Conclusion

The migration is **well-structured** but has **critical security issues** that must be addressed before deployment. The main concerns are:

1. **Tenant isolation vulnerabilities** in RLS policies
2. **Missing foreign key constraints** causing data integrity issues
3. **Missing indexes** causing performance problems
4. **Insufficient error handling** in trigger functions

**Recommendation**: Fix all Critical and High Priority issues before deploying to production.

---

## Appendix: Quick Fix Script

```sql
-- Critical Fixes
ALTER TABLE public.agent_triggers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.agent_events ADD CONSTRAINT fk_agent_events_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Fix RLS Policy
DROP POLICY IF EXISTS "Users can view triggers in their tenant or global" ON public.agent_triggers;
CREATE POLICY "Users can view triggers in their tenant"
  ON public.agent_triggers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Add Missing Indexes
CREATE INDEX idx_action_queue_created_at ON public.action_queue(created_at DESC);
CREATE INDEX idx_agent_events_created_at ON public.agent_events(created_at DESC);
CREATE INDEX idx_agent_triggers_conditions_gin ON public.agent_triggers USING GIN(trigger_conditions);

-- Add WITH CHECK to UPDATE policies
DROP POLICY IF EXISTS "Users can update action queue items they own or are admin" ON public.action_queue;
CREATE POLICY "Users can update action queue items they own or are admin"
  ON public.action_queue FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
  );
```
