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
  tenant_id?: string;
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
    tenantId?: string,
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
      tenant_id: tenantId,
      response_time_ms: responseTimeMs,
      sources_cited_count: sourcesCount,
      response_length: responseLength,
      user_feedback: feedback || null,
    };

    setCurrentMetrics(metric);

    // Store metric in database
    try {
      const { error } = await supabase
        .from("ai_chat_metrics")
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: userId,
          tenant_id: tenantId,
          response_time_ms: responseTimeMs,
          sources_cited_count: sourcesCount,
          response_length: responseLength,
          user_feedback: feedback || null,
        });

      if (error) {
        console.error("Failed to record AI chat metric:", error);
      }
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
      const start = startDate?.toISOString() || null;
      const end = endDate?.toISOString() || null;

      // Query metrics from ai_chat_metrics table
      let query = supabase
        .from("ai_chat_metrics")
        .select("*")
        .order("created_at", { ascending: false });

      if (start) {
        query = query.gte("created_at", start);
      }
      if (end) {
        query = query.lte("created_at", end);
      }

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data: metrics, error } = await query;

      if (error) throw error;

      return (metrics || []).map((m) => ({
        id: m.id,
        message_id: m.message_id,
        conversation_id: m.conversation_id,
        user_id: m.user_id,
        tenant_id: m.tenant_id,
        response_time_ms: m.response_time_ms,
        sources_cited_count: m.sources_cited_count,
        response_length: m.response_length,
        user_feedback: m.user_feedback,
        created_at: m.created_at,
      }));
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
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ai-chat-metrics-summary", tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<AIChatMetricsSummary | null> => {
      const { data, error } = await supabase.rpc("get_ai_chat_metrics_summary", {
        p_tenant_id: tenantId || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      return {
        total_conversations: Number(result.total_conversations) || 0,
        avg_response_time_ms: Number(result.avg_response_time_ms) || 0,
        avg_sources_per_response: Number(result.avg_sources_per_response) || 0,
        avg_response_length: Number(result.avg_response_length) || 0,
        total_responses: Number(result.total_responses) || 0,
        positive_feedback_count: Number(result.positive_feedback_count) || 0,
        negative_feedback_count: Number(result.negative_feedback_count) || 0,
        feedback_rate: Number(result.feedback_rate) || 0,
        quality_trend: (result.quality_trend as "improving" | "declining" | "stable") || "stable",
      };
    },
    enabled: !!tenantId,
  });
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
