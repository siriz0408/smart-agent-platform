import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

/** Predefined emoji set for quick reactions */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/** Aggregated reaction data for display */
export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
  /** Whether the current user has this reaction */
  hasReacted: boolean;
}

/** Map of message_id -> ReactionSummary[] */
export type ReactionsMap = Record<string, ReactionSummary[]>;

/**
 * Hook to manage message reactions for a conversation.
 * Fetches all reactions for the conversation's messages,
 * provides toggle mutation, and subscribes to real-time updates.
 */
export function useMessageReactions(conversationId: string | null) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  // Fetch all reactions for messages in this conversation
  const {
    data: reactionsMap = {},
    isLoading,
  } = useQuery({
    queryKey: ["message-reactions", conversationId],
    queryFn: async (): Promise<ReactionsMap> => {
      if (!conversationId || !user?.id) return {};

      // First get all message ids in this conversation
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      if (msgError) {
        logger.error("Failed to fetch messages for reactions:", msgError);
        return {};
      }

      if (!messages?.length) return {};

      const messageIds = messages.map((m) => m.id);

      // Fetch reactions for these messages
      const { data: reactions, error } = await supabase
        .from("message_reactions")
        .select("id, message_id, user_id, emoji, created_at")
        .in("message_id", messageIds);

      if (error) {
        logger.error("Failed to fetch reactions:", error);
        return {};
      }

      // Aggregate into ReactionsMap
      const map: ReactionsMap = {};
      for (const reaction of reactions || []) {
        if (!map[reaction.message_id]) {
          map[reaction.message_id] = [];
        }

        const existing = map[reaction.message_id].find(
          (r) => r.emoji === reaction.emoji
        );

        if (existing) {
          existing.count++;
          existing.userIds.push(reaction.user_id);
          if (reaction.user_id === user.id) {
            existing.hasReacted = true;
          }
        } else {
          map[reaction.message_id].push({
            emoji: reaction.emoji,
            count: 1,
            userIds: [reaction.user_id],
            hasReacted: reaction.user_id === user.id,
          });
        }
      }

      return map;
    },
    enabled: !!conversationId && !!user?.id,
  });

  // Toggle reaction mutation (add if not present, remove if already reacted)
  const toggleReaction = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      if (!user?.id || !tenantId) throw new Error("Not authenticated");

      // Check if user already reacted with this emoji
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
        return { action: "removed" as const, emoji };
      } else {
        // Add reaction
        const { error } = await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
            tenant_id: tenantId,
          });

        if (error) throw error;
        return { action: "added" as const, emoji };
      }
    },
    onSuccess: () => {
      // Refetch reactions after toggling
      queryClient.invalidateQueries({
        queryKey: ["message-reactions", conversationId],
      });
    },
    onError: (error) => {
      logger.error("Failed to toggle reaction:", error);
    },
  });

  // Subscribe to real-time reaction changes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, DELETE
          schema: "public",
          table: "message_reactions",
        },
        () => {
          // Invalidate reactions query on any change
          queryClient.invalidateQueries({
            queryKey: ["message-reactions", conversationId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      toggleReaction.mutate({ messageId, emoji });
    },
    [toggleReaction]
  );

  return {
    reactionsMap,
    isLoading,
    toggleReaction: handleToggleReaction,
    isToggling: toggleReaction.isPending,
  };
}
