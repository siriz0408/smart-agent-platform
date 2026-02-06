import { useState } from "react";
import { useMessageMetrics, useResponseRate, formatResponseTime, formatResponseRate } from "@/hooks/useMessageMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Clock, Target } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function MessageMetricsDashboard() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const { data: metrics = [], isLoading: isLoadingMetrics } = useMessageMetrics(
    dateRange.from,
    dateRange.to
  );

  const { data: summary, isLoading: isLoadingSummary } = useResponseRate(
    dateRange.from,
    dateRange.to
  );

  const isLoading = isLoadingMetrics || isLoadingSummary;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* North Star Metric */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate (<4hr)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {formatResponseRate(summary.response_rate_percent)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.responded_within_4hr} / {summary.total_responses} responses
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {summary.target_met ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">Target met (≥80%)</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-500">Below target (<80%)</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Total Responses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">{summary.total_responses}</div>
                <p className="text-xs text-muted-foreground">
                  Messages with responses
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="text-2xl font-bold">...</div>
            ) : metrics.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {formatResponseTime(
                    metrics.reduce((sum, m) => sum + (m.avg_response_time_seconds || 0), 0) /
                      metrics.filter((m) => m.avg_response_time_seconds !== null).length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across all days
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Median Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="text-2xl font-bold">...</div>
            ) : metrics.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {formatResponseTime(
                    metrics.reduce((sum, m) => sum + (m.median_response_time_seconds || 0), 0) /
                      metrics.filter((m) => m.median_response_time_seconds !== null).length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Median across all days
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
            Response time metrics broken down by day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMetrics ? (
            <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No metrics available for the selected date range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-right p-2 font-medium">Total</th>
                    <th className="text-right p-2 font-medium">Within 4hr</th>
                    <th className="text-right p-2 font-medium">Over 4hr</th>
                    <th className="text-right p-2 font-medium">Rate</th>
                    <th className="text-right p-2 font-medium">Avg Time</th>
                    <th className="text-right p-2 font-medium">Median Time</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.metric_date} className="border-b">
                      <td className="p-2">{format(new Date(metric.metric_date), "MMM dd, yyyy")}</td>
                      <td className="p-2 text-right">{metric.total_responses}</td>
                      <td className="p-2 text-right text-green-600">
                        {metric.responded_within_4hr_count}
                      </td>
                      <td className="p-2 text-right text-red-600">
                        {metric.responded_over_4hr_count}
                      </td>
                      <td className="p-2 text-right">
                        {formatResponseRate(metric.response_rate_within_4hr_percent)}
                      </td>
                      <td className="p-2 text-right">
                        {formatResponseTime(metric.avg_response_time_seconds)}
                      </td>
                      <td className="p-2 text-right">
                        {formatResponseTime(metric.median_response_time_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
