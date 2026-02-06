import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface InvoiceResponse {
  id: string;
  number: string | null;
  date: number;
  description: string | null;
  amount: number;
  currency: string;
  status: string | null;
  pdf: string | null;
  hostedUrl: string | null;
}

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

    // Get workspace_id from profile (active_workspace_id or tenant_id fallback)
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_workspace_id, tenant_id")
      .eq("user_id", userId)
      .single();

    const workspaceId = (profile as { active_workspace_id?: string })?.active_workspace_id 
      || profile?.tenant_id;

    if (!workspaceId) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .single();

    if (!subscription?.stripe_customer_id) {
      // No Stripe customer, return empty invoices
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 24, // Last 2 years of monthly invoices
    });

    // Transform to response format
    const formattedInvoices: InvoiceResponse[] = invoices.data.map(
      (invoice: Stripe.Invoice) => ({
        id: invoice.id,
        number: invoice.number,
        date: invoice.created,
        description:
          invoice.lines.data[0]?.description ||
          invoice.description ||
          "Subscription",
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        pdf: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
      })
    );

    return new Response(JSON.stringify({ invoices: formattedInvoices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error("Error fetching invoices", { error: error instanceof Error ? error.message : "Unknown error" });
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
