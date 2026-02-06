import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface PlanLimits {
  aiQueries: number;
  documents: number;
  storageGb: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { aiQueries: 25, documents: 5, storageGb: 1 },
  starter: { aiQueries: 100, documents: 50, storageGb: 5 },
  professional: { aiQueries: 500, documents: -1, storageGb: 25 }, // -1 = unlimited
  team: { aiQueries: 2000, documents: -1, storageGb: 100 },
  brokerage: { aiQueries: -1, documents: -1, storageGb: 500 },
};

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 29,
  professional: 79,
  team: 199,
  brokerage: 499,
};

export function useSubscription() {
  const { profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Get workspace_id: prefer activeWorkspace, fallback to profile tenant_id/active_workspace_id
  const workspaceId = activeWorkspace?.id 
    || (profile as { active_workspace_id?: string })?.active_workspace_id 
    || profile?.tenant_id;

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const usageQuery = useQuery({
    queryKey: ["usage", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { aiQueries: 0, documents: 0 };
      
      // Get subscription period start or default to start of month
      const subscription = subscriptionQuery.data;
      const periodStart = subscription?.current_period_start 
        ? new Date(subscription.current_period_start)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      // Count AI queries this period
      // Note: usage_records may still use tenant_id - using workspace_id for consistency
      // If workspace_id doesn't exist, fallback to tenant_id
      const { data: usageRecords } = await supabase
        .from("usage_records")
        .select("quantity")
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .eq("record_type", "ai_query")
        .gte("recorded_at", periodStart.toISOString());
      
      const aiQueries = usageRecords?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 0;
      
      // Count total documents
      // Note: documents may still use tenant_id - using workspace_id for consistency
      const { count: docCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);
      
      return {
        aiQueries,
        documents: docCount || 0,
      };
    },
    enabled: !!workspaceId,
    // Refetch when subscription data changes
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const subscription = subscriptionQuery.data;
  const plan = subscription?.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Trial period calculations
  const now = new Date();
  const isTrialing = subscription?.status === "trialing";
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
  
  // Calculate days remaining
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  const isTrialExpired = trialEnd ? now > trialEnd : false;
  const isTrialEndingSoon = isTrialing && trialDaysRemaining <= 7 && trialDaysRemaining > 0;

  const refetchUsage = () => {
    queryClient.invalidateQueries({ queryKey: ["usage", workspaceId] });
  };

  return {
    subscription,
    usage: usageQuery.data,
    plan,
    limits,
    price: PLAN_PRICES[plan] || 0,
    isLoading: subscriptionQuery.isLoading || usageQuery.isLoading,
    // Trial-related fields
    isTrialing,
    trialEnd,
    trialDaysRemaining,
    isTrialExpired,
    isTrialEndingSoon,
    refetch: () => {
      subscriptionQuery.refetch();
      usageQuery.refetch();
    },
    refetchUsage,
  };
}

export async function createCheckoutSession(plan: string): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await supabase.functions.invoke("create-checkout-session", {
    body: { plan },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.url || null;
}

export async function openCustomerPortal(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await supabase.functions.invoke("create-customer-portal", {});

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.url || null;
}
