-- ============================================================================
-- ADD AI_ENABLED TO WORKSPACE CONNECTORS
-- ============================================================================
-- Adds ai_enabled column to workspace_connectors table.
-- This enables MCP-style connector experience where users can toggle
-- which connectors the AI chat can access.
-- ============================================================================

-- Add ai_enabled column with default false
ALTER TABLE public.workspace_connectors
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.workspace_connectors.ai_enabled IS 'Whether AI chat can access this connector data (MCP-style toggle)';

-- Create index for efficient queries on ai_enabled connectors
CREATE INDEX IF NOT EXISTS idx_workspace_connectors_ai_enabled
ON public.workspace_connectors(workspace_id, ai_enabled)
WHERE ai_enabled = true;

-- Create function to get AI-enabled connectors for a workspace
CREATE OR REPLACE FUNCTION public.get_ai_enabled_connectors(_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  connector_key text,
  name text,
  description text,
  category text,
  supported_actions text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    wc.id,
    cd.connector_key,
    cd.name,
    cd.description,
    cd.category,
    cd.supported_actions
  FROM public.workspace_connectors wc
  JOIN public.connector_definitions cd ON cd.id = wc.connector_definition_id
  WHERE wc.workspace_id = _workspace_id
    AND wc.status = 'active'
    AND wc.ai_enabled = true
    AND cd.is_active = true;
$$;

COMMENT ON FUNCTION public.get_ai_enabled_connectors(uuid) IS 'Get all AI-enabled connectors for a workspace (MCP-style)';
