import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { MessageAttachment } from "@/hooks/useMessageAttachments";

interface Participant {
  user_id: string | null;
  contact_id: string | null;
  profile?: {
    full_name: string | null;
    email: string;
  } | null;
  contact?: {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

interface ConversationWithDetails {
  id: string;
  title: string | null;
  updated_at: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    sent_at: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sent_at: string;
  message_type: string;
  file_url?: string | null;
  senderProfile?: {
    full_name: string | null;
    email: string;
  } | null;
  attachments?: MessageAttachment[];
}

export function useConversation(conversationId: string | null) {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Fetch all conversations for the current user
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get conversations where user is a participant
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const conversationIds = participations.map((p) => p.conversation_id);

      // Get conversation details
      const { data: convos, error: convoError } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (convoError) throw convoError;

      // For each conversation, get participants with profiles/contacts
      const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
        (convos || []).map(async (conv) => {
          // Get participants (both users and contacts)
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("user_id, contact_id")
            .eq("conversation_id", conv.id);

          // Get profiles for user participants and contact info for contact participants
          const participantDetails: Participant[] = await Promise.all(
            (participants || []).map(async (p) => {
              if (p.user_id) {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("full_name, email")
                  .eq("user_id", p.user_id)
                  .single();
                return { user_id: p.user_id, contact_id: null, profile: profileData, contact: null };
              } else if (p.contact_id) {
                const { data: contactData } = await supabase
                  .from("contacts")
                  .select("first_name, last_name, email")
                  .eq("id", p.contact_id)
                  .single();
                return { user_id: null, contact_id: p.contact_id, profile: null, contact: contactData };
              }
              return { user_id: null, contact_id: null, profile: null, contact: null };
            })
          );

          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, sent_at")
            .eq("conversation_id", conv.id)
            .order("sent_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            participants: participantDetails.filter((p) => p.user_id !== user.id),
            lastMessage: lastMsg,
          };
        })
      );

      return conversationsWithDetails;
    },
    enabled: !!user?.id,
  });

  // Fetch messages for selected conversation
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("id, content, sender_id, sent_at, message_type, file_url")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });

      if (error) throw error;

      // Get sender profiles and attachments for each message
      const messagesWithProfiles: Message[] = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", msg.sender_id)
            .single();

          // Fetch attachments for this message
          const { data: attachments } = await supabase
            .from("message_attachments")
            .select("id, message_id, file_name, file_type, file_size, storage_path")
            .eq("message_id", msg.id)
            .order("created_at", { ascending: true });

          return {
            ...msg,
            senderProfile: profileData,
            attachments: attachments || [],
          };
        })
      );

      return messagesWithProfiles;
    },
    enabled: !!conversationId,
  });

  // Get selected conversation details
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      uploadAttachments,
    }: {
      content: string;
      uploadAttachments?: (messageId: string) => Promise<void>;
    }) => {
      if (!user?.id || !conversationId) throw new Error("Not authenticated or no conversation");

      // Insert message first to get message_id
      const { data: newMessage, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: "text",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Upload attachments if provided (pass messageId)
      if (uploadAttachments && newMessage?.id) {
        try {
          await uploadAttachments(newMessage.id);
        } catch (attachmentError) {
          logger.error("Failed to upload attachments:", attachmentError);
          toast.error("Message sent but attachments failed to upload");
        }
      }

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return newMessage.id;
    },
    onSuccess: () => {
      refetchMessages();
      refetchConversations();
    },
    onError: (error) => {
      logger.error("Failed to send message:", error);
      toast.error("Failed to send message");
    },
  });

  // Create or find direct conversation with another user
  const createOrFindConversation = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!user?.id || !tenantId) return null;

      try {
        // Check for existing conversation
        const { data: myParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        const { data: theirParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", otherUserId);

        const myConvos = myParticipations?.map((p) => p.conversation_id) || [];
        const theirConvos = theirParticipations?.map((p) => p.conversation_id) || [];

        // Find common conversation (direct)
        const commonConvo = myConvos.find((id) => theirConvos.includes(id));
        if (commonConvo) {
          // Verify it's a direct conversation with only 2 participants
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", commonConvo);

          if (participants?.length === 2) {
            return commonConvo;
          }
        }

        // Create new conversation
        const { data: newConvo, error: convError } = await supabase
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            type: "direct",
          })
          .select("id")
          .single();

        if (convError) throw convError;

        // Add both participants
        const { error: partError } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: newConvo.id, user_id: user.id },
            { conversation_id: newConvo.id, user_id: otherUserId },
          ]);

        if (partError) throw partError;

        refetchConversations();
        return newConvo.id;
      } catch (error) {
        logger.error("Failed to create conversation:", error);
        toast.error("Failed to create conversation");
        return null;
      }
    },
    [user?.id, tenantId, refetchConversations]
  );

  // Create or find direct conversation with a contact (client)
  const createOrFindContactConversation = useCallback(
    async (contactId: string): Promise<string | null> => {
      if (!user?.id || !tenantId) return null;

      try {
        // Check for existing conversation with this contact
        const { data: myParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        const { data: contactParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("contact_id", contactId);

        const myConvos = myParticipations?.map((p) => p.conversation_id) || [];
        const contactConvos = contactParticipations?.map((p) => p.conversation_id) || [];

        // Find common conversation (direct)
        const commonConvo = myConvos.find((id) => contactConvos.includes(id));
        if (commonConvo) {
          // Verify it's a direct conversation with only 2 participants
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", commonConvo);

          if (participants?.length === 2) {
            return commonConvo;
          }
        }

        // Get contact name for conversation title
        const { data: contact } = await supabase
          .from("contacts")
          .select("first_name, last_name")
          .eq("id", contactId)
          .single();

        // Create new conversation
        const { data: newConvo, error: convError } = await supabase
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            type: "direct",
            title: contact ? `${contact.first_name} ${contact.last_name}` : null,
          })
          .select("id")
          .single();

        if (convError) throw convError;

        // Add agent as user participant, contact as contact participant
        const { error: partError } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: newConvo.id, user_id: user.id },
            { conversation_id: newConvo.id, contact_id: contactId },
          ]);

        if (partError) throw partError;

        refetchConversations();
        return newConvo.id;
      } catch (error) {
        logger.error("Failed to create contact conversation:", error);
        toast.error("Failed to create conversation");
        return null;
      }
    },
    [user?.id, tenantId, refetchConversations]
  );

  const sendMessage = useCallback(
    async (content: string, uploadAttachments?: (messageId: string) => Promise<void>) => {
      return sendMessageMutation.mutateAsync({ content, uploadAttachments });
    },
    [sendMessageMutation]
  );

  return {
    conversations,
    isLoadingConversations,
    messages,
    isLoadingMessages,
    selectedConversation,
    sendMessage,
    isSending: sendMessageMutation.isPending,
    refetchConversations,
    refetchMessages,
    createOrFindConversation,
    createOrFindContactConversation,
  };
}
