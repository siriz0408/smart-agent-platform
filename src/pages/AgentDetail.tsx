import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play, Pencil, Star, Sparkles, Bot, Calendar, Zap, FileText, Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentExecutionSheet } from "@/components/agents/AgentExecutionSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;
type AIAgentWithSources = AIAgent & { data_sources?: string[] | null };

const iconMap: Record<string, React.ElementType> = {
  bot: Bot,
  "pen-tool": Pencil,
  penline: Pencil,
  filetext: FileText,
  "file-search": FileText,
  "bar-chart-2": Sparkles,
  mail: FileText,
  "share-2": FileText,
  zap: Zap,
  sparkles: Sparkles,
  messagesquare: FileText,
  home: Bot,
  users: Users,
  "dollar-sign": Sparkles,
  calendar: Calendar,
};

const getAgentDataSources = (agent: AIAgent | null): string[] => {
  if (!agent || !("data_sources" in agent)) {
    return [];
  }
  const rawSources = (agent as AIAgentWithSources).data_sources;
  if (!Array.isArray(rawSources)) {
    return [];
  }
  return rawSources.filter((source): source is string => typeof source === "string");
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: agent, isLoading, error } = useQuery({
    queryKey: ["ai_agent", id],
    queryFn: async () => {
      if (!id) throw new Error("Agent ID is required");
      
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as AIAgent;
    },
    enabled: !!id,
  });

  // Fetch user's favorite agents
  const { data: userAgents = [] } = useQuery({
    queryKey: ["user_agents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_agents")
        .select("agent_id, is_favorite")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const favoriteAgentIds = new Set(
    userAgents.filter((ua) => ua.is_favorite).map((ua) => ua.agent_id)
  );
  const isFavorite = agent ? favoriteAgentIds.has(agent.id) : false;

  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async (agentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("user_agents")
          .delete()
          .eq("user_id", user.id)
          .eq("agent_id", agentId);
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("user_agents")
          .upsert({
            user_id: user.id,
            agent_id: agentId,
            is_favorite: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_agents"] });
    },
  });

  const handleCopyPrompt = async () => {
    if (agent?.system_prompt) {
      await navigator.clipboard.writeText(agent.system_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOwner = agent?.created_by === user?.id;
  const canEdit = isOwner || isAdmin;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 md:p-6 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (error || !agent) {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 md:p-6 max-w-5xl">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Agent Not Found</h2>
              <p className="text-muted-foreground">
                The agent you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </div>
            <Button onClick={() => navigate("/agents")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const iconKey = (agent.icon || "bot").toLowerCase();
  const Icon = iconMap[iconKey] || Bot;
  const dataSources = getAgentDataSources(agent);

  return (
    <>
      <AppLayout>
        <div className="container mx-auto p-4 md:p-6 max-w-5xl">
          {/* Breadcrumb Navigation */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/agents">Agents</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{agent.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>

          {/* Agent Header Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">{agent.name}</CardTitle>
                      {agent.is_certified && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Certified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {agent.description || "No description available"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleFavorite.mutate(agent.id)}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star
                      className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                    />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/agents/${agent.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button
                    onClick={() => setSheetOpen(true)}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Run Agent
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Agent Stats Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Agent Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xl font-semibold">{(agent.usage_count || 0).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Uses</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xl font-semibold">{agent.category || "General"}</div>
                    <div className="text-sm text-muted-foreground">Category</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xl font-semibold">{agent.is_public ? "Public" : "Private"}</div>
                    <div className="text-sm text-muted-foreground">Visibility</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sources Card */}
          {dataSources.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {dataSources.map((source, index) => (
                    <Badge key={index} variant="outline">
                      {source}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Prompt Card */}
          {agent.system_prompt && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    System Prompt
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
                    {agent.system_prompt}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(agent.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Updated {new Date(agent.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>

      {/* Execution Sheet */}
      <AgentExecutionSheet 
        agent={agent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
