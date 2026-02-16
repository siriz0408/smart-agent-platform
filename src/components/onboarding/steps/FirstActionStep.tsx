/**
 * GRW-012: Guided Onboarding Variant - First Action Step
 *
 * Prompts users to take their first meaningful action in the app.
 * Used in the "guided" A/B test variant to encourage early engagement.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  MessageSquare,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface FirstActionStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

type ActionChoice = "document" | "contact" | "chat" | "skip";

const actions = [
  {
    id: "document" as const,
    title: "Upload a Document",
    description: "Get AI-powered analysis of contracts, disclosures, or inspections",
    icon: FileText,
    href: "/documents",
    time: "2 min",
    recommended: false,
  },
  {
    id: "contact" as const,
    title: "Add a Contact",
    description: "Start building your CRM with a client or lead",
    icon: Users,
    href: "/contacts",
    time: "1 min",
    recommended: false,
  },
  {
    id: "chat" as const,
    title: "Chat with AI",
    description: "Ask a question about real estate and see the AI in action",
    icon: MessageSquare,
    href: "/dashboard",
    time: "30 sec",
    recommended: true,
  },
];

export function FirstActionStep({
  data,
  updateData,
  onNext,
  onBack,
  onSkip,
}: FirstActionStepProps) {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<ActionChoice | undefined>();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleActionSelect = (actionId: ActionChoice) => {
    setSelectedAction(actionId);
  };

  const handleContinue = () => {
    if (selectedAction === "skip" || !selectedAction) {
      onNext();
      return;
    }

    const action = actions.find((a) => a.id === selectedAction);
    if (action) {
      setIsNavigating(true);
      // Store the intention in onboarding data
      updateData({
        documentUploaded: selectedAction === "document",
        contactAdded: selectedAction === "contact",
      });
      // Navigate to the selected action page after completing onboarding
      // The user will be redirected after onboarding completes
      onNext();
    }
  };

  const handleSkip = () => {
    setSelectedAction("skip");
    onNext();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Take Your First Action</CardTitle>
        <CardDescription>
          Choose how you'd like to start using Smart Agent. You can always do the others later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleActionSelect(action.id)}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              selectedAction === action.id
                ? "border-primary bg-primary/5"
                : "border-border"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  selectedAction === action.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    {action.title}
                    {action.recommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Recommended
                      </span>
                    )}
                  </h3>
                  {selectedAction === action.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Takes about {action.time}
                </p>
              </div>
            </div>
          </button>
        ))}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1"
            disabled={isNavigating}
          >
            {selectedAction ? "Continue" : "Skip for Now"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Skip Link */}
        {selectedAction && (
          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            I'll explore on my own
          </button>
        )}
      </CardContent>
    </Card>
  );
}
