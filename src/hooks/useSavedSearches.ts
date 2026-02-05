import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SearchParams } from "@/components/properties/SaveSearchDialog";
import type { Json } from "@/integrations/supabase/types";

export interface SavedSearch {
  id: string;
  tenant_id: string;
  user_id: string;
  search_name: string;
  criteria: SearchParams;
  notification_frequency: string;
  email_notifications: boolean;
  last_checked?: string;
  last_results?: string[];
  created_at: string;
  updated_at: string;
}

export function useSavedSearches() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Query user's saved searches
  const { data: savedSearches, isLoading } = useQuery({
    queryKey: ["saved-searches", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("property_searches")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Cast the data, treating criteria as SearchParams
      return (data || []).map(item => ({
        ...item,
        criteria: item.criteria as unknown as SearchParams,
      })) as SavedSearch[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Create mutation
  const createSearch = useMutation({
    mutationFn: async (searchData: Omit<SavedSearch, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("property_searches")
        .insert({
          ...searchData,
          criteria: searchData.criteria as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        criteria: data.criteria as unknown as SearchParams,
      } as SavedSearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search Saved", { description: "Your property search has been saved successfully" });
    },
    onError: (error) => {
      console.error("Error creating search:", error);
      toast.error("Error", { description: "Failed to save search" });
    },
  });

  // Update mutation (for notification settings, etc.)
  const updateSearch = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SavedSearch>;
    }) => {
      // Convert criteria to Json if present
      const dbUpdates = {
        ...updates,
        criteria: updates.criteria ? (updates.criteria as unknown as Json) : undefined,
      };
      
      const { data, error } = await supabase
        .from("property_searches")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        criteria: data.criteria as unknown as SearchParams,
      } as SavedSearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search Updated", { description: "Your search settings have been updated" });
    },
    onError: (error) => {
      console.error("Error updating search:", error);
      toast.error("Error", { description: "Failed to update search" });
    },
  });

  // Delete mutation
  const deleteSearch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("property_searches")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search Deleted", { description: "Your saved search has been removed" });
    },
    onError: (error) => {
      console.error("Error deleting search:", error);
      toast.error("Error", { description: "Failed to delete search" });
    },
  });

  return {
    savedSearches: savedSearches || [],
    isLoading,
    createSearch,
    updateSearch,
    deleteSearch,
  };
}
