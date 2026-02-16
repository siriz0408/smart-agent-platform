import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SearchClickStats {
  total_clicks: number;
  unique_queries: number;
  avg_click_position: number;
  clicks_in_top_3: number;
  clicks_in_top_3_percent: number;
  clicks_by_result_type: Record<
    string,
    {
      clicks: number;
      avg_position: number;
    }
  >;
  top_clicked_queries: Array<{
    query: string;
    clicks: number;
    avg_position: number;
  }>;
}

interface UseSearchClickStatsOptions {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

/**
 * Hook to fetch search click-through statistics
 *
 * Provides CTR metrics, click position distribution, and top clicked queries
 * for search quality analysis.
 */
export function useSearchClickStats({
  startDate,
  endDate,
  enabled = true,
}: UseSearchClickStatsOptions = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: [
      "search-click-stats",
      profile?.tenant_id,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async (): Promise<SearchClickStats> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const { data, error } = await supabase.rpc("get_search_click_through_stats", {
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        // Return default empty stats
        return {
          total_clicks: 0,
          unique_queries: 0,
          avg_click_position: 0,
          clicks_in_top_3: 0,
          clicks_in_top_3_percent: 0,
          clicks_by_result_type: {},
          top_clicked_queries: [],
        };
      }

      const result = data[0];
      return {
        total_clicks: Number(result.total_clicks) || 0,
        unique_queries: Number(result.unique_queries) || 0,
        avg_click_position: Number(result.avg_click_position) || 0,
        clicks_in_top_3: Number(result.clicks_in_top_3) || 0,
        clicks_in_top_3_percent: Number(result.clicks_in_top_3_percent) || 0,
        clicks_by_result_type:
          (result.clicks_by_result_type as Record<
            string,
            {
              clicks: number;
              avg_position: number;
            }
          >) || {},
        top_clicked_queries:
          (result.top_clicked_queries as Array<{
            query: string;
            clicks: number;
            avg_position: number;
          }>) || [],
      };
    },
    enabled: enabled && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}
