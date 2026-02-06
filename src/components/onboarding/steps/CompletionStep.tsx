import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Users,
  FileText,
  TrendingUp,
  MessageSquare,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface CompletionStepProps {
  data: OnboardingData;
  onComplete: () => void;
  isCompleting: boolean;
}

interface ActivationItem {
  icon: typeof FileText;
  title: string;
  description: string;
  completed: boolean;
}

export function CompletionStep({ data, onComplete, isCompleting }: CompletionStepProps) {
  // What the user completed during onboarding
  const setupItems: ActivationItem[] = [
    {
      icon: CheckCircle2,
      title: "Profile created",
      description: data.fullName || "Name set",
      completed: !!data.fullName,
    },
    {
      icon: Users,
      title: "Role selected",
      description: data.role
        ? data.role.charAt(0).toUpperCase() + data.role.slice(1)
        : "Not selected",
      completed: !!data.role,
    },
  ];

  // What they should do next (activation milestones shown on dashboard)
  const nextSteps = [
    {
      icon: FileText,
      title: "Upload your first document",
      description: "AI will analyze contracts, disclosures, and more",
    },
    {
      icon: Users,
      title: "Add your first contact",
      description: "Start building your CRM",
    },
    {
      icon: MessageSquare,
      title: "Try the AI assistant",
      description: "Ask a question about real estate",
    },
    {
      icon: TrendingUp,
      title: "Create your first deal",
      description: "Track transactions in your pipeline",
    },
  ];

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 shadow-lg">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Congrats Text */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">You're all set!</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {data.fullName
            ? `Welcome, ${data.fullName.split(" ")[0]}!`
            : "Welcome!"}{" "}
          Your Smart Agent workspace is ready.
        </p>
      </div>

      {/* Setup Summary */}
      <Card className="text-left">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Setup complete
          </p>
          {setupItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3 py-1">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{item.title}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({item.description})
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Activation Checklist Preview */}
      <div className="text-left space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">
            Your quick-start checklist
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Complete these to get the most out of Smart Agent. You'll find this
          checklist on your dashboard.
        </p>
        <div className="space-y-1">
          {nextSteps.map((step) => (
            <div
              key={step.title}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg",
                "bg-accent/30 border border-border/50"
              )}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onComplete}
        disabled={isCompleting}
        className="w-full max-w-xs"
      >
        {isCompleting ? "Setting up..." : "Go to Dashboard"}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
      <p className="text-xs text-muted-foreground">
        You can always access the checklist from your dashboard
      </p>
    </div>
  );
}
