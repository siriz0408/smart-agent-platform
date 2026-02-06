import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  variant?: "default" | "primary";
  className?: string;
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = "default",
  className,
}: QuickActionCardProps) {
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md cursor-pointer group",
        variant === "primary" && "border-primary/50 bg-primary/5",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              variant === "primary"
                ? "bg-primary text-primary-foreground"
                : "bg-muted group-hover:bg-muted/80"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base mb-1">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
