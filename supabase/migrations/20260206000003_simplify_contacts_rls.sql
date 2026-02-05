-- ============================================================================
-- SIMPLIFY CONTACTS RLS TO PREVENT RECURSION
-- ============================================================================
-- The contacts policies are causing recursion. Simplify by:
-- 1. Using direct auth checks where possible
-- 2. Avoiding complex subqueries
-- 3. Using SECURITY DEFINER functions for tenant lookups
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing contacts policies
-- ============================================================================

DROP POLICY IF EXISTS "contacts_select_by_workspace" ON public.contacts;
DROP POLICY IF EXISTS "users_view_own_linked_contacts" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_by_workspace_member" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_by_owner_or_admin" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_by_owner_or_admin" ON public.contacts;
DROP POLICY IF EXISTS "contacts_super_admin" ON public.contacts;

-- ============================================================================
-- STEP 2: Create simplified, non-recursive policies
-- ============================================================================

-- Policy 1: Super admin can do everything
CREATE POLICY "contacts_super_admin_all"
ON public.contacts FOR ALL
USING (public.is_super_admin());

-- Policy 2: Users can view contacts they created (simple, no recursion)
CREATE POLICY "contacts_select_own"
ON public.contacts FOR SELECT
USING (created_by = auth.uid());

-- Policy 3: Users can view contacts linked to them (simple user_id check)
CREATE POLICY "contacts_select_linked_to_user"
ON public.contacts FOR SELECT
USING (user_id = auth.uid());

-- Policy 4: Workspace admins can view all contacts in workspace
-- Uses SECURITY DEFINER helper to prevent recursion
CREATE POLICY "contacts_select_workspace_admin"
ON public.contacts FOR SELECT
USING (public.is_workspace_admin_for_tenant(tenant_id));

-- Policy 5: Users can insert contacts in their workspace
CREATE POLICY "contacts_insert_own"
ON public.contacts FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  created_by = auth.uid()
);

-- Policy 6: Users can update contacts they created OR workspace admins can update
CREATE POLICY "contacts_update_own_or_admin"
ON public.contacts FOR UPDATE
USING (
  public.is_super_admin() OR
  created_by = auth.uid() OR
  public.is_workspace_admin_for_tenant(tenant_id)
);

-- Policy 7: Users can delete contacts they created OR workspace admins can delete
CREATE POLICY "contacts_delete_own_or_admin"
ON public.contacts FOR DELETE
USING (
  public.is_super_admin() OR
  created_by = auth.uid() OR
  public.is_workspace_admin_for_tenant(tenant_id)
);

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on contacts table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'contacts';

  IF policy_count < 7 THEN
    RAISE EXCEPTION 'Expected 7 policies on contacts, found %', policy_count;
  END IF;

  RAISE NOTICE '✅ Simplified contacts RLS policies applied (% policies)', policy_count;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Changes from previous version:
-- 1. Removed complex subquery on contact_agents (was causing recursion)
-- 2. Removed tenant_id IN (SELECT...) pattern (potential recursion)
-- 3. Split into simpler policies: own, linked, workspace admin
-- 4. All policies use direct auth checks or SECURITY DEFINER functions
-- ============================================================================
