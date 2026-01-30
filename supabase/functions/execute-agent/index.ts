import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { AI_CONFIG, getAIApiKey } from "../_shared/ai-config.ts";
import { requireEnv } from "../_shared/validateEnv.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AgentExecutionRequest {
  agent_id: string;
  context: {
    property_id?: string;
    contact_id?: string;
    document_id?: string;
    deal_id?: string;
    additional_context?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    requireEnv(["LOVABLE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

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

    const { agent_id, context }: AgentExecutionRequest = await req.json();

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
        .single();

      if (property) {
        contextData += `\n## Property Details\n`;
        contextData += `Address: ${property.address}, ${property.city}, ${property.state} ${property.zip_code}\n`;
        contextData += `Type: ${property.property_type || "Not specified"}\n`;
        contextData += `Price: ${property.price ? `$${property.price.toLocaleString()}` : "Not set"}\n`;
        contextData += `Bedrooms: ${property.bedrooms || "N/A"} | Bathrooms: ${property.bathrooms || "N/A"}\n`;
        contextData += `Square Feet: ${property.square_feet ? property.square_feet.toLocaleString() : "N/A"}\n`;
        contextData += `Year Built: ${property.year_built || "N/A"}\n`;
        contextData += `Lot Size: ${property.lot_size ? `${property.lot_size} acres` : "N/A"}\n`;
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
        .single();

      if (contact) {
        contextData += `\n## Contact Details\n`;
        contextData += `Name: ${contact.first_name} ${contact.last_name}\n`;
        contextData += `Email: ${contact.email || "Not provided"}\n`;
        contextData += `Phone: ${contact.phone || "Not provided"}\n`;
        contextData += `Company: ${contact.company || "N/A"}\n`;
        contextData += `Type: ${contact.contact_type || "Lead"}\n`;
        contextData += `Status: ${contact.status || "Active"}\n`;
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
        .single();

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
        .single();

      if (deal) {
        contextData += `\n## Deal Details\n`;
        contextData += `Type: ${deal.deal_type}\n`;
        contextData += `Stage: ${deal.stage || "Lead"}\n`;
        contextData += `Estimated Value: ${deal.estimated_value ? `$${deal.estimated_value.toLocaleString()}` : "N/A"}\n`;
        contextData += `Expected Close: ${deal.expected_close_date || "Not set"}\n`;
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

    // Build the prompt
    const systemPrompt = agent.system_prompt || "You are a helpful real estate AI assistant.";
    const userPrompt = contextData || "No specific context provided. Please provide general guidance.";

    // Call AI Gateway with streaming
    const aiResponse = await fetch(AI_CONFIG.GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_CONFIG.DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
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

            // Parse SSE to extract content
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr && jsonStr !== "[DONE]") {
                    const parsed = JSON.parse(jsonStr);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullContent += content;
                    }
                  }
                } catch {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }

          // Update agent run as completed
          await serviceClient
            .from("agent_runs")
            .update({
              status: "completed",
              output_result: { content: fullContent },
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
    logger.error("Execute agent error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
