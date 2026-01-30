import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getEmailTemplate } from "../_shared/email-templates.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  recipientUserId: string;
  template: string;
  variables: Record<string, string>;
  bypassPreferences?: boolean;
  createNotification?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role for this function to allow cross-tenant operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      recipientUserId,
      template,
      variables,
      bypassPreferences = false,
      createNotification = true,
    }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!recipientUserId || !template || !variables) {
      throw new Error("Missing required fields: recipientUserId, template, variables");
    }

    // Get recipient profile and email
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("user_id, tenant_id, full_name, email")
      .eq("user_id", recipientUserId)
      .single();

    if (recipientError || !recipient) {
      throw new Error("Recipient not found");
    }

    // Get recipient email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(recipientUserId);
    const recipientEmail = authUser?.user?.email;

    if (!recipientEmail) {
      throw new Error("Recipient email not found");
    }

    // Check user notification preferences (unless bypassed for critical emails)
    if (!bypassPreferences) {
      // In a real implementation, check user preferences from a table
      // For now, we'll assume email notifications are enabled
    }

    // Get email template
    const emailContent = getEmailTemplate(template, {
      ...variables,
      recipient_name: recipient.full_name || "there",
    });

    if (!emailContent) {
      throw new Error(`Unknown email template: ${template}`);
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Smart Agent <notifications@resend.dev>",
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      logger.error("Resend API error", { emailData });
      throw new Error(`Failed to send email: ${JSON.stringify(emailData)}`);
    }

    logger.info("Email sent successfully", { emailId: emailData.id });

    // Create in-app notification if requested
    let notificationId = null;
    if (createNotification) {
      const { data: notification, error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: recipientUserId,
          tenant_id: recipient.tenant_id,
          type: template,
          title: emailContent.subject,
          body: variables.message_preview || variables.milestone_title || variables.document_name || null,
          email_sent: true,
          action_url: variables.action_url || null,
          metadata: variables,
        })
        .select("id")
        .single();

      if (notificationError) {
        logger.error("Failed to create notification", { error: notificationError.message });
      } else {
        notificationId = notification?.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailData.id,
        notificationId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    logger.error("Error in send-email function", { error: error instanceof Error ? error.message : "Unknown error" });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
