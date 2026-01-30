import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface UserPresence {
  id: string;
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string;
  current_page: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserPresence() {
  const { user } = useAuth();

  // Update own presence
  const updatePresence = useMutation({
    mutationFn: async ({ status, currentPage }: { status: PresenceStatus; currentPage?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status,
          current_page: currentPage ?? null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });
      
      if (error) throw error;
    },
  });

  // Set user online when hook mounts
  useEffect(() => {
    if (!user?.id) return;

    // Set online initially
    updatePresence.mutate({ status: "online", currentPage: window.location.pathname });

    // Update presence every 30 seconds
    const interval = setInterval(() => {
      updatePresence.mutate({ status: "online", currentPage: window.location.pathname });
    }, 30000);

    // Set offline on page unload
    const handleUnload = () => {
      // Use sendBeacon for reliable delivery on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      navigator.sendBeacon(url, JSON.stringify({ status: "offline" }));
    };

    // Set away on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updatePresence.mutate({ status: "away" });
      } else {
        updatePresence.mutate({ status: "online", currentPage: window.location.pathname });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Set offline on unmount
      updatePresence.mutate({ status: "offline" });
    };
  }, [user?.id]);

  // Get presence for specific users
  const getPresenceForUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from("user_presence")
      .select("*")
      .in("user_id", userIds);
    
    if (error) {
      logger.error("Error fetching presence:", error);
      return [];
    }
    
    return data as UserPresence[];
  }, []);

  return {
    updatePresence,
    getPresenceForUsers,
  };
}

// Hook to subscribe to presence changes for specific users
export function usePresenceSubscription(userIds: string[]) {
  const queryClient = useQueryClient();

  const presenceQuery = useQuery({
    queryKey: ["presence", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("user_presence")
        .select("*")
        .in("user_id", userIds);
      
      if (error) throw error;
      return data as UserPresence[];
    },
    enabled: userIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (userIds.length === 0) return;

    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=in.(${userIds.join(",")})`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["presence", userIds] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userIds, queryClient]);

  return {
    presence: presenceQuery.data ?? [],
    isLoading: presenceQuery.isLoading,
    getStatus: (userId: string): PresenceStatus => {
      const userPresence = presenceQuery.data?.find(p => p.user_id === userId);
      return userPresence?.status ?? "offline";
    },
  };
}
