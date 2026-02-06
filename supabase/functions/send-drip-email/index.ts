/**
 * Send Drip Email Edge Function
 * 
 * This function processes the email drip campaign queue and sends scheduled emails.
 * It should be called by a cron job (e.g., every hour) or can be triggered manually.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { getEmailTemplate } from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CampaignRecipient {
  id: string;
  campaign_id: string;
  user_id: string;
  current_step: number;
  next_email_scheduled_at: string | null;
}

interface CampaignStep {
  id: string;
  campaign_id: string;
  step_number: number;
  delay_days: number;
  subject: string;
  template_name: string;
  variables: Record<string, string>;
}

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  is_active: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    
    // Parse request for optional filters
    let maxEmails = 50; // Default limit per run
    let dryRun = false;
    
    try {
      const body = await req.json();
      maxEmails = body.maxEmails || maxEmails;
      dryRun = body.dryRun || dryRun;
    } catch {
      // No body provided, use defaults
    }

    logger.info("Starting drip email processing", { maxEmails, dryRun });

    // Get recipients who are due for their next email
    const { data: dueRecipients, error: recipientsError } = await supabase
      .from("email_campaign_recipients")
      .select(`
        id,
        campaign_id,
        user_id,
        current_step,
        next_email_scheduled_at
      `)
      .eq("status", "active")
      .lte("next_email_scheduled_at", now.toISOString())
      .order("next_email_scheduled_at", { ascending: true })
      .limit(maxEmails);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!dueRecipients || dueRecipients.length === 0) {
      logger.info("No recipients due for emails");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No emails due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info(`Found ${dueRecipients.length} recipients due for emails`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      completed: 0,
      errors: [] as string[],
    };

    for (const recipient of dueRecipients as CampaignRecipient[]) {
      try {
        results.processed++;

        // Get the campaign
        const { data: campaign, error: campaignError } = await supabase
          .from("email_campaigns")
          .select("id, name, campaign_type, is_active")
          .eq("id", recipient.campaign_id)
          .single();

        if (campaignError || !campaign || !campaign.is_active) {
          logger.warn("Campaign not found or inactive", { campaignId: recipient.campaign_id });
          continue;
        }

        // Get the next step for this recipient
        const nextStepNumber = recipient.current_step + 1;
        const { data: step, error: stepError } = await supabase
          .from("email_campaign_steps")
          .select("*")
          .eq("campaign_id", recipient.campaign_id)
          .eq("step_number", nextStepNumber)
          .eq("is_active", true)
          .single();

        if (stepError || !step) {
          // No more steps, mark campaign as completed
          await supabase
            .from("email_campaign_recipients")
            .update({
              status: "completed",
              completed_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", recipient.id);
          
          results.completed++;
          logger.info("Campaign completed for user", { 
            userId: recipient.user_id, 
            campaignId: recipient.campaign_id 
          });
          continue;
        }

        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(recipient.user_id);
        const userEmail = authUser?.user?.email;

        if (!userEmail) {
          logger.warn("User email not found", { userId: recipient.user_id });
          results.errors.push(`User ${recipient.user_id}: email not found`);
          results.failed++;
          continue;
        }

        // Get user profile for personalization
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", recipient.user_id)
          .single();

        const userName = profile?.full_name || userEmail.split("@")[0];

        // Prepare email variables
        const emailVariables = {
          user_name: userName,
          ...step.variables,
        };

        if (dryRun) {
          logger.info("Dry run - would send email", {
            to: userEmail,
            subject: step.subject,
            template: step.template_name,
          });
          results.sent++;
          continue;
        }

        // Get email template HTML
        const templateHtml = getEmailTemplate(step.template_name, emailVariables);

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Smart Agent <noreply@smartagent.ai>",
            to: [userEmail],
            subject: step.subject.replace("{{user_name}}", userName),
            html: templateHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const emailResult = await emailResponse.json();

        // Log the send
        await supabase.from("email_send_history").insert({
          campaign_id: recipient.campaign_id,
          step_id: step.id,
          recipient_id: recipient.id,
          user_id: recipient.user_id,
          email_address: userEmail,
          subject: step.subject,
          template_name: step.template_name,
          status: "sent",
          external_id: emailResult.id,
        });

        // Update recipient progress
        const { data: nextStep } = await supabase
          .from("email_campaign_steps")
          .select("delay_days")
          .eq("campaign_id", recipient.campaign_id)
          .eq("step_number", nextStepNumber + 1)
          .single();

        const nextScheduledAt = nextStep
          ? new Date(now.getTime() + nextStep.delay_days * 24 * 60 * 60 * 1000)
          : null;

        await supabase
          .from("email_campaign_recipients")
          .update({
            current_step: nextStepNumber,
            last_email_sent_at: now.toISOString(),
            next_email_scheduled_at: nextScheduledAt?.toISOString() || null,
            updated_at: now.toISOString(),
          })
          .eq("id", recipient.id);

        results.sent++;
        logger.info("Email sent successfully", {
          userId: recipient.user_id,
          step: nextStepNumber,
          campaign: campaign.name,
        });

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Recipient ${recipient.id}: ${errorMessage}`);
        logger.error("Failed to process recipient", { 
          recipientId: recipient.id, 
          error: errorMessage 
        });
      }
    }

    logger.info("Drip email processing complete", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Drip email processing failed", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
