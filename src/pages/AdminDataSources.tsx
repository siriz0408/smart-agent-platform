import { useState } from "react";
import { Database, Plus, Settings, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Placeholder data - will be replaced with actual integrations later
const dataSources = [
  {
    id: "zillow",
    name: "Zillow",
    description: "Access property listings and market data",
    status: "disconnected",
    category: "Real Estate"
  },
  {
    id: "mls",
    name: "MLS Integration",
    description: "Connect to your local MLS for listing data",
    status: "disconnected",
    category: "Real Estate"
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync appointments and showings",
    status: "disconnected",
    category: "Productivity"
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Email integration for communication tracking",
    status: "disconnected",
    category: "Productivity"
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment processing and billing",
    status: "connected",
    category: "Finance"
  },
];

export default function AdminDataSources() {
  const [sources] = useState(dataSources);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.category]) {
      acc[source.category] = [];
    }
    acc[source.category].push(source);
    return acc;
  }, {} as Record<string, typeof dataSources>);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
            <p className="text-muted-foreground">
              Manage your integrations and connected services
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sources.length}</div>
              <p className="text-xs text-muted-foreground">Available integrations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sources.filter(s => s.status === "connected").length}
              </div>
              <p className="text-xs text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sources.filter(s => s.status === "disconnected").length}
              </div>
              <p className="text-xs text-muted-foreground">Ready to connect</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Sources by Category */}
        {Object.entries(groupedSources).map(([category, categorySources]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                {categorySources.length} integration{categorySources.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorySources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {source.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(source.status)}
                      <Button
                        variant={source.status === "connected" ? "outline" : "default"}
                        size="sm"
                      >
                        {source.status === "connected" ? (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
