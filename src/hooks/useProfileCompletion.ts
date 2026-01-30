import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProfileCompletionResult {
  score: number;
  maxScore: number;
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

export function useProfileCompletion() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["profile-completion"],
    queryFn: async (): Promise<ProfileCompletionResult> => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("calculate-profile-completion", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as ProfileCompletionResult;
    },
    enabled: !!session?.access_token,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
