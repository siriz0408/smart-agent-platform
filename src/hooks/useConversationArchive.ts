import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * Hook for archiving and unarchiving conversations.
 * Updates the `archived` boolean on the conversations table.
 */
export function useConversationArchive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async ({ conversationId, archived }: { conversationId: string; archived: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString(), archived })
        .eq("id", conversationId);

      if (error) throw error;
      return { conversationId, archived };
    },
    onSuccess: ({ archived }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(archived ? "Conversation archived" : "Conversation unarchived");
    },
    onError: (error, { archived }) => {
      logger.error("Failed to archive conversation:", error);
      toast.error(`Failed to ${archived ? "archive" : "unarchive"} conversation`);
    },
  });

  const archiveConversation = (conversationId: string) =>
    archiveMutation.mutateAsync({ conversationId, archived: true });

  const unarchiveConversation = (conversationId: string) =>
    archiveMutation.mutateAsync({ conversationId, archived: false });

  return {
    archiveConversation,
    unarchiveConversation,
    isArchiving: archiveMutation.isPending,
  };
}
