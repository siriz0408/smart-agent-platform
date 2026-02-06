import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";
import { AI_CONFIG, getAIApiKey, getAnthropicHeaders } from "../_shared/ai-config.ts";
import { requireEnv } from "../_shared/validateEnv.ts";
import { checkRateLimit, rateLimitResponse, AGENT_EXECUTION_LIMITS } from "../_shared/rateLimit.ts";
import { 
  ActionRequest, 
  ActionContext, 
  queueAction, 
  executeAction,
  getActionDescriptions,
} from "../_shared/agentActions.ts";

const MAX_ACTIONS_PER_RUN = 10;
const MAX_SYSTEM_PROMPT_LENGTH = 10000;
const ACTION_EXECUTION_LIMITS = {
  maxRequests: 50,
  windowSeconds: 3600,
  prefix: "agent-actions",
};
import { getCorsHeaders } from "../_shared/cors.ts";

interface AgentExecutionRequest {
  agent_id: string;
  context: {
    property_id?: string;
    contact_id?: string;
    document_id?: string;
    deal_id?: string;
    additional_context?: string;
  };
  // New fields for autonomous execution
  enable_actions?: boolean; // Whether agent can request actions
  auto_execute_actions?: boolean; // Execute actions immediately without approval
  trigger_event?: Record<string, unknown>; // Event that triggered this execution
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv(["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiApiKey = getAIApiKey();

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for inserting agent runs
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Get tenant ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;

    // Apply rate limiting per user
    const rateLimitResult = checkRateLimit(userId, AGENT_EXECUTION_LIMITS);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    // Check usage limits first
    const { data: usageData } = await serviceClient.rpc("check_and_increment_ai_usage", {
      p_tenant_id: tenantId,
    });

    if (usageData && usageData.length > 0 && usageData[0].is_exceeded) {
      return new Response(
        JSON.stringify({
          error: "usage_limit_exceeded",
          current_usage: usageData[0].current_usage,
          usage_limit: usageData[0].usage_limit,
          plan_name: usageData[0].plan_name,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestBody: AgentExecutionRequest = await req.json();
    const { agent_id, context, enable_actions = false, auto_execute_actions = false, trigger_event } = requestBody;

    if (!agent_id) {
      return new Response(JSON.stringify({ error: "agent_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agent details
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Validate tenant isolation - ensure agent belongs to user's workspace or is public
    // Public agents (tenant_id IS NULL) can be executed by any user
    // Workspace-specific agents can only be executed by users in that workspace
    if (agent.tenant_id !== null && agent.tenant_id !== tenantId) {
      logger.warn("Tenant isolation violation attempted", {
        user_id: userId,
        user_tenant_id: tenantId,
        agent_id: agent_id,
        agent_tenant_id: agent.tenant_id,
      });
      return new Response(
        JSON.stringify({ error: "Forbidden: Agent does not belong to your workspace" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create agent run record
    const { data: agentRun, error: runError } = await serviceClient
      .from("agent_runs")
      .insert({
        tenant_id: tenantId,
        agent_id: agent_id,
        user_id: userId,
        input_context: context,
        status: "running",
      })
      .select()
      .single();

    if (runError) {
      logger.error("Error creating agent run", { error: runError.message });
      return new Response(JSON.stringify({ error: "Failed to create agent run" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather context based on agent type
    let contextData = "";

    if (context.property_id) {
      const { data: property } = await supabase
        .from("properties")
        .select("*")
        .eq("id", context.property_id)
        .eq("tenant_id", tenantId)
        .single();

      if (!property) {
        return new Response(JSON.stringify({ error: "Property not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (property) {
        contextData += `\n## Property Details\n`;
        contextData += `Address: ${property.address}, ${property.city}, ${property.state} ${property.zip_code}\n`;
        contextData += `Type: ${property.property_type || "Not specified"}\n`;
        contextData += `Price: ${property.price ? `$${property.price.toLocaleString()}` : "Not set"}\n`;
        contextData += `Bedrooms: ${property.bedrooms || "N/A"} | Bathrooms: ${property.bathrooms || "N/A"}\n`;
        contextData += `Square Feet: ${property.square_feet ? property.square_feet.toLocaleString() : "N/A"}\n`;
        contextData += `Year Built: ${property.year_built || "N/A"}\n`;
        contextData += `Lot Size: ${property.lot_size ? `${property.lot_size} acres` : "N/A"}\n`;
        // HOA info
        if (property.hoa_fee) {
          contextData += `HOA Fee: $${property.hoa_fee}/month${property.hoa_name ? ` (${property.hoa_name})` : ""}\n`;
        }
        // Parking & HVAC
        if (property.parking_spaces || property.parking_type) {
          contextData += `Parking: ${property.parking_spaces || "N/A"} spaces${property.parking_type ? ` (${property.parking_type})` : ""}\n`;
        }
        if (property.heating_type || property.cooling_type) {
          contextData += `HVAC: ${property.heating_type || "N/A"} / ${property.cooling_type || "N/A"}\n`;
        }
        // Schools
        if (property.school_district) {
          contextData += `School District: ${property.school_district}\n`;
        }
        // Taxes
        if (property.annual_taxes) {
          contextData += `Annual Taxes: $${property.annual_taxes.toLocaleString()}\n`;
        }
        // Marketing info
        if (property.days_on_market !== null && property.days_on_market !== undefined) {
          contextData += `Days on Market: ${property.days_on_market}\n`;
        }
        if (property.listing_agent_name) {
          contextData += `Listing Agent: ${property.listing_agent_name}${property.listing_agent_phone ? ` (${property.listing_agent_phone})` : ""}\n`;
        }
        if (property.features && property.features.length > 0) {
          contextData += `Features: ${property.features.join(", ")}\n`;
        }
        if (property.description) {
          contextData += `Current Description: ${property.description}\n`;
        }
      }
    }

    if (context.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", context.contact_id)
        .eq("tenant_id", tenantId)
        .single();

      if (!contact) {
        return new Response(JSON.stringify({ error: "Contact not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (contact) {
        contextData += `\n## Contact Details\n`;
        contextData += `Name: ${contact.first_name} ${contact.last_name}\n`;
        contextData += `Email: ${contact.email || "Not provided"}\n`;
        contextData += `Phone: ${contact.phone || "Not provided"}\n`;
        contextData += `Company: ${contact.company || "N/A"}\n`;
        contextData += `Type: ${contact.contact_type || "Lead"}\n`;
        contextData += `Status: ${contact.status || "Active"}\n`;
        // Buyer preferences
        if (contact.price_min || contact.price_max) {
          contextData += `Budget: ${contact.price_min ? `$${contact.price_min.toLocaleString()}` : "Any"} - ${contact.price_max ? `$${contact.price_max.toLocaleString()}` : "Any"}\n`;
        }
        if (contact.preferred_beds || contact.preferred_baths) {
          contextData += `Preferences: ${contact.preferred_beds || "Any"} beds / ${contact.preferred_baths || "Any"} baths\n`;
        }
        if (contact.preferred_areas && contact.preferred_areas.length > 0) {
          contextData += `Preferred Areas: ${contact.preferred_areas.join(", ")}\n`;
        }
        if (contact.preferred_property_types && contact.preferred_property_types.length > 0) {
          contextData += `Property Types: ${contact.preferred_property_types.join(", ")}\n`;
        }
        // Seller info
        if (contact.owned_property_address) {
          contextData += `Owned Property: ${contact.owned_property_address}\n`;
        }
        if (contact.listing_timeline) {
          contextData += `Listing Timeline: ${contact.listing_timeline}\n`;
        }
        // Financial status
        if (contact.pre_approval_status) {
          contextData += `Pre-Approval: ${contact.pre_approval_status}${contact.pre_approval_amount ? ` ($${contact.pre_approval_amount.toLocaleString()})` : ""}\n`;
        }
        if (contact.lender_name) {
          contextData += `Lender: ${contact.lender_name}\n`;
        }
        // Timeline
        if (contact.urgency_level) {
          contextData += `Urgency: ${contact.urgency_level}\n`;
        }
        if (contact.target_move_date) {
          contextData += `Target Move Date: ${contact.target_move_date}\n`;
        }
        // Communication preferences
        if (contact.preferred_contact_method) {
          contextData += `Preferred Contact Method: ${contact.preferred_contact_method}\n`;
        }
        // Lead tracking
        if (contact.lead_source) {
          contextData += `Lead Source: ${contact.lead_source}\n`;
        }
        if (contact.notes) {
          contextData += `Notes: ${contact.notes}\n`;
        }
      }
    }

    if (context.document_id) {
      const { data: doc } = await supabase
        .from("documents")
        .select("id, name, category")
        .eq("id", context.document_id)
        .eq("tenant_id", tenantId)
        .single();

      if (!doc) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (doc) {
        contextData += `\n## Document: ${doc.name}\n`;
        contextData += `Category: ${doc.category || "Other"}\n`;

        // Fetch document chunks for content
        const { data: chunks } = await supabase
          .from("document_chunks")
          .select("content, chunk_index")
          .eq("document_id", context.document_id)
          .order("chunk_index")
          .limit(20);

        if (chunks && chunks.length > 0) {
          contextData += `\n### Document Content:\n`;
          chunks.forEach((chunk) => {
            contextData += chunk.content + "\n\n";
          });
        }

        // Fetch structured metadata if available
        const { data: metadata } = await supabase
          .from("document_metadata")
          .select("extracted_data, key_facts")
          .eq("document_id", context.document_id)
          .maybeSingle();

        if (metadata?.extracted_data) {
          contextData += `\n### Extracted Data:\n${JSON.stringify(metadata.extracted_data, null, 2)}\n`;
        }
        if (metadata?.key_facts && metadata.key_facts.length > 0) {
          contextData += `\n### Key Facts:\n${metadata.key_facts.join("\n")}\n`;
        }
      }
    }

    if (context.deal_id) {
      const { data: deal } = await supabase
        .from("deals")
        .select("*, contacts(*), properties(*)")
        .eq("id", context.deal_id)
        .eq("tenant_id", tenantId)
        .single();

      if (!deal) {
        return new Response(JSON.stringify({ error: "Deal not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (deal) {
        contextData += `\n## Deal Details\n`;
        contextData += `Type: ${deal.deal_type}\n`;
        contextData += `Stage: ${deal.stage || "Lead"}\n`;
        contextData += `Estimated Value: ${deal.estimated_value ? `$${deal.estimated_value.toLocaleString()}` : "N/A"}\n`;
        contextData += `Expected Close: ${deal.expected_close_date || "Not set"}\n`;
        // Financials
        if (deal.earnest_money) {
          contextData += `Earnest Money: $${deal.earnest_money.toLocaleString()}\n`;
        }
        if (deal.option_fee) {
          contextData += `Option Fee: $${deal.option_fee.toLocaleString()}\n`;
        }
        if (deal.appraisal_value) {
          contextData += `Appraisal Value: $${deal.appraisal_value.toLocaleString()}\n`;
        }
        if (deal.final_sale_price) {
          contextData += `Final Sale Price: $${deal.final_sale_price.toLocaleString()}\n`;
        }
        // Key dates
        if (deal.option_period_end || deal.inspection_date || deal.appraisal_date || deal.financing_deadline) {
          contextData += `Key Dates: `;
          const dates = [];
          if (deal.option_period_end) dates.push(`Option Period: ${deal.option_period_end}`);
          if (deal.inspection_date) dates.push(`Inspection: ${deal.inspection_date}`);
          if (deal.appraisal_date) dates.push(`Appraisal: ${deal.appraisal_date}`);
          if (deal.financing_deadline) dates.push(`Financing: ${deal.financing_deadline}`);
          contextData += dates.join(", ") + "\n";
        }
        // Contingencies
        const contingencies = [];
        if (deal.has_inspection_contingency) contingencies.push("Inspection");
        if (deal.has_financing_contingency) contingencies.push("Financing");
        if (deal.has_appraisal_contingency) contingencies.push("Appraisal");
        if (deal.has_sale_contingency) contingencies.push("Sale of Home");
        if (contingencies.length > 0) {
          contextData += `Contingencies: ${contingencies.join(", ")}\n`;
        }
        // Lender info
        if (deal.loan_type || deal.lender_name) {
          contextData += `Loan: ${deal.loan_type || "Unknown type"}${deal.lender_name ? ` via ${deal.lender_name}` : ""}\n`;
        }
        if (deal.loan_officer_name) {
          contextData += `Loan Officer: ${deal.loan_officer_name}${deal.loan_officer_phone ? ` (${deal.loan_officer_phone})` : ""}\n`;
        }
        // Title/Escrow
        if (deal.title_company) {
          contextData += `Title Company: ${deal.title_company}\n`;
        }
        if (deal.escrow_officer_name) {
          contextData += `Escrow Officer: ${deal.escrow_officer_name}${deal.escrow_officer_phone ? ` (${deal.escrow_officer_phone})` : ""}\n`;
        }
        if (deal.notes) {
          contextData += `Notes: ${deal.notes}\n`;
        }
        if (deal.contacts) {
          const c = deal.contacts;
          contextData += `\nContact: ${c.first_name} ${c.last_name}\n`;
        }
        if (deal.properties) {
          const p = deal.properties;
          contextData += `\nProperty: ${p.address}, ${p.city}, ${p.state}\n`;
        }
      }
    }

    if (context.additional_context) {
      contextData += `\n## Additional Context\n${context.additional_context}\n`;
    }

    if (auto_execute_actions) {
      const { data: isAdmin, error: adminError } = await serviceClient.rpc("is_admin", {
        _user_id: userId,
      });

      if (adminError || !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: auto_execute_actions requires admin role" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build the prompt with optional action capabilities
    let systemPrompt = agent.system_prompt || "You are a helpful real estate AI assistant.";
    systemPrompt = systemPrompt.slice(0, MAX_SYSTEM_PROMPT_LENGTH);
    
    // If actions are enabled, append action instructions to system prompt
    if (enable_actions) {
      const actionDescriptions = getActionDescriptions();
      const actionList = Object.entries(actionDescriptions)
        .map(([type, desc]) => `- \`${type}\`: ${desc}`)
        .join('\n');
      
      systemPrompt += `

## Action Capabilities

You are an AUTONOMOUS agent that can both analyze data AND take actions. When you determine an action should be taken, include it in your response.

### Available Actions
${actionList}

### Response Format
When you want to take actions, structure your response as JSON with this format:

\`\`\`json
{
  "analysis": "Your analysis of the situation...",
  "recommendation": "Your recommendation and reasoning...",
  "actions": [
    {
      "type": "action_type",
      "params": { /* parameters for the action */ },
      "reason": "Why you're recommending this action"
    }
  ]
}
\`\`\`

If no actions are needed, you can respond normally without JSON.

### Important Guidelines
- Only request actions when they genuinely add value
- Provide clear reasoning for each action
- Use contact_id, deal_id, property_id from the context when available
- For create_contact: include first_name (required), last_name, email, phone, contact_type
- For create_deal: include contact_id (required), deal_type (buyer/seller/dual), stage
- For send_email: include template or subject/message, and recipient info
- For schedule_task: include title, due_in_days or due_date
`;

      // Add trigger event context if this was auto-triggered
      if (trigger_event) {
        contextData += `\n## Trigger Event\nThis agent was automatically triggered by an event:\n${JSON.stringify(trigger_event, null, 2)}\n`;
      }
    }

    const userPrompt = contextData || "No specific context provided. Please provide general guidance.";

    // Call Anthropic API with streaming
    const aiResponse = await fetch(AI_CONFIG.GATEWAY_URL, {
      method: "POST",
      headers: getAnthropicHeaders(aiApiKey),
      body: JSON.stringify({
        model: AI_CONFIG.DEFAULT_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logger.error("AI Gateway error", { status: aiResponse.status, errorText });

      // Update agent run as failed
      await serviceClient
        .from("agent_runs")
        .update({
          status: "failed",
          error_message: `AI Gateway error: ${aiResponse.status}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", agentRun.id);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment usage after successful AI call
    await serviceClient.from("usage_records").insert({
      tenant_id: tenantId,
      record_type: "ai_query",
      quantity: 1,
    });

    // Transform the stream to capture full response
    const reader = aiResponse.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            // Parse Anthropic SSE to extract content
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr) {
                    const parsed = JSON.parse(jsonStr);
                    // Anthropic format: content_block_delta with delta.text
                    if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                      fullContent += parsed.delta.text;
                    }
                  }
                } catch {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }

          // Parse and process actions if enabled
          let parsedActions: ActionRequest[] = [];
          const actionResults: Array<{ action: ActionRequest; result: unknown }> = [];
          let actionLimitExceeded = false;
          let actionRateLimited = false;
          
          if (enable_actions && fullContent) {
            const extractActionPayload = (content: string): { actions?: unknown } | null => {
              const blocks = Array.from(content.matchAll(/```json\s*([\s\S]*?)\s*```/g)).map(match => match[1]);
              for (const block of blocks) {
                try {
                  return JSON.parse(block);
                } catch {
                  continue;
                }
              }

              const trimmed = content.trim();
              if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                  return JSON.parse(trimmed);
                } catch {
                  // Fall through
                }
              }

              const firstBrace = content.indexOf("{");
              const lastBrace = content.lastIndexOf("}");
              if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const candidate = content.slice(firstBrace, lastBrace + 1);
                if (candidate.includes('"actions"')) {
                  try {
                    return JSON.parse(candidate);
                  } catch {
                    // Fall through
                  }
                }
              }

              return null;
            };

            try {
              const parsed = extractActionPayload(fullContent);
              if (parsed?.actions && Array.isArray(parsed.actions)) {
                parsedActions = parsed.actions.filter((action) => {
                  return action && typeof action === "object" && typeof (action as ActionRequest).type === "string";
                }) as ActionRequest[];
              }
            } catch (parseError) {
              logger.warn("Failed to parse actions from response", { 
                error: parseError instanceof Error ? parseError.message : String(parseError) 
              });
            }

            if (parsedActions.length > MAX_ACTIONS_PER_RUN) {
              actionLimitExceeded = true;
              parsedActions = parsedActions.slice(0, MAX_ACTIONS_PER_RUN);
            }

            if (parsedActions.length > 0) {
              const actionRateResult = checkRateLimit(userId, ACTION_EXECUTION_LIMITS);
              if (!actionRateResult.allowed) {
                actionRateLimited = true;
              }

              // Process each action
              const actionContext: ActionContext = {
                tenant_id: tenantId,
                user_id: userId,
                agent_run_id: agentRun.id,
                requires_approval: !auto_execute_actions,
                source_contact: context.contact_id ? { id: context.contact_id } : undefined,
                source_deal: context.deal_id ? { id: context.deal_id } : undefined,
                source_property: context.property_id ? { id: context.property_id } : undefined,
                source_document: context.document_id ? { id: context.document_id } : undefined,
              };
              
              if (actionRateLimited) {
                logger.warn("Action rate limit exceeded", { user_id: userId });
              } else {
                for (const action of parsedActions) {
                  try {
                    if (auto_execute_actions) {
                      // Execute immediately
                      const result = await executeAction(serviceClient, action, actionContext);
                      actionResults.push({ action, result });
                      logger.info("Action executed", { action_type: action.type, success: result.success });
                    } else {
                      // Queue for approval
                      const queueResult = await queueAction(serviceClient, action, actionContext);
                      actionResults.push({ action, result: queueResult });
                      logger.info("Action queued", { action_type: action.type, queued: queueResult.queued });
                    }
                  } catch (actionError) {
                    const errorMessage = actionError instanceof Error ? actionError.message : String(actionError);
                    logger.error("Action processing failed", { action_type: action.type, error: errorMessage });
                    actionResults.push({ action, result: { success: false, error: errorMessage } });
                  }
                }
              }
            }
          }

          // Update agent run as completed with action info
          await serviceClient
            .from("agent_runs")
            .update({
              status: "completed",
              output_result: { 
                content: fullContent,
                actions_requested: parsedActions.length,
                actions_processed: actionResults.length,
                action_results: actionResults,
                action_limit_exceeded: actionLimitExceeded,
                action_limit: MAX_ACTIONS_PER_RUN,
                action_rate_limited: actionRateLimited,
              },
              completed_at: new Date().toISOString(),
            })
            .eq("id", agentRun.id);

          controller.close();
        } catch (error) {
          logger.error("Stream error", { error: error instanceof Error ? error.message : String(error) });
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return createErrorResponse(error, corsHeaders, { functionName: "execute-agent" });
  }
});
