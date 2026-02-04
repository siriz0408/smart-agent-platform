-- Fix subscriptions RLS INSERT policy
-- Issue: Subscriptions table has SELECT/UPDATE policies but no INSERT policy
-- This prevents creating new subscriptions when missing or for new tenants

-- Add INSERT policy for subscriptions
-- Allow service role (for triggers) and admins to insert subscriptions
CREATE POLICY "subscriptions_insert_policy" ON public.subscriptions
  FOR INSERT WITH CHECK (
    -- Allow if user is admin or super_admin for their tenant
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "subscriptions_insert_policy" ON public.subscriptions IS 
  'Allow admins and super_admins to create subscriptions for their tenant. Service role can bypass RLS for trigger operations.';
