import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataHealthDashboard } from "@/components/admin/DataHealthDashboard";
import { Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";

export default function DataHealth() {
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
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Data Health</h1>
            <p className="text-muted-foreground">
              Monitor data layer health - document indexing, CRM records, and search performance
            </p>
          </div>
        </div>
        <DataHealthDashboard />
      </div>
    </AppLayout>
  );
}
