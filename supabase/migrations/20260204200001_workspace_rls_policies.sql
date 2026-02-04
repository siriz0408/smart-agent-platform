-- ============================================================================
-- WORKSPACE RLS POLICY MIGRATION
-- ============================================================================
-- Updates RLS policies to use workspace-based isolation and adds super_admin
-- bypass where appropriate.
-- ============================================================================

-- ============================================================================
-- PHASE 2.1: Drop and recreate workspaces (formerly tenants) policies
-- ============================================================================

-- Drop old tenant policy (table was renamed to workspaces)
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.workspaces;

-- Users can view workspaces they are members of
CREATE POLICY "workspace_select_members"
ON public.workspaces FOR SELECT
USING (
  id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Super admins can view all workspaces
CREATE POLICY "workspace_select_super_admin"
ON public.workspaces FOR SELECT
USING ((SELECT public.is_super_admin()));

-- Authenticated users can create workspaces
CREATE POLICY "workspace_insert_authenticated"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

-- Workspace owners/admins can update their workspaces
CREATE POLICY "workspace_update_admins"
ON public.workspaces FOR UPDATE
USING (
  (SELECT public.is_super_admin()) OR
  (SELECT public.is_workspace_admin(id))
);

-- Workspace owners can delete their workspaces (not personal workspace)
CREATE POLICY "workspace_delete_owners"
ON public.workspaces FOR DELETE
USING (
  (SELECT public.is_super_admin()) OR
  EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = id
    AND user_id = (SELECT auth.uid())
    AND is_owner = true
  )
);

-- ============================================================================
-- PHASE 2.2: Update profiles policies
-- ============================================================================

-- Drop old profile policies
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Users can view profiles of users in their workspaces
CREATE POLICY "profiles_select_workspace_members"
ON public.profiles FOR SELECT
USING (
  user_id IN (
    SELECT wm.user_id FROM public.workspace_memberships wm
    WHERE wm.workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Super admins can view all profiles
CREATE POLICY "profiles_select_super_admin"
ON public.profiles FOR SELECT
USING ((SELECT public.is_super_admin()));

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (user_id = (SELECT auth.uid()));

-- Users can insert their own profile (for signup trigger)
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- Service role can manage profiles (for triggers)
CREATE POLICY "profiles_service_role"
ON public.profiles FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- PHASE 2.3: Update user_roles policies (for backward compatibility)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view roles in their tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their tenant" ON public.user_roles;

-- Users can view roles in their workspaces
CREATE POLICY "user_roles_select_workspace"
ON public.user_roles FOR SELECT
USING (
  tenant_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Super admins can view all roles
CREATE POLICY "user_roles_select_super_admin"
ON public.user_roles FOR SELECT
USING ((SELECT public.is_super_admin()));

-- Workspace admins can manage roles
CREATE POLICY "user_roles_manage_admins"
ON public.user_roles FOR ALL
USING (
  (SELECT public.is_super_admin()) OR
  (SELECT public.is_workspace_admin(tenant_id))
);

-- ============================================================================
-- PHASE 2.4: Add super_admin bypass to key tables
-- ============================================================================

-- Contacts: Super admin bypass
CREATE POLICY "contacts_super_admin"
ON public.contacts FOR ALL
USING ((SELECT public.is_super_admin()));

-- Properties: Super admin bypass
CREATE POLICY "properties_super_admin"
ON public.properties FOR ALL
USING ((SELECT public.is_super_admin()));

-- Deals: Super admin bypass
CREATE POLICY "deals_super_admin"
ON public.deals FOR ALL
USING ((SELECT public.is_super_admin()));

-- Documents: Super admin bypass
CREATE POLICY "documents_super_admin"
ON public.documents FOR ALL
USING ((SELECT public.is_super_admin()));

-- Subscriptions: Super admin bypass
CREATE POLICY "subscriptions_super_admin"
ON public.subscriptions FOR ALL
USING ((SELECT public.is_super_admin()));

-- AI Agents: Super admin bypass
CREATE POLICY "ai_agents_super_admin"
ON public.ai_agents FOR ALL
USING ((SELECT public.is_super_admin()));

-- ============================================================================
-- PHASE 2.5: Add indexes for RLS performance
-- ============================================================================

-- Index on profiles.active_workspace_id for workspace switching
CREATE INDEX IF NOT EXISTS idx_profiles_active_workspace_id 
ON public.profiles(active_workspace_id);

-- Index on profiles.user_id for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON public.profiles(user_id);

-- Composite index for common workspace queries
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_workspace 
ON public.workspace_memberships(user_id, workspace_id);

-- Index on user_roles for role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant 
ON public.user_roles(user_id, tenant_id);

-- ============================================================================
-- PHASE 2.6: Service role policies for backend operations
-- ============================================================================

-- Workspaces: Service role full access
CREATE POLICY "workspaces_service_role"
ON public.workspaces FOR ALL
USING (auth.role() = 'service_role');

-- Workspace memberships: Service role full access
CREATE POLICY "workspace_memberships_service_role"
ON public.workspace_memberships FOR ALL
USING (auth.role() = 'service_role');

-- User roles: Service role full access
CREATE POLICY "user_roles_service_role"
ON public.user_roles FOR ALL
USING (auth.role() = 'service_role');

-- Subscriptions: Service role full access
CREATE POLICY "subscriptions_service_role"
ON public.subscriptions FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- DONE: RLS Policy Migration Complete
-- ============================================================================
-- Summary:
-- 1. Updated workspaces (tenants) table policies
-- 2. Updated profiles policies for workspace-based access
-- 3. Updated user_roles policies (backward compatible)
-- 4. Added super_admin bypass to key tables
-- 5. Added performance indexes
-- 6. Added service role policies for backend operations
-- ============================================================================
