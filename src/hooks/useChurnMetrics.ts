/**
 * GRW-004: Churn Rate Analysis Hook
 *
 * Provides churn metrics and risk analysis for growth monitoring.
 * Leverages the churn prevention infrastructure from GRW-011.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChurnRiskBreakdown {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  login_recency_score: number;
  feature_usage_score: number;
  subscription_health_score: number;
  onboarding_score: number;
  engagement_trend_score: number;
  days_since_last_activity: number;
  last_activity_date: string;
  assessment_notes: string;
}

export interface ChurnMetrics {
  // Overall metrics
  totalActiveUsers: number;
  totalChurnedUsers: number;
  churnRate: number; // Percentage

  // Risk distribution
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  // At-risk users
  atRiskCount: number; // medium + high + critical
  criticalCount: number; // critical only

  // Subscription health
  trialingUsers: number;
  paidUsers: number;
  canceledUsers: number;
  pastDueUsers: number;

  // Engagement metrics
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  avgActivityDays: number;
}

export interface ChurnRiskUser {
  user_id: string;
  workspace_id: string;
  risk_level: string;
  risk_score: number;
  days_since_last_activity: number;
  last_activity_date: string;
  assessment_notes: string;
  user_email?: string;
  user_name?: string;
  workspace_name?: string;
}

/**
 * Fetch comprehensive churn metrics for the current workspace
 */
export function useChurnMetrics(workspaceId?: string) {
  return useQuery({
    queryKey: ['churn-metrics', workspaceId],
    queryFn: async () => {
      // Get current workspace if not provided
      const effectiveWorkspaceId = workspaceId || (
        await supabase.auth.getUser()
      ).data.user?.user_metadata?.active_workspace_id;

      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID available');
      }

      // Fetch churn risk assessments
      const { data: assessments, error: assessError } = await supabase
        .from('churn_risk_assessments')
        .select('*')
        .eq('workspace_id', effectiveWorkspaceId);

      if (assessError) throw assessError;

      // Fetch subscription data
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('workspace_id', effectiveWorkspaceId);

      if (subError) throw subError;

      // Fetch activity data for engagement metrics
      const { data: recentActivity, error: activityError } = await supabase
        .from('user_activity_log')
        .select('user_id, activity_date')
        .eq('workspace_id', effectiveWorkspaceId)
        .gte('activity_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (activityError) throw activityError;

      // Calculate metrics
      const totalActiveUsers = assessments?.length || 0;
      const canceledUsers = subscriptions?.filter(s => s.status === 'canceled').length || 0;
      const churnRate = totalActiveUsers > 0 ? (canceledUsers / totalActiveUsers) * 100 : 0;

      // Risk distribution
      const riskDistribution = {
        low: assessments?.filter(a => a.risk_level === 'low').length || 0,
        medium: assessments?.filter(a => a.risk_level === 'medium').length || 0,
        high: assessments?.filter(a => a.risk_level === 'high').length || 0,
        critical: assessments?.filter(a => a.risk_level === 'critical').length || 0,
      };

      // At-risk counts
      const atRiskCount = riskDistribution.medium + riskDistribution.high + riskDistribution.critical;
      const criticalCount = riskDistribution.critical;

      // Subscription health
      const trialingUsers = subscriptions?.filter(s => s.status === 'trialing').length || 0;
      const paidUsers = subscriptions?.filter(s => s.status === 'active').length || 0;
      const pastDueUsers = subscriptions?.filter(s => s.status === 'past_due').length || 0;

      // Engagement metrics
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeUsersLast7Days = new Set(
        recentActivity
          ?.filter(a => new Date(a.activity_date) >= sevenDaysAgo)
          .map(a => a.user_id)
      ).size;

      const activeUsersLast30Days = new Set(
        recentActivity?.map(a => a.user_id)
      ).size;

      // Calculate average activity days (per user in last 30 days)
      const userActivityCounts = recentActivity?.reduce((acc, activity) => {
        acc[activity.user_id] = (acc[activity.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const avgActivityDays = Object.keys(userActivityCounts).length > 0
        ? Object.values(userActivityCounts).reduce((sum, count) => sum + count, 0) / Object.keys(userActivityCounts).length
        : 0;

      const metrics: ChurnMetrics = {
        totalActiveUsers,
        totalChurnedUsers: canceledUsers,
        churnRate,
        riskDistribution,
        atRiskCount,
        criticalCount,
        trialingUsers,
        paidUsers,
        canceledUsers,
        pastDueUsers,
        activeUsersLast7Days,
        activeUsersLast30Days,
        avgActivityDays: Math.round(avgActivityDays * 10) / 10,
      };

      return metrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch users at risk of churning
 */
export function useAtRiskUsers(workspaceId?: string, minRiskLevel: 'medium' | 'high' | 'critical' = 'medium') {
  return useQuery({
    queryKey: ['at-risk-users', workspaceId, minRiskLevel],
    queryFn: async () => {
      const effectiveWorkspaceId = workspaceId || (
        await supabase.auth.getUser()
      ).data.user?.user_metadata?.active_workspace_id;

      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID available');
      }

      // Define risk level thresholds
      const riskLevels = {
        medium: ['medium', 'high', 'critical'],
        high: ['high', 'critical'],
        critical: ['critical'],
      };

      const allowedLevels = riskLevels[minRiskLevel];

      // Fetch at-risk assessments with user details
      const { data, error } = await supabase
        .from('churn_risk_assessments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          workspaces:workspace_id (
            name
          )
        `)
        .eq('workspace_id', effectiveWorkspaceId)
        .in('risk_level', allowedLevels)
        .order('risk_score', { ascending: false });

      if (error) throw error;

      const users: ChurnRiskUser[] = (data || []).map(assessment => ({
        user_id: assessment.user_id,
        workspace_id: assessment.workspace_id,
        risk_level: assessment.risk_level,
        risk_score: assessment.risk_score,
        days_since_last_activity: assessment.days_since_last_activity,
        last_activity_date: assessment.last_activity_date,
        assessment_notes: assessment.assessment_notes,
        user_email: assessment.profiles?.email,
        user_name: assessment.profiles?.full_name,
        workspace_name: assessment.workspaces?.name,
      }));

      return users;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Assess churn risk for a specific user
 */
export async function assessUserChurnRisk(userId: string, workspaceId?: string): Promise<ChurnRiskBreakdown> {
  const { data, error } = await supabase.rpc('assess_churn_risk', {
    p_user_id: userId,
    p_workspace_id: workspaceId || null,
  });

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No assessment data returned');
  }

  return data[0];
}

/**
 * Batch assess all users in workspace
 */
export async function assessAllUsersChurnRisk(): Promise<number> {
  const { data, error } = await supabase.rpc('assess_all_users_churn_risk');

  if (error) throw error;

  return data as number; // Returns count of users assessed
}
