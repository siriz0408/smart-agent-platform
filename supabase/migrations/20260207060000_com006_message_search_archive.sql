-- ============================================================================
-- COM-006: Message Search & Conversation Archive
-- Adds archived column to conversations and full-text search index on messages
-- ============================================================================

-- 1. Add archived column to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.conversations.archived IS 'Whether conversation is archived by participants';

-- 2. Index for filtering archived conversations quickly
CREATE INDEX IF NOT EXISTS idx_conversations_archived
  ON public.conversations(archived);

-- 3. Full-text search index on message content for performant search
-- Using GIN index with to_tsvector for english full-text search
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON public.messages USING GIN (to_tsvector('english', content));

-- 4. Trigram index for ILIKE fallback searches (partial matches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
  ON public.messages USING GIN (content gin_trgm_ops);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
SELECT 'COM-006: Message search & archive migration complete' AS status;
