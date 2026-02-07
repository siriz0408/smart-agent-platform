import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  content: string;
  senderName: string;
  sentAt: string;
  conversationTitle: string | null;
  /** The portion of content around the match for display */
  snippet: string;
}

/**
 * Hook for searching messages across all conversations the user participates in.
 * Uses Supabase ilike for simple text matching (works without full-text search setup).
 */
export function useMessageSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Debounced search - only search when query is 2+ chars
  const trimmedQuery = searchQuery.trim();
  const shouldSearch = trimmedQuery.length >= 2;

  const {
    data: results = [],
    isLoading: isSearching,
    refetch,
  } = useQuery({
    queryKey: ["message-search", trimmedQuery, user?.id],
    queryFn: async (): Promise<MessageSearchResult[]> => {
      if (!user?.id || !shouldSearch) return [];

      // Get conversations the user participates in
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations?.length) return [];

      const conversationIds = participations.map((p) => p.conversation_id);

      // Search messages by content using ilike (case-insensitive)
      const { data: matchingMessages, error } = await supabase
        .from("messages")
        .select("id, content, sender_id, sent_at, conversation_id")
        .in("conversation_id", conversationIds)
        .ilike("content", `%${trimmedQuery}%`)
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!matchingMessages?.length) return [];

      // Get unique conversation IDs from results
      const resultConvoIds = [...new Set(matchingMessages.map((m) => m.conversation_id))];

      // Fetch conversation titles
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, title")
        .in("id", resultConvoIds);

      const convoMap = new Map(convos?.map((c) => [c.id, c.title]) || []);

      // Fetch sender profiles
      const senderIds = [...new Set(matchingMessages.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", senderIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p.full_name || p.email?.split("@")[0] || "Unknown"]) || []
      );

      // Get participant names for conversations without titles
      const convosWithoutTitle = resultConvoIds.filter((id) => !convoMap.get(id));
      const participantNameMap = new Map<string, string>();

      if (convosWithoutTitle.length > 0) {
        for (const convoId of convosWithoutTitle) {
          const { data: parts } = await supabase
            .from("conversation_participants")
            .select("user_id, contact_id")
            .eq("conversation_id", convoId);

          if (parts) {
            const names: string[] = [];
            for (const p of parts) {
              if (p.user_id && p.user_id !== user.id) {
                const name = profileMap.get(p.user_id);
                if (name) names.push(name);
                else {
                  const { data: prof } = await supabase
                    .from("profiles")
                    .select("full_name, email")
                    .eq("user_id", p.user_id)
                    .single();
                  if (prof) names.push(prof.full_name || prof.email?.split("@")[0] || "Unknown");
                }
              } else if (p.contact_id) {
                const { data: contact } = await supabase
                  .from("contacts")
                  .select("first_name, last_name")
                  .eq("id", p.contact_id)
                  .single();
                if (contact) names.push(`${contact.first_name} ${contact.last_name}`);
              }
            }
            participantNameMap.set(convoId, names.join(", ") || "Conversation");
          }
        }
      }

      // Build results with snippets
      return matchingMessages.map((msg) => {
        const lowerContent = msg.content.toLowerCase();
        const lowerQuery = trimmedQuery.toLowerCase();
        const matchIndex = lowerContent.indexOf(lowerQuery);

        // Create a snippet around the match (60 chars on each side)
        const snippetStart = Math.max(0, matchIndex - 60);
        const snippetEnd = Math.min(msg.content.length, matchIndex + trimmedQuery.length + 60);
        let snippet = msg.content.slice(snippetStart, snippetEnd);
        if (snippetStart > 0) snippet = "..." + snippet;
        if (snippetEnd < msg.content.length) snippet = snippet + "...";

        const conversationTitle =
          convoMap.get(msg.conversation_id) ||
          participantNameMap.get(msg.conversation_id) ||
          "Conversation";

        return {
          messageId: msg.id,
          conversationId: msg.conversation_id,
          content: msg.content,
          senderName: msg.sender_id === user.id ? "You" : (profileMap.get(msg.sender_id) || "Unknown"),
          sentAt: msg.sent_at,
          conversationTitle,
          snippet,
        };
      });
    },
    enabled: !!user?.id && shouldSearch,
    staleTime: 30000,
  });

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    results,
    isSearching: shouldSearch && isSearching,
    isSearchOpen,
    openSearch,
    closeSearch,
    refetch,
  };
}
