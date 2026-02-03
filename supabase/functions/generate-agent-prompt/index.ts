import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAIApiKey, getAnthropicHeaders, AI_CONFIG } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, description, category } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Agent name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiApiKey = getAIApiKey();
    if (!aiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the meta-prompt for generating agent instructions
    const metaPrompt = `You are an expert at writing system prompts for AI agents. Generate a comprehensive, well-structured system prompt for an AI agent with the following details:

**Agent Name:** ${name}
**Description:** ${description || "No description provided"}
**Category:** ${category || "general"}

The system prompt should:
1. Define the agent's role and expertise clearly
2. Specify the tone and communication style
3. Include specific instructions for handling user requests
4. Add formatting guidelines for responses (use clean markdown: bold headers, bullet points, numbered lists)
5. Include any domain-specific best practices relevant to the category
6. Be tailored for real estate professionals if applicable
7. Be between 500-1500 characters for optimal performance

Write ONLY the system prompt content, no explanations or meta-commentary. Start directly with "You are..." or similar.`;

    // Call Anthropic API
    const response = await fetch(AI_CONFIG.gatewayUrl, {
      method: "POST",
      headers: getAnthropicHeaders(aiApiKey),
      body: JSON.stringify({
        model: AI_CONFIG.defaultModel,
        max_tokens: 1024,
        system: "You are an expert prompt engineer. Generate clear, effective system prompts for AI agents.",
        messages: [
          {
            role: "user",
            content: metaPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate prompt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedPrompt = data.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({ prompt: generatedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating prompt:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
