import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface PrivacySettings {
  id: string;
  user_id: string;
  show_email: boolean;
  show_phone: boolean;
  show_social_links: boolean;
  show_credentials: boolean;
  show_gallery: boolean;
  profile_visibility: "public" | "tenant" | "private";
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<PrivacySettings, "id" | "user_id" | "created_at" | "updated_at"> = {
  show_email: false,
  show_phone: true,
  show_social_links: true,
  show_credentials: true,
  show_gallery: true,
  profile_visibility: "tenant",
};

export function useProfilePrivacy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const privacyQuery = useQuery({
    queryKey: ["privacy-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profile_privacy_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code === "PGRST116") {
        // No settings found, return defaults
        return { ...DEFAULT_SETTINGS, user_id: user.id } as PrivacySettings;
      }
      
      if (error) throw error;
      return data as PrivacySettings;
    },
    enabled: !!user?.id,
  });

  const updatePrivacy = useMutation({
    mutationFn: async (updates: Partial<Omit<PrivacySettings, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Use upsert to create or update
      const { error } = await supabase
        .from("profile_privacy_settings")
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy-settings", user?.id] });
      toast({ title: "Privacy settings updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    settings: privacyQuery.data ?? DEFAULT_SETTINGS,
    isLoading: privacyQuery.isLoading,
    updatePrivacy,
  };
}
