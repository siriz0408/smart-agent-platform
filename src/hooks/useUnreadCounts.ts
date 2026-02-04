import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCounts(conversationIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-counts", conversationIds],
    queryFn: async () => {
      if (!user?.id || conversationIds.length === 0) return {};

      const unreadMap: Record<string, number> = {};

      await Promise.all(
        conversationIds.map(async (conversationId) => {
          // Get participant's last read timestamp
          const { data: participant } = await supabase
            .from("conversation_participants")
            .select("last_read_at")
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id)
            .single();

          if (!participant) {
            unreadMap[conversationId] = 0;
            return;
          }

          const lastReadAt = participant.last_read_at ?? "1970-01-01T00:00:00Z";

          // Count messages after last_read_at that aren't from the current user
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", user.id)
            .gt("sent_at", lastReadAt);

          unreadMap[conversationId] = count ?? 0;
        })
      );

      return unreadMap;
    },
    enabled: !!user?.id && conversationIds.length > 0,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Hook to get total unread count across all conversations
export function useTotalUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["total-unread-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Get all conversations for this user
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) return 0;

      // Count unread messages across all conversations
      let totalUnread = 0;

      await Promise.all(
        participations.map(async (participation) => {
          const lastReadAt = participation.last_read_at ?? "1970-01-01T00:00:00Z";

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", participation.conversation_id)
            .neq("sender_id", user.id)
            .gt("sent_at", lastReadAt);

          totalUnread += count ?? 0;
        })
      );

      return totalUnread;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
