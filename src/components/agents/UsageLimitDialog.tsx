import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

export type LimitType = "ai_chats" | "documents" | "contacts";

interface UsageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType?: LimitType;
  usageData?: {
    current_usage: number;
    usage_limit: number;
    plan_name: string;
  };
}

const LIMIT_TYPE_CONFIG: Record<LimitType, { title: string; description: string; unit: string }> = {
  ai_chats: {
    title: "AI Usage Limit Reached",
    description: "You've used all your AI queries for this billing period.",
    unit: "queries",
  },
  documents: {
    title: "Document Limit Reached",
    description: "You've reached your document storage limit.",
    unit: "documents",
  },
  contacts: {
    title: "Contact Limit Reached",
    description: "You've reached your contact limit.",
    unit: "contacts",
  },
};

export function UsageLimitDialog({ open, onOpenChange, limitType = "ai_chats", usageData }: UsageLimitDialogProps) {
  const planDisplayNames: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    professional: "Professional",
    team: "Team",
    brokerage: "Brokerage",
  };

  const config = LIMIT_TYPE_CONFIG[limitType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        {usageData && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Plan: {planDisplayNames[usageData.plan_name] || usageData.plan_name}</span>
                <span className="text-muted-foreground">
                  {usageData.current_usage} / {usageData.usage_limit === -1 ? "∞" : usageData.usage_limit} {config.unit}
                </span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            <p className="text-sm text-muted-foreground">
              Upgrade your plan to get more {config.unit} and unlock additional features.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button asChild>
            <Link to="/billing">Upgrade Plan</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
