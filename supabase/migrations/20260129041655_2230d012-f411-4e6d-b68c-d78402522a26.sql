-- Add embedded_components column to ai_messages for storing structured UI components
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS embedded_components JSONB DEFAULT NULL;

-- Create index for efficient querying of messages with components
CREATE INDEX IF NOT EXISTS idx_ai_messages_has_components
ON ai_messages ((embedded_components IS NOT NULL));

-- Add documentation
COMMENT ON COLUMN ai_messages.embedded_components IS
'Stores structured UI components (property_cards, comparison_table, agent_result) to render in chat';