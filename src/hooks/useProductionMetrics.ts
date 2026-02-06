/**
 * Hook for fetching production metrics
 * Used by PM-Infrastructure for monitoring uptime and performance
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProductionMetric {
  metric_date: string;
  tenant_id: string;
  api_total_requests: number;
  api_successful_requests: number;
  api_failed_requests: number;
  api_avg_response_time_ms: number | null;
  api_p95_response_time_ms: number | null;
  api_error_rate_percent: number;
  edge_function_total_calls: number;
  edge_function_successful_calls: number;
  edge_function_failed_calls: number;
  edge_function_avg_duration_ms: number | null;
  edge_function_error_rate_percent: number;
  error_total: number;
  error_rate_percent: number;
  uptime_percent: number;
}

export interface ProductionMetricsSummary {
  total_days: number;
  avg_uptime_percent: number;
  min_uptime_percent: number;
  avg_api_error_rate_percent: number;
  avg_api_response_time_ms: number | null;
  avg_edge_function_duration_ms: number | null;
  total_errors: number;
  total_api_requests: number;
  total_edge_function_calls: number;
}

/**
 * Hook to fetch production metrics for a date range
 */
export function useProductionMetrics(
  startDate?: Date,
  endDate?: Date
) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["production-metrics", tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ProductionMetric[]> => {
      const start = startDate?.toISOString().split('T')[0] || null;
      const end = endDate?.toISOString().split('T')[0] || null;

      const { data, error } = await supabase.rpc("get_production_metrics", {
        p_tenant_id: tenantId || null,
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      return (data || []) as ProductionMetric[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook to fetch production metrics summary
 */
export function useProductionMetricsSummary(
  startDate?: Date,
  endDate?: Date
) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["production-metrics-summary", tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ProductionMetricsSummary | null> => {
      const start = startDate?.toISOString().split('T')[0] || null;
      const end = endDate?.toISOString().split('T')[0] || null;

      const { data, error } = await supabase.rpc("get_production_metrics_summary", {
        p_tenant_id: tenantId || null,
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as ProductionMetricsSummary;
    },
    enabled: !!tenantId,
  });
}

/**
 * Format milliseconds to human-readable string
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "N/A";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(2)}%`;
}

/**
 * Format uptime percentage with color indicator
 */
export function formatUptime(percent: number | null): { value: string; status: "good" | "warning" | "critical" } {
  if (percent === null || percent === undefined) {
    return { value: "N/A", status: "warning" };
  }
  
  if (percent >= 99.9) {
    return { value: `${percent.toFixed(3)}%`, status: "good" };
  } else if (percent >= 99.0) {
    return { value: `${percent.toFixed(2)}%`, status: "warning" };
  } else {
    return { value: `${percent.toFixed(2)}%`, status: "critical" };
  }
}
