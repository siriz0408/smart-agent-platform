import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  started_at: string;
}

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Query for who is typing
  const typingQuery = useQuery({
    queryKey: ["typing", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("typing_indicators")
        .select("*")
        .eq("conversation_id", conversationId)
        .neq("user_id", user?.id ?? "")
        .gte("started_at", new Date(Date.now() - 10000).toISOString()); // Only last 10 seconds
      
      if (error) throw error;
      return data as TypingIndicator[];
    },
    enabled: !!conversationId && !!user?.id,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Start typing mutation
  const startTyping = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user?.id) return;
      
      const { error } = await supabase
        .from("typing_indicators")
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        }, {
          onConflict: "conversation_id,user_id",
        });
      
      if (error) {
        logger.error("Error starting typing indicator:", error);
      }
    },
  });

  // Stop typing mutation
  const stopTyping = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user?.id) return;
      
      const { error } = await supabase
        .from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      
      if (error) {
        logger.error("Error stopping typing indicator:", error);
      }
    },
  });

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing
    startTyping.mutate();

    // Auto-stop after 5 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping.mutate();
    }, 5000);
  }, [startTyping, stopTyping]);

  // Subscribe to realtime typing updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["typing", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping.mutate();
    };
  }, []);

  return {
    typingUsers: typingQuery.data ?? [],
    isLoading: typingQuery.isLoading,
    handleTyping,
    stopTyping: () => stopTyping.mutate(),
  };
}
