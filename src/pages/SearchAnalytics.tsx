import { AppLayout } from "@/components/layout/AppLayout";
import { ZeroResultsAnalysis } from "@/components/search/ZeroResultsAnalysis";
import { Search, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";

export default function SearchAnalytics() {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Search Analytics</h1>
            <p className="text-muted-foreground">
              Analyze zero-result searches to identify patterns and improve search quality
            </p>
          </div>
        </div>
        <ZeroResultsAnalysis />
      </div>
    </AppLayout>
  );
}
