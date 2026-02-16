import { Mail, Calendar, Video, FileText, Building2, Zap, AlertCircle, CheckCircle2, Clock, RefreshCw, XCircle, AlertTriangle, Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ConnectorDefinition, ConnectorStatus } from "@/types/connector";
import { AIConnectorToggle } from "./AIConnectorToggle";

interface WorkspaceConnector {
  id: string;
  connector_definition_id: string;
  status: ConnectorStatus;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  ai_enabled?: boolean;
}

type HealthStatus = "healthy" | "degraded" | "error" | "disconnected";

interface IntegrationCardProps {
  definition: ConnectorDefinition;
  workspaceConnector?: WorkspaceConnector;
  onConnect: (connectorKey: string) => void;
  onDisconnect: (workspaceConnectorId: string) => void;
  onRetry?: (workspaceConnectorId: string) => void;
  onToggleAI?: (workspaceConnectorId: string, enabled: boolean) => void;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  isRetrying?: boolean;
  isUpdatingAI?: boolean;
}

// Icon mapping for connectors
const connectorIcons: Record<string, typeof Mail> = {
  gmail: Mail,
  google_calendar: Calendar,
  zoom: Video,
  outlook: Mail,
  microsoft_calendar: Calendar,
  crm: Building2,
  document_management: FileText,
};

// Category colors for badges
const categoryColors: Record<string, string> = {
  communication: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  calendar: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  crm: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  property_data: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  marketing: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  document_management: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function IntegrationCard({
  definition,
  workspaceConnector,
  onConnect,
  onDisconnect,
  onRetry,
  onToggleAI,
  isConnecting = false,
  isDisconnecting = false,
  isRetrying = false,
  isUpdatingAI = false,
}: IntegrationCardProps) {
  const isConnected = workspaceConnector?.status === "active";
  const hasError = workspaceConnector?.status === "error" || (workspaceConnector?.error_count ?? 0) > 0;
  const Icon = connectorIcons[definition.connector_key] || Zap;
  const categoryColor = categoryColors[definition.category] || categoryColors.document_management;

  // Calculate health status
  const getHealthStatus = (): HealthStatus => {
    if (!workspaceConnector || workspaceConnector.status !== "active") {
      return "disconnected";
    }
    
    if (workspaceConnector.status === "error" || workspaceConnector.error_count > 5) {
      return "error";
    }
    
    if (workspaceConnector.error_count > 0 || workspaceConnector.status === "expired") {
      return "degraded";
    }
    
    // Check if last sync is too old (more than 24 hours)
    if (workspaceConnector.last_sync_at) {
      const syncDate = new Date(workspaceConnector.last_sync_at);
      const now = new Date();
      const diffHours = (now.getTime() - syncDate.getTime()) / 3600000;
      if (diffHours > 24) {
        return "degraded";
      }
    }
    
    return "healthy";
  };

  const healthStatus = getHealthStatus();

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return "Never synced";
    
    const syncDate = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    
    return syncDate.toLocaleDateString();
  };

  const getHealthStatusConfig = () => {
    switch (healthStatus) {
      case "healthy":
        return {
          color: "bg-green-500",
          borderColor: "border-green-500",
          icon: CheckCircle2,
          label: "Healthy",
          description: "Integration is working normally",
        };
      case "degraded":
        return {
          color: "bg-yellow-500",
          borderColor: "border-yellow-500",
          icon: AlertTriangle,
          label: "Degraded",
          description: "Integration has minor issues",
        };
      case "error":
        return {
          color: "bg-red-500",
          borderColor: "border-red-500",
          icon: XCircle,
          label: "Error",
          description: "Integration has critical issues",
        };
      default:
        return {
          color: "bg-gray-400",
          borderColor: "border-gray-400",
          icon: XCircle,
          label: "Disconnected",
          description: "Integration is not connected",
        };
    }
  };

  const healthConfig = getHealthStatusConfig();
  const HealthIcon = healthConfig.icon;

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isConnected && "border-primary/50",
      hasError && "border-destructive/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                {definition.name}
                {definition.is_beta && (
                  <Badge variant="secondary" className="text-xs">
                    Beta
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                {definition.description || `Connect your ${definition.name} account`}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={isConnected ? "default" : "outline"}
            className={cn(
              "text-xs",
              isConnected && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700"
            )}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              "Not Connected"
            )}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", categoryColor)}>
            {definition.category.replace("_", " ")}
          </Badge>
        </div>

        {/* Last Sync Time */}
        {isConnected && workspaceConnector && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last sync: {formatLastSync(workspaceConnector.last_sync_at)}</span>
          </div>
        )}

        {/* Error Status */}
        {hasError && workspaceConnector?.last_error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{workspaceConnector.last_error}</span>
          </div>
        )}

        {/* Supported Actions */}
        {definition.supported_actions && definition.supported_actions.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Actions: </span>
            <span>{definition.supported_actions.slice(0, 3).join(", ")}</span>
            {definition.supported_actions.length > 3 && (
              <span> +{definition.supported_actions.length - 3} more</span>
            )}
          </div>
        )}

        {/* AI Chat Access Toggle (MCP-style) */}
        {isConnected && workspaceConnector && onToggleAI && (
          <AIConnectorToggle
            connectorName={definition.name}
            connectorKey={definition.connector_key}
            isEnabled={workspaceConnector.ai_enabled ?? false}
            isConnected={isConnected}
            supportedActions={definition.supported_actions || []}
            onToggle={(enabled) => onToggleAI(workspaceConnector.id, enabled)}
            isUpdating={isUpdatingAI}
          />
        )}

        {/* AI Enabled Badge */}
        {isConnected && workspaceConnector?.ai_enabled && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Bot className="h-3 w-3" />
            <span>AI can access this data</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        {isConnected ? (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onDisconnect(workspaceConnector!.id)}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onConnect(definition.connector_key)}
            disabled={isConnecting || !definition.is_active}
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
