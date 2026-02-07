/**
 * Assess Churn Risk Edge Function
 * 
 * Assesses churn risk for users and updates churn_risk_assessments table.
 * Can be called for a specific user or batch assess all users.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { user_id, workspace_id, batch } = await req.json();

    // Batch assess all users
    if (batch === true) {
      const { data, error } = await supabaseClient.rpc("assess_all_users_churn_risk");

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          users_assessed: data,
          message: `Assessed churn risk for ${data} users`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Assess specific user
    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "user_id is required for single user assessment",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { data: assessment, error: assessError } = await supabaseClient.rpc(
      "assess_churn_risk",
      {
        p_user_id: user_id,
        p_workspace_id: workspace_id || null,
      }
    );

    if (assessError) {
      throw assessError;
    }

    if (!assessment || assessment.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No assessment data returned",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const result = assessment[0];

    // Upsert assessment into churn_risk_assessments table
    const { data: upserted, error: upsertError } = await supabaseClient
      .from("churn_risk_assessments")
      .upsert(
        {
          user_id,
          workspace_id: workspace_id || null,
          risk_level: result.risk_level,
          risk_score: result.risk_score,
          login_recency_score: result.login_recency_score,
          feature_usage_score: result.feature_usage_score,
          subscription_health_score: result.subscription_health_score,
          onboarding_score: result.onboarding_score,
          engagement_trend_score: result.engagement_trend_score,
          days_since_last_activity: result.days_since_last_activity,
          last_activity_date: result.last_activity_date,
          assessment_notes: result.assessment_notes,
          assessed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,workspace_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        assessment: upserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
