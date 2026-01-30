import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface JourneyStage {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface JourneyProgressProps {
  stages: JourneyStage[];
  currentStage: string | null | undefined;
  orientation?: "horizontal" | "vertical";
  onStageClick?: (stageKey: string) => void;
  className?: string;
}

export function JourneyProgress({
  stages,
  currentStage,
  orientation = "horizontal",
  onStageClick,
  className,
}: JourneyProgressProps) {
  const currentStageIndex = stages.findIndex((s) => s.key === currentStage);

  if (orientation === "horizontal") {
    return (
      <HorizontalProgress
        stages={stages}
        currentStageIndex={currentStageIndex}
        onStageClick={onStageClick}
        className={className}
      />
    );
  }

  return (
    <VerticalProgress
      stages={stages}
      currentStageIndex={currentStageIndex}
      onStageClick={onStageClick}
      className={className}
    />
  );
}

interface ProgressProps {
  stages: JourneyStage[];
  currentStageIndex: number;
  onStageClick?: (stageKey: string) => void;
  className?: string;
}

function HorizontalProgress({ stages, currentStageIndex, onStageClick, className }: ProgressProps) {
  return (
    <div className={cn("overflow-x-auto pb-4", className)}>
      <div className="flex items-start min-w-max">
        {stages.map((stage, index) => {
          const isCompleted = currentStageIndex >= 0 && index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isClickable = !!onStageClick;

          return (
            <div key={stage.key} className="flex items-start">
              <div
                className={cn(
                  "flex flex-col items-center",
                  isClickable && "cursor-pointer"
                )}
                onClick={() => onStageClick?.(stage.key)}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && "bg-primary border-primary text-primary-foreground",
                    !isCompleted && !isCurrent && "border-muted-foreground/50 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : stage.icon ? (
                    stage.icon
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center w-24">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      (isCompleted || isCurrent) && "text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && stage.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mt-5 mx-1 transition-colors",
                    currentStageIndex >= 0 && index < currentStageIndex
                      ? "bg-green-500"
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerticalProgress({ stages, currentStageIndex, onStageClick, className }: ProgressProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {stages.map((stage, index) => {
        const isCompleted = currentStageIndex >= 0 && index < currentStageIndex;
        const isCurrent = index === currentStageIndex;
        const isClickable = !!onStageClick;

        return (
          <div
            key={stage.key}
            className={cn(
              "flex items-start gap-4",
              isClickable && "cursor-pointer"
            )}
            onClick={() => onStageClick?.(stage.key)}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted && "bg-green-500 border-green-500 text-white",
                  isCurrent && "bg-primary border-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "border-muted-foreground/50 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : stage.icon ? (
                  stage.icon
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-8 mt-1 transition-colors",
                    currentStageIndex >= 0 && index < currentStageIndex
                      ? "bg-green-500"
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
            <div
              className={cn(
                "pb-4",
                isCurrent && "text-foreground",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}
            >
              <p className="font-medium">{stage.label}</p>
              {stage.description && (
                <p className="text-sm">{stage.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default JourneyProgress;
