import { useState } from "react";
import { format } from "date-fns";
import { DollarSign, TrendingUp, ChevronDown, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueForecast } from "@/hooks/usePipeline";

interface RevenueForecastProps {
  dealType: "buyer" | "seller";
}

export function RevenueForecast({ dealType }: RevenueForecastProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: forecast, isLoading } = useRevenueForecast(dealType);

  const {
    activeDeals,
    closedDealsYTD,
    monthlyForecasts,
    unscheduledDeals,
    unscheduledCommission,
    unscheduledWeighted,
    totalPipelineCommission,
    totalWeightedCommission,
    ytdEarnings,
  } = forecast;

  // Find max for bar chart scaling
  const maxMonthlyCommission = Math.max(
    ...monthlyForecasts.map((m) => m.totalCommission),
    1 // Prevent division by zero
  );

  const now = new Date();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50 border rounded-lg"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Revenue Forecast</span>
            {!isLoading && totalWeightedCommission > 0 && (
              <span className="text-sm text-muted-foreground font-normal ml-2">
                {formatCurrency(totalWeightedCommission)} weighted pipeline
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">YTD Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(ytdEarnings)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {closedDealsYTD.length} closed {closedDealsYTD.length === 1 ? "deal" : "deals"} in {new Date().getFullYear()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Commission</CardTitle>
                  <Target className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalPipelineCommission)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeDeals.length} active {activeDeals.length === 1 ? "deal" : "deals"} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weighted Forecast</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 cursor-help">
                        {formatCurrency(totalWeightedCommission)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        Weighted by stage probability: Lead 10%, Contacted 20%, Showing/Listing 30%, Active 40%, Offer 50%, Under Contract 80%, Closed 100%
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adjusted by close probability
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Forecast Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Monthly Commission Forecast</CardTitle>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                      <span className="text-muted-foreground">Total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                      <span className="text-muted-foreground">Weighted</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyForecasts.map((fc) => {
                    const totalPercent = maxMonthlyCommission > 0
                      ? (fc.totalCommission / maxMonthlyCommission) * 100
                      : 0;
                    const weightedPercent = maxMonthlyCommission > 0
                      ? (fc.weightedCommission / maxMonthlyCommission) * 100
                      : 0;
                    const isCurrentMonth = fc.month === format(now, "yyyy-MM");

                    return (
                      <div key={fc.month} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={cn("font-medium", isCurrentMonth && "text-primary")}>
                              {fc.label}
                            </span>
                            {isCurrentMonth && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground text-xs">
                              {fc.dealCount} {fc.dealCount === 1 ? "deal" : "deals"}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-semibold min-w-[72px] text-right cursor-help">
                                  {formatCurrency(fc.weightedCommission)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Total: {formatCurrency(fc.totalCommission)}</p>
                                <p>Weighted: {formatCurrency(fc.weightedCommission)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        {/* Stacked bar chart */}
                        <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                          {fc.totalCommission > 0 && (
                            <>
                              <div
                                className="absolute inset-y-0 left-0 bg-blue-200 dark:bg-blue-900 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(totalPercent, 1)}%` }}
                              />
                              <div
                                className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(weightedPercent, 1)}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unscheduled deals */}
                  {unscheduledDeals.length > 0 && (
                    <>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                            <span className="font-medium text-muted-foreground">No close date set</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground text-xs">
                              {unscheduledDeals.length} {unscheduledDeals.length === 1 ? "deal" : "deals"}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-semibold text-muted-foreground min-w-[72px] text-right cursor-help">
                                  {formatCurrency(unscheduledWeighted)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Total: {formatCurrency(unscheduledCommission)}</p>
                                <p>Weighted: {formatCurrency(unscheduledWeighted)}</p>
                                <p className="text-xs mt-1 text-muted-foreground">
                                  Set expected close dates for better forecasting
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Empty state */}
                {activeDeals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No active deals to forecast</p>
                    <p className="text-xs mt-1">Add deals to your pipeline to see revenue projections</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
