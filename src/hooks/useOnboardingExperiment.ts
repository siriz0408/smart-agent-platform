/**
 * GRW-012: Onboarding A/B Testing Hook
 *
 * Manages experiment variant assignment and conversion tracking for onboarding flows.
 * Supports multiple experiment variants with different configurations.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

// Experiment variant types
export type OnboardingFlowType = "standard" | "streamlined" | "guided";

export interface OnboardingVariantConfig {
  flow: OnboardingFlowType;
  steps: string[];
  showProgress: boolean;
  allowSkip: boolean;
  showTooltips?: boolean;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  variantConfig: OnboardingVariantConfig;
  isNewAssignment: boolean;
}

export interface ExperimentResult {
  variantId: string;
  variantName: string;
  totalAssigned: number;
  totalConverted: number;
  conversionRate: number;
  avgTimeToConvert: string | null;
}

export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    config: OnboardingVariantConfig;
  }>;
  trafficAllocation: number;
  startDate: string | null;
  endDate: string | null;
  goalMetric: string;
  createdAt: string;
}

const DEFAULT_EXPERIMENT_NAME = "onboarding-flow-v1";

// Default config for users not in experiment
const DEFAULT_VARIANT_CONFIG: OnboardingVariantConfig = {
  flow: "standard",
  steps: ["welcome", "profile", "role", "completion"],
  showProgress: true,
  allowSkip: true,
};

/**
 * Hook to get and manage onboarding experiment assignment
 */
export function useOnboardingExperiment(experimentName: string = DEFAULT_EXPERIMENT_NAME) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localAssignment, setLocalAssignment] = useState<ExperimentAssignment | null>(null);

  // Get or create experiment assignment
  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ["experiment-assignment", experimentName, user?.id],
    queryFn: async (): Promise<ExperimentAssignment | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc("get_or_assign_experiment_variant", {
        p_experiment_name: experimentName,
        p_user_id: user.id,
      });

      if (error) {
        console.error("[Experiment] Failed to get assignment:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const row = data[0];
      const result: ExperimentAssignment = {
        experimentId: row.experiment_id,
        variantId: row.variant_id,
        variantConfig: row.variant_config || DEFAULT_VARIANT_CONFIG,
        isNewAssignment: row.is_new_assignment,
      };

      // Track assignment event for new assignments
      if (row.is_new_assignment) {
        trackEvent("feature_used", {
          feature: "experiment_assigned",
          experiment: experimentName,
          variant: row.variant_id,
        });
      }

      return result;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Assignment doesn't change once set
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
  });

  // Use local state if available, otherwise use query result
  const currentAssignment = localAssignment || assignment;

  // Record conversion mutation
  const recordConversionMutation = useMutation({
    mutationFn: async ({
      conversionType = "primary",
      metadata = {},
    }: {
      conversionType?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("record_experiment_conversion", {
        p_experiment_name: experimentName,
        p_user_id: user.id,
        p_conversion_type: conversionType,
        p_metadata: metadata,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      trackEvent("feature_used", {
        feature: "experiment_converted",
        experiment: experimentName,
        variant: currentAssignment?.variantId || "unknown",
        conversion_type: variables.conversionType || "primary",
      });
    },
  });

  // Record primary conversion (onboarding completed)
  const recordConversion = useCallback(
    async (metadata?: Record<string, unknown>) => {
      return recordConversionMutation.mutateAsync({
        conversionType: "primary",
        metadata,
      });
    },
    [recordConversionMutation]
  );

  // Record secondary conversion (e.g., first feature used)
  const recordSecondaryConversion = useCallback(
    async (conversionType: string, metadata?: Record<string, unknown>) => {
      return recordConversionMutation.mutateAsync({
        conversionType,
        metadata,
      });
    },
    [recordConversionMutation]
  );

  // Get effective config (with fallback)
  const effectiveConfig = useMemo((): OnboardingVariantConfig => {
    if (currentAssignment?.variantConfig) {
      return currentAssignment.variantConfig;
    }
    return DEFAULT_VARIANT_CONFIG;
  }, [currentAssignment]);

  // Get step order based on variant
  const stepOrder = useMemo(() => {
    return effectiveConfig.steps || DEFAULT_VARIANT_CONFIG.steps;
  }, [effectiveConfig]);

  return {
    // Assignment info
    assignment: currentAssignment,
    isLoading,
    error,

    // Variant info
    variantId: currentAssignment?.variantId || "control",
    variantConfig: effectiveConfig,
    flowType: effectiveConfig.flow,
    stepOrder,

    // Flags
    showProgress: effectiveConfig.showProgress,
    allowSkip: effectiveConfig.allowSkip,
    showTooltips: effectiveConfig.showTooltips || false,

    // Actions
    recordConversion,
    recordSecondaryConversion,
    isRecordingConversion: recordConversionMutation.isPending,
  };
}

/**
 * Hook to get experiment results (admin only)
 */
export function useExperimentResults(experimentName: string = DEFAULT_EXPERIMENT_NAME) {
  return useQuery({
    queryKey: ["experiment-results", experimentName],
    queryFn: async (): Promise<ExperimentResult[]> => {
      const { data, error } = await supabase.rpc("get_experiment_results", {
        p_experiment_name: experimentName,
      });

      if (error) {
        console.error("[Experiment] Failed to get results:", error);
        throw error;
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        variantId: row.variant_id as string,
        variantName: row.variant_name as string,
        totalAssigned: Number(row.total_assigned) || 0,
        totalConverted: Number(row.total_converted) || 0,
        conversionRate: Number(row.conversion_rate) || 0,
        avgTimeToConvert: row.avg_time_to_convert as string | null,
      }));
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Hook to list all experiments (admin only)
 */
export function useExperiments() {
  return useQuery({
    queryKey: ["experiments"],
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Experiment] Failed to list experiments:", error);
        throw error;
      }

      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        status: row.status,
        variants: row.variants || [],
        trafficAllocation: row.traffic_allocation,
        startDate: row.start_date,
        endDate: row.end_date,
        goalMetric: row.goal_metric,
        createdAt: row.created_at,
      }));
    },
  });
}

/**
 * Hook to manage experiment status (admin only)
 */
export function useExperimentAdmin() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      experimentId,
      status,
    }: {
      experimentId: string;
      status: "draft" | "running" | "paused" | "completed";
    }) => {
      const { error } = await supabase
        .from("experiments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", experimentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
  });

  const updateTrafficMutation = useMutation({
    mutationFn: async ({
      experimentId,
      trafficAllocation,
    }: {
      experimentId: string;
      trafficAllocation: number;
    }) => {
      const { error } = await supabase
        .from("experiments")
        .update({
          traffic_allocation: trafficAllocation,
          updated_at: new Date().toISOString(),
        })
        .eq("id", experimentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
  });

  return {
    updateStatus: updateStatusMutation.mutateAsync,
    updateTraffic: updateTrafficMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending || updateTrafficMutation.isPending,
  };
}

// Re-export types for external use
export type { OnboardingFlowType as ExperimentFlowType };
