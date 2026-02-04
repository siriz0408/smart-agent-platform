-- ============================================================================
-- WORKSPACE ARCHITECTURE MIGRATION
-- ============================================================================
-- This migration transforms the tenant-based model into a Slack-like workspace
-- model with proper security, super_admin protection, and multi-workspace support.
-- ============================================================================

-- ============================================================================
-- PHASE 1.1: (MOVED TO SEPARATE MIGRATION 20260204195900)
-- ============================================================================
-- The 'owner' enum value is added in 20260204195900_add_owner_enum_value.sql
-- This must be separate because PostgreSQL requires a transaction commit
-- before new enum values can be used in functions.

-- ============================================================================
-- PHASE 1.2: Rename tenants to workspaces
-- ============================================================================
-- This will automatically update all foreign key references due to CASCADE

ALTER TABLE IF EXISTS public.tenants RENAME TO workspaces;

-- Update the demo tenant reference
COMMENT ON TABLE public.workspaces IS 'Workspaces (formerly tenants) - organizational units for data isolation';

-- ============================================================================
-- PHASE 1.3: Create is_super_admin() function (CRITICAL SECURITY)
-- ============================================================================
-- Hardcoded to Sam's email for platform-level admin access

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid())
    AND email = 'siriz04081@gmail.com'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Returns true if the current user is the platform super_admin (Sam only)';

-- ============================================================================
-- PHASE 1.4: Create workspace_memberships table
-- ============================================================================
-- This replaces the one-to-one tenant relationship with many-to-many workspaces

CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  is_owner BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_id ON public.workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_id ON public.workspace_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_role ON public.workspace_memberships(role);

COMMENT ON TABLE public.workspace_memberships IS 'User-workspace membership with roles (many-to-many relationship)';

-- ============================================================================
-- PHASE 1.5: Add active_workspace_id to profiles
-- ============================================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS active_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.active_workspace_id IS 'Currently active workspace for this user (for workspace switching)';

-- ============================================================================
-- PHASE 1.6: Migrate existing data to workspace_memberships
-- ============================================================================
-- Convert existing user_roles entries to workspace_memberships

INSERT INTO public.workspace_memberships (user_id, workspace_id, role, is_owner, joined_at)
SELECT 
  ur.user_id,
  ur.tenant_id,
  ur.role,
  -- Mark as owner if they have 'admin' role (first user of their tenant)
  CASE WHEN ur.role = 'admin' THEN true ELSE false END,
  ur.created_at
FROM public.user_roles ur
ON CONFLICT (user_id, workspace_id) DO NOTHING;

-- Update profiles to set active_workspace_id to their current tenant_id
UPDATE public.profiles
SET active_workspace_id = tenant_id
WHERE active_workspace_id IS NULL;

-- ============================================================================
-- PHASE 1.7: Create helper functions
-- ============================================================================

-- Get user's active workspace ID
CREATE OR REPLACE FUNCTION public.get_active_workspace_id(_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    -- First try active_workspace_id from profiles
    (SELECT active_workspace_id FROM public.profiles WHERE user_id = COALESCE(_user_id, (SELECT auth.uid()))),
    -- Fallback to tenant_id (legacy)
    (SELECT tenant_id FROM public.profiles WHERE user_id = COALESCE(_user_id, (SELECT auth.uid())))
  );
$$;

COMMENT ON FUNCTION public.get_active_workspace_id(uuid) IS 'Get the active workspace ID for a user';

-- Check if user is member of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = _workspace_id
    AND user_id = COALESCE(_user_id, (SELECT auth.uid()))
  );
$$;

-- Check if user is workspace admin or owner
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = _workspace_id
    AND user_id = COALESCE(_user_id, (SELECT auth.uid()))
    AND role IN ('owner', 'admin', 'super_admin')
  ) OR (SELECT public.is_super_admin());
$$;

-- ============================================================================
-- PHASE 1.8: Update handle_new_user() trigger
-- ============================================================================
-- New users now get:
-- 1. A personal workspace (named "{Name}'s Workspace")
-- 2. An 'agent' role (NOT admin) in that workspace
-- 3. Marked as owner of their personal workspace
-- 4. Active workspace set to their personal workspace

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
  workspace_slug text;
  user_name text;
  user_role app_role;
BEGIN
  -- Generate workspace slug from email
  workspace_slug := lower(split_part(NEW.email, '@', 1));
  workspace_slug := regexp_replace(workspace_slug, '[^a-z0-9]', '-', 'g');
  workspace_slug := workspace_slug || '-' || floor(extract(epoch from now()))::text;
  
  -- Get user's name from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Determine role: super_admin for Sam, agent for everyone else
  IF NEW.email = 'siriz04081@gmail.com' THEN
    user_role := 'super_admin';
  ELSE
    user_role := 'agent';
  END IF;

  -- Create personal workspace
  INSERT INTO public.workspaces (name, slug)
  VALUES (user_name || '''s Workspace', workspace_slug)
  RETURNING id INTO new_workspace_id;

  -- Create profile with active workspace
  INSERT INTO public.profiles (user_id, tenant_id, email, full_name, active_workspace_id)
  VALUES (NEW.id, new_workspace_id, NEW.email, user_name, new_workspace_id);

  -- Create workspace membership (owner of personal workspace)
  INSERT INTO public.workspace_memberships (user_id, workspace_id, role, is_owner)
  VALUES (NEW.id, new_workspace_id, user_role, true);

  -- Legacy: Create user_roles entry for backward compatibility
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_workspace_id, user_role);

  -- Create subscription (default: free)
  INSERT INTO public.subscriptions (tenant_id, plan, status)
  VALUES (new_workspace_id, 'free', 'active');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates personal workspace and profile for new users. Sam gets super_admin, others get agent role.';

-- ============================================================================
-- PHASE 1.9: Enable RLS on workspace_memberships
-- ============================================================================

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships
CREATE POLICY "users_view_own_memberships"
ON public.workspace_memberships FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Users can view other members in their workspaces
CREATE POLICY "users_view_workspace_members"
ON public.workspace_memberships FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Only super_admin or workspace owner/admin can insert memberships
CREATE POLICY "workspace_admins_insert_memberships"
ON public.workspace_memberships FOR INSERT
WITH CHECK (
  (SELECT public.is_super_admin()) OR
  (SELECT public.is_workspace_admin(workspace_id))
);

-- Only super_admin or workspace owner/admin can update memberships
CREATE POLICY "workspace_admins_update_memberships"
ON public.workspace_memberships FOR UPDATE
USING (
  (SELECT public.is_super_admin()) OR
  (SELECT public.is_workspace_admin(workspace_id))
);

-- Only super_admin or workspace owner/admin can delete memberships
CREATE POLICY "workspace_admins_delete_memberships"
ON public.workspace_memberships FOR DELETE
USING (
  (SELECT public.is_super_admin()) OR
  (SELECT public.is_workspace_admin(workspace_memberships.workspace_id))
);

-- ============================================================================
-- PHASE 1.10: Update existing helper functions for backward compatibility
-- ============================================================================

-- Update get_user_tenant_id to also work with active_workspace_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    active_workspace_id,
    tenant_id
  ) FROM public.profiles 
  WHERE user_id = COALESCE(_user_id, (SELECT auth.uid()));
$$;

-- Update is_admin to include super_admin check
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT (SELECT public.is_super_admin()) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = COALESCE(_user_id, (SELECT auth.uid()))
    AND role IN ('admin', 'super_admin', 'owner')
  );
$$;

-- ============================================================================
-- DONE: Migration complete
-- ============================================================================
-- Summary of changes:
-- 1. Renamed tenants to workspaces
-- 2. Created is_super_admin() function (hardcoded to Sam's email)
-- 3. Created workspace_memberships table with RLS
-- 4. Added active_workspace_id to profiles
-- 5. Migrated existing data to workspace_memberships
-- 6. Created helper functions for workspace operations
-- 7. Updated handle_new_user() trigger for new schema
-- ============================================================================
