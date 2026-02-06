-- ============================================================================
-- MIGRATE SUBSCRIPTIONS TO WORKSPACE MODEL
-- ============================================================================
-- This migration updates subscriptions table to use workspace_id instead of
-- tenant_id, enabling multi-workspace billing support.
-- ============================================================================

-- Step 1: Add workspace_id column (nullable initially for migration)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data (tenant_id = workspace_id since tenants was renamed)
UPDATE public.subscriptions
SET workspace_id = tenant_id
WHERE workspace_id IS NULL;

-- Step 3: Create index for workspace_id lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id 
ON public.subscriptions(workspace_id);

-- Step 4: Make workspace_id NOT NULL after migration
ALTER TABLE public.subscriptions
  ALTER COLUMN workspace_id SET NOT NULL;

-- Step 5: Add unique constraint on workspace_id (one subscription per workspace)
-- Drop existing unique constraint on tenant_id first if it exists
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_key;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_workspace_id_key UNIQUE (workspace_id);

-- Step 6: Update RLS policies to use workspace_id
-- Drop old policies
DROP POLICY IF EXISTS "users_view_own_subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "users_update_own_subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "users_insert_own_subscription" ON public.subscriptions;

-- Create new policies using workspace_id
CREATE POLICY "users_view_own_subscription"
ON public.subscriptions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = (SELECT auth.uid())
  )
  OR workspace_id IN (
    SELECT active_workspace_id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
  )
  OR workspace_id IN (
    SELECT tenant_id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "users_update_own_subscription"
ON public.subscriptions FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = (SELECT auth.uid())
    AND role IN ('owner', 'admin', 'super_admin')
  )
  OR (SELECT public.is_super_admin())
);

CREATE POLICY "users_insert_own_subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = (SELECT auth.uid())
    AND role IN ('owner', 'admin', 'super_admin')
  )
  OR (SELECT public.is_super_admin())
);

-- Step 7: Update handle_new_user() trigger to use workspace_id
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

  -- Create subscription (default: free) - NOW USING workspace_id
  INSERT INTO public.subscriptions (workspace_id, plan, status)
  VALUES (new_workspace_id, 'free', 'active');

  RETURN NEW;
END;
$$;

-- Step 8: Add comment documenting the migration
COMMENT ON COLUMN public.subscriptions.workspace_id IS 'Workspace ID (migrated from tenant_id). Each workspace has one subscription.';
COMMENT ON COLUMN public.subscriptions.tenant_id IS 'DEPRECATED: Use workspace_id instead. Kept for backward compatibility during migration.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- 1. Added workspace_id column to subscriptions
-- 2. Migrated data from tenant_id to workspace_id
-- 3. Added unique constraint on workspace_id
-- 4. Updated RLS policies to use workspace_id
-- 5. tenant_id column kept for backward compatibility (can be dropped later)
-- ============================================================================
