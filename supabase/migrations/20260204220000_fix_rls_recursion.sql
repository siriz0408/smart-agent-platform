-- ============================================================================
-- FIX RLS RECURSION - CRITICAL
-- ============================================================================
-- The profiles_select_workspace_members policy causes infinite recursion:
--   profiles policy -> queries workspace_memberships -> workspace_memberships policy 
--   -> queries profiles -> infinite loop!
-- 
-- Fix: Use SECURITY DEFINER function get_user_tenant_id() which bypasses RLS
-- to safely get the user's tenant_id without triggering recursion.
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure the SECURITY DEFINER helper function exists
-- ============================================================================
-- This function bypasses RLS to get user's tenant_id safely
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Also create version that accepts user_id parameter
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: Fix profiles policies - remove circular dependency
-- ============================================================================

-- Drop ALL existing profiles SELECT policies to start fresh
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_workspace_members" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_workspace" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

-- Policy 1: Users can always view their own profile (no recursion - direct user_id check)
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can view profiles in their tenant using SECURITY DEFINER function
-- The function bypasses RLS so no recursion occurs
CREATE POLICY "profiles_select_same_tenant"
ON public.profiles FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

-- Policy 3: Super admins can view all profiles
CREATE POLICY "profiles_select_super_admin"
ON public.profiles FOR SELECT
USING (public.is_super_admin());

-- ============================================================================
-- STEP 3: Fix workspace_memberships policies - prevent recursion
-- ============================================================================

-- Drop ALL existing workspace_memberships policies to start fresh
DROP POLICY IF EXISTS "users_view_own_memberships" ON public.workspace_memberships;
DROP POLICY IF EXISTS "workspace_admins_insert_memberships" ON public.workspace_memberships;
DROP POLICY IF EXISTS "workspace_admins_update_memberships" ON public.workspace_memberships;
DROP POLICY IF EXISTS "workspace_admins_delete_memberships" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_select_own" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_select_super_admin" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_select_same_workspace" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_insert_admin" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_update_admin" ON public.workspace_memberships;
DROP POLICY IF EXISTS "memberships_delete_admin" ON public.workspace_memberships;
DROP POLICY IF EXISTS "workspace_memberships_service_role" ON public.workspace_memberships;

-- Policy 1: Users can view their own memberships (simple user_id check - no recursion)
CREATE POLICY "wm_select_own"
ON public.workspace_memberships FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Super admin can view all memberships
CREATE POLICY "wm_select_super_admin"
ON public.workspace_memberships FOR SELECT
USING (public.is_super_admin());

-- Policy 3: Service role full access
CREATE POLICY "wm_service_role"
ON public.workspace_memberships FOR ALL
USING (auth.role() = 'service_role');

-- Policy 4: Users can INSERT into workspaces where they are owner/admin
-- Uses a subquery on their own memberships (allowed since wm_select_own permits this)
CREATE POLICY "wm_insert_admin"
ON public.workspace_memberships FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.workspace_memberships existing
    WHERE existing.workspace_id = workspace_memberships.workspace_id
    AND existing.user_id = auth.uid()
    AND (existing.is_owner = true OR existing.role IN ('admin', 'owner'))
  )
);

-- Policy 5: Workspace admins can UPDATE memberships
CREATE POLICY "wm_update_admin"
ON public.workspace_memberships FOR UPDATE
USING (
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.workspace_memberships existing
    WHERE existing.workspace_id = workspace_memberships.workspace_id
    AND existing.user_id = auth.uid()
    AND (existing.is_owner = true OR existing.role IN ('admin', 'owner'))
  )
);

-- Policy 6: Workspace admins can DELETE memberships
CREATE POLICY "wm_delete_admin"
ON public.workspace_memberships FOR DELETE
USING (
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.workspace_memberships existing
    WHERE existing.workspace_id = workspace_memberships.workspace_id
    AND existing.user_id = auth.uid()
    AND (existing.is_owner = true OR existing.role IN ('admin', 'owner'))
  )
);

-- ============================================================================
-- DONE: RLS recursion fix complete
-- ============================================================================
-- Summary:
-- 1. profiles policies now use get_user_tenant_id() SECURITY DEFINER function
-- 2. workspace_memberships policies use simple user_id = auth.uid() check
-- 3. No circular dependencies between profiles and workspace_memberships
-- ============================================================================
