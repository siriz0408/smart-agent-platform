import { useZeroResultsAnalysis, type ZeroResultsPattern } from "@/hooks/useZeroResultsAnalysis";
import { useSearchMetrics } from "@/hooks/useSearchMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  BarChart3,
  Target,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ZeroResultsAnalysis() {
  const { data: zeroResultsPatterns, isLoading: isLoadingZeroResults } = useZeroResultsAnalysis({
    daysBack: 30,
    minOccurrences: 2,
  });

  const { data: searchMetrics, isLoading: isLoadingMetrics } = useSearchMetrics({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  });

  const isLoading = isLoadingZeroResults || isLoadingMetrics;

  // Calculate success rate status
  const successRateStatus = searchMetrics
    ? searchMetrics.success_rate >= 95
      ? "success"
      : searchMetrics.success_rate >= 90
      ? "warning"
      : "error"
    : "unknown";

  // Calculate latency status
  const latencyStatus = searchMetrics
    ? searchMetrics.latency_target_met_percent >= 90
      ? "success"
      : searchMetrics.latency_target_met_percent >= 75
      ? "warning"
      : "error"
    : "unknown";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* North Star Metric: Search Success Rate */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Search Success Rate (North Star Metric)
              </CardTitle>
              <CardDescription>
                Target: &gt;95% of searches find results in top 3
              </CardDescription>
            </div>
            <Badge
              variant={
                successRateStatus === "success"
                  ? "default"
                  : successRateStatus === "warning"
                  ? "secondary"
                  : "destructive"
              }
              className="text-lg px-4 py-2"
            >
              {searchMetrics?.success_rate.toFixed(1) || "0.0"}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Searches</div>
              <div className="text-2xl font-bold">{searchMetrics?.total_searches.toLocaleString() || 0}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Successful</div>
              <div className="text-2xl font-bold text-green-600">
                {searchMetrics?.successful_searches.toLocaleString() || 0}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Zero Results</div>
              <div className="text-2xl font-bold text-red-600">
                {searchMetrics?.zero_result_searches.toLocaleString() || 0}
              </div>
            </div>
          </div>

          {successRateStatus === "error" && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Success Rate Below Target</AlertTitle>
              <AlertDescription>
                Current success rate ({searchMetrics?.success_rate.toFixed(1)}%) is below the 95% target.
                Review zero-result patterns below to identify improvement opportunities.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Search Performance
          </CardTitle>
          <CardDescription>Latency metrics (target: &lt;500ms for 90%+ searches)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Avg Latency</div>
              <div className="text-2xl font-bold">{searchMetrics?.avg_latency_ms.toFixed(0) || 0}ms</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">P95 Latency</div>
              <div className="text-2xl font-bold">{searchMetrics?.p95_latency_ms.toFixed(0) || 0}ms</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">P99 Latency</div>
              <div className="text-2xl font-bold">{searchMetrics?.p99_latency_ms.toFixed(0) || 0}ms</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Target Met</div>
              <div className="text-2xl font-bold">
                <Badge
                  variant={
                    latencyStatus === "success"
                      ? "default"
                      : latencyStatus === "warning"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {searchMetrics?.latency_target_met_percent.toFixed(1) || 0}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zero Results Analysis */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Zero Result Patterns</TabsTrigger>
          <TabsTrigger value="popular">Popular Queries</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Zero Result Patterns
              </CardTitle>
              <CardDescription>
                Common patterns in failed searches to identify improvement opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {zeroResultsPatterns && zeroResultsPatterns.length > 0 ? (
                <div className="space-y-4">
                  {zeroResultsPatterns.map((pattern, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{pattern.pattern_type}</Badge>
                          <span className="font-medium">{pattern.pattern_value}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{pattern.occurrence_count}</div>
                          <div className="text-xs text-muted-foreground">
                            {pattern.percentage.toFixed(1)}% of failures
                          </div>
                        </div>
                      </div>
                      {pattern.sample_queries && pattern.sample_queries.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Examples: {pattern.sample_queries.slice(0, 3).join(", ")}
                        </div>
                      )}
                      {pattern.recommendation && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{pattern.recommendation}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>No Patterns Found</AlertTitle>
                  <AlertDescription>
                    No significant zero-result patterns detected in the last 30 days. This is a good sign!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Popular Search Queries
              </CardTitle>
              <CardDescription>Most frequently searched terms with success rates</CardDescription>
            </CardHeader>
            <CardContent>
              {searchMetrics?.popular_queries && searchMetrics.popular_queries.length > 0 ? (
                <div className="space-y-3">
                  {searchMetrics.popular_queries.map((query, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{query.query}</div>
                        <div className="text-sm text-muted-foreground">
                          {query.count} searches • {query.avg_latency_ms.toFixed(0)}ms avg latency
                        </div>
                      </div>
                      <Badge
                        variant={
                          query.success_rate >= 95
                            ? "default"
                            : query.success_rate >= 80
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {query.success_rate.toFixed(1)}% success
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Data</AlertTitle>
                  <AlertDescription>
                    No popular queries found. Searches need to occur at least twice to appear here.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>By Entity Type</CardTitle>
                <CardDescription>Search distribution across entity types</CardDescription>
              </CardHeader>
              <CardContent>
                {searchMetrics?.entity_type_distribution &&
                Object.keys(searchMetrics.entity_type_distribution).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(searchMetrics.entity_type_distribution).map(([type, stats]) => (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{type}</span>
                          <Badge variant="outline">{stats.count} searches</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{stats.success_rate.toFixed(1)}% success</span>
                          <span>•</span>
                          <span>{stats.avg_latency_ms.toFixed(0)}ms avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No entity type data available</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Query Length Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>By Query Length</CardTitle>
                <CardDescription>Search distribution by query length</CardDescription>
              </CardHeader>
              <CardContent>
                {searchMetrics?.query_length_distribution &&
                Object.keys(searchMetrics.query_length_distribution).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(searchMetrics.query_length_distribution).map(([length, stats]) => (
                      <div key={length} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{length.replace("_", " ")}</span>
                          <Badge variant="outline">{stats.count} searches</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{stats.success_rate.toFixed(1)}% success</span>
                          <span>•</span>
                          <span>{stats.avg_latency_ms.toFixed(0)}ms avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No query length data available</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
