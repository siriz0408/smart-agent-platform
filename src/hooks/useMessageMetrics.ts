import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MessageMetrics {
  metric_date: string;
  responded_within_4hr_count: number;
  responded_over_4hr_count: number;
  total_responses: number;
  response_rate_within_4hr_percent: number | null;
  avg_response_time_seconds: number | null;
  median_response_time_seconds: number | null;
}

export interface ResponseRateSummary {
  total_responses: number;
  responded_within_4hr: number;
  response_rate_percent: number | null;
  target_met: boolean;
}

/**
 * Hook to fetch message metrics for the current tenant
 */
export function useMessageMetrics(
  startDate?: Date,
  endDate?: Date
) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["message-metrics", tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<MessageMetrics[]> => {
      if (!tenantId) return [];

      const start = startDate?.toISOString() || null;
      const end = endDate?.toISOString() || null;

      const { data, error } = await supabase.rpc("get_message_metrics", {
        p_tenant_id: tenantId,
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      return (data || []) as MessageMetrics[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook to fetch overall response rate (North Star Metric)
 */
export function useResponseRate(
  startDate?: Date,
  endDate?: Date
) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["response-rate", tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ResponseRateSummary | null> => {
      if (!tenantId) return null;

      const start = startDate?.toISOString() || null;
      const end = endDate?.toISOString() || null;

      const { data, error } = await supabase.rpc("get_response_rate_within_4hr", {
        p_tenant_id: tenantId,
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as ResponseRateSummary;
    },
    enabled: !!tenantId,
  });
}

/**
 * Format response time in seconds to human-readable string
 */
export function formatResponseTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "N/A";
  
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/**
 * Format response rate percentage
 */
export function formatResponseRate(percent: number | null): string {
  if (percent === null || percent === undefined) return "N/A";
  return `${percent.toFixed(1)}%`;
}
