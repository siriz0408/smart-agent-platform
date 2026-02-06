import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export function TrialCountdown() {
  const { isTrialing, trialDaysRemaining, trialEnd } = useSubscription();

  if (!isTrialing || !trialEnd) {
    return null;
  }

  const isUrgent = trialDaysRemaining <= 3;
  const isExpiringToday = trialDaysRemaining === 0;

  return (
    <Card className={cn(
      "border-2",
      isExpiringToday && "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
      isUrgent && !isExpiringToday && "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
      !isUrgent && "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isExpiringToday && "bg-amber-500 text-white",
              isUrgent && !isExpiringToday && "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
              !isUrgent && "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
            )}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">
                {isExpiringToday
                  ? "Your trial ends today!"
                  : trialDaysRemaining === 1
                  ? "1 day left in your trial"
                  : `${trialDaysRemaining} days left in your trial`}
              </div>
              <div className="text-sm text-muted-foreground">
                Trial ends on {trialEnd.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <Badge
            variant={isExpiringToday ? "destructive" : isUrgent ? "default" : "secondary"}
            className="text-sm"
          >
            {trialDaysRemaining === 0
              ? "Expires Today"
              : trialDaysRemaining === 1
              ? "1 Day Left"
              : `${trialDaysRemaining} Days Left`}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
