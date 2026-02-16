import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { requireEnv } from "../_shared/validateEnv.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

interface McpCallRequest {
  mcp_type: "playwright" | "zillow" | "mls" | "vercel" | "supabase";
  tool_name: string;
  params: Record<string, unknown>;
  agent_run_id?: string;
}

interface McpCallResponse {
  success: boolean;
  mcp_call_id: string;
  data?: unknown;
  error?: string;
  rate_limit?: {
    remaining: number;
    reset_at: string;
  };
}

const RATE_LIMIT_PER_HOUR = 100;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for MCP logging
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Get tenant ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;

    // Parse request
    const requestBody: McpCallRequest = await req.json();
    const { mcp_type, tool_name, params, agent_run_id } = requestBody;

    if (!mcp_type || !tool_name) {
      return new Response(JSON.stringify({ error: "mcp_type and tool_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check rate limit
    const { data: rateLimitData } = await serviceClient.rpc("check_mcp_rate_limit", {
      p_tenant_id: tenantId,
      p_mcp_type: mcp_type,
      p_limit: RATE_LIMIT_PER_HOUR,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    });

    if (!rateLimitData?.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          rate_limit: {
            current: rateLimitData?.current_count || 0,
            limit: RATE_LIMIT_PER_HOUR,
            remaining: 0,
            reset_at: rateLimitData?.reset_at,
          },
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create MCP call log entry
    const { data: mcpCallLog, error: logError } = await serviceClient
      .from("mcp_call_logs")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        agent_run_id,
        mcp_type,
        tool_name,
        request_params: params,
        status: "in_progress",
      })
      .select()
      .single();

    if (logError) {
      logger.error("Error creating MCP call log", { error: logError.message });
      return new Response(JSON.stringify({ error: "Failed to create MCP call log" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();

    try {
      // Route to appropriate MCP handler
      let mcpResult: unknown;

      switch (mcp_type) {
        case "playwright":
          mcpResult = await handlePlaywrightMcp(tool_name, params, tenantId, userId, agent_run_id);
          break;

        case "zillow":
          mcpResult = await handleZillowMcp(tool_name, params, tenantId, userId, serviceClient);
          break;

        case "mls":
          // Future: MLS integration
          throw new Error("MLS MCP not yet implemented");

        case "vercel":
          // Future: Vercel deployment management
          throw new Error("Vercel MCP not yet implemented");

        case "supabase":
          // Future: Supabase database operations
          throw new Error("Supabase MCP not yet implemented");

        default:
          throw new Error(`Unknown MCP type: ${mcp_type}`);
      }

      const durationMs = Date.now() - startTime;

      // Update MCP call log with success
      await serviceClient
        .from("mcp_call_logs")
        .update({
          status: "completed",
          response_data: mcpResult,
          duration_ms: durationMs,
          rate_limit_remaining: rateLimitData?.remaining || 0,
          rate_limit_reset_at: rateLimitData?.reset_at,
          completed_at: new Date().toISOString(),
        })
        .eq("id", mcpCallLog.id);

      const response: McpCallResponse = {
        success: true,
        mcp_call_id: mcpCallLog.id,
        data: mcpResult,
        rate_limit: {
          remaining: rateLimitData?.remaining || 0,
          reset_at: rateLimitData?.reset_at,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (mcpError) {
      const durationMs = Date.now() - startTime;
      const errorMessage = mcpError instanceof Error ? mcpError.message : String(mcpError);

      // Update MCP call log with failure
      await serviceClient
        .from("mcp_call_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", mcpCallLog.id);

      logger.error("MCP execution error", { mcp_type, tool_name, error: errorMessage });

      const response: McpCallResponse = {
        success: false,
        mcp_call_id: mcpCallLog.id,
        error: errorMessage,
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "mcp-gateway",
      logContext: { endpoint: "mcp-gateway" },
    });
  }
});

// ============================================================================
// MCP HANDLERS
// ============================================================================

/**
 * Playwright MCP Handler
 * Routes to playwright-mcp function for browser automation
 */
async function handlePlaywrightMcp(
  toolName: string,
  params: Record<string, unknown>,
  tenantId: string,
  userId: string,
  agentRunId?: string
): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Route to playwright-mcp edge function
  const response = await fetch(`${supabaseUrl}/functions/v1/playwright-mcp`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tool_name: toolName,
      params,
      tenant_id: tenantId,
      user_id: userId,
      agent_run_id: agentRunId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Playwright MCP error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Zillow MCP Handler
 * Routes to real-estate-mcp function for property data
 */
async function handleZillowMcp(
  toolName: string,
  params: Record<string, unknown>,
  tenantId: string,
  userId: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Route to real-estate-mcp edge function
  const response = await fetch(`${supabaseUrl}/functions/v1/real-estate-mcp`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tool_name: toolName,
      params,
      tenant_id: tenantId,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zillow MCP error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}
