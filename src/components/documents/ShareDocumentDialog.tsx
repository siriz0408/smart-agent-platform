import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Users } from "lucide-react";
import { toast } from "sonner";

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    name: string;
    file_path: string;
  } | null;
}

interface ConversationData {
  id: string;
  title: string | null;
  type: string;
}

export function ShareDocumentDialog({
  open,
  onOpenChange,
  document,
}: ShareDocumentDialogProps) {
  const { user, profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState("");
  const [message, setMessage] = useState("");

  // Fetch user's conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations-for-share", user?.id],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Get conversations where user is a participant
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (participantsError) throw participantsError;

      const conversationIds = (participants || []).map(p => p.conversation_id);
      if (conversationIds.length === 0) return [];

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id, title, type")
        .in("id", conversationIds);

      if (convError) throw convError;

      // Get participant names for each conversation
      const result: Array<{ id: string; title: string; type: string }> = [];

      for (const conv of (convData || []) as ConversationData[]) {
        // Get other participants
        const { data: otherParticipants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", user.id);

        const participantIds = (otherParticipants || []).map(p => p.user_id);
        
        let title = conv.title;
        if (!title && participantIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("full_name, email")
            .in("user_id", participantIds);

          title = (profiles || [])
            .map(p => p.full_name || p.email?.split("@")[0] || "Unknown")
            .join(", ");
        }

        result.push({
          id: conv.id,
          title: title || "Conversation",
          type: conv.type,
        });
      }

      return result;
    },
    enabled: open && !!user,
  });

  // Share document mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!user || !document || !selectedConversation) {
        throw new Error("Missing required data");
      }

      // Create a message with a reference to the document
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: message || `Shared document: ${document.name}`,
          message_type: "file",
          file_url: document.file_path,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Get document details for attachment record
      const { data: docData } = await supabase
        .from("documents")
        .select("file_type, file_size")
        .eq("id", document.id)
        .single();

      // Create attachment record if we have document details
      if (docData && messageData) {
        await supabase.from("message_attachments").insert({
          message_id: messageData.id,
          file_name: document.name,
          file_type: docData.file_type || "application/octet-stream",
          file_size: docData.file_size || 0,
          storage_path: document.file_path,
        });
      }

      return messageData;
    },
    onSuccess: () => {
      toast.success("Document shared successfully!");
      onOpenChange(false);
      setSelectedConversation("");
      setMessage("");
    },
    onError: (error) => {
      logger.error("Share error:", error);
      toast.error("Failed to share document");
    },
  });

  const handleShare = () => {
    if (!selectedConversation) {
      toast.error("Please select a conversation");
      return;
    }
    shareMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Share "{document?.name}" with someone via a message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conversation">Send to</Label>
            {loadingConversations ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : conversations && conversations.length > 0 ? (
              <Select value={selectedConversation} onValueChange={setSelectedConversation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a conversation" />
                </SelectTrigger>
                <SelectContent>
                  {conversations.map((conv) => (
                    <SelectItem key={conv.id} value={conv.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{conv.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No conversations found. Start a conversation first to share documents.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedConversation || shareMutation.isPending}
          >
            {shareMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
