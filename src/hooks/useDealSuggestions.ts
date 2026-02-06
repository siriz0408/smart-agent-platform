import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealSuggestion {
  type: "action" | "warning" | "info" | "opportunity";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: {
    label: string;
    type: string;
    params?: Record<string, unknown>;
  };
}

const SUGGESTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deal-suggestions`;

export function useDealSuggestions(dealId: string | null) {
  return useQuery<DealSuggestion[]>({
    queryKey: ["deal-suggestions", dealId],
    queryFn: async () => {
      if (!dealId) return [];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(SUGGESTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ dealId }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || "Failed to fetch suggestions");
      }

      const data = await resp.json();
      return data.suggestions || [];
    },
    enabled: !!dealId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
