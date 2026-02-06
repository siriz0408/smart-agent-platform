-- CRITICAL FIX: Remove recursive policy causing 42P17 error
DROP POLICY IF EXISTS "users_view_workspace_members" ON public.workspace_memberships;
