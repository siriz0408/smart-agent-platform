import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsageMonth {
  month: string;
  monthLabel: string;
  aiQueries: number;
  documents: number;
  tokens: number;
}

export function useUsageHistory() {
  const historyQuery = useQuery({
    queryKey: ["usage-history"],
    queryFn: async () => {
      const response = await supabase.functions.invoke<{ history: UsageMonth[] }>(
        "usage-history"
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data?.history || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
  };
}
