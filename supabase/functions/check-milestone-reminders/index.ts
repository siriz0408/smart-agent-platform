import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

// This function is designed to be called by a cron job daily
// It checks for milestones due within the next 3 days and sends reminder notifications
// Matches UI indicator logic: "due soon" = within 3 days

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role for cron job
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get milestones due in the next 3 days that haven't been completed
    // This matches the UI indicator logic for "due soon"
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: upcomingMilestones, error: milestonesError } = await supabase
      .from("deal_milestones")
      .select(`
        id,
        title,
        due_date,
        deal_id,
        deals!inner (
          id,
          tenant_id,
          agent_id,
          contact_id,
          deal_type,
          property_id,
          properties (
            address,
            city,
            state
          )
        )
      `)
      .is("completed_at", null)
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", threeDaysFromNow.toISOString().split("T")[0]);

    if (milestonesError) {
      throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
    }

    logger.info("Found upcoming milestones", { count: upcomingMilestones?.length || 0 });

    const notifications: string[] = [];
    const origin = Deno.env.get("APP_URL") || "https://smart-agent.lovable.app";

    // Process each milestone
    for (const milestone of upcomingMilestones || []) {
      // deals is returned as a single object due to !inner join
      const deal = milestone.deals as unknown as {
        id: string;
        tenant_id: string;
        agent_id: string | null;
        contact_id: string | null;
        deal_type: string;
        property_id: string | null;
        properties: { address: string; city: string; state: string }[] | null;
      };

      if (!deal?.agent_id) continue;

      // Calculate due text with proper urgency levels
      const dueDate = new Date(milestone.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const isToday = daysUntilDue === 0;
      const isTomorrow = daysUntilDue === 1;
      
      let dueText: string;
      if (isToday) {
        dueText = "today";
      } else if (isTomorrow) {
        dueText = "tomorrow";
      } else {
        dueText = `in ${daysUntilDue} days`;
      }

      // Get property name for the deal (properties is an array from the join)
      const property = deal.properties?.[0];
      const dealName = property
        ? `${property.address}, ${property.city}`
        : `Deal #${deal.id.slice(0, 8)}`;

      // Create notification for the agent
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: deal.agent_id,
          tenant_id: deal.tenant_id,
          type: "milestone_reminder",
          title: `Milestone due ${dueText}: ${milestone.title}`,
          body: `Deal: ${dealName}`,
          action_url: `/pipeline?deal=${deal.id}`,
          metadata: {
            milestone_id: milestone.id,
            deal_id: deal.id,
            due_date: milestone.due_date,
          },
        })
        .select("id")
        .single();

      if (notifError) {
        logger.error("Failed to create notification", { error: notifError.message });
      } else {
        notifications.push(milestone.id);
      }

      // Optionally send email (call send-email function)
      try {
        // Get agent profile for email
        const { data: agentProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", deal.agent_id)
          .single();

        if (agentProfile) {
          // Call send-email function
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipientUserId: deal.agent_id,
              template: "milestone_reminder",
              variables: {
                milestone_title: milestone.title,
                due_text: dueText,
                deal_name: dealName,
                action_url: `${origin}/pipeline?deal=${deal.id}`,
              },
              createNotification: false, // We already created it above
            }),
          });

          // Update email_sent flag if email was sent successfully
          if (emailResponse.ok && notification) {
            const emailResult = await emailResponse.json();
            if (emailResult.success) {
              await supabase
                .from("notifications")
                .update({ email_sent: true })
                .eq("id", notification.id);
              logger.info("Updated email_sent flag", { notificationId: notification.id });
            }
          } else {
            const errorText = await emailResponse.text();
            logger.error("Failed to send email", { response: errorText });
          }
        }
      } catch (emailError) {
        logger.error("Error sending email", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: upcomingMilestones?.length || 0,
        notificationsSent: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "check-milestone-reminders",
      logContext: { endpoint: "check-milestone-reminders" },
    });
  }
});
