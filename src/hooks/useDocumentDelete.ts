import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteDocumentResult {
  success: boolean;
  documentId: string;
  documentName: string;
  chunksDeleted: number;
  storageDeleted: boolean;
}

export function useDocumentDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ documentId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete document");
      }

      return response.json() as Promise<DeleteDocumentResult>;
    },
    onSuccess: (data) => {
      toast.success(`"${data.documentName}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete document");
    },
  });
}
