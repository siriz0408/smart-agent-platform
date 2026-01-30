import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

export function useRealtimeMessages(
  conversationId: string | null,
  onNewMessage?: () => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          logger.debug("New message received:", payload);
          // Invalidate messages query to refetch
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          onNewMessage?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, onNewMessage]);
}
