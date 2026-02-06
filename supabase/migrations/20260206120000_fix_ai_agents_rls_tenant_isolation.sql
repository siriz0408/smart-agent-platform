-- Fix AI Agents RLS for Tenant Isolation
--
-- Problem: ai_agents table only has super_admin policy, blocking regular users
-- Solution: Add workspace-based RLS policies that enforce tenant isolation
--
-- Security Model:
-- - Public agents (tenant_id IS NULL) are accessible to all authenticated users
-- - Workspace-specific agents are only accessible to users in that workspace
-- - Users can only create/modify agents in their active workspace

-- ============================================================================
-- DROP EXISTING POLICIES (if any workspace-level ones exist)
-- ============================================================================

DROP POLICY IF EXISTS "ai_agents_workspace_select" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_workspace_insert" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_workspace_update" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_workspace_delete" ON public.ai_agents;

-- ============================================================================
-- CREATE WORKSPACE-BASED RLS POLICIES
-- ============================================================================

-- SELECT: Users can view public agents OR agents in their active workspace
CREATE POLICY "ai_agents_workspace_select"
ON public.ai_agents FOR SELECT
TO authenticated
USING (
  -- Public agents (system-wide)
  tenant_id IS NULL
  OR
  -- Agents in user's active workspace
  tenant_id IN (
    SELECT active_workspace_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create agents in their active workspace only
CREATE POLICY "ai_agents_workspace_insert"
ON public.ai_agents FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT active_workspace_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- UPDATE: Users can update agents they created in their active workspace
CREATE POLICY "ai_agents_workspace_update"
ON public.ai_agents FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT active_workspace_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
)
WITH CHECK (
  tenant_id IN (
    SELECT active_workspace_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- DELETE: Users can delete agents they created in their active workspace
CREATE POLICY "ai_agents_workspace_delete"
ON public.ai_agents FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT active_workspace_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "ai_agents_workspace_select" ON public.ai_agents IS
'Allow users to view public agents (tenant_id IS NULL) and agents in their active workspace';

COMMENT ON POLICY "ai_agents_workspace_insert" ON public.ai_agents IS
'Allow users to create agents in their active workspace';

COMMENT ON POLICY "ai_agents_workspace_update" ON public.ai_agents IS
'Allow users to update agents they created in their active workspace';

COMMENT ON POLICY "ai_agents_workspace_delete" ON public.ai_agents IS
'Allow users to delete agents they created in their active workspace';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'ai_agents') THEN
    RAISE EXCEPTION 'RLS is not enabled on ai_agents table';
  END IF;
END $$;

-- Count policies (should have at least 5: super_admin + 4 workspace policies)
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'ai_agents';

  IF policy_count < 5 THEN
    RAISE WARNING 'Expected at least 5 policies on ai_agents, found %', policy_count;
  END IF;
END $$;
