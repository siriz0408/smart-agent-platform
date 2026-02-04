-- Fix RLS policy for conversations to use user_id column instead of id
-- The profiles table uses user_id to reference auth.users, not id

-- Drop the old policy
DROP POLICY IF EXISTS "Users can create conversations in their tenant" ON public.conversations;

-- Create corrected policy using user_id
CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Verify the fix
SELECT 'Fixed conversations INSERT policy to use profiles.user_id' AS status;
