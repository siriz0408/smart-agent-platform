import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { AgentForm } from "@/components/agents/AgentForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;

export default function AdminAgentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const { isAdmin } = useRole();

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Agent ID is required");
      const { error } = await supabase
        .from("ai_agents")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["ai_agents"] });
      navigate("/admin/agents");
    },
    onError: (error) => {
      console.error("Failed to delete agent:", error);
      toast.error("Failed to delete agent");
    },
  });

  const handleSuccess = () => {
    navigate("/admin/agents");
  };

  const handleCancel = () => {
    navigate("/admin/agents");
  };

  // Admins can edit any agent, others need to be the owner
  const canEdit = isAdmin || agent?.created_by === user?.id;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (error || !agent) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")} aria-label="Back to agents">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Edit Agent</h1>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Agent not found</AlertTitle>
            <AlertDescription>
              The agent you're looking for doesn't exist.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/admin/agents")}>Back to Agents</Button>
        </div>
      </AppLayout>
    );
  }

  if (!canEdit) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")} aria-label="Back to agents">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Edit Agent</h1>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unauthorized</AlertTitle>
            <AlertDescription>
              You don't have permission to edit this agent.
            </AlertDescription>
          </Alert>
          <div className="p-4 rounded-lg border bg-muted/50">
            <h3 className="font-medium mb-2">Agent Details (Read-Only)</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Name:</strong> {agent.name}</p>
              <p><strong>Category:</strong> {agent.category || "general"}</p>
              <p><strong>Description:</strong> {agent.description || "No description"}</p>
            </div>
          </div>
          <Button onClick={() => navigate("/admin/agents")}>Back to Agents</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Agent</h1>
            <p className="text-muted-foreground">
              Update {agent.name}'s configuration and system prompt
            </p>
          </div>
        </div>

        {/* Form */}
        <AgentForm agent={agent} onSuccess={handleSuccess} onCancel={handleCancel} />

        {/* Danger Zone - Super Admin Only */}
        {isSuperAdmin && (
          <Card className="border-destructive/50">
            <CardHeader>
              <h3 className="text-sm font-medium text-destructive uppercase tracking-wide">
                Danger Zone
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete this agent</p>
                  <p className="text-sm text-muted-foreground">
                    Once you delete an agent, there is no going back. Please be certain.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{agent.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
