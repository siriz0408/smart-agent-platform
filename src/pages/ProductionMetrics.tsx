import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductionMetricsDashboard } from "@/components/admin/ProductionMetricsDashboard";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";

export default function ProductionMetrics() {
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
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Production Metrics</h1>
            <p className="text-muted-foreground">
              Monitor uptime, API performance, and error rates
            </p>
          </div>
        </div>
        <ProductionMetricsDashboard />
      </div>
    </AppLayout>
  );
}
