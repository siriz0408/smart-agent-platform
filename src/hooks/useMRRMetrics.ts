/**
 * GRW-006: MRR Metrics Hook
 *
 * Provides comprehensive MRR metrics for the growth dashboard.
 * Leverages the MRR infrastructure from mrr_snapshots table.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_PRICES } from "./useSubscription";

// ============================================================================
// Types
// ============================================================================

export interface MRRSummary {
  currentMRR: number;
  currentARR: number;
  mrrChange30d: number;
  mrrGrowthRate30d: number | null;
  activeSubscriptions: number;
  payingUsers: number;
  freeUsers: number;
  trialUsers: number;
  arpu: number;
  planDistribution: Record<string, number>;
  mrrByPlan: Record<string, number>;
  bestDayMRR: number | null;
  worstDayMRR: number | null;
}

export interface MRRHistoryPoint {
  date: string;
  mrr: number;
  arr: number;
  mrrGrowthRate: number | null;
  momGrowthRate: number | null;
  netMRRChange: number;
  activeSubscriptions: number;
  payingUsers: number;
  arpu: number;
  planDistribution: Record<string, number>;
  mrrByPlan: Record<string, number>;
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  workspaceId: string;
  eventType: string;
  previousPlan: string | null;
  newPlan: string | null;
  mrrImpact: number;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MRRBreakdown {
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  reactivationMRR: number;
  netNewMRR: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get MRR summary for the dashboard
 */
export function useMRRSummary(workspaceId?: string) {
  return useQuery({
    queryKey: ["mrr-summary", workspaceId],
    queryFn: async (): Promise<MRRSummary> => {
      // Try to use the RPC function if available
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_mrr_summary", {
        p_workspace_id: workspaceId || null,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const summary = rpcData[0];
        return {
          currentMRR: summary.current_mrr || 0,
          currentARR: summary.current_arr || 0,
          mrrChange30d: summary.mrr_change_30d || 0,
          mrrGrowthRate30d: summary.mrr_growth_rate_30d,
          activeSubscriptions: summary.active_subscriptions || 0,
          payingUsers: summary.paying_users || 0,
          freeUsers: summary.free_users || 0,
          trialUsers: summary.trial_users || 0,
          arpu: summary.arpu || 0,
          planDistribution: summary.plan_distribution || {},
          mrrByPlan: summary.mrr_by_plan || {},
          bestDayMRR: summary.best_day_mrr,
          worstDayMRR: summary.worst_day_mrr,
        };
      }

      // Fallback: Calculate from subscriptions directly
      return calculateMRRFromSubscriptions(workspaceId);
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Get MRR history for trend charts
 */
export function useMRRHistory(workspaceId?: string, days: number = 30) {
  return useQuery({
    queryKey: ["mrr-history", workspaceId, days],
    queryFn: async (): Promise<MRRHistoryPoint[]> => {
      // Try to use the RPC function if available
      const { data, error } = await supabase.rpc("get_mrr_history", {
        p_workspace_id: workspaceId || null,
        p_days: days,
      });

      if (!error && data && data.length > 0) {
        return data.map((row: Record<string, unknown>) => ({
          date: row.snapshot_date as string,
          mrr: (row.mrr as number) || 0,
          arr: (row.arr as number) || 0,
          mrrGrowthRate: row.mrr_growth_rate as number | null,
          momGrowthRate: row.mom_growth_rate as number | null,
          netMRRChange: (row.net_mrr_change as number) || 0,
          activeSubscriptions: (row.active_subscriptions as number) || 0,
          payingUsers: (row.paying_users as number) || 0,
          arpu: (row.arpu as number) || 0,
          planDistribution: (row.plan_distribution as Record<string, number>) || {},
          mrrByPlan: (row.mrr_by_plan as Record<string, number>) || {},
        }));
      }

      // Fallback: Return empty array (no historical data)
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}

/**
 * Get subscription events for activity feed
 */
export function useSubscriptionEvents(workspaceId?: string, limit: number = 50) {
  return useQuery({
    queryKey: ["subscription-events", workspaceId, limit],
    queryFn: async (): Promise<SubscriptionEvent[]> => {
      const query = supabase
        .from("subscription_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (workspaceId) {
        query.eq("workspace_id", workspaceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching subscription events:", error);
        return [];
      }

      return (data || []).map((event) => ({
        id: event.id,
        subscriptionId: event.subscription_id,
        workspaceId: event.workspace_id,
        eventType: event.event_type,
        previousPlan: event.previous_plan,
        newPlan: event.new_plan,
        mrrImpact: event.mrr_impact || 0,
        reason: event.reason,
        metadata: event.metadata || {},
        createdAt: event.created_at,
      }));
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get MRR breakdown (new, expansion, contraction, churn)
 */
export function useMRRBreakdown(workspaceId?: string, days: number = 30) {
  return useQuery({
    queryKey: ["mrr-breakdown", workspaceId, days],
    queryFn: async (): Promise<MRRBreakdown> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = supabase
        .from("subscription_events")
        .select("event_type, mrr_impact")
        .gte("created_at", startDate.toISOString());

      if (workspaceId) {
        query.eq("workspace_id", workspaceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching MRR breakdown:", error);
        return {
          newMRR: 0,
          expansionMRR: 0,
          contractionMRR: 0,
          churnedMRR: 0,
          reactivationMRR: 0,
          netNewMRR: 0,
        };
      }

      // Aggregate by event type
      const breakdown = (data || []).reduce(
        (acc, event) => {
          const impact = event.mrr_impact || 0;
          switch (event.event_type) {
            case "new":
            case "trial_converted":
              acc.newMRR += impact;
              break;
            case "upgrade":
              acc.expansionMRR += impact;
              break;
            case "downgrade":
              acc.contractionMRR += Math.abs(impact);
              break;
            case "canceled":
            case "trial_expired":
              acc.churnedMRR += Math.abs(impact);
              break;
            case "reactivated":
              acc.reactivationMRR += impact;
              break;
          }
          return acc;
        },
        {
          newMRR: 0,
          expansionMRR: 0,
          contractionMRR: 0,
          churnedMRR: 0,
          reactivationMRR: 0,
          netNewMRR: 0,
        }
      );

      breakdown.netNewMRR =
        breakdown.newMRR +
        breakdown.expansionMRR +
        breakdown.reactivationMRR -
        breakdown.contractionMRR -
        breakdown.churnedMRR;

      return breakdown;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Trigger MRR snapshot (admin only)
 */
export function useTriggerMRRSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("snapshot_daily_mrr");

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all MRR queries
      queryClient.invalidateQueries({ queryKey: ["mrr-summary"] });
      queryClient.invalidateQueries({ queryKey: ["mrr-history"] });
      queryClient.invalidateQueries({ queryKey: ["mrr-breakdown"] });
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fallback function to calculate MRR directly from subscriptions
 * Used when the RPC function is not available or fails
 */
async function calculateMRRFromSubscriptions(workspaceId?: string): Promise<MRRSummary> {
  const query = supabase.from("subscriptions").select("*");

  if (workspaceId) {
    query.eq("workspace_id", workspaceId);
  }

  const { data: subscriptions, error } = await query;

  if (error || !subscriptions) {
    return getDefaultMRRSummary();
  }

  let mrr = 0;
  let activeSubscriptions = 0;
  let payingUsers = 0;
  let freeUsers = 0;
  let trialUsers = 0;

  const planDistribution: Record<string, number> = {
    free: 0,
    starter: 0,
    professional: 0,
    team: 0,
    brokerage: 0,
  };

  const mrrByPlan: Record<string, number> = {};

  subscriptions.forEach((sub) => {
    const plan = sub.plan || "free";
    const status = sub.status || "active";
    const price = PLAN_PRICES[plan] || 0;

    // Count plan distribution
    if (plan in planDistribution) {
      planDistribution[plan]++;
    }

    if (status === "active" || status === "trialing") {
      activeSubscriptions++;

      if (status === "trialing") {
        trialUsers++;
      } else if (plan !== "free") {
        mrr += price;
        payingUsers++;
        mrrByPlan[plan] = (mrrByPlan[plan] || 0) + price;
      } else {
        freeUsers++;
      }
    }
  });

  const arr = mrr * 12;
  const arpu = payingUsers > 0 ? mrr / payingUsers : 0;

  return {
    currentMRR: mrr,
    currentARR: arr,
    mrrChange30d: 0,
    mrrGrowthRate30d: null,
    activeSubscriptions,
    payingUsers,
    freeUsers,
    trialUsers,
    arpu,
    planDistribution,
    mrrByPlan,
    bestDayMRR: null,
    worstDayMRR: null,
  };
}

function getDefaultMRRSummary(): MRRSummary {
  return {
    currentMRR: 0,
    currentARR: 0,
    mrrChange30d: 0,
    mrrGrowthRate30d: null,
    activeSubscriptions: 0,
    payingUsers: 0,
    freeUsers: 0,
    trialUsers: 0,
    arpu: 0,
    planDistribution: {},
    mrrByPlan: {},
    bestDayMRR: null,
    worstDayMRR: null,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Get event type display label
 */
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    new: "New Subscription",
    upgrade: "Plan Upgrade",
    downgrade: "Plan Downgrade",
    canceled: "Subscription Canceled",
    reactivated: "Subscription Reactivated",
    trial_started: "Trial Started",
    trial_converted: "Trial Converted",
    trial_expired: "Trial Expired",
    payment_failed: "Payment Failed",
    payment_recovered: "Payment Recovered",
  };
  return labels[eventType] || eventType;
}

/**
 * Get event type color class
 */
export function getEventTypeColor(eventType: string): string {
  const colors: Record<string, string> = {
    new: "text-green-600 bg-green-50",
    upgrade: "text-green-600 bg-green-50",
    trial_converted: "text-green-600 bg-green-50",
    reactivated: "text-green-600 bg-green-50",
    payment_recovered: "text-green-600 bg-green-50",
    downgrade: "text-orange-600 bg-orange-50",
    canceled: "text-red-600 bg-red-50",
    trial_expired: "text-red-600 bg-red-50",
    payment_failed: "text-red-600 bg-red-50",
    trial_started: "text-blue-600 bg-blue-50",
  };
  return colors[eventType] || "text-gray-600 bg-gray-50";
}
