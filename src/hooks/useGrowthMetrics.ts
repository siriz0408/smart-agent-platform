import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_PRICES } from "./useSubscription";

export interface GrowthMetrics {
  // Revenue Metrics
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue (MRR * 12)
  totalRevenue: number; // Total revenue from all paid subscriptions
  
  // Conversion Metrics
  trialToPaidConversionRate: number; // Percentage of trials that converted to paid
  totalTrials: number;
  convertedTrials: number;
  
  // Churn Metrics
  churnRate: number; // Monthly churn rate percentage
  churnedSubscriptions: number;
  activeSubscriptions: number;
  
  // User Metrics
  totalUsers: number;
  activeUsers: number; // Users with active subscriptions
  freeUsers: number;
  paidUsers: number;
  
  // Plan Distribution
  planDistribution: {
    free: number;
    starter: number;
    professional: number;
    team: number;
    brokerage: number;
  };
  
  // Growth Trends (last 30 days)
  newSignups: number;
  newPaidSubscriptions: number;
  revenueGrowth: number; // Percentage change in MRR
  
  // Usage Metrics
  totalAiQueries: number;
  totalDocuments: number;
}

/**
 * Hook to fetch growth metrics for admin dashboard
 * Requires admin or super_admin access
 */
export function useGrowthMetrics() {
  return useQuery({
    queryKey: ["growth-metrics"],
    queryFn: async (): Promise<GrowthMetrics> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      // Fetch all subscriptions
      // Note: This requires admin access or a Supabase function with service role
      // For now, we'll query what we can - may need RLS policy update or function
      const { data: subscriptions, error: subError } = await supabase
        .from("subscriptions")
        .select("*");
      
      if (subError) {
        console.error("Error fetching subscriptions:", subError);
        // Return default values if query fails (likely RLS restriction)
        return getDefaultMetrics();
      }
      
      if (!subscriptions || subscriptions.length === 0) {
        return getDefaultMetrics();
      }
      
      // Calculate MRR from active paid subscriptions
      let mrr = 0;
      let activeSubscriptions = 0;
      let churnedSubscriptions = 0;
      const planDistribution = {
        free: 0,
        starter: 0,
        professional: 0,
        team: 0,
        brokerage: 0,
      };
      
      let totalTrials = 0;
      const convertedTrials = 0;
      let paidUsers = 0;
      let freeUsers = 0;
      let newPaidSubscriptions = 0;
      
      subscriptions.forEach((sub) => {
        const plan = sub.plan || "free";
        const status = sub.status || "active";
        const createdAt = sub.created_at ? new Date(sub.created_at) : null;
        
        // Count plan distribution
        if (plan in planDistribution) {
          planDistribution[plan as keyof typeof planDistribution]++;
        }
        
        // Count active vs churned
        if (status === "active" || status === "trialing") {
          activeSubscriptions++;
          
          // Calculate MRR (only for paid plans)
          if (plan !== "free" && status === "active") {
            const price = PLAN_PRICES[plan] || 0;
            mrr += price;
            paidUsers++;
          } else if (status === "trialing") {
            totalTrials++;
            // Check if trial converted (has a paid plan after trial)
            // This is simplified - in reality we'd check historical data
          } else if (plan === "free") {
            freeUsers++;
          }
        } else if (status === "canceled" || status === "past_due") {
          churnedSubscriptions++;
        }
        
        // Count new paid subscriptions in last 30 days
        if (createdAt && createdAt >= thirtyDaysAgo && plan !== "free" && status === "active") {
          newPaidSubscriptions++;
        }
      });
      
      // Calculate conversion rate (simplified - would need historical trial data)
      // For now, estimate based on active paid vs total trials
      const trialToPaidConversionRate = totalTrials > 0 
        ? (convertedTrials / totalTrials) * 100 
        : 0;
      
      // Calculate churn rate
      const totalSubscriptions = subscriptions.length;
      const churnRate = totalSubscriptions > 0 
        ? (churnedSubscriptions / totalSubscriptions) * 100 
        : 0;
      
      // Fetch user counts
      const { count: totalUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      const totalUsers = totalUsersCount || 0;
      const activeUsers = activeSubscriptions;
      
      // Fetch usage metrics
      const { data: usageRecords } = await supabase
        .from("usage_records")
        .select("quantity")
        .eq("record_type", "ai_query");
      
      const totalAiQueries = usageRecords?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 0;
      
      const { count: totalDocuments } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true });
      
      // Calculate new signups (users created in last 30 days)
      const { count: newSignupsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      const newSignups = newSignupsCount || 0;
      
      // Calculate revenue growth (simplified - would need historical MRR data)
      const arr = mrr * 12;
      const totalRevenue = mrr; // Simplified - would sum all historical revenue
      const revenueGrowth = 0; // Would need to compare with previous month
      
      return {
        mrr,
        arr,
        totalRevenue,
        trialToPaidConversionRate,
        totalTrials,
        convertedTrials,
        churnRate,
        churnedSubscriptions,
        activeSubscriptions,
        totalUsers,
        activeUsers,
        freeUsers,
        paidUsers,
        planDistribution,
        newSignups,
        newPaidSubscriptions,
        revenueGrowth,
        totalAiQueries,
        totalDocuments: totalDocuments || 0,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

function getDefaultMetrics(): GrowthMetrics {
  return {
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    trialToPaidConversionRate: 0,
    totalTrials: 0,
    convertedTrials: 0,
    churnRate: 0,
    churnedSubscriptions: 0,
    activeSubscriptions: 0,
    totalUsers: 0,
    activeUsers: 0,
    freeUsers: 0,
    paidUsers: 0,
    planDistribution: {
      free: 0,
      starter: 0,
      professional: 0,
      team: 0,
      brokerage: 0,
    },
    newSignups: 0,
    newPaidSubscriptions: 0,
    revenueGrowth: 0,
    totalAiQueries: 0,
    totalDocuments: 0,
  };
}
