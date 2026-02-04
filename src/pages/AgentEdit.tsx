import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { AgentForm } from "@/components/agents/AgentForm";
import { TriggerConfig } from "@/components/agents/TriggerConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type AIAgent = Tables<"ai_agents">;

export default function AgentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleSuccess = () => {
    navigate("/agents");
  };

  const handleCancel = () => {
    navigate("/agents");
  };

  // Check ownership
  const isOwner = agent?.created_by === user?.id;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
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
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Edit Agent</h1>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Agent not found</AlertTitle>
            <AlertDescription>
              The agent you're looking for doesn't exist or you don't have access to it.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/agents")}>Back to Agents</Button>
        </div>
      </AppLayout>
    );
  }

  if (!isOwner) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Edit Agent</h1>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unauthorized</AlertTitle>
            <AlertDescription>
              You can only edit agents that you created.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/agents")}>Back to Agents</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
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

        {/* Triggers Configuration */}
        <TriggerConfig agentId={agent.id} agentName={agent.name} />
      </div>
    </AppLayout>
  );
}
