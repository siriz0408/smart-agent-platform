import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { useOnboardingExperiment } from "./useOnboardingExperiment";

export type OnboardingStep =
  | "welcome"
  | "profile"
  | "role"
  | "first-contact"
  | "first-document"
  | "welcome-combined"  // GRW-012: Streamlined variant combined step
  | "first-action"      // GRW-012: Guided variant additional step
  | "completion";

export interface OnboardingData {
  fullName?: string;
  title?: string;
  phone?: string;
  role?: "agent" | "buyer" | "seller";
  contactAdded?: boolean;
  documentUploaded?: boolean;
}

// Default step order (used when experiment not loaded or control variant)
const DEFAULT_STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "profile",
  "role",
  "completion",
];

// Step order mapping for variants
const VARIANT_STEP_ORDERS: Record<string, OnboardingStep[]> = {
  standard: ["welcome", "profile", "role", "completion"],
  streamlined: ["welcome-combined", "completion"],
  guided: ["welcome", "profile", "role", "first-action", "completion"],
};

export function useOnboarding() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  // GRW-012: Get A/B test variant
  const experiment = useOnboardingExperiment();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [data, setData] = useState<OnboardingData>({});

  // GRW-012: Determine step order based on variant
  const stepOrder = useMemo((): OnboardingStep[] => {
    const flowType = experiment.flowType;
    return VARIANT_STEP_ORDERS[flowType] || DEFAULT_STEP_ORDER;
  }, [experiment.flowType]);

  // Adjust current step index based on dynamic step order
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // GRW-012: Expose variant info
  const variantId = experiment.variantId;
  const allowSkip = experiment.allowSkip;
  const showTooltips = experiment.showTooltips;

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
      trackEvent("onboarding_step_completed", {
        step: currentStep,
        step_number: currentStepIndex + 1,
        variant: variantId,  // GRW-012: Track variant
      });
    }
  }, [currentStepIndex, currentStep, stepOrder, variantId]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(stepOrder[prevIndex]);
    }
  }, [currentStepIndex, stepOrder]);

  const skipStep = useCallback(() => {
    goToNextStep();
    trackEvent("onboarding_step_completed", {
      step: currentStep,
      skipped: true,
    });
  }, [goToNextStep, currentStep]);

  const updateData = useCallback((newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) {
        throw new Error("Profile not found");
      }

      // Update profile with onboarding_completed flag
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      // GRW-012: Record experiment conversion
      try {
        await experiment.recordConversion({
          completed_steps: stepOrder.length,
          variant: variantId,
        });
      } catch (conversionError) {
        // Don't fail onboarding if conversion tracking fails
        console.warn("[Onboarding] Failed to record experiment conversion:", conversionError);
      }
    },
    onSuccess: async () => {
      // Refresh profile from AuthProvider to get updated onboarding_completed value
      // This is critical - profile is stored in AuthProvider state, not React Query
      await refreshProfile();

      // Also invalidate any React Query caches that might reference profile
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });

      trackEvent("onboarding_completed", { variant: variantId });
      toast.success("Welcome to Smart Agent!", { description: "You're all set up and ready to go." });
    },
    onError: (error) => {
      console.error("Failed to complete onboarding:", error);
      toast.error("Error", { description: "Failed to complete onboarding. Please try again." });
    },
  });

  const completeOnboarding = useCallback(async () => {
    await completeOnboardingMutation.mutateAsync();
  }, [completeOnboardingMutation]);

  const skipOnboarding = useCallback(async () => {
    trackEvent("onboarding_skipped", {
      step: currentStep,
      step_number: currentStepIndex + 1,
      variant: variantId,  // GRW-012: Track variant
    });
    await completeOnboarding();
  }, [currentStep, currentStepIndex, completeOnboarding, variantId]);

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    progress,
    data,
    updateData,
    goToNextStep,
    goToPreviousStep,
    skipStep,
    completeOnboarding,
    skipOnboarding,
    isCompleting: completeOnboardingMutation.isPending,
    // GRW-012: A/B test variant info
    variantId,
    stepOrder,
    allowSkip,
    showTooltips,
    isExperimentLoading: experiment.isLoading,
  };
}
