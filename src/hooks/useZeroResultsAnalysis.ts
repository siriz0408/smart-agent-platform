import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ZeroResultsPattern {
  pattern_type: string;
  pattern_value: string;
  occurrence_count: number;
  percentage: number;
  sample_queries: string[];
  recommendation: string | null;
}

interface UseZeroResultsAnalysisOptions {
  daysBack?: number;
  minOccurrences?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch zero-results search analysis
 * 
 * Analyzes patterns in failed searches to identify improvement opportunities
 */
export function useZeroResultsAnalysis({
  daysBack = 30,
  minOccurrences = 2,
  enabled = true,
}: UseZeroResultsAnalysisOptions = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["zero-results-analysis", profile?.tenant_id, daysBack, minOccurrences],
    queryFn: async (): Promise<ZeroResultsPattern[]> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const { data, error } = await supabase.rpc("analyze_zero_results_patterns", {
        p_tenant_id: profile.tenant_id,
        p_days_back: daysBack,
        p_min_occurrences: minOccurrences,
      });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: enabled && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}
