import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Bot, 
  PenLine, 
  FileText, 
  Zap, 
  Sparkles, 
  MessageSquare,
  Pencil,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
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

export default function AdminAgents() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRole();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["admin_ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AIAgent[];
    },
  });

  const filteredAgents = agents.filter((agent) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(searchLower) ||
      (agent.description?.toLowerCase().includes(searchLower) ?? false) ||
      (agent.category?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Admins can edit any agent, others can only edit their own
  const canEdit = (agent: AIAgent) => isAdmin || agent.created_by === user?.id;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">AI Agents</h1>
              <p className="text-muted-foreground">
                View and manage all AI agents in the system
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/agents/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-semibold">{agents.length}</div>
            <div className="text-sm text-muted-foreground">Total Agents</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-semibold">
              {agents.filter((a) => a.is_certified).length}
            </div>
            <div className="text-sm text-muted-foreground">Certified</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-semibold">
              {agents.filter((a) => a.is_public).length}
            </div>
            <div className="text-sm text-muted-foreground">Public</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-semibold">
              {agents.reduce((sum, a) => sum + (a.usage_count || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Uses</div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Agent</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <div className="text-lg font-medium">No agents found</div>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try adjusting your search" : "Create your first agent to get started"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => {
                  const iconKey = (agent.icon || "bot").toLowerCase();
                  const Icon = iconMap[iconKey] || Bot;

                  return (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                            <Icon className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1 max-w-[250px]">
                              {agent.description || "No description"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{agent.category || "general"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {agent.is_certified && (
                            <Badge className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              Certified
                            </Badge>
                          )}
                          {agent.is_public ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Private
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(agent.usage_count || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit(agent) ? (
                              <DropdownMenuItem onClick={() => navigate(`/admin/agents/${agent.id}/edit`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Agent
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit (not owner)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
