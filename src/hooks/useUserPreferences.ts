import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import type { Tables } from "@/integrations/supabase/types";

type UserPreference = Tables<"user_preferences">;

// Default preferences when none exist
const DEFAULT_PREFERENCES = {
  thinkingMode: false,
  emailNotifications: true,
  pushNotifications: false,
  dealUpdates: true,
  darkMode: false,
  aiModel: "default",
  searchMode: "web",
  responseLength: "medium",
};

type PreferenceKey = keyof typeof DEFAULT_PREFERENCES;

/**
 * Hook for the current user's preferences with update capability
 * Used by Home.tsx, Chat.tsx, Settings.tsx, AISettingsPopover.tsx
 */
export function useUserPreferences(): {
  preferences: typeof DEFAULT_PREFERENCES;
  updatePreference: (key: PreferenceKey, value: boolean | string) => void;
  isLoading: boolean;
};

/**
 * Hook to fetch user preferences for a specific user (legacy signature)
 * Used by UserPreferencesPanel.tsx
 */
export function useUserPreferences(userId: string | null | undefined, enabled?: boolean): ReturnType<typeof useQuery<UserPreference | null>>;

/**
 * Implementation that handles both signatures
 */
export function useUserPreferences(userId?: string | null | undefined, enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Determine which user ID to use
  const targetUserId = userId === undefined ? user?.id : userId;
  const isCurrentUserMode = userId === undefined;
  
  const query = useQuery({
    queryKey: ["user_preferences", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", targetUserId)
        .single();

      if (error) {
        // PGRST116 = no rows returned (user hasn't set preferences yet)
        if (error.code === "PGRST116") {
          logger.info(`No preferences found for user ${targetUserId}`);
          return null;
        }
        logger.error("Error fetching user preferences:", error);
        throw error;
      }

      return data as UserPreference;
    },
    enabled: !!targetUserId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - preferences don't change often
  });
  
  // Mutation for updating preferences
  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: PreferenceKey; value: boolean | string }) => {
      if (!targetUserId) throw new Error("No user ID");

      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: targetUserId,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_preferences", targetUserId] });
    },
  });
  
  // Merged preferences with defaults
  const preferences = useMemo(() => ({
    ...DEFAULT_PREFERENCES,
    ...(query.data || {}),
  }), [query.data]);
  
  // Update function
  const updatePreference = useCallback((key: PreferenceKey, value: boolean | string) => {
    updateMutation.mutate({ key, value });
  }, [updateMutation]);
  
  // Return different shapes based on usage mode
  if (isCurrentUserMode) {
    return {
      preferences,
      updatePreference,
      isLoading: query.isLoading,
    };
  }
  
  // Legacy mode - return query result
  return query;
}

/**
 * Helper hook to check if a contact has a linked user with preferences
 * @param contact - The contact object
 */
export function useHasLinkedUserPreferences(contact: { user_id?: string | null } | null) {
  const result = useUserPreferences(
    contact?.user_id,
    !!contact?.user_id
  ) as ReturnType<typeof useQuery<UserPreference | null>>;

  return {
    hasPreferences: !!result.data,
    preferences: result.data,
    isLoading: result.isLoading,
  };
}
