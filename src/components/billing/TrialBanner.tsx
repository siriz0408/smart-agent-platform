import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const DISMISS_KEY = "trial-banner-dismissed";
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function TrialBanner() {
  const navigate = useNavigate();
  const { isTrialing, trialDaysRemaining, isTrialEndingSoon } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed recently
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissTime < DISMISS_DURATION) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  const handleUpgrade = () => {
    navigate("/billing");
  };

  // Don't show banner if not trialing, not ending soon, or dismissed
  if (!isTrialing || !isTrialEndingSoon || isDismissed) {
    return null;
  }

  const isUrgent = trialDaysRemaining <= 3;
  const bgColor = isUrgent
    ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
    : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800";
  const textColor = isUrgent
    ? "text-amber-800 dark:text-amber-200"
    : "text-blue-800 dark:text-blue-200";
  const iconColor = isUrgent
    ? "text-amber-500"
    : "text-blue-500";

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-b ${bgColor}`}>
      <div className={`flex items-center gap-3 ${textColor}`}>
        <Clock className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-medium">
          {trialDaysRemaining === 0
            ? "Your trial ends today!"
            : trialDaysRemaining === 1
            ? "1 day left in your trial"
            : `${trialDaysRemaining} days left in your trial`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isUrgent ? "default" : "outline"}
          onClick={handleUpgrade}
          className="h-7"
        >
          <Zap className="h-3 w-3 mr-1" />
          Upgrade Now
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className={`h-7 w-7 p-0 ${textColor}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
