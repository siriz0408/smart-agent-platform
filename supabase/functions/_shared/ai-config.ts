export const AI_CONFIG = {
  GATEWAY_URL: Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions",
  DEFAULT_MODEL: Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview",
  API_KEY_ENV: "LOVABLE_API_KEY",
} as const;

export function getAIApiKey(): string {
  const apiKey = Deno.env.get(AI_CONFIG.API_KEY_ENV);
  if (!apiKey) {
    throw new Error(`${AI_CONFIG.API_KEY_ENV} is not configured`);
  }
  return apiKey;
}
