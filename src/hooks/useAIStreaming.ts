import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EmbeddedComponents } from "@/types/property";

// Re-export for backward compatibility
export type EmbeddedComponentsData = EmbeddedComponents;

export interface StreamMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UsageLimitInfo {
  current: number;
  limit: number;
  plan: string;
}

/** Status update from the backend during processing */
export interface StatusUpdate {
  step: "analyzing" | "searching" | "filtering" | "generating" | "error";
  message: string;
  details?: Record<string, unknown>;
}

interface MentionData {
  type: "contact" | "property" | "doc";
  id: string;
  name: string;
  data: Record<string, unknown>;
}

/** Collection reference for #Collection syntax */
interface CollectionRef {
  collection: "Properties" | "Contacts" | "Deals" | "Documents";
}

interface StreamOptions {
  /** The messages history to send */
  messages: StreamMessage[];
  /** Optional document IDs to include in context */
  documentIds?: string[];
  /** Whether to include documents in the query */
  includeDocuments?: boolean;
  /** Optional conversation ID */
  conversationId?: string;
  /** Optional mention data with full entity details */
  mentionData?: MentionData[];
  /** Optional collection references for bulk queries */
  collectionRefs?: CollectionRef[];
  /** Called when a new content chunk arrives */
  onChunk?: (content: string, fullContent: string) => void;
  /** Called when streaming completes */
  onComplete?: (fullContent: string, embeddedComponents?: EmbeddedComponents) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when usage limit is exceeded */
  onUsageLimitExceeded?: (info: UsageLimitInfo) => void;
  /** Called when embedded components are received */
  onEmbeddedComponents?: (components: EmbeddedComponents) => void;
  /** Called when a status update is received during processing */
  onStatus?: (status: StatusUpdate) => void;
}

interface UseAIStreamingReturn {
  /** Stream a message to the AI endpoint */
  streamMessage: (options: StreamOptions) => Promise<string | null>;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Current error if any */
  error: Error | null;
  /** Abort the current stream */
  abort: () => void;
}

const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/**
 * Hook for streaming AI chat responses with SSE support.
 * Handles error handling, usage limits, and abort functionality.
 */
export function useAIStreaming(): UseAIStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const streamMessage = useCallback(async (options: StreamOptions): Promise<string | null> => {
    const {
      messages,
      documentIds,
      includeDocuments,
      conversationId,
      mentionData,
      collectionRefs,
      onChunk,
      onComplete,
      onError,
      onUsageLimitExceeded,
      onEmbeddedComponents,
      onStatus,
    } = options;

    // Abort any existing stream
    abort();

    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let fullContent = "";
    let embeddedComponents: EmbeddedComponents | undefined;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const requestBody = {
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ...(documentIds?.length && { documentIds }),
        ...(includeDocuments !== undefined && { includeDocuments }),
        ...(conversationId && { conversationId }),
        ...(mentionData?.length && { mentionData }),
        ...(collectionRefs?.length && { collectionRefs }),
      };

      const response = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle usage limit exceeded (429)
        if (response.status === 429 && errorData.error === "usage_limit_exceeded") {
          const limitInfo: UsageLimitInfo = {
            current: errorData.current_usage,
            limit: errorData.usage_limit,
            plan: errorData.plan,
          };
          onUsageLimitExceeded?.(limitInfo);
          throw new Error("Usage limit exceeded");
        }

        throw new Error(errorData.error || "Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          // Trim carriage return if present
          if (line.endsWith("\r")) {
            line = line.slice(0, -1);
          }

          // Skip comments and empty lines
          if (line.startsWith(":") || line.trim() === "") continue;

          // Skip non-data lines
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          console.log("[useAIStreaming] Raw SSE data:", jsonStr.slice(0, 150));

          // Handle stream end
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            console.log("[useAIStreaming] Parsed SSE event:", JSON.stringify(parsed).slice(0, 200));
            
            // Handle status event
            if (parsed.status) {
              console.log("[useAIStreaming] 📊 STATUS UPDATE:", parsed.status);
              onStatus?.(parsed.status);
              continue;
            }
            
            // Handle embedded components event
            if (parsed.embedded_components) {
              console.log("[useAIStreaming] 🎯 EMBEDDED COMPONENTS DETECTED:", {
                hasPropertyCards: !!parsed.embedded_components.property_cards,
                propertyCardsCount: parsed.embedded_components.property_cards?.length,
                keys: Object.keys(parsed.embedded_components),
              });
              embeddedComponents = parsed.embedded_components;
              onEmbeddedComponents?.(parsed.embedded_components);
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              onChunk?.(content, fullContent);
            }
          } catch {
            // Partial JSON, will be completed in next chunk
            // Put the line back in the buffer
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush any remaining data in the buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle status event
            if (parsed.status) {
              onStatus?.(parsed.status);
              continue;
            }
            
            // Handle embedded components event
            if (parsed.embedded_components) {
              embeddedComponents = parsed.embedded_components;
              onEmbeddedComponents?.(parsed.embedded_components);
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              onChunk?.(content, fullContent);
            }
          } catch {
            // Ignore parsing errors in flush
          }
        }
      }

      onComplete?.(fullContent, embeddedComponents);
      return fullContent;
    } catch (err) {
      // Don't treat abort as an error
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }

      const streamError = err instanceof Error ? err : new Error("Unknown error");
      setError(streamError);

      // Only call onError for non-usage-limit errors
      if (streamError.message !== "Usage limit exceeded") {
        onError?.(streamError);
      }

      return null;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [abort]);

  return {
    streamMessage,
    isStreaming,
    error,
    abort,
  };
}
