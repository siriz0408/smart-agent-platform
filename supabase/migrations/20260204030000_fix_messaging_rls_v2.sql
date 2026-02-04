-- Fix RLS policy for conversations - use a function for cleaner check

-- Create a helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the old policy
DROP POLICY IF EXISTS "Users can create conversations in their tenant" ON public.conversations;

-- Create simpler policy using the function
CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- Also add a delete policy for cleanup
CREATE POLICY "Users can delete their conversations"
  ON public.conversations FOR DELETE
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

SELECT 'Fixed conversations RLS with helper function' AS status;
