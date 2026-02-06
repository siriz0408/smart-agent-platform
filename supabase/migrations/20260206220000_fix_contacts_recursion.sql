-- CRITICAL FIX: Remove recursive contact policies causing 42P17 error
-- The "contacts_select_by_workspace" policy from contact_user_linking migration
-- queries workspace_memberships, which can create recursion cycles.

DROP POLICY IF EXISTS "contacts_select_by_workspace" ON public.contacts;
DROP POLICY IF EXISTS "users_view_own_linked_contacts" ON public.contacts;

-- These policies from the simplify migration should already exist (idempotent)
-- Policy 1: Service role full access
DROP POLICY IF EXISTS "contacts_service_role" ON public.contacts;
CREATE POLICY "contacts_service_role"
ON public.contacts FOR ALL
USING (auth.role() = 'service_role');

-- Policy 2: Super admin sees all
DROP POLICY IF EXISTS "contacts_select_super_admin" ON public.contacts;
CREATE POLICY "contacts_select_super_admin"
ON public.contacts FOR SELECT
USING (public.is_super_admin());

-- Policy 3: Users can view contacts they created
DROP POLICY IF EXISTS "contacts_select_own" ON public.contacts;
CREATE POLICY "contacts_select_own"
ON public.contacts FOR SELECT
USING (created_by = auth.uid());

-- Policy 4: Users can view contacts linked to them
DROP POLICY IF EXISTS "contacts_select_linked_to_user" ON public.contacts;
CREATE POLICY "contacts_select_linked_to_user"
ON public.contacts FOR SELECT
USING (user_id = auth.uid());

-- Policy 5: Workspace admins can view all contacts in workspace
-- Uses SECURITY DEFINER helper to prevent recursion
DROP POLICY IF EXISTS "contacts_select_workspace_admin" ON public.contacts;
CREATE POLICY "contacts_select_workspace_admin"
ON public.contacts FOR SELECT
USING (public.is_workspace_admin_for_tenant(tenant_id));
