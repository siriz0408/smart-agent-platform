import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  preview?: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url?: string;
}

export function useMessageAttachments() {
  const { user } = useAuth();
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 25MB.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not supported.`;
    }
    return null;
  };

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: PendingAttachment[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        continue;
      }

      const attachment: PendingAttachment = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);

    return { added: newAttachments.length, errors };
  };

  const removeFile = (id: string) => {
    setPendingAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const clearFiles = () => {
    pendingAttachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setPendingAttachments([]);
  };

  const uploadAttachments = async (conversationId: string, messageId: string): Promise<MessageAttachment[]> => {
    if (!user || pendingAttachments.length === 0) return [];

    const uploaded: MessageAttachment[] = [];

    for (const attachment of pendingAttachments) {
      // Storage path must start with user_id to match RLS policy
      const storagePath = `${user.id}/${conversationId}/${messageId}/${Date.now()}-${attachment.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(storagePath, attachment.file, {
          contentType: attachment.type,
        });

      if (uploadError) {
        logger.error("Upload error:", uploadError);
        continue;
      }

      // Create attachment record
      const { data, error: insertError } = await supabase
        .from("message_attachments")
        .insert({
          message_id: messageId,
          file_name: attachment.name,
          file_type: attachment.type,
          file_size: attachment.size,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Insert error:", insertError);
        // Try to clean up uploaded file
        await supabase.storage.from("message-attachments").remove([storagePath]);
        continue;
      }

      uploaded.push(data as MessageAttachment);
    }

    clearFiles();
    return uploaded;
  };

  return {
    pendingAttachments,
    addFiles,
    removeFile,
    clearFiles,
    uploadAttachments,
    hasAttachments: pendingAttachments.length > 0,
  };
}

export function useSaveToDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-shared-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ attachment_id: attachmentId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save document");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useGetAttachmentUrl() {
  return async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    return data?.signedUrl || null;
  };
}
