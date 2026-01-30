import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export interface AgentContext {
  property_id?: string;
  contact_id?: string;
  document_id?: string;
  deal_id?: string;
  additional_context?: string;
}

export interface AgentExecutionResult {
  content: string;
  isStreaming: boolean;
  error: string | null;
  usageLimitExceeded?: {
    current_usage: number;
    usage_limit: number;
    plan_name: string;
  };
}

export function useAgentExecution() {
  const { session } = useAuth();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<AgentExecutionResult>({
    content: "",
    isStreaming: false,
    error: null,
  });

  const executeAgent = useCallback(
    async (agentId: string, context: AgentContext) => {
      if (!session?.access_token) {
        setResult({
          content: "",
          isStreaming: false,
          error: "You must be logged in to use AI agents",
        });
        return;
      }

      setIsExecuting(true);
      setResult({ content: "", isStreaming: true, error: null });

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-agent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ agent_id: agentId, context }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 429 && errorData.error === "usage_limit_exceeded") {
            setResult({
              content: "",
              isStreaming: false,
              error: "usage_limit_exceeded",
              usageLimitExceeded: {
                current_usage: errorData.current_usage,
                usage_limit: errorData.usage_limit,
                plan_name: errorData.plan_name,
              },
            });
            setIsExecuting(false);
            return;
          }
          
          throw new Error(errorData.error || "Failed to execute agent");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Parse SSE events
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== "[DONE]") {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    accumulatedContent += content;
                    setResult((prev) => ({
                      ...prev,
                      content: accumulatedContent,
                    }));
                  }
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        setResult({
          content: accumulatedContent,
          isStreaming: false,
          error: null,
        });
      } catch (error) {
        logger.error("Agent execution error:", error);
        setResult({
          content: "",
          isStreaming: false,
          error: error instanceof Error ? error.message : "Failed to execute agent",
        });
      } finally {
        setIsExecuting(false);
      }
    },
    [session?.access_token]
  );

  const resetResult = useCallback(() => {
    setResult({ content: "", isStreaming: false, error: null });
  }, []);

  return {
    executeAgent,
    isExecuting,
    result,
    resetResult,
  };
}
