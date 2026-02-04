import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ActionQueueItem {
  id: string;
  tenant_id: string;
  agent_run_id: string | null;
  user_id: string;
  action_type: string;
  action_params: Record<string, unknown>;
  action_reason: string | null;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'cancelled';
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  executed_at: string | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  agent_run?: {
    id: string;
    agent_id: string;
    ai_agents?: {
      id: string;
      name: string;
      icon: string;
    };
  };
}

export interface ActionQueueFilters {
  status?: string[];
  action_type?: string[];
  requires_approval?: boolean;
}

export function useActionQueue(filters?: ActionQueueFilters) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch action queue items
  const {
    data: actions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["action_queue", filters],
    queryFn: async () => {
      let query = supabase
        .from("action_queue")
        .select(`
          *,
          agent_run:agent_runs(
            id,
            agent_id,
            ai_agents(id, name, icon)
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }
      if (filters?.action_type && filters.action_type.length > 0) {
        query = query.in("action_type", filters.action_type);
      }
      if (filters?.requires_approval !== undefined) {
        query = query.eq("requires_approval", filters.requires_approval);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActionQueueItem[];
    },
    enabled: !!user,
  });

  // Approve action mutation
  const approveAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await supabase.rpc("approve_action", {
        p_action_id: actionId,
        p_user_id: user?.id,
      });

      if (error) throw error;
      if (!data) throw new Error("Failed to approve action");

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Action approved",
        description: "The action has been approved and will be executed.",
      });
      queryClient.invalidateQueries({ queryKey: ["action_queue"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve action",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Reject action mutation
  const rejectAction = useMutation({
    mutationFn: async ({ actionId, reason }: { actionId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("reject_action", {
        p_action_id: actionId,
        p_user_id: user?.id,
        p_reason: reason || null,
      });

      if (error) throw error;
      if (!data) throw new Error("Failed to reject action");

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Action rejected",
        description: "The action has been rejected and will not be executed.",
      });
      queryClient.invalidateQueries({ queryKey: ["action_queue"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to reject action",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Batch approve mutation
  const batchApprove = useMutation({
    mutationFn: async (actionIds: string[]) => {
      const { data, error } = await supabase.rpc("batch_approve_actions", {
        p_action_ids: actionIds,
        p_user_id: user?.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast({
        title: "Actions approved",
        description: `${count} action(s) have been approved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["action_queue"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve actions",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Execute action mutation (calls edge function)
  const executeAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-actions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action_id: actionId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to execute action");
      }

      return result;
    },
    onSuccess: (result) => {
      const successCount = result.results?.filter((r: { result: { success: boolean } }) => r.result.success).length || 0;
      toast({
        title: successCount > 0 ? "Action executed" : "Action failed",
        description: successCount > 0 
          ? "The action was executed successfully."
          : "The action failed to execute. Check the error details.",
        variant: successCount > 0 ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["action_queue"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to execute action",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Execute all approved actions
  const executeApproved = useMutation({
    mutationFn: async (limit?: number) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-actions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ process_approved: true, limit: limit || 10 }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to execute actions");
      }

      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Actions processed",
        description: `${result.successful} of ${result.processed} action(s) executed successfully.`,
        variant: result.failed > 0 ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: ["action_queue"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to execute actions",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Get pending count
  const pendingCount = actions.filter(
    (a) => a.status === "pending" && a.requires_approval
  ).length;

  // Get approved (ready to execute) count
  const approvedCount = actions.filter((a) => a.status === "approved").length;

  return {
    actions,
    isLoading,
    error,
    refetch,
    pendingCount,
    approvedCount,
    approveAction: approveAction.mutate,
    rejectAction: rejectAction.mutate,
    batchApprove: batchApprove.mutate,
    executeAction: executeAction.mutate,
    executeApproved: executeApproved.mutate,
    isApproving: approveAction.isPending,
    isRejecting: rejectAction.isPending,
    isExecuting: executeAction.isPending || executeApproved.isPending,
  };
}

// Hook to get pending action count for notifications
export function usePendingActionsCount() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["pending_actions_count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_actions_count", {
        p_user_id: user?.id,
      });

      if (error) throw error;
      return data || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return count;
}
