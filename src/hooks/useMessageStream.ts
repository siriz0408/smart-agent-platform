import { useState, useCallback } from "react";
import { useAIStreaming, type StreamMessage, type EmbeddedComponentsData } from "./useAIStreaming";

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  embedded_components?: {
    property_cards?: EmbeddedComponentsData['property_cards'];
  };
}

interface SendMessageOptions {
  /** The user's message text */
  text: string;
  /** Optional document IDs to include */
  documentIds?: string[];
  /** Whether to include documents in query */
  includeDocuments?: boolean;
  /** Optional conversation ID for persistence */
  conversationId?: string;
  /** Called after user message added but before streaming starts */
  onUserMessageSaved?: (content: string) => Promise<void>;
  /** Called after assistant response completes */
  onAssistantMessageSaved?: (content: string, components?: EmbeddedComponentsData) => Promise<void>;
  /** Called when usage limit exceeded */
  onUsageLimitExceeded?: (info: { current: number; limit: number; plan: string }) => void;
}

interface UseMessageStreamOptions {
  /** Initial messages to display */
  initialMessages?: Message[];
}

/**
 * Hook for managing message streaming with optimistic updates.
 * Wraps useAIStreaming with message state management.
 */
export function useMessageStream(options: UseMessageStreamOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
  const { streamMessage, isStreaming, error, abort } = useAIStreaming();

  const sendMessage = useCallback(async (options: SendMessageOptions): Promise<boolean> => {
    const {
      text,
      documentIds,
      includeDocuments,
      conversationId,
      onUserMessageSaved,
      onAssistantMessageSaved,
      onUsageLimitExceeded,
    } = options;

    if (!text.trim() || isStreaming) return false;

    // Add user message optimistically
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Optional: Save user message to database
      await onUserMessageSaved?.(userMessage.content);

      // Prepare messages for streaming (convert to API format)
      const streamMessages: StreamMessage[] = messages
        .concat(userMessage)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const assistantMessageId = (Date.now() + 1).toString();
      let receivedComponents: EmbeddedComponentsData | undefined;

      // Stream assistant response
      const result = await streamMessage({
        messages: streamMessages,
        documentIds,
        includeDocuments,
        conversationId,
        onEmbeddedComponents: (components) => {
          receivedComponents = components;
          // Update assistant message with embedded components
          setMessages((prev) => {
            const lastIndex = prev.length - 1;
            if (prev[lastIndex]?.role === "assistant") {
              return prev.map((m, i) =>
                i === lastIndex
                  ? {
                      ...m,
                      embedded_components: components,
                    }
                  : m
              );
            }
            return prev;
          });
        },
        onChunk: (_chunk, fullContent) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              // Update existing assistant message
              return prev.map((m, i) =>
                i === prev.length - 1
                  ? {
                      ...m,
                      content: fullContent,
                      embedded_components: receivedComponents,
                    }
                  : m
              );
            }
            // Create new assistant message
            return [
              ...prev,
              {
                id: assistantMessageId,
                role: "assistant" as const,
                content: fullContent,
                timestamp: new Date(),
                embedded_components: receivedComponents,
              },
            ];
          });
        },
        onComplete: async (fullContent) => {
          // Optional: Save assistant message to database
          await onAssistantMessageSaved?.(fullContent, receivedComponents);
        },
        onError: (err) => {
          throw err;
        },
        onUsageLimitExceeded: (info) => {
          onUsageLimitExceeded?.(info);
        },
      });

      return result !== null;
    } catch (err) {
      return false;
    }
  }, [messages, streamMessage, isStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    clearMessages,
    isStreaming,
    error,
    abort,
  };
}
