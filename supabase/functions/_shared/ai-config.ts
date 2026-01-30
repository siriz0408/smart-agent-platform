export const AI_CONFIG = {
  // Anthropic Messages API endpoint
  GATEWAY_URL: Deno.env.get("AI_GATEWAY_URL") || "https://api.anthropic.com/v1/messages",
  // Claude Sonnet 4 is the recommended model for production
  DEFAULT_MODEL: Deno.env.get("AI_MODEL") || "claude-sonnet-4-20250514",
  API_KEY_ENV: "ANTHROPIC_API_KEY",
  // Anthropic API version
  API_VERSION: "2023-06-01",
} as const;

export function getAIApiKey(): string {
  const apiKey = Deno.env.get(AI_CONFIG.API_KEY_ENV);
  if (!apiKey) {
    throw new Error(`${AI_CONFIG.API_KEY_ENV} is not configured`);
  }
  return apiKey;
}

// Helper to get Anthropic API headers
export function getAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": AI_CONFIG.API_VERSION,
    "content-type": "application/json",
  };
}

// Type definitions for Anthropic Messages API
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  tools?: AnthropicToolDefinition[];
  stream?: boolean;
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Convert OpenAI-style tools to Anthropic format
export function convertToAnthropicTool(openAITool: {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}): AnthropicToolDefinition {
  return {
    name: openAITool.function.name,
    description: openAITool.function.description,
    input_schema: openAITool.function.parameters as AnthropicToolDefinition["input_schema"],
  };
}

// Helper to call Anthropic API (non-streaming)
export async function callAnthropicAPI(
  messages: AnthropicMessage[],
  options: {
    system?: string;
    maxTokens?: number;
    tools?: AnthropicToolDefinition[];
    model?: string;
  } = {}
): Promise<AnthropicResponse> {
  const apiKey = getAIApiKey();

  const request: AnthropicRequest = {
    model: options.model || AI_CONFIG.DEFAULT_MODEL,
    max_tokens: options.maxTokens || 4096,
    messages,
    stream: false,
  };

  if (options.system) {
    request.system = options.system;
  }

  if (options.tools && options.tools.length > 0) {
    request.tools = options.tools;
  }

  const response = await fetch(AI_CONFIG.GATEWAY_URL, {
    method: "POST",
    headers: getAnthropicHeaders(apiKey),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Extract text from Anthropic response
export function extractTextFromResponse(response: AnthropicResponse): string {
  const textBlocks = response.content.filter(
    (block): block is AnthropicContentBlock & { type: "text"; text: string } =>
      block.type === "text" && typeof block.text === "string"
  );
  return textBlocks.map((b) => b.text).join("");
}

// Check if response contains a tool use
export function hasToolUse(response: AnthropicResponse): boolean {
  return response.content.some((block) => block.type === "tool_use");
}

// Extract tool use from response
export function extractToolUse(response: AnthropicResponse): {
  id: string;
  name: string;
  input: Record<string, unknown>;
} | null {
  const toolBlock = response.content.find((block) => block.type === "tool_use");
  if (toolBlock && toolBlock.type === "tool_use" && toolBlock.id && toolBlock.name && toolBlock.input) {
    return {
      id: toolBlock.id,
      name: toolBlock.name,
      input: toolBlock.input,
    };
  }
  return null;
}
