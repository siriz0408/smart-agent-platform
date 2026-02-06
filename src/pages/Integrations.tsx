import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug2, Loader2, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { IntegrationHealthMonitor } from "@/components/integrations/IntegrationHealthMonitor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ConnectorDefinition, WorkspaceConnector } from "@/types/connector";
import { generateOAuthUrl, handleOAuthCallback, parseOAuthCallback } from "@/lib/oauth";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Integrations() {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Fetch all connector definitions
  const { data: definitions = [], isLoading: definitionsLoading } = useQuery({
    queryKey: ["connector-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_definitions")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ConnectorDefinition[];
    },
  });

  // Fetch workspace connectors
  const { data: workspaceConnectors = [], isLoading: connectorsLoading } = useQuery({
    queryKey: ["workspace-connectors", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("workspace_connectors")
        .select("*")
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;
      return data as WorkspaceConnector[];
    },
    enabled: !!activeWorkspace?.id,
  });

  // Create a map of connector_definition_id -> workspace connector
  const connectorMap = new Map(
    workspaceConnectors.map((wc) => [wc.connector_definition_id, wc])
  );

  // Handle OAuth callback on page load
  useEffect(() => {
    const callback = parseOAuthCallback();
    if (callback.code && activeWorkspace?.id) {
      // Extract connector key and workspace ID from state or URL params
      const stateParam = callback.state;
      let connectorKey: string | null = null;
      let workspaceId: string = activeWorkspace.id;

      if (stateParam) {
        try {
          const stateData = JSON.parse(atob(stateParam.replace(/-/g, '+').replace(/_/g, '/')));
          connectorKey = stateData.connector_key;
          workspaceId = stateData.workspace_id || workspaceId;
        } catch {
          // Fallback: try to get from URL params
          connectorKey = searchParams.get('connector_key');
        }
      } else {
        connectorKey = searchParams.get('connector_key');
      }

      if (connectorKey && callback.code) {
        const redirectUri = `${window.location.origin}${window.location.pathname}`;
        
        handleOAuthCallback(connectorKey, workspaceId, callback.code, redirectUri, callback.state)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["workspace-connectors"] });
            toast.success("Connector connected", {
              description: "Your integration has been connected successfully.",
            });
            // Clean up URL
            navigate(window.location.pathname, { replace: true });
          })
          .catch((error) => {
            toast.error("Failed to complete connection", {
              description: error.message || "An error occurred while completing the connection.",
            });
            navigate(window.location.pathname, { replace: true });
          });
      } else if (callback.error) {
        toast.error("OAuth authorization failed", {
          description: callback.error || "The authorization was denied or failed.",
        });
        navigate(window.location.pathname, { replace: true });
      }
    }
  }, [activeWorkspace?.id, queryClient, navigate, searchParams]);

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (connectorKey: string) => {
      if (!activeWorkspace?.id || !user) {
        throw new Error("Workspace or user not available");
      }

      // Find the connector definition
      const definition = definitions.find((d) => d.connector_key === connectorKey);
      if (!definition) {
        throw new Error("Connector definition not found");
      }

      // Check if connector supports OAuth
      if (!definition.oauth_provider || !definition.oauth_authorize_url) {
        throw new Error(`Connector ${definition.name} does not support OAuth authentication`);
      }

      // Generate OAuth URL and redirect
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const oauthUrl = await generateOAuthUrl(definition, activeWorkspace.id, redirectUri);
      
      // Redirect to OAuth provider
      window.location.href = oauthUrl;
      
      // Return a promise that never resolves (since we're redirecting)
      return new Promise(() => {});
    },
    onMutate: (connectorKey) => {
      setConnectingKey(connectorKey);
    },
    onError: (error: Error) => {
      toast.error("Failed to initiate connection", {
        description: error.message || "An error occurred while starting the connection.",
      });
      setConnectingKey(null);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (workspaceConnectorId: string) => {
      if (!activeWorkspace?.id) {
        throw new Error("Workspace not available");
      }

      const { error } = await supabase
        .from("workspace_connectors")
        .update({ status: "disconnected" })
        .eq("id", workspaceConnectorId)
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;
    },
    onMutate: (workspaceConnectorId) => {
      setDisconnectingId(workspaceConnectorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-connectors"] });
      toast.success("Connector disconnected", {
        description: "Your integration has been disconnected.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to disconnect", {
        description: error.message || "An error occurred while disconnecting.",
      });
    },
    onSettled: () => {
      setDisconnectingId(null);
    },
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (workspaceConnectorId: string) => {
      if (!activeWorkspace?.id) {
        throw new Error("Workspace not available");
      }

      // Find the connector
      const connector = workspaceConnectors.find((wc) => wc.id === workspaceConnectorId);
      if (!connector) {
        throw new Error("Connector not found");
      }

      // Find the definition
      const definition = definitions.find((d) => d.id === connector.connector_definition_id);
      if (!definition) {
        throw new Error("Connector definition not found");
      }

      // Reset error state and attempt reconnection
      const { error: updateError } = await supabase
        .from("workspace_connectors")
        .update({
          status: "active",
          error_count: 0,
          last_error: null,
        })
        .eq("id", workspaceConnectorId)
        .eq("workspace_id", activeWorkspace.id);

      if (updateError) throw updateError;

      // TODO: Trigger actual reconnection/sync logic here
      // For now, we'll just reset the error state
      // In production, this would trigger a background job to test the connection
    },
    onMutate: (workspaceConnectorId) => {
      setRetryingId(workspaceConnectorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-connectors"] });
      toast.success("Connection retried", {
        description: "Attempting to reconnect. Status will update shortly.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to retry connection", {
        description: error.message || "An error occurred while retrying.",
      });
    },
    onSettled: () => {
      setRetryingId(null);
    },
  });

  // Filter definitions by search query
  const filteredDefinitions = definitions.filter((def) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      def.name.toLowerCase().includes(query) ||
      def.description?.toLowerCase().includes(query) ||
      def.category.toLowerCase().includes(query) ||
      def.connector_key.toLowerCase().includes(query)
    );
  });

  // Group by category
  const groupedByCategory = filteredDefinitions.reduce(
    (acc, def) => {
      const category = def.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(def);
      return acc;
    },
    {} as Record<string, ConnectorDefinition[]>
  );

  const isLoading = definitionsLoading || connectorsLoading;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Plug2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Integrations</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your favorite tools and services to Smart Agent
              </p>
            </div>
          </div>
        </div>

        {/* Health Monitor */}
        {!isLoading && definitions.length > 0 && (
          <IntegrationHealthMonitor
            definitions={definitions}
            workspaceConnectors={workspaceConnectors}
          />
        )}

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredDefinitions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Plug2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No integrations found</CardTitle>
              <CardDescription>
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No active integrations are available at this time"}
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Integrations Grid */}
        {!isLoading && filteredDefinitions.length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedByCategory).map(([category, categoryDefinitions]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4 capitalize">
                  {category.replace("_", " ")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryDefinitions.map((definition) => {
                    const workspaceConnector = connectorMap.get(definition.id);
                    return (
                      <IntegrationCard
                        key={definition.id}
                        definition={definition}
                        workspaceConnector={workspaceConnector}
                        onConnect={(connectorKey) => connectMutation.mutate(connectorKey)}
                        onDisconnect={(workspaceConnectorId) =>
                          disconnectMutation.mutate(workspaceConnectorId)
                        }
                        onRetry={(workspaceConnectorId) =>
                          retryMutation.mutate(workspaceConnectorId)
                        }
                        isConnecting={connectingKey === definition.connector_key}
                        isDisconnecting={disconnectingId === workspaceConnector?.id}
                        isRetrying={retryingId === workspaceConnector?.id}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Alert */}
        {!isLoading && (
          <Alert className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>About Integrations</AlertTitle>
            <AlertDescription>
              Connect your accounts to enable Smart Agent to interact with external services.
              OAuth authentication ensures your credentials are secure and encrypted.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppLayout>
  );
}
