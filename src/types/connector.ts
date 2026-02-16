/**
 * Connector Framework Types
 * 
 * Frontend types matching the connector framework architecture.
 */

export type ConnectorCategory =
  | 'communication'
  | 'calendar'
  | 'crm'
  | 'property_data'
  | 'marketing'
  | 'document_management';

export type ConnectorStatus =
  | 'active'
  | 'disconnected'
  | 'error'
  | 'expired';

export type OAuthProvider =
  | 'google'
  | 'microsoft'
  | 'zoom'
  | 'custom';

export interface ConnectorDefinition {
  id: string;
  connector_key: string;
  name: string;
  description: string | null;
  category: ConnectorCategory;
  icon_url: string | null;
  oauth_provider: OAuthProvider | null;
  oauth_client_id: string | null;
  oauth_scopes: string[];
  oauth_authorize_url: string | null;
  oauth_token_url: string | null;
  supported_actions: string[];
  requires_approval_by_default: boolean;
  rate_limit_per_hour: number;
  max_connections_per_workspace: number | null;
  is_active: boolean;
  is_beta: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceConnector {
  id: string;
  workspace_id: string;
  connector_definition_id: string;
  connected_by: string;
  connected_at: string;
  status: ConnectorStatus;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  config: Record<string, unknown>;
  auto_approve_actions: boolean;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * AI-enabled connector info returned from get_ai_enabled_connectors function
 */
export interface AIEnabledConnector {
  id: string;
  connector_key: string;
  name: string;
  description: string | null;
  category: ConnectorCategory;
  supported_actions: string[];
}
