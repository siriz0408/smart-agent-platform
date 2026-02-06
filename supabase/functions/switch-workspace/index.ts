import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SwitchWorkspaceRequest {
  workspaceId: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's auth for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create service client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId }: SwitchWorkspaceRequest = await req.json();

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a member of the workspace
    const { data: membership, error: membershipError } = await supabaseUser
      .from("workspace_memberships")
      .select("id, role, is_owner")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      logger.error("User not a member of workspace", { userId: user.id, workspaceId });
      return new Response(JSON.stringify({ error: "You are not a member of this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update user's active_workspace_id in their profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ active_workspace_id: workspaceId })
      .eq("user_id", user.id);

    if (updateError) {
      logger.error("Failed to update active workspace", { error: updateError });
      return new Response(JSON.stringify({ error: "Failed to switch workspace" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace details for response
    const { data: workspace, error: workspaceError } = await supabaseUser
      .from("workspaces")
      .select("id, name, slug, subscription_tier")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) {
      logger.warn("Workspace details fetch failed", { error: workspaceError });
    }

    logger.info("Workspace switched successfully", { 
      userId: user.id, 
      workspaceId,
      workspaceName: workspace?.name 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      workspace: workspace || { id: workspaceId },
      membership: {
        role: membership.role,
        isOwner: membership.is_owner
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, { functionName: "switch-workspace" });
  }
});
