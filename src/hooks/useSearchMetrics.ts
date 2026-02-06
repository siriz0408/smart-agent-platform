import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SearchMetricsSummary {
  total_searches: number;
  successful_searches: number;
  zero_result_searches: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_result_count: number;
  searches_below_500ms: number;
  latency_target_met_percent: number;
  popular_queries: Array<{
    query: string;
    count: number;
    success_rate: number;
    avg_latency_ms: number;
  }>;
  entity_type_distribution: Record<
    string,
    {
      count: number;
      success_rate: number;
      avg_latency_ms: number;
    }
  >;
  query_length_distribution: Record<
    string,
    {
      count: number;
      success_rate: number;
      avg_latency_ms: number;
    }
  >;
}

interface UseSearchMetricsOptions {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

/**
 * Hook to fetch comprehensive search metrics summary
 * 
 * Calculates PM-Discovery North Star Metric: Search Success Rate >95%
 * Also tracks latency (target: <500ms) and other search quality metrics
 */
export function useSearchMetrics({
  startDate,
  endDate,
  enabled = true,
}: UseSearchMetricsOptions = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: [
      "search-metrics-summary",
      profile?.tenant_id,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async (): Promise<SearchMetricsSummary> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const { data, error } = await supabase.rpc("get_search_metrics_summary", {
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        // Return default empty metrics
        return {
          total_searches: 0,
          successful_searches: 0,
          zero_result_searches: 0,
          success_rate: 0,
          avg_latency_ms: 0,
          p95_latency_ms: 0,
          p99_latency_ms: 0,
          avg_result_count: 0,
          searches_below_500ms: 0,
          latency_target_met_percent: 0,
          popular_queries: [],
          entity_type_distribution: {},
          query_length_distribution: {},
        };
      }

      const result = data[0];
      return {
        total_searches: Number(result.total_searches) || 0,
        successful_searches: Number(result.successful_searches) || 0,
        zero_result_searches: Number(result.zero_result_searches) || 0,
        success_rate: Number(result.success_rate) || 0,
        avg_latency_ms: Number(result.avg_latency_ms) || 0,
        p95_latency_ms: Number(result.p95_latency_ms) || 0,
        p99_latency_ms: Number(result.p99_latency_ms) || 0,
        avg_result_count: Number(result.avg_result_count) || 0,
        searches_below_500ms: Number(result.searches_below_500ms) || 0,
        latency_target_met_percent: Number(result.latency_target_met_percent) || 0,
        popular_queries: (result.popular_queries as Array<{
          query: string;
          count: number;
          success_rate: number;
          avg_latency_ms: number;
        }>) || [],
        entity_type_distribution: (result.entity_type_distribution as Record<
          string,
          {
            count: number;
            success_rate: number;
            avg_latency_ms: number;
          }
        >) || {},
        query_length_distribution: (result.query_length_distribution as Record<
          string,
          {
            count: number;
            success_rate: number;
            avg_latency_ms: number;
          }
        >) || {},
      };
    },
    enabled: enabled && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}
