import { useState } from "react";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ProfileSetupStep } from "./steps/ProfileSetupStep";
import { RoleSelectionStep } from "./steps/RoleSelectionStep";
import { FirstContactStep } from "./steps/FirstContactStep";
import { FirstDocumentStep } from "./steps/FirstDocumentStep";
import { CompletionStep } from "./steps/CompletionStep";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  profile: "Profile",
  role: "Role",
  "first-contact": "Contact",
  "first-document": "Document",
  completion: "Complete",
};

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

  const [showSkipDialog, setShowSkipDialog] = useState(false);

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

  const showBackButton = currentStepIndex > 0 && currentStep !== "completion";

  // Get step order from hook (matches STEP_ORDER in useOnboarding)
  const stepOrder: OnboardingStep[] = ["welcome", "profile", "role", "completion"];

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
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousStep}
              aria-label="Go back"
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">SA</span>
            </div>
          )}
          <div className="flex-1 max-w-md">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-2">
              {stepOrder.map((step, index) => {
                const isActive = currentStep === step;
                const isCompleted = index < currentStepIndex;
                const stepLabel = STEP_LABELS[step];
                
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isActive
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs mt-1 hidden sm:block truncate max-w-[60px]",
                          isActive ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {stepLabel}
                      </span>
                    </div>
                    {index < stepOrder.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-1 transition-colors",
                          index < currentStepIndex ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress Bar */}
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
        {currentStep !== "completion" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkipDialog(true)}
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
          <div key={currentStep} className="animate-in fade-in-50 duration-300">
            {renderStep()}
          </div>
        </div>
      </main>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              You can always complete your profile and setup later from your account settings. 
              However, completing onboarding helps us personalize your experience and unlock all features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Setup</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSkipAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Skip for Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
