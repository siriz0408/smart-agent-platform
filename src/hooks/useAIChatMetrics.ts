/**
 * Hook for tracking AI chat quality metrics
 * Used by PM-Intelligence for monitoring AI response quality
 */

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseSourceCitations } from "@/components/documents/SourceCitation";

export interface AIChatMetric {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  response_time_ms: number;
  sources_cited_count: number;
  response_length: number;
  user_feedback: "positive" | "negative" | null;
  created_at: string;
}

export interface AIChatMetricsSummary {
  total_conversations: number;
  avg_response_time_ms: number;
  avg_sources_per_response: number;
  avg_response_length: number;
  total_responses: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  feedback_rate: number;
  quality_trend: "improving" | "declining" | "stable";
}

/**
 * Track a single AI chat response metric
 */
export function useAIChatMetricsTracker() {
  const startTimeRef = useRef<number | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<Partial<AIChatMetric>>({});

  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  const recordMetric = useCallback(async (
    messageId: string,
    conversationId: string,
    userId: string,
    content: string,
    feedback?: "positive" | "negative" | null
  ) => {
    if (!startTimeRef.current) {
      console.warn("No start time recorded for metric tracking");
      return;
    }

    const responseTimeMs = Date.now() - startTimeRef.current;
    const { citations } = parseSourceCitations(content);
    const sourcesCount = citations.length;
    const responseLength = content.length;

    const metric: Partial<AIChatMetric> = {
      message_id: messageId,
      conversation_id: conversationId,
      user_id: userId,
      response_time_ms: responseTimeMs,
      sources_cited_count: sourcesCount,
      response_length: responseLength,
      user_feedback: feedback || null,
    };

    setCurrentMetrics(metric);

    // Store metric in database (we'll create a table for this)
    // For now, we'll store it in a local table or use ai_messages metadata
    try {
      // TODO: Create ai_chat_metrics table in database
      // For now, we can store metrics in a JSONB column or create a new table
      console.log("AI Chat Metric:", metric);
    } catch (error) {
      console.error("Failed to record AI chat metric:", error);
    }

    startTimeRef.current = null;
  }, []);

  return {
    startTracking,
    recordMetric,
    currentMetrics,
  };
}

/**
 * Hook to fetch AI chat metrics for a date range
 */
export function useAIChatMetrics(
  startDate?: Date,
  endDate?: Date
) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ai-chat-metrics", tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<AIChatMetric[]> => {
      // For now, calculate metrics from ai_messages table
      // In the future, we'll query a dedicated ai_chat_metrics table
      const start = startDate?.toISOString() || null;
      const end = endDate?.toISOString() || null;

      // Query assistant messages
      let query = supabase
        .from("ai_messages")
        .select("id, conversation_id, content, created_at, role")
        .eq("role", "assistant")
        .order("created_at", { ascending: false });

      if (start) {
        query = query.gte("created_at", start);
      }
      if (end) {
        query = query.lte("created_at", end);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // Calculate metrics from messages
      const metrics: AIChatMetric[] = [];

      if (messages && messages.length > 0) {
        // Get unique conversation IDs
        const conversationIds = [...new Set(messages.map((m) => m.conversation_id))];

        // Fetch conversations to get user_ids
        const { data: conversations } = await supabase
          .from("ai_conversations")
          .select("id, user_id")
          .in("id", conversationIds);

        const conversationMap = new Map(
          (conversations || []).map((c) => [c.id, c.user_id])
        );

        // Group messages by conversation and calculate response times
        const conversationMessages = new Map<string, typeof messages>();
        messages.forEach((msg) => {
          if (!conversationMessages.has(msg.conversation_id)) {
            conversationMessages.set(msg.conversation_id, []);
          }
          conversationMessages.get(msg.conversation_id)!.push(msg);
        });

        // For each conversation, calculate response times
        for (const [conversationId, convMessages] of conversationMessages) {
          // Get user messages for this conversation to calculate response times
          const { data: userMessages } = await supabase
            .from("ai_messages")
            .select("id, created_at")
            .eq("conversation_id", conversationId)
            .eq("role", "user")
            .order("created_at", { ascending: true });

          const userId = conversationMap.get(conversationId) || "";

          if (userMessages) {
            convMessages.forEach((assistantMsg) => {
              const { citations } = parseSourceCitations(assistantMsg.content);
              const sourcesCount = citations.length;
              const responseLength = assistantMsg.content.length;

              // Find the previous user message to calculate response time
              const assistantTime = new Date(assistantMsg.created_at);
              let responseTimeMs = 0;

              // Find the most recent user message before this assistant message
              const previousUserMessages = userMessages.filter(
                (um) => new Date(um.created_at) < assistantTime
              );
              if (previousUserMessages.length > 0) {
                const lastUserMessage = previousUserMessages[previousUserMessages.length - 1];
                responseTimeMs = assistantTime.getTime() - new Date(lastUserMessage.created_at).getTime();
              }

              metrics.push({
                id: assistantMsg.id,
                message_id: assistantMsg.id,
                conversation_id: conversationId,
                user_id: userId,
                response_time_ms: responseTimeMs,
                sources_cited_count: sourcesCount,
                response_length: responseLength,
                user_feedback: null, // TODO: Add feedback tracking
                created_at: assistantMsg.created_at,
              });
            });
          }
        }
      }

      return metrics;
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook to fetch AI chat metrics summary
 */
export function useAIChatMetricsSummary(
  startDate?: Date,
  endDate?: Date
) {
  const { data: metrics = [], isLoading } = useAIChatMetrics(startDate, endDate);

  const summary = metrics.length > 0
    ? calculateSummary(metrics)
    : null;

  return {
    data: summary,
    isLoading,
  };
}

/**
 * Calculate summary statistics from metrics
 */
function calculateSummary(metrics: AIChatMetric[]): AIChatMetricsSummary {
  const totalResponses = metrics.length;
  const avgResponseTimeMs =
    metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / totalResponses;
  const avgSourcesPerResponse =
    metrics.reduce((sum, m) => sum + m.sources_cited_count, 0) / totalResponses;
  const avgResponseLength =
    metrics.reduce((sum, m) => sum + m.response_length, 0) / totalResponses;

  const positiveFeedback = metrics.filter((m) => m.user_feedback === "positive").length;
  const negativeFeedback = metrics.filter((m) => m.user_feedback === "negative").length;
  const totalFeedback = positiveFeedback + negativeFeedback;
  const feedbackRate = totalResponses > 0 ? (totalFeedback / totalResponses) * 100 : 0;

  // Calculate quality trend (simplified - compare first half vs second half)
  const sortedMetrics = [...metrics].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const midpoint = Math.floor(sortedMetrics.length / 2);
  const firstHalf = sortedMetrics.slice(0, midpoint);
  const secondHalf = sortedMetrics.slice(midpoint);

  let qualityTrend: "improving" | "declining" | "stable" = "stable";
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstHalfAvgSources =
      firstHalf.reduce((sum, m) => sum + m.sources_cited_count, 0) / firstHalf.length;
    const secondHalfAvgSources =
      secondHalf.reduce((sum, m) => sum + m.sources_cited_count, 0) / secondHalf.length;

    if (secondHalfAvgSources > firstHalfAvgSources * 1.1) {
      qualityTrend = "improving";
    } else if (secondHalfAvgSources < firstHalfAvgSources * 0.9) {
      qualityTrend = "declining";
    }
  }

  // Count unique conversations
  const uniqueConversations = new Set(metrics.map((m) => m.conversation_id)).size;

  return {
    total_conversations: uniqueConversations,
    avg_response_time_ms: avgResponseTimeMs,
    avg_sources_per_response: avgSourcesPerResponse,
    avg_response_length: avgResponseLength,
    total_responses: totalResponses,
    positive_feedback_count: positiveFeedback,
    negative_feedback_count: negativeFeedback,
    feedback_rate: feedbackRate,
    quality_trend: qualityTrend,
  };
}

/**
 * Format milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}
