import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  contactId: string;
  contactEmail: string;
  contactName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profile for personalization
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", claimsData.claims.sub)
      .single();

    const senderName = senderProfile?.full_name || senderProfile?.email || "A team member";

    const { contactId, contactEmail, contactName }: InviteRequest = await req.json();

    // Validate required fields
    if (!contactId || !contactEmail || !contactName) {
      throw new Error("Missing required fields: contactId, contactEmail, contactName");
    }

    // Get the app URL from the request origin or use a default
    const origin = req.headers.get("origin") || "https://smart-agent.lovable.app";
    const signupUrl = `${origin}/auth?invited=true`;

    // Send invitation email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Smart Agent <onboarding@resend.dev>", // Use resend.dev for testing, replace with your verified domain
        to: [contactEmail],
        subject: `${senderName} invited you to Smart Agent`,
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
              <p style="font-size: 16px;">Hi ${contactName},</p>
              
              <p style="font-size: 16px;">${senderName} has invited you to join <strong>Smart Agent</strong>, an AI-powered real estate platform that makes buying or selling property easier than ever.</p>
              
              <p style="font-size: 16px;">With Smart Agent, you can:</p>
              <ul style="font-size: 16px; color: #555;">
                <li>Communicate directly with your agent</li>
                <li>Track your transaction progress</li>
                <li>Get AI-powered insights and assistance</li>
                <li>Access all your documents in one place</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Create Your Account</a>
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
      throw new Error(`Failed to send email: ${JSON.stringify(emailData)}`);
    }

    logger.info("Invitation email sent successfully", { emailId: emailData.id });

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error("Error in send-invite function", { error: error instanceof Error ? error.message : "Unknown error" });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
