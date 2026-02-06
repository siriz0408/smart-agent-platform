import { useState } from "react";
import { 
  useProductionMetrics, 
  useProductionMetricsSummary,
  formatDuration,
  formatPercent,
  formatUptime
} from "@/hooks/useProductionMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Clock, Target, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ProductionMetricsDashboard() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const { data: metrics = [], isLoading: isLoadingMetrics } = useProductionMetrics(
    dateRange.from,
    dateRange.to
  );

  const { data: summary, isLoading: isLoadingSummary } = useProductionMetricsSummary(
    dateRange.from,
    dateRange.to
  );

  const isLoading = isLoadingMetrics || isLoadingSummary;

  const uptimeStatus = summary ? formatUptime(summary.avg_uptime_percent) : null;

  return (
    <div className="space-y-6">
      {/* Date Range Selector and Actions */}
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange({
                  from: range?.from,
                  to: range?.to,
                });
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          onClick={handleTriggerAggregation}
          disabled={isTriggering}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isTriggering && "animate-spin")} />
          {isTriggering ? "Triggering..." : "Trigger Aggregation"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* North Star Metric: Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="text-2xl font-bold">...</div>
            ) : uptimeStatus ? (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  uptimeStatus.status === "good" && "text-green-600",
                  uptimeStatus.status === "warning" && "text-yellow-600",
                  uptimeStatus.status === "critical" && "text-red-600"
                )}>
                  {uptimeStatus.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average over {summary?.total_days || 0} days
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {uptimeStatus.status === "good" ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">Target met (≥99.9%)</span>
                    </>
                  ) : uptimeStatus.status === "warning" ? (
                    <>
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-yellow-500">Below target (≥99.0%)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-500">Critical (&lt;99.0%)</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* API Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  summary.avg_api_error_rate_percent < 1 && "text-green-600",
                  summary.avg_api_error_rate_percent >= 1 && summary.avg_api_error_rate_percent < 5 && "text-yellow-600",
                  summary.avg_api_error_rate_percent >= 5 && "text-red-600"
                )}>
                  {formatPercent(summary.avg_api_error_rate_percent)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_api_requests.toLocaleString()} total requests
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Average API Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg API Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDuration(summary.avg_api_response_time_ms)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average response time
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Edge Function Duration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edge Function Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDuration(summary.avg_edge_function_duration_ms)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_edge_function_calls.toLocaleString()} total calls
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Metrics</CardTitle>
          <CardDescription>
            Production metrics broken down by day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMetrics ? (
            <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No metrics available for the selected date range. 
              <br />
              <span className="text-xs mt-2 block">
                Metrics are aggregated daily. Data may take up to 24 hours to appear.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-right p-2 font-medium">Uptime</th>
                    <th className="text-right p-2 font-medium">API Calls</th>
                    <th className="text-right p-2 font-medium">API Error Rate</th>
                    <th className="text-right p-2 font-medium">Avg API Time</th>
                    <th className="text-right p-2 font-medium">Edge Calls</th>
                    <th className="text-right p-2 font-medium">Edge Error Rate</th>
                    <th className="text-right p-2 font-medium">Avg Edge Time</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => {
                    const uptime = formatUptime(metric.uptime_percent);
                    return (
                      <tr key={metric.metric_date} className="border-b">
                        <td className="p-2">{format(new Date(metric.metric_date), "MMM dd, yyyy")}</td>
                        <td className={cn(
                          "p-2 text-right font-medium",
                          uptime.status === "good" && "text-green-600",
                          uptime.status === "warning" && "text-yellow-600",
                          uptime.status === "critical" && "text-red-600"
                        )}>
                          {uptime.value}
                        </td>
                        <td className="p-2 text-right">{metric.api_total_requests.toLocaleString()}</td>
                        <td className={cn(
                          "p-2 text-right",
                          metric.api_error_rate_percent < 1 && "text-green-600",
                          metric.api_error_rate_percent >= 1 && metric.api_error_rate_percent < 5 && "text-yellow-600",
                          metric.api_error_rate_percent >= 5 && "text-red-600"
                        )}>
                          {formatPercent(metric.api_error_rate_percent)}
                        </td>
                        <td className="p-2 text-right">{formatDuration(metric.api_avg_response_time_ms)}</td>
                        <td className="p-2 text-right">{metric.edge_function_total_calls.toLocaleString()}</td>
                        <td className={cn(
                          "p-2 text-right",
                          metric.edge_function_error_rate_percent < 1 && "text-green-600",
                          metric.edge_function_error_rate_percent >= 1 && metric.edge_function_error_rate_percent < 5 && "text-yellow-600",
                          metric.edge_function_error_rate_percent >= 5 && "text-red-600"
                        )}>
                          {formatPercent(metric.edge_function_error_rate_percent)}
                        </td>
                        <td className="p-2 text-right">{formatDuration(metric.edge_function_avg_duration_ms)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
