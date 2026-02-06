import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/hooks/useSubscription";

export interface PlanLimits {
  documents: number; // -1 = unlimited
  contacts: number; // -1 = unlimited
  ai_chats: number; // -1 = unlimited (per month)
}

export const USAGE_PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { documents: 10, contacts: 50, ai_chats: 20 },
  starter: { documents: 50, contacts: 200, ai_chats: 100 },
  professional: { documents: 100, contacts: 500, ai_chats: -1 }, // -1 = unlimited
  team: { documents: -1, contacts: -1, ai_chats: -1 }, // unlimited
  brokerage: { documents: -1, contacts: -1, ai_chats: -1 }, // unlimited
};

export interface UsageData {
  documents: { current: number; limit: number };
  contacts: { current: number; limit: number };
  ai_chats: { current: number; limit: number };
}

export interface UsageLimitsResult {
  usage: UsageData;
  isAtLimit: boolean;
  isNearLimit: boolean; // 80% or more
  plan: string;
  isLoading: boolean;
  refetch: () => void;
}

export function useUsageLimits(): UsageLimitsResult {
  const { profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { subscription, plan } = useSubscription();

  // Get workspace_id: prefer activeWorkspace, fallback to profile tenant_id/active_workspace_id
  const workspaceId = activeWorkspace?.id 
    || (profile as { active_workspace_id?: string })?.active_workspace_id 
    || profile?.tenant_id;

  const limits = USAGE_PLAN_LIMITS[plan] || USAGE_PLAN_LIMITS.free;

  const usageQuery = useQuery({
    queryKey: ["usage-limits", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return {
          documents: 0,
          contacts: 0,
          ai_chats: 0,
        };
      }

      // Get subscription period start or default to start of month
      const periodStart = subscription?.current_period_start 
        ? new Date(subscription.current_period_start)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      // Count AI queries this period
      const { data: usageRecords } = await supabase
        .from("usage_records")
        .select("quantity")
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .eq("record_type", "ai_query")
        .gte("recorded_at", periodStart.toISOString());

      const ai_chats = usageRecords?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 0;

      // Count total documents
      const { count: docCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);

      // Count total contacts
      const { count: contactCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);

      return {
        documents: docCount || 0,
        contacts: contactCount || 0,
        ai_chats,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const usage = usageQuery.data || { documents: 0, contacts: 0, ai_chats: 0 };

  // Calculate usage percentages and check limits
  const getUsagePercent = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const documentsPercent = getUsagePercent(usage.documents, limits.documents);
  const contactsPercent = getUsagePercent(usage.contacts, limits.contacts);
  const ai_chatsPercent = getUsagePercent(usage.ai_chats, limits.ai_chats);

  // Check if at limit (100%)
  const isAtLimit = 
    (limits.documents !== -1 && usage.documents >= limits.documents) ||
    (limits.contacts !== -1 && usage.contacts >= limits.contacts) ||
    (limits.ai_chats !== -1 && usage.ai_chats >= limits.ai_chats);

  // Check if near limit (80% or more)
  const isNearLimit = 
    documentsPercent >= 80 ||
    contactsPercent >= 80 ||
    ai_chatsPercent >= 80;

  const usageData: UsageData = {
    documents: {
      current: usage.documents,
      limit: limits.documents,
    },
    contacts: {
      current: usage.contacts,
      limit: limits.contacts,
    },
    ai_chats: {
      current: usage.ai_chats,
      limit: limits.ai_chats,
    },
  };

  return {
    usage: usageData,
    isAtLimit,
    isNearLimit,
    plan,
    isLoading: usageQuery.isLoading,
    refetch: () => usageQuery.refetch(),
  };
}
