-- ============================================================================
-- CONNECTOR FRAMEWORK MIGRATION
-- ============================================================================
-- Creates tables and functions for the connector framework architecture.
-- Enables integration with external services (Gmail, Calendar, Zoom, etc.)
-- ============================================================================

-- ============================================================================
-- PHASE 1: Create connector_definitions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connector_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('communication', 'calendar', 'crm', 'property_data', 'marketing', 'document_management')),
  icon_url TEXT,
  oauth_provider TEXT CHECK (oauth_provider IN ('google', 'microsoft', 'zoom', 'custom')),
  oauth_client_id TEXT,
  oauth_scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  supported_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  requires_approval_by_default BOOLEAN DEFAULT true,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  max_connections_per_workspace INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_definitions_key ON public.connector_definitions(connector_key);
CREATE INDEX IF NOT EXISTS idx_connector_definitions_category ON public.connector_definitions(category);
CREATE INDEX IF NOT EXISTS idx_connector_definitions_active ON public.connector_definitions(is_active);

COMMENT ON TABLE public.connector_definitions IS 'Available connector types (Gmail, Calendar, Zoom, etc.)';
COMMENT ON COLUMN public.connector_definitions.connector_key IS 'Unique identifier (e.g., gmail, google_calendar)';
COMMENT ON COLUMN public.connector_definitions.oauth_provider IS 'OAuth provider type (google, microsoft, zoom, custom)';
COMMENT ON COLUMN public.connector_definitions.supported_actions IS 'Array of action types this connector supports';
COMMENT ON COLUMN public.connector_definitions.requires_approval_by_default IS 'Whether actions require user approval by default';

-- ============================================================================
-- PHASE 2: Create workspace_connectors table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_connectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connector_definition_id UUID NOT NULL REFERENCES public.connector_definitions(id) ON DELETE CASCADE,
  connected_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'expired')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::JSONB,
  auto_approve_actions BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, connector_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_connectors_workspace ON public.workspace_connectors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_connectors_definition ON public.workspace_connectors(connector_definition_id);
CREATE INDEX IF NOT EXISTS idx_workspace_connectors_status ON public.workspace_connectors(status);
CREATE INDEX IF NOT EXISTS idx_workspace_connectors_connected_by ON public.workspace_connectors(connected_by);

COMMENT ON TABLE public.workspace_connectors IS 'Active connector instances per workspace';
COMMENT ON COLUMN public.workspace_connectors.status IS 'Connector status: active, disconnected, error, expired';
COMMENT ON COLUMN public.workspace_connectors.auto_approve_actions IS 'Workspace-level override for auto-approval';

-- ============================================================================
-- PHASE 3: Create connector_credentials table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_connector_id UUID NOT NULL REFERENCES public.workspace_connectors(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Encrypted at application level
  refresh_token TEXT, -- Encrypted at application level
  token_expires_at TIMESTAMP WITH TIME ZONE,
  credentials_json JSONB DEFAULT '{}'::JSONB,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  encrypted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_credentials_workspace_connector ON public.connector_credentials(workspace_connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_credentials_expires_at ON public.connector_credentials(token_expires_at);

COMMENT ON TABLE public.connector_credentials IS 'Encrypted OAuth tokens and credentials (service role only)';
COMMENT ON COLUMN public.connector_credentials.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN public.connector_credentials.refresh_token IS 'Encrypted OAuth refresh token';

-- ============================================================================
-- PHASE 4: Create connector_actions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_connector_id UUID NOT NULL REFERENCES public.workspace_connectors(id) ON DELETE CASCADE,
  action_queue_id UUID, -- Link to action_queue if queued for approval
  action_type TEXT NOT NULL,
  action_params JSONB DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  result JSONB,
  error_message TEXT,
  error_code TEXT,
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMP WITH TIME ZONE,
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_actions_workspace_connector ON public.connector_actions(workspace_connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_actions_status ON public.connector_actions(status);
CREATE INDEX IF NOT EXISTS idx_connector_actions_created_at ON public.connector_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_connector_actions_action_queue ON public.connector_actions(action_queue_id);

COMMENT ON TABLE public.connector_actions IS 'Audit log of all connector actions';
COMMENT ON COLUMN public.connector_actions.action_queue_id IS 'Link to action_queue if queued for approval';

-- ============================================================================
-- PHASE 5: Create helper functions
-- ============================================================================

-- Get active connectors for a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_connectors(_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  connector_key text,
  name text,
  status text,
  last_sync_at timestamp with time zone,
  error_count integer,
  auto_approve_actions boolean
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
    wc.status,
    wc.last_sync_at,
    wc.error_count,
    wc.auto_approve_actions
  FROM public.workspace_connectors wc
  JOIN public.connector_definitions cd ON cd.id = wc.connector_definition_id
  WHERE wc.workspace_id = _workspace_id
    AND wc.status = 'active'
    AND cd.is_active = true;
$$;

COMMENT ON FUNCTION public.get_workspace_connectors(uuid) IS 'Get all active connectors for a workspace';

-- Check if workspace can add more connectors (based on subscription limits)
CREATE OR REPLACE FUNCTION public.can_add_connector(_workspace_id uuid, _connector_definition_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT (
    SELECT max_connections_per_workspace IS NULL 
    FROM public.connector_definitions 
    WHERE id = _connector_definition_id
  ) OR (
    SELECT COUNT(*) < (
      SELECT max_connections_per_workspace 
      FROM public.connector_definitions 
      WHERE id = _connector_definition_id
    )
    FROM public.workspace_connectors
    WHERE workspace_id = _workspace_id
      AND connector_definition_id = _connector_definition_id
  );
$$;

COMMENT ON FUNCTION public.can_add_connector(uuid, uuid) IS 'Check if workspace can add more connectors (based on subscription limits)';

-- Update connector sync time and clear errors
CREATE OR REPLACE FUNCTION public.update_connector_sync(_workspace_connector_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.workspace_connectors
  SET 
    last_sync_at = now(),
    error_count = 0,
    last_error = NULL,
    status = 'active',
    updated_at = now()
  WHERE id = _workspace_connector_id;
$$;

COMMENT ON FUNCTION public.update_connector_sync(uuid) IS 'Update connector last sync time and clear errors';

-- Record connector error and update error count/status
CREATE OR REPLACE FUNCTION public.record_connector_error(_workspace_connector_id uuid, _error_message text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.workspace_connectors
  SET 
    error_count = error_count + 1,
    last_error = _error_message,
    status = CASE 
      WHEN error_count + 1 >= 5 THEN 'error'
      ELSE status
    END,
    updated_at = now()
  WHERE id = _workspace_connector_id;
$$;

COMMENT ON FUNCTION public.record_connector_error(uuid, text) IS 'Record connector error and update error count/status';

-- ============================================================================
-- PHASE 6: Create RLS policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.connector_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_actions ENABLE ROW LEVEL SECURITY;

-- connector_definitions: Public read (anyone can see available connectors)
CREATE POLICY "connector_definitions_select_public"
  ON public.connector_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- workspace_connectors: Workspace members can view, admins can manage
CREATE POLICY "workspace_connectors_select_members"
  ON public.workspace_connectors FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_super_admin()) OR
    (SELECT public.is_workspace_member(workspace_id))
  );

CREATE POLICY "workspace_connectors_insert_admins"
  ON public.workspace_connectors FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_super_admin()) OR
    (SELECT public.is_workspace_admin(workspace_id))
  );

CREATE POLICY "workspace_connectors_update_admins"
  ON public.workspace_connectors FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.is_super_admin()) OR
    (SELECT public.is_workspace_admin(workspace_id))
  );

CREATE POLICY "workspace_connectors_delete_admins"
  ON public.workspace_connectors FOR DELETE
  TO authenticated
  USING (
    (SELECT public.is_super_admin()) OR
    (SELECT public.is_workspace_admin(workspace_id))
  );

-- connector_credentials: Service role only (never exposed to client)
-- No RLS policies - only service role can access via edge functions

-- connector_actions: Workspace members can view their connector actions
CREATE POLICY "connector_actions_select_members"
  ON public.connector_actions FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_super_admin()) OR
    EXISTS (
      SELECT 1 FROM public.workspace_connectors wc
      WHERE wc.id = connector_actions.workspace_connector_id
        AND (SELECT public.is_workspace_member(wc.workspace_id))
    )
  );

-- ============================================================================
-- PHASE 7: Seed initial connector definitions
-- ============================================================================

-- Gmail Connector
INSERT INTO public.connector_definitions (
  connector_key,
  name,
  description,
  category,
  oauth_provider,
  oauth_scopes,
  oauth_authorize_url,
  oauth_token_url,
  supported_actions,
  requires_approval_by_default,
  rate_limit_per_hour,
  max_connections_per_workspace,
  is_active,
  is_beta,
  metadata
) VALUES (
  'gmail',
  'Gmail',
  'Connect your Gmail account to send and receive emails through Smart Agent',
  'communication',
  'google',
  ARRAY['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  ARRAY['send_email', 'read_email', 'search_emails', 'create_draft', 'get_thread', 'get_message'],
  true,
  1000,
  NULL,
  true,
  false,
  '{"icon": "gmail", "color": "#EA4335"}'::JSONB
) ON CONFLICT (connector_key) DO NOTHING;

-- Google Calendar Connector (placeholder for future implementation)
INSERT INTO public.connector_definitions (
  connector_key,
  name,
  description,
  category,
  oauth_provider,
  oauth_scopes,
  oauth_authorize_url,
  oauth_token_url,
  supported_actions,
  requires_approval_by_default,
  rate_limit_per_hour,
  max_connections_per_workspace,
  is_active,
  is_beta,
  metadata
) VALUES (
  'google_calendar',
  'Google Calendar',
  'Connect your Google Calendar to manage events and appointments',
  'calendar',
  'google',
  ARRAY['https://www.googleapis.com/auth/calendar'],
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  ARRAY['create_event', 'list_events', 'update_event', 'delete_event'],
  true,
  1000,
  NULL,
  false, -- Not active yet, waiting for implementation
  true,
  '{"icon": "calendar", "color": "#4285F4"}'::JSONB
) ON CONFLICT (connector_key) DO NOTHING;

-- ============================================================================
-- PHASE 8: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connector_definitions_updated_at
  BEFORE UPDATE ON public.connector_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_connectors_updated_at
  BEFORE UPDATE ON public.workspace_connectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connector_credentials_updated_at
  BEFORE UPDATE ON public.connector_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connector_actions_updated_at
  BEFORE UPDATE ON public.connector_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
