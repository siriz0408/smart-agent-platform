import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { processQueuedAction, ActionResult } from "../_shared/agentActions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecuteActionsRequest {
  // Execute a specific action by ID
  action_id?: string;
  // Execute all approved actions for a tenant
  process_approved?: boolean;
  // Limit how many to process
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

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

    const body: ExecuteActionsRequest = await req.json().catch(() => ({}));
    const { action_id, process_approved = false, limit = 10 } = body;

    const results: { action_id: string; result: ActionResult }[] = [];

    if (action_id) {
      // Execute a specific action
      // First verify the action belongs to this tenant
      const { data: action, error: actionError } = await supabase
        .from("action_queue")
        .select("id, tenant_id, status")
        .eq("id", action_id)
        .single();

      if (actionError || !action) {
        return new Response(JSON.stringify({ error: "Action not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.tenant_id !== tenantId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.status !== "approved" && action.status !== "pending") {
        return new Response(
          JSON.stringify({ 
            error: `Action cannot be executed (status: ${action.status})` 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // If pending, approve it first
      if (action.status === "pending") {
        await serviceClient
          .from("action_queue")
          .update({ 
            status: "approved", 
            approved_by: userId, 
            approved_at: new Date().toISOString() 
          })
          .eq("id", action_id);
      }

      const result = await processQueuedAction(serviceClient, action_id);
      results.push({ action_id, result });

    } else if (process_approved) {
      // Process all approved actions for this tenant
      const { data: approvedActions, error: fetchError } = await serviceClient
        .from("action_queue")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (fetchError) {
        logger.error("Error fetching approved actions", { error: fetchError.message });
        return new Response(JSON.stringify({ error: "Failed to fetch actions" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const action of approvedActions || []) {
        try {
          const result = await processQueuedAction(serviceClient, action.id);
          results.push({ action_id: action.id, result });
        } catch (error) {
          logger.error("Error processing action", { 
            action_id: action.id, 
            error: error instanceof Error ? error.message : String(error) 
          });
          results.push({ 
            action_id: action.id, 
            result: { 
              success: false, 
              action_type: "unknown" as const,
              error: error instanceof Error ? error.message : "Unknown error" 
            } 
          });
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Either action_id or process_approved must be provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const successCount = results.filter(r => r.result.success).length;
    const failCount = results.filter(r => !r.result.success).length;

    logger.info("Actions processed", { total: results.length, success: successCount, failed: failCount });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    logger.error("Execute actions error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
