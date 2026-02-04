import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { trackEvent } from "@/lib/analytics";

export type OnboardingStep = 
  | "welcome"
  | "profile"
  | "role"
  | "first-contact"
  | "first-document"
  | "completion";

export interface OnboardingData {
  fullName?: string;
  title?: string;
  phone?: string;
  role?: "agent" | "buyer" | "seller";
  contactAdded?: boolean;
  documentUploaded?: boolean;
}

// Simplified onboarding - only require profile setup
const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "profile",
  "role",
  // "first-contact",  // REMOVED: Not required
  // "first-document", // REMOVED: Not required
  "completion",
];

export function useOnboarding() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [data, setData] = useState<OnboardingData>({});

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
      trackEvent("onboarding_step_completed", {
        step: currentStep,
        step_number: currentStepIndex + 1,
      });
    }
  }, [currentStepIndex, currentStep]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStepIndex]);

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
    },
    onSuccess: async () => {
      // Wait for queries to refetch to avoid redirect loop
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      
      // Small additional delay to ensure queries have refetched
      await new Promise(resolve => setTimeout(resolve, 500));
      
      trackEvent("onboarding_completed");
      toast({
        title: "Welcome to Smart Agent!",
        description: "You're all set up and ready to go.",
      });
    },
    onError: (error) => {
      console.error("Failed to complete onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeOnboarding = useCallback(async () => {
    await completeOnboardingMutation.mutateAsync();
  }, [completeOnboardingMutation]);

  const skipOnboarding = useCallback(async () => {
    trackEvent("onboarding_skipped", {
      step: currentStep,
      step_number: currentStepIndex + 1,
    });
    await completeOnboarding();
  }, [currentStep, currentStepIndex, completeOnboarding]);

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
  };
}
