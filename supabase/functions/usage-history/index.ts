import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UsageMonth {
  month: string; // YYYY-MM format
  monthLabel: string; // "Jan 2026" format
  aiQueries: number;
  documents: number;
  tokens: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ history: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get date 6 months ago
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Generate array of last 6 months
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      months.push(date.toISOString().slice(0, 7)); // YYYY-MM format
    }

    // Fetch AI query usage records for the past 6 months
    const { data: usageRecords } = await supabase
      .from("usage_records")
      .select("quantity, recorded_at, record_type")
      .eq("tenant_id", profile.tenant_id)
      .gte("recorded_at", sixMonthsAgo.toISOString());

    // Fetch document counts by month
    const { data: documents } = await supabase
      .from("documents")
      .select("created_at")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", sixMonthsAgo.toISOString());

    // Aggregate by month
    const monthlyData: Record<string, { aiQueries: number; documents: number; tokens: number }> = {};

    // Initialize all months with zeros
    for (const month of months) {
      monthlyData[month] = { aiQueries: 0, documents: 0, tokens: 0 };
    }

    // Aggregate usage records
    if (usageRecords) {
      for (const record of usageRecords) {
        const month = record.recorded_at.slice(0, 7);
        if (monthlyData[month]) {
          if (record.record_type === "ai_query") {
            monthlyData[month].aiQueries += record.quantity || 1;
          } else if (record.record_type === "ai_tokens") {
            monthlyData[month].tokens += record.quantity || 0;
          }
        }
      }
    }

    // Aggregate document uploads
    if (documents) {
      for (const doc of documents) {
        const month = doc.created_at.slice(0, 7);
        if (monthlyData[month]) {
          monthlyData[month].documents += 1;
        }
      }
    }

    // Format response
    const history: UsageMonth[] = months.map((month) => {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      return {
        month,
        monthLabel,
        ...monthlyData[month],
      };
    });

    return new Response(JSON.stringify({ history }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error("Error fetching usage history", { error: error instanceof Error ? error.message : "Unknown error" });
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
