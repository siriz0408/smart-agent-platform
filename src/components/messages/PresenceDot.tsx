import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/hooks/useUserPresence";

interface PresenceDotProps {
  status: PresenceStatus;
  className?: string;
  showPulse?: boolean;
}

export function PresenceDot({ status, className, showPulse = true }: PresenceDotProps) {
  const colorClass = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  }[status];

  const shouldPulse = showPulse && status === "online";

  return (
    <span className={cn("relative inline-flex", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          colorClass
        )}
      />
      {shouldPulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            colorClass
          )}
        />
      )}
    </span>
  );
}
