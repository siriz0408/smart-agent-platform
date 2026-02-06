import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  subscriptionTier?: "free" | "pro" | "team" | "enterprise";
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

    const { name, slug, subscriptionTier = "free" }: CreateWorkspaceRequest = await req.json();

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Workspace name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate slug from name if not provided
    const workspaceSlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug is already taken
    const { data: existingWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .single();

    if (existingWorkspace) {
      return new Response(JSON.stringify({ error: "Workspace slug already exists" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the workspace
    const { data: workspace, error: createError } = await supabaseAdmin
      .from("workspaces")
      .insert({
        name: name.trim(),
        slug: workspaceSlug,
        subscription_tier: subscriptionTier,
      })
      .select()
      .single();

    if (createError || !workspace) {
      logger.error("Failed to create workspace", { error: createError });
      return new Response(JSON.stringify({ error: "Failed to create workspace" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add creator as owner in workspace_memberships
    const { error: membershipError } = await supabaseAdmin
      .from("workspace_memberships")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
        is_owner: true,
      });

    if (membershipError) {
      logger.error("Failed to add creator to workspace", { error: membershipError });
      // Rollback workspace creation
      await supabaseAdmin.from("workspaces").delete().eq("id", workspace.id);
      return new Response(JSON.stringify({ error: "Failed to create workspace membership" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also add to legacy user_roles for backward compatibility
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        tenant_id: workspace.id,
        user_id: user.id,
        role: "admin", // admin in legacy system = owner in new system
      });

    if (roleError) {
      logger.warn("Failed to add legacy role", { error: roleError });
      // Non-fatal, continue
    }

    // Create subscription for the workspace
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        tenant_id: workspace.id,
        plan: subscriptionTier,
        status: "active",
        stripe_subscription_id: null,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (subscriptionError) {
      logger.warn("Failed to create subscription", { error: subscriptionError });
      // Non-fatal, continue
    }

    // Switch user to the new workspace
    await supabaseAdmin
      .from("profiles")
      .update({ active_workspace_id: workspace.id })
      .eq("user_id", user.id);

    logger.info("Workspace created successfully", { 
      userId: user.id, 
      workspaceId: workspace.id,
      workspaceName: workspace.name 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        subscriptionTier: workspace.subscription_tier,
      }
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, { functionName: "create-workspace" });
  }
});
