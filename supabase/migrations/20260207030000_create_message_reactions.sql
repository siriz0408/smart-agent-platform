-- Migration: Create message_reactions table
-- COM-005: Implement message reactions for the messaging system

-- Create the message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Prevent duplicate reactions: same user can't add the same emoji to the same message twice
  CONSTRAINT unique_user_message_emoji UNIQUE (message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient queries
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);
CREATE INDEX idx_message_reactions_tenant_id ON public.message_reactions(tenant_id);

-- RLS Policies (tenant isolation, same pattern as conversations)

-- SELECT: Users can see reactions in their tenant
CREATE POLICY "message_reactions_select_policy"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- INSERT: Users can add reactions in their tenant
CREATE POLICY "message_reactions_insert_policy"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND user_id = auth.uid()
  );

-- DELETE: Users can only remove their own reactions
CREATE POLICY "message_reactions_delete_policy"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND user_id = auth.uid()
  );

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

SELECT 'Created message_reactions table with RLS and realtime' AS status;
