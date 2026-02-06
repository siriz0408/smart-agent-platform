import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";
import { checkRateLimit, rateLimitResponse, EMAIL_LIMITS } from "../_shared/rateLimit.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface InviteToWorkspaceRequest {
  email: string;
  role?: "admin" | "agent" | "buyer" | "seller";
  workspaceId?: string; // Optional - uses active workspace if not provided
}

const SUPER_ADMIN_EMAIL = "siriz04081@gmail.com";

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

    // Get user from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply rate limiting per user
    const rateLimitResult = checkRateLimit(user.id, EMAIL_LIMITS);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const { email, role = "agent", workspaceId }: InviteToWorkspaceRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine target workspace
    let targetWorkspaceId = workspaceId;
    
    if (!targetWorkspaceId) {
      // Get user's active workspace
      const { data: profile } = await supabaseUser
        .from("profiles")
        .select("active_workspace_id, tenant_id")
        .eq("user_id", user.id)
        .single();
      
      targetWorkspaceId = profile?.active_workspace_id || profile?.tenant_id;
    }

    if (!targetWorkspaceId) {
      return new Response(JSON.stringify({ error: "No workspace found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if inviter is admin/owner of the workspace (or super_admin)
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    
    if (!isSuperAdmin) {
      const { data: inviterMembership } = await supabaseUser
        .from("workspace_memberships")
        .select("role, is_owner")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", user.id)
        .single();

      const canInvite = inviterMembership?.is_owner || 
                        inviterMembership?.role === "owner" || 
                        inviterMembership?.role === "admin";

      if (!canInvite) {
        return new Response(JSON.stringify({ error: "Only workspace admins can invite users" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get workspace details
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, name")
      .eq("id", targetWorkspaceId)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const invitedUser = existingUser?.users?.find(u => u.email === email);

    if (invitedUser) {
      // User exists - check if already a member
      const { data: existingMembership } = await supabaseAdmin
        .from("workspace_memberships")
        .select("id")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", invitedUser.id)
        .single();

      if (existingMembership) {
        return new Response(JSON.stringify({ error: "User is already a member of this workspace" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add existing user to workspace
      const { error: membershipError } = await supabaseAdmin
        .from("workspace_memberships")
        .insert({
          workspace_id: targetWorkspaceId,
          user_id: invitedUser.id,
          role,
          is_owner: false,
          invited_by: user.id,
        });

      if (membershipError) {
        logger.error("Failed to add user to workspace", { error: membershipError });
        return new Response(JSON.stringify({ error: "Failed to add user to workspace" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also add to legacy user_roles
      await supabaseAdmin.from("user_roles").insert({
        tenant_id: targetWorkspaceId,
        user_id: invitedUser.id,
        role,
      });

      logger.info("Existing user added to workspace", { 
        invitedUserId: invitedUser.id, 
        workspaceId: targetWorkspaceId 
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "User added to workspace",
        userExists: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User doesn't exist - send invite email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logger.warn("RESEND_API_KEY not configured, invite will be pending");
      
      // Store invite for later (could be a pending_invites table)
      // For now, just return a message
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Invite recorded. Email not sent (email service not configured)",
        userExists: false,
        pendingInvite: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter's profile
    const { data: inviterProfile } = await supabaseUser
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "A team member";

    // Get the app URL from the request origin
    const origin = req.headers.get("origin") || "https://smart-agent.lovable.app";
    const signupUrl = `${origin}/auth?invited=true&workspace=${targetWorkspaceId}&role=${role}`;

    // Send invitation email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Smart Agent <onboarding@resend.dev>",
        to: [email],
        subject: `${inviterName} invited you to join ${workspace.name} on Smart Agent`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Hi there,</p>
              
              <p style="font-size: 16px;">${inviterName} has invited you to join <strong>${workspace.name}</strong> on <strong>Smart Agent</strong>, an AI-powered real estate platform.</p>
              
              <p style="font-size: 16px;">You've been invited as: <strong style="text-transform: capitalize;">${role}</strong></p>
              
              <p style="font-size: 16px;">With Smart Agent, you can:</p>
              <ul style="font-size: 16px; color: #555;">
                <li>Collaborate with your team</li>
                <li>Track transactions and deals</li>
                <li>Get AI-powered insights and assistance</li>
                <li>Access all your documents in one place</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Accept Invitation</a>
              </div>
              
              <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 12px; color: #888; word-break: break-all;">${signupUrl}</p>
            </div>
            
            <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
              © 2026 Smart Agent. All rights reserved.
            </p>
          </body>
          </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      logger.error("Resend API error", { emailData });
      return new Response(JSON.stringify({ error: `Failed to send invitation email: ${JSON.stringify(emailData)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Workspace invitation email sent", { 
      emailId: emailData.id, 
      workspaceId: targetWorkspaceId,
      invitedEmail: email 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation sent",
      emailId: emailData.id,
      userExists: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, { functionName: "invite-to-workspace" });
  }
});
