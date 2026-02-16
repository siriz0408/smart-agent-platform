/**
 * Connector Action Execution Engine
 * 
 * Executes connector actions (Gmail, Calendar, etc.) with:
 * - Workspace validation
 * - Rate limiting
 * - Credential loading and decryption
 * - Action approval workflow
 * - Audit logging
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import {
  ConnectorRegistry,
  ConnectorActionRequest,
  ConnectorActionResponse,
  ConnectorCredentials,
  ConnectorError,
  ConnectorAuthError,
  ConnectorRateLimitError,
} from "../_shared/connector-types.ts";
import { GmailConnector } from "../_shared/connectors/gmail-connector.ts";
import { BridgeMLSConnector } from "../_shared/connectors/bridge-mls-connector.ts";
import { GoogleCalendarConnector } from "../_shared/connectors/google-calendar-connector.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

// Initialize connector registry
const registry = new ConnectorRegistry();
registry.register(new GmailConnector());
registry.register(new BridgeMLSConnector());
registry.register(new GoogleCalendarConnector());

/**
 * Decrypt credentials (placeholder - implement actual decryption)
 * In production, use proper encryption/decryption library
 */
async function decryptCredentials(
  encryptedCredentials: Record<string, unknown>
): Promise<ConnectorCredentials> {
  // TODO: Implement actual decryption logic
  // For now, assume credentials are stored encrypted and need decryption
  // This is a placeholder that returns the structure as-is
  // In production, decrypt access_token and refresh_token fields
  
  return {
    id: encryptedCredentials.id as string,
    workspace_connector_id: encryptedCredentials.workspace_connector_id as string,
    access_token: encryptedCredentials.access_token as string, // Should be decrypted
    refresh_token: encryptedCredentials.refresh_token as string | undefined, // Should be decrypted
    token_expires_at: (encryptedCredentials.token_expires_at as string | null) ?? null,
    credentials_json: (encryptedCredentials.credentials_json as Record<string, unknown>) || {},
    token_type: (encryptedCredentials.token_type as string) || 'Bearer',
    scope: encryptedCredentials.scope as string | undefined,
    encrypted_at: encryptedCredentials.encrypted_at as string | undefined,
    last_refreshed_at: encryptedCredentials.last_refreshed_at as string | undefined,
    created_at: encryptedCredentials.created_at as string,
    updated_at: encryptedCredentials.updated_at as string,
  };
}

/**
 * Check rate limits for workspace connector
 */
async function checkRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  workspaceConnectorId: string,
  connectorDefinitionId: string
): Promise<{ allowed: boolean; resetAt?: string }> {
  // Get connector definition for rate limit
  const { data: definition } = await serviceClient
    .from('connector_definitions')
    .select('rate_limit_per_hour')
    .eq('id', connectorDefinitionId)
    .single();

  if (!definition?.rate_limit_per_hour) {
    return { allowed: true }; // No rate limit
  }

  const rateLimit = definition.rate_limit_per_hour;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Count actions in last hour
  const { data: recentActions, error } = await serviceClient
    .from('connector_actions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_connector_id', workspaceConnectorId)
    .gte('created_at', oneHourAgo)
    .eq('status', 'completed');

  if (error) {
    logger.error('Error checking rate limit', { error: error.message });
    return { allowed: true }; // Fail open
  }

  const actionCount = recentActions?.length || 0;
  const allowed = actionCount < rateLimit;

  if (!allowed) {
    const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return { allowed: false, resetAt };
  }

  return { allowed: true };
}

/**
 * Load workspace connector and credentials
 */
async function loadConnectorData(
  serviceClient: ReturnType<typeof createClient>,
  connectorKey: string,
  workspaceId: string
): Promise<{
  workspaceConnector: Record<string, unknown>;
  connectorDefinition: Record<string, unknown>;
  credentials: ConnectorCredentials;
}> {
  // Get connector definition
  const { data: definition, error: defError } = await serviceClient
    .from('connector_definitions')
    .select('*')
    .eq('connector_key', connectorKey)
    .eq('is_active', true)
    .single();

  if (defError || !definition) {
    throw new ConnectorError(
      `Connector definition not found: ${connectorKey}`,
      'CONNECTOR_NOT_FOUND',
      connectorKey
    );
  }

  // Get workspace connector
  const { data: workspaceConnector, error: wsError } = await serviceClient
    .from('workspace_connectors')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('connector_definition_id', definition.id)
    .eq('status', 'active')
    .single();

  if (wsError || !workspaceConnector) {
    throw new ConnectorError(
      `Workspace connector not found or inactive: ${connectorKey}`,
      'WORKSPACE_CONNECTOR_NOT_FOUND',
      connectorKey
    );
  }

  // Get credentials
  const { data: encryptedCredentials, error: credError } = await serviceClient
    .from('connector_credentials')
    .select('*')
    .eq('workspace_connector_id', workspaceConnector.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (credError || !encryptedCredentials) {
    throw new ConnectorAuthError(
      `Credentials not found for connector: ${connectorKey}`,
      connectorKey
    );
  }

  const credentials = await decryptCredentials(encryptedCredentials);

  return {
    workspaceConnector,
    connectorDefinition: definition,
    credentials,
  };
}

/**
 * Log connector action
 */
async function logConnectorAction(
  serviceClient: ReturnType<typeof createClient>,
  workspaceConnectorId: string,
  actionType: string,
  actionParams: Record<string, unknown>,
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled',
  result?: Record<string, unknown>,
  error?: string,
  actionQueueId?: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from('connector_actions')
    .insert({
      workspace_connector_id: workspaceConnectorId,
      action_queue_id: actionQueueId || null,
      action_type: actionType,
      action_params: actionParams,
      status,
      result: result || null,
      error_message: error || null,
      started_at: status === 'executing' || status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null,
      completed_at: status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null,
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('Failed to log connector action', { error: error?.message });
    return '';
  }

  return data.id;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create authenticated client for user verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for executing actions
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = claimsData.user.id;

    // Parse request body
    const body: ConnectorActionRequest = await req.json().catch(() => {
      throw new Error("Invalid request body");
    });

    const {
      connector_key,
      action_type,
      action_params,
      workspace_id,
      user_id,
      agent_run_id,
      requires_approval,
    } = body;

    // Validate request
    if (!connector_key || !action_type || !workspace_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user has access to workspace
    const { data: membership } = await supabase
      .from('workspace_memberships')
      .select('workspace_id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Access denied to workspace" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load connector data
    let connectorData;
    try {
      connectorData = await loadConnectorData(serviceClient, connector_key, workspace_id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load connector data', { error: errorMessage, connector_key, workspace_id });
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { workspaceConnector, connectorDefinition, credentials } = connectorData;

    // Check if action requires approval
    const needsApproval = requires_approval !== false && 
      (connectorDefinition.requires_approval_by_default || !workspaceConnector.auto_approve_actions);

    if (needsApproval) {
      // TODO: Queue action for approval
      // For now, return error indicating approval is required
      const actionId = await logConnectorAction(
        serviceClient,
        workspaceConnector.id,
        action_type,
        action_params,
        'pending'
      );

      return new Response(
        JSON.stringify({
          success: false,
          action_id: actionId,
          action_queue_id: actionId, // Placeholder
          error: "Action requires approval",
        } as ConnectorActionResponse),
        {
          status: 202, // Accepted but pending approval
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(
      serviceClient,
      workspaceConnector.id,
      connectorDefinition.id
    );

    if (!rateLimitCheck.allowed) {
      throw new ConnectorRateLimitError(
        'Rate limit exceeded',
        rateLimitCheck.resetAt!,
        connector_key
      );
    }

    // Get connector implementation
    const connector = registry.get(connector_key);
    if (!connector) {
      return new Response(
        JSON.stringify({ error: `Connector not found: ${connector_key}` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log action start
    const actionId = await logConnectorAction(
      serviceClient,
      workspaceConnector.id,
      action_type,
      action_params,
      'executing'
    );

    // Execute action
    let result;
    try {
      result = await connector.execute(action_type, action_params, credentials);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logConnectorAction(
        serviceClient,
        workspaceConnector.id,
        action_type,
        action_params,
        'failed',
        undefined,
        errorMessage,
        undefined
      );

      // Update connector error count
      await serviceClient
        .from('workspace_connectors')
        .update({
          error_count: (workspaceConnector.error_count || 0) + 1,
          last_error: errorMessage,
          status: 'error',
        })
        .eq('id', workspaceConnector.id);

      return new Response(
        JSON.stringify({
          success: false,
          action_id: actionId,
          error: errorMessage,
        } as ConnectorActionResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log action completion
    await logConnectorAction(
      serviceClient,
      workspaceConnector.id,
      action_type,
      action_params,
      result.success ? 'completed' : 'failed',
      result.data,
      result.error,
      undefined
    );

    // Update connector sync time
    await serviceClient
      .from('workspace_connectors')
      .update({
        last_sync_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
        status: 'active',
      })
      .eq('id', workspaceConnector.id);

    // Return response
    const response: ConnectorActionResponse = {
      success: result.success,
      action_id: actionId,
      result: result.data,
      error: result.error,
      rate_limit: result.rate_limit,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "execute-connector-action",
      logContext: { endpoint: "execute-connector-action" },
    });
  }
});
