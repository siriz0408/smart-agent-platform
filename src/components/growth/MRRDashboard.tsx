/**
 * GRW-006: MRR Metrics Dashboard Component
 *
 * Comprehensive MRR dashboard for admin users showing:
 * - Current MRR/ARR
 * - MRR trends over time
 * - MRR breakdown (new, expansion, contraction, churn)
 * - Plan distribution
 * - Recent subscription events
 */

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useMRRSummary,
  useMRRHistory,
  useMRRBreakdown,
  useSubscriptionEvents,
  useTriggerMRRSnapshot,
  formatCurrency,
  formatPercent,
  getEventTypeLabel,
  getEventTypeColor,
} from "@/hooks/useMRRMetrics";
import { useToast } from "@/hooks/use-toast";

export function MRRDashboard() {
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState(30);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useMRRSummary();
  const { data: history, isLoading: historyLoading } = useMRRHistory(undefined, selectedDays);
  const { data: breakdown, isLoading: breakdownLoading } = useMRRBreakdown(undefined, selectedDays);
  const { data: events, isLoading: eventsLoading } = useSubscriptionEvents(undefined, 20);
  const triggerSnapshot = useTriggerMRRSnapshot();

  const handleRefresh = async () => {
    try {
      await triggerSnapshot.mutateAsync();
      await refetchSummary();
      toast({
        title: "MRR snapshot created",
        description: "Dashboard has been refreshed with latest data",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to create MRR snapshot",
        variant: "destructive",
      });
    }
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertTitle>No MRR data available</AlertTitle>
        <AlertDescription>
          MRR metrics will appear once you have active subscriptions.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate totals for plan distribution visualization
  const totalPlans = Object.values(summary.planDistribution).reduce((a, b) => a + b, 0);
  const totalMRR = Object.values(summary.mrrByPlan).reduce((a, b) => a + b, 0);

  // Growth status
  const isGrowthPositive = (summary.mrrGrowthRate30d ?? 0) >= 0;
  const isGrowthOnTarget = (summary.mrrGrowthRate30d ?? 0) >= 15; // Target: >15% MoM

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            MRR Metrics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly Recurring Revenue analysis and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={triggerSnapshot.isPending}
            variant="outline"
            size="sm"
          >
            {triggerSnapshot.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Current MRR */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary.currentMRR)}</div>
            <div className="flex items-center gap-2 mt-2">
              {isGrowthPositive ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={isGrowthPositive ? "text-green-600" : "text-red-600"}>
                {formatPercent(summary.mrrGrowthRate30d)} (30d)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ARR: {formatCurrency(summary.currentARR)}
            </p>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary.arpu)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Average Revenue Per User
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.payingUsers} paying users
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.activeSubscriptions}</div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {summary.payingUsers} paid
              </Badge>
              <Badge variant="outline" className="text-xs">
                {summary.freeUsers} free
              </Badge>
              <Badge variant="outline" className="text-xs">
                {summary.trialUsers} trials
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Growth Target */}
        <Card className={isGrowthOnTarget ? "border-l-4 border-l-green-500" : "border-l-4 border-l-orange-500"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Target</CardTitle>
            {isGrowthOnTarget ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercent(summary.mrrGrowthRate30d)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Target: &gt;15% MoM
            </p>
            <Badge
              variant={isGrowthOnTarget ? "default" : "secondary"}
              className="mt-2"
            >
              {isGrowthOnTarget ? "On Target" : "Below Target"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown" className="gap-1.5">
            <PieChart className="h-4 w-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* MRR Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* MRR Movement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  MRR Movement ({selectedDays}d)
                </CardTitle>
                <CardDescription>
                  Breakdown of MRR changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {breakdownLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : breakdown ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">New MRR</span>
                      <span className="font-bold text-green-600">+{formatCurrency(breakdown.newMRR)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">Expansion MRR</span>
                      <span className="font-bold text-green-600">+{formatCurrency(breakdown.expansionMRR)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">Reactivation MRR</span>
                      <span className="font-bold text-green-600">+{formatCurrency(breakdown.reactivationMRR)}</span>
                    </div>
                    <hr />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-600">Contraction MRR</span>
                      <span className="font-bold text-orange-600">-{formatCurrency(breakdown.contractionMRR)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-600">Churned MRR</span>
                      <span className="font-bold text-red-600">-{formatCurrency(breakdown.churnedMRR)}</span>
                    </div>
                    <hr />
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-bold">Net New MRR</span>
                      <span className={`font-bold ${breakdown.netNewMRR >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {breakdown.netNewMRR >= 0 ? "+" : ""}{formatCurrency(breakdown.netNewMRR)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No movement data available</p>
                )}
              </CardContent>
            </Card>

            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Plan Distribution
                </CardTitle>
                <CardDescription>
                  Subscriptions by plan tier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(summary.planDistribution).map(([plan, count]) => {
                  const percentage = totalPlans > 0 ? (count / totalPlans) * 100 : 0;
                  const planMRR = summary.mrrByPlan[plan] || 0;

                  return (
                    <div key={plan} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{plan}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{count} users</span>
                          {planMRR > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {formatCurrency(planMRR)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* MRR by Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
              <CardDescription>
                MRR contribution from each plan tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(summary.mrrByPlan).map(([plan, mrr]) => {
                  const percentage = totalMRR > 0 ? (mrr / totalMRR) * 100 : 0;

                  return (
                    <Card key={plan} className="bg-accent/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium capitalize text-muted-foreground">
                          {plan}
                        </p>
                        <p className="text-2xl font-bold">{formatCurrency(mrr)}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% of MRR
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Time range:</span>
            {[7, 14, 30, 90].map((days) => (
              <Button
                key={days}
                variant={selectedDays === days ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDays(days)}
              >
                {days}d
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>MRR Trend</CardTitle>
              <CardDescription>
                Historical MRR over the last {selectedDays} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple text-based trend display */}
                  <div className="grid gap-2">
                    {history.slice(0, 10).map((point) => (
                      <div
                        key={point.date}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                      >
                        <span className="text-sm text-muted-foreground">
                          {new Date(point.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatCurrency(point.mrr)}</span>
                          {point.netMRRChange !== 0 && (
                            <Badge
                              variant="outline"
                              className={point.netMRRChange >= 0 ? "text-green-600" : "text-red-600"}
                            >
                              {point.netMRRChange >= 0 ? "+" : ""}
                              {formatCurrency(point.netMRRChange)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {history.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing most recent 10 of {history.length} data points
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No historical data available yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    MRR snapshots are created daily.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Min/Max */}
          {summary.bestDayMRR !== null && summary.worstDayMRR !== null && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Best Day MRR ({selectedDays}d)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.bestDayMRR)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Lowest Day MRR ({selectedDays}d)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.worstDayMRR)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Subscription Activity
              </CardTitle>
              <CardDescription>
                Latest subscription events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : events && events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getEventTypeColor(event.eventType)}>
                          {getEventTypeLabel(event.eventType)}
                        </Badge>
                        <div>
                          {event.previousPlan && event.newPlan && event.previousPlan !== event.newPlan && (
                            <p className="text-sm">
                              <span className="capitalize">{event.previousPlan}</span>
                              {" -> "}
                              <span className="capitalize font-medium">{event.newPlan}</span>
                            </p>
                          )}
                          {event.newPlan && !event.previousPlan && (
                            <p className="text-sm capitalize">{event.newPlan}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {event.mrrImpact !== 0 && (
                        <span
                          className={`font-bold ${
                            event.mrrImpact > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {event.mrrImpact > 0 ? "+" : ""}
                          {formatCurrency(event.mrrImpact)}/mo
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No subscription activity yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Events will appear as subscriptions are created and updated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PM-Growth Targets Card */}
      <Card>
        <CardHeader>
          <CardTitle>PM-Growth North Star Metrics</CardTitle>
          <CardDescription>
            Progress toward growth targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">MRR Growth Rate</div>
                <div className="text-sm text-muted-foreground">Target: &gt;15% MoM</div>
              </div>
              <Badge variant={isGrowthOnTarget ? "default" : "secondary"}>
                {formatPercent(summary.mrrGrowthRate30d)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Trial to Paid Conversion</div>
                <div className="text-sm text-muted-foreground">Target: &gt;20%</div>
              </div>
              <Badge variant="secondary">
                {summary.trialUsers > 0
                  ? `${((summary.payingUsers / (summary.payingUsers + summary.trialUsers)) * 100).toFixed(1)}%`
                  : "N/A"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Paying Users</div>
                <div className="text-sm text-muted-foreground">Total paying subscriptions</div>
              </div>
              <Badge variant="default">
                {summary.payingUsers}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
