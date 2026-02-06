import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, ArrowUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { cn } from "@/lib/utils";

const DISMISS_KEY_PREFIX = "usage-limit-banner-dismissed-";

export function UsageLimitBanner() {
  const navigate = useNavigate();
  const { usage, isAtLimit, isNearLimit, plan, isLoading } = useUsageLimits();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show for unlimited plans
  if (plan === "team" || plan === "brokerage") {
    return null;
  }

  // Determine which limit is being hit
  const getLimitStatus = () => {
    const limits = [
      {
        key: "documents",
        current: usage.documents.current,
        limit: usage.documents.limit,
        percent: usage.documents.limit === -1 ? 0 : (usage.documents.current / usage.documents.limit) * 100,
      },
      {
        key: "contacts",
        current: usage.contacts.current,
        limit: usage.contacts.limit,
        percent: usage.contacts.limit === -1 ? 0 : (usage.contacts.current / usage.contacts.limit) * 100,
      },
      {
        key: "ai_chats",
        current: usage.ai_chats.current,
        limit: usage.ai_chats.limit,
        percent: usage.ai_chats.limit === -1 ? 0 : (usage.ai_chats.current / usage.ai_chats.limit) * 100,
      },
    ];

    // Find the limit with highest percentage
    const highestLimit = limits.reduce((prev, current) => 
      current.percent > prev.percent ? current : prev
    );

    return highestLimit;
  };

  const limitStatus = getLimitStatus();

  // Check if banner was dismissed for this specific limit (session only)
  useEffect(() => {
    if (!limitStatus || limitStatus.limit === -1) return;

    const dismissKey = `${DISMISS_KEY_PREFIX}${limitStatus.key}-${limitStatus.current}`;
    const dismissed = sessionStorage.getItem(dismissKey);
    
    if (dismissed) {
      setIsDismissed(true);
    }
  }, [limitStatus]);

  const handleDismiss = () => {
    if (!limitStatus) return;
    
    const dismissKey = `${DISMISS_KEY_PREFIX}${limitStatus.key}-${limitStatus.current}`;
    sessionStorage.setItem(dismissKey, "true");
    setIsDismissed(true);
  };

  const handleUpgrade = () => {
    navigate("/billing");
  };

  // Don't show if loading, dismissed, or not at/near limit
  if (isLoading || isDismissed || (!isAtLimit && !isNearLimit)) {
    return null;
  }

  // Don't show if limit is unlimited
  if (limitStatus.limit === -1) {
    return null;
  }

  const isBlocking = isAtLimit;
  const percent = limitStatus.percent;
  const limitName = limitStatus.key === "ai_chats" ? "AI chats" : limitStatus.key;
  const limitDisplay = limitStatus.limit === -1 ? "Unlimited" : limitStatus.limit;

  return (
    <Alert
      className={cn(
        "border-2",
        isBlocking
          ? "border-destructive bg-destructive/10 dark:bg-destructive/20"
          : "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
      )}
    >
      <AlertTriangle className={cn(
        "h-5 w-5",
        isBlocking ? "text-destructive" : "text-amber-600 dark:text-amber-400"
      )} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AlertTitle className={cn(
            isBlocking ? "text-destructive" : "text-amber-800 dark:text-amber-200"
          )}>
            {isBlocking
              ? `You've reached your ${limitName} limit`
              : `You're approaching your ${limitName} limit`}
          </AlertTitle>
          <AlertDescription className={cn(
            "mt-1",
            isBlocking ? "text-destructive/90" : "text-amber-700 dark:text-amber-300"
          )}>
            {isBlocking ? (
              <>
                You've used all {limitDisplay} {limitName} in your {plan} plan. Upgrade to continue using this feature.
              </>
            ) : (
              <>
                You've used {limitStatus.current} of {limitDisplay} {limitName} ({Math.round(percent)}%). 
                Upgrade to avoid hitting your limit.
              </>
            )}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleUpgrade}
            className={cn(
              isBlocking && "bg-destructive hover:bg-destructive/90"
            )}
          >
            <ArrowUp className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
