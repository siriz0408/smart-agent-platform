import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface DealSuggestion {
  type: "action" | "warning" | "info" | "opportunity";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: {
    label: string;
    type: string; // e.g., "move_stage", "add_milestone", "contact_client", "update_date"
    params?: Record<string, unknown>;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId } = await req.json();
    
    if (!dealId) {
      return new Response(
        JSON.stringify({ error: "dealId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let tenantId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ") && SUPABASE_URL) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabase.auth.getUser(token);
      
      if (claimsData?.user?.id) {
        userId = claimsData.user.id;
        
        // Get tenant_id from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", userId)
          .single();
          
        tenantId = profile?.tenant_id || null;
      }
    }

    if (!userId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch deal data with all related information
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select(`
        *,
        contacts!contact_id(id, first_name, last_name, email, phone, notes),
        properties!property_id(id, address, city, state, price, status),
        deal_milestones(id, title, due_date, completed_at, notes),
        deal_activities(id, activity_type, description, created_at)
      `)
      .eq("id", dealId)
      .eq("tenant_id", tenantId)
      .single();

    if (dealError || !deal) {
      return new Response(
        JSON.stringify({ error: "Deal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare context for AI analysis
    const now = new Date();
    const context = {
      deal: {
        id: deal.id,
        deal_type: deal.deal_type,
        stage: deal.stage,
        estimated_value: deal.estimated_value,
        expected_close_date: deal.expected_close_date,
        actual_close_date: deal.actual_close_date,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        earnest_money: deal.earnest_money,
        option_period_end: deal.option_period_end,
        inspection_date: deal.inspection_date,
        appraisal_date: deal.appraisal_date,
        financing_deadline: deal.financing_deadline,
        has_inspection_contingency: deal.has_inspection_contingency,
        has_financing_contingency: deal.has_financing_contingency,
        has_appraisal_contingency: deal.has_appraisal_contingency,
        lender_name: deal.lender_name,
        title_company: deal.title_company,
        notes: deal.notes,
      },
      contact: deal.contacts ? {
        name: `${deal.contacts.first_name} ${deal.contacts.last_name}`,
        email: deal.contacts.email,
        phone: deal.contacts.phone,
      } : null,
      property: deal.properties ? {
        address: deal.properties.address,
        city: deal.properties.city,
        state: deal.properties.state,
        price: deal.properties.price,
        status: deal.properties.status,
      } : null,
      milestones: (deal.deal_milestones || []).map((m: any) => ({
        title: m.title,
        due_date: m.due_date,
        completed_at: m.completed_at,
        is_overdue: m.due_date && !m.completed_at && new Date(m.due_date) < now,
        is_due_soon: (() => {
          if (!m.due_date || m.completed_at) return false;
          const daysUntilDue = Math.floor((new Date(m.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDue >= 0 && daysUntilDue <= 3;
        })(),
      })),
      recent_activities: (deal.deal_activities || []).slice(0, 5).map((a: any) => ({
        type: a.activity_type,
        description: a.description,
        created_at: a.created_at,
      })),
      current_date: now.toISOString(),
    };

    // Call AI to generate suggestions
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: `You are an expert real estate transaction advisor. Analyze deal data and provide actionable suggestions to help agents move deals forward efficiently.

Your suggestions should:
- Identify stalled deals or missing next steps
- Flag overdue or upcoming milestones
- Suggest stage transitions when appropriate
- Recommend follow-up actions with contacts
- Highlight missing critical information
- Identify opportunities to accelerate the deal

Return suggestions as a JSON array. Each suggestion should have:
- type: "action" (specific action to take), "warning" (needs attention), "info" (informational), "opportunity" (growth/chance to improve)
- priority: "high", "medium", or "low"
- title: Short, actionable title (max 60 chars)
- description: Clear explanation of the suggestion (max 200 chars)
- action (optional): If type is "action", include:
  - label: Button text (e.g., "Move to Under Contract", "Add Milestone")
  - type: Action type (e.g., "move_stage", "add_milestone", "contact_client", "update_date")
  - params: Any parameters needed (e.g., { stage: "under_contract" })

Focus on:
1. Deals stuck in same stage >7 days → suggest next stage or follow-up
2. Overdue milestones → flag urgently
3. Missing critical dates (inspection, appraisal, closing) → suggest adding
4. Deals approaching expected close date without milestones → create milestones
5. Missing contact information → suggest updating
6. Opportunities to move deals forward faster

Be concise and actionable. Return ONLY valid JSON array, no markdown or explanation.`,
        messages: [
          {
            role: "user",
            content: `Analyze this deal and provide 3-5 actionable suggestions:\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.content?.[0]?.text || "";
    
    // Parse AI response (should be JSON)
    let suggestions: DealSuggestion[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) || 
                        aiContent.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiContent;
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI suggestions:", parseError);
      // Fallback: return basic suggestions based on deal state
      suggestions = generateFallbackSuggestions(deal, context);
    }

    // Validate and clean suggestions
    suggestions = suggestions
      .filter((s: any) => s.title && s.description && s.type && s.priority)
      .slice(0, 5) // Limit to 5 suggestions
      .map((s: any) => ({
        type: s.type || "info",
        priority: s.priority || "medium",
        title: s.title.substring(0, 60),
        description: s.description.substring(0, 200),
        action: s.action || undefined,
      }));

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating deal suggestions:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback suggestions if AI parsing fails
function generateFallbackSuggestions(deal: any, context: any): DealSuggestion[] {
  const suggestions: DealSuggestion[] = [];
  const now = new Date();

  // Check for stalled deals
  const daysSinceUpdate = Math.floor(
    (now.getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceUpdate > 7 && deal.stage !== "closed" && deal.stage !== "lost") {
    suggestions.push({
      type: "warning",
      priority: "high",
      title: "Deal may be stalled",
      description: `No updates in ${daysSinceUpdate} days. Consider following up with the client or moving to next stage.`,
      action: {
        label: "Review Deal",
        type: "review",
      },
    });
  }

  // Check for overdue milestones
  const overdueMilestones = context.milestones.filter((m: any) => m.is_overdue);
  if (overdueMilestones.length > 0) {
    suggestions.push({
      type: "warning",
      priority: "high",
      title: `${overdueMilestones.length} overdue milestone(s)`,
      description: "Review and update milestone status to keep deal on track.",
      action: {
        label: "View Milestones",
        type: "view_milestones",
      },
    });
  }

  // Check for missing close date
  if (!deal.expected_close_date && deal.stage === "under_contract") {
    suggestions.push({
      type: "action",
      priority: "medium",
      title: "Add expected close date",
      description: "Setting a close date helps track progress and create milestone reminders.",
      action: {
        label: "Add Close Date",
        type: "update_date",
        params: { field: "expected_close_date" },
      },
    });
  }

  return suggestions;
}
