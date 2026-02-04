import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ProfileSetupStep } from "./steps/ProfileSetupStep";
import { RoleSelectionStep } from "./steps/RoleSelectionStep";
import { FirstContactStep } from "./steps/FirstContactStep";
import { FirstDocumentStep } from "./steps/FirstDocumentStep";
import { CompletionStep } from "./steps/CompletionStep";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const {
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
    isCompleting,
  } = useOnboarding();

  const handleComplete = async () => {
    await completeOnboarding();
    onComplete();
  };

  const handleSkipAll = async () => {
    try {
      await skipOnboarding();
      onComplete();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const renderStep = () => {
    const stepProps = {
      data,
      updateData,
      onNext: goToNextStep,
      onBack: goToPreviousStep,
      onSkip: skipStep,
    };

    switch (currentStep) {
      case "welcome":
        return <WelcomeStep {...stepProps} />;
      case "profile":
        return <ProfileSetupStep {...stepProps} />;
      case "role":
        return <RoleSelectionStep {...stepProps} />;
      case "first-contact":
        return <FirstContactStep {...stepProps} onSkip={skipStep} />;
      case "first-document":
        return <FirstDocumentStep {...stepProps} onSkip={skipStep} />;
      case "completion":
        return (
          <CompletionStep
            data={data}
            onComplete={handleComplete}
            isCompleting={isCompleting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">SA</span>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="text-xs text-muted-foreground mb-1">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
        {currentStep !== "completion" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipAll}
            disabled={isCompleting}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Skip Setup
          </Button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
