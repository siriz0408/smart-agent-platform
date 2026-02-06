import { Navigate } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  CreditCard, 
  UserCheck, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Zap,
  FileText
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { useGrowthMetrics } from "@/hooks/useGrowthMetrics";
import { Progress } from "@/components/ui/progress";

export default function GrowthMetrics() {
  const { isSuperAdmin } = useAuth();
  const { isAdmin } = useRole();
  const { data: metrics, isLoading, error } = useGrowthMetrics();

  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !metrics) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Unable to load growth metrics. This may require super admin access or database permissions.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    } else if (value < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Growth Metrics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor revenue, conversion, churn, and user growth
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            Admin View
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {getTrendIcon(metrics.revenueGrowth)}
                <span>ARR: {formatCurrency(metrics.arr)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(metrics.trialToPaidConversionRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.convertedTrials} of {metrics.totalTrials} trials converted
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Churn Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(metrics.churnRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.churnedSubscriptions} churned subscriptions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.paidUsers} paid, {metrics.freeUsers} free
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.activeUsers} active users
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Signups (30d)</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.newSignups}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.newPaidSubscriptions} converted to paid
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.paidUsers}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.totalUsers > 0 
                  ? formatPercent((metrics.paidUsers / metrics.totalUsers) * 100)
                  : "0%"} of total users
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Breakdown of subscriptions by plan tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.planDistribution).map(([plan, count]) => {
                const total = Object.values(metrics.planDistribution).reduce((sum, c) => sum + c, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={plan} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{plan}</span>
                      <span className="text-muted-foreground">
                        {count} ({formatPercent(percentage)})
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AI Queries</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAiQueries.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                All-time usage across all users
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalDocuments.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Documents uploaded across all workspaces
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Growth Targets</CardTitle>
            <CardDescription>PM-Growth North Star Metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">MRR Growth Rate</div>
                  <div className="text-sm text-muted-foreground">Target: &gt;15% MoM</div>
                </div>
                <Badge variant={metrics.revenueGrowth >= 15 ? "default" : "secondary"}>
                  {formatPercent(metrics.revenueGrowth)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Trial to Paid Conversion</div>
                  <div className="text-sm text-muted-foreground">Target: &gt;20%</div>
                </div>
                <Badge variant={metrics.trialToPaidConversionRate >= 20 ? "default" : "secondary"}>
                  {formatPercent(metrics.trialToPaidConversionRate)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Monthly Churn Rate</div>
                  <div className="text-sm text-muted-foreground">Target: &lt;5%</div>
                </div>
                <Badge variant={metrics.churnRate <= 5 ? "default" : "destructive"}>
                  {formatPercent(metrics.churnRate)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
