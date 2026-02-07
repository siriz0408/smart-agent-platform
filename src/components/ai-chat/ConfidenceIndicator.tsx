import { FileText, BookOpen, Brain } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ConfidenceMetadata } from "@/lib/confidenceScoring";

interface ConfidenceIndicatorProps {
  metadata: ConfidenceMetadata;
  className?: string;
}

const levelConfig = {
  high: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  medium: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  low: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
  },
} as const;

function getIcon(metadata: ConfidenceMetadata) {
  if (metadata.sourceCount > 0) {
    return <FileText className="h-3 w-3" />;
  }
  if (metadata.ragUsed) {
    return <BookOpen className="h-3 w-3" />;
  }
  return <Brain className="h-3 w-3" />;
}

function getTooltipText(metadata: ConfidenceMetadata): string {
  const parts: string[] = [];

  if (metadata.sourceCount > 0) {
    parts.push(
      `Cited ${metadata.sourceCount} document${metadata.sourceCount > 1 ? "s" : ""}: ${metadata.sourceNames.join(", ")}`,
    );
  } else if (metadata.ragUsed) {
    parts.push("Document search was performed but no specific citations were included.");
  } else if (metadata.hadMentions) {
    parts.push("Response was informed by mentioned entities.");
  } else {
    parts.push("Response is based on the AI's general knowledge without document context.");
  }

  return parts.join(" ");
}

export function ConfidenceIndicator({ metadata, className }: ConfidenceIndicatorProps) {
  const config = levelConfig[metadata.level];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight select-none cursor-default transition-colors",
              config.bg,
              config.border,
              config.color,
              className,
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)}
              aria-hidden
            />
            {getIcon(metadata)}
            <span>{metadata.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {getTooltipText(metadata)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
