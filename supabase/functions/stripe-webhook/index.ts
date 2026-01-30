import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1Sud7Q1d1AvgoBGodhWI0BSF": "starter",
  "price_1Sud7R1d1AvgoBGohGAkTXGI": "professional",
  "price_1Sud7S1d1AvgoBGoNBzj7Cj4": "team",
};

function getPlanFromPriceId(priceId: string): string {
  return PRICE_TO_PLAN[priceId] || "free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // SECURITY: Enforce webhook secret configuration
    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SECURITY: Enforce signature presence
    if (!signature) {
      logger.error("Missing stripe-signature header", {
        security_event: "unsigned_webhook_attempt",
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SECURITY: Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error("Webhook signature verification failed", {
        security_event: "invalid_webhook_signature",
        error: errMessage,
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for database updates
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenant_id;
        
        if (!tenantId) {
          // Try to find tenant by customer ID
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("tenant_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();
          
          if (!existingSub) {
            console.error("No tenant found for subscription:", subscription.id);
            break;
          }
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        const updateData = {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          plan: plan,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_start: subscription.trial_start
            ? new Date(subscription.trial_start * 1000).toISOString()
            : null,
          trial_end: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        };

        // Update by tenant_id or stripe_customer_id
        const updateQuery = tenantId
          ? supabase.from("subscriptions").update(updateData).eq("tenant_id", tenantId)
          : supabase.from("subscriptions").update(updateData).eq("stripe_customer_id", subscription.customer as string);

        const { error } = await updateQuery;
        if (error) {
          console.error("Error updating subscription:", error);
        } else {
          console.log(`Subscription updated: ${subscription.id} -> ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            plan: "free",
            stripe_subscription_id: null,
            current_period_end: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error canceling subscription:", error);
        } else {
          console.log(`Subscription canceled: ${subscription.id}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice: ${invoice.id}`);
        // Could track invoice history here if needed
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment failed for invoice: ${invoice.id}`);
        
        // Update subscription status to past_due
        if (invoice.subscription) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
          
          if (error) {
            console.error("Error updating subscription status:", error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
