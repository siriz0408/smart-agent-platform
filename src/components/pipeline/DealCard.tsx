import { MoreHorizontal, DollarSign, Calendar, User, Check, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
  is_stalled?: boolean;
  created_at: string;
  updated_at: string;
}

interface DealCardProps {
  deal: DealWithRelations;
  stages: Stage[];
  onMoveToStage: (dealId: string, newStage: string) => void;
  onOpenDetail: (dealId: string) => void;
  onEdit?: (deal: DealWithRelations) => void;
  isMoving?: boolean;
  milestoneIndicator?: MilestoneIndicator;
  isRecentlyMoved?: boolean;
}

export function DealCard({ 
  deal, 
  stages, 
  onMoveToStage, 
  onOpenDetail,
  onEdit,
  isMoving, 
  milestoneIndicator,
  isRecentlyMoved = false,
}: DealCardProps) {
  const contactName = deal.contacts
    ? `${deal.contacts.first_name} ${deal.contacts.last_name}`
    : "Unknown Contact";

  const currentStage = stages.find((s) => s.id === deal.stage);
  const hasOverdue = milestoneIndicator && milestoneIndicator.overdueCount > 0;
  const hasUpcoming = milestoneIndicator && milestoneIndicator.upcomingCount > 0;
  const isStalled = deal.is_stalled === true;

  // Calculate days in current stage (if stage exists and we have updated_at)
  const daysInStage = deal.stage && deal.updated_at
    ? Math.floor((new Date().getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Last activity time
  const lastActivity = deal.updated_at
    ? formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })
    : null;

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200",
        isMoving && "opacity-70",
        hasOverdue && "border-destructive/50",
        isStalled && !hasOverdue && "border-orange-500/50",
        isRecentlyMoved && "animate-pulse border-primary shadow-lg ring-2 ring-primary/20"
      )}
      onClick={() => onOpenDetail(deal.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{contactName}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" aria-label="Deal actions">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetail(deal.id); }}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(deal); }}>
                Edit deal
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to stage</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {stages.map((stage) => {
                    const isCurrentStage = deal.stage === stage.id;
                    return (
                      <DropdownMenuItem
                        key={stage.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCurrentStage) onMoveToStage(deal.id, stage.id);
                        }}
                        disabled={isCurrentStage}
                        className="flex items-center gap-2"
                      >
                        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", stage.color)} />
                        <span className="flex-1">{stage.label}</span>
                        {isCurrentStage && <Check className="h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {deal.properties?.address && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-1 pl-6">
            {deal.properties.address}
          </p>
        )}

        <div className="flex items-center justify-between text-sm pl-6">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-medium">
              {((deal.estimated_value || 0) / 1000).toFixed(0)}K
            </span>
          </div>
          {deal.expected_close_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(deal.expected_close_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Days in stage and last activity */}
        {(daysInStage !== null || lastActivity) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 pl-6">
            {daysInStage !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {daysInStage === 0 ? "Today" : `${daysInStage}d`} in stage
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {daysInStage === 0 
                    ? "Moved to this stage today"
                    : `In ${currentStage?.label || deal.stage} for ${daysInStage} day${daysInStage > 1 ? 's' : ''}`
                  }
                </TooltipContent>
              </Tooltip>
            )}
            {lastActivity && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs">
                    Updated {lastActivity}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Last activity: {new Date(deal.updated_at).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Milestone indicators and stalled status */}
        {(hasOverdue || hasUpcoming || isStalled) && (
          <div className="flex items-center gap-2 mt-3 pl-6 flex-wrap">
            {hasOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {milestoneIndicator.overdueCount} overdue
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {milestoneIndicator.overdueCount} milestone{milestoneIndicator.overdueCount > 1 ? 's' : ''} past due
                </TooltipContent>
              </Tooltip>
            )}
            {hasUpcoming && !hasOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                    <Clock className="h-3 w-3" />
                    {milestoneIndicator.upcomingCount} due soon
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {milestoneIndicator.upcomingCount} milestone{milestoneIndicator.upcomingCount > 1 ? 's' : ''} due within 3 days
                </TooltipContent>
              </Tooltip>
            )}
            {isStalled && !hasOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1 border-orange-500 text-orange-700 dark:text-orange-400">
                    <AlertCircle className="h-3 w-3" />
                    Stalled
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  No activity for more than 48 hours. Consider following up.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Stage indicator bar */}
        {currentStage && (
          <div className={cn("h-0.5 w-full rounded-full mt-3", currentStage.color)} />
        )}
      </CardContent>
    </Card>
  );
}
