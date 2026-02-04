-- ============================================================================
-- OPEN MESSAGING RLS POLICIES
-- Allows any authenticated user in the same tenant to access messaging
-- ============================================================================

-- Drop existing restrictive policies on conversations
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_policy" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations in their tenant" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;

-- Drop existing restrictive policies on messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Drop existing restrictive policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;

-- Drop existing restrictive policies on typing_indicators
DROP POLICY IF EXISTS "Users can view typing in their conversations" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can set typing in their conversations" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can clear their typing indicator" ON public.typing_indicators;

-- ============================================================================
-- NEW OPEN POLICIES - Tenant-based access (anybody in same tenant can chat)
-- ============================================================================

-- Conversations: Any authenticated user in tenant can access
CREATE POLICY "open_conversations_select"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "open_conversations_insert"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "open_conversations_update"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "open_conversations_delete"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- Messages: Any authenticated user can view/send in tenant conversations
CREATE POLICY "open_messages_select"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "open_messages_insert"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "open_messages_update"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- Conversation Participants: Open access within tenant
CREATE POLICY "open_participants_select"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "open_participants_insert"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "open_participants_update"
  ON public.conversation_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "open_participants_delete"
  ON public.conversation_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
  );

-- Typing Indicators: Open access within tenant
CREATE POLICY "open_typing_select"
  ON public.typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "open_typing_insert"
  ON public.typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.tenant_id = public.get_user_tenant_id()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "open_typing_delete"
  ON public.typing_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT 'Opened messaging RLS to tenant-based access' AS status;
