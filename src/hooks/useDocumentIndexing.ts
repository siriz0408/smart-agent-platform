import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IndexingProgress {
  status: 'idle' | 'starting' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentBatch: number;
  totalBatches: number;
  chunksIndexed: number;
  error?: string;
}

interface StartJobResult {
  success: boolean;
  totalBatches: number;
  fileSize: number;
}

interface BatchResult {
  success: boolean;
  batchNumber: number;
  totalBatches: number;
  chunksIndexed: number;
  totalChunks: number;
  progress: number;
  isComplete: boolean;
}

export function useDocumentIndexing() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<string, IndexingProgress>>({});
  const [isIndexing, setIsIndexing] = useState(false);

  const callIndexFunction = async (
    documentId: string, 
    options: { startJob?: boolean; batch?: number }
  ): Promise<StartJobResult | BatchResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/index-document`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentId, ...options }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to process document");
    }

    return response.json();
  };

  const indexDocument = useCallback(async (documentId: string) => {
    setIsIndexing(true);
    
    // Initialize progress
    setProgress(prev => ({
      ...prev,
      [documentId]: {
        status: 'starting',
        progress: 0,
        currentBatch: 0,
        totalBatches: 0,
        chunksIndexed: 0,
      }
    }));

    try {
      // Step 1: Start the job and get batch count
      const startResult = await callIndexFunction(documentId, { startJob: true }) as StartJobResult;
      
      if (!startResult.success) {
        throw new Error("Failed to start indexing job");
      }

      const { totalBatches } = startResult;
      
      setProgress(prev => ({
        ...prev,
        [documentId]: {
          status: 'processing',
          progress: 0,
          currentBatch: 0,
          totalBatches,
          chunksIndexed: 0,
        }
      }));

      // Step 2: Process each batch sequentially
      for (let batch = 0; batch < totalBatches; batch++) {
        const batchResult = await callIndexFunction(documentId, { batch }) as BatchResult;
        
        setProgress(prev => ({
          ...prev,
          [documentId]: {
            status: batchResult.isComplete ? 'completed' : 'processing',
            progress: batchResult.progress,
            currentBatch: batch + 1,
            totalBatches,
            chunksIndexed: batchResult.totalChunks,
          }
        }));

        if (batchResult.isComplete) {
          break;
        }
      }

      // Success
      setProgress(prev => ({
        ...prev,
        [documentId]: {
          ...prev[documentId],
          status: 'completed',
          progress: 100,
        }
      }));
      
      toast.success(`Document indexed successfully!`);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      
      // Clear progress after a delay
      setTimeout(() => {
        setProgress(prev => {
          const next = { ...prev };
          delete next[documentId];
          return next;
        });
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to index document";
      
      setProgress(prev => ({
        ...prev,
        [documentId]: {
          ...prev[documentId],
          status: 'failed',
          error: errorMessage,
        }
      }));
      
      toast.error(errorMessage);
    } finally {
      setIsIndexing(false);
    }
  }, [queryClient]);

  // Get progress for a specific document
  const getProgress = useCallback((documentId: string): IndexingProgress | undefined => {
    return progress[documentId];
  }, [progress]);

  // Get the document ID currently being indexed (for backward compatibility)
  const indexingDocId = Object.entries(progress).find(
    ([_, p]) => p.status === 'starting' || p.status === 'processing'
  )?.[0] || null;

  return {
    indexDocument,
    isIndexing,
    indexingDocId,
    progress,
    getProgress,
  };
}
