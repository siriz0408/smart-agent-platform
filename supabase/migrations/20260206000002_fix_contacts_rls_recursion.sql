-- ============================================================================
-- FIX CONTACTS RLS RECURSION
-- ============================================================================
-- The contacts_select_by_workspace policy queries workspace_memberships
-- which can cause recursion issues. Fix by using SECURITY DEFINER function.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create helper function to check if user is workspace admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_admin_for_tenant(_tenant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE user_id = auth.uid()
    AND workspace_id = _tenant_id
    AND role IN ('owner', 'admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_workspace_admin_for_tenant IS
'Check if current user is admin/owner of a workspace. Uses SECURITY DEFINER to prevent RLS recursion.';

-- ============================================================================
-- STEP 2: Recreate contacts SELECT policy without recursion
-- ============================================================================

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "contacts_select_by_workspace" ON public.contacts;

-- Recreate with SECURITY DEFINER helper
CREATE POLICY "contacts_select_by_workspace"
ON public.contacts FOR SELECT
USING (
  public.is_super_admin() OR
  -- Workspace admins see all contacts in workspace (using SECURITY DEFINER function)
  public.is_workspace_admin_for_tenant(tenant_id) OR
  -- Regular agents see only contacts they created OR are assigned via contact_agents
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND (
    created_by = auth.uid() OR
    id IN (
      SELECT contact_id FROM public.contact_agents WHERE agent_user_id = auth.uid()
    )
  ))
);

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  policy_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check policy was recreated
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'contacts'
    AND policyname = 'contacts_select_by_workspace'
  ) INTO policy_exists;

  -- Check helper function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_workspace_admin_for_tenant'
  ) INTO function_exists;

  IF NOT policy_exists THEN
    RAISE EXCEPTION 'contacts_select_by_workspace policy not found';
  END IF;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'is_workspace_admin_for_tenant function not found';
  END IF;

  RAISE NOTICE '✅ Contacts RLS recursion fix applied successfully';
END $$;
