import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Price IDs mapped to plan names
const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get("STRIPE_STARTER_PRICE_ID") || "price_1Sud7Q1d1AvgoBGodhWI0BSF",
  professional: Deno.env.get("STRIPE_PROFESSIONAL_PRICE_ID") || "price_1Sud7R1d1AvgoBGohGAkTXGI",
  team: Deno.env.get("STRIPE_TEAM_PRICE_ID") || "price_1Sud7S1d1AvgoBGoNBzj7Cj4",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Get workspace_id from profile (active_workspace_id or tenant_id fallback)
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_workspace_id, tenant_id")
      .eq("user_id", userId)
      .single();

    const workspaceId = (profile as { active_workspace_id?: string })?.active_workspace_id 
      || profile?.tenant_id;

    if (!workspaceId) {
      throw new Error("Workspace not found");
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get or create Stripe customer
    let customerId = subscription?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { workspace_id: workspaceId },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("workspace_id", workspaceId);
    }

    // Create checkout session with 14-day trial
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      subscription_data: {
        metadata: { workspace_id: workspaceId },
        trial_period_days: 14,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, { functionName: "create-checkout-session" });
  }
});
