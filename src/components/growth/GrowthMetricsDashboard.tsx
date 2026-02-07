/**
 * GRW-004: Growth Metrics Dashboard Component
 *
 * Displays comprehensive growth and churn metrics for workspace admins.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useChurnMetrics, useAtRiskUsers, assessAllUsersChurnRisk } from "@/hooks/useChurnMetrics";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function GrowthMetricsDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isAssessing, setIsAssessing] = useState(false);

  const { data: metrics, isLoading, refetch } = useChurnMetrics(profile?.active_workspace_id);
  const { data: atRiskUsers } = useAtRiskUsers(profile?.active_workspace_id, 'high');

  const handleAssessAll = async () => {
    setIsAssessing(true);
    try {
      const count = await assessAllUsersChurnRisk();
      toast({
        title: "Churn assessment complete",
        description: `Assessed churn risk for ${count} users`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Assessment failed",
        description: error instanceof Error ? error.message : "Failed to assess churn risk",
        variant: "destructive",
      });
    } finally {
      setIsAssessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No metrics available</AlertTitle>
        <AlertDescription>
          Unable to load growth metrics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const churnRateTrend = metrics.churnRate <= 5 ? 'good' : metrics.churnRate <= 10 ? 'warning' : 'critical';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Growth Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Monitor churn rate, user engagement, and retention health
          </p>
        </div>
        <Button
          onClick={handleAssessAll}
          disabled={isAssessing}
          variant="outline"
          size="sm"
        >
          {isAssessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assessing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Assessment
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Churn Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
              <p className="text-3xl font-bold mt-2">{metrics.churnRate.toFixed(1)}%</p>
            </div>
            {churnRateTrend === 'good' ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : churnRateTrend === 'warning' ? (
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.totalChurnedUsers} of {metrics.totalActiveUsers} users
          </p>
        </Card>

        {/* Active Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users (7d)</p>
              <p className="text-3xl font-bold mt-2">{metrics.activeUsersLast7Days}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.activeUsersLast30Days} active in last 30 days
          </p>
        </Card>

        {/* At-Risk Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">At-Risk Users</p>
              <p className="text-3xl font-bold mt-2">{metrics.atRiskCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.criticalCount} critical risk
          </p>
        </Card>

        {/* Avg Activity Days */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Activity Days</p>
              <p className="text-3xl font-bold mt-2">{metrics.avgActivityDays}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Per user in last 30 days
          </p>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Churn Risk Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Low Risk
              </Badge>
              <span className="text-sm text-muted-foreground">
                {metrics.riskDistribution.low} users
              </span>
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(metrics.riskDistribution.low / metrics.totalActiveUsers) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Medium Risk
              </Badge>
              <span className="text-sm text-muted-foreground">
                {metrics.riskDistribution.medium} users
              </span>
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${(metrics.riskDistribution.medium / metrics.totalActiveUsers) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                High Risk
              </Badge>
              <span className="text-sm text-muted-foreground">
                {metrics.riskDistribution.high} users
              </span>
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${(metrics.riskDistribution.high / metrics.totalActiveUsers) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Critical Risk
              </Badge>
              <span className="text-sm text-muted-foreground">
                {metrics.riskDistribution.critical} users
              </span>
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${(metrics.riskDistribution.critical / metrics.totalActiveUsers) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription Health */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Subscription Health</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Trialing</p>
            <p className="text-2xl font-bold">{metrics.trialingUsers}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600">{metrics.paidUsers}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Past Due</p>
            <p className="text-2xl font-bold text-orange-600">{metrics.pastDueUsers}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Canceled</p>
            <p className="text-2xl font-bold text-red-600">{metrics.canceledUsers}</p>
          </div>
        </div>
      </Card>

      {/* At-Risk Users List */}
      {atRiskUsers && atRiskUsers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            High-Risk Users ({atRiskUsers.length})
          </h3>
          <div className="space-y-2">
            {atRiskUsers.slice(0, 10).map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{user.user_name || user.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {user.days_since_last_activity} days ago
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      user.risk_level === 'critical'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }
                  >
                    {user.risk_level}
                  </Badge>
                  <span className="text-sm font-medium">{user.risk_score}/100</span>
                </div>
              </div>
            ))}
          </div>
          {atRiskUsers.length > 10 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing 10 of {atRiskUsers.length} at-risk users
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
