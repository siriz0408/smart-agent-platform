import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BulkOperationProgress {
  operation: 'delete' | 'move' | 'reindex';
  status: 'idle' | 'processing' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  errors: string[];
}

export function useBulkDocumentOperations() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  // Bulk delete documents
  const bulkDelete = useCallback(async (documentIds: string[]) => {
    if (documentIds.length === 0) return;

    setIsProcessing(true);
    setProgress({
      operation: 'delete',
      status: 'processing',
      total: documentIds.length,
      completed: 0,
      failed: 0,
      errors: [],
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      setIsProcessing(false);
      return;
    }

    let completed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const documentId of documentIds) {
      try {
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

        completed++;
      } catch (error) {
        failed++;
        errors.push(error instanceof Error ? error.message : "Unknown error");
      }

      setProgress(prev => prev ? {
        ...prev,
        completed,
        failed,
        errors,
      } : null);
    }

    setProgress(prev => prev ? {
      ...prev,
      status: failed === documentIds.length ? 'failed' : 'completed',
    } : null);

    if (failed === 0) {
      toast.success(`Successfully deleted ${completed} document${completed !== 1 ? 's' : ''}`);
    } else if (completed > 0) {
      toast.warning(`Deleted ${completed} document${completed !== 1 ? 's' : ''}, ${failed} failed`);
    } else {
      toast.error(`Failed to delete documents`);
    }

    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["document-projects"] });
    setIsProcessing(false);

    // Auto-clear progress after delay
    setTimeout(() => {
      setProgress(null);
    }, 3000);
  }, [queryClient]);

  // Bulk move to project
  const bulkMoveToProject = useCallback(async (documentIds: string[], projectId: string) => {
    if (documentIds.length === 0) return;

    setIsProcessing(true);
    setProgress({
      operation: 'move',
      status: 'processing',
      total: documentIds.length,
      completed: 0,
      failed: 0,
      errors: [],
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setIsProcessing(false);
      return;
    }

    let completed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const documentId of documentIds) {
      try {
        // First, remove from any existing project
        await supabase
          .from("document_project_members")
          .delete()
          .eq("document_id", documentId);

        // Then add to new project
        const { error } = await supabase
          .from("document_project_members")
          .insert({
            project_id: projectId,
            document_id: documentId,
            added_by: user.id,
          });

        if (error) throw error;
        completed++;
      } catch (error) {
        failed++;
        errors.push(error instanceof Error ? error.message : "Unknown error");
      }

      setProgress(prev => prev ? {
        ...prev,
        completed,
        failed,
        errors,
      } : null);
    }

    setProgress(prev => prev ? {
      ...prev,
      status: failed === documentIds.length ? 'failed' : 'completed',
    } : null);

    if (failed === 0) {
      toast.success(`Successfully moved ${completed} document${completed !== 1 ? 's' : ''} to project`);
    } else if (completed > 0) {
      toast.warning(`Moved ${completed} document${completed !== 1 ? 's' : ''}, ${failed} failed`);
    } else {
      toast.error(`Failed to move documents`);
    }

    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["document-projects"] });
    setIsProcessing(false);

    // Auto-clear progress after delay
    setTimeout(() => {
      setProgress(null);
    }, 3000);
  }, [queryClient]);

  // Bulk re-index documents
  const bulkReindex = useCallback(async (documentIds: string[]) => {
    if (documentIds.length === 0) return;

    setIsProcessing(true);
    setProgress({
      operation: 'reindex',
      status: 'processing',
      total: documentIds.length,
      completed: 0,
      failed: 0,
      errors: [],
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      setIsProcessing(false);
      return;
    }

    let completed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const documentId of documentIds) {
      try {
        // Start the indexing job
        const startResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/index-document`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ documentId, startJob: true }),
          }
        );

        if (!startResponse.ok) {
          const error = await startResponse.json();
          throw new Error(error.error || "Failed to start indexing");
        }

        const startResult = await startResponse.json();
        const { totalBatches } = startResult;

        // Process each batch
        for (let batch = 0; batch < totalBatches; batch++) {
          const batchResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/index-document`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ documentId, batch }),
            }
          );

          if (!batchResponse.ok) {
            const error = await batchResponse.json();
            throw new Error(error.error || "Failed to process batch");
          }

          const batchResult = await batchResponse.json();
          if (batchResult.isComplete) break;
        }

        completed++;
      } catch (error) {
        failed++;
        errors.push(error instanceof Error ? error.message : "Unknown error");
      }

      setProgress(prev => prev ? {
        ...prev,
        completed,
        failed,
        errors,
      } : null);
    }

    setProgress(prev => prev ? {
      ...prev,
      status: failed === documentIds.length ? 'failed' : 'completed',
    } : null);

    if (failed === 0) {
      toast.success(`Successfully re-indexed ${completed} document${completed !== 1 ? 's' : ''}`);
    } else if (completed > 0) {
      toast.warning(`Re-indexed ${completed} document${completed !== 1 ? 's' : ''}, ${failed} failed`);
    } else {
      toast.error(`Failed to re-index documents`);
    }

    queryClient.invalidateQueries({ queryKey: ["documents"] });
    setIsProcessing(false);

    // Auto-clear progress after delay
    setTimeout(() => {
      setProgress(null);
    }, 3000);
  }, [queryClient]);

  return {
    bulkDelete,
    bulkMoveToProject,
    bulkReindex,
    progress,
    isProcessing,
    resetProgress,
  };
}
