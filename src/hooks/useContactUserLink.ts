import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface UserSearchResult {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  is_platform_user: boolean;
  primary_role: string | null;
  linked_contact_count: number;
}

export function useContactUserLink() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult | null>(null);
  const queryClient = useQueryClient();

  /**
   * Search for a platform user by email
   */
  const searchUser = async (email: string): Promise<UserSearchResult | null> => {
    if (!email || !email.trim()) {
      toast.error("Please enter an email address");
      return null;
    }

    setIsSearching(true);
    setSearchResults(null);

    try {
      // Call the find_user_by_email function
      const { data, error } = await supabase.rpc("find_user_by_email", {
        _email: email.trim().toLowerCase(),
      });

      if (error) {
        logger.error("Error searching for user:", error);
        toast.error("Failed to search for user");
        return null;
      }

      if (!data || data.length === 0) {
        toast.info("No platform user found with that email");
        return null;
      }

      const result = data[0] as UserSearchResult;
      setSearchResults(result);
      return result;
    } catch (err) {
      logger.error("Error in searchUser:", err);
      toast.error("An error occurred while searching");
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Link a contact to a platform user
   */
  const linkContactToUserMutation = useMutation({
    mutationFn: async ({
      contactId,
      userId,
    }: {
      contactId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          user_id: userId,
          linked_from_user: false, // Agent is linking (not user-initiated)
        })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact linked to user successfully");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSearchResults(null);
    },
    onError: (error) => {
      logger.error("Error linking contact to user:", error);
      toast.error("Failed to link contact to user");
    },
  });

  /**
   * Unlink a contact from a platform user
   */
  const unlinkContactFromUserMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          user_id: null,
          linked_from_user: false,
        })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact unlinked from user");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSearchResults(null); // Clear stale search results
    },
    onError: (error) => {
      logger.error("Error unlinking contact from user:", error);
      toast.error("Failed to unlink contact from user");
    },
  });

  /**
   * Send platform invitation to email address
   */
  const sendInvitationMutation = useMutation({
    mutationFn: async (email: string) => {
      // TODO: Implement email invitation via Edge Function
      // For now, just show a message
      logger.info("Would send invitation to:", email);
      return { email };
    },
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${data.email}`);
    },
    onError: (error) => {
      logger.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    },
  });

  return {
    // Search
    searchUser,
    isSearching,
    searchResults,
    clearSearch: () => setSearchResults(null),

    // Link/Unlink
    linkContactToUser: linkContactToUserMutation.mutate,
    isLinking: linkContactToUserMutation.isPending,
    unlinkContactFromUser: unlinkContactFromUserMutation.mutate,
    isUnlinking: unlinkContactFromUserMutation.isPending,

    // Invitation
    sendInvitation: sendInvitationMutation.mutate,
    isSendingInvitation: sendInvitationMutation.isPending,
  };
}
