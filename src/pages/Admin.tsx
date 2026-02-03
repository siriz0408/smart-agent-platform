import { Link, Navigate } from "react-router-dom";
import { Users, Database, Key, Zap, ChevronRight, Plus, Check, ExternalLink, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { RoleTestingCard } from "@/components/admin/RoleTestingCard";

interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: string;
  isConnected: boolean;
  category: string;
}

const dataSources: DataSource[] = [
  { id: "1", name: "MLS Integration", description: "Sync property listings from your MLS", icon: "🏠", isConnected: true, category: "Property" },
  { id: "2", name: "Google Workspace", description: "Connect Gmail, Calendar, and Drive", icon: "📧", isConnected: true, category: "Productivity" },
  { id: "3", name: "Zillow", description: "Import Zillow leads and property data", icon: "🔑", isConnected: false, category: "Property" },
  { id: "4", name: "DocuSign", description: "E-signature integration for contracts", icon: "✍️", isConnected: true, category: "Documents" },
  { id: "5", name: "Slack", description: "Team communication and notifications", icon: "💬", isConnected: false, category: "Communication" },
];

export default function Admin() {
  const { availableRoles, isAdmin } = useRole();

  // Defensive check: Verify user has admin privileges using availableRoles
  // This uses actual DB roles, not the override activeRole
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Determine display role (for badge - show actual role, not override)
  const actualAdminRole = availableRoles.includes('super_admin') ? 'super_admin' : 'admin';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Console</h1>
            <p className="text-muted-foreground">
              Manage your team, data sources, and platform settings
            </p>
          </div>
          <Badge className="bg-purple-600 text-white border-0">
            {actualAdminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          <Link to="/admin/teammates">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Teammates</div>
                  <div className="text-sm text-muted-foreground">Manage team members</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/agents">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Bot className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">AI Agents</div>
                  <div className="text-sm text-muted-foreground">Manage agent prompts</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/data-sources">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Database className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Data Sources</div>
                  <div className="text-sm text-muted-foreground">Connect apps</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Key className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium">API Tokens</div>
                <div className="text-sm text-muted-foreground">Manage API access</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Zap className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Actions</div>
                <div className="text-sm text-muted-foreground">Custom workflows</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Developer Tools Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Developer Tools</h2>
          <RoleTestingCard />
        </div>

        {/* Data Sources Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected Data Sources</h2>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((source) => (
              <Card key={source.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl">
                        {source.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{source.name}</CardTitle>
                        <Badge variant={source.isConnected ? "default" : "secondary"} className="mt-1">
                          {source.isConnected ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Connected
                            </>
                          ) : (
                            "Not connected"
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>{source.description}</CardDescription>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      {source.isConnected ? "Configure" : "Connect"}
                    </Button>
                    {source.isConnected && (
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Team Overview</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="text-3xl font-semibold">5</div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-3xl font-semibold">3</div>
                <div className="text-sm text-muted-foreground">Active Agents</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-3xl font-semibold">1,250</div>
                <div className="text-sm text-muted-foreground">AI Queries This Month</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
