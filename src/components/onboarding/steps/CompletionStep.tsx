import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, ArrowRight, Users, FileText, TrendingUp } from "lucide-react";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface CompletionStepProps {
  data: OnboardingData;
  onComplete: () => void;
  isCompleting: boolean;
}

export function CompletionStep({ data, onComplete, isCompleting }: CompletionStepProps) {
  const completedItems = [
    {
      icon: CheckCircle,
      label: "Profile created",
      completed: !!data.fullName,
    },
    {
      icon: Users,
      label: "Role selected",
      completed: !!data.role,
      detail: data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : undefined,
    },
    {
      icon: Users,
      label: "First contact added",
      completed: !!data.contactAdded,
    },
    {
      icon: FileText,
      label: "First document uploaded",
      completed: !!data.documentUploaded,
    },
  ];

  const suggestedNextSteps = data.role === "agent"
    ? [
        { icon: Users, label: "Import your contacts", href: "/contacts" },
        { icon: FileText, label: "Upload more documents", href: "/documents" },
        { icon: TrendingUp, label: "Create your first deal", href: "/pipeline/buyers" },
      ]
    : data.role === "buyer"
    ? [
        { icon: Sparkles, label: "Search for properties", href: "/properties/search" },
        { icon: FileText, label: "Upload documents to review", href: "/documents" },
        { icon: TrendingUp, label: "Track your journey", href: "/my-journey" },
      ]
    : [
        { icon: FileText, label: "Upload your disclosure", href: "/documents" },
        { icon: TrendingUp, label: "View your journey", href: "/my-journey" },
        { icon: Sparkles, label: "Ask AI about your listing", href: "/" },
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
        <h1 className="text-3xl font-bold tracking-tight">
          You're all set!
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {data.fullName ? `Welcome, ${data.fullName.split(" ")[0]}!` : "Welcome!"} Your Smart Agent workspace is ready to go.
        </p>
      </div>

      {/* Completed Items */}
      <Card className="text-left">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Setup completed</p>
          {completedItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  item.completed ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span className={item.completed ? "" : "text-muted-foreground"}>
                {item.label}
                {item.detail && (
                  <span className="text-muted-foreground"> ({item.detail})</span>
                )}
              </span>
              {item.completed && (
                <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Next Steps */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Suggested next steps</p>
        <div className="grid gap-2">
          {suggestedNextSteps.map((step) => (
            <Button
              key={step.label}
              variant="outline"
              className="justify-start"
              asChild
            >
              <a href={step.href}>
                <step.icon className="h-4 w-4 mr-2" />
                {step.label}
              </a>
            </Button>
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
    </div>
  );
}
