/**
 * OAuth Callback Handler
 * 
 * Handles OAuth callbacks from external providers (Google, Microsoft, etc.)
 * Exchanges authorization codes for tokens and stores encrypted credentials.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Encrypt credentials (placeholder - implement actual encryption)
 * In production, use proper encryption/decryption library
 */
async function encryptCredentials(
  accessToken: string,
  refreshToken: string | null,
  tokenType: string = 'Bearer'
): Promise<{ access_token: string; refresh_token: string | null; token_type: string }> {
  // TODO: Implement actual encryption logic
  // For now, credentials are stored as-is (should be encrypted in production)
  // In production, encrypt access_token and refresh_token before storage
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
  };
}

/**
 * Exchange OAuth authorization code for tokens
 */
async function exchangeCodeForTokens(
  provider: string,
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}> {
  const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`);
  const clientSecret = Deno.env.get(`${provider.toUpperCase()}_CLIENT_SECRET`);

  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for provider: ${provider}`);
  }

  let tokenUrl: string;
  let body: URLSearchParams;

  switch (provider.toLowerCase()) {
    case 'google':
      tokenUrl = 'https://oauth2.googleapis.com/token';
      body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      break;

    case 'microsoft':
      tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'offline_access', // Request refresh token
      });
      break;

    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
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

    // Service client for storing credentials
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
    const body = await req.json().catch(() => {
      throw new Error("Invalid request body");
    });

    const {
      connector_key,
      workspace_id,
      code,
      redirect_uri,
      state, // Optional state parameter for CSRF protection
    } = body;

    // Validate request
    if (!connector_key || !workspace_id || !code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: connector_key, workspace_id, code, redirect_uri" }),
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
      .eq('user_id', userId)
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

    // Get connector definition
    const { data: connectorDefinition, error: defError } = await serviceClient
      .from('connector_definitions')
      .select('*')
      .eq('connector_key', connector_key)
      .eq('is_active', true)
      .single();

    if (defError || !connectorDefinition) {
      return new Response(
        JSON.stringify({ error: `Connector definition not found: ${connector_key}` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if workspace can add this connector
    const { data: canAdd } = await serviceClient.rpc('can_add_connector', {
      _workspace_id: workspace_id,
      _connector_definition_id: connectorDefinition.id,
    });

    if (!canAdd) {
      return new Response(
        JSON.stringify({ error: "Workspace has reached the maximum number of connections for this connector" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Exchange authorization code for tokens
    const oauthProvider = connectorDefinition.oauth_provider;
    if (!oauthProvider) {
      return new Response(
        JSON.stringify({ error: "Connector does not support OAuth" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let tokenData;
    try {
      tokenData = await exchangeCodeForTokens(oauthProvider, code, redirect_uri);
    } catch (error) {
      logger.error('OAuth token exchange failed', { error: error instanceof Error ? error.message : String(error) });
      return new Response(
        JSON.stringify({ error: `Token exchange failed: ${error instanceof Error ? error.message : String(error)}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Encrypt credentials
    const encryptedCredentials = await encryptCredentials(
      tokenData.access_token,
      tokenData.refresh_token || null,
      tokenData.token_type || 'Bearer'
    );

    // Calculate token expiration
    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Get or create workspace connector
    const { data: existingConnector } = await serviceClient
      .from('workspace_connectors')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('connector_definition_id', connectorDefinition.id)
      .single();

    let workspaceConnectorId: string;

    if (existingConnector) {
      // Update existing connector
      workspaceConnectorId = existingConnector.id;
      await serviceClient
        .from('workspace_connectors')
        .update({
          status: 'active',
          connected_by: userId,
          connected_at: new Date().toISOString(),
          error_count: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceConnectorId);
    } else {
      // Create new workspace connector
      const { data: newConnector, error: insertError } = await serviceClient
        .from('workspace_connectors')
        .insert({
          workspace_id,
          connector_definition_id: connectorDefinition.id,
          connected_by: userId,
          status: 'active',
        })
        .select('id')
        .single();

      if (insertError || !newConnector) {
        throw new Error(`Failed to create workspace connector: ${insertError?.message}`);
      }

      workspaceConnectorId = newConnector.id;
    }

    // Store encrypted credentials
    const { error: credError } = await serviceClient
      .from('connector_credentials')
      .insert({
        workspace_connector_id: workspaceConnectorId,
        access_token: encryptedCredentials.access_token,
        refresh_token: encryptedCredentials.refresh_token,
        token_type: encryptedCredentials.token_type,
        token_expires_at: tokenExpiresAt,
        scope: tokenData.scope || null,
        credentials_json: {
          provider: oauthProvider,
          expires_in: tokenData.expires_in,
        },
      });

    if (credError) {
      logger.error('Failed to store credentials', { error: credError.message });
      return new Response(
        JSON.stringify({ error: "Failed to store credentials" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        workspace_connector_id: workspaceConnectorId,
        connector_key,
        message: "Connector connected successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("OAuth callback error", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
