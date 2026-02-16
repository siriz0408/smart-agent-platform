/**
 * DIS-017: Search Analytics Dashboard
 *
 * Displays comprehensive search metrics for workspace admins including:
 * - Search success rate (North Star: >95%)
 * - Click-through rate metrics
 * - Popular searches and zero-result queries
 * - Time-based filtering (7d, 30d, 90d)
 * - Search performance trends
 */

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchMetrics, SearchMetricsSummary } from "@/hooks/useSearchMetrics";
import { useSearchClickStats, SearchClickStats } from "@/hooks/useSearchClickStats";
import {
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  FileQuestion,
  Zap,
} from "lucide-react";

type TimeRange = "7d" | "30d" | "90d";

function getDateRange(range: TimeRange): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  return { startDate, endDate };
}

function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  target,
  targetMet,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  target?: string;
  targetMet?: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {targetMet !== undefined ? (
            targetMet ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            )
          ) : trend === "up" ? (
            <TrendingUp className="h-8 w-8 text-green-500" />
          ) : trend === "down" ? (
            <TrendingDown className="h-8 w-8 text-red-500" />
          ) : (
            <Icon className="h-8 w-8 text-blue-500" />
          )}
        </div>
      </div>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-2">{subValue}</p>
      )}
      {target && (
        <p className="text-xs text-muted-foreground mt-1">Target: {target}</p>
      )}
    </Card>
  );
}

function ProgressBar({
  value,
  max,
  color = "blue",
}: {
  value: number;
  max: number;
  color?: "green" | "yellow" | "orange" | "red" | "blue";
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colorClass = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  }[color];

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className={`${colorClass} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function SearchSuccessSection({ metrics }: { metrics: SearchMetricsSummary }) {
  const successRateMet = metrics.success_rate >= 95;
  const latencyMet = metrics.latency_target_met_percent >= 95;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Search Success Rate"
          value={`${metrics.success_rate.toFixed(1)}%`}
          subValue={`${metrics.successful_searches} of ${metrics.total_searches} searches`}
          icon={Target}
          target=">95%"
          targetMet={successRateMet}
        />
        <MetricCard
          title="Total Searches"
          value={metrics.total_searches.toLocaleString()}
          subValue={`${metrics.zero_result_searches} zero-result searches`}
          icon={Search}
        />
        <MetricCard
          title="Avg Latency"
          value={`${metrics.avg_latency_ms.toFixed(0)}ms`}
          subValue={`P95: ${metrics.p95_latency_ms.toFixed(0)}ms, P99: ${metrics.p99_latency_ms.toFixed(0)}ms`}
          icon={Clock}
          target="<500ms"
          targetMet={latencyMet}
        />
        <MetricCard
          title="Avg Results"
          value={metrics.avg_result_count.toFixed(1)}
          subValue="results per search"
          icon={BarChart3}
        />
      </div>

      {/* Latency Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Latency Performance</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Searches under 500ms
          </span>
          <span className="text-sm font-medium">
            {metrics.latency_target_met_percent.toFixed(1)}%
          </span>
        </div>
        <ProgressBar
          value={metrics.searches_below_500ms}
          max={metrics.total_searches}
          color={latencyMet ? "green" : "orange"}
        />
        <p className="text-xs text-muted-foreground mt-2">
          {metrics.searches_below_500ms.toLocaleString()} of{" "}
          {metrics.total_searches.toLocaleString()} searches met the 500ms target
        </p>
      </Card>

      {/* Entity Type Distribution */}
      {Object.keys(metrics.entity_type_distribution).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Searches by Entity Type
          </h3>
          <div className="space-y-4">
            {Object.entries(metrics.entity_type_distribution)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([entityType, stats]) => (
                <div key={entityType} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {entityType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {stats.count.toLocaleString()} searches
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Success: {stats.success_rate.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">
                        Avg: {stats.avg_latency_ms.toFixed(0)}ms
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    value={stats.count}
                    max={metrics.total_searches}
                    color={stats.success_rate >= 95 ? "green" : "orange"}
                  />
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ClickThroughSection({ clickStats }: { clickStats: SearchClickStats }) {
  return (
    <div className="space-y-6">
      {/* Key CTR Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Clicks"
          value={clickStats.total_clicks.toLocaleString()}
          subValue={`${clickStats.unique_queries} unique queries`}
          icon={MousePointerClick}
        />
        <MetricCard
          title="Avg Click Position"
          value={clickStats.avg_click_position.toFixed(1)}
          subValue="Lower is better (users find results quickly)"
          icon={Target}
          trend={clickStats.avg_click_position <= 3 ? "up" : "down"}
        />
        <MetricCard
          title="Top 3 Clicks"
          value={`${clickStats.clicks_in_top_3_percent.toFixed(1)}%`}
          subValue={`${clickStats.clicks_in_top_3} clicks in top 3 positions`}
          icon={Zap}
          trend={clickStats.clicks_in_top_3_percent >= 70 ? "up" : "down"}
        />
        <MetricCard
          title="Click-Through Rate"
          value={
            clickStats.total_clicks > 0 && clickStats.unique_queries > 0
              ? `${((clickStats.total_clicks / clickStats.unique_queries) * 100).toFixed(1)}%`
              : "N/A"
          }
          subValue="Clicks per unique query"
          icon={TrendingUp}
        />
      </div>

      {/* Clicks by Entity Type */}
      {Object.keys(clickStats.clicks_by_result_type).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Clicks by Entity Type</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(clickStats.clicks_by_result_type)
              .sort(([, a], [, b]) => b.clicks - a.clicks)
              .map(([entityType, stats]) => (
                <div
                  key={entityType}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">
                      {entityType}
                    </Badge>
                    <span className="text-sm font-medium">
                      {stats.clicks} clicks
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg position: {stats.avg_position.toFixed(1)}
                  </p>
                  <ProgressBar
                    value={stats.clicks}
                    max={clickStats.total_clicks}
                    color="blue"
                  />
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Top Clicked Queries */}
      {clickStats.top_clicked_queries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Clicked Queries</h3>
          <div className="space-y-3">
            {clickStats.top_clicked_queries.slice(0, 10).map((query, index) => (
              <div
                key={query.query}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <span className="font-medium">"{query.query}"</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{query.clicks} clicks</Badge>
                  <span className="text-sm text-muted-foreground">
                    Avg pos: {query.avg_position.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PopularQueriesSection({ metrics }: { metrics: SearchMetricsSummary }) {
  const zeroResultQueries = metrics.popular_queries.filter(
    (q) => q.success_rate === 0
  );
  const successfulQueries = metrics.popular_queries.filter(
    (q) => q.success_rate > 0
  );

  return (
    <div className="space-y-6">
      {/* Popular Successful Queries */}
      {successfulQueries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Popular Searches
          </h3>
          <div className="space-y-3">
            {successfulQueries.slice(0, 10).map((query, index) => (
              <div
                key={query.query}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <span className="font-medium">"{query.query}"</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{query.count}x</Badge>
                  <Badge
                    variant="outline"
                    className={
                      query.success_rate >= 95
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-orange-50 text-orange-700 border-orange-200"
                    }
                  >
                    {query.success_rate.toFixed(0)}% success
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {query.avg_latency_ms.toFixed(0)}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Zero Result Queries */}
      {zeroResultQueries.length > 0 && (
        <Card className="p-6 border-orange-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-orange-500" />
            Zero-Result Queries
            <Badge variant="outline" className="ml-2">
              {zeroResultQueries.length} queries
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            These searches returned no results. Consider adding content or
            improving search coverage for these terms.
          </p>
          <div className="space-y-2">
            {zeroResultQueries.slice(0, 10).map((query, index) => (
              <div
                key={query.query}
                className="flex items-center justify-between p-3 border border-orange-100 rounded-lg bg-orange-50/30"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">"{query.query}"</span>
                </div>
                <Badge variant="secondary">{query.count}x searched</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Query Length Distribution */}
      {Object.keys(metrics.query_length_distribution).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Query Length Analysis</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Object.entries(metrics.query_length_distribution)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([lengthCategory, stats]) => (
                <div
                  key={lengthCategory}
                  className="p-4 border rounded-lg text-center"
                >
                  <p className="text-sm font-medium capitalize">
                    {lengthCategory.replace("_", " ")}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.success_rate.toFixed(0)}% success
                  </p>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function SearchAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { startDate, endDate } = useMemo(
    () => getDateRange(timeRange),
    [timeRange]
  );

  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useSearchMetrics({
    startDate,
    endDate,
  });

  const {
    data: clickStats,
    isLoading: clickStatsLoading,
    error: clickStatsError,
  } = useSearchClickStats({
    startDate,
    endDate,
  });

  const isLoading = metricsLoading || clickStatsLoading;
  const error = metricsError || clickStatsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading analytics</AlertTitle>
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : "Failed to load search analytics. Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!metrics || !clickStats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No analytics data</AlertTitle>
        <AlertDescription>
          No search analytics data is available yet. Start searching to generate
          metrics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" />
            Search Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor search performance and user behavior
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === "7d"
                ? "7 Days"
                : range === "30d"
                  ? "30 Days"
                  : "90 Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* North Star Alert */}
      {metrics.total_searches > 0 && metrics.success_rate < 95 && (
        <Alert className="border-orange-200 bg-orange-50/50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">
            Search Success Rate Below Target
          </AlertTitle>
          <AlertDescription className="text-orange-700">
            Current success rate is {metrics.success_rate.toFixed(1)}% (target:
            {">"}95%). Review zero-result queries to improve coverage.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clicks">Click Analysis</TabsTrigger>
          <TabsTrigger value="queries">Popular Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SearchSuccessSection metrics={metrics} />
        </TabsContent>

        <TabsContent value="clicks">
          <ClickThroughSection clickStats={clickStats} />
        </TabsContent>

        <TabsContent value="queries">
          <PopularQueriesSection metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
