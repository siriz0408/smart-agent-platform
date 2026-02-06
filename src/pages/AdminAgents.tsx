import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  XCircle,
  PenTool,
  BarChart2,
  FileSearch,
  Mail,
  Share2,
  Home,
  Users,
  DollarSign,
  Calendar,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;

const iconMap: Record<string, React.ElementType> = {
  bot: Bot,
  "pen-tool": PenTool,
  penline: PenLine,
  filetext: FileText,
  "file-search": FileSearch,
  "bar-chart-2": BarChart2,
  mail: Mail,
  "share-2": Share2,
  zap: Zap,
  sparkles: Sparkles,
  messagesquare: MessageSquare,
  home: Home,
  users: Users,
  "dollar-sign": DollarSign,
  calendar: Calendar,
};

export default function AdminAgents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const { isAdmin } = useRole();

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const deleteMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from("ai_agents")
        .delete()
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_agents"] });
      setAgentToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete agent:", error);
      toast.error("Failed to delete agent");
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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="shrink-0" aria-label="Back to admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">AI Agents</h1>
              <p className="text-sm text-muted-foreground">
                View and manage all AI agents
              </p>
            </div>
          </div>
          <Button asChild size={isMobile ? "sm" : "default"} className="w-full sm:w-auto">
            <Link to="/agents/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-lg border p-3 md:p-4">
            <div className="text-xl md:text-2xl font-semibold">{agents.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Total Agents</div>
          </div>
          <div className="rounded-lg border p-3 md:p-4">
            <div className="text-xl md:text-2xl font-semibold">
              {agents.filter((a) => a.is_certified).length}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Certified</div>
          </div>
          <div className="rounded-lg border p-3 md:p-4">
            <div className="text-xl md:text-2xl font-semibold">
              {agents.filter((a) => a.is_public).length}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Public</div>
          </div>
          <div className="rounded-lg border p-3 md:p-4">
            <div className="text-xl md:text-2xl font-semibold">
              {agents.reduce((sum, a) => sum + (a.usage_count || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Total Uses</div>
          </div>
        </div>

        {/* Agents List - Mobile Cards / Desktop Table */}
        {isMobile ? (
          // Mobile Card View
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredAgents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="text-lg font-medium">No agents found</div>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Try adjusting your search" : "Create your first agent to get started"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAgents.map((agent) => {
                const iconKey = (agent.icon || "bot").toLowerCase();
                const Icon = iconMap[iconKey] || Bot;

                return (
                  <Card key={agent.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shrink-0">
                          <Icon className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{agent.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {agent.description || "No description"}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" aria-label="Agent actions">
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
                                {isSuperAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setAgentToDelete(agent)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Agent
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Badge variant="secondary" className="text-xs">{agent.category || "general"}</Badge>
                            {agent.is_certified && (
                              <Badge className="gap-1 text-xs">
                                <Sparkles className="h-3 w-3" />
                                Certified
                              </Badge>
                            )}
                            {agent.is_public ? (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <CheckCircle className="h-3 w-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <XCircle className="h-3 w-3" />
                                Private
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {(agent.usage_count || 0).toLocaleString()} uses
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          // Desktop Table View
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
                              <Button variant="ghost" size="icon" aria-label="Agent actions">
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
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setAgentToDelete(agent)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Agent
                                  </DropdownMenuItem>
                                </>
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
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!agentToDelete} onOpenChange={(open) => !open && setAgentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => agentToDelete && deleteMutation.mutate(agentToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
