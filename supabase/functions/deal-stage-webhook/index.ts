import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function is called via a database webhook when a deal's stage changes
// It sends notifications to relevant parties (agent, buyer, seller)

interface WebhookPayload {
  type: "UPDATE";
  table: "deals";
  schema: "public";
  record: {
    id: string;
    tenant_id: string;
    property_id: string | null;
    contact_id: string | null;
    deal_type: string;
    stage: string;
    agent_id: string | null;
    buyer_user_id?: string | null;
    seller_user_id?: string | null;
    buyer_stage?: string | null;
    seller_stage?: string | null;
  };
  old_record: {
    stage: string;
    buyer_stage?: string | null;
    seller_stage?: string | null;
  };
}

// Map stage codes to human-readable names
const stageLabels: Record<string, string> = {
  // Original stages
  lead: "Lead",
  contacted: "Contacted",
  showing: "Showing",
  offer: "Offer",
  under_contract: "Under Contract",
  pending: "Pending",
  closed: "Closed",
  lost: "Lost",
  // Buyer stages
  browsing: "Browsing",
  interested: "Interested",
  touring: "Touring",
  offer_prep: "Offer Preparation",
  offer_submitted: "Offer Submitted",
  negotiating: "Negotiating",
  inspection: "Inspection",
  appraisal: "Appraisal",
  final_walkthrough: "Final Walkthrough",
  closing: "Closing",
  // Seller stages
  preparing: "Preparing",
  listed: "Listed",
  offer_received: "Offer Received",
  withdrawn: "Withdrawn",
};

function formatStageName(stage: string): string {
  return stageLabels[stage] || stage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();

    // Validate it's a deal update
    if (payload.type !== "UPDATE" || payload.table !== "deals") {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { record, old_record } = payload;
    const origin = Deno.env.get("APP_URL") || "https://smart-agent.lovable.app";

    // Check which stage changed
    const stageChanged = record.stage !== old_record.stage;
    const buyerStageChanged = record.buyer_stage !== old_record.buyer_stage;
    const sellerStageChanged = record.seller_stage !== old_record.seller_stage;

    if (!stageChanged && !buyerStageChanged && !sellerStageChanged) {
      return new Response(JSON.stringify({ message: "No stage change detected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get deal details including property info
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select(`
        id,
        tenant_id,
        agent_id,
        contact_id,
        buyer_user_id,
        seller_user_id,
        properties (
          address,
          city,
          state
        )
      `)
      .eq("id", record.id)
      .single();

    if (dealError || !deal) {
      throw new Error("Failed to fetch deal details");
    }

    // properties is returned as an array from the join, get first element
    const properties = deal.properties as unknown as { address: string; city: string; state: string }[] | null;
    const property = properties?.[0];
    const dealName = property
      ? `${property.address}, ${property.city}`
      : `Deal #${record.id.slice(0, 8)}`;

    const notifications: string[] = [];

    // Helper to create notification
    async function createNotification(userId: string, oldStage: string, newStage: string) {
      const { data: notification, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          tenant_id: record.tenant_id,
          type: "deal_stage_change",
          title: `Deal moved to ${formatStageName(newStage)}`,
          body: dealName,
          action_url: `/pipeline?deal=${record.id}`,
          metadata: {
            deal_id: record.id,
            old_stage: oldStage,
            new_stage: newStage,
          },
        })
        .select("id")
        .single();

      if (!error && notification) {
        notifications.push(userId);
      } else {
        logger.error("Failed to create notification", { error: error?.message });
        return; // Don't send email if notification creation failed
      }

      // Send email
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientUserId: userId,
            template: "deal_stage_change",
            variables: {
              deal_name: dealName,
              old_stage: formatStageName(oldStage),
              new_stage: formatStageName(newStage),
              action_url: `${origin}/pipeline?deal=${record.id}`,
            },
            createNotification: false,
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
      } catch (emailError) {
        logger.error("Failed to send email", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    // Notify based on which stage changed
    if (stageChanged) {
      // Notify agent
      if (deal.agent_id) {
        await createNotification(deal.agent_id, old_record.stage, record.stage);
      }
      // Notify buyer if linked
      if (deal.buyer_user_id) {
        await createNotification(deal.buyer_user_id, old_record.stage, record.stage);
      }
      // Notify seller if linked
      if (deal.seller_user_id) {
        await createNotification(deal.seller_user_id, old_record.stage, record.stage);
      }
    }

    if (buyerStageChanged && record.buyer_stage && old_record.buyer_stage) {
      // Notify buyer
      if (deal.buyer_user_id) {
        await createNotification(deal.buyer_user_id, old_record.buyer_stage, record.buyer_stage);
      }
      // Also notify agent
      if (deal.agent_id && deal.agent_id !== deal.buyer_user_id) {
        await createNotification(deal.agent_id, old_record.buyer_stage, record.buyer_stage);
      }
    }

    if (sellerStageChanged && record.seller_stage && old_record.seller_stage) {
      // Notify seller
      if (deal.seller_user_id) {
        await createNotification(deal.seller_user_id, old_record.seller_stage, record.seller_stage);
      }
      // Also notify agent
      if (deal.agent_id && deal.agent_id !== deal.seller_user_id) {
        await createNotification(deal.agent_id, old_record.seller_stage, record.seller_stage);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    logger.error("Error in deal-stage-webhook", { error: error instanceof Error ? error.message : "Unknown error" });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
