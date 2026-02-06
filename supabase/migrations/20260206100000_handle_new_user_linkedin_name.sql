-- Migration: Update handle_new_user() to support LinkedIn OIDC name metadata
-- LinkedIn OIDC provides 'name' instead of 'full_name' in raw_user_meta_data.
-- This adds 'name' as a fallback so LinkedIn users get their real name in profiles.

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
  -- 'full_name' is used by email/password signup and Google OAuth
  -- 'name' is used by LinkedIn OIDC and some other providers
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
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

  -- Create subscription (default: free) - USING workspace_id
  INSERT INTO public.subscriptions (workspace_id, plan, status)
  VALUES (new_workspace_id, 'free', 'active');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates personal workspace and profile for new users. Supports name extraction from Google (full_name), LinkedIn OIDC (name), and email fallback. Sam gets super_admin, others get agent role.';
