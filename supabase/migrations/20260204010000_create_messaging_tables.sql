-- ============================================================================
-- MESSAGING SYSTEM TABLES
-- Creates conversations, messages, conversation_participants, typing_indicators,
-- and message_attachments tables for real-time agent-to-client messaging
-- ============================================================================

-- ============================================================================
-- 1. CONVERSATIONS TABLE
-- Stores conversation metadata (direct or group chats)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title TEXT, -- Nullable, used for group chats
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE public.conversations IS 'Stores messaging conversations between agents and clients';
COMMENT ON COLUMN public.conversations.type IS 'Type of conversation: direct (1:1) or group';
COMMENT ON COLUMN public.conversations.title IS 'Optional title for group conversations';

-- ============================================================================
-- 2. MESSAGES TABLE
-- Stores individual messages within conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url TEXT, -- For file messages
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false NOT NULL
);

-- Add comments
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON COLUMN public.messages.message_type IS 'Type: text, file, or system message';
COMMENT ON COLUMN public.messages.file_url IS 'URL to attached file for file-type messages';
COMMENT ON COLUMN public.messages.is_deleted IS 'Soft delete flag - content hidden but metadata retained';

-- ============================================================================
-- 3. CONVERSATION_PARTICIPANTS TABLE
-- Tracks who is part of each conversation
-- Supports both authenticated users (agents) and contacts (clients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For agents/authenticated users
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE, -- For clients/contacts
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE, -- For read receipts
  muted BOOLEAN DEFAULT false NOT NULL,
  -- Ensure either user_id or contact_id is set (not both null)
  CONSTRAINT participant_must_exist CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL),
  -- Unique constraint to prevent duplicate participants
  CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id),
  CONSTRAINT unique_conversation_contact UNIQUE (conversation_id, contact_id)
);

-- Add comments
COMMENT ON TABLE public.conversation_participants IS 'Tracks participants in each conversation';
COMMENT ON COLUMN public.conversation_participants.user_id IS 'Authenticated user (agent) participant';
COMMENT ON COLUMN public.conversation_participants.contact_id IS 'Contact (client) participant';
COMMENT ON COLUMN public.conversation_participants.last_read_at IS 'Timestamp of last read message for read receipts';
COMMENT ON COLUMN public.conversation_participants.muted IS 'Whether participant has muted notifications';

-- ============================================================================
-- 4. TYPING_INDICATORS TABLE
-- Tracks who is currently typing in a conversation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  -- Unique constraint - one typing indicator per user per conversation
  CONSTRAINT unique_typing_indicator UNIQUE (conversation_id, user_id)
);

-- Add comments
COMMENT ON TABLE public.typing_indicators IS 'Real-time typing indicators for conversations';
COMMENT ON COLUMN public.typing_indicators.started_at IS 'When user started typing - expires after 5s (handled by frontend)';

-- ============================================================================
-- 5. MESSAGE_ATTACHMENTS TABLE
-- Stores metadata for file attachments on messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE public.message_attachments IS 'File attachment metadata for messages';
COMMENT ON COLUMN public.message_attachments.storage_path IS 'Path in Supabase storage bucket';
COMMENT ON COLUMN public.message_attachments.file_size IS 'File size in bytes';

-- ============================================================================
-- 6. HELPER FUNCTION: is_conversation_participant
-- Checks if a user is a participant in a conversation (for RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_conversation_participant IS 'Checks if user is a participant in the given conversation';

-- ============================================================================
-- 7. TRIGGER: Auto-update conversations.updated_at on new message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NEW.sent_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id 
  ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
  ON public.conversations(updated_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent 
  ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON public.messages(sender_id);

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
  ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_contact 
  ON public.conversation_participants(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation 
  ON public.conversation_participants(conversation_id);

-- Typing indicators index
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation 
  ON public.typing_indicators(conversation_id);

-- Message attachments index
CREATE INDEX IF NOT EXISTS idx_message_attachments_message 
  ON public.message_attachments(message_id);

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- Conversations: Users can see conversations they participate in
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- Messages: Users can see/send messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (
    sender_id = auth.uid()
  );

-- Conversation Participants: Users can see participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can add participants to their conversations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid())
    OR user_id = auth.uid() -- Allow self-join
  );

CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants FOR UPDATE
  USING (
    user_id = auth.uid()
  );

-- Typing Indicators: Same rules as messages
CREATE POLICY "Users can view typing in their conversations"
  ON public.typing_indicators FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can set typing in their conversations"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can clear their typing indicator"
  ON public.typing_indicators FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- Message Attachments: Follow message visibility rules
CREATE POLICY "Users can view attachments in their conversations"
  ON public.message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
      AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

CREATE POLICY "Users can add attachments to their messages"
  ON public.message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
      AND m.sender_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. ENABLE REALTIME
-- ============================================================================

DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'typing_indicators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;

-- ============================================================================
-- 12. STORAGE BUCKET FOR ATTACHMENTS
-- ============================================================================

-- Create storage bucket for message attachments (if storage extension available)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Allow participants to upload/download attachments
CREATE POLICY "Authenticated users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view message attachments in their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Messaging tables created successfully' AS status;
