import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export function useReadReceipts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mark conversation as read
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("conversation_participants")
        .update({
          last_read_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      
      if (error) {
        logger.error("Error marking conversation as read:", error);
        throw error;
      }
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  // Get unread count for a conversation
  const getUnreadCount = async (conversationId: string): Promise<number> => {
    if (!user?.id) return 0;

    // Get participant's last read timestamp
    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (participantError || !participant) return 0;

    // Count messages after last_read_at that aren't from the current user
    const lastReadAt = participant.last_read_at ?? "1970-01-01T00:00:00Z";
    
    const { count, error: countError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .gt("sent_at", lastReadAt);

    if (countError) {
      logger.error("Error getting unread count:", countError);
      return 0;
    }

    return count ?? 0;
  };

  return {
    markAsRead,
    getUnreadCount,
  };
}
