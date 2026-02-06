import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AIChatQualityDashboard } from "@/components/admin/AIChatQualityDashboard";
import { Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";

export default function AIChatQuality() {
  const { isSuperAdmin } = useAuth();
  const { isAdmin } = useRole();

  // Defensive check: Verify user has admin privileges
  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">AI Chat Quality</h1>
            <p className="text-muted-foreground">
              Monitor AI response quality, response times, and user satisfaction
            </p>
          </div>
        </div>
        <AIChatQualityDashboard />
      </div>
    </AppLayout>
  );
}
