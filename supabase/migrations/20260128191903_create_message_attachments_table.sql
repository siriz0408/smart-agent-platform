-- Migration: Create message_attachments table
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.4

-- Create message_attachments table for multiple files per message
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size INTEGER NOT NULL, -- bytes
  storage_path TEXT NOT NULL, -- path in storage bucket

  -- Optional thumbnail for images
  thumbnail_path TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_message_attachments_message ON public.message_attachments(message_id);

-- Enable RLS
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Conversation participants only
CREATE POLICY "Conversation participants can view attachments"
  ON public.message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Message senders can insert attachments"
  ON public.message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

CREATE POLICY "Message senders can delete their attachments"
  ON public.message_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

COMMENT ON TABLE public.message_attachments IS 'File attachments for messages - supports multiple files per message';

-- Note: Storage bucket 'message-attachments' should be created via Supabase dashboard
-- Path pattern: {conversation_id}/{message_id}/{filename}
