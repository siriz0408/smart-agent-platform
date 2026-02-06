import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number; // Percentage of previous stage
  dropOff: number; // Percentage drop-off from previous stage
  avgTimeToComplete?: number; // Average time in hours to reach this stage
}

export interface ConversionFunnel {
  stages: FunnelStage[];
  totalSignups: number;
  overallConversionRate: number; // Signup to paid conversion
  period: {
    start: string;
    end: string;
  };
}

/**
 * Hook to fetch conversion funnel analysis
 * Tracks user journey from signup to paid subscription
 */
export function useConversionFunnel(daysBack: number = 30) {
  return useQuery({
    queryKey: ["conversion-funnel", daysBack],
    queryFn: async (): Promise<ConversionFunnel> => {
      const now = new Date();
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      // Stage 1: Signup Started/Completed (users who created profiles)
      const { count: signupsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString());
      
      const totalSignups = signupsCount || 0;
      
      if (totalSignups === 0) {
        return {
          stages: [],
          totalSignups: 0,
          overallConversionRate: 0,
          period: {
            start: startDate.toISOString(),
            end: now.toISOString(),
          },
        };
      }
      
      // Stage 2: Onboarding Started (all signups have started onboarding)
      const onboardingStarted = totalSignups;
      
      // Stage 3: Onboarding Completed
      const { count: onboardingCompletedCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString())
        .eq("onboarding_completed", true);
      
      const onboardingCompleted = onboardingCompletedCount || 0;
      
      // Stage 4: First Feature Use
      // Check for first document upload, contact creation, or AI query
      // Get users who signed up in the period
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, active_workspace_id")
        .gte("created_at", startDate.toISOString());
      
      const signupUserIds = new Set(profilesData?.map(p => p.user_id) || []);
      const signupWorkspaceIds = new Set(
        profilesData?.map(p => p.active_workspace_id).filter(Boolean) || []
      );
      
      // Count users who uploaded at least one document (in their workspace)
      const { data: documentsData } = await supabase
        .from("documents")
        .select("workspace_id")
        .gte("created_at", startDate.toISOString())
        .in("workspace_id", Array.from(signupWorkspaceIds));
      
      // Count users who created at least one contact (in their workspace)
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("workspace_id")
        .gte("created_at", startDate.toISOString())
        .in("workspace_id", Array.from(signupWorkspaceIds));
      
      // Count users who sent at least one AI query
      const { data: aiMessagesData } = await supabase
        .from("ai_messages")
        .select("user_id")
        .gte("created_at", startDate.toISOString())
        .in("user_id", Array.from(signupUserIds));
      
      // Get unique workspace IDs that have activity
      const activeWorkspaceIds = new Set([
        ...(documentsData?.map(d => d.workspace_id) || []),
        ...(contactsData?.map(c => c.workspace_id) || []),
      ]);
      
      // Get users in active workspaces
      const { data: workspaceMemberships } = await supabase
        .from("workspace_memberships")
        .select("user_id")
        .in("workspace_id", Array.from(activeWorkspaceIds))
        .in("user_id", Array.from(signupUserIds));
      
      // Combine: users with workspace activity OR users with AI messages
      const activeUserIds = new Set([
        ...(workspaceMemberships?.map(w => w.user_id) || []),
        ...(aiMessagesData?.map(m => m.user_id) || []),
      ]);
      
      const firstFeatureUse = activeUserIds.size;
      
      // Stage 5: Subscription Started (non-free plans)
      const { count: subscriptionStartedCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString())
        .neq("plan", "free");
      
      const subscriptionStarted = subscriptionStartedCount || 0;
      
      // Stage 6: Trial to Paid Conversion (active paid subscriptions)
      const { count: paidConversionCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString())
        .eq("status", "active")
        .neq("plan", "free");
      
      const paidConversion = paidConversionCount || 0;
      
      // Build funnel stages
      const stages: FunnelStage[] = [
        {
          name: "Signup",
          count: totalSignups,
          percentage: 100,
          dropOff: 0,
        },
        {
          name: "Onboarding Started",
          count: onboardingStarted,
          percentage: (onboardingStarted / totalSignups) * 100,
          dropOff: 0,
        },
        {
          name: "Onboarding Completed",
          count: onboardingCompleted,
          percentage: onboardingStarted > 0 ? (onboardingCompleted / onboardingStarted) * 100 : 0,
          dropOff: onboardingStarted > 0 ? ((onboardingStarted - onboardingCompleted) / onboardingStarted) * 100 : 0,
        },
        {
          name: "First Feature Use",
          count: firstFeatureUse,
          percentage: onboardingCompleted > 0 ? (firstFeatureUse / onboardingCompleted) * 100 : 0,
          dropOff: onboardingCompleted > 0 ? ((onboardingCompleted - firstFeatureUse) / onboardingCompleted) * 100 : 0,
        },
        {
          name: "Subscription Started",
          count: subscriptionStarted,
          percentage: firstFeatureUse > 0 ? (subscriptionStarted / firstFeatureUse) * 100 : 0,
          dropOff: firstFeatureUse > 0 ? ((firstFeatureUse - subscriptionStarted) / firstFeatureUse) * 100 : 0,
        },
        {
          name: "Paid Conversion",
          count: paidConversion,
          percentage: subscriptionStarted > 0 ? (paidConversion / subscriptionStarted) * 100 : 0,
          dropOff: subscriptionStarted > 0 ? ((subscriptionStarted - paidConversion) / subscriptionStarted) * 100 : 0,
        },
      ];
      
      const overallConversionRate = totalSignups > 0 
        ? (paidConversion / totalSignups) * 100 
        : 0;
      
      return {
        stages,
        totalSignups,
        overallConversionRate,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString(),
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}
