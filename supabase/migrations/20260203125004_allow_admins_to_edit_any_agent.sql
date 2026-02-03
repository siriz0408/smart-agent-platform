-- Update RLS policies for ai_agents to allow admins to edit/delete any agent
-- Admins and super_admins can now manage all agents, not just ones they created

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update agents they created" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can delete agents they created" ON public.ai_agents;

-- Create new UPDATE policy: users can update their own agents OR admins can update any
CREATE POLICY "Users can update own agents or admins can update any"
  ON public.ai_agents FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Create new DELETE policy: users can delete their own agents OR admins can delete any
CREATE POLICY "Users can delete own agents or admins can delete any"
  ON public.ai_agents FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );
