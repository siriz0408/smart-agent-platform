import { useState } from "react";
import { Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DealCard } from "./DealCard";

interface Stage {
  id: string;
  label: string;
  color: string;
}

interface MilestoneIndicator {
  overdueCount: number;
  upcomingCount: number;
  hasUrgent: boolean;
}

interface DealWithRelations {
  id: string;
  deal_type: string;
  stage: string | null;
  estimated_value: number | null;
  expected_close_date: string | null;
  contacts: { first_name: string; last_name: string } | null;
  properties: { address: string } | null;
}

interface StageColumnProps {
  stage: Stage;
  deals: DealWithRelations[];
  allStages: Stage[];
  isLoading: boolean;
  movingDealId?: string | null;
  onMoveToStage: (dealId: string, newStage: string) => void;
  onOpenDetail: (dealId: string) => void;
  onQuickAdd?: (stageId: string) => void;
  milestoneIndicators?: Record<string, MilestoneIndicator>;
  /** Use mobile accordion layout instead of fixed-width column */
  isMobileView?: boolean;
  /** Default open state for mobile accordion */
  defaultOpen?: boolean;
}

export function StageColumn({
  stage,
  deals,
  allStages,
  isLoading,
  movingDealId,
  onMoveToStage,
  onOpenDetail,
  onQuickAdd,
  milestoneIndicators = {},
  isMobileView = false,
  defaultOpen = false,
}: StageColumnProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || deals.length > 0);
  const stageValue = deals.reduce((acc, d) => acc + (d.estimated_value || 0), 0);

  const renderDeals = () => (
    <>
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32 mb-3" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : deals.length > 0 ? (
        deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            stages={allStages}
            onMoveToStage={onMoveToStage}
            onOpenDetail={onOpenDetail}
            isMoving={movingDealId === deal.id}
            milestoneIndicator={milestoneIndicators[deal.id]}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center h-24 border border-dashed rounded-lg text-muted-foreground bg-background/50">
          <Plus className="h-4 w-4 mb-1 opacity-50" />
          <span className="text-sm">No deals yet</span>
        </div>
      )}
    </>
  );

  // Mobile accordion view
  if (isMobileView) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", stage.color)} />
              <span className="font-medium text-sm">{stage.label}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  deals.length
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                ${stageValue.toLocaleString()}
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2 px-1">
          {renderDeals()}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Desktop column view
  return (
    <div className="flex flex-col w-[280px] flex-shrink-0 bg-muted/30 rounded-lg p-3">
      {/* Stage color bar */}
      <div className={cn("h-1 w-full rounded-full mb-3", stage.color)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{stage.label}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              deals.length
            )}
          </Badge>
        </div>
        {onQuickAdd && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQuickAdd(stage.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Stage value */}
      <div className="text-xs text-muted-foreground mb-3">
        ${stageValue.toLocaleString()}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin min-h-[200px]">
        {renderDeals()}
      </div>
    </div>
  );
}
