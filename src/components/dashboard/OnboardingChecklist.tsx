import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Sparkles,
  Rocket,
  FileText,
  Users,
  MessageSquare,
  TrendingUp,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingProgress, type OnboardingMilestone } from "@/hooks/useOnboardingProgress";
import { trackEvent } from "@/lib/analytics";

const MILESTONE_ICONS: Record<string, typeof FileText> = {
  profile: Settings,
  document: FileText,
  contact: Users,
  "ai-chat": MessageSquare,
  deal: TrendingUp,
};

function MilestoneItem({
  milestone,
  onClick,
}: {
  milestone: OnboardingMilestone;
  onClick: () => void;
}) {
  const Icon = MILESTONE_ICONS[milestone.id] || Circle;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={milestone.completed}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        milestone.completed && "opacity-60 cursor-default"
      )}
    >
      {milestone.completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-primary/40 shrink-0 flex items-center justify-center">
          <Icon className="h-3 w-3 text-primary/60" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-tight",
            milestone.completed && "line-through text-muted-foreground"
          )}
        >
          {milestone.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {milestone.description}
        </p>
      </div>
      {!milestone.completed && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

interface OnboardingChecklistProps {
  className?: string;
}

export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const {
    milestones,
    completedCount,
    totalCount,
    progressPercent,
    showChecklist,
    isLoading,
    dismissChecklist,
  } = useOnboardingProgress();

  if (!showChecklist || isLoading) {
    return null;
  }

  const handleMilestoneClick = (milestone: OnboardingMilestone) => {
    if (milestone.completed) return;
    trackEvent("feature_used", {
      feature: "onboarding_checklist_item_click",
      milestone_id: milestone.id,
    });
    navigate(milestone.href);
  };

  const handleDismiss = () => {
    trackEvent("feature_used", {
      feature: "onboarding_checklist_dismissed",
      completed_count: completedCount,
      total_count: totalCount,
    });
    dismissChecklist();
  };

  // Find next incomplete milestone for the CTA
  const nextMilestone = milestones.find((m) => !m.completed);

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-background", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Get Started</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedCount} of {totalCount} completed
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progressPercent} className="h-2 mt-3" />
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {milestones.map((milestone) => (
          <MilestoneItem
            key={milestone.id}
            milestone={milestone}
            onClick={() => handleMilestoneClick(milestone)}
          />
        ))}

        {nextMilestone && (
          <div className="pt-3 border-t mt-2">
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => handleMilestoneClick(nextMilestone)}
            >
              <Sparkles className="h-4 w-4" />
              {nextMilestone.title}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
