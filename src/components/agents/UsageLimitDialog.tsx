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

interface UsageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usageData?: {
    current_usage: number;
    usage_limit: number;
    plan_name: string;
  };
}

export function UsageLimitDialog({ open, onOpenChange, usageData }: UsageLimitDialogProps) {
  const planDisplayNames: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    professional: "Professional",
    team: "Team",
    brokerage: "Brokerage",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>AI Usage Limit Reached</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            You've used all your AI queries for this billing period.
          </DialogDescription>
        </DialogHeader>

        {usageData && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Plan: {planDisplayNames[usageData.plan_name] || usageData.plan_name}</span>
                <span className="text-muted-foreground">
                  {usageData.current_usage} / {usageData.usage_limit} queries
                </span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            <p className="text-sm text-muted-foreground">
              Upgrade your plan to get more AI queries and unlock additional features.
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
