/**
 * Connector Framework Types
 * 
 * Defines TypeScript interfaces for the connector framework architecture.
 * Used by connector implementations and the connector execution engine.
 */

// ============================================================================
// Core Types
// ============================================================================

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

export type ConnectorActionStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type OAuthProvider =
  | 'google'
  | 'microsoft'
  | 'zoom'
  | 'custom';

// ============================================================================
// Connector Definition
// ============================================================================

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

// ============================================================================
// Workspace Connector Instance
// ============================================================================

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
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Connector Credentials (Decrypted)
// ============================================================================

export interface ConnectorCredentials {
  id: string;
  workspace_connector_id: string;
  access_token: string; // Decrypted
  refresh_token: string | null; // Decrypted
  token_expires_at: string | null;
  credentials_json: Record<string, unknown>;
  token_type: string;
  scope: string | null;
  encrypted_at: string;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Connector Action
// ============================================================================

export interface ConnectorAction {
  id: string;
  workspace_connector_id: string;
  action_queue_id: string | null;
  action_type: string;
  action_params: Record<string, unknown>;
  status: ConnectorActionStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  error_code: string | null;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  request_data: Record<string, unknown> | null;
  response_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Action Execution Types
// ============================================================================

export interface ConnectorActionRequest {
  connector_key: string;
  action_type: string;
  action_params: Record<string, unknown>;
  workspace_id: string;
  user_id: string;
  agent_run_id?: string;
  requires_approval?: boolean;
}

export interface ConnectorActionResponse {
  success: boolean;
  action_id: string;
  connector_action_id?: string;
  action_queue_id?: string; // If queued for approval
  result?: Record<string, unknown>;
  error?: string;
  rate_limit?: {
    remaining: number;
    reset_at: string;
  };
}

// ============================================================================
// OAuth Types
// ============================================================================

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface OAuthConfig {
  client_id: string;
  client_secret: string;
  authorize_url: string;
  token_url: string;
  redirect_uri: string;
  scopes: string[];
}

// ============================================================================
// Connector Implementation Interface
// ============================================================================

/**
 * Base interface that all connector implementations must follow
 */
export interface IConnector {
  /**
   * Unique connector key (e.g., 'gmail', 'google_calendar')
   */
  readonly connectorKey: string;

  /**
   * Execute an action through this connector
   * @param actionType - Type of action to execute
   * @param params - Action parameters
   * @param credentials - Decrypted credentials for this connector instance
   * @returns Action result
   */
  execute(
    actionType: string,
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult>;

  /**
   * Validate action parameters before execution
   * @param actionType - Type of action
   * @param params - Action parameters
   * @returns Validation result
   */
  validateAction(
    actionType: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] };

  /**
   * Refresh OAuth token if expired
   * @param credentials - Current credentials
   * @returns New credentials with refreshed token
   */
  refreshToken?(
    credentials: ConnectorCredentials
  ): Promise<ConnectorCredentials>;

  /**
   * Get supported action types for this connector
   */
  getSupportedActions(): string[];
}

export interface ConnectorActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  error_code?: string;
  rate_limit?: {
    remaining: number;
    reset_at: string;
  };
}

// ============================================================================
// Connector Registry
// ============================================================================

/**
 * Registry for connector implementations
 */
export class ConnectorRegistry {
  private connectors: Map<string, IConnector> = new Map();

  /**
   * Register a connector implementation
   */
  register(connector: IConnector): void {
    this.connectors.set(connector.connectorKey, connector);
  }

  /**
   * Get connector by key
   */
  get(connectorKey: string): IConnector | undefined {
    return this.connectors.get(connectorKey);
  }

  /**
   * Get all registered connectors
   */
  getAll(): IConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Check if connector is registered
   */
  has(connectorKey: string): boolean {
    return this.connectors.has(connectorKey);
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitInfo {
  allowed: boolean;
  current_count: number;
  limit: number;
  remaining: number;
  reset_at: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class ConnectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public connectorKey?: string,
    public actionType?: string
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

export class ConnectorAuthError extends ConnectorError {
  constructor(message: string, connectorKey?: string) {
    super(message, 'AUTH_ERROR', connectorKey);
    this.name = 'ConnectorAuthError';
  }
}

export class ConnectorRateLimitError extends ConnectorError {
  constructor(
    message: string,
    public resetAt: string,
    connectorKey?: string
  ) {
    super(message, 'RATE_LIMIT_ERROR', connectorKey);
    this.name = 'ConnectorRateLimitError';
  }
}

export class ConnectorValidationError extends ConnectorError {
  constructor(
    message: string,
    public validationErrors: string[],
    connectorKey?: string,
    actionType?: string
  ) {
    super(message, 'VALIDATION_ERROR', connectorKey, actionType);
    this.name = 'ConnectorValidationError';
  }
}
