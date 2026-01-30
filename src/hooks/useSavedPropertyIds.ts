import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch the set of external property IDs (zpids) that the user has saved.
 * Used to show filled heart icons on property cards.
 */
export function useSavedPropertyIds() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["saved-property-ids"],
    queryFn: async (): Promise<Set<string>> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return new Set();

      // Fetch saved properties with their external_properties relation
      const { data, error } = await supabase
        .from("saved_properties")
        .select(`
          external_property_id,
          external_properties!inner (
            external_id
          )
        `)
        .eq("property_type", "external")
        .not("external_property_id", "is", null);

      if (error) {
        console.error("Error fetching saved property IDs:", error);
        return new Set();
      }

      // Extract the external_id (zpid) from each saved property
      const zpids = new Set<string>();
      data?.forEach((item) => {
        const externalProps = item.external_properties as { external_id: string } | null;
        if (externalProps?.external_id) {
          zpids.add(externalProps.external_id);
        }
      });

      return zpids;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Function to invalidate the cache after saving a property
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["saved-property-ids"] });
  };

  return {
    savedIds: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
    invalidate,
  };
}
