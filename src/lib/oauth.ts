/**
 * OAuth Helper Functions
 * 
 * Utilities for initiating OAuth flows and handling callbacks for connector integrations
 */

import { supabase } from "@/integrations/supabase/client";
import type { ConnectorDefinition } from "@/types/connector";

/**
 * Generate OAuth authorization URL for a connector
 */
export async function generateOAuthUrl(
  connectorDefinition: ConnectorDefinition,
  workspaceId: string,
  redirectUri: string
): Promise<string> {
  if (!connectorDefinition.oauth_provider || !connectorDefinition.oauth_authorize_url) {
    throw new Error(`Connector ${connectorDefinition.connector_key} does not support OAuth`);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Generate state parameter for CSRF protection
  const state = btoa(JSON.stringify({
    connector_key: connectorDefinition.connector_key,
    workspace_id: workspaceId,
    redirect_uri: redirectUri,
    timestamp: Date.now(),
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Store state in sessionStorage for verification on callback
  sessionStorage.setItem(`oauth_state_${connectorDefinition.connector_key}`, state);

  // Get client ID - prefer from definition, fallback to env var
  const clientId = connectorDefinition.oauth_client_id || getClientIdForProvider(connectorDefinition.oauth_provider);
  
  // Build OAuth authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: connectorDefinition.oauth_scopes?.join(' ') || '',
    state: state,
  });

  // Add provider-specific parameters
  if (connectorDefinition.oauth_provider === 'google') {
    params.append('access_type', 'offline'); // Request refresh token
    params.append('prompt', 'consent'); // Force consent screen to get refresh token
  } else if (connectorDefinition.oauth_provider === 'microsoft') {
    params.append('response_mode', 'query');
  }

  return `${connectorDefinition.oauth_authorize_url}?${params.toString()}`;
}

/**
 * Get client ID from environment variables based on provider
 */
function getClientIdForProvider(provider: string): string {
  const envKey = `VITE_${provider.toUpperCase()}_CLIENT_ID`;
  const clientId = import.meta.env[envKey];
  
  if (!clientId) {
    throw new Error(`Missing ${envKey} environment variable`);
  }
  
  return clientId;
}

/**
 * Handle OAuth callback - exchange code for tokens and create workspace connector
 */
export async function handleOAuthCallback(
  connectorKey: string,
  workspaceId: string,
  code: string,
  redirectUri: string,
  state?: string
): Promise<void> {
  // Verify state if provided
  if (state) {
    const storedState = sessionStorage.getItem(`oauth_state_${connectorKey}`);
    if (storedState !== state) {
      throw new Error("Invalid state parameter - possible CSRF attack");
    }
    sessionStorage.removeItem(`oauth_state_${connectorKey}`);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Call oauth-callback edge function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connector_key: connectorKey,
        workspace_id: workspaceId,
        code,
        redirect_uri: redirectUri,
        state,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `OAuth callback failed: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to complete OAuth connection");
  }
}

/**
 * Check if current URL contains OAuth callback parameters
 */
export function parseOAuthCallback(): {
  code: string | null;
  state: string | null;
  error: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
  };
}
