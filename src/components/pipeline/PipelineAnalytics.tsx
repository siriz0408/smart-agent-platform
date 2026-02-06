import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";
import { BarChart3, DollarSign, Clock, AlertCircle, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DealWithTimestamps {
  id: string;
  stage: string | null;
  estimated_value: number | null;
  created_at: string;
  updated_at: string;
  is_stalled?: boolean;
}

interface Stage {
  id: string;
  label: string;
  color: string;
}

interface PipelineAnalyticsProps {
  dealType: "buyer" | "seller";
  stages: Stage[];
}

interface StageStats {
  count: number;
  totalValue: number;
  avgDaysInStage: number;
}

export function PipelineAnalytics({ dealType, stages }: PipelineAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-analytics", dealType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, stage, estimated_value, created_at, updated_at")
        .eq("deal_type", dealType)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Batch check stalled status for all deals
      const dealIds = (data as DealWithTimestamps[]).map((d) => d.id);
      const stalledMap = new Map<string, boolean>();

      if (dealIds.length > 0) {
        const { data: stalledData, error: stalledError } = await supabase.rpc("get_stalled_deals", {
          p_deal_ids: dealIds,
        });

        if (!stalledError && stalledData) {
          stalledData.forEach((item: { deal_id: string; is_stalled: boolean }) => {
            stalledMap.set(item.deal_id, item.is_stalled);
          });
        }
      }

      // Add stalled status to each deal
      return (data as DealWithTimestamps[]).map((deal) => ({
        ...deal,
        is_stalled: stalledMap.get(deal.id) || false,
      }));
    },
  });

  // Calculate analytics
  const totalDeals = deals.length;
  const totalPipelineValue = deals.reduce((acc, deal) => acc + (deal.estimated_value || 0), 0);
  const stalledDeals = deals.filter((d) => d.is_stalled === true).length;
  const closedDeals = deals.filter((d) => d.stage === "closed").length;
  const winRate = totalDeals > 0 ? (closedDeals / totalDeals) * 100 : 0;

  // Calculate stats by stage
  const stageStats: Record<string, StageStats> = {};
  stages.forEach((stage) => {
    const dealsInStage = deals.filter((d) => d.stage === stage.id);
    const totalValue = dealsInStage.reduce((acc, d) => acc + (d.estimated_value || 0), 0);

    // Calculate average time in stage
    // Use updated_at as proxy for when deal entered this stage
    // For more accurate calculation, we'd need stage transition history
    let avgDaysInStage = 0;
    if (dealsInStage.length > 0) {
      const now = new Date();
      const totalDays = dealsInStage.reduce((acc, deal) => {
        const updatedAt = new Date(deal.updated_at);
        const daysInStage = differenceInDays(now, updatedAt);
        return acc + Math.max(0, daysInStage); // Ensure non-negative
      }, 0);
      avgDaysInStage = Math.round(totalDays / dealsInStage.length);
    }

    stageStats[stage.id] = {
      count: dealsInStage.length,
      totalValue,
      avgDaysInStage,
    };
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDays = (days: number) => {
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50 border rounded-lg"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Pipeline Analytics</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDeals}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all stages
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total estimated value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stalled Deals</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stalledDeals}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stalledDeals > 0 ? "Need attention" : "All active"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {closedDeals} closed / {totalDeals} total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deals by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stages.map((stage) => {
                    const stats = stageStats[stage.id];
                    const percentage = totalDeals > 0 ? (stats.count / totalDeals) * 100 : 0;

                    return (
                      <div key={stage.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                            <span className="text-sm font-medium">{stage.label}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {stats.count} {stats.count === 1 ? "deal" : "deals"}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(stats.totalValue)}
                            </span>
                            {stats.avgDaysInStage > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">{formatDays(stats.avgDaysInStage)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {totalDeals > 0 && (
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={cn("h-2 rounded-full transition-all", stage.color)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
