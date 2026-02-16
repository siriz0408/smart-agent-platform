import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

/**
 * Deal Notifications Edge Function (TRX-011)
 *
 * Handles notifications for deal activity changes:
 * - Stage changes (deal_stage_change)
 * - Milestone completions (milestone_reminder with completed flag)
 *
 * Respects user preferences (deal_updates setting)
 */

interface DealStageChangePayload {
  type: "stage_change";
  dealId: string;
  previousStage: string | null;
  newStage: string;
  userId: string;
  tenantId: string;
}

interface MilestoneCompletionPayload {
  type: "milestone_completion";
  milestoneId: string;
  dealId: string;
  milestoneTitle: string;
  userId: string;
  tenantId: string;
}

type NotificationPayload = DealStageChangePayload | MilestoneCompletionPayload;

// Stage labels for human-readable notifications
const STAGE_LABELS: Record<string, string> = {
  // Buyer stages
  lead: "Lead",
  active_buyer: "Active Buyer",
  property_search: "Property Search",
  making_offers: "Making Offers",
  under_contract: "Under Contract",
  closing: "Closing",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  // Seller stages
  prospect: "Prospect",
  pre_listing: "Pre-Listing",
  active_listing: "Active Listing",
  offer_review: "Offer Review",
  closing_prep: "Closing Prep",
  closed: "Closed",
};

function getStageLabel(stage: string | null): string {
  if (!stage) return "Unknown";
  return STAGE_LABELS[stage] || stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();

    // Get user preferences to check if they want deal notifications
    const { data: userPrefs } = await supabase
      .from("user_preferences")
      .select("deal_updates, email_notifications, email_frequency")
      .eq("user_id", payload.userId)
      .single();

    // Default to true if no preferences exist
    const wantsDealUpdates = userPrefs?.deal_updates !== false;
    const wantsEmail = userPrefs?.email_notifications !== false;
    const emailFrequency = userPrefs?.email_frequency || "instant";

    if (!wantsDealUpdates) {
      logger.info("User has disabled deal notifications", { userId: payload.userId });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User disabled deal_updates" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationData: {
      user_id: string;
      tenant_id: string;
      type: string;
      title: string;
      body: string;
      action_url: string;
      metadata: Record<string, unknown>;
    };

    const origin = Deno.env.get("APP_URL") || "https://smart-agent.lovable.app";

    if (payload.type === "stage_change") {
      // Get deal details for the notification
      const { data: deal } = await supabase
        .from("deals")
        .select(`
          id,
          deal_type,
          contacts!contact_id(first_name, last_name),
          properties!property_id(address, city)
        `)
        .eq("id", payload.dealId)
        .single();

      const contact = deal?.contacts as { first_name: string; last_name: string } | null;
      const property = deal?.properties as { address: string; city: string } | null;
      const dealName = contact
        ? `${contact.first_name} ${contact.last_name}`
        : property
          ? `${property.address}`
          : `Deal #${payload.dealId.slice(0, 8)}`;

      const previousLabel = getStageLabel(payload.previousStage);
      const newLabel = getStageLabel(payload.newStage);

      // Determine if this is a significant transition
      const isClosedWon = payload.newStage === "closed_won" || payload.newStage === "closed";
      const isClosedLost = payload.newStage === "closed_lost";
      const movedToContract = payload.newStage === "under_contract";

      let title: string;
      if (isClosedWon) {
        title = `Deal Closed! ${dealName}`;
      } else if (isClosedLost) {
        title = `Deal Lost: ${dealName}`;
      } else if (movedToContract) {
        title = `Under Contract: ${dealName}`;
      } else {
        title = `Deal moved to ${newLabel}`;
      }

      const body = payload.previousStage
        ? `${dealName} moved from ${previousLabel} to ${newLabel}`
        : `${dealName} started at ${newLabel}`;

      notificationData = {
        user_id: payload.userId,
        tenant_id: payload.tenantId,
        type: "deal_stage_change",
        title,
        body,
        action_url: `/pipeline?deal=${payload.dealId}`,
        metadata: {
          deal_id: payload.dealId,
          deal_type: deal?.deal_type,
          previous_stage: payload.previousStage,
          new_stage: payload.newStage,
          is_significant: isClosedWon || isClosedLost || movedToContract,
        },
      };
    } else if (payload.type === "milestone_completion") {
      // Get deal details
      const { data: deal } = await supabase
        .from("deals")
        .select(`
          id,
          contacts!contact_id(first_name, last_name),
          properties!property_id(address, city)
        `)
        .eq("id", payload.dealId)
        .single();

      const contact = deal?.contacts as { first_name: string; last_name: string } | null;
      const property = deal?.properties as { address: string; city: string } | null;
      const dealName = contact
        ? `${contact.first_name} ${contact.last_name}`
        : property
          ? `${property.address}`
          : `Deal #${payload.dealId.slice(0, 8)}`;

      notificationData = {
        user_id: payload.userId,
        tenant_id: payload.tenantId,
        type: "milestone_reminder", // Use same type but with completed metadata
        title: `Milestone completed: ${payload.milestoneTitle}`,
        body: `${dealName} - ${payload.milestoneTitle} has been marked complete`,
        action_url: `/pipeline?deal=${payload.dealId}`,
        metadata: {
          milestone_id: payload.milestoneId,
          deal_id: payload.dealId,
          completed: true,
        },
      };
    } else {
      return createErrorResponse(
        new Error("Invalid notification type"),
        corsHeaders,
        { status: 400, functionName: "deal-notifications" }
      );
    }

    // Insert the notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert(notificationData)
      .select("id")
      .single();

    if (notifError) {
      throw new Error(`Failed to create notification: ${notifError.message}`);
    }

    logger.info("Created deal notification", {
      notificationId: notification?.id,
      type: payload.type,
      userId: payload.userId,
    });

    // Send email if user wants instant notifications
    if (wantsEmail && emailFrequency === "instant") {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", payload.userId)
          .single();

        if (profile?.email) {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipientUserId: payload.userId,
              template: payload.type === "stage_change" ? "deal_stage_change" : "milestone_completed",
              variables: {
                notification_title: notificationData.title,
                notification_body: notificationData.body,
                action_url: `${origin}${notificationData.action_url}`,
              },
              createNotification: false,
            }),
          });

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json();
            if (emailResult.success && notification) {
              await supabase
                .from("notifications")
                .update({ email_sent: true })
                .eq("id", notification.id);
            }
          }
        }
      } catch (emailError) {
        logger.error("Failed to send email notification", {
          error: emailError instanceof Error ? emailError.message : String(emailError)
        });
        // Don't fail the whole request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification?.id,
        type: payload.type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "deal-notifications",
      logContext: { endpoint: "deal-notifications" },
    });
  }
});
