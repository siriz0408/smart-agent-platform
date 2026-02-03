import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Star, Filter, Bot, Sparkles, FileText, PenLine, MessageSquare, Zap, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { AgentExecutionSheet } from "@/components/agents/AgentExecutionSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;

const iconMap: Record<string, React.ElementType> = {
  penline: PenLine,
  filetext: FileText,
  zap: Zap,
  sparkles: Sparkles,
  messagesquare: MessageSquare,
  bot: Bot,
};

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "certified" | "favorites">("all");
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .order("usage_count", { ascending: false });
      
      if (error) throw error;
      return data as AIAgent[];
    },
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

  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async (agentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const isFavorite = favoriteAgentIds.has(agentId);
      
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

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    if (filter === "certified") return matchesSearch && agent.is_certified;
    if (filter === "favorites") return matchesSearch && favoriteAgentIds.has(agent.id);
    return matchesSearch;
  });

  const isLoading = agentsLoading;

  const handleAgentClick = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setSheetOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">AI Agents</h1>
            <p className="text-muted-foreground">
              Discover and manage AI agents to automate your workflow
            </p>
          </div>
          <Button asChild>
            <Link to="/agents/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All Agents</TabsTrigger>
            <TabsTrigger value="certified">
              <Sparkles className="h-4 w-4 mr-1" />
              Certified
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Star className="h-4 w-4 mr-1" />
              Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <AgentGrid 
              agents={filteredAgents} 
              isLoading={isLoading} 
              favoriteAgentIds={favoriteAgentIds}
              onToggleFavorite={(id) => toggleFavorite.mutate(id)}
              onAgentClick={handleAgentClick}
              currentUserId={user?.id}
            />
          </TabsContent>
          <TabsContent value="certified" className="mt-6">
            <AgentGrid 
              agents={filteredAgents} 
              isLoading={isLoading}
              favoriteAgentIds={favoriteAgentIds}
              onToggleFavorite={(id) => toggleFavorite.mutate(id)}
              onAgentClick={handleAgentClick}
              currentUserId={user?.id}
            />
          </TabsContent>
          <TabsContent value="favorites" className="mt-6">
            <AgentGrid 
              agents={filteredAgents} 
              isLoading={isLoading}
              favoriteAgentIds={favoriteAgentIds}
              onToggleFavorite={(id) => toggleFavorite.mutate(id)}
              onAgentClick={handleAgentClick}
              currentUserId={user?.id}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AgentExecutionSheet 
        agent={selectedAgent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </AppLayout>
  );
}

interface AgentGridProps {
  agents: AIAgent[];
  isLoading: boolean;
  favoriteAgentIds: Set<string>;
  onToggleFavorite: (agentId: string) => void;
  onAgentClick: (agent: AIAgent) => void;
  currentUserId?: string;
}

function AgentGrid({ agents, isLoading, favoriteAgentIds, onToggleFavorite, onAgentClick, currentUserId }: AgentGridProps) {
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-32 mt-3" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No agents found</h3>
        <p className="text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const iconKey = (agent.icon || "bot").toLowerCase();
        const Icon = iconMap[iconKey] || Bot;
        const isFavorite = favoriteAgentIds.has(agent.id);
        const isOwner = currentUserId && agent.created_by === currentUserId;
        
        return (
          <Card key={agent.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onAgentClick(agent)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  {agent.is_certified && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Certified
                    </Badge>
                  )}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agents/${agent.id}/edit`);
                      }}
                      title="Edit agent"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(agent.id);
                    }}
                  >
                    <Star
                      className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                    />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-base mt-3">{agent.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {agent.description || "No description available"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{agent.category || "General"}</span>
                <span>{(agent.usage_count || 0).toLocaleString()} uses</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
