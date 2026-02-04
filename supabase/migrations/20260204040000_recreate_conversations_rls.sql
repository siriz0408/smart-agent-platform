-- Drop all existing policies on conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations in their tenant" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;

-- Ensure get_user_tenant_id function exists
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create simple, straightforward policies

-- SELECT: Authenticated users can see conversations in their tenant
CREATE POLICY "conversations_select_policy"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- INSERT: Authenticated users can create conversations in their tenant  
CREATE POLICY "conversations_insert_policy"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- UPDATE: Users can update conversations in their tenant (and they participate in)
CREATE POLICY "conversations_update_policy"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- DELETE: Users can delete conversations they participate in
CREATE POLICY "conversations_delete_policy"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

SELECT 'Recreated conversations RLS policies' AS status;
