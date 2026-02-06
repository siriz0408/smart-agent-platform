import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ConnectorDefinition, WorkspaceConnector } from "@/types/connector";

interface IntegrationHealthMonitorProps {
  definitions: ConnectorDefinition[];
  workspaceConnectors: WorkspaceConnector[];
}

type HealthStatus = "healthy" | "degraded" | "error" | "disconnected";

interface HealthStats {
  total: number;
  healthy: number;
  degraded: number;
  error: number;
  disconnected: number;
  healthScore: number;
}

export function IntegrationHealthMonitor({
  definitions,
  workspaceConnectors,
}: IntegrationHealthMonitorProps) {
  const healthStats = useMemo<HealthStats>(() => {
    const connectorMap = new Map(
      workspaceConnectors.map((wc) => [wc.connector_definition_id, wc])
    );

    let healthy = 0;
    let degraded = 0;
    let error = 0;
    let disconnected = 0;

    definitions.forEach((def) => {
      const connector = connectorMap.get(def.id);
      
      if (!connector || connector.status !== "active") {
        disconnected++;
        return;
      }

      if (connector.status === "error" || connector.error_count > 5) {
        error++;
        return;
      }

      if (connector.error_count > 0 || connector.status === "expired") {
        degraded++;
        return;
      }

      // Check if last sync is too old
      if (connector.last_sync_at) {
        const syncDate = new Date(connector.last_sync_at);
        const now = new Date();
        const diffHours = (now.getTime() - syncDate.getTime()) / 3600000;
        if (diffHours > 24) {
          degraded++;
          return;
        }
      }

      healthy++;
    });

    const total = definitions.length;
    const connected = healthy + degraded + error;
    const healthScore = total > 0 
      ? Math.round(((healthy * 100 + degraded * 50) / connected) || 0)
      : 0;

    return {
      total,
      healthy,
      degraded,
      error,
      disconnected,
      healthScore: connected > 0 ? healthScore : 0,
    };
  }, [definitions, workspaceConnectors]);

  if (healthStats.total === 0) {
    return null;
  }

  const connectedCount = healthStats.healthy + healthStats.degraded + healthStats.error;
  const overallHealth = healthStats.healthScore >= 90 
    ? "healthy" 
    : healthStats.healthScore >= 70 
    ? "degraded" 
    : "error";

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Integration Health</CardTitle>
              <CardDescription>
                Monitor the status of all your connected integrations
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-semibold",
              overallHealth === "healthy" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300",
              overallHealth === "degraded" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300",
              overallHealth === "error" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300"
            )}
          >
            {healthStats.healthScore}% Health Score
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Health Score Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Health</span>
              <span className="font-medium">{healthStats.healthScore}%</span>
            </div>
            <Progress 
              value={healthStats.healthScore} 
              className={cn(
                "h-2",
                overallHealth === "healthy" && "[&>div]:bg-green-500",
                overallHealth === "degraded" && "[&>div]:bg-yellow-500",
                overallHealth === "error" && "[&>div]:bg-red-500"
              )}
            />
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {healthStats.healthy}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Healthy</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {healthStats.degraded}
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">Degraded</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {healthStats.error}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">Error</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800">
              <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {healthStats.disconnected}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Disconnected</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {connectedCount} of {healthStats.total} integrations connected
              {healthStats.error > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium ml-2">
                  • {healthStats.error} need attention
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
