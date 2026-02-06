import { useState } from "react";
import { Navigate } from "react-router-dom";
import { 
  TrendingDown, 
  Users, 
  CheckCircle, 
  Zap,
  CreditCard,
  DollarSign,
  Loader2,
  AlertCircle,
  BarChart3,
  Calendar
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { useConversionFunnel } from "@/hooks/useConversionFunnel";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ConversionFunnel() {
  const { isSuperAdmin } = useAuth();
  const { isAdmin } = useRole();
  const [daysBack, setDaysBack] = useState(30);
  const { data: funnel, isLoading, error } = useConversionFunnel(daysBack);

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

  if (error || !funnel) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-muted-foreground">
                  Unable to load conversion funnel data. This may require admin access or database permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case "Signup":
        return <Users className="h-5 w-5" />;
      case "Onboarding Started":
      case "Onboarding Completed":
        return <CheckCircle className="h-5 w-5" />;
      case "First Feature Use":
        return <Zap className="h-5 w-5" />;
      case "Subscription Started":
        return <CreditCard className="h-5 w-5" />;
      case "Paid Conversion":
        return <DollarSign className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getStageColor = (stageName: string) => {
    switch (stageName) {
      case "Signup":
        return "bg-blue-500";
      case "Onboarding Started":
      case "Onboarding Completed":
        return "bg-purple-500";
      case "First Feature Use":
        return "bg-green-500";
      case "Subscription Started":
        return "bg-orange-500";
      case "Paid Conversion":
        return "bg-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  // Find the biggest drop-off point
  const biggestDropOff = funnel.stages.reduce((max, stage) => 
    stage.dropOff > max.dropOff ? stage : max
  , funnel.stages[0] || { dropOff: 0, name: "" });

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Conversion Funnel Analysis
            </h1>
            <p className="text-sm text-muted-foreground">
              Track user journey from signup to paid subscription
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="w-fit">
              Admin View
            </Badge>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{funnel.totalSignups}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Last {daysBack} days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(funnel.overallConversionRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Signup to paid conversion
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Biggest Drop-off</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatPercent(biggestDropOff.dropOff)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {biggestDropOff.name}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              User progression through key stages (Last {daysBack} days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {funnel.stages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No data available for the selected period.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {funnel.stages.map((stage, index) => {
                  const previousStage = index > 0 ? funnel.stages[index - 1] : null;
                  const widthPercent = stage.percentage;
                  
                  return (
                    <div key={stage.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`${getStageColor(stage.name)} text-white rounded-lg p-2`}>
                            {getStageIcon(stage.name)}
                          </div>
                          <div>
                            <div className="font-medium">{stage.name}</div>
                            {previousStage && stage.dropOff > 0 && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-destructive" />
                                {formatPercent(stage.dropOff)} drop-off
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">{stage.count.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercent(stage.percentage)} of {previousStage?.name || "signups"}
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={widthPercent} 
                          className="h-3"
                        />
                        {index < funnel.stages.length - 1 && (
                          <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
                            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-muted-foreground/20"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Actionable recommendations based on funnel data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {biggestDropOff.dropOff > 20 && (
                <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <div className="font-medium text-destructive">High Drop-off Detected</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPercent(biggestDropOff.dropOff)} of users drop off at "{biggestDropOff.name}". 
                      Consider optimizing this stage to improve conversion.
                    </div>
                  </div>
                </div>
              )}
              
              {funnel.overallConversionRate < 5 && (
                <div className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-orange-500">Low Overall Conversion</div>
                    <div className="text-sm text-muted-foreground">
                      Only {formatPercent(funnel.overallConversionRate)} of signups convert to paid. 
                      Focus on improving onboarding and feature discovery.
                    </div>
                  </div>
                </div>
              )}
              
              {funnel.stages.find(s => s.name === "Onboarding Completed")?.percentage < 50 && (
                <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-500">Onboarding Optimization Opportunity</div>
                    <div className="text-sm text-muted-foreground">
                      Less than 50% of users complete onboarding. Consider simplifying the onboarding flow 
                      or adding incentives to complete it.
                    </div>
                  </div>
                </div>
              )}
              
              {funnel.stages.find(s => s.name === "First Feature Use")?.percentage < 30 && (
                <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <AlertCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-500">Low Feature Adoption</div>
                    <div className="text-sm text-muted-foreground">
                      Few users are using core features after onboarding. Consider adding guided tours, 
                      tooltips, or in-app prompts to drive feature discovery.
                    </div>
                  </div>
                </div>
              )}
              
              {funnel.overallConversionRate >= 20 && (
                <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-emerald-500">Strong Conversion Rate</div>
                    <div className="text-sm text-muted-foreground">
                      Conversion rate of {formatPercent(funnel.overallConversionRate)} exceeds the 20% target. 
                      Great job! Focus on maintaining this rate as you scale.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
