import { useState } from "react";
import {
  useAIChatMetricsSummary,
  formatDuration,
} from "@/hooks/useAIChatMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function AIChatQualityDashboard() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const { data: summary, isLoading } = useAIChatMetricsSummary(
    dateRange.from,
    dateRange.to
  );

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
        {/* Average Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDuration(summary.avg_response_time_ms)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average time per AI response
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Average Sources per Response */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sources Cited</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {summary.avg_sources_per_response.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average sources per response
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Total Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {summary.total_conversations.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_responses.toLocaleString()} total responses
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Quality Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Trend</CardTitle>
            {summary?.quality_trend === "improving" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : summary?.quality_trend === "declining" ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div
                  className={cn(
                    "text-2xl font-bold capitalize",
                    summary.quality_trend === "improving" && "text-green-600",
                    summary.quality_trend === "declining" && "text-red-600",
                    summary.quality_trend === "stable" && "text-muted-foreground"
                  )}
                >
                  {summary.quality_trend}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on source citation trends
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Average Response Length */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Length</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {Math.round(summary.avg_response_length).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average characters per response
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* User Feedback */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Feedback</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    <span className="text-xl font-bold text-green-600">
                      {summary.positive_feedback_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    <span className="text-xl font-bold text-red-600">
                      {summary.negative_feedback_count}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {summary.feedback_rate.toFixed(1)}% feedback rate
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Response Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">...</div>
            ) : summary ? (
              <>
                <div className="text-2xl font-bold">
                  {summary.total_responses.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI responses in selected period
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      {summary && summary.total_responses === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              No AI chat metrics found for the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Metrics are calculated from AI chat responses. Data will appear here once
              users start chatting with the AI assistant.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
