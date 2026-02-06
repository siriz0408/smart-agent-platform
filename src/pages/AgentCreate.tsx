import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { AgentForm } from "@/components/agents/AgentForm";

export default function AgentCreate() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/agents");
  };

  const handleCancel = () => {
    navigate("/agents");
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agents")} aria-label="Back to agents">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Create Agent</h1>
            <p className="text-muted-foreground">
              Build a custom AI agent for your workflow
            </p>
          </div>
        </div>

        {/* Form */}
        <AgentForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </AppLayout>
  );
}
