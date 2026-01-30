-- Migration: Add NOT NULL constraints for data integrity
-- Addresses: Data integrity and query planner optimization
-- Impact: Prevents invalid data, helps Postgres optimize queries

-- Verify no NULL values exist before adding constraints
DO $$
BEGIN
  -- Check document_chunks.document_id
  IF EXISTS (SELECT 1 FROM document_chunks WHERE document_id IS NULL) THEN
    RAISE EXCEPTION 'Found NULL document_id in document_chunks. Clean up before migration.';
  END IF;

  -- Check ai_messages.conversation_id
  IF EXISTS (SELECT 1 FROM ai_messages WHERE conversation_id IS NULL) THEN
    RAISE EXCEPTION 'Found NULL conversation_id in ai_messages. Clean up before migration.';
  END IF;

  -- Check deal_milestones.deal_id
  IF EXISTS (SELECT 1 FROM deal_milestones WHERE deal_id IS NULL) THEN
    RAISE EXCEPTION 'Found NULL deal_id in deal_milestones. Clean up before migration.';
  END IF;

  -- Check contact_agents (both columns)
  IF EXISTS (SELECT 1 FROM contact_agents WHERE contact_id IS NULL OR agent_user_id IS NULL) THEN
    RAISE EXCEPTION 'Found NULL in contact_agents relationship. Clean up before migration.';
  END IF;
END $$;

-- Add NOT NULL constraints (safe after validation above)
ALTER TABLE public.document_chunks
  ALTER COLUMN document_id SET NOT NULL;

ALTER TABLE public.ai_messages
  ALTER COLUMN conversation_id SET NOT NULL;

ALTER TABLE public.deal_milestones
  ALTER COLUMN deal_id SET NOT NULL;

ALTER TABLE public.contact_agents
  ALTER COLUMN contact_id SET NOT NULL,
  ALTER COLUMN agent_user_id SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN public.document_chunks.document_id IS
  'Parent document (NOT NULL - every chunk must belong to a document)';
COMMENT ON COLUMN public.ai_messages.conversation_id IS
  'Parent conversation (NOT NULL - every message must belong to a conversation)';
